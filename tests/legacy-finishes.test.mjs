import assert from 'node:assert/strict';
import {cleanDecor,cleanFinish,cleanSurfaces} from '../src/legacy-finishes.js';
const old={values:{'sofa|paint':'#CADCCF','sofa|fabric:pillow':'sage','room:study|wall':'rose'},locks:{'sofa|paint':true}};
const migrated=cleanDecor(old);assert.equal(migrated.values['sofa|paint'],'#f5eee3');assert.equal(migrated.values['sofa|fabric:pillow'],'milk');assert.equal(migrated.values['room:study|wall'],'rose');assert.equal(migrated.locks['sofa|paint'],true);assert.equal(old.values['sofa|paint'],'#CADCCF');assert.equal(cleanFinish('#507359'),'#507359');assert.deepEqual(cleanDecor(migrated),migrated);
assert.deepEqual(cleanSurfaces({surfaces:{'sofa.fabric':'sage'},unlocked:['sage','rose']}),{surfaces:{'sofa.fabric':'milk'},unlocked:['milk','rose']});
console.log('Retired finish migration preserves locks, other choices and source data.');
