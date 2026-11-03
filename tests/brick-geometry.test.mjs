import assert from 'node:assert/strict';
import {PARTS,PLATE,BASE,footprint} from '../src/brick-recipe.js';
import {partGeometry,localStuds,studsInBuild,placeOf,buildFrame,STUD_SIZE} from '../src/brick-geometry.js';

// Every size of every part makes a real shape that stays inside its footprint
// and its height, centred on the footprint and standing on the floor.
let made=0;
for(const [p,spec] of Object.entries(PARTS))for(const [w,d] of spec.sizes)for(const h of spec.heights)for(const profile of spec.profiles?Object.keys(spec.profiles):[undefined]){
 const g=partGeometry({p,w,d,h,profile}),pos=g.attributes.position;
 assert.ok(pos&&pos.count>0,`${p} ${w}x${d}x${h} has vertices`);
 assert.ok(Array.from(pos.array).every(Number.isFinite),`${p} ${w}x${d}x${h} has no broken numbers`);
 g.computeBoundingBox();const b=g.boundingBox,e=.03,H=h*PLATE;
 assert.ok(b.min.x>=-w/2-e&&b.max.x<=w/2+e,`${p} ${w}x${d}x${h}${profile?' '+profile:''} stays within its width (${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)})`);
 assert.ok(b.min.z>=-d/2-e&&b.max.z<=d/2+e,`${p} ${w}x${d}x${h}${profile?' '+profile:''} stays within its depth (${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)})`);
 assert.ok(b.min.y>=-e&&b.max.y<=H+e,`${p} ${w}x${d}x${h} stands on the floor and stays under its height (${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)} of ${H})`);
 assert.ok(b.max.y-b.min.y>.05,`${p} ${w}x${d}x${h} is not flat as paper`);
 made++;
}
assert.ok(made>60,`made ${made} shapes`);

// A curve's round edge sits at its own +x +z corner (the starter lamp's base relies on it).
const q=partGeometry({p:'curve',w:2,d:2,h:1}).attributes.position;let far=0,near=0;
for(let i=0;i<q.count;i++){const x=q.getX(i),z=q.getZ(i);if(x>.9&&z>.9)far++;if(x<-.9&&z<-.9)near++;}
assert.equal(far,0,'nothing reaches the far corner, where the edge is rounded');
assert.ok(near>0,'the square corner is filled');

// A slope is high at the back (-z) and low at the front.
const sl=partGeometry({p:'slope',w:2,d:2,h:3}).attributes.position;let backTop=0,frontTop=0;
for(let i=0;i<sl.count;i++){const z=sl.getZ(i),y=sl.getY(i);if(z<-.5)backTop=Math.max(backTop,y);if(z>.9)frontTop=Math.max(frontTop,y);}
assert.ok(backTop>1.1&&frontTop<.3,'slopes down towards the front');

// Studs: on every stud of the top, only the back row of a slope, none on smooth parts.
assert.equal(localStuds({p:'brick',w:2,d:4,h:3}).length,8);
assert.equal(localStuds({p:'slope',w:2,d:3,h:3}).length,2);
assert.equal(localStuds({p:'arch',w:6,d:1,h:6}).length,6);
for(const p of ['tile','disc','lathe','drape','flower','leaf','curve','fence'])assert.equal(localStuds({p,w:2,d:2,h:3}).length,0,`${p} is smooth`);

// Turned or flipped, studs still land on the part's own footprint, on its top.
for(const turn of [0,1,2,3])for(const flip of [false,true]){
 const part={p:'slope',x:3,y:2,z:5,w:2,d:3,h:3,turn,flip},f=footprint(part);
 for(const [x,y,z] of studsInBuild(part)){
  const gx=x+BASE/2,gz=z+BASE/2;
  assert.ok(gx>f.x&&gx<f.x+f.w&&gz>f.z&&gz<f.z+f.d,`stud inside the footprint (turn ${turn}, flip ${flip})`);
  assert.ok(Math.abs(y-(f.y+f.h)*PLATE)<1e-9,'on the top');
 }
}
const c=placeOf({p:'brick',x:0,y:3,z:0,w:1,d:2,h:3,turn:1});
assert.deepEqual(c,[1-BASE/2,3*PLATE,.5-BASE/2],'a part is placed at the middle of its footprint, at its bottom');

// A whole build as an object: furniture at the house's size, small things the
// old size, shrunk to fit a slot but never blown up, filled out for a preview.
const wide=[{p:'plate',x:0,y:0,z:4,w:8,d:8,h:1,turn:0,c:'cream'},{p:'plate',x:8,y:0,z:4,w:8,d:8,h:1,turn:0,c:'cream'}];
const big=buildFrame(wide,'furniture');
assert.ok(Math.abs(16*big.s*.12-2.56)<1e-9,'a sixteen-stud piece of furniture is about as long as the sofa');
assert.deepEqual([big.cx,big.cz,big.lift],[0,0,0],'centred on its own footprint, standing on the floor');
assert.ok(Math.abs(16*buildFrame(wide,'small').s*.12-.96)<1e-9,'small things stay the old size');
assert.equal(buildFrame(wide,undefined).s,STUD_SIZE.small,'no size reads as small');
assert.ok(Math.abs(16*buildFrame(wide,'furniture',{fit:8}).s-8)<1e-9,'shrunk to fit a slot');
const tiny=[{p:'brick',x:7,y:0,z:7,w:2,d:2,h:3,turn:0,c:'cream'}];
assert.equal(buildFrame(tiny,'small',{fit:8}).s,STUD_SIZE.small,'fitting never blows a thing up');
const shown=buildFrame(tiny,'small',{fill:6});
assert.ok(Math.abs(2*shown.s-6)<1e-9&&shown.lift<0,'a preview fills its size and is centred upright');
assert.equal(buildFrame([],'small'),null);
console.log(`Brick shapes: ${made} part shapes fit their footprints; curves, slopes and studs face the right way.`);
