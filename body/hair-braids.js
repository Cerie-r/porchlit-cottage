import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smooth,bump,curve,place,shell,lock,hairGroup} from './hair-tools.js';

// Twin braids. In front, the same blunt fringe as the classic bob, with a short lock down each
// cheek; over the ears the hair is drawn back, parted down the back of the head, and gathered
// behind each ear into a braid that hangs behind the shoulders, tied off with a little tuft.
// Made with body/hair-tools.js (head units, like the classic hair).
const EDGE=[[-Math.PI,2.0],[-2.7,2.06],[-2.36,2.15],[-2.05,2.0],[-1.85,1.8],[-1.5,1.68],[-1.12,1.72],[-.97,2.0],[-.89,2.12],[-.81,1.98],[-.73,1.70],[-.64,1.59],[-.47,1.61],[-.30,1.62],[-.255,1.56],[-.22,1.64],[.12,1.65],[.245,1.63],[.28,1.56],[.32,1.61],[.53,1.60],[.67,1.56],[.74,1.69],[.81,1.98],[.89,2.12],[.97,2.0],[1.12,1.72],[1.5,1.68],[1.85,1.8],[2.05,2.0],[2.36,2.15],[2.7,2.06],[Math.PI,2.0]];
const edge=a=>curve(a,EDGE);
const ROOT=2.35;
function lift(a,t){
 const b=Math.abs(a);
 let d=.03*(1-smooth(t,.1,1.3));
 // the fringe: three broad convex masses, as on the bob
 const front=smooth(Math.cos(a),.54,.85)*smooth(t,.5,1.1);
 d+=.026*front*(bump(a,-.47,.24,4)+bump(a,.015,.26,4)+bump(a,.49,.24,4));
 // the cheek locks, the parting down the back, and the hair gathered towards each braid
 d+=.012*bump(b,.9,.12,4)*smooth(t,.8,1.7);
 d-=.016*bump(b,Math.PI,.07)*smooth(t,.45,.9);
 d+=.02*bump(b,ROOT,.35)*smooth(t,1.6,2.1);
 // soft masses at the back, drawn together towards each braid
 const u=(b-ROOT)/(1-.75*smooth(t,.6,2.05));
 d+=.011*(Math.pow(Math.abs(Math.cos(Math.PI*u/.32)),.5)-.6)*smooth(t,.7,1.4)*smooth(b,1.7,2.0);
 return d;
}
// One braid: lobes along a path, tilted alternately left and right, then a tie and a short tuft.
function braid(side){
 const root=place(side*ROOT,2.0,lift(side*ROOT,2.0)-.01);
 const path=new THREE.CatmullRomCurve3([root,new THREE.Vector3(side*.305,-.3,-.23),new THREE.Vector3(side*.29,-.45,-.17),new THREE.Vector3(side*.27,-.6,-.11)],false,'centripetal');
 const parts=[],N=7,F=new THREE.Vector3(),S=new THREE.Vector3(),m=new THREE.Matrix4(),q=new THREE.Quaternion();
 const frame=s=>{const p=path.getPointAt(s),T=path.getTangentAt(s);F.set(p.x*.8,0,.9).normalize();S.crossVectors(T,F).normalize();F.crossVectors(S,T).normalize();return {p,T:T.clone(),S:S.clone(),F:F.clone()};};
 for(let k=0;k<N;k++){
  const s=.04+.78*k/(N-1),{p,T,S:Sv,F:Fv}=frame(s),tilt=(k%2?1:-1)*.55,taper=1-.2*k/(N-1);
  q.setFromAxisAngle(Fv,tilt);const a=Sv.clone().applyQuaternion(q),b=T.clone().applyQuaternion(q);
  const lobe=new THREE.SphereGeometry(1,14,10);lobe.scale(.056*taper,.078*taper,.05*taper);
  m.makeBasis(a,b,Fv).setPosition(p.clone().addScaledVector(Sv,(k%2?1:-1)*.016*taper));lobe.applyMatrix4(m);parts.push(lobe);
 }
 const tie=frame(.87),ring=new THREE.TorusGeometry(.034,.012,6,18);
 m.makeBasis(tie.F,tie.S,tie.T).setPosition(tie.p);ring.applyMatrix4(m);parts.push(ring);
 for(const k of [-1,0,1]){
  const start=tie.p.clone().addScaledVector(tie.T,-.006);
  parts.push(lock([start,start.clone().addScaledVector(tie.T,.045).addScaledVector(tie.S,k*.016),start.clone().addScaledVector(tie.T,.1).addScaledVector(tie.S,k*.036).addScaledVector(tie.F,.006*(1-Math.abs(k)))],{w:.03,h:.016,peak:.25,tipPow:.8,up:tie.F,under:1,segs:14,ring:10}));
 }
 for(const g of parts)for(const k of Object.keys(g.attributes))if(k!=='position')g.deleteAttribute(k);
 return {geometry:mergeGeometries(parts),tie};
}
export function createBraidsHair(material){
 const braids=[braid(1),braid(-1)],hair=hairGroup('braids-hair',{body:shell({lift,edge}),braids:mergeGeometries(braids.map(b=>b.geometry))},material);
 // where each braid is tied off, for what is worn there (see braidTies in body/accessory-tools.js), in
 // head units: the point, down the braid, across it, and out in front of it
 hair.userData.ties=braids.map(({tie})=>({point:tie.p.toArray(),along:tie.T.toArray(),side:tie.S.toArray(),front:tie.F.toArray()}));
 return hair;
}
