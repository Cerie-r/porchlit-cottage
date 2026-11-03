import assert from 'node:assert/strict';
import {freshDessert} from '../src/dessert-recipe.js';
import {BOOK_MAX,LEARNED_MAX,DOME,freshDessertState,loadDessertState,domeItem,putInDome,finishMeal,learnDessert,bookEntry} from '../src/dessert-state.js';

const dessert=(id,more={})=>({...freshDessert(),id,location:'bag',slot:0,by:{kind:'self'},madeOn:'2026-10-22',...more});
const home=(creations,more={})=>({version:4,creations,furniture:{},...freshDessertState(),...more});

// An older home has no book yet and opens with an empty one; junk is left out.
assert.deepEqual(loadDessertState({}),{dessertBook:[],dessertRecipes:[]});
assert.deepEqual(loadDessertState(undefined),{dessertBook:[],dessertRecipes:[]});
const good=bookEntry(dessert('a'),'2026-10-23');
const loaded=loadDessertState({dessertBook:[good,{id:'b'},'x',{...good,id:'c',eatenOn:'soon'},{...good,id:'d',recipe:{...good.recipe,base:'pie'}}],dessertRecipes:[{id:'r',recipe:good.recipe,from:'小葵',learnedOn:'2026-10-23'},{id:'s',recipe:good.recipe,from:'',learnedOn:'2026-10-23'}]});
assert.deepEqual(loaded.dessertBook.map(e=>e.id),['a'],'only proper pages stay');
assert.deepEqual(loaded.dessertRecipes.map(e=>e.id),['r']);
assert.equal(loadDessertState({dessertBook:Array.from({length:BOOK_MAX+5},(_,i)=>({...good,id:'p'+i}))}).dessertBook.length,BOOK_MAX,'never more than the book holds');

// Into the dome: one at a time; the one before goes back into the backpack.
let items=[dessert('a'),dessert('b'),{id:'n',kind:'note',location:'bag',slot:0}];
assert.equal(domeItem(items),null);
items=putInDome(items,'a');
assert.equal(domeItem(items).id,'a');assert.equal(items.find(i=>i.id==='a').location,DOME);
items=putInDome(items,'b');
assert.equal(domeItem(items).id,'b');assert.equal(items.find(i=>i.id==='a').location,'bag','the first one is back in the bag');
assert.equal(items.filter(i=>i.location===DOME).length,1);
assert.equal(putInDome(items,'n'),items,'only desserts go under the dome');
assert.equal(putInDome(items,'nobody'),items);
assert.equal(putInDome(items,'b'),items,'already there');
// A dessert set out in the room can go under the dome too.
const placed=[dessert('p',{location:'room',floor:'1F',position:[0,1,0]})];
assert.equal(domeItem(putInDome(placed,'p')).id,'p');

// Eating it: gone from the house, a page in the book.
let s=home(putInDome([dessert('a',{note:'  给你  '}),dessert('b')],'a'));
s=finishMeal(s,'a','2026-10-23');
assert.equal(s.creations.some(i=>i.id==='a'),false,'it has been eaten');
assert.equal(s.creations.length,1);
assert.equal(s.dessertBook.length,1);
const page=s.dessertBook[0];
assert.equal(page.eatenOn,'2026-10-23');assert.equal(page.madeOn,'2026-10-22');assert.equal(page.note,'给你');assert.deepEqual(page.by,{kind:'self'});
assert.equal(page.recipe.name,'草莓奶油蛋糕');assert.equal(page.recipe.location,undefined,'the page keeps the recipe, not its place');
assert.deepEqual(s.dessertRecipes,[],'nothing to learn from your own dessert');
assert.deepEqual(loadDessertState(s).dessertBook,s.dessertBook,'the page survives saving and opening again');
assert.equal(finishMeal(s,'nobody'),s,'nothing to eat, nothing changes');

// A dessert someone else made is learned, once, with who it came from.
let t=home([dessert('g',{by:{kind:'guest',name:'小葵'},name:'小葵的布丁',base:'pudding'})]);
t=finishMeal(t,'g','2026-10-24');
assert.equal(t.dessertRecipes.length,1);assert.equal(t.dessertRecipes[0].from,'小葵');assert.equal(t.dessertRecipes[0].recipe.base,'pudding');assert.equal(t.dessertRecipes[0].learnedOn,'2026-10-24');
t={...t,creations:[dessert('h',{by:{kind:'machine',name:'Birch'},name:'换了名字',base:'pudding'})]};
t=finishMeal(t,'h','2026-10-25');
assert.equal(t.dessertRecipes.length,1,'the same dessert under another name is already known');
assert.equal(t.dessertBook.length,2);assert.equal(t.dessertBook[1].by.name,'Birch');
t={...t,creations:[dessert('m',{by:{kind:'machine',name:'Birch'},base:'macaron'})]};
assert.equal(finishMeal(t,'m','2026-10-26').dessertRecipes.at(-1).from,'Birch','the home\'s machine teaches too');
assert.equal(learnDessert([],dessert('x',{by:{kind:'guest'}}),'2026-10-26').length,0,'without a name there is nobody to learn from');
assert.equal(Array.from({length:LEARNED_MAX+3},(_,i)=>dessert('l'+i,{by:{kind:'guest',name:'n'},base:['cake','tart','pudding','macaron'][i%4],fruit:['none','strawberry','blueberry','cherry'][Math.floor(i/4)%4],sprinkles:['none','dots','pearls','hearts'][Math.floor(i/16)%4],plate:['round','lace','stand','saucer'][Math.floor(i/64)%4]})).reduce((list,d)=>learnDessert(list,d,'2026-10-26'),[]).length,LEARNED_MAX,'the kitchen keeps a bounded list');

// The book keeps the last two hundred.
let full=home([],{dessertBook:Array.from({length:BOOK_MAX},(_,i)=>({...good,id:'p'+i}))});
full={...full,creations:[dessert('new')]};
full=finishMeal(full,'new','2026-10-27');
assert.equal(full.dessertBook.length,BOOK_MAX);assert.equal(full.dessertBook[0].id,'p1','the oldest page makes way');assert.equal(full.dessertBook.at(-1).id,'new');
