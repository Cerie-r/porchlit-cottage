// A bow tie: two soft satin wings pinched into a little knot, worn at the collar, under the chin. The
// wings are pillows, fuller in the middle than at their edges, wider out at their ends than at the
// knot, each end with a little notch; they droop a touch and curve back round the neck. Worn in place
// of a necktie: an outfit's part named 'tie' is hidden while it is on (see body/accessories.js).
import * as T from 'three';
import {finish,part,paintPiece,surface,wornSurfaces,chestAt,crossings} from './accessory-tools.js';

const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
const sp=(v,p)=>Math.sign(v)*Math.abs(v)**p;
const KNOT=.009,TIP=.062,SIZE=1.05;
// A wing on the side given (+1 to his left), read out from the knot (u 0) to its end (u 1) and round
// its section by t.
function wingPoint(side,u,t){
 const q=side*t*Math.PI*2,c=Math.cos(q),s=Math.sin(q);
 const h=.01+.018*smooth(u,0,.85)+.004*Math.sin(Math.PI*u),y=h*sp(c,.55),edge=(y/h)**2;
 const thick=.0085*Math.sqrt(Math.max(0,1-u**5))*(1-.4*u)*(1+.5*(1-edge));
 const x=KNOT+(TIP-KNOT)*u-.007*u**4*(1-edge);
 return new T.Vector3(side*x,y-.004*u,thick*sp(s,.7)-1.2*x*x);
}
function build(){
 const group=new T.Group();group.name='bow-tie';
 const satin=finish('main','#8e3a49',{roughness:.42}),knot=finish('accent','#7a2f3d',{roughness:.42});
 part(group,surface((u,t)=>wingPoint(1,u,t),28,36),satin,'bow-tie-wing');
 part(group,surface((u,t)=>wingPoint(-1,u,t),28,36),satin,'bow-tie-wing');
 part(group,new T.SphereGeometry(1,24,16).scale(.0125,.0145,.0105).translate(0,0,.002),knot,'bow-tie-knot');
 return group;
}
// Where it goes: at the top of the collar in front, as high as it fits under the chin. Looking down
// the middle of the front, the highest cloth there is the collar; on an open neck there is none, and
// it sits at the bottom of the neck instead. It faces forward, following what is under it a little.
const REACH=new T.Box3(new T.Vector3(-.25,1.2,-.1),new T.Vector3(.25,1.45,.7));
function place(tie,hair,worn){
 if(!worn)return;
 const surfaces=wornSurfaces(worn,REACH),u=hair.scale.x,c=hair.position,r=new T.Vector3(.43,.365,.34).multiplyScalar(u);
 // how low the head comes at x, z
 const chin=(x,z)=>{const q=1-((x-c.x)/r.x)**2-((z-c.z)/r.z)**2;return q>0?c.y-r.y*Math.sqrt(q):Infinity;};
 const fits=at=>[[-1,1],[1,1],[0,1]].every(([k,v])=>at.point.y+.032*SIZE*v<chin(at.point.x+k*TIP*SIZE,at.point.z+.02)-.004);
 let collar=null;
 for(let y=1.4;y>=1.3;y-=.005){const at=chestAt(surfaces,0,y,.01);if(at&&!at.skin){collar=y;break;}}
 let at=null;
 for(let y=Math.min(1.385,collar===null?1.37:collar-.014);y>=1.3&&!at;y-=.005){const here=chestAt(surfaces,0,y,.045);if(here&&fits(here))at=here;}
 if(!at)return;
 const normal=at.normal.clone().add(new T.Vector3(0,0,1.5)).normalize(),x=new T.Vector3(0,1,0).cross(normal).normalize(),yAxis=normal.clone().cross(x).normalize();
 tie.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,yAxis,normal));
 tie.position.copy(at.point).addScaledVector(normal,.012);tie.scale.setScalar(SIZE);
 // and forward of anything under it that comes further out (the chest below a neckline): nothing
 // worn is in front of what faces forward
 tie.updateMatrixWorld(true);let push=0;const v=new T.Vector3(),n=new T.Vector3(),ahead=new T.Vector3(0,0,1);
 tie.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,nor=m.geometry.attributes.normal;
  for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i).transformDirection(m.matrixWorld);if(n.z<.3)continue;v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);const hit=crossings(surfaces,v,ahead,.05)[0];if(hit)push=Math.max(push,hit.distance+.003);}});
 tie.position.z+=push;
}

export const bowTie={
 id:'bow-tie',name:'领结',slot:'neck',wearers:['boy'],covers:['tie'],
 create:build,place,
 colorways:[{id:'wine',name:'酒红',colors:{main:'#8e3a49',accent:'#7a2f3d'}},{id:'ink',name:'墨黑',colors:{main:'#2b2629',accent:'#231f22'}},{id:'mist',name:'雾蓝',colors:{main:'#8fa9c9',accent:'#7d97b8'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M54 60 24 40q-6 20 0 40zm12 0 30-20q6 20 0 40z" fill="#8e3a49"/><rect x="52" y="51" width="16" height="18" rx="6" fill="#7a2f3d"/></svg>'
};
