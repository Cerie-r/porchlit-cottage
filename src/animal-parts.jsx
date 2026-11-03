import React,{useMemo,useEffect} from 'react';
import {BufferGeometry,Float32BufferAttribute,Uint32BufferAttribute,Color,Vector3,Quaternion,CatmullRomCurve3,Shape,ExtrudeGeometry,DoubleSide} from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {MiniMaterial} from './miniature-finish.jsx';

// Pieces the dolls are made of. Every soft part is a shell of small curved
// bricks with real gaps between them, over a slightly darker lining, so the
// gaps read as soft seams and never let the background through.

// A surface given as P(u, v) -> [x, y, z], u going round (0..1) and v along
// (0..1), laid in rows of bricks, each row shifted half a brick.
function brickGeometry(P, rows, cols, color, open = false) {
  const base = new Color(color), a = new Vector3(), b = new Vector3(), n = new Vector3(), G = 3;
  const normal = (u, v) => {
    const e = 1e-3, vc = Math.min(1 - 2e-3, Math.max(2e-3, v));
    a.fromArray(P(u + e, vc)).sub(b.fromArray(P(u - e, vc)));
    b.fromArray(P(u, vc + e)).sub(n.fromArray(P(u, vc - e)));
    return n.crossVectors(a, b).normalize().toArray();
  };
  // An open piece (a patch) doesn't wrap round: its staggered rows are cut at the edges instead.
  const bricks = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols + (open ? 1 : 0); c++) {
    const shift = (r % 2) * .5 - (open ? .5 * (r % 2) * 2 : 0);
    let u0 = (c + .025 + shift) / cols, u1 = (c + .975 + shift) / cols;
    if (open) {u0 = Math.max(0, u0); u1 = Math.min(1, u1); if (u1 - u0 < .2 / cols) continue;}
    bricks.push([u0, u1, (r + .035) / rows, (r + .965) / rows, 1 + ((r * 7 + c * 11) % 7 - 3) * .012]);
  }
  // Each brick is a 3x3 grid of quads: work out its 4x4 corners once, then lay the triangles.
  const count = bricks.length * G * G * 6, pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const gp = [], gn = [], gu = [];
  let w = 0;
  for (const [u0, u1, v0, v1, k] of bricks) {
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      const u = u0 + (u1 - u0) * i / G, v = v0 + (v1 - v0) * j / G, q = j * (G + 1) + i;
      gp[q] = P(u, v); gn[q] = normal(u, v); gu[q] = [u, v];
    }
    const tr = base.r * k, tg = base.g * k, tb = base.b * k;
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const q = j * (G + 1) + i;
      for (const t of [q, q + 1, q + G + 2, q, q + G + 2, q + G + 1]) {
        pos.set(gp[t], w * 3); nor.set(gn[t], w * 3); uv.set(gu[t], w * 2); col[w * 3] = tr; col[w * 3 + 1] = tg; col[w * 3 + 2] = tb; w++;
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  return g;
}

// The same surface without gaps, for the lining underneath.
function smoothGeometry(P, segU, segV) {
  const pos = [], normals = [], index = [], a = new Vector3(), b = new Vector3(), n = new Vector3();
  for (let j = 0; j <= segV; j++) for (let i = 0; i <= segU; i++) {
    const u = i / segU, v = Math.min(1 - 2e-3, Math.max(2e-3, j / segV)), e = 1e-3;
    pos.push(...P(u, j / segV));
    a.fromArray(P(u + e, v)).sub(b.fromArray(P(u - e, v))); b.fromArray(P(u, v + e)).sub(n.fromArray(P(u, v - e)));
    normals.push(...n.crossVectors(a, b).normalize().toArray());
  }
  for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
    const p = j * (segU + 1) + i, q = p + segU + 1;
    index.push(p, p + 1, q + 1, p, q + 1, q);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new Float32BufferAttribute(normals, 3)); g.setIndex(index);
  return g;
}

// An egg: an ellipsoid whose width grows towards the bottom when taper > 0
// (a pear) and towards the top when taper < 0. `lift` pushes the widest
// part up or down. `flat` squashes the underside so it sits.
// `crown` flattens the top the same way (a cat's wide head).
const eggY = (ry, t, flat, crown) => t < 0 ? ry * t * (1 - flat * t * t) : ry * t * (1 - crown * t * t);
export const egg = ([rx, ry, rz], {taper = 0, flat = 0, crown = 0} = {}) => (u, v) => {
  const phi = v * Math.PI, t = Math.cos(phi), s = Math.sin(phi), a = u * Math.PI * 2, f = 1 - taper * t;
  return [rx * f * s * Math.cos(a), eggY(ry, t, flat, crown), rz * f * s * Math.sin(a)];
};
// The point on the front of an egg at x, y (in its own frame), pushed out by `lift`.
export function onEgg([rx, ry, rz], {taper = 0, flat = 0, crown = 0} = {}, x, y, lift = 0) {
  let lo = -1, hi = 1;
  for (let i = 0; i < 40; i++) {const m = (lo + hi) / 2; if (eggY(ry, m, flat, crown) < y) lo = m; else hi = m;}
  const t = (lo + hi) / 2, s = Math.sqrt(Math.max(0, 1 - t * t)), f = 1 - taper * t, w = rx * f * s, dz = rz * f * s;
  return [x, y, dz * Math.sqrt(Math.max(0, 1 - (x / Math.max(w, 1e-6)) ** 2)) + lift];
}
// A soft cone, tip up: ears. `bend` tips it forward.
export const cone = ([w, h, d], {bend = 0} = {}) => (u, v) => {
  const a = u * Math.PI * 2, r = Math.pow(Math.sin(v * Math.PI / 2), .8);
  return [w * r * Math.cos(a), h * (.5 - v), d * r * Math.sin(a) + bend * (1 - v) ** 2];
};
const shrunk = (P, k) => (u, v) => P(u, v).map(x => x * k);
const cut = (P, [v0, v1]) => (u, v) => P(u, v0 + (v1 - v0) * v);

// Geometry is shared: the doll on the table and its pictures in the tray use
// the same parts, so each is built once. Parts nobody shows any more are kept
// a while in case they come back, then let go.
const shared = new Map(), idle = [];
const IDLE_KEEP = 120;
function trim() {while (idle.length > IDLE_KEEP) {const old = idle.shift(), o = shared.get(old); if (o && o.users <= 0) {shared.delete(old); drop(o);}}}
function drop(entry) {if (entry.made.dispose) entry.made.dispose(); else for (const g of Object.values(entry.made)) g.dispose?.();}
function useGeometries(make, key) {
  let entry = shared.get(key);
  if (!entry) {entry = {made: make(), users: 0}; shared.set(key, entry); idle.push(key); trim();}
  useEffect(() => {
    const e = shared.get(key) || entry; if (!shared.has(key)) shared.set(key, e);
    e.users++; const i = idle.indexOf(key); if (i >= 0) idle.splice(i, 1);
    return () => {
      e.users--;
      if (e.users > 0) return;
      idle.push(key); trim();
    };
  }, [key]);
  return entry.made;
}

// A soft part: an egg (or a cone) of bricks over its lining. `span` keeps
// only part of it, from the top: a cone's tip in another colour.
export function Shell({size = [1, 1, 1], shape = 'egg', taper = 0, flat = 0, crown = 0, bend = 0, span = [0, 1], color, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, rows = 7, cols = 14}) {
  const key = [...size, shape, taper, flat, crown, bend, ...span, rows, cols, color].join('|');
  const {bricks, lining} = useGeometries(() => {
    const P = cut(shape === 'cone' ? cone(size, {bend}) : egg(size, {taper, flat, crown}), span);
    return {bricks: brickGeometry(P, Math.max(1, Math.ceil(rows * 1.3 * (span[1] - span[0]))), Math.ceil(cols * 1.3), color), lining: smoothGeometry(shrunk(P, .994), 32, 20)};
  }, key);
  const shade = useMemo(() => '#' + new Color(color).multiplyScalar(.955).getHexString(), [color]);
  return <group position={position} rotation={rotation} scale={scale}>
    <mesh geometry={bricks} castShadow receiveShadow><MiniMaterial vertexColors finish="fabric"/></mesh>
    <mesh geometry={lining} receiveShadow><MiniMaterial color={shade} finish="fabric"/></mesh>
  </group>;
}

// How thick a tube is at t: a number, a list of thicknesses spread evenly
// from end to end, or a function of t.
const thickness = radius => typeof radius === 'function' ? radius : typeof radius === 'number' ? () => radius
  : t => {const x = Math.min(1, Math.max(0, t)) * (radius.length - 1), i = Math.min(radius.length - 2, Math.floor(x)); return radius[i] + (radius[i + 1] - radius[i]) * (x - i);};

// Many little puffs of one size (a lamb's wool) as a single piece: the same
// brick ball copied to every point, with one lining under them all. Drawing
// them as one keeps a woolly doll as quick to draw as any other.
function copies(g, points) {
  const out = new BufferGeometry(), n = g.attributes.position.count;
  for (const [name, attr] of Object.entries(g.attributes)) {
    const size = attr.itemSize, src = attr.array, dst = new Float32Array(src.length * points.length);
    points.forEach((p, k) => {
      dst.set(src, k * src.length);
      if (name === 'position') for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) dst[k * src.length + i * 3 + j] += p[j];
    });
    out.setAttribute(name, new Float32BufferAttribute(dst, size));
  }
  if (g.index) {
    const src = g.index.array, dst = new Uint32Array(src.length * points.length);
    points.forEach((p, k) => {for (let i = 0; i < src.length; i++) dst[k * src.length + i] = src[i] + k * n;});
    out.setIndex(new Uint32BufferAttribute(dst, 1));
  }
  g.dispose();
  return out;
}
export function Puffs({points, size = [.13, .13, .12], color, rows = 2, cols = 5, position = [0, 0, 0], rotation = [0, 0, 0]}) {
  const key = 'puffs|' + JSON.stringify(points) + [...size, color, rows, cols].join('|');
  const {bricks, lining} = useGeometries(() => {
    const P = egg(size);
    return {bricks: copies(brickGeometry(P, Math.ceil(rows * 1.3), Math.ceil(cols * 1.3), color), points), lining: copies(smoothGeometry(shrunk(P, .994), 12, 8), points)};
  }, key);
  const shade = useMemo(() => '#' + new Color(color).multiplyScalar(.955).getHexString(), [color]);
  return <group position={position} rotation={rotation}>
    <mesh geometry={bricks} castShadow receiveShadow><MiniMaterial vertexColors finish="fabric"/></mesh>
    <mesh geometry={lining} receiveShadow><MiniMaterial color={shade} finish="fabric"/></mesh>
  </group>;
}

// Many little cones (a hedgehog's prickles) as one piece: the same brick cone
// copied to every point and turned to point along its own direction, its base
// sunk a little into whatever it grows from.
function turnedCopies(g, points, dirs, lift) {
  const up = new Vector3(0, 1, 0), v = new Vector3(), n = g.attributes.position.count;
  const out = new BufferGeometry(), turns = points.map((p, k) => {const d = new Vector3(...dirs[k]).normalize(); return {q: new Quaternion().setFromUnitVectors(up, d), at: new Vector3(...p).addScaledVector(d, lift)};});
  for (const [name, attr] of Object.entries(g.attributes)) {
    const size = attr.itemSize, src = attr.array, dst = new Float32Array(src.length * points.length);
    turns.forEach(({q: t, at}, k) => {
      if (name !== 'position' && name !== 'normal') {dst.set(src, k * src.length); return;}
      for (let i = 0; i < n; i++) {v.fromArray(src, i * 3).applyQuaternion(t); if (name === 'position') v.add(at); v.toArray(dst, k * src.length + i * 3);}
    });
    out.setAttribute(name, new Float32BufferAttribute(dst, size));
  }
  if (g.index) {
    const src = g.index.array, dst = new Uint32Array(src.length * points.length);
    points.forEach((p, k) => {for (let i = 0; i < src.length; i++) dst[k * src.length + i] = src[i] + k * n;});
    out.setIndex(new Uint32BufferAttribute(dst, 1));
  }
  g.dispose();
  return out;
}
export function Spikes({points, dirs, size = [.045, .13, .045], color, rows = 1, cols = 4, position = [0, 0, 0], rotation = [0, 0, 0]}) {
  const key = 'spikes|' + JSON.stringify(points) + JSON.stringify(dirs) + [...size, color, rows, cols].join('|');
  const {bricks, lining} = useGeometries(() => {
    const P = cone(size), lift = size[1] * .38;
    return {bricks: turnedCopies(brickGeometry(P, Math.ceil(rows * 1.3), Math.ceil(cols * 1.3), color), points, dirs, lift), lining: turnedCopies(smoothGeometry(shrunk(P, .994), 10, 6), points, dirs, lift)};
  }, key);
  const shade = useMemo(() => '#' + new Color(color).multiplyScalar(.955).getHexString(), [color]);
  return <group position={position} rotation={rotation}>
    <mesh geometry={bricks} castShadow receiveShadow><MiniMaterial vertexColors finish="fabric"/></mesh>
    <mesh geometry={lining} receiveShadow><MiniMaterial color={shade} finish="fabric"/></mesh>
  </group>;
}

// A soft tube along points (tails, limbs, a dragon's neck), as thick as
// radius at t (0 at the first point, 1 at the last), ending in a round tip.
export function Tube({points, radius: given = .1, color, rows = 10, cols = 9, tip = color, tipFrom = 1, cap = true}) {
  const key = JSON.stringify(points) + (typeof given === 'function' ? given.toString() : JSON.stringify(given)) + [rows, cols, color, tip, tipFrom].join('|');
  const radius = thickness(given);
  const parts = useGeometries(() => {
    const curve = new CatmullRomCurve3(points.map(p => new Vector3(...p))), steps = 200;
    const frames = curve.computeFrenetFrames(steps, false), N = new Vector3(), B = new Vector3();
    // Blend between the two nearest frames, so bricks don't shear where one frame hands over to the next.
    const frameAt = v => {const x = Math.min(steps, Math.max(0, v * steps)), i = Math.min(steps - 1, Math.floor(x)), k = x - i;
      N.copy(frames.normals[i]).lerp(frames.normals[i + 1], k).normalize(); B.copy(frames.binormals[i]).lerp(frames.binormals[i + 1], k).normalize(); return [N, B];};
    const surface = (from, to, k = 1) => (u, v) => {
      const t = from + (to - from) * v, c = curve.getPointAt(t), [N, B] = frameAt(t), a = u * Math.PI * 2, r = radius(t) * k;
      return [c.x + r * (Math.cos(a) * N.x + Math.sin(a) * B.x), c.y + r * (Math.cos(a) * N.y + Math.sin(a) * B.y), c.z + r * (Math.cos(a) * N.z + Math.sin(a) * B.z)];
    };
    const end = curve.getPointAt(1).toArray(), endR = radius(1);
    const runs = tipFrom < 1 ? [[0, tipFrom, color], [tipFrom, 1, tip]] : [[0, 1, color]];
    return {
      runs: runs.map(([from, to, c]) => ({c, bricks: brickGeometry(surface(from, to), Math.max(2, Math.round(rows * (to - from))), cols, c), lining: smoothGeometry(surface(from, to, .97), 24, 24)})),
      end, endR,
      dispose() {this.runs.forEach(r => {r.bricks.dispose(); r.lining.dispose();});},
    };
  }, key);
  return <group>
    {parts.runs.map((r, i) => <group key={i}>
      <mesh geometry={r.bricks} castShadow receiveShadow><MiniMaterial vertexColors finish="fabric"/></mesh>
      <mesh geometry={r.lining}><MiniMaterial color={r.c} finish="fabric"/></mesh>
    </group>)}
    {cap && <Shell size={[parts.endR, parts.endR, parts.endR]} position={parts.end} color={tip} rows={4} cols={8}/>}
  </group>;
}

// A panel sewn onto an egg (a fox's white cheeks, a belly): the same egg as
// the part underneath, a hair bigger, kept only between `top(s)` and
// `bottom(s)` (fractions from the top, s going -1..1 across) over `width` of
// the way round either side of the front.
export function Patch({size, taper = 0, flat = 0, crown = 0, color, width = .15, top = () => .5, bottom = () => .9, lift = 1.012, rows = 5, cols = 12, position = [0, 0, 0], rotation = [0, 0, 0]}) {
  const key = [...size, taper, flat, crown, color, width, top.toString(), bottom.toString(), lift, rows, cols].join('|');
  const {bricks, lining} = useGeometries(() => {
    const on = k => {const E = egg(size.map(x => x * k), {taper, flat, crown}); return (u, v) => {const s = u * 2 - 1, a = top(s), b = bottom(s); return E(.25 + s * width, a + (b - a) * v);};};
    return {bricks: brickGeometry(on(lift), rows, cols, color, true), lining: smoothGeometry(on(1 + (lift - 1) * .45), 24, 12)};
  }, key);
  const shade = useMemo(() => '#' + new Color(color).multiplyScalar(.95).getHexString(), [color]);
  return <group position={position} rotation={rotation}>
    <mesh geometry={bricks} castShadow receiveShadow><MiniMaterial vertexColors finish="fabric"/></mesh>
    <mesh geometry={lining} receiveShadow><MiniMaterial color={shade} finish="fabric"/></mesh>
  </group>;
}

// Flat felt pieces, a little thick with soft edges: a dragon's wing (root at
// the origin, reaching out along +x, three scallops on its trailing edge),
// the spade on the end of its tail (pointing +y), a webbed foot, a bandana
// and a nose.
const FELT = {
  wing() {
    const s = new Shape();
    s.moveTo(0, 0); s.quadraticCurveTo(.3, .4, .9, .5); s.quadraticCurveTo(1.04, .5, .98, .38);
    s.quadraticCurveTo(.86, .34, .78, .2); s.quadraticCurveTo(.7, .3, .58, .22);
    s.quadraticCurveTo(.5, .14, .46, .04); s.quadraticCurveTo(.38, .14, .26, .08);
    s.quadraticCurveTo(.14, .02, .1, -.06); s.quadraticCurveTo(.04, -.02, 0, 0);
    return s;
  },
  spade() {
    const s = new Shape();
    s.moveTo(0, 0); s.quadraticCurveTo(.3, .02, .22, .36); s.quadraticCurveTo(.1, .28, 0, .52);
    s.quadraticCurveTo(-.1, .28, -.22, .36); s.quadraticCurveTo(-.3, .02, 0, 0);
    return s;
  },
  // A webbed foot, toes pointing +y: three round toes with webbing between.
  webfoot() {
    const s = new Shape();
    s.moveTo(0, -.12); s.quadraticCurveTo(-.3, .06, -.34, .4); s.quadraticCurveTo(-.27, .5, -.17, .41);
    s.quadraticCurveTo(-.09, .56, 0, .45); s.quadraticCurveTo(.09, .56, .17, .41); s.quadraticCurveTo(.27, .5, .34, .4);
    s.quadraticCurveTo(.3, .06, 0, -.12);
    return s;
  },
  // A bandana: a soft triangle hanging down from a straight top edge, a unit wide.
  bandana() {
    const s = new Shape();
    s.moveTo(-.5, .3); s.quadraticCurveTo(0, .36, .5, .3); s.quadraticCurveTo(.32, -.04, .05, -.34);
    s.quadraticCurveTo(0, -.4, -.05, -.34); s.quadraticCurveTo(-.32, -.04, -.5, .3);
    return s;
  },
  // A scallop shell, hinge at the bottom: a fan with a wavy top edge, a unit wide.
  scallop() {
    const s = new Shape();
    s.moveTo(-.1, -.42); s.lineTo(-.46, .04);
    for (let i = 0; i < 5; i++) {const a0 = Math.PI * (1 - i / 5), a1 = Math.PI * (1 - (i + .5) / 5), a2 = Math.PI * (1 - (i + 1) / 5);
      s.quadraticCurveTo(.52 * Math.cos(a1), .42 * Math.sin(a1) + .02, .46 * Math.cos(a2), .38 * Math.sin(a2) + (i === 4 ? .04 : 0));}
    s.lineTo(.1, -.42); s.quadraticCurveTo(0, -.48, -.1, -.42);
    return s;
  },
  // A little feathered wing: root at the origin, a round top reaching out along +x,
  // three soft feather tips along the bottom edge.
  feather() {
    const s = new Shape();
    s.moveTo(0, .02); s.quadraticCurveTo(.04, .44, .42, .5); s.quadraticCurveTo(.8, .54, .9, .3);
    s.quadraticCurveTo(.96, .12, .82, .04); s.quadraticCurveTo(.8, -.12, .62, -.08);
    s.quadraticCurveTo(.56, -.24, .38, -.16); s.quadraticCurveTo(.3, -.28, .16, -.16);
    s.quadraticCurveTo(.02, -.16, 0, .02);
    return s;
  },
  // A leaf pointing +y, a unit long.
  leaf() {
    const s = new Shape();
    s.moveTo(0, -.5); s.quadraticCurveTo(.3, -.1, 0, .5); s.quadraticCurveTo(-.3, -.1, 0, -.5);
    return s;
  },
  // A bat's wing: root at the origin, the leading edge rising out along +x to a point,
  // the trailing edge scalloped back between three finger tips.
  bat() {
    const s = new Shape();
    s.moveTo(0, .1); s.quadraticCurveTo(.45, .5, .95, .5);
    s.quadraticCurveTo(.8, .28, .78, -.02); s.quadraticCurveTo(.66, .14, .5, -.1);
    s.quadraticCurveTo(.38, .06, .22, -.12); s.quadraticCurveTo(.12, .04, 0, -.04);
    s.closePath();
    return s;
  },
  // A five-pointed star, a unit across.
  star() {
    const s = new Shape();
    for (let i = 0; i < 10; i++) {const a = Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? .22 : .5, x = Math.cos(a) * k, y = Math.sin(a) * k; if (i) s.lineTo(x, y); else s.moveTo(x, y);}
    s.closePath();
    return s;
  },
  // A small nose: a soft triangle pointing down, a unit wide.
  nose() {
    const s = new Shape();
    s.moveTo(-.38, .34); s.quadraticCurveTo(0, .4, .38, .34); s.quadraticCurveTo(.56, .3, .46, .14);
    s.quadraticCurveTo(.2, -.26, .06, -.38); s.quadraticCurveTo(0, -.44, -.06, -.38);
    s.quadraticCurveTo(-.2, -.26, -.46, .14); s.quadraticCurveTo(-.56, .3, -.38, .34);
    return s;
  },
};
export function Felt({shape, depth = .05, color, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1}) {
  const g = useMemo(() => {const geo = new ExtrudeGeometry(FELT[shape](), {depth, bevelEnabled: true, bevelThickness: depth * .5, bevelSize: depth * .5, bevelSegments: 3, curveSegments: 12}); geo.translate(0, 0, -depth / 2); return geo;}, [shape, depth]);
  useEffect(() => () => g.dispose(), [g]);
  return <mesh geometry={g} position={position} rotation={rotation} scale={scale} castShadow receiveShadow><MiniMaterial color={color} finish="fabric" side={DoubleSide}/></mesh>;
}

export function CraftBlock({p = [0, 0, 0], s = [1, 1, 1], c = '#f6ead8', r = [0, 0, 0], radius = .025}) {
  const g = useMemo(() => new RoundedBoxGeometry(...s, 2, radius), [...s, radius]);
  return <mesh position={p} rotation={r} geometry={g} castShadow receiveShadow><meshStandardMaterial color={c} roughness={.36}/></mesh>;
}

// A bead: eyes, noses.
export function Dot({p, size = .08, c = '#362a2b', scale = [1, 1, 1], roughness = .22}) {
  return <mesh position={p} scale={scale} castShadow><sphereGeometry args={[size, 20, 12]}/><meshStandardMaterial color={c} roughness={roughness}/></mesh>;
}

// Embroidered thread: mouths, closed eyes, whiskers.
export function Thread({points, color = '#594132', width = .025}) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map(p => new Vector3(...p))), [JSON.stringify(points)]);
  return <mesh><tubeGeometry args={[curve, 24, width, 6, false]}/><meshStandardMaterial color={color} roughness={.5}/></mesh>;
}

// Where a point on the front of an ellipsoid head is: given x and y on the
// head, the z that sits on its surface, pushed out by `lift`.
export const onHead = ([rx, ry, rz], x, y, lift = 0) => [x, y, rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (y / ry) ** 2)) + lift];
