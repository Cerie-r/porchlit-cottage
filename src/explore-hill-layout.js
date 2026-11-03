// The flower hill (花坡), the second page of the exploring book (src/explore-book.jsx): the painted set (10/27, spring:
// cherry trees in flower, wisteria), where the pieces stand, the paths, and what is to be found where. Data only:
// walking and looking through things are in src/explore-place.js, the same for every page.
//
// Same measure as the woods: the ground picture laid flat, 16 × 8, x left to right and z back to front.
import {piecesOf, pointAt} from './explore-place.js';

export const HILL_DIR = '/explore/flower-hill/';
const PAGE = {width: 16, depth: 8};
const GROUND = {art: 'ground.webp', size: [3072, 1536]};
// The sky and the far hills behind; after dark, the same hills under the moon (the third batch of paintings, 10/27).
const BACKDROP = {art: 'backdrop.webp', night: 'backdrop-night.webp', size: [3072, 1152], width: 16.4, z: -4.05};

// Pictures and their pixel sizes. find-sakura-sprig is the woods' one; find-wisteria-sprig is cut out of the
// painted wisteria tree, paper edge and all, until it has a picture of its own.
export const ART = {
  'tree-cherry-full': [970, 1024], 'tree-cherry-lean-left': [676, 1024], 'tree-cherry-lean-right': [788, 1024],
  'tree-cherry-old-wide': [1024, 645], 'wisteria-tree': [852, 1024], 'wisteria-bower': [714, 1024],
  'bush-white-blossom': [640, 589], 'bush-pink-blossom': [640, 402], 'bush-wisteria-lavender': [408, 640],
  'flower-white-meadow': [512, 256], 'flower-dusty-rose': [512, 288], 'flower-lavender-bells': [512, 351],
  'flower-mixed-meadow': [512, 297], 'rock-pale-cluster': [640, 297], 'rock-tall-flower': [427, 640],
  'fence-low-flower': [960, 469], 'find-sakura-sprig': [435, 512], 'find-wisteria-sprig': [261, 512],
  // The eighth batch of paintings (10/28).
  'find-wild-rose': [512, 473], 'find-lavender': [370, 512], 'find-daisy': [512, 465]
};

// What there is to find here (as in the woods: a name, the picture it comes up as, whether it hides deep).
export const FINDS = {
  'white-wildflower': {name: '白色小野花', art: 'flower-white-meadow'},
  'rose-wildflower': {name: '豆沙粉野花', art: 'flower-dusty-rose'},
  'bellflower': {name: '紫风铃草', art: 'flower-lavender-bells', deep: true},
  'meadow-posy': {name: '一把杂色野花', art: 'flower-mixed-meadow'},
  'sakura-sprig': {name: '一枝樱花', art: 'find-sakura-sprig'},
  'wisteria-sprig': {name: '一串紫藤', art: 'find-wisteria-sprig'},
  'wild-rose': {name: '一朵野玫瑰', art: 'find-wild-rose'},
  'lavender': {name: '一束薰衣草', art: 'find-lavender'},
  'daisy': {name: '一朵雏菊', art: 'find-daisy'}
};

// Where things hide (as in the woods). The arch of wisteria and the trees are shaken; the low fence, wound with
// flowers, is looked over.
export const HIDES = {
  flower: {often: 2.2},
  bush: {often: 1.5, finds: {'rose-wildflower': 2, 'white-wildflower': 2, 'wild-rose': 1.8, 'daisy': 1.2, 'bellflower': 1}},
  rock: {often: 1, finds: {'white-wildflower': 2, 'meadow-posy': 1.5, 'daisy': 1.5, 'lavender': 1, 'bellflower': .8}},
  tree: {often: 1.2, finds: {'sakura-sprig': 1}},
  arch: {often: 1.4, finds: {'wisteria-sprig': 1}},
  fence: {often: .9, finds: {'meadow-posy': 2, 'wild-rose': 1.5, 'white-wildflower': 1, 'daisy': 1}}
};
// The cherries shed cherry blossom, the wisteria wisteria.
const cherry = {'sakura-sprig': 1};
export const ART_FINDS = {
  'tree-cherry-full': cherry, 'tree-cherry-lean-left': cherry, 'tree-cherry-lean-right': cherry, 'tree-cherry-old-wide': cherry,
  'wisteria-tree': {'wisteria-sprig': 1},
  'bush-wisteria-lavender': {'wisteria-sprig': 3, 'lavender': 2.5, 'bellflower': 1},
  'bush-pink-blossom': {'rose-wildflower': 2, 'wild-rose': 2, 'meadow-posy': 1}
};

// Every piece: its picture, where it stands (x, z) and how tall (h). The cherries and the wisteria along the back,
// one cherry leaning in at the front left; bushes and flowers in the grass between the paths, kept off them. The
// arch of wisteria stands across the path up to the top of the page, so the two of them walk under it.
export const PIECES = piecesOf([
  ['tree-cherry-old-wide', -5.2, -3.45, 2.6], ['tree-cherry-full', 1.0, -3.55, 3.4], ['wisteria-tree', 3.7, -3.35, 3.4],
  ['tree-cherry-lean-right', 7.2, -3.1, 3.1], ['rock-tall-flower', -0.9, -3.45, 1.3], ['bush-wisteria-lavender', -4.6, -2.75, 1.7],
  ['flower-white-meadow', 3.3, -1.75, 0.65], ['wisteria-bower', 5.95, -1.72, 2.9], ['bush-white-blossom', -1.4, -0.75, 1.45],
  ['flower-lavender-bells', -2.6, 0.55, 0.7], ['flower-dusty-rose', 1.1, 0.75, 0.65], ['bush-pink-blossom', 2.4, 1.6, 1.15],
  ['flower-mixed-meadow', 6.9, 0.55, 0.68], ['rock-pale-cluster', -0.3, 1.35, 0.7], ['tree-cherry-lean-left', -7.3, 1.45, 3.2],
  ['flower-white-meadow', -5.4, 2.7, 0.62], ['fence-low-flower', -2.2, 3.55, 0.8], ['flower-dusty-rose', 4.9, 3.4, 0.62]
], ART);

// The paths painted on the ground (traced off its sandy colour): in at the left, one way round the top of the big
// meadow and one round the bottom, meeting at the right; from there up through the wisteria arch to the top, off to
// the right edge above, and down to the right edge below. Where two share a point they meet.
const L0 = [[-8.0, -2.55], [-7.55, -1.85], [-7.1, -1.15], [-6.5, -0.75]];
const UP = [[-6.5, -0.75], [-5.9, -0.95], [-5.0, -1.15], [-4.4, -1.55], [-3.95, -1.95], [-3.45, -2.35], [-2.9, -2.62], [-2.2, -2.75],
  [-1.5, -2.68], [-0.95, -2.4], [-0.45, -1.95], [-0.1, -1.45], [0.05, -0.95], [0.4, -0.6], [0.95, -0.42], [1.6, -0.25], [2.3, -0.1],
  [3.0, 0.15], [3.6, 0.25], [4.1, 0.25]];
const DOWN = [[-6.5, -0.75], [-6.25, -0.25], [-5.75, 0.05], [-5.0, 0.2], [-4.4, 0.42], [-4.0, 0.72], [-3.8, 1.2], [-3.55, 1.62],
  [-3.1, 1.92], [-2.4, 2.08], [-1.5, 2.3], [-0.6, 2.65], [0.3, 3.05], [1.2, 3.35], [2.1, 3.38], [3.0, 3.15], [3.8, 2.75], [4.5, 2.2],
  [5.0, 1.8], [5.35, 1.5]];
const LINK = [[4.1, 0.25], [4.55, 0.8], [5.0, 1.2], [5.35, 1.5]];
const TOP = [[4.1, 0.25], [4.3, -0.25], [4.6, -0.6], [5.1, -0.92], [5.6, -1.2], [5.95, -1.65], [5.95, -2.25], [5.75, -2.65], [5.6, -3.05],
  [5.7, -3.55], [5.8, -3.95]];
const RIGHT_UP = [[5.95, -2.25], [6.5, -2.15], [7.1, -2.1], [7.6, -1.95], [8.0, -1.6]];
const RIGHT_DOWN = [[5.35, 1.5], [6.0, 1.62], [6.5, 2.0], [6.85, 2.5], [7.35, 2.9], [8.0, 3.1]];
export const PATHS = [L0, UP, DOWN, LINK, TOP, RIGHT_UP, RIGHT_DOWN];

// What she's told when there's nothing, here.
const NOTHING = {tree: '花瓣落了一身，什么也没掉下来。', arch: '花架晃了晃，只落下几片紫藤花瓣。', bush: '拨开看了看，只有几片花瓣。'};
// Cherry petals drifting over the page, all day.
const PETALS = ['#f4b3c2', '#f0a3b6', '#f8c8d3', '#f6bccb'];

export const HILL = {
  id: 'hill', name: '花坡', dir: HILL_DIR, page: PAGE, ground: GROUND, backdrop: BACKDROP, art: ART, pieces: PIECES,
  paths: PATHS, start: pointAt(.3, L0), firstStop: [-5.0, 0.2],
  finds: FINDS, hides: HIDES, artFinds: ART_FINDS, dawn: null, hidden: 8, glints: 2, findH: .6, basket: 5,
  nothing: NOTHING, petals: PETALS
};
