import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EXPRESSIONS, expressionOf} from '../body/expressions.js';
import {createFaceAndHairBase} from '../body/face.js';
import {applyRoundHead} from '../body/round-head.js';
import {applyHeadRatio} from '../body/proportions.js';
import {cleanWardrobe, publicLook} from '../body/wardrobe-state.js';

// The residents' expressions: a look keeps one as `mouth` (0 the frown and 1 the smile there always
// were); each has its mouth, and some close the eyes.
const loadModel = async () => {
  const b = fs.readFileSync('public/models/resident-body.glb');
  const model = (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')).scene;
  applyRoundHead(model); applyHeadRatio(model); return model;
};

test('a look keeps any of the expressions, and nothing else', () => {
  assert.deepEqual(EXPRESSIONS.map(e => e.id), ['frown', 'smile', 'grin', 'cat', 'oh', 'wink', 'shy']);
  assert.deepEqual(EXPRESSIONS.slice(0, 2).map(e => e.id), ['frown', 'smile'], 'the first two are the ones there always were');
  assert.equal(new Set(EXPRESSIONS.map(e => e.id)).size, EXPRESSIONS.length);
  for (const e of EXPRESSIONS) { assert.ok(e.name && e.icon.startsWith('<svg'), e.id); assert.ok(['open', 'happy', 'wink'].includes(e.eyes), e.id); }
  EXPRESSIONS.forEach((e, i) => {
    assert.equal(cleanWardrobe({girl: {mouth: i}}).girl.mouth, i, e.id);
    assert.equal(publicLook('girl', cleanWardrobe({girl: {mouth: i}}).girl).mouth, i, `${e.id} shows outside as it is`);
  });
  for (const bad of [EXPRESSIONS.length, -1, 1.5, '2', null, undefined, NaN]) { assert.equal(expressionOf(bad), 0); assert.equal(cleanWardrobe({boy: {mouth: bad}}).boy.mouth, 0, String(bad)); }
});

test('each expression shows its own mouth on the face, under the eyes, and closes the eyes it says', async () => {
  const model = await loadModel(), face = createFaceAndHairBase(model);
  const box = new T.Box3().setFromObject(model.getObjectByName('purchased-head')), size = box.getSize(new T.Vector3()), centre = box.getCenter(new T.Vector3()), unit = size.x / .86;
  const local = v => v.clone().sub(centre).divideScalar(unit), zs = (x, y) => .34 * Math.sqrt(Math.max(0, 1 - (x / .43) ** 2 - (y / .365) ** 2));
  assert.equal(face.mouths.length, EXPRESSIONS.length);
  face.face.updateMatrixWorld(true);
  EXPRESSIONS.forEach((e, i) => {
    assert.equal(face.setExpression(i), e);
    assert.deepEqual(face.mouths.map(m => m.visible), EXPRESSIONS.map((_, k) => k === i), `${e.id}: its mouth alone`);
    // the wearer's right eye is the first, the left the second; a wink closes the left
    const shut = [e.eyes === 'happy', e.eyes === 'happy' || e.eyes === 'wink'];
    shut.forEach((closed, side) => { assert.equal(face.eyes[side].visible, !closed, `${e.id} eye ${side}`); assert.equal(face.lids[side].visible, closed, `${e.id} lid ${side}`); });
    // every bit of the mouth lies on the face, round the middle, under the eyes and over the chin
    const v = new T.Vector3();
    face.mouths[i].traverse(m => {
      if (!m.isMesh) return;
      const p = m.geometry.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const q = local(v.fromBufferAttribute(p, k).applyMatrix4(m.matrixWorld));
        assert.ok([q.x, q.y, q.z].every(Number.isFinite), e.id);
        assert.ok(Math.abs(q.x) < .06 && q.y < -.21 && q.y > -.275, `${e.id}: at ${q.x.toFixed(3)}, ${q.y.toFixed(3)}`);
        assert.ok(q.z > zs(q.x, q.y) - .004 && q.z < zs(q.x, q.y) + .02, `${e.id}: on the face, not in it or off it`);
      }
    });
  });
  // the lids lie over the eyes, on the face
  face.lids.forEach((lid, side) => {
    const p = lid.geometry.attributes.position, v = new T.Vector3(), x = side ? .165 : -.165;
    for (let k = 0; k < p.count; k += 3) { const q = local(v.fromBufferAttribute(p, k)); assert.ok(Math.abs(q.x - x) < .075 && q.y > -.11 && q.y < -.05 && q.z > zs(q.x, q.y) - .004, `lid ${side}`); }
  });
  assert.equal(face.setExpression(99), EXPRESSIONS[0], 'one it does not know is the first');
});

test('the wardrobe offers every expression as a button and keeps the one chosen; the house wears it', async () => {
  const app = await readFile('body/app.js', 'utf8'), model = await readFile('body/avatar-model.js', 'utf8'), html = await readFile('body/index.html', 'utf8');
  assert.match(app, /EXPRESSIONS\.map\(\(e,i\)=>\{const b=document\.createElement\('button'\)/);
  assert.match(app, /d\.mouth=expression;/);
  assert.match(app, /wearExpression\(d\.mouth\)/);
  assert.match(html, /<div id="expressions" class="expressions" role="group" aria-label="表情"><\/div>/);
  assert.match(model, /face\.setExpression\(look\.mouth\)/);
});

test('asleep, the eyes the expression draws give way to the eye shut: never two arcs on one eye', async () => {
  const model = await loadModel(), face = createFaceAndHairBase(model);
  face.eyes.forEach(o => assert.equal(o.name, 'eye'));
  face.lids.forEach(o => assert.equal(o.name, 'eye-closed', 'a wink or a happy eye, closed awake'));
  const named = name => { const out = []; face.face.traverse(o => { if (o.name === name) out.push(o); }); return out; };
  assert.equal(named('eye-light').length, 2);
  assert.equal(named('eye-shut').length, 2);
  named('eye-shut').forEach(o => assert.equal(o.material.visible, false, 'the eye shut is drawn only asleep'));
  // In bed the walking resident hides what it calls the open eyes and shows the eye shut (src/resident-motion.jsx).
  const motion = await readFile('src/resident-motion.jsx', 'utf8');
  assert.match(motion, /eyesOpen:meshes\.filter\(o=>o\.name==='eye'\|\|o\.name==='eye-light'\|\|o\.name==='eye-closed'\)/);
  assert.match(motion, /eyesShut:meshes\.filter\(o=>o\.name==='eye-shut'\)/);
});
