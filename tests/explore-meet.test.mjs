import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {ANIMALS_DIR, ANIMAL_ART, MEETS, MEET_CHANCE, butterfliesOn, meetOn} from '../src/explore-meet.js';
import {PLACES} from '../src/explore-places.js';
import {nearestAlong, pointAt} from '../src/explore-place.js';

const toPaths = (place, p) => Math.min(...place.paths.map(path => { const q = pointAt(nearestAlong(p, path), path); return Math.hypot(q[0] - p[0], q[1] - p[1]); }));
function webpSize(buf) {
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (kind === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  const b = buf.readUInt32LE(21);
  return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)];
}

test('every animal picture is there, the size the page expects', () => {
  for (const [art, size] of Object.entries(ANIMAL_ART)) {
    const file = new URL(`../public${ANIMALS_DIR}${art}.webp`, import.meta.url);
    assert.ok(existsSync(file), art);
    assert.deepEqual(webpSize(readFileSync(file)), size, art);
  }
  for (const {meets} of Object.values(MEETS)) for (const m of meets) for (const a of [m.art, m.then].filter(Boolean)) assert.ok(ANIMAL_ART[a], a);
});

test('who they might meet stands by a path, off it, clear of the pieces, on the page', () => {
  for (const [id, {at, meets}] of Object.entries(MEETS)) {
    const place = PLACES[id];
    assert.ok(place && at, id);
    for (const m of meets) {
      assert.ok(Math.abs(m.at[0]) < place.page.width / 2 && Math.abs(m.at[1]) < place.page.depth / 2, `${id} ${m.art}`);
      const d = toPaths(place, m.at);
      assert.ok(d > .5 && d < m.near, `${id} ${m.art}: ${d.toFixed(2)} from a path`);
      for (const p of place.pieces) {
        const x = Math.max(p.x - p.w / 2, Math.min(p.x + p.w / 2, m.at[0]));
        assert.ok(Math.hypot(x - m.at[0], p.z - m.at[1]) > .45, `${id} ${m.art} by ${p.id}`);
      }
      assert.ok(m.say && m.moment.includes('{at}') || m.moment.startsWith('湖边'), m.art);
    }
  }
  assert.equal(MEETS.mine, undefined, 'nobody in the mine');
});

test('one at most a walk, by its seed, only at its time of day; butterflies by day over the flowers', () => {
  assert.deepEqual(meetOn(7, 'woods', 'day'), meetOn(7, 'woods', 'day'));
  assert.equal(meetOn(7, 'mine', 'cave'), null);
  for (const id of Object.keys(MEETS)) {
    const seen = {day: new Set(), night: new Set()};
    let met = 0;
    for (let seed = 1; seed <= 400; seed++) for (const light of ['day', 'night']) {
      const m = meetOn(seed, id, light);
      if (!m) continue;
      met++;
      assert.ok(m.when === 'any' || m.when === light, `${id} ${m.art} at ${light}`);
      assert.ok(!m.moment.includes('{at}'), m.moment);
      seen[light].add(m.art);
    }
    // Most walks meet someone, not every one.
    assert.ok(met > 800 * MEET_CHANCE * .8 && met < 800 * MEET_CHANCE * 1.2, `${id}: ${met}`);
    for (const m of MEETS[id].meets) for (const light of m.when === 'any' ? ['day', 'night'] : [m.when]) assert.ok(seen[light].has(m.art), `${id}: ${m.art} at ${light}`);
  }
  assert.deepEqual(butterfliesOn(5, 'hill', 'night'), []);
  assert.deepEqual(butterfliesOn(5, 'lake', 'day'), []);
  assert.deepEqual(butterfliesOn(5, 'hill', 'day'), butterfliesOn(5, 'hill', 'day'));
  assert.ok([...Array(50).keys()].some(s => butterfliesOn(s + 1, 'hill', 'day').length > 0));
});
