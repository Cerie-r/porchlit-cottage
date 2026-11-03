// Her beret: a soft felt beret worn tipped over to her right and a little back, a plump round crown
// a little wider than her head that tucks in underneath to a snug band, and a little stalk on top. Made in head
// units round the head, and remade round the hairstyle being worn: the band lies just outside the hair
// all round, and the crown is big enough, and high enough, to cover the hair under it.
import * as T from 'three';
import {finish,part,paintPiece,surface,reachOf,hairPoints,toward,angles,onHead} from './accessory-tools.js';

const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
// The beret's own axis, tipped from straight up towards her right and back; the band, a ring this far
// round from the axis on the hair; the crown, as wide as WIDE times the band and plump by PLUMP.
const AXIS=new T.Vector3(-Math.sin(.3),Math.cos(.3),-.12).normalize(),RING=.95,WIDE=1.13,PLUMP=.3,MARGIN=.018;
const COLS=144,ROWS=40;
function frame(){const p1=new T.Vector3(0,0,1).sub(AXIS.clone().multiplyScalar(AXIS.z)).normalize(),p2=AXIS.clone().cross(p1).normalize();return {p1,p2};}
function geometries(points){
 const reach=reachOf(points),{p1,p2}=frame(),ring=[],out=[];
 // the band round the head, and how far it is from the axis and along it
 for(let j=0;j<=COLS;j++){const f=j/COLS*Math.PI*2,d=AXIS.clone().multiplyScalar(Math.cos(RING)).addScaledVector(p1,Math.sin(RING)*Math.cos(f)).addScaledVector(p2,Math.sin(RING)*Math.sin(f));
  const b=d.clone().multiplyScalar(reach(...angles(d))+MARGIN);ring.push(b);out.push(b.clone().sub(AXIS.clone().multiplyScalar(b.dot(AXIS))));}
 const radius=out.reduce((s,o)=>s+o.length(),0)/out.length,base=ring.reduce((s,b)=>s+b.dot(AXIS),0)/ring.length;
 // the crown, read up from the band (s 0) to the middle of the top (s 1): from the band it tucks out
 // and a little up to the rim, its widest, then rounds over a plump top, high enough in the middle to
 // clear the hair along the axis
 const R=radius*WIDE,H=radius*PLUMP,top=Math.max(reach(...angles(AXIS))+MARGIN+.03,base+H*1.6);
 const crown=surface((s,t)=>{
  const j=Math.round(t*COLS),b=ring[j],o=out[j].clone().normalize(),rb=out[j].length(),hb=b.dot(AXIS),rim=hb+.3*H,r=Math.max(R,rb*1.06),q=-Math.PI/2+Math.PI*s;
  const [rho,h]=q<0?[rb+(r-rb)*Math.cos(q),rim+(rim-hb)*Math.sin(q)]:[r*Math.cos(q),rim+(top-rim)*Math.sin(q)];
  return AXIS.clone().multiplyScalar(h).addScaledVector(o,rho);
 },ROWS,COLS);
 // the stalk on top
 const stalk=new T.CapsuleGeometry(.017,.05,5,12);stalk.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),AXIS.clone().add(new T.Vector3(.35,0,0)).normalize()));stalk.translate(...AXIS.clone().multiplyScalar(top+.022).add(new T.Vector3(.006,0,0)).toArray());
 return {crown,stalk};
}
const NAMES={crown:'her-beret-crown',stalk:'her-beret-stalk'};
function build(){
 const group=new T.Group();group.name='her-beret';
 const felt=finish('main','#efe3cf',{roughness:.97}),stalk=finish('accent','#e2d3bb',{roughness:.97}),g=geometries([]);
 part(group,g.crown,felt,NAMES.crown);part(group,g.stalk,stalk,NAMES.stalk);
 return group;
}
function place(beret,hair){
 const g=geometries(hairPoints(hair));
 for(const [key,name] of Object.entries(NAMES)){const m=beret.getObjectByName(name);m.geometry.dispose();m.geometry=g[key];}
 onHead(beret,hair);
}

export const herBeret={
 id:'her-beret',name:'软贝雷帽',slot:'head',wearers:['girl'],hat:.1,
 create:build,place,
 colorways:[{id:'cream',name:'奶油',colors:{main:'#efe3cf',accent:'#e2d3bb'}},{id:'berry',name:'草莓',colors:{main:'#c95564',accent:'#b8495a'}},{id:'mist',name:'雾蓝',colors:{main:'#a7b9d3',accent:'#97a9c4'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M16 70q-2-30 40-36 44-4 50 22 2 14-44 20-44 6-46-6z" fill="#efe3cf"/><path d="m54 34 4-12" stroke="#e2d3bb" stroke-width="7" stroke-linecap="round"/></svg>'
};
