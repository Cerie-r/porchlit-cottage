import test from 'node:test';
import assert from 'node:assert/strict';
import {cluesShowing, pickupWords} from '../src/clue-pickup.js';

const at = (id, slot, extra = {}) => ({id, kind: 'note', name: '线索卡', note: '…', location: 'hide:bedroomNightstand', slot, ...extra});
const upperOpen = slot => slot < 4;

test('an unread clue card in an open drawer goes to the backpack; nothing else does', () => {
  const items = [
    at('clue', 0, {puzzleId: 'castle-key'}),
    at('lower-clue', 5, {puzzleId: 'garden-letter'}),           // the lower drawer is still shut
    at('read-clue', 1, {puzzleId: 'garden-letter', opened: true}), // read and put back by hand
    at('letter', 2),                                               // an ordinary letter: opened by a tap or its button
    {id: 'elsewhere', kind: 'note', puzzleId: 'castle-key', location: 'bag', slot: 0},
    {id: 'doll', kind: 'animal', location: 'hide:bedroomNightstand', slot: 3}
  ];
  assert.deepEqual(cluesShowing(items, 'hide:bedroomNightstand', upperOpen).map(i => i.id), ['clue']);
  assert.deepEqual(cluesShowing(items, 'hide:studyDesk', () => true), []);
  assert.deepEqual(cluesShowing(undefined, 'hide:bedroomNightstand', upperOpen), []);
  assert.deepEqual(cluesShowing([null, {}], 'hide:bedroomNightstand', upperOpen), []);
});

test('the close-up says how many it found', () => {
  assert.equal(pickupWords(1), '找到一张线索卡');
  assert.equal(pickupWords(2), '找到 2 张线索卡');
});
