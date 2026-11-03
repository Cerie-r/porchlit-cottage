import React,{useEffect,useMemo} from 'react';
import * as T from 'three';
import {CarvedLine} from './rococo-details.jsx';
import {PearlStrand} from './pearls.jsx';
import {DecorMaterial} from './decor-context.jsx';

const gilt='#c6a56b';
// Gilt follows the room's chosen detail colour, like the carved arms do.
const Gilt=()=><DecorMaterial role="detail" color={gilt} metalness={.5} roughness={.34}/>;
// Turned gilt column, top to bottom: collar, knop, wide bowl, finial.
const column=[[0,0],[.028,-.01],[.022,-.04],[.044,-.08],[.028,-.12],[.058,-.17],[.074,-.2],[.05,-.23],[.03,-.25],[.02,-.28],[0,-.29]];

// The bedroom chandelier, hung from the ceiling rod's end: a gilt column,
// five scrolled arms holding candle bulbs, a crystal drop under each arm and
// pearls swagged from candle to candle. power is the room's main light.
export function BedroomChandelier({power=0}){
  const body=useMemo(()=>new T.LatheGeometry(column.map(([r,y])=>new T.Vector2(r,y)).reverse(),24),[]);
  useEffect(()=>()=>body.dispose(),[body]);
  const arms=5,reach=.42,cupY=-.15;
  const angle=i=>i/arms*Math.PI*2+.3;
  const at=(i,r,y)=>[Math.cos(angle(i))*r,y,Math.sin(angle(i))*r];
  const swag=i=>{const a=at(i,reach,cupY-.01),b=at(i+1,reach,cupY-.01),mid=[(a[0]+b[0])/2,cupY-.085,(a[2]+b[2])/2];return [a,mid,b];};
  const crystal=<meshStandardMaterial color="#eef4fb" roughness={.05} metalness={.15} transparent opacity={.82} emissive="#fff3dd" emissiveIntensity={power*.25}/>;
  return <group position={[0,-.35,0]} userData={{tintExclude:true}}>
    <mesh geometry={body} castShadow><Gilt/></mesh>
    {Array.from({length:arms},(_,i)=><group key={i}>
      <CarvedLine points={[at(i,.05,-.2),at(i,.18,-.29),at(i,.33,-.26),at(i,reach,cupY-.01)]} radius={.014} color={gilt}/>
      <group position={at(i,reach,cupY)}>
        <mesh position={[0,-.02,0]}><cylinderGeometry args={[.055,.04,.012,18]}/><Gilt/></mesh>
        <mesh><cylinderGeometry args={[.035,.026,.03,14]}/><Gilt/></mesh>
        <mesh position={[0,.055,0]}><cylinderGeometry args={[.016,.016,.08,12]}/><meshStandardMaterial color="#fbf6ee" roughness={.5}/></mesh>
        <mesh position={[0,.112,0]} scale={[1,1.7,1]}><sphereGeometry args={[.018,12,10]}/><meshStandardMaterial color="#fff6e0" emissive="#ffcf86" emissiveIntensity={.15+power*1.1}/></mesh>
      </group>
      <group position={at(i,.18,-.29)}>
        <mesh position={[0,-.02,0]}><cylinderGeometry args={[.003,.003,.03,6]}/><Gilt/></mesh>
        <mesh position={[0,-.06,0]} scale={[1,1.8,1]}><octahedronGeometry args={[.022,0]}/>{crystal}</mesh>
      </group>
      <PearlStrand points={swag(i)} radius={.0095} spacing={.024}/>
    </group>)}
    <mesh position={[0,-.33,0]} scale={[1,1.9,1]}><octahedronGeometry args={[.028,0]}/>{crystal}</mesh>
  </group>;
}

// A pleated fabric shade, wider at the bottom: the radius ripples round the
// rim so it reads as gathered cloth, not a plain cone.
function pleatedShade({top=.17,bottom=.33,height=.28,pleats=18,segments=144,rows=6}){
  const positions=[],indices=[];
  for(let r=0;r<=rows;r++){const v=r/rows,radius=top+(bottom-top)*v,y=-v*height;
    for(let s=0;s<=segments;s++){const a=s/segments*Math.PI*2,k=radius*(1+.045*Math.abs(Math.sin(a*pleats/2)));positions.push(Math.cos(a)*k,y,Math.sin(a)*k);}}
  for(let r=0;r<rows;r++)for(let s=0;s<segments;s++){const a=r*(segments+1)+s,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
// The study pendant: a cream pleated shade with gilt bands and finial, a
// warm bulb inside and a rose tassel on a short cord below.
export function StudyPendant({power=0}){
  const shade=useMemo(()=>pleatedShade({}),[]);
  useEffect(()=>()=>shade.dispose(),[shade]);
  return <group position={[0,-.35,0]} userData={{tintExclude:true}}>
    <mesh position={[0,-.02,0]}><sphereGeometry args={[.03,12,8]}/><Gilt/></mesh>
    <group position={[0,-.05,0]}>
      <mesh geometry={shade} castShadow><meshStandardMaterial color="#f6ecdc" roughness={.85} side={T.DoubleSide} emissive="#ffd9a6" emissiveIntensity={power*.45}/></mesh>
      {[[.17,0],[.33,-.28]].map(([r,y])=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[r*1.02,.008,6,64]}/><Gilt/></mesh>)}
      <mesh position={[0,-.2,0]}><sphereGeometry args={[.07,16,12]}/><meshStandardMaterial color="#fff6e3" emissive="#ffe0b0" emissiveIntensity={.1+power*1.2}/></mesh>
      <mesh position={[0,-.36,0]}><cylinderGeometry args={[.003,.003,.16,6]}/><Gilt/></mesh>
      <mesh position={[0,-.45,0]}><sphereGeometry args={[.012,8,6]}/><Gilt/></mesh>
      <mesh position={[0,-.49,0]}><coneGeometry args={[.022,.06,10]}/><meshStandardMaterial color="#d7a1b0" roughness={.7}/></mesh>
    </group>
  </group>;
}
