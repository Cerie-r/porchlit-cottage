import React,{useMemo} from 'react';
import * as THREE from 'three';
import {puffShape} from './dessert-model.jsx';

// The kitchen things for making a dessert step by step: a mixing bowl, eggs
// that crack and come apart, a balloon whisk, the tins things bake in, and a
// little countertop oven with a window in its door. Same soft plastic as the
// desserts; the bowl is about two units across. These are only drawn: what
// moves, and when, is up to the steps (dessert-steps.jsx).

const TAU = Math.PI * 2;
const cache = new Map();
const cached = (key, make) => {if (!cache.has(key)) cache.set(key, make()); return cache.get(key);};
export const toolMaterial = (color, {rough = .45, metal = .02, side} = {}) => cached(`m:${color}:${rough}:${metal}:${side || 0}`, () => new THREE.MeshStandardMaterial({color, roughness: rough, metalness: metal, ...(side ? {side} : {})}));
const lathe = (points, segments = 40) => cached(`l:${segments}:${JSON.stringify(points)}`, () => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(.0005, r), y)), segments));

export const KITCHEN = {
  bowl: '#f0d6d8', bowlInside: '#fffaf2', band: '#c98f9f', shell: '#f7efe2', shellIn: '#fffdf8', crack: '#9a8070',
  yolk: '#f2b33d', white: '#fbf6e9', steel: '#dedad3', handle: '#ebc2cc', gold: '#dcbb76',
  oven: '#efd5d6', ovenTrim: '#fbf3e7', cavity: '#5c3f33', board: '#e6cba7', counter: '#f5ebdf', parchment: '#fbf4e6'
};
const steel = () => toolMaterial(KITCHEN.steel, {rough: .28, metal: .55});
const gold = () => toolMaterial(KITCHEN.gold, {rough: .3, metal: .5});

// ---- the counter, and the round board the bowl stands on ----
export function Counter({board = false}) {
  return <group>
    <mesh position={[0, -.15, 0]} receiveShadow material={toolMaterial(KITCHEN.counter, {rough: .6})}><boxGeometry args={[14, .3, 7]}/></mesh>
    {board && <mesh position={[0, .03, 0]} receiveShadow castShadow material={toolMaterial(KITCHEN.board, {rough: .7})}><cylinderGeometry args={[1.38, 1.38, .06, 48]}/></mesh>}
  </group>;
}

// ---- the mixing bowl ----
// Outside from the foot up to the lip, then the inside back down to the middle.
const BOWL_OUT = [[0, .06], [.4, .06], [.45, .085], [.43, .13], [.56, .17], [.76, .29], [.92, .48], [1.01, .68], [1.05, .8], [1.08, .83], [1.06, .86]];
const BOWL_IN = [[1.06, .86], [1.01, .84], [.97, .7], [.88, .51], [.73, .33], [.52, .2], [0, .18]];
export const BOWL_FLOOR = .18;
// How wide the inside of the bowl is at a height, for whatever is in it.
export function bowlRadiusAt(y) {
  const pts = [...BOWL_IN].reverse();
  if (y <= pts[0][1]) return pts[0][0];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][1]) {const [r0, y0] = pts[i - 1], [r1, y1] = pts[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0);}
  return pts.at(-1)[0];
}
export function Bowl() {
  return <group>
    <mesh geometry={lathe(BOWL_OUT, 48)} material={toolMaterial(KITCHEN.bowl, {rough: .35})} castShadow receiveShadow/>
    <mesh geometry={lathe(BOWL_IN, 48)} material={toolMaterial(KITCHEN.bowlInside, {rough: .3, side: THREE.DoubleSide})} receiveShadow/>
    <mesh position={[0, .845, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toolMaterial(KITCHEN.band, {rough: .4})}><torusGeometry args={[1.065, .022, 8, 64]}/></mesh>
  </group>;
}

// A swirl drawn once, laid over the batter and turned as it is stirred.
let swirlTexture = null;
export function swirlMap() {
  if (!swirlTexture && typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 256); g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      for (let i = 0; i <= 160; i++) {const t = i / 160, a = t * TAU * 1.6 + k * TAU / 3, r = 14 + t * 106; const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y);}
      g.strokeStyle = k === 1 ? 'rgba(255,255,255,.9)' : 'rgba(120,86,44,.24)'; g.lineWidth = k === 1 ? 9 : 7; g.stroke();
    }
    swirlTexture = new THREE.CanvasTexture(c); swirlTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return swirlTexture;
}

// ---- an egg ----
const EGG_H = .2, EGG_W = .145;
const eggAt = t => {const a = Math.PI * t, y = -Math.cos(a) * EGG_H; return [Math.sin(a) * EGG_W * (1 - .16 * y / EGG_H), y];};
const EGG = Array.from({length: 19}, (_, i) => eggAt(i / 18));
const half = (from, to) => {
  const out = Array.from({length: 10}, (_, i) => eggAt(from + (to - from) * i / 9));
  return [...out, ...[...out].reverse().map(([r, y]) => [r * .9, y * .9])];
};
const EGG_BOTTOM = half(0, .5), EGG_TOP = half(1, .5);
// A crack across the front, a little zigzag around the middle.
const crackGeometry = () => cached('crack', () => {
  const pts = Array.from({length: 15}, (_, i) => {const a = -1.25 + 2.5 * i / 14; return new THREE.Vector3(Math.sin(a) * (EGG_W + .003), (i % 2 ? .014 : -.012), Math.cos(a) * (EGG_W + .003));});
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .0045, 4, false);
});
export function Egg({cracked = false, brown = false}) {
  return <group>
    <mesh geometry={lathe(EGG, 28)} material={toolMaterial(brown ? '#ecd5bb' : KITCHEN.shell, {rough: .55})} castShadow/>
    {cracked && <mesh geometry={crackGeometry()} material={toolMaterial(KITCHEN.crack, {rough: .8})}/>}
  </group>;
}
// The two halves once it is opened: shell outside, paler inside.
export function EggHalf({top = false, brown = false}) {
  return <mesh geometry={lathe(top ? EGG_TOP : EGG_BOTTOM, 28)} material={toolMaterial(brown ? '#ecd5bb' : KITCHEN.shell, {rough: .55, side: THREE.DoubleSide})} castShadow/>;
}
export function Yolk({r = .09}) {
  return <mesh material={toolMaterial(KITCHEN.yolk, {rough: .18})} castShadow><sphereGeometry args={[r, 20, 14]}/></mesh>;
}
// The little dish the empty shells go into.
const DISH = [[0, 0], [.3, 0], [.34, .02], [.42, .08], [.44, .11], [.41, .115], [.33, .06], [0, .05]];
export function ShellDish() {
  return <mesh geometry={lathe(DISH, 32)} material={toolMaterial(KITCHEN.bowlInside, {rough: .35})} castShadow receiveShadow/>;
}

// ---- a balloon whisk: six wire loops crossing at the tip, held by a handle.
// The tip is at (0, -.62, 0) and the handle goes up from (0, 0, 0).
export const WHISK_TIP = .62;
export function Whisk() {
  const wires = useMemo(() => cached('whisk', () => Array.from({length: 6}, (_, k) => {
    const th = k * Math.PI / 6, pts = [[0, 0], [.1, -.12], [.165, -.33], [.13, -.52], [0, -.62], [-.13, -.52], [-.165, -.33], [-.1, -.12], [0, 0]];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([r, y]) => new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r))), 48, .008, 5, false);
  })), []);
  return <group>
    {wires.map((g, i) => <mesh key={i} geometry={g} material={steel()} castShadow/>)}
    <mesh position={[0, .03, 0]} material={steel()}><cylinderGeometry args={[.036, .022, .08, 12]}/></mesh>
    <mesh position={[0, .5, 0]} material={toolMaterial(KITCHEN.handle, {rough: .4})} castShadow><capsuleGeometry args={[.052, .78, 4, 12]}/></mesh>
    <mesh position={[0, .97, 0]} material={gold()}><torusGeometry args={[.048, .013, 6, 16]}/></mesh>
  </group>;
}

// ---- what it is baked in ----
// Each tin holds its batter in a group the steps can rise and colour: the
// batter's group is passed in as `rise`, its colour as `batter`.
const CAKE_TIN = [[0, 0], [.6, 0], [.62, .015], [.62, .36], [.65, .38], [.6, .39], [.585, .03], [0, .03]];
const CAKE_BATTER = [[0, 0], [.585, 0], [.585, .22], [.52, .28], [.3, .31], [0, .32]];
const TART_TIN = [[0, 0], [.66, 0], [.7, .04], [.72, .15], [.69, .16], [.66, .05], [0, .03]];
const TART_DOUGH = [[0, .03], [.62, .03], [.67, .14], [.61, .15], [.56, .07], [0, .07]];
// A pudding mould, narrow at the bottom: turned out, the wide side is down.
const PUDDING_MOULD = [[0, 0], [.44, 0], [.46, .03], [.6, .46], [.64, .48], [.6, .5], [.575, .48], [.43, .04], [0, .03]];
const PUDDING_RAW = [[0, .03], [.43, .03], [.565, .46], [0, .46]];
// Choux piped onto a tray in four low round mounds; each puffs up in the
// oven into the shape of a cream puff (its height and width rise, see RISE).
const CHOUX = {lobes: 5, size: [.53, .78, .53]};
export function Tin({base, rise, batter}) {
  if (base === 'tart') return <group>
    <mesh geometry={lathe(TART_TIN, 36)} material={gold()} castShadow receiveShadow/>
    {Array.from({length: 24}, (_, i) => {const a = i * TAU / 24; return <mesh key={i} position={[Math.sin(a) * .7, .09, Math.cos(a) * .7]} material={gold()}><capsuleGeometry args={[.022, .1, 2, 6]}/></mesh>;})}
    <group ref={rise}><mesh geometry={lathe(TART_DOUGH, 36)} material={batter} castShadow/></group>
  </group>;
  if (base === 'pudding') return <group>
    <mesh geometry={lathe(PUDDING_MOULD, 40)} material={toolMaterial(KITCHEN.bowlInside, {rough: .3, side: THREE.DoubleSide})} castShadow receiveShadow/>
    <group ref={rise}><mesh geometry={lathe(PUDDING_RAW, 40)} material={batter} castShadow/></group>
  </group>;
  if (base === 'puff') return <group>
    <mesh position={[0, .015, 0]} material={steel()} castShadow receiveShadow><boxGeometry args={[1.5, .03, .96]}/></mesh>
    <mesh position={[0, .034, 0]} material={toolMaterial(KITCHEN.parchment, {rough: .8})} receiveShadow><boxGeometry args={[1.38, .008, .84]}/></mesh>
    <group ref={rise} position={[0, .038, 0]} userData={{each: true}}>{[-.33, .33].flatMap(x => [-.24, .24].map(z => <group key={x + ':' + z} position={[x, 0, z]}><mesh geometry={puffShape(CHOUX.lobes, (x + z) * 2)} scale={CHOUX.size} material={batter} castShadow/></group>))}</group>
  </group>;
  if (base === 'macaron') return <group>
    <mesh position={[0, .015, 0]} material={steel()} castShadow receiveShadow><boxGeometry args={[1.5, .03, .96]}/></mesh>
    <mesh position={[0, .034, 0]} material={toolMaterial(KITCHEN.parchment, {rough: .8})} receiveShadow><boxGeometry args={[1.38, .008, .84]}/></mesh>
    <group ref={rise} position={[0, .04, 0]}>{[-.51, -.17, .17, .51].flatMap(x => [-.21, .21].map(z => <mesh key={x + ':' + z} position={[x, .025, z]} material={batter} castShadow><cylinderGeometry args={[.13, .135, .05, 24]}/></mesh>))}</group>
  </group>;
  return <group>
    <mesh geometry={lathe(CAKE_TIN, 40)} material={steel()} castShadow receiveShadow/>
    <group ref={rise} position={[0, .03, 0]}><mesh geometry={lathe(CAKE_BATTER, 40)} material={batter} castShadow/></group>
  </group>;
}

// ---- the oven ----
// A little countertop oven: the cavity on the left behind a door that drops
// open towards you, a window in the door, two knobs and a light on the right,
// a vent on top. The door turns about its bottom edge (`door`), the left knob
// is the timer (`knob`), and `glow` is the light inside.
export const OVEN = {inside: [-.34, .42, -.05], doorAt: [-.34, .22, .81], width: 2.6, top: 1.71};
export function Oven({door, knob, glow, lamp, glass}) {
  const body = toolMaterial(KITCHEN.oven, {rough: .42}), trim = toolMaterial(KITCHEN.ovenTrim, {rough: .4});
  return <group>
    {[[-1.12, -.62], [1.12, -.62], [-1.12, .62], [1.12, .62]].map(([x, z]) => <mesh key={x + ':' + z} position={[x, .055, z]} material={gold()}><cylinderGeometry args={[.07, .06, .11, 12]}/></mesh>)}
    <mesh position={[0, .165, 0]} material={body} castShadow receiveShadow><boxGeometry args={[2.6, .11, 1.6]}/></mesh>
    <mesh position={[0, 1.64, 0]} material={body} castShadow><boxGeometry args={[2.62, .14, 1.62]}/></mesh>
    <mesh position={[0, 1.715, 0]} material={trim}><boxGeometry args={[2.5, .02, 1.5]}/></mesh>
    <mesh position={[-1.26, .9, 0]} material={body} castShadow><boxGeometry args={[.08, 1.36, 1.6]}/></mesh>
    <mesh position={[-.34, .9, -.78]} material={body}><boxGeometry args={[1.76, 1.36, .04]}/></mesh>
    <mesh position={[.91, .9, 0]} material={body} castShadow><boxGeometry args={[.78, 1.36, 1.6]}/></mesh>
    {/* The cavity, seen from inside, warm and dark. It sits a little inside the
        walls, floor and back: faces in the same plane flicker on a phone. */}
    <mesh position={[-.35, .9, .01]} material={toolMaterial(KITCHEN.cavity, {rough: .9, side: THREE.BackSide})}><boxGeometry args={[1.7, 1.32, 1.48]}/></mesh>
    {[-.3, .3].map(z => <mesh key={z} position={[-.34, .4, z]} rotation={[0, 0, Math.PI / 2]} material={steel()}><cylinderGeometry args={[.012, .012, 1.7, 6]}/></mesh>)}
    {[-.9, -.34, .22].map(x => <mesh key={x} position={[x, .4, 0]} rotation={[Math.PI / 2, 0, 0]} material={steel()}><cylinderGeometry args={[.01, .01, .7, 6]}/></mesh>)}
    <pointLight ref={glow} position={[-.34, 1.25, .1]} color="#ffb36a" intensity={0} distance={3.2} decay={1.6}/>
    {/* Vent slits on top. */}
    {[-.2, 0, .2].map(x => <mesh key={x} position={[x - .3, 1.733, -.25]} material={toolMaterial('#c7a9a6')}><boxGeometry args={[.12, .01, .03]}/></mesh>)}
    {/* The control panel: the timer knob, the heat knob and a little light. */}
    <mesh position={[.91, .9, .806]} material={trim}><boxGeometry args={[.6, 1.2, .02]}/></mesh>
    <group ref={knob} position={[.91, 1.2, .83]}><Knob/></group>
    <group position={[.91, .82, .83]} rotation={[0, 0, -.9]}><Knob/></group>
    <mesh position={[.91, .44, .815]} scale={.62} geometry={heartGeometry()} material={lamp}/>
    <mesh position={[0, 1.575, .818]} material={gold()}><boxGeometry args={[2.62, .018, .012]}/></mesh>
    {/* The door, hinged at the bottom. */}
    <group ref={door} position={OVEN.doorAt}>
      <mesh position={[0, .08, 0]} material={trim} castShadow><boxGeometry args={[1.74, .16, .07]}/></mesh>
      <mesh position={[0, 1.22, 0]} material={trim} castShadow><boxGeometry args={[1.74, .28, .07]}/></mesh>
      {[-.79, .79].map(x => <mesh key={x} position={[x, .62, 0]} material={trim} castShadow><boxGeometry args={[.16, .96, .07]}/></mesh>)}
      <mesh position={[0, .62, 0]} material={glass}><boxGeometry args={[1.42, .96, .02]}/></mesh>
      <mesh position={[0, 1.24, .1]} rotation={[0, 0, Math.PI / 2]} material={gold()} castShadow><cylinderGeometry args={[.035, .035, 1.1, 12]}/></mesh>
      {[-.5, .5].map(x => <mesh key={x} position={[x, 1.24, .055]} rotation={[Math.PI / 2, 0, 0]} material={gold()}><cylinderGeometry args={[.025, .025, .09, 8]}/></mesh>)}
    </group>
  </group>;
}
// A small heart, for the light that says the oven is on.
const heartGeometry = () => cached('heart', () => {
  const h = new THREE.Shape(); h.moveTo(0, -.1); h.bezierCurveTo(-.02, -.07, -.12, -.03, -.12, .04); h.bezierCurveTo(-.12, .1, -.04, .12, 0, .06); h.bezierCurveTo(.04, .12, .12, .1, .12, .04); h.bezierCurveTo(.12, -.03, .02, -.07, 0, -.1);
  return new THREE.ExtrudeGeometry(h, {depth: .03, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 2, curveSegments: 10});
});
function Knob() {
  return <group rotation={[Math.PI / 2, 0, 0]}>
    <mesh material={toolMaterial(KITCHEN.ovenTrim, {rough: .35})} castShadow><cylinderGeometry args={[.15, .16, .07, 24]}/></mesh>
    <mesh position={[0, .04, -.07]} material={gold()}><boxGeometry args={[.03, .02, .12]}/></mesh>
  </group>;
}
// A puff of steam from the vent.
export function Puff() {
  return <mesh><sphereGeometry args={[.09, 12, 8]}/><meshStandardMaterial color="#ffffff" transparent opacity={.5} depthWrite={false} roughness={1}/></mesh>;
}

// ---- for decorating ----
// The turntable the dessert is turned out onto: its top is at TURNTABLE_TOP.
export function Turntable() {
  return <group>
    <mesh position={[0, .02, 0]} material={toolMaterial('#d9a6b1', {rough: .4})} castShadow receiveShadow><cylinderGeometry args={[.46, .56, .04, 40]}/></mesh>
    <mesh position={[0, .07, 0]} material={gold()}><cylinderGeometry args={[.07, .1, .07, 16]}/></mesh>
    <mesh position={[0, .1, 0]} material={toolMaterial('#cf9fab', {rough: .4})}><cylinderGeometry args={[1.27, 1.27, .02, 64]}/></mesh>
    <mesh position={[0, .13, 0]} material={toolMaterial('#fff4e3', {rough: .45})} castShadow receiveShadow><cylinderGeometry args={[1.25, 1.25, .06, 64]}/></mesh>
  </group>;
}
// An offset palette knife: the blade lies flat along +x from its tip at the
// origin, the handle rises at the far end.
export function Spatula() {
  return <group>
    <mesh position={[.24, .006, 0]} material={steel()} castShadow><boxGeometry args={[.48, .012, .09]}/></mesh>
    <mesh position={[0, .006, 0]} material={steel()}><cylinderGeometry args={[.045, .045, .012, 16]}/></mesh>
    <mesh position={[.53, .05, 0]} rotation={[0, 0, .9]} material={steel()}><boxGeometry args={[.13, .02, .05]}/></mesh>
    <mesh position={[.78, .16, 0]} rotation={[0, 0, Math.PI / 2 + .35]} material={toolMaterial(KITCHEN.handle, {rough: .4})} castShadow><capsuleGeometry args={[.045, .36, 4, 10]}/></mesh>
  </group>;
}
// A piping bag, its star tip at the origin pointing down.
export function PipingBag({cream = '#fbf9f4'}) {
  return <group>
    <mesh position={[0, .05, 0]} rotation={[Math.PI, 0, 0]} material={gold()}><coneGeometry args={[.045, .1, 8]}/></mesh>
    <mesh position={[0, .38, 0]} material={toolMaterial(cream, {rough: .55})} castShadow><cylinderGeometry args={[.17, .05, .56, 20, 1]}/></mesh>
    <mesh position={[0, .7, 0]} material={toolMaterial('#f6eee6', {rough: .7})}><sphereGeometry args={[.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]}/></mesh>
    <mesh position={[0, .67, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toolMaterial(KITCHEN.band)}><torusGeometry args={[.15, .018, 6, 20]}/></mesh>
  </group>;
}
// A piping bag with a long thin nozzle, for filling cream puffs: the tip of
// the nozzle at the origin, pointing down.
export function FillBag({cream = '#fbf9f4'}) {
  return <group>
    <mesh position={[0, .15, 0]} material={steel()} castShadow><cylinderGeometry args={[.014, .01, .3, 10]}/></mesh>
    <mesh position={[0, .32, 0]} material={gold()}><cylinderGeometry args={[.036, .02, .06, 12]}/></mesh>
    <mesh position={[0, .63, 0]} material={toolMaterial(cream, {rough: .55})} castShadow><cylinderGeometry args={[.17, .045, .56, 20, 1]}/></mesh>
    <mesh position={[0, .95, 0]} material={toolMaterial('#f6eee6', {rough: .7})}><sphereGeometry args={[.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]}/></mesh>
    <mesh position={[0, .92, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toolMaterial(KITCHEN.band)}><torusGeometry args={[.15, .018, 6, 20]}/></mesh>
  </group>;
}
// A little jug for pouring caramel, its spout at the origin.
const JUG = [[0, 0], [.16, 0], [.19, .03], [.2, .2], [.18, .3], [.2, .33], [.17, .34], [.155, .31], [.17, .2], [.15, .04], [0, .035]];
export function Jug({sauce = '#c4a17b'}) {
  return <group>
    <group position={[-.2, -.3, 0]}>
      <mesh geometry={lathe(JUG, 28)} material={toolMaterial(KITCHEN.bowlInside, {rough: .3, side: THREE.DoubleSide})} castShadow/>
      <mesh position={[0, .26, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toolMaterial(sauce, {rough: .2})}><circleGeometry args={[.16, 24]}/></mesh>
      <mesh position={[-.21, .17, 0]} rotation={[0, 0, Math.PI / 2]} material={toolMaterial(KITCHEN.bowlInside, {rough: .3})}><torusGeometry args={[.08, .02, 6, 16, Math.PI]}/></mesh>
      <mesh position={[.2, .325, 0]} rotation={[0, 0, -.5]} material={toolMaterial(KITCHEN.bowlInside, {rough: .3})}><boxGeometry args={[.07, .015, .08]}/></mesh>
    </group>
  </group>;
}
// A sprinkle shaker held upside down, its cap at the origin.
export function Shaker({color = '#ebc2cc'}) {
  return <group>
    <mesh position={[0, .03, 0]} material={toolMaterial(KITCHEN.handle, {rough: .4})} castShadow><cylinderGeometry args={[.1, .1, .06, 20]}/></mesh>
    {[[0, 0], [.04, .03], [-.04, .02], [.02, -.04], [-.03, -.03]].map(([x, z], i) => <mesh key={i} position={[x, -.001, z]} rotation={[-Math.PI / 2, 0, 0]} material={toolMaterial('#8f6f74')}><circleGeometry args={[.009, 8]}/></mesh>)}
    <mesh position={[0, .2, 0]} material={toolMaterial('#fbf6ee', {rough: .2})} castShadow><cylinderGeometry args={[.09, .09, .28, 20]}/></mesh>
    <mesh position={[0, .17, 0]} material={toolMaterial(color, {rough: .5})}><cylinderGeometry args={[.08, .08, .16, 20]}/></mesh>
  </group>;
}
// An egg that broke: white and a burst yolk spread on the board, bits of shell.
export function Splat({brown = false, turn = 0}) {
  const shell = toolMaterial(brown ? '#ecd5bb' : KITCHEN.shell, {rough: .55, side: THREE.DoubleSide});
  return <group rotation={[0, turn, 0]}>
    {[[0, 0, .22, .16], [.15, .06, .13, .1], [-.12, .08, .12, .09], [.05, -.13, .11, .08]].map(([x, z, rx, rz], i) => <mesh key={i} position={[x, .004, z]} scale={[rx, .012, rz]} material={toolMaterial('#f9f2e2', {rough: .1})} receiveShadow><sphereGeometry args={[1, 16, 6]}/></mesh>)}
    <mesh position={[.02, .012, .01]} scale={[.11, .016, .085]} material={toolMaterial(KITCHEN.yolk, {rough: .2})}><sphereGeometry args={[1, 16, 8]}/></mesh>
    {[[.26, .14, .4], [-.24, -.1, 2.1], [.08, .25, 4.2], [-.05, -.27, 1.2]].map(([x, z, r], i) => <mesh key={'s' + i} position={[x, .03, z]} rotation={[.6, r, .4]} material={shell} castShadow><sphereGeometry args={[.07, 6, 4, 0, 1.2, 0, 1.1]}/></mesh>)}
  </group>;
}
