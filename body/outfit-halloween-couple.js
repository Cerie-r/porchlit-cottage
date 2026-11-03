// The Halloween couple set. Hers, a little witch: a fitted dress with a laced corset at the waist, a
// pointed collar and a bow, long sleeves opening into pointed bell cuffs, and a skirt cut into points
// at the hem over a petticoat that peeks out between them; striped stockings and pointed boots. His,
// a vampire: a fitted jacket over a waistcoat and a ruffled jabot, lace at the cuffs, and a long cape
// from the shoulders, lined, flaring out behind the arms, with a wide collar standing out under the
// head; trousers and buckled shoes. Built in the residents' body coordinates with
// body/outfit-tools.js, like body/outfits.js. Kept for the capsule machine's Halloween pool.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smoothstep,around,torsoAt,rowHeights,rings,mesh,armRings,profile,cloth,fold,slab,circleAround,trouserLeg,surfaceLine} from './outfit-tools.js';

const torso=(a,y)=>around(torsoAt(y),a);
const strip=g=>{for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal')g.deleteAttribute(k);return g;};
const satin=(name,color)=>new T.MeshPhysicalMaterial({name,color,roughness:.5,sheen:.7,sheenRoughness:.45,sheenColor:new T.Color('#fff4ea'),side:T.DoubleSide});
const shiny=(color,metalness=0,roughness=.32)=>new T.MeshStandardMaterial({name:'fixed',color,roughness,metalness,side:T.DoubleSide});
// A surface read across by u and down by v, point(u, v) for both from 0 to 1; seen from outside, u runs
// to the right and v down, so its faces look out. closed: u comes round to where it began.
function sheet(point,U,V,closed=false){
 const pos=[],uv=[],idx=[],per=U+1;
 for(let j=0;j<=V;j++)for(let i=0;i<=U;i++){const p=point(i/U,j/V);pos.push(p.x,p.y,p.z);uv.push(i/U,1-j/V);}
 for(let j=0;j<V;j++)for(let i=0;i<U;i++){const a=j*per+i,b=a+per;idx.push(a,b,a+1,a+1,b,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 if(closed){const n=g.attributes.normal,m=new T.Vector3();for(let j=0;j<=V;j++){const a=j*per,b=a+U;m.set(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,m.x,m.y,m.z);n.setXYZ(b,m.x,m.y,m.z);}}
 return g;
}
// The same surface moved by d along its own normals (a lining just inside it).
function offset(g,d){const c=g.clone(),p=c.attributes.position,n=c.attributes.normal;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*d,p.getY(i)+n.getY(i)*d,p.getZ(i)+n.getZ(i)*d);c.computeVertexNormals();return c;}
const onTorso=(radius,a,y,lift=0)=>{const R=radius(a,y)+lift;return new T.Vector3(Math.sin(a)*R,y,.10+Math.cos(a)*R);};
// A sawtooth round the angle: 0 at each of n points (the first straight ahead), 1 halfway between.
const teeth=(a,n)=>{const f=(((a*n/(Math.PI*2))%1)+1)%1;return 1-Math.abs(2*f-1);};
// Round a sleeve's end at the arm, from s0 along it out to send(theta), radius(t, theta) from 0 at s0
// to 1 at the end (made from armRings' frame, so it moves with the shoulder like the sleeve).
function armSheet(side,arm,s0,send,radius,U,V){
 const pos=[],idx=[],per=U+1;
 for(let j=0;j<=V;j++)for(let i=0;i<=U;i++){const a=i/U*Math.PI*2,t=j/V,p=arm.at(s0+(send(a)-s0)*t,a,radius(t,a));pos.push(p.x,p.y,p.z);}
 for(let j=0;j<V;j++)for(let i=0;i<U;i++){const a=j*per+i,b=a+per;side>0?idx.push(a,b,a+1,a+1,b,b+1):idx.push(a,a+1,b,a+1,b+1,b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
const legRadius=y=>.152+(.13-.152)*Math.min(1,Math.max(0,(.78-y)/.76));
// A long sleeve (the arm barely moves near the shoulder on the rig, so it is easy there, and roomier
// behind the armpit, where the arm swings forward inside it when they sit).
function sleeve(g,side,material,ends,widths=[[-.07,.1],[-.05,.132],[-.02,.152],[.05,.16],[.2,.15],[.32,.135],[.4,.126],[.46,.12]]){
 const behind=(a,s)=>.04*Math.max(0,-Math.cos(a))**1.5*(1-smoothstep((s-.02)/.22));
 const ss=[-.07,-.06,-.045,-.025,0,.04,.09,.14,.19,.24,.29,.33,.37,.40,.43,.46].filter(s=>s<=ends+1e-6);
 const arm=armRings(side,ss.map(s=>[s,a=>profile(widths,s)+behind(a,s)]),24);
 mesh(g,arm.geometry,material,'tailored-sleeve');
 return arm;
}

// ---- hers: the little witch ----
function witch(){
 const main=cloth('main','#5b3f7a',.88),accent=cloth('accent','#2a2430',.8),trim=cloth('trim','#e8823a',.82);
 const leather=shiny('#29242c',0,.45),sole=cloth('fixed','#1b171d',.9);
 const g=new T.Group();g.name='witch-dress';
 const WAIST=1.05,bodice=(a,y)=>torso(a,y)+.02;
 mesh(g,rings(rowHeights(1.40,WAIST-.02).map(y=>[y,bodice]),56),main,'witch-bodice',{cx:0,cz:.10});
 // the corset round the waist, laced up the front (above where her thighs come up when she sits)
 const corset=(a,y)=>bodice(a,y)+.009+.004*Math.sin(Math.PI*(1.195-y)/.16);
 mesh(g,rings([1.195,1.18,1.16,1.13,1.10,1.075,1.055,1.035].map(y=>[y,corset]),72),accent,'corset',{cx:0,cz:.10,gap:.027});
 const lace=[];for(let k=0;k<=8;k++)lace.push([(k%2?1:-1)*.075,1.175-k*.0165]);
 mesh(g,mergeGeometries([surfaceLine(corset,lace,.004,.0042,{segments:32}),...[-1,1].map(s=>surfaceLine(corset,[[s*.09,1.185],[s*.09,1.04]],.003,.0034,{segments:8}))].map(strip)),trim,'corset-lacing');
 // the skirt: gathered under the corset, flaring to a hem cut into points, LOW at their tips and HIGH
 // between them; each column is drawn down to its own hem, so the rows stay close at the hips and knees
 const LOW=.375,HIGH=.53,POINTS=8,hem=a=>LOW+(HIGH-LOW)*teeth(a,POINTS);
 const top=[.262,.307,.271],flare=[.41,.47,.43];
 const skirtR=(a,y)=>{const t=Math.max(0,(WAIST-y)/(WAIST-LOW));return around(top,a)+(around(flare,a)-around(top,a))*t**.8+.024*t**.9*fold(a,.6);};
 const rows=rowHeights(WAIST,LOW,.04);
 const skirt=sheet((u,v)=>{const a=u*Math.PI*2,y0=rows[Math.round(v*(rows.length-1))],y=WAIST-(WAIST-y0)*(WAIST-hem(a))/(WAIST-LOW);return onTorso(skirtR,a,y);},POINTS*10,rows.length-1,true);
 mesh(g,skirt,main,'witch-skirt-dress',{cx:0,cz:.10,gap:.034});
 const edge=[];for(let i=0;i<POINTS*10;i++){const a=i/(POINTS*10)*Math.PI*2;edge.push([a,hem(a)+.004]);}
 mesh(g,surfaceLine(skirtR,edge,.004,.0045,{closed:true,segments:POINTS*10}),trim,'skirt-edge-hem');
 // the petticoat under it, a ruffle at its hem showing between the points
 const PET=.43,petR=(a,y)=>skirtR(a,Math.max(y,PET+.03))-.014+.022*smoothstep((PET+.035-y)/.035)+.006*Math.sin(18*a)*smoothstep((PET+.02-y)/.02);
 mesh(g,rings(rowHeights(.72,PET,.04).map(y=>[y,petR]),72),trim,'petticoat-dress',{cx:0,cz:.10});
 // a pointed collar in two halves lying on the shoulders, piped, and a bow where they meet
 const neckY=a=>1.395-.05*Math.cos(a/2)**4,collarR=(a,y)=>bodice(a,y)+.006;
 const collar=side=>(u,v)=>{const a0=.08+(Math.PI-.08)*u,tip=(1-u)**3,a=side*(a0+.3*v*tip),y=neckY(a0)-v*(.07+.09*tip);return [a,y];};
 mesh(g,mergeGeometries([-1,1].map(side=>slab(collarR,collar(side),24,4,.004,.007))),accent,'witch-collar');
 mesh(g,mergeGeometries([-1,1].map(side=>{const path=[];for(let k=0;k<=24;k++)path.push(collar(side)(k/24,1));return strip(surfaceLine(collarR,path,.013,.0042,{segments:20}));})),trim,'collar-piping');
 const bow=[];for(const s of [-1,1]){const loop=new T.SphereGeometry(1,10,6);loop.scale(.05,.03,.014);loop.rotateZ(s*.35);loop.translate(s*.043,0,0);bow.push(strip(loop));const tail=new T.CapsuleGeometry(.01,.05,2,6);tail.rotateZ(s*.4);tail.translate(s*.02,-.04,-.002);bow.push(strip(tail));}
 bow.push(strip(new T.SphereGeometry(1,8,6).scale(.018,.02,.014)));
 const bowAt=onTorso(bodice,0,1.335,.03),bowGeometry=mergeGeometries(bow);bowGeometry.translate(bowAt.x,bowAt.y,bowAt.z);mesh(g,bowGeometry,trim,'neck-bow');
 // long sleeves opening into bell cuffs cut into points, piped at the edge (each half of a cuff follows
 // its own shoulder, so both are one mesh)
 const cuffs=[],rims=[];
 for(const side of [-1,1]){
  const arm=sleeve(g,side,main,.43);
  const end=a=>.555-.065*teeth(a,6),wide=(t,a)=>.127+.075*t**1.4;
  cuffs.push(armSheet(side,arm,.405,end,wide,36,5));
  const rim=[];for(let i=0;i<36;i++){const a=i/36*Math.PI*2;rim.push(arm.at(end(a),a,wide(1,a)+.003));}
  rims.push(strip(new T.TubeGeometry(new T.CatmullRomCurve3(rim,true,'centripetal'),36,.0045,4,true)));
 }
 mesh(g,mergeGeometries(cuffs),main,'bell-cuff');mesh(g,mergeGeometries(rims),trim,'bell-cuff-edge');
 // striped stockings: dark, with bands round the leg below the skirt
 for(const side of [-1,1]){
  const R=y=>legRadius(y)+.012,leg=trouserLeg(side,R,{ease:.016,top:1.0,bottom:.14,cols:24});
  mesh(g,leg.geometry,accent,'pant-leg-stitch',leg.axis);
  const {cx,cz}=leg.axis,bands=[];
  for(let y=.475;y>.27;y-=.046)bands.push(strip(rings([y+.0115,y,y-.0115].map(h=>[h,()=>R(h)+.0035]),20,{cx,cz})));
  mesh(g,mergeGeometries(bands),trim,'trouser-stripes',{cx,cz,leg:true,gap:.0215});
 }
 // pointed boots, their toes turned up a little, the tops turned down in points
 const point=geometry=>{const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const z=p.getZ(i);if(z<=0)continue;const k=1-.55*z*z;p.setXYZ(i,p.getX(i)*k,p.getY(i)*(1-.3*z*z)+.32*z**4,z*(1+.2*z*z));}geometry.computeVertexNormals();return geometry;};
 const soles=[],shafts=[],turns=[];
 for(const side of [-1,1]){
  const cx=side*.19,cz=.11;
  const s=mesh(g,point(new T.SphereGeometry(1,20,10)),leather,'shoe');s.position.set(side*.2,.09,.13);s.scale.set(.19,.13,.31);
  soles.push(strip(point(new T.SphereGeometry(1,20,6)).scale(.196,.042,.318).translate(side*.2,.034,.13)));
  shafts.push(strip(rings([.255,.23,.2,.17,.14,.12].map(y=>[y,()=>.151]),24,{cx,cz})));
  turns.push(strip(sheet((u,v)=>{const a=u*Math.PI*2,y=.272-v*(.03+.03*(1-teeth(a,5))),R=.158+.012*v;return new T.Vector3(cx+Math.sin(a)*R,y,cz+Math.cos(a)*R);},40,4,true)));
 }
 mesh(g,mergeGeometries(soles),sole,'sole');mesh(g,mergeGeometries(shafts),leather,'boot-shoe');mesh(g,mergeGeometries(turns),main,'boot-turnup-shoe');
 return g;
}

// ---- his: the vampire ----
function vampire(){
 const main=cloth('main','#211c24',.72),accent=satin('accent','#8f1d2c'),trim=cloth('trim','#f3eee6',.82);
 const lapel=satin('main','#211c24'),capeMain=satin('main','#211c24'),leather=shiny('#141115',0,.28),sole=cloth('fixed','#0e0c0f',.9),gold=shiny('#d6b25e',.6,.35),gem=shiny('#a1162b',.1,.18);
 const g=new T.Group();g.name='vampire';
 // the jacket, fitted, down to the hips; over it in front, the waistcoat from the jabot to the waist
 const jacket=(a,y)=>torso(a,Math.max(y,.72))+.022+.012*smoothstep((1.02-y)/.06);
 mesh(g,rings(rowHeights(1.40,.965).map(y=>[y,jacket]),64),main,'vampire-jacket',{cx:0,cz:.10});
 const vest=(u,v)=>{const y=1.39-v*(1.39-.975),half=.16+.36*smoothstep(v/.75);return [(2*u-1)*half,y];};
 mesh(g,slab(jacket,vest,16,14,.003,.006),accent,'waistcoat');
 mesh(g,mergeGeometries([-1,1].map(side=>slab(jacket,(u,v)=>{const y=1.39-u*(1.39-.99),half=.16+.36*smoothstep(u/.75);return [side*(half+v*(.13-.05*u)),y];},14,3,.004,.008))),lapel,'lapel');
 mesh(g,mergeGeometries([1.17,1.1,1.03].map(y=>{const at=onTorso(jacket,0,y,.012);return strip(new T.SphereGeometry(.014,8,5).scale(1,1,.5).translate(at.x,at.y,at.z));})),gold,'buttons');
 // the jabot: ruffles falling down the front under the chin, and a brooch at its top
 const ruffles=[];
 for(let k=0;k<3;k++){const y0=1.392-k*.045,w=.36-.05*k,h=.068;
  ruffles.push(strip(sheet((u,v)=>{const x=2*u-1,a=x*w,y=y0-v*h*(1-.3*x*x),lift=.008+v*(.026+.014*Math.sin(Math.PI*2*4.5*u+k));return onTorso(jacket,a,y,lift+.006*(2-k)*(1-x*x));},24,5)));}
 mesh(g,mergeGeometries(ruffles),trim,'jabot');
 const brooch=onTorso(jacket,0,1.375,.04);
 mesh(g,new T.TorusGeometry(.024,.006,5,16).translate(brooch.x,brooch.y,brooch.z),gold,'brooch-setting');
 const stone=mesh(g,new T.SphereGeometry(.021,12,8),gem,'brooch-stone');stone.position.copy(brooch);stone.scale.z=.6;
 // long sleeves, and lace falling from the cuffs
 mesh(g,mergeGeometries([-1,1].map(side=>{const arm=sleeve(g,side,main,.46,[[-.07,.1],[-.05,.132],[-.02,.152],[.05,.16],[.2,.15],[.32,.136],[.4,.128],[.46,.122]]);
  return armSheet(side,arm,.445,()=>.535,(t,a)=>.116+.05*t**1.3+.008*Math.sin(12*a)*t,36,5);})),trim,'lace-cuff');
 // trousers and buckled shoes
 const soles=[],buckles=[];
 for(const side of [-1,1]){
  const leg=trouserLeg(side,y=>legRadius(y)+.03,{ease:.028,cols:24});mesh(g,leg.geometry,main,'pant-leg-stitch',leg.axis);
  const s=mesh(g,new T.SphereGeometry(1,20,10),leather,'shoe');s.position.set(side*.2,.09,.13);s.scale.set(.2,.138,.3);
  soles.push(strip(new T.SphereGeometry(1,20,6).scale(.205,.044,.306).translate(side*.2,.034,.13)));
  buckles.push(strip(new T.TorusGeometry(.04,.009,6,4).rotateZ(Math.PI/4).scale(1.15,.8,1).rotateX(-1.0).translate(side*.2,.185,.255)));
 }
 mesh(g,mergeGeometries(soles),sole,'sole');mesh(g,mergeGeometries(buckles),gold,'shoe-buckles');
 // the cape: from the shoulders, over the round tops of the sleeves, down behind the arms and flaring out
 // there, then round to the sides lower down, below the hands, its hem cut into points like a bat's
 // wing; lined. Its name lets it bend with the legs below the hips, as a coat does.
 const caps=[-1,1].map(s=>new T.Vector3(s*.2,1.3,.06)),CAP=.2,from=new T.Vector3(),dir=new T.Vector3();
 const overCaps=(a,y)=>{let out=0;from.set(0,y,.10);dir.set(Math.sin(a),0,Math.cos(a));for(const c of caps){const o=from.clone().sub(c),b=o.dot(dir),q=o.lengthSq()-CAP*CAP,d=b*b-q;if(d>0)out=Math.max(out,-b+Math.sqrt(d));}return out;};
 const capeR=(a,y)=>Math.max(torso(a,Math.max(y,.72))+.05+.38*smoothstep((1.3-y)/.5)*Math.sin(a)**2+.06*smoothstep((1.1-y)/.6)+.1*smoothstep((1.05-y)/.65)*Math.max(0,-Math.cos(a))+.03*fold(a*1.3,.3)*smoothstep((1.2-y)/.7),overCaps(a,y)+.016);
 const edge=y=>profile([[.40,1.28],[.78,1.42],[1.0,2.15],[1.16,2.3],[1.3,1.95],[1.41,1.62]],y);
 const HEM=.40,capeHem=u=>HEM+.085*teeth(u*Math.PI*2,6),capeRows=rowHeights(1.41,HEM,.045);
 const cape=sheet((u,v)=>{const y0=capeRows[Math.round(v*(capeRows.length-1))],y=1.41-(1.41-y0)*(1.41-capeHem(u))/(1.41-HEM),e=edge(y),a=e+(Math.PI*2-2*e)*u;return onTorso(capeR,a,y);},42,capeRows.length-1);
 mesh(g,cape,capeMain,'cape-hem',{cx:0,cz:.10,gap:.05});
 mesh(g,offset(cape,-.006),accent,'cape-lining-hem',{cx:0,cz:.10,gap:.044});
 // the collar, standing out from the cape's top round the back under the head, over to two points
 const span=1.62,head=new T.Vector3(0,2.376,-.034),radii=new T.Vector3(1.1554*1.03,.9808*1.03,.9136*1.03);
 const inHead=p=>((p.x-head.x)/radii.x)**2+((p.y-head.y)/radii.y)**2+((p.z-head.z)/radii.z)**2<1;
 const collar=sheet((u,v)=>{const a=Math.PI-span+2*span*u,ends=Math.max(0,Math.abs(2*u-1)-.55)/.45,R0=capeR(a,1.41),y=1.41+(.2+.12*ends**1.5)*v**1.5;
  let R=R0+(.62+.16*ends**1.5-R0)*v,p=onTorso(()=>R,a,y);
  // never inside the head
  for(let k=0;k<80&&inHead(p);k++){R+=.01;p=onTorso(()=>R,a,y);}
  return p;},36,6);
 mesh(g,collar,main,'cape-collar');
 mesh(g,offset(collar,.006),accent,'cape-collar-lining');
 return g;
}

const ways=colors=>colors.map(([id,name,main,accent,trim])=>({id,name,colors:{main,accent,trim}}));
export const halloweenCouple=[
 {id:'witch-dress',name:'小魔女',wearers:['girl'],pool:'halloween',build:witch,
  colorways:ways([['violet','紫夜','#5b3f7a','#2a2430','#e8823a'],['ink','墨黑','#2b2630','#5b3f7a','#e8823a'],['candy','糖果','#c7a6e0','#4a3a5c','#f4a76b']]),
  drawing:'<svg viewBox="0 0 120 120"><path d="M42 62h36l14 34-8-6-6 8-6-8-6 8-6-8-6 8-6-8-6 8-6-8-8 6z" fill="#e8823a"/><path d="m45 16-17 12-10 30 13 6 10-22v14h38V42l10 22 13-6-10-30-17-12-15 6z" fill="#5b3f7a"/><path d="M41 56h38l14 34-9-5-7 9-6-9-7 9-6-9-6 9-7-9-6 9-7-9-9 5z" fill="#5b3f7a"/><path d="M41 46h38v10H41z" fill="#2a2430"/><path d="m46 16 14 14 14-14-6 18-8-4-8 4z" fill="#2a2430"/><path d="M48 100h7v14h-7zm17 0h7v14h-7z" fill="#2a2430"/><path d="M48 104h7m-7 5h7m10-5h7m-7 5h7" stroke="#e8823a" stroke-width="2"/></svg>'},
 {id:'vampire',name:'吸血鬼',wearers:['boy'],pool:'halloween',build:vampire,
  colorways:ways([['classic','经典','#211c24','#8f1d2c','#f3eee6'],['midnight','午夜','#1e2236','#4d2a68','#ebe6f2'],['wine','酒红','#3d1520','#1d191e','#f1e7da']]),
  drawing:'<svg viewBox="0 0 120 120"><path d="M30 20 6 104h108L90 20 60 30z" fill="#8f1d2c"/><path d="M30 20 6 104h12L36 30zm60 0 24 84h-12L84 30z" fill="#211c24"/><path d="m44 16-16 12-8 30 12 5 9-20-3 50h44l-3-50 9 20 12-5-8-30-16-12-16 6z" fill="#211c24"/><path d="m52 22 8 46 8-46-8 4z" fill="#8f1d2c"/><path d="M54 24h12l-6 16z" fill="#f3eee6"/><path d="M48 93h10v18H48zm14 0h10v18H62z" fill="#211c24"/><path d="M18 26 30 20l-2 14zm84 0-12-6 2 14z" fill="#211c24"/></svg>'}
];
