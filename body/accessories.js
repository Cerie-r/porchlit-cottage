import * as T from 'three';
import {clothRibbon} from '../src/resident-cloth.js';
import {extraAccessories} from './accessory-registry.js';
// The headwear: her satin bow and his wool beret, and every piece registered from elsewhere
// (body/accessory-registry.js), or only those named in `only`, built hidden. placeAccessories() seats
// them on whichever hairstyle is being worn.
export function createAccessories(only){
 const bow=new T.Group(),beret=new T.Group();bow.name='satin-bow';beret.name='wool-beret';
 const satin=new T.MeshStandardMaterial({color:'#f3e6d5',roughness:.55,metalness:0,side:T.DoubleSide});
 const wool=new T.MeshStandardMaterial({color:'#51474a',roughness:.96,side:T.DoubleSide});
 function mesh(group,geo,mat){const m=new T.Mesh(geo,mat);m.castShadow=true;group.add(m);return m;}
 for(const sign of [-1,1]){
  const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.12,.09,.24,.18,.32,.13);shape.bezierCurveTo(.37,.09,.36,-.10,.30,-.13);shape.bezierCurveTo(.22,-.17,.10,-.05,0,0);
  const geo=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:3,curveSegments:20,steps:1});
  geo.scale(sign,1,1);const loop=mesh(bow,geo,satin);loop.rotation.y=sign*-.20;
  mesh(bow,clothRibbon([[sign*.035,-.015,0],[sign*.07,-.13,.08],[sign*.16,-.26,.14]],.10,.012),satin);
 }
 const knot=mesh(bow,new T.SphereGeometry(1,24,16),satin);
 knot.scale.set(.065,.09,.065);knot.position.z=.035;
 const profile=[[0,.17],[.16,.18],[.31,.16],[.43,.11],[.48,.055],[.47,.012],[.40,-.025],[.34,-.035],[.34,-.055]];
 mesh(beret,new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),72),wool);
 const tip=mesh(beret,new T.CapsuleGeometry(.012,.055,5,12),wool);tip.position.set(-.025,.205,0);tip.rotation.z=-.2;
 bow.visible=false;beret.visible=false;
 const extra=Object.fromEntries(extraAccessories.filter(a=>!only||only.includes(a.id)).map(a=>{const o=a.create();o.name=o.name||a.id;o.visible=false;return [a.id,o];}));
 return {bow,beret,...extra};
}
// The bow's place was found on the classic bob, in head units: a ray from straight ahead, a little
// to her left and below the top of the hair. On another hairstyle the same ray finds its surface.
const BOW={x:.2697,y:.2086,front:.393,width:.93};
// Seat the headwear on a hairstyle made in head units (body/hair-registry.js makeHair): the bow on
// the hair's surface; the beret sized on the hair, leaving out any curl that stands up from it (the
// beret hides it), and sat down a little so it rests on the hair. The hair and the headwear share a
// parent that has no transform of its own yet (the scene, or an avatar before it is scaled). What is
// worn at the neck or on the chest sits on the clothes, so it is placed only when worn = {body,
// outfit} says what they are (see body/accessory-registry.js).
export function placeAccessories({bow,beret,...extra},hair,worn){
 hair.updateWorldMatrix(true,true);
 const s=hair.scale.x,o=hair.position,target=new T.Vector3(o.x+BOW.x*s,o.y+BOW.y*s,o.z+2*s);
 const hit=new T.Raycaster(target,new T.Vector3(0,0,-1)).intersectObject(hair,true)[0];
 bow.position.copy(hit?hit.point:target.setZ(o.z+BOW.front*s));bow.position.z+=.025;bow.rotation.set(0,.35,-.24);bow.scale.setScalar(BOW.width*s*.55);
 const hb=new T.Box3();hair.traverse(m=>{if(m.isMesh&&!/-curl$/.test(m.name))hb.expandByObject(m);});
 const hs=hb.getSize(new T.Vector3()),hc=hb.getCenter(new T.Vector3());
 beret.scale.set(hs.x,hs.x,hs.z*1.04);beret.position.set(hc.x-hs.x*.055,hb.max.y-hs.y*.22,hc.z);beret.rotation.set(0,0,-.12);
 for(const [id,o] of Object.entries(extra)){const a=extraAccessories.find(a=>a.id===id);if(a&&(worn||!['neck','chest'].includes(a.slot)))a.place(o,hair,worn);}
}
// What the pieces worn take the place of in the outfit worn (covers in body/accessory-registry.js: a
// bow tie instead of a necktie): those parts are hidden, and any hidden for a piece no longer worn
// show again. Do this before placing what is worn at the neck and on the chest, which then sit on what
// shows.
export function coverOutfit(outfit,ids){
 const names=new Set(ids.flatMap(id=>extraAccessories.find(a=>a.id===id)?.covers||[]));
 outfit?.traverse(m=>{if(!m.isMesh)return;if(names.has(m.name)){if(m.visible){m.visible=false;m.userData.covered=true;}}else if(m.userData.covered){m.visible=true;delete m.userData.covered;}});
}
// The headwear colour; parts whose material is named "fixed" keep their own.
export function colorAccessory(root,value){root.traverse(o=>{if(o.isMesh&&o.material.name!=='fixed')o.material.color.set(value);});}
