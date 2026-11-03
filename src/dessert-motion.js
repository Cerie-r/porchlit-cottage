import * as THREE from 'three';
import {ROLES} from './brick-recipe.js';
import {HAND_MAX} from './dessert-recipe.js';

// What the steps of making a dessert by hand share: easing, the little buzz
// on a phone, the colours of batter as it is whisked and baked, where things
// stand in the kitchen, and how a spot on the top of a dessert becomes a mark
// in its recipe. No drawing here (dessert-steps.jsx, dessert-decorate.jsx).

export const TAU = Math.PI * 2;
export const ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
export const easeIn = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u;
export const easeOut = u => u <= 0 ? 0 : u >= 1 ? 1 : 1 - (1 - u) * (1 - u);
export const span = (t, a, b) => (t - a) / (b - a);
export const buzz = ms => {try {navigator.vibrate?.(ms);} catch {}};

// ---- each kind of dessert is one line ----
// The steps are the same for every kind; a kind only says how many eggs (and
// whether just the whites), what its raw batter looks like, what it is baked
// in, whether it is turned out upside down ('flip') or lifted out ('lift'),
// and how it is finished: the word, the tool, and what to say. A new kind is a
// new line here and a new shape in dessert-model.jsx. fit is how much the tin
// grows on its way to the plate, so what comes out is the dessert's own size;
// tall, if given, is how much taller it grows, so a tin turned over the plate
// covers all of what comes out of it.
export const KINDS = {
  cake: {eggs: 2, raw: '#f3dc9c', out: 'flip', finish: '抹面', tool: 'spatula', fit: 1.18, tall: 1.33, finishHint: '拿抹刀在上面画圈，把奶油抹开'},
  tart: {eggs: 1, raw: '#ecd5a8', out: 'lift', finish: '填馅', tool: 'spatula', fit: 1.16, finishHint: '画圈，把奶油馅填进塔皮里'},
  pudding: {eggs: 2, raw: '#f5d887', out: 'flip', finish: '淋焦糖', tool: 'jug', fit: 1.02, tall: 1.04, finishHint: '画圈，把焦糖淋上去'},
  macaron: {eggs: 2, whites: true, raw: '#fffaf0', out: 'lift', finish: '夹馅', tool: 'bag', fit: 1, finishHint: '画圈，给饼壳夹上馅'},
  // Cream puffs are filled, not spread: hold the nozzle in each one (FillStep).
  puff: {eggs: 3, raw: '#f1d8a2', out: 'lift', finish: '灌馅', tool: 'nozzle', fit: 1, finishHint: '按住一只泡芙不放，往里灌奶油'}
};
export const kindOf = d => KINDS[d.base] || KINDS.cake;
// How much it rises in the oven, from what goes in to how it comes out, over
// the first few seconds. Cream puffs puff out sideways as well as up.
const RISE = {cake: [.55, 1], tart: [1, 1.04], pudding: [.9, 1], macaron: [.8, 1.25], puff: [.35, 1, 1, 1.45]};
export function riseAt(base, seconds) {
  const [y0, y1, w0 = 1, w1 = 1] = RISE[base] || RISE.cake, u = easeOut(Math.min(1, Math.max(0, seconds) / 4.5));
  return {y: y0 + (y1 - y0) * u, w: w0 + (w1 - w0) * u};
}
// On what a tin holds: the whole batter rises, or each of the little mounds
// on a tray (a group marked each) rises in its own place.
export function applyRise(group, base, seconds) {
  if (!group) return;
  const {y, w} = riseAt(base, seconds);
  if (group.userData.each) group.children.forEach(c => c.scale.set(w, y, w)); else group.scale.y = y;
}
// The steps, in order; piping, fruit and sprinkles only when it has them.
export function stepsFor(d) {
  const k = kindOf(d);
  return [...(k.eggs ? [['egg', '打蛋']] : []), ['whisk', '搅拌'], ['bake', '烤'], ['unmold', '脱模'], ['frost', k.finish],
    ...(d.cream !== 'none' ? [['pipe', '挤花']] : []), ...(d.fruit !== 'none' ? [['fruit', '水果']] : []), ...(d.sprinkles !== 'none' ? [['sprinkle', '糖粒']] : [])];
}

// ---- colours of the batter as it is made and baked ----
// Plain bodies (golden, cream, wood, white) start from the usual batter; a
// coloured one (pink, lilac...) takes its colour as it is whisked. Baked, it
// ends as the dessert will look: the body's own colour, paler, browner or
// burnt, the same tint the dessert model uses.
const PLAIN = ['gold', 'cream', 'wood', 'white'];
const tint = (hex, toward, k) => new THREE.Color(hex).lerp(new THREE.Color(toward), k);
export function batterColors(d) {
  const role = ROLES[d.c.body]?.color || ROLES.gold.color;
  return {
    mix: kindOf(d).whites ? new THREE.Color('#efe8d4') : new THREE.Color('#f1c457'),
    raw: PLAIN.includes(d.c.body) ? new THREE.Color(kindOf(d).raw) : tint(kindOf(d).raw, role, kindOf(d).whites ? .75 : .55),
    light: tint(role, '#fffaf0', .32), golden: new THREE.Color(role), deep: tint(role, '#6b3f26', .3), burnt: tint(role, '#2a1a12', .62)
  };
}
// Seconds in the oven: pale at first, golden by five, deep by nine, burnt by
// twelve and a half. What it is called depends on when it came out.
export const bakeLevel = s => s < 3.6 ? 'light' : s < 7.4 ? 'golden' : s < 11 ? 'deep' : 'burnt';
export const BURNING = 11;
export function bakeColor(c, s, out) {
  const keys = [[0, c.raw], [2.2, c.light], [5, c.golden], [9, c.deep], [12.5, c.burnt]];
  for (let i = 1; i < keys.length; i++) if (s <= keys[i][0]) return out.copy(keys[i - 1][1]).lerp(keys[i][1], ease(span(s, keys[i - 1][0], keys[i][0])));
  return out.copy(c.burnt);
}

// ---- where things stand on the counter ----
// The oven is in the middle; the tin waits on its left, and further left is
// the turntable where it is turned out and decorated.
export const COUNTER_AT = new THREE.Vector3(-1.9, 0, 1.38);
export const DECO = new THREE.Vector3(-3.75, 0, .45);
export const TURNTABLE_TOP = .16;

// ---- a spot on the top of the dessert, as a mark in its recipe ----
// top is dessertTop() of the dessert, placed at `at` in the room. A mark is
// [turn in 32nds, distance out in tenths]; anything past the edge comes in to
// the edge.
export function markAt(point, top, at = DECO) {
  const dx = point.x - (at.x + top.p[0]), dz = point.z - (at.z + top.p[2]);
  const turn = ((Math.atan2(dx, dz) - top.turn) % TAU + TAU) % TAU;
  return [Math.round(turn / TAU * 32) % 32, Math.min(10, Math.round(Math.hypot(dx, dz) / top.R * 10))];
}
// Where a mark is in the room, for drawing what is being placed.
export function markPoint([a, r], top, at = DECO, lift = TURNTABLE_TOP) {
  const phi = a * TAU / 32 + top.turn, d = r / 10 * top.R;
  return new THREE.Vector3(at.x + top.p[0] + Math.sin(phi) * d, lift + top.p[1], at.z + top.p[2] + Math.cos(phi) * d);
}
// Adding a mark: not on top of one already there, and not past the most a
// layer can hold.
export function addMark(list, mark, layer) {
  if (list.length >= HAND_MAX[layer] || list.some(m => m[0] === mark[0] && m[1] === mark[1])) return list;
  return [...list, mark];
}
// How many a layer usually has. A dragged shell border is spaced so that this
// many go once round; placing is otherwise as many as she likes.
export function enoughFor(d, layer) {
  const small = d.base === 'pudding' || d.base === 'macaron' || d.base === 'puff';
  if (layer === 'cream') return {rosette: small ? (d.base === 'pudding' ? 6 : 5) : 8, dollop: small ? (d.base === 'pudding' ? 5 : 3) : 8, shell: d.base === 'pudding' ? 10 : small ? 9 : 16, swirl: 1}[d.cream] || 0;
  if (layer === 'fruit') return small ? (d.fruit === 'blueberry' ? 3 : 1) : d.fruit === 'blueberry' ? 10 : 4;
  if (layer === 'sprinkles') return 5;
  return 0;
}
