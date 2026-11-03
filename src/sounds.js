// Little sounds for the house, synthesized on the spot from code: no audio files.
// play(name) stays silent until the page has had its first tap or key press (a browser rule),
// and while muted. Volume and mute belong to this device, kept apart from the home save.
import {zzfxBuild} from './vendor/zzfx.js';
import {paperSounds,renderPaper,rainPlayer,prepareRain} from './paper-rain.js';

export const SOUND_KEY='porchlit-sound-v1';
// Each sound is a list of layers [start in seconds, ZzFX parameters], mixed into one buffer.
// Levels are evened out across sounds and every peak stays under 0.85.
// gacha and blindbox are whole sequences; gachaTurn/gachaDrop/gachaOpen and
// boxRibbon/boxLid/boxOpen are the same sounds cut into steps for an interactive machine.
export const sounds={
  click:[[0,[0.327,0.05,1800,0,0,0.006,0,1,0,0,0,0,0,1,0,0,0,1,0,0,-1600]],[0,[0.436,0.03,1100,0.001,0,0.04,0,1,-4]]],
  tap:[[0,[0.397,0.03,520,0.002,0,0.045,0,1,18]]],
  turn:[[0,[0.178,0.05,600,0.03,0,0.09,0,1,20,0,0,0,0,2,0,0,0,1,0,0,-1800]],[0.12,[0.178,0.03,1200,0.001,0,0.02]]],
  drawerOpen:[[0,[0.158,0.05,700,0.04,0.08,0.06,0,1,0,0,0,0,0,2,0,0,0,1,0,0,-1000]],[0.013,[0.081,0.05,1057,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.037,[0.096,0.05,625,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.044,[0.046,0.05,627,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.067,[0.076,0.05,1086,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.074,[0.081,0.05,874,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.093,[0.069,0.05,990,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.104,[0.065,0.05,1026,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.118,[0.09,0.05,646,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.137,[0.053,0.05,779,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.154,[0.071,0.05,661,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.161,[0.05,0.05,654,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.17,[0.237,0.03,460,0.001,0,0.04,0,1,-5]],[0.17,[0.079,0,1150,0.001,0,0.025]],[0.17,[0.105,0.05,1200,0,0,0.004,0,1,0,0,0,0,0,1,0,0,0,1,0,0,-1200]]],
  drawerClose:[[0,[0.158,0.05,700,0.02,0.06,0.03,0,1,0,0,0,0,0,2,0,0,0,1,0,0,-1000]],[0.008,[0.064,0.05,738,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.02,[0.096,0.05,958,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.035,[0.048,0.05,959,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.051,[0.059,0.05,994,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.067,[0.075,0.05,778,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.085,[0.072,0.05,796,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.099,[0.05,0.05,800,0,0,0.004,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1100]],[0.11,[0.316,0.03,380,0.001,0,0.07,0,1,-1.5]],[0.11,[0.132,0,960,0.001,0,0.04]],[0.11,[0.158,0.05,1100,0,0,0.006,0,1,0,0,0,0,0,1.2,0,0,0,1,0,0,-1400]]],
  lid:[[0,[0.392,0.03,800,0.001,0,0.03,0,1,-6]],[0,[0.235,0.05,1700,0,0,0.005,0,1,0,0,0,0,0,1,0,0,0,1,0,0,-1700]],[0.06,[0.274,0.03,560,0.001,0,0.04]]],
  glass:[[0,[0.116,0,1760,0.001,0,0.04]],[0,[0.097,0,1760,0.001,0,0.158]],[0,[0.058,0,1767.04,0.001,0,0.45]],[0,[0.031,0,4770,0.001,0,0.07]],[0,[0.047,0.05,3000,0,0,0.003,0,1,0,0,0,0,0,1,0,0,0,1,0,0,-2500]]],
  fork:[[0,[0.17,0.04,2960,0.001,0,0.08]],[0,[0.06,0.04,5920,0.001,0,0.035]],[0,[0.07,0.05,3000,0,0,0.003,0,1,0,0,0,0,0,1,0,0,0,1,0,0,-2500]]],
  wood:[[0,[0.532,0.03,950,0.001,0,0.03,0,1,-4]],[0,[0.242,0.05,2000,0,0,0.004,0,1,0,0,0,0,0,1,0,0,0,1,0,0,-2000]],[0.07,[0.194,0.03,950,0.001,0,0.02]]],
  cloth:[[0,[0.956,0.05,1000,0.01,0,0.14,4,1,0,0,0,0,0,0,0,0,0,1,0,0,-380]],[0,[0.239,0.03,190,0.001,0,0.07,0,1,-1]]],
  found:[[0,[0.12,0,900,0.005,0,0.15,0,1,16]],[0.05,[0.06,0,2637.02,0.001,0,0.06]],[0.1,[0.06,0,3135.96,0.001,0,0.06]],[0.15,[0.06,0,3520,0.001,0,0.06]],[0.17,[0.12,0,1046.5,0.001,0,0.5]],[0.17,[0.12,0,1318.51,0.001,0,0.5]],[0.17,[0.12,0,1567.98,0.001,0,0.5]]],
  knock:[[0,[0.575,0.03,340,0.001,0,0.06,0,1,-2]],[0,[0.335,0,918,0.001,0,0.035]],[0,[0.287,0.05,1600,0,0,0.005,0,1,0,0,0,0,0,1,0,0,0,1,0,0,-1400]],[0.17,[0.517,0.03,334,0.001,0,0.06,0,1,-2]],[0.17,[0.302,0,901.8,0.001,0,0.035]],[0.17,[0.259,0.05,1600,0,0,0.005,0,1,0,0,0,0,0,1,0,0,0,1,0,0,-1400]]],
  tick:[[0,[0.327,0.05,1700,0,0,0.012,0,1,0,0,0,0,0,0.5,0,0,0,1,0,0,-1700]],[0,[0.145,0.03,850,0.001,0,0.02]]],
  tock:[[0,[0.327,0.05,1300,0,0,0.012,0,1,0,0,0,0,0,0.5,0,0,0,1,0,0,-1700]],[0,[0.145,0.03,650,0.001,0,0.02]]],
  porchLight:[[0,[0.4,0.05,1500,0,0,0.01,0,1,0,0,0,0,0,0.8,0,0,0,1,0,0,-1700]],[0,[0.311,0.03,600,0.001,0,0.03]],[0.05,[0.178,0,523.25,0.18,0.1,0.5,0,1,0,0,0,0,0.25,0,0,0,0,1,0,0.1]],[0.05,[0.115,0,783.99,0.2,0,0.5]],[0.05,[0.062,0,1046.5,0.25,0,0.4]]],
  kiss:[[0,[0.273,0.03,1100,0.001,0,0.035,0,1,-28]],[0,[0.074,0.05,800,0.001,0,0.02,0,1,0,0,0,0,0,2,0,0,0,1,0,0,-1200]],[0.12,[0.149,0,1318.51,0.002,0,0.25,0,1,0.6]],[0.16,[0.074,0,1760,0.001,0,0.2]]],
  gacha:[[0,[0.232,0.05,1250,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.07,[0.232,0.05,1100,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.14,[0.232,0.05,1250,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.21,[0.232,0.05,1100,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.28,[0.232,0.05,1250,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.35,[0.232,0.05,1100,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.42,[0.298,0.03,500,0.001,0,0.05]],[0.62,[0.332,0.03,760,0.001,0,0.05]],[0.62,[0.133,0,1900,0.001,0,0.015]],[0.78,[0.232,0.03,760,0.001,0,0.05]],[0.78,[0.093,0,1900,0.001,0,0.015]],[0.88,[0.149,0.03,760,0.001,0,0.05]],[0.88,[0.06,0,1900,0.001,0,0.015]],[0.94,[0.083,0.03,760,0.001,0,0.05]],[0.94,[0.033,0,1900,0.001,0,0.015]],[1.25,[0.332,0.03,950,0.001,0,0.05,0,1,-22]],[1.3,[0.119,0,1046.5,0.001,0,0.35]],[1.36,[0.119,0,1318.51,0.001,0,0.35]],[1.42,[0.119,0,1567.98,0.001,0,0.35]],[1.48,[0.119,0,2093,0.001,0,0.35]]],
  gachaTurn:[[0,[0.232,0.05,1250,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.07,[0.232,0.05,1100,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.14,[0.232,0.05,1250,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.21,[0.232,0.05,1100,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.28,[0.232,0.05,1250,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.35,[0.232,0.05,1100,0,0,0.012,0,1,0,0,0,0,0,0.7,0,0,0,1,0,0,-1800]],[0.42,[0.298,0.03,500,0.001,0,0.05]]],
  gachaDrop:[[0,[0.332,0.03,760,0.001,0,0.05]],[0,[0.133,0,1900,0.001,0,0.015]],[0.16,[0.232,0.03,760,0.001,0,0.05]],[0.16,[0.093,0,1900,0.001,0,0.015]],[0.26,[0.149,0.03,760,0.001,0,0.05]],[0.26,[0.06,0,1900,0.001,0,0.015]],[0.32,[0.083,0.03,760,0.001,0,0.05]],[0.32,[0.033,0,1900,0.001,0,0.015]]],
  gachaOpen:[[0,[0.332,0.03,950,0.001,0,0.05,0,1,-22]],[0.05,[0.119,0,1046.5,0.001,0,0.35]],[0.11,[0.119,0,1318.51,0.001,0,0.35]],[0.17,[0.119,0,1567.98,0.001,0,0.35]],[0.23,[0.119,0,2093,0.001,0,0.35]]],
  blindbox:[[0,[0.146,0.05,1000,0.05,0.1,0.08,4,1,0,0,0,0,0,0,0,0,0,1,0,0,-900]],[0.26,[0.199,0.05,1400,0,0,0.008,0,1,0,0,0,0,0,1,0,0,0,1,0,0,-1400]],[0.45,[0.332,0.03,260,0.01,0,0.08,0,1,8]],[0.6,[0.12,0,1046.5,0.001,0,0.4]],[0.67,[0.12,0,1318.51,0.001,0,0.4]],[0.74,[0.12,0,1567.98,0.001,0,0.4]],[0.81,[0.12,0,2093,0.001,0,0.4]],[0.85,[0.04,0,2093,0.05,0,0.6,0,1,0,0,0,0,0.07,0,0,0,0,1,0,0.6]]],
  boxRibbon:[[0,[0.146,0.05,1000,0.05,0.1,0.08,4,1,0,0,0,0,0,0,0,0,0,1,0,0,-900]],[0.26,[0.199,0.05,1400,0,0,0.008,0,1,0,0,0,0,0,1,0,0,0,1,0,0,-1400]]],
  boxLid:[[0,[0.332,0.03,260,0.01,0,0.08,0,1,8]]],
  boxOpen:[[0,[0.12,0,1046.5,0.001,0,0.4]],[0.07,[0.12,0,1318.51,0.001,0,0.4]],[0.14,[0.12,0,1567.98,0.001,0,0.4]],[0.21,[0.12,0,2093,0.001,0,0.4]],[0.25,[0.04,0,2093,0.05,0,0.6,0,1,0,0,0,0,0.07,0,0,0,0,1,0,0.6]]],
};
// page and note (paper) are made in paper-rain.js, where ZzFX can't go; they play like the rest.
export const SOUND_NAMES=[...Object.keys(sounds),...Object.keys(paperSounds)];
export function renderSound(name,sampleRate=44100,rand=Math.random){if(paperSounds[name])return renderPaper(name,sampleRate,rand);const built=(sounds[name]||[]).map(([at,p])=>[Math.round(at*sampleRate),zzfxBuild(p,sampleRate,rand)]);const out=new Float32Array(built.reduce((m,[o,b])=>Math.max(m,o+b.length),0));for(const [o,b] of built)for(let i=0;i<b.length;i++)out[o+i]+=b[i];return out;}

const clamp=v=>Math.min(1,Math.max(0,Number(v)||0));
function readPrefs(){try{const v=JSON.parse(globalThis.localStorage?.getItem(SOUND_KEY)||'{}');return {volume:v.volume==null?.6:clamp(v.volume),muted:v.muted===true};}catch{return {volume:.6,muted:false};}}
const prefs=readPrefs();
let ctx=null,master=null;
function savePrefs(){try{globalThis.localStorage?.setItem(SOUND_KEY,JSON.stringify(prefs));}catch{}}
function applyGain(){if(master)master.gain.value=prefs.muted?0:prefs.volume*prefs.volume;}
export const getVolume=()=>prefs.volume;
export function setVolume(v){prefs.volume=clamp(v);savePrefs();applyGain();}
export const isMuted=()=>prefs.muted;
export function setMuted(m){prefs.muted=!!m;savePrefs();applyGain();}
// Audio opens on the first tap or key press; later ones wake it again if the system paused it.
function wake(){if(!ctx){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return;try{ctx=new AC();}catch{ctx=null;return;}const comp=ctx.createDynamicsCompressor();comp.threshold.value=-6;comp.knee.value=6;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.12;master=ctx.createGain();master.connect(comp);comp.connect(ctx.destination);applyGain();}if(ctx.state==='suspended')ctx.resume?.().catch(()=>{});if(rainWish&&!rainNow)setTimeout(startWished,0);}
if(typeof window!=='undefined')for(const ev of ['pointerdown','touchend','keydown'])window.addEventListener(ev,wake,{passive:true,capture:true});
// volume (0-1) scales this one sound, e.g. by distance from the clock. Returns whether it was sent out.
export function play(name,{volume=1}={}){if(!ctx||ctx.state==='closed'||prefs.muted||!(sounds[name]||paperSounds[name]))return false;if(ctx.state==='suspended')ctx.resume?.().catch(()=>{});const x=renderSound(name,ctx.sampleRate);if(!x.length)return false;const buf=ctx.createBuffer(1,x.length,ctx.sampleRate);buf.getChannelData(0).set(x);const src=ctx.createBufferSource(),g=ctx.createGain();g.gain.value=clamp(volume);src.buffer=buf;src.connect(g);g.connect(master);src.start();return true;}
// Rain: a soft fine rain that keeps falling until stopRain(), on the same volume and mute as the other sounds.
// Asked for before the first tap, it starts with that tap. volume (0-1) is this rain's own level; calling
// startRain again while it falls only changes that. fade is in seconds.
let rainWish=null,rainNow=null;
function startWished(){if(rainWish&&!rainNow&&ctx&&ctx.state!=='closed')rainNow=rainPlayer(ctx,master,rainWish);}
export function startRain({volume=1,fade=1.5}={}){rainWish={volume:clamp(volume),fade:Math.max(0,Number(fade)||0)};if(rainNow){rainNow.setVolume(rainWish.volume);return true;}if(!ctx||ctx.state==='closed'){setTimeout(()=>{if(rainWish)prepareRain();},0);return false;}rainNow=rainPlayer(ctx,master,rainWish);return true;}
export function stopRain({fade=1.5}={}){rainWish=null;if(rainNow){rainNow.stop(Math.max(0,Number(fade)||0));rainNow=null;}}
export const isRaining=()=>!!rainWish;
// prepareRain() makes the rain's wash ahead of time (a few hundred milliseconds), e.g. on coming home if it may rain.
export {prepareRain};
