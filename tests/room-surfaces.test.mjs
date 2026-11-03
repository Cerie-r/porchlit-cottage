import assert from 'node:assert/strict';
import {resolvePattern,applyPattern,surfaceSlots} from '../src/surface-state.js';
import {daylightAt,validZone} from '../src/home-clock.js';
import {spotsFor} from '../src/hiding-spots.js';
import {slotVisible} from '../src/search-state.js';
const old={surfaces:{'sofa.pillow':'sage'},floorLayout:'plank',unlocked:['plain','rose','sage']};
const next=applyPattern(old,'bedroomBed','quilt','rose');
assert.equal(next.surfaces['sofa.pillow'],'sage');assert.equal(old.surfaces['bedroomBed.quilt'],undefined);
assert.equal(resolvePattern(JSON.parse(JSON.stringify(next)),'bedroomBed','quilt'),'rose');
assert.throws(()=>applyPattern(old,'bedroomBed','quilt','stripe'),/解锁/);
assert.throws(()=>applyPattern(old,'bedroomBed','metal','rose'),/无效/);
assert.equal(resolvePattern({surfaces:{'bedroomBed.quilt':'missing'}},'bedroomBed','quilt'),'plain');
for(const id of ['bedroomBench','bedroomChair']){assert.ok(surfaceSlots[id]);assert.equal(spotsFor('hide:'+id).length,4);const kind=id==='bedroomBench'?'bedroom-bench':'bedroom-chair';for(let slot=0;slot<4;slot++){assert.equal(slotVisible(kind,{},slot),false);assert.equal(slotVisible(kind,{open:1},slot),true);}}
const instant=new Date('2026-10-19T12:00:00Z');assert.equal(daylightAt(instant,'Australia/Melbourne'),0);assert.equal(daylightAt(instant,'Europe/London'),1);assert.equal(validZone('invalid/zone'),false);
console.log('Independent surfaces, persistence, unlock validation, new concealed slots and home zones passed.');
