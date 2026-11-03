import test from 'node:test';
import assert from 'node:assert/strict';
import {LOG_MAX, cleanTickets, earnTicket} from '../src/tickets.js';
import {albumOf, shelfCount, speciesName} from '../src/album.js';
import {dateLabel, diaryDays} from '../src/diary-days.js';
import {freshAnimal, animalOptions, lockedSpecies, speciesLooks} from '../src/animal-state.js';
import {freshDessert, dessertRecipe} from '../src/dessert-recipe.js';
import {bookEntry} from '../src/dessert-state.js';
import {GARDEN} from '../src/puzzle-folder.js';

test('tickets: a home from before them gets one for each time he was found', () => {
  assert.deepEqual(cleanTickets(undefined), {n: 0, log: []});
  assert.deepEqual(cleanTickets(null, {foundBefore: 3, lastFound: '2026-10-24'}), {n: 3, log: [{why: 'before', n: 3, day: '2026-10-24'}]});
  // Once saved, what was saved stands, whatever the finds say.
  assert.deepEqual(cleanTickets({n: 1, log: []}, {foundBefore: 3}), {n: 1, log: []});
  assert.deepEqual(cleanTickets({n: -2, log: [{why: 'nonsense', n: 1}, {why: 'seek', n: 1, day: 'yesterday'}, {why: 'seek', n: 1, day: '2026-10-24', extra: 1}]}), {n: 0, log: [{why: 'seek', n: 1, day: '2026-10-24'}]});
});

test('tickets: earning one adds it and a line saying why', () => {
  let t = cleanTickets(null);
  t = earnTicket(t, 'seek', '2026-10-24');
  t = earnTicket(t, 'puzzle', '2026-10-24');
  assert.equal(t.n, 2);
  assert.deepEqual(t.log.map(l => l.why), ['seek', 'puzzle']);
  assert.deepEqual(earnTicket(t, 'bribe', '2026-10-24'), t, 'nothing for no reason');
  for (let i = 0; i < LOG_MAX + 5; i++) t = earnTicket(t, 'seek');
  assert.equal(t.n, LOG_MAX + 7);
  assert.equal(t.log.length, LOG_MAX, 'only the newest lines are kept; the count is not');
});

const doll = (species, extra = {}) => ({...freshAnimal(), species, name: speciesLooks[species].name, id: species + Math.random(), location: 'bag', slot: 0, ...extra});
const dessert = (base, extra = {}) => ({...freshDessert(), base, name: base + ' 一份', id: base + Math.random(), location: 'bag', slot: 0, by: {kind: 'self'}, ...extra});

test('album: every kind on its shelf, lit once there is one', () => {
  const empty = albumOf({});
  assert.equal(empty.desserts.length, 5);
  assert.ok(empty.desserts.every(d => !d.have && d.look === null));
  assert.equal(empty.dolls.length, animalOptions.species.filter(s => !lockedSpecies.has(s)).length);
  assert.ok(!empty.dolls.some(d => lockedSpecies.has(d.id)), 'a hidden kind stays hidden');
  assert.equal(empty.flowers.length, 3);
  assert.deepEqual(shelfCount(empty.dolls), {have: 0, of: empty.dolls.length});

  const puff = dessert('puff', {madeOn: '2026-10-23'});
  const eaten = bookEntry(dessert('cake', {madeOn: '2026-10-20'}), '2026-10-21');
  const state = {
    creations: [doll('rabbit', {madeOn: '2026-10-22'}), doll('rabbit', {name: '团子'}), doll('dragon'), puff,
      {kind: 'bouquet', id: 'b', stems: [{type: 'rose', color: '#c66'}, {type: 'rose', color: '#c66'}, {type: 'rose', color: '#fff'}, {type: 'tulip', color: '#fc6'}]}],
    dessertBook: [eaten, bookEntry(dessert('cake'), '2026-10-24')]
  };
  const a = albumOf(state);
  const rabbit = a.dolls.find(d => d.id === 'rabbit');
  assert.deepEqual([rabbit.have, rabbit.n, rabbit.first, rabbit.look.name, rabbit.name], [true, 2, '2026-10-22', '团子', '小兔']);
  assert.ok(a.dolls.some(d => d.id === 'dragon' && d.have), 'made one, so it shows');
  const cake = a.desserts.find(d => d.id === 'cake'), pf = a.desserts.find(d => d.id === 'puff');
  assert.deepEqual([cake.have, cake.eaten, cake.made, cake.first], [true, 2, 2, '2026-10-20']);
  assert.deepEqual([pf.have, pf.eaten, pf.made], [true, 0, 1]);
  assert.deepEqual(pf.look, dessertRecipe(puff));
  assert.equal(a.desserts.find(d => d.id === 'tart').have, false);
  const rose = a.flowers.find(f => f.id === 'rose');
  assert.deepEqual([rose.have, rose.n, rose.color], [true, 3, '#c66']);
  assert.equal(a.flowers.find(f => f.id === 'daisy').have, false);
  assert.equal(speciesName('bear'), '小熊');
});

test('diary: a page for each day something happened, oldest first', () => {
  const state = {
    hideSeek: {book: [{day: '2026-10-23', spot: 'wardrobe', seconds: 42}, {day: '2026-10-24', spot: 'quilt', seconds: 130}], total: 2},
    creations: [doll('rabbit', {madeOn: '2026-10-24'}), doll('bear', {name: '我的小熊', madeOn: '2026-10-24'}), doll('cat'), {kind: 'bouquet', id: 'b', name: '给你的', madeOn: '2026-10-22', stems: []}],
    dessertBook: [bookEntry(dessert('cake', {name: '草莓蛋糕', madeOn: '2026-10-23'}), '2026-10-24'), bookEntry(dessert('tart', {name: '柠檬小塔', by: {kind: 'guest', name: 'Wren'}}), '2026-10-24')],
    dessertRecipes: [{id: 'r', recipe: dessertRecipe(dessert('tart', {name: '柠檬小塔'})), from: 'Wren', learnedOn: '2026-10-24'}],
    computer: {solved: {[GARDEN]: '2026-10-24', nonsense: '2026-10-24'}}
  };
  state.creations.push({...doll('rabbit', {name: '团子'}), gift: {id: '7', from: 'Moss', on: '2026-10-24'}}, {kind: 'note', name: '小雀的纸条', note: '嗨', location: 'bag', gift: {id: '8', from: '小雀', on: '2026-10-24'}});
  const days = diaryDays(state, {him: '他'});
  assert.deepEqual(days.map(d => d.day), ['2026-10-22', '2026-10-23', '2026-10-24']);
  assert.deepEqual(days[0].lines.map(l => l.text), ['插了一瓶花「给你的」']);
  assert.deepEqual(days[1].lines.map(l => l.text), ['在衣柜里找到他，找了 42 秒', '做了一份草莓蛋糕']);
  assert.deepEqual(days[2].lines.map(l => l.text), [
    '在被子底下找到他，找了 2 分 10 秒',
    '收下了 Moss 放在门口的「团子」',
    '收下了小雀的纸条',
    '做了一只小兔',
    '做了一只小熊',
    '和他一起吃了草莓蛋糕',
    '和他一起吃了柠檬小塔，Wren 做的',
    '跟 Wren 学会了柠檬小塔',
    '解开了谜题文件夹「花园里的来信」'
  ]);
  assert.equal(diaryDays(state, {him: '她'})[1].lines[0].text, '在衣柜里找到她，找了 42 秒');
  assert.deepEqual(diaryDays({}), []);
  assert.equal(dateLabel('2026-10-24'), '10月24日 · 周六');
});
