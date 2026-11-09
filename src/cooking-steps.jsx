import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {QuietCanvas} from './quiet-canvas.jsx';
import {EggStep,WhiskStep} from './dessert-steps.jsx';
import {Bowl,bowlRadiusAt,Egg} from './dessert-tools.jsx';
import {ease,easeIn,easeOut,span,buzz} from './dessert-motion.js';
import {normalizeDessert} from './dessert-recipe.js';
import {play} from './sounds.js';
import {STATION as S,BOWL_SCALE,BLOCK_H,BURNER_TOP,WOK_FLOOR,WOK_LIP,WOK_LIP_R,wokInsideAt,TAP_SPOUT,BASIN_FLOOR,BASIN_LIP,basinRadiusAt,Worktop,WashBasin,Tap,ChoppingBlock,Cleaver,Hob,Knob,Wok,Turner,Pot,Plate,OilAndSalt,TomatoWedge,GreensPieces,PumpkinCubes,PeaPod,Peas,PrepDish,Raw,Prepped,Cooked,DishFood,Scallion,Gloss,Garlic,DishModel,POD_SPOTS,PIECES,FOOD_SEEDS} from './cooking-tools.jsx';
import {INGREDIENTS,EXTRAS,stepsFor,heatAfter,HEAT_WORDS,BROWNING,CATCHING,mishapsFor,heatWords,extraVerb,teaEggs} from './cooking-recipe.js';
import {MISHAPS,MISHAPS_MAX,mayHappen,whichTap,whichPod,mishapWords} from './cooking-mishaps.js';
import {JuiceSquirt,JuiceSpots,RunawayPea,OilSpit,WokFlame} from './cooking-mishap-fx.jsx';
import {WaterStep,BoilStep,ServeStep,POT_AT,POT_SCALE} from './cooking-pot-steps.jsx';
import {SoupBowl,ServedDish,FoamStain,RiceBowl} from './cooking-pot-food.jsx';
import {KneadStep,RollStep,DOUGH_AT} from './cooking-dough-steps.jsx';
import {DoughSheet,Noodles,TaroCubes,BambooSlices,ExtraBits} from './cooking-pantry-food.jsx';
import './dessert.css';
import './cooking.css';

// Cooking at the counter, a step at a time, the way the dessert kitchen does it, with whatever was put on the
// counter: each thing from the fields washed under the tap and then cut on the block a tap at a time (or shelled,
// for peas), its pieces swept into a little dish; eggs cracked and beaten (the dessert kitchen's own steps); the
// fire lit; and then the wok, where what goes in, and when, is up to whoever is cooking: tap the wok to toss it,
// take it off the fire when it looks right, slide it onto the plate. The counter never changes; the camera goes
// from one place on it to the next. What went in, how many cuts and how long it was on the fire stay on the dish.

const v3 = a => new THREE.Vector3(...a);
const WOK_Y = .07 + BURNER_TOP - .01, PAN = WOK_Y + WOK_FLOOR;
// Eggs are cracked and beaten as for a plain sponge: two of them, yolks and all.
const EGG_D = normalizeDessert({base: 'cake'});
const BEATEN = '#f3dc9c', BEATEN_LEVEL = .495;
const isVeg = id => INGREDIENTS[id] && !INGREDIENTS[id].staple;

// ---- where things stand ----
// Brought from the fridge to wait by the basin; on the block to be cut; cut, in a little dish behind the block.
const WAIT = [S.basin[0] + 1.6, 0, S.basin[2] + 1.0];
const ON_BLOCK = {
  tomato: [S.block[0] + .6, BLOCK_H + .256, S.block[2] - .15], greens: [S.block[0] + .2, BLOCK_H + .02, S.block[2] - .3],
  pumpkin: [S.block[0] + .5, BLOCK_H + .26, S.block[2] - .1], pea: [S.block[0] + .45, BLOCK_H, S.block[2] + .05],
  taro: [S.block[0] + .55, BLOCK_H, S.block[2] - .1], bamboo: [S.block[0] + .55, BLOCK_H, S.block[2] - .05], wheat: DOUGH_AT
};
const LIFT = {tomato: .256, pumpkin: .26, greens: .02, pea: 0, taro: 0, bamboo: 0, wheat: 0, tea: 0};
const PREP = [-.9, 0, .9, 1.8].map(dx => [S.block[0] + dx, 0, -1.55]);
// Cut wedges lie on the left of the block in two rows, each on a cut face, clear of the next and of the tomato.
const WEDGE_SPOTS = Array.from({length: 8}, (_, i) => ({at: [S.block[0] - .62 + (i % 4) * .3, BLOCK_H + .005, S.block[2] + (i < 4 ? .55 : -.12)], turn: 0}));
const HEAP = [S.block[0] - .52, BLOCK_H, S.block[2] + .35];
// Where what was cut lies on the block, roughly: what it is swept up from.
const PILE = {tomato: [S.block[0] - .2, BLOCK_H, S.block[2] + .2], greens: HEAP, pumpkin: HEAP, pea: HEAP, taro: HEAP, bamboo: HEAP, wheat: HEAP};

// ---- the camera: one view per step, eased from one to the next ----
const SHOTS = {
  wash: {target: [S.basin[0] + .35, .72, S.basin[2] + .1], dir: [0, .9, 1], w: 4.3, h: 3.2},
  cut: {target: [S.block[0], .55, S.block[2] + .05], dir: [0, 1.05, 1], w: 3.7, h: 3.0},
  // Cut, the pieces go into their dish behind the block: a little wider and further back.
  prep: {target: [S.block[0] + .3, .45, S.block[2] - .55], dir: [0, 1.1, 1], w: 4.4, h: 3.3},
  egg: {target: [S.bowl[0] + .1, .7, S.bowl[2] + .2], dir: [0, 1.1, 1], w: 3.3, h: 3.0},
  whisk: {target: [S.bowl[0], .32, S.bowl[2]], dir: [0, 1, .5], w: 2.2, h: 2.1},
  fire: {target: [S.wok[0] + .55, .4, S.wok[2] + .35], dir: [0, .62, 1], w: 4.2, h: 2.9},
  cook: {target: [S.wok[0] - .2, .62, S.wok[2] - .15], dir: [0, 1.1, 1], w: 4.2, h: 3.3},
  plate: {target: [(S.wok[0] + S.plate[0]) / 2 + .2, .65, S.plate[2] - .2], dir: [0, .85, 1], w: 6.4, h: 3.4},
  done: {target: [S.plate[0] - .2, .25, S.plate[2]], dir: [0, 1.3, 1], w: 2.8, h: 2.5},
  // The little pot on the right ring (src/cooking-pot-steps.jsx): its knob, the jug pouring, the pot itself, and
  // the pot and the bowl together for ladling.
  firePot: {target: [S.pot[0] - .2, .4, S.pot[2] + .45], dir: [0, .62, 1], w: 4.2, h: 2.9},
  water: {target: [S.pot[0] + .45, .85, S.pot[2] - .1], dir: [0, .95, 1], w: 3.8, h: 3.0},
  boil: {target: [S.pot[0] - .15, .72, S.pot[2] + .05], dir: [0, 1.15, 1], w: 3.7, h: 3.1},
  serve: {target: [(S.pot[0] + S.plate[0]) / 2, .7, (S.pot[2] + S.plate[2]) / 2], dir: [0, .9, 1], w: 4.9, h: 3.3},
  donePot: {target: [S.plate[0] - .1, .35, S.plate[2]], dir: [0, 1.2, 1], w: 2.6, h: 2.4}
};
const shotOf = (step, phase, method = 'wok') => {
  const kind = step.split(':')[0], pot = method === 'pot';
  if (phase === 'prep') return SHOTS.prep;
  if (kind === 'shell') return SHOTS.cut;
  if (kind === 'rinse') return SHOTS.wash;
  if (kind === 'knead' || kind === 'roll') return SHOTS.cut;
  if (pot && kind === 'fire') return SHOTS.firePot;
  if (pot && kind === 'done') return SHOTS.donePot;
  return SHOTS[kind] || SHOTS.done;
};
function StepCamera({shot, step}) {
  const {camera, size, invalidate} = useThree(), now = useRef(null);
  useEffect(() => {invalidate();}, [step, shot, size.width, size.height, invalidate]);
  useFrame((_, dt) => {
    const goal = {t: v3(shot.target), d: v3(shot.dir).normalize(), zoom: Math.min(size.width / shot.w, size.height / shot.h)};
    if (!now.current) now.current = {t: goal.t.clone(), d: goal.d.clone(), zoom: goal.zoom};
    const c = now.current, k = 1 - Math.exp(-Math.min(dt, .1) * 4);
    c.t.lerp(goal.t, k); c.d.lerp(goal.d, k).normalize(); c.zoom += (goal.zoom - c.zoom) * k;
    camera.position.copy(c.t).addScaledVector(c.d, 30); camera.lookAt(c.t); camera.zoom = c.zoom; camera.updateProjectionMatrix();
    if (c.t.distanceTo(goal.t) > .002 || c.d.distanceTo(goal.d) > .002 || Math.abs(c.zoom - goal.zoom) > .1) invalidate();
  });
  return null;
}
// The arc of something thrown from a to b, `high` above the straight line at the middle.
function arc(out, a, b, u, high = .6) {
  out.lerpVectors(a, b, u); out.y += Math.sin(Math.min(1, Math.max(0, u)) * Math.PI) * high; return out;
}

// ---- step: wash ----
// Tap: it hops into the basin, the tap runs and the water comes up; a couple of seconds' rinse, the tap goes off
// and it is lifted out onto the block, shining wet.
const WATER = .6, waterLevel = w => BASIN_FLOOR + .02 + w * (BASIN_LIP - .14);
// Rice is rinsed the same way, in its bowl, the water going cloudy; then it waits in its bowl behind the block.
function WashStep({id, taps, to: dest, onHint, onTap, onDone}) {
  const invalidate = useThree(s => s.invalidate), name = INGREDIENTS[id].name, greens = id === 'greens', rice = id === 'rice', lift = LIFT[id] || 0;
  const veg = useRef(), water = useRef(), stream = useRef(), rings = useRef();
  const st = useRef({phase: 'wait', t0: performance.now()}), seen = useRef(taps), [washed, setWashed] = useState(false);
  const B = useMemo(() => v3(S.basin), []), from = useMemo(() => v3(WAIT).add(new THREE.Vector3(0, lift, 0)), [id]);
  const to = useMemo(() => v3(dest || ON_BLOCK[id]), [id]), tmp = useMemo(() => new THREE.Vector3(), []);
  const turn0 = greens ? -1.2 : .4, turn1 = greens ? 0 : .4;
  useEffect(() => {onHint(rice ? '点一下，淘一淘米' : `点一下，把${name}放进盆里冲一冲`);}, []);
  useEffect(() => {
    if (taps === seen.current) return; seen.current = taps;
    const s = st.current; if (s.phase === 'wait') {s.phase = 'in'; s.t0 = performance.now(); invalidate();}
  }, [taps]);
  useFrame(state => {
    const s = st.current, t = (performance.now() - s.t0) / 1000, g = veg.current;
    if (!g) return;
    const w = s.phase === 'rinse' ? Math.min(WATER, t / 1.2 * WATER) : s.phase === 'out' || s.phase === 'gone' ? WATER : 0;
    const lv = waterLevel(w), inBasin = tmp.copy(B).setY(waterLevel(Math.max(w, .3)) - (greens ? .04 : rice ? .12 : lift * .1));
    if (s.phase === 'wait') {g.position.copy(from); g.rotation.set(0, turn0, 0);}
    else if (s.phase === 'in') {
      arc(g.position, from, inBasin, easeIn(t / .55), .55); g.rotation.y = turn0 + t * 2;
      if (t >= .55) {s.phase = 'rinse'; s.t0 = performance.now(); onTap(true); buzz(10); onHint(rice ? '哗——淘一淘，水都白了' : '哗——冲一冲');}
    } else if (s.phase === 'rinse') {
      g.position.copy(inBasin); g.position.y += Math.sin(state.clock.elapsedTime * 5) * .02; g.rotation.y += .02; g.rotation.z = Math.sin(state.clock.elapsedTime * 3) * (rice ? .03 : .08);
      if (t >= 2.4) {s.phase = 'out'; s.t0 = performance.now(); onTap(false); setWashed(true); buzz(12); onHint(rice ? '米淘好了，白白净净的' : `${name}洗干净了，亮晶晶的`);}
    } else if (s.phase === 'out') {
      const u = ease(span(t, .35, 1.25)); arc(g.position, inBasin, to, u, 1); g.rotation.set(0, turn0 + (turn1 - turn0) * u, 0);
      if (t >= 1.5 && !s.told) {s.told = true; s.phase = 'gone'; onDone();}
    }
    // The water: rising while the tap runs, a stream from the spout and rings where it lands.
    const r = basinRadiusAt(lv) - .01;
    water.current.visible = w > 0; water.current.position.y = lv; water.current.scale.set(r, r, 1);
    stream.current.visible = rings.current.visible = s.phase === 'rinse';
    stream.current.position.y = (TAP_SPOUT + lv) / 2; stream.current.scale.y = Math.max(.01, TAP_SPOUT - lv);
    rings.current.position.y = lv + .004; rings.current.children.forEach((m, i) => {const ph = (state.clock.elapsedTime * .9 + i / 3) % 1; m.scale.setScalar(.12 + ph * .6); m.material.opacity = .5 * (1 - ph);});
    if (s.phase !== 'gone') invalidate();
  });
  const waterMat = useMemo(() => new THREE.MeshStandardMaterial({color: rice ? '#eeefe8' : '#cfe6ec', transparent: true, opacity: rice ? .82 : .55, roughness: .05, metalness: .1, depthWrite: false}), []);
  const streamMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#e8f5f8', transparent: true, opacity: .7, roughness: .05, depthWrite: false}), []);
  const ringMats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: .4, depthWrite: false})), []);
  return <group>
    <group position={S.basin}>
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} material={waterMat} visible={false}><circleGeometry args={[1, 48]}/></mesh>
      <mesh ref={stream} material={streamMat} visible={false}><cylinderGeometry args={[.045, .055, 1, 12, 1, true]}/></mesh>
      <group ref={rings} visible={false}>{ringMats.map((m, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} material={m}><torusGeometry args={[1, .02, 4, 36]}/></mesh>)}</group>
    </group>
    <group ref={veg}>{rice ? <RiceBowl washed={washed}/> : <Raw id={id} washed={washed}/>}</group>
  </group>;
}

// ---- step: cut (or shell) ----
// The cleaver waits over it; each tap is one chop. A tomato loses a pair of wedges a chop, greens a length, a
// pumpkin a handful of cubes. Peas are shelled instead: each tap splits a pod and its peas come out. Done, what
// was cut is swept into its own little dish behind the block.
function BoardPieces({id, k, need, done, lost = 0}) {
  if (id === 'greens') return <group position={HEAP}><GreensPieces n={done ? (need + 1) * 5 : k * 5} spread={.32} seed={2}/></group>;
  if (id === 'pumpkin') return <group position={HEAP}><PumpkinCubes n={done ? (need + 1) * 4 : k * 4} spread={.3} seed={2}/></group>;
  if (id === 'pea') return <group position={HEAP}><Peas n={Math.max(0, k * 4 - lost)} spread={.24} seed={2}/></group>;
  if (id === 'taro') return <group position={HEAP}><TaroCubes n={done ? (need + 1) * 3 : k * 3} spread={.3} seed={2}/></group>;
  if (id === 'bamboo') return <group position={HEAP}><BambooSlices n={done ? (need + 1) * 4 : k * 4} spread={.3} seed={2}/></group>;
  if (id === 'wheat') return <group position={HEAP}><Noodles n={done ? need * 3 : k * 3} spread={.34} seed={2}/></group>;
  const n = done ? 8 : Math.min(8, k * 2);
  return <group>{WEDGE_SPOTS.slice(0, n).map((w, i) => <group key={i} position={w.at} rotation={[0, w.turn, 0]}><group rotation={[-Math.PI / 2, 0, 0]}><TomatoWedge/></group></group>)}</group>;
}
// A pod that opens once its turn has come (k: how many have been opened so far).
function OpeningPod({index, k}) {
  const started = useRef(null), invalidate = useThree(s => s.invalidate), [open, setOpen] = useState(0);
  useFrame(() => {
    if (k > index && started.current === null) started.current = performance.now();
    if (started.current === null) return;
    const o = Math.min(1, (performance.now() - started.current) / 300);
    if (Math.abs(o - open) > .05 || (o === 1 && open !== 1)) setOpen(o);
    if (o < 1) invalidate();
  });
  return <PeaPod open={open} washed/>;
}
function CutStep({id, look, dish, taps, had = [], onHint, onPhase, onMishap, onDone}) {
  const invalidate = useThree(s => s.invalidate), info = INGREDIENTS[id], shell = info.prep === 'shell', need = shell ? info.pods : info.cuts;
  const knife = useRef(), whole = useRef(), pieces = useRef(), pods = useRef();
  const st = useRef({phase: 'ready', t0: performance.now(), k: 0}), seen = useRef(taps), [k, setK] = useState(0), [gone, setGone] = useState(false);
  // Now and then (src/cooking-mishaps.js): one chop of a tomato makes it squirt, or a pea springs out of a pod.
  const juiceAt = useMemo(() => id === 'tomato' && mayHappen('juice', had) ? whichTap(need) : 0, []);
  const peaAt = useMemo(() => id === 'pea' && mayHappen('pea', had) ? whichPod(need) + 1 : 0, []);
  const [squirt, setSquirt] = useState(null), [runaway, setRunaway] = useState(null);
  const peaFrom = useMemo(() => {const [x, z] = POD_SPOTS[Math.max(0, peaAt - 1)] || [0, 0]; return [ON_BLOCK.pea[0] + x, BLOCK_H, ON_BLOCK.pea[2] + z];}, []);
  const say = (left, lead = '') => onHint(lead + (shell ? (left > 1 ? `点一下，剥一个豆荚（还有 ${left} 个）` : '点一下，剥最后一个') : left > 1 ? `点一下，切一刀（还有 ${left} 刀）` : '点一下，最后一刀'));
  useEffect(() => {say(need);}, []);
  useEffect(() => {
    if (taps === seen.current) return; seen.current = taps;
    const s = st.current; if (s.phase === 'ready') {s.phase = 'chop'; s.t0 = performance.now(); s.hit = false; invalidate();} else if (s.phase === 'chop') s.queued = true;
  }, [taps]);
  const center = PILE[id], into = useMemo(() => v3(PREP[dish]).add(new THREE.Vector3(0, .05, 0)), [dish]), from = useMemo(() => v3(center), [center]);
  // Where the blade comes down for the next cut, and how high it waits.
  const lineAt = n => id === 'greens' ? ON_BLOCK.greens[2] + 1.05 - n * .38 : ON_BLOCK[id][2] - .18 + n * .12;
  const rest = id === 'greens' ? BLOCK_H + .5 : BLOCK_H + .9;
  useFrame(state => {
    const s = st.current, t = (performance.now() - s.t0) / 1000, g = knife.current;
    if (g) {
      const x = id === 'greens' ? S.block[0] + .15 : ON_BLOCK[id][0] - .05, z = lineAt(s.k);
      if (s.phase === 'ready') g.position.set(x, rest + Math.sin(state.clock.elapsedTime * 2.4) * .02, z);
      else if (s.phase === 'chop') {const down = t < .09 ? easeIn(t / .09) : 1 - easeOut((t - .09) / .25); g.position.set(x, BLOCK_H + .004 + (rest - BLOCK_H) * (1 - down), z);}
      else g.position.set(x + .9, rest + .2 * easeOut(Math.min(1, t / .5)), z);
    }
    if (s.phase === 'chop') {
      // A pod opens over a third of a second; a chop is quicker.
      const hitAt = shell ? .18 : .09, end = shell ? .45 : .34;
      if (t >= hitAt && !s.hit) {
        s.hit = true; s.k++; setK(s.k); buzz(14); play('wood', {volume: shell ? .3 : .6});
        if (s.k === juiceAt) {setSquirt(performance.now()); onMishap?.('juice'); s.lead = MISHAPS.juice.say + '。'; buzz([14, 40, 24]); play('squirt', {volume: .7});}
        if (s.k === peaAt) {setRunaway(performance.now()); onMishap?.('pea'); s.lead = MISHAPS.pea.say + '。'; play('tap', {volume: .45});}
      }
      if (t >= end) {
        const lead = s.lead || ''; s.lead = '';
        if (s.k >= need) {s.phase = 'done'; s.t0 = performance.now(); onHint(lead + (shell ? '剥好啦' : '切好啦'));}
        else {say(need - s.k, lead); if (s.queued) {s.queued = false; s.phase = 'chop'; s.t0 = performance.now(); s.hit = false;} else s.phase = 'ready';}
      }
    } else if (s.phase === 'done' && t >= .7) {s.phase = 'sweep'; s.t0 = performance.now(); onPhase('prep');}
    else if (s.phase === 'sweep') {
      // Into its dish: up, over and down, a little smaller to fit; the empty pods go.
      const u = ease(Math.min(1, t / .9));
      if (pieces.current) {arc(pieces.current.position, from, into, u, .5); pieces.current.scale.setScalar(1 - .45 * u);}
      if (pods.current) pods.current.visible = u < .2;
      if (t >= 1.2 && !s.told) {s.told = true; setGone(true); onDone({cuts: s.k});}
    }
    // What is left of the whole one shrinks as the pieces come off it.
    if (whole.current) {
      const left = Math.max(0, 1 - s.k / need);
      if (id === 'greens') {whole.current.scale.set(1, 1, Math.max(.001, left * (need / (need + 1)) + (left > 0 ? 1 / (need + 1) : 0))); whole.current.visible = s.k < need;}
      else {const r = Math.cbrt(left); whole.current.scale.setScalar(Math.max(.001, r)); whole.current.position.y = BLOCK_H + LIFT[id] * r; whole.current.visible = left > 0;}
    }
    if (!s.told) invalidate();
  });
  if (gone) return null;
  return <group>
    {shell ? <group ref={pods} position={ON_BLOCK[id]}>{POD_SPOTS.map(([x, z, turn], i) => <group key={i} position={[x, 0, z]} rotation={[0, turn, 0]}><OpeningPod index={i} k={k}/></group>)}</group>
      : <group ref={whole} position={ON_BLOCK[id]}>{id === 'wheat' ? <DoughSheet/> : <Raw id={id} washed/>}</group>}
    {/* The pieces, held about where they lie so the whole pile can be swept up as one. */}
    <group ref={pieces} position={center}><group position={center.map(v => -v)}><BoardPieces id={id} k={k} need={need} done={!shell && k >= need} lost={peaAt && k >= peaAt ? 1 : 0}/></group></group>
    {!shell && <group ref={knife} rotation={[0, id === 'greens' ? .25 : .15, 0]}><Cleaver look={look}/></group>}
    {squirt && <JuiceSquirt from={ON_BLOCK.tomato} start={squirt}/>}
    {runaway && <RunawayPea from={peaFrom} start={runaway}/>}
  </group>;
}

// ---- step: light the fire ----
// Tap and the knob turns; the ring catches with a soft whump.
function FireStep({taps, onHint, onLight, onDone}) {
  const seen = useRef(taps), timer = useRef(null);
  useEffect(() => {onHint('点一下，拧开旋钮点火'); return () => clearTimeout(timer.current);}, []);
  useEffect(() => {
    if (taps === seen.current || timer.current) return; seen.current = taps;
    onLight(); play('turn'); buzz(16); onHint('火点着了');
    timer.current = setTimeout(onDone, 1100);
  }, [taps]);
  return null;
}

// ---- step: the wok ----
// Oil first; then whatever is ready goes in when it's asked for (the card's buttons), the cut things flying over
// from their dishes and the beaten egg poured from its bowl. A tap on the wok tosses it. Once the last thing is in,
// time on the fire counts: from then on it browns, and if left long enough it catches, with smoke. 起锅 takes it
// off the fire.
// Held high enough to the left of the wok that, tipped, the bowl's lip is over the middle of the wok and clear of its rim.
const POUR_AT = [S.wok[0] - 1.0, 1.7, S.wok[2] + .1];
function Smoke({level}) {
  const g = useRef(), mats = useMemo(() => Array.from({length: 5}, () => new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, roughness: 1})), []);
  const grey = useMemo(() => new THREE.Color('#8d8682'), []), white = useMemo(() => new THREE.Color('#ffffff'), []);
  useFrame(state => {
    if (!g.current) return;
    g.current.children.forEach((m, i) => {const ph = (state.clock.elapsedTime * .5 + i / 5) % 1; m.position.set(Math.sin(ph * 4 + i) * .25, .3 + ph * 1.2, Math.cos(i * 2) * .2); m.scale.setScalar(.6 + ph * 1.4); mats[i].color.copy(white).lerp(grey, Math.max(0, level - 1)); mats[i].opacity = .45 * (1 - ph) * Math.min(1, level);});
  });
  return <group ref={g} visible={level > 0}>{mats.map((m, i) => <mesh key={i} material={m}><sphereGeometry args={[.12, 12, 8]}/></mesh>)}</group>;
}
function CookStep({items, prep, look, taps, asks, had = [], onHint, onAdded, onMishap, onDone}) {
  const invalidate = useThree(s => s.invalidate);
  const wok = useRef(), food = useRef(), bowl = useRef(), bowlFill = useRef(), fly = useRef({});
  const st = useRef({anim: null, lastIn: null, queue: [], had: [...had], hot: 0}), seenTaps = useRef(taps), seenAsks = useRef(asks.length);
  const [have, setHave] = useState({}), [seed, setSeed] = useState(1), [heat, setHeat] = useState('tender'), [smoke, setSmoke] = useState(0), [, setTick] = useState(0);
  const wokAt = useMemo(() => v3([S.wok[0], WOK_Y, S.wok[2]]), []);
  // Now and then (src/cooking-mishaps.js): the first washed thing into the oil makes it spit, and one toss of the
  // wok once something is cooking in it (the second, third or fourth) catches fire for a moment.
  const flameOn = useMemo(() => mayHappen('flame', had) ? whichTap(4) : 0, []);
  const [spit, setSpit] = useState(null), [flare, setFlare] = useState(null);
  const toss = (s, now) => {
    s.anim = {kind: 'toss', t0: now}; buzz(8);
    if (s.lastIn) s.hot++;
    if (flameOn && s.hot === flameOn && !s.had.includes('flame') && s.had.length < MISHAPS_MAX) {
      s.had.push('flame'); setFlare(now); onMishap?.('flame'); onHint(MISHAPS.flame.say); buzz([20, 30, 40]); play('flare', {volume: .8});
    }
  };
  useEffect(() => {onHint('先点「倒油」，倒一点油');}, []);
  // What the card asks for (oil, a thing to go in, spring onion or garlic, off the fire) is done one after another.
  useEffect(() => {
    const s = st.current;
    for (const a of asks.slice(seenAsks.current)) s.queue.push(a);
    seenAsks.current = asks.length; invalidate();
  }, [asks.length]);
  // A tap on the wok tosses it, once there's oil in it; a tap while it's in the air counts for the next toss.
  useEffect(() => {
    if (taps === seenTaps.current) return; seenTaps.current = taps;
    const s = st.current; if (!s.oiled) return;
    if (s.anim) {if (s.anim.kind === 'toss') s.pendingToss = Math.min(2, (s.pendingToss || 0) + 1); return;}
    toss(s, performance.now()); invalidate();
  }, [taps]);
  const start = (s, what) => {
    const now = performance.now();
    if (what === 'ready') {s.anim = {kind: 'off', t0: now}; s.heat = s.lastIn ? heatAfter((now - s.lastIn) / 1000) : 'tender'; buzz(18); onHint(HEAT_WORDS[s.heat]); return;}
    s.anim = {kind: what, t0: now};
  };
  useFrame(() => {
    const s = st.current, now = performance.now();
    if (!s.anim && s.queue.length) start(s, s.queue.shift());
    if (!s.anim && s.pendingToss > 0) {s.pendingToss--; toss(s, now);}
    const a = s.anim;
    // How long it has been on the fire since the last thing went in, and what that is doing to it.
    if (s.lastIn) {
      const sec = (now - s.lastIn) / 1000, h = heatAfter(sec);
      if (h !== s.shown && (!a || a.kind !== 'off')) {s.shown = h; setHeat(h);}
      const sm = sec < BROWNING - 1 ? 0 : sec < CATCHING ? .6 : 1.6;
      if (sm !== s.smoke) {s.smoke = sm; setSmoke(sm);}
      if (sec > BROWNING && !s.warned) {s.warned = true; onHint('有点焦香了，好了就点「起锅」');}
      if (sec > CATCHING && !s.warned2) {s.warned2 = true; onHint('好像闻到糊味了……快起锅');}
    }
    const w = wok.current, f = food.current;
    w.position.copy(wokAt); w.rotation.set(0, 0, 0); f.position.set(0, WOK_FLOOR, 0); f.rotation.set(0, f.rotation.y, 0);
    if (a) {
      const t = (now - a.t0) / 1000;
      if (a.kind === 'toss') {
        const u = Math.min(1, t / .42), up = Math.sin(u * Math.PI);
        w.position.y += up * .14; w.rotation.z = up * .1; w.position.x += up * .06;
        f.position.y += Math.sin(Math.min(1, t / .38) * Math.PI) * .42; f.rotation.y += .12; f.rotation.x = up * .5;
        if (t >= .2 && !a.flipped) {a.flipped = true; setSeed(n => n + 1);}
        if (t >= .42) s.anim = null;
      } else if (a.kind === 'egg') {
        // The bowl comes over, tips, pours and goes back.
        const go = ease(span(t, 0, .5)), tip = ease(span(t, .45, .8)) * (1 - ease(span(t, 1.25, 1.55))), back = ease(span(t, 1.4, 1.9));
        const b = bowl.current;
        if (b) {b.position.copy(v3(S.bowl)).lerp(v3(POUR_AT), go * (1 - back)); b.position.y += Math.sin(go * Math.PI) * .3 * (1 - back); b.rotation.z = -1.15 * tip;}
        if (bowlFill.current) {bowlFill.current.visible = t < 1.1; bowlFill.current.scale.setScalar(Math.max(.001, 1 - span(t, .7, 1.1)));}
        if (t >= .75 && !a.added) {a.added = true; s.eggAt = now; s.lastIn = now; setHave(h => ({...h, egg: now})); onAdded('egg');}
        if (t >= 1.9) s.anim = null;
      } else if (INGREDIENTS[a.kind]) {
        // Over, not through, the rim: across quickly, up high, and down into the wok from above.
        const p = fly.current[a.kind], from = PREP[prep[a.kind]], k = Math.min(1, Math.max(0, t / .7));
        if (p) {const x = easeOut(k); p.position.set((wokAt.x - from[0]) * x, .05 + (PAN - .05) * k + Math.sin(k * Math.PI) * 1.5, (wokAt.z - from[2]) * x); p.visible = k < 1;}
        if (t >= .25 && !a.landed) {
          a.landed = true; buzz(10);
          if (isVeg(a.kind) && !s.spitRolled) {
            s.spitRolled = true;
            if (mayHappen('splatter', s.had)) {s.had.push('splatter'); a.spat = true; setSpit(now); onMishap?.('splatter'); buzz([10, 30, 18]); play('sizzle', {volume: .7});}
          }
        }
        if (t >= .72 && !a.added) {a.added = true; s.lastIn = now; setHave(h => ({...h, [a.kind]: now})); onAdded(a.kind, a.spat ? 'splatter' : null);}
        if (t >= .9) s.anim = null;
      } else if (a.kind === 'off') {
        if (t >= .5 && !a.told) {a.told = true; onDone({heat: s.heat});}
      } else {
        // Oil, spring onion, garlic: in it goes.
        if (t >= .15 && !a.added) {a.added = true; if (a.kind === 'oil') s.oiled = true; setHave(h => ({...h, [a.kind]: now})); onAdded(a.kind); buzz(6);}
        if (t >= .5) s.anim = null;
      }
    }
    // The egg sets over a second and a half: draw it again as it does.
    if (s.eggAt) {const q = Math.floor((now - s.eggAt) / 250); if (q !== s.eggTick && q <= 6) {s.eggTick = q; setTick(q);}}
    invalidate();
  });
  // How cooked each thing is: eggs set over a second and a half, the rest softens as the wok is tossed.
  const eggSet = have.egg ? Math.min(1, (performance.now() - have.egg) / 1400 + (seed - 1) * .25) : 0;
  const mains = items.filter(id => have[id]), share = mains.length > 1 ? .62 : 1;
  return <group>
    {/* Each cut thing waits in its dish until it is called for; then it flies into the wok. */}
    {items.filter(isVeg).map(id => !have[id] && <group key={id} position={PREP[prep[id]]}><group ref={el => {fly.current[id] = el;}} position={[0, .05, 0]}><Prepped id={id} seed={FOOD_SEEDS[id]}/></group></group>)}
    {/* The bowl of beaten egg, if there are eggs. */}
    {items.includes('egg') && <group ref={bowl} position={S.bowl}><group scale={BOWL_SCALE}><Bowl/><mesh ref={bowlFill} position={[0, BEATEN_LEVEL, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={bowlRadiusAt(BEATEN_LEVEL) - .012} visible={!have.egg}><circleGeometry args={[1, 40]}/><meshStandardMaterial color={BEATEN} roughness={.32}/></mesh></group></group>}
    <group ref={wok} position={wokAt}>
      <Wok look={look}/>
      <group ref={food} position={[0, WOK_FLOOR, 0]}>
        {have.oil && <Gloss r={.45} color="#f1cf74" opacity={.7}/>}
        {have.tomato && <Gloss r={.62} color="#e7764f"/>}
        {have.egg && eggSet < 1 && <group scale={[1 - eggSet * .5, 1, 1 - eggSet * .5]}><Gloss r={.55} color="#f7d35e"/></group>}
        {mains.map(id => <Cooked key={id} id={id} heat={heat} n={Math.max(3, Math.round(PIECES[id] * share))} spread={.5} seed={FOOD_SEEDS[id] + seed} set={id === 'egg' ? eggSet : 1} soft={id === 'egg' ? 1 : Math.min(1, .2 + .2 * (seed - 1))}/>)}
        {have.garlic && <Garlic n={7} spread={.35} seed={seed}/>}
        {have.scallion && <Scallion/>}
        <ExtraBits extras={['honey', 'walnut', 'pinenut'].filter(e => have[e])} spread={.4}/>
      </group>
      <group position={[.62, .34, .32]} rotation={[-.7, .5, -.35]}><Turner look={look}/></group>
      <Smoke level={smoke}/>
      {spit && <OilSpit start={spit}/>}
      {flare && <WokFlame start={flare}/>}
    </group>
  </group>;
}

// ---- step: plate ----
// The fire goes off. The wok is lifted straight up off the burner, carried across well above the pot's lid and
// tipped over the plate: what's in it slides down the inside towards the lip, gathering into a heap as it goes,
// over the lip and down onto the plate, where it spreads out the way it will sit there. Then the wok is righted
// and carried back the way it came.
const TIP = 1.1, WOK_HOME = v3([S.wok[0], WOK_Y, S.wok[2]]), POUR = v3([S.plate[0] - 1.4, 1.36, S.plate[2]]);
// Up off the burner first, across above the pot's lid, and down onto where it pours from.
const CARRY = [WOK_HOME, WOK_HOME.clone().add(v3([.1, .95, .1])), POUR.clone().add(v3([-.7, .3, 0])), POUR];
function bezier(out, [a, b, c, d], u) {
  const k = 1 - u;
  return out.set(0, 0, 0).addScaledVector(a, k * k * k).addScaledVector(b, 3 * k * k * u).addScaledVector(c, 3 * k * u * u).addScaledVector(d, u * u * u);
}
// The food: in the wok, a little up off the floor and a little smaller than on the plate, so it keeps clear of the
// sides; slid down towards the lip, gathered into a heap; on the plate, the way it sits there (DishModel).
const IN_WOK = [.8, .8, .8], GATHERED = [.42, .92, .56], SLIDE_TO = .9, OVER_LEAN = -.08, PLATED = v3([S.plate[0], .065, S.plate[2]]);
// How far out from its middle what is on a plate reaches: its sauce (DishFood).
const REACH = .67;
const Z_AXIS = new THREE.Vector3(0, 0, 1), mix = (a, b, k) => a + (b - a) * k;
const insideSlope = c => {const a = Math.max(0, c - .08), b = c + .08; return (wokInsideAt(b) - wokInsideAt(a)) / (b - a);};
// Where the food sits in the wok, in the wok's own frame, once it has slid s of the way towards the lip: on the
// inside and a little off it, leaning with it.
function inTheWok(m, s, at, turn, size) {
  const c = SLIDE_TO * s, a = Math.atan(insideSlope(c)), lift = .03 + .03 * s;
  at.set(c - Math.sin(a) * lift, wokInsideAt(c) + Math.cos(a) * lift, 0);
  size.set(mix(IN_WOK[0], GATHERED[0], s), mix(IN_WOK[1], GATHERED[1], s), mix(IN_WOK[2], GATHERED[2], s));
  return m.compose(at, turn.setFromAxisAngle(Z_AXIS, a), size);
}
// Where it leaves the wok held tipped over the plate, and where it is once it is over the lip: clear of it by a
// little, all of the heap past it.
function overTheLip() {
  const tipped = new THREE.Matrix4().compose(POUR, new THREE.Quaternion().setFromAxisAngle(Z_AXIS, -TIP), new THREE.Vector3(1, 1, 1));
  const from = new THREE.Vector3(), turn = new THREE.Quaternion(), size = new THREE.Vector3();
  new THREE.Matrix4().multiplyMatrices(tipped, inTheWok(new THREE.Matrix4(), 1, new THREE.Vector3(), new THREE.Quaternion(), new THREE.Vector3())).decompose(from, turn, size);
  const lip = new THREE.Vector3(WOK_LIP[0], WOK_LIP[1], 0).applyMatrix4(tipped);
  return {from, lean: new THREE.Euler().setFromQuaternion(turn).z, over: new THREE.Vector3(lip.x + REACH * GATHERED[0] + .06, lip.y + WOK_LIP_R + .03, POUR.z)};
}
function PlateStep({made, look, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate), wok = useRef(), food = useRef(), t0 = useRef(performance.now()), told = useRef(false), landed = useRef(false);
  const lip = useMemo(overTheLip, []), tmp = useMemo(() => ({m: new THREE.Matrix4(), local: new THREE.Matrix4(), at: new THREE.Vector3(), turn: new THREE.Quaternion(), size: new THREE.Vector3()}), []);
  useEffect(() => {onHint('装盘');}, []);
  useFrame(() => {
    const t = (performance.now() - t0.current) / 1000, w = wok.current, f = food.current;
    // The wok: over to the plate, tipped, righted, and back.
    const go = ease(span(t, 0, .8)), back = ease(span(t, 1.95, 2.6)), tip = ease(span(t, .72, 1.15)) * (1 - ease(span(t, 1.65, 2.0)));
    bezier(w.position, CARRY, back > 0 ? 1 - back : go); w.rotation.set(0, 0, -TIP * tip); w.updateMatrixWorld();
    // The food: riding in it, sliding down towards the lip as it tips; over the lip with a little hop; down onto the
    // plate, righting itself and spreading out as it lands.
    const s = ease(span(t, .8, 1.15)), u = span(t, 1.15, 1.75);
    if (u <= 0) {tmp.m.multiplyMatrices(w.matrixWorld, inTheWok(tmp.local, s, tmp.at, tmp.turn, tmp.size)); tmp.m.decompose(f.position, f.quaternion, f.scale);}
    else if (u < .4) {
      const v = u / .4, k = ease(v);
      f.position.lerpVectors(lip.from, lip.over, k); f.position.y += Math.sin(v * Math.PI) * .04;
      f.rotation.set(0, 0, mix(lip.lean, OVER_LEAN, k)); f.scale.set(...GATHERED);
    } else {
      const v = Math.min(1, (u - .4) / .6), k = ease(span(v, .3, 1));
      f.position.set(mix(lip.over.x, PLATED.x, easeOut(v)), mix(lip.over.y, PLATED.y, easeIn(v)), mix(lip.over.z, PLATED.z, v));
      f.rotation.set(0, 0, OVER_LEAN * (1 - ease(v))); f.scale.set(mix(GATHERED[0], 1, k), mix(GATHERED[1], 1, k), mix(GATHERED[2], 1, k));
    }
    if (u >= 1 && !landed.current) {landed.current = true; buzz(12);}
    if (t >= 2.65 && !told.current) {told.current = true; play('found', {volume: .5}); onDone();}
    if (t < 2.75) invalidate();
  });
  return <group>
    <group ref={wok} name="plate-wok" position={WOK_HOME}><Wok look={look}/></group>
    <group ref={food} name="plate-food"><DishFood items={made.items} extras={made.extras} heat={made.heat}/></group>
  </group>;
}

// ---- what stands on the counter, as far as the cooking has got ----
function Counter({look, items, prep, step, stepIndex, steps, tapOn, lit, made, method = 'wok'}) {
  const kind = step.split(':')[0], pot = method === 'pot', cooking = kind === 'cook' || kind === 'plate', egg = items.includes('egg');
  const doneWith = id => {const i = steps.findIndex(([s]) => s === id); return i >= 0 && i < stepIndex;};
  const inWok = id => made.items.includes(id);
  // At the wok or the pot, the step itself draws what is waiting to go in.
  const busy = kind === 'cook' || kind === 'boil';
  // The pot's lid comes off when the water goes in.
  const waterAt = steps.findIndex(([s]) => s === 'water'), opened = pot && waterAt >= 0 && stepIndex >= waterAt;
  return <group>
    <Worktop look={look}/>
    <group position={S.basin}><WashBasin look={look}/></group>
    <group position={S.tap}><Tap look={look} on={tapOn}/></group>
    <group position={S.block}><ChoppingBlock look={look}/></group>
    {/* Where a tomato squirted, the splashes stay on the block. */}
    {made.mishaps?.includes('juice') && step !== 'cut:tomato' && <JuiceSpots from={ON_BLOCK.tomato}/>}
    {/* The cleaver at rest across the back of the block, its handle out over the right edge. */}
    {kind !== 'cut' && <group position={[S.block[0], BLOCK_H + .012, S.block[2] - .6]}><group rotation={[-Math.PI / 2, 0, 0]}><Cleaver look={look}/></group></group>}
    {/* A dish behind the block for each thing to cut, and in it, once it's cut and until it goes in the wok, the pieces. */}
    {items.filter(isVeg).map(id => <group key={id} position={PREP[prep[id]]}>
      <PrepDish/>
      {(doneWith(`cut:${id}`) || doneWith(`shell:${id}`) || doneWith(`rinse:${id}`)) && !busy && !inWok(id) && <group position={[0, .05, 0]}><Prepped id={id} seed={FOOD_SEEDS[id]}/></group>}
    </group>)}
    {/* Rinsed rice waits in its own bowl in the next place along, and the bowl stays once the rice is in the pot. */}
    {items.includes('rice') && doneWith('rinse:rice') && !busy && <group position={PREP[prep.rice]}><RiceBowl washed empty={inWok('rice')}/></group>}
    {/* The eggs' bowl: empty, then beaten egg waiting, then empty once it has gone into the wok. */}
    {/* For tea eggs the eggs wait whole in the bowl. */}
    {egg && teaEggs(items, method) && !busy && !inWok('egg') && <group position={S.bowl}>{[-.13, .13].map((x, i) => <group key={x} position={[x, .22, 0]} rotation={[0, i ? .3 : -.2, Math.PI / 2]} scale={1.2}><Egg brown={i === 1}/></group>)}</group>}
    {egg && kind !== 'egg' && kind !== 'whisk' && !busy && <group position={S.bowl} scale={BOWL_SCALE}><Bowl/>
      {doneWith('whisk') && !inWok('egg') && <mesh position={[0, BEATEN_LEVEL, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={bowlRadiusAt(BEATEN_LEVEL) - .012}><circleGeometry args={[1, 40]}/><meshStandardMaterial color={BEATEN} roughness={.32}/></mesh>}
    </group>}
    <group position={S.shelf}><OilAndSalt look={look}/></group>
    <Hob look={look} lit={pot ? [0, lit] : [lit, 0]}/>
    {S.knobs.map(([x, z], i) => <group key={i} position={[x, .07, z]}><Knob look={look} turned={i === (pot ? 1 : 0) ? lit : 0}/></group>)}
    {!cooking && <group position={[S.wok[0], WOK_Y, S.wok[2]]}><Wok look={look}/></group>}
    <group position={POT_AT} scale={POT_SCALE}><Pot look={look} lid={!opened}/>{pot && made.mishaps?.includes('boilover') && kind !== 'boil' && <FoamStain/>}</group>
    {kind === 'done' ? <group position={S.plate}><ServedDish item={made} look={look}/></group> : <group position={S.plate}>{pot ? <SoupBowl look={look}/> : <Plate look={look}/>}</group>}
  </group>;
}

// ---- the steps, in the stage and the card ----
// items: what was put on the counter, in the order it was put there. The dish keeps what went into the wok in the
// order it went in (so tomato then greens is 番茄炒青菜).
// method: 'wok' (stir-fried on the left ring) or 'pot' (simmered in the little pot on the right, src/cooking-pot-steps.jsx).
// extrasOk: what can be thrown in from the stock (spring onion and garlic always; honey and nuts once brought home).
export function CookingSteps({items, method = 'wok', look = 'cream', extrasOk = ['scallion', 'garlic'], onDone, onQuit}) {
  const pot = method === 'pot';
  const steps = useMemo(() => stepsFor(items, method), []), prep = useMemo(() => Object.fromEntries(items.filter(id => isVeg(id) || id === 'rice').map((id, i) => [id, i])), []);
  const [index, setIndex] = useState(0), [hint, setHint] = useState(''), [taps, setTaps] = useState(0), [phase, setPhase] = useState(null);
  const [made, setMade] = useState({items: [], extras: [], heat: 'just', cuts: {}, yolks: 0, mishaps: [], method}), [tapOn, setTapOn] = useState(false), [lit, setLit] = useState(0);
  // What went its own way so far, in the order it happened (src/cooking-mishaps.js).
  const happened = what => setMade(m => m.mishaps.includes(what) ? m : {...m, mishaps: [...m.mishaps, what]});
  const kept = () => mishapsFor(made.mishaps, made.items, method);
  // At the wok: what the card has asked for so far, and what has gone in.
  const [asks, setAsks] = useState([]), [added, setAdded] = useState([]);
  const finished = index >= steps.length, step = finished ? 'done' : steps[index][0], kind = step.split(':')[0], id = step.split(':')[1];
  const next = patch => {setMade(m => ({...m, ...(typeof patch === 'function' ? patch(m) : patch)})); setPhase(null); setIndex(i => i + 1);};
  useEffect(() => {if (finished) setHint(`做好啦！${[heatWords(made), ...mishapWords(kept())].join('，')}。`);}, [finished]);
  const tap = () => setTaps(n => n + 1);
  const ask = what => setAsks(a => a.includes(what) ? a : [...a, what]);
  const asked = what => asks.includes(what);
  const oiled = added.includes('oil'), boiled = added.includes('boil'), anything = items.some(i => asks.includes(i));
  const onAdded = (what, mishap) => {
    setAdded(a => [...a, what]);
    // The pot says for itself what to do next.
    if (pot) return;
    if (what === 'oil') setHint('点下面的菜下锅，想先下哪样就先下哪样');
    else if (INGREDIENTS[what]) setHint((mishap ? MISHAPS[mishap].say + '。' : '') + '点锅翻一翻；都下好了，觉得行了就点「起锅」');
  };
  return <div className="atelier-top dessert-cooking cooking-steps">
    <div className="atelier-stage bench-stage dessert-stage dessert-cook-stage cooking-stage" tabIndex={0} aria-label={hint} onPointerDown={e => {if (e.button > 0) return; tap();}} onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); tap();}}}>
      <div className="atelier-wall"/>
      <QuietCanvas orthographic shadows camera={{position: [0, 9, 18], zoom: 100, near: .1, far: 200}} dpr={[1, 1.5]}>
        <StepCamera step={step + (phase || '')} shot={shotOf(step, phase, method)}/>
        <ambientLight intensity={1.05}/><hemisphereLight args={['#fff8e9', '#c3ac9b', .85]}/>
        <directionalLight position={[-5, 10, 7]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-.0004} shadow-normalBias={.02} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={7} shadow-camera-bottom={-7}/>
        <Counter look={look} items={items} prep={prep} step={step} stepIndex={index} steps={steps} tapOn={tapOn} lit={lit} made={made} method={method}/>
        {kind === 'wash' && <WashStep key={step} id={id} taps={taps} onHint={setHint} onTap={setTapOn} onDone={() => next({})}/>}
        {kind === 'rinse' && <WashStep key={step} id={id} to={PREP[prep[id]]} taps={taps} onHint={setHint} onTap={setTapOn} onDone={() => next({})}/>}
        {kind === 'knead' && <KneadStep key={step} taps={taps} onHint={setHint} onDone={() => next({})}/>}
        {kind === 'roll' && <RollStep key={step} taps={taps} look={look} onHint={setHint} onDone={() => next({})}/>}
        {kind === 'water' && <WaterStep key={step} taps={taps} onHint={setHint} onDone={() => next({})}/>}
        {kind === 'boil' && <BoilStep key={step} items={items} prepAt={i => PREP[prep[i]]} look={look} taps={taps} asks={asks} had={made.mishaps} onHint={setHint} onAdded={onAdded} onMishap={happened}
          onDone={r => {setLit(0); next({heat: r.heat, items: asks.filter(i => items.includes(i)), extras: Object.keys(EXTRAS).filter(e => asks.includes(e))});}}/>}
        {kind === 'serve' && <ServeStep key={step} made={made} look={look} onHint={setHint} onDone={() => next({})}/>}
        {(kind === 'cut' || kind === 'shell') && <CutStep key={step} id={id} dish={prep[id]} look={look} taps={taps} had={made.mishaps} onHint={setHint} onPhase={setPhase} onMishap={happened} onDone={r => next(m => kind === 'cut' ? {cuts: {...m.cuts, [id]: r.cuts}} : {})}/>}
        {kind === 'egg' && <group position={S.bowl} scale={BOWL_SCALE}><EggStep d={EGG_D} taps={taps} onHint={setHint} onDone={r => next({yolks: r.yolks})}/></group>}
        {kind === 'whisk' && <group position={S.bowl} scale={BOWL_SCALE}><WhiskStep d={EGG_D} yolks={made.yolks} onHint={setHint} onDone={() => next({})}/></group>}
        {kind === 'fire' && <FireStep taps={taps} onHint={setHint} onLight={() => setLit(1)} onDone={() => next({})}/>}
        {kind === 'cook' && <CookStep items={items} prep={prep} look={look} taps={taps} asks={asks} had={made.mishaps} onHint={setHint} onAdded={onAdded} onMishap={happened}
          onDone={r => {setLit(0); next({heat: r.heat, items: asks.filter(i => items.includes(i)), extras: Object.keys(EXTRAS).filter(e => asks.includes(e))});}}/>}
        {kind === 'plate' && <PlateStep made={made} look={look} onHint={setHint} onDone={() => next({})}/>}
      </QuietCanvas>
    </div>
    <aside className="atelier-card dessert-card dessert-step-card">
      <ol className="dessert-step-dots" aria-label={`第 ${Math.min(index + 1, steps.length)} 步，共 ${steps.length} 步`}>{steps.map(([sid, label], i) => <li key={sid} title={label} className={finished || i < index ? 'done' : i === index ? 'now' : ''}/>)}</ol>
      <b className="dessert-step-name">{finished ? '做好啦' : steps[index][1]}</b>
      <p role="status" className="dessert-step-hint">{hint}</p>
      {kind === 'cook' && <div className="cooking-asks">
        {!asked('oil') ? <button className="cooking-oil" onClick={() => ask('oil')}>倒油</button> : <>
          {items.map(i => <button key={i} disabled={!oiled || asked(i)} onClick={() => ask(i)}>{asked(i) ? `${INGREDIENTS[i].name}下锅了` : i === 'egg' ? '倒蛋液' : `下${INGREDIENTS[i].name}`}</button>)}
          {Object.entries(EXTRAS).filter(([e]) => extrasOk.includes(e)).map(([e, label]) => <button key={e} className="cooking-extra" disabled={!oiled || asked(e)} onClick={() => ask(e)}>{asked(e) ? `${label}${extraVerb(e) === '淋' ? '淋好了' : '下了'}` : `${extraVerb(e)}${label}`}</button>)}
          <button className="cooking-ready" disabled={!anything || asked('ready')} onClick={() => ask('ready')}>起锅</button>
        </>}
      </div>}
      {kind === 'boil' && <div className="cooking-asks">
        {items.map(i => <button key={i} disabled={!boiled || asked(i)} onClick={() => ask(i)}>{asked(i) ? (i === 'egg' && !teaEggs(items, method) ? '蛋液淋好了' : `${INGREDIENTS[i].name}下锅了`) : i === 'egg' ? (teaEggs(items, method) ? '下鸡蛋' : '淋蛋液') : `下${INGREDIENTS[i].name}`}</button>)}
        {Object.entries(EXTRAS).filter(([e]) => e !== 'garlic' && extrasOk.includes(e)).map(([e, label]) => <button key={e} className="cooking-extra" disabled={!boiled || asked(e)} onClick={() => ask(e)}>{asked(e) ? `${label}${extraVerb(e) === '淋' ? '淋好了' : '下了'}` : `${extraVerb(e)}${label}`}</button>)}
        <button className="cooking-ready" disabled={!anything || asked('ready')} onClick={() => ask('ready')}>盛出来</button>
      </div>}
      {finished ? <button className="atelier-save" onClick={() => onDone({items: made.items, extras: made.extras, heat: made.heat, cuts: made.cuts, mishaps: kept(), method})}>好了，起个名字</button> : <div className="dessert-step-actions">
        <button className="dessert-step-quit" onClick={onQuit}>不做了</button>
      </div>}
    </aside>
  </div>;
}
