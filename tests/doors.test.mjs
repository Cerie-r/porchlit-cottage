import {randomUUID} from 'node:crypto';
import {checkGift} from '../src/door-gifts.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {ITEM_LIMIT, NOTE_MAX, cleanItem, dayProblem, itemProblem, noteProblem} from '../server/doors.mjs';
import {placeHome} from '../server/streets.mjs';
import {newSessionToken, sha256} from '../server/tokens.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

// Run east of Greenwich, wherever the tests run: that's where a door's day read back as a date at local
// midnight came out a day early (see the days at Wren's door below).
process.env.TZ = 'Australia/Melbourne';

const today = new Date().toISOString().slice(0, 10);
const shift = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const doll = {kind: 'animal', name: '团子', species: 'rabbit', fur: '#f6f1e9', id: 'abc', location: 'room', position: [1, 0, 2], rotationY: 1, floor: '1F', madeOn: '2026-10-24', by: {kind: 'guest', name: 'Someone else'}};

test('a day is today give or take one, written as a date', () => {
  assert.equal(dayProblem(today), null);
  assert.equal(dayProblem(shift(-1)), null);
  assert.equal(dayProblem(shift(1)), null);
  for (const bad of [shift(-3), shift(3), '2026-02-30', '2026-1-1', '', null, 20261024]) assert.ok(dayProblem(bad), String(bad));
});

test('a note is short words; a thing is one of the kinds, not too big, and leaves its place behind', () => {
  assert.equal(noteProblem(undefined), null);
  assert.equal(noteProblem('  '), null);
  assert.equal(noteProblem('路过，送你一只兔子'), null);
  assert.ok(noteProblem('字'.repeat(NOTE_MAX + 1)));
  assert.ok(noteProblem(42));
  assert.equal(itemProblem(null), null);
  assert.equal(itemProblem(doll), null);
  for (const bad of [{...doll, kind: 'note'}, {...doll, kind: undefined}, {...doll, name: ' '}, [], 'x', {kind: 'photo', name: '画', image: 'javascript:alert(1)'}]) assert.ok(itemProblem(bad), JSON.stringify(bad).slice(0, 40));
  assert.equal(itemProblem({kind: 'photo', name: '画', mode: 'free', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}), null);
  assert.ok(itemProblem({...doll, padding: 'x'.repeat(ITEM_LIMIT)}));
  assert.deepEqual(cleanItem(doll), checkGift(doll));
});

// Two people with homes on the map, signed in by sessions made in the database.
async function street(t) {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const people = {}, homes = {};
  for (const [name, nickname] of [['Wren', '小雀'], ['Moss', '']]) {
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
  return {pool, call, door, homes};
}

test('a visitor knocks once a day at a lit door, never at their own', needsDatabase, async t => {
  const {call, door} = await street(t);
  assert.equal((await call('POST', door('Wren') + '/knock', {body: {day: today}})).status, 401);
  const before = await call('GET', `${door('Wren')}?day=${today}`, {as: 'Moss'});
  assert.deepEqual([before.status, before.body], [200, {name: 'Wren', nickname: '小雀', porch: 'on', knocked: false, left: false}]);
  assert.equal((await call('POST', door('Wren') + '/knock', {as: 'Moss', body: {day: today}})).status, 201);
  const again = await call('POST', door('Wren') + '/knock', {as: 'Moss', body: {day: today}});
  assert.deepEqual([again.status, again.body.error.code], [409, 'already']);
  assert.equal((await call('GET', `${door('Wren')}?day=${today}`, {as: 'Moss'})).body.knocked, true);
  assert.equal((await call('POST', door('Wren') + '/knock', {as: 'Moss', body: {day: shift(1)}})).status, 409, 'changing the client day does not reset the rolling limit');
  assert.equal((await call('POST', door('Wren') + '/knock', {as: 'Wren', body: {day: today}})).body.error.code, 'own_door');
  assert.equal((await call('GET', door('Wren'), {as: 'Wren'})).body.mine, true);
  assert.equal((await call('POST', door('Wren') + '/knock', {as: 'Moss', body: {day: shift(5)}})).status, 400);
  assert.equal((await call('GET', '/api/doors/999/3', {as: 'Moss'})).status, 404);
  assert.equal((await call('GET', '/api/doors/1/64', {as: 'Moss'})).status, 404);
  // A small light left on, or none: no knocking.
  for (const porch of ['dim', 'dnd', 'off']) {
    await call('PUT', '/api/home/porch', {as: 'Wren', body: {porch}});
    const shut = await call('POST', door('Wren') + '/knock', {as: 'Moss', body: {day: shift(-1)}});
    assert.deepEqual([shut.status, shut.body.error.code], [403, 'not_open'], porch);
  }
});

test('something left in the mailbox waits for the owner, who takes it in or not', needsDatabase, async t => {
  const {call, door, pool} = await street(t);
  const mail = (as, body) => call('POST', door('Wren') + '/mail', {as, body: {requestId: randomUUID(), ...body}});
  assert.equal((await mail('Moss', {day: today})).status, 400, 'nothing to leave');
  assert.equal((await mail('Moss', {day: today, item: {...doll, kind: 'note'}})).status, 400);
  assert.equal((await mail('Moss', {day: today, note: '路过，送你一只兔子', item: doll})).status, 201);
  assert.equal((await mail('Moss', {day: today, note: '再来一个'})).body.error.code, 'already');
  assert.equal((await mail('Moss', {day: shift(-1), note: '昨天想放的纸条'})).status, 409);
  await pool.query("update door_visits set created_at = now() - interval '21 hours'");
  assert.equal((await mail('Moss', {day: shift(-1), note: '昨天想放的纸条'})).status, 201);
  assert.equal((await call('GET', `${door('Wren')}?day=${today}`, {as: 'Moss'})).body.left, true);
  await call('POST', door('Wren') + '/knock', {as: 'Moss', body: {day: today}});

  assert.equal((await call('GET', '/api/home/door', {as: 'Moss'})).body.waiting.length, 0, 'nothing at Moss\'s door');
  const {body: at} = await call('GET', '/api/home/door', {as: 'Wren'});
  assert.equal(at.waiting.length, 3);
  // The days are the days they were left on, wherever the server is (east of Greenwich a date read as midnight
  // there came out a day early).
  assert.deepEqual(at.waiting.map(w => w.day).sort(), [shift(-1), today, today].sort());
  const gift = at.waiting.find(w => w.item);
  assert.deepEqual(gift.from, {name: 'Moss', nickname: ''});
  assert.equal(gift.note, '路过，送你一只兔子');
  assert.deepEqual(gift.item, checkGift(doll), 'where it stood in Moss\'s home stays there');
  assert.equal(at.book.length, 3);
  assert.ok(at.book.every(b => !('item' in b)), 'the guestbook names things without carrying them');
  assert.equal(at.book.find(b => b.id === gift.id).itemName, '团子');

  assert.equal((await call('POST', `/api/home/door/${gift.id}/take`, {as: 'Moss'})).status, 404, 'only the owner takes things in');
  const took = await call('POST', `/api/home/door/${gift.id}/take`, {as: 'Wren'});
  assert.deepEqual([took.status, took.body.status, took.body.item.name], [200, 'taken', '团子']);
  const twice = await call('POST', `/api/home/door/${gift.id}/take`, {as: 'Wren'});
  assert.deepEqual([twice.status, twice.body.item.name], [200, '团子'], 'asking again gives it again');
  assert.equal((await call('POST', `/api/home/door/${gift.id}/decline`, {as: 'Wren'})).body.error.code, 'taken');

  const note = at.waiting.find(w => w.kind === 'mail' && !w.item);
  const turned = await call('POST', `/api/home/door/${note.id}/decline`, {as: 'Wren'});
  assert.deepEqual([turned.status, turned.body.status], [200, 'declined']);
  assert.equal((await call('POST', `/api/home/door/${note.id}/take`, {as: 'Wren'})).body.error.code, 'declined');

  assert.deepEqual((await call('POST', '/api/home/door/knocks', {as: 'Wren'})).body, {seen: 1});
  const after = (await call('GET', '/api/home/door', {as: 'Wren'})).body;
  assert.equal(after.waiting.length, 1, 'taken parcel stays recoverable until the home is saved');
  const doc = {format: 'porchlit-home', version: 1, entries: {'porchlit-home-layout-v1': {furniture: {}, mailReceipts: [gift.id]}}};
  assert.equal((await call('PUT', '/api/home/save', {as: 'Wren', body: {revision: 0, doc}})).status, 200);
  assert.equal((await call('GET', '/api/home/door', {as: 'Wren'})).body.waiting.length, 0);
  assert.deepEqual(after.book.map(b => b.status).sort(), ['declined', 'seen', 'taken']);
});


test('mail retries are idempotent, changed content is refused, and stale saves do not acknowledge delivery', needsDatabase, async t => {
  const {call, door, pool} = await street(t);
  const requestId = randomUUID(), payload = {day: today, requestId, item: doll, note: '送你'};
  const send = body => call('POST', door('Wren') + '/mail', {as: 'Moss', body});
  const replies = await Promise.all([send(payload), send(payload)]);
  assert.deepEqual(replies.map(r => r.status), [201, 201]);
  assert.equal((await pool.query("select count(*)::int n from door_visits where kind='mail'")).rows[0].n, 1);
  assert.equal((await send({...payload, note:'changed'})).body.error.code,'request_changed');
  await call('PUT','/api/home/porch',{as:'Wren',body:{porch:'dim'}});
  assert.equal((await send(payload)).status,201,'a successful retry still succeeds after the door closes');
  let own = (await call('GET','/api/home/door',{as:'Wren'})).body;
  const gift=own.waiting[0];
  assert.equal((await call('POST',`/api/home/door/${gift.id}/take`,{as:'Wren'})).status,200);
  const doc={format:'porchlit-home',version:1,entries:{'porchlit-home-layout-v1':{furniture:{},mailReceipts:[]}}};
  assert.equal((await call('PUT','/api/home/save',{as:'Wren',body:{revision:0,doc}})).status,200);
  doc.entries['porchlit-home-layout-v1'].mailReceipts=[gift.id];
  assert.equal((await call('PUT','/api/home/save',{as:'Wren',body:{revision:0,doc}})).status,409);
  assert.equal((await call('GET','/api/home/door',{as:'Wren'})).body.waiting.length,1);
  assert.equal((await call('PUT','/api/home/save',{as:'Wren',body:{revision:1,doc}})).status,200);
  assert.equal((await call('GET','/api/home/door',{as:'Wren'})).body.waiting.length,0);
  const replay=(await call('POST',`/api/home/door/${gift.id}/take`,{as:'Wren'})).body;
  assert.equal(replay.delivered,true);assert.equal(replay.item,undefined);
});

test('bad gifts and invalid text never reach the mailbox; declined bodies are stripped', needsDatabase, async t => {
 const {call,door,pool}=await street(t);
 const send=body=>call('POST',door('Wren')+'/mail',{as:'Moss',body:{day:today,requestId:randomUUID(),...body}});
 for(const item of [{...doll,species:'constructor'},{kind:'bouquet',name:'花',stems:[null]},{kind:'build',name:'x',parts:{}}]) assert.equal((await send({item})).status,400);
 assert.equal((await send({note:'bad\u0000'})).status,400);
 assert.equal((await send({item:doll})).status,201);
 const gift=(await call('GET','/api/home/door',{as:'Wren'})).body.waiting[0];
 assert.equal((await call('POST',`/api/home/door/${gift.id}/decline`,{as:'Wren'})).status,200);
 const row=(await pool.query('select item,note,item_name from door_visits where id=$1',[gift.id])).rows[0];
 assert.deepEqual(row,{item:null,note:null,item_name:'团子'});
});

test('a full mailbox refuses new parcels and disabled senders disappear', needsDatabase, async t => {
 const {call,door,pool}=await street(t);
 const {rows:[home]}=await pool.query("select h.id home_id, a.id visitor_id from homes h join accounts owner on owner.id=h.owner_id cross join accounts a where owner.username='Wren' and a.username='Moss'");
 await pool.query("insert into door_visits(home_id,visitor_id,kind,day,visitor_name,note,created_at) select $1,$2,'mail',current_date-n,'Moss','hello',now()-interval '40 hours' from generate_series(1,30) n",[home.home_id,home.visitor_id]);
 const result=await call('POST',door('Wren')+'/mail',{as:'Moss',body:{day:today,requestId:randomUUID(),note:'one more'}});
 assert.equal(result.body.error.code,'mailbox_full');
 assert.equal((await call('GET','/api/home/door',{as:'Wren'})).body.waiting.length,30);
 await pool.query('update accounts set disabled_at=now() where id=$1',[home.visitor_id]);
 const hidden=(await call('GET','/api/home/door',{as:'Wren'})).body;
 assert.equal(hidden.waiting.length,0);assert.equal(hidden.book.length,0);
});
