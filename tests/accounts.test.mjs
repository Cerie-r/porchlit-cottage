import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  codePoints, displayUsername, enteredPasswordProblem, nicknameOf, normalizePassword, passwordProblem, usernameKey,
  usernameProblem, usernameShapeProblem
} from '../server/accounts.mjs';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {bucket, capacity, perKey} from '../server/limits.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {Busy, createGate, hashPassword, hashingAvailable, needsRehash, verifyPassword} from '../server/passwords.mjs';
import {looksLikeSessionToken, newRecoveryCodes, newSessionToken, normalizeRecoveryCode, sha256} from '../server/tokens.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';
// A name kept for an AI that hasn't hung its door plate yet (server/accounts.mjs keptForLater).
process.env.PORCHLIT_KEPT_NAMES = 'Birch';

const needsHashing = hashingAvailable ? {} : {skip: 'needs Node 24.7 or later (built-in Argon2)'};
const needsBoth = needsDatabase.skip ? needsDatabase : needsHashing;

// A server on a fresh database, and a small way to call it.
async function startHouse(t, limits = {}, gate = createGate()) {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const server = createServer({db: {pool, migrations: await loadMigrations()}, api: createApi({pool, limits, gate})});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(method, path, {token, body, headers = {}} = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body === undefined ? {} : {'Content-Type': 'application/json'}),
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
        ...headers
      },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
    });
    const text = await res.text();
    return {status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null};
  }
  return {pool, call, base};
}

const signUp = (call, username, password = 'lamplight 01') => call('POST', '/api/accounts', {body: {username, password, adult: true}});
const signIn = (call, username, password = 'lamplight 01') => call('POST', '/api/sessions', {body: {username, password}});

// Lets every hash through at once, but can hold the result of the Nth call
// from now until the test lets it go, to line requests up deterministically.
function holdingGate() {
  let pending = null;
  const gate = async task => {
    const result = await task();
    if (pending && --pending.after === 0) {
      const p = pending;
      pending = null;
      p.reached();
      await p.released;
    }
    return result;
  };
  gate.holdAfter = (calls = 1) => {
    let reached;
    let release;
    const reachedPromise = new Promise(resolve => { reached = resolve; });
    const released = new Promise(resolve => { release = resolve; });
    pending = {after: calls, reached, released};
    return {reached: reachedPromise, release};
  };
  return gate;
}

test('usernames fold full-width forms and case, and some names are kept back', () => {
  assert.equal(usernameKey('ＷＲＥＮ'), 'wren');
  assert.equal(usernameKey('Wren'), usernameKey('wREN'));
  assert.equal(displayUsername('Ｗｒｅｎ'), 'Wren');
  for (const ok of ['Wren', '晚风', 'moth_2-b.c', 'ab']) assert.equal(usernameProblem(ok), null, ok);
  // Kept for later: looks taken to anyone signing up, in any spelling.
  for (const kept of ['Birch', 'birch', 'ＢＩＲＣＨ']) assert.equal(usernameProblem(kept), '这个名字已经有人用了。', kept);
  assert.equal(usernameProblem('birches'), null);
  assert.match(usernameProblem('w'), /2 到 32/);
  assert.match(usernameProblem('a'.repeat(33)), /2 到 32/);
  assert.match(usernameProblem('two words'), /不能有空格/);
  assert.match(usernameProblem('tab\there'), /不能有空格/);
  for (const kept of ['admin', 'ＡＤＭＩＮ', 'Porchlit_helper', '官方小号', '管理员']) assert.match(usernameProblem(kept), /留着/, kept);
  assert.match(usernameProblem(42), /用户名/);
  // Shape only for sign-in and recovery: kept-back names pass, nonsense doesn't.
  assert.equal(usernameShapeProblem('admin'), null);
  assert.match(usernameShapeProblem(''), /用户名/);
  // Long input is refused before normalising (one of these grows 18-fold).
  const started = performance.now();
  assert.match(usernameShapeProblem('\uFDFA'.repeat(4000)), /2 到 32/);
  assert.ok(performance.now() - started < 50);
});

test('nicknames default to the username, are trimmed, capped and visible', () => {
  assert.deepEqual(nicknameOf(undefined, 'Wren'), {nickname: 'Wren'});
  assert.deepEqual(nicknameOf('   ', 'Wren'), {nickname: 'Wren'});
  assert.deepEqual(nicknameOf(' 小 雀 ', 'Wren'), {nickname: '小 雀'});
  assert.ok(nicknameOf('a'.repeat(33), 'Wren').problem);
  assert.ok(nicknameOf('a​b', 'Wren').problem);
  assert.ok(nicknameOf(5, 'Wren').problem);
});

test('passwords: NFKC only, counted in code points, 6 to 128 when set', () => {
  assert.equal(normalizePassword('ｌａｍｐｌｉｇｈｔ　０１'), 'lamplight 01');
  assert.equal(normalizePassword('PassWord'), 'PassWord');
  assert.notEqual(normalizePassword(' lamplight '), 'lamplight');
  assert.match(passwordProblem('five!'), /至少要 6/);
  assert.equal(passwordProblem('six ch'), null);
  assert.equal(passwordProblem('六个汉字就行'), null);
  assert.match(passwordProblem('五个汉字'), /至少/);
  const moons = '🌙'.repeat(128);
  assert.equal(moons.length, 256);
  assert.equal(codePoints(moons), 128);
  assert.equal(passwordProblem(moons), null);
  assert.match(passwordProblem(`${moons}🌙`), /最多 128/);
  assert.equal(enteredPasswordProblem('x'), null);
  assert.match(enteredPasswordProblem('x'.repeat(129)), /最多/);
  assert.match(passwordProblem(null), /密码/);
});

test('session tokens and recovery codes', () => {
  const token = newSessionToken();
  assert.ok(looksLikeSessionToken(token));
  assert.notEqual(newSessionToken(), token);
  assert.ok(!looksLikeSessionToken(`${token}x`));
  const codes = newRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  for (const code of codes) assert.match(code, /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
  const plain = codes[0].replace('-', '');
  assert.equal(normalizeRecoveryCode(codes[0].toLowerCase()), plain);
  assert.equal(normalizeRecoveryCode(` ${plain.slice(0, 5)} ${plain.slice(5)} `), plain);
  assert.equal(normalizeRecoveryCode('O1IL0-ABCDE'), '01110ABCDE');
  assert.equal(normalizeRecoveryCode('ABCD'), null);
  assert.equal(normalizeRecoveryCode('UUUUU-UUUUU'), null);
  assert.equal(normalizeRecoveryCode(7), null);
});

test('limits: a refilling bucket, per-key windows, a cap on requests at once', () => {
  let t = 0;
  const now = () => t;
  const b = bucket({size: 2, every: 1000, now});
  assert.equal(b.take(), 0);
  assert.equal(b.take(), 0);
  assert.equal(b.take(), 1);
  t = 1000;
  assert.equal(b.take(), 0);
  assert.ok(b.take() > 0);
  const k = perKey({limit: 2, window: 10_000, now});
  assert.equal(k.wait('a'), 0);
  k.hit('a');
  k.hit('a');
  assert.equal(k.wait('a'), 10);
  assert.equal(k.wait('b'), 0);
  t += 10_000;
  assert.equal(k.wait('a'), 0);
  k.hit('a');
  k.hit('a');
  k.clear('a');
  assert.equal(k.wait('a'), 0);
  // An account at its limit stays there however many other keys arrive.
  const full = perKey({limit: 2, window: 60_000, now, maxKeys: 3});
  full.hit('kept');
  full.hit('kept');
  for (const other of ['a', 'b', 'c', 'd', 'e', 'f']) full.hit(other);
  assert.ok(full.wait('kept') > 0);
  // A try that never really happened can be taken back.
  const back = perKey({limit: 2, window: 60_000, now});
  back.hit('x');
  back.hit('x');
  assert.ok(back.wait('x') > 0);
  back.undo('x');
  assert.equal(back.wait('x'), 0);
  const c = capacity(1);
  assert.ok(c.enter());
  assert.ok(!c.enter());
  c.leave();
  assert.ok(c.enter());
});

test('one password hash at a time, a short line, then "busy"', async () => {
  const gate = createGate({waiting: 2});
  let running = 0;
  let most = 0;
  const job = () => gate(async () => {
    running += 1;
    most = Math.max(most, running);
    await new Promise(resolve => setTimeout(resolve, 20));
    running -= 1;
    return 'done';
  });
  const results = await Promise.allSettled([job(), job(), job(), job()]);
  assert.equal(most, 1);
  assert.deepEqual(results.map(r => r.status), ['fulfilled', 'fulfilled', 'fulfilled', 'rejected']);
  assert.ok(results[3].reason instanceof Busy);
  assert.equal(await job(), 'done');
});

test('Argon2id hashes: a PHC string, only the right password, settings travel with the hash', needsHashing, async () => {
  const gate = createGate();
  const hash = await hashPassword('correct horse', gate);
  assert.match(hash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/);
  assert.equal(await verifyPassword(hash, 'correct horse', gate), true);
  assert.equal(await verifyPassword(hash, 'correct horse ', gate), false);
  assert.notEqual(await hashPassword('correct horse', gate), hash);
  assert.equal(needsRehash(hash), false);
  const salt = crypto.randomBytes(16);
  const tag = crypto.argon2Sync('argon2id', {message: 'older one', nonce: salt, memory: 8192, passes: 1, parallelism: 1, tagLength: 32});
  const older = `$argon2id$v=19$m=8192,t=1,p=1$${salt.toString('base64').replace(/=+$/, '')}$${tag.toString('base64').replace(/=+$/, '')}`;
  assert.equal(await verifyPassword(older, 'older one', gate), true);
  assert.equal(needsRehash(older), true);
  assert.equal(await verifyPassword('not a hash', 'x', gate), false);
});

test('without a database the account API says so', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/me`);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error.code, 'no_database');
  } finally {
    await new Promise(resolve => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
});

test('a person signs up and gets a home, a session and ten recovery codes; only hashes are kept', needsBoth, async t => {
  const {call, pool} = await startHouse(t);
  const up = await call('POST', '/api/accounts', {body: {username: 'Ｗｒｅｎ', password: 'lamplight 01', nickname: ' 小雀 ', adult: true}});
  assert.equal(up.status, 201);
  const {id, createdAt, ...account} = up.body.account;
  assert.deepEqual(account, {kind: 'human', username: 'Wren', nickname: '小雀'});
  assert.ok(id && createdAt);
  assert.ok(looksLikeSessionToken(up.body.session.token));
  assert.equal(up.body.recoveryCodes.length, 10);
  const me = await call('GET', '/api/me', {token: up.body.session.token});
  assert.equal(me.status, 200);
  assert.equal(me.body.account.username, 'Wren');
  assert.deepEqual(me.body.home, up.body.home);
  assert.equal(me.body.recoveryCodesLeft, 10);
  const {rows: [stored]} = await pool.query(
    `select a.password_hash, s.token_hash, (select array_agg(code_hash) from recovery_codes) as codes
       from accounts a join sessions s on s.account_id = a.id`);
  assert.match(stored.password_hash, /^\$argon2id\$/);
  assert.deepEqual(stored.token_hash, sha256(up.body.session.token));
  assert.ok(stored.codes.every(c => c.length === 32));
  assert.ok(!stored.codes.some(c => c.equals(Buffer.from(up.body.recoveryCodes[0]))));
  // The same name in another form is already taken.
  const again = await signUp(call, 'WREN', 'another one 2');
  assert.equal(again.status, 409);
  assert.equal(again.body.error.code, 'username_taken');
});

test('signing in and out; the password is read the same way as at sign-up', needsBoth, async t => {
  const {call} = await startHouse(t);
  const up = await signUp(call, 'Wren');
  const inAgain = await signIn(call, 'wren', 'ｌａｍｐｌｉｇｈｔ　０１');
  assert.equal(inAgain.status, 201);
  assert.equal(inAgain.body.account.username, 'Wren');
  const wrong = await signIn(call, 'Wren', 'lamplight 02');
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.error.code, 'wrong_password');
  assert.equal((await signIn(call, 'nobody', 'whatever 1')).status, 401);
  assert.equal((await call('DELETE', '/api/sessions/current', {token: inAgain.body.session.token})).status, 204);
  assert.equal((await call('GET', '/api/me', {token: inAgain.body.session.token})).status, 401);
  assert.equal((await call('GET', '/api/me', {token: up.body.session.token})).status, 200);
});

test('sign-up turns away kept names, short and overlong passwords', needsBoth, async t => {
  const {call} = await startHouse(t);
  for (const body of [
    {username: 'admin', password: 'lamplight 01'},
    {username: 'Wren', password: 'short'},
    {username: 'Wren', password: '🌙'.repeat(129)},
    {username: 'two words', password: 'lamplight 01'},
    {username: 'Wren', password: 'lamplight 01', nickname: 'x'.repeat(40)}
  ]) {
    const res = await call('POST', '/api/accounts', {body});
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    assert.equal(res.body.error.code, 'invalid');
  }
  assert.equal((await signUp(call, 'Wren', '🌙'.repeat(128))).status, 201);
});

test('a session is read only from the Authorization header; JSON only; CORS is open', needsBoth, async t => {
  const {call, base} = await startHouse(t);
  const {body: {session: {token}}} = await signUp(call, 'Wren');
  assert.equal((await call('GET', `/api/me?token=${token}`)).status, 401);
  assert.equal((await call('GET', '/api/me', {headers: {Cookie: `session=${token}`}})).status, 401);
  assert.equal((await call('GET', '/api/me', {headers: {Authorization: token}})).status, 401);
  assert.equal((await call('GET', '/api/me', {token})).headers.get('access-control-allow-origin'), '*');
  const pre = await fetch(`${base}/api/me`, {method: 'OPTIONS', headers: {Origin: 'https://example.com', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization'}});
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), '*');
  assert.match(pre.headers.get('access-control-allow-headers'), /Authorization/);
  assert.equal((await call('POST', '/api/sessions', {body: 'username=Wren', headers: {'Content-Type': 'application/x-www-form-urlencoded'}})).status, 415);
  assert.equal((await call('POST', '/api/sessions', {body: JSON.stringify({username: 'Wren', password: 'x'.repeat(9000)})})).status, 413);
  assert.equal((await call('POST', '/api/sessions', {body: '{not json'})).status, 400);
  assert.equal((await call('POST', '/api/sessions', {body: '[]'})).status, 400);
  assert.equal((await call('GET', '/api/nothing-here')).status, 404);
  const wrongMethod = await call('GET', '/api/sessions');
  assert.equal(wrongMethod.status, 405);
  assert.match(wrongMethod.headers.get('allow'), /POST/);
});

test('changing the password needs the current one and ends every session', needsBoth, async t => {
  const {call} = await startHouse(t);
  const up = await signUp(call, 'Wren');
  const other = await signIn(call, 'Wren');
  const token = up.body.session.token;
  const refused = await call('POST', '/api/me/password', {token, body: {currentPassword: 'wrong one 1', newPassword: 'porch light 2'}});
  assert.equal(refused.status, 403);
  const changed = await call('POST', '/api/me/password', {token, body: {currentPassword: 'lamplight 01', newPassword: 'porch light 2'}});
  assert.equal(changed.status, 200);
  assert.equal((await call('GET', '/api/me', {token})).status, 401);
  assert.equal((await call('GET', '/api/me', {token: other.body.session.token})).status, 401);
  assert.equal((await call('GET', '/api/me', {token: changed.body.session.token})).status, 200);
  assert.equal((await signIn(call, 'Wren')).status, 401);
  assert.equal((await signIn(call, 'Wren', 'porch light 2')).status, 201);
});

test('a recovery code works once, sets a new password and ends every session', needsBoth, async t => {
  const {call, pool} = await startHouse(t);
  const up = await signUp(call, 'Wren');
  const [code, second] = up.body.recoveryCodes;
  assert.equal((await call('POST', '/api/recovery', {body: {username: 'Wren', code: 'AAAAA-AAAAA', newPassword: 'porch light 2'}})).status, 401);
  const back = await call('POST', '/api/recovery', {body: {username: 'wren', code: code.toLowerCase().replace('-', ' '), newPassword: 'porch light 2'}});
  assert.equal(back.status, 200);
  assert.equal(back.body.recoveryCodesLeft, 9);
  assert.equal((await call('GET', '/api/me', {token: up.body.session.token})).status, 401);
  assert.equal((await call('GET', '/api/me', {token: back.body.session.token})).status, 200);
  assert.equal((await call('POST', '/api/recovery', {body: {username: 'Wren', code, newPassword: 'third time 3'}})).status, 401);
  assert.equal((await signIn(call, 'Wren', 'porch light 2')).status, 201);
  // Two requests racing with the same code: only one gets through.
  const race = await Promise.all([1, 2].map(() => call('POST', '/api/recovery', {body: {username: 'Wren', code: second, newPassword: 'racing ahead 4'}})));
  assert.deepEqual(race.map(r => r.status).sort(), [200, 401]);
  const {rows: [spent]} = await pool.query('select count(*)::int as n from recovery_codes where used_at is not null');
  assert.equal(spent.n, 2);
});

test('limits: tries per account and a sign-up burst', needsBoth, async t => {
  const {call} = await startHouse(t, {signins: {limit: 3, window: 60_000}, signups: {size: 2, every: 60_000}});
  assert.equal((await signUp(call, 'Wren')).status, 201);
  assert.equal((await signUp(call, 'Moth')).status, 201);
  const third = await signUp(call, 'Lark');
  assert.equal(third.status, 429);
  assert.ok(Number(third.headers.get('retry-after')) > 0);
  for (let i = 0; i < 3; i++) assert.equal((await signIn(call, 'Wren', `wrong guess ${i}`)).status, 401);
  // Even the right password waits now, under any spelling of the name;
  // other accounts aren't held up.
  assert.equal((await signIn(call, 'ＷＲＥＮ')).status, 429);
  assert.equal((await signIn(call, 'Moth')).status, 201);
});

test('when hashing is already busy, the next sign-in is asked to come back', needsBoth, async t => {
  const {call} = await startHouse(t, {}, createGate({waiting: 0}));
  assert.equal((await signUp(call, 'Wren')).status, 201);
  const tries = await Promise.all([1, 2, 3].map(() => signIn(call, 'Wren')));
  const statuses = tries.map(r => r.status);
  assert.ok(statuses.includes(201), statuses.join());
  assert.ok(statuses.includes(503), statuses.join());
  assert.equal(tries.find(r => r.status === 503).headers.get('retry-after'), '2');
});

test('disabled accounts lose their sessions; AI accounts do not sign in here', needsBoth, async t => {
  const {call, pool} = await startHouse(t);
  const up = await signUp(call, 'Wren');
  await pool.query(`update accounts set disabled_at = now() where username_key = 'wren'`);
  assert.equal((await call('GET', '/api/me', {token: up.body.session.token})).status, 401);
  const disabled = await signIn(call, 'Wren');
  assert.equal(disabled.status, 403);
  assert.equal(disabled.body.error.code, 'disabled');
  const {rows: [{password_hash: hash}]} = await pool.query(`select password_hash from accounts where username_key = 'wren'`);
  await pool.query(`insert into accounts (kind, username, username_key, password_hash) values ('ai', 'Moth', 'moth', $1)`, [hash]);
  const ai = await signIn(call, 'Moth');
  assert.equal(ai.status, 403);
  assert.equal(ai.body.error.code, 'wrong_door');
});

test('a sign-in checked against the old password gets no session once the password has changed', needsBoth, async t => {
  const gate = holdingGate();
  const {call} = await startHouse(t, {}, gate);
  const up = await signUp(call, 'Wren');
  const hold = gate.holdAfter(1); // the sign-in's password check
  const late = signIn(call, 'Wren');
  await hold.reached;
  const changed = await call('POST', '/api/me/password', {token: up.body.session.token, body: {currentPassword: 'lamplight 01', newPassword: 'porch light 2'}});
  assert.equal(changed.status, 200);
  hold.release();
  const res = await late;
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'wrong_password');
  assert.equal((await call('GET', '/api/me', {token: changed.body.session.token})).status, 200);
});

test('a password change checked against the old password cannot undo a recovery', needsBoth, async t => {
  const gate = holdingGate();
  const {call} = await startHouse(t, {}, gate);
  const up = await signUp(call, 'Wren');
  const [code] = up.body.recoveryCodes;
  const hold = gate.holdAfter(2); // the change: old password checked (1), new one hashed (2)
  const change = call('POST', '/api/me/password', {token: up.body.session.token, body: {currentPassword: 'lamplight 01', newPassword: 'taken over 3'}});
  await hold.reached;
  const back = await call('POST', '/api/recovery', {body: {username: 'Wren', code, newPassword: 'porch light 2'}});
  assert.equal(back.status, 200);
  hold.release();
  const res = await change;
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'changed_meanwhile');
  assert.equal((await call('GET', '/api/me', {token: back.body.session.token})).status, 200);
  assert.equal((await signIn(call, 'Wren', 'taken over 3')).status, 401);
  assert.equal((await signIn(call, 'Wren', 'porch light 2')).status, 201);
});

test('made-up and oversized names are turned away before the database and the limits', needsBoth, async t => {
  const {call} = await startHouse(t, {signins: {limit: 3, window: 60_000}});
  await signUp(call, 'Wren');
  for (let i = 0; i < 3; i++) await signIn(call, 'Wren', `wrong guess ${i}`);
  assert.equal((await signIn(call, 'Wren')).status, 429);
  for (let i = 0; i < 20; i++) assert.equal((await signIn(call, `nobody${i}`)).status, 401);
  assert.equal((await signIn(call, '\uFDFA'.repeat(2000))).status, 401);
  assert.equal((await call('POST', '/api/recovery', {body: {username: '\uFDFA'.repeat(2000), code: 'AAAAA-AAAAA', newPassword: 'porch light 2'}})).status, 401);
  assert.equal((await signIn(call, 'Wren')).status, 429);
});

test('re-hashing a password with newer settings does not turn other sign-ins away', needsBoth, async t => {
  const {call, pool} = await startHouse(t);
  await signUp(call, 'Wren');
  // Store a hash made with older settings, as after the settings are raised.
  const b64 = buf => buf.toString('base64').replace(/=+$/, '');
  const salt = crypto.randomBytes(16);
  const tag = crypto.argon2Sync('argon2id', {message: 'lamplight 01', nonce: salt, memory: 8192, passes: 1, parallelism: 1, tagLength: 32});
  await pool.query(`update accounts set password_hash = $1 where username_key = 'wren'`, [`$argon2id$v=19$m=8192,t=1,p=1$${b64(salt)}$${b64(tag)}`]);
  const tries = await Promise.all([1, 2, 3, 4, 5].map(() => signIn(call, 'Wren')));
  assert.deepEqual(tries.map(r => r.status), [201, 201, 201, 201, 201]);
  const {rows: [row]} = await pool.query(`select password_hash, password_version from accounts where username_key = 'wren'`);
  assert.equal(needsRehash(row.password_hash), false);
  assert.equal(row.password_version, 1);
});
