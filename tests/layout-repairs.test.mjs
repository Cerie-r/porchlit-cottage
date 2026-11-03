import assert from 'node:assert/strict';
import {movedDefaults,repairLayout,restOnSupports,nowResting} from '../src/layout-repairs.js';
import {rangeFor} from '../src/furniture-range.js';

const {from,to}=movedDefaults.wallArt;
// The window sits at x -2.45 with its curtain rod reaching 1.775 to each side;
// the picture (1.08 wide) must now clear the rod end on the right.
assert.ok(to[0]-.54>-2.45+1.775,'the picture hangs clear of the curtain rod');
assert.ok(from[0]-.54<-2.45+1.775,'the old spot really did overlap the rod');

const untouched=repairLayout({wallArt:{position:[...from],rotationY:0},sofa:{position:[1,2,3]}});
assert.deepEqual(untouched.wallArt.position,to,'a picture still on the old default follows the new one');
assert.deepEqual(untouched.sofa.position,[1,2,3],'other furniture is left alone');

const placed=repairLayout({wallArt:{position:[-3.2,2.1,-3.72],rotationY:0,color:'oak'}});
assert.deepEqual(placed.wallArt,{position:[-3.2,2.1,-3.72],rotationY:0,color:'oak'},'a picture moved by hand stays put');
assert.deepEqual(repairLayout({}),{},'missing pieces are not invented');

// The floor lamp: living-area frame, which sits at x -1, z +1.6 in the room.
// Dining chairs live in the room frame; footprints as resident-navigation has them.
const lamp=movedDefaults.lamp,room=([x,,z])=>[x-1,z+1.6];
const apart=(a,b,reach)=>Math.hypot(a[0]-b[0],a[1]-b[1])>reach;
const nearChair=[-.9,-1.24],armchair=[-3.28,-.56];
assert.ok(!apart(room(lamp.from),nearChair,.55/2+.5/2),'the old spot really did stand on the near dining chair');
for(const chair of [[-1.78,-2.05],[-.02,-2.05],nearChair])assert.ok(apart(room(lamp.to),chair,1),'the new spot is well clear of the dining chairs');
assert.ok(apart(room(lamp.to),armchair,.55/2+Math.hypot(1.1,.85)/2),'the new spot stands behind the armchair, not in it');
const r=rangeFor('lamp',lamp.toRotationY),[X,Z]=room(lamp.to);
assert.ok(X>=r.minX&&X<=r.maxX&&Z>=r.minZ&&Z<=r.maxZ,'the new default lies inside the lamp\'s own range, so the remote never snaps it');
assert.ok(r.maxX>room([.65+1,0,0])[0],'the lamp can be pushed well past where it used to stop on the right');

const fresh=repairLayout({lamp:{position:[...lamp.from],rotationY:0}});
assert.deepEqual(fresh.lamp,{position:lamp.to,rotationY:lamp.toRotationY},'a lamp still on its old default moves and turns');
const turned=repairLayout({lamp:{position:[...lamp.from],rotationY:Math.PI/4}});
assert.deepEqual(turned.lamp,{position:lamp.from,rotationY:Math.PI/4},'a lamp turned by hand stays put');
const moved=repairLayout({lamp:{position:[.65,0,0],rotationY:0}});
assert.deepEqual(moved.lamp,{position:[.65,0,0],rotationY:0},'a lamp moved by hand stays put');
// The coffee table's tray, cup and books, and the vanity's little figure, now keep
// their spot on the piece under them. An older save says where they stood in the
// room; turned over, everything must stand exactly where it stood.
const oldDefaults={coffeeTable:{position:[-2.4,.34,-.48],rotationY:Math.PI/2},coffeeTray:{position:[-2.4,.51,-.03],rotationY:Math.PI/2},coffeeMug:{position:[-2.39,.6,.08],rotationY:Math.PI/2},greenBook:{position:[-2.38,.52,-.88],rotationY:.18+Math.PI/2},roseBook:{position:[-2.4,.59,-1.04],rotationY:-.08+Math.PI/2},bedroomVanity:{position:[0,0,0],rotationY:0},bedroomFigure:{position:[0,0,0],rotationY:0}};
const newDefaults={coffeeTray:{position:[-.45,.17,0],rotationY:0,on:'coffeeTable'},coffeeMug:{position:[-.11,.09,.01],rotationY:0,on:'coffeeTray'},greenBook:{position:[.4,.18,.02],rotationY:.18,on:'coffeeTable'},roseBook:{position:[.56,.25,0],rotationY:-.08,on:'coffeeTable'},bedroomFigure:{position:[0,0,0],rotationY:0,on:'bedroomVanity'}};
const turnedOver=restOnSupports(oldDefaults);
for(const id of nowResting)assert.deepEqual(turnedOver[id],newDefaults[id],`${id} as it came turns into the new default`);
assert.deepEqual(restOnSupports(turnedOver),turnedOver,'turning over twice changes nothing');
assert.deepEqual(repairLayout(oldDefaults).greenBook,newDefaults.greenBook,'loading a save turns it over');
// Where something stands in the room: its own spot through each piece under it.
const R=(t,[x,y,z])=>[x*Math.cos(t)+z*Math.sin(t),y,-x*Math.sin(t)+z*Math.cos(t)];
const pivot={bedroomVanity:[1.4,0,-3.1],bedroomFigure:[1.4,.98,-3.13]},P=id=>pivot[id]||[0,0,0];
const under={coffeeTray:'coffeeTable',coffeeMug:'coffeeTray',greenBook:'coffeeTable',roseBook:'coffeeTable',bedroomFigure:'bedroomVanity'};
function world(id,f){const item=f[id],at=P(id).map((v,i)=>v+item.position[i]);if(!item.on)return {at,r:item.rotationY||0};const b=world(item.on,f),d=R(b.r,at.map((v,i)=>v-P(item.on)[i]));return {at:b.at.map((v,i)=>v+d[i]),r:b.r+(item.rotationY||0)};}
const close3=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-5);
// Her home may have the table moved and turned, things nudged on their own (so
// no longer on it), and the vanity shifted with the figure left behind.
const hers={...oldDefaults,coffeeTable:{position:[-1.9,.34,.2],rotationY:Math.PI/4},greenBook:{position:[-2.6,.52,-.7],rotationY:.4},coffeeMug:{position:[-2.3,.6,.18],rotationY:2},bedroomVanity:{position:[-.6,0,.2],rotationY:.3},bedroomFigure:{position:[.25,0,.05],rotationY:-.2}};
const after=repairLayout(hers);
for(const id of nowResting){
 const before=world(id,{...hers,[id]:{...hers[id]}}),now=world(id,after);
 assert.ok(close3(before.at,now.at),`${id} stands exactly where it stood`);
 assert.ok(Math.abs(before.r-now.r)<1e-5,`${id} faces the way it faced`);
 assert.equal(after[id].on,under[id]);
}
// A save half turned over (the tray done, the cup not) still comes out right.
const half={...hers,coffeeTray:restOnSupports(hers).coffeeTray};
const fixed=repairLayout(half);
assert.ok(close3(world('coffeeMug',fixed).at,world('coffeeMug',{...hers}).at),'the cup still stands where it stood');
// And now the table carries them: move it, and they move with it.
const moved2={...after,coffeeTable:{...after.coffeeTable,position:[0,.34,0]}};
assert.ok(Math.abs(world('greenBook',moved2).at[0]-world('greenBook',after).at[0]-1.9)<1e-9,'the book goes with the table');
console.log('Layout repairs: the picture clears the curtain rod, the lamp leaves the dining chair, hand-placed pieces stay, and what sits on the coffee table and the vanity now goes with them.');
