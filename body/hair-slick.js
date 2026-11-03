import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smooth,bump,curve,place,shell,lock,hairGroup} from './hair-tools.js';

// Slicked back. The hairline sits high and the forehead is bare; the hair rises a little at the
// front and is combed straight back over the top in long parallel lines; one loose lock has fallen
// onto the forehead. Close at the sides, soft points at the nape. Made with body/hair-tools.js.
function masses(a,t){const flow=a+.22*Math.sin(a)*smooth(t,.5,1.9);return Math.pow(Math.abs(Math.sin(4.5*flow)),.55);}
function lift(a,t){
 const b=Math.abs(a),x=Math.sin(a)*Math.sin(t);
 let d=.03*(1-smooth(t,.1,1.25));
 // a little height at the front, swept back
 d+=.06*bump(a,0,.8)*bump(t,.95,.36)*smooth(Math.cos(a),0,.5);
 // combed lines running front to back over the top, parallel
 d+=.016*(Math.pow(Math.abs(Math.cos(Math.PI*x/.17)),.6)-.6)*smooth(t,.15,.55)*(1-smooth(t,1.45,1.9))*smooth(Math.cos(a),-.9,-.2);
 d+=.014*(masses(a,t)-.6)*smooth(t,.55,1.3)*smooth(b,1.6,2.0);
 return d;
}
const EDGE=[[0,1.14],[.25,1.12],[.45,1.17],[.65,1.3],[.85,1.42],[1.0,1.52],[1.15,1.58],[1.32,1.64],[1.86,1.66],[2.06,1.94],[2.32,2.12],[Math.PI,2.16]];
function edge(a){
 const b=Math.abs(a);
 let e=curve(b,EDGE);
 e+=.12*smooth(b,2.1,2.4)*(masses(a,e)-.55);
 e+=.2*bump(b,1.2,.08,2);
 return e;
}
export function createSlickHair(material){
 // the lock that has fallen forward over the forehead, curving in at the end
 const loose=lock([[.3,1.0,-.03],[.26,1.12,.004],new THREE.Vector3(.11,.17,.315),new THREE.Vector3(.075,.1,.34),new THREE.Vector3(.09,.065,.345)],{lift,w:.04,h:.022,peak:.25,tipPow:.7,segs:30,ring:12});
 return hairGroup('slick-hair',{body:mergeGeometries([shell({lift,edge}),loose])},material);
}
