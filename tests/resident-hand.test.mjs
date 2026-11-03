import test from 'node:test';
import assert from 'node:assert/strict';
import {HAND, handArms, handReach, handSlots, pairRoom, pairPlanner, handSpots, newHand, handHeld, endHand, handTo, strollAgain, stepHand} from '../src/resident-hand.js';
import {newMotion, stepResident, angleDelta} from '../src/resident-motion-state.js';
import {findPath, freePoint, nearestFree, clearSegment, standingSpot} from '../src/resident-navigation.js';

const BOUNDS = [-4, 4, -4, 4];
// A room, as resident-motion.jsx hands it over: walks for one, and for the two of them side by side.
function room(obstacles = []) {
  return {
    obstacles,
    route: (from, to) => findPath(freePoint(from, obstacles, BOUNDS) ? from : nearestFree(from, obstacles, BOUNDS) || from, to, obstacles, BOUNDS),
    place: to => standingSpot(to, obstacles, BOUNDS) || to,
    pair: pairPlanner(obstacles, BOUNDS, {findPath, freePoint, nearestFree, clearSegment})
  };
}
// Steps a hand in hand until it's over or the time's up, both figures stepping too. Notes each frame.
function play(h, giver, taker, {seconds = 20, view = [0, -1], at = room(), random = Math.random, watch, until} = {}) {
  let frames = 0, bursts = 0, going = true;
  while (frames++ < seconds * 60) {
    const before = h.burst;
    going = stepHand(h, 1 / 60, {giver, taker, view, route: at.route, place: at.place, pair: at.pair, random});
    if (h.burst && h.burst !== before) bursts++;
    stepResident(giver, 1 / 60, .33);
    stepResident(taker, 1 / 60, .33);
    watch?.(h);
    if (!going || until?.(h)) break;
  }
  return {frames, bursts, going};
}
const apart = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// A fixed sequence for the little walk, so a run is the same every time.
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('he comes up beside her, they look out side by side and take hands, then he leads her a little way, side by side all along', () => {
  const him = newMotion([2, -1]), her = newMotion([0, 0]), at = room();
  // The camera looks along -z: they end up side by side along x, looking out along +z.
  const h = newHand();
  let together = 0, walked = 0, last = null;
  const {bursts, going} = play(h, him, her, {at, random: seq(.1, .5, .8, .3, .6), until: h => h.phase === 'hold' && together > 0, watch: h => {
    if (h.phase !== 'together') return;
    together++;
    assert.ok(Math.abs(apart(him, her) - HAND.gap) < .02, `side by side: ${apart(him, her)}`);
    assert.equal(him.yaw, her.yaw);
    assert.ok(Math.abs(angleDelta(him.phase, her.phase + Math.PI)) < 1e-9, 'legs opposite, so the joined arms swing together');
    assert.ok(at.pair.free(h.c), `room for both at ${h.c}`);
    if (last) walked += Math.hypot(h.c[0] - last[0], h.c[1] - last[1]);
    last = [...h.c];
  }});
  assert.ok(going);
  assert.equal(bursts, 1);
  assert.equal(h.burst.kind, 'hand');
  assert.ok(together > 30, `they walked together (${together} frames)`);
  assert.ok(walked > 1.5, `a little way (${walked.toFixed(2)} m)`);
  // Standing hand in hand afterwards: still holding, looking out at the camera again.
  play(h, him, her, {at, seconds: 3});
  assert.equal(h.phase, 'hold');
  assert.ok(handHeld(h));
  assert.ok(Math.abs(angleDelta(h.yaw, 0)) < .05, `looking out: ${h.yaw}`);
  assert.ok(Math.abs(apart(him, her) - HAND.gap) < .02);
  // He's along their +x: her right arm and his left reach out to each other.
  const side = h.side;
  assert.deepEqual(her.armsTo, handArms(side));
  assert.deepEqual(him.armsTo, handArms(-side));
  assert.deepEqual(her.reachTo, handReach(side), 'the arm towards him a little longer, so the hands meet');
  assert.deepEqual(him.reachTo, handReach(-side));
  assert.ok(her.blushTo > 0 && him.blushTo > 0);
  assert.ok(!her.inStep && !him.inStep, 'standing still, no stepping');
});

test('on her way somewhere while they hold hands, the two of them go there together', () => {
  const him = newMotion([1.5, 0]), her = newMotion([0, 0]), at = room();
  const h = newHand({lead: false});
  play(h, him, her, {at, until: h => h.phase === 'hold'});
  assert.equal(h.phase, 'hold', 'with no lead, they just stand hand in hand');
  assert.ok(handTo(h, [-2, 2.5], at.pair));
  play(h, him, her, {at, seconds: 12, until: h => h.phase === 'hold'});
  assert.equal(h.phase, 'hold');
  assert.ok(Math.hypot(h.c[0] + 2, h.c[1] - 2.5) < .05, `there: ${h.c}`);
  assert.ok(Math.abs(apart(him, her) - HAND.gap) < .02);
  // Nowhere the two of them can go side by side: not together (she lets go and goes by herself).
  assert.equal(handTo(h, [0, 0], {...at.pair, route: () => null}), false);
  assert.equal(handTo(h, [9, 9], {...at.pair, near: () => null, free: () => false}), false);
  assert.equal(handTo(newHand(), [0, 0], at.pair), false, 'not before their hands meet');
});

test('sitting, she gets up to take his hand', () => {
  const him = newMotion([2, 1]), her = newMotion([0, 0]), at = room();
  Object.assign(her, {seat: {seat: [0, 0], approach: [0, .6], height: .65, yaw: 0}, sit: 1, y: .32});
  const h = newHand({lead: false});
  play(h, him, her, {at, until: h => h.phase === 'hold'});
  assert.equal(h.phase, 'hold');
  assert.equal(her.sit, 0);
  assert.ok(Math.abs(apart(him, her) - HAND.gap) < .02);
  assert.ok(Math.hypot((him.x + her.x) / 2 - 0, (him.z + her.z) / 2 - .6) < .5, 'in front of her seat');
});

test('walking off on their own, or letting go, ends it: arms down, the blush left to fade, no stepping', () => {
  const him = newMotion([1.5, 0]), her = newMotion([0, 0]), at = room();
  const h = newHand({lead: false});
  play(h, him, her, {at, until: h => h.phase === 'hold'});
  her.route = [[1, 1]];
  assert.equal(stepHand(h, 1 / 60, {giver: him, taker: her, route: at.route, place: at.place, pair: at.pair, view: [0, -1]}), false);
  assert.equal(h.phase, 'done');
  for (const m of [him, her]) {
    assert.equal(m.armsTo, null);
    assert.equal(m.reachTo, null);
    assert.equal(m.blushTo, 0);
    assert.equal(m.inStep, false);
  }
  assert.equal(endHand(h, him, her), false, 'twice is nothing');
  const g = newHand(), a = newMotion([1, 0]), b = newMotion([0, 0]);
  Object.assign(a, {armsTo: handArms(1), inStep: true});
  endHand(g, a, b);
  assert.equal(a.armsTo, null);
  assert.equal(a.inStep, false);
});

test('no way to her, or no room beside her: he lets it be', () => {
  const him = newMotion([2, 1]), her = newMotion([0, 0]), at = room();
  const h = newHand();
  const {going} = play(h, him, her, {at: {...at, route: () => null}});
  assert.equal(going, false);
  assert.equal(h.phase, 'done');
  assert.deepEqual([him.x, him.z], [2, 1], 'he stayed where he was');
});

test('the little walk keeps room for both of them, round the furniture', () => {
  const sofa = {id: 'sofa', x: 0, z: 1.6, w: 2.6, d: .95, angle: 0}, table = {id: 'coffeeTable', x: -1.8, z: -1, w: 1.2, d: 1.2, angle: .4};
  const at = room([sofa, table]);
  for (const r of [.05, .3, .55, .8]) {
    const him = newMotion([2.5, -1.5]), her = newMotion([1.5, -.2]), h = newHand();
    let frames = 0;
    play(h, him, her, {at, random: seq(r, 1 - r, (r + .37) % 1, (r + .71) % 1), until: h => h.phase === 'hold' && frames > 0, watch: h => {
      if (h.phase !== 'together') return;
      frames++;
      assert.ok(at.pair.free(h.c), `room for both at ${h.c}`);
      for (const m of [him, her]) assert.ok(freePoint([m.x, m.z], at.obstacles, BOUNDS), `${m.x}, ${m.z} clear of furniture`);
    }});
    assert.ok(handHeld(h));
    assert.ok(frames > 0, 'they went somewhere');
  }
});

test('the two of them as one: places either side of the point between them, room grown by half the gap', () => {
  const {her, him} = handSlots([1, 2], 0, 1);
  assert.deepEqual(her, [1 - HAND.gap / 2, 2]);
  assert.deepEqual(him, [1 + HAND.gap / 2, 2]);
  const turned = handSlots([0, 0], Math.PI / 2, -1);
  assert.ok(Math.abs(turned.him[1] - HAND.gap / 2) < 1e-9 && Math.abs(turned.him[0]) < 1e-9);
  const grown = pairRoom([{x: 0, z: 0, w: 1, d: 2, angle: 0}], [-4, 4, -3, 3]);
  assert.deepEqual(grown.obstacles[0], {x: 0, z: 0, w: 1 + HAND.gap, d: 2 + HAND.gap, angle: 0});
  assert.deepEqual(grown.bounds, [-4 + HAND.gap / 2, 4 - HAND.gap / 2, -3 + HAND.gap / 2, 3 - HAND.gap / 2]);
  // Beside her across the picture, the side nearer him first; in front of her seat when she sits.
  const g = newMotion([-3, 0]), t = newMotion([0, 0]);
  assert.deepEqual(handSpots(g, t, [0, -1]).map(p => p.map(v => +v.toFixed(6))), [[-HAND.gap, 0], [HAND.gap, 0]]);
  Object.assign(t, {sit: 1, seat: {approach: [0, .6]}});
  assert.ok(handSpots(g, t, [0, -1]).every(p => Math.abs(p[1] - .6) < 1e-9));
  // The arm towards the other: right arm out for a partner along +x, left arm out for one along -x.
  assert.deepEqual(handArms(1), [0, 0, HAND.arm[0], HAND.arm[1]]);
  assert.deepEqual(handArms(-1), [HAND.arm[0], -HAND.arm[1], 0, 0]);
  assert.deepEqual(handReach(1), [0, HAND.reach]);
  assert.deepEqual(handReach(-1), [HAND.reach, 0]);
});
