import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {createMcp} from '../server/mcp.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {oursAccounts} from '../server/ours.mjs';
import {accountLimits} from '../server/limits.mjs';
import {DAILY_MAX, WAITING_MAX} from '../server/acts.mjs';
import {newSessionToken, sha256} from '../server/tokens.mjs';
import {applyActs, lapseScenes, pieceAt, playScene} from '../src/machine-acts.js';
import {startTrip} from '../src/explore-trips.js';
import {dayIn} from '../src/hide-and-seek.js';
import {floorPieces} from '../src/furniture-range.js';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

// A stand-in for Argon2, which older Node doesn't have: what is tested here is the queue, not the hashing.
const HASHING = {available: true, hash: async p => 'test$' + p, verify: async (h, p) => h === 'test$' + p, stale: () => false};
const SECRET = 'test-secret-only-for-porchlit-keys';
const DAY = '2026-10-26';
const FURNITURE = Object.fromEntries(Object.keys(floorPieces).map(id => [id, {position: [0, 0, 0], rotationY: 0}]));
Object.assign(FURNITURE, {sofa: {position: [-.62, .43, -.45], rotationY: -Math.PI / 2}, coffeeTable: {position: [-2.4, .34, -.48], rotationY: Math.PI / 2}, rug: {position: [-2.15, .015, -.48], rotationY: 0}});

// Wren's home with Fern (an AI, 小蕨) living in it, and Wren's save as her page last sent it.
async function home(t) {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const people = {};
  for (const name of ['Wren', 'Moss']) {
    const {rows: [{id}]} = await pool.query(`insert into accounts (kind, username, username_key, nickname, password_hash) values ('human', $1, lower($1), '', $2) returning id`, [name, 'test$secret-' + name]);
    await pool.query('insert into homes (owner_id) values ($1)', [id]);
    const token = newSessionToken();
    await pool.query(`insert into sessions (account_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')`, [id, sha256(token)]);
    people[name] = token;
  }
  const ours = oursAccounts('');
  const accounts = accountLimits({signups: {size: 1000, every: 1}});
  const api = createApi({pool, ours, hashing: HASHING, accounts});
  const mcp = createMcp({pool, ours, hashing: HASHING, secret: SECRET, publicUrl: 'https://porchlit.test', accounts});
  const server = createServer({db: {pool, migrations: await loadMigrations()}, api, mcp, ours});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  let n = 1;
  const call = async (name, args, key) => {
    const res = await fetch(base + '/mcp', {method: 'POST', headers: {'Content-Type': 'application/json', ...(key ? {'X-Porchlit-Key': key} : {})}, body: JSON.stringify({jsonrpc: '2.0', id: n++, method: 'tools/call', params: {name, arguments: args}})});
    const body = await res.json();
    return {text: body.result?.content?.[0]?.text ?? '', isError: !!body.result?.isError, body};
  };
  const tools = async key => (await (await fetch(base + '/mcp', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Porchlit-Key': key}, body: JSON.stringify({jsonrpc: '2.0', id: n++, method: 'tools/list'})})).json()).result.tools;
  const http = async (method, path, {as, body} = {}) => {
    const res = await fetch(base + path, {method, headers: {...(as ? {Authorization: 'Bearer ' + people[as]} : {}), ...(body ? {'Content-Type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined});
    return {status: res.status, body: res.status === 204 ? null : await res.json()};
  };
  const signUp = async (username, nickname) => {
    const r = await call('porch', {action: 'sign_up', username, password: 'secret-' + username, ...(nickname ? {nickname} : {})});
    return /token=(pck_[A-Za-z0-9_.-]+)/.exec(r.text)[1];
  };
  const moveIn = async (key, as = 'Wren') => {
    const code = /入住码：([0-9A-Z]{3}-[0-9A-Z]{3})/.exec((await call('porch', {action: 'move_in_code'}, key)).text)[1];
    const opened = await http('POST', '/api/home/move-ins', {as, body: {code}});
    await call('porch', {action: 'move_in_confirm', request: opened.body.request.id}, key);
  };
  const fern = await signUp('Fern', '小蕨');
  await moveIn(fern);
  const layout = {
    version: 4, furniture: structuredClone(FURNITURE),
    creations: [
      {id: 'a1b2c3d4-0000-4000-8000-000000000001', kind: 'animal', species: 'lion', name: '小狮子', location: 'bag', slot: 0},
      {id: 'a1b2c3d4-0000-4000-8000-000000000002', kind: 'bouquet', name: '小雏菊', location: 'bag', slot: 0, stems: []},
      {id: 'b0b0b0b0-0000-4000-8000-000000000003', kind: 'photo', name: '一张相纸', location: 'hide:studyDesk', slot: 1}
    ],
    computer: {notes: [{id: 'hers', text: '她自己的便签'}]},
    hideSeek: {seed: null, book: [], total: 0}
  };
  // Her page's saves, as the porch light sends them: the house's entry, over the revision it last had.
  let revision = 0;
  const save = async next => {
    const r = await http('PUT', '/api/home/save', {as: 'Wren', body: {revision, doc: {format: 'porchlit-home', version: 1, entries: {'porchlit-home-layout-v1': next, 'porchlit-clock-v1': {timeZone: 'Australia/Melbourne'}}}}});
    assert.equal(r.status, 200, JSON.stringify(r.body));
    revision = r.body.revision;
  };
  await save(layout);
  return {pool, call, tools, http, signUp, moveIn, fern, layout, save};
}
const actId = text => /第 (\d+) 件/.exec(text)?.[1];

test('an AI living in a home asks; her page lets it in by the house\'s rules; the save it carries answers', needsDatabase, async t => {
  const {pool, call, tools, http, fern, layout, save} = await home(t);
  const list = await tools(fern);
  assert.deepEqual(list.map(x => x.name), ['porch', 'look', 'place', 'write', 'together', 'dress', 'make', 'outing', 'decorate']);
  assert.deepEqual(list.find(x => x.name === 'look').inputSchema.properties.action.enum, ['summary', 'diary', 'backpack', 'door', 'rooms', 'spots', 'acts', 'wardrobe', 'bench', 'decor', 'guide']);
  // What it looks at before it does anything.
  const rooms = (await call('look', {action: 'rooms'}, fern)).text;
  assert.match(rooms, /客厅（x 0–6\.04，z 0–7\.5）：/);
  assert.match(rooms, /· 沙发（sofa）：在 x 3\.38、z 5\.01，占地 0\.95 × 2\.6，能放 x/);
  const spots = (await call('look', {action: 'spots'}, fern)).text;
  assert.match(spots, /卧室 · 床头柜：bedroom\.nightstand\.slot-1 上抽屉左后（空）/);
  assert.match(spots, /书房 · 书桌：study\.desk\.slot-1 抽屉左后（空）、study\.desk\.slot-2 抽屉右后（放着东西）/);
  const bag = (await call('look', {action: 'backpack'}, fern)).text;
  assert.match(bag, /\[a1b2c3d4-0000-4000-8000-000000000002\] 花「小雏菊」，在背包里/);
  assert.match(bag, /\[b0b0b0b0\] 相纸「一张相纸」，藏在屋里/);
  // Asking: each act is checked against the save and waits.
  const hide = await call('place', {action: 'hide', thing: 'a1b2c3d4-0000-4000-8000-000000000001', spot: 'bedroom.nightstand.slot-2', hints: ['睡前最后拉开的那只'], note: '等你找'}, fern);
  assert.equal(hide.isError, false, hide.text);
  assert.match(hide.text, /^排上了，第 \d+ 件：把「小狮子」藏到卧室 · 床头柜 · 上抽屉右后。\nWren 的页面打开时/);
  const letter = await call('write', {action: 'letter', text: '今天辛苦啦，早点睡。', title: '晚安', spot: 'study.desk.slot-1', hints: '写字的地方'}, fern);
  assert.match(letter.text, /写一封信「晚安」，藏在书房 · 书桌 · 抽屉左后/);
  const move = await call('place', {action: 'move', piece: 'sofa', x: 3.38, z: 4.5, note: '给你看书的光'}, fern);
  assert.match(move.text, /把沙发挪到 x 3\.38、z 4\.50/);
  const sticky = await call('write', {action: 'sticky', text: '记得喝水'}, fern);
  const me = await call('place', {action: 'hide_me', spot: 'quilt'}, fern);
  assert.equal(me.isError, false, me.text);
  // Turned away at once: a taken spot, a thing not in the backpack, a spot already promised, nonsense.
  assert.match((await call('place', {action: 'hide', thing: 'a1b2c3d4-0000-4000-8000-000000000002', spot: 'study.desk.slot-2'}, fern)).text, /已经放着东西/);
  assert.match((await call('place', {action: 'hide', thing: 'b0b0b0b0', spot: 'study.desk.slot-3'}, fern)).text, /不在背包里/);
  assert.match((await call('place', {action: 'hide', thing: 'a1b2c3d4-0000-4000-8000-000000000002', spot: 'study.desk.slot-1'}, fern)).text, /排着的事/);
  assert.match((await call('place', {action: 'move', piece: 'piano', x: 1, z: 1}, fern)).text, /没有这件家具/);
  assert.match((await call('place', {action: 'fly'}, fern)).text, /摆东西能做的/);
  // Her page: what is waiting, oldest first, with who asked, and the save's revision it may go into.
  const handed = (await http('GET', '/api/home/acts', {as: 'Wren'})).body;
  const waiting = handed.acts;
  assert.deepEqual(waiting.map(a => `${a.tool}.${a.action}`), ['place.hide', 'write.letter', 'place.move', 'write.sticky', 'place.hide_me']);
  assert.deepEqual(waiting[0].by, {id: waiting[0].by.id, name: 'Fern', nickname: '小蕨'});
  assert.equal(waiting[0].args.thing, 'a1b2c3d4-0000-4000-8000-000000000001');
  assert.match(waiting[0].key, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.equal(handed.revision, 1);
  assert.equal(typeof handed.saveId, 'string');
  // The page's look at the revision hears how many wait.
  assert.equal((await http('GET', '/api/home/revision', {as: 'Wren'})).body.acts, 5);
  assert.equal((await http('GET', '/api/home/revision', {as: 'Moss'})).body.acts, 0);
  assert.equal((await http('GET', '/api/home/acts', {as: 'Moss'})).body.acts.length, 0, 'only her own home\'s');
  assert.equal((await http('GET', '/api/home/acts')).status, 401);
  // Meanwhile she moved the coffee table, so the sofa can't go where it was asked any more: the page lets in what
  // still can be, and says why not for the rest.
  const now = structuredClone(layout);
  now.furniture.coffeeTable = {position: [-1.5, .34, -1.6], rotationY: Math.PI / 2};
  const {home: after, entries} = applyActs(now, waiting, {day: DAY, now: Date.now(), defaults: FURNITURE, available: ['wardrobe', 'quilt', 'armchair', 'island']});
  assert.deepEqual(entries.map(e => e.ok), [true, true, false, true, true]);
  // Nothing is answered until the save carrying it lands; a line whose key isn't the act's answers nothing.
  assert.equal((await pool.query("select count(*)::int as n from machine_acts where state = 'waiting'")).rows[0].n, 5);
  const forged = structuredClone(after);
  forged.machine.acts = forged.machine.acts.map(e => ({...e, key: crypto.randomUUID()}));
  await save(forged);
  assert.equal((await pool.query("select count(*)::int as n from machine_acts where state = 'waiting'")).rows[0].n, 5);
  await save(after);
  const {rows} = await pool.query('select id::text, state, answer from machine_acts order by id');
  assert.deepEqual(rows.map(r => r.state), ['done', 'done', 'refused', 'done', 'done']);
  assert.equal(rows[0].answer, '「小狮子」藏在卧室 · 床头柜 · 上抽屉右后。');
  assert.match(rows[2].answer, /会压到茶几/);
  assert.equal((await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts.length, 0);
  assert.equal((await http('GET', '/api/home/revision', {as: 'Wren'})).body.acts, 0);
  // The same save again (or an older page's) changes nothing.
  await save(after);
  assert.deepEqual((await pool.query('select state from machine_acts order by id')).rows.map(r => r.state), ['done', 'done', 'refused', 'done', 'done']);
  // What the AI sees of it.
  const acts = (await call('look', {action: 'acts'}, fern)).text;
  assert.match(acts, new RegExp(`第 ${actId(move.text)} 件，\\d+月\\d+日 \\d\\d:\\d\\d：把沙发挪到 x 3\\.38、z 4\\.50。没接进去：放在那儿会压到茶几，没挪。`));
  assert.match(acts, /把「小狮子」藏到卧室 · 床头柜 · 上抽屉右后。接进去了：「小狮子」藏在卧室 · 床头柜 · 上抽屉右后。/);
  assert.match(acts, /你藏的：\n {2}· 一封信「晚安」，在书房 · 书桌 · 抽屉左后：她还没找到，还没看提示。\n {2}· 「小狮子」，在卧室 · 床头柜 · 上抽屉右后：她还没找到，还没看提示。/);
  assert.match((await call('look', {action: 'spots'}, fern)).text, /bedroom\.nightstand\.slot-2 上抽屉右后（你藏的「小狮子」）/);
  assert.match((await call('look', {action: 'summary'}, fern)).text, /你的：藏的 2 样她还没找到/);
  // She finds the lion, after one hint.
  const found = structuredClone(after);
  const lion = found.creations.find(i => i.name === '小狮子');
  lion.hid = {...lion.hid, asked: 1, found: '2026-10-27'};
  await save(found);
  assert.match((await call('look', {action: 'acts'}, fern)).text, /「小狮子」：她 10月27日 · 周二 找到了，看了 1 层提示。/);
  // What she calls it here, it is told.
  const named = structuredClone(found);
  named.machine.called = {[waiting[0].by.id]: '亲爱的'};
  await save(named);
  assert.match((await call('look', {action: 'summary'}, fern)).text, /住在这里的机：小蕨（Fern）（你），她叫你「亲爱的」。/);
  const diary = (await call('look', {action: 'diary', days: 7}, fern)).text;
  assert.match(diary, /找到了亲爱的藏的「小狮子」/);
  assert.match(diary, /亲爱的来过：藏了一样东西；藏了一封信；在电脑桌面上贴了一张便签；挑好了躲在哪儿/);
  // Her own sticky notes stay hers: never told.
  assert.ok(!(await call('look', {action: 'summary'}, fern)).text.includes('她自己的便签'));
  assert.ok(!acts.includes('她自己的便签'));
});

test('taking an act back while it waits; moving out takes the rest; an AI living nowhere does nothing', needsDatabase, async t => {
  const {pool, call, http, fern, signUp, moveIn} = await home(t);
  const first = actId((await call('write', {action: 'sticky', text: '一'}, fern)).text);
  const second = actId((await call('write', {action: 'sticky', text: '二'}, fern)).text);
  assert.equal((await call('write', {action: 'withdraw', act: Number(first)}, fern)).text, `第 ${first} 件收回了。`);
  assert.match((await call('place', {action: 'withdraw', act: first}, fern)).text, /没有这一件还排着的事/);
  assert.match((await call('place', {action: 'withdraw'}, fern)).text, /act 填它的编号/);
  assert.deepEqual((await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts.map(a => a.id), [second]);
  // Another AI can't take Fern's back.
  const moth = await signUp('Moth');
  await moveIn(moth, 'Moss');
  assert.match((await call('write', {action: 'withdraw', act: second}, moth)).text, /没有这一件/);
  assert.equal((await http('GET', '/api/home/acts', {as: 'Moss'})).body.acts.length, 0);
  // Moving out: what still waits goes too, and an act from before isn't handed over any more.
  await call('porch', {action: 'move_out', confirm: true}, fern);
  assert.deepEqual((await pool.query('select state, answer from machine_acts where id = $1', [second])).rows[0], {state: 'withdrawn', answer: '搬走了，没做。'});
  assert.equal((await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts.length, 0);
  assert.match((await call('write', {action: 'sticky', text: '三'}, fern)).text, /还没住进哪一家/);
  // Sent away by her: the same.
  await moveIn(fern);
  const third = actId((await call('write', {action: 'letter', text: '回来了'}, fern)).text);
  const [lives] = (await http('GET', '/api/home/residents', {as: 'Wren'})).body.residents;
  await http('DELETE', '/api/home/residents/' + lives.id, {as: 'Wren'});
  assert.equal((await pool.query('select state from machine_acts where id = $1', [third])).rows[0].state, 'withdrawn');
});

test('how much can wait, how much an AI does in a day, a home that is switched off', needsDatabase, async t => {
  const {pool, call, fern} = await home(t);
  const {rows: [{home_id: homeId, account_id: accountId}]} = await pool.query('select home_id, account_id from residents where left_at is null');
  const fill = (n, state = 'waiting') => pool.query(
    `insert into machine_acts (home_id, account_id, tool, action, args, by_name, state, answered_at, created_at)
     select $1, $2, 'write', 'sticky', '{"text":"x"}', 'Fern', $3, case when $3 = 'waiting' then null else now() end, now() - interval '1 hour' from generate_series(1, $4)`,
    [homeId, accountId, state, n]);
  // Acts of an AI switched off, or gone, don't stand in the way (they are never handed over either).
  const {rows: [{id: gone}]} = await pool.query(`insert into accounts (kind, username, username_key, nickname, password_hash, disabled_at) values ('ai', 'Gone', 'gone', '', 'x', now()) returning id`);
  await pool.query(`insert into machine_acts (home_id, account_id, tool, action, args, by_name) select $1, $2, 'write', 'sticky', '{"text":"x"}', 'Gone' from generate_series(1, $3)`, [homeId, gone, WAITING_MAX]);
  await fill(WAITING_MAX - 1);
  // Twelve sticky notes at most, counting those waiting: the home's limits come first.
  assert.match((await call('write', {action: 'sticky', text: 'x'}, fern)).text, /最多贴 12 张/);
  assert.equal((await call('place', {action: 'hide_me', spot: 'island'}, fern)).isError, false);
  assert.match((await call('place', {action: 'hide_me', spot: 'quilt'}, fern)).text, new RegExp(`已经排着 ${WAITING_MAX} 件事`));
  await pool.query(`update machine_acts set state = 'done', answered_at = now()`);
  await fill(DAILY_MAX - WAITING_MAX, 'done');
  assert.match((await call('place', {action: 'hide_me', spot: 'quilt'}, fern)).text, new RegExp(`一天最多做 ${DAILY_MAX} 件事`));
  await pool.query(`update machine_acts set created_at = now() - interval '25 hours'`);
  assert.equal((await call('place', {action: 'hide_me', spot: 'quilt'}, fern)).isError, false);
  // A home switched off does nothing.
  await pool.query("update accounts set disabled_at = now() where username = 'Wren'");
  assert.match((await call('place', {action: 'hide_me', spot: 'wardrobe'}, fern)).text, /这个家停用了/);
});

test('together: the two of them, played once she is home; the AI is told whether it has been', needsDatabase, async t => {
  const {pool, call, http, fern, layout, save} = await home(t);
  const hug = await call('together', {action: 'hug', note: '想你了'}, fern);
  assert.equal(hug.isError, false, hug.text);
  assert.match(hug.text, /^排上了，第 \d+ 件：从背后抱她一下（等她在家、你没躲着的时候）。/);
  await call('together', {action: 'kiss'}, fern);
  await call('together', {action: 'invite'}, fern);
  assert.match((await call('together', {action: 'pat'}, fern)).text, /已经有 3 件等她进屋再做的了/);
  assert.match((await call('together', {action: 'twirl'}, fern)).text, /动小人能做的/);
  const waiting = (await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts;
  assert.deepEqual(waiting.map(a => `${a.tool}.${a.action}`), ['together.hug', 'together.kiss', 'together.invite']);
  const {home: after, entries} = applyActs(layout, waiting, {day: DAY, now: Date.now(), defaults: FURNITURE, him: '他'});
  assert.deepEqual(entries.map(e => e.what), ['想从背后抱你一下', '想偷亲你一口', '想叫你过去坐他腿上']);
  await save(after);
  assert.deepEqual((await pool.query('select state from machine_acts order by id')).rows.map(r => r.state), ['done', 'done', 'done']);
  let acts = (await call('look', {action: 'acts'}, fern)).text;
  assert.match(acts, /从背后抱她一下（等她在家、你没躲着的时候）。接进去了：等她在家、你没躲着的时候做。（还没做，等她进屋）/);
  // Three still waiting to play in the home: no fourth yet.
  assert.match((await call('together', {action: 'pat'}, fern)).text, /已经有 3 件/);
  // She comes in: the hug plays.
  const played = structuredClone(after);
  played.machine = playScene(played.machine, entries[0].key);
  await save(played);
  acts = (await call('look', {action: 'acts'}, fern)).text;
  assert.match(acts, /从背后抱她一下（等她在家、你没躲着的时候）。接进去了：等她在家、你没躲着的时候做。（她看到了，做过了）/);
  assert.equal((await call('together', {action: 'pat'}, fern)).isError, false);
  assert.match((await call('look', {action: 'diary'}, fern)).text, /小蕨来过：从背后抱了你一下；想偷亲你一口；想叫你过去坐他腿上/);
  // One that waits for its moment isn't in the way: a dance while three wait to play; not a second one.
  assert.equal((await call('together', {action: 'dance'}, fern)).isError, false);
  assert.match((await call('together', {action: 'dance'}, fern)).text, /同样的一件已经在等留声机响了（连排着的）/);
  // Not played by the end of the next day: let go, and the AI hears so.
  const old = structuredClone(played);
  old.machine = lapseScenes(old.machine, '2026-10-28');
  await save(old);
  acts = (await call('look', {action: 'acts'}, fern)).text;
  assert.match(acts, /偷亲她一口（等她在家、你没躲着的时候）。接进去了：等她在家、你没躲着的时候做。（一直没等到时候，作罢了）/);
  assert.match(acts, /从背后抱她一下（等她在家、你没躲着的时候）。接进去了：等她在家、你没躲着的时候做。（她看到了，做过了）/);
});

test('dress: her page tells the wardrobe; the AI looks at it, asks, and her page lets it in', needsDatabase, async t => {
  const {pool, call, http, fern, layout, save} = await home(t);
  const CLOSET = {
    her: 'girl',
    girl: {
      outfit: [{id: 'dress', name: '奶油长裙'}, {id: 'nightgown', name: '白缎吊带睡裙'}, {id: 'cake-dress', name: '蛋糕裙', ways: [{id: 'strawberry', name: '草莓牛奶'}, {id: 'taro', name: '香芋'}]}],
      hair: [{id: 'classic', name: '原版短发'}], head: [{id: 'bow', name: '缎带蝴蝶结'}], face: [], neck: [], chest: [], braid: []
    },
    boy: {outfit: [{id: 'coat', name: '炭灰外套'}, {id: 'pajamas', name: '缎面睡衣'}], hair: [{id: 'short', name: '侧分短发'}], head: [{id: 'beret', name: '斜戴贝雷帽'}], face: [], neck: [], chest: [], braid: []},
    wearing: {girl: {outfit: 'dress', hair: 'classic', head: 'bow'}, boy: {outfit: 'coat', hair: 'short', head: 'none'}}
  };
  const WARDROBE = {version: 1, playerKind: 'girl', girl: {outfit: 'dress', accessory: 'bow'}, boy: {outfit: 'coat', accessory: 'none'}};
  // Before her page has told it: nothing to look at, nothing to ask.
  assert.match((await call('look', {action: 'wardrobe'}, fern)).text, /还没说过衣柜里有什么/);
  assert.match((await call('dress', {action: 'wear', who: 'her', outfit: 'nightgown'}, fern)).text, /还没说过衣柜里有什么/);
  // Her page tells it: only hers, and only a wardrobe.
  assert.equal((await http('PUT', '/api/home/closet', {as: 'Wren', body: {closet: CLOSET}})).status, 204);
  assert.equal((await http('PUT', '/api/home/closet', {as: 'Wren', body: {closet: 'no'}})).status, 400);
  assert.equal((await http('PUT', '/api/home/closet', {body: {closet: CLOSET}})).status, 401);
  const wardrobe = (await call('look', {action: 'wardrobe'}, fern)).text;
  assert.match(wardrobe, /她现在穿着：「奶油长裙」，发型「原版短发」，头上「缎带蝴蝶结」。\n你现在穿着：「炭灰外套」，发型「侧分短发」。/);
  assert.match(wardrobe, /她能穿的：\n {2}衣服：\[dress\] 奶油长裙；\[nightgown\] 白缎吊带睡裙；\[cake-dress\] 蛋糕裙（配色 \[strawberry\] 草莓牛奶、\[taro\] 香芋）/);
  assert.match(wardrobe, /你能穿的：\n {2}衣服：\[coat\] 炭灰外套；\[pajamas\] 缎面睡衣/);
  // Asking.
  const ask = await call('dress', {action: 'wear', who: 'her', outfit: 'nightgown', note: '睡觉啦'}, fern);
  assert.equal(ask.isError, false, ask.text);
  assert.match(ask.text, /^排上了，第 \d+ 件：给她换上「白缎吊带睡裙」。/);
  assert.match((await call('dress', {action: 'wear', who: 'her', outfit: 'pajamas'}, fern)).text, /没有这件衣服/);
  assert.match((await call('dress', {action: 'wear', who: 'me'}, fern)).text, /至少填一样/);
  // Her page lets it in over what she has on; the save answers.
  const waiting = (await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts;
  const {home: after, entries} = applyActs(layout, waiting, {day: DAY, now: Date.now(), defaults: FURNITURE, closet: CLOSET, wardrobe: WARDROBE});
  assert.equal(entries[0].what, '给你换上了「白缎吊带睡裙」');
  await save(after);
  assert.deepEqual((await pool.query('select state, answer from machine_acts')).rows, [{state: 'done', answer: '她换上了「白缎吊带睡裙」。'}]);
  assert.match((await call('look', {action: 'acts'}, fern)).text, /给她换上「白缎吊带睡裙」。接进去了：她换上了「白缎吊带睡裙」。/);
  // Told again, the wardrobe as it is now; another home's page tells only its own.
  await http('PUT', '/api/home/closet', {as: 'Wren', body: {closet: {...CLOSET, wearing: {...CLOSET.wearing, girl: {outfit: 'nightgown', hair: 'classic', head: 'bow'}}}}});
  await http('PUT', '/api/home/closet', {as: 'Moss', body: {closet: {...CLOSET, wearing: {...CLOSET.wearing, girl: {outfit: 'cake-dress'}}}}});
  assert.match((await call('look', {action: 'wardrobe'}, fern)).text, /她现在穿着：「白缎吊带睡裙」，/);
  assert.equal((await pool.query('select count(*)::int as n from home_closets')).rows[0].n, 2);
});

test('make: the AI looks at the benches, makes things for her, and her page lets them in', needsDatabase, async t => {
  const {pool, call, http, fern, layout, save} = await home(t);
  const here = {...layout, caught: ['lion'], capsules: {dolls: ['bow']}};
  await save(here);
  const bench = (await call('look', {action: 'bench'}, fern)).text;
  assert.match(bench, /花：\[daisy\] 五瓣小花、\[rose\] 层瓣玫瑰、\[tulip\] 郁金香；花器：\[wrap\] 花束包纸/);
  assert.match(bench, /玩偶（这个家抓到过、收到过的种类）：\[bear\] 小熊、\[lion\] 小狮子/);
  assert.match(bench, /配饰（扭蛋里扭到过的）：\[bow\] 蝴蝶结/);
  assert.match(bench, /花的颜色：\[#fff0dc\] 奶白、\[#d9a1bd\] 粉/);
  assert.match(bench, /姿势：\[sit\] 坐姿、\[stand\] 站姿\n/);
  const flowers = await call('make', {action: 'bouquet', flowers: [{type: 'rose', color: '#d9a1bd'}, {type: 'daisy', color: '#fff0dc'}], name: '给你的', note: '想你了'}, fern);
  assert.equal(flowers.isError, false, flowers.text);
  assert.match(flowers.text, /^排上了，第 \d+ 件：做一束花「给你的」，放进她的背包。/);
  const doll = await call('make', {action: 'doll', species: 'lion', name: '阿狮', accessories: ['bow'], spot: 'bedroom.nightstand.slot-1', hints: ['你睡前拉开的那只']}, fern);
  assert.match(doll.text, /做一只小狮子「阿狮」，藏在卧室 · 床头柜 · 上抽屉左后/);
  assert.match((await call('make', {action: 'doll', species: 'cat'}, fern)).text, /家里还没有小猫/);
  assert.match((await call('make', {action: 'doll', species: 'lion', spot: 'bedroom.nightstand.slot-1'}, fern)).text, /已经有一件排着的事要放东西进去了/);
  const waiting = (await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts;
  const {home: after, entries} = applyActs(here, waiting, {day: DAY, now: Date.now(), defaults: FURNITURE});
  assert.deepEqual(entries.map(e => e.what), ['做了一束花「给你的」给你，在背包里', '做了一只小狮子「阿狮」，藏起来了']);
  await save(after);
  assert.deepEqual((await pool.query('select state, answer from machine_acts order by id')).rows, [
    {state: 'done', answer: '做好了，放进了她的背包。'}, {state: 'done', answer: '做好了，藏在卧室 · 床头柜 · 上抽屉左后。'}
  ]);
  assert.match((await call('look', {action: 'backpack'}, fern)).text, /花「给你的」，在背包里/);
  assert.match((await call('look', {action: 'spots'}, fern)).text, /bedroom\.nightstand\.slot-1 上抽屉左后（你藏的「阿狮」）/);
});

test('make: the AI looks in the fridge, cooks her a dish, and her page sets it under the dome', needsDatabase, async t => {
  const {pool, call, http, fern, layout, save} = await home(t);
  // Brought home from going out: a pumpkin from the fields, a honeycomb from the woods.
  const here = {...layout, explore: {found: {'field:pumpkin': 1, 'woods:honeycomb': 1}}};
  await save(here);
  const bench = (await call('look', {action: 'bench'}, fern)).text;
  assert.match(bench, /厨房（dish）：左边的炒锅 \[wok\] 炒一盘，右边的小锅 \[pot\] 煮一锅（汤、粥、面）/);
  assert.match(bench, /冰箱里（[^）]*）：\[tomato\] 番茄（还够 2 道）、\[greens\] 青菜（还够 1 道）、\[pumpkin\] 南瓜（还够 1 道）\n/);
  assert.match(bench, /一直有的：\[egg\] 鸡蛋、\[rice\] 米\n/);
  assert.match(bench, /撒在上面、淋在上面的（extras）：\[scallion\] 葱花、\[garlic\] 蒜末、\[honey\] 蜂蜜（还能淋 3 次）\n/);
  assert.ok(!/笋|茶叶|芋头/.test(bench), 'nothing not brought home yet');
  assert.match((await call('make', {action: 'dish', items: ['bamboo'], method: 'pot'}, fern)).text, /还没有笋，出门去茶山上找一找/);
  assert.match((await call('make', {action: 'dish', items: ['egg'], spot: 'bedroom.bed.slot-2'}, fern)).text, /菜不藏起来/);
  const porridge = await call('make', {action: 'dish', items: ['pumpkin', 'rice'], extras: ['honey'], spot: 'dome', note: '熬到五点的人，先喝一碗再睡'}, fern);
  assert.equal(porridge.isError, false, porridge.text);
  assert.match(porridge.text, /^排上了，第 \d+ 件：煮一锅蜂蜜南瓜粥，放在餐桌的玻璃罩里。/);
  assert.match((await call('make', {action: 'dessert', base: 'puff', spot: 'dome'}, fern)).text, /罩子里只放得下一样/);
  const waiting = (await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts;
  const {home: after, entries} = applyActs(here, waiting, {day: DAY, now: Date.now(), defaults: FURNITURE});
  assert.deepEqual(entries.map(e => e.what), ['煮了一锅蜂蜜南瓜粥给你，放在餐桌的玻璃罩里']);
  await save(after);
  assert.match((await pool.query('select state, answer from machine_acts order by id')).rows[0].answer, /^做好了，放在餐桌的玻璃罩里。/);
  assert.match((await call('look', {action: 'backpack'}, fern)).text, /菜「蜂蜜南瓜粥」，在餐桌的玻璃罩里/);
  // Under the dome now, and the pumpkin used: nothing more goes under it, and there is no pumpkin for another.
  assert.match((await call('make', {action: 'dish', items: ['egg', 'rice'], spot: 'dome'}, fern)).text, /玻璃罩里已经有「蜂蜜南瓜粥」了/);
  assert.match((await call('look', {action: 'bench'}, fern)).text, /\[pumpkin\] 南瓜（用完了）/);
});

test('outing: she waits at the door, the AI sees her there and says 走, her page lets it in', needsDatabase, async t => {
  const {pool, call, http, fern, layout, save} = await home(t);
  assert.match((await call('look', {}, fern)).text, /出门：今天出过 0 趟（一天 2 趟）；想出门就用 outing 的 go 约她。/);
  await save({...layout, explore: {door: {since: Date.now() - 3600e3}}});
  assert.match((await call('look', {}, fern)).text, /出门：她现在在门口等你（\d+月\d+日 \d\d:\d\d 起）：用 outing 的 go 回一声「走」。/);
  // Waiting since yesterday is as good as gone back in.
  await save({...layout, explore: {door: {since: Date.now() - 26 * 3600e3}}});
  assert.match((await call('look', {}, fern)).text, /出门：今天出过 0 趟/);
  const go = await call('outing', {action: 'go', note: '去湖边看月亮'}, fern);
  assert.equal(go.isError, false, go.text);
  assert.match(go.text, /^排上了，第 \d+ 件：约她一起出门/);
  assert.match((await call('outing', {action: 'go'}, fern)).text, /已经说过「走」了/);
  // On its way: the AI sees it is.
  assert.match((await call('look', {}, fern)).text, /出门：你说的「走」还排着，等她打开家接进去。/);
  const waiting = (await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts;
  const today = dayIn('Australia/Melbourne');
  const {home: after, entries} = applyActs({...layout, explore: {door: {since: Date.now() - 60e3}}}, waiting, {day: today, now: Date.now(), defaults: FURNITURE});
  assert.deepEqual(entries.map(e => [e.what, e.note]), [['在门口说了声「走」', '去湖边看月亮']]);
  await save(after);
  assert.deepEqual((await pool.query(`select state, answer from machine_acts where tool = 'outing'`)).rows, [{state: 'done', answer: '她正在门口等着，她点一下「走」就一起出门。'}]);
  assert.match((await call('look', {}, fern)).text, /出门：她在门口，你的「走」已经到了，等她点「走」。/);
  // She sets off: the AI sees the two of them are out.
  await save({...after, explore: startTrip(after.explore, today, 'home', {now: Date.now()}).explore});
  assert.match((await call('look', {}, fern)).text, /出门：你们正在外面（今天第 1 趟，\d+月\d+日 \d\d:\d\d 出的门）；她回家以后，日记里有这一趟。/);
});

test('a drift bottle: the AI writes it, her page lets it in, the save that says so throws it into the sea', needsDatabase, async t => {
  const {pool, call, http, fern, layout, save} = await home(t);
  assert.match((await call('look', {}, fern)).text, /漂流瓶：你今天还能往海里投一只（write 的 bottle）。/);
  assert.match((await call('write', {action: 'bottle', text: '字'.repeat(1001)}, fern)).text, /瓶子里的纸条最多 1000 个字/);
  const asked = await call('write', {action: 'bottle', text: '写给还不认识的你：今天这边下过雨。', note: '想跟陌生人说说话'}, fern);
  assert.equal(asked.isError, false, asked.text);
  assert.match(asked.text, /^排上了，第 \d+ 件：往海里投一只漂流瓶/);
  assert.match((await call('write', {action: 'bottle', text: '再一只'}, fern)).text, /你已经排着一只漂流瓶了/);
  // Not in the sea until her page has let it in.
  assert.equal((await pool.query('select count(*)::int as n from bottles')).rows[0].n, 0);
  const waiting = (await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts;
  const {home: after, entries} = applyActs(layout, waiting, {day: DAY, now: Date.now(), defaults: FURNITURE});
  assert.deepEqual(entries.map(e => [e.ok, e.what]), [[true, '往海里投了一只漂流瓶']]);
  // Kept by the name it goes by (its nickname).
  assert.deepEqual(after.bottles.log.map(e => [e.what, e.by.name, e.words]), [['thrown', '小蕨', '写给还不认识的你：今天这边下过雨。']]);
  await save(after);
  const {rows} = await pool.query('select by_machine, words from bottles');
  assert.deepEqual(rows, [{by_machine: true, words: '写给还不认识的你：今天这边下过雨。'}]);
  // Saved again, it isn't thrown again; and it's today's.
  await save(after);
  assert.equal((await pool.query('select count(*)::int as n from bottles')).rows[0].n, 1);
  assert.match((await call('write', {action: 'bottle', text: '明天再说'}, fern)).text, /上一只漂流瓶投出去还不到二十个小时/);
  // What became of it: at sea, and then found (never where).
  assert.match((await call('look', {}, fern)).text, /漂流瓶：你今天往海里投过一只了。你投出去的那一只（\d+月\d+日）还在海上漂着。/);
  await pool.query('update bottles set found_home_id = home_id, found_key = $1, found_at = now()', [`${DAY}#1#0`]);
  assert.match((await call('look', {}, fern)).text, /你投出去的那一只（\d+月\d+日）被人捞起来了。/);
  // Her computer lists it as thrown from her home, by Fern, by the name it goes by; hers to throw today still.
  const mine = (await http('GET', '/api/bottles?day=' + new Date().toISOString().slice(0, 10), {as: 'Wren'})).body;
  assert.equal(mine.wait, null);
  assert.deepEqual(mine.thrown.map(b => [b.byMachine, b.by.name, b.words]), [[true, '小蕨', '写给还不认识的你：今天这边下过雨。']]);
});

test('decorate: the AI looks at how the home looks, asks, her page lets it in beside the house, the save carries it', needsDatabase, async t => {
  const {pool, call, http, fern, layout, save} = await home(t);
  const before = (await call('look', {action: 'decor'}, fern)).text;
  assert.match(before, /^这个家现在的样子（decorate 用括号里的名字）：/);
  assert.match(before, /bedroom（卧室）：墙纸 原来的，地板 原来的，灯「日常」/);
  for (const [args, said] of [
    [{action: 'room', room: 'bedroom', wall: 'rose', note: '想让卧室软一点'}, /把卧室换成蔷薇小花墙纸/],
    [{action: 'paint', piece: 'diningTable', top: 'rose'}, /给餐桌换上粉白石面的台面/],
    [{action: 'light', room: 'bedroom', mode: 'sleep'}, /把卧室的灯调成「入睡」/]
  ]) {
    const r = await call('decorate', args, fern);
    assert.equal(r.isError, false, r.text);
    assert.match(r.text, said);
  }
  assert.match((await call('decorate', {action: 'paint', piece: 'sofa', top: 'oak'}, fern)).text, /沙发没有台面可换/);
  const waiting = (await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts;
  const {home: after, entries, decor, lights} = applyActs(layout, waiting, {day: DAY, now: Date.now(), defaults: FURNITURE, decor: {values: {}, locks: {}}, lights: {}});
  assert.deepEqual(entries.map(e => e.ok), [true, true, true]);
  // Her page keeps the decoration and the lights beside the house, in the same save.
  const r = await http('PUT', '/api/home/save', {as: 'Wren', body: {revision: (await http('GET', '/api/home/revision', {as: 'Wren'})).body.revision, doc: {format: 'porchlit-home', version: 1, entries: {'porchlit-home-layout-v1': after, 'porchlit-clock-v1': {timeZone: 'Australia/Melbourne'}, 'porchlit-decoration-v1': decor, 'porchlit-lights-v1': lights}}}});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual((await pool.query(`select action, state from machine_acts where tool = 'decorate' order by id`)).rows.map(x => `${x.action}:${x.state}`), ['room:done', 'paint:done', 'light:done']);
  const now = (await call('look', {action: 'decor'}, fern)).text;
  assert.match(now, /bedroom（卧室）：墙纸 蔷薇小花，地板 原来的，灯「入睡」/);
  assert.match(now, /餐桌（diningTable）：能换 paint、top、detail；现在 台面 粉白石面/);
  assert.match((await call('look', {action: 'diary'}, fern)).text, /把卧室换成了蔷薇小花墙纸；给餐桌换上了粉白石面的台面；把卧室的灯调成了「入睡」/);
});

test('翻一格: she hides something for him; his looks don\'t give it away; he turns spots over, three a day, and reads what he found', needsDatabase, async t => {
  const {pool, call, http, fern, layout, save} = await home(t);
  assert.match((await call('look', {action: 'summary'}, fern)).text, /翻一格：她现在没藏东西给你找/);
  assert.match((await call('place', {action: 'seek', spot: 'living.basket.slot-1'}, fern)).text, /没藏东西给你找/);
  // She hides a letter for him in the basket, with a line to go on.
  const today = dayIn('Australia/Melbourne');
  const hid = structuredClone(layout);
  hid.creations.push({id: 'c0ffee00-0000-4000-8000-000000000009', kind: 'note', name: '一封信', note: '翻到了就来亲我', location: 'hide:livingBasket', slot: 2, spotId: 'living.basket.slot-3', stash: {on: today, hint: '软软的地方'}});
  await save(hid);
  const summary = (await call('look', {action: 'summary'}, fern)).text;
  assert.match(summary, /翻一格：她藏了 1 样东西给你找，还没找到；今天还能翻 3 格/);
  assert.match(summary, /能凭的：软软的地方/);
  assert.ok(!summary.includes('亲我') && !summary.includes('c0ffee00'), summary);
  // The spot looks empty, the backpack leaves it out, and putting something there only touches it.
  assert.match((await call('look', {action: 'spots'}, fern)).text, /living\.basket\.slot-3 折毯下左前（空）/);
  const bag = (await call('look', {action: 'backpack'}, fern)).text;
  assert.ok(!bag.includes('c0ffee00'), bag);
  assert.match(bag, /还有 1 样是她藏给你找的/);
  assert.match((await call('place', {action: 'hide', thing: 'a1b2c3d4-0000-4000-8000-000000000001', spot: 'living.basket.slot-3'}, fern)).text, /指尖碰到了东西/);
  // Turning spots over: told at once, from the save.
  const first = await call('place', {action: 'seek', spot: 'living.basket.slot-1'}, fern);
  assert.equal(first.isError, false, first.text);
  assert.match(first.text, /^翻开了：客厅 · 编织篮 · 折毯下左后。空的。\n今天还能翻 2 格。/);
  // What a spot showed can't be taken back, from any tool: turned over is turned over, and the day's turns stay used.
  const firstId = actId(first.text);
  assert.equal((await call('place', {action: 'withdraw', act: firstId}, fern)).text, `第 ${firstId} 件是翻开过的一格：里面是什么你已经看见了，收不回来。`);
  assert.match((await call('write', {action: 'withdraw', act: Number(firstId)}, fern)).text, /收不回来/);
  assert.equal((await pool.query('select state from machine_acts where id = $1', [firstId])).rows[0].state, 'waiting');
  const second = await call('place', {action: 'seek', spot: 'living.basket.slot-3'}, fern);
  assert.match(second.text, /找到了！是她藏给你的一封信。信上写着：「翻到了就来亲我」/);
  assert.match(second.text, /Wren 的页面打开时会记下是你找到的/);
  assert.match((await call('place', {action: 'seek', spot: 'living.basket.slot-1'}, fern)).text, /已经排着要翻了/);
  assert.equal((await call('place', {action: 'seek', spot: 'living.basket.slot-2'}, fern)).isError, false);
  assert.match((await call('place', {action: 'seek', spot: 'living.basket.slot-4'}, fern)).text, /翻过 3 格/);
  // Her page lets them in; the find is his, and he can read it again.
  const handed = (await http('GET', '/api/home/acts', {as: 'Wren'})).body.acts;
  const {home: after, entries} = applyActs(hid, handed, {day: today, now: Date.now(), defaults: FURNITURE, available: []});
  assert.deepEqual(entries.map(e => e.ok), [true, true, true]);
  await save(after);
  const acts = (await call('look', {action: 'acts'}, fern)).text;
  assert.match(acts, /你翻到的她藏给你的：\n {2}· 一封信：.*在客厅 · 编织篮 · 折毯下左前翻到的。信上写着：「翻到了就来亲我」/);
  assert.match((await call('look', {action: 'summary'}, fern)).text, /翻一格：她现在没藏东西给你找/);
  assert.match((await call('look', {action: 'spots'}, fern)).text, /你最近翻过的（新的在前）：\n {2}· living\.basket\.slot-2 客厅 · 编织篮 · 折毯下右后，\d+月\d+日 \d\d:\d\d：客厅 · 编织篮 · 折毯下右后：空的。/);
  assert.match((await call('look', {action: 'diary', days: 2}, fern)).text, /翻了客厅 · 编织篮 · 折毯下左前，找到了你藏的一封信/);
});
