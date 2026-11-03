export const RESIDENT_GROUND_OFFSET=.025;
// Navigation tracks the contact point; the rendered root is offset by the rig.
export function residentPosePosition(m,contact){
 const c=Math.cos(m.yaw),s=Math.sin(m.yaw),a=m.sit;
 return [m.x-(c*contact.x+s*contact.z)*a,RESIDENT_GROUND_OFFSET+m.y,m.z-(-s*contact.x+c*contact.z)*a];
}
