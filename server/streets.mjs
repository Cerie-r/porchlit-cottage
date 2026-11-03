import {randomInt} from 'node:crypto';
import {knownSeasonShell, knownShell, wornShells} from '../src/house-shells.js';

// Streets on the community map (server/migrations/003_streets.sql): where a
// home stands, and what the street shows of it. Only what is public is read
// out: the name on the door plate, the nickname beside it, the light the
// owner left on, and what the house wears outside (007_home_shells.sql).
// Nothing from inside a home ever goes onto the map.

export const LOTS = 64;
export const PORCH_STATES = ['on', 'dim', 'dnd', 'off'];
// Homes are given lots one at a time, so two at once can't take the same lot
// or both open a new street.
const PLACING = 0x5374726565; // 'Stree'

const newSeed = () => randomInt(1, 2147483647);

// The home's lot, giving it one if it has none: a free lot on the newest
// street, picked at random; a new street when that one is full. Call inside a
// transaction.
export async function placeHome(db, homeId) {
  await db.query('select pg_advisory_xact_lock($1)', [PLACING]);
  const {rows: [home]} = await db.query('select street_id, lot from homes where id = $1 for update', [homeId]);
  if (!home) return null;
  if (home.street_id !== null) return {street: String(home.street_id), lot: home.lot};
  let {rows: [street]} = await db.query('select id from streets order by id desc limit 1');
  let free = [];
  if (street) {
    const {rows} = await db.query(
      `select lot from generate_series(0, $2::int - 1) as lot
        where lot not in (select h.lot from homes h where h.street_id = $1)`,
      [street.id, LOTS]);
    free = rows.map(r => r.lot);
  }
  if (!free.length) {
    ({rows: [street]} = await db.query('insert into streets (seed) values ($1) returning id', [newSeed()]));
    free = Array.from({length: LOTS}, (_, i) => i);
  }
  const lot = free[randomInt(free.length)];
  await db.query('update homes set street_id = $2, lot = $3 where id = $1', [homeId, street.id, lot]);
  return {street: String(street.id), lot};
}

// What a saved home wears outside, from its save (the same document the
// transfer box exports): kept on the home, so the street needn't open saves.
// A save written by code that doesn't keep these (an older release, after a
// rollback) leaves them as they were until the home's next save here; setting
// them to null has the street read them from the saves again.
export const shellsFromSave = doc => wornShells(doc?.entries?.['porchlit-home-layout-v1']);
export async function rememberShells(db, homeId, doc) {
  const {shell, season} = shellsFromSave(doc);
  await db.query('update homes set shell = $2, season_shell = $3 where id = $1 and (shell is distinct from $2 or season_shell is distinct from $3)', [homeId, shell, season]);
}

// Homes whose outside isn't known yet (saved before it was kept): read from
// their saves, once. A home with no save wears the cottage. Only the few
// things wornShells looks at come out of each save (a save can be megabytes),
// and they are all written back in one go.
async function fillShells(pool, rows) {
  const missing = rows.filter(r => r.shell === null);
  if (!missing.length) return;
  const {rows: saves} = await pool.query(
    `select home_id, jsonb_build_object('shell', l->'shell', 'seasonShell', l->'seasonShell', 'roses', l->'roses',
                                        'computer', jsonb_build_object('solved', l#>'{computer,solved}')) as home
       from (select home_id, doc #> '{entries,porchlit-home-layout-v1}' as l from home_saves where home_id = any($1::bigint[])) s`,
    [missing.map(r => r.id)]);
  const found = new Map(saves.map(s => [String(s.home_id), s.home])), worn = missing.map(r => wornShells(found.get(String(r.id))));
  await pool.query(
    `update homes h set shell = v.shell, season_shell = v.season
       from unnest($1::bigint[], $2::text[], $3::text[]) as v(id, shell, season)
      where h.id = v.id and h.shell is null`,
    [missing.map(r => r.id), worn.map(w => w.shell), worn.map(w => w.season)]);
  missing.forEach((r, i) => Object.assign(r, {shell: worn[i].shell, season_shell: worn[i].season}));
}

// One street as the map draws it: its seed and the homes on it. `mine` is the
// home of whoever is asking, so the map can mark it for them alone; `viewer`
// is their account, and a home whose owner has blocked them is an empty lot.
// Each home's everyday shell goes out, and the seasonal one it wears over it
// when it has one: the map shows that one only in season, by its own day.
export async function loadStreet(pool, streetId, mine, viewer = null) {
  const {rows: [street]} = await pool.query('select id, seed from streets where id = $1', [streetId]);
  if (!street) return null;
  const {rows} = await pool.query(
    `select h.id, h.lot, h.porch, h.shell, h.season_shell, a.username, a.nickname
       from homes h join accounts a on a.id = h.owner_id
      where h.street_id = $1 and a.disabled_at is null
        and not exists (select 1 from door_blocks b where b.home_id = h.id and b.blocked_id = $2::bigint)
      order by h.lot`,
    [streetId, viewer]);
  // Not known and can't be read just now: the cottage this time, and another try next time.
  try {
    await fillShells(pool, rows);
  } catch (err) {
    console.error('streets: could not fill in what homes wear outside:', err.message);
  }
  return {
    street: {id: String(street.id), seed: street.seed},
    homes: rows.map(r => ({
      lot: r.lot,
      name: r.username,
      nickname: r.nickname && r.nickname !== r.username ? r.nickname : '',
      porch: r.porch,
      shell: knownShell(r.shell, null),
      ...(knownSeasonShell(r.season_shell) ? {season: r.season_shell} : {}),
      ...(mine !== undefined && String(r.id) === String(mine) ? {mine: true} : {})
    }))
  };
}

// How many streets there are, newest last; the map leaves fields where there are none yet.
export async function streetCount(pool) {
  const {rows: [row]} = await pool.query('select coalesce(max(id), 0)::int as n from streets');
  return row.n;
}

export const porchProblem = porch => PORCH_STATES.includes(porch) ? null : '门口的灯只有四种：on、dim、dnd、off。';
