import * as T from 'three';
// Cancel the full stage transform before passing a seat to room navigation.
export function seatInRoom(root,room,{height=.65,depth=.18,approach=.95,yaw=0}={}){
 root.updateWorldMatrix(true,false);room.updateWorldMatrix(true,false);
 const relative=new T.Matrix4().copy(room.matrixWorld).invert().multiply(root.matrixWorld);
 const p=new T.Vector3(0,height,depth).applyMatrix4(relative);
 const a=new T.Vector3(...(Array.isArray(approach)?approach:[0,0,approach])).applyMatrix4(relative);
 const d=new T.Vector3(Math.sin(yaw),0,Math.cos(yaw)).transformDirection(relative);
 return {frame:'room',seat:[p.x,p.z],approach:[a.x,a.z],height:p.y,yaw:Math.atan2(d.x,d.z)};
}
export function seatInNavigation(seat,origin){
 return {...seat,frame:'navigation',seat:[seat.seat[0]-origin[0],seat.seat[1]-origin[2]],approach:[seat.approach[0]-origin[0],seat.approach[1]-origin[2]],height:seat.height-origin[1]};
}
