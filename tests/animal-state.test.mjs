import assert from 'node:assert/strict';
import {speciesEars,animalOptions,lockedSpecies,starterSpecies,starterAccessories,availableAccessories,speciesLooks,markings,creamParts,optionNames,freshAnimal,newDoll,normalizeAnimal,validAnimal,switchSpecies,accessorySlots,wornList,wearToggle} from '../src/animal-state.js';

// Old saves fill in.
// A doll from before kinds were written down: the kind is guessed from its ears, and it gets the markings colour.
const ancient={kind:'animal',name:'小熊',ears:'round',expression:'bright',blush:'soft',pose:'sit',accessory:'bow',fur:'#bd8c59',cream:'#f6e8cd',accent:'#c58f9d',bricks:[]};
const a=normalizeAnimal(ancient);
assert.equal(a.species,'bear');assert.equal(a.body,'classic');assert.match(a.patch,/^#[0-9a-f]{6}$/i);assert.ok(validAnimal(ancient),'an ancient bear is still a doll');
assert.equal(normalizeAnimal({...ancient,ears:'floppy'}).species,'rabbit','floppy ears were a rabbit');
assert.equal(normalizeAnimal({...ancient,ears:'cat'}).species,'cat','cat ears were a cat');
assert.equal(normalizeAnimal({...ancient,pose:'lie'}).pose,'sit','lying down became sitting');
// A doll saved just before this change: everything it had stays as it was, and only the markings colour is added.
const lastWeek={kind:'animal',name:'折耳',species:'cat',body:'chubby',ears:'folded',expression:'wink',blush:'rosy',pose:'hold',accessory:'scarf',fur:'#797b80',cream:'#f6e8cd',accent:'#b5a4c4',bricks:[],flowerDesignId:'x',heldFlowers:[{id:'s',slot:4,type:'daisy',color:'#d9a1bd'}],heldWrapColor:'#f3e7d5'};
const w=normalizeAnimal(lastWeek);
for(const k of Object.keys(lastWeek))assert.deepEqual(w[k],lastWeek[k],`${k} survives`);
assert.ok(validAnimal(lastWeek));
assert.deepEqual(Object.keys(w).sort(),[...Object.keys(lastWeek),'patch'].sort(),'nothing but the markings colour is added');

// New kinds can be made: the fox and panda, the dragon, the seven for the claw machine, and the koala, otter, hedgehog, seal pup and lion.
for(const s of ['fox','panda','dragon','dog','pig','lamb','fawn','duck','penguin','squirrel','koala','otter','hedgehog','seal','lion']){
  assert.ok(animalOptions.species.includes(s),`${s} is a kind`);
  for(const ears of speciesEars[s])assert.ok(validAnimal({...freshAnimal(),species:s,ears}),`${s} with ${ears} ears`);
  const picked={...freshAnimal(),...switchSpecies(freshAnimal(),s)};
  assert.equal(picked.species,s);assert.equal(picked.ears,speciesEars[s][0]);
  for(const k of ['fur','cream','patch'])assert.equal(picked[k],speciesLooks[s][k],`picking ${s} brings its own ${k}`);
  assert.equal(picked.name,speciesLooks[s].name,`and its own name`);
  assert.ok(validAnimal(picked));
}
// Every kind has its own look and ears, and the ones with markings name them on the palette.
for(const s of animalOptions.species){assert.ok(speciesLooks[s],`${s} has a look`);assert.ok(speciesEars[s]?.length,`${s} has ears`);}
assert.deepEqual(Object.keys(markings).sort(),['dog','dragon','duck','fawn','fox','hedgehog','koala','lion','otter','panda','penguin','pig','seal']);
// A new bunny comes white with lop ears, and can still have its ears up; the palette says what the bunny's and the cat's second colour paints.
const bunny={...freshAnimal(),...switchSpecies(freshAnimal(),'rabbit')};
assert.equal(bunny.ears,'floppy');assert.equal(bunny.fur,speciesLooks.rabbit.fur);assert.ok(validAnimal(bunny));
assert.ok(validAnimal({...bunny,ears:'rabbit'}),'ears up is still a choice');
assert.notEqual(speciesLooks.cat.fur,speciesLooks.bear.fur,'a new cat is not the bear\'s colour');
assert.deepEqual(Object.keys(creamParts).sort(),['cat','duck','fawn','hedgehog','koala','lamb','otter','penguin','pig','rabbit','seal','squirrel']);
// Options a kind calls by its own name are real options of a real kind.
for(const [s,names] of Object.entries(optionNames)){assert.ok(animalOptions.species.includes(s),`${s} is a kind`);for(const id of Object.keys(names))assert.ok(Object.values(animalOptions).some(vs=>vs.includes(id)),`${id} is an option`);}
// The later accessories, and the Halloween and Christmas ones, are real choices on any kind.
for(const acc of ['wreath','glasses','wings','pearls','witchhat','pumpkin','batwings','xmashat'])for(const s of animalOptions.species)assert.ok(validAnimal({...freshAnimal(),...switchSpecies(freshAnimal(),s),accessory:acc}),`${s} with ${acc}`);
assert.deepEqual(starterAccessories,['none'],'every accessory, the bow too, is drawn');
assert.ok(starterAccessories.every(a=>animalOptions.accessory.includes(a)));
// What the tray offers to wear: everything until there's a list of what this home has drawn; then what every home starts with plus what was drawn, for any kind.
assert.deepEqual(availableAccessories(),animalOptions.accessory);
assert.deepEqual(availableAccessories([]),starterAccessories);
assert.deepEqual(availableAccessories(['pearls','wings','tiara']),['none','wings','pearls'],'in the tray\'s order, and nothing that isn\'t an accessory');
assert.deepEqual(availableAccessories(['hat','bow']),['none','bow','hat']);
// A new doll is the usual first bear; it keeps its bow only where the home has drawn one.
assert.deepEqual(newDoll(),freshAnimal(),'no list yet: just as before');
assert.deepEqual(newDoll([]),{...freshAnimal(),accessory:[]});
assert.deepEqual(newDoll(['bow']).accessory,['bow']);
// Several at once, one in each place: every accessory has a place; a recipe may name one (older ones do) or list several.
assert.deepEqual(Object.keys(accessorySlots).sort(),animalOptions.accessory.filter(a=>a!=='none').sort(),'every accessory has a place');
assert.deepEqual(wornList('bow'),['bow']);assert.deepEqual(wornList('none'),[]);assert.deepEqual(wornList(undefined),[]);
assert.deepEqual(wornList(['wings','pearls','glasses','hat']),['hat','glasses','pearls','wings'],'in order: head, face, neck, back');
assert.deepEqual(wornList(['pumpkin','pearls','witchhat','batwings']),['witchhat','pearls','batwings','pumpkin'],'and what\'s set down by its side last');
assert.deepEqual(wornList(['pearls','scarf','tiara']),['pearls'],'one thing in each place, and nothing that isn\'t an accessory');
for(const a of [['bow'],['wreath','glasses','pearls','wings'],[],'hat','none'])assert.ok(validAnimal({...freshAnimal(),accessory:a}),JSON.stringify(a));
assert.ok(validAnimal({...freshAnimal(),accessory:['witchhat','glasses','pearls','batwings','pumpkin']}),'all of Halloween at once');
for(const a of [['bow','scarf'],['none'],['tiara'],['hat','hat']])assert.equal(validAnimal({...freshAnimal(),accessory:a}),false,JSON.stringify(a));
// Tapping in the tray: on, off, swapped within its place, and 'none' takes everything off.
assert.deepEqual(wearToggle('bow','hat'),['hat','bow']);
assert.deepEqual(wearToggle(['hat','bow'],'pearls'),['hat','pearls'],'pearls go where the bow was');
assert.deepEqual(wearToggle(['hat','pearls'],'hat'),['pearls'],'tapping it again takes it off');
assert.deepEqual(wearToggle(['wreath','glasses','pearls'],'none'),[]);
assert.deepEqual(wearToggle(['witchhat','pumpkin'],'xmashat'),['xmashat','pumpkin'],'the Christmas hat goes where the witch hat was');
assert.ok(validAnimal(newDoll([])));
// A new home starts with only the bear, and the bear is never locked.
assert.deepEqual(starterSpecies,['bear']);assert.ok(!lockedSpecies.has('bear'));
// The dragon is made but not out yet; everything else is.
assert.deepEqual([...lockedSpecies],['dragon']);
// A panda is black and white, and you can tell.
assert.notEqual(speciesLooks.panda.fur,speciesLooks.panda.patch);
// Colours and a name she already changed are kept when she picks another kind.
const mine={...freshAnimal(),name:'团子',fur:'#cf9fae'};
const kept=switchSpecies(mine,'panda');
assert.equal(kept.fur,undefined,'her pink stays pink');assert.equal(kept.name,undefined,'and her name stays');
assert.equal(kept.patch,speciesLooks.panda.patch,'the markings she never touched turn panda black');
assert.deepEqual(switchSpecies(mine,'mouse'),{},'no kind, no change');

// Bad data is turned away.
assert.equal(validAnimal(null),false);
assert.equal(validAnimal({...freshAnimal(),kind:'bouquet'}),false,'not a doll');
assert.equal(validAnimal({...freshAnimal(),species:'mouse'}),false,'no mice, anywhere');
assert.ok(!animalOptions.species.includes('mouse'));
assert.equal(validAnimal({...freshAnimal(),pose:'cartwheel'}),false,'unknown pose');
assert.equal(validAnimal({...freshAnimal(),accessory:'crown'}),false,'unknown accessory');
assert.equal(validAnimal({...freshAnimal(),fur:'blue'}),false,'a colour has to be a colour');
assert.equal(validAnimal({...freshAnimal(),accent:'#12345'}),false,'and a whole one');
// Ears that belong to another kind are put right, a broken markings colour too.
assert.equal(normalizeAnimal({...freshAnimal(),species:'fox',ears:'rabbit'}).ears,'fox');
assert.equal(normalizeAnimal({...freshAnimal(),species:'panda',patch:'black'}).patch,speciesLooks.panda.patch);
// Only real accessories count: names every object happens to have do not.
assert.deepEqual(wornList(['constructor','toString','__proto__','hasOwnProperty','valueOf']),[]);
assert.equal(validAnimal({...freshAnimal(),kind:'animal',name:'x',accessory:['constructor']}),false);
assert.equal(validAnimal({...freshAnimal(),kind:'animal',name:'x',accessory:'toString'}),false);
