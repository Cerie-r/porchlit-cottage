import assert from 'node:assert/strict';
import {freePoint,standingSpot,upstairsObstacles,UPSTAIRS_BOUNDS,STAND_RADIUS,BODY_RADIUS} from '../src/resident-navigation.js';
import {residentLocation} from '../src/resident-location.js';

const obs=upstairsObstacles({},'bedroom');
// Right behind the reading chair's back corner: feet fit, the head would not.
const tight=[.6,.85];
assert.ok(freePoint(tight,obs,UPSTAIRS_BOUNDS,BODY_RADIUS),'the feet fit there');
assert.equal(freePoint(tight,obs,UPSTAIRS_BOUNDS,STAND_RADIUS),false,'but not the head');
const spot=standingSpot(tight,obs,UPSTAIRS_BOUNDS);
assert.ok(freePoint(spot,obs,UPSTAIRS_BOUNDS,STAND_RADIUS),'a figure stops where its head clears the chair');
assert.ok(Math.hypot(spot[0]-tight[0],spot[1]-tight[1])<.5,'and only a short step away from where it was sent');
// Open floor stays exactly where it was clicked.
assert.deepEqual(standingSpot([.2,2.1],obs,UPSTAIRS_BOUNDS),[.2,2.1]);
// Both bedroom figures start with room for their heads.
const {spawns}=residentLocation('2F','bedroom');
for(const kind of ['girl','boy'])assert.ok(freePoint(spawns[kind],obs,UPSTAIRS_BOUNDS,STAND_RADIUS),kind+' starts clear of the furniture');
console.log('Standing spots: heads clear the furniture, open floor is left as clicked.');
