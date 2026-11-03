import React,{createContext,useContext,useRef} from 'react';
import {seatInRoom} from './seat-coordinates.js';
export const SeatContext=createContext(null);
// Physical seat coordinates are transformed by the actual furniture hierarchy.
export function SeatTarget({id,height=.65,depth=.18,approach=.95,yaw=0,search=true,children}){
 const ref=useRef(),context=useContext(SeatContext);
 // seatId and seatSpec let the residents find this seat by itself (two of them sitting down to eat).
 return <group ref={ref} userData={{seatId:id,seatSpec:{height,depth,approach,yaw}}} onClick={context&&!context.decorMode?e=>{if(e.delta>5)return;e.stopPropagation();const root=ref.current;let room=root;while(room&&!room.userData.cameraRoom)room=room.parent;if(!room)return;context.open({id,search,anchor:root,labelPoint:[0,height+.55,depth],seat:seatInRoom(root,room,{height,depth,approach,yaw}),x:e.nativeEvent.clientX,y:e.nativeEvent.clientY});}:undefined}>{children}</group>;
}
// The bed: tapping it asks what to do (go to bed together, or search it) instead of opening it at once.
export function BedTarget({id,height=1.1,children}){
 const ref=useRef(),context=useContext(SeatContext);
 return <group ref={ref} onClick={context&&!context.decorMode?e=>{if(e.delta>5)return;e.stopPropagation();context.open({id,bed:true,search:true,anchor:ref.current,labelPoint:[0,height,0],x:e.nativeEvent.clientX,y:e.nativeEvent.clientY});}:undefined}>{children}</group>;
}
