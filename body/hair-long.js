import * as THREE from 'three';
import {smooth,bump,curve,place,shell,hairGroup} from './hair-tools.js';

// Long straight hair. The classic bob's blunt fringe in front; long locks fall beside the cheeks in
// front of the shoulders, and the rest falls straight down the back to the waist, with a few long
// shallow grooves and softly uneven ends. Made with body/hair-tools.js: over the head the hair
// follows it; from just below the ears it falls straight down, narrowing a little.
const FALL=1.95,END=3.3;
function hang(a,t,d,inner=0,taper=0){
 if(t<=FALL)return place(a,t,d,inner,taper);
 const top=place(a,FALL,d,inner,taper),k=t-FALL,narrow=1-.2*smooth(k,0,1.3);
 return new THREE.Vector3(top.x*narrow,top.y-.425*k,-.03+(top.z+.03)*narrow);
}
const FRINGE=[[-.73,1.70],[-.64,1.59],[-.47,1.61],[-.30,1.62],[-.255,1.56],[-.22,1.64],[.12,1.65],[.245,1.63],[.28,1.56],[.32,1.61],[.53,1.60],[.67,1.56],[.74,1.69]];
const SIDE=[[.8,END-.3],[1.05,END-.18],[1.6,END-.02],[Math.PI,END]];
const EDGE=[...SIDE.map(([a,t])=>[-a,t]).reverse(),...FRINGE,...SIDE];
function edge(a){
 const b=Math.abs(a);
 // softly pointed ends, a little longer down the middle of the back
 return curve(a,EDGE)+(.07*(1-Math.pow(Math.abs(Math.sin(5.5*a)),.6))-.035)*smooth(b,.85,1.2)+.08*bump(b,Math.PI,.6);
}
function lift(a,t){
 const b=Math.abs(a);
 let d=.03*(1-smooth(t,.1,1.3));
 const front=smooth(Math.cos(a),.54,.85)*smooth(t,.5,1.1);
 d+=.026*front*(bump(a,-.47,.24,4)+bump(a,.015,.26,4)+bump(a,.49,.24,4));
 d+=.014*bump(b,.95,.16,4)*smooth(t,.8,1.6);
 // room for the ears, which the falling hair covers
 d+=.055*bump(b,1.57,.5)*smooth(t,1.2,1.8);
 // long shallow grooves down the falling hair
 d+=.014*(Math.pow(Math.abs(Math.cos(6.5*a)),.4)-.65)*smooth(t,1.5,2.3)*smooth(b,.9,1.2);
 return d;
}
export function createLongHair(material){
 return hairGroup('long-hair',{body:shell({lift,edge,at:hang,taper:()=>0,rows:52,under:22,from:.55})},material);
}
