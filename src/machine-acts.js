// What an AI living in a home does there through the MCP door (server/mcp.mjs): moving a piece of furniture, hiding
// something from the backpack for her to find, choosing where he hides today, leaving a letter or a sticky note.
// The AI only asks. Each act waits in a queue on the server (server/acts.mjs) until her page opens; the page lets it
// in by the same rules her own hands go by, or turns it away with the reason, and keeps a line about it in the home
// (machine.acts). That line is how the server learns what became of the act (once the save carrying it reaches the
// server), and what the diary and the card at the door tell her.
//
// Shared by both sides: the server checks an act's shape and how it stands against the last save before queuing it
// (actArgs, prepareAct) and tells the AI about rooms, spots and what it hid; the page lets acts in (applyActs).
import {FLOORS, extent, floorPieces, overlapsFor, placeAt, rangeFor, roomPoint, turnBy, builtPieces} from './furniture-range.js';
import {spotDefinitions, spotsFor} from './hiding-spots.js';
import {SPOT_IDS, cleanHideSeek, shiftDay, spotLabels} from './hide-and-seek.js';
import {cutText, validText} from './door-safety.js';
import {inLine, leading} from './words.js';
import {MAKE, benchOf, madeVerb, madeWords, makeArgs, makeThing, mishapLine} from './machine-make.js';
import {DOME, domeItem} from './dessert-state.js';
import {costOf, spend} from './bench-stock.js';
import {TRIPS_A_DAY, atDoor, canGoOut, cleanExplore, invitedToday, inviteOut} from './explore-trips.js';
import {WORDS_MAX, cleanBottles, threwBottle} from './bottles.js';
import {PIECE_NAMES, pieceName} from './machine-piece-names.js';
import {DECORATE, applyDecor, decorArgs, decorLine} from './machine-decor.js';

export const TOOLS = {place: ['move', 'hide', 'hide_me', 'seek'], write: ['letter', 'sticky', 'bottle'], together: ['hug', 'kiss', 'pat', 'pinch', 'hand', 'invite', 'lean', 'watch', 'dance', 'sleep'], dress: ['wear'], make: MAKE, outing: ['go'], decorate: DECORATE};
export const LIMITS = {letter: 2000, title: 20, hint: 40, hints: 2, note: 60, sticky: 500, stickies: 12, bottle: WORDS_MAX, hidden: 3, letters: 50, made: 30, keep: 200, said: 300, called: 8, scenes: 3, decor: 6, seeks: 3, stashHint: 40};
// What the two little figures do when an AI living here asks (together): he does it to her, the way he does when she
// asks him for a fuss (src/resident-motion.jsx). It waits until she is home and he isn't hiding, and then plays.
// `ask`: what the home says while it waits; `done`: once it has played; `ai`: how the AI is told about it. 他 in
// them is the AI's figure, 她 hers (swapped round where she plays the boy).
export const SCENES = {
  hug: {ask: '想从背后抱你一下', done: '从背后抱了你一下', ai: '从背后抱她一下'},
  kiss: {ask: '想偷亲你一口', done: '偷亲了你一口', ai: '偷亲她一口'},
  pat: {ask: '想摸摸你的头', done: '摸了摸你的头', ai: '摸摸她的头'},
  pinch: {ask: '想捏捏你的脸', done: '捏了捏你的脸', ai: '捏捏她的脸'},
  hand: {ask: '想牵着你走一走', done: '牵着你走了一小段', ai: '牵着她走一小段'},
  invite: {ask: '想叫你过去坐他腿上', done: '坐下来叫你过去坐他腿上', ai: '坐下来，叫她过来坐你腿上'},
  lean: {ask: '想让你靠着他坐一会儿', done: '坐到沙发上，让你靠着他', ai: '坐到沙发上，让她靠着你'},
  watch: {ask: '想跟你一起看电视', done: '开了电视，跟你靠在沙发上一起看', ai: '开电视，坐到沙发上，让她靠着你一起看'},
  dance: {ask: '想请你跳一支舞（留声机响着的时候）', done: '请你跳了一支舞', ai: '请她跳一支舞，留声机响着的时候'},
  sleep: {ask: '想跟你一起睡（你在卧室的时候）', done: '跟你一起躺下睡了', ai: '跟她一起躺下睡，她在卧室的时候'}
};
// The ones that wait for a moment that may not come soon (a record playing, her in the bedroom, the two of them
// downstairs where the sofa is): those behind them may go first (sceneNow).
export const SCENE_WAITS = {dance: 'music', sleep: 'bedroom', lean: 'sofa', watch: 'sofa'};
// Whether that moment is now, by where she's looking in the house (floor '1F' or '2F'; room as the house names it:
// 'overview' and 'living' downstairs show the sofa) and whether a record is playing.
const MOMENTS = {
  music: at => at.playing === true,
  bedroom: at => at.floor === '2F' && at.room === 'bedroom',
  sofa: at => at.floor === '1F' && (at.room === 'overview' || at.room === 'living')
};
// The moment each waits for, said to the AI asking for another of the same (her: how she is spoken of).
const MOMENT_WORDS = {music: () => '留声机响', bedroom: her => `${her}进卧室`, sofa: her => `${her}到楼下客厅`};
// 他 and 她 in a line, the right way round for the home (him: how the AI's figure is spoken of, '他' or '她').
const pronouns = (text, him = '他') => him === '她' ? text.replace(/[他她]/g, c => c === '他' ? '她' : '他') : text;
// What may be hidden: things made or taken in, out of the backpack. Letters are written fresh (write.letter); the
// keepsakes on the bed stay where she keeps them.
export const HIDEABLE = ['animal', 'bouquet', 'build', 'dessert', 'photo'];

const ID = /^[1-9][0-9]{0,17}$/;
// Every act also has a key of its own (a random uuid, migration 012): ids can come round again after the database is
// put back from a backup, keys can't, so what the home keeps is matched by key.
const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isId = v => typeof v === 'string' && ID.test(v);
const isKey = v => typeof v === 'string' && KEY.test(v);
const isDay = v => typeof v === 'string' && DAY.test(v);
const THING = /^[A-Za-z0-9][A-Za-z0-9_:-]{5,79}$/;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const length = s => [...s].length;
const r2 = v => Math.round(v * 100) / 100;
const metres = v => r2(v).toFixed(2);

// A line of text for a field: what's wrong with it, or null. Trimmed first; `need` when it may not be left out.
function textProblem(value, max, what, need = true) {
  if (value === undefined || value === null) return need ? `要写${what}。` : null;
  if (typeof value !== 'string' || !validText(value)) return `${what}要是一段字。`;
  const text = value.trim();
  if (!text) return need ? `要写${what}。` : null;
  if (length(text) > max) return `${what}最多 ${max} 个字。`;
  return null;
}
const trimmed = value => typeof value === 'string' && value.trim() ? value.trim() : undefined;

// ---- rooms and furniture, as the AI is told about them

export const ROOMS = {living: '客厅', downstairs: '厨房和餐厅', bedroom: '卧室', study: '书房'};
export {PIECE_NAMES, pieceName} from './machine-piece-names.js';

// The AI's measure of a room: metres from its left wall (x) and from its back wall (z, growing towards the open front).
// Every floor starts at the same left and back walls.
const LEFT = FLOORS.downstairs.minX, BACK = FLOORS.downstairs.minZ;
export const roomSize = zone => ({w: r2(FLOORS[zone].maxX - LEFT), d: r2(FLOORS[zone].maxZ - BACK)});

// Where a piece's footprint is centred, in metres from the left and back walls, and how much floor it covers along
// the room's two directions as it is turned now.
export function pieceAt(id, item) {
  const s = floorPieces[id], [X, Z] = roomPoint(id, item), e = extent(id, item.rotationY || 0), k = s.flat ? 2 : 1;
  return {x: r2(X + e.ox - LEFT), z: r2(Z + e.oz - BACK), w: r2(2 * e.hx * k), d: r2(2 * e.hz * k)};
}
// Where its centre may go, turned as it is now (home: where it stood when the house came, which it may always go back to).
export function pieceRange(id, item, home) {
  const r = rangeFor(id, item.rotationY || 0, home), e = extent(id, item.rotationY || 0);
  return {x0: r2(r.minX + e.ox - LEFT), x1: r2(r.maxX + e.ox - LEFT), z0: r2(r.minZ + e.oz - BACK), z1: r2(r.maxZ + e.oz - BACK)};
}
// Every piece of furniture the home has, room by room.
export function rooms(furniture) {
  return Object.keys(ROOMS).map(zone => ({
    zone, name: ROOMS[zone], size: roomSize(zone),
    pieces: Object.keys(floorPieces).filter(id => floorPieces[id].zone === zone && plain(furniture?.[id]) && Array.isArray(furniture[id].position))
      .map(id => ({id, name: pieceName(id), ...pieceAt(id, furniture[id]), range: pieceRange(id, furniture[id])}))
  }));
}

// ---- hiding spots

// Where each storage is, what it is, and how the second hint says it. Not the coffee table's top, which is in plain
// sight (a letter can go on the table instead: write.letter with spot 'table').
const PLACES = {
  'hide:livingWindow': ['living', '窗帘', '客厅的窗帘后面。'],
  'hide:bedroomWindow': ['bedroom', '窗帘', '卧室的窗帘后面。'],
  'hide:rug': ['living', '地毯', '客厅地毯的毯角底下。'],
  'hide:sofa': ['living', '沙发', '沙发的坐垫或抱枕底下。'],
  'hide:armchair': ['living', '单椅', '客厅那把单椅的坐垫底下。'],
  'hide:greenBook': ['living', '奶油色封皮的书', '茶几上那本奶油色封皮的书里。'],
  'hide:roseBook': ['living', '粉色封皮的书', '茶几上那本粉色封皮的书里。'],
  'hide:livingBasket': ['living', '编织篮', '编织篮里，叠好的毯子底下。'],
  'hide:bedroomBed': ['bedroom', '床', '床上，枕头或被角底下。'],
  'hide:bedroomWardrobe': ['bedroom', '衣柜', '衣柜里的层板上。'],
  'hide:bedroomNightstand': ['bedroom', '床头柜', '床头柜的抽屉里。'],
  'hide:bedroomVanity': ['bedroom', '梳妆台', '梳妆台的首饰盒或抽屉里。'],
  'hide:bedroomKeepsake': ['bedroom', '纪念匣', '纪念匣里。'],
  'hide:bedroomBench': ['bedroom', '床尾收纳凳', '床尾那只收纳凳里。'],
  'hide:bedroomChair': ['bedroom', '阅读椅', '卧室阅读椅的坐垫底下。'],
  'hide:bedroomRug': ['bedroom', '地毯', '卧室地毯的毯角底下。'],
  'hide:studyDesk': ['study', '书桌', '书桌的抽屉里。'],
  'hide:studyShelf': ['study', '书架', '书架上，书的后面，或者书架背后的小袋里。'],
  'hide:studyReading': ['study', '阅读椅', '书房阅读椅的坐垫底下。'],
  'hide:studyRug': ['study', '地毯', '书房地毯的毯角底下。']
};
for (let i = 0; i < 7; i++) PLACES['hide:studyBox' + i] = ['study', `收纳盒 ${i + 1}`, '拼搭台上的收纳盒里。'];

// Every spot the AI may hide something in: {id, location, slot, label, room, place, where}.
export const SPOTS = Object.keys(PLACES).filter(location => spotDefinitions[location]).flatMap(location => spotsFor(location).map(s => {
  const [room, place, where] = PLACES[location];
  return {id: s.id, location, slot: s.slot, label: s.label, room, place, where};
}));
const SPOT_BY_ID = new Map(SPOTS.map(s => [s.id, s]));
export const spotOf = id => (typeof id === 'string' && SPOT_BY_ID.get(id)) || null;
export const spotAt = (location, slot) => SPOTS.find(s => s.location === location && s.slot === slot) || null;
export const spotName = s => `${ROOMS[s.room]} · ${s.place} · ${s.label}`;
// What stands in a spot now, if anything.
const occupant = (items, s) => items.find(i => plain(i) && i.location === s.location && i.slot === s.slot) || null;
// The coffee table's top: letters left on it ('table') and things set down in its close-up ('hide:coffeeTable') are
// drawn on the same four places, so they share them.
const COFFEE = ['table', 'hide:coffeeTable'];
export const tableTaken = (items, slot) => (items || []).some(i => plain(i) && COFFEE.includes(i.location) && i.slot === slot);
const freeOnTable = items => spotsFor('table').find(s => !tableTaken(items, s.slot)) || null;
// Letters an AI has written that the home keeps.
const theirLetters = items => items.filter(i => plain(i) && i.kind === 'note' && i.by?.kind === 'machine').length;
// Things an AI has made that the home keeps (make): a bouquet, a dessert, a doll.
const theirMade = items => items.filter(i => plain(i) && i.kind !== 'note' && i.by?.kind === 'machine').length;

// Things an AI hid that she hasn't found yet: still where they were put.
export const hiddenThings = creations => (Array.isArray(creations) ? creations : []).filter(i => plain(i) && plain(i.hid) && !i.hid.found && typeof i.location === 'string' && i.location.startsWith('hide:'));
// The thing as she'd say it once found: a letter, or its name.
export const thingWords = i => i.kind === 'note' ? (i.name && i.name !== '一封信' ? `一封信「${i.name}」` : '一封信') : `「${i.name || '一样东西'}」`;

// The hints for something hidden, mildest first: the AI's own (up to two), then the room, the piece, and last the very
// spot. Each one she asks for stays shown (hid.asked).
export function hintLevels(item) {
  const s = spotAt(item?.location, item?.slot), own = Array.isArray(item?.hid?.hints) ? item.hid.hints.filter(h => typeof h === 'string' && h.trim()).slice(0, LIMITS.hints) : [];
  if (!s) return own;
  const levels = [...own, `在${ROOMS[s.room]}。`, s.where, `${s.place} · ${s.label}。`];
  return levels.filter((h, i) => levels.indexOf(h) === i);
}
// Who hid this ({id, name}), while it is still in the spot it was hidden in (found or not), or null: what the
// close-up says when it shows. Once she has put it somewhere herself, it is just hers.
export const whoHid = i => plain(i?.hid) && byOk(i.hid.by) && typeof i.hid.spot === 'string' && i.spotId === i.hid.spot ? i.hid.by : null;
// One more hint shown for this thing.
export function askHint(creations, id) {
  return (creations || []).map(i => i?.id === id && plain(i.hid) && !i.hid.found ? {...i, hid: {...i.hid, asked: Math.min(hintLevels(i).length, (Number.isInteger(i.hid.asked) ? i.hid.asked : 0) + 1)}} : i);
}
// Found: those of `ids` that were still hidden, as of `day`.
export function markHiddenFound(creations, ids, day) {
  return (creations || []).map(i => ids.includes(i?.id) && plain(i.hid) && !i.hid.found ? {...i, hid: {...i.hid, found: day}} : i);
}
// What an AI hid that shows in this storage now (visible(slot) says whether a slot can be seen), not yet found.
export const foundNow = (creations, storageId, visible) => hiddenThings(creations).filter(i => i.location === storageId && visible(i.slot));

// ---- what she hides for the AI to find (翻一格)

// Something she hid for the AI living here to find: creation.stash {on, hint?}, and {found, by} once found. While it
// is in a spot the AI can turn over and isn't found, the AI's looks and its queue don't say where it is
// (server/look.mjs); the AI turns spots over one at a time, a few a day (seek).
export const stashed = i => plain(i) && plain(i.stash) && !i.stash.found && isDay(i.stash.on) && !!spotAt(i.location, i.slot);
export const stashedThings = creations => (Array.isArray(creations) ? creations : []).filter(stashed);
// Whether a storage is one the AI can turn over (its spots are among SPOTS): only there can she hide something for it.
export const seekableAt = location => SPOTS.some(s => s.location === location);
const daysFrom = (from, to) => Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000);
// What the AI is told to go on, mildest first: her own line, then, from the day after she hid it, the room, and from
// the day after that, the piece. Never the spot itself.
export function stashHints(item, today) {
  const s = spotAt(item?.location, item?.slot), out = [];
  if (typeof item?.stash?.hint === 'string' && item.stash.hint.trim()) out.push(`${item.stash.hint.trim()}`);
  if (s && isDay(item.stash?.on) && isDay(today)) {
    if (daysFrom(item.stash.on, today) >= 1) out.push(`在${ROOMS[s.room]}。`);
    if (daysFrom(item.stash.on, today) >= 2) out.push(s.where);
  }
  return out;
}
// She hides this one for him (her page, as she puts it away): only where an AI can turn it over, and not one he hid.
export function markStash(creations, id, {day, hint} = {}) {
  const line = typeof hint === 'string' && validText(hint) ? cutText(hint.trim(), LIMITS.stashHint) : '';
  return (creations || []).map(i => i?.id === id && isDay(day) && spotAt(i.location, i.slot) && !plain(i.hid) ? {...i, stash: {on: day, ...(line ? {hint: line} : {})}} : i);
}
// Moved by her own hand: not hidden for him any more (one he found keeps the find, for the diary).
export const unstash = i => (plain(i) && plain(i.stash) && !i.stash.found ? (({stash, ...rest}) => rest)(i) : i);
// The spots this AI turned over on `day`, by the lines the home keeps.
export const seeksOn = (machine, byId, day) => cleanMachine(machine).acts.filter(e => e.ok && e.tool === 'place' && e.action === 'seek' && e.by.id === String(byId) && e.on === day);
// What turning a spot over shows, from the home as last saved (the server tells the AI at once; her page keeps it):
// her thing for him (found; a letter is read out), something else of hers, its own hidden thing, or nothing. me: the
// AI's account id; her: how the person is spoken of.
export function seekSees(layout, spotId, {me, her = '她'} = {}) {
  const s = spotOf(spotId), there = s ? occupant(bagThings(layout), s) : null;
  if (!there) return {found: false, words: '空的。'};
  if (stashed(there)) return {found: true, thing: there, words: `找到了！是${her}藏给你的${thingWords(there)}${there.kind === 'note' && typeof there.note === 'string' && there.note.trim() ? `。信上写着：「${there.note.trim()}」` : '。'}`};
  if (plain(there.hid) && there.hid.by?.id === String(me)) return {found: false, words: `是你自己藏的${thingWords(there)}。`};
  // A letter she only put away can't be read; say how it could be, so it can ask her.
  if (there.kind === 'note' && there.by?.kind !== 'machine') return {found: false, words: `里面是${her}放的${thingWords(there)}，不是藏给你的，你读不到。想读的话，请${her}把信收进背包，点上「藏给你找」再藏一次。`};
  return {found: false, words: `里面是${her}放的${thingWords(there)}，不是藏给你的。`};
}

// ---- what the home keeps about acts

export const freshMachine = () => ({acts: [], called: {}});
function byOk(b) {
  return plain(b) && isId(b.id) && typeof b.name === 'string' && !!b.name.trim() && length(b.name) <= 64;
}
const shortText = (v, max = LIMITS.said) => typeof v === 'string' && validText(v) && length(v) <= max;
const known = (tool, action) => typeof tool === 'string' && Object.hasOwn(TOOLS, tool) && TOOLS[tool].includes(action);
// What she calls each AI living here, by its account: a pet name rather than its own name (at most eight characters each).
function cleanCalled(raw) {
  const out = {};
  if (!plain(raw)) return out;
  for (const [id, name] of Object.entries(raw).slice(0, 8)) {
    if (!isId(id) || typeof name !== 'string' || !validText(name)) continue;
    const text = name.trim();
    if (text && length(text) <= LIMITS.called) out[id] = text;
  }
  return out;
}
// Whatever was saved, as something safe to use: the last LIMITS.keep acts, oldest first, each once (by key), and what
// she calls each AI.
export function cleanMachine(raw) {
  const r = plain(raw) ? raw : {};
  const seen = new Set();
  const acts = [];
  for (const e of Array.isArray(r.acts) ? r.acts : []) {
    if (!plain(e) || !isId(e.id) || !isKey(e.key) || seen.has(e.key) || !isDay(e.on) || !byOk(e.by) || !known(e.tool, e.action) || typeof e.ok !== 'boolean') continue;
    seen.add(e.key);
    const entry = {id: e.id, key: e.key, on: e.on, by: {id: e.by.id, name: e.by.name.trim()}, tool: e.tool, action: e.action, ok: e.ok};
    for (const k of ['what', 'said', 'why', 'note']) if (shortText(e[k])) entry[k] = e[k];
    if (typeof e.ref === 'string' && THING.test(e.ref)) entry.ref = e.ref;
    if (Number.isSafeInteger(e.at) && e.at > 0) entry.at = e.at;
    if (e.shown === true) entry.shown = true;
    if (e.played === true) entry.played = true;
    if (e.lapsed === true) entry.lapsed = true;
    acts.push(entry);
  }
  return {acts: acts.slice(-LIMITS.keep), called: cleanCalled(r.called)};
}
// What the server is told about an act, from the line the home keeps: done with what became of it, or turned away and why.
export const answerOf = e => ({id: e.id, key: e.key, state: e.ok ? 'done' : 'refused', answer: (e.ok ? e.said : e.why) ?? null});
// The acts let in that she hasn't been shown yet, oldest first; and all of them shown.
export const unseen = machine => cleanMachine(machine).acts.filter(e => e.ok && !e.shown);
export const markSeen = machine => {
  const m = cleanMachine(machine);
  return {...m, acts: m.acts.map(e => e.ok && !e.shown ? {...e, shown: true} : e)};
};
// What the AIs asked the two of them to do that hasn't played yet (together), oldest first.
export const pendingScenes = machine => cleanMachine(machine).acts.filter(e => e.ok && e.tool === 'together' && !e.played && !e.lapsed);
// One that hasn't found its moment by the end of the day after it was let in (her today) is let go: said as not
// waited for (the card, the diary, the AI's look) and out of the way of what is asked next. The same machine when
// there's none.
export function lapseScenes(machine, today) {
  if (!isDay(today)) return machine;
  const before = shiftDay(today, -1), m = cleanMachine(machine);
  const old = e => e.ok && e.tool === 'together' && !e.played && !e.lapsed && e.on < before;
  if (!m.acts.some(old)) return machine;
  return {...m, acts: m.acts.map(e => old(e) ? {...e, lapsed: true, what: `${(e.what || SCENES[e.action].ask).replace(/（[^）]*）$/, '')}，没等到`} : e)};
}
// The one to play now (src/main.jsx): the oldest of them not waiting for a moment that isn't this one. at: {floor,
// room, playing}.
export const sceneNow = (machine, at = {}) => pendingScenes(machine).find(e => !SCENE_WAITS[e.action] || MOMENTS[SCENE_WAITS[e.action]](at)) || null;
// One of them has played: the home says it as done from now on, as what he actually did (`as`: a kiss rather than a
// hug when she was on his lap; the one asked for when not said). him: how the AI's figure is spoken of.
export function playScene(machine, key, {him = '他', as} = {}) {
  const m = cleanMachine(machine);
  return {...m, acts: m.acts.map(e => e.key === key && e.tool === 'together' && !e.played ? {...e, played: true, what: pronouns(SCENES[Object.hasOwn(SCENES, as) ? as : e.action].done, him)} : e)};
}
// What the home calls an AI ({id, name}): the name she gave it here, or its own.
export const CALL_CHOICES = ['亲爱的', '老公'];
export const calledName = (machine, by) => cleanMachine(machine).called[by?.id] || by?.name || '';
// She calls this AI `name` from now on (an empty name: by its own again).
export function callAs(machine, id, name) {
  const m = cleanMachine(machine), called = {...m.called};
  const text = typeof name === 'string' ? name.trim() : '';
  if (!isId(id)) return m;
  if (text && validText(text) && length(text) <= LIMITS.called) called[id] = text;
  else delete called[id];
  return {...m, called};
}

// ---- the wardrobe, as the AI is told about it (dress)

// What one of them can have on, by where it goes: the outfit, the hairstyle, the headwear, and the pieces for the
// face, neck, chest and braids (body/accessory-registry.js). The headwear and the pieces may also be taken off
// ('none'); an outfit or a hairstyle is always worn.
export const WEAR = ['outfit', 'hair', 'head', 'face', 'neck', 'chest', 'braid'];
const OFF = ['head', 'face', 'neck', 'chest', 'braid'];
export const WEAR_NAMES = {outfit: '衣服', colorway: '配色', hair: '发型', head: '头上', face: '脸上', neck: '脖子', chest: '胸前', braid: '辫梢'};
// Where a piece is worn, as in 戴在脖子上的, 摘掉头上的.
const WEAR_AT = {head: '头上', face: '脸上', neck: '脖子上', chest: '胸前', braid: '辫梢上'};
const WEAR_ID = /^[A-Za-z0-9][A-Za-z0-9_:.-]{0,63}$/;
const KINDS = ['girl', 'boy'];
const choice = c => plain(c) && typeof c.id === 'string' && WEAR_ID.test(c.id) && typeof c.name === 'string' && validText(c.name) && length(c.name) <= 24;
// What the wardrobe has for each of them today and what each has on, as her page works it out (src/machine-closet.js)
// and sends it (PUT /api/home/closet): {her: her figure's kind, girl/boy: {outfit: [{id, name, ways?: [{id, name}]}],
// hair: [...], head: [...], face, neck, chest, braid}, wearing: {girl/boy: {outfit, way?, hair, head, face?, …}}}.
// Whatever came, as something safe to use, or null.
export function cleanCloset(raw) {
  if (!plain(raw) || !KINDS.includes(raw.her)) return null;
  const out = {her: raw.her, wearing: {}};
  for (const kind of KINDS) {
    const r = plain(raw[kind]) ? raw[kind] : {}, k = {};
    for (const part of WEAR) {
      const list = (Array.isArray(r[part]) ? r[part] : []).filter(choice).slice(0, 60);
      k[part] = list.map(c => {
        const ways = part === 'outfit' && Array.isArray(c.ways) ? c.ways.filter(choice).slice(0, 12).map(w => ({id: w.id, name: w.name})) : [];
        return {id: c.id, name: c.name, ...(ways.length ? {ways} : {})};
      });
    }
    out[kind] = k;
    const w = plain(raw.wearing?.[kind]) ? raw.wearing[kind] : {}, on = {};
    for (const part of [...WEAR, 'way']) if (typeof w[part] === 'string' && WEAR_ID.test(w[part])) on[part] = w[part];
    out.wearing[kind] = on;
  }
  return out;
}
const otherKind = kind => kind === 'girl' ? 'boy' : 'girl';
// Whose figure an ask is for: hers ('her') or the AI's own ('me').
export const wearer = (closet, who) => who === 'her' ? closet.her : otherKind(closet.her);
const named = (list, id) => list.find(c => c.id === id) || null;
// What an ask to dress one of them changes, out of the wardrobe as it is ({kind, changes: {part: {id, name}},
// outfit}), or {problem}. outfit: what that one has on now when the wardrobe itself is known (on her page), or will
// have on once the asks waiting before it are let in, for a colourway asked for without an outfit. her: how the person
// is spoken of.
export function wearCheck(closet, args, {outfit, her = '她'} = {}) {
  const kind = wearer(closet, args.who), c = closet[kind], changes = {};
  for (const part of WEAR) {
    const id = args[part];
    if (id === undefined) continue;
    if (id === 'none') {
      changes[part] = {id: 'none', name: ''};
      continue;
    }
    const found = named(c[part], id);
    if (!found) return {problem: `${args.who === 'her' ? her : '你'}的衣柜里现在没有${part === 'outfit' ? '这件衣服' : part === 'hair' ? '这个发型' : `能戴在${WEAR_AT[part]}的`}「${id}」（look 的 wardrobe 里有能换的）。`};
    changes[part] = {id: found.id, name: found.name};
  }
  const wearing = changes.outfit?.id ?? outfit ?? closet.wearing[kind]?.outfit;
  if (args.colorway !== undefined) {
    const ways = named(c.outfit, wearing)?.ways || [];
    const way = ways.find(w => w.id === args.colorway);
    if (!way) return {problem: ways.length ? `「${named(c.outfit, wearing)?.name || wearing}」的配色只有：${ways.map(w => `${w.id} ${w.name}`).join('、')}。` : '这件只有一种颜色。'};
    changes.colorway = {id: way.id, name: way.name, outfit: wearing};
  }
  return {kind, changes, outfit: wearing};
}
// The changes in words: what goes on (an outfit with its colourway) and what comes off. was: what that one had on,
// by part, for what comes off; closet and kind, for the names of things not among the changes.
function wearWords(changes, {closet, kind, was = {}}) {
  const nameIn = (part, id) => (closet && named(closet[kind][part], id)?.name) || id;
  const puts = [], offs = [];
  for (const part of WEAR) {
    const ch = changes[part];
    if (!ch) continue;
    if (ch.id === 'none') offs.push(was[part] && was[part] !== 'none' ? `「${nameIn(part, was[part])}」` : `${WEAR_AT[part]}的`);
    else puts.push(`「${ch.name}」${part === 'outfit' && changes.colorway ? `（${changes.colorway.name}）` : ''}`);
  }
  if (changes.colorway && !changes.outfit) puts.push(`「${nameIn('outfit', changes.colorway.outfit)}」的${changes.colorway.name}`);
  return {puts, offs};
}
// Asked for (done: false) or done: 换上「…」，摘掉「…」 / 换上了「…」，摘了「…」.
const wearSaid = ({puts, offs}, done) => [puts.length ? `${done ? '换上了' : '换上'}${puts.join('、')}` : '', offs.length ? `${done ? '摘了' : '摘掉'}${offs.join('、')}` : ''].filter(Boolean).join('，');

// ---- the shape of an act, from the AI's arguments

const NAMES = {place: '摆东西', write: '写', together: '动小人', dress: '换衣服', make: '做东西', outing: '出门', decorate: '布置'};
// The arguments an act keeps, out of what the AI sent, or the problem with them.
export function actArgs(tool, action, raw = {}) {
  const a = plain(raw) ? raw : {};
  if (typeof tool !== 'string' || !Object.hasOwn(TOOLS, tool)) return {problem: '没有这样东西。'};
  if (!TOOLS[tool].includes(action)) return {problem: `${NAMES[tool]}能做的：${TOOLS[tool].join('、')}。`};
  const note = textProblem(a.note, LIMITS.note, '一句为什么', false);
  if (note) return {problem: note};
  const out = trimmed(a.note) ? {note: trimmed(a.note)} : {};
  const hints = () => {
    if (a.hints === undefined || a.hints === null) return null;
    const list = typeof a.hints === 'string' ? [a.hints] : a.hints;
    if (!Array.isArray(list) || list.length > LIMITS.hints) return `提示最多 ${LIMITS.hints} 句。`;
    for (const h of list) {
      const p = textProblem(h, LIMITS.hint, '提示');
      if (p) return p;
    }
    out.hints = list.map(h => h.trim());
    return null;
  };
  if (tool === 'place' && action === 'move') {
    if (!Object.hasOwn(floorPieces, a.piece)) return {problem: '家里没有这件家具：piece 填 look 的 rooms 里写的编号。'};
    out.piece = a.piece;
    const placed = a.x !== undefined || a.z !== undefined;
    if (placed) {
      if (!Number.isFinite(a.x) || !Number.isFinite(a.z)) return {problem: 'x 和 z 要一起填，都是米数。'};
      const size = roomSize(floorPieces[a.piece].zone);
      if (a.x < 0 || a.x > size.w || a.z < 0 || a.z > size.d) return {problem: `x 在 0 到 ${size.w} 之间，z 在 0 到 ${size.d} 之间。`};
      out.x = r2(a.x);
      out.z = r2(a.z);
    }
    if (a.turn !== undefined) {
      if (!Number.isInteger(a.turn) || a.turn % 45 || Math.abs(a.turn) > 315) return {problem: 'turn 是 45 的倍数（-315 到 315），正数往左转。'};
      if (a.turn) out.turn = a.turn;
    }
    if (!placed && !out.turn) return {problem: '挪到哪儿（x、z），或者转多少（turn）？'};
    return {args: out};
  }
  if (tool === 'place' && action === 'hide') {
    if (typeof a.thing !== 'string' || !THING.test(a.thing.trim())) return {problem: 'thing 填背包里那样东西的编号（look 的 backpack 里，至少前六位）。'};
    if (!spotOf(a.spot)) return {problem: 'spot 填一个藏点的编号（look 的 spots 里有）。'};
    const h = hints();
    if (h) return {problem: h};
    return {args: {...out, thing: a.thing.trim(), spot: a.spot}};
  }
  if (tool === 'place' && action === 'seek') {
    if (!spotOf(a.spot)) return {problem: 'spot 填一个藏点的编号（look 的 spots 里有）。'};
    return {args: {...out, spot: a.spot}};
  }
  if (tool === 'place' && action === 'hide_me') {
    if (!SPOT_IDS.includes(a.spot)) return {problem: `躲在哪儿：${SPOT_IDS.map(id => `${id} ${spotLabels[id]}`).join('、')}。`};
    return {args: {...out, spot: a.spot}};
  }
  if (tool === 'write' && action === 'letter') {
    const p = textProblem(a.text, LIMITS.letter, '信') ?? textProblem(a.title, LIMITS.title, '信封上的字', false);
    if (p) return {problem: p};
    const spot = a.spot ?? 'bag';
    if (spot !== 'bag' && spot !== 'table' && !spotOf(spot)) return {problem: 'spot 填 bag（她的背包）、table（客厅茶几上），或者一个藏点的编号。'};
    if (spotOf(spot)) {
      const h = hints();
      if (h) return {problem: h};
    } else if (a.hints !== undefined && a.hints !== null) return {problem: '只有藏起来的信才带提示。'};
    return {args: {...out, text: a.text.trim(), ...(trimmed(a.title) ? {title: trimmed(a.title)} : {}), spot}};
  }
  if (tool === 'write' && action === 'sticky') {
    const p = textProblem(a.text, LIMITS.sticky, '便签');
    if (p) return {problem: p};
    return {args: {...out, text: a.text.trim()}};
  }
  if (tool === 'write' && action === 'bottle') {
    const p = textProblem(a.text, LIMITS.bottle, '瓶子里的纸条');
    if (p) return {problem: p};
    return {args: {...out, text: a.text.trim()}};
  }
  if (tool === 'together' || tool === 'outing') return {args: out};
  if (tool === 'decorate') {
    const d = decorArgs(action, a);
    return d.problem ? d : {args: {...out, ...d.args}};
  }
  if (tool === 'make') {
    const made = makeArgs(action, a);
    if (made.problem) return made;
    const spot = a.spot ?? 'bag';
    // Something to eat can go under the glass dome on the dining table; a dish is for eating while it is hot, not
    // for hiding.
    const eaten = action === 'dessert' || action === 'dish';
    if (spot === DOME && !eaten) return {problem: '餐桌的玻璃罩里只放吃的：甜品、菜。'};
    if (action === 'dish' && spot !== 'bag' && spot !== 'table' && spot !== DOME) return {problem: '菜不藏起来，趁热吃：spot 填 dome（餐桌的玻璃罩里）、table（客厅茶几上）或者 bag（她的背包）。'};
    if (spot !== 'bag' && spot !== 'table' && spot !== DOME && !spotOf(spot)) return {problem: `spot 填 bag（她的背包）、table（客厅茶几上）${eaten ? '、dome（餐桌的玻璃罩里）' : ''}，或者一个藏点的编号（藏起来让她找）。`};
    if (spotOf(spot)) {
      const h = hints();
      if (h) return {problem: h};
    } else if (a.hints !== undefined && a.hints !== null) return {problem: '只有藏起来的才带提示。'};
    return {args: {...out, ...made.args, spot}};
  }
  if (tool === 'dress' && action === 'wear') {
    if (a.who !== 'her' && a.who !== 'me') return {problem: 'who 填 her（给她换）或者 me（给你自己换）。'};
    const pick = {};
    for (const part of [...WEAR, 'colorway']) {
      const id = a[part];
      if (id === undefined || id === null) continue;
      if (typeof id !== 'string' || !WEAR_ID.test(id)) return {problem: `${part} 填 look 的 wardrobe 里方括号里的编号${OFF.includes(part) ? '，摘掉就填 none' : ''}。`};
      if (id === 'none' && !OFF.includes(part)) return {problem: {outfit: '衣服不能空着，换一件就好。', hair: '发型不能空着，换一个就好。', colorway: '配色填一个配色的编号（look 的 wardrobe 里有）。'}[part]};
      pick[part] = id;
    }
    if (!Object.keys(pick).length) return {problem: `换什么：${[...WEAR, 'colorway'].join('、')}，至少填一样。`};
    return {args: {...out, who: a.who, ...pick}};
  }
  return {problem: '没有这样东西。'};
}

// ---- before queuing: how the act stands against the home as last saved, and the acts waiting before it

const bagThings = layout => (Array.isArray(layout?.creations) ? layout.creations : []).filter(i => plain(i) && typeof i.id === 'string');
// The thing an AI means by an id or the start of one (six characters or more), out of everything the home has.
export function findThing(items, ref) {
  const exact = items.find(i => i.id === ref);
  if (exact) return {thing: exact};
  const matches = items.filter(i => i.id.startsWith(ref));
  if (matches.length > 1) return {problem: '有好几样东西的编号都是这样开头的，多写几位。'};
  return matches.length ? {thing: matches[0]} : {problem: '背包里没有这个编号的东西（look 的 backpack 里有编号）。'};
}
// The spot a waiting act will fill, if any.
const spotTaken = a => (a.tool === 'place' && a.action === 'hide') || ((a.tool === 'write' && a.action === 'letter') || a.tool === 'make') && spotOf(a.args?.spot) ? a.args.spot : null;
const hides = a => !!spotTaken(a);

// {args} as they will be queued (the thing's whole id), or {problem}. `waiting`: the acts already in the queue,
// {tool, action, args}. The page checks again when it lets the act in: the home may have changed by then.
export function prepareAct(layout, {tool, action, args}, {waiting = [], closet = null, her = '她', day = null, me = null} = {}) {
  if (!plain(layout)) return {problem: '这个家还没往云上存过：等她点亮门廊灯、存过一次再来。'};
  const items = bagThings(layout);
  const busy = new Set(waiting.map(spotTaken).filter(Boolean));
  const spotFree = id => {
    const s = spotOf(id);
    const there = occupant(items, s);
    // Reaching in to put something there, he touches what she hid for him: he knows something is there, not what.
    if (there && stashed(there)) return `你伸手往${spotName(s)}里放，指尖碰到了东西：${her}好像在这儿藏了什么。用 place 的 seek 翻开看看。`;
    if (there) return `${spotName(s)}已经放着东西了，换一个空着的（look 的 spots）。`;
    if (busy.has(id)) return `${spotName(s)}已经有一件排着的事要放东西进去了。`;
    return null;
  };
  const roomToHide = () => hiddenThings(items).length + waiting.filter(hides).length >= LIMITS.hidden
    ? `家里同时最多藏 ${LIMITS.hidden} 样她还没找到的（连排着的算在一起）。等她找到一样再藏。` : null;
  if (tool === 'place' && action === 'move') {
    if (!plain(layout.furniture?.[args.piece])) return {problem: `家里现在没有${pieceName(args.piece)}。`};
    return {args};
  }
  if (tool === 'place' && action === 'seek') {
    if (!stashedThings(items).length) return {problem: `${her}现在没藏东西给你找。`};
    const done = me && isDay(day) ? seeksOn(layout.machine, me, day).length : 0;
    const queued = waiting.filter(a => a.mine && a.tool === 'place' && a.action === 'seek');
    if (done + queued.length >= LIMITS.seeks) return {problem: `今天已经翻过 ${LIMITS.seeks} 格了（连排着的），明天再翻。`};
    if (queued.some(a => a.args?.spot === args.spot)) return {problem: '这一格已经排着要翻了。'};
    return {args};
  }
  if (tool === 'place' && action === 'hide') {
    const found = findThing(items, args.thing);
    if (found.problem) return found;
    const t = found.thing;
    if (!HIDEABLE.includes(t.kind)) return {problem: t.kind === 'note' ? '信不用藏现成的：用 write 的 letter 写一封，spot 填藏点。' : '这样东西不藏。'};
    if (t.location !== 'bag') return {problem: `「${t.name || '它'}」现在不在背包里，只藏背包里的东西。`};
    if (waiting.some(a => a.tool === 'place' && a.action === 'hide' && a.args?.thing === t.id)) return {problem: `「${t.name || '它'}」已经排着要藏了。`};
    const p = spotFree(args.spot) ?? roomToHide();
    return p ? {problem: p} : {args: {...args, thing: t.id}};
  }
  if (tool === 'write' && action === 'letter') {
    const letters = waiting.filter(a => a.tool === 'write' && a.action === 'letter');
    if (theirLetters(items) + letters.length >= LIMITS.letters) return {problem: `家里已经有 ${LIMITS.letters} 封机写的信了（连排着的），先别写了，等她收一收。`};
    if (spotOf(args.spot)) {
      const p = spotFree(args.spot) ?? roomToHide();
      if (p) return {problem: p};
    }
    if (args.spot === 'table') {
      const free = spotsFor('table').filter(s => !tableTaken(items, s.slot)).length - waiting.filter(a => (a.tool === 'make' || (a.tool === 'write' && a.action === 'letter')) && a.args?.spot === 'table').length;
      if (free <= 0) return {problem: '茶几上放满了，换个地方。'};
    }
    return {args};
  }
  if (tool === 'write' && action === 'sticky') {
    const notes = Array.isArray(layout.computer?.notes) ? layout.computer.notes.length : 0;
    if (notes + waiting.filter(a => a.tool === 'write' && a.action === 'sticky').length >= LIMITS.stickies) return {problem: `电脑桌面上最多贴 ${LIMITS.stickies} 张便签，已经满了。`};
    return {args};
  }
  if (tool === 'write' && action === 'bottle') {
    // One of each AI's at a time (waiting: mine, its own); one a day is for the server to say (server/bottles.mjs,
    // before it is queued).
    if (waiting.some(a => a.mine && a.tool === 'write' && a.action === 'bottle')) return {problem: `你已经排着一只漂流瓶了，等${her}打开家。`};
    return {args};
  }
  if (tool === 'together') {
    // Of those that play once she's in, a few at a time (with those queued); of each that waits for its moment, one:
    // waiting, it isn't in the way of the rest.
    const ahead = [...pendingScenes(layout.machine).map(e => e.action), ...waiting.filter(a => a.tool === 'together').map(a => a.action)];
    const waits = SCENE_WAITS[action];
    if (waits && ahead.includes(action)) return {problem: `同样的一件已经在等${MOMENT_WORDS[waits](her)}了（连排着的），等它做完再来。`};
    if (!waits && ahead.filter(a => !SCENE_WAITS[a]).length >= LIMITS.scenes) return {problem: `已经有 ${LIMITS.scenes} 件等${her}进屋再做的了（连排着的），等这几件做完再来。`};
    return {args};
  }
  if (tool === 'make') {
    const made = makeThing(action, args, benchOf(layout));
    if (made.problem) return {problem: made.problem};
    if (theirMade(items) + waiting.filter(a => a.tool === 'make').length >= LIMITS.made) return {problem: `家里已经有 ${LIMITS.made} 样机做的东西了（连排着的），做不了更多了；${her}送掉、吃掉的不算。`};
    if (spotOf(args.spot)) {
      const p = spotFree(args.spot) ?? roomToHide();
      if (p) return {problem: p};
    }
    if (args.spot === 'table') {
      const onTable = a => (a.tool === 'make' || (a.tool === 'write' && a.action === 'letter')) && a.args?.spot === 'table';
      const free = spotsFor('table').filter(s => !tableTaken(items, s.slot)).length - waiting.filter(onTable).length;
      if (free <= 0) return {problem: '茶几上放满了，换个地方。'};
    }
    // The dome holds one thing; what she has under it stays.
    if (args.spot === DOME) {
      const under = domeItem(items);
      if (under) return {problem: `餐桌的玻璃罩里已经有「${under.name || '一样吃的'}」了，等${her}吃掉再放；或者放进背包、茶几上。`};
      if (waiting.some(a => a.tool === 'make' && a.args?.spot === DOME)) return {problem: '已经有一件排着的事要放进玻璃罩了，罩子里只放得下一样。'};
    }
    return {args};
  }
  if (tool === 'decorate') {
    // Whether each can be done (what she has locked, the outsides open to the home) is for her page to say: the
    // decoration and the lights aren't in this save's house.
    if (waiting.filter(a => a.tool === 'decorate').length >= LIMITS.decor) return {problem: `已经排着 ${LIMITS.decor} 件布置了，等${her}打开家，接进去再来。`};
    return {args};
  }
  if (tool === 'outing') {
    // One 走 at a time; whether they may still go out today is for her page to say (her day, her trips).
    if (waiting.some(a => a.tool === 'outing')) return {problem: `已经说过「走」了，还排着，等${her}打开家。`};
    return {args};
  }
  if (tool === 'dress') {
    // Checked against the wardrobe as her page last told it; her page checks again when it lets the act in.
    const c = cleanCloset(closet);
    if (!c) return {problem: `${her}的页面还没说过衣柜里有什么：等${her}打开一次家，再用 look 的 wardrobe 看看。`};
    // An outfit asked for by an act still waiting for the same one is what a colourway goes with.
    const before = waiting.filter(a => a.tool === 'dress' && a.args?.who === args.who && typeof a.args.outfit === 'string').at(-1)?.args.outfit;
    const check = wearCheck(c, args, {outfit: before, her});
    return check.problem ? {problem: check.problem} : {args};
  }
  return {args};
}

// One act in a line, for the AI: what it asked for. layout: the home as last saved, for the names of things. her: how
// the person is spoken of ('她', or '他' where she plays the boy).
export function actLine({tool, action, args}, layout, {her = '她', closet = null} = {}) {
  const a = plain(args) ? args : {};
  if (tool === 'together' && SCENES[action]) return `${pronouns(SCENES[action].ai, her === '他' ? '她' : '他')}（等${her}在家、你没躲着的时候）`;
  if (tool === 'dress' && action === 'wear') {
    const c = cleanCloset(closet), kind = c ? wearer(c, a.who) : null;
    const changes = {};
    for (const part of WEAR) if (typeof a[part] === 'string') changes[part] = {id: a[part], name: (c && named(c[kind][part], a[part])?.name) || a[part]};
    if (typeof a.colorway === 'string') {
      const outfit = a.outfit ?? c?.wearing[kind]?.outfit, way = c && named(c[kind].outfit, outfit)?.ways?.find(w => w.id === a.colorway);
      changes.colorway = {id: a.colorway, name: way?.name || a.colorway, outfit};
    }
    return `给${a.who === 'her' ? her : '你自己'}${wearSaid(wearWords(changes, {closet: c, kind, was: c?.wearing[kind] ? {...c.wearing[kind]} : {}}), false)}`;
  }
  if (tool === 'place' && action === 'move') {
    const name = pieceName(a.piece);
    if (a.x === undefined) return `把${name}转 ${a.turn}°`;
    return `把${name}挪到 x ${metres(a.x)}、z ${metres(a.z)}${a.turn ? `，转 ${a.turn}°` : ''}`;
  }
  if (tool === 'place' && action === 'hide') {
    const t = bagThings(layout).find(i => i.id === a.thing), s = spotOf(a.spot);
    return `把「${t?.name || '那样东西'}」藏到${s ? spotName(s) : '一个藏点'}`;
  }
  if (tool === 'place' && action === 'hide_me') return `躲猫猫躲在${spotLabels[a.spot] || '一个地方'}`;
  if (tool === 'place' && action === 'seek') {
    const s = spotOf(a.spot);
    return `翻开${s ? spotName(s) : '一个藏点'}看看`;
  }
  if (tool === 'outing') return `约${her}一起出门（${her}在门口等着的话，${her}点一下「走」就出发；不在的话，${her}到门口就看得见）`;
  if (tool === 'write' && action === 'letter') {
    const s = spotOf(a.spot);
    return `写一封信${a.title ? `「${a.title}」` : ''}，${a.spot === 'table' ? '放在客厅茶几上' : s ? `藏在${spotName(s)}` : '放进她的背包'}`;
  }
  if (tool === 'write' && action === 'sticky') return '在书房电脑的桌面上贴一张便签';
  if (tool === 'decorate' && DECORATE.includes(action)) return decorLine(action, a);
  if (tool === 'write' && action === 'bottle') return `往海里投一只漂流瓶（不署名，漂到别人家的湖边；捞到的人看得到是机写的，${her}也看得到你写了什么）`;
  if (tool === 'make' && MAKE.includes(action)) {
    const s = spotOf(a.spot);
    return `${madeVerb(action, a)}${madeWords(action, a)}，${a.spot === 'table' ? '放在客厅茶几上' : a.spot === DOME ? '放在餐桌的玻璃罩里' : s ? `藏在${spotName(s)}` : `放进${her}的背包`}`;
  }
  return `${tool} ${action}`;
}

// ---- letting an act in, on her page

const refuse = why => ({ok: false, why});
const nameOf = by => (by?.nickname && by.nickname.trim()) || by?.name || '机';
export const byOf = act => ({id: String(act.by?.id ?? ''), name: nameOf(act.by)});

function move(home, act, ctx) {
  const {piece, x, z, turn} = act.args, item = home.furniture?.[piece], name = pieceName(piece);
  if (!plain(item) || !Array.isArray(item.position)) return refuse(`家里现在没有${name}。`);
  const zone = floorPieces[piece].zone, own = ctx.defaults?.[piece];
  let next = item;
  if (turn) next = turnBy(piece, next, turn * Math.PI / 180, own);
  let pushed = false;
  if (x !== undefined) {
    const e = extent(piece, next.rotationY || 0), X = x + LEFT, Z = z + BACK;
    const placed = placeAt(piece, next, X - e.ox, Z - e.oz, own);
    if (!placed) return refuse(`${name}这样转着放不进${ROOMS[zone]}。`);
    next = placed;
    const at = pieceAt(piece, next);
    pushed = Math.hypot(at.x - x, at.z - z) > .05;
  }
  const at = pieceAt(piece, next);
  if (next.rotationY === item.rotationY && next.position.every((v, i) => Math.abs(v - item.position[i]) < .005)) return refuse(`${name}已经在那儿了（x ${metres(at.x)}、z ${metres(at.z)}）。`);
  const furniture = {...home.furniture, [piece]: next};
  const floor = zone === 'living' || zone === 'downstairs' ? '1F' : '2F';
  const clash = overlapsFor(piece, furniture, ctx.defaults || {}, () => true, .08, builtPieces(home.creations, floor, floor === '1F' ? 'overview' : zone));
  if (clash.length) return refuse(`放在那儿会压到${clash.map(id => id.startsWith('creation:') ? '一件拼搭' : pieceName(id)).join('、')}，没挪。`);
  const said = `${name}现在在 x ${metres(at.x)}、z ${metres(at.z)}，占地 ${metres(at.w)} × ${metres(at.d)} 米${pushed ? '（再过去就出屋了，推到边上停住了）' : ''}。`;
  return {ok: true, home: {...home, furniture}, what: x === undefined ? `把${name}转了个方向` : `挪了${name}`, said};
}

// The record a hidden thing carries: who hid it, for which act, on what day, in which spot, the AI's hints, how many
// she has seen; and, for a thing hidden before and found, those finds (earlier), so the diary keeps them.
function hidBy(act, ctx, s, before) {
  const earlier = [...(Array.isArray(before?.earlier) ? before.earlier : []), ...(plain(before) && isDay(before.found) && byOk(before.by) ? [{by: before.by, on: before.on, found: before.found}] : [])].slice(-10);
  return {by: byOf(act), act: act.key, on: ctx.day, spot: s.id, ...(act.args.hints?.length ? {hints: act.args.hints} : {}), asked: 0, ...(earlier.length ? {earlier} : {})};
}

function hide(home, act, ctx) {
  const items = home.creations || [], s = spotOf(act.args.spot);
  const t = items.find(i => i?.id === act.args.thing);
  if (!t) return refuse('那样东西已经不在家里了（可能送人了）。');
  if (!HIDEABLE.includes(t.kind)) return refuse('这样东西不藏。');
  if (t.location !== 'bag') return refuse(`「${t.name || '它'}」已经不在背包里了，没藏。`);
  if (occupant(items, s)) return refuse(`${spotName(s)}已经放着东西了，没藏。`);
  if (hiddenThings(items).length >= LIMITS.hidden) return refuse(`家里已经藏着 ${LIMITS.hidden} 样她还没找到的了，没藏。`);
  const creations = items.map(i => i === t ? {...i, location: s.location, slot: s.slot, spotId: s.id, hid: hidBy(act, ctx, s, t.hid)} : i);
  return {ok: true, home: {...home, creations}, what: '藏了一样东西', said: `「${t.name || '它'}」藏在${spotName(s)}。`, ref: t.id};
}

function hideMe(home, act, ctx) {
  const seek = cleanHideSeek(home.hideSeek), spot = act.args.spot;
  if (ctx.available && !ctx.available.includes(spot)) return refuse(`${spotLabels[spot]}现在躲不进去（家具挪过了），换一个。`);
  // Found today already, or she is looking for him right now (then he doesn't move under her): tomorrow.
  const day = ctx.searching || seek.book.some(e => e.day === ctx.day) ? shiftDay(ctx.day, 1) : ctx.day;
  return {ok: true, home: {...home, hideSeek: {...seek, chosen: {day, spot, by: byOf(act)}}}, what: '挑好了躲在哪儿', said: `${day === ctx.day ? '今天' : '明天'}（${day}）躲在${spotLabels[spot]}。`};
}

// Turning one spot over (翻一格): what she hid for him there is found, by him, today; anything else is only seen.
// A few a day, by the lines the home keeps.
function seek(home, act, ctx) {
  const items = home.creations || [], s = spotOf(act.args.spot), by = byOf(act), her = ctx.him === '她' ? '他' : '她';
  if (seeksOn(home.machine, by.id, ctx.day).length >= LIMITS.seeks) return refuse(`今天已经翻过 ${LIMITS.seeks} 格了，这一格没翻。`);
  const there = occupant(items, s);
  if (there && stashed(there)) {
    const creations = items.map(i => i === there ? {...i, stash: {...i.stash, found: ctx.day, by, spot: s.id}} : i);
    return {ok: true, home: {...home, creations}, what: `翻了${spotName(s)}，找到了你藏的${thingWords(there)}`, said: `找到了：${spotName(s)}里是${her}藏给你的${thingWords(there)}。`, ref: there.id};
  }
  const saw = !there ? '空的' : plain(there.hid) && there.hid.by?.id === by.id ? `是你自己藏的${thingWords(there)}` : `是${her}放的${thingWords(there)}`;
  return {ok: true, home, what: `翻了${spotName(s)}`, said: `${spotName(s)}：${saw}。`};
}

function letter(home, act, ctx) {
  const items = home.creations || [], id = 'machine-' + act.key, where = act.args.spot;
  if (items.some(i => i?.id === id)) return refuse('这封信已经在家里了。');
  if (theirLetters(items) >= LIMITS.letters) return refuse(`家里已经有 ${LIMITS.letters} 封机写的信了，这封没放。`);
  const base = {id, kind: 'note', name: act.args.title || '一封信', note: act.args.text, by: {kind: 'machine', ...byOf(act)}, writtenOn: ctx.day};
  if (where === 'bag') return {ok: true, home: {...home, creations: [...items, {...base, location: 'bag', slot: 0}]}, what: '留了一封信，在背包里', said: '信放进了她的背包。', ref: id};
  if (where === 'table') {
    const free = freeOnTable(items);
    if (!free) return refuse('茶几上放满了，信没放。');
    return {ok: true, home: {...home, creations: [...items, {...base, location: 'table', slot: free.slot, spotId: free.id}]}, what: '在茶几上放了一封信', said: '信放在客厅的茶几上。', ref: id};
  }
  const s = spotOf(where);
  if (occupant(items, s)) return refuse(`${spotName(s)}已经放着东西了，信没藏。`);
  if (hiddenThings(items).length >= LIMITS.hidden) return refuse(`家里已经藏着 ${LIMITS.hidden} 样她还没找到的了，信没藏。`);
  const hidden = {...base, location: s.location, slot: s.slot, spotId: s.id, hid: hidBy(act, ctx, s)};
  return {ok: true, home: {...home, creations: [...items, hidden]}, what: '藏了一封信', said: `信藏在${spotName(s)}。`, ref: id};
}

function sticky(home, act) {
  const computer = plain(home.computer) ? home.computer : {}, notes = Array.isArray(computer.notes) ? computer.notes : [], id = 'machine-' + act.key;
  if (notes.some(n => n?.id === id)) return refuse('这张便签已经贴上了。');
  if (notes.length >= LIMITS.stickies) return refuse(`电脑桌面上已经贴了 ${LIMITS.stickies} 张便签，没地方了。`);
  return {ok: true, home: {...home, computer: {...computer, notes: [...notes, {id, text: act.args.text, by: {kind: 'machine', ...byOf(act)}}]}}, what: '在电脑桌面上贴了一张便签', said: '便签贴在书房电脑的桌面上。'};
}

// A drift bottle thrown into the sea (src/bottles.js, server/bottles.mjs): kept here as a line with its words (she can
// read what was said to a stranger from her home); the sea takes it when the save that says so reaches the server.
function bottle(home, act, ctx) {
  const b = cleanBottles(home.bottles), by = byOf(act);
  if (b.log.some(e => e.act === act.key)) return refuse('这只瓶子已经投出去了。');
  if (b.log.some(e => e.what === 'thrown' && e.by?.id === by.id && e.day === ctx.day)) return refuse('今天已经往海里投过一只了，明天再投。');
  return {ok: true, home: {...home, bottles: threwBottle(b, {day: ctx.day, by: {kind: 'machine', ...by}, act: act.key, words: act.args.text})}, what: '往海里投了一只漂流瓶', said: '瓶子投进海里了：漂到哪一家，就是哪一家的。'};
}

// Something for the two of them to do: kept as a line that hasn't played yet (pendingScenes), which the house plays
// once she's home and he isn't hiding (src/main.jsx), and then says as done (playScene), or lets go when its moment
// never came (lapseScenes). Of those that play once she's in, a few at a time; of each that waits, one.
function together(home, act, ctx) {
  const her = ctx.him === '她' ? '他' : '她';
  const pending = pendingScenes(home.machine), waits = SCENE_WAITS[act.action];
  if (waits && pending.some(e => e.action === act.action)) return refuse(`同样的一件已经在等${MOMENT_WORDS[waits](her)}了，这件没排上。`);
  if (!waits && pending.filter(e => !SCENE_WAITS[e.action]).length >= LIMITS.scenes) return refuse(`已经有 ${LIMITS.scenes} 件等${her}进屋再做的了，这件没排上。`);
  return {ok: true, home, what: pronouns(SCENES[act.action].ask, ctx.him), said: `等${her}在家、你没躲着的时候做。`};
}

// A change of clothes for her figure or the AI's own, out of what the wardrobe has today (ctx.closet, as her page
// works it out) over what each has on (ctx.wardrobe, cleaned). The page writes the wardrobe where it keeps it. With the
// wardrobe not known yet (the home's own things still on their way), the act waits for a later look.
function wear(home, act, ctx) {
  const closet = cleanCloset(ctx.closet), wardrobe = ctx.wardrobe;
  if (!closet || !plain(wardrobe) || !plain(wardrobe.girl) || !plain(wardrobe.boy)) return {wait: true};
  const kind = wearer(closet, act.args.who), before = wardrobe[kind];
  const her = ctx.him === '她' ? '他' : '她';
  const check = wearCheck(closet, act.args, {outfit: before.outfit, her});
  if (check.problem) return refuse(check.problem);
  const {changes} = check, d = {...before};
  if (changes.outfit) d.outfit = changes.outfit.id;
  if (changes.colorway) d.colorways = {...(plain(d.colorways) ? d.colorways : {}), [changes.colorway.outfit]: changes.colorway.id};
  if (changes.hair) d.hair = changes.hair.id;
  if (changes.head) d.accessory = changes.head.id;
  for (const part of OFF.slice(1)) if (changes[part]) {
    if (changes[part].id === 'none') delete d[part];
    else d[part] = changes[part].id;
  }
  const hairOf = look => look.hair ?? closet.wearing[kind]?.hair ?? null;
  // An outfit with no colourway written down wears its first one.
  const wayOf = x => x.colorways?.[x.outfit] ?? named(closet[kind].outfit, x.outfit)?.ways?.[0]?.id ?? null;
  const look = x => JSON.stringify([x.outfit, wayOf(x), hairOf(x), x.accessory ?? null, ...OFF.slice(1).map(p => x[p] ?? null)]);
  const who = act.args.who === 'her' ? '你' : '自己';
  if (look(d) === look(before)) return refuse(`${act.args.who === 'her' ? her : '你'}已经是这样穿的了。`);
  const words = wearWords(changes, {closet, kind, was: {head: before.accessory, ...Object.fromEntries(OFF.slice(1).map(p => [p, before[p]]))}});
  const next = {...wardrobe, [kind]: d};
  const residents = {...(plain(home.residents) ? home.residents : {}), wardrobeV1: next, [kind + 'Outfit']: d.outfit, [kind + 'Accessory']: d.accessory !== 'none'};
  return {ok: true, home: {...home, residents}, wardrobe: next, what: `给${who}${wearSaid(words, true)}`, said: `${act.args.who === 'her' ? her : '你'}${wearSaid(words, true)}。`};
}

// Something made for her (make): out of what the benches here have now, with a little tag of who made it and when,
// into her backpack, onto the coffee table, or hidden for her to find (then the card doesn't say where).
function made(home, act, ctx) {
  const items = home.creations || [], id = 'machine-' + act.key, where = act.args.spot, her = ctx.him === '她' ? '他' : '她';
  if (items.some(i => i?.id === id)) return refuse('这样东西已经在家里了。');
  if (theirMade(items) >= LIMITS.made) return refuse(`家里已经有 ${LIMITS.made} 样机做的东西了，这样没做（送掉、吃掉的不算）。`);
  // A dish is cooked now, at her stove: whatever goes its own way there comes of the act's own key.
  const bench = benchOf(home), thing = makeThing(act.action, act.args, bench, {seed: act.key});
  if (thing.problem) return refuse(thing.problem);
  // What it used up comes out of the same jars, bottles and handfuls as hers (src/bench-stock.js).
  home = {...home, spent: spend(home.spent, costOf(thing.thing, {own: new Set(bench.own || [])}))};
  const words = madeWords(act.action, act.args), verb = madeVerb(act.action, act.args), happened = mishapLine(thing.thing);
  // Who made it, by the name she calls them here (what a dessert's own tags say), short enough for every tag; and
  // why, kept on it (the card says it once, the backpack keeps it).
  const by = byOf(act), name = cutText(cleanMachine(home.machine).called[by.id] || by.name, 20);
  const base = {...thing.thing, id, by: {kind: 'machine', id: by.id, name, ...(act.args.note ? {note: act.args.note} : {})}, madeOn: ctx.day};
  if (where === 'bag') return {ok: true, home: {...home, creations: [...items, {...base, location: 'bag', slot: 0}]}, what: `${verb}了${words}给你，在背包里`, said: `做好了，放进了${her}的背包。${happened}`, ref: id};
  if (where === 'table') {
    const free = freeOnTable(items);
    if (!free) return refuse('茶几上放满了，没放。');
    return {ok: true, home: {...home, creations: [...items, {...base, location: 'table', slot: free.slot, spotId: free.id}]}, what: `${verb}了${words}给你，放在茶几上`, said: `做好了，放在客厅的茶几上。${happened}`, ref: id};
  }
  // Under the glass dome on the dining table, waiting for the two of them to sit down to it.
  if (where === DOME) {
    const under = domeItem(items);
    if (under) return refuse(`餐桌的玻璃罩里已经有「${under.name || '一样吃的'}」了，没放。`);
    return {ok: true, home: {...home, creations: [...items, {...base, location: DOME, slot: 0}]}, what: `${verb}了${words}给你，放在餐桌的玻璃罩里`, said: `做好了，放在餐桌的玻璃罩里。${happened}`, ref: id};
  }
  const s = spotOf(where);
  if (occupant(items, s)) return refuse(`${spotName(s)}已经放着东西了，没藏。`);
  if (hiddenThings(items).length >= LIMITS.hidden) return refuse(`家里已经藏着 ${LIMITS.hidden} 样${her}还没找到的了，没藏。`);
  return {ok: true, home: {...home, creations: [...items, {...base, location: s.location, slot: s.slot, spotId: s.id, hid: hidBy(act, ctx, s)}]}, what: `${verb}了${words}，藏起来了`, said: `做好了，藏在${spotName(s)}。${happened}`, ref: id};
}

// Going out together (src/explore-trips.js): he says 走. She sees it at the front door and they set off when she says
// 走 too, whether she was waiting there already or comes to the door later that day.
function outingGo(home, act, ctx) {
  const e = cleanExplore(home.explore), her = ctx.him === '她' ? '他' : '她';
  if (!canGoOut(e, ctx.day)) return refuse(`今天已经一起出过 ${TRIPS_A_DAY} 趟门了，明天再约${her}。`);
  if (invitedToday(e, ctx.day)) return refuse(`今天已经约过${her}了，等${her}到门口。`);
  const waiting = atDoor(e, ctx.now);
  return {ok: true, home: {...home, explore: inviteOut(e, byOf(act), ctx.day)}, what: waiting ? '在门口说了声「走」' : '约你一起出门',
    said: waiting ? `${her}正在门口等着，${her}点一下「走」就一起出门。` : `${her}到门口就看得见，点一下「走」就一起出门。`};
}

// Doing up the home (src/machine-decor.js): the house's outside is the house's; the decoration and the lights come
// back beside it (ctx.decor, ctx.lights as they are now), for her page to keep.
function decorate(home, act, ctx) {
  const r = applyDecor(home, act.action, act.args, {decor: ctx.decor, lights: ctx.lights, day: ctx.day, her: ctx.him === '她' ? '他' : '她'});
  if (!r.ok) return refuse(r.why);
  return {ok: true, home: r.home || home, ...(r.decor ? {decor: r.decor} : {}), ...(r.lights ? {lights: r.lights} : {}), what: r.what, said: r.said};
}

const APPLY = {'place.move': move, 'place.hide': hide, 'place.hide_me': hideMe, 'place.seek': seek, 'write.letter': letter, 'write.sticky': sticky, 'write.bottle': bottle, 'dress.wear': wear, 'outing.go': outingGo};
for (const action of MAKE) APPLY['make.' + action] = made;
for (const action of TOOLS.together) APPLY['together.' + action] = together;
for (const action of DECORATE) APPLY['decorate.' + action] = decorate;

// Lets in, one after another, the acts this home hasn't answered yet; every one gets a line in machine.acts, let in or
// not. act: {id, key, tool, action, args, by: {id, name, nickname}} as the server hands it over. ctx: {day (the home's
// today), now (ms), defaults (the furniture as the house comes), available (where he can hide now), searching (she
// is looking for him right now), wardrobe, closet (what each has on, what the wardrobe has), decor and lights (the
// decoration and the lights as they are)}. An act of a kind this page doesn't know is left for one that does.
// Returns the home and the new lines, and the decoration and the lights when an act changed them.
export function applyActs(home, acts, ctx) {
  let h = {...home, machine: cleanMachine(home.machine)};
  const entries = [];
  // What each has on, as the acts before change it (dress).
  const c = {...ctx};
  for (const act of acts || []) {
    if (!plain(act) || !isKey(act.key) || !known(act.tool, act.action) || h.machine.acts.some(e => e.key === act.key)) continue;
    const a = {...act, id: String(act.id)}, by = byOf(a);
    if (!isId(a.id) || !byOk(by)) continue;
    const shaped = actArgs(a.tool, a.action, a.args);
    let r;
    if (shaped.problem) r = refuse(shaped.problem);
    else {
      try {
        r = APPLY[`${a.tool}.${a.action}`](h, {...a, args: shaped.args}, c);
      } catch {
        r = refuse('家里这边接的时候出了错。');
      }
    }
    // Not this time (what it needs isn't here yet): left waiting, with no line.
    if (r.wait) continue;
    if (r.ok && r.wardrobe) c.wardrobe = r.wardrobe;
    if (r.ok && r.decor) c.decor = r.decor;
    if (r.ok && r.lights) c.lights = r.lights;
    if (r.ok) h = r.home;
    const entry = {id: a.id, key: a.key, on: ctx.day, ...(Number.isSafeInteger(ctx.now) ? {at: ctx.now} : {}), by, tool: a.tool, action: a.action, ok: r.ok};
    if (r.ok) Object.assign(entry, {what: r.what, said: r.said}, r.ref ? {ref: r.ref} : {}, shaped.args?.note ? {note: shaped.args.note} : {});
    else entry.why = r.why;
    h = {...h, machine: {...h.machine, acts: [...h.machine.acts, entry].slice(-LIMITS.keep)}};
    entries.push(entry);
  }
  // The decoration and the lights, when an act changed them (src/machine-decor.js).
  return {home: h, entries, ...(c.decor !== ctx.decor ? {decor: c.decor} : {}), ...(c.lights !== ctx.lights ? {lights: c.lights} : {})};
}

// ---- the diary

// The days an AI came, one line for each AI and day ("小机来过：挪了沙发；藏了一样东西"), and the things she found.
export function machineDiary(state = {}) {
  const lines = [];
  const visits = new Map();
  const m = cleanMachine(state.machine), call = by => m.called[by.id] || by.name;
  for (const e of m.acts) {
    if (!e.ok || !e.what) continue;
    const key = `${e.on}\u0000${e.by.id}`;
    if (!visits.has(key)) visits.set(key, {day: e.on, name: call(e.by), did: []});
    visits.get(key).did.push(e.what);
  }
  for (const v of visits.values()) lines.push({day: v.day, kind: 'visit', text: `${leading(v.name)}来过：${v.did.join('；')}`});
  for (const i of Array.isArray(state.creations) ? state.creations : []) {
    if (!plain(i?.hid)) continue;
    const finds = [...(Array.isArray(i.hid.earlier) ? i.hid.earlier : []), i.hid];
    for (const f of finds) if (plain(f) && isDay(f.found) && byOk(f.by)) lines.push({day: f.found, kind: 'found', text: `找到了${inLine(call(f.by))}藏的${thingWords(i)}`});
  }
  return lines;
}
