import assert from 'node:assert/strict';
import {BASE,MAX_PARTS,PARTS,ROLES,SCALES,footprint,mirrored,expand,normalizePart,partProblem,placementProblem,hangingLevel,recipeProblems,validRecipe,stillHolds,freshBuild,normalizeBuild,starters} from '../src/brick-recipe.js';

const P=(id,p,x,y,z,w,d,h,more={})=>({id,p,x,y,z,w,d,h,turn:0,c:'cream',...more});
const recipe=(parts,more={})=>({...freshBuild(),name:'测试',parts,...more});

// Every starter is a valid recipe in the language.
for(const [key,s] of Object.entries(starters)){const r=s.recipe();assert.deepEqual(recipeProblems(r),[],`starter ${key} is valid`);assert.ok(r.parts.length>=5,`starter ${key} has something in it`);}
// The starters use the new parts between them.
const used=new Set(Object.values(starters).flatMap(s=>s.recipe().parts.map(p=>p.p)));
for(const p of ['lathe','curve','arch','drape'])assert.ok(used.has(p),`a starter shows off ${p}`);
assert.ok(Object.values(starters).some(s=>s.recipe().mirror),'a starter is mirrored');

// Footprints turn; a part written the other way round is turned instead.
assert.deepEqual(footprint(P('a','brick',0,0,0,1,4,3,{turn:1})),{x:0,z:0,y:0,w:4,d:1,h:3});
const arch=normalizePart(P('a','arch',2,0,2,1,4,3));
assert.deepEqual([arch.w,arch.d,arch.turn],[4,1,1],'a 1 x 4 arch becomes a 4 x 1 arch turned a quarter');
assert.deepEqual(footprint(arch),footprint(P('a','arch',2,0,2,1,4,3)),'covering the same studs');

// Mirroring across the middle of the baseplate.
const m=mirrored(P('a','slope',2,0,3,2,3,3,{turn:1}));
assert.equal(m.x,BASE-2-3,'the footprint moves across');
assert.equal(m.turn,3,'the turn runs the other way');
assert.equal(m.flip,true,'and the part flips');
const window=starters.window.recipe(),drawn=expand(window);
assert.equal(drawn.filter(p=>p.p==='arch').length,1,'an arch across the middle is drawn once');
assert.equal(drawn.filter(p=>p.p==='drape').length,2,'a curtain on one side gets its twin');
assert.equal(drawn.filter(p=>p.p==='brick').length,6,'and so do the posts');
assert.ok(drawn.every(p=>!p.mirrorOf||p.x>=8),'images land on the other half');
const onAxis=recipe([P('a','curve',7,0,7,2,2,1)],{mirror:true});
assert.match(recipeProblems(onAxis)[0],/影子/,'a curve across the middle collides with its own image');
const sideways=recipe([P('a','slope',7,0,7,2,2,3,{turn:1})],{mirror:true});
assert.ok(recipeProblems(sideways).length,'a slope facing sideways across the middle does too');
assert.deepEqual(recipeProblems(recipe([P('a','slope',7,0,7,2,2,3)],{mirror:true})),[],'facing forward it is its own image');

// One part on its own.
assert.equal(partProblem(P('a','brick',0,0,0,3,3,3)),'这种零件没有这个尺寸');
assert.equal(partProblem(P('a','plate',0,0,0,1,1,3)),'这种零件没有这个高度');
assert.equal(partProblem(P('a','brick',0,0,0,1,1,3,{c:'#ff0000'})),'颜色要从调色板里挑','no free colours, only roles');
assert.equal(partProblem(P('a','lathe',0,0,0,2,2,4)),'车削要选一种形状');
assert.equal(partProblem(P('a','lathe',0,0,0,2,2,4,{profile:'vase',mat:'chrome'})),'没有这种材质');
assert.equal(partProblem(P('a','brick',15,0,0,1,2,3,{turn:1})),'超出底板了');
assert.equal(partProblem(P('a','brick',0,28,0,1,1,3)),'太高了');
assert.equal(partProblem(P('a','brick',0,-1,0,1,1,3)),'不能低过底板');
assert.equal(partProblem(P('a','brick',.5,0,0,1,1,3)),'位置要落在凸点格子上');
for(const [id,spec] of Object.entries(PARTS))for(const [w,d] of spec.sizes)assert.equal(partProblem(P('a',id,0,0,0,w,d,spec.heights[0],{profile:'vase'})),null,`${id} ${w}x${d} is a real part`);
assert.ok(Object.keys(ROLES).length>=8,'a palette to choose from');

// Placing among others: no crossing, and holding on above or below.
const base=[P('a','brick',4,0,4,2,2,3)];
assert.equal(placementProblem(base,P('b','plate',4,0,5,2,2,1)),'这里已经有零件了');
assert.equal(placementProblem(base,P('b','plate',4,3,4,2,2,1)),null,'stacked on top');
assert.equal(placementProblem(base,P('b','plate',9,3,9,2,2,1)),'要搭在底板上，或者叠在别的零件上下','floating');
const roof=[...base,P('r','plate',4,3,3,2,4,1)];
assert.equal(placementProblem(roof,P('b','drape',4,0,6,2,1,3)),null,'hanging under an overhang holds on too');
assert.equal(placementProblem(base,{...base[0],x:5}),null,'a part does not collide with itself when moved');

// Cloth hangs from what is above it: right under a lintel between two posts.
const frame=[P('l','brick',4,0,4,1,1,3),P('l2','brick',4,3,4,1,1,3),P('r','brick',7,0,4,1,1,3),P('r2','brick',7,3,4,1,1,3),P('top','plate',4,6,4,1,4,1,{turn:1})];
const cloth=P('c','drape',5,0,4,2,1,3);
assert.equal(hangingLevel(frame,cloth,0),3,'cloth hangs right under the lintel');
assert.equal(placementProblem(frame,{...cloth,y:3}),null,'and holds on there');
assert.equal(hangingLevel(frame,{...cloth,x:10},0),null,'nothing to hang from out in the open');
assert.equal(hangingLevel(frame,{...cloth,h:9},0),null,'too long to hang clear of the floor');
assert.equal(hangingLevel(frame,{...cloth,h:6},0),0,'just long enough to stand and hang at once');

// The whole recipe.
assert.deepEqual(recipeProblems(recipe(base)),[]);
assert.match(recipeProblems(recipe([...base,P('b','brick',4,1,4,1,1,3)]))[0],/叠在了一起/);
const island=recipe([...base,P('b','plate',10,4,10,2,2,1),P('c','plate',10,5,10,2,2,1)]);
assert.match(recipeProblems(island)[0],/悬空/,'parts holding only on to each other in the air');
assert.match(recipeProblems({...recipe(base),name:'  '})[0],/名字/);
assert.match(recipeProblems(recipe([]))[0],/还没有零件/);
const many=Array.from({length:MAX_PARTS+1},(_,i)=>P('p'+i,'plate',i%16,Math.floor(i/256),Math.floor(i/16)%16,1,1,1));
assert.ok(recipeProblems(recipe(many)).some(s=>s.includes(String(MAX_PARTS))),'there is a part limit');
assert.equal(validRecipe({kind:'animal'}),false);

// Taking a part away.
const tower=recipe([P('a','brick',4,0,4,2,2,3),P('b','brick',4,3,4,2,2,3),P('c','plate',4,6,4,2,2,1)]);
assert.equal(stillHolds(tower,'a'),false,'the bottom holds up the rest');
assert.equal(stillHolds(tower,'c'),true,'the top can go');

// Old drafts and odd input settle into the current shape.
const n=normalizeBuild({parts:[P('a','arch',2,0,2,1,4,3)]});
assert.equal(n.kind,'build');assert.equal(n.mirror,false);assert.equal(n.parts[0].w,4);
// Sizes: a new build is furniture, one saved before sizes stays small, and
// nothing else is a size.
assert.equal(freshBuild().scale,'furniture');
assert.equal(normalizeBuild({parts:[]}).scale,'small','builds saved before sizes stay small');
assert.equal(normalizeBuild({scale:'furniture'}).scale,'furniture');
assert.match(recipeProblems(recipe(base,{scale:'huge'}))[0],/小摆件或者家具/);
assert.deepEqual(recipeProblems({...recipe(base),scale:undefined}),[],'a recipe without a size is fine (it is drawn small)');
for(const [key,s] of Object.entries(starters))assert.ok(SCALES[s.recipe().scale],`starter ${key} says how big it is`);
console.log('Brick recipes: starters valid, mirroring, placement and holding-on rules agree.');
