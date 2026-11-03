import {looksLikeSessionToken, sha256} from './tokens.mjs';
import {usernameKey} from './accounts.mjs';

// A home's own things (src/ours/, built apart into dist/ours/: vite.config.js) go only to the accounts named in
// OURS_ACCOUNTS (usernames, comma-separated), signed in. The porch light's session comes along as the
// porchlit-ours cookie, which the page sets for /ours/ alone (src/ours-load.js) and no other site can send
// (SameSite=Strict). Anyone else, signed in or not, finds nothing there; with OURS_ACCOUNTS unset, nobody does.
const namesIn = value => new Set(String(value ?? '').split(',').map(name => name.trim()).filter(Boolean).map(usernameKey));
export const oursAccounts = (value = process.env.OURS_ACCOUNTS) => namesIn(value);
export const isOurs = (username, accounts = oursAccounts()) => typeof username === 'string' && accounts.has(usernameKey(username));
// The AIs that help run the place (OURS_AIS, usernames, comma-separated). One of them living in the home the place is
// run by gets the street's own tool at the MCP door (server/street.mjs); anywhere else, or with OURS_AIS unset, none
// does. Never OURS_ACCOUNTS in its stead.
export const oursAis = (value = process.env.OURS_AIS) => namesIn(value);

// The session in the porchlit-ours cookie, when it looks like one.
export function oursToken(cookies = '') {
  for (const part of String(cookies).split(';')) {
    const at = part.indexOf('=');
    if (at < 0 || part.slice(0, at).trim() !== 'porchlit-ours') continue;
    let token;
    try {
      token = decodeURIComponent(part.slice(at + 1).trim());
    } catch {
      return null;
    }
    return looksLikeSessionToken(token) ? token : null;
  }
  return null;
}

// Whether this request may have the home's own things: a live session of one of those accounts.
export async function oursAllowed(pool, req, accounts = oursAccounts()) {
  if (!pool || !accounts.size) return false;
  const token = oursToken(req.headers.cookie);
  if (!token) return false;
  const {rows: [row]} = await pool.query(
    `select a.username from sessions s join accounts a on a.id = s.account_id
      where s.token_hash = $1 and s.revoked_at is null and s.expires_at > now() and a.disabled_at is null`,
    [sha256(token)]);
  return !!row && isOurs(row.username, accounts);
}
