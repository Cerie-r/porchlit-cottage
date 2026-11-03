import {acknowledgeMail} from './doors.mjs';
import {acknowledgeActs} from './acts.mjs';
import {holdBottleWriters, throwFromActs} from './bottles.mjs';
import {rememberShells} from './streets.mjs';
import {checkHome, storableHome, summarize} from '../src/home-transfer.js';

// A home's save on the server: the same 'porchlit-home' document the transfer
// box exports, checked by the same rules. Every write names the revision it
// was based on, so a device that saves over a newer copy is told instead of
// silently undoing someone else's changes.

// A whole browser's storage for one site is about 5 MB, so any home fits.
export const SAVE_LIMIT = 6 * 1024 * 1024;

const shape = row => ({revision: Number(row.revision), saveId: row.save_id, savedAt: row.updated_at});

// Throws with a message for people when the document isn't a usable save.
export function checkSave(doc) {
  checkHome(doc);
  storableHome(doc);
  return doc;
}

// The save, or revision 0 and no document when nothing has been saved yet.
export async function loadSave(db, homeId) {
  const {rows: [row]} = await db.query('select revision, save_id, doc, updated_at from home_saves where home_id = $1', [homeId]);
  return row ? {...shape(row), doc: row.doc} : {revision: 0, saveId: null, savedAt: null, doc: null};
}

// Just which revision is on the server and when it was saved, without the
// document: what an open page asks now and then to notice another device.
export async function loadRevision(db, homeId) {
  const {rows: [row]} = await db.query('select revision, save_id, updated_at from home_saves where home_id = $1', [homeId]);
  return row ? shape(row) : {revision: 0, saveId: null, savedAt: null};
}

// How many put-aside copies a home keeps, newest first, and how much they
// may weigh together (measured as JSON text, before the database compresses
// it). A home of a few hundred KB keeps all forty; a 5 MB one keeps two.
export const HISTORY_KEEP = 40;
export const HISTORY_BUDGET = 12 * 1024 * 1024;

// What a person recognises a copy by, counted in the database the same way
// summarize() counts in src/home-transfer.js.
const counted = doc => `(
  select (count(*) filter (where e->>'kind' is distinct from 'note'))::int as works,
         (count(*) filter (where e->>'kind' = 'note'))::int as notes
    from jsonb_array_elements(case
           when jsonb_typeof(${doc} #> '{entries,porchlit-home-layout-v1,creations}') = 'array'
           then ${doc} #> '{entries,porchlit-home-layout-v1,creations}' else '[]'::jsonb end) e
   where jsonb_typeof(e) = 'object')`;

// Writes over revision `expected` (0 when there was none yet), and, when
// `saveId` is given, only if that revision is still the write with that id.
// Returns the new revision, or null when the save moved on in the meantime.
// The copy it replaces is put aside first when `keep` is set (a device
// replacing the server's copy on purpose) or when that copy is more than ten
// minutes old, so ordinary saving every few seconds doesn't fill the history.
export async function storeSave(db, homeId, accountId, expected, doc, {keep = false, saveId = null} = {}) {
  // The AIs whose bottles this may throw, held before anything of the home's (server/bottles.mjs).
  await holdBottleWriters(db, homeId, doc);
  if (expected === 0) {
    const {rows: [row]} = await db.query(
      `insert into home_saves (home_id, doc, updated_by) values ($1, $2, $3)
       on conflict (home_id) do nothing returning revision, save_id, updated_at`,
      [homeId, doc, accountId]);
    if (row) {
      await rememberShells(db, homeId, doc);
      await acknowledgeMail(db, homeId, doc);
      await throwFromActs(db, homeId, doc, await acknowledgeActs(db, homeId, doc));
    }
    return row ? shape(row) : null;
  }
  // The row is locked first: of two saves over the same revision, the second
  // waits, then finds the revision moved on and neither keeps nor writes.
  const {rows: [row]} = await db.query(
    `with old as (
       select home_id, revision, doc, updated_at from home_saves
        where home_id = $1 and revision = $4 and ($6::uuid is null or save_id = $6::uuid) for update
     ), kept as (
       insert into home_history (home_id, source, revision, doc, saved_at, kept_by, bytes, works, notes, on_purpose)
       select o.home_id, 'server', o.revision, o.doc, o.updated_at, $3, octet_length(o.doc::text), c.works, c.notes, $5
         from old o cross join lateral ${counted('o.doc')} c
        where $5 or o.updated_at < now() - interval '10 minutes'
       returning id
     )
     update home_saves set doc = $2, revision = revision + 1, save_id = gen_random_uuid(), updated_by = $3, updated_at = now()
      where home_id = $1 and revision = (select revision from old)
      returning revision, save_id, updated_at, (select count(*) from kept)::int as kept`,
    [homeId, doc, accountId, expected, keep, saveId]);
  if (!row) return null;
  if (row.kept) await pruneHistory(db, homeId);
  // The home's row before its door's: a knock at the door locks them in that
  // order too (server/doors.mjs), so the two never wait on each other.
  await rememberShells(db, homeId, doc);
  await acknowledgeMail(db, homeId, doc);
  // What an AI living here asked for, as the page let it in or not (server/acts.mjs); a bottle it asked to throw goes
  // into the sea once let in (server/bottles.mjs).
  await throwFromActs(db, homeId, doc, await acknowledgeActs(db, homeId, doc));
  return shape(row);
}

// A device's own copy, handed over before the device takes the server's.
export async function keepDeviceCopy(db, homeId, accountId, doc) {
  const {works, notes} = summarize(doc);
  const {rows: [row]} = await db.query(
    `insert into home_history (home_id, source, doc, saved_at, kept_by, bytes, works, notes, on_purpose)
     values ($1, 'device', $2, now(), $3, $4, $5, $6, true)
     returning id, source, revision, saved_at, kept_at, works, notes`,
    [homeId, doc, accountId, Buffer.byteLength(JSON.stringify(doc)), works, notes]);
  await pruneHistory(db, homeId);
  return version(row);
}

// Keeps the newest copies within both the count and the size budget.
// Copies put aside on purpose go last: the budget is filled with them first
// (newest first), then with the ones kept only because they'd sat a while.
async function pruneHistory(db, homeId) {
  await db.query(
    `delete from home_history where id in (
       select id from (
         select id,
                row_number() over (order by kept_at desc, id desc) as n,
                sum(bytes) over (order by on_purpose desc, kept_at desc, id desc) as running
           from home_history where home_id = $1
       ) newest
        where n > $2 or running > $3)`,
    [homeId, HISTORY_KEEP, HISTORY_BUDGET]);
}

const version = row => ({
  id: String(row.id),
  source: row.source,
  revision: row.revision === null ? null : Number(row.revision),
  savedAt: row.saved_at,
  keptAt: row.kept_at,
  ...(row.works === undefined ? {} : {works: row.works, notes: row.notes})
});

// The put-aside copies, newest first.
export async function loadHistory(db, homeId) {
  const {rows} = await db.query(
    `select id, source, revision, saved_at, kept_at, works, notes from home_history
      where home_id = $1 order by kept_at desc, id desc limit $2`,
    [homeId, HISTORY_KEEP]);
  return rows.map(version);
}

// One put-aside copy with its document, or null.
export async function loadHistoryCopy(db, homeId, id) {
  const {rows: [row]} = await db.query(
    'select id, source, revision, saved_at, kept_at, works, notes, doc from home_history where home_id = $1 and id = $2',
    [homeId, id]);
  return row ? {...version(row), doc: row.doc} : null;
}
