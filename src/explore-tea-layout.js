// The tea hill (茶山), the fourth page of the exploring book (src/explore-book.jsx): the painted set (10/27: tea rows
// terraced up the slope, a zigzag sandy path to a clearing on the top, a big tree there), where the pieces stand,
// the path, and what is to be found where. Data only: walking and looking through things are in
// src/explore-place.js, the same for every page.
//
// Same measure as the other pages: the ground picture laid flat, 16 × 8, x left to right and z back to front. The
// path comes in at the front and winds up to the top of the hill at the back; the slope on either side is tea.
import {piecesOf, pointAt} from './explore-place.js';

export const TEA_DIR = '/explore/tea/';
const PAGE = {width: 16, depth: 8};
const GROUND = {art: 'ground.webp', size: [3072, 1536]};
// The far hills and the sky; after dark, the same under the moon and more stars (the stargazing hut will stand on
// the top one day).
const BACKDROP = {art: 'backdrop.webp', night: 'backdrop-night.webp', size: [3072, 1152], width: 16.4, z: -4.05};

// Pictures and their pixel sizes.
export const ART = {
  'tree-summit-large': [1024, 939], 'tea-tree-1-mature': [1024, 931], 'tea-tree-2-young': [1024, 931], 'tea-tree-3-flowering': [1024, 810],
  'tea-row-1-straight': [1280, 274], 'tea-row-2-curve-left': [1280, 275], 'tea-row-3-curve-right': [1280, 276], 'tea-row-4-short': [1280, 506],
  'tea-row-5-sparse': [1280, 247], 'tea-seedling-low': [640, 461], 'tea-basket': [512, 369], 'bamboo-fence-long': [960, 217],
  'bamboo-fence-corner': [960, 433], 'rock-mossy-cluster': [640, 391], 'rock-flat-low': [640, 237], 'wildflower-pink': [640, 299],
  'wildflower-white-lavender': [640, 220], 'find-tea-sprig': [512, 453], 'find-tea-flower': [484, 512],
  // The eighth batch of paintings (10/28).
  'find-tea-seed': [512, 464], 'find-bamboo': [512, 479], 'find-wild-berries': [512, 481]
};

// What there is to find here (as in the woods: a name, the picture it comes up as, whether it hides deep). The tea
// itself, one bud and two leaves; a tea flower, shaken off the tea trees (mostly the one in flower); and the wild
// flowers between the rows, the white ones with bellflowers hiding deep.
export const FINDS = {
  'tea-sprig': {name: '一芽两叶', art: 'find-tea-sprig'},
  'tea-flower': {name: '一朵茶花', art: 'find-tea-flower'},
  'pink-wildflower': {name: '粉色野花', art: 'wildflower-pink'},
  'white-bells': {name: '小白花和风铃草', art: 'wildflower-white-lavender', deep: true},
  'tea-seed': {name: '一把茶籽', art: 'find-tea-seed'},
  'bamboo': {name: '一节竹子', art: 'find-bamboo'},
  'wild-berries': {name: '一小枝野莓', art: 'find-wild-berries'}
};

// Where things hide (as in the woods). The rows of tea she parts, the tea trees the two of them shake, the basket
// someone left between the rows she looks into.
export const HIDES = {
  tea: {often: 2.2, finds: {'tea-sprig': 4, 'tea-seed': 1}},
  tree: {often: 1.4, finds: {'tea-sprig': 3, 'tea-seed': 1.5, 'tea-flower': 1}},
  flower: {often: 1.8},
  basket: {often: 1.3, finds: {'tea-sprig': 3, 'tea-seed': 1.5, 'pink-wildflower': 1}},
  rock: {often: 1, finds: {'pink-wildflower': 2, 'wild-berries': 1.5, 'white-bells': 1, 'bamboo': .6}},
  fence: {often: .7, finds: {'pink-wildflower': 2, 'bamboo': 1.5, 'wild-berries': 1, 'white-bells': 1}}
};

// The tea tree in flower sheds its flowers more than its leaves.
const ART_FINDS = {'tea-tree-3-flowering': {'tea-flower': 2, 'tea-sprig': 1, 'tea-seed': .8}};

// Every piece: its picture, where it stands (x, z) and how tall (h). Near the path, what can be looked through:
// rows of tea standing up off the slope, tea trees, a basket, a bamboo fence, rocks and wild flowers. The big tree
// on the top is only for standing under and looking out (`view`: down the hill towards the camera, the way the
// slope falls). Far out on either side, off the path, a few pieces only to fill the slope (`still`).
const still = {still: true};
export const PIECES = piecesOf([
  ['tree-summit-large', 0.55, -3.55, 3.0, {view: true, spot: {at: [-0.55, -2.95], yaw: 0}}], ['rock-mossy-cluster', -1.6, -3.25, 1.0],
  ['wildflower-pink', -2.45, -2.75, 0.5], ['bamboo-fence-long', 1.35, -2.5, 0.4], ['tea-tree-1-mature', 3.2, -2.2, 1.5],
  ['tea-tree-1-mature', -2.35, -1.55, 1.6], ['wildflower-white-lavender', 2.35, -1.95, 0.45], ['tea-row-4-short', -0.85, -1.0, 0.6],
  ['bamboo-fence-corner', -2.25, -0.55, 0.55], ['tea-tree-3-flowering', 3.0, -0.35, 1.5], ['tea-row-3-curve-right', 0.35, 0.3, 0.5],
  ['tea-basket', 2.35, 0.9, 0.45], ['tea-seedling-low', -1.55, 1.7, 0.6], ['tea-tree-2-young', -2.95, 1.6, 1.4],
  ['tea-row-5-sparse', 3.4, 1.95, 0.45], ['tea-row-2-curve-left', -2.6, 3.0, 0.5], ['tea-row-1-straight', 2.7, 3.2, 0.5],
  ['rock-flat-low', 1.25, 3.45, 0.4], ['wildflower-pink', 0.25, 3.65, 0.5],
  ['tea-tree-2-young', -6.4, -2.6, 1.3, still], ['wildflower-pink', -6.5, -1.1, 0.5, still], ['tea-row-1-straight', -6.0, 1.2, 0.5, still],
  ['tea-row-5-sparse', -5.4, 3.3, 0.45, still], ['rock-mossy-cluster', 5.7, -2.65, 0.7, still], ['tea-tree-1-mature', 6.4, -0.6, 1.5, still],
  ['wildflower-white-lavender', 6.1, 1.25, 0.45, still], ['tea-row-2-curve-left', 6.0, 2.85, 0.5, still]
], ART);

// The path painted on the ground (traced off its sandy colour): in at the front, zigzagging up the slope to the
// clearing on the top.
const UP = [[-1.0, 3.95], [-0.91, 3.36], [-0.64, 2.54], [0.06, 2.22], [0.8, 2.1], [1.54, 1.67], [1.7, 1.52], [1.26, 1.15], [0.58, 1.07],
  [-0.2, 0.96], [-0.92, 0.81], [-1.82, 0.54], [-2.02, 0.35], [-1.95, 0.19], [-1.0, -0.19], [0.06, -0.4], [0.8, -0.58], [1.59, -0.92],
  [1.74, -1.09], [1.67, -1.24], [0.94, -1.51], [0.08, -1.66], [-0.22, -1.67], [-0.67, -2.35], [-0.66, -2.72], [-0.59, -2.77], [-0.3, -3.15]];
export const PATHS = [UP];

// What she's told here as they go, and when there's nothing (for a kind of piece, or for one picture).
const GO = {tree: '去摇摇那棵茶树。', 'tree-summit-large': '去山顶的大树底下看看。'};
const NOTHING = {tree: '茶树晃了晃，只掉下几片老叶子。', fence: '竹篱笆上什么也没挂。',
  'tree-summit-large': '山顶的风从山下吹上来，满坡的茶一层一层往下铺。'};

export const TEA = {
  id: 'tea', name: '茶山', dir: TEA_DIR, page: PAGE, ground: GROUND, backdrop: BACKDROP, art: ART, pieces: PIECES,
  paths: PATHS, start: pointAt(.3, UP), firstStop: [0.8, 2.1],
  finds: FINDS, hides: HIDES, artFinds: ART_FINDS, dawn: null, hidden: 8, glints: 2, findH: .6, basket: 5,
  go: GO, nothing: NOTHING, night: '天黑了，茶山上飞着萤火虫，山顶的星星特别多。',
  nightView: '夜里山顶只有你们俩。他从背后抱住你，一起往山下看，头顶是满天的星星。',
  // What the diary keeps of it: after dark, and by day.
  hugMoment: '在山顶的老樟树下他从背后抱住了你', viewMoment: '在山顶的老樟树下牵着手往山下看'
};
