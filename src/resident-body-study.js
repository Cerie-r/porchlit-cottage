import * as THREE from 'three';
import {V,sdRoundCone,smin,smax,meshSDF} from './resident-sculpt.js';
function ellipsoid(cx,cy,cz,rx,ry,rz){return (x,y,z)=>{x-=cx;y-=cy;z-=cz;const k=Math.hypot(x/rx,y/ry,z/rz),d=Math.hypot(x/(rx*rx),y/(ry*ry),z/(rz*rz));return d<1e-9?-Math.min(rx,ry,rz):k*(k-1)/d;};}
export function bodyField(){
 const chest=ellipsoid(0,1.47,0,.255,.33,.165),waist=ellipsoid(0,1.23,0,.215,.235,.154),pelvis=ellipsoid(0,1.075,.002,.245,.195,.172);
 const neck=sdRoundCone(V(0,1.68,0),V(0,1.96,0),.094,.086);
 const arms=[-1,1].map(s=>{const upper=sdRoundCone(V(s*.213,1.65,0),V(s*.335,1.355,.012),.088,.067),fore=sdRoundCone(V(s*.335,1.355,.012),V(s*.399,1.125,.024),.068,.048),tip=ellipsoid(s*.408,1.074,.026,.052,.080,.046);return (x,y,z)=>smin(smin(upper(x,y,z),fore(x,y,z),.047),tip(x,y,z),.023);});
 const legs=[-1,1].map(s=>{const thigh=sdRoundCone(V(s*.133,1.03,.002),V(s*.145,.625,.012),.113,.078),calf=sdRoundCone(V(s*.145,.625,.012),V(s*.15,.185,.006),.079,.052),fullness=ellipsoid(s*.15,.445,-.007,.073,.155,.071),foot=ellipsoid(s*.15,.088,.065,.075,.075,.139);return (x,y,z)=>smin(smin(smin(thigh(x,y,z),calf(x,y,z),.04),fullness(x,y,z),.018),foot(x,y,z),.045);});
 return (x,y,z)=>{let d=smin(smin(chest(x,y,z),waist(x,y,z),.085),pelvis(x,y,z),.06);d=smin(d,neck(x,y,z),.045);for(const f of arms)d=smin(d,f(x,y,z),.045);for(const f of legs)d=smin(d,f(x,y,z),.04);return smax(d,.018-y,.008);};
}
export function makeBodyStudy(){const group=new THREE.Group();const material=new THREE.MeshStandardMaterial({color:'#eeeae4',roughness:.82});const body=new THREE.Mesh(meshSDF(bodyField(),[-.51,0,-.23],[.51,2.065,.25],.010),material);body.name='continuous-body';body.castShadow=true;body.receiveShadow=true;group.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),material);head.name='plain-head';head.scale.set(.49,.535,.435);head.position.set(0,2.33,0);head.castShadow=true;group.add(head);return group;}
