import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {LOTS, PORCH_STATES, loadStreet, placeHome, porchProblem, shellsFromSave} from '../server/streets.mjs';
import {shownShell} from '../src/house-shells.js';
import {storeSave} from '../server/home-saves.mjs';
import {newSessionToken, sha256} from '../server/tokens.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

// People, homes and sessions made straight in the database, so these run on
// any Node (no password hashing).
const person = async (pool, name, nickname = '') =>
  (await pool.query(`insert into accounts (kind, username, username_key, nickname, password_hash) values ('human', $1, lower($1), $2, 'x') returning id`, [name, nickname])).rows[0].id;
const homeFor = async (pool, owner) => (await pool.query('insert into homes (owner_id) values ($1) returning id', [owner])).rows[0].id;
async function inTransaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}
const placed = (pool, homeId) => inTransaction(pool, db => placeHome(db, homeId));

test('the light at the door has four states', () => {
  assert.deepEqual(PORCH_STATES, ['on', 'dim', 'dnd', 'off']);
  for (const s of PORCH_STATES) assert.equal(porchProblem(s), null);
  for (const s of ['ON', '', null, undefined, 1, 'open']) assert.ok(porchProblem(s));
});

test('homes from before the map are each given a lot on the first street, at random', needsDatabase, async t => {
  const pool = (await freshDatabase(t)).pool();
  const all = await loadMigrations();
  await migrate(pool, {migrations: all.filter(m => m.version < '003')});
  for (let i = 0; i < 6; i++) await homeFor(pool, await person(pool, 'early' + i));
  await migrate(pool, {migrations: all});
  const {rows} = await pool.query('select street_id, lot, porch from homes');
  assert.equal(rows.length, 6);
  assert.equal(new Set(rows.map(r => String(r.street_id))).size, 1);
  assert.equal(new Set(rows.map(r => r.lot)).size, 6);
  assert.ok(rows.every(r => r.lot >= 0 && r.lot < LOTS && r.porch === 'on'));
  // Not simply the first six lots in sign-up order.
  const {rows: [{n}]} = await pool.query('select count(*)::int as n from streets');
  assert.equal(n, 1);
});

test('a new home takes a free lot on the newest street; a full street opens the next one', needsDatabase, async t => {
  const pool = (await freshDatabase(t)).pool({max: 8});
  await migrate(pool);
  const homes = [];
  for (let i = 0; i < LOTS + 1; i++) homes.push(await homeFor(pool, await person(pool, 'n' + i)));
  // Many at once: one at a time underneath, so no lot is handed out twice.
  const first = await Promise.all(homes.slice(0, LOTS).map(id => placed(pool, id)));
  assert.equal(new Set(first.map(p => p.street)).size, 1);
  assert.equal(new Set(first.map(p => p.lot)).size, LOTS);
  const next = await placed(pool, homes[LOTS]);
  assert.notEqual(next.street, first[0].street);
  assert.ok(Number(next.street) > Number(first[0].street));
  // Asking again changes nothing.
  assert.deepEqual(await placed(pool, homes[0]), first[0]);
  assert.equal(await placed(pool, '999999'), null);
});

test('a street shows only what hangs outside: the door plate, the nickname, the light', needsDatabase, async t => {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const wren = await person(pool, 'Wren', '小雀'), moss = await person(pool, 'Moss', 'Moss'), gone = await person(pool, 'Gone');
  const homes = {wren: await homeFor(pool, wren), moss: await homeFor(pool, moss), gone: await homeFor(pool, gone)};
  for (const id of Object.values(homes)) await placed(pool, id);
  await pool.query(`update homes set porch = 'dnd' where id = $1`, [homes.moss]);
  await pool.query('update accounts set disabled_at = now() where id = $1', [gone]);
  const {rows: [{street_id: streetId}]} = await pool.query('select street_id from homes where id = $1', [homes.wren]);
  const street = await loadStreet(pool, streetId, homes.wren);
  assert.equal(street.street.id, String(streetId));
  assert.ok(Number.isInteger(street.street.seed) && street.street.seed > 0);
  assert.deepEqual(street.homes.map(h => h.name).sort(), ['Moss', 'Wren']);
  for (const h of street.homes) assert.deepEqual(Object.keys(h).filter(k => k !== 'mine').sort(), ['lot', 'name', 'nickname', 'porch', 'shell']);
  for (const h of street.homes) assert.equal(h.shell, 'gabledCottage', 'a home with no save wears the cottage');
  const byName = Object.fromEntries(street.homes.map(h => [h.name, h]));
  assert.equal(byName.Wren.mine, true);
  assert.equal(byName.Moss.mine, undefined);
  assert.equal(byName.Wren.nickname, '小雀');
  assert.equal(byName.Moss.nickname, '', 'a nickname the same as the name is not said twice');
  assert.equal(byName.Moss.porch, 'dnd');
  assert.equal(await loadStreet(pool, '424242', homes.wren), null);
});

// A server with two people on the map, signed in by sessions made in the database.
async function street(t) {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const people = {};
  for (const name of ['Wren', 'Moss']) {
    const id = await person(pool, name);
    await homeFor(pool, id);
    const token = newSessionToken();
    await pool.query(`insert into sessions (account_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')`, [id, sha256(token)]);
    people[name] = token;
  }
  const server = createServer({db: {pool, migrations: await loadMigrations()}, api: createApi({pool})});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, {as, body} = {}) => {
    const res = await fetch(base + path, {method, headers: {...(as ? {Authorization: 'Bearer ' + people[as]} : {}), ...(body ? {'Content-Type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined});
    return {status: res.status, body: res.status === 204 ? null : await res.json()};
  };
  return {pool, call};
}

test('the map is for people whose porch light is on; each sees their own home marked', needsDatabase, async t => {
  const {call} = await street(t);
  assert.equal((await call('GET', '/api/streets/1')).status, 401);
  // Homes made before anyone asked get their lot the first time /api/me is asked.
  const me = await call('GET', '/api/me', {as: 'Wren'});
  assert.equal(me.status, 200);
  assert.ok(me.body.home.street && Number.isInteger(me.body.home.lot));
  assert.equal(me.body.home.porch, 'on');
  const again = await call('GET', '/api/me', {as: 'Wren'});
  assert.deepEqual(again.body.home, me.body.home);
  await call('GET', '/api/me', {as: 'Moss'});
  const seen = await call('GET', `/api/streets/${me.body.home.street}`, {as: 'Moss'});
  assert.equal(seen.status, 200);
  assert.equal(seen.body.streets, 1);
  assert.deepEqual(seen.body.homes.map(h => [h.name, !!h.mine]).sort(), [['Moss', true], ['Wren', false]]);
  assert.equal((await call('GET', '/api/streets/7', {as: 'Moss'})).status, 404);
  assert.equal((await call('GET', '/api/streets/abc', {as: 'Moss'})).status, 404);
});

test('the owner sets the light at the door; nothing else is accepted', needsDatabase, async t => {
  const {call} = await street(t);
  const me = (await call('GET', '/api/me', {as: 'Wren'})).body;
  assert.equal((await call('PUT', '/api/home/porch', {body: {porch: 'dim'}})).status, 401);
  assert.equal((await call('PUT', '/api/home/porch', {as: 'Wren', body: {porch: 'bright'}})).status, 400);
  const set = await call('PUT', '/api/home/porch', {as: 'Wren', body: {porch: 'dim'}});
  assert.deepEqual([set.status, set.body], [200, {porch: 'dim'}]);
  const seen = await call('GET', `/api/streets/${me.home.street}`, {as: 'Moss'});
  assert.equal(seen.body.homes.find(h => h.name === 'Wren').porch, 'dim');
  assert.equal((await call('GET', '/api/me', {as: 'Wren'})).body.home.porch, 'dim');
});

// A save with this much of a home in it: what it wears outside, and what opened those.
const saveWearing = home => ({format: 'porchlit-home', version: 1, exportedAt: '2026-10-26T00:00:00.000Z', entries: {'porchlit-home-layout-v1': {furniture: {}, ...home}}});

test('what a home wears outside goes out on the street: kept when it is saved, the seasonal one shown only in season', needsDatabase, async t => {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const wren = await person(pool, 'Wren'), moss = await person(pool, 'Moss'), fern = await person(pool, 'Fern');
  const homes = {wren: await homeFor(pool, wren), moss: await homeFor(pool, moss), fern: await homeFor(pool, fern)};
  for (const id of Object.values(homes)) await placed(pool, id);
  const save = (id, owner, rev, doc) => inTransaction(pool, db => storeSave(db, id, owner, rev, doc));
  // The castle, its folder opened, and the haunted house over it this season.
  await save(homes.wren, wren, 0, saveWearing({shell: 'castle', seasonShell: 'haunted', computer: {solved: {'castle-key': '2026-10-20'}}}));
  // The castle without its key: the cottage.
  await save(homes.moss, moss, 0, saveWearing({shell: 'castle'}));
  const {rows: [{street_id: streetId}]} = await pool.query('select street_id from homes where id = $1', [homes.wren]);
  const street = async (db = pool) => Object.fromEntries((await loadStreet(db, streetId, homes.fern, fern)).homes.map(h => [h.name, h]));
  // What goes out: the everyday shell, and the seasonal one when there is one, whatever the day; the map
  // picks by its own day (so a neighbour's haunted house goes when the season does, even with the map open).
  let homesNow = await street();
  assert.deepEqual([homesNow.Wren.shell, homesNow.Wren.season], ['castle', 'haunted']);
  assert.equal(homesNow.Moss.shell, 'gabledCottage');
  assert.ok(!('season' in homesNow.Moss) && !('season' in homesNow.Fern));
  const shown = (homes, day) => Object.fromEntries(Object.entries(homes).map(([name, h]) => [name, shownShell(h, day)]));
  assert.deepEqual(shown(homesNow, '2026-10-26'), {Wren: 'haunted', Moss: 'gabledCottage', Fern: 'gabledCottage'});
  assert.deepEqual(shown(homesNow, '2026-11-20'), {Wren: 'castle', Moss: 'gabledCottage', Fern: 'gabledCottage'}, 'out of season, the everyday one');
  // Saved again: the rose castle, ninety-nine kisses in.
  await save(homes.moss, moss, 1, saveWearing({shell: 'roseCastle', roses: {n: 99, day: '2026-10-26', today: 9, on: '2026-10-26'}}));
  assert.equal((await street()).Moss.shell, 'roseCastle');
  // Homes saved before the street kept this: read from their saves the first time, then kept.
  await pool.query('update homes set shell = null, season_shell = null where id = any($1::bigint[])', [[homes.wren, homes.moss]]);
  homesNow = await street();
  assert.deepEqual([homesNow.Wren.shell, homesNow.Wren.season, homesNow.Moss.shell], ['castle', 'haunted', 'roseCastle']);
  const {rows: kept} = await pool.query('select shell, season_shell from homes where id = any($1::bigint[]) order by id', [[homes.wren, homes.moss]]);
  assert.deepEqual(kept, [{shell: 'castle', season_shell: 'haunted'}, {shell: 'roseCastle', season_shell: null}]);
  // Their saves can't be read just now: the street still comes, those homes as cottages, and they're tried again next time.
  await pool.query('update homes set shell = null, season_shell = null where id = $1', [homes.wren]);
  const failing = {query: (sql, params) => /from home_saves/.test(sql) ? Promise.reject(new Error('canceling statement due to statement timeout')) : pool.query(sql, params)};
  const quiet = console.error;
  console.error = () => {};
  try {
    homesNow = await street(failing);
  } finally {
    console.error = quiet;
  }
  assert.equal(homesNow.Wren.shell, 'gabledCottage');
  assert.equal(homesNow.Moss.shell, 'roseCastle');
  assert.equal((await street()).Wren.season, 'haunted', 'filled in on the next look');
  // Anything but a shell there is, in a save: the cottage.
  assert.deepEqual(shellsFromSave(saveWearing({shell: 'palace', seasonShell: 'igloo'})), {shell: 'gabledCottage', season: null});
  assert.deepEqual(shellsFromSave(null), {shell: 'gabledCottage', season: null});
});
