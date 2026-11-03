import test from 'node:test';
import assert from 'node:assert/strict';
import {TOUCHES, HUG, newTouch, stepTouch, touchSpots, fussFor} from '../src/resident-touches.js';
import {newMotion, stepResident, angleDelta} from '../src/resident-motion-state.js';

const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const facing = (m, other) => Math.abs(angleDelta(m.yaw, Math.atan2(other.x - m.x, other.z - m.z)));
// Two figures stepping through a touch, walks planned in straight lines. Notes what happens on the way.
function play(t, giver, taker, {seconds = 12, view = null, route = (from, to) => [to], place, watch} = {}) {
  let frames = 0, bursts = 0;
  while (frames++ < seconds * 60) {
    const before = t.burst;
    const going = stepTouch(t, 1 / 60, {giver, taker, route, place, view});
    if (t.burst && t.burst !== before) bursts++;
    watch?.(t);
    stepResident(giver, 1 / 60, .33);
    stepResident(taker, 1 / 60, .33);
    if (!going) break;
  }
  return {frames, bursts};
}

test('a stolen kiss: he comes up beside her as she faces, kisses her cheek before she turns, then she turns to him', () => {
  const him = newMotion([2, 1]), her = newMotion([0, 0]);
  her.yaw = 0;
  const t = newTouch('kiss');
  let turnedBefore = null;
  const {bursts} = play(t, him, her, {watch: t => { if (t.phase === 'act' && turnedBefore === null) turnedBefore = Math.abs(her.yaw); }});
  assert.equal(t.phase, 'done');
  assert.equal(bursts, 1);
  assert.equal(t.burst.kind, 'kiss');
  assert.ok(turnedBefore < .01, `she hadn't turned yet: ${turnedBefore}`);
  // Beside her, on her right as she faces +z (the side nearer him), his face at her cheek.
  assert.ok(close(him.x, TOUCHES.kiss.gap, .02) && close(him.z, 0, .02), `${him.x}, ${him.z}`);
  assert.ok(facing(him, her) < .1);
  // Afterwards she has turned to him (most of the way).
  assert.ok(Math.abs(angleDelta(her.yaw, Math.PI / 2)) < .6);
  assert.ok(close(him.leanTo, 0) && close(her.leanTo, 0));
  assert.equal(him.armsTo, null);
  assert.equal(her.blushTo, 0, 'the blush is left to fade');
  assert.ok(her.blush > .3, 'still pink a moment after');
});

test('a pat on the head: beside her as the camera sees it, three pats, each pressing her down a little', () => {
  const him = newMotion([1.5, -1]), her = newMotion([0, 0]);
  const t = newTouch('pat');
  let most = 0;
  const {bursts} = play(t, him, her, {view: [0, -1], watch: () => { most = Math.max(most, her.squash); }});
  assert.equal(t.phase, 'done');
  assert.equal(bursts, 1);
  assert.equal(t.beats, 3);
  assert.ok(close(most, .05, .002));
  assert.equal(her.squash, 0);
  // Looking along -z, he stands to the side of her (x), not in front or behind.
  assert.ok(close(Math.abs(him.x), TOUCHES.pat.gap, .02) && close(him.z, 0, .02), `${him.x}, ${him.z}`);
  // She turned to him most of the way, the rest towards the camera.
  assert.ok(Math.abs(angleDelta(her.yaw, Math.atan2(him.x - her.x, him.z - her.z))) > .4);
});

test('a pinch of the cheek: he reaches with the arm nearer the camera, she squishes twice and goes red', () => {
  const him = newMotion([-1.5, .2]), her = newMotion([0, 0]);
  const t = newTouch('pinch');
  let reach = null, blushTo = 0;
  play(t, him, her, {view: [0, -1], watch: t => { if (t.phase === 'act') { reach ??= him.armsTo; blushTo = Math.max(blushTo, her.blushTo); } }});
  assert.equal(t.beats, 2);
  assert.equal(blushTo, TOUCHES.pinch.blush);
  // He's on her left (-x) facing +x; the camera looks along -z from +z: his left shoulder (-x in his
  // frame) is then towards +z, nearer the camera.
  assert.ok(him.x < 0);
  assert.ok(reach[0] < -1 && reach[2] === 0, JSON.stringify(reach));
});

test('when she sits, he comes to stand in front of her seat; sitting himself, he gets up first', () => {
  const her = newMotion([0, 0]), him = newMotion([2, 2]);
  her.sit = 1;
  her.seat = {seat: [0, 0], approach: [0, .8], height: .65, yaw: 0};
  assert.deepEqual(touchSpots('pat', him, her, [0, -1]), [[0, .8]]);
  him.sit = 1;
  him.seat = {seat: [2, 2], approach: [2, 2.7], height: .65, yaw: 0};
  const t = newTouch('kiss');
  stepTouch(t, 1 / 60, {giver: him, taker: her, route: (from, to) => [from, to]});
  assert.equal(t.phase, 'walk');
  assert.equal(him.transition.type, 'stand', 'standing up');
  assert.deepEqual(him.route, [], 'not walking off while still sitting');
  assert.deepEqual(him.pending, [[2, 2.7], [0, .8]], 'from in front of his seat');
  play(t, him, her);
  assert.equal(t.phase, 'done');
  assert.ok(close(him.x, 0, .01) && close(him.z, .8, .01));
  assert.equal(him.sit, 0);
  assert.equal(her.sit, 1, 'she stays sitting');
});

test('on his lap: no walking, he leans in to her and back, and they keep holding each other', () => {
  const him = newMotion([0, 0]), her = newMotion([0, .3]);
  Object.assign(him, {sit: 1, seat: {id: 'sofa', seat: [0, 0], approach: [0, .8], height: .3, yaw: 0}, leanTo: -.2, armsTo: [-.75, .5, -.75, -.5]});
  Object.assign(her, {sit: 1, seat: {id: 'lap', lap: true, seat: [0, .3], approach: [0, .6], height: .4, yaw: 0}, leanTo: .1});
  for (const kind of ['kiss', 'pat', 'pinch']) {
    const t = newTouch(kind, {together: true});
    let leaned = null;
    const {bursts} = play(t, him, her, {watch: t => { if (t.phase === 'act') leaned ??= him.leanTo; }});
    assert.equal(bursts, 1, kind);
    assert.ok(close(leaned, -.2 + .16), `${kind}: he leans towards her`);
    assert.ok(close(him.x, 0) && close(him.z, 0) && close(her.x, 0) && close(her.z, .3), `${kind}: nobody moved`);
    assert.equal(him.leanTo, -.2);
    assert.equal(her.leanTo, .1);
    assert.deepEqual(him.armsTo, [-.75, .5, -.75, -.5]);
  }
  // She steals one the other way: leaning back to him from his lap.
  const t = newTouch('kiss', {together: true});
  stepTouch(t, 1 / 60, {giver: her, taker: him, route: () => null});
  assert.ok(close(her.leanTo, .1 - .14));
});

test('she walks off before it: nothing more happens and nobody is left leaning or squashed', () => {
  const him = newMotion([1.5, 0]), her = newMotion([0, 0]);
  const t = newTouch('pat');
  const route = (from, to) => [to];
  for (let i = 0; i < 600 && t.phase !== 'act'; i++) {
    stepTouch(t, 1 / 60, {giver: him, taker: her, route});
    stepResident(him, 1 / 60, .33);
  }
  assert.equal(t.phase, 'act');
  for (let i = 0; i < 20; i++) stepTouch(t, 1 / 60, {giver: him, taker: her, route});
  her.route = [[0, 3]];
  assert.equal(stepTouch(t, 1 / 60, {giver: him, taker: her, route}), false);
  assert.equal(him.leanTo, 0);
  assert.equal(him.armsTo, null);
  assert.equal(her.squash, 0);
});

test('no way to her: he stays where he is and nothing happens', () => {
  const him = newMotion([3, 0]), her = newMotion([0, 0]);
  const t = newTouch('pinch');
  const {bursts} = play(t, him, her, {route: () => null});
  assert.equal(t.phase, 'done');
  assert.equal(bursts, 0);
  assert.deepEqual([him.x, him.z], [3, 0]);
  // Furniture hard against her on both sides: no room for it either.
  const t2 = newTouch('kiss'), h2 = newMotion([2, 0]);
  play(t2, h2, newMotion([0, 0]), {place: () => [.3, 0]});
  assert.equal(t2.burst, null);
});

test('a touch that cannot go on still ends', () => {
  const him = newMotion([2, 0]), her = newMotion([0, 0]);
  const t = newTouch('kiss');
  // His figure never steps (it didn't load): he never gets there.
  let frames = 0;
  while (stepTouch(t, 1 / 60, {giver: him, taker: her, route: (a, b) => [b]}) && frames < 60 * 40) frames++;
  assert.equal(t.phase, 'done');
  assert.ok(frames <= 60 * 26, `${frames} frames`);
});

test('asked for a fuss, he does one of them, never the same twice running, and no hug or hand while she sits', () => {
  const seen = new Set();
  for (const r of [0, .3, .5, .7, .99]) for (const last of ['pat', 'pinch', 'kiss', 'hug', 'hand', null]) {
    const k = fussFor(last, () => r);
    assert.ok(['pat', 'pinch', 'kiss', 'hug', 'hand'].includes(k));
    assert.notEqual(k, last);
    seen.add(k);
    assert.ok(!['hug', 'hand'].includes(fussFor(last, () => r, {seated: true})));
  }
  assert.equal(seen.size, 5);
  assert.equal(newTouch('cuddle').kind, 'kiss', 'something unknown is a kiss');
  assert.equal(newTouch('hug', {together: true}).kind, 'kiss', 'on his lap he is holding her already');
});

test('a hug from behind: he comes round behind her and a little to one side, both look out, he peeks past her head', () => {
  const him = newMotion([2, -1]), her = newMotion([0, 0]);
  her.yaw = 1;
  const t = newTouch('hug');
  let held = null;
  // The camera looks along -z: out towards it is +z.
  const {bursts} = play(t, him, her, {view: [0, -1], watch: t => { if (t.phase === 'act' && !held) held = {him: {...him, arms: [...him.arms]}, her: {...her}}; }});
  assert.equal(bursts, 1);
  assert.equal(t.burst.kind, 'hug');
  // Behind her (towards -z) and to the side nearer him (+x).
  assert.ok(close(held.him.x, HUG.side, .02) && close(held.him.z, -HUG.behind, .02), `${held.him.x}, ${held.him.z}`);
  assert.ok(Math.abs(angleDelta(held.him.yaw, 0)) < .1 && Math.abs(angleDelta(held.her.yaw, 0)) < .1, 'both looking out');
  assert.deepEqual(held.him.armsTo, HUG.arms);
  assert.ok(close(held.him.tiltTo, -HUG.peek) && close(held.her.tiltTo, HUG.lean), 'he peeks out on his side, she leans the other way');
  // Let go: nobody left tilted or holding, and she turns to him.
  assert.equal(t.phase, 'done');
  assert.ok(close(him.tiltTo, 0) && close(her.tiltTo, 0) && him.armsTo === null);
  assert.ok(Math.abs(angleDelta(her.yaw, 0)) > .3, `she turned to him: ${her.yaw}`);
});

test('no hug while she sits', () => {
  const him = newMotion([2, 0]), her = newMotion([0, 0]);
  Object.assign(her, {sit: 1, seat: {seat: [0, 0], approach: [0, .8], height: .65, yaw: 0}});
  assert.deepEqual(touchSpots('hug', him, her, [0, -1]), []);
  const t = newTouch('hug');
  const {bursts} = play(t, him, her, {view: [0, -1]});
  assert.equal(bursts, 0);
  assert.equal(t.phase, 'done');
});

test('the blush comes quickly and goes slowly', () => {
  const m = newMotion([0, 0]);
  m.blushTo = 1;
  for (let i = 0; i < 30; i++) stepResident(m, 1 / 60, .33);
  assert.ok(m.blush > .9, `half a second in: ${m.blush}`);
  m.blushTo = 0;
  for (let i = 0; i < 60; i++) stepResident(m, 1 / 60, .33);
  assert.ok(m.blush > .3, `a second after: ${m.blush}`);
  let frames = 0;
  while (stepResident(m, 1 / 60, .33) && frames < 60 * 20) frames++;
  assert.equal(m.blush, 0);
  assert.ok(frames < 60 * 8, 'and then it is gone, and the frames stop');
});

test('with the camera looking, a stolen kiss shows: he comes up beside her as it sees them, she looks out, away from him', () => {
  const him = newMotion([2, -1]), her = newMotion([0, 0]);
  her.yaw = Math.PI / 2;
  const t = newTouch('kiss');
  let looking = null;
  // The camera looks along -z: it is out at +z.
  play(t, him, her, {view: [0, -1], watch: t => { if (t.phase === 'act' && looking === null) looking = her.yaw; }});
  assert.equal(t.burst.kind, 'kiss');
  assert.ok(close(Math.abs(him.x), TOUCHES.kiss.gap, .02) && close(him.z, 0, .02), `beside her: ${him.x}, ${him.z}`);
  // Facing the camera (yaw 0), turned a little away from him (he's at +x, so towards -x).
  assert.ok(close(looking, -.35, .1), `she was looking out: ${looking}`);
  assert.ok(facing(him, her) < .1);
});
