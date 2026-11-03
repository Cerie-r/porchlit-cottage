import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {applyHairColor,bindColorInput} from '../body/appearance.js';
import {createResidentHair} from '../src/resident-hair.js';
test('recolours imported and hidden hair and scalp without touching eyes',async()=>{
 const models={classic:new T.Mesh(createResidentHair(true),new T.MeshStandardMaterial())};
 // Two imported hairstyles, kept hidden until chosen: a group with a mesh of two materials and a hidden mesh.
 for(const kind of ['long','short']){const g=new T.Group();g.add(new T.Mesh(new T.BoxGeometry(),[new T.MeshStandardMaterial(),new T.MeshStandardMaterial()]));const tucked=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());tucked.visible=false;g.add(tucked);g.visible=false;models[kind]=g;}
 const base=new T.Mesh(new T.SphereGeometry(),new T.MeshStandardMaterial());
 const eyes=new T.MeshStandardMaterial({color:'#454344'});
 assert.ok(applyHairColor(models,base,'#b25a71')>=4);
 for(const root of [...Object.values(models),base])root.traverse(o=>{if(o.isMesh)for(const m of [o.material].flat())assert.equal(m.color.getHexString(),'b25a71');});
 assert.equal(eyes.color.getHexString(),'454344');
});
test('colour previews and committed picker selections both update',()=>{
 const input=new EventTarget(),seen=[];input.value='#112233';bindColorInput(input,v=>seen.push(v));input.dispatchEvent(new Event('input'));input.value='#445566';input.dispatchEvent(new Event('change'));assert.deepEqual(seen,['#112233','#445566']);
});
