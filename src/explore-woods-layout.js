// The woods, the first page of the exploring book (src/explore-book.jsx): where the painted paper pieces stand on the
// page, the path the two of them walk, and what is to be found where. Data only: walking and looking through things
// are in src/explore-place.js, the same for every page.
//
// The page is the ground picture laid flat, 16 × 8 (x left to right, z back to front; the camera looks from the
// front, +z). The art (public/explore/woods, from the painted set, 10/27) is drawn upright with a white paper edge and
// stands on its bottom middle. h is how tall a piece stands; its width follows the picture.
import {piecesOf, pointAt} from './explore-place.js';

export const WOODS_DIR = '/explore/woods/';
export const PAGE = {width: 16, depth: 8};
export const GROUND = {art: 'ground.webp', size: [3072, 1536]};
// The sky and the far hills: a board standing at the back edge of the page; after dark, the same hills under the
// moon (the second batch of paintings, 10/27).
export const BACKDROP = {art: 'backdrop.webp', night: 'backdrop-night.webp', size: [3072, 1152], width: 16.4, z: -4.05};

// Pictures and their pixel sizes (for the width before the picture has come). The find-* ones are what can be found,
// from the second batch of paintings (10/27).
export const ART = {
  'tree-edge-white-blossom': [678, 1024], 'tree-edge-pink-blossom': [686, 1024], 'tree-sage-round': [769, 1024],
  'tree-sage-tall': [682, 1024], 'tree-old-forked': [682, 1024], 'tree-deep-dense': [686, 1024], 'tree-deep-tall': [678, 1024],
  'bush-sage-wide': [640, 618], 'bush-sage-tall': [411, 640], 'bush-white-flower': [640, 634], 'bush-pink-flower': [629, 640],
  'flower-cream-lavender': [512, 326], 'flower-dusty-rose': [512, 314], 'flower-white': [512, 372],
  'rock-round-cluster': [640, 419], 'rock-tall': [531, 640], 'mushroom-cluster': [512, 481],
  'fallen-log': [960, 364], 'fence-short': [960, 635],
  'find-wild-strawberry': [512, 440], 'find-blueberry': [495, 512], 'find-oak-twig': [512, 437],
  'find-honeycomb': [512, 446], 'find-dew-web': [487, 512], 'find-sakura-sprig': [435, 512],
  // The eighth batch of paintings (10/28).
  'find-pinecone': [438, 512], 'find-feather': [361, 512], 'find-raspberry': [512, 471], 'find-lily-of-the-valley': [387, 512]
};

// What there is to find: its name; the picture it shows as it comes up; whether it hides deep (the first go only
// feels it, a second brings it up); how much likelier it is after dark. The dew web is only there at dawn.
export const FINDS = {
  'white-wildflower': {name: '白色小野花', art: 'flower-white'},
  'rose-wildflower': {name: '豆沙粉野花', art: 'flower-dusty-rose'},
  'mist-wildflower': {name: '雾紫小野花', art: 'flower-cream-lavender', deep: true},
  'red-cap-mushroom': {name: '红伞小蘑菇', art: 'mushroom-cluster', night: 2.5},
  'wild-strawberry': {name: '野草莓', art: 'find-wild-strawberry'},
  'blueberry': {name: '蓝莓', art: 'find-blueberry'},
  'oak-twig': {name: '一截橡木枝', art: 'find-oak-twig'},
  'honeycomb': {name: '一小块蜂窝', art: 'find-honeycomb', deep: true},
  'sakura-sprig': {name: '一枝樱花', art: 'find-sakura-sprig'},
  'dew-web': {name: '挂着露水的蛛网', art: 'find-dew-web'},
  'pinecone': {name: '一颗松果', art: 'find-pinecone'},
  'feather': {name: '一根带斑点的羽毛', art: 'find-feather'},
  'raspberry': {name: '一串树莓', art: 'find-raspberry'},
  'lily-of-the-valley': {name: '一枝铃兰', art: 'find-lily-of-the-valley', deep: true}
};
// How tall a find stands when it comes up.
export const FIND_H = .6;

// Where things hide. `often`: how likely a kind of place is to be one that hides something on a walk, against the
// others (times `night` after dark); `finds`: what it may hide, by weight. A clump of flowers or of mushrooms only
// ever hides its own kind. The fence hides only the dew web, and only at dawn (DAWN).
export const HIDES = {
  flower: {often: 2.4},
  mushroom: {often: 1.6, night: 2},
  log: {often: 1.8, night: 1.5, finds: {'red-cap-mushroom': 3, 'oak-twig': 2, 'white-wildflower': 1, 'pinecone': 1.5, 'feather': 1}},
  bush: {often: 1.6, finds: {'wild-strawberry': 3, 'blueberry': 3, 'raspberry': 2.5, 'white-wildflower': 1.5, 'rose-wildflower': 1.5, 'mist-wildflower': 1, 'lily-of-the-valley': .8}},
  rock: {often: 1, finds: {'white-wildflower': 2, 'wild-strawberry': 1.5, 'rose-wildflower': 1, 'red-cap-mushroom': 1, 'feather': 1.2}},
  tree: {often: .9, night: 1.3, finds: {'oak-twig': 3, 'pinecone': 2.5, 'red-cap-mushroom': 1, 'honeycomb': .7}}
};
// Trees that drop their own: a cherry in flower sheds a sprig of it.
export const TREE_FINDS = {'tree-edge-pink-blossom': {'sakura-sprig': 4, 'oak-twig': 1}};
// At dawn the fence holds a web with the dew still on it.
export const DAWN = {fence: 'dew-web'};
// How many places hide something on one walk: more than the basket carries, far fewer than the places to look.
export const HIDDEN = 8;
// How many of them glint, to start her off; the rest she has to look for.
export const GLINTS = 2;

// Every piece: its picture, where it stands (x, z) and how tall (h). Back row first: the deep woods, darker and
// taller; then the middle; the front row low, so it frames the page without hiding it. Kept off the path and the
// stream painted on the ground.
export const PIECES = piecesOf([
  ['tree-deep-tall', -7.0, -3.55, 4.3], ['tree-deep-dense', -5.3, -3.7, 4.4], ['tree-sage-tall', -3.7, -3.3, 3.9],
  ['tree-deep-dense', -2.2, -3.6, 4.2], ['tree-old-forked', -0.6, -3.3, 3.7], ['tree-deep-tall', 3.0, -3.6, 4.3],
  ['tree-sage-round', 4.6, -3.3, 3.8], ['tree-deep-dense', 7.9, -1.7, 3.7],
  ['tree-edge-pink-blossom', -7.3, -0.6, 3.5], ['tree-sage-round', -7.5, 1.6, 3.4], ['tree-edge-white-blossom', 7.5, 0.9, 3.4],
  ['bush-sage-wide', -4.6, -1.6, 1.5], ['flower-cream-lavender', -3.2, -1.0, 0.75], ['bush-white-flower', -1.8, -1.9, 1.6],
  ['mushroom-cluster', -0.7, -2.4, 0.75], ['flower-dusty-rose', 0.3, -0.7, 0.72], ['rock-tall', 2.9, -2.2, 1.5],
  ['bush-pink-flower', 4.6, -1.9, 1.5], ['flower-white', 4.9, 0.3, 0.72], ['rock-round-cluster', 6.6, -0.4, 0.8],
  ['fence-short', -5.4, 3.3, 0.9], ['fallen-log', -2.6, 2.9, 0.5], ['flower-dusty-rose', -1.0, 2.4, 0.7],
  ['rock-round-cluster', 0.9, 3.3, 0.75], ['flower-white', 2.3, 2.6, 0.7], ['bush-sage-tall', 3.8, 3.5, 1.3],
  ['mushroom-cluster', 5.6, 3.4, 0.6]
], ART);

// The path painted on the ground, from where they come in (front left) to where it leaves (back right), crossing the
// stream on the stepping stones.
export const PATH = [[-7.7, 3.6], [-6.8, 2.6], [-5.8, 1.7], [-4.8, 0.9], [-3.7, 0.6], [-2.7, 0.8], [-1.7, 1.2], [-0.6, 1.3],
  [0.4, 0.9], [1.4, 0.1], [2.3, -0.5], [3.2, -0.7], [4.2, -0.9], [5.2, -0.9], [5.9, -1.4], [6.2, -2.3], [6.6, -3.1], [7.3, -3.8]];
// Where they first stop after walking in.
export const FIRST_STOP = 3.9;
// How much the basket holds on one walk: more hides here than can be carried home.
export const BASKET = 5;

// The woods as one place for the book.
export const WOODS = {
  id: 'woods', name: '林子', dir: WOODS_DIR, page: PAGE, ground: GROUND, backdrop: BACKDROP, art: ART, pieces: PIECES,
  paths: [PATH], start: pointAt(.4, PATH), firstStop: pointAt(FIRST_STOP, PATH),
  finds: FINDS, hides: HIDES, artFinds: TREE_FINDS, dawn: DAWN, hidden: HIDDEN, glints: GLINTS, findH: FIND_H, basket: BASKET
};
