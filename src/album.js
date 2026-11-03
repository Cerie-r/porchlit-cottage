import {cleanAlbumMemory, stillHidden} from './album-memory.js';
// The album (图鉴): what this home has made, eaten and learned, shelf by shelf.
// It is only for the people who live here: nothing in it is ranked or shown
// to anyone else. Current holdings and the dessert book supply counts; a
// compact discovery record preserves pictures after a gift leaves home.
import {animalOptions, lockedSpecies, speciesLooks, normalizeAnimal} from './animal-state.js';
import {DESSERT_LABELS, dessertRecipe, validDessert} from './dessert-recipe.js';
import {flowerKinds} from './flower-kinds.js';

export const speciesName = species => (speciesLooks[species]?.name || '').replace(/^我的/, '') || species;
const firstDay = days => days.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()[0] || null;
// The one that comes up most (the first of them on a tie).
const most = values => {
  const n = new Map();
  for (const v of values) n.set(v, (n.get(v) || 0) + 1);
  let best = null, count = 0;
  for (const [v, c] of n) if (c > count) {best = v; count = c;}
  return best;
};

// Each shelf is a list of {id, name, have, ...}; `look` is what its picture
// shows (the newest one made), or null while there is none.
export function albumOf(state = {}) {
  const items = Array.isArray(state.creations) ? state.creations.filter(i => i && typeof i === 'object' && !stillHidden(i)) : [];
  const book = Array.isArray(state.dessertBook) ? state.dessertBook.filter(e => validDessert(e?.recipe)) : [];

  const desserts = Object.entries(DESSERT_LABELS.base).map(([base, name]) => {
    const eaten = book.filter(e => e.recipe.base === base);
    const waiting = items.filter(i => i.kind === 'dessert' && i.base === base && validDessert(dessertRecipe(i)));
    const newest = waiting.length ? dessertRecipe(waiting.at(-1)) : eaten.at(-1)?.recipe || null;
    return {id: base, name, have: !!newest, eaten: eaten.length, made: eaten.length + waiting.length, first: firstDay([...eaten.map(e => e.madeOn || e.eatenOn), ...waiting.map(i => i.madeOn)]), look: newest};
  });
  const learned = (Array.isArray(state.dessertRecipes) ? state.dessertRecipes : [])
    .filter(r => validDessert(r?.recipe))
    .map(r => ({id: r.id, name: r.recipe.name, from: r.from, on: r.learnedOn, look: r.recipe}));

  const animals = items.filter(i => i.kind === 'animal').map(i => ({item: i, species: normalizeAnimal(i).species}));
  // A hidden kind only once one has been made.
  const dolls = animalOptions.species.filter(s => !lockedSpecies.has(s) || animals.some(a => a.species === s) || !!state.album?.dolls?.[s]).map(species => {
    const mine = animals.filter(a => a.species === species).map(a => a.item);
    return {id: species, name: speciesName(species), have: mine.length > 0, n: mine.length, first: firstDay(mine.map(i => i.madeOn || i.caught?.on)), look: mine.at(-1) || null};
  });

  const stems = items.filter(i => i.kind === 'bouquet').flatMap(b => Array.isArray(b.stems) ? b.stems : []);
  const flowers = Object.entries(flowerKinds).filter(([id, f]) => f.open || stems.some(s => s.type === id) || !!state.album?.flowers?.[id]).map(([id, f]) => {
    const mine = stems.filter(s => s?.type === id);
    return {id, name: f.name, have: mine.length > 0, n: mine.length, color: most(mine.map(s => s.color).filter(c => typeof c === 'string'))};
  });

  const memory=cleanAlbumMemory(state.album);
  for(const d of dolls){const old=memory.dolls[d.id];if(old&&!d.have){d.have=true;d.look=old.look;}}
  for(const d of desserts){const old=memory.desserts[d.id];if(old&&!d.have){d.have=true;d.look=old.look;}}
  for(const f of flowers){const old=memory.flowers[f.id];if(old&&!f.have){f.have=true;f.color=old.color;}}
  return {desserts, learned, dolls, flowers};
}

// "3 / 5" on a shelf: how many kinds of all there are.
export const shelfCount = shelf => ({have: shelf.filter(x => x.have).length, of: shelf.length});

