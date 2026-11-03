import assert from 'node:assert/strict';
import * as THREE from 'three';
import {KINDS,kindOf,stepsFor,bakeLevel,BURNING,markAt,markPoint,addMark,enoughFor,riseAt,DECO,TURNTABLE_TOP} from '../src/dessert-motion.js';
import {DESSERT_OPTIONS,BAKES,HAND_MAX,freshDessert,validDessert} from '../src/dessert-recipe.js';

// Every kind on the dessert table has its line, and every line says the same things.
for(const base of DESSERT_OPTIONS.base){
  const k=KINDS[base];
  assert.ok(k,`${base} has a line`);
  assert.ok(Number.isInteger(k.eggs)&&k.eggs>=0,`${base}: how many eggs`);
  assert.ok(['flip','lift'].includes(k.out),`${base}: turned out or lifted out`);
  assert.ok(['spatula','jug','bag','nozzle'].includes(k.tool),`${base}: a tool to finish it`);
  assert.ok(k.fit>0&&(k.tall===undefined||k.tall>=k.fit),`${base}: how much the tin grows`);
  assert.ok(k.finish&&k.finishHint&&/^#[0-9a-f]{6}$/.test(k.raw),`${base}: words and a batter colour`);
}
assert.equal(kindOf({base:'nope'}),KINDS.cake,'anything unknown is made like a cake');

// The steps: the same for every kind, with piping, fruit and sprinkles only when it has them.
const d=delta=>({...freshDessert(),...delta});
assert.deepEqual(stepsFor(d({cream:'rosette',fruit:'strawberry',sprinkles:'hearts'})).map(s=>s[0]),['egg','whisk','bake','unmold','frost','pipe','fruit','sprinkle']);
assert.deepEqual(stepsFor(d({cream:'none',fruit:'none',sprinkles:'none'})).map(s=>s[0]),['egg','whisk','bake','unmold','frost']);
assert.equal(stepsFor(d({base:'pudding'}))[4][1],'淋焦糖','the finishing step is called what that kind needs');
assert.equal(stepsFor(d({base:'puff'}))[4][1],'灌馅','cream puffs are filled');
assert.equal(stepsFor(d({base:'puff'})).filter(s=>s[0]==='egg').length,1,'one egg step, however many eggs');

// Rising: from what goes in to how it comes out, and no further; puffs grow sideways too.
for(const base of DESSERT_OPTIONS.base){const a=riseAt(base,0),b=riseAt(base,4.5),c=riseAt(base,60);assert.ok(a.y<=b.y&&b.y===c.y&&b.w===c.w,`${base} rises and stops`);}
assert.ok(riseAt('puff',10).w>1.3&&riseAt('cake',10).w===1,'only the puffs spread');

// Baking: pale, golden, deep, then burnt, and every one is a kept bake.
assert.deepEqual([1,5,9,BURNING+.5].map(bakeLevel),['light','golden','deep','burnt']);
for(const s of [0,3,6,8,10,20]){const b=bakeLevel(s);assert.ok(b==='golden'||BAKES.includes(b),`${s}s is a bake the recipe knows`);}

// A spot on the top becomes a mark and back, for a cake and for the turned top macaron.
for(const base of ['cake','macaron']){
  const top=base==='cake'?{p:[0,.59,0],turn:0,R:.66}:{p:[.02,1.24,-.18],turn:.4,R:.26};
  for(const mark of [[0,0],[3,5],[17,10],[31,7]]){
    const back=markAt(markPoint(mark,top),top);
    if(mark[1])assert.deepEqual(back,mark,`${base} ${mark} goes there and back`);else assert.equal(back[1],0);
  }
  const far=markAt(new THREE.Vector3(DECO.x+top.p[0]+5,TURNTABLE_TOP+top.p[1],DECO.z+top.p[2]),top);
  assert.equal(far[1],10,'past the edge comes in to the edge');
}

// Marks: no two on the same spot, and no more than a layer can hold.
let list=[];
for(let i=0;i<HAND_MAX.cream+20;i++)list=addMark(list,[i%32,i%11],'cream');
assert.equal(list.length,HAND_MAX.cream);
assert.equal(addMark([[1,1]],[1,1],'fruit').length,1,'a spot already taken');
assert.ok(validDessert(d({hand:{cream:list}})),'whatever was placed is a dessert');

// How many make a layer: what the usual layout has.
assert.equal(enoughFor(d({cream:'rosette'}),'cream'),8);assert.equal(enoughFor(d({cream:'swirl'}),'cream'),1);
assert.equal(enoughFor(d({base:'pudding',fruit:'cherry'}),'fruit'),1);assert.equal(enoughFor(d({}),'sprinkles'),5);
for(const base of DESSERT_OPTIONS.base)for(const cream of DESSERT_OPTIONS.cream.filter(c=>c!=='none'))assert.ok(enoughFor(d({base,cream}),'cream')<=HAND_MAX.cream,`${base} ${cream} fits`);
