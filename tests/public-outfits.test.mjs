import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {publicOutfits} from '../body/outfit-pieces.js';
import {extraOutfits, outfitsFor, paintOutfit, colorwaysOf, isHomeOutfit} from '../body/outfit-registry.js';
import {createOutfits, applyOutfitFit, outfitFitData} from '../body/outfits.js';
import {cleanWardrobe, publicLook} from '../body/wardrobe-state.js';
import {rigAvatar} from '../body/avatar-rig.js';
import {pictureSources} from '../scripts/wardrobe-picture-sources.mjs';

// The public outfits beyond the base two (body/outfit-pieces.js): made in code, in the public release.
const loadBody = async () => {
  const b = fs.readFileSync('public/models/resident-body.glb');
  return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')).scene.getObjectByName('purchased-body');
};
const positions = group => { const all = []; group.traverse(m => { if (m.isMesh) all.push(...m.geometry.attributes.position.array); }); return all; };

test('the public outfits are registered as public, complete garments built the same way every time', () => {
  assert.ok(publicOutfits.length >= 2);
  for (const o of publicOutfits) {
    assert.match(o.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(!['dress', 'coat'].includes(o.id) && extraOutfits.includes(o) && !isHomeOutfit(o.id), o.id);
    assert.ok(o.name?.length && typeof o.build === 'function' && o.drawing?.startsWith('<svg'), o.id);
    assert.ok(o.wearers?.length && o.wearers.every(w => ['girl', 'boy'].includes(w)), o.id);
    const garment = o.build();
    let meshes = 0, fitted = 0, sleeves = 0, shoes = 0;
    garment.traverse(m => {
      if (!m.isMesh) return;
      meshes++; if (m.userData.clothAxis) fitted++; if (m.name === 'tailored-sleeve') sleeves++; if (m.name === 'shoe') shoes++;
      assert.ok(['main', 'accent', 'trim', 'fixed'].includes(m.material.name), `${o.id}/${m.name} uses one of the colour areas`);
      for (const a of Object.values(m.geometry.attributes)) assert.ok(Array.from(a.array).every(Number.isFinite), `${o.id}/${m.name}`);
    });
    assert.ok(meshes && fitted && sleeves === 2 && shoes === 2, o.id);
    // the fit file is matched to the garment by order and count
    assert.deepEqual(positions(o.build()), positions(garment), o.id);
    // a new garment's file changes its picture
    assert.ok(pictureSources.includes('body/outfit-pieces.js'));
  }
  for (const f of fs.readdirSync('body').filter(f => /^outfit-.*\.js$/.test(f) && !['outfit-registry.js', 'outfit-tools.js'].includes(f))) assert.ok(pictureSources.includes('body/' + f), `${f} is a picture source`);
});

test('a public outfit can be chosen, saved and seen outside only by the residents it is for', () => {
  for (const o of publicOutfits) for (const kind of ['girl', 'boy']) {
    const mine = o.wearers.includes(kind), look = cleanWardrobe({[kind]: {outfit: o.id}})[kind];
    assert.equal(outfitsFor(kind).includes(o.id), mine);
    assert.equal(look.outfit, mine ? o.id : outfitsFor(kind)[0]);
    if (mine) assert.equal(publicLook(kind, look).outfit, o.id, `${o.id} shows outside as it is`);
  }
  assert.equal(cleanWardrobe({}).girl.outfit, 'dress');
  assert.equal(cleanWardrobe({}).boy.outfit, 'coat');
});

test('public outfits come in colourways: built in the first, painted exactly in the others, and kept in the save', () => {
  const hex = c => '#' + c.getHexString();
  for (const o of publicOutfits) {
    const ways = colorwaysOf(o.id);
    assert.ok(ways.length >= 2 && new Set(ways.map(w => w.id)).size === ways.length, o.id);
    for (const w of ways) for (const k of ['main', 'accent', 'trim']) assert.match(w.colors[k], /^#[0-9a-f]{6}$/i, `${o.id}/${w.id}/${k}`);
    const garment = o.build(), fixed = [];
    garment.traverse(m => { if (!m.isMesh) return; const k = m.material.name; if (ways[0].colors[k]) assert.equal(hex(m.material.color), ways[0].colors[k].toLowerCase(), `${o.id}/${m.name}`); else fixed.push([m, hex(m.material.color)]); });
    paintOutfit(garment, ways[1].colors);
    garment.traverse(m => { if (m.isMesh && ways[1].colors[m.material.name]) assert.equal(hex(m.material.color), ways[1].colors[m.material.name].toLowerCase(), `${o.id}/${m.name}`); });
    for (const [m, before] of fixed) assert.equal(hex(m.material.color), before, `${o.id}/${m.name} keeps its colour`);
    for (const kind of o.wearers) assert.deepEqual(cleanWardrobe({[kind]: {outfit: o.id, colorways: {[o.id]: ways[1].id}}})[kind].colorways, {[o.id]: ways[1].id});
  }
});

test('public outfits fit around the intact body and move with normalized weights; the fit data puts the fit back', async () => {
  const body = await loadBody(), before = Array.from(body.geometry.attributes.position.array);
  const outfits = createOutfits(body);
  assert.deepEqual(Array.from(body.geometry.attributes.position.array), before);
  // what the build keeps of the fit (only what moved), put back on garments made afresh, is the fit;
  // so is the older kind of data, every coordinate
  const same = (a, b, tolerance) => { for (const [key, group] of Object.entries(a)) { const mine = []; group.traverse(m => { if (m.isMesh) mine.push(m.geometry.attributes.position.array); }); let k = 0; b[key].traverse(m => { if (!m.isMesh) return; const theirs = m.geometry.attributes.position.array, ours = mine[k++]; for (let i = 0; i < ours.length; i++) assert.ok(Math.abs(ours[i] - theirs[i]) <= tolerance, `${key}/${m.name}`); }); } };
  const data = outfitFitData(createOutfits(), outfits), fresh = createOutfits();
  applyOutfitFit(fresh, JSON.parse(JSON.stringify(data)));same(outfits, fresh, 1e-5);
  const full = Object.fromEntries(Object.entries(outfits).map(([key, group]) => { const list = []; group.traverse(m => { if (m.isMesh && m.userData.clothAxis) list.push(Array.from(m.geometry.attributes.position.array)); }); return [key, list]; }));
  const older = createOutfits();applyOutfitFit(older, full);same(outfits, older, 0);
  assert.ok(JSON.stringify(data).length < JSON.stringify(full).length / 4, 'most of a garment never moves');
  for (const o of publicOutfits) {
    const root = new T.Group(), skin = body.clone();skin.geometry = body.geometry.clone();
    root.add(skin, outfits[o.id]);
    const rig = rigAvatar(root), meshes = root.children.filter(m => m.isSkinnedMesh);
    for (const pose of [{phase: 1, amount: 1}, {sit: 1}, {crouch: 1}, {lean: .3}]) {
      rig.pose(pose); root.updateMatrixWorld(true); rig.skeleton.update();
      for (const m of meshes) {
        const w = m.geometry.attributes.skinWeight, p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i += 17) {
          assert.ok(Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-5, `${o.id}/${m.name}`);
          assert.ok(m.applyBoneTransform(i, new T.Vector3().fromBufferAttribute(p, i)).toArray().every(Number.isFinite), `${o.id}/${m.name}`);
        }
      }
    }
  }
});

test('each public outfit has its card and its photograph in the public wardrobe from the start', async () => {
  const html = await readFile('body/index.html', 'utf8'), manifest = JSON.parse(await readFile('body/wardrobe-pictures.json', 'utf8'));
  for (const o of publicOutfits) {
    const file = `/wardrobe/outfit-${o.id}.webp`;
    assert.match(html, new RegExp(`data-outfit="${o.id}" class="item has-thumbnail"[^>]*><img src="${file}"[^>]*>[^]*?<span class="sr-only">${o.name}</span>`), `${o.id}: its card`);
    assert.equal(manifest.files['outfit=' + o.id], file, `${o.id}: photographed`);
    assert.ok((await stat('public' + file)).size > 1000, file);
  }
});
