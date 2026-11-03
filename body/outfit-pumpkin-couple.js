// The pumpkin couple set: this year's Halloween gift, a simple pair every home has (gift: true, from
// outOn; see body/drawn.js). Hers: a fitted top and a skirt as round as a pumpkin, swelling out below
// the waist and drawn in again at the hem, in ten lobes, with a jack-o'-lantern face on the front, a
// collar of pointed leaves round the neck, a leafy waistband, long sleeves with leaf-green cuffs,
// dark tights and round shoes. His: a roomy round top the same, lobed, face on the front, leafy collar
// and hem band, over dark trousers. Built in the residents' body coordinates with
// body/outfit-tools.js, like body/outfits.js.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smoothstep,around,torsoAt,rowHeights,rings,mesh,armRings,profile,cloth,slab,trouserLeg} from './outfit-tools.js';

const torso=(a,y)=>around(torsoAt(y),a);
const strip=g=>{for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal')g.deleteAttribute(k);return g;};
const legRadius=y=>.152+(.13-.152)*Math.min(1,Math.max(0,(.78-y)/.76));
// A pumpkin's lobes: 1 in the middle of each of ten, less by k in the crease between two.
const lobes=(a,k)=>1-k*(1-Math.abs(Math.sin(5*a)))**3;
// A sawtooth round the angle: 0 at each of n points (the first straight ahead), 1 halfway between.
const teeth=(a,n)=>{const f=(((a*n/(Math.PI*2))%1)+1)%1;return 1-Math.abs(2*f-1);};
// A ring read round by u and down by v, point(u, v), its faces looking out, closed where u comes round.
function band(point,U,V){
 const pos=[],idx=[],per=U+1;
 for(let j=0;j<=V;j++)for(let i=0;i<=U;i++){const p=point(i/U,j/V);pos.push(p.x,p.y,p.z);}
 for(let j=0;j<V;j++)for(let i=0;i<U;i++){const a=j*per+i,b=a+per;idx.push(a,b,a+1,a+1,b,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
 const n=g.attributes.normal,m=new T.Vector3();for(let j=0;j<=V;j++){const a=j*per,b=a+U;m.set(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,m.x,m.y,m.z);n.setXYZ(b,m.x,m.y,m.z);}
 return g;
}
const onTorso=(radius,a,y,lift=0)=>{const R=radius(a,y)+lift;return new T.Vector3(Math.sin(a)*R,y,.10+Math.cos(a)*R);};
// A collar of eight pointed leaves lying on the shoulders round the neck, over a garment's surface.
function leafCollar(radius){
 return band((u,v)=>{const a=u*Math.PI*2,low=.05+.06*(1-teeth(a+Math.PI/8,8))**1.6,y=1.398-v*low;return onTorso(radius,a,y,.008+.012*v);},128,5);
}
// A jack-o'-lantern face on a garment's front, its middle at height y: two eyes pointing up, a
// little nose and a grin with three teeth.
function lanternFace(radius,y,size=1){
 const eye=s=>(u,v)=>[s*.2*size+(u-.5)*.17*size*(1-v),y+.03*size+v*.08*size];
 const nose=(u,v)=>[(u-.5)*.07*size*(1-v),y-.02*size+v*.04*size];
 const grin=(u,v)=>{const x=2*u-1,low=y-.105*size-.04*size*(1-x*x),high=y-.07*size-.03*size*(1-x*x)-.024*size*Math.max(0,Math.cos(3*Math.PI*x))**4;return [x*.3*size,low+v*(high-low)];};
 return mergeGeometries([slab(radius,eye(-1),6,6,.004,.004),slab(radius,eye(1),6,6,.004,.004),slab(radius,nose,4,3,.004,.004),slab(radius,grin,24,3,.004,.004)]);
}
// A long sleeve with a leaf-green cuff (easy near the shoulder and roomier behind the armpit, as
// the other sets have).
function sleeves(g,main,accent,widths){
 const behind=(a,s)=>.04*Math.max(0,-Math.cos(a))**1.5*(1-smoothstep((s-.02)/.22)),cuffs=[];
 for(const side of [-1,1]){
  const ss=[-.07,-.06,-.045,-.025,0,.04,.09,.14,.19,.24,.29,.33,.37,.40,.43,.46];
  mesh(g,armRings(side,ss.map(s=>[s,a=>profile(widths,s)+behind(a,s)]),24).geometry,main,'tailored-sleeve');
  cuffs.push(armRings(side,[[.44,.124],[.452,.132],[.49,.131],[.502,.124]],32).geometry);
 }
 mesh(g,mergeGeometries(cuffs),accent,'turned-cuff');
}
function shoes(g,leather,sole){
 const soles=[];
 for(const side of [-1,1]){
  const s=mesh(g,new T.SphereGeometry(1,20,10),leather,'shoe');s.position.set(side*.2,.088,.125);s.scale.set(.19,.13,.29);
  soles.push(strip(new T.SphereGeometry(1,20,6).scale(.194,.04,.296).translate(side*.2,.032,.125)));
 }
 mesh(g,mergeGeometries(soles),sole,'sole');
}

// ---- hers ----
function dress(){
 const main=cloth('main','#e8823a',.85),accent=cloth('accent','#5f8a4a',.8),trim=cloth('trim','#2a2430',.8);
 const leather=new T.MeshStandardMaterial({name:'fixed',color:'#2b2427',roughness:.45,side:T.DoubleSide}),sole=cloth('fixed','#1a1618',.9);
 const g=new T.Group();g.name='pumpkin-dress';
 const WAIST=1.045,HEM=.44,bodice=(a,y)=>torso(a,y)+.02;
 mesh(g,rings(rowHeights(1.40,WAIST-.04).map(y=>[y,bodice]),56),main,'pumpkin-bodice',{cx:0,cz:.10});
 // the skirt: out to its widest a little past halfway down, in again at the hem, in ten lobes
 const top=[.27,.315,.279],wide=[.45,.505,.46],hem=[.37,.42,.38];
 const skirtR=(a,y)=>{const t=Math.min(1,Math.max(0,(WAIST-y)/(WAIST-HEM))),w=around(wide,a);
  const r=t<.55?around(top,a)+(w-around(top,a))*Math.sin(Math.PI/2*t/.55)**.8:w+(around(hem,a)-w)*smoothstep((t-.55)/.45);
  return r*lobes(a,.07*Math.sin(Math.PI*t)**.7);};
 mesh(g,rings(rowHeights(WAIST,HEM).map(y=>[y,skirtR]),100),main,'pumpkin-skirt-dress',{cx:0,cz:.10,gap:.03});
 // its face moves with it when she sits, as the skirt does
 mesh(g,lanternFace(skirtR,.75,1.25),trim,'lantern-face-dress');
 // a leafy waistband over where the skirt is gathered (above where her thighs come up when she sits)
 const waist=(a,y)=>around(top,a)+.014+.004*Math.sin(Math.PI*(y-1.035)/.065);
 mesh(g,rings([1.10,1.09,1.075,1.06,1.045,1.035].map(y=>[y,waist]),72),accent,'leaf-waistband',{cx:0,cz:.10,gap:.03});
 mesh(g,leafCollar(bodice),accent,'leaf-collar');
 sleeves(g,main,accent,[[-.07,.1],[-.05,.132],[-.02,.152],[.05,.16],[.2,.15],[.32,.135],[.4,.126],[.46,.12]]);
 for(const side of [-1,1]){const leg=trouserLeg(side,y=>legRadius(y)+.012,{ease:.016,top:1.0,bottom:.14,cols:24});mesh(g,leg.geometry,trim,'pant-leg-stitch',leg.axis);}
 shoes(g,leather,sole);
 return g;
}

// ---- his ----
function top(){
 const main=cloth('main','#e8823a',.85),accent=cloth('accent','#5f8a4a',.8),trim=cloth('trim','#2a2430',.85);
 const leather=new T.MeshStandardMaterial({name:'fixed',color:'#2b2427',roughness:.45,side:T.DoubleSide}),sole=cloth('fixed','#1a1618',.9);
 const g=new T.Group();g.name='pumpkin-top';
 // roomy and round, widest over the middle and drawn in at the hem over the hips, in ten lobes; its
 // name lets it bend there with the legs, as the hoodie does
 const HEM=.88,swell=y=>Math.sin(Math.PI*Math.min(1,Math.max(0,(1.37-y)/(1.37-.86))))**.8;
 const body=(a,y)=>(torso(a,Math.max(y,.72))+.03+.055*swell(y))*lobes(a,.06*swell(y));
 mesh(g,rings(rowHeights(1.40,HEM).map(y=>[y,body]),100),main,'pumpkin-top-stitch',{cx:0,cz:.10});
 mesh(g,lanternFace(body,1.13,1.05),trim,'lantern-face');
 // a leaf-green band round the hem
 const hemR=(a,y)=>body(a,HEM)+.006+.004*Math.sin(Math.PI*(HEM+.04-y)/.05);
 mesh(g,rings([HEM+.04,HEM+.03,HEM+.015,HEM,HEM-.01].map(y=>[y,hemR]),72),accent,'leaf-band-hem',{cx:0,cz:.10,gap:.03});
 mesh(g,leafCollar((a,y)=>torso(a,y)+.03),accent,'leaf-collar');
 sleeves(g,main,accent,[[-.07,.1],[-.05,.134],[-.02,.156],[.05,.166],[.2,.156],[.32,.14],[.4,.13],[.46,.124]]);
 for(const side of [-1,1]){const leg=trouserLeg(side,y=>legRadius(y)+.03,{ease:.03,cols:24});mesh(g,leg.geometry,trim,'pant-leg-stitch',leg.axis);}
 shoes(g,leather,sole);
 return g;
}

const colorways=[{id:'orange',name:'南瓜橙',colors:{main:'#e8823a',accent:'#5f8a4a',trim:'#2a2430'}},{id:'white',name:'白南瓜',colors:{main:'#efe6d2',accent:'#7a9a5a',trim:'#3a3436'}},{id:'purple',name:'紫南瓜',colors:{main:'#8e6bb0',accent:'#5f8a4a',trim:'#2a2430'}}];
export const pumpkinCouple=[
 {id:'pumpkin-dress',name:'南瓜裙',wearers:['girl'],gift:true,outOn:'2026-10-25',build:dress,colorways,
  drawing:'<svg viewBox="0 0 120 120"><path d="m45 16-17 12-10 30 13 6 10-22v12h38V42l10 22 13-6-10-30-17-12-15 6z" fill="#e8823a"/><path d="M40 54h40q22 16 14 38-6 12-34 12T26 92q-8-22 14-38z" fill="#e8823a"/><path d="M48 56q-6 22 2 46M72 56q6 22-2 46M60 56v48" stroke="#c96a28" stroke-width="2" fill="none"/><path d="M40 50h40v7H40z" fill="#5f8a4a"/><path d="m44 16 8 10 8-8 8 8 8-10-2 12H46z" fill="#5f8a4a"/><path d="m46 78 6-9 6 9zm16 0 6-9 6 9zm-14 8q12 8 24 0l-4 6-4-4-4 4-4-4-4 4z" fill="#2a2430"/><path d="M48 104h8v10h-8zm16 0h8v10h-8z" fill="#2a2430"/></svg>'},
 {id:'pumpkin-top',name:'南瓜卫衣',wearers:['boy'],gift:true,outOn:'2026-10-25',build:top,colorways,
  drawing:'<svg viewBox="0 0 120 120"><path d="M42 84h36l3 26H64l-4-16-4 16H39z" fill="#2a2430"/><path d="m44 16-18 13-10 30 14 6 9-20q-8 22 2 37h38q10-15 2-37l9 20 14-6-10-30-18-13-16 6z" fill="#e8823a"/><path d="M50 22q-8 30 0 60M70 22q8 30 0 60" stroke="#c96a28" stroke-width="2" fill="none"/><path d="M42 82h36v6H42z" fill="#5f8a4a"/><path d="m44 16 8 10 8-8 8 8 8-10-2 12H46z" fill="#5f8a4a"/><path d="m46 50 6-9 6 9zm16 0 6-9 6 9zm-14 9q12 8 24 0l-4 6-4-4-4 4-4-4-4 4z" fill="#2a2430"/></svg>'}
];
