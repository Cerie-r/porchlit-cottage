import {createAccessories,placeAccessories} from '../body/accessories.js';
import {createOutfits} from '../body/outfits.js';
import {createResidentHair} from '../src/resident-hair.js';
import {applyRoundHead} from '../body/round-head.js';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyHeadRatio} from '../body/proportions.js';
import {createFaceAndHairBase} from '../body/face.js';
import {fitHair} from '../body/fit-hair.js';
async function load(path){const b=fs.readFileSync(path);return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;}
// The bought hairstyles (public/models/hair-*.glb) are gone; classic is always there.
for(const kind of ['classic','short'].filter(k=>k==='classic'||fs.existsSync('public/models/hair-'+k+'.glb'))){
 const model=await load('public/models/resident-body.glb');applyRoundHead(model);applyHeadRatio(model);model.traverse(o=>{if(o.isMesh)o.material.color.set('#f5dfce')});
 const f=createFaceAndHairBase(model);let hair;
 if(kind==='classic'){
  const b=new T.Box3().setFromObject(model.getObjectByName('purchased-head'));
  hair=new T.Mesh(createResidentHair(true),new T.MeshStandardMaterial({color:'#806455',roughness:.78}));hair.scale.setScalar(b.getSize(new T.Vector3()).x/.86);hair.position.copy(b.getCenter(new T.Vector3()));f.base.visible=false;
 }else{hair=fitHair(await load('public/models/hair-'+kind+'.glb'),model,kind);f.base.geometry=f.scalps[kind];}

 const scene=new T.Group();scene.add(model,f.face,f.base,hair);const outfits=createOutfits(model.getObjectByName('purchased-body'));scene.add(outfits[kind==='classic'?'dress':'coat']);const accessories=createAccessories();placeAccessories(accessories,hair);const accessory=accessories[kind==='classic'?'bow':'beret'];accessory.visible=true;scene.add(accessory);scene.updateMatrixWorld(true);
 const meshes=[];scene.traverse(o=>{if(o.isMesh&&o.visible){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.attributes.normal)g.computeVertexNormals();meshes.push({name:o.name,p:Array.from(g.attributes.position.array),n:Array.from(g.attributes.normal.array),i:g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i),c:g.attributes.color?Array.from(g.attributes.color.array):null,base:o.material.color.toArray(),unlit:o.material.isMeshBasicMaterial||false});}});
 fs.writeFileSync('../outfit-fitted-'+kind+'.json',JSON.stringify(meshes));
}
