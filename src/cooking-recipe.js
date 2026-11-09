import {isDay, MAKERS, NAME_MAX, NOTE_MAX} from './dessert-recipe.js';
import {validMishaps, mishapTaste} from './cooking-mishaps.js';

// A dish cooked at the stove. Nothing is picked off a menu: what is put on the counter is what gets cooked, in the
// order it goes into the wok or the pot, and the dish is called after what went in (a name that can be changed).
// It keeps what went in, whether spring onion or garlic did too, how many cuts the hands made where that differs,
// and how long it was on the fire. Like a dessert it is a few lines of words, never a picture.
//
// Two ways to cook it: stir-fried in the wok on the left ring (the first way, and a dish that says nothing about it
// was cooked so), or simmered in the little pot on the right (`method: 'pot'`): a soup, or with rice a porridge.
//
// What comes in from going out (src/bench-stock.js, PRODUCE) is used up, one find a dish; eggs, rice, spring onion,
// garlic, oil and salt the kitchen always has. Nothing is graded: greens that caught a little are just how that
// plate turned out.

// What can go in, and how each is got ready on the counter: washed and cut (cuts: how many), washed and shelled
// (pods), cracked and beaten, rinsed (rice and tea, for the pot only), or for wheat kneaded, rolled out and cut into
// noodles. `from`: where going out finds it, for the backpack.
export const INGREDIENTS = {
  tomato: {name: '番茄', produce: 'tomato', prep: 'cut', cuts: 4},
  greens: {name: '青菜', produce: 'greens', prep: 'cut', cuts: 2},
  pumpkin: {name: '南瓜', produce: 'pumpkin', prep: 'cut', cuts: 3},
  pea: {name: '豌豆', produce: 'pea', prep: 'shell', pods: 3},
  egg: {name: '鸡蛋', staple: true, prep: 'beat'},
  rice: {name: '米', staple: true, prep: 'rinse', pot: true},
  taro: {name: '芋头', produce: 'taro', prep: 'cut', cuts: 3},
  bamboo: {name: '笋', produce: 'bamboo', prep: 'cut', cuts: 3},
  wheat: {name: '面', produce: 'wheat', prep: 'dough', cuts: 4},
  tea: {name: '茶叶', produce: 'tea', prep: 'rinse', pot: true}
};
export const MAINS = Object.keys(INGREDIENTS);
// What can be thrown in besides, for the look and the taste. Spring onion and garlic the kitchen always has; honey,
// walnuts and pine nuts come in from going out (EXTRA_PRODUCE) and are used up like what came in from the fields.
// Salt goes in every time and isn't seen.
export const EXTRAS = {scallion: '葱花', garlic: '蒜末', honey: '蜂蜜', walnut: '核桃碎', pinenut: '松子'};
export const EXTRA_PRODUCE = {honey: 'honey', walnut: 'walnut', pinenut: 'pinenut'};
// How each goes in: honey is drizzled, the rest sprinkled.
export const extraVerb = id => id === 'honey' ? '淋' : '撒';
export const ITEMS_MAX = 4;
export const METHODS = ['wok', 'pot'];
export const methodOf = item => item?.method === 'pot' ? 'pot' : 'wok';
const veg = id => INGREDIENTS[id] && !INGREDIENTS[id].staple;
const porridge = items => Array.isArray(items) && items.includes('rice');
// Eggs boiled whole with tea in the pot (茶叶蛋), not beaten.
export const teaEggs = (items, method) => method === 'pot' && Array.isArray(items) && items.includes('tea') && items.includes('egg');
// What went its own way at the stove (src/cooking-mishaps.js) only counts for what went in and how: a tomato's
// juice needs the tomato in the dish, a runaway pea the peas, spitting oil something washed going into the wok, a
// flare the wok, a boil-over the pot.
const NEEDS = {juice: items => items.includes('tomato'), pea: items => items.includes('pea'), splatter: (items, m) => m === 'wok' && items.some(veg), flame: (items, m) => m === 'wok', boilover: (items, m) => m === 'pot'};
export function mishapsFor(list, items, method = 'wok') {
  const got = Array.isArray(items) ? items : [];
  return (validMishaps(list) ? list : []).filter(id => !NEEDS[id] || NEEDS[id](got, method));
}

// The steps, from what is on the counter: each thing from the fields washed and then cut (or shelled) in the order
// it was put there, the rice rinsed, the eggs cracked and beaten, then the fire and the wok and the plate, or the
// fire, the water, the pot and the bowl.
export function stepsFor(items, method = 'wok') {
  const out = [];
  for (const id of items.filter(veg)) {
    const i = INGREDIENTS[id];
    if (i.prep === 'dough') out.push([`knead:${id}`, '揉面'], [`roll:${id}`, '擀面'], [`cut:${id}`, '切面']);
    else if (i.prep === 'rinse') out.push([`rinse:${id}`, `洗${i.name}`]);
    else out.push([`wash:${id}`, `洗${i.name}`], i.prep === 'shell' ? [`shell:${id}`, `剥${i.name}`] : [`cut:${id}`, `切${i.name}`]);
  }
  if (method === 'pot' && items.includes('rice')) out.push(['rinse:rice', '淘米']);
  if (items.includes('egg') && !teaEggs(items, method)) out.push(['egg', '打蛋'], ['whisk', '搅蛋']);
  if (method === 'pot') out.push(['fire', '点火'], ['water', '加水'], ['boil', '煮'], ['serve', '盛出来']);
  else out.push(['fire', '点火'], ['cook', '炒'], ['plate', '装盘']);
  return out;
}

// A dish is called after what went in. In the wok: an egg and one more thing is that thing 炒蛋; one thing alone
// is 清炒 it (炒番茄, 炒鸡蛋), or with honey or pine nuts 蜜汁 or 松仁 it; two things are the first 炒 the second; more
// than that is 家常小炒; noodles are 炒面 (鸡蛋炒面, 青菜炒面, 什锦炒面). In the pot, with rice it is a porridge (白粥,
// 鸡蛋粥, 南瓜粥, 麦仁粥, 茶粥, more than one thing 什锦粥, honey or nuts on top 蜂蜜南瓜粥, 核桃粥); with noodles a bowl
// of noodles (阳春面, 鸡蛋面, 番茄鸡蛋面, 什锦汤面); tea and eggs alone are 茶叶蛋, tea alone 清茶; otherwise a soup:
// 蛋花汤, 番茄汤, 番茄蛋汤, two things 番茄青菜汤, more than that 家常杂烩汤, with tea 茶香 it.
export function dishName(items = [], method = 'wok', extras = []) {
  const list = items.filter(id => INGREDIENTS[id]), egg = list.includes('egg'), n = id => INGREDIENTS[id].name, has = id => Array.isArray(extras) && extras.includes(id);
  if (method === 'pot') {
    const others = list.filter(id => !['egg', 'rice', 'tea', 'wheat'].includes(id)), tea = list.includes('tea'), wheat = list.includes('wheat');
    if (list.includes('rice')) {
      const grains = [...others, ...(wheat ? ['wheat'] : []), ...(tea ? ['tea'] : [])], g = id => ({wheat: '麦仁', tea: '茶'}[id] || n(id));
      const name = !grains.length ? (egg ? '鸡蛋粥' : '白粥') : grains.length === 1 ? `${g(grains[0])}粥` : '什锦粥';
      const top = has('honey') ? '蜂蜜' : has('walnut') ? '核桃' : has('pinenut') ? '松子' : '';
      return top ? top + (name === '白粥' ? '粥' : name) : name;
    }
    if (tea && !wheat && !others.length) return egg ? '茶叶蛋' : '清茶';
    const soup = wheat ? (!others.length ? (egg ? '鸡蛋面' : '阳春面') : others.length === 1 ? `${n(others[0])}${egg ? '鸡蛋' : ''}面` : '什锦汤面')
      : !others.length ? (egg ? '蛋花汤' : '家常杂烩汤') : others.length === 1 ? `${n(others[0])}${egg ? '蛋' : ''}汤` : others.length === 2 && !egg ? `${n(others[0])}${n(others[1])}汤` : '家常杂烩汤';
    return tea && !wheat ? `茶香${soup}` : soup;
  }
  if (list.includes('wheat')) {
    const others = list.filter(id => id !== 'egg' && id !== 'wheat');
    return !others.length ? (egg ? '鸡蛋炒面' : '炒面') : others.length === 1 ? `${n(others[0])}${egg ? '鸡蛋' : ''}炒面` : '什锦炒面';
  }
  const others = list.filter(id => id !== 'egg');
  if (!list.length) return '家常小炒';
  if (egg && others.length === 1) return `${n(others[0])}炒蛋`;
  if (egg && !others.length) return '炒鸡蛋';
  if (!egg && others.length === 1) return has('honey') ? `蜜汁${n(others[0])}` : has('pinenut') ? `松仁${n(others[0])}` : others[0] === 'tomato' ? '炒番茄' : `清炒${n(others[0])}`;
  if (!egg && others.length === 2) return `${n(others[0])}炒${n(others[1])}`;
  return '家常小炒';
}

// How long it was on the fire. Off early it is tender; left on it browns; too long and the bottom catches. Just
// right is how a dish looks when nothing is said, so a recipe that came out just right says nothing.
export const HEATS = ['tender', 'browned', 'caught'];
export const HEAT_WORDS = {tender: '火候嫩嫩的', just: '火候正好', browned: '多炒了一会儿，焦香焦香的', caught: '锅底有点糊了，糊的那一点最下饭'};
export const heatOf = item => HEATS.includes(item?.heat) ? item.heat : 'just';
// Seconds on the fire after the last thing went in: before COOKED it is tender, after BROWNING it browns, after
// CATCHING it catches.
export const COOKED = 3, BROWNING = 9, CATCHING = 15;
export const heatAfter = seconds => seconds < COOKED ? 'tender' : seconds < BROWNING ? 'just' : seconds < CATCHING ? 'browned' : 'caught';
// In the pot it all takes longer, a porridge longest: [tender before, thick after, too long after], in seconds after
// the last thing went in. A soup that simmers on thickens and boils down; a porridge thickens and catches.
export const POT_TIMES = {soup: [4, 13, 22], porridge: [6, 18, 30]};
export const potHeatAfter = (seconds, isPorridge = false) => {const [a, b, c] = POT_TIMES[isPorridge ? 'porridge' : 'soup']; return seconds < a ? 'tender' : seconds < b ? 'just' : seconds < c ? 'browned' : 'caught';};
export const POT_HEAT_WORDS = {
  soup: {tender: '火候短，清清爽爽的', just: '火候正好', browned: '多炖了一会儿，汤更浓了', caught: '熬得太久，汤快熬干了'},
  porridge: {tender: '米还有一点点硬芯', just: '米熬开了花，火候正好', browned: '熬得浓浓稠稠的', caught: '锅底有点糊了，糊香也是香'}
};
// How it came off the fire, in words, for either way of cooking.
export const heatWords = item => methodOf(item) === 'pot' ? POT_HEAT_WORDS[porridge(item?.items) ? 'porridge' : 'soup'][heatOf(item)] : HEAT_WORDS[heatOf(item)];
export const CUTS_MAX = 12;

export const freshDish = (items = ['tomato', 'egg'], method = 'wok') => ({kind: 'dish', v: 1, items: [...items], ...(method === 'pot' ? {method: 'pot'} : {}), name: dishName(items, method), note: ''});

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const validItems = list => Array.isArray(list) && list.length >= 1 && list.length <= ITEMS_MAX && list.every(id => MAINS.includes(id)) && new Set(list).size === list.length;
const validExtras = list => Array.isArray(list) && list.every(id => Object.hasOwn(EXTRAS, id)) && new Set(list).size === list.length;
const validCuts = c => plain(c) && Object.entries(c).every(([id, n]) => INGREDIENTS[id]?.prep === 'cut' && Number.isInteger(n) && n >= 1 && n <= CUTS_MAX);
// Fills in what is missing and keeps the rest; wrong values are left for dishProblems to turn away.
export function normalizeDish(item = {}) {
  const d = {...freshDish(), ...(plain(item) ? item : {})};
  d.kind = 'dish'; d.v = 1;
  if (typeof d.note !== 'string') d.note = '';
  return d;
}

function makerProblem(by) {
  if (by === undefined) return null;
  if (!plain(by) || !MAKERS.includes(by.kind)) return '不知道是谁做的';
  if (by.kind !== 'self' && (typeof by.name !== 'string' || !by.name.trim() || by.name.length > NAME_MAX)) return '要写上是谁做的';
  return null;
}
// Why a dish can't be kept, in words for whoever cooked it. Empty when it's fine.
export function dishProblems(item) {
  if (!plain(item) || item.kind !== 'dish') return ['这不是一道菜'];
  const d = normalizeDish(item), out = [], method = methodOf(d);
  if (!validItems(d.items)) out.push('锅里下的东西写得不对');
  if (d.method !== undefined && !METHODS.includes(d.method)) out.push('用什么锅写得不对');
  else if (method === 'wok' && Array.isArray(d.items) && d.items.some(id => INGREDIENTS[id]?.pot)) out.push(d.items.includes('rice') ? '米得用小锅熬粥' : '茶叶得用小锅煮');
  if (d.extras !== undefined && !validExtras(d.extras)) out.push('锅里下的东西写得不对');
  if (typeof d.name !== 'string' || !d.name.trim()) out.push('给它起个名字');
  else if (d.name.trim().length > NAME_MAX) out.push(`名字最多 ${NAME_MAX} 个字`);
  if (d.heat !== undefined && !HEATS.includes(d.heat)) out.push('火候写得不对');
  if (d.cuts !== undefined && !validCuts(d.cuts)) out.push('切了几刀写得不对');
  if (d.mishaps !== undefined && !(validMishaps(d.mishaps) && mishapsFor(d.mishaps, d.items, method).length === d.mishaps.length)) out.push('锅边的小意外写得不对');
  if (d.note.length > NOTE_MAX) out.push(`一句话最多 ${NOTE_MAX} 个字`);
  const maker = makerProblem(d.by);
  if (maker) out.push(maker);
  if (d.madeOn !== undefined && !isDay(d.madeOn)) out.push('日子写得不对');
  return [...new Set(out)];
}
export const validDish = item => dishProblems(item).length === 0;

// Just the recipe: what went in and in what order, the pot if it was the pot, its name, and how it went (only
// where it went its own way).
export function dishRecipe(item) {
  const d = normalizeDish(item), cuts = validCuts(d.cuts) ? Object.fromEntries(Object.entries(d.cuts).filter(([id, n]) => n !== INGREDIENTS[id].cuts)) : {};
  return {kind: 'dish', v: 1, items: [...d.items], ...(methodOf(d) === 'pot' ? {method: 'pot'} : {}), ...(validExtras(d.extras) && d.extras.length ? {extras: [...d.extras]} : {}), name: String(d.name).trim(), ...(HEATS.includes(d.heat) ? {heat: d.heat} : {}), ...(Object.keys(cuts).length ? {cuts} : {}), ...(validMishaps(d.mishaps) && d.mishaps.length ? {mishaps: [...d.mishaps]} : {})};
}
// What it was, in a few words: 番茄炒蛋 · 火候正好.
export const dishWords = item => `${normalizeDish(item).name} · ${heatWords(item)}`;
// What it took from going out: one of each thing from the fields that went in.
export const produceOf = item => [...(Array.isArray(item?.items) ? item.items : []).filter(veg).map(id => INGREDIENTS[id].produce), ...(Array.isArray(item?.extras) ? item.extras : []).filter(id => EXTRA_PRODUCE[id]).map(id => EXTRA_PRODUCE[id])];

// What it tasted like, printed on its page of the book when it is eaten: what went in, how it went, and when.
const TASTES = {tomato: '番茄酸酸甜甜的', greens: '青菜脆生生的', pumpkin: '南瓜面面的、甜甜的', pea: '豌豆一粒一粒都是甜的', egg: '蛋香香的', taro: '芋头粉粉糯糯的', bamboo: '笋片脆嫩脆嫩的', wheat: '面条筋道'};
const PAIRS = {'tomato+egg': '酸酸甜甜的，汤汁拌饭能吃两碗。', 'greens': '脆生生的，清清爽爽，一口一股锅气。', 'wheat+egg': '面条裹着碎碎的蛋，香喷喷的。', 'greens+wheat': '青菜炒面，面条筋道，一口一股锅气。'};
const POT_TASTES = {tomato: '番茄煮出了沙，汤红红的', greens: '青菜烫得碧绿', pumpkin: '南瓜煮得化开了，甜甜糯糯', pea: '豌豆一粒一粒浮在上面', egg: '蛋花一缕一缕的', rice: '米熬开了花', taro: '芋头煮得粉粉糯糯', bamboo: '笋片清清甜甜', wheat: '面条滑溜溜的', tea: '茶香淡淡的'};
const POT_PAIRS = {'tomato+egg': '酸酸甜甜的番茄蛋汤，蛋花一缕一缕的，喝一口暖到肚子里。', 'pumpkin+rice': '南瓜熬化在粥里，黄澄澄的，甜得刚刚好。', 'rice': '一碗白粥，米熬开了花，清清淡淡的，最养胃。', 'egg': '清清淡淡的蛋花汤，蛋花一缕一缕浮在上面。', 'greens': '青菜汤清清爽爽，青菜烫得碧绿。',
  'tea+egg': '茶叶蛋煮得透透的，蛋白上一道一道茶色的花纹，剥开满是茶香。', 'tea': '一锅清茶，淡淡的，暖暖的。', 'wheat': '一碗阳春面，清汤细面，撒点葱花就很香。', 'tomato+wheat+egg': '番茄鸡蛋面，汤酸酸甜甜的，面条吸饱了汤汁。', 'tea+rice': '一碗茶粥，米熬开了花，带着淡淡的茶香。', 'taro+rice': '芋头熬化在粥里，粉粉糯糯的。', 'wheat+rice': '麦仁粥，一粒一粒嚼着香。'};
const EXTRA_TASTES = {honey: '淋了一圈蜂蜜，甜丝丝的。', walnut: '撒了核桃碎，嚼着香香脆脆。', pinenut: '撒了一把松子，一口一颗香。'};
const POT_HEAT_LINES = {
  soup: {tender: '火候短，汤清清爽爽的。', browned: '多炖了一会儿，汤更浓了。', caught: '熬得太久，汤只剩浅浅一层了。'},
  porridge: {tender: '米还带一点点硬芯。', browned: '熬得浓浓稠稠的。', caught: '锅底有点糊了，糊香也是香。'}
};
// Things from the fields first, in the order they went in, then noodles and tea, then rice, then egg.
const rank = id => id === 'egg' ? 3 : id === 'rice' ? 2 : id === 'wheat' || id === 'tea' ? 1 : 0;
export function dishTaste(item, {hour} = {}) {
  const d = normalizeDish(item), method = methodOf(d), items = validItems(d.items) ? d.items : [], key = [...items].sort((a, b) => rank(a) - rank(b)).join('+'), heat = heatOf(d);
  const lines = [];
  if (method === 'pot') {
    lines.push(POT_PAIRS[key] || (items.map(id => POT_TASTES[id]).join('，') + '。'));
    const line = POT_HEAT_LINES[porridge(items) ? 'porridge' : 'soup'][heat];
    if (line) lines.push(line);
  } else {
    lines.push(PAIRS[key] || (items.map(id => TASTES[id]).join('，') + '。'));
    if (heat === 'caught') lines.push('锅底糊了一点，糊的那一点最下饭。');
    else if (heat === 'browned') lines.push('多炒了一会儿，边上有点焦香。');
    else if (heat === 'tender') lines.push('起锅起得早，嫩嫩的。');
  }
  for (const e of validExtras(d.extras) ? d.extras : []) if (EXTRA_TASTES[e]) lines.push(EXTRA_TASTES[e]);
  const happened = mishapTaste(mishapsFor(d.mishaps, items, method));
  if (happened) lines.push(happened);
  if (Number.isFinite(hour) && (hour >= 23 || hour < 4)) lines.push('半夜一起吃的，比白天香。');
  else if (Number.isFinite(hour) && hour >= 11 && hour < 14) lines.push('一起吃的午饭。');
  else if (Number.isFinite(hour) && hour >= 17 && hour < 21) lines.push('一起吃的晚饭。');
  return lines.join('');
}
