import assert from 'node:assert/strict';
import {motionStep} from '../src/motion-step.js';
for(const [from,to] of [[0,-1.45],[-1.45,0],[0,.8],[.8,0]]){
 let x=from,frames=0;
 while(x!==to&&frames<300){const next=motionStep(x,to,1/60);assert.ok(Math.abs(next-to)<=Math.abs(x-to));x=next;frames++;}
 assert.equal(x,to,'animation must reach exact target and stop requesting frames');
 assert.equal(motionStep(x,to,1/60),to);
}
assert.ok(motionStep(0,1,100)<.5,'resume must not jump on a large elapsed delta');
console.log('Opening, closing, convergence and resumed animation passed.');
