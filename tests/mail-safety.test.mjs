import test from 'node:test';
import assert from 'node:assert/strict';
import {checkGift, welcome} from '../src/door-gifts.js';
import {freshAnimal} from '../src/animal-state.js';
import {freshDessert} from '../src/dessert-recipe.js';
import {starters} from '../src/brick-recipe.js';
import {checkHome, storableHome} from '../src/home-transfer.js';
import {receiveMail, pendingMail} from '../src/mail-receipts.js';
import {smallPng} from '../src/door-safety.js';
import {itemProblem, noteProblem} from '../server/doors.mjs';
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const flower = {kind:'bouquet',name:'花',vase:'cream',vaseColor:'#ffffff',stems:[{slot:0,type:'rose',color:'#ffffff',height:3,tilt:0,turn:0}]};
test('untrusted mailbox shapes never throw or reach the renderer',()=>{
 const build=starters.vase.recipe();
 const bad=[null, [], 1, {...flower,stems:'xxx'}, {...flower,stems:[null]}, {...freshAnimal(),species:'constructor'}, {...build,parts:{}}, {...build,parts:[null]}, {...build,v:{}}, {...build,mirror:'yes'}, {...build,scale:'constructor'}, {...freshDessert(),c:{...freshDessert().c,body:'constructor'}}];
 for(const field of ['p','c','mat','profile']) bad.push({...build,parts:[{...build.parts[1],[field]:'constructor'}]});
 for(const thing of bad) {assert.doesNotThrow(()=>checkGift(thing));assert.equal(checkGift(thing),null);if(thing!==null)assert.ok(itemProblem(thing));}
});
test('a build is rebuilt from permitted scalar fields and can be exported safely',()=>{
 const raw=starters.vase.recipe();
 raw.parts[0].constructor={surprise:true}; raw.parts[0].extra='ignored';
 const gift=checkGift(raw); assert.ok(gift); assert.equal(Object.hasOwn(gift.parts[0],'constructor'),false); assert.equal(Object.hasOwn(gift.parts[0],'extra'),false);
 const doc={format:'porchlit-home',version:1,entries:{'porchlit-home-layout-v1':{furniture:{},creations:[gift]}}};
 assert.doesNotThrow(()=>storableHome(checkHome(doc)));
 let deep={};for(let i=0;i<20;i++)deep={next:deep};assert.equal(checkGift({...raw,extra:deep}),null);
 assert.equal(checkGift({...freshAnimal(),extra:'x'.repeat(33000)}),null);
});
test('whole emoji survive notes and sender tags; broken text is rejected',()=>{
 const note='🫶'.repeat(300); const sender='🌸'.repeat(40);
 const gift=welcome({id:'8',status:'taken',from:{name:sender},note,item:freshDessert()});
 assert.equal(gift.gift.note,note);assert.equal(gift.by.name,'🌸'.repeat(20));
 for(const text of ['x\u0000','x\ud800','\udfff','x\u0007']){assert.ok(noteProblem(text));assert.equal(checkGift({...freshAnimal(),name:text}),null);}
});
test('photos have bounded decoded dimensions and complete PNG framing',()=>{
 assert.equal(smallPng(png),true);
 const bytes=Buffer.from(png.slice(22),'base64');bytes.writeUInt32BE(100000,16);
 assert.equal(smallPng('data:image/png;base64,'+bytes.toString('base64')),false);
 assert.equal(smallPng('data:image/png;base64,iVBORw0KGgo='),false);
 assert.equal(smallPng(png.replace('image/png','image/jpeg')),false);
});
test('receipts prevent re-granting gifts and tickets after placement, eating or gifting',()=>{
 const visit={id:'42',status:'taken',item:freshAnimal(),from:{name:'Moss'}};
 const home=receiveMail({creations:[]},visit,'2026-10-24');
 assert.equal(home.tickets.n,1);assert.equal(home.creations.length,1);
 for(const creations of [[],[{...home.creations[0],location:'room'}]]){
  const later={...home,creations};assert.equal(receiveMail(later,visit,'2026-10-25'),later);
 }
 assert.deepEqual(receiveMail({creations:[]},{...visit,delivered:true},'2026-10-24'),{creations:[]});
 assert.deepEqual(receiveMail({creations:[]},{...visit,status:'declined'},'2026-10-24'),{creations:[]});
});
test('lost send responses retry the persisted payload after reload; storage failure sends nothing',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const first=pendingMail(storage,'1','2:3',{note:'first',sourceId:'a'});
 const retry=pendingMail(storage,'1','2:3',{note:'changed',sourceId:'b'});
 assert.deepEqual(retry,first);
 assert.notEqual(pendingMail(storage,'2','2:3',{note:'other account'}).request.requestId,first.request.requestId);
 assert.throws(()=>pendingMail({getItem:()=>null,setItem:()=>{throw Error('full');}},'1','2:3',{}),/full/);
});
