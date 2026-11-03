import assert from 'node:assert/strict';
import {FLOORS,floorPieces,wallPieces,restingPieces,extent,rangeFor,roomPoint,moveBy,turnBy,moveResting,turnOf,placeAt,overlapsFor,overlapDepth} from '../src/furniture-range.js';
import {downstairsObstacles,upstairsObstacles} from '../src/resident-navigation.js';

const near=(a,b,msg,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${msg}: ${a} vs ${b}`);
const ids=Object.keys(floorPieces);

// 1. Frames: every piece lands in the room exactly where the residents think it
// stands, for odd offsets and turns too. That pins the living/kitchen frames, the
// upstairs spots and the study's quarter-turned group.
const furniture={};
ids.forEach((id,i)=>{furniture[id]={position:[(i%5-2)*.37,.4,(i%3-1)*.53],rotationY:i*.3-1};});
const seen=new Set();
for(const o of [...downstairsObstacles(furniture),...upstairsObstacles(furniture,'bedroom'),...upstairsObstacles(furniture,'study')]){
 if(!floorPieces[o.id])continue;seen.add(o.id);
 const [X,Z]=roomPoint(o.id,furniture[o.id]),s=floorPieces[o.id];
 near(X,o.x,`${o.id} x`);near(Z,o.z,`${o.id} z`);
 near(s.a0+s.frame.turn+furniture[o.id].rotationY,o.angle,`${o.id} angle`);
 // The vanity's footprint takes in the stool in front of it; the rest match exactly.
 if(o.id!=='bedroomVanity'){near(s.w,o.w,`${o.id} width`);near(s.d,o.d,`${o.id} depth`);}
}
for(const id of ['sofa','tvUnit','lamp','sinkRun','island','diningTable','diningChair3','bedroomBed','bedroomChair','bedroomVanity','studyDesk','studyShelf','studyReading','studyCraft'])assert.ok(seen.has(id),`${id} was compared with the residents' map`);

// 2. Stored points survive the trip into the room and back, height included.
for(const id of ids){const item=furniture[id],[X,Z]=roomPoint(id,item),back=floorPieces[id].frame.fromRoom(X,Z,item.position);back.forEach((v,k)=>near(v,item.position[k],`${id} round trip ${k}`));}

// 3. Defaults (the house as it comes) sit inside, or within a hand's width of,
// what the floor allows. A wrong frame or footprint would put them metres off.
const defaults={rug:[[-2.15,.015,-.48],0],sofa:[[-.62,.43,-.45],-Math.PI/2],coffeeTable:[[-2.4,.34,-.48],Math.PI/2],armchair:[[-2.28,.38,-2.16],.62],tvUnit:[[-3.88,.34,-.55],Math.PI/2],lamp:[[-3.35,0,-3.6],-Math.PI/4],floorPlant:[[-3.62,.03,-2.48],-.18],
 sinkRun:[[.9,0,-2.43],0],stove:[[2.77,0,-.78],0],cornerCabinet:[[2.77,0,-1.6],0],prepCabinet:[[2.77,0,.04],0],refrigerator:[[3.24,0,.78],0],island:[[.8,0,.18],0],stoolLeft:[[.25,0,1.05],0],stoolRight:[[1.14,0,1.05],0],
 diningTable:[[-.9,0,-2.05],0],diningChair1:[[-1.78,0,-2.05],Math.PI/2],diningChair2:[[-.02,0,-2.05],-Math.PI/2],diningChair3:[[-.9,0,-1.24],0]};
const home=id=>{const [position,rotationY]=defaults[id]||[[0,0,0],0];return {position,rotationY};};
for(const id of ids){
 const h=home(id),[X,Z]=roomPoint(id,h),bare=rangeFor(id,h.rotationY),r=rangeFor(id,h.rotationY,h);
 const out=Math.max(bare.minX-X,X-bare.maxX,bare.minZ-Z,Z-bare.maxZ,0);
 assert.ok(out<.35,`${id} default is ${out.toFixed(2)} outside what its floor allows`);
 assert.ok(X>=r.minX&&X<=r.maxX&&Z>=r.minZ&&Z<=r.maxZ,`${id} can always go back to its own default spot`);
 assert.ok(bare.minX<bare.maxX&&bare.minZ<bare.maxZ,`${id} has room to move`);
}

// 4. The arrows mean the same room direction for every piece, the study's
// quarter-turned desk included, and a piece pushed far stops with its footprint
// on the floor.
for(const id of ids){
 const h=home(id),[X0,Z0]=roomPoint(id,h);
 const right=roomPoint(id,moveBy(id,h,.25,0,h)),back=roomPoint(id,moveBy(id,h,0,-.25,h));
 assert.ok(right[0]>X0-1e-9&&Math.abs(right[1]-Z0)<.006,`${id}: right moves along room x only`);
 assert.ok(back[1]<Z0+1e-9&&Math.abs(back[0]-X0)<.006,`${id}: up moves back along room z only`);
 let far=h;for(let k=0;k<60;k++)far=moveBy(id,far,.25,.25,h);
 const [X,Z]=roomPoint(id,far),e=extent(id,h.rotationY),f=FLOORS[floorPieces[id].zone];
 // ...or, for the few whose default spot already brushes an edge, no further out than that.
 assert.ok(X<=Math.max(f.maxX-e.hx-e.ox,X0)+.006&&Z<=Math.max(f.maxZ-e.hz-e.oz,Z0)+.006,`${id}: pushed to the far corner it still stands on the floor`);
}
const desk=moveBy('studyDesk',home('studyDesk'),.25,0,home('studyDesk'));
assert.deepEqual(desk.position,[0,0,.25],'the study desk\'s "right" is the room\'s right, which is its own z');

// 5. The lamp in its corner and the old stopping line.
assert.ok(rangeFor('lamp',0).maxX>.65-1+1,'the lamp can go well past where the living room used to stop it (living x .65)');
assert.ok(rangeFor('sofa',-Math.PI/2).minX>FLOORS.living.minX,'the sofa no longer goes into the left wall');

// 6. An older save standing outside its range is never jerked back: it can come
// in, not go further out, and moving along the wall leaves it at the wall.
const pushed={position:[-4.3,.34,-.55],rotationY:Math.PI/2};
const along=moveBy('tvUnit',pushed,0,.25,home('tvUnit'));
assert.deepEqual(along.position,[-4.3,.34,-.3],'sliding along the wall keeps an out-of-range x where it was');
assert.deepEqual(moveBy('tvUnit',pushed,-.25,0,home('tvUnit')).position,[-4.3,.34,-.55],'it does not go further into the wall');
assert.ok(moveBy('tvUnit',pushed,.25,0,home('tvUnit')).position[0]>-4.3,'it can come back out');

// 7. Turning near a wall steps the piece in; turned back the default way, it can
// return to its own default spot against the wall.
const tv=home('tvUnit'),turned=turnBy('tvUnit',tv,Math.PI/4,tv);
assert.ok(roomPoint('tvUnit',turned)[0]>roomPoint('tvUnit',tv)[0]+.3,'the turned TV unit steps away from the wall');
let back=turned;for(let k=0;k<7;k++)back=turnBy('tvUnit',back,Math.PI/4,tv);
for(let k=0;k<12;k++)back=moveBy('tvUnit',back,-.25,0,tv);
near(roomPoint('tvUnit',back)[0],roomPoint('tvUnit',tv)[0],'turned all the way round, it goes back against the wall',.006);

// 8. Tapping the floor sends a piece there, held inside its range; something
// too big for the room is refused rather than wedged.
const sent=placeAt('armchair',home('armchair'),.9,-1.5,home('armchair'));
assert.ok(roomPoint('armchair',sent)[0]<=rangeFor('armchair',.62).maxX+1e-9,'a tap past the edge stops at the edge');
floorPieces.hugeTest={...floorPieces.sofa,w:30};
assert.equal(placeAt('hugeTest',{position:[0,0,0],rotationY:0},0,0),null,'too big for the room: not placed');
assert.deepEqual(moveBy('hugeTest',{position:[0,0,0],rotationY:0},.25,0).position,[0,0,0],'and the remote cannot push it along the axis it doesn\'t fit');
delete floorPieces.hugeTest;
assert.equal(moveBy('coffeeMug',{position:[0,0,0]},.25,0),null,'pieces that are not floor pieces are left to the old rules');

// 9. Overlaps are shown, never blocked. The house as it comes shows none: pairs
// that already overlap there (chairs tucked under the table) are meant to. Rugs
// are things to stand on.
const fresh=Object.fromEntries(ids.map(id=>[id,home(id)]));
for(const id of ids)assert.deepEqual(overlapsFor(id,fresh,fresh),[],`${id} shows no overlap in the house as it comes`);
const through={...fresh,sofa:moveBy('sofa',fresh.sofa,-1.5,0,fresh.sofa)};
assert.ok(overlapsFor('sofa',through,fresh).includes('coffeeTable'),'the sofa pushed into the coffee table shows it');
assert.ok(overlapsFor('coffeeTable',through,fresh).includes('sofa'),'and the coffee table shows the sofa');
const nudged={...fresh,diningChair1:moveBy('diningChair1',fresh.diningChair1,.1,0,fresh.diningChair1)};
assert.deepEqual(overlapsFor('diningChair1',nudged,fresh),[],'a chair tucked a little further under its table is not flagged');
assert.deepEqual(overlapsFor('rug',through,fresh),[],'rugs never show overlaps');
const jammed={...fresh,lamp:{position:[-.3,0,0],rotationY:0}};
assert.ok(overlapsFor('lamp',jammed,fresh).includes('sofa'),'the lamp pushed into the back of the sofa shows it');
assert.deepEqual(overlapsFor('lamp',{...fresh,lamp:{position:[.65,0,0],rotationY:0}},fresh),[],'standing half a metre behind the sofa (only hiding it from the camera) is not an overlap');
assert.ok(overlapDepth('sofa',fresh.sofa,'coffeeTable',fresh.coffeeTable)<0,'the sofa and coffee table stand apart as they come');
assert.ok(!overlapsFor('sofa',through,fresh,id=>id!=='coffeeTable').includes('coffeeTable'),'pieces the view hides are left out');

// 10. Wall pieces stay on their wall, things on top stay on top, and both can stay
// where they hang or sit now (offset 0, or the kitchen cabinets' own spots).
const startAt={upperLeft:[1.22,1.62],upperRight:[2.02,1.62]};
for(const [id,v] of Object.entries(wallPieces)){
 const [a,b]=startAt[id]||[0,0],[min,max,minY,maxY]=v.bounds;
 assert.ok(min<=a&&a<=max&&minY<=b&&b<=maxY,`${id} may stay where it hangs`);
 assert.ok(['backWall','sideWall'].includes(v.placement),`${id} slides along a wall`);
}
// Things on top keep their spot on the piece under them (the coffee table's are
// set out along it; the rest start at offset 0) and nudge five centimetres.
const restingStart={coffeeTray:[-.45,0],coffeeMug:[-.11,.01],greenBook:[.4,.02],roseBook:[.56,0]};
for(const [id,v] of Object.entries(restingPieces)){
 const [x0,x1,z0,z1]=v.bounds,[x,z]=restingStart[id]||[0,0];
 assert.ok(x0<=x&&x<=x1&&z0<=z&&z<=z1&&v.step===.05,`${id} nudges a little and may stay where it sits`);
 assert.ok(floorPieces[v.on]||restingPieces[v.on],`${id} sits on a piece that moves`);
}
// The remote's arrows mean the room's directions, however the piece below is turned.
const onTable={coffeeTable:{position:[-2.4,.34,-.48],rotationY:Math.PI/2},coffeeTray:{position:[-.45,.17,0],rotationY:0,on:'coffeeTable'},coffeeMug:{position:[-.11,.09,.01],rotationY:0,on:'coffeeTray'}};
const same3=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-9);
assert.ok(same3(moveResting('coffeeTray',onTable.coffeeTray,.05,0,onTable).position,[-.45,.17,.05]),'right in the room is along the turned table');
assert.ok(same3(moveResting('coffeeTray',onTable.coffeeTray,0,.05,onTable).position,[-.5,.17,0]),'towards the front is along it the other way');
assert.ok(same3(moveResting('coffeeMug',onTable.coffeeMug,.05,0,{...onTable,coffeeTray:{...onTable.coffeeTray,rotationY:Math.PI/2}}).position,[-.16,.09,.01]),'and through a turned tray too');
assert.equal(turnOf('coffeeMug',onTable),Math.PI/2);
const edge={...onTable.coffeeTray,position:[.65,.17,0]};
assert.ok(same3(moveResting('coffeeTray',edge,0,-.05,onTable).position,[.65,.17,0]),'it stops at the edge of the top');
assert.ok(same3(moveResting('coffeeTray',{...edge,position:[.9,.17,0]},0,.05,onTable).position,[.85,.17,0]),'one already past the edge may come back in');
console.log(`Furniture ranges: ${ids.length} floor pieces follow their floors and the residents' map; walls and tabletops keep theirs.`);

// 11. Furniture-sized builds standing on the floor follow the same rules.
{
 const {builtPiece,builtPieces,builtOverlaps,buildSize}=await import('../src/furniture-range.js');
 const {starters}=await import('../src/brick-recipe.js');
 const chair={...starters.chair.recipe(),id:'c1',location:'room',floor:'1F',position:[0,.012,0],rotationY:0,support:null};
 const spec=builtPiece(chair,'downstairs'),size=buildSize(chair);
 assert.ok(spec&&Math.abs(spec.w-size.w)<1e-9&&Math.abs(spec.d-size.d)<1e-9,'a built chair on the floor has its recipe\'s footprint');
 assert.equal(builtPiece({...chair,scale:'small'},'downstairs'),null,'small builds are ornaments, not furniture');
 assert.equal(builtPiece({...chair,support:'coffeeTable'},'downstairs'),null,'on a table it rides the table instead');
 assert.equal(builtPiece({...chair,position:[0,.6,0]},'downstairs'),null,'up on something it is not standing on the floor');
 // Kept inside the floor like furniture: sent into the wall, it stops at it.
 const far=placeAt(spec,chair,-9,0);
 assert.ok(Math.abs(far.position[0]-(FLOORS.downstairs.minX+spec.w/2))<.011,'stops with its edge at the wall');
 const turnedIn=turnBy(spec,{...chair,position:[FLOORS.downstairs.minX+spec.w/2,.012,0]},Math.PI/4);
 assert.ok(turnedIn.position[0]>FLOORS.downstairs.minX+spec.w/2,'turning against the wall steps it in');
 // Overlaps both ways: a build set down on the sofa, and the sofa moved onto a build.
 const sofaRoom=roomPoint('sofa',fresh.sofa),onSofa={...chair,position:[sofaRoom[0],.012,sofaRoom[1]]};
 const [entry]=builtPieces([onSofa],'1F','overview');
 assert.ok(builtOverlaps(entry,fresh).includes('sofa'),'standing on the sofa shows red');
 assert.ok(overlapsFor('sofa',fresh,fresh,()=>true,.08,[entry]).includes(entry.id),'and the sofa shows the build');
 assert.deepEqual(builtOverlaps({...entry,item:{...onSofa,position:[3.9,.012,2.9]}},fresh,()=>true,[entry]),[],'out in a free corner, nothing');
 assert.deepEqual(builtPieces([{...onSofa,floor:'2F',room:'study'}],'1F','overview'),[],'only the builds on this floor');
}
console.log('Built furniture: footprints from recipes, kept in the room, red where they stand on something.');

// 12. Builds hanging on a wall: back against it, kept on it, slid along it.
{
 const {hangOn,nudgeHung,HANGING,buildSize}=await import('../src/furniture-range.js');
 const {starters}=await import('../src/brick-recipe.js');
 const win={...starters.window.recipe(),id:'w1'},size=buildSize(win);
 const back=hangOn('back',size,[0,2,-3.9]);
 assert.ok(Math.abs(back.position[2]-(FLOORS.downstairs.minZ+size.d/2))<.011&&back.rotationY===0,'its back against the back wall, facing the room');
 assert.ok(Math.abs(back.position[1]-(2-size.h/2))<.011,'its middle where it was tapped');
 const left=hangOn('left',size,[-5.1,2,1]);
 assert.ok(Math.abs(left.position[0]-(FLOORS.downstairs.minX+size.d/2))<.011&&Math.abs(left.rotationY-Math.PI/2)<1e-9,'on the left wall it faces across the room');
 const high=hangOn('back',size,[0,9,-3.9]),low=hangOn('back',size,[0,-2,-3.9]);
 assert.ok(high.position[1]+size.h<=HANGING.maxY+1e-9&&low.position[1]>=HANGING.minY-1e-9,'kept between the skirting and the cornice');
 const corner=hangOn('back',size,[-9,2,-3.9]);
 assert.ok(corner.position[0]-size.w/2>=FLOORS.downstairs.minX-.011,'and between the corners');
 const right=nudgeHung({...back,position:back.position},size,.05,0),up=nudgeHung({...back},size,0,-.05);
 assert.ok(Math.abs(right.position[0]-back.position[0]-.05)<1e-9&&Math.abs(up.position[1]-back.position[1]-.05)<1e-9,'the remote slides it along and up');
 const along=nudgeHung({...left},size,.05,0);
 assert.ok(Math.abs(along.position[2]-left.position[2]+.05)<1e-9,'on the left wall, right is towards the back corner');
 assert.equal(hangOn('ceiling',size,[0,2,0]),null);
}
console.log('Hanging builds: back to the wall, kept on it.');
