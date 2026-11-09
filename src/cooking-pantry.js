import {left, shown, stockName, PRODUCE_WHERE} from './bench-stock.js';
import {INGREDIENTS, EXTRA_PRODUCE} from './cooking-recipe.js';

// The backpack's 食材: what came in from going out and hasn't been cooked yet, with its picture from the exploring
// book. Only what has ever been brought home (or was in the fridge from the start) is listed, even once it is used up.
// The pictures are the places' own (src/explore-*-layout.js), named here so the backpack needn't load those pages.
const ART = {
  tomato: 'field/find-tomato', greens: 'field/find-greens', pumpkin: 'field/find-pumpkin', pea: 'field/find-pea-pod',
  taro: 'field/find-taro-root', wheat: 'field/find-wheat-ear', bamboo: 'tea/find-bamboo', tea: 'tea/find-tea-sprig',
  honey: 'woods/find-honeycomb', pinenut: 'woods/find-pinecone', walnut: 'deep-woods/find-walnut'
};
const DIR = '/explore/';
const row = (stock, id, produce, name) => ({id, name, left: left(stock, 'produce', produce), art: `${DIR}${ART[id]}.webp`, where: PRODUCE_WHERE[produce] || '田里'});
export function pantryOf(stock) {
  return [
    ...Object.entries(INGREDIENTS).filter(([, i]) => !i.staple && shown(stock, 'produce', i.produce)).map(([id, i]) => row(stock, id, i.produce, stockName('produce', i.produce))),
    ...Object.entries(EXTRA_PRODUCE).filter(([, p]) => shown(stock, 'produce', p)).map(([id, p]) => row(stock, id, p, stockName('produce', p)))
  ];
}
