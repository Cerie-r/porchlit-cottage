import * as THREE from 'three';
import {createResidentHair} from '../src/resident-hair.js';
import {createSweptHair} from './hair-swept.js';
import {publicHairs} from './hair-pieces.js';

// Hairstyles. Each resident has a base one that is always there: the classic bob for her, the
// side-parted short hair for him. The public ones (body/hair-pieces.js) come out of the capsule
// machine, and the wardrobe offers those once drawn (body/drawn.js); a home's own pack may register
// more (src/ours-pack.js, not part of the public release). An entry is {id, name, wearers:
// ['girl'|'boy'], create(material) -> THREE.Object3D}, made in head units the way
// body/hair-tools.js makes them. A small curl that a hat should hide is a mesh named "...-curl".
const base=[
 {id:'classic',name:'原版短发',wearers:['girl'],create:material=>{const mesh=new THREE.Mesh(createResidentHair(true),material);mesh.name='classic-hair';mesh.castShadow=true;return mesh;}},
 {id:'short',name:'侧分短发',wearers:['boy'],create:createSweptHair}
];
export const extraHairs=[];
const all=()=>[...base,...publicHairs,...extraHairs];
export function registerHairs(list=[]){
 for(const hair of list)if(hair?.id&&typeof hair.create==='function'&&Array.isArray(hair.wearers)&&!all().some(h=>h.id===hair.id))extraHairs.push(hair);
 return extraHairs;
}
export const baseHairFor=kind=>kind==='boy'?'short':'classic';
// Which hairstyles a resident may wear, the base one first.
export const hairsFor=kind=>all().filter(h=>h.wearers.includes(kind)).map(h=>h.id);
export const hairById=id=>all().find(h=>h.id===id);
// The hairstyle a look asks for if the resident may wear it, otherwise the base one.
export const wornHair=(kind,look)=>hairsFor(kind).includes(look?.hair)?look.hair:baseHairFor(kind);
// Make a hairstyle and put it on a head: scaled by the head's width over .86, centred on it.
export function makeHair(id,material,headBox){
 const hair=hairById(id).create(material);
 hair.scale.setScalar(headBox.getSize(new THREE.Vector3()).x/.86);hair.position.copy(headBox.getCenter(new THREE.Vector3()));
 hair.userData.hairStyle=id;return hair;
}
// A hat hides the hairstyle's curl.
export function hideCurl(hair,hidden){hair?.traverse(o=>{if(o.isMesh&&/-curl$/.test(o.name))o.visible=!hidden;});}
