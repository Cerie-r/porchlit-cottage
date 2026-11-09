import React,{useMemo} from 'react';
import * as THREE from 'three';
import {toolMaterial} from './dessert-tools.jsx';

// What going out brings to the stove besides the fields' tomatoes, greens, pumpkins and peas (src/cooking-recipe.js):
// a taro, a bamboo shoot, an ear of wheat (kneaded, rolled and cut into noodles), a sprig of tea; and to throw on top,
// honey, walnut and pine nuts. Raw, got ready and cooked, in the same soft plastic as the rest of the counter
// (src/cooking-tools.jsx draws them where it draws the others). A tomato is about .65 across.

const TAU = Math.PI * 2;
const cache = new Map();
const cached = (key, make) => {if (!cache.has(key)) cache.set(key, make()); return cache.get(key);};
const mat = toolMaterial;
const clear = (color, opacity) => cached(`pf:${color}:${opacity}`, () => new THREE.MeshStandardMaterial({color, transparent: true, opacity, roughness: .08, metalness: .05, depthWrite: false}));
// The same few numbers every time for the same piece, so a heap is lumpy but never flickers.
const hash = (...n) => {const s = Math.sin(n.reduce((a, v, i) => a + v * [12.9898, 78.233, 37.719, 4.581][i % 4], 0)) * 43758.5453; return s - Math.floor(s);};
const spot = (i, seed, spread) => {const a = hash(i, seed, 1) * TAU, r = spread * Math.sqrt(hash(i, seed, 2)); return [Math.cos(a) * r, Math.sin(a) * r];};
const browned = (color, heat) => heat === 'caught' ? new THREE.Color(color).lerp(new THREE.Color('#6b4a2e'), .35).getStyle() : heat === 'browned' ? new THREE.Color(color).lerp(new THREE.Color('#a8774a'), .2).getStyle() : color;

// ---- taro ----
// A taro, brown with rings round it and a pinkish tip; cut, white cubes flecked with purple.
export function Taro({washed = false}) {
  const skin = mat(washed ? '#8a6a52' : '#7d6049', {rough: washed ? .35 : .8});
  return <group>
    <mesh position={[0, .26, 0]} scale={[.27, .3, .26]} material={skin} castShadow><sphereGeometry args={[1, 24, 16]}/></mesh>
    {[.12, .22, .32, .41].map((y, i) => <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, i]} material={mat('#5e4535', {rough: .9})}><torusGeometry args={[Math.sqrt(Math.max(.01, 1 - ((y - .26) / .3) ** 2)) * .265, .012, 5, 24]}/></mesh>)}
    <mesh position={[0, .56, 0]} scale={[.06, .08, .06]} material={mat('#c9879a', {rough: .5})}><sphereGeometry args={[1, 10, 8]}/></mesh>
  </group>;
}
export function TaroCubes({n = 9, spread = .3, seed = 8, cooked = false, heat = 'just'}) {
  const flesh = mat(browned(cooked ? '#e6dcea' : '#f2ece6', heat), {rough: cooked ? .25 : .45}), fleck = mat('#9b7aa8', {rough: .5});
  return <group>{Array.from({length: n}, (_, i) => {const [x, z] = spot(i, seed, spread), s = .085 + hash(i, seed, 3) * .03; return <group key={i} position={[x, s / 2 + (i % 3) * .02, z]} rotation={[hash(i, seed, 4), hash(i, seed, 5) * TAU, hash(i, seed, 6)]}>
    <mesh material={flesh} castShadow><boxGeometry args={[s, s, s]}/></mesh>
    <mesh position={[s * .2, s * .51, -s * .1]} rotation={[-Math.PI / 2, 0, 0]} material={fleck}><circleGeometry args={[s * .12, 8]}/></mesh>
  </group>;})}</group>;
}

// ---- bamboo shoot ----
// A shoot in its sheaths, pale gold going green at the tip; cut, thin pale slices with a ring inside.
export function BambooShoot({washed = false}) {
  const sheath = mat(washed ? '#dcbd7c' : '#cfae6e', {rough: washed ? .35 : .7});
  return <group rotation={[0, 0, -Math.PI / 2 + .1]} position={[-.25, .16, 0]}>
    {[[0, .17, .5], [.22, .14, .4], [.42, .11, .32], [.58, .075, .24]].map(([y, r, h], i) => <mesh key={i} position={[0, y + h / 2, 0]} material={i === 3 ? mat('#a9bd6f', {rough: .5}) : sheath} castShadow><coneGeometry args={[r, h, 14]}/></mesh>)}
    <mesh position={[0, -.02, 0]} material={mat('#efe2b6', {rough: .5})}><cylinderGeometry args={[.17, .16, .05, 16]}/></mesh>
  </group>;
}
export function BambooSlices({n = 12, spread = .3, seed = 9, cooked = false, heat = 'just'}) {
  const flesh = mat(browned(cooked ? '#ecd78f' : '#f3e5b2', heat), {rough: cooked ? .2 : .4}), ring = mat('#e2c97f', {rough: .4});
  return <group>{Array.from({length: n}, (_, i) => {const [x, z] = spot(i, seed, spread), r = .06 + hash(i, seed, 3) * .025; return <group key={i} position={[x, .012 + (i % 4) * .012, z]} rotation={[(hash(i, seed, 4) - .5) * .6, hash(i, seed, 5) * TAU, 0]}>
    <mesh material={flesh} castShadow><cylinderGeometry args={[r, r * .85, .022, 14]}/></mesh>
    <mesh position={[0, .012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ring}><torusGeometry args={[r * .55, .006, 4, 14]}/></mesh>
  </group>;})}</group>;
}

// ---- wheat, dough and noodles ----
// An ear of wheat: a stalk with two rows of plump grains and their whiskers.
export function WheatEar() {
  const gold = mat('#e2c27a', {rough: .5}), stalk = mat('#cdb06a', {rough: .6});
  return <group rotation={[0, 0, -Math.PI / 2 + .15]} position={[-.4, .08, 0]}>
    <mesh position={[0, .3, 0]} material={stalk} castShadow><cylinderGeometry args={[.012, .016, .6, 6]}/></mesh>
    {Array.from({length: 12}, (_, i) => {const y = .55 + Math.floor(i / 2) * .07, side = i % 2 ? 1 : -1; return <group key={i} position={[side * .03, y, 0]} rotation={[0, 0, side * .45]}>
      <mesh material={gold} castShadow scale={[1, 1.6, 1]}><sphereGeometry args={[.028, 8, 6]}/></mesh>
      <mesh position={[side * .02, .09, 0]} rotation={[0, 0, -side * .2]} material={stalk}><cylinderGeometry args={[.003, .002, .16, 3]}/></mesh>
    </group>;})}
  </group>;
}
// Flour and water in a heap, kneaded little by little into a smooth ball (k from 0 to 1).
export function Dough({k = 1}) {
  const flour = mat('#fbf6ea', {rough: .9}), dough = mat('#f0dcb4', {rough: .45 - .25 * k});
  return <group>
    {k < .2 && <mesh position={[0, .08, 0]} scale={[.32, .16, .32]} material={flour}><sphereGeometry args={[1, 16, 10, 0, TAU, 0, Math.PI / 2]}/></mesh>}
    <mesh position={[0, .19, 0]} scale={[.32 + .02 * k, .21 + .02 * k, .3 + .02 * k]} material={dough} castShadow><sphereGeometry args={[1, 24, 16]}/></mesh>
    {Array.from({length: Math.round(7 * (1 - k))}, (_, i) => {const a = i / 7 * TAU, r = .3; return <mesh key={i} position={[Math.cos(a) * r, .12 + hash(i, 3) * .1, Math.sin(a) * r]} material={i % 2 ? flour : dough}><sphereGeometry args={[.05 + hash(i, 4) * .03, 8, 6]}/></mesh>;})}
  </group>;
}
// The dough rolled out (flat: how far, 0 a ball, 1 a sheet), and the sheet that is cut into noodles.
export function DoughSheet({flat = 1}) {
  const s = Math.max(0, Math.min(1, flat));
  return <mesh position={[0, .21 - .18 * s, 0]} scale={[.32 + .34 * s, .21 - .185 * s, .3 + .24 * s]} material={mat('#f0dcb4', {rough: .35})} castShadow receiveShadow><sphereGeometry args={[1, 28, 16]}/></mesh>;
}
// A wooden rolling pin lying along x.
export function RollingPin({look}) {
  const wood = mat('#d7b183', {rough: .55});
  return <group rotation={[0, 0, Math.PI / 2]}>
    <mesh material={wood} castShadow><cylinderGeometry args={[.07, .07, .95, 16]}/></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[0, s * .6, 0]} material={wood} castShadow><cylinderGeometry args={[.03, .035, .26, 10]}/></mesh>)}
  </group>;
}
// Noodles: soft strands lying in loose curls. cooked: glossier and a little darker.
const strand = (seed, len = .5) => cached(`noodle:${seed}:${len}`, () => {
  const pts = Array.from({length: 7}, (_, k) => new THREE.Vector3(-len / 2 + k * len / 6, Math.sin(k * 1.3 + seed) * .015, Math.sin(k * .9 + seed * 2) * .07));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, .024, 7, false);
});
export function Noodles({n = 10, spread = .28, seed = 10, cooked = false, heat = 'just'}) {
  const m = mat(browned(cooked ? '#efd593' : '#f3e0b3', heat), {rough: cooked ? .18 : .45});
  return <group>{Array.from({length: n}, (_, i) => {const [x, z] = spot(i, seed, spread * .6); return <mesh key={i} geometry={strand(i % 5, .45 + (i % 3) * .08)} position={[x, .02 + (i % 4) * .014, z]} rotation={[0, hash(i, seed, 3) * TAU, 0]} material={m} castShadow/>;})}</group>;
}

// ---- tea ----
// A sprig, one bud and two leaves; picked over, the leaves on their own; steeped, darker.
const leafMat = (cooked, washed) => mat(cooked ? '#7d8a45' : washed ? '#8fba63' : '#86b05a', {rough: cooked ? .35 : .3});
export function TeaSprig({washed = false}) {
  const stem = mat('#9a9a5a', {rough: .6});
  return <group position={[0, .03, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2 - .2]} position={[0, .03, 0]} material={stem}><cylinderGeometry args={[.012, .015, .5, 6]}/></mesh>
    {[[-.08, .05, .7], [.08, .03, -.6]].map(([x, z, r], i) => <mesh key={i} position={[x, .06, z]} rotation={[0, r, .25]} scale={[.16, .02, .07]} material={leafMat(false, washed)} castShadow><sphereGeometry args={[1, 14, 8]}/></mesh>)}
    <mesh position={[.24, .08, 0]} rotation={[0, 0, -.8]} scale={[.035, .08, .035]} material={mat('#a9cf78', {rough: .3})} castShadow><sphereGeometry args={[1, 10, 8]}/></mesh>
  </group>;
}
export function TeaLeaves({n = 8, spread = .25, seed = 11, cooked = false}) {
  return <group>{Array.from({length: n}, (_, i) => {const [x, z] = spot(i, seed, spread); return <mesh key={i} position={[x, .015 + (i % 3) * .01, z]} rotation={[(hash(i, seed, 4) - .5) * .4, hash(i, seed, 5) * TAU, 0]} scale={[.09, .014, .04]} material={leafMat(cooked)} castShadow><sphereGeometry args={[1, 12, 8]}/></mesh>;})}</group>;
}
// A whole egg boiled with tea: the shell taking on the tea's brown (k from 0 to 1), cracked all over.
export function TeaEgg({k = 1, peeled = false}) {
  const shell = useMemo(() => '#' + new THREE.Color('#f6efe2').lerp(new THREE.Color(peeled ? '#c79a6a' : '#b07a48'), Math.max(0, Math.min(1, k))).getHexString(), [k, peeled]);
  return <group>
    <mesh scale={[.13, .17, .13]} material={mat(shell, {rough: peeled ? .3 : .45})} castShadow><sphereGeometry args={[1, 20, 14]}/></mesh>
    {k > .3 && [0, 1, 2, 3].map(i => <mesh key={i} rotation={[hash(i, 31) * 2, hash(i, 32) * TAU, hash(i, 33) * 2]} scale={[.132, .172, .132]} material={mat('#6e4a2d', {rough: .7})}><torusGeometry args={[1, .012, 3, 20, 2.2]}/></mesh>)}
  </group>;
}

// ---- on top ----
// Honey drizzled over in thin shining threads, walnut broken up, a scatter of pine nuts.
const drizzle = seed => cached(`honey:${seed}`, () => {
  const pts = Array.from({length: 9}, (_, k) => new THREE.Vector3(Math.cos(k * .9 + seed) * (.12 + k * .035), .01, Math.sin(k * .9 + seed) * (.12 + k * .035)));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .012, 5, false);
});
export function ExtraBits({extras = [], spread = .45, seed = 12}) {
  return <group>
    {extras.includes('honey') && [0, 2.1].map(s => <mesh key={s} geometry={drizzle(s)} position={[0, .03, 0]} scale={spread / .45} material={clear('#e8a92e', .85)}/>)}
    {extras.includes('walnut') && Array.from({length: 9}, (_, i) => {const [x, z] = spot(i, seed + 1, spread * .8), s = .04 + hash(i, seed, 7) * .025; return <mesh key={'w' + i} position={[x, .04, z]} rotation={[hash(i, 1), hash(i, 2) * TAU, hash(i, 3)]} scale={[s, s * .7, s * 1.2]} material={mat('#9b6b43', {rough: .7})} castShadow><dodecahedronGeometry args={[1, 0]}/></mesh>;})}
    {extras.includes('pinenut') && Array.from({length: 12}, (_, i) => {const [x, z] = spot(i, seed + 2, spread * .8); return <mesh key={'p' + i} position={[x, .035, z]} rotation={[Math.PI / 2, hash(i, 4) * TAU, 0]} scale={[.016, .03, .013]} material={mat('#f1e2c0', {rough: .4})} castShadow><sphereGeometry args={[1, 8, 6]}/></mesh>;})}
  </group>;
}
