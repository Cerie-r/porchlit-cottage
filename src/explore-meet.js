// Who the two of them might meet on a page (the fourth and fifth batches of paintings): a little fox, a hedgehog, an egret by
// the lake; and butterflies over the flowers by day. One at most on a walk, by the walk's own seed, only at the time
// of day it's about (a fox curled up asleep after dark, the egret by day). When they come near, it does what it
// does: the hedgehog curls up into a ball, the egret flies off; and the diary keeps it. Pure: src/explore-book.jsx
// draws them.
import {seeded} from './explore-place.js';

export const ANIMALS_DIR = '/explore/animals/';
// Pictures and their pixel sizes.
export const ANIMAL_ART = {
  'fox-sitting': [456, 640], 'fox-walking': [640, 443], 'fox-sleeping': [640, 414], 'hedgehog': [512, 440], 'hedgehog-ball': [512, 499],
  'egret-lakeside': [417, 640], 'egret-flying': [426, 640],
  'butterfly-blue-open': [256, 170], 'butterfly-blue-closed': [219, 256], 'butterfly-blush-open': [256, 193],
  'butterfly-blush-closed': [224, 256], 'butterfly-lavender-open': [256, 197], 'butterfly-lavender-closed': [202, 256]
};

// Each one: its picture, how tall it stands, when it's about, how near they come before it notices (then: the picture
// it changes to; flies: it goes up and away), what she's told, and what the diary keeps ({at}: where on the page,
// said as 林子里, 湖边…).
const FOX = {art: 'fox-sitting', h: .7, when: 'day', near: 1.5, say: '路边坐着一只小狐狸，歪着头看你们。', moment: '在{at}碰见一只小狐狸，歪着头看你们'};
const FOX_ASLEEP = {art: 'fox-sleeping', h: .42, when: 'night', near: 1.5, say: '一只小狐狸蜷成一团睡着了。两个人放轻了脚步。', moment: '在{at}碰见一只睡着的小狐狸，放轻了脚步'};
const HEDGEHOG = {art: 'hedgehog', then: 'hedgehog-ball', h: .5, when: 'any', near: 1.3, say: '草里一只小刺猬，看见你们，一下子缩成了一个刺球。', moment: '在{at}碰见一只小刺猬，一下子缩成了刺球'};
const EGRET = {art: 'egret-lakeside', then: 'egret-flying', flies: true, h: .95, when: 'day', near: 1.9, say: '浅水里站着一只白鹭。你们一走近，它扑啦一下飞走了。', moment: '湖边的白鹭扑啦一下飞走了'};

// Where, page by page: near a path, clear of the pieces (the egret in the shallows).
export const MEETS = {
  woods: {at: '林子里', meets: [{...FOX, at: [-3.75, -0.35]}, {...FOX_ASLEEP, at: [-5.75, 2.65]}, {...HEDGEHOG, at: [0, 0.4]}]},
  hill: {at: '花坡上', meets: [{...FOX, at: [0, 0.15]}, {...FOX_ASLEEP, at: [6, 2.65]}, {...HEDGEHOG, at: [-4, 2.4]}]},
  lake: {at: '湖边', meets: [{...EGRET, at: [-1.75, -2.1]}, {...FOX_ASLEEP, at: [-6, 1.65]}, {...HEDGEHOG, at: [0, 1.15]}]},
  tea: {at: '茶山上', meets: [{...FOX, at: [2.75, -1.35]}, {...FOX_ASLEEP, at: [-3, 0.4]}, {...HEDGEHOG, at: [-0.25, 1.65]}]},
  field: {at: '田边', meets: [{...FOX, at: [-3.75, -1.85]}, {...FOX_ASLEEP, at: [4.75, -2.1]}, {...HEDGEHOG, at: [1, 2.65]}]},
  deep: {at: '林子深处', meets: [{...FOX, at: [3.75, 1.15]}, {...FOX_ASLEEP, at: [-4, -1.85]}, {...HEDGEHOG, at: [0, 0.15]}]}
};
// How often a walk meets anyone at all.
export const MEET_CHANCE = .6;

const fits = (m, light) => m.when === 'any' || (m.when === 'night' ? light === 'night' : light === 'day' || light === 'dawn');

// Who they meet on this walk (seed), at this light ('day', 'dawn', 'night' or 'cave'), or null: {art, then, flies,
// h, near, at, say, moment}, the moment said with where.
export function meetOn(seed, placeId, light) {
  const page = MEETS[placeId], rand = seeded((seed ^ 0x5bd1e995) >>> 0);
  if (!page || rand() >= MEET_CHANCE) return null;
  const can = page.meets.filter(m => fits(m, light));
  if (!can.length) return null;
  const m = can[Math.floor(rand() * can.length)];
  return {...m, moment: m.moment.replace('{at}', page.at)};
}

// Butterflies over the flowers, by day on the pages with flowers: two or three, each its colour and where it hovers.
const FLOWERY = {woods: [[-1.0, 1.9], [4.9, 0.9]], hill: [[-2.0, 0.9], [2.4, 0.4], [4.8, 1.6]], tea: [[1.6, 0.9], [-2.2, 1.9]], field: [[-1.6, 0.6], [2.2, 2.2]]};
const COLOURS = ['blue', 'blush', 'lavender'];
export function butterfliesOn(seed, placeId, light) {
  const spots = FLOWERY[placeId];
  if (!spots || !(light === 'day' || light === 'dawn')) return [];
  const rand = seeded((seed ^ 0x27d4eb2f) >>> 0);
  return spots.filter(() => rand() < .75).map((at, i) => ({at, colour: COLOURS[Math.floor(rand() * COLOURS.length)], phase: i * 2.1 + rand() * 6}));
}
