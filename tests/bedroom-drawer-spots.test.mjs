import assert from 'node:assert/strict';
import {spotsFor,placeLetter} from '../src/hiding-spots.js';
import {slotVisible} from '../src/search-state.js';
import {moveItem} from '../src/workshop-state.js';
for(const [location,kind,count,parts,prefix] of [
 ['hide:bedroomNightstand','bedroom-nightstand',8,['open','lower'],'bedroom.nightstand'],
 ['hide:bedroomVanity','bedroom-vanity',12,['open','drawerLeft','drawerRight'],'hide:bedroomVanity']
]){
 const spots=spotsFor(location);assert.equal(spots.length,count);
 for(let n=0;n<4;n++)assert.equal(spots[n].id,`${prefix}.slot-${n+1}`);
 for(let group=0;group<parts.length;group++){
  const values={[parts[group]]:1};
  for(const spot of spots)assert.equal(slotVisible(kind,values,spot.slot),Math.floor(spot.slot/4)===group);
 }
 let items=[];
 for(const spot of spots)items=placeLetter(items,{id:spot.id,note:'保留在自己的抽屉',spotId:spot.id});
 assert.equal(items.length,count);
 const snapshot=JSON.stringify(items);
 for(const spot of spots)assert.equal(slotVisible(kind,{},spot.slot),false);
 assert.equal(JSON.stringify(items),snapshot);
 items=moveItem(items,spots.at(-1).id,'bag');
 assert.equal(items.at(-1).location,'bag');
 assert.equal(moveItem(items,spots.at(-1).id,location).at(-1).slot,count-1);
}
console.log('Drawer isolation, stable existing IDs, full capacity and retrieval passed.');
