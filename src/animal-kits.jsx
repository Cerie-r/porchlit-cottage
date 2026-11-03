import React from 'react';
import {Shell, Tube, Patch, Felt, Puffs, Dot, Thread} from './animal-parts.jsx';
import {NOSE, THREAD, both, at, onShell, Nose, Mouth} from './animal-face.jsx';

// More dolls for the claw machine. Each has its own build rather than one
// body for all: a puppy sitting like a dog, a piglet, a lamb that is mostly
// wool, a fawn lying with its legs folded, a duckling, a penguin and a
// squirrel with a tail as big as itself.
// Numbers are in the doll's own units: it sits on y = 0 and faces +z.

const TONGUE = '#e98f9f', NOSTRIL = '#c07786', HORN = '#cdab7c', NUT = '#b07a4a', CAP = '#7a5236';
const girth = d => d.body === 'chubby' ? [1.16, 1.1] : [1, 1];
const limb = (points, radius, c, cap = true) => ({tube: {points, radius, cap, rows: 8, cols: 8}, c});

// ---------- puppy ----------
// Sits up like a dog: front legs straight down in front, round haunches with
// the back paws poking forward, a short tail curling up behind. Standing, it
// is on all fours. A round snout with a big shiny nose and the tip of a tongue;
// the ears and a patch round one eye take the markings colour.
function DogFace({d, head}) {
  const r = [.26, .18, .22], c = [0, -.26, at(head, 0, -.26)[2] - .1];
  return <>
    <Shell size={r} position={c} color={d.cream} rows={5} cols={12}/>
    <Dot p={onShell(c, r, 0, -.19, .02)} size={.078} scale={[1.3, .9, .8]} c={NOSE} roughness={.15}/>
    <Mouth c={c} r={r} top={-.245} drop={.05} wide={.1} width={.018}/>
    {d.expression !== 'sleepy' && <Dot p={onShell(c, r, .015, -.33, -.03)} size={.05} scale={[1, .75, .55]} c={TONGUE} roughness={.4}/>}
    <Shell size={[.17, .19, .06]} position={at(head, .27, -.01, -.04)} rotation={[0, .32, 0]} color={d.patch} rows={4} cols={10}/>
  </>;
}
function DogEars({d}) {
  return both(side => d.ears === 'perky'
    ? <group key={side} position={[side * .44, .52, 0]} rotation={[.3, 0, -side * .45]}>
        <Shell shape="cone" size={[.28, .34, .13]} bend={.3} color={d.patch} rows={4} cols={9}/>
      </group>
    : <group key={side} position={[side * .6, .36, 0]} rotation={[0, side * .3, side * .3]}>
        <Shell size={[.19, .36, .09]} taper={.3} position={[0, -.3, 0]} color={d.patch} rows={6} cols={9}/>
      </group>);
}
function dogKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const paw = p => ({p, s: [.12, .09, .15], c: d.fur, rows: 4, cols: 9});
  let parts, headAt, neck, bowAt, bandana, tail, flowers;
  if (stand) {
    const by = .7;
    parts = [
      {s: [.52 * wx, .48, .72 * wz], f: .1, p: [0, by, -.12], c: d.fur, rows: 8, cols: 16},
      ...[-1, 1].flatMap(fz => both(side => limb([[side * .24 * wx, by - .1, fz * .36 * wz - .1], [side * .25 * wx, .36, fz * .38 * wz - .1], [side * .25 * wx, .14, fz * .39 * wz - .1]], .12, d.fur, false))),
      ...[-1, 1].flatMap(fz => both(side => paw([side * .25 * wx, .08, fz * .39 * wz - .05]))),
    ];
    headAt = [0, by + .58, .5 * wz];
    neck = {y: by + .24, r: .32 * wx, z: .28, at: .32 * wz, tilt: .55};
    // On all fours its chin hides its neck, so the bow and the bandana go under the chin.
    bowAt = {p: [0, by - .06, .88 * wz], r: [-.35, 0, 0], s: .85};
    bandana = {p: [0, by - .06, .86 * wz], r: [-.3, 0, 0], s: .44};
    tail = [[0, by + .1, -.8 * wz], [0, by + .26, -.94 * wz], [.03, by + .44, -.96 * wz], [.06, by + .54, -.88 * wz]];
    flowers = {p: [0, by - .1, .92 * wz], s: .42};
  } else {
    const y = .46;
    parts = [
      {s: [.48 * wx, .6, .46 * wz], t: .2, f: .32, p: [0, y, 0], c: d.fur, rows: 7, cols: 14},
      {s: [.14 * wx, .17, .04], p: [0, y + .2, .41 * wz], r: [-.2, 0, 0], c: d.cream, rows: 4, cols: 9},
      ...both(side => hold
        ? limb([[side * .2 * wx, y + .24, .16], [side * .24 * wx, y + .16, .38 * wz], [side * .1, y + .14, .56 * wz]], .1, d.fur)
        : limb([[side * .15 * wx, y + .1, .22 * wz], [side * .16 * wx, .4, .31 * wz], [side * .16 * wx, .14, .34 * wz]], .1, d.fur, false)),
      ...(hold ? [] : both(side => paw([side * .16 * wx, .08, .4 * wz]))),
      ...both(side => ({s: [.22, .21, .3], p: [side * .31 * wx, .21, -.04], r: [0, side * .25, 0], c: d.fur, rows: 5, cols: 10})),
      ...both(side => ({s: [.11, .08, .17], p: [side * .38 * wx, .07, .22 * wz], r: [0, side * .2, 0], c: d.fur, rows: 4, cols: 9})),
    ];
    headAt = [0, y + 1.08, .1];
    neck = {y: y + .44, r: .33 * wx, z: .3 * wz};
    tail = [[0, .22, -.38 * wz], [0, .36, -.56 * wz], [.03, .56, -.6 * wz], [.06, .68, -.52 * wz]];
    flowers = {p: [0, y + .16, .66 * wz], s: .42};
  }
  const head = {size: [.8, .72, .7], taper: .08};
  return {parts, head, headAt, ears: <DogEars d={d}/>, face: <DogFace d={d} head={head}/>, eyes: [.27, -.03], eyeSize: .1, blush: [.47, -.2], blushSize: .1,
    tail: {points: tail, radius: [.075, .06, .05], rows: 10, cols: 8}, neck, bowAt, bandana, ribbon: true, hatScale: .84, flowers, scale: 1.2};
}

// ---------- piglet ----------
// Lies flat on its tummy with its four stubby legs splayed out, or stands on
// them. A round snout with two nostrils, ears that flop forward (or stand up)
// and a curly tail. The snout and the little hooves take the markings colour.
function PigFace({d, head}) {
  const r = [.19, .14, .12], c = [0, -.15, at(head, 0, -.15)[2] - .03];
  return <>
    <Shell size={r} position={c} color={d.patch} rows={4} cols={12}/>
    {both(side => <Dot key={side} p={[side * .06, -.15, c[2] + r[2] - .005]} size={.034} scale={[.8, 1.15, .4]} c={NOSTRIL}/>)}
    {d.expression !== 'sleepy' && <Thread color={THREAD} width={.014} points={[at(head, -.07, -.36, .006), at(head, 0, -.39, .008), at(head, .07, -.36, .006)]}/>}
  </>;
}
function PigEars({d}) {
  const up = d.ears === 'pigup';
  return both(side => <group key={side} position={[side * .38, up ? .48 : .5, up ? -.02 : 0]} rotation={up ? [-.1, 0, -side * .42] : [.75, 0, -side * .5]}>
    <Shell shape="cone" size={[.22, .29, .08]} bend={up ? 0 : .1} color={d.fur} rows={4} cols={9}/>
    <Shell shape="cone" size={[.14, .2, .03]} position={[0, -.03, .06]} color={d.accent} rows={3} cols={8}/>
  </group>);
}
function curl(at, turns = 1.6, r = .07) {
  return Array.from({length: 9}, (_, i) => {const a = i / 8 * turns * Math.PI * 2; return [at[0] + r * Math.sin(a), at[1] + r * (1 - Math.cos(a)) + i * .006, at[2] - .03 - i * .022];});
}
function pigKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const hoof = (p, r, s = [.13, .11, .19]) => ({p, r, kids: [{s, c: d.fur, rows: 4, cols: 10}, {s: [s[0] * .92, s[1] * .92, .06], p: [0, 0, s[2] - .03], c: d.patch, rows: 3, cols: 8}]});
  let parts, headAt, bowAt, bandana, tail, flowers, bust;
  if (stand) {
    const by = .64;
    parts = [
      {s: [.54 * wx, .46, .66 * wz], f: .15, p: [0, by, -.08], c: d.fur, rows: 8, cols: 16},
      {s: [.36 * wx, .1, .44 * wz], p: [0, by - .38, -.06], c: d.cream, rows: 4, cols: 12},
      ...[-1, 1].flatMap(fz => both(side => limb([[side * .25 * wx, by - .1, fz * .32 * wz - .08], [side * .26 * wx, .14, fz * .34 * wz - .08]], .12, d.fur, false))),
      ...[-1, 1].flatMap(fz => both(side => ({s: [.13, .08, .14], p: [side * .26 * wx, .07, fz * .34 * wz - .06], c: d.patch, rows: 3, cols: 9}))),
    ];
    headAt = [0, by + .38, .58 * wz];
    bowAt = {p: [0, by - .02, .9 * wz], r: [-.2, 0, 0], s: .8};
    bandana = {p: [0, by - .02, .88 * wz], r: [-.15, 0, 0], s: .42};
    tail = curl([0, by + .14, -.74 * wz]);
    flowers = {p: [0, by - .12, .98 * wz], s: .42};
  } else {
    const by = .34;
    parts = [
      {s: [.56 * wx, .42, .64 * wz], f: .5, p: [0, by, -.1], c: d.fur, rows: 8, cols: 16},
      ...both(side => hold
        ? hoof([side * .2 * wx, .17, .5 * wz], [0, -side * .25, 0])
        : hoof([side * .42 * wx, .14, .3 * wz], [0, side * .55, 0])),
      ...both(side => hoof([side * .44 * wx, .14, -.46 * wz], [0, side * (Math.PI - .6), 0])),
    ];
    headAt = [0, by + .42, .5 * wz];
    bowAt = {p: [0, .3, .86 * wz], r: [-.2, 0, 0], s: .8};
    bandana = {p: [0, .3, .84 * wz], r: [-.15, 0, 0], s: .42};
    tail = curl([0, by + .2, -.72 * wz]);
    // Lying down, it holds the flowers out to one side of its snout, resting on the floor.
    flowers = {p: [.34 * wx, .12, .78 * wz], r: [1.2, 0, -.5], s: .42};
    bust = [{s: [.56 * wx, .42, .64 * wz], f: .5, p: [0, by, -.1], c: d.fur, rows: 8, cols: 16}];
  }
  const head = {size: [.66, .6, .58], taper: .06};
  return {parts, bust, head, headAt, ears: <PigEars d={d}/>, face: <PigFace d={d} head={head}/>, eyes: [.25, .06], eyeSize: .075, blush: [.4, -.1], blushSize: .1,
    tail: {points: tail, radius: [.04, .035, .03], rows: 12, cols: 6}, bowAt, bandana, ribbon: true, hatScale: .72, flowers, scale: 1.5};
}

// ---------- lamb ----------
// A ball of wool: puffs all over a round body and over its head like a hood,
// with the face and little legs in the second colour, ears sticking out to
// the sides (or curly horns).
const WOOL = (() => {
  // Puffs spread evenly over the top three quarters of a ball.
  const out = [], n = 26;
  for (let i = 0; i < n; i++) {const y = 1 - (i + .5) / n * 1.55, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996; out.push([r * Math.cos(a), y, r * Math.sin(a)]);}
  return out;
})();
// Wool over the top, sides and back of the head, leaving the face bare.
const HOOD = (() => {
  const out = [], n = 84;
  for (let i = 0; i < n; i++) {
    const y = 1 - (i + .5) / n * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996, x = r * Math.cos(a), z = r * Math.sin(a);
    if (y < -.3 || (z > .32 && y < .44)) continue;
    out.push([x, y, z]);
  }
  return out;
})();
function wool(center, [rx, ry, rz], puff, c) {
  return {p: center, kids: [{s: [rx * .92, ry * .92, rz * .92], c, rows: 6, cols: 12}, {puffs: WOOL.map(([x, y, z]) => [x * rx, y * ry, z * rz]), s: [puff, puff, puff * .9], c}]};
}
function LambEars({d}) {
  // Curly horns come out of the wool at the top, sweep back and round, and end by the cheeks.
  if (d.ears === 'ram') return both(side => <group key={side}>
    <Tube points={[[.28, .36, 0], [.5, .44, -.08], [.68, .3, -.07], [.69, .09, .05], [.58, -.01, .17], [.5, .07, .22]].map(([x, y, z]) => [side * x, y, z])} radius={[.08, .075, .065, .05, .04]} color={HORN} rows={14} cols={8}/>
    <group position={[side * .47, -.04, .06]} rotation={[0, side * .3, -side * 1.6]}><Shell size={[.07, .12, .04]} color={d.cream} rows={3} cols={7}/></group>
  </group>);
  return both(side => <group key={side} position={[side * .44, .1, 0]} rotation={[0, side * .25, -side * 1.75]}>
    <Shell size={[.09, .2, .05]} taper={.2} position={[0, .14, 0]} color={d.cream} rows={4} cols={8}/>
    <Shell size={[.055, .14, .02]} taper={.2} position={[0, .15, .04]} color={d.accent} rows={3} cols={7}/>
  </group>);
}
function LambFace({head}) {
  const y = -.2, p = (x, dy) => at(head, x, y + dy, .008);
  return <>
    <Nose head={head} y={y} width={.07}/>
    <Thread color={THREAD} width={.014} points={[p(0, -.03), p(0, -.08)]}/>
    {both(side => <Thread key={side} color={THREAD} width={.014} points={[p(0, -.08), p(side * .04, -.11), p(side * .07, -.1)]}/>)}
  </>;
}
function lambKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const leg = (points, r = .085) => limb(points, r, d.cream);
  let parts, headAt, bowAt, flowers, bust;
  if (stand) {
    const by = .78;
    parts = [
      wool([0, by, -.04], [.5 * wx, .44, .6 * wz], .19, d.fur),
      ...[-1, 1].flatMap(fz => both(side => leg([[side * .22 * wx, by - .2, fz * .3 * wz], [side * .23 * wx, .1, fz * .32 * wz]]))),
    ];
    headAt = [0, by + .34, .62 * wz];
    bowAt = {p: [0, by + .04, .76 * wz], r: [-.3, 0, 0]};
    flowers = {p: [0, by - .2, .98 * wz], s: .42};
  } else {
    const by = .5;
    const body = wool([0, by, 0], [.52 * wx, .46, .5 * wz], .19, d.fur);
    parts = [
      body,
      ...both(side => hold
        ? leg([[side * .24 * wx, by + .02, .34], [side * .2 * wx, by + .04, .58 * wz], [side * .08, by + .08, .7 * wz]])
        : leg([[side * .2 * wx, .24, .32 * wz], [side * .23 * wx, .12, .66 * wz]])),
      ...both(side => leg([[side * .36 * wx, .16, .1], [side * .44 * wx, .1, .44 * wz]])),
    ];
    headAt = [0, by + .62, .36 * wz];
    bowAt = {p: [0, by + .24, .62 * wz], r: [-.2, 0, 0]};
    flowers = {p: [.3 * wx, by - .26, .76 * wz], r: [.6, 0, -.6], s: .42};
    bust = [body];
  }
  const head = {size: [.46, .5, .46], taper: .14};
  const hood = <Puffs points={HOOD.map(([x, y, z]) => [x * head.size[0], y * head.size[1], z * head.size[2]])} size={[.13, .13, .12]} color={d.fur}/>;
  return {parts, bust, head, headAt, headColor: d.cream, ears: <>{hood}<LambEars d={d}/></>, face: <LambFace head={head}/>, eyes: [.2, -.02], eyeSize: .07, blush: [.3, -.16], blushSize: .08,
    tail: {points: [[0, (stand ? .78 : .5) - .1, -.5 * wz], [0, (stand ? .78 : .5) - .14, -.62 * wz]], radius: .1, color: d.fur, rows: 3, cols: 7},
    bowAt, bandana: {p: [bowAt.p[0], bowAt.p[1] - .02, bowAt.p[2] - .02], r: bowAt.r, s: .4}, ribbon: true, hatScale: .58, hatLift: .14, flowers, scale: 1.3};
}

// ---------- fawn ----------
// Lies down with its legs folded under and its neck up, white spots along its
// back; or stands on four thin legs. Ears out to the sides, and little
// antlers if wanted. Nose, hooves and antlers take the markings colour.
function FawnFace({d, head}) {
  const r = [.17, .13, .17], c = [0, -.2, at(head, 0, -.2)[2] - .08];
  return <>
    <Shell size={r} position={c} color={d.cream} rows={4} cols={10}/>
    <Dot p={onShell(c, r, 0, -.13, .015)} size={.05} scale={[1.3, .9, .8]} c={d.patch} roughness={.2}/>
    <Thread color={THREAD} width={.013} points={[onShell(c, r, -.05, -.25, .005), onShell(c, r, 0, -.27, .007), onShell(c, r, .05, -.25, .005)]}/>
  </>;
}
function FawnEars({d}) {
  return <>
    {both(side => <group key={side} position={[side * .3, .24, -.04]} rotation={[0, side * .3, -side * 1.05]}>
      <Shell size={[.11, .22, .05]} position={[0, .17, 0]} color={d.fur} rows={4} cols={8}/>
      <Shell size={[.07, .16, .02]} position={[0, .18, .04]} color={d.accent} rows={3} cols={7}/>
    </group>)}
    {d.ears === 'antler' && both(side => <group key={'a' + side}>
      <Tube points={[[side * .11, .34, -.06], [side * .14, .5, -.08], [side * .2, .62, -.08]]} radius={[.035, .024]} color={d.patch} rows={5} cols={6}/>
      <Tube points={[[side * .14, .5, -.08], [side * .08, .58, -.04]]} radius={[.024, .018]} color={d.patch} rows={3} cols={6}/>
    </group>)}
  </>;
}
const SPOTS = [[-.12, -.32], [.12, -.3], [-.2, -.04], [.19, -.06], [0, -.16], [-.08, .14], [.1, .16], [0, -.48], [-.2, -.48], [.2, -.5]];
function fawnKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const body = stand ? {c: [0, .84, -.08], r: [.38 * wx, .34, .6 * wz]} : {c: [0, .22, -.1], r: [.4 * wx, .36, .64 * wz]};
  const top = (x, z) => body.c[1] + body.r[1] * Math.sqrt(Math.max(0, 1 - (x / body.r[0]) ** 2 - ((z - body.c[2]) / body.r[2]) ** 2));
  const hoof = p => ({p, s: [.07, .06, .08], c: d.patch, rows: 3, cols: 7});
  const thin = points => limb(points, .065, d.fur, false);
  let parts, neck, headAt, flowers;
  if (stand) {
    parts = [
      {s: body.r, f: .1, p: body.c, c: d.fur, rows: 8, cols: 16},
      ...[-1, 1].flatMap(fz => both(side => thin([[side * .2 * wx, .74, fz * .34 * wz - .08], [side * .2 * wx, .4, fz * .36 * wz - .08], [side * .2 * wx, .1, fz * .36 * wz - .08]]))),
      ...[-1, 1].flatMap(fz => both(side => hoof([side * .2 * wx, .06, fz * .36 * wz - .06]))),
    ];
    neck = [[0, 1.0, .3 * wz], [0, 1.22, .42 * wz], [0, 1.4, .5 * wz]];
    headAt = [0, 1.56, .56 * wz];
    flowers = {p: [0, .5, .9 * wz], s: .42};
  } else {
    parts = [
      {s: body.r, f: .45, p: body.c, c: d.fur, rows: 8, cols: 16},
      // Front legs folded under, the forelegs out in front (or round the flowers).
      ...both(side => hold ? thin([[side * .18 * wx, .12, .3 * wz], [side * .14 * wx, .12, .56 * wz], [side * .06, .16, .72 * wz]]) : thin([[side * .18 * wx, .08, .3 * wz], [side * .15 * wx, .06, .62 * wz]])),
      ...both(side => hoof(hold ? [side * .06, .16, .78 * wz] : [side * .15 * wx, .06, .68 * wz])),
      // Haunches, with the hind hooves tucked forward.
      ...both(side => ({s: [.17, .17, .27], p: [side * .3 * wx, .17, -.4 * wz], r: [0, side * .2, 0], c: d.fur, rows: 5, cols: 10})),
      ...both(side => hoof([side * .34 * wx, .06, -.1 * wz])),
    ];
    neck = [[0, .38, .28 * wz], [0, .62, .4 * wz], [0, .84, .48 * wz]];
    headAt = [0, 1.02, .52 * wz];
    flowers = {p: [.1, .14, .84 * wz], r: [.5, 0, -.2], s: .42};
  }
  const throat = limb(neck, [.15, .12], d.fur, false), m = neck[1];
  parts.push(throat);
  parts.push(...SPOTS.map(([x, z]) => ({s: [.05, .022, .05], p: [x * wx, top(x * wx, z * wz) - .004, z * wz], c: d.cream, rows: 2, cols: 6})));
  parts.push({s: [.07, .1, .06], p: [0, body.c[1] + .1, body.c[2] - body.r[2] + .02], r: [-.6, 0, 0], c: d.cream, rows: 3, cols: 7});
  const head = {size: [.42, .42, .42], taper: .04};
  return {parts, bust: [throat], head, headAt, ears: <FawnEars d={d}/>, face: <FawnFace d={d} head={head}/>, eyes: [.19, .04], eyeSize: .075, glass: true, blush: [.28, -.12], blushSize: .075,
    neck: {y: m[1], r: .15, z: .15, at: m[2], tilt: .5}, bowAt: {p: [0, m[1] - .04, m[2] + .14], r: [-.4, 0, 0], s: .7}, ribbon: true, hatScale: .55, flowers, scale: 1.5};
}

// ---------- duckling ----------
// A round little duck sitting on the floor, wings at its sides, a flat bill,
// webbed feet in front and a tail turned up behind; a curl of down on its
// head unless it's plain. Bill and feet take the markings colour.
function Bill({d, head, y, wide = 1}) {
  const z = at(head, 0, y)[2];
  return <group position={[0, y, z - .02]} rotation={[.12, 0, 0]} scale={[wide, 1, 1]}>
    <Shell size={[.15, .05, .15]} position={[0, .02, .07]} color={d.patch} rows={3} cols={10}/>
    <Shell size={[.13, .035, .12]} position={[0, -.035, .05]} color={d.patch} rows={3} cols={10}/>
  </group>;
}
function Feet({d, place: [x, y, z], splay = .25, size = .3}) {
  return both(side => <Felt key={side} shape="webfoot" depth={.15} color={d.patch} position={[side * x, y, z]} rotation={[Math.PI / 2, 0, -side * splay]} scale={size}/>);
}
function Tuft({d, y}) {
  if (d.ears !== 'tuft') return null;
  return <Tube points={[[0, y - .06, 0], [0, y + .06, .02], [.04, y + .12, .08], [.06, y + .08, .13]]} radius={[.04, .022]} color={d.fur} rows={5} cols={6}/>;
}
function duckKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const y = stand ? .74 : .46;
  const parts = [
    {s: [.5 * wx, .5, .52 * wz], t: .1, f: .35, p: [0, y, 0], c: d.fur, rows: 7, cols: 14},
    {s: [.28 * wx, .28, .06], p: [0, y - .04, .5 * wz], r: [-.1, 0, 0], c: d.cream, rows: 5, cols: 10},
    ...both(side => ({p: [side * .47 * wx, y + .08, hold ? .22 : -.04], r: hold ? [0, -side * .9, side * .4] : [0, side * .15, side * .35], kids: [{s: [.12, .25, .3], c: d.fur, rows: 5, cols: 10}]})),
    {s: [.12, .2, .08], shape: 'cone', p: [0, y + .1, -.52 * wz], r: [-1.0, 0, 0], c: d.fur, rows: 3, cols: 8},
    ...(stand ? both(side => limb([[side * .18 * wx, y - .3, .04], [side * .18 * wx, .06, .1]], .05, d.patch, false)) : []),
  ];
  const head = {size: [.42, .4, .4], taper: .04};
  return {parts, extras: <Feet d={d} place={[.19 * wx, .03, stand ? .16 : .34 * wz]}/>, head, headAt: [0, y + .82, .14], ears: <Tuft d={d} y={.42}/>, face: <Bill d={d} head={head} y={-.08}/>,
    eyes: [.17, .07], eyeSize: .07, blush: [.26, -.06], blushSize: .08,
    neck: {y: y + .44, r: .3 * wx, z: .28 * wz}, ribbon: true, hatScale: .6, flowers: {p: [0, y - .02, .68 * wz], s: .4}, scale: 1.4};
}

// ---------- penguin ----------
// A dark round body with a white front, a round head with a white face, a
// small beak, flippers out at its sides and webbed feet in front.
function penguinKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const y = stand ? .7 : .5, body = [.48 * wx, .6, .44 * wz];
  const parts = [
    {s: body, t: .12, f: .35, p: [0, y, 0], c: d.fur, rows: 8, cols: 16},
    ...both(side => ({p: [side * .45 * wx, y + .16, hold ? .2 : 0], r: hold ? [0, -side * .8, side * .5] : [0, 0, side * .45], kids: [{s: [.08, .3, .15], p: [0, -.16, 0], c: d.fur, rows: 5, cols: 8}]})),
    {s: [.13, .1, .1], shape: 'cone', p: [0, y - .36, -.42 * wz], r: [-1.9, 0, 0], c: d.fur, rows: 3, cols: 8},
    ...(stand ? both(side => limb([[side * .16 * wx, y - .4, .06], [side * .16 * wx, .06, .1]], .05, d.patch, false)) : []),
  ];
  const head = {size: [.46, .44, .44], taper: .06};
  const extras = <>
    <Patch size={body} taper={.12} flat={.35} color={d.cream} width={.17} top={s => .3 + .05 * s * s} bottom={() => .93} position={[0, y, 0]} rows={5} cols={10}/>
    <Feet d={d} place={[.17 * wx, .03, stand ? .16 : .3 * wz]} splay={.35}/>
  </>;
  const face = <>
    <Patch size={head.size} taper={head.taper} color={d.cream} width={.17} top={s => .3 + .1 * s * s} bottom={() => .82} rows={4} cols={10}/>
    <group position={at(head, 0, -.08, .02)} rotation={[Math.PI / 2 - .2, 0, 0]}><Shell shape="cone" size={[.065, .12, .05]} color={d.patch} rows={3} cols={7}/></group>
  </>;
  const crest = d.ears === 'tuft' ? <group>{[-1, 0, 1].map(k => <group key={k} position={[k * .05, .42, -.02]} rotation={[-.2, 0, -k * .35]}><Shell shape="cone" size={[.04, .14, .03]} color={d.fur} rows={2} cols={6}/></group>)}</group> : null;
  return {parts, extras, head, headAt: [0, y + .9, .06], ears: crest, face, eyes: [.15, .03], eyeSize: .07, eyeUnder: d.cream, blush: [.25, -.1], blushSize: .075,
    neck: {y: y + .5, r: .3 * wx, z: .27 * wz}, ribbon: true, hatScale: .62, flowers: {p: [0, y + .02, .62 * wz], s: .4}, scale: 1.35};
}

// ---------- squirrel ----------
// Sits up with its front paws together holding an acorn, long back feet
// forward, and a big bushy tail rising up its back and curling over at the top.
function SquirrelFace({d, head}) {
  const r = [.15, .1, .13], c = [0, -.17, at(head, 0, -.17)[2] - .07], p = (x, y) => onShell(c, r, x, y, .006);
  return <>
    <Shell size={r} position={c} color={d.cream} rows={4} cols={10}/>
    <Dot p={onShell(c, r, 0, -.12, .012)} size={.04} scale={[1.3, .9, .8]} c={NOSE} roughness={.2}/>
    {both(side => <Thread key={side} color={THREAD} width={.013} points={[p(0, -.17), p(side * .025, -.2), p(side * .05, -.175)]}/>)}
  </>;
}
function SquirrelEars({d}) {
  const button = d.ears === 'button';
  return both(side => <group key={side} position={[side * .26, .38, -.04]} rotation={[-.1, 0, -side * .3]}>
    {button ? <Shell size={[.1, .1, .06]} color={d.fur} rows={3} cols={8}/> : <Shell shape="cone" size={[.11, .17, .07]} color={d.fur} rows={3} cols={8}/>}
    <Shell size={[.06, .065, .02]} position={[0, -.01, .045]} color={d.accent} rows={2} cols={7}/>
    {!button && <Shell shape="cone" size={[.035, .12, .03]} position={[0, .16, -.01]} color={d.fur} rows={2} cols={6}/>}
  </group>);
}
function squirrelKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const y = stand ? .86 : .5;
  const parts = [
    {s: [.38 * wx, .5, .36 * wz], t: .25, f: .3, p: [0, y, 0], c: d.fur, rows: 7, cols: 14},
    {s: [.2 * wx, .3, .05], p: [0, y + .02, .34 * wz], r: [-.1, 0, 0], c: d.cream, rows: 5, cols: 10},
    ...both(side => limb([[side * .24 * wx, y + .26, .06], [side * .2 * wx, y + .12, .3 * wz], [side * .06, y + .14, .42 * wz]], [.06, .055, .065], d.fur)),
    ...(stand
      ? both(side => [limb([[side * .16 * wx, y - .3, 0], [side * .18 * wx, .4, .02], [side * .18 * wx, .1, .04]], .08, d.fur, false), {s: [.09, .06, .18], p: [side * .18 * wx, .05, .14], c: d.fur, rows: 3, cols: 8}]).flat()
      : [...both(side => ({s: [.2, .22, .28], p: [side * .24 * wx, .2, -.02], r: [0, side * .2, 0], c: d.fur, rows: 5, cols: 10})),
         ...both(side => ({s: [.09, .06, .2], p: [side * .28 * wx, .05, .24 * wz], r: [0, side * .15, 0], c: d.fur, rows: 3, cols: 8}))]),
  ];
  const acorn = !hold && <group position={[0, y + .12, .5 * wz]}>
    <Shell size={[.07, .085, .07]} position={[0, -.03, 0]} color={NUT} rows={3} cols={8}/>
    <Shell size={[.08, .045, .08]} position={[0, .035, 0]} color={CAP} rows={2} cols={8}/>
    <Shell size={[.012, .03, .012]} position={[0, .085, 0]} color={CAP} rows={1} cols={5}/>
  </group>;
  // The tail leans out to its left, so it shows beside the body from the front.
  const tail = {points: [[.04, y - .3, -.3 * wz], [.16, y - .1, -.6 * wz], [.34, y + .4, -.66 * wz], [.42, y + .88, -.5 * wz], [.36, y + 1.08, -.26 * wz], [.24, y + 1.0, -.06 * wz]],
    radius: [.12, .24, .28, .26, .2, .13], tip: d.cream, tipFrom: .86, rows: 18, cols: 12};
  const head = {size: [.5, .46, .46], taper: .12};
  return {parts, extras: acorn, tail, head, headAt: [0, y + .86, .08], ears: <SquirrelEars d={d}/>, face: <SquirrelFace d={d} head={head}/>, eyes: [.2, .02], eyeSize: .075, glass: true, blush: [.3, -.12], blushSize: .08,
    neck: {y: y + .42, r: .28 * wx, z: .26 * wz}, ribbon: true, hatScale: .64, flowers: {p: [0, y + .14, .6 * wz], s: .4}, scale: 1.35};
}

export const MORE_KITS = {dog: dogKit, pig: pigKit, lamb: lambKit, fawn: fawnKit, duck: duckKit, penguin: penguinKit, squirrel: squirrelKit};
