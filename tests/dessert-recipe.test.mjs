import assert from 'node:assert/strict';
import {ROLES} from '../src/brick-recipe.js';
import {DESSERT_OPTIONS,DESSERT_LABELS,DESSERT_TONES,toneLabel,freshDessert,normalizeDessert,dessertProblems,validDessert,dessertRecipe,sameDessert,makerLabel,tagNote,learnedLabel,localDay,dayLabel,isDay,dessertStarters,NAME_MAX,NOTE_MAX,BAKES,BAKE_WORDS,bakeOf,HAND_MAX,handOf,BASIC_BASES,availableBases,burstOf,PUFFS} from '../src/dessert-recipe.js';

// A fresh dessert and every starter are proper recipes.
assert.deepEqual(dessertProblems(freshDessert()),[],'a fresh dessert is fine');
for(const [key,s] of Object.entries(dessertStarters))assert.deepEqual(dessertProblems(s.recipe()),[],`starter ${key} is fine`);
assert.deepEqual(new Set(Object.values(dessertStarters).map(s=>s.recipe().base)),new Set(DESSERT_OPTIONS.base),'there is a starter of every kind');
// Every option has words on its button, and every tone a name for every kind.
for(const [k,list] of Object.entries(DESSERT_OPTIONS))for(const v of list)assert.ok(DESSERT_LABELS[k][v],`${k} ${v} has a label`);
for(const base of DESSERT_OPTIONS.base)for(const t of DESSERT_TONES)assert.ok(toneLabel(t,base),`${t} on ${base} has a name`);

// Missing pieces are filled in; what's there is kept, place in the house too.
const old={kind:'dessert',name:'旧草稿',base:'tart',c:{body:'wood'},id:'x1',location:'bag',slot:0};
const n=normalizeDessert(old);
assert.equal(n.base,'tart');assert.equal(n.c.body,'wood');assert.equal(n.c.cream,freshDessert().c.cream,'a missing colour comes from a fresh dessert');
assert.equal(n.cream,'rosette');assert.equal(n.note,'');assert.equal(n.location,'bag');assert.equal(n.id,'x1');
assert.ok(validDessert(old),'an old draft with gaps is still a dessert');

// Anything not on the table is turned away.
const bad=delta=>({...freshDessert(),...delta});
assert.ok(!validDessert(null));assert.ok(!validDessert({...freshDessert(),kind:'build'}));
assert.ok(!validDessert(bad({base:'pie'})),'an unknown kind');
assert.ok(!validDessert(bad({cream:'spray'})));assert.ok(!validDessert(bad({fruit:'kiwi'})));assert.ok(!validDessert(bad({sprinkles:'gold leaf'})));assert.ok(!validDessert(bad({plate:'bowl'})));
assert.ok(!validDessert(bad({c:{...freshDessert().c,body:'#ff0000'}})),'a colour code is not a colour role');
assert.ok(!validDessert(bad({c:{...freshDessert().c,glaze:'rose'}})),'nor is a colour for something that isn\'t there');
for(const role of Object.keys(ROLES))assert.ok(validDessert(bad({c:{body:role,cream:role,sprinkles:role,plate:role}})),`${role} is a colour`);
assert.ok(!validDessert(bad({name:'  '})),'it needs a name');
assert.ok(!validDessert(bad({name:'甜'.repeat(NAME_MAX+1)})));assert.ok(validDessert(bad({name:'甜'.repeat(NAME_MAX)})));
assert.ok(!validDessert(bad({note:'话'.repeat(NOTE_MAX+1)})),'the words on the tag are short');assert.ok(validDessert(bad({note:'话'.repeat(NOTE_MAX)})));
assert.ok(validDessert(bad({by:{kind:'self'},madeOn:'2026-10-23'})));
assert.ok(validDessert(bad({by:{kind:'machine',name:'Birch'}})),'the home\'s machine can make one');
assert.ok(validDessert(bad({by:{kind:'guest',name:'邻居'}})));
assert.ok(!validDessert(bad({by:{kind:'guest'}})),'a neighbour\'s dessert says who');
assert.ok(!validDessert(bad({by:{kind:'stranger',name:'x'}})));
assert.ok(!validDessert(bad({madeOn:'yesterday'})));assert.ok(!validDessert(bad({madeOn:'2026-13-40'})));
assert.ok(dessertProblems(bad({base:'pie',name:''})).length>=2,'every problem is named');

// The recipe is only the recipe: nothing personal, nothing that isn't a word
// from the lists, however much else came with it.
const gift={...freshDessert(),note:'给你的',by:{kind:'guest',name:'邻居'},madeOn:'2026-10-20',id:'g1',location:'dome',image:'data:image/png;base64,AAAA',url:'https://example.com'};
const r=dessertRecipe(gift);
assert.deepEqual(Object.keys(r).sort(),['base','c','cream','fruit','kind','name','plate','sprinkles','v']);
assert.deepEqual(Object.keys(r.c).sort(),[...DESSERT_TONES].sort());
assert.ok(validDessert(r));

// How long it was baked: only pale or browned is written down, golden is the
// plain recipe; anything else is turned away.
for(const b of BAKES)assert.ok(validDessert(bad({bake:b})),`baked ${b}`);
assert.ok(!validDessert(bad({bake:'raw'})),'an unknown bake');assert.ok(!validDessert(bad({bake:'golden'})),'golden is written as nothing');
assert.equal(dessertRecipe(bad({bake:'deep'})).bake,'deep','the bake travels with the recipe');
assert.ok(!('bake' in dessertRecipe(freshDessert())),'a plain recipe says nothing about baking');
assert.equal(bakeOf(freshDessert()),'golden');assert.equal(bakeOf(bad({bake:'light'})),'light');
for(const b of [...BAKES,'golden'])assert.ok(BAKE_WORDS[b],`${b} has words`);
assert.ok(sameDessert(freshDessert(),bad({bake:'deep'})),'how long one was baked is a trace, not another recipe');
assert.ok(validDessert(bad({bake:'burnt'})),'burnt is allowed, and kept');

// Where the hands put things: short lists of spots, kept with the recipe.
const hand={cream:[[0,7],[4,7],[8,7]],fruit:[[2,3]],sprinkles:[[31,10]]};
assert.ok(validDessert(bad({hand})),'marks from making it by hand');
assert.deepEqual(dessertRecipe(bad({hand})).hand,hand,'they travel with the recipe');
assert.ok(!('hand' in dessertRecipe(bad({hand:{cream:[]}}))),'an empty list is nothing to keep');
assert.ok(sameDessert(freshDessert(),bad({hand})),'and they don\'t make it another dessert');
for(const wrong of [{cream:[[32,1]]},{cream:[[0,11]]},{cream:[[1.5,2]]},{cream:[[1]]},{glaze:[[1,1]]},{fruit:Array.from({length:HAND_MAX.fruit+1},()=>[0,0])},[[0,0]],'x'])assert.ok(!validDessert(bad({hand:wrong})),`refuses ${JSON.stringify(wrong).slice(0,40)}`);
assert.equal(handOf(bad({hand:{cream:[[0,7]],sneaky:'x'}})).sneaky,undefined,'only the known lists are taken');

// The same dessert by any name.
assert.ok(sameDessert(freshDessert(),{...freshDessert(),name:'别的名字',note:'x'}));
assert.ok(!sameDessert(freshDessert(),{...freshDessert(),fruit:'cherry'}));
assert.ok(!sameDessert(freshDessert(),{...freshDessert(),c:{...freshDessert().c,plate:'rose'}}));

// The tag's words.
assert.equal(makerLabel(undefined),'自己做的');assert.equal(makerLabel({kind:'self'}),'自己做的');
assert.equal(makerLabel({kind:'machine',name:'Birch'}),'Birch 做的');assert.equal(makerLabel({kind:'guest',name:'小葵'}),'小葵做的');
// The tag's words: its own; else, made by an AI living here, the line it sent with it.
assert.equal(tagNote({note:' 趁热吃 ',by:{kind:'machine',name:'Birch',note:'想你了'}}),'趁热吃');assert.equal(tagNote({note:'',by:{kind:'machine',name:'Birch',note:'想你了'}}),'想你了');
assert.equal(tagNote({by:{kind:'guest',name:'小葵',note:'x'}}),'');assert.equal(tagNote(undefined),'');
assert.equal(learnedLabel('Birch'),'跟 Birch 学的');assert.equal(learnedLabel('小葵'),'跟小葵学的');

// Days.
assert.equal(localDay(new Date(2026,9,3,23,30)),'2026-10-03');assert.ok(isDay(localDay()));
assert.equal(dayLabel('2026-10-23'),'10 月 23 日');assert.equal(dayLabel('nope'),'');

// Which kinds a kitchen can make: every kind until it keeps a list of what it
// has learned; with a list, the basic four and what is on it.
assert.deepEqual(availableBases(),DESSERT_OPTIONS.base,'no list yet: every kind');
assert.deepEqual(availableBases([]),BASIC_BASES,'nothing learned: the basic four');
assert.deepEqual(availableBases(['puff']),[...BASIC_BASES,'puff'],'a learned kind joins them');
assert.ok(BASIC_BASES.every(b=>DESSERT_OPTIONS.base.includes(b))&&!BASIC_BASES.includes('puff'),'cream puffs are a craft to learn');

// Cream puffs filled till they ran over: which ones, kept with the recipe.
const puff=delta=>({...dessertStarters.berryPuff.recipe(),...delta});
assert.ok(validDessert(puff({burst:[0,2]})));assert.ok(validDessert(puff({burst:[]})));
assert.deepEqual(burstOf(puff({burst:[3,1]})),[1,3],'kept in order');
assert.equal(burstOf(puff({burst:[]})),null,'none ran over: nothing to keep');
assert.deepEqual(dessertRecipe(puff({burst:[2]})).burst,[2],'the recipe keeps it');
assert.equal(dessertRecipe(puff({})).burst,undefined);
for(const bad of [[PUFFS],[1,1],[-1],['0'],'0',[0,1,2,3,0]])assert.ok(!validDessert(puff({burst:bad})),`burst ${JSON.stringify(bad)} is turned away`);
assert.ok(!validDessert({...freshDessert(),burst:[0]}),'only cream puffs run over');
assert.ok(sameDessert(puff({burst:[0,1]}),puff({})),'the same puffs, however full they were filled');
