// A piece, an outfit or a hairstyle from the capsule machine pictured in the
// colourway it comes in, from the front as the wardrobe photographs its cards
// (whose photographs, public/wardrobe/, show only the first colourway; a
// hairstyle has none). Drawn when asked for and kept for the visit, like the
// other little pictures.
import * as THREE from 'three';
import {drawObjects, cachedPictures} from './brick-pictures.js';
import {accessoryById, paintAccessory} from '../body/accessory-registry.js';
import {extraOutfits, colorwaysOf, paintOutfit} from '../body/outfit-registry.js';
import {hairById} from '../body/hair-registry.js';
import {HAIR_BROWN} from './capsule-catalog.js';

export const pictureKey = p => `capsule:${p.kind}:${p.id}:${p.way}`;
// The wardrobe's own photograph, in the first colourway: shown while the right one is drawn. None for a hairstyle.
export const photoOf = p => p.kind === 'hair' ? '' : `/wardrobe/${p.kind === 'outfit' ? 'outfit' : 'accessory'}-${p.id}.webp`;
export const pictured = p => !!p && (p.kind === 'piece' || p.kind === 'outfit' || p.kind === 'hair');

// The piece, outfit or hairstyle itself, in its colourway, in its own units.
export function prizeModel(p) {
  if (p.kind === 'hair') {
    const hair = hairById(p.id);
    if (!hair) return new THREE.Group();
    // In the hair's own brown; with no head inside, its inside shows through the face opening, so both sides are
    // drawn and it reads as hair, as the wardrobe photographs it (body/item-thumbnails.js).
    return hair.create(new THREE.MeshStandardMaterial({color: HAIR_BROWN, roughness: .78, side: THREE.DoubleSide}));
  }
  if (p.kind === 'piece') {
    const piece = accessoryById(p.id);
    if (!piece) return new THREE.Group();
    const g = piece.create();
    paintAccessory(g, p.id, p.way);
    return g;
  }
  const outfit = extraOutfits.find(o => o.id === p.id);
  if (!outfit) return new THREE.Group();
  const g = outfit.build();
  paintOutfit(g, colorwaysOf(p.id).find(w => w.id === p.way)?.colors);
  return g;
}

// The pictures of these ({kind, id, way}), drawing any not drawn yet: {key: image URL}.
export function prizePictures(list) {
  const wanted = list.filter(pictured);
  if (!wanted.length) return {};
  try { return drawObjects(Object.fromEntries(wanted.map(p => [pictureKey(p), () => prizeModel(p)])), {view: [0, .22, 1], size: 168}); } catch { return cachedPictures(wanted.map(pictureKey)); }
}
export const knownPictures = list => cachedPictures(list.map(pictureKey));
