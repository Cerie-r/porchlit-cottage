import assert from 'node:assert/strict';
import {Group,Vector3} from 'three';
import {keepCameraInsideRoom} from '../src/camera-bounds.js';
for(const rotation of [0,.9,2.4]){
 const room=new Group();room.rotation.y=rotation;room.scale.setScalar(.8);room.position.set(1,2,-3);
 const anchor=new Group();anchor.position.set(-1.62,.43,1.15);anchor.rotation.y=-Math.PI/2;room.add(anchor);room.updateMatrixWorld(true);
 const old=anchor.localToWorld(new Vector3(.65,1.75,5));
 assert.ok(room.worldToLocal(old.clone()).x<-5.18,'reproduce the sofa camera behind the wall');
 const fixed=keepCameraInsideRoom(old,room);assert.ok(room.worldToLocal(fixed.clone()).x>=-4.650001);
 const corner=room.localToWorld(new Vector3(-8,-1,-6));keepCameraInsideRoom(corner,room);const p=room.worldToLocal(corner.clone());
 assert.ok(p.x>=-4.650001&&p.z>=-3.450001&&p.y>=.499999);
 const valid=room.localToWorld(new Vector3(2,3,6)),before=valid.clone();keepCameraInsideRoom(valid,room);assert.ok(valid.distanceTo(before)<1e-8,'preserve open-front viewpoints');
 const sofa=anchor.localToWorld(new Vector3(.8,1.8,2.6));const local=room.worldToLocal(sofa.clone());assert.ok(local.x>-4.65&&local.z>-3.45,'short sofa offset is already indoors');
}
console.log('Camera wall boundaries passed with rotated, translated and scaled rooms.');
const {cameraCutaway,overviewPose}=await import('../src/camera-bounds.js');
const {OrthographicCamera}=await import('three');
for(const rotation of [0,.8,2.2]){
 const room=new Group();room.rotation.y=rotation;room.scale.setScalar(.92);room.updateMatrixWorld(true);
 const p=room.localToWorld(new Vector3(-4.22,2.23,1.95));
 const t=room.localToWorld(new Vector3(-1.62,.68,1.15));
 assert.deepEqual(cameraCutaway(p,t,room),{left:true,back:false},'sofa hides the foreground side wall, including wide orthographic rays');
}
const camera=new OrthographicCamera(-1,1,1,-1,.1,1000);camera.position.set(-4,2,1);camera.lookAt(5,1,-2);camera.zoom=300;
for(const zoom of [42,76]){const home=overviewPose(camera,zoom);assert.deepEqual(home.position.toArray(),[10,8,10]);assert.equal(home.zoom,zoom);const direction=new Vector3(0,0,-1).applyQuaternion(home.quaternion);assert.ok(direction.dot(new Vector3(-10,-8,-10).normalize())>.99999,'overview looks at room center regardless of current furniture pose');}
