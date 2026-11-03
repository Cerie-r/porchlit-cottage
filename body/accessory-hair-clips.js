// A pair of snap clips: two little open frames, rounded and tapering, one in each of two colours, clipped
// side by side into the hair above her left temple, pointing up towards the back. Each is bent round
// the head and rests on the hair of the hairstyle being worn, lifted just clear of it.
import * as T from 'three';
import {finish,part,paintPiece,reachOf,hairPoints,angles,restOnReach,onHead} from './accessory-tools.js';

const L=.155,W=.025,DEPTH=.0055,BEND=1/(2*.47);
// The clip's outline, its wide hinge end towards -x: half as wide at its tip, both ends round.
function outline(scaleX,scaleY){
 const s=new T.Shape(),n=40,pts=[];
 for(let i=0;i<=n;i++){const t=i/n*Math.PI*2,c=Math.cos(t),sn=Math.sin(t),x=L/2*scaleX*Math.sign(c)*Math.abs(c)**.55,w=W*scaleY*(1-.5*(x/(L/2)+1)/2);pts.push(new T.Vector2(x,w*Math.sign(sn)*Math.abs(sn)**.7));}
 s.setFromPoints(pts);return s;
}
function clip(){
 const shape=outline(1,1);shape.holes.push(new T.Path(outline(.72,.42).getPoints().reverse()));
 const g=new T.ExtrudeGeometry(shape,{depth:DEPTH,bevelEnabled:true,bevelSize:.0024,bevelThickness:.0022,bevelSegments:2,curveSegments:6});
 const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,p.getZ(i)-BEND*x*x);}
 g.computeVertexNormals();return g;
}
// Where they go, by angle round the head (0 straight ahead, pi/2 to her left) and elevation, how they
// are turned from lying level, and the second one's place below the first.
const AT=[.9,.46],TURN=.5,APART=.054;
function build(){
 const group=new T.Group();group.name='hair-clips';
 const one=finish('main','#f2b8c6',{roughness:.3}),two=finish('accent','#b9d4ef',{roughness:.3});
 part(group,clip(),one,'hair-clip-one');part(group,clip(),two,'hair-clip-two');
 return group;
}
function place(clips,hair){
 const reach=reachOf(hairPoints(hair),{A:240,E:120,spread:1,smoothing:0}),size={length:L,width:W*2,turn:TURN,bend:BEND,lift:.0035};
 const first=restOnReach(reach,...AT,size),down=new T.Vector3(0,-1,0).applyQuaternion(first.quaternion),second=restOnReach(reach,...angles(first.point.clone().addScaledVector(down,APART)),size);
 for(const [name,at] of [['hair-clip-one',first],['hair-clip-two',second]]){const m=clips.getObjectByName(name);m.position.copy(at.point);m.quaternion.copy(at.quaternion);}
 onHead(clips,hair);
}

export const hairClips={
 id:'hair-clips',name:'发夹',slot:'head',wearers:['girl'],
 create:build,place,
 colorways:[{id:'sweet',name:'粉蓝',colors:{main:'#f2b8c6',accent:'#b9d4ef'}},{id:'lemon',name:'柠檬',colors:{main:'#f3dc8e',accent:'#f7f3ea'}},{id:'mint',name:'薄荷',colors:{main:'#b8dfcf',accent:'#f6c9a8'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><g fill="none" stroke-width="9" stroke-linejoin="round"><path d="M22 58 96 36 98 44 26 72z" stroke="#f2b8c6"/><path d="M24 80 98 58 100 66 28 94z" stroke="#b9d4ef"/></g></svg>'
};
