import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSweptHair} from '../body/hair-swept.js';

// The short hair is made in the head's own units: the head is .86 wide, .73 tall and .68 deep, centred on 0.
test('the side-parted short hair sits on the head, keeps the eyes clear, and keeps its curl apart for hats', () => {
  const material = new T.MeshStandardMaterial();
  const hair = createSweptHair(material);
  const body = hair.getObjectByName('swept-hair-body'), curl = hair.getObjectByName('swept-hair-curl');
  assert.ok(body?.isMesh && curl?.isMesh, 'the hair and its curl are separate meshes');
  assert.equal(body.material, material); assert.equal(curl.material, material);

  const box = new T.Box3().setFromObject(body);
  assert.ok(box.min.x < -.44 && box.max.x > .44 && box.min.x > -.52 && box.max.x < .52, 'a little wider than the head');
  assert.ok(box.max.y > .4 && box.max.y < .56, 'over the crown');
  assert.ok(box.min.y > -.3, 'the nape stays above the chin');
  assert.ok(new T.Box3().setFromObject(curl).max.y > box.max.y, 'the curl stands up from the crown');

  // Nothing hangs in front of the eyes (they sit within |x| .09–.24, y −.17–0 on the face).
  const p = body.geometry.attributes.position, n = body.geometry.attributes.normal, v = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (v.z > .2 && v.y < 0 && v.y > -.18) assert.ok(Math.abs(v.x) > .25, `hair over an eye at ${v.toArray().map(c => c.toFixed(3))}`);
    assert.ok(Number.isFinite(n.getX(i) + n.getY(i) + n.getZ(i)));
  }
  // Light enough for the house, where several residents are drawn at once.
  assert.ok(body.geometry.index.count / 3 + curl.geometry.index.count / 3 < 40000);
});
