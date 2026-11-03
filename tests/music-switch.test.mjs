// The remote's music switch, apart from the gramophone: off keeps coming
// home quiet; on (or the gramophone) brings the music back.
import test from 'node:test';
import assert from 'node:assert/strict';
import {musicHome, musicAway, musicState, gramophoneNext, setMusicOn} from '../src/music.js';

test('music is on when coming home, until the remote turns it off', () => {
  musicHome('day');
  assert.equal(musicState().on, true);
  setMusicOn(false);
  assert.equal(musicState().on, false);
  musicAway();
  musicHome('night');
  assert.equal(musicState().on, false, 'still off on the next visit');
  setMusicOn(true);
  assert.equal(musicState().on, true);
  assert.ok(musicState().piece, 'a piece is chosen');
  musicAway();
  musicHome('day');
  assert.equal(musicState().on, true, 'and on again after that');
});

test('the gramophone stops it only for this visit, and starting it turns the switch back on', () => {
  musicHome('day');
  let msg;
  do msg = gramophoneNext(); while (musicState().on);
  assert.equal(msg, '留声机停了');
  musicAway();
  musicHome('day');
  assert.equal(musicState().on, true, 'the gramophone stop lasts one visit');
  setMusicOn(false);
  gramophoneNext();
  assert.equal(musicState().on, true);
  musicAway();
  musicHome('day');
  assert.equal(musicState().on, true, 'playing it from the gramophone undid the remote switch');
});
