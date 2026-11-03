import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanDrawn, drawnWays, fromCapsules, offered, registerOwn, wearOnlyDrawn} from '../body/drawn.js';
import {cleanWardrobe} from '../body/wardrobe-state.js';
import {publicAccessories} from '../body/accessory-pieces.js';
import {publicOutfits} from '../body/outfit-pieces.js';
import {publicHairs} from '../body/hair-pieces.js';
import {capsulePool, drawnToWear, turnDial} from '../src/capsules.js';
import {closetOf} from '../src/machine-closet.js';

const scarf = publicAccessories.find(a => a.id === 'knit-scarf'), cap = publicAccessories.find(a => a.id === 'newsboy-cap');
const skirt = publicOutfits.find(o => o.id === 'knit-skirt');
const key = (x, k = 0) => `${x.id}:${x.colorways[k].id}`;

test('what the machine draws is what the wardrobe reads', () => {
  const pool = capsulePool('2026-10-25'), keys = [...pool.common, ...pool.rare].filter(p => p.kind !== 'doll').map(p => `${p.id}:${p.way}`);
  assert.equal(cleanDrawn({pieces: keys.filter(k => !k.startsWith('knit-skirt')), outfits: keys}).size, keys.length);
  // A turn of the dial, then the wardrobe opening on it.
  const {state} = turnDial({tickets: {n: 1, log: []}, creations: []}, {day: '2026-10-25', random: (() => { let i = 0; const xs = [.5, .5, (pool.common.findIndex(p => p.kind === 'piece') + .5) / pool.common.length]; return () => xs[i++]; })()});
  assert.ok(offered(cleanDrawn(drawnToWear(state.capsules)), pool.common.find(p => p.kind === 'piece').id));
});

test('drawn keys are cleaned: only real pieces and outfits in real colourways', () => {
  const drawn = cleanDrawn({pieces: [key(scarf), key(scarf), `${scarf.id}:nope`, 'nothing:x', 7, 'constructor'], outfits: [key(skirt, 1)], dolls: ['bow']});
  assert.deepEqual([...drawn].sort(), [key(scarf), key(skirt, 1)].sort());
  assert.equal(cleanDrawn(null).size, 0);
  assert.equal(cleanDrawn('[]').size, 0);
});

test("only what was drawn is offered, in the colourways drawn; the base ones and a home's own always", () => {
  const none = cleanDrawn({}), some = cleanDrawn({pieces: [key(scarf, 1)], outfits: [key(skirt, 2)]});
  for (const id of ['dress', 'coat', 'bow', 'beret', 'none', 'a-home-piece']) assert.equal(offered(none, id), true, id);
  // everything public comes out of the machine, but a gift, which every home has
  for (const x of [...publicAccessories, ...publicOutfits]) { assert.equal(fromCapsules(x.id), !x.gift, x.id); assert.equal(offered(none, x.id), !!x.gift, x.id); }
  assert.equal(offered(some, scarf.id), true);
  assert.equal(offered(some, cap.id), false);
  assert.deepEqual(drawnWays(some, scarf.id, scarf.colorways).map(w => w.id), [scarf.colorways[1].id]);
  assert.deepEqual(drawnWays(some, skirt.id, skirt.colorways).map(w => w.id), [skirt.colorways[2].id]);
  assert.equal(drawnWays(none, 'a-home-piece', [{id: 'a'}, {id: 'b'}]).length, 2, "a home's own keep all theirs");
});

test('a wardrobe wears only what was drawn, and the colourway worn is written down', () => {
  const saved = cleanWardrobe({girl: {outfit: skirt.id, colorways: {[skirt.id]: skirt.colorways[0].id}, accessory: 'headband'}, boy: {neck: scarf.id, accessory: cap.id, outfit: 'coat'}});
  // Nothing drawn: back to the base ones.
  const bare = wearOnlyDrawn(saved, cleanDrawn({}));
  assert.equal(bare.girl.outfit, 'dress');
  assert.equal(bare.girl.accessory, 'bow');
  assert.equal(bare.girl.colorways, undefined);
  assert.equal(bare.boy.accessory, 'none');
  assert.ok(!('neck' in bare.boy));
  // Drawn in another colourway: worn in that one, and it says so.
  const drawn = cleanDrawn({pieces: [key(scarf, 2)], outfits: [key(skirt, 1)]});
  const worn = wearOnlyDrawn(saved, drawn);
  assert.equal(worn.girl.outfit, skirt.id);
  assert.deepEqual(worn.girl.colorways, {[skirt.id]: skirt.colorways[1].id});
  assert.equal(worn.boy.neck, scarf.id);
  assert.deepEqual(worn.boy.accessoryWays, {[scarf.id]: scarf.colorways[2].id});
  assert.equal(worn.boy.accessory, 'none', 'the cap was never drawn');
  // And it keeps when saved and read back.
  assert.deepEqual(cleanWardrobe(JSON.parse(JSON.stringify(worn))), worn);
  assert.deepEqual(wearOnlyDrawn(worn, drawn), worn, 'once is enough');
  assert.equal(saved.girl.outfit, skirt.id, 'what was passed in is left as it was');
});

test('a hairstyle out of the machine: offered once drawn, worn only then, and told to an AI only then', () => {
  const none = cleanDrawn({}), braids = cleanDrawn({hairs: ['braids:base']});
  for (const id of ['classic', 'short']) assert.equal(offered(none, id), true, `${id}: the base ones are always there`);
  for (const h of publicHairs) { assert.equal(fromCapsules(h.id), true, h.id); assert.equal(offered(none, h.id), false, h.id); }
  assert.equal(offered(braids, 'braids'), true);
  assert.equal(offered(braids, 'waves'), false);
  // Worn but not drawn: back to her own bob; drawn: kept.
  const saved = cleanWardrobe({girl: {hair: 'braids'}, boy: {hair: 'slick'}});
  assert.equal(saved.girl.hair, 'braids');
  const bare = wearOnlyDrawn(saved, none);
  assert.ok(!('hair' in bare.girl) && !('hair' in bare.boy));
  const kept = wearOnlyDrawn(saved, braids);
  assert.equal(kept.girl.hair, 'braids');
  assert.ok(!('hair' in kept.boy), 'his was never drawn');
  // What an AI living here is told it may put on them.
  const wardrobe = cleanWardrobe({playerKind: 'girl'}), day = '2026-10-28';
  assert.deepEqual(closetOf({wardrobe, drawn: none, day}).girl.hair.map(h => h.id), ['classic']);
  assert.deepEqual(closetOf({wardrobe, drawn: braids, day}).girl.hair, [{id: 'classic', name: '原版短发'}, {id: 'braids', name: '双麻花辫'}]);
  assert.deepEqual(closetOf({wardrobe, drawn: braids, day}).boy.hair.map(h => h.id), ['short']);
});

test("a home's own pack can say it has some of the machine's without drawing them", () => {
  const none = cleanDrawn({});
  registerOwn(['waves', 'roll', 'not-a-thing', 'classic']);
  registerOwn('waves');
  assert.equal(offered(none, 'waves'), true);
  assert.equal(offered(none, 'roll'), true);
  assert.equal(offered(none, 'braids'), false, 'only those it names');
  assert.equal(offered(none, 'not-a-thing'), true, 'not the machine\'s: offered as ever');
  assert.equal(wearOnlyDrawn(cleanWardrobe({girl: {hair: 'waves'}}), none).girl.hair, 'waves');
});
