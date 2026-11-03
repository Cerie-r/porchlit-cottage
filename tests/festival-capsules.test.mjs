import test from 'node:test';
import assert from 'node:assert/strict';
import {FESTIVALS, FESTIVAL_SCRAPS, AGAIN_ODDS, SCRAPS_FOR_ONE, capsulePool, cleanCapsules, describePrize, drawnToWear, exchange, festivalOn, festivalPool, openFestivals, scrapsFor, scrapsIn, stillToDraw, turnDial} from '../src/capsules.js';
import {FESTIVAL_POOLS} from '../src/capsule-catalog.js';
import {cleanDrawn, offered} from '../body/drawn.js';

const home = (n = 3, extra = {}) => ({tickets: {n, log: []}, creations: [], ...extra});
const seq = (...xs) => { let i = 0; return () => xs[Math.min(i++, xs.length - 1)]; };
const XMAS = '2026-12-20';

test("a festival's pool opens around its day each year, from the year it starts", () => {
  assert.equal(festivalOn('christmas', '2026-12-14'), false);
  assert.equal(festivalOn('christmas', '2026-12-15'), true);
  assert.equal(festivalOn('christmas', '2027-01-06'), true, 'over the new year it is still the 2026 one');
  assert.equal(festivalOn('christmas', '2027-01-07'), false);
  assert.equal(festivalOn('christmas', '2026-01-03'), false, 'the season before it began');
  assert.equal(festivalOn('halloween', '2026-10-25'), false, "this year's Halloween things wait for next year");
  assert.equal(festivalOn('halloween', '2027-10-20'), true);
  assert.equal(festivalOn('easter', XMAS), false);
  assert.equal(festivalOn('christmas', 'soon'), false);
  assert.deepEqual(openFestivals(XMAS), [{pool: 'christmas', name: FESTIVALS.christmas.name, to: '01-06'}]);
  assert.deepEqual(openFestivals('2026-10-25'), []);
});

test("its pool holds only that festival's own, every colourway alike, none of them in the jar", () => {
  const pool = festivalPool('christmas'), own = FESTIVAL_POOLS.christmas;
  assert.equal(pool.length, [...own.pieces, ...own.outfits].reduce((n, x) => n + x.ways.length, 0));
  assert.ok(pool.every(p => p.pool === 'christmas' && (p.kind === 'piece' || p.kind === 'outfit')));
  const jar = capsulePool(XMAS);
  assert.ok(![...jar.common, ...jar.rare].some(p => pool.some(q => q.id === p.id)), 'not in the jar');
  assert.equal(describePrize(pool.find(p => p.kind === 'outfit')).rare, false, 'not rare here');
  assert.equal(describePrize(pool[0]).festival, true);
});

test('a turn at the festival pool: closed, nothing; open, one of its things, the same again a scrap of its own', () => {
  const closed = turnDial(home(1), {day: '2026-11-20', pool: 'christmas'});
  assert.equal(closed.problem, 'closed');
  assert.equal(closed.state.tickets.n, 1, 'no ticket taken');
  const pool = festivalPool('christmas'), k = 2, at = (k + .5) / pool.length;
  let {state, prize} = turnDial(home(2), {day: XMAS, pool: 'christmas', random: seq(.5, at)});
  assert.deepEqual(prize, pool[k]);
  assert.equal(state.tickets.n, 1);
  ({state, prize} = turnDial(state, {day: XMAS, pool: 'christmas', random: seq(.5, at)}));
  assert.equal(prize.twice, true);
  assert.equal(scrapsIn(state.capsules, 'christmas'), 1);
  assert.equal(scrapsIn(state.capsules), 0, "the jar's scraps are its own");
  const again = turnDial(home(1), {day: XMAS, pool: 'christmas', random: seq(AGAIN_ODDS / 2)});
  assert.equal(again.prize.kind, 'again');
  assert.equal(again.state.tickets.n, 1);
});

test("its scraps buy its things, cheaper than the jar's, while it's open", () => {
  const pool = festivalPool('christmas'), outfit = pool.find(p => p.kind === 'outfit'), piece = pool.find(p => p.kind === 'piece');
  assert.equal(scrapsFor(outfit), FESTIVAL_SCRAPS.outfit);
  assert.equal(scrapsFor(piece), FESTIVAL_SCRAPS.piece);
  assert.ok(FESTIVAL_SCRAPS.piece < SCRAPS_FOR_ONE);
  const rich = home(0, {capsules: {scraps: 30, festival: {christmas: {scraps: FESTIVAL_SCRAPS.outfit + 1}}}});
  const {state, prize} = exchange(rich, outfit, {day: XMAS, pool: 'christmas'});
  assert.deepEqual(prize, {...outfit, exchanged: true});
  assert.equal(scrapsIn(state.capsules, 'christmas'), 1);
  assert.equal(scrapsIn(state.capsules), 30, "the jar's untouched");
  assert.equal(exchange(state, piece, {day: XMAS, pool: 'christmas'}).problem, 'not_enough');
  assert.equal(exchange(rich, outfit, {day: '2027-02-01', pool: 'christmas'}).problem, 'not_here', 'closed');
  assert.equal(exchange(rich, outfit, {day: XMAS}).problem, 'not_here', 'not from the jar');
  assert.equal(stillToDraw(state, XMAS, 'christmas').length, pool.length - 1);
  assert.deepEqual(stillToDraw(state, '2027-02-01', 'christmas'), []);
});

test('what was drawn there is kept with the rest, and the wardrobe offers it', () => {
  const pool = festivalPool('christmas'), [a, b] = [pool[0], pool[pool.length - 1]];
  const saved = cleanCapsules({pieces: [`${a.id}:${a.way}`, `${b.id}:${b.way}`], outfits: [`${a.id}:${a.way}`, `${b.id}:${b.way}`], festival: {christmas: {scraps: 3}, easter: {scraps: 9}, halloween: {scraps: -1}}});
  const keys = [...saved.pieces, ...saved.outfits];
  assert.ok(keys.includes(`${a.id}:${a.way}`) && keys.includes(`${b.id}:${b.way}`));
  assert.deepEqual(saved.festival, {christmas: {scraps: 3}});
  assert.deepEqual(cleanCapsules(null).festival, {});
  const drawn = cleanDrawn(drawnToWear(saved));
  assert.ok(offered(drawn, a.id) && offered(drawn, b.id));
});
