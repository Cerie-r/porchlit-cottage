// What a home has drawn from the capsule machine on its street (src/capsules.js keeps it with the
// home, each as "id:colourway"). Of the public pieces, outfits and hairstyles (accessory-pieces.js,
// outfit-pieces.js, hair-pieces.js) the wardrobe offers only the drawn ones, and each only in the
// colourways drawn; the base ones (her bow, his beret, the dress and the coat, the two hairstyles
// each starts with) and a home's own pieces are always there, and so is a public gift (gift: true;
// from the day it comes out, see wardrobe-day.js), and anything public a home's own pack says the
// home has (registerOwn). A festival's own (pool: ...) is drawn like the rest, from that festival's
// pool (src/capsule-catalog.js). One that comes in a single colour (every hairstyle) is drawn as
// "id:base".
import {publicAccessories} from './accessory-pieces.js';
import {publicOutfits} from './outfit-pieces.js';
import {publicHairs} from './hair-pieces.js';
import {PIECE_SLOTS} from './accessory-registry.js';

const all = [...publicAccessories, ...publicOutfits, ...publicHairs].filter(x => !x.gift);
const byId = new Map(all.map(x => [x.id, x]));
const waysOf = x => x?.colorways?.length ? x.colorways.map(w => w.id) : ['base'];
const known = new Set(all.flatMap(x => waysOf(x).map(w => `${x.id}:${w}`)));

// Whether a piece, outfit or hairstyle comes out of the capsule machine (and so has to be drawn first).
export const fromCapsules = id => byId.has(id);

// What of the machine's a home has without drawing it, in every colourway: its own pack says which
// (src/ours-pack.js), as it comes in.
const own = new Set();
export function registerOwn(ids = []) {
  for (const id of Array.isArray(ids) ? ids : []) if (byId.has(id)) own.add(id);
}

// Whatever was passed or saved, as the set of drawn keys this page knows.
export function cleanDrawn(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return new Set([r.pieces, r.outfits, r.hairs].flatMap(list => Array.isArray(list) ? list : []).filter(k => typeof k === 'string' && known.has(k)));
}
// The home's own record, from where the house keeps it (for the wardrobe opened on its own).
export function readDrawn() {
  try { return cleanDrawn(JSON.parse(localStorage.getItem('porchlit-home-layout-v1'))?.capsules); } catch { return new Set(); }
}

// Whether something may be chosen at all, and in which of its colourways ([{id, ...}]).
const had = (drawn, id, way) => own.has(id) || drawn.has(`${id}:${way}`);
export const offered = (drawn, id) => !byId.has(id) || waysOf(byId.get(id)).some(w => had(drawn, id, w));
export const drawnWays = (drawn, id, ways) => byId.has(id) ? ways.filter(w => had(drawn, id, w.id)) : ways;
const firstWay = (drawn, id) => waysOf(byId.get(id)).find(w => w !== 'base' && had(drawn, id, w));

// A wardrobe (as cleanWardrobe gives it) wearing only what has been drawn: anything not drawn is
// taken off (the outfit, the headwear and the hairstyle go back to the base ones), and whatever is
// worn from the machine is in a colourway drawn, written down, so the house paints it the same.
export function wearOnlyDrawn(wardrobe, drawn) {
  const out = {...wardrobe};
  for (const kind of ['girl', 'boy']) {
    if (!wardrobe?.[kind]) continue;
    const d = {...wardrobe[kind]}, ok = id => offered(drawn, id);
    if (!ok(d.outfit)) d.outfit = kind === 'boy' ? 'coat' : 'dress';
    if (!ok(d.accessory)) d.accessory = kind === 'girl' ? 'bow' : 'none';
    if (d.hair && !ok(d.hair)) delete d.hair;
    for (const slot of PIECE_SLOTS) if (d[slot] && !ok(d[slot])) delete d[slot];
    const ways = (map, worn) => {
      const m = {...(map || {})};
      for (const id of Object.keys(m)) if (byId.has(id) && !drawn.has(`${id}:${m[id]}`)) { const w = firstWay(drawn, id); if (w) m[id] = w; else delete m[id]; }
      for (const id of worn) if (byId.has(id) && !m[id]) { const w = firstWay(drawn, id); if (w) m[id] = w; }
      return Object.keys(m).length ? m : null;
    };
    const outfitWays = ways(d.colorways, [d.outfit]);
    if (outfitWays) d.colorways = outfitWays; else delete d.colorways;
    const pieceWays = ways(d.accessoryWays, [d.accessory, ...PIECE_SLOTS.map(s => d[s])].filter(Boolean));
    if (pieceWays) d.accessoryWays = pieceWays; else delete d.accessoryWays;
    out[kind] = d;
  }
  return out;
}
