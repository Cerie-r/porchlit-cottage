// What every page of the exploring book shares (src/explore-book.jsx): walking the paths painted on the ground, how
// she looks through a piece of paper and where she stands to, and what hides where on one walk. Pure: a page's own
// data is a place (src/explore-woods-layout.js, explore-hill-layout.js, explore-lake-layout.js,
// explore-tea-layout.js, explore-field-layout.js), the page draws it, tests check it.
//
// A place: {id, name, dir, page: {width, depth}, ground, backdrop, art (picture → pixel size), pieces, paths, start,
// firstStop, finds, hides, artFinds, dawn, hidden, glints, findH, basket}. The page is the ground picture laid flat
// (x left to right, z back to front; the camera looks from the front, +z); the pieces are upright paper standing
// on their bottom middle, `h` tall, their width following the picture.

// Makes a place's pieces from [art, x, z, h] rows: each its id (art and row number) and width. A row may end with
// more about that one piece: that it stands at the water's edge (`shore`), or where she looks at it from (`spot`,
// for one out in the water); see searchSpot. Or that it is only somewhere to stand and look out from (`view`,
// with its `spot`: nothing hides there), or only scenery far off the paths (`still`: not for tapping).
export const piecesOf = (rows, art) => rows.map(([name, x, z, h, more], i) => ({id: `${name}-${i}`, art: name, x, z, h, w: h * art[name][0] / art[name][1], ...more}));

// What kind of place a piece is, from its picture's name.
export function kindOf(art) {
  if (art.startsWith('tree-') || /-tree-/.test(art) || art === 'wisteria-tree') return 'tree';
  if (art === 'wisteria-bower' || art === 'root-arch' || art.startsWith('timber-frame')) return 'arch';
  if (art.startsWith('bush-')) return 'bush';
  if (art.startsWith('fern-')) return 'fern';
  if (art.startsWith('reed-')) return 'reed';
  if (art.startsWith('tea-row-') || art.startsWith('tea-seedling')) return 'tea';
  if (art.startsWith('crop-row-')) return 'crop';
  if (art.startsWith('tomato-vine')) return 'vine';
  if (art.startsWith('greens-row')) return 'greens';
  if (art.startsWith('taro-')) return 'taro';
  if (art === 'haystack') return 'hay';
  if (art.startsWith('rock-') || /-rock(-\d+)?$/.test(art) || art === 'stone-pillar') return 'rock';
  if (art.startsWith('fluorite-')) return 'crystal';
  if (art.startsWith('flower-') || art.startsWith('wildflower-')) return 'flower';
  if (art === 'mushroom-cluster') return 'mushroom';
  if (art.startsWith('glow-mushrooms')) return 'glow';
  if (art === 'fallen-log') return 'log';
  if (art.startsWith('dock-')) return 'dock';
  if (art.startsWith('boat-')) return 'boat';
  if (art === 'tea-basket') return 'basket';
  if (art === 'wooden-wheelbarrow' || art === 'minecart') return 'cart';
  if (art === 'barrels' || art === 'crates') return 'crate';
  if (art === 'oil-lamp') return 'lamp';
  if (art === 'sunbeam') return 'beam';
  if (art === 'stone-well') return 'well';
  if (art === 'stone-wall') return 'wall';
  return 'fence';
}
// What she only looks at, not into: a fence or a scarecrow, the posts of a pier, a boat, a basket, a barrow, a well.
const LOOKED_AT = ['fence', 'dock', 'boat', 'basket', 'cart', 'well', 'crate', 'crystal', 'lamp', 'beam'];

// ── Walking ──────────────────────────────────────────────────────────────────────────────────────────────────────
// One painted path, as a line of points.

const segLengths = path => path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
export const pathLength = path => segLengths(path).reduce((a, b) => a + b, 0);

// The point s along a path (clamped to it).
export function pointAt(s, path) {
  const lengths = segLengths(path);
  let left = Math.max(0, s);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? Math.min(1, left / lengths[i]) : 0;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t];
    }
    left -= lengths[i];
  }
  return [...path[0]];
}

// How far along a path its nearest point to p is.
export function nearestAlong(p, path) {
  const lengths = segLengths(path);
  let best = Infinity, at = 0, walked = 0;
  for (let i = 0; i < lengths.length; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1], dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
    const t = len2 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / len2)) : 0;
    const d = Math.hypot(ax + dx * t - p[0], az + dz * t - p[1]);
    if (d < best) { best = d; at = walked + lengths[i] * t; }
    walked += lengths[i];
  }
  return at;
}

// The way from s0 to s1 along a path: the corners passed on the way, then s1 itself.
export function along(s0, s1, path) {
  const lengths = segLengths(path), corners = [];
  let walked = 0;
  for (let i = 1; i < path.length - 1; i++) {
    walked += lengths[i - 1];
    if ((s0 < walked && walked < s1) || (s1 < walked && walked < s0)) corners.push({s: walked, p: [...path[i]]});
  }
  corners.sort((a, b) => (s1 > s0 ? a.s - b.s : b.s - a.s));
  return [...corners.map(c => c.p), pointAt(s1, path)];
}

// All of a place's paths as one web: they meet where they share a point (a fork in the path). Points this close
// count as the same.
const SAME = .05;
export function pathWeb(paths) {
  const nodes = [], next = [], segs = [];
  const node = p => {
    let i = nodes.findIndex(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < SAME);
    if (i < 0) { i = nodes.length; nodes.push([p[0], p[1]]); next.push([]); }
    return i;
  };
  for (const path of paths) {
    for (let k = 1; k < path.length; k++) {
      const a = node(path[k - 1]), b = node(path[k]);
      if (a === b) continue;
      const w = Math.hypot(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1]);
      next[a].push({to: b, w}); next[b].push({to: a, w});
      segs.push([a, b]);
    }
  }
  return {nodes, next, segs};
}

// The point of the web nearest to p: on which stretch (its two ends), how far along it (0 to 1), and the point.
export function nearestOnWeb(web, p) {
  let best = null;
  for (const [a, b] of web.segs) {
    const [ax, az] = web.nodes[a], [bx, bz] = web.nodes[b], dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
    const t = len2 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / len2)) : 0;
    const q = [ax + dx * t, az + dz * t], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (!best || d < best.d) best = {a, b, t, p: q, d};
  }
  return best;
}

// The shortest way between two points of the web (each as nearestOnWeb gives it): the forks and corners on the way,
// then the end itself.
function webWay(web, from, to) {
  if ((from.a === to.a && from.b === to.b) || (from.a === to.b && from.b === to.a)) return [to.p];
  const dist = new Array(web.nodes.length).fill(Infinity), prev = new Array(web.nodes.length).fill(-1), done = new Set();
  const gap = (q, i) => Math.hypot(q[0] - web.nodes[i][0], q[1] - web.nodes[i][1]);
  dist[from.a] = gap(from.p, from.a); dist[from.b] = Math.min(dist[from.b], gap(from.p, from.b));
  for (;;) {
    let u = -1;
    for (let i = 0; i < dist.length; i++) if (!done.has(i) && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0) break;
    done.add(u);
    for (const {to: v, w} of web.next[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
  }
  const end = dist[to.a] + gap(to.p, to.a) <= dist[to.b] + gap(to.p, to.b) ? to.a : to.b;
  const way = [];
  for (let i = end; i >= 0; i = prev[i]) way.unshift([...web.nodes[i]]);
  return [...way, to.p];
}

// From where the two of them are to a spot: onto the nearest path, along the paths the shortest way, and off again to
// the spot when the spot isn't on a path. A step or two away, straight there.
export const HOP = 1.2;
export function routeOn(web, from, to) {
  const direct = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (direct < HOP) return direct > .01 ? [[...to]] : [];
  const A = nearestOnWeb(web, from), B = nearestOnWeb(web, to), route = [];
  if (A.d > .05) route.push(A.p);
  route.push(...webWay(web, A, B));
  // Off the path to the spot; or, on it, ending exactly there.
  if (B.d > .05) route.push([...to]); else route[route.length - 1] = [...to];
  return route.filter((p, i) => i === 0 ? Math.hypot(p[0] - from[0], p[1] - from[1]) > .01 : Math.hypot(p[0] - route[i - 1][0], p[1] - route[i - 1][1]) > .01);
}
// The nearest point on any path.
export const onPath = (web, p) => nearestOnWeb(web, p).p;

// ── Looking through a piece ──────────────────────────────────────────────────────────────────────────────────────

// Pieces lower than this she looks through over the top; taller ones she stands beside.
export const LOW = 1;
// How she looks through a piece: a low one she crouches behind and folds forward ('lift'), a tall bush or rock and
// any clump of reeds she pushes aside ('part'), a tree or an arch of flowers the two of them shake ('shake'), a
// fence, a pier's posts or a boat she just looks at ('look').
export function howOf(p) {
  const kind = kindOf(p.art);
  if (p.view) return 'look';
  if (kind === 'tree' || kind === 'arch') return 'shake';
  if (LOOKED_AT.includes(kind)) return 'look';
  return p.h < LOW && kind !== 'reed' && kind !== 'fern' ? 'lift' : 'part';
}

// Under a tree the two of them stand side by side in front of its trunk, him on the left; at the edge of the page,
// as far over as there is room for him or her.
const underTree = (p, page) => Math.max(.6 - page.width / 2, Math.min(page.width / 2 - .6, p.x));

// Where she stands to look through a piece, and the way she faces. Low: just behind it on its left, crouching
// towards it half towards the camera, so her face is seen and not the back of her head. Tall: clear of it on its
// left, a little in front, in profile, reaching across. A tree or an arch: in front of it, the two of them facing it
// (their backs to the camera). Always with him at her side away from the camera, or beside her, never in front of
// her (resident-hand.js handSlots). At the water's edge (`shore`) there's no room behind it: she stands just off
// its left end, a little in front, the two of them facing the water. A piece out in the water says where on the
// shore she looks at it from (`spot`).
export function searchSpot(p, page) {
  if (p.spot) return {at: [...p.spot.at], yaw: p.spot.yaw};
  if (p.shore) return {at: [p.x - p.w / 2 - .12, p.z + .3], yaw: Math.PI};
  const how = howOf(p);
  if (how === 'shake') return {at: [underTree(p, page) + .45, p.z + .55], yaw: Math.PI};
  if (how === 'part') return {at: [Math.max(.3 - page.width / 2, p.x - p.w / 2 - .22), p.z + .2], yaw: Math.PI / 2};
  const at = [p.x - Math.min(.55, p.w / 2), p.z - .5];
  return {at, yaw: Math.atan2(p.x - at[0], p.z - at[1])};
}

// Where a find comes up: at the foot of a low piece, under the lifted side of a pushed one, hanging on the fence's
// corner, and for a tree or an arch on the ground just in front of where she stands (it falls: from, to). Looked
// at from the shore, she stands off its left end with her back to the camera: what was there shows nearer its
// middle, clear of her.
export function findSpot(p, page) {
  const how = howOf(p), side = p.shore || p.spot ? .05 : null;
  if (how === 'shake') return {from: [underTree(p, page) + .3, p.h * .55, p.z + .12], to: [underTree(p, page) + .45, 0, p.z + 1.05]};
  if (how === 'part') return {to: [p.x - p.w * (side ?? .28), 0, p.z + .04]};
  if (how === 'look') return {to: [p.x - p.w * (side ?? .3), .18, p.z + .06]};
  return {to: [p.x, 0, p.z - .06]};
}

// ── What hides where ─────────────────────────────────────────────────────────────────────────────────────────────

// What a piece may hide, by weight: its own picture's (a cherry sheds cherry blossom), else its kind's, else, for a
// clump of flowers or mushrooms, only its own kind.
export function findsAt(p, place) {
  if (place.artFinds?.[p.art]) return place.artFinds[p.art];
  const kind = place.hides[kindOf(p.art)];
  if (kind?.finds) return kind.finds;
  const own = Object.keys(place.finds).find(id => place.finds[id].art === p.art);
  return own ? {[own]: 1} : {};
}
// The places that can hide something on a walk: not one that is only a view, or only scenery.
export const searchable = (p, place) => !p.view && !p.still && kindOf(p.art) in place.hides;

// A small seeded random source (mulberry32): the same seed, the same walk.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const weighted = (weights, rand) => {
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
  return weights.length - 1;
};

// What hides where on one walk, and which of those glint: {hidden: piece id → find id, glints: [piece id]}.
// place.hidden places in all, chosen by how often their kind hides things (times `night` after dark); at dawn the
// kinds in place.dawn hold their own dawn find besides. The ones that glint are among the clumps out in the open
// (flowers, mushrooms) when there are such, and never one hidden deep or a dawn find.
export function hideFinds(seed, place, {night = false, dawn = false} = {}) {
  const rand = seeded(seed), places = place.pieces.filter(p => searchable(p, place)), hidden = {};
  for (let n = 0; n < place.hidden && places.length; n++) {
    const i = weighted(places.map(p => { const h = place.hides[kindOf(p.art)]; return h.often * (night && h.night || 1); }), rand);
    const [p] = places.splice(i, 1), finds = findsAt(p, place), ids = Object.keys(finds);
    if (!ids.length) continue;
    hidden[p.id] = ids[weighted(ids.map(id => finds[id] * (night && place.finds[id].night || 1)), rand)];
  }
  const dawnFinds = new Set();
  if (dawn && place.dawn) for (const p of place.pieces) {
    const find = place.dawn[kindOf(p.art)];
    if (find) { hidden[p.id] = find; dawnFinds.add(find); }
  }
  const open = Object.keys(hidden).filter(id => !place.finds[hidden[id]].deep && !dawnFinds.has(hidden[id]));
  const out = id => ['flower', 'mushroom'].includes(kindOf(place.pieces.find(p => p.id === id).art));
  const glints = [...open.filter(out), ...open.filter(id => !out(id))].slice(0, place.glints);
  return {hidden, glints};
}
