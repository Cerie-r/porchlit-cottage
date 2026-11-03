// Photographs the finished garments in the wardrobe (outfits and headwear,
// in their own colours) and keeps the pictures in public/wardrobe/, so the
// wardrobe's cards show the real garments from the very first moment on any
// device, instead of waiting for the 3D models to load.
//
// Run after `npm run build`, with Playwright available (it isn't a project
// dependency):
//   PLAYWRIGHT=/path/to/node_modules/playwright npm run wardrobe:pictures
// Re-run it whenever a garment changes; tests/wardrobe-pictures.test.mjs
// notices when the pictures are older than the garments. A home's own outfits
// (src/ours/*.outfit.js) keep their pictures beside them in src/ours/wardrobe/,
// out of the public files.
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {pictureSourceHash, homePictureSourceHash} from './wardrobe-picture-sources.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
const {createServer} = await import('../server/index.mjs');

const root = fileURLToPath(new URL('..', import.meta.url));
// The home's own garments are photographed too: this server gives them to anyone, and the page takes itself for
// that home (src/ours-load.js).
const server = createServer({ours: true});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
try {
  const page = await browser.newPage({viewport: {width: 900, height: 640}, deviceScaleFactor: 1});
  await page.addInitScript(() => {
    localStorage.setItem('porchlit-porch-session-v1', JSON.stringify({token: 'pcs_' + 'p'.repeat(43), account: {id: 'pictures'}}));
    localStorage.setItem('porchlit-ours-v1', JSON.stringify('pictures'));
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/body/`, {waitUntil: 'load'});
  // Wait until the wardrobe has photographed the garments itself.
  await page.waitForFunction(() => {
    const cards = [...document.querySelectorAll('[data-outfit], [data-accessory]:not([data-accessory="none"]), [data-face]:not([data-face="none"]), [data-neck]:not([data-neck="none"]), [data-chest]:not([data-chest="none"]), [data-braid]:not([data-braid="none"])')];
    return cards.length && cards.every(b => b.querySelector(':scope > img')?.src.startsWith('data:'));
  }, null, {timeout: 180000});
  // A card says what it is in one of these; every piece's picture is named accessory-<id>, and a
  // public card is listed under its own key (face=…, neck=…), the way index.html shows it.
  const pictures = await page.evaluate(() => [...document.querySelectorAll('[data-outfit], [data-accessory], [data-face], [data-neck], [data-chest], [data-braid]')]
    .map(b => {const card = ['outfit', 'accessory', 'face', 'neck', 'chest', 'braid'].find(k => k in b.dataset); return {kind: card === 'outfit' ? 'outfit' : 'accessory', card, id: b.dataset[card], home: 'home' in b.dataset, src: b.querySelector(':scope > img')?.src};})
    .filter(p => p.src?.startsWith('data:image/')));
  await mkdir(root + 'public/wardrobe', {recursive: true});
  const files = {}, homeFiles = {};
  for (const {kind, card, id, home, src} of pictures) {
    const [, type, data] = /^data:image\/(\w+);base64,(.*)$/.exec(src);
    const name = `${kind}-${id}.${type === 'jpeg' ? 'jpg' : type}`;
    if (home) {
      await mkdir(root + 'src/ours/wardrobe', {recursive: true});
      await writeFile(`${root}src/ours/wardrobe/${name}`, Buffer.from(data, 'base64'));
      homeFiles[`${kind}=${id}`] = name;
    } else {
      await writeFile(`${root}public/wardrobe/${name}`, Buffer.from(data, 'base64'));
      files[`${card}=${id}`] = `/wardrobe/${name}`;
    }
    console.log('photographed', name);
  }
  await writeFile(root + 'body/wardrobe-pictures.json', JSON.stringify({sourceHash: await pictureSourceHash(), files}, null, 1) + '\n');
  if (Object.keys(homeFiles).length) await writeFile(root + 'src/ours/wardrobe/pictures.json', JSON.stringify({sourceHash: await homePictureSourceHash(), files: homeFiles}, null, 1) + '\n');
} finally {
  await browser.close();
  server.close();
}
