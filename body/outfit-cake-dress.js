// Her tiered dress: a fitted bodice with a lace edge round the neck, a high ribbon waist tied in a big
// bow at the back, and a long skirt in three gathered tiers, each wider than the one above, each
// finished with a frill of lace; long puff sleeves with frilled cuffs, and round shoes with a strap.
// Built in the residents' body coordinates with body/outfit-tools.js, like body/outfits.js.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smoothstep,around,torsoAt,rowHeights,rings,mesh,armRings,profile,cloth,fold,circleAround} from './outfit-tools.js';

const torso=(a,y)=>around(torsoAt(y),a);
function build(){
 const main=cloth('main','#f2b9c4',.9),accent=cloth('accent','#fbf3f0',.85),trim=cloth('trim','#e0899c',.6);
 const shoe=cloth('fixed','#f6eee9',.6),sole=cloth('fixed','#c9b8b3',.9);
 const g=new T.Group();g.name='cake-dress';
 const WAIST=1.06,bodice=(a,y)=>torso(a,y)+.018;
 mesh(g,rings(rowHeights(1.40,WAIST-.03).map(y=>[y,bodice]),64),main,'cake-bodice',{cx:0,cz:.10});
 // lace round the neck, in two rows of little scallops
 const neck=a=>circleAround(.12,-.04)(a);
 mesh(g,rings([1.39,1.378,1.366,1.354,1.342].map((y,j)=>[y,a=>Math.max(neck(a),bodice(a,1.37))+.006+.009*j+.012*(j/4)*Math.abs(Math.sin(18*a))]),120),accent,'lace-collar',{cx:0,cz:.10,gap:.016});
 // three tiers, gathered at the top, each starting a little outside the bottom of the one above and
 // flaring to a frilled edge
 const tiers=[[WAIST,.775,[.262,.32,.282],[.33,.38,.34]],[.795,.505,[.335,.385,.345],[.41,.455,.415]],[.525,.205,[.415,.46,.42],[.5,.545,.5]]];
 tiers.forEach(([top,bottom,from,to],k)=>{
  const r=(a,y)=>{const t=Math.max(0,(top-y)/(top-bottom));return around(from,a)+.006*k+(around(to,a)-around(from,a))*Math.pow(t,.8)+(.006+.01*t)*fold(a*1.6,k);};
  mesh(g,rings(rowHeights(top,bottom,.03).map(y=>[y,r]),104),main,'tier-dress',{cx:0,cz:.10,gap:.02+.012*k});
  // the frill at its edge: a little ruffle of lace standing out from it
  const frill=[bottom+.022,bottom+.012,bottom+.003,bottom-.006,bottom-.012].map((y,j)=>[y,a=>r(a,bottom)+.004+.004*j+.006*Math.abs(Math.sin(30*a))*(j/4)]);
  mesh(g,rings(frill,140),accent,'frill-hem',{cx:0,cz:.10,gap:.03+.012*k});
 });
 // the ribbon round the high waist, and the bow at the back
 const ribbon=(a,y)=>bodice(a,WAIST)+.012+.003*Math.sin(Math.PI*(y-WAIST+.02)/.05);
 mesh(g,rings([WAIST+.03,WAIST+.018,WAIST+.005,WAIST-.008,WAIST-.02].map(y=>[y,ribbon]),72),trim,'waist-ribbon',{cx:0,cz:.10});
 const back=.10-(bodice(Math.PI,WAIST)+.02),bow=[];
 for(const s of [-1,1]){
  const loop=new T.SphereGeometry(1,16,10);loop.scale(.1,.058,.026);loop.rotateZ(s*.3);loop.translate(s*.082,.006,0);bow.push(loop);
  const tail=new T.CapsuleGeometry(.017,.17,3,8);tail.rotateZ(s*.2);tail.translate(s*.036,-.1,-.004);bow.push(tail);
 }
 bow.push(new T.SphereGeometry(1,12,8).scale(.03,.036,.024));
 for(const b of bow)for(const k of Object.keys(b.attributes))if(k!=='position'&&k!=='normal')b.deleteAttribute(k);
 const bowGeometry=mergeGeometries(bow);bowGeometry.rotateY(Math.PI);bowGeometry.translate(0,WAIST,back-.008);
 mesh(g,bowGeometry,trim,'back-bow');
 // long puff sleeves, gathered into a frilled cuff
 for(const side of [-1,1]){
  const full=s=>profile([[-.08,.1],[-.06,.14],[-.03,.165],[.03,.18],[.12,.182],[.22,.17],[.3,.152],[.37,.136],[.42,.12],[.45,.108],[.46,.104]],s);
  const gathers=s=>Math.sin(Math.PI*Math.min(1,Math.max(0,(s+.08)/.54)));
  const ss=[-.08,-.07,-.055,-.035,-.01,.02,.06,.1,.14,.18,.22,.26,.3,.34,.37,.4,.42,.44,.46];
  const sl=armRings(side,ss.map(s=>[s,a=>full(s)+.006*Math.sin(10*a)*gathers(s)]),24);
  mesh(g,sl.geometry,main,'tailored-sleeve');
  mesh(g,armRings(side,[[.448,.106],[.46,.114],[.474,.124],[.49,.132],[.5,.13]].map(([s,R],j)=>[s,a=>R+.006*Math.abs(Math.sin(12*a))*(j/4)]),48).geometry,accent,'turned-cuff');
 }
 // round shoes with a strap over the instep
 for(const side of [-1,1]){
  const s=mesh(g,new T.SphereGeometry(1,22,12),shoe,'shoe');s.position.set(side*.2,.088,.125);s.scale.set(.19,.13,.29);
  const o=mesh(g,new T.SphereGeometry(1,22,8),sole,'sole');o.position.set(side*.2,.032,.125);o.scale.set(.194,.04,.296);
  // the strap: over the shoe's top across the instep, from side to side
  const z=.175,k=Math.sqrt(1-((z-.125)/.29)**2),arc=[];for(let i=0;i<=16;i++){const t=.12+(Math.PI-.24)*i/16;arc.push(new T.Vector3(side*.2+Math.cos(t)*(.19*k+.006),.088+Math.sin(t)*(.13*k+.006),z));}
  mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(arc),24,.0095,6,false),trim,'shoe-strap');
 }
 return g;
}

export const cakeDress={
 id:'cake-dress',name:'蛋糕裙',wearers:['girl'],build,
 colorways:[{id:'strawberry',name:'草莓牛奶',colors:{main:'#f2b9c4',accent:'#fbf3f0',trim:'#e0899c'}},{id:'taro',name:'香芋',colors:{main:'#cdbde2',accent:'#fbf8ff',trim:'#9c84bf'}},{id:'mint',name:'薄荷',colors:{main:'#b8dbc8',accent:'#f7fbf8',trim:'#7fb398'}}],
 drawing:'<svg viewBox="0 0 120 120"><path d="m45 16-17 12-10 30 13 6 10-22v18h38V42l10 22 13-6-10-30-17-12-15 6z" fill="#f2b9c4"/><path d="M41 58h38l6 16H35zM34 72h52l7 16H27zM26 86h68l8 18H18z" fill="#f2b9c4" stroke="#fbf3f0" stroke-width="3"/><path d="M41 56h38" stroke="#e0899c" stroke-width="5"/></svg>'
};
