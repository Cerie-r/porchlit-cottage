import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {extraOutfits} from './outfit-registry.js';
import {smoothstep,around,torsoAt,rowHeights,rings,mesh,armRings,profile,cloth,fold,slab,circleAround} from './outfit-tools.js';
// Sewn garments, built in the residents' body coordinates: y up, face towards +z; the torso's axis is
// x 0, z .10 and the legs' x ±.19, z .11 (TORSO and ARM in outfit-tools.js describe that body).
// Each outfit has its own three colour areas, materials named main, accent and trim (plus fixed for
// what never changes colour), and mesh names that tell body/avatar-rig.js how each piece moves.
export function createOutfits(body){
 const dress=creamDress(),coat=charcoalCoat();
 const extra=Object.fromEntries(extraOutfits.map(o=>[o.id,o.build()]));
 if(body){fitShells(dress,body);fitShells(coat,body);Object.values(extra).forEach(o=>fitShells(o,body));}
 return {dress,coat,...extra};
}

// Expand garment surfaces around the intact body, never remove body triangles.
// From the garment's own vertical axis a ray goes out through each vertex; the first place it leaves
// the skin is the body's surface there (an arm or the other leg further along doesn't count). A vertex
// closer in than that, plus a gap, moves out along the ray. Torso pieces skip a surface past |x| .365,
// where an arm joins the side; leg pieces ({leg: true}, or the trouser names) look along their own axis.
function fitShells(outfit,body){
 body.updateWorldMatrix(true,false);outfit.updateMatrixWorld(true);
 const skin=new T.Mesh(body.geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));skin.matrixAutoUpdate=false;skin.matrixWorld.copy(body.matrixWorld);
 const ray=new T.Raycaster(),origin=new T.Vector3(),point=new T.Vector3(),dir=new T.Vector3(),normal=new T.Vector3();
 outfit.traverse(mesh=>{if(!mesh.isMesh||!mesh.userData.clothAxis)return;
  if(['tailored-sleeve','turned-cuff'].includes(mesh.name))return;
  const axis=mesh.userData.clothAxis,{cx,cz}=axis,p=mesh.geometry.attributes.position;
  const leg=axis.leg||['straight-trouser','trouser-hem'].includes(mesh.name),gap=axis.gap??(['open-coat','waist-ribbon'].includes(mesh.name)?.04:.018);
  for(let i=0;i<p.count;i++){
   origin.set(cx,p.getY(i),cz).applyMatrix4(mesh.matrixWorld);point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);dir.subVectors(point,origin);const radius=dir.length();if(radius<.008)continue;dir.normalize();ray.set(origin,dir);ray.near=0;ray.far=leg?.29:.48;
   const exit=ray.intersectObject(skin,false).find(h=>normal.copy(h.face.normal).transformDirection(skin.matrixWorld).dot(dir)>0);
   if(!exit||(!leg&&Math.abs(exit.point.x)>=.365))continue;const required=exit.distance+gap;
   if(required>radius){point.copy(origin).addScaledVector(dir,required);mesh.worldToLocal(point);p.setXYZ(i,point.x,point.y,point.z);}
  }p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
 });skin.material.dispose();
}

// The cream long dress: a fitted bodice with a round collar and a little bow, long puff sleeves, a
// ribbon belt a touch above the waist, and a full A-line skirt with soft folds and a double hem.
function creamDress(){
 const main=cloth('main','#eee5d6',.94),accent=cloth('accent','#897469',.85),trim=cloth('trim','#faf4e8',.85),fixed=cloth('fixed','#57535a',.9);
 const g=new T.Group();g.name='cream-long-dress';
 const WAIST=1.035,HEM=.205,ease=.022;
 const bodice=(a,y)=>around(torsoAt(y),a)+ease;
 const skirtWaist=[.275,.32,.285],skirtHem=[.50,.545,.50];
 const skirtR=(a,y)=>{const t=(WAIST-y)/(WAIST-HEM),s=Math.pow(Math.max(0,t),.85),base=around(skirtWaist,a)+(around(skirtHem,a)-around(skirtWaist,a))*s;return base+.03*Math.pow(Math.max(0,t),.9)*fold(a);};
 // bodice and skirt are one piece of cloth; the skirt starts under the ribbon
 const dressR=(a,y)=>{if(y>=WAIST+.035)return bodice(a,y);if(y<=WAIST)return skirtR(a,y);const t=smoothstep((WAIST+.035-y)/.035);return bodice(a,y)*(1-t)+skirtR(a,y)*t;};
 const rows=rowHeights(1.40,HEM).map(y=>[y,dressR]);
 mesh(g,rings(rows,64),main,'continuous-fitted-dress',{cx:0,cz:.10});
 // double hem: a band just outside the skirt's lowest rows, and two fine lines of stitching on it
 const hemRows=[HEM+.05,HEM+.034,HEM+.017,HEM+.004,HEM-.006].map(y=>[y,(a,yy)=>skirtR(a,Math.max(yy,HEM))+.007]);
 mesh(g,rings(hemRows,64),trim,'double-hem',{cx:0,cz:.10,gap:.026});
 for(const y of [HEM+.036,HEM+.012]){const pts=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2,R=skirtR(a,y)+.0115;pts.push(new T.Vector3(Math.sin(a)*R,y,.10+Math.cos(a)*R));}mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),80,.0032,4,true),accent,'seam');}
 // ribbon belt, a little above the natural waist so the thighs pass under it when she sits
 const beltR=(a,y)=>bodice(a,y)+.012+.004*Math.sin(Math.PI*(y-WAIST)/.06);
 mesh(g,rings([WAIST+.062,WAIST+.05,WAIST+.03,WAIST+.01,WAIST-.002].map(y=>[y,beltR]),64),accent,'waist-ribbon',{cx:0,cz:.10});
 // a round collar lying on the shoulders, in two halves meeting at the front
 const collarTop=a=>1.395-.045*Math.cos(a/2)**4;
 for(const side of [-1,1]){
  const pos=[],uv=[],idx=[],U=26,V=6;
  for(let i=0;i<=U;i++){const u=i/U,a=side*(.09+u*(Math.PI-.13)),y0=collarTop(Math.abs(a)),w=.072*Math.sqrt(Math.max(0,Math.min(1,u*9)))*(1-.25*u);
   for(let j=0;j<=V;j++){const v=j/V,y=y0-w*v*.62,R=bodice(a,y)+.012+.006*Math.sin(Math.PI*v)+w*v*.55;pos.push(Math.sin(a)*R,y,.10+Math.cos(a)*R);uv.push(u,v);}}
  for(let i=0;i<U;i++)for(let j=0;j<V;j++){const a=i*(V+1)+j,b=a+V+1;side>0?idx.push(a,b,a+1,a+1,b,b+1):idx.push(a,a+1,b,a+1,b+1,b);}
  const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(pos,3));cg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));cg.setIndex(idx);cg.computeVertexNormals();
  mesh(g,cg,trim,'petal-collar');
 }
 // a little bow where the collar meets, and two buttons down the front
 const front=y=>.10+bodice(0,y);
 const bow=[];for(const s of [-1,1]){const loop=new T.SphereGeometry(1,12,8);loop.scale(.042,.026,.013);loop.rotateZ(s*.35);loop.translate(s*.036,0,0);bow.push(loop.toNonIndexed());const tail=new T.CapsuleGeometry(.009,.04,2,6);tail.rotateZ(s*.4);tail.translate(s*.016,-.034,-.002);bow.push(tail.toNonIndexed());}
 const knot=new T.SphereGeometry(1,10,6);knot.scale(.016,.018,.013);bow.push(knot.toNonIndexed());
 const bowGeometry=mergeGeometries(bow);bowGeometry.translate(0,1.338,front(1.338)+.03);mesh(g,bowGeometry,accent,'neck-bow');
 for(const y of [1.25,1.165]){const b=mesh(g,new T.SphereGeometry(.013,10,6),trim,'button');b.position.set(0,y,front(y)+.008);b.scale.z=.5;}
 // long puff sleeves, full over the upper arm and gathered into a cuff at the wrist: on the rig the
 // upper arm near the shoulder hardly moves while the forearm swings, so a sleeve has to stay loose up
 // there and can only be snug where the whole arm moves with the shoulder
 for(const side of [-1,1]){
  // radius along the arm: a soft puff over the upper arm, easing in past the elbow to the cuff
  const full=s=>profile([[-.08,.1],[-.06,.135],[-.03,.158],[.02,.172],[.1,.176],[.2,.168],[.3,.152],[.37,.138],[.42,.122],[.46,.108],[.48,.1]],s);
  const gathers=s=>Math.sin(Math.PI*Math.min(1,Math.max(0,(s+.08)/.56)));
  const ss=[-.08,-.07,-.055,-.035,-.01,.02,.06,.1,.14,.18,.22,.26,.3,.34,.37,.4,.425,.445,.465,.48];
  const sl=armRings(side,ss.map(s=>[s,a=>full(s)+.005*Math.sin(10*a)*gathers(s)]),24);
  mesh(g,sl.geometry,main,'tailored-sleeve');
  mesh(g,armRings(side,[[.472,.1],[.478,.104],[.505,.104],[.512,.1]],24).geometry,trim,'turned-cuff');
  const edge=mesh(g,new T.TorusGeometry(.101,.007,5,24),trim,'cuff-bound-edge');edge.position.copy(sl.centre(.512));edge.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),sl.frame(.512).d);
 }
 // round shoes on soles
 for(const side of [-1,1]){
  const shoe=mesh(g,new T.SphereGeometry(1,22,12),accent,'shoe');shoe.position.set(side*.2,.088,.125);shoe.scale.set(.19,.13,.29);
  const sole=mesh(g,new T.SphereGeometry(1,22,8),fixed,'sole');sole.position.set(side*.2,.032,.125);sole.scale.set(.193,.04,.295);
 }
 return g;
}

// The charcoal coat set: a long open coat with notched lapels, flap pockets and long sleeves, over a
// ribbed high-neck knit and straight trousers, with round shoes.
function charcoalCoat(){
 const main=cloth('main','#353439',.92),accent=cloth('accent','#242429',1),trim=cloth('trim','#57535a',.9);
 const g=new T.Group();g.name='charcoal-coat-set';
 const torso=(a,y)=>around(torsoAt(y),a);
 // the knit: a ribbed collar up into the head, then close over the chest, tucked in at the waist
 const neck=circleAround(.108,-.055),rib=a=>.0035*Math.cos(28*a);
 const knitR=(a,y)=>{const body=torso(a,y)+.02;if(y>=1.375)return neck(a)+rib(a);const t=smoothstep((1.375-y)/.05);return (neck(a)+rib(a))*(1-t)+body*t;};
 mesh(g,rings([1.49,1.46,1.43,1.40,1.385,1.37,1.355,1.34,1.31,1.27,1.22,1.16,1.10,1.05,1.0].map(y=>[y,knitR]),64),accent,'high-neck-knit',{cx:0,cz:.10});
 // trousers: each leg is one piece. Above the crotch it goes round its half of the hips, from the
 // middle of the front, over the side, to the middle of the back, and closes along the middle plane
 // inside the body; below the crotch it is a tube round the leg. The "stitch" in its name lets it bend
 // at the hips the way the skin does (a "trouser" would turn with the thigh right up to the waist).
 for(const side of [-1,1]){
  const cx=side*.19,cz=.11,legR=y=>.152+(.13-.152)*Math.min(1,Math.max(0,(.78-y)/.76))+.034;
  const OUT=.75,ys=rowHeights(1.045,.16,.036),cols=32,per=cols+1;
  const hipPoint=(u,y)=>{const yy=Math.max(y,.72);if(u<=OUT){const a=side*Math.PI*u/OUT,R=torso(a,yy)+.026;return [Math.sin(a)*R,.10+Math.cos(a)*R];}
   const t=(u-OUT)/(1-OUT),back=.10-(torsoAt(yy)[2]+.026),front=.10+torsoAt(yy)[0]+.026;return [side*.002,back+(front-back)*t];};
  const legPoint=(u,y)=>{const p=side*(u<=OUT?Math.PI*u/OUT:Math.PI+Math.PI*(u-OUT)/(1-OUT)),R=legR(y);return [cx+Math.sin(p)*R,cz+Math.cos(p)*R];};
  const pos=[],uv=[],idx=[];
  // the two halves stay joined down the middle a little below the crotch, so no skin shows there
  ys.forEach((y,j)=>{const t=smoothstep((y-.55)/.13);for(let i=0;i<=cols;i++){const u=(i%cols)/cols,[x1,z1]=legPoint(u,y),[x2,z2]=hipPoint(u,y);pos.push(x1+(x2-x1)*t,y,z1+(z2-z1)*t);uv.push(i/cols,1-j/(ys.length-1));}});
  for(let j=0;j<ys.length-1;j++)for(let i=0;i<cols;i++){const a=j*per+i,b=a+per;side>0?idx.push(a,b,a+1,a+1,b,b+1):idx.push(a,a+1,b,a+1,b+1,b);}
  const leg=new T.BufferGeometry();leg.setAttribute('position',new T.Float32BufferAttribute(pos,3));leg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));leg.setIndex(idx);leg.computeVertexNormals();
  mesh(g,leg,accent,'pant-leg-stitch',{cx,cz,leg:true});
  // turned-up hems, and a pressed crease down the front
  mesh(g,rings([.205,.19,.175,.16,.15].map(y=>[y,()=>legR(y)+.01]),28,{cx,cz}),main,'trouser-hem',{cx,cz});
  const crease=[];for(let k=0;k<=20;k++){const y=.64-k*.022;crease.push(new T.Vector3(cx,y,cz+legR(y)+.003));}
  mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(crease),40,.0028,4,false),trim,'seam');
 }
 // the coat: long and open, reaching below the knees, so when he sits its two fronts lie over his lap
 // (on the rig the tops of the thighs rise through the waist of anything under it, and the front of a
 // short coat turns up into the body); the lapels open above the waist button
 const HEM=.4,coatR=(a,y)=>torso(a,Math.max(y,.72))+.05+.05*smoothstep((1.0-y)/.6)+.028*Math.max(0,Math.cos(a))*smoothstep((.99-y)/.12)+(y<.72?.03*Math.sin(a)**2*smoothstep((.72-y)/.3):0);
 const opening=y=>y>=1.0?.06+.74*smoothstep((y-1.0)/.37):.06+.18*smoothstep((1.0-y)/.16);
 mesh(g,rings(rowHeights(1.40,HEM).map(y=>[y,coatR]),64,{opening}),main,'open-coat',{cx:0,cz:.10});
 // lapels folded back from the opening, notched where they meet the collar
 for(const side of [-1,1]){
  const outline=(u,v)=>{const y=1.0+u*.385,o=opening(y),w=.32*smoothstep(u/.55)*(1-.35*smoothstep((u-.62)/.12))+.18*smoothstep((u-.74)/.1);return [side*(o+v*w),y];};
  mesh(g,slab(coatR,outline,18,4,.004,.009),main,'notched-lapel');
 }
 // flap pockets over the hips: their name keeps them moving with the coat there
 for(const side of [-1,1]){
  const outline=(u,v)=>[side*(.72+u*.5),.895-v*.055-.008*Math.sin(Math.PI*u)*v];
  mesh(g,slab(coatR,outline,8,2,.003,.008),main,'pocket-hem');
 }
 for(const y of [1.05,.985]){const a=-(opening(y)+.1),R=coatR(a,y)+.012,b=mesh(g,new T.SphereGeometry(.016,10,6),trim,'button');b.position.set(Math.sin(a)*R,y,.10+Math.cos(a)*R);b.lookAt(Math.sin(a)*2,y,.10+Math.cos(a)*2);b.scale.z=.5;}
 // long sleeves: easy over the upper arm, which barely moves on the rig, close at the wrist
 for(const side of [-1,1]){
  const r=s=>profile([[-.07,.1],[-.05,.13],[-.02,.15],[.05,.158],[.2,.148],[.32,.134],[.4,.12],[.46,.112],[.5,.108]],s);
  // roomier behind, near the armpit: the arm swings forward inside it when he sits
  const behind=(a,s)=>.04*Math.max(0,-Math.cos(a))**1.5*(1-smoothstep((s-.02)/.22));
  const ss=[-.07,-.06,-.045,-.025,0,.04,.09,.14,.19,.24,.29,.33,.37,.41,.44,.47,.5];
  const sl=armRings(side,ss.map(s=>[s,a=>r(s)+behind(a,s)]),20);
  mesh(g,sl.geometry,main,'tailored-sleeve');
  mesh(g,armRings(side,[[.43,.122],[.44,.126],[.49,.124],[.5,.12]],20).geometry,main,'turned-cuff');
  const edge=mesh(g,new T.TorusGeometry(.121,.006,5,24),main,'cuff-bound-edge');edge.position.copy(sl.centre(.5));edge.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),sl.frame(.5).d);
 }
 for(const side of [-1,1]){
  const shoe=mesh(g,new T.SphereGeometry(1,22,12),accent,'shoe');shoe.position.set(side*.2,.09,.125);shoe.scale.set(.2,.14,.3);
  const sole=mesh(g,new T.SphereGeometry(1,22,8),trim,'sole');sole.position.set(side*.2,.033,.125);sole.scale.set(.203,.042,.305);
 }
 return g;
}

// What the fit changed (built at build time, scripts/build-outfits.mjs), for applyOutfitFit to put back
// on garments made again the same way: for each outfit, each fitted mesh in order, as its coordinate
// count n and only the vertices the fit moved, i their indices and p their coordinates (to 1e-6).
// Most of a garment is drawn outside the body and never moves.
export function outfitFitData(made,fitted){
 const data={};
 for(const [key,group] of Object.entries(fitted)){
  const before=[];made[key].traverse(m=>{if(m.isMesh&&m.userData.clothAxis)before.push(m.geometry.attributes.position.array);});
  let k=0;data[key]=[];
  group.traverse(m=>{if(!m.isMesh||!m.userData.clothAxis)return;const a=m.geometry.attributes.position.array,b=before[k++],i=[],p=[];
   for(let v=0;v<a.length/3;v++)if(a[3*v]!==b[3*v]||a[3*v+1]!==b[3*v+1]||a[3*v+2]!==b[3*v+2]){i.push(v);p.push(+a[3*v].toFixed(6),+a[3*v+1].toFixed(6),+a[3*v+2].toFixed(6));}
   data[key].push({n:a.length,i,p});});
 }
 return data;
}
// Put the fit back: each fitted mesh takes its moved vertices (or, from an older build, every
// coordinate), matched by order and count.
export function applyOutfitFit(outfits,data){for(const [key,group] of Object.entries(outfits)){let i=0;group.traverse(m=>{if(!m.isMesh||!m.userData.clothAxis)return;const values=data[key][i++],p=m.geometry.attributes.position;
 if(Array.isArray(values)){if(values.length!==p.array.length)throw new Error('Outfit fit mismatch');p.array.set(values);}
 else{if(values.n!==p.array.length)throw new Error('Outfit fit mismatch');values.i.forEach((v,k)=>p.setXYZ(v,values.p[3*k],values.p[3*k+1],values.p[3*k+2]));}
 p.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere();});}}
