import assert from 'node:assert/strict';
import {clockAngles} from '../src/wall-clock.js';

const turn=Math.PI*2,close=(a,b)=>Math.abs(a-b)<1e-9;
// 03:15:00 UTC: the minute hand at a quarter turn, the hour hand a quarter past three.
let a=clockAngles(new Date('2026-10-22T03:15:00Z'),'UTC');
assert.ok(close(a.minute,turn/4),'minute hand at three');
assert.ok(close(a.hour,(3.25/12)*turn),'hour hand a quarter of the way from three to four');
// Same instant in Melbourne (AEDT, UTC+11) reads 14:15, i.e. 2:15 on the dial.
a=clockAngles(new Date('2026-10-22T03:15:00Z'),'Australia/Melbourne');
assert.ok(close(a.hour,(2.25/12)*turn),'the clock keeps the home time zone');
// Midnight and noon both point straight up; seconds move the minute hand smoothly.
assert.ok(close(clockAngles(new Date('2026-10-22T00:00:00Z'),'UTC').hour,0));
assert.ok(close(clockAngles(new Date('2026-10-22T12:00:00Z'),'UTC').hour,0));
assert.ok(close(clockAngles(new Date('2026-10-22T05:28:30Z'),'UTC').minute,(28.5/60)*turn));
// An unknown zone falls back to the default home zone instead of throwing.
assert.doesNotThrow(()=>clockAngles(new Date(),'Not/AZone'));
console.log('Wall clock: hands follow the home time zone, smoothly and without throwing.');
