// What the tailor's bench shows on its dress form: the outfits that may be sewn, built and fitted the way the
// residents wear them (body/avatar-model.js), and the residents' own body for the form itself. Each is made once,
// when first asked for; the two base outfits only come out of building every outfit (body/outfits.js), so that
// happens once, at a quiet moment, and only what may be sewn is kept.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createOutfits, applyOutfitFit} from '../body/outfits.js';
import {extraOutfits, outfitFitWith} from '../body/outfit-registry.js';
import {fromCapsules} from '../body/drawn.js';

let fit = null, everything = null, body = null;
const pieces = new Map();
const fitted = () => (fit ??= fetch('/models/outfits-fit.json').then(r => (r.ok ? r.json() : {})).catch(() => ({}))).then(outfitFitWith);
// A fit that doesn't match (or is missing) leaves that garment as drawn rather than losing it.
function fitOne(id, group, data) {
  try { applyOutfitFit({[id]: group}, data); } catch {}
  return group;
}
const quietly = () => new Promise(done => (window.requestIdleCallback ? window.requestIdleCallback(done, {timeout: 1500}) : setTimeout(done, 200)));
function bases() {
  everything ??= Promise.all([fitted(), quietly()]).then(([data]) => {
    const all = createOutfits(), keep = {};
    for (const [id, group] of Object.entries(all)) {
      if (!fromCapsules(id)) keep[id] = fitOne(id, group, data);
      else group.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
    }
    return keep;
  });
  return everything;
}

// The garment of an outfit that may be sewn, or null while it isn't here (a home's own may come later; ask again).
export function garmentPiece(id) {
  if (pieces.has(id)) return pieces.get(id);
  let made;
  if (id === 'dress' || id === 'coat') made = bases().then(all => all[id]);
  else {
    const entry = extraOutfits.find(o => o.id === id);
    if (!entry || fromCapsules(id)) return Promise.resolve(null);
    // Built already with the base two, or on its own.
    made = (everything || Promise.resolve({})).then(all => all[id] || fitted().then(data => fitOne(id, entry.build(), data)));
  }
  made = made.catch(() => null);
  pieces.set(id, made);
  made.then(g => { if (!g) pieces.delete(id); });
  return made;
}

// The residents' body, for the dress form: the mesh the garments are fitted to, without the head.
export function formBody() {
  body ??= new GLTFLoader().loadAsync('/models/resident-body.glb').then(gltf => gltf.scene.getObjectByName('purchased-body')?.geometry || null).catch(() => { body = null; return null; });
  return body;
}
