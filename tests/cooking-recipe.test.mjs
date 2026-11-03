import test from 'node:test';
import assert from 'node:assert/strict';
import {INGREDIENTS, MAINS, stepsFor, dishName, freshDish, normalizeDish, dishProblems, validDish, dishRecipe, heatOf, heatAfter, dishWords, produceOf, dishTaste, COOKED, BROWNING, CATCHING} from '../src/cooking-recipe.js';

test('the steps follow what is on the counter: each thing washed then cut or shelled, eggs beaten, then the fire', () => {
  assert.deepEqual(stepsFor(['tomato', 'egg']).map(([s]) => s), ['wash:tomato', 'cut:tomato', 'egg', 'whisk', 'fire', 'cook', 'plate']);
  assert.deepEqual(stepsFor(['egg', 'greens']).map(([s]) => s), ['wash:greens', 'cut:greens', 'egg', 'whisk', 'fire', 'cook', 'plate']);
  assert.deepEqual(stepsFor(['pea', 'pumpkin']).map(([s]) => s), ['wash:pea', 'shell:pea', 'wash:pumpkin', 'cut:pumpkin', 'fire', 'cook', 'plate']);
  assert.deepEqual(stepsFor(['egg']).map(([s]) => s), ['egg', 'whisk', 'fire', 'cook', 'plate']);
  for (const id of MAINS) assert.ok(INGREDIENTS[id].name && ['cut', 'shell', 'beat'].includes(INGREDIENTS[id].prep), id);
});

test('a dish is called after what went in', () => {
  assert.equal(dishName(['tomato', 'egg']), '番茄炒蛋');
  assert.equal(dishName(['egg', 'tomato']), '番茄炒蛋');
  assert.equal(dishName(['greens']), '清炒青菜');
  assert.equal(dishName(['greens', 'egg']), '青菜炒蛋');
  assert.equal(dishName(['pea', 'egg']), '豌豆炒蛋');
  assert.equal(dishName(['egg']), '炒鸡蛋');
  assert.equal(dishName(['tomato']), '炒番茄');
  assert.equal(dishName(['tomato', 'greens']), '番茄炒青菜');
  assert.equal(dishName(['pumpkin', 'pea', 'egg']), '家常小炒');
  assert.equal(dishName([]), '家常小炒');
});

test('how long it was on the fire and how many cuts are said only when they went their own way', () => {
  assert.equal(heatAfter(0), 'tender');
  assert.equal(heatAfter(COOKED), 'just');
  assert.equal(heatAfter(BROWNING), 'browned');
  assert.equal(heatAfter(CATCHING + 5), 'caught');
  assert.equal(heatOf(freshDish()), 'just');
  assert.deepEqual(dishRecipe({...freshDish(['egg', 'tomato']), extras: ['scallion'], heat: 'caught', cuts: {tomato: 4}, note: '给你的', by: {kind: 'self'}, madeOn: '2026-11-02'}),
    {kind: 'dish', v: 1, items: ['egg', 'tomato'], extras: ['scallion'], name: '番茄炒蛋', heat: 'caught'});
  assert.deepEqual(dishRecipe({...freshDish(['greens']), cuts: {greens: 3}}), {kind: 'dish', v: 1, items: ['greens'], name: '清炒青菜', cuts: {greens: 3}});
  assert.equal(dishWords({...freshDish(), heat: 'tender'}), '番茄炒蛋 · 火候嫩嫩的');
  assert.deepEqual(produceOf(freshDish(['pumpkin', 'egg', 'pea'])), ['pumpkin', 'pea']);
});

test('what it tasted like', () => {
  assert.match(dishTaste(freshDish(['egg', 'tomato'])), /^酸酸甜甜的/);
  assert.equal(dishTaste({...freshDish(['greens']), heat: 'tender'}, {hour: 2}), '脆生生的，清清爽爽，一口一股锅气。起锅起得早，嫩嫩的。半夜一起吃的，比白天香。');
  assert.equal(dishTaste(freshDish(['pumpkin', 'pea']), {hour: 19}), '南瓜面面的、甜甜的，豌豆一粒一粒都是甜的。一起吃的晚饭。');
});

test('what can not be kept says why', () => {
  assert.deepEqual(dishProblems(null), ['这不是一道菜']);
  assert.deepEqual(dishProblems({kind: 'dessert'}), ['这不是一道菜']);
  for (const items of [[], ['lobster'], ['egg', 'egg'], ['tomato', 'greens', 'pumpkin', 'pea', 'egg']]) assert.ok(dishProblems({...freshDish(), items}).includes('锅里下的东西写得不对'), String(items));
  assert.ok(dishProblems({...freshDish(), extras: ['chilli']}).includes('锅里下的东西写得不对'));
  assert.ok(dishProblems({...freshDish(), name: '  '}).includes('给它起个名字'));
  assert.ok(dishProblems({...freshDish(), heat: 'raw'}).includes('火候写得不对'));
  assert.ok(dishProblems({...freshDish(), cuts: {tomato: 99}}).includes('切了几刀写得不对'));
  assert.ok(dishProblems({...freshDish(), cuts: {egg: 2}}).includes('切了几刀写得不对'));
  assert.ok(dishProblems({...freshDish(), madeOn: 'yesterday'}).includes('日子写得不对'));
  assert.ok(dishProblems({...freshDish(), by: {kind: 'guest'}}).includes('要写上是谁做的'));
  assert.ok(validDish({...freshDish(['pea', 'pumpkin', 'egg']), extras: ['garlic', 'scallion']}));
  // An older draft with something missing is filled in, not thrown away.
  assert.equal(normalizeDish({kind: 'dish'}).name, '番茄炒蛋');
});
