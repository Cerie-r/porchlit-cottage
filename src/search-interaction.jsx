import React,{createContext,useContext,useRef,useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {clamp} from './search-state.js';
export const StorageSlotRange=createContext(null);
export const SearchContext=createContext(null);
export const useSearch=()=>useContext(SearchContext);
export function SearchPart({id,position=[0,0,0],rotation=[0,0,0],move=[0,0,0],turn=[0,0,0],axis='up',children}){
 const c=useSearch(),drag=useRef(null),v=clamp(c?.values[id]);
 const group=useRef(),animated=useRef(v),{invalidate}=useThree();
 const clickMode=!!c?.clickPart?.(id);
 useEffect(()=>{invalidate();},[v,invalidate]);
 useFrame((_,dt)=>{
  if(!group.current)return;
  animated.current=clickMode?animated.current+(v-animated.current)*(1-Math.exp(-12*Math.min(dt,.05))):v;
  if(Math.abs(animated.current-v)<.001)animated.current=v;else invalidate();
  group.current.position.set(...position.map((n,i)=>n+move[i]*animated.current));
  group.current.rotation.set(...rotation.map((n,i)=>n+turn[i]*animated.current));
 });
 const stop=e=>{e.stopPropagation();e.nativeEvent?.stopPropagation();};
 const end=e=>{if(!drag.current)return;stop(e);drag.current=null;e.target.releasePointerCapture?.(e.pointerId);c?.busy(false);};
 return <group ref={group} position={position.map((n,i)=>n+move[i]*animated.current)} rotation={rotation.map((n,i)=>n+turn[i]*animated.current)} {...(c?clickMode?{onClick:e=>{stop(e);if(e.delta>5)return;c.set(id,v>.5?0:1);}}:{
 onPointerDown:e=>{stop(e);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,start:v};e.target.setPointerCapture?.(e.pointerId);c.busy(true);},
 onPointerMove:e=>{if(drag.current?.id!==e.pointerId)return;stop(e);const d=drag.current; c.set(id,d.start+(axis==='left'?d.x-e.clientX:axis==='right'?e.clientX-d.x:axis==='down'?e.clientY-d.y:d.y-e.clientY)/140);},
 onPointerUp:end,onPointerCancel:end,onLostPointerCapture:()=>{drag.current=null;c.busy(false);},onClick:e=>stop(e)
 }: {})}>{children}</group>;
}
