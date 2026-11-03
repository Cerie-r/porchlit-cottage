import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDessert} from '../src/dessert-recipe.js';
import {freshDish, dishTaste} from '../src/cooking-recipe.js';
import {DOME, freshDessertState, loadDessertState, domeItem, putInDome, finishMeal, bookEntry} from '../src/dessert-state.js';
import {diaryDays} from '../src/diary-days.js';

const dish = (id, more = {}) => ({...freshDish(), id, location: 'bag', slot: 0, by: {kind: 'self'}, madeOn: '2026-11-02', ...more});
const home = (creations, more = {}) => ({version: 4, creations, furniture: {}, ...freshDessertState(), ...more});

test('a dish goes under the dome like a dessert, one at a time', () => {
  let items = [dish('a'), {...freshDessert(), id: 'b', location: 'bag', slot: 0}];
  items = putInDome(items, 'a');
  assert.equal(domeItem(items).id, 'a');
  assert.equal(items.find(i => i.id === 'a').location, DOME);
  items = putInDome(items, 'b');
  assert.equal(domeItem(items).id, 'b', 'a dessert after it sends the dish back to the bag');
  assert.equal(items.find(i => i.id === 'a').location, 'bag');
});

test('eaten, a dish leaves a page in the book with what it tasted like, and teaches the kitchen nothing', () => {
  const s = finishMeal(home([dish('a', {heat: 'caught', note: '给你的', extras: ['scallion']})], {dessertRecipes: []}), 'a', '2026-11-02', {hour: 19});
  assert.equal(s.creations.length, 0);
  const page = s.dessertBook[0];
  assert.deepEqual(page.recipe, {kind: 'dish', v: 1, items: ['tomato', 'egg'], extras: ['scallion'], name: '番茄炒蛋', heat: 'caught'});
  assert.equal(page.note, '给你的');
  assert.equal(page.notes, undefined, 'no scent strip for a dish');
  assert.match(page.taste, /酸酸甜甜/);
  assert.match(page.taste, /糊的那一点最下饭/);
  assert.match(page.taste, /晚饭/);
  assert.deepEqual(s.dessertRecipes, []);
  // A dish someone else cooked is eaten the same way, still nothing learned.
  const other = finishMeal(home([dish('g', {by: {kind: 'guest', name: '小葵'}})]), 'g', '2026-11-02');
  assert.deepEqual(other.dessertRecipes, []);
  assert.equal(other.dessertBook[0].by.name, '小葵');
});

test('a saved book keeps its dish pages, and the diary says what was cooked and eaten', () => {
  const page = bookEntry(dish('a', {items: ['greens'], name: '清炒青菜'}), '2026-11-02', {hour: 12});
  assert.match(page.taste, /脆生生/);
  const loaded = loadDessertState({dessertBook: [page, {...page, id: 'b', recipe: {...page.recipe, items: ['lobster']}}]});
  assert.deepEqual(loaded.dessertBook.map(p => p.id), ['a'], 'only a dish the kitchen knows stays');
  const days = diaryDays({dessertBook: loaded.dessertBook}, {him: '他'});
  const lines = days.flatMap(d => d.lines.map(l => l.text));
  assert.ok(lines.includes('做了一盘清炒青菜'), lines.join(' | '));
  assert.ok(lines.some(l => l.startsWith('和他一起吃了清炒青菜')), lines.join(' | '));
  assert.equal(dishTaste({...freshDish(['greens']), heat: 'tender'}, {hour: 2}), '脆生生的，清清爽爽，一口一股锅气。起锅起得早，嫩嫩的。半夜一起吃的，比白天香。');
});
