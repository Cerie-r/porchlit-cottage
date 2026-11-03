import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {hairsFor,hairById,baseHairFor,wornHair,makeHair,hideCurl} from '../body/hair-registry.js';
import {publicHairs} from '../body/hair-pieces.js';
import {createAccessories,placeAccessories} from '../body/accessories.js';
import {cleanWardrobe} from '../body/wardrobe-state.js';
import {weightsAt} from '../body/avatar-rig.js';
import {shell,place,smooth,bump} from '../body/hair-tools.js';

// The hairstyles out of the capsule machine, beyond the base two.
const drawn=publicHairs;

test('each resident has a base hairstyle, and a look keeps only one its resident may wear',()=>{
 assert.equal(hairsFor('girl')[0],'classic');assert.equal(hairsFor('boy')[0],'short');
 assert.equal(baseHairFor('girl'),'classic');assert.equal(baseHairFor('boy'),'short');
 assert.equal(wornHair('boy',{hair:'classic'}),'short');assert.equal(wornHair('girl',{}),'classic');
 const w=cleanWardrobe({girl:{hair:'short'},boy:{hair:'nonsense'}});
 assert.equal(w.girl.hair,undefined,'not his hair on her');assert.equal(w.boy.hair,undefined,'not an unknown one');
 assert.equal(cleanWardrobe({girl:{hair:'classic'}}).girl.hair,undefined,'the base one is not written down');
 for(const h of drawn)assert.equal(cleanWardrobe({[h.wearers[0]]:{hair:h.id}})[h.wearers[0]].hair,h.id);
 assert.deepEqual(hairsFor('girl'),['classic','braids','straight','waves','waves-curtain']);
 assert.deepEqual(hairsFor('boy'),['short','center','slick','leafy','roll']);
});

test('a hair shell is closed at its hem: the lip from the outer surface round to the inner one faces out',()=>{
 const cols=60,g=shell({lift:()=>.04,edge:()=>1.3,cols,rows:12,under:4}),p=g.attributes.position,ix=g.index.array,count=ix.length/3;
 const crown=place(0,0,.04,0,0),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3(),m=new T.Vector3();
 // the lip is the last row of triangles; seen from below the hem it must be a front face
 for(let k=count-cols*2;k<count;k++){
  a.fromBufferAttribute(p,ix[3*k]);b.fromBufferAttribute(p,ix[3*k+1]);c.fromBufferAttribute(p,ix[3*k+2]);
  n.subVectors(c,b).cross(m.subVectors(a,b));
  assert.ok(n.dot(a.clone().add(b).add(c).divideScalar(3).sub(crown))>0,'the lip faces away from the crown');
 }
});

test('a hair shell can crowd its columns somewhere and still closes round the back of the head',()=>{
 const opts={lift:()=>.04,edge:a=>1.2+.6*smooth(Math.abs(a),.7,1.1),cols:90,rows:12,under:4};
 const even=shell(opts),same=shell({...opts,density:()=>1}),crowded=shell({...opts,density:a=>1+3*bump(Math.abs(a),.9,.15)});
 const p=even.attributes.position,q=same.attributes.position;
 assert.equal(q.count,p.count);for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getX(i)-q.getX(i))+Math.abs(p.getY(i)-q.getY(i))+Math.abs(p.getZ(i)-q.getZ(i))<1e-9);
 // the first and last columns meet at the back and are welded, so no extra points are left there
 assert.equal(crowded.attributes.position.count,p.count);
});

test('a hair shell with a jagged hem can keep its rows level all round',()=>{
 const cols=40,rows=20,rim=4,rimDepth=.1,edge=a=>1.4+.3*Math.abs(Math.sin(3*a));
 const g=shell({lift:()=>.04,edge,cols,rows,under:2,level:1.8,rim,rimDepth}),p=g.attributes.position;
 // read the points back by their height on the head: y = .03 + (.425 + .7 d) cos t, with d = .04 away from the hem
 const tOf=y=>Math.acos((y-.03)/(.425+.7*.04));
 const heights=new Set();
 for(let i=0;i<p.count;i++){const t=tOf(p.getY(i));if(t<1.3)heights.add(t.toFixed(4));}
 // above every column's rim the rows sit at the same few heights all round (spread to each column's
 // own edge, these would be well over a hundred)
 assert.ok(heights.size<=Math.ceil((rows-rim)*1.3/1.8)+2,`${heights.size} different heights`);
});

test('every hairstyle sits on the head, keeps the eyes clear, moves with the body and takes its headwear',()=>{
 const head=new T.Box3(new T.Vector3(-1.156,1.395,-.948),new T.Vector3(1.155,3.357,.88)),s=head.getSize(new T.Vector3()).x/.86,c=head.getCenter(new T.Vector3());
 for(const kind of ['girl','boy'])for(const id of hairsFor(kind)){
  const material=new T.MeshStandardMaterial(),hair=makeHair(id,material,head);hair.updateWorldMatrix(true,true);
  assert.equal(hair.userData.hairStyle,id);assert.ok(Math.abs(hair.scale.x-s)<1e-9);
  let tris=0;const v=new T.Vector3();
  hair.traverse(o=>{if(!o.isMesh)return;
   assert.equal(o.material,material,`${id}: one material, so the hair colour reaches every part`);
   // The rig weighs a mesh by its name; hair must match none of its leg, arm or skirt rules.
   for(const [x,y] of [[.5,.5],[.4,1]])assert.deepEqual(weightsAt(x,y,0,o.name),[[0,1]],`${id}: ${o.name} moves with the body, not the legs or arms`);
   const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;tris+=(o.geometry.index?o.geometry.index.count:p.count)/3;
   for(let i=0;i<p.count;i++){
    assert.ok(Number.isFinite(n.getX(i)+n.getY(i)+n.getZ(i)),`${id}: a real normal`);
    v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
    // Back in head units: nothing in front of the eyes, ovals at x ±.165, y -.087, .077 by .085 (body/face.js).
    const x=(v.x-c.x)/s,y=(v.y-c.y)/s,z=(v.z-c.z)/s;
    if(z>.2)assert.ok(((Math.abs(x)-.165)/.077)**2+((y+.087)/.085)**2>1,`${id}: hair over an eye at ${[x,y,z].map(q=>q.toFixed(3))}`);
   }
  });
  assert.ok(tris<60000,`${id}: ${tris} triangles`);
  const box=new T.Box3().setFromObject(hair);assert.ok(box.max.y>head.max.y,`${id}: over the crown`);
  const hats=createAccessories();placeAccessories(hats,hair);
  for(const hat of Object.values(hats))assert.ok([hat.position.x,hat.position.y,hat.position.z,hat.scale.x].every(Number.isFinite));
  assert.ok(hats.bow.position.y>c.y&&hats.bow.position.z>c.z,`${id}: the bow sits on the front of the hair`);
  hideCurl(hair,true);hair.traverse(o=>{if(o.isMesh&&/-curl$/.test(o.name))assert.equal(o.visible,false);});
 }
 assert.ok(hairById('braids')&&hairsFor('girl').length>1&&hairsFor('boy').length>1);
});
