import React,{useEffect,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
function WakeFrame({paused}){
 const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{if(!paused)invalidate();},[paused,invalidate]);
 return null;
}
// Keep GPU resources mounted, but stop frames while covered or in a hidden tab.
export function QuietCanvas({paused=false,children,...props}){
 const [hidden,setHidden]=useState(()=>document.hidden);
 useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 const asleep=paused||hidden;
 return <Canvas {...props} frameloop={asleep?'never':'demand'}><WakeFrame paused={asleep}/>{children}</Canvas>;
}
