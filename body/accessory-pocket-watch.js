// A pocket watch: a round case in polished metal with a cream face and two little hands, a crown and a
// bow on top, hanging on a fine chain that runs in a soft dip over the front of the outfit to a bar by
// the buttons. (His outfits have no waistcoat to button it to.) Worn on his right, low on the chest:
// the watch stands on whatever is there, and the chain is laid over it each time.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {finish,part,paintPiece,wornSurfaces,onCloth,standOn,chestAt,metalFinish} from './accessory-tools.js';

const REACH=new T.Box3(new T.Vector3(-.4,.98,-.1),new T.Vector3(.4,1.42,.7));
const SIZE=1.25,R=.022;
function watch(group,metal,hands){
 // the case: a lathe of a rounded rim and a slightly domed back, the face set into its front
 const profile=[[0,-.0045],[.012,-.005],[.02,-.0042],[R,-.002],[R+.001,0],[R,.0024],[.0205,.0042],[.0185,.0044]].map(([r,z])=>new T.Vector2(r,z));
 const shell=new T.LatheGeometry(profile,40).rotateX(Math.PI/2);
 const crown=new T.CylinderGeometry(.0034,.0034,.006,12).translate(0,R+.003,0),bow=new T.TorusGeometry(.0052,.0013,6,16).translate(0,R+.0105,0);
 part(group,mergeGeometries([shell,crown,bow]),metal,'pocket-watch-case');
 part(group,new T.CircleGeometry(.0186,40).translate(0,0,.0036),finish('fixed','#fbf6ec',{roughness:.5}),'pocket-watch-face');
 const marks=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2;marks.push(new T.BoxGeometry(.0012,i%3?.0022:.004,.0006).translate(0,.0155,0).rotateZ(a).translate(0,0,.0041));}
 marks.push(new T.BoxGeometry(.0014,.0105,.0008).translate(0,.005,.0046).rotateZ(-.9),new T.BoxGeometry(.0012,.0145,.0008).translate(0,.007,.0049).rotateZ(.55),new T.CylinderGeometry(.0016,.0016,.001,10).rotateX(Math.PI/2).translate(0,0,.005));
 part(group,mergeGeometries(marks),hands,'pocket-watch-hands');
}
function build(){
 const group=new T.Group();group.name='pocket-watch';
 const metal=metalFinish('main','#d9b56a'),hands=finish('accent','#3a3438',{roughness:.6});
 const body=new T.Group();body.name='pocket-watch-body';group.add(body);watch(body,metal,hands);
 // the chain, laid out here as it hangs on its own; placing it lays it over the outfit
 part(group,chainGeometry([new T.Vector3(0,R*SIZE+.012,0),new T.Vector3(.04,.05,.004),new T.Vector3(.09,.07,0)]),metal,'pocket-watch-chain');
 return group;
}
// A chain of little beads along a curve, and a short bar at its far end.
function chainGeometry(points){
 const curve=new T.CatmullRomCurve3(points),n=Math.max(8,Math.round(curve.getLength()/.0042)),beads=[];
 for(let i=0;i<=n;i++)beads.push(new T.SphereGeometry(.0021,6,5).translate(...curve.getPointAt(i/n).toArray()));
 const end=curve.getPointAt(1),dir=curve.getTangentAt(1);
 beads.push(new T.CylinderGeometry(.0018,.0018,.016,8).rotateZ(Math.PI/2).translate(end.x+dir.x*.004,end.y+dir.y*.004,end.z));
 return mergeGeometries(beads);
}
// Where the chain's far end goes, from the watch standing at at: up towards the middle by the buttons,
// or, where that is bare (an open shirt), the nearest cloth back towards the watch, as long as that
// leaves some chain.
function chainEnd(surfaces,at){
 const tx=-.03,ty=at.point.y+.075;
 for(let k=0;k<=12;k++){const x=tx+(at.point.x-tx)*k/12,y=ty+(at.point.y+.03-ty)*k/12;if(Math.abs(x-at.point.x)<.05)break;
  const on=chestAt(surfaces,x,y,.006);if(on&&!on.skin)return on;}
 return null;
}
function place(piece,hair,worn){
 if(!worn)return;
 const surfaces=wornSurfaces(worn,REACH),places=[];
 for(const y of [1.12,1.14,1.1,1.16])for(const x of [-.12,-.14,-.1,-.16,-.18])places.push([x,y]);
 // the first smooth place on cloth with somewhere for the chain to go; failing that, the first smooth
 // place on cloth, and the chain goes where it can
 let at=null,end=null;
 for(const [x,y] of places){const here=chestAt(surfaces,x,y,.035);if(!here||here.skin||!here.flat)continue;const to=chainEnd(surfaces,here);if(to){at=here;end=to;break;}}
 if(!at){at=onCloth(surfaces,places,.035);if(!at)return;end=chainEnd(surfaces,at)||chestAt(surfaces,-.03,at.point.y+.075);}
 // the group stays where it was made; the watch itself stands on the outfit
 piece.position.set(0,0,0);piece.quaternion.identity();piece.scale.setScalar(1);
 const body=piece.getObjectByName('pocket-watch-body');standOn(body,at,.006,SIZE);
 // from the bow on top of the watch, a soft dip across, up to a bar at the far end; every link lies
 // on whatever is under it, over any edge it crosses
 body.updateMatrixWorld(true);const from=new T.Vector3(0,R+.0105,0).applyMatrix4(body.matrixWorld);
 const to=end?end.point.clone().addScaledVector(end.normal,.005):from.clone().add(new T.Vector3(.09,.07,0)),pts=[],N=24;
 for(let i=0;i<=N;i++){const t=i/N,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t-.028*Math.sin(Math.PI*t),on=chestAt(surfaces,x,y,.006);
  pts.push(on?on.point.clone().addScaledVector(on.normal,.0045):new T.Vector3(x,y,from.z+(to.z-from.z)*t));}
 pts[0]=from;pts[N]=to;
 const chain=piece.getObjectByName('pocket-watch-chain');chain.geometry.dispose();chain.geometry=chainGeometry(pts);
}

export const pocketWatch={
 id:'pocket-watch',name:'怀表',slot:'chest',wearers:['boy'],
 create:build,place,
 colorways:[{id:'gold',name:'金',colors:{main:'#d9b56a',accent:'#3a3438'}},{id:'silver',name:'银',colors:{main:'#c9ccd1',accent:'#2f3a57'}},{id:'rose',name:'玫瑰金',colors:{main:'#d9a08f',accent:'#5e3f2d'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><circle cx="46" cy="70" r="22" fill="#d9b56a"/><circle cx="46" cy="70" r="17" fill="#fbf6ec"/><path d="M46 70V58m0 12 8 5" stroke="#3a3438" stroke-width="3"/><path d="M46 46q20 30 50-10" fill="none" stroke="#d9b56a" stroke-width="3"/></svg>'
};
