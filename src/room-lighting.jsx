import React,{createContext,useContext,useState,useEffect} from 'react';
import {useDaylight} from './home-lighting.jsx';
import {CarvedLine} from './rococo-details.jsx';
import {BedroomChandelier,StudyPendant} from './chandelier.jsx';
import './room-lighting.css';
import {lightModes,roomLamps,lightState,changeLight,accentLevel,nightLight,wokenUp} from './light-state.js';
export {accentLevel};
export const RoomLightContext=createContext({...lightState(),patch:()=>{}});
export const useRoomLight=()=>useContext(RoomLightContext);
// night(room, on): while the two of them sleep, only the room's first lamp (the bedside one) glows low, the room
// as it was kept beside it and put back after; a page opened again finds nobody asleep, so it's put back then
// too. Changing the lights meanwhile drops what was kept: what she chose stays.
export function useHouseLights(){const [rooms,setRooms]=useState(()=>{try{return wokenUp(JSON.parse(localStorage.getItem('porchlit-lights-v1'))||{});}catch{return {};}});useEffect(()=>{try{localStorage.setItem('porchlit-lights-v1',JSON.stringify(rooms));}catch{}},[rooms]);return {get:room=>lightState(rooms[room]),patch:(room,p)=>setRooms(s=>({...s,[room]:changeLight(s[room],p,room)})),night:(room,on)=>setRooms(s=>nightLight(s,room,on)),
  // Every room's as kept, and all of them at once (what an AI living here changed: src/machine-decor.js).
  all:()=>rooms,set:next=>setRooms(next)};}
export function CeilingLamp({room}){const light=useRoomLight(),day=useDaylight(),power=light.main?light.mainLevel*light.brightness:0;const living=room==='downstairs';
 const bulb=(p,r=.12)=><mesh position={p}><sphereGeometry args={[r,16,10]}/><meshStandardMaterial color="#fff5e3" roughness={.4} emissive="#ffe3bb" emissiveIntensity={power*.75}/></mesh>;
 return <group position={[living?-1:0,3.47,living?.25:-.35]} onClick={e=>{e.stopPropagation();if(e.delta>5||light.editing)return;light.patch({main:!light.main});}}>
 <mesh><cylinderGeometry args={[.19,.23,.07,24]}/><meshStandardMaterial color="#ebdfca" roughness={.5}/></mesh>
 <mesh position={[0,-.18,0]}><cylinderGeometry args={[.018,.018,.34,12]}/><meshStandardMaterial color="#c3ab87" metalness={.35} roughness={.5}/></mesh>
 {living?<>{[0,1,2,3].map(i=>{const a=i*Math.PI/2,x=Math.cos(a)*.48,z=Math.sin(a)*.48;return <group key={i}><CarvedLine points={[[0,-.33,0],[x*.5,-.55,z*.5],[x,-.48,z],[x,-.34,z]]} radius={.023} color="#c3ab87"/>{bulb([x,-.28,z])}<mesh position={[x,-.39,z]}><cylinderGeometry args={[.16,.07,.06,16]}/><meshStandardMaterial color="#f1e6d5"/></mesh></group>;})}{bulb([0,-.48,0],.09)}</>:room==='bedroom'?<BedroomChandelier power={power}/>:<StudyPendant power={power}/>}
 {power>0&&<><pointLight position={[0,-.62,0]} color="#fff0dc" intensity={power*(day>.5?3:9)} distance={15} decay={1.2}/><directionalLight position={[0,-.5,2]} color="#fff1df" intensity={power*(1-day)*.65}/></>}
 </group>;
}
// `open` can be held outside (the phone menu opens it); otherwise it's its own.
// `sound` is {music, effects} for the two switches at the bottom (the house's
// music and its little sounds), changed through onSound({music} | {effects}).
export function LightRemote({room,value,onChange,open:shown,onOpenChange,sound,onSound}){const [own,setOwn]=useState(false);const open=shown??own,setOpen=v=>{const next=typeof v==='function'?v(open):v;if(onOpenChange)onOpenChange(next);else setOwn(next);};return <div className="light-remote"><button className="remote-toggle" aria-expanded={open} aria-label="灯光遥控器" onClick={()=>setOpen(v=>!v)}><svg width="16" height="23" viewBox="0 0 16 26" fill="none" stroke="currentColor"><rect x="2" y="1" width="12" height="24" rx="5"/><circle cx="8" cy="7" r="2"/><path d="M5 14h6m-6 4h6"/></svg><span>灯光</span></button>{open&&<section className="remote-panel" aria-label="灯光遥控器" onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}><header><span>LIGHT / {room==='downstairs'?'一楼':room==='bedroom'?'卧室':'书房'}</span><button aria-label="收起遥控器" onClick={()=>setOpen(false)}>×</button></header><h3>留一盏喜欢的光</h3><div className="remote-modes">{Object.entries(lightModes).map(([id,m])=><button key={id} aria-pressed={value.mode===id} onClick={()=>onChange({mode:id})}>{m.label}</button>)}</div><div className="remote-switches"><button aria-pressed={value.main} onClick={()=>onChange({main:!value.main})}>主灯 · {value.main?'开':'关'}</button><button aria-pressed={(roomLamps[room]||[]).every(([id])=>value.lamps[id])} onClick={()=>onChange({accent:!(roomLamps[room]||[]).every(([id])=>value.lamps[id])})}>氛围灯 · {(roomLamps[room]||[]).every(([id])=>value.lamps[id])?'全开':(roomLamps[room]||[]).some(([id])=>value.lamps[id])?'部分开':'全关'}</button></div><div className="remote-switches">{(roomLamps[room]||[]).map(([id,label])=><button key={id} aria-pressed={!!value.lamps[id]} onClick={()=>onChange({lamp:id})}>{label} · {value.lamps[id]?'开':'关'}</button>)}</div><label>亮度 <output>{Math.round(value.brightness*100)}%</output><input aria-label="灯光亮度" type="range" min=".2" max="1.4" step=".05" value={value.brightness} onChange={e=>onChange({brightness:Number(e.target.value)})}/></label><small>{value.mode==='custom'?'自定义 · ':''}直接点灯也会同步这里。</small>{sound&&<div className="remote-sound"><span>SOUND</span><div className="remote-switches"><button aria-pressed={!!sound.music} onClick={()=>onSound?.({music:!sound.music})}>音乐 · {sound.music?'开':'关'}</button><button aria-pressed={!!sound.effects} onClick={()=>onSound?.({effects:!sound.effects})}>声音 · {sound.effects?'开':'关'}</button></div><small>音乐关了以后，下次进门也不放；点留声机又会响。</small></div>}</section>}</div>;}
