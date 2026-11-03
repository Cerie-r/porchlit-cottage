import React,{useLayoutEffect,useMemo,useRef} from 'react';
import * as T from 'three';

// Pearls threaded along a curve, evenly spaced, as one instanced mesh.
export function PearlStrand({points,radius=.011,spacing=.03,color='#f6f0e7',closed=false}){
  const key=JSON.stringify(points);
  const spots=useMemo(()=>{
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed);
    const count=Math.max(2,Math.round(curve.getLength()/spacing));
    const all=curve.getSpacedPoints(count);
    return closed?all.slice(0,count):all;
  },[key,spacing,closed]);
  const ref=useRef();
  useLayoutEffect(()=>{const m=new T.Matrix4();spots.forEach((p,i)=>{m.makeTranslation(p.x,p.y,p.z);ref.current.setMatrixAt(i,m);});ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();},[spots]);
  return <instancedMesh ref={ref} args={[undefined,undefined,spots.length]} castShadow>
    <sphereGeometry args={[radius,10,8]}/>
    <meshStandardMaterial color={color} roughness={.26} metalness={.08}/>
  </instancedMesh>;
}
