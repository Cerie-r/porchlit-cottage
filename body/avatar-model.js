import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyRoundHead} from './round-head.js';
import {applyHeadRatio} from './proportions.js';
import {createFaceAndHairBase} from './face.js';
import {makeHair,wornHair,hideCurl} from './hair-registry.js';
import {createOutfits,applyOutfitFit} from './outfits.js';
import {outfitsFor,colorwaysOf,paintOutfit,outfitFitWith,builtAs} from './outfit-registry.js';
import {createAccessories,placeAccessories,colorAccessory,coverOutfit} from './accessories.js';
import {hidesCurl,paintAccessory,showsWith} from './accessory-registry.js';
import {applyHairColor} from './appearance.js';
import {addTrims} from './trims.js';
let assets;
export async function createApprovedAvatar(kind,look){
 assets??=Promise.all([new GLTFLoader().loadAsync('/models/resident-body.glb'),fetch('/models/outfits-fit.json').then(r=>{if(!r.ok)throw Error('Outfits unavailable');return r.json();})]).catch(e=>{assets=null;throw e;});
 const [bodyAsset,fitted]=await assets;
 const clone=root=>{const copy=root.clone(true);copy.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});return copy;};
 const root=new T.Group(),model=clone(bodyAsset.scene);applyRoundHead(model);applyHeadRatio(model);model.traverse(o=>{if(o.isMesh){o.material.color.set('#f5dfce');o.castShadow=true;}});root.add(model);
 const face=createFaceAndHairBase(model);root.add(face.face,face.base);
 const hb=new T.Box3().setFromObject(model.getObjectByName('purchased-head'));const hair=makeHair(wornHair(kind,look),new T.MeshStandardMaterial({roughness:.78}),hb);root.add(hair);hideCurl(hair,hidesCurl(look.accessory));
 face.base.visible=false;applyHairColor({hair},face.base,look.hairColor);face.eyes.forEach(o=>o.material.color.set(look.eyeColor));face.lids.forEach(o=>o.material.color.set(look.eyeColor).multiplyScalar(.68));face.brows.forEach(o=>o.material.color.set(look.browColor));face.blush.forEach(o=>o.visible=look.blush);face.setExpression(look.mouth);
 // One sewn at home is its pattern in the colours sewn, with its lace and pearls (outfit-registry.js, builtAs).
 const outfits=createOutfits();applyOutfitFit(outfits,outfitFitWith(fitted));const as=outfitsFor(kind).includes(look.outfit)?builtAs(look.outfit):{id:null},worn=outfits[as.id]?as.id:outfitsFor(kind)[0];Object.entries(outfits).forEach(([id,o])=>{o.visible=id===worn;root.add(o);});paintOutfit(outfits[worn],(worn===as.id&&as.colors)||colorwaysOf(worn).find(w=>w.id===look.colorways?.[worn])?.colors);
 // Only what is worn is made: the headwear, the glasses, what is at the neck and on the chest, which
 // sit on the body and the outfit worn (the root has no transform yet), less whatever they are worn in
 // place of, and what is on the braids, if the hairstyle has braids.
 const wornIds=[look.accessory,look.face,look.neck,look.chest,look.braid].filter(Boolean),accessories=createAccessories(wornIds);coverOutfit(outfits[worn],wornIds);root.updateMatrixWorld(true);placeAccessories(accessories,hair,{body:model.getObjectByName('purchased-body'),outfit:outfits[worn]});
 // Trimmed after what sits on the outfit is placed, so that sits on the cloth itself.
 if(worn===as.id&&as.trims)addTrims(outfits[worn],as.trims);
 Object.entries(accessories).forEach(([id,o])=>{o.visible=wornIds.includes(id)&&showsWith(id,hair);if(id==='bow'||id==='beret')colorAccessory(o,look.accessoryColor);paintAccessory(o,id,look.accessoryWays?.[id]);root.add(o);});
 const height=new T.Box3().setFromObject(model).getSize(new T.Vector3()).y;root.scale.setScalar(1.3/height);root.userData.avatarRoot=true;return root;
}
export function disposeAvatar(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
