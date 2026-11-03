import fs from 'node:fs';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {createOutfits,outfitFitData} from '../body/outfits.js';
// A home's own outfits (src/ours/*.outfit.js) are fitted too when the folder is there.
import {registerOutfits} from '../body/outfit-registry.js';for(const f of fs.existsSync('src/ours')?fs.readdirSync('src/ours').filter(f=>f.endsWith('.outfit.js')).sort():[])registerOutfits((await import('../src/ours/'+f)).outfits);
const b=fs.readFileSync('public/models/resident-body.glb');const model=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
// only what the fit moved (see outfitFitData)
fs.writeFileSync('public/models/outfits-fit.json',JSON.stringify(outfitFitData(createOutfits(),createOutfits(model.getObjectByName('purchased-body')))));
