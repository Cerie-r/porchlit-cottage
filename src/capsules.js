// The capsule machine (扭蛋机) on each street's little plaza: the bear jar.
// A ticket goes in, the dial turns once round, and a star ball rolls out with
// one thing in it. Most balls hold something small: an accessory the dolls
// can wear, or a piece the residents wear themselves (a cap, a hair clip, a
// brooch), each colourway a prize of its own; now and then a ticket back
// ("again"), or, in a home whose own resident has written some, a note rolled
// up inside. Rarely, an outfit (only in its season) or a hairstyle (any time).
// What a home has drawn is kept with it (homeState.capsules): the doll tray and
// the wardrobe offer only those. Drawing something already drawn gives a scrap
// of cloth instead, and enough scraps buy anything in the jar this season not
// drawn yet. Nothing in here is ranked or shown to anyone else.
//
// Around a festival the machine has a second, smaller jar, that festival's
// limited pool (FESTIVALS below): only its own things, none of them rare, and
// scraps of its own, cheaper, so that they can all be drawn before it closes.
// What isn't drawn waits for the festival next year; what is, stays.
import {animalOptions} from './animal-state.js';
import {earnTicket, spendTicket} from './tickets.js';
import {PEOPLE_PIECES, PEOPLE_OUTFITS, PEOPLE_HAIRS, FESTIVAL_POOLS} from './capsule-catalog.js';

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const noteId = /^[a-z0-9][a-z0-9-]{0,39}$/;
const unique = list => [...new Set(list)];

// Everything a doll can wear comes out of the machine.
export const DOLL_PRIZES = animalOptions.accessory.filter(a => a !== 'none');
// Their names, as the doll tray calls them.
export const PRIZE_NAMES = {bow: '蝴蝶结', scarf: '小围巾', hat: '贝雷帽', wreath: '花环', glasses: '小眼镜', wings: '小翅膀', pearls: '珍珠项链', witchhat: '小巫师帽', pumpkin: '南瓜小篮', batwings: '蝙蝠翅膀', xmashat: '圣诞帽'};

// How things come out: something rare (an outfit in its season, or a
// hairstyle) about one time in twenty; otherwise now and then a ticket back, or
// a note while one is left, and the rest evenly among the small things.
export const RARE_ODDS = 1 / 20, AGAIN_ODDS = .08, NOTE_ODDS = .06;
// Scraps of cloth that buy one thing still to be drawn: an outfit or a
// hairstyle costs more.
export const SCRAPS_FOR_ONE = 10, SCRAPS_FOR_RARE = 20;
const RARE_KINDS = ['outfit', 'hair'];
export const scrapsFor = prize => prize?.pool ? FESTIVAL_SCRAPS[prize.kind === 'outfit' ? 'outfit' : 'piece'] : RARE_KINDS.includes(prize?.kind) ? SCRAPS_FOR_RARE : SCRAPS_FOR_ONE;

// From one month-day to another, both kept; a season may run over the new year.
const within = ([from, to], day) => {
  if (typeof day !== 'string' || !dayPattern.test(day)) return false;
  const md = day.slice(5);
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
};
// The seasonal doll accessories are in the jar only around their day.
export const SEASONS = {
  witchhat: ['10-15', '11-07'], pumpkin: ['10-15', '11-07'], batwings: ['10-15', '11-07'],
  xmashat: ['12-15', '01-06']
};
export const inSeason = (id, day) => !Object.hasOwn(SEASONS, id) || within(SEASONS[id], day);
// Outfits come and go by season too. One that isn't listed isn't in the jar.
export const OUTFIT_SEASONS = {
  'knit-skirt': ['10-25', '12-14'], 'knit-trousers': ['10-25', '12-14'], 'hoodie-cargo': ['10-25', '12-14'],
  'duffle-tights': ['12-15', '02-28'], 'duffle-trousers': ['12-15', '02-28'], 'cake-dress': ['12-15', '02-28'],
  qipao: ['01-20', '02-20'], 'tang-suit': ['01-20', '02-20']
};
export const outfitInSeason = (id, day) => Object.hasOwn(OUTFIT_SEASONS, id) && within(OUTFIT_SEASONS[id], day);

// The festivals' limited pools: open from one month-day to another every year,
// from the year given on (this year's Halloween things wait for next year).
export const FESTIVALS = {
  halloween: {name: '万圣节', from: '10-15', to: '11-07', since: 2027},
  christmas: {name: '圣诞', from: '12-15', to: '01-06', since: 2026}
};
// Scraps that buy one thing in a festival's pool: fewer than in the jar.
export const FESTIVAL_SCRAPS = {piece: 5, outfit: 10};
// Whether a festival's pool is open on this day (and has anything in it).
export function festivalOn(pool, day) {
  const f = Object.hasOwn(FESTIVALS, pool) ? FESTIVALS[pool] : null, things = Object.hasOwn(FESTIVAL_POOLS, pool) ? FESTIVAL_POOLS[pool] : null;
  if (!f || !things || !(things.pieces.length + things.outfits.length) || !within([f.from, f.to], day)) return false;
  const year = Number(day.slice(0, 4)), md = day.slice(5);
  // A festival over the new year belongs to the year it began in.
  return (f.from > f.to && md <= f.to ? year - 1 : year) >= f.since;
}
// The festivals open on this day: [{pool, name, to}].
export const openFestivals = day => Object.keys(FESTIVALS).filter(pool => festivalOn(pool, day)).map(pool => ({pool, name: FESTIVALS[pool].name, to: FESTIVALS[pool].to}));

// A drawn piece, outfit or hairstyle is kept as "id:colourway", whichever jar it came out of.
const keyOf = p => p.kind === 'doll' ? p.id : `${p.id}:${p.way}`;
const festivalPieces = Object.values(FESTIVAL_POOLS).flatMap(f => f.pieces), festivalOutfits = Object.values(FESTIVAL_POOLS).flatMap(f => f.outfits);
const allPieces = new Set([...PEOPLE_PIECES, ...festivalPieces].flatMap(p => p.ways.map(w => `${p.id}:${w.id}`)));
const allOutfits = new Set([...PEOPLE_OUTFITS, ...festivalOutfits].flatMap(o => o.ways.map(w => `${o.id}:${w.id}`)));
const allHairs = new Set(PEOPLE_HAIRS.flatMap(h => h.ways.map(w => `${h.id}:${w.id}`)));

const count = n => Number.isSafeInteger(n) && n > 0 ? Math.min(n, 999) : 0;
// Whatever was saved, as something safe to use: the doll accessories, the
// residents' pieces, outfits and hairstyles drawn (each once, from either jar),
// the notes already found, the scraps put by, and each festival's own scraps.
export function cleanCapsules(raw) {
  const r = plain(raw) ? raw : {};
  const list = (v, ok) => Array.isArray(v) ? unique(v.filter(x => typeof x === 'string' && ok(x))) : [];
  const festival = {};
  for (const pool of Object.keys(FESTIVALS)) { const n = count(plain(r.festival) && plain(r.festival[pool]) ? r.festival[pool].scraps : 0); if (n) festival[pool] = {scraps: n}; }
  return {
    dolls: list(r.dolls, a => DOLL_PRIZES.includes(a)),
    notes: list(r.notes, id => noteId.test(id)).slice(-200),
    pieces: list(r.pieces, k => allPieces.has(k)),
    outfits: list(r.outfits, k => allOutfits.has(k)),
    hairs: list(r.hairs, k => allHairs.has(k)),
    scraps: count(r.scraps),
    festival,
    // Only things there are (a doll accessory, a piece, an outfit or a hairstyle in its colourway), on a real day.
    got: Array.isArray(r.got) ? r.got.filter(g => plain(g) && typeof g.on === 'string' && dayPattern.test(g.on) && (g.kind === 'doll' ? DOLL_PRIZES.includes(g.key) : g.kind === 'piece' ? allPieces.has(g.key) : g.kind === 'outfit' ? allOutfits.has(g.key) : g.kind === 'hair' && allHairs.has(g.key))).map(g => ({on: g.on, kind: g.kind, key: g.key, ...(g.swap === true ? {swap: true} : {})})).slice(-GOT_KEEP) : []
  };
}
// What came out of the machine, newest last, for the diary: {on, kind, key, swap (traded for scraps)}.
const GOT_KEEP = 200;
const noted = (capsules, prize, day, swap = false) => dayPattern.test(day || '') ? {...capsules, got: [...(capsules.got || []), {on: day, kind: prize.kind, key: keyOf(prize), ...(swap ? {swap: true} : {})}].slice(-GOT_KEEP)} : capsules;
// The prize a diary entry is about.
export const prizeOf = got => got.kind === 'doll' ? {kind: 'doll', id: got.key} : {kind: got.kind, id: got.key.split(':')[0], way: got.key.split(':').slice(1).join(':')};
// The scraps for the jar (no pool) or for a festival's pool.
export const scrapsIn = (capsules, pool) => pool ? capsules.festival?.[pool]?.scraps || 0 : capsules.scraps || 0;
const withScraps = (capsules, pool, n) => pool ? {...capsules, festival: {...capsules.festival, [pool]: {scraps: n}}} : {...capsules, scraps: n};
const shelf = {doll: 'dolls', piece: 'pieces', outfit: 'outfits', hair: 'hairs'};
export const owns = (capsules, prize) => !!shelf[prize?.kind] && capsules[shelf[prize.kind]].includes(keyOf(prize));
const withPrize = (capsules, prize) => ({...capsules, [shelf[prize.kind]]: [...capsules[shelf[prize.kind]], keyOf(prize)]});

// Notes a home's resident wrote for the jar: {id, text}; the bad ones are left out.
export const cleanNotes = list => (Array.isArray(list) ? list : []).filter(n => plain(n) && typeof n.id === 'string' && noteId.test(n.id) && typeof n.text === 'string' && n.text.trim() && [...n.text].length <= 120);

// What could come out on this day: the small things (doll accessories in
// season, every colourway of every piece), the rare ones (every colourway of
// the outfits in season, and every hairstyle), and whether a note is still
// waiting.
export function capsulePool(day, {notes = [], found = []} = {}) {
  const common = [
    ...DOLL_PRIZES.filter(id => inSeason(id, day)).map(id => ({kind: 'doll', id})),
    ...PEOPLE_PIECES.flatMap(p => p.ways.map(w => ({kind: 'piece', id: p.id, way: w.id})))
  ];
  const rare = [
    ...PEOPLE_OUTFITS.filter(o => outfitInSeason(o.id, day)).flatMap(o => o.ways.map(w => ({kind: 'outfit', id: o.id, way: w.id}))),
    ...PEOPLE_HAIRS.flatMap(h => h.ways.map(w => ({kind: 'hair', id: h.id, way: w.id})))
  ];
  return {common, rare, note: cleanNotes(notes).some(n => !found.includes(n.id))};
}

const pickFrom = (list, random) => list[Math.min(list.length - 1, Math.max(0, Math.floor(Number(random()) * list.length) || 0))];

// What a festival's pool holds: every colourway of its pieces and its outfits, all alike.
export const festivalPool = pool => Object.hasOwn(FESTIVAL_POOLS, pool) ? [
  ...FESTIVAL_POOLS[pool].outfits.flatMap(o => o.ways.map(w => ({kind: 'outfit', id: o.id, way: w.id, pool}))),
  ...FESTIVAL_POOLS[pool].pieces.flatMap(p => p.ways.map(w => ({kind: 'piece', id: p.id, way: w.id, pool})))
] : [];

// One turn of the dial: a ticket goes in and something comes out. Returns
// {state, prize}, or {state, problem: 'no_ticket'} with the state untouched.
// A prize is {kind: 'doll', id}, {kind: 'piece' | 'outfit' | 'hair', id, way},
// {kind: 'again'} or {kind: 'note', id, text}; one already drawn comes with
// twice: true, and a scrap is put by for it.
export function turnDial(state, {day, notes = [], pool = null, random = Math.random} = {}) {
  if (pool && !festivalOn(pool, day)) return {state, problem: 'closed'};
  const spent = spendTicket(state?.tickets, 'capsule', day);
  if (!spent) return {state, problem: 'no_ticket'};
  const capsules = cleanCapsules(state.capsules), mine = cleanNotes(notes);
  // A festival's pool: a ticket back now and then, else any of its things; twice is one of its scraps.
  if (pool) {
    if (Number(random()) < AGAIN_ODDS) return {state: {...state, tickets: earnTicket(spent, 'again', day)}, prize: {kind: 'again', pool}};
    const pick = pickFrom(festivalPool(pool), random);
    if (owns(capsules, pick)) return {state: {...state, tickets: spent, capsules: withScraps(capsules, pool, scrapsIn(capsules, pool) + 1)}, prize: {...pick, twice: true}};
    return {state: {...state, tickets: spent, capsules: noted(withPrize(capsules, pick), pick, day)}, prize: pick};
  }
  const jar = capsulePool(day, {notes: mine, found: capsules.notes});
  let pick;
  if (jar.rare.length && Number(random()) < RARE_ODDS) pick = pickFrom(jar.rare, random);
  else {
    const r = Number(random());
    pick = r < AGAIN_ODDS ? {kind: 'again'} : jar.note && r < AGAIN_ODDS + NOTE_ODDS ? {kind: 'note'} : pickFrom(jar.common, random);
  }
  if (pick.kind === 'again') return {state: {...state, tickets: earnTicket(spent, 'again', day)}, prize: {kind: 'again'}};
  if (pick.kind === 'note') {
    const note = pickFrom(mine.filter(n => !capsules.notes.includes(n.id)), random);
    const letter = {id: 'capsule-' + note.id, kind: 'note', name: '扭蛋里的纸条', note: note.text.trim(), location: 'bag', slot: 0, ...(dayPattern.test(day || '') ? {capsule: {on: day}} : {})};
    const creations = Array.isArray(state.creations) ? state.creations : [];
    return {
      state: {...state, tickets: spent, capsules: {...capsules, notes: [...capsules.notes, note.id]}, creations: creations.some(i => i?.id === letter.id) ? creations : [...creations, letter]},
      prize: {kind: 'note', id: note.id, text: letter.note}
    };
  }
  if (owns(capsules, pick)) return {state: {...state, tickets: spent, capsules: {...capsules, scraps: capsules.scraps + 1}}, prize: {...pick, twice: true}};
  return {state: {...state, tickets: spent, capsules: noted(withPrize(capsules, pick), pick, day)}, prize: pick};
}

// Everything in the jar this season (or in a festival's pool while it's open)
// not drawn yet, the rare ones first.
export function stillToDraw(state, day, pool = null) {
  const capsules = cleanCapsules(state?.capsules);
  if (pool) return festivalOn(pool, day) ? festivalPool(pool).filter(p => !owns(capsules, p)) : [];
  const jar = capsulePool(day);
  return [...jar.rare, ...jar.common].filter(p => !owns(capsules, p));
}

// Scraps for one thing still to be drawn, chosen: {state, prize} or {state, problem}.
export function exchange(state, prize, {day, pool = null} = {}) {
  const capsules = cleanCapsules(state?.capsules);
  const wanted = stillToDraw(state, day, pool).find(p => p.kind === prize?.kind && keyOf(p) === keyOf(prize));
  if (!wanted) return {state, problem: 'not_here'};
  const cost = scrapsFor(wanted), have = scrapsIn(capsules, pool);
  if (have < cost) return {state, problem: 'not_enough'};
  return {state: {...state, capsules: noted(withScraps(withPrize(capsules, wanted), pool, have - cost), wanted, day, true)}, prize: {...wanted, exchanged: true}};
}

// What a prize is called, its colourway (name and two colours; no name for
// one that comes in a single colour), and who wears it.
export function describePrize(prize) {
  if (prize?.kind === 'doll') return {name: Object.hasOwn(PRIZE_NAMES, prize.id) ? PRIZE_NAMES[prize.id] : '一样配饰', wearers: []};
  if (prize?.kind === 'hair') {
    const hair = PEOPLE_HAIRS.find(h => h.id === prize.id);
    return hair ? {name: hair.name, way: '', color: hair.ways[0].color, accent: hair.ways[0].accent, wearers: hair.wearers, rare: true, hair: true, festival: false} : {name: '', wearers: []};
  }
  const festival = (prize?.kind === 'piece' ? festivalPieces : prize?.kind === 'outfit' ? festivalOutfits : []).find(x => x.id === prize.id);
  const item = festival || (prize?.kind === 'piece' ? PEOPLE_PIECES : prize?.kind === 'outfit' ? PEOPLE_OUTFITS : []).find(x => x.id === prize.id);
  if (!item) return {name: '', wearers: []};
  const way = item.ways.find(w => w.id === prize.way) || item.ways[0];
  return {name: item.name, way: way.id === 'base' ? '' : way.name, color: way.color, accent: way.accent, wearers: item.wearers, slot: item.slot, rare: prize.kind === 'outfit' && !festival, festival: !!festival};
}

// What the wardrobe may offer: every piece, outfit and hairstyle drawn, by colourway.
export const drawnToWear = raw => {const c = cleanCapsules(raw); return {pieces: c.pieces, outfits: c.outfits, hairs: c.hairs};};
