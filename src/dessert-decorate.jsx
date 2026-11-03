import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Oven,Turntable,Tin,Spatula,PipingBag,FillBag,Jug,Shaker} from './dessert-tools.jsx';
import {DessertModel,DessertBody,dessertTop,plateTop,PUFFS,PILE,puffY} from './dessert-model.jsx';
import {ROLES} from './brick-recipe.js';
import {TAU,ease,easeIn,span,buzz,kindOf,batterColors,bakeColor,applyRise,COUNTER_AT,DECO,TURNTABLE_TOP,markAt,markPoint,addMark,enoughFor} from './dessert-motion.js';
import {HAND_MAX} from './dessert-recipe.js';

// The second half of making a dessert by hand, on the turntable left of the
// oven: turn it out of its tin, finish it (spread, fill, pour or sandwich, all
// by drawing circles), then pipe, place fruit and sprinkle wherever you tap.
// Every kind of dessert goes through the same steps; what differs is in
// KINDS (dessert-motion.js) and in the dessert's own shape.

const NONE = {cream: false, fruit: false, sprinkles: false};

// The oven stays where it was, door shut and light off, while the dessert is
// finished beside it.
export function StillOven() {
  const door = useRef(), knob = useRef(), glow = useRef();
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({color: '#e9c9c6', roughness: .35}), []);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({color: '#fff4e4', transparent: true, opacity: .3, roughness: .06, metalness: .1, depthWrite: false}), []);
  return <Oven door={door} knob={knob} glow={glow} lamp={lamp} glass={glass}/>;
}
// The turntable, and the dessert on it as far as it has got.
function OnTurntable({d, frost = 1, show, bare}) {
  return <group position={DECO.toArray()}>
    <Turntable/>
    <group position={[0, TURNTABLE_TOP, 0]}><DessertModel item={d} frost={frost} show={show} bare={bare}/></group>
  </group>;
}
export function Finished({d}) {
  return <OnTurntable d={d}/>;
}
// The top of the dessert in the room, where the finger is caught.
const topIn = d => {const top = dessertTop(d); return {top, at: new THREE.Vector3(DECO.x + top.p[0], TURNTABLE_TOP + top.p[1], DECO.z + top.p[2])};};
function Catch({at, onDown, onMove, onUp}) {
  return <mesh position={at.toArray()} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}><planeGeometry args={[40, 40]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>;
}

// ---- turn it out ----
// Tap: the tin comes over to the plate. A cake or a pudding turns upside down
// on the way and lands over the plate; it is knocked twice, lifted straight
// up, and what was in it stands on the plate. A tart or a tray of macarons
// lands on the plate; what is in it is lifted up out of it, the tin slides
// away underneath, and it is set down. Nothing goes through anything: the tin
// only moves sideways once it is clear of the dessert.
const TIN_HEIGHT = {cake: .39, tart: .16, pudding: .5, macaron: .05, puff: .05};
export function TurnOutStep({d, seconds = 5, taps, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate);
  const k = kindOf(d), flip = k.out === 'flip', fit = k.fit, tall = k.tall || k.fit;
  const batter = useMemo(() => {const m = new THREE.MeshStandardMaterial({roughness: .5}); bakeColor(batterColors(d), seconds, m.color); return m;}, []);
  const tin = useRef(), rise = useRef(), body = useRef(), st = useRef({phase: 'wait', t0: 0, knocks: 0}), seen = useRef(taps);
  const [out, setOut] = useState(false);
  const plateY = TURNTABLE_TOP + plateTop(d.plate), h = TIN_HEIGHT[d.base] || .3;
  // How high the tin goes to clear the dessert, or the dessert to clear the tin.
  const clear = flip ? h * tall + .3 : h * fit + .18;
  const above = useMemo(() => new THREE.Vector3(DECO.x, plateY + 1.1 + h * tall, DECO.z), []), down = useMemo(() => new THREE.Vector3(DECO.x, plateY + (flip ? h * tall + .004 : .002), DECO.z), []);
  useEffect(() => {onHint(flip ? '点一下，倒扣在盘子上' : d.base === 'puff' ? '点一下，从烤盘上拿下来' : '点一下，从模子里取出来');}, []);
  // What is in the tin is as risen as it was when it came out of the oven.
  useLayoutEffect(() => {applyRise(rise.current, d.base, seconds); invalidate();}, []);
  useEffect(() => {
    if (taps === seen.current) return; seen.current = taps;
    if (st.current.phase === 'wait') {st.current.phase = 'go'; st.current.t0 = performance.now(); invalidate();}
  }, [taps]);
  const settle = (b, q) => {b.scale.y = q > 0 && q < 1 ? 1 - .06 * Math.sin(q * Math.PI) : 1;};
  useFrame(() => {
    const s = st.current, g = tin.current, b = body.current;
    if (s.phase === 'wait') return;
    const t = (performance.now() - s.t0) / 1000, u = ease(t / .55);
    // Turning over and growing to the plate's size on the way, worked out from
    // the time every frame, so a dropped frame cannot leave it half turned.
    g.rotation.x = flip ? Math.PI * ease(span(t, .12, .55)) : 0; g.scale.set(1 + (fit - 1) * u, 1 + (tall - 1) * u, 1 + (fit - 1) * u);
    if (t < .55) {g.position.lerpVectors(COUNTER_AT, above, u); g.position.y += Math.sin(u * Math.PI) * .45;}
    else if (t < .8) g.position.lerpVectors(above, down, easeIn(span(t, .55, .8)));
    else {
      if (!s.landed) {s.landed = true; buzz(24); setOut(true); if (rise.current) rise.current.visible = false;}
      if (flip) {
        // Two knocks on the bottom, straight up, then off to the left.
        const knock = Math.min(2, Math.max(0, span(t, .9, 1.3) * 2)), n = Math.floor(knock), hop = n < 2 ? Math.sin((knock - n) * Math.PI) * .035 : 0;
        if (n > s.knocks) {s.knocks = n; buzz(10);}
        const up = clear * ease(span(t, 1.35, 1.75)), away = ease(span(t, 1.7, 2.2));
        g.position.set(down.x - away * 2.3, down.y + hop + up + away * .9, down.z - away * .5);
        settle(b, span(t, 1.45, 1.8));
      } else {
        // Up out of the tin; the tin slides out from under it to the left
        // and goes; then it is set down on the plate.
        b.position.y = plateY + clear * (ease(span(t, .9, 1.25)) - easeIn(span(t, 1.85, 2.1)));
        const slide = ease(span(t, 1.25, 1.8));
        g.position.set(down.x - slide * 2.6, down.y + ease(span(t, 1.2, 1.32)) * .07 + ease(span(t, 1.65, 1.95)) * .9, down.z - slide * .4);
        if (t >= 2.1 && !s.set) {s.set = true; buzz(14);}
        settle(b, span(t, 2.1, 2.35));
      }
      if (t > (flip ? 2.25 : 2.45)) {if (!s.told) {s.told = true; onHint(flip ? '扣出来啦' : d.base === 'puff' ? '拿下来啦' : '取出来啦'); onDone();} return;}
    }
    invalidate();
  });
  return <group>
    <OnTurntable d={d} bare/>
    <group ref={body} position={[DECO.x, plateY, DECO.z]} visible={out}><DessertBody item={d} show={NONE} frost={0}/></group>
    <group ref={tin} position={COUNTER_AT.toArray()}><Tin base={d.base} rise={rise} batter={batter}/></group>
  </group>;
}

// ---- finish it: spread, fill, pour or sandwich ----
// Draw circles over the top: the knife (or the jug, or the bag) follows the
// finger and the cream, filling or caramel goes on as it goes round.
const FINISH_TURNS = 3;
export function FinishStep({d, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate);
  const k = kindOf(d), {at} = useMemo(() => topIn(d), []);
  const tool = useRef(), st = useRef({down: false, last: null, total: 0, done: 0, told: false, tip: at.clone().add(new THREE.Vector3(.35, 0, .2)), angle: 0});
  const [frost, setFrost] = useState(0);
  const sauce = ROLES[d.base === 'pudding' ? (d.c.body === 'wood' ? 'ink' : 'wood') : d.c.cream]?.color;
  useEffect(() => {onHint(k.finishHint);}, []);
  const turn = p => {
    const s = st.current, a = Math.atan2(p.x - at.x, p.z - at.z), r = Math.hypot(p.x - at.x, p.z - at.z);
    if (r > .06 && s.last !== null) {const da = Math.atan2(Math.sin(a - s.last), Math.cos(a - s.last)); s.total += Math.abs(da);}
    s.last = a; s.angle = a;
    const reach = Math.min(r, .6); s.tip.set(at.x + Math.sin(a) * reach, at.y, at.z + Math.cos(a) * reach);
    const f = Math.min(1, s.total / (FINISH_TURNS * TAU)), q = Math.round(f * 20) / 20;
    if (q !== frost) setFrost(q);
    if (f >= 1 && !s.done) {s.done = performance.now(); s.down = false; buzz(18); onHint(`${k.finish[0]}好啦`);}
  };
  const onDown = e => {const s = st.current; if (s.done) return; e.stopPropagation(); e.target?.setPointerCapture?.(e.pointerId); s.down = true; s.last = null; turn(e.point); invalidate();};
  const onMove = e => {if (!st.current.down || st.current.done) return; turn(e.point); invalidate();};
  const onUp = e => {st.current.down = false; st.current.last = null; e?.target?.releasePointerCapture?.(e.pointerId);};
  useFrame(() => {
    const s = st.current, g = tool.current, lift = s.done ? easeIn((performance.now() - s.done) / 600) * 1.4 : s.down ? 0 : .12;
    // A knife lies along the way it is going round; a jug or a bag hangs over the finger.
    if (k.tool === 'spatula') {g.position.set(s.tip.x, s.tip.y + .03 + lift, s.tip.z); g.rotation.set(0, s.angle + Math.PI, 0);}
    else {g.position.set(s.tip.x, s.tip.y + (k.tool === 'jug' ? .45 : .12) + lift, s.tip.z); g.rotation.set(0, s.angle, k.tool === 'jug' ? -.6 : 0);}
    if (s.done && performance.now() - s.done > 800) {if (!s.told) {s.told = true; onDone();} return;}
    if (s.down || s.done) invalidate();
  });
  return <group>
    <OnTurntable d={d} frost={frost} show={NONE}/>
    <group ref={tool}>{k.tool === 'spatula' ? <Spatula/> : k.tool === 'jug' ? <Jug sauce={sauce}/> : <PipingBag cream={sauce}/>}</group>
    <Catch at={at} onDown={onDown} onMove={onMove} onUp={onUp}/>
  </group>;
}

// ---- fill them: cream puffs ----
// Press and hold on a puff: the nozzle goes into the little hole in its top
// and the cream goes in, and the puff fills out. Hold on once it is full and
// the cream comes back out of the hole and runs down its side; that puff keeps
// it. When every puff is full and the finger is off, the step is done.
const FILL_TIME = 1.1, BURST = 1.5, UP = new THREE.Vector3(0, 1, 0);
export function FillStep({d, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate);
  const base = useMemo(() => new THREE.Vector3(DECO.x, TURNTABLE_TOP + plateTop(d.plate), DECO.z), []);
  // Each puff's hole, in the room.
  const holes = useMemo(() => PUFFS.map(m => new THREE.Vector3(0, puffY(m.hole), m.hole).applyAxisAngle(UP, m.a).add(new THREE.Vector3(...m.p)).multiplyScalar(PILE).add(base)), []);
  const tool = useRef(), st = useRef({hold: -1, last: 0, fills: [0, 0, 0, 0], burst: [], done: 0, sent: false, tip: holes[1].clone().add(new THREE.Vector3(.45, .55, .15)), squeeze: 0});
  const [fills, setFills] = useState([0, 0, 0, 0]);
  const sauce = ROLES[d.c.cream]?.color;
  useEffect(() => {onHint('按住一只泡芙不放，往里灌奶油');}, []);
  const left = () => st.current.fills.filter(f => f < 1).length;
  const press = (i, e) => {const s = st.current; if (s.done) return; e.stopPropagation(); e.target?.setPointerCapture?.(e.pointerId); s.hold = i; s.last = performance.now(); invalidate();};
  const release = e => {
    const s = st.current; if (s.hold < 0) return;
    s.hold = -1; e?.target?.releasePointerCapture?.(e.pointerId);
    const n = left(); if (n && !s.done) onHint(`还有 ${n} 只没灌满，按住它`);
    invalidate();
  };
  useFrame((_, dt) => {
    const s = st.current, now = performance.now();
    if (s.hold >= 0 && !s.done) {
      const i = s.hold, step = Math.min(.1, (now - s.last) / 1000), was = s.fills[i], is = Math.min(BURST, was + step / FILL_TIME);
      s.last = now; s.fills[i] = is;
      if (was < 1 && is >= 1) {buzz(14); const n = left(); onHint(n ? `满啦，松手换下一只，还有 ${n} 只` : '都满啦，松手吧');}
      else if (was < BURST && is >= BURST) {s.burst.push(i); buzz(40); onHint('灌太满啦，奶油从小口子冒出来了');}
      else if (Math.floor(is * 6) > Math.floor(was * 6) && is < BURST) buzz(5);
      const q = s.fills.map(f => Math.round(f * 20) / 20);
      setFills(old => q.every((v, k) => v === old[k]) ? old : q);
    }
    if (!s.done && s.hold < 0 && s.fills.every(f => f >= 1)) {s.done = now; buzz(18); onHint('灌好啦');}
    // The nozzle: in the hole while a finger is on a puff, hovering over the
    // last one otherwise, then off and away when they are all done.
    const hole = holes[s.hold >= 0 ? s.hold : Math.max(0, s.lastHold ?? 1)];
    if (s.hold >= 0) s.lastHold = s.hold;
    const away = s.done ? easeIn((now - s.done) / 700) * 1.6 : 0;
    const goal = hole.clone().add(new THREE.Vector3(0, s.hold >= 0 ? -.035 : .32, 0)).add(new THREE.Vector3(0, away, 0));
    s.tip.lerp(goal, 1 - Math.exp(-Math.min(dt, .1) * 14));
    const g = tool.current; g.position.copy(s.tip); g.rotation.set(-.32, 0, .12);
    s.squeeze = s.hold >= 0 && s.fills[s.hold] < BURST ? Math.sin(now / 90) * .025 : 0; g.scale.set(1 + s.squeeze, 1 - s.squeeze, 1 + s.squeeze);
    if (s.done && now - s.done > 900) {if (!s.sent) {s.sent = true; onDone({burst: [...s.burst].sort((a, b) => a - b)});} return;}
    if (s.hold >= 0 || s.done || s.tip.distanceTo(goal) > .002) invalidate();
  });
  return <group>
    <OnTurntable d={d} bare/>
    {/* The finger is caught by the puff it lands on, the one in front where they overlap. */}
    <group position={base.toArray()}><DessertBody item={d} show={NONE} fills={fills} onPress={press} onLift={release}/></group>
    <group ref={tool}><FillBag cream={sauce}/></group>
  </group>;
}

// ---- pipe, place fruit, sprinkle ----
// Tap where it should go: a rosette or a dollop of cream is piped there, a
// strawberry is put there; drag to pipe a shell border or shake sprinkles
// along. As many as she likes, until she says 「好了，下一步」; none at all
// means that dessert has none of it. Where everything went is kept on it.
const WORDS = {
  cream: {rosette: '点哪儿，就在哪儿挤一朵玫瑰花，想挤几朵挤几朵', dollop: '点哪儿，就在哪儿挤一团，想挤几团挤几团', shell: '沿着边划一圈，挤出贝壳花边', swirl: '点一下，在那儿挤一大朵', done: '挤好啦', skip: '这次不挤奶油', full: '挤得满满当当，再也挤不下啦'},
  fruit: {strawberry: '点哪儿，草莓就摆在哪儿，想摆几颗摆几颗', blueberry: '点哪儿，蓝莓就落在哪儿，想放几颗放几颗', cherry: '点哪儿，樱桃就放在哪儿，想放几颗放几颗', done: '摆好啦', skip: '这次不放水果', full: '摆得满满的，再也放不下啦'},
  sprinkles: {any: '在上面划一划，撒糖粒', done: '撒好啦', skip: '这次不撒糖粒', full: '撒得满满的，再撒就要掉下来啦'}
};
function Pop({at, born}) {
  const g = useRef(), invalidate = useThree(s => s.invalidate), m = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: .8, depthWrite: false}), []);
  useFrame(() => {const u = (performance.now() - born) / 380; g.current.scale.setScalar(.4 + 1.4 * u); m.opacity = Math.max(0, .8 * (1 - u)); g.current.visible = u < 1; if (u < 1) invalidate();});
  return <mesh ref={g} position={[at.x, at.y + .03, at.z]} rotation={[-Math.PI / 2, 0, 0]} material={m}><torusGeometry args={[.07, .008, 6, 24]}/></mesh>;
}
export function PlaceStep({d, layer, enough, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate);
  const {top, at} = useMemo(() => topIn(d), []), seen = useRef(enough);
  // Dragging: sprinkles every little way; a shell border spaced so that the
  // usual number of shells goes once round.
  const drag = layer === 'sprinkles' || (layer === 'cream' && d.cream === 'shell'), gap = layer === 'sprinkles' ? .22 * top.R / .66 : TAU * top.R * .85 / enoughFor(d, 'cream');
  const [marks, setMarks] = useState([]), [pops, setPops] = useState([]);
  const tool = useRef(), st = useRef({down: false, last: null, squeeze: 0, done: 0, told: false, marks: [], tip: at.clone().add(new THREE.Vector3(.4, 0, .3))});
  const option = layer === 'cream' ? d.cream : layer === 'fruit' ? d.fruit : 'any';
  useEffect(() => {onHint(WORDS[layer][option]);}, []);
  const finish = () => {const s = st.current; if (s.done) return; s.done = performance.now(); buzz(16); onHint(s.marks.length ? WORDS[layer].done : WORDS[layer].skip); invalidate();};
  useEffect(() => {if (enough !== seen.current) {seen.current = enough; finish();}}, [enough]);
  const put = p => {
    const s = st.current; let mark = markAt(p, top);
    if (layer === 'cream' && d.cream === 'swirl') mark = [mark[0], Math.min(mark[1], 4)];
    const list = addMark(s.marks, mark, layer);
    if (list === s.marks) {if (list.length >= HAND_MAX[layer] && !s.full) {s.full = true; onHint(WORDS[layer].full);} return;}
    s.marks = list; s.squeeze = performance.now(); s.last = p.clone(); buzz(6);
    setMarks(list); setPops(q => [...q.slice(-5), {at: markPoint(mark, top), born: performance.now()}]);
  };
  const onDown = e => {const s = st.current; if (s.done) return; e.stopPropagation(); e.target?.setPointerCapture?.(e.pointerId); s.down = true; s.tip.copy(e.point); put(e.point); invalidate();};
  const onMove = e => {
    const s = st.current; s.tip.copy(e.point); if (s.done) return;
    if (s.down && drag && s.last && s.last.distanceTo(e.point) >= gap) put(e.point);
    invalidate();
  };
  const onUp = e => {st.current.down = false; e?.target?.releasePointerCapture?.(e.pointerId);};
  useFrame(() => {
    const s = st.current, g = tool.current;
    if (g) {
      const lift = s.done ? easeIn((performance.now() - s.done) / 600) * 1.4 : 0, q = Math.min(1, (performance.now() - s.squeeze) / 250);
      g.position.set(s.tip.x, at.y + (layer === 'sprinkles' ? .55 : .1) + lift + (s.down ? 0 : .06), s.tip.z);
      g.scale.set(1 + .14 * Math.sin(q * Math.PI), 1 - .1 * Math.sin(q * Math.PI), 1 + .14 * Math.sin(q * Math.PI));
      if (layer === 'sprinkles') g.rotation.z = s.down ? Math.sin(performance.now() / 70) * .25 : 0;
      if (q < 1 || s.down) invalidate();
    }
    if (s.done) {if (performance.now() - s.done > (s.marks.length ? 700 : 300)) {if (!s.told) {s.told = true; onDone(s.marks);} return;} invalidate();}
  });
  const item = useMemo(() => ({...d, hand: {...(d.hand || {}), ...(marks.length ? {[layer]: marks} : {})}}), [marks]);
  const show = {cream: layer === 'cream' ? marks.length > 0 : true, fruit: layer === 'fruit' ? marks.length > 0 : layer === 'sprinkles', sprinkles: layer === 'sprinkles' && marks.length > 0};
  const cream = ROLES[d.c.cream]?.color, shaker = ROLES[d.c.sprinkles]?.color;
  return <group>
    <OnTurntable d={item} show={show}/>
    {pops.map(p => <Pop key={p.born} at={p.at} born={p.born}/>)}
    {layer !== 'fruit' && <group ref={tool}>{layer === 'cream' ? <PipingBag cream={cream}/> : <Shaker color={shaker}/>}</group>}
    <Catch at={at} onDown={onDown} onMove={onMove} onUp={onUp}/>
  </group>;
}
