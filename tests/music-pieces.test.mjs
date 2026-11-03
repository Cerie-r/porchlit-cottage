import test from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, MOOD_PIECES, createMusicEngine, makeChord, place, filt, addPieces, musicHome, musicAway, musicState, gramophoneNext, setMusicMood } from '../src/music.js';
import { FakeContext } from './support/fake-audio.mjs';

// A small piece of the kind a home could bring along: a waltz whose chords are written out bar by bar.
const written = [[0, 'add9'], [9, 'm7'], [5, 'maj7'], [7, 'sus4']];
const piece = (id, mood) => ({
  id, mood, name: '小试', key: 7, flats: false, bpm: 70, meter: 3, chordBars: 1, level: .5,
  progs: [written],
  reverb: { len: 1, wet: .2 },
  chordAt: i => makeChord(7, ...written[i % 4], false),
  setup(P) {
    P.boxIn = P.bus(.3, filt(P.ctx, 'lowpass', 4000, .5));
    P.padIn = P.bus(.3, filt(P.ctx, 'lowpass', 900, .6));
  },
  bar(P, i, t) {
    const c = P.chord(i);
    P.emit(t, 'chord', { name: c.name });
    P.play(P.V.felt(place(c.root, 40, 51)), t, .3, P.barDur, P.boxIn);
    P.voice('box', c, 67, 79, 3).forEach((m, k) => {
      P.play(P.V.box(m), t + k * P.beat, .2, null, P.boxIn);
      P.emit(t + k * P.beat, 'mel', { midi: m });
    });
    P.pad(t, P.voice('pad', c, 55, 70, 3), P.barDur, .01, { wave: 'sine' });
  },
});

test('the engine plays a piece handed to it, bar by bar with the chords it writes out', () => {
  const ctx = new FakeContext(8000), events = [];
  const engine = createMusicEngine(ctx, ctx.destination, { seed: 4, live: false, pieces: [piece('waltz', 'any')] });
  engine.onEvent(e => events.push(e));
  assert.equal(engine.play('nothing-by-this-name', { at: 0, live: false }), null);
  assert.ok(engine.play('waltz', { at: 0, fade: .5, live: false }));
  engine.scheduleUntil(30);
  const chords = events.filter(e => e.type === 'chord').map(e => e.name);
  assert.deepEqual(chords.slice(0, 5), ['Gadd9', 'Em7', 'Cmaj7', 'Dsus4', 'Gadd9']);
  assert.ok(chords.length >= 30 / (60 / 70 * 3) - 1);
  for (const b of ctx.buffers) for (let ch = 0; ch < b.numberOfChannels; ch++) assert.ok(b.getChannelData(ch).every(Number.isFinite));
  assert.equal(engine.current, 'waltz');
});

test('pieces that could not play are left out, and each name is taken once', () => {
  const broken = [
    null,
    { ...piece('no-bar', 'any'), bar: undefined },
    { ...piece('no-tempo', 'any'), bpm: 0 },
    { ...piece('silent', 'any'), level: undefined },
    { ...piece('no-room', 'any'), reverb: undefined },
    piece('moon', 'night'),                                  // already one of the shared pieces
  ];
  assert.deepEqual(addPieces(broken), []);
  assert.deepEqual(MOOD_PIECES, { day: ['sun', 'laundry'], night: ['moon', 'cradle', 'rain'] });
  assert.equal(PIECES.moon.name, '月光');
});

test("a home's own piece joins the gramophone's turn where it is added, after the shared ones", () => {
  assert.deepEqual(addPieces([piece('ours', 'any'), piece('morning', 'day')]), ['ours', 'morning']);
  assert.deepEqual(addPieces([piece('ours', 'night')]), []);
  assert.deepEqual(MOOD_PIECES, { day: ['sun', 'laundry', 'ours', 'morning'], night: ['moon', 'cradle', 'rain', 'ours'] });
  assert.deepEqual(PIECES.ours, { name: '小试', mood: 'any' });

  musicHome('night');
  const said = [];
  for (let k = 0; k < 5 && musicState().piece !== 'rain'; k++) gramophoneNext();
  assert.equal(musicState().piece, 'rain');
  said.push(gramophoneNext(), gramophoneNext(), gramophoneNext());
  assert.deepEqual(said, ['♪ 小试', '留声机停了', '♪ 月光']);
  setMusicMood('day');
  assert.ok(MOOD_PIECES.day.includes(musicState().piece));
  musicAway();
});
