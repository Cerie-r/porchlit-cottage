import test from 'node:test';
import assert from 'node:assert/strict';
import {CABINET, cabinetDolls, cleanCaught, grabChance, keepDoll, kindName, payClaw, withKind} from '../src/claw.js';
import {weeklyDolls, availableSpecies, seeded} from '../src/doll-catch.js';
import {validAnimal, speciesLooks} from '../src/animal-state.js';
import {receiveMail} from '../src/mail-receipts.js';
import {outgoing} from '../src/door-gifts.js';
import {diaryDays} from '../src/diary-days.js';
import {checkHome} from '../src/home-transfer.js';

const home = (n = 2, extra = {}) => ({tickets: {n, log: []}, creations: [], ...extra});

test("the cabinet: four kinds, this week's doll five times and two of each old friend, each in its own colours and a form of its own", () => {
  const day = '2026-10-25', {featured, company} = weeklyDolls(new Date(day + 'T12:00:00Z'), 3);
  const {featured: shown, dolls} = cabinetDolls(day, 3, seeded(7));
  assert.equal(shown, featured);
  assert.equal(dolls.length, CABINET);
  const count = s => dolls.filter(d => d.species === s).length;
  assert.equal(count(featured), 5);
  for (const s of company) assert.equal(count(s), 2);
  assert.equal(new Set(dolls.map(d => d.species)).size, 4);
  assert.ok(dolls.every(d => validAnimal(d) && d.accessory.length === 0), 'plain dolls, nothing worn');
  for (const d of dolls) assert.deepEqual([d.fur, d.cream, d.patch], [speciesLooks[d.species].fur, speciesLooks[d.species].cream, speciesLooks[d.species].patch], `${d.species} in its own colours`);
  const forms = dolls.filter(d => d.species === featured).map(d => [d.ears, d.pose, d.expression, d.body].join(' '));
  assert.ok(new Set(forms).size > 1, `this week's five not all alike: ${forms.join(' | ')}`);
  // A week on, another doll; another street, its own.
  assert.notEqual(cabinetDolls('2026-11-01', 3, seeded(7)).featured, featured);
  assert.ok([0, 1, 2, 3, 4, 5].some(s => cabinetDolls(day, s).featured !== featured));
});

test('how sure a grab is: square on, near enough, or off', () => {
  assert.equal(grabChance(0), .85);
  assert.equal(grabChance(.05), .5);
  assert.equal(grabChance(.08), 0);
  assert.equal(grabChance(NaN), 0);
  assert.equal(grabChance(-1), 0);
});

test('a grab takes a ticket; none, no grab', () => {
  const {state} = payClaw(home(1), '2026-10-25');
  assert.equal(state.tickets.n, 0);
  assert.deepEqual(state.tickets.log, [{why: 'claw', n: -1, day: '2026-10-25'}]);
  const none = home(0), out = payClaw(none, '2026-10-25');
  assert.equal(out.problem, 'no_ticket');
  assert.equal(out.state, none);
});

test('a caught doll goes in the backpack once, and its kind is ours', () => {
  const doll = cabinetDolls('2026-10-25', 1, seeded(2)).dolls[0];
  let state = keepDoll(home(), doll, {day: '2026-10-25', id: 'caught-1'});
  assert.equal(state.creations.length, 1);
  assert.deepEqual(state.caught, [doll.species]);
  const item = state.creations[0];
  assert.equal(item.location, 'bag');
  assert.deepEqual(item.caught, {on: '2026-10-25'});
  assert.ok(validAnimal(item));
  assert.equal(keepDoll(state, doll, {day: '2026-10-25', id: 'caught-1'}), state, 'the same catch twice is one doll');
  state = keepDoll(state, doll, {day: '2026-10-25', id: 'caught-2'});
  assert.equal(state.creations.length, 2, 'another of the same kind is another doll');
  assert.deepEqual(state.caught, [doll.species]);
  assert.ok(availableSpecies(state.caught).includes(doll.species));
  assert.equal(keepDoll(home(), {kind: 'animal', species: 'mouse'}, {id: 'x'}).creations.length, 0, 'no mice');
  // The diary tells of it, and it saves.
  assert.deepEqual(diaryDays(state).at(-1).lines.map(l => l.kind), ['plaza', 'plaza']);
  assert.match(diaryDays(state).at(-1).lines[0].text, /^在抓娃娃机抓到一只/);
  assert.doesNotThrow(() => checkHome({format: 'porchlit-home', version: 1, entries: {'porchlit-home-layout-v1': {...state, furniture: {}}}}));
  // Given away, it doesn't say where it was caught.
  assert.equal(outgoing(item).caught, undefined);
});

test('the kinds kept: real ones, each once', () => {
  assert.deepEqual(cleanCaught(['rabbit', 'rabbit', 'mouse', 7, 'constructor', 'dragon']), ['rabbit', 'dragon']);
  assert.deepEqual(cleanCaught(null), []);
  assert.deepEqual(withKind(['cat'], 'cat'), ['cat']);
  assert.deepEqual(withKind(['cat'], 'lamb'), ['cat', 'lamb']);
  assert.deepEqual(withKind(undefined, 'mouse'), []);
  assert.equal(kindName('lamb'), '小羊');
  assert.equal(kindName('panda'), '熊猫');
});

test('a doll someone gives you counts too', () => {
  const doll = {...cabinetDolls('2026-10-25', 2, seeded(5)).dolls[0], name: '送你的'};
  const visit = {id: '41', status: 'taken', from: {name: '邻居'}, item: doll};
  const next = receiveMail(home(0), visit, '2026-10-25');
  assert.deepEqual(next.caught, [doll.species]);
  const flowers = receiveMail(home(0), {id: '42', status: 'taken', from: {name: '邻居'}, note: '你好'}, '2026-10-25');
  assert.equal(flowers.caught, undefined, 'a note alone unlocks nothing');
});
