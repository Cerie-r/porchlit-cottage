// What the tailor's bench adds to a garment sewn at home (src/tailor-state.js): lace along its hem, its collar and
// its cuffs, and pearl buttons. Nothing is drawn for one pattern alone: the lace follows the garment's own open
// edges, found on the garment as built and fitted, so any pattern that may be sewn takes it. In the body's own
// coordinates (body/outfit-tools.js): y up, face towards +z, the torso's axis at x 0, z .10.
import * as T from 'three';

export const LACE_PARTS = ['hem', 'collar', 'cuffs'];
// The parts asked for, each once, in their own order; anything else left out.
export const cleanLace = raw => (Array.isArray(raw) ? LACE_PARTS.filter(p => raw.includes(p)) : []);
// What a sewn piece carries on top of its pattern and colours: {lace: [...parts], pearls: true}, either left out
// when it has none; null when it has neither.
export function cleanTrims(raw) {
  const lace = cleanLace(raw?.lace), pearls = raw?.pearls === true;
  return lace.length || pearls ? {...(lace.length ? {lace} : {}), ...(pearls ? {pearls} : {})} : null;
}
// The same trims as text, to tell one set from another ('' for none).
export const trimsKey = t => {
  const c = cleanTrims(t);
  return c ? `${(c.lace || []).join('+')}${c.pearls ? '|pearls' : ''}` : '';
};

const SHOULDER = [.18, 1.32, .065], ELBOW = [.44, 1.065, .05], WRIST = [.535, .915, .05];
// What isn't the garment's own cloth round the torso: trimmings, fastenings, prints, the legs and the feet.
const NOT_TORSO = /sleeve|cuff|leg|trouser|pocket|patch|collar|lapel|hood|bow|ribbon|belt|seam|piping|stripe|button|toggle|frog|lantern|heart|face|strap|shoe|sole|lace|pearl|jabot|brooch|rope|string/;
// A collar lying on the garment, and a sleeve or its cuff; not the lines and stripes drawn on them.
const COLLAR = /collar/, SLEEVE = /sleeve|cuff/, DRAWN_ON = /stripe|piping|seam|stitching|lace|pearl/;

const shows = (m, group) => { for (let o = m; o && o !== group; o = o.parent) if (!o.visible) return false; return true; };
// Each mesh's place in the garment (the group it is built in).
function frameOf(group) {
  group.updateMatrixWorld(true);
  const back = new T.Matrix4().copy(group.matrixWorld).invert();
  return m => new T.Matrix4().multiplyMatrices(back, m.matrixWorld);
}
function pointsOf(mesh, toGroup) {
  const p = mesh.geometry.attributes.position, matrix = toGroup(mesh), out = new Array(p.count);
  for (let i = 0; i < p.count; i++) out[i] = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(matrix);
  return out;
}
const keyOf = v => `${Math.round(v.x * 4e3)},${Math.round(v.y * 4e3)},${Math.round(v.z * 4e3)}`;
// The open edges of a mesh: the sides of triangles no other triangle shares, once the doubled points of a seam are
// taken as one. [{a, b, c}]: the edge's two ends, and the third corner of its triangle (which side the cloth is on).
function openEdges(mesh, toGroup) {
  const pts = pointsOf(mesh, toGroup), ids = new Map(), same = pts.map((v, i) => { const k = keyOf(v); if (!ids.has(k)) ids.set(k, i); return ids.get(k); });
  const index = mesh.geometry.index ? mesh.geometry.index.array : Array.from({length: pts.length}, (_, i) => i), seen = new Map();
  for (let t = 0; t + 2 < index.length; t += 3) {
    const tri = [same[index[t]], same[index[t + 1]], same[index[t + 2]]];
    if (tri[0] === tri[1] || tri[1] === tri[2] || tri[0] === tri[2]) continue;
    for (let k = 0; k < 3; k++) {
      const a = tri[k], b = tri[(k + 1) % 3], key = a < b ? `${a}|${b}` : `${b}|${a}`, had = seen.get(key);
      seen.set(key, had ? {...had, n: had.n + 1} : {a, b, c: tri[(k + 2) % 3], n: 1});
    }
  }
  const out = [];
  for (const e of seen.values()) if (e.n === 1) out.push({a: pts[e.a], b: pts[e.b], c: pts[e.c]});
  return out;
}
// Which way from an edge its cloth lies: up (towards 1) for an edge along the bottom, down (towards -1) for one along
// the top, about 0 for one down a side.
const clothSide = ({a, b, c}) => { const t = c.clone().sub(a.clone().add(b).multiplyScalar(.5)), l = t.length(); return l ? t.y / l : 0; };
// Edges joined into runs: [{points, closed}], each run's points in order.
function runs(edges) {
  const at = new Map(), next = new Map(), link = (k, n) => { if (!next.has(k)) next.set(k, []); next.get(k).push(n); };
  for (const {a, b} of edges) { const ka = keyOf(a), kb = keyOf(b); at.set(ka, a); at.set(kb, b); link(ka, kb); link(kb, ka); }
  const used = new Set(), edge = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`), out = [];
  const walk = start => {
    const keys = [start];
    for (let cur = start; ;) {
      const n = next.get(cur).find(k => !used.has(edge(cur, k)));
      if (!n) return {keys, closed: false};
      used.add(edge(cur, n));
      if (n === start) return {keys, closed: true};
      keys.push(n);
      cur = n;
    }
  };
  const open = k => next.get(k).some(n => !used.has(edge(k, n)));
  // Runs with ends from their ends first, then whatever loops are left.
  for (const k of next.keys()) if (next.get(k).length === 1 && open(k)) { const r = walk(k); out.push({points: r.keys.map(x => at.get(x)), closed: r.closed}); }
  for (const k of next.keys()) while (open(k)) { const r = walk(k); out.push({points: r.keys.map(x => at.get(x)), closed: r.closed}); }
  return out.filter(r => r.points.length > 2);
}
// Points along a run, evenly about `step` apart.
function even(points, closed, step = .006) {
  const pts = closed ? [...points, points[0]] : points, out = [pts[0].clone()];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = a.distanceTo(b);
    if (!d) continue;
    let s = step - carry;
    for (; s <= d; s += step) out.push(a.clone().lerp(b, s / d));
    carry = d - (s - step);
  }
  if (closed && out.length > 2 && out.at(-1).distanceTo(out[0]) < step * .5) out.pop();
  if (!closed && out.at(-1).distanceTo(pts.at(-1)) > step * .3) out.push(pts.at(-1).clone());
  return out;
}

// The cloth round the torso: the garment's fitted pieces (clothAxis) that aren't on a leg or a trimming.
function torsoPieces(group) {
  const out = [];
  group.traverse(m => { if (m.isMesh && m.userData?.clothAxis && !m.userData.clothAxis.leg && !NOT_TORSO.test(m.name) && shows(m, group)) out.push(m); });
  return out;
}
function yRange(mesh, toGroup) { mesh.geometry.computeBoundingBox(); const b = mesh.geometry.boundingBox.clone().applyMatrix4(toGroup(mesh)); return [b.min.y, b.max.y]; }

// The hem: the bottom edge of the lowest piece of torso cloth that has one (a skirt's, a coat's, a band's round it),
// low on it (not where an open front turns back at the top).
function hemRuns(group, toGroup) {
  const pieces = torsoPieces(group).sort((a, b) => yRange(a, toGroup)[0] - yRange(b, toGroup)[0]);
  for (const m of pieces) {
    const [y0, y1] = yRange(m, toGroup), found = runs(openEdges(m, toGroup).filter(e => clothSide(e) > .5 && Math.max(e.a.y, e.b.y) < y0 + .25 * (y1 - y0)));
    if (found.length) return found;
  }
  return [];
}
// The collar: the outer edge of a collar lying on the garment (its cloth up from it, and in towards the neck); with
// no collar that has an open edge, the neckline of the highest piece of torso cloth (its cloth down from it).
function collarRuns(group, toGroup) {
  const outer = [];
  group.traverse(m => {
    if (!m.isMesh || !COLLAR.test(m.name) || DRAWN_ON.test(m.name) || !shows(m, group)) return;
    outer.push(...openEdges(m, toGroup).filter(e => {
      const mid = e.a.clone().add(e.b).multiplyScalar(.5), t = e.c.clone().sub(mid), l = t.length(), out = new T.Vector3(mid.x, 0, mid.z - .10).normalize();
      return l && (t.y - t.dot(out)) / l > .35;
    }));
  });
  if (outer.length) return runs(outer);
  const pieces = torsoPieces(group);
  if (!pieces.length) return [];
  const high = pieces.reduce((a, b) => (yRange(a, toGroup)[1] >= yRange(b, toGroup)[1] ? a : b)), [y0, y1] = yRange(high, toGroup);
  return runs(openEdges(high, toGroup).filter(e => clothSide(e) < -.5 && Math.min(e.a.y, e.b.y) > y0 + .6 * (y1 - y0)));
}
// The cuffs: on each arm, the open edge of the sleeve furthest down the arm (the wrist end).
function cuffRuns(group, toGroup) {
  const best = {};
  group.traverse(m => {
    if (!m.isMesh || !SLEEVE.test(m.name) || DRAWN_ON.test(m.name) || !shows(m, group)) return;
    for (const r of runs(openEdges(m, toGroup))) {
      const centre = r.points.reduce((s, p) => s.add(p), new T.Vector3()).multiplyScalar(1 / r.points.length), side = Math.sign(centre.x) || 1;
      const d = centre.distanceTo(new T.Vector3(side * SHOULDER[0], SHOULDER[1], SHOULDER[2]));
      if (d > .12 && (!best[side] || d > best[side].d)) best[side] = {d, run: r, centre, side};
    }
  });
  return Object.values(best).map(b => ({...b.run, side: b.side, centre: b.centre}));
}

// The lace itself: a narrow band it is sewn on by, pierced with eyelets, then net with a little flower in each
// scallop, out to a scalloped edge. Drawn as an alpha map, so the garment's own shape shows through. One tile is one
// scallop along (u) and the band across (v, 0 where it is sewn on).
let laceTexture = null;
export function lacePattern() {
  if (laceTexture) return laceTexture;
  const W = 128, H = 64, data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x + .5) / W, v = (y + .5) / H, edge = .76 + .2 * Math.sin(Math.PI * u);
    let on = 0;
    if (v < .22) on = Math.abs(v - .11) < .045 && Math.abs(((u * 4) % 1) - .5) < .16 ? 0 : 1;
    else if (v < edge - .07) {
      const a = (u * 7 + v * 4) % 1, b = (u * 7 - v * 4 + 10) % 1;
      on = Math.abs(a - .5) > .32 || Math.abs(b - .5) > .32 ? 1 : 0;
      const fu = (u - .5) * 1.25, fv = v - .5, r = Math.hypot(fu, fv), petal = .15 * (.55 + .45 * Math.abs(Math.cos(2.5 * Math.atan2(fv, fu))));
      if (r < petal) on = r < .035 ? 0 : 1;
    } else if (v < edge) on = 1;
    const i = (y * W + x) * 4, c = on ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = c; data[i + 3] = 255;
  }
  laceTexture = new T.DataTexture(data, W, H, T.RGBAFormat);
  laceTexture.wrapS = T.RepeatWrapping; laceTexture.wrapT = T.ClampToEdgeWrapping;
  laceTexture.magFilter = T.LinearFilter; laceTexture.minFilter = T.LinearMipmapLinearFilter; laceTexture.generateMipmaps = true;
  laceTexture.needsUpdate = true;
  return laceTexture;
}
export const LACE_COLOR = '#fbf7ef', PEARL_COLOR = '#f6efe7';
// Lace is see-through where the net is: far off, where the net is too fine to draw, it is a pale veil. alphaMap: the
// pattern it is worked in (the scalloped band, unless another is given).
export const laceMaterial = (alphaMap = lacePattern()) => new T.MeshStandardMaterial({name: 'lace', color: LACE_COLOR, alphaMap, transparent: true, alphaTest: .3, depthWrite: false, side: T.DoubleSide, roughness: .86});
const pearlMaterial = () => new T.MeshStandardMaterial({name: 'pearl', color: PEARL_COLOR, roughness: .2, metalness: .06, emissive: '#3b342d', emissiveIntensity: .14});

const SCALLOP = .045;
// A band along points (in order), sewn on at them: each row of it lifted by `lift` along out(i) and running `width`
// along dir(i), with a little fullness across; a whole number of scallops about `scallop` long. Also laid flat on
// furniture (src/lace-cloth.js).
export function laceBand(points, closed, {out, dir, width, lift = .004, scallop = SCALLOP, fullness = .005}) {
  const rows = closed ? [...points, points[0]] : points, pos = [], uv = [], idx = [];
  let length = 0;
  for (let i = 1; i < rows.length; i++) length += rows[i].distanceTo(rows[i - 1]);
  const per = Math.max(1, Math.round(length / scallop)) / length;
  let along = 0;
  rows.forEach((p, i) => {
    if (i) along += p.distanceTo(rows[i - 1]);
    const k = i % points.length, o = out(k), d = dir(k), base = p.clone().addScaledVector(o, lift);
    for (const v of [0, .5, 1]) {
      const q = base.clone().addScaledVector(d, width * v).addScaledVector(o, fullness * Math.sin(Math.PI * v));
      pos.push(q.x, q.y, q.z); uv.push(along * per, v);
    }
  });
  for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < 2; k++) { const a = i * 3 + k, b = a + 3; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const radial = p => new T.Vector3(p.x, 0, p.z - .10).normalize();

function addLace(group, parts, material, toGroup) {
  const made = [], add = (geometry, name) => { const m = new T.Mesh(geometry, material); m.name = name; m.castShadow = true; m.userData.trim = true; group.add(m); made.push(m); };
  // All found first, then added: the lace isn't one of the garment's own edges.
  const hem = parts.includes('hem') ? hemRuns(group, toGroup) : [], collar = parts.includes('collar') ? collarRuns(group, toGroup) : [], cuffs = parts.includes('cuffs') ? cuffRuns(group, toGroup) : [];
  for (const r of hem) {
    const pts = even(r.points, r.closed);
    if (pts.length > 3) add(laceBand(pts, r.closed, {out: i => radial(pts[i]), dir: i => new T.Vector3(0, -1, 0).addScaledVector(radial(pts[i]), .4).normalize(), width: .05}), 'lace-hem');
  }
  for (const r of collar) {
    const pts = even(r.points, r.closed);
    if (pts.length > 3) add(laceBand(pts, r.closed, {out: i => radial(pts[i]), dir: i => radial(pts[i]).multiplyScalar(.85).add(new T.Vector3(0, -.6, 0)).normalize(), width: .034}), 'lace-collar');
  }
  for (const r of cuffs) {
    const pts = even(r.points, r.closed), along = new T.Vector3(r.side * WRIST[0], WRIST[1], WRIST[2]).sub(new T.Vector3(r.side * ELBOW[0], ELBOW[1], ELBOW[2])).normalize();
    const away = p => { const d = p.clone().sub(r.centre); return d.addScaledVector(along, -d.dot(along)).normalize(); };
    if (pts.length > 3) add(laceBand(pts, r.closed, {out: i => away(pts[i]), dir: i => along.clone().addScaledVector(away(pts[i]), .7).normalize(), width: .036}), 'lace-cuff');
  }
  return made;
}

// Pearl buttons: the buttons a pattern has turn to pearl; one without any gets three down the front, each where the
// cloth itself shows there (not on a bow, a print or a collar lying over it).
function addPearls(group, material, toGroup) {
  const buttons = [];
  group.traverse(m => { if (m.isMesh && /^buttons?$/.test(m.name) && shows(m, group)) buttons.push(m); });
  if (buttons.length) { for (const b of buttons) b.material = material; return []; }
  const pieces = torsoPieces(group);
  if (!pieces.length) return [];
  const all = [];
  group.traverse(m => { if (m.isMesh && !m.userData.trim && shows(m, group)) all.push(m); });
  const top = Math.min(1.33, Math.max(...pieces.map(m => yRange(m, toGroup)[1]))), toWorld = group.matrixWorld, made = [];
  for (let k = 0; k < 6 && made.length < 3; k++) {
    const y = top - .07 - k * .042, ray = new T.Raycaster(new T.Vector3(0, y, 1.5).applyMatrix4(toWorld), new T.Vector3(0, 0, -1).transformDirection(toWorld));
    const hit = ray.intersectObjects(all, false)[0];
    if (!hit || !pieces.includes(hit.object)) continue;
    const at = hit.point.clone().applyMatrix4(new T.Matrix4().copy(toWorld).invert());
    const m = new T.Mesh(new T.SphereGeometry(.012, 14, 10), material);
    m.name = 'pearl-button'; m.position.set(0, y, at.z + .006); m.scale.z = .66; m.castShadow = true; m.userData.trim = true;
    group.add(m); made.push(m);
  }
  return made;
}

// Put the trims on a garment (a group as built, fitted and painted): the meshes added, named so that the rig moves
// each with what it is sewn to (body/avatar-rig.js). Lace and pearl keep their own colours, whatever the garment is
// painted.
export function addTrims(group, trims) {
  const t = cleanTrims(trims);
  if (!group || !t) return [];
  const toGroup = frameOf(group), made = [];
  if (t.lace) made.push(...addLace(group, t.lace, laceMaterial(), toGroup));
  if (t.pearls) made.push(...addPearls(group, pearlMaterial(), toGroup));
  return made;
}
