import test from 'node:test';
import assert from 'node:assert/strict';
import {SEASON, HIDDEN_ODDS, boxThing, cleanBlindBox, fillBox, keepThing, payBox} from '../src/blind-box.js';
import {recipeProblems} from '../src/brick-recipe.js';
import {checkGift, outgoing} from '../src/door-gifts.js';
import {diaryDays} from '../src/diary-days.js';
import {checkHome} from '../src/home-transfer.js';
import {sounds} from '../src/sounds.js';

const home = (n = 2, extra = {}) => ({tickets: {n, log: []}, creations: [], ...extra});

test("this season's things are builds like any other, and can go to a neighbour's door", () => {
  assert.equal(SEASON.items.length, 6);
  for (const t of [...SEASON.items, SEASON.hidden]) {
    const r = t.recipe();
    assert.deepEqual(recipeProblems(r), [], t.id);
    assert.equal(r.name, t.name);
    assert.ok(checkGift(r), `${t.id} travels`);
    assert.ok(t.sounds.length && t.sounds.every(s => sounds[s]), `${t.id} sounds like something`);
    assert.ok(t.hint);
  }
  assert.equal(new Set([...SEASON.items, SEASON.hidden].map(t => t.id)).size, 7);
});

test('a box holds the secret one about one time in twelve, and otherwise any of the six', () => {
  assert.equal(fillBox(() => 0), SEASON.hidden.id);
  assert.equal(fillBox(() => HIDDEN_ODDS), SEASON.items[0].id);
  let k = 0;
  const seen = new Set(Array.from({length: 600}, () => fillBox(() => ((k = (k * 7919 + 13) % 1000) / 1000))));
  assert.ok(SEASON.items.every(t => seen.has(t.id)));
  assert.equal(boxThing('nothing'), null);
});

test('a box takes a ticket; none, no box', () => {
  const {state} = payBox(home(1), '2026-10-25');
  assert.equal(state.tickets.n, 0);
  assert.deepEqual(state.tickets.log, [{why: 'blindbox', n: -1, day: '2026-10-25'}]);
  assert.equal(payBox(home(0), '2026-10-25').problem, 'no_ticket');
});

test('what comes out goes into the backpack; the same again is another one', () => {
  let state = keepThing(home(), 'lamp', {day: '2026-10-25', id: 'box-1'});
  assert.equal(state.creations.length, 1);
  const lamp = state.creations[0];
  assert.equal(lamp.kind, 'build');
  assert.equal(lamp.location, 'bag');
  assert.deepEqual(lamp.blindbox, {on: '2026-10-25'});
  assert.deepEqual(state.blindbox.found, ['lamp']);
  assert.equal(keepThing(state, 'lamp', {day: '2026-10-25', id: 'box-1'}), state, 'the same box once');
  state = keepThing(state, 'lamp', {day: '2026-10-25', id: 'box-2'});
  assert.equal(state.creations.length, 2, 'a second lamp, to give away');
  assert.deepEqual(state.blindbox.found, ['lamp']);
  state = keepThing(state, SEASON.hidden.id, {day: '2026-10-26', id: 'box-3'});
  assert.deepEqual(state.blindbox.found, ['lamp', 'lantern']);
  assert.equal(keepThing(state, 'nothing', {id: 'box-4'}), state);
  // The diary tells of it, it saves, and given away it doesn't say where it came from.
  assert.match(diaryDays(state).at(-1).lines[0].text, /^在盲盒机拆到「门廊小灯」/);
  assert.doesNotThrow(() => checkHome({format: 'porchlit-home', version: 1, entries: {'porchlit-home-layout-v1': {...state, furniture: {}}}}));
  assert.equal(outgoing(lamp).blindbox, undefined);
  assert.ok(checkGift(outgoing(lamp)));
});

test('what was found is cleaned: real things, each once', () => {
  assert.deepEqual(cleanBlindBox({found: ['lamp', 'lamp', 'mouse', 3, 'constructor', 'lantern']}), {found: ['lamp', 'lantern']});
  assert.deepEqual(cleanBlindBox(null), {found: []});
});
