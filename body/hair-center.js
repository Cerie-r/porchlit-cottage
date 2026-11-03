import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smooth,bump,curve,shell,lock,hairGroup} from './hair-tools.js';

// A centre part with a curtain fringe: from a part down the middle the fringe falls to either side,
// framing the face down to the cheekbones and turning out a little at the ends, the forehead showing
// in a narrow V between. Short over the ears, soft points at the nape. Made with body/hair-tools.js.
function masses(a,t){const flow=a+.22*Math.sin(a)*smooth(t,.5,1.9);return Math.pow(Math.abs(Math.sin(4.5*flow)),.55);}
function lift(a,t){
 const b=Math.abs(a);
 let d=(.036+.012*smooth(t,.2,.6))*(1-smooth(t,.1,1.25));
 // the part, and each curtain a full mass flowing out and down from it
 d-=.018*bump(a,0,.045)*smooth(t,.08,.25)*(1-smooth(t,1.0,1.3));
 const curtain=bump(b,.36+.25*smooth(t,.9,1.7),.24,4)*smooth(t,.45,1.1)*smooth(Math.cos(a),.2,.6);
 d+=.024*curtain;
 d+=.014*(masses(a,t)-.6)*smooth(t,.55,1.3)*smooth(b,1.0,1.6);
 return d;
}
const EDGE=[[0,1.22],[.1,1.36],[.3,1.52],[.5,1.64],[.68,1.74],[.8,1.72],[.95,1.64],[1.15,1.58],[1.32,1.66],[1.86,1.68],[2.06,1.96],[2.32,2.14],[Math.PI,2.18]];
function edge(a){
 const b=Math.abs(a);
 let e=curve(b,EDGE);
 e+=.12*smooth(b,2.1,2.4)*(masses(a,e)-.55);
 e+=.22*bump(b,1.22,.09,2);
 return e;
}
export function createCenterHair(material){
 const locks=[];
 for(const s of [-1,1])locks.push(lock([[s*.06,.32,-.04],[s*.1,.75,-.004],[s*.24,1.12,.01],[s*.46,1.44,.012],[s*.66,1.64,.006],[s*.84,1.74,-.006]],{lift,w:.085,h:.038,peak:.3,tipPow:.6,segs:40}));
 return hairGroup('center-hair',{body:mergeGeometries([shell({lift,edge}),...locks])},material);
}
