// Which sound goes with what happens in the house. The sounds themselves are
// in sounds.js; this only picks one, so the choices can be tested.
import {play} from './sounds.js';

// A part of a close-up (its label from search-state.js) opening or closing:
// drawers slide, soft things puff, a book opened by its cover turns a page,
// books on a shelf knock softly, and lids and doors open with a lid; whatever
// is shut closes with a little knock. [name, volume].
export function partSound(label = '', opening = true) {
  if (/抽屉/.test(label)) return [opening ? 'drawerOpen' : 'drawerClose', 1];
  if (/坐垫|抱枕|枕头|被角|毯|窗帘/.test(label)) return ['cloth', 1];
  if (/封面/.test(label)) return opening ? ['page', 1] : ['wood', .6];
  if (/书/.test(label)) return ['wood', .8];
  return opening ? ['lid', 1] : ['wood', .6];
}
export function playPart(label, opening) {
  const [name, volume] = partSound(label, opening);
  play(name, {volume});
}

// Something from the backpack put down in the room: dolls are soft, the
// rest clicks into place.
export const placedSound = item => item?.kind === 'animal' ? 'cloth' : 'click';
