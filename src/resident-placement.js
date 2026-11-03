// Locations are in the sofa's local coordinate system. Standing roots cancel
// the sofa elevation; seated roots follow its cushion. Root scale is shared.
export const RESIDENT_SCALE=.7;
export function residentPlacement(kind,pose,sofaHeight){const girl=kind==='girl',sit=pose==='sit';return {position:sit?[girl?.53:-.53,.10,.29]:[girl?1.55:-1.55,-sofaHeight+.02,.65],rotationY:sit?0:girl?-.35:.35,scale:RESIDENT_SCALE};}
