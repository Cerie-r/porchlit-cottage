import {studyChairLayout,studyChairSeat} from './study-chair-layout.js';
import {SeatTarget} from './seat-interaction.jsx';
import {ShellCrest,CarvedLine} from './rococo-details.jsx';
import React,{useRef,useContext} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Part,Rod} from './brick-interior.jsx';
import {UpstairsContext} from './upstairs-interaction.jsx';
export function StudyChair(){
 const swivel=useRef(),elapsed=useRef(null),invalidate=useThree(s=>s.invalidate),context=useContext(UpstairsContext);
 useFrame((_,dt)=>{if(elapsed.current===null)return;elapsed.current=Math.min(1.65,elapsed.current+Math.min(dt,.05));const t=elapsed.current/1.65;swivel.current.rotation.y=2*Math.PI*(t*t*(3-2*t));if(t===1){swivel.current.rotation.y=0;elapsed.current=null;}else invalidate();});
 const turn=e=>{e.stopPropagation();if(e.delta>5)return;if(context.decorMode){context.onSelect('studyDesk');return;}if(elapsed.current===null){elapsed.current=0;invalidate();}};
 return <group position={studyChairLayout.position} onClick={turn} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer';}} onPointerOut={()=>document.body.style.cursor='default'}>
 <SeatTarget id="studyChair" {...studyChairSeat} search={false}><Rod p={[0,.39,0]} radius={.045} length={.55} c="#b79c7c"/>
 {Array.from({length:5},(_,i)=><group key={i} rotation={[0,i*Math.PI*2/5,0]}><Part p={[0,.13,.23]} s={[.045,.04,.5]} c="#b79c7c"/><Rod p={[0,.1,.46]} radius={.055} length={.05} c="#837166" r={[0,0,Math.PI/2]}/></group>)}
 <group ref={swivel}><ShellCrest position={[0,1.39,.19]} scale={.4}/><CarvedLine points={[[-.4,1.3,.19],[-.23,1.41,.19],[0,1.44,.19],[.23,1.41,.19],[.4,1.3,.19]]}/>
 <Part p={studyChairLayout.cushionPosition} s={studyChairLayout.cushionSize} radius={.1} c="#e3c8cc" finish="fabric"/>
 <Part p={[0,1.04,.31]} s={[.85,.73,.22]} radius={.15} r={[.08,0,0]} c="#e3c8cc" finish="fabric"/>
 <Part p={[0,1.05,.185]} s={[.66,.52,.09]} radius={.07} r={[.08,0,0]} c="#f0dce0" finish="fabric"/>
 {[-1,1].map(side=><group key={side}><Rod p={[side*.4,.79,.05]} radius={.025} length={.28} c="#b79c7c"/><Part p={[side*.4,.92,.02]} s={[.13,.13,.55]} radius={.06} c="#ead3d5" finish="fabric"/></group>)}
 </group></SeatTarget></group>;
}
