import * as THREE from 'three';
export function fitHair(hair,model,kind){
 const hb=new THREE.Box3().setFromObject(hair),faceBox=new THREE.Box3().setFromObject(model.getObjectByName('purchased-head'));
 const faceSize=faceBox.getSize(new THREE.Vector3()),hairSize=hb.getSize(new THREE.Vector3());
 const sx=faceSize.x*(kind==='short'?1.18:1.16)/hairSize.x,sz=faceSize.z*(kind==='short'?1.20:1.23)/hairSize.z;
 hair.scale.set(sx,kind==='short'?faceSize.y*1.10/hairSize.y:(sx+sz)/2,sz);
 hair.position.set((faceBox.min.x+faceBox.max.x)/2,faceBox.max.y+(kind==='short'?.05:.27),(faceBox.min.z+faceBox.max.z)/2);
 hair.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;}});
 if(kind==='long'){
  const start=-faceSize.y/((sx+sz)/2),end=hb.min.y;
  const desired=(.65-hair.position.y)/hair.scale.y;
  hair.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<start)p.setY(i,start+(y-start)*(desired-start)/(end-start));}p.needsUpdate=true;o.geometry.computeVertexNormals();}});
 }
 if(kind==='short'){
  // Preserve the ear opening's natural height while keeping the nape above the chin.
  const start=(faceBox.min.y+faceSize.y*.40-hair.position.y)/hair.scale.y;
  const end=(faceBox.min.y+faceSize.y*.24-hair.position.y)/hair.scale.y;
  hair.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<start)p.setY(i,start+(y-start)*(end-start)/(hb.min.y-start));}p.needsUpdate=true;o.geometry.computeVertexNormals();}});
 }
 hair.updateMatrixWorld(true);
 if(model.getObjectByName('purchased-head').geometry.userData.roundAvatar){
  const center=faceBox.getCenter(new THREE.Vector3()),r=faceSize.clone().multiplyScalar(.5),v=new THREE.Vector3();
  hair.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i);o.localToWorld(v);const d=v.clone().sub(center);
   const norm=Math.sqrt((d.x/r.x)**2+(d.y/r.y)**2+(d.z/r.z)**2);
   if(norm>0&&norm<1.035){v.copy(center).addScaledVector(d,1.035/norm);o.worldToLocal(v);p.setXYZ(i,v.x,v.y,v.z);}
  }p.needsUpdate=true;o.geometry.computeVertexNormals();}});
 }
 if(kind==='short'){
  // Lift the crown continuously from the fixed fringe/ear line, not the whole wig.
  const center=faceBox.getCenter(new THREE.Vector3()),v=new THREE.Vector3();
  hair.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;
   for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);o.localToWorld(v);
    const height=(v.y-center.y)/faceSize.y;
    const root=THREE.MathUtils.smoothstep(height,.015,.50);
    const left=1+.09*THREE.MathUtils.clamp((center.x-v.x)/faceSize.x,-1,1);
    v.y+=faceSize.y*.19*root*left;
    v.x=center.x+(v.x-center.x)*(1+.035*root);
    v.z=center.z+(v.z-center.z)*(1+.085*root);
    // Give the occiput a continuous convex profile; keep fringe and nape anchored.
    const back=THREE.MathUtils.smoothstep((center.z-v.z)/faceSize.z,.02,.36);
    const nape=THREE.MathUtils.smoothstep(height,-.30,-.08);
    const dome=Math.exp(-Math.pow((height-.10)/.40,2));
    v.z-=faceSize.z*.22*back*nape*dome;
    o.worldToLocal(v);p.setXYZ(i,v.x,v.y,v.z);
   }
   p.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
  }});
 }
 hair.updateMatrixWorld(true);
 return hair;
}
