import test from 'node:test';
import assert from 'node:assert/strict';
import {stockOf, cleanSpent, costOf, short, spend, left, shown, ownColours, dyeFor, stockName} from '../src/bench-stock.js';
import {SWATCHES} from '../src/tailor-names.js';
import {speciesLooks, freshAnimal} from '../src/animal-state.js';

const hex = name => SWATCHES.find(([, n]) => n === name)[0];
const home = (found, spent = {}) => ({explore: {found}, spent});

test('what is brought home becomes jars, bottles and handfuls; the rare ones are good for one', () => {
  const s = stockOf(home({'woods:sakura-sprig': 1, 'hill:sakura-sprig': 1, 'mine:ruby': 2, 'woods:blueberry': 1, 'field:cherries': 2, 'deep:cacao': 1, 'lake:round-stone': 4}));
  assert.deepEqual(s.dye['浅粉'], {got: 6, left: 6});
  assert.deepEqual(s.dye['酒红'], {got: 2, left: 2});
  assert.deepEqual(s.dye['牛仔蓝'], {got: 3, left: 3});
  assert.deepEqual(s.dye['可可'], {got: 1, left: 1});
  // One sprig of sakura is a pink dye and a sakura essence both; a cacao pod a cocoa dye and one chocolate.
  assert.deepEqual(s.essence.blush, {got: 6, left: 6});
  assert.deepEqual(s.essence.ink, {got: 1, left: 1});
  assert.deepEqual(s.fruit, {blueberry: {got: 1, left: 1}, cherry: {got: 2, left: 2}});
  // Things that make nothing don't show; nor does what was never found.
  assert.equal(shown(s, 'dye', '亚麻'), false);
  assert.equal(left(s, 'dye', '亚麻'), 0);
  // The plain ones are always there.
  assert.equal(left(s, 'dye', '奶白'), Infinity);
  assert.equal(left(s, 'essence', 'white'), Infinity);
});

test('using some up, and what is left', () => {
  const s = stockOf(home({'field:cherries': 2, 'mine:ruby': 1}, {fruit: {cherry: 2}, dye: {酒红: 1}}));
  assert.deepEqual(s.fruit.cherry, {got: 2, left: 0});
  assert.deepEqual(s.dye['酒红'], {got: 1, left: 0});
  assert.equal(shown(s, 'fruit', 'cherry'), true, 'run out, it stays on the bench, greyed');
  assert.deepEqual(cleanSpent({dye: {酒红: 2, 不存在: 3, 亚麻: -1}, fruit: {cherry: 1.5}, nope: {}}), {dye: {酒红: 2}, essence: {}, fruit: {}, notion: {}, produce: {}});
  assert.deepEqual(spend({}, {dye: {浅粉: 1, 奶白: 1}, essence: {blush: 1, cream: 1}, fruit: {cherry: 1}}), {dye: {浅粉: 1}, essence: {blush: 1}, fruit: {cherry: 1}, notion: {}, produce: {}});
});

test('what making a thing uses: a garment\'s dyes, a doll\'s colours beyond its own, a dessert\'s flavours and fruit', () => {
  // A garment: each dye once, the plain ones and the pattern's own colours free.
  assert.deepEqual(costOf({colors: {main: hex('浅粉'), accent: hex('浅粉'), trim: hex('奶白')}}).dye, {浅粉: 1});
  assert.deepEqual(costOf({colors: {main: '#7d3b4f', accent: hex('奶白'), trim: hex('墨黑')}}, {own: new Set(['#7d3b4f'])}).dye, {});
  // A colour picked by hand is the nearest dye.
  assert.equal(dyeFor('#f0d0d4'), '浅粉');
  // A doll in its kind's own colours needs nothing; another colour takes a dye.
  const own = ownColours(['bear', 'cat']), bear = {...freshAnimal(), ...speciesLooks.bear, kind: 'animal'};
  assert.deepEqual(costOf(bear, {own}).dye, {});
  assert.deepEqual(costOf({...bear, fur: hex('浅粉')}, {own}).dye, {浅粉: 1});
  assert.deepEqual(costOf({...bear, fur: speciesLooks.cat.fur}, {own}).dye, {}, 'a kind caught lends its colours to every doll');
  // A dessert: the sponge's gold is the plain egg sponge; the plate is only a colour; cream and sprinkles only when on.
  const cake = {kind: 'dessert', cream: 'rosette', sprinkles: 'dots', fruit: 'cherry', c: {body: 'gold', cream: 'blush', sprinkles: 'ink', plate: 'rose'}};
  assert.deepEqual(costOf(cake), {dye: {}, essence: {blush: 1, ink: 1}, fruit: {cherry: 1}, notion: {}, produce: {}});
  assert.deepEqual(costOf({...cake, cream: 'none', sprinkles: 'none', fruit: 'none', c: {...cake.c, body: 'wood'}}), {dye: {}, essence: {wood: 1}, fruit: {}, notion: {}, produce: {}});
});

test('what is short, in words', () => {
  const s = stockOf(home({'field:cherries': 1}, {fruit: {cherry: 1}}));
  assert.match(short(s, {dye: {亚麻: 1}, essence: {}, fruit: {}}).words, /还没有「亚麻」的染料/);
  assert.match(short(s, {dye: {}, essence: {}, fruit: {cherry: 1}}).words, /樱桃用完了/);
  assert.match(short(s, {dye: {}, essence: {lilac: 1}, fruit: {}}).words, /还没有「芋泥」的香精/);
  assert.equal(short(s, {dye: {奶白: 1}, essence: {cream: 1}, fruit: {}}), null);
});

test('lace and pearl buttons: a dawn web is lace for two pieces, a pearl one set of buttons', () => {
  const s = stockOf(home({'woods:dew-web': 2, 'lake:pearl': 1, 'lake:shell': 3}, {notion: {lace: 1}}));
  assert.deepEqual(s.notion, {lace: {got: 4, left: 3}, pearl: {got: 1, left: 1}});
  assert.equal(stockName('notion', 'lace'), '蕾丝');
  assert.equal(stockName('notion', 'pearl'), '珍珠扣');
  // A piece takes lace once however many of its edges have it, and one set of pearls; none without them.
  const piece = {colors: {main: hex('奶白'), accent: hex('奶白'), trim: hex('奶白')}};
  assert.deepEqual(costOf({...piece, lace: ['hem', 'collar', 'cuffs'], pearls: true}).notion, {lace: 1, pearl: 1});
  assert.deepEqual(costOf({...piece, lace: ['cuffs']}).notion, {lace: 1});
  assert.deepEqual(costOf({...piece, lace: [], pearls: 'yes'}).notion, {});
  assert.deepEqual(costOf({kind: 'dessert', lace: ['hem'], c: {}}).notion, {}, 'only what is sewn');
  // Nothing of them is always there; what is used is counted, more than one at once when it takes more.
  assert.equal(left(stockOf(home({})), 'notion', 'lace'), 0);
  assert.deepEqual(spend({notion: {lace: 1}}, {notion: {lace: 2, pearl: 1, button: 1}}).notion, {lace: 3, pearl: 1});
  assert.deepEqual(cleanSpent({notion: {lace: 2, pearl: 0, silk: 4}}).notion, {lace: 2});
});

test('what is short of lace and pearls says where they are found', () => {
  const none = stockOf(home({}));
  assert.match(short(none, {notion: {lace: 1}}).words, /^还没有蕾丝。天刚亮的时候去林子里，篱笆上挂着露水的蛛网/);
  assert.match(short(none, {notion: {pearl: 1}}).words, /^还没有珍珠扣。去湖边找一颗珍珠/);
  const used = stockOf(home({'woods:dew-web': 1, 'lake:pearl': 1}, {notion: {lace: 2, pearl: 1}}));
  assert.match(short(used, {notion: {lace: 1}}).words, /^蕾丝用完了。/);
  assert.match(short(used, {notion: {pearl: 1}}).words, /^珍珠扣用完了。/);
  const one = stockOf(home({'woods:dew-web': 1}, {notion: {lace: 1}}));
  assert.equal(short(one, {notion: {lace: 1}}), null);
  assert.match(short(one, {notion: {lace: 2}}).words, /^蕾丝不够了。/, 'one left, two wanted');
});

test('the stove cooks with what the fields give: a tomato or a head of greens is one dish', () => {
  // The kitchen opens with two tomatoes and a head of greens in the fridge, once; the rest comes from going out.
  const fresh = stockOf(home({}));
  assert.deepEqual(fresh.produce, {tomato: {got: 2, left: 2}, greens: {got: 1, left: 1}});
  assert.equal(short(fresh, costOf({kind: 'dish', items: ['tomato', 'egg']})), null, 'the first dishes need no going out');
  const s = stockOf(home({'field:tomato': 2, 'field:greens': 1, 'field:pumpkin': 1}, {produce: {tomato: 1}}));
  assert.deepEqual(s.produce.tomato, {got: 4, left: 3});
  assert.deepEqual(s.produce.greens, {got: 2, left: 2});
  // A pumpkin is a dye and a pot of porridge both.
  assert.deepEqual(s.produce.pumpkin, {got: 1, left: 1});
  assert.deepEqual(s.dye['杏色'], {got: 3, left: 3});
  assert.deepEqual(costOf({kind: 'dish', items: ['tomato', 'egg']}).produce, {tomato: 1});
  assert.deepEqual(costOf({kind: 'dish', items: ['greens']}).produce, {greens: 1});
  assert.deepEqual(costOf({kind: 'dish', items: ['pumpkin', 'pea', 'egg']}).produce, {pumpkin: 1, pea: 1}, 'eggs are always there');
  assert.deepEqual(spend({}, costOf({kind: 'dish', items: ['greens']})).produce, {greens: 1});
  // Once those are cooked, it's out to the fields.
  assert.match(short(stockOf(home({}, {produce: {tomato: 2}})), costOf({kind: 'dish', items: ['tomato', 'egg']})).words, /^番茄用完了，出门再去田里找一些/);
  assert.match(short(stockOf(home({'field:greens': 1}, {produce: {greens: 2}})), costOf({kind: 'dish', items: ['greens']})).words, /^青菜用完了/);
  assert.match(short(fresh, {produce: {pea: 1}}).words, /^还没有豌豆，出门去田里找一找/);
  assert.equal(short(s, costOf({kind: 'dish', items: ['tomato', 'egg']})), null);
  assert.equal(stockName('produce', 'tomato'), '番茄');
});
