// The castle shell, from the same small bricks as the cottage: a keep with a
// crow-stepped roof, a gatehouse with the front door, two round towers in
// front and a taller one behind, all crenellated, and wisteria twining over
// everything. It stands on the same plot; the left side of the lot stays open for a
// garden. Writes public/models/porchlit-castle.glb.
//
// `node scripts/build-castle-model.mjs rose` builds the rose castle from the
// same plan instead: slimmer, taller towers under pink spires, a rose-tiled
// roof, and roses wherever the wisteria climbs. Writes
// public/models/porchlit-castle-rose.glb.
import * as THREE from "three";
import { createKit, writeGlb, LAWN, UP, eulerOf } from "./brick-kit.mjs";

// What tells the two castles apart: what flowers, how slim and tall the
// towers and their spires are, the tiles on the spires and on the keep's roof
// (each a colour and the paler one now and then among them), the flags, and
// how thickly the climbers flower and how big a rose is (roses are fewer
// florets than wisteria, so the rose castle has more and bigger ones), and
// the yard: the cottage's borders and the old wisteria tree, or rose borders,
// no tree, and roses over all the open lawn.
const LOOKS = {
  wisteria: {
    file: "porchlit-castle.glb", name: "PorchlitCastle", bloom: "wisteria",
    towerR: .7, towerTop: 5.0, spire: 1.9, backR: .6, backTop: 5.75, backSpire: 1.3,
    spireTiles: ["roof", "roofPale"], roofTiles: ["roof", "roofPale"], flags: ["lavender", "rose", "rose"],
    flowering: 1, roseSize: 1, beds: "cottage", tree: "wisteria", roseField: false
  },
  rose: {
    file: "porchlit-castle-rose.glb", name: "PorchlitRoseCastle", bloom: "rose",
    towerR: .62, towerTop: 5.2, spire: 2.3, backR: .54, backTop: 6.0, backSpire: 1.7,
    spireTiles: ["rose", "blush"], roofTiles: ["roseDeep", "rose"], flags: ["rose", "rose", "rose"],
    flowering: 1.8, roseSize: 1.3, beds: "roses", tree: null, roseField: true
  }
};
const LOOK = LOOKS[process.argv[2]] || LOOKS.wisteria;

// The same colours as the cottage; the page recolours both by material name.
const colors = {
  cream: "#eee2d8", plaster: "#f7eee7", ivory: "#fff7ee", pearl: "#f8ece5",
  blush: "#e5cfd0", rose: "#c98aa5", roseDeep: "#9b607b", lavender: "#b896d0", lavenderDeep: "#76558f",
  roof: "#292630", roofPale: "#45404c", sage: "#507359", sageLight: "#769073", amber: "#f5cf79",
  stone: "#d8cbc0", lawn: "#c7d3ba", wood: "#7d6963", metal: "#28252d", gold: "#d7aa58", glass: "#dce9ea",
  room: "#f4d6b4", lilac: "#dccdea", hedge: "#8aa486", leafLight: "#a9bea2"
};

const kit = createKit(1018);
const { rand, between, box, cylinder, stud, piece, floret, localBox, stem, raceme, windowAt } = kit;
const TAU = Math.PI * 2;
// The smallest turn from angle b to angle a.
const turnFrom = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------- Measurements ----------
// The keep: side walls at x = ±KX, front at KF, back at KB, walls up to EAVE.
const KX = 2.5, KF = 1.45, KB = -1.75, EAVE = 4.35;
// The gatehouse in front of the keep: x from -GX to GX, front at GF.
const GX = 1.0, GF = 2.2, GTOP = 4.75;
// Round towers. Angles go from +z (the front) towards +x.
const TOWER_R = LOOK.towerR, TOWER_TOP = LOOK.towerTop;
const frontTowers = [[-2.5, 1.55], [2.5, 1.55]];
const BACK = [-1.25, -1.75], BACK_R = LOOK.backR, BACK_TOP = LOOK.backTop;
// The roof sits inside a walkway behind the parapets.
const ROOF_FRONT = KF - .3, ROOF_BACK = KB + .3, ROOF_END = KX - .3;
const ROOF_EAVE = EAVE + .07, ROOF_HALF = (ROOF_FRONT - ROOF_BACK) / 2, RIDGE_Z = (ROOF_FRONT + ROOF_BACK) / 2;
const RIDGE = ROOF_EAVE + ROOF_HALF;
// The front door: a threshold, then an arch.
const DOOR_FLOOR = .29, DOOR_W = 1.1, DOOR_SPRING = 1.72;
// The two porch lanterns either side of the door.
const LANTERNS = [-.88, .88];

// Mostly pearl with ivory and cream, and now and then a weathered stone.
const brickTone = () => { const t = rand(); return t < .03 ? "stone" : t < .11 ? "cream" : t < .29 ? "ivory" : "pearl"; };

// Inside the keep or the gatehouse, where bricks would never be seen.
const insideKeep = (x, z) => (Math.abs(x) < KX - .02 && z > KB + .02 && z < KF - .02)
  || (Math.abs(x) < GX - .02 && z > KF - .05 && z < GF - .02);
const insideTower = (x, z) => frontTowers.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < TOWER_R - .02)
  || Math.hypot(x - BACK[0], z - BACK[1]) < BACK_R - .02;

// ---------- Brick skins ----------

// One course from a0 to a1: whole bricks, starting with a half brick on odd
// courses and finishing with a cut one, so every wall ends cleanly.
function course(a0, a1, odd, place) {
  let a = a0;
  if (odd) { place(a + .021, .039); a += .042; }
  while (a1 - a >= .084 - 1e-6) { place(a + .042, .081); a += .084; }
  if (a1 - a > .02) place((a + a1) / 2, a1 - a - .003);
}

// Where a point on a flat face is: `face` is front (+z), back (-z), right (+x)
// or left (-x), `plane` the face's position, `a` the distance along it.
function onFace(face, plane, a, y, out) {
  if (face === "front") return [a, y, plane + out];
  if (face === "back") return [a, y, plane - out];
  if (face === "right") return [plane + out, y, a];
  return [plane - out, y, a];
}
const sizeOn = (face, along, high, deep) => face === "front" || face === "back" ? [along, high, deep] : [deep, high, along];

// Micro-bricks over a flat face, `skip(a, y)` leaving holes for windows and doors.
function brickFace(face, plane, a0, a1, y0, y1, skip = () => false) {
  const rows = Math.floor((y1 - y0) / .08 + .001);
  for (let row = 0; row < rows; row += 1) {
    const y = y0 + .04 + row * .08;
    course(a0, a1, row % 2, (a, w) => {
      const p = onFace(face, plane, a, y, .045);
      if (skip(a, y) || insideTower(p[0], p[2])) return;
      box(brickTone(), p, sizeOn(face, w, .077, .052), [0, 0, 0], .004);
    });
  }
}

// Micro-bricks round a tower, each turned to face out.
function brickRing(cx, cz, r, y0, y1, skip = () => false) {
  const n = Math.round(TAU * r / .084), step = TAU / n;
  const rr = r + .026, w = 2 * rr * Math.sin(step / 2) - .004;
  const rows = Math.floor((y1 - y0) / .08 + .001);
  for (let row = 0; row < rows; row += 1) {
    const y = y0 + .04 + row * .08;
    for (let i = 0; i < n; i += 1) {
      const a = (i + (row % 2 ? .5 : 0)) * step;
      const x = cx + Math.sin(a) * rr, z = cz + Math.cos(a) * rr;
      if (skip(a, y) || insideKeep(x, z)) continue;
      box(brickTone(), [x, y, z], [w, .077, .052], [0, a, 0], .004);
    }
  }
}

// A hole the shape of an arched window or door, centred at `c` along the face.
const archHole = (c, middle, width, height, margin = .09) => (a, y) => {
  const r = width / 2, spring = middle + height / 2 - r, dx = a - c;
  if (y < middle - height / 2 - .07 || Math.abs(dx) > r + margin) return false;
  return y < spring || Math.hypot(dx, y - spring) < r + margin;
};
// The same on a tower: `angle` is the way the window faces.
const ringHole = (r, angle, middle, width, height) => {
  const hole = archHole(0, middle, width, height);
  return (a, y) => hole(turnFrom(a, angle) * r, y);
};
const anyOf = (...holes) => (a, y) => holes.some((hole) => hole(a, y));

// A stone plinth: two courses of bigger blocks at the foot of a wall.
function plinthFace(face, plane, a0, a1) {
  for (let row = 0; row < 2; row += 1) {
    let a = a0 + (row ? -.08 : 0);
    while (a < a1 - .03) {
      const length = Math.min(.17, a1 - a), middle = Math.max(a0, a) + (Math.min(a1, a + length) - Math.max(a0, a)) / 2;
      const w = Math.min(a1, a + length) - Math.max(a0, a) - .006;
      const p = onFace(face, plane, middle, LAWN + .06 + row * .12, .055);
      if (w > .03 && !insideTower(p[0], p[2])) box(rand() < .7 ? "stone" : "pearl", p, sizeOn(face, w, .115, .08), [0, 0, 0], .006);
      a += length;
    }
  }
}
function plinthRing(cx, cz, r) {
  for (let row = 0; row < 2; row += 1) {
    const n = Math.round(TAU * r / .17), step = TAU / n, rr = r + .035;
    for (let i = 0; i < n; i += 1) {
      const a = (i + (row ? .5 : 0)) * step, x = cx + Math.sin(a) * rr, z = cz + Math.cos(a) * rr;
      if (insideKeep(x, z)) continue;
      box(rand() < .7 ? "stone" : "pearl", [x, LAWN + .06 + row * .12, z], [2 * rr * Math.sin(step / 2) - .006, .115, .08], [0, a, 0], .006);
    }
  }
}

// An ivory band running along a face (a string course or a lip), with optional
// little corbels underneath, every `every` along.
function band(face, plane, a0, a1, y, { out = .07, high = .07, deep = .1, corbels = 0, every = .16 } = {}) {
  box("ivory", onFace(face, plane, (a0 + a1) / 2, y, out), sizeOn(face, a1 - a0, high, deep), [0, 0, 0], .01);
  if (!corbels) return;
  for (let a = a0 + every / 2; a < a1 - .03; a += every) {
    const p = onFace(face, plane, a, y - high / 2 - corbels / 2, out - .02);
    if (!insideTower(p[0], p[2])) box("ivory", p, sizeOn(face, .07, corbels, deep - .03), [0, 0, 0], .008);
  }
}
function bandRing(cx, cz, r, y, { out = .07, high = .07, corbels = 0 } = {}) {
  const n = Math.round(TAU * r / .12), step = TAU / n, rr = r + out;
  for (let i = 0; i < n; i += 1) {
    const a = i * step, x = cx + Math.sin(a) * rr, z = cz + Math.cos(a) * rr;
    if (insideKeep(x, z)) continue;
    box("ivory", [x, y, z], [2 * rr * Math.sin(step / 2) + .004, high, .1], [0, a, 0], .008);
    if (corbels && i % 2 === 0) box("ivory", [cx + Math.sin(a) * (rr - .02), y - high / 2 - corbels / 2, cz + Math.cos(a) * (rr - .02)], [.07, corbels, .07], [0, a, 0], .008);
  }
}

// A merlon: three courses, a cap and a stud on top.
function merlon(position, along, turn, high = .28) {
  const [x, y, z] = position;
  for (let i = 0; i < 3; i += 1) localBox(brickTone(), [x, y, z], [0, high / 6 + i * high / 3, 0], [along, high / 3 - .006, .15], turn, .006);
  localBox("ivory", [x, y, z], [0, high + .018, 0], [along + .04, .036, .18], turn, .008);
  stud("pearl", [x, y + high + .05, z], .036, .026, [0, 0, 0]);
}

// A crenellated parapet on a straight wall top at height y: corbels and a lip,
// a low wall of bricks, and merlons along it. `turn` is the face's turn.
function parapet(face, plane, a0, a1, y) {
  band(face, plane, a0, a1, y - .04, { out: .085, high: .08, deep: .14, corbels: .13 });
  for (let row = 0; row < 2; row += 1) {
    course(a0, a1, row % 2, (a, w) => {
      const p = onFace(face, plane, a, y + .04 + row * .08, .03);
      if (!insideTower(p[0], p[2])) box(brickTone(), p, sizeOn(face, w, .077, .15), [0, 0, 0], .005);
    });
  }
  const turn = { front: 0, back: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 }[face];
  const count = Math.max(2, Math.round((a1 - a0) / .34));
  for (let i = 0; i < count; i += 1) {
    const a = a0 + (a1 - a0) * (i + .5) / count, p = onFace(face, plane, a, y + .16, .03);
    if (!insideTower(p[0], p[2])) merlon(p, .19, turn);
  }
}
// The same round a tower top.
function parapetRing(cx, cz, r, y, merlons) {
  bandRing(cx, cz, r, y - .04, { out: .1, high: .08, corbels: .13 });
  const n = Math.round(TAU * r / .084), step = TAU / n, rr = r + .03;
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < n; i += 1) {
      const a = (i + (row ? .5 : 0)) * step;
      box(brickTone(), [cx + Math.sin(a) * rr, y + .04 + row * .08, cz + Math.cos(a) * rr], [2 * rr * Math.sin(step / 2) - .004, .077, .15], [0, a, 0], .005);
    }
  }
  for (let i = 0; i < merlons; i += 1) {
    const a = (i + .5) * TAU / merlons;
    merlon([cx + Math.sin(a) * rr, y + .16, cz + Math.cos(a) * rr], .2, a);
  }
}

// ---------- Roofs ----------

// A witch-hat roof of overlapping tiles round a tower, with a gold finial.
function coneRoof(cx, cz, y0, rBase, height) {
  // A stepped core under the tiles, so no gap ever shows the sky.
  for (let i = 0; i < 9; i += 1) {
    const t = (i + .5) / 9;
    cylinder(LOOK.spireTiles[0], [cx, y0 + height * t, cz], rBase * (1 - t) + .01, height / 9 + .01);
  }
  const slant = Math.hypot(rBase, height), tilt = Math.PI / 2 - Math.atan2(height, rBase);
  const rows = Math.floor(slant / .07);
  for (let row = 0; row < rows; row += 1) {
    const t = (.035 + row * .07) / slant, rho = rBase * (1 - t) + .014;
    const n = Math.max(5, Math.round(TAU * rho / .084)), step = TAU / n, shift = rand() * step;
    const w = 2 * rho * Math.sin(step / 2) + .006;
    for (let i = 0; i < n; i += 1) {
      const a = i * step + shift;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0))
        .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
      box(rand() < .15 ? LOOK.spireTiles[1] : LOOK.spireTiles[0], [cx + Math.sin(a) * rho, y0 + height * t, cz + Math.cos(a) * rho], [w, .029, .09], eulerOf(q), .006);
    }
  }
  const top = y0 + height;
  cylinder("gold", [cx, top + .02, cz], .055, .06);
  cylinder("gold", [cx, top + .09, cz], .04, .08);
  cylinder("gold", [cx, top + .16, cz], .05, .05);
  return top + .18;
}

// A thin pole with a little flag on it, blowing toward +x.
function pennant(x, y, z, colour = "rose") {
  box("metal", [x, y + .3, z], [.024, .6, .024], [0, 0, 0], .006);
  stud("gold", [x, y + .62, z], .03, .04, [0, 0, 0]);
  for (let i = 0; i < 6; i += 1) {
    const h = .2 * (1 - i / 6) + .02;
    piece(i % 2 ? colour : colour + "Deep", [x + .045 + i * .055, y + .5 - i * .012, z + Math.sin(i * 1.4) * .018], [.056, h, .012], [0, Math.sin(i * 1.4) * .25, 0]);
  }
}

// The keep's roof: two tiled slopes with a ridge along x.
function keepRoof() {
  const length = 2 * ROOF_END;
  for (const side of [1, -1]) {
    const eaveZ = side > 0 ? ROOF_FRONT : ROOF_BACK;
    const tilt = side * Math.PI / 4, normal = [0, Math.SQRT1_2, side * Math.SQRT1_2];
    const span = ROOF_HALF * Math.SQRT2;
    // The shell, its outer face on the roof line.
    const mid = [0, (ROOF_EAVE + RIDGE) / 2 - .15 * normal[1], (eaveZ + RIDGE_Z) / 2 - .15 * normal[2]];
    box(LOOK.roofTiles[0], mid, [length + .1, .3, span + .12], [tilt, 0, 0], .04);
    for (let column = 0; column * .084 < length + .04; column += 1) {
      const x = -ROOF_END - .02 + column * .084;
      for (let row = 0; (row + 1) * .084 < span + .06; row += 1) {
        const d = .042 + row * .084 + (column % 2 ? .02 : -.02);
        const y = ROOF_EAVE + d / Math.SQRT2, z = eaveZ - side * d / Math.SQRT2;
        const tile = rand() < .15 ? LOOK.roofTiles[1] : LOOK.roofTiles[0];
        box(tile, [x, y + .02 * normal[1], z + .02 * normal[2]], [.081, .029, .081], [tilt, 0, 0], .006);
        if (rand() < .08) stud(tile, [x, y + .04 * normal[1], z + .04 * normal[2]], .025, .016, [tilt, 0, 0]);
      }
    }
  }
  box(LOOK.roofTiles[0], [0, RIDGE + .06, RIDGE_Z], [length + .2, .16, .22], [0, 0, 0], .025);
  for (let x = -ROOF_END + .35; x < ROOF_END - .2; x += .55) stud("gold", [x, RIDGE + .16, RIDGE_Z], .04, .05, [0, 0, 0]);
}

// A crow-stepped gable closing one end of the keep's roof (side ±1).
function steppedGable(side) {
  const steps = 4, rise = ROOF_HALF / steps, x = side * (ROOF_END + .1);
  for (let k = 0; k < steps; k += 1) {
    const y0 = ROOF_EAVE - .05 + k * rise, y1 = y0 + rise + (k === steps - 1 ? .12 : 0);
    const half = ROOF_HALF - k * rise + .12;
    box("cream", [x, (y0 + y1) / 2, RIDGE_Z], [.2, y1 - y0, 2 * half], [0, 0, 0], .01);
    brickFace("right", x + .1, RIDGE_Z - half, RIDGE_Z + half, y0, y1);
    brickFace("left", x - .1, RIDGE_Z - half, RIDGE_Z + half, y0, y1);
    for (const end of [-1, 1]) box("ivory", [x, y1 + .02, RIDGE_Z + end * (half - .11)], [.28, .045, .24], [0, 0, 0], .008);
  }
  const top = ROOF_EAVE - .05 + steps * rise + .12;
  box("ivory", [x, top + .1, RIDGE_Z], [.24, .16, .24], [0, 0, 0], .01);
  stud("gold", [x, top + .2, RIDGE_Z], .05, .05, [0, 0, 0]);
}

// ---------- Small parts ----------

// A narrow arrow slit with a pale surround, on a face turned by `turn`.
function slit(base, turn) {
  localBox("metal", base, [0, 0, .01], [.055, .34, .06], turn, .004);
  for (const x of [-.06, .06]) localBox("ivory", base, [x, 0, .04], [.055, .44, .07], turn, .006);
  for (const y of [-.22, .22]) localBox("ivory", base, [0, y, .045], [.19, .055, .08], turn, .006);
}

// Quoins: alternating long and short corner stones up a corner.
function quoins(x, z, top, sx, sz) {
  for (let i = 0, y = LAWN + .3; y < top - .1; i += 1, y += .26) {
    const long = i % 2 === 0;
    box(long ? "ivory" : "pearl", [x + sx * .02, y, z + sz * .02], [long ? .24 : .17, .13, long ? .17 : .24], [0, 0, 0], .014);
  }
}

// ---------- The keep ----------

kit.plot();
box("cream", [0, (LAWN + EAVE) / 2, (KF + KB) / 2], [2 * KX, EAVE - LAWN, KF - KB], [0, 0, 0], .06);
box("cream", [0, (LAWN + GTOP) / 2, (KF + GF) / 2 - .02], [2 * GX, GTOP - LAWN, GF - KF + .04], [0, 0, 0], .04);
for (const [x, z] of frontTowers) cylinder("cream", [x, (LAWN + TOWER_TOP) / 2, z], TOWER_R, TOWER_TOP - LAWN);
cylinder("cream", [BACK[0], (LAWN + BACK_TOP) / 2, BACK[1]], BACK_R, BACK_TOP - LAWN);

// Windows on the keep. Each is [along, height, full size?, look]; looks differ
// so no two windows repeat the same lamps and curtains.
const keepWindows = {
  right: [[-.45, 1.35, true, { curtain: "right", lamps: [[-.18, .02, .08, .12]] }],
    [-.45, 3.4, true, { curtain: "both", lamps: [[-.12, .1, .06, .1], [.14, -.12, .07, .12]] }]],
  left: [[-.45, 1.35, true, { curtain: "left", lamps: [[.2, .05, .08, .12]] }],
    [-.45, 3.4, true, { curtain: "drawn", lamps: [] }]],
  back: [[1.0, 1.35, true, { curtain: "right", lamps: [[-.2, -.04, .08, .13]] }],
    [1.0, 3.4, true, { curtain: "none", lamps: [[.18, -.08, .06, .1]] }]]
};
const narrow = { width: .36, height: .74, slices: 5 };
const holesFor = (list) => anyOf(...list.map(([c, y, full]) => archHole(c, y, full ? .82 : .66, full ? 1.02 : .72)));

// Front: the short runs between the gatehouse and the towers.
for (const side of [-1, 1]) {
  const [a0, a1] = side < 0 ? [-1.95, -GX] : [GX, 1.95];
  const c = side * 1.4;
  plinthFace("front", KF, a0, a1);
  brickFace("front", KF, a0, a1, LAWN + .24, EAVE, anyOf(archHole(c, 3.35, narrow.width, narrow.height), (a, y) => Math.abs(a - c) < .1 && Math.abs(y - 1.35) < .24));
  windowAt([c, 3.35, KF + .075], 0, false, side < 0 ? { curtain: "right", lamps: [[0, -.05, .05, .09]] } : { curtain: "none", lamps: [[-.1, .06, .05, .08]] }, narrow);
  slit([c, 1.35, KF + .07], 0);
  band("front", KF, a0, a1, 2.45);
  parapet("front", KF, a0, a1, EAVE);
}
// Sides and back.
for (const [face, plane, a0, a1] of [["right", KX, KB, 1.0], ["left", -KX, KB, 1.0], ["back", KB, -KX, KX]]) {
  const windows = keepWindows[face];
  plinthFace(face, plane, a0, a1);
  brickFace(face, plane, a0, a1, LAWN + .24, EAVE, holesFor(windows));
  const turn = { right: Math.PI / 2, left: -Math.PI / 2, back: Math.PI }[face];
  for (const [c, y, full, look] of windows) windowAt(onFace(face, plane, c, y, .075), turn, !full, look);
  band(face, plane, a0, a1, 2.45);
  parapet(face, plane, a0, a1, EAVE);
}
quoins(KX, KB, EAVE, 1, -1);
quoins(-KX, KB, EAVE, -1, -1);

// The walkway behind the parapets, then the roof and its stepped gables.
for (const [x0, x1, z0, z1] of [[-KX + .05, KX - .05, KB + .06, ROOF_BACK], [-KX + .05, KX - .05, ROOF_FRONT, KF - .06], [-KX + .05, -ROOF_END, ROOF_BACK, ROOF_FRONT], [ROOF_END, KX - .05, ROOF_BACK, ROOF_FRONT]]) {
  for (let x = x0; x < x1 - .02; x += .3) {
    for (let z = z0; z < z1 - .02; z += .3) {
      const w = Math.min(.3, x1 - x), d = Math.min(.3, z1 - z), cx = x + w / 2, cz = z + d / 2;
      if (insideTower(cx, cz)) continue;
      box(rand() < .6 ? "pearl" : "stone", [cx, EAVE + .02, cz], [w - .02, .04, d - .02], [0, 0, 0], .008);
      if (rand() < .3) stud("pearl", [cx, EAVE + .05, cz], .035, .02, [0, 0, 0]);
    }
  }
}
keepRoof();
steppedGable(1);
steppedGable(-1);

// ---------- The gatehouse and the front door ----------

const doorHole = archHole(0, (DOOR_FLOOR + DOOR_SPRING + DOOR_W / 2) / 2, DOOR_W, DOOR_SPRING + DOOR_W / 2 - DOOR_FLOOR, .13);
const balconyWindow = [0, 3.5];
plinthFace("front", GF, -GX, GX);
brickFace("front", GF, -GX, GX, LAWN + .24, GTOP, anyOf(doorHole, archHole(0, balconyWindow[1], .82, 1.02)));
for (const side of [-1, 1]) {
  const face = side < 0 ? "left" : "right";
  plinthFace(face, side * GX, KF, GF);
  brickFace(face, side * GX, KF, GF, LAWN + .24, GTOP, (a, y) => Math.abs(a - (KF + GF) / 2) < .1 && Math.abs(y - 3.4) < .24);
  slit(onFace(face, side * GX, (KF + GF) / 2, 3.4, .07), side * Math.PI / 2);
  parapet(face, side * GX, KF + .02, GF, GTOP);
  quoins(side * GX, GF, GTOP, side, 1);
}
parapet("front", GF, -GX, GX, GTOP);
for (let x = -GX + .2; x < GX - .1; x += .3) {
  for (let z = KF + .12; z < GF - .1; z += .3) box(rand() < .6 ? "pearl" : "stone", [x + .05, GTOP + .02, z + .05], [.28, .04, .28], [0, 0, 0], .008);
}

// Steps up to the door, widest at the bottom.
box("stone", [0, (LAWN + DOOR_FLOOR) / 2, GF + .2], [1.7, DOOR_FLOOR - LAWN, .4], [0, 0, 0], .02);
const stepTops = [.16, .04, -.08];
stepTops.forEach((top, i) => box("ivory", [0, (LAWN + top) / 2, GF + .51 + i * .22], [1.9 + i * .2, top - LAWN, .26], [0, 0, 0], .025));

// The door: a dark arch, two panelled leaves with iron studs and ring pulls,
// a warm fanlight above them, then jambs and a ring of arch stones.
const doorMiddle = (DOOR_FLOOR + DOOR_SPRING) / 2, doorHigh = DOOR_SPRING - DOOR_FLOOR, doorR = DOOR_W / 2;
box("metal", [0, doorMiddle + .03, GF - .02], [DOOR_W + .1, doorHigh + .06, .14], [0, 0, 0], .01);
for (const side of [-1, 1]) {
  const x = side * DOOR_W / 4;
  box("roseDeep", [x, doorMiddle, GF + .03], [DOOR_W / 2 - .025, doorHigh, .09], [0, 0, 0], .01, side < 0 ? "door" : null);
  for (const dx of [-.2, .2]) box("rose", [x + dx, doorMiddle, GF + .08], [.075, doorHigh - .04, .05], [0, 0, 0], .005);
  for (const y of [DOOR_FLOOR + .1, doorMiddle, DOOR_SPRING - .08]) box("rose", [x, y, GF + .08], [DOOR_W / 2 - .1, .075, .05], [0, 0, 0], .005);
  for (const y of [DOOR_FLOOR + .32, DOOR_FLOOR + .55, doorMiddle + .25, doorMiddle + .48]) {
    for (const dx of [-.1, .1]) stud("gold", [x + dx, y, GF + .1], .018, .02);
  }
  cylinder("gold", [side * .08, doorMiddle + .05, GF + .11], .05, .018, [Math.PI / 2, 0, 0]);
  cylinder("metal", [side * .08, doorMiddle + .05, GF + .115], .03, .02, [Math.PI / 2, 0, 0]);
}
box("metal", [0, doorMiddle, GF + .09], [.035, doorHigh, .05], [0, 0, 0], .004);
for (let i = 0; i < 11; i += 1) {
  const x = -doorR + (i + .5) * (DOOR_W / 11), cap = Math.sqrt(Math.max(0, doorR * doorR - x * x));
  box("metal", [x, DOOR_SPRING + cap / 2, GF - .02], [DOOR_W / 11 + .025, cap + .04, .14], [0, 0, 0], .003);
  box("glass", [x, DOOR_SPRING + cap / 2, GF + .07], [DOOR_W / 11 - .012, Math.max(.025, cap - .03), .045], [0, 0, 0], .002);
  const outer = Math.abs(x) + DOOR_W / 22, edge = Math.sqrt(Math.max(0, doorR * doorR - outer * outer));
  if (edge > .05) box("room", [x, DOOR_SPRING + .015 + (edge - .03) / 2, GF + .055], [DOOR_W / 11 + .002, edge - .03, .012], [0, 0, 0], .002);
}
box("amber", [0, DOOR_SPRING + .14, GF + .062], [.14, .14, .01], [0, 0, 0], .004);
box("metal", [0, DOOR_SPRING, GF + .11], [DOOR_W + .02, .045, .06], [0, 0, 0], .004);
for (let i = 1; i < 6; i += 1) {
  const angle = Math.PI * i / 6;
  kit.localDetailBox("metal", [0, DOOR_SPRING, GF], [Math.cos(angle) * doorR / 2, Math.sin(angle) * doorR / 2, .11], [.03, doorR, .045], 0, angle - Math.PI / 2, .003);
}
for (let i = 0; i < 13; i += 1) {
  const angle = Math.PI * i / 12;
  kit.localDetailBox("metal", [0, DOOR_SPRING, GF], [Math.cos(angle) * doorR, Math.sin(angle) * doorR, .11], [.11, .045, .06], 0, angle - Math.PI / 2, .003);
}
for (const side of [-1, 1]) box("ivory", [side * (doorR + .12), doorMiddle - .02, GF + .14], [.16, doorHigh + .02, .2], [0, 0, 0], .008);
for (let i = 0; i < 15; i += 1) {
  const angle = Math.PI * i / 14;
  const keystone = i === 7;
  kit.localDetailBox(keystone ? "rose" : "ivory", [0, DOOR_SPRING, GF], [Math.cos(angle) * (doorR + .14), Math.sin(angle) * (doorR + .14) + (keystone ? .03 : 0), .15], [keystone ? .15 : .14, keystone ? .19 : .11, keystone ? .22 : .2], 0, angle - Math.PI / 2, .006);
}

// Two lanterns either side of the door: the porch lights.
for (const x of LANTERNS) {
  box("metal", [x, 1.98, GF + .26], [.045, .3, .045], [0, 0, 0], .008);
  box("metal", [x, 2.1, GF + .16], [.045, .045, .2], [0, 0, 0], .006);
  // Named so the page can light them when someone is signed in.
  box("amber", [x, 1.62, GF + .26], [.2, .27, .16], [0, 0, 0], .025, "porch-lamp");
  box("metal", [x, 1.45, GF + .26], [.22, .05, .2], [0, 0, 0], .008);
  box("metal", [x, 1.79, GF + .26], [.22, .05, .2], [0, 0, 0], .008);
  stud("gold", [x, 1.84, GF + .26], .04, .04, [0, 0, 0]);
}

// The balcony over the door, on two brackets, with an iron railing.
box("stone", [0, 2.77, GF + .29], [1.5, .1, .56], [0, 0, 0], .02);
for (const x of [-.62, .62]) {
  box("ivory", [x, 2.58, GF + .16], [.13, .26, .3], [0, 0, 0], .01);
  box("ivory", [x, 2.47, GF + .1], [.13, .1, .18], [0, 0, 0], .008);
}
box("metal", [0, 3.42, GF + .53], [1.48, .055, .055], [0, 0, 0], .01);
for (let x = -.66; x <= .67; x += .165) box("metal", [x, 3.12, GF + .53], [.035, .6, .035], [0, 0, 0], .008);
for (const x of [-.73, .73]) {
  box("metal", [x, 3.42, GF + .29], [.055, .055, .5], [0, 0, 0], .01);
  for (let z = GF + .1; z < GF + .5; z += .165) box("metal", [x, 3.12, z], [.035, .6, .035], [0, 0, 0], .008);
}
windowAt([balconyWindow[0], balconyWindow[1], GF + .075], 0, false, { curtain: "both", lamps: [[.14, -.06, .06, .1]] });

// ---------- Towers ----------

// Front towers: a plinth, bricks, a string course, windows and slits, a ring of
// corbels under a witch-hat roof. Each faces its windows its own way.
const towerOpenings = [
  // [angle, height, kind, look]
  [[0, 3.35, "window", { curtain: "left", lamps: [[.12, -.04, .05, .09]] }], [.35, 1.3, "slit"], [-1.1, 2.4, "slit"]],
  [[.4, 3.35, "window", { curtain: "right", lamps: [[-.1, .05, .05, .09]] }], [-.5, 1.45, "slit"], [1.55, 2.25, "slit"]]
];
frontTowers.forEach(([cx, cz], index) => {
  const openings = towerOpenings[index];
  plinthRing(cx, cz, TOWER_R);
  brickRing(cx, cz, TOWER_R, LAWN + .24, TOWER_TOP, anyOf(...openings.map(([angle, y, kind]) =>
    kind === "window" ? ringHole(TOWER_R, angle, y, narrow.width, narrow.height)
      : (a, yy) => Math.abs(turnFrom(a, angle)) * TOWER_R < .1 && Math.abs(yy - y) < .24)));
  for (const [angle, y, kind, look] of openings) {
    const reach = kind === "window" ? TOWER_R - .1 : TOWER_R + .02;
    const base = [cx + Math.sin(angle) * reach, y, cz + Math.cos(angle) * reach];
    if (kind === "window") windowAt(base, angle, false, look, narrow);
    else slit(base, angle);
  }
  bandRing(cx, cz, TOWER_R, 2.45);
  bandRing(cx, cz, TOWER_R, TOWER_TOP - .05, { out: .09, high: .08, corbels: .14 });
  const top = coneRoof(cx, cz, TOWER_TOP, TOWER_R + .2, LOOK.spire);
  pennant(cx, top, cz, LOOK.flags[index]);
});

// The back tower is taller and keeps its parapet, with a smaller roof inside it.
const backOpenings = [[Math.PI, 2.6, "window", { curtain: "right", lamps: [[0, .04, .05, .09]] }], [-Math.PI / 2, 3.9, "window", { curtain: "left", lamps: [] }], [-2.2, 1.25, "slit"], [-.6, 5.0, "slit"], [.7, 5.0, "slit"]];
plinthRing(BACK[0], BACK[1], BACK_R);
brickRing(BACK[0], BACK[1], BACK_R, LAWN + .24, BACK_TOP, anyOf(...backOpenings.map(([angle, y, kind]) =>
  kind === "window" ? ringHole(BACK_R, angle, y, narrow.width, narrow.height)
    : (a, yy) => Math.abs(turnFrom(a, angle)) * BACK_R < .1 && Math.abs(yy - y) < .24)));
for (const [angle, y, kind, look] of backOpenings) {
  const reach = kind === "window" ? BACK_R - .1 : BACK_R + .02;
  const base = [BACK[0] + Math.sin(angle) * reach, y, BACK[1] + Math.cos(angle) * reach];
  if (kind === "window") windowAt(base, angle, false, look, narrow);
  else slit(base, angle);
}
bandRing(BACK[0], BACK[1], BACK_R, 2.45);
parapetRing(BACK[0], BACK[1], BACK_R, BACK_TOP, 8);
pennant(BACK[0], coneRoof(BACK[0], BACK[1], BACK_TOP + .05, BACK_R - .1, LOOK.backSpire), BACK[1], LOOK.flags[2]);

// ---------- Climbing flowers ----------
// Thin stems wander up the walls and round the towers, fork, step round the
// windows and the door, and flower more the higher they get; where they reach
// the top they spill over in a crown of blooms. Flowering mounds heap up at
// the foot of the walls, a garland arches over the door, and a few petals lie
// on the grass.
const BLOOM = LOOK.bloom; // "rose": roses open along the stems instead

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const X_AXIS = new THREE.Vector3(1, 0, 0);
// A turn that faces something outwards along `facing` (an angle from +z
// towards +x), tipped up by `tilt` and spun about that way by `spin`: discs
// (florets) and flat leaves both lie with their thin side along y.
function facingOut(facing, tilt = 0, spin = 0) {
  return eulerOf(new THREE.Quaternion().setFromAxisAngle(UP, facing)
    .multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.PI / 2 - tilt))
    .multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin)));
}
const outwards = (facing, tilt, d) => [Math.sin(facing) * Math.cos(tilt) * d, Math.sin(tilt) * d, Math.cos(facing) * Math.cos(tilt) * d];
const plus = (p, d) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];

// A rose: layered petals round a deeper heart, mostly pinks, now and then
// ivory; `tones` is the [petals, heart] pairs it picks from.
const roseTones = [["rose", "roseDeep"], ["rose", "roseDeep"], ["rose", "blush"], ["blush", "rose"], ["blush", "rose"], ["ivory", "blush"], ["roseDeep", "rose"]];
function rose(p, facing, size = 1, tilt = 0, tones = roseTones) {
  const [outer, heart] = tones[Math.floor(rand() * tones.length)];
  const t = tilt + between(-.35, .35), rotation = facingOut(facing, t, between(0, TAU));
  floret(outer, p, .046 * size, rotation, .026 * size);
  floret(outer, plus(p, outwards(facing, t, .013 * size)), .033 * size, rotation, .024 * size);
  floret(heart, plus(p, outwards(facing, t, .026 * size)), .017 * size, rotation, .018 * size);
}
const bud = (p, facing) => floret(rand() < .5 ? "roseDeep" : "rose", p, .02, facingOut(facing, between(-.4, .4)), .022);
// A raceme lighter than the tree's: about half the florets, a touch bigger,
// so a castle covered in them still loads quickly on a phone.
function lightRaceme(x, y, z, length) {
  const n = Math.max(4, Math.round(length / .034)), sway = between(0, TAU);
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1), r = .05 - t * .032 + between(-.003, .003);
    const colour = t < .26 ? "lavenderDeep" : t < .68 ? "lavender" : "lilac";
    const px = x + Math.sin(t * 2.4 + sway) * .016, py = y - t * length, pz = z + between(-.008, .008);
    floret(colour, [px, py, pz], r, [between(-.7, .7), 0, between(-.7, .7)]);
    if (t < .34 && rand() < .65) floret(colour, [px + between(-.03, .03), py - between(0, .016), pz + between(-.025, .025)], r * .8, [between(-.7, .7), 0, between(-.7, .7)]);
  }
}
// One bloom on a stem: a rose, or a raceme of wisteria hanging from it
// (longer where `cascade`, as where the stems spill over the top).
function bloom(p, facing, size = 1, tilt = 0, cascade = false) {
  if (BLOOM === "rose") rose(p, facing, size * LOOK.roseSize, tilt);
  else lightRaceme(p[0], p[1], p[2], (cascade ? .22 + .3 * rand() : .1 + .2 * rand()) * size);
}
const leafOn = (p, facing, scale = 1) => piece(kit.leafTone(), p,
  [between(.06, .09) * scale, .012, between(.03, .045) * scale], facingOut(facing, between(-.5, .5), between(0, TAU)));

// Where climbers can grow. at(u, y, out) is the point `out` in front of the
// surface at u along it and height y; facing(u) the way it faces there;
// free(u, y) whether a stem may pass (inside its edges, not over a window or
// a door); `scale` turns a step along the surface into a change of u; climbing
// stops at `top`, under the corbels.
const xzOf = ([x, , z]) => [x, z];
function flatSurface(face, plane, a0, a1, top, avoid = () => false) {
  const facing = { front: 0, right: Math.PI / 2, back: Math.PI, left: -Math.PI / 2 }[face];
  return {
    at: (u, y, out) => onFace(face, plane, u, y, out), facing: () => facing, scale: 1, top,
    free: (u, y) => u > a0 + .03 && u < a1 - .03 && !avoid(u, y) && !insideTower(...xzOf(onFace(face, plane, u, y, .09)))
  };
}
function ringSurface(cx, cz, r, top, avoid = () => false) {
  return {
    at: (u, y, out) => [cx + Math.sin(u) * (r + out), y, cz + Math.cos(u) * (r + out)], facing: (u) => u, scale: r + .09, top,
    free: (u, y) => !avoid(u, y) && !insideKeep(cx + Math.sin(u) * (r + .1), cz + Math.cos(u) * (r + .1))
  };
}
// Keeping clear of an arched window (with its jambs) or a slit.
const clearOfArch = (c, middle, width, height) => archHole(c, middle, width, height, .22);
const clearOfSlit = (c, y) => (a, yy) => Math.abs(a - c) < .17 && Math.abs(yy - y) < .32;
const onRing = (r, angle, clear) => (a, y) => clear(turnFrom(a, angle) * r, y);

// A stem climbing from (u0, y0): it leans its own way (drift) and wanders,
// steps round anything in its path, and now and then forks.
function climb(surface, u0, { y0 = LAWN + .04, vigor = 34, thick = .028, drift = 0, depth = 0, bloomy = 1 } = {}) {
  // Out over the plinth and the string course, close to the bricks elsewhere.
  const outAt = (y) => y < LAWN + .32 ? .125 : Math.abs(y - 2.45) < .08 ? .155 : .09;
  let u = u0, y = y0, dir = drift + between(-.25, .25), reached = false;
  const points = [surface.at(u, y, outAt(y))];
  for (let i = 0; i < vigor; i += 1) {
    dir = clamp(dir * .75 + drift * .25 + between(-.5, .5), -1.2, 1.2);
    const step = between(.085, .13);
    let moved = false, nu = u, ny = y;
    for (let tries = 0; tries < 5 && !moved; tries += 1) {
      const d = tries ? dir + (tries % 2 ? 1 : -1) * (.6 + .25 * tries) : dir;
      nu = u + Math.sin(d) * step / surface.scale;
      ny = y + Math.max(.025, Math.cos(d)) * step;
      if (surface.free(nu, ny)) { dir = d; moved = true; }
    }
    if (!moved) break;
    if (ny >= surface.top) { reached = true; break; }
    u = nu; y = ny;
    const facing = surface.facing(u), out = outAt(y);
    points.push(surface.at(u, y, out));
    const t = clamp((y - LAWN) / (surface.top - LAWN), 0, 1);
    for (let k = 0, n = 1 + Math.floor(rand() * 2.4); k < n; k += 1) leafOn(surface.at(u + between(-.05, .05) / surface.scale, y + between(-.04, .04), out + .012), facing);
    if (rand() < bloomy * LOOK.flowering * (.1 + .55 * t * t)) bloom(surface.at(u + between(-.04, .04) / surface.scale, y + between(-.03, .03), out + .02), facing, between(.8, 1.2));
    else if (rand() < .12) bud(surface.at(u, y, out + .015), facing);
    if (depth < 2 && i > 2 && rand() < (depth ? .06 : .14)) climb(surface, u, { y0: y, vigor: Math.floor(vigor * between(.3, .55)), thick: thick * .72, drift: dir + (rand() < .5 ? -.9 : .9), depth: depth + 1, bloomy });
  }
  if (points.length > 1) stem(points, thick, "wood");
  if (reached || y > surface.top - .35) crown(surface, u, Math.min(y, surface.top), bloomy);
}

// Where a climber reaches the top: a crown of blooms, leaves, and a few short
// strands hanging back down.
function crown(surface, u, y, bloomy = 1) {
  const facing = surface.facing(u);
  for (let i = 0, n = Math.round((4 + rand() * 4) * bloomy * LOOK.flowering); i < n; i += 1) {
    bloom(surface.at(u + between(-.15, .15) / surface.scale, y + between(-.12, .1), .11 + between(0, .04)), facing, between(.85, 1.3), between(-.2, .4), true);
  }
  for (let i = 0; i < 6; i += 1) leafOn(surface.at(u + between(-.17, .17) / surface.scale, y + between(-.14, .1), .1), facing, 1.1);
  for (let s = 0, strands = Math.floor(rand() * 3); s < strands; s += 1) {
    const su = u + between(-.12, .12) / surface.scale, length = between(.15, .4), hang = [];
    for (let k = 0; k <= 4; k += 1) hang.push(surface.at(su + Math.sin(k * 1.3) * .015 / surface.scale, y - length * k / 4, .13));
    stem(hang, .016, "wood");
    hang.slice(1).forEach((p) => leafOn(p, facing, .9));
    bloom(hang[4], facing, between(.7, 1));
  }
}

// A mound of flowers at the foot of a wall: with wisteria above, hydrangeas
// and lavender (the cottage's border plants); with roses, a rose bush, its
// roses picked from `tones`, its leaves `leafy` times as many.
function flowerMound(x, z, r, tones = roseTones, leafy = 1) {
  if (BLOOM !== "rose") {
    kit.hydrangea(x, LAWN, z, r * .78, ["lilac", "blush", "ivory", "lilac"][Math.floor(rand() * 4)]);
    for (let i = 0, n = 2 + Math.floor(rand() * 3); i < n; i += 1) {
      const a = between(0, TAU);
      if (rand() < .55) kit.lavenderClump(x + Math.cos(a) * r * .85, LAWN, z + Math.sin(a) * r * .85);
      else kit.hydrangea(x + Math.cos(a) * r * .8, LAWN, z + Math.sin(a) * r * .8, r * .5, rand() < .5 ? "blush" : "lilac");
    }
    kit.leaves(x, LAWN + .06, z, Math.round(r * 40), r, 1.25);
    return;
  }
  const h = r * between(.75, 1.05);
  for (let i = 0, n = Math.round(r * 150 * leafy); i < n; i += 1) {
    const a = between(0, TAU), k = Math.sqrt(rand()), lift = (1 - k * k) * h;
    piece(kit.leafTone(), [x + Math.cos(a) * k * r, LAWN + .02 + lift + between(-.02, .02), z + Math.sin(a) * k * r],
      [between(.06, .09), .014, between(.035, .05)], [between(-.9, .9), between(0, Math.PI), between(-.9, .9)]);
  }
  for (let i = 0, n = Math.round(r * 42); i < n; i += 1) {
    const a = between(0, TAU), k = Math.sqrt(rand()) * .92, lift = (1 - k * k) * h;
    rose([x + Math.cos(a) * k * r, LAWN + .05 + lift, z + Math.sin(a) * k * r], Math.atan2(Math.cos(a), Math.sin(a)), between(.85, 1.25), (1 - k) * 1.25 + .15, tones);
  }
}
// Petals fallen on the grass round a spot.
function petals(x, z, spread, count) {
  const tones = BLOOM === "rose" ? ["blush", "rose"] : ["lilac", "lavender"];
  for (let i = 0; i < count; i += 1) floret(tones[rand() < .6 ? 0 : 1], [x + between(-spread, spread), LAWN + .004, z + between(-spread, spread)], between(.012, .02), [between(-.3, .3), 0, between(-.3, .3)], .005);
}

kit.reseed(77);
// The front towers, each with its stems leaning both ways so they cross.
const towerClear = (openings, r) => anyOf(...openings.map(([angle, y, kind]) => onRing(r, angle,
  kind === "window" ? clearOfArch(0, y, narrow.width, narrow.height) : clearOfSlit(0, y))));
frontTowers.forEach(([cx, cz], index) => {
  const surface = ringSurface(cx, cz, TOWER_R, TOWER_TOP - .28, towerClear(towerOpenings[index], TOWER_R));
  // [where it starts, how much it flowers]: less round the sides seldom seen.
  const starts = index ? [[-.7, 1], [.05, 1], [.75, 1], [1.45, .85], [2.2, .55]] : [[-1.55, .6], [-.8, .9], [.05, 1], [.7, 1]];
  starts.forEach(([u, bloomy], k) => climb(surface, u + between(-.1, .1), { drift: (k % 2 ? -1 : 1) * between(.25, .4), vigor: 44, bloomy }));
});
{
  const surface = ringSurface(BACK[0], BACK[1], BACK_R, BACK_TOP - .28, towerClear(backOpenings, BACK_R));
  [2.4, -2.1].forEach((u, k) => climb(surface, u, { drift: k % 2 ? -.3 : .3, vigor: 46, bloomy: .55 }));
}
// The keep: in the corners by the gatehouse and the towers, and between the windows.
for (const side of [-1, 1]) {
  const [a0, a1] = side < 0 ? [-1.95, -GX] : [GX, 1.95], c = side * 1.4;
  const surface = flatSurface("front", KF, a0, a1, EAVE - .22, anyOf(clearOfArch(c, 3.35, narrow.width, narrow.height), clearOfSlit(c, 1.35)));
  climb(surface, side * 1.07, { drift: side * .1 });
  climb(surface, side * 1.74, { drift: -side * .15 });
}
const sideClear = (windows) => anyOf(...windows.map(([c, y, full]) => clearOfArch(c, y, full ? .82 : .66, full ? 1.02 : .72)));
for (const [face, plane, a0, a1, starts, bloomy] of [
  ["right", KX, KB, 1.0, [-1.5, -1.18, .38, .72], 1],
  ["left", -KX, KB, 1.0, [-1.45, .5], .65],
  ["back", KB, -KX, KX, [-.42, 2.32], .55]
]) {
  const surface = flatSurface(face, plane, a0, a1, EAVE - .22, sideClear(keepWindows[face]));
  starts.forEach((u, k) => climb(surface, u, { drift: (k % 2 ? -1 : 1) * .2, bloomy }));
}
// The gatehouse: up its sides, cresting at the front corners.
for (const side of [-1, 1]) {
  const surface = flatSurface(side < 0 ? "left" : "right", side * GX, KF, GF + .2, GTOP - .22, clearOfSlit((KF + GF) / 2, 3.4));
  climb(surface, GF - .12, { drift: .15, vigor: 44 });
  climb(surface, KF + .2, { drift: .3, vigor: 36, bloomy: .6 });
}
// A garland arching over the door, clear of the lanterns.
{
  const arch = [];
  for (let i = 0; i <= 18; i += 1) {
    const angle = .35 + (Math.PI - .7) * i / 18, r = .79 + Math.sin(i * 1.7) * .015;
    arch.push([Math.cos(angle) * r, DOOR_SPRING + Math.sin(angle) * r, GF + .29]);
  }
  stem(arch, .024, "wood");
  arch.forEach(([x, y, z], i) => {
    leafOn([x + between(-.03, .03), y + between(-.03, .03), z + .01], 0);
    if (i % 2 === 0 || rand() < .5) bloom([x + between(-.03, .03), y + between(-.02, .02), z + .02], 0, between(.7, 1.1), between(-.1, .3));
  });
  for (const end of [arch[0], arch[arch.length - 1]]) {
    const hang = [0, 1, 2, 3].map((k) => [end[0] + Math.sin(k) * .01, end[1] - .07 * k, end[2]]);
    stem(hang, .016, "wood");
    hang.slice(1).forEach((p) => leafOn(p, 0, .9));
    bloom(hang[3], 0, .9);
  }
}
// Roses spilling over the balcony's edge.
for (let x = -.68; x <= .68; x += between(.07, .12)) {
  leafOn([x, 2.8 + between(-.06, .02), GF + .58], 0, 1.1);
  if (rand() < .7) bloom([x + between(-.02, .02), 2.8 + between(-.04, .03), GF + .6], 0, between(.85, 1.2), between(0, .6));
}
for (const x of [-.7, -.25, .3, .68]) {
  const hang = [0, 1, 2, 3].map((k) => [x + Math.sin(k * 1.4) * .012, 2.78 - .075 * k, GF + .6]);
  stem(hang, .016, "wood");
  hang.slice(1).forEach((p) => leafOn(p, 0, .9));
  bloom(hang[3], 0, between(.8, 1));
}
// Mounds of flowers round the foot of the walls, and petals on the grass.
for (const [x, z, r] of [
  [-1.3, 2.62, .34], [1.3, 2.62, .34], [-1.42, 1.8, .3], [1.42, 1.8, .3],
  [-2.02, 2.3, .32], [2.02, 2.3, .32], [-2.6, 2.5, .26], [2.6, 2.5, .26], [-3.0, 2.12, .32], [3.0, 2.12, .32], [3.2, 1.35, .26],
  [2.78, -1.45, .28], [2.8, -.95, .22], [2.8, .25, .26], [2.78, .68, .2],
  [-2.78, -1.3, .26], [-2.8, .45, .24],
  [-.3, -2.05, .24], [.6, -2.02, .2], [1.95, -2.05, .28], [-1.9, -2.3, .22]
]) {
  flowerMound(x + between(-.04, .04), z + between(-.04, .04), r * between(.9, 1.1));
  petals(x, z, r * 1.6, 5 + Math.floor(rand() * 5));
}

// ---------- The yard ----------
// Grass, the path to the door, hedges round the sides and back, the railing,
// gate and mailbox the cottage has; borders along the railing, a wisteria arch
// over the gate, and a little fountain on the front lawn with stepping stones
// and a bench. The left side of the lot and most of the back stay open lawn
// for a garden later; a spot on the front-left lawn stays clear for a small
// tree at Christmas (src/house-shells.js lists the spots kept for such things).
kit.reseed(-528);
kit.flagstones(-.62, .62, GF + 1.06, 4.3, 3);
kit.frontRailing();
kit.hedge(false, -5.15, -3.95, 3.85);
kit.hedge(false, 5.15, -3.95, 3.85);
kit.hedge(true, -4.0, -4.92, 4.92);
kit.mailbox(1.68, 3.72);
kit.frontGate();
// Borders inside the railing, either side of the gate.
kit.gardenBed([-3.3, -.22, 3.54], 2.4, 0, LOOK.beds);
kit.gardenBed([3.55, -.22, 3.54], 1.8, 0, LOOK.beds);

// An iron arch over the gate, wisteria climbing both sides and hanging from the top
// (or roses, on the rose castle).
{
  const z = 3.93, r = 1.05, spring = 1.3, rails = [z - .06, z + .06], arc = [];
  for (let i = 0; i <= 18; i += 1) {
    const a = Math.PI * i / 18;
    arc.push([Math.cos(a) * r, spring + Math.sin(a) * r]);
  }
  for (const rz of rails) {
    for (const side of [-1, 1]) piece("metal", [side * r, (LAWN + spring) / 2, rz], [.035, spring - LAWN, .035]);
    for (let i = 1; i < arc.length; i += 1) {
      const [x0, y0] = arc[i - 1], [x1, y1] = arc[i];
      piece("metal", [(x0 + x1) / 2, (y0 + y1) / 2, rz], [Math.hypot(x1 - x0, y1 - y0) + .01, .035, .035], [0, 0, Math.atan2(y1 - y0, x1 - x0)]);
    }
  }
  // Rungs between the two rails, up the sides and over the top.
  for (const side of [-1, 1]) for (let y = LAWN + .25; y < spring; y += .22) piece("metal", [side * r, y, z], [.03, .03, .14]);
  for (let i = 1; i < arc.length; i += 2) piece("metal", [arc[i][0], arc[i][1], z], [.03, .03, .14]);
  for (const side of [-1, 1]) stud("gold", [side * r, LAWN + .02, z], .05, .04, [0, 0, 0]);
  // The wisteria: up each side, over the top, racemes hanging longest in the middle.
  for (const side of [-1, 1]) {
    const up = [];
    for (let y = LAWN; y <= spring + .01; y += .14) up.push([side * (r + Math.sin(y * 7) * .025), y, z + Math.cos(y * 5) * .05]);
    const over = arc.filter(([x]) => side * x >= -.02).map(([x, y]) => [x, y + .02, z + Math.sin(x * 9) * .04]);
    const path = [...up, ...(side > 0 ? over.reverse() : over)];
    stem(path, .03, "wood");
    path.forEach(([x, y, zz]) => kit.leaves(x, y, zz, 3 + Math.floor(rand() * 3), .08, 1.1));
  }
  // With roses, they open along the arch, facing the street and the house.
  const hanging = (x, y, zz, length) => BLOOM === "rose"
    ? rose([x, y - length * .3, zz], rand() < .7 ? 0 : Math.PI, between(.9, 1.2), between(-.2, .5))
    : lightRaceme(x, y, zz, length);
  for (const [x, y] of arc) {
    const middle = 1 - Math.abs(x) / r;
    for (let k = 0; k < 2; k += 1) {
      if (y > spring + .2 || rand() < .5) hanging(x + between(-.05, .05), y - .02, z + between(-.08, .08), (.14 + .34 * middle) * between(.75, 1.25));
    }
  }
  for (const side of [-1, 1]) for (let y = LAWN + .5; y < spring; y += between(.18, .3)) hanging(side * r + between(-.04, .04), y, z + between(-.07, .07), between(.1, .22));
}

// The old wisteria tree stays in the back corner, as it stands behind the
// cottage: it belongs to the garden, whichever house is on the lot (the rose
// castle has roses there instead). A path of stepping stones wanders to it
// from the fountain, and a bench sits under it.
if (LOOK.tree === "wisteria") kit.wisteriaTree(4.25, -3.15);
{
  const benchBase = [4.0, LAWN, -2.45], turn = Math.PI / 4;
  for (const lx of [-.3, .3]) for (const lz of [-.09, .09]) localBox("ivory", benchBase, [lx, .12, lz], [.04, .24, .04], turn, .01);
  for (const lz of [-.075, 0, .075]) localBox("wood", benchBase, [0, .25, lz], [.74, .03, .06], turn, .01);
  localBox("ivory", benchBase, [0, .44, -.12], [.74, .2, .035], turn, .012);
  for (const lx of [-.36, .36]) localBox("ivory", benchBase, [lx, .34, 0], [.035, .03, .22], turn, .008);
  for (let i = 0; i < 13; i += 1) {
    const t = i / 12, x = 3.75 + Math.sin(t * 5.2) * .32, z = 2.15 - t * 4.25;
    box(rand() < .6 ? "stone" : "pearl", [x + between(-.03, .03), LAWN + .02, z], [between(.2, .26), .05, between(.16, .21)], [0, between(-.4, .4), 0], .02);
  }
}

// A little round fountain: a brick basin with a cap, water, a column and a
// small bowl spilling over, and petals drifting on it.
{
  const fx = 3.7, fz = 2.8, r = .42;
  brickRing(fx, fz, r - .03, LAWN, LAWN + .24);
  for (let i = 0, n = 18; i < n; i += 1) {
    const a = i * TAU / n;
    box("ivory", [fx + Math.sin(a) * (r + .01), LAWN + .27, fz + Math.cos(a) * (r + .01)], [2 * (r + .01) * Math.sin(Math.PI / n) + .01, .05, .1], [0, a, 0], .008);
  }
  cylinder("stone", [fx, LAWN + .08, fz], r - .04, .16);
  for (const [y, k] of [[LAWN + .19, 1], [LAWN + .205, .7]]) cylinder("glass", [fx, y, fz], (r - .05) * k, .02);
  cylinder("ivory", [fx, LAWN + .4, fz], .06, .42);
  cylinder("ivory", [fx, LAWN + .62, fz], .16, .05);
  cylinder("ivory", [fx, LAWN + .66, fz], .12, .04);
  cylinder("glass", [fx, LAWN + .685, fz], .11, .015);
  stud("gold", [fx, LAWN + .72, fz], .035, .05, [0, 0, 0]);
  for (let i = 0; i < 10; i += 1) {
    const a = i * TAU / 10 + between(-.15, .15);
    for (let k = 0; k < 3; k += 1) piece("glass", [fx + Math.sin(a) * (.17 + k * .025), LAWN + .58 - k * .11, fz + Math.cos(a) * (.17 + k * .025)], [.02, .09, .02]);
  }
  for (let i = 0; i < 9; i += 1) {
    const a = between(0, TAU), d = between(.12, r - .1);
    const petal = BLOOM === "rose" ? (rand() < .5 ? "blush" : "rose") : (rand() < .5 ? "lilac" : "blush");
    floret(petal, [fx + Math.sin(a) * d, LAWN + .218, fz + Math.cos(a) * d], between(.014, .022), [0, 0, 0], .006);
  }
  // Stepping stones from the path to the fountain, and a bench facing it.
  for (const [x, z] of [[.95, 3.28], [1.3, 3.14], [1.68, 3.06], [2.06, 3.0], [2.44, 2.94], [2.82, 2.88], [3.15, 2.84]]) {
    box(rand() < .6 ? "stone" : "pearl", [x + between(-.03, .03), LAWN + .02, z + between(-.03, .03)], [between(.2, .26), .05, between(.16, .21)], [0, between(-.4, .4), 0], .02);
  }
  const benchBase = [4.42, LAWN, 2.9], turn = -Math.PI / 2;
  for (const lx of [-.3, .3]) for (const lz of [-.09, .09]) localBox("ivory", benchBase, [lx, .12, lz], [.04, .24, .04], turn, .01);
  for (const lz of [-.075, 0, .075]) localBox("wood", benchBase, [0, .25, lz], [.74, .03, .06], turn, .01);
  localBox("ivory", benchBase, [0, .44, -.12], [.74, .2, .035], turn, .012);
  for (const lx of [-.36, .36]) localBox("ivory", benchBase, [lx, .34, 0], [.035, .03, .22], turn, .008);
}

const near = (x, z, r) => Math.hypot(x - BACK[0], z - BACK[1]) < r || frontTowers.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < r);

// The rose castle's garden: rose bushes all over the open lawn, in drifts of
// colour (pale towards one side, deep towards another, pink between), leaving
// the path, the stepping stones, the fountain and the benches clear.
if (LOOK.roseField) {
  const stonesX = (z) => 3.75 + Math.sin((2.15 - z) / 4.25 * 5.2) * .32;
  const clear = (x, z) => !(
    (Math.abs(x) < KX + .2 && z > KB - .2 && z < KF + .15) || (Math.abs(x) < GX + .3 && z > KF && z < GF + 1.45)
    || near(x, z, TOWER_R + .2) || (Math.abs(x) < .85 && z > 2.6)                        // the house, the steps, the path
    || (z > 3.15 && z < 3.95 && Math.abs(x) > 1.9) || Math.hypot(x - 1.68, z - 3.72) < .4  // the borders, the mailbox
    || Math.hypot(x - 3.7, z - 2.8) < .62 || Math.hypot(x - 4.42, z - 2.9) < .5            // the fountain and its bench
    || Math.hypot(x - 4.0, z + 2.45) < .55                                               // the bench at the back
    || (x > .8 && x < 3.3 && z > 2.65 && z < 3.5)                                        // stones to the fountain
    || (z < 2.25 && z > -2.2 && Math.abs(x - stonesX(z)) < .34)                          // stones to the back bench
    || Math.abs(x) > 4.75 || z < -3.6 || z > 3.85);
  const drifts = {
    pale: [["ivory", "blush"], ["blush", "rose"], ["ivory", "blush"], ["blush", "ivory"]],
    pink: [["rose", "roseDeep"], ["blush", "rose"], ["rose", "blush"], ["blush", "rose"]],
    deep: [["roseDeep", "rose"], ["rose", "roseDeep"], ["roseDeep", "roseDeep"], ["rose", "roseDeep"]]
  };
  const driftAt = (x, z) => { const k = Math.sin(x * .8 + 1.3) + Math.cos(z * .9 - .4) * .8; return k > .7 ? drifts.pale : k < -.7 ? drifts.deep : drifts.pink; };
  for (let z = -3.5; z < 3.8; z += .48) {
    for (let x = -4.65; x < 4.7; x += .48) {
      const px = x + between(-.12, .12), pz = z + between(-.12, .12);
      if (clear(px, pz)) flowerMound(px, pz, between(.22, .3), driftAt(px, pz), .75);
    }
  }
}
const taken = (x, z) =>
  (Math.abs(x) < KX + .25 && z > KB - .25 && z < KF + .2) || (Math.abs(x) < GX + .25 && z < GF + 1.4)
  || near(x, z, TOWER_R + .25) || (Math.abs(x) < .72 && z > 2.8)
  || (z > 3.18 && z < 3.9 && Math.abs(x) > 2.0 && Math.abs(x) < 4.78)       // borders
  || Math.hypot(x - 3.7, z - 2.8) < .55 || Math.hypot(x - 4.42, z - 2.9) < .45   // fountain, bench
  || Math.hypot(x - 4.25, z + 3.15) < .3 || Math.hypot(x - 4.0, z + 2.45) < .5     // tree, its bench
  || (Math.abs(x - 3.75) < .45 && z < 2.2 && z > -2.2)                          // stepping stones
  || Math.abs(x) > 4.88 || z < -3.72 || z > 3.95 || Math.hypot(x - 1.68, z - 3.72) < .32;
const sign = () => rand() < .5 ? -1 : 1;
kit.grassTufts([
  () => [sign() * between(4.74, 4.87), between(-3.7, 3.9)],
  () => [between(-4.85, 4.85), between(-3.71, -3.6)],
  () => [sign() * between(.73, .8), between(2.85, 3.95)],
  () => [between(-5, 5), between(-3.7, 3.9)],
  () => [between(-5, 5), between(-3.7, 3.9)]
], taken, 110);

const scene = kit.toScene(LOOK.name, colors, { rounding: 1 });
const bytes = await writeGlb(scene, new URL(`../public/models/${LOOK.file}`, import.meta.url));
const counts = kit.counts();
console.log(`wrote ${LOOK.file} (${(bytes / 1024 / 1024).toFixed(2)} MB): ${counts.bricks} bricks, ${counts.round} round, ${counts.fine} fine, ${counts.florets} florets`);
