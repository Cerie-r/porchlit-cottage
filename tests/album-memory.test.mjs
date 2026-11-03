import test from 'node:test';import assert from 'node:assert/strict';
import {rememberAlbum,cleanAlbumMemory} from '../src/album-memory.js';
import {albumOf} from '../src/album.js';import {freshAnimal} from '../src/animal-state.js';import {freshDessert} from '../src/dessert-recipe.js';
test('sending the last doll keeps its album picture without counting it as still owned',()=>{
 const item={...freshAnimal(),id:'doll',location:'bag'};const before=rememberAlbum({creations:[item]});
 const after=JSON.parse(JSON.stringify({...before,creations:[]}));const bear=albumOf(after).dolls.find(d=>d.id==='bear');
 assert.equal(bear.have,true);assert.equal(bear.n,0);assert.equal(bear.look.species,'bear');assert.equal(bear.look.id,undefined);
 assert.deepEqual(rememberAlbum(before).album,before.album);
});
test('dessert sent before eating stays discovered',()=>{
 const item=freshDessert();const s=rememberAlbum({creations:[item]});s.creations=[];
 const d=albumOf(s).desserts.find(d=>d.id===item.base);assert.equal(d.have,true);assert.equal(d.eaten,0);
});
test('malformed archived models and mismatched species cannot supply preview data',()=>{
 const good=freshAnimal();assert.deepEqual(cleanAlbumMemory({dolls:{cat:{look:good},bear:{look:{kind:'animal',name:'bad\u0000name'}}}}).dolls,{});
});
