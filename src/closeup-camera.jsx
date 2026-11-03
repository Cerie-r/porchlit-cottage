import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {closeupZoom,reachFromSight} from './closeup-fit.js';
// Aims at the middle of the object as it first appears and fits it to the
// stage. When a lid, door or drawer opens past the edges, the view widens to
// keep all of it in sight; it doesn't narrow again until the close-up is
// opened afresh, so the picture doesn't pump as things open and close.
export function CloseupCamera({target,kind}){
 const {camera,size,invalidate}=useThree();
 const aimed=useRef(false),zoom=useRef(null),seen=useRef('');
 useEffect(()=>{aimed.current=false;zoom.current=null;seen.current='';invalidate();},[kind,target,invalidate]);
 useEffect(()=>{zoom.current=null;seen.current='';invalidate();},[size.width,size.height,invalidate]);
 useFrame(()=>{
  if(!target.current)return;
  target.current.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(target.current);
  if(box.isEmpty())return;
  if(!aimed.current){
   const center=box.getCenter(new THREE.Vector3()),direction=camera.getWorldDirection(new THREE.Vector3());
   camera.position.copy(center).addScaledVector(direction,-20);
   camera.updateMatrixWorld(true);aimed.current=true;
  }
  const reach=reachFromSight(box,camera.matrixWorldInverse);
  const key=`${reach.x.toFixed(3)} ${reach.y.toFixed(3)}`;
  if(key===seen.current)return;
  seen.current=key;
  const need=closeupZoom(size.width,size.height,reach.x*2,reach.y*2);
  if(zoom.current===null||need<zoom.current){zoom.current=need;camera.zoom=need;camera.updateProjectionMatrix();}
  // Look once more next frame: a lid may still be swinging.
  invalidate();
 });
 return null;
}
