import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {oursAccounts} from '../server/ours.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

// A stand-in for Argon2, which older Node doesn't have: what is tested here is the spare keys, not the hashing.
const HASHING = {available: true, hash: async p => 'test$' + p, verify: async (h, p) => h === 'test$' + p, stale: () => false};

test('a fresh set of spare keys, for the password once more: the old ones left stop working', needsDatabase, async t => {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const server = createServer({db: {pool, migrations: await loadMigrations()}, api: createApi({pool, ours: oursAccounts(''), hashing: HASHING, limits: {signups: {size: 100, every: 1}}})});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, {token, body} = {}) => {
    const res = await fetch(base + path, {method, headers: {...(token ? {Authorization: 'Bearer ' + token} : {}), ...(body ? {'Content-Type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined});
    return {status: res.status, body: res.status === 204 ? null : await res.json()};
  };
  const joined = (await call('POST', '/api/accounts', {body: {username: 'Fern', password: 'secret', adult: true}})).body;
  const first = joined.recoveryCodes, token = joined.session.token;
  // One used up first: it stays used.
  const recovered = await call('POST', '/api/recovery', {body: {username: 'Fern', code: first[0], newPassword: 'secret'}});
  assert.equal(recovered.status, 200);
  const session = recovered.body.session.token;
  assert.equal((await call('POST', '/api/me/recovery-codes', {body: {currentPassword: 'secret'}})).status, 401);
  assert.equal((await call('POST', '/api/me/recovery-codes', {token: session, body: {currentPassword: 'wrong!'}})).body.error.code, 'wrong_password');
  assert.equal((await call('POST', '/api/me/recovery-codes', {token, body: {currentPassword: 'secret'}})).status, 401, 'the session from before the recovery is over');
  const renewed = await call('POST', '/api/me/recovery-codes', {token: session, body: {currentPassword: 'secret'}});
  assert.equal(renewed.status, 201);
  const fresh = renewed.body.recoveryCodes;
  assert.equal(fresh.length, 10);
  assert.equal(renewed.body.recoveryCodesLeft, 10);
  for (const code of fresh) assert.match(code, /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
  assert.ok(!fresh.some(code => first.includes(code)));
  assert.equal((await call('GET', '/api/me', {token: session})).body.recoveryCodesLeft, 10);
  // An old one no longer opens the door; a new one does.
  assert.equal((await call('POST', '/api/recovery', {body: {username: 'Fern', code: first[1], newPassword: 'secret'}})).body.error.code, 'wrong_code');
  const back = await call('POST', '/api/recovery', {body: {username: 'Fern', code: fresh[0], newPassword: 'secret'}});
  assert.equal(back.status, 200);
  assert.equal(back.body.recoveryCodesLeft, 9);
});
