import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {readFile, stat} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {publicAccessories} from '../body/accessory-pieces.js';
import {registerAccessories, accessoryById, slotOf, piecesFor, wearablesFor, cardKey, isHomeAccessory, SLOTS, showsWith} from '../body/accessory-registry.js';
import {braidTies} from '../body/accessory-tools.js';
import {createBraidsHair} from '../body/hair-braids.js';
import {createAccessories, placeAccessories, coverOutfit} from '../body/accessories.js';
import {registerOutfits, outfitsFor} from '../body/outfit-registry.js';
import {hairsFor, makeHair} from '../body/hair-registry.js';
import {createOutfits, applyOutfitFit} from '../body/outfits.js';
import {cleanWardrobe, publicLook} from '../body/wardrobe-state.js';
import {weightsAt} from '../body/avatar-rig.js';
import {pictureSources} from '../scripts/wardrobe-picture-sources.mjs';

// The public pieces (body/accessory-pieces.js) are worn with every hairstyle (body/hair-pieces.js) and
// a home's own outfits too (src/ours/, not in the public copy); where those are there, the pieces are
// checked on them as well.
const ours = suffix => fs.existsSync('src/ours') ? fs.readdirSync('src/ours').filter(f => f.endsWith(suffix)).sort() : [];
for (const f of ours('.outfit.js')) registerOutfits((await import('../src/ours/' + f)).outfits);

const pieces = publicAccessories, inSlot = slot => pieces.filter(a => slotOf(a.id) === slot);
// Where a look keeps what is worn in each slot.
const lookKey = slot => slot === 'head' ? 'accessory' : slot;
// The head, as the residents have it (body/round-head.js, body/proportions.js), and the torso's axis.
const HEAD = new T.Box3(new T.Vector3(-1.156, 1.395, -.948), new T.Vector3(1.155, 3.357, .88));
const centre = HEAD.getCenter(new T.Vector3()), unit = HEAD.getSize(new T.Vector3()).x / .86;
const inHead = v => ((v.x - centre.x) / (.43 * unit)) ** 2 + ((v.y - centre.y) / (.365 * unit)) ** 2 + ((v.z - centre.z) / (.34 * unit)) ** 2 < .995;
function eachPoint(object, f, step = 1) {
  object.updateWorldMatrix(true, true);
  const v = new T.Vector3();
  object.traverse(o => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i += step) f(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld), o);
  });
}
// Every visible mesh in these objects as surfaces a ray hits from either side, where they are now: their triangles
// in world space, kept in a grid of little cubes, so a ray is only tried against the triangles in the cubes it
// passes through. What it finds is what three's Raycaster finds against the meshes drawn double-sided (the same
// triangles, the same intersection), only without trying every triangle for every one of the many short rays.
const CELL = .08, PAD = 1e-4, cellOf = v => Math.floor(v / CELL), cellKey = (i, j, k) => ((i + 4096) * 8192 + (j + 4096)) * 8192 + (k + 4096);
const seenFromBothSides = (...objects) => {
  const tris = [], a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  for (const object of objects) {
    object.updateWorldMatrix(true, true);
    object.traverse(m => {
      if (!m.isMesh || !m.visible) return;
      const g = m.geometry, p = g.attributes.position, index = g.index, count = index ? index.count : p.count;
      const start = Math.max(0, g.drawRange.start), end = Math.min(count, g.drawRange.start + g.drawRange.count), at = i => (index ? index.getX(i) : i);
      for (let i = start; i < end - 2; i += 3) {
        a.fromBufferAttribute(p, at(i)).applyMatrix4(m.matrixWorld);
        b.fromBufferAttribute(p, at(i + 1)).applyMatrix4(m.matrixWorld);
        c.fromBufferAttribute(p, at(i + 2)).applyMatrix4(m.matrixWorld);
        tris.push(a.clone(), b.clone(), c.clone());
      }
    });
  }
  const cells = new Map(), n = tris.length / 3;
  for (let t = 0; t < n; t++) {
    const [p, q, r] = [tris[3 * t], tris[3 * t + 1], tris[3 * t + 2]];
    const lo = [0, 1, 2].map(k => cellOf(Math.min(p.getComponent(k), q.getComponent(k), r.getComponent(k)) - PAD));
    const hi = [0, 1, 2].map(k => cellOf(Math.max(p.getComponent(k), q.getComponent(k), r.getComponent(k)) + PAD));
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      const key = cellKey(i, j, k);
      let list = cells.get(key);
      if (!list) cells.set(key, (list = []));
      list.push(t);
    }
  }
  const seen = new Int32Array(n), ray = new T.Ray(), point = new T.Vector3();
  let stamp = 0;
  return {
    // Hits along the ray from `from` along `dir` (a unit vector), `far` at most, nearest first.
    hits(from, dir, far) {
      stamp++;
      ray.set(from, dir);
      const hits = [], o = [from.x, from.y, from.z], d = [dir.x, dir.y, dir.z], cell = o.map(cellOf), step = d.map(Math.sign);
      const tMax = d.map((dk, k) => (dk ? ((cell[k] + (dk > 0 ? 1 : 0)) * CELL - o[k]) / dk : Infinity)), tDelta = d.map(dk => (dk ? CELL / Math.abs(dk) : Infinity));
      for (;;) {
        for (const t of cells.get(cellKey(...cell)) || []) {
          if (seen[t] === stamp) continue;
          seen[t] = stamp;
          if (!ray.intersectTriangle(tris[3 * t], tris[3 * t + 1], tris[3 * t + 2], false, point)) continue;
          const distance = from.distanceTo(point);
          if (distance <= far) hits.push({distance, point: point.clone()});
        }
        const k = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
        if (tMax[k] > far) break;
        cell[k] += step[k];
        tMax[k] += tDelta[k];
      }
      return hits.sort((p, q) => p.distance - q.distance);
    }
  };
};
const hitsAlong = (surfaces, from, dir, far) => surfaces.hits(from, dir, far);
// The outfits as the residents wear them: built, then fitted from the fit the build worked out
// (public/models/outfits-fit.json, and src/ours/outfits-fit.json for a home's own; scripts/build-outfits.mjs and
// scripts/ours-fit.mjs),
// rather than working the fit out again in every test, which takes most of a minute. It is worked out afresh
// first when it's missing or older than anything it comes from (the body, the garments, a home's own outfits, the
// script), so a changed garment or body is never tested against an old fit.
const FIT = 'public/models/outfits-fit.json', OURS_FIT = 'src/ours/outfits-fit.json';
const fits = () => [FIT, ...(fs.existsSync('src/ours') ? [OURS_FIT] : [])];
const fitSources = () => [
  ...fs.readdirSync('body').filter(f => f.endsWith('.js')).map(f => 'body/' + f),
  ...(fs.existsSync('src/ours') ? fs.readdirSync('src/ours').filter(f => f.endsWith('.outfit.js')).map(f => 'src/ours/' + f) : []),
  'public/models/resident-body.glb', 'scripts/build-outfits.mjs', 'scripts/ours-fit.mjs'
];
let fitFresh = false;
const fittedOutfits = () => {
  if (!fitFresh) {
    const made = Math.min(...fits().map(f => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : -Infinity)));
    if (fitSources().some(f => fs.statSync(f).mtimeMs > made)) for (const script of ['scripts/build-outfits.mjs', 'scripts/ours-fit.mjs']) execFileSync(process.execPath, [script], {stdio: 'inherit'});
    fitFresh = true;
  }
  const outfits = createOutfits();
  applyOutfitFit(outfits, Object.assign({}, ...fits().map(f => JSON.parse(fs.readFileSync(f, 'utf8')))));
  return outfits;
};
const loadBody = async () => {
  const b = fs.readFileSync('public/models/resident-body.glb');
  return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')).scene.getObjectByName('purchased-body');
};

test('the public pieces are complete, and their cards show their own pictures from the start', async () => {
  const html = await readFile('body/index.html', 'utf8'), manifest = JSON.parse(await readFile('body/wardrobe-pictures.json', 'utf8'));
  assert.ok(pieces.length >= 3);
  for (const a of pieces) {
    assert.match(a.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(!['none', 'bow', 'beret'].includes(a.id) && accessoryById(a.id) === a && !isHomeAccessory(a.id), a.id);
    assert.ok(a.name?.length && a.wearers?.length && a.wearers.every(w => ['girl', 'boy'].includes(w)), a.id);
    assert.ok(SLOTS.includes(slotOf(a.id)), a.id);
    assert.ok(a.colorways?.length && new Set(a.colorways.map(w => w.id)).size === a.colorways.length && typeof a.paint === 'function', `${a.id}: colourways`);
    for (const w of a.colorways) assert.ok(w.name && /^#[0-9a-f]{6}$/i.test(w.colors.main) && /^#[0-9a-f]{6}$/i.test(w.colors.accent), `${a.id}/${w.id}`);
    // a card of its own in index.html, in the row of its slot, with its picture and its name
    const key = cardKey(slotOf(a.id)), file = `/wardrobe/accessory-${a.id}.webp`;
    assert.match(html, new RegExp(`data-${key}="${a.id}" class="item has-thumbnail"[^>]*><img src="${file}"[^>]*>[^]*?<span class="sr-only">${a.name}</span>`), `${a.id}: its card`);
    if (key !== 'accessory') assert.match(html, new RegExp(`data-slot="${key}"[^]*?data-${key}="${a.id}"`), `${a.id}: in its row`);
    assert.equal(manifest.files[`${key}=${a.id}`], file, `${a.id}: photographed`);
    assert.ok((await stat('public' + file)).size > 1000, file);
  }
  // a new piece's file changes its picture: they are all among the picture sources
  for (const f of fs.readdirSync('body').filter(f => /^accessory-.*\.js$/.test(f) && f !== 'accessory-registry.js')) assert.ok(pictureSources.includes('body/' + f), `${f} is a picture source`);
});

test('each piece can be worn, and kept, only by its wearers and only in its own slot', () => {
  for (const a of pieces) {
    const slot = slotOf(a.id), [first, second] = a.colorways;
    for (const kind of ['girl', 'boy']) {
      const mine = a.wearers.includes(kind);
      for (const s of SLOTS) assert.equal(piecesFor(kind, s).includes(a.id), mine && s === slot, `${a.id} in ${s} for ${kind}`);
      assert.equal(wearablesFor(kind).includes(a.id), mine);
      for (const s of SLOTS) {
        const look = cleanWardrobe({[kind]: {[lookKey(s)]: a.id}})[kind];
        assert.equal(look[lookKey(s)] === a.id, mine && s === slot, `${a.id} kept as ${s} for ${kind}`);
      }
      // a colourway is kept for the one who may wear it, and only a real one
      const ways = cleanWardrobe({[kind]: {[lookKey(slot)]: a.id, accessoryWays: {[a.id]: (second || first).id, nothing: first.id}}})[kind].accessoryWays;
      assert.deepEqual(ways, mine ? {[a.id]: (second || first).id} : undefined, `${a.id}: colourway for ${kind}`);
      assert.equal(cleanWardrobe({[kind]: {accessoryWays: {[a.id]: 'nowhere'}}})[kind].accessoryWays, undefined);
      if (mine) {
        const look = cleanWardrobe({[kind]: {[lookKey(slot)]: a.id, accessoryWays: {[a.id]: (second || first).id}}})[kind];
        assert.deepEqual(cleanWardrobe({[kind]: JSON.parse(JSON.stringify(look))})[kind], look, `${a.id}: saved and read back the same`);
        assert.deepEqual(publicLook(kind, look), look, `${a.id}: shows outside as it is`);
      }
    }
  }
  // nothing at the neck or on the chest is no key at all
  for (const s of ['neck', 'chest']) for (const kind of ['girl', 'boy']) assert.ok(!(s in cleanWardrobe({[kind]: {[s]: 'none'}})[kind]));
});

test('something at the neck worn only at home shows outside as what it names, and leaves no trace', () => {
  const scarf = inSlot('neck')[0];
  registerAccessories([{id: 'home-only-neck', name: '只在家里', wearers: ['boy'], slot: 'neck', homeOnly: scarf.id, colorways: [{id: 'a', name: 'a', colors: {main: '#111111', accent: '#222222'}}, {id: 'b', name: 'b', colors: {main: '#333333', accent: '#444444'}}], create: () => new T.Group(), place() {}}]);
  const look = cleanWardrobe({boy: {neck: 'home-only-neck', accessoryWays: {'home-only-neck': 'b', [scarf.id]: scarf.colorways.at(-1).id}}}).boy, seen = publicLook('boy', look);
  assert.equal(look.neck, 'home-only-neck');
  assert.equal(seen.neck, scarf.id);
  assert.deepEqual(seen.accessoryWays, {[scarf.id]: scarf.colorways.at(-1).id});
  assert.ok(!JSON.stringify(seen).includes('home-only-neck'));
});

test('each piece is built hidden, only when asked for, in its own colourways, and moves with the pelvis', () => {
  for (const a of pieces) {
    const all = createAccessories([a.id]), object = all[a.id];
    assert.deepEqual(Object.keys(all).sort(), ['beret', 'bow', a.id].sort(), `${a.id}: only what was asked for`);
    assert.ok(object && !object.visible, `${a.id}: built hidden`);
    const meshes = []; object.traverse(m => { if (m.isMesh) meshes.push(m); });
    assert.ok(meshes.length);
    for (const m of meshes) {
      assert.ok(['main', 'accent', 'trim', 'fixed'].includes(m.material.name), `${a.id}/${m.name}: a colour area`);
      for (const at of Object.values(m.geometry.attributes)) assert.ok(Array.from(at.array).every(Number.isFinite), `${a.id}/${m.name}`);
      // its name leaves it to the pelvis everywhere, as the head and the hair are
      for (const [x, y, z] of [[0, 1.2, .2], [.4, .9, 0], [-.2, .5, .1], [.5, 1.1, 0]]) assert.deepEqual(weightsAt(x, y, z, m.name), [[0, 1]], `${a.id}/${m.name}`);
    }
    // every colourway paints its colour areas and nothing else, and leaves the shape as it is
    const fixed = meshes.filter(m => m.material.name === 'fixed').map(m => m.material.color.getHex()), shapes = meshes.map(m => m.geometry);
    for (const w of a.colorways) {
      a.paint(object, w.colors);
      for (const m of meshes) if (w.colors[m.material.name]) assert.equal('#' + m.material.color.getHexString(), w.colors[m.material.name].toLowerCase(), `${a.id}/${w.id}/${m.name}`);
      assert.deepEqual(meshes.filter(m => m.material.name === 'fixed').map(m => m.material.color.getHex()), fixed);
      assert.deepEqual(meshes.map(m => m.geometry), shapes);
    }
  }
});

test('a hat sits on every hairstyle its wearer may wear, over the top of the hair, with no hair showing through it', () => {
  assert.ok(inSlot('head').some(a => a.hat));
  for (const a of inSlot('head').filter(a => a.hat)) for (const kind of a.wearers) for (const id of hairsFor(kind)) {
    const hair = makeHair(id, new T.MeshStandardMaterial(), HEAD), all = createAccessories([a.id]), object = all[a.id];
    placeAccessories(all, hair);
    const box = new T.Box3();
    eachPoint(object, (v, o) => { assert.ok(v.toArray().every(Number.isFinite), `${a.id} on ${id}: ${o.name}`); box.expandByPoint(v); });
    const hairBox = new T.Box3(); hair.traverse(m => { if (m.isMesh && !/-curl$/.test(m.name)) hairBox.expandByObject(m); });
    // on the head (at the back, a beanie comes down a little below its middle, but not to the ears'),
    // and over the hair
    assert.ok(box.min.y > centre.y - .1 * unit && box.max.y > hairBox.max.y && box.min.y < hairBox.max.y, `${a.id} on ${id}: on the head, over the hair`);
    // the top of the hair is under it: straight up from any of it, there is the hat
    const hat = seenFromBothSides(object), top = hairBox.max.y - hairBox.getSize(new T.Vector3()).y * (typeof a.hat === 'number' ? a.hat : .25), up = new T.Vector3(0, 1, 0);
    let uncovered = 0, looked = 0;
    eachPoint(hair, (v, o) => { if (/-curl$/.test(o.name) || v.y <= top) return; looked++; if (!hitsAlong(hat, v, up, 2 * unit).length) uncovered++; }, 3);
    assert.ok(looked > 50, `${a.id} on ${id}: looked at the top of the hair`);
    assert.equal(uncovered, 0, `${a.id} on ${id}: ${uncovered} points of the hair's top stick out`);
    // looking down on it, as the room does, wherever the hat is, the hat is what is seen first
    const curlless = []; hair.traverse(m => { if (m.isMesh && !/-curl$/.test(m.name)) curlless.push(m); });
    const hairs = seenFromBothSides(...curlless), down = new T.Vector3(0, -1, 0), from = new T.Vector3();
    let through = 0;
    for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
      from.set(box.min.x + (box.max.x - box.min.x) * i / 40, box.max.y + 1, box.min.z + (box.max.z - box.min.z) * j / 40);
      const onHat = hitsAlong(hat, from, down, 4)[0], onHair = hitsAlong(hairs, from, down, 4)[0];
      if (onHat && onHair && onHair.distance < onHat.distance - .002) through++;
    }
    assert.equal(through, 0, `${a.id} on ${id}: hair shows through it in ${through} places`);
  }
});

test('something worn in the hair rests on every hairstyle its wearer may wear: on the hair, not sunk into it, and clear of the face', () => {
  const overEye = (x, y) => ((Math.abs(x) - .165) / .077) ** 2 + ((y + .087) / .085) ** 2 < 1.3;
  const ornaments = inSlot('head').filter(a => !a.hat);
  assert.ok(ornaments.length);
  for (const a of ornaments) for (const kind of a.wearers) for (const id of hairsFor(kind)) {
    const hair = makeHair(id, new T.MeshStandardMaterial(), HEAD), all = createAccessories([a.id]), object = all[a.id];
    placeAccessories(all, hair);
    const curlless = []; hair.traverse(m => { if (m.isMesh && !/-curl$/.test(m.name)) curlless.push(m); });
    const hairs = seenFromBothSides(...curlless), dir = new T.Vector3();
    // how far out the hair is from the head's centre towards d (head units)
    const hairOut = d => { const hit = hitsAlong(hairs, centre.clone().addScaledVector(d, 2 * unit), d.clone().negate(), 2 * unit)[0]; return hit ? 2 - hit.distance / unit : 0; };
    let closest = Infinity, sunk = 0, looked = 0;
    eachPoint(object, (v, o) => {
      assert.ok(v.toArray().every(Number.isFinite), `${a.id} on ${id}: ${o.name}`);
      assert.ok(!inHead(v), `${a.id} on ${id}: ${o.name} inside the head`);
      const x = (v.x - centre.x) / unit, y = (v.y - centre.y) / unit, z = (v.z - centre.z) / unit;
      assert.ok(!(overEye(x, y) && z > .2), `${a.id} on ${id}: ${o.name} over an eye`);
      dir.set(x, y, z);const out = dir.length(), gap = out - hairOut(dir.normalize());
      looked++; closest = Math.min(closest, gap); if (gap < -.012) sunk++;
    }, 3);
    assert.ok(closest < .012, `${a.id} on ${id}: rests ${closest.toFixed(3)} off the hair`);
    assert.ok(sunk <= looked * .02, `${a.id} on ${id}: ${sunk} of ${looked} points sunk into the hair`);
  }
});

test('glasses sit round the eyes, clear of the face and the eyes, with temples back over the ears', () => {
  const overEye = (x, y) => ((Math.abs(x) - .165) / .077) ** 2 + ((y + .087) / .085) ** 2 < 1;
  for (const a of inSlot('face')) for (const kind of a.wearers) for (const id of hairsFor(kind).slice(0, 2)) {
    const hair = makeHair(id, new T.MeshStandardMaterial(), HEAD), all = createAccessories([a.id]), object = all[a.id];
    placeAccessories(all, hair);
    const round = [-1, 1].map(() => ({inner: 0, outer: 0, above: 0, below: 0})), back = {left: 0, right: 0};
    eachPoint(object, (v, o) => {
      assert.ok(v.toArray().every(Number.isFinite), `${a.id} on ${id}: ${o.name}`);
      assert.ok(!inHead(v), `${a.id} on ${id}: ${o.name} inside the head`);
      const x = (v.x - centre.x) / unit, y = (v.y - centre.y) / unit, z = (v.z - centre.z) / unit;
      if (z < 0) back[x < 0 ? 'right' : 'left']++;
      if (o.material.transparent || z < .2) return;
      assert.ok(!overEye(x, y), `${a.id} on ${id}: ${o.name} over an eye at ${[x, y].map(q => q.toFixed(3))}`);
      const eye = round[x < 0 ? 0 : 1], dx = Math.abs(x) - .165, dy = y + .087;
      if (Math.abs(dy) < .03 && Math.abs(dx) > .077 && Math.abs(dx) < .077 + .07) eye[dx > 0 ? 'outer' : 'inner']++;
      if (Math.abs(dx) < .03 && Math.abs(dy) > .085 && Math.abs(dy) < .085 + .06) eye[dy > 0 ? 'above' : 'below']++;
    });
    for (const eye of round) assert.ok(Object.values(eye).every(n => n > 0), `${a.id} on ${id}: round both eyes ${JSON.stringify(round)}`);
    assert.ok(back.left > 0 && back.right > 0, `${a.id} on ${id}: temples back past the ears`);
    // the lenses are in front of the eyes
    eachPoint(object, (v, o) => { if (!o.material.transparent) return; const x = (v.x - centre.x) / unit, y = (v.y - centre.y) / unit, z = (v.z - centre.z) / unit; if (overEye(x, y)) assert.ok(z > .318 + .028, `${a.id}: a lens through an eye`); });
  }
});

test('what is worn at the neck sits outside every outfit its wearer may wear, under the head, and above the hips', async () => {
  const body = await loadBody(), outfits = fittedOutfits();
  for (const a of inSlot('neck')) for (const kind of a.wearers) for (const id of outfitsFor(kind)) {
    const hair = makeHair(hairsFor(kind)[0], new T.MeshStandardMaterial(), HEAD), all = createAccessories([a.id]), object = all[a.id];
    coverOutfit(outfits[id], [a.id]);
    placeAccessories(all, hair, {body, outfit: outfits[id]});
    const worn = seenFromBothSides(body, outfits[id]), v = new T.Vector3(), n = new T.Vector3(), radial = new T.Vector3();
    let under = 0, count = 0, hangs = false;
    object.updateWorldMatrix(true, true);
    object.traverse(o => {
      if (!o.isMesh) return;
      const p = o.geometry.attributes.position, nor = o.geometry.attributes.normal;
      for (let i = 0; i < p.count; i += 2) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        assert.ok(v.toArray().every(Number.isFinite), `${a.id} on ${id}: ${o.name}`);
        assert.ok(v.y > .96, `${a.id} on ${id}: ${o.name} down at ${v.y.toFixed(3)}, where the legs move`);
        assert.ok(!inHead(v), `${a.id} on ${id}: ${o.name} in the head at ${v.toArray().map(q => q.toFixed(3))}`);
        // what hangs down in front is over the clothes, not under them: out from any point of it facing
        // away from the body, nothing worn is just there (higher up it goes in under the head and the
        // collar, which sit right on the shoulders)
        n.fromBufferAttribute(nor, i).transformDirection(o.matrixWorld);radial.set(v.x, 0, v.z - .10).normalize();
        if (v.y <= 1.3) hangs = true;
        if (v.y > 1.3 || n.dot(radial) + Math.max(0, n.y) <= .5) continue;
        count++;
        if (hitsAlong(worn, v, n, .02).length) under++;
      }
    });
    assert.ok((!hangs || count > 100) && under <= count * .01, `${a.id} on ${id}: ${under} of ${count} points under the clothes`);
    // something worn up at the collar is in front of it: what faces forward has nothing worn in front
    // (its back may rest on the collar)
    if (!hangs) {
      let front = 0, hidden = 0;
      object.traverse(o => {
        if (!o.isMesh) return;
        const p = o.geometry.attributes.position, nor = o.geometry.attributes.normal;
        for (let i = 0; i < p.count; i += 2) {
          v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);n.fromBufferAttribute(nor, i).transformDirection(o.matrixWorld);
          if (n.z < .5) continue;
          front++;
          if (hitsAlong(worn, v.clone().add(new T.Vector3(0, 0, .002)), new T.Vector3(0, 0, 1), .3).length) hidden++;
        }
      });
      assert.ok(front > 50 && hidden <= front * .01, `${a.id} on ${id}: ${hidden} of ${front} points behind the clothes`);
    }
    coverOutfit(outfits[id], []);
  }
});

test('a bow tie is worn in place of a necktie: the tie hides while it is on, and shows again after', () => {
  const tied = pieces.filter(a => a.covers?.length);
  assert.ok(tied.length);
  for (const a of tied) {
    const outfit = new T.Group(), names = [...a.covers, 'collar'];
    for (const name of names) { const m = new T.Mesh(new T.BoxGeometry(), new T.MeshBasicMaterial()); m.name = name; outfit.add(m); }
    const seen = () => outfit.children.filter(m => m.visible).map(m => m.name);
    coverOutfit(outfit, [a.id]);
    assert.deepEqual(seen(), ['collar'], `${a.id}: covers ${a.covers}`);
    coverOutfit(outfit, []);
    assert.deepEqual(seen(), names, `${a.id}: shows them again`);
    // a part hidden for some other reason stays hidden
    outfit.children[0].visible = false; coverOutfit(outfit, [a.id]); coverOutfit(outfit, []);
    assert.equal(outfit.children[0].visible, false);
  }
});

test('what is worn on the chest stands on the front of every outfit its wearer may wear, over the clothes and close on them', async () => {
  const body = await loadBody(), outfits = fittedOutfits(), ahead = new T.Vector3(0, 0, 1), behind = new T.Vector3(0, 0, -1);
  assert.ok(inSlot('chest').length);
  for (const a of inSlot('chest')) for (const kind of a.wearers) for (const id of outfitsFor(kind)) {
    const hair = makeHair(hairsFor(kind)[0], new T.MeshStandardMaterial(), HEAD), all = createAccessories([a.id]), object = all[a.id];
    placeAccessories(all, hair, {body, outfit: outfits[id]});
    const worn = seenFromBothSides(body, outfits[id]), v = new T.Vector3(), n = new T.Vector3();
    let hidden = 0, count = 0;
    object.updateWorldMatrix(true, true);
    object.traverse(o => {
      if (!o.isMesh) return;
      const p = o.geometry.attributes.position, nor = o.geometry.attributes.normal;
      let gap = Infinity;
      for (let i = 0; i < p.count; i += 2) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        assert.ok(v.toArray().every(Number.isFinite), `${a.id} on ${id}: ${o.name}`);
        // on the chest: above the hips (where the legs move), under the chin, on the front
        assert.ok(v.y > .96 && v.y < 1.42 && v.z > 0, `${a.id} on ${id}: ${o.name} at ${v.toArray().map(q => q.toFixed(3))}`);
        assert.ok(!inHead(v), `${a.id} on ${id}: ${o.name} in the head`);
        // every part of it comes close to what is behind it, rather than standing off in the air
        const back = hitsAlong(worn, v, behind, .3)[0];
        if (back) gap = Math.min(gap, back.distance);
        // what faces out is over the clothes, not in under them: nothing worn is in front of it (its
        // back may rest on them)
        n.fromBufferAttribute(nor, i).transformDirection(o.matrixWorld);
        if (n.z < .5) continue;
        count++;
        if (hitsAlong(worn, v.clone().addScaledVector(ahead, .002), ahead, .3).length) hidden++;
      }
      assert.ok(gap < .03, `${a.id} on ${id}: ${o.name} stands ${gap.toFixed(3)} off the clothes`);
    });
    assert.ok(count > 50 && hidden <= count * .01, `${a.id} on ${id}: ${hidden} of ${count} points under the clothes`);
  }
});

test('what is worn on the braids sits round the end of each braid, and shows only on a hairstyle with braids', () => {
  const tied = inSlot('braid');
  assert.ok(tied.length);
  // the twin braids (body/hair-braids.js), put on the head as makeHair does; the base bob has none
  const braids = createBraidsHair(new T.MeshStandardMaterial());braids.scale.setScalar(unit);braids.position.copy(centre);
  const bob = makeHair('classic', new T.MeshStandardMaterial(), HEAD), ties = braidTies(braids);
  assert.equal(ties.length, 2);assert.equal(braidTies(bob).length, 0);
  for (const a of tied) {
    assert.ok(showsWith(a.id, braids) && !showsWith(a.id, bob), `${a.id}: only with braids`);
    const all = createAccessories([a.id]), object = all[a.id];
    placeAccessories(all, braids);
    const seen = seenFromBothSides(object);
    eachPoint(object, (v, o) => { assert.ok(v.toArray().every(Number.isFinite), `${a.id}: ${o.name}`); assert.ok(!inHead(v), `${a.id}: ${o.name} in the head`); });
    for (const t of ties) {
      // all the way round the braid where it is tied off, close round it
      const at = t.point.clone().multiplyScalar(unit).add(centre);
      for (let i = 0; i < 8; i++) {
        const q = i / 8 * Math.PI * 2, d = t.front.clone().multiplyScalar(Math.cos(q)).addScaledVector(t.side, Math.sin(q)).normalize();
        assert.ok(hitsAlong(seen, at, d, .09 * unit).length, `${a.id}: round the braid towards ${i}`);
      }
    }
    // on the bob it is not worn, and is laid out as a pair, as the wardrobe shows it
    placeAccessories(all, bob);
    assert.equal(object.children.length, 2);
  }
});
