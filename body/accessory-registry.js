import {publicAccessories} from './accessory-pieces.js';
import {braidTies} from './accessory-tools.js';
// Headwear beyond her satin bow and his wool beret (body/accessories.js), glasses, and what is worn at
// the neck or on the chest, register here: the public pieces (body/accessory-pieces.js, registered
// below) and a home's own pieces in src/ours/*.accessory.js (not part of the public release;
// body/ours-outfits.js collects them). An entry is
//   {id, name, wearers: ['girl'|'boy'], create() -> THREE.Group, place(object, hair, worn), slot?,
//    picture?, drawing?, hat?, hidesCurl?, homeOnly?, colorways?, paint?, covers?, outOn?, gift?, pool?}
// create() builds it in its own units; place() seats it on a hairstyle made in head units (as
// placeAccessories does the bow and the beret), on the same terms; the head is centred on the hair
// and as wide as the hair's scale times .86, so something worn on the face is placed from it too.
// slot is where it is worn: 'head' (the default; one headwear at a time, the bow and the beret
// among them), 'face' (glasses), 'neck' (a scarf, a bow tie), 'chest' (a brooch, a pocket square) or
// 'braid' (at the end of each braid, where the hairstyle has braids: a hair tie, a ribbon): one in
// each slot at a time, worn together. Something at the neck or on the chest sits on the
// clothes: place() is given worn = {body, outfit}, the body's skin mesh and the outfit being worn,
// both in the same coordinates as the piece (see body/accessory-tools.js). It keeps its own colours:
// the headwear colour in the wardrobe is the bow's or the beret's. colorways, when a piece comes in
// several, are [{id, name, colors: {main, accent, trim}}], the first being the colours it is built
// in, and paint(object, colors) gives it one. hat: it goes over the top of the head and the hair
// (rather than resting on the hair, as a clip does); a number says how far down the hair it covers,
// as a share of the hair's height from its top (a quarter if not said: less for a beret worn tipped).
// hidesCurl: wearing it hides the hairstyle's little curl, as the beret does. covers: the names of an
// outfit's parts it is worn in place of, hidden while it is on (a bow tie covers a necktie named
// 'tie'; see coverOutfit in body/accessories.js). homeOnly: see outfit-registry.js; here it names
// what is worn instead outside the home (or 'none'). outOn, gift, pool: as for an outfit (see
// outfit-registry.js).
export const SLOTS = ['head', 'face', 'neck', 'chest', 'braid'];
// The slots besides the headwear: what is worn in each is kept in a look under the slot's own name.
export const PIECE_SLOTS = SLOTS.slice(1);
// The wardrobe card of a piece worn in each slot carries data-<this>="<id>".
export const cardKey = slot => slot === 'head' ? 'accessory' : slot;
export const extraAccessories = [];
const publicIds = new Set();

export function registerAccessories(list = []) {
  for (const a of list) if (a?.id && !['none', 'bow', 'beret'].includes(a.id) && typeof a.create === 'function' && typeof a.place === 'function' && Array.isArray(a.wearers) && SLOTS.includes(a.slot || 'head') && !extraAccessories.some(x => x.id === a.id)) extraAccessories.push(a);
  return extraAccessories;
}

export const accessoryById = id => extraAccessories.find(a => a.id === id);
export const slotOf = id => accessoryById(id)?.slot || 'head';
// Whether a piece shows with this hairstyle: what goes on the braids needs a hairstyle with braids.
export const showsWith = (id, hair) => slotOf(id) !== 'braid' || braidTies(hair).length > 0;
// The headwear a resident may choose: the base one first (her bow, his beret), then the registered ones.
export const headwearFor = kind => [kind === 'boy' ? 'beret' : 'bow', ...extraAccessories.filter(a => a.wearers.includes(kind) && slotOf(a.id) === 'head').map(a => a.id)];
// What a resident may wear in a slot ('none' is always a choice too, and on the head the base one).
export const piecesFor = (kind, slot) => slot === 'head' ? headwearFor(kind) : extraAccessories.filter(a => a.wearers.includes(kind) && slotOf(a.id) === slot).map(a => a.id);
// The glasses a resident may choose (none is always a choice too).
export const glassesFor = kind => piecesFor(kind, 'face');
// Everything a resident may wear, in every slot.
export const wearablesFor = kind => SLOTS.flatMap(slot => piecesFor(kind, slot));
// A home's own piece (its card and picture stay out of the public files), as against a public one.
export const isHomeAccessory = id => !!accessoryById(id) && !publicIds.has(id);
// Whether wearing this headwear hides the hairstyle's curl.
export const hidesCurl = id => id === 'beret' || !!accessoryById(id)?.hidesCurl;

// Optional preset palettes retain independently painted details.
export const accessoryColorwaysOf = id => accessoryById(id)?.colorways || [];
export function paintAccessory(root, id, way) {
  const entry = accessoryById(id), palette = accessoryColorwaysOf(id);
  const selected = palette.find(w => w.id === way) || palette[0];
  if (root && selected) entry.paint?.(root, selected.colors);
}

registerAccessories(publicAccessories);
for (const a of publicAccessories) publicIds.add(a.id);
