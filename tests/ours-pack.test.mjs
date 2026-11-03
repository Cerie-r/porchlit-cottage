import test from 'node:test';
import assert from 'node:assert/strict';
import {oursPack, takeIn} from '../src/ours-pack.js';
import {outfitsFor, isHomeOutfit, outfitFitWith} from '../body/outfit-registry.js';
import {hairsFor} from '../body/hair-registry.js';
import {cleanDrawn, offered} from '../body/drawn.js';
import {headwearFor} from '../body/accessory-registry.js';
import {addBuiltinToys, builtinToys} from '../src/builtin-toy-state.js';
import {homeNotes} from '../src/capsule-notes.js';
import {spots} from '../src/ours-spots.js';

// A pack as the house fetches it: {file name: module}, one module for each kind of thing, and the fit.
const pack = () => ({
  './a.outfit.js': {outfits: [{id: 'pack-dress', name: '试穿', wearers: ['girl'], build: () => null}, {id: 'pack-unfitted', name: '没量过', wearers: ['girl'], build: () => null}]},
  './a.hair.js': {hairs: [{id: 'pack-hair', name: '试发', wearers: ['boy'], create: () => null}], own: ['slick', 'nonsense']},
  './a.accessory.js': {accessories: [{id: 'pack-hat', name: '试帽', wearers: ['girl'], create: () => null, place: () => {}}]},
  './a.toys.js': {toys: [{id: 'pack-toy', name: '试偶', position: [0, 1, 0], rotationY: 0, scale: 1, build: () => null, dispose: () => {}}]},
  './a.notes.js': {notes: [{id: 'n90', text: '试一张纸条'}, {id: 'bad id', text: 'x'}]},
  './a.jsx': {spots: {bed: [{Item: () => null, position: [0, 0, 0]}]}},
  './helper.js': {somethingElse: () => 1},
  './outfits-fit.json': {default: {'pack-dress': [{n: 3, i: [0], p: [1, 2, 3]}]}}
});

test('a pack puts each thing where it goes, and nothing twice', () => {
  takeIn(pack());
  takeIn(pack());
  assert.ok(outfitsFor('girl').includes('pack-dress') && !outfitsFor('boy').includes('pack-dress'));
  assert.ok(isHomeOutfit('pack-dress'));
  assert.ok(!outfitsFor('girl').includes('pack-unfitted'), 'an outfit whose fit didn\'t come with it stays out');
  assert.ok(hairsFor('boy').includes('pack-hair'));
  assert.ok(offered(cleanDrawn({}), 'slick'), 'one of the machine\'s the home has without drawing it');
  assert.ok(!offered(cleanDrawn({}), 'leafy'));
  assert.ok(headwearFor('girl').includes('pack-hat'));
  assert.equal(builtinToys.filter(t => t.id === 'pack-toy').length, 1);
  assert.equal(builtinToys[0].id, 'builtin-bed-bear', 'the little bear is every home\'s, first');
  assert.deepEqual(addBuiltinToys([], builtinToys).map(t => t.toy).sort(), ['builtin-bed-bear', 'pack-toy']);
  assert.deepEqual(homeNotes.map(n => n.id), ['n90'], 'only notes that are notes, once');
  assert.ok(spots.bed.length >= 1);
  assert.deepEqual(outfitFitWith({dress: [1]}), {dress: [1], 'pack-dress': [{n: 3, i: [0], p: [1, 2, 3]}]});
});

test('fetched once; a failure can be tried again; a timeout says no but it still comes in, and is heard', async () => {
  let asked = 0, fail = true;
  const fetchPack = async () => {
    asked++;
    if (fail) throw Error('404');
    return {default: {}};
  };
  const p = oursPack(fetchPack);
  assert.equal(await p.load(), false);
  assert.equal(p.loaded(), false);
  fail = false;
  let heard = 0;
  const stop = p.onLoad(() => heard++);
  assert.equal(await Promise.all([p.load(), p.load()]).then(r => r.every(Boolean)), true);
  assert.equal(asked, 2, 'asked again after the failure, then once for both');
  assert.ok(p.loaded());
  assert.equal(heard, 1);
  stop();
  assert.equal(await p.load(), true);
  assert.equal(asked, 2);
  // Slow: no within the time, then in.
  let arrive;
  const slow = oursPack(() => new Promise(resolve => { arrive = () => resolve({default: {}}); }));
  let late = false;
  slow.onLoad(() => { late = true; });
  assert.equal(await slow.load({timeout: 20}), false);
  arrive();
  assert.equal(await slow.load(), true);
  assert.ok(late && slow.loaded());
  // A build without any: nothing to fetch.
  assert.equal(await oursPack(null).load(), false);
});
