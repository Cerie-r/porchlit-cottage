import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smooth,bump,curve,place,shell,lock,hairGroup} from './hair-tools.js';

// A parted wave perm, no fringe: parted in the middle, the hair sweeps down either side like the two
// strokes of 八, its front edge following the hairline right up to the part, so the two sides meet
// there; the edge rolls forward a little from the part, more and more towards the temple, where it
// turns out in a curl and flicks up in two soft points.
// The waves run in soft S-shaped grooves from the part; a pointed lock hangs in front of each ear;
// the hair covers the ears and falls round the back in long soft waves to the nape, ending in soft
// points that flick out. Made with body/hair-tools.js.
const wrap=x=>x-2*Math.PI*Math.round(x/(2*Math.PI));
// 1 at the back of the head, 0 at the front
const backOf=a=>smooth(-Math.cos(a),0,.9);
// 1 over the forehead
const front=a=>1-smooth(Math.abs(a),.85,1.05);
// The columns fan out from the part over the forehead and curve forwards at the sides, so the waves do too.
const swirl=(a,t)=>.24*Math.sin(2*a)*smooth(t,.2,1.3);
// The waves: broad soft masses running down from the part and the crown, swinging like an S.
function masses(a,t){const flow=Math.abs(a)+.16*Math.sin(2.6*t-.6)*smooth(t,.25,1.0);return Math.pow(Math.abs(Math.sin(5*flow+.6)),.6);}
// The hem: along the hairline, a little higher at the part; from it the two sides come down in one
// smooth arch to the temples; a lock in front of each ear; over the ears; round the back to the nape.
const HEM=[[0,1.12],[.15,1.15],[.32,1.22],[.48,1.3],[.64,1.39],[.78,1.47],[.9,1.55],[1.04,1.72],[1.3,1.98],[1.57,2.08],[1.9,2.18],[2.4,2.3],[Math.PI,2.34]];
// soft points along the hem: [where, how long, how wide]
const POINTS=[[1.18,.26,.07],[-1.2,.24,.07],
 [1.75,.1,.2],[2.05,.14,.18],[2.36,.1,.2],[2.66,.15,.2],[2.96,.11,.18],[-3.0,.14,.2],[-2.7,.1,.18],[-2.4,.15,.2],[-2.08,.11,.18],[-1.78,.13,.2]];
function edge(a){
 const b=Math.abs(a);
 // a small notch where the two sides meet at the part
 let e=curve(b,HEM)-.015*bump(b,0,.05);
 for(const [c,len,w] of POINTS){const x=Math.abs(wrap(a-c))/w;if(x<1)e+=len*Math.pow(1-x,1.4);}
 return e;
}
function lift(a,t){
 const b=Math.abs(a);
 // a full crown and a round back of the head, room for the ears
 let d=.026+.05*(1-smooth(t,.3,1.5))+.07*backOf(a)*bump(t,1.3,.6)+.045*bump(b,1.57,.45)*smooth(t,1.25,1.8);
 // the part: a soft shallow line, only over the front of the head
 d-=.008*bump(a,0,.04)*smooth(t,.45,.75);
 // either side of the part the hair lifts a little before it sweeps down
 d+=.016*bump(b,.18,.14)*smooth(t,.25,.6)*(1-smooth(t,.9,1.1));
 // the waves
 d+=.032*(masses(a,t)-.6)*smooth(t,.2,.6)*(1-.6*smooth(edge(a)-t,0,.1)*front(a));
 return d;
}
// the ends flick out a little round the sides and back
function at(a,t,d,inner,taper){
 const b=Math.abs(a),near=edge(a)-t,flick=Math.pow(1-smooth(near,0,.22),2)*smooth(b,.95,1.15);
 return place(a+swirl(a,t),t,d+.045*flick,inner,taper);
}
// more columns over the front and at the locks in front of the ears
const density=a=>1+1.2*front(a)+1.5*bump(Math.abs(a),1.19,.1);
// The roll along one side's front edge (s = 1 the wearer's left, -1 the right): from the part, where
// it meets the other side's, growing towards the temple into the curl there, just over the hem so
// the edge tucks into it.
function roll(s,r){
 const pts=[0,.11,.22,.34,.45,.56,.66,.75,.84,.9].map(x=>{const a=s*x,t=edge(a)+.03;return [a+swirl(a,t),t,-.008];});
 return lock(pts,{lift:(a,t)=>lift(a-swirl(a,t),t),w:r,h:r*1.1,peak:.85,tipPow:.5,under:1,segs:48,ring:18});
}
// At each temple the roll turns out and flicks up in a point; a smaller one under it (k = 1).
function flick(s,w,k){
 const dt=.1*k,da=.05*k;
 const pts=[[.74,1.36,-.03],[.86,1.5,.006],[.98,1.6,.03],[1.08,1.62,.06],[1.16,1.58,.085]].map(([a,t,e])=>[s*(a+da)+swirl(s*(a+da),t+dt),t+dt,e]);
 return lock(pts,{lift:(a,t)=>lift(a-swirl(a,t),t),w,h:w*.6,peak:.35,tipPow:.8,segs:36,ring:14});
}
export function createRollHair(material){
 const body=shell({lift,edge,at,taper:()=>0,rows:84,cols:240,under:14,density,level:2.5,rim:10,rimDepth:.16});
 const flicks=[flick(1,.065,0),flick(-1,.062,0),flick(1,.045,1),flick(-1,.043,1)];
 return hairGroup('roll-hair',{body:mergeGeometries([body,roll(1,.062),roll(-1,.06),...flicks])},material);
}
