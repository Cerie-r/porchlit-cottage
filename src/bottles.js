// Drift bottles, the page's side (server/bottles.mjs is the sea). A few words, one bottle a day each, sealed and thrown
// into the sea from the study computer by whoever lives in a home: her, or an AI living there (an AI's says so). And
// the glass bottle a walk brings home from the lake (src/explore-lake-layout.js): opened at home, the sea gives it
// what's in it, a stranger's words, or nothing at all (an empty bottle). Whoever finds one isn't told whose it was;
// whoever threw it only hears that it was found.
//
// What the home keeps (home.bottles): the bottles brought home and not opened yet, by which find each is (the walk's
// day, its number that day, its place in the basket), so the same find opens the same bottle however often it is
// asked; and a short log for the diary: a bottle thrown (and who threw it, if an AI did), one opened, one empty.
import {cutText, validText} from './door-safety.js';

export const WORDS_MAX = 1000;
// The lake's bottle in a basket: its place and its find.
export const BOTTLE_PLACE = 'lake';
export const BOTTLE_FIND = 'message-bottle';
// Its picture, for the backpack and the bottle opened there.
export const BOTTLE_ART = '/explore/lakeside/find-message-bottle.webp';
const KEEP = {waiting: 12, log: 60};

export function wordsProblem(words) {
  if (typeof words !== 'string' || !validText(words)) return '瓶子里要装一段字。';
  const text = words.trim();
  if (!text) return '瓶子里还是空的，先写几句。';
  if ([...text].length > WORDS_MAX) return `瓶子里最多装 ${WORDS_MAX} 个字。`;
  return null;
}
export const cleanWords = words => (wordsProblem(words) ? null : words.trim());

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = d => typeof d === 'string' && DAY.test(d);
const KEY = /^\d{4}-\d{2}-\d{2}#[1-9]\d?#\d{1,2}$/;
export const isFindKey = key => typeof key === 'string' && KEY.test(key);
export const findKey = (day, n, i) => `${day}#${n}#${i}`;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);

// The bottles in a trip's basket (src/explore-trips.js), as finds to open.
export function bottlesIn(trip) {
  if (!plain(trip) || !isDay(trip.day) || !Number.isInteger(trip.n) || !Array.isArray(trip.basket)) return [];
  return trip.basket.map((f, i) => (f?.place === BOTTLE_PLACE && f.id === BOTTLE_FIND ? findKey(trip.day, trip.n, i) : null)).filter(isFindKey);
}

const WHATS = ['thrown', 'opened', 'empty'];
const ACT_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const byOk = by => plain(by) && typeof by.name === 'string' && !!by.name.trim() && validText(by.name);
export function cleanBottles(raw) {
  const r = plain(raw) ? raw : {};
  const waiting = [...new Set((Array.isArray(r.waiting) ? r.waiting : []).filter(isFindKey))].slice(-KEEP.waiting);
  const log = (Array.isArray(r.log) ? r.log : []).filter(e => plain(e) && isDay(e.day) && WHATS.includes(e.what)).map(e => ({
    day: e.day, what: e.what,
    ...(isFindKey(e.key) ? {key: e.key} : {}),
    ...(typeof e.act === 'string' && ACT_KEY.test(e.act) ? {act: e.act} : {}),
    ...(e.what === 'thrown' && byOk(e.by) ? {by: {kind: 'machine', id: String(e.by.id ?? '').slice(0, 20), name: cutText(e.by.name.trim(), 64)}} : {}),
    ...(e.what === 'thrown' && cleanWords(e.words) ? {words: cleanWords(e.words)} : {})
  })).slice(-KEEP.log);
  return {waiting, log};
}

// Bottles brought home, to be opened once the porch light is on: each find once, however often its walk comes home.
export function awaitBottles(raw, keys) {
  const b = cleanBottles(raw), known = new Set([...b.waiting, ...b.log.map(e => e.key).filter(Boolean)]);
  const fresh = [...new Set((keys || []).filter(k => isFindKey(k) && !known.has(k)))];
  return fresh.length ? {...b, waiting: [...b.waiting, ...fresh].slice(-KEEP.waiting)} : b;
}

// What a bottle from the sea becomes here: a note in the backpack, as a letter taken in at the door does, with a tag
// of when it was opened and when it was thrown (and that an AI wrote it). Null when it isn't one. found: {id, words,
// thrownOn, byMachine} as the sea gives it.
export function bottleNote(found, day) {
  if (!plain(found) || typeof found.id !== 'string' || !/^[1-9]\d{0,18}$/.test(found.id)) return null;
  const words = cleanWords(found.words);
  if (!words) return null;
  return {
    id: 'bottle-' + found.id, kind: 'note', name: '漂流瓶里的纸条', note: words, location: 'bag', slot: 0,
    bottle: {id: found.id, ...(isDay(day) ? {on: day} : {}), ...(isDay(found.thrownOn) ? {thrownOn: found.thrownOn} : {}), ...(found.byMachine === true ? {byMachine: true} : {})}
  };
}

// One bottle opened: what the sea gave for this find (found, or null for an empty one). The home with the note in its
// backpack, and the find off the waiting list; the same home when it wasn't waiting.
export function openBottle(home, key, found, day) {
  const b = cleanBottles(home?.bottles);
  if (!b.waiting.includes(key)) return home;
  const note = found ? bottleNote(found, day) : null;
  const items = Array.isArray(home.creations) ? home.creations : [];
  const creations = note && !items.some(i => i?.id === note.id) ? [...items, note] : items;
  return {...home, creations, bottles: {waiting: b.waiting.filter(k => k !== key), log: [...b.log, {day, what: note ? 'opened' : 'empty', key}].slice(-KEEP.log)}};
}

// What becomes of a find once the sea has answered (r: {bottle}, {empty}, {later}) or failed (err: a PorchError): opened,
// with what was in it (found: null for an empty bottle; said: whether she's told); or asked again in a while (later:
// ms), when the home has opened enough today or the sea couldn't be asked. One the sea won't open at all (400: not a
// find it knows) is an empty bottle, said to no one, so those behind it aren't held up.
export function bottleAnswer(r, err = null) {
  if (err) return err.status === 400 ? {found: null, said: false} : {later: err.retryAfter > 0 ? err.retryAfter * 1000 : 120000};
  if (r?.later === true) return {later: 3600000};
  return {found: plain(r?.bottle) ? r.bottle : null, said: true};
}

// A bottle thrown from here: by her (the sea took it), or by an AI living here (its act let in: by, act, and its words,
// so she can read what it said to a stranger). A line in the diary.
export function threwBottle(raw, {day, by = null, act = null, words = null}) {
  const b = cleanBottles(raw);
  if (act && b.log.some(e => e.act === act)) return b;
  return cleanBottles({...b, log: [...b.log, {day, what: 'thrown', ...(by ? {by} : {}), ...(act ? {act} : {}), ...(words ? {words} : {})}]});
}

// Whether she has thrown hers today, as this home knows it (the sea knows for sure).
export const thrownToday = (raw, day) => cleanBottles(raw).log.some(e => e.what === 'thrown' && !e.by && e.day === day);

// The diary's lines: {day, kind: 'bottle', text}. One an AI threw is in the line about its visit (src/machine-acts.js).
export function bottleDiary(raw) {
  return cleanBottles(raw).log.map(e => ({
    day: e.day, kind: 'bottle',
    text: e.what === 'thrown' ? (e.by ? '' : '往海里投了一只漂流瓶') : e.what === 'opened' ? '拆开湖边捞回来的漂流瓶，里面是一张陌生人写的纸条' : '湖边捞回来的瓶子是空的，只倒出来一点沙'
  })).filter(l => l.text);
}
