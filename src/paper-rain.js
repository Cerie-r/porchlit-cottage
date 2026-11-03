// Paper and rain for the house, made from shaped noise sample by sample (ZzFX's oscillators can't make either).
// page: a book's page turned over. note: a sticky note peeled off. rain: a fine rain; its steady wash loops
// without a seam and the near drops are put on the clock as it plays, so they never repeat.
// Everything here is pure except rainPlayer; sounds.js decides when. Levels sit with the house's other little
// sounds (the loudest 100 ms of a page or a note near -21 dB A-weighted, the rain near -30 over time) and no
// peak goes over 0.85.

// ---------------------------------------------------------------- filters (RBJ biquads) and noise
function coef(type, f, q, sr) {
  const w = 2 * Math.PI * Math.min(f, sr * .45) / sr, cs = Math.cos(w), sn = Math.sin(w), a = sn / (2 * q);
  let b0, b1, b2; const a0 = 1 + a, a1 = -2 * cs, a2 = 1 - a;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
  else { b0 = a; b1 = 0; b2 = -a; }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
const filter = (type, f, q, sr) => ({ c: coef(type, f, q, sr), x1: 0, x2: 0, y1: 0, y2: 0 });
function step(F, x) { const c = F.c, y = c[0] * x + c[1] * F.x1 + c[2] * F.x2 - c[3] * F.y1 - c[4] * F.y2; F.x2 = F.x1; F.x1 = x; F.y2 = F.y1; F.y1 = y; return y; }
const white = rand => rand() * 2 - 1;
const smooth = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
const between = (r, rand) => r[0] + (r[1] - r[0]) * rand();
function poisson(mean, rand) {
  if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())));
  let n = 0, p = Math.exp(-mean), s = p; const u = rand();
  while (u > s && n < 100) { n++; p *= mean / n; s += p; }
  return n;
}
// a few milliseconds of fade at the end, so nothing stops on a step
function fadeOut(x, sr) { const n = Math.min(x.length, Math.round(.004 * sr)); for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n; return x; }
// paper is bright; heard small and soft, its top is rolled off steeply (two stages) above f
function softTop(x, sr, f) { const a = filter('lp', f, .62, sr), b = filter('lp', f * 1.25, .7, sr), h = filter('hp', 110, .7, sr); for (let i = 0; i < x.length; i++) x[i] = step(b, step(a, step(h, x[i]))); }

// ---------------------------------------------------------------- paper
// one grain: a fibre giving way, a short scratch of noise rung through a band-pass
function grain(out, at, sr, rand, f, amp, q) {
  const n = Math.round(.012 * sr), ex = Math.max(2, Math.round((.0008 + .0016 * rand()) * sr)), bp = filter('bp', f, q || (2.5 + 2 * rand()), sr);
  for (let i = 0; i < n; i++) { const k = at + i, y = step(bp, i < ex ? white(rand) * (1 - i / ex) : 0) * amp; if (k >= 0 && k < out.length) out[k] += y; }
}
// the paper settling: a soft low push of air
function flap(out, at, sr, rand, f, amp) {
  const n = Math.round(.09 * sr), lp = filter('lp', f * 2.2, .7, sr), bp = filter('bp', f, 1.1, sr), atk = .0025 * sr, tau = .018 * sr;
  for (let i = 0; i < n; i++) { const e = i < atk ? i / atk : Math.exp(-(i - atk) / tau), w = white(rand) * e, k = at + i; if (k < out.length) out[k] += (step(lp, w) * .55 + step(bp, w) * 1.4) * amp; }
}
// the sheet going over: a band of noise that rises and falls as the edge passes, fluttering, the air it pushes,
// and a crackle of grains that comes thickest where it moves fastest
function sweep(out, at, sr, rand, p, amp) {
  const n = Math.round(p.dur * sr), bp = filter('bp', p.f0, p.q, sr), air = filter('lp', p.airF, .7, sr);
  const a = 1 - Math.exp(-2 * Math.PI * p.flutF / sr), norm = Math.sqrt(a / (2 - a)) * .577, peakAt = p.peakAt || .38;
  let fl = 0, next = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    if ((i & 31) === 0) bp.c = coef('bp', p.f0 + (p.f1 - p.f0) * Math.sin(Math.PI * Math.min(1, u * 1.08)), p.q, sr);
    fl += a * (white(rand) - fl);
    const am = Math.max(0, 1 + p.flutter * .55 * (fl / norm));
    const e = u < peakAt ? smooth(u / peakAt) : Math.pow(1 - smooth((u - peakAt) / (1 - peakAt)), 1.3);
    const w = white(rand), k = at + i;
    if (k < out.length) out[k] += amp * e * am * (step(bp, w) * p.band + step(air, w) * p.air);
    if (i >= next) {
      grain(out, k, sr, rand, between(p.grainF, rand), amp * p.grainAmp * e * am * (.4 + .6 * rand()));
      next = i + Math.max(1, Math.round(-Math.log(1 - rand()) / (p.grainRate * Math.max(e, .06)) * sr));
    }
  }
}
export const paperSounds = {
  // a page of a book: lifted with a crackle, turned over, settling on the other side
  page: { len: .5, gain: .881, top: 4300, sheet: { dur: .42, f0: 1000, f1: 2100, q: 1.3, band: .55, air: .5, airF: 700, grainRate: 650, grainF: [1400, 3500], grainAmp: .55, flutter: .5, flutF: 22 },
    crinkle: 7, crF: [1800, 3600], crAmp: .6, flap: .9, flapF: 420 },
  // a sticky note peeled off: the glue lets go in a soft little zip, then the note flutters free
  note: { len: .32, gain: 2.113, top: 4500, peel: true },
};
export function renderPaper(name, sr = 44100, rand = Math.random) {
  const p = paperSounds[name]; if (!p) return new Float32Array(0);
  const out = new Float32Array(Math.round(p.len * sr));
  if (p.peel) {
    const n = Math.round(.09 * sr);
    for (let i = 0; i < n;) {
      const u = i / n;
      grain(out, i, sr, rand, (1600 + 1900 * u) * (.92 + .16 * rand()), .38 * (.5 + .5 * Math.sin(Math.PI * Math.min(1, u * 1.15))), 3);
      i += Math.round(sr / (300 + 700 * u) * (.6 + .8 * rand()));
    }
    sweep(out, Math.round(.08 * sr), sr, rand, { dur: .16, f0: 1600, f1: 2500, q: 1.3, band: .5, air: .25, airF: 1000, grainRate: 600, grainF: [1700, 3600], grainAmp: .45, flutter: .7, flutF: 32, peakAt: .3 }, .55);
    flap(out, Math.round(.22 * sr), sr, rand, 640, .22);
  } else {
    sweep(out, 0, sr, rand, p.sheet, 1);
    // most of the crackle comes as the page lifts, some as it slides over the next
    for (let g = 0, c = poisson(p.crinkle, rand); g < c; g++) {
      const u = rand() < .55 ? rand() * .18 : .18 + rand() * .6;
      grain(out, Math.round(u * p.sheet.dur * sr), sr, rand, between(p.crF, rand), p.crAmp * (.35 + .65 * rand()));
    }
    flap(out, Math.round(p.sheet.dur * .84 * sr), sr, rand, p.flapF, p.flap);
  }
  softTop(out, sr, p.top);
  for (let i = 0; i < out.length; i++) out[i] *= p.gain;
  return fadeOut(out, sr);
}

// ---------------------------------------------------------------- rain
// The wash is mostly specks (each a tiny tap, most of them faint, a few louder) over a little smooth pink
// noise; slow gusts repeat with the loop. The near drops are wet taps, now and then with a tiny bubble.
export const rain = { sr: 24000, seconds: 12, gain: 1.23, hp: 380, lp: 3000, wash: .25, specks: 900, speckF: [1500, 4000], speckAmp: 1, top: 4400, gust: .12, drops: 9, dropAmp: 1 };
function speck(buf, at, sr, rand, f, amp) {
  const n = Math.round(.006 * sr), ex = Math.max(1, Math.round((.0002 + .0005 * rand()) * sr)), bp = filter('bp', f, 1.5 + 2 * rand(), sr);
  for (let i = 0; i < n; i++) { const k = at + i; if (k >= buf.length) break; buf[k] += step(bp, i < ex ? white(rand) : 0) * amp; }
}
// [left, right], `seconds` long: the last sample runs straight on into the first
export function renderRainBed(sr = rain.sr, rand = Math.random, seconds = rain.seconds) {
  const R = rain, X = 1, N = Math.round(seconds * sr), n = Math.round((seconds + X) * sr), Xn = n - N;
  const ph1 = rand() * Math.PI * 2, ph2 = rand() * Math.PI * 2, ch = [new Float32Array(n), new Float32Array(n)];
  for (const buf of ch) {
    const hp = filter('hp', R.hp, .7, sr), lp = filter('lp', R.lp, .7, sr), lp2 = filter('lp', R.lp * 1.35, .7, sr);
    let p0 = 0, p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0, p6 = 0;
    for (let i = 0; i < n; i++) {
      const w = white(rand);
      p0 = .99886 * p0 + w * .0555179; p1 = .99332 * p1 + w * .0750759; p2 = .969 * p2 + w * .153852;
      p3 = .8665 * p3 + w * .3104856; p4 = .55 * p4 + w * .5329522; p5 = -.7616 * p5 - w * .016898;
      const pink = (p0 + p1 + p2 + p3 + p4 + p5 + p6 + w * .5362) * .11; p6 = w * .115926;
      buf[i] = step(lp2, step(lp, step(hp, pink))) * R.wash;
    }
    for (let k = 0, c = poisson(R.specks * (seconds + X) / 2, rand); k < c; k++) speck(buf, Math.floor(rand() * n), sr, rand, between(R.speckF, rand), R.speckAmp * Math.pow(rand(), 2.2));
    const t1 = filter('lp', R.top, .62, sr), t2 = filter('lp', R.top * 1.25, .7, sr), h = filter('hp', 90, .7, sr);
    for (let i = 0; i < n; i++) buf[i] = step(t2, step(t1, step(h, buf[i])));
  }
  for (let i = 0; i < n; i++) {
    const t = i / sr, g = R.gain * (1 + R.gust * (.6 * Math.sin(2 * Math.PI * t / seconds + ph1) + .4 * Math.sin(2 * Math.PI * 3 * t / seconds + ph2)));
    ch[0][i] *= g; ch[1][i] *= g;
  }
  // the second after the end crossfaded over the start
  const out = [new Float32Array(N), new Float32Array(N)];
  for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
    if (i < Xn) { const th = Math.PI / 2 * (i / Xn); out[c][i] = ch[c][i] * Math.sin(th) + ch[c][N + i] * Math.cos(th); }
    else out[c][i] = ch[c][i];
  }
  return out;
}
// the near drops due in [from, to) on any clock, in seconds; state keeps the time of the next one between calls
export function rainEvents(from, to, rand = Math.random, state = {}) {
  const ev = [], gap = () => -Math.log(1 - rand()) / rain.drops;
  if (state.next == null) state.next = from + gap();
  while (state.next < to) {
    if (state.next >= from) ev.push({ at: state.next, amp: rain.dropAmp * rain.gain * (.3 + .7 * rand()), pan: (rand() * 2 - 1) * .8 });
    state.next += gap();
  }
  return ev;
}
// one near drop, [left, right]: a wet tap, now and then a tiny bubble
export function renderDrop(ev, sr = 44100, rand = Math.random) {
  const n = Math.round(.05 * sr), x = new Float32Array(n);
  grain(x, 0, sr, rand, 1500 + 2700 * rand(), 1, 2 + 3 * rand());
  if (rand() < .25) {
    let ph = 0; const f0 = 1600 + 1200 * rand(), tau = .008 * sr, start = Math.round(.002 * sr);
    for (let i = start; i < n; i++) { const j = i - start; ph += 2 * Math.PI * f0 * (1 + .35 * (1 - Math.exp(-j / (.012 * sr)))) / sr; x[i] += Math.sin(ph) * Math.exp(-j / tau) * .35; }
  }
  const lp = filter('lp', 5200, .7, sr); for (let i = 0; i < n; i++) x[i] = step(lp, x[i]);
  fadeOut(x, sr);
  const th = (Math.max(-1, Math.min(1, ev.pan || 0)) + 1) * Math.PI / 4, gl = Math.cos(th) * ev.amp, gr = Math.sin(th) * ev.amp;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = x[i] * gl; R[i] = x[i] * gr; }
  return [L, R];
}

// ---------------------------------------------------------------- playing it (Web Audio)
let bed = null;
// Making the wash takes a moment (a few hundred milliseconds on a phone): do it ahead when rain is wanted
// before audio can start, so the first tap stays quick.
export function prepareRain() { bed = bed || renderRainBed(); }
// The wash loops on its own gain; the drops are made and scheduled a third of a second ahead. After the page has
// been away (timers sleep), the drops it missed are skipped, not played all at once.
export function rainPlayer(ctx, destination, { volume = 1, fade = 1.5 } = {}) {
  prepareRain();
  const buf = ctx.createBuffer(2, bed[0].length, rain.sr);
  buf.getChannelData(0).set(bed[0]); buf.getChannelData(1).set(bed[1]);
  const out = ctx.createGain(), src = ctx.createBufferSource();
  out.gain.value = 0; out.connect(destination);
  src.buffer = buf; src.loop = true; src.connect(out); src.start();
  out.gain.setTargetAtTime(Math.min(1, Math.max(0, volume)), ctx.currentTime, fade / 3);
  const state = {};
  let until = ctx.currentTime + .05, stopped = false;
  const drops = () => {
    if (stopped) return;
    const now = ctx.currentTime, to = now + .3;
    if (until < now) until = now;
    for (const ev of rainEvents(until, to, Math.random, state)) {
      const [l, r] = renderDrop(ev, ctx.sampleRate), b = ctx.createBuffer(2, l.length, ctx.sampleRate);
      b.getChannelData(0).set(l); b.getChannelData(1).set(r);
      const s = ctx.createBufferSource(); s.buffer = b; s.connect(out); s.start(Math.max(ev.at, ctx.currentTime));
    }
    until = to;
  };
  drops();
  const timer = setInterval(drops, 80);
  return {
    setVolume(v) { const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(Math.min(1, Math.max(0, v)), t, .2); },
    stop(f = 1.5) {
      if (stopped) return; stopped = true; clearInterval(timer);
      const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.setTargetAtTime(0, t, f / 3);
      setTimeout(() => { try { src.stop(); } catch { /* already stopped */ } out.disconnect(); }, f * 1000 + 800);
    },
  };
}
