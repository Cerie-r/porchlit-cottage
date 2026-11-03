// A Christmas hat: a soft velvet crown pulled down over the hair, a deep band of white fur round the
// bottom, and its top drawn out into a long soft point that flops over to one side and back, with a
// fluffy pompom at its end. Made in head units round the head (body/round-head.js) and remade round
// the hairstyle being worn, like the beanie: the crown lies just outside the hair everywhere above its
// band (or outside the head where there is no hair), and the point rises clear of the top of the hair
// before it bends over. Kept for the capsule machine's Christmas pool.
import * as T from 'three';
import {finish,part,paintPiece,surface,reachOf,hairPoints,toward,onHead} from './accessory-tools.js';

const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
const COLS=96,CROWN=18,POINT=30,MARGIN=.024,E1=1.08,FUR=.16,POM=.1,SIDE=1;
// The band (the fur's lower edge): how high it is above the head's centre towards angle a (0 straight
// ahead, pi/2 to the wearer's left): low on the forehead, down over the nape at the back.
const bandY=a=>.05+.08*Math.cos(a)-.01*Math.sin(a);
function bandOf(reach){const cache=new Map();return a=>{const k=Math.round(a*1e4);if(!cache.has(k)){let e=0;for(let i=0;i<6;i++)e=Math.asin(T.MathUtils.clamp(bandY(a)/reach(a,e),-1,1));cache.set(k,e);}return cache.get(k);};}
// Fur and pompoms: a soft roughness, the same every time.
const fluff=(a,b)=>.5*Math.sin(31*a+7*b)+.3*Math.sin(17*a-11*b+1.3)+.2*Math.sin(47*a+5*b+2.1);
function pompom(){
 const g=new T.SphereGeometry(1,32,22),p=g.attributes.position,v=new T.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=.09*Math.sin(v.x*13+1.7)*Math.sin(v.y*11+.4)*Math.sin(v.z*12+2.2)+.05*Math.sin(v.x*29+v.y*23)*Math.cos(v.z*31-v.y*7);v.multiplyScalar(1+n);p.setXYZ(i,v.x,v.y,v.z);}
 g.computeVertexNormals();return g;
}
const bezier=(p,t)=>{const u=1-t;return p[0].clone().multiplyScalar(u*u*u).addScaledVector(p[1],3*u*u*t).addScaledVector(p[2],3*u*t*t).addScaledVector(p[3],t*t*t);};
// Everything round what it is worn over: points in head units, from the head's centre.
function geometries(points){
 const reach=reachOf(points),band=bandOf(reach),out=(a,e)=>reach(a,e)+MARGIN;
 // the crown, up from just inside the fur to a ring at elevation E1, fuller towards it, so that by the
 // ring its side is nearly upright, as the point rises from it
 const crown=(a,s)=>{const e0=band(a)+.04,e=e0+(E1-e0)*s;return toward(a,e,out(a,e)+.02*smooth(s,.3,1)+.075*smooth(s,.45,1)**2);};
 const ring=a=>crown(a,1);
 const C=new T.Vector3();for(let i=0;i<COLS;i++)C.add(ring(i/COLS*Math.PI*2));C.divideScalar(COLS);
 let r1=0;for(let i=0;i<COLS;i++){const p=ring(i/COLS*Math.PI*2);r1+=Math.hypot(p.x-C.x,p.z-C.z)/COLS;}
 // what of the hair is above that ring: how high it goes, and how far out from the ring's middle
 let top=C.y,wide=0;for(let i=0;i<48;i++)for(let j=0;j<=8;j++){const a=i/48*Math.PI*2,e=E1+(Math.PI/2-E1)*j/8,p=toward(a,e,out(a,e));top=Math.max(top,p.y);wide=Math.max(wide,Math.hypot(p.x-C.x,p.z-C.z));}
 // the point: up past the top of the hair, then over to the side and back, and down beside the crown;
 // as long as it is still rising over the hair, wide enough to keep the hair under it
 const rise=Math.max(.12,top-C.y+.07);
 const spine=[C.clone(),C.clone().add(new T.Vector3(0,rise,0)),C.clone().add(new T.Vector3(SIDE*.3,rise+.02,-.12)),new T.Vector3(SIDE*.56,C.y-.07,-.33)];
 const radius=t=>{const r=r1*(1-t)**1.15+.035*t,p=bezier(spine,t);return t<.4&&p.y<top+.04?Math.max(r,wide+.01):r;};
 // carry a frame along it, turning it no more than the spine turns
 const frames=[];let N=new T.Vector3(1,0,0),B=new T.Vector3(0,0,-1),Tg=new T.Vector3(0,1,0);
 for(let k=0;k<=POINT;k++){const t=k/POINT,d=bezier(spine,Math.min(1,t+.002)).sub(bezier(spine,Math.max(0,t-.002))).normalize();const q=new T.Quaternion().setFromUnitVectors(Tg,d);N=N.applyQuaternion(q).normalize();B=B.applyQuaternion(q).normalize();Tg=d;frames.push({N:N.clone(),B:B.clone()});}
 // across the point: from the ring's own shape at its foot to a circle, carried round with the frame
 // (at the foot, x along N and z against B)
 const tip=(a,t)=>{const {N,B}=frames[Math.round(t*POINT)],w=smooth(t,0,.2),r=radius(t),p=bezier(spine,t);
  const own=ring(a).sub(C).multiplyScalar(1+(r/r1-1)*smooth(t,0,.25)),round=new T.Vector3(Math.sin(a),0,Math.cos(a)).multiplyScalar(r),v=own.lerp(round,w);
  return p.addScaledVector(N,v.x).addScaledVector(B,-v.z).add(new T.Vector3(0,v.y,0));};
 const S=CROWN/(CROWN+POINT);
 const hat=surface((s,t)=>{const a=Math.PI+t*Math.PI*2;return s<=S?crown(a,s/S):tip(a,(s-S)/(1-S));},CROWN+POINT,COLS);
 // the fur band round the bottom: thick and soft, its edges rounded, read round its section by t
 const fur=surface((t,u)=>{const a=Math.PI+u*Math.PI*2,q=Math.PI+t*Math.PI*2,c=Math.cos(q),sn=Math.sin(q),o=Math.sign(c)*Math.abs(c)**.55,up=Math.sign(sn)*Math.abs(sn)**.6;
  const e0=band(a),e=e0+FUR/.45*(1+up)/2;return toward(a,e,out(a,e)+.018+.024*o+.008*fluff(a,up*3)*(1+o)/2);},16,COLS);
 const end=bezier(spine,1),last=bezier(spine,.98),along=end.clone().sub(last).normalize();
 return {hat,fur,pompom:pompom().scale(POM,POM,POM).translate(...end.addScaledVector(along,POM*.55).toArray())};
}
const NAMES={hat:'santa-hat-crown',fur:'santa-hat-fur',pompom:'santa-hat-pompom'};
function build(){
 const group=new T.Group();group.name='santa-hat';
 const velvet=new T.MeshPhysicalMaterial({name:'main',color:'#c0283a',roughness:.75,sheen:.8,sheenRoughness:.35,sheenColor:new T.Color('#ffe2dc'),side:T.DoubleSide});
 const fur=finish('accent','#fbf6f0',{roughness:1}),g=geometries([]);
 part(group,g.hat,velvet,NAMES.hat);part(group,g.fur,fur,NAMES.fur);part(group,g.pompom,fur,NAMES.pompom);
 return group;
}
// Remade round the hair being worn (leaving out a curl), at the hair's centre, in its scale.
function place(hat,hair){
 const g=geometries(hairPoints(hair));
 for(const [key,name] of Object.entries(NAMES)){const m=hat.getObjectByName(name);m.geometry.dispose();m.geometry=g[key];}
 onHead(hat,hair);
}
export const santaHat={
 id:'santa-hat',name:'圣诞帽',slot:'head',wearers:['girl','boy'],hat:true,hidesCurl:true,pool:'christmas',
 create:build,place,
 colorways:[{id:'red',name:'圣诞红',colors:{main:'#c0283a',accent:'#fbf6f0'}},{id:'holly',name:'冬青',colors:{main:'#2f6b4a',accent:'#fbf6f0'}},{id:'berry',name:'莓果',colors:{main:'#e38aa0',accent:'#fbf6f0'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M22 84q4-52 44-58 26-2 36 22l-8 6q-10-12-22-10 14 10 12 40z" fill="#c0283a"/><path d="M18 78q42-12 84 0v16q-42-12-84 0z" fill="#fbf6f0"/><circle cx="96" cy="58" r="11" fill="#fbf6f0"/></svg>'
};
