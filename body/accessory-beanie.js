// A knitted beanie: a ribbed crown pulled down snug over the hair, a deep folded turn-up round the
// bottom, a fluffy pompom on top. Made in head units round the head (body/round-head.js), and remade
// round the hairstyle being worn: the crown lies just outside the hair everywhere above its band (or
// outside the head, where there is no hair), so it takes the shape of the head under it rather than
// sitting on top like a lid. Worn tipped back: the front low on the forehead with a little fringe
// showing under it, the back down over the nape, the ears left out at the sides.
import * as T from 'three';
import {finish,part,paintPiece,surface,reachOf,hairPoints,toward,onHead} from './accessory-tools.js';

const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
const COLS=176,ROWS=48,RIBS=48,MARGIN=.022,TURNUP=.155,POM=.085;
// The band (the turn-up's lower edge): how high it is above the head's centre towards angle a (0
// straight ahead, pi/2 to his left).
const bandY=a=>.045+.075*Math.cos(a)-.012*Math.sin(a);

// Where the band is towards angle a: its elevation, on whatever it lies on at that height.
function bandOf(reach){const cache=new Map();return a=>{const k=Math.round(a*1e4);if(!cache.has(k)){let e=0;for(let i=0;i<6;i++)e=Math.asin(T.MathUtils.clamp(bandY(a)/reach(a,e),-1,1));cache.set(k,e);}return cache.get(k);};}

// The crown, read up from the band (s 0) to the top (s 1) and round by angle a: just outside what is
// under it, a little fuller towards the top, with the knit's ribs running up it and closing in there.
function crownPoint(fit,a,s){
 const e0=fit.band(a),e=e0+(Math.PI/2-e0)*s;
 return toward(a,e,fit.reach(a,e)+MARGIN+.03*smooth(s,.4,1)+.008*Math.cos(a*RIBS)*(1-smooth(s,.5,.9)));
}
// The turn-up: a thick ribbed band round the bottom, as high as TURNUP up the head from the band, its
// edges rounded, standing out from the crown. Read round its section by t (from its inside, under it,
// out, over its top and back) and round the head by angle a.
function turnupPoint(fit,a,t){
 const q=Math.PI+t*Math.PI*2,c=Math.cos(q),sn=Math.sin(q),out=Math.sign(c)*Math.abs(c)**.6,up=Math.sign(sn)*Math.abs(sn)**.6;
 const e0=fit.band(a),e=e0+TURNUP/.45*(1+up)/2;
 return toward(a,e,fit.reach(a,e)+MARGIN+.011+.014*out+.009*Math.cos(a*RIBS));
}
// A fluffy pompom: a ball roughed up all over, the same every time.
function pompom(){
 const g=new T.SphereGeometry(1,40,28),p=g.attributes.position,v=new T.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=.09*Math.sin(v.x*13+1.7)*Math.sin(v.y*11+.4)*Math.sin(v.z*12+2.2)+.05*Math.sin(v.x*29+v.y*23)*Math.cos(v.z*31-v.y*7);v.multiplyScalar(1+n);p.setXYZ(i,v.x,v.y,v.z);}
 g.computeVertexNormals();return g;
}
// Everything round what it is worn over: points in head units, from the head's centre.
function geometries(points){
 const reach=reachOf(points),fit={reach,band:bandOf(reach)},top=fit.reach(0,Math.PI/2)+MARGIN+.03;
 return {
  crown:surface((s,t)=>crownPoint(fit,Math.PI+t*Math.PI*2,s),ROWS,COLS),
  turnup:surface((t,u)=>turnupPoint(fit,Math.PI+u*Math.PI*2,t),20,COLS),
  pompom:pompom().scale(POM,POM,POM).translate(0,top+POM*.8,-.01)
 };
}
const NAMES={crown:'beanie-crown',turnup:'beanie-turnup',pompom:'beanie-pompom'};
function build(){
 const group=new T.Group();group.name='beanie';
 const knit=finish('main','#d9c8ad',{roughness:.98}),fluff=finish('accent','#f4ede2',{roughness:1}),g=geometries([]);
 part(group,g.crown,knit,NAMES.crown);part(group,g.turnup,knit,NAMES.turnup);part(group,g.pompom,fluff,NAMES.pompom);
 return group;
}
// Remade round the hair being worn (leaving out a curl), at the hair's centre, in its scale.
function place(beanie,hair){
 const g=geometries(hairPoints(hair));
 for(const [key,name] of Object.entries(NAMES)){const m=beanie.getObjectByName(name);m.geometry.dispose();m.geometry=g[key];}
 onHead(beanie,hair);
}

export const beanie={
 id:'beanie',name:'毛线帽',slot:'head',wearers:['boy'],hat:true,hidesCurl:true,
 create:build,place,
 colorways:[{id:'oat',name:'燕麦',colors:{main:'#d9c8ad',accent:'#f4ede2'}},{id:'berry',name:'莓果',colors:{main:'#b5485a',accent:'#f1e6d6'}},{id:'navy',name:'藏青',colors:{main:'#2f3a57',accent:'#d8c9b0'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M24 86q-6-58 36-60 42 2 36 60z" fill="#d9c8ad"/><path d="M22 76q38-10 76 0v14q-38-10-76 0z" fill="#cdbb9f"/><circle cx="60" cy="22" r="12" fill="#f4ede2"/></svg>'
};
