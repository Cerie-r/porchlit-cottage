import {
  displayUsername, enteredPasswordProblem, nicknameOf, normalizePassword, passwordProblem, usernameKey, usernameProblem,
  usernameShapeProblem
} from './accounts.mjs';
import {SAVE_LIMIT, checkSave, keepDeviceCopy, loadHistory, loadHistoryCopy, loadRevision, loadSave, storeSave} from './home-saves.mjs';
import {ARGON2_HASHING, Busy, createGate} from './passwords.mjs';
import {accountLimits, capacity, perKey} from './limits.mjs';
import {looksLikeSessionToken, newRecoveryCodes, newSessionToken, normalizeRecoveryCode, recoveryCodeHash, sha256} from './tokens.mjs';
import {loadStreet, placeHome, porchProblem, streetCount} from './streets.mjs';
import {isOurs, oursAccounts} from './ours.mjs';
import {DoorProblem, mailRetry, requestProblem, ITEM_LIMIT, block, cleanItem, cleanNote, dayProblem, decide, doneToday, findDoor, itemProblem, loadDoor, noteProblem, seeKnocks, unblock, visit} from './doors.mjs';
import {aiInviteOf, inviteNeeded, labelProblem, listInvites, normalizeInvite, spend, takeAiInvite, tearAiInvite, tearInvite, usable, writeInvite} from './invites.mjs';
import {closeReport, listReports, oneReport, openReports, reportBottle, reportHome, reportProblem, reportVisit, undoReport} from './reports.mjs';
import {fishBottle, isFindKey, thrownFrom, throwBottle, wordsProblem} from './bottles.mjs';
import {addQuestion, cleanQuestion, decideEntry, doorProblem, doorState, drawQuestions, editQuestion, entryFate, holdAnswers, listDecided, listQuestions, listWaiting, questionProblem, readAnswers, removeQuestion, setDoor, shut} from './entry.mjs';
import {RESIDENTS_MAX, cancelOpenedMoveIn, normalizeMoveInCode, openMoveIn, openedBy, peekMoveIn, residentAccount, residentsOf, sendAway} from './residents.mjs';
import {storeCloset, waitingActs, waitingCount} from './acts.mjs';

// The API for people (docs/ACCOUNTS.md): accounts, the home's save, the
// community map (streets, and the light at each home's door), and doors
// (knocking, the mailbox, and what is left there). JSON
// in and out. A session is only ever read from the Authorization header: no
// cookies, so any page may call it (CORS is open), and never from the query
// string.

const SESSION_DAYS = 30;
const BODY_LIMIT = 8 * 1024;
// What the wardrobe has, sent by the owner's page (PUT /api/home/closet).
const CLOSET_LIMIT = 64 * 1024;

// The four limits from docs/ACCOUNTS.md (plus one for password changes); sign-ups, sign-ins and recoveries are
// server/limits.mjs's ACCOUNT_LIMITS, shared with the AIs' door. Tests pass smaller ones.
const LIMITS = {
  passwordChecks: {limit: 10, window: 15 * 60_000}, // per signed-in account
  keeps: {limit: 30, window: 60 * 60_000}, // copies put aside on purpose, per account
  doorVisits: {limit: 60, window: 60 * 60_000}, // knocks and things left, per account
  reports: {limit: 20, window: 60 * 60_000}, // per account
  invites: {limit: 60, window: 60 * 60_000}, // written by the home the place is run by
  moveInTries: {limit: 10, window: 15 * 60_000}, // move-in codes typed, per account
  bottles: {limit: 30, window: 60 * 60_000}, // drift bottles thrown or opened, per account
  inFlight: 64, // requests handled at once
  saves: 4 // saves being received at once (each may be up to 6 MB)
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Retry-After'
};
const PREFLIGHT = {
  ...CORS,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '600'
};

// `extra` goes into the body next to `error`, for things the caller needs to
// decide what to do next (a stale save says which revision is newer).
class Refusal extends Error {
  constructor(status, code, message, headers = {}, extra = {}) {
    super(message);
    Object.assign(this, {status, code, headers, extra});
  }
}
const refuse = (status, code, message, headers, extra) => {
  throw new Refusal(status, code, message, headers, extra);
};
const later = (seconds, message) => refuse(429, 'slow_down', message, {'Retry-After': String(seconds)});

function send(res, status, body, headers = {}) {
  res.writeHead(status, {...CORS, 'Cache-Control': 'no-store', ...(body === undefined ? {} : {'Content-Type': 'application/json; charset=utf-8'}), ...headers});
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

async function readJson(req, limit = BODY_LIMIT) {
  const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') refuse(415, 'wrong_type', '内容要用 JSON 发。');
  if (Number(req.headers['content-length']) > limit) refuse(413, 'too_large', '内容太长了。', {Connection: 'close'});
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) refuse(413, 'too_large', '内容太长了。', {Connection: 'close'});
    chunks.push(chunk);
  }
  let value;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    refuse(400, 'bad_json', '内容读不懂。');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) refuse(400, 'bad_json', '内容要是一个对象。');
  return value;
}

const view = a => ({id: String(a.id), kind: a.kind, username: a.username, nickname: a.nickname, createdAt: a.created_at});

// `epoch` names this life of the database. After restoring it from a backup,
// give SAVE_EPOCH a new value: devices then treat every home as one they
// haven't met, and ask before writing over anything.
// ours: who this home's own things are for (server/ours.mjs; OURS_ACCOUNTS when not given). They are the home the
// place is run by, too: they write the invitations a new door plate takes, and read the reports.
// hashing: the password hashing, which tests may stand in for where Node has no Argon2. accounts: the sign-up, sign-in
// and recovery limits (server/limits.mjs), the same ones the AIs' door is given.
export function createApi({pool, gate = createGate(), limits = {}, epoch = process.env.SAVE_EPOCH || '1', ours, hashing = ARGON2_HASHING, accounts = accountLimits(limits)}) {
  const settings = {...LIMITS, ...limits};
  const keepers = () => ours ?? oursAccounts();
  const reporting = perKey(settings.reports);
  const inviting = perKey(settings.invites);
  const {signups, signins, recoveries} = accounts;
  const passwordChecks = perKey(settings.passwordChecks);
  const keeps = perKey(settings.keeps);
  const doorVisits = perKey(settings.doorVisits);
  const moveInTries = perKey(settings.moveInTries);
  const bottling = perKey(settings.bottles);
  const withEpoch = body => ({...body, epoch: String(epoch)});
  // A copy put aside on purpose counts against the account's hourly limit.
  const mayKeep = account => {
    if (keeps.wait(account)) return false;
    keeps.hit(account);
    return true;
  };
  const inFlight = capacity(settings.inFlight);
  const saveSlots = capacity(settings.saves);

  async function inTransaction(work) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async function openSession(db, accountId) {
    const token = newSessionToken();
    const {rows: [row]} = await db.query(
      `insert into sessions (account_id, token_hash, expires_at)
       values ($1, $2, now() + make_interval(days => $3)) returning expires_at`,
      [accountId, sha256(token), SESSION_DAYS]);
    return {token, expiresAt: row.expires_at};
  }

  // Anything that relies on the password being what was just checked (the
  // session after a sign-in, a password change, a recovery) locks the account
  // row first, inside its transaction, and compares password_version with the
  // one it checked against. They then happen strictly one after another, so a
  // sign-in checked against the old password can't add a session after a
  // change has signed everyone out, and a change checked against the old
  // password can't undo a recovery. Re-hashing the same password with newer
  // settings doesn't move the version, so it doesn't turn other sign-ins away.
  async function lockAccount(db, accountId) {
    const {rows: [row]} = await db.query('select password_version, disabled_at from accounts where id = $1 for update', [accountId]);
    return row;
  }

  // One try against a per-account limit. A try that hashing turned away
  // because it was busy doesn't count.
  async function countedTry(limiter, key, work) {
    limiter.hit(key);
    try {
      return await work();
    } catch (err) {
      if (err instanceof Busy) limiter.undo(key);
      throw err;
    }
  }

  // Sets a new password and signs everyone out; the caller gets one fresh
  // session back. Call with the account row locked.
  async function replacePassword(db, accountId, hash) {
    await db.query('update accounts set password_hash = $2, password_version = password_version + 1, password_changed_at = now() where id = $1', [accountId, hash]);
    await db.query('update sessions set revoked_at = now() where account_id = $1 and revoked_at is null', [accountId]);
    return openSession(db, accountId);
  }

  // The person behind the request, from "Authorization: Bearer pcs_…". Each
  // use pushes the session's expiry 30 days out.
  async function signedIn(req) {
    const m = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
    if (!m || !looksLikeSessionToken(m[1])) refuse(401, 'signed_out', '要先登录。');
    const {rows: [row]} = await pool.query(
      `update sessions s
          set last_seen_at = now(), expires_at = greatest(s.expires_at, now() + make_interval(days => $2))
         from accounts a
        where s.token_hash = $1 and s.revoked_at is null and s.expires_at > now()
          and a.id = s.account_id and a.disabled_at is null
       returning s.id as session_id, a.id, a.kind, a.username, a.nickname, a.created_at`,
      [sha256(m[1]), SESSION_DAYS]);
    if (!row) refuse(401, 'signed_out', '登录过期了，再登录一次吧。');
    return row;
  }

  function needHashing() {
    if (!hashing.available) refuse(503, 'unavailable', '这台服务器的 Node 太旧，算不了密码（要 24.7 以上）。');
  }

  async function register(req) {
    needHashing();
    const body = await readJson(req);
    const problem = usernameProblem(body.username) ?? passwordProblem(body.password);
    if (problem) refuse(400, 'invalid', problem);
    const username = displayUsername(body.username);
    const {nickname, problem: nicknameProblem} = nicknameOf(body.nickname, username);
    if (nicknameProblem) refuse(400, 'invalid', nicknameProblem);
    // This place is for adults: everyone hanging a door plate says so (and when, is kept).
    if (body.adult !== true) refuse(400, 'adult_needed', '要先勾上「我已满 18 岁」。这里只给成年人。');
    const key = usernameKey(body.username), running = keepers();
    // The names the place is run by are hung before they are named: named, they can't be taken here.
    if (running.has(key)) refuse(409, 'username_taken', '这个名字已经有人用了。');
    // An invitation from the home the place is run by, once there is one (server/invites.mjs), or else the answers to
    // its questions, when it has opened that way in (server/entry.mjs).
    const needed = inviteNeeded(running), typed = typeof body.invite === 'string' && body.invite.trim() !== '';
    const invite = needed && typed ? normalizeInvite(body.invite) : null, byQuestions = needed && !typed && Array.isArray(body.answers);
    if (needed && !invite && !byQuestions) refuse(403, 'invite_needed', typed ? '这张请帖上的字不对。' : '挂门牌要一张请帖，向邀请你的人要。');
    // The burst limit comes before the name, invitation and answer checks, so
    // asking "is this name free?" or trying invitations or answers over and
    // over is held back too.
    const wait = signups.take();
    if (wait) later(wait, '这会儿来登记的人有点多，稍等一下再试。');
    if ((await pool.query('select 1 from accounts where username_key = $1', [key])).rowCount) refuse(409, 'username_taken', '这个名字已经有人用了。');
    if (invite && !(await usable(pool, invite, running))) refuse(403, 'invite_wrong', '这张请帖不对，或者已经用过了。');
    let read = null;
    if (byQuestions) {
      const state = await doorState(pool), closed = shut(state);
      if (closed) refuse(403, closed.code, closed.message);
      read = await readAnswers(pool, body.answers, state.ask);
      if (!read) refuse(400, 'quiz_unfinished', '题还没答完，或者题目刚刚换过了，再拿一次题。');
      if (read.wrong) refuse(403, 'quiz_wrong', `选择题有 ${read.wrong} 道答得不对，再想想。`);
    }
    // With short answers, the door plate waits for the running home to read them (server/entry.mjs): the account is
    // made switched off, and no session comes back yet.
    const waits = !!read?.written.length;
    const hash = await hashing.hash(normalizePassword(body.password), gate);
    const codes = newRecoveryCodes();
    try {
      return await inTransaction(async db => {
        // Coming in by the questions, one at a time: the limits are counted again with the door held.
        const closed = byQuestions && shut(await doorState(db, {lock: true}));
        if (closed) refuse(403, closed.code, closed.message);
        const {rows: [account]} = await db.query(
          `insert into accounts (kind, username, username_key, nickname, password_hash, came_by, adult_at, disabled_at)
           values ('human', $1, $2, $3, $4, $5, now(), case when $6 then now() end) returning id, kind, username, nickname, created_at`,
          [username, key, nickname, hash, invite ? 'invite' : byQuestions ? 'quiz' : null, waits]);
        if (invite && !(await spend(db, invite, account.id, running))) refuse(403, 'invite_wrong', '这张请帖刚刚被用掉了。');
        const {rows: [home]} = await db.query('insert into homes (owner_id) values ($1) returning id', [account.id]);
        // A lot on the map, from the day the door plate goes up.
        await placeHome(db, home.id);
        await db.query('insert into recovery_codes (account_id, code_hash) select $1, unnest($2::bytea[])', [account.id, codes.map(recoveryCodeHash)]);
        if (waits) {
          await holdAnswers(db, account, key, read.written);
          return {status: 202, body: {pending: true, account: view(account), recoveryCodes: codes}};
        }
        const session = await openSession(db, account.id);
        return {status: 201, body: {account: view(account), home: {id: String(home.id)}, session, recoveryCodes: codes}};
      });
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'accounts_username_unique') refuse(409, 'username_taken', '这个名字已经有人用了。');
      throw err;
    }
  }

  async function signIn(req) {
    needHashing();
    const body = await readJson(req);
    if (typeof body.username !== 'string' || !body.username) refuse(400, 'invalid', '要填用户名。');
    const problem = enteredPasswordProblem(body.password);
    if (problem) refuse(400, 'invalid', problem);
    const wrong = () => refuse(401, 'wrong_password', '用户名或密码不对。');
    // A name that couldn't exist goes no further: it never reaches the
    // database or the limits.
    if (usernameShapeProblem(body.username)) wrong();
    const {rows: [account]} = await pool.query(
      'select id, kind, username, nickname, created_at, password_hash, password_version, disabled_at from accounts where username_key = $1',
      [usernameKey(body.username)]);
    if (!account) {
      if (await entryFate(pool, usernameKey(body.username)) === 'out') refuse(401, 'not_let_in', '管这条街的人看过你的回答，这块门牌没有挂上。');
      wrong();
    }
    // Counted per account, not per name typed, so made-up names can't crowd
    // a real account's count out of the limiter.
    const key = String(account.id);
    const wait = signins.wait(key);
    if (wait) later(wait, '试错太多次了，过一会儿再来。');
    const password = normalizePassword(body.password);
    if (!(await countedTry(signins, key, () => hashing.verify(account.password_hash, password, gate)))) wrong();
    if (account.disabled_at && await entryFate(pool, usernameKey(account.username)) === 'waiting') refuse(403, 'waiting', '你的回答还在等管这条街的人看，看过了就能点灯。');
    if (account.disabled_at) refuse(403, 'disabled', '这个账号停用了。');
    if (account.kind !== 'human') refuse(403, 'wrong_door', 'AI 的账号不从这里登录。');
    signins.clear(key);
    const rehash = hashing.stale(account.password_hash) ? await hashing.hash(password, gate).catch(() => null) : null;
    const session = await inTransaction(async db => {
      const now = await lockAccount(db, account.id);
      if (!now || now.password_version !== account.password_version) refuse(401, 'wrong_password', '密码刚刚改过了，用新的密码再登录一次。');
      if (now.disabled_at) refuse(403, 'disabled', '这个账号停用了。');
      if (rehash) await db.query('update accounts set password_hash = $2 where id = $1', [account.id, rehash]);
      return openSession(db, account.id);
    });
    return {status: 201, body: {account: view(account), session}};
  }

  async function signOut(req) {
    const me = await signedIn(req);
    await pool.query('update sessions set revoked_at = now() where id = $1', [me.session_id]);
    return {status: 204};
  }

  async function aboutMe(req) {
    const me = await signedIn(req);
    const {rows: [row]} = await pool.query(
      `select h.id as home_id, h.street_id, h.lot, h.porch,
              (select count(*)::int from recovery_codes where account_id = $1 and used_at is null) as codes_left
         from (select 1) one left join homes h on h.owner_id = $1`,
      [me.id]);
    let home = null;
    if (row.home_id) {
      // A home from before the map, or one the first street had no room for, gets its lot now.
      const place = row.street_id === null ? await inTransaction(db => placeHome(db, row.home_id)) : {street: String(row.street_id), lot: row.lot};
      home = {id: String(row.home_id), street: place.street, lot: place.lot, porch: row.porch};
    }
    // ours: whether this account is the one this home's own things are for (the page then fetches them). That home
    // runs the place, so it hears how many reports are waiting for it (keeper).
    const own = isOurs(me.username, keepers());
    // The AIs living in the home (server/residents.mjs), by name, for the porch light card to show.
    const residents = home ? (await residentsOf(pool, home.id)).map(r => r.account) : [];
    return {status: 200, body: {account: view(me), home, recoveryCodesLeft: row.codes_left, residents, ours: own, ...(own ? {keeper: {reports: await openReports(pool), waiting: (await doorState(pool)).waiting}} : {})}};
  }

  // What hanging a door plate takes: whether an invitation is needed, and whether answering questions will do instead.
  async function plateRules() {
    const invite = keepers().size > 0;
    return {status: 200, body: {invite, quiz: invite && !shut(await doorState(pool))}};
  }

  // A newcomer's questions (server/entry.mjs), when there is room to come in that way: drawn afresh each time.
  async function getQuestions() {
    if (!keepers().size) refuse(409, 'quiz_closed', '这里挂门牌不用请帖，也不用答题。');
    const state = await doorState(pool), closed = shut(state);
    if (closed) refuse(403, closed.code, closed.message);
    return {status: 200, body: {rules: state.rules, questions: await drawQuestions(pool, state.ask)}};
  }

  // The keeper's side of that door: the settings and how many came in that way, the questions with their answers, who
  // is waiting (with what the AI helping run the place thinks of them, server/street.mjs), and who was decided lately.
  const doorView = state => ({open: state.open, rules: state.rules, ask: state.ask, perDay: state.perDay, total: state.total, joined: state.joined, waiting: state.waiting});
  async function getEntry(req) {
    await keeperIn(req);
    return {status: 200, body: {door: doorView(await doorState(pool)), questions: await listQuestions(pool), waiting: await listWaiting(pool), decided: await listDecided(pool)}};
  }
  // Letting in one whose short answers waited, or not.
  async function decideOne(req, id, letIn) {
    const me = await keeperIn(req);
    const decided = await inTransaction(db => decideEntry(db, {id, keeperId: me.id, letIn}));
    if (!decided) refuse(404, 'not_found', '没有这一位。');
    return {status: 200, body: {entry: decided}};
  }
  async function putEntry(req) {
    await keeperIn(req);
    const body = await readJson(req);
    const problem = doorProblem(body);
    if (problem) refuse(400, 'invalid', problem);
    await setDoor(pool, body);
    return {status: 200, body: {door: doorView(await doorState(pool))}};
  }
  async function postQuestion(req) {
    const me = await keeperIn(req);
    const body = await readJson(req);
    const problem = questionProblem(body);
    if (problem) refuse(400, 'invalid', problem);
    const question = await inTransaction(db => addQuestion(db, cleanQuestion(body), me.id));
    if (question.tooMany) refuse(409, 'too_many', question.tooMany);
    return {status: 201, body: {question}};
  }
  async function putQuestion(req, id) {
    await keeperIn(req);
    const body = await readJson(req);
    const problem = questionProblem(body);
    if (problem) refuse(400, 'invalid', problem);
    const question = await editQuestion(pool, id, cleanQuestion(body));
    if (!question) refuse(404, 'not_found', '没有这道题。');
    return {status: 200, body: {question}};
  }
  async function deleteQuestion(req, id) {
    await keeperIn(req);
    if (!await removeQuestion(pool, id)) refuse(404, 'not_found', '没有这道题。');
    return {status: 204};
  }

  // The home the place is run by, signed in: only it writes invitations and reads reports.
  async function keeperIn(req) {
    const me = await signedIn(req);
    if (!isOurs(me.username, keepers())) refuse(403, 'not_keeper', '这里只有管这条街的人能看。');
    return me;
  }

  // Invitations (server/invites.mjs): the keeper's own list, writing one (with who it is for), tearing one up.
  async function getInvites(req) {
    const me = await keeperIn(req);
    return {status: 200, body: {invites: await listInvites(pool, me.id)}};
  }
  async function postInvite(req) {
    const me = await keeperIn(req);
    const body = await readJson(req);
    const problem = labelProblem(body.label);
    if (problem) refuse(400, 'invalid', problem);
    const wait = inviting.wait(String(me.id));
    if (wait) later(wait, '这一小时里写的请帖够多了，过一会儿再写。');
    const invite = await inTransaction(db => writeInvite(db, me.id, typeof body.label === 'string' ? body.label.trim() : ''));
    if (!invite) refuse(409, 'too_many', '还没用的请帖太多了，先撕掉几张。');
    inviting.hit(String(me.id));
    return {status: 201, body: {invite}};
  }
  async function deleteInvite(req, id) {
    const me = await keeperIn(req);
    if (!await tearInvite(pool, me.id, id)) refuse(404, 'not_found', '没有这张请帖，或者它已经用掉了。');
    return {status: 204};
  }

  // Reporting (server/reports.mjs) something left at one's own door or a line in one's guestbook ({visit}), or a home
  // met on the street ({door: {street, lot}}), with a reason and a few words. It blocks that account from one's door too.
  // Or a drift bottle that washed up here ({bottle}): no more of its writer's wash up here, and who it was stays unsaid.
  async function report(req) {
    const me = await signedIn(req);
    const body = await readJson(req);
    const problem = reportProblem(body);
    if (problem) refuse(400, 'invalid', problem);
    const wait = reporting.wait(String(me.id));
    if (wait) later(wait, '这一小时里举报得够多了，过一会儿再来。');
    const {rows: [own]} = await pool.query('select id from homes where owner_id = $1', [me.id]);
    let reported;
    if (typeof body.visit === 'string' && /^[1-9][0-9]{0,17}$/.test(body.visit)) {
      if (!own) refuse(404, 'no_home', '还没有小屋。');
      reported = await inTransaction(db => reportVisit(db, {homeId: own.id, reporterId: me.id, visitId: body.visit, reason: body.reason, words: body.words}));
    } else if (body.door && typeof body.door === 'object' && /^[1-9][0-9]{0,17}$/.test(String(body.door.street)) && Number.isInteger(body.door.lot) && body.door.lot >= 0 && body.door.lot <= 63) {
      const door = await findDoor(pool, String(body.door.street), body.door.lot, me.id);
      if (!door) refuse(404, 'not_found', '这里是一块空地。');
      if (String(door.owner_id) === String(me.id)) refuse(409, 'own_door', '这是你自己家。');
      reported = await inTransaction(db => reportHome(db, {homeId: own?.id ?? null, reporterId: me.id, door, reason: body.reason, words: body.words}));
    } else if (typeof body.bottle === 'string' && /^[1-9][0-9]{0,17}$/.test(body.bottle)) {
      if (!own) refuse(404, 'no_home', '还没有小屋。');
      reported = await inTransaction(db => reportBottle(db, {homeId: own.id, reporterId: me.id, bottleId: body.bottle, reason: body.reason, words: body.words}));
    } else refuse(400, 'invalid', '要举报的是哪一样？');
    reporting.hit(String(me.id));
    return {status: 201, body: {reported: {id: reported.id}, ...(reported.blocked ? {blocked: reported.blocked} : {})}};
  }

  // The keeper's side: the reports, and closing one (fine, or the account switched off), or switching it back on.
  async function getReports(req) {
    await keeperIn(req);
    return {status: 200, body: await listReports(pool)};
  }
  async function getReport(req, id) {
    await keeperIn(req);
    const report = await oneReport(pool, id);
    if (!report) refuse(404, 'not_found', '没有这一条。');
    return {status: 200, body: {report}};
  }
  async function closeOne(req, id, how) {
    const me = await keeperIn(req);
    const result = await inTransaction(db => how === 'undo' ? undoReport(db, {id, keeperId: me.id}) : closeReport(db, {id, keeperId: me.id, outcome: how === 'disable' ? 'disabled' : 'fine', keepers: keepers()}));
    if (!result) refuse(404, 'not_found', '没有这一条。');
    return {status: 200, body: {report: result}};
  }

  async function changePassword(req) {
    needHashing();
    const me = await signedIn(req);
    const body = await readJson(req);
    const problem = enteredPasswordProblem(body.currentPassword) ?? passwordProblem(body.newPassword);
    if (problem) refuse(400, 'invalid', problem);
    const key = String(me.id);
    const wait = passwordChecks.wait(key);
    if (wait) later(wait, '试错太多次了，过一会儿再来。');
    const {rows: [account]} = await pool.query('select password_hash, password_version from accounts where id = $1', [me.id]);
    const current = normalizePassword(body.currentPassword);
    if (!(await countedTry(passwordChecks, key, () => hashing.verify(account.password_hash, current, gate)))) refuse(403, 'wrong_password', '原来的密码不对。');
    passwordChecks.clear(key);
    const hash = await hashing.hash(normalizePassword(body.newPassword), gate);
    const session = await inTransaction(async db => {
      const now = await lockAccount(db, me.id);
      if (!now || now.password_version !== account.password_version) refuse(409, 'changed_meanwhile', '密码刚刚在别处改过了，用新的密码再试一次。');
      if (now.disabled_at) refuse(403, 'disabled', '这个账号停用了。');
      return replacePassword(db, me.id, hash);
    });
    return {status: 200, body: {session}};
  }

  // A fresh set of spare keys (recovery codes) for the signed-in person, who gives their password again: whatever is
  // left of the old set stops working, and the new ten are shown this once.
  async function renewCodes(req) {
    needHashing();
    const me = await signedIn(req);
    const body = await readJson(req);
    const problem = enteredPasswordProblem(body.currentPassword);
    if (problem) refuse(400, 'invalid', problem);
    const key = String(me.id);
    const wait = passwordChecks.wait(key);
    if (wait) later(wait, '试错太多次了，过一会儿再来。');
    const {rows: [account]} = await pool.query('select password_hash, password_version from accounts where id = $1', [me.id]);
    if (!(await countedTry(passwordChecks, key, () => hashing.verify(account.password_hash, normalizePassword(body.currentPassword), gate)))) refuse(403, 'wrong_password', '密码不对。');
    passwordChecks.clear(key);
    const codes = newRecoveryCodes();
    await inTransaction(async db => {
      const now = await lockAccount(db, me.id);
      if (!now || now.password_version !== account.password_version) refuse(409, 'changed_meanwhile', '密码刚刚在别处改过了，用新的密码再试一次。');
      if (now.disabled_at) refuse(403, 'disabled', '这个账号停用了。');
      await db.query('delete from recovery_codes where account_id = $1 and used_at is null', [me.id]);
      await db.query('insert into recovery_codes (account_id, code_hash) select $1, unnest($2::bytea[])', [me.id, codes.map(recoveryCodeHash)]);
    });
    return {status: 201, body: {recoveryCodes: codes, recoveryCodesLeft: codes.length}};
  }

  // Username + one unused recovery code + a new password. The code is spent,
  // every session ends, and a fresh one comes back.
  async function recover(req) {
    needHashing();
    const body = await readJson(req);
    if (typeof body.username !== 'string' || !body.username) refuse(400, 'invalid', '要填用户名。');
    const problem = passwordProblem(body.newPassword);
    if (problem) refuse(400, 'invalid', problem);
    const wrong = () => refuse(401, 'wrong_code', '用户名或恢复码不对。');
    if (usernameShapeProblem(body.username)) wrong();
    const {rows: [account]} = await pool.query(
      'select id, kind, username, nickname, created_at, disabled_at from accounts where username_key = $1', [usernameKey(body.username)]);
    if (!account) wrong();
    const key = String(account.id);
    const wait = recoveries.wait(key);
    if (wait) later(wait, '试错太多次了，过一会儿再来。');
    recoveries.hit(key);
    const code = normalizeRecoveryCode(body.code);
    const found = code && (await pool.query(
      'select id from recovery_codes where account_id = $1 and code_hash = $2 and used_at is null', [account.id, recoveryCodeHash(code)])).rows[0];
    if (!found) wrong();
    if (account.disabled_at) refuse(403, 'disabled', '这个账号停用了。');
    if (account.kind !== 'human') refuse(403, 'wrong_door', 'AI 的账号不从这里找回。');
    let hash;
    try {
      hash = await hashing.hash(normalizePassword(body.newPassword), gate);
    } catch (err) {
      if (err instanceof Busy) recoveries.undo(key);
      throw err;
    }
    const session = await inTransaction(async db => {
      const now = await lockAccount(db, account.id);
      if (!now || now.disabled_at) refuse(403, 'disabled', '这个账号停用了。');
      const spent = await db.query('update recovery_codes set used_at = now() where id = $1 and used_at is null', [found.id]);
      if (!spent.rowCount) refuse(401, 'wrong_code', '这个恢复码刚刚用过了。');
      return replacePassword(db, account.id, hash);
    });
    recoveries.clear(key);
    const {rows: [left]} = await pool.query('select count(*)::int as n from recovery_codes where account_id = $1 and used_at is null', [account.id]);
    return {status: 200, body: {account: view(account), session, recoveryCodesLeft: left.n}};
  }

  // The home the signed-in person owns. For now only owners read and write
  // their save; people and AIs who move in come later.
  async function ownHome(me) {
    const {rows: [row]} = await pool.query('select id from homes where owner_id = $1', [me.id]);
    if (!row) refuse(404, 'no_home', '还没有小屋。');
    return row.id;
  }

  async function getSave(req) {
    const me = await signedIn(req);
    return {status: 200, body: withEpoch(await loadSave(pool, await ownHome(me)))};
  }

  // With how many acts of AIs living here wait to be let in (server/acts.mjs), so an open page knows to fetch them.
  async function getRevision(req) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    return {status: 200, body: withEpoch({...await loadRevision(pool, homeId), acts: await waitingCount(pool, homeId)})};
  }

  // {revision, doc}: revision is the one this copy was based on (0 for the
  // first save). If the save has moved on since, nothing is written and the
  // answer says which revision is newer, so the device can ask what to keep.
  async function putSave(req) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    if (!saveSlots.enter()) refuse(503, 'busy', '这会儿有点忙，过几秒再试。', {'Retry-After': '2'});
    try {
      return await writeSave(req, me, homeId);
    } finally {
      saveSlots.leave();
    }
  }

  async function writeSave(req, me, homeId) {
    const body = await readJson(req, SAVE_LIMIT);
    if (!Number.isSafeInteger(body.revision) || body.revision < 0) refuse(400, 'invalid', '要带上这份存档原来的 revision（第一次存是 0）。');
    if (body.keep !== undefined && typeof body.keep !== 'boolean') refuse(400, 'invalid', 'keep 只能是 true 或 false。');
    if (body.saveId !== undefined && !(typeof body.saveId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.saveId))) refuse(400, 'invalid', 'saveId 不对。');
    checkedSave(body.doc);
    // Over the hourly limit, a save that asks to keep the old copy waits:
    // the device tries again later rather than replacing it unkept.
    if (body.keep === true) {
      const wait = keeps.wait(String(me.id));
      if (wait) later(wait, '这一小时里存进旧版本的已经够多了，过一会儿再存。');
    }
    const keep = body.keep === true && mayKeep(String(me.id));
    const saved = await storing(() => inTransaction(db => storeSave(db, homeId, me.id, body.revision, body.doc, {keep, saveId: body.saveId ?? null})));
    if (!saved) {
      const {revision, saveId, savedAt} = await loadRevision(pool, homeId);
      refuse(409, 'stale', '这份存档在别处更新过了。', {}, {current: withEpoch({revision, saveId, savedAt})});
    }
    return {status: 200, body: withEpoch(saved)};
  }

  function checkedSave(doc) {
    try {
      checkSave(doc);
    } catch (err) {
      refuse(400, 'invalid_save', err.message);
    }
  }

  // The database refuses some text the checks let through (a NUL character,
  // half of an emoji): that's the save's fault, not the server's.
  async function storing(job) {
    try {
      return await job();
    } catch (err) {
      if (['22P02', '22P05'].includes(err.code)) refuse(400, 'invalid_save', '存档里有存不进去的字符。');
      throw err;
    }
  }

  // The light at the door, as its owner sets it (server/streets.mjs).
  async function putPorch(req) {
    const me = await signedIn(req);
    const body = await readJson(req);
    const problem = porchProblem(body.porch);
    if (problem) refuse(400, 'invalid', problem);
    const {rowCount} = await pool.query('update homes set porch = $2 where owner_id = $1', [me.id, body.porch]);
    if (!rowCount) refuse(404, 'no_home', '还没有小屋。');
    return {status: 200, body: {porch: body.porch}};
  }

  // One street of the map, for someone who has lit their own porch light.
  // Only what hangs outside is in it (see server/streets.mjs); `streets` is
  // how many there are, so the map knows where the fields begin.
  async function getStreet(req, id) {
    const me = await signedIn(req);
    const {rows: [own]} = await pool.query('select id from homes where owner_id = $1', [me.id]);
    const street = await loadStreet(pool, id, own?.id, me.id);
    if (!street) refuse(404, 'not_found', '这里还是一片田野。');
    return {status: 200, body: {...street, streets: await streetCount(pool)}};
  }

  // Copies of the home that were put aside (server/home-saves.mjs).
  async function getHistory(req) {
    const me = await signedIn(req);
    return {status: 200, body: {versions: await loadHistory(pool, await ownHome(me))}};
  }

  async function getHistoryCopy(req, id) {
    const me = await signedIn(req);
    const copy = await loadHistoryCopy(pool, await ownHome(me), id);
    if (!copy) refuse(404, 'not_found', '没有这一份。');
    return {status: 200, body: {version: copy}};
  }

  // A device hands over its own copy before taking the server's.
  async function postHistory(req) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    const wait = keeps.wait(String(me.id));
    if (wait) later(wait, '这一小时里存进旧版本的已经够多了，过一会儿再试。');
    if (!saveSlots.enter()) refuse(503, 'busy', '这会儿有点忙，过几秒再试。', {'Retry-After': '2'});
    try {
      const body = await readJson(req, SAVE_LIMIT);
      checkedSave(body.doc);
      keeps.hit(String(me.id));
      return {status: 201, body: {version: await storing(() => keepDeviceCopy(pool, homeId, me.id, body.doc))}};
    } finally {
      saveSlots.leave();
    }
  }

  // Doors (server/doors.mjs). A visitor finds out whose door it is and what
  // they did there today (?day=), knocks, and leaves something; the owner
  // reads what's waiting and the guestbook, takes things in or not, and sees
  // the knocks.
  async function getDoor(req, street, lot) {
    const me = await signedIn(req);
    const door = await findDoor(pool, street, lot, me.id);
    if (!door) refuse(404, 'not_found', '这里是一块空地。');
    const day = new URL(req.url, 'http://localhost').searchParams.get('day');
    const today = dayProblem(day) ? {} : await doneToday(pool, door.id, me.id, day);
    return {status: 200, body: {name: door.username, nickname: door.nickname && door.nickname !== door.username ? door.nickname : '', porch: door.porch, ...(String(door.owner_id) === String(me.id) ? {mine: true} : {}), ...today}};
  }
  // The door a visitor may knock at or leave something at.
  async function openDoor(me, street, lot) {
    const door = await findDoor(pool, street, lot, me.id);
    if (!door) refuse(404, 'not_found', '这里是一块空地。');
    if (String(door.owner_id) === String(me.id)) refuse(409, 'own_door', '这是你自己家。');
    if (door.porch !== 'on') refuse(403, 'not_open', door.porch === 'dim' ? '主人只留了一盏小灯，不敲门，也不放东西。' : '这家现在不接待。');
    const wait = doorVisits.wait(String(me.id));
    if (wait) later(wait, '这一小时里串门串得够多了，歇一会儿再去。');
    return door;
  }
  async function knock(req, street, lot) {
    const me = await signedIn(req);
    const body = await readJson(req);
    const problem = dayProblem(body.day);
    if (problem) refuse(400, 'invalid', problem);
    const door = await openDoor(me, street, lot);
    if (!await inTransaction(db => visit(db, {homeId: door.id, visitor: me, kind: 'knock', day: body.day}))) refuse(409, 'already', '今天已经敲过这扇门了。');
    doorVisits.hit(String(me.id));
    return {status: 201, body: {knocked: true}};
  }
  async function leaveMail(req, street, lot) {
    const me = await signedIn(req);
    const body = await readJson(req, ITEM_LIMIT + 8 * 1024);
    const problem = dayProblem(body.day) ?? requestProblem(body.requestId) ?? noteProblem(body.note) ?? itemProblem(body.item);
    if (problem) refuse(400, 'invalid', problem);
    const note = cleanNote(body.note), item = body.item ? cleanItem(body.item) : null;
    if (!note && !item) refuse(400, 'invalid', '放一样东西，或者写一张纸条。');
    const destination = await findDoor(pool, street, lot, me.id);
    if (destination && await mailRetry(pool, me.id, body.requestId, destination.id, note, item)) return {status: 201, body: {left: true}};
    const door = await openDoor(me, street, lot);
    if (!await inTransaction(db => visit(db, {homeId: door.id, visitor: me, kind: 'mail', day: body.day, note, item, requestId: body.requestId}))) refuse(409, 'already', '今天已经往这家的邮箱里放过东西了。');
    doorVisits.hit(String(me.id));
    return {status: 201, body: {left: true}};
  }
  async function getOwnDoor(req) {
    const me = await signedIn(req);
    return {status: 200, body: await loadDoor(pool, await ownHome(me))};
  }
  async function decideMail(req, id, take) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    const result = await inTransaction(db => decide(db, homeId, id, take));
    if (!result) refuse(404, 'not_found', '门口没有这一样。');
    if (take && result.status !== 'taken') refuse(409, 'declined', '这一样已经没收了。');
    if (!take && result.status === 'taken') refuse(409, 'taken', '这一样已经收进来了。');
    return {status: 200, body: result};
  }
  async function seeOwnKnocks(req) {
    const me = await signedIn(req);
    return {status: 200, body: {seen: await seeKnocks(pool, await ownHome(me))}};
  }
  // Blocking whoever made a visit to one's own door, and taking a name off the list.
  async function blockVisitor(req) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    const body = await readJson(req);
    if (typeof body.visit !== 'string' || !/^[1-9][0-9]{0,17}$/.test(body.visit)) refuse(400, 'invalid', '要拉黑的是哪一位？');
    const blocked = await inTransaction(db => block(db, homeId, body.visit));
    if (!blocked) refuse(404, 'not_found', '门口没有这一位。');
    return {status: 201, body: {blocked}};
  }
  async function unblockVisitor(req, id) {
    const me = await signedIn(req);
    if (!await unblock(pool, await ownHome(me), id)) refuse(404, 'not_found', '拉黑的人里没有这一位。');
    return {status: 204};
  }

  // Drift bottles (server/bottles.mjs): what has been thrown from one's home and whether one has thrown today (?day=,
  // one's own), throwing one, and opening one a walk brought home from the lake ({key}: which find it is).
  async function getBottles(req) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    const day = new URL(req.url, 'http://localhost').searchParams.get('day');
    return {status: 200, body: await thrownFrom(pool, {homeId, ownerId: me.id, day: dayProblem(day) ? null : day})};
  }
  function bottleTry(me) {
    const wait = bottling.wait(String(me.id));
    if (wait) later(wait, '这一小时里往海边跑得够多了，歇一会儿再来。');
    bottling.hit(String(me.id));
  }
  async function postBottle(req) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    const body = await readJson(req);
    const problem = dayProblem(body.day) ?? requestProblem(body.requestId) ?? wordsProblem(body.words);
    if (problem) refuse(400, 'invalid', problem);
    bottleTry(me);
    const thrown = await inTransaction(db => throwBottle(db, {homeId, writerId: me.id, words: body.words, day: body.day, requestId: body.requestId}));
    if (thrown.wait === 'today') refuse(409, 'already', '今天已经投过一只了，明天再投。');
    if (thrown.wait) refuse(409, 'too_soon', '离上一只还不到二十个小时，晚些再投。');
    return {status: 201, body: thrown};
  }
  // A find from a walk weeks ago may still be waiting to be opened; one from days ahead isn't a find. The walk's day,
  // or null.
  const findDay = key => {
    if (!isFindKey(key)) return null;
    const t = Date.parse(key.slice(0, 10) + 'T12:00:00Z');
    return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== key.slice(0, 10) || t > Date.now() + 1.5 * 86400000 ? null : t;
  };
  async function openBottle(req) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    const body = await readJson(req);
    const day = findDay(body.key);
    if (day === null) refuse(400, 'invalid', '这只瓶子是哪一趟捡回来的？');
    bottleTry(me);
    // Left unopened two months: whatever was in it is gone (unless it was opened before, the answer lost).
    const stale = day < Date.now() - 60 * 86400000;
    return {status: 200, body: await inTransaction(db => fishBottle(db, {homeId, ownerId: me.id, key: body.key, stale}))};
  }

  // An invitation for one's own AI (server/invites.mjs): on a street run by a home (needed), the AIs' door takes an
  // invitation, and AIs don't answer the entry questions; anyone with a home may hold one at a time to hand to the AI
  // that is to live with them. Taking one when one is held gives that one back.
  async function getAiInvite(req) {
    const me = await signedIn(req);
    await ownHome(me);
    return {status: 200, body: {needed: inviteNeeded(keepers()), invite: await aiInviteOf(pool, me.id)}};
  }
  async function postAiInvite(req) {
    const me = await signedIn(req);
    await ownHome(me);
    const key = 'ai:' + me.id, wait = inviting.wait(key);
    if (wait) later(wait, '这一小时里领的请帖够多了，过一会儿再领。');
    const {invite, made} = await inTransaction(db => takeAiInvite(db, me.id));
    if (made) inviting.hit(key);
    return {status: made ? 201 : 200, body: {needed: inviteNeeded(keepers()), invite}};
  }
  async function deleteAiInvite(req) {
    const me = await signedIn(req);
    if (!await tearAiInvite(pool, me.id)) refuse(404, 'not_found', '没有还能用的给机的请帖。');
    return {status: 204};
  }

  // AIs living in one's home (server/residents.mjs): who lives here and the doors opened that wait for an AI to say
  // yes; seeing whose a move-in code is, and opening the door to it; calling that off; asking one to move out; and,
  // having given one's own password again, setting a new password for one that has lost its own.
  async function getResidents(req) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    return {status: 200, body: {residents: await residentsOf(pool, homeId), waiting: await openedBy(pool, me.id)}};
  }
  // Every code typed counts, right or wrong, so codes can't be tried over and over.
  function typedCode(me, body) {
    const key = String(me.id), wait = moveInTries.wait(key);
    if (wait) later(wait, '入住码试了太多次，过一会儿再来。');
    moveInTries.hit(key);
    const code = normalizeMoveInCode(body.code);
    if (!code) refuse(400, 'invalid', '入住码是六个字，像 ABC-123 这样。');
    return code;
  }
  const wrongCode = () => refuse(404, 'wrong_code', '这个入住码不对，或者已经过期、用过了。请 TA 再发一个。');
  async function peekCode(req) {
    const me = await signedIn(req);
    await ownHome(me);
    const found = await peekMoveIn(pool, typedCode(me, await readJson(req)), me.id);
    if (!found) wrongCode();
    return {status: 200, body: {moveIn: found}};
  }
  async function openDoorFor(req) {
    const me = await signedIn(req);
    await ownHome(me);
    const code = typedCode(me, await readJson(req));
    const opened = await inTransaction(db => openMoveIn(db, {code, personId: me.id}));
    if (opened.problem === 'wrong') wrongCode();
    if (opened.problem === 'no_home') refuse(404, 'no_home', '还没有小屋。');
    if (opened.problem === 'living') refuse(409, 'living', 'TA 已经住在别的家里了。');
    if (opened.problem === 'full') refuse(409, 'full', `家里已经住了 ${RESIDENTS_MAX} 位机，住满了。`);
    return {status: 201, body: {request: opened.request}};
  }
  async function closeDoorFor(req, id) {
    const me = await signedIn(req);
    if (!await inTransaction(db => cancelOpenedMoveIn(db, {personId: me.id, requestId: id}))) refuse(404, 'not_found', '没有这一扇开着等 TA 的门。');
    return {status: 204};
  }
  async function askToLeave(req, id) {
    const me = await signedIn(req);
    if (!await inTransaction(db => sendAway(db, {personId: me.id, residentId: id}))) refuse(404, 'not_found', '家里没住着这一位。');
    return {status: 204};
  }
  async function residentPassword(req, id) {
    needHashing();
    const me = await signedIn(req);
    const body = await readJson(req);
    const problem = enteredPasswordProblem(body.currentPassword) ?? passwordProblem(body.newPassword);
    if (problem) refuse(400, 'invalid', problem);
    const key = String(me.id);
    const wait = passwordChecks.wait(key);
    if (wait) later(wait, '试错太多次了，过一会儿再来。');
    const {rows: [account]} = await pool.query('select password_hash from accounts where id = $1', [me.id]);
    if (!(await countedTry(passwordChecks, key, () => hashing.verify(account.password_hash, normalizePassword(body.currentPassword), gate)))) refuse(403, 'wrong_password', '你自己的密码不对。');
    passwordChecks.clear(key);
    const ai = await residentAccount(pool, {personId: me.id, residentId: id});
    if (!ai) refuse(404, 'not_found', '家里没住着这一位。');
    const hash = await hashing.hash(normalizePassword(body.newPassword), gate);
    // Only while it still lives here: checked again with its account held, which moving out holds too.
    const changed = await inTransaction(async db => {
      await db.query('select id from accounts where id = $1 for update', [ai.id]);
      if (!await residentAccount(db, {personId: me.id, residentId: id})) return false;
      await db.query('update accounts set password_hash = $2, password_version = password_version + 1, password_changed_at = now() where id = $1', [ai.id, hash]);
      return true;
    });
    if (!changed) refuse(404, 'not_found', '家里没住着这一位。');
    return {status: 200, body: {resident: {id: String(id), account: {id: ai.id, name: ai.name, nickname: ai.nickname}}}};
  }

  // What AIs living in the home asked to do there, waiting for the page to let it in (server/acts.mjs), with the
  // save's revision: the page lets acts in only into the copy the server has, never into one another device has
  // moved past. The page answers in the home it saves next.
  // What the wardrobe has today and what each of the two has on, as her page works it out (src/machine-closet.js):
  // kept for the AIs living here, to see and to have their asks to dress them checked against (server/acts.mjs).
  async function putCloset(req) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    const body = await readJson(req, CLOSET_LIMIT);
    if (!await storeCloset(pool, homeId, body.closet)) refuse(400, 'invalid', '衣柜的样子不对。');
    return {status: 204};
  }

  async function getActs(req) {
    const me = await signedIn(req);
    const homeId = await ownHome(me);
    const acts = await waitingActs(pool, homeId);
    const {revision, saveId} = await loadRevision(pool, homeId);
    return {status: 200, body: withEpoch({acts, revision, saveId})};
  }

  const routes = {
    '/api/accounts': {POST: register, GET: plateRules},
    '/api/sessions': {POST: signIn},
    '/api/sessions/current': {DELETE: signOut},
    '/api/me': {GET: aboutMe},
    '/api/me/password': {POST: changePassword},
    '/api/me/recovery-codes': {POST: renewCodes},
    '/api/recovery': {POST: recover},
    '/api/home/save': {GET: getSave, PUT: putSave},
    '/api/home/revision': {GET: getRevision},
    '/api/home/history': {GET: getHistory, POST: postHistory},
    '/api/home/porch': {PUT: putPorch},
    '/api/home/door': {GET: getOwnDoor},
    '/api/home/door/knocks': {POST: seeOwnKnocks},
    '/api/home/blocks': {POST: blockVisitor},
    '/api/home/residents': {GET: getResidents},
    '/api/home/ai-invite': {GET: getAiInvite, POST: postAiInvite, DELETE: deleteAiInvite},
    '/api/home/move-ins': {POST: openDoorFor},
    '/api/home/move-ins/peek': {POST: peekCode},
    '/api/home/acts': {GET: getActs},
    '/api/home/closet': {PUT: putCloset},
    '/api/bottles': {GET: getBottles, POST: postBottle},
    '/api/bottles/open': {POST: openBottle},
    '/api/reports': {POST: report},
    '/api/keeper/invites': {GET: getInvites, POST: postInvite},
    '/api/entry-questions': {GET: getQuestions},
    '/api/keeper/entry': {GET: getEntry, PUT: putEntry},
    '/api/keeper/entry/questions': {POST: postQuestion},
    '/api/keeper/reports': {GET: getReports}
  };
  // /api/keeper/entry/answers/<id>/in|out: letting a newcomer in, or not.
  const entryPath = /^\/api\/keeper\/entry\/answers\/([1-9][0-9]{0,17})\/(in|out)$/;
  // /api/keeper/entry/questions/<id>: changing a question, or taking it away.
  const questionPath = /^\/api\/keeper\/entry\/questions\/([1-9][0-9]{0,17})$/;
  // /api/keeper/invites/<id>: tearing one up.
  const invitePath = /^\/api\/keeper\/invites\/([1-9][0-9]{0,17})$/;
  // /api/keeper/reports/<id>[/fine|/disable|/undo]: one report whole, closing it, or switching its account back on.
  const reportPath = /^\/api\/keeper\/reports\/([1-9][0-9]{0,17})(?:\/(fine|disable|undo))?$/;
  // /api/home/blocks/<id>: one name on the list of the blocked.
  const blockPath = /^\/api\/home\/blocks\/([1-9][0-9]{0,17})$/;
  // /api/home/move-ins/<id>: calling off a door opened for an AI.
  const moveInPath = /^\/api\/home\/move-ins\/([1-9][0-9]{0,17})$/;
  // /api/home/residents/<id>[/password]: an AI living here, asked to move out, or given a new password.
  const residentPath = /^\/api\/home\/residents\/([1-9][0-9]{0,17})(\/password)?$/;
  // /api/home/history/<id>: one put-aside copy.
  const historyCopy = /^\/api\/home\/history\/([1-9][0-9]{0,17})$/;
  // /api/streets/<id>: one street of the map.
  const streetPath = /^\/api\/streets\/([1-9][0-9]{0,17})$/;
  // /api/doors/<street>/<lot>[/knock|/mail]: someone's door.
  const doorPath = /^\/api\/doors\/([1-9][0-9]{0,17})\/([0-9]{1,2})(\/knock|\/mail)?$/;
  // /api/home/door/<id>/take|decline: something left at one's own door.
  const mailPath = /^\/api\/home\/door\/([1-9][0-9]{0,17})\/(take|decline)$/;
  const doorRoute = pathname => {
    const d = doorPath.exec(pathname);
    if (d) {
      const [, street, lot, what] = d;
      if (Number(lot) > 63) return null;
      return what === '/knock' ? {POST: req => knock(req, street, Number(lot))} : what === '/mail' ? {POST: req => leaveMail(req, street, Number(lot))} : {GET: req => getDoor(req, street, Number(lot))};
    }
    const m = mailPath.exec(pathname);
    if (m) return {POST: req => decideMail(req, m[1], m[2] === 'take')};
    const b = blockPath.exec(pathname);
    if (b) return {DELETE: req => unblockVisitor(req, b[1])};
    const mi = moveInPath.exec(pathname);
    if (mi) return {DELETE: req => closeDoorFor(req, mi[1])};
    const rp = residentPath.exec(pathname);
    if (rp) return rp[2] ? {POST: req => residentPassword(req, rp[1])} : {DELETE: req => askToLeave(req, rp[1])};
    const i = invitePath.exec(pathname);
    if (i) return {DELETE: req => deleteInvite(req, i[1])};
    const q = questionPath.exec(pathname);
    if (q) return {PUT: req => putQuestion(req, q[1]), DELETE: req => deleteQuestion(req, q[1])};
    const e = entryPath.exec(pathname);
    if (e) return {POST: req => decideOne(req, e[1], e[2] === 'in')};
    const r = reportPath.exec(pathname);
    return r ? (r[2] ? {POST: req => closeOne(req, r[1], r[2])} : {GET: req => getReport(req, r[1])}) : null;
  };

  return async function handleApi(req, res, pathname) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, PREFLIGHT);
      res.end();
      return;
    }
    const copyId = historyCopy.exec(pathname)?.[1], streetId = streetPath.exec(pathname)?.[1];
    const methods = copyId ? {GET: req => getHistoryCopy(req, copyId)} : streetId ? {GET: req => getStreet(req, streetId)} : routes[pathname] || doorRoute(pathname);
    if (!methods) return send(res, 404, {error: {code: 'not_found', message: '这里什么也没有。'}});
    const route = methods[req.method];
    if (!route) return send(res, 405, {error: {code: 'wrong_method', message: '不能这样用。'}}, {Allow: [...Object.keys(methods), 'OPTIONS'].join(', ')});
    if (!inFlight.enter()) return send(res, 503, {error: {code: 'busy', message: '这会儿有点忙，过几秒再试。'}}, {'Retry-After': '2'});
    try {
      const {status, body} = await route(req);
      send(res, status, body);
    } catch (err) {
      if (err instanceof Refusal) send(res, err.status, {error: {code: err.code, message: err.message}, ...err.extra}, err.headers);
      else if (err instanceof DoorProblem) send(res, err.status || 409, {error: {code: err.code, message: err.message}});
      else if (['22P02', '22P05', '22021'].includes(err.code)) send(res, 400, {error: {code: 'invalid', message: '内容里有读不懂的字符。'}});
      else if (err instanceof Busy || /timeout exceeded when trying to connect/.test(err.message)) {
        // Hashing is full, or every database connection is taken: come back shortly.
        send(res, 503, {error: {code: 'busy', message: '这会儿有点忙，过几秒再试。'}}, {'Retry-After': '2'});
      }
      else {
        console.error('api:', req.method, pathname, err.message);
        send(res, 500, {error: {code: 'broken', message: '服务器这边出错了。'}});
      }
    } finally {
      inFlight.leave();
    }
  };
}
