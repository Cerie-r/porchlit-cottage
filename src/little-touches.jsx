// Small things that make the rooms feel lived in: satin bows on the curtains,
// a porcelain cat on the living-room sill, fairy lights on the bedroom curtain
// rod and the living-room clock. Each one belongs to an object that already
// exists (the window, a wall item), so room and close-up show the same thing.
import React,{useContext,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import * as T from 'three';
import {DecorMaterial} from './decor-context.jsx';
import {ShellCrest} from './rococo-details.jsx';
import {HomeZoneContext,useDaylight} from './home-lighting.jsx';
import {useRoomLight,accentLevel} from './room-lighting.jsx';
import {clockAngles} from './wall-clock.js';

const satin='#d7a1b0';
const Satin=({color=satin})=><meshStandardMaterial color={color} roughness={.36} metalness={.04}/>;

// A soft round cord or ribbon along a curve.
export function Strand({points,radius=.012,color=satin,roughness=.36,segments=48}){
  const key=JSON.stringify(points);
  const geometry=useMemo(()=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,radius,6,false),[key,radius,segments]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={roughness} metalness={.04}/></mesh>;
}

// Two loops, a knot and two tails, facing +z.
export function Bow({color=satin,scale=1}){
  return <group scale={scale}>
    {[-1,1].map(s=><mesh key={s} position={[s*.05,.012,0]} rotation={[0,0,s*.35]} scale={[1,.6,.45]} castShadow><torusGeometry args={[.044,.012,8,22]}/><Satin color={color}/></mesh>)}
    <mesh scale={[1,.9,.75]}><sphereGeometry args={[.02,12,8]}/><Satin color={color}/></mesh>
    {[-1,1].map(s=><mesh key={s} position={[s*.028,-.08,-.006]} rotation={[0,0,s*.24]} castShadow><boxGeometry args={[.027,.14,.006]}/><Satin color={color}/></mesh>)}
  </group>;
}

// Ties a gathered curtain at its waist, where CurtainFabric pulls it in
// (56% of the way down, 69% of its width), with the bow on the room side.
export function TiebackBow({width,height=1.78,color=satin}){
  const half=width*.69/2+.014;
  return <group position={[0,height*(.5-.56),0]} userData={{tintExclude:true}}>
    <Strand points={[[-half,0,-.03],[-half*.8,.004,.06],[0,0,.1],[half*.8,-.004,.06],[half,0,-.03]]} radius={.013} color={color} segments={24}/>
    <group position={[0,.004,.108]}><Bow color={color}/></group>
  </group>;
}

// A porcelain cat sitting on the sill, looking out of the window (-z), its
// tail curled round its paws and a little bow on the back of its collar.
const Porcelain=()=><meshStandardMaterial color="#f7f1e8" roughness={.22}/>;
// One smooth pear-shaped body (wide haunches, narrow chest), so the seated
// silhouette reads as a cat rather than a stack of balls.
const catProfile=[[0,0],[.08,.004],[.098,.026],[.1,.058],[.09,.1],[.072,.14],[.054,.175],[.04,.195],[0,.2]];
export function SillCat(){
  const body=useMemo(()=>new T.LatheGeometry(catProfile.map(([r,y])=>new T.Vector2(r,y)),28),[]);
  useEffect(()=>()=>body.dispose(),[body]);
  return <group userData={{tintExclude:true}} scale={1.15}>
    <mesh geometry={body} scale={[1,1,.88]} castShadow><Porcelain/></mesh>
    <mesh position={[0,.235,-.012]} scale={[1,.94,.96]} castShadow><sphereGeometry args={[.058,22,16]}/><Porcelain/></mesh>
    {[-1,1].map(s=><mesh key={s} position={[s*.034,.292,-.016]} rotation={[0,0,-s*.36]} castShadow><coneGeometry args={[.024,.06,12]}/><Porcelain/></mesh>)}
    <Strand points={[[0,.028,.082],[.06,.016,.085],[.1,.014,.025],[.088,.014,-.04],[.04,.018,-.075]]} radius={.015} color="#f7f1e8" roughness={.22} segments={20}/>
    <mesh position={[0,.188,-.006]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.046,.008,8,24]}/><Satin/></mesh>
    <group position={[0,.19,.046]} rotation={[-.2,0,0]}><Bow scale={.42}/></group>
  </group>;
}

// Warm fairy lights swagged along a curtain rod. They are one of the room's
// accent lamps (串灯 on the light remote), dim with 入睡 and glow brighter at night.
export function FairyLights({span=3.4,y=1.03,z=.32,swags=6,dip=.085}){
  const light=useRoomLight(),day=useDaylight(),level=accentLevel(light,'fairy');
  const {wire,bulbs}=useMemo(()=>{
    const sag=t=>y-dip*Math.sin(Math.PI*((t*swags)%1));
    const wire=Array.from({length:swags*12+1},(_,i)=>{const t=i/(swags*12);return [(t-.5)*span,sag(t),z];});
    const count=Math.round(span/.085);
    const bulbs=Array.from({length:count+1},(_,i)=>{const t=i/count;return [(t-.5)*span,sag(t)-.02,z+.006];});
    return {wire,bulbs};
  },[span,y,z,swags,dip]);
  const bulbRef=useRef(),haloRef=useRef(),night=1-day;
  useLayoutEffect(()=>{const m=new T.Matrix4();for(const mesh of [bulbRef.current,haloRef.current]){bulbs.forEach((p,i)=>{m.makeTranslation(p[0],p[1],p[2]);mesh.setMatrixAt(i,m);});mesh.instanceMatrix.needsUpdate=true;}},[bulbs]);
  const toggle=e=>{if(light.editing)return;e.stopPropagation();if(e.delta>5)return;light.patch({lamp:'fairy'});};
  return <group userData={{tintExclude:true}} onClick={toggle}>
    <mesh position={[0,y-dip/2-.01,z]}><boxGeometry args={[span,dip+.08,.08]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <Strand points={wire} radius={.0045} color="#8c7a62" roughness={.6} segments={swags*24}/>
    <instancedMesh ref={bulbRef} args={[undefined,undefined,bulbs.length]} frustumCulled={false}>
      <sphereGeometry args={[.016,10,8]}/>
      <meshStandardMaterial color="#ffe6b3" roughness={.3} emissive="#ffad4d" emissiveIntensity={level*(.6+night*1.5)}/>
    </instancedMesh>
    {/* a faint warm halo round each bulb, mostly at night */}
    <instancedMesh ref={haloRef} args={[undefined,undefined,bulbs.length]} frustumCulled={false} renderOrder={3} raycast={()=>null}>
      <sphereGeometry args={[.042,12,8]}/>
      <meshBasicMaterial color="#ffb45e" transparent opacity={level*(.05+night*.2)} blending={T.AdditiveBlending} depthWrite={false}/>
    </instancedMesh>
  </group>;
}

// A soft round glow, for light that spills onto a wall.
let glowMap=null;
function glowTexture(){
  if(glowMap)return glowMap;
  const c=document.createElement('canvas');c.width=c.height=64;
  const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.45)');r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=r;g.fillRect(0,0,64,64);
  glowMap=new T.CanvasTexture(c);glowMap.colorSpace=T.SRGBColorSpace;return glowMap;
}

// A five-pointed star, puffed a little at the edges; one shared geometry.
let starGeometry=null;
function starGeo(){
  if(starGeometry)return starGeometry;
  const s=new T.Shape();
  for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.45:1,x=Math.cos(a)*r,y=Math.sin(a)*r;i?s.lineTo(x,y):s.moveTo(x,y);}
  s.closePath();
  starGeometry=new T.ExtrudeGeometry(s,{depth:.25,bevelEnabled:true,bevelThickness:.12,bevelSize:.1,bevelSegments:2});
  starGeometry.center();
  return starGeometry;
}
function Star({size=.05,glow=0}){
  return <mesh geometry={starGeo()} scale={size} castShadow><meshStandardMaterial color="#f6e7bd" roughness={.5} emissive="#fff0c4" emissiveIntensity={glow}/></mesh>;
}

// A crescent moon wall lamp with a little star dangling below. It is one of
// the study's accent lamps (月亮灯 on the light remote); at night it glows and
// spills a warm halo onto the wall around it. Faces +z.
function crescent(){
  const s=new T.Shape(),r=Math.hypot(.1,.22);
  s.moveTo(0,.22);s.absarc(0,0,.22,Math.PI/2,Math.PI*1.5,false);
  s.absarc(.1,0,r,Math.atan2(-.22,-.1),Math.atan2(.22,-.1),true);
  return s;
}
export function MoonLamp(){
  const light=useRoomLight(),day=useDaylight(),level=accentLevel(light,'moon'),night=1-day;
  const moon=useMemo(()=>{const g=new T.ExtrudeGeometry(crescent(),{depth:.04,bevelEnabled:true,bevelThickness:.012,bevelSize:.01,bevelSegments:2,curveSegments:24});g.center();return g;},[]);
  useEffect(()=>()=>moon.dispose(),[moon]);
  const toggle=e=>{if(light.editing)return;e.stopPropagation();if(e.delta>5)return;light.patch({lamp:'moon'});};
  return <group userData={{tintExclude:true}} onClick={toggle}>
    <mesh position={[0,0,-.005]} renderOrder={1} raycast={()=>null}><planeGeometry args={[1.15,1.15]}/><meshBasicMaterial map={glowTexture()} color="#ffcf8f" transparent opacity={level*(.06+night*.42)} blending={T.AdditiveBlending} depthWrite={false}/></mesh>
    <mesh position={[0,0,.03]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.012,.012,.06,8]}/><meshStandardMaterial color="#c6a56b" metalness={.5} roughness={.35}/></mesh>
    <mesh geometry={moon} position={[0,0,.07]} rotation={[0,0,-.35]} castShadow><meshStandardMaterial color="#fff3d6" roughness={.45} emissive="#ffd08a" emissiveIntensity={level*(.25+night*1.2)}/></mesh>
    <mesh position={[.03,-.27,.07]}><cylinderGeometry args={[.002,.002,.12,4]}/><meshStandardMaterial color="#c6a56b"/></mesh>
    <group position={[.03,-.35,.07]} rotation={[0,.3,0]}><Star size={.042} glow={level*(.2+night*.9)}/></group>
  </group>;
}

// Glow-in-the-dark paper stars hanging on threads: pale by day, softly lit at
// night (a little more when the moon lamp is on). [x, y, z, size, turn]
const hangingStars=[[0,3.02,-.75,.07,.3],[.05,2.72,-1.15,.055,-.4],[-.04,2.95,-2.05,.08,.8],[.02,2.62,-2.45,.05,-.2],[-.02,3.08,-2.95,.065,.5]];
export function HangingStars({ceiling=3.48}){
  const light=useRoomLight(),day=useDaylight(),night=1-day,glow=night*(.5+accentLevel(light,'moon')*.3);
  return <group userData={{tintExclude:true}}>
    {hangingStars.map(([x,y,z,size,turn],i)=><group key={i} position={[x,0,z]}>
      <mesh position={[0,(ceiling+y+size)/2,0]}><cylinderGeometry args={[.0025,.0025,ceiling-y-size,4]}/><meshStandardMaterial color="#d8c8a8"/></mesh>
      <group position={[0,y,0]} rotation={[0,turn,0]}><Star size={size} glow={glow}/></group>
    </group>)}
  </group>;
}

// A few books stacked on the floor by a chair, each with covers, a spine and
// the page block showing, the top one with a satin ribbon marker hanging out.
const floorBooks=[[.36,.07,.26,'#9ba288',0],[.32,.06,.24,'#d9b9bf',.18],[.3,.055,.22,'#c8b8a8',-.12],[.26,.05,.19,'#e8dcc8',.3]];
export function FloorBooks(){
  let y=0;
  return <group userData={{tintExclude:true}}>
    {floorBooks.map(([w,h,d,c,turn],i)=>{const cy=y+h/2;y+=h;const cover=<meshStandardMaterial color={c} roughness={.8}/>;return <group key={i} position={[0,cy,0]} rotation={[0,turn,0]}>
      {[-1,1].map(s=><mesh key={s} position={[0,s*(h/2-.004),0]} castShadow><boxGeometry args={[w,.008,d]}/>{cover}</mesh>)}
      <mesh position={[-w/2+.005,0,0]}><boxGeometry args={[.01,h,d]}/>{cover}</mesh>
      <mesh position={[.004,0,0]}><boxGeometry args={[w-.016,h-.014,d-.012]}/><meshStandardMaterial color="#fbf4e6" roughness={.9}/></mesh>
      {i===floorBooks.length-1&&<mesh position={[.04,-h/2-.03,d/2+.002]}><boxGeometry args={[.014,.09,.002]}/><meshStandardMaterial color={satin} roughness={.36}/></mesh>}
    </group>;})}
  </group>;
}

// The living-room clock: cream case, gilt rim, a shell crest, hung from a
// satin ribbon. It keeps the home's own time (the zone in the clock settings).
export function WallClock(){
  const zone=useContext(HomeZoneContext);
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const tick=()=>{if(!document.hidden)setNow(new Date());};const timer=setInterval(tick,15000);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};},[]);
  const {hour,minute}=clockAngles(now,zone);
  const ink='#4b3c36';
  return <group>
    <group userData={{tintExclude:true}}>
      {[-1,1].map(s=><Strand key={s} points={[[s*.13,.25,-.012],[s*.07,.5,-.02],[0,.72,-.024]]} radius={.009} segments={16}/>)}
      <group position={[0,.74,-.01]}><Bow scale={.8}/></group>
    </group>
    <mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.3,.31,.06,48]}/><DecorMaterial role="paint" color="#f5ebdf" roughness={.55}/></mesh>
    <mesh position={[0,0,.032]}><torusGeometry args={[.283,.02,10,56]}/><DecorMaterial role="detail" color="#cbb28c" roughness={.4} metalness={.35}/></mesh>
    <mesh position={[0,0,.033]}><circleGeometry args={[.262,48]}/><meshStandardMaterial color="#fffaf2" roughness={.6}/></mesh>
    {Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2,major=i%3===0,r=major?.205:.215;return <mesh key={i} position={[Math.sin(a)*r,Math.cos(a)*r,.036]} rotation={[0,0,-a]}><boxGeometry args={[major?.016:.009,major?.05:.028,.004]}/><meshStandardMaterial color="#6d5a50"/></mesh>;})}
    <group position={[0,0,.04]} rotation={[0,0,-hour]}><mesh position={[0,.058,0]}><boxGeometry args={[.022,.13,.006]}/><meshStandardMaterial color={ink}/></mesh></group>
    <group position={[0,0,.046]} rotation={[0,0,-minute]}><mesh position={[0,.085,0]}><boxGeometry args={[.013,.19,.005]}/><meshStandardMaterial color={ink}/></mesh></group>
    <mesh position={[0,0,.05]}><sphereGeometry args={[.018,12,8]}/><DecorMaterial role="detail" color="#cbb28c" roughness={.4} metalness={.35}/></mesh>
    <ShellCrest position={[0,.285,.012]} scale={.62}/>
  </group>;
}
