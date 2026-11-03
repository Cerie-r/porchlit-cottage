import assert from 'node:assert/strict';
import {Vector3,Euler} from 'three';
import {residentPlacement} from '../src/resident-placement.js';
for(const height of [.43,.8,1.3])for(const kind of ['boy','girl']){
 const stand=residentPlacement(kind,'stand',height);
 assert.ok(Math.abs(stand.position[1]+height-.02)<1e-10,'standing feet stay on floor as sofa height changes');
 const sit=residentPlacement(kind,'sit',height);
 const butt=height+sit.position[1]+.17*sit.scale;
 assert.ok(Math.abs(butt-(height+.215))<.01,'seated pelvis rests on the cushion');
}
for(const angle of [0,Math.PI/2,-Math.PI/2]){
 const local=residentPlacement('girl','sit',.43).position;
 const origin=new Vector3(3,.43,-2),world=new Vector3(...local).applyEuler(new Euler(0,angle,0)).add(origin);
 const recovered=world.clone().sub(origin).applyEuler(new Euler(0,-angle,0));
 assert.ok(recovered.distanceTo(new Vector3(...local))<1e-10,'seat survives furniture translation and rotation');
}
console.log('Resident anchors: floor height, seat contact, moved and rotated sofa passed');
