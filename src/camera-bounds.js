// The dollhouse is open at the front and right; keep lenses inside its solid walls.
export function keepCameraInsideRoom(position,room){
 if(!room)return position;
 const local=room.worldToLocal(position.clone());
 local.x=Math.max(-4.65,local.x);
 local.z=Math.max(-3.45,local.z);
 local.y=Math.max(.5,local.y);
 return position.copy(room.localToWorld(local));
}
export function cameraCutaway(position,target,room){
 if(!room)return {left:false,back:false};
 const p=room.worldToLocal(position.clone()),t=room.worldToLocal(target.clone());
 return {left:p.x<t.x-.1,back:p.z<t.z-.1};
}
// lift: looking that much higher (a tall house outside, house-shells.js outsideView).
export function overviewPose(camera,zoom,lift=0){
 const probe=camera.clone();probe.position.set(10,8+lift,10);probe.lookAt(0,lift,0);
 return {position:probe.position.clone(),quaternion:probe.quaternion.clone(),zoom};
}
