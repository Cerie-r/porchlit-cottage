// A witch's hat: a tall pointed crown whose tip bends over backwards, a band round its foot with a
// buckle in front, and a wide brim with a soft wave in it, drooping a little at its edge. Made with the
// band (the crown's lower edge) as a circle of radius 1, then fitted round the hairstyle being worn, a
// little above the eyebrows, tipped back a touch. Kept for the capsule machine's Halloween pool.
import * as T from 'three';
import {finish,part,paintPiece,fitCrown,surface} from './accessory-tools.js';

const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
// The crown: out from the band to BULGE by WALL, straight up a little more, then narrowing to the tip at
// HEIGHT, a little hollow as it goes; above BEND the tip leans back and to her left and droops. Up to
// TOP it holds the rounded crown fitCrown measures the hair against, so whatever that keeps under it
// stays under this.
const WALL=.24,TOP=.62,BULGE=1.04,STRAIGHT=.12,HEIGHT=2.5,BEND=1.15,COLS=96,ROWS=44;
function crownRadius(h){
 if(h<=WALL)return 1+(BULGE-1)*smooth(h,0,WALL);
 if(h<=WALL+STRAIGHT)return BULGE;
 const t=(h-WALL-STRAIGHT)/(HEIGHT-WALL-STRAIGHT);return BULGE*Math.max(0,1-t)**1.8;
}
// The crown read up from the band (s 0) to the tip (s 1) and round by angle a (0 in front, pi/2 to
// her left).
function crownPoint(a,s){
 const h=HEIGHT*s,r=crownRadius(h),q=smooth(h,BEND,HEIGHT);
 return new T.Vector3(Math.sin(a)*r+.36*q*q,h-.55*q**3,Math.cos(a)*r-.85*q*q);
}
// The brim, round by angle a and round its section by t: from just inside the band out to its edge
// under it, and back over its top; flat near the crown, drooping and waving towards its edge.
const OUT=1.62,brimDrop=(r,a)=>{const k=smooth(r,1.12,OUT);return -.16*k**1.6+.035*Math.sin(5*a+.6)*k;},brimThick=r=>.03*(1-.45*smooth(r,1,OUT));
function brimPoint(a,t){
 const q=-t*Math.PI*2,c=Math.cos(q),s=Math.sin(q),along=Math.sign(c)*Math.abs(c)**.4,up=Math.sign(s)*Math.abs(s)**.55;
 const r=.97+(OUT-.97)*(1+along)/2;
 return new T.Vector3(Math.sin(a)*r,brimDrop(r,a)+brimThick(r)*up,Math.cos(a)*r);
}
function build(){
 const group=new T.Group();group.name='witch-hat';
 const felt=finish('main','#5b3f7a',{roughness:.95}),band=finish('accent','#2a2430',{roughness:.6}),buckle=finish('trim','#e8823a',{roughness:.45});
 part(group,surface((s,t)=>crownPoint(Math.PI+t*Math.PI*2,s),ROWS,COLS),felt,'witch-hat-crown');
 const brim=surface((u,t)=>brimPoint(Math.PI+u*Math.PI*2,t),COLS,16);
 // where the brim comes round to where it began, both edges take the same normal
 const n=brim.attributes.normal,m=new T.Vector3();for(let j=0;j<=16;j++){const a=j,b=COLS*17+j;m.set(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,m.x,m.y,m.z);n.setXYZ(b,m.x,m.y,m.z);}
 part(group,brim,felt,'witch-hat-brim');
 // the band round the crown's foot, and its buckle in front
 const BAND=.2;
 part(group,surface((s,t)=>{const a=Math.PI+t*Math.PI*2,h=.015+BAND*s;return new T.Vector3(Math.sin(a)*(crownRadius(h)+.022),h,Math.cos(a)*(crownRadius(h)+.022));},6,COLS),band,'witch-hat-band');
 const frame=new T.TorusGeometry(.085,.022,6,4).rotateZ(Math.PI/4).scale(1,1.25,1).translate(0,.015+BAND/2,crownRadius(.1)+.04);
 part(group,frame,buckle,'witch-hat-buckle');
 return group;
}
// Fit it to the hair (leaving out a curl). The brim keeps its own shape however tall the crown is made.
const PITCH=-.06,ROLL=.07,FRONT=.13;
function place(hat,hair){
 fitCrown(hat,hair,{pitch:PITCH,roll:ROLL,front:FRONT,wall:WALL,top:TOP,bulge:BULGE,margin:.1});
 const k=(hat.scale.x+hat.scale.z)/2/hat.scale.y;
 for(const name of ['witch-hat-brim','witch-hat-buckle'])hat.getObjectByName(name).scale.set(1,k,1);
}
export const witchHat={
 id:'witch-hat',name:'魔女帽',slot:'head',wearers:['girl'],hat:true,hidesCurl:true,pool:'halloween',
 create:build,place,
 colorways:[{id:'violet',name:'紫夜',colors:{main:'#5b3f7a',accent:'#2a2430',trim:'#e8823a'}},{id:'ink',name:'墨黑',colors:{main:'#2b2630',accent:'#5b3f7a',trim:'#e8823a'}},{id:'candy',name:'糖果',colors:{main:'#c7a6e0',accent:'#4a3a5c',trim:'#f4a76b'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M8 88q52-22 104 0-52 16-104 0z" fill="#5b3f7a"/><path d="M38 84 58 22q6-14 22-10-14 4-14 16l12 56z" fill="#5b3f7a"/><path d="M37 74q24 6 46 0l2 10q-25 6-50 0z" fill="#2a2430"/><rect x="54" y="72" width="12" height="12" rx="2" fill="none" stroke="#e8823a" stroke-width="3"/></svg>'
};
