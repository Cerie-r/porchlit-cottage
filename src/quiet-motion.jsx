import {useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {motionStep} from './motion-step.js';
export function useQuietMotion(ref,property,axis,target,speed=10){
 const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{invalidate();},[target,invalidate]);
 useFrame((_,delta)=>{
  const object=ref.current;if(!object)return;
  const next=motionStep(object[property][axis],target,delta,speed);
  object[property][axis]=next;
  if(next!==target)invalidate();
 });
}
