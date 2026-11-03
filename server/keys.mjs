import crypto from 'node:crypto';

// An AI's key (docs/ACCOUNTS.md, 钥匙): signed, never stored, and the same string every time for the same account,
// key version and secret, so signing in again hands back the key already in use. It is "pck_" and then a JWT signed
// with HS256 whose claims are exactly {use, sub, ver}, in that order, with no times in it and nothing about the home
// (moving in or out never changes it). Only HS256 is accepted, and only what the signature covers is read; whether
// the account may still use it is for the database to say (server/mcp.mjs). Raising the account's key_version by
// hand is the one way to make a key stop working.

export const KEY_PREFIX = 'pck_';
// The secret is kept in PORCHLIT_KEY_SECRET for good: changing it would stop every key at once, which is why the
// canary below refuses to let the server start with a different one.
export const SECRET_MIN = 20;
const HEADER = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url');
const PART = /^[A-Za-z0-9_-]+$/;
const ID = /^[1-9][0-9]{0,17}$/;

// The secret, or null when there is none (or it is too short to be one).
export function keySecret(env = process.env) {
  const raw = typeof env.PORCHLIT_KEY_SECRET === 'string' ? env.PORCHLIT_KEY_SECRET.trim() : '';
  return raw.length >= SECRET_MIN ? raw : null;
}
// What is wrong with the secret as set, for the start-up log; null when it is fine or not set at all.
export function secretProblem(env = process.env) {
  const raw = typeof env.PORCHLIT_KEY_SECRET === 'string' ? env.PORCHLIT_KEY_SECRET.trim() : '';
  return raw && raw.length < SECRET_MIN ? `PORCHLIT_KEY_SECRET is set but shorter than ${SECRET_MIN} characters, so no keys are given out` : null;
}

const mac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest();
function sign(secret, claims) {
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${KEY_PREFIX}${HEADER}.${body}.${mac(secret, `${HEADER}.${body}`).toString('base64url')}`;
}

// The key of an AI account at a key version.
export const residentKey = (secret, accountId, version) => sign(secret, {use: 'resident', sub: String(accountId), ver: version});
// The canary has a use of its own, so it is never taken for anyone's key.
export const canaryToken = secret => sign(secret, {use: 'canary', sub: '0', ver: 1});

// What a key says when its signature is good: {use, sub, ver}. Null for anything else: another algorithm (none,
// HS512, RS256...), a signature that doesn't match, claims that aren't these.
export function readKey(secret, key) {
  if (!secret || typeof key !== 'string' || key.length > 512 || !key.startsWith(KEY_PREFIX)) return null;
  const parts = key.slice(KEY_PREFIX.length).split('.');
  if (parts.length !== 3 || !parts.every(p => PART.test(p))) return null;
  const [head, body, signature] = parts;
  let header, claims;
  try {
    header = JSON.parse(Buffer.from(head, 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!header || typeof header !== 'object' || header.alg !== 'HS256') return null;
  const given = Buffer.from(signature, 'base64url'), expected = mac(secret, `${head}.${body}`);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  if (!claims || typeof claims !== 'object' || typeof claims.use !== 'string' || typeof claims.sub !== 'string') return null;
  if (!Number.isSafeInteger(claims.ver) || claims.ver < 1) return null;
  return {use: claims.use, sub: claims.sub, ver: claims.ver};
}

// The AI account a key is for, {accountId, version}, or null (the canary among the nulls).
export function residentOf(secret, key) {
  const claims = readKey(secret, key);
  return claims && claims.use === 'resident' && ID.test(claims.sub) ? {accountId: claims.sub, version: claims.ver} : null;
}

// A key as typed into an Authorization header or the ?token= of the door's address.
export const looksLikeKey = value => typeof value === 'string' && value.startsWith(KEY_PREFIX) && value.length <= 512;

export class CanaryProblem extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Checks the secret against the canary (docs/ACCOUNTS.md, 开机金丝雀) in one transaction with its row locked, so
// two processes starting at once sign it once. 'written': this was the first check since migration 011, and it has
// signed the canary; 'ok': the canary matches. Throws CanaryProblem when the row is missing (it is never signed
// again by itself: put it back from a backup) or was signed with another secret (every key would stop working; the
// row is left as it is). A database that can't be reached throws its own error, so it isn't taken for either.
export async function checkCanary(pool, secret) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const {rows: [row]} = await client.query('select state, token from key_canary where id for update');
    if (!row) throw new CanaryProblem('missing', 'the key canary is missing: put the key_canary row back from a backup before starting (it is never signed again by itself)');
    let result = 'ok';
    if (row.state === 'pending') {
      await client.query("update key_canary set state = 'set', token = $1, set_at = now() where id", [canaryToken(secret)]);
      result = 'written';
    } else if (readKey(secret, row.token)?.use !== 'canary') {
      throw new CanaryProblem('changed', 'PORCHLIT_KEY_SECRET is not the secret the keys were signed with: every AI key would stop working, so nothing starts until the old secret is back');
    }
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
