// The mine (矿洞), the sixth page of the exploring book (src/explore-book.jsx): the painted set (10/28: a sandy path into
// the cave that forks at the back, a little railway, pools of water, timber frames holding up the roof, glowing
// fluorite and mushrooms, rocks with silver and rubies in them), where the pieces stand, the paths, and what is to be
// found where. Data only: walking and looking through things are in src/explore-place.js, the same for every page.
//
// Same measure as the other pages: the ground picture laid flat, 16 × 8, x left to right and z back to front. The
// path comes in at the front and forks towards the back, each way under a timber frame; the railway runs down the
// left. Inside the cave there is no day or night (`cave`): an oil lamp is lit, and under it he always holds her
// from behind.
import {piecesOf, pointAt} from './explore-place.js';

export const MINE_DIR = '/explore/mine/';
const PAGE = {width: 16, depth: 8};
const GROUND = {art: 'ground.webp', size: [3072, 1536]};
// Deeper into the cave, darker the further in, fluorite glinting on the walls: the same day and night.
const BACKDROP = {art: 'backdrop.webp', night: null, size: [3072, 1152], width: 16.4, z: -4.05};

// Pictures and their pixel sizes.
export const ART = {
  'timber-frame-1': [960, 877], 'timber-frame-2': [792, 960], 'stone-wall': [960, 480], 'stone-pillar': [631, 960],
  'minecart': [960, 885], 'oil-lamp': [539, 640], 'barrels': [640, 559], 'crates': [602, 640],
  'fluorite-cluster-1': [640, 520], 'fluorite-cluster-2': [574, 640], 'fluorite-cluster-3': [640, 501],
  'glow-mushrooms-1': [632, 640], 'glow-mushrooms-2': [640, 416], 'ruby-rock': [640, 568],
  'silver-vein-rock-1': [640, 596], 'silver-vein-rock-2': [640, 437],
  'find-silver-ore': [512, 441], 'find-ruby': [488, 512], 'find-fluorite': [512, 467], 'find-crystal': [489, 512],
  // The eighth batch of paintings (10/28).
  'find-amethyst': [477, 512], 'find-fossil': [512, 421], 'find-gold-nugget': [512, 467]
};

// What there is to find here: ore and stones. Silver out of the veined rocks, rubies out of the red one, fluorite
// and little crystals among the glowing clusters; a fossil now and then; a cluster of amethyst and a gold nugget,
// both deep (the first go only feels them).
export const FINDS = {
  'silver-ore': {name: '一块银矿石', art: 'find-silver-ore'},
  'ruby': {name: '一颗红宝石原石', art: 'find-ruby'},
  'fluorite': {name: '一块萤石', art: 'find-fluorite'},
  'crystal': {name: '一小块水晶', art: 'find-crystal'},
  'fossil': {name: '一块菊石化石', art: 'find-fossil'},
  'amethyst': {name: '一簇紫水晶', art: 'find-amethyst', deep: true},
  'gold-nugget': {name: '一粒金块', art: 'find-gold-nugget', deep: true}
};

// Where things hide. Rocks are turned over; the crystal clusters, the barrels and crates, and the minecart looked
// into; the glowing mushrooms lifted.
export const HIDES = {
  rock: {often: 1.4, finds: {'silver-ore': 3, 'fossil': 1.5, 'crystal': 1, 'gold-nugget': .5}},
  crystal: {often: 1.8, finds: {'fluorite': 3, 'crystal': 1.5, 'amethyst': .8}},
  glow: {often: 1.1, finds: {'fluorite': 1, 'crystal': 1, 'fossil': .5}},
  crate: {often: 1.3, finds: {'silver-ore': 1, 'fossil': 1, 'crystal': .6, 'gold-nugget': .6}},
  cart: {often: 1.5, finds: {'silver-ore': 2, 'gold-nugget': .8, 'ruby': .5}}
};
// The rocks with something showing in them give that, mostly.
const ART_FINDS = {
  'ruby-rock': {'ruby': 3, 'crystal': .6}, 'silver-vein-rock-1': {'silver-ore': 3, 'gold-nugget': .6},
  'silver-vein-rock-2': {'silver-ore': 3, 'fossil': 1}
};

// Every piece: its picture, where it stands (x, z) and how tall (h). The timber frames stand over the two ways at the
// back like arches (going under one, dust comes down and he stops for a kiss), the stone wall between them,
// stalagmites in the far corners: all scenery (`still`). The minecart sits on the
// rails; the oil lamp hangs by the fork, only for standing under (`view`).
const still = {still: true};
export const PIECES = piecesOf([
  ['stone-pillar', -6.7, -3.25, 2.8, still], ['timber-frame-1', -2.4, -3.3, 2.3, still], ['stone-wall', 0.1, -3.75, 1.2, still],
  ['timber-frame-2', 2.25, -3.35, 2.4, still], ['stone-pillar', 6.9, -3.3, 2.6, still],
  ['silver-vein-rock-1', 5.05, -2.2, 1.3], ['ruby-rock', 3.3, -2.05, 1.0], ['glow-mushrooms-1', -3.15, -1.95, 0.7],
  ['oil-lamp', 0.8, -1.45, 1.35, {view: true, spot: {at: [-0.2, -0.85], yaw: 0}}], ['minecart', -1.75, -0.7, 1.25], ['crates', -4.1, -1.6, 0.9],
  ['glow-mushrooms-1', 6.25, -0.15, 0.7], ['glow-mushrooms-2', -5.4, 0.35, 0.55], ['crates', 1.65, 0.4, 1.05],
  ['fluorite-cluster-1', 4.4, 1.0, 0.8], ['barrels', 2.85, 0.75, 0.95],
  ['silver-vein-rock-2', -4.95, 0.95, 0.85], ['fluorite-cluster-3', -2.95, 1.0, 0.75], ['glow-mushrooms-2', 1.45, 2.6, 0.55],
  ['silver-vein-rock-2', -1.35, 3.1, 0.7], ['fluorite-cluster-2', -3.6, 3.3, 1.0]
], ART);

// The path painted on the ground (traced off its sandy colour): up from the front to a fork towards the back, one
// way back left and one back right. Where two share a point they meet.
const STEM = [[-0.12, 3.95], [-0.14, 3.16], [-0.1, 1.86], [0.27, 1.1], [0.06, -0.18], [-0.26, -1.04], [-0.2, -1.67]];
const LEFT = [[-0.2, -1.67], [-0.78, -2.22], [-1.44, -2.65], [-2.14, -3.1], [-2.49, -3.36], [-2.75, -3.95]];
const RIGHT = [[-0.2, -1.67], [0.58, -2.21], [1.26, -2.52], [2.04, -3.06], [2.34, -3.26], [2.6, -3.95]];
export const PATHS = [STEM, LEFT, RIGHT];

// What she's told here as they go, and when there's nothing (for a kind of piece, or for one picture).
const GO = {rock: '去敲敲那块石头。', crystal: '去萤石那儿看看。', glow: '去掀开那丛发光的蘑菇看看。', crate: '去木箱木桶那儿翻翻。',
  cart: '去矿车里看看。', 'ruby-rock': '去看看那块嵌着红石头的。', 'oil-lamp': '去油灯底下站一会儿。'};
const NOTHING = {rock: '石头底下只有一点湿湿的碎石。', crystal: '萤石一闪一闪的，后面什么也没有。', glow: '蘑菇底下只有一点青苔，还微微发着光。',
  crate: '桶里箱里都空着，只有一股木头味。', cart: '矿车里只有几粒碎石子。',
  'oil-lamp': '两个人在油灯底下站了一会儿，影子在石壁上挨在一块儿。'};

export const MINE = {
  id: 'mine', name: '矿洞', dir: MINE_DIR, page: PAGE, ground: GROUND, backdrop: BACKDROP, art: ART, pieces: PIECES,
  paths: PATHS, start: pointAt(.3, STEM), firstStop: [0.27, 1.1],
  finds: FINDS, hides: HIDES, artFinds: ART_FINDS, dawn: null, hidden: 7, glints: 2, findH: .6, basket: 5,
  tip: '闪光的先摘；石头翻翻，箱子和矿车里看看。', go: GO, nothing: NOTHING, arch: {say: '从木头架子底下钻过去，落了一身土，他停下来亲了你一口。', moment: '钻过矿洞里的木头架子，他停下来亲了你一口'}, cave: true, enter: '进洞了，里面暗暗的，萤石和油灯亮着。',
  nightView: '洞里只有这盏油灯亮着。他从背后抱住你，两个人的影子在石壁上叠成一个。',
  hugMoment: '在矿洞的油灯底下他从背后抱住了你'
};
