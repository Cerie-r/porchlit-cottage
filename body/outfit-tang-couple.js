// The Chinese-style couple set, in the same satin with gold piping and knotted frog buttons. Hers is
// a long qipao: a stand collar, the front opening curving over to her right side, piped all along and
// closed with three frog buttons, little blossoms scattered over it, and piped slits at the sides.
// His is a jacket with a stand collar, buttoned down the middle with five frog buttons and turned-back
// cuffs, over dark trousers and cloth shoes with white soles. Built in the residents' body
// coordinates with body/outfit-tools.js, like body/outfits.js.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smoothstep,around,torsoAt,rowHeights,rings,mesh,armRings,profile,cloth,circleAround,trouserLeg,surfaceLine} from './outfit-tools.js';

const torso=(a,y)=>around(torsoAt(y),a);
// Satin: a soft sheen that reads in the rooms' light; named after its colour area like cloth().
const satin=(name,color)=>new T.MeshPhysicalMaterial({name,color,roughness:.55,sheen:.7,sheenRoughness:.45,sheenColor:new T.Color('#fff4ea'),side:T.DoubleSide});
// A point on a garment's surface radius(theta, y), lift out, and which way it faces there.
const onSurface=(radius,a,y,lift=0)=>{const R=radius(a,y)+lift;return {point:new T.Vector3(Math.sin(a)*R,y,.10+Math.cos(a)*R),normal:new T.Vector3(Math.sin(a),0,Math.cos(a))};};
// A frog button: a round knot with a loop either side of it, lying across a line on the garment
// (along is the line's direction there), on the surface.
function frog(radius,a,y,along){
 const {point,normal}=onSurface(radius,a,y,.007),across=new T.Vector3().crossVectors(normal,along).normalize(),parts=[new T.SphereGeometry(.0115,12,8).translate(...point.toArray())];
 for(const k of [-1,1]){const loop=new T.TorusGeometry(.0125,.0036,6,14),q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,normal.clone().cross(across).normalize(),normal));
  loop.scale(1.25,.7,1).translate(k*.022,0,0).applyQuaternion(q).translate(...point.toArray());parts.push(loop);}
 for(const p of parts)for(const k of Object.keys(p.attributes))if(k!=='position'&&k!=='normal')p.deleteAttribute(k);
 return mergeGeometries(parts);
}
// The stand collar, round the neck up under the head, piped along its lower edge.
function standCollar(g,main,trim){
 const neck=a=>circleAround(.106,-.05)(a)+.006;
 mesh(g,rings([1.44,1.42,1.40,1.385,1.37,1.355].map(y=>[y,neck]),64),main,'stand-collar',{cx:0,cz:.10,gap:.014});
 const ring=[];for(let i=0;i<=48;i++)ring.push([i/48*Math.PI*2,1.358]);
 mesh(g,surfaceLine(a=>neck(a),ring,.002,.0045,{closed:true,segments:64}),trim,'collar-piping');
}
// Long sleeves, cuffed at the wrist.
function sleeves(g,main,trim,points,cuff){
 for(const side of [-1,1]){
  const r=s=>profile(points,s),ss=[-.08,-.07,-.055,-.035,-.01,.02,.06,.1,.14,.18,.22,.26,.3,.34,.38,.41,.44,.46];
  const behind=(a,s)=>.035*Math.max(0,-Math.cos(a))**1.5*(1-smoothstep((s-.02)/.22));
  const sl=armRings(side,ss.map(s=>[s,a=>r(s)+behind(a,s)]),24);
  mesh(g,sl.geometry,main,'tailored-sleeve');
  mesh(g,armRings(side,cuff,24).geometry,trim,'turned-cuff');
 }
}
function shoes(g,shoe,sole,size=1){
 for(const side of [-1,1]){
  const s=mesh(g,new T.SphereGeometry(1,22,12),shoe,'shoe');s.position.set(side*.2,.089,.125);s.scale.set(.19*size,.128*size,.29*size);
  const o=mesh(g,new T.SphereGeometry(1,22,8),sole,'sole');o.position.set(side*.2,.032,.125);o.scale.set(.195*size,.042,.296*size);
 }
}

// Hers: the qipao.
function hers(){
 const main=satin('main','#a8323d'),accent=cloth('accent','#f6efe2',.7),trim=cloth('trim','#d9b56a',.45);
 const shoe=cloth('fixed','#5a2a32',.6),sole=cloth('fixed','#2f2a2e',.9);
 const g=new T.Group();g.name='qipao';
 const WAIST=1.03,HEM=.205,bodice=(a,y)=>torso(a,y)+.016;
 const waist=[.262,.312,.282],hem=[.4,.445,.4];
 const skirt=(a,y)=>{const t=Math.max(0,(WAIST-y)/(WAIST-HEM));return around(waist,a)+(around(hem,a)-around(waist,a))*Math.pow(t,.9);};
 const dress=(a,y)=>{if(y>=WAIST+.04)return bodice(a,y);if(y<=WAIST)return skirt(a,y);const t=smoothstep((WAIST+.04-y)/.04);return bodice(a,y)*(1-t)+skirt(a,y)*t;};
 mesh(g,rings(rowHeights(1.40,HEM).map(y=>[y,dress]),72),main,'qipao-dress',{cx:0,cz:.10});
 standCollar(g,main,trim);
 // the front opening: from the collar over to her right, round under the arm and down the side
 const opening=[[0,1.36],[-.3,1.336],[-.64,1.302],[-.95,1.252],[-1.2,1.175],[-1.36,1.085],[-1.43,1.0]];
 mesh(g,surfaceLine(dress,opening,.004,.0048),trim,'opening-piping');
 const curve=new T.CatmullRomCurve3(opening.map(([a,y])=>onSurface(dress,a,y).point),false,'centripetal'),frogs=[];
 for(const u of [.2,.57,.86]){const p=curve.getPointAt(u),a=Math.atan2(p.x,p.z-.10);frogs.push(frog(dress,a,p.y,curve.getTangentAt(u)));}
 mesh(g,mergeGeometries(frogs),trim,'frog-buttons');
 // piping round the hem, and up the slits at either side, round over their tops
 const hemLine=[];for(let i=0;i<=72;i++)hemLine.push([i/72*Math.PI*2,HEM+.008]);
 const slits=[1,-1].map(k=>{const c=k*Math.PI/2;return [[c-.045,HEM+.008],[c-.045,.42],[c-.03,.468],[c,.482],[c+.03,.468],[c+.045,.42],[c+.045,HEM+.008]];});
 mesh(g,mergeGeometries([surfaceLine(dress,hemLine,.005,.0048,{closed:true,segments:96}),...slits.map(s=>surfaceLine(dress,s,.004,.0042,{segments:48}))]),trim,'seam');
 // little blossoms: five round petals round a gold heart, scattered over the front
 const petals=[],hearts=[];
 for(const [a,y] of [[.5,1.19],[.22,.86],[-.42,.7],[.6,.52],[-.12,.4],[.32,.3],[-.62,.27],[.08,.6]]){
  const {point,normal}=onSurface(dress,a,y,.0035),side=new T.Vector3(0,1,0).cross(normal).normalize(),up=normal.clone().cross(side).normalize(),q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(side,up,normal));
  for(let i=0;i<5;i++){const b=i/5*Math.PI*2+a*3;petals.push(new T.SphereGeometry(1,10,6).scale(.019,.0145,.0032).translate(.016,0,0).rotateZ(b).applyQuaternion(q).translate(...point.toArray()));}
  hearts.push(new T.SphereGeometry(.0072,8,6).translate(0,0,.0025).applyQuaternion(q).translate(...point.toArray()));
 }
 mesh(g,mergeGeometries(petals),accent,'blossom-hem');mesh(g,mergeGeometries(hearts),trim,'blossom-heart-hem');
 sleeves(g,main,trim,[[-.08,.1],[-.06,.128],[-.03,.145],[.03,.153],[.12,.149],[.24,.139],[.34,.127],[.41,.117],[.45,.109],[.47,.105]],[[.452,.112],[.458,.115],[.47,.115],[.476,.111]]);
 shoes(g,shoe,sole);
 return g;
}

// His: the jacket, over dark trousers.
function his(){
 const main=satin('main','#a8323d'),accent=cloth('accent','#2a2629',.9),trim=cloth('trim','#d9b56a',.45);
 const shoe=cloth('fixed','#2a2629',.85),sole=cloth('fixed','#f2ede4',.9);
 const g=new T.Group();g.name='tang-jacket';
 const HEM=.865,jacket=(a,y)=>torso(a,Math.max(y,.72))+.03+.012*smoothstep((1.02-y)/.14);
 // its name lets it bend at the hips with the legs the way the skin does
 mesh(g,rings(rowHeights(1.40,HEM).map(y=>[y,jacket]),72),main,'tang-jacket-stitch',{cx:0,cz:.10});
 standCollar(g,main,trim);
 // piped down the middle and round the hem, with five frog buttons down the front
 const middle=[];for(let k=0;k<=10;k++)middle.push([0,1.36-(1.36-HEM-.01)*k/10]);
 const hemLine=[];for(let i=0;i<=72;i++)hemLine.push([i/72*Math.PI*2,HEM+.006]);
 mesh(g,mergeGeometries([surfaceLine(jacket,middle,.004,.0048,{segments:48}),surfaceLine(jacket,hemLine,.005,.0055,{closed:true,segments:96})]),trim,'seam');
 mesh(g,mergeGeometries([1.325,1.25,1.175,1.1,1.025].map(y=>frog(jacket,0,y,new T.Vector3(0,1,0)))),trim,'frog-buttons');
 // dark trousers, plain at the hem
 for(const side of [-1,1]){
  const legR=y=>.152+(.13-.152)*Math.min(1,Math.max(0,(.78-y)/.76))+.03,leg=trouserLeg(side,y=>legR(y));
  mesh(g,leg.geometry,accent,'pant-leg-stitch',leg.axis);
  mesh(g,rings([.205,.19,.175,.162].map(y=>[y,()=>legR(y)+.008]),32,{cx:leg.axis.cx,cz:leg.axis.cz}),accent,'trouser-hem',{cx:leg.axis.cx,cz:leg.axis.cz});
 }
 sleeves(g,main,trim,[[-.07,.1],[-.05,.132],[-.02,.152],[.05,.162],[.2,.156],[.32,.146],[.4,.136],[.43,.132]],[[.408,.138],[.415,.144],[.47,.142],[.495,.136],[.502,.13]]);
 shoes(g,shoe,sole,1.03);
 return g;
}

const ways=(colors)=>colors.map(([id,name,main,accent,trim])=>({id,name,colors:{main,accent,trim}}));
export const tangCouple=[
 {id:'qipao',name:'旗袍',wearers:['girl'],build:hers,
  colorways:ways([['rouge','胭脂红','#a8323d','#f6efe2','#d9b56a'],['jade','墨绿','#2f5d50','#f3e3c3','#d9b56a'],['moon','月白','#e3e9ee','#8aa3c4','#3a4a63']]),
  drawing:'<svg viewBox="0 0 120 120"><path d="m46 16-16 12-10 30 12 6 10-20-4 66h44l-4-66 10 20 12-6-10-30-16-12z" fill="#a8323d"/><path d="M48 16h24l-2 8H50zM60 22q-6 6-18 10" fill="none" stroke="#d9b56a" stroke-width="3"/><circle cx="70" cy="60" r="5" fill="#f6efe2"/><circle cx="52" cy="84" r="5" fill="#f6efe2"/></svg>'},
 {id:'tang-suit',name:'唐装',wearers:['boy'],build:his,
  colorways:ways([['rouge','胭脂红','#a8323d','#2a2629','#d9b56a'],['jade','墨绿','#2f5d50','#2a2629','#d9b56a'],['moon','月白','#e3e9ee','#3a4a63','#3a4a63']]),
  drawing:'<svg viewBox="0 0 120 120"><path d="M42 80h36l2 31H64l-4-24-4 24H40z" fill="#2a2629"/><path d="m44 16-18 13-10 30 14 6 11-22v40h38V43l11 22 14-6-10-30-18-13z" fill="#a8323d"/><path d="M60 18v65M54 34h12m-12 12h12m-12 12h12" stroke="#d9b56a" stroke-width="3"/></svg>'}
];
