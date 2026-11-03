import {ROLES} from './brick-recipe.js';

// A dessert is picked, not built, the way a doll is: a kind, a few toppings, a
// plate, a name and four colour roles. Like every recipe it is a few lines of
// words, never a picture, so it can travel to another home (a gift, later) and
// be drawn there in that home's own colours.

export const DESSERT_OPTIONS = {
  base: ['cake', 'tart', 'pudding', 'macaron', 'puff'],
  cream: ['none', 'rosette', 'shell', 'dollop', 'swirl'],
  fruit: ['none', 'strawberry', 'blueberry', 'cherry'],
  sprinkles: ['none', 'dots', 'pearls', 'hearts'],
  plate: ['round', 'lace', 'stand', 'saucer']
};
export const DESSERT_LABELS = {
  base: {cake: '蛋糕', tart: '小塔', pudding: '布丁', macaron: '马卡龙', puff: '泡芙'},
  cream: {none: '不挤奶油', rosette: '玫瑰裱花', shell: '贝壳花边', dollop: '圆圆挤花', swirl: '顶上一朵'},
  fruit: {none: '不放水果', strawberry: '草莓', blueberry: '蓝莓', cherry: '樱桃'},
  sprinkles: {none: '不撒糖粒', dots: '彩色糖粒', pearls: '小糖珠', hearts: '小爱心'},
  plate: {round: '圆盘', lace: '花边盘', stand: '高脚蛋糕架', saucer: '小碟'}
};
// What the four colours paint. The first one is called after what it is.
export const DESSERT_TONES = ['body', 'cream', 'sprinkles', 'plate'];
export const toneLabel = (tone, base) => tone === 'body' ? {cake: '蛋糕胚', tart: '塔皮', pudding: '布丁', macaron: '饼壳', puff: '泡芙皮'}[base] || '甜品' : {cream: '奶油', sprinkles: '糖粒', plate: '盘子'}[tone];
// The kinds every kitchen has from the start. The others are crafts a home
// learns (from the blind box, later). Until a home keeps a list of what it has
// learned, every kind is on the table, the way the craft room offers every
// doll before the claw machine is there.
export const BASIC_BASES = ['cake', 'tart', 'pudding', 'macaron'];
export function availableBases(learned = null) {
  if (!Array.isArray(learned)) return DESSERT_OPTIONS.base;
  const have = new Set([...BASIC_BASES, ...learned]);
  return DESSERT_OPTIONS.base.filter(b => have.has(b));
}
// Who made it: someone in this home at the dessert table, the home's own
// machine, or a neighbour. Only the first exists yet; the others arrive with the
// porch mailbox and the machine's tools.
export const MAKERS = ['self', 'machine', 'guest'];
export const NAME_MAX = 30, NOTE_MAX = 40;
// How long it was baked, when it was made step by step: out early it stays
// pale, left in it browns, left in too long it burns. Golden is how a picked
// dessert already looks, so a recipe says nothing when it came out golden.
// None of them is a mistake; a burnt edge is just how that one turned out.
export const BAKES = ['light', 'deep', 'burnt'];
export const BAKE_WORDS = {light: '出炉早一点，颜色浅浅的', golden: '烤得金黄', deep: '多烤了一会儿，颜色深一点', burnt: '烤焦啦，边边黑黑的。焦的那一圈最香'};
// Where hands put things, when it was made step by step: each mark is a spot
// on the top, [turn in 32nds of a circle, distance out in tenths]. Piping,
// fruit, and the pinches of sprinkles each keep a list; a layer with no marks
// is laid out the usual way.
// The lists only have a ceiling so a gift stays a few lines; it is far more
// than anyone puts on one dessert.
export const HAND_MAX = {cream: 60, fruit: 40, sprinkles: 24};
const validMarks = (list, max) => Array.isArray(list) && list.length <= max && list.every(m => Array.isArray(m) && m.length === 2 && Number.isInteger(m[0]) && m[0] >= 0 && m[0] < 32 && Number.isInteger(m[1]) && m[1] >= 0 && m[1] <= 10);
export function handOf(item) {
  const h = item?.hand;
  if (!h || typeof h !== 'object' || Array.isArray(h)) return null;
  const out = Object.fromEntries(Object.keys(HAND_MAX).filter(k => validMarks(h[k], HAND_MAX[k]) && h[k].length).map(k => [k, h[k].map(([a, r]) => [a, r])]));
  return Object.keys(out).length ? out : null;
}
export const bakeOf = item => BAKES.includes(item?.bake) ? item.bake : 'golden';
// Cream puffs filled by hand: which of the four (0 is the one on top) were
// filled until the cream came out of the hole. It stays on those puffs.
export const PUFFS = 4;
const validBurst = list => Array.isArray(list) && list.length <= PUFFS && list.every(i => Number.isInteger(i) && i >= 0 && i < PUFFS) && new Set(list).size === list.length;
export const burstOf = item => item?.base === 'puff' && validBurst(item?.burst) && item.burst.length ? [...item.burst].sort((a, b) => a - b) : null;

export const freshDessert = () => ({kind: 'dessert', v: 1, name: '草莓奶油蛋糕', base: 'cake', cream: 'rosette', fruit: 'strawberry', sprinkles: 'none', plate: 'lace', c: {body: 'gold', cream: 'white', sprinkles: 'blush', plate: 'white'}, note: ''});

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
export const isDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

// Fills in whatever is missing (an older draft, a half-written gift) and keeps
// everything else as it is, so a dessert in the backpack keeps its place in
// the house. Wrong values are left for validDessert to turn away.
export function normalizeDessert(item = {}) {
  const fresh = freshDessert(), d = {...fresh, ...(plain(item) ? item : {})};
  d.kind = 'dessert'; d.v = 1;
  d.c = {...fresh.c, ...(plain(item?.c) ? item.c : {})};
  if (typeof d.note !== 'string') d.note = '';
  return d;
}

function makerProblem(by) {
  if (by === undefined) return null;
  if (!plain(by) || !MAKERS.includes(by.kind)) return '不知道是谁做的';
  if (by.kind !== 'self' && (typeof by.name !== 'string' || !by.name.trim() || by.name.length > NAME_MAX)) return '要写上是谁做的';
  return null;
}
// Why a dessert can't be kept, in words for the person making it. Empty when
// it's fine. Anything not in the lists is refused, colours included: a colour
// is a role from the palette, never a colour code.
export function dessertProblems(item) {
  if (!plain(item) || item.kind !== 'dessert') return ['这不是一份甜品'];
  const d = normalizeDessert(item), out = [];
  if (typeof d.name !== 'string' || !d.name.trim()) out.push('给它起个名字');
  else if (d.name.trim().length > NAME_MAX) out.push(`名字最多 ${NAME_MAX} 个字`);
  for (const [k, list] of Object.entries(DESSERT_OPTIONS)) if (!list.includes(d[k])) out.push('有一样不在甜品台上');
  for (const tone of DESSERT_TONES) if (!Object.hasOwn(ROLES, d.c[tone])) out.push('颜色要从调色板里挑');
  if (Object.keys(d.c).some(k => !DESSERT_TONES.includes(k))) out.push('颜色要从调色板里挑');
  if (d.bake !== undefined && !BAKES.includes(d.bake)) out.push('有一样不在甜品台上');
  if (d.hand !== undefined && (!plain(d.hand) || Object.entries(d.hand).some(([k, v]) => !Object.hasOwn(HAND_MAX, k) || !validMarks(v, HAND_MAX[k])))) out.push('手做的痕迹写得不对');
  if (d.burst !== undefined && (!validBurst(d.burst) || d.base !== 'puff')) out.push('手做的痕迹写得不对');
  if (d.note.length > NOTE_MAX) out.push(`一句话最多 ${NOTE_MAX} 个字`);
  const maker = makerProblem(d.by);
  if (maker) out.push(maker);
  if (d.madeOn !== undefined && !isDay(d.madeOn)) out.push('日子写得不对');
  return [...new Set(out)];
}
export const validDessert = item => dessertProblems(item).length === 0;

// Just the recipe, the part that can be learned and passed on: no note, no
// maker, no place in the house.
export function dessertRecipe(item) {
  const d = normalizeDessert(item);
  return {kind: 'dessert', v: 1, name: String(d.name).trim(), base: d.base, cream: d.cream, fruit: d.fruit, sprinkles: d.sprinkles, plate: d.plate, c: Object.fromEntries(DESSERT_TONES.map(t => [t, d.c[t]])), ...(BAKES.includes(d.bake) ? {bake: d.bake} : {}), ...(handOf(d) ? {hand: handOf(d)} : {}), ...(burstOf(d) ? {burst: burstOf(d)} : {})};
}
// The same dessert, whatever it is called, and however the hands that made
// this one happened to bake it, fill it or place things on it.
export function sameDessert(a, b) {
  const x = dessertRecipe(a), y = dessertRecipe(b);
  return ['base', 'cream', 'fruit', 'sprinkles', 'plate'].every(k => x[k] === y[k]) && DESSERT_TONES.every(t => x.c[t] === y.c[t]);
}

// The words on the little tag: who made it.
const spaced = name => /[A-Za-z0-9]$/.test(name) ? name + ' ' : name;
export function makerLabel(by) {
  if (!by || by.kind === 'self') return '自己做的';
  return by.name ? `${spaced(by.name.trim())}做的` : '别人做的';
}
export const learnedLabel = name => `跟${/^[A-Za-z0-9]/.test(name) ? ' ' : ''}${spaced(name.trim())}学的`;

// Days are kept as the home's own calendar day, "2026-10-23".
export function localDay(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
export const dayLabel = day => isDay(day) ? `${+day.slice(5, 7)} 月 ${+day.slice(8, 10)} 日` : '';

// What the table starts from; every one can be changed.
export const dessertStarters = {
  shortcake: {label: '草莓奶油蛋糕', recipe: () => freshDessert()},
  berryTart: {label: '蓝莓小塔', recipe: () => ({...freshDessert(), name: '蓝莓小塔', base: 'tart', cream: 'dollop', fruit: 'blueberry', sprinkles: 'pearls', plate: 'round', c: {body: 'wood', cream: 'cream', sprinkles: 'gold', plate: 'white'}})},
  caramel: {label: '焦糖布丁', recipe: () => ({...freshDessert(), name: '焦糖布丁', base: 'pudding', cream: 'swirl', fruit: 'cherry', sprinkles: 'none', plate: 'saucer', c: {body: 'gold', cream: 'white', sprinkles: 'rose', plate: 'blush'}})},
  rosyMacaron: {label: '玫瑰马卡龙', recipe: () => ({...freshDessert(), name: '玫瑰马卡龙', base: 'macaron', cream: 'none', fruit: 'none', sprinkles: 'hearts', plate: 'stand', c: {body: 'blush', cream: 'white', sprinkles: 'rose', plate: 'white'}})},
  berryPuff: {label: '草莓泡芙', recipe: () => ({...freshDessert(), name: '草莓泡芙', base: 'puff', cream: 'dollop', fruit: 'strawberry', sprinkles: 'none', plate: 'round', c: {body: 'gold', cream: 'white', sprinkles: 'blush', plate: 'white'}})}
};
