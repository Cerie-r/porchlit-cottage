// His hoodie and cargo trousers: a soft, roomy hoodie down over his hips, its hood lying folded on
// his back, two drawstrings with little tips hanging from the neck, a kangaroo pocket across the front
// and ribbed cuffs and hem; trousers with a big pocket on the side of each thigh, gathered into cuffs
// at the ankle, and chunky trainers. Built in the residents' body coordinates with
// body/outfit-tools.js, like body/outfits.js.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smoothstep,around,torsoAt,rowHeights,rings,mesh,armRings,profile,cloth,slab,circleAround,trouserLeg} from './outfit-tools.js';

const torso=(a,y)=>around(torsoAt(y),a);
const ribs=(a,n)=>.003*Math.cos(n*a);
function build(){
 const main=cloth('main','#8fa9c9',.97),accent=cloth('accent','#6a6455',.95),trim=cloth('trim','#f2ede4',.9);
 const shoe=cloth('fixed','#f4f1ec',.8),sole=cloth('fixed','#d6cfc4',.9);
 const g=new T.Group();g.name='hoodie-cargo';
 const HEM=.88,hoodie=(a,y)=>torso(a,Math.max(y,.72))+.036+.014*smoothstep((1.04-y)/.16);
 // its name lets it bend at the hips with the legs the way the skin does
 mesh(g,rings(rowHeights(1.40,HEM).map(y=>[y,hoodie]),72),main,'hoodie-stitch',{cx:0,cz:.10});
 mesh(g,rings([HEM+.04,HEM+.028,HEM+.014,HEM,HEM-.008].map(y=>[y,a=>hoodie(a,HEM)+.008+ribs(a,52)]),104),main,'rib-hem',{cx:0,cz:.10,gap:.03});
 // the neck: a soft round neckline up under the head, where the hood joins
 const neck=a=>circleAround(.118,-.05)(a)+.006;
 mesh(g,rings([1.44,1.42,1.40,1.385,1.37,1.355].map(y=>[y,neck]),64),main,'hood-neck',{cx:0,cz:.10,gap:.016});
 // the hood, folded down on the back: a thick soft fold from behind the neck down the shoulder blades
 const hoodOutline=(u,v)=>{const a=Math.PI+(u-.5)*(1.45-.55*v),y=1.38-.25*v*(1-.35*(2*u-1)**2);return [a,y];};
 mesh(g,slab((a,y)=>hoodie(a,y),hoodOutline,18,8,.004,.024),main,'folded-hood');
 // the drawstrings, from either side of the neck in front, down to little tips
 const cords=[],tips=[];
 for(const k of [-1,1]){const pts=[];for(let i=0;i<=10;i++){const y=1.36-.15*i/10,a=k*(.2+.025*i/10),R=hoodie(a,y)+.009;pts.push(new T.Vector3(Math.sin(a)*R,y,.10+Math.cos(a)*R));}
  cords.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts),20,.0055,6,false));const end=pts.at(-1);tips.push(new T.CapsuleGeometry(.0075,.02,3,8).translate(end.x,end.y-.012,end.z+.002));}
 for(const c of [...cords,...tips])for(const k of Object.keys(c.attributes))if(k!=='position'&&k!=='normal')c.deleteAttribute(k);
 mesh(g,mergeGeometries([...cords,...tips]),trim,'drawstrings');
 // the kangaroo pocket across the front, its sides slanting in to the openings
 const pocket=(u,v)=>{const y=1.0+.15*v,half=.62-.16*v;return [(2*u-1)*half,y];};
 mesh(g,slab(hoodie,pocket,16,6,.003,.007),main,'pocket-panel');
 const edges=[];for(const k of [-1,1]){const pts=[];for(let i=0;i<=8;i++){const v=i/8,a=k*(.62-.16*v),y=1.0+.15*v,R=hoodie(a,y)+.012;pts.push(new T.Vector3(Math.sin(a)*R,y,.10+Math.cos(a)*R));}edges.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts),12,.004,5,false));}
 mesh(g,mergeGeometries(edges),trim,'pocket-edges');
 // roomy sleeves into ribbed cuffs
 for(const side of [-1,1]){
  const r=s=>profile([[-.07,.1],[-.05,.136],[-.02,.158],[.05,.17],[.2,.162],[.32,.15],[.4,.136],[.43,.126],[.45,.118]],s),ss=[-.07,-.06,-.045,-.025,0,.04,.09,.14,.19,.24,.29,.33,.37,.4,.43,.45];
  const behind=(a,s)=>.04*Math.max(0,-Math.cos(a))**1.5*(1-smoothstep((s-.02)/.22));
  mesh(g,armRings(side,ss.map(s=>[s,a=>r(s)+behind(a,s)]),24).geometry,main,'tailored-sleeve');
  mesh(g,armRings(side,[[.436,.118],[.446,.121],[.47,.12],[.495,.116],[.505,.11]].map(([s,R])=>[s,a=>R+ribs(a,24)]),48).geometry,main,'turned-cuff');
 }
 // the trousers: roomy, a big flap pocket on the outside of each thigh, gathered into a cuff
 for(const side of [-1,1]){
  const legR=y=>.152+(.13-.152)*Math.min(1,Math.max(0,(.78-y)/.76))+.04-.014*smoothstep((.32-y)/.1),leg=trouserLeg(side,y=>legR(y),{ease:.03});
  mesh(g,leg.geometry,accent,'pant-leg-stitch',leg.axis);
  const {cx,cz}=leg.axis;
  mesh(g,rings([.235,.222,.205,.19,.176,.165].map(y=>[y,a=>legR(.23)-.006+ribs(a,20)]),40,{cx,cz}),accent,'trouser-hem',{cx,cz});
  // the pocket, on the outer side of the thigh, made round the leg's own axis and moved onto it
  const outline=(u,v)=>[side*(Math.PI/2+(u-.5)*.95),.66-.17*v];
  const pocketLeg=slab((a,y)=>legR(y),outline,10,6,.004,.009);pocketLeg.translate(cx,0,cz-.10);
  mesh(g,pocketLeg,accent,'trouser-pocket');
  const flap=slab((a,y)=>legR(y),(u,v)=>[side*(Math.PI/2+(u-.5)*1.0),.675-.05*v],10,3,.013,.007);flap.translate(cx,0,cz-.10);
  mesh(g,flap,accent,'trouser-pocket-flap');
 }
 // chunky trainers: a round toe on a thick sole
 for(const side of [-1,1]){
  const s=mesh(g,new T.SphereGeometry(1,22,12),shoe,'shoe');s.position.set(side*.2,.1,.13);s.scale.set(.2,.135,.3);
  const o=mesh(g,new T.SphereGeometry(1,22,8),sole,'sole');o.position.set(side*.2,.04,.13);o.scale.set(.206,.055,.31);
 }
 return g;
}

export const hoodieCargo={
 id:'hoodie-cargo',name:'连帽卫衣',wearers:['boy'],build,
 colorways:[{id:'mist',name:'雾蓝',colors:{main:'#8fa9c9',accent:'#6a6455',trim:'#f2ede4'}},{id:'latte',name:'奶咖',colors:{main:'#c9a98b',accent:'#4a4440',trim:'#f2ede4'}},{id:'matcha',name:'抹茶',colors:{main:'#a9b98f',accent:'#4a4a3f',trim:'#f2ede4'}}],
 drawing:'<svg viewBox="0 0 120 120"><path d="M40 80h40l3 31H64l-4-24-4 24H37z" fill="#6a6455"/><path d="m44 16-18 13-10 30 14 6 11-22v40h38V43l11 22 14-6-10-30-18-13-16 6z" fill="#8fa9c9"/><path d="M44 62h32l-4-12H48z" fill="#7d97b8"/><path d="M54 24v16m12-16v16" stroke="#f2ede4" stroke-width="3"/></svg>'
};
