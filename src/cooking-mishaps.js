// Now and then something at the stove goes its own way: a tomato squirts as it is cut, a pea springs out of its
// pod and rolls off, hot oil spits when the first washed thing goes in, a toss of a hot wok catches fire for a
// moment, the pot boils over. None of it is a mistake and nothing is graded: it is how that plate went. It stays on the dish, a word
// each in the order they happened (`mishaps`), and is said again on its page when it is eaten.
//
// The chances are kind, like the eggs that break in the dessert kitchen: each can happen at most once a dish, and
// at most two of them a dish in all.

export const MISHAPS = {
  juice: {say: '噗——番茄爆汁啦，溅了一台面', words: '番茄爆了一台面汁', taste: '切番茄的时候爆了一台面汁，酸甜都还在菜里。'},
  pea: {say: '一颗豌豆蹦出去，骨碌碌滚走了', words: '蹦走了一颗豌豆', taste: '有一颗豌豆半路蹦走了，剩下的都乖乖在盘子里。'},
  splatter: {say: '滋啦——油星溅出来了，往后躲一躲', words: '下锅溅了一下油星', taste: '下锅的时候滋啦溅了一下油，香味一下子就出来了。'},
  flame: {say: '呼——锅里腾地起了一下火！锅气这下足了', words: '颠锅腾起了一下火', taste: '颠锅的时候腾起一下火，锅气足足的。'},
  boilover: {say: '呲——溢锅啦！快搅一搅', words: '中间溢了一下锅', taste: '中间溢了一下锅，扑出去的那一点就当敬灶王爷了。'}
};
export const MISHAP_IDS = Object.keys(MISHAPS);
export const MISHAPS_MAX = 2;
// How likely each one is when its moment comes: a tomato being cut, peas being shelled, the first washed thing
// going into the oil, a hot wok being tossed, the pot at a rolling boil with something in it.
export const CHANCES = {juice: .3, pea: .35, splatter: .3, flame: .25, boilover: .3};

const listOf = had => (Array.isArray(had) ? had : []);
// Whether `id` happens now, given what has already happened to this dish (`had`).
export function mayHappen(id, had = [], rand = Math.random) {
  const list = listOf(had);
  if (!Object.hasOwn(MISHAPS, id) || list.includes(id) || list.length >= MISHAPS_MAX) return false;
  return rand() < CHANCES[id];
}
// Which of n taps it comes on: never the first when there are more (the first chop, the first toss, is plain).
export function whichTap(n, rand = Math.random) {
  if (!(Number.isInteger(n) && n > 1)) return 1;
  return 2 + Math.min(n - 2, Math.floor(rand() * (n - 1)));
}
// Which of n pods a pea springs out of: any of them.
export function whichPod(n, rand = Math.random) {
  if (!(Number.isInteger(n) && n > 0)) return 0;
  return Math.min(n - 1, Math.floor(rand() * n));
}

export const validMishaps = list => Array.isArray(list) && list.length <= MISHAPS_MAX && list.every(id => typeof id === 'string' && Object.hasOwn(MISHAPS, id)) && new Set(list).size === list.length;
// What happened, in a few words each (for the card when the dish is done), and on its page when it is eaten.
export const mishapWords = list => (validMishaps(list) ? list : []).map(id => MISHAPS[id].words);
export const mishapTaste = list => (validMishaps(list) ? list : []).map(id => MISHAPS[id].taste).join('');
