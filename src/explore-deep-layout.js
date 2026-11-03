// Deep in the woods (林子深处), the seventh page of the exploring book (src/explore-book.jsx), which opens once they
// have been to the woods a few times (src/explore-places.js): the painted set (10/28: a moss and leaf floor with roots,
// a narrow sandy path that forks, a stream with stepping stones across it; old trees with moss on them, a cacao
// tree, ferns, a fallen log, glowing mushrooms, mossy rocks, an arch of roots, a beam of light coming down through
// the leaves), where the pieces stand, the paths, and what is to be found where. Data only: walking and looking
// through things are in src/explore-place.js, the same for every page.
//
// Same measure as the other pages: the ground picture laid flat, 16 × 8, x left to right and z back to front. The
// path comes in at the front under an arch of roots, and forks: one way goes up the left into the trees, the other
// over the stepping stones to the far bank, where a way goes on along the stream.
import {piecesOf, pointAt} from './explore-place.js';

export const DEEP_DIR = '/explore/deep-woods/';
const PAGE = {width: 16, depth: 8};
const GROUND = {art: 'ground.webp', size: [3072, 1536]};
// Deeper woods, misty; after dark, the same with more fireflies.
const BACKDROP = {art: 'backdrop-day.webp', night: 'backdrop-night.webp', size: [3072, 1152], width: 16.4, z: -4.05};

// Pictures and their pixel sizes.
export const ART = {
  'tree-ancient-oak': [968, 1024], 'tree-ancient-beech': [968, 1024], 'tree-hollow': [960, 1024], 'tree-cacao': [976, 1024],
  'fallen-log': [960, 486], 'fern-dew': [621, 640], 'fern-large': [640, 568], 'fern-unfurling': [640, 596],
  'glow-mushrooms-1': [601, 640], 'glow-mushrooms-2': [640, 526], 'glow-mushrooms-3': [590, 640],
  'moss-rock-1': [640, 584], 'moss-rock-2': [640, 435], 'moss-rock-3': [611, 640], 'root-arch': [1024, 686], 'sunbeam': [960, 1024],
  'find-cacao': [482, 512], 'find-fern-leaf': [469, 512], 'find-glow-mushroom': [511, 512],
  // The eighth batch of paintings (10/28).
  'find-walnut': [512, 347], 'find-amber': [512, 467], 'find-white-orchid': [449, 512]
};

// What there is to find here. A cacao pod shaken off the cacao tree; a frond of fern; a little mushroom that glows,
// more of them after dark; walnuts; a white orchid among the ferns and a piece of amber, both deep.
export const FINDS = {
  'cacao': {name: '一个可可果', art: 'find-cacao'},
  'fern-leaf': {name: '一片大蕨叶', art: 'find-fern-leaf'},
  'glow-mushroom': {name: '一朵会发光的小蘑菇', art: 'find-glow-mushroom', night: 2},
  'walnut': {name: '两颗野核桃', art: 'find-walnut'},
  'white-orchid': {name: '一枝白色的兰花', art: 'find-white-orchid', deep: true},
  'amber': {name: '一块琥珀', art: 'find-amber', deep: true}
};

// Where things hide. The trees are shaken; the ferns parted; the glowing mushrooms, the log and the rocks lifted.
export const HIDES = {
  tree: {often: 1.2, finds: {'walnut': 2, 'amber': .5}},
  fern: {often: 1.8, finds: {'fern-leaf': 3, 'white-orchid': .9}},
  glow: {often: 1.6, night: 1.5, finds: {'glow-mushroom': 1}},
  log: {often: 1.4, finds: {'glow-mushroom': 1.5, 'walnut': 1.5, 'amber': .5}},
  rock: {often: 1.1, finds: {'walnut': 1, 'white-orchid': .8, 'glow-mushroom': .6, 'amber': .4}}
};
// The cacao tree gives cacao; the hollow one, what's been put by in it.
const ART_FINDS = {'tree-cacao': {'cacao': 1}, 'tree-hollow': {'walnut': 2, 'amber': 1}};

// Every piece: its picture, where it stands (x, z) and how tall (h). The arch of roots stands over the path where they
// come in (going under it, dry leaves come down and he stops for a kiss); the beam of light falls by the fork, only
// for standing in (`view`, drawn as light, `glow`). The cacao tree and a few more are over the stream, on the far
// bank.
export const PIECES = piecesOf([
  ['tree-ancient-oak', -6.85, -2.75, 3.9], ['tree-ancient-beech', -3.05, -3.6, 3.4], ['tree-cacao', 3.2, -3.4, 2.8],
  ['fern-dew', 7.1, -2.8, 1.2], ['glow-mushrooms-3', -5.0, -2.2, 0.75], ['moss-rock-3', 6.9, -1.0, 1.1],
  ['sunbeam', -2.0, -3.1, 3.2, {view: true, glow: true, spot: {at: [-2.6, -2.0], yaw: 0}}], ['fern-dew', -4.5, -1.0, 1.2],
  ['fern-large', -1.6, 0.25, 1.1], ['glow-mushrooms-2', 5.6, 0.25, 0.6], ['tree-hollow', -6.6, 0.6, 3.4],
  ['fallen-log', -3.3, 1.2, 0.75], ['fern-unfurling', 1.95, 1.7, 1.0], ['moss-rock-1', 2.6, 2.9, 0.9],
  ['root-arch', -0.04, 2.25, 1.5, {still: true}], ['glow-mushrooms-1', -2.6, 2.75, 0.7], ['fern-large', -5.4, 2.8, 1.0],
  ['glow-mushrooms-2', 1.5, 3.45, 0.55], ['moss-rock-2', -1.3, 3.45, 0.7]
], ART);

// The paths painted on the ground (traced off their sandy colour): up from the front to a fork; the left one up
// through the trees to the back; the other across the stepping stones, and on along the far bank (not painted: they
// walk on the moss there). Where two share a point they meet.
const STEM = [[-0.1, 3.95], [0.05, 2.96], [-0.07, 1.88], [0.31, 1.0], [0.67, 0.12], [0.36, -0.72]];
const LEFT = [[0.36, -0.72], [-0.4, -1.1], [-1.54, -1.4], [-2.84, -2.44], [-4.4, -2.86], [-5.18, -3.4], [-5.6, -3.95]];
const STONES = [[0.36, -0.72], [0.62, -0.95], [1.3, -0.66], [1.94, -0.44], [2.56, -0.2], [3.2, 0.1], [3.7, 0.3]];
const FAR = [[3.7, 0.3], [4.4, -0.4], [5.0, -1.3], [5.6, -2.4], [6.1, -3.4]];
export const PATHS = [STEM, LEFT, STONES, FAR];

// What she's told here as they go, and when there's nothing (for a kind of piece, or for one picture).
const GO = {tree: '去摇摇那棵老树。', 'tree-cacao': '去摇摇那棵可可树。', fern: '去拨开那丛蕨看看。', glow: '去掀开那丛发光的蘑菇看看。',
  log: '去把那截倒木翻过来看看。', rock: '去翻翻那块长满青苔的石头。', sunbeam: '去那道光里站一会儿。'};
const NOTHING = {tree: '老树晃了晃，只掉下几片叶子和一点青苔。', 'tree-cacao': '可可树晃了晃，果子都还挂着，没熟的。',
  fern: '蕨叶底下只有湿湿的落叶。', glow: '蘑菇底下只有一点青苔，微微地亮。', log: '倒木底下是空的，长着一圈小蘑菇。',
  rock: '青苔底下只有湿泥。', sunbeam: '两个人站在那道光里，光落在你头发上，暖暖的。'};

export const DEEP = {
  id: 'deep', name: '林子深处', dir: DEEP_DIR, page: PAGE, ground: GROUND, backdrop: BACKDROP, art: ART, pieces: PIECES,
  paths: PATHS, start: pointAt(.3, STEM), firstStop: [0.31, 1.0],
  finds: FINDS, hides: HIDES, artFinds: ART_FINDS, dawn: null, hidden: 7, glints: 2, findH: .6, basket: 5,
  tip: '闪光的先摘；蕨拨开看看，老树摇一摇。', go: GO, nothing: NOTHING, night: '天黑了，林子深处到处是萤火虫，发光的蘑菇亮起来了。',
  arch: {say: '从树根搭成的拱门底下走过去，落叶掉了一身，他停下来亲了你一口。', moment: '走过树根搭成的拱门，落叶掉了一身，他停下来亲了你一口'},
  nightView: '夜里那道光换成了月光。他从背后抱住你，萤火虫绕着你们俩飞。',
  hugMoment: '在林子深处的月光里他从背后抱住了你', viewMoment: '在林子深处，站在漏下来的那道光里'
};
