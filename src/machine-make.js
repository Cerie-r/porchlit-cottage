// What an AI living here makes for her (src/machine-acts.js, the make tool): a bouquet, a dessert, a doll. Made out of
// what this home's own benches have and no more: the flowers and vases on the florist's bench, the dessert table's
// kinds, toppings and palette, the kinds of doll caught or given here and the doll things drawn from the capsule
// machine. Then checked the way a thing left at the door by another home is (src/door-gifts.js), so what goes into
// the home is only what makes the thing up. Shared by the server (the shape of an ask, what the benches have) and her
// page (making it, when the act is let in).
import {flowerKinds, vaseKinds} from './flower-kinds.js';
import {DESSERT_LABELS, DESSERT_OPTIONS, DESSERT_TONES, availableBases, dessertProblems, freshDessert} from './dessert-recipe.js';
import {ROLES} from './brick-recipe.js';
import {animalOptions, availableAccessories, freshAnimal, speciesEars, speciesLooks, validAnimal, wornList} from './animal-state.js';
import {availableSpecies} from './doll-catch.js';
import {cleanCaught} from './claw.js';
import {checkGift} from './door-gifts.js';
import {validText} from './door-safety.js';
import {stockOf, ownColours, costOf, short, left} from './bench-stock.js';

export const MAKE = ['bouquet', 'dessert', 'doll'];
const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z]{1,16}$/;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const length = s => [...s].length;
const KINDS_SAID = {bouquet: '一束花', dessert: '一份甜品', doll: '一只玩偶'};
// The colours her own benches offer (src/florist.jsx's VASE_COLORS and FLOWER_COLORS, src/atelier.jsx's SWATCHES;
// tests/machine-make.test.mjs keeps them the same), named for the AI. A doll may also keep its kind's own colours.
export const COLORS = {
  vase: {'#f3e7d5': '奶白', '#c5b4ce': '雾紫', '#8b9c85': '灰绿', '#d9aab7': '豆沙粉'},
  flower: {'#fff0dc': '奶白', '#d9a1bd': '粉', '#ba9bce': '淡紫', '#e6bc63': '金黄', '#af647e': '玫红'},
  doll: {'#bd8c59': '焦糖', '#a8714a': '栗色', '#cf8a55': '橘棕', '#d8a868': '蜂蜜', '#f0a35e': '橘色', '#f6dd85': '奶黄', '#edcfa5': '奶茶', '#f6e8cd': '米白', '#f6f1e9': '雪白',
    '#f3cdd0': '浅粉', '#cf9fae': '豆沙', '#b5a4c4': '淡紫', '#9eaf98': '灰绿', '#b9bbbf': '浅灰', '#797b80': '灰', '#4a4f5e': '藏青', '#60483f': '深棕', '#3d3739': '墨黑'}
};
// What the AI may pick for a doll's pose: holding flowers wants flowers to hold, which a doll made this way hasn't.
export const POSES = animalOptions.pose.filter(p => p !== 'hold');
const openKeys = kinds => Object.keys(kinds).filter(k => kinds[k].open);
// The doll bench's words (src/atelier.jsx), for the AI.
export const DOLL_LABELS = {
  species: {bear: '小熊', cat: '小猫', rabbit: '小兔', fox: '小狐狸', panda: '熊猫', dog: '小狗', pig: '小猪', lamb: '小羊', fawn: '小鹿', duck: '小鸭', penguin: '企鹅', squirrel: '小松鼠', koala: '考拉', otter: '水獭', hedgehog: '小刺猬', seal: '小海豹', lion: '小狮子', dragon: '小龙'},
  expression: {bright: '亮晶晶', sleepy: '困困', wink: '眨眨眼', happy: '笑眯眯'},
  pose: {sit: '坐姿', stand: '站姿', hold: '抱花'},
  body: {classic: '经典身形', chubby: '圆肚身形'},
  blush: {none: '不加腮红', soft: '淡淡的', rosy: '红扑扑'},
  ears: {round: '圆耳朵', small: '小圆耳', cat: '猫耳朵', folded: '折耳', floppy: '垂耳朵', rabbit: '长耳朵', fox: '尖耳朵', fennec: '大耳朵', droopy: '耷拉耳', perky: '小立耳', pigflop: '耷拉下来', pigup: '竖起来', lamb: '小羊耳', ram: '卷卷角', fawn: '鹿耳朵', antler: '小鹿角', tuft: '头顶一撮毛', plain: '光溜溜', tufted: '耳尖簇毛', button: '圆圆小耳', puff: '绒绒大耳朵', snug: '贴头小耳', quills: '尖尖小刺', nubbly: '圆圆软刺', whiskers: '小胡须', mane: '蓬蓬鬃毛', cub: '还没长鬃毛', horns: '小角', nubs: '圆角'},
  accessory: {bow: '蝴蝶结', scarf: '小围巾', hat: '贝雷帽', wreath: '花环', glasses: '小眼镜', wings: '小翅膀', pearls: '珍珠项链', witchhat: '小巫师帽', pumpkin: '南瓜小篮', batwings: '蝙蝠翅膀', xmashat: '圣诞帽'}
};

// What the benches here have: the open flowers and vases, the dessert table's choices and palette, and the doll
// kinds and doll things this home has (layout: the home, as saved or as it is on her page).
export function benchOf(layout) {
  const l = plain(layout) ? layout : {};
  const dolls = Array.isArray(l.capsules?.dolls) ? l.capsules.dolls.filter(a => typeof a === 'string') : [];
  // What was brought home and is left of it (src/bench-stock.js): the AI makes from the same jars, bottles and
  // handfuls as she does, and the colours each kind of doll had come in need none.
  const stock = stockOf(l), species = availableSpecies(cleanCaught(l.caught));
  return {
    stock,
    own: [...ownColours(species)],
    flowers: Object.keys(flowerKinds).filter(k => flowerKinds[k].open),
    vases: Object.keys(vaseKinds).filter(k => vaseKinds[k].open),
    dessert: {...DESSERT_OPTIONS, base: availableBases(), fruit: DESSERT_OPTIONS.fruit.filter(f => f === 'none' || left(stock, 'fruit', f) >= 1)},
    roles: Object.keys(ROLES),
    species,
    accessories: availableAccessories(dolls).filter(a => a !== 'none')
  };
}

// ---- the shape of an ask

// {args} as kept with the act, or {problem}. a: what the AI sent. Only the parts of the thing; where it goes and the
// hints are the act's own (src/machine-acts.js).
export function makeArgs(action, a) {
  const out = {};
  if (a.name !== undefined && a.name !== null) {
    if (typeof a.name !== 'string' || !validText(a.name) || !a.name.trim() || length(a.name.trim()) > 20) return {problem: '名字是一段字，最多 20 个字。'};
    out.name = a.name.trim();
  }
  const word = (k, list, what) => {
    if (a[k] === undefined || a[k] === null) return null;
    if (typeof a[k] !== 'string' || !ID.test(a[k]) || !list.includes(a[k])) return `${what}填这几个里的一个：${list.join('、')}。`;
    out[k] = a[k];
    return null;
  };
  // A colour off the bench's own swatches (or, for a doll, its kind's own).
  const hex = (k, what, swatches) => {
    if (a[k] === undefined || a[k] === null) return null;
    const c = typeof a[k] === 'string' ? a[k].toLowerCase() : '';
    if (!HEX.test(c) || !swatches.includes(c)) return `${what}从台子上的颜色里挑（look 的 bench 里有）。`;
    out[k] = c;
    return null;
  };
  if (action === 'bouquet') {
    const p = word('vase', openKeys(vaseKinds), '花器') ?? hex('vase_color', '花器的颜色', Object.keys(COLORS.vase));
    if (p) return {problem: p};
    if (!Array.isArray(a.flowers) || !a.flowers.length || a.flowers.length > 9) return {problem: 'flowers 是一到九枝花：[{type, color}]。'};
    const flowers = [];
    for (const f of a.flowers) {
      if (!plain(f) || typeof f.type !== 'string' || !openKeys(flowerKinds).includes(f.type)) return {problem: `每一枝的 type 填 ${openKeys(flowerKinds).join('、')} 里的一个。`};
      const color = typeof f.color === 'string' ? f.color.toLowerCase() : '';
      if (!Object.hasOwn(COLORS.flower, color)) return {problem: '每一枝的 color 从花台上的颜色里挑（look 的 bench 里有）。'};
      flowers.push({type: f.type, color});
    }
    return {args: {...out, flowers}};
  }
  if (action === 'dessert') {
    for (const k of Object.keys(DESSERT_OPTIONS)) {
      const p = word(k, DESSERT_OPTIONS[k], {base: '底', cream: '奶油', fruit: '水果', sprinkles: '糖粒', plate: '盘子'}[k]);
      if (p) return {problem: p};
    }
    if (!out.base) return {problem: `base 要填：${DESSERT_OPTIONS.base.join('、')}。`};
    if (a.colors !== undefined && a.colors !== null) {
      if (!plain(a.colors)) return {problem: `colors 是 {${DESSERT_TONES.join(', ')}}，每样填调色板里的一个名字。`};
      const colors = {};
      for (const [tone, role] of Object.entries(a.colors)) {
        if (!DESSERT_TONES.includes(tone) || typeof role !== 'string' || !Object.hasOwn(ROLES, role)) return {problem: `colors 里只有 ${DESSERT_TONES.join('、')}，颜色填调色板里的名字（look 的 bench 里有）。`};
        colors[tone] = role;
      }
      out.colors = colors;
    }
    return {args: out};
  }
  if (action === 'doll') {
    if (typeof a.species !== 'string' || !animalOptions.species.includes(a.species)) return {problem: 'species 填一种玩偶（look 的 bench 里有这个家有的）。'};
    out.species = a.species;
    const own = speciesLooks[a.species], swatches = k => [...new Set([...Object.keys(COLORS.doll), own[k]])];
    const p = word('ears', speciesEars[a.species], '耳朵') ?? word('expression', animalOptions.expression, '表情') ?? word('pose', POSES, '姿势')
      ?? word('body', animalOptions.body, '身形') ?? word('blush', animalOptions.blush, '腮红') ?? hex('fur', '毛色', swatches('fur')) ?? hex('cream', '第二种颜色', swatches('cream')) ?? hex('patch', '花纹的颜色', swatches('patch'));
    if (p) return {problem: p};
    if (a.accessories !== undefined && a.accessories !== null) {
      const list = Array.isArray(a.accessories) ? a.accessories : [a.accessories];
      if (list.some(x => typeof x !== 'string' || !Object.hasOwn(DOLL_LABELS.accessory, x)) || wornList(list).length !== list.length) return {problem: '配饰是一个单子，每个位置最多一样（look 的 bench 里有这个家有的）。'};
      out.accessories = wornList(list);
    }
    return {args: out};
  }
  return {problem: `能做的：${MAKE.join('、')}。`};
}

// ---- making it

// The usual place for the n-th stem in a vase (the florist's own: the middle first, then round it), and how it
// stands there.
const SLOTS = [4, 1, 3, 5, 7, 0, 2, 6, 8];
const stem = (f, i) => {
  const slot = SLOTS[i];
  return {id: 's' + i, slot, type: f.type, color: f.color, height: 2.8 + (slot % 3) * .25, tilt: slot === 4 ? 0 : .28, turn: Math.atan2(slot % 3 - 1, Math.floor(slot / 3) - 1)};
};

// The thing out of an ask, as it will be kept (without where it goes or who made it), or {problem}: out of what the
// benches have (bench, benchOf), and through the door's check.
export function makeThing(action, args, bench) {
  if (action === 'bouquet') {
    const closed = args.flowers.find(f => !bench.flowers.includes(f.type));
    if (closed) return {problem: `花台上还没有「${flowerKinds[closed.type]?.name || closed.type}」。`};
    if (args.vase && !bench.vases.includes(args.vase)) return {problem: `花台上还没有「${vaseKinds[args.vase]?.name || args.vase}」。`};
    const raw = {kind: 'bouquet', name: args.name || '一束花', vase: args.vase || 'wrap', vaseColor: args.vase_color || '#f3e7d5', stems: args.flowers.map(stem), bricks: []};
    const thing = checkGift(raw);
    return thing ? {thing} : {problem: '这束花花台上插不出来。'};
  }
  if (action === 'dessert') {
    for (const k of Object.keys(DESSERT_OPTIONS)) if (args[k] && !bench.dessert[k].includes(args[k])) return {problem: `甜品台上还没有「${DESSERT_LABELS[k][args[k]] || args[k]}」。`};
    const fresh = freshDessert();
    const raw = {...fresh, name: args.name || `${DESSERT_LABELS.base[args.base]}`, base: args.base, cream: args.cream ?? fresh.cream, fruit: args.fruit ?? (bench.dessert.fruit.includes(fresh.fruit) ? fresh.fruit : 'none'), sprinkles: args.sprinkles ?? fresh.sprinkles, plate: args.plate ?? fresh.plate, c: {...fresh.c, ...(args.colors || {})}, note: ''};
    const problems = dessertProblems(raw);
    if (problems.length) return {problem: `甜品台做不出来：${problems.join('、')}。`};
    const lack = bench.stock && short(bench.stock, costOf(raw));
    if (lack) return {problem: lack.words};
    const thing = checkGift(raw);
    return thing ? {thing} : {problem: '甜品台做不出来这一份。'};
  }
  if (action === 'doll') {
    if (!bench.species.includes(args.species)) return {problem: `家里还没有${DOLL_LABELS.species[args.species]}这种玩偶（抓到过、收到过的才有）。`};
    const missing = (args.accessories || []).find(x => !bench.accessories.includes(x));
    if (missing) return {problem: `家里还没有${DOLL_LABELS.accessory[missing]}（扭蛋里扭到过才有）。`};
    const look = speciesLooks[args.species];
    const raw = {...freshAnimal(), name: args.name || look.name.replace(/^我的/, ''), species: args.species, ears: args.ears || speciesEars[args.species][0],
      fur: args.fur || look.fur, cream: args.cream || look.cream, patch: args.patch || look.patch, accessory: args.accessories || [],
      ...Object.fromEntries(['expression', 'pose', 'body', 'blush'].filter(k => args[k]).map(k => [k, args[k]]))};
    if (!validAnimal(raw)) return {problem: '玩偶台做不出来这一只。'};
    const lack = bench.stock && short(bench.stock, costOf(raw, {own: new Set(bench.own || [])}));
    if (lack) return {problem: lack.words};
    const thing = checkGift(raw);
    return thing ? {thing} : {problem: '玩偶台做不出来这一只。'};
  }
  return {problem: `能做的：${MAKE.join('、')}。`};
}

// What it is, in a few words: 一束花「给你的」, 一份草莓奶油蛋糕, 一只小狮子「阿狮」.
export function madeWords(action, args) {
  if (action === 'dessert') return args.name ? `一份「${args.name}」` : `一份${DESSERT_LABELS.base[args.base] || '甜品'}`;
  if (action === 'doll') return `一只${DOLL_LABELS.species[args.species] || '玩偶'}${args.name ? `「${args.name}」` : ''}`;
  return `${KINDS_SAID[action] || '一样东西'}${args.name ? `「${args.name}」` : ''}`;
}
