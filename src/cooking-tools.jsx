import React,{useMemo} from 'react';
import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {toolMaterial,Egg,ShellDish} from './dessert-tools.jsx';
import {Taro,TaroCubes,BambooShoot,BambooSlices,WheatEar,Noodles,TeaSprig,TeaLeaves,ExtraBits} from './cooking-pantry-food.jsx';

// The cooking counter: one long worktop that never changes, only what is on it does. From the left, a wash basin
// under a gooseneck tap, a round chopping block with its cleaver, a two-burner hob (a wok on the left ring, a little
// pot on the right) and room for the plate. The food is drawn here too, raw, washed, cut and cooked. Same soft
// plastic as the dessert kitchen (src/dessert-tools.jsx); a tomato is about .65 across, the wok about 2.2. These are
// only drawn: what moves, and when, is up to the steps.

const TAU = Math.PI * 2;
const cache = new Map();
const cached = (key, make) => {if (!cache.has(key)) cache.set(key, make()); return cache.get(key);};
const lathe = (points, segments = 40) => cached(`l:${segments}:${JSON.stringify(points)}`, () => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(.0005, r), y)), segments));
const mat = toolMaterial;
const glassy = (color, opacity, key = '') => cached(`g:${color}:${opacity}:${key}`, () => new THREE.MeshStandardMaterial({color, transparent: true, opacity, roughness: .05, metalness: .1, depthWrite: false}));
const glow = (color, emissive, opacity) => cached(`f:${color}:${emissive}:${opacity}`, () => new THREE.MeshStandardMaterial({color, emissive: new THREE.Color(emissive), emissiveIntensity: 1.4, transparent: true, opacity, depthWrite: false, roughness: 1}));
// A little noise that is the same every time for the same point, so shapes are lumpy but never flicker.
const hash = (...n) => {const s = Math.sin(n.reduce((a, v, i) => a + v * [12.9898, 78.233, 37.719, 4.581][i % 4], 0)) * 43758.5453; return s - Math.floor(s);};

// ---- how the counter looks: the same pieces in three finishes ----
export const LOOKS = {
  // The house's own kitchen, close up: cream lacquer, brass, a black glass hob.
  cream: {label: '奶白一字台', counter: '#fbf3e6', front: '#f4e8d8', door: '#fbf2e5', trim: '#d5b16f', tile: '#fff7ec', grout: '#e6d6c4',
    basin: '#f8f1e6', basinIn: '#fffdf8', band: '#d5b16f', tap: '#d5b16f', block: '#d9b083', blockTop: '#f0d6b2',
    hob: '#3b3236', burner: '#cfae74', knob: '#fbf3e7', wok: '#4b4346', wokIn: '#625a5c', grip: '#a77b55', pot: '#f6eadb', potLid: '#efe0cd',
    plate: '#fffaf2', plateBand: '#d5b16f', cloth: '#e9c6c9'},
  // The dessert kitchen's colours: blush enamel, a pink basin with a raspberry band, gold.
  pink: {label: '粉色小厨房', counter: '#fcebe7', front: '#eabdc3', door: '#f3cfd3', trim: '#d7b07a', tile: '#ffedef', grout: '#efcbd0',
    basin: '#f2cbd0', basinIn: '#fffaf2', band: '#c98f9f', tap: '#dcbb76', block: '#e2c39d', blockTop: '#f3dfc2',
    hob: '#f1c4ca', burner: '#dcbb76', knob: '#fbf3e7', wok: '#5a4b50', wokIn: '#6e5e63', grip: '#e9b6c1', pot: '#f3c9d0', potLid: '#fbdde1',
    plate: '#fffaf2', plateBand: '#c98f9f', cloth: '#f6e7c8'},
  // A country kitchen: sage cabinets, a white enamel basin with a blue rim, copper.
  sage: {label: '鼠尾草绿', counter: '#f7f2e8', front: '#b9c7ae', door: '#c6d2bb', trim: '#c99268', tile: '#eef1e8', grout: '#d3dcca',
    basin: '#fbfaf5', basinIn: '#ffffff', band: '#6f8fb4', tap: '#c99268', block: '#c99a6a', blockTop: '#e6c9a2',
    hob: '#f1ece2', burner: '#9a8c7c', knob: '#fbf8f1', wok: '#45403f', wokIn: '#5c5655', grip: '#8d6a4f', pot: '#fbfaf5', potLid: '#6f8fb4',
    plate: '#ffffff', plateBand: '#6f8fb4', cloth: '#dfe7f1'}
};
export const lookOf = id => LOOKS[id] || LOOKS.cream;

// Where things stand on the counter (x left to right, z back to front; the top is at y 0). The bowl is where eggs
// are cracked and beaten (the dessert kitchen's bowl, a little smaller here: BOWL_SCALE).
export const STATION = {
  width: 16, depth: 4, back: -2,
  basin: [-5.75, 0, .25], tap: [-5.75, 0, -1.0],
  block: [-2.75, 0, .2], bowl: [-.3, 0, .3], shelf: [1.2, 0, -1.3],
  hob: [3.75, 0, -.05], wok: [2.8, 0, -.15], pot: [4.7, 0, -.35], knobs: [[3.7, .8], [4.35, .8]],
  plate: [6.75, 0, .45]
};
export const BOWL_SCALE = .78;

// ---- textures, drawn once ----
const canvasTexture = (key, size, draw, repeat) => cached(key, () => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) {t.wrapS = t.wrapT = THREE.RepeatWrapping;}
  return t;
});
// End grain for the top of the block: rings round the heart, a crack or two. White, so its colour is the material's.
const endGrain = () => canvasTexture('grain', 512, (g, n) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n);
  for (let r = 6; r < n / 2; r += 7 + 5 * hash(r)) {
    g.beginPath();
    for (let i = 0; i <= 72; i++) {const a = i / 72 * TAU, w = r * (1 + .025 * Math.sin(a * 3 + r) + .015 * Math.sin(a * 7)); i ? g.lineTo(n / 2 + Math.cos(a) * w, n / 2 + Math.sin(a) * w) : g.moveTo(n / 2 + Math.cos(a) * w, n / 2 + Math.sin(a) * w);}
    g.strokeStyle = `rgba(122,82,44,${.1 + .12 * hash(r, 2)})`; g.lineWidth = 1.2 + 1.6 * hash(r, 3); g.stroke();
  }
  g.strokeStyle = 'rgba(110,72,40,.28)'; g.lineWidth = 1.6;
  for (const a of [.6, 2.9, 4.4]) {g.beginPath(); g.moveTo(n / 2 + Math.cos(a) * n * .12, n / 2 + Math.sin(a) * n * .12); g.lineTo(n / 2 + Math.cos(a + .05) * n * .3, n / 2 + Math.sin(a + .05) * n * .3); g.stroke();}
});
// Square tiles with grout, for the wall behind the counter. Drawn in greys; the material gives the colour.
const tiles = () => canvasTexture('tiles', 256, (g, n) => {
  g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, n, n);
  const k = n / 4;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const shade = 246 + Math.round(9 * hash(i, j));
    g.fillStyle = `rgb(${shade},${shade},${shade})`; g.beginPath(); g.roundRect(i * k + 3, j * k + 3, k - 6, k - 6, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.roundRect(i * k + 9, j * k + 8, k * .36, 5, 3); g.fill();
  }
}, true);

// ---- the counter, its wall and the cupboards under it ----
export function Worktop({look}) {
  const L = lookOf(look), {width: W, depth: D, back} = STATION, front = back + D;
  const wallMap = useMemo(() => {const t = tiles(); if (!t) return null; const c = t.clone(); c.needsUpdate = true; c.repeat.set(W / 1.4, 4.6 / 1.4); return c;}, [W]);
  const doors = [-6.6, -4.2, -1.8, .6, 3, 5.4, 7.15];
  return <group>
    {/* The top, a gold edge along the front, the cupboards beneath with their handles. */}
    <mesh position={[0, -.15, back + D / 2]} receiveShadow material={mat(L.counter, {rough: .55})}><boxGeometry args={[W, .3, D]}/></mesh>
    <mesh position={[0, -.02, front + .005]} material={mat(L.trim, {rough: .3, metal: .5})}><boxGeometry args={[W, .035, .03]}/></mesh>
    <mesh position={[0, -1.7, back + D / 2 - .12]} material={mat(L.front, {rough: .5})} receiveShadow><boxGeometry args={[W - .1, 2.8, D - .24]}/></mesh>
    {doors.map((x, i) => <group key={x} position={[x, -1.62, front - .1]}>
      <mesh material={mat(L.door, {rough: .4})} castShadow><boxGeometry args={[i === doors.length - 1 ? 1.3 : 2.2, 2.4, .08]}/></mesh>
      <mesh position={[0, 0, .05]} material={mat(L.front, {rough: .45})}><boxGeometry args={[i === doors.length - 1 ? .9 : 1.8, 2, .03]}/></mesh>
      <mesh position={[i % 2 ? -.72 : .72, .78, .1]} rotation={[0, 0, Math.PI / 2]} material={mat(L.trim, {rough: .3, metal: .5})}><capsuleGeometry args={[.035, .3, 4, 8]}/></mesh>
    </group>)}
    {/* The tiled wall, a shelf of brass rail with a ladle and a skimmer on it. */}
    <mesh position={[0, 2.3, back - .04]} receiveShadow><planeGeometry args={[W, 4.6]}/><meshStandardMaterial color={L.tile} map={wallMap} roughness={.35}/></mesh>
    <mesh position={[0, .03, back + .02]} material={mat(L.grout, {rough: .6})}><boxGeometry args={[W, .06, .06]}/></mesh>
    <group position={[-1.6, 2.55, back + .14]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={mat(L.trim, {rough: .3, metal: .5})} castShadow><cylinderGeometry args={[.035, .035, 3.6, 12]}/></mesh>
      {[-1.8, 1.8].map(x => <mesh key={x} position={[x, 0, -.08]} rotation={[Math.PI / 2, 0, 0]} material={mat(L.trim, {rough: .3, metal: .5})}><cylinderGeometry args={[.05, .05, .16, 12]}/></mesh>)}
      <group position={[-.7, -.05, .02]}><Ladle color={L.grip}/></group>
      <group position={[.4, -.05, .02]}><Skimmer color={L.grip}/></group>
      <group position={[1.25, -.05, .03]}><Towel color={L.cloth}/></group>
    </group>
  </group>;
}
function Ladle({color}) {
  return <group>
    <mesh position={[0, -.04, 0]} rotation={[0, 0, Math.PI / 2]} material={mat('#dedad3', {rough: .28, metal: .55})}><torusGeometry args={[.06, .012, 6, 14, Math.PI]}/></mesh>
    <mesh position={[0, -.42, 0]} material={mat(color, {rough: .45})} castShadow><capsuleGeometry args={[.035, .55, 4, 8]}/></mesh>
    <mesh position={[0, -.86, .02]} material={mat('#dedad3', {rough: .28, metal: .55})}><cylinderGeometry args={[.016, .016, .3, 6]}/></mesh>
    <mesh position={[0, -1.06, .08]} rotation={[-.3, 0, 0]} material={mat('#dedad3', {rough: .25, metal: .6, side: THREE.DoubleSide})} castShadow><sphereGeometry args={[.17, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2]}/></mesh>
  </group>;
}
function Skimmer({color}) {
  return <group>
    <mesh position={[0, -.04, 0]} rotation={[0, 0, Math.PI / 2]} material={mat('#dedad3', {rough: .28, metal: .55})}><torusGeometry args={[.06, .012, 6, 14, Math.PI]}/></mesh>
    <mesh position={[0, -.42, 0]} material={mat(color, {rough: .45})} castShadow><capsuleGeometry args={[.035, .55, 4, 8]}/></mesh>
    <mesh position={[0, -.84, 0]} material={mat('#dedad3', {rough: .28, metal: .55})}><cylinderGeometry args={[.014, .014, .28, 6]}/></mesh>
    <mesh position={[0, -1.12, .02]} rotation={[Math.PI / 2 - .15, 0, 0]} material={mat('#dedad3', {rough: .3, metal: .55})} castShadow><cylinderGeometry args={[.17, .17, .015, 24]}/></mesh>
    {Array.from({length: 7}, (_, i) => {const a = i / 7 * TAU, r = i ? .09 : 0; return <mesh key={i} position={[Math.cos(a) * r, -1.12 + Math.sin(a) * r * .99, .032]} material={mat('#8c8780')}><circleGeometry args={[.018, 8]}/></mesh>;})}
  </group>;
}
// A tea towel hung over the rail.
function Towel({color}) {
  return <group>
    <mesh position={[0, -.36, .05]} material={mat(color, {rough: .9})} castShadow><boxGeometry args={[.42, .72, .03]}/></mesh>
    <mesh position={[0, -.03, 0]} rotation={[0, Math.PI / 2, 0]} material={mat(color, {rough: .9})}><cylinderGeometry args={[.06, .06, .42, 12, 1, true, 0, Math.PI]}/></mesh>
    {[-.55, -.62].map(y => <mesh key={y} position={[0, y, .067]} material={mat('#ffffff', {rough: .9})}><boxGeometry args={[.42, .025, .005]}/></mesh>)}
  </group>;
}

// ---- the wash basin, the water in it, and the tap ----
const BASIN_OUT = [[0, 0], [.6, 0], [.64, .03], [.68, .08], [.84, .3], [.96, .48], [1.02, .55]];
const BASIN_IN = [[1.01, .56], [.95, .5], [.83, .32], [.67, .1], [.61, .05], [0, .05]];
export const BASIN_FLOOR = .05, BASIN_LIP = .54;
export function basinRadiusAt(y) {
  const pts = [...BASIN_IN].reverse();
  if (y <= pts[0][1]) return pts[0][0];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][1]) {const [r0, y0] = pts[i - 1], [r1, y1] = pts[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0);}
  return pts.at(-1)[0];
}
// water: how full, 0 to 1. running: the tap is on, a stream falls into the middle and rings spread from it.
export function WashBasin({look, water = 0, running = false}) {
  const L = lookOf(look), level = BASIN_FLOOR + .02 + water * (BASIN_LIP - .14), r = basinRadiusAt(level) - .01;
  return <group>
    <mesh geometry={lathe(BASIN_OUT, 48)} material={mat(L.basin, {rough: .25})} castShadow receiveShadow/>
    <mesh geometry={lathe(BASIN_IN, 48)} material={mat(L.basinIn, {rough: .2, side: THREE.DoubleSide})} receiveShadow/>
    <mesh position={[0, .555, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(L.band, {rough: .3})}><torusGeometry args={[1.02, .032, 8, 64]}/></mesh>
    <mesh position={[0, .36, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(L.band, {rough: .3})}><torusGeometry args={[.877, .012, 6, 64]}/></mesh>
    {water > 0 && <mesh position={[0, level, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[r, r, 1]} material={glassy('#cfe6ec', .55, 'water')}><circleGeometry args={[1, 48]}/></mesh>}
    {running && <>
      <mesh position={[0, (TAP_SPOUT + level) / 2, 0]} material={glassy('#e8f5f8', .7, 'stream')}><cylinderGeometry args={[.045, .055, TAP_SPOUT - level, 12, 1, true]}/></mesh>
      {water > 0 && [.14, .26, .4].map((k, i) => <mesh key={k} position={[0, level + .004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glassy('#ffffff', .5 - i * .13, 'ring' + i)}><torusGeometry args={[k, .01, 4, 36]}/></mesh>)}
    </>}
  </group>;
}
// A gooseneck tap standing behind the basin, its spout over the middle of it. on: the lever is turned.
const TAP_PATH = [[0, 0, 0], [0, 1.25, 0], [0, 2.02, .1], [0, 2.32, .52], [0, 2.22, 1.0], [0, 1.92, 1.22], [0, 1.8, 1.25]];
export const TAP_REACH = 1.25, TAP_SPOUT = 1.72;
export function Tap({look, on = false}) {
  const L = lookOf(look), brass = mat(L.tap, {rough: .26, metal: .55});
  const neck = useMemo(() => cached('tap', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(TAP_PATH.map(p => new THREE.Vector3(...p))), 72, .068, 14, false)), []);
  return <group>
    <mesh position={[0, .03, 0]} material={brass} castShadow><cylinderGeometry args={[.17, .2, .06, 24]}/></mesh>
    <mesh geometry={neck} material={brass} castShadow/>
    <mesh position={[0, TAP_SPOUT + .05, 1.25]} material={brass}><cylinderGeometry args={[.085, .078, .12, 16]}/></mesh>
    {/* The lever on the right of the neck: down is off, swung up is on. */}
    <group position={[.06, .85, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={brass}><cylinderGeometry args={[.075, .075, .14, 16]}/></mesh>
      <group position={[.08, 0, 0]} rotation={[0, 0, on ? .95 : .2]}>
        <mesh position={[.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={brass} castShadow><capsuleGeometry args={[.028, .34, 4, 8]}/></mesh>
        <mesh position={[.4, 0, 0]} material={mat(L.knob, {rough: .3})} castShadow><sphereGeometry args={[.06, 14, 10]}/></mesh>
      </group>
    </group>
  </group>;
}

// ---- the chopping block and the cleaver ----
export const BLOCK_R = 1.15, BLOCK_H = .32;
export function ChoppingBlock({look}) {
  const L = lookOf(look), grain = endGrain();
  const top = useMemo(() => cached('blockTop:' + L.blockTop, () => new THREE.MeshStandardMaterial({color: L.blockTop, map: grain, roughness: .75})), [L.blockTop, grain]);
  const side = mat(L.block, {rough: .7});
  return <group>
    <mesh position={[0, BLOCK_H / 2, 0]} material={[side, top, side]} castShadow receiveShadow><cylinderGeometry args={[BLOCK_R, BLOCK_R * 1.02, BLOCK_H, 56]}/></mesh>
    {/* A darker ring where the bark was, a hair below the top. */}
    <mesh position={[0, BLOCK_H - .04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#9d714b', {rough: .8})}><torusGeometry args={[BLOCK_R + .002, .012, 4, 64]}/></mesh>
  </group>;
}
// A Chinese cleaver: the edge along the bottom (y 0) from x -.62 to .62, the spine on top, the handle off the right.
export function Cleaver({look}) {
  const L = lookOf(look), steelBlade = mat('#dfe0dd', {rough: .22, metal: .6}), edge = mat('#f7f7f4', {rough: .15, metal: .65});
  return <group>
    <mesh position={[0, .3, 0]} material={steelBlade} castShadow><boxGeometry args={[1.24, .56, .024]}/></mesh>
    <mesh position={[0, .03, 0]} material={edge}><boxGeometry args={[1.24, .06, .02]}/></mesh>
    <mesh position={[0, .585, 0]} material={steelBlade}><boxGeometry args={[1.24, .03, .034]}/></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[-.44, .44, s * .013]} rotation={[0, s < 0 ? Math.PI : 0, 0]} material={mat('#6d6466', {rough: .6})}><circleGeometry args={[.055, 18]}/></mesh>)}
    <mesh position={[.7, .46, 0]} rotation={[0, 0, Math.PI / 2]} material={mat('#c9c6c0', {rough: .3, metal: .5})}><cylinderGeometry args={[.065, .07, .14, 14]}/></mesh>
    <mesh position={[1.04, .46, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(L.grip, {rough: .45})} castShadow><capsuleGeometry args={[.065, .5, 4, 12]}/></mesh>
    <mesh position={[1.35, .46, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(L.trim, {rough: .3, metal: .5})}><cylinderGeometry args={[.05, .05, .03, 12]}/></mesh>
  </group>;
}

// ---- the hob: black glass (or enamel) with two rings, the knobs at the front ----
export function Hob({look, lit = [0, 0]}) {
  const L = lookOf(look), [wx, , wz] = STATION.wok, [px, , pz] = STATION.pot, [hx, , hz] = STATION.hob;
  return <group>
    <mesh position={[hx, .035, hz]} material={mat(L.hob, {rough: .12, metal: .2})} castShadow receiveShadow><boxGeometry args={[3.7, .07, 2.15]}/></mesh>
    <mesh position={[hx, .002, hz]} material={mat(L.trim, {rough: .3, metal: .5})}><boxGeometry args={[3.78, .05, 2.23]}/></mesh>
    <group position={[wx, .07, wz]}><Burner look={look} size={1} lit={lit[0]}/></group>
    <group position={[px, .07, pz]}><Burner look={look} size={.72} lit={lit[1]}/></group>
  </group>;
}
// One ring: the burner cap, the five arms the pan sits on (their tops at BURNER_TOP), and the flame round the cap
// when lit (0 off, 1 high). The flame stays under the pan: only its height grows, never past the arms.
const FLAMES = 22;
export const BURNER_TOP = .34;
export function Burner({look, size = 1, lit = 0}) {
  const L = lookOf(look), iron = mat('#2e2a2b', {rough: .6, metal: .3}), cap = mat(L.burner, {rough: .35, metal: .45});
  const h = .09 + .1 * Math.min(1, lit);
  return <group scale={size}>
    <mesh position={[0, .02, 0]} material={iron}><cylinderGeometry args={[.44, .48, .04, 32]}/></mesh>
    <mesh position={[0, .07, 0]} material={cap}><cylinderGeometry args={[.3, .33, .07, 32]}/></mesh>
    <mesh position={[0, .115, 0]} material={iron}><cylinderGeometry args={[.2, .24, .03, 32]}/></mesh>
    <mesh position={[0, .07, 0]} rotation={[-Math.PI / 2, 0, 0]} material={iron}><torusGeometry args={[.82, .028, 6, 48]}/></mesh>
    {Array.from({length: 5}, (_, i) => {const a = i / 5 * TAU + .3; return <group key={i} position={[Math.cos(a) * .64, 0, Math.sin(a) * .64]} rotation={[0, -a, 0]}>
      <mesh position={[0, .07 + (BURNER_TOP - .07) / 2, 0]} material={iron} castShadow><boxGeometry args={[.42, BURNER_TOP - .07, .05]}/></mesh>
    </group>;})}
    {lit > 0 && <group>
      {Array.from({length: FLAMES}, (_, i) => {const a = i / FLAMES * TAU; return <group key={i} position={[Math.cos(a) * .33, .12, Math.sin(a) * .33]} rotation={[0, -a, -.45]}>
        <mesh position={[0, h / 2, 0]} material={glow('#79acff', '#3f7dff', .78)}><coneGeometry args={[.05, h, 8]}/></mesh>
        <mesh position={[0, h / 4, 0]} material={glow('#dce9ff', '#9cc0ff', .85)}><coneGeometry args={[.025, h / 2, 6]}/></mesh>
      </group>;})}
    </group>}
    {/* Always there, dark until lit: a light appearing would make every material in the scene be rebuilt. */}
    <pointLight position={[0, .25, 0]} color="#ffb070" intensity={1.2 * lit} distance={2.4} decay={1.6}/>
  </group>;
}
// A knob on the hob's front strip, a bar to turn it by; turned is how far, 0 to 1 (a quarter turn and a bit).
export function Knob({look, turned = 0}) {
  const L = lookOf(look), gold = mat(L.trim, {rough: .3, metal: .5}), body = mat(L.knob, {rough: .32});
  return <group>
    <mesh position={[0, .015, 0]} material={gold}><cylinderGeometry args={[.25, .26, .03, 32]}/></mesh>
    {Array.from({length: 4}, (_, i) => <mesh key={i} position={[Math.sin(-i * .6) * .3, .02, -Math.cos(-i * .6) * .3]} material={i ? mat('#e3a05e', {rough: .5}) : mat('#8fa3c7', {rough: .5})}><cylinderGeometry args={[.018 + i * .006, .018 + i * .006, .02, 10]}/></mesh>)}
    <group rotation={[0, -turned * 1.8, 0]}>
      <mesh position={[0, .07, 0]} material={body} castShadow><cylinderGeometry args={[.2, .22, .08, 32]}/></mesh>
      <mesh position={[0, .14, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, .8]} material={body} castShadow><capsuleGeometry args={[.05, .26, 4, 12]}/></mesh>
      <mesh position={[0, .19, -.15]} material={gold}><sphereGeometry args={[.026, 10, 8]}/></mesh>
    </group>
  </group>;
}

// ---- the wok, the spatula, the little pot ----
const WOK_OUT = [[0, 0], [.34, 0], [.6, .04], [.82, .13], [.98, .27], [1.07, .42], [1.1, .49]];
const WOK_IN = [[1.08, .5], [1.04, .43], [.95, .29], [.79, .16], [.58, .08], [.34, .045], [0, .04]];
export const WOK_FLOOR = .04, WOK_HANDLE = -2.1;
// The lip: the steel ring round the top of the wok, how far out and how high, and how thick.
export const WOK_LIP = [1.095, .495], WOK_LIP_R = .022;
// How high the inside of the wok is at a distance r from its middle: what slides about in it rests on this.
export function wokInsideAt(r) {
  for (let i = WOK_IN.length - 1; i > 0; i--) {
    const [r0, y0] = WOK_IN[i], [r1, y1] = WOK_IN[i - 1];
    if (r <= r1) return y0 + (y1 - y0) * (Math.max(r, r0) - r0) / (r1 - r0);
  }
  return WOK_IN[0][1];
}
export function Wok({look}) {
  const L = lookOf(look), steel = mat('#cfcac2', {rough: .3, metal: .55});
  return <group>
    <mesh geometry={lathe(WOK_OUT, 48)} material={mat(L.wok, {rough: .45, metal: .4})} castShadow receiveShadow/>
    <mesh geometry={lathe(WOK_IN, 48)} material={mat(L.wokIn, {rough: .32, metal: .5, side: THREE.DoubleSide})} receiveShadow/>
    <mesh position={[0, WOK_LIP[1], 0]} rotation={[-Math.PI / 2, 0, 0]} material={steel}><torusGeometry args={[WOK_LIP[0], WOK_LIP_R, 6, 64]}/></mesh>
    {/* The long handle towards the front left (towards whoever cooks), the little ear opposite it. */}
    <group rotation={[0, WOK_HANDLE, 0]}>
      <mesh position={[1.36, .52, 0]} rotation={[0, 0, -(Math.PI / 2 - .22)]} material={steel} castShadow><cylinderGeometry args={[.045, .05, .6, 12]}/></mesh>
      <mesh position={[1.98, .67, 0]} rotation={[0, 0, -(Math.PI / 2 - .22)]} material={mat(L.grip, {rough: .45})} castShadow><capsuleGeometry args={[.075, .62, 4, 12]}/></mesh>
      <mesh position={[-1.1, .45, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} material={steel}><torusGeometry args={[.11, .025, 6, 16, Math.PI]}/></mesh>
    </group>
  </group>;
}
// 锅铲: the flat blade at the origin pointing down, the handle going up behind it.
export function Turner({look}) {
  const L = lookOf(look), steel = mat('#dedad3', {rough: .25, metal: .6});
  const blade = useMemo(() => cached('turner', () => {const s = new THREE.Shape(); s.moveTo(-.2, 0); s.lineTo(.2, 0); s.lineTo(.17, .3); s.quadraticCurveTo(0, .36, -.17, .3); s.closePath(); return new THREE.ExtrudeGeometry(s, {depth: .016, bevelEnabled: false});}), []);
  return <group>
    <mesh geometry={blade} position={[0, 0, -.008]} material={steel} castShadow/>
    <mesh position={[0, .52, 0]} material={steel}><cylinderGeometry args={[.018, .022, .44, 8]}/></mesh>
    <mesh position={[0, 1.05, 0]} material={mat(L.grip, {rough: .45})} castShadow><capsuleGeometry args={[.05, .6, 4, 10]}/></mesh>
  </group>;
}
const POT = [[0, 0], [.6, 0], [.66, .04], [.68, .58], [.72, .6], [.7, .62], [.64, .6], [.64, .06], [0, .05]];
export function Pot({look, lid = true}) {
  const L = lookOf(look);
  return <group>
    <mesh geometry={lathe(POT, 40)} material={mat(L.pot, {rough: .28, side: THREE.DoubleSide})} castShadow receiveShadow/>
    <mesh position={[0, .3, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(L.band, {rough: .3})}><torusGeometry args={[.676, .014, 6, 48]}/></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * .7, .5, 0]} rotation={[Math.PI / 2, 0, -s * Math.PI / 2]} material={mat(L.trim, {rough: .3, metal: .5})}><torusGeometry args={[.1, .025, 6, 14, Math.PI]}/></mesh>)}
    {lid && <group position={[0, .6, 0]}>
      <mesh position={[0, .06, 0]} scale={[1, .3, 1]} material={mat(L.potLid, {rough: .3})} castShadow><sphereGeometry args={[.7, 32, 12, 0, TAU, 0, Math.PI / 2]}/></mesh>
      <mesh position={[0, .3, 0]} material={mat(L.trim, {rough: .3, metal: .5})} castShadow><sphereGeometry args={[.09, 14, 10]}/></mesh>
    </group>}
  </group>;
}
export function Plate({look}) {
  const L = lookOf(look);
  return <group>
    <mesh geometry={lathe([[0, 0], [.55, 0], [.6, .02], [.63, .045], [.9, .1], [1.0, .13], [1.02, .15], [.98, .156], [.88, .12], [.6, .065], [0, .06]], 48)} material={mat(L.plate, {rough: .25, side: THREE.DoubleSide})} castShadow receiveShadow/>
    <mesh position={[0, .146, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(L.plateBand, {rough: .3, metal: .3})}><torusGeometry args={[.985, .012, 6, 64]}/></mesh>
  </group>;
}
// Oil in a glass bottle, salt in a lidded jar.
export function OilAndSalt({look}) {
  const L = lookOf(look);
  return <group>
    <group position={[-.3, 0, 0]}>
      <mesh geometry={lathe([[0, 0], [.17, 0], [.19, .03], [.19, .42], [.1, .56], [.06, .62], [.065, .7], [0, .7]], 24)} material={glassy('#fbf7ee', .4, 'bottle')}/>
      <mesh geometry={lathe([[0, .02], [.165, .02], [.165, .4], [.09, .5], [0, .5]], 24)} material={glassy('#e4ad3c', .85, 'oil')}/>
      <mesh position={[0, .73, 0]} material={mat(L.grip, {rough: .6})} castShadow><cylinderGeometry args={[.05, .055, .08, 12]}/></mesh>
    </group>
    <group position={[.22, 0, .05]}>
      <mesh geometry={lathe([[0, 0], [.19, 0], [.21, .03], [.21, .3], [.19, .32], [0, .32]], 28)} material={mat(L.basin, {rough: .3})} castShadow/>
      <mesh position={[0, .34, 0]} material={mat(L.grip, {rough: .5})} castShadow><cylinderGeometry args={[.2, .2, .05, 28]}/></mesh>
      <mesh position={[0, .39, 0]} material={mat(L.grip, {rough: .5})}><sphereGeometry args={[.045, 12, 8]}/></mesh>
    </group>
  </group>;
}
// The eggs waiting in a dish, as many as there are.
export function EggDish({count = 2}) {
  return <group>
    <ShellDish/>
    {Array.from({length: count}, (_, i) => <group key={i} position={[0, .23, (i - (count - 1) / 2) * .34]} rotation={[0, (i % 2 ? .25 : -.2), Math.PI / 2]} scale={1.2}><Egg brown={i % 2 === 1}/></group>)}
  </group>;
}

// ---- the food ----
// A tomato: lobed, a little squat, the five-pointed green cap on top. washed: glossy, with drops of water on it.
const tomatoGeometry = () => cached('tomato', () => {
  const g = new THREE.SphereGeometry(1, 40, 28), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x), side = Math.sqrt(Math.max(0, 1 - v.y * v.y));
    const k = 1 + .045 * Math.cos(a * 5) * side;
    v.x *= k; v.z *= k; v.y *= .8;
    if (v.y > 0) v.y -= .16 * Math.exp(-(v.x * v.x + v.z * v.z) / .05);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
});
const DROPS = [[.3, .55, .6], [-.5, .45, .4], [.1, .62, -.55], [-.2, .3, .8], [.62, .2, -.4], [-.65, .25, -.3]];
export function Tomato({r = .32, washed = false, ripe = '#ec5a45'}) {
  return <group scale={r}>
    <mesh geometry={tomatoGeometry()} material={mat(ripe, {rough: washed ? .12 : .3})} castShadow receiveShadow/>
    <TomatoCap/>
    {washed && DROPS.map((d, i) => <mesh key={i} position={d} scale={[1, .7, 1]} material={glassy('#ffffff', .75, 'drop')}><sphereGeometry args={[.07 + .02 * (i % 3), 10, 8]}/></mesh>)}
  </group>;
}
function TomatoCap() {
  const leaf = mat('#6f9f4d', {rough: .45});
  return <group position={[0, .62, 0]}>
    {Array.from({length: 5}, (_, i) => {const a = i / 5 * TAU; return <mesh key={i} position={[Math.cos(a) * .16, .02, Math.sin(a) * .16]} rotation={[0, -a, -.25]} scale={[.24, .04, .08]} material={leaf}><sphereGeometry args={[1, 12, 6]}/></mesh>;})}
    <mesh position={[0, .08, 0]} rotation={[0, 0, .2]} material={mat('#5e8b42', {rough: .5})} castShadow><cylinderGeometry args={[.035, .05, .18, 8]}/></mesh>
  </group>;
}
// One eighth of a tomato cut lengthways: the skin outside, the two cut faces with the pale heart and seeds.
const halfDisc = (phi, outward) => {
  const s = new THREE.Shape(); s.moveTo(0, -1); s.absarc(0, 0, 1, -Math.PI / 2, Math.PI / 2, false); s.lineTo(0, -1);
  // The basis stays right-handed (y flips on the far face), so each face's front looks out of the wedge.
  const g = new THREE.ShapeGeometry(s, 16), d = new THREE.Vector3(-Math.cos(phi), 0, Math.sin(phi)), y = new THREE.Vector3(0, outward < 0 ? 1 : -1, 0);
  const n = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)).multiplyScalar(outward);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(d, y, n)); return g;
};
const SEEDS = [[.3, .25], [.36, -.2], [.24, .02], [.42, .05]];
export function TomatoWedge({r = .32, ripe = '#ec5a45', pieces = 8}) {
  const w = TAU / pieces, parts = cached('wedge:' + pieces, () => ({skin: new THREE.SphereGeometry(1, 10, 18, 0, w), a: halfDisc(0, -1), b: halfDisc(w, 1)}));
  const flesh = mat('#f08a70', {rough: .3, side: THREE.DoubleSide}), heart = mat('#f7b49c', {rough: .3, side: THREE.DoubleSide}), seed = mat('#f4d58d', {rough: .4});
  // Each cut face: the pale heart a hair proud of the flesh, seeds on it.
  const face = (phi, out, geometry) => {
    const d = [-Math.cos(phi), 0, Math.sin(phi)], n = [Math.sin(phi) * out, 0, Math.cos(phi) * out];
    const at = (s, y, lift) => [d[0] * s + n[0] * lift, y, d[2] * s + n[2] * lift];
    return <group key={phi}>
      <mesh geometry={geometry} position={at(0, 0, .012)} scale={[.55, .7, .55]} material={heart}/>
      {SEEDS.map(([s, y], i) => <mesh key={i} position={at(s, y, .022)} scale={[.035, .05, .035]} material={seed}><sphereGeometry args={[1, 8, 6]}/></mesh>)}
    </group>;
  };
  return <group scale={[r, r * .8, r]}>
    <mesh geometry={parts.skin} material={mat(ripe, {rough: .25})} castShadow/>
    <mesh geometry={parts.a} material={flesh}/><mesh geometry={parts.b} material={flesh}/>
    {face(0, -1, parts.a)}{face(w, 1, parts.b)}
  </group>;
}
// 青菜: a head of Shanghai bok choy lying down, the root at the origin and the leaves out along +z. Broad jade stalks
// that cup round each other, dark round leaves at their ends with a pale rib up the middle.
const LEAVES = [[-.3, .92, '#3d7a37'], [.3, .9, '#3d7a37'], [-.16, .97, '#468541'], [.17, .95, '#468541'], [-.04, 1, '#55944b'], [.07, .88, '#62a056']];
export function Greens({length = 1.25, washed = false}) {
  const stalk = mat('#cfe6b4', {rough: washed ? .18 : .4}), rib = mat('#dcefc6', {rough: .4}), root = mat('#c2d9a2', {rough: .5});
  return <group scale={length / 1.25}>
    {LEAVES.map(([a, k, green], i) => <group key={i} rotation={[0, a, 0]} position={[0, .05 + i * .03, 0]}>
      <mesh position={[0, 0, .33 * k]} rotation={[-.04, 0, 0]} scale={[.15 * k, .07, .4 * k]} material={stalk} castShadow><sphereGeometry args={[1, 18, 10]}/></mesh>
      <mesh position={[0, .045, .86 * k]} rotation={[-.05, 0, 0]} scale={[.3 * k, .04, .36 * k]} material={mat(green, {rough: washed ? .18 : .5})} castShadow><sphereGeometry args={[1, 22, 10]}/></mesh>
      <mesh position={[0, .085, .78 * k]} scale={[.018, .012, .34 * k]} material={rib}><sphereGeometry args={[1, 6, 4]}/></mesh>
    </group>)}
    <mesh position={[0, .1, -.04]} rotation={[Math.PI / 2, 0, 0]} material={root} castShadow><cylinderGeometry args={[.16, .13, .12, 16]}/></mesh>
  </group>;
}
// How each heat colours what is in the pan: egg, tomato, greens. Tender is a shade paler, browned a shade deeper
// with a few toasty bits, caught deeper again with a few dark ones.
const HEAT_COLOURS = {
  tender: {egg: '#f9dc7a', tomato: '#e8563f', leaf: '#3c8a37', stalk: '#cfe6a6', bit: null},
  just: {egg: '#f6cd52', tomato: '#e04e38', leaf: '#2f6d2c', stalk: '#c4dc98', bit: null},
  browned: {egg: '#ecb945', tomato: '#cf4532', leaf: '#2b6127', stalk: '#bccf86', bit: '#b9793a'},
  caught: {egg: '#e2a93c', tomato: '#bd3c2b', leaf: '#28561f', stalk: '#b2c37a', bit: '#6e4526'}
};
const heatColours = heat => HEAT_COLOURS[heat] || HEAT_COLOURS.just;
// Greens cut into short lengths: a stalk piece and a bit of leaf, n of them heaped. cooked: wilted and glossy.
export function GreensPieces({n = 8, seed = 1, spread = .3, cooked = false, heat = 'just'}) {
  const h = heatColours(heat);
  const stalk = mat(cooked ? h.stalk : '#d6eabf', {rough: cooked ? .15 : .35}), leaf = mat(cooked ? h.leaf : '#468541', {rough: cooked ? .18 : .45});
  return <group>{Array.from({length: n}, (_, i) => {
    // Each piece a little above the one before, so a heap is a heap and not pieces through each other.
    const a = hash(i, seed) * TAU, r = spread * Math.sqrt(hash(i, seed, 2)), y = .03 + .016 * i, turn = hash(seed, i, 3) * TAU;
    return <group key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]} rotation={[(hash(i, seed, 4) - .5) * .25, turn, (hash(i, seed, 5) - .5) * .25]}>
      {i % 2 ? <mesh scale={[.07, .035, .14]} material={stalk} castShadow><sphereGeometry args={[1, 10, 6]}/></mesh>
        : <mesh scale={cooked ? [.15, .02, .11] : [.17, .02, .13]} material={leaf} castShadow><sphereGeometry args={[1, 12, 6]}/></mesh>}
    </group>;
  })}</group>;
}
// Soft curds of scrambled egg: lumpy, never the same twice in one heap, the same every time it is drawn.
const curdGeometry = k => cached('curd:' + k, () => {
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 2).deleteAttribute('normal').deleteAttribute('uv')), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {v.fromBufferAttribute(p, i); const f = .78 + .4 * hash(Math.round(v.x * 50), Math.round(v.y * 50), Math.round(v.z * 50), k); p.setXYZ(i, v.x * f, v.y * f * .7, v.z * f);}
  g.computeVertexNormals(); return g;
});
// set: 0 runny, 1 set into curds (between, they swell up out of the runny egg).
export function EggCurds({n = 7, spread = .45, seed = 1, heat = 'just', set = 1}) {
  const h = heatColours(heat), k = Math.max(.001, Math.min(1, set));
  return <group>{Array.from({length: n}, (_, i) => {
    const a = hash(i, seed, 5) * TAU, r = spread * Math.sqrt(hash(i, seed, 6)), s = (.12 + .08 * hash(i, seed, 7)) * k;
    const color = h.bit && i % 5 === 4 ? h.bit : i % 3 ? h.egg : '#fbe7a6';
    return <mesh key={i} geometry={curdGeometry(i % 4)} position={[Math.cos(a) * r, s * .5 + i * .012, Math.sin(a) * r]} rotation={[0, a, 0]} scale={s} material={mat(color, {rough: .5})} castShadow/>;
  })}</group>;
}
// Tomato cooked down: soft red pieces in their own glossy sauce. soft: 0 just cut, 1 cooked down.
export function TomatoPieces({n = 7, spread = .45, seed = 2, heat = 'just', soft = 1}) {
  const h = heatColours(heat), red = soft >= 1 ? h.tomato : '#ec5a45';
  return <group>{Array.from({length: n}, (_, i) => {
    const a = hash(i, seed, 8) * TAU, r = spread * Math.sqrt(hash(i, seed, 9)), s = .13 + .06 * hash(i, seed, 10), slump = 1 - .25 * soft;
    return <mesh key={i} geometry={curdGeometry(4 + i % 3)} position={[Math.cos(a) * r, s * .45 * slump + i * .012, Math.sin(a) * r]} rotation={[0, a * 2, 0]} scale={[s * 1.2, s * .8 * slump, s]} material={mat(i % 4 ? red : '#f07a5e', {rough: .2})} castShadow/>;
  })}</group>;
}
const SCALLION = [[.2, .22, .1], [-.25, .2, -.15], [.05, .26, -.3], [-.1, .24, .28], [.32, .2, -.12]];
export function Scallion({n = 4}) {
  return <group>{SCALLION.slice(0, n).map(([x, y, z], i) => <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2 - .3, 0, i]} material={mat('#79b55c', {rough: .4})}><torusGeometry args={[.04, .016, 6, 12]}/></mesh>)}</group>;
}
// A glossy pool under what is cooking: oil, or the sauce once the tomato has given its juice.
export function Gloss({r = .6, color = '#e7764f', opacity = 1}) {
  return <mesh position={[0, .012, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[r, r * .92, 1]} material={opacity < 1 ? glassy(color, opacity, 'gloss') : mat(color, {rough: .15})}><circleGeometry args={[1, 32]}/></mesh>;
}
// Bits of garlic for the greens.
export function Garlic({n = 7, spread = .4, seed = 6}) {
  return <group>{Array.from({length: n}, (_, i) => {const a = hash(i, seed) * TAU, r = spread * Math.sqrt(hash(i, seed, 2)); return <mesh key={i} position={[Math.cos(a) * r, .05, Math.sin(a) * r]} rotation={[hash(i, 1) * 3, hash(i, 2) * 3, 0]} material={mat('#f6ecc9', {rough: .4})}><boxGeometry args={[.05, .035, .045]}/></mesh>;})}</group>;
}
// ---- a pumpkin, and pea pods ----
// A small pumpkin: eight lobes, squat, a stub of stem.
const pumpkinGeometry = () => cached('pumpkin', () => {
  const g = new THREE.SphereGeometry(1, 48, 28), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x), side = Math.sqrt(Math.max(0, 1 - v.y * v.y)), k = 1 + .09 * Math.cos(a * 8) * side;
    v.x *= k; v.z *= k; v.y *= .72;
    v.y -= .22 * Math.exp(-(v.x * v.x + v.z * v.z) / .06) * Math.sign(v.y);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
});
export function Pumpkin({r = .36, washed = false}) {
  return <group scale={r}>
    <mesh geometry={pumpkinGeometry()} material={mat('#e98a3a', {rough: washed ? .2 : .45})} castShadow receiveShadow/>
    <mesh position={[0, .62, 0]} rotation={[0, 0, .25]} material={mat('#7a8a45', {rough: .6})} castShadow><cylinderGeometry args={[.07, .11, .26, 10]}/></mesh>
    {washed && DROPS.slice(0, 4).map((d, i) => <mesh key={i} position={[d[0] * 1.1, d[1] * .9, d[2] * 1.1]} scale={[1, .7, 1]} material={glassy('#ffffff', .75, 'drop')}><sphereGeometry args={[.07, 10, 8]}/></mesh>)}
  </group>;
}
// Pumpkin cut small: orange cubes, a strip of skin on one side. cooked: softened, glossy, a shade deeper.
export function PumpkinCubes({n = 8, spread = .3, seed = 3, cooked = false, heat = 'just'}) {
  const flesh = mat(cooked ? (heat === 'caught' ? '#c8742f' : heat === 'browned' ? '#d98236' : '#eb963f') : '#f2a447', {rough: cooked ? .2 : .45}), skin = mat('#c9692f', {rough: .5});
  return <group>{Array.from({length: n}, (_, i) => {
    const a = hash(i, seed, 12) * TAU, r = spread * Math.sqrt(hash(i, seed, 13)), s = .11 + .03 * hash(i, seed, 14);
    return <group key={i} position={[Math.cos(a) * r, s / 2 + .01 + i * .012, Math.sin(a) * r]} rotation={[0, hash(i, seed, 15) * TAU, cooked ? .2 : 0]}>
      <mesh material={flesh} castShadow><boxGeometry args={[s, s * .85, s]}/></mesh>
      <mesh position={[s * .52, 0, 0]} material={skin}><boxGeometry args={[s * .06, s * .86, s * 1.01]}/></mesh>
    </group>;
  })}</group>;
}
// A pea pod lying along x, the peas showing as bumps on top; open (0 to 1), its two halves part and the peas show.
const POD_PEAS = [-.15, -.05, .05, .15];
export function PeaPod({open = 0, washed = false}) {
  const shell = mat('#7fb24e', {rough: washed ? .2 : .45}), pea = mat('#9ccb63', {rough: .35});
  return <group>
    {[-1, 1].map(side => <group key={side} rotation={[side * open * .9, 0, 0]}>
      <mesh position={[0, .045, side * .018]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, .55]} material={shell} castShadow><capsuleGeometry args={[.06, .34, 4, 12]}/></mesh>
    </group>)}
    {POD_PEAS.map(x => <mesh key={x} position={[x, .065 + .015 * (1 - open), 0]} material={pea} castShadow><sphereGeometry args={[.045, 12, 8]}/></mesh>)}
    <mesh position={[-.27, .05, 0]} rotation={[0, 0, Math.PI / 2 + .4]} material={mat('#5f8c3b', {rough: .6})}><cylinderGeometry args={[.008, .014, .08, 6]}/></mesh>
  </group>;
}
// Peas, out of their pods: a little heap. cooked: glossy, a shade deeper.
export function Peas({n = 14, spread = .2, seed = 4, cooked = false}) {
  const m = mat(cooked ? '#6fae45' : '#9ccb63', {rough: cooked ? .18 : .35});
  return <group>{Array.from({length: n}, (_, i) => {const a = hash(i, seed, 16) * TAU, r = spread * Math.sqrt(hash(i, seed, 17)); return <mesh key={i} position={[Math.cos(a) * r, .045 + (i % 4) * .03, Math.sin(a) * r]} material={m} castShadow><sphereGeometry args={[.045, 10, 8]}/></mesh>;})}</group>;
}
// A little white dish for what is cut and waiting.
export function PrepDish() {
  return <mesh geometry={lathe([[0, 0], [.22, 0], [.26, .02], [.34, .07], [.37, .1], [.35, .105], [.27, .055], [0, .045]], 32)} material={mat('#fbf7f0', {rough: .3, side: THREE.DoubleSide})} castShadow receiveShadow/>;
}

// ---- food by ingredient ----
// Something from the fields as it comes in, washed or not. Pea pods come three at a time.
export const POD_SPOTS = [[0, -.14, .2], [.05, .02, -.15], [-.03, .17, .3]];
export function Raw({id, washed = false}) {
  if (id === 'greens') return <Greens washed={washed}/>;
  if (id === 'pumpkin') return <Pumpkin washed={washed}/>;
  if (id === 'pea') return <group>{POD_SPOTS.map(([x, z, t], i) => <group key={i} position={[x, 0, z]} rotation={[0, t, 0]}><PeaPod washed={washed}/></group>)}</group>;
  // What going out brings besides (src/cooking-pantry-food.jsx).
  if (id === 'taro') return <Taro washed={washed}/>;
  if (id === 'bamboo') return <BambooShoot washed={washed}/>;
  if (id === 'wheat') return <WheatEar/>;
  if (id === 'tea') return <TeaSprig washed={washed}/>;
  return <Tomato washed={washed}/>;
}
// Cut (or shelled) and waiting in its dish: a small heap.
export function Prepped({id, seed = 1}) {
  if (id === 'greens') return <GreensPieces n={10} spread={.2} seed={seed}/>;
  if (id === 'pumpkin') return <PumpkinCubes n={7} spread={.18} seed={seed}/>;
  if (id === 'pea') return <Peas n={12} spread={.16} seed={seed}/>;
  if (id === 'taro') return <TaroCubes n={7} spread={.18} seed={seed}/>;
  if (id === 'bamboo') return <BambooSlices n={8} spread={.18} seed={seed}/>;
  if (id === 'wheat') return <Noodles n={8} spread={.25} seed={seed}/>;
  if (id === 'tea') return <TeaLeaves n={7} spread={.16} seed={seed}/>;
  return <TomatoPieces n={6} spread={.18} seed={seed} soft={0}/>;
}
// Cooked, in the wok or on a plate: n pieces spread over `spread`. set: how far the egg has set (0 runny); soft: how
// far the rest has cooked down.
export function Cooked({id, heat = 'just', n, spread = .5, seed = 1, set = 1, soft = 1}) {
  if (id === 'egg') return <EggCurds n={n ?? 9} spread={spread} seed={seed} heat={heat} set={set}/>;
  if (id === 'tomato') return <TomatoPieces n={n ?? 8} spread={spread * .9} seed={seed} heat={heat} soft={soft}/>;
  if (id === 'greens') return <GreensPieces n={n ?? 18} spread={spread} seed={seed} cooked={soft > .4} heat={heat}/>;
  if (id === 'pumpkin') return <PumpkinCubes n={n ?? 10} spread={spread * .9} seed={seed} cooked={soft > .4} heat={heat}/>;
  if (id === 'pea') return <Peas n={n ?? 20} spread={spread * .9} seed={seed} cooked={soft > .4}/>;
  if (id === 'taro') return <TaroCubes n={n ?? 9} spread={spread * .9} seed={seed} cooked={soft > .4} heat={heat}/>;
  if (id === 'bamboo') return <BambooSlices n={n ?? 12} spread={spread * .9} seed={seed} cooked={soft > .4} heat={heat}/>;
  if (id === 'wheat') return <Noodles n={n ?? 10} spread={spread} seed={seed} cooked={soft > .4} heat={heat}/>;
  if (id === 'tea') return <TeaLeaves n={n ?? 8} spread={spread * .8} seed={seed} cooked/>;
  return null;
}
export const PIECES = {egg: 9, tomato: 8, greens: 18, pumpkin: 10, pea: 20, taro: 9, bamboo: 12, wheat: 10, tea: 8};
export const FOOD_SEEDS = {egg: 3, tomato: 4, greens: 5, pumpkin: 6, pea: 7, taro: 8, bamboo: 9, wheat: 10, tea: 11};
// What a plate holds once it is done: every thing that went in, fewer of each the more there are, in their own
// sauce or a little oil, spring onion and garlic on top if they went in.
export function DishFood({items = [], extras = [], heat = 'just', spread = .55}) {
  const list = items.filter(id => PIECES[id]), share = list.length > 1 ? .62 : 1;
  return <group>
    {list.includes('tomato') ? <Gloss r={spread + .12}/> : <Gloss r={spread + .05} color="#f1e3b4" opacity={.55}/>}
    {list.map(id => <Cooked key={id} id={id} heat={heat} n={Math.max(3, Math.round(PIECES[id] * share))} spread={spread} seed={FOOD_SEEDS[id]}/>)}
    {extras.includes('garlic') && <Garlic n={7} spread={spread * .8}/>}
    {extras.includes('scallion') && <Scallion/>}
    <ExtraBits extras={extras} spread={spread}/>
  </group>;
}
// A dish on its plate, the way it came out (src/cooking-recipe.js): what went in and how long it was on the fire.
// Sized like a dessert: fill makes it that many units across, fit half that (src/dessert-model.jsx). left: how
// much of it is still there, while the two of them are eating it.
const PLATE_SIZE = 2.1, HEATS_SEEN = ['tender', 'browned', 'caught'];
const itemsOf = item => Array.isArray(item?.items) ? item.items : ['tomato', 'egg'];
export function DishModel({item, look = 'cream', fill, fit, onClick, left = 1}) {
  const heat = HEATS_SEEN.includes(item?.heat) ? item.heat : 'just', s = fill ? fill / PLATE_SIZE : fit ? fit / 2 / PLATE_SIZE : 1;
  return <group scale={s} position={[0, fill ? -.45 * s : 0, 0]} onClick={onClick}>
    <Plate look={look}/>
    {left > 0 && <group position={[0, .065, 0]} scale={[.35 + .65 * left, .5 + .5 * left, .35 + .65 * left]}><DishFood items={itemsOf(item)} extras={item?.extras || []} heat={heat}/></group>}
  </group>;
}
// A helping taken onto a little plate, for one of the two: a little of each thing.
export function DishPortion({item}) {
  const heat = HEATS_SEEN.includes(item?.heat) ? item.heat : 'just', list = itemsOf(item);
  return <group>{list.filter(id => PIECES[id]).map((id, i) => <Cooked key={id} id={id} heat={heat} n={Math.max(2, Math.round(PIECES[id] / (2 + list.length)))} spread={.12} seed={FOOD_SEEDS[id] + 10 + i}/>)}</group>;
}
// A pair of chopsticks lying side by side, their tips at the origin pointing along -z.
export function Chopsticks({color = '#c79a6b'}) {
  return <group>{[-.035, .035].map(x => <mesh key={x} position={[x, .02, .5]} rotation={[Math.PI / 2, 0, x * .4]} material={mat(color, {rough: .5})} castShadow><cylinderGeometry args={[.018, .011, 1, 8]}/></mesh>)}</group>;
}
