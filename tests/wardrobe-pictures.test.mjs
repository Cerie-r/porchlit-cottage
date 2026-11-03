import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {pictureSourceHash} from '../scripts/wardrobe-picture-sources.mjs';

const read = file => readFile(new URL('../' + file, import.meta.url), 'utf8');

test('the wardrobe’s garment pictures were taken of the garments as they are now', async () => {
  const manifest = JSON.parse(await read('body/wardrobe-pictures.json'));
  assert.equal(manifest.sourceHash, await pictureSourceHash(), 'a garment changed: run `npm run build && npm run wardrobe:pictures` to take the pictures again');
  const html = await read('body/index.html');
  for (const [card, file] of Object.entries(manifest.files)) {
    assert.ok((await stat(new URL('../public' + file, import.meta.url))).size > 1000, file);
    const [kind, id] = card.split('=');
    assert.match(html, new RegExp(`data-${kind}="${id}" class="item has-thumbnail"[^>]*><img src="${file}"`), `${card} shows its picture from the start`);
  }
  assert.ok(Object.keys(manifest.files).length >= 4);
});
