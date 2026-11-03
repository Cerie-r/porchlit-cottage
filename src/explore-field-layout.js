// The fields (田), the fifth page of the exploring book (src/explore-book.jsx): the painted set (10/28: rows of greens
// and rapeseed, wheat, a taro patch, a little canal, a sandy path that forks; 11/2: tomatoes on bamboo frames and
// patches of bok choy, for the kitchen), where the pieces stand, the paths, and what is to be found where. Data only: walking and looking through things are in src/explore-place.js, the
// same for every page.
//
// Same measure as the other pages: the ground picture laid flat, 16 × 8, x left to right and z back to front. The
// path comes in at the front and forks in the middle of the page, round either side of the taro patch to the back;
// the canal runs down the right.
import {piecesOf, pointAt} from './explore-place.js';

export const FIELD_DIR = '/explore/field/';
const PAGE = {width: 16, depth: 8};
const GROUND = {art: 'ground.webp', size: [3072, 1536]};
// Fields as far as the hills, and the sky; after dark, a crescent moon and stars.
const BACKDROP = {art: 'backdrop.webp', night: 'backdrop-night.webp', size: [3072, 1152], width: 16.4, z: -4.05};

// Pictures and their pixel sizes.
export const ART = {
  'cherry-tree-1-old': [1024, 789], 'cherry-tree-2-young': [815, 1024], 'cherry-tree-3-spreading': [1024, 552],
  'crop-row-1-wheat-dense': [1280, 283], 'crop-row-2-grain-green': [1280, 311], 'crop-row-3-mixed-sparse': [1280, 432],
  'taro-clump-1-lush': [640, 575], 'taro-clump-2-low': [640, 502], 'taro-clump-3-tall': [640, 638], 'haystack': [640, 541],
  'scarecrow': [569, 640], 'stone-well': [632, 640], 'wooden-wheelbarrow': [640, 298], 'wood-fence-long': [960, 165],
  'wood-fence-corner': [960, 464], 'wildflower-blue-white': [640, 243], 'wildflower-yellow-pink': [640, 225],
  'find-cherries': [512, 476], 'find-taro-root': [324, 512], 'find-wheat-ear': [334, 512],
  // The eighth batch of paintings (10/28).
  'find-rapeseed': [449, 512], 'find-pea-pod': [512, 423], 'find-pumpkin': [512, 465],
  // For the kitchen (11/2): tomatoes and bok choy, growing and picked.
  'tomato-vine-1': [427, 640], 'tomato-vine-2': [585, 640], 'greens-row-1': [640, 427], 'greens-row-2': [640, 213],
  'find-tomato': [512, 480], 'find-greens': [488, 512]
};

// What there is to find here (as in the woods: a name, the picture it comes up as, whether it hides deep). Cherries
// shaken off the trees; a taro, deep in the ground under its big leaves (the first pull only feels it); ears of
// wheat; the wild flowers along the field edges.
export const FINDS = {
  'cherries': {name: '一捧樱桃', art: 'find-cherries'},
  'taro': {name: '一颗芋头', art: 'find-taro-root', deep: true},
  'wheat-ear': {name: '一穗麦子', art: 'find-wheat-ear'},
  'blue-wildflower': {name: '蓝白小野花', art: 'wildflower-blue-white'},
  'yellow-wildflower': {name: '黄粉小野花', art: 'wildflower-yellow-pink'},
  'rapeseed': {name: '一枝油菜花', art: 'find-rapeseed'},
  'pea-pod': {name: '一根豌豆荚', art: 'find-pea-pod'},
  // Under the hay or in the barrow: heavy, it takes two goes.
  'pumpkin': {name: '一个小南瓜', art: 'find-pumpkin', deep: true},
  // Picked off the frames, pulled from the patches: for cooking.
  'tomato': {name: '一颗番茄', art: 'find-tomato'},
  'greens': {name: '一棵青菜', art: 'find-greens'}
};

// Where things hide (as in the woods). The cherry trees are shaken; the taro and the rows of crops parted or turned
// back; the haystack rummaged; the barrow, the scarecrow and the fences looked at.
export const HIDES = {
  tree: {often: 1.4, finds: {'cherries': 1}},
  taro: {often: 1.7, finds: {'taro': 1}},
  crop: {often: 1.9, finds: {'wheat-ear': 2, 'rapeseed': 1.5, 'pea-pod': 1.2, 'yellow-wildflower': .5, 'pumpkin': .3}},
  hay: {often: 1.2, finds: {'wheat-ear': 1, 'pumpkin': .8}},
  flower: {often: 1.8},
  cart: {often: 1.2, finds: {'pumpkin': 1.2, 'taro': 1, 'wheat-ear': 1, 'cherries': 1, 'pea-pod': .6, 'tomato': .6, 'greens': .4}},
  vine: {often: 1.6, finds: {'tomato': 1}},
  greens: {often: 1.5, finds: {'greens': 1}},
  fence: {often: .8, finds: {'pea-pod': 1.2, 'blue-wildflower': 1, 'yellow-wildflower': 1, 'rapeseed': .8}}
};

// Every piece: its picture, where it stands (x, z) and how tall (h). Near the path, what can be looked through:
// cherry trees, taro, rows of crops, a haystack, a scarecrow in the rapeseed, a barrow, fences and wild flowers, two
// tomato frames and two patches of bok choy (placed clear of what stands in front of them).
// The well is only for looking into (`view`): the two of them lean over it and see the sky in the water; at night,
// the moon. Far off the path, a few pieces only to fill the fields (`still`).
const still = {still: true};
export const PIECES = piecesOf([
  ['crop-row-1-wheat-dense', 5.6, -2.7, 0.55], ['stone-well', -1.0, -2.55, 1.0, {view: true, spot: {at: [-1.3, -1.8], yaw: Math.PI}}],
  ['taro-clump-2-low', 0.4, -2.45, 0.7], ['wildflower-yellow-pink', 2.9, -2.75, 0.45], ['cherry-tree-1-old', -6.0, -2.2, 2.4],
  ['taro-clump-3-tall', 2.55, -2.0, 1.1], ['taro-clump-1-lush', 1.2, -1.3, 1.0], ['scarecrow', -3.1, -0.2, 1.4],
  ['cherry-tree-3-spreading', 5.0, -0.6, 1.7], ['wood-fence-long', 2.05, 0.15, 0.35], ['wood-fence-corner', -0.95, 1.0, 0.5],
  ['cherry-tree-2-young', 1.85, 1.45, 2.3], ['haystack', -1.65, 1.75, 1.1], ['crop-row-2-grain-green', -3.0, 2.65, 0.6],
  ['crop-row-3-mixed-sparse', 2.9, 2.9, 0.7], ['wooden-wheelbarrow', -1.1, 3.1, 0.5], ['wildflower-blue-white', 1.3, 3.5, 0.45],
  ['cherry-tree-2-young', -6.6, 1.2, 2.2, still], ['crop-row-3-mixed-sparse', -5.4, 3.3, 0.6, still], ['haystack', -6.9, -0.6, 1.0, still],
  ['crop-row-2-grain-green', 4.6, 3.25, 0.55, still], ['wildflower-blue-white', 7.45, 2.3, 0.45, still],
  ['tomato-vine-1', -2.05, -0.85, 1.3], ['tomato-vine-2', 3.5, 0.3, 1.25], ['greens-row-1', -4.35, -1.4, 0.58],
  ['greens-row-2', 1.6, 2.1, 0.42]
], ART);

// The paths painted on the ground (traced off their sandy colour): up from the front to a fork in the middle; the
// left one round the taro patch to the back, with a short turning off left along the top; the right one round the
// other side of the taro to the back. Where two share a point they meet.
const STEM = [[-0.1, 3.95], [-0.1, 3.14], [0.25, 2.06], [0.46, 1.0], [0.41, 0.03]];
const LEFT = [[0.41, 0.03], [-0.04, -0.55], [-0.46, -1.1], [-1.12, -1.46], [-1.98, -1.75], [-2.92, -2.16], [-3.5, -2.65], [-3.85, -2.98],
  [-4.11, -3.62], [-4.22, -3.95]];
const SPUR = [[-3.85, -2.98], [-4.76, -3.14], [-5.4, -3.32]];
const RIGHT = [[0.41, 0.03], [1.0, -0.42], [2.0, -0.78], [2.93, -1.14], [3.5, -1.6], [3.88, -2.34], [4.01, -3.12], [4.15, -3.4]];
export const PATHS = [STEM, LEFT, SPUR, RIGHT];

// What she's told here as they go, and when there's nothing (for a kind of piece, or for one picture).
const GO = {tree: '去摇摇那棵樱桃树。', taro: '去拨开那丛芋头叶看看。', crop: '去拨开那垄庄稼看看。', hay: '去草垛里翻翻。',
  cart: '去小推车那儿看看。', scarecrow: '去稻草人那儿看看。', 'stone-well': '去井边看看。', vine: '去番茄架那儿看看。',
  greens: '去那片青菜里看看。'};
const NOTHING = {tree: '樱桃树晃了晃，只掉下几片叶子。', taro: '芋头叶底下只有湿湿的泥。', crop: '庄稼底下只有土。',
  hay: '草垛里只有干草，扎了一手。', cart: '小推车里空空的，只剩一点土。', scarecrow: '稻草人的帽子歪了，口袋里空空的。',
  vine: '架上的番茄还青着，过几天才红。', greens: '这片青菜还小，舍不得拔。',
  fence: '木篱笆上什么也没挂。', 'stone-well': '两个人趴在井沿上往下看，井水里映着一小块天，还有两张挨在一起的脸。'};

export const FIELD = {
  id: 'field', name: '田', dir: FIELD_DIR, page: PAGE, ground: GROUND, backdrop: BACKDROP, art: ART, pieces: PIECES,
  paths: PATHS, start: pointAt(.3, STEM), firstStop: [0.46, 1.0],
  finds: FINDS, hides: HIDES, artFinds: null, dawn: null, hidden: 8, glints: 2, findH: .6, basket: 5,
  go: GO, nothing: NOTHING, night: '天黑了，田埂上飞着萤火虫，天上一弯月亮。',
  nightView: '夜里的井里映着月亮。他从背后抱住你，两个人的影子落进井里，跟月亮挨在一块儿。',
  // What the diary keeps of it: after dark, and by day.
  hugMoment: '在井边他从背后抱住了你', viewMoment: '趴在井沿上，井水里映着两张挨在一起的脸'
};
