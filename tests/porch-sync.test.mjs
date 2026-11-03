import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {hashingAvailable} from '../server/passwords.mjs';
import {exportHome} from '../src/home-transfer.js';
import {PorchError, createPorchApi} from '../src/porch-api.js';
import {canonical, createPorch, decide, fingerprint, sessionKey, summarize, syncKey, timing} from '../src/porch-sync.js';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

// A browser's localStorage, in memory. Each tab gets its own object over
// the same stored values (`sameBrowser`), as browsers do.
function memoryStorage(initial = {}, map = new Map(Object.entries(initial).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]))) {
  return {
    get length() {
      return map.size;
    },
    key: i => [...map.keys()][i] ?? null,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: k => void map.delete(k),
    map
  };
}
const sameBrowser = storage => memoryStorage({}, storage.map);

// Timers that only run when a test says so.
function handTimers() {
  let next = 1;
  const waiting = new Map();
  return {
    setTimeout: (f, ms) => (waiting.set(next, {f, ms, repeat: false}), next++),
    clearTimeout: id => waiting.delete(id),
    setInterval: (f, ms) => (waiting.set(next, {f, ms, repeat: true}), next++),
    clearInterval: id => waiting.delete(id),
    // Runs every one-off timer that is waiting now.
    runOnce() {
      for (const [id, t] of [...waiting]) if (!t.repeat) {
        waiting.delete(id);
        t.f();
      }
    },
    pending: () => [...waiting.values()].filter(t => !t.repeat).map(t => t.ms)
  };
}

const settle = async () => {
  for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r));
};
const layout = (furniture = {sofa: {position: [0, 0, 0]}}, creations = []) => ({furniture, creations});
const homeStorage = (extra = {}) => ({'porchlit-home-layout-v1': layout(), 'porchlit-clock-v1': {timeZone: 'Australia/Melbourne'}, ...extra});
const docOf = entries => ({format: 'porchlit-home', version: 1, exportedAt: '2026-10-23T00:00:00.000Z', entries});
let ids = 0;
const newId = () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`;

// The save API's behaviour, in memory: one home, any number of accounts' sessions.
function memoryServer({account = {id: '7', username: 'wren', nickname: null}} = {}) {
  const server = {revision: 0, saveId: null, savedAt: null, doc: null, puts: 0, gets: 0, down: false, tokens: new Set(), history: [], putFail: null, loseAnswer: false, hold: null, epoch: '1', onKeep: null};
  const check = token => {
    if (server.down) throw new PorchError(0, 'offline', '连不上云。');
    if (!server.tokens.has(token())) throw Object.assign(new PorchError(401, 'signed_out', '登录过期了，再登录一次吧。'), {sentToken: token()});
  };
  const copy = v => JSON.parse(JSON.stringify(v));
  const newSession = () => {
    const t = 'pcs_' + Math.random().toString(36).slice(2);
    server.tokens.add(t);
    return t;
  };
  server.apiFor = token => ({
    async register() {
      return {account, home: {id: '1'}, session: {token: newSession()}, recoveryCodes: Array.from({length: 10}, (_, i) => `AAAAA-0000${i}`)};
    },
    async signIn() {
      return {account, session: {token: newSession()}};
    },
    async me() {
      check(token);
      return {account, home: {id: '1'}, recoveryCodesLeft: 9};
    },
    async signOut() {
      server.tokens.delete(token());
    },
    async changePassword() {
      check(token);
      server.tokens.clear();
      return {session: {token: newSession()}};
    },
    async getSave() {
      check(token);
      server.gets++;
      return {revision: server.revision, saveId: server.saveId, savedAt: server.savedAt, epoch: server.epoch, doc: server.doc && copy(server.doc)};
    },
    async getRevision() {
      check(token);
      return {revision: server.revision, saveId: server.saveId, savedAt: server.savedAt, epoch: server.epoch};
    },
    async putSave({revision, saveId, doc, keep}) {
      check(token);
      if (server.hold) await server.hold;
      if (server.putFail) throw server.putFail;
      if (revision !== server.revision || (saveId && saveId !== server.saveId)) throw new PorchError(409, 'stale', '这份存档在别处更新过了。', {body: {current: {revision: server.revision}}});
      if (keep && server.doc) server.history.unshift({id: String(server.history.length + 1), source: 'server', revision: server.revision, doc: server.doc});
      server.puts++;
      server.revision++;
      server.saveId = newId();
      server.savedAt = new Date(Date.UTC(2026, 9, 23, 6, server.revision)).toISOString();
      // The database gives objects back with their keys in its own order.
      server.doc = JSON.parse(JSON.stringify(doc, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v)));
      if (server.loseAnswer) {
        server.loseAnswer = false;
        throw new PorchError(0, 'offline', '连不上云。');
      }
      return {revision: server.revision, saveId: server.saveId, savedAt: server.savedAt, epoch: server.epoch};
    },
    async history() {
      check(token);
      return {versions: server.history.map(({doc, ...v}) => ({...v, ...summarize(doc)}))};
    },
    async historyCopy(id) {
      check(token);
      const v = server.history.find(h => h.id === id);
      if (!v) throw new PorchError(404, 'not_found', '没有这一份。');
      return {version: copy(v)};
    },
    async keepCopy({doc}) {
      check(token);
      if (server.down) throw new PorchError(0, 'offline', '连不上云。');
      server.history.unshift({id: String(server.history.length + 1), source: 'device', revision: null, doc: copy(doc)});
      // Something happens on the device while the copy is on its way.
      if (server.onKeep) {
        const f = server.onKeep;
        server.onKeep = null;
        f();
      }
      return {version: {id: String(server.history.length)}};
    }
  });
  return server;
}

// One tab of the house in one browser. Tabs of the same browser share storage.
function device(server, initial = {}, {storage = memoryStorage(initial), drawn = true} = {}) {
  const timers = handTimers();
  const events = new EventTarget();
  events.document = new EventTarget();
  const happened = {reloads: 0, downloads: [], hidden: false};
  let porch = null;
  porch = createPorch({
    api: server.apiFor(() => porch.token()),
    storage,
    notes: memoryStorage(),
    timers,
    events,
    visible: () => !happened.hidden,
    reload: () => happened.reloads++,
    download: doc => happened.downloads.push(doc)
  });
  if (drawn) porch.ready();
  // Another tab wrote to this browser's storage: tell this tab, as a browser would.
  const told = (key, url = 'https://porchlit.party/') => events.dispatchEvent(Object.assign(new Event('storage'), {key, url}));
  // The person switches away from this tab, or back to it.
  const shown = visible => {
    happened.hidden = !visible;
    events.document.dispatchEvent(new Event('visibilitychange'));
  };
  return {porch, storage, timers, events, happened, told, shown, home: () => exportHome(storage).entries};
}

// The page reloaded itself: a new page on the same browser storage.
async function reopen(server, d) {
  d.porch.stop();
  const again = device(server, {}, {storage: sameBrowser(d.storage)});
  await again.porch.start();
  again.timers.runOnce();
  await again.porch.idle();
  await settle();
  return again;
}

async function pair() {
  const server = memoryServer();
  const a = device(server, homeStorage());
  await a.porch.register({username: 'wren', password: 'lamplight 01'});
  a.porch.putAwayCodes();
  const first = device(server);
  await first.porch.signIn({username: 'wren', password: 'lamplight 01'});
  assert.equal(first.happened.reloads, 1);
  const b = await reopen(server, first);
  return {server, a, b};
}
const change = async (d, key, value) => {
  d.storage.setItem(key, JSON.stringify(value));
  d.porch.poll();
  await d.porch.flush();
  await settle();
};

test('the same home gives the same fingerprint whatever order its keys are in', () => {
  assert.equal(canonical({b: 1, a: [{d: 2, c: 3}]}), '{"a":[{"c":3,"d":2}],"b":1}');
  assert.equal(fingerprint({x: {a: 1, b: 2}}), fingerprint({x: {b: 2, a: 1}}));
  assert.notEqual(fingerprint({x: {a: 1}}), fingerprint({x: {a: 2}}));
  assert.notEqual(fingerprint({x: [1, 2]}), fingerprint({x: [2, 1]}));
  assert.deepEqual(summarize(docOf({'porchlit-home-layout-v1': layout({}, [{kind: 'note'}, {kind: 'bouquet'}, {kind: 'photo'}, null, [1]])})), {works: 2, notes: 1});
  assert.deepEqual(summarize(null), {works: 0, notes: 0});
});

test('decide: take what only the server changed, send what only this device changed, otherwise ask', () => {
  const a = docOf(homeStorage()), b = docOf(homeStorage({'porchlit-clock-v1': {timeZone: 'Asia/Shanghai'}}));
  const c = docOf(homeStorage({'porchlit-lights-v1': {living: {on: false}}}));
  const empty = docOf({});
  const meta = (revision, doc, extra = {}) => ({accountId: '7', revision, fingerprint: fingerprint(doc.entries), ...extra});
  const cloud = (revision, doc) => ({revision, saveId: 's' + revision, savedAt: 'then', doc});
  const act = (local, cl, m, accountId = '7') => decide({local, cloud: cl, meta: m, accountId});
  // Nothing on the server yet.
  assert.deepEqual(act(a, cloud(0, null), null), {act: 'upload', base: {revision: 0, epoch: null}});
  assert.deepEqual(act(empty, cloud(0, null), null), {act: 'none'});
  // The same home on both sides, however it got there.
  assert.equal(act(a, cloud(3, a), null).act, 'same');
  // A device with nothing yet takes the server's.
  assert.equal(act(empty, cloud(3, a), null).act, 'take');
  // Synced at 3, changed here since, server still has exactly what we synced: send.
  assert.deepEqual(act(b, cloud(3, a), meta(3, a)), {act: 'upload', base: {revision: 3, saveId: 's3', epoch: null, fingerprint: fingerprint(a.entries)}, landed: false});
  // Synced at 3, nothing changed here, server moved on: take.
  assert.equal(act(a, cloud(4, b), meta(3, a)).act, 'take');
  // Both moved: ask.
  assert.deepEqual(act(c, cloud(4, b), meta(3, a)), {act: 'choose'});
  // Never met this account here, and the homes differ: ask, saying so.
  assert.deepEqual(act(a, cloud(4, b), null), {act: 'choose', firstTime: true});
  assert.deepEqual(act(a, cloud(4, b), meta(4, b), '8'), {act: 'choose', firstTime: true});
  // The server went back (a restored backup): ask, don't write over it.
  assert.deepEqual(act(a, cloud(2, b), meta(5, a)), {act: 'choose'});
  // Same number, different content (numbers came round again): ask.
  assert.deepEqual(act(c, cloud(3, b), meta(3, a)), {act: 'choose'});
  // A restored database (new epoch): this device never met this life of the home: ask.
  assert.deepEqual(act(c, {...cloud(4, b), epoch: '2'}, meta(4, b, {epoch: '1'})), {act: 'choose', firstTime: true});
  assert.equal(act(b, {...cloud(4, b), epoch: '2'}, meta(4, b, {epoch: '1'})).act, 'same');
  // Our own save whose answer was lost is recognised, and what changed since is sent.
  const lost = meta(3, a, {pending: {revision: 3, fingerprint: fingerprint(b.entries)}});
  assert.deepEqual(act(c, cloud(4, b), lost), {act: 'upload', base: {revision: 4, saveId: 's4', epoch: null, fingerprint: fingerprint(b.entries)}, landed: true});
  assert.equal(act(b, cloud(4, b), lost).act, 'same');
});

test('a new account sends this device’s home up; an empty browser takes it without asking', async () => {
  const {server, a, b} = await pair();
  assert.equal(server.revision, 1);
  assert.deepEqual(server.doc.entries, a.home());
  assert.equal(a.porch.getState().status, 'saved');
  assert.deepEqual(b.home(), a.home());
  assert.equal(server.puts, 1, 'taking sends nothing back');
  // The session and the sync record never travel with the home.
  assert.equal(Object.keys(b.home()).some(k => k.startsWith('porchlit-porch')), false);
});

test('a second device whose page already wrote a default home is asked; using the server’s keeps the device’s copy in history', async () => {
  const {server, a} = await pair();
  await change(a, 'porchlit-home-layout-v1', layout({sofa: {position: [1, 0, 0]}}, [{kind: 'bouquet'}, {kind: 'note'}]));
  // The phone opened the house before ever signing in: the page wrote its defaults.
  const phone = device(server, homeStorage());
  await phone.porch.signIn({username: 'wren', password: 'lamplight 01'});
  const s = phone.porch.getState();
  assert.equal(s.status, 'choose');
  assert.equal(s.choice.firstTime, true);
  assert.deepEqual([s.choice.cloud.works, s.choice.cloud.notes, s.choice.local.works], [1, 1, 0]);
  await phone.porch.chooseCloud();
  assert.deepEqual(phone.home()['porchlit-home-layout-v1'].creations, [{kind: 'bouquet'}, {kind: 'note'}]);
  assert.equal(phone.happened.reloads, 1);
  assert.equal(server.history[0].source, 'device');
  assert.deepEqual(server.history[0].doc.entries, homeStorage());
  assert.equal(server.puts, 2, 'the server’s home was not touched');
});

test('using this device’s copy puts the server’s aside, and a dropped connection doesn’t ask again', async () => {
  const {server, a} = await pair();
  await change(a, 'porchlit-lights-v1', {from: 'a'});
  const phone = device(server, homeStorage({'porchlit-lights-v1': {from: 'phone'}}));
  await phone.porch.signIn({username: 'wren', password: 'lamplight 01'});
  assert.equal(phone.porch.getState().status, 'choose');
  server.down = true;
  await phone.porch.chooseDevice();
  assert.equal(phone.porch.getState().status, 'offline');
  server.down = false;
  phone.timers.runOnce();
  await settle();
  assert.equal(phone.porch.getState().status, 'saved', 'it saved, without asking again');
  assert.deepEqual(server.doc.entries['porchlit-lights-v1'], {from: 'phone'});
  assert.equal(server.history[0].source, 'server');
  assert.deepEqual(server.history[0].doc.entries['porchlit-lights-v1'], {from: 'a'});
});

test('changes made while the question waits are what goes into history', async () => {
  const {server, a, b} = await pair();
  await change(a, 'porchlit-lights-v1', {from: 'a'});
  await change(b, 'porchlit-lights-v1', {from: 'b'});
  assert.equal(b.porch.getState().status, 'choose');
  // "先不决定", and an hour of writing a letter.
  const lay = JSON.parse(b.storage.getItem('porchlit-home-layout-v1'));
  lay.creations = [{id: 'letter-1', kind: 'note', note: 'an hour of writing'}];
  b.storage.setItem('porchlit-home-layout-v1', JSON.stringify(lay));
  b.porch.poll();
  assert.equal(b.porch.getState().choice.local.notes, 1, 'the question shows the letter');
  assert.equal(server.revision, 2, 'nothing sent while asking');
  await b.porch.chooseCloud();
  assert.equal(server.history[0].source, 'device');
  assert.deepEqual(server.history[0].doc.entries['porchlit-home-layout-v1'].creations, [{id: 'letter-1', kind: 'note', note: 'an hour of writing'}]);
  assert.deepEqual(b.home()['porchlit-lights-v1'], {from: 'a'});
});

test('if this device’s copy can’t be put aside first, using the server’s doesn’t happen', async () => {
  const {server, a, b} = await pair();
  await change(a, 'porchlit-lights-v1', {from: 'a'});
  await change(b, 'porchlit-lights-v1', {from: 'b'});
  server.down = true;
  await b.porch.chooseCloud();
  assert.deepEqual(b.home()['porchlit-lights-v1'], {from: 'b'});
  assert.equal(b.happened.reloads, 0);
  assert.equal(b.porch.getState().status, 'choose');
  assert.match(b.porch.getState().message, /先没换/);
});

test('after a failed save, a quiet look sends the change instead of claiming it is saved', async () => {
  const server = memoryServer();
  const a = device(server, homeStorage());
  await a.porch.register({username: 'wren', password: 'lamplight 01'});
  server.down = true;
  await change(a, 'porchlit-lights-v1', {living: {on: false}});
  assert.equal(a.porch.getState().status, 'offline');
  server.down = false;
  await a.porch.look();
  await settle();
  assert.equal(a.porch.getState().status, 'saved');
  assert.equal(server.revision, 2);
  assert.deepEqual(server.doc.entries['porchlit-lights-v1'], {living: {on: false}});
});

test('a save whose answer was lost is recognised, not mistaken for another device', async () => {
  const server = memoryServer();
  const a = device(server, homeStorage());
  await a.porch.register({username: 'wren', password: 'lamplight 01'});
  server.loseAnswer = true;
  await change(a, 'porchlit-lights-v1', {n: 1});
  assert.equal(a.porch.getState().status, 'offline');
  assert.equal(server.revision, 2, 'it did land');
  // More changes before the connection comes back.
  a.storage.setItem('porchlit-lights-v1', JSON.stringify({n: 2}));
  a.timers.runOnce();
  await settle();
  assert.equal(a.porch.getState().status, 'saved');
  assert.equal(server.revision, 3);
  assert.deepEqual(server.doc.entries['porchlit-lights-v1'], {n: 2});
});

test('a server that went back, or a save number that came round again, is asked about, not written over', async () => {
  const {server, a, b} = await pair();
  await change(a, 'porchlit-lights-v1', {n: 1});
  await change(a, 'porchlit-lights-v1', {n: 2});
  await b.porch.look();
  await b.porch.takeNewer();
  assert.deepEqual(b.home()['porchlit-lights-v1'], {n: 2});
  // As if restored from an older backup: revision 2 again, but not the save either device knew.
  server.revision = 2;
  server.saveId = newId();
  server.doc = {...server.doc, entries: {...server.doc.entries, 'porchlit-lights-v1': {restored: true}}};
  // a changes again: its save names a revision and write the server no longer has.
  await change(a, 'porchlit-lights-v1', {n: 3});
  assert.equal(a.porch.getState().status, 'choose');
  assert.deepEqual(server.doc.entries['porchlit-lights-v1'], {restored: true});
  // b, which had revision 3, starts up: also asked, nothing written.
  const again = device(server, Object.fromEntries(b.storage.map));
  await again.porch.start();
  again.timers.runOnce();
  await settle();
  assert.equal(again.porch.getState().status, 'choose');
  assert.deepEqual(server.doc.entries['porchlit-lights-v1'], {restored: true});
  assert.equal(server.puts, 3);
});

test('another tab signing in as someone else stops this tab instead of mixing the two homes', async () => {
  const server = memoryServer();
  const shared = memoryStorage(homeStorage());
  const tab1 = device(server, {}, {storage: sameBrowser(shared)});
  await tab1.porch.register({username: 'ann', password: 'lamplight 01'});
  tab1.porch.putAwayCodes();
  const annToken = tab1.porch.token();
  // A second tab of the same browser signs in as Bo.
  const bo = memoryServer({account: {id: '8', username: 'bo', nickname: null}});
  const tab2 = device(bo, {}, {storage: sameBrowser(shared)});
  await tab2.porch.signIn({username: 'bo', password: 'lamplight 01'});
  tab1.told(sessionKey);
  assert.equal(tab1.porch.token(), annToken, 'this tab keeps talking as Ann');
  assert.equal(tab1.porch.getState().status, 'stale');
  shared.setItem('porchlit-lights-v1', JSON.stringify({by: 'tab1'}));
  tab1.porch.poll();
  await tab1.porch.flush();
  assert.equal(server.revision, 1, 'a stopped tab sends nothing');
  // Coming back to it reloads it.
  tab1.shown(false);
  assert.equal(tab1.happened.reloads, 0);
  tab1.shown(true);
  assert.equal(tab1.happened.reloads, 1);
});

test('a tab left open while another tab takes a newer home reloads instead of saving the old one', async () => {
  const {server, a, b} = await pair();
  const tab2 = device(server, {}, {storage: sameBrowser(b.storage)});
  await tab2.porch.start();
  await change(a, 'porchlit-lights-v1', {from: 'a'});
  await b.porch.look();
  await b.porch.takeNewer();
  // tab2 hears that the home and the sync record changed underneath it.
  tab2.told('porchlit-lights-v1');
  assert.equal(tab2.porch.getState().status, 'stale');
  tab2.porch.poll();
  await tab2.porch.flush();
  await tab2.porch.look();
  assert.equal(server.revision, 2);
  // The wardrobe page inside the house writing its own key is not another tab.
  const tab3 = device(server, {}, {storage: sameBrowser(b.storage)});
  await tab3.porch.start();
  tab3.told('porchlit.wardrobe.v1', 'https://porchlit.party/body/?embed=1');
  assert.notEqual(tab3.porch.getState().status, 'stale');
});

test('retries slow down and stay slow; homes too big or with odd text wait for the next change', async () => {
  const server = memoryServer();
  const a = device(server, homeStorage());
  await a.porch.register({username: 'wren', password: 'lamplight 01'});
  server.putFail = new PorchError(500, 'broken', '服务器这边出错了。');
  await change(a, 'porchlit-lights-v1', {x: 1});
  const waits = [];
  for (let i = 0; i < 6; i++) {
    waits.push(...a.timers.pending());
    a.timers.runOnce();
    await settle();
  }
  assert.deepEqual(waits, [10000, 20000, 40000, 80000, 160000, 300000]);
  // Busy with Retry-After: never sooner than the backoff already reached.
  server.putFail = new PorchError(503, 'busy', '忙', {retryAfter: 2});
  a.timers.runOnce();
  await settle();
  assert.deepEqual(a.timers.pending(), [300000]);
  server.putFail = null;
  a.timers.runOnce();
  await settle();
  assert.equal(a.porch.getState().status, 'saved');

  // Too big: told, nothing sent, and nothing more until something changes.
  const puts = server.puts;
  await change(a, 'porchlit-lights-v1', {blob: 'x'.repeat(6.2 * 1024 * 1024)});
  assert.equal(a.porch.getState().status, 'error');
  assert.match(a.porch.getState().message, /6 MB/);
  await a.porch.look();
  a.porch.poll();
  await a.porch.flush();
  assert.equal(server.puts, puts);
  // Text the database can't hold.
  await change(a, 'porchlit-lights-v1', {label: 'a\u0000b'});
  assert.equal(a.porch.getState().status, 'error');
  assert.equal(server.puts, puts);
  await change(a, 'porchlit-lights-v1', {fine: true});
  assert.equal(a.porch.getState().status, 'saved');
});

test('starting up only waits for the server’s copy; sending happens after the house is drawn', async () => {
  const {server, a} = await pair();
  a.storage.setItem('porchlit-lights-v1', JSON.stringify({unsent: true}));
  let release;
  server.hold = new Promise(r => (release = r));
  const again = device(server, Object.fromEntries(a.storage.map));
  await again.porch.start();
  assert.equal(again.porch.getState().status, 'checking', 'start() came back without sending');
  again.timers.runOnce();
  await settle();
  assert.equal(again.porch.getState().status, 'saving');
  release();
  await again.porch.idle();
  await settle();
  assert.equal(again.porch.getState().status, 'saved');
  assert.deepEqual(server.doc.entries['porchlit-lights-v1'], {unsent: true});
});

test('a retry that finds another device’s save says so instead of reloading by itself', async () => {
  const {server, a, b} = await pair();
  server.down = true;
  await b.porch.look();
  assert.equal(b.porch.getState().status, 'offline');
  server.down = false;
  await change(a, 'porchlit-lights-v1', {from: 'a'});
  b.timers.runOnce();
  await settle();
  assert.equal(b.porch.getState().status, 'newer');
  assert.equal(b.happened.reloads, 0);
  await b.porch.tryAgain();
  assert.equal(b.happened.reloads, 0);
  await b.porch.takeNewer();
  assert.equal(b.happened.reloads, 1);
  assert.deepEqual(b.home()['porchlit-lights-v1'], {from: 'a'});
});

test('a late answer for whoever just signed out doesn’t light the lamp again', async () => {
  const server = memoryServer();
  let answer;
  const late = new Promise(r => (answer = r));
  const original = server.apiFor;
  server.apiFor = token => ({...original(token), me: async () => (await late, {account: {id: '7', username: 'wren', nickname: 'W'}, recoveryCodesLeft: 9})});
  const b = device(server, homeStorage());
  await b.porch.register({username: 'wren', password: 'lamplight 01'});
  await b.porch.signOut();
  answer();
  await settle();
  assert.equal(b.porch.getState().account, null);
  assert.equal(b.porch.getState().status, 'signed-out');
});

test('changing the password keeps this device signed in with the new key', async () => {
  const server = memoryServer();
  const a = device(server, homeStorage());
  await a.porch.register({username: 'wren', password: 'lamplight 01'});
  const before = a.porch.token();
  await a.porch.changePassword({currentPassword: 'lamplight 01', newPassword: 'lamplight 02'});
  assert.notEqual(a.porch.token(), before);
  assert.equal(JSON.parse(a.storage.getItem(sessionKey)).token, a.porch.token());
  await change(a, 'porchlit-lights-v1', {after: 'password'});
  assert.equal(a.porch.getState().status, 'saved');
  assert.equal(a.porch.getState().account.username, 'wren');
});

test('a copy from the server’s history comes back as this device’s home, and the replaced one is kept', async () => {
  const {server, a} = await pair();
  await change(a, 'porchlit-lights-v1', {version: 'old'});
  const phone = device(server, homeStorage({'porchlit-lights-v1': {version: 'phone'}}));
  await phone.porch.signIn({username: 'wren', password: 'lamplight 01'});
  await phone.porch.chooseDevice();
  const [kept] = await a.porch.history();
  assert.equal(kept.source, 'server');
  // a puts the old one back.
  await a.porch.look();
  assert.equal(a.porch.getState().status, 'newer');
  await a.porch.restoreCopy(kept.id);
  assert.deepEqual(a.home()['porchlit-lights-v1'], {version: 'old'});
  assert.equal(a.happened.reloads, 1);
  // After the reload, it's sent like any change, and the phone's version is put aside.
  const reopened = device(server, Object.fromEntries(a.storage.map));
  await reopened.porch.start();
  reopened.timers.runOnce();
  await settle();
  assert.deepEqual(server.doc.entries['porchlit-lights-v1'], {version: 'old'});
  assert.deepEqual(server.history[0].doc.entries['porchlit-lights-v1'], {version: 'phone'});
  await reopened.porch.downloadCopy(server.history[0].id);
  assert.equal(reopened.happened.downloads.length, 1);
});

test('an expired session signs the device out and says so; the home stays', async () => {
  const server = memoryServer();
  const a = device(server, homeStorage());
  await a.porch.register({username: 'wren', password: 'lamplight 01'});
  server.tokens.clear();
  await a.porch.look();
  const s = a.porch.getState();
  assert.equal(s.status, 'signed-out');
  assert.equal(s.account, null);
  assert.match(s.note, /登录过期/);
  assert.equal(a.storage.getItem(sessionKey), null);
  assert.ok(a.storage.getItem('porchlit-home-layout-v1'));
});

test('starting up with the server away still opens the house from this device', async () => {
  const {server, a} = await pair();
  server.down = true;
  const later = device(server, Object.fromEntries(a.storage.map));
  await later.porch.start();
  assert.equal(later.porch.getState().status, 'offline');
  assert.equal(later.happened.reloads, 0);
});

test('signing out keeps the home on this device and forgets only the session', async () => {
  const server = memoryServer();
  const a = device(server, homeStorage());
  await a.porch.register({username: 'wren', password: 'lamplight 01'});
  await a.porch.signOut();
  assert.equal(a.porch.getState().status, 'signed-out');
  assert.equal(a.storage.getItem(sessionKey), null);
  assert.ok(a.storage.getItem(syncKey));
  assert.ok(a.storage.getItem('porchlit-home-layout-v1'));
  assert.equal(server.tokens.size, 0);
});

test('answers that aren’t the API (a wifi sign-in page) count as no connection', async () => {
  const html = async () => new Response('<html>Welcome to Hotel Wifi</html>', {status: 200, headers: {'Content-Type': 'text/html'}});
  const api = createPorchApi({fetch: html, token: () => 'pcs_x'});
  await assert.rejects(api.getSave(), e => e.code === 'offline');
  await assert.rejects(api.signIn({username: 'a', password: 'b'}), e => e.code === 'offline');
  const odd = createPorchApi({fetch: async () => new Response('{"revision":"x"}', {status: 200}), token: () => 'pcs_x'});
  await assert.rejects(odd.getRevision(), e => e.code === 'offline');
  const proxy = createPorchApi({fetch: async () => new Response('<html>502</html>', {status: 502}), token: () => 'pcs_x'});
  await assert.rejects(proxy.getSave(), e => e.code === 'offline');
});

// The same, end to end: the real API and database, two devices.
const needsAll = needsDatabase.skip ? needsDatabase : hashingAvailable ? {} : {skip: 'needs Node 24.7 or later (built-in Argon2)'};
test('two devices through the real API: register, take, change, notice, choose, history', needsAll, async t => {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const server = createServer({db: {pool, migrations: await loadMigrations()}, api: createApi({pool})});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const real = {apiFor: token => createPorchApi({base, token})};

  const a = device(real, homeStorage());
  await a.porch.register({username: 'Wren', password: 'lamplight 01', nickname: '小鹪鹩'});
  assert.equal(a.porch.getState().status, 'saved');
  assert.equal(a.porch.getState().account.nickname, '小鹪鹩');
  assert.equal(a.porch.getState().codes.length, 10);

  const fresh = device(real);
  await fresh.porch.signIn({username: 'wren', password: 'lamplight 01'});
  assert.deepEqual(fresh.home(), a.home());
  const b = await reopen(real, fresh);
  assert.equal(b.porch.getState().status, 'saved');

  await change(b, 'porchlit-lights-v1', {bedroom: {on: true, warmth: 0.6}});
  assert.equal(b.porch.getState().status, 'saved');
  await a.porch.look();
  assert.equal(a.porch.getState().status, 'newer');
  await a.porch.takeNewer();
  assert.deepEqual(a.home(), b.home());
  const a2 = await reopen(real, a);
  assert.equal(a2.porch.getState().status, 'saved');

  // Both change: the second to save is asked, and keeps its own; the server's goes to history.
  await change(a2, 'porchlit-clock-v1', {timeZone: 'Asia/Shanghai'});
  await change(b, 'porchlit-clock-v1', {timeZone: 'Europe/Paris'});
  assert.equal(b.porch.getState().status, 'choose');
  await b.porch.chooseDevice();
  assert.equal(b.porch.getState().status, 'saved');
  const {rows: [row]} = await pool.query('select revision, doc from home_saves');
  assert.equal(Number(row.revision), 4);
  assert.deepEqual(row.doc.entries['porchlit-clock-v1'], {timeZone: 'Europe/Paris'});
  const versions = await b.porch.history();
  assert.equal(versions[0].source, 'server');
  assert.equal(versions[0].revision, 3);
  // A wrong turn put right: a takes the history copy back, and after the reload it's the server's again.
  await a2.porch.look();
  await a2.porch.restoreCopy(versions[0].id);
  assert.deepEqual(a2.home()['porchlit-clock-v1'], {timeZone: 'Asia/Shanghai'});
  await reopen(real, a2);
  const {rows: [back]} = await pool.query('select revision, doc from home_saves');
  assert.equal(Number(back.revision), 5);
  assert.deepEqual(back.doc.entries['porchlit-clock-v1'], {timeZone: 'Asia/Shanghai'});
  const {rows: [{n}]} = await pool.query('select count(*)::int as n from home_history');
  assert.equal(n, 2, 'the Paris copy was put aside too');
  await b.porch.signOut();
  assert.equal(b.porch.getState().status, 'signed-out');
});

test('a stopped tab can’t write its old home back, and stays stopped even when a save finishes', async () => {
  const {server, a} = await pair();
  // Two windows of one browser, side by side.
  const left = await reopen(server, a);
  const right = device(server, {}, {storage: sameBrowser(left.storage)});
  await right.porch.start();
  // A save is under way on the right when the left adds a photo.
  right.storage.setItem('porchlit-lights-v1', JSON.stringify({right: 1}));
  right.porch.poll();
  let release;
  server.hold = new Promise(r => (release = r));
  const saving = right.porch.flush();
  const lay = JSON.parse(left.storage.getItem('porchlit-home-layout-v1'));
  lay.creations = [{id: 'photo', kind: 'photo'}];
  left.storage.setItem('porchlit-home-layout-v1', JSON.stringify(lay));
  right.told('porchlit-home-layout-v1');
  release();
  server.hold = null;
  await saving;
  await settle();
  assert.equal(right.porch.getState().status, 'stale', 'the finished save doesn’t clear it');
  // The right window, behind, writes its old layout as the person clicks around: dropped.
  right.storage.setItem('porchlit-home-layout-v1', JSON.stringify(layout()));
  right.storage.removeItem('porchlit-home-layout-v1');
  assert.deepEqual(JSON.parse(left.storage.getItem('porchlit-home-layout-v1')).creations, [{id: 'photo', kind: 'photo'}]);
  // Its own non-home keys still work.
  right.storage.setItem('something-else', '1');
  assert.equal(left.storage.getItem('something-else'), '1');
  // The left sends the photo; after any reload, the photo is what there is.
  left.porch.poll();
  await left.porch.flush();
  await settle();
  const after = await reopen(server, left);
  assert.deepEqual(after.home()['porchlit-home-layout-v1'].creations, [{id: 'photo', kind: 'photo'}]);
  assert.deepEqual(server.doc.entries['porchlit-home-layout-v1'].creations, [{id: 'photo', kind: 'photo'}]);
});

test('a page that hasn’t drawn yet isn’t out of date: it will read what’s there', async () => {
  const {server, a} = await pair();
  const opening = device(server, {}, {storage: sameBrowser(a.storage), drawn: false});
  opening.told('porchlit-lights-v1');
  await opening.porch.start();
  assert.notEqual(opening.porch.getState().status, 'stale');
  opening.porch.ready();
  opening.told('porchlit-lights-v1');
  assert.equal(opening.porch.getState().status, 'stale');
});

test('the ten recovery codes stay on screen even if another tab changes the home', async () => {
  const server = memoryServer();
  const a = device(server, homeStorage());
  await a.porch.register({username: 'wren', password: 'lamplight 01'});
  a.told('porchlit-lights-v1');
  assert.equal(a.porch.getState().codes.length, 10);
  a.shown(false);
  a.shown(true);
  assert.equal(a.happened.reloads, 0, 'not reloaded away from the codes');
  a.porch.putAwayCodes();
  a.shown(false);
  a.shown(true);
  assert.equal(a.happened.reloads, 1);
});

test('changes made while this device’s copy is on its way to history are handed over too', async () => {
  const {server, a, b} = await pair();
  await change(a, 'porchlit-lights-v1', {from: 'a'});
  await change(b, 'porchlit-lights-v1', {from: 'b'});
  assert.equal(b.porch.getState().status, 'choose');
  server.onKeep = () => b.storage.setItem('porchlit-clock-v1', JSON.stringify({timeZone: 'Asia/Tokyo', written: 'while sending'}));
  await b.porch.chooseCloud();
  assert.equal(server.history.length, 2, 'handed over twice');
  assert.deepEqual(server.history[0].doc.entries['porchlit-clock-v1'], {timeZone: 'Asia/Tokyo', written: 'while sending'});
  assert.deepEqual(b.home()['porchlit-lights-v1'], {from: 'a'});
});

test('a home the server can’t keep: using the server’s offers a download; using this one is refused up front', async () => {
  const {server, a, b} = await pair();
  await change(a, 'porchlit-lights-v1', {from: 'a'});
  await change(b, 'porchlit-lights-v1', {from: 'b', blob: 'x'.repeat(6.2 * 1024 * 1024)});
  // The too-big change can't be sent, so b doesn't even know yet; it learns when it looks.
  assert.equal(b.porch.getState().status, 'error');
  await b.porch.look();
  await settle();
  assert.equal(b.porch.getState().status, 'choose');
  const metaBefore = b.storage.getItem(syncKey);
  await b.porch.chooseDevice();
  assert.match(b.porch.getState().message, /6 MB/);
  assert.equal(b.storage.getItem(syncKey), metaBefore, 'nothing written down');
  await b.porch.chooseCloud();
  assert.match(b.porch.getState().choice.cannotKeep, /6 MB/);
  assert.equal(b.happened.reloads, 0);
  // First the file, and nothing else yet...
  await b.porch.chooseCloud({download: true});
  assert.equal(b.happened.downloads.length, 1);
  assert.equal(b.happened.downloads[0].entries['porchlit-lights-v1'].from, 'b');
  assert.equal(b.porch.getState().choice.downloaded, true);
  assert.equal(b.happened.reloads, 0);
  // ...then, once the person says they have it, the server's home.
  await b.porch.chooseCloud({downloaded: true});
  assert.deepEqual(b.home()['porchlit-lights-v1'], {from: 'a'});
  assert.equal(b.happened.reloads, 1);
});

test('after the database is restored (new epoch), a device that didn’t change anything is still asked', async () => {
  const {server, a, b} = await pair();
  await change(b, 'porchlit-lights-v1', {only: 'on b'});
  // Restored to an older backup, then a saves a few times past b's number.
  server.epoch = '2';
  server.revision = 1;
  server.saveId = newId();
  server.doc = {...server.doc, entries: homeStorage()};
  const a2 = await reopen(server, a);
  await change(a2, 'porchlit-lights-v1', {n: 1});
  await change(a2, 'porchlit-lights-v1', {n: 2});
  await change(a2, 'porchlit-lights-v1', {n: 3});
  const again = device(server, {}, {storage: sameBrowser(b.storage)});
  await again.porch.start();
  again.timers.runOnce();
  await settle();
  assert.equal(again.porch.getState().status, 'choose');
  assert.deepEqual(again.home()['porchlit-lights-v1'], {only: 'on b'}, 'b’s only copy wasn’t replaced silently');
});

test('starting up with unsent changes meets the server again after drawing, not with the old answer', async () => {
  const {server, a} = await pair();
  const tab1 = await reopen(server, a);
  tab1.storage.setItem('porchlit-lights-v1', JSON.stringify({unsent: true}));
  const tab2 = device(server, {}, {storage: sameBrowser(tab1.storage)});
  await tab2.porch.start();
  // Before tab2's deferred step runs, tab1 sends the same change.
  tab1.porch.poll();
  await tab1.porch.flush();
  tab2.timers.runOnce();
  await settle();
  assert.equal(tab2.porch.getState().status, 'saved');
  assert.equal(server.revision, 2);
});

test('a refused key that another tab already replaced doesn’t sign anyone out', async () => {
  const server = memoryServer();
  const shared = memoryStorage(homeStorage());
  const tab1 = device(server, {}, {storage: sameBrowser(shared)});
  await tab1.porch.register({username: 'wren', password: 'lamplight 01'});
  tab1.porch.putAwayCodes();
  const tab2 = device(server, {}, {storage: sameBrowser(shared)});
  await tab2.porch.start();
  // tab2 changes the password; tab1's key stops working.
  await tab2.porch.changePassword({currentPassword: 'lamplight 01', newPassword: 'lamplight 02'});
  await tab1.porch.look();
  assert.notEqual(tab1.porch.getState().status, 'signed-out');
  assert.equal(tab1.porch.token(), tab2.porch.token());
  assert.ok(shared.getItem(sessionKey));
});

test('a change waiting to be sent when the password changes is still sent', async () => {
  const server = memoryServer();
  const a = device(server, homeStorage());
  await a.porch.register({username: 'wren', password: 'lamplight 01'});
  a.storage.setItem('porchlit-lights-v1', JSON.stringify({waiting: true}));
  a.porch.poll();
  assert.equal(a.porch.getState().status, 'dirty');
  await a.porch.changePassword({currentPassword: 'lamplight 01', newPassword: 'lamplight 02'});
  assert.deepEqual(a.timers.pending(), [4000]);
  a.timers.runOnce();
  await a.porch.idle();
  await settle();
  assert.deepEqual(server.doc.entries['porchlit-lights-v1'], {waiting: true});
});

test('a backup with half an emoji still imports here; it just can’t be sent to the server', async () => {
  const server = memoryServer();
  const a = device(server, homeStorage({'porchlit-lights-v1': {label: 'half \ud83d'}}));
  await a.porch.register({username: 'wren', password: 'lamplight 01'});
  assert.equal(a.porch.getState().status, 'error');
  assert.match(a.porch.getState().message, /存不进去的字符/);
  assert.equal(server.puts, 0);
});

test('if another tab changes the home while the choice is being carried out, nothing is half-done', async () => {
  const {server, a, b} = await pair();
  await change(a, 'porchlit-lights-v1', {from: 'a'});
  await change(b, 'porchlit-lights-v1', {from: 'b'});
  assert.equal(b.porch.getState().status, 'choose');
  const metaBefore = b.storage.getItem(syncKey);
  // While b's copy is on its way to history, another tab of b's browser writes.
  server.onKeep = () => b.told('porchlit-lights-v1');
  await b.porch.chooseCloud();
  assert.equal(b.porch.getState().status, 'stale');
  assert.deepEqual(b.home()['porchlit-lights-v1'], {from: 'b'}, 'not replaced');
  assert.equal(b.storage.getItem(syncKey), metaBefore, 'nothing written down');
  assert.equal(b.happened.reloads, 0);
});

test('a refused old key doesn’t sign anyone out, whichever arrives first; a save it interrupted is sent again', async () => {
  const server = memoryServer();
  const shared = memoryStorage(homeStorage());
  const tab1 = device(server, {}, {storage: sameBrowser(shared)});
  await tab1.porch.register({username: 'wren', password: 'lamplight 01'});
  tab1.porch.putAwayCodes();
  const tab2 = device(server, {}, {storage: sameBrowser(shared)});
  await tab2.porch.start();
  const oldKey = tab2.porch.token();
  // tab2 starts a save with its old key and holds it...
  shared.setItem('porchlit-lights-v1', JSON.stringify({n: 1}));
  tab2.told('porchlit-lights-v1');
  const fresh = device(server, {}, {storage: sameBrowser(shared)});
  await fresh.porch.start();
  // tab1 changes the password; tab2 hears of the new key before its old-key answer comes back.
  await tab1.porch.changePassword({currentPassword: 'lamplight 01', newPassword: 'lamplight 02'});
  fresh.told(sessionKey);
  assert.equal(fresh.porch.token(), tab1.porch.token());
  // An answer for the old key now arrives: ignored.
  const err = Object.assign(new PorchError(401, 'signed_out', '登录过期了。'), {sentToken: oldKey});
  const original = server.apiFor;
  server.apiFor = token => ({...original(token), getRevision: async () => {
    throw err;
  }});
  const late = device(server, {}, {storage: sameBrowser(shared)});
  await late.porch.start();
  await late.porch.look();
  assert.notEqual(late.porch.getState().status, 'signed-out');
  assert.ok(shared.getItem(sessionKey), 'the new session is still there');
});

test('while the page reloads, the old house in memory can’t write itself back', async () => {
  const {server, a, b} = await pair();
  await change(a, 'porchlit-lights-v1', {from: 'a'});
  await b.porch.look();
  await b.porch.takeNewer();
  assert.equal(b.happened.reloads, 1);
  // The old page writes once more before it's gone: dropped.
  b.storage.setItem('porchlit-lights-v1', JSON.stringify({from: 'old page'}));
  assert.deepEqual(b.home()['porchlit-lights-v1'], {from: 'a'});
  const after = await reopen(server, b);
  assert.equal(after.porch.getState().status, 'saved');
  assert.equal(server.puts, 2, 'nothing sent over a’s save');
});

test('a keep the server says must wait is tried again later, not sent unkept', async () => {
  const {server, a} = await pair();
  await change(a, 'porchlit-lights-v1', {from: 'a'});
  const phone = device(server, homeStorage({'porchlit-lights-v1': {from: 'phone'}}));
  await phone.porch.signIn({username: 'wren', password: 'lamplight 01'});
  server.putFail = new PorchError(429, 'slow_down', '过一会儿再存。', {retryAfter: 600});
  await phone.porch.chooseDevice();
  assert.equal(phone.porch.getState().status, 'offline');
  assert.deepEqual(phone.timers.pending(), [600000 > 300000 ? 300000 : 600000]);
  server.putFail = null;
  phone.timers.runOnce();
  await settle();
  assert.equal(phone.porch.getState().status, 'saved');
  assert.equal(server.history[0].source, 'server', 'the server’s copy was kept when it finally went');
});
