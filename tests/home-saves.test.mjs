import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {HISTORY_BUDGET, HISTORY_KEEP, checkSave, keepDeviceCopy, loadHistory, loadHistoryCopy, loadSave, storeSave} from '../server/home-saves.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {newSessionToken, sha256} from '../server/tokens.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

const home = (furniture = {sofa: {x: 1, z: 2}}) => ({
  format: 'porchlit-home',
  version: 1,
  exportedAt: '2026-10-23T00:00:00.000Z',
  entries: {'porchlit-home-layout-v1': {furniture}, 'porchlit-clock-v1': {timeZone: 'Australia/Melbourne'}}
});

test('a save is the transfer box document, checked by the same rules', () => {
  assert.equal(checkSave(home()).format, 'porchlit-home');
  assert.throws(() => checkSave({format: 'porchlit-home', version: 2, entries: {}}), /不是可用的小屋存档/);
  assert.throws(() => checkSave({...home(), entries: {'someone-elses-key': {}}}), /未知或无效/);
  assert.throws(() => checkSave({...home(), entries: {'porchlit-home-layout-v1': {furniture: []}}}), /家具数据不完整/);
  assert.throws(() => checkSave(JSON.parse('{"format":"porchlit-home","version":1,"entries":{"porchlit-clock-v1":{"__proto__":{"x":1}}}}')), /无效字段/);
});

test('saves move forward one revision at a time; a stale write is turned away', needsDatabase, async t => {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const {rows: [{id: owner}]} = await pool.query(`insert into accounts (kind, username, username_key, password_hash) values ('human', 'Wren', 'wren', 'x') returning id`);
  const {rows: [{id: homeId}]} = await pool.query('insert into homes (owner_id) values ($1) returning id', [owner]);
  assert.deepEqual(await loadSave(pool, homeId), {revision: 0, saveId: null, savedAt: null, doc: null});
  const first = await storeSave(pool, homeId, owner, 0, home());
  assert.equal(first.revision, 1);
  assert.ok(first.savedAt instanceof Date);
  assert.equal(await storeSave(pool, homeId, owner, 0, home({}) ), null);
  const second = await storeSave(pool, homeId, owner, 1, home({lamp: {x: 0, z: 0}}));
  assert.equal(second.revision, 2);
  assert.equal(await storeSave(pool, homeId, owner, 1, home()), null);
  const now = await loadSave(pool, homeId);
  assert.equal(now.revision, 2);
  assert.deepEqual(now.doc.entries['porchlit-home-layout-v1'], {furniture: {lamp: {x: 0, z: 0}}});
  // Two devices saving over the same revision at once: one wins.
  const both = await Promise.all([storeSave(pool, homeId, owner, 2, home()), storeSave(pool, homeId, owner, 2, home())]);
  assert.equal(both.filter(Boolean).length, 1);
  assert.equal((await loadSave(pool, homeId)).revision, 3);
});

// A server with one person, their home and a session made straight in the
// database (no password hashing needed, so this runs on any Node).
async function houseWithOwner(t, limits = {}, epoch) {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const {rows: [{id: owner}]} = await pool.query(`insert into accounts (kind, username, username_key, password_hash) values ('human', 'Wren', 'wren', 'x') returning id`);
  await pool.query('insert into homes (owner_id) values ($1)', [owner]);
  const token = newSessionToken();
  await pool.query(`insert into sessions (account_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')`, [owner, sha256(token)]);
  const server = createServer({db: {pool, migrations: await loadMigrations()}, api: createApi({pool, limits, ...(epoch ? {epoch} : {})})});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, {body, auth = true, token: as = token} = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: {...(body === undefined ? {} : {'Content-Type': 'application/json'}), ...(auth ? {Authorization: `Bearer ${as}`} : {})},
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    return {status: res.status, body: text ? JSON.parse(text) : null};
  };
  return {call, pool};
}

test('the save API: read, first save, next save, a stale save, bad saves', needsDatabase, async t => {
  const {call} = await houseWithOwner(t);
  assert.equal((await call('GET', '/api/home/save', {auth: false})).status, 401);
  assert.deepEqual((await call('GET', '/api/home/save')).body, {revision: 0, saveId: null, savedAt: null, doc: null, epoch: '1'});
  assert.equal((await call('GET', '/api/home/revision', {auth: false})).status, 401);
  // With how many acts of AIs living here wait to be let in (server/acts.mjs).
  assert.deepEqual((await call('GET', '/api/home/revision')).body, {revision: 0, saveId: null, savedAt: null, acts: 0, epoch: '1'});
  const first = await call('PUT', '/api/home/save', {body: {revision: 0, doc: home()}});
  assert.equal(first.status, 200);
  assert.equal(first.body.revision, 1);
  assert.deepEqual((await call('GET', '/api/home/revision')).body, {...first.body, acts: 0});
  const read = await call('GET', '/api/home/save');
  assert.equal(read.body.revision, 1);
  assert.deepEqual(read.body.doc, home());
  const stale = await call('PUT', '/api/home/save', {body: {revision: 0, doc: home({})}});
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error.code, 'stale');
  assert.equal(stale.body.current.revision, 1);
  assert.equal((await call('PUT', '/api/home/save', {body: {revision: 1, doc: home({lamp: {x: 0, z: 0}})}})).body.revision, 2);
  for (const body of [{doc: home()}, {revision: -1, doc: home()}, {revision: 1.5, doc: home()}, {revision: '2', doc: home()}]) {
    assert.equal((await call('PUT', '/api/home/save', {body})).status, 400, JSON.stringify(body.revision));
  }
  const wrong = await call('PUT', '/api/home/save', {body: {revision: 2, doc: {format: 'something else'}}});
  assert.equal(wrong.status, 400);
  assert.equal(wrong.body.error.code, 'invalid_save');
  // A save may be large (up to 6 MB), unlike the account requests.
  const big = home(Object.fromEntries(Array.from({length: 20000}, (_, i) => [`piece${i}`, {x: i, z: i}])));
  assert.equal((await call('PUT', '/api/home/save', {body: {revision: 2, doc: big}})).body.revision, 3);
  const tooBig = await call('PUT', '/api/home/save', {body: {revision: 3, doc: home({blob: {data: 'x'.repeat(7 * 1024 * 1024)}})}});
  assert.equal(tooBig.status, 413);
  assert.equal((await call('GET', '/api/home/save')).body.revision, 3);
});

test('saves arriving while the save slots are full are asked to come back', needsDatabase, async t => {
  const {call} = await houseWithOwner(t, {saves: 0});
  const res = await call('PUT', '/api/home/save', {body: {revision: 0, doc: home()}});
  assert.equal(res.status, 503);
  assert.equal(res.body.error.code, 'busy');
  assert.equal((await call('GET', '/api/home/save')).status, 200);
});

test('a save replacing an older one, or replacing on purpose, puts the old one aside', needsDatabase, async t => {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const {rows: [{id: owner}]} = await pool.query(`insert into accounts (kind, username, username_key, password_hash) values ('human', 'Wren', 'wren', 'x') returning id`);
  const {rows: [{id: homeId}]} = await pool.query('insert into homes (owner_id) values ($1) returning id', [owner]);
  const withNote = n => home({sofa: {x: n, z: 0}});
  await storeSave(pool, homeId, owner, 0, withNote(1));
  // Saving again a moment later: nothing put aside (saving every few seconds).
  await storeSave(pool, homeId, owner, 1, withNote(2));
  assert.deepEqual(await loadHistory(pool, homeId), []);
  // Replacing on purpose (a device chose its own copy): the server's is kept.
  await storeSave(pool, homeId, owner, 2, withNote(3), {keep: true});
  let history = await loadHistory(pool, homeId);
  assert.equal(history.length, 1);
  assert.equal(history[0].source, 'server');
  assert.equal(history[0].revision, 2);
  assert.deepEqual((await loadHistoryCopy(pool, homeId, history[0].id)).doc.entries['porchlit-home-layout-v1'].furniture, {sofa: {x: 2, z: 0}});
  // A save over one that's been sitting more than ten minutes: kept too.
  await pool.query(`update home_saves set updated_at = now() - interval '11 minutes'`);
  await storeSave(pool, homeId, owner, 3, withNote(4));
  history = await loadHistory(pool, homeId);
  assert.deepEqual(history.map(h => h.revision), [3, 2]);
  // A stale save keeps nothing and writes nothing.
  assert.equal(await storeSave(pool, homeId, owner, 3, withNote(9), {keep: true}), null);
  assert.equal((await loadHistory(pool, homeId)).length, 2);
  // Two saves over the same revision at once: one wins, one copy is kept.
  const both = await Promise.all([storeSave(pool, homeId, owner, 4, withNote(5), {keep: true}), storeSave(pool, homeId, owner, 4, withNote(6), {keep: true})]);
  assert.equal(both.filter(Boolean).length, 1);
  assert.deepEqual((await loadHistory(pool, homeId)).map(h => h.revision), [4, 3, 2]);
  // A device's own copy, with what's in it counted.
  const device = await keepDeviceCopy(pool, homeId, owner, {...home(), entries: {...home().entries, 'porchlit-home-layout-v1': {furniture: {}, creations: [{kind: 'note'}, {kind: 'bouquet'}, {kind: 'photo'}, [1]]}}});
  history = await loadHistory(pool, homeId);
  assert.equal(history[0].id, device.id);
  assert.equal(history[0].source, 'device');
  assert.equal(history[0].revision, null);
  assert.deepEqual([history[0].works, history[0].notes], [2, 1]);
  // Only the newest few are kept.
  for (let i = 0; i < HISTORY_KEEP + 5; i++) await keepDeviceCopy(pool, homeId, owner, home());
  assert.equal((await loadHistory(pool, homeId)).length, HISTORY_KEEP);
  const {rows: [{n}]} = await pool.query('select count(*)::int as n from home_history');
  assert.equal(n, HISTORY_KEEP);
});

test('the history API: list, one copy, a device’s own copy, and keep on a save', needsDatabase, async t => {
  const {call} = await houseWithOwner(t);
  assert.equal((await call('GET', '/api/home/history', {auth: false})).status, 401);
  assert.deepEqual((await call('GET', '/api/home/history')).body, {versions: []});
  await call('PUT', '/api/home/save', {body: {revision: 0, doc: home({a: {x: 1, z: 1}})}});
  assert.equal((await call('PUT', '/api/home/save', {body: {revision: 1, doc: home(), keep: 'yes'}})).status, 400);
  assert.equal((await call('PUT', '/api/home/save', {body: {revision: 1, doc: home(), keep: true}})).body.revision, 2);
  const list = (await call('GET', '/api/home/history')).body.versions;
  assert.equal(list.length, 1);
  assert.equal(list[0].revision, 1);
  const one = await call('GET', `/api/home/history/${list[0].id}`);
  assert.deepEqual(one.body.version.doc.entries['porchlit-home-layout-v1'].furniture, {a: {x: 1, z: 1}});
  assert.equal((await call('GET', '/api/home/history/999999')).status, 404);
  assert.equal((await call('GET', '/api/home/history/abc')).status, 404);
  const posted = await call('POST', '/api/home/history', {body: {doc: home({b: {x: 2, z: 2}})}});
  assert.equal(posted.status, 201);
  assert.equal(posted.body.version.source, 'device');
  assert.equal((await call('POST', '/api/home/history', {body: {doc: {format: 'nope'}}})).status, 400);
  // Text the database can't hold is the save's problem: 400, not 500.
  const nul = await call('PUT', '/api/home/save', {body: {revision: 2, doc: home({c: {x: 0, z: 0, label: 'a\u0000b'}})}});
  assert.equal(nul.status, 400);
  assert.equal(nul.body.error.code, 'invalid_save');
});

test('someone else cannot read another home’s put-aside copies', needsDatabase, async t => {
  const {call, pool} = await houseWithOwner(t);
  await call('PUT', '/api/home/save', {body: {revision: 0, doc: home()}});
  await call('POST', '/api/home/history', {body: {doc: home()}});
  const [{id}] = (await call('GET', '/api/home/history')).body.versions;
  // A second person with their own home and session.
  const {rows: [{id: other}]} = await pool.query(`insert into accounts (kind, username, username_key, password_hash) values ('human', 'Bo', 'bo', 'x') returning id`);
  await pool.query('insert into homes (owner_id) values ($1)', [other]);
  const token = newSessionToken();
  await pool.query(`insert into sessions (account_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')`, [other, sha256(token)]);
  const theirs = await call('GET', `/api/home/history/${id}`, {token});
  assert.equal(theirs.status, 404);
  assert.deepEqual((await call('GET', '/api/home/history', {token})).body, {versions: []});
});

test('a write can name the save it replaces; a different save with the same number is refused', needsDatabase, async t => {
  const {call, pool} = await houseWithOwner(t);
  const first = (await call('PUT', '/api/home/save', {body: {revision: 0, doc: home()}})).body;
  assert.match(first.saveId, /^[0-9a-f-]{36}$/);
  const second = (await call('PUT', '/api/home/save', {body: {revision: 1, saveId: first.saveId, doc: home({a: {x: 1, z: 1}})}})).body;
  assert.equal(second.revision, 2);
  assert.notEqual(second.saveId, first.saveId);
  // As if the database came back from a backup and revision 2 was written again by someone else.
  await pool.query('update home_saves set save_id = gen_random_uuid()');
  const refused = await call('PUT', '/api/home/save', {body: {revision: 2, saveId: second.saveId, doc: home()}});
  assert.equal(refused.status, 409);
  assert.equal(refused.body.current.revision, 2);
  assert.notEqual(refused.body.current.saveId, second.saveId);
  assert.equal((await call('PUT', '/api/home/save', {body: {revision: 2, saveId: 'nope', doc: home()}})).status, 400);
  // Without a saveId the revision alone decides, as before.
  assert.equal((await call('PUT', '/api/home/save', {body: {revision: 2, doc: home()}})).body.revision, 3);
});

test('history keeps within a size budget; listing reads the counts kept with each copy', needsDatabase, async t => {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const {rows: [{id: owner}]} = await pool.query(`insert into accounts (kind, username, username_key, password_hash) values ('human', 'Wren', 'wren', 'x') returning id`);
  const {rows: [{id: homeId}]} = await pool.query('insert into homes (owner_id) values ($1) returning id', [owner]);
  // Copies of about 3 MB each: only as many as fit the budget stay.
  const big = n => ({...home(), entries: {...home().entries, 'porchlit-home-layout-v1': {furniture: {}, creations: [{kind: 'photo', data: String(n).repeat(3 * 1024 * 1024)}]}}});
  for (let i = 1; i <= 6; i++) await keepDeviceCopy(pool, homeId, owner, big(i));
  const {rows: [{n, total}]} = await pool.query('select count(*)::int as n, sum(bytes)::bigint as total from home_history');
  assert.equal(n, Math.floor(HISTORY_BUDGET / (3 * 1024 * 1024 + 200)));
  assert.ok(Number(total) <= HISTORY_BUDGET);
  const list = await loadHistory(pool, homeId);
  assert.deepEqual([list[0].works, list[0].notes], [1, 0]);
  // The newest are the ones kept.
  assert.equal((await loadHistoryCopy(pool, homeId, list[0].id)).doc.entries['porchlit-home-layout-v1'].creations[0].data[0], '6');
});

test('copies kept on purpose are limited per hour: past the limit, such a save waits', needsDatabase, async t => {
  const {call} = await houseWithOwner(t, {keeps: {limit: 2, window: 60_000}});
  await call('PUT', '/api/home/save', {body: {revision: 0, doc: home()}});
  for (let r = 1; r <= 2; r++) assert.equal((await call('PUT', '/api/home/save', {body: {revision: r, doc: home({n: {x: r, z: 0}}), keep: true}})).body.revision, r + 1);
  const waits = await call('PUT', '/api/home/save', {body: {revision: 3, doc: home(), keep: true}});
  assert.equal(waits.status, 429);
  assert.equal((await call('GET', '/api/home/save')).body.revision, 3, 'nothing replaced');
  // An ordinary save still goes through.
  assert.equal((await call('PUT', '/api/home/save', {body: {revision: 3, doc: home()}})).body.revision, 4);
  assert.equal((await call('GET', '/api/home/history')).body.versions.length, 2);
  const refused = await call('POST', '/api/home/history', {body: {doc: home()}});
  assert.equal(refused.status, 429);
});

test('copies put aside on purpose outlast routine ones in the size budget', needsDatabase, async t => {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const {rows: [{id: owner}]} = await pool.query(`insert into accounts (kind, username, username_key, password_hash) values ('human', 'Wren', 'wren', 'x') returning id`);
  const {rows: [{id: homeId}]} = await pool.query('insert into homes (owner_id) values ($1) returning id', [owner]);
  const big = n => ({...home(), entries: {...home().entries, 'porchlit-home-layout-v1': {furniture: {}, creations: [{kind: 'photo', data: String(n).repeat(3 * 1024 * 1024)}]}}});
  // A device hands its copy over (on purpose)...
  await keepDeviceCopy(pool, homeId, owner, big(0));
  // ...then many routine copies (saves over ones that sat ten minutes).
  await storeSave(pool, homeId, owner, 0, big(1));
  for (let r = 1; r <= 6; r++) {
    await pool.query(`update home_saves set updated_at = now() - interval '11 minutes'`);
    await storeSave(pool, homeId, owner, r, big(r + 1));
  }
  const kept = await pool.query('select on_purpose from home_history order by kept_at desc, id desc');
  assert.ok(kept.rows.some(r => r.on_purpose), 'the copy handed over on purpose is still there');
  const {rows: [{total}]} = await pool.query('select sum(bytes)::bigint as total from home_history');
  assert.ok(Number(total) <= HISTORY_BUDGET);
});

test('the save epoch comes back with every save answer', needsDatabase, async t => {
  const {call} = await houseWithOwner(t, {}, '2026-10-24-restore');
  const put = await call('PUT', '/api/home/save', {body: {revision: 0, doc: home()}});
  assert.equal(put.body.epoch, '2026-10-24-restore');
  assert.equal((await call('GET', '/api/home/save')).body.epoch, '2026-10-24-restore');
  assert.equal((await call('GET', '/api/home/revision')).body.epoch, '2026-10-24-restore');
  const stale = await call('PUT', '/api/home/save', {body: {revision: 0, doc: home()}});
  assert.equal(stale.body.current.epoch, '2026-10-24-restore');
});
