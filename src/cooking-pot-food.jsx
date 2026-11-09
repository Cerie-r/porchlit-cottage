import React,{useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {toolMaterial} from './dessert-tools.jsx';
import {ease,easeOut} from './dessert-motion.js';
import {lookOf,DishModel,DishPortion,Chopsticks,Cooked,Scallion,PIECES,FOOD_SEEDS} from './cooking-tools.jsx';
import {normalizeDish,methodOf,heatOf} from './cooking-recipe.js';
import {TeaEgg,ExtraBits} from './cooking-pantry-food.jsx';

// What the little pot holds, and what a dish from it is served in (src/cooking-recipe.js, method 'pot'): water
// coming to the boil and the soup or porridge it becomes, with what went in floating in it; the rice before it
// goes in; the jug, the ladle, the bowl and the spoon. The same soft plastic as the rest of the counter
// (src/cooking-tools.jsx). Pot things are in the pot's own frame, the way the pot itself is drawn: its floor a
// little above 0, its lip at .6, a little under .65 across inside.

const TAU = Math.PI * 2;
const cache = new Map();
const cached = (key, make) => {if (!cache.has(key)) cache.set(key, make()); return cache.get(key);};
const lathe = (points, segments = 40) => cached(`pl:${segments}:${JSON.stringify(points)}`, () => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(.0005, r), y)), segments));
const mat = toolMaterial;
const clear = (color, opacity) => cached(`pc:${color}:${opacity}`, () => new THREE.MeshStandardMaterial({color, transparent: true, opacity, roughness: .08, metalness: .05, depthWrite: false}));
const hash = (...n) => {const s = Math.sin(n.reduce((a, v, i) => a + v * [12.9898, 78.233, 37.719, 4.581][i % 4], 0)) * 43758.5453; return s - Math.floor(s);};
const clamp01 = u => Math.min(1, Math.max(0, u));

// The inside of the pot: how far out the surface reaches, the floor, how high it is filled with water, the lip.
export const POT_R = .62, POT_FLOOR = .06, POT_FULL = .44, POT_LIP = .6;

// ---- what is in it ----
// The colour of it: clear water at first, then (k up to 1, as it cooks) the soup or the porridge it is becoming.
const WATER = new THREE.Color('#d3e8ec');
export function brothOf(items = [], k = 1) {
  const has = id => items.includes(id);
  const done = has('rice') ? (has('pumpkin') ? '#f0c04f' : has('tomato') ? '#efb08a' : has('taro') ? '#ece2ea' : has('tea') ? '#e9dcc0' : has('greens') ? '#e9ecd0' : has('wheat') ? '#f1e8d2' : '#f6f1e4')
    : has('tomato') ? '#e57a4c' : has('pumpkin') ? '#efb24a' : has('tea') ? '#b88a56' : has('taro') ? '#e6dce4' : has('wheat') ? '#ecdfbd' : has('greens') ? '#dfe0a6' : has('bamboo') ? '#ebe2b6' : has('pea') ? '#e2e3ad' : has('egg') ? '#efe2ab' : '#d3e8ec';
  return '#' + WATER.clone().lerp(new THREE.Color(done), clamp01(k)).getHexString();
}
function Surface({r, color, opacity = 1}) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({roughness: .1, metalness: .05, transparent: true}), []);
  m.color.set(color); m.opacity = opacity; m.depthWrite = opacity >= 1;
  return <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[r, r, 1]} material={m} receiveShadow><circleGeometry args={[1, 40]}/></mesh>;
}
// Wisps of egg drawn out on the surface, each a little chain of soft flakes along a curl; set: how far they have
// come out of the pour.
export function Ribbons({n = 10, r = .45, seed = 4, set = 1}) {
  const flakes = useMemo(() => Array.from({length: n}, (_, i) => {
    const a = hash(i, seed) * TAU, d = r * .8 * Math.sqrt(hash(i, seed, 2)), bend = (hash(i, seed, 3) - .5) * 1.4, len = 5 + Math.floor(hash(i, seed, 13) * 4);
    let x = Math.cos(a) * d, z = Math.sin(a) * d, dir = hash(i, seed, 4) * TAU;
    const out = [];
    for (let k = 0; k < len; k++) {
      const far = Math.hypot(x, z), pull = far > r * .92 ? r * .92 / far : 1;
      out.push([x * pull, z * pull, dir, 1 - k * .07]);
      x += Math.cos(dir) * .04; z += Math.sin(dir) * .04; dir += bend * .4;
    }
    return out;
  }).flat(), [n, r, seed]);
  const grow = Math.max(.15, set);
  return <group>{flakes.map(([x, z, dir, s], i) => <mesh key={i} position={[x, .01, z]} rotation={[0, -dir, 0]} scale={[.045 * s * grow, .011, .026 * s * grow]} material={mat('#f7dc72', {rough: .45})}><sphereGeometry args={[1, 8, 6]}/></mesh>)}</group>;
}
// Grains of rice, lying every which way.
export function Grains({n = 30, r = .4, seed = 1, y = .01, color = '#fbf8ef'}) {
  return <group>{Array.from({length: n}, (_, i) => {
    const a = hash(i, seed, 5) * TAU, d = r * Math.sqrt(hash(i, seed, 6));
    return <mesh key={i} position={[Math.cos(a) * d, y + hash(i, seed, 12) * .012, Math.sin(a) * d]} rotation={[0, hash(i, seed, 7) * TAU, Math.PI / 2]} material={mat(color, {rough: .35})}><capsuleGeometry args={[.016, .03, 3, 6]}/></mesh>;
  })}</group>;
}
// A surface of r with what is in it: the broth or porridge, the pieces floating half under, egg in wisps, spring
// onion on top. cooked: how far along it is (the colour); spin: how far it has been stirred round.
export function Brew({items = [], extras = [], heat = 'just', r = POT_R, cooked = 1, spin = 0, size = 1, eggSet = 1}) {
  const rice = items.includes('rice'), list = items.filter(id => PIECES[id] && id !== 'egg');
  return <group rotation={[0, spin, 0]}>
    <Surface r={r} color={brothOf(items, cooked)} opacity={rice ? .72 + .28 * cooked : .55 + .35 * cooked}/>
    {rice && <Grains n={Math.round(46 * size)} r={r * .85} seed={2} y={.004} color={cooked > .5 ? '#fffcf3' : '#f6f1e4'}/>}
    {/* Noodles heap up out of it; everything else floats half under. */}
    {list.map((id, i) => <group key={id} position={[0, id === 'wheat' ? .005 : -.03, 0]} scale={.72 * size}><Cooked id={id} heat={heat} n={id === 'wheat' ? 14 : Math.max(3, Math.round(PIECES[id] * .45))} spread={r * (id === 'wheat' ? .6 : .75) / (.72 * size)} seed={FOOD_SEEDS[id] + 20 + i} soft={1}/></group>)}
    {items.includes('egg') && (items.includes('tea') ? <TeaEggs k={cooked} size={size}/> : <Ribbons n={9} r={r * .78} seed={4} set={eggSet}/>)}
    {extras.includes('scallion') && <group position={[0, -.012, 0]} scale={size}><Scallion/></group>}
    <ExtraBits extras={extras} spread={r * .62}/>
  </group>;
}

// Two eggs boiling whole with the tea, half under, taking on its colour.
function TeaEggs({k = 1, size = 1}) {
  return <group scale={size}>{[[-.17, .06, .6], [.16, -.07, -.4]].map(([x, z, r], i) => <group key={i} position={[x, -.04, z]} rotation={[Math.PI / 2 - .2, 0, r]}><TeaEgg k={k}/></group>)}</group>;
}

// ---- the pot at work ----
// Bubbles coming up and popping all over the surface, more and bigger as it comes to the boil (strength 0 to 1).
export function Bubbles({r = POT_R, strength = 1, n = 18, seed = 1}) {
  const g = useRef(), invalidate = useThree(s => s.invalidate);
  const spots = useMemo(() => Array.from({length: n}, (_, i) => ({a: hash(i, seed, 8) * TAU, d: r * .9 * Math.sqrt(hash(i, seed, 9)), ph: hash(i, seed, 10), size: .03 + hash(i, seed, 11) * .035})), [n, r, seed]);
  useFrame(state => {
    if (!g.current) return;
    const t = state.clock.elapsedTime;
    g.current.children.forEach((m, i) => {const s = spots[i], u = (t * (.8 + 1.4 * strength) + s.ph) % 1; m.visible = i < n * strength; m.scale.setScalar(Math.max(.001, s.size * (.5 + .5 * strength) * Math.sin(u * Math.PI))); m.position.set(Math.cos(s.a) * s.d, .004, Math.sin(s.a) * s.d);});
    if (strength > 0) invalidate();
  });
  return <group ref={g} visible={strength > 0}>{spots.map((s, i) => <mesh key={i} material={clear('#ffffff', .75)}><sphereGeometry args={[1, 8, 6]}/></mesh>)}</group>;
}
// Steam rising off it.
export function Steam({level = 1, r = .35}) {
  const g = useRef(), mats = useMemo(() => Array.from({length: 6}, () => new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, roughness: 1})), []);
  useFrame(state => {
    if (!g.current) return;
    g.current.children.forEach((m, i) => {const ph = (state.clock.elapsedTime * .45 + i / 6) % 1; m.position.set(Math.sin(ph * 3 + i * 2) * r, .1 + ph * 1.3, Math.cos(i * 2.3) * r * .6); m.scale.setScalar(.5 + ph * 1.5); mats[i].opacity = .32 * (1 - ph) * clamp01(level);});
  });
  return <group ref={g} visible={level > 0}>{mats.map((m, i) => <mesh key={i} material={m}><sphereGeometry args={[.13, 12, 8]}/></mesh>)}</group>;
}
// Boiling over: froth climbs out over the lip, runs a little way down the outside and sinks back, under two
// seconds. What it leaves on the outside of the pot is the stain.
const FOAM_RUNS = [[.4, .22], [1.5, .3], [2.6, .18], [3.7, .26], [5.0, .2]];
// The froth itself: lumps crowding round the rim, a few heaped over it, a few in the middle.
const FROTH = Array.from({length: 22}, (_, i) => {
  const a = i / 22 * TAU + hash(i, 21) * .3, d = i % 4 === 0 ? .2 + hash(i, 22) * .25 : .5 + hash(i, 23) * .2;
  return [Math.cos(a) * d, Math.sin(a) * d, .1 + hash(i, 24) * .08];
});
const foamMat = () => cached('foam', () => new THREE.MeshStandardMaterial({color: '#fffdf6', roughness: .6, transparent: true, opacity: .92}));
const stainMat = () => cached('foam-stain', () => new THREE.MeshStandardMaterial({color: '#fbf3e2', roughness: .7, transparent: true, opacity: .7, polygonOffset: true, polygonOffsetFactor: -2}));
export function Foam({start}) {
  const g = useRef(), runs = useRef([]), invalidate = useThree(s => s.invalidate);
  useFrame(() => {
    const t = (performance.now() - start) / 1000, up = easeOut(clamp01(t / .35)) * (1 - ease(clamp01((t - 1.1) / .6)));
    if (g.current) {g.current.visible = up > .01; g.current.position.y = POT_FULL + (POT_LIP + .05 - POT_FULL) * up; g.current.scale.set(1, .4 + .6 * up, 1);}
    FOAM_RUNS.forEach(([a, len], i) => {
      const m = runs.current[i]; if (!m) return;
      const u = easeOut(clamp01((t - .25 - i * .06) / .5)) * (1 - ease(clamp01((t - 1.2) / .6)));
      m.visible = u > .01; m.scale.set(1, Math.max(.001, len * u), 1); m.position.set(Math.cos(a) * .715, POT_LIP + .02 - len * u / 2, Math.sin(a) * .715);
    });
    if (t < 2) invalidate();
  });
  return <group>
    <group ref={g} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={foamMat()}><circleGeometry args={[POT_R, 36]}/></mesh>
      {FROTH.map(([x, z, r], i) => <mesh key={i} position={[x, .02, z]} scale={[r, r * .62, r]} material={foamMat()}><sphereGeometry args={[1, 10, 8]}/></mesh>)}
    </group>
    {FOAM_RUNS.map(([a], i) => <mesh key={i} ref={el => {runs.current[i] = el;}} visible={false} material={foamMat()}><capsuleGeometry args={[.035, 1, 3, 8]}/></mesh>)}
  </group>;
}
export function FoamStain() {
  return <group>{FOAM_RUNS.map(([a, len], i) => <mesh key={i} position={[Math.cos(a) * .705, POT_LIP - len * .3, Math.sin(a) * .705]} scale={[1, len * .55, 1]} material={stainMat()}><capsuleGeometry args={[.022, 1, 3, 6]}/></mesh>)}</group>;
}

// ---- what is used at the pot ----
// The ladle: its cup at the origin, the handle going up and back. full: how full the cup is, and of what colour.
export function Ladle({look, full = 0, color = '#e57a4c'}) {
  const L = lookOf(look);
  return <group>
    <mesh geometry={lathe([[0, 0], [.12, .005], [.17, .04], [.19, .09], [.185, .1], [.165, .06], [.11, .03], [0, .025]], 24)} material={mat('#e7e0d6', {rough: .3, metal: .4, side: THREE.DoubleSide})} castShadow/>
    {full > 0 && <mesh position={[0, .035 + .05 * full, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={.11 + .06 * full} material={mat(color, {rough: .15})}><circleGeometry args={[1, 20]}/></mesh>}
    <mesh position={[0, .52, -.19]} rotation={[-.36, 0, 0]} material={mat(L.grip, {rough: .5})} castShadow><cylinderGeometry args={[.024, .03, 1.0, 10]}/></mesh>
  </group>;
}
// A glass jug of water: the spout to the left, the handle to the right. water: how full it is.
export function Jug({water = 1}) {
  return <group>
    <mesh geometry={lathe([[0, 0], [.26, 0], [.29, .03], [.3, .36], [.27, .56], [.24, .64], [.255, .68], [.235, .69], [.22, .64], [.25, .56], [.28, .36], [.27, .05], [0, .04]], 28)} material={clear('#eef6f7', .45)}/>
    {water > .02 && <mesh position={[0, .05 + .24 * water, 0]} material={clear('#bfdde4', .7)}><cylinderGeometry args={[.255, .26, .48 * water, 24]}/></mesh>}
    <mesh position={[.33, .38, 0]} rotation={[0, 0, -Math.PI / 2]} material={clear('#eef6f7', .6)}><torusGeometry args={[.14, .03, 8, 16, Math.PI]}/></mesh>
    <mesh position={[-.27, .64, 0]} rotation={[0, 0, Math.PI / 2 + .5]} material={clear('#eef6f7', .55)}><coneGeometry args={[.07, .16, 12, 1, true]}/></mesh>
  </group>;
}
// Rice in a little bowl, the way it comes out of the jar; rinsed, it is whiter.
const RICE_BOWL = [[0, 0], [.2, 0], [.24, .03], [.33, .15], [.36, .24], [.34, .245], [.31, .16], [.22, .06], [0, .05]];
export function RiceBowl({washed = false, empty = false}) {
  const grain = washed ? '#fffdf7' : '#f2ecdc';
  return <group>
    <mesh geometry={lathe(RICE_BOWL, 32)} material={mat('#fbf7f0', {rough: .3, side: THREE.DoubleSide})} castShadow receiveShadow/>
    {!empty && <RiceHeap color={grain}/>}
  </group>;
}
// A heap of rice on its own: in its bowl, and on its way into the pot.
export function RiceHeap({color = '#fffdf7'}) {
  return <group>
    <mesh position={[0, .11, 0]} scale={[.28, .1, .28]} material={mat(color, {rough: .45})}><sphereGeometry args={[1, 20, 10, 0, TAU, 0, Math.PI / 2]}/></mesh>
    <group position={[0, .17, 0]}><Grains n={16} r={.18} seed={3} y={0} color={color}/></group>
  </group>;
}

// ---- served ----
// A bowl in the plate's porcelain, a gold band under the rim; and how far out its inside is at a height.
const BOWL = [[0, 0], [.3, 0], [.32, .03], [.46, .1], [.62, .26], [.72, .44], [.75, .52], [.72, .53], [.69, .48], [.6, .3], [.45, .15], [.3, .09], [0, .08]];
const BOWL_IN = [[.3, .09], [.45, .15], [.6, .3], [.69, .48]];
export function bowlInsideAt(y) {
  for (let i = 1; i < BOWL_IN.length; i++) {const [r0, y0] = BOWL_IN[i - 1], [r1, y1] = BOWL_IN[i]; if (y <= y1) return r0 + (r1 - r0) * clamp01((y - y0) / (y1 - y0));}
  return BOWL_IN.at(-1)[0];
}
export function SoupBowl({look}) {
  const L = lookOf(look);
  return <group>
    <mesh geometry={lathe(BOWL, 48)} material={mat(L.plate, {rough: .25, side: THREE.DoubleSide})} castShadow receiveShadow/>
    <mesh position={[0, .47, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(L.plateBand, {rough: .3, metal: .3})}><torusGeometry args={[.733, .01, 6, 48]}/></mesh>
  </group>;
}
// What is in the bowl: left, how much is still there (1 full).
export function BowlFood({items = [], extras = [], heat = 'just', left = 1}) {
  const y = .14 + .3 * clamp01(left), r = bowlInsideAt(y) - .012;
  return <group position={[0, y, 0]}><Brew items={items} extras={extras} heat={heat} r={r} size={.8}/></group>;
}
const itemsOf = item => Array.isArray(item?.items) ? item.items : ['tomato', 'egg'];
// A dish from the pot, in its bowl, sized like a dish on its plate (src/cooking-tools.jsx, DishModel).
const BOWL_SIZE = 1.55;
export function BowlDish({item, look = 'cream', fill, fit, onClick, left = 1}) {
  const s = fill ? fill / BOWL_SIZE : fit ? fit / 2 / BOWL_SIZE : 1;
  return <group scale={s} position={[0, fill ? -.45 * s : 0, 0]} onClick={onClick}>
    <SoupBowl look={look}/>
    {left > 0 && <BowlFood items={itemsOf(item)} extras={item?.extras || []} heat={heatOf(item)} left={left}/>}
  </group>;
}
// A helping, ladled into a little bowl for one of the two.
export function BowlPortion({item}) {
  return <group scale={.16}><SoupBowl/><BowlFood items={itemsOf(item)} extras={item?.extras || []} heat={heatOf(item)} left={.8}/></group>;
}
// A porcelain spoon lying down, its bowl at the origin and the handle along +z, like the chopsticks.
export function SoupSpoon({color = '#fbf7f0'}) {
  return <group>
    <mesh position={[0, .03, .05]} scale={[.075, .032, .1]} material={mat(color, {rough: .25, side: THREE.DoubleSide})} castShadow><sphereGeometry args={[1, 16, 8, 0, TAU, Math.PI / 2, Math.PI / 2]}/></mesh>
    <mesh position={[0, .07, .36]} rotation={[Math.PI / 2 - .18, 0, 0]} scale={[1, 1, .55]} material={mat(color, {rough: .25})} castShadow><cylinderGeometry args={[.022, .03, .46, 10]}/></mesh>
  </group>;
}

// ---- either way ----
// What every place that shows a dish draws: from the pot, a bowl (and a spoon to eat it with); from the wok, a plate
// (and chopsticks).
export function ServedDish(props) {
  return methodOf(props.item) === 'pot' ? <BowlDish {...props} item={normalizeDish(props.item)}/> : <DishModel {...props}/>;
}
export function ServedPortion({item}) {
  return methodOf(item) === 'pot' ? <BowlPortion item={item}/> : <DishPortion item={item}/>;
}
export function DishUtensil({item}) {
  return methodOf(item) === 'pot' ? <SoupSpoon/> : <Chopsticks/>;
}
