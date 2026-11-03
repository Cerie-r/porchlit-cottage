import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dayOf, isOut} from '../body/wardrobe-day.js';

test('something with a day of its own is out from that day on, by the device calendar, and anything else always is', () => {
  assert.equal(dayOf(new Date(2026, 11, 15, 0, 5)), '2026-12-15');
  assert.equal(dayOf(new Date(2027, 0, 6, 23, 55)), '2027-01-06');
  assert.match(dayOf(), /^\d{4}-\d{2}-\d{2}$/);
  const christmas = {id: 'x', outOn: '2026-12-15'};
  assert.equal(isOut(christmas, '2026-10-25'), false);
  assert.equal(isOut(christmas, '2026-12-14'), false);
  assert.equal(isOut(christmas, '2026-12-15'), true);
  assert.equal(isOut(christmas, '2027-03-01'), true);
  assert.equal(isOut(christmas, undefined), false, 'not knowing the day keeps it back');
  for (const day of ['2026-10-25', undefined]) {
    assert.equal(isOut({id: 'y'}, day), true);
    assert.equal(isOut(undefined, day), true);
    assert.equal(isOut({id: 'z', outOn: 'soon'}, day), true, 'a day that is not a day is no reason to keep it back');
  }
});

test('the wardrobe offers a card only once it is out (and drawn, for what comes from the capsule machine), unless the person shown has it on', async () => {
  const app = await readFile('body/app.js', 'utf8');
  assert.match(app, /const outNow=id=>keptNow\.has\(id\)\|\|isOut\(/);
  // the outfit cards, the headwear cards and the cards in every other slot all ask both
  assert.match(app, /b\.hidden=!outfitsFor\(kind\)\.includes\(b\.dataset\.outfit\)\|\|!offered\(drawn,b\.dataset\.outfit\)\|\|!outNow\(b\.dataset\.outfit\)/);
  assert.match(app, /headwearFor\(person\)\.includes\(b\.dataset\.accessory\)&&offered\(drawn,b\.dataset\.accessory\)&&outNow\(b\.dataset\.accessory\)/);
  assert.match(app, /mine=piecesFor\(person,slot\)\.filter\(id=>offered\(drawn,id\)&&outNow\(id\)\)/);
  assert.match(app, /keptNow=new Set\(\[d\.outfit,d\.accessory,\.\.\.SLOT_ROWS\.map\(slot=>d\[slot\]\)\]\)/);
});
