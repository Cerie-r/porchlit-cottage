import React from 'react';
import {Euler, Quaternion, Vector3} from 'three';
import {Shell, Tube, Felt, Puffs, Dot, Thread, Spikes} from './animal-parts.jsx';
import {NOSE, THREAD, WHISKER, both, at, onShell, Mouth, Nose} from './animal-face.jsx';

// Five more dolls, from further away: a koala hugging a eucalyptus sprig, an
// otter floating on its back with a shell on its tummy, a hedgehog in soft
// prickles, a seal pup lying on its tummy and a lion with a big mane. Each has
// its own build, like the others.
// Numbers are in the doll's own units: it sits on y = 0 and faces +z.

const LEAF = '#9eaf98', TWIG = '#b08a66', SHELL = '#efc9c3', LION_NOSE = '#a9746a';
const girth = d => d.body === 'chubby' ? [1.16, 1.1] : [1, 1];
const limb = (points, radius, c, cap = true) => ({tube: {points, radius, cap, rows: 8, cols: 8}, c});
// The turn (as Euler angles) that points a part's hanging axis (-y) along `dir`.
const aim = dir => new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), new Vector3(...dir).normalize())).toArray().slice(0, 3);
// Points spread evenly over a ball (unit radius), for prickles and manes.
const ball = n => Array.from({length: n}, (_, i) => {const y = 1 - (i + .5) / n * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996; return [r * Math.cos(a), y, r * Math.sin(a)];});

// ---------- koala ----------
// Sits hugging a sprig of eucalyptus (or the flowers), a white chest, big
// round ears full of fluff and a big dark nose; no tail to speak of.
function KoalaEars({d}) {
  const big = d.ears === 'puff', r = big ? [.34, .31, .15] : [.24, .23, .13];
  const n = big ? 11 : 8, fluff = Array.from({length: n}, (_, i) => {const a = i / n * Math.PI * 2; return [Math.cos(a) * r[0] * .58, Math.sin(a) * r[1] * .56, 0];});
  return both(side => <group key={side} position={[side * (big ? .74 : .66), big ? .42 : .46, -.06]} rotation={[0, side * .25, -side * .32]}>
    <Shell size={r} color={d.fur} rows={5} cols={12}/>
    <Shell size={[r[0] * .62, r[1] * .62, .05]} position={[0, -.01, r[2] * .78]} color={d.cream} rows={4} cols={10}/>
    <Puffs points={fluff} size={big ? [.075, .075, .06] : [.06, .06, .05]} color={d.cream} position={[0, 0, r[2] * .82]}/>
  </group>);
}
function KoalaFace({d, head}) {
  const y = -.13, z = at(head, 0, y)[2];
  return <>
    <Shell size={[.15, .2, .11]} position={[0, y, z - .035]} color={d.patch} rows={4} cols={10}/>
    <Dot p={[-.05, y + .08, z + .07]} size={.03} c="#fff9ee" roughness={.3}/>
    <Thread color={THREAD} width={.015} points={[at(head, -.07, -.42, .006), at(head, 0, -.44, .008), at(head, .07, -.42, .006)]}/>
  </>;
}
function Sprig({at: [x, y, z], turn = 0}) {
  const twig = [[-.3, -.2, 0], [-.05, 0, .03], [.18, .2, .02], [.32, .36, -.02]];
  const leaves = [[-.2, -.12, .03, .6], [-.02, .02, .06, -.5], [.1, .12, .05, .7], [.22, .26, .03, -.4], [.32, .38, 0, .2]];
  return <group position={[x, y, z]} rotation={[0, 0, turn]}>
    <Tube points={twig} radius={.022} color={TWIG} rows={6} cols={6}/>
    {leaves.map(([lx, ly, lz, a], i) => <Felt key={i} shape="leaf" depth={.04} color={LEAF} position={[lx, ly, lz + .02]} rotation={[0, 0, a - .6]} scale={.2}/>)}
  </group>;
}
function koalaKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const y = stand ? .98 : .5;
  const foot = p => ({p, kids: [{s: [.14, .1, .17], c: d.fur, rows: 4, cols: 9}, {s: [.09, .065, .03], p: [0, -.005, .16], c: d.cream, rows: 3, cols: 8}]});
  const hug = side => limb([[side * .3 * wx, y + .3, .02], [side * .38 * wx, y + .14, .26 * wz], [side * .16, y + (hold ? .16 : .08), .5 * wz]], [.125, .115, .11], d.fur);
  const parts = [
    {s: [.5 * wx, .58, .46 * wz], t: .18, f: .32, p: [0, y, 0], c: d.fur, rows: 7, cols: 14},
    {s: [.24 * wx, .3, .05], p: [0, y + .08, .43 * wz], r: [-.08, 0, 0], c: d.cream, rows: 5, cols: 10},
    ...both(side => stand ? limb([[side * .32 * wx, y + .3, 0], [side * .46 * wx, y + .06, .06], [side * .46 * wx, y - .2, .1]], [.125, .115, .11], d.fur) : hug(side)),
    ...(stand
      ? both(side => [limb([[side * .2 * wx, y - .3, 0], [side * .21 * wx, .32, .02], [side * .21 * wx, .14, .02]], .14, d.fur, false), foot([side * .21 * wx, .09, .12])]).flat()
      : both(side => [limb([[side * .22 * wx, .22, .06], [side * .27 * wx, .15, .42 * wz]], .14, d.fur, false), foot([side * .28 * wx, .1, .52 * wz])]).flat()),
  ];
  const head = {size: [.86, .74, .68], taper: .05, crown: .04};
  return {parts, extras: !stand && !hold && <Sprig at={[.02, y + .12, .52 * wz]}/>, head, headAt: [0, y + 1.04, .06], ears: <KoalaEars d={d}/>, face: <KoalaFace d={d} head={head}/>,
    eyes: [.31, -.01], eyeSize: .08, blush: [.52, -.26], blushSize: .1, neck: {y: y + .42, r: .38 * wx, z: .42 * wz, bow: 1.15}, ribbon: true, hatScale: .8, hatLift: .04,
    flowers: {p: [0, y - .04, .68 * wz], s: .42}, scale: 1.25};
}

// ---------- otter ----------
// Floats on its back, head up to look at you, a scallop shell held on its
// tummy (or the flowers), hind feet up and a thick tail; or stands up on its
// hind feet with the shell held to its chest. A cream muzzle with whiskers.
function OtterFace({d, head}) {
  const r = [.2, .12, .12], c = [0, -.15, at(head, 0, -.15)[2] - .05];
  return <>
    <Shell size={r} position={c} color={d.cream} rows={4} cols={10}/>
    <Dot p={onShell(c, r, 0, -.09, .014)} size={.052} scale={[1.4, .9, .8]} c={d.patch} roughness={.2}/>
    <Mouth c={c} r={r} top={-.14} drop={.035} wide={.07} width={.013}/>
    {both(side => [-.025, .02].map(dy => <Thread key={side + ':' + dy} color={WHISKER} width={.009} points={[onShell(c, r, side * .12, -.14 + dy, .004), [side * .27, -.14 + dy * 1.6, c[2] + .02], [side * .36, -.13 + dy * 2.2, c[2] - .02]]}/>))}
  </>;
}
function OtterEars({d}) {
  return <>
    {both(side => <group key={side} position={[side * .36, .26, -.04]} rotation={[0, 0, -side * .5]}>
      <Shell size={[.085, .075, .05]} color={d.fur} rows={3} cols={8}/>
      <Shell size={[.05, .045, .02]} position={[0, -.005, .04]} color={d.accent} rows={2} cols={7}/>
    </group>)}
    {d.ears === 'tuft' && <Tube points={[[0, .32, 0], [0, .44, .02], [.04, .5, .08], [.07, .46, .12]]} radius={[.04, .022]} color={d.fur} rows={5} cols={6}/>}
  </>;
}
function ScallopShell({p, r = [0, 0, 0], s = .22}) {
  return <group position={p} rotation={r}>
    <Felt shape="scallop" depth={.06} color={SHELL} scale={s}/>
    {[-.5, -.25, 0, .25, .5].map(a => <Thread key={a} color="#ddb6a8" width={.006} points={[[0, -.38 * s, .04 * s + .03], [Math.sin(a) * .2 * s, .05 * s, .045 * s + .03], [Math.sin(a) * .36 * s, .3 * s, .04 * s + .03]]}/>)}
  </group>;
}
function otterKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const head = {size: [.48, .42, .42], taper: .06};
  const tailOf = points => ({points, radius: [.15, .12, .085, .05], rows: 12, cols: 10});
  if (stand) {
    const y = .74;
    const parts = [
      {s: [.36 * wx, .56, .32 * wz], t: .12, f: .25, p: [0, y, 0], c: d.fur, rows: 7, cols: 14},
      {s: [.21 * wx, .36, .05], p: [0, y - .02, .3 * wz], r: [-.05, 0, 0], c: d.cream, rows: 5, cols: 10},
      ...both(side => limb([[side * .26 * wx, y + .28, .04], [side * .2 * wx, y + .18, .26 * wz], [side * .08, y + .2, .36 * wz]], .07, d.fur)),
      ...both(side => ({s: [.07, .06, .07], p: [side * .07, y + .2, .42 * wz], c: d.patch, rows: 3, cols: 7})),
      ...both(side => limb([[side * .16 * wx, y - .4, 0], [side * .17 * wx, .1, .06]], .1, d.fur, false)),
    ];
    const extras = <>
      {both(side => <Felt key={side} shape="webfoot" depth={.14} color={d.patch} position={[side * .17 * wx, .03, .2]} rotation={[Math.PI / 2, 0, -side * .25]} scale={.3}/>)}
      {hold ? null : <ScallopShell p={[0, y + .26, .48 * wz]} r={[-.25, 0, 0]}/>}
    </>;
    return {parts, extras, tail: tailOf([[0, .3, -.26 * wz], [.2, .12, -.48 * wz], [.5, .1, -.5 * wz], [.72, .1, -.3 * wz]]), head, headAt: [0, y + .88, .06],
      ears: <OtterEars d={d}/>, face: <OtterFace d={d} head={head}/>, eyes: [.18, .05], eyeSize: .065, glass: true, blush: [.27, -.1], blushSize: .075,
      neck: {y: y + .46, r: .26 * wx, z: .24 * wz}, ribbon: true, hatScale: .6, flowers: {p: [0, y + .2, .5 * wz], s: .4}, scale: 1.3};
  }
  // On its back: the body lies along x, tummy up, head at the left end looking up at you.
  const y = .3, len = .62 * wz, thick = .3 * wx;
  const parts = [
    {s: [len, .28, thick], t: 0, f: .25, p: [.1, y, 0], c: d.fur, rows: 8, cols: 16},
    {s: [len * .6, .12, thick * .72], p: [.12, y + .2, 0], c: d.cream, rows: 5, cols: 12},
    {s: [.24, .24, .24], p: [-.42, y + .2, .02], c: d.fur, rows: 6, cols: 12},
    ...both(side => limb([[-.36, y + .16, side * .22 * wx], [-.2, y + .32, side * .2], [-.02, y + .36, side * .13]], .065, d.fur)),
    ...both(side => ({s: [.065, .055, .065], p: [.02, y + .38, side * .12], c: d.patch, rows: 3, cols: 7})),
  ];
  const extras = <>
    {both(side => <Felt key={side} shape="webfoot" depth={.14} color={d.patch} position={[.7 * wz, y + .24, side * .13 * wx]} rotation={[0, side * .3, -.55]} scale={.3}/>)}
    {!hold && <ScallopShell p={[.02, y + .42, .03]} r={[-.85, 0, -.35]} s={.36}/>}
  </>;
  return {parts, extras, tail: tailOf([[.68 * wz, y - .02, 0], [.96 * wz, y - .1, -.04], [1.2 * wz, .1, -.02], [1.38 * wz, .07, .06]]), head, headAt: [-.66, y + .5, .1], headRot: [-.28, .3, .12],
    ears: <OtterEars d={d}/>, face: <OtterFace d={d} head={head}/>, eyes: [.18, .05], eyeSize: .065, glass: true, blush: [.27, -.1], blushSize: .075,
    bowAt: {p: [-.5, y + .2, .3], r: [-.3, .35, 0], s: .7}, bandana: {p: [-.5, y + .2, .29], r: [-.25, .35, 0], s: .36},
    neck: {y: y + .28, r: .2, z: .2, at: -.5}, wingsAt: {p: [-.36, y + .02, -.26], r: [0, 0, 0], s: .5}, ribbon: true, hatScale: .6,
    flowers: {p: [-.1, y + .38, .02], r: [-.2, 0, -.15], s: .38}, scale: 1.3};
}

// ---------- hedgehog ----------
// A round little thing in soft prickles (pointed, or round ones), a cream face
// and tummy, a pointed snout with a dark nose, tiny ears and tiny feet.
// Prickles lie back the way a hedgehog's do: each leans from straight out towards `sweep`.
const COAT = ball(150), HOOD = ball(130);
function prickles(center, r, keep, n = COAT, sweep = [0, 0, 0]) {
  const pts = [], dirs = [];
  for (const [x, y, z] of n) {
    if (!keep(x, y, z)) continue;
    const nx = x / r[0], ny = y / r[1], nz = z / r[2], k = Math.hypot(nx, ny, nz);
    pts.push([center[0] + x * r[0], center[1] + y * r[1], center[2] + z * r[2]]); dirs.push([nx / k + sweep[0], ny / k + sweep[1], nz / k + sweep[2]]);
  }
  return {pts, dirs};
}
function Coat({d, center, r, keep, n, size, sweep}) {
  const {pts, dirs} = prickles(center, r, keep, n, sweep);
  if (d.ears === 'nubbly') return <Puffs points={pts.map(([x, y, z], i) => {const k = Math.hypot(...dirs[i]); return [x + dirs[i][0] / k * .02, y + dirs[i][1] / k * .02, z + dirs[i][2] / k * .02];})} size={[size * .55, size * .55, size * .5]} color={d.fur}/>;
  return <Spikes points={pts} dirs={dirs} size={[size * .36, size, size * .36]} color={d.fur}/>;
}
function HedgehogHead({d, head}) {
  const r = head.size, z = at(head, 0, -.1)[2];
  return <>
    {both(side => <group key={side} position={[side * .25, .2, .02]} rotation={[0, 0, -side * .45]}>
      <Shell size={[.08, .075, .05]} color={d.cream} rows={3} cols={8}/>
      <Shell size={[.048, .045, .02]} position={[0, -.004, .04]} color={d.accent} rows={2} cols={7}/>
    </group>)}
    <Coat d={d} center={[0, 0, 0]} r={[r[0] * 1.02, r[1] * 1.02, r[2] * 1.02]} n={HOOD} size={.12} sweep={[0, .3, -.6]} keep={(x, y, z) => y > -.3 && !(z > .2 && y < .42 && Math.abs(x) < .8)}/>
    <group position={[0, -.1, z - .02]} rotation={[Math.PI / 2 - .12, 0, 0]}><Shell shape="cone" size={[.13, .34, .12]} color={d.cream} rows={4} cols={9}/></group>
    <Dot p={[0, -.125, z + .16]} size={.05} scale={[1.25, .9, .9]} c={d.patch} roughness={.18}/>
    <Thread color={THREAD} width={.012} points={[at(head, -.05, -.25, .02), at(head, 0, -.27, .03), at(head, .05, -.25, .02)]}/>
  </>;
}
function hedgehogKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const body = stand ? {c: [0, .44, -.06], r: [.46 * wx, .36, .54 * wz]} : {c: [0, .44, -.04], r: [.5 * wx, .44, .48 * wz]};
  const parts = [
    {s: body.r, f: .3, p: body.c, c: d.fur, rows: 8, cols: 16},
    {s: [.3 * wx, .26, .06], p: [0, body.c[1] - .1, body.c[2] + body.r[2] * .9], r: [-.15, 0, 0], c: d.cream, rows: 5, cols: 10},
    ...(stand
      ? [-1, 1].flatMap(fz => both(side => limb([[side * .2 * wx, body.c[1] - .2, fz * .26 * wz], [side * .21 * wx, .06, fz * .28 * wz]], .075, d.cream)))
      : [...both(side => ({s: [.085, .055, .12], p: [side * .2 * wx, .05, .42 * wz], r: [0, side * .2, 0], c: d.cream, rows: 3, cols: 8})),
         ...both(side => hold
           ? limb([[side * .3 * wx, body.c[1] + .02, .3 * wz], [side * .2 * wx, body.c[1] - .02, .46 * wz], [side * .07, body.c[1], .54 * wz]], .055, d.cream)
           : ({s: [.07, .11, .065], p: [side * .34 * wx, body.c[1] - .08, .32 * wz], r: [.2, 0, side * .5], c: d.cream, rows: 3, cols: 8}))]),
  ];
  const extras = <Coat d={d} center={body.c} r={[body.r[0] * 1.01, body.r[1] * 1.01, body.r[2] * 1.01]} size={.15} sweep={[0, .15, -.45]} keep={(x, y, z) => y > -.3 && !(z > .45 && y < .55)}/>;
  const head = {size: [.42, .36, .36], taper: .08};
  const headAt = stand ? [0, .6, .5 * wz] : [0, .62, .34 * wz];
  return {parts, extras, head, headAt, headColor: d.cream, ears: null, face: <HedgehogHead d={d} head={head}/>, eyes: [.17, .04], eyeSize: .06, glass: true, blush: [.26, -.1], blushSize: .07,
    bowAt: {p: [0, headAt[1] - .3, headAt[2] + .22], r: [-.25, 0, 0], s: .7}, bandana: {p: [0, headAt[1] - .3, headAt[2] + .2], r: [-.2, 0, 0], s: .36},
    neck: {y: headAt[1] - .3, r: .26, z: .24, at: headAt[2] - .1}, ribbon: true, hatScale: .5, hatLift: .1, wreath: {out: .1, size: 1.3, lift: .14},
    // the head sits low on the tummy, so the bouquet leans out past its cheek instead of standing in front of the face
    flowers: {p: [-.08, .22, .66 * wz], r: [.15, 0, .5], s: .34}, scale: 1.55};
}

// ---------- seal pup ----------
// Lies on its tummy, head up, front flippers at its sides and the hind ones
// fanned out behind; or sits up tall on them, and sits up to hug flowers with
// both front flippers. Big glassy eyes, a cream muzzle, a dark nose, and
// whiskers unless plain.
function SealFace({d, head}) {
  const z = at(head, 0, -.15)[2], pad = side => [side * .065, -.17, z - .03];
  return <>
    {both(side => <Shell key={side} size={[.085, .07, .06]} position={pad(side)} color={d.cream} rows={3} cols={9}/>)}
    <Dot p={[0, -.1, z + .02]} size={.045} scale={[1.35, .85, .8]} c={d.patch} roughness={.2}/>
    <Thread color={THREAD} width={.012} points={[at(head, -.04, -.25, .004), at(head, 0, -.26, .006), at(head, .04, -.25, .004)]}/>
    {d.ears === 'whiskers' && both(side => [-.02, .02].map(dy => <Thread key={side + ':' + dy} color={WHISKER} width={.008} points={[[side * .1, -.17 + dy, z + .02], [side * .2, -.165 + dy * 1.6, z - .01], [side * .29, -.16 + dy * 2.2, z - .06]]}/>))}
    {d.ears === 'whiskers' && both(side => [[.05, -.15], [.08, -.18], [.045, -.2]].map(([x, y], i) => <Dot key={side + ':' + i} p={[side * x, y, z + .025]} size={.008} c={THREAD}/>))}
  </>;
}
function Flippers({d, at: [x, y, z], spread = .45, size = .3, up = 0}) {
  return both(side => <Felt key={side} shape="webfoot" depth={.12} color={d.fur} position={[side * x, y, z]} rotation={[-Math.PI / 2 + up, 0, Math.PI + side * spread]} scale={size}/>);
}
function sealKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const head = {size: [.5, .46, .46], taper: .06};
  if (stand || hold) {
    const y = .62, flipper = [{s: [.09, .24, .05], p: [0, -.16, 0], c: d.fur, rows: 5, cols: 8}];
    const parts = [
      {s: [.42 * wx, .6, .4 * wz], t: .15, f: .3, p: [0, y, 0], c: d.fur, rows: 8, cols: 16},
      {s: [.22 * wx, .3, .05], p: [0, y - .06, .37 * wz], r: [-.08, 0, 0], c: d.cream, rows: 5, cols: 10},
      ...both(side => hold
        ? {p: [side * .36 * wx, y + .12, .14], r: aim([-side * .3, -.14, .38 * wz]), kids: flipper}
        : {p: [side * .4 * wx, y + .02, .12], r: [.25, side * .2, side * .3], kids: flipper}),
    ];
    return {parts, extras: <Flippers d={d} at={[.14 * wx, .03, -.42 * wz]} spread={.5}/>, head, headAt: [0, y + .88, .08], ears: null, face: <SealFace d={d} head={head}/>,
      eyes: [.19, .05], eyeSize: .095, glass: true, blush: [.3, -.12], blushSize: .08, neck: {y: y + .48, r: .3 * wx, z: .28 * wz}, ribbon: true, hatScale: .62,
      flowers: {p: [0, y - .3, .5 * wz], s: .4}, scale: 1.35};
  }
  const parts = [
    {s: [.42 * wx, .32, .62 * wz], f: .5, p: [0, .3, -.06], c: d.fur, rows: 8, cols: 16},
    {s: [.3 * wx, .3, .3], p: [0, .5, .34 * wz], c: d.fur, rows: 6, cols: 12},
    ...both(side => ({s: [.09, .045, .22], p: [side * .4 * wx, .07, .26 * wz], r: [.1, side * .55, side * .25], c: d.fur, rows: 4, cols: 9})),
  ];
  return {parts, tail: {points: [[0, .28, -.5 * wz], [0, .22, -.78 * wz], [0, .15, -1.0 * wz]], radius: [.26, .16, .1], cap: false, rows: 8, cols: 12},
    extras: <Flippers d={d} at={[.07, .12, -1.06 * wz]} spread={.55} up={.15}/>, head, headAt: [0, .86, .5 * wz], ears: null, face: <SealFace d={d} head={head}/>,
    eyes: [.19, .05], eyeSize: .095, glass: true, blush: [.3, -.12], blushSize: .08,
    bowAt: {p: [0, .5, .76 * wz], r: [-.35, 0, 0], s: .75}, bandana: {p: [0, .5, .74 * wz], r: [-.3, 0, 0], s: .4},
    neck: {y: .62, r: .28, z: .26, at: .42 * wz, tilt: .35}, wingsAt: {p: [0, .58, -.16], r: [-.35, 0, 0], s: .5}, ribbon: true, hatScale: .62, scale: 1.35};
}

// ---------- lion ----------
// Sits up like a big cat, front legs straight, a tail with a tuft at the end
// round to the front; or stands on all fours. A big mane round the face (or
// none yet, a cub), round ears, a cream muzzle and a pinkish nose. The mane and
// the tail's tuft take the markings colour.
const MANE = (() => {
  const out = [];
  for (let i = 0; i < 18; i++) {const a = i / 18 * Math.PI * 2; out.push([Math.cos(a), Math.sin(a), 0]);}
  for (let i = 0; i < 13; i++) {const a = (i + .5) / 13 * Math.PI * 2; out.push([Math.cos(a) * .82, Math.sin(a) * .84, -.55]);}
  return out;
})();
function LionMane({d, head}) {
  if (d.ears === 'cub') return null;
  const [rx, ry, rz] = head.size;
  return <Puffs points={MANE.map(([x, y, k]) => [x * rx * 1.08, y * ry * 1.06 + .02, k ? k * rz * .9 : -.04 - .14 * (1 - Math.abs(y))])} size={[.21, .21, .17]} color={d.patch}/>;
}
function LionEars({d, head}) {
  return <>
    <LionMane d={d} head={head}/>
    {both(side => <group key={side} position={[side * .5, .5, .04]} rotation={[.1, 0, -side * .45]}>
      <Shell size={[.17, .15, .08]} color={d.fur} rows={4} cols={10}/>
      <Shell size={[.1, .09, .03]} position={[0, -.01, .065]} color={d.accent} rows={3} cols={8}/>
    </group>)}
  </>;
}
function LionFace({d, head}) {
  const z = at(head, 0, -.24)[2];
  return <>
    {both(side => <Shell key={side} size={[.15, .11, .1]} position={[side * .1, -.27, z - .07]} color={d.cream} rows={4} cols={10}/>)}
    <Shell size={[.09, .06, .06]} position={[0, -.37, z - .1]} color={d.cream} rows={3} cols={8}/>
    <Nose head={head} y={-.17} width={.1} c={LION_NOSE}/>
    <Thread color={THREAD} width={.015} points={[[0, -.22, z + .02], [0, -.27, z + .03]]}/>
  </>;
}
function lionKit(d) {
  const [wx, wz] = girth(d), stand = d.pose === 'stand', hold = d.pose === 'hold';
  const paw = p => ({p, s: [.12, .09, .15], c: d.fur, rows: 4, cols: 9});
  const tuft = t => t > .84 ? .11 : .05;
  let parts, headAt, neck, bowAt, tail, flowers;
  if (stand) {
    const by = .72;
    parts = [
      {s: [.5 * wx, .46, .7 * wz], f: .1, p: [0, by, -.12], c: d.fur, rows: 8, cols: 16},
      ...[-1, 1].flatMap(fz => both(side => limb([[side * .24 * wx, by - .1, fz * .36 * wz - .1], [side * .25 * wx, .36, fz * .38 * wz - .1], [side * .25 * wx, .14, fz * .39 * wz - .1]], .12, d.fur, false))),
      ...[-1, 1].flatMap(fz => both(side => paw([side * .25 * wx, .08, fz * .39 * wz - .05]))),
    ];
    headAt = [0, by + .6, .52 * wz];
    neck = {y: by + .26, r: .3 * wx, z: .28, at: .34 * wz, tilt: .5};
    bowAt = {p: [0, by - .04, .9 * wz], r: [-.35, 0, 0], s: .85};
    tail = [[0, by + .1, -.8 * wz], [0, by - .1, -1.0 * wz], [.08, .3, -1.08 * wz], [.18, .2, -1.0 * wz]];
    flowers = {p: [0, by - .1, .94 * wz], s: .42};
  } else {
    const y = .46;
    parts = [
      {s: [.48 * wx, .58, .44 * wz], t: .2, f: .32, p: [0, y, 0], c: d.fur, rows: 7, cols: 14},
      {s: [.13 * wx, .15, .035], p: [0, y + .24, .41 * wz], r: [-.2, 0, 0], c: d.cream, rows: 4, cols: 9},
      ...both(side => hold
        ? limb([[side * .2 * wx, y + .24, .16], [side * .24 * wx, y + .16, .38 * wz], [side * .1, y + .14, .56 * wz]], .1, d.fur)
        : limb([[side * .15 * wx, y + .1, .22 * wz], [side * .16 * wx, .4, .31 * wz], [side * .16 * wx, .14, .34 * wz]], .1, d.fur, false)),
      ...(hold ? [] : both(side => paw([side * .16 * wx, .08, .4 * wz]))),
      ...both(side => ({s: [.22, .21, .3], p: [side * .31 * wx, .21, -.04], r: [0, side * .25, 0], c: d.fur, rows: 5, cols: 10})),
      ...both(side => ({s: [.11, .08, .17], p: [side * .38 * wx, .07, .22 * wz], r: [0, side * .2, 0], c: d.fur, rows: 4, cols: 9})),
    ];
    headAt = [0, y + 1.08, .1];
    neck = {y: y + .44, r: .32 * wx, z: .3 * wz};
    tail = [[0, .2, -.38 * wz], [.3, .08, -.6 * wz], [.62, .08, -.46 * wz], [.76, .1, -.12 * wz]];
    flowers = {p: [0, y - .02, .68 * wz], s: .42};
  }
  const head = {size: [.78, .7, .66], taper: .06};
  return {parts, head, headAt, ears: <LionEars d={d} head={head}/>, face: <LionFace d={d} head={head}/>, eyes: [.26, -.02], eyeSize: .095, blush: [.44, -.2], blushSize: .1,
    tail: {points: tail, radius: tuft, tip: d.patch, tipFrom: .84, rows: 12, cols: 8}, neck, bowAt, ribbon: true, hatScale: .78, hatLift: d.ears === 'cub' ? 0 : .08, wreath: d.ears === 'cub' ? null : {lift: .02, size: 1.15, tilt: .18}, flowers, scale: 1.2};
}

export const WILD_KITS = {koala: koalaKit, otter: otterKit, hedgehog: hedgehogKit, seal: sealKit, lion: lionKit};
