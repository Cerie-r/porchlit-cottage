import {Box3, Vector3} from 'three';

// Head count excludes hair. Keep the purchased body's shape and chin position.
export function applyHeadRatio(model, ratio = 1.8) {
  const head = model.getObjectByName('plain-head');
  const face = model.getObjectByName('purchased-head');
  const body = model.getObjectByName('purchased-body');
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(face);
  const feet = new Box3().setFromObject(body).min.y;
  const height = bounds.max.y - bounds.min.y;
  const scale = (bounds.min.y - feet) / ((ratio - 1) * height);
  const pivot = bounds.getCenter(new Vector3());
  pivot.y = bounds.min.y;
  head.scale.setScalar(scale);
  head.position.copy(pivot).multiplyScalar(1 - scale);
  // Lower the complete head before fitting facial features and hair.
  // Keep the entire body mesh, including the neck, underneath.
  model.updateMatrixWorld(true);
  const chin = new Box3().setFromObject(face).min.y;
  head.position.y -= chin - 1.395;
  model.updateMatrixWorld(true);
  return new Box3().setFromObject(model);
}
