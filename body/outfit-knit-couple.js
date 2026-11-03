// The knit couple set: the same cable-knit jumper for both, a little heart knitted in over the left
// side of the chest. Hers is short, over a long pleated skirt with a high waist; his comes down over
// his hips, with corduroy trousers turned up at the hem. Both have ribbed collars, cuffs and hems.
// Built in the residents' body coordinates with body/outfit-tools.js, like body/outfits.js.
import * as T from 'three';
import {smoothstep,around,torsoAt,rowHeights,rings,mesh,armRings,profile,cloth,slab,circleAround,trouserLeg} from './outfit-tools.js';

const torso=(a,y)=>around(torsoAt(y),a);
// The knit's cables: three ropes down the front, each two strands crossing over and under, with a
// little groove either side; they fade out under the collar and towards the hem.
function cables(a,y,top,bottom){
 let r=0,g=0;
 for(const c of [-.32,0,.32]){
  for(const k of [1,-1]){const s=c+k*.045*Math.sin(Math.PI*2*(y-top)/.08),d=(a-s)/.055;r=Math.max(r,.0105*Math.exp(-d*d));}
  for(const k of [1,-1]){const d=(a-c-k*.13)/.024;g=Math.max(g,.004*Math.exp(-d*d));}
 }
 return (r-g)*smoothstep((top-.035-y)/.04)*smoothstep((y-bottom-.02)/.04);
}
// A ribbed band: knit ribs all round.
const ribs=(a,n=38)=>.0032*Math.cos(n*a);
// The collar: a ribbed band round the neck, up under the head.
function collar(g,material){
 const neck=circleAround(.112,-.05);
 mesh(g,rings([1.44,1.42,1.40,1.385,1.37,1.355].map(y=>[y,a=>neck(a)+.004+ribs(a,34)]),72),material,'knit-collar',{cx:0,cz:.10,gap:.014});
}
// Long knit sleeves, easy over the upper arm (which hardly moves on the rig) and gathered into a
// ribbed cuff at the wrist.
function sleeves(g,main,trim,points){
 for(const side of [-1,1]){
  const r=s=>profile(points,s),ss=[-.08,-.07,-.055,-.035,-.01,.02,.06,.1,.14,.18,.22,.26,.3,.34,.38,.41,.44,.46];
  const behind=(a,s)=>.035*Math.max(0,-Math.cos(a))**1.5*(1-smoothstep((s-.02)/.22));
  const sl=armRings(side,ss.map(s=>[s,a=>r(s)+behind(a,s)]),24);
  mesh(g,sl.geometry,main,'tailored-sleeve');
  mesh(g,armRings(side,[[.448,.116],[.456,.12],[.47,.12],[.49,.118],[.505,.114],[.512,.108]].map(([s,R])=>[s,a=>R+ribs(a,22)*.8]),44).geometry,trim,'turned-cuff');
 }
}
// A little heart on the left side of the chest (+x), knitted in: a raised patch on the jumper.
function heart(g,material,radius){
 const W=.072,a0=.68,y0=1.24,R=radius(a0,y0),s=W/4;
 const top=x=>Math.sqrt(Math.max(0,1-(Math.abs(x)-1)**2)),bottom=x=>Math.acos(Math.max(-1,Math.min(1,1-Math.abs(x))))-Math.PI;
 const outline=(u,v)=>{const x=-2+4*u,y=bottom(x)+(top(x)-bottom(x))*v;return [a0+x*s/R,y0+(y+1.1)*s];};
 mesh(g,slab(radius,outline,20,8,.0035,.005),material,'heart-patch');
}
// Round shoes on soles, in their own colours.
function shoes(g,shoe,sole,size=1){
 for(const side of [-1,1]){
  const s=mesh(g,new T.SphereGeometry(1,22,12),shoe,'shoe');s.position.set(side*.2,.089,.125);s.scale.set(.192*size,.132*size,.292*size);
  const o=mesh(g,new T.SphereGeometry(1,22,8),sole,'sole');o.position.set(side*.2,.032,.125);o.scale.set(.196*size,.041,.297*size);
 }
}

// Hers: the jumper stops at the waist, over a long pleated skirt whose waist is high enough that the
// thighs pass under the jumper's hem when she sits.
function hers(){
 const main=cloth('main','#efe6d6',.97),accent=cloth('accent','#9b6a55',.9),trim=cloth('trim','#e2d5c1',.97);
 const shoe=cloth('fixed','#6b4a3c',.7),sole=cloth('fixed','#3f3438',.9);
 const g=new T.Group();g.name='knit-pleated-skirt';
 const TOP=1.40,HEM=1.035,SKIRT=1.075,FLOOR=.215;
 const jumper=(a,y)=>torso(a,y)+.026+.008*smoothstep((1.2-y)/.15);
 mesh(g,rings(rowHeights(TOP,HEM).map(y=>[y,(a,yy)=>jumper(a,yy)+cables(a,yy,TOP,HEM)]),96),main,'knit-jumper',{cx:0,cz:.10});
 mesh(g,rings([HEM+.03,HEM+.02,HEM+.008,HEM-.004,HEM-.016].map(y=>[y,a=>jumper(a,HEM)+.012+ribs(a,44)]),88),trim,'knit-rib',{cx:0,cz:.10,gap:.03});
 collar(g,trim);
 heart(g,accent,jumper);
 // the skirt: from under the jumper, flaring to just above the shoes, in box pleats that open
 // towards the hem
 const waist=[.25,.305,.275],hem=[.47,.51,.47],N=26;
 const skirt=(a,y)=>{const t=Math.max(0,(SKIRT-y)/(SKIRT-FLOOR)),base=around(waist,a)+.012+(around(hem,a)-around(waist,a))*Math.pow(t,.9),f=((a/(Math.PI*2)*N)%1+1)%1;return base+.014*Math.pow(t,.8)*(Math.abs(f-.5)*2-.5);};
 mesh(g,rings(rowHeights(SKIRT,FLOOR).map(y=>[y,skirt]),104),accent,'pleated-dress',{cx:0,cz:.10});
 // a fine line round the skirt a little above its hem
 const line=[];for(let i=0;i<=104;i++){const a=i/104*Math.PI*2,y=FLOOR+.045,R=skirt(a,y)+.006;line.push(new T.Vector3(Math.sin(a)*R,y,.10+Math.cos(a)*R));}
 mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(line,true),104,.0034,4,true),trim,'seam');
 sleeves(g,main,trim,[[-.08,.1],[-.06,.135],[-.03,.156],[.03,.166],[.12,.163],[.24,.151],[.34,.137],[.41,.125],[.45,.116],[.46,.112]]);
 shoes(g,shoe,sole);
 return g;
}

// His: the jumper comes down over his hips (its name lets it bend there with the legs the way the
// skin does), over corduroy trousers with turned-up hems.
function his(){
 const main=cloth('main','#efe6d6',.97),accent=cloth('accent','#6f5446',.95),trim=cloth('trim','#e2d5c1',.97);
 const shoe=cloth('fixed','#5a4136',.7),sole=cloth('fixed','#2f2a2e',.9);
 const g=new T.Group();g.name='knit-cord-trousers';
 const TOP=1.40,HEM=.875;
 const jumper=(a,y)=>torso(a,Math.max(y,.72))+.03+.012*smoothstep((1.02-y)/.14);
 mesh(g,rings(rowHeights(TOP,HEM).map(y=>[y,(a,yy)=>jumper(a,yy)+cables(a,yy,TOP,HEM)]),96),main,'cable-knit-stitch',{cx:0,cz:.10});
 mesh(g,rings([HEM+.035,HEM+.024,HEM+.012,HEM,HEM-.008].map(y=>[y,a=>jumper(a,HEM)+.006+ribs(a,48)]),96),trim,'rib-hem',{cx:0,cz:.10,gap:.026});
 collar(g,trim);
 heart(g,accent,jumper);
 // the trousers, in fine corduroy ribs, turned up at the hem
 for(const side of [-1,1]){
  const legR=y=>.152+(.13-.152)*Math.min(1,Math.max(0,(.78-y)/.76))+.032,leg=trouserLeg(side,(y,p)=>legR(y)+.0018*Math.cos(p*20),{cols:40});
  mesh(g,leg.geometry,accent,'pant-leg-stitch',leg.axis);
  mesh(g,rings([.215,.2,.185,.17,.158].map(y=>[y,()=>legR(y)+.011]),32,{cx:leg.axis.cx,cz:leg.axis.cz}),accent,'trouser-hem',{cx:leg.axis.cx,cz:leg.axis.cz});
 }
 sleeves(g,main,trim,[[-.07,.1],[-.05,.132],[-.02,.152],[.05,.162],[.2,.154],[.32,.14],[.4,.126],[.44,.118],[.46,.114]]);
 shoes(g,shoe,sole,1.03);
 return g;
}

const ways=(colors)=>colors.map(([id,name,main,accent,trim])=>({id,name,colors:{main,accent,trim}}));
export const knitCouple=[
 {id:'knit-skirt',name:'毛衣百褶裙',wearers:['girl'],build:hers,
  colorways:ways([['oat','燕麦','#efe6d6','#9b6a55','#e2d5c1'],['berry','莓果','#f4e1e3','#b5485a','#e9cdd1'],['mist','雾蓝','#e8edf3','#5d7194','#d6dde7']]),
  drawing:'<svg viewBox="0 0 120 120"><path d="m42 16-18 13-10 30 14 6 11-22v22h42V43l11 22 14-6-10-30-18-13-18 6z" fill="#efe6d6"/><path d="M39 65h42l14 46H25z" fill="#9b6a55"/><path d="M78 35q-4-4-7 0-3-4-7 0 0 5 7 9 7-4 7-9z" fill="#9b6a55"/></svg>'},
 {id:'knit-trousers',name:'毛衣灯芯绒裤',wearers:['boy'],build:his,
  colorways:ways([['oat','燕麦','#efe6d6','#6f5446','#e2d5c1'],['berry','莓果','#f4e1e3','#7a3b48','#e9cdd1'],['mist','雾蓝','#e8edf3','#3f4f6e','#d6dde7']]),
  drawing:'<svg viewBox="0 0 120 120"><path d="M42 80h36l2 31H64l-4-24-4 24H40z" fill="#6f5446"/><path d="m42 16-18 13-10 30 14 6 11-22v40h42V43l11 22 14-6-10-30-18-13-18 6z" fill="#efe6d6"/><path d="M78 35q-4-4-7 0-3-4-7 0 0 5 7 9 7-4 7-9z" fill="#6f5446"/></svg>'}
];
