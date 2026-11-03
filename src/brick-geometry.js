import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {PARTS,PLATE,BASE,ROLES,footprint,STUD_SIZE} from './brick-recipe.js';

// Drawing a recipe. One stud is one unit here; the baseplate's middle is the
// origin. Every part is built centred on its own footprint, standing on y = 0,
// w along its own x and d along its own z, then turned and flipped into place.
const GAP = .025; // the seam between neighbouring parts
export const STUD = {r: .3, h: .17};
const cache = new Map();
export const cached = (key, make) => {if (!cache.has(key)) cache.set(key, make()); return cache.get(key);};

const lift = (g, y) => {g.translate(0, y, 0); return g;};
function box(w, d, H) {return lift(new RoundedBoxGeometry(w - 2 * GAP, H - GAP, d - 2 * GAP, 2, .035), (H - GAP) / 2);}
function cylinder(r, H) {return lift(new THREE.CylinderGeometry(r - GAP, r - GAP, H - GAP, 32), (H - GAP) / 2);}
// High at the back (its own -z), sloping down to a thin lip at the front.
function slope(w, d, H) {
  const s = new THREE.Shape(), b = d / 2 - GAP, f = -d / 2 + GAP;
  s.moveTo(f, 0); s.lineTo(b, 0); s.lineTo(b, H - GAP); s.lineTo(b - 1 + 2 * GAP, H - GAP); s.lineTo(f, .16); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth: w - 2 * GAP, bevelEnabled: false});
  g.rotateY(Math.PI / 2); g.translate(-(w - 2 * GAP) / 2, 0, 0); g.computeVertexNormals(); return g;
}
// A one-stud-deep wall with a rounded opening between two legs a stud wide,
// leaving a plate's thickness over the top.
function arch(w, d, H) {
  const s = new THREE.Shape(), a = w / 2 - 1, ry = H - PLATE, half = w / 2 - GAP;
  s.moveTo(-half, 0); s.lineTo(-a, 0); s.absellipse(0, 0, a, ry, Math.PI, 0, true); s.lineTo(half, 0); s.lineTo(half, H - GAP); s.lineTo(-half, H - GAP); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth: d - 2 * GAP, bevelEnabled: false, curveSegments: 24});
  g.translate(0, 0, -(d - 2 * GAP) / 2); g.computeVertexNormals(); return g;
}
// A quarter of a disc, centred on its own -x -z corner, so the round edge sits
// at the +x +z corner before turning.
function curve(w, d, H) {
  const s = new THREE.Shape(), R = w - 2 * GAP, cx = -w / 2 + GAP, cy = w / 2 - GAP;
  s.moveTo(cx, cy); s.lineTo(cx + R, cy); s.absarc(cx, cy, R, 0, -Math.PI / 2, true); s.lineTo(cx, cy);
  const g = new THREE.ExtrudeGeometry(s, {depth: H - GAP, bevelEnabled: false, curveSegments: 20});
  g.rotateX(-Math.PI / 2); g.computeVertexNormals(); return g;
}
// Turned shapes: radius and height both 0..1, scaled to the part.
const PROFILES = {
  vase: [[0, 0], [.45, 0], [.62, .06], [.85, .28], [.8, .5], [.55, .72], [.38, .84], [.42, .94], [.55, 1], [.45, 1], [.32, .9], [0, .88]],
  jar: [[0, 0], [.75, 0], [.95, .15], [1, .45], [.92, .72], [.7, .82], [.72, .9], [.5, .95], [.2, 1], [0, 1]],
  column: [[0, 0], [1, 0], [1, .06], [.82, .1], [.72, .16], [.72, .84], [.82, .9], [1, .94], [1, 1], [0, 1]],
  bowl: [[0, 0], [.5, 0], [.55, .08], [.85, .4], [1, .95], [.94, 1], [.78, .5], [.45, .22], [0, .2]],
  cup: [[0, 0], [.68, 0], [.74, .06], [.8, .95], [.84, 1], [.74, 1], [.7, .2], [0, .18]],
  shade: [[.46, 1], [.52, 1], [1, .03], [1, 0], [.93, 0], [.44, .97]],
  bead: [[0, 0], [.45, .04], [.8, .18], [1, .5], [.8, .82], [.45, .96], [0, 1]]
};
function lathe(w, H, profile) {
  const R = w / 2 - GAP;
  return new THREE.LatheGeometry((PROFILES[profile] || PROFILES.vase).map(([r, y]) => new THREE.Vector2(Math.max(.001, r * R), y * (H - GAP))), 32);
}
// Cloth hanging in soft folds, one fold a stud, fuller towards the hem.
function drape(w, H) {
  const g = new THREE.PlaneGeometry(w - 2 * GAP, H - GAP, w * 12, Math.max(4, Math.round(H * 3))), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) + (H - GAP) / 2, t = (x + w / 2) / w, low = 1 - y / H;
    p.setXYZ(i, x * (.9 + .1 * low), y, .17 * Math.sin(t * w * Math.PI * 2) * (.5 + .5 * low));
  }
  g.computeVertexNormals(); return g;
}
// Posts on every stud and two rails.
function fence(w, H) {
  const parts = [];
  for (let i = 0; i < w; i++) parts.push(lift(new THREE.BoxGeometry(.14, H - GAP, .14), (H - GAP) / 2).translate(i - (w - 1) / 2, 0, 0));
  for (const y of [H - .12, H * .45]) parts.push(new THREE.BoxGeometry(w - 2 * GAP, .1, .12).translate(0, y, 0));
  return merge(parts);
}
function flower() {
  const parts = Array.from({length: 5}, (_, i) => new THREE.SphereGeometry(1, 12, 8).scale(.22, .12, .22).translate(Math.cos(i * 1.2566) * .22, .2, Math.sin(i * 1.2566) * .22));
  return merge(parts);
}
function leaf() {return new THREE.SphereGeometry(1, 16, 10).scale(.4, .12, .92).rotateZ(.1).translate(0, .18, 0);}
// A few geometries made one, so a fence or a flower is a single mesh.
function merge(list) {
  const geos = list.map(g => g.index ? g.toNonIndexed() : g), size = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(size * 3), nor = new Float32Array(size * 3);let o = 0;
  for (const g of geos) {pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count;}
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
}

export function partGeometry(part) {
  const {p, w, d, h, profile} = part, H = h * PLATE;
  return cached(`${p}:${w}:${d}:${h}:${profile || ''}`, () => {
    switch (p) {
      case 'round': case 'disc': return cylinder(w / 2, H);
      case 'slope': return slope(w, d, H);
      case 'arch': return arch(w, d, H);
      case 'curve': return curve(w, d, H);
      case 'lathe': return lathe(w, H, profile);
      case 'drape': return drape(w, H);
      case 'fence': return fence(w, H);
      case 'flower': return flower();
      case 'leaf': return leaf();
      default: return box(w, d, H);
    }
  });
}

// Where the studs on a part sit, in its own frame (centred, before turning).
export function localStuds(part) {
  const {w, d, h} = part, kind = PARTS[part.p]?.studs, H = h * PLATE, out = [];
  if (kind === 'none') return out;
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    if (kind === 'back' && j !== 0) continue;
    out.push([i - (w - 1) / 2, H, j - (d - 1) / 2]);
  }
  return out;
}
// A part's place in the build: the middle of its footprint, its bottom.
export function placeOf(part) {
  const f = footprint(part);
  return [f.x + f.w / 2 - BASE / 2, f.y * PLATE, f.z + f.d / 2 - BASE / 2];
}
export const turnOf = part => (part.turn || 0) * Math.PI / 2;

// Where something can be set down on a build: over each stud square, the top of
// whatever is highest there, as long as that top is flat (bricks, plates,
// tiles, round bricks and discs, arches, curves); studs count. A curve covers
// only the quarter disc inside its square. Squares are in the build's own frame
// (stud units, centred the way placeOf is), top in stud units.
const FLAT_TOPS = new Set(['brick', 'plate', 'tile', 'round', 'disc', 'arch', 'curve']);
function covers(part) {
  if (part.p !== 'curve') return () => true;
  const f = footprint(part), t = turnOf(part), c = Math.cos(t), s = Math.sin(t);
  const x = (part.flip ? 1 : -1) * part.w / 2, z = -part.d / 2;
  const ox = f.x + f.w / 2 + x * c + z * s, oz = f.z + f.d / 2 - x * s + z * c;
  return (gx, gz) => Math.hypot(gx - ox, gz - oz) < part.w;
}
export function restingTops(parts) {
  const best = new Map();
  for (const part of parts) {
    const f = footprint(part), top = (f.y + f.h) * PLATE + (PARTS[part.p]?.studs === 'top' ? STUD.h : 0), inside = covers(part);
    for (let i = f.x; i < f.x + f.w; i++) for (let k = f.z; k < f.z + f.d; k++) {
      if (!inside(i + .5, k + .5)) continue;
      const key = i * 64 + k, was = best.get(key);
      if (!was || top > was.top) best.set(key, {x: i - BASE / 2, z: k - BASE / 2, top, flat: FLAT_TOPS.has(part.p)});
    }
  }
  return [...best.values()].filter(cell => cell.flat).map(({x, z, top}) => ({x, z, top}));
}
// Those squares as one invisible mesh facing up, a hair above the parts so a
// ray finds it first: free placement lands on it (see free-placement.jsx).
export function landingGeometry(parts) {
  const tops = restingTops(parts);
  if (!tops.length) return null;
  const pos = [];
  for (const {x, z, top} of tops) {
    const y = top + .01, a = [x, y, z], b = [x + 1, y, z], c = [x + 1, y, z + 1], d = [x, y, z + 1];
    pos.push(...a, ...d, ...c, ...a, ...c, ...b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
export function studsInBuild(part) {
  const [cx, cy, cz] = placeOf(part), t = turnOf(part), c = Math.cos(t), s = Math.sin(t), fx = part.flip ? -1 : 1;
  return localStuds(part).map(([x, y, z]) => {x *= fx; return [cx + x * c + z * s, cy + y, cz - x * s + z * c];});
}
export const studGeometry = () => cached('stud', () => new THREE.CylinderGeometry(STUD.r, STUD.r, STUD.h, 16).translate(0, STUD.h / 2, 0));
// The gold middle of a little flower, sitting on its petals.
export const flowerHeart = () => cached('flowerHeart', () => new THREE.CylinderGeometry(.1, .1, .12, 14).translate(0, .26, 0));

// Materials are colour roles plus a material word; glass and glow are drawn
// here, not uploaded. Cloth and lampshades are seen from both sides.
export function partMaterial(role, mat = 'plain', twoSided = false) {
  return cached(`m:${role}:${mat}:${twoSided}`, () => {
    const color = ROLES[role]?.color || ROLES.cream.color, side = twoSided ? THREE.DoubleSide : THREE.FrontSide;
    if (mat === 'glass') return new THREE.MeshPhysicalMaterial({color, roughness: .1, metalness: 0, transparent: true, opacity: .5, clearcoat: .8, side, depthWrite: false});
    if (mat === 'glow') return new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: .9, roughness: .55, side});
    return new THREE.MeshStandardMaterial({color, roughness: .38, metalness: .02, side});
  });
}
export const twoSided = part => part.p === 'drape' || part.p === 'lathe' && part.profile === 'shade';

// How long a stud is in the units creations are drawn in (a house shows those
// at .12): a small thing the size the old bricks were, furniture the size of
// the house's own (a sixteen-stud plate is about as long as the sofa).
export {STUD_SIZE};

// A whole build drawn as one object: how far to move it to centre it on its
// own footprint, and how much to scale it. fit shrinks it, if need be, to fit
// within that size (a slot in a cupboard); fill makes it that size and centres
// it upright too (a preview). Null for an empty build.
export function buildFrame(parts, scale, {fit, fill} = {}) {
  if (!parts.length) return null;
  const boxes = parts.map(footprint);
  const minX = Math.min(...boxes.map(b => b.x)), maxX = Math.max(...boxes.map(b => b.x + b.w));
  const minZ = Math.min(...boxes.map(b => b.z)), maxZ = Math.max(...boxes.map(b => b.z + b.d));
  const top = Math.max(...boxes.map(b => b.y + b.h)) * PLATE;
  const stud = STUD_SIZE[scale] || STUD_SIZE.small, span = Math.max(maxX - minX, maxZ - minZ, top) * stud;
  const s = stud * (fill ? fill / span : fit && span > fit ? fit / span : 1);
  return {cx: (minX + maxX) / 2 - BASE / 2, cz: (minZ + maxZ) / 2 - BASE / 2, s, lift: fill ? -top * s / 2 : 0};
}
