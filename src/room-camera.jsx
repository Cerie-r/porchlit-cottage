import {keepCameraInsideRoom,cameraCutaway,overviewPose} from './camera-bounds.js';
import {outsideView} from './house-shells.js';
import React,{useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
export const furnitureViews={
 'bedroomBed':{label:'床边',height:.85,width:4.8,offset:[4,3.3,3.5],action:'翻看床品'},
 'bedroomVanity':{label:'梳妆台',height:1.3,width:3.4,offset:[.5,2.1,5],action:'打开首饰盒'},
 'bedroomWardrobe':{label:'衣柜',height:1.25,width:3.4,action:'打开衣柜'},
 'bedroomChair':{label:'卧室读书角',height:.9,width:3.5,action:'翻看坐垫'},
 'studyReading':{label:'书房读书角',height:1,width:3.5,action:'翻看坐垫'},
 'sofa':{label:'沙发',height:.25,width:4.4,offset:[.8,1.8,2.6],action:'翻看靠垫与毯子'},
 'tvUnit':{label:'电视机',height:.93,width:3.4,offset:[0,1.7,4]},
 'refrigerator':{label:'冰箱',height:1.25,width:3.2,offset:[-5,2.5,.65],action:'打开冷藏室',storage:'refrigerator:cabinet:0,0.75,0'},
 'island':{label:'岛台',height:.9,width:3.8,offset:[2,4,5]},
 // The stove stands on the right of the kitchen facing into the room (-x): looked at from in front of it, a little high.
 'stove':{label:'灶台',height:.95,width:3.2,offset:[-4.5,3.6,-.4]},
 'diningTable':{label:'餐桌',height:.8,width:2.3,offset:[1.9,4.4,4.4]}
};
// Where the camera stands for a place, from its anchor: its own offset, or a little above and in front.
export const placeOffset=spec=>spec.offset||[.65,spec.height+1.5,5];
export const cameraPlaces={
 ...Object.fromEntries(Object.entries(furnitureViews).map(([id,v])=>['view:'+id,{...v,id}])),
 'hide:studyTarot':{id:'studyReading',label:'读书角 · 塔罗牌',action:'打开塔罗牌盒',height:.85,width:3.3},
 'hide:studyComputer':{id:'studyDesk',label:'电脑',action:'打开电脑',height:1.65,width:3.7},
 'hide:studyPrintPreview':{id:'studyPrinter',label:'打印机',action:'使用打印机',height:1.4,width:3.2},
 'hide:studyCraft':{id:'studyCraft',label:'拼搭台',action:'开始拼搭',height:1.35,width:4.6},
 'hide:studyTailor':{id:'studyTailor',label:'小裁缝',action:'做衣服',height:.95,width:2.4}
};
// Use the furniture's world transform, including room rotation and saved placement.
export function RoomCamera({focus,overviewRevision=0,homeZoom=76,outside=null,interactive=true,focusRevision=0,onSettled,preserveView=false,roomKey=''}){
 const {camera,scene,size,invalidate,gl}=useThree();
 // Outside ({shell, scale}): the whole house in view on this canvas (house-shells.js), fitted again when it changes size.
 const fit=outside?outsideView(outside.shell,{width:size.width,height:size.height,zoom:homeZoom,scale:outside.scale}):{zoom:homeZoom,lift:0};
 const previousView=useRef(null);
 const settledCallback=useRef(onSettled);settledCallback.current=onSettled;
 const goal=useRef(null),pending=useRef(false),controls=useRef(null),activeRoom=useRef(null),focusTarget=useRef(new THREE.Vector3());
 const setWalls=policy=>scene.traverse(o=>{if(o.userData.cutawayWall)o.visible=!policy?.[o.userData.cutawayWall];});
 useEffect(()=>{
  if(!focus||!interactive)return;
  const savedPosition=camera.position.clone(),savedQuaternion=camera.quaternion.clone();
  const orbit=new OrbitControls(camera,gl.domElement);
  camera.position.copy(savedPosition);camera.quaternion.copy(savedQuaternion);
  controls.current=orbit;orbit.target.copy(focusTarget.current);orbit.enabled=!goal.current&&!pending.current;orbit.enableDamping=false;
  orbit.minZoom=25;orbit.maxZoom=350;orbit.maxPolarAngle=Math.PI*.49;
  orbit.screenSpacePanning=true;
  const change=()=>{setWalls(cameraCutaway(camera.position,orbit.target,activeRoom.current));invalidate();};
  orbit.addEventListener('change',change);
  return()=>{focusTarget.current.copy(orbit.target);orbit.dispose();controls.current=null;};
 },[focus,interactive,camera,gl,invalidate]);
 useEffect(()=>{
  const before=previousView.current;
  previousView.current={focus,overviewRevision,focusRevision,zoom:fit.zoom,lift:fit.lift,roomKey};
  const sameRoom=before&&before.roomKey===roomKey&&before.overviewRevision===overviewRevision&&before.zoom===fit.zoom&&before.lift===fit.lift;
  // Entering/leaving decoration and closing the sidebar must not reframe the room.
  // Explicit room changes and the overview button still request a fresh view.
  if(sameRoom&&(preserveView||(!focus&&!before.focus))){
   if(preserveView){goal.current=null;pending.current=false;}
   invalidate();return;
  }
  if(focus){pending.current=true;}
  else{
   goal.current=overviewPose(camera,fit.zoom,fit.lift);pending.current=false;
   // Just come in (the page opening, back from the street): there at once, not flying in from where the canvas starts.
   if(!before){const g=goal.current;camera.position.copy(g.position);camera.quaternion.copy(g.quaternion);camera.zoom=g.zoom;camera.updateProjectionMatrix();}
  }
  invalidate();
 },[focus,overviewRevision,focusRevision,fit.zoom,fit.lift,size.width,size.height,camera,invalidate,preserveView,roomKey]);
 useFrame((_,delta)=>{
  if(pending.current){
   const spec=cameraPlaces[focus];let anchor;
   scene.traverse(o=>{if(o.userData.cameraPlace===spec.id)anchor=o;});
   if(anchor){
    scene.updateMatrixWorld(true);
    const target=anchor.localToWorld(new THREE.Vector3(0,spec.height,0));
    const position=anchor.localToWorld(new THREE.Vector3(...placeOffset(spec)));
    let room=anchor;while(room&&!room.userData.cameraRoom)room=room.parent;
    activeRoom.current=room;focusTarget.current.copy(target);
    if(controls.current){controls.current.enabled=false;controls.current.target.copy(target);}
    keepCameraInsideRoom(position,room);
    setWalls(cameraCutaway(position,target,room));
    const probe=camera.clone();probe.position.copy(position);probe.lookAt(target);
    const worldScale=anchor.getWorldScale(new THREE.Vector3()).x;
    goal.current={position,quaternion:probe.quaternion.clone(),zoom:Math.min(size.width/spec.width,size.height/3.4)/worldScale};pending.current=false;
   }else{pending.current=false;return;}
  }
  const g=goal.current;if(!g)return;
  const t=1-Math.exp(-7*Math.min(delta,.05));
  camera.position.lerp(g.position,t);camera.quaternion.slerp(g.quaternion,t);camera.zoom+=(g.zoom-camera.zoom)*t;camera.updateProjectionMatrix();
  if(camera.position.distanceTo(g.position)<.001&&camera.quaternion.angleTo(g.quaternion)<.001&&Math.abs(camera.zoom-g.zoom)<.01){camera.position.copy(g.position);camera.quaternion.copy(g.quaternion);camera.zoom=g.zoom;camera.updateProjectionMatrix();goal.current=null;if(controls.current){controls.current.enabled=true;controls.current.update();}if(!focus)setWalls(null);settledCallback.current?.(focus);}
  else invalidate();
 });
 return null;
}

