import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {shadowSum, keepShadowsStill} from '../src/still-shadows.js';

// A small room: a sun and a lamp that throw shadows, a chair that casts one, a rug that only takes them, a crowd of
// instanced books, a jointed figure, and a camera outside the scene.
function room() {
  const scene = new T.Scene(), stage = new T.Group();
  scene.add(stage);
  const sun = new T.DirectionalLight('#fff', 1); sun.position.set(7, 11, 8); sun.castShadow = true;
  scene.add(sun, sun.target);
  const lamp = new T.PointLight('#fc8', 2, 5); lamp.position.set(.5, 1.2, 0); lamp.castShadow = true;
  const chair = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial()); chair.castShadow = true;
  const rug = new T.Mesh(new T.PlaneGeometry(2, 2), new T.MeshStandardMaterial()); rug.receiveShadow = true;
  const books = new T.InstancedMesh(new T.BoxGeometry(.1, .2, .03), new T.MeshStandardMaterial(), 4); books.castShadow = true;
  const bone = new T.Bone(), arm = new T.Bone(); bone.add(arm); arm.position.y = .3;
  const figure = new T.SkinnedMesh(new T.BoxGeometry(.2, .6, .2), new T.MeshStandardMaterial()); figure.castShadow = true;
  figure.add(bone); figure.bind(new T.Skeleton([bone, arm]));
  stage.add(lamp, chair, rug, books, figure);
  const camera = new T.OrthographicCamera(-5, 5, 5, -5, .1, 100); camera.position.set(10, 8, 10); camera.lookAt(0, 0, 0);
  const sum = () => { scene.updateMatrixWorld(); return shadowSum(scene); };
  return {scene, stage, sun, lamp, chair, rug, books, arm, figure, camera, sum};
}

test('the sum stays put for what casts no shadow, and moves with everything that does', () => {
  const r = room(), at = r.sum();
  assert.equal(r.sum(), at, 'nothing changed');
  r.camera.position.set(-10, 3, 4); r.camera.updateMatrixWorld();
  assert.equal(r.sum(), at, 'only the camera moved');
  r.rug.position.x = 1;
  assert.equal(r.sum(), at, 'a rug that casts no shadow moved');
  r.rug.position.x = 0;
  const changes = [
    ['the chair moved', () => { r.chair.position.x += .05; }],
    ['the chair turned', () => { r.chair.rotation.y += .1; }],
    ['the whole room turned under the sun', () => { r.stage.rotation.y += .2; }],
    ['the room grew (a zoom)', () => { r.stage.scale.setScalar(1.3); }],
    ['the lamp moved', () => { r.lamp.position.z += .1; }],
    ['the sun moved', () => { r.sun.position.x -= 1; }],
    ['the chair was hidden', () => { r.chair.visible = false; }],
    ['the chair came back with new geometry', () => { r.chair.visible = true; r.chair.geometry = new T.BoxGeometry(1, 2, 1); }],
    ['a book was moved', () => { r.books.setMatrixAt(2, new T.Matrix4().makeTranslation(0, .3, 0)); r.books.instanceMatrix.needsUpdate = true; }],
    ['fewer books', () => { r.books.count = 3; }],
    ['the figure bent its arm', () => { r.arm.rotation.z = .6; }],
    ['the rug started to cast a shadow', () => { r.rug.castShadow = true; }],
    ['a new caster arrived', () => { const m = new T.Mesh(new T.SphereGeometry(.1), new T.MeshBasicMaterial()); m.castShadow = true; r.stage.add(m); }],
    ['the lamp was put out (taken away)', () => { r.stage.remove(r.lamp); }],
    ['and lit again', () => { r.stage.add(r.lamp); }],
    ['the lamp stopped throwing a shadow', () => { r.lamp.castShadow = false; }]
  ];
  let before = r.sum();
  for (const [what, change] of changes) {
    change();
    const now = r.sum();
    assert.notEqual(now, before, what);
    before = now;
  }
  // A light that throws no shadow changes no shadow map, coming or going.
  r.stage.remove(r.lamp);
  assert.equal(r.sum(), before, 'a lamp with no shadow taken away');
});

test('the renderer draws shadow maps on the first frame and then only when the sum changes', () => {
  const r = room(), canvas = new EventTarget(), calls = [];
  r.scene.onBeforeRender = (...a) => calls.push(a.length);
  const renderer = {shadowMap: {autoUpdate: true, needsUpdate: false}, domElement: canvas};
  const stop = keepShadowsStill(renderer, r.scene);
  const frame = () => {
    // As WebGLRenderer.render does: matrices first, then onBeforeRender, then the shadow pass, which clears the flag.
    r.scene.updateMatrixWorld(); r.scene.onBeforeRender(renderer, r.scene, r.camera, null);
    const drew = renderer.shadowMap.autoUpdate || renderer.shadowMap.needsUpdate;
    renderer.shadowMap.needsUpdate = false;
    return drew;
  };
  assert.equal(renderer.shadowMap.autoUpdate, false);
  // Lights that have never drawn have no map yet: the first frames draw until they have one.
  assert.equal(frame(), true, 'first frame');
  r.sun.shadow.map = {}; r.lamp.shadow.map = {};
  assert.equal(frame(), false, 'nothing moved');
  r.camera.position.x = 3;
  assert.equal(frame(), false, 'only the camera moved');
  r.chair.position.z = .4;
  assert.equal(frame(), true, 'the chair moved');
  assert.equal(frame(), false, 'and stayed there');
  canvas.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(frame(), true, 'the context came back');
  assert.ok(calls.length >= 6 && calls.every(n => n === 4), 'what was there before still runs, with the same arguments');
  stop();
  assert.equal(renderer.shadowMap.autoUpdate, true);
  r.scene.onBeforeRender(); assert.equal(calls.length >= 7, true);
});
