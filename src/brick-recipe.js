// The brick language: a build is a short recipe of parts on a stud grid, not a
// model. Every home draws a recipe with its own code, so whatever anyone builds
// stays in the house style, and nothing but these parts and colour roles can
// travel inside one. Officially written recipes are just builds in this same
// language.
//
// Units: x and z count studs on a 16 x 16 baseplate, y counts plates (a brick
// is three plates). Each part sits at its footprint's lowest corner (x, z) and
// bottom (y); w and d are its size before turning; turn is 0-3 quarter turns
// anticlockwise seen from above; flip mirrors the part across its own x.

export const BASE = 16;
export const MAX_HEIGHT = 30; // plates, ten bricks
export const MAX_PARTS = 200;
export const PLATE = .4; // a plate's height in studs (3.2 mm to an 8 mm stud)

// Colour roles, not colours: a home may repaint a role in its own palette.
export const ROLES = {
  cream: {label: '奶白', color: '#fff5e9'},
  white: {label: '雪白', color: '#fbf9f4'},
  blush: {label: '浅粉', color: '#ebc2cc'},
  rose: {label: '玫瑰', color: '#c98f9f'},
  lilac: {label: '丁香', color: '#c5b8da'},
  sage: {label: '鼠尾草', color: '#b5cbbb'},
  mist: {label: '雾蓝', color: '#9ebfcb'},
  wood: {label: '木色', color: '#c4a17b'},
  ink: {label: '墨色', color: '#685460'},
  gold: {label: '描金', color: '#dcbb76'}
};
export const MATERIALS = {plain: '普通', glass: '玻璃', glow: '发光'};
// What a build is for decides how big a stud is once it is in a house: a small
// thing for a table or a shelf, or a piece of furniture for the floor. The
// recipe only says which; each home decides the sizes.
export const SCALES = {small: '小摆件', furniture: '家具'};
// How big one stud is drawn, for each of those (a home could choose others).
export const STUD_SIZE = {small: .5, furniture: 4 / 3};

const BRICKS = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 6], [2, 2], [2, 3], [2, 4], [2, 6]];
const PLATES = [...BRICKS, [1, 8], [2, 8], [3, 3], [4, 4], [4, 6], [4, 8], [6, 6], [6, 8], [8, 8]];
// Sizes are listed one way round; turning gives the other. studs: where the
// round studs sit on top. All of these are basic parts every home always has;
// unlockable ones (special parts, materials) come later.
export const PARTS = {
  brick: {label: '砖', sizes: BRICKS, heights: [3], studs: 'top'},
  plate: {label: '薄板', sizes: PLATES, heights: [1], studs: 'top'},
  tile: {label: '光面板', sizes: PLATES, heights: [1], studs: 'none'},
  round: {label: '圆柱', sizes: [[1, 1], [2, 2]], heights: [3], studs: 'top'},
  disc: {label: '圆片', sizes: [[1, 1], [2, 2]], heights: [1], studs: 'none'},
  slope: {label: '斜面', sizes: [[1, 2], [2, 2], [1, 3], [2, 3]], heights: [3], studs: 'back'},
  arch: {label: '拱', sizes: [[4, 1], [6, 1]], heights: [3, 6], studs: 'top'},
  curve: {label: '弧', sizes: [[2, 2], [3, 3], [4, 4]], heights: [1, 3], studs: 'none'},
  lathe: {label: '车削', sizes: [[1, 1], [2, 2], [3, 3], [4, 4]], heights: [2, 3, 4, 6, 8, 10, 12], studs: 'none',
    profiles: {vase: '花瓶', jar: '罐子', column: '柱子', bowl: '碗', cup: '杯子', shade: '灯罩', bead: '圆珠'}},
  drape: {label: '布', sizes: [[2, 1], [3, 1], [4, 1], [5, 1], [6, 1]], heights: [3, 6, 9, 12, 15], studs: 'none'},
  fence: {label: '栏杆', sizes: [[2, 1], [4, 1]], heights: [3, 6], studs: 'none'},
  flower: {label: '小花', sizes: [[1, 1]], heights: [1], studs: 'none'},
  leaf: {label: '叶片', sizes: [[1, 2]], heights: [1], studs: 'none'}
};
// Mirror-image to themselves, either way round (SAME), or only when they lie
// along x (ALONG_X); a curve never is.
const SAME = new Set(['brick', 'plate', 'tile', 'round', 'disc', 'lathe', 'flower', 'arch', 'fence', 'drape']);
const ALONG_X = new Set(['slope', 'leaf']);

// The footprint a part covers on the grid, turned.
export function footprint(part) {
  const odd = (part.turn || 0) % 2 === 1;
  return {x: part.x, z: part.z, y: part.y, w: odd ? part.d : part.w, d: odd ? part.w : part.d, h: part.h};
}

// Mirrored across the baseplate's middle (x = 8): the footprint moves across,
// the turn runs the other way, and the part flips, so a slope or a curve faces
// the mirrored way rather than the same way.
export function mirrored(part) {
  const f = footprint(part);
  return {...part, id: part.id + '~', x: BASE - f.x - f.w, turn: (4 - (part.turn || 0)) % 4, flip: !part.flip, mirrorOf: part.id};
}
const sameBox = (a, b) => {const p = footprint(a), q = footprint(b); return p.x === q.x && p.z === q.z && p.y === q.y && p.w === q.w && p.d === q.d && p.h === q.h;};
// A part whose mirror image is itself (straddling the middle, the same both
// ways round) is drawn once.
const selfSymmetric = part => sameBox(part, mirrored(part)) && (SAME.has(part.p) || ALONG_X.has(part.p) && (part.turn || 0) % 2 === 0);

// Every part as it will be drawn: with mirror on, each part and its image.
export function expand(recipe) {
  const parts = recipe.parts || [];
  if (!recipe.mirror) return parts;
  return parts.flatMap(p => selfSymmetric(p) ? [p] : [p, mirrored(p)]);
}

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
const crosses = (a, b) => overlap(a, b) && a.y < b.y + b.h && b.y < a.y + a.h;
// Two parts hold on to each other when one sits right on top of the other and
// their footprints share at least a stud.
const touches = (a, b) => overlap(a, b) && (a.y + a.h === b.y || b.y + b.h === a.y);

// A part written the other way round (1 x 4 for an arch that is 4 x 1) is
// turned a quarter instead, which covers the same studs.
export function normalizePart(part) {
  const spec = PARTS[part.p], p = {turn: 0, ...part};
  if (spec && !spec.sizes.some(([w, d]) => w === p.w && d === p.d) && spec.sizes.some(([w, d]) => w === p.d && d === p.w)) return {...p, w: p.d, d: p.w, turn: (p.turn + 1) % 4};
  return p;
}

// What is wrong with one part on its own, or null.
export function partProblem(part) {
  if (!part || typeof part !== 'object' || !Object.hasOwn(PARTS, part.p)) return '不认识这种零件';
  const spec = PARTS[part.p];
  if (!spec) return '不认识这种零件';
  if (!spec.sizes.some(([w, d]) => w === part.w && d === part.d)) return '这种零件没有这个尺寸';
  if (!spec.heights.includes(part.h)) return '这种零件没有这个高度';
  if (!Object.hasOwn(ROLES, part.c)) return '颜色要从调色板里挑';
  if (part.mat && !Object.hasOwn(MATERIALS, part.mat)) return '没有这种材质';
  if (spec.profiles && !Object.hasOwn(spec.profiles, part.profile)) return '车削要选一种形状';
  if (![part.x, part.y, part.z].every(Number.isInteger) || ![0, 1, 2, 3].includes(part.turn || 0)) return '位置要落在凸点格子上';
  const f = footprint(part);
  if (f.x < 0 || f.z < 0 || f.x + f.w > BASE || f.z + f.d > BASE) return '超出底板了';
  if (f.y < 0) return '不能低过底板';
  if (f.y + f.h > MAX_HEIGHT) return '太高了';
  return null;
}

// Whether a new or moved part can go where it is among the others (already
// expanded). Null when it can, or the reason it can't.
export function placementProblem(others, part) {
  const own = partProblem(part);
  if (own) return own;
  const f = footprint(part), rest = others.filter(o => o.id !== part.id && o.mirrorOf !== part.id).map(footprint);
  if (rest.some(o => crosses(f, o))) return '这里已经有零件了';
  if (f.y !== 0 && !rest.some(o => touches(f, o))) return '要搭在底板上，或者叠在别的零件上下';
  return null;
}

// Where a part over its footprint would hang from something above: right
// under the lowest part higher than `from` that covers any of its studs, as
// long as it then stays clear of `from`. Null when there is nothing to hang
// from. Cloth is hung this way.
export function hangingLevel(others, part, from) {
  const f = footprint(part);
  let above = Infinity;
  for (const o of others) {const g = footprint(o); if (overlap(f, g) && g.y > from) above = Math.min(above, g.y);}
  return Number.isFinite(above) && above - f.h >= from ? above - f.h : null;
}

// The whole recipe: every part fine, nothing crossing, and everything holding
// on to the baseplate through other parts.
export function recipeProblems(recipe) {
  const problems = [];
  if (recipe?.kind !== 'build') return ['这不是一张拼搭配方'];
  const name = (recipe.name || '').trim();
  if (!name || name.length > 30) problems.push('起个名字吧（三十个字以内）');
  if (recipe.scale !== undefined && !Object.hasOwn(SCALES, recipe.scale)) problems.push('大小只能是小摆件或者家具');
  const parts = expand(recipe);
  if (!parts.length) problems.push('还没有零件');
  if (parts.length > MAX_PARTS) problems.push(`最多 ${MAX_PARTS} 块零件`);
  parts.forEach(p => {const why = partProblem(p); if (why) problems.push(why);});
  if (problems.length) return [...new Set(problems)];
  const boxes = parts.map(footprint);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    if (crosses(boxes[i], boxes[j])) return [recipe.mirror && (parts[i].mirrorOf || parts[j].mirrorOf) ? '对称以后有零件和自己的影子撞上了' : '有零件叠在了一起'];
  }
  const held = new Set(boxes.flatMap((b, i) => b.y === 0 ? [i] : [])), queue = [...held];
  while (queue.length) {const i = queue.pop(); boxes.forEach((b, j) => {if (!held.has(j) && touches(boxes[i], b)) {held.add(j); queue.push(j);}});}
  if (held.size < boxes.length) return ['有零件悬空了，要连到底板上'];
  return [];
}
export const validRecipe = recipe => recipeProblems(recipe).length === 0;

// After taking a part away, does everything left still hold on?
export function stillHolds(recipe, removeId) {
  const left = {...recipe, name: '·', parts: recipe.parts.filter(p => p.id !== removeId)};
  return !left.parts.length || recipeProblems(left).length === 0;
}

// A new build is furniture-sized; builds saved before there were sizes were
// all drawn small, and stay that way.
export const freshBuild = () => ({kind: 'build', v: 1, name: '我的小拼搭', scale: 'furniture', mirror: false, parts: []});
export function normalizeBuild(item = {}) {
  return {...freshBuild(), ...item, kind: 'build', v: 1, scale: SCALES[item.scale] ? item.scale : 'small', mirror: !!item.mirror, parts: (item.parts || []).map(normalizePart)};
}
export const partCount = recipe => expand(recipe).length;

// A few recipes written in the language, as places to start from. Each shows
// off something new: glass and turned parts, curves and glow, an arch with
// cloth and mirroring, a mirrored piece of furniture.
export const starters = {
  vase: {label: '一只小花瓶', recipe: () => build('一只小花瓶', 'small', false, [
    ['disc', 7, 0, 7, 2, 2, 1, 'gold'],
    ['lathe', 7, 1, 7, 2, 2, 8, 'mist', {profile: 'vase', mat: 'glass'}],
    ['flower', 7, 9, 7, 1, 1, 1, 'rose'], ['flower', 8, 9, 8, 1, 1, 1, 'blush'], ['flower', 7, 9, 8, 1, 1, 1, 'lilac'],
    ['leaf', 8, 9, 7, 1, 2, 1, 'sage', {turn: 1}]
  ])},
  lamp: {label: '一盏小夜灯', recipe: () => build('一盏小夜灯', 'small', false, [
    ['curve', 6, 0, 6, 2, 2, 1, 'wood', {turn: 2}], ['curve', 8, 0, 6, 2, 2, 1, 'wood', {turn: 1}],
    ['curve', 6, 0, 8, 2, 2, 1, 'wood', {turn: 3}], ['curve', 8, 0, 8, 2, 2, 1, 'wood', {turn: 0}],
    ['lathe', 7, 1, 7, 2, 2, 10, 'gold', {profile: 'column'}],
    ['lathe', 6, 11, 6, 4, 4, 6, 'cream', {profile: 'shade', mat: 'glow'}]
  ])},
  window: {label: '一扇拱窗', recipe: () => build('一扇拱窗', 'furniture', true, [
    ['plate', 4, 0, 7, 2, 8, 1, 'cream', {turn: 1}],
    ['brick', 5, 1, 7, 1, 2, 3, 'cream'], ['brick', 5, 4, 7, 1, 2, 3, 'cream'], ['brick', 5, 7, 7, 1, 2, 3, 'cream'],
    ['plate', 5, 10, 7, 1, 6, 1, 'gold', {turn: 1}],
    ['arch', 5, 11, 7, 6, 1, 6, 'cream'],
    ['drape', 6, 4, 7, 2, 1, 6, 'blush'],
    ['flower', 6, 1, 8, 1, 1, 1, 'rose']
  ])},
  chair: {label: '一把小椅子', recipe: () => build('一把小椅子', 'furniture', true, [
    ['round', 5, 0, 5, 1, 1, 3, 'wood'], ['round', 5, 3, 5, 1, 1, 3, 'wood'],
    ['round', 5, 0, 10, 1, 1, 3, 'wood'], ['round', 5, 3, 10, 1, 1, 3, 'wood'],
    ['plate', 5, 6, 5, 6, 6, 1, 'wood'],
    ['tile', 6, 7, 6, 4, 4, 1, 'blush'],
    ['brick', 5, 7, 5, 1, 1, 3, 'wood'], ['brick', 5, 10, 5, 1, 1, 3, 'wood'],
    ['brick', 5, 13, 5, 1, 6, 3, 'wood', {turn: 1}],
    ['lathe', 5, 16, 5, 1, 1, 2, 'gold', {profile: 'bead'}]
  ])}
};
function build(name, scale, mirror, list) {
  return {...freshBuild(), name, scale, mirror, parts: list.map(([p, x, y, z, w, d, h, c, more], i) => ({id: `s${i}`, p, x, y, z, w, d, h, turn: 0, c, ...(more || {})}))};
}
