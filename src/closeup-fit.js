import * as THREE from 'three';

// Reserve space around the object for doors, drawers and touch gestures.
export function closeupZoom(width,height,objectWidth,objectHeight){
 return Math.min(Math.max(1,width)*.72/Math.max(.01,objectWidth),Math.max(1,height)*.72/Math.max(.01,objectHeight));
}

// How far a box reaches from the camera's line of sight, sideways (x) and up
// and down (y). An open lid or door only grows on one side, so the view is
// sized by the farther side rather than by the box's overall size.
export function reachFromSight(box,matrixWorldInverse){
 const v=new THREE.Vector3();let x=0,y=0;
 for(const px of [box.min.x,box.max.x])for(const py of [box.min.y,box.max.y])for(const pz of [box.min.z,box.max.z]){
  v.set(px,py,pz).applyMatrix4(matrixWorldInverse);x=Math.max(x,Math.abs(v.x));y=Math.max(y,Math.abs(v.y));
 }
 return {x,y};
}
