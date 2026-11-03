import test from 'node:test';
import assert from 'node:assert/strict';
import {uuidFrom, at, fillIn} from '../src/compat.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('a stand-in for crypto.randomUUID: version 4, from getRandomValues, or from Math.random without it', () => {
  assert.match(uuidFrom(), UUID);
  assert.match(uuidFrom(null), UUID);
  assert.equal(uuidFrom(b => b.fill(0)), '00000000-0000-4000-8000-000000000000');
  assert.equal(uuidFrom(b => b.fill(255)), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
  const many = new Set(Array.from({length: 200}, () => uuidFrom()));
  assert.equal(many.size, 200);
});

test('what a page over plain http, or an older browser, lacks is filled in, and only that', () => {
  // A page over http: crypto without randomUUID, everything else there.
  const insecure = {crypto: {getRandomValues: b => b.fill(7)}, Array, String, Int8Array, Object, structuredClone};
  assert.deepEqual(fillIn(insecure), ['crypto.randomUUID']);
  assert.match(insecure.crypto.randomUUID(), UUID);
  assert.deepEqual(fillIn(insecure), [], 'twice changes nothing');
  // An older browser: none of them.
  class OldArray {} class OldString {} class OldTyped {} class OldInt8 extends OldTyped {}
  const old = {crypto: {}, Array: OldArray, String: OldString, Int8Array: OldInt8, Object: {}};
  assert.deepEqual(fillIn(old), ['crypto.randomUUID', 'Array.prototype.at', 'String.prototype.at', 'TypedArray.prototype.at', 'Object.hasOwn', 'structuredClone']);
  assert.equal(old.Object.hasOwn({a: 1}, 'a'), true);
  assert.deepEqual(old.structuredClone({a: [1, {b: 2}]}), {a: [1, {b: 2}]});
  // at(), counted from either end.
  assert.equal(at.call([1, 2, 3], -1), 3);
  assert.equal(at.call([1, 2, 3], 0), 1);
  assert.equal(at.call([1, 2, 3], 3), undefined);
  assert.equal(at.call('abc', -2), 'b');
  assert.equal(at.call([1, 2, 3], -4), undefined);
});

test('every page puts them in first', async () => {
  const {readFile} = await import('node:fs/promises');
  const {existsSync} = await import('node:fs');
  // The early figure editor (avatar/) isn't in the public copy.
  const pages = [['src/main.jsx', "import './compat.js';"], ['body/app.js', "import '../src/compat.js';"], ['avatar/app.js', "import '../src/compat.js';"], ['src/transfer-page.js', "import './compat.js';"]];
  for (const [file, line] of pages.filter(([file]) => existsSync(new URL('../' + file, import.meta.url)))) {
    const first = (await readFile(new URL('../' + file, import.meta.url), 'utf8')).split('\n')[0];
    assert.equal(first, line, file);
  }
});
