import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import * as T from 'three';
import {registerOutfits, extraOutfits, outfitsFor, colorwaysOf} from '../body/outfit-registry.js';
import {hairsFor, makeHair} from '../body/hair-registry.js';
import {registerAccessories, headwearFor, glassesFor, slotOf, accessoryById, hidesCurl} from '../body/accessory-registry.js';
import {createAccessories, placeAccessories, colorAccessory} from '../body/accessories.js';
import {cleanWardrobe, publicLook, publicWardrobe} from '../body/wardrobe-state.js';
import {weightsAt} from '../body/avatar-rig.js';

// A home's own outfits, headwear and glasses live in src/ours/, which the public copy doesn't have;
// there these checks are skipped. The hairstyles are public (body/hair-pieces.js), registered already.
const ours = suffix => fs.existsSync('src/ours') ? fs.readdirSync('src/ours').filter(f => f.endsWith(suffix)).sort() : [];
for (const f of ours('.outfit.js')) registerOutfits((await import('../src/ours/' + f)).outfits);
const own = [];
for (const f of ours('.accessory.js')) own.push(...(await import('../src/ours/' + f)).accessories);
registerAccessories(own);
const headwear = own.filter(a => slotOf(a.id) === 'head'), glasses = own.filter(a => slotOf(a.id) === 'face');
const homeOnly = extraOutfits.filter(o => o.homeOnly);
const skipOwn = !own.length && 'no home headwear or glasses in src/ours/';
const skipHeadwear = !headwear.length && 'no home headwear in src/ours/';
const skipGlasses = !glasses.length && 'no home glasses in src/ours/';
const skipHomeOnly = !homeOnly.length && !own.some(a => a.homeOnly) && 'nothing worn only at home in src/ours/';
const HEAD = new T.Box3(new T.Vector3(-1.156, 1.395, -.948), new T.Vector3(1.155, 3.357, .88));
// every point of what is worn, where it is in the world
function eachPoint(object, f) {
  object.updateWorldMatrix(true, true);
  const v = new T.Vector3();
  object.traverse(o => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) f(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld), o);
  });
}
function keepsItsColours(object, name) {
  const before = []; object.traverse(o => { if (o.isMesh) before.push(o.material.color.getHex()); });
  colorAccessory(object, '#123456');
  const after = []; object.traverse(o => { if (o.isMesh) after.push(o.material.color.getHex()); });
  assert.deepEqual(after, before, `${name} keeps its colours`);
}

test('a home’s own headwear and glasses are complete, and only their wearers may choose and keep them', {skip: skipOwn}, async () => {
  const manifest = JSON.parse(await readFile('src/ours/wardrobe/pictures.json', 'utf8'));
  for (const a of own) {
    assert.match(a.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(!['none', 'bow', 'beret'].includes(a.id) && accessoryById(a.id) === a, a.id);
    assert.ok(a.name?.length && a.wearers?.length && a.wearers.every(w => ['girl', 'boy'].includes(w)), a.id);
    assert.ok([undefined, 'head', 'face'].includes(a.slot), `${a.id}: worn on the head or the face`);
    const face = slotOf(a.id) === 'face';
    for (const kind of ['girl', 'boy']) {
      const mine = a.wearers.includes(kind), look = cleanWardrobe({[kind]: {accessory: a.id, face: a.id}})[kind];
      assert.equal(headwearFor(kind).includes(a.id), mine && !face, `${a.id} as headwear for ${kind}`);
      assert.equal(glassesFor(kind).includes(a.id), mine && face, `${a.id} as glasses for ${kind}`);
      assert.equal(look.accessory, mine && !face ? a.id : cleanWardrobe({})[kind].accessory, `${a.id} kept as headwear for ${kind}`);
      assert.equal(look.face, mine && face ? a.id : undefined, `${a.id} kept as glasses for ${kind}`);
    }
    // its card shows its own picture first, kept beside it and out of the public files
    const file = manifest.files['accessory=' + a.id];
    assert.ok(file && (await stat('src/ours/wardrobe/' + file)).size > 1000, a.id);
    assert.ok(a.picture?.endsWith('/' + file), a.id);
    assert.ok(!fs.readdirSync('public/wardrobe').some(n => n.startsWith('accessory-' + a.id + '.')));
  }
  assert.equal(headwearFor('girl')[0], 'bow'); assert.equal(headwearFor('boy')[0], 'beret');
  assert.ok(hidesCurl('beret') && !hidesCurl('bow') && !hidesCurl('none'));
  // only glasses are worn on the face, and none is the same as no key at all
  for (const id of ['none', 'bow', 'beret', ...headwear.map(a => a.id)]) assert.equal(cleanWardrobe({boy: {face: id}, girl: {face: id}}).boy.face, undefined, id);
  assert.ok(!('face' in cleanWardrobe({}).girl));
});

test('a home’s own headwear sits on every hairstyle its wearer may wear, and keeps its own colours', {skip: skipHeadwear}, () => {
  const centre = HEAD.getCenter(new T.Vector3());
  for (const a of headwear) for (const kind of a.wearers) for (const id of hairsFor(kind)) {
    const hair = makeHair(id, new T.MeshStandardMaterial(), HEAD), all = createAccessories(), object = all[a.id];
    assert.ok(object && !object.visible, `${a.id}: built hidden`);
    placeAccessories(all, hair);
    const box = new T.Box3();
    eachPoint(object, (v, o) => { assert.ok(v.toArray().every(Number.isFinite), `${a.id} on ${id}: ${o.name}`); box.expandByPoint(v); });
    // on top of the head, rising above the hair, not sunk into it or floating off it
    const hairBox = new T.Box3(); hair.traverse(m => { if (m.isMesh && !/-curl$/.test(m.name)) hairBox.expandByObject(m); });
    assert.ok(box.min.y > centre.y && box.max.y > hairBox.max.y, `${a.id} on ${id}: above the head`);
    assert.ok(box.min.y < hairBox.max.y, `${a.id} on ${id}: down on the hair`);
    // the headwear colour (the bow's or the beret's) leaves it as it is
    keepsItsColours(object, a.id);
  }
});

test('a home’s own glasses sit round the eyes on every hairstyle their wearer may wear, and keep their own colours', {skip: skipGlasses}, () => {
  const s = HEAD.getSize(new T.Vector3()).x / .86, c = HEAD.getCenter(new T.Vector3());
  // the face in front, very nearly an ellipsoid (measured off the round head), and the eyes on it
  // (body/face.js), in head units
  const inHead = (x, y, z) => (x / .44) ** 2 + (y / .383) ** 2 + ((z + .03) / .369) ** 2 < .98;
  const overEye = (x, y) => ((Math.abs(x) - .165) / .077) ** 2 + ((y + .087) / .085) ** 2 < 1;
  for (const a of glasses) for (const kind of a.wearers) for (const id of hairsFor(kind)) {
    const hair = makeHair(id, new T.MeshStandardMaterial(), HEAD), all = createAccessories(), object = all[a.id];
    assert.ok(object && !object.visible, `${a.id}: built hidden`);
    placeAccessories(all, hair);
    const round = [-1, 1].map(() => ({inner: 0, outer: 0, above: 0, below: 0}));
    eachPoint(object, (v, o) => {
      assert.ok(v.toArray().every(Number.isFinite), `${a.id} on ${id}: ${o.name}`);
      const x = (v.x - c.x) / s, y = (v.y - c.y) / s, z = (v.z - c.z) / s;
      // nothing in through the front of the face
      if (z > .07) assert.ok(!inHead(x, y, z), `${a.id} on ${id}: ${o.name} inside the face at ${[x, y, z].map(q => q.toFixed(3))}`);
      if (o.material.transparent || z < .2) return;
      // the frame leaves the eyes clear, and goes all the way round each of them close by
      assert.ok(!overEye(x, y), `${a.id} on ${id}: ${o.name} over an eye at ${[x, y].map(q => q.toFixed(3))}`);
      const eye = round[x < 0 ? 0 : 1], dx = Math.abs(x) - .165, dy = y + .087;
      if (Math.abs(dy) < .03 && Math.abs(dx) > .077 && Math.abs(dx) < .077 + .07) eye[dx > 0 ? 'outer' : 'inner']++;
      if (Math.abs(dx) < .03 && Math.abs(dy) > .085 && Math.abs(dy) < .085 + .06) eye[dy > 0 ? 'above' : 'below']++;
    });
    for (const eye of round) assert.ok(Object.values(eye).every(n => n > 0), `${a.id} on ${id}: round both eyes ${JSON.stringify(round)}`);
    // the rig moves it with the head, like the hair
    object.traverse(o => { if (o.isMesh) for (const [x, y] of [[.5, .5], [.4, 1]]) assert.deepEqual(weightsAt(x, y, 0, o.name), [[0, 1]], `${a.id}: ${o.name}`); });
    keepsItsColours(object, a.id);
  }
});

test('outside the home, what is worn only at home shows as what it names, and leaves no trace', {skip: skipHomeOnly}, () => {
  for (const o of homeOnly) for (const kind of o.wearers) {
    assert.ok(outfitsFor(kind).includes(o.homeOnly) && !extraOutfits.find(x => x.id === o.homeOnly)?.homeOnly, `${o.id}: shows as an outfit worn outside`);
    const ways = colorwaysOf(o.id), way = ways[1]?.id;
    const look = cleanWardrobe({[kind]: {outfit: o.id, ...(way ? {colorways: {[o.id]: way}} : {})}})[kind], seen = publicLook(kind, look);
    assert.equal(seen.outfit, o.homeOnly);
    assert.ok(!JSON.stringify(seen).includes(`"${o.id}"`), `${o.id} is not in the look shown outside`);
    // the same colourway, where the other one has it
    if (way && colorwaysOf(o.homeOnly).some(w => w.id === way)) assert.equal(seen.colorways[o.homeOnly], way);
    assert.equal(look.outfit, o.id, 'the look itself is left as it was');
  }
  for (const a of headwear.filter(a => a.homeOnly)) for (const kind of a.wearers) {
    assert.ok(a.homeOnly === 'none' || (headwearFor(kind).includes(a.homeOnly) && !accessoryById(a.homeOnly)?.homeOnly), `${a.id}: shows as headwear worn outside`);
    const look = cleanWardrobe({[kind]: {accessory: a.id}})[kind];
    assert.equal(publicLook(kind, look).accessory, a.homeOnly);
  }
  for (const a of glasses.filter(a => a.homeOnly)) for (const kind of a.wearers) {
    assert.ok(a.homeOnly === 'none' || (glassesFor(kind).includes(a.homeOnly) && !accessoryById(a.homeOnly)?.homeOnly), `${a.id}: shows as glasses worn outside`);
    const seen = publicLook(kind, cleanWardrobe({[kind]: {face: a.id}})[kind]);
    assert.equal(seen.face, a.homeOnly === 'none' ? undefined : a.homeOnly);
  }
  // everything else passes as it is
  const worn = a => a && !a.homeOnly;
  const plain = cleanWardrobe({girl: {outfit: 'dress', accessory: 'bow', hairColor: '#aabbcc', face: glasses.find(a => worn(a) && a.wearers.includes('girl'))?.id}, boy: {outfit: 'coat', accessory: 'beret', face: glasses.find(a => worn(a) && a.wearers.includes('boy'))?.id}});
  assert.deepEqual(publicWardrobe(plain), plain);
  const both = publicWardrobe({girl: {outfit: homeOnly.find(o => o.wearers.includes('girl'))?.id, accessory: headwear.find(a => a.homeOnly && a.wearers.includes('girl'))?.id}});
  for (const kind of ['girl', 'boy']) {
    assert.ok(!extraOutfits.find(o => o.id === both[kind].outfit)?.homeOnly && !accessoryById(both[kind].accessory)?.homeOnly, kind);
  }
});
