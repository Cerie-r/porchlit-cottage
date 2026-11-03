import test from 'node:test';
import assert from 'node:assert/strict';
import {BED, bedFrame, bedPlaces, herSide, headOf, newSleep, planBed, sleeping, wakeUp, stepSleep, outOfBed} from '../src/resident-bed.js';
import {newMotion, stepResident, angleDelta} from '../src/resident-motion-state.js';
import {cleanNights, addNight, dayAfter, nightOf, hourIn} from '../src/nights.js';
import {diaryDays} from '../src/diary-days.js';
import {nightLight, wokenUp, lightState, changeLight} from '../src/light-state.js';

const near = (a, b, eps = .02) => Math.hypot(a[0] - b[0], a[1] - b[1]) < eps;
// Steps going to bed until it's over or the time's up, walks in straight lines, both figures stepping too.
function play(s, her, him, {seconds = 20, bed = bedFrame(), route = (w, from, to) => [to], until} = {}) {
  let frames = 0, going = true;
  while (frames++ < seconds * 60) {
    going = stepSleep(s, 1 / 60, {her, him, bed, route});
    stepResident(her, 1 / 60, .33);
    stepResident(him, 1 / 60, .33);
    if (!going || until?.(s)) break;
  }
  return {frames, going};
}

test('the bed where the room has it: its middle and the way its foot points, moved or turned with it', () => {
  assert.deepEqual(bedFrame(), {origin: [-3.15, -.9], yaw: Math.PI / 2});
  const moved = bedFrame({bedroomBed: {position: [.5, 0, -.2], rotationY: .3}});
  assert.ok(near(moved.origin, [-2.65, -1.1], 1e-9));
  assert.ok(Math.abs(moved.yaw - (Math.PI / 2 + .3)) < 1e-9);
});

test('each on their own side: heads on the two pillows, facing up the bed, turned a little to each other', () => {
  const bed = bedFrame(), {her, him} = bedPlaces(bed, -1);
  // The pillows lie towards the headboard (room -x for the bed as it comes), one each side.
  const herHead = headOf({x: her.lie[0], z: her.lie[1], yaw: her.yaw}), hisHead = headOf({x: him.lie[0], z: him.lie[1], yaw: him.yaw});
  assert.ok(near(herHead, [bed.origin[0] - 1.03, bed.origin[1] + .6]), `${herHead}`);
  assert.ok(near(hisHead, [bed.origin[0] - 1.03, bed.origin[1] - .6]), `${hisHead}`);
  // Climbing in from beside the mattress, each on their own side.
  assert.ok(her.from[1] > bed.origin[1] + 1.2 && him.from[1] < bed.origin[1] - 1.2);
  assert.equal(Math.sign(her.roll), -Math.sign(him.roll));
  // Out of bed, each faces away from it.
  assert.ok(Math.abs(angleDelta(her.out, Math.atan2(0, 1))) < 1e-9, `her: ${her.out}`);
  assert.ok(Math.abs(angleDelta(him.out, Math.atan2(0, -1))) < 1e-9, `him: ${him.out}`);
  // Her side is the one nearer her.
  assert.equal(herSide(bed, [-3, 2]), -1);
  assert.equal(herSide(bed, [-3, -3]), 1);
});

test('to bed: both walk round, climb in together, lie down and sleep; got up, they climb out on their own sides', () => {
  const her = newMotion([-1, 1.5]), him = newMotion([0, -2]), s = newSleep(), bed = bedFrame();
  let both = null;
  play(s, her, him, {until: s => s.phase === 'asleep'});
  assert.equal(s.phase, 'asleep');
  assert.ok(sleeping(s));
  const {her: hp, him: mp} = s.places;
  for (const [m, p] of [[her, hp], [him, mp]]) {
    assert.ok(near([m.x, m.z], p.lie), `lying at ${m.x}, ${m.z}`);
    assert.equal(m.lie, 1);
    assert.ok(Math.abs(m.y - BED.head) < 1e-9);
    assert.ok(m.asleep, 'under the quilt, eyes shut');
    assert.ok(Math.abs(angleDelta(m.yaw, bed.yaw)) < 1e-6);
  }
  assert.ok(her.roll * him.roll < 0, 'faces turned to each other');
  // Nothing moves while they sleep.
  both = [her.x, her.z, him.x, him.z];
  play(s, her, him, {seconds: 3, until: () => false});
  assert.deepEqual([her.x, her.z, him.x, him.z], both);
  // Up again: out on their own sides, standing, eyes open.
  assert.ok(wakeUp(s));
  const {going} = play(s, her, him);
  assert.equal(going, false);
  assert.equal(s.phase, 'done');
  for (const [m, p] of [[her, hp], [him, mp]]) {
    assert.ok(near([m.x, m.z], p.from), `out at ${m.x}, ${m.z}`);
    assert.equal(m.lie, 0);
    assert.equal(m.y, 0);
    assert.equal(m.asleep, false);
    assert.ok(Math.abs(angleDelta(m.yaw, p.out)) < 1e-6, 'facing away from the bed');
  }
  assert.equal(wakeUp(s), false, 'up already');
});

test('lying down comes after getting onto the bed; climbing in takes a moment', () => {
  const her = newMotion([-3.15, 1]), him = newMotion([-3.15, -2.8]), s = newSleep();
  let early = null;
  play(s, her, him, {until: s => {
    if (s.phase === 'in' && s.t > .1 && s.t < .25 && early === null) early = her.lie;
    return s.phase === 'asleep';
  }});
  assert.ok(early !== null && early < .1, `still sitting up just after: ${early}`);
});

test('no way to the bed: nothing happens; out of bed at once for something else', () => {
  const her = newMotion([0, 0]), him = newMotion([1, 0]), s = newSleep();
  // Known before anything else stops for it: no plan when one of them can't get there, and nobody moved by asking.
  assert.equal(planBed(bedFrame(), {her, him, route: (w, from, to) => w === 'him' ? null : [to]}), null);
  const plan = planBed(bedFrame(), {her, him, route: (w, from, to) => [to]});
  assert.deepEqual(plan.paths.her, [plan.places.her.from]);
  assert.deepEqual([her.x, her.z, her.route.length, him.route.length], [0, 0, 0, 0]);
  const {going} = play(s, her, him, {route: () => null});
  assert.equal(going, false);
  assert.equal(s.places, null);
  const t = newSleep(), a = newMotion([-1, 1.5]), b = newMotion([0, -2]);
  play(t, a, b, {until: s => s.phase === 'asleep'});
  outOfBed(t, a, b);
  assert.equal(t.phase, 'done');
  assert.ok(near([a.x, a.z], t.places.her.from) && near([b.x, b.z], t.places.him.from));
  assert.ok(a.lie === 0 && b.lie === 0 && !a.asleep && !b.asleep && a.y === 0);
  // Asked to get up before they're even there: it just stops.
  const u = newSleep();
  play(u, newMotion([0, 0]), newMotion([1, 0]), {seconds: .1});
  assert.equal(wakeUp(u), false);
  assert.equal(u.phase, 'done');
});

test('the nights: kept once each, in order; before dawn is still the night before; the diary tells of it the morning after', () => {
  assert.deepEqual(cleanNights(['2026-10-27', '2026-10-25', 'nope', '2026-10-27', 3]), ['2026-10-25', '2026-10-27']);
  assert.deepEqual(addNight(['2026-10-25'], '2026-10-26'), ['2026-10-25', '2026-10-26']);
  assert.deepEqual(addNight(['2026-10-26'], '2026-10-26'), ['2026-10-26']);
  assert.deepEqual(cleanNights(null), []);
  assert.equal(dayAfter('2026-10-31'), '2026-11-01');
  assert.equal(nightOf('2026-10-27', 1), '2026-10-26');
  assert.equal(nightOf('2026-10-27', 23), '2026-10-27');
  assert.equal(nightOf('2026-11-01', 4), '2026-10-31');
  assert.equal(hourIn('Australia/Melbourne', new Date('2026-10-26T15:30:00Z')), 2);
  assert.equal(hourIn('not a zone', new Date('2026-10-26T15:30:00Z')), 15);
  const state = {nights: ['2026-10-26']};
  assert.deepEqual(diaryDays(state, {him: '他', today: '2026-10-26'}), [], 'not before the morning comes');
  const days = diaryDays(state, {him: '她', today: '2026-10-27'});
  assert.equal(days.length, 1);
  assert.equal(days[0].day, '2026-10-27');
  assert.deepEqual(days[0].lines, [{kind: 'night', text: '昨晚和她一起睡的'}]);
  // First thing on the page.
  const busy = diaryDays({...state, hideSeek: {book: [{day: '2026-10-27', spot: 'wardrobe', seconds: 9}]}}, {today: '2026-10-28'});
  assert.deepEqual(busy[0].lines.map(l => l.kind), ['night', 'seek']);
});

test('the night light: only the bedside lamp, low, while they sleep; the room put back after, or kept as she changed it', () => {
  const lights = {bedroom: changeLight(undefined, {mode: 'read'}, 'bedroom'), study: {mode: 'daily'}};
  const night = nightLight(lights, 'bedroom', true), lit = lightState(night.bedroom);
  assert.equal(lit.main, false);
  assert.deepEqual(Object.entries(lit.lamps).filter(([, on]) => on).map(([id]) => id), ['bedside']);
  assert.ok(lit.accentLevel > 0 && lit.accentLevel < 1);
  assert.equal(night.study, lights.study);
  assert.equal(nightLight(night, 'bedroom', true), night, 'already night');
  assert.deepEqual(nightLight(night, 'bedroom', false), lights);
  // A room never set goes back to never set.
  const fresh = nightLight({}, 'bedroom', true);
  assert.deepEqual(nightLight(fresh, 'bedroom', false), {});
  // She turned a lamp on meanwhile: hers stays.
  const changed = {...night, bedroom: changeLight(night.bedroom, {lamp: 'fairy'}, 'bedroom')};
  assert.equal(nightLight(changed, 'bedroom', false), changed);
  // Opened again later: nobody's asleep, the room is as it was.
  assert.deepEqual(wokenUp(night), lights);
  assert.equal(wokenUp(lights), lights);
});
