import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smooth,bump,curve,shell,lock,hairGroup} from './hair-tools.js';

// A short cut with a deep side part on the wearer's left. The fringe sweeps from the part across
// the forehead to the right in three masses, the first ending in a point between the brows; a
// broad lock lies over them and curls in beside the right eye like a comma. The left temple is
// swept back; short sideburns; a full crown with a small curl standing up; soft points at the
// nape. Made with body/hair-tools.js (head units, like the classic hair).
const PART=.62;
// Soft masses flowing down from the crown all round, with narrow valleys between them.
function masses(a,t){const flow=a+.22*Math.sin(a)*smooth(t,.5,1.9);return Math.pow(Math.abs(Math.sin(4.5*flow)),.55);}
// The fringe under the comma: masses sweeping down to the wearer's right with partings between them;
// each reaches furthest at its right end.
const NOTCH=[.62,-.05,-.5,-.9],TIP=[1.6,1.4,1.4];
function across(a,t){const flow=a+(t-1.38);for(let k=0;k<3;k++)if(flow<=NOTCH[k]&&flow>NOTCH[k+1])return [k,(flow-NOTCH[k+1])/(NOTCH[k]-NOTCH[k+1])];return null;}
function lift(a,t){
 let d=(.034+.014*smooth(-Math.sin(a),-.3,.6))*(1-smooth(t,.1,1.25));
 d-=.016*bump(a,PART,.05)*smooth(t,.05,.2)*(1-smooth(t,.85,1.2));
 d+=.014*(masses(a,t)-.6)*smooth(t,.55,1.3)*smooth(Math.abs(a),.9,1.6);
 const m=across(a,t);if(m)d+=.016*Math.sqrt(Math.max(0,1-(2*m[1]-1)**2))*smooth(t,.6,1.15);
 // the left temple swept back
 d+=.012*bump(a-.45*(t-.5),.95,.22)*smooth(t,.45,.95)*smooth(a,.62,.75);
 return d;
}
const EDGE=[[-Math.PI,2.18],[-2.32,2.14],[-2.06,1.96],[-1.86,1.68],[-1.32,1.66],[-1.15,1.56],[-.98,1.46],[-.92,1.36],[.62,1.36],[.8,1.38],[1.0,1.44],[1.15,1.56],[1.32,1.66],[1.86,1.68],[2.06,1.96],[2.32,2.14],[Math.PI,2.18]];
// Where the shell ends, as the angle down from the crown: the fringe's points in front, clear above the ears, points at the nape.
function edge(a){
 const b=Math.abs(a);
 let e=curve(a,EDGE);
 const m=across(a,1.45);if(m){const [k,s]=m,tip=.16;e+=(TIP[k]-1.36)*(s<tip?smooth(s,0,tip):Math.pow(1-smooth(s,tip,1),2));}
 e+=.12*smooth(b,2.1,2.4)*(masses(a,e)-.55);
 e+=.24*bump(b,1.2,.1,2);
 return e;
}
export function createSweptHair(material){
 const comma=lock([[.56,.28,-.04],[.42,.62,-.006],[.12,.98,.008],[-.22,1.24,.012],[-.5,1.36,.012],[-.76,1.53,.008],[-.88,1.7,.002],[-.76,1.77,-.008]],{lift,w:.1,h:.042,peak:.3,tipPow:.55,segs:44});
 const curl=lock([new THREE.Vector3(.05,.47,-.2),new THREE.Vector3(.06,.56,-.17),new THREE.Vector3(.055,.6,-.1),new THREE.Vector3(.04,.565,-.055)],{w:.024,h:.016,peak:.3,up:new THREE.Vector3(1,0,0),under:1,segs:24,ring:12});
 return hairGroup('swept-hair',{body:mergeGeometries([shell({lift,edge}),comma]),curl},material);
}
