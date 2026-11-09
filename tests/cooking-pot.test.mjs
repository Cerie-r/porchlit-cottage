import test from 'node:test';
import assert from 'node:assert/strict';
import {INGREDIENTS, MAINS, METHODS, methodOf, stepsFor, dishName, freshDish, dishProblems, validDish, dishRecipe, dishTaste, dishWords, heatWords, potHeatAfter, POT_TIMES, mishapsFor, produceOf} from '../src/cooking-recipe.js';
import {costOf} from '../src/bench-stock.js';

test('rice is in the kitchen always, for the pot only', () => {
  assert.ok(MAINS.includes('rice'));
  assert.equal(INGREDIENTS.rice.staple, true);
  assert.equal(INGREDIENTS.rice.pot, true);
  assert.deepEqual(METHODS, ['wok', 'pot']);
  assert.equal(methodOf({}), 'wok');
  assert.equal(methodOf({method: 'pot'}), 'pot');
  assert.equal(methodOf({method: 'oven'}), 'wok');
});

test('in the pot: things washed and cut, rice rinsed, eggs beaten, then the fire, the water, the pot and the bowl', () => {
  assert.deepEqual(stepsFor(['tomato', 'egg'], 'pot').map(([s]) => s), ['wash:tomato', 'cut:tomato', 'egg', 'whisk', 'fire', 'water', 'boil', 'serve']);
  assert.deepEqual(stepsFor(['rice', 'pumpkin'], 'pot').map(([s]) => s), ['wash:pumpkin', 'cut:pumpkin', 'rinse:rice', 'fire', 'water', 'boil', 'serve']);
  assert.deepEqual(stepsFor(['rice'], 'pot').map(([s, label]) => label), ['淘米', '点火', '加水', '煮', '盛出来']);
  // The wok is as it was.
  assert.deepEqual(stepsFor(['tomato', 'egg']).map(([s]) => s), ['wash:tomato', 'cut:tomato', 'egg', 'whisk', 'fire', 'cook', 'plate']);
});

test('a pot dish is called a soup, or with rice a porridge', () => {
  assert.equal(dishName(['tomato', 'egg'], 'pot'), '番茄蛋汤');
  assert.equal(dishName(['egg', 'greens'], 'pot'), '青菜蛋汤');
  assert.equal(dishName(['greens'], 'pot'), '青菜汤');
  assert.equal(dishName(['egg'], 'pot'), '蛋花汤');
  assert.equal(dishName(['tomato', 'greens'], 'pot'), '番茄青菜汤');
  assert.equal(dishName(['tomato', 'greens', 'pea'], 'pot'), '家常杂烩汤');
  assert.equal(dishName(['rice'], 'pot'), '白粥');
  assert.equal(dishName(['rice', 'egg'], 'pot'), '鸡蛋粥');
  assert.equal(dishName(['pumpkin', 'rice'], 'pot'), '南瓜粥');
  assert.equal(dishName(['rice', 'pumpkin', 'egg'], 'pot'), '南瓜粥');
  assert.equal(dishName(['rice', 'pumpkin', 'greens'], 'pot'), '什锦粥');
  assert.equal(dishName([], 'pot'), '家常杂烩汤');
  assert.equal(dishName(['tomato', 'egg']), '番茄炒蛋');
});

test('a pot takes longer than the wok, a porridge longest', () => {
  const [a, b, c] = POT_TIMES.soup, [pa, pb, pc] = POT_TIMES.porridge;
  assert.ok(a < b && b < c && pa > a && pb > b && pc > c);
  assert.equal(potHeatAfter(0), 'tender');
  assert.equal(potHeatAfter(a), 'just');
  assert.equal(potHeatAfter(b), 'browned');
  assert.equal(potHeatAfter(c), 'caught');
  assert.equal(potHeatAfter(a, true), 'tender');
  assert.equal(potHeatAfter(pa, true), 'just');
  assert.equal(potHeatAfter(pc + 1, true), 'caught');
});

test('how it came off the fire is said the pot way for the pot', () => {
  assert.equal(heatWords(freshDish(['tomato', 'egg'])), '火候正好');
  assert.equal(heatWords({...freshDish(['tomato', 'egg']), heat: 'browned'}), '多炒了一会儿，焦香焦香的');
  assert.equal(heatWords({...freshDish(['tomato', 'egg'], 'pot'), heat: 'browned'}), '多炖了一会儿，汤更浓了');
  assert.equal(heatWords({...freshDish(['rice'], 'pot'), heat: 'caught'}), '锅底有点糊了，糊香也是香');
  assert.equal(heatWords(freshDish(['rice'], 'pot')), '米熬开了花，火候正好');
  assert.equal(dishWords({...freshDish(['greens'], 'pot'), heat: 'tender'}), '青菜汤 · 火候短，清清爽爽的');
});

test('a pot dish keeps the pot in its recipe; a wok dish says nothing of it', () => {
  const soup = {...freshDish(['tomato', 'egg'], 'pot'), heat: 'browned', by: {kind: 'self'}};
  assert.ok(validDish(soup));
  assert.deepEqual(dishRecipe(soup), {kind: 'dish', v: 1, items: ['tomato', 'egg'], method: 'pot', name: '番茄蛋汤', heat: 'browned'});
  assert.deepEqual(dishRecipe(freshDish(['tomato', 'egg'])), {kind: 'dish', v: 1, items: ['tomato', 'egg'], name: '番茄炒蛋'});
  assert.deepEqual(dishRecipe({...freshDish(['tomato', 'egg']), method: 'wok'}), {kind: 'dish', v: 1, items: ['tomato', 'egg'], name: '番茄炒蛋'});
  assert.ok(validDish({...freshDish(['rice', 'pumpkin'], 'pot'), extras: ['scallion'], mishaps: ['boilover']}));
});

test('rice in the wok, or a pot that is not one, is turned away', () => {
  assert.deepEqual(dishProblems({...freshDish(['rice']), name: '炒米'}), ['米得用小锅熬粥']);
  assert.deepEqual(dishProblems({...freshDish(['tomato'], 'pot'), method: 'oven'}), ['用什么锅写得不对']);
  assert.deepEqual(dishProblems({...freshDish(['tomato'], 'pot'), mishaps: ['flame']}), ['锅边的小意外写得不对']);
  assert.deepEqual(dishProblems({...freshDish(['tomato']), mishaps: ['boilover']}), ['锅边的小意外写得不对']);
});

test('what went its own way fits the way it was cooked', () => {
  assert.deepEqual(mishapsFor(['juice', 'boilover'], ['tomato', 'egg'], 'pot'), ['juice', 'boilover']);
  assert.deepEqual(mishapsFor(['splatter', 'flame'], ['greens'], 'pot'), []);
  assert.deepEqual(mishapsFor(['boilover'], ['greens'], 'wok'), []);
  assert.deepEqual(mishapsFor(['boilover'], ['greens']), []);
});

test('what a soup or a porridge tasted like', () => {
  assert.equal(dishTaste(freshDish(['tomato', 'egg'], 'pot')), '酸酸甜甜的番茄蛋汤，蛋花一缕一缕的，喝一口暖到肚子里。');
  assert.equal(dishTaste(freshDish(['egg', 'tomato'], 'pot')), '酸酸甜甜的番茄蛋汤，蛋花一缕一缕的，喝一口暖到肚子里。');
  assert.equal(dishTaste({...freshDish(['rice', 'pumpkin'], 'pot'), heat: 'browned'}, {hour: 1}), '南瓜熬化在粥里，黄澄澄的，甜得刚刚好。熬得浓浓稠稠的。半夜一起吃的，比白天香。');
  assert.equal(dishTaste({...freshDish(['rice'], 'pot'), mishaps: ['boilover']}), '一碗白粥，米熬开了花，清清淡淡的，最养胃。中间溢了一下锅，扑出去的那一点就当敬灶王爷了。');
  assert.equal(dishTaste({...freshDish(['pea', 'greens'], 'pot'), heat: 'caught'}), '豌豆一粒一粒浮在上面，青菜烫得碧绿。熬得太久，汤只剩浅浅一层了。');
  // A wok dish tastes as it always did.
  assert.equal(dishTaste(freshDish(['tomato', 'egg'])), '酸酸甜甜的，汤汁拌饭能吃两碗。');
});

test('rice costs nothing from going out; what came in from the fields is used as ever', () => {
  assert.deepEqual(produceOf(freshDish(['rice', 'pumpkin'], 'pot')), ['pumpkin']);
  assert.deepEqual(produceOf(freshDish(['rice'], 'pot')), []);
  const cost = costOf({...freshDish(['rice', 'pumpkin'], 'pot')});
  assert.deepEqual(cost.produce, {pumpkin: 1});
});

test('a pot dish is eaten from the dome like any dish, and the diary says it was simmered', async () => {
  const {loadDessertState, bookEntry} = await import('../src/dessert-state.js');
  const {diaryDays} = await import('../src/diary-days.js');
  const soup = {...freshDish(['tomato', 'egg'], 'pot'), id: 's', location: 'bag', slot: 0, by: {kind: 'self'}, madeOn: '2026-11-07'};
  const page = bookEntry(soup, '2026-11-07', {hour: 19});
  assert.equal(page.recipe.method, 'pot');
  assert.match(page.taste, /番茄蛋汤.*一起吃的晚饭。$/);
  const loaded = loadDessertState({dessertBook: [page]});
  assert.equal(loaded.dessertBook[0].recipe.method, 'pot');
  const lines = diaryDays({dessertBook: loaded.dessertBook}, {him: '他'}).flatMap(d => d.lines.map(l => l.text));
  assert.ok(lines.includes('煮了一锅番茄蛋汤'), lines.join(' | '));
  assert.ok(lines.some(l => l.startsWith('和他一起吃了番茄蛋汤')), lines.join(' | '));
});
