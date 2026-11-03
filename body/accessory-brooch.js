// A brooch: a little crescent moon in polished metal, a tiny star hanging from its lower tip on three
// links of chain. Worn high on his right chest, on the lapel where there is one, standing on whatever
// is there (it moves over to cloth if that spot is bare skin).
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {finish,part,paintPiece,wornSurfaces,onCloth,standOn,metalFinish} from './accessory-tools.js';

const REACH=new T.Box3(new T.Vector3(-.4,1.0,-.1),new T.Vector3(.4,1.42,.7));
const bevel={bevelEnabled:true,bevelSize:.0022,bevelThickness:.0022,bevelSegments:3,curveSegments:24};
function moon(){
 const s=new T.Shape(),R=.024,r=.02,off=.011;
 s.absarc(0,0,R,Math.PI*.25,Math.PI*1.75,false);
 // the inner edge, a smaller circle a little to the side, back the other way
 s.absarc(off,.002,r,-Math.PI*.62,Math.PI*.62,true);
 const g=new T.ExtrudeGeometry(s,{depth:.004,...bevel});g.translate(0,0,-.002);g.rotateZ(.5);return g;
}
function star(){
 const s=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.0045:.0105;i?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
 return new T.ExtrudeGeometry(s,{depth:.003,bevelEnabled:true,bevelSize:.0012,bevelThickness:.0012,bevelSegments:2});
}
function build(){
 const group=new T.Group();group.name='moon-brooch';
 const metal=metalFinish('main','#d9b56a'),gem=finish('accent','#f6efe2',{roughness:.25});
 part(group,moon(),metal,'moon-brooch-moon');
 // the moon's lower tip, three links down from it, and the star
 const tip=new T.Vector3(.004,-.021,.002),links=[0,1,2].map(i=>new T.SphereGeometry(.0024,8,6).translate(tip.x+.0015*i,tip.y-.004-.0045*i,tip.z));
 part(group,mergeGeometries(links),metal,'moon-brooch-chain');
 part(group,star().translate(tip.x+.004,tip.y-.026,0),gem,'moon-brooch-star');
 return group;
}
function place(brooch,hair,worn){
 if(!worn)return;
 const places=[];for(const y of [1.24,1.22,1.26,1.2,1.18])for(const x of [-.13,-.15,-.17,-.19,-.11])places.push([x,y]);
 const at=onCloth(wornSurfaces(worn,REACH),places,.042);
 if(at)standOn(brooch,at,.006,1.45);
}

export const moonBrooch={
 id:'moon-brooch',name:'月亮胸针',slot:'chest',wearers:['boy'],
 create:build,place,
 colorways:[{id:'gold',name:'金',colors:{main:'#d9b56a',accent:'#f6efe2'}},{id:'silver',name:'银',colors:{main:'#c9ccd1',accent:'#bcd3ea'}},{id:'rose',name:'玫瑰金',colors:{main:'#d9a08f',accent:'#f4d9de'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M70 30a30 30 0 1 0 14 48 24 24 0 1 1-14-48z" fill="#d9b56a"/><path d="m58 84 4 8 8 1-6 6 2 8-8-4-7 4 2-8-6-6 8-1z" fill="#f6efe2"/></svg>'
};
