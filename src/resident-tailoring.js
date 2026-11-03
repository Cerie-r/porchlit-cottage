import * as THREE from 'three';
// Shaped garment panels, with an open front for a coat rather than a closed skirt.
export function tailoredShell({coat=false,vest=false}={}){
 const rings=vest?[[.57,.061,.052],[.548,.111,.074],[.515,.143,.106],[.43,.139,.113],[.33,.146,.117]]:[[.592,.051,.047],[.575,.088,.062],[.548,.128,.086],[.515,.145,.104],[.44,.136,.109],[.34,.143,.114],...(coat?[[.265,.148,.117]]:[])];
 const n=64,p=[],ix=[],start=coat?.20:0,end=coat?Math.PI*2-.20:Math.PI*2;
 rings.forEach(([y,w,d],j)=>{for(let i=0;i<=n;i++){let a=start+(end-start)*i/n;p.push(Math.sin(a)*w,y,Math.cos(a)*d);}});
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){let a=j*(n+1)+i,b=a+n+1;ix.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function lapelGeometry(side=1){const pts=[[.045,.568,.071],[.116,.536,.095],[.083,.477,.119],[.105,.465,.12],[.029,.389,.124],[.047,.49,.12]];const shape=new THREE.Shape();pts.forEach(([x,y],i)=>i?shape.lineTo(x*side,y):shape.moveTo(x*side,y));shape.closePath();const g=new THREE.ShapeGeometry(shape);const a=g.attributes.position;for(let i=0;i<a.count;i++){const y=a.getY(i);a.setZ(i,.075+Math.min(1,(.57-y)/.10)*.05);}g.computeVertexNormals();return g;}

// Continuous set-in shoulders and sleeves, sculpted together with the bodice.
export function sculptedGarment({coat=false,girl=false}={}){
 const shoulders=[-1,1].map(s=>sdRoundCone(V(s*.102,.528,0),V(s*.192,.324,.008),coat?.052:.047,coat?.039:.035));
 const f=(x,y,z)=>{
  const t=THREE.MathUtils.clamp((y-.34)/.23,0,1);
  const w=(girl?.120:.137)+(coat?.009:0)+.006*Math.sin(t*Math.PI)-.075*Math.pow(t,5);
  const dep=(coat?.122:.109)-.057*Math.pow(t,4);
  let d=(Math.hypot(x/w,z/dep)-1)*Math.min(w,dep);
  d=Math.max(d,.325-y,y-.585);
  for(const sleeve of shoulders)d=smin(d,sleeve(x,y,z),.008+.024*THREE.MathUtils.smoothstep(y,.42,.53));
  d=Math.max(d,.312-y);
  // Neck opening. Wrist openings are finished separately with narrow cuffs.
  d=Math.max(d,-Math.max(Math.hypot(x,z)-.050,.537-y));
  if(coat){const gap=.023+.012*THREE.MathUtils.clamp((.45-y)/.15,0,1);d=Math.max(d,-Math.max(Math.abs(x)-gap,.018-z,y-.568));}
  return d;
 };
 return meshSDF(f,[-.24,.295,-.15],[.24,.60,.15],.004);
}
import {meshSDF,sdRoundCone,smin,V} from './resident-sculpt.js';
export function collarLeaf(side=1){
 const shape=new THREE.Shape();shape.moveTo(side*.008,.579);shape.lineTo(side*.044,.582);shape.quadraticCurveTo(side*.067,.564,side*.073,.547);shape.lineTo(side*.036,.521);shape.lineTo(side*.014,.553);shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.003,bevelEnabled:true,bevelSize:.0015,bevelThickness:.001,bevelSegments:2,steps:1});const a=g.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,a.getZ(i)+.067+(.582-a.getY(i))*.77);g.computeVertexNormals();return g;
}
