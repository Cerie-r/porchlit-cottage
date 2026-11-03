import assert from 'node:assert/strict';
import {lightQuad,panes,lightLook,SUN,curtainGaps,clipPanes} from '../src/window-light-shape.js';

const glass={width:2.7,bottom:1.1,top:2.7};
const quad=lightQuad({...glass,floorY:.012});
const corners=[0,1,2,3].map(i=>quad.positions.slice(i*3,i*3+3));
assert.ok(corners.every(p=>p[1]===.012),'the patch lies flat on the floor');
assert.ok(corners[0][2]>0&&corners[3][2]>corners[0][2],'it starts in front of the wall and reaches further in from the top of the glass');
assert.ok(Math.abs(corners[3][2]-(glass.top+.14)*SUN.reach)<1e-9,'the top of the glass lands reach x height into the room');
assert.ok(corners[3][0]>corners[0][0],'light drifts to one side, so the patch is a slanted parallelogram');
// Faces point up: the cross product of the first triangle's edges has +y.
const [a,b,c]=quad.indices.slice(0,3).map(i=>corners[i]);
const e1=b.map((v,i)=>v-a[i]),e2=c.map((v,i)=>v-a[i]);
assert.ok(e1[2]*e2[0]-e1[0]*e2[2]>0,'wound to face up');

const grid=panes('grid',glass);
assert.equal(grid.length,8,'four columns by two rows of panes');
for(const {rect:[l,bt,r,t]} of grid){assert.ok(l<r&&bt<t);assert.ok(l>=-glass.width/2&&r<=glass.width/2&&bt>=glass.bottom&&t<=glass.top);}
const arch=panes('arch',{width:2.5,bottom:1.25,top:3.6});
assert.equal(arch.length,6,'two halves of the lower panes, the middle band and the arched head');
assert.ok(arch.filter(s=>s.arch).every(s=>s.arch.cy+s.arch.r<=3.6+1e-9),'the arch stays inside the window');

// Curtains: closed lets no pattern through, open lets all of it, half open part of it.
assert.deepEqual(curtainGaps(0,0),[],'drawn curtains let no window pattern through');
// Fully drawn back, each curtain gathers at the side and still covers the outer
// .245 of the glass (it hangs from 1.105 to 1.555), so light comes through the middle.
const open=curtainGaps(1,1);
assert.equal(open.length,2);
assert.ok(Math.abs(open[0][0]+1.105)<1e-9&&open[0][1]===0&&open[1][0]===0&&Math.abs(open[1][1]-1.105)<1e-9,'open curtains uncover all but the gathered edges');
const half=curtainGaps(.5,0);
assert.equal(half.length,1);assert.ok(half[0][0]>-1.35&&half[0][0]<0&&half[0][1]===0,'half-open left curtain uncovers part of the left half only');
assert.deepEqual(clipPanes(grid,[]),[],'no gaps, no panes');
assert.equal(clipPanes(grid,open).length,8,'open curtains keep a part of every pane');
assert.equal(clipPanes(grid,[[-1.35,0],[0,1.35]]).length,8,'with no curtain in the way every pane is whole');
assert.ok(clipPanes(grid,half).every(({rect:[l,,r]})=>l>=half[0][0]&&r<=0),'clipped panes stay inside the gap');
assert.equal(clipPanes(arch,null).length,arch.length,'without curtains nothing is clipped');

assert.deepEqual(lightLook(1).rgb,[255,233,199]);assert.equal(lightLook(1).opacity,.29);
assert.deepEqual(lightLook(0).rgb,[180,196,245]);assert.equal(lightLook(0).opacity,.13);
assert.ok(lightLook(.5).opacity>lightLook(0).opacity&&lightLook(.5).opacity<lightLook(1).opacity);
console.log('Window light lands on the floor as a slanted patch with its panes; warm by day, cool at night.');
