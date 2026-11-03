import test from 'node:test';
import assert from 'node:assert/strict';
import {castleKey, folderKey, openFolder, openedWords} from '../src/folder-open.js';
import {CASTLE, GARDEN, puzzles} from '../src/puzzle-folder.js';
import {houseShells} from '../src/house-shells.js';
import {validRecipe} from '../src/brick-recipe.js';

const day = '2026-10-25';
const home = (solved = {}) => ({version: 4, furniture: {}, creations: [{id: 'doll', kind: 'animal', location: 'bag', slot: 0}], computer: {solved, hints: {[GARDEN]: 1}}, tickets: {n: 0, log: []}});

test('the garden folder opens with a ticket, and nothing comes twice', () => {
  const opened = openFolder(home(), GARDEN, {day, newId: () => 'never'});
  assert.deepEqual(opened.computer, {solved: {[GARDEN]: day}, hints: {[GARDEN]: 1}});
  assert.equal(opened.tickets.n, 1);
  assert.deepEqual(opened.tickets.log, [{why: 'puzzle', n: 1, day}]);
  assert.deepEqual(opened.creations, home().creations);
  assert.equal(openFolder(opened, GARDEN, {day: '2026-10-26'}), opened);
});

test('the castle folder hands its key over, at the top of the backpack, once', () => {
  let n = 0;
  const opened = openFolder(home({[GARDEN]: '2026-10-24'}), CASTLE, {day, newId: () => 'key-' + ++n});
  const [key, ...rest] = opened.creations;
  assert.equal(key.id, 'key-1');
  assert.equal(key.name, '城堡的钥匙');
  assert.equal(key.kind, 'build');
  assert.equal(key.scale, 'small');
  assert.equal(key.location, 'bag');
  assert.deepEqual(key.folder, {id: CASTLE, on: day});
  assert.ok(validRecipe(key));
  assert.deepEqual(rest, home().creations);
  assert.equal(opened.tickets.n, 1);
  assert.equal(opened.computer.solved[CASTLE], day);
  // Opened already: no second key, even after the first was given away.
  const givenAway = {...opened, creations: rest};
  assert.equal(openFolder(givenAway, CASTLE, {day, newId: () => 'key-2'}), givenAway);
  assert.equal(n, 1);
});

test('the key is written in the brick language, small, gold, with a lilac stone', () => {
  const key = castleKey();
  assert.ok(validRecipe(key));
  assert.deepEqual(new Set(key.parts.map(p => p.c)), new Set(['gold', 'lilac']));
  assert.equal(new Set(key.parts.map(p => p.id)).size, key.parts.length);
  assert.deepEqual(folderKey(CASTLE), key);
  assert.equal(folderKey(GARDEN), null);
  assert.equal(folderKey('toString'), null);
});

test('an open folder says what it gave and what to do now', () => {
  assert.equal(openedWords(GARDEN), '得了一张券，放在背包最上面。');
  assert.equal(openedWords(CASTLE), '得了一张券，还有一把城堡的钥匙，都在背包最上面。');
  // The castle folder names the picker by the words on it (src/shell-picker.jsx).
  for (const words of ['「外观」', `「${houseShells.castle.label}」`, `「${houseShells.gabledCottage.label}」`]) assert.ok(puzzles[CASTLE].then.includes(words), words);
});
