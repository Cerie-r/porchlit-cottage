import * as T from 'three';
const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
// The middle of the hips, in the pelvis's frame: leaning and tilting turn the body about it.
const HIPS=new T.Vector3(0,.85,.1),hips=new T.Vector3();
// Weight existing vertices; never cut away body or garment triangles.
export function weightsAt(x,y,z,name){
 const sleeve=/sleeve|cuff/.test(name),leg=/trouser|shoe|sole/.test(name)&&name!=='trouser-waist';
 const skin=name==='purchased-body';
 if(sleeve||(skin&&Math.abs(x)>.34&&y>.65&&y<1.43)){
  const side=x<0?0:1,w=sleeve?1:smooth(.32,.45,Math.abs(x));
  return [[0,1-w],[5+side,w]];
 }
 const cloth=/dress|hem|stitch/.test(name);
 if((skin||leg||cloth||name==='open-coat'||name==='seam')&&y<.96){
  const lower=leg?1:1-smooth(.80,.96,y),knee=1-smooth(.36,.52,y),right=smooth(-.055,.055,x);
  const pairs=[[0,1-lower],[1,lower*(1-right)*(1-knee)],[2,lower*(1-right)*knee],[3,lower*right*(1-knee)],[4,lower*right*knee]];
  return pairs.filter(([,w])=>w>1e-6).sort((a,b)=>b[1]-a[1]).slice(0,4);
 }
 return [[0,1]];
}
export function rigAvatar(root){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),entries=[],discard=[];
 root.traverse(o=>{if(!o.isMesh)return;let visible=true;for(let p=o;p&&p!==root;p=p.parent)if(!p.visible)visible=false;if(!visible){discard.push(o);return;}
  const matrix=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld);o.geometry.applyMatrix4(matrix);entries.push(o);
 });
 root.clear();const bones=[];
 function bone(name,p,parent){const b=new T.Bone();b.name=name;b.position.set(...p);(parent||root).add(b);bones.push(b);return b;}
 const pelvis=bone('motion-pelvis',[0,0,0]);
 const left=bone('motion-hip-left',[-.19,.85,.10],pelvis);bone('motion-knee-left',[0,-.42,0],left);
 const right=bone('motion-hip-right',[.19,.85,.10],pelvis);bone('motion-knee-right',[0,-.42,0],right);
 // Undoing the body's tilt first, then swinging the leg: the legs stay put when the body tilts.
 left.rotation.order=right.rotation.order='ZYX';
 bone('motion-shoulder-left',[-.23,1.315,0],pelvis);bone('motion-shoulder-right',[.23,1.315,0],pelvis);
 const skeleton=new T.Skeleton(bones);
 for(const source of entries){const g=source.geometry,p=g.attributes.position,indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);
  for(let i=0;i<p.count;i++){const pairs=weightsAt(p.getX(i),p.getY(i),p.getZ(i),source.name),sum=pairs.reduce((a,b)=>a+b[1],0);pairs.forEach(([index,w],j)=>{indices[i*4+j]=index;weights[i*4+j]=w/sum;});}
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  const mesh=new T.SkinnedMesh(g,source.material);mesh.name=source.name;mesh.castShadow=true;mesh.receiveShadow=false;mesh.frustumCulled=false;root.add(mesh);
 }
 root.updateMatrixWorld(true);skeleton.calculateInverses();root.children.filter(o=>o.isSkinnedMesh).forEach(o=>o.bind(skeleton,o.matrixWorld));
 const usedMaterials=new Set(entries.flatMap(o=>[o.material].flat()));discard.forEach(o=>{o.geometry.dispose();[o.material].flat().forEach(m=>{if(!usedMaterials.has(m))m.dispose();});});
 // arms, when given: [left forward, left out, right forward, right out], on top of the rest (holding
 // someone, hands on a lap). tilt: the body sideways about the hips (towards -x is positive), as in peeking
 // past someone or leaning a head on a shoulder; the legs stay as they are. reach, when given: [left, right],
 // how much longer an arm is stretched (about its shoulder), for short arms reaching someone's hand.
 const rig={root,skeleton,bones,pose({phase=0,amount=0,sit=0,wave=0,crouch=0,lean=0,tilt=0,arms=null,reach=null}={}){
  const stride=Math.sin(phase)*.36*amount;
  // Crouching: thighs come up (a), knees fold (b). The hips drop to where the
  // folded legs still reach the floor, and move back so the feet stay put.
  const a=crouch*2,b=crouch*2.45,thigh=.42,shin=.43;
  const hipHeight=thigh*Math.cos(a)+shin*Math.cos(a-b),feet=thigh*Math.sin(a)+shin*Math.sin(a-b);
  // Leaning turns the body forward about the hips, tilting turns it sideways; the legs keep their angle.
  pelvis.rotation.set(lean,0,tilt);
  bones[1].rotation.x=-sit*1.48+stride-a-lean;bones[3].rotation.x=-sit*1.48-stride-a-lean;
  bones[1].rotation.z=bones[3].rotation.z=-tilt;
  bones[2].rotation.x=sit*1.48+b+Math.max(0,-Math.sin(phase))*.5*amount*(1-sit);
  bones[4].rotation.x=sit*1.48+b+Math.max(0,Math.sin(phase))*.5*amount*(1-sit);
  bones[5].rotation.x=-stride*.65-sit*.35-crouch*.5+(arms?arms[0]:0);bones[6].rotation.x=stride*.65-sit*.35-crouch*.5+(arms?arms[2]:0);
  bones[5].rotation.z=arms?arms[1]:0;bones[6].rotation.z=wave*(-1.45+.15*Math.sin(phase*2))+(arms?arms[3]:0);
  bones[5].scale.setScalar(1+(reach?reach[0]:0));bones[6].scale.setScalar(1+(reach?reach[1]:0));
  // The middle of the hips stays where the legs put it, however the body is turned about it. Tilted,
  // one hip rises and the other drops: standing, the body comes up so the lower foot stays on the floor.
  hips.copy(HIPS).applyEuler(pelvis.rotation);
  pelvis.position.set(-hips.x,hipHeight-hips.y+Math.abs(Math.sin(phase))*.035*amount*(1-sit)+Math.abs(Math.sin(tilt))*.19*(1-sit),.1-feet-hips.z);
 }};
 // Measure the seated pelvis on the preserved body, rather than its joint pivot.
 rig.pose({sit:1});root.updateMatrixWorld(true);skeleton.update();
 const body=root.children.find(o=>o.isSkinnedMesh&&o.name==='purchased-body'),samples=[];
 if(!body)throw Error('Avatar body is required for seat contact');
 const p=body.geometry.attributes.position;
 for(let i=0;i<p.count;i++){if(Math.abs(p.getX(i))>.30||p.getY(i)<.66||p.getY(i)>.88)continue;const v=body.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(p,i));samples.push(v);}
 const lowest=Math.min(...samples.map(v=>v.y)),contact=samples.filter(v=>v.y<lowest+.025);
 if(!contact.length)throw Error('Avatar seat contact could not be measured');
 rig.seatContact=new T.Vector3(0,lowest,contact.reduce((sum,v)=>sum+v.z,0)/contact.length).multiplyScalar(root.scale.x);
 rig.pose();root.updateMatrixWorld(true);skeleton.update();return rig;
}
