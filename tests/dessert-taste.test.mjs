import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDessert} from '../src/dessert-recipe.js';
import {notes,flavourLabel,houseTaste,waitedDays} from '../src/dessert-taste.js';
import {finishMeal,loadDessertState,writeTasteWords,cleanTasteWords} from '../src/dessert-state.js';
import {checkHome} from '../src/home-transfer.js';
const item=()=>({...freshDessert(),id:'cake',madeOn:'2026-10-24',location:'dome'});
test('flavours follow roles and the plate contributes no flavour',()=>{
 const d=item();assert.equal(flavourLabel('lilac'),'芋泥');assert.equal(flavourLabel('gold','body'),'蛋香');assert.equal(flavourLabel('gold','sprinkles'),'蜂蜜');
 assert.deepEqual(notes(d),{top:'草莓',heart:'牛奶奶油',base:'蛋香'});
 assert.deepEqual(notes({...d,c:{...d.c,plate:'ink'}}),notes(d));
 assert.equal(notes({...d,fruit:'none',cream:'none'}).top,'蛋香');
});
test('printed notes use saved dates, actual marks and the home hour',()=>{
 assert.equal(waitedDays('2026-10-24','2026-10-23'),0);
 assert.equal(waitedDays('2026-10-24','2026-10-27'),3);
 assert.match(houseTaste({...item(),bake:'burnt'},{eatenOn:'2026-10-25',hour:23}),/焦.*一夜.*半夜/);
 assert.doesNotMatch(houseTaste(item(),{eatenOn:'2026-10-24'}),/半夜|早上|一夜/);
 assert.match(houseTaste(item(),{eatenOn:'2026-10-27'}),/等你/);
 const state=finishMeal({creations:[item()]},'cake','2026-10-25',{hour:8});
 const page=state.dessertBook[0];assert.match(page.taste,/早上/);
 assert.deepEqual(loadDessertState(JSON.parse(JSON.stringify(state))).dessertBook,state.dessertBook);
});
test('a margin can be edited, reopened and erased without changing other words',()=>{
 let state=finishMeal({creations:[item()]},'cake','2026-10-24');
 state.dessertBook[0].words={machine:'留给你的'};
 state=writeTasteWords(state,'cake','  奶油很软 🍰  ');
 assert.deepEqual(state.dessertBook[0].words,{self:'奶油很软 🍰',machine:'留给你的'});
 assert.deepEqual(loadDessertState(state).dessertBook,state.dessertBook);
 assert.equal(writeTasteWords(state,'missing','x'),state);
 state=writeTasteWords(state,'cake','');assert.deepEqual(state.dessertBook[0].words,{machine:'留给你的'});
 const legacy={...state.dessertBook[0]};delete legacy.notes;delete legacy.taste;
 assert.equal(loadDessertState({dessertBook:[legacy]}).dessertBook.length,1);
});
test('long emoji and malformed optional notes cannot poison a moving box',()=>{
 assert.equal([...cleanTasteWords('🍰'.repeat(200))].length,160);
 assert.equal(cleanTasteWords('a\u0000b'),'ab');
 const state=writeTasteWords(finishMeal({creations:[item()],furniture:{}},'cake','2026-10-24'),'cake','🍰'.repeat(159)+'\ud800');
 const doc={format:'porchlit-home',version:1,entries:{'porchlit-home-layout-v1':state}};
 assert.doesNotThrow(()=>checkHome(doc));
 const page=state.dessertBook[0];page.notes={top:null};page.words={self:{bad:'value'}};page.taste={bad:'value'};
 const cleaned=loadDessertState(state).dessertBook[0];assert.equal(cleaned.notes,undefined);assert.deepEqual(cleaned.words,{});assert.equal(cleaned.taste,'');
});
test('words are cleaned the same on a browser without toWellFormed',()=>{
 const native=Object.getOwnPropertyDescriptor(String.prototype,'toWellFormed');
 const samples=['奶油很软 🍰','a\ud800b','\udc00x','🍰'.repeat(200)+'\ud800',''];
 const expected=samples.map(cleanTasteWords);
 try{delete String.prototype.toWellFormed;assert.deepEqual(samples.map(cleanTasteWords),expected);}
 finally{if(native)Object.defineProperty(String.prototype,'toWellFormed',native);}
 assert.equal(typeof ''.toWellFormed,'function');
});
