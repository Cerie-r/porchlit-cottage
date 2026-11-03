// Where things stand on the community map. Pure: no drawing here, so it can
// be tested (tests/street-layout.test.mjs).
//
// A street is one block of 64 lots: four rows of sixteen houses, every house
// facing south onto the lane in front of its row, so from the map's view the
// doors and their lights all face you. A cross street runs down each end of
// the block. Streets sit side by side in a spiral out from the first one
// (server/streets.mjs numbers them); past the last one there are fields.

export const LOTS = 64;
export const COLS = 16;
export const ROWS = 4;
export const LOT_W = 1.55;               // width of one lot, west to east
export const ROW_D = 2.9;                // one row: the house, its front garden and the lane
export const CROSS = 1.2;                // the cross street down each end of a block
export const PARK = 1.6;                 // trees along the south of a block, before the next
export const BLOCK_W = COLS * LOT_W + 2 * CROSS;
export const BLOCK_D = ROWS * ROW_D + PARK;
export const HOUSE = {w: .9, d: .78, h: .66};   // a home on the map: body size before the roof
// The little plaza in the middle of the trees along the south of each street,
// about four lots wide: where the street's machines stand under an awning.
export const PLAZA = {w: 6.2, d: 1.36, z: BLOCK_D / 2 - PARK / 2};
// Each street's machines come in one of four colours, after its seed.
export const MACHINE_COLORS = [['草莓牛奶', '#f2b8c8'], ['薄荷', '#b9e2d1'], ['丁香', '#cfc1ee'], ['黄油', '#f3dc98']];
export const plazaLook = seed => {const [name, color] = MACHINE_COLORS[Math.abs(Math.trunc(Number(seed) || 0)) % 4]; return {name, color};};

// A small, steady random from a seed, so a street always grows the same
// trees and flowers.
export function seeded(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The n-th street's place in the spiral: 1 is [0, 0]; then round it ring by
// ring, starting east and going round anticlockwise as seen from above.
export function streetCell(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error('streets count from 1');
  if (n === 1) return [0, 0];
  const k = n - 1;
  const ring = Math.ceil((Math.sqrt(k + 1) - 1) / 2);   // which ring around the first street
  const before = (2 * ring - 1) ** 2;                   // cells inside this ring
  const i = k - before;                                 // 0 .. 8 * ring - 1 along the ring
  const side = Math.floor(i / (2 * ring)), along = i % (2 * ring);
  // Start just north of the east corner and walk the ring.
  if (side === 0) return [ring, -ring + 1 + along];
  if (side === 1) return [ring - 1 - along, ring];
  if (side === 2) return [-ring, ring - 1 - along];
  return [-ring + 1 + along, -ring];
}

// The street at a spiral cell (the inverse of streetCell).
export function streetAtCell(cx, cz) {
  const ring = Math.max(Math.abs(cx), Math.abs(cz));
  if (ring === 0) return 1;
  const before = (2 * ring - 1) ** 2;
  let i;
  if (cx === ring && cz > -ring) i = cz - (-ring + 1);
  else if (cz === ring) i = 2 * ring + (ring - 1 - cx);
  else if (cx === -ring) i = 4 * ring + (ring - 1 - cz);
  else i = 6 * ring + (cx - (-ring + 1));
  return before + i + 1;
}

// The middle of the n-th street's block on the ground.
export function streetOrigin(n) {
  const [cx, cz] = streetCell(n);
  return [cx * BLOCK_W, cz * BLOCK_D];
}

// A lot on its street: which row and column, and where its house stands
// (relative to the street's middle). The door faces +z.
export function lotPlace(lot) {
  if (!Number.isInteger(lot) || lot < 0 || lot >= LOTS) throw new Error('no such lot');
  const row = Math.floor(lot / COLS), col = lot % COLS;
  const x = -BLOCK_W / 2 + CROSS + (col + .5) * LOT_W;
  const z = -BLOCK_D / 2 + row * ROW_D + .8;
  return {row, col, x, z};
}

// The lane in front of a row, as a strip from west to east.
export const laneZ = row => -BLOCK_D / 2 + row * ROW_D + 2.15;

// What grows on an empty lot, and the small differences between homes on
// one street: the same seed always gives the same street.
const GARDENS = ['flowers', 'flowers', 'tree', 'bench', 'patch', 'hedge', 'pond', 'blossom'];
export function streetLook(seed) {
  const r = seeded(seed);
  const lots = Array.from({length: LOTS}, () => ({
    garden: GARDENS[Math.floor(r() * GARDENS.length)],
    flowers: Array.from({length: 5}, () => [r() - .5, r() - .5, Math.floor(r() * 4)]),
    turn: (r() - .5) * .12,
    nudge: (r() - .5) * .12
  }));
  // Street lamps along each lane, and trees in the park strip along the south.
  const lamps = [];
  for (let row = 0; row < ROWS; row++) for (let c = 2; c < COLS; c += 4) lamps.push([-BLOCK_W / 2 + CROSS + c * LOT_W, laneZ(row) + .5]);
  const trees = [];
  for (let x = -BLOCK_W / 2 + .9; x < BLOCK_W / 2 - .6; x += 1.1 + r() * .7) trees.push([x, BLOCK_D / 2 - PARK / 2 + (r() - .5) * .5, .75 + r() * .5, r() < .22]);
  // The plaza keeps the middle of the strip clear; the other trees stand where they always did.
  return {lots, lamps, trees: trees.filter(([x]) => Math.abs(x) > PLAZA.w / 2 + .35)};
}

// The light at a door, as the map and the door show it.
export const PORCH_LOOK = {
  on: {lamp: 1, windows: 1, glow: 1, visit: true, label: '灯亮着'},
  dim: {lamp: .45, windows: 0, glow: .45, visit: true, label: '留了一盏小灯'},
  dnd: {lamp: .18, windows: .25, glow: 0, visit: false, label: '请勿打扰'},
  off: {lamp: 0, windows: 0, glow: 0, visit: false, label: '熄灯落锁'}
};
export const porchLook = porch => PORCH_LOOK[porch] || PORCH_LOOK.off;

// The streets worth drawing around a point on the ground: the cells within
// `reach` blocks, as street numbers that exist (1 .. count).
export function streetsAround(x, z, count, reach = 1) {
  const cx = Math.round(x / BLOCK_W), cz = Math.round(z / BLOCK_D), out = [];
  for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) {
    const n = streetAtCell(cx + dx, cz + dz);
    if (n <= count) out.push(n);
  }
  return out.sort((a, b) => a - b);
}
