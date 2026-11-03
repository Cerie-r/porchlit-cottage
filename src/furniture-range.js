import {bedroomCorner} from './bedroom-corner.js';
import {expand,footprint as partBox,STUD_SIZE,PLATE} from './brick-recipe.js';

// Where each piece of furniture may go, worked out from what it stands on
// instead of numbers picked piece by piece. A floor piece may go anywhere on its
// room's floor as long as its footprint, turned the way the piece is turned,
// stays on that floor. Positions are stored in each piece's own frame; this
// converts them to the room's frame, works there, and converts back, so the
// remote's arrows mean the same direction for every piece.

// Room floors in the room frame, as far as a footprint may reach: from the
// panelling on the left and back walls to the open front and right edges.
export const FLOORS = {
  // When only the living room is shown, its floor stops at x 1.04.
  living: {minX: -5.0, maxX: 1.04, minZ: -3.86, maxZ: 3.64},
  downstairs: {minX: -5.0, maxX: 5.06, minZ: -3.86, maxZ: 3.64},
  bedroom: {minX: -5.0, maxX: 5.06, minZ: -3.86, maxZ: 3.64},
  study: {minX: -5.0, maxX: 5.06, minZ: -3.86, maxZ: 3.64}
};

// How a stored position maps into the room.
const shift = (dx, dz) => ({
  toRoom: p => [p[0] + dx, p[2] + dz],
  fromRoom: (X, Z, p) => [X - dx, p[1], Z - dz],
  turn: 0
});
const LIVING = shift(-1, 1.6); // the living area's group
const KITCHEN = shift(1.05, -1); // the kitchen's group
const ROOM = shift(0, 0); // the dining set
// Upstairs pieces and the little accents store an offset from their own spot.
const at = (x, z) => shift(x, z);
// The study's desk, shelf and reading chair sit in a group at x -1.2, z -.6
// turned a quarter, so their offsets run along the room's other axis.
const studyTurned = (x, z) => ({
  toRoom: p => [-1.2 + z + p[2], -.6 - x - p[0]],
  fromRoom: (X, Z, p) => [-(Z + .6) - x, p[1], X + 1.2 - z],
  turn: Math.PI / 2
});

// Footprint: w along the piece's own x, d along its own z, turned by a0 inside
// its model, centred cx, cz off its stored point. Ovals are measured as ovals.
// Rugs are flat and may tuck halfway under a wall.
const piece = (zone, frame, w, d, more = {}) => ({zone, frame, w, d, a0: 0, cx: 0, cz: 0, oval: false, flat: false, ...more});
const kitchen = (w, d) => piece('downstairs', KITCHEN, w, d);
const dining = (w, d) => piece('downstairs', ROOM, w, d);
const bedroom = (spot, w, d, more) => piece('bedroom', at(spot[0], spot[spot.length - 1]), w, d, more);
const study = (frame, w, d, more) => piece('study', frame, w, d, more);
const quarter = Math.PI / 2;

export const floorPieces = {
  rug: piece('living', LIVING, 5.04, 3.56, {oval: true, flat: true}),
  sofa: piece('living', LIVING, 2.6, .95),
  coffeeTable: piece('living', LIVING, 2.55, 1.18),
  armchair: piece('living', LIVING, 1.1, .85),
  tvUnit: piece('living', LIVING, 2.16, .85),
  lamp: piece('living', LIVING, .55, .55),
  floorPlant: piece('living', LIVING, .8, .8),
  gramophone: piece('living', LIVING, .6, .44),
  livingBasket: piece('living', at(-4.42, 1.9), .8, .5),

  sinkRun: kitchen(4.32, .82),
  stove: kitchen(.85, .85),
  cornerCabinet: kitchen(.85, .85),
  prepCabinet: kitchen(.85, .85),
  refrigerator: kitchen(1.2, 1.1),
  island: kitchen(2.25, .9),
  stoolLeft: kitchen(.55, .55),
  stoolRight: kitchen(.55, .55),
  diningTable: dining(1.5, 1.05),
  diningChair1: dining(.5, .5),
  diningChair2: dining(.5, .5),
  diningChair3: dining(.5, .5),

  bedroomBed: bedroom([-3.15, -.9], 2.9, 2.1, {a0: quarter}),
  bedroomWardrobe: bedroom([3.65, -3.1], 2, 1),
  // The vanity's stool stands in front of it and moves with it.
  bedroomVanity: bedroom([1.4, -3.1], 1.9, 1.85, {cz: .49}),
  bedroomChair: bedroom([1.35, 1.5], 1.1, 1, {a0: .22}),
  bedroomBench: bedroom([-.55, -.9], 1.9, .8, {a0: quarter}),
  bedroomSideTable: bedroom(bedroomCorner.table, .88, .88),
  bedroomKeepsake: bedroom(bedroomCorner.keepsake, .91, .65),
  bedroomNightstand: bedroom([-4.45, .95], .9, .8, {a0: quarter}),
  bedroomRug: bedroom([-2.65, -.65], 3.76, 2.51, {a0: quarter, flat: true}),
  bedroomSlippers: bedroom([-2.85, .5], .5, .45),

  studyDesk: study(studyTurned(-1.75, -2.7), 2.7, 1.1),
  studyShelf: study(studyTurned(-3.85, -2.7), 1.2, .6),
  studyReading: study(studyTurned(-3.65, -1.1), 1.1, 1),
  studyPrinter: study(at(-1.05, -2.85), 1.4, 1),
  studyCraft: study(at(2, -2.85), 3.3, 1.2),
  // The sewing table at the back, the dress form's stand in front of it (src/tailor-corner.jsx).
  studyTailor: study(at(4.42, -3.05), .98, 1.4),
  studyRug: study(at(.1, .75), 3.76, 2.51, {flat: true})
};

// Things that hang on a wall slide along it, the way the downstairs pictures
// do. Bounds are on the stored position: along the wall first, then height.
// px, py: what to subtract to get from the room to the stored position;
// hw: half the width along the wall; y: where its anchor point may be.
const WALL = {x: [-5.0, 5.06], z: [-3.86, 3.64]};
const backWall = (px, py, hw, [y0, y1]) => ({placement: 'backWall', bounds: [WALL.x[0] + hw - px, WALL.x[1] - hw - px, y0 - py, y1 - py]});
const leftWall = (pz, py, hw, [y0, y1]) => ({placement: 'sideWall', bounds: [WALL.z[0] + hw - pz, WALL.z[1] - hw - pz, y0 - py, y1 - py]});
const framed = (h) => [1.3 + h / 2, 3.3 - h / 2];
export const wallPieces = {
  kitchenRail: backWall(.3, 1.9, .65, [1.86, 3.2]),
  // Kitchen frame, absolute height (the cabinet's underside).
  upperLeft: backWall(1.05, 0, .4, [1.3, 2.45]),
  upperRight: backWall(1.05, 0, .4, [1.3, 2.45]),
  bedroomShelf: leftWall(-1, 2.15, .9, [1.0, 3.1]),
  bedroomFrame: backWall(.2, 2.3, .3, framed(.85)),
  studyFrame1: backWall(-1.9, 2.75, .22, framed(.62)),
  studyFrame2: backWall(-1.05, 2.87, .275, framed(.77)),
  studyPinboard: backWall(.25, 2.3, .55, framed(.76))
};

// Little things that sit on another piece keep their place on it, in its own
// frame, so they go wherever it goes. They move a few centimetres at a time and
// stay on its top. on: the piece under them; bounds: on the stored position,
// along that piece's x, then its z.
const resting = (on, bounds) => ({placement: 'surface', step: .05, on, bounds});
// The three boxes up on the craft table's top shelf, which is 3.3 long.
const craftShelf = x => resting('studyCraft', [-1.49 - x, 1.49 - x, -.13, .03]);
export const restingPieces = {
  coffeeTray: resting('coffeeTable', [-.65, .65, -.08, .08]),
  coffeeMug: resting('coffeeTray', [-.28, .28, -.13, .13]),
  greenBook: resting('coffeeTable', [-.85, .85, -.2, .2]),
  roseBook: resting('coffeeTable', [-.85, .85, -.2, .2]),
  bedroomFigure: resting('bedroomVanity', [-.75, .75, -.15, .3]),
  studyBox0: resting('studyCraft', [-.1, .1, -.04, .04]),
  studyBox1: resting('studyCraft', [-.1, .1, -.04, .04]),
  studyBox2: resting('studyCraft', [-.1, .1, -.04, .04]),
  studyBox3: resting('studyCraft', [-.1, .1, -.04, .04]),
  studyBox4: craftShelf(-1.25),
  studyBox5: craftShelf(-.85),
  studyBox6: craftShelf(-.45),
  studyComputer: resting('studyDesk', [-.7, .55, -.25, .08]),
  studyPrintPreview: resting('studyPrinter', [-.12, .3, -.1, .05])
};

const close = (a, b) => Math.abs(a - b) < 1e-6;
const round = v => Math.round(v * 100) / 100;
// Clamp to [lo, hi] on the centimetre grid positions are kept on, rounding the
// limits inward so a piece pushed to an edge never ends up a hair past it.
const clamp = (v, lo, hi) => Math.min(Math.floor(hi * 100 + 1e-6) / 100, Math.max(Math.ceil(lo * 100 - 1e-6) / 100, round(v)));

// Every rule below takes a piece's id, or the piece itself (a build standing on
// the floor has no id in floorPieces; see builtPiece).
const specOf = p => typeof p === 'string' ? floorPieces[p] : p;

// Half the room-axis extents of a piece turned by rotationY, and where the
// footprint's centre sits from the stored point.
export function extent(p, rotationY = 0) {
  const s = specOf(p);
  const t = s.a0 + s.frame.turn + rotationY, c = Math.cos(t), n = Math.sin(t);
  const hw = s.w / 2, hd = s.d / 2, k = s.flat ? .5 : 1;
  const hx = s.oval ? Math.hypot(hw * c, hd * n) : Math.abs(hw * c) + Math.abs(hd * n);
  const hz = s.oval ? Math.hypot(hw * n, hd * c) : Math.abs(hw * n) + Math.abs(hd * c);
  return {hx: hx * k, hz: hz * k, ox: s.cx * c + s.cz * n, oz: -s.cx * n + s.cz * c};
}

// Where the stored point may be, in the room frame. A piece may always go back
// to its own default spot when it is turned the default way, even where its
// footprint brushes a wall there.
export function rangeFor(p, rotationY = 0, home) {
  const s = specOf(p), f = FLOORS[s.zone], e = extent(s, rotationY);
  const r = {minX: f.minX + e.hx - e.ox, maxX: f.maxX - e.hx - e.ox, minZ: f.minZ + e.hz - e.oz, maxZ: f.maxZ - e.hz - e.oz};
  if (home) {
    const h = extent(s, home.rotationY || 0);
    if (close(h.hx, e.hx) && close(h.hz, e.hz) && close(h.ox, e.ox) && close(h.oz, e.oz)) {
      const [X, Z] = s.frame.toRoom(home.position);
      r.minX = Math.min(r.minX, X); r.maxX = Math.max(r.maxX, X);
      r.minZ = Math.min(r.minZ, Z); r.maxZ = Math.max(r.maxZ, Z);
    }
  }
  return r;
}

export const roomPoint = (p, item) => specOf(p).frame.toRoom(item.position);
const store = (p, item, X, Z) => specOf(p).frame.fromRoom(X, Z, item.position).map(round);

// The remote: move by dX, dZ in the room. A piece already standing outside its
// range (an older save) is never jerked back; it may come in, not go further out.
export function moveBy(p, item, dX, dZ, home) {
  if (!specOf(p)) return null;
  const [X, Z] = roomPoint(p, item), r = rangeFor(p, item.rotationY || 0, home);
  const nX = r.minX > r.maxX ? X : clamp(X + dX, Math.min(r.minX, X), Math.max(r.maxX, X));
  const nZ = r.minZ > r.maxZ ? Z : clamp(Z + dZ, Math.min(r.minZ, Z), Math.max(r.maxZ, Z));
  return {...item, position: store(p, item, nX, nZ)};
}

// Turning near a wall steps the piece in, the way a real one would have to.
export function turnBy(p, item, dTheta, home) {
  if (!specOf(p)) return null;
  const rotationY = (item.rotationY || 0) + dTheta, [X, Z] = roomPoint(p, item), r = rangeFor(p, rotationY, home);
  const nX = r.minX > r.maxX ? (r.minX + r.maxX) / 2 : clamp(X, r.minX, r.maxX);
  const nZ = r.minZ > r.maxZ ? (r.minZ + r.maxZ) / 2 : clamp(Z, r.minZ, r.maxZ);
  return {...item, rotationY, position: store(p, item, nX, nZ)};
}

// Footprints standing on each other. Pieces aren't stopped from overlapping
// (being stopped is what kept the floor lamp stuck); overlaps are only shown.
// The footprint as an oriented rectangle in the room: centre, axes, half sizes.
function box(p, item) {
  const s = specOf(p), t = s.a0 + s.frame.turn + (item.rotationY || 0), c = Math.cos(t), n = Math.sin(t);
  const [X, Z] = s.frame.toRoom(item.position);
  return {center: [X + s.cx * c + s.cz * n, Z - s.cx * n + s.cz * c], axes: [[c, -n], [n, c]], half: [s.w / 2, s.d / 2]};
}
// How far two footprints run into each other (negative: how far apart).
export function overlapDepth(a, aItem, b, bItem) {
  const A = box(a, aItem), B = box(b, bItem);
  let depth = Infinity;
  for (const [x, z] of [...A.axes, ...B.axes]) {
    const span = r => {
      const c = r.center[0] * x + r.center[1] * z;
      const e = r.axes.reduce((sum, [ax, az], i) => sum + r.half[i] * Math.abs(ax * x + az * z), 0);
      return [c - e, c + e];
    };
    const [a0, a1] = span(A), [b0, b1] = span(B);
    depth = Math.min(depth, Math.min(a1, b1) - Math.max(a0, b0));
  }
  return depth;
}
const family = p => specOf(p).zone === 'living' ? 'downstairs' : specOf(p).zone;
// The pieces this one now stands on, leaving out rugs, and pairs that already
// overlap in the house as it comes (chairs tucked under the table, the basket
// against the TV cabinet): those are meant to sit like that. built: the builds
// standing on this floor, as {id, spec, item} (see builtPiece); they count too.
export function overlapsFor(id, furniture, defaults = {}, shown = () => true, depth = .08, built = []) {
  const s = floorPieces[id], item = furniture[id];
  if (!s || s.flat || !item) return [];
  const fixed = Object.keys(floorPieces).filter(other => {
    if (other === id || floorPieces[other].flat || family(other) !== family(id) || !furniture[other] || !shown(other)) return false;
    if (overlapDepth(id, item, other, furniture[other]) <= depth) return false;
    const a = defaults[id], b = defaults[other];
    return !(a && b && overlapDepth(id, a, other, b) > depth);
  });
  return [...fixed, ...built.filter(b => family(b.spec) === family(id) && overlapDepth(id, item, b.spec, b.item) > depth).map(b => b.id)];
}
// The same for a build standing on the floor: the furniture and the other
// builds it stands on.
export function builtOverlaps(entry, furniture, shown = () => true, built = [], depth = .08) {
  const fixed = Object.keys(floorPieces).filter(other => !floorPieces[other].flat && family(other) === family(entry.spec) && furniture[other] && shown(other) && overlapDepth(entry.spec, entry.item, other, furniture[other]) > depth);
  return [...fixed, ...built.filter(b => b.id !== entry.id && family(b.spec) === family(entry.spec) && overlapDepth(entry.spec, entry.item, b.spec, b.item) > depth).map(b => b.id)];
}

// Send a piece to a point on the floor; null when it doesn't fit in that room.
export function placeAt(p, item, X, Z, home) {
  if (!specOf(p)) return null;
  const r = rangeFor(p, item.rotationY || 0, home);
  if (r.minX > r.maxX || r.minZ > r.maxZ) return null;
  return {...item, position: store(p, item, clamp(X, r.minX, r.maxX), clamp(Z, r.minZ, r.maxZ))};
}

// Which way a piece's own frame is turned in the room: its own turn, on top of
// whatever it stands on.
export function turnOf(id, furniture) {
  const own = furniture[id]?.rotationY || 0;
  if (restingPieces[id]) return turnOf(restingPieces[id].on, furniture) + own;
  return (floorPieces[id]?.frame.turn || 0) + own;
}

// The remote on a little thing: dX, dZ are the room's directions, whichever way
// the piece under it is turned. Like floor pieces, one already past its bounds
// may come back in but not go further out.
export function moveResting(id, item, dX, dZ, furniture) {
  const s = restingPieces[id];
  if (!s) return null;
  const t = turnOf(s.on, furniture), c = Math.cos(t), n = Math.sin(t), [x, y, z] = item.position, [x0, x1, z0, z1] = s.bounds;
  const nx = x + dX * c - dZ * n, nz = z + dX * n + dZ * c;
  return {...item, position: [clamp(nx, Math.min(x0, x), Math.max(x1, x)), y, clamp(nz, Math.min(z0, z), Math.max(z1, z))]};
}

// Things made at home are drawn at this scale once they are out of the backpack.
export const PLACED_SCALE = .12;
// A placed build's size in the room, from its recipe: w along its own x, d along
// its own z, h tall. It is drawn centred on its stored point.
export function buildSize(item) {
  const parts = item?.kind === 'build' ? expand(item) : [];
  if (!parts.length) return null;
  const boxes = parts.map(partBox), stud = (STUD_SIZE[item.scale] || STUD_SIZE.small) * PLACED_SCALE;
  const span = (lo, hi) => (Math.max(...boxes.map(hi)) - Math.min(...boxes.map(lo))) * stud;
  return {w: span(b => b.x, b => b.x + b.w), d: span(b => b.z, b => b.z + b.d), h: Math.max(...boxes.map(b => b.y + b.h)) * PLATE * stud};
}

// Below this a placed thing stands on the floor (or on a rug).
export const FLOOR_LEVEL = .2;
// A furniture-sized build standing on the floor follows the same rules as the
// furniture: a footprint from its recipe, kept inside its room's floor, shown
// in red where it stands on something, and walked round. It stands straight in
// the room (zone: 'downstairs', 'study' or 'bedroom'), stored where it is drawn.
export function builtPiece(item, zone) {
  if (item?.kind !== 'build' || item.scale !== 'furniture' || item.location !== 'room' || item.support || item.wall || !(item.position?.[1] < FLOOR_LEVEL) || !FLOORS[zone]) return null;
  const size = buildSize(item);
  return size && piece(zone, shift(0, 0), size.w, size.d);
}
// Which floor pieces a view draws: downstairs, the living room and the kitchen
// each hide the other (room is 'overview', 'living' or 'kitchen' there).
export const shownIn = (floor, room) => id => floor !== '1F' || (floorPieces[id]?.zone === 'living' ? room !== 'kitchen' : room !== 'living');
// The builds standing on one floor (or one room upstairs), ready for the rules.
export function builtPieces(creations, floor, room) {
  const zone = floor === '1F' ? 'downstairs' : room;
  return (creations || []).filter(i => i.location === 'room' && i.floor === floor && (floor === '1F' || (i.room || 'study') === room)).flatMap(i => {const spec = builtPiece(i, zone); return spec ? [{id: 'creation:' + i.id, spec, item: i}] : [];});
}

// Builds can hang on the back or the left wall, their back against it, facing
// the room: they slide along the wall and up and down it like the pictures.
// The point given is where the middle of the build goes; it is kept on the
// wall, clear of the skirting and the cornice. null when it is too big.
export const HANGING = {minY: .2, maxY: 3.4};
const WALLS = {
  back: {at: FLOORS.downstairs.minZ, range: [FLOORS.downstairs.minX, FLOORS.downstairs.maxX], turn: 0},
  left: {at: FLOORS.downstairs.minX, range: [FLOORS.downstairs.minZ, FLOORS.downstairs.maxZ], turn: Math.PI / 2}
};
export function hangOn(wall, size, [X, Y, Z]) {
  const w = WALLS[wall];
  if (!w || !size) return null;
  const [lo, hi] = w.range;
  if (hi - lo < size.w || HANGING.maxY - HANGING.minY < size.h) return null;
  const along = clamp(wall === 'back' ? X : Z, lo + size.w / 2, hi - size.w / 2), y = clamp(Y - size.h / 2, HANGING.minY, HANGING.maxY - size.h), out = round(w.at + size.d / 2);
  return {position: wall === 'back' ? [along, y, out] : [out, y, along], rotationY: w.turn, wall};
}
// The remote on a hanging build: right and left along the wall as it is seen,
// up and down the wall.
export function nudgeHung(item, size, dX, dZ) {
  const [x, y, z] = item.position, mid = y + size.h / 2 - dZ;
  return hangOn(item.wall, size, item.wall === 'back' ? [x + dX, mid, z] : [x, mid, z - dX]);
}

