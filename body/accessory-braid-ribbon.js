// A satin ribbon tied at the end of each braid: wound once round the braid over its plain tie, with a
// little bow in front, two soft loops out to the sides and two tails hanging down the braid. Only on a
// hairstyle with braids (see showsWith in body/accessory-registry.js); made as a pair side by side,
// as the wardrobe photographs it.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {finish,part,paintPiece,surface,sweep,braidTies,onHead} from './accessory-tools.js';

const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
const sp=(v,p)=>Math.sign(v)*Math.abs(v)**p;
const WRAP=.04,FRONT=.05,APART=.1;
// A loop of the bow on the side given, read out from the knot (u 0) to its end (u 1) and round its
// section by t: a soft pillow, wider out at its end, tipped up a little.
function loopPoint(side,u,t){
 const q=side*t*Math.PI*2,c=Math.cos(q),s=Math.sin(q),h=.009+.015*smooth(u,0,.8)+.003*Math.sin(Math.PI*u),y=h*sp(c,.55);
 const thick=.0065*Math.sqrt(Math.max(0,1-u**5))*(1+.4*(1-(y/h)**2)),x=.007+.045*u;
 return new T.Vector3(side*x,y+.35*x,thick*sp(s,.7)-.6*x*x);
}
function bow(){
 // the loops, the knot, and the tails, in the bow's own frame: across the braid along x, up the braid
 // along y, out in front along z
 const loops=mergeGeometries([1,-1].map(side=>surface((u,t)=>loopPoint(side,u,t),20,24)));
 const knot=new T.SphereGeometry(1,18,12).scale(.012,.013,.009).translate(0,0,.002);
 const tails=mergeGeometries([1,-1].map(side=>{const pts=[0,.25,.5,.75,1].map(k=>new T.Vector3(side*(.004+.022*k),-.006-.08*k,-.004-.006*k*k));
  const g=sweep(pts,{w:t=>.009+.004*t,d:.0024,around:10,frame:(t,p,tangent,s,out)=>{out.set(0,0,1);s.crossVectors(tangent,out).normalize();out.crossVectors(s,tangent).normalize();}});g.deleteAttribute('uv');return g;}));
 return {ribbon:mergeGeometries([loops,tails]),knot};
}
// Wound round the braid, round its own z axis (along the braid), a little flat.
const wrap=()=>new T.TorusGeometry(WRAP,.011,8,28);
function build(){
 const group=new T.Group();group.name='braid-ribbon';
 const satin=finish('main','#f3e6d5',{roughness:.45}),knot=finish('accent','#e8d7c2',{roughness:.45}),b=bow();
 for(const k of [0,1]){
  const one=new T.Group();one.name='braid-ribbon-'+k;group.add(one);
  // the wrap round the braid in the plane across it; the bow out in front of it
  const round=new T.Group();round.name='braid-ribbon-round';one.add(round);part(round,wrap(),satin,'braid-ribbon-wrap');
  const front=new T.Group();front.name='braid-ribbon-bow';one.add(front);part(front,b.ribbon.clone(),satin,'braid-ribbon-loops');part(front,b.knot.clone(),knot,'braid-ribbon-knot');
 }
 lay(group);return group;
}
// Side by side, facing forward: as it is built, and on a hairstyle without braids.
function lay(group){group.children.forEach((one,k)=>{one.position.set((k?-1:1)*APART,0,0);one.quaternion.identity();one.getObjectByName('braid-ribbon-round').quaternion.setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2);one.getObjectByName('braid-ribbon-bow').position.set(0,0,FRONT-.03);});}
function place(ribbon,hair){
 const ties=braidTies(hair);
 if(!ties.length){lay(ribbon);ribbon.position.set(0,0,0);ribbon.scale.setScalar(1);return;}
 ribbon.children.forEach((one,k)=>{
  const t=ties[k%ties.length],up=t.along.clone().negate();
  // its own frame: across the braid, up it, out in front of it
  one.position.copy(t.point);one.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(t.side.clone().negate(),up,t.front));
  one.getObjectByName('braid-ribbon-round').quaternion.setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2);
  one.getObjectByName('braid-ribbon-bow').position.set(0,0,FRONT);
 });
 onHead(ribbon,hair);
}

export const braidRibbon={
 id:'braid-ribbon',name:'辫梢缎带',slot:'braid',wearers:['girl'],
 create:build,place,
 colorways:[{id:'cream',name:'奶油',colors:{main:'#f3e6d5',accent:'#e8d7c2'}},{id:'blossom',name:'樱粉',colors:{main:'#f2b8c6',accent:'#e7a3b4'}},{id:'wine',name:'酒红',colors:{main:'#8e3a49',accent:'#7a2f3d'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M58 50 26 34q-6 18 0 32zm4 0 32-16q6 18 0 32z" fill="#f3e6d5"/><path d="m56 54-14 40 10-4 6 8 2-42zm8 0 14 40-10-4-6 8-2-42z" fill="#f3e6d5"/><rect x="52" y="42" width="16" height="16" rx="6" fill="#e8d7c2"/></svg>'
};
