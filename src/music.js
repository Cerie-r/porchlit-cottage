// Background music for the little house: soft generative pieces synthesised with Web Audio, so there are no audio
// files and nothing to license. Each piece has a key, a tempo, a few chord progressions and its own way of playing
// them; struck and plucked notes are rendered once per pitch into small buffers and reused, so it stays light on
// phones. The engine also runs on an OfflineAudioContext, which is how the mix was measured.
const TAU = Math.PI * 2;
const LOOK = 1.6; // seconds scheduled ahead of the clock
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const pcOf = m => ((m % 12) + 12) % 12;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function weighted(rng, pairs) {
  let s = 0;
  for (const p of pairs) s += p[1];
  let r = rng() * s;
  for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
  return pairs[pairs.length - 1][0];
}

// ---------- harmony ----------
const QUAL = {
  maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], 'maj7#11': [0, 4, 7, 11, 18], add9: [0, 4, 7, 14], '69': [0, 4, 7, 9, 14],
  m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], m6: [0, 3, 7, 9],
  sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], '9sus4': [0, 5, 7, 10, 14],
};
const QNAME = { maj7: 'maj7', maj9: 'maj9', 'maj7#11': 'maj7♯11', add9: 'add9', '69': '6/9', m7: 'm7', m9: 'm9', m6: 'm6', sus2: 'sus2', sus4: 'sus4', '7sus4': '7sus4', '9sus4': '9sus4' };
const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
export function makeChord(key, deg, q, flats) {
  const r = pcOf(key + deg);
  return { root: r, fifth: pcOf(r + 7), q, pcs: [...new Set(QUAL[q].map(x => pcOf(r + x)))], name: (flats ? FLAT : SHARP)[r] + QNAME[q] };
}
export function place(pc, lo, hi) { for (let m = lo; m <= hi; m++) if (pcOf(m) === pc) return m; return lo; }
function nearestPc(m, pcs) {
  for (let d = 0; d < 7; d++) { if (pcs.includes(pcOf(m + d))) return m + d; if (pcs.includes(pcOf(m - d))) return m - d; }
  return m;
}
// put the chord's tones inside [lo, hi], moving as little as possible from the last voicing
export function voiceChord(c, lo, hi, count, prev, rng) {
  let use = c.pcs.slice();
  if (use.length > count) use = use.filter(pc => pc !== c.root);   // the bass has the root
  if (use.length > count) use = use.filter(pc => pc !== c.fifth);
  while (use.length > count) use.pop();
  for (let k = 0; use.length < count; k++) use.push([c.root, c.fifth, ...c.pcs][k % (c.pcs.length + 2)]);
  const opts = use.map(pc => { const o = []; for (let m = lo; m <= hi; m++) if (pcOf(m) === pc) o.push(m); return o; });
  let best = null, bestScore = Infinity;
  const pick = [];
  (function rec(i) {
    if (i === opts.length) {
      const v = pick.slice().sort((a, b) => a - b);
      let s = 0;
      for (let k = 1; k < v.length; k++) {
        const gap = v[k] - v[k - 1];
        if (gap === 0) return;
        if (v[k - 1] < 55 && gap < 3) return;       // no muddy clusters down low
        if (gap === 1) s += 6;                       // semitone rubs only if nothing else fits
      }
      if (v[v.length - 1] - v[0] > 16) return;
      if (prev && prev.length === v.length) for (let k = 0; k < v.length; k++) s += Math.abs(v[k] - prev[k]);
      else s += Math.abs((v[0] + v[v.length - 1]) / 2 - (lo + hi) / 2);
      s += rng() * .6;
      if (s < bestScore) { bestScore = s; best = v; }
      return;
    }
    for (const m of opts[i]) { pick.push(m); rec(i + 1); pick.pop(); }
  })(0);
  if (best) return best;
  // nothing fitted the spacing rules: take distinct chord tones as close to the asked ones as the range allows
  const used = new Set(), v = [], all = [];
  for (let m = lo; m <= hi; m++) if (c.pcs.includes(pcOf(m))) all.push(m);
  for (const o of opts) { const m = o.find(x => !used.has(x)) ?? all.find(x => !used.has(x)); if (m != null) { used.add(m); v.push(m); } }
  return v.sort((a, b) => a - b);
}

// ---------- melody: short motifs that come back, with room to breathe ----------
export function motif(rng, slots, density, maxNotes, meter) {
  const out = [];
  let s = rng() < .7 ? 0 : 1;
  while (s < slots - 1 && out.length < maxNotes) {
    const len = weighted(rng, [[1, .3], [2, .38], [3, .14], [4, .18]]);
    out.push({ s, len: Math.min(len, slots - s), step: out.length ? weighted(rng, [[-2, .12], [-1, .3], [0, .06], [1, .3], [2, .14], [3, .04], [-3, .04]]) : 0 });
    s += len + (rng() > density ? weighted(rng, [[1, .5], [2, .35], [4, .15]]) : 0);
  }
  if (out.length) { const l = out[out.length - 1]; l.len = Math.max(l.len, Math.min(meter * 2, slots - l.s)); l.last = true; }
  return out;
}
function vary(m, rng) {
  if (!m) return null;
  const v = m.map(n => Object.assign({}, n));
  for (let k = Math.max(1, v.length - 2); k < v.length; k++) v[k].step = weighted(rng, [[-2, .2], [-1, .3], [1, .3], [2, .2]]);
  return v;
}

// ---------- sounds rendered once per pitch ----------
function normalize(d, peak) {
  let m = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > m) m = a; }
  if (m > 0) { const k = peak / m; for (let i = 0; i < d.length; i++) d[i] *= k; }
}
// decaying sine partials, each a cheap recursive oscillator with a quick fall and a long tail
function partials(d, sr, list, attack) {
  for (const p of list) {
    if (p.f >= sr * .45) continue;
    const w = TAU * p.f / sr, c = 2 * Math.cos(w);
    let s1 = Math.sin(p.ph - w), s2 = Math.sin(p.ph - 2 * w);
    const k1 = Math.exp(-1 / (p.t1 * sr)), k2 = Math.exp(-1 / (p.t2 * sr)), ka = Math.exp(-1 / (attack * sr));
    let e1 = p.a * p.mix, e2 = p.a * (1 - p.mix), ra = 1;
    for (let n = 0; n < d.length; n++) {
      const s = c * s1 - s2; s2 = s1; s1 = s;
      d[n] += s * (e1 + e2) * (1 - ra);
      e1 *= k1; e2 *= k2; ra *= ka;
      if (e1 + e2 < 2e-5) break;
    }
  }
}
function Voices(ctx, rng) {
  const sr = ctx.sampleRate, cache = new Map();
  function buffer(key, secs, fill, channels = 1) {
    let b = cache.get(key);
    if (!b) {
      b = ctx.createBuffer(channels, Math.max(1, Math.ceil(secs * sr)), sr); fill(b);
      for (let ch = 0; ch < channels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) if (!Number.isFinite(d[i])) d[i] = 0; }
      cache.set(key, b);
    }
    return b;
  }
  function thump(d, cutoff, amp, tau) {
    let lp = 0;
    const k = 1 - Math.exp(-TAU * cutoff / sr);
    for (let n = 0; n < sr * tau * 6 && n < d.length; n++) { lp += ((rng() * 2 - 1) - lp) * k; d[n] += lp * amp * Math.exp(-n / (sr * tau)); }
  }
  return {
    // a felt-damped upright: dark, soft hammer, two strings that beat a little
    felt: m => buffer('felt' + m, m < 50 ? 6 : m < 68 ? 5 : 3.8, b => {
      const d = b.getChannelData(0), f = mtof(m), B = .00035, base = 2.6 * Math.pow(2, -(m - 60) / 18), list = [];
      [1, .36, .14, .07, .035, .018].forEach((a, i) => {
        const n = i + 1, fn = f * n * Math.sqrt(1 + B * n * n), t2 = base / (1 + .6 * i), t1 = t2 * .22;
        for (const det of n <= 3 ? [-.0005, .0005] : [0]) list.push({ f: fn * (1 + det), a: n <= 3 ? a / 2 : a, t1, t2, mix: .55, ph: rng() * TAU });
      });
      partials(d, sr, list, .006);
      thump(d, 380, .45, .008);
      normalize(d, .8);
    }),
    // music box comb: a clear tone, a soft octave, a faint shimmer
    box: m => buffer('box' + m, 3.2, b => {
      const d = b.getChannelData(0), f = mtof(m), tl = 1.5 * Math.pow(2, -(m - 79) / 24);
      partials(d, sr, [
        { f, a: 1, t1: tl * .3, t2: tl, mix: .3, ph: 0 },
        { f: f * 1.003, a: .25, t1: tl * .3, t2: tl, mix: .3, ph: .5 },
        { f: f * 2, a: .24, t1: .08, t2: tl * .35, mix: .5, ph: 1 },
        { f: f * 4.07, a: .08, t1: .03, t2: .25, mix: .6, ph: 2 },
      ], .0015);
      normalize(d, .8);
    }),
    marimba: m => buffer('mar' + m, 1.8, b => {
      const d = b.getChannelData(0), f = mtof(m), t = .55 * Math.pow(2, -(m - 60) / 20);
      partials(d, sr, [
        { f, a: 1, t1: t * .4, t2: t, mix: .4, ph: 0 },
        { f: f * 3.93, a: .18, t1: .02, t2: t * .25, mix: .7, ph: 1 },
        { f: f * 9.2, a: .03, t1: .008, t2: .04, mix: .7, ph: 2 },
      ], .002);
      thump(d, 900, .2, .004);
      normalize(d, .8);
    }),
    vib: m => buffer('vib' + m, 3.6, b => {
      const d = b.getChannelData(0), f = mtof(m);
      partials(d, sr, [
        { f, a: 1, t1: .5, t2: 2.2, mix: .25, ph: 0 },
        { f: f * 4, a: .12, t1: .05, t2: .5, mix: .6, ph: 1 },
        { f: f * 10, a: .02, t1: .01, t2: .08, mix: .7, ph: 2 },
      ], .002);
      normalize(d, .8);
    }),
    bass: (m, kind) => buffer('bass' + kind + m, kind === 'long' ? 8 : 2.4, b => {
      const d = b.getChannelData(0), f = mtof(m), t = kind === 'pizz' ? .35 : kind === 'long' ? 4.5 : 1.1;
      partials(d, sr, [
        { f, a: 1, t1: t * .5, t2: t, mix: .3, ph: 0 },
        { f: f * 2, a: .28, t1: t * .2, t2: t * .5, mix: .5, ph: .3 },
        { f: f * 3, a: .08, t1: t * .1, t2: t * .3, mix: .5, ph: .6 },
      ], kind === 'pizz' ? .003 : .008);
      normalize(d, .85);
    }),
    // rain heard from inside: dark pink noise that swells a little, and a few soft drops on the glass
    rain: () => buffer('rain', 8, b => {
      const L = b.length, X = Math.floor(sr);
      for (let ch = 0; ch < 2; ch++) {
        const tmp = new Float32Array(L + X);
        let b0 = 0, b1 = 0, b2 = 0, l1 = 0, l2 = 0;
        const k1 = 1 - Math.exp(-TAU * 1700 / sr), k2 = 1 - Math.exp(-TAU * 2600 / sr);
        for (let i = 0; i < L + X; i++) {
          const w = rng() * 2 - 1;
          b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913;
          l1 += ((b0 + b1 + b2 + w * .1848) * .2 - l1) * k1; l2 += (l1 - l2) * k2;
          tmp[i] = l2 * (1 + .16 * Math.sin(TAU * .09 * i / sr + ch) + .08 * Math.sin(TAU * .23 * i / sr + 2 * ch));
        }
        const drops = Math.floor((L + X) / sr * 7);
        for (let k = 0; k < drops; k++) {
          const at = Math.floor(rng() * (L + X - sr * .1)), fr = 900 + rng() * 1500, a = .03 + rng() * .05, tau = .005 + rng() * .015;
          for (let n = 0; n < sr * .08; n++) tmp[at + n] += a * Math.sin(TAU * fr * n / sr) * Math.exp(-n / (tau * sr));
        }
        const d = b.getChannelData(ch);
        for (let i = 0; i < L; i++) d[i] = tmp[i];
        for (let i = 0; i < X; i++) { const u = i / X; d[i] = tmp[i] * u + tmp[L + i] * (1 - u); }  // seamless loop
        normalize(d, .7);
      }
    }, 2),
    noise: () => buffer('noise', 1, b => { const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rng() * 2 - 1; }),
  };
}
// a small room: dark stereo noise tail, brighter at first
function impulse(ctx, secs, rng) {
  const sr = ctx.sampleRate, n = Math.floor(secs * sr), b = ctx.createBuffer(2, n, sr), pre = Math.floor(.012 * sr), tau = secs / 6.9;
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0, e = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / sr, fc = 1300 + 5200 * Math.exp(-t / (secs * .22)), k = 1 - Math.exp(-TAU * fc / sr);
      lp += ((rng() * 2 - 1) - lp) * k;
      d[i] = lp * Math.exp(-t / tau); e += d[i] * d[i];
    }
    const s = 1 / Math.sqrt(e || 1);
    for (let i = 0; i < n; i++) d[i] *= s;
  }
  return b;
}
export function filt(ctx, type, freq, Q, gain) {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = Q;
  if (gain != null) f.gain.value = gain;
  return f;
}

// ---------- the flavours ----------
const DAY_PLAN = ['A', 'A2', 'B', '-', 'A', 'A2', 'C', '-'];
const NIGHT_PLAN = ['A', '-', 'A2', '-', 'B', '-', '-', '-'];
export const FLAVORS = [
  {
    id: 'sun', mood: 'day', name: '暖阳', note: '电钢琴和颤音琴，慢慢摇的拍子，一点刷子鼓',
    key: 5, flats: true, bpm: 76, swing: .6, chordBars: 1, level: 0.43,
    progs: [
      [[0, 'maj9'], [9, 'm9'], [2, 'm9'], [7, '9sus4']],
      [[5, 'maj9'], [4, 'm7'], [9, 'm9'], [0, 'maj9']],
      [[0, 'maj7'], [4, 'm7'], [5, 'maj7'], [7, '9sus4']],
    ],
    reverb: { len: 2.4, wet: .22 },
    setup(P) {
      const ctx = P.ctx, pan = ctx.createStereoPanner();
      P.lfo(3.2, .25, pan.pan);                          // the electric piano drifts gently left and right
      P.epIn = P.bus(.18, filt(ctx, 'lowpass', 4600, .5), pan);
      P.vibIn = P.bus(.3, filt(ctx, 'lowpass', 4200, .5), P.tremolo(4.8, .3));
      P.bassIn = P.bus(.04, filt(ctx, 'lowpass', 600, .7));
      P.drumIn = P.bus(.12, filt(ctx, 'lowpass', 6000, .5));
      P.padIn = P.bus(.35, filt(ctx, 'lowpass', 1200, .6));
    },
    bar(P, i, t) {
      const c = P.chord(i), nx = P.chord(i + 1), r = P.rng;
      P.emit(t, 'chord', { name: c.name });
      const v = P.voice('ep', c, 53, 74, 4);
      v.forEach((m, k) => P.ep(P.hum(t + k * .016, .006), m, .5 + r() * .12, P.beat * 1.8));
      if (r() < .65) v.slice(1).forEach((m, k) => P.ep(P.hum(t + P.slot(3) + k * .012, .006), m, .32 + r() * .08, P.beat * .8));
      if (r() < .3) v.slice(2).forEach((m, k) => P.ep(P.hum(t + P.slot(6) + k * .01, .006), m, .28 + r() * .06, P.beat * .6));
      const root = place(c.root, 36, 47);
      P.play(P.V.bass(root, 'round'), P.hum(t, .006), .42, P.beat * 1.7, P.bassIn);
      if (r() < .55) P.play(P.V.bass(r() < .5 ? root + 7 : root + 12, 'round'), P.hum(t + P.slot(5), .008), .26, P.beat * .7, P.bassIn);
      if (r() < .25) P.play(P.V.bass(place(nx.root, 36, 47) + (r() < .5 ? -1 : 2), 'round'), P.hum(t + P.slot(7), .008), .22, P.beat * .4, P.bassIn);
      P.hit(P.hum(t, .004), 'kick', .26);
      if (r() < .4) P.hit(P.hum(t + P.slot(5), .006), 'kick', .16);
      for (const k of [2, 6]) P.hit(P.hum(t + P.slot(k), .008), 'brush', .14 + r() * .04);
      for (let k = 1; k < 8; k += 2) if (r() < .8) P.hit(P.hum(t + P.slot(k), .006), 'shaker', .08 + r() * .04);
      P.pad(t, P.voice('pad', c, 62, 79, 3), P.barDur, .016);
      P.melody(i, t, { plan: DAY_PLAN, lo: 72, hi: 89, density: .55, vel: [.5, .66], play: (tt, m, vel, dur) => P.play(P.V.vib(m), tt, vel, dur + .3, P.vibIn, { rel: .4 }) });
    },
  },
  {
    id: 'laundry', mood: 'day', name: '晾衣服', note: '木琴叮叮咚咚，像在阳台上晾床单',
    key: 10, flats: true, bpm: 86, swing: .56, chordBars: 1, level: 0.75,
    progs: [
      [[0, '69'], [5, 'maj7'], [2, 'm7'], [7, '7sus4']],
      [[0, 'maj7'], [9, 'm7'], [5, '69'], [7, '7sus4']],
      [[5, 'maj7'], [7, '7sus4'], [0, '69'], [9, 'm7']],
    ],
    reverb: { len: 1.8, wet: .2 },
    setup(P) {
      const ctx = P.ctx;
      P.marIn = P.bus(.18, filt(ctx, 'lowpass', 5000, .5));
      P.glkIn = P.bus(.35, filt(ctx, 'lowpass', 5200, .5));
      P.bassIn = P.bus(.04, filt(ctx, 'lowpass', 700, .7));
      P.padIn = P.bus(.3, filt(ctx, 'lowpass', 1100, .6));
    },
    bar(P, i, t) {
      const c = P.chord(i), r = P.rng;
      P.emit(t, 'chord', { name: c.name });
      const v = P.voice('mar', c, 58, 79, 4);
      const pat = [[0, 2, 1, 3, 2, 1, 3, 2], [0, 1, 2, 3, 1, 2, 3, 1], [1, 3, 2, 0, 2, 3, 1, 2]][Math.floor(r() * 3)];
      pat.forEach((ix, k) => {
        if (k && r() < .14) return;
        const acc = k % 4 === 0 ? .5 : k % 2 ? .3 : .38;
        P.play(P.V.marimba(v[ix]), P.hum(t + P.slot(k), .008), acc + r() * .06, null, P.marIn, { pan: (v[ix] - 68) / 30 });
      });
      const root = place(c.root, 34, 45);
      P.play(P.V.bass(root, 'pizz'), P.hum(t, .005), .38, P.beat * .9, P.bassIn);
      P.play(P.V.bass(r() < .7 ? root + 7 : root + 12, 'pizz'), P.hum(t + P.slot(4), .006), .28, P.beat * .8, P.bassIn);
      P.pad(t, P.voice('pad', c, 62, 77, 3), P.barDur, .01, { wave: 'sine' });
      P.melody(i, t, { plan: DAY_PLAN, lo: 81, hi: 96, density: .4, maxNotes: 5, vel: [.24, .34], play: (tt, m, vel) => P.play(P.V.box(m), tt, vel, null, P.glkIn) });
    },
  },
  {
    id: 'moon', mood: 'night', name: '月光', note: '毛毡钢琴一个音一个音地落下来，很慢',
    key: 1, flats: true, bpm: 60, swing: .5, chordBars: 2, level: 0.81,
    progs: [
      [[0, 'maj7'], [5, 'maj7#11'], [9, 'm9'], [5, 'maj9']],
      [[0, 'maj9'], [4, 'm7'], [5, 'maj7'], [5, 'm6']],
      [[9, 'm9'], [5, 'maj9'], [0, 'maj7'], [7, 'sus4']],
    ],
    reverb: { len: 3.6, wet: .34 },
    setup(P) {
      P.pnoIn = P.bus(.32, filt(P.ctx, 'lowpass', 3400, .5));
      P.padIn = P.bus(.45, filt(P.ctx, 'lowpass', 900, .6));
    },
    bar(P, i, t) {
      const c = P.chord(i), r = P.rng, first = i % 2 === 0;
      if (first) P.emit(t, 'chord', { name: c.name });
      const pno = (m, tt, vel, dur) => P.play(P.V.felt(m), P.hum(tt, .02), vel, dur, P.pnoIn, { rel: .8, lp: 1300 + 2800 * vel, pan: (m - 64) / 50 });
      const root = place(c.root, 37, 48);
      if (first) { pno(root, t, .3, P.barDur * 2); pno(root + 7, t + P.slot(4), .18, P.barDur * 1.4); }
      else pno(root + 12, t, .18, P.barDur);
      const v = P.voice('rh', c, 58, 75, 4);
      const pat = first ? [[0, 0], [2, 1], [3, 2], [4, 3], [6, 2]] : [[0, 1], [2, 2], [4, 3], [5, 2], [6, 1]];
      pat.forEach(([k, ix]) => { if (r() >= .12) pno(v[ix], t + P.slot(k), .27 + r() * .1, P.beat * 2.5); });
      if (first) P.pad(t, P.voice('pad', c, 55, 72, 3), P.barDur * 2, .012, { wave: 'sine', att: 2.2, rel: 2.6 });
      P.melody(i, t, { plan: NIGHT_PLAN, lo: 76, hi: 91, density: .35, maxNotes: 5, vel: [.4, .5], legato: 1.6, play: (tt, m, vel, dur) => pno(m, tt, vel, dur + 1) });
    },
  },
  {
    id: 'cradle', mood: 'night', name: '摇篮', note: '八音盒的三拍子，像有人轻轻推着摇篮',
    key: 7, flats: false, bpm: 54, meter: 3, swing: .5, chordBars: 2, level: 0.53,
    progs: [
      [[0, 'add9'], [9, 'm7'], [5, 'maj7'], [7, 'sus4']],
      [[0, 'add9'], [4, 'm7'], [5, 'add9'], [0, 'add9']],
      [[5, 'maj7'], [0, 'add9'], [9, 'm7'], [7, '7sus4']],
    ],
    reverb: { len: 3.2, wet: .36 },
    setup(P) {
      P.boxIn = P.bus(.35, filt(P.ctx, 'lowpass', 4800, .5));
      P.padIn = P.bus(.45, filt(P.ctx, 'lowpass', 850, .6));
      P.bassIn = P.bus(.08, filt(P.ctx, 'lowpass', 400, .7));
    },
    bar(P, i, t) {
      const c = P.chord(i), r = P.rng, first = i % 2 === 0;
      if (first) P.emit(t, 'chord', { name: c.name });
      const v = P.voice('box', c, 67, 82, 4);
      (first ? [0, 1, 2, 3, 2, 1] : [0, 2, 1, 3, 1, 2]).forEach((ix, k) => {
        if (k && r() < .1) return;
        P.play(P.V.box(v[ix]), P.hum(t + P.slot(k), .012), (k === 0 ? .3 : .2) + r() * .06, null, P.boxIn, { pan: (v[ix] - 74) / 24 });
      });
      if (first) {
        P.play(P.V.bass(place(c.root, 38, 49), 'long'), t, .22, P.barDur * 2, P.bassIn, { rel: 1 });
        P.pad(t, P.voice('pad', c, 55, 71, 3), P.barDur * 2, .012, { wave: 'sine', att: 2, rel: 2.4 });
      }
      P.melody(i, t, { plan: ['A', 'A2', 'B', '-', 'A', 'A2', '-', '-'], lo: 79, hi: 93, density: .3, maxNotes: 4, vel: [.34, .44], play: (tt, m, vel) => P.play(P.V.box(m), tt, vel, null, P.boxIn) });
    },
  },
  {
    id: 'rain', mood: 'night', name: '雨夜', note: '窗外下着小雨，屋里只有很长很软的和声',
    key: 4, flats: false, bpm: 50, swing: .5, chordBars: 2, level: 1.16,
    progs: [
      [[0, 'maj9'], [5, 'maj7#11'], [9, 'm9'], [5, 'maj9']],
      [[0, 'maj9'], [9, 'm9'], [4, 'm7'], [5, 'maj7#11']],
    ],
    reverb: { len: 4.6, wet: .42 },
    setup(P) {
      const ctx = P.ctx, sweep = filt(ctx, 'lowpass', 1000, .7);
      P.lfo(.045, 380, sweep.frequency);
      P.padIn = P.bus(.5, sweep);
      P.pnoIn = P.bus(.45, filt(ctx, 'lowpass', 2200, .5));
      P.bassIn = P.bus(.1, filt(ctx, 'lowpass', 260, .7));
      P.rainIn = P.bus(.05, filt(ctx, 'lowpass', 3200, .5));
      const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = P.V.rain(); s.loop = true;
      g.gain.setValueAtTime(0, P.next); g.gain.linearRampToValueAtTime(.4, P.next + 6);
      s.connect(g); g.connect(P.rainIn); s.start(P.next); P.sources.push(s);
    },
    bar(P, i, t) {
      const c = P.chord(i), r = P.rng, first = i % 2 === 0;
      if (first) {
        P.emit(t, 'chord', { name: c.name });
        P.pad(t, P.voice('pad', c, 52, 74, 4), P.barDur * 2, .016, { wave: 'triangle', att: 3.5, rel: 4 });
        P.play(P.V.bass(place(c.root, 33, 44), 'long'), t, .16, P.barDur * 2, P.bassIn, { rel: 2 });
      }
      const n = r() < .55 ? 1 : r() < .5 ? 2 : 0, pool = P.melScale(64, 86);
      for (let k = 0; k < n; k++) {
        let m = pool[Math.floor(r() * pool.length)];
        if (r() < .6) m = nearestPc(m, c.pcs);
        const tt = P.hum(t + P.slot(Math.floor(r() * 8)), .03);
        P.play(P.V.felt(m), tt, .22 + r() * .12, P.beat * 3, P.pnoIn, { rel: 1.2, lp: 2000, pan: (r() - .5) * .8 });
        P.emit(tt, 'mel', { midi: m });
      }
    },
  },
];

// ---------- the engine ----------
// opts.pieces: more pieces shaped like FLAVORS (a home's own); the list is read each time a piece starts.
export function createMusicEngine(ctx, destination, opts = {}) {
  const rng = mulberry(opts.seed ?? ((Math.random() * 4294967296) >>> 0));
  const V = Voices(ctx, rng);
  const master = ctx.createGain();
  master.gain.value = opts.volume ?? .8;
  const low = filt(ctx, 'lowshelf', 160, .7, -2), high = filt(ctx, 'highshelf', 6500, .7, -2);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.ratio.value = 2.5; comp.attack.value = .02; comp.release.value = .35; comp.knee.value = 12;
  master.connect(low); low.connect(high); high.connect(comp); comp.connect(destination);
  const players = [], listeners = [];
  let timer = null, current = null;

  function makePlayer(F, at, fade) {
    const P = { F, ctx, rng, V, bar: 0, next: at, t0: at, stopAt: Infinity, lfos: [], sources: [], voices: {}, scales: {}, progOf: [], mel: {} };
    P.beat = 60 / F.bpm; P.meter = F.meter || 4; P.barDur = P.beat * P.meter;
    P.slot = k => Math.floor(k / 2) * P.beat + (k % 2 ? (F.swing || .5) * P.beat : 0);
    P.hum = (t, a = .008) => Math.max(at, t + (rng() - .5) * a);
    P.out = ctx.createGain();
    P.out.gain.setValueAtTime(0, at); P.out.gain.linearRampToValueAtTime(F.level, at + Math.max(.01, fade));
    P.out.connect(master);
    P.dry = ctx.createGain(); P.dry.connect(P.out);
    P.send = ctx.createGain();
    const conv = ctx.createConvolver(), wet = ctx.createGain();
    conv.normalize = false; conv.buffer = impulse(ctx, F.reverb.len, rng); wet.gain.value = F.reverb.wet;
    P.send.connect(conv); conv.connect(wet); wet.connect(P.out);
    // an instrument bus: its own filters, then dry plus a send to the room
    P.bus = (send, ...chain) => {
      const input = ctx.createGain();
      let last = input;
      for (const n of chain) { last.connect(n); last = n; }
      const s = ctx.createGain(); s.gain.value = send;
      last.connect(P.dry); last.connect(s); s.connect(P.send);
      return input;
    };
    P.lfo = (rate, depth, param) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start(at); P.lfos.push(o);
    };
    P.tremolo = (rate, depth) => { const g = ctx.createGain(); g.gain.value = 1 - depth / 2; P.lfo(rate, depth / 2, g.gain); return g; };
    P.chord = i => {
      if (F.chordAt) return F.chordAt(i);                // a piece with a written-out form names its own chords
      const cb = F.chordBars || 1, ci = Math.floor(i / cb), cycle = Math.floor(ci / 4);
      while (P.progOf.length <= cycle) {
        const prev = P.progOf[P.progOf.length - 1];
        P.progOf.push(prev == null ? 0 : rng() < .45 ? prev : Math.floor(rng() * F.progs.length));
      }
      const [deg, q] = F.progs[P.progOf[cycle]][ci % 4];
      return makeChord(F.key, deg, q, F.flats);
    };
    P.voice = (name, c, lo, hi, count) => (P.voices[name] = voiceChord(c, lo, hi, count, P.voices[name], rng));
    P.melScale = (lo, hi) => {
      const k = lo + ':' + hi;
      if (!P.scales[k]) { const pcs = [0, 2, 4, 7, 9].map(x => pcOf(F.key + x)), s = []; for (let m = lo; m <= hi; m++) if (pcs.includes(pcOf(m))) s.push(m); P.scales[k] = s; }
      return P.scales[k];
    };
    P.emit = (t, type, data) => { for (const fn of listeners) fn(Object.assign({ t, type, flavor: F.id }, data)); };
    P.play = (buf, t, vel, dur, input, o = {}) => {
      if (!buf || !Number.isFinite(t) || !Number.isFinite(vel)) return;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf;
      g.gain.setValueAtTime(vel, t);
      const rel = o.rel || .15;
      let end = t + buf.duration;
      if (dur != null) { g.gain.setValueAtTime(vel, t + dur); g.gain.setTargetAtTime(0, t + dur, rel); end = Math.min(end, t + dur + rel * 6); }
      let node = src;
      if (o.lp) { const f = filt(ctx, 'lowpass', o.lp, .5); src.connect(f); node = f; }
      node.connect(g);
      if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-.9, Math.min(.9, o.pan)); g.connect(p); p.connect(input); }
      else g.connect(input);
      src.start(t); src.stop(end);
    };
    // electric piano: two-operator FM, bright at the strike and mellow after
    P.ep = (t, m, vel, dur) => {
      if (!Number.isFinite(m)) return;
      const f = mtof(m), car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), amp = ctx.createGain();
      car.frequency.value = f; mod.frequency.value = f;
      const I = (1.1 + 2.4 * vel) * f;
      mg.gain.setValueAtTime(I, t); mg.gain.setTargetAtTime(I * .22, t, .22);
      mod.connect(mg); mg.connect(car.frequency);
      const tau = 1.5 * Math.pow(2, -(m - 60) / 24);
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(vel * .5, t + .003);
      amp.gain.setTargetAtTime(0, t + .003, tau); amp.gain.setTargetAtTime(0, t + dur, .09);
      car.connect(amp); amp.connect(P.epIn);
      const end = t + dur + .6;
      car.start(t); mod.start(t); car.stop(end); mod.stop(end);
    };
    P.pad = (t, midis, dur, level, o = {}) => {
      const att = o.att ?? 1.2, rel = o.rel ?? 1.6;
      midis.forEach((m, k) => {
        if (!Number.isFinite(m)) return;
        const g = ctx.createGain(), pan = ctx.createStereoPanner();
        pan.pan.value = midis.length > 1 ? (k / (midis.length - 1) - .5) * .7 : 0;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + att);
        g.gain.setValueAtTime(level, t + Math.max(att, dur)); g.gain.linearRampToValueAtTime(0, t + Math.max(att, dur) + rel);
        for (const det of [-6, 5]) {
          const osc = ctx.createOscillator();
          osc.type = o.wave || 'triangle'; osc.frequency.value = mtof(m); osc.detune.value = det + (rng() - .5) * 4;
          osc.connect(g); osc.start(t); osc.stop(t + Math.max(att, dur) + rel + .05);
        }
        g.connect(pan); pan.connect(P.padIn);
      });
    };
    P.hit = (t, kind, vel) => {
      if (kind === 'kick') {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + .09);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .004); g.gain.setTargetAtTime(0, t + .004, .07);
        o.connect(g); g.connect(P.drumIn); o.start(t); o.stop(t + .5);
        return;
      }
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), brush = kind === 'brush';
      src.buffer = V.noise();
      f.type = 'bandpass'; f.frequency.value = brush ? 2400 : 5200; f.Q.value = brush ? .6 : 1.1;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + (brush ? .025 : .006)); g.gain.setTargetAtTime(0, t + (brush ? .025 : .006), brush ? .07 : .025);
      src.connect(f); f.connect(g); g.connect(P.drumIn);
      src.start(t, rng() * .5); src.stop(t + .5);
    };
    P.melody = (i, t, M) => {
      const spb = P.meter * 2, half = i % 2, cu = Math.floor(i / 2) % M.plan.length, kind = M.plan[cu], st = P.mel;
      if (half === 0) {
        if (cu === 0 && (!st.A || rng() < .5)) st.A = motif(rng, spb * 2, M.density, M.maxNotes || 7, P.meter);
        if (!st.A) st.A = motif(rng, spb * 2, M.density, M.maxNotes || 7, P.meter);
        st.cur = kind === '-' ? null : kind === 'A' ? st.A : kind === 'A2' ? vary(st.A, rng) : motif(rng, spb * 2, M.density * .9, M.maxNotes || 7, P.meter);
        if (kind !== 'A2') st.idx = null;
      }
      if (!st.cur) return;
      const scale = P.melScale(M.lo, M.hi), c = P.chord(i);
      for (const n of st.cur) {
        if (Math.floor(n.s / spb) !== half) continue;
        const k = n.s % spb, strong = k % (P.meter === 3 ? 6 : 4) === 0;
        let idx;
        if (st.idx == null) {
          const mid = (M.lo + M.hi) / 2;
          let bd = 1e9; idx = 0;
          scale.forEach((m, j) => { const d = Math.abs(m - mid) + (c.pcs.includes(pcOf(m)) ? 0 : 6); if (d < bd) { bd = d; idx = j; } });
        } else idx = Math.max(0, Math.min(scale.length - 1, st.idx + n.step));
        let m = scale[idx];
        if ((strong || n.last) && !c.pcs.includes(pcOf(m))) { const ct = nearestPc(m, c.pcs); if (ct >= M.lo - 2 && ct <= M.hi + 2) m = ct; }
        st.idx = idx;
        const vel = (M.vel[0] + (M.vel[1] - M.vel[0]) * rng()) * (strong ? 1.1 : .92);
        const tt = P.hum(t + P.slot(k), .012);
        M.play(tt, m, vel, n.len * P.beat / 2 * (M.legato || 1));
        P.emit(tt, 'mel', { midi: m, vel });
      }
    };
    F.setup(P);
    return P;
  }

  function retire(P, now, fade) {
    const g = P.out.gain;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
    else { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); }
    g.setTargetAtTime(0, now, Math.max(.01, fade) / 3);
    P.stopAt = now + fade;
  }
  function schedule(until) {
    for (const P of players) {
      while (P.next < until && P.next < P.stopAt) { P.F.bar(P, P.bar, P.next); P.bar++; P.next += P.barDur; }
    }
  }
  function tick() {
    const now = ctx.currentTime;
    schedule(now + LOOK);
    for (let k = players.length - 1; k >= 0; k--) {
      const P = players[k];
      if (P.stopAt + 10 < now) {
        for (const o of P.lfos) try { o.stop(); } catch (e) {}
        for (const s of P.sources) try { s.stop(); } catch (e) {}
        P.out.disconnect(); players.splice(k, 1);
      }
    }
  }
  return {
    flavors: FLAVORS,
    play(id, o = {}) {
      const F = FLAVORS.find(f => f.id === id) || (opts.pieces || []).find(f => f.id === id);
      if (!F) return null;
      const at = o.at ?? ctx.currentTime + .08, fade = o.fade ?? 3;
      for (const P of players) if (P.stopAt === Infinity) retire(P, at, fade);
      current = makePlayer(F, at, fade);
      players.push(current);
      schedule(at + LOOK);
      if (o.live !== false && opts.live !== false && !timer) timer = setInterval(tick, 200);
      return current;
    },
    stop(o = {}) {
      const at = ctx.currentTime + .02;
      for (const P of players) if (P.stopAt === Infinity) retire(P, at, o.fade ?? 2.5);
      current = null;
    },
    setVolume(v) { master.gain.setTargetAtTime(v, ctx.currentTime, .08); },
    scheduleUntil: schedule,
    tick,
    onEvent(fn) { listeners.push(fn); },
    get current() { return current ? current.F.id : null; },
    dispose() { if (timer) clearInterval(timer); timer = null; },
  };
}


// ---------- the house: music while someone is home, and a gramophone to change it or stop it ----------
export const MUSIC_KEY = 'porchlit-music-v1';        // this device's music volume and switch; not part of the saved home
export const PIECES = Object.fromEntries(FLAVORS.map(f => [f.id, { name: f.name, mood: f.mood }]));
export const MOOD_PIECES = { day: FLAVORS.filter(f => f.mood === 'day').map(f => f.id), night: FLAVORS.filter(f => f.mood === 'night').map(f => f.id) };
export const moodFor = daylight => (daylight >= .5 ? 'day' : 'night');
const ROTATE = [7 * 60, 10 * 60];                    // seconds a piece plays before the next one fades in by itself
const browser = typeof window !== 'undefined' && typeof document !== 'undefined';

function readPrefs() {
  try { const p = JSON.parse(localStorage.getItem(MUSIC_KEY)); return p && typeof p === 'object' ? p : {}; }
  catch (e) { return {}; }
}
function readVolume() { const v = readPrefs().volume; return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : .8; }
// `off`: this device turned the music off on the remote, so coming home stays quiet until it's turned back on.
const S = { home: false, on: true, off: browser ? readPrefs().off === true : false, mood: 'day', piece: null, playing: false, muted: false, volume: browser ? readVolume() : .8, rotateAt: 0, visit: { day: -1, night: -1 } };
function savePrefs() { try { localStorage.setItem(MUSIC_KEY, JSON.stringify({ volume: S.volume, ...(S.off ? { off: true } : {}) })); } catch (e) {} }
let ctx = null, engine = null, out = null;
const added = [];                                    // pieces a home brought itself (see addPieces)
const listeners = new Set(), noteListeners = new Set();
const gainFor = () => (S.muted ? 0 : S.volume * S.volume);
const wanted = () => S.home && S.on;
function emit() { const s = musicState(); for (const fn of listeners) fn(s); }

function audio() {
  if (!browser) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    out = ctx.createGain(); out.gain.value = gainFor(); out.connect(ctx.destination);
    engine = createMusicEngine(ctx, out, { pieces: added });
    engine.onEvent(e => { if (e.type === 'mel' || e.type === 'chord') for (const fn of noteListeners) fn(e); });
  }
  return ctx;
}
function startPiece(id, fade) {
  S.piece = id;
  S.rotateAt = Date.now() / 1000 + ROTATE[0] + Math.random() * (ROTATE[1] - ROTATE[0]);
  const c = audio();
  const go = () => { if (wanted() && S.piece === id && !S.playing) { engine.play(id, { fade }); S.playing = true; emit(); } };
  if (c && c.state === 'running') { engine.play(id, { fade }); S.playing = true; }
  else { S.playing = false; if (c && !document.hidden) c.resume().then(go, () => {}); }
  emit();
}
function silence(fade) { if (engine) engine.stop({ fade }); S.playing = false; emit(); }
function nextFor(mood) { const list = MOOD_PIECES[mood], k = (S.visit[mood] + 1) % list.length; S.visit[mood] = k; return list[k]; }

// Browsers only let sound start from a tap, so every tap wakes the audio and starts music that is waiting for one.
function wake() {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended' && !document.hidden) c.resume().then(() => { if (wanted() && !S.playing && S.piece) startPiece(S.piece, 2); }, () => {});
}
function rotate() {
  if (!wanted() || !S.playing || document.hidden || Date.now() / 1000 < S.rotateAt) return;
  const list = MOOD_PIECES[S.mood];
  startPiece(list[(list.indexOf(S.piece) + 1) % list.length], 8);
}

/** Coming home: music is on by default, the next piece for the time of day, unless the remote turned it off. */
export function musicHome(mood) {
  if (MOOD_PIECES[mood]) S.mood = mood;
  S.home = true; S.on = !S.off;
  if (S.on) startPiece(nextFor(S.mood), 3); else emit();
}
/**
 * The remote's switch: off stops the music and keeps the house quiet on the
 * next visits too; on starts it again. (The gramophone only stops it until
 * the next time someone comes in.)
 */
export function setMusicOn(on) {
  S.off = !on; savePrefs();
  if (on && !S.on) { S.on = true; if (S.home) startPiece(nextFor(S.mood), 2); else emit(); }
  else if (!on && S.on) { S.on = false; silence(2); }
  else emit();
}
/** Leaving the house: the music fades out. */
export function musicAway() {
  S.home = false; silence(3);
  // once it has faded, let the audio rest until someone is back
  if (browser) setTimeout(() => { if (!wanted() && ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }, 4000);
}
/** Day or night changed: fade over to a piece for the new time. */
export function setMusicMood(mood) {
  if (!MOOD_PIECES[mood] || mood === S.mood) return;
  S.mood = mood;
  if (wanted()) startPiece(nextFor(mood), 10); else emit();
}
/** One tap on the gramophone: the next piece, and after the last one it stops; the next tap starts it again. */
export function gramophoneNext() {
  const list = MOOD_PIECES[S.mood], i = list.indexOf(S.piece);
  // Starting it from the gramophone also turns the remote's switch back on.
  if (!S.on) { S.on = true; if (S.off) { S.off = false; savePrefs(); } startPiece(list[0], 2); }
  else if (i === list.length - 1) { S.on = false; silence(2.5); }
  else startPiece(list[i + 1], 2.5);
  return S.on ? '♪ ' + PIECES[S.piece].name : '留声机停了';
}
const playable = f => !!f && typeof f.id === 'string' && typeof f.setup === 'function' && typeof f.bar === 'function' &&
  f.bpm > 0 && f.level > 0 && Number.isFinite(f.key) && !!f.reverb && f.reverb.len > 0;
/**
 * A home can bring pieces of its own, shaped like FLAVORS, with mood 'day', 'night' or 'any'. They play only where
 * they are added: they join the gramophone's turn and the homecoming rotation for their time of day, after the
 * shared pieces. Returns the ids that were added; a piece whose id is already known is left out.
 */
export function addPieces(list) {
  const ids = [];
  for (const f of list || []) {
    if (!playable(f) || Object.prototype.hasOwnProperty.call(PIECES, f.id)) continue;
    added.push(f);
    PIECES[f.id] = { name: f.name || f.id, mood: f.mood };
    for (const m of ['day', 'night']) if (f.mood === m || f.mood === 'any') MOOD_PIECES[m].push(f.id);
    ids.push(f.id);
  }
  if (ids.length) emit();
  return ids;
}
export function musicState() { return { home: S.home, on: S.on, playing: S.playing, mood: S.mood, piece: S.piece, name: S.piece ? PIECES[S.piece].name : '' }; }
export function onMusicChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
/** Melody notes and chord changes as they are scheduled; `t` is on the audio clock (see musicClock). */
export function onMusicNote(fn) { noteListeners.add(fn); return () => noteListeners.delete(fn); }
export function musicClock() { return ctx ? ctx.currentTime : null; }
/** The house's mute switch can silence the music too. */
export function setMusicMuted(muted) { S.muted = !!muted; if (out) out.gain.setTargetAtTime(gainFor(), ctx.currentTime, .1); }
export function getMusicVolume() { return S.volume; }
export function setMusicVolume(v) {
  S.volume = Math.max(0, Math.min(1, Number(v) || 0));
  savePrefs();
  if (out) out.gain.setTargetAtTime(gainFor(), ctx.currentTime, .1);
}

if (browser) {
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => window.addEventListener(ev, wake, { passive: true, capture: true }));
  // a hidden page goes quiet; coming back picks up where it was
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (wanted()) ctx.resume().then(() => { if (!S.playing && S.piece) startPiece(S.piece, 2); }, () => {});
  });
  setInterval(rotate, 15000);
}
