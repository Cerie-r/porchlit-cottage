import * as T from 'three';
import {EXPRESSIONS,expressionOf} from './expressions.js';
export function createFaceAndHairBase(model){
 model.updateMatrixWorld(true);
 const source=model.getObjectByName('purchased-head'),box=new T.Box3().setFromObject(source),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 const face=new T.Group();face.name='facial-features';
 const eyes=[],brows=[],lids=[],blush=[],glints=[];
 // Exact original ResidentModel proportions, scaled together with the head.
 const unit=size.x/.86;
 function oval(position,scale,color,roughness=.85,rotation=[0,0,0]){
  const mesh=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshStandardMaterial({color,roughness}));
  mesh.position.copy(center).add(new T.Vector3(...position).multiplyScalar(unit));
  mesh.scale.set(...scale.map(v=>v*unit));mesh.rotation.set(...rotation);face.add(mesh);return mesh;
 }
 function line(points,color,radius){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p).multiplyScalar(unit).add(center)));
  const mesh=new T.Mesh(new T.TubeGeometry(curve,16,radius*unit,6,false),new T.MeshStandardMaterial({color,roughness:.85}));face.add(mesh);return mesh;
 }
 for(const side of [-1,1]){
  oval([side*.412,-.12,0],[.065,.09,.055],'#f5dfce');
  blush.push(oval([side*.254,-.167,.269],[.060,.026,.010],'#eac3b7',.85,[0,side*.30,0]));
  const eye=oval([side*.165,-.087,.318],[.077,.085,.028],'#454344',.7);eye.name='eye';eyes.push(eye);
  const glint=oval([side*.165-.022,-.059,.345],[.012,.015,.004],'#eee6dc');glint.name='eye-light';glints.push(glint);
  // Asleep: the eye shut, a little arc. Drawn only while asleep (resident-motion.jsx shows it), but kept as a
  // mesh all along so the rig keeps it.
  const shut=line([[side*.165-.058,-.083,.322],[side*.165,-.112,.336],[side*.165+.058,-.083,.322]],'#4a3f3d',.0075);shut.name='eye-shut';shut.material.visible=false;
  brows.push(line([[side*.13,.034,.337],[side*.17,.044,.33],[side*.21,.036,.314]],'#806455',.006));
 }
 // The expressions (body/expressions.js): a mouth for each, and an eye closed in an arc for the ones
 // that close one. What is drawn on the face lies on the round head: zs is how far forward it is
 // at x, y (head units, from its centre).
 const zs=(x,y)=>.34*Math.sqrt(Math.max(0,1-(x/.43)**2-(y/.365)**2));
 const onFace=(x,y,lift)=>[x,y,zs(x,y)+lift];
 const stroke=(points,color,radius,lift=.006)=>{const curve=new T.CatmullRomCurve3(points.map(([x,y])=>new T.Vector3(...onFace(x,y,lift)).multiplyScalar(unit).add(center)));return new T.Mesh(new T.TubeGeometry(curve,32,radius*unit,6,false),new T.MeshStandardMaterial({color,roughness:.85}));};
 // a flat shape lying on the face: its outline [[x, y], ...]
 const patch=(outline,color,lift)=>{const g=new T.ShapeGeometry(new T.Shape(outline.map(([x,y])=>new T.Vector2(x,y)))),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setXYZ(i,center.x+x*unit,center.y+y*unit,center.z+(zs(x,y)+lift)*unit);}
  g.computeVertexNormals();return new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.8,side:T.DoubleSide}));};
 const lip='#9f7866',inside='#7a3f44',tongue='#e58f93';
 const arc=(n,f)=>Array.from({length:n+1},(_,i)=>f(i/n));
 const ellipse=(cx,cy,rx,ry)=>arc(24,t=>[cx+rx*Math.cos(t*Math.PI*2),cy+ry*Math.sin(t*Math.PI*2)]).slice(0,-1);
 // an open mouth: a straight top edge sagging a touch, round underneath, w wide and h deep from y0
 const open=(w,h,y0)=>[...arc(20,t=>[-w/2*Math.cos(t*Math.PI),y0-h*Math.sin(t*Math.PI)]),...arc(8,t=>[w/2-w*t,y0-.003*Math.sin(t*Math.PI)]).slice(1,-1)];
 const tongueIn=(w,h,y0,dx=0)=>ellipse(dx,y0-h*.7,w*.26,h*.25);
 const smile=t=>{const x=-.032+.064*t;return [x,-.233-.012*Math.cos(Math.PI/2*x/.032)];};
 const shapes={
  frown:()=>[stroke([[-.022,-.238],[0,-.2315],[.022,-.238]],lip,.006)],
  smile:()=>[stroke(arc(8,smile),lip,.0055)],
  grin:()=>[patch(open(.074,.042,-.227),inside,.004),patch(tongueIn(.074,.042,-.227),tongue,.0052)],
  cat:()=>[stroke([[-.032,-.231],[-.024,-.2385],[-.016,-.2412],[-.008,-.2385],[0,-.2335],[.008,-.2385],[.016,-.2412],[.024,-.2385],[.032,-.231]],lip,.0052)],
  oh:()=>[patch(ellipse(0,-.243,.018,.023),inside,.004)],
  wink:()=>[stroke(arc(8,smile),lip,.0055),patch([[.002,-.2425],[.024,-.2425],[.024,-.2535],[.021,-.26],[.013,-.2635],[.005,-.26],[.002,-.2535]],tongue,.0045)],
  shy:()=>[stroke(arc(16,t=>{const x=-.034+.068*t;return [x,-.2385+.0052*Math.sin(Math.PI*4*t)];}),lip,.0054)]
 };
 const mouths=EXPRESSIONS.map(e=>{const g=new T.Group();g.name='mouth-'+e.id;shapes[e.id]().forEach(m=>g.add(m));g.visible=false;face.add(g);return g;});
 // an eye closed in an arc, one for each eye; coloured like the eyes, darker (as lids are). Awake only:
 // asleep, resident-motion.jsx hides it with the open eyes and shows the eye shut instead.
 for(const side of [-1,1]){const lid=stroke(arc(12,t=>{const u=2*t-1;return [side*.165+u*.058,-.093+.031*(1-u*u)];}),'#454344',.0085,.008);lid.name='eye-closed';lid.visible=false;lids.push(lid);face.add(lid);}
 function setExpression(index){
  const e=EXPRESSIONS[expressionOf(index)];
  mouths.forEach(m=>m.visible=m.name==='mouth-'+e.id);
  [-1,1].forEach((side,i)=>{const shut=e.eyes==='happy'||(e.eyes==='wink'&&side>0);eyes[i].visible=glints[i].visible=!shut;lids[i].visible=shut;});
  return e;
 }
 setExpression(0);
 // Per-style scalp: preserve crown/back coverage, but leave the centre part open.
 const g=source.geometry.clone().applyMatrix4(source.matrixWorld).toNonIndexed();
 const p=g.attributes.position,n=g.attributes.normal;
 function scalpGeometry(kind){
  const positions=[],normals=[];
  function distance(v){
   const front=T.MathUtils.smoothstep(v.z,center.z-size.z*.35,center.z-size.z*.15);
   const side=Math.min(1,Math.abs(v.x-center.x)/(size.x*.48));
   const forehead=kind==='long'?.04:.30-.14*Math.pow(side,1.5);
   return v.y-(center.y+size.y*(-.18+(forehead+.18)*front));
  }
  for(let i=0;i<p.count;i+=3){
   const tri=[];for(let k=0;k<3;k++)tri.push({v:new T.Vector3().fromBufferAttribute(p,i+k),n:new T.Vector3().fromBufferAttribute(n,i+k)});
   const clipped=[];
   for(let k=0;k<3;k++){
    const a=tri[k],b=tri[(k+1)%3],da=distance(a.v),db=distance(b.v);
    if(da>=0)clipped.push(a);
    if((da>=0)!==(db>=0)){const t=da/(da-db);clipped.push({v:a.v.clone().lerp(b.v,t),n:a.n.clone().lerp(b.n,t).normalize()});}
   }
   for(let k=1;k<clipped.length-1;k++)for(const q of [clipped[0],clipped[k],clipped[k+1]]){
    const v=q.v.clone().addScaledVector(q.n,.022);positions.push(v.x,v.y,v.z);normals.push(q.n.x,q.n.y,q.n.z);
   }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));return geo;
 }
 const scalps={long:scalpGeometry('long'),short:scalpGeometry('short')};
 const base=new T.Mesh(scalps.long,new T.MeshStandardMaterial({color:'#685047',roughness:.88,side:T.DoubleSide}));base.name='continuous-hair-base';base.castShadow=true;
 return {face,base,eyes,brows,lids,scalps,blush,mouths,setExpression};
}
