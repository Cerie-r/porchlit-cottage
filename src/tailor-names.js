// The tailor's colours (src/tailor.jsx): the swatches and the sets that go together, each with a name, and the
// name a piece on the dress form goes by until it is given one of its own: its colour, then what it is
// (「樱花长裙」「雾蓝外套」「鼠尾草南瓜裙」). In its pattern's own colours it is just the pattern's name.
import {patternName} from '../body/sewn.js';

export const SWATCHES = [['#f6efe4', '奶白'], ['#efe5d6', '米白'], ['#e6d8c3', '亚麻'], ['#f1dca0', '奶黄'], ['#efc19b', '杏色'], ['#f2c8bd', '蜜桃'], ['#f0cfd3', '浅粉'], ['#d99aac', '玫瑰'], ['#b5617b', '莓果'], ['#7d3b4f', '酒红'], ['#c8b6d8', '丁香'], ['#9d86b8', '薰衣草'], ['#c3cfda', '雾蓝'], ['#9fb6cf', '天蓝'], ['#5f7896', '牛仔蓝'], ['#2f3a55', '藏青'], ['#b5c3a8', '鼠尾草'], ['#7f936f', '苔绿'], ['#465b4a', '森林绿'], ['#c39a72', '焦糖'], ['#7a5747', '可可'], ['#4a3631', '咖啡'], ['#3a383d', '炭灰'], ['#232229', '墨黑']];
export const SETS = [['奶油玫瑰', {main: '#f3e7d8', accent: '#c98aa5', trim: '#fdf8f0'}], ['樱花', {main: '#f2cdd2', accent: '#b5617b', trim: '#fff8f5'}], ['雾蓝', {main: '#c3cfda', accent: '#5f7896', trim: '#f6f3ee'}], ['鼠尾草', {main: '#b5c3a8', accent: '#5d7058', trim: '#f4f1e7'}], ['丁香', {main: '#cdbddd', accent: '#7e6a9c', trim: '#faf5fb'}], ['焦糖', {main: '#c69c74', accent: '#6c4c3e', trim: '#f3e5d1'}], ['酒红', {main: '#7d3b4f', accent: '#f0d9cf', trim: '#c9a26b'}], ['墨夜', {main: '#2f3a55', accent: '#1f2433', trim: '#d8c08e'}]];
export const sameColors = (a, b) => !!a && !!b && a.main === b.main && a.accent === b.accent && a.trim === b.trim;

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
// The swatch nearest a colour, by name.
export function colourName(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return '';
  const [r, g, b] = rgb(hex);
  let best = '', far = Infinity;
  for (const [c, name] of SWATCHES) {
    const [R, G, B] = rgb(c), d = 2 * (r - R) ** 2 + 4 * (g - G) ** 2 + 3 * (b - B) ** 2;
    if (d < far) { far = d; best = name; }
  }
  return best;
}
// What a base outfit is, without its colour.
const WHAT = {dress: '长裙', coat: '外套'};
// draft: {pattern, colors}; own: its pattern's own colours, when they are known.
export function autoName(draft, own = null) {
  if (!draft?.pattern || !draft.colors) return '';
  const pattern = patternName(draft.pattern), what = WHAT[draft.pattern] || pattern || '衣服';
  if (own && sameColors(draft.colors, own)) return pattern || what;
  const word = SETS.find(([, colors]) => sameColors(colors, draft.colors))?.[0] || colourName(draft.colors.main);
  return what.startsWith(word) ? what : word + what;
}
// Whether what is on the form has been given a name of its own (an empty one isn't).
// Its pattern's name is one it went by too (in the pattern's own colours), whatever colours it is in now.
export const renamed = (draft, own = null) => !!draft?.name && draft.name !== autoName(draft, own) && draft.name !== patternName(draft.pattern);
