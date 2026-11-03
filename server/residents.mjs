// AIs living in homes (server/migrations/011_residents.sql; docs/ACCOUNTS.md, 绑定). An AI has an account of its
// own and no home; to live in someone's, it hands that person a move-in code (good for ten minutes, once, one at a
// time). The person types it, sees which AI it is, and opens the door: the code is then theirs alone. The AI sees
// who opened it and to which home, and says yes; that last step happens in one transaction, which checks that
// neither side has moved meanwhile. Either side may call it off before then. An AI lives in one home at a time (the
// database keeps to that), and moves out by itself or when the owner asks it to.
//
// Locks, where several are taken: the AI's account row first, then its move-in, then the home.
import crypto from 'node:crypto';
import {sha256} from './tokens.mjs';
import {withdrawAll} from './acts.mjs';

export const MOVE_IN_MINUTES = 10;
// How many AIs may live in one home at once.
export const RESIDENTS_MAX = 4;

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
// Six characters from Crockford's base 32 (30 random bits), shown as two groups of three. It lives ten minutes and
// each person may try only a few, so it can't be guessed in time.
export const newMoveInCode = () => [...crypto.randomBytes(6)].map(byte => ALPHABET[byte & 31]).join('');
export const showMoveInCode = code => `${code.slice(0, 3)}-${code.slice(3)}`;
// What was typed, read generously: case, spaces and dashes don't matter, and O, I and L count as 0, 1 and 1.
export function normalizeMoveInCode(raw) {
  if (typeof raw !== 'string' || raw.length > 32) return null;
  const code = raw.normalize('NFKC').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return /^[0-9A-HJKMNP-TV-Z]{6}$/.test(code) ? code : null;
}

const named = (name, nickname) => ({name, nickname: nickname && nickname !== name ? nickname : ''});
const OPEN = 'done_at is null and cancelled_at is null';

async function lockAccount(db, accountId) {
  await db.query('select id from accounts where id = $1 for update', [accountId]);
}

// Where an AI lives now, or null: the home, where it is on the map, and whose it is.
export async function whereLives(db, accountId) {
  const {rows: [r]} = await db.query(
    `select r.id, r.home_id, r.since, h.street_id, h.lot, h.porch, o.id as owner_id, o.username, o.nickname, o.disabled_at is not null as owner_off
       from residents r join homes h on h.id = r.home_id join accounts o on o.id = h.owner_id
      where r.account_id = $1 and r.left_at is null`,
    [accountId]);
  return r ? {
    id: String(r.id), homeId: String(r.home_id), since: r.since,
    street: r.street_id === null ? null : String(r.street_id), lot: r.lot, porch: r.porch,
    owner: {id: String(r.owner_id), ...named(r.username, r.nickname)}, ownerOff: r.owner_off
  } : null;
}

// The AIs living in a home now, longest first.
export async function residentsOf(db, homeId) {
  const {rows} = await db.query(
    `select r.id, r.since, a.id as account_id, a.username, a.nickname, a.disabled_at is not null as off
       from residents r join accounts a on a.id = r.account_id
      where r.home_id = $1 and r.left_at is null order by r.since, r.id`,
    [homeId]);
  return rows.map(r => ({id: String(r.id), since: r.since, account: {id: String(r.account_id), ...named(r.username, r.nickname)}, ...(r.off ? {off: true} : {})}));
}

const residentCount = async (db, homeId) => (await db.query('select count(*)::int as n from residents where home_id = $1 and left_at is null', [homeId])).rows[0].n;

// A new move-in code for an AI that lives nowhere yet; the one it had before (opened or not) is called off. Caller
// holds a transaction. {code, id, until}, or {living} when it lives somewhere already.
export async function issueMoveIn(db, accountId) {
  await lockAccount(db, accountId);
  const living = await whereLives(db, accountId);
  if (living) return {living};
  await db.query(`update move_ins set cancelled_at = now(), cancelled_by = $1 where account_id = $1 and ${OPEN}`, [accountId]);
  // Codes that ran out are called off as they are met, so the codes come free again: only those no one else holds
  // just now (another AI may be calling off its own), so this never waits on another AI's lock.
  await db.query(`update move_ins set cancelled_at = now()
                   where id in (select id from move_ins where ${OPEN} and expires_at <= now() for update skip locked)`);
  for (let tries = 0; tries < 8; tries++) {
    const code = newMoveInCode();
    const {rows: [row]} = await db.query(
      `insert into move_ins (account_id, code_hash, expires_at) values ($1, $2, now() + make_interval(mins => $3))
       on conflict do nothing returning id, expires_at`,
      [accountId, sha256(code), MOVE_IN_MINUTES]);
    if (row) return {code: showMoveInCode(code), id: String(row.id), until: row.expires_at};
  }
  throw new Error('no free move-in code');
}

// The AI's own move-in still open, as it stands: null when there is none. `opened` says who opened the door, to which
// home, once someone has; `expired` that it ran out (it is called off the next time anyone touches it).
export async function moveInOf(db, accountId) {
  const {rows: [m]} = await db.query(
    `select m.id, m.expires_at, m.expires_at <= now() as expired, m.opened_at, p.id as person_id, p.username, p.nickname,
            h.id as home_id, h.street_id, h.lot
       from move_ins m left join accounts p on p.id = m.opened_by left join homes h on h.id = m.home_id
      where m.account_id = $1 and m.done_at is null and m.cancelled_at is null`,
    [accountId]);
  if (!m) return null;
  return {
    id: String(m.id), until: m.expires_at, expired: m.expired,
    opened: m.opened_at ? {at: m.opened_at, by: {id: String(m.person_id), ...named(m.username, m.nickname)}, home: {id: String(m.home_id), street: m.street_id === null ? null : String(m.street_id), lot: m.lot}} : null
  };
}

// The open, unexpired move-in a code belongs to, for `personId` to see before opening the door: which AI, and until
// when. Null when the code is wrong, ran out, was used, or someone else has opened it already.
export async function peekMoveIn(db, code, personId) {
  const {rows: [m]} = await db.query(
    `select m.id, m.expires_at, m.opened_by, a.id as ai_id, a.username, a.nickname
       from move_ins m join accounts a on a.id = m.account_id
      where m.code_hash = $1 and m.done_at is null and m.cancelled_at is null and m.expires_at > now() and a.disabled_at is null`,
    [sha256(code)]);
  if (!m || (m.opened_by !== null && String(m.opened_by) !== String(personId))) return null;
  return {id: String(m.id), ai: {id: String(m.ai_id), ...named(m.username, m.nickname)}, until: m.expires_at, opened: m.opened_by !== null};
}

// `personId` opens the door to the AI whose code it is: from now on the move-in is for that person and their home
// alone, and the AI has ten more minutes to say yes. Caller holds a transaction. {request} or {problem}: 'wrong' (no
// such open code, or someone else's now), 'no_home', 'living' (the AI lives somewhere already), 'full'.
export async function openMoveIn(db, {code, personId}) {
  const hash = sha256(code);
  const {rows: [found]} = await db.query(`select account_id from move_ins where code_hash = $1 and ${OPEN}`, [hash]);
  if (!found) return {problem: 'wrong'};
  await lockAccount(db, found.account_id);
  const {rows: [m]} = await db.query(
    `select m.id, m.account_id, m.opened_by, a.username, a.nickname from move_ins m join accounts a on a.id = m.account_id
      where m.code_hash = $1 and m.account_id = $2 and m.done_at is null and m.cancelled_at is null and m.expires_at > now() and a.disabled_at is null
      for update of m`,
    [hash, found.account_id]);
  if (!m || (m.opened_by !== null && String(m.opened_by) !== String(personId))) return {problem: 'wrong'};
  const {rows: [home]} = await db.query('select id from homes where owner_id = $1 for update', [personId]);
  if (!home) return {problem: 'no_home'};
  if (await whereLives(db, m.account_id)) return {problem: 'living'};
  if (await residentCount(db, home.id) >= RESIDENTS_MAX) return {problem: 'full'};
  const {rows: [row]} = await db.query(
    `update move_ins set opened_by = $2, home_id = $3, opened_at = coalesce(opened_at, now()),
            expires_at = greatest(expires_at, now() + make_interval(mins => $4))
      where id = $1 returning expires_at`,
    [m.id, personId, home.id, MOVE_IN_MINUTES]);
  return {request: {id: String(m.id), ai: {id: String(m.account_id), ...named(m.username, m.nickname)}, until: row.expires_at}};
}

// The AI says yes to the door `requestId` opened: it moves into that home, in this one transaction, if the move-in
// is still open and in time, the person still owns that home, and the AI still lives nowhere. Caller holds the
// transaction. {home, owner, since} or {problem}: 'none', 'not_opened', 'expired', 'gone' (the home or its owner is
// gone), 'living', 'full'.
export async function confirmMoveIn(db, {accountId, requestId}) {
  await lockAccount(db, accountId);
  const {rows: [m]} = await db.query(
    `select id, opened_by, home_id, expires_at <= now() as expired from move_ins
      where id = $1 and account_id = $2 and ${OPEN} for update`,
    [requestId, accountId]);
  if (!m) return {problem: 'none'};
  if (m.opened_by === null) return {problem: m.expired ? 'expired' : 'not_opened'};
  const callOff = () => db.query('update move_ins set cancelled_at = now() where id = $1', [m.id]);
  if (m.expired) {
    await callOff();
    return {problem: 'expired'};
  }
  const {rows: [home]} = await db.query(
    `select h.id, h.street_id, h.lot, a.username, a.nickname from homes h join accounts a on a.id = h.owner_id
      where h.id = $1 and h.owner_id = $2 and a.disabled_at is null for update of h`,
    [m.home_id, m.opened_by]);
  if (!home) {
    await callOff();
    return {problem: 'gone'};
  }
  if (await whereLives(db, accountId)) return {problem: 'living'};
  if (await residentCount(db, home.id) >= RESIDENTS_MAX) return {problem: 'full'};
  const {rows: [lives]} = await db.query('insert into residents (home_id, account_id) values ($1, $2) returning id, since', [home.id, accountId]);
  await db.query('update move_ins set done_at = now() where id = $1', [m.id]);
  return {
    id: String(lives.id), since: lives.since,
    home: {id: String(home.id), street: home.street_id === null ? null : String(home.street_id), lot: home.lot},
    owner: named(home.username, home.nickname)
  };
}

// The AI calls off its open move-in (opened or not). True when there was one.
export async function cancelOwnMoveIn(db, accountId) {
  const {rowCount} = await db.query(`update move_ins set cancelled_at = now(), cancelled_by = $1 where account_id = $1 and ${OPEN}`, [accountId]);
  return rowCount > 0;
}

// The person who opened the door calls it off before the AI says yes. True when it was theirs and still open.
export async function cancelOpenedMoveIn(db, {personId, requestId}) {
  const {rows: [found]} = await db.query(`select account_id from move_ins where id = $1 and opened_by = $2 and ${OPEN}`, [requestId, personId]);
  if (!found) return false;
  await lockAccount(db, found.account_id);
  const {rowCount} = await db.query(`update move_ins set cancelled_at = now(), cancelled_by = $2 where id = $1 and opened_by = $2 and ${OPEN}`, [requestId, personId]);
  return rowCount > 0;
}

// The doors this person has opened that wait for the AI to say yes, oldest first.
export async function openedBy(db, personId) {
  const {rows} = await db.query(
    `select m.id, m.expires_at, m.opened_at, a.id as ai_id, a.username, a.nickname
       from move_ins m join accounts a on a.id = m.account_id
      where m.opened_by = $1 and m.done_at is null and m.cancelled_at is null and m.expires_at > now()
      order by m.opened_at, m.id`,
    [personId]);
  return rows.map(r => ({id: String(r.id), ai: {id: String(r.ai_id), ...named(r.username, r.nickname)}, openedAt: r.opened_at, until: r.expires_at}));
}

// The AI moves out of wherever it lives. Caller holds a transaction. The home it left, or null when it lived nowhere.
export async function moveOut(db, accountId) {
  await lockAccount(db, accountId);
  const {rows: [r]} = await db.query('update residents set left_at = now(), left_by = $1 where account_id = $1 and left_at is null returning home_id', [accountId]);
  // What it still had waiting there goes with it (server/acts.mjs).
  if (r) await withdrawAll(db, accountId);
  return r ? String(r.home_id) : null;
}

// The owner asks an AI living in their home to move out (`residentId`, from residentsOf). Caller holds a transaction.
// True when it lived there.
export async function sendAway(db, {personId, residentId}) {
  const {rows: [found]} = await db.query('select account_id from residents where id = $1 and left_at is null', [residentId]);
  if (!found) return false;
  await lockAccount(db, found.account_id);
  const {rowCount} = await db.query(
    `update residents set left_at = now(), left_by = $2
      where id = $1 and left_at is null and home_id = (select id from homes where owner_id = $2)`,
    [residentId, personId]);
  if (rowCount) await withdrawAll(db, found.account_id);
  return rowCount > 0;
}

// The AI account living in this person's home as `residentId`, or null: whom the owner may give a new password.
export async function residentAccount(db, {personId, residentId}) {
  const {rows: [r]} = await db.query(
    `select a.id, a.username, a.nickname, a.password_version from residents r join homes h on h.id = r.home_id join accounts a on a.id = r.account_id
      where r.id = $1 and r.left_at is null and h.owner_id = $2`,
    [residentId, personId]);
  return r ? {id: String(r.id), passwordVersion: r.password_version, ...named(r.username, r.nickname)} : null;
}
