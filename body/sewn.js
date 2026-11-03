// The tailor's bench, the wardrobe's side of it: which outfits may be sewn, and a sewn one as a garment.
// What a home has sewn is kept with the home (src/tailor-state.js) and registered in outfit-registry.js
// (setSewnOutfits), so that it is worn, kept and shown like any other outfit.
import {extraOutfits, outfitsFor, sewnOutfit, paintOutfit, isHomeOutfit} from './outfit-registry.js';
import {addTrims} from './trims.js';
import {fromCapsules} from './drawn.js';
import {dayOf, isOut} from './wardrobe-day.js';

const BASE = {girl: 'dress', boy: 'coat'};
const BASE_NAMES = {dress: '奶油长裙', coat: '炭灰外套'};

// What may be sewn for a resident: what doesn't come out of the capsule machine (that stays as it was drawn, in
// the colourways drawn): the base outfit, a gift every home has (from the day it comes out) and a home's own.
export function sewablePatterns(kind, day = dayOf()) {
  return outfitsFor(kind).filter(id => !sewnOutfit(id) && !fromCapsules(id) && (id === BASE[kind] || isOut(extraOutfits.find(o => o.id === id), day)));
}
export const patternName = id => BASE_NAMES[id] || extraOutfits.find(o => o.id === id)?.name || '';
// The wardrobe card's photograph of a pattern: a public one's is in public/wardrobe/, a home's own carries its own.
export function patternPicture(id) {
  if (BASE_NAMES[id]) return `/wardrobe/outfit-${id}.webp`;
  const entry = extraOutfits.find(o => o.id === id);
  if (!entry) return null;
  return isHomeOutfit(id) ? entry.picture || null : `/wardrobe/outfit-${id}.webp`;
}
// The colours a built garment is in, as its three colour areas (null: it has none).
export function colorsOf(group) {
  const out = {};
  group?.traverse(m => { const name = m.material?.name; if (m.isMesh && ['main', 'accent', 'trim'].includes(name) && !out[name]) out[name] = '#' + m.material.color.getHexString(); });
  return out.main ? {main: out.main, accent: out.accent || out.main, trim: out.trim || out.main} : null;
}

// A sewn outfit as a garment: its pattern's garment, built and fitted already, sharing its shape (geometry) but in
// materials of its own, painted the colours sewn, and trimmed (lace and pearl buttons, body/trims.js). Dispose of it
// with disposeSewn (its materials, and the trims' own shapes).
export function sewnGarment(pattern, colors, trims = null) {
  const g = pattern.clone(true), own = new Map();
  g.traverse(m => {
    if (!m.isMesh) return;
    const k = m.material;
    if (!own.has(k)) own.set(k, k.clone());
    m.material = own.get(k);
  });
  paintOutfit(g, colors);
  addTrims(g, trims);
  g.visible = true;
  return g;
}
export function disposeSewn(g) {
  const materials = new Set();
  g?.traverse(m => { if (!m.isMesh) return; materials.add(m.material); if (m.userData.trim) m.geometry.dispose(); });
  materials.forEach(m => m.dispose());
}
