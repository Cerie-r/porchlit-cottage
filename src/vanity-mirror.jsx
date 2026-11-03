import React,{useMemo,useEffect} from 'react';
import * as THREE from 'three';
// A cached soft reflection finish: no second scene render or continuous frames.
export function VanityMirror(){
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  const base=ctx.createLinearGradient(0,0,230,256);
  base.addColorStop(0,'#f2f8f7');base.addColorStop(.38,'#d6e4e7');base.addColorStop(.7,'#afc6cd');base.addColorStop(1,'#e6e5dd');
  ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
  const glow=ctx.createRadialGradient(65,65,0,85,90,150);
  glow.addColorStop(0,'rgba(255,255,255,.85)');glow.addColorStop(.4,'rgba(255,255,255,.32)');glow.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,256,256);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
 },[]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={[0,1.62,-.214]} scale={[.50,.63,1]} userData={{tintExclude:true}}><circleGeometry args={[1,64]}/><meshPhysicalMaterial map={texture} color="#ffffff" metalness={.25} roughness={.09} clearcoat={1} clearcoatRoughness={.06} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={.45}/></mesh>;
}
