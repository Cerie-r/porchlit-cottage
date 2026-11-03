import test from 'node:test';
import assert from 'node:assert/strict';
import {diaryDays} from '../src/diary-days.js';
import {ALL_FINDS, ON_MAP, foundShelf, placesOpen} from '../src/explore-places.js';
import {BASKET, DOOR_WAIT, TRIPS_A_DAY, atDoor, bringHome, homecoming, isHome, markSearched, outNow, outingNow, searchedOn, canGoOut, cleanExplore, cleanTrip, goHome, invitedToday, inviteOut, leaveDoor, pick, placeSeed, remember,
  startTrip, tripLine, tripsOn, visit, waitAtDoor} from '../src/explore-trips.js';

// He has said 走 (on day), over a home's going out (more).
const BIRCH = {id: '7', name: 'Birch'};
const invited = (day = '2026-10-28', more = {}) => inviteOut(more, BIRCH, day);

const names = {place: p => ({lake: '湖边', tea: '茶山'})[p], find: (p, id) => ({'lake:shell': '一枚贝壳', 'tea:tea-sprig': '一芽两叶'})[`${p}:${id}`]};

test('what a home keeps of going out: only what makes sense', () => {
  assert.deepEqual(cleanExplore(null), {found: {}, days: {}, trips: [], door: null, invite: null});
  const e = cleanExplore({found: {'lake:shell': 2, 'lake:': 1, 'x:y': -1, 'BAD:shell': 1}, days: {'2026-10-28': 1, 'nope': 3}, door: {since: 5},
    invite: {by: {id: '7', name: 'Birch'}, on: '2026-10-28'}, trips: [{day: '2026-10-28', n: 1, places: ['lake'], finds: [{place: 'lake', id: 'shell'}], moments: [{place: 'lake', kind: 'hug', text: '在码头他从背后抱住了你'}, {place: 'lake', kind: 'nope'}]}, {day: 'x'}]});
  assert.deepEqual(e.found, {'lake:shell': 2});
  assert.deepEqual(e.days, {'2026-10-28': 1});
  assert.deepEqual(e.door, {since: 5});
  assert.deepEqual(e.invite, {by: {id: '7', name: 'Birch'}, on: '2026-10-28'});
  assert.equal(e.trips.length, 1);
  assert.equal(e.trips[0].moments.length, 1);
});

test('going out: twice a day, the door and the invitation done with, each trip its own seed', () => {
  const day = '2026-10-28';
  let e = waitAtDoor(inviteOut({}, BIRCH, day), 1000);
  assert.ok(e.door && invitedToday(e, day) && !invitedToday(e, '2026-10-29'));
  // Not without his 走, nor with yesterday's.
  assert.match(startTrip(waitAtDoor({}, 1000), day, 'home-1').problem, /等他回一声「走」/);
  assert.match(startTrip(invited('2026-10-27'), day, 'home-1', {him: '她'}).problem, /等她回一声「走」/);
  const first = startTrip(e, day, 'home-1');
  assert.equal(first.trip.n, 1);
  assert.equal(first.explore.door, null);
  assert.equal(first.explore.invite, null);
  assert.equal(tripsOn(first.explore, day), 1);
  // Each trip its own 走.
  assert.ok(startTrip(first.explore, day, 'home-1').problem);
  const second = startTrip(invited(day, first.explore), day, 'home-1');
  assert.equal(second.trip.n, 2);
  assert.notEqual(second.trip.seed, first.trip.seed);
  assert.ok(!canGoOut(second.explore, day));
  assert.match(startTrip(invited(day, second.explore), day, 'home-1').problem, new RegExp(String(TRIPS_A_DAY)));
  // Another home the same day, another walk.
  assert.notEqual(startTrip(invited(day), day, 'home-2').trip.seed, first.trip.seed);
  // Each page its own seed on a trip, and the same again on the same trip.
  assert.notEqual(placeSeed(first.trip, 'lake'), placeSeed(first.trip, 'tea'));
  assert.equal(placeSeed(first.trip, 'lake'), placeSeed(first.trip, 'lake'));
  assert.deepEqual(leaveDoor(e).door, null);
});

test('a trip: places walked, a basket of five across the pages, what happened, home again into the diary', () => {
  let {trip} = startTrip(invited(), '2026-10-28', 'home-1');
  trip = visit(visit(visit(trip, 'lake'), 'tea'), 'lake');
  assert.deepEqual(trip.places, ['lake', 'tea']);
  trip = pick(pick(trip, 'lake', 'shell'), 'tea', 'tea-sprig');
  for (let i = 0; i < 10; i++) trip = pick(trip, 'lake', 'shell');
  assert.equal(trip.basket.length, BASKET);
  trip = remember(trip, {place: 'lake', kind: 'hug', text: '在码头他从背后抱住了你'});
  trip = remember(trip, {place: 'lake', kind: 'bogus'});
  trip = remember(trip, {place: 'lake', kind: 'hug', text: '在码头他从背后抱住了你'});
  assert.equal(trip.moments.length, 1);
  // Through sessionStorage and back.
  const back = cleanTrip(JSON.parse(JSON.stringify(goHome(trip))));
  assert.ok(back.home);
  assert.deepEqual(back.basket, trip.basket);
  const home = bringHome({found: {'lake:shell': 1}}, back);
  assert.equal(home.found['lake:shell'], 1 + BASKET - 1);
  assert.equal(home.found['tea:tea-sprig'], 1);
  assert.equal(home.trips.length, 1);
  assert.equal(tripLine(home.trips[0], {names}), '和他一起出门，去了湖边、茶山，捡到一枚贝壳、一芽两叶；在码头他从背后抱住了你。');
  assert.equal(tripLine({places: ['lake'], finds: [], moments: []}, {names, him: '她'}), '和她一起出门，去了湖边，什么也没捡。');
  // A trip that never got anywhere leaves no line.
  assert.equal(bringHome({}, startTrip(invited(), '2026-10-28').trip).trips.length, 0);
  assert.equal(cleanTrip({v: 2}), null);
});

test('home again: the album shelf of what came home, the diary line, and the door as the house says it', () => {
  let {explore, trip} = startTrip(invited(), '2026-10-28', 'home-1');
  trip = pick(pick(visit(trip, 'lake'), 'lake', 'shell'), 'lake', 'shell');
  trip = remember(trip, {place: 'lake', kind: 'hug', text: '在码头他从背后抱住了你'});
  const home = bringHome(explore, goHome(trip));
  const shelf = foundShelf(home);
  assert.equal(shelf.length, 1);
  assert.deepEqual({...shelf[0], picture: undefined}, {place: 'lake', id: 'shell', name: ALL_FINDS.find(f => f.place === 'lake' && f.id === 'shell').name, picture: undefined, n: 2, from: '湖边'});
  assert.match(shelf[0].picture, /^\/explore\/lakeside\/.+\.webp$/);
  // Nothing from a place or a find the book doesn't have.
  assert.deepEqual(foundShelf({found: {'moon:rock': 3}}), []);
  const [day] = diaryDays({explore: home}, {him: '她'});
  assert.equal(day.day, '2026-10-28');
  assert.deepEqual(day.lines.map(l => l.kind), ['outing']);
  assert.match(day.lines[0].text, /^和她一起出门，去了湖边，捡到.+；在码头他从背后抱住了你。$/);
  // The button at the door: he's said 走; she's waiting; done for today.
  assert.equal(outingNow({}, '2026-10-28'), '');
  assert.equal(outingNow(waitAtDoor({}, 5), '2026-10-28', 10), 'door');
  assert.equal(outingNow(inviteOut(waitAtDoor({}, 5), {id: '7', name: 'Birch'}, '2026-10-28'), '2026-10-28'), 'go');
  assert.equal(outingNow(inviteOut({}, {id: '7', name: 'Birch'}, '2026-10-27'), '2026-10-28'), '');
  assert.equal(outingNow({days: {'2026-10-28': TRIPS_A_DAY}}, '2026-10-28'), 'done');
});

test('the map: every place but the deep woods from the start; the deep woods once the woods have been on three trips', () => {
  const woods = n => ({trips: Array.from({length: n}, (_, i) => ({day: '2026-10-28', n: i + 1, places: ['woods'], finds: [], moments: []}))});
  assert.deepEqual(placesOpen({}), Object.keys(ON_MAP).filter(id => id !== 'deep'));
  assert.ok(!placesOpen(woods(2)).includes('deep'));
  assert.ok(placesOpen(woods(3)).includes('deep'));
  // The trip they're on counts, once: not again when it has come home already.
  assert.ok(placesOpen(woods(2), {day: '2026-10-28', n: 3, places: ['lake', 'woods']}).includes('deep'));
  assert.ok(!placesOpen(woods(2), {day: '2026-10-28', n: 3, places: ['lake']}).includes('deep'));
  assert.ok(!placesOpen(woods(2), {day: '2026-10-28', n: 2, places: ['woods']}).includes('deep'));
});

test('turned back at the cover: not one of the day\'s trips, his 走 stands; out together until home; home once', () => {
  const day = '2026-10-28', first = startTrip(waitAtDoor(invited(day), 1000), day, 'home-1', {now: 5000});
  assert.deepEqual(first.explore.out, {day, n: 1, since: 5000});
  assert.deepEqual(outNow(first.explore, day, 6000), {day, n: 1, since: 5000});
  // A tab closed on the way never comes home: after a while, not out any more; nor on another day.
  assert.equal(outNow(first.explore, day, 5000 + 7 * 3600e3), null);
  assert.equal(outNow(first.explore, '2026-10-29', 6000), null);
  // Back home from the cover without a page: given back.
  const given = homecoming(first.explore, first.trip);
  assert.equal(given.back, 'given');
  assert.equal(tripsOn(given.explore, day), 0);
  assert.ok(invitedToday(given.explore, day));
  assert.equal(given.explore.out, undefined);
  assert.equal(outingNow(given.explore, day), 'go');
  // Off again on the same 走, and somewhere this time: kept, once.
  const again = startTrip(given.explore, day, 'home-1', {now: 9000});
  assert.equal(again.trip.n, 1);
  const walked = pick(visit(again.trip, 'lake'), 'lake', 'shell');
  const home = homecoming(again.explore, walked);
  assert.equal(home.back, 'home');
  assert.equal(home.explore.out, undefined);
  assert.ok(isHome(home.explore, walked));
  assert.equal(tripsOn(home.explore, day), 1);
  const twice = homecoming(home.explore, walked);
  assert.equal(twice.back, 'again');
  assert.deepEqual(twice.explore, home.explore);
  // Only the day's latest is given back (one set off after it stays counted); and what isn't a trip changes nothing.
  assert.equal(tripsOn(homecoming({days: {[day]: 2}}, first.trip).explore, day), 2);
  assert.equal(homecoming({}, {v: 9}).back, null);
  // The trip carries his 走 through sessionStorage.
  assert.deepEqual(cleanTrip(JSON.parse(JSON.stringify(first.trip))).invite, {by: BIRCH, on: day});
});

test('a trip keeps what was looked through, page by page; it comes home once; waiting at the door goes stale', () => {
  let {explore, trip} = startTrip(invited(), '2026-10-28', 'home-1');
  trip = visit(trip, 'lake');
  trip = markSearched(markSearched(trip, 'lake', 'rock-tall-12', 'taken'), 'lake', 'reed-mid-dense-2', 'empty');
  trip = markSearched(trip, 'lake', 'bad id!', 'taken');
  trip = markSearched(trip, 'lake', 'boat-tied-wood-6', 'felt');
  assert.deepEqual(searchedOn(trip, 'lake'), {'rock-tall-12': 'taken', 'reed-mid-dense-2': 'empty'});
  assert.deepEqual(searchedOn(trip, 'tea'), {});
  // Through sessionStorage and back; only for places on the trip.
  const back = cleanTrip(JSON.parse(JSON.stringify({...trip, searched: {...trip.searched, tea: {'x-1': 'taken'}}})));
  assert.deepEqual(back.searched, {lake: {'rock-tall-12': 'taken', 'reed-mid-dense-2': 'empty'}});
  // Home twice (a copied tab), counted once.
  trip = pick(trip, 'lake', 'pearl');
  const once = bringHome(explore, trip), twice = bringHome(once, trip);
  assert.deepEqual(twice, once);
  assert.equal(twice.found['lake:pearl'], 1);
  // At the door: for three hours, then as if she'd gone back in.
  const t = Date.UTC(2026, 9, 28, 9);
  const waiting = waitAtDoor({}, t);
  assert.ok(atDoor(waiting, t + 60e3) && !atDoor(waiting, t + DOOR_WAIT + 1));
  assert.equal(outingNow(waiting, '2026-10-28', t + 60e3), 'door');
  assert.equal(outingNow(waiting, '2026-10-28', t + DOOR_WAIT + 1), '');
});
