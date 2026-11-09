import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {DessertModel,DessertPortion,BITTEN_KINDS,SidePlate,DessertFork} from './dessert-model.jsx';
import {normalizeDessert,makerLabel,dayLabel,tagNote} from './dessert-recipe.js';
import {ServedDish,ServedPortion,DishUtensil} from './cooking-pot-food.jsx';
import {normalizeDish} from './cooking-recipe.js';
import {play} from './sounds.js';
import './dessert.css';

// The glass dome on the dining table, and sharing what's under it. The dome
// is drawn inside the table's own group, so it goes wherever the table goes.
// The page gives it what's in the dome and what to do on a tap; a meal is
// {id, started} while the two of them are eating; started is null while they
// are still walking over to sit down.
export const DessertContext = createContext({dome: null, meal: null, onDome: null, onMealEnd: null, decorMode: false});

// Where things sit on the table (its own frame; the top is at .74). The two
// side plates are in front of the two chairs facing each other.
export const DOME_SPOT = [.02, .74, .3];
const DESSERT_SCALE = .1, PLATE_SCALE = .19;
// Clear of the two cups as the table is set out (each in its own corner).
const SIDES = [[-.55, .74, -.1], [.55, .74, .1]];
export const DINING_PAIR = ['diningChair1', 'diningChair2'];

// The meal, second by second: the dome lifts, two little plates and forks
// come out, two slices go onto the plates and are eaten a bite at a time,
// then the other two, the plates go and the dome comes back down.
export const MEAL = {lift: [0, .8], plates: [.4, 1], rounds: [1, 3.7], hop: .6, bite: .3, firstBite: .9, clear: [6.4, 7.2], back: [7.2, 8], end: 8.1};
const roundAt = t => t < MEAL.rounds[0] ? -1 : t < MEAL.rounds[1] ? 0 : 1;
const ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
const span = (t, [a, b]) => ease((t - a) / (b - a));
// Bites in a round: left, right, left, right, left, right.
const biteStart = (round, k) => MEAL.rounds[round] + MEAL.firstBite + k * MEAL.bite;
function bitesTaken(t, round, side) {let n = 0; for (let k = side; k < 6; k += 2) if (t >= biteStart(round, k) + MEAL.bite / 2) n++; return n;}
export const mealPhase = t => {
  const r = roundAt(t), left = r < 0 ? [0, 1, 2, 3] : r === 0 ? [2, 3] : [];
  return {round: r, left: t >= MEAL.clear[0] ? [] : left, done: t >= MEAL.end};
};

const glassMaterial = () => new THREE.MeshPhysicalMaterial({color: '#f1f6f4', roughness: .05, metalness: 0, transparent: true, opacity: .3, clearcoat: 1, clearcoatRoughness: .1, depthWrite: false, side: THREE.DoubleSide});
const gold = new THREE.MeshStandardMaterial({color: '#cfae6c', roughness: .3, metalness: .55});
const tray = new THREE.MeshStandardMaterial({color: '#f6efe3', roughness: .4, metalness: .02});
let tagTexture = null;
function tagMaterial() {
  if (!tagTexture && typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = 96; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#fbf6ec'; g.fillRect(0, 0, 96, 64); g.strokeStyle = '#c99aa6'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(30, 26); g.bezierCurveTo(30, 18, 20, 16, 18, 24); g.bezierCurveTo(16, 31, 30, 38, 30, 42); g.bezierCurveTo(30, 38, 44, 31, 42, 24); g.bezierCurveTo(40, 16, 30, 18, 30, 26); g.stroke();
    g.strokeStyle = '#b9a99a'; g.lineWidth = 2.5; for (const [x, y, w] of [[50, 24, 30], [50, 34, 24], [20, 50, 52]]) {g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g.stroke();}
    tagTexture = new THREE.CanvasTexture(c); tagTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return new THREE.MeshStandardMaterial({map: tagTexture, roughness: .8, transparent: true});
}

// The cloche: a glass bell with a gold knob and a little tag on a thread.
function Cloche({glass, tagged, knobRef}) {
  const tag = useMemo(tagMaterial, []), thread = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, .2, 0), new THREE.Vector3(.025, .19, .02), new THREE.Vector3(.05, .165, .045)]), 8, .0018, 4, false), []);
  return <group>
    <mesh material={glass} position={[0, .022, 0]}><cylinderGeometry args={[.132, .135, .044, 40, 1, true]}/></mesh>
    <mesh material={glass} position={[0, .044, 0]}><sphereGeometry args={[.132, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]}/></mesh>
    <group ref={knobRef}>
      <mesh material={gold} position={[0, .003, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.135, .004, 6, 48]}/></mesh>
      <mesh material={gold} position={[0, .18, 0]} castShadow><cylinderGeometry args={[.012, .018, .012, 12]}/></mesh>
      <mesh material={gold} position={[0, .197, 0]} castShadow><sphereGeometry args={[.017, 14, 10]}/></mesh>
      {tagged && <><mesh geometry={thread} material={gold}/><mesh position={[.056, .147, .05]} rotation={[0, .75, .12]} material={tag}><boxGeometry args={[.046, .032, .002]}/></mesh></>}
    </group>
  </group>;
}

// Everything on the table for the dessert: the tray, what's on it, the dome,
// and during a meal the side plates, forks and slices.
export function DessertDome() {
  const ctx = useContext(DessertContext), invalidate = useThree(s => s.invalidate);
  const item = ctx.dome, meal = ctx.meal && item && ctx.meal.id === item.id ? ctx.meal : null;
  const glass = useMemo(glassMaterial, []);
  const lift = useRef(), knob = useRef(), sides = [useRef(), useRef()], forks = [useRef(), useRef()], slices = [useRef(), useRef()], dessert = useRef(), ended = useRef(null), heard = useRef({lift: false, bites: 0, down: false});
  const [phase, setPhase] = useState(() => mealPhase(0)), [bites, setBites] = useState([0, 0]), shownBites = useRef([0, 0]);
  // A dish from the stove is shared the same way, a helping each with chopsticks, the plate emptying round by round.
  // A cream puff isn't made smaller bite by bite: the bites show in it.
  const dish = item?.kind === 'dish', bitten = !!item && !dish && BITTEN_KINDS.includes(normalizeDessert(item).base);
  useEffect(() => {setPhase(mealPhase(0)); setBites([0, 0]); shownBites.current = [0, 0]; ended.current = null; heard.current = {lift: false, bites: 0, down: false}; invalidate();}, [meal?.id, meal?.started]);
  useFrame(() => {
    if (!meal || meal.started == null) {if (lift.current) {lift.current.position.y = 0; glass.opacity = .3; knob.current.visible = true;} dessert.current?.scale.setScalar(DESSERT_SCALE); return;}
    const t = (performance.now() - meal.started) / 1000, next = mealPhase(t);
    if (next.round !== phase.round || next.left.length !== phase.left.length) setPhase(next);
    // What it sounds like: the glass lifting, a fork on a plate at every bite, the glass set back down.
    const h = heard.current, r0 = roundAt(t), eaten = r0 < 0 ? 0 : 6 * r0 + bitesTaken(t, r0, 0) + bitesTaken(t, r0, 1);
    if (!h.lift) {h.lift = true; play('glass', {volume: .6});}
    if (eaten > h.bites) {h.bites = eaten; play('fork', {volume: .6});}
    if (!h.down && t >= MEAL.back[1]) {h.down = true; play('glass', {volume: .8});}
    // The dome lifts away and fades, and comes back at the end.
    const up = span(t, MEAL.lift) * (1 - span(t, MEAL.back));
    lift.current.position.y = up * .32; glass.opacity = .3 * (1 - up); knob.current.visible = up < .35;
    // The little plates and forks come out, and are cleared away again.
    const out = span(t, MEAL.plates) * (1 - span(t, MEAL.clear));
    for (const i of [0, 1]) {
      if (sides[i].current) sides[i].current.scale.setScalar(Math.max(.001, out));
      const r = roundAt(t), slice = slices[i].current, fork = forks[i].current;
      if (slice) {
        // The slice hops from the dessert to its plate, then gets smaller bite by bite.
        const start = r < 0 ? 0 : MEAL.rounds[r], hop = ease((t - start) / MEAL.hop), from = DOME_SPOT, to = SIDES[i];
        slice.position.set(from[0] + (to[0] - from[0]) * hop, from[1] + (to[1] - from[1]) * hop + Math.sin(Math.PI * hop) * .12 + .009 * hop, from[2] + (to[2] - from[2]) * hop);
        const taken = r < 0 ? 0 : bitesTaken(t, r, i), left = r < 0 ? 1 : bitten ? (taken < 3 ? 1 : 0) : [1, .68, .42, 0][taken];
        if (bitten && Math.min(2, taken) !== shownBites.current[i]) {shownBites.current = shownBites.current.map((n, k) => k === i ? Math.min(2, taken) : n); setBites(shownBites.current);}
        slice.scale.setScalar(Math.max(.001, DESSERT_SCALE * left));
        slice.visible = r >= 0 && left > 0 && t < MEAL.clear[0];
      }
      if (fork) {
        // Each bite the fork goes to the slice and back.
        let reach = 0;
        if (r >= 0) for (let k = i; k < 6; k += 2) {const u = (t - biteStart(r, k)) / MEAL.bite; if (u > 0 && u < 1) reach = Math.sin(Math.PI * u);}
        const rest = [SIDES[i][0] + (i ? .02 : -.02), .745, SIDES[i][2] + .13];
        fork.position.set(rest[0], rest[1] + reach * .07, rest[2] - reach * .11);
        fork.rotation.x = -reach * .5;
        fork.scale.setScalar(Math.max(.001, out * .2));
      }
    }
    if (dessert.current) dessert.current.scale.setScalar(Math.max(.001, DESSERT_SCALE * (1 - span(t, [MEAL.clear[0], MEAL.clear[1] - .2]))));
    if (next.done && ended.current !== meal.started) {ended.current = meal.started; ctx.onMealEnd?.(meal.id);}
    invalidate();
  });
  const d = item ? (dish ? normalizeDish(item) : normalizeDessert(item)) : null, round = phase.round;
  const tap = e => {if (ctx.decorMode || e.delta > 5 || !item) return; e.stopPropagation(); ctx.onDome?.();};
  return <group position={DOME_SPOT} onClick={tap} onPointerOver={() => {if (item && !ctx.decorMode) document.body.style.cursor = 'pointer';}} onPointerOut={() => {document.body.style.cursor = 'default';}}>
    <mesh material={tray} position={[0, .006, 0]} castShadow receiveShadow><cylinderGeometry args={[.15, .155, .012, 40]}/></mesh>
    <mesh material={gold} position={[0, .012, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.15, .003, 6, 48]}/></mesh>
    {d && <group ref={dessert} position={[0, .012, 0]} scale={DESSERT_SCALE}>{dish ? <ServedDish item={d} left={meal ? phase.left.length / 4 : 1}/> : <DessertModel item={d} quarters={meal ? phase.left : undefined}/>}</group>}
    <group ref={lift}><group position={[0, .012, 0]}><Cloche glass={glass} tagged={!!d} knobRef={knob}/></group></group>
    {meal && <group position={DOME_SPOT.map(v => -v)}>
      {[0, 1].map(i => <group key={i}>
        <group ref={sides[i]} position={SIDES[i]} scale={.001}><group scale={PLATE_SCALE}><SidePlate/></group></group>
        <group ref={forks[i]} rotation={[0, i ? -.3 : .3, 0]} scale={.001}>{dish ? <group scale={.9}><DishUtensil item={d}/></group> : <DessertFork/>}</group>
        {round >= 0 && <group ref={slices[i]} visible={false}>{dish ? <group scale={2.2}><ServedPortion item={d}/></group> : <DessertPortion item={d} portion={round * 2 + i} bites={bitten ? bites[i] : 0}/>}</group>}
      </group>)}
    </group>}
  </group>;
}

// In the table's close-up the bar only says 一起吃. What the tag on the dome
// says is read by tapping the dome: it hangs above the bar like the tag
// itself, and goes away on another tap.
export function DomeTag({item, open, onClose, onEat}) {
  const d = item?.kind === 'dish' ? normalizeDish(item) : normalizeDessert(item), note = tagNote(d);
  return <>
    {open && <div className="dome-tag" role="note" onClick={onClose}><b>{d.name}</b><small>{makerLabel(d.by)}{d.madeOn ? ` · ${dayLabel(d.madeOn)}` : ''}</small>{note && <em>「{note}」</em>}</div>}
    <button className="dome-eat" onClick={onEat}>一起吃</button>
  </>;
}
