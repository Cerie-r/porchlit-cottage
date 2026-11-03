import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {oursAccounts} from '../server/ours.mjs';
import {reportProblem} from '../server/reports.mjs';
import {placeHome} from '../server/streets.mjs';
import {newSessionToken, sha256} from '../server/tokens.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

process.env.TZ = 'Australia/Melbourne';
const today = new Date().toISOString().slice(0, 10);
const doll = {kind: 'animal', name: '团子', species: 'rabbit', fur: '#f6f1e9', id: 'abc', location: 'room', position: [1, 0, 2], rotationY: 1, floor: '1F', madeOn: '2026-10-24', by: {kind: 'guest', name: 'Someone else'}};

test('a report has a reason, and a few words or none', () => {
  assert.equal(reportProblem({reason: 'harass'}), null);
  assert.equal(reportProblem({reason: 'other', words: '  一直来  '}), null);
  for (const bad of [{}, {reason: 'boring'}, {reason: 'spam', words: '字'.repeat(201)}, {reason: 'adult', words: 3}, {reason: 'adult', words: 'a\u0000b'}]) assert.ok(reportProblem(bad), JSON.stringify(bad));
});

// Wren runs the place; Moss, Fern and Wren have homes on the street, signed in by sessions made in the database.
async function street(t) {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const people = {}, homes = {}, ids = {};
  for (const [name, nickname] of [['Wren', ''], ['Moss', '苔'], ['Fern', '']]) {
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
    ids[name] = String(id);
  }
  const ours = oursAccounts('Wren');
  const server = createServer({db: {pool, migrations: await loadMigrations()}, api: createApi({pool, ours}), ours});
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
  const at = name => ({street: Number(homes[name].street), lot: Number(homes[name].lot)});
  return {pool, call, door, at, ids};
}

test('what was left at one\'s door is reported with a copy of it, and its sender blocked', needsDatabase, async t => {
  const {call, door} = await street(t);
  assert.equal((await call('POST', door('Fern') + '/mail', {as: 'Moss', body: {day: today, requestId: crypto.randomUUID(), note: '开门开门开门', item: doll}})).status, 201);
  assert.equal((await call('POST', door('Fern') + '/knock', {as: 'Moss', body: {day: today}})).status, 201);
  const own = (await call('GET', '/api/home/door', {as: 'Fern'})).body;
  const mail = own.waiting.find(w => w.kind === 'mail'), knock = own.book.find(b => b.kind === 'knock');
  // Not one's own door's, not a reason, not signed in.
  assert.equal((await call('POST', '/api/reports', {as: 'Wren', body: {visit: mail.id, reason: 'harass'}})).status, 404);
  assert.equal((await call('POST', '/api/reports', {as: 'Fern', body: {visit: mail.id, reason: 'mean'}})).status, 400);
  assert.equal((await call('POST', '/api/reports', {body: {visit: mail.id, reason: 'harass'}})).status, 401);
  const reported = await call('POST', '/api/reports', {as: 'Fern', body: {visit: mail.id, reason: 'harass', words: ' 天天来 '}});
  assert.equal(reported.status, 201);
  assert.equal(reported.body.blocked.name, 'Moss');
  assert.equal((await call('POST', '/api/reports', {as: 'Fern', body: {visit: mail.id, reason: 'spam'}})).body.error.code, 'already');
  // Turned away at the door, marked in the guestbook; the knock can be reported too.
  const after = (await call('GET', '/api/home/door', {as: 'Fern'})).body;
  assert.equal(after.waiting.length, 0);
  assert.ok(after.book.find(b => b.id === mail.id).reported);
  assert.equal((await call('POST', '/api/reports', {as: 'Fern', body: {visit: knock.id, reason: 'other'}})).status, 201);
  // Moss now finds an empty lot there.
  assert.equal((await call('GET', `${door('Fern')}?day=${today}`, {as: 'Moss'})).status, 404);
  // The running home reads them, with what was left as it was.
  assert.equal((await call('GET', '/api/keeper/reports', {as: 'Fern'})).status, 403);
  const {open} = (await call('GET', '/api/keeper/reports', {as: 'Wren'})).body;
  assert.equal(open.length, 2);
  const first = open[0];
  assert.equal(first.what, 'visit');
  assert.equal(first.reason, 'harass');
  assert.equal(first.words, '天天来');
  assert.deepEqual(first.from, {name: 'Fern', nickname: ''});
  assert.deepEqual(first.about, {id: first.about.id, name: 'Moss', nickname: '苔'});
  assert.equal(first.copy.note, '开门开门开门');
  assert.equal(first.copy.item.name, '团子');
  assert.equal(first.copy.kind, 'mail');
  assert.equal(open[1].copy.kind, 'knock');
  assert.equal((await call('GET', '/api/keeper/reports', {as: 'Wren'})).body.openCount, 2);
  // Only the running home hears how many wait.
  assert.deepEqual((await call('GET', '/api/me', {as: 'Wren'})).body.keeper, {reports: 2, waiting: 0});
  assert.equal((await call('GET', '/api/me', {as: 'Fern'})).body.keeper, undefined);
});

test('a photo comes with the report itself, not the list; something already turned away is reported as emptied', needsDatabase, async t => {
  const {call, door} = await street(t);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  assert.equal((await call('POST', door('Fern') + '/mail', {as: 'Moss', body: {day: today, requestId: crypto.randomUUID(), item: {kind: 'photo', name: '窗外', mode: 'free', image: png}}})).status, 201);
  assert.equal((await call('POST', door('Wren') + '/mail', {as: 'Moss', body: {day: today, requestId: crypto.randomUUID(), note: '不收就算了'}})).status, 201);
  const photo = (await call('GET', '/api/home/door', {as: 'Fern'})).body.waiting[0];
  assert.equal((await call('POST', '/api/reports', {as: 'Fern', body: {visit: photo.id, reason: 'adult'}})).status, 201);
  const note = (await call('GET', '/api/home/door', {as: 'Wren'})).body.waiting[0];
  assert.equal((await call('POST', `/api/home/door/${note.id}/decline`, {as: 'Wren'})).status, 200);
  assert.equal((await call('POST', '/api/reports', {as: 'Wren', body: {visit: note.id, reason: 'harass', words: '纸条上骂人'}})).status, 201);
  const {open} = (await call('GET', '/api/keeper/reports', {as: 'Wren'})).body;
  const listed = open.find(r => r.copy.item?.kind === 'photo'), emptied = open.find(r => r.copy.emptied);
  assert.equal(listed.copy.item.photo, true);
  assert.equal(listed.copy.item.image, undefined);
  assert.equal((await call('GET', '/api/keeper/reports/' + listed.id, {as: 'Fern'})).status, 403);
  assert.equal((await call('GET', '/api/keeper/reports/' + listed.id, {as: 'Wren'})).body.report.copy.item.image, png);
  assert.equal((await call('GET', '/api/keeper/reports/999999', {as: 'Wren'})).status, 404);
  assert.equal(emptied.copy.note, undefined);
  assert.equal(emptied.copy.status, 'declined');
  assert.equal(emptied.words, '纸条上骂人');
});

test('a home met on the street can be reported; its owner can\'t come to the reporter\'s door after', needsDatabase, async t => {
  const {call, door, at} = await street(t);
  assert.equal((await call('POST', '/api/reports', {as: 'Fern', body: {door: at('Fern'), reason: 'adult'}})).body.error.code, 'own_door');
  assert.equal((await call('POST', '/api/reports', {as: 'Fern', body: {door: {street: 1, lot: 64}, reason: 'adult'}})).status, 400);
  const reported = await call('POST', '/api/reports', {as: 'Fern', body: {door: at('Moss'), reason: 'adult', words: '门牌上的字'}});
  assert.equal(reported.status, 201);
  assert.equal(reported.body.blocked.name, 'Moss');
  assert.equal((await call('POST', '/api/reports', {as: 'Fern', body: {door: at('Moss'), reason: 'spam'}})).body.error.code, 'already');
  assert.equal((await call('GET', `${door('Fern')}?day=${today}`, {as: 'Moss'})).status, 404);
  const [report] = (await call('GET', '/api/keeper/reports', {as: 'Wren'})).body.open;
  assert.equal(report.what, 'home');
  assert.deepEqual(report.copy, {name: 'Moss', nickname: '苔', porch: 'on'});
});

test('the running home closes a report: nothing wrong, or the account switched off, and back on', needsDatabase, async t => {
  const {pool, call, door, at, ids} = await street(t);
  // Moss leaves a note at Fern's and reports Fern's home; Fern reports the note, Wren Moss's home. (Each report
  // blocks, so the order matters: a blocked reporter finds an empty lot.)
  assert.equal((await call('POST', door('Fern') + '/mail', {as: 'Moss', body: {day: today, requestId: crypto.randomUUID(), note: '哼'}})).status, 201);
  assert.equal((await call('POST', '/api/reports', {as: 'Moss', body: {door: at('Fern'), reason: 'other'}})).status, 201);
  const note = (await call('GET', '/api/home/door', {as: 'Fern'})).body.waiting[0];
  assert.equal((await call('POST', '/api/reports', {as: 'Fern', body: {visit: note.id, reason: 'harass'}})).status, 201);
  assert.equal((await call('POST', '/api/reports', {as: 'Wren', body: {door: at('Moss'), reason: 'harass'}})).status, 201);
  let {open} = (await call('GET', '/api/keeper/reports', {as: 'Wren'})).body;
  const aboutMoss = open.filter(r => r.about.name === 'Moss'), aboutFern = open.find(r => r.about.name === 'Fern');
  assert.equal((await call('POST', `/api/keeper/reports/${aboutFern.id}/fine`, {as: 'Fern'})).status, 403);
  const fine = await call('POST', `/api/keeper/reports/${aboutFern.id}/fine`, {as: 'Wren'});
  assert.equal(fine.body.report.outcome, 'fine');
  assert.equal((await call('GET', '/api/me', {as: 'Wren'})).body.keeper.reports, 2);
  // Switched off: signed out everywhere, gone from the street, and every report about it closed.
  const off = await call('POST', `/api/keeper/reports/${aboutMoss[0].id}/disable`, {as: 'Wren'});
  assert.equal(off.body.report.outcome, 'disabled');
  assert.equal(off.body.report.about.disabled, true);
  assert.equal((await call('GET', '/api/me', {as: 'Moss'})).status, 401);
  assert.equal((await call('GET', `${door('Moss')}?day=${today}`, {as: 'Wren'})).status, 404);
  ({open} = (await call('GET', '/api/keeper/reports', {as: 'Wren'})).body);
  assert.equal(open.length, 0);
  const {closed} = (await call('GET', '/api/keeper/reports', {as: 'Wren'})).body;
  assert.deepEqual(closed.map(r => r.outcome).sort(), ['disabled', 'disabled', 'fine']);
  // Back on: the home is back on the street, and the reports count as nothing wrong after all.
  const back = await call('POST', `/api/keeper/reports/${aboutMoss[0].id}/undo`, {as: 'Wren'});
  assert.equal(back.body.report.outcome, 'fine');
  assert.equal(back.body.report.about.disabled, undefined);
  const {rows: [moss]} = await pool.query('select disabled_at from accounts where id = $1', [ids.Moss]);
  assert.equal(moss.disabled_at, null);
  assert.equal((await call('GET', `${door('Moss')}?day=${today}`, {as: 'Wren'})).status, 200);
  assert.equal((await call('POST', '/api/keeper/reports/999999/fine', {as: 'Wren'})).status, 404);
  // Switched back on by mistake: off again from the same report.
  const again = await call('POST', `/api/keeper/reports/${aboutMoss[0].id}/disable`, {as: 'Wren'});
  assert.equal(again.body.report.outcome, 'disabled');
  assert.equal(again.body.report.about.disabled, true);
  assert.equal((await call('POST', `/api/keeper/reports/${aboutMoss[0].id}/undo`, {as: 'Wren'})).body.report.about.disabled, undefined);
  // The running home itself is never switched off.
  assert.equal((await call('POST', '/api/reports', {as: 'Fern', body: {door: at('Wren'), reason: 'other'}})).status, 201);
  const aboutWren = (await call('GET', '/api/keeper/reports', {as: 'Wren'})).body.open.find(r => r.about.name === 'Wren');
  assert.equal((await call('POST', `/api/keeper/reports/${aboutWren.id}/disable`, {as: 'Wren'})).body.error.code, 'keeper');
});

test('two at once about the same account wait for each other', needsDatabase, async t => {
  const {call, at} = await street(t);
  for (const reporter of ['Fern', 'Wren']) assert.equal((await call('POST', '/api/reports', {as: reporter, body: {door: at('Moss'), reason: 'spam'}})).status, 201);
  const [a, b] = (await call('GET', '/api/keeper/reports', {as: 'Wren'})).body.open;
  for (let round = 0; round < 3; round++) {
    const off = await Promise.all([a, b].map(r => call('POST', `/api/keeper/reports/${r.id}/disable`, {as: 'Wren'})));
    assert.deepEqual(off.map(r => r.status), [200, 200]);
    const on = await Promise.all([a, b].map(r => call('POST', `/api/keeper/reports/${r.id}/undo`, {as: 'Wren'})));
    assert.deepEqual(on.map(r => r.status), [200, 200]);
  }
});
