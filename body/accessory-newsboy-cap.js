// A newsboy cap: a soft crown of eight wool panels gathered to a covered button, fuller at the front
// and pulled forward over a short curved brim. Made with the band (its lower edge) as a circle of
// radius 1, then fitted round the hairstyle being worn, at the height of the forehead.
import * as T from 'three';
import {finish,part,paintPiece,fitCrown,surface} from './accessory-tools.js';

const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
const PANELS=8,COLS=128,ROWS=44,TOP=.62,BULGE=1.07;
// The crown's side is one soft curve, an ellipse from the band out to its widest at WALL and over to
// the top (no straight wall: that made it look like a lid on a pot).
const F0=Math.acos(1/BULGE),RISE=TOP/(1+Math.sin(F0)),WALL=RISE*Math.sin(F0);
// How far an angle is from the nearest seam between two panels (the front is the middle of one).
function fromSeam(a){const w=2*Math.PI/PANELS,d=(((a-w/2)%w)+w)%w;return Math.min(d,w-d);}
// The crown, read round by angle a (0 at the front, pi/2 at +x) and up from the band (s 0) to the
// button (s 1): out to a soft bulge and over to the top, fuller at the front and pulled forward over
// the brim as it rises; each panel puffs out a little between its seams.
function crownPoint(a,s){
 const front=Math.max(0,Math.cos(a)),f=-F0+(Math.PI/2+F0)*s;
 let r=BULGE*Math.cos(f),h=WALL+RISE*Math.sin(f);
 const middle=Math.sin(Math.min(1,s)*Math.PI),panel=(1-Math.exp(-((fromSeam(a)/.08)**2)))*smooth(s,.05,.25)*(1-smooth(s,.8,.97));
 r+=(.1*front*middle+.025*panel*middle)*(1-s**4);
 h+=(.012*panel-.012)*smooth(s,.2,.6)*(1-smooth(s,.9,1))-.06*front*smooth(s,.25,.7)*(1-smooth(s,.75,1));
 return new T.Vector3(Math.sin(a)*r,h,Math.cos(a)*r+.2*smooth(s,.15,.95));
}
// The brim: a short crescent out from the front of the band, sloping down, more towards its tip and
// more towards its two ends, as it follows the head round; a soft slab, thinner at its tip, its root
// tucked in under the crown. How much of it there is at angle a (1 in the middle, 0 at its ends), its
// length out from the band there, the height of its middle d out from the band, x across, and how
// thick it is there.
const SPAN=.78,LENGTH=.21,THICK=.028,ROOT=.035;
const brimAmount=a=>Math.max(0,1-(a/SPAN)**2);
const brimLength=a=>LENGTH*brimAmount(a)**.6;
const brimTop=(x,d)=>.03-(.24+.25*x*x)*d-.4*d*d;
const brimThick=(a,d)=>THICK*brimAmount(a)**.3*(1-.35*Math.max(0,d)/LENGTH);
// Read across from his right end (u 0) to his left (u 1), and round its section by t: from the tip
// under it to the root, and back over the top.
function brimPoint(u,t){
 const a=-SPAN+2*SPAN*u,k=brimAmount(a),q=-t*Math.PI*2,c=Math.cos(q),s=Math.sin(q);
 const along=Math.sign(c)*Math.abs(c)**.4,up=Math.sign(s)*Math.abs(s)**.55,root=ROOT*k**.5;
 const d=-root+(brimLength(a)+root)*(1+along)/2,r=1+d,x=Math.sin(a)*r;
 return new T.Vector3(x,brimTop(x,Math.max(0,d))+brimThick(a,d)*up,Math.cos(a)*r);
}
function build(){
 const group=new T.Group();group.name='newsboy-cap';
 const wool=finish('main','#c9b79c',{roughness:.96}),button=finish('accent','#7b5d48',{roughness:.9}),band=finish('trim','#ad9b80',{roughness:.96});
 part(group,surface((s,t)=>crownPoint(Math.PI+t*Math.PI*2,s),ROWS,COLS),wool,'newsboy-cap-crown');
 part(group,surface(brimPoint,64,32),wool,'newsboy-cap-brim');
 // a soft rolled edge round the band, so the crown has some thickness where it meets the hair, and
 // the covered button on top
 const rim=[];for(let i=0;i<96;i++)rim.push(crownPoint(i/96*Math.PI*2,0).setY(.01));
 const top=crownPoint(0,1);
 part(group,new T.TubeGeometry(new T.CatmullRomCurve3(rim,true),96,.02,8,true),band,'newsboy-cap-band');
 part(group,new T.SphereGeometry(.055,20,12).scale(1,.3,1).translate(top.x,top.y+.004,top.z),button,'newsboy-cap-button');
 return group;
}
// Fit it to the hair (leaving out a curl), worn the way a cap is: tipped forward, its front a little
// above the eyebrows so the fringe tucks under the crown, the back higher up the head. At every angle
// the band is wide enough that the hair at the band, and above it as high as the crown's wall, stays
// inside it (and where there is no hair, it is outside the head). The crown is made tall enough to
// cover the hair above; the brim keeps its own shape however tall that is, and tips up, a little at
// most, to clear any fringe under it beyond the band's rolled edge.
const PITCH=.2,ROLL=.04,FRONT=.11,local=new T.Vector3();
function place(cap,hair){
 const meshes=fitCrown(cap,hair,{pitch:PITCH,roll:ROLL,front:FRONT,wall:WALL,top:TOP,bulge:BULGE,lean:.2});
 const brim=cap.getObjectByName('newsboy-cap-brim'),k=(cap.scale.x+cap.scale.z)/2/cap.scale.y;
 brim.rotation.set(0,0,0);brim.position.set(0,0,0);brim.scale.set(1,k,1);
 const inverse=cap.matrixWorld.clone().invert();let lift=0;
 for(const m of meshes){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){local.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).applyMatrix4(inverse);
  const a=Math.atan2(local.x,local.z),d=Math.hypot(local.x,local.z)-1;if(d<=.025||Math.abs(a)>=SPAN||d>brimLength(a)+.02)continue;
  const under=k*(brimTop(local.x,d)-brimThick(a,d))-.015;if(local.y>under)lift=Math.max(lift,Math.atan2(local.y-under,d+ROOT));}}
 lift=Math.min(lift,.3);
 if(lift>0){brim.rotation.x=-lift;const pivot=new T.Vector3(0,k*.03,1);brim.position.copy(pivot).sub(pivot.clone().applyEuler(brim.rotation));}
 return lift;
}
export const newsboyCap={
 id:'newsboy-cap',name:'报童帽',slot:'head',wearers:['boy'],hat:true,hidesCurl:true,
 create:build,place,
 colorways:[{id:'oat',name:'燕麦',colors:{main:'#c9b79c',accent:'#7b5d48',trim:'#ad9b80'}},{id:'charcoal',name:'炭灰',colors:{main:'#4b474d',accent:'#2a272b',trim:'#3a373c'}},{id:'caramel',name:'焦糖',colors:{main:'#a56f4a',accent:'#5e3f2d',trim:'#8a5a3b'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M20 70q-2-40 42-42 38 0 40 34z" fill="#c9b79c"/><path d="M28 72q34 14 78-6-8 18-42 18-30 0-36-12z" fill="#b9a68b"/><circle cx="60" cy="28" r="4" fill="#7b5d48"/></svg>'
};
