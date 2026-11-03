import React, {useMemo} from 'react';
import {Quaternion, Vector3} from 'three';
import {Shell, Tube, Puffs, Felt, Dot, Thread} from './animal-parts.jsx';
import {both, at, Ribbon} from './animal-face.jsx';

// The later accessories: a crown of little flowers, round glasses, a pair of
// felt wings and a string of pearls; for Halloween a witch's hat, a pumpkin
// basket and bat wings; for Christmas a Christmas hat. None of them needs
// anything new from a kit: the crown and the hats go on top of the head, the
// glasses on the eyes, the wings on the back (or where the kit says), the
// pearls where the scarf or the bow would be, the basket on the floor by the
// doll's side. They take the accessory colour, except the pearls and what
// has its own colours (the pumpkin's orange, the hats' plum and red).

const PEARL = '#f7efe4', LEAF = '#9eaf98', HEART = '#f6dd85', PETAL_LIGHT = '#fff6ec';
const WITCH = '#5a4a66', BAT = '#4d4257', BAT_BONE = '#6f6280', PUMPKIN = '#f0a35e', CARVE = '#4b3a33', HANDLE = '#6b5440', XMAS = '#c65b63', SNOW = '#fbf5ec';
const SWEETS = ['#f3cdd0', '#b5a4c4', '#9eaf98', '#f6dd85'];
const turn = (from, to) => new Quaternion().setFromUnitVectors(new Vector3(...from).normalize(), new Vector3(...to).normalize()).toArray();
// Which way the surface of a head (an egg, taper ignored) faces at a point on it.
const facing = ([rx, ry, rz], [x, y, z]) => [x / (rx * rx), y / (ry * ry), z / (rz * rz)];

function Flower({p, n, size, petal}) {
  const q = useMemo(() => turn([0, 0, 1], n), [n.join(',')]);
  return <group position={p} quaternion={q}>
    {Array.from({length: 5}, (_, i) => {const a = i / 5 * Math.PI * 2; return <Dot key={i} p={[Math.cos(a) * size * .95, Math.sin(a) * size * .95, 0]} size={size * .62} scale={[1, 1, .55]} c={petal} roughness={.55}/>;})}
    <Dot p={[0, 0, size * .3]} size={size * .48} scale={[1, 1, .7]} c={HEART} roughness={.5}/>
  </group>;
}
// A ring of small flowers round the crown of the head, leaves between them, tipped back a little.
// A kit whose head is covered in something (prickles, a mane) can say how to wear it (`wreath`):
// `out` lifts each flower off the head along the surface, `lift` replaces the hat's lift, `tilt`
// tips the ring further forward (+) or back (-), `size` makes the flowers bigger or smaller.
function Wreath({d, kit}) {
  const {head, headAt} = kit, [rx, ry, rz] = head.size, fit = kit.wreath || {};
  const k = Math.min(1.1, Math.max(.5, rx / .9)) * (fit.size || 1), out = fit.out || 0, lift = fit.lift ?? (kit.hatLift || 0);
  const h = ry * (.58 - (head.crown || 0)), w = Math.sqrt(1 - .58 * .58) * 1.04, N = 9;
  // a point on the ring at angle a, pushed `out` along the head's surface
  const place = (a, grow = 1) => {
    const x = Math.cos(a) * rx * w * grow, z = Math.sin(a) * rz * w * grow, n = facing([rx, ry, rz], [x, h, z]), len = Math.hypot(...n);
    return {p: [x + n[0] / len * out, h + lift + n[1] / len * out, z + n[2] / len * out], n};
  };
  const ring = Array.from({length: N}, (_, i) => {
    const a = (i / N) * Math.PI * 2 + Math.PI / 2, {p, n} = place(a);
    return {p, n: n.map((v, j) => j === 1 ? v * .6 + .5 : v), a};
  });
  return <group position={headAt} rotation={kit.headRot || [0, 0, 0]}><group rotation={[-.16 + (fit.tilt || 0), 0, .06]}>
    {ring.map(({p, n}, i) => <Flower key={i} p={p} n={n} size={.105 * k} petal={i % 2 ? PETAL_LIGHT : d.accent}/>)}
    {ring.map(({a}, i) => {const b = a + Math.PI / N, {p} = place(b, 1.01);
      return <group key={'l' + i} position={[p[0], p[1] - .015, p[2]]} rotation={[0, -b + Math.PI / 2, Math.PI / 2]}><Felt shape="leaf" depth={.04} color={LEAF} scale={.24 * k}/></group>;})}
  </group></group>;
}
// Round glasses on the eyes: a frame round each, a bridge over the nose, and the arms back to the sides of the head.
function Glasses({d, kit}) {
  const {head, headAt, eyes: [ex, ey], eyeSize = .1} = kit, R = Math.max(.07, eyeSize * 1.75), tube = Math.max(.012, R * .12);
  const frames = both(side => {const p = at(head, side * ex, ey, .045); return {side, p, q: turn([0, 0, 1], facing(head.size, at(head, side * ex, ey)))};});
  const [l, r] = frames;
  return <group position={headAt} rotation={kit.headRot || [0, 0, 0]}>
    {frames.map(({side, p, q}) => <group key={side} position={p} quaternion={q}>
      <mesh castShadow><torusGeometry args={[R, tube, 8, 28]}/><meshStandardMaterial color={d.accent} roughness={.35}/></mesh>
      <mesh><circleGeometry args={[R, 24]}/><meshStandardMaterial color="#ffffff" transparent opacity={.16} roughness={.1}/></mesh>
    </group>)}
    <Thread color={d.accent} width={tube} points={[[l.p[0] + R * .92, l.p[1] + R * .2, l.p[2]], [0, ey + R * .55, Math.max(l.p[2], r.p[2]) + .03], [r.p[0] - R * .92, r.p[1] + R * .2, r.p[2]]]}/>
    {frames.map(({side, p}) => {const mid = at(head, side * head.size[0] * .72, ey + .02, .02), end = at(head, side * head.size[0] * .88, ey + .03, -.04); return <Thread key={'arm' + side} color={d.accent} width={tube * .9} points={[[p[0] + side * R, p[1], p[2] - .01], mid, end]}/>;})}
  </group>;
}
// A pair of little felt wings: on the back of a doll that sits up, on top of
// the back (by the shoulders) of one lying down or on all fours. Feathered ones
// in the accessory colour with three light stitches, or a bat's, dark with its
// finger bones stitched in.
const FEATHER_LINES = [[.3, .18, -.35], [.55, .2, -.1], [.74, .2, .2]].map(([x, y, a]) => [[x - .12, y + .12, .045], [x, y, .05], [x + .04 * Math.sin(a), y - .14, .045]]);
const BAT_LINES = [[.76, .02], [.5, -.06], [.24, -.08]].map(([x, y]) => [[.1, .14, .045], [(x + .1) / 2, (y + .14) / 2 + .05, .05], [x, y, .045]]);
function Wings({d, kit, shape = 'feather', color = d.accent, lines = FEATHER_LINES, lineColor = PETAL_LIGHT}) {
  const first = kit.parts?.[0] || {}, main = first.s ? first : first.kids?.[0]?.s ? {...first.kids[0], p: first.p} : {s: [.5, .5, .5], p: [0, .5, 0]};
  const [sx, sy, sz] = main.s, [, py, pz = 0] = main.p || [0, .5, 0], lying = sz > sy * 1.2, s = Math.min(1.05, Math.max(.6, sx * 1.35));
  const at0 = kit.wingsAt || (lying ? {p: [0, py + sy * .8, pz + sz * .12], r: [-.3, 0, 0], s: s * .9} : {p: [0, py + sy * .3, pz - sz * .8], r: [0, 0, 0], s});
  return <group position={at0.p} rotation={at0.r || [0, 0, 0]}>
    {both(side => <group key={side} position={[side * .08, 0, 0]} rotation={[.15, side * .38, side * .5]}>
      <group scale={[side * at0.s, at0.s, at0.s]}><Felt shape={shape} depth={.06} color={color}/>
        {lines.map((points, i) => <Thread key={i} color={lineColor} width={.012} points={points}/>)}
      </group>
    </group>)}
  </group>;
}
// Where a hat goes: on top of the head, turning with it, like the beret.
function OnHead({kit, tilt = [.12, 0, -.12], children}) {
  const {head, headAt} = kit;
  return <group position={headAt} rotation={kit.headRot || [0, 0, 0]}><group position={[0, head.size[1] * (1 - (head.crown || 0)) - .12 + (kit.hatLift || 0), .06]} rotation={tilt} scale={kit.hatScale || 1}>{children}</group></group>;
}
// A witch's hat: a wide soft brim, a tall cone bending over at the tip, a band in the accessory colour with a little gold star.
function WitchHat({d, kit}) {
  const cone = [[0, .02, 0], [0, .34, -.01], [.02, .62, -.03], [.13, .83, -.06], [.3, .88, -.08]];
  return <OnHead kit={kit} tilt={[.1, 0, -.1]}>
    <Shell size={[.68, .035, .66]} color={WITCH} rows={4} cols={24}/>
    <Tube points={cone} radius={t => .33 * (1 - t) ** 1.15 + .014} color={WITCH} rows={10} cols={16}/>
    <mesh position={[0, .08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[.312, .042, 10, 36]}/><meshStandardMaterial color={d.accent} roughness={.5}/></mesh>
    <Felt shape="star" depth={.03} color={HEART} position={[0, .085, .35]} rotation={[-.1, 0, 0]} scale={.15}/>
  </OnHead>;
}
// A Christmas hat: a soft red cone flopping over to one side, a fluffy white band and a white pompom on the tip.
function XmasHat({kit}) {
  const cone = [[0, .04, 0], [0, .3, -.02], [.05, .54, -.07], [.22, .66, -.12], [.4, .55, -.15]], tip = cone.at(-1);
  const band = Array.from({length: 18}, (_, i) => {const a = i / 18 * Math.PI * 2; return [Math.cos(a) * .4, .04, Math.sin(a) * .4];});
  return <OnHead kit={kit} tilt={[.08, 0, -.14]}>
    <Tube points={cone} radius={t => .38 * (1 - t) ** 1.05 + .03} color={XMAS} rows={10} cols={16} cap={false}/>
    <Puffs points={band} size={[.11, .095, .11]} color={SNOW}/>
    <Shell size={[.115, .115, .115]} position={tip} color={SNOW} rows={4} cols={8}/>
  </OnHead>;
}
// Where something set down by the doll goes: on the floor at its left side, a little forward, clear of the body; a kit can say otherwise (`sideAt`).
function sideOf(kit, r) {
  if (kit.sideAt) return kit.sideAt;
  const first = kit.parts?.[0] || {}, main = first.s ? first : first.kids?.[0]?.s ? {...first.kids[0], p: first.p} : {s: [.5, .5, .5], p: [0, .5, 0]};
  const [sx, , sz] = main.s, [px = 0, , pz = 0] = main.p || [];
  return {p: [px + sx + r + .06, 0, pz + sz * .25], turn: -.4};
}
// A pumpkin basket set down by the doll: a little carved face on the front, a handle with a bow in the accessory colour, sweets peeping out of the top.
// Drawn a unit across and then scaled, so it is the same size by every kind of doll.
function Pumpkin({d, kit}) {
  const k = .3 / (kit.scale || 1), at0 = sideOf(kit, k);
  const lobes = Array.from({length: 8}, (_, i) => {const a = i / 8 * Math.PI * 2; return [Math.cos(a) * .5, .74, Math.sin(a) * .5];});
  return <group position={at0.p} rotation={[0, at0.turn || 0, 0]} scale={k}>
    <Shell size={[.86, .68, .86]} position={[0, .74, 0]} color={PUMPKIN} rows={6} cols={16}/>
    <Puffs points={lobes} size={[.5, .7, .5]} color={PUMPKIN} rows={4} cols={8}/>
    <Shell size={[.6, .07, .6]} position={[0, 1.38, 0]} color={CARVE} rows={2} cols={12}/>
    {[[-.24, 1.42, .1], [.2, 1.44, -.14], [.02, 1.46, .26], [-.05, 1.4, -.3]].map((p, i) => <Dot key={i} p={p} size={.15} c={SWEETS[i]} roughness={.35}/>)}
    {both(side => <Felt key={side} shape="nose" depth={.05} color={CARVE} position={[side * .3, .92, 1]} rotation={[0, 0, Math.PI]} scale={.36}/>)}
    <Thread color={CARVE} width={.045} points={[[-.42, .58, .94], [-.2, .44, 1.0], [0, .41, 1.01], [.2, .44, 1.0], [.42, .58, .94]]}/>
    <Thread color={HANDLE} width={.055} points={[[-.86, 1.1, 0], [-.6, 1.8, 0], [0, 2.1, 0], [.6, 1.8, 0], [.86, 1.1, 0]]}/>
    <Ribbon color={d.accent} p={[.46, 1.9, .04]} r={[0, 0, -.5]} s={1.3}/>
  </group>;
}
// A string of pearls: round the neck, a little lower at the front; or, on a doll whose chin hides its neck, draped under the chin.
function Pearls({kit}) {
  const {neck = {y: 0, r: .3, z: .3}} = kit, size = Math.max(.035, Math.min(.06, neck.r * .13));
  if (kit.bandana && kit.bowAt) {
    const n = 11, w = .34 * (kit.bandana.s / .42), dip = .16 * (kit.bandana.s / .42);
    return <group position={kit.bowAt.p} rotation={kit.bowAt.r}>
      {Array.from({length: n}, (_, i) => {const t = i / (n - 1) * 2 - 1; return <Dot key={i} p={[t * w, .06 - dip * (1 - t * t), -Math.abs(t) * .08]} size={size} c={PEARL} roughness={.18}/>;})}
    </group>;
  }
  const r = neck.r + size * .9, n = Math.max(12, Math.round(Math.PI * 2 * r / (size * 2.15)));
  return <group position={[0, neck.y, neck.at ?? 0]} rotation={[neck.tilt || 0, 0, 0]}>
    {Array.from({length: n}, (_, i) => {const a = i / n * Math.PI * 2, front = (1 + Math.sin(a)) / 2; return <Dot key={i} p={[Math.cos(a) * r, -front * front * .09, Math.sin(a) * (neck.z + size * .9)]} size={size} c={PEARL} roughness={.18}/>;})}
  </group>;
}

export const TRINKETS = ['wreath', 'glasses', 'wings', 'pearls', 'witchhat', 'pumpkin', 'batwings', 'xmashat'];
export function Trinket({id, d, kit}) {
  if (id === 'wreath') return <Wreath d={d} kit={kit}/>;
  if (id === 'glasses') return <Glasses d={d} kit={kit}/>;
  if (id === 'wings') return <Wings d={d} kit={kit}/>;
  if (id === 'pearls') return <Pearls kit={kit}/>;
  if (id === 'witchhat') return <WitchHat d={d} kit={kit}/>;
  if (id === 'pumpkin') return <Pumpkin d={d} kit={kit}/>;
  if (id === 'batwings') return <Wings d={d} kit={kit} shape="bat" color={BAT} lines={BAT_LINES} lineColor={BAT_BONE}/>;
  if (id === 'xmashat') return <XmasHat kit={kit}/>;
  return null;
}
