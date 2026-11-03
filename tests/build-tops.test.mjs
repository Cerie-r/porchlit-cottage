// Where things can be set down on a build: the flat tops, whatever is highest.
import assert from 'node:assert/strict';
import {restingTops} from '../src/brick-geometry.js';
import {expand,starters,PLATE} from '../src/brick-recipe.js';

const part = (p, x, y, z, w, d, h, more = {}) => ({id: `${p}${x}${y}${z}`, p, x, y, z, w, d, h, turn: 0, c: 'wood', ...more});
const at = (tops, x, z) => tops.find(t => t.x === x - 8 && t.z === z - 8);
const STUD_H = .17;

// A little table: four legs and a 4 x 4 plate on them. The top is the plate's
// top with its studs, over all sixteen squares; the legs underneath don't count.
const table = [part('brick', 6, 0, 6, 1, 1, 3), part('brick', 9, 0, 6, 1, 1, 3), part('brick', 6, 0, 9, 1, 1, 3), part('brick', 9, 0, 9, 1, 1, 3), part('plate', 6, 3, 6, 4, 4, 1)];
const tops = restingTops(table);
assert.equal(tops.length, 16);
assert.ok(tops.every(t => Math.abs(t.top - (4 * PLATE + STUD_H)) < 1e-9), 'level with the plate and its studs');
// A tile (no studs) on one corner is a little higher there, and smooth.
const tiled = restingTops([...table, part('tile', 6, 4, 6, 2, 2, 1)]);
assert.ok(Math.abs(at(tiled, 6, 6).top - 5 * PLATE) < 1e-9);
assert.ok(Math.abs(at(tiled, 9, 9).top - (4 * PLATE + STUD_H)) < 1e-9);
// A flower on the plate: nothing can stand on that square.
const flowered = restingTops([...table, part('flower', 7, 4, 7, 1, 1, 1)]);
assert.equal(flowered.length, 15);
assert.equal(at(flowered, 7, 7), undefined);
// A vase is all round, nothing stands on it; a curve only where its quarter disc is.
assert.deepEqual(restingTops(expand(starters.vase.recipe())).length, 0);
const curve = restingTops([part('curve', 4, 0, 4, 4, 4, 1)]);
assert.ok(at(curve, 4, 4) && !at(curve, 7, 7), 'the round edge leaves its far corner bare');
const turned = restingTops([part('curve', 4, 0, 4, 4, 4, 1, {turn: 2})]);
assert.ok(at(turned, 7, 7) && !at(turned, 4, 4), 'turned half round, the other corner');
// The starter chair: its seat is somewhere to put a cushion.
const chair = restingTops(expand(starters.chair.recipe()));
assert.ok(chair.length > 0);
console.log('ok build-tops');
