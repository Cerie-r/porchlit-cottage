// Hide-and-seek. On her first visit of each day the partner's figure hides
// somewhere in the house and waits to be found. Where it hides follows from
// the day and this home's seed, so every device of the home agrees without
// writing anything down; only a find is saved (into the home, which syncs).
// When she came in, and so how long she has been looking, is this device's
// own business and lives outside the home save. This file is the state; the
// spots' geometry is in hide-and-seek-spots.js, the scene in hide-and-seek.jsx.

export const SPOT_IDS = ['wardrobe', 'quilt', 'armchair', 'island'];
export const spotLabels = {wardrobe: '衣柜里', quilt: '被子底下', armchair: '单椅背后', island: '岛台背后'};
// A search longer than this earns a longer kiss.
export const LONG_SEARCH = 120;
// After this long the hint starts to fidget.
export const WIGGLE_AFTER = 90;
// Until the first find gives the home a seed of its own.
export const FIRST_SEED = 'porchlit';
// This device's visit: {day, enteredAt}. Not a home key, so never synced.
export const VISIT_KEY = 'porchlit-seek-visit-v1';
const BOOK_LIMIT = 1000;
const EPOCH = '2026-01-01';
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const isTime = v => Number.isFinite(v) && v > 0;

// Making a date formatter takes over ten times as long as using one, and the house asks for the day many times
// each time it draws: one formatter per zone, made once. (Without a zone it follows the device's own zone, which can
// change while the page is open, so that one is made fresh each time.)
const dayFormats = new Map();
function dayFormat(zone) {
  let format = dayFormats.get(zone);
  if (format) return format;
  const options = {year: 'numeric', month: '2-digit', day: '2-digit'};
  try {
    format = new Intl.DateTimeFormat('en-US', {...options, timeZone: zone});
  } catch {
    format = new Intl.DateTimeFormat('en-US', {...options, timeZone: 'UTC'});
  }
  if (typeof zone === 'string') dayFormats.set(zone, format);
  return format;
}

// The calendar day ("2026-10-24") at `date` in the home's time zone.
export function dayIn(zone, date = new Date()) {
  const parts = dayFormat(zone).formatToParts(date);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const dayNumber = day => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};
export const shiftDay = (day, n) => new Date((dayNumber(day) + n) * 86400000).toISOString().slice(0, 10);

// cyrb53: short and well spread; only for picking, never for secrets.
function hash(text) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function newSeed(random = globalThis.crypto) {
  const bytes = new Uint8Array(8);
  random.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

// The day's spot when every spot is open: one long chain from a fixed day,
// each day choosing among the spots the day before didn't use. Every device
// walks the same chain, so they agree, and no two days running match.
const chains = new Map();
export function plannedSpot(day, seed) {
  const pick = (d, choices) => choices[hash(`${seed}:${d}`) % choices.length];
  const n = dayNumber(day) - dayNumber(EPOCH);
  if (!(n >= 0) || n > 36600) return pick(day, SPOT_IDS);
  let chain = chains.get(seed);
  if (!chain) {
    chain = [pick(EPOCH, SPOT_IDS)];
    if (chains.size > 8) chains.clear();
    chains.set(seed, chain);
  }
  while (chain.length <= n) {
    const d = shiftDay(EPOCH, chain.length), last = chain[chain.length - 1];
    chain.push(pick(d, SPOT_IDS.filter(id => id !== last)));
  }
  return chain[n];
}

// Where he hides on `day`, out of the spots open now. `yesterday` is where he
// hid the day before; he doesn't go back there when there's another choice.
// When the plan can't be kept, the day's own order of spots decides, so a
// spot closing elsewhere in the house doesn't move him.
export function spotFor(day, seed, available, yesterday = null) {
  const open = SPOT_IDS.filter(id => available.includes(id));
  if (!open.length) return null;
  const planned = plannedSpot(day, seed);
  if (open.includes(planned) && (planned !== yesterday || open.length === 1)) return planned;
  const start = hash(`${seed}:${day}:again`) % SPOT_IDS.length;
  const order = SPOT_IDS.map((_, i) => SPOT_IDS[(start + i) % SPOT_IDS.length]);
  return order.find(id => open.includes(id) && id !== yesterday) || order.find(id => open.includes(id));
}

// Who chose a hiding place (an AI living in the home, src/machine-acts.js): {id, name}.
const chooser = b => b && typeof b === 'object' && typeof b.id === 'string' && /^[1-9][0-9]{0,17}$/.test(b.id) && typeof b.name === 'string' && b.name.trim() && [...b.name].length <= 64 ? {id: b.id, name: b.name.trim()} : null;

// Whatever was saved, as something safe to use. `chosen`: where an AI living here chose to hide on one day, instead
// of where the day would put him ({day, spot, by}).
export function cleanHideSeek(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const seed = typeof r.seed === 'string' && /^[0-9a-f]{8,32}$/.test(r.seed) ? r.seed : null;
  const byDay = new Map();
  for (const e of Array.isArray(r.book) ? r.book : []) {
    if (e && typeof e === 'object' && dayPattern.test(e.day) && SPOT_IDS.includes(e.spot) && Number.isSafeInteger(e.seconds) && e.seconds >= 0) {
      byDay.set(e.day, {day: e.day, spot: e.spot, seconds: e.seconds, ...(chooser(e.chose) ? {chose: chooser(e.chose)} : {})});
    }
  }
  const book = [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-BOOK_LIMIT);
  const total = Math.max(book.length, Number.isSafeInteger(r.total) && r.total > 0 ? r.total : 0);
  const c = r.chosen, by = chooser(c?.by);
  const chosen = c && typeof c === 'object' && typeof c.day === 'string' && dayPattern.test(c.day) && SPOT_IDS.includes(c.spot) && by ? {day: c.day, spot: c.spot, by} : null;
  return {seed, book, total, ...(chosen ? {chosen} : {})};
}

const foundOn = (state, day) => state.book.find(e => e.day === day) || null;

// Where he hid the day before `day`: where she found him, or else where the
// plan had him. (Working out where the house really put him on an unfound
// day would have to use today's furniture, and then moving one piece of
// furniture could move him today too; better a rare repeat than that.)
const hidBefore = (s, day, seed) => foundOn(s, shiftDay(day, -1))?.spot || plannedSpot(shiftDay(day, -1), seed);

// Where he is hiding on `day`, or null: found already, or nowhere to hide. Where an AI living here chose to hide that
// day, if it can still be got into.
export function hidingOn(state, day, available) {
  const s = cleanHideSeek(state);
  if (!day || foundOn(s, day)) return null;
  if (s.chosen?.day === day && available.includes(s.chosen.spot)) return s.chosen.spot;
  const seed = s.seed || FIRST_SEED;
  return spotFor(day, seed, available, hidBefore(s, day, seed));
}

// This device's visit, as saved.
export function cleanVisit(raw) {
  return raw && typeof raw === 'object' && dayPattern.test(raw.day) && isTime(raw.enteredAt) ? {day: raw.day, enteredAt: raw.enteredAt} : null;
}

// Coming in: the first time on a new day starts a new visit (and, unless he
// was already found that day, a new hide-and-seek).
export function enterVisit(visit, day, now) {
  const v = cleanVisit(visit);
  return v?.day === day ? {visit: v, first: false} : {visit: {day, enteredAt: now}, first: true};
}

// Found him at `spot` on the visit's day. Saves the day, how long it took and
// (the first time) a seed of the home's own.
export function markFound(state, {day, spot, seconds, seed}) {
  const s = cleanHideSeek(state);
  if (!dayPattern.test(day) || !SPOT_IDS.includes(spot) || foundOn(s, day)) return s;
  // Found where the AI chose to hide: the diary says it chose.
  const chose = s.chosen?.day === day && s.chosen.spot === spot ? {chose: s.chosen.by} : {};
  const entry = {day, spot, seconds: Math.max(0, Math.round(seconds) || 0), ...chose};
  return {seed: s.seed || seed, book: [...s.book, entry].sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-BOOK_LIMIT), total: s.total + 1, ...(s.chosen ? {chosen: s.chosen} : {})};
}

export const kissFor = seconds => (seconds >= LONG_SEARCH ? 'long' : 'cheek');
export const fidgeting = (visit, now) => !!visit && now - visit.enteredAt > WIGGLE_AFTER * 1000;

// How many days running he's been found, counting back from `day`, or from
// the day before when today's hasn't been found yet.
export function streak(book, day) {
  const days = new Set(book.map(e => e.day));
  let d = days.has(day) ? day : shiftDay(day, -1), n = 0;
  while (days.has(d)) {
    n++;
    d = shiftDay(d, -1);
  }
  return n;
}

export function enterMessage({first, hiding}, partner) {
  if (!hiding) return null;
  if (first) return partner === 'girl' ? '你老婆躲起来啦' : '你老公躲起来啦';
  return partner === 'girl' ? '她还躲着呢' : '他还躲着呢';
}

export function foundMessage(state, day) {
  const n = streak(cleanHideSeek(state).book, day);
  return n > 1 ? `被你找到啦 · 连着 ${n} 天` : '被你找到啦';
}

// "2 分 13 秒"
export function lasted(seconds) {
  if (seconds < 60) return `${seconds} 秒`;
  const m = Math.floor(seconds / 60), s = seconds % 60;
  if (m < 60) return s ? `${m} 分 ${s} 秒` : `${m} 分钟`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} 小时 ${m % 60} 分` : `${h} 小时`;
}
