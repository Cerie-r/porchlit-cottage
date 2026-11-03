import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {oursAccounts} from '../server/ours.mjs';
import {OPENED_A_DAY} from '../server/bottles.mjs';
import {storeSave} from '../server/home-saves.mjs';
import {placeHome} from '../server/streets.mjs';
import {newSessionToken, sha256} from '../server/tokens.mjs';
import {awaitBottles, bottleAnswer, bottleDiary, bottleNote, bottlesIn, cleanBottles, findKey, isFindKey, openBottle, threwBottle, thrownToday, wordsProblem, WORDS_MAX} from '../src/bottles.js';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

process.env.TZ = 'Australia/Melbourne';
const today = new Date().toISOString().slice(0, 10);

test('a bottle holds some words, not too many', () => {
  assert.equal(wordsProblem('  今天路过一棵开花的树。  '), null);
  assert.equal(wordsProblem('字'.repeat(WORDS_MAX)), null);
  for (const bad of ['', '   ', '字'.repeat(WORDS_MAX + 1), 3, null, 'a\u0000b']) assert.ok(wordsProblem(bad), JSON.stringify(bad));
});

test('the bottles in a basket are each a find of their own', () => {
  const trip = {day: '2026-10-28', n: 2, basket: [{place: 'lake', id: 'shell'}, {place: 'lake', id: 'message-bottle'}, {place: 'woods', id: 'message-bottle'}, {place: 'lake', id: 'message-bottle'}]};
  assert.deepEqual(bottlesIn(trip), ['2026-10-28#2#1', '2026-10-28#2#3']);
  assert.deepEqual(bottlesIn({...trip, n: 'x'}), []);
  assert.deepEqual(bottlesIn(null), []);
  assert.ok(isFindKey(findKey('2026-10-28', 1, 0)));
  for (const bad of ['2026-10-28#0#1', '2026-10-28#1', '28-10-2026#1#1', '2026-10-28#1#123', 7]) assert.equal(isFindKey(bad), false, String(bad));
});

test('a bottle brought home waits once, and opening it puts the words in the backpack', () => {
  let home = {creations: [], bottles: null};
  home = {...home, bottles: awaitBottles(home.bottles, ['2026-10-28#1#4', '2026-10-28#1#4', 'nope'])};
  assert.deepEqual(home.bottles.waiting, ['2026-10-28#1#4']);
  const found = {id: '17', words: ' 你好，陌生人。 ', thrownOn: '2026-10-20'};
  home = openBottle(home, '2026-10-28#1#4', found, '2026-10-28');
  assert.deepEqual(home.bottles.waiting, []);
  const note = home.creations.find(i => i.id === 'bottle-17');
  assert.deepEqual(note, {id: 'bottle-17', kind: 'note', name: '漂流瓶里的纸条', note: '你好，陌生人。', location: 'bag', slot: 0, bottle: {id: '17', on: '2026-10-28', thrownOn: '2026-10-20'}});
  // Opened already: the same walk coming home again doesn't wait for it again, and opening it again changes nothing.
  assert.deepEqual(awaitBottles(home.bottles, ['2026-10-28#1#4']).waiting, []);
  assert.equal(openBottle(home, '2026-10-28#1#4', found, '2026-10-28'), home);
  // An empty one: nothing in the backpack, a line in the diary.
  home = openBottle({...home, bottles: awaitBottles(home.bottles, ['2026-10-28#2#0'])}, '2026-10-28#2#0', null, '2026-10-28');
  assert.equal(home.creations.length, 1);
  assert.deepEqual(bottleDiary(home.bottles).map(l => l.text), ['拆开湖边捞回来的漂流瓶，里面是一张陌生人写的纸条', '湖边捞回来的瓶子是空的，只倒出来一点沙']);
  // What an AI wrote says so; a bottle the sea can't vouch for isn't a note.
  assert.equal(bottleNote({id: '18', words: '嗨', byMachine: true}, '2026-10-28').bottle.byMachine, true);
  for (const bad of [{id: 'x', words: '嗨'}, {id: '19', words: ''}, {id: '20'}, null]) assert.equal(bottleNote(bad, '2026-10-28'), null);
});

test('what the sea answers for a find: opened, empty, or asked again later; one it won\'t open doesn\'t hold the rest up', () => {
  const bottle = {id: '17', words: '你好', thrownOn: '2026-10-20'};
  assert.deepEqual(bottleAnswer({bottle}), {found: bottle, said: true});
  assert.deepEqual(bottleAnswer({empty: true}), {found: null, said: true});
  // Enough opened today: the find keeps, and is asked again in an hour.
  assert.deepEqual(bottleAnswer({later: true}), {later: 3600000});
  // The sea out of reach, signed out, asked too often: again in a while (as long as it says, when it says).
  assert.deepEqual(bottleAnswer(null, {status: 0, code: 'offline'}), {later: 120000});
  assert.deepEqual(bottleAnswer(null, {status: 401}), {later: 120000});
  assert.deepEqual(bottleAnswer(null, {status: 429, retryAfter: 900}), {later: 900000});
  // Not a find it knows: an empty bottle, nothing said.
  assert.deepEqual(bottleAnswer(null, {status: 400, code: 'invalid'}), {found: null, said: false});
});

test('a bottle thrown is a line in the diary, an AI\'s once for its act', () => {
  let b = threwBottle(null, {day: '2026-10-28'});
  assert.ok(thrownToday(b, '2026-10-28'));
  assert.equal(thrownToday(b, '2026-10-29'), false);
  const act = '7f0c2c1e-8a4b-4c5d-9e6f-0a1b2c3d4e5f';
  b = threwBottle(b, {day: '2026-10-28', by: {kind: 'machine', id: '9', name: '小桦'}, act, words: '写给还不认识的你'});
  b = threwBottle(b, {day: '2026-10-28', by: {kind: 'machine', id: '9', name: '小桦'}, act, words: '写给还不认识的你'});
  assert.equal(b.log.length, 2);
  assert.deepEqual(b.log[1], {day: '2026-10-28', what: 'thrown', act, by: {kind: 'machine', id: '9', name: '小桦'}, words: '写给还不认识的你'});
  // Hers is in the diary; the AI's is in its visit's line (src/machine-acts.js).
  assert.deepEqual(bottleDiary(b).map(l => l.text), ['往海里投了一只漂流瓶']);
  // Odd things in a save don't come through.
  assert.deepEqual(cleanBottles({waiting: ['bad', 4], log: [{day: 'x', what: 'thrown'}, {day: '2026-10-28', what: 'stolen'}]}), {waiting: [], log: []});
});

// Wren runs the place; Moss, Fern and Wren have homes on the street, signed in by sessions made in the database.
async function street(t) {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const people = {}, homes = {}, ids = {};
  for (const name of ['Wren', 'Moss', 'Fern']) {
    const {rows: [{id}]} = await pool.query(`insert into accounts (kind, username, username_key, nickname, password_hash) values ('human', $1, lower($1), '', 'x') returning id`, [name]);
    const {rows: [home]} = await pool.query('insert into homes (owner_id) values ($1) returning id', [id]);
    const client = await pool.connect();
    try {
      await client.query('begin');
      await placeHome(client, home.id);
      await client.query('commit');
    } finally {
      client.release();
    }
    const token = newSessionToken();
    await pool.query(`insert into sessions (account_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')`, [id, sha256(token)]);
    people[name] = token;
    ids[name] = String(id);
    homes[name] = String(home.id);
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
  const toss = (as, words, requestId = crypto.randomUUID(), day = today) => call('POST', '/api/bottles', {as, body: {words, day, requestId}});
  const open = (as, key) => call('POST', '/api/bottles/open', {as, body: {key}});
  // A bottle thrown some days ago (the one-a-day rule is for now): straight into the sea.
  const thrownBefore = async (name, words, daysAgo) => {
    const {rows: [{id}]} = await pool.query(
      `insert into bottles (home_id, writer_id, words, day, thrown_at) values ($1, $2, $3, current_date - $4::int, now() - make_interval(days => $4::int)) returning id`,
      [homes[name], ids[name], words, daysAgo]);
    return String(id);
  };
  return {pool, call, toss, open, thrownBefore, ids, homes};
}

// An AI living in a home; one bottle it asks to throw (queued); her page's save, saying it let these in (or not: ok
// false) by the house's clock.
async function resident(pool, homeId) {
  const {rows: [{id}]} = await pool.query(`insert into accounts (kind, username, username_key, nickname, password_hash) values ('ai', 'Birch', 'birch', '', 'x') returning id`);
  await pool.query('insert into residents (home_id, account_id) values ($1, $2)', [homeId, id]);
  return String(id);
}
async function ask(pool, homeId, ai, text) {
  const {rows: [a]} = await pool.query(`insert into machine_acts (home_id, account_id, tool, action, args, by_name) values ($1, $2, 'write', 'bottle', $3, 'Birch') returning id, key`, [homeId, ai, {text}]);
  return {id: String(a.id), key: a.key};
}
const aiSave = (ai, acts) => ({format: 'porchlit-home', version: 1, entries: {
  'porchlit-home-layout-v1': {machine: {acts: acts.map(a => ({id: a.id, key: a.key, on: today, by: {id: ai, name: 'Birch'}, tool: 'write', action: 'bottle', ok: a.ok !== false, ...(a.ok === false ? {why: '没接进去。'} : {what: '往海里投了一只漂流瓶', said: '瓶子投进海里了。'})}))}},
  'porchlit-clock-v1': {timeZone: 'Australia/Melbourne'}
}});
async function inTransaction(pool, work) {
  const db = await pool.connect();
  try {
    await db.query('begin');
    const r = await work(db);
    await db.query('commit');
    return r;
  } catch (err) {
    await db.query('rollback');
    throw err;
  } finally {
    db.release();
  }
}

test('one bottle a day each, and sending the same one again is the same throw', needsDatabase, async t => {
  const {call, toss} = await street(t);
  assert.equal((await call('POST', '/api/bottles', {body: {words: '嗨', day: today, requestId: crypto.randomUUID()}})).status, 401);
  for (const bad of [{words: '', day: today, requestId: crypto.randomUUID()}, {words: '字'.repeat(1001), day: today, requestId: crypto.randomUUID()}, {words: '嗨', day: '2020-01-01', requestId: crypto.randomUUID()}, {words: '嗨', day: today, requestId: 'x'}]) {
    assert.equal((await call('POST', '/api/bottles', {as: 'Moss', body: bad})).status, 400, JSON.stringify(bad).slice(0, 60));
  }
  const id = crypto.randomUUID();
  const first = await toss('Moss', '  今天路过一棵开花的树，分一点春天给你。 ', id);
  assert.equal(first.status, 201);
  assert.equal(first.body.bottle.day, today);
  // Its answer lost: sent again, the same bottle.
  const again = await toss('Moss', '今天路过一棵开花的树，分一点春天给你。', id);
  assert.equal(again.status, 201);
  assert.equal(again.body.bottle.id, first.body.bottle.id);
  assert.equal((await toss('Moss', '换了几个字', id)).body.error.code, 'request_changed');
  // A second today, by its day; or by the clock, a day sent from ahead (said so, not as today's).
  assert.equal((await toss('Moss', '再来一只')).body.error.code, 'already');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const soon = await toss('Moss', '明天的', crypto.randomUUID(), tomorrow);
  assert.deepEqual([soon.status, soon.body.error.code, soon.body.error.message], [409, 'too_soon', '离上一只还不到二十个小时，晚些再投。']);
  // What has been thrown from one's home, and whether one must wait: today's thrown; the next morning, not twenty
  // hours yet (the desk says so, not that today's is thrown).
  const mine = (await call('GET', `/api/bottles?day=${today}`, {as: 'Moss'})).body;
  assert.equal(mine.wait, 'today');
  assert.deepEqual(mine.thrown.map(b => [b.id, b.words, !!b.found]), [[first.body.bottle.id, '今天路过一棵开花的树，分一点春天给你。', false]]);
  assert.equal((await call('GET', `/api/bottles?day=${tomorrow}`, {as: 'Moss'})).body.wait, 'soon');
  assert.equal((await call('GET', `/api/bottles?day=${today}`, {as: 'Fern'})).body.wait, null);
});

test('a bottle washes up at someone else\'s lake, the oldest first, the same one for the same find', needsDatabase, async t => {
  const {pool, call, toss, open, thrownBefore} = await street(t);
  const older = await thrownBefore('Wren', '我先投的。', 3);
  const newer = (await toss('Moss', '我后投的。')).body.bottle.id;
  // Never one's own: Wren's would be the oldest, but not at Wren's lake.
  const atWren = await open('Wren', `${today}#1#0`);
  assert.equal(atWren.status, 200);
  assert.equal(atWren.body.bottle.id, newer);
  const atFern = await open('Fern', `${today}#1#2`);
  assert.equal(atFern.body.bottle.id, older);
  assert.equal(atFern.body.bottle.words, '我先投的。');
  // Whose it was isn't said.
  assert.ok(!JSON.stringify(atFern.body).includes('Wren'));
  assert.deepEqual(Object.keys(atFern.body.bottle).sort(), ['id', 'thrownOn', 'words']);
  // Asked again (the answer lost on the way): the same bottle. Another find: the sea is empty now.
  assert.equal((await open('Fern', `${today}#1#2`)).body.bottle.id, older);
  assert.deepEqual((await open('Fern', `${today}#2#0`)).body, {empty: true});
  // The writer hears it was found, not where.
  const wren = (await call('GET', `/api/bottles?day=${today}`, {as: 'Wren'})).body;
  assert.equal(wren.thrown[0].found, true);
  assert.ok(!JSON.stringify(wren).includes('Fern'));
  // Not a find: a key that isn't one, or from days ahead.
  for (const key of ['x', `${today}#0#0`, '2099-01-01#1#0']) assert.equal((await open('Fern', key)).status, 400, key);
  // A find left unopened two months is empty, and takes nothing from the sea; one opened before (the answer lost) is
  // still the bottle it was.
  const atSea = await thrownBefore('Wren', '还在海上。', 1);
  const old = new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10);
  assert.deepEqual((await open('Moss', `${old}#1#0`)).body, {empty: true});
  assert.equal((await open('Moss', `${today}#3#0`)).body.bottle.id, atSea);
  await pool.query('update bottles set found_key = $2 where id = $1', [older, `${old}#1#2`]);
  assert.equal((await open('Fern', `${old}#1#2`)).body.bottle.id, older);
});

test('a home opens only a few bottles a day; the next find waits for later', needsDatabase, async t => {
  const {pool, open, thrownBefore} = await street(t);
  for (let i = 0; i < OPENED_A_DAY + 2; i++) await thrownBefore('Moss', `第 ${i} 只`, 10 - i);
  for (let i = 0; i < OPENED_A_DAY; i++) assert.ok((await open('Fern', `${today}#1#${i}`)).body.bottle, String(i));
  // Not an empty bottle: the page keeps that find and asks again later.
  assert.deepEqual((await open('Fern', `${today}#2#0`)).body, {later: true});
  await pool.query(`update bottles set found_at = found_at - interval '21 hours' where found_at is not null`);
  assert.equal((await open('Fern', `${today}#2#0`)).body.bottle.words, `第 ${OPENED_A_DAY} 只`);
  // Wren's lake still gets the rest.
  assert.ok((await open('Wren', `${today}#1#0`)).body.bottle);
});

test('a bottle reported: its writer stays unknown, and no more of theirs wash up there', needsDatabase, async t => {
  const {pool, call, open, thrownBefore} = await street(t);
  const rude = await thrownBefore('Moss', '难听的话。', 3);
  await thrownBefore('Moss', '又一只。', 2);
  await thrownBefore('Wren', 'Wren 的。', 1);
  assert.equal((await open('Fern', `${today}#1#0`)).body.bottle.id, rude);
  // Only the home it washed up at may report it.
  assert.equal((await call('POST', '/api/reports', {as: 'Wren', body: {bottle: rude, reason: 'harass'}})).status, 404);
  const reported = await call('POST', '/api/reports', {as: 'Fern', body: {bottle: rude, reason: 'harass', words: '不舒服'}});
  assert.equal(reported.status, 201);
  assert.deepEqual(Object.keys(reported.body), ['reported']);
  assert.ok(!JSON.stringify(reported.body).includes('Moss'));
  assert.equal((await call('POST', '/api/reports', {as: 'Fern', body: {bottle: rude, reason: 'spam'}})).body.error.code, 'already');
  // Fern's door doesn't list Moss (that would say whose it was); the next bottle at Fern's is Wren's, not Moss's.
  assert.deepEqual((await call('GET', '/api/home/door', {as: 'Fern'})).body.blocked, []);
  assert.equal((await open('Fern', `${today}#1#1`)).body.bottle.words, 'Wren 的。');
  // Moss's other one still washes up elsewhere.
  assert.equal((await open('Wren', `${today}#1#0`)).body.bottle.words, '又一只。');
  // The keeper reads it with the words, and who wrote it.
  const reports = (await call('GET', '/api/keeper/reports', {as: 'Wren'})).body;
  const r = reports.open.find(x => x.what === 'bottle');
  assert.equal(r.copy.note, '难听的话。');
  assert.equal(r.about.name, 'Moss');
  // Switched off, a writer's bottles stay at sea.
  await thrownBefore('Moss', '还在海上。', 4);
  await pool.query(`update accounts set disabled_at = now() where username = 'Moss'`);
  assert.deepEqual((await open('Wren', `${today}#2#0`)).body, {empty: true});
});

test('a bottle a home blocked at its door, or one blocked by the writer\'s home, doesn\'t wash up', needsDatabase, async t => {
  const {pool, open, thrownBefore, ids, homes} = await street(t);
  await thrownBefore('Moss', 'Moss 的。', 2);
  await pool.query('insert into door_blocks (home_id, blocked_id) values ($1, $2)', [homes.Fern, ids.Moss]);
  assert.deepEqual((await open('Fern', `${today}#1#0`)).body, {empty: true});
  await pool.query('insert into door_blocks (home_id, blocked_id) values ($1, $2)', [homes.Moss, ids.Wren]);
  assert.deepEqual((await open('Wren', `${today}#1#0`)).body, {empty: true});
});

test('an AI\'s bottle goes to sea in the save that lets it in, once, saying an AI wrote it', needsDatabase, async t => {
  const {pool, open, homes, ids} = await street(t);
  const ai = await resident(pool, homes.Moss);
  let revision = 0;
  const save = async (...acts) => {
    revision = (await inTransaction(pool, db => storeSave(db, homes.Moss, ids.Moss, revision, aiSave(ai, acts)))).revision;
  };
  await save();
  const first = await ask(pool, homes.Moss, ai, '写给还不认识的你。');
  await save(first);
  const thrown = async () => (await pool.query('select act_id, by_machine, words, writer_id from bottles order by id')).rows.map(r => [String(r.act_id), r.by_machine, r.words, String(r.writer_id)]);
  assert.deepEqual(await thrown(), [[first.id, true, '写给还不认识的你。', ai]]);
  // Saved again: not thrown again.
  await save(first);
  assert.equal((await thrown()).length, 1);
  // One a day for an AI too: a second let in the same day stays out of the sea, and it hears so; one turned away
  // isn't thrown either.
  const second = await ask(pool, homes.Moss, ai, '第二只。'), refused = await ask(pool, homes.Moss, ai, '没接进去的。');
  await save(first, second, {...refused, ok: false});
  assert.equal((await thrown()).length, 1);
  const answer = async a => (await pool.query('select state, answer from machine_acts where id = $1', [a.id])).rows[0];
  assert.deepEqual(await answer(second), {state: 'done', answer: '这一只没投进海里：离上一只还不到一天。'});
  assert.equal((await answer(refused)).state, 'refused');
  // It had its one chance: a day on, saves don't throw it after all (the next one the AI asks for is that day's).
  await pool.query(`update bottles set day = day - 2, thrown_at = thrown_at - interval '2 days'`);
  await save(first, second, {...refused, ok: false});
  assert.equal((await thrown()).length, 1);
  const found = (await open('Fern', `${today}#1#0`)).body.bottle;
  assert.equal(found.byMachine, true);
  assert.equal(found.words, '写给还不认识的你。');
});

test('a save throwing an AI\'s bottle waits for that AI queueing an act, rather than the two waiting on each other', needsDatabase, async t => {
  const {pool, homes, ids} = await street(t);
  const ai = await resident(pool, homes.Moss);
  await inTransaction(pool, db => storeSave(db, homes.Moss, ids.Moss, 0, aiSave(ai, [])));
  const act = await ask(pool, homes.Moss, ai, '写给还不认识的你。');
  const queue = await pool.connect(), save = await pool.connect();
  try {
    // Queueing an act (server/acts.mjs): the AI's row, then the home's. The save comes in between.
    await queue.query('begin');
    await queue.query('select id from accounts where id = $1 for update', [ai]);
    await save.query('begin');
    const saving = storeSave(save, homes.Moss, ids.Moss, 1, aiSave(ai, [act])).then(r => ({r}), err => ({err}));
    await new Promise(r => setTimeout(r, 300));
    await queue.query('select id from homes where id = $1 for update', [homes.Moss]);
    await queue.query('commit');
    const {r, err} = await saving;
    assert.equal(err, undefined, err?.message);
    assert.equal(r.revision, 2);
    await save.query('commit');
  } finally {
    await queue.query('rollback').catch(() => {});
    await save.query('rollback').catch(() => {});
    queue.release();
    save.release();
  }
  assert.equal((await pool.query('select count(*)::int as n from bottles')).rows[0].n, 1);
});
