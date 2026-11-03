import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {QuietCanvas} from './quiet-canvas.jsx';
import {Counter,Bowl,BOWL_FLOOR,bowlRadiusAt,swirlMap,Egg,EggHalf,Yolk,ShellDish,Splat,Whisk,WHISK_TIP,Tin,Oven,KITCHEN} from './dessert-tools.jsx';
import {TurnOutStep,FinishStep,FillStep,PlaceStep,StillOven,Finished} from './dessert-decorate.jsx';
import {dessertTop,plateTop} from './dessert-model.jsx';
import {normalizeDessert,BAKE_WORDS} from './dessert-recipe.js';
import {TAU,ease,easeIn,easeOut,span,buzz,kindOf,stepsFor,batterColors,bakeLevel,bakeColor,applyRise,BURNING,COUNTER_AT,DECO,TURNTABLE_TOP} from './dessert-motion.js';
import './dessert.css';

// Making a dessert by hand, one step at a time, the way a cooking game does
// it but without a score: crack the eggs on the bowl, draw circles to whisk,
// take it out of the oven when it looks right, turn it out onto the plate,
// finish it, and pipe, place and sprinkle wherever you like. How long it baked
// and where things went stay on the dessert; nothing is graded, and an egg
// that breaks or a cake left in too long is just how that one went.
// The steps are shared by every kind of dessert (see KINDS in dessert-motion.js).

// ---- the camera: one view per step, eased from one to the next ----
function shotFor(step, d) {
  if (step === 'egg') return {target: [-.05, .72, .3], dir: [0, 1.1, 1], w: 3.45, h: 3.2};
  if (step === 'whisk') return {target: [0, .3, 0], dir: [0, 1, .5], w: 2.55, h: 2.45};
  if (step === 'bake') return {target: [-.5, .8, .45], dir: [.08, .42, 1], w: 4.35, h: 3.1};
  if (step === 'unmold') return {target: [DECO.x * .6 + COUNTER_AT.x * .4, .62, (COUNTER_AT.z + DECO.z) / 2 + .1], dir: [.05, .95, 1], w: 4.5, h: 3.1};
  // Filling cream puffs: the whole pile, every hole in sight.
  if (step === 'frost' && kindOf(d).tool === 'nozzle') return {target: [DECO.x, TURNTABLE_TOP + plateTop(d.plate) + .42, DECO.z + .05], dir: [0, 1.25, 1], w: 2.35, h: 2.3};
  // Decorating: look down at the top, closer for a small one (a pudding, the top macaron).
  const top = dessertTop(d), w = Math.min(2.8, Math.max(1.75, top.R * 4.2));
  return {target: [DECO.x + top.p[0], TURNTABLE_TOP + top.p[1] - .12, DECO.z + top.p[2] + .05], dir: [0, 1.25, 1], w, h: w * .95};
}
function StepCamera({shot, step}) {
  const {camera, size, invalidate} = useThree(), now = useRef(null);
  useEffect(() => {invalidate();}, [step, size.width, size.height, invalidate]);
  useFrame((_, dt) => {
    const goal = {t: new THREE.Vector3(...shot.target), d: new THREE.Vector3(...shot.dir).normalize(), zoom: Math.min(size.width / shot.w, size.height / shot.h)};
    if (!now.current) now.current = {t: goal.t.clone(), d: goal.d.clone(), zoom: goal.zoom};
    const c = now.current, k = 1 - Math.exp(-Math.min(dt, .1) * 5);
    c.t.lerp(goal.t, k); c.d.lerp(goal.d, k).normalize(); c.zoom += (goal.zoom - c.zoom) * k;
    camera.position.copy(c.t).addScaledVector(c.d, 20); camera.lookAt(c.t); camera.zoom = c.zoom; camera.updateProjectionMatrix();
    if (c.t.distanceTo(goal.t) > .002 || c.d.distanceTo(goal.d) > .002 || Math.abs(c.zoom - goal.zoom) > .1) invalidate();
  });
  return null;
}

// What's in the bowl after n eggs: the whites make a pool, the yolks sit in it.
const POOL = n => BOWL_FLOOR + .035 + n * .04;
const YOLK_SPOTS = [[-.17, .1], [.19, -.05], [.03, .24], [-.06, -.2]];
function Pool({level, material}) {
  const r = bowlRadiusAt(level) - .012;
  return <mesh position={[0, level, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[r, r, 1]} material={material} receiveShadow><circleGeometry args={[1, 48]}/></mesh>;
}

// ---- step: crack the eggs ----
// Tap: the egg knocks on the rim and cracks. Tap again: it opens over the
// bowl, the yolk and white drop in, and the shells go into the little dish.
// For macarons only the whites go in; the yolk stays in its shell.
// Now and then something happens: an egg breaks on the rim and can't be used
// (it stays splashed on the board, and another egg comes), or one has two yolks.
const EGG_SCALE = 1.35;
const HOLD = new THREE.Vector3(1.05, 1.95, -.15), RIM = new THREE.Vector3(.95, 1.08, .33), OVER = new THREE.Vector3(0, 1.5, .05), ENTER = new THREE.Vector3(2.8, 2.1, -.2);
const DISH_AT = [-1.12, 0, 1.22], SPLATS = [[1.2, .06, .62], [.98, .06, .92]];
const HOLD_TILT = [.15, 0, -1.15], KNOCK_TILT = [.15, 0, -1.3], OPEN_TILT = [0, 0, -Math.PI / 2];
const dishSlot = i => [DISH_AT[0] + (i % 2 ? .1 : -.08), DISH_AT[1] + .1 + Math.floor(i / 2) * .05, DISH_AT[2] + (i % 2 ? -.06 : .07)];
// Chance, but kind: an egg breaks now and then (less often the very first
// one), never two in a row and at most twice; two yolks at most once.
function chance(kind, s) {
  if (kind === 'smash') return !s.lastSmash && s.smashes < 2 && Math.random() < (s.spawned ? .16 : .08);
  return !s.hadDouble && Math.random() < .12;
}
function SplatPop({at, turn, brown}) {
  const g = useRef(), born = useRef(performance.now()), invalidate = useThree(s => s.invalidate);
  useFrame(() => {const u = (performance.now() - born.current) / 260; g.current.scale.setScalar(.35 + .65 * easeOut(u)); if (u < 1) invalidate();});
  return <group ref={g} position={at} scale={.35}><Splat turn={turn} brown={brown}/></group>;
}
export function EggStep({d, taps, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate);
  const count = kindOf(d).eggs, whites = !!kindOf(d).whites;
  const egg = useRef(), whole = useRef(), top = useRef(), bottom = useRef(), drop = useRef(), drop2 = useRef(), white = useRef();
  const st = useRef({n: 0, spawned: 0, yolks: 0, smashes: 0, phase: 'enter', t0: performance.now()}), seen = useRef(taps);
  const [n, setN] = useState(0), [spawned, setSpawned] = useState(0), [cracked, setCracked] = useState(false), [yolks, setYolks] = useState(0), [used, setUsed] = useState(0), [splats, setSplats] = useState([]), [done, setDone] = useState(false);
  const poolMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#f6ead0', roughness: .08, metalness: .05, transparent: true, opacity: .9}), []);
  const whiteMat = useMemo(() => new THREE.MeshStandardMaterial({color: KITCHEN.white, roughness: .1, transparent: true, opacity: .75, depthWrite: false}), []);
  const say = (left = count - st.current.n) => onHint(left > 1 ? `点一下，把蛋在碗边磕开（还有 ${left} 个）` : '点一下，把蛋在碗边磕开');
  useEffect(() => {say(count);}, []);
  useEffect(() => {
    if (taps === seen.current) return; seen.current = taps;
    const s = st.current;
    if (s.phase === 'ready') knock(s);
    else if (s.phase === 'enter') s.early = true;
    else if (s.phase === 'cracked') {s.phase = 'open'; s.t0 = performance.now(); s.double = !whites && chance('double', s);}
    invalidate();
  }, [taps]);
  // A tap while the egg is still being brought up is kept for when it is in hand.
  function knock(s) {s.early = false; s.phase = 'knock'; s.t0 = performance.now(); s.smash = chance('smash', s);}
  useFrame(state => {
    const s = st.current, t = (performance.now() - s.t0) / 1000, g = egg.current;
    if (s.phase === 'done') {if (t > .7) {if (!s.told) {s.told = true; onDone({yolks: s.yolks});}} else invalidate(); return;}
    if (!g) return;
    const place = (from, to, u) => g.position.lerpVectors(from, to, u);
    const tilt = (a, b, u) => g.rotation.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u);
    g.visible = s.phase !== 'smashed';
    whole.current.visible = s.phase !== 'open'; top.current.visible = bottom.current.visible = s.phase === 'open';
    if (s.phase === 'enter') {
      place(ENTER, HOLD, easeOut(t / .42)); tilt([0, 0, -1.2], HOLD_TILT, easeOut(t / .42));
      if (t >= .42) {s.phase = 'ready'; s.t0 = performance.now(); if (s.sayOnReady) {s.sayOnReady = false; say();} if (s.early) knock(s);}
    } else if (s.phase === 'ready' || s.phase === 'cracked') {
      g.position.copy(HOLD); g.position.y += Math.sin(state.clock.elapsedTime * 2.6) * .018; tilt(HOLD_TILT, HOLD_TILT, 0);
    } else if (s.phase === 'knock') {
      if (t < .1) {place(HOLD, RIM, easeIn(t / .1)); tilt(HOLD_TILT, KNOCK_TILT, t / .1);}
      else if (s.smash) {
        // Too thin a shell: it bursts on the rim and runs onto the board.
        s.phase = 'smashed'; s.t0 = performance.now(); s.smashes++; s.lastSmash = true; buzz(40);
        setSplats(list => [...list, {at: SPLATS[list.length % SPLATS.length], turn: Math.random() * TAU, brown: s.spawned % 2 === 1}]);
        onHint('啪——磕碎啦。这个不能用了，再拿一个');
      } else {
        if (!s.hit) {s.hit = true; s.lastSmash = false; setCracked(true); buzz(14);}
        const u = span(t, .1, .42); place(RIM, HOLD, easeOut(u)); g.position.y += Math.sin(Math.min(1, u) * Math.PI) * .06; tilt(KNOCK_TILT, HOLD_TILT, easeOut(u));
        if (t >= .42) {s.phase = 'cracked'; s.hit = false; onHint('裂开啦，再点一下，掰开');}
      }
    } else if (s.phase === 'smashed') {
      if (t >= 1.1) {s.spawned++; setSpawned(s.spawned); setCracked(false); s.phase = 'enter'; s.t0 = performance.now(); say();}
    } else if (s.phase === 'open') {
      place(HOLD, OVER, ease(t / .22)); tilt(HOLD_TILT, OPEN_TILT, ease(t / .22));
      // The halves come apart like a clam, the open sides down.
      const o = ease(span(t, .22, .46));
      top.current.position.set(0, .05 + .09 * o, 0); top.current.rotation.set(0, 0, .95 * o);
      bottom.current.position.set(0, -.05 - .09 * o, 0); bottom.current.rotation.set(0, 0, -.95 * o);
      // What was inside falls into the bowl and lands in the pool.
      const level = POOL(s.n + 1), f = span(t, .32, .62), falling = f > 0 && f < 1;
      drop.current.visible = falling && !whites; drop2.current.visible = falling && s.double; white.current.visible = falling;
      if (falling) {
        const fall = (m, spot) => m.position.set(OVER.x + (spot[0] - OVER.x) * f, OVER.y + (level + .03 - OVER.y) * easeIn(f), OVER.z + (spot[1] - OVER.z) * f);
        fall(drop.current, YOLK_SPOTS[s.yolks % 4]); fall(drop2.current, YOLK_SPOTS[(s.yolks + 1) % 4]);
        white.current.position.copy(drop.current.position).y -= .03; white.current.scale.set(1 + f * .6, .45 - f * .15, 1 + f * .6);
      }
      if (f >= 1 && !s.landed) {
        s.landed = true; buzz(8); setUsed(s.n + 1);
        if (!whites) {s.yolks += s.double ? 2 : 1; setYolks(s.yolks);}
        if (s.double) {s.hadDouble = true; onHint('双黄蛋！');}
      }
      // The empty shells go off into the dish; then the next egg, or the end.
      if (t >= .62) {
        const u = ease(span(t, .62, .98)), slot = dishSlot(s.n);
        g.position.set(OVER.x + (slot[0] - OVER.x) * u, OVER.y + (slot[1] - OVER.y) * u + Math.sin(u * Math.PI) * .25, OVER.z + (slot[2] - OVER.z) * u);
        g.scale.setScalar(EGG_SCALE * (1 - .3 * u));
      }
      if (t >= 1) {
        s.landed = false; g.scale.setScalar(EGG_SCALE);
        if (s.n + 1 < count) {s.n++; s.spawned++; setN(s.n); setSpawned(s.spawned); setCracked(false); s.phase = 'enter'; s.t0 = performance.now(); if (s.double) s.sayOnReady = true; else say();}
        else {s.phase = 'done'; s.t0 = performance.now(); setDone(true); if (!s.double) onHint(whites ? '蛋白都在碗里了' : '蛋都在碗里了');}
      }
    }
    invalidate();
  });
  // Shells already opened rest in the dish, a pair for each egg.
  const rested = Array.from({length: done ? count : n}, (_, i) => i), brown = spawned % 2 === 1;
  return <group>
    <Bowl/>
    {used > 0 && <Pool level={POOL(used)} material={poolMat}/>}
    {Array.from({length: yolks}, (_, i) => <group key={i} position={[YOLK_SPOTS[i % 4][0], POOL(used) + .025, YOLK_SPOTS[i % 4][1]]} scale={[1, .82, 1]}><Yolk/></group>)}
    <group position={DISH_AT}><ShellDish/></group>
    {rested.map(i => <group key={i} position={dishSlot(i)} scale={EGG_SCALE * .7} rotation={[0, i * 1.7, 0]}>
      <group rotation={[0, 0, -.2]} position={[-.08, 0, 0]}><EggHalf/>{whites && <group position={[0, -.07, 0]}><Yolk r={.06}/></group>}</group>
      <group rotation={[Math.PI, 0, .3]} position={[.1, .02, 0]}><EggHalf top/></group>
    </group>)}
    {splats.map((p, i) => <SplatPop key={i} at={p.at} turn={p.turn} brown={p.brown}/>)}
    {!done && <group ref={egg} position={ENTER.toArray()} scale={EGG_SCALE}>
      <group ref={whole}><Egg cracked={cracked} brown={brown}/></group>
      <group ref={top} visible={false}><EggHalf top brown={brown}/></group>
      <group ref={bottom} visible={false}><EggHalf brown={brown}/>{whites && <group position={[0, -.07, 0]}><Yolk r={.06}/></group>}</group>
    </group>}
    <group ref={drop} visible={false}><Yolk/></group>
    <group ref={drop2} visible={false}><Yolk/></group>
    <mesh ref={white} visible={false} material={whiteMat}><sphereGeometry args={[.14, 16, 10]}/></mesh>
  </group>;
}

// ---- step: whisk ----
// Draw circles in the bowl. The whisk follows the finger; the yolks give way,
// the batter turns smooth and pale (or takes its colour), and bubbles come up
// as it gets fluffy. Five turns' worth of stirring, in any direction. The
// finger is read in the bowl's own frame, so the bowl can stand anywhere (the
// cooking counter has it off to one side, a little smaller).
const TURNS = 5, WHISK_LEAN = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.3, 0, -.55)), WHISK_REACH = new THREE.Vector3(0, -WHISK_TIP, 0).applyQuaternion(WHISK_LEAN), UP = new THREE.Vector3(0, 1, 0), twirl = new THREE.Quaternion();
const BUBBLES = Array.from({length: 18}, (_, i) => {const a = i * 2.39996 + .3, r = .12 + .55 * Math.sqrt(((i * 37) % 18 + .5) / 18); return {a, r, s: .018 + ((i * 7) % 5) * .005};});
export function WhiskStep({d, yolks, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate), root = useRef();
  const colors = useMemo(() => batterColors(d), [d]), whites = !!kindOf(d).whites;
  const level0 = POOL(kindOf(d).eggs);
  const whisk = useRef(), batter = useRef(), swirl = useRef(), yolkGroup = useRef(), bubbles = useRef();
  const pool = useMemo(() => new THREE.Color(KITCHEN.white), []);
  const batterMat = useMemo(() => new THREE.MeshStandardMaterial({color: pool.clone(), roughness: .32}), [colors]);
  const swirlMat = useMemo(() => new THREE.MeshStandardMaterial({map: swirlMap(), transparent: true, opacity: .75, depthWrite: false, roughness: .35}), []);
  const bubbleMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .15, transparent: true, opacity: .8}), []);
  const st = useRef({down: false, last: null, total: 0, spin: 0, ticks: 0, tip: new THREE.Vector3(.38, level0, .22), want: new THREE.Vector3(.38, level0, .22), half: false, done: 0, told: false});
  useEffect(() => {onHint(whites ? '手指在碗里画圈，把蛋白打发' : '手指在碗里画圈，搅一搅');}, []);
  const aim = p => {const r = Math.hypot(p.x, p.z), k = r > .68 ? .68 / r : 1; st.current.want.set(p.x * k, 0, p.z * k);};
  const local = e => root.current ? root.current.worldToLocal(e.point.clone()) : e.point;
  const onDown = e => {
    const s = st.current; if (s.done) return;
    e.stopPropagation(); e.target?.setPointerCapture?.(e.pointerId);
    const p = local(e);
    s.down = true; s.last = Math.atan2(p.z, p.x); aim(p); invalidate();
  };
  const onMove = e => {
    const s = st.current; if (!s.down || s.done) return;
    const p = local(e);
    aim(p);
    const r = Math.hypot(p.x, p.z), a = Math.atan2(p.z, p.x);
    if (r > .1 && s.last !== null) {const da = Math.atan2(Math.sin(a - s.last), Math.cos(a - s.last)); s.total += Math.abs(da); s.spin += da;}
    s.last = a;
    const ticks = Math.floor(s.total / (Math.PI / 2)); if (ticks > s.ticks) {s.ticks = ticks; buzz(4);}
    invalidate();
  };
  const onUp = e => {st.current.down = false; st.current.last = null; e?.target?.releasePointerCapture?.(e.pointerId);};
  useFrame((_, dt) => {
    const s = st.current, p = Math.min(1, s.total / (TURNS * TAU)), level = level0 + .2 * ease(p), r = bowlRadiusAt(level) - .012;
    batter.current.position.y = level; batter.current.scale.set(r, r, 1);
    // White with the yolks in it, then yellow as they give way, then pale.
    if (p < .3) batterMat.color.copy(pool).lerp(colors.mix, ease(p / .3)); else batterMat.color.copy(colors.mix).lerp(colors.raw, ease((p - .3) / .7));
    swirl.current.position.y = level + .003; swirl.current.scale.set(r * .96, r * .96, 1); swirl.current.rotation.z = -s.spin * .6;
    swirlMat.opacity = .12 + .6 * (1 - ease(p)) * Math.min(1, s.total / 1.5);
    yolkGroup.current.rotation.y = -s.spin * .6; yolkGroup.current.position.y = level + .02;
    yolkGroup.current.children.forEach(y => {const k = Math.max(.001, 1 - Math.min(1, p * 2.6)); y.scale.set(k, k * .82, k);});
    bubbles.current.rotation.y = -s.spin * .6; bubbles.current.position.y = level + .004;
    bubbles.current.children.forEach((b, i) => {b.visible = i < Math.floor(p * BUBBLES.length + .3);});
    // The whisk: its tip on the batter where the finger is, leaning back
    // towards you, lifted a little when no finger is on it.
    s.tip.lerp(s.want, 1 - Math.exp(-Math.min(dt, .1) * 20));
    const lift = s.done ? easeIn((performance.now() - s.done) / 700) * 1.6 : s.down ? 0 : .07;
    whisk.current.position.set(s.tip.x - WHISK_REACH.x, level + lift - WHISK_REACH.y, s.tip.z - WHISK_REACH.z);
    whisk.current.quaternion.copy(WHISK_LEAN).multiply(twirl.setFromAxisAngle(UP, -s.spin * .9));
    if (p >= .5 && !s.half) {s.half = true; onHint(whites ? '慢慢变白了，再转几圈' : '颜色变浅了，再转几圈');}
    if (p >= 1 && !s.done) {s.done = performance.now(); s.down = false; buzz(18); onHint(whites ? '打好了，白白的一大团' : '搅好了，又滑又亮');}
    if (s.done && performance.now() - s.done > 950) {if (!s.told) {s.told = true; onDone();} return;}
    if (s.down || s.done || s.tip.distanceTo(s.want) > .002) invalidate();
  });
  return <group ref={root}>
    <Bowl/>
    <mesh ref={batter} rotation={[-Math.PI / 2, 0, 0]} material={batterMat} receiveShadow><circleGeometry args={[1, 48]}/></mesh>
    <mesh ref={swirl} rotation={[-Math.PI / 2, 0, 0]} material={swirlMat}><circleGeometry args={[1, 48]}/></mesh>
    <group ref={yolkGroup}>{YOLK_SPOTS.slice(0, yolks).map(([x, z], i) => <group key={i} position={[x, 0, z]} scale={[1, .82, 1]}><Yolk/></group>)}</group>
    <group ref={bubbles}>{BUBBLES.map((b, i) => <mesh key={i} position={[Math.cos(b.a) * b.r, 0, Math.sin(b.a) * b.r]} material={bubbleMat} visible={false}><sphereGeometry args={[b.s, 10, 6]}/></mesh>)}</group>
    <group ref={whisk}><Whisk/></group>
    {/* A wide clear sheet at the batter's height catches the finger. */}
    <mesh position={[0, level0 + .02, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}><planeGeometry args={[40, 40]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
  </group>;
}

// ---- step: bake ----
// Tap and the door drops open, the tin goes in and the light comes on.
// Through the window it rises and colours; tap again to take it out. Left in
// long enough the steam turns to smoke and it burns, and that is kept too.
const FRONT = new THREE.Vector3(-.34, .5, 1.75), INSIDE = new THREE.Vector3(-.34, .42, -.05);
const DOOR_OPEN = 1.38, VENT = [-.3, 1.74, -.25];
const SMOKE = new THREE.Color('#8d8682'), STEAM = new THREE.Color('#ffffff');
function BakeStep({d, taps, onHint, onBaked}) {
  const invalidate = useThree(s => s.invalidate);
  const colors = useMemo(() => batterColors(d), [d]);
  const batterMat = useMemo(() => new THREE.MeshStandardMaterial({color: colors.raw.clone(), roughness: .5}), [colors]);
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#fff4e4', transparent: true, opacity: .3, roughness: .06, metalness: .1, emissive: new THREE.Color('#000000'), depthWrite: false}), []);
  const lampMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#e9c9c6', roughness: .35, emissive: new THREE.Color('#000000')}), []);
  const puffMat = useMemo(() => Array.from({length: 4}, () => new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, roughness: 1})), []);
  const door = useRef(), knob = useRef(), glow = useRef(), tin = useRef(), rise = useRef(), puffs = useRef();
  const st = useRef({phase: 'wait', t0: performance.now(), start: 0, baked: 0}), seen = useRef(taps), warm = useMemo(() => new THREE.Color('#ff9a4d'), []);
  useEffect(() => {onHint('点一下烤箱，把模子放进去');}, []);
  useEffect(() => {
    if (taps === seen.current) return; seen.current = taps;
    const s = st.current, now = performance.now();
    if (s.phase === 'wait') {s.phase = 'in'; s.t0 = now;}
    else if (s.phase === 'baking' && now - s.start > 700) {s.baked = (now - s.start) / 1000; s.phase = 'out'; s.t0 = now;}
    invalidate();
  }, [taps]);
  useFrame(state => {
    const s = st.current, now = performance.now(), t = (now - s.t0) / 1000;
    const path = (u1, u2, from, mid, to) => {const a = ease(u1), b = ease(u2); if (u2 <= 0) return tin.current.position.lerpVectors(from, mid, a); return tin.current.position.lerpVectors(mid, to, b);};
    const swing = (open, close) => {door.current.rotation.x = DOOR_OPEN * ease(open) * (1 - ease(close));};
    const e = s.phase === 'baking' ? (now - s.start) / 1000 : s.baked;
    const heat = s.phase === 'baking' ? Math.min(1, e / .4) : s.phase === 'out' ? 1 - Math.min(1, t / .4) : 0;
    if (s.phase === 'in') {
      swing(t / .35, span(t, 1, 1.35)); path(span(t, .3, .65), span(t, .65, 1), COUNTER_AT, FRONT, INSIDE);
      if (t >= 1.35) {s.phase = 'baking'; s.start = now; onHint('隔着窗看它慢慢鼓起来，想拿出来就点一下');}
    } else if (s.phase === 'baking') {
      if (e >= BURNING && !s.smelt) {s.smelt = true; onHint('好像闻到焦味了……');}
    } else if (s.phase === 'out') {
      swing(t / .35, span(t, 1, 1.35)); path(span(t, .3, .65), span(t, .65, 1), INSIDE, FRONT, COUNTER_AT);
      if (t >= 1.35) {s.phase = 'result'; s.t0 = now; s.level = bakeLevel(s.baked); onHint(BAKE_WORDS[s.level]);}
    } else if (s.phase === 'result' && t >= 1.7 && !s.told) {s.told = true; onBaked(s.level, s.baked); return;}
    if (s.phase !== 'wait') {
      applyRise(rise.current, d.base, e);
      bakeColor(colors, e, batterMat.color);
    }
    glow.current.intensity = 2.6 * heat;
    glassMat.emissive.copy(warm).multiplyScalar(.22 * heat); lampMat.emissive.copy(warm).multiplyScalar(.9 * heat);
    if (s.phase === 'baking') knob.current.rotation.z = -Math.min(e, 14) * .45;
    // Steam from the vent once it smells sweet; grey smoke once it burns.
    const steam = s.phase === 'baking' ? Math.min(1, Math.max(0, (e - 3.4) / 1.2)) : s.phase === 'out' ? Math.max(0, 1 - t / .6) : 0;
    const smoke = Math.min(1, Math.max(0, (e - (BURNING - .5)) / 1.5));
    puffs.current.children.forEach((m, i) => {
      const ph = ((state.clock.elapsedTime * (.45 + .25 * smoke)) + i / 4) % 1;
      m.position.set(VENT[0] + Math.sin(ph * 3 + i) * .1, VENT[1] + ph * .75, VENT[2] + .05 * i);
      m.scale.setScalar((.45 + ph * 1.1) * (1 + .6 * smoke)); puffMat[i].color.copy(STEAM).lerp(SMOKE, smoke); puffMat[i].opacity = (.5 + .3 * smoke) * (1 - ph) * steam; m.visible = steam > 0;
    });
    if (s.phase !== 'wait') invalidate();
  });
  return <group>
    <Oven door={door} knob={knob} glow={glow} lamp={lampMat} glass={glassMat}/>
    <group ref={tin} position={COUNTER_AT.toArray()}><Tin base={d.base} rise={rise} batter={batterMat}/></group>
    <group ref={puffs}>{puffMat.map((m, i) => <mesh key={i} material={m} visible={false}><sphereGeometry args={[.09, 12, 8]}/></mesh>)}</group>
  </group>;
}

// ---- the steps, in the dessert table's stage and card ----
// What it is so far travels from step to step: how many yolks went in, how
// long it baked, the marks of piping, fruit and sprinkles placed by hand, and
// any of those left off altogether (then that dessert simply has none).
export function DessertSteps({draft, onDone, onQuit}) {
  const d0 = useMemo(() => normalizeDessert(draft), []), steps = useMemo(() => stepsFor(d0), [d0]);
  const [index, setIndex] = useState(0), [hint, setHint] = useState(''), [taps, setTaps] = useState(0), [enough, setEnough] = useState(0);
  const [made, setMade] = useState({yolks: 0, bake: 'golden', hand: {}, left: {}});
  const finished = index >= steps.length, step = finished ? 'done' : steps[index][0];
  const next = patch => {setMade(m => ({...m, ...(typeof patch === 'function' ? patch(m) : patch)})); setIndex(i => i + 1);};
  const d = useMemo(() => ({...d0, ...made.left, bake: made.bake === 'golden' ? undefined : made.bake, hand: made.hand, burst: made.burst}), [d0, made]);
  const placing = ['pipe', 'fruit', 'sprinkle'].includes(step), last = index === steps.length - 1;
  const placed = layer => marks => next(m => marks.length ? {hand: {...m.hand, [layer]: marks}} : {left: {...m.left, [layer]: 'none'}});
  useEffect(() => {if (finished) setHint(`做好啦！${BAKE_WORDS[made.bake]}。`);}, [finished]);
  const tap = () => setTaps(n => n + 1);
  return <div className="atelier-top dessert-cooking">
    <div className="atelier-stage bench-stage dessert-stage dessert-cook-stage" tabIndex={0} aria-label={hint} onPointerDown={e => {if (e.button > 0) return; tap();}} onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); tap();}}}>
      <div className="atelier-wall"/>
      <QuietCanvas orthographic shadows camera={{position: [0, 9, 18], zoom: 100, near: .1, far: 100}} dpr={[1, 1.5]}>
        <StepCamera step={step} shot={shotFor(step, d)}/>
        <ambientLight intensity={1.05}/><hemisphereLight args={['#fff8e9', '#c3ac9b', .85]}/>
        <directionalLight position={[-4, 9, 6]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-.0004} shadow-normalBias={.02} shadow-camera-left={-7} shadow-camera-right={6} shadow-camera-top={5} shadow-camera-bottom={-5}/>
        <Counter board={step === 'egg' || step === 'whisk'}/>
        {step === 'egg' && <EggStep d={d0} taps={taps} onHint={setHint} onDone={r => next({yolks: r.yolks})}/>}
        {step === 'whisk' && <WhiskStep d={d0} yolks={made.yolks} onHint={setHint} onDone={() => next({})}/>}
        {step === 'bake' && <BakeStep d={d0} taps={taps} onHint={setHint} onBaked={(bake, seconds) => next({bake, seconds})}/>}
        {!['egg', 'whisk', 'bake'].includes(step) && <StillOven/>}
        {step === 'unmold' && <TurnOutStep d={d} seconds={made.seconds} taps={taps} onHint={setHint} onDone={() => next({})}/>}
        {step === 'frost' && (kindOf(d).tool === 'nozzle' ? <FillStep d={d} onHint={setHint} onDone={r => next({burst: r.burst})}/> : <FinishStep d={d} onHint={setHint} onDone={() => next({})}/>)}
        {step === 'pipe' && <PlaceStep key="pipe" d={d} layer="cream" enough={enough} onHint={setHint} onDone={placed('cream')}/>}
        {step === 'fruit' && <PlaceStep key="fruit" d={d} layer="fruit" enough={enough} onHint={setHint} onDone={placed('fruit')}/>}
        {step === 'sprinkle' && <PlaceStep key="sprinkle" d={d} layer="sprinkles" enough={enough} onHint={setHint} onDone={placed('sprinkles')}/>}
        {step === 'done' && <Finished d={d}/>}
      </QuietCanvas>
    </div>
    <aside className="atelier-card dessert-card dessert-step-card">
      <ol className="dessert-step-dots" aria-label={`第 ${Math.min(index + 1, steps.length)} 步，共 ${steps.length} 步`}>{steps.map(([id, label], i) => <li key={id} title={label} className={finished || i < index ? 'done' : i === index ? 'now' : ''}/>)}</ol>
      <b className="dessert-step-name">{finished ? '做好啦' : steps[index][1]}</b>
      <p role="status" className="dessert-step-hint">{hint}</p>
      {finished ? <button className="atelier-save" onClick={() => onDone({bake: made.bake, hand: made.hand, left: made.left, burst: made.burst})}>好了，起个名字</button> : <div className="dessert-step-actions">
        {placing && <button className="dessert-step-enough" onClick={() => setEnough(n => n + 1)}>{last ? '好了' : '好了，下一步'}</button>}
        <button className="dessert-step-quit" onClick={onQuit}>不做了</button>
      </div>}
    </aside>
  </div>;
}
