import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Bowl,bowlRadiusAt,Egg} from './dessert-tools.jsx';
import {ease,easeIn,easeOut,span,buzz} from './dessert-motion.js';
import {play} from './sounds.js';
import {STATION as S,BOWL_SCALE,BURNER_TOP,Prepped,FOOD_SEEDS} from './cooking-tools.jsx';
import {INGREDIENTS,EXTRAS,POT_TIMES,potHeatAfter,POT_HEAT_WORDS} from './cooking-recipe.js';
import {MISHAPS,MISHAPS_MAX,mayHappen} from './cooking-mishaps.js';
import {POT_R,POT_FLOOR,POT_FULL,POT_LIP,brothOf,Brew,Bubbles,Steam,Foam,Ladle,Jug,RiceHeap,RiceBowl,BowlFood} from './cooking-pot-food.jsx';

// Cooking in the little pot on the right ring, the way the wok goes (src/cooking-steps.jsx): water poured in from
// the jug; then, once it has come to the boil, whatever is ready goes in when it is asked for (the card's buttons),
// the cut things and the rice flying over from their dishes and the beaten egg poured in a thin stream to set in
// wisps; a tap on the pot stirs it. Once the last thing is in, time on the fire counts: a soup thickens and boils
// down, a porridge thickens and catches. 盛出来 takes it off, and it is ladled into a bowl.

const v3 = a => new THREE.Vector3(...a);
const clamp01 = u => Math.min(1, Math.max(0, u));
// Where the pot stands and how big it is drawn (as on the counter, src/cooking-steps.jsx Counter).
export const POT_SCALE = .8, POT_AT = [S.pot[0], .07 + BURNER_TOP * .72 - .01, S.pot[2]];
const potY = y => POT_AT[1] + y * POT_SCALE;
// The jug waits behind the pot, to its right; to pour, it is held up to the right of the pot and tipped, its spout
// over the middle.
const JUG_AT = [S.pot[0] + 1.2, 0, S.pot[2] - .85], JUG_POUR = [S.pot[0] + .78, POT_AT[1] + 1.05, S.pot[2]], JUG_TIP = 1.1;
// The beaten egg is poured from its bowl held to the left of the pot (like the wok's).
const EGG_POUR = [S.pot[0] - 1.0, 1.75, S.pot[2] + .1];
const BEATEN = '#f3dc9c', BEATEN_LEVEL = .495;
const isPorridge = items => items.includes('rice');

// ---- step: water ----
// Tap: the jug comes over, tips, and the water runs in till the pot is filled; the jug goes back.
export function WaterStep({taps, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate), jug = useRef(), stream = useRef(), water = useRef();
  const st = useRef({phase: 'wait', t0: 0}), seen = useRef(taps), [left, setLeft] = useState(1);
  const home = useMemo(() => v3(JUG_AT), []), pour = useMemo(() => v3(JUG_POUR), []);
  useEffect(() => {onHint('点一下，往锅里加水');}, []);
  useEffect(() => {
    if (taps === seen.current) return; seen.current = taps;
    const s = st.current; if (s.phase === 'wait') {s.phase = 'pour'; s.t0 = performance.now(); buzz(10); invalidate();}
  }, [taps]);
  useFrame(() => {
    const s = st.current, j = jug.current;
    if (!j) return;
    if (s.phase === 'wait') {j.position.copy(home); j.rotation.set(0, 0, 0); return;}
    const t = (performance.now() - s.t0) / 1000, go = ease(span(t, 0, .5)), back = ease(span(t, 2.2, 2.7)), tip = ease(span(t, .45, .75)) * (1 - ease(span(t, 1.95, 2.25)));
    j.position.lerpVectors(home, pour, go * (1 - back)); j.position.y += Math.sin(clamp01(go * (1 - back)) * Math.PI) * .25; j.rotation.z = JUG_TIP * tip;
    const fill = clamp01(span(t, .75, 1.95)), lv = POT_FLOOR + (POT_FULL - POT_FLOOR) * fill;
    if (water.current) {water.current.visible = fill > 0; water.current.position.y = lv;}
    if (stream.current) {
      const top = pour.y + .05, bottom = potY(lv);
      stream.current.visible = t > .75 && t < 1.95; stream.current.position.set(S.pot[0] + .08, (top + bottom) / 2, S.pot[2]); stream.current.scale.y = Math.max(.01, top - bottom);
    }
    const shown = Math.round((1 - fill) * 10) / 10; if (shown !== left) setLeft(shown);
    if (t >= .8 && !s.ran) {s.ran = true; play('cloth', {volume: .5}); onHint('哗啦啦——');}
    if (t >= 2.8 && !s.told) {s.told = true; s.phase = 'done'; onHint('水加好了'); onDone();}
    if (!s.told) invalidate();
  });
  const streamMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#e2f1f4', transparent: true, opacity: .7, roughness: .05, depthWrite: false}), []);
  return <group>
    <group ref={jug} position={JUG_AT}><Jug water={left}/></group>
    <mesh ref={stream} visible={false} material={streamMat}><cylinderGeometry args={[.035, .045, 1, 10, 1, true]}/></mesh>
    <group position={POT_AT} scale={POT_SCALE}><group ref={water} visible={false}><Brew items={[]} cooked={0}/></group></group>
  </group>;
}

// ---- step: the pot ----
// A ring spreading out where something lands in it.
function Ripple({at}) {
  const m = useRef(), invalidate = useThree(s => s.invalidate), born = useMemo(() => performance.now(), [at]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: .6, depthWrite: false}), []);
  useFrame(() => {const u = (performance.now() - born) / 600; if (!m.current) return; m.current.visible = u < 1; m.current.scale.setScalar(.1 + u * .5); mat.opacity = .6 * (1 - u); if (u < 1) invalidate();});
  return <mesh ref={m} position={[0, .01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat}><torusGeometry args={[1, .03, 4, 32]}/></mesh>;
}
export function BoilStep({items, prepAt, look, taps, asks, had = [], onHint, onAdded, onMishap, onDone}) {
  const invalidate = useThree(s => s.invalidate), porridge = isPorridge(items), [, b, c] = POT_TIMES[porridge ? 'porridge' : 'soup'];
  // With tea, eggs go in whole, from their bowl, to boil into tea eggs.
  const teaEgg = items.includes('tea') && items.includes('egg');
  const fly = useRef({}), bowl = useRef(), bowlFill = useRef(), ladle = useRef(), brew = useRef();
  const st = useRef({t0: performance.now(), queue: [], anim: null, lastIn: null, firstIn: null, had: [...had], spin: 0}), seenTaps = useRef(taps), seenAsks = useRef(asks.length);
  const [have, setHave] = useState({}), [boil, setBoil] = useState(0), [heat, setHeat] = useState('tender'), [cooked, setCooked] = useState(0), [level, setLevel] = useState(POT_FULL), [foam, setFoam] = useState(null), [ripple, setRipple] = useState(0), [eggSet, setEggSet] = useState(0);
  // Now and then (src/cooking-mishaps.js): a little while after the first thing goes in, it boils over.
  const foamAt = useMemo(() => mayHappen('boilover', had) ? 2 + Math.random() * 2.5 : 0, []);
  const inPot = items.filter(id => have[id]), extras = Object.keys(EXTRAS).filter(e => have[e]);
  useEffect(() => {onHint('等水开……咕嘟咕嘟冒泡了就能下锅');}, []);
  useEffect(() => {
    const s = st.current;
    for (const a of asks.slice(seenAsks.current)) s.queue.push(a);
    seenAsks.current = asks.length; invalidate();
  }, [asks.length]);
  // A tap on the pot stirs it, once it is boiling.
  useEffect(() => {
    if (taps === seenTaps.current) return; seenTaps.current = taps;
    const s = st.current; if (!s.boiled || s.stir) return;
    s.stir = performance.now(); buzz(6); invalidate();
    if (s.foaming) {s.foaming = false; onHint('搅一搅，泡沫落下去了');}
  }, [taps]);
  useFrame((_, dt) => {
    const s = st.current, now = performance.now();
    // Coming to the boil.
    const bo = clamp01((now - s.t0) / 3200);
    if (Math.abs(bo - boil) > .05 || (bo === 1 && boil !== 1)) setBoil(bo);
    if (bo >= 1 && !s.boiled) {s.boiled = true; onAdded('boil'); buzz(12); onHint('水开了！点下面的东西下锅，想先下哪样就先下哪样');}
    if (!s.anim && s.queue.length) {
      const what = s.queue.shift();
      if (what === 'ready') {s.anim = {kind: 'off', t0: now}; s.heat = s.lastIn ? potHeatAfter((now - s.lastIn) / 1000, porridge) : 'tender'; buzz(18); onHint(POT_HEAT_WORDS[porridge ? 'porridge' : 'soup'][s.heat]);}
      else s.anim = {kind: what, t0: now};
    }
    const a = s.anim;
    if (a) {
      const t = (now - a.t0) / 1000;
      if (a.kind === 'egg' && !teaEgg) {
        // The bowl comes over, tips, pours in a thin stream and goes back; the egg sets in wisps.
        const go = ease(span(t, 0, .5)), tip = ease(span(t, .45, .8)) * (1 - ease(span(t, 1.25, 1.55))), back = ease(span(t, 1.4, 1.9));
        if (bowl.current) {bowl.current.position.copy(v3(S.bowl)).lerp(v3(EGG_POUR), go * (1 - back)); bowl.current.position.y += Math.sin(go * Math.PI) * .3 * (1 - back); bowl.current.rotation.z = -1.15 * tip;}
        if (bowlFill.current) {bowlFill.current.visible = t < 1.1; bowlFill.current.scale.setScalar(Math.max(.001, 1 - span(t, .7, 1.1)));}
        if (t >= .75 && !a.added) {a.added = true; s.egg = now; came(s, now, 'egg');}
        if (t >= 1.9) s.anim = null;
      } else if (INGREDIENTS[a.kind]) {
        // Over the rim and down into the water.
        const p = fly.current[a.kind], from = a.kind === 'egg' ? S.bowl : prepAt(a.kind), k = clamp01(t / .7), to = [POT_AT[0], potY(level), POT_AT[2]];
        if (p) {const x = easeOut(k); p.position.set((to[0] - from[0]) * x, .05 + (to[1] - .05) * k + Math.sin(k * Math.PI) * 1.5, (to[2] - from[2]) * x); p.visible = k < 1;}
        if (t >= .7 && !a.added) {a.added = true; came(s, now, a.kind); setRipple(n => n + 1); play('lid', {volume: .25});}
        if (t >= .85) s.anim = null;
      } else if (a.kind === 'off') {
        if (t >= .5 && !a.told) {a.told = true; onDone({heat: s.heat});}
      } else {
        // Spring onion: in it goes.
        if (t >= .15 && !a.added) {a.added = true; setHave(h => ({...h, [a.kind]: now})); onAdded(a.kind); buzz(6);}
        if (t >= .4) s.anim = null;
      }
    }
    // How long it has simmered since the last thing went in: what that does to it.
    if (s.lastIn) {
      const sec = (now - s.lastIn) / 1000, h = potHeatAfter(sec, porridge);
      if (h !== s.shown && (!a || a.kind !== 'off')) {s.shown = h; setHeat(h);}
      const k = Math.round(clamp01(.15 + sec / b) * 20) / 20; if (k !== s.k) {s.k = k; setCooked(k);}
      const down = porridge ? 0 : Math.round(Math.min(.16, Math.max(0, (sec - b) / (c - b)) * .1) * 100) / 100; if (down !== s.down) {s.down = down; setLevel(POT_FULL - down);}
      if (sec > b && !s.warned) {s.warned = true; onHint(porridge ? '粥熬得稠稠的了，好了就点「盛出来」' : '汤越熬越浓了，好了就点「盛出来」');}
      if (sec > c && !s.warned2) {s.warned2 = true; onHint(porridge ? '锅底好像有点糊了……快盛出来' : '汤快熬干了……快盛出来');}
    }
    // Boiling over, a little while after the first thing went in.
    if (foamAt && s.firstIn && !s.foamed && (now - s.firstIn) / 1000 >= foamAt && !s.had.includes('boilover') && s.had.length < MISHAPS_MAX) {
      s.foamed = true; s.foaming = true; s.had.push('boilover'); setFoam(now); onMishap?.('boilover'); onHint(MISHAPS.boilover.say); buzz([12, 30, 20]); play('sizzle', {volume: .6});
      setTimeout(() => {s.foaming = false;}, 1600);
    }
    if (s.egg) {const q = clamp01((now - s.egg) / 1200); const r = Math.round(q * 10) / 10; if (r !== s.eggShown) {s.eggShown = r; setEggSet(r);}}
    // The ladle: leaning on the rim, or going round once inside when it is tapped.
    const l = ladle.current;
    if (l) {
      const u = s.stir ? (now - s.stir) / 700 : 1;
      if (u < 1) {const ang = u * Math.PI * 2; l.position.set(Math.cos(ang) * .3, level - .06, Math.sin(ang) * .3); l.rotation.set(-.25, -ang, 0); s.spin += dt * 4.5;}
      else {s.stir = null; l.position.set(.3, POT_LIP - .16, .22); l.rotation.set(-.35, .55, -.8);}
      if (brew.current) brew.current.rotation.y = s.spin;
    }
    invalidate();
  });
  // Something has gone in: from now its time on the fire counts.
  function came(s, now, id) {s.lastIn = now; if (!s.firstIn) s.firstIn = now; setHave(h => ({...h, [id]: now})); onAdded(id); onHint(id === 'rice' && !s.saidRice ? (s.saidRice = true, '米下锅了，时不时点锅搅一搅，别粘底') : '点锅搅一搅；都下好了，觉得行了就点「盛出来」');}
  return <group>
    {/* Each cut thing (and the rice) waits in its dish until it is called for; then it flies into the pot. */}
    {items.filter(id => INGREDIENTS[id] && id !== 'egg').map(id => <group key={id} position={prepAt(id)}>
      {id === 'rice' && <RiceBowl washed empty={!!have.rice}/>}
      {!have[id] && <group ref={el => {fly.current[id] = el;}} position={[0, .05, 0]}>{id === 'rice' ? <RiceHeap/> : <Prepped id={id} seed={FOOD_SEEDS[id]}/>}</group>}
    </group>)}
    {items.includes('egg') && <group ref={bowl} position={S.bowl}><group scale={BOWL_SCALE}><Bowl/>{!teaEgg && <mesh ref={bowlFill} position={[0, BEATEN_LEVEL, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={bowlRadiusAt(BEATEN_LEVEL) - .012} visible={!have.egg}><circleGeometry args={[1, 40]}/><meshStandardMaterial color={BEATEN} roughness={.32}/></mesh>}</group></group>}
    {teaEgg && !have.egg && <group position={S.bowl}><group ref={el => {fly.current.egg = el;}} position={[0, .05, 0]}>{[-.13, .13].map((x, i) => <group key={x} position={[x, .17, 0]} rotation={[0, i ? .3 : -.2, Math.PI / 2]} scale={1.2}><Egg brown={i === 1}/></group>)}</group></group>}
    <group position={POT_AT} scale={POT_SCALE}>
      <group position={[0, level, 0]}>
        <group ref={brew}><Brew items={inPot} extras={extras} heat={heat} cooked={inPot.length ? cooked : 0} eggSet={eggSet}/></group>
        <Bubbles strength={porridge && have.rice ? boil * .6 : boil}/>
        {ripple > 0 && <Ripple key={ripple} at={ripple}/>}
      </group>
      <group position={[0, POT_LIP, 0]}><Steam level={boil}/></group>
      {foam && <Foam start={foam}/>}
      <group ref={ladle}><Ladle look={look}/></group>
    </group>
  </group>;
}

// ---- step: serve ----
// The fire is off. Three ladlefuls from the pot into the bowl, the pot going down and the bowl filling.
const SCOOP = 1.1, SCOOPS = 3;
export function ServeStep({made, look, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate), ladle = useRef(), t0 = useRef(performance.now()), told = useRef(false);
  const [poured, setPoured] = useState(0), [full, setFull] = useState(0);
  const color = useMemo(() => brothOf(made.items, 1), [made.items]);
  const potLevel = POT_FULL - (POT_FULL - POT_FLOOR - .08) * poured / SCOOPS;
  const P = useMemo(() => ({rest: v3([POT_AT[0] + .35, potY(POT_LIP) + .3, POT_AT[2] + .2]), up: v3([POT_AT[0], potY(POT_LIP) + .55, POT_AT[2]]), over: v3([S.plate[0] - .1, .95, S.plate[2]])}), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {onHint('盛出来');}, []);
  useFrame(() => {
    const t = (performance.now() - t0.current) / 1000, l = ladle.current;
    if (!l) return;
    const i = Math.min(SCOOPS - 1, Math.floor(t / SCOOP)), u = (t - i * SCOOP) / SCOOP, dip = tmp.set(POT_AT[0], potY(potLevel) - .02, POT_AT[2]);
    // Into the pot, up full, over to the bowl, tipped, and back.
    if (t >= SCOOP * SCOOPS) {l.position.lerpVectors(P.up, P.rest, ease(clamp01((t - SCOOP * SCOOPS) / .3))); l.rotation.set(0, 0, 0);}
    else if (u < .25) {l.position.lerpVectors(i ? P.up : P.rest, dip, ease(u / .25)); l.rotation.set(0, 0, 0);}
    else if (u < .4) l.position.lerpVectors(dip, P.up, ease((u - .25) / .15));
    else if (u < .7) {l.position.lerpVectors(P.up, P.over, ease((u - .4) / .3)); l.position.y += Math.sin((u - .4) / .3 * Math.PI) * .2;}
    else if (u < .88) {l.position.copy(P.over); l.rotation.z = -1.3 * ease((u - .7) / .18);}
    else {l.position.lerpVectors(P.over, P.up, ease((u - .88) / .12)); l.rotation.z = -1.3 * (1 - ease((u - .88) / .12));}
    const f = t < SCOOP * SCOOPS && u >= .3 && u < .8 ? 1 : 0; if (f !== full) setFull(f);
    const n = Math.min(SCOOPS, Math.floor(t / SCOOP + .2)); if (n !== poured) {setPoured(n); if (n) buzz(8);}
    if (t >= SCOOP * SCOOPS + .5 && !told.current) {told.current = true; play('found', {volume: .5}); onHint('盛好啦'); onDone();}
    if (!told.current) invalidate();
  });
  return <group>
    <group position={POT_AT} scale={POT_SCALE}>{poured < SCOOPS && <group position={[0, potLevel, 0]}><Brew items={made.items} extras={made.extras} heat={made.heat}/></group>}</group>
    {poured > 0 && <group position={S.plate}><BowlFood items={made.items} extras={made.extras} heat={made.heat} left={poured / SCOOPS}/></group>}
    <group ref={ladle} position={P.rest}><Ladle look={look} full={full} color={color}/></group>
  </group>;
}
