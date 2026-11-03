// The residents walk round furniture-sized builds standing on the floor.
import assert from 'node:assert/strict';
import {builtObstacles,freePoint,findPath,standingSpot,DOWNSTAIRS_BOUNDS,WALK_BOUNDS} from '../src/resident-navigation.js';
import {builtPieces} from '../src/furniture-range.js';
import {starters} from '../src/brick-recipe.js';

const chair = {...starters.chair.recipe(), id: 'c1', location: 'room', floor: '1F', position: [2, .012, 1], rotationY: Math.PI / 4, support: null};
const built = builtPieces([chair], '1F', 'overview');
const [o] = builtObstacles(built);
assert.deepEqual([o.x, o.z, o.angle], [2, 1, Math.PI / 4], 'in the room frame downstairs');
const [inLiving] = builtObstacles(built, [-1, 0, 1.6]);
assert.ok(Math.abs(inLiving.x - 3) < 1e-9 && Math.abs(inLiving.z + .6) < 1e-9, 'moved into the living area\'s frame');
assert.ok(!freePoint([2, 1], [o]), 'nobody stands inside it');
const path = findPath([.5, 1], [3.5, 1], [o], DOWNSTAIRS_BOUNDS);
assert.ok(path && path.length > 1, 'a walk across goes round it');
const spot = standingSpot([2, 1], [o], DOWNSTAIRS_BOUNDS);
assert.ok(spot && Math.hypot(spot[0] - 2, spot[1] - 1) > .4, 'someone standing where it was put steps aside');
assert.deepEqual(builtObstacles([]), []);
console.log('ok built-obstacles');
