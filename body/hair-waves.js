import * as THREE from 'three';
import {smooth,bump,curve,place,shell,hairGroup} from './hair-tools.js';

// Long hair in big soft waves, in two fronts: the classic bob's blunt fringe, or curtain bangs
// parted down the middle. From just below the ears the hair falls in broad locks that swell in and
// out and sway from side to side all the way down (the whole back one way, the two in front of the
// shoulders mirrored), and each lock's end rolls softly under. Made with body/hair-tools.js.
const FALL=1.9,END=3.25,TAU=Math.PI*2;
const LOCKS=4.5,SWAY=.07,SWELL=.07,WAVES=1.75,FULL=.03,GROOVE=.045,TIP=.06;
const TURN=.1,RISE=.05,BULB=.06,CURL=.3;
// round the back, from where the front meets the ends (1.1) to the middle of the back
const SIDE=1.1,BACK=[[SIDE,END-.2],[1.6,END-.03],[Math.PI,END]];
// the locks: 1 down the middle of each, 0 in the soft grooves between them
const lockAt=a=>smooth(Math.abs(Math.cos(LOCKS*a)),0,.85);

// The blunt fringe; beside the face the edge sweeps from its end (.74) down to the ends.
const FRINGE=[[-.73,1.70],[-.64,1.59],[-.47,1.61],[-.30,1.62],[-.255,1.56],[-.22,1.64],[.12,1.65],[.245,1.63],[.28,1.56],[.32,1.61],[.53,1.60],[.67,1.56],[.74,1.69]];
const BLUNT={
 edge:(a,b)=>b<=.74?curve(a,FRINGE):1.69+(BACK[0][1]-1.69)*smooth(b,.74,SIDE),
 // the fringe's three soft lobes
 lift:(a,b,t)=>.026*smooth(Math.cos(a),.54,.85)*smooth(t,.5,1.1)*(bump(a,-.47,.24,4)+bump(a,.015,.26,4)+bump(a,.49,.24,4)),
 // more columns along the sweep beside the face, so that edge stays smooth
 crowd:b=>3*smooth(b,.7,.76)*(1-smooth(b,SIDE-.02,SIDE+.06))
};
// Curtain bangs: parted down the middle high on the forehead; each side sweeps down and out past
// the eyes and on down the cheeks to the ends in one curve, given as [b, t, slope] (a cubic through
// them that only ever goes down). Either side of the parting the hair lifts off the forehead a
// little in a soft roll, then lies down over the temple.
const PART=[[0,1.1,.6],[.48,1.6,1.4],[.68,1.86,2.4],[SIDE,END-.2,0]];
function down(b,points){
 let i=0;while(i<points.length-2&&b>points[i+1][0])i++;
 const [x0,y0,m0]=points[i],[x1,y1,m1]=points[i+1],w=x1-x0,h=THREE.MathUtils.clamp((b-x0)/w,0,1),h2=h*h,h3=h2*h;
 return (2*h3-3*h2+1)*y0+(h3-2*h2+h)*w*m0+(3*h2-2*h3)*y1+(h3-h2)*w*m1;
}
const CURTAIN={
 edge:(a,b)=>down(b,PART),
 lift:(a,b,t)=>.035*bump(b,.3,.24)*smooth(t,.3,.75)*(1-smooth(t,1.25,1.75))-.01*bump(b,0,.08)*smooth(t,.15,.6),
 crowd:b=>2*bump(b,0,.1)+3*smooth(b,.5,.64)*(1-smooth(b,SIDE-.02,SIDE+.06))
};

function wavy(name,front){
 function edge(a){
  const b=Math.abs(a);
  const t=b<SIDE?front.edge(a,b):curve(b,BACK);
  return t+(TIP*lockAt(a)-TIP*.55)*smooth(b,.95,1.25);
 }
 // the ends roll under only where the hem runs level, not down the edge beside the face
 const level=a=>1-smooth(Math.abs(edge(a+.004)-edge(a-.004))/.008,.6,2.5);
 function hang(a,t,d,inner=0,taper=0){
  if(t<=FALL)return place(a,t,d,inner,taper);
  const top=place(a,FALL,d,inner,taper),k=t-FALL,grow=smooth(k,.12,.5),w=TAU*WAVES*k/(END-FALL);
  // narrower just below the ears, a little fuller towards the ends, swelling in and out
  let r=(1-.07*smooth(k,0,.3)+FULL*smooth(k,.25,1.2))*(1+SWELL*Math.cos(w)*grow);
  // the ends: the outside rounds over into a thick tip, which turns in and up a little
  const e=Math.max(0,edge(a)-t),near=1-smooth(e,0,CURL),c=near*near*level(a);
  r*=(1-TURN*c)*(1+BULB*Math.sin(Math.PI*Math.min(1,near*1.15))*(1-smooth(inner,0,.03))*level(a));
  const x=top.x*r,z=-.03+(top.z+.03)*r;
  // the sway: round the head, one way all down the back, mirrored for the two locks in front
  const side=a>0?1:-1+2*smooth(-a,1.2,2.6),ang=Math.atan2(x,z+.03),rad=Math.hypot(x,z+.03);
  const s=ang+SWAY*Math.cos(w)*grow*side/Math.max(rad,.2);
  return new THREE.Vector3(rad*Math.sin(s),top.y-.42*k+RISE*c,rad*Math.cos(s)-.03);
 }
 function lift(a,t){
  const b=Math.abs(a);
  let d=.03*(1-smooth(t,.1,1.3))+front.lift(a,b,t);
  d+=.014*bump(b,.95,.16,4)*smooth(t,.8,1.6);
  // room for the ears, which the falling hair covers
  d+=.055*bump(b,1.57,.5)*smooth(t,1.2,1.8);
  d+=GROOVE*(lockAt(a)-.6)*smooth(t,1.55,2.15)*smooth(b,.85,1.2);
  return d;
 }
 const density=a=>1+front.crowd(Math.abs(a));
 return material=>hairGroup(name,{body:shell({lift,edge,at:hang,taper:()=>0,rows:72,cols:200,under:20,from:.55,density})},material);
}
export const createWavyHair=wavy('wavy-hair',BLUNT);
export const createWavyCurtainHair=wavy('wavy-curtain-hair',CURTAIN);
