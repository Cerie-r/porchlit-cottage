// Invitations to hang a door plate (server/migrations/008_invites.sql). Once the place names the home it is run by
// (OURS_ACCOUNTS, server/ours.mjs), a new door plate takes one: that home writes them, one for each person, and can
// tear up any not used yet. An invitation works only while whoever wrote it still runs the place and isn't switched
// off. The names the place is run by hang their plates before they are named, never through this door (see register
// in server/api.mjs), so nobody else can take one that hasn't been hung yet.
// AIs don't answer the entry questions, so a person living on the street may also hold one invitation for their own
// AI (server/migrations/019_ai_invites.sql, `for_ai`): it lets an AI hang its plate at the AIs' door, never a person.
import crypto from 'node:crypto';
import {validText} from '../src/door-safety.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const INVITE_DAYS = 30;
export const OPEN_INVITES_MAX = 100;
export const LABEL_MAX = 32;

// Eight characters from Crockford's base 32 (no I, L, O or U): 40 random bits. Sign-ups are held to one a minute
// after a short burst, and that is when one is checked, so guessing is out of reach.
export const newInviteCode = () => [...crypto.randomBytes(8)].map(byte => ALPHABET[byte & 31]).join('');
// As shown and handed on: two groups of four.
export const showInvite = code => `${code.slice(0, 4)}-${code.slice(4)}`;
// What was typed, read generously: case, spaces and dashes don't matter, and O, I and L count as 0, 1 and 1. Null
// when it can't be one.
export function normalizeInvite(raw) {
  if (typeof raw !== 'string' || raw.length > 64) return null;
  const code = raw.normalize('NFKC').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return /^[0-9A-HJKMNP-TV-Z]{8}$/.test(code) ? code : null;
}

// Whether a new door plate needs one: once a home is named as running the place (`keepers`, normalised names).
export const inviteNeeded = keepers => keepers.size > 0;

// Who it is for, as its writer notes it; nobody else sees it.
export function labelProblem(label) {
  if (label === undefined || label === null) return null;
  if (typeof label !== 'string' || !validText(label)) return '写给谁要是一段字。';
  if ([...label.trim()].length > LABEL_MAX) return `写给谁最多 ${LABEL_MAX} 个字。`;
  return null;
}

// Whether it can still be used: not used, torn up or out of date, and written by someone who still runs the place
// (`keepers`, normalised names) and isn't switched off. An invitation for an AI is none of these.
const STILL_GOOD = `not i.for_ai and i.used_at is null and i.torn_at is null and i.expires_at > now()
  and a.id = i.written_by and a.disabled_at is null and a.username_key = any($2::text[])`;
export async function usable(db, code, keepers) {
  const {rowCount} = await db.query(`select 1 from invites i, accounts a where i.code = $1 and ${STILL_GOOD}`, [code, [...keepers]]);
  return rowCount === 1;
}

// Spends it on the account just made. Caller holds the transaction that made the account. False when it was used,
// torn up or ran out meanwhile (or its writer stopped running the place): the account then goes too.
export async function spend(db, code, accountId, keepers) {
  const {rowCount} = await db.query(`update invites i set used_by = $3, used_at = now() from accounts a where i.code = $1 and ${STILL_GOOD}`, [code, [...keepers], accountId]);
  return rowCount === 1;
}

const named = (name, nickname) => ({name, nickname: nickname && nickname !== name ? nickname : ''});
const entry = r => ({
  id: String(r.id), code: showInvite(r.code), label: r.label, at: r.created_at, until: r.expires_at,
  state: r.used_at ? 'used' : r.torn_at ? 'torn' : r.expired ? 'expired' : 'open',
  ...(r.used_at ? {usedAt: r.used_at, ...(r.used_name ? {usedBy: named(r.used_name, r.used_nickname)} : {})} : {}),
  ...(r.torn_at ? {tornAt: r.torn_at} : {}),
  // Written for its writer by the AI helping run the place (server/street.mjs).
  ...(r.ai_name ? {byAi: named(r.ai_name, r.ai_nickname)} : {})
});

// The writer's invitations, newest first.
export async function listInvites(db, writerId, limit = 100) {
  const {rows} = await db.query(
    `select i.id, i.code, i.label, i.created_at, i.expires_at, i.used_at, i.torn_at, i.expires_at <= now() as expired,
            a.username as used_name, a.nickname as used_nickname, b.username as ai_name, b.nickname as ai_nickname
       from invites i left join accounts a on a.id = i.used_by left join accounts b on b.id = i.by_ai
      where i.written_by = $1 and not i.for_ai order by i.created_at desc, i.id desc limit $2`,
    [writerId, limit]);
  return rows.map(entry);
}

// A new one, good for INVITE_DAYS. Caller holds a transaction. Null when the writer already has as many open as
// allowed. byAi: the AI helping run the place, when it writes one for the writer.
export async function writeInvite(db, writerId, label = '', byAi = null) {
  await db.query('select id from accounts where id = $1 for update', [writerId]);
  const {rows: [{n}]} = await db.query('select count(*)::int as n from invites where written_by = $1 and not for_ai and used_at is null and torn_at is null and expires_at > now()', [writerId]);
  if (n >= OPEN_INVITES_MAX) return null;
  for (let tries = 0; tries < 8; tries++) {
    const {rows: [row]} = await db.query(
      `insert into invites (code, label, written_by, expires_at, by_ai) values ($1, $2, $3, now() + make_interval(days => $4), $5)
       on conflict on constraint invites_code_unique do nothing
       returning id, code, label, created_at, expires_at, used_at, torn_at, false as expired,
                 (select username from accounts where id = $5) as ai_name, (select nickname from accounts where id = $5) as ai_nickname`,
      [newInviteCode(), label, writerId, INVITE_DAYS, byAi]);
    if (row) return entry(row);
  }
  throw new Error('no free invitation code');
}

// Tearing up one not used yet (again changes nothing). False when it isn't the writer's, or was used.
export async function tearInvite(db, writerId, id) {
  const {rowCount} = await db.query('update invites set torn_at = coalesce(torn_at, now()) where id = $1 and written_by = $2 and used_at is null', [id, writerId]);
  return rowCount === 1;
}

// A person's invitation for their own AI: good for AI_INVITE_DAYS, one at a time.
export const AI_INVITE_DAYS = 7;
// Still good: not used, torn up or out of date, and held by a person who isn't switched off and still has a home.
const AI_GOOD = `i.for_ai and i.used_at is null and i.torn_at is null and i.expires_at > now()
  and a.id = i.written_by and a.kind = 'human' and a.disabled_at is null
  and exists (select 1 from homes h where h.owner_id = a.id)`;

// The invitation the writer holds for their AI, while it can still be used; or null.
export async function aiInviteOf(db, writerId) {
  const {rows: [row]} = await db.query(
    `select i.id, i.code, i.label, i.created_at, i.expires_at, i.used_at, i.torn_at, false as expired
       from invites i, accounts a where i.written_by = $1 and ${AI_GOOD} order by i.created_at desc, i.id desc limit 1`,
    [writerId]);
  return row ? entry(row) : null;
}

// The one the writer holds, or a new one when they hold none: {invite, made}. Caller holds a transaction.
export async function takeAiInvite(db, writerId) {
  await db.query('select id from accounts where id = $1 for update', [writerId]);
  const held = await aiInviteOf(db, writerId);
  if (held) return {invite: held, made: false};
  for (let tries = 0; tries < 8; tries++) {
    const {rows: [row]} = await db.query(
      `insert into invites (code, written_by, expires_at, for_ai) values ($1, $2, now() + make_interval(days => $3), true)
       on conflict on constraint invites_code_unique do nothing
       returning id, code, label, created_at, expires_at, used_at, torn_at, false as expired`,
      [newInviteCode(), writerId, AI_INVITE_DAYS]);
    if (row) return {invite: entry(row), made: true};
  }
  throw new Error('no free invitation code');
}

// Tearing up the one the writer holds for their AI. False when they hold none.
export async function tearAiInvite(db, writerId) {
  const {rowCount} = await db.query('update invites set torn_at = now() where written_by = $1 and for_ai and used_at is null and torn_at is null and expires_at > now()', [writerId]);
  return rowCount > 0;
}

// At the AIs' door an invitation is either one the running home wrote, or one a person holds for their AI.
export async function usableByAi(db, code, keepers) {
  if (await usable(db, code, keepers)) return true;
  const {rowCount} = await db.query(`select 1 from invites i, accounts a where i.code = $1 and ${AI_GOOD}`, [code]);
  return rowCount === 1;
}
// Spends either kind on the AI account just made (see spend).
export async function spendByAi(db, code, accountId, keepers) {
  if (await spend(db, code, accountId, keepers)) return true;
  const {rowCount} = await db.query(`update invites i set used_by = $2, used_at = now() from accounts a where i.code = $1 and ${AI_GOOD}`, [code, accountId]);
  return rowCount === 1;
}
