import test from 'node:test';
import assert from 'node:assert/strict';
import {GARDEN, clueHint, clueOf, clueSpots, hideClue, puzzleStage, puzzles, rightAnswer} from '../src/puzzle-folder.js';
import {spotsFor} from '../src/hiding-spots.js';
import {searchParts, slotVisible} from '../src/search-state.js';

const kinds = {'hide:bedroomNightstand': 'bedroom-nightstand', 'hide:studyDesk': 'study-desk', 'hide:bedroomKeepsake': 'diorama-keepsake', 'hide:greenBook': 'book', 'hide:roseBook': 'book', 'hide:livingBasket': 'diorama-basket'};
let n = 0;
const ids = () => 'clue-' + ++n;

test('every place a clue can go is shut until it is searched, and open once it is', () => {
  assert.deepEqual(Object.keys(clueSpots).sort(), Object.keys(kinds).sort());
  for (const [location, spot] of Object.entries(clueSpots)) {
    const kind = kinds[location], open = Object.fromEntries(searchParts(kind).map(([id]) => [id, 1]));
    for (const slot of spot.slots) {
      assert.ok(spotsFor(location)[slot], `${location} has no slot ${slot}`);
      assert.equal(slotVisible(kind, {}, slot), false, `${location} ${slot} shows without searching`);
      assert.equal(slotVisible(kind, open, slot), true, `${location} ${slot} never shows`);
    }
    assert.ok(spot.hint.trim() && spot.room.trim());
  }
});

test('the computer hides the clue once, in a free place', () => {
  const clueless = [{id: 'a', kind: 'photo', location: 'bag', slot: 0}];
  const hidden = hideClue(clueless, {random: () => 0, newId: ids});
  assert.equal(hidden.length, 2);
  const clue = clueOf(hidden);
  assert.equal(clue.puzzleId, GARDEN);
  assert.equal(clue.kind, 'note');
  assert.equal(clue.note, puzzles[GARDEN].clue.note);
  assert.ok(clue.location in clueSpots);
  assert.equal(clue.spotId, spotsFor(clue.location)[clue.slot].id);
  assert.equal(clue.opened, undefined);
  // Asking again changes nothing.
  assert.equal(hideClue(hidden, {newId: ids}), hidden);
  // Taken places are passed over; with everything full, nowhere to hide it.
  const fullBut = (location, slot) => Object.entries(clueSpots).flatMap(([l, s]) => s.slots.filter(x => !(l === location && x === slot)).map(x => ({id: l + x, kind: 'photo', location: l, slot: x})));
  const one = clueOf(hideClue(fullBut('hide:livingBasket', 2), {random: () => .99, newId: ids}));
  assert.deepEqual([one.location, one.slot], ['hide:livingBasket', 2]);
  const full = fullBut();
  assert.equal(hideClue(full, {newId: ids}), full);
  // Each place comes up.
  const seen = new Set();
  for (let k = 0; k < 6; k++) seen.add(clueOf(hideClue([], {random: () => k / 6 + .01, newId: ids})).location);
  assert.equal(seen.size, 6);
});

test('hide, seek, found, open', () => {
  const clue = clueOf(hideClue([], {random: () => .3, newId: ids}));
  assert.equal(puzzleStage(null), 'hide');
  assert.equal(puzzleStage(clue), 'seek');
  assert.equal(puzzleStage({...clue, opened: true}), 'found', 'read where it was found');
  assert.equal(puzzleStage({...clue, location: 'bag'}), 'found', 'taken without reading');
  assert.equal(puzzleStage({...clue, location: 'hide:sofa', opened: true}), 'found', 'read, then hidden again');
  assert.equal(puzzleStage(clue, '2026-10-24'), 'open');
  assert.equal(puzzleStage(null, '2026-10-24'), 'open');
});

test('a clue from before, still in the backpack or hidden by hand, carries on', () => {
  const old = {id: 'x', puzzleId: GARDEN, kind: 'note', name: puzzles[GARDEN].clue.name, note: '…', location: 'bag', slot: 0};
  assert.equal(puzzleStage(old), 'found');
  const byHand = {...old, location: 'hide:livingWindow', slot: 1};
  assert.equal(puzzleStage(byHand), 'seek');
  assert.deepEqual(clueHint(byHand), {hint: '就在你上次亲手藏它的地方。', room: null});
  assert.deepEqual(clueHint({location: 'hide:studyDesk'}), {hint: clueSpots['hide:studyDesk'].hint, room: clueSpots['hide:studyDesk'].room});
});

test('the answer, give or take spaces', () => {
  assert.ok(rightAnswer('花瓣'));
  assert.ok(rightAnswer(' 花 瓣 '));
  assert.ok(rightAnswer('花　瓣'));
  assert.ok(!rightAnswer('花'));
  assert.ok(!rightAnswer(''));
  assert.ok(!rightAnswer(null));
});
