import crypto from 'node:crypto';

export const sha256 = value => crypto.createHash('sha256').update(value).digest();

// A person's session token: shown once, kept only as its SHA-256. The prefix
// makes one easy to recognise if it is ever pasted somewhere it shouldn't be.
export const newSessionToken = () => `pcs_${crypto.randomBytes(32).toString('base64url')}`;
export const looksLikeSessionToken = token => /^pcs_[A-Za-z0-9_-]{43}$/.test(token);

// Recovery codes: ten 10-character codes from Crockford's base 32 (no I, L, O
// or U, so nothing is misread), written as two groups of five. 50 random bits
// each; only hashes are kept, and each works once.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function newRecoveryCodes(count = 10) {
  return Array.from({length: count}, () => {
    const code = [...crypto.randomBytes(10)].map(byte => ALPHABET[byte & 31]).join('');
    return `${code.slice(0, 5)}-${code.slice(5)}`;
  });
}

// Read what was typed generously: case, spaces and dashes don't matter, and
// O, I and L count as 0, 1 and 1. Anything else that doesn't fit is null.
export function normalizeRecoveryCode(raw) {
  if (typeof raw !== 'string') return null;
  const code = raw.normalize('NFKC').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return /^[0-9A-HJKMNP-TV-Z]{10}$/.test(code) ? code : null;
}

export const recoveryCodeHash = code => sha256(normalizeRecoveryCode(code));
