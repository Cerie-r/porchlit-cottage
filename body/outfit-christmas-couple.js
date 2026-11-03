// The Christmas couple set, in velvet trimmed with white fur. Hers: a fitted dress with a fur collar
// tied with two pompoms, a belt with a gold buckle, fur cuffs on long sleeves and a full skirt with a
// deep fur hem; striped tights and boots with fur tops. His: a jacket down over the hips with fur down
// its front, round its hem, at the collar and the cuffs, a belt with a gold buckle, trousers tucked
// into boots with fur tops. Built in the residents' body coordinates with body/outfit-tools.js, like
// body/outfits.js. Kept for the capsule machine's Christmas pool.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smoothstep,around,torsoAt,rowHeights,rings,mesh,armRings,profile,cloth,fold,trouserLeg} from './outfit-tools.js';

const torso=(a,y)=>around(torsoAt(y),a);
const strip=g=>{for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal')g.deleteAttribute(k);return g;};
const velvet=(name,color)=>new T.MeshPhysicalMaterial({name,color,roughness:.75,sheen:.8,sheenRoughness:.35,sheenColor:new T.Color('#ffe2dc'),side:T.DoubleSide});
const gold=()=>new T.MeshStandardMaterial({name:'fixed',color:'#d8b45c',roughness:.35,metalness:.6,side:T.DoubleSide});
const onTorso=(radius,a,y,lift=0)=>{const R=radius(a,y)+lift;return new T.Vector3(Math.sin(a)*R,y,.10+Math.cos(a)*R);};
const legRadius=y=>.152+(.13-.152)*Math.min(1,Math.max(0,(.78-y)/.76));
// Fur: a soft roughness over it, the same every time.
const fluff=(a,y)=>.0045*(Math.sin(31*a+40*y)+.6*Math.sin(17*a-53*y+1.3)+.4*Math.sin(47*a+23*y+2.1));
// How far fur stands out across its width (t from one edge, 0, to the other, 1): a rounded section.
const plump=t=>Math.sin(Math.PI*Math.min(1,Math.max(0,t)))**.6;
// A band of fur round an axis, from top down to bottom, standing out from a garment's surface
// base(theta, y) by up to thick.
function furBand(base,top,bottom,thick,cols,axis){
 const rows=[];for(let j=0;j<=8;j++){const t=j/8,y=top-(top-bottom)*t;rows.push([y,a=>base(a,y)+.003+thick*plump(t)+fluff(a,y)*plump(t)]);}
 return rings(rows,cols,axis);
}
// A fur cuff round the end of a sleeve, from s0 to s1 along the arm, over a sleeve of radius r.
function furCuff(side,s0,s1,r,thick){
 const rows=[];for(let j=0;j<=6;j++){const t=j/6,s=s0+(s1-s0)*t;rows.push([s,a=>r+.004+thick*plump(t)+fluff(a,s*3)*plump(t)]);}
 return armRings(side,rows,40).geometry;
}
// A long sleeve, easy near the shoulder and roomier behind the armpit, as the other sets have.
function sleeve(g,side,material,widths){
 const behind=(a,s)=>.04*Math.max(0,-Math.cos(a))**1.5*(1-smoothstep((s-.02)/.22));
 const ss=[-.07,-.06,-.045,-.025,0,.04,.09,.14,.19,.24,.29,.33,.37,.40,.43,.46];
 mesh(g,armRings(side,ss.map(s=>[s,a=>profile(widths,s)+behind(a,s)]),24).geometry,material,'tailored-sleeve');
}
// A belt round the waist (above where the thighs come up when they sit) with a gold buckle in front.
function belt(g,radius,y0,material,buckleMaterial){
 const R=(a,y)=>radius(a,y)+.012+.003*Math.sin(Math.PI*(y0+.025-y)/.05);
 mesh(g,rings([y0+.025,y0+.013,y0,y0-.013,y0-.025].map(y=>[y,R]),72),material,'belt',{cx:0,cz:.10,gap:.03});
 const at=onTorso(R,0,y0,.006);
 mesh(g,new T.TorusGeometry(.04,.0085,5,4).rotateZ(Math.PI/4).scale(1.25,1,1).translate(at.x,at.y,at.z),buckleMaterial,'belt-buckle');
}
// Boots with a round toe and a band of fur round the top.
function boots(g,leather,sole,fur,top){
 const soles=[],shafts=[],furs=[];
 for(const side of [-1,1]){
  const cx=side*.19,cz=.11;
  const s=mesh(g,new T.SphereGeometry(1,20,10),leather,'shoe');s.position.set(side*.2,.09,.13);s.scale.set(.195,.135,.3);
  soles.push(strip(new T.SphereGeometry(1,20,6).scale(.2,.044,.306).translate(side*.2,.034,.13)));
  const ys=[];for(let y=top;y>.125;y-=.035)ys.push(y);ys.push(.12);
  shafts.push(strip(rings(ys.map(y=>[y,()=>.153+.006*smoothstep((y-.16)/(top-.16))]),24,{cx,cz})));
  furs.push(strip(furBand(()=>.159,top+.035,top-.03,.026,40,{cx,cz})));
 }
 mesh(g,mergeGeometries(soles),sole,'sole');mesh(g,mergeGeometries(shafts),leather,'boot-shoe');mesh(g,mergeGeometries(furs),fur,'boot-fur-shoe');
}

// ---- hers ----
function dress(){
 const main=velvet('main','#c0283a'),accent=cloth('accent','#fbf6f0',1),trim=cloth('trim','#2b2326',.6);
 const leather=new T.MeshStandardMaterial({name:'fixed',color:'#221d20',roughness:.4,side:T.DoubleSide}),sole=cloth('fixed','#161315',.9),buckle=gold();
 const g=new T.Group();g.name='christmas-dress';
 const WAIST=1.06,HEM=.42,bodice=(a,y)=>torso(a,y)+.02;
 // the bodice and the full skirt, one piece of velvet; the skirt starts under the belt
 const top=[.272,.317,.281],flare=[.43,.49,.45];
 const skirtR=(a,y)=>{const t=Math.max(0,(WAIST-y)/(WAIST-HEM));return around(top,a)+(around(flare,a)-around(top,a))*t**.75+.026*t**.9*fold(a,1.1);};
 const dressR=(a,y)=>{if(y>=WAIST+.03)return bodice(a,y);if(y<=WAIST)return skirtR(a,y);const t=smoothstep((WAIST+.03-y)/.03);return bodice(a,y)*(1-t)+skirtR(a,y)*t;};
 mesh(g,rings(rowHeights(1.40,HEM).map(y=>[y,dressR]),80),main,'velvet-dress',{cx:0,cz:.10});
 // the deep fur hem
 mesh(g,furBand((a,y)=>skirtR(a,Math.max(y,HEM)),HEM+.07,HEM-.018,.034,112,{cx:0,cz:.10,gap:.04}),accent,'fur-hem');
 belt(g,bodice,WAIST+.03,trim,buckle);
 // the fur collar round the shoulders, two pompoms on cords tied at its front, and two fur buttons
 mesh(g,furBand((a,y)=>bodice(a,y)+.008,1.405,1.325,.034,72,{cx:0,cz:.10,gap:.026}),accent,'fur-collar');
 const ties=[];
 for(const k of [-1,1]){const from=onTorso(bodice,k*.12,1.34,.045),to=onTorso(bodice,k*.16,1.25,.03);
  ties.push(strip(new T.TubeGeometry(new T.CatmullRomCurve3([from,from.clone().lerp(to,.5).add(new T.Vector3(0,0,.012)),to]),8,.006,5,false)));
  ties.push(strip(new T.SphereGeometry(.03,12,8).translate(to.x,to.y-.02,to.z+.008)));}
 for(const y of [1.2,1.13]){const at=onTorso(bodice,0,y,.012);ties.push(strip(new T.SphereGeometry(.02,10,6).scale(1,1,.7).translate(at.x,at.y,at.z)));}
 mesh(g,mergeGeometries(ties),accent,'pompoms');
 // long sleeves with fur cuffs (each half of the cuffs follows its own shoulder, so both are one mesh)
 const widths=[[-.07,.1],[-.05,.132],[-.02,.152],[.05,.162],[.2,.152],[.32,.136],[.4,.126],[.46,.12]];
 for(const side of [-1,1])sleeve(g,side,main,widths);
 mesh(g,mergeGeometries([-1,1].map(side=>furCuff(side,.425,.5,.122,.03))),accent,'fur-cuff');
 // tights striped round the leg below the skirt, and boots
 for(const side of [-1,1]){
  const R=y=>legRadius(y)+.01,leg=trouserLeg(side,R,{ease:.016,top:1.0,bottom:.14,cols:24});
  mesh(g,leg.geometry,accent,'pant-leg-stitch',leg.axis);
  const {cx,cz}=leg.axis,bands=[];
  for(let y=.47;y>.3;y-=.04)bands.push(strip(rings([y+.01,y,y-.01].map(h=>[h,()=>R(h)+.0035]),20,{cx,cz})));
  mesh(g,mergeGeometries(bands),main,'trouser-stripes',{cx,cz,leg:true,gap:.0215});
 }
 boots(g,leather,sole,accent,.27);
 return g;
}

// ---- his ----
function suit(){
 const main=velvet('main','#c0283a'),accent=cloth('accent','#fbf6f0',1),trim=cloth('trim','#2b2326',.6);
 const leather=new T.MeshStandardMaterial({name:'fixed',color:'#221d20',roughness:.4,side:T.DoubleSide}),sole=cloth('fixed','#161315',.9),buckle=gold();
 const g=new T.Group();g.name='christmas-suit';
 // the jacket, roomy, down over the hips; its name lets it bend there with the legs, as the hoodie does
 const HEM=.87,jacket=(a,y)=>torso(a,Math.max(y,.72))+.03+.02*smoothstep((1.02-y)/.12);
 mesh(g,rings(rowHeights(1.40,HEM).map(y=>[y,jacket]),72),main,'velvet-jacket-stitch',{cx:0,cz:.10});
 // fur round the hem, and down the front above and below the belt
 mesh(g,furBand((a,y)=>jacket(a,Math.max(y,HEM)),HEM+.065,HEM-.016,.032,104,{cx:0,cz:.10,gap:.04}),accent,'fur-hem');
 const BELT=1.065,W=.13,U=10,strips=[];
 for(const [from,to] of [[1.39,BELT+.03],[BELT-.03,HEM+.05]]){
  const ys=rowHeights(from,to,.03),pos=[],idx=[],placket=new T.BufferGeometry();
  ys.forEach(y=>{for(let i=0;i<=U;i++){const u=i/U,a=(2*u-1)*W,end=Math.min(1,(from-y)/.012,(y-to)/.012);const p=onTorso(jacket,a,y,.004+(.03*plump(u)+fluff(a,y)*plump(u))*Math.max(.35,end));pos.push(p.x,p.y,p.z);}});
  for(let j=0;j<ys.length-1;j++)for(let i=0;i<U;i++){const a=j*(U+1)+i,b=a+U+1;idx.push(a,b,a+1,a+1,b,b+1);}
  placket.setAttribute('position',new T.Float32BufferAttribute(pos,3));placket.setIndex(idx);placket.computeVertexNormals();strips.push(placket);
 }
 mesh(g,mergeGeometries(strips),accent,'fur-placket-hem');
 belt(g,jacket,BELT,trim,buckle);
 mesh(g,furBand((a,y)=>jacket(a,y)+.006,1.405,1.325,.036,72,{cx:0,cz:.10,gap:.034}),accent,'fur-collar');
 const widths=[[-.07,.1],[-.05,.134],[-.02,.156],[.05,.166],[.2,.156],[.32,.14],[.4,.13],[.46,.124]];
 for(const side of [-1,1])sleeve(g,side,main,widths);
 mesh(g,mergeGeometries([-1,1].map(side=>furCuff(side,.42,.5,.126,.032))),accent,'fur-cuff');
 // trousers tucked into the boots
 for(const side of [-1,1]){const leg=trouserLeg(side,y=>legRadius(y)+.034-.022*smoothstep((.4-y)/.1),{ease:.03,bottom:.26,cols:24});mesh(g,leg.geometry,main,'pant-leg-stitch',leg.axis);}
 boots(g,leather,sole,accent,.31);
 return g;
}

const ways=colors=>colors.map(([id,name,main,accent,trim])=>({id,name,colors:{main,accent,trim}}));
const colorways=ways([['red','圣诞红','#c0283a','#fbf6f0','#2b2326'],['holly','冬青','#2f6b4a','#fbf6f0','#8f1d2c'],['berry','莓果','#e38aa0','#fbf6f0','#7a3348']]);
export const christmasCouple=[
 {id:'christmas-dress',name:'圣诞裙',wearers:['girl'],pool:'christmas',build:dress,colorways,
  drawing:'<svg viewBox="0 0 120 120"><path d="m45 16-17 12-10 30 13 6 10-22v18h38V42l10 22 13-6-10-30-17-12-15 6z" fill="#c0283a"/><path d="M41 58h38l18 34H23z" fill="#c0283a"/><path d="M21 90q39 10 78 0v12q-39 10-78 0z" fill="#fbf6f0"/><path d="M40 52h40v8H40z" fill="#2b2326"/><rect x="55" y="51" width="10" height="10" rx="2" fill="none" stroke="#d8b45c" stroke-width="3"/><path d="M42 16q18 10 36 0l2 6q-20 12-40 0z" fill="#fbf6f0"/><circle cx="52" cy="34" r="4" fill="#fbf6f0"/><circle cx="68" cy="34" r="4" fill="#fbf6f0"/><path d="M14 54l13 6m79-6-13 6" stroke="#fbf6f0" stroke-width="6" stroke-linecap="round"/></svg>'},
 {id:'christmas-suit',name:'圣诞服',wearers:['boy'],pool:'christmas',build:suit,colorways,
  drawing:'<svg viewBox="0 0 120 120"><path d="M42 80h36l3 24H64l-4-14-4 14H39z" fill="#c0283a"/><path d="M38 102h18v10H38zm26 0h18v10H64z" fill="#221d20"/><path d="m44 16-18 13-10 30 14 6 11-22v40h38V43l11 22 14-6-10-30-18-13-16 6z" fill="#c0283a"/><path d="M40 78h40v8H40z" fill="#fbf6f0"/><path d="M55 20h10v58H55z" fill="#fbf6f0"/><path d="M40 52h40v8H40z" fill="#2b2326"/><rect x="54" y="51" width="12" height="10" rx="2" fill="none" stroke="#d8b45c" stroke-width="3"/><path d="M42 16q18 10 36 0l2 6q-20 12-40 0z" fill="#fbf6f0"/><path d="M14 54l13 6m79-6-13 6" stroke="#fbf6f0" stroke-width="6" stroke-linecap="round"/></svg>'}
];
