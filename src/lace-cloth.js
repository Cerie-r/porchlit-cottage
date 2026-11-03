// Lace laid on furniture (a whole dawn web's lace, src/bench-stock.js): a doily on a table's top, a runner down a
// long one. An all-over net ground with a scalloped border round it, lying flat, in lace's own colour (body/trims.js).
import * as T from 'three';
import {laceBand, laceMaterial, lacePattern} from '../body/trims.js';

// The ground: a diamond net with a little flower in each diamond, tiled GROUND across.
const GROUND = .07;
let groundTexture = null;
function groundPattern() {
  if (groundTexture) return groundTexture;
  const N = 64, data = new Uint8Array(N * N * 4), wrap = t => ((t % 1) + 1) % 1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + .5) / N, v = (y + .5) / N;
    let on = Math.abs(wrap(u + v) - .5) > .43 || Math.abs(wrap(u - v) - .5) > .43 ? 1 : 0;
    for (const [cx, cy] of [[.5, 0], [.5, 1], [0, .5], [1, .5]]) {
      const fu = u - cx, fv = v - cy, r = Math.hypot(fu, fv), petal = .17 * (.55 + .45 * Math.abs(Math.cos(2.5 * Math.atan2(fv, fu))));
      if (r < petal) on = r < .045 ? 0 : 1;
    }
    const i = (y * N + x) * 4, c = on ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = c; data[i + 3] = 255;
  }
  groundTexture = new T.DataTexture(data, N, N, T.RGBAFormat);
  groundTexture.wrapS = groundTexture.wrapT = T.RepeatWrapping;
  groundTexture.magFilter = T.LinearFilter; groundTexture.minFilter = T.LinearMipmapLinearFilter; groundTexture.generateMipmaps = true;
  groundTexture.needsUpdate = true;
  return groundTexture;
}

// The outline of a cloth width by depth (x by z), round when `round`, else a rectangle with its corners rounded:
// points in order round it, each with the way out from it.
function outline(width, depth, round) {
  const pts = [], outs = [];
  if (round) {
    for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2, x = Math.cos(a) * width / 2, z = Math.sin(a) * depth / 2; pts.push(new T.Vector3(x, 0, z)); outs.push(new T.Vector3(x / (width * width), 0, z / (depth * depth)).normalize()); }
    return {pts, outs};
  }
  const r = Math.min(.035, width / 4, depth / 4), hx = width / 2 - r, hz = depth / 2 - r;
  for (const [cx, cz, a0] of [[hx, hz, 0], [-hx, hz, Math.PI / 2], [-hx, -hz, Math.PI], [hx, -hz, Math.PI * 1.5]]) {
    for (let k = 0; k <= 6; k++) { const a = a0 + k / 6 * Math.PI / 2, out = new T.Vector3(Math.cos(a), 0, Math.sin(a)); pts.push(new T.Vector3(cx, 0, cz).addScaledVector(out, r)); outs.push(out); }
  }
  // Points along each straight side, so the border's scallops run evenly.
  const even = [], evenOuts = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(p.distanceTo(q) / .02));
    for (let k = 0; k < n; k++) { even.push(p.clone().lerp(q, k / n)); evenOuts.push(outs[i].clone().lerp(outs[(i + 1) % pts.length], k / n).normalize()); }
  });
  return {pts: even, outs: evenOuts};
}

// A pattern's threads grown a pixel all round: drawn darker just under the lace, so white lace still shows on a
// pale top (on a cream table it is otherwise all but lost).
const outlines = new Map();
function outlineOf(texture) {
  if (outlines.has(texture)) return outlines.get(texture);
  const {data, width: W, height: H} = texture.image, out = new Uint8Array(W * H * 4), wrapsY = texture.wrapT === T.RepeatWrapping;
  const on = (x, y) => { const yy = wrapsY ? (y + H) % H : Math.min(H - 1, Math.max(0, y)); return data[(yy * W + (x + W) % W) * 4] > 127; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0;
    for (let dy = -1; dy <= 1 && !v; dy++) for (let dx = -1; dx <= 1 && !v; dx++) if (on(x + dx, y + dy)) v = 255;
    const i = (y * W + x) * 4;
    out[i] = out[i + 1] = out[i + 2] = v; out[i + 3] = 255;
  }
  const t = new T.DataTexture(out, W, H, T.RGBAFormat);
  t.wrapS = texture.wrapS; t.wrapT = texture.wrapT; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  outlines.set(texture, t);
  return t;
}
const shadeMaterial = texture => new T.MeshBasicMaterial({name: 'lace-shade', color: '#7d6553', alphaMap: outlineOf(texture), transparent: true, opacity: .58, alphaTest: .05, depthWrite: false, side: T.DoubleSide});

// A cloth `width` by `depth` (x by z) lying just above y 0 facing up, round when `round`: the net ground inside, and
// a border of scallops `border` wide round it, past its edge; each over its own faint outline. A group named
// 'lace-cloth' (its meshes too); dispose with disposeLaceCloth.
export function laceCloth(width, depth, {round = false, border = .055} = {}) {
  const group = new T.Group();
  group.name = 'lace-cloth';
  const ground = round ? new T.CircleGeometry(.5, 64).scale(width, depth, 1) : new T.PlaneGeometry(width, depth);
  ground.rotateX(-Math.PI / 2);
  const p = ground.attributes.position, uv = ground.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / GROUND, p.getZ(i) / GROUND);
  const {pts, outs} = outline(width, depth, round), up = new T.Vector3(0, 1, 0);
  const edge = laceBand(pts, true, {out: () => up, dir: i => outs[i], width: border, lift: 0, scallop: .05, fullness: 0});
  for (const [geometry, texture, y] of [[ground, groundPattern(), .004], [edge, lacePattern(), .0043]]) {
    const shade = new T.Mesh(geometry, shadeMaterial(texture)), lace = new T.Mesh(geometry, laceMaterial(texture));
    shade.position.y = y; shade.renderOrder = 1;
    lace.position.y = y + .0016; lace.renderOrder = 2; lace.receiveShadow = true;
    for (const m of [shade, lace]) { m.name = 'lace-cloth'; group.add(m); }
  }
  return group;
}
export function disposeLaceCloth(group) {
  const geometries = new Set();
  group?.traverse(m => { if (m.isMesh) { geometries.add(m.geometry); m.material.dispose(); } });
  geometries.forEach(g => g.dispose());
}

// How a top `width` by `depth` is dressed: a doily in the middle of one about square (round on a round top), a runner
// down the middle of a long one; inside its edges, border and all. {width, depth, round} of the ground.
export function clothFor(width, depth, {round = false} = {}) {
  const long = Math.max(width, depth) / Math.min(width, depth) > 1.6, border = .055;
  if (round) return {width: width * .66 - 2 * border, depth: depth * .66 - 2 * border, round: true, border};
  if (long) {
    const along = Math.max(width, depth) * .84 - 2 * border, across = Math.min(width, depth) * .44 - 2 * border;
    return width >= depth ? {width: along, depth: across, round: false, border} : {width: across, depth: along, round: false, border};
  }
  // About square: a round doily, as wide as the narrower side allows.
  if (Math.abs(width - depth) < .12) { const d = Math.min(width, depth) * .62 - 2 * border; return {width: d, depth: d, round: true, border}; }
  return {width: width * .62 - 2 * border, depth: depth * .62 - 2 * border, round: false, border};
}

// Where a piece's top is: the highest of its meshes painted as a top (decor role 'top', src/decor-context.jsx), in
// the frame of `container`, the group the piece is drawn in. {position, quaternion, width, depth, round} (round for a
// round top), or null for a piece with none. skip: an object whose meshes don't count (the lace itself).
export function topOf(container, skip = null) {
  container.updateMatrixWorld(true);
  const back = new T.Matrix4().copy(container.matrixWorld).invert();
  let best = null;
  container.traverse(m => {
    if (!m.isMesh || m.material?.userData?.decorRole !== 'top') return;
    for (let o = m; o && o !== container; o = o.parent) if (o === skip || !o.visible) return;
    m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox, rel = new T.Matrix4().multiplyMatrices(back, m.matrixWorld);
    const position = new T.Vector3(), quaternion = new T.Quaternion(), scale = new T.Vector3();
    rel.decompose(position, quaternion, scale);
    const at = new T.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2).applyMatrix4(rel);
    const width = (b.max.x - b.min.x) * Math.abs(scale.x), depth = (b.max.z - b.min.z) * Math.abs(scale.z);
    const higher = !best || at.y > best.position.y + .005, level = best && Math.abs(at.y - best.position.y) <= .005;
    if (higher || (level && width * depth > best.width * best.depth)) best = {position: at, quaternion, width, depth, round: /Cylinder|Circle/.test(m.geometry.type)};
  });
  return best;
}
