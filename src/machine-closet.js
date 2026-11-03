// What the wardrobe has for each of the two today, and what each has on, as an AI living here is told it
// (src/machine-acts.js, dress; the shape is cleanCloset's there): the same choices the wardrobe offers her
// (body/app.js): what comes out of the capsule machine (a hairstyle too) only once drawn and in the colourways drawn,
// what comes out on a day of its own only from that day (anything on already stays offered), what was sewn at home,
// and the home's own pieces. The page works it out and sends it to the server whenever it changes (src/main.jsx).
import {outfitsFor, colorwaysOf, extraOutfits, sewnOutfit, sewnOutfits} from '../body/outfit-registry.js';
import {wardrobeKey} from '../body/wardrobe-state.js';
import {hairsFor, hairById, wornHair} from '../body/hair-registry.js';
import {headwearFor, piecesFor, accessoryById, PIECE_SLOTS} from '../body/accessory-registry.js';
import {offered, drawnWays} from '../body/drawn.js';
import {isOut} from '../body/wardrobe-day.js';

// The ones that are always there, named as the wardrobe names them (body/index.html).
const BASE = {dress: '奶油长裙', coat: '炭灰外套', bow: '缎带蝴蝶结', beret: '斜戴贝雷帽'};
// Names as short as the AI is told them (src/machine-acts.js keeps at most 24 characters).
const short = s => [...String(s)].slice(0, 24).join('');
const nameOf = id => short(BASE[id] || sewnOutfit(id)?.name || extraOutfits.find(o => o.id === id)?.name || accessoryById(id)?.name || hairById(id)?.name || id);

// What she has on as the wardrobe keeps it, before any cleaning (fallback: the house's own copy).
export function storedWardrobe(fallback) {
  try {
    const raw = JSON.parse(localStorage.getItem(wardrobeKey));
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  } catch {}
  return fallback && typeof fallback === 'object' ? fallback : null;
}
// Whether this page knows everything the two of them have on. While the home's own things haven't come, the wardrobe
// as cleaned here has lost them: nothing may be written over it then.
export function wardrobeKnown(raw) {
  if (!raw || typeof raw !== 'object') return true;
  const ok = (v, list) => v === undefined || v === null || list.includes(v);
  return ['girl', 'boy'].every(kind => {
    const r = raw[kind];
    if (!r || typeof r !== 'object') return true;
    return ok(r.outfit, outfitsFor(kind)) && ok(r.hair, hairsFor(kind)) && (r.accessory === 'none' || ok(r.accessory, headwearFor(kind))) && PIECE_SLOTS.every(s => ok(r[s], piecesFor(kind, s)));
  });
}

// wardrobe: as readWardrobe gives it; drawn: the set of drawn keys (body/drawn.js, cleanDrawn); day: the home's today.
export function closetOf({wardrobe, drawn, day}) {
  const out = {her: wardrobe.playerKind === 'boy' ? 'boy' : 'girl', wearing: {}};
  for (const kind of ['girl', 'boy']) {
    const d = wardrobe[kind] || {};
    const kept = new Set([d.outfit, d.accessory, ...PIECE_SLOTS.map(s => d[s])].filter(Boolean));
    const now = id => kept.has(id) || isOut(extraOutfits.find(o => o.id === id) || accessoryById(id), day);
    const pick = ids => ids.filter(id => offered(drawn, id) && now(id)).map(id => ({id, name: nameOf(id)}));
    // Not what's on the tailor's form being tried (src/tailor.jsx): only what was sewn.
    const trying = id => !!sewnOutfit(id) && !sewnOutfits().some(o => o.id === id);
    const outfit = pick(outfitsFor(kind).filter(id => !trying(id))).map(o => {
      const ways = sewnOutfit(o.id) ? [] : drawnWays(drawn, o.id, colorwaysOf(o.id)).map(w => ({id: w.id, name: w.name || w.id}));
      return ways.length ? {...o, ways} : o;
    });
    const k = {outfit, hair: hairsFor(kind).filter(id => offered(drawn, id)).map(id => ({id, name: nameOf(id)})), head: pick(headwearFor(kind))};
    for (const slot of PIECE_SLOTS) k[slot] = pick(piecesFor(kind, slot));
    out[kind] = k;
    const way = d.colorways?.[d.outfit] ?? outfit.find(o => o.id === d.outfit)?.ways?.[0]?.id;
    out.wearing[kind] = {outfit: d.outfit, ...(way ? {way} : {}), hair: wornHair(kind, d), head: d.accessory || 'none', ...Object.fromEntries(PIECE_SLOTS.filter(s => d[s]).map(s => [s, d[s]]))};
  }
  return out;
}
