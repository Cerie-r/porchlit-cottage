import React from 'react';
import {MiniMaterial} from './miniature-finish.jsx';
// A shelf-sized collectible, not an avatar or an autonomous character.
function Oval({p,s,c,finish='enamel'}){return <mesh position={p} scale={s} castShadow receiveShadow><sphereGeometry args={[1,24,16]}/><MiniMaterial color={c} finish={finish}/></mesh>;}
export function MiniFigure(){return <group>
 <mesh position={[0,.018,0]} castShadow><cylinderGeometry args={[.16,.17,.035,40]}/><MiniMaterial color="#b59a79" finish="wood"/></mesh>
 {[-1,1].map(side=><group key={side}><Oval p={[side*.067,.07,.025]} s={[.055,.035,.09]} c="#7b655e"/><Oval p={[side*.065,.14,0]} s={[.032,.09,.035]} c="#efe1cd"/><Oval p={[side*.14,.32,0]} s={[.04,.11,.044]} c="#c3a2aa" finish="fabric"/><Oval p={[side*.14,.23,.014]} s={[.033,.037,.035]} c="#e6c9aa"/></group>)}
 <mesh position={[0,.29,0]} castShadow><cylinderGeometry args={[.08,.15,.24,32]}/><MiniMaterial color="#c3a2aa" finish="fabric"/></mesh>
 <Oval p={[0,.52,0]} s={[.12,.14,.108]} c="#e6c9aa"/>
 <mesh position={[0,.55,-.015]} castShadow><sphereGeometry args={[.128,32,20,0,Math.PI*2,0,Math.PI*.55]}/><MiniMaterial color="#785e4e"/></mesh>
 {[-1,1].map(side=><group key={side}><Oval p={[side*.105,.49,-.025]} s={[.033,.09,.075]} c="#785e4e"/><Oval p={[side*.042,.53,.101]} s={[.009,.012,.006]} c="#463a35"/><Oval p={[side*.073,.50,.087]} s={[.017,.009,.006]} c="#dba6a0"/></group>)}
 <Oval p={[0,.49,.11]} s={[.012,.005,.005]} c="#a0786f"/>
 <mesh position={[0,.65,0]} castShadow><cylinderGeometry args={[.145,.15,.018,40]}/><MiniMaterial color="#dbc8a4" finish="wood"/></mesh>
 <Oval p={[0,.67,-.01]} s={[.10,.055,.095]} c="#dbc8a4"/>
 {[.29,.34,.39].map(y=><Oval key={y} p={[0,y,.10]} s={[.008,.008,.006]} c="#c8aa6f"/>)}
 </group>;}
