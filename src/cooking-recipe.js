import {isDay, MAKERS, NAME_MAX, NOTE_MAX} from './dessert-recipe.js';

// A dish cooked at the stove. Nothing is picked off a menu: what is put on the counter is what gets cooked, in the
// order it goes into the wok, and the dish is called after what went in (a name that can be changed). It keeps
// what went in, whether spring onion or garlic did too, how many cuts the hands made where that differs, and how
// long it was on the fire. Like a dessert it is a few lines of words, never a picture.
//
// What comes in from going out (src/bench-stock.js, PRODUCE) is used up, one find a dish; eggs, spring onion,
// garlic, oil and salt the kitchen always has. Nothing is graded: greens that caught a little are just how that
// plate turned out.

// What can go into the wok, and how each is got ready on the counter: washed and cut (cuts: how many), washed and
// shelled (pods), or cracked and beaten.
export const INGREDIENTS = {
  tomato: {name: '番茄', produce: 'tomato', prep: 'cut', cuts: 4},
  greens: {name: '青菜', produce: 'greens', prep: 'cut', cuts: 2},
  pumpkin: {name: '南瓜', produce: 'pumpkin', prep: 'cut', cuts: 3},
  pea: {name: '豌豆', produce: 'pea', prep: 'shell', pods: 3},
  egg: {name: '鸡蛋', staple: true, prep: 'beat'}
};
export const MAINS = Object.keys(INGREDIENTS);
// What can be thrown in besides, for the look and the taste: 葱花, 蒜末. Salt goes in every time and isn't seen.
export const EXTRAS = {scallion: '葱花', garlic: '蒜末'};
export const ITEMS_MAX = 4;
const veg = id => INGREDIENTS[id] && !INGREDIENTS[id].staple;

// The steps, from what is on the counter: each thing from the fields washed and then cut (or shelled) in the order
// it was put there, the eggs cracked and beaten, then the fire, the wok and the plate.
export function stepsFor(items) {
  const out = [];
  for (const id of items.filter(veg)) {
    const i = INGREDIENTS[id];
    out.push([`wash:${id}`, `洗${i.name}`], i.prep === 'shell' ? [`shell:${id}`, `剥${i.name}`] : [`cut:${id}`, `切${i.name}`]);
  }
  if (items.includes('egg')) out.push(['egg', '打蛋'], ['whisk', '搅蛋']);
  out.push(['fire', '点火'], ['cook', '炒'], ['plate', '装盘']);
  return out;
}

// A dish is called after what went in: an egg and one more thing is that thing 炒蛋; one thing alone is 清炒 it
// (炒番茄, 炒鸡蛋); two things are the first 炒 the second; more than that is 家常小炒.
export function dishName(items = []) {
  const list = items.filter(id => INGREDIENTS[id]), egg = list.includes('egg'), others = list.filter(id => id !== 'egg'), n = id => INGREDIENTS[id].name;
  if (!list.length) return '家常小炒';
  if (egg && others.length === 1) return `${n(others[0])}炒蛋`;
  if (egg && !others.length) return '炒鸡蛋';
  if (!egg && others.length === 1) return others[0] === 'tomato' ? '炒番茄' : `清炒${n(others[0])}`;
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
export const CUTS_MAX = 12;

export const freshDish = (items = ['tomato', 'egg']) => ({kind: 'dish', v: 1, items: [...items], name: dishName(items), note: ''});

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
  const d = normalizeDish(item), out = [];
  if (!validItems(d.items)) out.push('锅里下的东西写得不对');
  if (d.extras !== undefined && !validExtras(d.extras)) out.push('锅里下的东西写得不对');
  if (typeof d.name !== 'string' || !d.name.trim()) out.push('给它起个名字');
  else if (d.name.trim().length > NAME_MAX) out.push(`名字最多 ${NAME_MAX} 个字`);
  if (d.heat !== undefined && !HEATS.includes(d.heat)) out.push('火候写得不对');
  if (d.cuts !== undefined && !validCuts(d.cuts)) out.push('切了几刀写得不对');
  if (d.note.length > NOTE_MAX) out.push(`一句话最多 ${NOTE_MAX} 个字`);
  const maker = makerProblem(d.by);
  if (maker) out.push(maker);
  if (d.madeOn !== undefined && !isDay(d.madeOn)) out.push('日子写得不对');
  return [...new Set(out)];
}
export const validDish = item => dishProblems(item).length === 0;

// Just the recipe: what went in and in what order, its name, and how it went (only where it went its own way).
export function dishRecipe(item) {
  const d = normalizeDish(item), cuts = validCuts(d.cuts) ? Object.fromEntries(Object.entries(d.cuts).filter(([id, n]) => n !== INGREDIENTS[id].cuts)) : {};
  return {kind: 'dish', v: 1, items: [...d.items], ...(validExtras(d.extras) && d.extras.length ? {extras: [...d.extras]} : {}), name: String(d.name).trim(), ...(HEATS.includes(d.heat) ? {heat: d.heat} : {}), ...(Object.keys(cuts).length ? {cuts} : {})};
}
// What it was, in a few words: 番茄炒蛋 · 火候正好.
export const dishWords = item => `${normalizeDish(item).name} · ${HEAT_WORDS[heatOf(item)]}`;
// What it took from going out: one of each thing from the fields that went in.
export const produceOf = item => (Array.isArray(item?.items) ? item.items : []).filter(veg).map(id => INGREDIENTS[id].produce);

// What it tasted like, printed on its page of the book when it is eaten: what went in, how it went, and when.
const TASTES = {tomato: '番茄酸酸甜甜的', greens: '青菜脆生生的', pumpkin: '南瓜面面的、甜甜的', pea: '豌豆一粒一粒都是甜的', egg: '蛋香香的'};
const PAIRS = {'tomato+egg': '酸酸甜甜的，汤汁拌饭能吃两碗。', 'greens': '脆生生的，清清爽爽，一口一股锅气。'};
export function dishTaste(item, {hour} = {}) {
  const d = normalizeDish(item), items = validItems(d.items) ? d.items : [], key = [...items].sort((a, b) => a === 'egg' ? 1 : b === 'egg' ? -1 : 0).join('+');
  const lines = [PAIRS[key] || (items.map(id => TASTES[id]).join('，') + '。')], heat = heatOf(d);
  if (heat === 'caught') lines.push('锅底糊了一点，糊的那一点最下饭。');
  else if (heat === 'browned') lines.push('多炒了一会儿，边上有点焦香。');
  else if (heat === 'tender') lines.push('起锅起得早，嫩嫩的。');
  if (Number.isFinite(hour) && (hour >= 23 || hour < 4)) lines.push('半夜一起吃的，比白天香。');
  else if (Number.isFinite(hour) && hour >= 11 && hour < 14) lines.push('一起吃的午饭。');
  else if (Number.isFinite(hour) && hour >= 17 && hour < 21) lines.push('一起吃的晚饭。');
  return lines.join('');
}
