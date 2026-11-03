// A padded satin headband with a knot on top: a soft, round band lying on the hair over the top of the
// head, a little behind where the fringe starts, its ends tucked down behind the ears; on top a fat
// knot, where the band is gathered a little fuller. Made in head units round the head, and laid on the
// hairstyle being worn: everywhere it lies just outside the hair (or the head, where there is none).
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {finish,part,paintPiece,sweep,reachOf,hairPoints,toward,angles,onReach,onHead} from './accessory-tools.js';

const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
// Where it goes over the head, from behind her right ear over the top to behind her left: by angle
// round (0 straight ahead, pi/2 to her left) and elevation (pi/2 straight up).
const ROUTE=[[-2.0,-.2],[-1.62,.5],[0,1.2],[1.62,.5],[2.0,-.2]];
const N=64,W=.024,D=.0095,WIDE=1.3;
// How wide and thick it is along its length (t from 0 to 1): fuller in the middle, where it is gathered
// into the knot, closing up at its tucked-in ends.
const size=t=>{const u=Math.abs(t-.5)*2;return (1+(WIDE-1)*(1-smooth(u,0,.22)))*Math.sqrt(Math.max(0,1-smooth(u,.9,1)*.97));};
// Its middle line, lying on the hair, and which way it faces there: it lies along the hair's surface
// (which way that faces, smoothed along it), and stands as far out from it as the hair rises anywhere
// across its width, so no strand comes up through it, and no further.
function bandLine(reach){
 const route=new T.CatmullRomCurve3(ROUTE.map(([a,e])=>toward(a,e)),false,'centripetal'),dirs=[];
 for(let i=0;i<=N;i++)dirs.push(route.getPointAt(i/N).normalize());
 const on=dirs.map(d=>onReach(reach,...angles(d))),near=(list,i,r)=>list.slice(Math.max(0,i-r),i+r+1);
 const normals=on.map((_,i)=>near(on,i,3).reduce((n,o)=>n.add(o.normal),new T.Vector3()).normalize());
 const rise=dirs.map((d,i)=>{const along=dirs[Math.min(N,i+1)].clone().sub(dirs[Math.max(0,i-1)]),side=along.cross(normals[i]).normalize(),base=on[i].point;let h=0;
  for(const k of [-1,-.5,.5,1]){const q=base.clone().addScaledVector(side,k*W*size(i/N)).normalize(),hair=toward(...angles(q),reach(...angles(q)));h=Math.max(h,hair.sub(base).dot(normals[i]));}return h;});
 const most=rise.map((_,i)=>Math.max(...near(rise,i,2))),even=most.map((_,i)=>{const w=near(most,i,1);return w.reduce((x,y)=>x+y,0)/w.length;});
 return {points:on.map((o,i)=>o.point.clone().addScaledVector(normals[i],even[i]+D*size(i/N)-.002)),normals};
}
function geometries(points){
 const reach=reachOf(points,{A:240,E:120,spread:1,smoothing:0}),{points:line,normals}=bandLine(reach);
 const band=sweep(line,{w:t=>W*size(t),d:t=>D*size(t),around:16,frame:(t,p,tangent,side,out)=>{out.copy(normals[Math.round(t*N)]);side.crossVectors(tangent,out).normalize();out.crossVectors(side,tangent).normalize();}});
 // the knot: two plump twists crossing over the top of the band
 const top=line[N/2],up=normals[N/2],along=line[N/2+1].clone().sub(line[N/2-1]).normalize(),across=along.clone().cross(up).normalize(),parts=[];
 for(const k of [-1,1]){const g=new T.SphereGeometry(1,20,14).scale(.054,.036,.03),q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(along,across,up));
  g.applyQuaternion(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),k*.62)).applyQuaternion(q).translate(...top.clone().addScaledVector(up,.01+.005*(k+1)).toArray());parts.push(g);}
 return {band,knot:mergeGeometries(parts)};
}
const NAMES={band:'headband-band',knot:'headband-knot'};
function build(){
 const group=new T.Group();group.name='headband';
 const satin=finish('main','#efe4d2',{roughness:.45}),knot=finish('accent','#e8dcc7',{roughness:.45}),g=geometries([]);
 part(group,g.band,satin,NAMES.band);part(group,g.knot,knot,NAMES.knot);
 return group;
}
function place(headband,hair){
 const g=geometries(hairPoints(hair));
 for(const [key,name] of Object.entries(NAMES)){const m=headband.getObjectByName(name);m.geometry.dispose();m.geometry=g[key];}
 onHead(headband,hair);
}

export const headband={
 id:'headband',name:'发箍',slot:'head',wearers:['girl'],
 create:build,place,
 colorways:[{id:'cream',name:'奶油',colors:{main:'#efe4d2',accent:'#e8dcc7'}},{id:'rose',name:'雾粉',colors:{main:'#e3b7bd',accent:'#dba9b0'}},{id:'velvet',name:'丝绒黑',colors:{main:'#2f2a2e',accent:'#28242a'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M22 84q-4-56 38-58 42 2 38 58" fill="none" stroke="#efe4d2" stroke-width="12" stroke-linecap="round"/><ellipse cx="60" cy="26" rx="16" ry="10" fill="#e8dcc7"/></svg>'
};
