import React,{useMemo,useEffect,useRef} from 'react';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {useQuietMotion} from './quiet-motion.jsx';
import {QuietCanvas} from './quiet-canvas.jsx';
import {useThree} from '@react-three/fiber';
function FitBookPortrait({open}){
 const {camera,size,invalidate}=useThree();
 useEffect(()=>{
  camera.zoom=Math.min(size.width/130,size.height/110)*(open?30:43);
  camera.updateProjectionMatrix();
  invalidate();
 },[camera,size.width,size.height,open,invalidate]);
 return null;
}
function Block({position,size,color}){const g=useMemo(()=>new RoundedBoxGeometry(...size,2,.025),[...size]);useEffect(()=>()=>g.dispose(),[g]);return <mesh position={position} geometry={g}><meshStandardMaterial color={color} roughness={.83}/></mesh>;}
export function SampleBookModel({open=false}){
 const cover=useRef();useQuietMotion(cover,'rotation','z',open?2.7:0,7);
 const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=512;c.height=640;const x=c.getContext('2d');x.fillStyle='#eee3d0';x.fillRect(0,0,512,640);x.strokeStyle='#bba58a';x.lineWidth=2;x.strokeRect(35,35,442,570);x.strokeRect(45,45,422,550);x.textAlign='center';x.fillStyle='#82705b';x.font='italic 50px Georgia';x.fillText('Maison',256,270);x.font='18px Georgia';x.fillText('PATTERNS & LITTLE THINGS',256,315);x.font='14px Georgia';x.fillText('A HOME OF YOUR OWN',256,530);x.lineWidth=3;for(const side of [-1,1]){x.beginPath();x.ellipse(256+side*40,177,42,18,side*.25,0,Math.PI*2);x.stroke();}x.beginPath();x.moveTo(256,175);x.quadraticCurveTo(240,218,220,225);x.moveTo(256,175);x.quadraticCurveTo(275,210,292,221);x.stroke();const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;},[]);useEffect(()=>()=>texture.dispose(),[texture]);
 return <group rotation={[0,-.2,0]}>
 <Block position={[0,0,0]} size={[1.42,.08,1.85]} color="#d8c8b0"/><Block position={[.025,.15,0]} size={[1.31,.23,1.72]} color="#fff8e9"/>
 {[.065,.1,.135,.17,.205,.24].map(y=><Block key={y} position={[.04,y,.865]} size={[1.28,.007,.008]} color="#d9cdb9"/>)}
 <mesh position={[-.68,.15,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.15,.15,1.84,20,1,false,0,Math.PI]}/><meshStandardMaterial color="#d8c8b0"/></mesh>
 <Block position={[.34,.274,.52]} size={[.09,.009,1.05]} color="#c3959f"/><mesh position={[.34,.24,1.05]} rotation={[-.6,0,0]}><boxGeometry args={[.09,.012,.26]}/><meshStandardMaterial color="#c3959f"/></mesh>
 <group ref={cover} position={[-.68,.29,0]}><Block position={[.68,0,0]} size={[1.42,.07,1.85]} color="#efe4d1"/><mesh position={[.68,.037,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[1.37,1.80]}/><meshStandardMaterial map={texture} roughness={.8}/></mesh></group>
 </group>;
}
export function BookPortrait({open=false}){return <QuietCanvas orthographic camera={{position:[3,4,5],zoom:30}} dpr={[1,1.3]} gl={{alpha:true,antialias:true}}><FitBookPortrait open={open}/><ambientLight intensity={1.5}/><directionalLight position={[3,5,4]} intensity={2}/><SampleBookModel open={open}/></QuietCanvas>;}
