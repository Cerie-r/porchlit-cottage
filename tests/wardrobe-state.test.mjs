import test from 'node:test';import assert from 'node:assert/strict';import {cleanWardrobe,readWardrobe,wardrobeKey} from '../body/wardrobe-state.js';
test('resident looks stay independent and male outfit cannot inherit a dress',()=>{const w=cleanWardrobe({playerKind:'boy',girl:{hairColor:'#aabbcc',accessory:'bow',mouth:1},boy:{outfit:'dress',accessory:'bow'}});assert.equal(w.playerKind,'boy');assert.equal(w.girl.hairColor,'#aabbcc');assert.equal(w.boy.hairColor,'#494448');assert.equal(w.boy.outfit,'coat');assert.equal(w.boy.accessory,'none');assert.equal(w.girl.mouth,1);assert.equal(w.boy.mouth,0);assert.deepEqual(cleanWardrobe(JSON.parse(JSON.stringify(w))),w);});
test('stored appearance values are validated before rendering',()=>{const w=cleanWardrobe({girl:{hairColor:'broken',eyeColor:'#123456',blush:false,mouth:99}});assert.equal(w.girl.hairColor,'#806455');assert.equal(w.girl.eyeColor,'#123456');assert.equal(w.girl.blush,false);assert.equal(w.girl.mouth,0);});
test('a standalone wardrobe save wins over the older house snapshot on reopening',t=>{
 const old=cleanWardrobe({girl:{hairColor:'#111111'}}),saved=cleanWardrobe({playerKind:'boy',girl:{hairColor:'#abcdef'},boy:{accessory:'beret'}});
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 let raw=JSON.stringify(saved),blocked=false;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(key){assert.equal(key,wardrobeKey);if(blocked)throw Error('Storage unavailable');return raw;}}});
 t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;});
 assert.deepEqual(readWardrobe(old),saved);
 for(const invalid of [null,'broken','null','[]']){raw=invalid;assert.deepEqual(readWardrobe(old),old);}
 blocked=true;assert.deepEqual(readWardrobe(old),old);
});
