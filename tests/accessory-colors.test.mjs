import test from 'node:test';
import assert from 'node:assert/strict';
import {registerAccessories,paintAccessory} from '../body/accessory-registry.js';
import {cleanWardrobe} from '../body/wardrobe-state.js';
import fs from 'node:fs';
// The top hat is one of a home's own things (src/ours/), which the public copy doesn't have; there these are skipped.
const own=fs.existsSync('src/ours/tophat.accessory.js');
const accessories=own?(await import('../src/ours/tophat.accessory.js')).accessories:[];
registerAccessories(accessories);
const hat=accessories[0];
const skip=!own&&'no home headwear in src/ours/';
test('white hat survives wardrobe save; unsupported palettes and wearers are rejected',{skip},()=>{
 const saved=cleanWardrobe({boy:{accessory:'top-hat',accessoryWays:{'top-hat':'white',unknown:'white'}},girl:{accessoryWays:{'top-hat':'white'}}});
 assert.deepEqual(saved.boy.accessoryWays,{'top-hat':'white'});
 assert.deepEqual(cleanWardrobe(JSON.parse(JSON.stringify(saved))),saved);
 assert.equal(saved.girl.accessoryWays,undefined);
 assert.equal(cleanWardrobe({boy:{accessoryWays:{'top-hat':'bad'}}}).boy.accessoryWays,undefined);
});
test('hat presets repaint body and ribbon without changing geometry; old saves default to black',{skip},()=>{
 const model=hat.create(),crown=model.getObjectByName('top-hat-crown'),band=model.getObjectByName('top-hat-band');
 const geometry=crown.geometry;
 paintAccessory(model,'top-hat','white');
 assert.equal(crown.material.color.getHexString(),'f5f1e8');
 assert.equal(band.material.color.getHexString(),'b9b3ad');
 assert.equal(crown.geometry,geometry);
 paintAccessory(model,'top-hat',undefined);
 assert.equal(crown.material.color.getHexString(),'27252b');
 assert.equal(band.material.color.getHexString(),'4f2b35');
});
