// After scripts/build-outfits.mjs: a home's own outfits' fit (src/ours/*.outfit.js) moves out of the public fit,
// public/models/outfits-fit.json, which everyone gets, into src/ours/outfits-fit.json, which comes only with that
// home's own things (src/ours/index.js, vite.config.js). Without src/ours/ there is nothing to move.
import fs from 'node:fs';
import {registerOutfits, isHomeOutfit} from '../body/outfit-registry.js';

const PUBLIC = 'public/models/outfits-fit.json', OURS = 'src/ours/outfits-fit.json';
if (fs.existsSync('src/ours')) {
  for (const f of fs.readdirSync('src/ours').filter(f => f.endsWith('.outfit.js')).sort()) registerOutfits((await import('../src/ours/' + f)).outfits);
  const fit = JSON.parse(fs.readFileSync(PUBLIC, 'utf8')), part = home => Object.fromEntries(Object.entries(fit).filter(([id]) => isHomeOutfit(id) === home));
  const ours = part(true);
  // Run twice, the public file has none left: keep the ones moved the first time.
  if (Object.keys(ours).length || !fs.existsSync(OURS)) fs.writeFileSync(OURS, JSON.stringify(ours));
  fs.writeFileSync(PUBLIC, JSON.stringify(part(false)));
}
