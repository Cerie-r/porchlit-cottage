import test from 'node:test';
import assert from 'node:assert/strict';
import {startTrip, pick, visit, homecoming} from '../src/explore-trips.js';
import {readTrip, readStrayTrip, writeTrip, dropTrip} from '../src/explore-session.js';

// A browser's two stores, as plain maps.
const store = () => {
  const m = new Map();
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear()};
};
globalThis.sessionStorage = store();
globalThis.localStorage = store();

test('a trip is kept in the tab, with a copy left in the browser; going home takes both away', () => {
  const day = '2026-10-28', invited = {invite: {by: {id: '34', name: 'Birch'}, on: day}};
  let {trip} = startTrip(invited, day, 'home-1');
  trip = pick(visit(trip, 'lake'), 'lake', 'shell');
  assert.ok(writeTrip(trip));
  assert.deepEqual(readTrip(), trip);
  assert.deepEqual(readStrayTrip(), trip);
  dropTrip();
  assert.equal(readTrip(), null);
  assert.equal(readStrayTrip(), null);
});

test('the tab closed in the middle of a trip: a new tab finds the basket left behind and brings it home', () => {
  const day = '2026-10-28', invited = {invite: {by: {id: '34', name: 'Birch'}, on: day}};
  const started = startTrip(invited, day, 'home-1');
  writeTrip(pick(pick(visit(started.trip, 'woods'), 'woods', 'blueberry'), 'woods', 'pinecone'));
  // The tab goes; its own store with it.
  sessionStorage.clear();
  assert.equal(readTrip(), null);
  const stray = readStrayTrip();
  assert.equal(stray.basket.length, 2);
  const {explore, back} = homecoming(started.explore, stray);
  assert.equal(back, 'home');
  assert.equal(explore.found['woods:blueberry'], 1);
  assert.equal(explore.found['woods:pinecone'], 1);
  assert.equal(explore.out, undefined, 'not out any more');
  dropTrip();
  assert.equal(readStrayTrip(), null);
});

test('a browser that will not keep the trip says so; one that keeps it in the tab only still goes', () => {
  const day = '2026-10-28', {trip} = startTrip({invite: {by: {id: '34', name: 'Birch'}, on: day}}, day, 'home-1');
  const session = globalThis.sessionStorage, local = globalThis.localStorage;
  globalThis.sessionStorage = {...store(), setItem: () => { throw Error('full'); }};
  assert.equal(writeTrip(trip), false);
  globalThis.sessionStorage = session;
  globalThis.localStorage = {...store(), setItem: () => { throw Error('full'); }};
  assert.equal(writeTrip(trip), true);
  globalThis.localStorage = local;
  dropTrip();
});
