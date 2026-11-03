import assert from 'node:assert/strict';
import {lightState,changeLight,accentLevel} from '../src/light-state.js';
let s=changeLight({}, {mode:'sleep'},'bedroom');assert.equal(s.main,false);assert.equal(accentLevel(s,'bedside'),.2);
s=changeLight(s,{main:true},'bedroom');assert.equal(s.main,true);assert.equal(s.mainLevel,1);assert.equal(s.mode,'custom');
s=changeLight(s,{lamp:'bedside'},'bedroom');assert.equal(accentLevel(s,'bedside'),0);assert.equal(accentLevel(s,'reading'),.2);
s=changeLight(s,{accent:false},'bedroom');assert.equal(accentLevel(s,'reading'),0);
s=changeLight(s,{mode:'daily'},'bedroom');assert.equal(accentLevel(s,'reading'),1);assert.equal(accentLevel(s,'bedside'),1);assert.equal(s.main,true);
assert.equal(lightState({mode:'sleep',main:true}).main,false);
// The bedroom fairy lights are an accent lamp: on by default, dim with 入睡, own switch.
assert.equal(accentLevel(lightState({}),'fairy'),1);
let f=changeLight({}, {mode:'sleep'},'bedroom');assert.equal(accentLevel(f,'fairy'),.2);
f=changeLight(f,{lamp:'fairy'},'bedroom');assert.equal(accentLevel(f,'fairy'),0);assert.equal(accentLevel(f,'bedside'),.2);
// The study's moon lamp likewise: on by default, its own switch, dims with 入睡.
assert.equal(accentLevel(lightState({}),'moon'),1);
let m=changeLight({}, {mode:'sleep'},'study');assert.equal(accentLevel(m,'moon'),.2);assert.equal(accentLevel(m,'desk'),.2);
assert.deepEqual(lightState(JSON.parse(JSON.stringify(s))),s);
console.log('Preset, individual lamp, group toggle and persisted state agree.');
