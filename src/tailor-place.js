// Where the tailor's corner first stands in a home from before it: beside the craft bench, where it is drawn
// (src/study-room.jsx), unless something already stands there (moved there by hand, or a build); then at the first
// of a few spots nearby where nothing does. Once it has stood somewhere, it stays where it is put.
import {floorPieces, overlapDepth, builtPieces, rangeFor, roomPoint} from './furniture-range.js';

const ID = 'studyTailor';
// Stored offsets from where it is drawn, in the order they are tried: beside the bench, then along the open side,
// a little and a little more towards the front.
const SPOTS = [
  {position: [0, 0, 0], rotationY: 0},
  {position: [0, 0, 1.6], rotationY: 0},
  {position: [0, 0, 2.9], rotationY: 0}
];
const inRange = item => {
  const r = rangeFor(ID, item.rotationY), [X, Z] = roomPoint(ID, item);
  return X >= r.minX - 1e-6 && X <= r.maxX + 1e-6 && Z >= r.minZ - 1e-6 && Z <= r.maxZ + 1e-6;
};
export function tailorSpot(furniture = {}, creations = [], depth = .05) {
  const others = Object.keys(floorPieces).filter(id => id !== ID && floorPieces[id].zone === 'study' && !floorPieces[id].flat && furniture[id]?.position);
  const built = builtPieces(creations, '2F', 'study');
  const free = item => inRange(item) && others.every(id => overlapDepth(ID, item, id, furniture[id]) <= depth) && built.every(b => overlapDepth(ID, item, b.spec, b.item) <= depth);
  const spot = SPOTS.find(free) || SPOTS[0];
  return {position: [...spot.position], rotationY: spot.rotationY};
}
