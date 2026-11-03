// Round glasses: two round rims of soft, glossy acetate, a little arched bridge, two metal pins at
// each hinge, temples that run back over the ears. Made in head units round the eyes (body/face.js)
// and worn like a hairstyle, at the hair's centre and in its scale.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {finish,part,paintPiece,EYE,EAR,faceZ,eyeZ,headRadius,onHead,sweep,metalFinish} from './accessory-tools.js';

const R=.104,W=.0095,D=.0075;            // a rim's radius, and its section (across the rim, front to back)
const YAW=.22,PITCH=.09;                 // each lens turns out with the face, and tips its bottom in a little
const TEMPLE=.0055,CLEAR=.012;           // the temples' radius; what is left between frame and face
const v3=(x,y,z)=>new T.Vector3(x,y,z);

// One lens: its normal, the outward and upward directions in its plane, and a point on the rim at
// angle a (0 outwards, pi/2 up) for a rim centred at c.
function lensAxes(side){
 const n=v3(side*Math.sin(YAW)*Math.cos(PITCH),-Math.sin(PITCH),Math.cos(YAW)*Math.cos(PITCH)).normalize();
 const up=v3(0,1,0).addScaledVector(n,-n.y).normalize(),out=new T.Vector3().crossVectors(up,n).normalize();
 if(out.x*side<0)out.negate();
 return {n,up,out,at:(c,a,r=R)=>c.clone().addScaledVector(out,r*Math.cos(a)).addScaledVector(up,r*Math.sin(a))};
}
// How far forward the lenses' centres have to be for the frame to clear the face, and the lenses the
// eyes: every point of the rim, and of the lens, in front of what is behind it.
function lensDepth(side,axes){
 let z=0;const c=v3(side*EYE.x,EYE.y,0);
 for(let i=0;i<72;i++){const a=i/72*Math.PI*2;
  for(const s of [-Math.PI/2,-Math.PI/4,-3*Math.PI/4]){const p=axes.at(c,a,R+W*Math.cos(s)).addScaledVector(axes.n,D*Math.sin(s));z=Math.max(z,faceZ(p.x,p.y)+CLEAR-p.z);}
  for(const r of [0,.03,.06,.09]){const p=axes.at(c,a,r);z=Math.max(z,Math.max(faceZ(p.x,p.y),eyeZ(p.x,p.y))+.01-p.z);}
 }
 return z;
}

function build(){
 const group=new T.Group();group.name='round-glasses';
 const frame=finish('main','#2b2629',{roughness:.32}),pin=metalFinish('accent','#c9a96e');
 const glass=finish('fixed','#ffffff',{roughness:.05,transparent:true,opacity:.08,depthWrite:false});
 const shine=finish('fixed','#ffffff',{roughness:.2,transparent:true,opacity:.55,depthWrite:false});
 const frames=[],pins=[],lenses=[],glints=[],inner=[];
 for(const side of [-1,1]){
  const axes=lensAxes(side),c=v3(side*EYE.x,EYE.y,0);c.z=lensDepth(side,axes);
  // the rim, swept round the lens with its flat side to the front
  const ring=[];for(let i=0;i<64;i++)ring.push(axes.at(c,i/64*Math.PI*2));
  frames.push(sweep(ring,{w:W,d:D,closed:true,around:10,frame:(t,p,tangent,s,o)=>{s.subVectors(p,c).normalize();o.copy(axes.n);}}));
  // the lens, a hair behind the front of the rim, and a little arc of light in its upper outer part
  const toLens=new T.Matrix4().makeBasis(axes.out,axes.up,axes.n).setPosition(c.clone().addScaledVector(axes.n,-.001));
  lenses.push(new T.CircleGeometry(R-W*.4,48).applyMatrix4(toLens));
  const arc=side>0?[Math.PI*.58,.55]:[Math.PI*.24,.55];
  glints.push(new T.RingGeometry(R-.031,R-.022,20,1,...arc).applyMatrix4(toLens.clone().setPosition(c.clone().addScaledVector(axes.n,.0025))));
  // the hinge: a short block out from the rim, two pins on its face, and the temple from its end
  const a0=.12,edge=axes.at(c,a0,R+W*.6),hinge=edge.clone().addScaledVector(axes.out,.014).addScaledVector(axes.n,-.006);
  frames.push(sweep([edge,edge.clone().lerp(hinge,.5),hinge],{w:.0075,d:.0068,around:8,frame:(t,p,tangent,s,o)=>{s.copy(axes.up);o.crossVectors(tangent,s).normalize();}}));
  for(const a of [a0+.13,a0-.13])pins.push(new T.SphereGeometry(.0037,10,8).translate(...axes.at(c,a,R+W*.15).addScaledVector(axes.n,D*.95).toArray()));
  // the temple runs back round the head, closing in on it towards the ear, over the top of the ear
  // and down behind it
  const path=[hinge],a1=Math.atan2(Math.abs(hinge.x),hinge.z),r1=Math.hypot(hinge.x,hinge.z),earTop=EAR.y+EAR.ry+TEMPLE+.004;
  const gap0=r1-headRadius(hinge.y,a1),steps=14;
  for(let i=1;i<=steps;i++){const t=i/steps,a=a1+(Math.PI/2+.03-a1)*t,y=hinge.y+(earTop-hinge.y)*T.MathUtils.smoothstep(t,0,1),gap=CLEAR+TEMPLE+(gap0-CLEAR-TEMPLE)*(1-T.MathUtils.smoothstep(t,0,.7)),r=headRadius(y,a)+gap;path.push(v3(side*Math.sin(a)*r,y,Math.cos(a)*r));}
  for(const [da,dy] of [[.09,-.03],[.16,-.08],[.2,-.12]]){const a=Math.PI/2+.03+da,y=earTop+dy,r=headRadius(y,a)+CLEAR+TEMPLE;path.push(v3(side*Math.sin(a)*r,y,Math.cos(a)*r));}
  const curve=new T.CatmullRomCurve3(path);
  frames.push(new T.TubeGeometry(curve,48,TEMPLE,8,false),new T.SphereGeometry(TEMPLE,10,8).translate(...path.at(-1).toArray()));
  inner.push(axes.at(c,Math.PI-.42,R+W*.5));
 }
 // the bridge arches up a little over the middle, clear of the face
 const [l,r]=inner,top=Math.max(l.y,r.y)+.024,mid=v3(0,top,Math.max(faceZ(0,top)+CLEAR+.004,(l.z+r.z)/2+.004));
 const bridge=new T.CatmullRomCurve3([l,v3(l.x*.55,l.y+.016,(l.z+mid.z)/2),mid,v3(r.x*.55,r.y+.016,(r.z+mid.z)/2),r]);
 frames.push(new T.TubeGeometry(bridge,24,.0062,8,false));
 part(group,mergeGeometries(frames),frame,'round-glasses-frame');
 part(group,mergeGeometries(pins),pin,'round-glasses-pins');
 const lens=part(group,mergeGeometries(lenses),glass,'round-glasses-lens'),glint=part(group,mergeGeometries(glints),shine,'round-glasses-glint');
 lens.castShadow=glint.castShadow=false;lens.renderOrder=glint.renderOrder=1;
 return group;
}

export const roundGlasses={
 id:'round-glasses',name:'圆框眼镜',slot:'face',wearers:['boy','girl'],
 create:build,place:(object,hair)=>onHead(object,hair),
 colorways:[{id:'ink',name:'墨黑',colors:{main:'#2b2629',accent:'#c9a96e'}},{id:'amber',name:'琥珀',colors:{main:'#8f5a3c',accent:'#e0c48f'}},{id:'rose',name:'雾粉',colors:{main:'#d4a2a6',accent:'#f4e9dc'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><circle cx="38" cy="62" r="20" fill="none" stroke-width="5"/><circle cx="82" cy="62" r="20" fill="none" stroke-width="5"/><path d="M56 56q4-5 8 0" stroke-width="4"/></svg>'
};
