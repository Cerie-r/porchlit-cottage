import assert from 'node:assert/strict';
import {spotsFor,placeLetter} from '../src/hiding-spots.js';
import {slotVisible,searchParts} from '../src/search-state.js';
import {moveItem} from '../src/workshop-state.js';
const location='hide:studyShelf';
const spots=spotsFor(location);
assert.equal(spots.length,6);
for(const slot of [4,5]){
 assert.equal(slotVisible('study-shelf',{},slot,0),false);
 assert.equal(slotVisible('study-shelf',{},slot,Math.PI),true);
}
const occupied=spots.slice(0,4).map(s=>({id:s.id,location,slot:s.slot}));
const moved=moveItem([...occupied,{id:'key',kind:'small-object',location:'bag'}],'key',location);
assert.equal(moved.find(i=>i.id==='key').slot,4);
const filled=placeLetter(moved,{id:'letter',note:'背面的小秘密',spotId:spots[5].id,location});
assert.equal(filled.at(-1).slot,5);
assert.throws(()=>placeLetter(filled,{id:'duplicate',note:'test',spotId:spots[5].id,location}));
assert.equal(searchParts('study-printer').length,4);
assert(searchParts('bedroom-nightstand').some(([id])=>id==='lower'));
for(const kind of ['bedroom-shelf','bedroom-vanity','study-box']){
 assert.equal(slotVisible(kind,{},0),false);
 assert.equal(slotVisible(kind,{open:1},0),true);
}
console.log('Rear pockets: visibility, capacity, placement, collision; cabinet controls passed.');

for(const location of ['hide:livingWindow','hide:bedroomWindow']){assert.equal(spotsFor(location).length,4);}
assert.equal(slotVisible('curtain',{},0),false);
assert.equal(slotVisible('curtain',{left:1},0),true);
assert.equal(slotVisible('curtain',{left:1},1),false);
assert.equal(slotVisible('curtain',{right:1},3),true);
assert.equal(slotVisible('curtain',{left:0,right:0},3),false);
