// Notes a home's own resident wrote for the capsule machine come with that
// home's own things (src/ours/*.notes.js, not part of the public release;
// see ours-pack.js), each module exporting `notes`: [{id, text}]. Until then
// there are none, and no note ever rolls out of the machine.
import {cleanNotes} from './capsules.js';

export const homeNotes = [];
export function addHomeNotes(notes = []) {
  for (const n of cleanNotes(notes)) if (!homeNotes.some(h => h.id === n.id)) homeNotes.push(n);
}
