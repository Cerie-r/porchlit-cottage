import React from 'react';
import {Color} from 'three';
import {Felt,Dot,Thread,onEgg} from './animal-parts.jsx';

// The bits every doll's face is made of: where a point on the head is, eyes,
// blush, a felt nose, embroidered mouths, and the satin bow and lace collar.

export const NOSE = '#5e3c34', THREAD = '#5a4134', BLUSH = '#df8d9f', PINK = '#d98d9c', WHISKER = '#8b6c5c';
export const both = make => [make(-1), make(1)];

// A head is an egg: {size, taper, crown}. `at` finds a point on its front.
export const at = (head, x, y, lift = 0) => onEgg(head.size, head, x, y, lift);
// A point on the front of a shell centred at c with radii r.
export const onShell = ([cx, cy, cz], [rx, ry, rz], x, y, lift = 0) => [x, y, cz + rz * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2)) + lift];

// Eyes, blush and the expression, laid on the front of the head. Glass eyes
// are shinier, with a second little light. On dark fur the eyes turn amber
// round a dark pupil, or they'd disappear into the face.
export const EYE = '#2f2422', IRIS = '#dcaa5a';
export const isDark = hex => {const c = new Color(hex); return .2126 * c.r + .7152 * c.g + .0722 * c.b < .1;};
export function Eyes({head, at: [ex, ey], size = .1, d, glass, under = d.fur}) {
  const amber = isDark(under);
  return both(side => {
    const x = side * ex, shut = d.expression === 'sleepy' || d.expression === 'happy' || (d.expression === 'wink' && side === 1);
    if (shut) {
      const lift = (d.expression === 'happy' ? .54 : -.27) * size;
      return <Thread key={side} width={size * .29} color={amber ? IRIS : THREAD} points={[at(head, x - size, ey + size * .09, .012), at(head, x, ey + lift, .02), at(head, x + size, ey + size * .09, .012)]}/>;
    }
    const p = at(head, x, ey, .02), q = (dx, dy, dz) => [p[0] + dx * size, p[1] + dy * size, p[2] + dz * size];
    return <group key={side}>
      <Dot p={p} size={size} scale={[1, 1.1, .8]} c={amber ? IRIS : EYE} roughness={glass ? .12 : .22}/>
      {amber && <Dot p={q(0, -.04, .42)} size={size * .68} scale={[.9, 1.05, .7]} c={EYE} roughness={.12}/>}
      <Dot p={q(-.29, .4, .62)} size={size * (glass ? .33 : .27)} c="#fff9ee"/>
      {glass && <Dot p={q(.3, -.34, .6)} size={size * .14} c="#fff9ee"/>}
    </group>;
  });
}
export function Blush({head, at: [bx, by], d, size = .13}) {
  if (d.blush === 'none') return null;
  return both(side => <Dot key={side} p={at(head, side * bx, by, -.03)} size={size} scale={[1, d.blush === 'rosy' ? .7 : .52, .3]} c={d.blush === 'rosy' ? BLUSH : d.accent} roughness={.6}/>);
}
// A small felt nose, turned to follow the face; and a cat's little ω mouth under it.
export const faceTilt = (head, y) => Math.atan2(-y / head.size[1] ** 2, at(head, 0, y)[2] / head.size[2] ** 2);
export function Nose({head, y, width, c = PINK}) {
  return <Felt shape="nose" depth={.16} color={c} position={at(head, 0, y, .004)} rotation={[faceTilt(head, y), 0, 0]} scale={width}/>;
}
export function CatMouth({head, y, wide = .075}) {
  const p = (x, dy) => at(head, x, y + dy, .008);
  return both(side => <Thread key={side} color={THREAD} width={.014} points={[p(0, 0), p(side * wide * .48, -wide * .46), p(side * wide, -wide * .06)]}/>);
}
// The little embroidered mouth: a short line down from the nose, then a curl each way.
export function Mouth({c, r, top, drop, wide, width = .025}) {
  const p = (x, y) => onShell(c, r, x, y, .008);
  return <>
    <Thread color={THREAD} width={width} points={[p(0, top), p(0, top - drop)]}/>
    {both(side => <Thread key={side} color={THREAD} width={width} points={[p(0, top - drop), p(side * wide * .5, top - drop - wide * .35), p(side * wide, top - drop - wide * .08)]}/>)}
  </>;
}

// A satin bow: two loops, two short tails and a knot.
export function Ribbon({color, p = [0, 0, 0], r = [0, 0, 0], s = 1}) {
  const satin = <meshStandardMaterial color={color} roughness={.34}/>;
  return <group position={p} rotation={r} scale={s}>
    {both(side => <group key={side}>
      <mesh position={[side * .15, .025, 0]} rotation={[0, side * .25, side * .32]} scale={[.17, .11, .065]} castShadow><sphereGeometry args={[1, 20, 12]}/>{satin}</mesh>
      <mesh position={[side * .07, -.12, -.01]} rotation={[0, 0, side * .38]} scale={[.05, .11, .03]} castShadow><sphereGeometry args={[1, 14, 8]}/>{satin}</mesh>
    </group>)}
    <mesh position={[0, 0, .035]} scale={[.065, .07, .05]} castShadow><sphereGeometry args={[1, 16, 10]}/>{satin}</mesh>
  </group>;
}
// A lace collar: little scallops round the neck, lying on the shoulders and
// fanning out a bit.
export function Collar({y, r, z = 0, color}) {
  return <group position={[0, y, z]}>
    {Array.from({length: 18}, (_, i) => <group key={i} rotation={[0, i / 18 * Math.PI * 2, 0]}>
      <mesh position={[0, -.04, r + .035]} rotation={[-.8, 0, 0]} scale={[.095, .08, .022]} castShadow><sphereGeometry args={[1, 14, 8]}/><meshStandardMaterial color={color} roughness={.62}/></mesh>
    </group>)}
  </group>;
}
