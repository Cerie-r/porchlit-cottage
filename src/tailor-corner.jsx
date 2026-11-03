// The tailor's corner in the study, beside the craft bench: a little sewing table with its machine, and on a low
// round stand the dress form, shaped like the residents themselves, wearing what is on it now (src/tailor-state.js).
import React,{useEffect,useLayoutEffect,useMemo,useState} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Part,Rod,Ring} from './brick-interior.jsx';
import {CabrioleLeg,CarvedLine} from './rococo-details.jsx';
import {paintOutfit} from '../body/outfit-registry.js';
import {sewnGarment,disposeSewn} from '../body/sewn.js';
import {cleanTrims,trimsKey} from '../body/trims.js';
import {garmentPiece,formBody} from './tailor-garment.js';
import {onOursLoaded} from './ours-load.js';

const cream='#f4e8d5',edge='#e1cdb2',wood='#b88c63',rose='#c99caa',gold='#b78b45',linen='#ebdfcc',butter='#e6cf91';
// The residents' size in the house (body/avatar-model.js scales them to 1.3 high, head and all).
export const FORM_SCALE=.3873;
// What the form wears when nothing is being made yet: a toile of her base dress in unbleached cotton.
export const TOILE={pattern:'dress',colors:{main:'#efe7d8',accent:'#e0d3bd',trim:'#f7f2e8'}};
// Where the piece is drawn from its own point: the table at the back, the stand in front of it to the right.
export const TABLE_AT=[0,0,-.47],STAND_AT=[.2,0,.36];

// A garment for the form (or another stage): its pattern's, in colours of its own, repainted as they change, and
// trimmed (its lace and pearls, {lace?, pearls?}: made again when they change). Null until it's built, or while its
// pattern isn't here (a home's own may come later).
export function useGarment(pattern,colors,trims=null){
 const invalidate=useThree(s=>s.invalidate),[base,setBase]=useState(null),[late,setLate]=useState(0),trimmed=trimsKey(trims);
 useEffect(()=>onOursLoaded(()=>setLate(n=>n+1)),[]);
 useEffect(()=>{let alive=true;setBase(null);if(pattern)garmentPiece(pattern).then(g=>{if(alive)setBase(g);});return()=>{alive=false;};},[pattern,late]);
 const garment=useMemo(()=>base?sewnGarment(base,colors,cleanTrims(trims)):null,[base,trimmed]);
 useEffect(()=>()=>disposeSewn(garment),[garment]);
 useLayoutEffect(()=>{if(garment){paintOutfit(garment,colors);invalidate();}},[garment,colors?.main,colors?.accent,colors?.trim]);
 return garment;
}
export function useFormBody(){
 const invalidate=useThree(s=>s.invalidate),[geometry,setGeometry]=useState(null);
 useEffect(()=>{let alive=true;formBody().then(g=>{if(alive){setGeometry(g);invalidate();}});return()=>{alive=false;};},[]);
 return geometry;
}

// The dress form: the residents' body in linen with a pincushion for a head, and the garment on it, trimmed.
export function DressForm({piece,bare=false}){
 const geometry=useFormBody(),garment=useGarment(bare?null:piece?.pattern,piece?.colors,piece);
 const material=useMemo(()=>new THREE.MeshStandardMaterial({color:linen,roughness:.96}),[]);
 useEffect(()=>()=>material.dispose(),[material]);
 return <group scale={FORM_SCALE} userData={{tintExclude:true}}>
  {geometry&&<mesh geometry={geometry} material={material} castShadow receiveShadow/>}
  {garment&&<primitive object={garment}/>}
  {/* No garment yet: a tape measure round the neck. */}
  {!garment&&<group><mesh position={[0,1.43,.05]} rotation={[Math.PI/2,0,0]} scale={[1,.82,1]}><torusGeometry args={[.13,.011,6,32]}/><meshStandardMaterial color={butter} roughness={.7}/></mesh>{[-1,1].map(s=><mesh key={s} position={[s*.07,1.25,.19]} rotation={[.12,0,s*.08]}><boxGeometry args={[.034,.34,.006]}/><meshStandardMaterial color={butter} roughness={.7}/></mesh>)}</group>}
  {/* The neck's wooden cap and the pincushion on it. */}
  <mesh position={[0,1.625,.045]} castShadow><cylinderGeometry args={[.11,.12,.045,24]}/><meshStandardMaterial color={wood} roughness={.55}/></mesh>
  <Pincushion position={[0,1.79,.045]} scale={1}/>
 </group>;
}
function Pincushion({position,scale=1}){
 const pins=[[.05,.12,.06,'#b78b45'],[-.08,.1,.05,'#a9b6c9'],[.1,.06,-.05,'#fffaf0'],[-.03,.13,-.07,'#c98aa5'],[.0,.06,.14,'#8fa588']];
 return <group position={position} scale={scale}>
  <mesh castShadow scale={[1,.82,1]}><sphereGeometry args={[.16,28,18]}/><meshStandardMaterial color="#d59aab" roughness={.9}/></mesh>
  {[0,1,2,3,4,5].map(i=><mesh key={i} rotation={[0,i*Math.PI/3,0]} scale={[1,.82,1]}><torusGeometry args={[.16,.004,4,28,Math.PI]}/><meshStandardMaterial color="#c4879a" roughness={.9}/></mesh>)}
  {pins.map(([x,y,z,c],i)=><group key={i} position={[x,y,z]} rotation={[z*2,0,-x*2]}><mesh position={[0,.04,0]}><cylinderGeometry args={[.004,.004,.08,6]}/><meshStandardMaterial color="#d9d6cf" metalness={.6} roughness={.3}/></mesh><mesh position={[0,.085,0]}><sphereGeometry args={[.018,10,8]}/><meshStandardMaterial color={c} roughness={.4}/></mesh></group>)}
 </group>;
}

// A little sewing machine, the old kind with a hand wheel, standing on the table's top.
function SewingMachine(props){
 return <group {...props}>
  <Part p={[0,.025,0]} s={[.46,.05,.24]} c={cream} radius={.02}/>
  <Part p={[0,.052,.0]} s={[.4,.006,.2]} c={edge} radius={.003}/>
  <Part p={[.15,.17,0]} s={[.11,.25,.15]} c={cream} radius={.03}/>
  <Part p={[-.01,.32,0]} s={[.43,.09,.13]} c={cream} radius={.035}/>
  <Part p={[-.19,.22,0]} s={[.09,.17,.12]} c={cream} radius={.025}/>
  <Part p={[-.01,.32,.066]} s={[.3,.045,.006]} c={rose} radius={.003}/>
  <Part p={[-.01,.295,.07]} s={[.34,.006,.003]} c={gold} radius={.001}/>
  <Rod p={[-.19,.11,.03]} radius={.006} length={.08} c="#cfcac1"/>
  <Part p={[-.19,.068,.035]} s={[.045,.01,.05]} c="#cfcac1" radius={.002}/>
  <group position={[.215,.28,0]} rotation={[0,0,Math.PI/2]}><Rod radius={.065} length={.025} c={gold}/><Rod p={[0,.015,0]} radius={.022} length={.02} c={cream}/></group>
  <Rod p={[.07,.4,0]} radius={.005} length={.05}/><Rod p={[.07,.425,0]} radius={.024} length={.045} c={rose}/>{[.401,.449].map(y=><Rod key={y} p={[.07,y,0]} radius={.028} length={.006} c={cream}/>)}
 </group>;
}
function Spool({p,c}){return <group position={p}><Rod p={[0,.028,0]} radius={.022} length={.05} c={c}/>{[.002,.054].map(y=><Rod key={y} p={[0,y,0]} radius={.027} length={.006} c={cream}/>)}</group>;}

export function SewingTable(props){
 return <group {...props}>
  <Part role="top" p={[0,.72,0]} s={[.95,.045,.5]} c={cream}/><Part role="paint" p={[0,.69,0]} s={[.98,.02,.53]} c={edge}/>
  <Part role="paint" p={[0,.63,.225]} s={[.84,.09,.035]} c={cream}/><Rod p={[0,.63,.25]} radius={.018} length={.03} r={[Math.PI/2,0,0]}/>
  <CarvedLine points={[[-.4,.6,.245],[-.2,.57,.25],[0,.6,.25],[.2,.57,.25],[.4,.6,.245]]} radius={.008}/>
  {[-.4,.4].flatMap(x=>[-.19,.19].map(z=><CabrioleLeg key={`${x}${z}`} x={x} z={z} height={.68}/>))}
  <SewingMachine position={[-.16,.743,-.02]}/>
  {/* A folded stack of cloth, three spools, a pair of scissors and a tape measure over the edge. */}
  <group position={[.3,.743,-.12]}>{['#ecd3d6','#f6efe4','#c6d0d8'].map((c,i)=><Part key={c} p={[0,.013+i*.026,0]} s={[.24-i*.02,.024,.16-i*.012]} c={c} radius={.008}/>)}</group>
  <Spool p={[.22,.743,.12]} c={rose}/><Spool p={[.29,.743,.15]} c="#9db293"/><Spool p={[.36,.743,.11]} c="#a9b6c9"/>
  <group position={[.09,.745,.15]} rotation={[0,.5,0]}>{[-1,1].map(s=><Part key={s} p={[.05,0,s*.008]} s={[.11,.005,.014]} r={[0,s*.12,0]} c="#d8d4cc" radius={.002}/>)}{[-1,1].map(s=><Ring key={s} p={[-.025,0,s*.022]} r={[Math.PI/2,0,0]} radius={.02} tube={.005}/>)}</group>
  <group position={[.43,.745,.2]}><Part p={[0,0,0]} s={[.09,.004,.03]} c={butter} radius={.001}/><Part p={[.05,-.09,.04]} s={[.004,.18,.03]} c={butter} radius={.001}/></group>
 </group>;
}

// The stand the form is on, and where a resident steps up to try one on.
export function FittingStand(props){
 return <group {...props}>
  <Rod p={[0,.028,0]} radius={.3} length={.056} c={cream}/>
  <Rod p={[0,.06,0]} radius={.28} length={.008} c="#ecd3d6"/>
  <Ring p={[0,.052,0]} r={[Math.PI/2,0,0]} radius={.3} tube={.006}/>
 </group>;
}

// The corner as it stands in the study. piece: what the form wears ({pattern, colors}); none, the toile.
export function TailorCorner({piece}){
 return <group>
  <SewingTable position={TABLE_AT}/>
  <group position={STAND_AT}><FittingStand/><group position={[0,.064,0]} rotation={[0,-.32,0]}><DressForm piece={piece||TOILE}/></group></group>
 </group>;
}
