import {notes,houseTaste} from './dessert-taste.js';
import {validDessert,dessertRecipe,sameDessert,isDay,localDay,NOTE_MAX,NAME_MAX} from './dessert-recipe.js';
import {validDish,dishRecipe,dishTaste} from './cooking-recipe.js';

// The kitchen's side of the home: the glass dome on the dining table, the
// dessert book, and the desserts the kitchen has learned. Everything lives in
// the home's one saved state (dessertBook, dessertRecipes); a dessert in the
// dome is an ordinary creation whose location is 'dome'. A dish from the stove
// (src/cooking-recipe.js) goes under the same dome, is eaten the same way and
// gets its page in the same book.

export const BOOK_MAX = 200, LEARNED_MAX = 60;
export const DOME = 'dome';
export const freshDessertState = () => ({dessertBook: [], dessertRecipes: []});

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const validBy = by => plain(by) && (by.kind === 'self' || ['machine', 'guest'].includes(by.kind) && typeof by.name === 'string' && by.name.trim() && by.name.length <= NAME_MAX);
const validEntry = e => plain(e) && typeof e.id === 'string' && (validDessert(e.recipe) || validDish(e.recipe)) && isDay(e.eatenOn) && (e.madeOn === undefined || isDay(e.madeOn)) && validBy(e.by) && (e.note === undefined || typeof e.note === 'string' && e.note.length <= NOTE_MAX);
const validLearned = r => plain(r) && typeof r.id === 'string' && validDessert(r.recipe) && typeof r.from === 'string' && r.from.trim() && r.from.length <= NAME_MAX && isDay(r.learnedOn);

// What a saved home has of these. An older home has none and starts with an
// empty book; anything that isn't a proper entry is left out.
export function loadDessertState(saved = {}) {
  return {
    dessertBook: Array.isArray(saved?.dessertBook) ? saved.dessertBook.filter(validEntry).slice(-BOOK_MAX).map(cleanPageDetails) : [],
    dessertRecipes: Array.isArray(saved?.dessertRecipes) ? saved.dessertRecipes.filter(validLearned).slice(-LEARNED_MAX) : []
  };
}

// What can go under the dome and be eaten: a dessert or a dish.
export const EATEN = ['dessert', 'dish'];
export const domeItem = creations => (creations || []).find(i => i.location === DOME && EATEN.includes(i.kind)) || null;

// A dessert (or a dish) goes under the glass dome; the dome holds one, so
// whatever was there goes back into the backpack.
export function putInDome(creations, id) {
  const items = creations || [], item = items.find(i => i.id === id);
  if (!item || !EATEN.includes(item.kind) || item.location === DOME) return items;
  return items.map(i => i.id === id ? {...i, location: DOME, slot: 0, spotId: undefined} : i.location === DOME ? {...i, location: 'bag', slot: 0} : i);
}

// One page of the dessert book: what it looked like (the recipe; its picture
// is taken when the page is turned to), who made it, when, and the words on
// its tag.
export function bookEntry(item, eatenOn, context = {}) {
  if (item?.kind === 'dish') return {taste: dishTaste(item, context), id: item.id, recipe: dishRecipe(item), by: validBy(item.by) ? item.by : {kind: 'self'}, ...(isDay(item.madeOn) ? {madeOn: item.madeOn} : {}), eatenOn, ...(item.note?.trim() ? {note: item.note.trim()} : {})};
  return {notes:notes(item),taste:houseTaste(item,{...context,eatenOn}),id: item.id, recipe: dessertRecipe(item), by: validBy(item.by) ? item.by : {kind: 'self'}, ...(isDay(item.madeOn) ? {madeOn: item.madeOn} : {}), eatenOn, ...(item.note?.trim() ? {note: item.note.trim()} : {})};
}

// Eating a dessert someone else made teaches the kitchen to make it, with a
// line saying who it was learned from. Desserts made here, and ones already
// known, add nothing.
export function learnDessert(recipes, item, on) {
  const list = recipes || [], by = item?.by;
  if (item?.kind !== 'dessert' || !by || by.kind === 'self' || !validBy(by) || !validDessert(dessertRecipe(item))) return list;
  if (list.some(r => sameDessert(r.recipe, item))) return list;
  return [...list, {id: item.id, recipe: dessertRecipe(item), from: by.name.trim(), learnedOn: on}].slice(-LEARNED_MAX);
}

// After the two of them have eaten it: the dessert is gone, the book keeps a
// page for it (the oldest pages make way after two hundred), and a dessert
// from someone else is learned.
export function finishMeal(state, id, eatenOn = localDay(), context = {}) {
  const item = (state.creations || []).find(i => i.id === id && EATEN.includes(i.kind));
  if (!item) return state;
  return {
    ...state,
    creations: state.creations.filter(i => i.id !== id),
    dessertBook: [...(state.dessertBook || []), bookEntry(item, eatenOn, context)].slice(-BOOK_MAX),
    dessertRecipes: learnDessert(state.dessertRecipes, item, eatenOn)
  };
}


export const TASTE_WORD_MAX = 160;
// String.prototype.toWellFormed is recent (Safari 16.4); an older browser reading a saved home must
// not throw here, or the whole home would load as a fresh one. Lone surrogates become U+FFFD.
const wellFormed = s => {
  if (typeof s.toWellFormed === 'function') return s.toWellFormed();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) { out += s[i] + s[i + 1]; i++; } else out += '�';
    } else out += c >= 0xdc00 && c <= 0xdfff ? '�' : s[i];
  }
  return out;
};
export const cleanTasteWords = value => typeof value === 'string' ? [...wellFormed(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'')].slice(0,TASTE_WORD_MAX).join('') : '';
function cleanPageDetails(page) {
  const out={...page};
  if(page.notes) {const n=page.notes; if(n&&['top','heart','base'].every(k=>typeof n[k]==='string'))out.notes=Object.fromEntries(['top','heart','base'].map(k=>[k,cleanTasteWords(n[k])]));else delete out.notes;}
  if(page.taste!==undefined)out.taste=cleanTasteWords(page.taste);
  if(page.words!==undefined){const words={};for(const who of ['self','machine']){const value=cleanTasteWords(page.words?.[who]).trim();if(value)words[who]=value;}out.words=words;}
  return out;
}
// Editing one person's margin never overwrites the other's words or the
// printed taste. An empty line erases only that person's inscription.
export function writeTasteWords(state,id,value) {
  if(!state.dessertBook?.some(p=>p.id===id))return state;
  const text=cleanTasteWords(value).trim();
  return {...state,dessertBook:state.dessertBook.map(p=>{if(p.id!==id)return p;const words={...p.words};if(text)words.self=text;else delete words.self;return {...p,words};})};
}
