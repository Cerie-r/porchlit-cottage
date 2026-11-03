// The tailor's bench in the study (src/tailor.jsx): what has been sewn at home, and what is on the dress form now.
// Kept with the home as homeState.tailor:
//   made:  [{id, pattern, wearer, colors: {main, accent, trim}, name, by, on, note?, lace?, pearls?}], the oldest
//          first;
//   draft: {pattern, wearer, colors, name, note?, lace?, pearls?, by?, on?}, or null: the one on the dress form, which
//          either of the two may carry on with (by and on: who last worked on it, and the day; note: a line on its tag).
// lace: the edges trimmed with lace, some of 'hem', 'collar' and 'cuffs'; pearls: true, its buttons are pearl
// (body/trims.js puts them on). Lace and pearls are found going out (src/bench-stock.js).
// pattern is the outfit it is cut from (body/sewn.js says which may be); wearer the resident it is for; by who
// sewed it, {kind: 'self'} or {kind: 'machine', name}; on the home's day it was finished. A pattern this page
// doesn't know (a home's own that hasn't come yet) is kept as it is: it shows again once it has come.
// What is sewn stays in this home's wardrobe: it isn't drawn, given or sold.
import {setSewnOutfits} from '../body/outfit-registry.js';
import {cleanLace, cleanTrims} from '../body/trims.js';

export const MAX_MADE = 40, NAME_MAX = 20, NOTE_MAX = 40;
const DAY = /^\d{4}-\d{2}-\d{2}$/, HEX = /^#[0-9a-f]{6}$/i, ID = /^sewn-[a-z0-9]{6,24}$/, PATTERN = /^[\w-]{1,60}$/;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const words = (v, max) => typeof v === 'string' && v.length <= max ? v.trim() : '';
const isDay = d => typeof d === 'string' && DAY.test(d);

export function cleanColors(raw) {
  if (!plain(raw) || !['main', 'accent', 'trim'].every(k => typeof raw[k] === 'string' && HEX.test(raw[k]))) return null;
  return {main: raw.main.toLowerCase(), accent: raw.accent.toLowerCase(), trim: raw.trim.toLowerCase()};
}
export function cleanBy(raw) {
  if (raw?.kind === 'self') return {kind: 'self'};
  const name = raw?.kind === 'machine' ? words(raw.name, NAME_MAX) : '';
  return name ? {kind: 'machine', name} : null;
}
const wearerOf = w => (w === 'girl' || w === 'boy' ? w : null);
// The trims a piece has, as kept with it: lace only when some edge has it, pearls only when it has them.
const trimsOf = raw => {
  const lace = cleanLace(raw?.lace);
  return {...(lace.length ? {lace} : {}), ...(raw?.pearls === true ? {pearls: true} : {})};
};

function cleanMade(raw) {
  if (!plain(raw) || typeof raw.id !== 'string' || !ID.test(raw.id) || typeof raw.pattern !== 'string' || !PATTERN.test(raw.pattern)) return null;
  const wearer = wearerOf(raw.wearer), colors = cleanColors(raw.colors), name = words(raw.name, NAME_MAX), by = cleanBy(raw.by);
  if (!wearer || !colors || !name || !by || !isDay(raw.on)) return null;
  const note = words(raw.note, NOTE_MAX);
  return {id: raw.id, pattern: raw.pattern, wearer, colors, name, by, on: raw.on, ...(note ? {note} : {}), ...trimsOf(raw)};
}
export function cleanDraft(raw) {
  if (!plain(raw) || typeof raw.pattern !== 'string' || !PATTERN.test(raw.pattern)) return null;
  const wearer = wearerOf(raw.wearer), colors = cleanColors(raw.colors);
  if (!wearer || !colors) return null;
  const name = words(raw.name, NAME_MAX), note = words(raw.note, NOTE_MAX), by = cleanBy(raw.by);
  return {pattern: raw.pattern, wearer, colors, name, ...(note ? {note} : {}), ...trimsOf(raw), ...(by ? {by} : {}), ...(isDay(raw.on) ? {on: raw.on} : {})};
}
export const freshTailor = () => ({made: [], draft: null});
// What a saved home has of it: anything unreadable left out, each piece once, at most MAX_MADE.
export function cleanTailor(raw) {
  const made = [], seen = new Set();
  for (const item of Array.isArray(raw?.made) ? raw.made : []) {
    const m = cleanMade(item);
    if (m && !seen.has(m.id) && made.length < MAX_MADE) { seen.add(m.id); made.push(m); }
  }
  return {made, draft: cleanDraft(raw?.draft)};
}

// What the dress form shows: the one being worked on, or else the last one finished (null: nothing sewn yet).
export function formPiece(tailor) {
  const t = cleanTailor(tailor);
  return t.draft || t.made.at(-1) || null;
}

// The pieces sewn, as the wardrobe registers them (body/outfit-registry.js): with their trims, when they have any.
export const sewnEntries = tailor => cleanTailor(tailor).made.map(m => {
  const {id, pattern, wearer, colors, name} = m, trims = cleanTrims(m);
  return {id, pattern, wearer, colors, name, ...(trims ? {trims} : {})};
});
export const registerSewn = tailor => setSewnOutfits(sewnEntries(tailor));
// The home's own record, from where the house keeps it (for the wardrobe opened on its own).
export function readTailor() {
  try { return cleanTailor(JSON.parse(localStorage.getItem('porchlit-home-layout-v1'))?.tailor); } catch { return freshTailor(); }
}

export const newSewnId = () => 'sewn-' + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12);

// Working on the dress form: what changes, and who changed it on which day.
export function workOn(tailor, patch, {day, by = {kind: 'self'}} = {}) {
  const t = cleanTailor(tailor), draft = cleanDraft({...(t.draft || {}), ...patch, by, on: day});
  return {...t, draft};
}
export const clearForm = tailor => ({...cleanTailor(tailor), draft: null});

// Finishing what is on the dress form: it goes into the wardrobe, and the form is free again. Says why not
// (error) when it can't be: nothing on the form, no name yet, or the wardrobe full of what was sewn at home.
export function finishDraft(tailor, {day, by = {kind: 'self'}, id = newSewnId()} = {}) {
  const t = cleanTailor(tailor), d = t.draft;
  if (!d) return {tailor: t, error: '人台上还没有衣服'};
  if (!d.name) return {tailor: t, error: '先给它起个名字'};
  if (t.made.length >= MAX_MADE) return {tailor: t, error: `家里做的衣服已经有 ${MAX_MADE} 件了，先拆掉一件再做吧`};
  const made = cleanMade({id, pattern: d.pattern, wearer: d.wearer, colors: d.colors, name: d.name, note: d.note, lace: d.lace, pearls: d.pearls, by, on: day});
  if (!made) return {tailor: t, error: '这件还缝不好'};
  return {tailor: {made: [...t.made, made], draft: null}, made};
}

// Unpicking one: gone from the wardrobe. Whoever has it on goes back to its pattern (wearInstead).
export const unpick = (tailor, id) => {
  const t = cleanTailor(tailor);
  return {...t, made: t.made.filter(m => m.id !== id)};
};
// A wardrobe (as cleanWardrobe gives it, or as saved) with the outfit `id` taken off whoever wears it, and its
// pattern put on instead. Nothing else in it changes.
export function wearInstead(wardrobe, id, pattern) {
  if (!plain(wardrobe)) return wardrobe;
  const out = {...wardrobe};
  for (const kind of ['girl', 'boy']) if (plain(out[kind]) && out[kind].outfit === id) out[kind] = {...out[kind], outfit: pattern};
  return out;
}
// Unpicking one at home: the home without it, and, when one of the two had it on, their wardrobe with its pattern on
// instead (to keep where the wardrobe keeps it, as the house does when the wardrobe saves; null: nobody had it on).
// `wardrobe` is the two residents' looks as they are now (readWardrobe).
export function unpickAt(home, id, wardrobe) {
  const made = cleanTailor(home?.tailor).made.find(m => m.id === id);
  if (!made) return {home, wardrobe: null};
  const worn = ['girl', 'boy'].filter(kind => wardrobe?.[kind]?.outfit === id), next = worn.length ? wearInstead(wardrobe, id, made.pattern) : null;
  const residents = next ? {...(home.residents || {}), wardrobeV1: next, ...Object.fromEntries(worn.map(kind => [kind + 'Outfit', made.pattern]))} : home.residents;
  return {home: {...home, tailor: unpick(home.tailor, id), ...(next ? {residents} : {})}, wardrobe: next};
}
