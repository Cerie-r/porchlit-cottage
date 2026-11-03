// Reports (server/migrations/009_reports.sql). Anyone may report something left at their own door or a line in
// their guestbook (a visit), or a home they came to on the street; reporting blocks that account from their door as
// well (server/doors.mjs), so whatever it left there is turned away. The home the place is run by (OURS_ACCOUNTS)
// reads them, with a copy of what was reported as it was then, and closes each: nothing wrong, or the account
// switched off. Switched off, an account can't sign in, and its home and whatever it left are gone from everyone's
// street and door; it can be switched back on.
import {validText} from '../src/door-safety.js';
import {DoorProblem, blockAccount} from './doors.mjs';

export const REASONS = ['harass', 'adult', 'spam', 'other'];
export const WORDS_MAX = 200;

export function reportProblem(body) {
  if (!REASONS.includes(body?.reason)) return '要选一个原因。';
  const words = body.words;
  if (words === undefined || words === null) return null;
  if (typeof words !== 'string' || !validText(words)) return '想说的要是一段字。';
  if ([...words.trim()].length > WORDS_MAX) return `想说的最多 ${WORDS_MAX} 个字。`;
  return null;
}
const cleanWords = words => (typeof words === 'string' && words.trim() ? words.trim() : null);
const named = (name, nickname) => ({name, nickname: nickname && nickname !== name ? nickname : ''});

// A visit to the reporter's own home (homeId). Caller holds a transaction. Returns {id, blocked}.
export async function reportVisit(db, {homeId, reporterId, visitId, reason, words}) {
  await db.query('select id from homes where id = $1 for update', [homeId]);
  const {rows: [v]} = await db.query(
    `select id, visitor_id, kind, to_char(day, 'YYYY-MM-DD') as day, visitor_name, visitor_nickname, note, item, item_kind, item_name, status
       from door_visits where id = $1 and home_id = $2`,
    [visitId, homeId]);
  if (!v) throw new DoorProblem('not_found', '门口没有这一样。', 404);
  // Taken before blocking, which empties whatever is still waiting. Something already turned away was emptied then
  // (only what kind of thing it was is left): the copy says so.
  const copy = {
    kind: v.kind, day: v.day, ...named(v.visitor_name, v.visitor_nickname), status: v.status,
    ...(v.note ? {note: v.note} : {}),
    ...(v.item ? {item: v.item} : v.item_kind ? {itemKind: v.item_kind, itemName: v.item_name} : {}),
    ...(v.kind === 'mail' && v.status === 'declined' ? {emptied: true} : {})
  };
  const {rows: [r]} = await db.query(
    `insert into reports (reporter_id, reported_id, what, visit_id, reason, words, copy) values ($1, $2, 'visit', $3, $4, $5, $6)
     on conflict do nothing returning id`,
    [reporterId, v.visitor_id, v.id, reason, cleanWords(words), copy]);
  if (!r) throw new DoorProblem('already', '这一条已经举报过了。');
  return {id: String(r.id), blocked: await blockAccount(db, homeId, v.visitor_id)};
}

// A home met on the street: `door` as findDoor gave it to the reporter. The reporter's own home (homeId) blocks its
// owner. Caller holds a transaction. Returns {id, blocked}.
export async function reportHome(db, {homeId, reporterId, door, reason, words}) {
  if (homeId) await db.query('select id from homes where id = $1 for update', [homeId]);
  const copy = {...named(door.username, door.nickname), porch: door.porch};
  const {rows: [r]} = await db.query(
    `insert into reports (reporter_id, reported_id, what, reason, words, copy) values ($1, $2, 'home', $3, $4, $5)
     on conflict do nothing returning id`,
    [reporterId, door.owner_id, reason, cleanWords(words), copy]);
  if (!r) throw new DoorProblem('already', '已经举报过这一家了，还在等着看。');
  return {id: String(r.id), blocked: homeId ? await blockAccount(db, homeId, door.owner_id) : null};
}

// A drift bottle that washed up at the reporter's home (homeId; server/bottles.mjs). Whose it was stays unknown to the
// reporter: the writer isn't put on the door's block list (that shows names), but on the bottles' own, so no more of
// theirs wash up here. Caller holds a transaction. Returns {id}.
export async function reportBottle(db, {homeId, reporterId, bottleId, reason, words}) {
  await db.query('select id from homes where id = $1 for update', [homeId]);
  const {rows: [b]} = await db.query(
    `select b.id, b.writer_id, b.by_machine, b.words, to_char(b.day, 'YYYY-MM-DD') as day, to_char(b.found_at, 'YYYY-MM-DD') as found_on, a.username, a.nickname
       from bottles b join accounts a on a.id = b.writer_id where b.id = $1 and b.found_home_id = $2`,
    [bottleId, homeId]);
  if (!b) throw new DoorProblem('not_found', '这只瓶子不是漂到你家的。', 404);
  const copy = {kind: 'bottle', day: b.day, ...(b.found_on ? {foundOn: b.found_on} : {}), ...named(b.username, b.nickname), note: b.words, ...(b.by_machine ? {byMachine: true} : {})};
  const {rows: [r]} = await db.query(
    `insert into reports (reporter_id, reported_id, what, bottle_id, reason, words, copy) values ($1, $2, 'bottle', $3, $4, $5, $6)
     on conflict do nothing returning id`,
    [reporterId, b.writer_id, b.id, reason, cleanWords(words), copy]);
  if (!r) throw new DoorProblem('already', '这只瓶子已经举报过了。');
  await db.query('insert into bottle_blocks (home_id, writer_id) values ($1, $2) on conflict do nothing', [homeId, b.writer_id]);
  return {id: String(r.id)};
}

const COLUMNS = `r.id, r.what, r.reason, r.words, r.copy, r.created_at, r.closed_at, r.outcome,
  f.username as from_name, f.nickname as from_nickname,
  t.id as about_id, t.username as about_name, t.nickname as about_nickname, t.disabled_at as about_disabled,
  r.ai_words, r.ai_leaning, r.ai_at, b.username as ai_name, b.nickname as ai_nickname`;
const FROM = 'reports r join accounts f on f.id = r.reporter_id join accounts t on t.id = r.reported_id left join accounts b on b.id = r.ai_by';
// In the list a photo is only marked (one may be 300 KB): the report itself, asked for on its own, carries it.
const light = copy => (copy?.item?.image ? {...copy, item: {...copy.item, image: undefined, photo: true}} : copy);
const entry = (r, full = false) => ({
  id: String(r.id), what: r.what, reason: r.reason, ...(r.words ? {words: r.words} : {}), copy: full ? r.copy : light(r.copy), at: r.created_at,
  from: named(r.from_name, r.from_nickname),
  about: {id: String(r.about_id), ...named(r.about_name, r.about_nickname), ...(r.about_disabled ? {disabled: true} : {})},
  ...(r.closed_at ? {closedAt: r.closed_at, outcome: r.outcome} : {}),
  // What the AI helping run the place (server/street.mjs) thought of it, when it said.
  ...(r.ai_at ? {ai: {words: r.ai_words, leaning: r.ai_leaning, at: r.ai_at, ...(r.ai_name ? {by: named(r.ai_name, r.ai_nickname)} : {})}} : {})
});

// The open ones, oldest first, and the latest closed; openCount is how many are open in all.
export async function listReports(db, {open: many = 50, closed = 30} = {}) {
  const {rows: open} = await db.query(`select ${COLUMNS} from ${FROM} where r.closed_at is null order by r.created_at, r.id limit $1`, [many]);
  const {rows: done} = await db.query(`select ${COLUMNS} from ${FROM} where r.closed_at is not null order by r.closed_at desc, r.id desc limit $1`, [closed]);
  return {open: open.map(r => entry(r)), closed: done.map(r => entry(r)), openCount: await openReports(db)};
}

export async function openReports(db) {
  const {rows: [{n}]} = await db.query('select count(*)::int as n from reports where closed_at is null');
  return n;
}

// One report, with all of its copy (a photo too).
export async function oneReport(db, id) {
  const {rows: [r]} = await db.query(`select ${COLUMNS} from ${FROM} where r.id = $1`, [id]);
  return r ? entry(r, true) : null;
}

// The AI helping run the place says what it thinks of one still open: a few words, leaning 'fine' or 'disable'. The
// person running the place closes it. Saying it again replaces what it said. False when no such report is open.
export async function leanReport(db, {id, aiId, words, leaning}) {
  const {rowCount} = await db.query(
    'update reports set ai_words = $2, ai_leaning = $3, ai_by = $4, ai_at = now() where id = $1 and closed_at is null',
    [id, words, leaning, aiId]);
  return rowCount === 1;
}

// Locks the account a report is about, and then the report: every way of closing one goes in that order, so two at
// once about the same account wait for each other instead of deadlocking. Null when there is no such report.
async function lockAbout(db, id) {
  const {rows: [head]} = await db.query('select reported_id from reports where id = $1', [id]);
  if (!head) return null;
  const {rows: [account]} = await db.query('select id, username_key, disabled_at from accounts where id = $1 for update', [head.reported_id]);
  const {rows: [report]} = await db.query('select id, closed_at, outcome from reports where id = $1 for update', [id]);
  return {account, report};
}

// Closing one: 'fine' (nothing wrong; only an open one), or 'disabled': the account it is about is switched off, its
// sessions end, and every open report about it closes with it (this one too, even if it was closed before: an
// account switched back on can be switched off again). A name the place is run by (`keepers`, normalised) is never
// switched off. Caller holds a transaction. Returns the report as it is now, or null when there is none.
export async function closeReport(db, {id, keeperId, outcome, keepers}) {
  const held = await lockAbout(db, id);
  if (!held) return null;
  const {account, report} = held;
  if (outcome === 'disabled') {
    if (keepers.has(account.username_key)) throw new DoorProblem('keeper', '这是管这里的账号，不能停用。');
    await db.query('update accounts set disabled_at = coalesce(disabled_at, now()) where id = $1', [account.id]);
    await db.query('update sessions set revoked_at = now() where account_id = $1 and revoked_at is null', [account.id]);
    await db.query(`update reports set closed_at = now(), closed_by = $3, outcome = 'disabled' where reported_id = $1 and (closed_at is null or id = $2)`, [account.id, id, keeperId]);
  } else if (!report.closed_at) {
    await db.query(`update reports set closed_at = now(), closed_by = $2, outcome = 'fine' where id = $1`, [id, keeperId]);
  }
  return oneReport(db, id);
}

// Switching back on the account a report switched off; the reports closed that way count as nothing wrong after all.
// Caller holds a transaction. Returns the report as it is now, or null when there is none.
export async function undoReport(db, {id, keeperId}) {
  const held = await lockAbout(db, id);
  if (!held) return null;
  if (held.report.outcome === 'disabled') {
    await db.query('update accounts set disabled_at = null where id = $1', [held.account.id]);
    await db.query(`update reports set outcome = 'fine', closed_at = now(), closed_by = $2 where reported_id = $1 and outcome = 'disabled'`, [held.account.id, keeperId]);
  }
  return oneReport(db, id);
}
