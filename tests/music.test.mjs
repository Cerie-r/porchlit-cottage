import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAVORS, PIECES, MOOD_PIECES, createMusicEngine, makeChord, voiceChord, motif, moodFor, musicHome, musicAway, musicState, gramophoneNext, setMusicMood } from '../src/music.js';
import { FakeContext } from './support/fake-audio.mjs';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

test('the pieces that were kept: two for the day, three for the night', () => {
  assert.deepEqual(MOOD_PIECES, { day: ['sun', 'laundry'], night: ['moon', 'cradle', 'rain'] });
  assert.deepEqual(Object.values(PIECES).map(p => p.name), ['暖阳', '晾衣服', '月光', '摇篮', '雨夜']);
  assert.ok(!FLAVORS.some(f => f.id === 'guitar'));
});

test('chords are spelled the way a musician would read them', () => {
  assert.equal(makeChord(1, 5, 'maj7#11', true).name, 'G♭maj7♯11');
  assert.equal(makeChord(4, 9, 'm9', false).name, 'C♯m9');
  assert.equal(makeChord(10, 0, '69', true).name, 'B♭6/9');
  assert.deepEqual(makeChord(7, 7, 'sus4', false).pcs, [2, 7, 9]);
});

test('every chord in every piece is voiced with the asked number of notes, inside the range', () => {
  const rng = (s => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296))(5);
  for (const f of FLAVORS) for (const prog of f.progs) for (const [deg, q] of prog) {
    const c = makeChord(f.key, deg, q, f.flats);
    for (const [lo, hi, count] of [[53, 74, 4], [58, 79, 4], [67, 82, 4], [62, 79, 3], [52, 74, 4]]) {
      const v = voiceChord(c, lo, hi, count, null, rng);
      assert.equal(v.length, count, `${f.id} ${c.name}`);
      assert.equal(new Set(v).size, count, `${f.id} ${c.name} has a doubled note`);
      for (const m of v) { assert.ok(m >= lo && m <= hi, `${c.name} ${m} outside ${lo}-${hi}`); assert.ok(c.pcs.includes(((m % 12) + 12) % 12)); }
    }
  }
});

test('a melody motif stays inside its two bars and ends on a held note', () => {
  const rng = (s => () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296))(9);
  for (let k = 0; k < 200; k++) {
    const m = motif(rng, 16, .5, 7, 4);
    assert.ok(m.length >= 1 && m.length <= 7);
    for (const n of m) assert.ok(n.s >= 0 && n.s + n.len <= 16);
    assert.ok(m[m.length - 1].last);
  }
});

for (const f of FLAVORS) {
  test(`${f.name} plays for ninety seconds without a bad value and stays in its key`, () => {
    const ctx = new FakeContext(8000), events = [];
    const engine = createMusicEngine(ctx, ctx.destination, { seed: 3, live: false });
    engine.onEvent(e => events.push(e));
    engine.play(f.id, { at: 0, fade: .5, live: false });
    engine.scheduleUntil(90);
    const chords = events.filter(e => e.type === 'chord');
    assert.ok(chords.length >= 90 / (60 / f.bpm * (f.meter || 4) * f.chordBars) - 2, `${f.id}: only ${chords.length} chords`);
    assert.ok(ctx.stats.notes > (f.id === 'rain' ? 12 : 30), `${f.id}: only ${ctx.stats.notes} notes`);
    for (const b of ctx.buffers) for (let ch = 0; ch < b.numberOfChannels; ch++) assert.ok(b.getChannelData(ch).every(Number.isFinite), `${f.id}: a buffer has a bad sample`);
    const scale = MAJOR.map(x => (f.key + x) % 12);
    for (const e of events.filter(e => e.type === 'mel')) assert.ok(scale.includes(e.midi % 12), `${f.id}: melody note ${e.midi} is out of key`);
  });
}

test('coming home starts music; the gramophone steps through the pieces, then stops, then starts again', () => {
  musicHome('night');
  const s = musicState();
  assert.equal(s.home, true); assert.equal(s.on, true); assert.equal(s.mood, 'night');
  const night = MOOD_PIECES.night, said = [];
  let i = night.indexOf(s.piece);
  for (let k = 0; k < 6; k++) said.push(gramophoneNext());
  const expect = [];
  for (let k = 0; k < 6; k++) {
    if (i === -2) { i = 0; expect.push('♪ ' + PIECES[night[0]].name); }
    else if (i === night.length - 1) { i = -2; expect.push('留声机停了'); }
    else { i += 1; expect.push('♪ ' + PIECES[night[i]].name); }
  }
  assert.deepEqual(said, expect);
});

test('the music is on again every time someone comes home, and follows day and night', () => {
  musicHome('day');
  while (musicState().on) gramophoneNext();
  musicAway();
  assert.equal(musicState().home, false);
  musicHome('day');
  assert.equal(musicState().on, true);
  assert.ok(MOOD_PIECES.day.includes(musicState().piece));
  setMusicMood('night');
  assert.ok(MOOD_PIECES.night.includes(musicState().piece));
  assert.equal(moodFor(1), 'day'); assert.equal(moodFor(.5), 'day'); assert.equal(moodFor(.2), 'night');
  musicAway();
});
