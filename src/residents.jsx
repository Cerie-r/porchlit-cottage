import {ApprovedResident} from './approved-resident.jsx';
import {readWardrobe} from '../body/wardrobe-state.js';
import React,{useMemo,useEffect,useRef,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import './residents.css';
import {createResidentHair} from './resident-hair.js';
import {clothTube,clothPanel,clothRibbon} from './resident-cloth.js';
import {tailoredShell,lapelGeometry,sculptedGarment,collarLeaf} from './resident-tailoring.js';
import {residentPlacement} from './resident-placement.js';
const skin='#f5dfce',cream='#faf3e7',rose='#ddbaae';
function Oval({p=[0,0,0],s=[1,1,1],r=[0,0,0],color=cream,rough=.85}){return <mesh position={p} scale={s} rotation={r} castShadow><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color={color} roughness={rough}/></mesh>;}
function Line({points,color='#554940',radius=.008}){const geometry=useMemo(()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,radius,6,false),[JSON.stringify(points),radius]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry}><meshStandardMaterial color={color} roughness={.85}/></mesh>;}
function HairCap({color,girl}){const geometry=useMemo(()=>createResidentHair(girl),[girl]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh name="sculpted-hair-v5" geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={.78}/></mesh>;}
function SmallArm(){const geometry=useMemo(()=>new THREE.LatheGeometry([[0,-.112],[.012,-.109],[.023,-.100],[.025,-.086],[.024,-.066],[.029,-.028],[.034,.006],[.031,.020],[0,.023]].map(p=>new THREE.Vector2(...p)),24),[]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry} castShadow><meshStandardMaterial color={skin} roughness={.85}/></mesh>;}
function LowerLeg({shoeColor='#cbb5a0'}){const geometry=useMemo(()=>new THREE.LatheGeometry([[0,-.088],[.028,-.086],[.034,-.068],[.034,-.045],[.042,-.005],[.044,.022],[.035,.035],[0,.036]].map(p=>new THREE.Vector2(...p)),24),[]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <group><mesh geometry={geometry} castShadow><meshStandardMaterial color={skin} roughness={.85}/></mesh><Oval p={[0,-.065,0]} s={[.037,.027,.037]}/><Oval p={[0,-.045,0]} s={[.039,.009,.039]} color="#e8ded0"/><Oval p={[0,-.084,.031]} s={[.061,.037,.089]} color={shoeColor}/><Oval p={[0,-.105,.032]} s={[.061,.009,.088]} color="#ae9683"/><Oval p={[0,-.063,.039]} s={[.059,.009,.022]} color={cream}/></group>;}
function Bow({p=[0,0,0],scale=1,color=rose,r=[0,0,0]}){return <group position={p} scale={scale} rotation={r}><Oval p={[-.075,0,0]} s={[.085,.055,.035]} r={[0,0,-.25]} color={color}/><Oval p={[.075,0,0]} s={[.085,.055,.035]} r={[0,0,.25]} color={color}/><Oval s={[.033,.04,.04]} color={color}/>{[-1,1].map(side=><Oval key={side} p={[side*.045,-.07,-.005]} s={[.025,.075,.013]} r={[0,0,side*.3]} color={color}/>)}</group>;}
function Skirt(){const g=useMemo(()=>{const q=new THREE.LatheGeometry([[.135,.414],[.143,.36],[.178,.28],[.211,.18],[.211,.173],[.207,.173],[.207,.18]].map(p=>new THREE.Vector2(...p)),80);const a=q.attributes.position;for(let i=0;i<a.count;i++){let x=a.getX(i),y=a.getY(i),z=a.getZ(i),k=1+.045*Math.cos(Math.atan2(z,x)*14)*(1-(y-.17)/.25);a.setXYZ(i,x*k,y,z*k*.88);}q.computeVertexNormals();return q;},[]);useEffect(()=>()=>g.dispose(),[g]);return <mesh geometry={g} castShadow><meshStandardMaterial color={cream} roughness={.96} side={THREE.DoubleSide}/></mesh>;}
function Fabric({type='panel',args,position=[0,0,0],color='#b8a28c'}){const geometry=useMemo(()=>type==='tube'?clothTube(args):type==='ribbon'?clothRibbon(...args):clothPanel(...args),[type,JSON.stringify(args)]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh position={position} geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={.96} side={THREE.DoubleSide}/></mesh>;}
function TrouserLeg({color='#b8a28c'}){return <><Fabric type="tube" color={color} args={{height:.32,top:[.069,.076],bottom:[.052,.059],thickness:.005,fold:.002}} position={[0,.03,0]}/><Fabric type="tube" color={color} args={{height:.018,top:[.055,.062],thickness:.005,fold:0}} position={[0,-.273,0]}/></>;}
function Overalls(){return <group name="outfit-slot" userData={{replaceableSlot:'outfit'}}>
  <Fabric type="tube" args={{height:.075,top:[.177,.132],bottom:[.175,.13],thickness:.005,fold:0}} position={[0,.34,0]}/>
  <Fabric args={[.23,.18,.005,.025]} position={[0,.425,.132]}/>
  <Fabric args={[.10,.065,.004,.004]} position={[0,.414,.166]} color="#c4af98"/>
  <Line points={[[-.043,.438,.175],[-.043,.389,.175],[.043,.389,.175],[.043,.438,.175]]} color="#eadbc5" radius={.0017}/>
  {[-1,1].map(side=><group key={side}><Fabric type="ribbon" args={[[[side*.09,.505,.144],[side*.11,.568,.096],[side*.115,.592,0],[side*.11,.56,-.1],[side*.09,.34,-.138]],.034,.005]}/><Oval p={[side*.09,.496,.159]} s={[.011,.011,.004]} color="#e9dbc3"/></group>)}
</group>;}
function ShirtBody({color=cream,coat=false,vest=false,girl=false}){const geometry=useMemo(()=>vest?tailoredShell({vest}):sculptedGarment({coat,girl}),[coat,vest,girl]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={.96} side={THREE.DoubleSide}/></mesh>;}
function Lapel({side}){const g=useMemo(()=>lapelGeometry(side),[side]);useEffect(()=>()=>g.dispose(),[g]);return <mesh geometry={g}><meshStandardMaterial color="#514d53" roughness={.95} side={THREE.DoubleSide}/></mesh>;}
function Collar({side}){const g=useMemo(()=>collarLeaf(side),[side]);useEffect(()=>()=>g.dispose(),[g]);return <mesh geometry={g} castShadow><meshStandardMaterial color="#fffaf0" roughness={.92}/></mesh>;}
export function ResidentModel({kind='girl',pose='stand',hairColor,eyeColor='#454344',outfit,bottom,shoeColor='#cbb5a0',accessory=true}){const girl=kind==='girl',sit=pose==='sit',hair=hairColor||(girl?'#806455':'#494448'),look=(!girl&&outfit==='dress')?'shirt':(outfit||(girl?'dress':'overalls')),skirt=girl&&(bottom?bottom==='skirt':look==='dress'),coat=look==='coat',tone=coat?'#454247':cream;return <group userData={{avatarRoot:true,coordinateOrigin:'feet',kind,pose}}>
 {[-1,1].map(side=><group key={side} name={'hip-'+side} position={[side*.085,sit?.24:.28,0]} rotation={[sit?-Math.PI/2:0,0,0]}>{skirt?<Oval p={[0,-.09,0]} s={[.046,.10,.048]} color={skin}/>:<TrouserLeg color={look==='overalls'?'#b8a28c':'#514d50'}/>}<group name={'knee-'+side} position={[0,-.17,0]} rotation={[sit?Math.PI/2:0,0,0]}><LowerLeg shoeColor={shoeColor}/></group></group>)}
 <Oval p={[0,.59,0]} s={[.057,.075,.053]} color={skin}/><ShirtBody color={tone} coat={coat} girl={girl}/>{skirt&&<Skirt/>}{look==='overalls'&&<Overalls/>}
 {[-1,1].map(side=><group key={side} position={[side*.192,.327,.008]} rotation={[0,0,side*.27]}><Fabric type="tube" color={coat?'#555057':'#ece5da'} args={{height:.022,top:[.038,.039],bottom:[.037,.038],thickness:.004,fold:0}}/><group position={[0,-.032,0]} scale={[.86,.56,.90]}><SmallArm/></group></group>)}
 {look==='vest'&&<group scale={[1.025,1,1.035]}><ShirtBody color="#d5c8b4" vest/></group>}
 {!coat&&[-1,1].map(side=><Collar key={side} side={side}/>)}
 <Fabric color={coat?'#39363d':'#eee7db'} args={[.012,.205,.003,.003]} position={[0,.433,.112]}/>
 {['shirt','vest'].includes(look)&&<Fabric type="ribbon" color="#51494c" args={[[[0,.555,.108],[0,.52,.121],[0,.423,.122],[0,.413,.123]],.022,.003]}/>}
 {coat&&<><Fabric color="#302f34" args={[.075,.19,.003,.003]} position={[0,.466,.115]}/>{[-1,1].map(side=><group key={side}><Lapel side={side}/><Fabric color="#514d53" args={[.052,.035,.003,.002]} position={[side*.092,.343,.104]}/></group>)}</>}
 {['shirt','coat'].includes(look)&&[.46,.41,.36].map(y=><Oval key={y} p={[.009,y,.116]} s={[.005,.005,.003]} color="#a49a95"/>)}
 {look==='dress'&&<><Bow p={[0,.52,.12]} scale={.24}/><Fabric type="tube" color="#dfcfc3" position={[0,.416,0]} args={{height:.018,top:[.148,.124],thickness:.003,fold:0}}/></>}
 <group name="head" position={[0,.94,0]}>
 <Oval s={[.43,.365,.34]} color={skin}/>{[-1,1].map(side=><group key={side}><Oval p={[side*.412,-.12,0]} s={[.065,.09,.055]} color={skin}/><Oval p={[side*.254,-.167,.269]} s={[.060,.026,.010]} color="#eac3b7" r={[0,side*.30,0]}/><Oval p={[side*.165,-.087,.318]} s={[.077,.085,.028]} color={eyeColor} rough={.7}/><Oval p={[side*.165-.022,-.059,.345]} s={[.012,.015,.004]} color="#eee6dc"/><Line points={[[side*.13,.034,.337],[side*.17,.044,.33],[side*.21,.036,.314]]} radius={.006} color={hair}/></group>)}
 <Line points={[[-.022,-.238,.265],[0,-.231,.274],[.022,-.238,.265]]} radius={.006} color="#9f7866"/>
 <group name="hair-slot" userData={{replaceableSlot:'hair',attachment:'head'}}>
 <HairCap color={hair} girl={girl}/>

 </group>
 {accessory&&<group name="accessory-slot"><Bow p={[.405,.24,.26]} scale={.85} r={[0,.35,-.28]} color={cream}/></group>}

 </group></group>;}
export const initialResidents={visible:true,boyPose:'stand',girlPose:'stand',boyHairColor:'#494448',girlHairColor:'#806455',boyEyeColor:'#454344',girlEyeColor:'#454344',playerKind:'girl',boyOutfit:'overalls',girlOutfit:'dress',boyAccessory:false,girlAccessory:true,boyShoeColor:'#cbb5a0',girlShoeColor:'#cbb5a0'};
export function residentsValue(value){const v={...initialResidents,...value,boyPose:'stand',girlPose:'stand'};if(v.boyOutfit==='dress')v.boyOutfit='shirt';delete v.boyBottom;delete v.girlBottom;return v;}
export function Turntable(){const {camera,gl,invalidate}=useThree();useEffect(()=>{const controls=new OrbitControls(camera,gl.domElement);controls.target.set(0,.75,0);controls.enablePan=false;controls.minDistance=1.7;controls.maxDistance=5;controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI*.6;controls.addEventListener('change',invalidate);controls.update();return()=>controls.dispose();},[camera,gl,invalidate]);return null;}
export {ResidentPanel} from './resident-wardrobe.jsx';

export function ResidentPortraits({value,onSelect}){const v=residentsValue(value),wardrobe=readWardrobe(v.wardrobeV1),kind=wardrobe.playerKind==='boy'?'boy':'girl';return <button className="resident-self-portrait" onClick={()=>onSelect(kind)} aria-label="我的形象 · 换装" title="我的形象"><Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:[0,0,2],fov:26}}><ambientLight intensity={1.5}/><directionalLight position={[1,3,4]} intensity={2}/><group position={[0,-.95,0]}><ApprovedResident kind={kind} wardrobe={wardrobe}/></group></Canvas></button>;}
