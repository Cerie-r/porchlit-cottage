import React,{useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {ease,easeIn,easeOut,span} from './dessert-motion.js';
import {STATION as S,BLOCK_H,WOK_FLOOR} from './cooking-tools.jsx';

// What the little things that go their own way at the stove look like (src/cooking-mishaps.js): a tomato's juice
// flying out over the block and staying there in splashes, a pea hopping off the block and rolling off the front of
// the counter, oil spitting up out of the wok, a toss of the wok catching fire for a moment. Each starts at `start`
// (the page's clock, performance.now()) and keeps asking for frames only while it moves.

const TAU = Math.PI * 2;
const FRONT = S.back + S.depth;
const cache = new Map();
const cached = (key, make) => {if (!cache.has(key)) cache.set(key, make()); return cache.get(key);};
const juiceMat = () => cached('juice', () => new THREE.MeshStandardMaterial({color: '#d9483a', roughness: .18, metalness: 0, transparent: true, opacity: .88, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false}));
const dropMat = () => cached('juice-drop', () => new THREE.MeshStandardMaterial({color: '#e0523f', roughness: .12, metalness: 0}));
const peaMat = () => cached('pea', () => new THREE.MeshStandardMaterial({color: '#9ccb63', roughness: .35, metalness: 0}));
const oilMat = () => cached('oil-drop', () => new THREE.MeshStandardMaterial({color: '#ffd766', emissive: new THREE.Color('#f5b83d'), emissiveIntensity: .9, roughness: .08, metalness: .1}));
const flameMat = (color, opacity) => cached(`flame:${color}:${opacity}`, () => new THREE.MeshBasicMaterial({color, transparent: true, opacity, depthWrite: false}));
// The same few numbers every time for the same i, so a splash or a spurt always lands the same way.
const wobble = (i, k) => {const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s);};
const elapsed = start => (start ? (performance.now() - start) / 1000 : Infinity);

// ---- a tomato's juice ----
// Where it lands, around the tomato as it is cut: [across, towards the front, how big the splash is]. All of it on
// the block.
const SPLASHES = [[-.36, .24, .1], [.22, .44, .085], [.38, -.12, .07], [-.12, -.38, .09], [-.52, -.02, .06], [.06, .3, .065], [.3, .2, .075], [-.25, .5, .05], [.5, .28, .055]];
const splashAt = (from, [dx, dz]) => [from[0] + dx, BLOCK_H + .002, from[2] + dz];
const seedMat = () => cached('juice-seed', () => new THREE.MeshStandardMaterial({color: '#f1d98a', roughness: .3, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false}));
// One splash, lying flat: a blob drawn out to one side, a drop or two flung further, and in some a seed or two.
function Splash({at, size, i}) {
  const a = wobble(i, 11) * TAU, c = Math.cos(a), s = Math.sin(a);
  return <group position={at} rotation={[-Math.PI / 2, 0, 0]} scale={size}>
    <mesh scale={[1, .8, 1]} material={juiceMat()}><circleGeometry args={[1, 20]}/></mesh>
    <mesh position={[c * .72, s * .72, 0]} scale={.62} material={juiceMat()}><circleGeometry args={[1, 16]}/></mesh>
    {[1.7, 2.25].map((d, k) => <mesh key={k} position={[Math.cos(a + (k ? .45 : -.3)) * d, Math.sin(a + (k ? .45 : -.3)) * d, 0]} scale={k ? .16 : .24} material={juiceMat()}><circleGeometry args={[1, 10]}/></mesh>)}
    {i % 3 === 0 && [[-.3, .1, .6], [.25, -.2, -.4]].map(([x, y, r], k) => <mesh key={'s' + k} position={[x, y, .001]} rotation={[0, 0, r]} scale={[.16, .09, 1]} material={seedMat()}><circleGeometry args={[1, 10]}/></mesh>)}
  </group>;
}
// What is left on the block once it has squirted: the splashes, for the rest of the cooking.
export function JuiceSpots({from}) {
  return <group>{SPLASHES.map((s, i) => <Splash key={i} i={i} at={splashAt(from, s)} size={s[2]}/>)}</group>;
}
// The squirt itself: drops from the cut face out over the block, each a splash where it lands.
export function JuiceSquirt({from, start}) {
  const invalidate = useThree(s => s.invalidate), drops = useRef([]), splashes = useRef([]);
  const a = useMemo(() => new THREE.Vector3(from[0], from[1] - .08, from[2]), [from]);
  const ends = useMemo(() => SPLASHES.map(s => new THREE.Vector3(...splashAt(from, s))), [from]);
  useFrame(() => {
    const t = elapsed(start);
    let moving = false;
    ends.forEach((b, i) => {
      const d = drops.current[i], s = splashes.current[i];
      if (!d || !s) return;
      const t0 = i * .02, dur = .3 + wobble(i, 1) * .15, u = span(t, t0, t0 + dur);
      d.visible = u > 0 && u < 1;
      if (d.visible) {d.position.lerpVectors(a, b, u); d.position.y += Math.sin(u * Math.PI) * (.25 + wobble(i, 2) * .2);}
      const g = easeOut(span(t, t0 + dur, t0 + dur + .12));
      s.visible = g > 0; s.scale.setScalar(Math.max(.001, g));
      if (u < 1 || g < 1) moving = true;
    });
    if (moving) invalidate();
  });
  return <group>
    {ends.map((b, i) => <mesh key={'d' + i} ref={el => {drops.current[i] = el;}} visible={false} material={dropMat()} castShadow><sphereGeometry args={[.04, 8, 6]}/></mesh>)}
    {ends.map((b, i) => <group key={'s' + i} ref={el => {splashes.current[i] = el;}} position={b.toArray()} visible={false}><Splash i={i} at={[0, 0, 0]} size={SPLASHES[i][2]}/></group>)}
  </group>;
}

// ---- a pea that gets away ----
// Out of its pod with a hop, a smaller hop off the edge of the block onto the worktop, a roll to the front of the
// counter and over it, out of sight.
export function RunawayPea({from, start}) {
  const invalidate = useThree(s => s.invalidate), pea = useRef();
  const P = useMemo(() => {
    const [x, , z] = from, edge = S.block[2] + 1.2;
    return [new THREE.Vector3(x, BLOCK_H + .1, z), new THREE.Vector3(x + .12, BLOCK_H + .045, z + .55), new THREE.Vector3(x + .2, .045, edge + .2), new THREE.Vector3(x + .3, .045, FRONT - .03), new THREE.Vector3(x + .34, -1.6, FRONT + .3)];
  }, [from]);
  useFrame(() => {
    const t = elapsed(start), p = pea.current;
    if (!p) return;
    p.visible = t >= 0 && t < 1.6;
    if (!p.visible) return;
    if (t < .4) {const u = t / .4; p.position.lerpVectors(P[0], P[1], u); p.position.y += Math.sin(u * Math.PI) * .45;}
    else if (t < .7) {const u = (t - .4) / .3; p.position.lerpVectors(P[1], P[2], u); p.position.y += Math.sin(u * Math.PI) * .16;}
    else if (t < 1.15) p.position.lerpVectors(P[2], P[3], easeOut((t - .7) / .45));
    else {const u = (t - 1.15) / .45; p.position.lerpVectors(P[3], P[4], easeIn(u)); p.position.z = P[3].z + (P[4].z - P[3].z) * u;}
    p.rotation.x = t * 14; p.rotation.z = t * 5;
    invalidate();
  });
  return <mesh ref={pea} position={from} visible={false} material={peaMat()} castShadow><sphereGeometry args={[.045, 10, 8]}/></mesh>;
}

// ---- oil spitting up out of the wok ----
// In the wok's own frame. Hot drops jump up and out over the rim and are gone before they come down far, while
// the oil round what just went in boils up in little bubbles that pop.
const SPITS = Array.from({length: 16}, (_, i) => ({a: i / 16 * TAU + wobble(i, 3) * .5, up: .7 + wobble(i, 4) * .6, out: .85 + wobble(i, 5) * .75, dur: .5 + wobble(i, 6) * .3, at: wobble(i, 7) * .12, r: .7 + wobble(i, 12) * .6}));
const BUBBLES = Array.from({length: 14}, (_, i) => ({a: wobble(i, 13) * TAU, r: .12 + wobble(i, 14) * .42, at: wobble(i, 15) * .55, size: .03 + wobble(i, 16) * .03}));
const bubbleMat = () => cached('oil-bubble', () => new THREE.MeshStandardMaterial({color: '#fff6d8', roughness: .05, metalness: .1, transparent: true, opacity: .85}));
export function OilSpit({start}) {
  const invalidate = useThree(s => s.invalidate), drops = useRef([]), bubbles = useRef([]);
  useFrame(() => {
    const t = elapsed(start);
    SPITS.forEach((s, i) => {
      const d = drops.current[i];
      if (!d) return;
      const u = span(t, s.at, s.at + s.dur);
      d.visible = u > 0 && u < 1;
      if (!d.visible) return;
      const r = s.out * easeOut(u);
      d.position.set(Math.cos(s.a) * r, WOK_FLOOR + .12 + s.up * 4 * u * (1 - u) * 1.1 - .2 * u, Math.sin(s.a) * r);
      d.scale.setScalar(s.r * (1 - .5 * u));
    });
    BUBBLES.forEach((b, i) => {
      const m = bubbles.current[i];
      if (!m) return;
      const u = span(t, b.at, b.at + .2);
      m.visible = u > 0 && u < 1;
      if (m.visible) {m.position.set(Math.cos(b.a) * b.r, WOK_FLOOR + .1, Math.sin(b.a) * b.r); m.scale.setScalar(b.size * Math.sin(u * Math.PI) / .03);}
    });
    if (t < 1) invalidate();
  });
  return <group>
    {SPITS.map((s, i) => <mesh key={i} ref={el => {drops.current[i] = el;}} visible={false} material={oilMat()}><sphereGeometry args={[.05, 8, 6]}/></mesh>)}
    {BUBBLES.map((b, i) => <mesh key={'b' + i} ref={el => {bubbles.current[i] = el;}} visible={false} material={bubbleMat()}><sphereGeometry args={[.03, 8, 6]}/></mesh>)}
  </group>;
}

// ---- the wok catching fire for a moment ----
// In the wok's own frame. Tongues of flame, each a candle flame's shape (round below, drawn to a point), leap up
// out of it, lean and flicker and fall back, under a second in all.
const flameShape = () => cached('flame-shape', () => new THREE.LatheGeometry([[0, 0], [.5, .1], [.66, .28], [.6, .5], [.42, .72], [.22, .92], [.08, 1.06], [0, 1.14]].map(([r, y]) => new THREE.Vector2(Math.max(.0005, r), y)), 18));
const TONGUES = Array.from({length: 6}, (_, i) => ({x: i ? Math.cos(i * 1.4) * .32 : 0, z: i ? Math.sin(i * 1.4) * .24 : 0, h: (i ? .85 : 1.25) + wobble(i, 8) * .4, w: i ? .2 + wobble(i, 9) * .08 : .3, ph: wobble(i, 10) * TAU, lean: i ? .22 + wobble(i, 17) * .15 : .05, dir: i * 1.4}));
export function WokFlame({start}) {
  const invalidate = useThree(s => s.invalidate), outer = useRef([]), inner = useRef([]);
  useFrame(() => {
    const t = elapsed(start);
    const up = easeOut(span(t, 0, .14)) * (1 - ease(span(t, .45, .9)));
    TONGUES.forEach((g, i) => {
      const flicker = 1 + .18 * Math.sin(t * 36 + g.ph) + .08 * Math.sin(t * 61 + g.ph * 2), h = Math.max(.001, g.h * up * flicker), w = Math.max(.001, g.w * (.65 + .35 * up));
      const sway = g.lean + .08 * Math.sin(t * 19 + g.ph);
      [outer.current[i], inner.current[i]].forEach((m, k) => {
        if (!m) return;
        m.visible = up > .01;
        const kh = k ? h * .6 : h, kw = k ? w * .55 : w;
        m.scale.set(kw, kh, kw); m.position.set(g.x, .3, g.z);
        m.rotation.set(Math.sin(g.dir) * sway, 0, -Math.cos(g.dir) * sway);
      });
    });
    if (t < 1) invalidate();
  });
  return <group>
    {TONGUES.map((g, i) => <mesh key={'o' + i} ref={el => {outer.current[i] = el;}} visible={false} geometry={flameShape()} material={flameMat('#ffa043', .86)} renderOrder={2}/>)}
    {TONGUES.map((g, i) => <mesh key={'i' + i} ref={el => {inner.current[i] = el;}} visible={false} geometry={flameShape()} material={flameMat('#fff0b0', .92)} renderOrder={3}/>)}
  </group>;
}
