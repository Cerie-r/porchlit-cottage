// The blind box machine (盲盒机) on each street's plaza: a little porch with
// six wrapped boxes in its window. A ticket in, the porch lamp goes on, and you
// pick a box by shaking it and listening: what's inside answers (glass rings,
// wood knocks, something soft goes pff). The one you keep comes out of the
// door, and inside is a thing for the house, written in the brick language
// (brick-recipe.js) like everything else that's made, so it goes into the
// backpack, out into a room, and to a neighbour's door like any build. One box
// in twelve holds this season's secret.
import {freshBuild, validRecipe} from './brick-recipe.js';
import {spendTicket} from './tickets.js';

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
export const HIDDEN_ODDS = 1 / 12;

function build(name, scale, list) {
  return {...freshBuild(), name, scale, parts: list.map(([p, x, y, z, w, d, h, c, more], i) => ({id: `b${i}`, p, x, y, z, w, d, h, turn: 0, c, ...(more || {})}))};
}
// Four quarter-rounds make a round.
const round = (x, y, z, h, c) => [['curve', x, y, z, 2, 2, h, c, {turn: 2}], ['curve', x + 2, y, z, 2, 2, h, c, {turn: 1}], ['curve', x, y, z + 2, 2, 2, h, c, {turn: 3}], ['curve', x + 2, y, z + 2, 2, 2, h, c, {turn: 0}]];

// This season: what a box can hold, what it sounds like shaken, and the
// secret one. `sounds` are names in sounds.js, the second a moment after.
export const SEASON = {
  id: 'porch-1',
  items: [
    {id: 'lamp', name: '小台灯', sounds: ['glass', 'glass'], hint: '叮叮的，像玻璃', recipe: () => build('小台灯', 'small', [
      ...round(6, 0, 6, 1, 'cream'),
      ['lathe', 7, 1, 7, 2, 2, 10, 'gold', {profile: 'column'}],
      ['lathe', 6, 11, 6, 4, 4, 6, 'blush', {profile: 'shade', mat: 'glow'}]
    ])},
    {id: 'cushion', name: '圆坐垫', sounds: ['cloth', 'cloth'], hint: '噗噗的，软软的', recipe: () => build('圆坐垫', 'furniture', [
      ...round(6, 0, 6, 3, 'blush'),
      ['disc', 7, 3, 7, 2, 2, 1, 'cream']
    ])},
    {id: 'stool', name: '小木凳', sounds: ['wood', 'wood'], hint: '哒哒的，像木头', recipe: () => build('小木凳', 'furniture', [
      ...[[6, 6], [9, 6], [6, 9], [9, 9]].flatMap(([x, z]) => [['round', x, 0, z, 1, 1, 3, 'wood'], ['round', x, 3, z, 1, 1, 3, 'wood']]),
      ['plate', 6, 6, 6, 4, 4, 1, 'wood'],
      ...round(6, 7, 6, 1, 'sage')
    ])},
    {id: 'vase', name: '小花瓶', sounds: ['glass', 'glass'], hint: '叮叮的，像玻璃', recipe: () => build('小花瓶', 'small', [
      ['disc', 7, 0, 7, 2, 2, 1, 'gold'],
      ['lathe', 7, 1, 7, 2, 2, 8, 'blush', {profile: 'vase', mat: 'glass'}],
      ['flower', 7, 9, 7, 1, 1, 1, 'white'], ['flower', 8, 9, 8, 1, 1, 1, 'white'], ['flower', 7, 9, 8, 1, 1, 1, 'cream'],
      ['leaf', 8, 9, 7, 1, 2, 1, 'sage', {turn: 1}]
    ])},
    {id: 'jar', name: '糖果罐', sounds: ['glass', 'tap'], hint: '叮的一声，里面还有小颗粒滚来滚去', recipe: () => build('糖果罐', 'small', [
      ['plate', 6, 0, 6, 3, 3, 1, 'gold'],
      ['lathe', 6, 1, 6, 3, 3, 6, 'blush', {profile: 'jar', mat: 'glass'}],
      ['disc', 7, 7, 7, 2, 2, 1, 'rose'],
      ['lathe', 7, 8, 7, 1, 1, 2, 'gold', {profile: 'bead'}]
    ])},
    {id: 'daisies', name: '雏菊小盆', sounds: ['knock', 'cloth'], hint: '咚的一下，闷闷的，像一捧土', recipe: () => build('雏菊小盆', 'small', [
      ['lathe', 6, 0, 6, 3, 3, 4, 'rose', {profile: 'jar'}],
      ['disc', 7, 4, 7, 2, 2, 1, 'ink'],
      ['flower', 7, 5, 7, 1, 1, 1, 'white'], ['flower', 8, 5, 8, 1, 1, 1, 'white'], ['flower', 8, 5, 7, 1, 1, 1, 'white'],
      ['leaf', 7, 5, 8, 1, 2, 1, 'sage']
    ])}
  ],
  hidden: {id: 'lantern', name: '门廊小灯', sounds: ['porchLight'], hint: '咔哒一声，里面好像亮了一下', recipe: () => build('门廊小灯', 'small', [
    ['plate', 6, 0, 6, 4, 4, 1, 'ink'],
    ...[[6, 6], [9, 6], [6, 9], [9, 9]].flatMap(([x, z]) => [['round', x, 1, z, 1, 1, 3, 'ink'], ['round', x, 4, z, 1, 1, 3, 'ink']]),
    ['lathe', 7, 1, 7, 2, 2, 6, 'cream', {profile: 'jar', mat: 'glow'}],
    ['plate', 6, 7, 6, 4, 4, 1, 'ink'],
    ['disc', 7, 8, 7, 2, 2, 1, 'ink'],
    ['lathe', 7, 9, 7, 1, 1, 2, 'gold', {profile: 'bead'}]
  ])}
};
const ALL = [...SEASON.items, SEASON.hidden];
export const boxThing = id => ALL.find(t => t.id === id) || null;

// What goes in a new box: the secret one now and then, else any of the six.
export function fillBox(random = Math.random) {
  if (random() < HIDDEN_ODDS) return SEASON.hidden.id;
  return SEASON.items[Math.min(SEASON.items.length - 1, Math.floor(random() * SEASON.items.length))].id;
}

// What a home has found so far, each once.
export function cleanBlindBox(raw) {
  const found = Array.isArray(raw?.found) ? [...new Set(raw.found.filter(id => typeof id === 'string' && boxThing(id)))] : [];
  return {found};
}

// A ticket in: {state} with one fewer, or {state, problem: 'no_ticket'}.
export function payBox(state, day) {
  const spent = spendTicket(state?.tickets, 'blindbox', day);
  return spent ? {state: {...state, tickets: spent}} : {state, problem: 'no_ticket'};
}

// The thing in the chosen box goes into the backpack. `id` keeps the same box
// from going in twice. Opening the same thing again is another of it: a
// second lamp is a lamp to give away.
export function keepThing(state, thingId, {day, id} = {}) {
  const thing = boxThing(thingId), creations = Array.isArray(state.creations) ? state.creations : [];
  if (!thing || typeof id !== 'string' || !id || creations.some(i => i?.id === id)) return state;
  const recipe = thing.recipe();
  if (!validRecipe(recipe)) return state;
  const box = cleanBlindBox(state.blindbox);
  const item = {...recipe, id, location: 'bag', slot: 0, ...(dayPattern.test(day || '') ? {blindbox: {on: day}} : {})};
  return {...state, creations: [...creations, item], blindbox: {...box, found: box.found.includes(thing.id) ? box.found : [...box.found, thing.id]}};
}
