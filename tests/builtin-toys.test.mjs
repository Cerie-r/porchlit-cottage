import test from 'node:test';
import assert from 'node:assert/strict';
import {addBuiltinToys} from '../src/builtin-toy-state.js';
const definitions=[{id:'bear',name:'小熊',position:[-.7,.82,-.28],rotationY:.2},{id:'lion',name:'狮子',position:[-.6,.705,-1.48]}];
test('old homes with no inventory receive independent bed toys without mutating the save',()=>{
 const before=[];const after=addBuiltinToys(before,definitions);
 assert.equal(before.length,0);assert.equal(after.length,2);assert.equal(after[0].support,'bed-toys');assert.equal(after[0].kind,'keepsake');
 assert.deepEqual(after[0].position,definitions[0].position);assert.notEqual(after[0].position,definitions[0].position);
});
test('reload preserves moved and bagged toys instead of recreating their bed copies',()=>{
 const saved=addBuiltinToys([],definitions);saved[0]={...saved[0],location:'bag'};saved[1]={...saved[1],support:null,position:[1,.008,2],rotationY:1.5};
 assert.deepEqual(addBuiltinToys(JSON.parse(JSON.stringify(saved)),definitions),saved);
});
test('optional private models add only their missing toys and preserve unrelated items',()=>{
 const saved=[{id:'letter',kind:'note',note:'kept'}];const publicItems=addBuiltinToys(saved,definitions.slice(0,1));
 const privateItems=addBuiltinToys(publicItems,definitions);assert.equal(privateItems.length,3);assert.equal(privateItems[0],saved[0]);assert.equal(privateItems[1],publicItems[1]);
 assert.deepEqual(addBuiltinToys(privateItems,definitions.slice(0,1)),privateItems);
});
