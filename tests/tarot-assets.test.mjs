import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tarotCards} from '../src/tarot-state.js';
const hashes=new Set();
for(const id of [...tarotCards.map(c=>c.id),'back']){
 const b=readFileSync(new URL(`../public/art/tarot/${id}.webp`,import.meta.url));
 assert.equal(b.toString('ascii',0,4),'RIFF');
 assert.equal(b.toString('ascii',8,12),'WEBP');
 assert.ok(b.length>1000,`${id} has a complete image`);
 hashes.add(createHash('sha256').update(b).digest('hex'));
}
assert.equal(hashes.size,79,'all faces and back are distinct assets');
console.log('78 distinct tarot faces and card back are packaged.');
