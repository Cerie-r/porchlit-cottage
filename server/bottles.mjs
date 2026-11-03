// Drift bottles (server/migrations/017_bottles.sql; the page's side is src/bottles.js). Throwing one: a few words, one
// bottle a day each, by a home's owner from the study computer (throwBottle), or by an AI living there, asked for as an
// act and thrown by the save that says the owner's page has let it in (throwFromActs). Finding one: a walk
// brings the glass bottle home from the lake, and the home asks the sea what is in it, once for each find (fishBottle):
// the bottle at sea longest that isn't its own and isn't from anyone it can't hear from washes up there, or nothing
// does. Neither side learns the other: the finder reads the words (and whether an AI wrote them), the writer only hears
// that it was found. A bottle found may be reported (server/reports.mjs); the home then gets no more from that writer.
import {cleanWords, isFindKey, wordsProblem, WORDS_MAX} from '../src/bottles.js';
import {dayIn} from '../src/hide-and-seek.js';
import {actAnswers} from './acts.mjs';
import {DoorProblem} from './doors.mjs';
export {WORDS_MAX, wordsProblem, isFindKey};

// Bottles a home may open in a day: two walks, a basket each, and the glass bottle rarely in either. More than this
// and someone is asking for more than they've found.
export const OPENED_A_DAY = 4;
// What one writer is shown of what they've thrown.
const THROWN_SHOWN = 20;

const opened = r => ({id: String(r.id), words: r.words, thrownOn: r.day, ...(r.by_machine ? {byMachine: true} : {})});

// Whether this writer must wait for their next: 'today' when one is today's by their calendar (day; none given, not
// asked), 'soon' when the last went less than twenty hours ago (so a day sent from the other side of the date line
// doesn't buy a second), or null.
export async function throwWait(db, writerId, day = null) {
  const {rows: [r]} = await db.query(
    `select coalesce(bool_or(day = $2::date), false) as today, coalesce(max(thrown_at) > now() - interval '20 hours', false) as soon
       from bottles where writer_id = $1`,
    [writerId, day]);
  return r.today ? 'today' : r.soon ? 'soon' : null;
}

// What a writer has thrown: how many, how many were found (never where), and the last one's day and whether it was.
export async function thrownBy(db, writerId) {
  const {rows: [r]} = await db.query(
    `select count(*)::int as n, count(found_at)::int as found,
            (array_agg(to_char(day, 'YYYY-MM-DD') order by thrown_at desc, id desc))[1] as last_day,
            (array_agg(found_at is not null order by thrown_at desc, id desc))[1] as last_found
       from bottles where writer_id = $1`,
    [writerId]);
  return {n: r.n, found: r.found, last: r.n ? {day: r.last_day, found: r.last_found} : null};
}

// A person throws one: words (checked), their day, and a request id that makes sending it again the same throw. Caller
// holds a transaction; the writer's row serializes their one a day. Returns {bottle: {id, day}}, or {wait} when it
// isn't time for another yet (throwWait).
export async function throwBottle(db, {homeId, writerId, words, day, requestId}) {
  const text = cleanWords(words);
  if (!text) throw new DoorProblem('invalid', wordsProblem(words), 400);
  await db.query('select id from accounts where id = $1 for update', [writerId]);
  const {rows: [old]} = await db.query(`select id, words, to_char(day, 'YYYY-MM-DD') as day from bottles where writer_id = $1 and request_id = $2`, [writerId, requestId]);
  if (old) {
    if (old.words !== text) throw new DoorProblem('request_changed', '这只瓶子里的字变了，先确认上一只投出去没有。');
    return {bottle: {id: String(old.id), day: old.day}};
  }
  const wait = await throwWait(db, writerId, day);
  if (wait) return {wait};
  const {rows: [row]} = await db.query(
    `insert into bottles (home_id, writer_id, words, day, request_id) values ($1, $2, $3, $4, $5)
     on conflict do nothing returning id, to_char(day, 'YYYY-MM-DD') as day`,
    [homeId, writerId, text, day, requestId]);
  return row ? {bottle: {id: String(row.id), day: row.day}} : {wait: 'today'};
}

// The AIs whose bottles a save may throw (its lines say done to bottle acts still in the queue), their rows held, in
// order, before the save touches anything of the home's. Queueing an act holds the AI's row and then the home's
// (server/acts.mjs); a save holding the home's first (a copy kept, its outside) and then reaching for the AI's to
// throw its bottle could wait on it while it waits on the save. Called by storeSave first thing in its transaction.
export async function holdBottleWriters(db, homeId, doc) {
  const done = actAnswers(doc).filter(a => a.state === 'done');
  if (!done.length) return;
  await db.query(
    `select id from accounts where id in (
       select m.account_id from machine_acts m join unnest($2::bigint[], $3::uuid[]) as x(id, key) on m.id = x.id and m.key = x.key
        where m.home_id = $1 and m.tool = 'write' and m.action = 'bottle' and m.state in ('waiting', 'withdrawn'))
      order by id for update`,
    [homeId, done.map(a => a.id), done.map(a => a.key)]);
}

// What the AI hears of one that didn't go: the act stays done (her page let it in), its answer says so.
const NOT_THROWN = '这一只没投进海里：离上一只还不到一天。';

// The bottles AIs living in a home asked to throw, as the save that lets them in answers their acts (answered: what
// acknowledgeActs answered; server/acts.mjs). Called by storeSave inside its transaction, their writers held. Each
// act has this one chance: one let in within a day of its AI's last bottle (two let in at once; the page's day not
// the server's) isn't thrown, and its answer says so. The day is the home's own today (the save's clock).
export async function throwFromActs(db, homeId, doc, answered = []) {
  const acts = answered.filter(a => a.state === 'done' && a.tool === 'write' && a.action === 'bottle');
  if (!acts.length) return;
  const zone = doc?.entries?.['porchlit-clock-v1']?.timeZone;
  const day = dayIn(typeof zone === 'string' ? zone : 'UTC');
  for (const a of acts) {
    const text = cleanWords(a.args?.text);
    const thrown = !!text && !(await throwWait(db, a.account_id, day)) && (await db.query(
      `insert into bottles (home_id, writer_id, by_machine, words, day, act_id) values ($1, $2, true, $3, $4, $5) on conflict do nothing returning id`,
      [homeId, a.account_id, text, day, a.id])).rowCount > 0;
    if (!thrown) await db.query('update machine_acts set answer = $2 where id = $1', [a.id, NOT_THROWN]);
  }
}

// A home opens a bottle its walk brought home: key says which find it is (src/bottles.js). The same find opens the
// same bottle again; a new one takes the bottle at sea longest that isn't from this home, from anyone switched off,
// from anyone this home has blocked (at its door, or for a bottle) or whose home has blocked its owner. One left
// unopened too long (stale) is empty. Caller holds a transaction; the home's row serializes its opening. Returns
// {bottle}, {empty: true}, or {later: true} when the home has opened enough today (the find keeps till then).
export async function fishBottle(db, {homeId, ownerId, key, stale = false}) {
  await db.query('select id from homes where id = $1 for update', [homeId]);
  const {rows: [had]} = await db.query(`select id, words, by_machine, to_char(day, 'YYYY-MM-DD') as day from bottles where found_home_id = $1 and found_key = $2`, [homeId, key]);
  if (had) return {bottle: opened(had)};
  if (stale) return {empty: true};
  const {rows: [{n}]} = await db.query(`select count(*)::int as n from bottles where found_home_id = $1 and found_at > now() - interval '20 hours'`, [homeId]);
  if (n >= OPENED_A_DAY) return {later: true};
  const {rows: [b]} = await db.query(
    `select b.id from bottles b
       join accounts w on w.id = b.writer_id
       join homes h on h.id = b.home_id
       join accounts o on o.id = h.owner_id
      where b.found_at is null and b.home_id <> $1 and w.disabled_at is null and o.disabled_at is null
        and not exists (select 1 from bottle_blocks x where x.home_id = $1 and x.writer_id = b.writer_id)
        and not exists (select 1 from door_blocks y where y.home_id = $1 and y.blocked_id in (b.writer_id, h.owner_id))
        and not exists (select 1 from door_blocks z where z.home_id = b.home_id and z.blocked_id = $2)
      order by b.thrown_at, b.id
      limit 1
      for update of b skip locked`,
    [homeId, ownerId]);
  if (!b) return {empty: true};
  const {rows: [row]} = await db.query(
    `update bottles set found_home_id = $2, found_key = $3, found_at = now() where id = $1
     returning id, words, by_machine, to_char(day, 'YYYY-MM-DD') as day`,
    [b.id, homeId, key]);
  return {bottle: opened(row)};
}

// What has been thrown from a home (its owner's, and its AIs' with which AI it was, by the name it goes by), newest
// first, with whether each was found (never where), and whether its owner must wait for the next (day: theirs).
export async function thrownFrom(db, {homeId, ownerId, day}) {
  const {rows} = await db.query(
    `select b.id, b.words, b.by_machine, b.writer_id, a.username, a.nickname, to_char(b.day, 'YYYY-MM-DD') as day, b.found_at is not null as found
       from bottles b join accounts a on a.id = b.writer_id where b.home_id = $1 order by b.thrown_at desc, b.id desc limit $2`,
    [homeId, THROWN_SHOWN]);
  return {
    thrown: rows.map(r => ({
      id: String(r.id), day: r.day, words: r.words,
      ...(r.by_machine ? {byMachine: true, by: {id: String(r.writer_id), name: (r.nickname && r.nickname.trim()) || r.username}} : {}),
      ...(r.found ? {found: true} : {})
    })),
    wait: await throwWait(db, ownerId, day)
  };
}
