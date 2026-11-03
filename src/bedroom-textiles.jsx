import React,{useMemo,useEffect} from 'react';
import * as T from 'three';
import {FabricMaterial} from './surfaces.jsx';
let lace;
function laceMap(){if(lace)return lace;const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.strokeStyle='#fff8eb';x.lineWidth=3;for(let a=0;a<512;a+=32){x.beginPath();x.moveTo(a,0);x.lineTo(a+32,64);x.moveTo(a+32,0);x.lineTo(a,64);x.stroke();x.beginPath();x.ellipse(a+16,68,15,36,0,0,7);x.stroke();for(let k=0;k<5;k++){x.beginPath();x.ellipse(a+16+Math.cos(k*1.25)*7,65+Math.sin(k*1.25)*7,3,7,k,0,7);x.stroke();}}x.fillStyle='#fff8eb';x.fillRect(0,0,512,7);lace=new T.CanvasTexture(c);lace.colorSpace=T.SRGBColorSpace;return lace;}
export function Lace({width=2.5,position=[0,0,0],rotation=[0,0,0]}){return <mesh position={position} rotation={rotation} userData={{tintExclude:true}}><planeGeometry args={[width,.19,1,1]}/><meshStandardMaterial map={laceMap()} alphaTest={.4} side={T.DoubleSide} roughness={1}/></mesh>;}
function drapeHeight(x,z){return -Math.max(0,Math.abs(x)-1.11)*1.45+.018*Math.sin(x*22+z*3)+.018*Math.cos(z*11);}
function DrapeLace({width,depth,edge}){
 const geometry=useMemo(()=>{
  const segments=64,g=new T.PlaneGeometry(1,.13,segments,1),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   const u=(i%(segments+1))/segments,row=Math.floor(i/(segments+1));
   const x=edge==='front'?(u-.5)*width:(edge==='left'?-1:1)*width/2;
   const z=edge==='front'?depth/2:(u-.5)*depth;
   p.setXYZ(i,x,drapeHeight(x,z)+.004-row*.13,z);
  }
  g.computeVertexNormals();return g;
 },[width,depth,edge]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} userData={{tintExclude:true}}><meshStandardMaterial map={laceMap()} alphaTest={.4} side={T.DoubleSide} roughness={1}/></mesh>;
}
export function Drape({slot='quilt',width=3.05,depth=2.7,position=[0,.84,.45],color='#f7eee0'}){
 const geometry=useMemo(()=>{const g=new T.PlaneGeometry(width,depth,32,28),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getY(i);p.setXYZ(i,x,drapeHeight(x,z),z);}g.computeVertexNormals();return g;},[width,depth]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group position={position} userData={{tintExclude:true}}><mesh geometry={geometry} castShadow receiveShadow><FabricMaterial owner="bedroomBed" slot={slot} color={color} side={T.DoubleSide}/></mesh>{['front','left','right'].map(edge=><DrapeLace key={edge} edge={edge} width={width} depth={depth}/>)}</group>;
}
