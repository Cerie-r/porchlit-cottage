import test from 'node:test';
import assert from 'node:assert/strict';
import {partSound, placedSound} from '../src/house-sounds.js';
import {searchParts} from '../src/search-state.js';
import {SOUND_NAMES} from '../src/sounds.js';

test('drawers slide open and shut', () => {
  assert.deepEqual(partSound('左抽屉', true), ['drawerOpen', 1]);
  assert.deepEqual(partSound('第2个抽屉', false), ['drawerClose', 1]);
});

test('soft things puff both ways', () => {
  for (const label of ['左坐垫', '右抱枕', '左枕头', '被角', '左侧毯角', '折毯', '左窗帘']) {
    assert.equal(partSound(label, true)[0], 'cloth', label);
    assert.equal(partSound(label, false)[0], 'cloth', label);
  }
});

test('lids and doors open with a lid and close softly', () => {
  for (const label of ['首饰盒盖', '左柜门', '把手', '盒盖']) {
    assert.deepEqual(partSound(label, true), ['lid', 1], label);
    assert.deepEqual(partSound(label, false), ['wood', .6], label);
  }
  assert.equal(partSound('第1层书', true)[0], 'wood');
});

test('a book opened by its cover turns a page, and shuts softly', () => {
  assert.deepEqual(partSound('封面', true), ['page', 1]);
  assert.deepEqual(partSound('封面', false), ['wood', .6]);
});

test('every close-up part in the house has a sound that exists', () => {
  const kinds = ['bedroom-vanity', 'curtain', 'study-shelf', 'bedroom-nightstand', 'study-printer', 'diorama-keepsake', 'diorama-basket', 'book', 'study-rug', 'living-rug', 'sofa', 'bedroom-bed', 'bedroom-wardrobe', 'fridge', 'cupboard', 'study-box', 'armchair', 'study-reading'];
  for (const kind of kinds) for (const [, label] of searchParts(kind)) for (const opening of [true, false]) {
    const [name, volume] = partSound(label, opening);
    assert.ok(SOUND_NAMES.includes(name), `${kind} ${label}: ${name}`);
    assert.ok(volume > 0 && volume <= 1);
  }
});

test('dolls land softly, other things click', () => {
  assert.equal(placedSound({kind: 'animal'}), 'cloth');
  assert.equal(placedSound({kind: 'build'}), 'click');
  assert.equal(placedSound(undefined), 'click');
  assert.ok(SOUND_NAMES.includes('kiss') && SOUND_NAMES.includes('found') && SOUND_NAMES.includes('turn') && SOUND_NAMES.includes('tap'));
});
