// What the benches have to work with. What two people bring home from going out (homeState.explore.found, kept as
// 'place:id' -> how many times) is made into jars of dye, little bottles of essence and handfuls of fruit; making
// something uses some of it up, and only once it is made (homeState.spent). A jar of dye is good for three things,
// a bottle of essence for three desserts, a handful of fruit for one; the rare finds (from the mine, and the amber
// and cacao from deep in the woods) only for one. The plain colours (奶白、米白、墨黑) and flavours (香草、牛奶) are
// always there, and so are the colours each kind of doll caught came in. One find that is good for two things (a
// sprig of sakura: a pink dye and a sakura essence) is counted for both. The tailor's notions come the same way: a
// web with the dew still on it, from the woods at dawn, is lace for two pieces, and a pearl from the lake one set of
// pearl buttons. Lace laid on a table is only lent there: a whole web's worth for each piece (LACE_LAID), back in
// the drawer once it is taken up. And the stove's: a tomato, a head of greens, a pumpkin or a handful of pea pods
// from the fields goes into one dish (11/2).
import {SWATCHES, colourName} from './tailor-names.js';
import {speciesLooks, freshAnimal} from './animal-state.js';
import {produceOf} from './cooking-recipe.js';

export const BASE_DYES = ['奶白', '米白', '墨黑'];
// A colour: the finds that make it, and how many things one find dyes.
export const DYES = {
  亚麻: [['reed-plume'], 3], 奶黄: [['rapeseed'], 3], 杏色: [['pumpkin'], 3], 蜜桃: [['tea-flower'], 3],
  浅粉: [['sakura-sprig'], 3], 玫瑰: [['wild-rose'], 3], 莓果: [['raspberry'], 3], 酒红: [['ruby'], 1],
  丁香: [['wisteria-sprig'], 3], 薰衣草: [['lavender'], 3], 雾蓝: [['forget-me-not'], 3], 天蓝: [['blue-wildflower'], 3],
  牛仔蓝: [['blueberry'], 3], 藏青: [['fluorite'], 1], 鼠尾草: [['tea-sprig'], 3], 苔绿: [['fern-leaf'], 3],
  森林绿: [['bamboo'], 3], 焦糖: [['pinecone'], 3], 可可: [['cacao'], 1], 咖啡: [['walnut'], 3], 炭灰: [['silver-ore'], 1]
};
// The dessert palette's roles (src/dessert-taste.js FLAVOURS): 香草 and 牛奶 are always there.
export const BASE_FLAVOURS = ['cream', 'white'];
export const ESSENCES = {
  blush: [['sakura-sprig'], 3], rose: [['wild-rose'], 3], lilac: [['taro'], 3], sage: [['tea-sprig'], 3],
  mist: [['shell'], 3], wood: [['amber'], 1], ink: [['cacao'], 1], gold: [['honeycomb'], 3]
};
export const FRUITS = {strawberry: [['wild-strawberry'], 1], blueberry: [['blueberry'], 1], cherry: [['cherries'], 1]};
export const NOTIONS = {lace: [['dew-web'], 2], pearl: [['pearl'], 1]};
// What the stove cooks with. A pumpkin is good for a dye and for a pot of porridge both, counted for each.
export const PRODUCE = {tomato: [['tomato'], 1], greens: [['greens'], 1], pea: [['pea-pod'], 1], pumpkin: [['pumpkin'], 1],
  // From the fields, the tea hill and the woods: a taro, a length of bamboo (its shoot), an ear of wheat (a bowl of
  // noodles) are one dish each; a sprig of tea two pots; a piece of honeycomb three drizzles; walnuts and a pine cone
  // two handfuls each.
  taro: [['taro'], 1], bamboo: [['bamboo'], 1], wheat: [['wheat-ear'], 1], tea: [['tea-sprig'], 2],
  honey: [['honeycomb'], 3], walnut: [['walnut'], 2], pinenut: [['pinecone'], 2]};
// The kitchen opens with a little in the fridge: two tomatoes and a head of greens, given once. After those it all
// comes in from going out.
export const STARTER = {produce: {tomato: 2, greens: 1}};
export const LACE_LAID = 2;
const KINDS = {dye: DYES, essence: ESSENCES, fruit: FRUITS, notion: NOTIONS, produce: PRODUCE};
const KIND_LIST = Object.keys(KINDS), none = () => Object.fromEntries(KIND_LIST.map(k => [k, {}]));

const count = n => (Number.isInteger(n) && n > 0 ? n : 0);
// What has been used up so far: {dye: {name: n}, essence: {role: n}, fruit: {kind: n}, notion: {name: n}, produce:
// {name: n}}, only names there are.
export function cleanSpent(raw) {
  const out = none();
  for (const [kind, names] of Object.entries(KINDS)) {
    const got = raw && typeof raw === 'object' && raw[kind] && typeof raw[kind] === 'object' ? raw[kind] : {};
    for (const name of Object.keys(names)) if (count(got[name])) out[kind][name] = count(got[name]);
  }
  return out;
}

// How many of a find were brought home, from anywhere it can be found.
function brought(found, ids) {
  let n = 0;
  for (const [key, times] of Object.entries(found || {})) if (ids.includes(key.slice(key.indexOf(':') + 1))) n += count(times);
  return n;
}
// {dye: {name: {got, left}}, essence: {...}, fruit: {...}, notion: {...}}: only what has been brought home at least
// once. home: the home's state (explore.found and spent); laid: how many pieces of furniture have lace on them.
export function stockOf(home, {laid = 0} = {}) {
  const found = home?.explore?.found, spent = cleanSpent(home?.spent), out = none();
  for (const [kind, names] of Object.entries(KINDS)) {
    for (const [name, [ids, uses]] of Object.entries(names)) {
      const got = brought(found, ids) * uses + (STARTER[kind]?.[name] || 0);
      const lent = kind === 'notion' && name === 'lace' ? LACE_LAID * count(laid) : 0;
      if (got) out[kind][name] = {got, left: Math.max(0, got - (spent[kind][name] || 0) - lent)};
    }
  }
  return out;
}

const BASE = {dye: BASE_DYES, essence: BASE_FLAVOURS, fruit: [], notion: [], produce: []};
// How many are left: Infinity for what is always there, 0 for what was never brought home.
export const left = (stock, kind, name) => (BASE[kind].includes(name) ? Infinity : stock?.[kind]?.[name]?.left ?? 0);
// Whether it is on the bench at all (always there, or brought home once, even if it has run out since).
export const shown = (stock, kind, name) => BASE[kind].includes(name) || !!stock?.[kind]?.[name];

// The colours each kind of doll comes in: always there for the kinds that are had (species, src/doll-catch.js),
// with the bench's own first accent colour.
export function ownColours(species) {
  const out = new Set([freshAnimal().accent.toLowerCase()]);
  for (const s of species || []) for (const c of ['fur', 'cream', 'patch']) if (speciesLooks[s]?.[c]) out.add(speciesLooks[s][c].toLowerCase());
  return out;
}
// The doll bench's swatches (src/atelier.jsx), each with the dye it takes, as drawn on her chart of what each find
// teaches (10/28): the doll colours are a smaller set than the tailor's, so several dolls' shades share one dye.
export const DOLL_DYES = {
  '#bd8c59': '焦糖', '#a8714a': '可可', '#cf8a55': '杏色', '#d8a868': '焦糖', '#f0a35e': '杏色', '#f6dd85': '奶黄',
  '#edcfa5': '亚麻', '#f6e8cd': '米白', '#f6f1e9': '奶白', '#f3cdd0': '浅粉', '#cf9fae': '玫瑰', '#b5a4c4': '丁香',
  '#9eaf98': '鼠尾草', '#b9bbbf': '炭灰', '#797b80': '炭灰', '#4a4f5e': '藏青', '#60483f': '咖啡', '#3d3739': '墨黑'
};
// The dye a colour is made with (a doll swatch's own, or else the nearest of the tailor's swatches), or null when it
// needs none: a plain colour, or one of `own` (a kind's own colours, a pattern's own).
export function dyeFor(hex, own = new Set()) {
  if (typeof hex !== 'string' || own.has(hex.toLowerCase())) return null;
  const name = DOLL_DYES[hex.toLowerCase()] || colourName(hex);
  return name && !BASE_DYES.includes(name) ? name : null;
}
export const swatchNames = SWATCHES.map(([, name]) => name);

const add = (cost, kind, name) => { if (name) cost[kind][name] = 1; };
// What making a thing uses up: {dye, essence, fruit, notion}, each {name: how many}. own: the doll colours that need
// no dye. A sewn piece takes lace once however many of its edges have it, and one set of pearl buttons.
export function costOf(thing, {own = new Set()} = {}) {
  const cost = none();
  if (!thing || typeof thing !== 'object') return cost;
  if (thing.kind === 'sewn' || thing.colors) for (const hex of Object.values(thing.colors || {})) add(cost, 'dye', dyeFor(hex, own));
  if (thing.kind === 'sewn' || thing.colors) {
    if (Array.isArray(thing.lace) && thing.lace.length) add(cost, 'notion', 'lace');
    if (thing.pearls === true) add(cost, 'notion', 'pearl');
  }
  if (thing.kind === 'animal') for (const k of ['fur', 'cream', 'accent', 'patch']) add(cost, 'dye', dyeFor(thing[k], own));
  if (thing.kind === 'dessert') {
    const c = thing.c || {};
    // The body's gold is the plain egg sponge (蛋香), not honey; the plate's colour is only a colour.
    if (c.body && !(c.body === 'gold') && !BASE_FLAVOURS.includes(c.body)) add(cost, 'essence', c.body);
    if (thing.cream && thing.cream !== 'none' && c.cream && !BASE_FLAVOURS.includes(c.cream)) add(cost, 'essence', c.cream);
    if (thing.sprinkles && thing.sprinkles !== 'none' && c.sprinkles && !BASE_FLAVOURS.includes(c.sprinkles)) add(cost, 'essence', c.sprinkles);
    if (thing.fruit && thing.fruit !== 'none') add(cost, 'fruit', thing.fruit);
  }
  // A dish: one of each thing from the fields that went into it.
  if (thing.kind === 'dish') for (const name of produceOf(thing)) add(cost, 'produce', name);
  return cost;
}
const NAMES = {essence: {blush: '樱花', rose: '玫瑰', lilac: '芋泥', sage: '抹茶', mist: '海盐', wood: '焦糖', ink: '巧克力', gold: '蜂蜜'}, fruit: {strawberry: '草莓', blueberry: '蓝莓', cherry: '樱桃'}, notion: {lace: '蕾丝', pearl: '珍珠扣'}, produce: {tomato: '番茄', greens: '青菜', pea: '豌豆', pumpkin: '南瓜', taro: '芋头', bamboo: '笋', wheat: '麦子', tea: '茶叶', honey: '蜂蜜', walnut: '核桃', pinenut: '松子'}};
// Where going out finds what the stove cooks with, for when it has run out.
export const PRODUCE_WHERE = {bamboo: '茶山上', tea: '茶山上', honey: '林子里', pinenut: '林子里', walnut: '林子深处'};
const whereFor = name => PRODUCE_WHERE[name] || '田里';
// What it's called on a bench: a colour by its name, an essence by its flavour, fruit and notions by their names.
export const stockName = (kind, name) => (kind === 'dye' ? name : NAMES[kind]?.[name] || name);
// Where the notions are found, for when there are none or too few.
export const NOTION_HINT = {lace: '天刚亮的时候去林子里，篱笆上挂着露水的蛛网能做成蕾丝', pearl: '去湖边找一颗珍珠，芦苇丛、石头和小船边上都可能有，天黑以后更好找'};
// How many of it the cost takes (1 unless it says more).
const needed = n => count(n) || 1;
// The first thing the cost needs that has run out, is too little or was never brought home: {kind, name, words}, or
// null.
export function short(stock, cost) {
  for (const kind of KIND_LIST) {
    for (const [name, n] of Object.entries(cost[kind] || {})) {
      const have = left(stock, kind, name);
      if (have >= needed(n)) continue;
      const what = stockName(kind, name);
      const words = kind === 'notion'
        ? (!shown(stock, kind, name) ? `还没有${what}。${NOTION_HINT[name]}。` : have >= 1 ? `${what}不够了。${NOTION_HINT[name]}。` : `${what}用完了。${NOTION_HINT[name]}。`)
        : kind === 'produce'
          ? (!shown(stock, kind, name) ? `还没有${what}，出门去${whereFor(name)}找一找。` : `${what}用完了，出门再去${whereFor(name)}找一些。`)
        : !shown(stock, kind, name)
          ? (kind === 'dye' ? `还没有「${what}」的染料，出门找一找。` : kind === 'essence' ? `还没有「${what}」的香精，出门找一找。` : `还没有${what}，出门捡一捧回来。`)
          : (kind === 'dye' ? `「${what}」的染料用完了，出门再找一些。` : kind === 'essence' ? `「${what}」的香精用完了，出门再找一些。` : `${what}用完了，出门再捡一捧。`);
      return {kind, name, words};
    }
  }
  return null;
}
// What is left used up once the thing is made.
export function spend(spent, cost) {
  const out = cleanSpent(spent);
  for (const kind of KIND_LIST) for (const [name, n] of Object.entries(cost[kind] || {})) {
    if (BASE[kind].includes(name) || !KINDS[kind][name]) continue;
    out[kind][name] = (out[kind][name] || 0) + needed(n);
  }
  return out;
}
