import {CabrioleLeg} from './rococo-details.jsx';
import React from 'react';
import {CatmullRomCurve3,Vector3,Color} from 'three';
import {freshAnimal,normalizeAnimal,wornList} from './animal-state.js';
import {HandFlowers} from './florist.jsx';
import {Shell,Tube,Patch,Felt,Dot,Thread,CraftBlock,Puffs} from './animal-parts.jsx';
import {NOSE,THREAD,PINK,WHISKER,both,at,onShell,Eyes,Blush,Nose,CatMouth,Mouth,Ribbon,Collar} from './animal-face.jsx';
import {MORE_KITS} from './animal-kits.jsx';
import {WILD_KITS} from './animal-kits-wild.jsx';
import {Trinket,TRINKETS} from './animal-trinkets.jsx';
export {CraftBlock};

// The dolls. Each kind has a kit: where its body, head, limbs and tail go
// for each pose, what its face is like, and where a bow, scarf or hat sits.
// Every part is a soft shell of little bricks (animal-parts.jsx).

// One part: a shell, a soft tube ({tube}), puffs of wool ({puffs}), or a group of them ({p, r, kids}).
function Part({s, p = [0, 0, 0], r = [0, 0, 0], c, t = 0, f = 0, shape, bend, span, rows = 6, cols = 12, kids, tube, puffs}) {
  if (kids) return <group position={p} rotation={r}>{kids.map((k, i) => <Part key={i} {...k}/>)}</group>;
  if (tube) return <Tube {...tube} color={c}/>;
  if (puffs) return <Puffs points={puffs} size={s} color={c} position={p} rotation={r}/>;
  return <Shell size={s} shape={shape} taper={t} flat={f} bend={bend} span={span} color={c} position={p} rotation={r} rows={rows} cols={cols}/>;
}

// Faces. Each draws its muzzle, nose and mouth on the front of its head.
function BearFace({d, head, panda}) {
  const r = [.35, .24, .26], c = [0, -.33, at(head, 0, -.33)[2] - .14];
  return <>
    <Shell size={r} position={c} color={d.cream} rows={5} cols={12}/>
    <Dot p={onShell(c, r, 0, -.23, .015)} size={.092} scale={[1.25, .78, .72]} c={panda ? d.patch : NOSE}/>
    <Mouth c={c} r={r} top={-.27} drop={.09} wide={.13}/>
    {panda && both(side => <Shell key={side} size={[.17, .23, .07]} position={at(head, side * .33, -.07, -.035)} rotation={[0, side * .34, side * .55]} color={d.patch} rows={4} cols={10}/>)}
  </>;
}
function PuffFace({d, head, whiskers, stripes}) {
  const r = [.28, .16, .15], c = [0, -.31, at(head, 0, -.31)[2] - .1];
  const dark = stripes ? '#' + new Color(d.fur).multiplyScalar(.78).getHexString() : null;
  return <>
    {stripes && [-.13, 0, .13].map(x => <Thread key={x} color={dark} width={.034} points={[at(head, x * 1.15, .66 - Math.abs(x) * .5, .012), at(head, x, .5 - Math.abs(x) * .4, .015), at(head, x * .9, .36 - Math.abs(x) * .3, .012)]}/>)}
    <Shell size={r} position={c} color={d.cream} rows={4} cols={12}/>
    <Dot p={onShell(c, r, 0, -.215, .01)} size={.056} scale={[1.35, .85, .8]} c={PINK}/>
    <Mouth c={c} r={r} top={-.25} drop={.06} wide={.1} width={.018}/>
    {whiskers && both(side => [-.035, .035].map(dy => <Thread key={side + ':' + dy} color={WHISKER} width={.013} points={[at(head, side * .31, -.3 + dy, .012), at(head, side * .45, -.295 + dy * 1.5, .012), at(head, side * .59, -.285 + dy * 2.1, .012)]}/>))}
  </>;
}
function FoxFace({d, head}) {
  // Orange on top; a white panel from the nose rising to the cheeks, a tuft
  // sticking out from each cheek, and a short pointed snout.
  const z = at(head, 0, -.3)[2];
  return <>
    <Patch size={head.size} taper={head.taper} crown={head.crown} color={d.cream} width={.155} top={s => .63 - .12 * Math.pow(Math.abs(s), 1.3)} bottom={() => .88} rows={4} cols={10}/>
    {both(side => <group key={side} position={[side * .86, -.33, .2]} rotation={[0, side * .3, -side * (Math.PI / 2 + .38)]}><Shell shape="cone" size={[.15, .34, .12]} color={d.cream} rows={4} cols={8}/></group>)}
    <group position={[0, -.3, z - .08]} rotation={[Math.PI / 2 - .1, 0, 0]}><Shell shape="cone" size={[.2, .34, .15]} color={d.cream} rows={4} cols={10}/></group>
    <Dot p={[0, -.265, z + .11]} size={.064} scale={[1.25, .85, .8]} c={NOSE}/>
    <Thread color={THREAD} width={.017} points={[[-.06, -.35, z + .03], [0, -.372, z + .06], [.06, -.35, z + .03]]}/>
  </>;
}
function DragonFace({d, head}) {
  // A short rounded snout with two nostrils and a small smile.
  const r = [.25, .19, .32], c = [0, -.12, at(head, 0, -.12)[2] - .1];
  return <>
    <Shell size={r} position={c} color={d.fur} rows={5} cols={12}/>
    {both(side => <Dot key={side} p={onShell(c, r, side * .075, -.06, .005)} size={.024} c={THREAD}/>)}
    <Thread color={THREAD} width={.017} points={[onShell(c, r, -.11, -.18, .006), onShell(c, r, 0, -.21, .008), onShell(c, r, .11, -.18, .006)]}/>
  </>;
}

// Ears, in the head's frame. Inner ears take the accent colour. A bunny
// wears its bow at the root of an ear.
function Ears({d, kind, bow}) {
  const fur = d.species === 'panda' ? d.patch : d.fur, inner = d.species === 'panda' ? d.patch : d.accent;
  return both(side => {
    if (kind === 'round' || kind === 'small') return <group key={side} position={[side * .7, .62, -.06]} rotation={[.12, 0, -side * .36]} scale={kind === 'small' ? .78 : 1}>
      <Shell size={[.34, .32, .16]} color={fur} rows={5} cols={12}/><Shell size={[.21, .2, .05]} position={[0, -.01, .12]} color={inner} rows={4} cols={10}/>
    </group>;
    if (kind === 'cat') return <group key={side} position={[side * .47, .55, -.04]} rotation={[-.06, 0, -side * .4]}>
      <Shell shape="cone" size={[.27, .43, .13]} color={d.fur} rows={5} cols={10}/>
      <Shell shape="cone" size={[.17, .29, .04]} position={[0, -.05, .095]} color={d.accent} rows={4} cols={8}/>
    </group>;
    // Folded ears tip forward and down over the head like little caps, lining underneath.
    if (kind === 'folded') return <group key={side} position={[side * .44, .56, .06]} rotation={[1.15, 0, -side * .42]}>
      <Shell shape="cone" size={[.26, .34, .12]} color={d.fur} rows={5} cols={10}/>
    </group>;
    if (kind === 'fox' || kind === 'fennec') {const big = kind === 'fennec', s = big ? [.42, .9, .15] : [.33, .72, .15];
      return <group key={side} position={[side * (big ? .62 : .56), big ? .78 : .7, -.08]} rotation={[-.06, 0, -side * (big ? .42 : .3)]}>
        <Shell shape="cone" size={s} span={[0, .34]} color={d.patch} rows={6} cols={10}/><Shell shape="cone" size={s} span={[.34, 1]} color={d.fur} rows={6} cols={10}/>
        <Shell shape="cone" size={[s[0] * .58, s[1] * .62, .05]} position={[0, -s[1] * .12, .1]} color={d.cream} rows={4} cols={8}/>
      </group>;}
    // Long ears standing up, one leaning out a little more than the other.
    if (kind === 'rabbit') return <group key={side} position={[side * .25, .5, -.04]} rotation={[-.12, 0, -side * (side === 1 ? .3 : .14)]}>
      <Shell size={[.17, .5, .1]} taper={-.12} position={[0, .46, 0]} color={d.fur} rows={7} cols={10}/>
      <Shell size={[.1, .38, .03]} taper={-.12} position={[0, .47, .08]} color={d.accent} rows={6} cols={8}/>
      {bow && side === 1 && <Ribbon color={d.accent} p={[0, .2, .1]} r={[0, 0, .2]} s={.82}/>}
    </group>;
    // Lop ears: from the top of the head down past the cheeks, lining turned to the front.
    if (kind === 'floppy') return <group key={side} position={[side * .56, .38, .12]} rotation={[-.2, side * .36, side * .16]}>
      <Shell size={[.21, .76, .085]} taper={.3} position={[0, -.7, 0]} color={d.fur} rows={9} cols={10}/>
      <Shell size={[.14, .6, .03]} taper={.3} position={[0, -.74, .068]} color={d.accent} rows={7} cols={8}/>
      {bow && side === 1 && <Ribbon color={d.accent} p={[0, -.08, .11]} r={[0, 0, -.3]} s={1}/>}
    </group>;
    if (kind === 'horns' || kind === 'nubs') return <group key={side} position={[side * .17, .3, -.08]} rotation={[-1.05, 0, -side * .25]}>
      <Shell shape="cone" size={kind === 'nubs' ? [.07, .17, .07] : [.07, .3, .07]} color={d.patch} rows={4} cols={8}/>
    </group>;
    return null;
  });
}

// ---------- kits ----------
// Numbers are in the doll's own units: it sits on y = 0 and faces +z.

function bearKit(d) {
  const panda = d.species === 'panda', wx = d.body === 'chubby' ? 1.16 : 1, wz = d.body === 'chubby' ? 1.1 : 1;
  const stand = d.pose === 'stand', hold = d.pose === 'hold', limb = panda ? d.patch : d.fur;
  const y = stand ? 1.2 : .7;
  const parts = [
    {s: [.74 * wx, .86, .64 * wz], t: .14, f: .25, p: [0, y, 0], c: d.fur, rows: 8, cols: 16},
    {s: [.39 * wx, .43, .1], p: [0, y - .02, .64 * wz - .07], r: [-.06, 0, 0], c: d.cream, rows: 6, cols: 12},
    {s: [.17, .17, .15], p: [0, y - .24, -.62 * wz], c: d.fur, rows: 4, cols: 9},
    ...both(side => hold
      ? {s: [.2, .36, .22], p: [side * .4 * wx, y + .4, .48 * wz], r: [-1.2, 0, -side * .45], c: limb}
      : {s: [.2, .36, .22], p: [side * .62 * wx, y + .44, .1], r: [stand ? -.14 : -.4, 0, side * (stand ? .24 : .34)], c: limb}),
    ...both(side => stand
      ? {p: [side * .32 * wx, .3, .02], kids: [{s: [.27, .3, .29], p: [0, .12, 0], c: limb}, {s: [.26, .15, .34], p: [0, -.13, .1], c: limb}, {s: [.17, .1, .05], p: [0, -.12, .42], c: d.cream, rows: 4, cols: 10}]}
      : {p: [side * .36 * wx, .3, .3 * wz], r: [-.1, side * .14, 0], kids: [{s: [.3, .3, .44], c: limb}, {s: [.19, .21, .05], p: [0, .01, .42], c: d.cream, rows: 4, cols: 10}]}),
  ];
  const head = panda ? {size: [1.1, .88, .84], taper: .08} : {size: [1.07, .9, .84], taper: .06};
  return {parts, head, headAt: [0, y + 1.5, .02], face: <BearFace d={d} head={head} panda={panda}/>, eyes: panda ? [.33, -.07] : [.32, -.06], eyeSize: .112, blush: [.58, -.27],
    neck: {y: y + .8, r: .5 * wx, z: .5 * wz}, hatScale: 1, flowers: {p: [0, y + .1, .98], s: .46}};
}

// The bunny and the cat are the soft long-limbed kind: a big head on a small
// body, arms that dangle at its sides and long legs stretched out in front.
// Both are drawn a little smaller and scaled up to stand with the others.
const LIMB = {rows: 8, cols: 8};
function dangly(d, {y, wx, wz, arm, leg, hip, foot}) {
  const stand = d.pose === 'stand', hold = d.pose === 'hold', limb = (points, radius, cap = true) => ({tube: {points, radius, cap, ...LIMB}, c: d.fur});
  const arms = side => hold
    ? [[side * .24 * wx, y + .32, .02], [side * .36 * wx, y + .2, .22], [side * .26 * wx, y + .15, .44], [side * .1, y + .2, .56]]
    : stand ? [[side * .26 * wx, y + .32, .02], [side * .44 * wx, y + .14, .06], [side * .5 * wx, y - .14, .1], [side * .49 * wx, y - .38, .12]]
    : [[side * .26 * wx, y + .32, .02], [side * .43 * wx, y + .16, .1], [side * .5 * wx, y - .08, .18], [side * .49 * wx, y - .26, .26]];
  return [
    ...both(side => limb(arms(side), arm)),
    ...both(side => stand ? limb([[side * hip * wx, y - .2, 0], [side * (hip + .02) * wx, (y - .2) / 2 + .1, .02], [side * (hip + .03) * wx, .2, .02]], leg, false)
      : limb([[side * hip * wx, .22, .04], [side * (hip + .05) * wx, .15, .42], [side * (hip + .09) * wx, .14, .76 * wz]], leg, false)),
    ...both(side => stand ? foot(side, [side * (hip + .03) * wx, .15, .12], [Math.PI / 2, 0, 0]) : foot(side, [side * (hip + .1) * wx, .2, .86 * wz], [-.12, side * .12, 0])),
  ];
}

// A lop bunny: ears hanging down past its cheeks, small wide-set eyes, a
// pink nose and no mouth, big round feet and a pompom behind.
function rabbitKit(d) {
  const wx = d.body === 'chubby' ? 1.16 : 1, wz = d.body === 'chubby' ? 1.1 : 1, stand = d.pose === 'stand';
  const y = stand ? 1.0 : .44, top = y + .62;
  const foot = (side, p, r) => ({p, r, kids: [{s: [.17, .22, .15], c: d.fur, rows: 5, cols: 10}, {s: [.11, .14, .03], p: [0, -.01, .14], c: d.cream, rows: 4, cols: 8}]});
  const parts = [
    {s: [.46 * wx, .62, .42 * wz], t: .18, f: .32, p: [0, y, 0], c: d.fur, rows: 7, cols: 14},
    ...dangly(d, {y, wx, wz, arm: [.088, .08, .095], leg: .11, hip: .16, foot}),
  ];
  // The pompom: a ball with a few smaller tufts so it reads as fluff.
  parts.push({p: [0, stand ? y - .26 : .26, -.44 * wz], kids: [{s: [.16, .16, .14], c: d.cream, rows: 5, cols: 10}, ...[[.09, .05, -.03], [-.09, .04, -.02], [0, .1, -.02], [.05, -.08, -.03], [-.06, -.07, -.04]].map(p => ({s: [.085, .085, .085], p, c: d.cream, rows: 3, cols: 7}))]});
  const head = {size: [.8, .7, .68], taper: .12};
  return {parts, head, headAt: [0, top + .56, .04], face: <Nose head={head} y={-.2} width={.085}/>, eyes: [.33, -.12], eyeSize: .075, blush: [.43, -.26], blushSize: .11,
    neck: {y: top - .2, r: .3 * wx, z: .27 * wz}, earBow: true, ribbon: true, hatScale: .82, flowers: {p: [0, y + .24, .72], s: .42}, scale: 1.2};
}

// A cat: a big round head with pointed ears, big glassy eyes, a little ω
// mouth, and a long thin tail lying round to the front.
function catKit(d) {
  const wx = d.body === 'chubby' ? 1.16 : 1, wz = d.body === 'chubby' ? 1.1 : 1, stand = d.pose === 'stand';
  const y = stand ? 1.0 : .44, top = y + .6;
  const foot = (side, p, r) => ({p, r, kids: [{s: [.125, .14, .12], c: d.fur, rows: 4, cols: 9}, {s: [.075, .085, .03], p: [0, -.01, .11], c: d.cream, rows: 3, cols: 8}]});
  const parts = [
    {s: [.42 * wx, .6, .4 * wz], t: .16, f: .3, p: [0, y, 0], c: d.fur, rows: 7, cols: 14},
    ...dangly(d, {y, wx, wz, arm: [.08, .072, .086], leg: .095, hip: .15, foot}),
  ];
  const sitTail = [[0, .22, -.3], [.3, .08, -.56], [.7, .07, -.5], [.92, .07, -.14], [.88, .1, .24], [.74, .24, .44]];
  const standTail = [[0, y - .3, -.34], [.16, y - .62, -.56], [.36, .22, -.64], [.62, .08, -.5], [.76, .08, -.2], [.72, .2, .02]];
  const head = {size: [.84, .74, .7], taper: .05, crown: .08};
  return {parts, tail: {points: stand ? standTail : sitTail, radius: [.07, .06, .052], rows: 16, cols: 8}, head, headAt: [0, top + .58, .04],
    face: <><Nose head={head} y={-.18} width={.075}/><CatMouth head={head} y={-.235}/></>, eyes: [.32, -.05], eyeSize: .125, glass: true, blush: [.45, -.21], blushSize: .11,
    neck: {y: top - .2, r: .3 * wx, z: .27 * wz}, collar: true, ribbon: true, hatScale: .86, flowers: {p: [0, y + .24, .72], s: .42}, scale: 1.2};
}

function foxKit(d) {
  const fox = true, wx = d.body === 'chubby' ? 1.16 : 1, wz = d.body === 'chubby' ? 1.1 : 1, stand = d.pose === 'stand', hold = d.pose === 'hold';
  const y = stand ? 1.22 : .78, sock = fox ? d.patch : d.fur;
  const leg = (side, p, r = [0, 0, 0]) => ({p, r, kids: [{s: [.15, .42, .17], c: d.fur}, {s: [.155, .19, .175], p: [0, -.25, .005], c: sock, rows: 4, cols: 10}]});
  const parts = [
    {s: [.56 * wx, .86, .52 * wz], t: .12, f: .15, p: [0, y, 0], c: d.fur, rows: 8, cols: 16},
    {s: [(fox ? .34 : .28) * wx, fox ? .52 : .46, .08], p: [0, y + .1, .52 * wz - .05], r: [-.05, 0, 0], c: d.cream, rows: 6, cols: 12},
    ...both(side => hold ? leg(side, [side * .2 * wx, y + .2, .5 * wz], [-1.15, 0, -side * .22])
      : stand ? leg(side, [side * .47 * wx, y + .3, .14], [-.12, 0, side * .22])
      : leg(side, [side * .2 * wx, .44, .38 * wz], [.06, 0, side * .03])),
    ...both(side => stand
      ? {p: [side * .22 * wx, .36, 0], kids: [{s: [.19, .34, .22], c: d.fur}, {s: [.16, .09, .26], p: [0, -.27, .12], c: sock, rows: 4, cols: 10}]}
      : {p: [side * .38 * wx, .32, -.06], kids: [{s: [.27, .3, .36], r: [0, side * .25, 0], c: d.fur}, {s: [.13, .09, .24], p: [side * .04, -.24, .32], c: sock, rows: 4, cols: 10}]}),
  ];
  const head = fox ? {size: [1.08, .84, .78], taper: -.1} : {size: [1.0, .84, .79], taper: .12, crown: .12};
  // The tail curls round the right side to the front when sitting; standing, it rests on the floor beside the feet.
  const sitTail = fox ? [[0, .32, -.46], [.42, .2, -.66], [.8, .2, -.32], [.82, .2, .16], [.56, .22, .52]] : [[0, .3, -.46], [.36, .13, -.58], [.66, .1, -.24], [.64, .1, .2], [.4, .12, .5], [.18, .15, .6]];
  const standTail = fox ? [[0, y - .5, -.46], [.3, y - .8, -.8], [.66, .3, -.8], [.9, .24, -.38]] : [[0, y - .46, -.44], [.24, y - .74, -.72], [.55, .2, -.72], [.74, .12, -.38], [.7, .12, -.06]];
  const tail = fox
    ? {points: stand ? standTail : sitTail, radius: t => .09 + .21 * Math.pow(Math.sin(Math.PI * Math.min(1, .15 + t * .8)), .7), tip: d.cream, tipFrom: .78, rows: 12, cols: 12}
    : {points: stand ? standTail : sitTail, radius: t => .1 - .025 * t, rows: 12, cols: 9};
  return {parts, tail, head, headAt: [0, y + (fox ? 1.45 : 1.42), .02],
    face: fox ? <FoxFace d={d} head={head}/> : <PuffFace d={d} head={head} whiskers/>, eyes: fox ? [.31, -.01] : [.33, -.07], eyeSize: fox ? .1 : .115, blush: fox ? [.55, -.23] : [.56, -.27],
    neck: {y: y + .78, r: .42 * wx, z: .42 * wz}, hatScale: .92, flowers: {p: [0, y + .1, .95], s: .42}};
}

// The dragon lies on its tummy, head up on a raised neck, felt wings lifted
// off its back, a row of soft spikes, stubby legs splayed out to the sides,
// and a long tail curling off to one side with a felt spade on the end.
function dragonKit(d) {
  const wx = d.body === 'chubby' ? 1.15 : 1, hold = d.pose === 'hold', up = d.pose === 'stand' ? .14 : 0;
  const bodyAt = [0, .24, -.12], body = [.52 * wx, .36, .92];
  const backY = z => {const k = (z - bodyAt[2]) / body[2]; return bodyAt[1] + body[1] * Math.sqrt(Math.max(0, 1 - k * k));};
  const parts = [
    {s: body, f: .45, p: bodyAt, c: d.fur, rows: 8, cols: 18},
    {s: [.27, .27, .42], p: [0, .46 + up * .5, .66], r: [-.6 - up, 0, 0], c: d.fur, rows: 6, cols: 12},
    ...both(side => hold
      ? {s: [.15, .12, .3], p: [side * .26 * wx, .14, 1.02], r: [0, side * .25, 0], c: d.fur, rows: 4, cols: 10}
      : {s: [.3, .12, .17], p: [side * .43 * wx, .1, .45], r: [0, -side * .5, 0], c: d.fur, rows: 4, cols: 10}),
    ...both(side => ({s: [.31, .12, .19], p: [side * .45 * wx, .1, -.62], r: [0, side * .55, 0], c: d.fur, rows: 4, cols: 10})),
    // Soft spikes down the spine, from the neck to the tail.
    ...[.62, .38, .14, -.1, -.34, -.58, -.82].map((z, i) => {const y = z > .5 ? .7 + up * .6 : backY(z); return {s: [.055, .12 - i * .006, .1], p: [0, y + .06, z], r: [-.35, 0, 0], c: d.patch, rows: 3, cols: 8};}),
  ];
  const points = [[0, .28, -.96], [.04, .22, -1.34], [.28, .17, -1.68], [.7, .14, -1.84], [1.06, .14, -1.7]];
  const curve = new CatmullRomCurve3(points.map(p => new Vector3(...p))), end = curve.getPointAt(1), dir = curve.getTangentAt(1);
  const tail = {points, radius: t => .25 - .17 * Math.pow(t, .8), rows: 12, cols: 10, cap: false};
  const extras = <>
    {both(side => <group key={side} position={[side * .18 * wx, .58, .26]} rotation={[0, side * .32, side * .62]}>
      <group rotation={[-Math.PI / 2 + .1, 0, 0]} scale={[side * .8, .8, .8]}><Felt shape="wing" depth={.045} color={d.patch}/></group>
    </group>)}
    <Felt shape="spade" depth={.05} color={d.patch} position={[end.x, end.y, end.z]} rotation={[-Math.PI / 2, 0, Math.atan2(dir.x, dir.z) - Math.PI]} scale={.62}/>
  </>;
  const head = {size: [.44, .4, .42], taper: .05};
  return {parts, tail, extras, head, headAt: [0, .94 + up, 1.0], face: <DragonFace d={d} head={head}/>, eyes: [.19, .08], eyeSize: .075, blush: [.31, -.09],
    neck: {y: .78 + up, r: .3, z: .3, tilt: .6, at: .62}, hatScale: .6, flowers: {p: [0, .3, 1.32], s: .4}};
}

const KITS = {bear: bearKit, panda: bearKit, rabbit: rabbitKit, cat: catKit, fox: foxKit, dragon: dragonKit, ...MORE_KITS, ...WILD_KITS};

// One thing the doll wears (`id`); a doll wearing several gets one of these for each.
function Accessory({d, kit, id}) {
  const {neck = {y: 0, r: .3, z: .3}, head, headAt, hatScale} = kit, z = neck.at ?? 0;
  if (TRINKETS.includes(id)) return <Trinket id={id} d={d} kit={kit}/>;
  // The hat sits on top of the head and turns with it.
  if (id === 'hat') return <group position={headAt} rotation={kit.headRot || [0, 0, 0]}><group position={[0, head.size[1] * (1 - (head.crown || 0)) - .12 + (kit.hatLift || 0), .06]} rotation={[.12, 0, -.12]} scale={hatScale}>
    <mesh position={[0, .01, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[.36, .055, 10, 40]}/><meshStandardMaterial color={d.accent} roughness={.5}/></mesh>
    <Shell size={[.49, .19, .46]} position={[.025, .12, 0]} color={d.accent} rows={5} cols={18}/>
    <CraftBlock p={[.04, .34, 0]} s={[.06, .14, .06]} r={[0, 0, -.2]} c={d.accent} radius={.02}/>
  </group></group>;
  if (id === 'bow' && kit.earBow) return null;
  // A doll lying down or on all fours wears its bow where the kit says, facing front.
  if (id === 'bow' && kit.ribbon && kit.bowAt) return <Ribbon color={d.accent} p={kit.bowAt.p} r={kit.bowAt.r} s={.9 * (kit.bowAt.s || 1)}/>;
  if (id === 'bow' && kit.ribbon) return <group position={[0, neck.y, z]} rotation={[neck.tilt || 0, 0, 0]}>
    {kit.collar && <Collar y={0} r={neck.r} color={d.cream}/>}
    <Ribbon color={d.accent} p={[0, .02, neck.z + .08]} s={.9 * (neck.bow || 1)}/>
  </group>;
  if (id === 'bow') return <group position={[0, neck.y, z + neck.z + .06]} rotation={[neck.tilt ? -.2 : 0, 0, 0]}>
    {both(side => <CraftBlock key={side} p={[side * .15, 0, 0]} s={[.26, .22, .11]} r={[0, 0, side * .22]} c={d.accent} radius={.045}/>)}
    <Dot p={[0, 0, .06]} size={.085} c={d.accent} roughness={.4}/>
  </group>;
  // A doll whose head sits low on its body wears its scarf as a bandana tied under the chin.
  if (id === 'scarf' && kit.bandana) return <Felt shape="bandana" depth={.12} color={d.accent} position={kit.bandana.p} rotation={kit.bandana.r} scale={kit.bandana.s}/>;
  if (id === 'scarf') return <group position={[0, neck.y, z]} rotation={[neck.tilt || 0, 0, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[neck.r, .11, 10, 36]}/><meshStandardMaterial color={d.accent} roughness={.7}/></mesh>
    <CraftBlock p={[neck.r * .42, -.26, neck.z + .02]} s={[.22, .52, .09]} r={[.18, 0, .1]} c={d.accent} radius={.035}/>
  </group>;
  return null;
}

function Doll({d, part}) {
  const kit = (KITS[d.species] || bearKit)(d), wear = wornList(d.accessory), worn = wear.map(id => <Accessory key={id} id={id} d={d} kit={kit}/>);
  const head = <group position={kit.headAt} rotation={kit.headRot || [0, 0, 0]}>
    <Shell size={kit.head.size} taper={kit.head.taper} crown={kit.head.crown} color={kit.headColor || d.fur} rows={9} cols={18}/>
    {'ears' in kit ? kit.ears : <Ears d={d} kind={d.ears} bow={kit.earBow && wear.includes('bow')}/>}
    {kit.face}
    <Eyes head={kit.head} at={kit.eyes} size={kit.eyeSize} d={d} glass={kit.glass} under={kit.eyeUnder || kit.headColor || d.fur}/>
    <Blush head={kit.head} at={kit.blush} d={d} size={kit.blushSize}/>
  </group>;
  const scale = kit.scale || 1;
  // Just the head, for a close picture of the face; or head and shoulders, to show what's worn at the neck.
  if (part === 'head') return <group scale={scale}>{head}</group>;
  if (part === 'bust') return <group scale={scale}>{head}{(kit.bust || [{...kit.parts[0], span: [0, .42]}]).map((p, i) => <Part key={i} {...p}/>)}{worn}</group>;
  return <group scale={scale}>
    {kit.parts.map((p, i) => <Part key={i} {...p}/>)}
    {kit.tail && <Tube color={d.fur} {...kit.tail}/>}
    {kit.extras}
    {head}
    {d.pose === 'hold' && d.heldFlowers?.length > 0 && <group position={kit.flowers.p} rotation={kit.flowers.r || [0, 0, 0]} scale={kit.flowers.s}><HandFlowers stems={d.heldFlowers} wrapColor={d.heldWrapColor}/></group>}
    {worn}
  </group>;
}

export function AnimalModel({item, onClick, part}) {const d = normalizeAnimal(item); return <group onClick={onClick}><Doll d={d} part={part}/></group>;}
export function WorkbenchModel({onClick,onStorage,drawers=true,displayAnimal=true}){return <group onClick={onClick}>
 <CraftBlock p={[0,.98,0]} s={[3.6,.14,1.4]} radius={.045}/><CraftBlock p={[0,1.055,0]} s={[2.1,.025,1.02]} c="#d2aeb6" radius={.015}/><CraftBlock p={[0,1.071,0]} s={[2.04,.012,.96]} c="#f4e7dc" radius={.01}/>
 {[-1.4,1.4].map(x=><group key={x} onClick={onStorage?e=>{e.stopPropagation();if(e.delta<5)onStorage();}:undefined}>{drawers?<CraftBlock p={[x,.48,0]} s={[.55,.87,1.13]}/>:<>{[-.48,.48].map(z=><CabrioleLeg key={z} x={x} z={z} height={.92}/>)}<CraftBlock p={[x,.20,0]} s={[.07,.06,1.04]} c="#b78b45"/></>}{drawers&&[.25,.52,.79].map(y=><group key={y}><CraftBlock p={[x,y,.59]} s={[.49,.23,.055]} c="#e8d5c7" radius={.012}/><CraftBlock p={[x,y,.625]} s={[.43,.18,.018]} c="#fff3e1" radius={.005}/><CraftBlock p={[x,y,.65]} s={[.15,.023,.025]} c="#b29268" radius={.008}/></group>)}</group>)}
 <mesh position={[0,1.11,0]}><cylinderGeometry args={[.47,.47,.065,48]}/><meshStandardMaterial color="#fff5e6" roughness={.3}/></mesh>
 {displayAnimal&&<group userData={{tintExclude:true}} position={[0,1.15,0]} scale={.17}><AnimalModel item={{...freshAnimal(), accessory: 'none'}}/></group>}
 <group position={[-1.37,1.08,-.28]}><mesh><cylinderGeometry args={[.18,.19,.05,24]}/><meshStandardMaterial color="#b89870"/></mesh><CraftBlock p={[0,.32,0]} s={[.035,.65,.035]} c="#b89870"/><CraftBlock p={[.13,.63,0]} s={[.32,.035,.035]} c="#b89870" r={[0,0,-.3]}/><mesh position={[.27,.58,0]}><coneGeometry args={[.18,.2,32,1,true]}/><meshStandardMaterial color="#fff5e5" side={2}/></mesh><mesh position={[.27,.48,0]}><circleGeometry args={[.16,24]}/><meshStandardMaterial color="#ffe3ac" emissive="#ffd597" emissiveIntensity={1.1} side={2}/></mesh><pointLight position={[.27,.45,.05]} intensity={.12} distance={1.8} color="#ffe0b2"/></group>
 <group position={[1.2,1.09,.12]}><CraftBlock s={[.65,.055,.6]} c="#cfabb6"/>{[-.2,0,.2].map(x=><CraftBlock key={x} p={[x,.05,0]} s={[.012,.09,.57]} c="#fff2df"/>)}{[-.18,.18].map(z=><CraftBlock key={z} p={[0,.05,z]} s={[.62,.09,.012]}/>)}{['#c299b5','#9dae9a','#dbb880'].map((c,i)=><CraftBlock key={c} p={[-.21+i*.21,.07,.05]} s={[.12,.09,.12]} c={c}/>)}</group>
 </group>;}
