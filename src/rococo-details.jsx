import {DecorMaterial} from './decor-context.jsx';
import {FabricMaterial} from './surfaces.jsx';
import React,{useMemo} from 'react';
import * as T from 'three';
const ivory='#f5ebdf',champagne='#cbb28c';
export function CarvedLine({points,color=champagne,radius=.018,role="detail"}){const curve=useMemo(()=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),[JSON.stringify(points)]);return <mesh castShadow><tubeGeometry args={[curve,24,radius,7,false]}/><DecorMaterial role={role} color={color} roughness={.48}/></mesh>;}
export function CabrioleLeg({x,z,height=.85}){return <CarvedLine role="paint" color={ivory} radius={.045} points={[[x,height,z],[x*1.08,height*.78,z*1.12],[x*.91,height*.39,z*.95],[x*1.04,.08,z*1.1],[x*1.12,.045,z*1.18]]}/>;}
export function ShellCrest({position=[0,0,0],scale=1}){return <group position={position} scale={scale}>{[-3,-2,-1,0,1,2,3].map(i=><mesh key={i} position={[i*.034,.045+(.11-Math.abs(i)*.018),0]} rotation={[0,0,-i*.16]} scale={[.029,.11,.025]}><sphereGeometry args={[1,12,8]}/><DecorMaterial role="detail" color={i%2?ivory:champagne} roughness={.5}/></mesh>)}{[-1,1].map(k=><CarvedLine key={k} points={[[0,0,0],[k*.15,-.035,0],[k*.28,.035,0],[k*.25,.12,0],[k*.19,.09,0]]}/> )}</group>;}
export function OvalFrame(){return <group position={[0,1.67,-.28]}>{[[.59,.75,.035,ivory],[.55,.71,.014,champagne],[.63,.79,.012,champagne]].map(([x,y,r,c],i)=><mesh key={i} scale={[x,y,1]}><torusGeometry args={[1,r,8,64]}/><DecorMaterial role="detail" color={c} roughness={.45}/></mesh>)}<mesh position={[0,0,-.025]} scale={[.59,.75,.035]}><sphereGeometry args={[1,32,20]}/><DecorMaterial role="paint" color={ivory}/></mesh><ShellCrest position={[0,.77,.015]} scale={.75}/>{[-1,1].map(k=><CarvedLine key={k} points={[[k*.5,-.47,0],[k*.68,-.57,0],[k*.72,-.4,0],[k*.65,-.37,0]]}/> )}</group>;}
// Curved solid joinery, shared by beds, seating and cabinet fronts.
export function RococoPanel({position=[0,0,0],width=1,height=1,depth=.08,color=ivory,fabric=false,slot="fabric"}){
 const shape=useMemo(()=>{const s=new T.Shape(),w=width/2,h=height;s.moveTo(-w,0);s.lineTo(w,0);s.lineTo(w,h*.76);s.bezierCurveTo(w,h*.96,w*.72,h*.83,w*.52,h*.91);s.bezierCurveTo(w*.22,h*.91,w*.3,h,0,h);s.bezierCurveTo(-w*.3,h,-w*.22,h*.91,-w*.52,h*.91);s.bezierCurveTo(-w*.72,h*.83,-w,h*.96,-w,h*.76);s.closePath();return s;},[width,height]);
 // The same options object from one render to the next: the fiber compares args by reference, and a fresh object
 // each time would extrude the panel over again whenever anything in the house changed.
 const extrude=useMemo(()=>({depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.012,bevelThickness:.01,curveSegments:16}),[depth]);
 return <group position={position}><mesh castShadow receiveShadow><extrudeGeometry args={[shape,extrude]}/>{fabric?<FabricMaterial color={color} slot={slot}/>:<DecorMaterial role="paint" color={color} roughness={.65}/>}</mesh><CarvedLine radius={.012} points={[[-width*.46,height*.75,depth+.016],[-width*.37,height*.85,depth+.016],[0,height*.95,depth+.016],[width*.37,height*.85,depth+.016],[width*.46,height*.75,depth+.016]]}/></group>;
}
export function CabinetCrown({position=[0,0,0],width=1}){return <group position={position}><RococoPanel width={width} height={.16} depth={.055}/><ShellCrest position={[0,.14,.065]} scale={Math.min(.6,width*.4)}/></group>;}
