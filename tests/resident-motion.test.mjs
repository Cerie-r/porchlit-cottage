import {furnitureLabelPosition} from '../src/furniture-label-position.js';
import {bedroomCorner} from '../src/bedroom-corner.js';
import {residentPosePosition,RESIDENT_GROUND_OFFSET} from '../src/resident-pose.js';
import {studyChairLayout,studyChairSeat} from '../src/study-chair-layout.js';
import {seatInRoom,seatInNavigation} from '../src/seat-coordinates.js';
import {residentLocation} from '../src/resident-location.js';
import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {rigAvatar} from '../body/avatar-rig.js';import {applyHeadRatio} from '../body/proportions.js';import {applyRoundHead} from '../body/round-head.js';import {createOutfits,applyOutfitFit} from '../body/outfits.js';
import {findPath,obstaclesFor,sofaSeat,clearSegment,freePoint,nearestFree,upstairsObstacles,UPSTAIRS_BOUNDS,kitchenObstacles,KITCHEN_BOUNDS,downstairsObstacles,DOWNSTAIRS_BOUNDS} from '../src/resident-navigation.js';
import {newMotion,stepResident,beginStand} from '../src/resident-motion-state.js';
const furniture={sofa:{position:[-.62,.43,-.45],rotationY:-Math.PI/2},coffeeTable:{position:[-2.4,.34,-.48],rotationY:Math.PI/2},armchair:{position:[-2.28,.38,-2.16],rotationY:.62},tvUnit:{position:[-3.88,.34,-.55],rotationY:Math.PI/2},lamp:{position:[.5,0,-2.72],rotationY:0},floorPlant:{position:[-3.62,.03,-2.48],rotationY:-.18}};
test('both residents can route around the sofa to their own seats without cutting furniture corners',()=>{
 const obstacles=obstaclesFor(furniture);
 for(const kind of ['girl','boy']){const start=nearestFree([.65,kind==='girl'?.9:-1.4],obstacles),seat=sofaSeat(furniture.sofa,kind);assert.ok(freePoint(seat.approach,obstacles));const route=findPath(start,seat.approach,obstacles);assert.ok(route);let last=start;for(const p of route){assert.ok(clearSegment(last,p,obstacles));last=p;}}
 assert.equal(findPath([.65,.9],[-.62,-.45],obstacles),null);
 const barrier=[{x:0,z:0,w:.3,d:20,angle:0}];assert.equal(findPath([-.8,0],[.8,0],barrier),null);
});
test('walk, turn, sit, stand and interrupting a sit end at stable poses',()=>{
 const m=newMotion([0,0]);m.route=[[0,.3]];m.seat={seat:[0,.15],approach:[0,.3],height:.65,yaw:0};
 for(let i=0;i<600;i++)stepResident(m,1/60,.36);assert.equal(m.sit,1);assert.ok(Math.abs(m.y-.29)<1e-6);assert.equal(stepResident(m,.016,.36),false);
 m.pending=[[.6,.3]];beginStand(m);for(let i=0;i<600;i++)stepResident(m,1/60,.36);assert.equal(m.sit,0);assert.ok(Math.abs(m.x-.6)<.01);assert.equal(m.y,0);assert.equal(m.amount,0);
 m.seat={seat:[.6,.15],approach:[.6,.3],height:.65,yaw:0};m.transition={type:'sit',time:0,from:[m.x,m.z,0,0]};stepResident(m,.05,.36);beginStand(m);for(let i=0;i<100;i++)stepResident(m,.016,.36);assert.equal(m.sit,0);assert.equal(m.transition,null);
});
test('rig preserves all rest geometry and gives body and garments normalized, finite skinning',async()=>{
 const data=fs.readFileSync('public/models/resident-body.glb');const {scene:model}=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');applyRoundHead(model);applyHeadRatio(model);
 const root=new T.Group();root.add(model);const outfits=createOutfits();applyOutfitFit(outfits,JSON.parse(fs.readFileSync('public/models/outfits-fit.json','utf8')));root.add(outfits.coat);root.updateMatrixWorld(true);
 const before=[];root.traverse(o=>{if(o.isMesh&&o.visible){const pos=o.geometry.attributes.position;before.push({name:o.name,n:pos.count,index:o.geometry.index?.count||0,first:new T.Vector3().fromBufferAttribute(pos,0).applyMatrix4(o.matrixWorld)});}});
 const rig=rigAvatar(root),meshes=root.children.filter(o=>o.isSkinnedMesh);assert.equal(meshes.length,before.length);root.updateMatrixWorld(true);rig.skeleton.update();
 meshes.forEach((o,i)=>{const pos=o.geometry.attributes.position,w=o.geometry.attributes.skinWeight;assert.equal(pos.count,before[i].n);assert.equal(o.geometry.index?.count||0,before[i].index);const first=o.applyBoneTransform(0,new T.Vector3().fromBufferAttribute(pos,0)).applyMatrix4(o.matrixWorld);assert.ok(first.distanceTo(before[i].first)<1e-5);for(let j=0;j<w.count;j++)assert.ok(Math.abs(w.getX(j)+w.getY(j)+w.getZ(j)+w.getW(j)-1)<1e-5);});
 assert.ok(rig.seatContact.y<.85*root.scale.x-.02,'seat contact must be below the hip pivot');
 rig.pose({sit:1});const holder=new T.Group();holder.add(root);const motion={x:0,z:0,y:studyChairSeat.height-rig.seatContact.y-RESIDENT_GROUND_OFFSET,yaw:Math.PI,sit:1};holder.position.fromArray(residentPosePosition(motion,rig.seatContact));holder.rotation.y=motion.yaw;holder.updateMatrixWorld(true);rig.skeleton.update();
 const body=meshes.find(o=>o.name==='purchased-body'),positions=body.geometry.attributes.position,contacts=[];
 for(let i=0;i<positions.count;i++){if(Math.abs(positions.getX(i))>.3||positions.getY(i)<.66||positions.getY(i)>.88)continue;contacts.push(body.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(positions,i)).applyMatrix4(body.matrixWorld));}
 assert.ok(Math.abs(Math.min(...contacts.map(v=>v.y))-studyChairSeat.height)<1e-5,'preserved body must touch the cushion top');
 holder.remove(root);root.position.set(0,0,0);root.rotation.set(0,0,0);
 rig.pose({phase:1,amount:1,sit:.5});root.updateMatrixWorld(true);rig.skeleton.update();for(const o of meshes){for(let i=0;i<o.geometry.attributes.position.count;i+=31){const v=o.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,i));assert.ok(v.toArray().every(Number.isFinite));}}
});

test('chair approaches avoid the coffee table and support upstairs room bounds',()=>{
 const f=furniture.armchair,c=Math.cos(f.rotationY),s=Math.sin(f.rotationY);
 const p=[f.position[0]+c*.85+s*.35,f.position[2]-s*.85+c*.35];
 assert.ok(findPath([.65,.9],p,obstaclesFor(furniture)));
 for(const [area,end] of [['study',[-1.65,1.15]],['study',[-1.35,3.05]],['bedroom',[1.35+Math.sin(.22)*.95,1.5+Math.cos(.22)*.95]]]){
  const obs=upstairsObstacles({},area),route=findPath([.65,.9],end,obs,UPSTAIRS_BOUNDS);assert.ok(route);let last=[.65,.9];for(const p of route){assert.ok(clearSegment(last,p,obs,UPSTAIRS_BOUNDS));last=p;}
 }
});
test('faster walking and switching seats both settle without leaving a pending pose',()=>{
 const m=newMotion([0,0]);m.route=[[0,3]];for(let i=0;i<60;i++)stepResident(m,1/60,.33);assert.ok(m.z>1.4&&m.z<1.45);
 m.seat={seat:[0,0],approach:[0,.9],height:.65,yaw:0};m.sit=1;m.x=0;m.z=0;m.y=.32;m.route=[];
 m.pendingSeat={seat:[1,1],approach:[1,1.9],height:.7,yaw:0};m.pending=[[1,1.9]];beginStand(m);
 for(let i=0;i<1000;i++)stepResident(m,1/60,.33);
 assert.equal(m.sit,1);assert.equal(m.pendingSeat,null);assert.equal(m.pending,null);assert.equal(m.x,1);assert.equal(m.z,1);assert.equal(stepResident(m,.016,.33),false);
});

test('sofa remains reachable after stage rotation, zoom, pan and focused-room positioning',()=>{
 const location=residentLocation('1F','living');
 for(const [yaw,scale,position] of [[0,.94,[0,0,0]],[1.7,1.35,[2.62,-.25,-.3]],[-2.5,.62,[-2,1,3]]]){
  const stage=new T.Group();stage.position.fromArray(position);stage.rotation.y=yaw;stage.scale.setScalar(scale);
  const room=new T.Group(),living=new T.Group(),sofa=new T.Group(),target=new T.Group();
  stage.add(room);room.add(living);living.position.fromArray(location.origin);living.add(sofa);sofa.position.fromArray(furniture.sofa.position);sofa.rotation.y=furniture.sofa.rotationY;sofa.add(target);
  const seat=seatInNavigation(seatInRoom(target,room,{height:.235,depth:.27,approach:.88}),location.origin);
  assert.ok(Math.abs(seat.seat[0]-(-.89))<1e-8);assert.ok(Math.abs(seat.seat[1]-(-.45))<1e-8);
  assert.ok(Math.abs(seat.height-.665)<1e-8);assert.ok(Math.abs(seat.yaw+Math.PI/2)<1e-8);
  const obstacles=obstaclesFor(furniture),route=findPath(location.spawns.girl,seat.approach,obstacles);assert.ok(route,'rendered seat must lead to a valid room-local approach');
  let last=location.spawns.girl;for(const p of route){assert.ok(clearSegment(last,p,obstacles));last=p;}
 }
});
test('sidebar floor and room determine one resident location, including the kitchen',()=>{
 const expected=[['1F','overview','downstairs'],['1F','living','living'],['1F','kitchen','kitchen'],['2F','study','study'],['2F','bedroom','bedroom']];
 const keys=new Set();for(const [floor,room,area] of expected){const p=residentLocation(floor,room);assert.equal(p.area,area);assert.equal(p.key,floor+':'+room);keys.add(p.key);assert.equal(Object.keys(p.spawns).length,2);}
 assert.equal(keys.size,expected.length);
 const kitchen={island:{position:[.8,0,.18]},stoolLeft:{position:[.25,0,1.05]},stoolRight:{position:[1.14,0,1.05]},refrigerator:{position:[3.24,0,.78]}};
 const p=residentLocation('1F','kitchen'),obs=kitchenObstacles(kitchen);
 assert.ok(freePoint(p.spawns.girl,obs,KITCHEN_BOUNDS));assert.ok(freePoint(p.spawns.boy,obs,KITCHEN_BOUNDS));assert.ok(findPath(p.spawns.girl,[.1,2.8],obs,KITCHEN_BOUNDS));
});

test('computer chair target sits on the cushion and faces the desk under moved room transforms',()=>{
 const stage=new T.Group();stage.position.set(2,.3,-1);stage.scale.setScalar(1.3);stage.rotation.y=1.6;
 const room=new T.Group(),study=new T.Group(),desk=new T.Group(),chair=new T.Group(),target=new T.Group();stage.add(room);room.add(study);study.position.set(-1.2,0,-.6);study.rotation.y=Math.PI/2;study.add(desk);desk.position.set(-1.75,0,-2.7);desk.rotation.y=.25;desk.add(chair);chair.position.fromArray(studyChairLayout.position);chair.add(target);
 const seat=seatInRoom(target,room,studyChairSeat),surface=chair.localToWorld(new T.Vector3(0,studyChairLayout.cushionPosition[1]+studyChairLayout.cushionSize[1]/2,0));room.worldToLocal(surface);
 assert.ok(Math.abs(seat.height-surface.y)<1e-8);assert.ok(Math.abs(seat.seat[0]-surface.x)<1e-8);assert.ok(Math.abs(seat.seat[1]-surface.z)<1e-8);
 const towardDesk=new T.Vector3(0,0,-1).transformDirection(new T.Matrix4().copy(room.matrixWorld).invert().multiply(chair.matrixWorld));assert.ok(towardDesk.distanceTo(new T.Vector3(Math.sin(seat.yaw),0,Math.cos(seat.yaw)))<1e-8);
});

test('sofa to armchair uses the nearby aisle instead of circling the sofa',()=>{
 const obs=obstaclesFor(furniture),a=furniture.armchair,c=Math.cos(a.rotationY),s=Math.sin(a.rotationY),end=[a.position[0]+c*.85+s*.35,a.position[2]-s*.85+c*.35],start=[-1.5,-.45],path=findPath(start,end,obs);assert.ok(path);
 let last=start,length=0;for(const p of path){assert.ok(clearSegment(last,p,obs));length+=Math.hypot(p[0]-last[0],p[1]-last[1]);last=p;}assert.ok(length<2.5,`nearby chair should take under 2.5 units, took ${length}`);
});
test('bedroom keepsake clears the tea table and both remain navigation obstacles',()=>{
 const a=bedroomCorner.table,b=bedroomCorner.keepsake;assert.ok(Math.abs(a[0]-b[0])>(.88+.91)/2+.2||Math.abs(a[2]-b[2])>(.88+.65)/2+.2);
 const obs=upstairsObstacles({},'bedroom');for(const p of [a,b])assert.equal(freePoint([p[0],p[2]],obs,UPSTAIRS_BOUNDS),false);
});
test('all kitchen chairs and stools can be reached from kitchen and first-floor overview',()=>{
 const k={...furniture,island:{position:[.8,0,.18]},stoolLeft:{position:[.25,0,1.05]},stoolRight:{position:[1.14,0,1.05]},sinkRun:{position:[.9,0,-2.43]},stove:{position:[2.77,0,-.78]},cornerCabinet:{position:[2.77,0,-1.6]},prepCabinet:{position:[2.77,0,.04]},refrigerator:{position:[3.24,0,.78]},diningTable:{position:[-.9,0,-2.05]},diningChair1:{position:[-1.78,0,-2.05],rotationY:Math.PI/2},diningChair2:{position:[-.02,0,-2.05],rotationY:-Math.PI/2},diningChair3:{position:[-.9,0,-1.24],rotationY:0}};
 for(const area of ['kitchen','overview']){const location=residentLocation('1F',area),obs=area==='kitchen'?kitchenObstacles(k):downstairsObstacles(k),bounds=area==='kitchen'?KITCHEN_BOUNDS:DOWNSTAIRS_BOUNDS;
  for(const id of ['stoolLeft','stoolRight','diningChair1','diningChair2','diningChair3']){const f=k[id],isStool=id.startsWith('stool'),yaw=(f.rotationY||0)+(id==='diningChair3'?Math.PI:0),x=isStool?0:.8,z=isStool?.8:0,world=[f.position[0]+Math.cos(yaw)*x+Math.sin(yaw)*z+(isStool?1.05:0),f.position[2]-Math.sin(yaw)*x+Math.cos(yaw)*z-(isStool?1:0)],end=[world[0]-location.origin[0],world[1]-location.origin[2]],route=findPath(location.spawns.girl,end,obs,bounds);assert.ok(route,area+' -> '+id);let last=location.spawns.girl;for(const p of route){assert.ok(clearSegment(last,p,obs,bounds));last=p;}}
 }
});

test('furniture labels follow the projected furniture through orbit and zoom',()=>{
 const camera=new T.OrthographicCamera(-5,5,5,-5,.1,100);camera.position.set(9,7,9);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const stage=new T.Group(),chair=new T.Group();stage.add(chair);chair.position.set(2,0,-1);
 const rect={left:0,right:400,top:120,bottom:820,width:400,height:700},p=furnitureLabelPosition(chair,[0,1,0],camera,rect,160,50);
 stage.rotation.y=1.2;const q=furnitureLabelPosition(chair,[0,1,0],camera,rect,160,50);assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>20);
 camera.zoom=1.7;camera.updateProjectionMatrix();const r=furnitureLabelPosition(chair,[0,1,0],camera,rect,160,50);assert.ok(Math.hypot(q.x-r.x,q.y-r.y)>10);assert.ok(r.x>=90&&r.x<=310&&r.y>=182&&r.y<=800);
});
