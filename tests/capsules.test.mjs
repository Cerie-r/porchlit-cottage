import test from 'node:test';
import assert from 'node:assert/strict';
import {DOLL_PRIZES, PRIZE_NAMES, SEASONS, OUTFIT_SEASONS, RARE_ODDS, AGAIN_ODDS, SCRAPS_FOR_ONE, SCRAPS_FOR_RARE, scrapsFor, capsulePool, cleanCapsules, cleanNotes, describePrize, drawnToWear, exchange, inSeason, outfitInSeason, owns, stillToDraw, turnDial} from '../src/capsules.js';
import {PEOPLE_PIECES, PEOPLE_OUTFITS, PEOPLE_HAIRS} from '../src/capsule-catalog.js';
import {cleanTickets, spendTicket, earnTicket} from '../src/tickets.js';
import {checkHome} from '../src/home-transfer.js';
import {diaryDays} from '../src/diary-days.js';

const home = (n = 3, extra = {}) => ({tickets: {n, log: []}, creations: [], ...extra});
// Random numbers handed out in turn, the last one again and again.
const seq = (...xs) => { let i = 0; return () => xs[Math.min(i++, xs.length - 1)]; };
const at = (list, k) => (k + .5) / list.length;
const OCT = '2026-10-25', MARCH = '2027-03-10';
// The first number decides whether it is something rare (an outfit in its season, or a hairstyle).
const common = (day, k) => seq(.5, .5, at(capsulePool(day).common, k));

test('the seasonal doll accessories are in the jar only around their day', () => {
  assert.equal(inSeason('witchhat', OCT), true);
  assert.equal(inSeason('pumpkin', '2026-11-08'), false);
  assert.equal(inSeason('xmashat', '2026-12-14'), false);
  assert.equal(inSeason('xmashat', '2026-12-15'), true);
  assert.equal(inSeason('xmashat', '2027-01-06'), true);
  assert.equal(inSeason('xmashat', '2027-01-07'), false);
  assert.equal(inSeason('bow', 'nonsense'), true, 'the everyday ones are always in');
  assert.equal(inSeason('witchhat', undefined), false);
  assert.equal(inSeason('constructor', OCT), true, 'not a season of its own');
  assert.ok(Object.keys(SEASONS).every(id => DOLL_PRIZES.includes(id)));
});

test('outfits come and go by season, and only those listed are ever in', () => {
  assert.equal(outfitInSeason('knit-skirt', OCT), true);
  assert.equal(outfitInSeason('knit-skirt', '2026-12-15'), false);
  assert.equal(outfitInSeason('duffle-tights', '2026-12-15'), true);
  assert.equal(outfitInSeason('duffle-tights', '2027-02-28'), true, 'over the new year');
  assert.equal(outfitInSeason('duffle-tights', MARCH), false);
  assert.equal(outfitInSeason('qipao', '2027-01-20'), true);
  assert.equal(outfitInSeason('qipao', '2027-02-21'), false);
  assert.equal(outfitInSeason('dress', OCT), false, 'the base ones never come out');
  assert.equal(outfitInSeason('knit-skirt', 'soon'), false);
  const ids = PEOPLE_OUTFITS.map(o => o.id);
  assert.ok(Object.keys(OUTFIT_SEASONS).every(id => ids.includes(id)), 'no season for an outfit that is not there');
  assert.ok(ids.every(id => Object.hasOwn(OUTFIT_SEASONS, id)), 'every outfit has its season');
});

test("what could come out: the small things, each colourway its own, this season's outfits and the hairstyles", () => {
  const october = capsulePool(OCT), pieceWays = PEOPLE_PIECES.reduce((n, p) => n + p.ways.length, 0);
  assert.deepEqual(october.common.filter(p => p.kind === 'doll').map(p => p.id), ['bow', 'scarf', 'hat', 'wreath', 'glasses', 'wings', 'pearls', 'witchhat', 'pumpkin', 'batwings']);
  assert.equal(october.common.filter(p => p.kind === 'piece').length, pieceWays);
  assert.ok(PEOPLE_PIECES.length >= 14 && PEOPLE_PIECES.every(p => p.ways.length >= 1));
  assert.deepEqual([...new Set(october.rare.filter(p => p.kind === 'outfit').map(p => p.id))].sort(), ['hoodie-cargo', 'knit-skirt', 'knit-trousers']);
  assert.ok(october.rare.every(p => (p.kind === 'outfit' || p.kind === 'hair') && p.way));
  // The eight hairstyles, each one prize in a single colour, whatever the season; out of season they are all.
  const hairs = PEOPLE_HAIRS.map(h => ({kind: 'hair', id: h.id, way: 'base'}));
  assert.equal(hairs.length, 8);
  assert.deepEqual(october.rare.filter(p => p.kind === 'hair'), hairs);
  assert.deepEqual(capsulePool(MARCH).rare, hairs, 'no outfit in season: only the hairstyles');
  assert.ok(capsulePool('2026-12-20').common.some(p => p.id === 'xmashat'));
  const notes = [{id: 'n1', text: '想你'}];
  assert.equal(capsulePool(OCT, {notes}).note, true);
  assert.equal(capsulePool(OCT, {notes, found: ['n1']}).note, false);
  assert.equal(capsulePool(OCT).note, false);
});

test('no ticket, no turn', () => {
  const state = home(0);
  const out = turnDial(state, {day: OCT});
  assert.equal(out.problem, 'no_ticket');
  assert.equal(out.state, state);
});

test('a piece comes out in one colourway; the same again is a scrap, not a ticket', () => {
  const pool = capsulePool(OCT).common, k = pool.findIndex(p => p.kind === 'piece'), first = pool[k];
  let {state, prize} = turnDial(home(2), {day: OCT, random: common(OCT, k)});
  assert.deepEqual(prize, first);
  assert.equal(state.tickets.n, 1);
  assert.deepEqual(state.capsules.pieces, [`${first.id}:${first.way}`]);
  assert.ok(owns(state.capsules, first));
  assert.ok(!owns(state.capsules, {...first, way: 'another'}), 'another colourway is another thing');
  ({state, prize} = turnDial(state, {day: OCT, random: common(OCT, k)}));
  assert.deepEqual(prize, {...first, twice: true});
  assert.equal(state.tickets.n, 0, 'no ticket back');
  assert.equal(state.capsules.scraps, 1);
  assert.deepEqual(state.capsules.pieces, [`${first.id}:${first.way}`]);
  assert.deepEqual(state.tickets.log.map(l => [l.why, l.n]), [['capsule', -1], ['capsule', -1]]);
});

test("a doll's accessory drawn twice is a scrap too", () => {
  let {state} = turnDial(home(2), {day: OCT, random: common(OCT, 3)});
  assert.deepEqual(state.capsules.dolls, ['wreath']);
  const again = turnDial(state, {day: OCT, random: common(OCT, 3)});
  assert.deepEqual(again.prize, {kind: 'doll', id: 'wreath', twice: true});
  assert.equal(again.state.capsules.scraps, 1);
  assert.equal(again.state.tickets.n, 0);
});

test('now and then something rare: an outfit in its season, or a hairstyle any time', () => {
  const rare = capsulePool(OCT).rare;
  const {state, prize} = turnDial(home(1), {day: OCT, random: seq(RARE_ODDS / 2, at(rare, 4))});
  assert.deepEqual(prize, rare[4]);
  assert.deepEqual(state.capsules.outfits, [`${rare[4].id}:${rare[4].way}`]);
  assert.equal(describePrize(prize).rare, true);
  // Out of season the same luck is a hairstyle, kept like the rest; the same again is a scrap.
  const march = capsulePool(MARCH).rare, luck = () => seq(RARE_ODDS / 2, at(march, 2));
  const got = turnDial(home(2), {day: MARCH, random: luck()});
  assert.deepEqual(got.prize, {kind: 'hair', id: march[2].id, way: 'base'});
  assert.deepEqual(got.state.capsules.hairs, [`${march[2].id}:base`]);
  assert.deepEqual(got.state.capsules.got, [{on: MARCH, kind: 'hair', key: `${march[2].id}:base`}]);
  assert.deepEqual(drawnToWear(got.state.capsules).hairs, [`${march[2].id}:base`]);
  assert.deepEqual({...describePrize(got.prize), color: undefined, accent: undefined}, {name: PEOPLE_HAIRS[2].name, way: '', color: undefined, accent: undefined, wearers: PEOPLE_HAIRS[2].wearers, rare: true, hair: true, festival: false});
  const twice = turnDial(got.state, {day: MARCH, random: luck()});
  assert.deepEqual(twice.prize, {...got.prize, twice: true});
  assert.equal(twice.state.capsules.scraps, 1);
  // About one turn in twenty, over many, outfits and hairstyles both.
  let k = 0;
  const lcg = () => (k = (k * 1103515245 + 12345) % 2147483648) / 2147483648, kinds = {outfit: 0, hair: 0};
  for (let i = 0; i < 4000; i++) { const p = turnDial(home(1), {day: OCT, random: lcg}).prize; if (p.kind in kinds) kinds[p.kind]++; }
  assert.ok(kinds.outfit + kinds.hair > 120 && kinds.outfit + kinds.hair < 290, `rare: ${JSON.stringify(kinds)}`);
  assert.ok(kinds.outfit > 30 && kinds.hair > 30, `both: ${JSON.stringify(kinds)}`);
});

test('"again" puts a ticket straight back', () => {
  const {state, prize} = turnDial(home(1), {day: OCT, random: seq(.5, AGAIN_ODDS / 2)});
  assert.deepEqual(prize, {kind: 'again'});
  assert.equal(state.tickets.n, 1);
  assert.deepEqual(turnDial(home(1), {day: MARCH, random: seq(.5, AGAIN_ODDS / 2)}).prize, {kind: 'again'}, 'out of season too');
});

test('a note rolls out once, as a letter in the backpack', () => {
  const notes = [{id: 'n1', text: ' 想你 '}, {id: 'bad id', text: 'x'}];
  const {state, prize} = turnDial(home(2), {day: OCT, notes, random: seq(.5, AGAIN_ODDS + .01, 0)});
  assert.deepEqual(prize, {kind: 'note', id: 'n1', text: '想你'});
  assert.deepEqual(state.capsules.notes, ['n1']);
  assert.deepEqual(state.creations, [{id: 'capsule-n1', kind: 'note', name: '扭蛋里的纸条', note: '想你', location: 'bag', slot: 0, capsule: {on: OCT}}]);
  assert.equal(capsulePool(OCT, {notes, found: state.capsules.notes}).note, false, 'found already');
  assert.notEqual(turnDial(state, {day: OCT, notes, random: seq(.5, AGAIN_ODDS + .01, 0)}).prize.kind, 'note', 'and not again');
  assert.deepEqual(cleanNotes(notes).map(n => n.id), ['n1']);
  // It all saves: the moving box takes the home as it is.
  assert.doesNotThrow(() => checkHome({format: 'porchlit-home', version: 1, entries: {'porchlit-home-layout-v1': {...state, furniture: {}}}}));
});

test('scraps buy one thing still to be drawn this season: ten for a small thing, twenty for an outfit or a hairstyle', () => {
  const left = stillToDraw(home(0), OCT), outfit = left[0], piece = left.find(p => p.kind === 'piece');
  assert.equal(outfit.kind, 'outfit', 'the rare ones first');
  assert.equal(left.length, capsulePool(OCT).rare.length + capsulePool(OCT).common.length);
  assert.deepEqual([scrapsFor(outfit), scrapsFor(piece), scrapsFor({kind: 'doll', id: 'bow'})], [SCRAPS_FOR_RARE, SCRAPS_FOR_ONE, SCRAPS_FOR_ONE]);
  assert.equal(exchange(home(0, {capsules: {scraps: SCRAPS_FOR_ONE - 1}}), piece, {day: OCT}).problem, 'not_enough');
  assert.equal(exchange(home(0, {capsules: {scraps: SCRAPS_FOR_RARE - 1}}), outfit, {day: OCT}).problem, 'not_enough');
  const small = exchange(home(0, {capsules: {scraps: SCRAPS_FOR_ONE}}), piece, {day: OCT});
  assert.deepEqual(small.prize, {...piece, exchanged: true});
  assert.equal(small.state.capsules.scraps, 0);
  const rich = home(0, {capsules: {scraps: SCRAPS_FOR_RARE + 2}});
  const {state, prize} = exchange(rich, outfit, {day: OCT});
  assert.deepEqual(prize, {...outfit, exchanged: true});
  assert.equal(state.capsules.scraps, 2);
  assert.deepEqual(state.capsules.outfits, [`${outfit.id}:${outfit.way}`]);
  assert.equal(state.tickets.n, 0, 'no ticket in it');
  assert.equal(stillToDraw(state, OCT).length, left.length - 1);
  assert.equal(exchange({...state, capsules: {...state.capsules, scraps: 40}}, outfit, {day: OCT}).problem, 'not_here', 'drawn already');
  assert.equal(exchange(rich, outfit, {day: MARCH}).problem, 'not_here', 'out of season');
  assert.equal(exchange(rich, {kind: 'piece', id: 'nothing', way: 'x'}, {day: OCT}).problem, 'not_here');
  assert.equal(exchange(rich, {kind: 'doll', id: 'xmashat'}, {day: OCT}).problem, 'not_here', 'not until December');
  // A hairstyle, any time.
  const hair = stillToDraw(home(0), MARCH).find(p => p.kind === 'hair');
  assert.equal(scrapsFor(hair), SCRAPS_FOR_RARE);
  assert.equal(exchange(home(0, {capsules: {scraps: SCRAPS_FOR_RARE - 1}}), hair, {day: MARCH}).problem, 'not_enough');
  const styled = exchange(home(0, {capsules: {scraps: SCRAPS_FOR_RARE}}), hair, {day: MARCH});
  assert.deepEqual(styled.state.capsules.hairs, [`${hair.id}:base`]);
  assert.equal(exchange(home(0, {capsules: {scraps: 40}}), {kind: 'hair', id: 'classic', way: 'base'}, {day: MARCH}).problem, 'not_here', 'the base ones never come out');
});

test('whatever was saved is cleaned: real things, each once, and a count of scraps', () => {
  const piece = PEOPLE_PIECES[0], outfit = PEOPLE_OUTFITS[0];
  const p = `${piece.id}:${piece.ways[0].id}`, o = `${outfit.id}:${outfit.ways[1].id}`;
  assert.deepEqual(cleanCapsules({dolls: ['bow', 'bow', 'constructor', 'none', 7, 'toString', 'xmashat'], notes: ['n1', 'n1', 'Bad', '__proto__'], pieces: [p, p, `${piece.id}:nope`, 'nothing:x', 3], outfits: [o, `${outfit.id}`], hairs: ['braids:base', 'braids:base', 'braids:nope', 'classic:base', 'braids', p], scraps: 4}),
    {dolls: ['bow', 'xmashat'], notes: ['n1'], pieces: [p], outfits: [o], hairs: ['braids:base'], scraps: 4, festival: {}, got: []});
  const empty = {dolls: [], notes: [], pieces: [], outfits: [], hairs: [], scraps: 0, festival: {}, got: []};
  assert.deepEqual(cleanCapsules(null), empty);
  assert.deepEqual(cleanCapsules([]), empty);
  for (const scraps of [-1, 1.5, '3', NaN, null]) assert.equal(cleanCapsules({scraps}).scraps, 0);
  assert.equal(cleanCapsules({scraps: 5000}).scraps, 999);
  assert.deepEqual(drawnToWear({pieces: [p], outfits: [o], hairs: ['slick:base'], dolls: ['bow']}), {pieces: [p], outfits: [o], hairs: ['slick:base']});
});

test('every prize has a name, and each colourway its own', () => {
  assert.deepEqual(Object.keys(PRIZE_NAMES).sort(), [...DOLL_PRIZES].sort());
  for (const p of [...capsulePool(OCT).common, ...capsulePool(OCT).rare, ...capsulePool('2027-02-01').rare]) {
    const d = describePrize(p);
    assert.ok(d.name, p.id);
    if (p.kind !== 'doll') assert.ok(d.wearers.length && /^#[0-9a-f]{6}$/i.test(d.color) && /^#[0-9a-f]{6}$/i.test(d.accent), p.id);
  }
  for (const x of [...PEOPLE_PIECES, ...PEOPLE_OUTFITS]) assert.equal(new Set(x.ways.map(w => w.name)).size, x.ways.length, `${x.id}: the colourways are told apart`);
});

test('tickets: put in, back out, and the log keeps both ways', () => {
  assert.equal(spendTicket({n: 0, log: []}, 'capsule'), null);
  assert.equal(spendTicket({n: 2, log: []}, 'seek'), null, 'only machines take tickets');
  const t = earnTicket(spendTicket({n: 2, log: []}, 'capsule', OCT), 'again', OCT);
  assert.deepEqual(cleanTickets(JSON.parse(JSON.stringify(t))), t);
  assert.deepEqual(earnTicket({n: 1, log: []}, 'capsule'), {n: 1, log: []}, 'putting one in is never earning one');
});

test('what came out of the machine, and what scraps bought, goes into the diary on its day', () => {
  const pool = capsulePool(OCT).common, k = pool.findIndex(p => p.kind === 'piece'), first = pool[k];
  let {state} = turnDial(home(3), {day: OCT, random: common(OCT, k)});
  ({state} = turnDial(state, {day: OCT, random: common(OCT, k)}));
  assert.deepEqual(state.capsules.got, [{on: OCT, kind: 'piece', key: `${first.id}:${first.way}`}], 'the same again is a scrap, not in the diary');
  const left = stillToDraw(state, OCT), piece = left.find(p => p.kind === 'piece');
  ({state} = exchange({...state, capsules: {...state.capsules, scraps: SCRAPS_FOR_ONE}}, piece, {day: '2026-10-26'}));
  const lines = diaryDays(state).flatMap(d => d.lines.map(l => [d.day, l.kind, l.text]));
  const name = p => {const d = describePrize(p); return `${d.name}${d.way ? `（${d.way}）` : ''}`;};
  assert.deepEqual(lines, [[OCT, 'plaza', `在扭蛋机扭到了${name(first)}`], ['2026-10-26', 'plaza', `用布头在扭蛋机换了${name(piece)}`]]);
  // Saved oddly: only real entries stay, the newest two hundred.
  const kept = cleanCapsules({got: [{on: OCT, kind: 'doll', key: 'bow', swap: 'no'}, {on: 'soon', kind: 'doll', key: 'bow'}, {on: OCT, kind: 'car', key: 'x'}, 7, {on: OCT, kind: 'piece', key: 'x'.repeat(90)},
    // Names that only an object's insides answer to, and a day that is not one, written as a list.
    {on: OCT, kind: 'doll', key: 'toString'}, {on: OCT, kind: 'doll', key: '__proto__'}, {on: OCT, kind: 'doll', key: 'constructor'}, {on: OCT, kind: 'piece', key: 'constructor'}, {on: [OCT], kind: 'doll', key: 'bow'}]}).got;
  assert.deepEqual(kept, [{on: OCT, kind: 'doll', key: 'bow'}]);
  assert.equal(describePrize({kind: 'doll', id: 'toString'}).name, '一样配饰');
  assert.equal(cleanCapsules({got: Array.from({length: 250}, () => ({on: OCT, kind: 'doll', key: 'bow'}))}).got.length, 200);
  assert.deepEqual(diaryDays({capsules: {got: [{on: OCT, kind: 'piece', key: 'nothing:x'}]}}), [], 'nothing to say about a thing there is not');
  // A hairstyle is told as one.
  assert.deepEqual(diaryDays({capsules: {got: [{on: OCT, kind: 'hair', key: 'braids:base'}, {on: OCT, kind: 'hair', key: 'classic:base'}]}}).flatMap(d => d.lines.map(l => l.text)), ['在扭蛋机扭到了发型「双麻花辫」']);
});
