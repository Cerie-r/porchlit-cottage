import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicOutfits} from '../body/outfit-pieces.js';
import {publicAccessories} from '../body/accessory-pieces.js';
import {PEOPLE_PIECES, PEOPLE_OUTFITS, FESTIVAL_POOLS} from '../src/capsule-catalog.js';
import {capsulePool} from '../src/capsules.js';
import {fromCapsules, offered, cleanDrawn, wearOnlyDrawn} from '../body/drawn.js';
import {isOut} from '../body/wardrobe-day.js';
import {cleanWardrobe, publicLook} from '../body/wardrobe-state.js';

// The public things beyond the everyday ones: each festival's own, kept for that festival's limited
// pool in the capsule machine (src/capsule-catalog.js), and gifts every home has (body/drawn.js).
const all = [...publicAccessories, ...publicOutfits];
const byId = id => all.find(x => x.id === id);
const keys = x => (x.colorways?.length ? x.colorways.map(w => w.id) : ['base']).map(w => `${x.id}:${w}`);

test('the Halloween and Christmas pieces are kept for their own pools, out of the everyday jar', () => {
  assert.deepEqual(Object.keys(FESTIVAL_POOLS).sort(), ['christmas', 'halloween']);
  const pools = {halloween: ['witch-dress', 'vampire', 'witch-hat'], christmas: ['christmas-dress', 'christmas-suit', 'santa-hat']};
  for (const [pool, ids] of Object.entries(pools)) {
    const mine = FESTIVAL_POOLS[pool], listed = [...mine.pieces, ...mine.outfits].map(x => x.id).sort();
    assert.deepEqual(listed, [...ids].sort(), pool);
    for (const id of ids) {
      const x = byId(id);
      assert.equal(x.pool, pool, id);
      assert.ok(!x.outOn && !x.gift, `${id}: the pool says when, not the wardrobe`);
      // in the pool with all its colourways, as the jar would hold it
      const there = [...mine.pieces, ...mine.outfits].find(e => e.id === id);
      assert.deepEqual(there.ways.map(w => w.id), x.colorways.map(w => w.id), id);
      if (mine.pieces.includes(there)) assert.equal(there.slot, x.slot || 'head', id);
      // never in the everyday jar, whatever the day
      assert.ok(![...PEOPLE_PIECES, ...PEOPLE_OUTFITS].some(e => e.id === id), `${id}: not in the everyday jar`);
      for (const day of ['2026-10-31', '2026-12-25', '2027-02-01']) {
        const jar = capsulePool(day);
        assert.ok(![...jar.common, ...jar.rare].some(p => p.id === id), `${id} on ${day}`);
      }
      // drawn like the rest: kept back in the wardrobe until it is, then offered in what was drawn
      assert.equal(fromCapsules(id), true, id);
      assert.equal(offered(cleanDrawn({}), id), false, id);
      const [first] = keys(x);
      assert.equal(offered(cleanDrawn(mine.pieces.includes(there) ? {pieces: [first]} : {outfits: [first]}), id), true, `${id}: offered once drawn`);
    }
  }
});

test('every public piece is in the everyday jar, a festival pool or given, and in only one of them', () => {
  for (const x of all) {
    const places = [PEOPLE_PIECES.some(e => e.id === x.id) || PEOPLE_OUTFITS.some(e => e.id === x.id), Object.values(FESTIVAL_POOLS).some(p => [...p.pieces, ...p.outfits].some(e => e.id === x.id)), !!x.gift];
    assert.equal(places.filter(Boolean).length, 1, x.id);
  }
});

test('the festival cards are hidden from the start, before the wardrobe has asked what has been drawn', async () => {
  const html = await readFile('body/index.html', 'utf8');
  for (const o of publicOutfits.filter(o => o.pool)) assert.match(html, new RegExp(`data-outfit="${o.id}" class="item has-thumbnail" hidden>`), o.id);
});

test("this year's Halloween gift: every home has the pumpkin pair from the day it came out, without drawing it", () => {
  const gifts = all.filter(x => x.gift);
  assert.deepEqual(gifts.map(x => x.id).sort(), ['pumpkin-dress', 'pumpkin-top']);
  for (const x of gifts) {
    assert.equal(x.outOn, '2026-10-25', x.id);
    assert.equal(isOut(x, '2026-10-24'), false, x.id);
    assert.equal(isOut(x, '2026-10-25'), true, x.id);
    assert.equal(isOut(x, '2027-10-25'), true, `${x.id}: a gift is kept`);
    assert.equal(fromCapsules(x.id), false, x.id);
    assert.equal(offered(cleanDrawn({}), x.id), true, x.id);
    assert.ok(x.colorways.length >= 2, x.id);
  }
  // worn, it stays on: through the drawn-only wardrobe, the save and the look outside
  const [dress, top] = ['pumpkin-dress', 'pumpkin-top'].map(byId);
  const w = wearOnlyDrawn(cleanWardrobe({girl: {outfit: dress.id, colorways: {[dress.id]: dress.colorways[1].id}}, boy: {outfit: top.id}}), cleanDrawn({}));
  assert.equal(w.girl.outfit, dress.id);
  assert.deepEqual(w.girl.colorways, {[dress.id]: dress.colorways[1].id}, 'every colourway of a gift is there');
  assert.equal(w.boy.outfit, top.id);
  assert.equal(publicLook('girl', w.girl).outfit, dress.id);
});
