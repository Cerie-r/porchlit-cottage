import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sounds,SOUND_NAMES,renderSound,play,getVolume,setVolume,isMuted,setMuted,startRain,stopRain,isRaining} from '../src/sounds.js';
import {paperSounds,rain,renderRainBed,rainEvents,renderDrop} from '../src/paper-rain.js';

// A seeded random source for the sounds made of noise (a constant one would make them silent).
const seeded=seed=>{let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};};
const randFor=n=>paperSounds[n]?seeded(7):()=>.5;

// Every place the house will make a sound has one.
for(const n of ['click','tap','turn','drawerOpen','drawerClose','lid','glass','fork','wood','cloth','found','knock','tick','tock','porchLight','kiss','gacha','gachaTurn','gachaDrop','gachaOpen','blindbox','boxRibbon','boxLid','boxOpen','sizzle','flare','squirt'])assert.ok(sounds[n],'missing sound '+n);
for(const n of ['page','note'])assert.ok(paperSounds[n],'missing sound '+n);
assert.deepEqual(SOUND_NAMES,[...Object.keys(sounds),...Object.keys(paperSounds)]);

// Each renders to real samples: audible, never clipping, short enough to stay out of the way.
for(const n of SOUND_NAMES){
  const x=renderSound(n,44100,randFor(n));let peak=0;
  for(const v of x){assert.ok(Number.isFinite(v),n+' has a bad sample');peak=Math.max(peak,Math.abs(v));}
  assert.ok(x.length>0,n+' is empty');
  assert.ok(peak>.05,n+' is too quiet ('+peak.toFixed(3)+')');
  assert.ok(peak<=.86,n+' would clip ('+peak.toFixed(3)+')');
  assert.ok(x.length/44100<2,n+' is too long');
}
// Taps and clicks happen all the time, so they stay very short.
for(const n of ['click','tap','kiss'])assert.ok(renderSound(n,44100,()=>.5).length/44100<.4,n+' should be quick');
// The sample rate only resamples: the same sound lasts as long at 48 kHz.
assert.ok(Math.abs(renderSound('glass',48000,()=>.5).length/48000-renderSound('glass',44100,()=>.5).length/44100)<.002);
// The steps of the gacha machine and the blind box add up to the whole sequence.
const dur=n=>renderSound(n,44100,()=>.5).length;
assert.ok(dur('gachaTurn')+dur('gachaDrop')+dur('gachaOpen')<=dur('gacha')+44100*.5);
assert.ok(dur('boxRibbon')<dur('blindbox')&&dur('boxOpen')<dur('blindbox'));
// Paper is soft: a page and a note are over within half a second, and their top is rolled off (little above 4 kHz).
for(const n of ['page','note']){
  const x=renderSound(n,44100,seeded(11));assert.ok(x.length/44100<=.5,n+' should be short');
  const N=1024,spec=new Float64Array(N/2);
  for(let o=0;o+N<=x.length;o+=N/2)for(let k=1;k<N/2;k+=2){let re=0,im=0;for(let i=0;i<N;i++){const w=x[o+i]*(.5-.5*Math.cos(2*Math.PI*i/N));re+=w*Math.cos(2*Math.PI*k*i/N);im-=w*Math.sin(2*Math.PI*k*i/N);}spec[k]+=re*re+im*im;}
  let hi=0,all=0;for(let k=1;k<N/2;k+=2){all+=spec[k];if(k*44100/N>4000)hi+=spec[k];}
  assert.ok(hi/all<.12,n+' is too bright ('+(hi/all*100).toFixed(1)+'% above 4 kHz)');
}
// Unknown names render nothing instead of throwing.
assert.equal(renderSound('nope').length,0);

// Without a browser (and before any tap) nothing plays and nothing throws.
assert.equal(play('click'),false);
assert.equal(play('page'),false);
assert.equal(play('nope'),false);

// Rain: the wash loops without a seam (the last sample runs on into the first like any two neighbours),
// stays soft, and never clips.
{
  const [L,R]=renderRainBed(rain.sr,seeded(5),rain.seconds);
  assert.equal(L.length,rain.sr*rain.seconds);assert.equal(R.length,L.length);
  for(const x of [L,R]){
    let peak=0,d2=0,e=0;
    for(let i=0;i<x.length;i++){assert.ok(Number.isFinite(x[i]));peak=Math.max(peak,Math.abs(x[i]));e+=x[i]*x[i];if(i)d2+=(x[i]-x[i-1])**2;}
    const step=Math.sqrt(d2/(x.length-1));
    assert.ok(Math.abs(x[x.length-1]-x[0])<4*step,'the loop has a seam');
    assert.ok(peak<.85,'the rain clips');
    const rms=Math.sqrt(e/x.length);assert.ok(rms>.005&&rms<.08,'the rain is not soft ('+rms.toFixed(4)+')');
  }
}
// The near drops: about as many as asked for, in order, each window picking up where the last one stopped.
{
  const rand=seeded(9),state={},all=[];
  for(let t=0;t<600;t+=.3)all.push(...rainEvents(t,t+.3,rand,state));
  assert.ok(Math.abs(all.length/600-rain.drops)<rain.drops*.06,'drops per second '+(all.length/600).toFixed(2));
  for(let i=1;i<all.length;i++)assert.ok(all[i].at>all[i-1].at);
  assert.ok(all.every(e=>e.at>=0&&e.at<600.3));
  for(const ev of all.slice(0,40)){const [l,r]=renderDrop(ev,44100,rand);let p=0;for(let i=0;i<l.length;i++){assert.ok(Number.isFinite(l[i]+r[i]));p=Math.max(p,Math.abs(l[i]),Math.abs(r[i]));}assert.ok(p<.85,'a drop clips');}
  // after a long sleep the missed drops are skipped, not bunched up
  assert.ok(rainEvents(5000,5000.3,rand,state).every(e=>e.at>=5000));
}
// Rain asked for before any tap waits for it; stopping clears the wish.
assert.equal(startRain(),false);assert.equal(isRaining(),true);
stopRain();assert.equal(isRaining(),false);
// Volume is clamped to 0..1; mute is a plain switch.
setVolume(2);assert.equal(getVolume(),1);
setVolume(-1);assert.equal(getVolume(),0);
setVolume(.6);assert.equal(getVolume(),.6);
setMuted(true);assert.equal(isMuted(),true);
setMuted(false);assert.equal(isMuted(),false);

// The vendored synth keeps its licence notice.
const zz=readFileSync(new URL('../src/vendor/zzfx.js',import.meta.url),'utf8');
assert.match(zz,/ZzFX MIT License/);
assert.match(zz,/Copyright \(c\) 2019 - Frank Force/);

console.log('Sounds: '+SOUND_NAMES.length+' sounds render cleanly, paper stays soft, the rain loops without a seam, nothing plays before a tap, ZzFX keeps its licence');
