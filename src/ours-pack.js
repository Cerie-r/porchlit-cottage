// A home's own things (src/ours/, not part of the public release) come as a pack of modules, and only to that home
// (ours-load.js asks for them, server/ours.mjs decides). Each module may export outfits, hairs and accessories (the
// wardrobe's lists), own (ids of public things out of the capsule machine the home has without drawing them), toys
// (keepsakes on the bed), notes (for the capsule machine) and spots (little things about the house);
// outfits-fit.json is the fit of its outfits to the body. A piece of music puts itself in as its module runs.
import {registerOutfits, registerOutfitFit} from '../body/outfit-registry.js';
import {registerHairs} from '../body/hair-registry.js';
import {registerAccessories} from '../body/accessory-registry.js';
import {registerOwn} from '../body/drawn.js';
import {addOurToys} from './builtin-toy-state.js';
import {addHomeNotes} from './capsule-notes.js';
import {addSpots} from './ours-spots.js';

// Puts a pack's modules ({file name: module}) where they go. An outfit comes in only with its fit (one without would
// stop the residents being drawn at all): the fit is worked out by the build, scripts/ours-fit.mjs.
export function takeIn(modules) {
  const fitName = Object.keys(modules).find(name => /outfits-fit\.json$/.test(name)), fit = fitName ? modules[fitName]?.default ?? modules[fitName] : {};
  registerOutfitFit(fit);
  for (const [name, m] of Object.entries(modules)) {
    if (name === fitName) continue;
    registerOutfits((m.outfits || []).filter(o => fit[o?.id]));
    registerHairs(m.hairs || []);
    registerAccessories(m.accessories || []);
    registerOwn(m.own || []);
    addOurToys(m.toys || []);
    addHomeNotes(m.notes || []);
    addSpots(m.spots || {});
  }
}

// Fetching the pack once (`fetchPack`: () => import() of the module gathering them, whose default is {file name:
// module}; null when this build has none). load({timeout}) says whether it is in (within the timeout, when there is
// one); after a timeout it goes on arriving, and whoever waits with onLoad hears when it does. One that couldn't be
// fetched (not this home, or offline) may be asked for again.
export function oursPack(fetchPack) {
  let loading = null, loaded = false;
  const waiting = new Set();
  const fetchAll = async () => {
    takeIn((await fetchPack()).default || {});
    loaded = true;
    for (const heard of [...waiting]) heard();
    return true;
  };
  return {
    load({timeout = 0} = {}) {
      if (typeof fetchPack !== 'function') return Promise.resolve(false);
      loading ??= fetchAll().catch(() => {
        loading = null;
        return false;
      });
      if (!timeout) return loading;
      let timer;
      return Promise.race([loading, new Promise(resolve => { timer = setTimeout(() => resolve(false), timeout); })]).finally(() => clearTimeout(timer));
    },
    loaded: () => loaded,
    onLoad(heard) {
      waiting.add(heard);
      return () => waiting.delete(heard);
    }
  };
}
