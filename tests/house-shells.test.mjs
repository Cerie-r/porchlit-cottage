import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DEFAULT_SHELL, houseShells, inSeason, knownSeasonShell, knownShell, openShells, outsideView, seasons, shellOf, shellOpen, wearShell} from '../src/house-shells.js';
import {CASTLE, GARDEN, answerWords, clueOf, hideClue, nextPuzzle, openPuzzles, puzzleOrder, puzzles, rightAnswer} from '../src/puzzle-folder.js';

const root = new URL('..', import.meta.url);
const point = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
// Inside the plot (its slab is 11.55 by 9.15) and below the sky.
const onPlot = ([x, y, z]) => Math.abs(x) <= 5.8 && Math.abs(z) <= 4.6 && y >= -.2 && y <= 8;

test('every shell has its door, gift step, two lanterns and the spots kept outside', () => {
  assert.ok(houseShells[DEFAULT_SHELL]);
  for (const [key, shell] of Object.entries(houseShells)) {
    assert.ok(shell.label.trim(), key);
    assert.match(shell.modelUrl, /^\/models\/[\w-]+\.glb$/, key);
    assert.ok(shell.scale > 0, key);
    for (const name of ['door', 'giftAt', 'doorLight']) assert.ok(point(shell[name]) && onPlot(shell[name]), `${key} ${name}`);
    assert.ok(point(shell.doorHitbox) && shell.doorHitbox.every(v => v > 0), `${key} doorHitbox`);
    assert.equal(shell.lanterns.length, 2, key);
    for (const lantern of shell.lanterns) assert.ok(point(lantern) && onPlot(lantern), `${key} lantern`);
    assert.ok(shell.unlock === null || shell.unlock === 'roses' || puzzles[shell.unlock], `${key} opens with a puzzle that exists, or with the kisses`);
    assert.ok(shell.season === undefined || Object.hasOwn(seasons, shell.season), `${key} is worn in a season there is`);
    const ids = shell.spots.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length, `${key} spots have their own names`);
    for (const spot of shell.spots) {
      assert.ok(['hang', 'stand', 'top', 'line'].includes(spot.kind), `${key} ${spot.id}`);
      assert.ok(spot.size > 0, `${key} ${spot.id}`);
      if (spot.kind === 'line') assert.ok(point(spot.from) && point(spot.to) && onPlot(spot.from) && onPlot(spot.to), `${key} ${spot.id}`);
      else assert.ok(point(spot.at) && onPlot(spot.at), `${key} ${spot.id}`);
      if (spot.kind === 'hang') assert.ok(Number.isFinite(spot.facing), `${key} ${spot.id}`);
    }
  }
});

test('a saved shell is kept when known; anything else, and old saves, are the cottage', () => {
  assert.equal(knownShell('castle'), 'castle');
  assert.equal(knownShell('gabledCottage'), 'gabledCottage');
  for (const odd of [undefined, null, '', 'tower', 'toString', '__proto__', 3, {}, ['castle']]) assert.equal(knownShell(odd), DEFAULT_SHELL);
  // A home from before there were shells.
  assert.equal(shellOf({version: 4, furniture: {}}), DEFAULT_SHELL);
  // A seasonal one only in its season: a neighbour's Halloween house shows as the cottage after it.
  assert.equal(knownShell('haunted'), DEFAULT_SHELL);
  assert.equal(knownShell('haunted', '2026-10-25'), 'haunted');
  assert.equal(knownShell('haunted', '2026-11-08'), DEFAULT_SHELL);
  assert.equal(knownSeasonShell('haunted'), 'haunted');
  for (const odd of [undefined, null, 'castle', DEFAULT_SHELL, 'toString', '__proto__', 3]) assert.equal(knownSeasonShell(odd), null);
  assert.equal(shellOpen({}, 'toString'), false);
});

test('the Halloween house: every home may wear it in its season, over its everyday shell', () => {
  assert.equal(houseShells.haunted.season, 'halloween');
  assert.equal(houseShells.haunted.unlock, null);
  for (const [day, inside] of [['2026-10-14', false], ['2026-10-15', true], ['2026-10-31', true], ['2026-11-07', true], ['2026-11-08', false], ['2027-10-20', true], ['2026-12-25', false]]) {
    assert.equal(inSeason('halloween', day), inside, day);
  }
  for (const odd of [undefined, '', '10-31', '2026-10-3', 'halloween']) assert.equal(inSeason('halloween', odd), false);
  assert.equal(inSeason('nowhere', '2026-10-31'), false);
  assert.equal(inSeason('toString', '2026-10-31'), false);
  // Offered only in season, to every home.
  assert.deepEqual(openShells({}, '2026-10-25'), [DEFAULT_SHELL, 'haunted']);
  assert.deepEqual(openShells({}, '2026-12-01'), [DEFAULT_SHELL]);
  assert.deepEqual(openShells({}), [DEFAULT_SHELL]);
  // Worn over the castle, it comes off by itself when the season ends, and is back next year.
  const castle = {shell: 'castle', seasonShell: null, computer: {solved: {[GARDEN]: '2026-10-20', [CASTLE]: '2026-10-25'}}};
  const dressed = wearShell(castle, 'haunted', '2026-10-25');
  assert.deepEqual([dressed.shell, dressed.seasonShell], ['castle', 'haunted']);
  assert.equal(shellOf(dressed, '2026-10-31'), 'haunted');
  assert.equal(shellOf(dressed, '2026-11-08'), 'castle');
  assert.equal(shellOf(dressed, '2027-10-20'), 'haunted');
  // Choosing an everyday shell takes it off; out of season it can't be put on.
  const back = wearShell(dressed, DEFAULT_SHELL, '2026-10-31');
  assert.deepEqual([back.shell, back.seasonShell], [DEFAULT_SHELL, null]);
  assert.equal(wearShell(castle, 'haunted', '2026-12-01'), castle);
  assert.equal(wearShell(castle, 'nowhere', '2026-10-31'), castle);
  // Saved as the everyday shell (by hand, say), it still only shows in season.
  assert.equal(shellOf({shell: 'haunted'}, '2026-10-31'), 'haunted');
  assert.equal(shellOf({shell: 'haunted'}, '2026-11-20'), DEFAULT_SHELL);
});

test('the castle opens with its key folder; until then the home stays the cottage', () => {
  const locked = {shell: 'castle', computer: {solved: {[GARDEN]: '2026-10-20'}}};
  const opened = {shell: 'castle', computer: {solved: {[GARDEN]: '2026-10-20', [CASTLE]: '2026-10-25'}}};
  assert.equal(houseShells.castle.unlock, CASTLE);
  assert.equal(shellOpen(locked, 'castle'), false);
  assert.equal(shellOpen(locked, DEFAULT_SHELL), true);
  assert.equal(shellOf(locked), DEFAULT_SHELL);
  assert.deepEqual(openShells(locked), [DEFAULT_SHELL]);
  assert.equal(shellOf(opened), 'castle');
  assert.deepEqual(openShells(opened), [DEFAULT_SHELL, 'castle']);
  assert.equal(shellOf({...opened, shell: DEFAULT_SHELL}), DEFAULT_SHELL);
  assert.equal(shellOpen(opened, 'nowhere'), false);
});

test('the castle key folder appears once the garden letter is open', () => {
  assert.deepEqual(puzzleOrder, [GARDEN, CASTLE]);
  assert.deepEqual(openPuzzles(undefined), [GARDEN]);
  assert.deepEqual(openPuzzles({}), [GARDEN]);
  assert.deepEqual(openPuzzles({[GARDEN]: '2026-10-20'}), [GARDEN, CASTLE]);
  // Opened out of order (an old save, say), it still shows.
  assert.deepEqual(openPuzzles({[GARDEN]: '2026-10-20', [CASTLE]: '2026-10-25'}), [GARDEN, CASTLE]);
  // The garden folder, once open, points to the one that came after it.
  assert.equal(nextPuzzle(GARDEN), CASTLE);
  assert.equal(nextPuzzle(CASTLE), null);
  assert.equal(nextPuzzle('nowhere'), null);
  assert.ok(rightAnswer(' 紫 藤 ', CASTLE));
  assert.ok(!rightAnswer('花瓣', CASTLE));
  assert.equal(answerWords(CASTLE), '两个字');
  assert.equal(answerWords(GARDEN), '两个字');
});

test('the castle clue hides on its own, beside the garden one', () => {
  let n = 0;
  const ids = () => 'clue-' + ++n;
  const withGarden = hideClue([], {random: () => .2, newId: ids});
  const both = hideClue(withGarden, {id: CASTLE, random: () => .2, newId: ids});
  const garden = clueOf(both, GARDEN), castle = clueOf(both, CASTLE);
  assert.equal(both.length, 2);
  assert.equal(castle.puzzleId, CASTLE);
  assert.equal(castle.note, puzzles[CASTLE].clue.note);
  assert.notDeepEqual([castle.location, castle.slot], [garden.location, garden.slot]);
  assert.equal(hideClue(both, {id: CASTLE, newId: ids}), both);
});

// Reads a .glb: its nodes (with instance counts) and its materials.
function readGlb(file) {
  const buf = readFileSync(file), length = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + length).toString('utf8'));
  const nodes = (gltf.nodes || []).filter(node => node.mesh !== undefined).map(node => {
    const inst = node.extensions?.EXT_mesh_gpu_instancing;
    const count = inst ? gltf.accessors[inst.attributes.TRANSLATION].count : 1;
    const triangles = gltf.meshes[node.mesh].primitives.reduce((sum, p) => sum + (p.indices !== undefined ? gltf.accessors[p.indices].count : gltf.accessors[p.attributes.POSITION].count) / 3, 0);
    return {name: node.name, count, triangles: triangles * count};
  });
  return {bytes: buf.length, nodes, materials: (gltf.materials || []).map(m => m.name)};
}

test('the models build, and the castle and the Halloween house are as light on a phone as the cottage', () => {
  execFileSync(process.execPath, ['scripts/build-house-model.mjs'], {cwd: root});
  execFileSync(process.execPath, ['scripts/build-castle-model.mjs'], {cwd: root});
  execFileSync(process.execPath, ['scripts/build-haunted-model.mjs'], {cwd: root});
  const cottage = readGlb(new URL('public/models/porchlit-house.glb', root));
  const castle = readGlb(new URL('public/models/porchlit-castle.glb', root));
  const haunted = readGlb(new URL('public/models/porchlit-haunted.glb', root));
  const sum = (model, key) => model.nodes.reduce((total, node) => total + node[key], 0);
  // The cottage came through the move to the shared kit unchanged.
  assert.equal(cottage.nodes.length, 43);
  assert.equal(sum(cottage, 'count'), 19043);
  assert.equal(Math.round(sum(cottage, 'triangles')), 3778500);
  // The page finds these by name in every shell.
  for (const model of [cottage, castle]) {
    const names = model.nodes.map(node => node.name);
    assert.equal(names.filter(name => name.startsWith('porch-lamp')).length, 2);
    assert.ok(names.includes('mailbox'));
    assert.ok(names.includes('door'));
  }
  // Every material is one the page colours (exteriorThemes.creamRose in
  // src/main.jsx), or one the cottage has too (amber keeps its own glow).
  const theme = /creamRose:\s*\{([^}]*)\}/.exec(readFileSync(new URL('src/main.jsx', root), 'utf8'))[1];
  const coloured = new Set([...[...theme.matchAll(/(\w+):/g)].map(m => m[1]), ...cottage.materials]);
  for (const name of castle.materials) assert.ok(coloured.has(name), `castle material ${name}`);
  // Light enough for phones: no more to draw than the cottage, a similar number of meshes, a small file.
  assert.ok(sum(castle, 'triangles') <= sum(cottage, 'triangles'), 'castle triangles');
  assert.ok(castle.nodes.length <= 60, 'castle meshes');
  assert.ok(castle.bytes <= 3 * 1024 * 1024, 'castle file size');
  // The Halloween house: its lamps are the carved faces of the two pumpkin
  // lanterns (several pieces each), its mailbox and door are named the same;
  // besides the page's colours it has a few of its own that keep their colour,
  // and mist the page shows only after dark.
  const names = haunted.nodes.map(node => node.name);
  assert.ok(names.filter(name => name.startsWith('porch-lamp')).length >= 2);
  assert.ok(names.includes('mailbox'));
  assert.ok(names.includes('door'));
  const own = new Set([...coloured, 'dusk', 'duskDeep', 'pumpkin', 'pumpkinDeep', 'mist']);
  for (const name of haunted.materials) assert.ok(own.has(name), `haunted material ${name}`);
  assert.ok(haunted.materials.includes('mist'));
  assert.ok(sum(haunted, 'triangles') <= sum(cottage, 'triangles'), 'haunted triangles');
  assert.ok(haunted.nodes.length <= 70, 'haunted meshes');
  assert.ok(haunted.bytes <= 3 * 1024 * 1024, 'haunted file size');
});

// How far a built model reaches down and up the screen as the camera sees it outside (from (10, 8, 10)), however far
// round it has been turned: a point at height y and r from the middle shows between y·up ∓ r·across.
async function measureFrame(url) {
  const data = readFileSync(new URL('public' + url, root));
  const {scene} = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
  scene.updateMatrixWorld(true);
  const camera = new T.OrthographicCamera();
  camera.position.set(10, 8, 10);
  camera.lookAt(0, 0, 0);
  const up = new T.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), across = Math.hypot(up.x, up.z), v = new T.Vector3(), m = new T.Matrix4();
  let lo = Infinity, hi = -Infinity;
  const at = p => { const y = p.y * up.y, r = Math.hypot(p.x, p.z) * across; lo = Math.min(lo, y - r); hi = Math.max(hi, y + r); };
  scene.traverse(o => {
    if (!o.isMesh) return;
    if (o.isInstancedMesh) {
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox, corners = [];
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners.push(new T.Vector3(x, y, z));
      for (let k = 0; k < o.count; k++) {
        o.getMatrixAt(k, m);
        const world = new T.Matrix4().multiplyMatrices(o.matrixWorld, m);
        for (const c of corners) at(v.copy(c).applyMatrix4(world));
      }
      return;
    }
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) at(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
  });
  return [lo, hi];
}

test('outside, the whole house shows: each frame is what its model measures, and a tall one is seen from further back', async () => {
  // Built afresh, like the others in 'the models build': a taller rose castle is measured as it is now.
  execFileSync(process.execPath, ['scripts/build-castle-model.mjs', 'rose'], {cwd: root});
  for (const [key, shell] of Object.entries(houseShells)) {
    const [lo, hi] = await measureFrame(shell.modelUrl);
    assert.ok(shell.frame[0] <= lo + .01 && shell.frame[0] > lo - .08, `${key} reaches down to ${lo.toFixed(2)}`);
    assert.ok(shell.frame[1] >= hi - .01 && shell.frame[1] < hi + .08, `${key} reaches up to ${hi.toFixed(2)}`);
  }
  // A computer screen: every shell, top and bottom in view; the castles further back than the cottage.
  const desk = key => outsideView(key, {width: 1280, height: 800, zoom: 76});
  for (const key of Object.keys(houseShells)) {
    const {zoom, lift} = desk(key), [lo, hi] = houseShells[key].frame, c = lift * .8704;
    assert.ok(400 - (hi - c) * zoom >= 23.9 && 400 - (lo - c) * zoom <= 736.1, key);
    assert.ok(zoom <= 76 && lift >= 0, key);
  }
  assert.ok(desk('roseCastle').zoom < desk('castle').zoom && desk('castle').zoom < desk(DEFAULT_SHELL).zoom);
  // A phone already shows all of it: nothing moves.
  for (const key of Object.keys(houseShells)) assert.deepEqual(outsideView(key, {width: 390, height: 844, zoom: 42, scale: .82}), {zoom: 42, lift: 0}, key);
  // A big screen, or a shell with nothing to measure: as it was.
  assert.deepEqual(outsideView(DEFAULT_SHELL, {width: 2000, height: 1400, zoom: 76}), {zoom: 76, lift: 0});
  assert.deepEqual(outsideView('palace', {width: 1280, height: 800, zoom: 76}), {zoom: 76, lift: 0});
  // A window dragged very short: no fitting into nothing (it used to go to zero and below), the plain view.
  for (const height of [0, 88, 120, 247]) assert.deepEqual(outsideView('roseCastle', {width: 1280, height, zoom: 76}), {zoom: 76, lift: 0}, `${height}`);
  // Any height in between: never nearer than asked, never looking below the ground.
  for (const key of Object.keys(houseShells)) for (let height = 248; height <= 2400; height += 37) {
    const {zoom, lift} = outsideView(key, {width: 1280, height, zoom: 76});
    assert.ok(zoom > 0 && zoom <= 76 && lift >= 0, `${key} at ${height}: ${zoom}, ${lift}`);
  }
});
