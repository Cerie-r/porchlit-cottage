import test from 'node:test';
import assert from 'node:assert/strict';
import {BLOCK_D, BLOCK_W, COLS, LOTS, LOT_W, PORCH_LOOK, lotPlace, porchLook, seeded, streetAtCell, streetCell, streetLook, streetOrigin, streetsAround} from '../src/street-layout.js';

test('streets spiral out from the first, each cell once, and back again', () => {
  assert.deepEqual(streetCell(1), [0, 0]);
  const seen = new Set();
  for (let n = 1; n <= 500; n++) {
    const [cx, cz] = streetCell(n);
    const key = cx + ',' + cz;
    assert.ok(!seen.has(key), `street ${n} lands on a taken cell ${key}`);
    seen.add(key);
    assert.equal(streetAtCell(cx, cz), n);
    // Each next street is beside the one before it (the spiral never jumps).
    if (n > 1) {
      const [px, pz] = streetCell(n - 1);
      assert.equal(Math.abs(cx - px) + Math.abs(cz - pz), 1, `street ${n} is not next to ${n - 1}`);
    }
  }
  // The first ring is all eight around the first street.
  const ring = new Set(Array.from({length: 8}, (_, i) => streetCell(i + 2).join(',')));
  for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) if (dx || dz) assert.ok(ring.has(`${dx},${dz}`));
  assert.throws(() => streetCell(0));
});

test('lots: four rows of sixteen, inside the block, none on top of another', () => {
  const places = Array.from({length: LOTS}, (_, i) => lotPlace(i));
  assert.equal(new Set(places.map(p => p.x.toFixed(3) + ',' + p.z.toFixed(3))).size, LOTS);
  for (const p of places) {
    assert.ok(Math.abs(p.x) < BLOCK_W / 2 && Math.abs(p.z) < BLOCK_D / 2);
    assert.equal(p.row * COLS + p.col, places.indexOf(p));
  }
  assert.ok(Math.abs(lotPlace(1).x - lotPlace(0).x - LOT_W) < 1e-9);
  assert.throws(() => lotPlace(64));
  assert.throws(() => lotPlace(-1));
});

test('the same seed grows the same street; another seed a different one', () => {
  assert.deepEqual(streetLook(42), streetLook(42));
  assert.notDeepEqual(streetLook(42).lots, streetLook(43).lots);
  const r = seeded(7);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1);
  }
  const look = streetLook(5);
  assert.equal(look.lots.length, LOTS);
  assert.ok(look.trees.length > 8 && look.lamps.length >= 12);
});

test('the light at a door: only a lit or a small light lets anyone come up to it', () => {
  assert.deepEqual(Object.keys(PORCH_LOOK), ['on', 'dim', 'dnd', 'off']);
  assert.equal(porchLook('on').visit, true);
  assert.equal(porchLook('dim').visit, true);
  assert.equal(porchLook('dnd').visit, false);
  assert.equal(porchLook('off').visit, false);
  assert.equal(porchLook('nonsense'), PORCH_LOOK.off);
  assert.ok(porchLook('on').lamp > porchLook('dim').lamp && porchLook('dim').lamp > porchLook('dnd').lamp);
});

test('the streets around a point are the ones that exist nearby', () => {
  assert.deepEqual(streetsAround(0, 0, 1), [1]);
  assert.deepEqual(streetsAround(0, 0, 9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const [x, z] = streetOrigin(2);
  assert.ok(streetsAround(x, z, 2).includes(2));
  assert.ok(streetsAround(x + 3 * BLOCK_W, z, 2).length === 0);
  assert.ok(Math.abs(streetOrigin(2)[0] - BLOCK_W) < 1e-9 || Math.abs(streetOrigin(2)[1]) > 0);
  assert.ok(BLOCK_D > 0);
});
