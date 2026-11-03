import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {registerOutfits, outfitsFor, paintOutfit} from '../body/outfit-registry.js';
import {createOutfits} from '../body/outfits.js';
import {cleanWardrobe} from '../body/wardrobe-state.js';
import {rigAvatar} from '../body/avatar-rig.js';
import {homePictureSourceHash} from '../scripts/wardrobe-picture-sources.mjs';

// A home's own outfits live in src/ours/*.outfit.js, which the public copy
// doesn't have; there these checks are skipped.
const files = fs.existsSync('src/ours') ? fs.readdirSync('src/ours').filter(f => f.endsWith('.outfit.js')).sort() : [];
const home = [];
for (const f of files) home.push(...(await import('../src/ours/' + f)).outfits);
const skip = !home.length && 'no home outfits in src/ours/';
registerOutfits(home);

const loadBody = async () => {
  const b = fs.readFileSync('public/models/resident-body.glb');
  return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')).scene.getObjectByName('purchased-body');
};

test('a home’s own outfits are complete garments, built the same way every time', {skip}, () => {
  for (const o of home) {
    assert.match(o.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(!['dress', 'coat'].includes(o.id), o.id);
    assert.ok(o.name?.length && typeof o.build === 'function');
    assert.ok(o.wearers?.length && o.wearers.every(w => ['girl', 'boy'].includes(w)));
    const positions = group => { const all = []; group.traverse(m => { if (m.isMesh) all.push(...m.geometry.attributes.position.array); }); return all; };
    const garment = o.build();
    let meshes = 0, fitted = 0;
    garment.traverse(m => {
      if (!m.isMesh) return;
      meshes++; if (m.userData.clothAxis) fitted++;
      assert.ok(['main', 'accent', 'trim', 'fixed'].includes(m.material.name), `${o.id}/${m.name} uses one of the colour areas`);
      for (const a of Object.values(m.geometry.attributes)) assert.ok(Array.from(a.array).every(Number.isFinite), `${o.id}/${m.name}`);
    });
    assert.ok(meshes && fitted, o.id);
    // the fit file is matched to the garment by order and count
    assert.deepEqual(positions(o.build()), positions(garment), o.id);
  }
});

test('home outfits can be chosen, and saved, only by the residents they are for', {skip}, () => {
  for (const o of home) for (const kind of ['girl', 'boy']) {
    const mine = o.wearers.includes(kind);
    assert.equal(outfitsFor(kind).includes(o.id), mine);
    assert.equal(cleanWardrobe({[kind]: {outfit: o.id}})[kind].outfit, mine ? o.id : outfitsFor(kind)[0]);
  }
  assert.equal(cleanWardrobe({}).girl.outfit, 'dress');
  assert.equal(cleanWardrobe({}).boy.outfit, 'coat');
});

test('outfits that come in colourways are built in the first one, and the wardrobe keeps a known choice', {skip}, () => {
  const hex = c => '#' + c.getHexString();
  for (const o of home.filter(o => o.colorways)) {
    const ways = o.colorways;
    assert.ok(ways.length >= 2 && new Set(ways.map(w => w.id)).size === ways.length, o.id);
    for (const w of ways) {
      assert.match(w.id, /^[a-z][a-z0-9-]*$/); assert.ok(w.name?.length, w.id);
      for (const k of ['main', 'accent', 'trim']) assert.match(w.colors[k], /^#[0-9a-f]{6}$/i, `${o.id}/${w.id}/${k}`);
    }
    // built in the first colourway; painting another one changes exactly those colour areas
    const garment = o.build(), fixed = [];
    garment.traverse(m => { if (!m.isMesh) return; const k = m.material.name; if (ways[0].colors[k]) assert.equal(hex(m.material.color), ways[0].colors[k].toLowerCase(), `${o.id}/${m.name}`); else fixed.push([m, hex(m.material.color)]); });
    paintOutfit(garment, ways[1].colors);
    garment.traverse(m => { if (m.isMesh && ways[1].colors[m.material.name]) assert.equal(hex(m.material.color), ways[1].colors[m.material.name].toLowerCase(), `${o.id}/${m.name}`); });
    for (const [m, before] of fixed) assert.equal(hex(m.material.color), before, `${o.id}/${m.name} keeps its colour`);
    // the save keeps a known choice for the residents who wear it, and nothing else
    for (const kind of ['girl', 'boy']) {
      const kept = cleanWardrobe({[kind]: {colorways: {[o.id]: ways[1].id, dress: 'navy', coat: ways[1].id}}})[kind].colorways;
      assert.deepEqual(kept, o.wearers.includes(kind) ? {[o.id]: ways[1].id} : undefined, `${o.id} for ${kind}`);
      assert.equal(cleanWardrobe({[kind]: {colorways: {[o.id]: 'no-such-colour'}}})[kind].colorways, undefined);
    }
  }
});

test('home outfits fit around the intact body and move with normalized weights', {skip}, async () => {
  // fitted once (every outfit is), each on its own copy of the body for the rig
  const body = await loadBody(), before = Array.from(body.geometry.attributes.position.array);
  const outfits = createOutfits(body);
  assert.deepEqual(Array.from(body.geometry.attributes.position.array), before);
  for (const o of home) {
    const root = new T.Group(), skin = body.clone();skin.geometry = body.geometry.clone();
    root.add(skin, outfits[o.id]);
    const rig = rigAvatar(root), meshes = root.children.filter(m => m.isSkinnedMesh);
    for (const pose of [{phase: 1, amount: 1}, {sit: 1}, {crouch: 1}, {lean: .3}]) {
      rig.pose(pose); root.updateMatrixWorld(true); rig.skeleton.update();
      for (const m of meshes) {
        const w = m.geometry.attributes.skinWeight, p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i += 17) {
          assert.ok(Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-5, m.name);
          assert.ok(m.applyBoneTransform(i, new T.Vector3().fromBufferAttribute(p, i)).toArray().every(Number.isFinite), m.name);
        }
      }
    }
  }
});

test('home outfit pictures were taken of the outfits as they are now, and stay out of the public files', {skip}, async () => {
  const manifest = JSON.parse(await readFile('src/ours/wardrobe/pictures.json', 'utf8'));
  assert.equal(manifest.sourceHash, await homePictureSourceHash(), 'a garment changed: run `npm run build && npm run wardrobe:pictures` to take the pictures again');
  const html = await readFile('body/index.html', 'utf8'), shared = JSON.parse(await readFile('body/wardrobe-pictures.json', 'utf8'));
  const publicPictures = fs.readdirSync('public/wardrobe');
  for (const o of home) {
    const file = manifest.files['outfit=' + o.id];
    assert.ok(file && (await stat('src/ours/wardrobe/' + file)).size > 1000, o.id);
    assert.ok(o.picture?.endsWith('/' + file), `${o.id} shows its own picture first`);
    assert.ok(!html.includes(`data-outfit="${o.id}"`) && !Object.keys(shared.files).includes('outfit=' + o.id));
    assert.ok(!publicPictures.some(n => n.startsWith('outfit-' + o.id + '.')));
  }
});
