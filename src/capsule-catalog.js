// What the capsule machine holds for the residents themselves: the public
// pieces (body/accessory-pieces.js), outfits (body/outfit-pieces.js) and
// hairstyles (body/hair-pieces.js), each colourway its own prize. A home's own
// pieces (src/ours/) never go in: they stay in that home's wardrobe as they
// are. One that comes in a single colour (every hairstyle: the hair colour is
// the resident's own) is one prize, under the colourway 'base' (as
// body/drawn.js reads it).
// Two kinds of public things stay out of the jar. A festival's own (pool:
// 'halloween', 'christmas') is kept for that festival's limited pool
// (FESTIVAL_POOLS), for the machine to offer around the festival; until it
// does, nobody can draw them, and the wardrobe keeps them back like anything
// not drawn. A gift (gift: true) every home has without drawing it (see
// body/drawn.js), from the day it comes out (body/wardrobe-day.js).
import {publicAccessories} from '../body/accessory-pieces.js';
import {publicOutfits} from '../body/outfit-pieces.js';
import {publicHairs} from '../body/hair-pieces.js';

const waysOf = (list, name) => {
  const ways = (Array.isArray(list) ? list : []).filter(w => typeof w?.id === 'string').map(w => ({id: w.id, name: w.name || w.id, color: w.colors?.main || '#ffffff', accent: w.colors?.accent || w.colors?.main || '#ffffff'}));
  return ways.length ? ways : [{id: 'base', name, color: '#ffffff', accent: '#ffffff'}];
};
const entry = (x, extra = {}) => ({id: x.id, name: x.name, wearers: [...x.wearers], ways: waysOf(x.colorways, x.name), ...extra});

const inJar = x => !x.pool && !x.gift;
const piece = a => entry(a, {slot: a.slot || 'head'});
// [{id, name, wearers, slot, ways: [{id, name, color, accent}]}]
export const PEOPLE_PIECES = publicAccessories.filter(inJar).map(piece);
// [{id, name, wearers, ways}]
export const PEOPLE_OUTFITS = publicOutfits.filter(inJar).map(o => entry(o));
// [{id, name, wearers, ways: [{id: 'base', ...}]}], in the hair's own brown.
export const HAIR_BROWN = '#806455';
export const PEOPLE_HAIRS = publicHairs.map(h => ({...entry(h), ways: [{id: 'base', name: h.name, color: HAIR_BROWN, accent: '#a3836f'}]}));
// Each festival's own, in the same shape: {halloween: {pieces, outfits}, christmas: {pieces, outfits}}.
export const FESTIVAL_POOLS = Object.fromEntries([...new Set([...publicAccessories, ...publicOutfits].filter(x => x.pool && !x.gift).map(x => x.pool))]
  .map(pool => [pool, {pieces: publicAccessories.filter(a => a.pool === pool && !a.gift).map(piece), outfits: publicOutfits.filter(o => o.pool === pool && !o.gift).map(o => entry(o))}]));
