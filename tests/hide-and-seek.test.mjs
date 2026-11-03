import test from 'node:test';
import assert from 'node:assert/strict';
import {SPOT_IDS, FIRST_SEED, dayIn, shiftDay, plannedSpot, spotFor, cleanHideSeek, hidingOn, cleanVisit, enterVisit, markFound, kissFor, fidgeting, streak, enterMessage, foundMessage, lasted, newSeed, LONG_SEARCH, WIGGLE_AFTER} from '../src/hide-and-seek.js';

const all = [...SPOT_IDS];
const at = (day, h = 9) => Date.parse(`${day}T${String(h).padStart(2, '0')}:00:00Z`);

test('days follow the home time zone', () => {
  const moment = new Date('2026-10-23T14:30:00Z');
  assert.equal(dayIn('Australia/Melbourne', moment), '2026-10-24');
  assert.equal(dayIn('America/Los_Angeles', moment), '2026-10-23');
  assert.equal(dayIn('Not/AZone', moment), '2026-10-23');
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
});

test('the same day and seed always give the same spot, and never the day before\'s', () => {
  const seed = 'a1b2c3d4e5f60708';
  assert.equal(spotFor('2026-10-24', seed, all), spotFor('2026-10-24', seed, [...all].reverse()));
  // Over years and many seeds, the plan never repeats two days running.
  for (const s of [seed, FIRST_SEED, ...Array.from({length: 40}, (_, i) => newSeed())]) {
    let previous = null;
    for (let i = 0; i < 1100; i++) {
      const day = shiftDay('2026-01-01', i), spot = plannedSpot(day, s);
      assert.ok(all.includes(spot));
      assert.notEqual(spot, previous, `${s} ${day}`);
      previous = spot;
    }
  }
  // Every spot gets its turn.
  assert.equal(new Set(Array.from({length: 60}, (_, i) => plannedSpot(shiftDay('2026-10-01', i), seed))).size, all.length);
  assert.equal(spotFor('2026-10-24', seed, ['quilt']), 'quilt');
  assert.equal(spotFor('2026-10-24', seed, []), null);
});

test('with two spots closed he still does not hide in the same place two days running', () => {
  for (const seed of Array.from({length: 30}, () => newSeed())) {
    let state = {seed, book: []};
    let yesterday = null;
    for (let i = 0; i < 120; i++) {
      const day = shiftDay('2026-10-01', i), spot = hidingOn(state, day, ['wardrobe', 'quilt']);
      assert.notEqual(spot, yesterday, `${seed} ${day}`);
      state = markFound(state, {day, spot, seconds: 10});
      yesterday = spot;
    }
  }
});

test('no repeats on days nobody found him either; with spots closed, rarely', () => {
  const run = open => {
    let repeats = 0, days = 0;
    for (const seed of Array.from({length: 60}, () => newSeed())) {
      let state = {seed, book: []}, yesterday = null;
      for (let i = 0; i < 120; i++) {
        const day = shiftDay('2026-10-01', i), spot = hidingOn(state, day, open);
        if (spot === yesterday) repeats++;
        days++;
        // Found on some days only.
        if (i % 3 === 0) state = markFound(state, {day, spot, seconds: 10});
        yesterday = spot;
      }
    }
    return repeats / days;
  };
  assert.equal(run(all), 0);
  // A crouching spot closed (furniture pushed into a corner) can repeat after a day nobody found him.
  assert.ok(run(['wardrobe', 'quilt', 'island']) < .1);
});

test('a spot closing somewhere else does not move him', () => {
  let moved = 0, tries = 0;
  for (const seed of Array.from({length: 200}, () => newSeed())) {
    const day = '2026-10-24', state = {seed, book: []};
    const spot = hidingOn(state, day, all);
    for (const closed of all.filter(id => id !== spot)) {
      tries++;
      if (hidingOn(state, day, all.filter(id => id !== closed)) !== spot) moved++;
    }
  }
  assert.equal(moved, 0, `${moved} of ${tries}`);
});

test('nothing is written when she comes in; the visit is this device\'s own', () => {
  const first = enterVisit(null, '2026-10-24', at('2026-10-24'));
  assert.equal(first.first, true);
  assert.deepEqual(first.visit, {day: '2026-10-24', enteredAt: at('2026-10-24')});
  const again = enterVisit(first.visit, '2026-10-24', at('2026-10-24', 11));
  assert.equal(again.first, false);
  assert.deepEqual(again.visit, first.visit);
  const next = enterVisit(again.visit, '2026-10-25', at('2026-10-25'));
  assert.equal(next.first, true);
  assert.equal(cleanVisit({day: 'x', enteredAt: 1}), null);
  assert.equal(cleanVisit({day: '2026-10-24', enteredAt: -1}), null);
  // A home that has never found him still hides him, the same on every device.
  assert.equal(hidingOn({}, '2026-10-24', all), hidingOn({seed: null, book: []}, '2026-10-24', all));
  assert.equal(enterMessage({first: true, hiding: true}, 'boy'), '你老公躲起来啦');
  assert.equal(enterMessage({first: true, hiding: true}, 'girl'), '你老婆躲起来啦');
  assert.equal(enterMessage({first: false, hiding: true}, 'boy'), '他还躲着呢');
  assert.equal(enterMessage({first: true, hiding: false}, 'boy'), null);
});

test('finding him saves the day once, with where and how long, and a seed', () => {
  const spot = hidingOn({}, '2026-10-24', all);
  let state = markFound({}, {day: '2026-10-24', spot, seconds: 75, seed: 'abcdef0123456789'});
  assert.deepEqual(state, {seed: 'abcdef0123456789', book: [{day: '2026-10-24', spot, seconds: 75}], total: 1});
  assert.equal(hidingOn(state, '2026-10-24', all), null);
  assert.equal(kissFor(75), 'cheek');
  assert.equal(kissFor(LONG_SEARCH), 'long');
  // Found twice is still once, and the seed stays the first one.
  assert.deepEqual(markFound(state, {day: '2026-10-24', spot, seconds: 9, seed: 'ffffffff00000000'}), state);
  // The next day uses the home's own seed.
  assert.equal(hidingOn(state, '2026-10-25', all), spotFor('2026-10-25', 'abcdef0123456789', all, spot));
  // Bad finds don't get in.
  assert.deepEqual(markFound(state, {day: 'yesterday', spot, seconds: 3}), state);
  assert.deepEqual(markFound(state, {day: '2026-10-26', spot: 'attic', seconds: 3}), state);
});

test('no spot open: nobody hides', () => {
  assert.equal(hidingOn({}, '2026-10-24', []), null);
});

test('streaks count back from today, or from yesterday before today is found', () => {
  const book = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].map(day => ({day, spot: 'quilt', seconds: 30}));
  assert.equal(streak(book, '2026-10-23'), 4);
  assert.equal(streak(book, '2026-10-24'), 4);
  assert.equal(streak(book, '2026-10-25'), 0);
  assert.equal(streak([], '2026-10-24'), 0);
  const found = markFound({book}, {day: '2026-10-24', spot: 'wardrobe', seconds: 5, seed: 'abcdef01'});
  assert.equal(foundMessage(found, '2026-10-24'), '被你找到啦 · 连着 5 天');
  assert.equal(foundMessage(markFound({}, {day: '2026-10-24', spot: 'wardrobe', seconds: 5}), '2026-10-24'), '被你找到啦');
});

test('the hint fidgets once she has looked for a while', () => {
  const visit = {day: '2026-10-24', enteredAt: 1_000_000};
  assert.equal(fidgeting(visit, 1_000_000 + WIGGLE_AFTER * 1000 - 1), false);
  assert.equal(fidgeting(visit, 1_000_000 + WIGGLE_AFTER * 1000 + 1), true);
  assert.equal(fidgeting(null, 9_000_000), false);
});

test('odd saved data is cleaned; the book stays sorted and counts every find', () => {
  assert.deepEqual(cleanHideSeek(null), {seed: null, book: [], total: 0});
  assert.deepEqual(cleanHideSeek([1, 2]), {seed: null, book: [], total: 0});
  const raw = {
    seed: 'NOT HEX',
    today: {day: '2026-10-24', spot: 'quilt', enteredAt: 5},
    book: [
      {day: '2026-10-22', spot: 'quilt', seconds: 3},
      {day: 'yesterday', spot: 'quilt', seconds: 3},
      {day: '2026-10-21', spot: 'quilt', seconds: -1},
      {day: '2026-10-20', spot: 'wardrobe', seconds: 9},
      {day: '2026-10-22', spot: 'island', seconds: 4}
    ]
  };
  assert.deepEqual(cleanHideSeek(raw), {seed: null, book: [{day: '2026-10-20', spot: 'wardrobe', seconds: 9}, {day: '2026-10-22', spot: 'island', seconds: 4}], total: 2});
  const many = Array.from({length: 1100}, (_, i) => ({day: shiftDay('2024-01-01', i), spot: 'quilt', seconds: i}));
  const kept = cleanHideSeek({book: many, total: 1100});
  assert.equal(kept.book.length, 1000);
  assert.equal(kept.book[0].day, shiftDay('2024-01-01', 100));
  assert.equal(kept.total, 1100);
  assert.equal(markFound(kept, {day: '2027-01-10', spot: 'quilt', seconds: 1}).total, 1101);
});

test('how long it took, in words', () => {
  assert.equal(lasted(9), '9 秒');
  assert.equal(lasted(60), '1 分钟');
  assert.equal(lasted(133), '2 分 13 秒');
  assert.equal(lasted(3600), '1 小时');
  assert.equal(lasted(7260), '2 小时 1 分');
});

import {spotPlacement, availableSpots, placementIn} from '../src/hide-and-seek-spots.js';
import {newReunion, stepReunion, kissSpot, KISS_GAPS} from '../src/hide-and-seek-reunion.js';
import {newMotion, stepResident, angleDelta} from '../src/resident-motion-state.js';

// The default furniture the spots are measured against.
const home = {
  sinkRun: {position: [.9, 0, -2.43], rotationY: 0}, stove: {position: [2.77, 0, -.78], rotationY: 0}, cornerCabinet: {position: [2.77, 0, -1.6], rotationY: 0},
  prepCabinet: {position: [2.77, 0, .04], rotationY: 0}, refrigerator: {position: [3.24, 0, .78], rotationY: 0}, island: {position: [.8, 0, .18], rotationY: 0},
  stoolLeft: {position: [.25, 0, 1.05], rotationY: 0}, stoolRight: {position: [1.14, 0, 1.05], rotationY: 0},
  diningTable: {position: [-.9, 0, -2.05], rotationY: 0}, diningChair1: {position: [-1.78, 0, -2.05], rotationY: Math.PI / 2}, diningChair2: {position: [-.02, 0, -2.05], rotationY: -Math.PI / 2}, diningChair3: {position: [-.9, 0, -1.24], rotationY: 0},
  sofa: {position: [-.62, .43, -.45], rotationY: -Math.PI / 2}, coffeeTable: {position: [-2.4, .34, -.48], rotationY: Math.PI / 2}, armchair: {position: [-2.28, .38, -2.16], rotationY: .62},
  tvUnit: {position: [-3.88, .34, -.55], rotationY: Math.PI / 2}, lamp: {position: [-3.35, 0, -3.6], rotationY: -Math.PI / 4}, floorPlant: {position: [-3.62, .03, -2.48], rotationY: -.18}
};
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('every spot is open in the default home, and follows its furniture', () => {
  assert.deepEqual(availableSpots(home), ['wardrobe', 'quilt', 'armchair', 'island']);
  const wardrobe = spotPlacement('wardrobe', home);
  assert.equal(wardrobe.area, 'bedroom');
  assert.deepEqual(wardrobe.origin, [3.65, -3.1]);
  const moved = spotPlacement('wardrobe', {...home, bedroomWardrobe: {position: [-1, 0, .3], rotationY: 0}});
  assert.ok(close(moved.origin[0], 2.65) && close(moved.origin[1], -2.8));
  // The armchair turned a little: he turns with it, still behind its back.
  const chair = spotPlacement('armchair', home), turned = spotPlacement('armchair', {...home, armchair: {...home.armchair, rotationY: .32}});
  const back = p => Math.hypot(p.figure.x - p.origin[0], p.figure.z - p.origin[1]);
  assert.ok(close(back(chair), .72) && close(back(turned), .72));
  assert.ok(close(turned.figure.yaw, .32));
});

test('a crouching spot with no room behind its furniture is closed', () => {
  // Pushed back into the corner, there's no room behind the armchair.
  const corner = {...home, armchair: {position: [-3.6, .38, -3.1], rotationY: 0}};
  assert.equal(spotPlacement('armchair', corner), null);
  assert.ok(!availableSpots(corner).includes('armchair'));
  // The island backed onto the counters: no room either.
  assert.equal(spotPlacement('island', {...home, island: {position: [.8, 0, -1.3], rotationY: 0}}), null);
});

test('spots downstairs also show in the overview, shifted into its frame', () => {
  const chair = spotPlacement('armchair', home), over = placementIn(chair, 'downstairs');
  assert.ok(close(over.figure.x, chair.figure.x - 1) && close(over.figure.z, chair.figure.z + 1.6));
  const island = placementIn(spotPlacement('island', home), 'downstairs');
  assert.ok(close(island.origin[0], 1.85) && close(island.origin[1], -.82));
  assert.equal(placementIn(chair, 'kitchen'), null);
  assert.equal(placementIn(spotPlacement('quilt', home), 'downstairs'), null);
  assert.equal(placementIn(null, 'living'), null);
});

// Two figures stepping through a reunion, walks planned in straight lines.
function play(r, partner, player, seconds = 12) {
  const route = (from, to) => [to];
  let frames = 0, bursts = 0;
  while (frames++ < seconds * 60) {
    const before = r.burst;
    const going = stepReunion(r, 1 / 60, {partner, player, route});
    if (r.burst && r.burst !== before) bursts++;
    stepResident(partner, 1 / 60, .33);
    stepResident(player, 1 / 60, .33);
    if (!going) break;
  }
  return {frames, bursts};
}

test('found in the wardrobe: he pops out, walks over and kisses her cheek', () => {
  const partner = newMotion([3, -2]), player = newMotion([0, 0]);
  partner.pop = 0;
  const r = newReunion({crouched: false, kiss: 'cheek'});
  const {bursts} = play(r, partner, player);
  assert.equal(r.phase, 'done');
  assert.equal(partner.pop, 1);
  assert.equal(bursts, 1);
  assert.ok(Math.abs(Math.hypot(partner.x - player.x, partner.z - player.z) - KISS_GAPS.cheek) < .02);
  // He faces her; she has turned most of the way towards him, offering a cheek.
  assert.ok(Math.abs(angleDelta(partner.yaw, Math.atan2(player.x - partner.x, player.z - partner.z))) < .1);
  assert.ok(Math.abs(angleDelta(player.yaw, Math.atan2(partner.x - player.x, partner.z - player.z) + .55)) < .1);
  assert.ok(close(partner.lean, 0, .01) && close(player.lean, 0, .01));
});

test('found behind furniture: he stands up first, then walks', () => {
  const partner = newMotion([2, 1]), player = newMotion([0, 0]);
  partner.crouch = partner.crouchTo = .5;
  const r = newReunion({crouched: true, kiss: 'long'});
  stepReunion(r, 1 / 60, {partner, player, route: (a, b) => [b]});
  assert.equal(r.phase, 'rise');
  // While he's still crouched he doesn't start walking.
  partner.route = [[0, 0]];
  stepResident(partner, 1 / 60, .33);
  assert.ok(close(partner.x, 2) && close(partner.z, 1));
  partner.route = [];
  const {bursts} = play(r, partner, player);
  assert.equal(r.phase, 'done');
  assert.equal(r.kiss, 'long');
  assert.equal(bursts, 1);
  assert.ok(partner.crouch < .01);
});

test('she walks off before the kiss: no kiss, nobody stuck leaning', () => {
  const partner = newMotion([1.5, 0]), player = newMotion([0, 0]);
  const r = newReunion({crouched: false, kiss: 'cheek'});
  const route = (from, to) => [to];
  for (let i = 0; i < 600 && r.phase !== 'face'; i++) {
    stepReunion(r, 1 / 60, {partner, player, route});
    stepResident(partner, 1 / 60, .33);
  }
  assert.equal(r.phase, 'face');
  player.route = [[0, 3]];
  assert.equal(stepReunion(r, 1 / 60, {partner, player, route}), false);
  assert.equal(r.burst, null);
  assert.equal(partner.leanTo, 0);
});

test('no way to her: he stays put and nobody kisses', () => {
  const partner = newMotion([3, 0]), player = newMotion([0, 0]);
  const r = newReunion({crouched: false, kiss: 'cheek'});
  const {bursts} = play(r, partner, player, 4);
  assert.equal(bursts, 1, 'with a way, a kiss');
  const stuck = newReunion({crouched: false, kiss: 'cheek'}), p2 = newMotion([3, 0]), h2 = newMotion([0, 0]);
  let going = true;
  for (let i = 0; i < 600 && going; i++) going = stepReunion(stuck, 1 / 60, {partner: p2, player: h2, route: () => null});
  assert.equal(stuck.phase, 'done');
  assert.equal(stuck.burst, null);
  assert.deepEqual([p2.x, p2.z], [3, 0]);
  assert.equal(p2.pop, 1);
});

test('a reunion that cannot move on still ends, with nobody stuck crouching', () => {
  const partner = newMotion([2, 0]), player = newMotion([0, 0]);
  partner.crouch = partner.crouchTo = 1;
  const r = newReunion({crouched: true, kiss: 'long'});
  // His figure never steps (it didn't load): crouch never eases by itself.
  let frames = 0;
  while (stepReunion(r, 1 / 60, {partner, player, route: (a, b) => [b]}) && frames < 60 * 40) frames++;
  assert.equal(r.phase, 'done');
  assert.ok(frames <= 60 * 26, `${frames} frames`);
  assert.equal(partner.crouchTo, 0);
  assert.equal(partner.leanTo, 0);
});

test('furniture beside her: he takes the other side rather than kissing too close', () => {
  const partner = newMotion([2, -.5]), player = newMotion([0, 0]);
  const r = newReunion({crouched: false, kiss: 'cheek'});
  // Looking along -z: the side nearer him is +x, but furniture there pulls the spot in to .4 from her.
  const place = ([x, z]) => (x > .1 ? [.4, z] : [x, z]);
  const route = (from, to) => [to];
  for (let i = 0; i < 60 * 12; i++) {
    if (!stepReunion(r, 1 / 60, {partner, player, route, place, view: [0, -1]})) break;
    stepResident(partner, 1 / 60, .33);
    stepResident(player, 1 / 60, .33);
  }
  assert.ok(partner.x < 0, `went round to the other side: ${partner.x}`);
  assert.ok(Math.hypot(partner.x - player.x, partner.z - player.z) > .6);
});

test('when she sits, he comes to stand in front of her seat', () => {
  const player = newMotion([0, 0]), partner = newMotion([2, 2]);
  player.sit = 1;
  player.seat = {seat: [0, 0], approach: [0, .8], height: .65, yaw: 0};
  assert.deepEqual(kissSpot(partner, player), [0, .8]);
  player.sit = 0;
  player.seat = null;
  const [x, z] = kissSpot(partner, player);
  assert.ok(close(Math.hypot(x, z), KISS_GAPS.cheek));
  const [lx, lz] = kissSpot(partner, player, 'long');
  assert.ok(close(Math.hypot(lx, lz), KISS_GAPS.long));
  // Seen from a camera looking along -z, he stands beside her, not behind.
  const [vx, vz] = kissSpot(partner, player, 'cheek', [0, -1]);
  assert.ok(close(vz, 0) && close(Math.abs(vx), KISS_GAPS.cheek));
  assert.ok(vx > 0, 'on the side nearer him');
});
