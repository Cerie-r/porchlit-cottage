// Shadow maps are drawn from the lights' side. A frame that only moves the camera, or that redraws for something
// casting no shadow (the outline under the pointer while arranging, a label, a highlight), would draw them all again
// for nothing, and with a lamp's six-sided shadow that is most of the frame. Here the renderer draws them only when
// something that casts a shadow, or a light that throws one, has changed.

const shadowProps = ['bias', 'normalBias', 'radius', 'blurSamples'];
const cameraProps = ['near', 'far', 'left', 'right', 'top', 'bottom', 'fov', 'zoom'];

// A number that changes whenever a shadow-casting light, or anything visible that casts a shadow, moves, turns,
// grows, is shown, hidden, added or taken away, swaps its geometry or material, has its points or instances
// rewritten, or bends (bones, morphs). Reads world matrices, so call it once they are up to date for the frame.
// `fresh` is set when a light that should throw a shadow has no map yet.
export function shadowSum(scene, out = {}) {
  let sum = 0, n = 0;
  out.fresh = false;
  // A world matrix: its twelve entries that can change, each weighted differently, and the whole weighted by its
  // place in the walk, so that two changes are all but certain not to cancel out.
  const add = e => { n++; sum += (n % 89 + 1) * (e[0] + 2 * e[1] + 3 * e[2] + 5 * e[4] + 7 * e[5] + 11 * e[6] + 13 * e[8] + 17 * e[9] + 19 * e[10] + 23 * e[12] + 29 * e[13] + 31 * e[14]); };
  const num = v => { n++; if (typeof v === 'number' && v - v === 0) sum += v * (n % 101 + 1.5); };
  const material = m => { if (m) { num(m.id); num(m.visible ? 1 : 2); num(m.version); } };
  // Figures share one skeleton between their pieces: each skeleton is counted once.
  const skeletons = new Set();
  scene.traverseVisible(o => {
    if (o.isLight) {
      if (!o.castShadow || !o.shadow) return;
      const s = o.shadow;
      if (!s.map) out.fresh = true;
      add(o.matrixWorld.elements);
      if (o.target) add(o.target.matrixWorld.elements);
      num(s.mapSize.x); num(s.mapSize.y);
      for (const k of shadowProps) num(s[k]);
      if (s.camera) for (const k of cameraProps) num(s.camera[k]);
      return;
    }
    if (!o.castShadow || !(o.isMesh || o.isLine || o.isPoints)) return;
    add(o.matrixWorld.elements);
    const g = o.geometry;
    if (g) { num(g.id); num(g.attributes.position?.version); num(g.index?.version); num(g.drawRange.start); num(g.drawRange.count); }
    if (Array.isArray(o.material)) o.material.forEach(material); else material(o.material);
    if (o.isInstancedMesh) { num(o.count); num(o.instanceMatrix.version); }
    if (o.isSkinnedMesh && o.skeleton) {
      num(o.skeleton.bones.length);
      if (!skeletons.has(o.skeleton)) { skeletons.add(o.skeleton); for (const b of o.skeleton.bones) add(b.matrixWorld.elements); }
    }
    if (o.morphTargetInfluences) for (const v of o.morphTargetInfluences) num(v);
  });
  return sum + n;
}

// Lets `renderer` draw shadow maps only when shadowSum(scene) changes: checked just before each frame of `scene`
// draws (Scene.onBeforeRender runs after the world matrices are brought up to date and before the shadow pass).
// Returns a function that puts things back as they were.
export function keepShadowsStill(renderer, scene) {
  const map = renderer.shadowMap, before = scene.onBeforeRender, canvas = renderer.domElement;
  const seen = {};
  let last = NaN;
  map.autoUpdate = false;
  map.needsUpdate = true;
  scene.onBeforeRender = function (...args) {
    before?.apply(this, args);
    const now = shadowSum(scene, seen);
    if (now !== last || seen.fresh) { last = now; map.needsUpdate = true; }
  };
  // A lost and restored context comes back without its shadow maps.
  const restored = () => { last = NaN; map.needsUpdate = true; };
  canvas?.addEventListener?.('webglcontextrestored', restored);
  return () => {
    scene.onBeforeRender = before;
    canvas?.removeEventListener?.('webglcontextrestored', restored);
    map.autoUpdate = true;
  };
}
