// The porch light: who is signed in on this device, and keeping the home in
// this browser and the home on the server the same.
//
// The home itself stays where it always was, in this browser's storage, under
// the keys the transfer box carries (home-transfer.js). This adds two keys of
// its own that never travel with the home: the session, and what this device
// last synced.
//
// The rule for meeting the server is in decide(): take the server's copy when
// only the server changed, send ours when only ours changed, and ask when both
// did or when the two never met. Whatever a choice replaces is put aside on
// the server first (its history), so any copy can be had back from any device.
import {checkHome, downloadHome, exportHome, importHome, isHomeKey, storableHome, summarize} from './home-transfer.js';

export {summarize};
export const sessionKey = 'porchlit-porch-session-v1';
export const syncKey = 'porchlit-porch-sync-v1';
const noteKey = 'porchlit-porch-note';
export const SAVE_LIMIT = 6 * 1024 * 1024;

// Same content gives the same text whatever order the keys come back in
// (the database hands objects back in its own order).
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}

// A short, fast hash of a string (cyrb53). Not for secrets; only to tell
// whether two copies of a home differ.
export function hash(text) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function fingerprint(entries) {
  const text = canonical(entries || {});
  return text.length + ':' + hash(text);
}

// What to do when this device's home meets the one on the server.
//   local:  the home in this browser (an exportHome document)
//   cloud:  {revision, saveId, savedAt, epoch, doc} from GET /api/home/save
//   meta:   what this device last synced, or null
// Returns {act}:
//   'none'    nothing on either side
//   'same'    both hold the same home (adopt the server's revision)
//   'take'    only the server changed: use its copy
//   'upload'  only this device changed: send it over `base`
//   'choose'  both changed, the two never met here, or the server went
//             back (a restored backup): ask, never overwrite either side
export function decide({local, cloud, meta, accountId}) {
  // A device only counts as having met this home in this life of the
  // database (the epoch changes when it's restored from a backup).
  const ours = meta && meta.accountId === accountId && (meta.epoch ?? null) === (cloud.epoch ?? null) ? meta : null;
  const empty = !Object.keys(local.entries || {}).length;
  if (!cloud.revision || !cloud.doc) return empty ? {act: 'none'} : {act: 'upload', base: {revision: 0, epoch: cloud.epoch ?? null}};
  const here = fingerprint(local.entries), there = fingerprint(cloud.doc.entries);
  const base = {revision: cloud.revision, saveId: cloud.saveId ?? null, epoch: cloud.epoch ?? null, fingerprint: there};
  if (here === there) return {act: 'same', base};
  if (empty) return {act: 'take', base};
  if (!ours) return {act: 'choose', firstTime: true};
  // This device's own save whose answer never came back: the server holds
  // exactly what it sent, one revision on.
  const pending = ours.pending;
  const landed = !!pending && cloud.revision === pending.revision + 1 && there === pending.fingerprint;
  const synced = landed ? {revision: cloud.revision, fingerprint: there} : ours;
  const changedHere = here !== synced.fingerprint;
  // The server still holds what this device last synced (same number, same content).
  if (synced.revision === cloud.revision && synced.fingerprint === there) return changedHere ? {act: 'upload', base, landed} : {act: 'same', base};
  if (synced.revision < cloud.revision && !changedHere) return {act: 'take', base};
  return {act: 'choose'};
}

export const timing = {poll: 3000, quiet: 4000, longest: 30000, look: 60000, boot: 5000, longestRetry: 300000};

// From now on, this page's writes to the home's keys in `storage` are
// dropped (another tab has the newer home; this page only has an old copy
// in memory). Other keys still work. Only setItem and removeItem are
// covered: the house must keep writing its storage that way (not by
// assigning localStorage[key], delete, or clear()).
export function keepHomeWritesOut(storage) {
  const Storage = globalThis.Storage;
  if (Storage && storage instanceof Storage) {
    const proto = Storage.prototype;
    if (proto.porchGuarded) return;
    const set = proto.setItem, remove = proto.removeItem;
    proto.setItem = function (key, value) {
      if (this === storage && isHomeKey(String(key))) return;
      return set.call(this, key, value);
    };
    proto.removeItem = function (key) {
      if (this === storage && isHomeKey(String(key))) return;
      return remove.call(this, key);
    };
    proto.porchGuarded = true;
    return;
  }
  if (storage.porchGuarded) return;
  const set = storage.setItem, remove = storage.removeItem;
  storage.setItem = (key, value) => (isHomeKey(String(key)) ? undefined : set.call(storage, key, value));
  storage.removeItem = key => (isHomeKey(String(key)) ? undefined : remove.call(storage, key));
  storage.porchGuarded = true;
}

export function createPorch({
  api,
  storage = globalThis.localStorage,
  notes = globalThis.sessionStorage,
  now = () => Date.now(),
  reload = () => globalThis.location.reload(),
  download = downloadHome,
  timers = globalThis,
  visible = () => globalThis.document?.visibilityState !== 'hidden',
  events = globalThis,
  guard = keepHomeWritesOut
}) {
  const read = key => {
    try {
      return JSON.parse(storage.getItem(key));
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  const forget = key => {
    try {
      storage.removeItem(key);
    } catch {}
  };
  const iso = () => new Date(now()).toISOString();
  const exportHere = () => exportHome(storage);

  const readSession = () => {
    const s = read(sessionKey);
    return s && typeof s.token === 'string' && s.token.startsWith('pcs_') && s.account && typeof s.account.id === 'string' && typeof s.account.username === 'string' ? s : null;
  };
  const person = a => ({id: String(a.id), username: a.username, nickname: a.nickname ?? null});
  const readMeta = () => {
    const m = read(syncKey);
    return m && typeof m.accountId === 'string' && Number.isSafeInteger(m.revision) && typeof m.fingerprint === 'string' ? m : null;
  };

  // The session this page works with. It is held here, not re-read from
  // storage, so another tab signing in as someone else can't redirect this
  // page's requests; that tab's change reloads this page instead.
  let session = readSession();
  const ownMeta = () => {
    const m = readMeta();
    return m && session && m.accountId === session.account.id ? m : null;
  };

  // A line to show once after the page reloads itself.
  let leftNote = '';
  try {
    leftNote = notes?.getItem(noteKey) || '';
    notes?.removeItem(noteKey);
  } catch {}

  let state = {
    account: session?.account ?? null,
    status: session ? 'checking' : 'signed-out',
    savedAt: session ? ownMeta()?.savedAt ?? null : null,
    message: '',
    note: leftNote,
    choice: null,
    codes: null,
    codesLeft: null,
    // The AIs living in the home, by name ({name, nickname}), and how many of their acts wait to be let in, as the
    // last look at the save's revision heard (src/machine-visit.jsx).
    residents: [],
    actsWaiting: 0
  };
  const listeners = new Set();
  const set = patch => {
    state = {...state, ...patch};
    // Once another tab has changed the home, this page stays stopped until it reloads.
    if (staleTab) state.status = 'stale';
    for (const f of listeners) f();
  };
  let staleTab = false, drawn = false;

  // Written after every successful meeting with the server.
  function remember(base, extra = {}) {
    const ok = write(syncKey, {accountId: session.account.id, revision: base.revision, saveId: base.saveId ?? null, epoch: base.epoch ?? null, fingerprint: base.fingerprint, savedAt: base.savedAt ?? null, changedAt: null, ...extra});
    if (!ok) set({status: 'error', message: '这台设备的存储满了，同步记录写不进去。'});
    return ok;
  }
  const patchMeta = patch => {
    const m = ownMeta();
    if (m) write(syncKey, {...m, ...patch});
  };

  let stopped = false;
  function leaveWith(line, {after = 0} = {}) {
    // Until the page is really gone, the old house in memory could still
    // write itself back over what was just taken: from here on, it can't.
    guard(storage);
    stop();
    stopped = true;
    try {
      notes?.setItem(noteKey, line);
    } catch {}
    if (after) timers.setTimeout(reload, after);
    else reload();
  }

  // Puts a home into this browser, unless another tab changed it meanwhile
  // (then this page's writes are being dropped, and it will reload instead).
  function bringIn(doc) {
    if (staleTab) return false;
    importHome(storage, doc);
    return true;
  }

  // Can this home go to the server? Returns the reason if not (too big, or
  // text the database can't hold), with its size in bytes either way.
  function fitForServer(doc) {
    try {
      checkHome(doc);
      storableHome(doc);
    } catch (err) {
      return {problem: err.message + '，没法存上云。', bytes: 0};
    }
    const bytes = new TextEncoder().encode(JSON.stringify(doc)).length;
    if (bytes > SAVE_LIMIT - 1024) return {problem: '家太大了（超过 6 MB），云上存不下。', bytes};
    return {problem: '', bytes};
  }

  // ---- talking to the server, one thing at a time

  let busy = null;
  let backoff = 0, retryTimer = null, pausing = false;

  function trouble(err) {
    if (err?.status === 401) {
      if (pausing) return;
      const stored = readSession();
      // Another tab of this person got a new key (changed the password), or
      // this page already took it: the refused key is an old one. Carry on
      // with the new key; a save it interrupted goes again.
      const adopt = stored && session && stored.token !== session.token && stored.account.id === session.account.id;
      if (adopt) session = stored;
      if (adopt || (session && err.sentToken && err.sentToken !== session.token)) {
        if (state.status === 'saving' || state.status === 'checking') scheduleUpload();
        return;
      }
      if (!stored || stored.token === session?.token) forget(sessionKey);
      session = null;
      stop();
      set({account: null, status: 'signed-out', choice: null, codes: null, codesLeft: null, ours: false, reportsOpen: 0, entriesWaiting: 0, residents: [], actsWaiting: 0, note: '登录过期了，再点一次灯。'});
      return;
    }
    if (err?.code === 'offline' || err?.code === 'stale' || err?.status === 429 || err?.status >= 500) {
      // Look at every change again once this clears.
      rawCache = null;
      set({status: 'offline', message: err.code === 'offline' ? '连不上云。家先存在这台设备上，连上了自己补上。' : err.code === 'stale' ? '云上一直在变，等一下再存。' : err.message});
      const wait = Math.min(timing.longestRetry, Math.max((err.retryAfter || 0) * 1000, 10000 * 2 ** backoff));
      backoff = Math.min(backoff + 1, 6);
      timers.clearTimeout(retryTimer);
      retryTimer = timers.setTimeout(() => {
        if (session && state.status === 'offline') run(() => meet({auto: true}));
      }, wait);
      return;
    }
    // Something the server won't take (too big, odd text): wait for the next change.
    set({status: 'error', message: err?.message || '没有存上。'});
  }

  // For things a person clicked: wait for whatever is running, then go.
  async function queue(job) {
    while (busy) await busy;
    return run(job);
  }

  function run(job) {
    if (busy) return busy;
    busy = (async () => {
      try {
        await job();
      } catch (err) {
        trouble(err);
      } finally {
        busy = null;
      }
    })();
    return busy;
  }

  // Sends this device's home over `base` ({revision, saveId}).
  async function upload(base, {keep = false, attempt = 0, keepalive = false} = {}) {
    const doc = exportHere();
    if (!Object.keys(doc.entries).length) return set({status: 'idle'});
    const {problem, bytes} = fitForServer(doc);
    if (problem) return set({status: 'error', message: problem});
    const print = fingerprint(doc.entries);
    set({status: 'saving'});
    // If the answer gets lost, the next meeting can still recognise this save.
    const meta = ownMeta() || {accountId: session.account.id, revision: base.revision, saveId: base.saveId ?? null, epoch: base.epoch ?? null, fingerprint: '', savedAt: null, changedAt: null};
    write(syncKey, {...meta, pending: {revision: base.revision, fingerprint: print}});
    try {
      const saved = await api.putSave({revision: base.revision, saveId: base.saveId, doc, keep, bytes, keepalive: keepalive && bytes < 60000});
      if (!remember({...saved, fingerprint: print})) return;
      backoff = 0;
      set({status: 'saved', savedAt: saved.savedAt, message: ''});
    } catch (err) {
      if (err?.status && err.status < 500 && err.status !== 429) patchMeta({pending: null});
      // Someone saved in between: look at the server again (at most twice).
      if (err?.code === 'stale' && attempt < 2) return meet({auto: true, attempt: attempt + 1, keep});
      throw err;
    }
  }

  // Meets the server's copy and does what decide() says.
  async function meet(options = {}) {
    if (!session) return;
    const cloud = await api.getSave(options.starting ? {timeout: timing.boot} : {});
    return act(cloud, options);
  }

  // Does what decide() says about this device's home and `cloud`.
  // `starting`: the house isn't drawn yet, so taking the server's copy needs
  // no reload. `auto`: nobody asked just now, so don't reload under them;
  // say there's a newer copy instead.
  async function act(cloud, {starting = false, auto = false, attempt = 0, keep = false} = {}) {
    if (!session || stopped) return;
    const local = exportHere();
    const plan = decide({local, cloud, meta: readMeta(), accountId: session.account.id});
    const ours = ownMeta();
    if (plan.act === 'none') return set({status: 'idle', message: ''});
    if (plan.act === 'same') {
      if (!remember({...plan.base, savedAt: cloud.savedAt})) return;
      backoff = 0;
      return set({status: 'saved', savedAt: cloud.savedAt, message: ''});
    }
    if (plan.act === 'take') {
      if (auto && !starting) return set({status: 'newer', message: ''});
      if (!bringIn(cloud.doc)) return;
      if (!remember({...plan.base, savedAt: cloud.savedAt})) return;
      backoff = 0;
      set({status: 'saved', savedAt: cloud.savedAt, message: ''});
      if (!starting) leaveWith('换上了云上的家。');
      return;
    }
    if (plan.act === 'upload') {
      // A save of ours that landed though its answer was lost: count it as synced.
      if (plan.landed) patchMeta({revision: cloud.revision, saveId: cloud.saveId ?? null, fingerprint: ours.pending.fingerprint, savedAt: cloud.savedAt, pending: null});
      return upload(plan.base, {keep: keep || !!ours?.keepNext, attempt});
    }
    set({
      status: 'choose',
      choice: {
        firstTime: !!plan.firstTime,
        cloud: {revision: cloud.revision, saveId: cloud.saveId ?? null, epoch: cloud.epoch ?? null, savedAt: cloud.savedAt, doc: cloud.doc, ...summarize(cloud.doc)},
        local: {changedAt: ours?.changedAt ?? null, ...summarize(local)}
      }
    });
  }

  // ---- watching this device for changes, and the server for other devices

  let pollTimer = null, lookTimer = null, uploadTimer = null;
  let rawCache = null, dirtySince = null, watching = false;

  // Has the stored text of any home key changed since last time? Compares
  // the strings themselves (fast, done by the browser), not a hash of them.
  function rawChanged() {
    const before = rawCache;
    const after = new Map();
    let changed = before === null;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!isHomeKey(key)) continue;
      const value = storage.getItem(key);
      after.set(key, value);
      if (!changed && before.get(key) !== value) changed = true;
    }
    if (!changed && before.size !== after.size) changed = true;
    rawCache = after;
    return changed;
  }

  // Every few seconds. Only takes notice when it can act on what it sees;
  // otherwise the next look sees the same difference again.
  function poll() {
    if (!session || busy || staleTab || stopped) return;
    if (state.status === 'choose') {
      // Keep what the choice shows about this device up to date.
      const seen = rawCache !== null;
      if (rawChanged() && seen && state.choice) set({choice: {...state.choice, local: {...state.choice.local, changedAt: iso(), ...summarize(exportHere())}}});
      return;
    }
    if (!['saved', 'idle', 'dirty', 'error', 'newer'].includes(state.status)) return;
    if (!rawChanged()) return;
    const meta = ownMeta();
    if (meta && fingerprint(exportHere().entries) === meta.fingerprint) {
      // Changed back to what's on the server already.
      if (state.status === 'dirty') {
        timers.clearTimeout(uploadTimer);
        dirtySince = null;
        set({status: 'saved'});
      }
      return;
    }
    if (meta && !meta.changedAt) patchMeta({changedAt: iso()});
    // Another device saved, and now this one has changes too: ask.
    if (state.status === 'newer') return run(() => meet({auto: true}));
    scheduleUpload();
  }

  function scheduleUpload() {
    dirtySince ??= now();
    set({status: 'dirty', message: ''});
    timers.clearTimeout(uploadTimer);
    const wait = Math.max(0, Math.min(timing.quiet, dirtySince + timing.longest - now()));
    uploadTimer = timers.setTimeout(() => flush(), wait);
  }

  // Sends this device's changes now, if there are any waiting.
  function flush({keepalive = false} = {}) {
    timers.clearTimeout(uploadTimer);
    if (state.status !== 'dirty' || !session || staleTab || stopped) return busy || Promise.resolve();
    dirtySince = null;
    return run(async () => {
      const meta = ownMeta();
      if (meta && !meta.pending) await upload({revision: meta.revision, saveId: meta.saveId, epoch: meta.epoch}, {keep: !!meta.keepNext, keepalive});
      else await meet({auto: true});
    });
  }

  // Has another device saved since? Asks only for the revision number.
  function look() {
    if (!session || !visible() || busy || staleTab || stopped || !['saved', 'idle', 'offline', 'error', 'newer'].includes(state.status)) return Promise.resolve();
    return run(async () => {
      const meta = ownMeta();
      if (!meta || meta.pending) return meet({auto: true});
      const cloud = await api.getRevision();
      if (Number.isInteger(cloud.acts) && cloud.acts !== state.actsWaiting) set({actsWaiting: cloud.acts});
      // The database was restored: meet properly (it will ask).
      if ((cloud.epoch ?? null) !== (meta.epoch ?? null)) return meet({auto: true});
      const sameSave = cloud.revision === meta.revision && (!cloud.saveId || !meta.saveId || cloud.saveId === meta.saveId);
      const changedHere = fingerprint(exportHere().entries) !== meta.fingerprint;
      if (sameSave) {
        if (changedHere) return state.status === 'error' ? undefined : upload({revision: meta.revision, saveId: meta.saveId, epoch: meta.epoch}, {keep: !!meta.keepNext});
        if (state.status !== 'saved') set({status: 'saved', savedAt: meta.savedAt, message: ''});
        return;
      }
      if (changedHere || cloud.revision < meta.revision) return meet({auto: true});
      set({status: 'newer', message: ''});
    });
  }

  // Another tab of this house changed the home or the session: what this page
  // holds in memory is out of date, and its next change would write the old
  // home back. Stop, and reload when the person comes back to this tab.
  function onStorage(e) {
    if (stopped || !e.key) return;
    // Before the house is drawn, it will read whatever is stored then.
    if (!drawn && e.key !== sessionKey) return;
    // The wardrobe opens inside the house page; its saves are this page's own.
    try {
      if (new URL(e.url).pathname.startsWith('/body/')) return;
    } catch {}
    if (e.key === sessionKey) {
      const theirs = readSession();
      // Same person, new key (a password change elsewhere): just use it.
      if (theirs && session && theirs.account.id === session.account.id) {
        session = theirs;
        return;
      }
    } else if (e.key !== syncKey && !isHomeKey(e.key)) return;
    if (e.key === syncKey && !isHomeKey(e.key)) {
      // Only the sync record moved (another tab saved what's already here).
      const theirs = readMeta();
      if (theirs && fingerprint(exportHere().entries) === theirs.fingerprint) return;
    }
    staleTab = true;
    timers.clearTimeout(uploadTimer);
    // This page's own writes of the home would put the old one back: drop them.
    guard(storage);
    set({status: 'stale', message: ''});
  }
  const onVisibility = () => {
    // (Not while the recovery codes are on screen: they'd be gone.)
    if (staleTab && visible() && !state.codes) return leaveWith('另一个标签页改过家里，这一页刷新到了最新。');
    if (visible()) look();
    else flush();
  };
  const onPageShow = e => {
    // Back from the browser's back/forward cache: what's on the page may be old.
    if (e.persisted) leaveWith('');
  };
  const onPageHide = () => flush({keepalive: true});

  function watch() {
    timers.clearInterval(pollTimer);
    timers.clearInterval(lookTimer);
    pollTimer = timers.setInterval(poll, timing.poll);
    lookTimer = timers.setInterval(look, timing.look);
    if (!watching) {
      watching = true;
      events.document?.addEventListener?.('visibilitychange', onVisibility);
      events.addEventListener?.('pagehide', onPageHide);
      events.addEventListener?.('pageshow', onPageShow);
    }
  }

  function stop() {
    timers.clearInterval(pollTimer);
    timers.clearInterval(lookTimer);
    timers.clearTimeout(uploadTimer);
    timers.clearTimeout(retryTimer);
    pollTimer = lookTimer = uploadTimer = retryTimer = null;
    dirtySince = null;
    if (watching) {
      watching = false;
      events.document?.removeEventListener?.('visibilitychange', onVisibility);
      events.removeEventListener?.('pagehide', onPageHide);
      events.removeEventListener?.('pageshow', onPageShow);
    }
  }

  // Always listening for other tabs, signed in or not.
  events.addEventListener?.('storage', onStorage);

  // ---- signing in and out

  // Bumped whenever who is signed in changes, so a late answer for the
  // previous person is ignored.
  let generation = 0;

  function begin(token, account, extra = {}) {
    generation++;
    session = {token, account: person(account)};
    write(sessionKey, session);
    rawCache = null;
    set({account: session.account, status: 'checking', note: '', message: '', choice: null, ...extra});
  }

  async function settle() {
    await queue(() => meet());
    if (session) {
      watch();
      refresh();
    }
  }

  async function refresh() {
    const asked = generation;
    try {
      const me = await api.me();
      if (asked !== generation || !session) return;
      session = {...session, account: person(me.account)};
      write(sessionKey, session);
      // ours: whether this account is the one this home's own things are for (src/ours-load.js).
      // keeper: how many reports wait for the home the place is run by (the porch lamp shows a dot).
      set({account: session.account, codesLeft: me.recoveryCodesLeft, ours: me.ours === true, reportsOpen: me.keeper?.reports ?? 0, entriesWaiting: me.keeper?.waiting ?? 0, residents: Array.isArray(me.residents) ? me.residents : []});
    } catch (err) {
      if (asked === generation && err?.status === 401) trouble(err);
    }
  }

  // Waits for whatever is talking to the server to finish, with nothing new starting.
  async function pause() {
    pausing = true;
    timers.clearInterval(pollTimer);
    timers.clearInterval(lookTimer);
    timers.clearTimeout(uploadTimer);
    timers.clearTimeout(retryTimer);
    await busy;
  }
  function resume() {
    pausing = false;
    if (!session || stopped) return;
    watch();
    if (state.status === 'dirty') scheduleUpload();
  }

  // Hands this device's home to the server's history, and again if it
  // changed meanwhile, until what was handed over is what's here. Copies the
  // server already has (`known` fingerprints) need no handing over.
  // Returns {cannot} when the server can't take it, {moving} when it keeps
  // changing, or {} when done.
  async function handOver(known) {
    let kept = null;
    for (let i = 0; i < 4; i++) {
      const current = exportHere();
      const print = fingerprint(current.entries);
      if (!Object.keys(current.entries).length || known.includes(print) || print === kept) return {};
      const {problem, bytes} = fitForServer(current);
      if (problem) return {cannot: problem};
      await api.keepCopy({doc: current, bytes});
      kept = print;
    }
    return {moving: true};
  }

  return {
    subscribe(f) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    getState: () => state,
    token: () => session?.token ?? null,
    // The house is drawn: from now on, another tab changing the home makes
    // what this page holds out of date.
    ready() {
      drawn = true;
    },
    clearNote: () => set({note: ''}),
    // The community map: where this home stands and the light at its door,
    // a street, and setting that light (server/streets.mjs).
    home: async () => (await api.me()).home,
    street: id => api.street(id),
    setDoorLight: light => api.setPorch(light),
    // Doors (server/doors.mjs): knocking and leaving something at someone's,
    // and what is waiting at one's own.
    door: where => api.door(where),
    knock: where => api.knock(where),
    leaveMail: what => api.leaveMail(what),
    ownDoor: () => api.ownDoor(),
    takeMail: id => api.takeMail(id),
    declineMail: id => api.declineMail(id),
    seeKnocks: () => api.seeKnocks(),
    block: visitId => api.block(visitId),
    unblock: id => api.unblock(id),
    // Hanging a door plate may take an invitation; the home the place is run by writes them (server/invites.mjs).
    plateRules: () => api.plateRules(),
    entryQuestions: () => api.entryQuestions(),
    async entry() {
      const r = await api.entry();
      set({entriesWaiting: r.door.waiting});
      return r;
    },
    setEntry: door => api.setEntry(door),
    addQuestion: q => api.addQuestion(q),
    editQuestion: (id, q) => api.editQuestion(id, q),
    removeQuestion: id => api.removeQuestion(id),
    decideEntry: (id, letIn) => api.decideEntry(id, letIn),
    // The spare keys of a door plate still waiting to be let in, put away.
    putAwayPending: () => set({pending: null}),
    invites: () => api.invites(),
    writeInvite: label => api.writeInvite(label),
    tearInvite: id => api.tearInvite(id),
    // Reporting (server/reports.mjs); reading the reports, for the home the place is run by, brings its count up to date.
    report: what => api.report(what),
    async reports() {
      const r = await api.reports();
      set({reportsOpen: r.openCount ?? r.open.length});
      return r;
    },
    reportCopy: id => api.reportCopy(id),
    closeReport: (id, how) => api.closeReport(id, how),
    // Drift bottles (server/bottles.mjs).
    bottles: day => api.bottles(day),
    throwBottle: bottle => api.throwBottle(bottle),
    openBottle: key => api.openBottle(key),
    // AIs living in the home (server/residents.mjs). Looking brings the names on the card up to date.
    async residents() {
      const r = await api.residents();
      set({residents: r.residents.map(x => x.account)});
      return r;
    },
    peekMoveIn: code => api.peekMoveIn(code),
    openMoveIn: code => api.openMoveIn(code),
    cancelMoveIn: id => api.cancelMoveIn(id),
    sendAway: id => api.sendAway(id),
    residentPassword: (id, passwords) => api.residentPassword(id, passwords),
    aiInvite: () => api.aiInvite(),
    takeAiInvite: () => api.takeAiInvite(),
    tearAiInvite: () => api.tearAiInvite(),
    // What they asked to do in the home (src/machine-acts.js lets it in), and the copy of the home this device last
    // synced, which acts may only go into when it is the one the server has.
    acts: () => api.acts(),
    // The wardrobe as this page works it out, told to the server for the AIs living here (server/acts.mjs).
    closet: closet => api.closet(closet),
    synced() {
      const m = ownMeta();
      return m ? {revision: m.revision, saveId: m.saveId ?? null, pending: !!m.pending} : null;
    },
    idle: () => busy || Promise.resolve(),

    // Before the house is drawn: if someone is signed in here, ask the
    // server once (a few seconds at most) and take its copy if only it
    // changed. Anything else (sending, asking) happens after drawing.
    async start() {
      if (!session) return set({status: 'signed-out'});
      let cloud = null;
      try {
        cloud = await api.getSave({timeout: timing.boot});
      } catch (err) {
        trouble(err);
      }
      if (cloud && session) {
        const plan = decide({local: exportHere(), cloud, meta: readMeta(), accountId: session.account.id});
        if (plan.act === 'take' || plan.act === 'same' || plan.act === 'none') {
          try {
            await run(async () => {
              if (plan.act === 'take' && !bringIn(cloud.doc)) return;
              if (plan.act !== 'none') remember({...plan.base, savedAt: cloud.savedAt});
              set({status: plan.act === 'none' ? 'idle' : 'saved', savedAt: cloud.savedAt, message: ''});
            });
          } catch {}
        } else {
          // Don't hold up the house for a save or a question: meet again
          // once it's drawn (another tab may have saved meanwhile).
          timers.setTimeout(() => run(() => meet({auto: true})), 0);
        }
      }
      if (session) {
        watch();
        refresh();
      }
    },

    async signIn({username, password}) {
      const r = await api.signIn({username, password});
      begin(r.session.token, r.account);
      await settle();
    },
    async register({username, password, nickname, invite, answers, adult}) {
      const r = await api.register({username, password, nickname, invite, answers, adult});
      // Short answers to be read first: nobody is signed in yet; the spare keys are shown once all the same.
      if (r.pending) return set({pending: {username: r.account.username, codes: r.recoveryCodes}});
      begin(r.session.token, r.account, {codes: r.recoveryCodes, codesLeft: r.recoveryCodes.length});
      await settle();
    },
    // The recovery codes are shown once; after this they're gone from the page.
    putAwayCodes: () => set({codes: null}),
    // A fresh set, shown the same way (the old ones left stop working).
    async renewCodes(currentPassword) {
      const r = await api.renewCodes(currentPassword);
      set({codes: r.recoveryCodes, codesLeft: r.recoveryCodesLeft});
    },
    async recover({username, code, newPassword}) {
      const r = await api.recover({username, code, newPassword});
      begin(r.session.token, r.account, {codesLeft: r.recoveryCodesLeft});
      await settle();
    },
    async changePassword({currentPassword, newPassword}) {
      // Nothing else talks to the server meanwhile: the old key stops
      // working the moment the new one is made.
      await pause();
      try {
        const r = await api.changePassword({currentPassword, newPassword});
        session = {...session, token: r.session.token};
        write(sessionKey, session);
      } finally {
        resume();
      }
    },
    async signOut() {
      await flush();
      await pause();
      try {
        await api.signOut();
      } catch {}
      generation++;
      forget(sessionKey);
      session = null;
      pausing = false;
      stop();
      set({account: null, status: 'signed-out', choice: null, codes: null, codesLeft: null, ours: false, reportsOpen: 0, entriesWaiting: 0, residents: [], actsWaiting: 0, note: '', message: ''});
    },

    // ---- when both sides changed (or never met)

    // Use the server's copy. This device's copy goes to the server's
    // history first, so it can be had back; if that fails, nothing changes.
    // When the server can't take it (too big, odd text), the person can
    // have it downloaded as a file instead (`download: true`).
    chooseCloud({download: asFile = false, downloaded = false} = {}) {
      const c = state.choice;
      if (!c || !session) return Promise.resolve();
      if (asFile) {
        // First the file; the person says when they have it.
        download(exportHere());
        set({choice: {...c, downloaded: true}});
        return Promise.resolve();
      }
      return queue(async () => {
        set({message: ''});
        const cloudPrint = fingerprint(c.cloud.doc.entries);
        if (!downloaded) {
          let handed;
          try {
            handed = await handOver([cloudPrint]);
          } catch (err) {
            if (err?.status === 401) throw err;
            return set({message: '没能先把这台设备上的这份存进云上的旧版本，所以先没换。' + (err?.message ? `（${err.message}）` : '')});
          }
          if (handed.cannot) return set({choice: {...state.choice, cannotKeep: handed.cannot}});
          if (handed.moving) return set({message: '这台设备上一直在改，停一下再换。'});
        }
        if (!bringIn(c.cloud.doc)) return;
        if (!remember({revision: c.cloud.revision, saveId: c.cloud.saveId, epoch: c.cloud.epoch, fingerprint: cloudPrint, savedAt: c.cloud.savedAt})) return;
        set({choice: null, status: 'saved', savedAt: c.cloud.savedAt});
        leaveWith(downloaded ? '换上了云上的家。这台设备原来那份在你下载的文件里。' : '换上了云上的家。这台设备原来那份存进了云上的旧版本。');
      });
    },
    // Keep this device's copy and send it; the server puts its own aside.
    // The decision is written down first, so a dropped connection doesn't
    // ask the same question again.
    chooseDevice() {
      const c = state.choice;
      if (!c || !session) return Promise.resolve();
      const {problem} = fitForServer(exportHere());
      if (problem) {
        set({message: problem + '只能先用云上的。'});
        return Promise.resolve();
      }
      const base = {revision: c.cloud.revision, saveId: c.cloud.saveId, epoch: c.cloud.epoch, fingerprint: fingerprint(c.cloud.doc.entries), savedAt: c.cloud.savedAt};
      if (!remember(base, {keepNext: true, changedAt: iso()})) return Promise.resolve();
      set({choice: null, message: ''});
      return queue(() => upload(base, {keep: true}));
    },
    // Another device saved and nothing changed here: take theirs.
    takeNewer: () => queue(() => meet()),
    tryAgain: () => queue(() => meet({auto: true})),
    reloadPage: () => leaveWith(''),

    // ---- the server's history: copies that were put aside

    async history() {
      const r = await api.history();
      return r.versions;
    },
    async downloadCopy(id) {
      const r = await api.historyCopy(id);
      download(r.version.doc);
    },
    // Makes a put-aside copy this device's home again. It's then sent like
    // a change made here, over whatever the server holds now, which the
    // server puts aside. Changes here that never reached the server are put
    // aside first; if they can't be, nothing changes.
    restoreCopy(id) {
      if (!session) return Promise.resolve();
      return queue(async () => {
        set({message: ''});
        const r = await api.historyCopy(id);
        const cloud = await api.getSave();
        const cloudPrint = cloud.doc ? fingerprint(cloud.doc.entries) : null;
        const handed = await handOver([cloudPrint, ownMeta()?.fingerprint].filter(Boolean));
        if (handed.cannot) return set({message: '这台设备上还有没存上云的改动，而且存不进旧版本（' + handed.cannot + '），所以先没换回。'});
        if (handed.moving) return set({message: '这台设备上一直在改，停一下再换回。'});
        if (!bringIn(r.version.doc)) return;
        const base = cloud.doc ? {revision: cloud.revision, saveId: cloud.saveId, epoch: cloud.epoch, fingerprint: cloudPrint, savedAt: cloud.savedAt} : {revision: 0, saveId: null, epoch: cloud.epoch, fingerprint: '', savedAt: null};
        if (!remember(base, {keepNext: true, changedAt: iso()})) return;
        leaveWith('换回了云上的那份旧版本。');
      });
    },

    // For tests, and for leaving the page.
    poll,
    flush,
    look,
    stop
  };
}
