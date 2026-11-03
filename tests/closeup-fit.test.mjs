import assert from 'node:assert/strict';
import {closeupZoom} from '../src/closeup-fit.js';
for(const [w,h] of [[660,440],[300,280],[350,440]]){
 for(const [x,y] of [[.5,.4],[3,2],[1,4],[6,1]]){
  const zoom=closeupZoom(w,h,x,y);
  assert.ok(x*zoom<=w*.72+.001&&y*zoom<=h*.72+.001);
  assert.ok(Math.abs(Math.max(x*zoom/w,y*zoom/h)-.72)<.001);
  assert.equal(closeupZoom(w,h,x*2,y*2),zoom/2);
 }
}
console.log('Small, tall, wide objects share viewport occupancy at full, split and mobile sizes.');

import * as THREE from 'three';
import {reachFromSight} from '../src/closeup-fit.js';
{
 // A small box seen from the close-up's usual angle, aimed at its middle.
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
 const closed=new THREE.Box3(new THREE.Vector3(-.5,0,-.4),new THREE.Vector3(.5,.4,.4));
 const direction=new THREE.Vector3(-2.8,-4.6,-5).normalize();
 camera.position.copy(closed.getCenter(new THREE.Vector3())).addScaledVector(direction,-20);
 camera.lookAt(closed.getCenter(new THREE.Vector3()));camera.updateMatrixWorld(true);
 const [w,h]=[660,280];
 // Closed, it is framed exactly as before: by its whole projected size.
 const corners=[];for(const x of [-.5,.5])for(const y of [0,.4])for(const z of [-.4,.4])corners.push(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 const span=new THREE.Box3().setFromPoints(corners).getSize(new THREE.Vector3());
 const shut=reachFromSight(closed,camera.matrixWorldInverse);
 assert.ok(Math.abs(closeupZoom(w,h,shut.x*2,shut.y*2)-closeupZoom(w,h,span.x,span.y))<1e-9);
 // The lid swings up and back: the view widens until every corner is on the stage.
 const open=closed.clone().expandByPoint(new THREE.Vector3(.5,1.1,-.9));
 const reach=reachFromSight(open,camera.matrixWorldInverse);
 const zoom=closeupZoom(w,h,reach.x*2,reach.y*2);
 assert.ok(zoom<closeupZoom(w,h,shut.x*2,shut.y*2));
 for(const x of [open.min.x,open.max.x])for(const y of [open.min.y,open.max.y])for(const z of [open.min.z,open.max.z]){
  const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);
  assert.ok(Math.abs(p.x)*zoom<=w/2+1e-9&&Math.abs(p.y)*zoom<=h/2+1e-9,'corner off the stage');
 }
 console.log('An opened lid widens the view until all of it is on the stage; closed objects are framed as before.');
}
