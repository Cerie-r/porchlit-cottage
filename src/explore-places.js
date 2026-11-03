// The places of the exploring book, all together: for the title map (src/explore-cover.jsx), for a page showing a
// basket filled on more than one page, and for the house (what has been found, the diary). Each place's own data is
// its layout (src/explore-*-layout.js).
import {WOODS} from './explore-woods-layout.js';
import {HILL} from './explore-hill-layout.js';
import {LAKE} from './explore-lake-layout.js';
import {TEA} from './explore-tea-layout.js';
import {FIELD} from './explore-field-layout.js';
import {MINE} from './explore-mine-layout.js';
import {DEEP} from './explore-deep-layout.js';
import {cleanExplore} from './explore-trips.js';

// The book's name, on its cover and wherever the house speaks of it.
export const BOOK_TITLE = '出门记';

export const PLACES = {woods: WOODS, hill: HILL, lake: LAKE, tea: TEA, field: FIELD, mine: MINE, deep: DEEP};
// Where each stands on the painted map (public/explore/map.webp), as fractions of its width and height: the woods on the
// left, the flower hill in the middle, the tea hill at the top, the lake on the right with the mine above it, the
// fields at the bottom right; home, the village, at the bottom.
export const ON_MAP = {woods: [.17, .57], hill: [.42, .34], tea: [.29, .13], lake: [.83, .44], field: [.82, .76], mine: [.88, .26], deep: [.08, .76]};
// Some places open later: deep in the woods, once they've been to the woods on three trips.
export const OPENS = {deep: {after: 'woods', trips: 3}};
export const HOME_ON_MAP = [.5, .93];
export const MAP = {art: '/explore/map.webp', size: [3072, 2304]};

export const placeName = id => PLACES[id]?.name || '';
export const findName = (place, id) => PLACES[place]?.finds?.[id]?.name || '';
export const findPicture = (place, id) => (PLACES[place]?.finds?.[id] ? PLACES[place].dir + PLACES[place].finds[id].art + '.webp' : '');
export const NAMES = {place: placeName, find: findName};
// Every find of every place, in the book's order: {place, id, name, picture}.
export const ALL_FINDS = Object.entries(PLACES).flatMap(([place, p]) => Object.keys(p.finds).map(id => ({place, id, name: p.finds[id].name, picture: findPicture(place, id)})));
// What has been brought home from going out, in the book's order, for the album: each find with how many times and
// where from.
export function foundShelf(explore) {
  const found = cleanExplore(explore).found;
  return ALL_FINDS.filter(f => found[`${f.place}:${f.id}`]).map(f => ({...f, n: found[`${f.place}:${f.id}`], from: placeName(f.place)}));
}
// The places on the map for this home now: those open from the start, and those opened by going out (the trip
// they're on counts too).
export function placesOpen(explore, trip = null) {
  const kept = cleanExplore(explore).trips;
  // The trip they're on counts, once (not again when it has come home already).
  const trips = [...kept, ...(trip && !kept.some(l => l.day === trip.day && l.n === trip.n) ? [trip] : [])];
  return Object.keys(ON_MAP).filter(id => !OPENS[id] || trips.filter(t => t.places.includes(OPENS[id].after)).length >= OPENS[id].trips);
}
