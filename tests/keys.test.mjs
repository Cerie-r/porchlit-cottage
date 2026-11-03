import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {CanaryProblem, canaryToken, checkCanary, keySecret, readKey, residentKey, residentOf, secretProblem} from '../server/keys.mjs';
import {migrate} from '../server/migrate.mjs';
import {createPool} from '../server/db.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

// A secret and an account made up for this test alone: never a real one.
const SECRET = 'test-secret-only-for-porchlit-keys';
// Signed once and kept: a key handed out before must go on working, and the same account and version must sign to
// this very string (docs/ACCOUNTS.md, 固定样本测试). Checked against an HMAC worked out apart from this code.
const SAMPLE = 'pck_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2UiOiJyZXNpZGVudCIsInN1YiI6IjQyIiwidmVyIjoxfQ.TUfs8iaJl5WJMsUzwjy2XRREdUH5yqbwGcaFBucbk2Q';

const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const signed = (header, claims, secret = SECRET) => {
  const head = b64(header), body = b64(claims);
  return `pck_${head}.${body}.${crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`;
};

test('a key is the same string every time, and the one handed out before still works', () => {
  assert.equal(residentKey(SECRET, 42, 1), SAMPLE);
  assert.equal(residentKey(SECRET, '42', 1), SAMPLE);
  assert.deepEqual(residentOf(SECRET, SAMPLE), {accountId: '42', version: 1});
  assert.notEqual(residentKey(SECRET, 42, 2), SAMPLE);
  assert.deepEqual(residentOf(SECRET, residentKey(SECRET, 42, 2)), {accountId: '42', version: 2});
  // Nothing about time or the home is in it.
  assert.deepEqual(Object.keys(JSON.parse(Buffer.from(SAMPLE.split('.')[1], 'base64url'))), ['use', 'sub', 'ver']);
});

test('only HS256, only this secret, only these claims', () => {
  assert.equal(residentOf('another-secret-of-twenty-chars', SAMPLE), null);
  for (const alg of ['none', 'HS512', 'RS256', 'hs256']) assert.equal(readKey(SECRET, signed({alg, typ: 'JWT'}, {use: 'resident', sub: '42', ver: 1})), null, alg);
  const [head, body] = SAMPLE.slice(4).split('.');
  assert.equal(readKey(SECRET, `pck_${head}.${body}.`), null, 'no signature');
  assert.equal(readKey(SECRET, `pck_${head}.${b64({use: 'resident', sub: '43', ver: 1})}.${SAMPLE.split('.')[2]}`), null, 'claims changed');
  assert.equal(readKey(SECRET, SAMPLE.slice(4)), null, 'no prefix');
  assert.equal(readKey(SECRET, SAMPLE + 'x'), null);
  assert.equal(readKey(SECRET, 'pck_' + 'a'.repeat(600)), null);
  for (const claims of [{use: 'resident', sub: 42, ver: 1}, {use: 'resident', sub: '42', ver: 0}, {use: 'resident', sub: '42', ver: '1'}, {use: 'resident', sub: '042', ver: 1}]) {
    assert.equal(residentOf(SECRET, signed({alg: 'HS256', typ: 'JWT'}, claims)), null, JSON.stringify(claims));
  }
  // Another typ, or none, is fine: only the algorithm and the signature matter.
  assert.deepEqual(residentOf(SECRET, signed({alg: 'HS256'}, {use: 'resident', sub: '7', ver: 3})), {accountId: '7', version: 3});
  // The canary is signed by the same secret but is nobody's key.
  assert.equal(readKey(SECRET, canaryToken(SECRET)).use, 'canary');
  assert.equal(residentOf(SECRET, canaryToken(SECRET)), null);
  assert.equal(residentOf(null, SAMPLE), null);
});

test('the secret comes from PORCHLIT_KEY_SECRET, long enough to be one', () => {
  assert.equal(keySecret({}), null);
  assert.equal(secretProblem({}), null);
  assert.equal(keySecret({PORCHLIT_KEY_SECRET: 'short'}), null);
  assert.match(secretProblem({PORCHLIT_KEY_SECRET: 'short'}), /shorter/);
  assert.equal(keySecret({PORCHLIT_KEY_SECRET: `  ${SECRET}\n`}), SECRET);
});

test('the canary: signed once, then only checked; never signed again by itself', needsDatabase, async t => {
  const db = await freshDatabase(t);
  const pool = db.pool();
  await migrate(pool);
  // Two processes starting at once: one signs it, the other finds it signed.
  assert.deepEqual((await Promise.all([checkCanary(pool, SECRET), checkCanary(pool, SECRET)])).sort(), ['ok', 'written']);
  assert.equal(await checkCanary(pool, SECRET), 'ok');
  const {rows: [kept]} = await pool.query('select token from key_canary');
  // Another secret stops it, and nothing is written over.
  await assert.rejects(checkCanary(pool, 'a-different-secret-entirely'), err => err instanceof CanaryProblem && err.code === 'changed');
  assert.equal((await pool.query('select token from key_canary')).rows[0].token, kept.token);
  // A missing row isn't taken for a first time.
  await pool.query('delete from key_canary');
  await assert.rejects(checkCanary(pool, SECRET), err => err instanceof CanaryProblem && err.code === 'missing');
  assert.equal((await pool.query('select count(*)::int as n from key_canary')).rows[0].n, 0);
  // A database that can't be reached is said to be that, not a changed secret.
  const down = createPool({connectionString: 'postgres://nobody@127.0.0.1:1/none', ssl: false, max: 1}, {connectTimeout: 1000});
  t.after(() => down.end());
  await assert.rejects(checkCanary(down, SECRET), err => !(err instanceof CanaryProblem));
});
