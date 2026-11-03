// Things that come and go through the door (server/doors.mjs): what can be
// put into someone's mailbox, and what something left at this door becomes
// when it is taken in. Anything from another home is checked here, as
// strictly as the bench that made it would check it, and only the parts that
// make up the thing are kept, before it goes into this one.
import {freshAnimal, normalizeAnimal, validAnimal, wornList} from './animal-state.js';
import {validBouquet} from './flower-kinds.js';
import {PARTS, ROLES, MATERIALS, SCALES, validRecipe} from './brick-recipe.js';
import {dessertRecipe, validDessert} from './dessert-recipe.js';
import {leading} from './words.js';
import {cutText, own, record, safePayload, smallPng, validText, PHOTO_LIMIT, SMALL_GIFT_LIMIT} from './door-safety.js';

export const GIFT_KINDS = ['animal', 'bouquet', 'build', 'dessert', 'photo'];
export const NOTE_MAX = 300;
const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const ANIMAL_KEYS = Object.keys(freshAnimal());

// What a visitor can put into a mailbox: the things in their backpack that travel.
export const giftable = creations => (creations || []).filter(i => i && i.location === 'bag' && GIFT_KINDS.includes(i.kind) && !i.puzzleId);

// A thing as it goes into the mailbox: where it stood here, and its id here, stay behind.
export function outgoing(item) {
  const {id, location, slot, spotId, position, rotationY, floor, support, wall, opened, gift, madeOn, caught, blindbox, by, createdAt, sourceId, status, ...rest} = item;
  return rest;
}

const pick = (item, keys) => Object.fromEntries(keys.filter(k => item[k] !== undefined).map(k => [k, item[k]]));
// The thing itself, or null when it isn't one a bench here could have made.
export function checkGift(item) {
  try {
    if (!safePayload(item, item?.kind === 'photo' ? PHOTO_LIMIT : SMALL_GIFT_LIMIT)) return null;
    return checkedGift(item);
  } catch { return null; }
}
function checkedGift(item) {
  if (!plain(item) || !GIFT_KINDS.includes(item.kind)) return null;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!validText(name) || !name || [...name].length > 40) return null;
  if (item.kind === 'animal') {
    if (!validAnimal(item)) return null;
    // A doll can wear several things at once; the list is rebuilt, never passed through.
    const doll = pick(normalizeAnimal(item), ANIMAL_KEYS);
    if (Array.isArray(doll.accessory)) doll.accessory = wornList(doll.accessory);
    return {...doll, kind: 'animal', name, bricks: []};
  }
  if (item.kind === 'bouquet') {
    if (!Array.isArray(item.stems) || item.stems.some(s => !record(s)) || !validBouquet(item) || !HEX.test(item.vaseColor || '') || !item.stems.every(s => HEX.test(s.color || ''))) return null;
    return {kind: 'bouquet', name, vase: item.vase, vaseColor: item.vaseColor, stems: item.stems.map((s, i) => ({id: 's' + i, ...pick(s, ['slot', 'type', 'color', 'height', 'tilt', 'turn'])})), bricks: []};
  }
  if (item.kind === 'build') {
    if (item.v !== undefined && item.v !== 1 || item.mirror !== undefined && typeof item.mirror !== 'boolean' || item.scale !== undefined && !own(SCALES, item.scale) || !Array.isArray(item.parts) || item.parts.length > 200) return null;
    const parts = [];
    for (const p of item.parts) {
      if (!record(p) || typeof p.id !== 'string' || !p.id || p.id.length > 80 || !own(PARTS, p.p) || !own(ROLES, p.c) || p.mat !== undefined && !own(MATERIALS, p.mat) || p.flip !== undefined && typeof p.flip !== 'boolean' || p.mirrorOf !== undefined && (typeof p.mirrorOf !== 'string' || p.mirrorOf.length > 80) || p.turn !== undefined && ![0, 1, 2, 3].includes(p.turn)) return null;
      if (PARTS[p.p].profiles && !own(PARTS[p.p].profiles, p.profile)) return null;
      if (p.profile !== undefined && typeof p.profile !== 'string') return null;
      parts.push(pick(p, ['id', 'p', 'x', 'y', 'z', 'w', 'd', 'h', 'turn', 'c', 'mat', 'profile', 'flip', 'mirrorOf']));
    }
    if (new Set(parts.map(p => p.id)).size !== parts.length) return null;
    const build = {kind: 'build', v: 1, scale: item.scale ?? 'small', mirror: item.mirror ?? false, name, parts};
    return validRecipe(build) ? build : null;
  }
  if (item.kind === 'dessert') {
    if (!validDessert({...item, by: undefined, note: undefined, madeOn: undefined})) return null;
    return {...dessertRecipe(item), name};
  }
  if (item.kind === 'photo') return smallPng(item.image) && ['free', 'pixel'].includes(item.mode) ? {kind: 'photo', name, mode: item.mode, image: item.image} : null;
  return null;
}

const fromName = visit => {const v = visit?.from?.nickname || visit?.from?.name; return validText(v) && v.trim() ? cutText(v.trim(), 64) : '一位邻居';};

// What something left at the door becomes in this home once taken in (into
// the backpack), or null when it can't be trusted. A thing keeps a little tag
// of who it came from, when, and the note that came with it; a note alone
// becomes a letter. A dessert from someone else can be eaten together and
// learned. Its id comes from the visit, so taking the same visit in twice
// gives the same thing, not two.
export function welcome(visit, on) {
  if (!plain(visit) || typeof visit.id !== 'string' || !/^[1-9][0-9]{0,18}$/.test(visit.id) || visit.status === 'declined' || visit.delivered || (visit.note != null && (!validText(visit.note) || [...visit.note.trim()].length > NOTE_MAX))) return null;
  const from = fromName(visit), note = typeof visit.note === 'string' && visit.note.trim() ? visit.note.trim() : null;
  const tag = {id: visit.id, from, ...(on ? {on} : {}), ...(note ? {note} : {})};
  if (visit.item) {
    const thing = checkGift(visit.item);
    if (!thing) return null;
    return {...thing, id: 'gift-' + visit.id, location: 'bag', slot: 0, gift: tag, ...(thing.kind === 'dessert' ? {by: {kind: 'guest', name: cutText(from, 20)}} : {})};
  }
  if (note) return {id: 'gift-' + visit.id, kind: 'note', name: `${leading(from)}的纸条`, note, location: 'bag', slot: 0, gift: tag};
  return null;
}

// Takes something in: the home with the thing in its backpack, once.
export function takeIn(creations, thing) {
  const items = creations || [];
  return !thing || items.some(i => i.id === thing.id) ? items : [...items, thing];
}

// What a line in the guestbook says.
const KIND_WORDS = {animal: '一只玩偶', bouquet: '一束花', build: '一件拼搭', dessert: '一份甜品', photo: '一张相纸'};
export function bookLine(entry) {
  const who = fromName(entry);
  if (entry.kind === 'knock') return `${leading(who)}来敲过门`;
  const what = entry.itemName ? `${KIND_WORDS[entry.itemKind] || '一样东西'}「${entry.itemName}」` : '';
  const left = what && entry.note ? `${what}和一张纸条` : what || '一张纸条';
  const outcome = entry.status === 'taken' ? '，收下了' : entry.status === 'declined' ? '，没收' : '，还在门口';
  return `${leading(who)}放了${left}${outcome}`;
}
