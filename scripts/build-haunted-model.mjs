// The Halloween house, from the same small bricks as the cottage: a crooked
// little haunted house, more sweet than scary. Dusky clapboard walls under a
// purple-black mansard roof with iron cresting, a leaning turret in a drooping
// witch's hat, a front porch whose two lanterns are carved pumpkins, glowing
// windows, a bare tree hung with little ghosts, bats, cobwebs, pumpkins all
// down the path, a few headstones and a bubbling cauldron, and leaves blown
// over the lawn. It stands on the same plot as the other shells, with the same
// gate, railing, hedges and mailbox. Writes public/models/porchlit-haunted.glb.
import * as THREE from "three";
import { createKit, writeGlb, LAWN, eulerOf } from "./brick-kit.mjs";

// The cottage's colours, and a few of its own. The page recolours the shared
// ones by material name; its own keep the colour they are exported with.
const colors = {
  cream: "#eee2d8", plaster: "#f7eee7", ivory: "#fff7ee", pearl: "#f8ece5",
  blush: "#e5cfd0", rose: "#c98aa5", roseDeep: "#9b607b", lavender: "#b896d0", lavenderDeep: "#76558f",
  roof: "#292630", roofPale: "#45404c", sage: "#507359", sageLight: "#769073", amber: "#f5cf79",
  stone: "#d8cbc0", lawn: "#c7d3ba", wood: "#7d6963", metal: "#28252d", gold: "#d7aa58", glass: "#dce9ea",
  room: "#f4d6b4", lilac: "#dccdea", hedge: "#8aa486", leafLight: "#a9bea2",
  dusk: "#6f6382", duskDeep: "#574c69", pumpkin: "#e8893b", pumpkinDeep: "#c4682c", mist: "#ece4f4"
};

const kit = createKit(1031);
const { rand, between, box, cylinder, stud, piece, floret, localBox, localDetailBox, stem, windowAt } = kit;
const TAU = Math.PI * 2;
const v3 = (p) => new THREE.Vector3(...p);
// Turned to face `yaw` (from +z towards +x), then tipped about its own
// across-axis by `tip` (negative tips the foot out), or rolled about the way it
// faces by `roll`.
const qOf = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
const yawTip = (yaw, tip) => eulerOf(qOf(0, yaw, 0).multiply(qOf(tip, 0, 0)));

// ---------- Measurements ----------
// The house: side walls at x = ±HX, front at HF, back at HB; a band between
// the floors at FLOOR2 and the walls' top at EAVE; the mansard roof rises
// MANSARD above that, leaning in by INSET.
const HX = 2.0, HF = 1.5, HB = -1.5, FLOOR2 = 1.95, EAVE = 3.85;
const MANSARD = 1.15, INSET = .55, DECK = EAVE + .1 + MANSARD;
// The turret on the front left corner, leaning out a little.
const TX = -2.02, TZ = 1.42, TR = .7, TTOP = 4.6, HAT = 2.1, LEAN = .085;
// The porch: its floor, how far it reaches, how wide, the posts and the roof.
const PORCH_FLOOR = .27, PORCH_FRONT = 2.42, PORCH_X = 1.25, PORCH_TOP = 2.12;
const POSTS = [-1.2, -.55, .55, 1.2];
// The front door, and the two pumpkin lanterns hanging either side of it,
// back near the wall so they never stand in front of the door.
const DOOR_W = .84, DOOR_TOP = 1.92, DOOR_SPRING = DOOR_TOP - DOOR_W / 2;
const LANTERNS = [-1.0, 1.0], LANTERN_Y = 1.52, LANTERN_Z = 1.85;
// Where the underside of the porch roof is, at z.
const porchCeiling = (z) => PORCH_TOP + .42 - (z - HF - .04) / (PORCH_FRONT + .02 - HF) * .36 - .05;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- Faces ----------

// Where a point on a flat wall is: `face` is front (+z), back (-z), right (+x)
// or left (-x), `plane` the wall's position, `a` the distance along it.
function onFace(face, plane, a, y, out) {
  if (face === "front") return [a, y, plane + out];
  if (face === "back") return [a, y, plane - out];
  if (face === "right") return [plane + out, y, a];
  return [plane - out, y, a];
}
const sizeOn = (face, along, high, deep) => face === "front" || face === "back" ? [along, high, deep] : [deep, high, along];
const faceTurn = { front: 0, right: Math.PI / 2, back: Math.PI, left: -Math.PI / 2 };
// A board's foot tipped out from the wall by `tip`.
const tipOut = (face, tip) => face === "front" ? [-tip, 0, 0] : face === "back" ? [tip, 0, 0] : face === "right" ? [0, 0, tip] : [0, 0, -tip];

// Inside the house or the turret, where nothing would ever be seen. The
// turret leans, so its middle moves out as it rises.
const turretAt = (y) => [TX - Math.sin(LEAN) * (y - LAWN), TZ];
const insideTurret = (x, y, z, r = TR - .02) => { const [cx, cz] = turretAt(y); return Math.hypot(x - cx, z - cz) < r; };

// A hole the shape of an arched window or door, centred at `c` along a face.
const archHole = (c, middle, width, height, margin = .08) => (a, y) => {
  const r = width / 2, spring = middle + height / 2 - r, dx = a - c;
  if (y < middle - height / 2 - .06 || Math.abs(dx) > r + margin) return false;
  return y < spring || Math.hypot(dx, y - spring) < r + margin;
};
const anyOf = (...holes) => (a, y) => holes.some((hole) => hole(a, y));

// Clapboard: rows of overlapping boards, each tipped out at its foot, in runs
// of uneven length so the joints wander; holes are left where `skip(a, y)`.
// Mostly dusk, some darker, and now and then a purple board patched in.
const boardTone = () => { const t = rand(); return t < .05 ? "lavenderDeep" : t < .27 ? "duskDeep" : "dusk"; };
function siding(face, plane, a0, a1, y0, y1, skip = () => false) {
  const rows = Math.floor((y1 - y0) / .11 + .001);
  for (let row = 0; row < rows; row += 1) {
    const y = y0 + .055 + row * .11;
    let start = null, longest = between(.4, .9);
    const lay = (from, to) => {
      const p = onFace(face, plane, (from + to) / 2, y, .035);
      if (to - from > .03 && !insideTurret(p[0], y, p[2])) box(boardTone(), p, sizeOn(face, to - from - .006, .118, .035), tipOut(face, .09), .008);
    };
    for (let a = a0; a <= a1 + 1e-6; a += .03) {
      const open = a < a1 - 1e-6 && !skip(a + .015, y);
      if (open && start === null) start = a;
      if (start !== null && (!open || a - start >= longest)) {
        lay(start, a);
        start = open ? a : null;
        longest = between(.4, .9);
      }
    }
  }
}

// A stone foundation of two courses at the foot of a wall.
function foundation(face, plane, a0, a1) {
  for (let row = 0; row < 2; row += 1) {
    for (let a = a0 + (row ? -.07 : 0); a < a1 - .03;) {
      const length = Math.min(between(.16, .26), a1 - a), from = Math.max(a0, a), to = Math.min(a1, a + length);
      const p = onFace(face, plane, (from + to) / 2, LAWN + .06 + row * .12, .055);
      if (to - from > .03 && !insideTurret(p[0], p[1], p[2])) box(rand() < .65 ? "stone" : "pearl", p, sizeOn(face, to - from - .008, .115, .09), [0, 0, 0], .008);
      a += length;
    }
  }
}

// An ivory band along a face, with little brackets underneath every `every`.
function band(face, plane, a0, a1, y, { out = .07, high = .08, deep = .1, brackets = 0, every = .3 } = {}) {
  box("ivory", onFace(face, plane, (a0 + a1) / 2, y, out), sizeOn(face, a1 - a0, high, deep), [0, 0, 0], .01);
  if (!brackets) return;
  for (let a = a0 + every / 2; a < a1 - .05; a += every) {
    const p = onFace(face, plane, a, y - high / 2 - brackets / 2, out - .01);
    if (insideTurret(p[0], p[1], p[2], TR + .05)) continue;
    box("ivory", p, sizeOn(face, .06, brackets, deep - .02), [0, 0, 0], .008);
    stud("ivory", onFace(face, plane, a, y - high / 2 - brackets + .02, out + .03), .025, .03, [Math.PI / 2, faceTurn[face], 0]);
  }
}

// ---------- Tiles on a sloping face ----------

// Tiles over a four-cornered sloping face, given as seen from outside: its
// bottom left and right, top left and right. Rows run up the slope, each a
// half tile over from the last; `tone(row)` picks each tile's colour. A tile
// is `w` wide and `d` up the slope.
function tileFace(bl, br, tl, tr, tone, { w = .1, d = .1, thick = .026, lift = .015 } = {}) {
  const BL = v3(bl), BR = v3(br), TL = v3(tl), TR = v3(tr);
  const slantLeft = TL.distanceTo(BL), rows = Math.max(1, Math.floor(slantLeft / (d * .8)));
  for (let row = 0; row < rows; row += 1) {
    const t = (row + .5) / rows;
    const left = BL.clone().lerp(TL, t), right = BR.clone().lerp(TR, t);
    const along = right.clone().sub(left), length = along.length();
    const X = along.clone().normalize();
    const up = TL.clone().lerp(TR, .5).sub(BL.clone().lerp(BR, .5)).normalize();
    const Y = new THREE.Vector3().crossVectors(X, up).normalize();
    const Z = new THREE.Vector3().crossVectors(X, Y).normalize();
    // Tipped a little so each row's foot laps over the row below.
    const rotation = eulerOf(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)).multiply(qOf(-.07, 0, 0)));
    const n = Math.max(1, Math.round(length / w)), shift = row % 2 ? .5 : 0;
    for (let i = 0; i < n + (shift ? 1 : 0); i += 1) {
      const s0 = Math.max(0, (i - shift) / n), s1 = Math.min(1, (i + 1 - shift) / n);
      if (s1 - s0 < .2 / n) continue;
      const middle = left.clone().addScaledVector(along, (s0 + s1) / 2).addScaledVector(Y, lift);
      box(tone(row), middle.toArray(), [length * (s1 - s0) - .006, thick, d + .02], rotation, .006);
    }
  }
}

// ---------- The house ----------

kit.plot();
// The core of the walls, so no gap ever shows through.
box("duskDeep", [0, (LAWN + EAVE) / 2, (HF + HB) / 2], [2 * HX - .04, EAVE - LAWN, HF - HB - .04], [0, 0, 0], .05);

// Windows: [along, height, look, shape, boarded?]. Looks differ so no two
// repeat the same lamps and curtains.
const tall = { width: .62, height: 1.05, slices: 7 };
const slim = { width: .42, height: .82, slices: 5 };
const walls = {
  front: [[1.5, .98, { curtain: "drawn", lamps: [] }, tall, true],
    [-.62, 2.95, { curtain: "both", lamps: [[.18, -.06, .06, .1]] }, tall],
    [1.05, 2.95, { curtain: "left", lamps: [[-.15, .04, .06, .1]] }, tall]],
  right: [[.55, .98, { curtain: "right", lamps: [[-.18, .02, .07, .11]] }, tall],
    [-.75, .98, { curtain: "none", lamps: [[.12, -.05, .06, .1]] }, tall],
    [.55, 2.95, { curtain: "drawn", lamps: [] }, tall],
    [-.75, 2.95, { curtain: "left", lamps: [[.16, .08, .06, .1]] }, tall]],
  back: [[-.9, .98, { curtain: "both", lamps: [[0, -.04, .07, .11]] }, tall],
    [.9, 2.95, { curtain: "right", lamps: [[-.14, 0, .06, .1]] }, tall]],
  left: [[-.55, .98, { curtain: "left", lamps: [[.15, .04, .06, .1]] }, tall],
    [-.55, 2.95, { curtain: "drawn", lamps: [] }, tall]]
};
const holesOn = (face) => anyOf(...walls[face].map(([c, y, , shape]) => archHole(c, y, shape.width + .1, shape.height)));
const doorHole = archHole(0, (PORCH_FLOOR + DOOR_TOP) / 2, DOOR_W + .16, DOOR_TOP - PORCH_FLOOR + .05);
const plan = [
  ["front", HF, -HX, HX, anyOf(holesOn("front"), doorHole)],
  ["right", HX, HB, HF, holesOn("right")],
  ["back", HB, -HX, HX, holesOn("back")],
  ["left", -HX, HB, HF, holesOn("left")]
];
for (const [face, plane, a0, a1, skip] of plan) {
  foundation(face, plane, a0, a1);
  siding(face, plane, a0, a1, LAWN + .25, EAVE, skip);
  band(face, plane, a0, a1, FLOOR2, { high: .07 });
  band(face, plane, a0, a1, EAVE - .02, { out: .09, high: .1, deep: .14, brackets: .14 });
  const turn = faceTurn[face];
  for (const [c, y, look, shape, boarded] of walls[face]) {
    const base = onFace(face, plane, c, y, .07);
    windowAt(base, turn, false, look, shape);
    if (boarded) {
      // Boarded up: three planks nailed across, one of them crooked.
      for (const [dy, roll] of [[.22, .12], [-.05, -.2], [-.3, .05]]) {
        kit.localDetailBox(rand() < .5 ? "wood" : "roofPale", base, [0, dy, .27], [shape.width + .22, .085, .03], turn, roll, .006);
        for (const dx of [-1, 1]) stud("metal", onFace(face, plane, c + dx * (shape.width / 2 + .02), y + dy + dx * roll * .3, .3), .012, .012, [Math.PI / 2, turn, 0]);
      }
    }
  }
}
// Shutters, dark and a little crooked, beside two of the upper windows; one
// hangs by a single hinge.
for (const [c, y, droop] of [[-.62, 2.95, 0], [1.05, 2.95, .32]]) {
  for (const side of [-1, 1]) {
    const tilt = side > 0 ? droop : 0, x = c + side * .5;
    localDetailBox("roofPale", [x, y - .05 - tilt * .2, HF + .12], [0, 0, 0], [.22, .98, .035], 0, -side * tilt, .01);
    for (const dy of [-.28, 0, .28]) localDetailBox("metal", [x, y - .05 - tilt * .2, HF + .14], [0, dy, 0], [.16, .035, .02], 0, -side * tilt, .004);
  }
}
// Corner boards where the walls meet.
for (const [x, z] of [[HX, HF], [HX, HB], [-HX, HB]]) box("ivory", [x + Math.sign(x) * .015, (LAWN + .25 + EAVE) / 2, z + Math.sign(z) * .015], [.12, EAVE - LAWN - .25, .12], [0, 0, 0], .012);

// ---------- The mansard roof ----------
{
  const out = .14, e = EAVE + .06;
  const lowX = HX + out, lowF = HF + out, lowB = HB - out;
  const hiX = HX - INSET, hiF = HF - INSET, hiB = HB + INSET, top = DECK;
  // A stepped core under the tiles, so no gap shows at the hips.
  for (let i = 0; i < 8; i += 1) {
    const t = (i + .5) / 8, k = 1 - t;
    box("roof", [0, e + MANSARD * t, (lowF * k + hiF * t + lowB * k + hiB * t) / 2],
      [2 * (lowX * k + hiX * t) - .06, MANSARD / 8 + .02, (lowF * k + hiF * t) - (lowB * k + hiB * t) - .06], [0, 0, 0], .02);
  }
  // Mostly near-black, with a band of purple every fifth row.
  const tone = (row) => row % 5 === 2 ? (rand() < .9 ? "lavenderDeep" : "roof") : rand() < .12 ? "roofPale" : "roof";
  tileFace([-lowX, e, lowF], [lowX, e, lowF], [-hiX, top, hiF], [hiX, top, hiF], tone);
  tileFace([lowX, e, lowF], [lowX, e, lowB], [hiX, top, hiF], [hiX, top, hiB], tone);
  tileFace([lowX, e, lowB], [-lowX, e, lowB], [hiX, top, hiB], [-hiX, top, hiB], tone);
  tileFace([-lowX, e, lowB], [-lowX, e, lowF], [-hiX, top, hiB], [-hiX, top, hiF], tone);
  // Ridge caps down the four hips.
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    const a = v3([sx * lowX, e, sz > 0 ? lowF : lowB]), b = v3([sx * hiX, top, sz > 0 ? hiF : hiB]);
    stem([a.toArray(), b.toArray()], .07, "roofPale");
  }
  // The deck on top, edged in iron cresting with little spikes and corner finials.
  box("roofPale", [0, top + .02, (hiF + hiB) / 2], [2 * hiX + .06, .06, hiF - hiB + .06], [0, 0, 0], .015);
  for (const [x0, z0, x1, z1] of [[-hiX, hiF, hiX, hiF], [hiX, hiF, hiX, hiB], [hiX, hiB, -hiX, hiB], [-hiX, hiB, -hiX, hiF]]) {
    const length = Math.hypot(x1 - x0, z1 - z0), n = Math.round(length / .11);
    piece("metal", [(x0 + x1) / 2, top + .2, (z0 + z1) / 2], [x0 === x1 ? .025 : length, .025, x0 === x1 ? length : .025]);
    piece("metal", [(x0 + x1) / 2, top + .08, (z0 + z1) / 2], [x0 === x1 ? .025 : length, .02, x0 === x1 ? length : .025]);
    for (let i = 0; i <= n; i += 1) {
      const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n, high = i % 2 ? .2 : .29;
      piece("metal", [x, top + .05 + high / 2, z], [.02, high, .02]);
      if (i % 2 === 0) piece("metal", [x, top + .05 + high, z], [.045, .045, .045], [Math.PI / 4, 0, Math.PI / 4]);
    }
  }
  for (const [x, z] of [[-hiX, hiF], [hiX, hiF], [hiX, hiB], [-hiX, hiB]]) {
    box("metal", [x, top + .22, z], [.06, .36, .06], [0, 0, 0], .01);
    stud("gold", [x, top + .43, z], .045, .06, [0, 0, 0]);
  }
  // Two dormers on the front slope, each with a little gable and a round-topped window.
  for (const [x, look] of [[-.38, { curtain: "right", lamps: [[0, -.02, .05, .08]] }], [.92, { curtain: "none", lamps: [[.1, .03, .05, .08]] }]]) {
    const y0 = e + .05, y1 = e + .8, z = HF + .03, back = HF - .55, w = .66;
    box("duskDeep", [x, (y0 + y1) / 2, (z + back) / 2], [w, y1 - y0, z - back], [0, 0, 0], .02);
    for (let y = y0 + .055; y < y1 - .02; y += .11) {
      for (const side of [-1, 1]) box(boardTone(), [x + side * (w / 2 - .09), y, z + .03], [.17, .118, .035], [-.09, 0, 0], .006);
    }
    windowAt([x, (y0 + y1) / 2 - .02, z + .04], 0, true, look, { width: .34, height: .5, slices: 5 });
    // The gable: two tiled slopes meeting over the window, with ivory bargeboards.
    const peak = y1 + .32;
    for (const side of [-1, 1]) {
      tileFace(side < 0 ? [x - w / 2 - .08, y1 - .02, z + .1] : [x, peak, z + .1], side < 0 ? [x, peak, z + .1] : [x + w / 2 + .08, y1 - .02, z + .1],
        side < 0 ? [x - w / 2 - .08, y1 - .02, back] : [x, peak, back], side < 0 ? [x, peak, back] : [x + w / 2 + .08, y1 - .02, back],
        () => rand() < .2 ? "lavenderDeep" : "roof", { w: .09, d: .09 });
      const run = Math.hypot(w / 2 + .08, peak - y1 + .02);
      localDetailBox("ivory", [x + side * (w / 4 + .04), (peak + y1) / 2, z + .12], [0, 0, 0], [run, .06, .05], 0, -side * Math.atan2(peak - y1 + .02, w / 2 + .08), .006);
    }
    // The gable end filled with boards, narrowing to the peak.
    for (let y = y1 + .04; y < peak - .03; y += .075) {
      const half = (w / 2 + .02) * (1 - (y - y1) / (peak - y1));
      if (half > .03) box(boardTone(), [x, y, z + .05], [2 * half, .07, .06], [-.06, 0, 0], .006);
    }
    box("ivory", [x, peak + .05, z + .12], [.05, .14, .05], [0, 0, 0], .006);
  }
}

// A crooked chimney behind, in two leaning stacks with an ivory cap.
{
  const x = 1.05, z = -.75;
  for (let y = DECK - .35, k = 0; y < DECK + 1.0; y += .08, k += 1) {
    const lean = y > DECK + .45 ? (y - DECK - .45) * .12 : 0;
    for (const [dx, dz, w, d] of [[0, .14, .42, .1], [0, -.14, .42, .1], [.16, 0, .1, .2], [-.16, 0, .1, .2]]) {
      box(rand() < .2 ? "roofPale" : rand() < .5 ? "stone" : "pearl", [x + dx + lean + (k % 2 ? .02 : -.02) * (w > .2 ? 1 : 0), y, z + dz], [w, .074, d], [0, 0, lean * .8], .008);
    }
  }
  const capY = DECK + 1.04, capLean = (DECK + 1.04 - DECK - .45) * .12;
  box("ivory", [x + capLean, capY, z], [.5, .07, .4], [0, 0, capLean * .8], .01);
  for (const dx of [-.1, .1]) cylinder("roofPale", [x + capLean + dx, capY + .1, z], .05, .14);
}

// ---------- The turret ----------
// Everything on it leans out from its foot by LEAN; `lean(p)` moves a point
// as the lean does, and `leanTurn(rotation)` turns a piece with it.
const leanQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), LEAN);
const pivot = new THREE.Vector3(TX, LAWN, TZ);
const lean = (p) => v3(p).sub(pivot).applyQuaternion(leanQ).add(pivot).toArray();
const leanTurn = (rotation) => eulerOf(leanQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation))));
const tBox = (material, p, size, rotation = [0, 0, 0], radius = .008) => box(material, lean(p), size, leanTurn(rotation), radius);
const tCylinder = (material, p, r, h, rotation = [0, 0, 0]) => cylinder(material, lean(p), r, h, leanTurn(rotation));
const turnFrom = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
{
  // The core, then a plinth of stones and scalloped shingles all the way up.
  for (let i = 0; i < 6; i += 1) {
    const h = (TTOP - LAWN) / 6;
    tCylinder("duskDeep", [TX, LAWN + h * (i + .5), TZ], TR - .02, h + .01);
  }
  const openings = [[.25, 1.0, slim, { curtain: "left", lamps: [[.1, -.04, .05, .09]] }], [.9, 2.85, slim, { curtain: "drawn", lamps: [] }], [.55, 3.95, { width: .36, height: .62, slices: 5 }, { curtain: "none", lamps: [[0, -.06, .05, .08]] }]];
  const clearOf = (a, y) => openings.some(([angle, middle, shape]) => archHole(0, middle, shape.width + .12, shape.height)(turnFrom(a, angle) * TR, y));
  for (let row = 0; row < 2; row += 1) {
    const n = Math.round(TAU * TR / .17), step = TAU / n;
    for (let i = 0; i < n; i += 1) {
      const a = (i + (row ? .5 : 0)) * step, x = TX + Math.sin(a) * (TR + .035), z = TZ + Math.cos(a) * (TR + .035);
      if (Math.abs(x) < HX - .05 && z < HF - .05) continue;
      tBox(rand() < .65 ? "stone" : "pearl", [x, LAWN + .06 + row * .12, z], [2 * (TR + .035) * Math.sin(step / 2) - .006, .115, .09], [0, a, 0]);
    }
  }
  const rows = Math.floor((TTOP - LAWN - .3) / .085);
  for (let row = 0; row < rows; row += 1) {
    const y = LAWN + .3 + row * .085, n = Math.round(TAU * TR / .11), step = TAU / n;
    const purple = Math.floor(row / 6) % 4 === 2;
    for (let i = 0; i < n; i += 1) {
      const a = (i + (row % 2 ? .5 : 0)) * step;
      if (clearOf(a, y)) continue;
      const x = TX + Math.sin(a) * (TR + .03), z = TZ + Math.cos(a) * (TR + .03);
      if (Math.abs(x) < HX - .06 && z < HF - .06) continue;
      const tone = purple ? (rand() < .8 ? "lavenderDeep" : "duskDeep") : boardTone();
      tBox(tone, [x, y, z], [2 * (TR + .03) * Math.sin(step / 2) + .01, .1, .04], yawTip(a, -.12), .02);
    }
  }
  // Bands at the floor line and under the hat, the upper one on brackets.
  for (const [y, brackets] of [[FLOOR2, false], [TTOP - .04, true]]) {
    const n = Math.round(TAU * TR / .12), step = TAU / n, rr = TR + .085;
    for (let i = 0; i < n; i += 1) {
      const a = i * step, x = TX + Math.sin(a) * rr, z = TZ + Math.cos(a) * rr;
      if (Math.abs(x) < HX - .05 && z < HF - .05) continue;
      tBox("ivory", [x, y, z], [2 * rr * Math.sin(step / 2) + .004, brackets ? .1 : .07, .1], [0, a, 0], .008);
      if (brackets && i % 2 === 0) tBox("ivory", [TX + Math.sin(a) * (rr - .03), y - .14, TZ + Math.cos(a) * (rr - .03)], [.06, .16, .07], [0, a, 0], .008);
    }
  }
  // Its windows: narrow, arched, facing their own ways.
  for (const [angle, y, shape, look] of openings) {
    const reach = TR - .08;
    const base = lean([TX + Math.sin(angle) * reach, y, TZ + Math.cos(angle) * reach]);
    windowAt(base, angle, false, look, shape);
  }
  // A witch's hat: a wide brim, then a tall cone of tiles whose top flops over
  // towards the street, with a crescent moon at the very tip.
  const brim = TR + .26, hatBase = TTOP + .04;
  const droop = (t) => { const k = t < .5 ? 0 : ((t - .5) / .5) ** 2; return [-k * .62, k * .42]; };
  for (let i = 0; i < 12; i += 1) {
    const t = (i + .5) / 12, [dx, dz] = droop(t);
    tCylinder("roof", [TX + dx, hatBase + HAT * t, TZ + dz], brim * (1 - t) * .96 + .012, HAT / 12 + .02);
  }
  const slant = Math.hypot(brim, HAT), rowsUp = Math.floor(slant / .07);
  for (let row = 0; row < rowsUp; row += 1) {
    const t = (.035 + row * .07) / slant;
    if (t > .97) break;
    const rho = brim * (1 - t) + .014, [dx, dz] = droop(t), [ndx, ndz] = droop(Math.min(1, t + .03));
    const tilt = Math.PI / 2 - Math.atan2(HAT, brim), n = Math.max(5, Math.round(TAU * rho / .085)), step = TAU / n, shift = rand() * step;
    const bend = Math.atan2(Math.hypot(ndx - dx, ndz - dz), HAT * .03);
    const band = row % 9 === 4 || row % 9 === 5;
    for (let i = 0; i < n; i += 1) {
      const a = i * step + shift;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt + (t > .55 ? bend * Math.cos(a + Math.PI / 3) * .5 : 0), 0, 0)));
      tBox(band ? "lavenderDeep" : rand() < .14 ? "roofPale" : "roof", [TX + dx + Math.sin(a) * rho, hatBase + HAT * t, TZ + dz + Math.cos(a) * rho], [2 * rho * Math.sin(step / 2) + .006, .028, .09], eulerOf(q), .006);
    }
  }
  // The brim's edge.
  for (let i = 0, n = 34; i < n; i += 1) {
    const a = i * TAU / n;
    tBox("roof", [TX + Math.sin(a) * brim, hatBase - .01, TZ + Math.cos(a) * brim], [2 * brim * Math.sin(Math.PI / n) + .01, .05, .08], [0, a, 0], .01);
  }
  // A crescent moon on a little spike at the tip.
  const [tipX, tipZ] = droop(1), tip = [TX + tipX, hatBase + HAT + .02, TZ + tipZ];
  tBox("metal", [tip[0], tip[1] + .1, tip[2]], [.025, .22, .025], [0, 0, 0], .006);
  for (let i = 0; i < 7; i += 1) {
    const a = -1.2 + i * .4, r = .1;
    tBox("gold", [tip[0] + Math.cos(a) * r - .02, tip[1] + .3 + Math.sin(a) * r, tip[2]], [.04, .05, .03], [0, 0, a], .008);
  }
}

// ---------- The porch and the front door ----------
{
  // The floor: boards on a dark skirt with ivory lattice, then the steps.
  box("duskDeep", [0, (LAWN + PORCH_FLOOR) / 2, (HF + PORCH_FRONT) / 2], [2 * PORCH_X, PORCH_FLOOR - LAWN, PORCH_FRONT - HF], [0, 0, 0], .02);
  for (let z = HF + .05; z < PORCH_FRONT - .02; z += .1) box(rand() < .3 ? "roofPale" : "wood", [between(-.02, .02), PORCH_FLOOR + .015, z], [2 * PORCH_X - .02, .03, .09], [0, 0, 0], .006);
  for (let x = -PORCH_X + .12; x < PORCH_X - .1; x += .16) {
    if (Math.abs(x) < .55) continue;
    for (const roll of [.7, -.7]) localDetailBox("ivory", [x, (LAWN + PORCH_FLOOR) / 2, PORCH_FRONT + .01], [0, 0, 0], [.22, .025, .02], 0, roll, .003);
  }
  const stepTops = [.15, .03, -.09];
  stepTops.forEach((top, i) => box(rand() < .5 ? "stone" : "pearl", [0, (LAWN + top) / 2, PORCH_FRONT + .13 + i * .21], [1.08 + i * .14, top - LAWN, .24], [0, 0, 0], .02));
  // Turned posts with gingerbread brackets, a beam with spindles under it.
  for (const x of POSTS) {
    const z = PORCH_FRONT - .1;
    cylinder("ivory", [x, PORCH_FLOOR + .08, z], .08, .16);
    for (let y = PORCH_FLOOR + .16, k = 0; y < PORCH_TOP - .14; y += .15, k += 1) cylinder("ivory", [x, y + .075, z], k % 3 === 1 ? .065 : .045, .15);
    cylinder("ivory", [x, PORCH_TOP - .08, z], .07, .12);
    for (const side of [-1, 1]) {
      if (Math.abs(x + side * .2) > PORCH_X) continue;
      localDetailBox("ivory", [x + side * .12, PORCH_TOP - .2, z], [0, 0, 0], [.28, .04, .04], 0, side * .7, .004);
      stud("ivory", [x + side * .16, PORCH_TOP - .11, z], .03, .04);
    }
  }
  box("ivory", [0, PORCH_TOP + .02, PORCH_FRONT - .1], [2 * PORCH_X + .1, .1, .12], [0, 0, 0], .01);
  for (let x = -PORCH_X + .08; x < PORCH_X - .05; x += .085) {
    if (POSTS.some((p) => Math.abs(p - x) < .08)) continue;
    cylinder("ivory", [x, PORCH_TOP - .1, PORCH_FRONT - .1], .016, .14);
  }
  piece("ivory", [0, PORCH_TOP - .18, PORCH_FRONT - .1], [2 * PORCH_X, .02, .03]);
  // Railings between the posts either side of the steps.
  for (const [x0, x1] of [[-1.2, -.55], [.55, 1.2]]) {
    piece("ivory", [(x0 + x1) / 2, PORCH_FLOOR + .48, PORCH_FRONT - .1], [x1 - x0, .04, .05]);
    piece("ivory", [(x0 + x1) / 2, PORCH_FLOOR + .08, PORCH_FRONT - .1], [x1 - x0, .03, .04]);
    for (let x = x0 + .08; x < x1 - .04; x += .085) cylinder("ivory", [x, PORCH_FLOOR + .28, PORCH_FRONT - .1], .016, .38);
  }
  for (const side of [-1, 1]) {
    piece("ivory", [side * PORCH_X, PORCH_FLOOR + .48, (HF + PORCH_FRONT) / 2 - .05], [.05, .04, PORCH_FRONT - HF - .1]);
    for (let z = HF + .1; z < PORCH_FRONT - .15; z += .085) cylinder("ivory", [side * PORCH_X, PORCH_FLOOR + .28, z], .016, .38);
  }
  // The porch roof: a shallow slope from the wall out over the posts.
  const wallTop = PORCH_TOP + .42, eave = PORCH_TOP + .06;
  tileFace([-PORCH_X - .1, eave, PORCH_FRONT + .06], [PORCH_X + .1, eave, PORCH_FRONT + .06], [-PORCH_X - .1, wallTop, HF + .04], [PORCH_X + .1, wallTop, HF + .04],
    () => rand() < .15 ? "roofPale" : rand() < .2 ? "lavenderDeep" : "roof");
  const slope = Math.atan2(wallTop - eave, PORCH_FRONT + .06 - HF - .04);
  box("roof", [0, (wallTop + eave) / 2 - .03, (HF + PORCH_FRONT + .1) / 2], [2 * PORCH_X + .16, .05, Math.hypot(wallTop - eave, PORCH_FRONT - HF) + .04], [slope, 0, 0], .01);
  for (let x = -PORCH_X - .08; x <= PORCH_X + .09; x += .1) floret("ivory", [x, eave - .045, PORCH_FRONT + .09], .045, [Math.PI / 2, 0, 0], .02);
  box("ivory", [0, eave - .01, PORCH_FRONT + .09], [2 * PORCH_X + .22, .05, .04], [0, 0, 0], .006);

  // The door: a deep purple leaf in a dark arched frame, a round window up
  // top, a gold knocker and a keyhole, ivory jambs and arch stones.
  const middle = (PORCH_FLOOR + DOOR_TOP) / 2, r = DOOR_W / 2;
  box("metal", [0, (PORCH_FLOOR + DOOR_SPRING) / 2, HF + .02], [DOOR_W + .1, DOOR_SPRING - PORCH_FLOOR, .12], [0, 0, 0], .01);
  for (let i = 0; i < 9; i += 1) {
    const x = -r + (i + .5) * (DOOR_W / 9), cap = Math.sqrt(Math.max(0, r * r - x * x));
    box("metal", [x, DOOR_SPRING + cap / 2, HF + .02], [DOOR_W / 9 + .02, cap + .04, .12], [0, 0, 0], .003);
    box("lavenderDeep", [x, DOOR_SPRING + Math.max(0, cap - .05) / 2, HF + .07], [DOOR_W / 9 - .004, Math.max(.02, cap - .05), .05], [0, 0, 0], .003);
  }
  box("lavenderDeep", [0, (PORCH_FLOOR + DOOR_SPRING) / 2, HF + .07], [DOOR_W - .05, DOOR_SPRING - PORCH_FLOOR - .02, .06], [0, 0, 0], .01, "door");
  for (const x of [-.19, .19]) for (const [y, h] of [[PORCH_FLOOR + .32, .42], [PORCH_FLOOR + .86, .5]]) box("duskDeep", [x, y, HF + .105], [.26, h, .02], [0, 0, 0], .006);
  cylinder("metal", [0, DOOR_SPRING + .05, HF + .1], .12, .03, [Math.PI / 2, 0, 0]);
  cylinder("room", [0, DOOR_SPRING + .05, HF + .115], .09, .01, [Math.PI / 2, 0, 0]);
  for (const a of [0, Math.PI / 2]) localDetailBox("metal", [0, DOOR_SPRING + .05, HF + .125], [0, 0, 0], [.18, .018, .012], 0, a, .002);
  cylinder("gold", [0, middle + .1, HF + .12], .05, .015, [Math.PI / 2, 0, 0]);
  cylinder("gold", [0, middle + .02, HF + .13], .035, .02, [Math.PI / 2, 0, 0]);
  stud("gold", [.3, middle - .12, HF + .115], .022, .02);
  box("metal", [.3, middle - .17, HF + .12], [.018, .04, .01], [0, 0, 0], .002);
  for (const side of [-1, 1]) box("ivory", [side * (r + .1), (PORCH_FLOOR + DOOR_SPRING) / 2, HF + .1], [.13, DOOR_SPRING - PORCH_FLOOR, .16], [0, 0, 0], .008);
  for (let i = 0; i < 13; i += 1) {
    const angle = Math.PI * i / 12, keystone = i === 6;
    localDetailBox(keystone ? "lavenderDeep" : "ivory", [0, DOOR_SPRING, HF], [Math.cos(angle) * (r + .11), Math.sin(angle) * (r + .11) + (keystone ? .03 : 0), .12], [keystone ? .13 : .12, keystone ? .17 : .1, .16], 0, angle - Math.PI / 2, .005);
  }
}

// ---------- Pumpkins ----------

// A pumpkin: ribs round a middle, a stalk and a curl of vine. `face` carves it
// facing `facing` (an angle from +z towards +x): eyes, a nose and a grin,
// glowing amber after dark. With `lamp`, the carving is a porch lamp instead
// (named, so the page lights it while someone is signed in).
function pumpkin(x, y, z, r, { face = false, facing = 0, tilt = 0, lamp = false } = {}) {
  const ribs = 8, high = r * 1.5;
  for (let i = 0; i < ribs; i += 1) {
    const a = i * TAU / ribs + tilt;
    cylinder(i % 2 ? "pumpkinDeep" : "pumpkin", [x + Math.sin(a) * r * .45, y + high / 2, z + Math.cos(a) * r * .45], r * .58, high);
  }
  cylinder("pumpkin", [x, y + high / 2, z], r * .7, high * 1.04);
  const top = y + high;
  box(rand() < .5 ? "sage" : "wood", [x, top + r * .2, z], [r * .22, r * .5, r * .22], [between(-.3, .3), 0, between(-.3, .3)], r * .05);
  if (rand() < .6) piece("sageLight", [x + r * .25, top + .01, z + r * .1], [r * .5, .012, r * .3], [0, between(0, Math.PI), .3]);
  if (!face) return;
  // The carving: lit from inside after dark (amber glows at night).
  const out = r * 1.04, fx = Math.sin(facing), fz = Math.cos(facing);
  const at = (across, up, extra = 0) => [x + fx * (out + extra) + Math.cos(facing) * across, y + high * .5 + up, z + fz * (out + extra) - Math.sin(facing) * across];
  const s = r / .16, glow = (p, size, rotation, radius) => box("amber", p, size, rotation, radius, lamp ? "porch-lamp" : null);
  for (const side of [-1, 1]) glow(at(side * .055 * s, .045 * s), [.05 * s, .045 * s, .02], [0, facing, side * .5], .004);
  glow(at(0, 0), [.026 * s, .03 * s, .02], [0, facing, Math.PI / 4], .003);
  glow(at(0, -.05 * s), [.13 * s, .035 * s, .02], [0, facing, 0], .006);
  for (const across of [-.04, .04]) box("pumpkinDeep", at(across * s, -.04 * s, .004), [.022 * s, .02 * s, .02], [0, facing, 0], .002);
}

// The two porch lanterns: carved pumpkins hanging from the porch roof on
// chains, an iron handle over each. Their faces are the porch lamps.
for (const x of LANTERNS) {
  const r = .15, high = r * 1.5, y = LANTERN_Y - high / 2, z = LANTERN_Z;
  const from = LANTERN_Y + high / 2 + .12, links = Math.ceil((porchCeiling(z) - from) / .07);
  for (let k = 0; k <= links; k += 1) piece("metal", [x, from + k * .07, z], [.018, .06, .018], [0, k * .8, 0]);
  for (let i = 0; i <= 8; i += 1) {
    const a = Math.PI * i / 8;
    piece("metal", [x + Math.cos(a) * r * .9, LANTERN_Y + high / 2 - .02 + Math.sin(a) * .12, z], [.022, .022, .022]);
  }
  pumpkin(x, y, z, r, { face: true, facing: 0, lamp: true });
}

// ---------- Ghosts, bats and cobwebs ----------

// A little sheet ghost: a round head, a sheet flaring to a wavy hem, two
// dark eyes and a small round mouth, arms out. It faces `facing`.
function ghost(x, y, z, size = 1, facing = 0) {
  const s = size, fx = Math.sin(facing), fz = Math.cos(facing);
  cylinder("ivory", [x, y + .14 * s, z], .085 * s, .07 * s);
  stud("ivory", [x, y + .19 * s, z], .07 * s, .05 * s, [0, 0, 0]);
  for (let i = 0; i < 4; i += 1) cylinder("ivory", [x, y + (.1 - i * .045) * s, z], (.09 + i * .012) * s, .05 * s);
  for (let i = 0; i < 6; i += 1) {
    const a = i * TAU / 6 + facing;
    cylinder("ivory", [x + Math.sin(a) * .08 * s, y - .1 * s - (i % 2) * .02 * s, z + Math.cos(a) * .08 * s], .035 * s, .06 * s);
  }
  for (const side of [-1, 1]) {
    stud("metal", [x + fx * .085 * s + Math.cos(facing) * side * .03 * s, y + .15 * s, z + fz * .085 * s - Math.sin(facing) * side * .03 * s], .014 * s, .012 * s, [Math.PI / 2, facing, 0]);
    box("ivory", [x + Math.cos(facing) * side * .11 * s, y + .06 * s, z - Math.sin(facing) * side * .11 * s], [.07 * s, .03 * s, .035 * s], [0, facing, side * -.5], .01);
  }
  stud("metal", [x + fx * .09 * s, y + .1 * s, z + fz * .09 * s], .012 * s, .01 * s, [Math.PI / 2, facing, 0]);
}

// A bat with its wings out, facing `facing`; `fold` brings the wings up.
function bat(x, y, z, size = 1, facing = 0, fold = .35) {
  const s = size, c = Math.cos(facing), sn = Math.sin(facing);
  box("metal", [x, y, z], [.05 * s, .07 * s, .045 * s], [0, facing, 0], .015);
  for (const side of [-1, 1]) {
    piece("metal", [x + c * side * .02 * s, y + .05 * s, z - sn * side * .02 * s], [.014 * s, .03 * s, .012 * s], [0, facing, side * .3]);
    stud("gold", [x + sn * .024 * s + c * side * .012 * s, y + .015 * s, z + c * .024 * s - sn * side * .012 * s], .006 * s, .006 * s, [Math.PI / 2, facing, 0]);
    // Three scallops of wing, stepping down towards the tip.
    for (let k = 0; k < 3; k += 1) {
      const along = (.06 + k * .05) * s, up = (Math.sin(fold) * along) - k * .008 * s;
      piece("metal", [x + c * side * along, y + up, z - sn * side * along], [.055 * s, .05 * s - k * .008 * s, .008 * s], [0, facing, side * (fold + k * .15)]);
    }
  }
}

// A cobweb across a corner: spokes from the corner and threads looping
// between them. `a` and `b` are the two directions the corner opens along.
function cobweb(corner, a, b, size) {
  const C = v3(corner), A = v3(a).normalize(), B = v3(b).normalize(), spokes = 5;
  const ends = [];
  for (let i = 0; i < spokes; i += 1) {
    const t = i / (spokes - 1), dir = A.clone().multiplyScalar(1 - t).add(B.clone().multiplyScalar(t)).normalize();
    ends.push(dir);
    stem([C.toArray(), C.clone().addScaledVector(dir, size).toArray()], .006, "ivory");
  }
  for (const k of [.35, .62, .88]) {
    for (let i = 1; i < spokes; i += 1) {
      const p = C.clone().addScaledVector(ends[i - 1], size * k), q = C.clone().addScaledVector(ends[i], size * k);
      const sag = p.clone().lerp(q, .5).lerp(C, .08);
      stem([p.toArray(), sag.toArray(), q.toArray()], .005, "ivory");
    }
  }
}

// Bats round the turret's hat and on the cresting, a ghost at the turret's
// top window, cobwebs in the porch's corners and on the gate posts.
bat(-2.9, 6.2, 1.9, 1.3, .6, .5);
bat(-1.45, 6.75, 1.1, 1.1, -.4, .2);
bat(-2.55, 7.35, .55, .9, .3, .6);
bat(.4, DECK + .4, HF - INSET + .03, 1, 0, .9);
bat(-1.0, DECK + .38, HF - INSET + .03, .9, .2, 1.0);
ghost(...lean([TX + Math.sin(.55) * (TR + .05), 3.85, TZ + Math.cos(.55) * (TR + .05)]), .75, .55);
cobweb([-PORCH_X + .04, PORCH_TOP - .04, PORCH_FRONT - .1], [1, 0, 0], [0, -1, 0], .32);
cobweb([PORCH_X - .04, PORCH_TOP - .04, PORCH_FRONT - .1], [-1, 0, 0], [0, -1, 0], .28);
cobweb([-.98, 1.0, 4.08], [-1, 0, 0], [0, -1, 0], .3);
cobweb([.98, 1.0, 4.08], [1, 0, 0], [0, -1, 0], .26);
// A little spider letting itself down on a thread from the porch roof.
stem([[.3, PORCH_TOP - .02, PORCH_FRONT - .2], [.3, 1.35, PORCH_FRONT - .2]], .005, "ivory");
stud("metal", [.3, 1.32, PORCH_FRONT - .2], .025, .035, [0, 0, 0]);
for (let i = 0; i < 4; i += 1) for (const side of [-1, 1]) piece("metal", [.3 + side * .04, 1.32 - .015 + i * .01, PORCH_FRONT - .2 + (i - 1.5) * .012], [.05, .008, .008], [0, (i - 1.5) * .3, side * .5]);

// A broom leaning by the door.
{
  const foot = [.62, PORCH_FLOOR + .02, HF + .16], head = [.5, PORCH_FLOOR + 1.25, HF + .1];
  stem([foot, head], .03, "wood");
  for (let i = 0; i < 9; i += 1) piece("gold", [foot[0] + between(-.05, .05), foot[1] + .1, foot[2] + between(-.03, .03)], [.012, .24, .012], [between(-.25, .25), 0, between(-.3, .3)]);
  piece("roseDeep", [foot[0] - .005, foot[1] + .2, foot[2]], [.13, .03, .06]);
}

// ---------- The yard ----------
kit.reseed(-1031);
kit.flagstones(-.62, .62, PORCH_FRONT + .76, 4.3, 3);
kit.frontRailing();
kit.hedge(false, -5.15, -3.95, 3.85);
kit.hedge(false, 5.15, -3.95, 3.85);
kit.hedge(true, -4.0, -4.92, 4.92);
kit.mailbox(1.68, 3.72);
kit.frontGate();

// Pumpkins down both sides of the path, carved ones looking at it, and a
// little one on the mailbox post's foot.
for (const side of [-1, 1]) {
  [[3.32, .13, true], [3.62, .1, false], [3.9, .12, true]].forEach(([z, r, face], i) => {
    pumpkin(side * between(.82, .9), LAWN, z + between(-.03, .03), r, { face, facing: -side * Math.PI / 2 + between(-.3, .3), tilt: between(0, 1) });
  });
}
pumpkin(1.42, LAWN, 3.88, .09, { face: true, facing: .3 });
// Two at the foot of the steps and one on the porch by the door.
pumpkin(-.8, LAWN, PORCH_FRONT + .36, .12, { face: true, facing: .25 });
pumpkin(.82, LAWN, PORCH_FRONT + .58, .1, { face: false, tilt: .4 });
pumpkin(-.62, PORCH_FLOOR + .03, HF + .25, .1, { face: true, facing: .15 });

// A pumpkin patch on the left of the lawn: big and small pumpkins on curling vines.
{
  const patch = [[-3.2, 2.2, .2, true, .5], [-3.75, 2.75, .15, false], [-2.7, 2.95, .13, true, .2], [-4.2, 2.1, .12, false], [-3.4, 3.15, .1, false], [-4.35, 3.1, .16, true, .7], [-3.0, 1.7, .1, false]];
  for (const [x, z, r, face, facing = 0] of patch) pumpkin(x, LAWN, z, r, { face, facing, tilt: between(0, 1) });
  for (let k = 0; k < 6; k += 1) {
    const points = [];
    let x = -3.6 + between(-.6, .6), z = 2.5 + between(-.5, .5), a = between(0, TAU);
    for (let i = 0; i < 9; i += 1) {
      points.push([x, LAWN + .02, z]);
      a += between(-.9, .9); x += Math.cos(a) * .13; z += Math.sin(a) * .13;
      if (i % 2) piece(kit.leafTone(), [x, LAWN + .04, z], [between(.08, .12), .014, between(.06, .09)], [between(-.4, .4), between(0, Math.PI), between(-.4, .4)]);
      if (i % 3 === 2) stud("sageLight", [x + .03, LAWN + .05, z], .015, .02, [0, 0, 0]);
    }
    stem(points, .018, "sage");
  }
}

// Headstones on the right of the lawn: round-topped, a little askew, with
// grass at their feet; a ghost peeks out from behind the tallest.
{
  const stones = [[3.0, 2.15, .5, .38, .1], [3.6, 2.45, .62, .42, -.12], [4.2, 2.2, .44, .34, .18], [3.35, 3.0, .4, .32, -.08]];
  for (const [x, z, high, wide, tip] of stones) {
    // Tipped about its foot: everything on it is placed in its own frame.
    const turn = -.25, q = qOf(0, turn, 0).multiply(qOf(0, 0, tip)), rotation = eulerOf(q);
    const at = (lx, ly, lz) => v3([lx, ly, lz]).applyQuaternion(q).add(v3([x, LAWN - .03, z])).toArray();
    const tone = rand() < .5 ? "stone" : "pearl", slab = high - wide / 2;
    box(tone, at(0, slab / 2, 0), [wide, slab, .1], rotation, .02);
    cylinder(tone, at(0, slab, 0), wide / 2, .1, eulerOf(q.clone().multiply(qOf(Math.PI / 2, 0, 0))));
    box("roofPale", at(0, slab * .8, .052), [wide * .45, .03, .01], rotation, .003);
    box("roofPale", at(0, slab * .62, .052), [wide * .3, .025, .01], rotation, .003);
    for (let i = 0; i < 7; i += 1) piece(rand() < .5 ? "sage" : "sageLight", [x + between(-wide / 2, wide / 2), LAWN + .04, z + between(.04, .12)], [.012, between(.06, .11), .02], [between(-.3, .3), between(0, Math.PI), between(-.3, .3)]);
  }
  ghost(3.82, LAWN + .58, 2.25, .85, -.3);
}

// A cauldron on three legs by the porch, a fire of amber under it and green
// bubbles on top.
{
  const x = 2.55, z = 2.35;
  for (const a of [0, TAU / 3, 2 * TAU / 3]) piece("metal", [x + Math.sin(a) * .16, LAWN + .1, z + Math.cos(a) * .16], [.03, .22, .03], [Math.cos(a) * .2, 0, -Math.sin(a) * .2]);
  for (let i = 0; i < 5; i += 1) cylinder("metal", [x, LAWN + .2 + i * .055, z], .17 + Math.sin((i + .5) / 5 * Math.PI) * .05, .06);
  cylinder("metal", [x, LAWN + .48, z], .17, .03);
  cylinder("sageLight", [x, LAWN + .47, z], .14, .02);
  for (let i = 0; i < 6; i += 1) {
    const a = between(0, TAU), d = between(0, .1);
    stud(rand() < .5 ? "sageLight" : "leafLight", [x + Math.sin(a) * d, LAWN + .5 + between(0, .04), z + Math.cos(a) * d], between(.02, .035), .03, [0, 0, 0]);
  }
  for (let i = 0; i < 5; i += 1) {
    const a = i * TAU / 5;
    box("wood", [x + Math.sin(a) * .1, LAWN + .03, z + Math.cos(a) * .1], [.2, .04, .04], [0, a, 0], .01);
    box("amber", [x + Math.sin(a + .6) * .05, LAWN + .1, z + Math.cos(a + .6) * .05], [.04, between(.08, .14), .04], [between(-.2, .2), a, between(-.2, .2)], .01);
  }
}

// The bare old tree in the back corner, where the wisteria grows behind the
// other houses: a twisting trunk, crooked branches, little ghosts and lanterns
// hanging from them, a bat asleep upside down.
{
  const x = 4.25, z = -3.15;
  for (const phase of [0, 2.2]) {
    const trunk = [];
    for (let i = 0; i <= 9; i += 1) {
      const t = i / 9;
      trunk.push([x + Math.sin(t * 4 + phase) * .09 + Math.sin(t * 2) * .12, LAWN + t * 2.0, z + Math.cos(t * 4 + phase) * .08]);
    }
    for (let i = 1; i < trunk.length; i += 1) stem([trunk[i - 1], trunk[i]], .14 - i * .008, i % 3 ? "wood" : "roofPale");
  }
  for (let i = 0; i < 5; i += 1) {
    const a = i * TAU / 5 + between(-.4, .4);
    stem([[x, LAWN + .14, z], [x + Math.cos(a) * .28, LAWN + .01, z + Math.sin(a) * .28]], .07, "wood");
  }
  const top = [x + Math.sin(2) * .12, LAWN + 2.0, z], tips = [];
  for (let i = 0; i < 7; i += 1) {
    const a = i * TAU / 7 + between(-.3, .3), length = between(.8, 1.2);
    let p = [top[0], top[1] - .2, top[2]];
    const path = [p];
    for (let k = 1; k <= 4; k += 1) {
      const t = k / 4;
      p = [top[0] + Math.cos(a + Math.sin(k * 1.7) * .3) * length * t, top[1] + .1 + t * between(.15, .55) - (k === 4 ? .15 : 0), top[2] + Math.sin(a + Math.sin(k * 1.7) * .3) * length * t];
      path.push(p);
    }
    stem(path, .075 - .02, "wood");
    tips.push(path[2], path[4]);
    // Twigs off the branch, bare.
    for (let k = 1; k < 4; k += 1) {
      const [px, py, pz] = path[k], b = a + (k % 2 ? .9 : -.9);
      stem([path[k], [px + Math.cos(b) * .25, py + between(.08, .2), pz + Math.sin(b) * .25]], .022, "wood");
    }
  }
  // Ghosts and lanterns hang on threads from the branches.
  tips.forEach(([px, py, pz], i) => {
    if (i % 2 === 0 && i < 9) {
      const drop = between(.3, .5);
      stem([[px, py, pz], [px, py - drop, pz]], .006, "ivory");
      if (i % 4 === 0) ghost(px, py - drop - .2, pz, .7, between(-.6, .6) + .8);
      else {
        piece("metal", [px, py - drop - .02, pz], [.07, .02, .07]);
        box("amber", [px, py - drop - .1, pz], [.08, .12, .08], [0, 0, 0], .015);
        piece("metal", [px, py - drop - .17, pz], [.07, .02, .07]);
      }
    }
  });
  bat(top[0] + .55, top[1] + .02, top[2] + .3, .9, .8, -1.1);
  // Leaves fallen round its foot.
  for (let i = 0; i < 40; i += 1) {
    const a = between(0, TAU), d = between(.25, 1.3);
    piece(["pumpkin", "pumpkinDeep", "gold", "wood", "roseDeep"][Math.floor(rand() * 5)], [x + Math.cos(a) * d, LAWN + .006, z + Math.sin(a) * d], [between(.05, .08), .01, between(.03, .05)], [0, between(0, Math.PI), 0]);
  }
}

// Mist lying low over the lawn: overlapping pale discs round the house, down
// the path, among the headstones and the pumpkins, and under the tree. The
// page shows it only after dark.
// Each wisp is a few discs stacked smaller and higher, so it is thickest in
// the middle and thins out at its edge.
for (const [x, z, spread, n] of [[0, 2.9, .5, 3], [-2.6, 2.4, 1.2, 5], [3.5, 2.6, .9, 4], [4.1, -2.8, .9, 4], [2.6, -.4, .8, 3], [-3.0, -1.0, 1.0, 4], [0, -2.5, 1.4, 4], [-1.5, 3.4, .6, 2], [1.6, 3.2, .6, 2]]) {
  for (let i = 0; i < n; i += 1) {
    const cx = x + between(-spread, spread), cz = z + between(-spread * .7, spread * .7), R = between(.4, .7);
    for (let k = 0; k < 5; k += 1) cylinder("mist", [cx + between(-.06, .06), LAWN + .03 + k * .035, cz + between(-.06, .06)], R * (1 - k * .17), .02);
  }
}

// Leaves blown over the lawn, and grass tufts on what's open.
const taken = (x, z) =>
  (Math.abs(x) < HX + .3 && z > HB - .3 && z < HF + .3) || (Math.abs(x) < PORCH_X + .25 && z < PORCH_FRONT + .9)
  || Math.hypot(x - TX, z - TZ) < TR + .35 || (Math.abs(x) < .72 && z > 2.8)
  || Math.hypot(x - 2.55, z - 2.35) < .35                                          // cauldron
  || (x > 2.7 && x < 4.5 && z > 1.95 && z < 3.2)                                    // headstones
  || (x < -2.5 && x > -4.6 && z > 1.5 && z < 3.4)                                   // pumpkin patch
  || Math.hypot(x - 4.25, z + 3.15) < .35
  || Math.abs(x) > 4.88 || z < -3.72 || z > 3.95 || Math.hypot(x - 1.68, z - 3.72) < .32;
for (let placed = 0, tries = 0; placed < 240 && tries < 4000; tries += 1) {
  const x = between(-4.9, 4.9), z = between(-3.7, 3.95);
  if (taken(x, z)) continue;
  placed += 1;
  piece(["pumpkin", "pumpkinDeep", "gold", "wood", "roseDeep", "pumpkin"][Math.floor(rand() * 6)], [x, LAWN + .006, z], [between(.05, .08), .01, between(.03, .05)], [between(-.15, .15), between(0, Math.PI), between(-.15, .15)]);
}
const sign = () => rand() < .5 ? -1 : 1;
kit.grassTufts([
  () => [sign() * between(4.74, 4.87), between(-3.7, 3.9)],
  () => [between(-4.85, 4.85), between(-3.71, -3.6)],
  () => [sign() * between(.73, .8), between(2.85, 3.95)],
  () => [between(-5, 5), between(-3.7, 3.9)],
  () => [between(-5, 5), between(-3.7, 3.9)]
], taken, 110);

const scene = kit.toScene("PorchlitHaunted", colors, { rounding: 1 });
const bytes = await writeGlb(scene, new URL("../public/models/porchlit-haunted.glb", import.meta.url));
const counts = kit.counts();
console.log(`wrote porchlit-haunted.glb (${(bytes / 1024 / 1024).toFixed(2)} MB): ${counts.bricks} bricks, ${counts.round} round, ${counts.fine} fine, ${counts.florets} florets`);
