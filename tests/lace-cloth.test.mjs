import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {laceCloth, disposeLaceCloth, clothFor, topOf} from '../src/lace-cloth.js';
import {lacedPieces, materialOwners, applyDecor, applyPreset, presets} from '../src/decor-state.js';
import {stockOf, LACE_LAID} from '../src/bench-stock.js';

test('a top is dressed by its shape: a round doily on a round or square one, a runner down a long one, inside its edges', () => {
  const square = clothFor(.6, .56), long = clothFor(1.2, .5), deep = clothFor(.5, 1.3), round = clothFor(.7, .7, {round: true}), wide = clothFor(.9, .65);
  assert.equal(square.round, true);
  assert.equal(square.width, square.depth);
  assert.equal(round.round, true);
  assert.ok(long.width > long.depth * 3 && !long.round, 'a runner along the long way');
  assert.ok(deep.depth > deep.width * 3, 'whichever way is long');
  assert.equal(wide.round, false);
  for (const [c, w, d] of [[square, .6, .56], [long, 1.2, .5], [deep, .5, 1.3], [round, .7, .7], [wide, .9, .65]]) {
    assert.ok(c.width + 2 * c.border < w && c.depth + 2 * c.border < d, 'border and all, inside the top');
    assert.ok(c.width > 0 && c.depth > 0);
  }
});

test('a lace cloth lies flat at its height, net inside and scallops round it, in lace of its own', () => {
  const g = laceCloth(.5, .3), meshes = [];
  g.traverse(m => { if (m.isMesh) meshes.push(m); });
  assert.equal(meshes.length, 4, 'the net and the border, each over its outline');
  const box = new T.Box3().setFromObject(g);
  assert.ok(box.max.y - box.min.y < .01, 'flat');
  assert.ok(box.min.y > 0, 'on the top, not in it');
  assert.ok(box.max.x > .25 && box.max.z > .15, 'its border past the ground');
  for (const m of meshes) { assert.equal(m.name, 'lace-cloth'); assert.ok(m.material.alphaMap); }
  assert.deepEqual(meshes.map(m => m.material.name).sort(), ['lace', 'lace', 'lace-shade', 'lace-shade']);
  for (const lace of meshes.filter(m => m.material.name === 'lace')) assert.ok(meshes.some(m => m.material.name === 'lace-shade' && m.geometry === lace.geometry && m.position.y < lace.position.y), 'its outline under it');
  const gone = new Set();
  for (const m of meshes) m.geometry.addEventListener('dispose', e => gone.add(e.target));
  disposeLaceCloth(g);
  assert.equal(gone.size, 2);
  const round = new T.Box3().setFromObject(laceCloth(.3, .3, {round: true}));
  assert.ok(Math.abs((round.max.x - round.min.x) - (round.max.z - round.min.z)) < .01, 'round is round');
});

test('the tables take lace, nothing else does; a preset never lays or lifts it', () => {
  const tables = Object.keys(materialOwners).filter(id => materialOwners[id].parts.includes('lace'));
  assert.deepEqual(tables.sort(), ['bedroomSideTable', 'bedroomVanity', 'coffeeTable', 'diningTable', 'island', 'studyCraft', 'studyDesk', 'studyTailor']);
  let state = applyDecor({values: {}}, ['diningTable', 'sofa'], 'lace', 'lace');
  assert.deepEqual(lacedPieces(state), ['diningTable'], 'a sofa has no top to lay it on');
  state = applyDecor(state, ['island'], 'lace', 'lace');
  assert.deepEqual(lacedPieces(state).sort(), ['diningTable', 'island']);
  assert.deepEqual(lacedPieces(applyPreset(state, presets.blue, {room: 'downstairs', scope: 'all', groups: ['wall', 'cabinet', 'frame', 'top', 'fabric', 'detail']})).sort(), ['diningTable', 'island']);
  assert.deepEqual(lacedPieces(applyDecor(state, ['island'], 'lace', null)), ['diningTable'], 'taken up');
  assert.deepEqual(lacedPieces(null), []);
});

test('lace on a table is lent: less in the drawer while it is laid, all of it back once taken up', () => {
  const home = {explore: {found: {'woods:dew-web': 3}}, spent: {notion: {lace: 1}}};
  assert.equal(LACE_LAID, 2, 'a whole web for a piece of furniture');
  assert.equal(stockOf(home).notion.lace.left, 5);
  assert.equal(stockOf(home, {laid: 2}).notion.lace.left, 1);
  assert.equal(stockOf(home, {laid: 9}).notion.lace.left, 0, 'never below none');
  assert.equal(stockOf(home, {laid: 2}).notion.lace.got, 6);
  assert.equal(stockOf({explore: {found: {}}}, {laid: 1}).notion.lace, undefined, 'none ever made: nothing to show');
});

test('a piece\'s top is found where it is drawn: the highest of its tops, round or not, in its own group\'s frame', () => {
  const top = (geometry, at, scale = [1, 1, 1]) => { const m = new T.Mesh(geometry, new T.MeshStandardMaterial()); m.material.userData = {decorRole: 'top'}; m.position.set(...at); m.scale.set(...scale); return m; };
  const room = new T.Group(); room.position.set(5, 0, -2); room.rotation.y = 1.1;
  const piece = new T.Group(); piece.position.set(-1, 0, 3); room.add(piece);
  const inner = new T.Group(); inner.position.set(.8, 0, .2); inner.scale.setScalar(.5); piece.add(inner);
  inner.add(top(new T.BoxGeometry(2, .1, 1), [0, 1, 0]));
  inner.add(top(new T.BoxGeometry(2.2, .05, 1.1), [0, .9, 0])); // a lower lip, also a top
  const leg = new T.Mesh(new T.BoxGeometry(.1, 1, .1), new T.MeshStandardMaterial()); leg.material.userData = {decorRole: 'paint'}; leg.position.set(0, 2, 0); inner.add(leg);
  const found = topOf(piece);
  assert.ok(Math.abs(found.position.y - .525) < 1e-6, 'the higher top, its face');
  assert.ok(Math.abs(found.position.x - .8) < 1e-6 && Math.abs(found.position.z - .2) < 1e-6, 'in the piece\'s own frame');
  assert.ok(Math.abs(found.width - 1) < 1e-6 && Math.abs(found.depth - .5) < 1e-6);
  assert.equal(found.round, false);
  const table = new T.Group(); table.add(top(new T.CylinderGeometry(1, 1, .12, 32), [0, .3, 0], [1.27, 1, .58]));
  const oval = topOf(table);
  assert.equal(oval.round, true);
  assert.ok(Math.abs(oval.width - 2.54) < 1e-6 && Math.abs(oval.depth - 1.16) < 1e-6 && Math.abs(oval.position.y - .36) < 1e-6);
  const holder = new T.Group(); holder.add(top(new T.BoxGeometry(1, 1, 1), [0, 9, 0])); table.add(holder);
  assert.ok(Math.abs(topOf(table, holder).position.y - .36) < 1e-6, 'what is skipped doesn\'t count');
  assert.equal(topOf(new T.Group()), null);
});
