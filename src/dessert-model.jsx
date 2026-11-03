import React,{useMemo} from 'react';
import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {ROLES} from './brick-recipe.js';
import {normalizeDessert,handOf,burstOf} from './dessert-recipe.js';

// Desserts drawn from their recipe, in the house's soft plastic: the plate is
// about one unit across the middle, so a dessert sits on a table at the size
// the room gives creations. A cake, a tart or a pudding is four slices, a plate
// of macarons four macarons and a pile of cream puffs four puffs; any of the
// four can be left out, which is how a dessert gets eaten (see dessert-dining.jsx).

const TAU = Math.PI * 2, QUARTER = Math.PI / 2;
const cache = new Map();
const cached = (key, make) => {if (!cache.has(key)) cache.set(key, make()); return cache.get(key);};
const hex = role => ROLES[role]?.color || ROLES.cream.color;

// A colour role in the house's plastic: soft, a little sheen. A body baked
// pale or deep is the same role, lightened or browned; a deep bake browns the
// crust more than the crumb, which shows where a slice is cut.
const BAKE_TINT = {light: ['#fffaf0', .32, .32], deep: ['#6b3f26', .3, .08], burnt: ['#2a1a12', .62, .2]};
// shaded takes the light and dark painted on the shape itself (a cream puff's
// brown tops and pale cracks) over the role's colour.
export function roleMaterial(role, {rough = .44, metal = .02, twoSided = false, bake, crumb = false, shaded = false} = {}) {
  const tint = BAKE_TINT[bake];
  return cached(`mat:${role}:${rough}:${metal}:${twoSided}:${tint ? bake + (crumb ? ':crumb' : '') : ''}:${shaded}`, () => {
    const color = new THREE.Color(hex(role));
    if (tint) color.lerp(new THREE.Color(tint[0]), crumb ? tint[2] : tint[1]);
    return new THREE.MeshStandardMaterial({color, roughness: rough, metalness: metal, side: twoSided ? THREE.DoubleSide : THREE.FrontSide, vertexColors: shaded});
  });
}
const fixedMaterial = (color, rough = .4, metal = .02) => cached(`fixed:${color}:${rough}:${metal}`, () => new THREE.MeshStandardMaterial({color, roughness: rough, metalness: metal}));

// A band turned round the middle, with softened edges, from y0 to y0 + h.
const band = (r, y0, h, e = .03) => [[0, y0], [r - e, y0], [r, y0 + e], [r, y0 + h - e], [r - e, y0 + h], [0, y0 + h]];
const latheGeometry = (points, phiStart, phiLength) => cached(`lathe:${JSON.stringify(points)}:${phiStart.toFixed(4)}:${phiLength.toFixed(4)}`, () => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(.0005, r), y)), Math.max(6, Math.round(48 * phiLength / TAU)), phiStart, phiLength));
const faceGeometry = points => cached(`face:${JSON.stringify(points)}`, () => new THREE.ShapeGeometry(new THREE.Shape(points.map(([r, y]) => new THREE.Vector2(r, y)))));

// A turned body, whole or cut: the cut faces show what's inside (the layers of
// a cake, the shell of a tart). phi runs as three's lathe does.
function Turned({points, phiStart = 0, phiLength = TAU, role, material, bake}) {
  const m = material || roleMaterial(role, {bake}), inside = material || roleMaterial(role, {twoSided: true, bake, crumb: true});
  const cut = phiLength < TAU - 1e-6;
  return <group>
    <mesh geometry={latheGeometry(points, phiStart, phiLength)} material={m} castShadow receiveShadow/>
    {cut && [phiStart, phiStart + phiLength].map((phi, i) => <mesh key={i} geometry={faceGeometry(points)} material={inside} rotation={[0, phi - Math.PI / 2, 0]} castShadow/>)}
  </group>;
}
// The quarters present, as runs going round: [1, 2, 3] is one piece from a
// quarter of the way round to the whole way.
function runsOf(quarters) {
  const has = [0, 1, 2, 3].map(q => quarters.includes(q));
  if (has.every(Boolean)) return [[0, 4]];
  const runs = [];
  for (let q = 0; q < 4; q++) if (has[q] && !has[(q + 3) % 4]) {let n = 0; while (n < 4 && has[(q + n) % 4]) n++; runs.push([q, n]);}
  return runs;
}
function TurnedQuarters({points, quarters, role, material, bake}) {
  return <>{runsOf(quarters).map(([q, n]) => <Turned key={q} points={points} phiStart={q * QUARTER} phiLength={n * QUARTER} role={role} material={material} bake={bake}/>)}</>;
}
// Which slice a thing at this angle belongs to.
const quarterAt = phi => Math.floor((((phi % TAU) + TAU) % TAU) / QUARTER) % 4;
const at = (r, phi, y) => [Math.sin(phi) * r, y, Math.cos(phi) * r];

// ---- the plates ----
const PLATES = {
  round: {top: .07, points: [[0, 0], [.84, 0], [.92, .02], [.99, .07], [1.02, .11], [.97, .12], [.86, .075], [0, .07]]},
  lace: {top: .07, points: [[0, 0], [.8, 0], [.88, .02], [.93, .07], [.95, .1], [.9, .11], [.82, .075], [0, .07]]},
  saucer: {top: .06, points: [[0, 0], [.62, 0], [.7, .02], [.8, .07], [.84, .1], [.79, .11], [.66, .065], [0, .06]]},
  stand: {top: .58, points: [[0, 0], [.5, 0], [.52, .04], [.42, .07], [.16, .12], [.11, .2], [.1, .38], [.14, .45], [.22, .48], [.9, .5], [.96, .55], [.9, .59], [0, .58]]}
};
export const plateTop = kind => (PLATES[kind] || PLATES.round).top;
function Plate({kind, role}) {
  const p = PLATES[kind] || PLATES.round;
  return <group>
    <Turned points={p.points} role={role}/>
    {kind === 'lace' && Array.from({length: 22}, (_, i) => {const a = i * TAU / 22; return <mesh key={i} position={at(.955, a, .095)} rotation={[0, a, 0]} scale={[.075, .03, .05]} material={roleMaterial(role)} castShadow><sphereGeometry args={[1, 10, 6]}/></mesh>;})}
    {kind === 'saucer' && <mesh position={[0, .066, 0]} rotation={[-Math.PI / 2, 0, 0]} material={roleMaterial('gold', {rough: .3, metal: .4})}><torusGeometry args={[.5, .008, 6, 48]}/></mesh>}
    {kind === 'stand' && <mesh position={[0, .585, 0]} rotation={[-Math.PI / 2, 0, 0]} material={roleMaterial('gold', {rough: .3, metal: .4})}><torusGeometry args={[.74, .007, 6, 56]}/></mesh>}
  </group>;
}

// ---- what each kind of dessert is, standing on y = 0 ----
// top: where toppings sit; ring: how far out a ring of piping goes; small: how
// small the piping is drawn on it.
const SHAPES = {
  cake: {top: .52, ring: .53, inner: .3, small: 1, decoR: .66},
  tart: {top: .2, ring: .48, inner: .27, small: .9, decoR: .6},
  pudding: {top: .54, ring: .25, inner: 0, small: .7, decoR: .36},
  macaron: {top: 0, ring: .2, inner: 0, small: .55, decoR: .26},
  puff: {top: 0, ring: .12, inner: 0, small: .5, decoR: .2}
};
const caramelOf = body => body === 'wood' ? 'ink' : 'wood';

// frost is how far the cream has gone on, 0 to 1, while it is being made by
// hand: a cake fresh from the tin is one plain sponge, a tart shell is empty,
// a pudding has no caramel yet and the macaron shells are still apart.
function CakeBody({d, quarters, frost = 1}) {
  if (frost <= 0) return <TurnedQuarters points={band(.68, 0, .465)} quarters={quarters} role={d.c.body} bake={d.bake}/>;
  const spread = .25 + .75 * Math.min(1, frost);
  return <group>
    <TurnedQuarters points={band(.68, 0, .2)} quarters={quarters} role={d.c.body} bake={d.bake}/>
    <TurnedQuarters points={band(.655, .2, .065, .015)} quarters={quarters} role={d.c.cream}/>
    <TurnedQuarters points={band(.68, .265, .2)} quarters={quarters} role={d.c.body} bake={d.bake}/>
    <group position={[0, .46, 0]} scale={[spread, Math.max(.2, Math.min(1, frost)), spread]}><TurnedQuarters points={[[0, 0], [.67, 0], [.695, .02], [.69, .045], [.66, .065], [0, .065]]} quarters={quarters} role={d.c.cream}/></group>
  </group>;
}
const TART_SHELL = [[0, 0], [.6, 0], [.69, .035], [.72, .19], [.7, .235], [.655, .235], [.62, .08], [0, .075]];
function TartBody({d, quarters, frost = 1}) {
  return <group>
    <TurnedQuarters points={TART_SHELL} quarters={quarters} role={d.c.body} bake={d.bake}/>
    {frost > 0 && <group position={[0, .07, 0]} scale={[1, Math.min(1, frost), 1]}><TurnedQuarters points={[[0, 0], [.62, .005], [.635, .09], [.6, .125], [0, .13]]} quarters={quarters} role={d.c.cream}/></group>}
    {Array.from({length: 36}, (_, i) => {const a = (i + .5) * TAU / 36; return quarters.includes(quarterAt(a)) && <mesh key={i} position={at(.7, a, .125)} material={roleMaterial(d.c.body, {bake: d.bake})} castShadow><capsuleGeometry args={[.034, .13, 3, 8]}/></mesh>;})}
  </group>;
}
const PUDDING = [[0, 0], [.55, 0], [.57, .03], [.43, .44], [.4, .47], [0, .47]];
const puddingRadius = y => .57 - .14 * Math.min(1, Math.max(0, (y - .03) / .41));
function PuddingBody({d, quarters, frost = 1}) {
  const caramel = caramelOf(d.c.body);
  return <group>
    <TurnedQuarters points={PUDDING} quarters={quarters} role={d.c.body} bake={d.bake}/>
    {/* The caramel runs down from the top as it is poured. */}
    {frost > 0 && <group position={[0, .545, 0]} scale={[1, Math.min(1, frost), 1]}><group position={[0, -.545, 0]}>
      <TurnedQuarters points={[[0, .46], [.415, .46], [.43, .475], [.41, .515], [.3, .54], [0, .545]]} quarters={quarters} role={caramel}/>
      {Array.from({length: 12}, (_, i) => {const a = (i + .3) * TAU / 12, long = .05 + ((i * 7) % 5) * .022, y = .47 - long / 2 - .02; return quarters.includes(quarterAt(a)) && <group key={i} position={at(puddingRadius(y) - .004, a, y)} rotation={[0, a, 0]}><mesh rotation={[-.33, 0, 0]} scale={[1.25, 1, .8]} material={roleMaterial(caramel)}><capsuleGeometry args={[.03, long, 4, 8]}/></mesh></group>;})}
    </group></group>}
  </group>;
}
// One macaron: two domed shells with a ruffled foot, the filling between.
const SHELL = [[0, 0], [.27, 0], [.31, .02], [.315, .045], [.29, .08], [.2, .115], [0, .13]];
function Macaron({d, frost = 1}) {
  return <group>
    <group position={[0, .13, 0]} rotation={[Math.PI, 0, 0]}><Turned points={SHELL} role={d.c.body} bake={d.bake}/></group>
    <mesh position={[0, .022, 0]} rotation={[-Math.PI / 2, 0, 0]} material={roleMaterial(d.c.body, {bake: d.bake})}><torusGeometry args={[.3, .022, 6, 28]}/></mesh>
    {frost > 0 && <mesh position={[0, .165, 0]} scale={[Math.min(1, .3 + .7 * frost), Math.min(1, frost), Math.min(1, .3 + .7 * frost)]} material={roleMaterial(d.c.cream)} castShadow><cylinderGeometry args={[.27, .27, .07, 28]}/></mesh>}
    <group position={[0, .2, 0]}><Turned points={SHELL} role={d.c.body} bake={d.bake}/></group>
    <mesh position={[0, .222, 0]} rotation={[-Math.PI / 2, 0, 0]} material={roleMaterial(d.c.body, {bake: d.bake})}><torusGeometry args={[.3, .022, 6, 28]}/></mesh>
  </group>;
}
// Where the four macarons go: two leaning in front, two stacked behind. The
// top of the stack carries the toppings.
const MACARONS = [
  {p: [-.3, .31, .36], r: [Math.PI / 2 - .3, .35, 0]},
  {p: [.31, .31, .3], r: [Math.PI / 2 - .3, -.4, 0]},
  {p: [.02, .33, -.18], r: [0, .4, 0], top: true},
  {p: [0, 0, -.2], r: [0, 0, 0]}
];
export const MACARON_TOP = .33 + .33;

// A cream puff: a round bun of choux, nearly as tall as it is wide, flat
// underneath, its top split into a few big lobes the way choux cracks as it
// puffs up, browner on the tops of the lobes and paler in the cracks and low
// down. It is filled through a little hole in its top: fill goes from 0
// (empty) to 1 (full), and a bit more makes it plumper still; burst is a puff
// filled till the cream came out of the hole and ran down its side. hole is
// how far out from its middle the hole is, towards +z; lobes and twist make
// each puff in a pile a little different.
const PUFF = [[0, 0], [.17, 0], [.235, .03], [.272, .1], [.285, .19], [.275, .27], [.24, .34], [.18, .395], [.1, .43], [0, .44]];
export const PUFF_HEIGHT = .44;
export const puffY = r => {for (let i = PUFF.length - 1; i > 4; i--) {const [r0, y0] = PUFF[i], [r1, y1] = PUFF[i - 1]; if (r <= r1) return y0 + (y1 - y0) * (r - r0) / (r1 - r0);} return PUFF[4][1];};
const smooth = (a, b, x) => {const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u);};
const PALE = [1.08, 1.06, 1.02], DEEP = [.75, .49, .25];
export const puffShape = (lobes, twist) => puffGeometry(lobes, twist);
const puffGeometry = (lobes, twist) => cached(`puff:${lobes}:${twist}`, () => {
  const outline = new THREE.SplineCurve(PUFF.map(([r, y]) => new THREE.Vector2(Math.max(.0005, r), y))).getPoints(30);
  let g = new THREE.LatheGeometry(outline, 64);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  const pos = g.attributes.position, colors = new Float32Array(pos.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const h = Math.min(1, Math.max(0, v.y / PUFF_HEIGHT)), a = Math.atan2(v.x, v.z);
    // 1 on a lobe, 0 down a crack: broad bulges with narrow cracks between,
    // turning a little as they go up.
    // Lobes of different sizes: the angle is bent a little before they are laid round.
    const bent = a + twist * h + .32 * Math.sin(a * 2 + twist * 4);
    const lobe = Math.pow(Math.abs(Math.cos(bent * lobes / 2)), .45), uneven = 1 + .45 * Math.sin(a * 2 + twist * 3);
    const shoulder = smooth(.28, .62, h) * (1 - .5 * smooth(.85, 1, h)), top = smooth(.5, 1, h);
    // A fine crackle over the crust, more of it on top.
    const crackle = .009 * smooth(.2, .8, h) * Math.sin(a * 17 + h * 9 + twist * 5) * Math.sin(a * 11 - h * 14 + twist * 2);
    const k = 1 + .06 * shoulder * (lobe - .75) * uneven + .02 * smooth(.1, .5, h) * Math.sin(a * 3 + twist * 7) + crackle;
    v.x *= k; v.z *= k; v.y += .05 * top * (lobe - .72) * uneven;
    pos.setXYZ(i, v.x, v.y, v.z);
    // Brown where it rose highest, pale down the cracks where the dough opened.
    const warm = smooth(.05, .9, h) * (.15 + .85 * lobe);
    for (let c = 0; c < 3; c++) colors[i * 3 + c] = PALE[c] + (DEEP[c] - PALE[c]) * warm;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g = mergeVertices(g, 1e-4); g.computeVertexNormals();
  return g;
});
// Cream that ran over: from the hole down the side, curling a little round
// as it goes so it is seen from the side, thinner as it runs, a drop at the end.
const dripBeads = hole => cached(`drip:${hole}`, () => Array.from({length: 13}, (_, k) => {
  const u = k / 12, r = hole + (.283 - hole) * u, a = .7 * u, size = .042 - .015 * u;
  return {p: [Math.sin(a) * (r + .012), puffY(r) + size * .5, Math.cos(a) * (r + .012)], size};
}));
// Bitten while it is shared: a bite takes one side off, leaving a face of
// pale choux with teeth marks round its edge and the cream bulging out of
// the middle; the second bite goes deeper. The face looks up and to one side,
// which is towards whoever is looking once the puff is on its plate.
const BITE_SIDE = -.5, BITE_TILT = .35, BITE_MID = new THREE.Vector3(0, .21, 0), BITE_DEPTH = [null, .19, .08];
const biteNormal = new THREE.Vector3(Math.sin(BITE_SIDE) * Math.cos(BITE_TILT), Math.sin(BITE_TILT), Math.cos(BITE_SIDE) * Math.cos(BITE_TILT));
const biteU = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), biteNormal).normalize(), biteW = new THREE.Vector3().crossVectors(biteNormal, biteU);
// How far a point is past the bite: more than 0 is bitten away.
function pastBite(p, bites) {
  const rel = new THREE.Vector3(...p).sub(BITE_MID), a = Math.atan2(rel.dot(biteW), rel.dot(biteU));
  return rel.dot(biteNormal) - (BITE_DEPTH[Math.min(2, bites)] + .026 * Math.cos(a * 5 + .4));
}
const INSIDE = [1.13, 1.11, 1.05];
const bittenPuffGeometry = (lobes, twist, bites) => cached(`puff:${lobes}:${twist}:bite${bites}`, () => {
  const g = puffGeometry(lobes, twist).clone(), pos = g.attributes.position, color = g.attributes.color, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const over = pastBite(v.toArray(), bites);
    if (over > 0) {v.addScaledVector(biteNormal, -over); pos.setXYZ(i, v.x, v.y, v.z); color.setXYZ(i, ...INSIDE);}
  }
  g.computeVertexNormals();
  return g;
});
// The cream in the bite: a soft mound on the face, smaller than the face.
const biteCream = bites => cached(`puffcream:${bites}`, () => {
  const depth = BITE_DEPTH[Math.min(2, bites)], r = .6 * Math.sqrt(Math.max(0, .27 * .27 - depth * depth));
  return {r, at: BITE_MID.clone().addScaledVector(biteNormal, depth + .004).toArray(), turn: new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), biteNormal)).toArray().slice(0, 3)};
});
function Puff({d, fill = 1, burst = false, hole = 0, lobes = 5, twist = 0, bites = 0}) {
  const f = Math.min(1.5, Math.max(0, fill)), full = Math.min(1, f), shell = roleMaterial(d.c.body, {bake: d.bake, shaded: true, rough: .38}), cream = roleMaterial(d.c.cream, {rough: .5});
  const hy = puffY(hole), shown = p => !bites || pastBite(p, bites) < -.07, bite = bites ? biteCream(bites) : null;
  return <group scale={[1 + .06 * full + .03 * Math.max(0, f - 1), 1 + .05 * full, 1 + .06 * full + .03 * Math.max(0, f - 1)]}>
    <mesh geometry={bites ? bittenPuffGeometry(lobes, twist, bites) : puffGeometry(lobes, twist)} material={shell} castShadow receiveShadow/>
    {bite && <group position={bite.at} rotation={bite.turn}>
      {[[0, 0, 1, .85, .04], [-.38, .22, .5, .45, .045], [.36, .18, .45, .42, .04], [.05, -.3, .52, .4, .042], [.1, .12, .42, .38, .055]].map(([x, y, sx, sy, sz], k) => <mesh key={k} position={[x * bite.r, y * bite.r, k ? .012 : 0]} scale={[sx * bite.r, sy * bite.r, sz]} material={cream}><sphereGeometry args={[1, 22, 12]}/></mesh>)}
    </group>}
    {f > .15 && !burst && shown([0, hy, hole]) && <mesh position={[0, hy + .008, hole]} scale={Math.min(1, f) * .03} material={cream}><sphereGeometry args={[1, 12, 8]}/></mesh>}
    {burst && <group>
      {shown([0, hy, hole]) && <mesh position={[0, hy + .022, hole]} scale={[.066, .046, .066]} material={cream} castShadow><sphereGeometry args={[1, 14, 10]}/></mesh>}
      {dripBeads(hole).filter(({p}) => shown(p)).map(({p, size}, k) => <mesh key={k} position={p} scale={size} material={cream} castShadow={k % 2 === 0}><sphereGeometry args={[1, 10, 8]}/></mesh>)}
      {(() => {const last = dripBeads(hole).at(-1); return shown(last.p) && <mesh position={[last.p[0] * 1.02, last.p[1] - .03, last.p[2] * 1.02]} scale={[.033, .042, .033]} material={cream}><sphereGeometry args={[1, 10, 8]}/></mesh>;})()}
    </group>}
  </group>;
}
// Where the four puffs go: three round the plate and one on top of them, the
// one on top first (it carries the toppings, and goes first when it's eaten).
// The whole pile is drawn PILE times as big, so it fills its plate.
export const PILE = 1.15;
export const PUFFS = [
  {p: [0, .34, 0], a: 0, hole: 0, lobes: 5, twist: .4, top: true},
  {p: at(.27, 0, 0), a: 0, hole: .13, lobes: 6, twist: -.3},
  {p: at(.27, TAU / 3, 0), a: TAU / 3, hole: .13, lobes: 5, twist: .7},
  {p: at(.27, TAU * 2 / 3, 0), a: TAU * 2 / 3, hole: .13, lobes: 6, twist: .2}
];
export const PUFF_TOP = .34 + PUFF_HEIGHT;
// The toppings on the top puff follow its round top down from the middle.
const PuffTop = ({tops, bites = 0}) => <>{tops.map((t, j) => {const p = at(t.r, t.a, puffY(Math.min(t.r, .27)) + t.y); return !(bites && pastBite(p, bites) > -.05) && <group key={j} position={p}>{t.el}</group>;})}</>;

// ---- toppings ----
function Rosette({s = 1, role, turn = 0}) {
  const m = roleMaterial(role, {rough: .5});
  return <group scale={s} rotation={[0, turn, 0]}>
    {[[.075, .032, .03], [.055, .028, .066], [.034, .022, .097]].map(([r, t, y], i) => <mesh key={i} position={[i * .006, y, 0]} rotation={[-Math.PI / 2, 0, i * .9]} material={m} castShadow><torusGeometry args={[r, t, 7, 14]}/></mesh>)}
    <mesh position={[.01, .125, 0]} material={m}><coneGeometry args={[.026, .05, 8]}/></mesh>
  </group>;
}
function Dollop({s = 1, role}) {
  const m = roleMaterial(role, {rough: .5});
  return <group scale={s}><mesh position={[0, .03, 0]} scale={[1, .7, 1]} material={m} castShadow><sphereGeometry args={[.075, 14, 10]}/></mesh><mesh position={[0, .09, 0]} material={m}><coneGeometry args={[.05, .08, 12]}/></mesh></group>;
}
function ShellPiece({s = 1, role}) {
  const m = roleMaterial(role, {rough: .5});
  return <group scale={s}><mesh position={[0, .035, 0]} scale={[.055, .042, .09]} material={m} castShadow><sphereGeometry args={[1, 12, 8]}/></mesh><mesh position={[0, .022, -.08]} scale={[.022, .02, .05]} material={m}><sphereGeometry args={[1, 8, 6]}/></mesh></group>;
}
function Swirl({s = 1, role}) {
  const m = roleMaterial(role, {rough: .5});
  return <group scale={s}>
    {[[.19, .062, .05], [.145, .056, .13], [.1, .048, .2], [.058, .036, .26]].map(([r, t, y], i) => <mesh key={i} position={[(i % 2 ? -1 : 1) * .008, y, 0]} rotation={[-Math.PI / 2, 0, i]} material={m} castShadow><torusGeometry args={[r, t, 8, 20]}/></mesh>)}
    <mesh position={[0, .31, 0]} material={m}><coneGeometry args={[.035, .07, 10]}/></mesh>
  </group>;
}
const strawberryGeometry = () => cached('strawberry', () => new THREE.LatheGeometry([[0, 0], [.055, .008], [.078, .045], [.072, .1], [.042, .15], [0, .172]].map(([r, y]) => new THREE.Vector2(r, y)), 10));
function Strawberry({s = 1}) {
  return <group scale={s}>
    <mesh geometry={strawberryGeometry()} material={roleMaterial('rose', {rough: .38})} castShadow/>
    {Array.from({length: 5}, (_, i) => <mesh key={i} position={[Math.sin(i * 1.26) * .06, .012, Math.cos(i * 1.26) * .06]} rotation={[0, i * 1.26, 0]} scale={[.022, .01, .05]} material={roleMaterial('sage')}><sphereGeometry args={[1, 8, 6]}/></mesh>)}
    {Array.from({length: 8}, (_, i) => <mesh key={'s' + i} position={[Math.sin(i * 2.4) * (.074 - (i % 3) * .01), .05 + (i % 3) * .03, Math.cos(i * 2.4) * (.074 - (i % 3) * .01)]} material={roleMaterial('cream')}><sphereGeometry args={[.007, 5, 4]}/></mesh>)}
  </group>;
}
function Blueberry({s = 1}) {
  return <group scale={s}><mesh position={[0, .052, 0]} material={roleMaterial('ink', {rough: .5})} castShadow><sphereGeometry args={[.052, 12, 10]}/></mesh><mesh position={[0, .1, 0]} rotation={[-Math.PI / 2, 0, 0]} material={roleMaterial('mist')}><torusGeometry args={[.016, .006, 5, 10]}/></mesh></group>;
}
const cherryStem = () => cached('cherryStem', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, .12, 0), new THREE.Vector3(.02, .2, 0), new THREE.Vector3(.06, .25, .01)]), 8, .007, 5, false));
function Cherry({s = 1}) {
  const stem = cherryStem();
  return <group scale={s}><mesh position={[0, .065, 0]} material={roleMaterial('rose', {rough: .25})} castShadow><sphereGeometry args={[.068, 14, 12]}/></mesh><mesh geometry={stem} material={roleMaterial('wood')}/></group>;
}
const FRUIT = {strawberry: Strawberry, blueberry: Blueberry, cherry: Cherry};

// A little heart for the sprinkles.
const heartGeometry = () => cached('heart', () => {
  const s = new THREE.Shape(); s.moveTo(0, -.6); s.bezierCurveTo(-.2, -.35, -1, -.1, -.6, .4); s.bezierCurveTo(-.35, .7, 0, .55, 0, .3); s.bezierCurveTo(0, .55, .35, .7, .6, .4); s.bezierCurveTo(1, -.1, .2, -.35, 0, -.6);
  const g = new THREE.ExtrudeGeometry(s, {depth: .35, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 2}); g.center(); return g;
});
// Scattered the same way every time a dessert is drawn.
function scatter(n, rMax, seed) {
  let x = seed; const rand = () => (x = (x * 16807) % 2147483647) / 2147483647, out = [];
  for (let i = 0; i < n; i++) {const a = rand() * TAU, r = Math.sqrt(rand()) * rMax; out.push({a, r, turn: rand() * TAU, tilt: rand()});}
  return out;
}
function Sprinkle({kind, role, index}) {
  if (kind === 'pearls') return <mesh position={[0, .022, 0]} material={roleMaterial(role, {rough: .2, metal: .15})}><sphereGeometry args={[.024, 8, 6]}/></mesh>;
  if (kind === 'hearts') return <mesh position={[0, .02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={.055} geometry={heartGeometry()} material={roleMaterial(role)}/>;
  const roles = [role, 'white', 'gold'];
  return <mesh position={[0, .014, 0]} rotation={[0, 0, Math.PI / 2]} material={roleMaterial(roles[index % 3])}><capsuleGeometry args={[.011, .03, 3, 6]}/></mesh>;
}

// The toppings of a cut-able dessert, each one belonging to the slice it sits
// on; the ones in the middle go with the first slice. Each is tagged with its
// layer (cream, fruit, sprinkles) so a dessert being made can show only what
// is on it so far. Where hands placed things (the recipe's hand marks), they
// go there instead of the usual ring.
function toppings(d) {
  const shape = SHAPES[d.base], out = [], small = shape.small, hand = handOf(d) || {}, R = shape.decoR;
  const ring = (n, r, phase = 0) => Array.from({length: n}, (_, i) => (i + .5 + phase) * TAU / n).map(a => ({a, r}));
  const marks = list => list.map(([a, r]) => ({a: a * TAU / 32, r: r / 10 * R}));
  // Macarons and cream puffs are small, and have small toppings.
  const tiny = d.base === 'macaron' || d.base === 'puff';
  const middle = shape.top, cream = hand.cream ? marks(hand.cream) : null;
  if (d.cream === 'rosette') (cream || ring(d.base === 'pudding' ? 6 : tiny ? 5 : 8, shape.ring)).forEach(({a, r}, i) => out.push({a, r, y: middle, layer: 'cream', el: <Rosette s={small} role={d.c.cream} turn={i * 1.3}/>}));
  if (d.cream === 'dollop') (cream || ring(tiny ? 3 : d.base === 'pudding' ? 5 : 8, shape.ring)).forEach(({a, r}) => out.push({a, r, y: middle, layer: 'cream', el: <Dollop s={small} role={d.c.cream}/>}));
  if (d.cream === 'shell') (cream || ring(tiny ? 9 : d.base === 'pudding' ? 10 : 18, shape.ring + .07)).forEach(({a, r}) => out.push({a, r, y: middle, layer: 'cream', el: <group rotation={[0, a + Math.PI / 2, 0]}><ShellPiece s={small} role={d.c.cream}/></group>}));
  const swirlS = d.base === 'cake' || d.base === 'tart' ? .9 : small, swirls = d.cream === 'swirl' ? (cream || [{a: 0, r: 0}]) : [];
  swirls.forEach(({a, r}) => out.push({a, r, y: middle, centre: !cream, layer: 'cream', el: <Swirl s={swirlS} role={d.c.cream}/>}));
  const Fruit = FRUIT[d.fruit];
  if (Fruit) {
    const fs = tiny ? .85 : d.base === 'pudding' ? 1 : 1.3, swirlTop = middle + .31 * swirlS - .02;
    if (hand.fruit) {
      // Put by hand: on top of a swirl if it lands on one, otherwise on the top.
      const near = ({a, r}) => swirls.some(w => Math.hypot(Math.sin(a) * r - Math.sin(w.a) * w.r, Math.cos(a) * r - Math.cos(w.a) * w.r) < .16 * R / .66);
      marks(hand.fruit).forEach(({a, r}) => out.push({a, r, y: near({a, r}) ? swirlTop : middle, layer: 'fruit', el: <group rotation={[0, a, 0]}><Fruit s={fs}/></group>}));
    } else {
      if (d.cream === 'swirl') out.push({a: swirls[0].a, r: swirls[0].r, y: swirlTop, centre: !cream, layer: 'fruit', el: <Fruit s={fs}/>});
      if (d.base === 'cake' || d.base === 'tart') {
        const r = d.cream === 'swirl' ? shape.ring + .02 : shape.inner;
        const spots = d.fruit === 'blueberry' ? Array.from({length: 12}, (_, i) => ({a: (i + .5) * TAU / 12, r: r + (i % 2 ? .08 : -.04)})) : ring(4, r);
        spots.forEach(({a, r}) => out.push({a, r, y: middle, layer: 'fruit', el: <group rotation={[0, a, 0]}><Fruit s={fs}/></group>}));
      } else if (d.cream !== 'swirl') {
        if (d.fruit === 'blueberry') ring(3, .1).forEach(({a, r}) => out.push({a, r, y: middle, centre: true, layer: 'fruit', el: <Fruit s={fs}/>}));
        else out.push({a: 0, r: 0, y: middle, centre: true, layer: 'fruit', el: <Fruit s={fs}/>});
      }
    }
  }
  if (d.sprinkles !== 'none') {
    const n = Math.round({dots: 30, pearls: 22, hearts: 11}[d.sprinkles] * (d.base === 'cake' || d.base === 'tart' ? 1 : .45));
    const add = ({a, r, turn}, i) => out.push({a, r: Math.max(r, .05), y: middle + .002, layer: 'sprinkles', el: <group rotation={[0, turn, 0]}><Sprinkle kind={d.sprinkles} role={d.c.sprinkles} index={i}/></group>});
    if (hand.sprinkles) {
      // Each pinch scatters a few around where it was shaken.
      const per = Math.max(2, Math.round(n / 5)), spread = .13 * R / .66;
      marks(hand.sprinkles).forEach((p, j) => scatter(per, spread, 11 + j * 97 + d.sprinkles.length).forEach((q, i) => {
        const x = Math.sin(p.a) * p.r + Math.sin(q.a) * q.r, z = Math.cos(p.a) * p.r + Math.cos(q.a) * q.r;
        add({a: Math.atan2(x, z), r: Math.min(R - .04, Math.hypot(x, z)), turn: q.turn}, j * per + i);
      }));
    } else scatter(n, shape.decoR - .06, 7 + d.base.length * 31 + d.sprinkles.length).forEach(add);
  }
  return out;
}

// Where the toppings go, for placing them by hand: the middle of the top (on
// its plate, standing on y = 0), how far it is turned, and how far out
// things can go. On macarons it is the top of the stack; on cream puffs, the
// top of the puff on top.
export function dessertTop(item) {
  const d = normalizeDessert(item), shape = SHAPES[d.base] || SHAPES.cake, base = plateTop(d.plate);
  if (d.base === 'macaron') {const m = MACARONS[2]; return {p: [m.p[0], base + MACARON_TOP, m.p[2]], turn: m.r[1], R: shape.decoR};}
  if (d.base === 'puff') return {p: [0, base + PUFF_TOP * PILE, 0], turn: 0, R: shape.decoR * PILE};
  return {p: [0, base + shape.top, 0], turn: 0, R: shape.decoR};
}

const MacaronTop = ({tops}) => <>{tops.map((t, j) => <group key={j} position={at(t.r, t.a, .33 + t.y)}>{t.el}</group>)}</>;
const ALL_LAYERS = {cream: true, fruit: true, sprinkles: true};
// The dessert without its plate, the slices, macarons or puffs given (all four
// by default), standing on y = 0. While it is being made by hand, show says
// which layers are on it yet and frost how far the cream has gone on; cream
// puffs being filled say how full each one is (fills), and a finger pressing
// on one of them is passed on (onPress with which puff, onLift).
export function DessertBody({item, quarters = [0, 1, 2, 3], show = ALL_LAYERS, frost = 1, fills, onPress, onLift}) {
  const d = normalizeDessert(item), all = useMemo(() => toppings(d), [JSON.stringify([d.base, d.cream, d.fruit, d.sprinkles, d.c, d.hand])]);
  const tops = all.filter(t => show[t.layer] !== false);
  if (d.base === 'macaron') return <group>
    {MACARONS.map((m, i) => quarters.includes(i) && <group key={i} position={m.p} rotation={m.r}><Macaron d={d} frost={frost}/>{m.top && <MacaronTop tops={tops}/>}</group>)}
  </group>;
  if (d.base === 'puff') {
    const burst = burstOf(d) || [];
    return <group scale={PILE}>
      {PUFFS.map((m, i) => quarters.includes(i) && <group key={i} position={m.p} rotation={[0, m.a, 0]} onPointerDown={onPress && (e => onPress(i, e))} onPointerUp={onLift} onPointerCancel={onLift}>
        <Puff d={d} fill={fills ? fills[i] : frost > 0 ? 1 : 0} burst={fills ? fills[i] >= 1.5 : burst.includes(i)} hole={m.hole} lobes={m.lobes} twist={m.twist}/>
        {m.top && <PuffTop tops={tops}/>}
      </group>)}
    </group>;
  }
  const Body = {cake: CakeBody, tart: TartBody, pudding: PuddingBody}[d.base] || CakeBody;
  return <group>
    <Body d={d} quarters={quarters} frost={frost}/>
    {tops.map((t, j) => (t.centre ? quarters.includes(0) : quarters.includes(quarterAt(t.a))) && <group key={j} position={at(t.r, t.a, t.y)}>{t.el}</group>)}
  </group>;
}

// One slice (or one macaron, or one cream puff) on its own, its middle over
// the origin: what goes onto a side plate when the two of them share it. A
// cream puff shows how many bites have been taken out of it (0 to 2).
export const BITTEN_KINDS = ['puff'];
export function DessertPortion({item, portion, bites = 0}) {
  const d = normalizeDessert(item);
  if (d.base === 'macaron') return <group rotation={[0, .5, 0]}><Macaron d={d}/>{MACARONS[portion]?.top && <MacaronTop tops={toppings(d)}/>}</group>;
  if (d.base === 'puff') return <group rotation={[0, .5, 0]} scale={PILE}><Puff d={d} burst={(burstOf(d) || []).includes(portion)} hole={PUFFS[portion]?.hole || 0} lobes={PUFFS[portion]?.lobes} twist={PUFFS[portion]?.twist} bites={bites}/>{PUFFS[portion]?.top && <PuffTop tops={toppings(d)} bites={bites}/>}</group>;
  const mid = (portion + .5) * QUARTER, r = d.base === 'pudding' ? .2 : .3;
  return <group rotation={[0, -mid + Math.PI * .75, 0]}><group position={[-Math.sin(mid) * r, 0, -Math.cos(mid) * r]}><DessertBody item={d} quarters={[portion]}/></group></group>;
}

// How big a dessert is on its plate, for fitting it in a picture or a slot.
const SIZE = 2.1;
// The whole dessert on its plate. fill makes it that size (a preview); fit is
// the size of a slot it is put in (a cupboard, the coffee table), where it
// takes half of it: about as big beside a doll or a bouquet there as a cake
// would be, instead of a crumb.
export function DessertModel({item, quarters, fill, fit, onClick, show, frost, bare = false}) {
  const d = normalizeDessert(item), s = fill ? fill / SIZE : fit ? fit / 2 / SIZE : 1;
  return <group scale={s} position={[0, fill ? -.45 * s : 0, 0]} onClick={onClick}>
    <Plate kind={d.plate} role={d.c.plate}/>
    {!bare && <group position={[0, plateTop(d.plate), 0]}><DessertBody item={d} quarters={quarters} show={show} frost={frost}/></group>}
  </group>;
}

// The two small plates and forks the dessert is shared on.
export function SidePlate() {
  return <group><Turned points={[[0, 0], [.42, 0], [.48, .02], [.53, .06], [.5, .07], [.44, .045], [0, .04]]} material={fixedMaterial('#fbf7f0', .35)}/><mesh position={[0, .046, 0]} rotation={[-Math.PI / 2, 0, 0]} material={roleMaterial('gold', {rough: .3, metal: .4})}><torusGeometry args={[.36, .006, 6, 40]}/></mesh></group>;
}
export function DessertFork() {
  const m = fixedMaterial('#d9d3c9', .28, .55);
  return <group>
    <mesh position={[0, 0, .12]} material={m} castShadow><boxGeometry args={[.05, .018, .3]}/></mesh>
    <mesh position={[0, 0, -.06]} material={m}><boxGeometry args={[.09, .016, .08]}/></mesh>
    {[-.03, 0, .03].map(x => <mesh key={x} position={[x, 0, -.14]} material={m}><boxGeometry args={[.016, .014, .1]}/></mesh>)}
  </group>;
}
