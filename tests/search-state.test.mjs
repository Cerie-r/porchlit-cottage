import assert from 'node:assert/strict';
import {searchParts,slotVisible,loadSearch,clamp} from '../src/search-state.js';
import {moveItem} from '../src/workshop-state.js';
for(const kind of ['study-rug','sofa','bedroom-bed','bedroom-wardrobe','cupboard','tv','kitchen','study-box','study-desk','bedroom-nightstand','armchair','study-reading']){
 for(let slot=0;slot<4;slot++)assert.equal(slotVisible(kind,{},slot),false,kind+' initially concealed');
 const opened=Object.fromEntries(searchParts(kind).map(([key])=>[key,1]));
 for(let slot=0;slot<4;slot++)assert.equal(slotVisible(kind,opened,slot),true);
}
for(const kind of ['study-rug','sofa','bedroom-bed','bedroom-wardrobe']){
 assert.equal(slotVisible(kind,{left:1},0),true);
 assert.equal(slotVisible(kind,{left:1},1),false);
 assert.equal(slotVisible(kind,{left:0,right:1},0),false);
 assert.equal(slotVisible(kind,{left:0,right:1},1),true);
}
assert.equal(slotVisible('study-box',{open:.2},0),false);
assert.equal(slotVisible('study-box',{open:.9},0),true);
assert.equal(clamp(-2),0);assert.equal(clamp(9),1);
const stash=new Map();globalThis.localStorage={getItem:k=>stash.get(k)||null,setItem:(k,v)=>stash.set(k,v)};
localStorage.setItem('porchlit-search-v1:bed',JSON.stringify({left:.7}));
assert.deepEqual(loadSearch('bed'),{left:.7});assert.deepEqual(loadSearch('other'),{});
localStorage.setItem('porchlit-search-v1:broken','[');assert.deepEqual(loadSearch('broken'),{});
// Curtains in a new home start drawn back; once someone moves them, that is kept.
for(const id of ['hide:livingWindow','hide:bedroomWindow'])assert.deepEqual(loadSearch(id),{left:1,right:1},id+' starts open');
localStorage.setItem('porchlit-search-v1:hide:livingWindow',JSON.stringify({left:0,right:.3}));
assert.deepEqual(loadSearch('hide:livingWindow'),{left:0,right:.3},'saved curtains win over the default');
assert.equal(slotVisible('curtain',{},0),false,'a curtain spot is still concealed by curtains that are drawn');
const legacy=[{id:'old',slot:1,location:'hide:sofa'},{id:'new',slot:0,location:'bag'}];
assert.equal(moveItem(legacy,'new','hide:sofa').find(i=>i.id==='old').slot,1);
assert.equal(moveItem(legacy,'old','bag').find(i=>i.id==='old').location,'bag');
console.log('Search states: concealment, side isolation, closing, persistence and legacy inventory passed.');
