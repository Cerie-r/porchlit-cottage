import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smooth,bump,curve,place,shell,lock,hairGroup} from './hair-tools.js';

// A fluffy layered cut, in two layers. On top, a full round cap of broad thick leaves that fan out
// from the crown, the front ones out over the forehead and the side and back ones curving forwards;
// every other leaf lies over its neighbours with a rounded rim, and each ends in a soft point, the
// fringe at the brows with a little split in the middle, the back ones halfway down. Under it, a
// smooth layer round the back of the head down to the nape, with sideburns in front of the ears.
// A small two-pronged cowlick on the crown. Made with body/hair-tools.js.
//
// The cap's leaves are worked into its shell: each one is a band of the shell's columns, and at()
// bends the columns along the leaves as they fall, so the rims between leaves run along the columns
// and stay crisp.
// 1 at the back of the head, 0 at the front
const backOf=a=>smooth(-Math.cos(a),0,.9);
const wrap=x=>x-2*Math.PI*Math.round(x/(2*Math.PI));
// How far the cap's columns have bent round the head at height t: the front ones fan out over the
// forehead, the side and back ones curve forwards.
const swirl=(a,t)=>.3*Math.sin(2*a)*Math.pow(smooth(t,.3,1.7),1.3);
// The leaves round the head: where each begins (column angle, going round through the wearer's
// right, the front and the left; the last one wraps round to the first), how far down its point
// reaches, where across it the point is (0 to 1), and whether it lies on top (1) or under (0).
const START=[-2.78,-2.3,-1.72,-1.3,-.98,-.7,-.4,.02,.3,.62,.96,1.34,1.76,2.24,2.7];
const LEAVES=[
 [1.84,.45,0],[1.78,.5,1],[1.74,.35,0],[1.7,.3,1],[1.62,.3,0],[1.58,.35,1],[1.6,.45,1],[1.56,.55,0],[1.6,.65,1],[1.54,.7,0],
 [1.66,.7,1],[1.74,.65,0],[1.8,.55,1],[1.84,.5,0],[1.92,.5,1]
];
// between two leaves the hem goes high up into a notch, so that their points stand apart
const NOTCH=[[0,1.2],[.6,1.24],[1.0,1.32],[1.5,1.42],[2.0,1.38],[Math.PI,1.4]];
// the leaf a column angle lies in, where across it (0 to 1), and how wide it is
function leafAt(a){
 const n=START.length,x=a<START[0]?a+2*Math.PI:a;
 for(let k=0;k<n;k++){const lo=START[k],hi=k<n-1?START[k+1]:START[0]+2*Math.PI;if(x>=lo&&x<=hi)return [k,(x-lo)/(hi-lo),hi-lo];}
 return [0,0,1];
}
function capLift(a,t){
 const [k,u]=leafAt(a),x=Math.abs(2*u-1),b=Math.abs(wrap(a+swirl(a,t)));
 // a full crown and a round back of the head
 const d=.026+.06*(1-smooth(t,.3,1.45))+.06*backOf(b)*bump(t,1.35,.7);
 // a leaf on top: domed, a crisp rounded rim each side; one under: nearly flat, tucked under its neighbours
 const r=LEAVES[k][2]?.02+.036*(.5+.5*Math.sqrt(1-x*x))*(1-smooth(x,.8,1)):.02+.012*Math.sqrt(1-x*x);
 return d+r*smooth(t,.3,.8);
}
function capEdge(a){
 const [k,u]=leafAt(a),[tip,at]=LEAVES[k],notch=curve(Math.abs(wrap(a)),NOTCH);
 // a long point, its sides a little full
 const x=u<at?1-u/at:(u-at)/(1-at);
 return notch+(tip-notch)*Math.pow(1-x,.8);
}
// every leaf gets the same number of columns, so a narrow one is as crisp as a broad one
const density=a=>1/leafAt(a)[2];
const capAt=(a,t,d,inner,taper)=>place(a+swirl(a,t),t,d,inner,taper);
// The layer underneath: hidden under the cap over the top, round and full at the back down to the
// nape, closer at the sides, a sideburn in front of each ear.
function underLift(a,t){return .025+.06*backOf(a)*bump(t,1.5,.65)+.01*(1-smooth(t,.4,1.4));}
const UNDER=[[0,1.12],[.9,1.2],[1.08,1.45],[1.32,1.6],[1.55,1.62],[1.8,1.76],[2.05,1.98],[2.4,2.12],[Math.PI,2.2]];
const underEdge=a=>{const b=Math.abs(a);return curve(b,UNDER)+.36*bump(b,1.2,.06,1.6);};
export function createLeafyHair(material){
 const up=new THREE.Vector3(0,0,1);
 const curl=mergeGeometries([
  lock([new THREE.Vector3(.01,.47,-.06),new THREE.Vector3(.02,.58,-.04),new THREE.Vector3(.06,.65,-.01),new THREE.Vector3(.11,.645,.02)],{w:.028,h:.02,peak:.3,up,under:1,segs:24,ring:12}),
  lock([new THREE.Vector3(-.03,.47,-.07),new THREE.Vector3(-.035,.55,-.06),new THREE.Vector3(-.06,.6,-.05)],{w:.018,h:.014,peak:.3,up,under:1,segs:18,ring:10})
 ]);
 const cap=shell({lift:capLift,edge:capEdge,at:capAt,rows:74,cols:LEAVES.length*14,under:10,density,level:2,rim:8,rimDepth:.12});
 const under=shell({lift:underLift,edge:underEdge,rows:32,cols:150,density:a=>1+2*bump(Math.abs(a),1.2,.15)});
 return hairGroup('leafy-hair',{body:mergeGeometries([cap,under]),curl},material);
}
