import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {along, findSpot, findsAt, hideFinds, howOf, kindOf, nearestAlong, nearestOnWeb, pathLength, pathWeb, pointAt, routeOn, searchSpot,
  searchable} from '../src/explore-place.js';
import {FIRST_STOP, PATH, WOODS} from '../src/explore-woods-layout.js';
import {HILL} from '../src/explore-hill-layout.js';
import {LAKE} from '../src/explore-lake-layout.js';
import {TEA} from '../src/explore-tea-layout.js';
import {FIELD} from '../src/explore-field-layout.js';
import {MINE} from '../src/explore-mine-layout.js';
import {DEEP} from '../src/explore-deep-layout.js';

const PLACES = [WOODS, HILL, LAKE, TEA, FIELD, MINE, DEEP];
const close = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const file = (place, name) => new URL('../public' + place.dir + name, import.meta.url);
// A WebP picture's size, from its header (lossy VP8, lossless VP8L or extended VP8X).
function webpSize(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (kind === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)]; }
  throw Error('not a webp picture: ' + kind);
}
const onPage = (place, [x, z]) => Math.abs(x) <= place.page.width / 2 + 1e-9 && Math.abs(z) <= place.page.depth / 2 + 1e-9;
const piece = (place, id) => place.pieces.find(p => p.id === id);
// The shortest way from a point to any of a place's paths.
const toPaths = (place, p) => Math.min(...place.paths.map(path => { const q = pointAt(nearestAlong(p, path), path); return Math.hypot(q[0] - p[0], q[1] - p[1]); }));

for (const place of PLACES) {
  test(`${place.name}: every picture is there, the size the page expects`, () => {
    const boards = [[place.ground.art, place.ground.size], [place.backdrop.art, place.backdrop.size], ...(place.backdrop.night ? [[place.backdrop.night, place.backdrop.size]] : [])];
    for (const [name, size] of [...boards, ...Object.entries(place.art).map(([a, s]) => [a + '.webp', s])]) {
      assert.ok(existsSync(file(place, name)), name);
      assert.deepEqual(webpSize(readFileSync(file(place, name))), size, name);
    }
    for (const p of place.pieces) assert.ok(place.art[p.art], p.art);
    for (const [id, f] of Object.entries(place.finds)) assert.ok(place.art[f.art] && f.name, id);
  });

  test(`${place.name}: the pieces stand on the page and off the paths; what hides anywhere is something to find`, () => {
    for (const p of place.pieces) {
      assert.ok(onPage(place, [p.x, p.z]), p.id);
      assert.ok(close(p.w / p.h, place.art[p.art][0] / place.art[p.art][1]), p.id);
      // Its foot, end to end, keeps clear of the paths they walk; an arch stands across one, its posts either side.
      if (kindOf(p.art) === 'arch') {
        assert.ok(toPaths(place, [p.x, p.z]) < .2, `${p.id} stands across a path`);
        for (const x of [p.x - p.w * .42, p.x + p.w * .42]) assert.ok(toPaths(place, [x, p.z]) > .35, `${p.id}: a post on the path`);
      } else for (const x of [p.x - p.w / 2, p.x, p.x + p.w / 2]) assert.ok(toPaths(place, [x, p.z]) > .35, `${p.id} stands on a path`);
    }
    assert.equal(new Set(place.pieces.map(p => p.id)).size, place.pieces.length);
    for (const table of [...Object.values(place.hides).map(h => h.finds || {}), ...Object.values(place.artFinds || {})]) for (const id of Object.keys(table)) assert.ok(place.finds[id], id);
    for (const p of place.pieces.filter(p => searchable(p, place))) assert.ok(Object.keys(findsAt(p, place)).length, `${p.id} can hide something`);
    assert.ok(place.hidden > place.basket, 'more hides than one basket carries');
    assert.ok(place.pieces.filter(p => searchable(p, place)).length > place.hidden * 2, 'far more places to look than hide anything');
  });

  test(`${place.name}: the paths meet as one web, and they walk in along it`, () => {
    const web = pathWeb(place.paths);
    for (const p of web.nodes) assert.ok(onPage(place, p), String(p));
    // Every fork and corner can be reached from every other.
    const seen = new Set([0]), todo = [0];
    while (todo.length) for (const {to} of web.next[todo.pop()]) if (!seen.has(to)) { seen.add(to); todo.push(to); }
    assert.equal(seen.size, web.nodes.length, 'one web, nothing cut off');
    assert.ok(nearestOnWeb(web, place.start).d < 1e-6 && nearestOnWeb(web, place.firstStop).d < 1e-6, 'they come in on a path and stop on one');
    const route = routeOn(web, place.start, place.firstStop);
    assert.deepEqual(route.at(-1), place.firstStop);
    assert.ok(route.every(p => nearestOnWeb(web, p).d < 1e-6), 'walking in, they keep to the paths');
  });

  test(`${place.name}: looking through a piece: how, where she stands, where what was there comes up`, () => {
    for (const p of place.pieces) {
      const how = howOf(p), {at, yaw} = searchSpot(p, place.page), spot = findSpot(p, place.page);
      assert.ok(onPage(place, at), `${p.id}: she stands on the page`);
      assert.ok(onPage(place, [spot.to[0], spot.to[2]]), `${p.id}: it comes up on the page`);
      const kind = kindOf(p.art);
      // Only a view: looked out from, at its spot.
      if (p.view) assert.ok(how === 'look' && p.spot && !searchable(p, place), p.id);
      else if (kind === 'tree' || kind === 'arch') assert.equal(how, 'shake');
      else if (['fence', 'dock', 'boat', 'basket', 'cart', 'well', 'crate', 'crystal', 'lamp', 'beam'].includes(kind)) assert.equal(how, 'look');
      else assert.equal(how, p.h < 1 && kind !== 'reed' && kind !== 'fern' ? 'lift' : 'part', p.id);
      if (p.spot) {
        // Out in the water: where the piece says, on the shore, the two of them by a path (the point between them).
        assert.deepEqual([at, yaw], [p.spot.at, p.spot.yaw], p.id);
        assert.ok(toPaths(place, [at[0] + Math.cos(yaw) * .45, at[1] - Math.sin(yaw) * .45]) < .5, `${p.id}: looked at from by a path`);
      } else if (p.shore) {
        // At the water's edge: off its left end, a little in front, the two of them facing the water, him on her left.
        assert.ok(at[0] < p.x - p.w / 2 && at[1] > p.z && close(yaw, Math.PI), p.id);
        assert.ok(onPage(place, [at[0] - .9, at[1]]), `${p.id}: he stands on the page`);
      } else if (how === 'shake') {
        // In front of it, the two of them facing it; what falls comes from up in it and lands in front of her.
        assert.ok(at[1] > p.z && close(yaw, Math.PI) && Math.abs(at[0] - .45 - p.x) < .6, p.id);
        assert.ok(onPage(place, [at[0] - .9, at[1]]), `${p.id}: he stands on the page`);
        assert.ok(spot.from[1] >= p.h * .5 && spot.to[1] === 0 && spot.to[2] > at[1], p.id);
      } else if (how === 'lift') assert.ok(at[1] < p.z, `${p.id}: she crouches behind it`);
      // Clear of it on its left, side on, so it tips away from her.
      else if (how === 'part') assert.ok(at[0] < p.x - p.w / 2 && close(yaw, Math.PI / 2), p.id);
    }
  });

  test(`${place.name}: what hides where on a walk: the same seed the same walk, each walk its own`, () => {
    const a = hideFinds(42, place), b = hideFinds(42, place), c = hideFinds(43, place);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    const dawnKinds = Object.keys(place.dawn || {});
    for (let seed = 1; seed <= 200; seed++) {
      for (const time of [{}, {night: true}, {dawn: true}]) {
        const {hidden, glints} = hideFinds(seed, place, time), ids = Object.keys(hidden);
        const atDawn = time.dawn ? place.pieces.filter(p => dawnKinds.includes(kindOf(p.art))).length : 0;
        assert.equal(ids.length, place.hidden + atDawn, `seed ${seed}`);
        const dawnFinds = new Set(Object.values(place.dawn || {}));
        for (const id of ids) {
          const p = piece(place, id), find = hidden[id];
          if (time.dawn && dawnKinds.includes(kindOf(p.art))) { assert.equal(find, place.dawn[kindOf(p.art)]); continue; }
          assert.ok(searchable(p, place) && findsAt(p, place)[find], `${id} hides ${find}`);
          // A clump of flowers or of mushrooms only ever hides its own kind.
          if (['flower', 'mushroom'].includes(kindOf(p.art))) assert.equal(place.finds[find].art, p.art);
        }
        for (const f of dawnFinds) assert.ok(!Object.values(hidden).includes(f) || time.dawn, `${f} only at dawn`);
        // A couple glint to start her off: among what hides, never one hidden deep, out in the open when there's one.
        const plain = ids.filter(id => !place.finds[hidden[id]].deep && !(time.dawn && dawnKinds.includes(kindOf(piece(place, id).art))));
        assert.equal(glints.length, Math.min(place.glints, plain.length));
        for (const id of glints) assert.ok(plain.includes(id));
        const open = plain.filter(id => ['flower', 'mushroom'].includes(kindOf(piece(place, id).art)));
        if (open.length >= place.glints) assert.ok(glints.every(id => open.includes(id)), `seed ${seed}: glints out in the open`);
      }
    }
  });

  test(`${place.name}: over many walks everything turns up somewhere`, () => {
    const dawnFinds = new Set(Object.values(place.dawn || {})), seen = new Set();
    for (let seed = 1; seed <= 400; seed++) for (const night of [false, true]) for (const f of Object.values(hideFinds(seed, place, {night}).hidden)) seen.add(f);
    for (const find of Object.keys(place.finds).filter(f => !dawnFinds.has(f))) assert.ok(seen.has(find), `${find} never hides anywhere`);
  });
}

test('the woods: mushrooms more after dark, the dew web every dawn, honeycomb rare', () => {
  const count = (time, find) => { let n = 0; for (let seed = 1; seed <= 400; seed++) n += Object.values(hideFinds(seed, WOODS, time).hidden).filter(f => f === find).length; return n; };
  assert.ok(count({night: true}, 'red-cap-mushroom') > count({}, 'red-cap-mushroom') * 1.2, 'more mushrooms after dark');
  assert.equal(count({dawn: true}, 'dew-web'), 400);
  assert.ok(count({}, 'honeycomb') < count({}, 'oak-twig'), 'honeycomb is rarer than a twig');
});

test('the flower hill: cherries drop cherry blossom, wisteria drops wisteria', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const [id, find] of Object.entries(hideFinds(seed, HILL).hidden)) {
      const art = piece(HILL, id).art;
      if (find === 'sakura-sprig') assert.ok(/cherry/.test(art), `${art} dropped cherry blossom`);
      if (find === 'wisteria-sprig') assert.ok(/wisteria/.test(art), `${art} dropped wisteria`);
    }
  }
});

test('the lakeside: reed plumes in the reeds, shells by moonlight, forget-me-nots deep; the willows and the pier hide nothing', () => {
  const count = (time, find) => { let n = 0; for (let seed = 1; seed <= 400; seed++) n += Object.values(hideFinds(seed, LAKE, time).hidden).filter(f => f === find).length; return n; };
  assert.ok(count({night: true}, 'shell') > count({}, 'shell') * 1.2, 'more shells after dark');
  assert.ok(LAKE.finds['forget-me-not'].deep);
  for (let seed = 1; seed <= 300; seed++) {
    for (const [id, find] of Object.entries(hideFinds(seed, LAKE, {night: seed % 2 === 0}).hidden)) {
      const kind = kindOf(piece(LAKE, id).art);
      assert.ok(!['tree', 'dock'].includes(kind), `${id} hid ${find}`);
      if (find === 'reed-plume') assert.ok(['reed', 'boat'].includes(kind), `${id} hid a reed plume`);
    }
  }
  // Something stands in the water, looked at from the shore: the boat and the pier's posts.
  assert.ok(LAKE.pieces.some(p => kindOf(p.art) === 'boat' && (p.shore || p.spot)) && LAKE.pieces.some(p => kindOf(p.art) === 'dock' && p.spot));
});

test('the tea hill: tea from the tea, one path to the top, the big tree there only to look out from, the far slopes only scenery', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const [id, find] of Object.entries(hideFinds(seed, TEA, {night: seed % 2 === 0}).hidden)) {
      const p = piece(TEA, id);
      assert.ok(!p.still && !p.view, `${id} hid ${find}`);
      if (find === 'tea-sprig') assert.ok(['tea', 'tree', 'basket'].includes(kindOf(p.art)), `${id} hid tea`);
    }
  }
  assert.equal(TEA.paths.length, 1);
  const top = TEA.pieces.find(p => p.art === 'tree-summit-large');
  assert.ok(top.view && howOf(top) === 'look' && !searchable(top, TEA));
  // Looking out from the top: down the hill, towards the camera.
  assert.equal(searchSpot(top, TEA.page).yaw, 0);
  // Scenery stands well off the path; what can be looked through is near it.
  for (const p of TEA.pieces) {
    const d = toPaths(TEA, [p.x, p.z]);
    if (p.still) assert.ok(d > 2.5 && !searchable(p, TEA), p.id); else assert.ok(d < 2, `${p.id} is ${d.toFixed(2)} off the path`);
  }
});

test('the fields: cherries from the cherry trees, taro deep in its leaves, wheat in the rows; the well only to look into', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    for (const [id, find] of Object.entries(hideFinds(seed, FIELD, {night: seed % 2 === 0}).hidden)) {
      const p = piece(FIELD, id), kind = kindOf(p.art);
      assert.ok(!p.still && !p.view, `${id} hid ${find}`);
      seen.add(find);
      if (find === 'cherries') assert.ok(['tree', 'cart'].includes(kind), `${id} hid cherries`);
      if (find === 'taro') assert.ok(['taro', 'cart'].includes(kind), `${id} hid a taro`);
      // For the kitchen: tomatoes off the frames, bok choy from its patches (or either in the barrow).
      if (find === 'tomato') assert.ok(['vine', 'cart'].includes(kind), `${id} hid a tomato`);
      if (find === 'greens') assert.ok(['greens', 'cart'].includes(kind), `${id} hid greens`);
    }
  }
  assert.ok(seen.has('tomato') && seen.has('greens'), 'tomatoes and greens turn up');
  for (const art of ['tomato-vine-1', 'tomato-vine-2']) assert.equal(kindOf(art), 'vine');
  for (const art of ['greens-row-1', 'greens-row-2']) assert.equal(kindOf(art), 'greens');
  assert.ok(FIELD.finds.taro.deep);
  const well = FIELD.pieces.find(p => p.art === 'stone-well');
  assert.ok(well.view && howOf(well) === 'look' && !searchable(well, FIELD));
  // Both of them stand on the page wherever she looks through something.
  for (const p of FIELD.pieces) {
    const {at, yaw} = searchSpot(p, FIELD.page), him = [at[0] + Math.cos(yaw) * .9, at[1] - Math.sin(yaw) * .9];
    assert.ok(onPage(FIELD, at) && onPage(FIELD, him), p.id);
  }
});

test('one path: points along it, the nearest point on it, the way along it', () => {
  const length = pathLength(PATH);
  assert.ok(length > 15 && length < 30);
  assert.deepEqual(pointAt(0, PATH), PATH[0]);
  assert.deepEqual(pointAt(length + 5, PATH), PATH.at(-1));
  for (const s of [0, 1.3, 4.2, 9.9, length]) assert.ok(close(nearestAlong(pointAt(s, PATH), PATH), s, 1e-6), String(s));
  assert.ok(FIRST_STOP > 0 && FIRST_STOP < length);
  // Forward and back: the corners between, in order, and the end itself.
  const ahead = along(1, 9, PATH), back = along(9, 1, PATH);
  assert.deepEqual(ahead.at(-1), pointAt(9, PATH));
  assert.deepEqual(back.at(-1), pointAt(1, PATH));
  assert.equal(ahead.length, back.length);
  const at = p => nearestAlong(p, PATH);
  assert.ok(ahead.every((p, i) => !i || at(p) > at(ahead[i - 1])));
  assert.ok(back.every((p, i) => !i || at(p) < at(back[i - 1])));
});

test('the way to a clump: onto the path, along it, off it to the spot', () => {
  const web = pathWeb(WOODS.paths), from = WOODS.firstStop, clump = WOODS.pieces.find(p => p.art === 'flower-white'), {at, yaw} = searchSpot(clump, WOODS.page);
  const route = routeOn(web, from, at);
  assert.deepEqual(route.at(-1), at);
  assert.ok(route.slice(0, -1).every(p => nearestOnWeb(web, p).d < 1e-6), 'walks the path until it leaves it for the spot');
  // She stands behind it on its left and faces it: half towards the camera.
  assert.ok(at[0] < clump.x && at[1] < clump.z);
  assert.ok(yaw > 0 && yaw < Math.PI / 2);
  assert.ok(close(yaw, Math.atan2(clump.x - at[0], clump.z - at[1])));
  // Already on the spot: nowhere to go; a step away: straight there, not round by the path.
  assert.deepEqual(routeOn(web, at, at), []);
  assert.deepEqual(routeOn(web, at, [at[0] + .5, at[1] + .3]), [[at[0] + .5, at[1] + .3]]);
});

test('the flower hill: round the big meadow the short way, through the forks', () => {
  const web = pathWeb(HILL.paths), near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < .05;
  // From the top of the meadow to the bottom of it: back round by the left fork, not the long way round the right.
  const route = routeOn(web, [-2.2, -2.75], [-1.5, 2.3]);
  assert.ok(route.some(p => near(p, [-6.5, -0.75])), 'by the left fork');
  assert.ok(!route.some(p => near(p, [5.35, 1.5])), 'not round the right');
  // To the top of the page: up through the wisteria arch.
  const arch = HILL.pieces.find(p => kindOf(p.art) === 'arch'), up = routeOn(web, HILL.firstStop, [5.8, -3.95]);
  assert.ok(up.some((p, i) => i && (p[1] - arch.z) * (up[i - 1][1] - arch.z) <= 0 && Math.abs(p[0] - arch.x) < arch.w * .3), 'under the arch');
});

test('the mine: ore out of the rocks, rubies out of the red one, fluorite among the clusters; under the lamp, always held', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const [id, find] of Object.entries(hideFinds(seed, MINE).hidden)) {
      const p = piece(MINE, id), kind = kindOf(p.art);
      assert.ok(!p.still && !p.view, `${id} hid ${find}`);
      if (find === 'ruby') assert.ok(p.art === 'ruby-rock' || kind === 'cart', `${id} hid a ruby`);
      if (find === 'amethyst') assert.equal(kind, 'crystal', `${id} hid amethyst`);
    }
  }
  assert.ok(MINE.finds.amethyst.deep && MINE.finds['gold-nugget'].deep);
  assert.ok(MINE.cave && MINE.enter && MINE.nightView && MINE.hugMoment);
  const lamp = MINE.pieces.find(p => p.art === 'oil-lamp');
  assert.ok(lamp.view && howOf(lamp) === 'look' && !searchable(lamp, MINE));
  // The timber frames stand over the two ways like arches; nothing hides in them.
  for (const f of MINE.pieces.filter(p => p.art.startsWith('timber-frame'))) assert.ok(kindOf(f.art) === 'arch' && f.still, f.id);
  for (const p of MINE.pieces) {
    const {at, yaw} = searchSpot(p, MINE.page), him = [at[0] + Math.cos(yaw) * .9, at[1] - Math.sin(yaw) * .9];
    if (!p.still) assert.ok(onPage(MINE, at) && onPage(MINE, him), p.id);
  }
});

test('deep in the woods: cacao off the cacao tree, ferns and orchids in the ferns, glowing mushrooms more after dark; the beam only to stand in', () => {
  let day = 0, night = 0;
  for (let seed = 1; seed <= 300; seed++) {
    for (const at of [false, true]) {
      for (const [id, find] of Object.entries(hideFinds(seed, DEEP, {night: at}).hidden)) {
        const p = piece(DEEP, id), kind = kindOf(p.art);
        assert.ok(!p.still && !p.view, `${id} hid ${find}`);
        if (find === 'cacao') assert.equal(p.art, 'tree-cacao', `${id} hid cacao`);
        if (find === 'fern-leaf') assert.equal(kind, 'fern', `${id} hid a fern leaf`);
        if (find === 'glow-mushroom') at ? night++ : day++;
      }
    }
  }
  assert.ok(night > day, 'more glowing mushrooms after dark');
  assert.ok(DEEP.finds.amber.deep && DEEP.finds['white-orchid'].deep);
  const beam = DEEP.pieces.find(p => p.art === 'sunbeam');
  assert.ok(beam.view && beam.glow && howOf(beam) === 'look' && !searchable(beam, DEEP));
  const arch = DEEP.pieces.find(p => p.art === 'root-arch');
  assert.ok(kindOf(arch.art) === 'arch' && arch.still && DEEP.arch.say && DEEP.arch.moment);
  for (const p of DEEP.pieces) {
    const {at, yaw} = searchSpot(p, DEEP.page), him = [at[0] + Math.cos(yaw) * .9, at[1] - Math.sin(yaw) * .9];
    if (!p.still) assert.ok(onPage(DEEP, at) && onPage(DEEP, him), p.id);
  }
});
