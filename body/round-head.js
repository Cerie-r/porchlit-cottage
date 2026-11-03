import {Box3, SphereGeometry, Vector3} from 'three';

// Trial only: the original purchased GLB stays untouched for easy comparison.
// Use the old doll's uninterrupted oval surface, without anatomical features.
export function applyRoundHead(model) {
  const head = model.getObjectByName('purchased-head');
  head.geometry.computeBoundingBox();
  const box = head.geometry.boundingBox;
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const geometry = new SphereGeometry(1, 96, 64);
  // A soft oval with a shallow front: no nose, brow ridge or square jaw.
  const unit = size.x / .86;
  geometry.scale(.43 * unit, .365 * unit, .34 * unit);
  geometry.computeVertexNormals();
  geometry.translate(center.x, center.y, center.z);
  geometry.userData.roundAvatar = true;
  head.geometry = geometry;
  const ears = model.getObjectByName('ears');
  if(ears)ears.visible=false;
  model.updateMatrixWorld(true);
  return new Box3().setFromObject(head);
}
