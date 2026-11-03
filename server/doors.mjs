// At someone's door (server/migrations/004_doors.sql): a knock, or something
// left in the mailbox, and the owner taking it in or not. Only a door whose
// light is on takes either; nobody knocks at their own. A visitor knocks at a
// home once a day and leaves something there once a day. What is left is a
// copy of a thing from the visitor's backpack (the visitor's page takes it
// out of their own backpack), with a short note, or a note alone. The owner's
// page and server share the same bounded recipe checker. A receipt stays
// pending until the home document containing it has been saved.

import {createHash} from 'node:crypto';
import {checkGift, GIFT_KINDS, NOTE_MAX} from '../src/door-gifts.js';
import {safePayload, validText, SMALL_GIFT_LIMIT, PHOTO_LIMIT} from '../src/door-safety.js';
export {GIFT_KINDS, NOTE_MAX};
export const ITEM_LIMIT = PHOTO_LIMIT;
export const BOOK_MAX = 60;
export const WAITING_MAX = 30;
export class DoorProblem extends Error {
  constructor(code, message, status = 409) { super(message); this.code = code; this.status = status; }
}

const DAY = 86400000;

// A calendar day ("2026-10-24") within a day of the server's own: everyone's
// today, wherever they live.
export function dayProblem(day, now = Date.now()) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return '日期不对。';
  const t = Date.parse(day + 'T12:00:00Z');
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== day) return '日期不对。';
  return Math.abs(t - now) <= 1.5 * DAY ? null : '日期不对。';
}

export function noteProblem(note) {
  if (note === undefined || note === null) return null;
  if (!validText(note)) return '纸条要是一段字。';
  const text = note.trim();
  if (!text) return null;
  if ([...text].length > NOTE_MAX) return `纸条最多 ${NOTE_MAX} 个字。`;
  return null;
}
export const cleanNote = note => typeof note === 'string' && note.trim() ? note.trim() : null;

export function itemProblem(item) {
  if (item === undefined || item === null) return null;
  if (!safePayload(item, item?.kind === 'photo' ? PHOTO_LIMIT : SMALL_GIFT_LIMIT)) return '这样东西太大了，或者内容读不懂。';
  return checkGift(item) ? null : '这样东西不能放进邮箱。';
}
export const cleanItem = item => checkGift(item);
export const requestProblem = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? null : '这次投递的编号不对。';

const named = row => ({name: row.visitor_name, nickname: row.visitor_nickname && row.visitor_nickname !== row.visitor_name ? row.visitor_nickname : ''});

// The door at (street, lot) as a visitor finds it, or null when there is no
// home there (or its owner is gone). To someone the owner has blocked there is
// no home there either.
export async function findDoor(db, street, lot, viewerId = null) {
  const {rows: [row]} = await db.query(
    `select h.id, h.owner_id, h.porch, a.username, a.nickname
       from homes h join accounts a on a.id = h.owner_id
      where h.street_id = $1 and h.lot = $2 and a.disabled_at is null
        and not exists (select 1 from door_blocks b where b.home_id = h.id and b.blocked_id = $3::bigint)`,
    [street, lot, viewerId]);
  return row || null;
}

// What this visitor has done at this door today.
export async function doneToday(db, homeId, visitorId, day) {
  const {rows} = await db.query("select kind from door_visits where home_id = $1 and visitor_id = $2 and (day = $3 or created_at > now() - interval '20 hours')", [homeId, visitorId, day]);
  return {knocked: rows.some(r => r.kind === 'knock'), left: rows.some(r => r.kind === 'mail')};
}

// A knock or something left. Returns false when this visitor already did it
// at this door today.
const mailHash = (homeId, kind, note, item) => createHash('sha256').update(JSON.stringify({homeId: String(homeId), kind, note, item})).digest('hex');
export async function mailRetry(db, visitorId, requestId, homeId, note, item) {
  const {rows: [old]} = await db.query('select request_hash from door_visits where visitor_id = $1 and request_id = $2', [visitorId, requestId]);
  if (!old) return false;
  if (old.request_hash !== mailHash(homeId, 'mail', note, item)) throw new DoorProblem('request_changed', '这次投递的内容变了，请先确认上一份。');
  return true;
}

// Caller holds a transaction. The home row serializes capacity and rolling limits.
export async function visit(db, {homeId, visitor, kind, day, note = null, item = null, requestId = null}) {
  await db.query('select id from homes where id = $1 for update', [homeId]);
  // Blocked while on the way to the door: the same as finding no door.
  const {rowCount: barred} = await db.query('select 1 from door_blocks where home_id = $1 and blocked_id = $2', [homeId, visitor.id]);
  if (barred) throw new DoorProblem('not_found', '这里是一块空地。', 404);
  const hash = mailHash(homeId, kind, note, item);
  if (requestId) {
    const {rows: [old]} = await db.query('select request_hash from door_visits where visitor_id = $1 and request_id = $2', [visitor.id, requestId]);
    if (old) {
      if (old.request_hash !== hash) throw new DoorProblem('request_changed', '这次投递的内容变了，请先确认上一份。');
      return true;
    }
  }
  const done = await doneToday(db, homeId, visitor.id, day);
  if (kind === 'mail' ? done.left : done.knocked) return false;
  // Resolved parcels lose their bulky content, but the guestbook and retry receipts remain.
  await db.query("update door_visits set item = null where home_id = $1 and status = 'taken' and delivered_at < now() - interval '30 days' and item is not null", [homeId]);
  await db.query("delete from door_visits where home_id = $1 and kind = 'knock' and status = 'seen' and created_at < now() - interval '90 days'", [homeId]);
  const {rows: [{n}]} = await db.query("select count(*)::int as n from door_visits v where home_id = $1 and (status = 'waiting' or (status = 'taken' and delivered_at is null)) and exists (select 1 from accounts a where a.id = v.visitor_id and a.disabled_at is null)", [homeId]);
  if (n >= WAITING_MAX) throw new DoorProblem('mailbox_full', '门口放满了，等主人收一收再来。');
  const {rowCount} = await db.query(
    `insert into door_visits (home_id, visitor_id, kind, day, visitor_name, visitor_nickname, note, item, item_kind, item_name, request_id, request_hash)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict do nothing`,
    [homeId, visitor.id, kind, day, visitor.username, visitor.nickname || '', note, item, item?.kind ?? null, item?.name ?? null, requestId, hash]);
  return rowCount === 1;
}

// The owner's side: what is waiting at the door (things left, and knocks not
// seen yet), and the guestbook (the newest visits of all kinds).
export async function loadDoor(db, homeId) {
  const {rows} = await db.query(
    `select id, kind, to_char(day, 'YYYY-MM-DD') as day, visitor_name, visitor_nickname, note, item_kind, item_name, status, created_at,
            exists (select 1 from door_blocks b where b.home_id = v.home_id and b.blocked_id = v.visitor_id) as blocked,
            exists (select 1 from reports r where r.visit_id = v.id) as reported
       from door_visits v where home_id = $1 and exists (select 1 from accounts a where a.id = v.visitor_id and a.disabled_at is null) order by created_at desc, id desc limit $2`,
    [homeId, BOOK_MAX]);
  const {rows: waiting} = await db.query(
    `select id, kind, to_char(day, 'YYYY-MM-DD') as day, visitor_name, visitor_nickname, note, item, status, created_at
       from door_visits v where home_id = $1 and (status = 'waiting' or (status = 'taken' and delivered_at is null)) and exists (select 1 from accounts a where a.id = v.visitor_id and a.disabled_at is null) order by created_at, id limit 30`,
    [homeId]);
  // The day comes as the text it was saved as: read as a date, it would be midnight where the server is, and a
  // day early once turned to UTC on a server east of Greenwich.
  const entry = (r, withItem) => ({
    id: String(r.id), kind: r.kind, day: r.day, at: r.created_at,
    from: named(r), status: r.status,
    ...(r.note ? {note: r.note} : {}),
    ...(withItem && r.item ? {item: r.item} : !withItem && r.item_name ? {itemKind: r.item_kind, itemName: r.item_name} : {}),
    ...(withItem ? {} : {blocked: !!r.blocked}),
    ...(r.reported ? {reported: true} : {})
  });
  const {rows: blocked} = await db.query(
    `select b.id, b.created_at, a.username, a.nickname
       from door_blocks b join accounts a on a.id = b.blocked_id
      where b.home_id = $1 and a.disabled_at is null order by b.created_at desc, b.id desc limit 200`,
    [homeId]);
  return {waiting: waiting.map(r => entry(r, true)), book: rows.map(r => entry(r, false)), blocked: blocked.map(blockedEntry)};
}

// Someone the owner has blocked, with the names their account has now.
const blockedEntry = b => ({id: String(b.id), name: b.username, nickname: b.nickname && b.nickname !== b.username ? b.nickname : '', since: b.created_at});

// The owner blocks whoever made this visit to their door: from now on that
// person finds an empty lot where the home is, whatever they left waiting is
// turned away (emptied, as when it isn't taken in), and their knocks count as
// seen. Blocking someone already blocked changes nothing. Caller holds a
// transaction. Returns the entry, or null when the visit isn't this home's.
export async function block(db, homeId, visitId) {
  await db.query('select id from homes where id = $1 for update', [homeId]);
  const {rows: [v]} = await db.query('select visitor_id from door_visits where id = $1 and home_id = $2', [visitId, homeId]);
  if (!v) return null;
  return blockAccount(db, homeId, v.visitor_id);
}

// The same for an account, however the owner came by it (reporting a home met on the street blocks it too: see
// server/reports.mjs). Caller holds a transaction with the home row locked. Returns the entry.
export async function blockAccount(db, homeId, accountId) {
  await db.query('insert into door_blocks (home_id, blocked_id) values ($1, $2) on conflict on constraint door_blocks_once do nothing', [homeId, accountId]);
  await db.query(`update door_visits set status = 'declined', decided_at = now(), item = null, note = null where home_id = $1 and visitor_id = $2 and kind = 'mail' and status = 'waiting'`, [homeId, accountId]);
  await db.query(`update door_visits set status = 'seen', decided_at = now() where home_id = $1 and visitor_id = $2 and kind = 'knock' and status = 'waiting'`, [homeId, accountId]);
  const {rows: [b]} = await db.query('select b.id, b.created_at, a.username, a.nickname from door_blocks b join accounts a on a.id = b.blocked_id where b.home_id = $1 and b.blocked_id = $2', [homeId, accountId]);
  return blockedEntry(b);
}

// Taking a name off the list. Returns false when it isn't on this home's list.
export async function unblock(db, homeId, blockId) {
  const {rowCount} = await db.query('delete from door_blocks where id = $1 and home_id = $2', [blockId, homeId]);
  return rowCount === 1;
}

// The owner takes in or turns away something left, or marks the knocks
// seen. Taking in again what was already taken gives it back again, so a page
// that lost the answer can ask once more. Returns the visit, or null when it
// isn't this home's.
export async function decide(db, homeId, id, take) {
  const {rows: [row]} = await db.query(
    `select id, kind, status, item, note, visitor_name, visitor_nickname, day, delivered_at from door_visits
      where id = $1 and home_id = $2 and kind = 'mail' and exists (select 1 from accounts a where a.id = door_visits.visitor_id and a.disabled_at is null) for update`,
    [id, homeId]);
  if (!row) return null;
  if (take && (noteProblem(row.note) || row.item && !checkGift(row.item))) throw new DoorProblem('invalid_gift', '这样东西读不出来，可以选择不收。');
  if (row.status === 'waiting') {
    await db.query(`update door_visits set status = $2, decided_at = now(), item = case when $2 = 'declined' then null else item end, note = case when $2 = 'declined' then null else note end where id = $1`, [id, take ? 'taken' : 'declined']);
    row.status = take ? 'taken' : 'declined';
  }
  return {id: String(row.id), status: row.status, delivered: !!row.delivered_at, from: named(row), ...(row.note ? {note: row.note} : {}), ...(row.status === 'taken' && !row.delivered_at && row.item ? {item: row.item} : {})};
}

export async function seeKnocks(db, homeId) {
  const {rowCount} = await db.query(`update door_visits set status = 'seen', decided_at = now() where home_id = $1 and kind = 'knock' and status = 'waiting'`, [homeId]);
  return rowCount;
}


// A receipt is acknowledged only alongside the successfully stored home document.
export async function acknowledgeMail(db, homeId, doc) {
  const ids = doc?.entries?.['porchlit-home-layout-v1']?.mailReceipts;
  if (!Array.isArray(ids)) return;
  const valid = [...new Set(ids.filter(id => typeof id === 'string' && /^[1-9][0-9]{0,17}$/.test(id)))];
  if (valid.length) await db.query("update door_visits set delivered_at = coalesce(delivered_at, now()) where home_id = $1 and status = 'taken' and id = any($2::bigint[])", [homeId, valid]);
}
