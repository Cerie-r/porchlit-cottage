import {useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {furnitureLabelPosition} from './furniture-label-position.js';
import {cameraPlaces} from './room-camera.jsx';
// DOM labels follow the furniture's projected position while orbiting or zooming.
export function FurnitureLabels({seatMenu,seatRef,cameraFocus,cameraRef}){
 const {camera,scene,gl,invalidate}=useThree();
 useEffect(()=>{invalidate();},[seatMenu,cameraFocus,invalidate]);
 useFrame(()=>{
  const place=(element,anchor,position)=>{
   if(!element||!anchor)return;const p=furnitureLabelPosition(anchor,position,camera,gl.domElement.getBoundingClientRect(),element.offsetWidth,element.offsetHeight);
   if(!p){element.style.visibility='hidden';return;}
   element.style.left=p.x+'px';element.style.top=p.y+'px';element.style.visibility='visible';
  };
  if(seatMenu)place(seatRef.current,seatMenu.anchor,seatMenu.labelPoint);
  if(cameraFocus){const spec=cameraPlaces[cameraFocus];let anchor;scene.traverse(o=>{if(o.userData.cameraPlace===spec?.id)anchor=o;});if(spec)place(cameraRef.current,anchor,[0,spec.height+.3,0]);}
 });return null;
}
