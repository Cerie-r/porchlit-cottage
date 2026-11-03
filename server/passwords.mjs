import crypto from 'node:crypto';
import {promisify} from 'node:util';

// Argon2id at OWASP's lowest recommended setting: 19 MiB, 2 passes, 1 lane.
// Built into Node from 24.7; on older Node the account routes say so.
export const ARGON2 = {memory: 19456, passes: 2, parallelism: 1, tagLength: 32};
export const hashingAvailable = typeof crypto.argon2 === 'function';
const argon2 = hashingAvailable ? promisify(crypto.argon2) : null;

export class Busy extends Error {
  constructor() {
    super('password hashing is busy');
  }
}

// One hash at a time for the whole process (sign-up, sign-in, password change
// and recovery share it): each takes 19 MiB and a libuv thread, and the
// thread pool is shared with file and DNS work. A few more may wait in line;
// past that the caller is told to try again shortly.
export function createGate({waiting = 8} = {}) {
  let running = false;
  const queue = [];
  const next = () => {
    const resume = queue.shift();
    if (resume) resume();
    else running = false;
  };
  return async function gate(task) {
    if (running) {
      if (queue.length >= waiting) throw new Busy();
      await new Promise(resolve => queue.push(resolve));
    } else {
      running = true;
    }
    try {
      return await task();
    } finally {
      next();
    }
  };
}

const b64 = buf => buf.toString('base64').replace(/=+$/, '');
const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

// Stored as a PHC string, so the settings travel with each hash and can be
// raised later without breaking older ones.
export async function hashPassword(password, gate) {
  const salt = crypto.randomBytes(16);
  const tag = await gate(() => argon2('argon2id', {message: password, nonce: salt, ...ARGON2}));
  return `$argon2id$v=19$m=${ARGON2.memory},t=${ARGON2.passes},p=${ARGON2.parallelism}$${b64(salt)}$${b64(tag)}`;
}

export async function verifyPassword(stored, password, gate) {
  const m = PHC.exec(stored ?? '');
  if (!m) return false;
  const [, memory, passes, parallelism, salt, hash] = m;
  const expected = Buffer.from(hash, 'base64');
  const tag = await gate(() => argon2('argon2id', {
    message: password,
    nonce: Buffer.from(salt, 'base64'),
    memory: Number(memory),
    passes: Number(passes),
    parallelism: Number(parallelism),
    tagLength: expected.length
  }));
  return crypto.timingSafeEqual(tag, expected);
}

// True when a hash was made with older settings and should be redone the
// next time the password is known to be right.
export function needsRehash(stored) {
  const m = PHC.exec(stored ?? '');
  return !m || Number(m[1]) !== ARGON2.memory || Number(m[2]) !== ARGON2.passes || Number(m[3]) !== ARGON2.parallelism;
}

// The hashing the account doors use: Argon2 as above. Tests stand another in where Node has no Argon2.
export const ARGON2_HASHING = {available: hashingAvailable, hash: hashPassword, verify: verifyPassword, stale: needsRehash};
