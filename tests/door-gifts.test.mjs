import test from 'node:test';
import assert from 'node:assert/strict';
import {GIFT_KINDS, bookLine, checkGift, giftable, outgoing, takeIn, welcome} from '../src/door-gifts.js';
import {GIFT_KINDS as SERVER_KINDS, cleanItem} from '../server/doors.mjs';
import {freshAnimal, speciesLooks, switchSpecies} from '../src/animal-state.js';
import {freshDessert, dessertRecipe} from '../src/dessert-recipe.js';

const bunny = () => {const d = freshAnimal(); return {...d, ...switchSpecies(d, 'rabbit'), name: '团子', id: 'b1', location: 'room', position: [1, 0, 1], rotationY: .5, floor: '1F', madeOn: '2026-10-24'};};
const bouquet = (color = '#d9a1bd') => ({kind: 'bouquet', name: '给你的一束', vase: 'wrap', vaseColor: '#f3e7d5', stems: [{id: 'x', slot: 0, type: 'rose', color, height: 3, tilt: .2, turn: 1}], bricks: [], id: 'q', location: 'bag', slot: 0});
const build = {kind: 'build', v: 1, name: '小房子', scale: 'furniture', mirror: false, parts: [{id: 'a', p: 'brick', x: 0, y: 0, z: 0, w: 2, d: 4, h: 3, turn: 0, c: 'rose'}], id: 'k', location: 'bag', slot: 0};
const puff = {...freshDessert(), base: 'puff', name: '奶油泡芙', id: 'p', location: 'dome', slot: 0, by: {kind: 'self'}, madeOn: '2026-10-24', note: '给你的'};
const photo = {kind: 'photo', name: '一张小画', mode: 'free', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', id: 'f', location: 'bag', slot: 0, createdAt: 1, sourceId: 'z'};

test('the page and the server agree on what travels', () => {
  assert.deepEqual(GIFT_KINDS, SERVER_KINDS);
});

test('what a visitor can put in a mailbox: things in the backpack that travel', () => {
  const items = [{...bunny(), location: 'bag'}, bunny(), bouquet(), {kind: 'note', name: '信', location: 'bag'}, {kind: 'note', puzzleId: 'garden-letter', location: 'bag'}, build, puff, photo];
  assert.deepEqual(giftable(items).map(i => i.kind), ['animal', 'bouquet', 'build', 'photo']);
});

test('a thing leaves its place and its id behind, and comes back whole on the other side', () => {
  const out = outgoing(bunny());
  for (const k of ['id', 'location', 'position', 'rotationY', 'floor', 'madeOn']) assert.ok(!(k in out), k);
  for (const thing of [bunny(), bouquet(), build, puff, photo]) {
    // Through the server, then checked by the home it arrives at.
    const arrived = checkGift(cleanItem(outgoing(thing)));
    assert.ok(arrived, thing.kind);
    assert.equal(arrived.kind, thing.kind);
    assert.equal(arrived.name, thing.name);
    assert.ok(!('location' in arrived) && !('id' in arrived) && !('by' in arrived), thing.kind);
  }
  assert.deepEqual(checkGift(outgoing(puff)), {...dessertRecipe(puff), name: '奶油泡芙'});
  assert.equal(checkGift(outgoing(bunny())).species, 'rabbit');
});

test('anything a bench here couldn\'t have made is turned away', () => {
  assert.equal(checkGift(null), null);
  assert.equal(checkGift({kind: 'note', name: '信'}), null);
  assert.equal(checkGift({...bunny(), name: ''}), null);
  assert.equal(checkGift({...bunny(), name: '名'.repeat(41)}), null);
  assert.equal(checkGift({...bunny(), species: 'unicorn'}), null);
  assert.equal(checkGift(bouquet('red; background:url(x)')), null);
  assert.equal(checkGift({...bouquet(), vaseColor: 'javascript:1'}), null);
  assert.equal(checkGift({...build, parts: [{...build.parts[0], c: '#ff0000'}]}), null);
  assert.equal(checkGift({...photo, image: 'https://example.com/x.png'}), null);
  assert.equal(checkGift({...photo, image: 'data:image/svg+xml;base64,PHN2Zz4='}), null);
  assert.equal(checkGift({...puff, base: 'pizza'}), null);
  // Extra fields don't come in.
  assert.ok(!('onClick' in checkGift({...outgoing(bunny()), onClick: 'x'})));
});

test('taken in: into the backpack, tagged with who it came from; a note alone becomes a letter', () => {
  const visit = {id: '7', from: {name: 'Moss', nickname: '小苔'}, note: '路过，送你一只兔子', item: cleanItem(outgoing(bunny()))};
  const thing = welcome(visit, '2026-10-24');
  assert.equal(thing.id, 'gift-7');
  assert.deepEqual([thing.location, thing.slot], ['bag', 0]);
  assert.deepEqual(thing.gift, {id: '7', from: '小苔', on: '2026-10-24', note: '路过，送你一只兔子'});
  const sweet = welcome({id: '8', from: {name: 'Moss', nickname: ''}, item: cleanItem(outgoing(puff))}, '2026-10-24');
  assert.deepEqual(sweet.by, {kind: 'guest', name: 'Moss'}, 'eaten together, it can be learned');
  const letter = welcome({id: '9', from: {name: 'Moss', nickname: ''}, note: '今天天气很好'}, '2026-10-24');
  assert.deepEqual([letter.kind, letter.name, letter.note, letter.location], ['note', 'Moss 的纸条', '今天天气很好', 'bag']);
  assert.equal(welcome({id: '10', from: {name: 'Moss'}, item: {kind: 'animal', name: '坏的', species: 'unicorn'}}), null);
  assert.equal(welcome({id: '11', from: {name: 'Moss'}}), null);
  // Twice is once.
  const once = takeIn([], thing);
  assert.equal(takeIn(once, welcome(visit, '2026-10-25')).length, 1);
});

test('the guestbook in words', () => {
  assert.equal(bookLine({kind: 'knock', from: {name: 'Moss', nickname: ''}}), 'Moss 来敲过门');
  assert.equal(bookLine({kind: 'mail', from: {name: 'Moss', nickname: '小苔'}, itemKind: 'animal', itemName: '团子', note: '嗨', status: 'taken'}), '小苔放了一只玩偶「团子」和一张纸条，收下了');
  assert.equal(bookLine({kind: 'mail', from: {name: 'Moss', nickname: ''}, note: '嗨', status: 'waiting'}), 'Moss 放了一张纸条，还在门口');
  assert.equal(bookLine({kind: 'mail', from: {name: 'Moss', nickname: ''}, itemKind: 'dessert', itemName: '泡芙', status: 'declined'}), 'Moss 放了一份甜品「泡芙」，没收');
});

test('a doll wearing several things comes in rebuilt; accessories nobody made are turned away', () => {
  const dressed = {...bunny(), accessory: ['pearls', 'wreath', 'wings']};
  const got = checkGift(dressed);
  assert.deepEqual(got.accessory, ['wreath', 'pearls', 'wings']);
  assert.notEqual(got.accessory, dressed.accessory);
  for (const bad of [['constructor'], ['toString'], ['__proto__'], ['wreath', 'hat'], 'constructor', ['bow', 1], [{}], [null]])
    assert.equal(checkGift({...bunny(), accessory: bad}), null, JSON.stringify(bad));
});
