// The lakeside (湖边), the third page of the exploring book (src/explore-book.jsx): the painted set (10/27: the lake with
// water lilies, a little wooden pier, willows, reeds), where the pieces stand, the paths, and what is to be found
// where. Data only: walking and looking through things are in src/explore-place.js, the same for every page.
//
// Same measure as the woods and the hill: the ground picture laid flat, 16 × 8, x left to right and z back to front.
// The lake fills the back and the right; the pier is painted on the ground, reaching out into it from the shore.
import {piecesOf, pointAt} from './explore-place.js';

export const LAKE_DIR = '/explore/lakeside/';
const PAGE = {width: 16, depth: 8};
const GROUND = {art: 'ground.webp', size: [3072, 1536]};
// The far shore and its hills; after dark, the same under the moon.
const BACKDROP = {art: 'backdrop.webp', night: 'backdrop-night.webp', size: [3072, 1152], width: 16.4, z: -4.05};

// Pictures and their pixel sizes.
export const ART = {
  'tree-willow-wide': [1024, 930], 'tree-willow-slender': [632, 1024],
  'reed-tall-golden': [601, 640], 'reed-low-sparse': [640, 415], 'reed-mid-dense': [640, 474], 'reed-tall-feathery': [640, 611],
  'reed-windblown': [404, 640], 'rock-round-cluster': [640, 292], 'rock-flat-shore': [640, 284], 'rock-tall': [550, 640],
  'dock-post-pair': [549, 640], 'dock-railing-low': [640, 282], 'boat-tied-wood': [960, 481],
  'bush-water-white': [640, 408], 'bush-water-pink': [640, 418], 'flower-shore-white': [512, 314], 'flower-shore-blue': [512, 323],
  'find-shell': [512, 437], 'find-round-stone': [512, 440], 'find-reed-plume-bundle': [331, 512],
  'find-message-bottle': [512, 386],
  // The eighth batch of paintings (10/28).
  'find-water-lily': [512, 330], 'find-egret-feather': [345, 512], 'find-pearl': [512, 444], 'find-driftwood': [512, 337]
};

// What there is to find here (as in the woods: a name, the picture it comes up as, whether it hides deep, how much
// likelier after dark). Shells show more by moonlight; the forget-me-nots by the water hide deep; now and then a
// little glass bottle washes up in the reeds or by the boat, a note rolled up inside it.
export const FINDS = {
  'shell': {name: '一枚贝壳', art: 'find-shell', night: 2},
  'round-stone': {name: '一颗圆石头', art: 'find-round-stone'},
  'reed-plume': {name: '一束芦苇穗', art: 'find-reed-plume-bundle'},
  'message-bottle': {name: '漂来的玻璃瓶', art: 'find-message-bottle'},
  'white-wildflower': {name: '白色小野花', art: 'flower-shore-white'},
  'forget-me-not': {name: '勿忘我', art: 'flower-shore-blue', deep: true},
  'water-lily': {name: '一朵睡莲', art: 'find-water-lily'},
  'egret-feather': {name: '一根白鹭的羽毛', art: 'find-egret-feather'},
  'driftwood': {name: '一截漂流木', art: 'find-driftwood'},
  // A pearl in its shell: deep, and likelier after dark.
  'pearl': {name: '一颗珍珠', art: 'find-pearl', deep: true, night: 2}
};

// Where things hide (as in the woods). Reeds are parted like a bush; the boat is looked into. The willows hide
// nothing, and nor does the pier: the two of them only stand and look.
export const HIDES = {
  reed: {often: 2.2, finds: {'reed-plume': 3, 'egret-feather': 1.2, 'shell': 1.2, 'water-lily': 1, 'round-stone': .8, 'driftwood': .5, 'message-bottle': .3, 'pearl': .25}},
  flower: {often: 2},
  rock: {often: 1.4, finds: {'round-stone': 2.5, 'shell': 2, 'driftwood': 1, 'white-wildflower': .8, 'egret-feather': .6, 'pearl': .4}},
  bush: {often: 1.3, finds: {'white-wildflower': 2, 'forget-me-not': 1, 'round-stone': .6, 'egret-feather': .5}},
  boat: {often: 1.2, finds: {'shell': 2, 'water-lily': 1.2, 'round-stone': 1, 'driftwood': .8, 'reed-plume': .5, 'pearl': .5, 'message-bottle': .3}}
};

// Every piece: its picture, where it stands (x, z) and how tall (h). The willows on the land at the left, by the top
// of the water; reeds round the water's edge, either side of the little beach and along the shore; the boat tied up
// beside the pier, the pier's two posts with a rope across its end, a low rail on the rocks beside it; bushes,
// rocks and flowers in the grass between the paths, kept off them. What stands at the water's edge or just out in
// it (the reeds there, the boat) is looked at from the shore side (`shore`). The pier's posts are looked at from the
// foot of the pier, the two of them either side of it; the rail from the rocks beside it (`spot`).
const shore = {shore: true};
export const PIECES = piecesOf([
  ['tree-willow-slender', -4.45, -3.3, 2.9], ['reed-windblown', -3.05, -3.1, 1.25], ['reed-mid-dense', -1.3, -2.6, 1.0, shore],
  ['tree-willow-wide', -6.55, -1.75, 2.9], ['reed-tall-golden', 0.35, -0.8, 1.45, shore],
  ['dock-post-pair', 3.68, -0.22, 0.8, {spot: {at: [4.13, 1.0], yaw: Math.PI}}], ['boat-tied-wood', 2.8, 0.28, 0.6, shore],
  ['reed-low-sparse', -1.5, -0.85, 0.72, shore], ['dock-railing-low', 4.6, 0.82, 0.5, {spot: {at: [4.3, 1.4], yaw: Math.PI}}],
  ['reed-tall-feathery', 5.6, 1.55, 1.35, shore], ['rock-flat-shore', 7.0, 1.85, 0.5, shore],
  ['flower-shore-blue', -6.85, -0.95, 0.65], ['rock-tall', -4.9, -1.35, 1.35], ['flower-shore-white', -1.7, 1.0, 0.62],
  ['bush-water-pink', 0.75, 1.95, 1.05], ['rock-round-cluster', -3.0, 0.75, 0.68], ['bush-water-white', -5.55, 2.25, 1.1],
  ['flower-shore-white', 5.3, 3.45, 0.6], ['flower-shore-blue', 2.95, 3.35, 0.62], ['rock-round-cluster', -2.6, 3.4, 0.7],
  ['bush-water-pink', 7.0, 3.5, 1.0]
], ART);

// The paths painted on the ground (traced off its sandy colour): in at the left, a fork, one way up past the willows
// to the back (with a turning down to the little beach) and one along the shore to the pier and on round the
// right of the lake; a third round the front of the big meadow, out to the front edge, and across to the shore
// below the pier. Where two share a point they meet.
const L0 = [[-8.0, -0.7], [-7.04, -0.38], [-6.02, 0.0], [-5.56, 0.44]];
const LD = [[-5.56, 0.44], [-6.5, 0.94], [-6.98, 1.38], [-7.46, 2.1], [-8.0, 2.6]];
const MID = [[-5.56, 0.44], [-5.12, 0.42], [-4.4, 0.48], [-4.14, 0.19], [-3.59, -0.46], [-2.9, -0.82]];
const UP = [[-2.9, -0.82], [-2.94, -0.98], [-3.14, -1.7], [-3.72, -2.07], [-4.24, -2.2], [-5.04, -2.33], [-5.41, -2.6], [-5.89, -3.04],
  [-6.15, -3.75]];
const BEACH = [[-3.14, -1.7], [-2.96, -1.81], [-2.53, -2.24], [-2.38, -2.55]];
const SHORE = [[-2.9, -0.82], [-2.56, -0.54], [-1.8, -0.1], [-1.14, 0.03], [-0.28, -0.02], [0.26, 0.39], [0.82, 0.91], [1.48, 1.35],
  [2.4, 1.67], [3.44, 1.35], [3.61, 1.27]];
const EAST = [[3.61, 1.27], [3.86, 1.53], [4.68, 2.27], [5.24, 2.62], [6.04, 2.85], [7.0, 2.88], [7.44, 2.74], [7.95, 2.0]];
const FRONT = [[-4.4, 0.48], [-4.26, 1.44], [-3.4, 1.66], [-2.94, 1.84], [-1.96, 2.3], [-1.18, 2.93], [-0.47, 3.44]];
const OUT = [[-0.47, 3.44], [-0.5, 3.95]];
const ACROSS = [[-0.47, 3.44], [0.36, 2.99], [1.4, 2.9], [2.2, 2.55], [2.4, 1.67]];
export const PATHS = [L0, LD, MID, UP, BEACH, SHORE, EAST, FRONT, OUT, ACROSS];

// What she's told here as they go, and when there's nothing (for a kind of piece, or for one picture). The pier and
// its rail are only for looking out from: the two of them stand there hand in hand a while; at night he holds her
// from behind there, the two of them turned out with the moon on the water behind them (`nightView`).
const GO = {tree: '去柳树底下看看。', 'dock-post-pair': '去码头那儿看看湖。', 'dock-railing-low': '去栏杆那儿看看湖。'};
const NOTHING = {tree: '柳条甩了甩，什么也没掉下来。', bush: '拨开看了看，只有几片花瓣和一点湿泥。',
  'dock-post-pair': '码头尽头两根木桩，绳子绕了好几圈，湖水一下一下拍着桩脚。',
  'dock-railing-low': '岸边一截旧栏杆，木头被湖风吹得发白。两个人靠着它，看了一会儿湖。'};

export const LAKE = {
  id: 'lake', name: '湖边', dir: LAKE_DIR, page: PAGE, ground: GROUND, backdrop: BACKDROP, art: ART, pieces: PIECES,
  paths: PATHS, start: pointAt(.35, L0), firstStop: [-3.59, -0.46],
  finds: FINDS, hides: HIDES, artFinds: null, dawn: null, hidden: 7, glints: 2, findH: .6, basket: 5,
  go: GO, nothing: NOTHING, night: '天黑了，湖上落着月亮，岸边飞着萤火虫。',
  nightView: '夜深了，湖边只有你们俩。他从背后抱住你，下巴搁在你肩上，身后是落在湖里的月亮。',
  // What the diary keeps of it: after dark, and by day.
  hugMoment: '在码头他从背后抱住了你', viewMoment: '在码头上牵着手看了一会儿湖'
};
