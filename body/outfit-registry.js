import {publicOutfits} from './outfit-pieces.js';
// Outfits that are not part of body/outfits.js register here: the public ones (body/outfit-pieces.js,
// registered below) and a home's own pieces in src/ours/ (not part of the public release). An entry is
// {id, name, wearers: ['girl'|'boy'], build() -> THREE.Group, picture?, drawing?, colorways?}:
// build() makes the garment in the body's own coordinates, like the outfits in
// body/outfits.js; picture is the wardrobe card's photograph, drawing its SVG fallback.
// colorways, when an outfit comes in more than one, is [{id, name, colors: {main, accent, trim}}],
// the first being the colours it is built in. homeOnly, for something worn only at home, names the
// outfit that shows instead outside it (someone visiting, the street map): see publicLook() in
// wardrobe-state.js. outOn, 'YYYY-MM-DD', is the day it comes out in the wardrobe, for something kept
// back until then (see wardrobe-day.js). A public one comes out of the capsule machine and has to be
// drawn (body/drawn.js), unless it is a gift (gift: true), which every home has; pool names the
// festival whose limited pool it is kept for ('halloween', 'christmas'; src/capsule-catalog.js).
export const extraOutfits = [];

// The fit to the body of outfits that come later (a home's own, src/ours-pack.js), built apart from the public
// fit (public/models/outfits-fit.json, scripts/build-outfits.mjs): put in with it wherever that is applied.
const laterFit = {};
export const registerOutfitFit = (data = {}) => Object.assign(laterFit, data);
export const outfitFitWith = fit => ({...fit, ...laterFit});

export function registerOutfits(list = []) {
  for (const outfit of list) if (outfit?.id && typeof outfit.build === 'function' && !extraOutfits.some(o => o.id === outfit.id)) extraOutfits.push(outfit);
  return extraOutfits;
}

// Outfits sewn at home on the tailor's bench (src/tailor-state.js keeps them with the home). Each is one of the
// outfits above, its pattern, in colours of its own, for one resident: {id, pattern, wearer: 'girl'|'boy',
// colors: {main, accent, trim}, name, trims?}, trims being its lace and pearl buttons ({lace?, pearls?}, put on by
// body/trims.js). None is built on its own: whatever draws one builds its pattern, paints it and trims it (builtAs).
// One whose pattern isn't here yet (a home's own come later, src/ours-load.js) is kept, and offered once its pattern
// has come.
const sewn = new Map();
export function setSewnOutfits(list = []) {
  sewn.clear();
  for (const s of Array.isArray(list) ? list : []) if (typeof s?.id === 'string' && typeof s.pattern === 'string' && (s.wearer === 'girl' || s.wearer === 'boy') && s.colors && !sewn.has(s.id)) sewn.set(s.id, s);
  return [...sewn.values()];
}
// The one on the tailor's bench while someone stands up in it to see (src/tailor.jsx): worn like one sewn, but not
// one of them, and kept apart from them.
let trying = null;
export const setSewnPreview = entry => { trying = typeof entry?.id === 'string' && typeof entry.pattern === 'string' && entry.colors ? entry : null; };
export const sewnOutfit = id => (trying && trying.id === id ? trying : sewn.get(id) || null);
export const sewnOutfits = () => [...sewn.values()];
const baseFor = kind => kind === 'boy' ? 'coat' : 'dress';
const patternHere = (kind, id) => id === baseFor(kind) || extraOutfits.some(o => o.id === id && o.wearers?.includes(kind));

// Which outfits a resident may wear: the base one first, those sewn for them last.
export const outfitsFor = kind => [baseFor(kind), ...extraOutfits.filter(o => o.wearers?.includes(kind)).map(o => o.id), ...[...sewn.values(), ...(trying ? [trying] : [])].filter(s => s.wearer === kind && patternHere(kind, s.pattern)).map(s => s.id)];

// What an outfit is built as: itself, or for one sewn at home, its pattern in the colours sewn, with its trims.
export function builtAs(id) {
  const s = sewnOutfit(id);
  return s ? {id: s.pattern, colors: s.colors, ...(s.trims ? {trims: s.trims} : {})} : {id, colors: null};
}

// An outfit's colourways (none for the ones that come in a single colour).
export const colorwaysOf = id => extraOutfits.find(o => o.id === id)?.colorways || [];

// Paint a built outfit: every material named after a colour area takes that colour.
export function paintOutfit(group, colors) {
  if (colors) group.traverse(m => { if (m.isMesh && colors[m.material?.name]) m.material.color.set(colors[m.material.name]); });
}

// The public ones come first. A home's own outfits are everything else registered.
registerOutfits(publicOutfits);
const publicIds = new Set(publicOutfits.map(o => o.id));
export const isHomeOutfit = id => extraOutfits.some(o => o.id === id) && !publicIds.has(id);
