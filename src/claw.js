// The claw machine (抓娃娃机) on each street's plaza: a glass cabinet of four
// kinds of doll, most of them this week's (each street goes round the kinds in
// its own order, a new one every Monday; see doll-catch.js), with three old
// friends for company, each in its kind's own colours and in one of its forms
// (ears, sitting or standing, face, slim or chubby). A ticket buys one grab.
// A doll that's caught goes into the backpack as it was in the cabinet, and
// from then on its kind can be made at the doll table, the same as a kind
// someone gave you.
import {animalOptions, speciesLooks, validAnimal} from './animal-state.js';
import {machineDoll, weeklyDolls} from './doll-catch.js';
import {spendTicket} from './tickets.js';

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
export const CABINET = 11;

// The kinds this home has caught or been given, each once, only real ones.
export function cleanCaught(raw) {
  return Array.isArray(raw) ? [...new Set(raw.filter(s => typeof s === 'string' && animalOptions.species.includes(s)))] : [];
}
export function withKind(caught, species) {
  const have = cleanCaught(caught);
  return animalOptions.species.includes(species) && !have.includes(species) ? [...have, species] : have;
}

// A kind's short name: 小羊, 熊猫.
export const kindName = species => (speciesLooks[species]?.name || '').replace(/^我的/, '') || '玩偶';

// The machines count weeks by the home's own day.
const dateOf = day => dayPattern.test(day || '') ? new Date(day + 'T12:00:00Z') : new Date();

// What's in a street's cabinet on a day: this week's doll five times over and
// two of each old friend, shuffled, each in a form of its own.
export function cabinetDolls(day, seed, random = Math.random) {
  const {featured, company} = weeklyDolls(dateOf(day), seed);
  const kinds = [...Array(CABINET - 2 * company.length).fill(featured), ...company.flatMap(s => [s, s])];
  for (let i = kinds.length - 1; i > 0; i--) {const j = Math.floor(random() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]];}
  return {featured, dolls: kinds.map(s => machineDoll(s, random))};
}

// How likely the claw keeps hold of a doll, by how far from its middle the
// claw came down (in the cabinet's own units; a doll is about .17 tall).
export const grabChance = off => !(off >= 0) ? 0 : off < .035 ? .85 : off < .07 ? .5 : 0;

// A ticket in for one grab: {state} with one ticket fewer, or
// {state, problem: 'no_ticket'} with the state untouched.
export function payClaw(state, day) {
  const spent = spendTicket(state?.tickets, 'claw', day);
  return spent ? {state: {...state, tickets: spent}} : {state, problem: 'no_ticket'};
}

// A caught doll goes into the backpack, and its kind is this home's now.
// `id` keeps the same catch from going in twice.
export function keepDoll(state, doll, {day, id} = {}) {
  if (!validAnimal(doll) || typeof id !== 'string' || !id) return state;
  const creations = Array.isArray(state.creations) ? state.creations : [];
  if (creations.some(i => i?.id === id)) return state;
  const item = {...doll, kind: 'animal', id, accessory: [], location: 'bag', slot: 0, ...(dayPattern.test(day || '') ? {caught: {on: day}} : {})};
  return {...state, creations: [...creations, item], caught: withKind(state.caught, doll.species)};
}
