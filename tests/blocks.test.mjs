import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {placeHome} from '../server/streets.mjs';
import {DoorProblem, visit} from '../server/doors.mjs';
import {newSessionToken, sha256} from '../server/tokens.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

const today = new Date().toISOString().slice(0, 10);

// Three people with homes on one street, signed in by sessions made in the database.
async function street(t) {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const people = {}, homes = {};
  for (const [name, nickname] of [['Wren', '小雀'], ['Moss', '小苔'], ['Fern', '']]) {
    const {rows: [{id}]} = await pool.query(`insert into accounts (kind, username, username_key, nickname, password_hash) values ('human', $1, lower($1), $2, 'x') returning id`, [name, nickname]);
    const {rows: [home]} = await pool.query('insert into homes (owner_id) values ($1) returning id', [id]);
    const client = await pool.connect();
    try {
      await client.query('begin');
      homes[name] = await placeHome(client, home.id);
      await client.query('commit');
    } finally {
      client.release();
    }
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
  const door = name => `/api/doors/${homes[name].street}/${homes[name].lot}`;
  const onStreet = async (as, name) => (await call('GET', `/api/streets/${homes[name].street}`, {as})).body.homes.some(h => h.name === name);
  return {call, door, onStreet};
}

test('someone blocked finds an empty lot where the home was, and nothing of theirs waits at its door', needsDatabase, async t => {
  const {call, door, onStreet} = await street(t);
  await call('POST', door('Wren') + '/knock', {as: 'Moss', body: {day: today}});
  await call('POST', door('Wren') + '/mail', {as: 'Moss', body: {day: today, note: '又来了', requestId: crypto.randomUUID()}});
  await call('POST', door('Wren') + '/mail', {as: 'Fern', body: {day: today, note: '路过', requestId: crypto.randomUUID()}});
  const at = (await call('GET', '/api/home/door', {as: 'Wren'})).body;
  const moss = at.book.find(b => b.from.name === 'Moss');
  assert.deepEqual(at.blocked, []);

  assert.equal((await call('POST', '/api/home/blocks', {as: 'Fern', body: {visit: moss.id}})).status, 404, 'only the owner of the door blocks from it');
  const blocked = await call('POST', '/api/home/blocks', {as: 'Wren', body: {visit: moss.id}});
  assert.equal(blocked.status, 201);
  assert.deepEqual([blocked.body.blocked.name, blocked.body.blocked.nickname], ['Moss', '小苔']);
  assert.equal((await call('POST', '/api/home/blocks', {as: 'Wren', body: {visit: moss.id}})).status, 201, 'twice is once');

  // Moss: an empty lot, no door.
  assert.equal(await onStreet('Moss', 'Wren'), false);
  assert.equal(await onStreet('Fern', 'Wren'), true, 'everyone else still sees it');
  assert.equal((await call('GET', door('Wren'), {as: 'Moss'})).status, 404);
  assert.equal((await call('POST', door('Wren') + '/knock', {as: 'Moss', body: {day: today}})).status, 404);
  assert.equal((await call('POST', door('Wren') + '/mail', {as: 'Moss', body: {day: today, note: '?', requestId: crypto.randomUUID()}})).status, 404);
  // Wren: Moss's things no longer wait; Fern's still do; the list has Moss.
  const after = (await call('GET', '/api/home/door', {as: 'Wren'})).body;
  assert.deepEqual(after.waiting.map(w => w.from.name), ['Fern']);
  assert.deepEqual(after.blocked.map(b => b.name), ['Moss']);
  assert.ok(after.book.filter(b => b.from.name === 'Moss').every(b => b.blocked === true));
  assert.ok(after.book.filter(b => b.from.name === 'Fern').every(b => !b.blocked));

  // Taking the name off the list.
  assert.equal((await call('DELETE', `/api/home/blocks/${after.blocked[0].id}`, {as: 'Fern'})).status, 404);
  assert.equal((await call('DELETE', `/api/home/blocks/${after.blocked[0].id}`, {as: 'Wren'})).status, 204);
  assert.equal(await onStreet('Moss', 'Wren'), true);
  assert.equal((await call('GET', door('Wren'), {as: 'Moss'})).status, 200);
  assert.deepEqual((await call('GET', '/api/home/door', {as: 'Wren'})).body.blocked, []);
});

test('blocked on the way to the door: the visit is turned back as if there were no door', needsDatabase, async t => {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const ids = {};
  for (const name of ['Ivy', 'Rook']) {
    const {rows: [{id}]} = await pool.query(`insert into accounts (kind, username, username_key, nickname, password_hash) values ('human', $1, lower($1), '', 'x') returning id`, [name]);
    const {rows: [home]} = await pool.query('insert into homes (owner_id) values ($1) returning id', [id]);
    ids[name] = {account: id, home: home.id};
  }
  await pool.query('insert into door_blocks (home_id, blocked_id) values ($1, $2)', [ids.Ivy.home, ids.Rook.account]);
  const client = await pool.connect();
  try {
    await client.query('begin');
    await assert.rejects(visit(client, {homeId: ids.Ivy.home, visitor: {id: ids.Rook.account, username: 'Rook', nickname: ''}, kind: 'knock', day: today}), e => e instanceof DoorProblem && e.status === 404);
    await client.query('rollback');
  } finally {
    client.release();
  }
  const {rows: [{n}]} = await pool.query('select count(*)::int as n from door_visits');
  assert.equal(n, 0);
});
