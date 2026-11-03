import { restingPieces } from './furniture-range.js';

// Default spots that turned out to clash with something, and where they moved.
// A piece still sitting exactly on its old default (and, where a turn is given,
// still turned the old way) was never placed by hand, so it follows the new
// default; anything moved or turned by hand stays where it was put.
export const movedDefaults = {
  // The living-room picture hung where the window's curtain rod ends, so the
  // gathered right curtain covered it. It now hangs on the free wall to the
  // right, above the kitchen rail.
  wallArt: { from: [-1.05, 2.55, -3.72], to: [.3, 2.55, -3.72] },
  // The floor lamp stood in front of the dining table, right on the chair at
  // its near end. It now stands in the corner behind the armchair, its shade
  // turned toward the chair. (Living-room floor pieces use the living area's
  // own frame, which sits at x -1, z +1.6 in the room.)
  lamp: { from: [.5, 0, -2.72], to: [-3.35, 0, -3.6], fromRotationY: 0, toRotationY: -Math.PI / 4 }
};

const close = (a, b) => Math.abs(a - b) < 1e-6;
const same = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => close(v, b[i]));

// The tray, cup and books on the coffee table and the little figure on the
// vanity used to keep their own place in the room, so they stayed behind when
// the piece under them moved. They now keep their place on it. An older save is
// turned over once (`on` marks one that has been), keeping each exactly where it
// stands. Each is drawn around a point, its stored position an offset from it;
// downstairs that point is the living area's origin.
export const nowResting = ['coffeeTray', 'coffeeMug', 'greenBook', 'roseBook', 'bedroomFigure'];
const pivots = { bedroomVanity: [1.4, 0, -3.1], bedroomFigure: [1.4, .98, -3.13] };
const pivotOf = id => pivots[id] || [0, 0, 0];
const add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i]);
// A turn about the vertical, the way a turned group carries what is in it.
const turn = (t, [x, y, z]) => [x * Math.cos(t) + z * Math.sin(t), y, -x * Math.sin(t) + z * Math.cos(t)];
const tidy = v => Math.round(v * 1e6) / 1e6 + 0;
// Where a piece stands in the room and which way it faces, as a save has it.
function placeOf(id, furniture) {
  const item = furniture[id], at = add(pivotOf(id), item.position), r = item.rotationY || 0, on = restingPieces[id]?.on;
  if (!on || item.on !== on || !furniture[on]) return { at, r };
  const base = placeOf(on, furniture);
  return { at: add(base.at, turn(base.r, sub(at, pivotOf(on)))), r: base.r + r };
}
export function restOnSupports(furniture) {
  const out = { ...furniture };
  for (const id of nowResting) {
    const item = furniture[id], on = restingPieces[id].on;
    if (!item?.position || item.on === on || !furniture[on]?.position) continue;
    const here = placeOf(id, furniture), base = placeOf(on, furniture);
    const local = add(turn(-base.r, sub(here.at, base.at)), sub(pivotOf(on), pivotOf(id)));
    out[id] = { ...item, position: local.map(tidy), rotationY: tidy(here.r - base.r), on };
  }
  return out;
}

export function repairLayout(furniture) {
  const out = { ...furniture };
  for (const [id, { from, to, fromRotationY, toRotationY }] of Object.entries(movedDefaults)) {
    const item = out[id];
    if (!same(item?.position, from)) continue;
    if (fromRotationY !== undefined && !close(item.rotationY ?? 0, fromRotationY)) continue;
    out[id] = { ...item, position: [...to], ...(toRotationY !== undefined ? { rotationY: toRotationY } : {}) };
  }
  return restOnSupports(out);
}
