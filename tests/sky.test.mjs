import assert from 'node:assert/strict';
import {makeStars,makeClouds,starOpacity,cloudOpacity} from '../src/sky-state.js';

const stars=makeStars();
assert.deepEqual(makeStars(),stars,'the same sky every night');
assert.notDeepEqual(makeStars(7),stars,'a different seed gives a different sky');
for(const s of stars){assert.ok(s.x>=0&&s.x<=100&&s.y>=0&&s.y<=100);assert.ok(s.o>0&&s.o<=1);assert.ok(s.delay<=0);}
const upper=stars.filter(s=>s.y<50).length;
assert.ok(upper>stars.length-upper,'more stars high in the sky than low');
assert.ok(new Set(stars.map(s=>s.r)).size>=4,'sizes vary');
assert.ok(new Set(stars.filter(s=>s.twinkle).map(s=>s.dur)).size>=10,'twinkles keep their own rhythm');
const glints=stars.filter(s=>s.glint);
assert.equal(glints.length,3);assert.ok(glints.every(s=>s.y<45&&!s.extra));
const phone=stars.filter(s=>!s.extra).length;
assert.ok(phone>40&&phone<stars.length,'phones keep a lighter sky');

const clouds=makeClouds();
assert.deepEqual(makeClouds(),clouds,'the same clouds every visit');
assert.ok(clouds.length>=3&&clouds.length<=6,'only a few clouds');
assert.equal(new Set(clouds.map(c=>c.w)).size,clouds.length,'no two clouds the same size');
assert.ok(new Set(clouds.map(c=>c.puffs.length)).size>=2,'not every cloud has the same number of puffs');
for(const c of clouds){
 assert.ok(c.x>=0&&c.x<=100&&c.y>=0&&c.y<=100);
 assert.ok(c.base.x>=0&&c.base.x+c.base.w<=200,'base stays inside its box');
 for(const p of c.puffs){assert.ok(p.cy-p.r>=1,'puffs are never clipped at the top');assert.ok(p.cx-p.r>=0&&p.cx+p.r<=200);}
 const gaps=c.puffs.slice(1).map((p,i)=>+(p.cx-c.puffs[i].cx).toFixed(1));
 if(gaps.length>1)assert.ok(new Set(gaps).size>1,'puffs are not evenly spaced');
 const biggest=c.puffs.reduce((a,b)=>b.r>a.r?b:a);
 assert.ok(biggest!==c.puffs[0]&&biggest!==c.puffs.at(-1),'the biggest puff is never at an end');
}
assert.ok(new Set(clouds.map(c=>c.dur)).size>1,'clouds drift at their own pace');

assert.equal(cloudOpacity(1),1);assert.equal(cloudOpacity(.5),0);assert.equal(cloudOpacity(0),0);
assert.equal(starOpacity(1),0);assert.equal(starOpacity(.5),0);assert.equal(starOpacity(.15),1);assert.equal(starOpacity(0),1);
for(let d=0;d<=1;d+=.01){
 assert.ok(starOpacity(d)>=starOpacity(d+.01),'stars fade as daylight grows');
 assert.ok(cloudOpacity(d)<=cloudOpacity(d+.01),'clouds thin out toward evening');
 assert.ok(starOpacity(d)===0||cloudOpacity(d)===0,'clouds and stars never share the sky');
}
console.log('Stable sky, uneven stars and clouds, and the dusk handover agree.');
