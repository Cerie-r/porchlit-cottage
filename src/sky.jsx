import React from 'react';
import {makeStars,makeClouds,starOpacity,cloudOpacity} from './sky-state.js';
import './sky.css';

const stars=makeStars();
const clouds=makeClouds();

function Cloud({cloud,id}){
 const {base,puffs}=cloud;
 return <svg className={'cloud'+(cloud.extra?' extra':'')} viewBox="0 0 200 100" style={{left:cloud.x+'%',top:cloud.y+'%','--w':cloud.w,'--o':cloud.o,'--drift':cloud.drift+'px','--dur':cloud.dur+'s','--delay':cloud.delay+'s'}}>
  {/* One gradient in shared coordinates, so overlapping puffs read as a single soft shape. */}
  <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="82"><stop offset="0" stopColor="#fffefb"/><stop offset=".58" stopColor="#fbf6f3"/><stop offset="1" stopColor="#e9dfe3"/></linearGradient></defs>
  <g fill={`url(#${id})`}>
   <rect x={base.x} y={base.y} width={base.w} height={base.h} rx={base.h/2}/>
   {puffs.map((p,i)=><circle key={i} cx={p.cx} cy={p.cy} r={p.r}/>)}
  </g>
 </svg>;
}

// Sits behind the transparent 3D canvas and in front of the .app sky gradient:
// a few drifting clouds by day, stars at night.
export function Sky({daylight}){
 const day=cloudOpacity(daylight),night=starOpacity(daylight);
 return <>
  {day>0&&<div className="sky sky-clouds" aria-hidden="true" style={{opacity:day}}>
   {clouds.map((c,i)=><Cloud key={i} cloud={c} id={'porchlit-cloud-'+i}/>)}
  </div>}
  {night>0&&<div className="sky sky-stars" aria-hidden="true" style={{opacity:night}}>
   {stars.map((s,i)=><i key={i} className={'star'+(s.twinkle?' twinkle':'')+(s.glint?' glint':'')+(s.extra?' extra':'')} style={{left:s.x+'%',top:s.y+'%','--o':s.o,'--tint':s.tint,'--core':(s.r*.6).toFixed(2)+'px','--edge':(s.r*1.5).toFixed(2)+'px','--dur':s.dur+'s','--delay':s.delay+'s'}}/>)}
  </div>}
 </>;
}
