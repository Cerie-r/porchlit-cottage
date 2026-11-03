import {left, shown} from './bench-stock.js';
import {INGREDIENTS} from './cooking-recipe.js';

// The backpack's 食材: what came in from the fields and hasn't been cooked yet, with its picture from the exploring
// book. Only what has ever been brought home (or was in the fridge from the start) is listed, even once it is used up.
// The pictures are the fields' own (src/explore-field-layout.js), named here so the backpack needn't load that page.
const ART = {tomato: 'find-tomato', greens: 'find-greens', pumpkin: 'find-pumpkin', pea: 'find-pea-pod'}, FIELD_DIR = '/explore/field/';
export function pantryOf(stock) {
  return Object.entries(INGREDIENTS).filter(([, i]) => !i.staple && shown(stock, 'produce', i.produce))
    .map(([id, i]) => ({id, name: i.name, left: left(stock, 'produce', i.produce), art: `${FIELD_DIR}${ART[id]}.webp`}));
}
