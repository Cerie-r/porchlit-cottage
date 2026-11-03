// What the wardrobe's garment pictures are made from. When any of these
// change, the pictures in public/wardrobe/ need taking again
// (scripts/wardrobe-pictures.mjs).
import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';

export const pictureSources = [
  'body/outfits.js',
  'body/outfit-tools.js',
  'body/outfit-pieces.js',
  'body/outfit-knit-couple.js',
  'body/outfit-tang-couple.js',
  'body/outfit-duffle-couple.js',
  'body/outfit-cake-dress.js',
  'body/outfit-hoodie.js',
  'body/outfit-halloween-couple.js',
  'body/outfit-christmas-couple.js',
  'body/outfit-pumpkin-couple.js',
  'body/accessories.js',
  'body/accessory-pieces.js',
  'body/accessory-tools.js',
  'body/accessory-beanie.js',
  'body/accessory-bow-tie.js',
  'body/accessory-braid-ribbon.js',
  'body/accessory-brooch.js',
  'body/accessory-hair-clips.js',
  'body/accessory-hair-flower.js',
  'body/accessory-headband.js',
  'body/accessory-her-beret.js',
  'body/accessory-newsboy-cap.js',
  'body/accessory-pearl-tie.js',
  'body/accessory-pocket-square.js',
  'body/accessory-pocket-watch.js',
  'body/accessory-round-glasses.js',
  'body/accessory-santa-hat.js',
  'body/accessory-scarf.js',
  'body/accessory-witch-hat.js',
  'body/item-thumbnails.js',
  'scripts/build-outfits.mjs',
  'public/models/resident-body.glb'
];

export async function pictureSourceHash() {
  const hash = createHash('sha256');
  for (const file of pictureSources) {
    hash.update(file + '\0');
    hash.update(await readFile(new URL('../' + file, import.meta.url)));
  }
  return hash.digest('hex');
}

// A home's own outfits and headwear (src/ours/*.outfit.js, *.accessory.js, not
// in the public copy) keep their pictures in src/ours/wardrobe/; those depend on
// the public sources too.
export async function homePictureSources() {
  const names = await readdir(new URL('../src/ours/', import.meta.url)).catch(() => []);
  return names.filter(n => n.endsWith('.outfit.js') || n.endsWith('.accessory.js')).sort().map(n => 'src/ours/' + n);
}

export async function homePictureSourceHash() {
  const hash = createHash('sha256');
  for (const file of [...pictureSources, ...await homePictureSources()]) {
    hash.update(file + '\0');
    hash.update(await readFile(new URL('../' + file, import.meta.url)));
  }
  return hash.digest('hex');
}
