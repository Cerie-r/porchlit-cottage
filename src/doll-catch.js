import {animalOptions,speciesEars,speciesLooks,lockedSpecies,starterSpecies,freshAnimal} from './animal-state.js';

// What the claw machine needs from the dolls: which kinds a home can make,
// which doll is this week's in a street's machine, and what a doll looks like
// when it's caught. A home starts with the bear; every kind it catches (or is
// given) can then be made in the craft room with anything it likes.

// Kinds that go round the machine week by week: everything but the bear
// (every home has one) and the locked ones (the dragon waits for a holiday).
export const catchable = animalOptions.species.filter(s => !starterSpecies.includes(s) && !lockedSpecies.has(s));

// Kinds the craft room offers. With no list of what's been caught yet, every
// kind that isn't locked; with one, the bear plus what's been caught or given,
// locked kinds included once caught.
export function availableSpecies(caught = null) {
  if (!caught) return animalOptions.species.filter(s => !lockedSpecies.has(s));
  const have = new Set([...starterSpecies, ...caught]);
  return animalOptions.species.filter(s => have.has(s));
}

// A small seeded random, so a street's machine comes out the same every time
// for the same seed.
export function seeded(seed = 1) {
  let a = seed >>> 0 || 1;
  return () => {a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296;};
}
// The forms a doll in the machine can come in: either of its kind's ears, sitting or standing (holding flowers wants
// flowers to hold), any face, slim or chubby. Never its colours.
export const MACHINE_FORMS = {pose: animalOptions.pose.filter(p => p !== 'hold'), expression: animalOptions.expression, body: animalOptions.body};

// The doll that comes out of the machine: its kind in its own colours. Given `random`, in one of the forms above, so a
// cabinet isn't the same doll five times over; without, as every doll of the kind starts. Catching one only lets its
// kind be made at the doll table; what dolls wear comes out of the capsule machine.
export function machineDoll(species, random = null) {
  const look = speciesLooks[species];
  if (!look) return null;
  const any = list => list[Math.floor(random() * list.length)];
  const form = random ? {ears: any(speciesEars[species]), pose: any(MACHINE_FORMS.pose), expression: any(MACHINE_FORMS.expression), body: any(MACHINE_FORMS.body)} : {ears: speciesEars[species][0], pose: 'sit'};
  return {...freshAnimal(), species, name: look.name, fur: look.fur, cream: look.cream, patch: look.patch, ...form, accessory: [], bricks: []};
}

// This week's doll in a street's machine, and three old friends to keep it
// company. Weeks start on Monday; each street (its map's seed) goes round the
// kinds in its own order, so a different street can have a different doll the
// same week.
const WEEK = 7 * 24 * 3600 * 1000, FIRST_MONDAY = Date.UTC(2026, 9, 19);
export function weeklyDolls(date = new Date(), seed = 0) {
  const week = Math.floor((+date - FIRST_MONDAY) / WEEK), rand = seeded(seed + 1), order = [...catchable];
  for (let i = order.length - 1; i > 0; i--) {const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]];}
  const at = k => order[((week + k) % order.length + order.length) % order.length];
  return {week, featured: at(0), company: [at(1), at(2), at(3)]};
}
