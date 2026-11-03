import * as THREE from 'three';
import {play} from './sounds.js';
import {PALETTES, GLOWC, LIGHT, POINT, pointLight, finish, mesh, vinyl, softBox, tile, glow, star, draws, hex} from './machine-kit.js';
import {SEASON, boxThing, fillBox} from './blind-box.js';

// The blind box machine on the plaza, in three.js: the same soft vinyl base as
// the bear jar, with an arched front door and a step, and on top a little porch:
// four posts round a glass window, striped paper on its back wall, a pitched
// roof with a round attic window, and a porch lamp with a pull string. Six
// wrapped boxes sit on two shelves in the window, every one a different paper.
// What's in each box is decided when it's put in (blind-box.js); shaking it is
// the only clue. The thing that comes out is drawn by blindbox-overlay.jsx
// into `prize`, which rides inside the chosen box.

const PAPERC = [0xf4b6c8, 0xa9dfc6, 0xc7b8f0, 0xf5dc8f, 0xaccdf2, 0xf7c4a6];
const RIBBONC = [0xffffff, 0xe47a9a, 0xffffff, 0xe47a9a, 0xffffff, 0xffffff];
const PATTERNS = ['dots', 'stripes', 'gingham', 'stars', 'flowers', 'waves'];
const FLOOR = .512, CASE_H = .44, CASE_TOP = .504 + CASE_H, SHELF_TOP = .724, STEP_Y = .092;
const DOOR = {w: .15, h: .225, y: .085};
const SLOTS = [];
for (const y of [SHELF_TOP, FLOOR]) for (const x of [-.165, 0, .165]) SLOTS.push(new THREE.Vector3(x, y, .03));
const BOX = {w: .095, h: .074, lid: .024, over: .0035, rib: .015};
// How big what's inside is drawn, across its widest.
export const PRIZE_SIZE = .07;
const backOut = u => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);

// Little line drawings of this season's things, for the card on the machine and the row above it.
export function icon(x, id, cx, cy, s, ink) {
  x.save(); x.translate(cx, cy); x.scale(s / 100, s / 100);
  x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round';
  const line = (...p) => { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.stroke(); };
  const daisy = (px, py, r) => { for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 - Math.PI / 2; x.beginPath(); x.ellipse(px + Math.cos(a) * r, py + Math.sin(a) * r, r * .7, r * .45, a, 0, Math.PI * 2); x.stroke(); } x.beginPath(); x.arc(px, py, r * .4, 0, Math.PI * 2); x.fill(); };
  if (id === 'lamp') {
    x.beginPath(); x.moveTo(-15, -34); x.lineTo(15, -34); x.lineTo(30, -2); x.lineTo(-30, -2); x.closePath(); x.stroke();
    line(0, -2, 0, 30); line(-18, 34, 18, 34);
  } else if (id === 'cushion') {
    x.beginPath(); x.arc(0, 0, 32, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(0, 0, 6, 0, Math.PI * 2); x.fill();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; line(Math.cos(a) * 13, Math.sin(a) * 13, Math.cos(a) * 22, Math.sin(a) * 22); }
  } else if (id === 'stool') {
    x.beginPath(); x.ellipse(0, -18, 32, 10, 0, 0, Math.PI * 2); x.stroke();
    line(-22, -10, -28, 34); line(22, -10, 28, 34); line(0, -8, 0, 30);
  } else if (id === 'vase') {
    x.beginPath(); x.moveTo(-9, -6); x.bezierCurveTo(-32, 6, -26, 34, -14, 36); x.lineTo(14, 36); x.bezierCurveTo(26, 34, 32, 6, 9, -6); x.stroke();
    line(0, -6, 2, -24);
    x.beginPath(); x.arc(2, -32, 8, 0, Math.PI * 2); x.fill();
  } else if (id === 'jar') {
    x.beginPath(); x.moveTo(-20, -14); x.bezierCurveTo(-36, -4, -36, 30, -18, 34); x.lineTo(18, 34); x.bezierCurveTo(36, 30, 36, -4, 20, -14); x.closePath(); x.stroke();
    x.strokeRect(-17, -24, 34, 9);
    x.beginPath(); x.arc(0, -31, 5, 0, Math.PI * 2); x.fill();
    for (const [px, py] of [[-10, 18], [6, 22], [-2, 6], [12, 8]]) { x.beginPath(); x.arc(px, py, 4, 0, Math.PI * 2); x.fill(); }
  } else if (id === 'daisies') {
    x.beginPath(); x.moveTo(-24, 6); x.lineTo(24, 6); x.lineTo(17, 36); x.lineTo(-17, 36); x.closePath(); x.stroke();
    daisy(-12, -14, 9); daisy(13, -20, 9); daisy(2, -32, 7);
  } else if (id === 'lantern') {
    x.beginPath(); x.moveTo(-22, -8); x.lineTo(0, -30); x.lineTo(22, -8); x.closePath(); x.stroke();
    x.strokeRect(-16, -8, 32, 38);
    x.beginPath(); x.arc(0, 11, 7, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(0, -37, 5, 0, Math.PI * 2); x.stroke();
  } else {
    x.font = '700 78px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 0, 5);
  }
  x.restore();
}
// Soft striped wallpaper for the back of the window; the season's card on the front.
const wallpaper = (a, b) => (x, w, h) => {
  x.fillStyle = a; x.fillRect(0, 0, w, h);
  x.fillStyle = b; x.globalAlpha = .2;
  for (let i = 4; i < w; i += 18) x.fillRect(i, 0, 7, h);
  x.globalAlpha = 1;
};
const lineup = ink => (x, w, h) => {
  x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `600 ${Math.round(h * .085)}px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif`;
  x.fillText('这一季', w / 2, h * .1);
  const s = w * .27;
  SEASON.items.forEach((it, i) => icon(x, it.id, w * (.2 + .3 * (i % 3)), h * (.32 + .24 * Math.floor(i / 3)), s, ink));
  x.font = `600 ${Math.round(h * .07)}px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif`;
  x.fillStyle = ink; x.fillText('隐藏款', w * .4, h * .86);
  icon(x, '?', w * .72, h * .86, s * .75, ink);
};

function paperTexture(color, pattern) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), white = 'rgba(255,255,255,.88)';
  x.fillStyle = hex(color); x.fillRect(0, 0, 128, 128);
  x.fillStyle = white; x.strokeStyle = white;
  if (pattern === 'dots') {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(16 + i * 32 + (j % 2) * 16, 16 + j * 32, 5.5, 0, 7); x.fill(); }
  } else if (pattern === 'stripes') {
    x.lineWidth = 9; for (let k = -128; k <= 128; k += 32) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 128, 128); x.stroke(); }
  } else if (pattern === 'gingham') {
    x.globalAlpha = .5; for (let i = 0; i < 4; i++) { x.fillRect(i * 32, 0, 16, 128); x.fillRect(0, i * 32, 128, 16); } x.globalAlpha = 1;
  } else if (pattern === 'stars') {
    for (const [px, py, r] of [[22, 26, 10], [88, 20, 7], [60, 70, 11], [108, 94, 8], [26, 104, 7]]) star(x, px, py, r, white);
  } else if (pattern === 'flowers') {
    for (const [px, py] of [[28, 30], [92, 52], [40, 96], [100, 108]]) {
      x.fillStyle = white;
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; x.beginPath(); x.arc(px + Math.cos(a) * 7, py + Math.sin(a) * 7, 5, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(245,200,90,.95)'; x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill();
    }
  } else {
    x.lineWidth = 5; for (let j = 0; j < 4; j++) { x.beginPath(); for (let i = 0; i < 4; i++) x.arc(16 + i * 32, 22 + j * 32, 16, Math.PI, 0); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function canvasMaterial(size, draw, roughness) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({map: t, roughness});
}

// `onState(state, hint)` hears 'idle', 'pick', 'busy', 'ready' and 'open'.
// `onChoose(id)` hears what's in the box just chosen and says whether the
// ticket went in (it keeps the thing at once). What's in it is drawn into
// `prize`, which goes into the box and comes up once the lid is off.
export function createBlindBoxMachine({palette = 0, night = false, onState = () => {}, onChoose = () => true} = {}) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = PALETTES[((palette % 4) + 4) % 4];
  const root = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe8d8e0, .6 * LIGHT); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e6, .85 * LIGHT);
  sun.position.set(1.8, 3.6, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {left: -1.3, right: 1.3, top: 1.9, bottom: -1.1, near: .5, far: 9});
  sun.shadow.radius = 5; sun.shadow.bias = -.0006; root.add(sun);
  const fill = new THREE.DirectionalLight(0xf0e6ff, .3 * LIGHT); fill.position.set(-2.4, 1.6, -1.4); root.add(fill);
  const groundMat = new THREE.ShadowMaterial({opacity: .14});
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  const rig = new THREE.Group(); root.add(rig);

  const lampMat = new THREE.MeshStandardMaterial({color: 0xfff3da, emissive: 0xffc06a, emissiveIntensity: .12, roughness: .35});
  const brassMat = new THREE.MeshStandardMaterial({color: 0xe2b65c, roughness: .35, metalness: .25});
  const lits = [];
  const litMat = () => { const m = new THREE.MeshStandardMaterial({color: 0xfff1d6, emissive: 0xffc06a, emissiveIntensity: 0, roughness: .35}); lits.push(m); return m; };
  const archShape = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0); return s; };
  const archGeo = (w, h, d) => new THREE.ExtrudeGeometry(archShape(w, h), {depth: d, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 2, curveSegments: 24});

  // ---- the boxes ----
  const insideMat = canvasMaterial(64, (x, n) => { const g = x.createRadialGradient(32, 32, 6, 32, 32, 46); g.addColorStop(0, '#fbf3ea'); g.addColorStop(1, '#c9b8b0'); x.fillStyle = g; x.fillRect(0, 0, n, n); }, .9);
  const boardMat = new THREE.MeshStandardMaterial({color: 0xf3e6d8, roughness: .9});
  // The underside of every lid has a small print on it, seen once the lid flips back.
  const lidInsideMat = canvasMaterial(128, x => {
    x.fillStyle = '#fbf3ec'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#e7b8c6'; x.lineWidth = 3; x.setLineDash([7, 6]); x.strokeRect(12, 12, 104, 104); x.setLineDash([]);
    star(x, 64, 52, 17, '#d98aa4');
    x.fillStyle = '#c47b93'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'italic 600 21px Georgia, "Times New Roman", serif'; x.fillText('Porchlit', 64, 90);
  }, .85);
  // A wrapped box: paper body, a lid over its top edge, ribbon both ways round and a bow.
  function giftBox({paper, pattern, ribbon, thing}) {
    const g = new THREE.Group(), wob = new THREE.Group(); g.add(wob);
    const paperMat = new THREE.MeshStandardMaterial({map: paperTexture(paper, pattern), roughness: .72});
    const W = BOX.w, H = BOX.h, L = BOX.lid, O = BOX.over, R = BOX.rib, T = .0022, lap = .008, t = .003, I = boardMat, Pm = paperMat;
    // Open-topped: paper outside, plain board inside, so it reads as open once the lid is up.
    for (const [geo, mats, x, z] of [
      [new THREE.BoxGeometry(t, H, W), [I, Pm, I, Pm, Pm, Pm], -W / 2 + t / 2, 0],
      [new THREE.BoxGeometry(t, H, W), [Pm, I, I, Pm, Pm, Pm], W / 2 - t / 2, 0],
      [new THREE.BoxGeometry(W - 2 * t, H, t), [Pm, Pm, I, Pm, Pm, I], 0, W / 2 - t / 2],
      [new THREE.BoxGeometry(W - 2 * t, H, t), [Pm, Pm, I, Pm, I, Pm], 0, -W / 2 + t / 2]
    ]) { const m = finish(new THREE.Mesh(geo, mats)); m.position.set(x, H / 2, z); wob.add(m); }
    const floor = finish(new THREE.Mesh(new THREE.BoxGeometry(W - 2 * t, t, W - 2 * t), [Pm, Pm, insideMat, Pm, Pm, Pm])); floor.position.y = t / 2; wob.add(floor);
    // The lid hinges on its back edge.
    const lid = new THREE.Group(); lid.position.set(0, H, -(W / 2 + O)); wob.add(lid);
    const lidMesh = finish(new THREE.Mesh(new THREE.BoxGeometry(W + 2 * O, L, W + 2 * O), [Pm, Pm, Pm, lidInsideMat, Pm, Pm]));
    lidMesh.position.set(0, L / 2 - lap, W / 2 + O); lid.add(lidMesh);
    const topY = H + L - lap, span = W + 2 * O + 2 * T;
    const ribMat = new THREE.MeshStandardMaterial({color: ribbon, roughness: .35, transparent: true});
    const bands = new THREE.Group(); wob.add(bands);
    bands.add(mesh(new THREE.BoxGeometry(span, T, R), ribMat, 0, topY + T / 2, 0));
    bands.add(mesh(new THREE.BoxGeometry(R, T, span), ribMat, 0, topY + T / 2, 0));
    for (const s of [-1, 1]) {
      bands.add(mesh(new THREE.BoxGeometry(T, L, R), ribMat, s * (W / 2 + O + T / 2), H + L / 2 - lap, 0));
      bands.add(mesh(new THREE.BoxGeometry(R, L, T), ribMat, 0, H + L / 2 - lap, s * (W / 2 + O + T / 2)));
      bands.add(mesh(new THREE.BoxGeometry(T, H - lap, R), ribMat, s * (W / 2 + T / 2), (H - lap) / 2, 0));
      bands.add(mesh(new THREE.BoxGeometry(R, H - lap, T), ribMat, 0, (H - lap) / 2, s * (W / 2 + T / 2)));
    }
    const bow = new THREE.Group(); bow.position.y = topY + T; wob.add(bow);
    for (const s of [-1, 1]) {
      const loop = mesh(new THREE.TorusGeometry(.0115, .0036, 8, 24), ribMat, s * .0125, .009, 0);
      loop.scale.set(1.25, .8, 1); loop.rotation.z = s * .38; bow.add(loop);
      const tp = new THREE.Group(); tp.rotation.y = s * .55; bow.add(tp);
      tp.add(mesh(new THREE.BoxGeometry(.007, T, .028), ribMat, 0, .001, .014));
    }
    const knot = mesh(new THREE.SphereGeometry(.0065, 12, 10), ribMat, 0, .007, 0); knot.scale.set(1, .85, .85); bow.add(knot);
    g.userData = {isBox: true, wob, lid, bands, bow, ribMat, thing};
    return g;
  }

  // ---- the machine ----
  const machine = new THREE.Group(); rig.add(machine);
  const M = {body: vinyl(P.body), trim: vinyl(P.trim), cream: vinyl(P.cream, .5), hole: vinyl(0x4b3f4f, .9)};
  machine.add(finish(new THREE.Mesh(softBox(.7, .07, .56, .02, .06), M.trim)));
  const body = finish(new THREE.Mesh(softBox(.64, .4, .5, .045, .07), M.body)); body.position.y = .07; machine.add(body);
  const rim = finish(new THREE.Mesh(softBox(.66, .036, .52, .012, .07), M.cream)); rim.position.y = .468; machine.add(rim);
  const front = .25 + .0005;
  const name = tile(.24, .052, draws.name(P.ink), M.cream); name.position.set(0, .41, front); machine.add(name);
  const ticketTile = tile(.1, .13, draws.ticket(P.ink), M.cream); ticketTile.position.set(.2, .25, front); machine.add(ticketTile);
  const card = tile(.15, .19, lineup(P.ink), M.cream); card.position.set(-.195, .25, front); machine.add(card);
  for (const s of [-1, 1]) {
    const g = tile(.4, .26, draws.gingham(hex(P.cream), hex(P.trim)), M.body);
    g.rotation.y = s * Math.PI / 2; g.position.set(s * .3205, .3, 0); machine.add(g);
  }
  // The front door: the box you keep comes out here, onto the step.
  machine.add(mesh(archGeo(DOOR.w + .028, DOOR.h + .014, .006), M.cream, 0, DOOR.y, front - .004));
  machine.add(mesh(archGeo(DOOR.w, DOOR.h, .004), M.hole, 0, DOOR.y, front + .003));
  const door = new THREE.Group(); door.position.set(-DOOR.w / 2, DOOR.y, front + .009); machine.add(door);
  door.add(mesh(archGeo(DOOR.w - .004, DOOR.h - .003, .007), M.trim, DOOR.w / 2, 0, 0));
  door.add(mesh(new THREE.CircleGeometry(.021, 28), litMat(), DOOR.w / 2, DOOR.h - .068, .0115));
  door.add(mesh(new THREE.TorusGeometry(.021, .0042, 8, 32), M.cream, DOOR.w / 2, DOOR.h - .068, .0105));
  door.add(mesh(new THREE.SphereGeometry(.0085, 14, 10), brassMat, DOOR.w - .024, DOOR.h * .4, .0135));
  machine.add(mesh(softBox(.21, .022, .085, .006, .012), M.cream, 0, .07, .295));
  // The window: a glass case on four porch posts, a shelf, and striped paper on the back wall.
  for (const [x, z] of [[-.29, -.215], [.29, -.215], [-.29, .215], [.29, .215]]) {
    machine.add(mesh(new THREE.CylinderGeometry(.016, .016, CASE_H, 18), M.cream, x, .504 + CASE_H / 2, z));
    machine.add(mesh(new THREE.CylinderGeometry(.023, .025, .022, 18), M.trim, x, .515, z));
    machine.add(mesh(new THREE.CylinderGeometry(.025, .023, .022, 18), M.trim, x, CASE_TOP - .011, z));
  }
  const wall = tile(.56, CASE_H, wallpaper(hex(P.cream), hex(P.trim)), M.cream); wall.position.set(0, .504 + CASE_H / 2, -.2); machine.add(wall);
  machine.add(mesh(new THREE.BoxGeometry(.56, .012, .42), M.cream, 0, FLOOR - .006, 0));
  machine.add(mesh(new THREE.BoxGeometry(.56, .012, .4), M.cream, 0, SHELF_TOP - .006, 0));
  machine.add(mesh(new THREE.BoxGeometry(.56, .02, .008), M.trim, 0, SHELF_TOP - .008, .2));
  const glassMat = new THREE.MeshPhysicalMaterial({color: 0xffffff, roughness: .05, metalness: 0, transparent: true, opacity: .1, depthWrite: false});
  const glassBox = new THREE.Mesh(new THREE.BoxGeometry(.56, CASE_H, .42), glassMat); glassBox.position.set(0, .504 + CASE_H / 2, 0); glassBox.renderOrder = 3; machine.add(glassBox);
  // Ceiling, attic and a pitched roof, like every porch on the street.
  const ceil = finish(new THREE.Mesh(softBox(.66, .03, .52, .01, .05), M.cream)); ceil.position.y = CASE_TOP; machine.add(ceil);
  const RB = CASE_TOP + .03, RW = .31, RH = .17;
  const tri = new THREE.Shape(); tri.moveTo(-RW, 0); tri.lineTo(RW, 0); tri.lineTo(0, RH); tri.lineTo(-RW, 0);
  const attic = finish(new THREE.Mesh(new THREE.ExtrudeGeometry(tri, {depth: .44, bevelEnabled: false}), M.body)); attic.position.set(0, RB, -.22); machine.add(attic);
  const slope = Math.atan2(RH, RW), len = Math.hypot(RW, RH) + .06;
  for (const s of [-1, 1]) {
    const slab = finish(new THREE.Mesh(softBox(len, .03, .56, .01, .02).translate(0, -.015, 0), M.trim));
    slab.position.set(s * RW / 2 + s * Math.sin(slope) * .015 + s * Math.cos(slope) * .03, RB + RH / 2 + Math.cos(slope) * .015 - Math.sin(slope) * .03, 0);
    slab.rotation.z = -s * slope; machine.add(slab);
  }
  const ridge = mesh(new THREE.CylinderGeometry(.017, .017, .58, 16), M.cream, 0, RB + RH + .022, 0); ridge.rotation.x = Math.PI / 2; machine.add(ridge);
  // A round attic window that glows at night.
  const winY = RB + .066;
  machine.add(mesh(new THREE.CircleGeometry(.031, 28), litMat(), 0, winY, .2215));
  machine.add(mesh(new THREE.TorusGeometry(.031, .006, 8, 32), M.cream, 0, winY, .222));
  machine.add(mesh(new THREE.BoxGeometry(.062, .005, .004), M.cream, 0, winY, .224));
  machine.add(mesh(new THREE.BoxGeometry(.005, .062, .004), M.cream, 0, winY, .224));
  // The porch lamp under the eaves, with a pull string.
  const lamp = new THREE.Group(); lamp.position.set(0, CASE_TOP, .245); machine.add(lamp);
  lamp.add(mesh(new THREE.CylinderGeometry(.0022, .0022, .02, 6), M.trim, 0, -.01, 0));
  const shadeMat = vinyl(P.trim); shadeMat.side = THREE.DoubleSide;
  lamp.add(mesh(new THREE.ConeGeometry(.033, .026, 28, 1, true), shadeMat, 0, -.031, 0));
  lamp.add(mesh(new THREE.SphereGeometry(.0065, 10, 8), M.trim, 0, -.019, 0));
  lamp.add(mesh(new THREE.SphereGeometry(.016, 18, 14), lampMat, 0, -.046, 0));
  const string = new THREE.Group(); string.position.set(.021, -.041, 0); lamp.add(string);
  string.add(mesh(new THREE.CylinderGeometry(.0011, .0011, .05, 5), vinyl(0xfaf3ea, .6), 0, -.025, 0));
  string.add(mesh(new THREE.SphereGeometry(.006, 10, 8), M.trim, 0, -.053, 0));
  const lampGlow = glow(0xffc46a, .3); lampGlow.position.set(0, CASE_TOP - .046, .25); machine.add(lampGlow);
  const lampLight = pointLight(0xffd59a, 1.5); lampLight.position.set(0, CASE_TOP - .07, .3); machine.add(lampLight);
  const innerLight = pointLight(0xffe2b8, 1.1); innerLight.position.set(0, CASE_TOP - .06, .08); machine.add(innerLight);
  // What comes out of the box: drawn into this by the overlay, then put in the chosen box.
  const prize = new THREE.Group(); prize.visible = false;
  // Six wrapped boxes, every one a different paper.
  const slots = SLOTS.map(() => null);
  function fillSlot(i, pop, k = Math.floor(Math.random() * PAPERC.length)) {
    const twist = pop ? Math.floor(Math.random() * PATTERNS.length) : 0;
    const b = giftBox({paper: PAPERC[k], pattern: PATTERNS[(k + 2 + twist) % PATTERNS.length], ribbon: RIBBONC[k], thing: fillBox()});
    b.userData.slot = i; b.position.copy(SLOTS[i]); b.rotation.y = (Math.random() - .5) * .3;
    machine.add(b); slots[i] = b;
    if (pop) { b.scale.setScalar(.001); play('tap'); animate(.42, u => b.scale.setScalar(Math.max(.001, backOut(u)))); }
    return b;
  }

  // ---- framing, light ----
  let camera = null, scene = null, camLift = 0, camTarget = 0;
  // While choosing, the camera comes up to the window so every box is easy to tap.
  function placeCamera() {
    if (!camera) return;
    const fit = 1.62, focus = .6, aspect = camera.aspect || 1;
    const dist = Math.max(fit * 2.0, fit * 2.0 / Math.min(1, aspect * 1.3)) + .2;
    const p0 = new THREE.Vector3(0, focus + dist * .17, dist), t0 = new THREE.Vector3(0, focus, 0);
    const p1 = new THREE.Vector3(0, .86, 2.3 / Math.min(1, aspect * 1.4)), t1 = new THREE.Vector3(0, .72, 0);
    const k = camLift * camLift * (3 - 2 * camLift);
    camera.position.lerpVectors(p0, p1, k);
    camera.lookAt(t0.lerp(t1, k));
  }
  let isNight = night, lampOn = false;
  function setNight(on) {
    isNight = !!on;
    const lit = isNight || lampOn;
    if (scene) scene.background = new THREE.Color(isNight ? P.bgNight : P.bg);
    groundMat.opacity = isNight ? .4 : .14;
    hemi.intensity = (isNight ? .2 : .6) * LIGHT; sun.intensity = (isNight ? .14 : .8) * LIGHT; fill.intensity = (isNight ? .06 : .3) * LIGHT;
    lampMat.emissiveIntensity = lit ? 1.9 : .12;
    lampLight.intensity = (lit ? (isNight ? 1.1 : .45) : 0) * POINT;
    innerLight.intensity = (lit ? (isNight ? .9 : .3) : 0) * POINT;
    for (const m of lits) m.emissiveIntensity = isNight ? .9 : lampOn ? .4 : 0;
  }

  // ---- the moment: a ticket, the lamp on, pick one, shake it, untie it ----
  const anims = [];
  let clock = 0, alive = true;
  const animate = (dur, fn, done) => anims.push({t0: clock, dur, fn, done});
  const later = (fn, ms) => setTimeout(() => { if (alive) fn(); }, ms);
  const ease = u => 1 - Math.pow(1 - u, 3), smooth = u => u * u * (3 - 2 * u);
  let state = 'idle', held = null, chosen = null, shakeAt = -1;
  const setState = (s, hint) => {
    state = s;
    if (s === 'pick') camTarget = 1; else if (s !== 'busy') camTarget = 0;
    onState(s, hint);
  };
  function faceFront(then) {
    const from = rig.rotation.y, to = Math.round(from / (Math.PI * 2)) * Math.PI * 2, fx = rig.rotation.x;
    animate(.35, u => { const e = ease(u); rig.rotation.y = from + (to - from) * e; rig.rotation.x = fx * (1 - e); }, then);
  }
  // A ticket slides in (the caller has seen there is one), and the lamp goes on.
  function insert() {
    if (state !== 'idle') return false;
    setState('busy');
    faceFront(() => {
      const tk = tile(.075, .042, draws.mini(P.ink), vinyl(P.cream, .5));
      tk.position.set(.2, .39, .46); tk.rotation.x = -.2; machine.add(tk);
      play('boxRibbon', {volume: .8});
      const a = tk.position.clone(), b = new THREE.Vector3(.2, .285, .27);
      animate(.5, u => { const e = ease(u); tk.position.lerpVectors(a, b, e); tk.rotation.x = -.2 - 1.25 * e; tk.scale.y = u < .6 ? 1 : 1 - (u - .6) / .4 * .95; },
        () => { machine.remove(tk); pull(true, () => setState('pick')); });
    });
    return true;
  }
  // The lamp's pull string: down, click, back up.
  function pull(on, then) {
    const y0 = -.041;
    animate(.16, u => { string.position.y = y0 - .016 * smooth(u); }, () => {
      play(on ? 'porchLight' : 'click'); lampOn = on; setNight(isNight);
      animate(.22, u => { string.position.y = y0 - .016 * (1 - smooth(u)); }, then);
    });
  }
  // A shake: the box rocks side to side and whatever is inside answers.
  function shake(b, lifted) {
    if (clock - shakeAt < .3) return;
    shakeAt = clock;
    const w = b.userData.wob, it = boxThing(b.userData.thing), y0 = w.position.y, top = lifted ? .016 : 0;
    play(it.sounds[0]);
    if (it.sounds[1]) later(() => { if (b.parent && (state === 'pick' || state === 'ready')) play(it.sounds[1]); }, 240);
    animate(.6, u => {
      const k = 1 - u, rock = Math.sin(u * Math.PI * 6);
      w.rotation.z = .28 * rock * k;
      w.position.x = .005 * Math.sin(u * Math.PI * 6 + .6) * k;
      w.position.y = lifted ? y0 + (top - y0) * smooth(Math.min(1, u * 3)) + .004 * Math.abs(rock) * k : .006 * Math.abs(rock) * k;
    }, () => { w.rotation.z = 0; w.position.x = 0; });
  }
  const settle = b => { const w = b.userData.wob, y0 = w.position.y; animate(.2, u => { w.position.y = y0 * (1 - u); }); };
  function tapBox(b) {
    if (state !== 'pick' || !b) return;
    if (chosen === b) { choose(b); return; }
    const prev = chosen; chosen = b;
    if (prev) settle(prev);
    shake(b, true);
    setState('pick', boxThing(b.userData.thing).hint);
  }
  const anyBox = () => { const l = slots.filter(Boolean); return l[Math.floor(Math.random() * l.length)]; };
  // The chosen box hops, goes back into the machine, and comes out of the door.
  function choose(b = chosen || anyBox()) {
    if (state !== 'pick' || !b) return false;
    if (!onChoose(b.userData.thing)) { chosen = null; settle(b); return false; }
    chosen = null; setState('busy'); camTarget = 0;
    const i = b.userData.slot, w = b.userData.wob, p0 = b.position.clone(), y0 = w.position.y;
    slots[i] = null;
    play('tap');
    animate(.2, u => { w.position.y = y0 + .03 * Math.sin(u * Math.PI / 2); }, () => {
      animate(.3, u => { const e = smooth(u); b.position.set(p0.x, p0.y + .03, p0.z - .14 * e); b.scale.setScalar(Math.max(.001, 1 - e)); }, () => {
        b.visible = false; w.position.set(0, 0, 0); w.rotation.set(0, 0, 0);
        swing(true, () => comeOut(b));
      });
    });
    return true;
  }
  function swing(open, then) {
    const from = door.rotation.y, to = open ? -1.75 : 0;
    if (open) play('lid');
    animate(open ? .32 : .28, u => { door.rotation.y = from + (to - from) * ease(u); }, then);
  }
  function comeOut(b) {
    b.visible = true; b.rotation.set(0, 0, 0);
    const a = new THREE.Vector3(0, STEP_Y, .262), z = new THREE.Vector3(0, STEP_Y, .3);
    b.position.copy(a); b.scale.setScalar(.35);
    animate(.32, u => { const e = ease(u); b.position.lerpVectors(a, z, e); b.position.y = STEP_Y + .018 * Math.sin(u * Math.PI); b.scale.setScalar(.35 + .65 * e); }, () => {
      play('wood');
      later(() => { if (state !== 'busy') return; swing(false); fly(b); }, 180);
    });
  }
  // Up to your face, turned a little so you can see the bow.
  function fly(b) {
    if (!camera) return;
    held = b; root.attach(b);
    const from = b.position.clone(), q0 = b.quaternion.clone(), s0 = b.scale.x;
    const dir = new THREE.Vector3(0, .62, 0).sub(camera.position).normalize(), tan = Math.tan(camera.fov * Math.PI / 360);
    // On a narrow phone it keeps to about 60% of the width.
    const near = Math.max(1.02, .17 / (.6 * 2 * tan * camera.aspect));
    const to = camera.position.clone().addScaledVector(dir, near).add(new THREE.Vector3(0, -.075, 0));
    const look = new THREE.Object3D(); look.position.copy(to); look.lookAt(camera.position); look.rotateX(.3); look.rotateY(-.4);
    play('turn');
    animate(.55, u => {
      const e = ease(u);
      b.position.lerpVectors(from, to, e); b.position.y += Math.sin(u * Math.PI) * .16;
      b.scale.setScalar(s0 + (1.3 - s0) * e);
      b.quaternion.copy(q0).slerp(look.quaternion, e);
    }, () => { if (held !== b) return; b.quaternion.copy(look.quaternion); b.userData.rest = to.clone(); setState('ready', '点盒子摇一摇，听听里面是什么'); });
  }
  function shakeHeld() {
    if (state !== 'ready' || !held) return;
    shake(held, false); onState('ready', boxThing(held.userData.thing).hint);
  }
  // Untie the ribbon, lift the lid, and what is inside comes up.
  function open() {
    if (state !== 'ready' || !held) return false;
    const b = held, U = b.userData, bow = U.bow, b0 = bow.position.clone();
    setState('busy');
    play('boxRibbon');
    animate(.5, u => {
      const e = ease(u);
      bow.position.set(b0.x + .028 * e, b0.y + .05 * e, b0.z + .012 * e); bow.rotation.z = 1.3 * e; bow.scale.setScalar(1 - .5 * e);
      U.ribMat.opacity = 1 - smooth(Math.min(1, u * 1.3));
      U.bands.position.y = -.012 * e;
    }, () => {
      bow.visible = false; U.bands.visible = false;
      play('boxLid');
      const lid = U.lid, l0 = lid.position.clone();
      animate(.42, u => { const e = ease(u); lid.position.y = l0.y + .008 * Math.sin(u * Math.PI); lid.rotation.x = -1.9 * e; }, () => reveal(b));
    });
    return true;
  }
  function reveal(b) {
    const U = b.userData, it = boxThing(U.thing);
    play('boxOpen'); if (U.thing === SEASON.hidden.id) later(() => play('found'), 420);
    U.wob.add(prize); prize.visible = true; prize.position.set(0, .01, 0); prize.rotation.set(0, 0, 0); prize.scale.setScalar(.8);
    animate(.75, u => { const e = ease(u); prize.position.y = .01 + (BOX.h + PRIZE_SIZE * .3 - .01) * e; prize.scale.setScalar(.8 + .4 * e); });
    sparkle(b, U.thing === SEASON.hidden.id);
    later(() => { if (held === b) setState('open', (U.thing === SEASON.hidden.id ? '隐藏款！' : '') + '拆到了：' + it.name); }, 500);
  }
  function sparkle(b, gold) {
    const sparks = [], n = gold ? 18 : 10, at = b.position.clone().add(new THREE.Vector3(0, .1, 0));
    for (let i = 0; i < n; i++) {
      const s = glow(gold ? (i % 3 ? 0xffd978 : 0xfff1c9) : GLOWC[i % GLOWC.length], gold ? .055 : .045); s.material.opacity = 1;
      s.position.copy(at); s.userData.v = new THREE.Vector3((Math.random() - .5) * .35, .1 + Math.random() * .35, (Math.random() - .5) * .2);
      root.add(s); sparks.push(s);
    }
    animate(gold ? 1.3 : 1, u => sparks.forEach(s => { s.position.addScaledVector(s.userData.v, .012); s.userData.v.y -= .006; s.material.opacity = 1 - u; }), () => sparks.forEach(s => { root.remove(s); s.material.dispose(); }));
  }
  // Taken home: the window gets a new box and the lamp goes off.
  function collect() {
    if (state !== 'open' || !held) return false;
    const b = held, from = b.position.clone(), s0 = b.scale.x, slot = b.userData.slot;
    setState('busy');
    animate(.45, u => { const e = ease(u); b.position.set(from.x, from.y - .35 * e, from.z - .2 * e); b.scale.setScalar(Math.max(.001, s0 * (1 - e))); }, () => {
      b.userData.wob.remove(prize); prize.visible = false;
      root.remove(b); if (held === b) held = null;
      fillSlot(slot, true);
      pull(false, () => setState('idle', '再投一张'));
    });
    return true;
  }

  // ---- pointer: drag to turn it round; tap the slot, a box, the box in front of you ----
  let canvas = null, drag = null, idleSince = 0, onTap = () => {};
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const boxOf = o => { while (o && !o.userData.isBox) o = o.parent; return o; };
  const down = e => { drag = {x: e.clientX, y: e.clientY, t: performance.now(), moved: 0}; canvas.setPointerCapture?.(e.pointerId); };
  const moved = e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    if (state === 'idle') {
      rig.rotation.y += dx * .01;
      rig.rotation.x = Math.max(-.25, Math.min(.35, rig.rotation.x + dy * .004));
    }
    idleSince = performance.now();
  };
  const up = e => {
    if (!drag) return;
    const tap = drag.moved < 8 && performance.now() - drag.t < 450;
    drag = null; idleSince = performance.now();
    if (!tap || !camera) return;
    const box = canvas.getBoundingClientRect();
    ndc.set((e.clientX - box.left) / box.width * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (state === 'open') return onTap('collect');
    if (state === 'ready') { if (held && ray.intersectObject(held, true).length) shakeHeld(); return; }
    if (state === 'pick') { const hit = ray.intersectObjects(slots.filter(Boolean), true)[0]; if (hit) tapBox(boxOf(hit.object)); return; }
    if (state === 'idle' && ray.intersectObject(ticketTile, true).length) onTap('ticket');
  };
  const cancel = () => { drag = null; };
  function unlisten() {
    if (!canvas) return;
    canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', moved);
    canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel);
    canvas = null;
  }
  // Into a scene, with its camera and canvas; `tap(part)` hears taps on the slot ('ticket') or on what's to be taken ('collect').
  function mount(s, cam, el, tap) {
    scene = s; camera = cam; onTap = tap || onTap;
    scene.add(root); setNight(isNight); placeCamera();
    if (el && el !== canvas) {
      unlisten(); canvas = el;
      canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', moved);
      canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel);
    }
    return () => { scene?.remove(root); unlisten(); };
  }

  // ---- each frame ----
  function update(dt, t) {
    if (!alive) return;
    clock = t;
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i], u = Math.min(1, (t - a.t0) / a.dur);
      a.fn(u); if (u >= 1) { anims.splice(i, 1); a.done && a.done(); }
    }
    if (!reduced && !drag && state === 'idle' && performance.now() - idleSince > 3500) rig.rotation.y += .0025;
    if (Math.abs(camTarget - camLift) > .0005) camLift += (camTarget - camLift) * Math.min(1, Math.min(.05, dt) * 5);
    placeCamera();
    if (held && held.userData.rest && (state === 'ready' || state === 'open')) {
      held.position.y = held.userData.rest.y + Math.sin(t * 2.4) * .006;
      if (state === 'open' && !reduced) prize.rotation.y += .015;
    }
    const lit = isNight || lampOn;
    lampGlow.material.opacity = lit ? (isNight ? .65 : .38) * (reduced ? 1 : .93 + .07 * Math.sin(t * 3.1)) : 0;
  }

  SLOTS.forEach((p, i) => fillSlot(i, false, [3, 0, 4, 1, 5, 2][i]));
  setNight(night);
  return {
    get state() { return state; },
    get chosen() { return chosen ? boxThing(chosen.userData.thing) : null; },
    prize, mount, update, setNight, insert, choose: () => choose(), shake: shakeHeld, open, collect,
    dispose() {
      alive = false; unlisten(); scene?.remove(root);
      // What's drawn into `prize` belongs to the overlay's drawing, which lets go of its own.
      const free = x => {
        if (x === prize) return;
        x.geometry?.dispose();
        for (const m of [].concat(x.material || [])) { m.map?.dispose(); m.dispose(); }
        x.children.forEach(free);
      };
      free(root);
    }
  };
}
