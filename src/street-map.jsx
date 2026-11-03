import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {QuietCanvas} from './quiet-canvas.jsx';
import {BLOCK_D, BLOCK_W, CROSS, HOUSE, PARK, PLAZA, ROWS, laneZ, lotPlace, plazaLook, porchLook, streetLook, streetOrigin, streetsAround} from './street-layout.js';
import './street-map.css';
import {shownShell} from './house-shells.js';

// The community map: the street this home stands on and the streets around
// it, each home drawn small (its walls, roof, door and the light at its door),
// gardens on the empty lots, lamps along the lanes, trees between the blocks.
// Drag to walk along, pinch or scroll to come closer. Tap a home for its door
// plate; tap again to walk up to its door, if its light lets you. Tap the
// little plaza in the trees for the machines standing there.
// What a street holds comes from the server (server/streets.mjs): only what
// hangs outside.

// The house's colours (the creamRose theme); every home wears them for now,
// cottage or castle, so its little copy here looks like its door up close.
const C = {
  plaster: '#f1e6da', plinth: '#d9cbbf', roof: '#3f3946', chimney: '#d6c4b8', cap: '#3a3540', door: '#b8708c', step: '#e3d6c9',
  lawn: '#cbd8bd', meadow: '#c2d2b3', lane: '#ece2d5', cross: '#e4d8ca', park: '#b8c8a9', shade: '#55604a',
  trunk: '#8a7166', leaf: '#93ad8d', leafDeep: '#7f9a7b', blossom: '#efc4d2', hedge: '#86a082', bench: '#b39785', post: '#2f2b33', soil: '#a99282', pond: '#a9c6cf',
  windowDay: '#e8dade', windowDark: '#4e4b5c', windowLit: '#ffd08e', lamp: '#ffc477', lampOff: '#7a7078', sign: '#c98aa5', mine: '#ffcf8a',
  wisteria: '#b896d0', wisteriaPale: '#dccdea', rose: '#d9708f', rosePale: '#f2c1cf', spire: '#e3a3b6', mailbox: '#c98aa5',
  paving: '#e6dbd0', awning: '#f6eee4', awningStripe: '#d79ab1', bulb: '#ffe2a8', bulbOff: '#efe6d8', glass: '#eef3f6',
  dusk: '#6f6382', duskDeep: '#574c69', slate: '#2f2a36', band: '#76558f', pumpkin: '#e8893b', bare: '#5f4f4a'
};
// The machines open on the plaza so far, in their order under the awning.
const MACHINES = ['capsule', 'blindbox', 'claw'];
// What each is called on the plaza's plate, and what its button says.
const MACHINE_WORDS = {capsule: ['一台小熊罐扭蛋机', '去拧扭蛋'], blindbox: ['一台小门廊盲盒机', '去拆盲盒'], claw: ['一台抓娃娃机', '去抓娃娃']};
const FLOWERS = ['#e9b3c6', '#c7a5df', '#f3e1a4', '#f8f2ea'];
// Looking down at a corner, the way the house itself is seen: the front of
// every home and its east side, doors and lights towards you.
const OFFSET = new THREE.Vector3(8.5, 10.5, 10.5);

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitBall = new THREE.SphereGeometry(.5, 12, 9);
const unitCylinder = new THREE.CylinderGeometry(.5, .5, 1, 10);
const unitPlane = new THREE.PlaneGeometry(1, 1);
const unitDisc = new THREE.CircleGeometry(.5, 24);
const unitCone = new THREE.ConeGeometry(.5, 1, 12);
// A gable: the triangle faces the front, the ridge runs back.
const gable = (() => {
  const s = new THREE.Shape();
  s.moveTo(-.5, 0); s.lineTo(.5, 0); s.lineTo(0, 1); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth: 1, bevelEnabled: false});
  g.translate(0, 0, -.5);
  return g;
})();
// A soft round glow for lamps and lit doors.
const glowTexture = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,214,150,1)'); r.addColorStop(.35, 'rgba(255,196,120,.45)'); r.addColorStop(1, 'rgba(255,190,110,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
// A soft shadow under things, in place of real shadows (cheap on phones).
const shadeTexture = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

// The meadow's edge: soft, so the streets float in the sky the way the house does.
const edgeTexture = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 256, 256);
  // Rounded squares from the edge inwards, each a little brighter: a soft rim
  // without canvas filters (which some phones lack).
  const rounded = (inset, r) => {
    const a = inset, b = 256 - inset;
    g.beginPath();
    g.moveTo(a + r, a);
    g.arcTo(b, a, b, b, r); g.arcTo(b, b, a, b, r); g.arcTo(a, b, a, a, r); g.arcTo(a, a, b, a, r);
    g.closePath();
  };
  for (let k = 0; k <= 20; k++) {
    g.fillStyle = `rgba(255,255,255,${(k / 20) ** 1.6})`;
    rounded(10 + k * 2, 58 - k * 1.2);
    g.fill();
  }
  return new THREE.CanvasTexture(c);
})();

const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, k)));

// Many copies of one shape in one draw: items are {p, s, r?, q?, c?}.
function Instances({geometry, items, color = '#ffffff', basic = false, glow = false, shade = false, opacity = 1, onPick, renderOrder}) {
  const ref = useRef();
  const material = useMemo(() => glow
    ? new THREE.MeshBasicMaterial({map: glowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity})
    : shade ? new THREE.MeshBasicMaterial({map: shadeTexture, transparent: true, depthWrite: false, color: '#000000', opacity})
    : basic ? new THREE.MeshBasicMaterial({color: '#ffffff'}) : new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .84}), [glow, shade, basic]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {if (glow || shade) material.opacity = opacity;}, [glow, shade, opacity, material]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    items.forEach((it, i) => {
      if (it.q) q.copy(it.q); else q.setFromEuler(e.set(...(it.r || [0, 0, 0])));
      m.compose(v.set(...it.p), q, sc.set(...it.s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.set(it.c || color));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, color]);
  if (!items.length) return null;
  return <instancedMesh key={items.length} ref={ref} args={[geometry, material, items.length]} renderOrder={renderOrder}
    onClick={onPick ? e => {if (e.delta > 6) return; e.stopPropagation(); onPick(items[e.instanceId], e);} : undefined}
    onPointerOver={onPick ? () => {document.body.style.cursor = 'pointer';} : undefined}
    onPointerOut={onPick ? () => {document.body.style.cursor = 'default';} : undefined}/>;
}

const FLAT = [-Math.PI / 2, 0, 0];

// Everything on the loaded streets, as lists of copies.
// A home wearing the castle (src/house-shells.js): a keep under a roof, a
// gatehouse with the door, two round towers with pointed roofs and flags in
// front, a taller one behind with battlements, and wisteria on the walls. The
// rose castle (`rose`): taller towers under pink spires, and roses for wisteria.
function miniCastle(P, {x, z, front, lane, home, L, dark, pick, glow}, rose = false) {
  const {w, d, h} = HOUSE, keepH = h * .92, towerH = h * (rose ? 1.2 : 1.12), backH = h * (rose ? 1.5 : 1.42);
  const flower = k => (rose ? (k % 2 ? C.rosePale : C.rose) : (k % 2 ? C.wisteriaPale : C.wisteria)), spire = rose ? {c: C.spire} : {};
  const lit = L.windows * dark;
  const win = (on => (on > .05 ? mix(C.windowDark, C.windowLit, .3 + .7 * on) : mix(C.windowDay, C.windowDark, dark)).getStyle())(lit);
  P.shades.push({p: [x + .14, .007, z + .1], s: [w * 1.8, d * 1.9, 1], r: FLAT});
  P.plinths.push({p: [x, .04, z], s: [w + .06, .08, d + .06]});
  P.bodies.push({p: [x, keepH / 2, z - .03], s: [w * .72, keepH, d * .78], pick});
  P.roofs.push({p: [x, keepH - .01, z - .03], s: [d * .8, .3, w * .74], r: [0, Math.PI / 2, 0], pick});
  // The gatehouse, its battlements, and the door in it.
  const gw = w * .32, gh = h * .86, gz = front - .03;
  P.bodies.push({p: [x, gh / 2, gz], s: [gw, gh, .14], pick});
  for (const k of [-1, 0, 1]) P.merlons.push({p: [x + k * gw * .36, gh + .03, gz + .045], s: [.05, .06, .05]});
  P.doors.push({p: [x, .18, gz + .075], s: [.15, .28, .02]});
  P.windows.push({p: [x, gh * .7, gz + .075], s: [.08, .1, .01], c: win});
  P.steps.push({p: [x, .02, gz + .17], s: [.26, .04, .16]});
  for (let k = 0; k < 3; k++) P.steps.push({p: [x + (k % 2 ? .04 : -.04), .008, front + .38 + k * .26], s: [.17, .016, .13], c: C.step});
  // Two towers in front, one taller behind.
  for (const side of [-1, 1]) {
    const tx = x + side * w * .4, tz = front - .1;
    P.towers.push({p: [tx, towerH / 2, tz], s: [.22, towerH, .22], pick});
    P.cones.push({p: [tx, towerH + .14, tz], s: [.29, rose ? .36 : .28, .29], ...spire, pick});
    P.flags.push({p: [tx, towerH + .33, tz], s: [.012, .1, .012]});
    P.flags.push({p: [tx + .035, towerH + .36, tz], s: [.06, .035, .01]});
    P.windows.push({p: [tx, towerH * .68, tz + .112], s: [.06, .09, .01], c: win});
    for (let k = 0; k < 4; k++) P.wisteria.push({p: [tx + side * (.06 - k * .035), towerH * (.86 - (k % 2) * .1), tz + .1], s: [.06, .09 + (k % 2) * .04, .06], c: flower(k)});
  }
  const bx = x - w * .2, bz = z - d * .32;
  P.towers.push({p: [bx, backH / 2, bz], s: [.18, backH, .18], pick});
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3;
    P.merlons.push({p: [bx + Math.sin(a) * .085, backH + .02, bz + Math.cos(a) * .085], s: [.035, .045, .035]});
  }
  P.cones.push({p: [bx, backH + .12, bz], s: [.15, rose ? .28 : .22, .15], ...spire, pick});
  // Windows along the east side, as on the cottage.
  for (const sz of [-.16, .14]) P.windows.push({p: [x + w * .36 + .006, keepH * .56, z - .03 + sz], s: [.02, .17, .13], c: win});
  // The lamp by the door: warm when lit, glowing after dark.
  P.lamps.push({p: [x + .11, .32, gz + .09], s: [.05, .07, .05], c: mix(C.lampOff, C.lamp, L.lamp * (.5 + .5 * dark)).getStyle()});
  glow([x + .11, .33, gz + .2], L.glow * dark * 1.05);
  for (let k = 0; k < 5; k++) P.wisteria.push({p: [x - gw * .4 + k * gw * .2, gh - .03 - (k % 3) * .05, gz + .09], s: [.06, .09 + (k % 2) * .04, .06], c: flower(k)});
  for (const hx of [-.44, .26]) P.bushes.push({p: [x + hx, .09, front + .5], s: [.3, .18, .2], c: rose ? (hx < 0 ? C.rose : C.rosePale) : hx < 0 ? C.hedge : C.leaf});
  P.posts.push({p: [x + w * .42, .14, lane - .44], s: [.03, .28, .03]});
  P.mailboxes.push({p: [x + w * .42, .3, lane - .44], s: [.12, .09, .16]});
  if (home.porch === 'dnd') P.signs.push({p: [x, .27, gz + .09], s: [.12, .07, .01], r: [0, 0, .08]});
  pick.door = [x, front + .62];
  if (home.mine) P.mine = {x, z: front + .62};
}

// A home wearing the Halloween house: dusky walls under a dark mansard with a
// purple band, a porch with its pumpkin lamp, a leaning turret in a drooping
// witch's hat at the front left, pumpkins by the path and a bare tree behind.
function miniHaunted(P, {x, z, front, lane, home, L, dark, pick, glow}) {
  const {w, d, h} = HOUSE, bodyH = h * .96, bx = x + w * .06;
  const lit = L.windows * dark;
  const win = (on => (on > .05 ? mix(C.windowDark, C.windowLit, .3 + .7 * on) : mix(C.windowDay, C.windowDark, dark)).getStyle())(lit);
  P.shades.push({p: [x + .14, .007, z + .1], s: [w * 1.7, d * 1.8, 1], r: FLAT});
  P.plinths.push({p: [x, .04, z], s: [w + .06, .08, d + .06]});
  P.bodies.push({p: [bx, bodyH / 2, z - .02], s: [w * .8, bodyH, d * .8], c: C.dusk, pick});
  // The mansard: a band of purple, then the dark roof stepping in, and a flat top.
  P.bodies.push({p: [bx, bodyH + .03, z - .02], s: [w * .86, .05, d * .86], c: C.band, pick});
  P.bodies.push({p: [bx, bodyH + .14, z - .02], s: [w * .78, .18, d * .78], c: C.slate, pick});
  P.bodies.push({p: [bx, bodyH + .26, z - .02], s: [w * .6, .06, d * .6], c: C.slate, pick});
  // The porch: a little roof on two posts, the door under it.
  P.bodies.push({p: [bx, h * .48, front + .07], s: [w * .42, .04, .2], c: C.slate});
  for (const side of [-1, 1]) P.posts.push({p: [bx + side * w * .19, h * .24, front + .15], s: [.025, h * .48, .025], c: '#f6eee4'});
  P.doors.push({p: [bx, .17, front - .02], s: [.13, .26, .02], c: C.band});
  P.steps.push({p: [bx, .02, front + .17], s: [.26, .04, .16]});
  for (let k = 0; k < 3; k++) P.steps.push({p: [bx + (k % 2 ? .04 : -.04), .008, front + .38 + k * .26], s: [.17, .016, .13], c: C.step});
  // Windows: two upstairs at the front, two along the east side.
  for (const wx of [-.12, .22]) P.windows.push({p: [bx + wx, bodyH * .72, front - .02], s: [.1, .14, .02], c: win});
  for (const sz of [-.16, .14]) P.windows.push({p: [bx + w * .4 + .006, bodyH * .5, z - .02 + sz], s: [.02, .16, .12], c: win});
  // The turret, leaning out, under a hat whose tip flops over.
  const tx = x - w * .36, tz = front - .12, th = h * 1.12;
  P.towers.push({p: [tx - .02, th / 2, tz], s: [.24, th, .24], r: [0, 0, .07], c: C.duskDeep, pick});
  P.cones.push({p: [tx - .06, th + .16, tz], s: [.36, .34, .36], r: [0, 0, .1], c: C.slate, pick});
  P.cones.push({p: [tx - .13, th + .38, tz + .02], s: [.12, .16, .12], r: [.25, 0, .55], c: C.slate, pick});
  P.windows.push({p: [tx + .02, th * .66, tz + .118], s: [.06, .09, .01], c: win});
  // The pumpkin lamp at the door: warm when lit, glowing after dark.
  P.flowers.push({p: [bx + .12, .3, front + .12], s: [.07, .06, .07], c: mix('#b8aa9b', C.pumpkin, L.lamp * (.5 + .5 * dark)).getStyle()});
  glow([bx + .12, .31, front + .22], L.glow * dark * 1.05);
  // Pumpkins either side of the path.
  for (const [px, pz] of [[-.2, .42], [.2, .58], [-.2, .76], [.22, .95]]) P.flowers.push({p: [x + px, .035, front + pz], s: [.08, .065, .08], c: C.pumpkin});
  // A bare tree behind.
  P.trunks.push({p: [x + w * .5, .26, z - d * .45], s: [.05, .52, .05], c: C.bare});
  for (const [bxo, ry] of [[-.07, .6], [.07, -.7]]) P.trunks.push({p: [x + w * .5 + bxo, .55, z - d * .45], s: [.025, .22, .025], r: [0, 0, ry], c: C.bare});
  for (const hx of [-.44, .26]) P.bushes.push({p: [x + hx, .09, front + .5], s: [.3, .18, .2], c: hx < 0 ? C.hedge : C.leaf});
  P.posts.push({p: [x + w * .42, .14, lane - .44], s: [.03, .28, .03]});
  P.mailboxes.push({p: [x + w * .42, .3, lane - .44], s: [.12, .09, .16]});
  if (home.porch === 'dnd') P.signs.push({p: [bx, .27, front + .01], s: [.12, .07, .01], r: [0, 0, .08]});
  pick.door = [bx, front + .62];
  if (home.mine) P.mine = {x: bx, z: front + .62};
}

function useStreetParts(streets, daylight, shell, day) {
  return useMemo(() => {
    const night = 1 - daylight, dark = Math.max(0, (night - .15) / .85);
    const facing = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(OFFSET, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)));
    const P = {towers: [], cones: [], merlons: [], flags: [], bushes: [], shades: [], plinths: [], bodies: [], roofs: [], doors: [], windows: [], lamps: [], glows: [], chimneys: [], caps: [], steps: [], signs: [], wisteria: [], mailboxes: [], posts: [], flowers: [], soil: [], ponds: [], trunks: [], crowns: [], benches: [], heads: [], blocks: [], lanes: [], parks: [], paving: [], awning: [], bulbs: [], machines: [], domes: [], cases: [], mine: null};
    const glow = (p, size) => {if (size > .02) P.glows.push({p, s: [size, size, 1], q: facing});};
    const tree = (x, z, size, crown) => {
      P.shades.push({p: [x + .08, .008, z + .06], s: [.7 * size, .7 * size, 1], r: FLAT});
      P.trunks.push({p: [x, .22 * size, z], s: [.08 * size, .44 * size, .08 * size]});
      P.crowns.push({p: [x, .62 * size, z], s: [.62 * size, .55 * size, .62 * size], c: crown});
      P.crowns.push({p: [x + .1 * size, .82 * size, z - .05 * size], s: [.42 * size, .38 * size, .42 * size], c: crown});
    };
    for (const [n, street] of Object.entries(streets)) {
      const [ox, oz] = streetOrigin(Number(n));
      const look = streetLook(street.seed);
      const homes = new Map(street.homes.map(h => [h.lot, h]));
      P.blocks.push({p: [ox, .001, oz], s: [BLOCK_W, BLOCK_D, 1], r: FLAT});
      P.parks.push({p: [ox, .003, oz + BLOCK_D / 2 - PARK / 2], s: [BLOCK_W, PARK, 1], r: FLAT});
      for (let row = 0; row < ROWS; row++) P.lanes.push({p: [ox, .004, oz + laneZ(row)], s: [BLOCK_W, .66, 1], r: FLAT, c: C.lane});
      for (const side of [-1, 1]) P.lanes.push({p: [ox + side * (BLOCK_W / 2 - CROSS / 2), .005, oz], s: [CROSS * .74, BLOCK_D, 1], r: FLAT, c: C.cross});
      for (let lot = 0; lot < 64; lot++) {
        const place = lotPlace(lot), feel = look.lots[lot], x = ox + place.x + feel.nudge, z = oz + place.z, home = homes.get(lot);
        const front = z + HOUSE.d / 2, lane = oz + laneZ(place.row);
        if (home) {
          const L = porchLook(home.porch), {w, d, h} = HOUSE, roofH = .4;
          const pick = {home, street: n, lot, at: [x, h + roofH + .3, z]};
          // This home's own outside comes from its save; a neighbour's from the street (the seasonal one in its season).
          const wears = home.mine ? shell : shownShell(home, day);
          if (wears === 'castle' || wears === 'roseCastle') {miniCastle(P, {x, z, front, lane, home, L, dark, pick, glow}, wears === 'roseCastle'); continue;}
          if (wears === 'haunted') {miniHaunted(P, {x, z, front, lane, home, L, dark, pick, glow}); continue;}
          P.shades.push({p: [x + .14, .007, z + .1], s: [w * 1.7, d * 1.8, 1], r: FLAT});
          P.plinths.push({p: [x, .04, z], s: [w + .06, .08, d + .06]});
          P.bodies.push({p: [x, h / 2, z], s: [w, h, d], pick});
          P.roofs.push({p: [x, h - .01, z], s: [w * 1.14, roofH, d * 1.12], pick});
          P.chimneys.push({p: [x + w * .24, h + roofH * .6, z - d * .16], s: [.11, .27, .11]});
          P.caps.push({p: [x + w * .24, h + roofH * .6 + .145, z - d * .16], s: [.14, .03, .14]});
          P.doors.push({p: [x - w * .12, .21, front + .006], s: [.2, .38, .03]});
          P.steps.push({p: [x - w * .12, .02, front + .12], s: [.3, .04, .18]});
          for (let k = 0; k < 3; k++) P.steps.push({p: [x - w * .12 + (k % 2 ? .04 : -.04), .008, front + .38 + k * .26], s: [.17, .016, .13], c: C.step});
          // Windows: two at the front, one under the gable, two along the east side.
          const lit = L.windows * dark;
          const win = (on => (on > .05 ? mix(C.windowDark, C.windowLit, .3 + .7 * on) : mix(C.windowDay, C.windowDark, dark)).getStyle())(lit);
          P.windows.push({p: [x + w * .22, h * .56, front + .006], s: [.2, .2, .02], c: win});
          P.windows.push({p: [x - w * .12, h * .82, front + .006], s: [.14, .1, .02], c: win});
          P.windows.push({p: [x, h + roofH * .36, z + d * .56 + .004], s: [.13, .13, .02], c: win});
          for (const sz of [-.18, .18]) P.windows.push({p: [x + w / 2 + .006, h * .56, z + sz], s: [.02, .2, .17], c: win});
          // The lamp by the door: warm when lit, glowing after dark.
          P.lamps.push({p: [x + w * .05, .36, front + .035], s: [.06, .08, .06], c: mix(C.lampOff, C.lamp, L.lamp * (.5 + .5 * dark)).getStyle()});
          glow([x + w * .05, .37, front + .14], L.glow * dark * 1.05);
          // Wisteria hanging off the front eave, as on the house itself.
          for (let k = 0; k < 5; k++) P.wisteria.push({p: [x + w * .58 - k * .035, h - .02 - (k % 3) * .06, front + .05], s: [.07, .1 + (k % 2) * .05, .07], c: k % 2 ? C.wisteriaPale : C.wisteria});
          // Low hedges either side of the path, and a mailbox by the lane.
          for (const hx of [-.44, .26]) P.bushes.push({p: [x + hx, .09, front + .5], s: [.3, .18, .2], c: hx < 0 ? C.hedge : C.leaf});
          P.posts.push({p: [x + w * .42, .14, lane - .44], s: [.03, .28, .03]});
          P.mailboxes.push({p: [x + w * .42, .3, lane - .44], s: [.12, .09, .16]});
          if (home.porch === 'dnd') P.signs.push({p: [x - w * .12, .27, front + .026], s: [.14, .08, .01], r: [0, 0, .08]});
          if (home.mine) P.mine = {x: x - w * .12, z: front + .62};
        } else {
          // An empty lot: something growing on it.
          const g = feel.garden;
          if (g === 'tree' || g === 'blossom') tree(x, z + .2, 1.05, g === 'blossom' ? C.blossom : lot % 2 ? C.leaf : C.leafDeep);
          else if (g === 'hedge') {
            // A curve of round bushes, two greens.
            for (let k = 0; k < 5; k++) P.bushes.push({p: [x - .48 + k * .24, .13, z - .05 + (k === 0 ? .35 : 0) + (k === 1 ? .12 : 0)], s: [.3, .26, .28], c: k % 2 ? C.leaf : C.hedge});
          } else if (g === 'bench') {
            P.benches.push({p: [x, .1, z + .25], s: [.5, .06, .18]});
            P.benches.push({p: [x, .18, z + .17], s: [.5, .13, .03]});
            tree(x + .45, z - .25, .75, C.leaf);
          } else if (g === 'pond') {
            P.ponds.push({p: [x, .008, z + .15], s: [.95, .7, 1], r: FLAT});
            for (const [fx, fz, k] of feel.flowers.slice(0, 3)) P.flowers.push({p: [x + fx * 1.1, .05, z + .55 + fz * .2], s: [.1, .1, .1], c: FLOWERS[k]});
          } else {
            P.soil.push({p: [x, .006, z + .1], s: [1, .8, 1], r: FLAT, c: g === 'patch' ? C.park : C.soil});
            for (const [fx, fz, k] of feel.flowers) for (const dz of [0, .22]) P.flowers.push({p: [x + fx * .75, .06, z + .05 + fz * .55 + dz], s: [.12, .12, .12], c: FLOWERS[(k + (dz ? 1 : 0)) % 4]});
          }
        }
      }
      for (const [lx, lz] of look.lamps) {
        P.posts.push({p: [ox + lx, .34, oz + lz], s: [.045, .68, .045]});
        P.heads.push({p: [ox + lx, .72, oz + lz], s: [.1, .12, .1], c: mix(C.lampOff, C.lamp, .3 + .7 * dark).getStyle()});
        glow([ox + lx, .72, oz + lz + .1], 1.15 * dark);
      }
      for (const [tx, tz, ts, flowering] of look.trees) tree(ox + tx, oz + tz, ts * 1.1, flowering ? C.blossom : tz > .1 ? C.leaf : C.leafDeep);
      // The little plaza: paving, a striped awning with a string of bulbs along
      // its front, a bench either side, and the machines open so far.
      const pz = oz + PLAZA.z, plaza = {plaza: {street: n, seed: street.seed}, at: [ox, 1.05, pz]}, paint = plazaLook(street.seed).color;
      P.paving.push({p: [ox, .006, pz], s: [PLAZA.w, PLAZA.d, 1], r: FLAT, plaza});
      for (let k = 0; k < 10; k++) P.awning.push({p: [ox - 1.575 + k * .35, .66, pz - .3], s: [.35, .035, .72], r: [.16, 0, 0], c: k % 2 ? C.awningStripe : C.awning, plaza});
      for (const [px, dz] of [[-1.7, -.6], [1.7, -.6], [-1.7, .04], [1.7, .04]]) P.posts.push({p: [ox + px, .32, pz + dz], s: [.035, .64, .035]});
      for (let k = 0; k <= 12; k++) {
        const bx = ox - 1.7 + k * 3.4 / 12, by = .6 - .07 * Math.sin(Math.PI * k / 12), bz = pz + .07;
        P.bulbs.push({p: [bx, by, bz], s: [.045, .055, .045], c: mix(C.bulbOff, C.bulb, .25 + .75 * dark).getStyle()});
        glow([bx, by, bz + .04], .32 * dark);
      }
      for (const side of [-1, 1]) {
        P.benches.push({p: [ox + side * 2.45, .1, pz + .12], s: [.5, .06, .18]});
        P.benches.push({p: [ox + side * 2.45, .18, pz + .04], s: [.5, .13, .03]});
      }
      MACHINES.forEach((kind, i) => {
        const mx = ox + (i - (MACHINES.length - 1) / 2) * .62, mz = pz + .3;
        P.shades.push({p: [mx + .04, .008, mz + .05], s: [.5, .4, 1], r: FLAT});
        P.machines.push({p: [mx, .13, mz], s: [.34, .26, .28], c: paint, plaza});
        if (kind === 'blindbox') {
          // A glass window on the base, and a little pitched roof over it.
          P.cases.push({p: [mx, .4, mz], s: [.3, .26, .24], plaza});
          P.roofs.push({p: [mx, .53, mz], s: [.36, .14, .3], c: paint, pick: plaza});
        } else if (kind === 'claw') {
          // A glass cabinet with a header on top, and the header's two ears.
          P.cases.push({p: [mx, .43, mz], s: [.3, .34, .24], plaza});
          P.machines.push({p: [mx, .64, mz], s: [.34, .08, .28], c: paint, plaza});
          for (const ex of [-.11, .11]) P.domes.push({p: [mx + ex, .71, mz], s: [.08, .08, .05], c: paint, plaza});
        } else {
          P.domes.push({p: [mx, .4, mz], s: [.32, .3, .3], plaza});
          for (const ex of [-.1, .1]) P.domes.push({p: [mx + ex, .56, mz], s: [.1, .1, .08], plaza});
        }
        P.signs.push({p: [mx, .26, mz + .145], s: [.2, .02, .01], c: C.awningStripe});
        glow([mx, .42, mz + .1], .55 * dark);
      });
    }
    return P;
  }, [streets, daylight, shell, day]);
}

// Walking: drag moves along the ground, pinch or scroll comes closer. The
// camera never turns, so the doors always face you.
function Walk({start, bounds, onSettle, onReady}) {
  const {camera, gl, invalidate, size} = useThree();
  const live = useRef({bounds, onSettle});
  live.current = {bounds, onSettle};
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableRotate = false;
    controls.enableDamping = false;
    controls.screenSpacePanning = false;
    controls.mouseButtons = {LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN};
    controls.touches = {ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN};
    controls.zoomToCursor = true;
    // About nine lots across on a computer, five on a phone; never so far that a house is a dot.
    const fit = Math.max(48, Math.min(size.width / 15, size.height / 11) * 1.15);
    controls.minZoom = fit * .5;
    controls.maxZoom = fit * 3;
    camera.zoom = fit;
    controls.target.set(start[0], 0, start[1]);
    camera.position.copy(controls.target).add(OFFSET);
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();
    const keepIn = () => {
      const b = live.current.bounds, t = controls.target;
      const x = Math.max(b[0], Math.min(b[1], t.x)), z = Math.max(b[2], Math.min(b[3], t.z));
      if (x !== t.x || z !== t.z) {
        camera.position.x += x - t.x;
        camera.position.z += z - t.z;
        t.x = x;
        t.z = z;
      }
      invalidate();
    };
    const settle = () => live.current.onSettle?.(controls.target.x, controls.target.z);
    controls.addEventListener('change', keepIn);
    controls.addEventListener('end', settle);
    onReady?.(controls);
    invalidate();
    return () => {
      controls.removeEventListener('change', keepIn);
      controls.removeEventListener('end', settle);
      controls.dispose();
    };
  }, [camera, gl]);
  return null;
}

// The door plate of the home tapped, floating above its roof.
function PlateAnchor({at, element}) {
  const {camera, size} = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    let frame;
    const place = () => {
      const el = element.current;
      if (el && at) {
        v.set(...at).project(camera);
        el.style.left = `${Math.max(90, Math.min(size.width - 90, (v.x + 1) / 2 * size.width))}px`;
        el.style.top = `${Math.max(70, (1 - v.y) / 2 * size.height)}px`;
        el.style.visibility = 'visible';
      }
      frame = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [at, camera, size, element, v]);
  return null;
}

function StreetScene({streets, daylight, picked, onPick, start, bounds, onSettle, plate, shell, day}) {
  const P = useStreetParts(streets, daylight, shell, day);
  const night = 1 - daylight, dusk = Math.max(0, (night - .15) / .85);
  const ground = useMemo(() => {
    const [x0, x1, z0, z1] = bounds;
    return {p: [(x0 + x1) / 2, -.002, (z0 + z1) / 2], s: [x1 - x0 + BLOCK_W * 1.3, z1 - z0 + BLOCK_D * 1.6]};
  }, [bounds]);
  // After dark everything goes moonlit blue, the lights warm.
  const tint = (c, k = .42) => mix(c, '#56617d', dusk * k).getStyle();
  return <>
    <Walk start={start} bounds={bounds} onSettle={onSettle}/>
    <hemisphereLight args={['#fff4e6', '#b5c2a6', .5 + .6 * daylight]}/>
    <ambientLight intensity={.14 + .3 * daylight} color={daylight > .5 ? '#ffffff' : '#9aa0c8'}/>
    <directionalLight position={[-6, 12, 9]} intensity={.3 + 1.45 * daylight} color={daylight > .5 ? '#fff1dc' : '#c9ccef'}/>
    {/* The meadow the streets sit in. */}
    <mesh position={ground.p} rotation={FLAT} onClick={e => {if (e.delta <= 6) onPick(null);}}>
      <planeGeometry args={ground.s}/>
      <meshStandardMaterial color={tint(C.meadow, .5)} roughness={1} alphaMap={edgeTexture} transparent depthWrite={false}/>
    </mesh>
    <Instances geometry={unitPlane} items={P.blocks} color={tint(C.lawn)}/>
    <Instances geometry={unitPlane} items={P.parks} color={tint(C.park)}/>
    <Instances geometry={unitPlane} items={P.lanes}/>
    <Instances geometry={unitDisc} items={P.soil}/>
    <Instances geometry={unitDisc} items={P.ponds} color={tint(C.pond, .4)}/>
    <Instances geometry={unitPlane} items={P.shades} shade opacity={.22 + .1 * daylight} renderOrder={1}/>
    <Instances geometry={unitBox} items={P.plinths} color={C.plinth}/>
    <Instances geometry={unitBox} items={P.bodies} color={C.plaster} onPick={it => onPick(it.pick)}/>
    <Instances geometry={gable} items={P.roofs} color={C.roof} onPick={it => onPick(it.pick)}/>
    <Instances geometry={unitCylinder} items={P.towers} color={C.plaster} onPick={it => onPick(it.pick)}/>
    <Instances geometry={unitCone} items={P.cones} color={C.roof} onPick={it => onPick(it.pick)}/>
    <Instances geometry={unitBox} items={P.merlons} color={C.plaster}/>
    <Instances geometry={unitBox} items={P.flags} color={C.sign}/>
    <Instances geometry={unitBox} items={P.chimneys} color={C.chimney}/>
    <Instances geometry={unitBox} items={P.caps} color={C.cap}/>
    <Instances geometry={unitBox} items={P.doors} color={C.door}/>
    <Instances geometry={unitBox} items={P.steps} color={C.step}/>
    <Instances geometry={unitBox} items={P.windows} basic/>
    <Instances geometry={unitBox} items={P.lamps} basic/>
    <Instances geometry={unitBox} items={P.signs} color={C.sign} basic/>
    <Instances geometry={unitBall} items={P.wisteria}/>
    <Instances geometry={unitBox} items={P.mailboxes} color={C.mailbox}/>
    <Instances geometry={unitCylinder} items={P.trunks} color={C.trunk}/>
    <Instances geometry={unitBall} items={P.crowns}/>
    <Instances geometry={unitBall} items={P.bushes}/>
    <Instances geometry={unitBox} items={P.benches} color={C.bench}/>
    <Instances geometry={unitBall} items={P.flowers}/>
    <Instances geometry={unitCylinder} items={P.posts} color={C.post}/>
    <Instances geometry={unitBox} items={P.heads} basic/>
    <Instances geometry={unitPlane} items={P.paving} color={tint(C.paving, .35)} onPick={it => onPick(it.plaza)}/>
    <Instances geometry={unitBox} items={P.awning} onPick={it => onPick(it.plaza)}/>
    <Instances geometry={unitBall} items={P.bulbs} basic/>
    <Instances geometry={unitBox} items={P.machines} onPick={it => onPick(it.plaza)}/>
    <Instances geometry={unitBall} items={P.domes} color={tint(C.glass, .3)} onPick={it => onPick(it.plaza)}/>
    <Instances geometry={unitBox} items={P.cases} color={tint(C.glass, .3)} onPick={it => onPick(it.plaza)}/>
    <Instances geometry={unitPlane} items={P.glows} glow opacity={.72} renderOrder={5}/>
    {/* Only you see this: a ring of light at your own door. */}
    {P.mine && <group position={[P.mine.x, .014, P.mine.z]}>
      <mesh rotation={FLAT}><circleGeometry args={[.42, 32]}/><meshBasicMaterial map={glowTexture} transparent depthWrite={false} opacity={.75}/></mesh>
      <mesh rotation={FLAT} position={[0, .002, 0]}><ringGeometry args={[.25, .32, 40]}/><meshBasicMaterial color="#e3a64e" transparent opacity={.95}/></mesh>
    </group>}
    {picked?.home && <mesh position={picked.door ? [picked.door[0], .013, picked.door[1]] : [picked.at[0] - HOUSE.w * .12, .013, picked.at[2] + HOUSE.d / 2 + .62]} rotation={FLAT}><ringGeometry args={[.32, .38, 32]}/><meshBasicMaterial color="#b0607e" transparent opacity={.75}/></mesh>}
    {picked?.plaza && <mesh position={[picked.at[0], .012, picked.at[2] + .1]} rotation={FLAT}><ringGeometry args={[.62, .7, 40]}/><meshBasicMaterial color="#b0607e" transparent opacity={.6}/></mesh>}
    {picked && <PlateAnchor at={picked.at} element={plate}/>}
  </>;
}

// Which streets to fetch around a point, and the edges the walk keeps within.
function boundsFor(numbers) {
  if (!numbers.length) return [-BLOCK_W / 2, BLOCK_W / 2, -BLOCK_D / 2, BLOCK_D / 2];
  const xs = numbers.map(n => streetOrigin(n)[0]), zs = numbers.map(n => streetOrigin(n)[1]);
  return [Math.min(...xs) - BLOCK_W * .55, Math.max(...xs) + BLOCK_W * .55, Math.min(...zs) - BLOCK_D * .55, Math.max(...zs) + BLOCK_D * .55];
}

export function StreetMap({porch, daylight = 1, onVisit, onHome, onMachine, shell, day}) {
  const [me, setMe] = useState(null);
  const [streets, setStreets] = useState({});
  const [count, setCount] = useState(0);
  const [problem, setProblem] = useState('');
  const [picked, setPicked] = useState(null);
  const loading = useRef(new Set());
  const plate = useRef();
  const fetchStreet = async n => {
    if (loading.current.has(n)) return;
    loading.current.add(n);
    try {
      const s = await porch.street(n);
      setStreets(old => ({...old, [n]: {seed: s.street.seed, homes: s.homes}}));
      setCount(s.streets);
      return s;
    } catch (err) {
      loading.current.delete(n);
      if (err?.status !== 404) setProblem(err?.message || '街上的路没走通。');
    }
  };
  useEffect(() => {
    let live = true;
    porch.home().then(async home => {
      if (!live) return;
      if (!home?.street) return setProblem('还没有小屋。');
      setMe(home);
      const first = await fetchStreet(Number(home.street));
      if (first && live) for (const n of streetsAround(...streetOrigin(Number(home.street)), first.streets)) fetchStreet(n);
    }, err => live && setProblem(err?.message || '连不上街上。'));
    return () => {
      live = false;
    };
  }, [porch]);
  const start = useMemo(() => {
    if (!me) return null;
    const [ox, oz] = streetOrigin(Number(me.street)), p = lotPlace(me.lot);
    return [ox + p.x, oz + p.z + .9];
  }, [me]);
  const known = Object.keys(streets).map(Number);
  const bounds = useMemo(() => boundsFor(known.length ? known : me ? [Number(me.street)] : []), [known.join(','), me]);
  // Walking off towards streets not fetched yet: fetch them.
  const settle = (x, z) => {
    if (count) for (const n of streetsAround(x, z, count)) if (!streets[n]) fetchStreet(n);
  };
  const look = picked?.home ? porchLook(picked.home.porch) : null;
  const name = picked?.home ? picked.home.nickname || picked.home.name : '';
  return <div className="street-map">
    {start && <div className="street-canvas">
      <QuietCanvas orthographic camera={{position: [8.5, 10.5, 10.5], zoom: 40, near: -100, far: 200}} dpr={[1, 1.6]} gl={{antialias: true, alpha: true}} onPointerMissed={() => setPicked(null)}>
        <StreetScene streets={streets} daylight={daylight} picked={picked} onPick={setPicked} start={start} bounds={bounds} onSettle={settle} plate={plate} shell={shell} day={day}/>
      </QuietCanvas>
    </div>}
    {!start && !problem && <p className="street-status" role="status">正在出门……</p>}
    {problem && <section className="street-problem" role="alert"><p>{problem}</p><button type="button" onClick={onHome}>回家</button></section>}
    {picked?.plaza && <section ref={plate} className="street-plate plaza" style={{visibility: 'hidden'}} role="dialog" aria-label="小广场">
      <p className="street-plate-name"><strong>小广场</strong><span>{plazaLook(picked.plaza.seed).name}色的机器</span></p>
      <p className="street-plate-light">棚子前面{MACHINES.map(k => MACHINE_WORDS[k][0]).join('、')}，一次一张券。</p>
      <div className="street-plate-actions">
        {MACHINES.map(kind => <button key={kind} type="button" className="go" onClick={() => {setPicked(null); onMachine?.({...picked.plaza, kind});}}>{MACHINE_WORDS[kind][1]}</button>)}
        <button type="button" aria-label="收起" onClick={() => setPicked(null)}>×</button>
      </div>
    </section>}
    {picked?.home && <section ref={plate} className={`street-plate porch-${picked.home.porch}`} style={{visibility: 'hidden'}} role="dialog" aria-label={`${name}的门牌`}>
      <p className="street-plate-name"><strong>{picked.home.name}</strong>{picked.home.nickname && <span>{picked.home.nickname}</span>}</p>
      <p className="street-plate-light">{picked.home.mine ? '这是咱家' : look.label}</p>
      <div className="street-plate-actions">
        {picked.home.mine
          ? <button type="button" className="go" onClick={onHome}>回家</button>
          : look.visit && <button type="button" className="go" onClick={() => onVisit({...picked.home, street: picked.street, lot: picked.lot})}>走到门口</button>}
        <button type="button" aria-label="收起门牌" onClick={() => setPicked(null)}>×</button>
      </div>
    </section>}
    <p className="street-hint">拖着走 · 两指或滚轮靠近 · 点一户看门牌 · 树中间是小广场</p>
  </div>;
}
