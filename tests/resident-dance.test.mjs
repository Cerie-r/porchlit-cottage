import test from 'node:test';
import assert from 'node:assert/strict';
import {DANCE, newDance, dancing, stopDance, danceSpots, danceFacing, danceArms, stepDance, endDance} from '../src/resident-dance.js';
import {newMotion, stepResident, angleDelta} from '../src/resident-motion-state.js';

const apart = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// Steps a dance until it's over or the time's up, walks in straight lines, room to turn everywhere.
function play(d, her, him, {seconds = 20, room = p => p, route = (w, from, to) => [to], until, watch} = {}) {
  let frames = 0, going = true, bursts = 0;
  while (frames++ < seconds * 60) {
    const before = d.burst;
    going = stepDance(d, 1 / 60, {her, him, route, room, view: [0, -1]});
    if (d.burst && d.burst !== before) bursts++;
    stepResident(her, 1 / 60, .33);
    stepResident(him, 1 / 60, .33);
    watch?.(d);
    if (!going || until?.(d)) break;
  }
  return {frames, going, bursts};
}

test('a dance: they face each other across the picture, take both hands and turn slowly to and fro together', () => {
  const her = newMotion([0, 0]), him = newMotion([2, 1]), d = newDance();
  let turned = 0, last = null, twirled = false;
  const {bursts} = play(d, her, him, {seconds: 14, watch: d => {
    if (d.phase !== 'dance') return;
    assert.ok(Math.abs(apart(her, him) - DANCE.gap) < 1e-6, 'facing each other at arm\'s length');
    // Turned to each other, and a little out towards the camera (+z here).
    const toHer = angleDelta(him.yaw, Math.atan2(her.x - him.x, her.z - him.z));
    assert.ok(Math.abs(Math.abs(toHer) - DANCE.open) < 1e-6, `he faces her, opened out: ${toHer}`);
    assert.ok(Math.cos(him.yaw) > 0, 'his face towards the camera');
    if (d.twirl) twirled = true;
    else {
      const toHim = angleDelta(her.yaw, Math.atan2(him.x - her.x, him.z - her.z));
      assert.ok(Math.abs(Math.abs(toHim) - DANCE.open) < 1e-6, `she faces him, opened out: ${toHim}`);
      assert.ok(Math.cos(her.yaw) > 0, 'her face towards the camera');
    }
    if (last !== null) turned += Math.abs(angleDelta(last, d.a));
    last = d.a;
    assert.ok(her.inStep && him.inStep);
  }});
  assert.equal(d.phase, 'dance');
  assert.ok(dancing(d));
  assert.equal(bursts, 1);
  assert.ok(turned > 2, `to and fro they go: ${turned.toFixed(2)}`);
  // Never far from across the picture (the camera looks along -z here: across is along x).
  assert.ok(Math.abs(angleDelta(d.a, Math.PI / 2)) <= DANCE.swing + 1e-9, `${d.a}`);
  assert.ok(twirled, 'he twirled her');
  // Turning about the point between them: it stays put.
  assert.ok(Math.hypot((her.x + him.x) / 2 - d.c[0], (her.z + him.z) / 2 - d.c[1]) < 1e-6);
  assert.ok(her.reachTo && him.reachTo && her.armsTo && him.armsTo);
  // The arm towards the other reaches: his on her side, hers on his.
  const side = (m, o) => Math.cos(m.yaw) * (o.x - m.x) - Math.sin(m.yaw) * (o.z - m.z);
  assert.deepEqual(her.reachTo, danceArms(side(her, him)).reach);
  assert.deepEqual(him.reachTo, danceArms(side(him, her)).reach);
  assert.ok(her.reachTo.some(r => r > 0) && him.reachTo.some(r => r > 0));
});

test('the arms: the one towards the other reaches forward and in, the other goes out; mirrored for the other side', () => {
  const right = danceArms(1), left = danceArms(-1);
  assert.deepEqual(right.reach, [0, DANCE.reach]);
  assert.deepEqual(left.reach, [DANCE.reach, 0]);
  assert.equal(right.arms[2], left.arms[0]);
  assert.equal(right.arms[3], -left.arms[1]);
  assert.equal(right.arms[1], -left.arms[3]);
  const f = danceFacing(0, 1);
  assert.ok(Math.abs(f.her + DANCE.open) < 1e-9 && Math.abs(f.him - Math.PI - DANCE.open) < 1e-9);
});

test('the music stops: a bow to each other, then hands down and upright again', () => {
  const her = newMotion([0, 0]), him = newMotion([1.5, 0]), d = newDance();
  play(d, her, him, {until: d => d.phase === 'dance' && d.t > 1});
  assert.ok(stopDance(d));
  let bowed = 0;
  const {going} = play(d, her, him, {watch: () => { bowed = Math.max(bowed, her.leanTo); }});
  assert.equal(going, false);
  assert.equal(d.phase, 'done');
  assert.ok(bowed > .2, `a bow: ${bowed}`);
  assert.ok(Math.abs(apart(her, him) - DANCE.apart) < 1e-6, 'a step back first, so their heads clear');
  for (const m of [her, him]) {
    assert.equal(m.armsTo, null);
    assert.equal(m.reachTo, null);
    assert.equal(m.leanTo, 0);
    assert.equal(m.tiltTo, 0);
    assert.equal(m.inStep, false);
  }
  assert.equal(stopDance(d), false, 'over already');
});

test('no room to turn round, or no way there: no dance; stopped before it starts, it just ends', () => {
  const her = newMotion([0, 0]), him = newMotion([1, 0]);
  const cramped = newDance();
  assert.equal(play(cramped, her, him, {room: () => null}).going, false);
  assert.ok(cramped.cramped);
  const blocked = newDance();
  assert.equal(play(blocked, newMotion([0, 0]), newMotion([3, 0]), {route: () => null}).going, false);
  assert.ok(blocked.cramped, 'no way there is told the same as no room');
  // Only his way is blocked: she doesn't set off alone either.
  const half = newDance(), alone = newMotion([0, 0]);
  assert.equal(play(half, alone, newMotion([3, 0]), {route: (w, from, to) => w === 'him' ? null : [to]}).going, false);
  assert.ok(half.cramped);
  assert.deepEqual(alone.route, []);
  const early = newDance();
  play(early, newMotion([0, 0]), newMotion([3, 0]), {seconds: .1});
  assert.equal(stopDance(early), false);
  assert.equal(early.phase, 'done');
  // Walked off on her own mid-dance: it's over, hands down.
  const d = newDance(), a = newMotion([0, 0]), b = newMotion([1.5, 0]);
  play(d, a, b, {until: d => d.phase === 'dance' && d.t > .5});
  a.route = [[2, 2]];
  assert.equal(stepDance(d, 1 / 60, {her: a, him: b, route: (w, f, t) => [t], room: p => p}), false);
  assert.equal(a.armsTo, null);
  endDance(null, a, b);
});

test('their places: either side of the point between them, along the way from her to him', () => {
  const {her, him} = danceSpots([1, 1], Math.PI / 2);
  assert.ok(Math.abs(her[0] - (1 - DANCE.gap / 2)) < 1e-9 && Math.abs(her[1] - 1) < 1e-9);
  assert.ok(Math.abs(him[0] - (1 + DANCE.gap / 2)) < 1e-9 && Math.abs(him[1] - 1) < 1e-9);
});
