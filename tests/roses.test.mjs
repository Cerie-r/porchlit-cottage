import test from 'node:test';
import assert from 'node:assert/strict';
import {ROSES, addKiss, cleanRoses, kissesLeftToday, roseCastleOpen} from '../src/roses.js';
import {openShells, shellOpen, shellOf, wearShell} from '../src/house-shells.js';

test('kisses count, nine a day at most, and the ninety-ninth opens the rose castle', () => {
  let roses = cleanRoses(null), day = '2026-10-25', counted = 0, reached = null;
  assert.deepEqual(roses, {n: 0, day: null, today: 0, on: null});
  for (let i = 0; i < 12; i++) {
    const r = addKiss(roses, day);
    roses = r.roses;
    if (r.counted) counted++;
  }
  assert.equal(counted, ROSES.perDay, 'nine the first day');
  assert.equal(kissesLeftToday(roses, day), 0);
  assert.equal(kissesLeftToday(roses, '2026-10-26'), ROSES.perDay, 'a new day, nine more');
  // Ten more days of nine: ninety-nine on the eleventh.
  for (let k = 1; k <= 10; k++) {
    day = `2026-11-${String(k).padStart(2, '0')}`;
    for (let i = 0; i < 9; i++) {
      const r = addKiss(roses, day);
      roses = r.roses;
      if (r.reached) reached = day;
    }
  }
  assert.equal(roses.n, ROSES.goal);
  assert.equal(reached, '2026-11-10');
  assert.equal(roses.on, '2026-11-10');
  assert.equal(addKiss(roses, '2026-11-11').counted, false, 'and then no more counting');
  assert.equal(kissesLeftToday(roses, '2026-11-11'), 0);
  assert.equal(roseCastleOpen({roses}), true);
  assert.equal(roseCastleOpen({roses: {n: 98}}), false);
});

test('odd saved roses are cleaned', () => {
  assert.deepEqual(cleanRoses({n: 150, day: '2026-10-25', today: 30, on: '2026-10-25'}), {n: 99, day: '2026-10-25', today: 9, on: '2026-10-25'});
  assert.deepEqual(cleanRoses({n: -3, day: 'soon', today: 2, on: 'x'}), {n: 0, day: null, today: 0, on: null});
  assert.deepEqual(cleanRoses({n: 12.5, today: 1}), {n: 0, day: null, today: 0, on: null});
  assert.deepEqual(cleanRoses([1, 2]), {n: 0, day: null, today: 0, on: null});
  assert.equal(cleanRoses({n: 40, on: '2026-10-25'}).on, null, 'not reached, no day');
  assert.equal(addKiss({n: 3}, 'today').counted, false, 'a day that is not a day');
});

test('the rose castle is worn only once the ninety-nine are there', () => {
  const day = '2026-12-01', home = {shell: 'roseCastle', roses: {n: 98, day, today: 5}};
  assert.equal(shellOpen(home, 'roseCastle', day), false);
  assert.ok(!openShells(home, day).includes('roseCastle'), 'not offered before');
  assert.equal(shellOf(home, day), 'gabledCottage', 'written in but not open: the cottage');
  assert.equal(wearShell(home, 'roseCastle', day), home, 'cannot be put on');
  const opened = {...home, roses: addKiss(home.roses, day).roses};
  assert.equal(shellOpen(opened, 'roseCastle', day), true);
  assert.ok(openShells(opened, day).includes('roseCastle'));
  assert.equal(shellOf(opened, day), 'roseCastle');
  assert.equal(wearShell(opened, 'gabledCottage', day).shell, 'gabledCottage');
});
