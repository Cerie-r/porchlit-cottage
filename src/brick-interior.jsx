import {SeatTarget} from './seat-interaction.jsx';
import {TvScreen} from './tv-screen.jsx';
import {DecorMaterial,useDecorValue} from './decor-context.jsx';
import {CarvedLine,ShellCrest,CabrioleLeg,RococoPanel,CabinetCrown} from './rococo-details.jsx';
import {furnitureViews} from './room-camera.jsx';
import {FabricMaterial,SurfaceScope} from './surfaces.jsx';
import {useQuietMotion} from './quiet-motion.jsx';
import {SearchPart,useSearch,SearchContext} from './search-interaction.jsx';
import {MiniMaterial} from './miniature-finish.jsx';
import {MicroGarden} from './micro-botanical.jsx';
import {FurnitureTint} from './furniture-tint.jsx';
import {StudyStorage} from './study-storage.jsx';
import {PhotoSurface} from './art-model.jsx';
import {DessertDome} from './dessert-dining.jsx';
import {DessertBookModel} from './dessert-book.jsx';
import React, { useMemo, useLayoutEffect, useRef, useState, createContext, useContext } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Finished model parts: real narrow seams, small constant edge radii, no decorative studs.
// Dimensions are world units. The .006 gap is deliberately independent of part size.
const gold = "#b78b45";
const shadow = "#817366";
const dark = "#302c2d";
const DecorContext=createContext({});
const ItemContext=createContext(null);
export const HideContext=createContext(()=>{});
export const hideSpots={livingWindow:['客厅窗帘 · 后面','curtain'],bedroomWindow:['卧室窗帘 · 后面','curtain'],coffeeTable:['茶几 · 桌面','coffee-table'],rug:['客厅地毯','living-rug'],greenBook:['奶油色封皮书','book'],roseBook:['粉皮书','book'],sofa:['沙发 · 坐垫下','sofa'],armchair:['扶手椅 · 坐垫下','armchair'],wallArt:['画框 · 背面','frame'],wallPictures:['小画框 · 背面','frame'],wallShelf:['层架画框 · 背面','frame'],tvUnit:['电视机 · 背后','screen'],floorPlant:['花盆 · 底下','plant'],...Object.fromEntries(['islandFlowers','islandShelfFlowers','sinkFlowers','diningFlowers'].map(id=>[id,['花束 · 花盆底下','plant']]))};
export function storageAppearance(id){
 if(id?.startsWith('hide:')){const [label,kind]=hideSpots[id.slice(5)]||["物件","cupboard"];return {label,kind};}
 if(id?.startsWith('refrigerator:'))return {label:id.includes('0,0.06,0')?'冰箱 · 下层冷冻室':'冰箱 · 上层冷藏室',kind:id.includes('0,0.06,0')?'freezer':'fridge'};
 if(id?.startsWith('tv:'))return {label:`电视柜${id.endsWith('left')?'左':'右'}抽屉`,kind:'tv'};
 return {kind:id?.includes(':drawer:')?'kitchen':'cupboard'};
}

// Reusable contents: the room and the close-up use the same small models.
function EverydayContents({kind='kitchen'}) {
  if(kind==='tv')return <group>
    <group position={[-.19,.045,-.08]} rotation={[0,-.15,0]}>
      <Part s={[.12,.065,.3]} c="#68686c" radius={.012}/>
      <Part p={[0,.034,-.07]} s={[.077,.008,.065]} c="#a2aaa5"/>
      {[-.025,.025].flatMap(x=>[0,.045,.09].map(z=><Rod key={`${x}-${z}`} p={[x,.04,z]} radius={.012} length={.012} c="#eee7dc"/>))}
    </group>
    {[0,.055].map(x=><group key={x} position={[x,.036,-.14]}><Rod radius={.02} length={.14} r={[Math.PI/2,0,0]} c="#b9a47d"/><Rod p={[0,0,.075]} radius={.013} length={.014} r={[Math.PI/2,0,0]} c="#777879"/></group>)}
    <Part p={[-.14,.025,.15]} s={[.2,.025,.12]} c="#d5dfd6"/>
    <Part p={[-.14,.04,.15]} s={[.18,.008,.1]} c="#fff9ea"/>
  </group>;
  return <group>
    {[-.22,-.14].map(x=><group key={x} position={[x,.03,-.05]}><Part p={[0,0,.035]} s={[.019,.025,.2]} c="#b6a790"/><mesh position={[0,0,-.09]} scale={[.035,.015,.052]}><sphereGeometry args={[1,16,10]}/><meshStandardMaterial color="#b6a790" roughness={.3} metalness={.4}/></mesh></group>)}
    <Part p={[-.1,.026,.16]} s={[.23,.035,.13]} c="#e3dbcb"/>
    <Part p={[-.1,.048,.16]} s={[.22,.012,.12]} c="#fff8ec"/>
    <group position={[.02,.025,-.15]}><Rod radius={.045} length={.06} c="#e0d0b1"/><Rod p={[0,.039,0]} radius={.047} length={.018} c="#ba9a6b"/></group>
  </group>;
}
export function DrawerDetail({portrait=false,theme,kind,gift,onGift,children,photo,angle=0,backVisible=false}) {
  const search=useSearch();
  const assembly=useRef();
  useQuietMotion(assembly,'position','z',.1,9);
  if(kind==='coffee-table')return <group scale={1.3}><BrickCoffeeTable theme={theme}/><group position={[0,.07,0]}>{children}</group></group>;
  if(kind?.startsWith('study-'))return <StudyStorage kind={kind} Part={Part} Rod={Rod} gift={gift} onGift={onGift}>{children}</StudyStorage>;
  if(kind==='frame')return <group rotation={[0,angle,0]} scale={portrait?[2,3.7,3]:3}>
    <Part role="paint" s={[.96,.72,.055]} c={theme.wood}/>
    <Part p={[0,0,.033]} s={[.84,.60,.018]} c="#fff7eb"/>
    <Part p={[0,0,.046]} s={[.65,.43,.008]} c="#dce5df"/>
    <mesh position={[.12,.09,.053]}><circleGeometry args={[.065,32]}/><meshStandardMaterial color="#f3dba8"/></mesh>
    <Part p={[0,-.12,.055]} s={[.65,.06,.008]} c="#b3c6b8"/>
    <PhotoSurface item={photo} width={.76} height={.57} position={[0,0,.065]}/>
    <Part p={[0,0,-.039]} s={[.84,.60,.018]} c="#b9a99b"/>
    {[-.37,.37].map(x=><Part key={x} p={[x,0,-.055]} s={[.035,.12,.016]} c="#8a7769"/>)}
    {backVisible&&<group position={[0,-.05,-.075]} rotation={[Math.PI/2,0,0]}>
      {children}
      {gift&&<group position={[.18,.02,0]} onClick={e=>{e.stopPropagation();if(e.delta<5)onGift();}}>
        <Part s={[.28,.015,.19]} c="#fff5f0"/><Rod p={[0,.015,0]} radius={.024} length={.008} c="#b78d99"/>
      </group>}
    </group>}
  </group>;
  return <group ref={assembly} position={[0,-.25,-.16]} scale={3}>
    {['tv','kitchen'].includes(kind)&&<> <Part role="paint" p={[0,.27,0]} s={[1.04,.05,.78]} c={theme.trim}/><Part role="paint" p={[0,.12,-.38]} s={[1.04,.3,.04]} c={theme.cabinetDoor}/><SearchPart id="open" move={[0,0,.75]} axis="down">

    <Tiles p={[0,0,0]} s={[.94,.055,.7]} nx={5} nz={3} c={theme.trim}/>
    {[-.45,.45].map(x=><Courses key={x} p={[x,.11,0]} s={[.045,.22,.7]} nx={1} ny={3} c={theme.cabinetDoor}/>)}
    <Courses p={[0,.11,-.33]} s={[.86,.22,.045]} nx={6} ny={3} c={theme.cabinetDoor}/>
    <Panel p={[0,.115,.35]} w={.97} h={.25} c={theme.cabinetDoor} knob={false}/>
    <Rod p={[0,.12,.435]} radius={.013} length={.25} r={[0,0,Math.PI/2]}/>
    {[-.12,.12].map(x=><Rod key={x} p={[x,.12,.405]} radius={.016} length={.06} r={[Math.PI/2,0,0]}/>)}
    <group position={[0,.031,-.25]} scale={.45}><EverydayContents kind={kind}/></group>
    </SearchPart></>}
    {kind==='cupboard'&&<group>
      <Tiles s={[.94,.05,.6]} nx={5} nz={3} c={theme.trim}/>
      {[-.45,.45].map(x=><Courses key={x} p={[x,.32,0]} s={[.045,.64,.6]} nx={1} ny={6} c={theme.cabinetDoor}/>)}
      <Courses p={[0,.32,-.28]} s={[.86,.64,.04]} nx={6} ny={6} c={theme.cabinetDoor}/>
      <Part role="paint" p={[0,.67,0]} s={[.94,.04,.6]} c={theme.trim}/>
      <Part role="paint" p={[0,.33,0]} s={[.86,.025,.54]} c={theme.trim}/>
      <SearchPart id="open" position={[-.46,.33,.3]} turn={[0,-1.9,0]} axis="right"><Panel p={[.46,0,0]} w={.92} h={.63} c={theme.cabinetDoor}/></SearchPart>
      <group position={[-.06,.36,0]} scale={.8}><EverydayContents/></group>
    </group>}
    {kind==='frame'&&<group rotation={[-.65,0,0]} position={[0,.12,-.1]}>
      <Panel w={.96} h={.66} c={theme.wood} knob={false}/><Part p={[0,0,.05]} s={[.82,.52,.025]} c="#c9b9ae"/>
      {[-.34,.34].map(x=><Part key={x} p={[x,0,.07]} s={[.045,.15,.02]} c="#9b8b87"/>)}
    </group>}
    {kind==='screen'&&<group position={[0,.3,-.14]}>
      <Part s={[1,.58,.065]} c="#40373f"/><Part p={[0,-.06,.05]} s={[.65,.32,.07]} c="#524650"/>
      {[-.25,-.15,-.05,.05,.15,.25].map(x=><Part key={x} p={[x,.04,.091]} s={[.025,.08,.01]} c="#28242b"/>)}
      <Part p={[0,-.3,0]} s={[.08,.18,.07]} c="#40373f"/>
    </group>}
    {kind==='sofa'&&<group position={[0,.15,0]} scale={.42}><BrickSofa theme={theme}/></group>}
    {kind==='armchair'&&<group position={[0,.15,0]} scale={.7}><BrickArmchair theme={theme}/></group>}
    {['fridge','freezer'].includes(kind)&&<group position={[0,-.25,0]} scale={.7}><FridgeCompartment theme={theme} h={kind==='fridge'?1.46:.68} open onToggle={()=>{}} detail/></group>}
    {kind==='plant'&&<group>
      <Rod p={[0,.02,0]} radius={.27} length={.035} c={theme.accent}/>
      <group position={[-.28,.16,-.18]} rotation={[0,0,-.35]} scale={.48}><MicroBouquet theme={theme}/></group>
    </group>}
    <group position={[0,['sofa','armchair'].includes(kind)?.15:['fridge','freezer'].includes(kind)?-.20:kind==='cupboard'?.36:.04,['tv','kitchen'].includes(kind)?(search?.values.open||0)*.75:0]}>
    {children}
    {gift&&<group position={[.28,.065,-.24]} scale={.55} rotation={[0,-.15,0]} onClick={e=>{e.stopPropagation();onGift();}} onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='default';}}>
      <Part s={[.28,.018,.19]} c="#fff7f2"/>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]}><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([-.14,.095,0,.14,.095,0,0,-.025,0]),3]}/></bufferGeometry><meshStandardMaterial color="#ead2db" side={THREE.DoubleSide}/></mesh>
      <Rod p={[0,.021,.01]} radius={.025} length={.012} c="#b78d99"/>
    </group>}
    </group>
  </group>;
}
export const smallFurniture = {
 islandFlowers:{label:'岛台花束',p:[-.65,1.1,-.12],bounds:[-.8,.8,-.3,.3]},
 islandBread:{label:'面包与木盘',p:[-.1,1.13,0],bounds:[-.7,.7,-.3,.3]},
 islandCake:{label:'草莓小蛋糕',p:[.57,1.11,0],bounds:[-.7,.7,-.25,.25]},
 islandShelfFlowers:{label:'层板花束',p:[.51,.56,.02],bounds:[.05,.7,-.2,.2]},
 islandCup1:{label:'层板茶杯',p:[.6,.16,.14],bounds:[-.7,.7,-.2,.25]},
 islandCup2:{label:'层板小杯',p:[.27,.16,.14],bounds:[-.7,.7,-.2,.25]},
 sinkFlowers:{label:'水槽旁花束',p:[-1,1.02,-2.48],bounds:[-1.12,-.85,-2.65,-2.2]},
 spice1:{label:'调味罐一',p:[.72,1.04,-2.53],bounds:[.25,2.8,-2.65,-2.2]},
 spice2:{label:'调味罐二',p:[1.4,1.04,-2.53],bounds:[.25,2.8,-2.65,-2.2]},
 prepCup:{label:'备餐台茶杯',p:[0,1.02,.07],bounds:[-.25,.25,-.25,.25]},
 diningFlowers:{label:'餐桌花束',p:[0,.75,0],bounds:[-.48,.48,-.27,.27]},
 diningCup1:{label:'餐桌茶杯一',p:[-.37,.75,.12],bounds:[-.5,.5,-.3,.3]},
 diningCup2:{label:'餐桌茶杯二',p:[.37,.75,-.12],bounds:[-.5,.5,-.3,.3]}
};
export const kitchenFurniture = {
  ...Object.fromEntries(Object.entries(smallFurniture).map(([id,v])=>[id,{position:v.p,rotationY:0}])),
  sinkRun:{position:[.9,0,-2.43],rotationY:0},
  stove:{position:[2.77,0,-.78],rotationY:0},
  cornerCabinet:{position:[2.77,0,-1.6],rotationY:0},
  prepCabinet:{position:[2.77,0,.04],rotationY:0},
  upperLeft:{position:[1.22,1.62,-2.57],rotationY:0},
  upperRight:{position:[2.02,1.62,-2.57],rotationY:0},
  refrigerator:{position:[3.24,0,.78],rotationY:0},
  island:{position:[.8,0,.18],rotationY:0},
  stoolLeft:{position:[.25,0,1.05],rotationY:0},
  stoolRight:{position:[1.14,0,1.05],rotationY:0},
  diningTable:{position:[-.9,0,-2.05],rotationY:0},
  diningChair1:{position:[-1.78,0,-2.05],rotationY:Math.PI/2},
  diningChair2:{position:[-.02,0,-2.05],rotationY:-Math.PI/2},
  diningChair3:{position:[-.9,0,-1.24],rotationY:0}
};
function Move({id,p,children}) {
  const ctx=useContext(DecorContext),hide=useContext(HideContext),item=ctx.furniture?.[id]||kitchenFurniture[id];
  return <ItemContext.Provider value={id}><group userData={{supportId:id,cameraPlace:id}} position={item.position} rotation={[0,item.rotationY,0]} onClick={e=>{if(e.delta>5)return;if(ctx.decorMode){e.stopPropagation();ctx.onSelect(id);}else if(hideSpots[id]||furnitureViews[id]){e.stopPropagation();hide(`hide:${id}`);}}}><group position={p.map(v=>-v)}><SurfaceScope id={id}><FurnitureTint color={item.color}>{children}</FurnitureTint></SurfaceScope></group></group></ItemContext.Provider>;
}
function Prop({id,children}) {return <Move id={id} p={smallFurniture[id].p}>{children}</Move>;}
function StorageGift({slot,p}) {
 const ctx=useContext(DecorContext),gift=ctx.storage?.[slot]?.gift;
 if(!gift)return null;
 return <group position={p} onClick={e=>{e.stopPropagation();if(e.delta>5)return;if(!ctx.decorMode){ctx.onStorageChange(slot,{open:true});ctx.onStorage(slot);}}}><Part s={[.16,.12,.13]} c="#c49bab"/><Part p={[0,.065,0]} s={[.17,.016,.035]} c="#f8eddc"/></group>;
}
function Part({ p=[0,0,0], s=[1,1,1], c="#f6eee1", r=[0,0,0], radius=.014, metal=false, finish="enamel", slot="fabric", owner, role=null }) {
  const geometry=useMemo(()=>new RoundedBoxGeometry(...s,2,Math.min(radius,...s.map(v=>v*.22))),[...s,radius]);
  React.useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh position={p} rotation={r} geometry={geometry} castShadow receiveShadow><>{finish==="fabric"&&!metal?<FabricMaterial slot={slot} owner={owner} color={c}/>:<MiniMaterial role={role} color={c} finish={finish} {...(metal?{roughness:.27,metalness:.65}:{})}/>}</></mesh>;
}
function Rod({p=[0,0,0], radius=.025, length=.2,c=gold,r=[0,0,0],role=null}) {
  return <mesh position={p} rotation={r} castShadow receiveShadow><cylinderGeometry args={[radius,radius,length,20]}/><DecorMaterial role={role} color={c} roughness={.28} metalness={c===gold?.65:.05}/></mesh>;
}
function Ring({p=[0,0,0], radius=.08,tube=.015,c=gold,r=[0,0,0],arc=Math.PI*2,role=null}) {
  return <mesh position={p} rotation={r} castShadow><torusGeometry args={[radius,tube,8,24,arc]}/><DecorMaterial role={role} color={c} roughness={.3} metalness={c===gold?.65:0}/></mesh>;
}
function Tiles({p=[0,0,0],s=[1,.1,1],nx=4,nz=2,c="#f8f0e4"}) {
 nx=Math.max(nx,Math.ceil(s[0]/.16));nz=Math.max(nz,Math.ceil(s[2]/.16));const ref=useRef();
 useLayoutEffect(()=>{const o=new THREE.Object3D();let i=0;for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){o.position.set((x+.5)*s[0]/nx-s[0]/2,0,(z+.5)*s[2]/nz-s[2]/2);o.scale.set(s[0]/nx-.003,s[1],s[2]/nz-.003);o.updateMatrix();ref.current.setMatrixAt(i++,o.matrix);}ref.current.instanceMatrix.needsUpdate=true;},[...s,nx,nz]);
 return <instancedMesh ref={ref} position={p} args={[null,null,nx*nz]} castShadow receiveShadow><boxGeometry/><meshStandardMaterial color={c} roughness={.38}/></instancedMesh>;
}
function Courses({p=[0,0,0],s=[1,1,.12],nx=4,ny=4,c="#f3eadc"}) {
  nx=Math.max(nx,Math.ceil(s[0]/.15));ny=Math.max(ny,Math.ceil(s[1]/.09));
  const parts=useMemo(()=>{
    const out=[];const w=s[0]/nx,h=s[1]/ny;
    for(let y=0;y<ny;y++) {
      const offset=y%2?w/2:0;
      for(let x=-1;x<=nx;x++) {
        const left=Math.max(-s[0]/2,-s[0]/2+x*w+offset),right=Math.min(s[0]/2,-s[0]/2+(x+1)*w+offset);
        if(right-left>.01) out.push({p:[(left+right)/2,(y+.5)*h-s[1]/2,0],s:[right-left-.003,h-.003,s[2]]});
      }
    }
    return out;
  },[...s,nx,ny]);
  // Batch the repeated small bricks to keep the mobile draw-call budget reasonable.
  const ref=useRef();
  useLayoutEffect(()=>{const o=new THREE.Object3D();parts.forEach((v,i)=>{o.position.set(...v.p);o.scale.set(...v.s);o.updateMatrix();ref.current.setMatrixAt(i,o.matrix);});ref.current.instanceMatrix.needsUpdate=true;},[parts]);
  return <instancedMesh ref={ref} position={p} args={[null,null,parts.length]} castShadow receiveShadow><boxGeometry/><meshStandardMaterial color={c} roughness={.42}/></instancedMesh>;
}
function Panel({p=[0,0,0],w=.6,h=.65,c="#f8f0e4",knob=true}) {
 return <group position={p}><Part role="paint" s={[w-.01,h-.01,.045]} c={c} radius={.045}/><RococoPanel position={[0,-h*.41,.027]} width={w*.82} height={h*.82} depth={.018} color={c}/>{h>.5&&<ShellCrest position={[0,h*.28,.065]} scale={Math.min(.32,w*.35)}/>}{knob&&<Ring role="detail" p={[w*.30,.02,.08]} radius={.026} tube={.007}/>}</group>;
}

function Hinge({p=[0,0,0],open,onToggle,children}) {
  const search=useSearch();
  const ref=useRef();
  const ctx=useContext(DecorContext),id=useContext(ItemContext);
  useQuietMotion(ref,'rotation','y',open?-1.45:0);
  if(search)return <SearchPart id="open" position={p} turn={[0,-1.45,0]} axis="right">{children}</SearchPart>;
  return <group ref={ref} position={p} onClick={e=>{e.stopPropagation();if(e.delta>5)return;if(ctx.decorMode&&id){ctx.onSelect(id);return;}onToggle();}}>{children}</group>;
}
function Drawer({p=[0,0,0],w=.6,h=.2,depth=.5,c,open:externalOpen,onToggle,children,slot}) {
  const ctx=useContext(DecorContext),id=useContext(ItemContext);
  const [localOpen,setOpen]=useState(false);const open=slot?Boolean(ctx.storage?.[slot]?.open):(externalOpen??localOpen);const ref=useRef();
  useQuietMotion(ref,'position','z',p[2]+(open?depth*.8:0));
  return <group ref={ref} position={p} onClick={e=>{e.stopPropagation();if(e.delta>5)return;if(ctx.decorMode&&id){ctx.onSelect(id);return;}if(slot){ctx.onStorageChange(slot,{open:!open});ctx.onStorage(!open?slot:null);}else onToggle?onToggle():setOpen(v=>!v);}}>
    <Part role="paint" p={[0,-h/2+.025,-depth/2]} s={[w,.04,depth]} c={c}/>
    {[-1,1].map(sign=><Part role="paint" key={sign} p={[sign*(w/2-.02),0,-depth/2]} s={[.04,h,depth]} c={c}/>)}
    <Part role="paint" p={[0,0,-depth+.02]} s={[w,h,.04]} c={c}/><Panel w={w} h={h} c={c} knob={false}/>
    <Rod role="detail" p={[0,.02,.08]} radius={.018} length={w*.3} r={[0,0,Math.PI/2]}/>{children}{slot&&<><group position={[0,-h/2+.048,-depth/2]} scale={.65}><EverydayContents/></group><StorageGift slot={slot} p={[w*.25,-h/2+.11,-depth/2]}/></>}
  </group>;
}
function Cabinet({p=[0,0,0],w=.72,h=.86,depth=.7,theme,drawers=false}) {
  const ctx=useContext(DecorContext),id=useContext(ItemContext);
  const slot=`${id}:cabinet:${p.join(',')}`;
  const open=Boolean(ctx.storage?.[slot]?.open);
  const toggle=()=>{ctx.onStorageChange(slot,{open:!open});ctx.onStorage(!open?slot:null);};
  const c=theme.cabinetDoor;
  return <group position={p}><CabinetCrown position={[0,h-.30,depth/2-.03]} width={w}/>
    {[-1,1].map(sign=><Part role="paint" key={sign} p={[sign*(w/2-.035),h/2,0]} s={[.055,h,depth]} c={theme.cabinet}/>)}
    <Part role="paint" p={[0,h/2,-depth/2+.025]} s={[w,h,.045]} c={theme.cabinet}/>
    {(drawers?[.09,h-.03]:[.09,h*.51,h-.03]).map(y=><Part key={y} p={[0,y,0]} s={[w-.08,.045,depth-.04]} c={c}/>)}
    <Part p={[0,.065,depth/2]} s={[w-.015,.1,.045]} c={shadow}/>
    {!drawers&&<StorageGift slot={slot} p={[0,.18,.04]}/>}
    {drawers?[0,1,2].map(i=><Drawer key={i} slot={`${slot}:drawer:${i}`} p={[0,.22+i*.23,depth/2]} w={w-.09} h={.205} depth={depth-.08} c={c}/>):<Hinge p={[-(w-.04)/2,h/2+.03,depth/2]} open={open} onToggle={toggle}><Panel p={[(w-.04)/2,0,0]} w={w-.04} h={h-.15} c={c}/></Hinge>}
  </group>;
}
function Cup({p=[0,0,0],c="#f6eee1"}) {
  return <group position={p}><Rod p={[0,.065,0]} radius={.065} length={.13} c={c}/><Rod p={[0,.132,0]} radius={.05} length={.004} c="#70513d"/><Ring p={[.075,.075,0]} radius={.041} tube={.012} c={c}/></group>;
}
function Plant({p=[0,0,0],scale=1}) {
  return <group position={p} scale={scale}><MicroBouquet small/></group>;
}

function Blossom({p,c="#bc94c9",size=.045}) {
  return <group position={p}>{Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5;return <Rod key={i} p={[Math.cos(a)*size*.72,0,Math.sin(a)*size*.72]} radius={size*.52} length={size*.3} c={c}/>;})}<Rod p={[0,.009,0]} radius={size*.24} length={.018} c="#e9d7a6"/></group>;
}
function MicroBouquet({small=false,theme}) {return <MicroGarden scale={small?.45:1} color={theme?.cabinetDoor||"#efe3d4"}/>;}
export function BrickFloorPlant({theme}) { return <MicroBouquet theme={theme}/>; }
function Window({theme}) {
  return <group position={[-.33,1.94,-2.82]}>
    <Part s={[1.18,1.3,.04]} c="#a8c2bd"/>
    {[-.63,.63].map(x=><Part role="paint" key={x} p={[x,0,.05]} s={[.08,1.49,.12]} c={theme.trim}/>)}
    {[-.71,.71].map(y=><Tiles key={y} p={[0,y,.05]} s={[1.34,.08,.15]} nx={5} nz={1} c={theme.trim}/>)}
    <Part role="paint" p={[0,0,.09]} s={[.035,1.36,.04]} c={theme.trim}/><Part role="paint" p={[0,0,.09]} s={[1.2,.035,.04]} c={theme.trim}/>
    <Tiles p={[0,-.77,.14]} s={[1.45,.08,.35]} nx={5} nz={1} c={theme.trim}/>
  </group>;
}
function FridgeCompartment({theme,p=[0,0,0],h=1.46,open:forcedOpen,onToggle,detail=false}) {
  const ctx=useContext(DecorContext),id=useContext(ItemContext);
  const slot=`${id}:cabinet:${p.join(',')}`;
  const open=forcedOpen??Boolean(ctx.storage?.[slot]?.open);
  const toggle=onToggle||(()=>{ctx.onStorageChange(slot,{open:!open});ctx.onStorage(slot);});
  const c=theme.cabinetDoor;
  return <group position={p}>
    {[-.45,.45].map(x=><Part role="paint" key={x} p={[x,h/2,0]} s={[.055,h,.76]} nx={1} ny={Math.round(h/.15)} c={c}/>)}
    <Part p={[0,h/2,-.35]} s={[.85,h,.055]} c="#f5f4f0"/>
    <Part p={[0,.045,0]} s={[.87,.055,.72]} c="#f5f4f0"/>
    {!detail&&<Part role="paint" p={[0,h,0]} s={[.95,.06,.79]} nx={4} nz={3} c={c}/>}
    {(h>1?[.48,.93]:[.34]).map(y=><group key={y}>
      <mesh position={[0,y,0]}><boxGeometry args={[.83,.022,.65]}/><meshPhysicalMaterial color="#dce9e6" transparent opacity={.34} roughness={.12}/></mesh>
      <Part p={[0,y,.32]} s={[.84,.025,.025]} c="#b9c8c5"/>
    </group>)}
    <Part p={[0,h-.09,-.31]} s={[.5,.035,.018]} c="#fff6cf"/>
    <Hinge p={[-.45,h/2,.39]} open={open} onToggle={toggle}>
      <Part role="paint" p={[.45,0,0]} s={[.89,h-.045,.085]} c={c} radius={.045}/><RococoPanel position={[.45,-h*.4,.05]} width={.72} height={h*.8} depth={.012} color={c}/>
      <Part p={[.45,0,-.05]} s={[.79,h-.13,.018]} c="#e8eeea" radius={.01}/>
      <Rod p={[.79,.03,.08]} radius={.018} length={Math.min(.4,h*.5)} c="#aa9690"/>
      {[-h*.25,h*.22].map(y=><group key={y}><Part p={[.45,y,-.13]} s={[.71,.035,.15]} c="#f3f4ef"/><Part p={[.45,y+.06,-.2]} s={[.71,.1,.025]} c="#dce8e1"/></group>)}
    </Hinge>
    {!detail&&<StorageGift slot={slot} p={[.2,.13,.04]}/>}
  </group>;
}
export const fridgeSlots={upper:'refrigerator:cabinet:0,0.75,0',lower:'refrigerator:cabinet:0,0.06,0'};
export function RefrigeratorPreview({theme,containers,onToggle,active,children}){return <group position={[0,-1.12,0]}>
 <SearchContext.Provider value={null}>
 <FridgeCompartment p={[0,.06,0]} h={.68} theme={theme} detail open={!!containers[fridgeSlots.lower]?.open} onToggle={()=>onToggle(fridgeSlots.lower)}/>
 <FridgeCompartment p={[0,.75,0]} h={1.46} theme={theme} detail open={!!containers[fridgeSlots.upper]?.open} onToggle={()=>onToggle(fridgeSlots.upper)}/>
 </SearchContext.Provider>
 <Part role="paint" p={[0,2.25,0]} s={[.97,.1,.85]} c={theme.cabinetDoor}/><Part p={[0,.74,0]} s={[.94,.04,.78]} c={theme.cabinetDoor}/><CabinetCrown position={[0,2.3,.35]} width={1.01}/><FridgeDressing theme={theme}/>
 {containers[active]?.open&&<group position={[0,active===fridgeSlots.lower ? .17 : .88,0]}>{children}</group>}
 </group>;}
function Refrigerator({theme}) {
  const c=theme.cabinetDoor;
  return <group position={[3.24,0,.78]} rotation={[0,-Math.PI/2,0]}>
    <FridgeCompartment p={[0,.06,0]} h={.68} theme={theme}/>
    <FridgeCompartment p={[0,.75,0]} h={1.46} theme={theme}/>
    <CabinetCrown position={[0,2.3,.35]} width={1.01}/><Part p={[0,2.25,0]} s={[.97,.1,.85]} nx={3} nz={3} c={c}/>
    <Part p={[0,.04,0]} s={[.85,.07,.72]} c={shadow}/>
    <FridgeDressing theme={theme}/>
  </group>;
}
// The fridge stands side-on to the room, so its plain flank is what shows:
// give that flank the same carved panels as the doors, and keep a basket and
// a little bouquet on top.
function FridgeDressing({theme}){
  const c=theme.cabinetDoor;
  return <group>
    {[[.14,.52],[.9,1.16]].map(([y,h])=><group key={y} position={[.485,y,0]} rotation={[0,Math.PI/2,0]}><RococoPanel width={.6} height={h} depth={.012} color={c}/></group>)}
    <group position={[-.12,2.3,-.1]}>
      <Rod p={[0,.07,0]} radius={.19} length={.14} c="#c9a678"/>
      {[.035,.075,.115].map(y=><Ring key={y} p={[0,y,0]} radius={.192} tube={.008} c="#b48f60" r={[Math.PI/2,0,0]}/>)}
      <Part p={[.02,.15,.02]} s={[.3,.05,.22]} c="#f3ece0" radius={.03}/>
      <Ring p={[0,.2,0]} radius={.15} tube={.012} arc={Math.PI} c="#b48f60"/>
    </group>
    <group position={[.26,2.3,.05]} scale={.55}><MicroGarden color={c}/></group>
  </group>;
}
function HoodCanopy({theme}){
  // A four-sided flare, square-on to the wall, wide at the bottom like a plaster hood.
  return <group>
    <group position={[0,-.11,.03]} scale={[1,1,.62]}><mesh rotation={[0,Math.PI/4,0]} castShadow><cylinderGeometry args={[.36,.7,.3,4,1]}/><DecorMaterial role="paint" color={theme.cabinetDoor} roughness={.7}/></mesh></group>
    <Part p={[0,-.265,.03]} s={[1.0,.035,.63]} c={gold}/>
    <Part role="paint" p={[0,.035,.01]} s={[.54,.03,.33]} c={theme.cabinetDoor}/>
    <ShellCrest position={[0,-.2,.34]} scale={.5}/>
  </group>;
}
function Stove({theme}) {
  const [hot,setHot]=useState(false),[open,setOpen]=useState(false),door=useRef(),ctx=useContext(DecorContext);
  useQuietMotion(door,'rotation','x',open?1.4:0,9);
  const toggle=set=>e=>{if(ctx.decorMode||e.delta>5)return;e.stopPropagation();set(v=>!v);};
  return <group>
    {/* cream enamel like the cabinets, so the range sits in the run instead of a black block */}
    {[-.37,.37].map(x=><Part role="paint" key={x} p={[x,.45,.02]} s={[.06,.85,.74]} c={theme.cabinetDoor}/>)}
    <Part role="paint" p={[0,.45,-.32]} s={[.68,.85,.06]} c={theme.cabinetDoor}/><Part p={[0,.055,.02]} s={[.68,.06,.68]} c="#d9cbb8"/><Part role="paint" p={[0,.845,.02]} s={[.68,.06,.68]} c={theme.cabinetDoor}/>
    {[-.24,-.12,0,.12,.24].map(x=><Rod key={x} p={[x,.28,.03]} radius={.009} length={.53} r={[Math.PI/2,0,0]} c="#8b8277"/>)}
    <group ref={door} position={[0,.105,.416]} onClick={toggle(setOpen)}><group position={[0,-.105,-.416]}><Part role="paint" p={[0,.38,.416]} s={[.66,.53,.04]} c={theme.cabinetDoor}/>
    <Part p={[0,.38,.443]} s={[.53,.4,.018]} c="#201e20"/>
    <Rod p={[0,.7,.49]} radius={.022} length={.53} r={[0,0,Math.PI/2]} c={gold}/></group></group>
    <group onClick={toggle(setHot)}>{[-.28,-.095,.095,.28].map(x=><Rod key={x} p={[x,.82,.42]} radius={.039} length={.035} c={gold} r={[Math.PI/2,0,0]}/>)}
    <Part p={[0,.94,0]} s={[.84,.08,.8]} nx={2} nz={2} c={dark}/>
    {[-.21,.21].flatMap(x=>[-.21,.21].map(z=><group key={`${x}-${z}`} position={[x,1,z]}><Rod radius={.105} length={.025} c="#141315"/><Ring radius={.115} tube={.014} c="#68605a" r={[Math.PI/2,0,0]}/></group>))}
    <Rod p={[-.21,1.12,-.21]} radius={.14} length={.21} c={theme.trim}/><Rod p={[-.21,1.24,-.21]} radius={.15} length={.025} c={theme.trim}/><Rod p={[-.21,1.27,-.21]} radius={.03} length={.035}/>{hot&&[-.21,.21].flatMap(x=>[-.21,.21].map(z=><mesh key={`${x}-${z}`} position={[x,1.02,z]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.085,.013,8,24]}/><meshStandardMaterial color="#ef9c56" emissive="#ed6b31" emissiveIntensity={1.2}/></mesh>))}</group>
    <group position={[0,2.02,-.2]}><HoodCanopy theme={theme}/><Part role="paint" p={[0,.31,-.1]} s={[.5,.67,.29]} nx={2} ny={4} c={theme.cabinetDoor}/></group>
  </group>;
}
function Stool({id,p,theme}) {
  return <group position={p}><SeatTarget id={id} height={.70} depth={0} approach={.8} yaw={Math.PI} search={false}><Rod p={[0,.64,0]} radius={.28} length={.12} c={theme.chair}/><Ring p={[0,.71,0]} radius={.245} tube={.016} c={theme.trim} r={[Math.PI/2,0,0]}/>{[-.18,.18].flatMap(x=>[-.18,.18].map(z=><group key={`${x}-${z}`}><CabrioleLeg x={x} z={z} height={.6}/><Part p={[x,.04,z]} s={[.09,.06,.09]} c={gold}/></group>))}<Ring p={[0,.24,0]} radius={.25} tube={.023} c={theme.trim} r={[Math.PI/2,0,0]}/></SeatTarget></group>;
}
export function BrickKitchen({theme,furniture,decorMode,onSelect,storage,onStorage,onStorageChange}) {
  const [waterOn,setWaterOn]=useState(false);
  const cabinetOpen=Boolean(storage?.island?.open);
  const onCabinet=()=>{onStorageChange('island',{open:!cabinetOpen});onStorage(!cabinetOpen?'island':null);};
  return <DecorContext.Provider value={{furniture,decorMode,onSelect,storage,onStorage,onStorageChange}}><group>
    {/* No kitchen window or sill: the faucet has an unobstructed working envelope. */}
    {/* back run: sink, drawers, corner. The return is perpendicular, not another row behind the island. */}
    <Move id="sinkRun" p={[.9,0,-2.43]}>
    {[-.9,-.18,.54,1.26,1.98,2.7].map((x,i)=><Cabinet key={x} p={[x,0,-2.43]} w={.72} theme={theme} drawers={i===3}/>)}
    {/* Separate slabs around the open sink; no solid countertop underneath its bowl. */}
    <Part role="paint" p={[-.985,.95,-2.43]} s={[.55,.1,.82]} nx={2} nz={3} c={theme.trim}/>
    <Part role="paint" p={[1.565,.95,-2.43]} s={[2.99,.1,.82]} nx={9} nz={3} c={theme.trim}/>
    <Part role="paint" p={[-.33,.95,-2.79]} s={[.76,.1,.1]} nx={3} nz={1} c={theme.trim}/>
    {/* Raised apron-front sink has a real open bowl. */}
    <group position={[-.33,1,-2.42]} onClick={e=>{if(decorMode||e.delta>5)return;e.stopPropagation();setWaterOn(v=>!v);}}><Part role="paint" p={[0,-.09,.3]} s={[.73,.28,.08]} c={theme.trim}/><Part p={[0,-.11,0]} s={[.66,.045,.48]} c="#c6c2ae"/>{[-.36,.36].map(x=><Part role="paint" key={x} p={[x,0,0]} s={[.075,.22,.62]} c={theme.trim}/>)}<Part role="paint" p={[0,.015,-.28]} s={[.73,.19,.06]} c={theme.trim}/><Rod p={[.21,.22,-.23]} length={.4} radius={.025}/><Ring p={[.12,.41,-.23]} radius={.09} tube={.025} arc={Math.PI}/><Rod p={[.03,.35,-.23]} length={.12} radius={.025}/>{waterOn&&<mesh position={[.03,.11,-.23]}><cylinderGeometry args={[.012,.02,.36,12]}/><meshStandardMaterial color="#b1d7dc" transparent opacity={.65} roughness={.12}/></mesh>}</group>
    <Prop id="sinkFlowers"><Plant p={[-1,1.02,-2.48]} scale={.85}/></Prop>
    {[.72,1.4].map((x,i)=><Prop key={x} id={i?'spice2':'spice1'}><group position={[x,1.04,-2.53]}><Rod p={[0,.12,0]} radius={.075} length={.24} c="#d1ad74"/><Rod p={[0,.25,0]} radius={.08} length={.025} c={gold}/></group></Prop>)}
    </Move>
    <Move id="stove" p={[2.77,0,-.78]}><group position={[2.77,0,-.78]} rotation={[0,-Math.PI/2,0]}><Stove theme={theme}/></group></Move>
    <Move id="cornerCabinet" p={[2.77,0,-1.6]}><group position={[2.77,0,-1.6]} rotation={[0,-Math.PI/2,0]}><Cabinet theme={theme} w={.75}/><Part role="paint" p={[0,.95,0]} s={[.77,.1,.8]} nx={3} nz={3} c={theme.trim}/></group></Move>
    <Move id="prepCabinet" p={[2.77,0,.04]}><group position={[2.77,0,.04]} rotation={[0,-Math.PI/2,0]}><Cabinet theme={theme} w={.75}/><Part role="paint" p={[0,.95,0]} s={[.77,.1,.8]} nx={3} nz={3} c={theme.trim}/><Prop id="prepCup"><Cup p={[0,1.02,.07]}/></Prop></group></Move>
    {[1.22,2.02].map((x,i)=><Move key={x} id={i?'upperRight':'upperLeft'} p={[x,1.62,-2.57]}><group position={[x,1.62,-2.57]}><Cabinet w={.76} h={.84} depth={.45} theme={theme}/><Part role="paint" p={[0,.88,0]} s={[.8,.075,.49]} nx={3} nz={2} c={theme.trim}/></group></Move>)}
    <Move id="refrigerator" p={[3.24,0,.78]}><Refrigerator theme={theme}/></Move>
    {/* Island: individual legs, hollow storage, shelves and a tiled smooth worktop. */}
    <Move id="island" p={[.8,0,.18]}><group position={[.8,0,.18]}>
      <Part role="top" p={[0,1.02,0]} s={[2.05,.13,1]} nx={7} nz={3} c={theme.trim}/>
      {[-.92,.92].map(x=><group key={x}><Part role="paint" p={[x,.49,0]} s={[.12,.94,.86]} nx={1} ny={5} c={theme.cabinetDoor}/><Part role="paint" p={[x,.04,0]} s={[.15,.07,.9]} c={theme.cabinet}/></group>)}
      <Part role="paint" p={[0,.48,-.38]} s={[1.75,.88,.08]} nx={7} ny={5} c={theme.cabinetDoor}/>
      <Part role="paint" p={[0,.12,0]} s={[1.73,.07,.75]} nx={6} nz={2} c={theme.cabinet}/>
      <Part role="paint" p={[0,.52,0]} s={[1.73,.065,.75]} nx={6} nz={2} c={theme.cabinet}/>
      <Hinge p={[-.84,.51,.41]} open={cabinetOpen} onToggle={onCabinet}><Panel p={[.38,0,0]} w={.76} h={.75} c={theme.cabinetDoor}/></Hinge>
      <StorageGift slot="island" p={[-.45,.22,.05]}/>
      <DessertBookModel lying size={1.6} p={[-.6,1.085,.25]} r={[0,.42,0]}/>
      <Prop id="islandShelfFlowers"><Plant p={[.51,.56,.02]} scale={.68}/></Prop><Prop id="islandCup1"><Cup p={[.6,.16,.14]}/></Prop><Prop id="islandCup2"><Cup p={[.27,.16,.14]} c="#c8b8a1"/></Prop>
      <Prop id="islandFlowers"><Plant p={[-.65,1.1,-.12]} scale={.9}/></Prop>
      <Prop id="islandBread"><Part p={[-.1,1.13,0]} s={[.42,.05,.3]} c="#b8986c"/>
      {[-.12,0,.12].map(x=><Part key={x} p={[x-.1,1.2,0]} s={[.1,.12,.22]} c="#c98c42" radius={.035}/>)}</Prop>
      <Prop id="islandCake">
      <Rod p={[.57,1.11,0]} radius={.24} length={.035} c={theme.trim}/><Rod p={[.57,1.22,0]} radius={.17} length={.18} c="#e4c394"/><Rod p={[.57,1.32,0]} radius={.18} length={.035} c={theme.trim}/>
      {[-.08,0,.08].map(x=><Rod key={x} p={[.57+x,1.37,0]} radius={.034} length={.06} c="#ac5357"/>)}</Prop>
    </group></Move>
    <Move id="stoolLeft" p={[.25,0,1.05]}><Stool id="stoolLeft" p={[.25,0,1.05]} theme={theme}/></Move><Move id="stoolRight" p={[1.14,0,1.05]}><Stool id="stoolRight" p={[1.14,0,1.05]} theme={theme}/></Move>
  </group></DecorContext.Provider>;
}

export function BrickDining({theme,furniture,decorMode,onSelect}) {
  return <DecorContext.Provider value={{furniture,decorMode,onSelect}}>
    <Move id="diningTable" p={[0,0,0]}><group>
      <Part role="top" p={[0,.69,0]} s={[1.48,.1,1.02]} radius={.22} c={theme.trim}/><CarvedLine points={[[-.66,.6,.44],[-.33,.54,.47],[0,.59,.48],[.33,.54,.47],[.66,.6,.44]]}/>
      {[-.52,.52].flatMap(x=>[-.32,.32].map(z=><CabrioleLeg key={`${x}-${z}`} x={x} z={z} height={.64}/>))}
      <Prop id="diningFlowers"><Plant p={[0,.75,0]} scale={.8}/></Prop><Prop id="diningCup1"><Cup p={[-.37,.75,.12]}/></Prop><Prop id="diningCup2"><Cup p={[.37,.75,-.12]}/></Prop>
      <DessertDome/>
    </group></Move>
    {['diningChair1','diningChair2','diningChair3'].map(id=><Move key={id} id={id} p={[0,0,0]}><group rotation={[0,id==='diningChair3'?Math.PI:0,0]}><SeatTarget id={id} height={.425} depth={0} approach={[.8,0,0]} search={false}>
      <Part p={[0,.38,0]} s={[.48,.09,.46]} nx={2} nz={2} c={theme.chair}/>
      {[-.18,.18].flatMap(x=>[-.17,.17].map(z=><CabrioleLeg key={`${x}-${z}`} x={x} z={z} height={.35}/>))}
      <RococoPanel position={[0,.47,-.23]} width={.48} height={.46} depth={.06} color={theme.chair}/>
      <ShellCrest position={[0,.9,-.15]} scale={.25}/>
    </SeatTarget></group></Move>)}
  </DecorContext.Provider>;
}
export function BrickSofa({theme,reveal=false,onSearch}) {
  return <group><CarvedLine points={[[-1.22,.79,-.28],[-.75,.91,-.28],[0,1.02,-.28],[.75,.91,-.28],[1.22,.79,-.28]]}/><ShellCrest position={[0,1.0,-.27]} scale={.65}/>
    <Part role="paint" p={[0,-.16,0]} s={[2.48,.35,.85]} nx={8} ny={2} c={theme.sofaDeep}/>
    <RococoPanel position={[0,.03,-.48]} width={2.48} height={.98} depth={.16} color={theme.sofa}/>

    {[-1.17,1.17].map(x=><group key={x}><Part role="paint" p={[x,.2,.03]} s={[.22,.65,.91]} nx={1} ny={4} c={theme.sofa}/><Part role="paint" p={[x,.55,.03]} s={[.26,.1,.91]} nx={1} nz={4} c={theme.sofa}/></group>)}
    {[-.75,0,.75].map(x=><group key={x}><SearchPart id={x<0?"left":x>0?"right":"middle"} position={[x,.11,.1]} move={[0,.65,-.25]} turn={[-1.05,0,0]}><Part finish="fabric" s={[.72,.21,.66]} c={theme.cushion} radius={.07}/></SearchPart><Part finish="fabric" p={[x,.23,.425]} s={[.65,.009,.009]} c={theme.sofaDeep} radius={.003}/><Part finish="fabric" p={[x,.49,-.21]} s={[.72,.58,.21]} c={theme.sofa} radius={.065}/></group>)}
    {[-.65,.65].map((x,i)=><group key={x} onClick={onSearch?e=>{e.stopPropagation();if(e.delta<=5)onSearch();}:undefined}><SearchPart key={x} id={"pillow"+i} move={[i?.5:-.5,.2,0]} axis="right"><Part finish="fabric" slot="pillow" key={x} p={[x,.45,.02]} s={[.38,.35,.12]} c={i?theme.cushion:"#dec4b9"} radius={.045} r={[0,0,i?.1:-.13]}/></SearchPart></group>)}
    {[-.99,.99].flatMap(x=>[-.29,.29].map(z=><group key={`${x}-${z}`} position={[0,-.46,0]}><CabrioleLeg x={x} z={z} height={.18}/></group>))}
  </group>;
}
export function BrickArmchair({theme,reveal=false}) {
  return <group><CarvedLine points={[[-.48,.75,-.22],[-.3,.89,-.22],[0,.96,-.22],[.3,.89,-.22],[.48,.75,-.22]]}/><ShellCrest position={[0,.94,-.21]} scale={.4}/>
    <Part role="paint" p={[0,-.13,0]} s={[.98,.3,.8]} nx={4} ny={2} c={theme.sofaDeep}/>
    <RococoPanel position={[0,.03,-.39]} width={1.04} height={.91} depth={.14} color={theme.sofa}/>

    <SearchPart id="open" position={[0,.08,.08]} move={[0,.6,-.23]} turn={[-1.05,0,0]}><Part finish="fabric" s={[.68,.23,.62]} c={theme.cushion} radius={.06}/></SearchPart><Part finish="fabric" p={[0,.47,-.16]} s={[.69,.57,.19]} c={theme.sofa} radius={.06}/>
    {[-.45,.45].map(x=><group key={x}><Part role="paint" p={[x,.15,.03]} s={[.17,.51,.81]} nx={1} ny={3} c={theme.sofa}/><Part role="paint" p={[x,.44,.03]} s={[.2,.09,.81]} nx={1} nz={4} c={theme.sofa}/></group>)}
    {[-.33,.33].flatMap(x=>[-.25,.25].map(z=><group key={`${x}-${z}`} position={[0,-.41,0]}><CabrioleLeg x={x} z={z} height={.18}/></group>))}
  </group>;
}
export function BrickCoffeeTable({theme}) {
  // Oval edge pieces follow the outline instead of attaching studs to a giant cylinder.
  return <group>
    <mesh position={[0,0,0]} scale={[1.27,1,.58]} castShadow receiveShadow><cylinderGeometry args={[1,1,.12,64]}/><DecorMaterial role="top" color={theme.trim} roughness={.3}/></mesh>
    {Array.from({length:72},(_,i)=>{const a=i*Math.PI/36;return <Part role="paint" key={i} p={[Math.cos(a)*1.19,-.095,Math.sin(a)*.5]} s={[.048,.16,.028]} r={[0,Math.atan2(1.19*Math.sin(a),-.5*Math.cos(a)),0]} c={theme.cabinetDoor} radius={.009}/>;})}
    <mesh position={[0,-.17,0]} scale={[1.22,1,.53]} castShadow><cylinderGeometry args={[1,1,.045,64]}/><meshStandardMaterial color={theme.cabinet} roughness={.4}/></mesh>
    {[-.8,.8].flatMap(x=>[-.3,.3].map(z=><group key={`${x}-${z}`} position={[0,-.38,0]}><CabrioleLeg x={x} z={z} height={.24}/></group>))}
    {[-.8,-.4,0,.4,.8].map(x=><Part key={x} p={[x,.063,0]} s={[.004,.002,1.05*Math.sqrt(1-(x/1.27)**2)]} c="#d7c9b5" radius={0}/>)}
  </group>;
}

export function BrickTvUnit({theme,cabinet,onDrawer,tvOn,onTv,onNotice,onGift}) {
  return <group>
    <Part role="paint" p={[0,.33,0]} s={[2.12,.12,.74]} nx={8} nz={3} c={theme.trim}/>
    <Part role="paint" p={[0,-.29,0]} s={[2.04,.09,.67]} nx={8} nz={2} c={theme.cabinet}/>
    {[-.98,0,.98].map(x=><Part role="paint" key={x} p={[x,.01,0]} s={[.07,.55,.66]} nx={1} ny={4} c={theme.cabinetDoor}/>)}
    <Part role="paint" p={[0,.01,-.31]} s={[2,.55,.045]} nx={8} ny={4} c={theme.cabinet}/>
    {[['left',-.49],['right',.49]].map(([side,x])=><Drawer key={side} p={[x,.02,.32]} w={.87} h={.45} depth={.56} c={theme.cabinetDoor} open={cabinet[`${side}Open`]} onToggle={()=>onDrawer(side)}>
      <group position={[0,-.17,-.28]} scale={.8}><EverydayContents kind="tv"/></group>
      {cabinet.slots?.[side]&&<group position={[0,-.09,-.25]} onClick={e=>{e.stopPropagation();onGift(side);}}><Part s={[.25,.16,.2]} c={theme.accent}/><Part role="paint" p={[0,.085,0]} s={[.26,.015,.035]} c={theme.trim}/></group>}
    </Drawer>)}
    {[-.84,.84].flatMap(x=>[-.22,.22].map(z=><group key={`${x}-${z}`} position={[0,-.46,0]}><CabrioleLeg x={x} z={z} height={.18}/></group>))}
    <group onClick={e=>{e.stopPropagation();if(e.delta>5)return;onTv();}}>
      <Part p={[0,.93,0]} s={[1.65,.94,.085]} c="#40343c" radius={.023}/>
      <TvScreen on={tvOn}/>
      <Part p={[0,.43,0]} s={[.12,.17,.1]} c={dark}/><Part p={[0,.39,.02]} s={[.48,.035,.22]} c={dark}/>
    </group>
  </group>;
}

export {Part, Rod, Ring, Tiles, Courses};
