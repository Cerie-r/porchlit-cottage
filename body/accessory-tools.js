// Small tools for the public pieces (body/accessory-pieces.js): materials and colourways, the face in
// head units, sweeping a little tube along a path, and finding where the skin and the clothes being
// worn are, for what is worn at the neck or on the chest.
import * as T from 'three';

// A piece's material. Its name is its colour area: main, accent and trim follow a colourway, fixed
// keeps its own colour (as with the outfits in outfit-registry.js).
export const finish=(name,color,options={})=>new T.MeshStandardMaterial({name,color,roughness:.7,metalness:0,side:T.DoubleSide,...options});
export function part(group,geometry,material,name){const m=new T.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
export function paintPiece(root,colors){if(colors)root.traverse(m=>{if(m.isMesh&&colors[m.material?.name])m.material.color.set(colors[m.material.name]);});}

// The round head in head units (body/round-head.js): an ellipsoid centred on the hair's position, and
// the eyes and ears on it (body/face.js).
export const HEAD={a:.43,b:.365,c:.34};
export const EYE={x:.165,y:-.087,z:.318,rx:.077,ry:.085,rz:.028};
export const EAR={x:.412,y:-.12,z:0,rx:.065,ry:.09,rz:.055};
// How far forward the face is at x, y (0 off its edge).
export function faceZ(x,y){const q=1-(x/HEAD.a)**2-(y/HEAD.b)**2;return q>0?HEAD.c*Math.sqrt(q):0;}
// How far forward an eye is at x, y (0 off the eye), so that a lens clears it.
export function eyeZ(x,y){const q=1-((Math.abs(x)-EYE.x)/EYE.rx)**2-((y-EYE.y)/EYE.ry)**2;return q>0?EYE.z+EYE.rz*Math.sqrt(q):0;}
// The head's radius round its middle at height y, towards angle a (0 is straight ahead, pi/2 is +x).
export function headRadius(y,a){const k=Math.sqrt(Math.max(0,1-(y/HEAD.b)**2)),sx=Math.sin(a)/(HEAD.a*k),cz=Math.cos(a)/(HEAD.c*k);return 1/Math.sqrt(sx*sx+cz*cz);}
// Worn on the head like a hairstyle: at the hair's centre, in its scale.
export function onHead(object,hair){object.position.copy(hair.position);object.scale.setScalar(hair.scale.x);object.rotation.set(0,0,0);}

// Fit a hat with a crown to the hairstyle it is worn on (leaving out a curl). The hat is made with its
// band, the lower edge, a circle of radius 1 round its own y axis, and a crown rising from it: a wall
// that flares out to bulge by the height wall, then a dome over to top, leaning forward by lean as it
// rises. It is worn tipped forward by pitch and to his right by roll, the front of the band front
// head units above the head's centre. At every angle the band is wide enough that the hair at the
// band, and above it as high as the wall, stays inside it (where there is no hair, it is outside the
// head); the crown is made tall enough to cover the hair above, margin to spare. Returns the hair's
// meshes it was fitted to.
const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
const fitRay=new T.Raycaster(),fitFrom=new T.Vector3(),fitDir=new T.Vector3(),fitLocal=new T.Vector3();
export function fitCrown(hat,hair,{pitch=0,roll=0,front=.1,wall=.3,top=.62,bulge=1.05,lean=0,margin=.08,angles=36}={}){
 hair.updateWorldMatrix(true,true);
 const meshes=[];hair.traverse(m=>{if(m.isMesh&&!/-curl$/.test(m.name))meshes.push(m);});
 const hb=new T.Box3();meshes.forEach(m=>hb.expandByObject(m));
 const hs=hb.getSize(new T.Vector3()),hc=hb.getCenter(new T.Vector3()),unit=hair.scale.x,flare=h=>1+(bulge-1)*smooth(h/wall,0,1);
 // how far out the hair (or the head) is towards angle a at height y, from the hair's centre line
 const outAt=(a,y)=>{fitDir.set(Math.sin(a),0,Math.cos(a));fitFrom.set(hc.x,y,hc.z).addScaledVector(fitDir,hs.x*2);fitRay.set(fitFrom,fitDir.clone().negate());fitRay.far=hs.x*2;const hit=fitRay.intersectObjects(meshes,false)[0];return Math.max(hit?hs.x*2-hit.distance:0,headRadius((y-hair.position.y)/unit,a)*unit+.01*unit);};
 let rx=hs.x/2,rz=hs.x/2,dz=0,y0=hair.position.y+(front+Math.sin(pitch)*.48)*unit;
 for(let pass=0;pass<2;pass++){
  const need=[];
  for(let i=0;i<angles;i++){const a=i/angles*Math.PI*2,band=y0-Math.sin(pitch)*Math.cos(a)*rz+Math.sin(roll)*Math.sin(a)*rx;let r=0;
   for(const h of [0,.2,.4,.7,1].map(k=>k*wall))r=Math.max(r,outAt(a,band+h*(rx+rz)/2)/flare(h));need.push([a,r]);}
  // an ellipse round the hair's centre line holding every one of those
  rx=0;for(const [a,r] of need)rx=Math.max(rx,Math.abs(Math.sin(a))*r);
  const ahead=need.filter(([a])=>Math.cos(a)>.7).reduce((m,[,r])=>Math.max(m,r),0),behind=need.filter(([a])=>Math.cos(a)<-.7).reduce((m,[,r])=>Math.max(m,r),0);
  dz=(ahead-behind)/2;rz=(ahead+behind)/2;
  for(let k=0;k<20;k++){if(need.every(([a,r])=>(Math.sin(a)*r/rx)**2+((Math.cos(a)*r-dz)/rz)**2<=1.0001))break;rx*=1.02;rz*=1.02;}
  y0=hair.position.y+front*unit+Math.sin(pitch)*rz;
 }
 hat.rotation.set(0,0,0);hat.scale.set(rx,(rx+rz)/2,rz);hat.position.set(hc.x,y0,hc.z+dz);hat.updateMatrixWorld(true);
 // tall enough: every bit of hair above the wall, inside it, stays under the crown
 const inverse=hat.matrixWorld.clone().invert();let tall=1;
 for(const m of meshes){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i+=2){fitLocal.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).applyMatrix4(inverse);if(fitLocal.y<=wall)continue;
  const r=Math.hypot(fitLocal.x,fitLocal.z-lean*smooth(fitLocal.y/top,.2,.95));if(r>=bulge)continue;tall=Math.max(tall,(fitLocal.y+margin)/(wall+(top-wall)*Math.sqrt(1-(r/bulge)**2)));}}
 hat.scale.y*=tall;hat.rotation.set(pitch,0,roll);hat.updateMatrixWorld(true);
 return meshes;
}

// A smooth surface read along by s (rows) and round by t (cols), closed round t: point(s, t) for s and
// t from 0 to 1. Its faces look out when, seen from outside, t runs round to the right of s (as with
// a crown read up from the band and round from the back). Where it closes, both edges take the same
// normal.
export function surface(point,rows,cols){
 const pos=[],idx=[];
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const p=point(i/rows,j/cols);pos.push(p.x,p.y,p.z);}
 for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;idx.push(a,a+1,b,a+1,b+1,b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
 const n=g.attributes.normal,m=new T.Vector3();
 for(let i=0;i<=rows;i++){const a=i*(cols+1),b=a+cols;m.set(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,m.x,m.y,m.z);n.setXYZ(b,m.x,m.y,m.z);}
 return g;
}

// The hair's points in head units, from the head's centre (leaving out a curl).
export function hairPoints(hair){
 hair.updateWorldMatrix(true,true);
 const points=[],u=hair.scale.x;
 hair.traverse(m=>{if(!m.isMesh||/-curl$/.test(m.name))return;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)points.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).sub(hair.position).divideScalar(u));});
 return points;
}
// Towards angle a round the head (0 straight ahead, pi/2 to +x) and elevation e (pi/2 straight up),
// r out from the head's centre.
export const toward=(a,e,r=1)=>new T.Vector3(Math.cos(e)*Math.sin(a)*r,Math.sin(e)*r,Math.cos(e)*Math.cos(a)*r);
// How far out from the head's centre the hair is, every way (head units): reach(a, e). The farthest
// of the points in each bin of directions (A round by angle, E up by elevation), spread to the bins
// within spread of it and smoothed over the bins within smoothing of it (a little less than it was
// spread, so that wherever something laid at that reach is read between bins, it still passes outside
// every strand), and never inside the head. The defaults make a soft shell for a hat; something small
// that lies right on the hair asks for finer bins and less spreading.
export function reachOf(points,{A=96,E=48,spread=3,smoothing=2}={}){
 const far=new Float32Array(A*E);
 for(const p of points){const d=p.length();if(d<1e-6)continue;const a=Math.atan2(p.x,p.z),e=Math.asin(T.MathUtils.clamp(p.y/d,-1,1));
  const i=((Math.floor((a+Math.PI)/(2*Math.PI)*A)%A)+A)%A,j=Math.min(E-1,Math.floor((e+Math.PI/2)/Math.PI*E));far[j*A+i]=Math.max(far[j*A+i],d);}
 // over the bins within r of each (round a ring near the top, the same reach takes in more of them),
 // the farthest, or the mean
 const pass=(src,r,farthest)=>{if(!r)return src;const out=new Float32Array(A*E);
  for(let j=0;j<E;j++){const ra=Math.min(A/2,Math.ceil(r*A/(2*E)/Math.max(.05,Math.cos(-Math.PI/2+(j+.5)/E*Math.PI))));
   for(let i=0;i<A;i++){let m=0,n=0;
    for(let jj=Math.max(0,j-r);jj<=Math.min(E-1,j+r);jj++)for(let di=-ra;di<=ra;di++){const v=src[jj*A+((i+di)%A+A)%A];if(farthest)m=Math.max(m,v);else{m+=v;n++;}}
    out[j*A+i]=farthest?m:m/n;}}
  return out;};
 const field=pass(pass(far,spread,true),smoothing,false),dir=new T.Vector3();
 return (a,e)=>{
  const fi=(a+Math.PI)/(2*Math.PI)*A-.5,fj=T.MathUtils.clamp((e+Math.PI/2)/Math.PI*E-.5,0,E-1),i0=Math.floor(fi),j0=Math.floor(fj),u=fi-i0,v=fj-j0,j1=Math.min(E-1,j0+1);
  const at=(i,j)=>field[j*A+((i%A)+A)%A],hair=(at(i0,j0)*(1-u)+at(i0+1,j0)*u)*(1-v)+(at(i0,j1)*(1-u)+at(i0+1,j1)*u)*v;
  dir.set(Math.cos(e)*Math.sin(a),Math.sin(e),Math.cos(e)*Math.cos(a));
  return Math.max(hair,1/Math.hypot(dir.x/HEAD.a,dir.y/HEAD.b,dir.z/HEAD.c));
 };
}
// Which way d (a direction from the head's centre) is: its angle round and its elevation.
export const angles=d=>[Math.atan2(d.x,d.z),Math.asin(T.MathUtils.clamp(d.y/d.length(),-1,1))];
// The point that far out (and lift more) towards a, e, and which way the surface there faces.
export function onReach(reach,a,e,lift=0){
 const h=.02,at=(p,q)=>toward(p,q,reach(p,q)+lift),point=at(a,e);
 const across=at(a+h,e).sub(at(a-h,e)),up=at(a,Math.min(Math.PI/2,e+h)).sub(at(a,Math.max(-Math.PI/2,e-h)));
 const normal=across.cross(up);
 return {point,normal:normal.lengthSq()>1e-12?normal.normalize():point.clone().normalize()};
}

// Where something flat of this size rests on the hair towards a, e: length along its own x and width
// along its y (head units), turned by turn from lying level, bent round the head by bend (its ends
// that much nearer the head per unit of length squared), and lifted just enough that no strand under
// any part of it comes up through it, then lift more. Returns where to stand it: a point and a
// quaternion (its +z out from the hair).
export function restOnReach(reach,a,e,{length=0,width=0,turn=0,bend=0,lift=0}={}){
 const {point,normal}=onReach(reach,a,e);
 const up=Math.abs(normal.y)>.95?new T.Vector3(0,0,-1):new T.Vector3(0,1,0),x0=up.cross(normal).normalize(),y0=normal.clone().cross(x0).normalize();
 const c=Math.cos(turn),s=Math.sin(turn),x=x0.clone().multiplyScalar(c).addScaledVector(y0,s),y=y0.clone().multiplyScalar(c).addScaledVector(x0,-s);
 let rise=0;
 for(const i of [-1,-.5,0,.5,1])for(const j of [-1,0,1]){const q=point.clone().addScaledVector(x,i*length/2).addScaledVector(y,j*width/2),[qa,qe]=angles(q);rise=Math.max(rise,toward(qa,qe,reach(qa,qe)).sub(point).dot(normal)+bend*(i*length/2)**2);}
 return {point:point.addScaledVector(normal,rise+lift),quaternion:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,normal))};
}

// Where the hairstyle's braids are tied off, if it has braids (body/hair-braids.js), in head units: for
// each, the point, which way is down the braid, across it, and out in front of it.
export function braidTies(hair){
 return (hair?.userData?.ties||[]).map(t=>({point:new T.Vector3(...t.point),along:new T.Vector3(...t.along),side:new T.Vector3(...t.side),front:new T.Vector3(...t.front)}));
}

// A tube along a path of points, closed or open: its section is an ellipse, w across the path in the
// plane it lies in (side) and d out of that plane (out); both may vary along the path (functions of
// t from 0 to 1). frame(t, point, tangent) gives the side and out directions at each point.
export function sweep(points,{w,d=w,closed=false,around=12,frame}){
 const n=points.length,pos=[],nor=[],uv=[],idx=[],W=typeof w==='function'?w:()=>w,D=typeof d==='function'?d:()=>d;
 const tangent=new T.Vector3(),side=new T.Vector3(),out=new T.Vector3(),p=new T.Vector3(),q=new T.Vector3();
 for(let i=0;i<n;i++){
  const t=closed?i/n:i/(n-1),a=points[closed?(i-1+n)%n:Math.max(0,i-1)],b=points[closed?(i+1)%n:Math.min(n-1,i+1)];
  tangent.subVectors(b,a).normalize();frame(t,points[i],tangent,side,out);
  for(let j=0;j<=around;j++){const s=j/around*Math.PI*2,c=Math.cos(s),z=Math.sin(s);
   p.copy(points[i]).addScaledVector(side,c*W(t)).addScaledVector(out,z*D(t));pos.push(p.x,p.y,p.z);
   q.copy(side).multiplyScalar(c/Math.max(1e-6,W(t))).addScaledVector(out,z/Math.max(1e-6,D(t))).normalize();nor.push(q.x,q.y,q.z);uv.push(t,j/around);}
 }
 const rows=closed?n:n-1;
 for(let i=0;i<rows;i++){const a=i*(around+1),b=((i+1)%n)*(around+1);for(let j=0;j<around;j++)idx.push(a+j,b+j,a+j+1,a+j+1,b+j,b+j+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;
}

// What a piece at the neck or on the chest rests on: the skin and every visible part of the outfit
// being worn, seen from both sides (the skin is only drawn from outside), and only the part of them
// within reach (box, in world coordinates), so that finding them is quick. In world coordinates; the
// piece's parent is expected to have no transform of its own yet, as with the hair.
const bothSides=new T.MeshBasicMaterial({side:T.DoubleSide});
export function wornSurfaces({body,outfit}={},box){
 const list=[],corner=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
 const add=m=>{m.updateWorldMatrix(true,false);
  const p=m.geometry.attributes.position,index=m.geometry.index,count=index?index.count:p.count,kept=[];
  for(let i=0;i+2<count;i+=3){let near=!box;for(let k=0;k<3;k++){corner[k].fromBufferAttribute(p,index?index.getX(i+k):i+k).applyMatrix4(m.matrixWorld);if(box?.containsPoint(corner[k]))near=true;}if(near)for(const c of corner)kept.push(c.x,c.y,c.z);}
  if(!kept.length)return;
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(kept,3));const s=new T.Mesh(g,bothSides);s.name=m.name;list.push(s);};
 if(body)add(body);
 if(outfit){outfit.updateWorldMatrix(true,true);outfit.traverse(m=>{if(!m.isMesh)return;for(let o=m;o&&o!==outfit.parent;o=o.parent)if(!o.visible)return;add(m);});}
 return list;
}
const ray=new T.Raycaster();
// Every place a ray from origin along dir crosses the surfaces within far, nearest first.
export function crossings(surfaces,origin,dir,far){ray.set(origin,dir);ray.near=0;ray.far=far;const hits=[];for(const s of surfaces)hits.push(...ray.intersectObject(s,false));return hits.sort((a,b)=>a.distance-b.distance);}

// Where the front of what is worn is, at x, y on the chest (body units): the point, which way the
// surface faces there (smoothed over a little patch), and whether it is cloth or bare skin. Looking
// from in front, a piece on the chest lands on the first thing there.
const SKIN='purchased-body';
export function chestAt(surfaces,x,y,patch=.016){
 const hits=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]].map(([dx,dy])=>crossings(surfaces,new T.Vector3(x+dx*patch,y+dy*patch,.75),new T.Vector3(0,0,-1),.75)[0]).filter(Boolean);
 if(!hits.length)return null;
 const normal=new T.Vector3();for(const h of hits){const n=h.face.normal.clone();if(n.z<0)n.negate();normal.add(n);}normal.normalize();
 // smooth: nothing under it stands out of the surface's slope there (a button, the edge of a lapel),
 // whatever it is made of
 const heights=hits.map(h=>h.point.clone().sub(hits[0].point).dot(normal)),bump=Math.max(...heights)-Math.min(...heights)+(hits.length<9?1:0);
 // in front of all of the patch, so an edge beside it doesn't come over it
 const point=hits[0].point.clone().addScaledVector(normal,Math.max(0,...heights));
 return {point,normal,skin:hits.some(h=>h.object.name===SKIN),bump,flat:bump<.008};
}
// The first of these places on the chest that is smooth cloth all round, as far as patch (the size of
// the piece); failing that, the smoothest on cloth; failing that, the first place.
export function onCloth(surfaces,places,patch){
 const all=places.map(([x,y])=>chestAt(surfaces,x,y,patch)).filter(Boolean);
 const cloth=all.filter(at=>!at.skin);
 return all.find(at=>at.flat&&!at.skin)||cloth.sort((a,b)=>a.bump-b.bump)[0]||all[0]||null;
}
// Stand a piece on the surface: its own +z along the surface's normal, its +y as near up as that
// allows, a little out from the surface, at the size given.
export function standOn(object,at,lift=0,size=1){
 const z=at.normal.clone(),x=new T.Vector3(0,1,0).cross(z).normalize(),y=z.clone().cross(x).normalize();
 object.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));object.position.copy(at.point).addScaledVector(z,lift);object.scale.setScalar(size);
}
// Polished metal, kept light enough to read in rooms with no reflections to show.
export const metalFinish=(name,color)=>finish(name,color,{roughness:.32,metalness:.35});
