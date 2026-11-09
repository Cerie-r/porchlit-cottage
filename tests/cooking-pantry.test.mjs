import test from 'node:test';
import assert from 'node:assert/strict';
import {INGREDIENTS, EXTRAS, EXTRA_PRODUCE, extraVerb, teaEggs, stepsFor, dishName, freshDish, dishProblems, validDish, dishRecipe, dishTaste, produceOf} from '../src/cooking-recipe.js';
import {PRODUCE, costOf, short, stockOf} from '../src/bench-stock.js';
import {pantryOf} from '../src/cooking-pantry.js';

// A home that has been out and brought these back: {place:id: n}.
const homeWith = found => ({explore: {found}, spent: {}});

test('what going out brings is in the kitchen: from the fields, the tea hill and the woods', () => {
  for (const id of ['taro', 'bamboo', 'wheat', 'tea']) assert.ok(INGREDIENTS[id] && PRODUCE[INGREDIENTS[id].produce], id);
  for (const id of ['honey', 'walnut', 'pinenut']) assert.ok(EXTRAS[id] && PRODUCE[EXTRA_PRODUCE[id]], id);
  assert.equal(INGREDIENTS.tea.pot, true);
  assert.equal(extraVerb('honey'), '淋');
  assert.equal(extraVerb('walnut'), '撒');
  const stock = stockOf(homeWith({'field:taro': 1, 'field:wheat-ear': 2, 'tea:tea-sprig': 1, 'tea:bamboo': 1, 'woods:honeycomb': 1, 'woods:pinecone': 1, 'deep:walnut': 1}));
  assert.deepEqual(Object.fromEntries(['taro', 'wheat', 'tea', 'bamboo', 'honey', 'pinenut', 'walnut'].map(k => [k, stock.produce[k].left])), {taro: 1, wheat: 2, tea: 2, bamboo: 1, honey: 3, pinenut: 2, walnut: 2});
});

test('wheat is kneaded, rolled and cut; tea is rinsed; eggs with tea in the pot go in whole', () => {
  assert.deepEqual(stepsFor(['wheat', 'egg'], 'pot').map(([s, label]) => `${s}/${label}`), ['knead:wheat/揉面', 'roll:wheat/擀面', 'cut:wheat/切面', 'egg/打蛋', 'whisk/搅蛋', 'fire/点火', 'water/加水', 'boil/煮', 'serve/盛出来']);
  assert.deepEqual(stepsFor(['tomato', 'wheat']).map(([s]) => s), ['wash:tomato', 'cut:tomato', 'knead:wheat', 'roll:wheat', 'cut:wheat', 'fire', 'cook', 'plate']);
  assert.deepEqual(stepsFor(['tea', 'egg'], 'pot').map(([s, label]) => `${s}/${label}`), ['rinse:tea/洗茶叶', 'fire/点火', 'water/加水', 'boil/煮', 'serve/盛出来']);
  assert.deepEqual(stepsFor(['taro', 'rice'], 'pot').map(([s]) => s), ['wash:taro', 'cut:taro', 'rinse:rice', 'fire', 'water', 'boil', 'serve']);
  assert.equal(teaEggs(['tea', 'egg'], 'pot'), true);
  assert.equal(teaEggs(['tea', 'egg'], 'wok'), false);
  assert.equal(teaEggs(['egg'], 'pot'), false);
});

test('noodles, tea eggs and the rest are called what they are', () => {
  assert.equal(dishName(['wheat']), '炒面');
  assert.equal(dishName(['wheat', 'egg']), '鸡蛋炒面');
  assert.equal(dishName(['greens', 'wheat']), '青菜炒面');
  assert.equal(dishName(['tomato', 'wheat', 'egg']), '番茄鸡蛋炒面');
  assert.equal(dishName(['greens', 'bamboo', 'wheat']), '什锦炒面');
  assert.equal(dishName(['wheat'], 'pot'), '阳春面');
  assert.equal(dishName(['wheat', 'egg'], 'pot'), '鸡蛋面');
  assert.equal(dishName(['tomato', 'wheat', 'egg'], 'pot'), '番茄鸡蛋面');
  assert.equal(dishName(['greens', 'wheat'], 'pot'), '青菜面');
  assert.equal(dishName(['tea', 'egg'], 'pot'), '茶叶蛋');
  assert.equal(dishName(['tea'], 'pot'), '清茶');
  assert.equal(dishName(['tea', 'greens'], 'pot'), '茶香青菜汤');
  assert.equal(dishName(['tea', 'rice'], 'pot'), '茶粥');
  assert.equal(dishName(['wheat', 'rice'], 'pot'), '麦仁粥');
  assert.equal(dishName(['taro', 'rice'], 'pot'), '芋头粥');
  assert.equal(dishName(['taro']), '清炒芋头');
  assert.equal(dishName(['bamboo'], 'pot'), '笋汤');
  assert.equal(dishName(['taro'], 'wok', ['honey']), '蜜汁芋头');
  assert.equal(dishName(['pumpkin'], 'wok', ['pinenut']), '松仁南瓜');
  assert.equal(dishName(['pumpkin', 'egg'], 'wok', ['honey']), '南瓜炒蛋');
  assert.equal(dishName(['pumpkin', 'rice'], 'pot', ['honey']), '蜂蜜南瓜粥');
  assert.equal(dishName(['rice'], 'pot', ['walnut']), '核桃粥');
  assert.equal(dishName(['rice'], 'pot', ['pinenut', 'honey']), '蜂蜜粥');
});

test('honey and the nuts cost what they are, tea in the wok is turned away', () => {
  assert.deepEqual(produceOf({...freshDish(['pumpkin', 'rice'], 'pot'), extras: ['honey', 'scallion', 'walnut']}), ['pumpkin', 'honey', 'walnut']);
  assert.deepEqual(costOf({...freshDish(['wheat', 'egg']), extras: ['pinenut']}).produce, {wheat: 1, pinenut: 1});
  assert.ok(validDish({...freshDish(['taro', 'rice'], 'pot'), extras: ['honey', 'pinenut']}));
  assert.deepEqual(dishProblems({...freshDish(['tea']), name: '炒茶'}), ['茶叶得用小锅煮']);
  assert.deepEqual(dishRecipe({...freshDish(['tea', 'egg'], 'pot')}), {kind: 'dish', v: 1, items: ['tea', 'egg'], method: 'pot', name: '茶叶蛋'});
});

test('what is short says where going out finds it', () => {
  const none = stockOf(homeWith({}));
  assert.equal(short(none, costOf(freshDish(['bamboo']))).words, '还没有笋，出门去茶山上找一找。');
  assert.equal(short(none, costOf({...freshDish(['rice'], 'pot'), extras: ['walnut']})).words, '还没有核桃，出门去林子深处找一找。');
  assert.equal(short(none, costOf(freshDish(['taro']))).words, '还没有芋头，出门去田里找一找。');
});

test('the backpack lists them with their pictures and where they came from', () => {
  const stock = stockOf(homeWith({'field:taro': 1, 'woods:honeycomb': 1}));
  const rows = pantryOf(stock);
  const taro = rows.find(r => r.id === 'taro'), honey = rows.find(r => r.id === 'honey');
  assert.equal(taro.name, '芋头');
  assert.equal(taro.art, '/explore/field/find-taro-root.webp');
  assert.equal(taro.where, '田里');
  assert.equal(honey.left, 3);
  assert.equal(honey.where, '林子里');
  assert.equal(honey.art, '/explore/woods/find-honeycomb.webp');
  assert.ok(!rows.some(r => r.id === 'walnut'), 'only what has been brought home');
});

test('what they taste like', () => {
  assert.equal(dishTaste(freshDish(['tea', 'egg'], 'pot')), '茶叶蛋煮得透透的，蛋白上一道一道茶色的花纹，剥开满是茶香。');
  assert.equal(dishTaste(freshDish(['tomato', 'wheat', 'egg'], 'pot')), '番茄鸡蛋面，汤酸酸甜甜的，面条吸饱了汤汁。');
  assert.equal(dishTaste({...freshDish(['pumpkin', 'rice'], 'pot'), extras: ['honey']}), '南瓜熬化在粥里，黄澄澄的，甜得刚刚好。淋了一圈蜂蜜，甜丝丝的。');
  assert.equal(dishTaste({...freshDish(['taro']), extras: ['honey'], heat: 'browned'}), '芋头粉粉糯糯的。多炒了一会儿，边上有点焦香。淋了一圈蜂蜜，甜丝丝的。');
  assert.equal(dishTaste(freshDish(['wheat', 'egg'])), '面条裹着碎碎的蛋，香喷喷的。');
});
