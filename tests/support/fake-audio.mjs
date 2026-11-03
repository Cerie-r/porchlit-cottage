// A small stand-in for an AudioContext, shared by the music tests.
// It records nothing but refuses the things that would break real audio
// (non-finite values, negative times, stopping before starting, playing without a buffer).
const ok = (v, t) => { if (!Number.isFinite(v) || !Number.isFinite(t) || t < 0) throw new Error(`bad automation ${v} at ${t}`); };
class Param {
  constructor(v = 0) { this.value = v; }
  setValueAtTime(v, t) { ok(v, t); return this; }
  linearRampToValueAtTime(v, t) { ok(v, t); return this; }
  exponentialRampToValueAtTime(v, t) { ok(v, t); if (v <= 0) throw new Error('exponential ramp to zero'); return this; }
  setTargetAtTime(v, t, c) { ok(v, t); if (!(c > 0)) throw new Error('bad time constant'); return this; }
  cancelScheduledValues() { return this; }
  cancelAndHoldAtTime() { return this; }
}
class Node {
  constructor(ctx) { this.ctx = ctx; }
  connect(n) { if (!n) throw new Error('connected to nothing'); return n; }
  disconnect() {}
}
class Osc extends Node {
  constructor(c) { super(c); this.frequency = new Param(440); this.detune = new Param(0); c.stats.oscillators++; }
  start(t) { ok(0, t); this.t = t; }
  stop(t) { ok(0, t); if (t < this.t) throw new Error('stopped before it started'); }
}
class Source extends Node {
  constructor(c) { super(c); this.playbackRate = new Param(1); this.buffer = null; c.stats.notes++; }
  start(t, offset = 0) { ok(offset, t); if (!this.buffer) throw new Error('no buffer'); this.t = t; }
  stop(t) { ok(0, t); if (t < this.t) throw new Error('stopped before it started'); }
}
class Gain extends Node { constructor(c) { super(c); this.gain = new Param(1); } }
class Filter extends Node { constructor(c) { super(c); this.frequency = new Param(350); this.Q = new Param(1); this.gain = new Param(0); } }
class Panner extends Node { constructor(c) { super(c); this.pan = new Param(0); } }
class Compressor extends Node { constructor(c) { super(c); for (const k of ['threshold', 'ratio', 'attack', 'release', 'knee']) this[k] = new Param(0); } }
class Buffer {
  constructor(ch, n, sr) { this.numberOfChannels = ch; this.length = n; this.sampleRate = sr; this.duration = n / sr; this.data = Array.from({ length: ch }, () => new Float32Array(n)); }
  getChannelData(c) { return this.data[c]; }
}
export class FakeContext {
  constructor(sampleRate = 8000) { this.sampleRate = sampleRate; this.currentTime = 0; this.state = 'running'; this.destination = new Node(this); this.stats = { oscillators: 0, notes: 0 }; this.buffers = []; }
  createGain() { return new Gain(this); }
  createOscillator() { return new Osc(this); }
  createBufferSource() { return new Source(this); }
  createBiquadFilter() { return new Filter(this); }
  createStereoPanner() { return new Panner(this); }
  createConvolver() { return new Node(this); }
  createDynamicsCompressor() { return new Compressor(this); }
  createBuffer(ch, n, sr) { const b = new Buffer(ch, n, sr); this.buffers.push(b); return b; }
}
