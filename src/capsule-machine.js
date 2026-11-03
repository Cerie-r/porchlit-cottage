import * as THREE from 'three';
import {play} from './sounds.js';
import {PALETTES, GLOWC, CAPC, ITEMC, LIGHT, finish, mesh, vinyl, softBox, plate, tile, glow, seeded, draws, hex} from './machine-kit.js';
export {PALETTES};

// The bear jar on the plaza, drawn and moved with three.js on a canvas of its
// own: a soft vinyl base built from bricks, a glass dome with two round ears
// and a ribbon tied at the front, star balls packed inside. A ticket goes into
// the slot, the dial clicks once round while the balls jostle, a ball rolls out
// over the flap, leaps up in front of you, opens on its left edge, and what
// was inside comes forward turning. What comes out is decided before (see
// capsules.js); this only shows it.

// The glass: a round bear with two ears.
const BEAR = {kind: 'bear', R: .37, ear: .3, earAt: .8, earW: .25, yc: .81, capR: .062, count: 22, fill: .1};
// The balls take the other shape: the bear jar drops stars.
const STAR_BALL = {kind: 'star', n: 5, rOut: 1.12, rIn: .66, k: 1.2, depth: .62};
const peakOf = (a, S) => Math.pow((1 + Math.cos(S.n * (a - Math.PI / 2))) / 2, S.k);
const starR = (a, S) => S.rIn + (S.rOut - S.rIn) * peakOf(a, S);
function bump(d, S) {
  let b = 0;
  for (const s of [-1, 1]) {
    const ex = Math.sin(S.earAt) * s, ey = Math.cos(S.earAt);
    const ang = Math.acos(Math.max(-1, Math.min(1, d.x * ex + d.y * ey)));
    const t = ang / S.earW; if (t < 1) b += S.ear * Math.sqrt(1 - t * t);
  }
  return b;
}
// Where a unit direction lands on a shape.
function shapePoint(d, S, out) {
  if (S.kind === 'star') { const a = Math.atan2(d.y, d.x), r = starR(a, S), zs = S.depth * (1 - .35 * peakOf(a, S)); return out.set(d.x * r, d.y * r, d.z * zs); }
  return out.copy(d).multiplyScalar(S.R * (1 + bump(d, S)));
}
function shapeGeometry(S, geometry) {
  const pos = geometry.attributes.position, v = new THREE.Vector3(), o = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).normalize(); shapePoint(v, S, o); pos.setXYZ(i, o.x, o.y, o.z); }
  geometry.computeVertexNormals();
  return geometry;
}
const insideBear = (p, S, m) => p.length() < S.R - m * 1.1;

const capTop = () => new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .22, transparent: true, opacity: .32, depthWrite: false});
const capFace = () => new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .15, transparent: true, opacity: .18, depthWrite: false});

// Something small inside a ball: the little shapes the jar is filled with,
// and the real prizes (an accessory for the dolls, a ticket, a rolled note,
// or, made small, the very piece or outfit the residents will wear).
function insideOf(prize, r, color, P, accent = color, object = null) {
  const g = new THREE.Group(), m = vinyl(color, .5), a2 = vinyl(accent, .5);
  // The real thing, made small: fitted into the ball, centred.
  if (object) {
    const box = new THREE.Box3().setFromObject(object), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const fit = new THREE.Group();
    object.position.sub(mid); fit.add(object);
    fit.scale.setScalar(r * .9 / Math.max(size.x, size.y, size.z, 1e-6));
    g.add(fit);
    return g;
  }
  const add = (geo, mat, x, y, z) => { const o = mesh(geo, mat, x, y, z); g.add(o); return o; };
  const ball = (s, mat, x, y, z) => add(new THREE.SphereGeometry(r * s, 14, 10), mat, x, y, z);
  switch (prize) {
    case 'dress': add(new THREE.ConeGeometry(r * .42, r * .56, 20), m, 0, -r * .12, 0); add(new THREE.CylinderGeometry(r * .13, r * .17, r * .22, 16), m, 0, r * .26, 0); break;
    case 'button': {
      add(new THREE.CylinderGeometry(r * .3, r * .3, r * .1, 24), m, 0, 0, 0).rotation.x = Math.PI / 2;
      for (let j = 0; j < 4; j++) ball(.045, vinyl(0x8a7a8c), (j % 2 ? 1 : -1) * r * .09, (j < 2 ? 1 : -1) * r * .09, r * .055);
      break;
    }
    case 'bow': {
      const ribbon = vinyl(0xe9a3b9, .45);
      for (const k of [-1, 1]) ball(.24, ribbon, k * r * .26, 0, 0).scale.set(1, .7, .5);
      ball(.12, ribbon, 0, 0, 0);
      break;
    }
    case 'scarf': {
      const wool = vinyl(0xd88a8f, .9);
      add(new THREE.TorusGeometry(r * .3, r * .1, 10, 24), wool, 0, r * .08, 0).scale.set(1, .8, 1);
      add(new THREE.BoxGeometry(r * .16, r * .42, r * .08), wool, r * .14, -r * .2, r * .12).rotation.z = .25;
      break;
    }
    case 'hat': {
      const felt = vinyl(0x6e5a63, .9);
      add(new THREE.SphereGeometry(r * .4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), felt, 0, -r * .08, 0).scale.set(1, .5, 1);
      add(new THREE.CylinderGeometry(r * .03, r * .03, r * .12, 8), felt, 0, r * .16, 0);
      break;
    }
    case 'wreath': {
      add(new THREE.TorusGeometry(r * .32, r * .05, 8, 28), vinyl(0x88b089, .7), 0, 0, 0).rotation.x = 1.1;
      for (let j = 0; j < 7; j++) { const a = j / 7 * Math.PI * 2; ball(.09, vinyl([0xf2b8c8, 0xfbf3ec, 0xf3dc98][j % 3], .5), Math.cos(a) * r * .32, Math.sin(a) * r * .32 * .45, Math.sin(a) * r * .32 * .9); }
      break;
    }
    case 'glasses': {
      const rim = vinyl(0xc98aa5, .4);
      for (const k of [-1, 1]) add(new THREE.TorusGeometry(r * .17, r * .035, 8, 24), rim, k * r * .21, 0, 0);
      add(new THREE.BoxGeometry(r * .1, r * .03, r * .03), rim, 0, r * .04, 0);
      break;
    }
    case 'wings': case 'batwings': {
      const felt = vinyl(prize === 'wings' ? 0xf2c3cf : 0x4a4352, .8);
      for (const k of [-1, 1]) { const w = ball(.26, felt, k * r * .2, r * .05, 0); w.scale.set(1, .62, .22); w.rotation.z = k * (prize === 'wings' ? -.4 : -.15); }
      if (prize === 'batwings') for (const k of [-1, 1]) for (let j = 0; j < 3; j++) ball(.06, felt, k * r * (.1 + j * .12), -r * .1, 0).scale.set(1, 1, .3);
      break;
    }
    case 'pearls': for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2; ball(.07, vinyl(0xf7f2ea, .3), Math.cos(a) * r * .3, Math.sin(a) * r * .22 - r * .04, Math.sin(a) * r * .12); } break;
    case 'witchhat': {
      const felt = vinyl(0x6b4f7a, .85);
      add(new THREE.CylinderGeometry(r * .36, r * .36, r * .04, 24), felt, 0, -r * .14, 0);
      add(new THREE.ConeGeometry(r * .2, r * .5, 18), felt, r * .04, r * .12, 0).rotation.z = -.25;
      ball(.05, vinyl(0xf3dc98, .4), 0, -r * .05, r * .2);
      break;
    }
    case 'pumpkin': {
      const pumpkin = ball(.3, vinyl(0xf0a050, .6), 0, -r * .04, 0); pumpkin.scale.set(1.15, .85, 1.15);
      add(new THREE.CylinderGeometry(r * .035, r * .045, r * .14, 8), vinyl(0x6e8a55, .8), 0, r * .24, 0);
      break;
    }
    case 'xmashat': {
      add(new THREE.ConeGeometry(r * .26, r * .48, 18), vinyl(0xd5525e, .7), 0, r * .08, 0).rotation.z = -.3;
      add(new THREE.TorusGeometry(r * .25, r * .07, 8, 24), vinyl(0xffffff, .95), 0, -r * .14, 0).rotation.x = Math.PI / 2;
      ball(.08, vinyl(0xffffff, .95), r * .16, r * .3, 0);
      break;
    }
    // An outfit when its own model couldn't be made: a little dress in its colours.
    case 'outfit': {
      add(new THREE.ConeGeometry(r * .42, r * .56, 20), m, 0, -r * .12, 0);
      add(new THREE.CylinderGeometry(r * .13, r * .17, r * .22, 16), m, 0, r * .26, 0);
      add(new THREE.TorusGeometry(r * .4, r * .035, 8, 28), a2, 0, -r * .39, 0).rotation.x = Math.PI / 2;
      for (const k of [-1, 1]) ball(.07, a2, k * r * .06, r * .15, r * .15).scale.set(1, .7, .5);
      break;
    }
    case 'again': g.add(tile(r * 1.1, r * .62, draws.mini(P.ink), vinyl(P.cream, .5))); break;
    case 'note': {
      const paper = vinyl(0xfbf3e4, .8);
      add(new THREE.CylinderGeometry(r * .11, r * .11, r * .62, 16), paper, 0, 0, 0).rotation.z = Math.PI / 2 - .3;
      add(new THREE.TorusGeometry(r * .12, r * .025, 6, 18), vinyl(P.bow, .45), 0, 0, 0).rotation.y = Math.PI / 2 - .3;
      break;
    }
    default: break;
  }
  return g;
}
const LITTLE = ['dress', 'bow', 'button'];
// The ball something rare comes in: pale gold.
const RARE_BALL = 0xf1d68f;

// Back half in colour, front half clear and hinged on its left edge, something inside.
const ballGeo = {};
function ballHalf(front) {
  const key = front ? 'F' : 'B';
  return ballGeo[key] || (ballGeo[key] = shapeGeometry(STAR_BALL, new THREE.SphereGeometry(1, 40, 28, front ? 0 : Math.PI, Math.PI)));
}
function ballOf(r, color, inside, hero, P) {
  const g = new THREE.Group();
  // Seen from the front, the coloured half is seen from inside: both sides drawn.
  const back = finish(new THREE.Mesh(ballHalf(false), vinyl(color, .45)));
  back.material.side = THREE.DoubleSide;
  back.material.emissive = new THREE.Color(color); back.material.emissiveIntensity = 0; back.userData.glowMat = true;
  back.scale.setScalar(r);
  const w = r * 1.05;
  const hinge = new THREE.Group(); hinge.position.set(-w, 0, 0);
  const front = new THREE.Mesh(ballHalf(true), hero ? capFace() : capTop()); front.scale.setScalar(r * 1.01); front.position.set(w, 0, 0); hinge.add(front);
  const item = insideOf(inside.shape || inside.kind, r, inside.color, P, inside.accent, inside.object);
  g.add(back, hinge, item);
  // The one that comes out gets a moulded seam round its edge, so its shape reads up close.
  if (hero) {
    const pts = [], d = new THREE.Vector3(), o = new THREE.Vector3();
    for (let i = 0; i < 160; i++) { const a = i / 160 * Math.PI * 2; d.set(Math.cos(a), Math.sin(a), 0); pts.push(shapePoint(d, STAR_BALL, o).clone().multiplyScalar(r)); }
    g.add(finish(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, r * .06, 8, true), vinyl(new THREE.Color(color).multiplyScalar(.82).getHex(), .45))));
  }
  g.userData = {hinge, item};
  return g;
}

// The machine on a canvas. `onState(state)` hears 'idle', 'paid', 'busy',
// 'ready' and 'open'; `onTap(part)` hears taps on the slot ('ticket'), the
// dial ('crank') or the ball ('ball'). Returns what drives it.
export function createCapsuleMachine(canvas, {palette = 0, night = false, onState = () => {}, onTap = () => {}} = {}) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = PALETTES[((palette % 4) + 4) % 4];
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe8d8e0, .6 * LIGHT); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e6, .85 * LIGHT);
  sun.position.set(1.8, 3.6, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {left: -1.3, right: 1.3, top: 1.9, bottom: -1.1, near: .5, far: 9});
  sun.shadow.radius = 5; sun.shadow.bias = -.0006; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xf0e6ff, .3 * LIGHT); fill.position.set(-2.4, 1.6, -1.4); scene.add(fill);
  const groundMat = new THREE.ShadowMaterial({opacity: .14});
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const rig = new THREE.Group(); scene.add(rig);

  // ---- the machine ----
  const S = BEAR, C = new THREE.Vector3(0, S.yc, 0), machine = new THREE.Group(); rig.add(machine);
  const M = {body: vinyl(P.body), trim: vinyl(P.trim), cream: vinyl(P.cream, .5), hole: vinyl(0x4b3f4f, .9)};
  machine.add(finish(new THREE.Mesh(softBox(.7, .07, .56, .02, .06), M.trim)));
  const body = finish(new THREE.Mesh(softBox(.64, .4, .5, .045, .07), M.body)); body.position.y = .07; machine.add(body);
  const rim = finish(new THREE.Mesh(softBox(.66, .036, .52, .012, .07), M.cream)); rim.position.y = .468; machine.add(rim);
  // Studs at the rim corners: it is built from bricks.
  const studGeo = new THREE.CylinderGeometry(.016, .016, .013, 18);
  for (let ix = -5; ix <= 5; ix++) for (let iz = -4; iz <= 4; iz++) {
    const x = ix * .055, z = iz * .055;
    if (Math.hypot(x, z) < .345 || Math.abs(x) > .3 || Math.abs(z) > .225) continue;
    machine.add(mesh(studGeo, M.cream, x, .51, z));
  }
  // A wide collar for the round bear, and a ribbon round its neck tied in a bow at the front.
  machine.add(mesh(new THREE.CylinderGeometry(.3, .31, .04, 64), M.cream, 0, .52, 0));
  const ring = mesh(new THREE.TorusGeometry(.295, .022, 14, 64), M.trim, 0, .545, 0); ring.rotation.x = Math.PI / 2; machine.add(ring);
  const ribbon = vinyl(P.bow, .42);
  const band = mesh(new THREE.TorusGeometry(.288, .014, 10, 80), ribbon, 0, .578, 0); band.rotation.x = Math.PI / 2; machine.add(band);
  const bow = new THREE.Group(); bow.position.set(0, .582, .305); bow.scale.setScalar(1.35);
  for (const s of [-1, 1]) {
    const loop = mesh(new THREE.TorusGeometry(.052, .018, 12, 32), ribbon, s * .058, .012, 0); loop.scale.set(1, .7, .45); loop.rotation.z = s * .3; bow.add(loop);
    const tail = mesh(plate(.032, .07, .012, .004, .009), ribbon, s * .028, -.042, .006); tail.rotation.z = s * .4; bow.add(tail);
  }
  const knot = mesh(new THREE.SphereGeometry(.025, 16, 12), ribbon, 0, .008, .01); knot.scale.set(1, .9, .7); bow.add(knot);
  machine.add(bow);
  // The glass, tinted with the machine's colour, and a moulded seam around its outline.
  const glassMat = new THREE.MeshPhysicalMaterial({color: P.body, roughness: .06, metalness: 0, transparent: true, opacity: .2, depthWrite: false});
  const dome = new THREE.Mesh(shapeGeometry(S, new THREE.SphereGeometry(1, 120, 90)), glassMat); dome.position.copy(C); dome.renderOrder = 3; machine.add(dome);
  const outline = [], d = new THREE.Vector3(), o = new THREE.Vector3();
  for (let i = 0; i < 240; i++) { const a = i / 240 * Math.PI * 2; d.set(Math.cos(a), Math.sin(a), 0); outline.push(shapePoint(d, S, o).clone().add(C)); }
  machine.add(finish(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline, true), 480, .012, 8, true), M.trim)));
  // Front tiles: the name, the dial with its crank, the ticket slot, a few stars.
  const front = .25 + .0005;
  const name = tile(.3, .06, draws.name(P.ink), M.cream); name.position.set(0, .43, front); machine.add(name);
  const dialTile = tile(.17, .17, draws.dial(P.ink), M.cream); dialTile.position.set(0, .29, front); machine.add(dialTile);
  const crank = new THREE.Group(); crank.position.set(0, .29, front + .02);
  crank.add(mesh(new THREE.CylinderGeometry(.062, .066, .03, 40).rotateX(Math.PI / 2), M.cream));
  crank.add(mesh(plate(.1, .028, .028, .008, .006), M.trim, 0, 0, .02));
  machine.add(crank);
  const ticketTile = tile(.1, .13, draws.ticket(P.ink), M.cream); ticketTile.position.set(.205, .29, front); machine.add(ticketTile);
  const starsTile = tile(.1, .13, draws.stars(P.ink), M.cream); starsTile.position.set(-.205, .29, front); machine.add(starsTile);
  // The exit: a mailbox flap over a dark mouth, a little tray in front.
  machine.add(mesh(plate(.2, .07, .03, .008, .02), M.hole, 0, .14, .245));
  const flap = tile(.21, .065, draws.flap(P.ink), M.cream); flap.position.set(0, .16, front + .014); flap.rotation.x = -.28; machine.add(flap);
  const trayMat = vinyl(P.trim); trayMat.side = THREE.DoubleSide;
  machine.add(mesh(new THREE.CylinderGeometry(.07, .07, .22, 28, 1, true, Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), trayMat, 0, .085, .31));
  machine.add(mesh(new THREE.BoxGeometry(.22, .012, .07), M.trim, 0, .018 + .06, .3));
  // Gingham sides.
  for (const s of [-1, 1]) {
    const g = tile(.4, .26, draws.gingham(hex(P.cream), hex(P.trim)), M.body);
    g.rotation.y = s * Math.PI / 2; g.position.set(s * .3205, .4, 0); machine.add(g);
  }
  // Star balls, packed from the bottom up inside the bear.
  const glows = [], inner = [];
  const rnd = seeded(528), pts = [], r = S.capR, ext = S.R;
  let tries = 0;
  while (pts.length < S.count && tries < 20000) {
    tries++;
    const p = new THREE.Vector3((rnd() * 2 - 1) * ext, -ext + Math.pow(rnd(), 1.3) * (ext + S.fill), (rnd() * 2 - 1) * ext);
    if (!insideBear(p, S, r) || pts.some(q => q.distanceTo(p) < 2 * r * .97)) continue;
    pts.push(p);
  }
  pts.sort((a, b) => a.y - b.y);
  pts.forEach((p, i) => {
    const k = i % CAPC.length;
    const cap = ballOf(r, CAPC[k], {kind: LITTLE[i % 3], color: ITEMC[(i * 3) % ITEMC.length]}, false, P);
    cap.position.copy(C).add(p); cap.rotation.set(rnd() * .6 - .3, rnd() * 1.2 - .6, rnd() * .6 - .3);
    cap.userData.base = {p: cap.position.clone(), r: cap.rotation.clone(), ph: rnd() * 6.28};
    machine.add(cap); inner.push(cap);
    const gl = glow(GLOWC[k], r * 5.4); gl.position.copy(cap.position); gl.userData.phase = rnd() * 6.28; gl.userData.speed = .6 + rnd() * 1.1;
    machine.add(gl); glows.push(gl);
  });
  const innerLight = new THREE.PointLight(0xffd8a0, 0, 1.6, 2); innerLight.position.copy(C); machine.add(innerLight);

  // ---- framing, night ----
  let size = [1, 1];
  function resize(w, h) {
    size = [Math.max(1, w), Math.max(1, h)];
    renderer.setSize(size[0], size[1], false);
    camera.aspect = size[0] / size[1];
    const fit = 1.45, focus = .7;
    const dist = Math.max(fit * 2.0, fit * 2.0 / Math.min(1, camera.aspect * 1.3)) + .2;
    camera.position.set(0, focus + dist * .17, dist);
    camera.lookAt(0, focus, 0);
    camera.updateProjectionMatrix();
  }
  let isNight = night;
  function setNight(on) {
    isNight = !!on;
    scene.background = new THREE.Color(isNight ? P.bgNight : P.bg);
    groundMat.opacity = isNight ? .4 : .14;
    hemi.intensity = (isNight ? .2 : .6) * LIGHT; sun.intensity = (isNight ? .14 : .8) * LIGHT; fill.intensity = (isNight ? .06 : .3) * LIGHT;
    innerLight.intensity = isNight ? .9 * LIGHT : 0;
    scene.traverse(x => { if (x.userData.glowMat) x.material.emissiveIntensity = isNight ? .8 : 0; });
  }

  // ---- the moment: a ticket in, a turn, a ball to your face, what was inside ----
  const clock = new THREE.Clock(), anims = [];
  const animate = (dur, fn, done) => anims.push({t0: clock.getElapsedTime(), dur, fn, done});
  const ease = u => 1 - Math.pow(1 - u, 3);
  let state = 'idle', ball = null, prize = null, alive = true;
  const setState = s => { state = s; onState(s); };
  const MOUTH = new THREE.Vector3(0, .13, .26), REST = new THREE.Vector3(0, .1, .32);
  // Turn the machine back to face you before anything happens.
  function faceFront(then) {
    const from = rig.rotation.y, to = Math.round(from / (Math.PI * 2)) * Math.PI * 2, fx = rig.rotation.x;
    animate(.35, u => { const e = ease(u); rig.rotation.y = from + (to - from) * e; rig.rotation.x = fx * (1 - e); }, then);
  }
  // `what` is what this ticket will bring: the inside to show, and its colour.
  function insert(what) {
    if (state !== 'idle') return false;
    prize = what; setState('busy');
    faceFront(() => {
      const tk = tile(.075, .042, draws.mini(P.ink), vinyl(P.cream, .5));
      tk.position.set(.205, .43, .46); tk.rotation.x = -.2; machine.add(tk);
      play('boxRibbon', {volume: .8});
      const a = tk.position.clone(), b = new THREE.Vector3(.205, .325, .27);
      animate(.5, u => {
        const e = ease(u);
        tk.position.lerpVectors(a, b, e);
        tk.rotation.x = -.2 - 1.25 * e;
        tk.scale.y = u < .6 ? 1 : 1 - (u - .6) / .4 * .95;
      }, () => { machine.remove(tk); setState('paid'); });
    });
    return true;
  }
  // A ticket already in the slot (one that came back out of a ball).
  function load(what) { if (state !== 'idle') return false; prize = what; setState('paid'); return true; }
  function turn() {
    if (state !== 'paid') return false;
    setState('busy'); play('gachaTurn');
    const start = crank.rotation.z;
    animate(.42, u => { crank.rotation.z = start - (Math.floor(u * 6) + Math.min(1, (u * 6 % 1) * 2.5)) / 6 * Math.PI * 2; }, () => { crank.rotation.z = start - Math.PI * 2; });
    // The balls inside jostle with every click of the crank.
    animate(.75, u => {
      const fade = 1 - u, hop = Math.abs(Math.sin(Math.PI * 6 * Math.min(1, u / .56)));
      for (const c of inner) {
        const b = c.userData.base, w = Math.sin(u * 52 + b.ph);
        c.position.set(b.p.x + .012 * fade * w, b.p.y + .016 * fade * hop * (.6 + .4 * Math.sin(b.ph)), b.p.z + .008 * fade * Math.cos(u * 47 + b.ph));
        c.rotation.set(b.r.x + .22 * fade * w, b.r.y + .18 * fade * Math.sin(u * 39 + b.ph), b.r.z + .2 * fade * Math.cos(u * 44 + b.ph));
      }
    }, () => { for (const c of inner) { c.position.copy(c.userData.base.p); c.rotation.copy(c.userData.base.r); } drop(); });
    return true;
  }
  function drop() {
    const b = ballOf(.06, prize.ballColor ?? (prize.rare ? RARE_BALL : CAPC[prize.ball % CAPC.length]), prize, true, P);
    ball = b; b.position.copy(MOUTH); b.scale.setScalar(.3); machine.add(b); setNight(isNight);
    animate(.16, u => { b.scale.setScalar(.3 + .7 * u); b.position.lerpVectors(MOUTH, REST, u); b.position.y = MOUTH.y + .02 * Math.sin(u * Math.PI); }, () => {
      play('gachaDrop');
      animate(.16, u => { b.position.y = REST.y + .028 * 4 * u * (1 - u); }, () => setTimeout(() => fly(b), 120));
    });
  }
  // The ball leaps out of the tray and stops right in front of you.
  function fly(b) {
    if (!alive || ball !== b) return;
    scene.attach(b);
    const from = b.position.clone(), q0 = b.quaternion.clone(), s0 = b.scale.x;
    const dir = new THREE.Vector3(0, .7, 0).sub(camera.position).normalize();
    // Close enough to fill your eyes, but on a narrow phone it keeps to about 70% of the width.
    const near = Math.max(.95, .205 / (.7 * 2 * Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
    const to = camera.position.clone().addScaledVector(dir, near).add(new THREE.Vector3(0, -.03, 0));
    const look = new THREE.Object3D(); look.position.copy(to); look.lookAt(camera.position);
    play('turn');
    animate(.55, u => {
      const e = ease(u);
      b.position.lerpVectors(from, to, e); b.position.y += Math.sin(u * Math.PI) * .18;
      b.scale.setScalar(s0 + (1.45 - s0) * e);
      b.quaternion.copy(q0).slerp(look.quaternion, e);
      b.rotateZ((1 - e) * 6.28);
    }, () => { if (ball !== b) return; b.quaternion.copy(look.quaternion); b.userData.rest = to.clone(); setState('ready'); });
  }
  function open() {
    if (state !== 'ready' || !ball) return false;
    const b = ball;
    setState('busy'); play('gachaOpen');
    const {hinge, item} = b.userData, lid = hinge.children[0], clear = lid.material.opacity;
    // The clear front swings open and fades away: this close to the eye it would hang there like mist.
    animate(.4, u => { hinge.rotation.y = -2.1 * ease(u); lid.material.opacity = clear * (1 - u); }, () => { lid.visible = false; });
    // What was inside comes forward a little and keeps turning.
    animate(.6, u => { const e = ease(u); item.position.z = .045 * e; item.scale.setScalar(1 + .25 * e); });
    const sparks = [];
    // Something rare opens with more of a sparkle, and a little chime after.
    if (prize?.rare) setTimeout(() => { if (alive) play('found', {volume: .8}); }, 260);
    for (let i = 0; i < (prize?.rare ? 22 : 10); i++) {
      const s = glow(GLOWC[i % GLOWC.length], .045); s.material.opacity = 1;
      s.position.copy(b.position); s.userData.v = new THREE.Vector3((Math.random() - .5) * .35, .1 + Math.random() * .35, (Math.random() - .5) * .2);
      scene.add(s); sparks.push(s);
    }
    animate(1, u => { sparks.forEach(s => { s.position.addScaledVector(s.userData.v, .012); s.userData.v.y -= .006; s.material.opacity = 1 - u; }); }, () => sparks.forEach(s => scene.remove(s)));
    setTimeout(() => { if (alive && ball === b) setState('open'); }, 450);
    return true;
  }
  // Taken: the ball drops away. A ticket that came out flies back into the slot.
  function collect({ticketBack = false} = {}) {
    if (state !== 'open' || !ball) return false;
    const b = ball, from = b.position.clone(), s0 = b.scale.x;
    setState('busy');
    animate(.45, u => { const e = ease(u); b.position.set(from.x, from.y - .35 * e, from.z - .2 * e); b.scale.setScalar(s0 * (1 - e)); }, () => {
      scene.remove(b); if (ball === b) ball = null;
      if (!ticketBack) return setState('idle');
      const tk = tile(.075, .042, draws.mini(P.ink), vinyl(P.cream, .5));
      tk.position.set(0, .7, .9); machine.add(tk);
      play('boxRibbon', {volume: .7});
      const a = tk.position.clone(), c = new THREE.Vector3(.205, .325, .27);
      animate(.55, u => { const e = ease(u); tk.position.lerpVectors(a, c, e); tk.rotation.x = -1.45 * e; tk.scale.y = u < .6 ? 1 : 1 - (u - .6) / .4 * .95; }, () => { machine.remove(tk); setState('idle'); onState('back'); });
    });
    return true;
  }

  // ---- pointer: drag to turn it round, tap the slot, the dial or the ball ----
  let drag = null, idleSince = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const down = e => { drag = {x: e.clientX, y: e.clientY, t: performance.now(), moved: 0}; canvas.setPointerCapture?.(e.pointerId); };
  const move = e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    if (state === 'idle' || state === 'paid') {
      rig.rotation.y += dx * .01;
      rig.rotation.x = Math.max(-.25, Math.min(.35, rig.rotation.x + dy * .004));
    }
    idleSince = performance.now();
  };
  const up = e => {
    if (!drag) return;
    const tap = drag.moved < 8 && performance.now() - drag.t < 450;
    drag = null; idleSince = performance.now();
    if (!tap) return;
    const box = canvas.getBoundingClientRect();
    ndc.set((e.clientX - box.left) / box.width * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (state === 'ready' || state === 'open') return onTap('ball');
    if (ray.intersectObject(ticketTile, true).length) return onTap('ticket');
    if (ray.intersectObject(crank, true).length) return onTap('crank');
  };
  const cancel = () => { drag = null; };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);

  // ---- loop ----
  let frame = 0;
  function loop() {
    if (!alive) return;
    const t = clock.getElapsedTime();
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i], u = Math.min(1, (t - a.t0) / a.dur);
      a.fn(u); if (u >= 1) { anims.splice(i, 1); a.done && a.done(); }
    }
    if (!reduced && !drag && state === 'idle' && performance.now() - idleSince > 3500) rig.rotation.y += .0025;
    if (ball && ball.userData.rest && (state === 'ready' || state === 'open')) { ball.position.y = ball.userData.rest.y + Math.sin(t * 2.4) * .006; if (state === 'open') ball.userData.item.rotation.y += .02; }
    glows.forEach(g => { g.material.opacity = isNight ? (.28 + .3 * Math.sin(t * g.userData.speed + g.userData.phase) * (reduced ? 0 : 1)) : 0; });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  }
  setNight(night); setState('idle'); loop();

  return {
    get state() { return state; },
    resize, setNight, insert, load, turn, open, collect,
    dispose() {
      alive = false; cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      scene.traverse(x => {
        if (x.geometry && !Object.values(ballGeo).includes(x.geometry)) x.geometry.dispose();
        for (const m of [].concat(x.material || [])) { m.map?.dispose(); m.dispose(); }
      });
      renderer.dispose();
    }
  };
}
