import {cleanSurfaces} from './legacy-finishes.js';
import {MaterialOwner,useDecorValue} from './decor-context.jsx';
import React,{createContext,useContext,useMemo,useState,useEffect,useLayoutEffect,useRef} from 'react';
import {useThree} from '@react-three/fiber';
import * as T from 'three';
import {laceCloth,disposeLaceCloth,clothFor,topOf} from './lace-cloth.js';
import {patterns,surfaceSlots,resolvePattern,applyPattern} from './surface-state.js';
import {relief} from './miniature-finish.jsx';
const SurfaceContext=createContext({state:{},set:()=>{}}),OwnerContext=createContext('');
export function SurfaceProvider({children}){const [state,set]=useState(()=>{try{return cleanSurfaces(JSON.parse(localStorage.getItem('porchlit-surfaces-v1'))||{});}catch{return {};}});useEffect(()=>{localStorage.setItem('porchlit-surfaces-v1',JSON.stringify(state));},[state]);return <SurfaceContext.Provider value={{state,set}}>{children}</SurfaceContext.Provider>;}
export function SurfaceScope({id,children}){return <OwnerContext.Provider value={id}><MaterialOwner id={id}>{children}<TableLace/></MaterialOwner></OwnerContext.Provider>;}
// A piece of lace on a table's top while one is laid there (its decor part 'lace'): found on the piece as drawn, in
// the group it is drawn in (the piece's own), so any table takes it.
function TableLace(){
 const on=useDecorValue('lace',null)==='lace',ref=useRef(),invalidate=useThree(s=>s.invalidate);
 useLayoutEffect(()=>{
  const holder=ref.current,container=holder?.parent;
  if(!on||!container)return;
  const top=topOf(container,holder);
  if(!top)return;
  const size=clothFor(top.width,top.depth,{round:top.round}),cloth=laceCloth(size.width,size.depth,{round:size.round,border:size.border});
  cloth.position.copy(top.position);cloth.quaternion.copy(top.quaternion);holder.add(cloth);invalidate();
  return()=>{holder.remove(cloth);disposeLaceCloth(cloth);invalidate();};
 },[on]);
 return <group ref={ref}/>;
}
const cache=new Map();
export function patternTexture(id){if(cache.has(id))return cache.get(id);const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle=patterns[id]?.color||'#f4eadb';x.fillRect(0,0,512,512);
 if(id==='rose')for(let j=0;j<4;j++)for(let i=0;i<4;i++){const a=40+i*128+(j%2)*25,b=45+j*128;x.strokeStyle='#879879';x.lineWidth=2;x.beginPath();x.moveTo(a-9,b+20);x.quadraticCurveTo(a+6,b+3,a,b-12);x.stroke();x.fillStyle='#9aa484';for(const k of [-1,1]){x.beginPath();x.ellipse(a+k*8,b+9,9,3,k*.6,0,7);x.fill();}for(let k=0;k<5;k++){x.fillStyle=k%2?'#d7a3ac':'#be8795';x.beginPath();x.ellipse(a+Math.cos(k*1.25)*5,b+Math.sin(k*1.25)*5,5,7,k,0,7);x.fill();}x.fillStyle='#f0c9b8';x.beginPath();x.arc(a,b,3,0,7);x.fill();}
 if(id==='blue'){x.fillStyle='#b2c7d1';for(let i=0;i<512;i+=48){x.fillRect(i,0,3,512);x.fillRect(i+7,0,1,512);}}
 if(id==='blush'){x.fillStyle='#d8b3ba';for(let y=40;y<512;y+=96)for(let a=40;a<512;a+=96){for(let k=0;k<5;k++){x.beginPath();x.ellipse(a+Math.cos(k*1.26)*5,y+Math.sin(k*1.26)*5,4,6,k,0,7);x.fill();}}}
 if(id==='stripe'){x.fillStyle='#cda4ad';for(let i=0;i<512;i+=64){x.fillRect(i,0,5,512);x.fillRect(i+10,0,1,512);}}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;cache.set(id,t);return t;}
export function usePattern(slot,owner){const scope=useContext(OwnerContext),{state}=useContext(SurfaceContext);return useDecorValue('fabric:'+slot,resolvePattern(state,owner||scope,slot),owner||scope);}
export function FabricMaterial({slot='fabric',owner,color='#fffaf3',...props}){const id=usePattern(slot,owner),map=useMemo(()=>patternTexture(id),[id]);return <meshStandardMaterial userData={{decorRole:"fabric",decorManaged:true}} map={map} color={id==='plain'?color:'#ffffff'} bumpMap={relief('fabric')} bumpScale={.002} roughness={.95} {...props}/>;}
export function SurfaceControls({owner}){const {state,set}=useContext(SurfaceContext);if(!surfaceSlots[owner])return null;return <div className="surface-controls">{Object.entries(surfaceSlots[owner]).map(([slot,label])=><label key={slot}>{label}<select aria-label={label+'花纹'} value={resolvePattern(state,owner,slot)} onChange={e=>set(s=>applyPattern(s,owner,slot,e.target.value))}>{Object.entries(patterns).filter(([id])=>(state.unlocked||Object.keys(patterns)).includes(id)).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select></label>)}</div>;}
export function FloorControls(){const {state,set}=useContext(SurfaceContext);return <label className="floor-layout">铺法<select aria-label="地板铺法" value={state.floorLayout||'plank'} onChange={e=>set(s=>({...s,floorLayout:e.target.value}))}><option value="plank">直铺</option><option value="herringbone">人字拼</option></select></label>;}
export function useFloorLayout(){const {state}=useContext(SurfaceContext);return useDecorValue('layout',state.floorLayout||'plank');}
export function Parquet({width,centerX,zMin,zMax,finish}){const map=useMemo(()=>{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle=finish.line;x.fillRect(0,0,512,512);x.save();x.translate(256,256);x.rotate(Math.PI/4);for(let y=-768;y<768;y+=128)for(let a=-768;a<768;a+=128){for(const [dx,dy,w,h] of [[0,0,96,32],[96,0,32,96],[32,32,64,32],[32,64,32,64],[0,32,32,96],[64,96,64,32]]){x.fillStyle=(a+y+dx)%256?finish.a:finish.b;x.fillRect(a+dx+1,y+dy+1,w-2,h-2);x.strokeStyle=finish.line+'55';x.lineWidth=.5;for(let k=6;k<(w>h?h:w);k+=6){x.beginPath();if(w>h){x.moveTo(a+dx+2,y+dy+k);x.lineTo(a+dx+w-2,y+dy+k);}else{x.moveTo(a+dx+k,y+dy+2);x.lineTo(a+dx+k,y+dy+h-2);}x.stroke();}}}x.restore();const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(width/4,(zMax-zMin)/4);t.anisotropy=4;return t;},[width,zMin,zMax,finish]);useEffect(()=>()=>map.dispose(),[map]);return <mesh position={[centerX,.006,(zMin+zMax)/2]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[width,zMax-zMin+.28]}/><meshStandardMaterial map={map} roughness={.7} bumpMap={relief('wood')} bumpScale={.002}/></mesh>;}
