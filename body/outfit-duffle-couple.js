// The duffle coat couple set: the same long duffle coat for both, closed down the front with three
// horn toggles on rope loops, a soft collar, its hood folded down on the back, patch pockets with flaps
// over the hips and turned-back cuffs. It reaches below the knee, so when they sit its front lies over
// their laps like a skirt. Under it, dark tights and lace-up boots for her, trousers and boots for him.
// Built in the residents' body coordinates with body/outfit-tools.js, like body/outfits.js.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smoothstep,around,torsoAt,rowHeights,rings,mesh,armRings,profile,cloth,slab,circleAround,trouserLeg,surfaceLine} from './outfit-tools.js';

const torso=(a,y)=>around(torsoAt(y),a);
const strip=g=>{for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal')g.deleteAttribute(k);return g;};
function coat(g,{main,trim,ease=.042,hem=.42}){
 const coatR=(a,y)=>torso(a,Math.max(y,.72))+ease+.05*smoothstep((1.0-y)/.6)+.024*Math.max(0,Math.cos(a))*smoothstep((.99-y)/.12)+(y<.72?.03*Math.sin(a)**2*smoothstep((.72-y)/.3):0);
 // its name lets it bend at the hips and knees with the legs, as a skirt does
 mesh(g,rings(rowHeights(1.40,hem).map(y=>[y,coatR]),72),main,'duffle-coat-hem',{cx:0,cz:.10});
 // the front edge, a little to one side, stitched down to the hem, and a line of stitching round it
 const front=[];for(let k=0;k<=14;k++)front.push([-.09,1.36-(1.36-hem-.012)*k/14]);
 const round=[];for(let i=0;i<=72;i++)round.push([i/72*Math.PI*2,hem+.018]);
 mesh(g,mergeGeometries([surfaceLine(coatR,front,.004,.0042,{segments:56}),surfaceLine(coatR,round,.004,.0034,{closed:true,segments:96})].map(strip)),trim,'seam');
 // the soft collar up round the neck
 const neck=a=>circleAround(.118,-.05)(a)+.012;
 mesh(g,rings([1.45,1.43,1.41,1.39,1.375,1.36].map(y=>[y,neck]),64),main,'coat-collar',{cx:0,cz:.10,gap:.016});
 // the hood, folded down on the back
 const hood=(u,v)=>[Math.PI+(u-.5)*(1.5-.6*v),1.38-.26*v*(1-.35*(2*u-1)**2)];
 mesh(g,slab(coatR,hood,18,8,.004,.026),main,'folded-hood');
 // three horn toggles across the front edge, each on a loop of rope either side
 const toggles=[],ropes=[];
 for(const y of [1.27,1.15,1.03]){
  const a=-.09,R=coatR(a,y),n=new T.Vector3(Math.sin(a),0,Math.cos(a)),p=new T.Vector3(Math.sin(a)*(R+.014),y,.10+Math.cos(a)*(R+.014)),across=new T.Vector3(0,1,0).cross(n).normalize();
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),across);
  toggles.push(strip(new T.CapsuleGeometry(.0105,.04,4,10).applyQuaternion(q).translate(...p.toArray())));
  // the rope: from under the toggle, a loop out to the side lying on the coat, and back
  for(const k of [-1,1]){const at=(x,v)=>p.clone().addScaledVector(across,k*x).add(new T.Vector3(0,v,0)).addScaledVector(n,-.008+.002*Math.cos(Math.PI*x/.05));
   ropes.push(strip(new T.TubeGeometry(new T.CatmullRomCurve3([at(.008,.006),at(.03,.008),at(.048,.004),at(.052,0),at(.048,-.004),at(.03,-.008),at(.008,-.006)]),18,.0034,5,false)));}
 }
 mesh(g,mergeGeometries(toggles),trim,'toggles');mesh(g,mergeGeometries(ropes),trim,'toggle-ropes');
 // patch pockets with flaps over the hips; their names keep them moving with the coat there
 for(const side of [-1,1]){
  mesh(g,slab(coatR,(u,v)=>[side*(.58+u*.52),.9-v*.14],8,5,.003,.008),main,'pocket-hem');
  mesh(g,slab(coatR,(u,v)=>[side*(.56+u*.56),.915-v*.045],8,2,.012,.007),main,'pocket-flap-hem');
 }
 return coatR;
}
function sleeves(g,main){
 for(const side of [-1,1]){
  const r=s=>profile([[-.07,.1],[-.05,.134],[-.02,.156],[.05,.166],[.2,.158],[.32,.146],[.4,.136],[.43,.132]],s),ss=[-.07,-.06,-.045,-.025,0,.04,.09,.14,.19,.24,.29,.33,.37,.4,.43];
  const behind=(a,s)=>.04*Math.max(0,-Math.cos(a))**1.5*(1-smoothstep((s-.02)/.22));
  mesh(g,armRings(side,ss.map(s=>[s,a=>r(s)+behind(a,s)]),24).geometry,main,'tailored-sleeve');
  mesh(g,armRings(side,[[.41,.138],[.418,.145],[.47,.143],[.492,.137],[.5,.13]],24).geometry,main,'turned-cuff');
 }
}
// Lace-up boots: a round toe on a sole, and a shaft up round the ankle with laces up its front.
function boots(g,leather,sole,laces,size=1){
 for(const side of [-1,1]){
  const cx=side*.19,cz=.11;
  const s=mesh(g,new T.SphereGeometry(1,22,12),leather,'shoe');s.position.set(side*.2,.092,.13);s.scale.set(.196*size,.136*size,.298*size);
  const o=mesh(g,new T.SphereGeometry(1,22,8),sole,'sole');o.position.set(side*.2,.034,.13);o.scale.set(.202*size,.045,.305*size);
  mesh(g,rings([.34,.32,.28,.23,.18,.13].map(y=>[y,()=>.162+.012*smoothstep((.2-y)/.08)]),32,{cx,cz}),leather,'boot-shoe',{cx,cz,leg:true});
  const cross=[];for(let k=0;k<4;k++){const y=.3-.04*k;for(const d of [-1,1])cross.push(strip(new T.CylinderGeometry(.0034,.0034,.06,5).rotateZ(Math.PI/2+d*.5).translate(cx,y-.01,cz+.168)));}
  mesh(g,mergeGeometries(cross),laces,'boot-laces-shoe');
 }
}

function hers(){
 const main=cloth('main','#c49a6c',.95),accent=cloth('accent','#3a3236',.85),trim=cloth('trim','#f0e2c8',.6);
 const leather=cloth('fixed','#5a4136',.6),sole=cloth('fixed','#2f2a2e',.9),laces=cloth('fixed','#efe6d6',.8);
 const g=new T.Group();g.name='duffle-coat-tights';
 coat(g,{main,trim,ease:.04,hem:.43});
 // dark tights
 for(const side of [-1,1]){const leg=trouserLeg(side,y=>.152+(.13-.152)*Math.min(1,Math.max(0,(.78-y)/.76))+.012,{ease:.016,top:1.0,bottom:.14});mesh(g,leg.geometry,accent,'pant-leg-stitch',leg.axis);}
 sleeves(g,main);
 boots(g,leather,sole,laces);
 return g;
}
function his(){
 const main=cloth('main','#c49a6c',.95),accent=cloth('accent','#3f3a34',.95),trim=cloth('trim','#f0e2c8',.6);
 const leather=cloth('fixed','#4a3a33',.6),sole=cloth('fixed','#2a2629',.9),laces=cloth('fixed','#d9cdb8',.8);
 const g=new T.Group();g.name='duffle-coat-trousers';
 coat(g,{main,trim,ease:.046,hem:.41});
 for(const side of [-1,1]){const leg=trouserLeg(side,y=>.152+(.13-.152)*Math.min(1,Math.max(0,(.78-y)/.76))+.03);mesh(g,leg.geometry,accent,'pant-leg-stitch',leg.axis);}
 sleeves(g,main);
 boots(g,leather,sole,laces,1.03);
 return g;
}

const ways=(colors)=>colors.map(([id,name,main,accent,trim])=>({id,name,colors:{main,accent,trim}}));
export const duffleCouple=[
 {id:'duffle-tights',name:'牛角扣大衣·她',wearers:['girl'],build:hers,
  colorways:ways([['camel','驼色','#c49a6c','#3a3236','#f0e2c8'],['navy','藏青','#2f3a57','#2a2629','#e8d9bd'],['wine','酒红','#7a2f3d','#2a2629','#efe0c4']]),
  drawing:'<svg viewBox="0 0 120 120"><path d="m44 16-18 13-10 30 14 6 11-22-4 50h46l-4-50 11 22 14-6-10-30-18-13z" fill="#c49a6c"/><path d="M48 93h8v18h-8zm16 0h8v18h-8z" fill="#3a3236"/><path d="M52 40h12m-12 14h12m-12 14h12" stroke="#f0e2c8" stroke-width="4" stroke-linecap="round"/></svg>'},
 {id:'duffle-trousers',name:'牛角扣大衣·他',wearers:['boy'],build:his,
  colorways:ways([['camel','驼色','#c49a6c','#3f3a34','#f0e2c8'],['navy','藏青','#2f3a57','#2a2629','#e8d9bd'],['wine','酒红','#7a2f3d','#2a2629','#efe0c4']]),
  drawing:'<svg viewBox="0 0 120 120"><path d="m44 16-18 13-10 30 14 6 11-22-4 50h46l-4-50 11 22 14-6-10-30-18-13z" fill="#c49a6c"/><path d="M46 93h11v18H46zm17 0h11v18H63z" fill="#3f3a34"/><path d="M52 40h12m-12 14h12m-12 14h12" stroke="#f0e2c8" stroke-width="4" stroke-linecap="round"/></svg>'}
];
