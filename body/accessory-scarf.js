// A long knitted scarf, draped rather than wound: it lies over both shoulders, close in under the
// head, round the back of the neck, and its two ends hang down the chest on either side, open at the
// throat, each with two stripes near the end and a fringe. (The residents have next to no neck, so
// anything wound round it looks like a collar.) Made in the body's own coordinates (y up, face
// towards +z, the torso's axis at x 0, z .10) round the bare body, and remade round whatever is worn
// when it is placed: it lies outside the collar and the shoulders, and the ends on the front of the
// outfit. Everything stays under the head and above y .96, where the rig moves it with the pelvis.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {torsoAt,around} from './outfit-tools.js';
import {finish,part,paintPiece,wornSurfaces,crossings} from './accessory-tools.js';

const AXIS={x:0,z:.10},GAP=.009,HALF=.048,THICK=.0095;
// The two ends: the side they hang on (+1 is his left, +x), how far from the middle, where they end,
// and how much they spread as they fall.
const ENDS=[{side:1,x:.092,bottom:1.06,spread:.035},{side:-1,x:.092,bottom:1.11,spread:.028}];
// Where it goes over the shoulders: the angle round the neck (0 straight ahead) where each end turns
// up from the chest, the heights it lies at there and behind the neck, close in under the head and
// clear of the sleeves, and the heights it is measured at round the neck.
const TURN=1.1,SHOULDER_Y=1.392,BACK_Y=1.36,TOP_Y=1.335,ROUND=[1.375,1.39,1.4];
// The head the residents have (body/round-head.js) in body units, for before it is known from the hair.
const HEAD={centre:new T.Vector3(0,2.376,-.034),r:new T.Vector3(1.1554,.9808,.9136)};
// As far as the scarf looks for what it lies on.
const REACH=new T.Box3(new T.Vector3(-.45,.95,-.45),new T.Vector3(.45,1.45,.75));
const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);

// What it lies on, measured on the bare body: how far out from the torso's axis it is round the neck
// at an angle, and how far forward the chest is at a height, a little to one side.
const bareRest={round:a=>Math.max(...ROUND.map(y=>around(torsoAt(y),a))),chest:(x,y)=>AXIS.z+torsoAt(y)[0]*Math.sqrt(Math.max(0,1-(x/(torsoAt(y)[1]*1.05))**2))};
// Measured on what is worn: from the axis outwards, the outermost crossing of the skin or the outfit
// within reach of the neck, up to the collar (not out to the sleeves' shoulders, which rise almost to
// the head); from in front, the frontmost.
function wornRest(surfaces){
 const o=new T.Vector3(),d=new T.Vector3(),rounds=new Map(),fronts=new Map();
 const round=a=>{const k=Math.round(a/(Math.PI/36));if(!rounds.has(k)){const b=k*Math.PI/36;let r=0;
  for(const y of ROUND){o.set(AXIS.x,y,AXIS.z);d.set(Math.sin(b),0,Math.cos(b));const hits=crossings(surfaces,o,d,.2+.02*Math.max(0,-Math.cos(b)));r=Math.max(r,hits.length?hits.at(-1).distance:around(torsoAt(y),b));}
  rounds.set(k,r);}return rounds.get(k);};
 const chest=(x,y)=>{const key=Math.round(x/.01)+','+Math.round(y/.01);if(!fronts.has(key)){o.set(Math.round(x/.01)*.01,Math.round(y/.01)*.01,AXIS.z+.6);d.set(0,0,-1);const hit=crossings(surfaces,o,d,.6)[0];fronts.set(key,hit?hit.point.z:bareRest.chest(x,y));}return fronts.get(key);};
 return {round,chest};
}

// The scarf's middle line, from the end of his left end, up over his left shoulder, round the back of
// the neck, over his right shoulder and down to the end of the right end.
function centreLine({round,chest}){
 const hang=end=>{const pts=[];
  for(let y=end.bottom;y<=TOP_Y+1e-6;y+=.0125){const fall=TOP_Y-y,x=end.side*(end.x+end.spread*smooth(fall,0,.3))+.004*Math.sin(fall*34+end.side);
   // it lies on the front of whatever is under its whole width (and a little either side), and just
   // above, where a collar or a lapel may stand out more
   const under=[-1.35,-.7,0,.7,1.35].flatMap(k=>[chest(x+k*HALF,y),chest(x+k*HALF,y+.02)]);pts.push(new T.Vector3(x,y,Math.max(...under)+GAP+THICK));}
  // cloth falls: going down, it never tucks back in faster than it hangs
  for(let i=pts.length-2;i>=0;i--)pts[i].z=Math.max(pts[i].z,pts[i+1].z-.3*(pts[i+1].y-pts[i].y));
  return pts;};
 const neck=[];
 for(let i=0;i<=40;i++){const t=i/40,a=TURN+(2*Math.PI-2*TURN)*t,back=Math.sin(Math.PI*t)**2,y=SHOULDER_Y+(BACK_Y-SHOULDER_Y)*back,r=round(((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI))+GAP+THICK+.012*(1-back);
  neck.push(new T.Vector3(AXIS.x+Math.sin(a)*r,y,AXIS.z+Math.cos(a)*r));}
 const left=hang(ENDS[0]),right=hang(ENDS[1]).reverse();
 return [...left,...neck,...right];
}
// Lay a soft knitted strip along the line: its width across the line, lying on what is under it (on
// the shoulders it tips up to lie on them), a little thick, with soft rounded edges and ribs along it.
function stripGeometry(line,{ribs=7,grow=0,from=0,to=1}={}){
 const curve=new T.CatmullRomCurve3(line,false,'centripetal'),n=Math.max(8,Math.round(160*(to-from))),around=28;
 const pos=[],idx=[],side=new T.Vector3(),out=new T.Vector3(),tangent=new T.Vector3(),radial=new T.Vector3(),last=new T.Vector3();
 for(let i=0;i<=n;i++){const u=from+(to-from)*i/n,p=curve.getPointAt(u);curve.getTangentAt(u,tangent);
  radial.set(p.x-AXIS.x,0,p.z-AXIS.z).normalize();const onShoulder=smooth(p.y,1.31,1.37);out.copy(radial).addScaledVector(new T.Vector3(0,1,0),.45*onShoulder).normalize();
  side.crossVectors(tangent,out).normalize();if(i&&side.dot(last)<0)side.negate();last.copy(side);out.crossVectors(side,tangent).normalize();
  // where it goes round the neck it gathers, narrower and a little fuller
  const flare=1+.12*smooth(Math.abs(u-.5)*2,.75,1),w=(HALF*(1-.42*onShoulder)+grow)*flare,d=THICK*(1+.45*onShoulder)+grow;
  for(let j=0;j<=around;j++){const s=j/around*Math.PI*2,c=Math.cos(s),z=Math.sin(s),sx=Math.sign(c)*Math.abs(c)**.45,sz=Math.sign(z)*Math.abs(z)**.45,rib=1+.28*Math.abs(Math.sin(sx*Math.PI*ribs/2));
   pos.push(p.x+side.x*w*sx+out.x*d*sz*rib,p.y+side.y*w*sx+out.y*d*sz*rib,p.z+side.z*w*sx+out.z*d*sz*rib);}}
 for(let i=0;i<n;i++)for(let j=0;j<around;j++){const a=i*(around+1)+j,b=a+around+1;idx.push(a,b,a+1,a+1,b,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return {g,curve};
}
// Keep every point of it under the head (it is tucked in there at the back), a hair below its surface.
function underHead(g,head){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=(p.getX(i)-head.centre.x)/head.r.x,z=(p.getZ(i)-head.centre.z)/head.r.z,q=1-x*x-z*z;if(q<=0)continue;const bottom=head.centre.y-head.r.y*Math.sqrt(q)-.005;if(p.getY(i)>bottom)p.setY(i,bottom);}g.computeVertexNormals();return g;}

function geometries(rest,head){
 const line=centreLine(rest),{g:drape,curve}=stripGeometry(line);
 // two stripes near each end (measured from the end), a little raised all round the strip, and a
 // fringe along each end
 const length=curve.getLength(),at=d=>d/length,stripes=[],fringe=[];
 for(const [from,to] of [[.04,.056],[.072,.088]])for(const [a,b] of [[at(from),at(to)],[1-at(to),1-at(from)]])stripes.push(stripGeometry(line,{grow:.0024,from:a,to:b}).g);
 for(const [u,inward] of [[0,1],[1,-1]]){const p=curve.getPointAt(u),down=curve.getTangentAt(u).multiplyScalar(-inward),along=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),down),across=new T.Vector3().crossVectors(down,new T.Vector3(0,0,1)).normalize();
  for(let i=0;i<8;i++){const v=-1+2*i/7,len=.03+.008*((i*5)%3)/2,mid=p.clone().addScaledVector(across,v*HALF*1.05).addScaledVector(down,len/2+.002);
   // each tuft hangs clear of whatever is under it (a button, a piped edge)
   mid.z=Math.max(mid.z,...[0,.5,1].map(k=>rest.chest(mid.x,mid.y-(k-.5)*len)+.0095));
   fringe.push(new T.CapsuleGeometry(.0078,len,3,6).applyQuaternion(along).translate(mid.x,mid.y,mid.z));}}
 return {drape:underHead(drape,head),stripes:underHead(mergeGeometries(stripes),head),fringe:mergeGeometries(fringe)};
}
const NAMES={drape:'knit-scarf-drape',stripes:'knit-scarf-stripes',fringe:'knit-scarf-fringe'};
function build(){
 const group=new T.Group();group.name='knit-scarf';
 const knit=finish('main','#b5485a',{roughness:.97}),stripe=finish('accent','#f1e6d6',{roughness:.97}),tuft=finish('trim','#b5485a',{roughness:1});
 const g=geometries(bareRest,HEAD);
 part(group,g.drape,knit,NAMES.drape);part(group,g.stripes,stripe,NAMES.stripes);part(group,g.fringe,tuft,NAMES.fringe);
 return group;
}
// Remake it round what is worn (the outfit and the skin), under the head the hair sits on.
function place(scarf,hair,worn){
 if(!worn)return;
 const head={centre:hair.position.clone(),r:new T.Vector3(.43,.365,.34).multiplyScalar(hair.scale.x)};
 const g=geometries(wornRest(wornSurfaces(worn,REACH)),head);
 for(const [key,name] of Object.entries(NAMES)){const m=scarf.getObjectByName(name);m.geometry.dispose();m.geometry=g[key];}
 scarf.position.set(0,0,0);scarf.rotation.set(0,0,0);scarf.scale.set(1,1,1);
}

export const knitScarf={
 id:'knit-scarf',name:'围巾',slot:'neck',wearers:['boy'],
 create:build,place,
 colorways:[{id:'berry',name:'莓果',colors:{main:'#b5485a',accent:'#f1e6d6',trim:'#b5485a'}},{id:'oat',name:'燕麦',colors:{main:'#d8c9b0',accent:'#9b6a55',trim:'#d8c9b0'}},{id:'navy',name:'藏青',colors:{main:'#2f3a57',accent:'#e8c5c1',trim:'#2f3a57'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M38 22q22 14 44 0l6 8q-6 20-10 74H66l2-66q-8 4-16 0l2 66H42q-4-54-10-74z" fill="#b5485a"/><path d="M42 92h12m12 0h12" stroke="#f1e6d6" stroke-width="4"/></svg>'
};
