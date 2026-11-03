// What happens when a puzzle folder (puzzle-folder.js) opens: the day is kept
// with the computer's own data (computer.solved), a ticket comes, and a folder
// that holds a key hands it over too. The castle folder's key is a small thing
// written in the brick language (brick-recipe.js) like everything that's made,
// so it can sit on a shelf, hide in a drawer or go to a neighbour's door.
import {freshBuild, validRecipe} from './brick-recipe.js';
import {CASTLE} from './puzzle-folder.js';
import {earnTicket} from './tickets.js';

const part = ([p, x, y, z, w, d, h, c, more], i) => ({id: `k${i}`, p, x, y, z, w, d, h, turn: 0, c, ...(more || {})});
// Four quarter-rounds make a round.
const round = (x, y, z, h, c) => [['curve', x, y, z, 2, 2, h, c, {turn: 2}], ['curve', x + 2, y, z, 2, 2, h, c, {turn: 1}], ['curve', x, y, z + 2, 2, 2, h, c, {turn: 3}], ['curve', x + 2, y, z + 2, 2, 2, h, c, {turn: 0}]];

// Lying flat: a round bow set with a wisteria-coloured stone, a collar, the
// shaft, and a notched bit.
export const castleKey = () => ({...freshBuild(), name: '城堡的钥匙', scale: 'small', parts: [
  ...round(6, 0, 2, 1, 'gold'),
  ['disc', 7, 1, 3, 2, 2, 1, 'lilac'],
  ['disc', 6, 0, 6, 1, 1, 1, 'gold'], ['disc', 9, 0, 6, 1, 1, 1, 'gold'],
  ['tile', 7, 0, 6, 2, 6, 1, 'gold'],
  ['plate', 9, 0, 9, 1, 3, 1, 'gold'],
  ['plate', 10, 0, 9, 1, 1, 1, 'gold'], ['plate', 10, 0, 11, 1, 1, 1, 'gold']
].map(part)});

// The folders that hold a key, and the key.
const keys = {[CASTLE]: castleKey};
export const folderKey = id => Object.hasOwn(keys, id) ? keys[id]() : null;

// The home once folder `id` has opened on `day`; unchanged if it was open
// already, so nothing comes twice. A key goes in at the top of the backpack,
// where it is the first thing seen. `newId` names it.
export function openFolder(state, id, {day, newId = () => crypto.randomUUID()}) {
  const computer = state.computer || {};
  if (computer.solved?.[id]) return state;
  const key = folderKey(id), creations = Array.isArray(state.creations) ? state.creations : [];
  return {
    ...state,
    computer: {...computer, solved: {...(computer.solved || {}), [id]: day}},
    tickets: earnTicket(state.tickets, 'puzzle', day),
    ...(key && validRecipe(key) ? {creations: [{...key, id: newId(), location: 'bag', slot: 0, folder: {id, on: day}}, ...creations]} : {})
  };
}

// What the folder says it gave, just after it opens.
export const openedWords = id => {
  const key = folderKey(id);
  return key ? `得了一张券，还有一把${key.name}，都在背包最上面。` : '得了一张券，放在背包最上面。';
};
