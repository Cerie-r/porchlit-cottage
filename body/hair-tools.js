import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Tools for code-made hairstyles, in the head's own units like the classic hair
// (src/resident-hair.js): the head is .86 wide, centred on 0; x towards the
// wearer's left, y up, z forwards. Scale by the head's width over .86 and
// centre on the head to wear it.
//
// A style is a closed shell over the head plus a few separate locks lying on
// it. Places on the shell are given as a (round the head, 0 in front, + to the
// wearer's left) and t (down from the crown); lift(a, t) raises the surface
// into masses, edge(a) says where the shell ends.
export const smooth=(x,a,b)=>THREE.MathUtils.smoothstep(x,a,b);
export const bump=(x,c,w,p=2)=>Math.exp(-Math.pow(Math.abs(x-c)/w,p));
// A smooth value through points [[a, value]] sorted by a.
export function curve(a,points){let i=1;while(i<points.length-1&&a>points[i][0])i++;const [x,y]=points[i-1],[xx,yy]=points[i];return THREE.MathUtils.lerp(y,yy,smooth(a,x,xx));}
// A point on the hair: d out from the base surface; inner pulls the top in, taper pulls the sides in.
export function place(a,t,d,inner=0,taper=0){const r=Math.pow(Math.max(0,Math.sin(t)),.83);return new THREE.Vector3((.47+d-taper)*r*Math.sin(a),.03+(.425+d*.7-inner)*Math.cos(t),-.03+(.405+d)*r*Math.cos(a));}
// The outer surface runs from the crown to the hem. The inner one only goes round the hem, where it
// gives the edge its thickness; higher up it would be hidden in the head, so it starts tucked into it.
// `at` places the points (place() by default; a long style can let the hair fall straight below the head).
// The columns go evenly round the head, or, given a density(a), closer together where it is higher:
// where the hem drops steeply (beside the face of a long style) a few columns would make it ragged.
// Each column's rows are spread evenly down to its own edge; with a jagged edge (a hem of points) that
// would put one row at different heights in neighbouring columns and shear whatever the surface has
// there, so `level` (the furthest down any column reaches) puts the rows at the same heights all round
// instead, each column stopping at its edge. The last `rim` rows then follow the edge itself, the
// same distance apart in every column (`rimDepth` in all), so the hem's own shape (its lip, a roll,
// a flick) comes out the same all along it.
export function shell({lift,edge,taper=(a,t)=>.026*smooth(Math.abs(Math.sin(a)),.6,1)*smooth(t,1.1,1.65),rows=40,cols=180,under=8,from=.8,at=place,density=null,level=0,rim=0,rimDepth=.12}){
 const pos=[],idx=[],stride=cols+1,base=(rows+1)*stride,angles=[];
 if(density){
  const N=4096,sum=[0];for(let i=1;i<=N;i++)sum.push(sum[i-1]+density(-Math.PI+(i-.5)/N*Math.PI*2));
  for(let j=0,i=0;j<=cols;j++){const goal=j/cols*sum[N];while(i<N-1&&sum[i+1]<goal)i++;angles.push(-Math.PI+(i+(goal-sum[i])/(sum[i+1]-sum[i]))/N*Math.PI*2);}
 }else for(let j=0;j<=cols;j++)angles.push(-Math.PI+j/cols*Math.PI*2);
 const body=rows-rim;
 const ring=(i,inner)=>{for(let j=0;j<=cols;j++){
  const a=angles[j],e=edge(a);let t,v;
  if(inner||!level){v=inner?i:i/rows;t=e*v;}
  else if(i<=body){t=Math.min(level*i/body,e-(rim?rimDepth:0));v=t/e;}
  else{t=e-rimDepth*(rows-i)/rim;v=t/e;}
  const lip=rim&&!inner?.014*(1-smooth(e-t,0,.07)):.014*smooth(v,.955,1);
  pos.push(...at(a,t,lift(a,t)-inner-lip,inner,taper(a,t)).toArray());
 }};
 for(let i=0;i<=rows;i++)ring(i,0);
 for(let k=0;k<=under;k++)ring(from+(1-from)*k/under,.032+.06*(1-smooth(k/under,0,.6)));
 for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const v=i*stride+j,n=v+stride;idx.push(v,n,v+1,v+1,n,n+1);}
 for(let k=0;k<under;k++)for(let j=0;j<cols;j++){const v=base+k*stride+j,n=v+stride;idx.push(v,v+1,n,v+1,n+1,n);}
 // The lip from the outer hem round to the inner one, wound like the outer surface so it faces out.
 for(let j=0;j<cols;j++){const v=rows*stride+j,n=base+under*stride+j;idx.push(v,n,v+1,v+1,n,n+1);}
 const raw=new THREE.BufferGeometry();raw.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));raw.setIndex(idx);
 const g=mergeVertices(raw,1e-6);raw.dispose();return g;
}
// A lock: a path of [a, t, e] (e above the hair's surface, as lift gives it) or of points. Its
// cross-section is domed on top and flatter underneath, with rounded sides; it grows out of a buried
// root and tapers to a tip (tipPow below 1 rounds the tip off). `up` fixes which way its thickness faces.
export function lock(points,{lift=()=>0,w=.14,h=.03,peak=.35,tipPow=.9,under=.55,up=null,segs=36,ring=16}={}){
 const pts=points.map(p=>p.isVector3?p:place(p[0],p[1],lift(p[0],p[1])+p[2]));
 const path=new THREE.CatmullRomCurve3(pts,false,'centripetal');
 const pos=[],idx=[],n=new THREE.Vector3(),B=new THREE.Vector3(),U=new THREE.Vector3();
 const sgn=(v,e)=>Math.sign(v)*Math.pow(Math.abs(v),e);
 for(let i=0;i<=segs;i++){
  const s=i/segs,p=path.getPointAt(s),T=path.getTangentAt(s);
  n.set(p.x/.2209,(p.y-.03)/.1806,(p.z+.03)/.164).normalize();
  if(up)U.copy(up);else U.copy(n);
  B.crossVectors(U,T).normalize();U.crossVectors(T,B).normalize();
  const grow=smooth(s,0,peak),width=w*(s<peak?.3+.7*grow:Math.pow(Math.max(0,(1-s)/(1-peak)),tipPow)),height=h*grow*(1-.7*smooth(s,peak,1));
  for(let k=0;k<ring;k++){const th=k/ring*Math.PI*2,c=Math.cos(th),sn=Math.sin(th);const across=width*sgn(c,.7),rise=sn>=0?height*Math.pow(sn,.55):-height*under*Math.pow(-sn,.7);pos.push(p.x+B.x*across+U.x*rise,p.y+B.y*across+U.y*rise,p.z+B.z*across+U.z*rise);}
 }
 for(let i=0;i<segs;i++)for(let k=0;k<ring;k++){const a=i*ring+k,b=i*ring+(k+1)%ring,c=a+ring,d=b+ring;idx.push(a,b,c,b,d,c);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);return g;
}
// A hairstyle as a group of named meshes sharing one material. A style's small curl, if any, is a
// mesh of its own named "<name>-curl", so that a hat can hide it.
export function hairGroup(name,parts,material){
 const group=new THREE.Group();group.name=name;
 for(const [part,geometry] of Object.entries(parts)){geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.name=name+'-'+part;mesh.castShadow=true;group.add(mesh);}
 return group;
}
