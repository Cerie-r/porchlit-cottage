import * as THREE from 'three';
import {PARTS,expand} from './brick-recipe.js';
import {partGeometry,partMaterial,twoSided,flowerHeart,placeOf,turnOf,studsInBuild,studGeometry} from './brick-geometry.js';

// Little pictures for the craft room's buttons, so a button shows the thing
// and not only its name: brick parts and recipes here, and anything else
// drawn with three (see picture-studio.jsx for React things). Each is drawn
// once, in the craft room's light, with a renderer that is thrown away
// again, and kept as an image.

const PX = 96; // drawn at three times the size it's shown at
const BENCH_VIEW = [11, 13, 13];
const pictures = new Map();

// What each part looks like on its button: a size that shows what it is.
const LOOKS = {brick: [2, 4, 3], plate: [2, 4, 1], tile: [2, 2, 1], round: [2, 2, 3], disc: [2, 2, 1], slope: [2, 2, 3], arch: [4, 1, 6], curve: [3, 3, 3], lathe: [2, 2, 8], drape: [4, 1, 9], fence: [4, 1, 6], flower: [1, 1, 1], leaf: [1, 2, 1]};
const TURNED = {vase: [2, 2, 8], jar: [2, 2, 6], column: [1, 1, 10], bowl: [3, 3, 3], cup: [2, 2, 4], shade: [4, 4, 6], bead: [1, 1, 2]};
const onePart = (p, [w, d, h], c, mat, profile) => ({kind: 'build', parts: [{id: 'a', p, x: 0, y: 0, z: 0, w, d, h, turn: 0, c, ...(mat && mat !== 'plain' ? {mat} : {}), ...(profile ? {profile} : {})}]});
// A part as its button shows it, in the colour and material about to be used.
export const partLook = (p, c, mat, profile) => onePart(p, LOOKS[p], c, mat, PARTS[p].profiles ? profile : undefined);
export const turnedLook = (profile, c, mat) => onePart('lathe', TURNED[profile], c, mat, profile);

// A recipe as plain three objects.
function groupOf(recipe) {
  const group = new THREE.Group();
  for (const part of expand(recipe)) {
    const place = new THREE.Group(), flip = new THREE.Group();
    place.position.set(...placeOf(part)); place.rotation.y = turnOf(part); flip.scale.x = part.flip ? -1 : 1;
    flip.add(new THREE.Mesh(partGeometry(part), partMaterial(part.c, part.mat, twoSided(part))));
    if (part.p === 'flower') flip.add(new THREE.Mesh(flowerHeart(), partMaterial('gold')));
    place.add(flip); group.add(place);
    for (const [x, y, z] of studsInBuild(part)) {const stud = new THREE.Mesh(studGeometry(), partMaterial(part.c, part.mat)); stud.position.set(x, y, z); group.add(stud);}
  }
  return group;
}

// The craft room's light, added while a picture is drawn.
function lights() {
  const rig = new THREE.Group(), sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(-5, 12, 7);
  rig.add(new THREE.AmbientLight('#ffffff', 1.1), new THREE.HemisphereLight('#fff8e9', '#c3ac9b', .9), sun);
  return rig;
}

// Look along `view` and fit the camera snugly around what's there.
function fit(camera, object, view) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object), centre = box.getCenter(new THREE.Vector3()), p = new THREE.Vector3();
  camera.position.copy(centre).addScaledVector(new THREE.Vector3(...view).normalize(), 50); camera.lookAt(centre); camera.updateMatrixWorld(true);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    p.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const half = Math.max(maxX - minX, maxY - minY) / 2 * 1.12, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  Object.assign(camera, {left: cx - half, right: cx + half, top: cy + half, bottom: cy - half});
  camera.updateProjectionMatrix();
}

// Draws whatever isn't drawn yet of `wanted` ({key: object, or a function
// making one}) and gives back every picture by key, as image URLs. A scene is
// drawn as it is, anything else on a scene of its own. Without WebGL there
// are no pictures and the buttons just show their names.
export function drawObjects(wanted, {view = BENCH_VIEW, size = PX} = {}) {
  const missing = Object.entries(wanted).filter(([key]) => !pictures.has(key));
  if (missing.length) {
    let renderer = null;
    try {
      renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
      renderer.setPixelRatio(1); renderer.setSize(size, size, false); renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 200);
      for (const [key, make] of missing) {
        const thing = typeof make === 'function' ? make() : make, scene = thing.isScene ? thing : new THREE.Scene(), rig = lights();
        if (scene !== thing) scene.add(thing);
        scene.add(rig);
        fit(camera, scene, view); renderer.render(scene, camera);
        pictures.set(key, renderer.domElement.toDataURL('image/png'));
        scene.remove(rig);
        if (scene !== thing) scene.remove(thing);
      }
    } catch {
      // Leave the rest undrawn.
    } finally {
      if (renderer) {renderer.dispose(); renderer.forceContextLoss();}
    }
  }
  return cachedPictures(Object.keys(wanted));
}

// Recipes ({key: recipe}), turned a little if wanted.
export function drawPictures(wanted, turn = 0) {
  return drawObjects(Object.fromEntries(Object.entries(wanted).map(([key, recipe]) => [key, () => {const g = groupOf(recipe); g.rotation.y = turn; return g;}])));
}

// The pictures already drawn, of those keys.
export const cachedPictures = keys => Object.fromEntries(keys.filter(key => pictures.has(key)).map(key => [key, pictures.get(key)]));
