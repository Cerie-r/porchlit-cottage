import test from 'node:test';
import assert from 'node:assert/strict';
import {MISHAPS, MISHAP_IDS, MISHAPS_MAX, CHANCES, mayHappen, whichTap, whichPod, validMishaps, mishapWords, mishapTaste} from '../src/cooking-mishaps.js';
import {freshDish, dishProblems, validDish, dishRecipe, dishTaste, mishapsFor} from '../src/cooking-recipe.js';

const always = () => 0, never = () => .999;

test('each little accident has its words, and its chance is a chance', () => {
  assert.deepEqual(MISHAP_IDS, ['juice', 'pea', 'splatter', 'flame', 'boilover']);
  for (const id of MISHAP_IDS) {
    assert.ok(MISHAPS[id].say && MISHAPS[id].words && MISHAPS[id].taste, id);
    assert.ok(CHANCES[id] > 0 && CHANCES[id] < .5, id);
  }
});

test('the chances are kind: each at most once a dish, at most two in all, and never something unknown', () => {
  assert.equal(mayHappen('juice', [], always), true);
  assert.equal(mayHappen('juice', [], never), false);
  assert.equal(mayHappen('juice', ['juice'], always), false);
  assert.equal(mayHappen('flame', ['juice'], always), true);
  assert.equal(MISHAPS_MAX, 2);
  assert.equal(mayHappen('flame', ['juice', 'splatter'], always), false);
  assert.equal(mayHappen('smoke', [], always), false);
  assert.equal(mayHappen('toString', [], always), false);
  assert.equal(mayHappen('pea', null, always), true);
  // Right at the edge of its chance it doesn't happen; just under, it does.
  assert.equal(mayHappen('pea', [], () => CHANCES.pea), false);
  assert.equal(mayHappen('pea', [], () => CHANCES.pea - .001), true);
});

test('it never comes on the first chop or toss when there are more, and any pod can lose a pea', () => {
  const taps = new Set(), pods = new Set();
  for (let i = 0; i < 100; i++) {taps.add(whichTap(4, () => i / 100)); pods.add(whichPod(3, () => i / 100));}
  assert.deepEqual([...taps].sort(), [2, 3, 4]);
  assert.deepEqual([...pods].sort(), [0, 1, 2]);
  assert.equal(whichTap(4, () => .9999), 4);
  assert.equal(whichTap(1), 1);
  assert.equal(whichTap(0), 1);
  assert.equal(whichPod(0), 0);
});

test('what happened is a short list of known words, each once', () => {
  assert.ok(validMishaps([]));
  assert.ok(validMishaps(['juice']));
  assert.ok(validMishaps(['juice', 'flame']));
  assert.ok(!validMishaps(['juice', 'flame', 'splatter']));
  assert.ok(!validMishaps(['juice', 'juice']));
  assert.ok(!validMishaps(['smoke']));
  assert.ok(!validMishaps(['__proto__']));
  assert.ok(!validMishaps('juice'));
  assert.ok(!validMishaps([1]));
  assert.deepEqual(mishapWords(['pea', 'flame']), ['蹦走了一颗豌豆', '颠锅腾起了一下火']);
  assert.deepEqual(mishapWords(['smoke']), []);
  assert.equal(mishapTaste(['juice', 'nonsense']), '');
});

test('a dish keeps only what fits what went into the wok', () => {
  assert.deepEqual(mishapsFor(['juice', 'flame'], ['tomato', 'egg']), ['juice', 'flame']);
  assert.deepEqual(mishapsFor(['juice', 'flame'], ['egg']), ['flame']);
  assert.deepEqual(mishapsFor(['pea'], ['tomato']), []);
  assert.deepEqual(mishapsFor(['splatter'], ['egg']), []);
  assert.deepEqual(mishapsFor(['splatter'], ['greens', 'egg']), ['splatter']);
  assert.deepEqual(mishapsFor(['juice', 'juice'], ['tomato']), []);
  assert.deepEqual(mishapsFor(undefined, ['tomato']), []);
});

test('a dish with its accidents is kept, and one that says what could not have happened is turned away', () => {
  const ok = {...freshDish(['tomato', 'egg']), mishaps: ['juice', 'flame'], by: {kind: 'self'}};
  assert.ok(validDish(ok));
  assert.ok(validDish({...freshDish(['greens']), mishaps: ['splatter']}));
  assert.ok(validDish({...freshDish(['egg']), mishaps: ['flame']}));
  assert.ok(validDish({...freshDish(['tomato']), mishaps: []}));
  for (const bad of [
    {...freshDish(['egg']), mishaps: ['juice']},
    {...freshDish(['tomato']), mishaps: ['pea']},
    {...freshDish(['egg']), mishaps: ['splatter']},
    {...freshDish(['tomato', 'pea']), mishaps: ['juice', 'pea', 'flame']},
    {...freshDish(['tomato']), mishaps: ['juice', 'juice']},
    {...freshDish(['tomato']), mishaps: 'juice'},
    {...freshDish(['tomato']), mishaps: ['smoke']}
  ]) assert.deepEqual(dishProblems(bad), ['锅边的小意外写得不对'], JSON.stringify(bad.mishaps));
});

test('the recipe carries them, and nothing when nothing happened', () => {
  assert.deepEqual(dishRecipe({...freshDish(['tomato', 'egg']), mishaps: ['juice'], note: '给你的'}), {kind: 'dish', v: 1, items: ['tomato', 'egg'], name: '番茄炒蛋', mishaps: ['juice']});
  assert.deepEqual(dishRecipe({...freshDish(['tomato', 'egg']), mishaps: []}), {kind: 'dish', v: 1, items: ['tomato', 'egg'], name: '番茄炒蛋'});
  assert.deepEqual(dishRecipe({...freshDish(['tomato', 'egg']), mishaps: ['smoke']}), {kind: 'dish', v: 1, items: ['tomato', 'egg'], name: '番茄炒蛋'});
});

test('what it tasted like says what happened, after the fire and before the time of day', () => {
  assert.equal(dishTaste({...freshDish(['greens']), heat: 'tender', mishaps: ['splatter', 'flame']}, {hour: 2}),
    '脆生生的，清清爽爽，一口一股锅气。起锅起得早，嫩嫩的。下锅的时候滋啦溅了一下油，香味一下子就出来了。颠锅的时候腾起一下火，锅气足足的。半夜一起吃的，比白天香。');
  assert.equal(dishTaste({...freshDish(['tomato', 'egg']), mishaps: ['juice']}), '酸酸甜甜的，汤汁拌饭能吃两碗。切番茄的时候爆了一台面汁，酸甜都还在菜里。');
  // What doesn't fit the dish isn't said.
  assert.equal(dishTaste({...freshDish(['egg']), mishaps: ['juice']}), '蛋香香的。');
  // Old dishes, with nothing written, taste as they always did.
  assert.equal(dishTaste(freshDish(['tomato', 'egg'])), '酸酸甜甜的，汤汁拌饭能吃两碗。');
});
