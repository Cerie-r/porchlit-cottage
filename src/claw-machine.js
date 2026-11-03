import * as THREE from 'three';
import {play} from './sounds.js';
import {PALETTES, LIGHT, POINT, pointLight, finish, mesh, vinyl, softBox, plate, tile, seeded, draws, hex} from './machine-kit.js';
import {grabChance} from './claw.js';

// The claw machine on the plaza, in three.js: the same soft vinyl base as the
// bear jar, a glass cabinet on four posts, a header with two round ears on
// top, a gantry on two rails with a cable and a three-pronged claw, and a
// chute in the front left corner with a little exit door under it. The dolls
// are the doll table's own: claw-overlay.jsx draws them into `dolls` and this
// puts each on its spot. A ticket in, steer, grab: a doll caught square on
// mostly comes up, one caught off centre often slides off halfway, and one
// that comes up is carried to the chute, out of the door and up to your face.

export const FLOOR = .512;          // the cabinet floor, in the machine's frame
export const DOLL_H = .17;          // how tall a doll sits in the cabinet
const BOUND = {x: .22, z: .17}, HOME = new THREE.Vector3(-.18, 0, .12), HOLE = new THREE.Vector3(-.18, FLOOR, .12), CLAW_UP = 1.0;
const DOOR = new THREE.Vector3(-.16, .19, .3);
const MISSES = ['差一点点', '它刚才晃了一下', '就差一点，再试一次'];

// Where the dolls sit: spread over the floor, none in the chute corner.
export const SPOTS = (() => {
  const rnd = seeded(528), out = [];
  for (let tries = 0; out.length < 11 && tries < 4000; tries++) {
    const x = (rnd() * 2 - 1) * .23, z = (rnd() * 2 - 1) * .16;
    if (x < -.08 && z > .03) continue;
    if (out.some(s => Math.hypot(s.x - x, s.z - z) < .085)) continue;
    out.push({x, z, turn: (rnd() - .5) * 1.2, tilt: (rnd() - .5) * .25});
  }
  return out;
})();

// Three curved prongs round a little hub, opened and closed at their pivots.
function claw(M) {
  const g = new THREE.Group(), prongs = [];
  g.add(mesh(new THREE.CylinderGeometry(.03, .026, .034, 24), M.trim, 0, .017, 0));
  g.add(mesh(new THREE.SphereGeometry(.018, 16, 12), M.cream, 0, .04, 0));
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -.035, .03), new THREE.Vector3(0, -.075, -.004));
  const prongGeo = new THREE.TubeGeometry(curve, 16, .0055, 8);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group(); arm.rotation.y = i * Math.PI * 2 / 3;
    const pivot = new THREE.Group(); pivot.position.set(0, 0, .018);
    pivot.add(finish(new THREE.Mesh(prongGeo, M.cream)));
    pivot.add(mesh(new THREE.SphereGeometry(.008, 10, 8), M.trim, 0, -.075, -.004));
    arm.add(pivot); g.add(arm); prongs.push(pivot);
  }
  g.userData.prongs = prongs;
  return g;
}
const setOpen = (c, open) => { for (const p of c.userData.prongs) p.rotation.x = -.62 * open + .16 * (1 - open); };

// `onState(state, hint)` hears 'idle', 'play', 'busy' and 'won'. `onGrab()`
// puts the ticket in for real and says whether there was one. `onWin(id)`
// hears which doll is coming out (as soon as it's sure), `onGone(id)` when it
// has been taken and is out of the cabinet.
export function createClawMachine({palette = 0, night = false, onState = () => {}, onGrab = () => true, onWin = () => {}, onGone = () => {}} = {}) {
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

  // ---- the machine ----
  const machine = new THREE.Group(); rig.add(machine);
  const M = {body: vinyl(P.body), trim: vinyl(P.trim), cream: vinyl(P.cream, .5), hole: vinyl(0x4b3f4f, .9)};
  machine.add(finish(new THREE.Mesh(softBox(.7, .07, .56, .02, .06), M.trim)));
  const body = finish(new THREE.Mesh(softBox(.64, .4, .5, .045, .07), M.body)); body.position.y = .07; machine.add(body);
  const rim = finish(new THREE.Mesh(softBox(.66, .036, .52, .012, .07), M.cream)); rim.position.y = .468; machine.add(rim);
  const front = .25 + .0005;
  const name = tile(.24, .055, draws.name(P.ink), M.cream); name.position.set(.12, .43, front); machine.add(name);
  const ticketTile = tile(.1, .13, draws.ticket(P.ink), M.cream); ticketTile.position.set(.2, .3, front); machine.add(ticketTile);
  const doorTile = tile(.19, .19, draws.door(P.ink), M.cream); doorTile.position.set(-.16, .27, front); machine.add(doorTile);
  const flap = new THREE.Group(); flap.position.set(-.16, .235, front + .012);
  flap.add(mesh(plate(.13, .09, .012, .004, .02), M.trim, 0, -.045, 0)); machine.add(flap);
  machine.add(mesh(plate(.13, .09, .02, .004, .02), M.hole, -.16, .19, front - .004));
  for (const s of [-1, 1]) {
    const g = tile(.4, .26, draws.gingham(hex(P.cream), hex(P.trim)), M.body);
    g.rotation.y = s * Math.PI / 2; g.position.set(s * .3205, .3, 0); machine.add(g);
  }
  // The little deck with a joystick and a button.
  machine.add(mesh(softBox(.3, .05, .1, .012, .02), M.cream, .06, .49, .27));
  const stick = new THREE.Group(); stick.position.set(0, .545, .29);
  stick.add(mesh(new THREE.CylinderGeometry(.006, .006, .05, 10), M.cream, 0, .025, 0));
  stick.add(mesh(new THREE.SphereGeometry(.018, 16, 12), M.trim, 0, .055, 0));
  machine.add(stick);
  machine.add(mesh(new THREE.CylinderGeometry(.026, .028, .018, 24), M.trim, .14, .548, .29));
  // The glass cabinet.
  const H = .62, top = .504 + H;
  for (const [x, z] of [[-.29, -.225], [.29, -.225], [-.29, .225], [.29, .225]]) machine.add(mesh(softBox(.034, H, .034, .008, .008), M.trim, x, .504, z));
  const glassMat = new THREE.MeshPhysicalMaterial({color: 0xffffff, roughness: .05, metalness: 0, transparent: true, opacity: .1, depthWrite: false});
  const glassBox = new THREE.Mesh(new THREE.BoxGeometry(.56, H, .43), glassMat); glassBox.position.set(0, .504 + H / 2, 0); glassBox.renderOrder = 3; machine.add(glassBox);
  machine.add(mesh(new THREE.BoxGeometry(.56, .012, .43), M.cream, 0, FLOOR - .006, 0));
  // The chute: a clear little fence round a dark hole.
  machine.add(mesh(new THREE.BoxGeometry(.11, .004, .11), M.hole, HOLE.x, FLOOR + .002, HOLE.z));
  for (const [dx, dz, w, d] of [[0, -.058, .12, .006], [.058, 0, .006, .12]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, .07, d), glassMat); wall.position.set(HOLE.x + dx, FLOOR + .035, HOLE.z + dz); machine.add(wall);
    machine.add(mesh(new THREE.BoxGeometry(Math.max(w, .008), .008, Math.max(d, .008)), M.trim, HOLE.x + dx, FLOOR + .072, HOLE.z + dz));
  }
  // The header, its sign, and two round ears.
  const head = finish(new THREE.Mesh(softBox(.66, .15, .52, .03, .06), M.body)); head.position.y = top; machine.add(head);
  const sign = tile(.34, .07, draws.name(P.ink), M.cream); sign.position.set(0, top + .075, .2605); machine.add(sign);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(.075, 28, 20), M.body, s * .22, top + .15, 0); ear.scale.set(1, 1, .5); machine.add(ear);
    const inner = mesh(new THREE.SphereGeometry(.045, 24, 16), M.cream, s * .22, top + .15, .03); inner.scale.set(1, 1, .3); machine.add(inner);
  }
  // Rails, gantry, cable and claw.
  for (const z of [-.19, .19]) { const r = mesh(new THREE.CylinderGeometry(.006, .006, .56, 8), M.cream, 0, top - .04, z); r.rotation.z = Math.PI / 2; machine.add(r); }
  const bar = mesh(new THREE.BoxGeometry(.016, .012, .4), M.trim, 0, top - .04, 0); machine.add(bar);
  const cart = mesh(softBox(.04, .03, .04, .008, .01), M.trim, 0, top - .062, 0); machine.add(cart);
  const cable = mesh(new THREE.CylinderGeometry(.003, .003, 1, 6), vinyl(0x8a7f8c, .5)); machine.add(cable);
  const hook = claw(M); machine.add(hook);
  const clawTop = top - .06;
  // The ring that shows where the claw would come down: gold over a doll.
  const ringMat = new THREE.MeshBasicMaterial({color: P.trim, transparent: true, opacity: .85, depthTest: false});
  const ring = new THREE.Mesh(new THREE.RingGeometry(.026, .046, 40), ringMat); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 9;
  ring.add(new THREE.Mesh(new THREE.CircleGeometry(.007, 16), ringMat)); ring.visible = false; machine.add(ring);
  const innerLight = pointLight(0xffe2b8, 1.4); innerLight.position.set(0, top - .1, .05); machine.add(innerLight);
  // Where the dolls go.
  const dolls = new THREE.Group(); machine.add(dolls);
  const pos = new THREE.Vector3(HOME.x, CLAW_UP, HOME.z); setOpen(hook, .35);

  // ---- the dolls ----
  const toys = [], placed = new WeakSet();
  // A doll drawn into `dolls`, on spot `spot`. Placed once; after that it moves as it's moved.
  function place(id, group, spot) {
    if (!group || placed.has(group)) return;
    placed.add(group);
    const s = SPOTS[spot % SPOTS.length];
    group.position.set(s.x, FLOOR, s.z); group.rotation.set(0, s.turn, s.tilt);
    group.userData.id = id;
    toys.push(group);
    placeClaw();
  }
  function placeClaw() {
    bar.position.x = pos.x; cart.position.set(pos.x, clawTop, pos.z);
    hook.position.copy(pos);
    const len = Math.max(.01, clawTop - pos.y - .04);
    cable.position.set(pos.x, pos.y + .04 + len / 2, pos.z); cable.scale.y = len;
    // The ring sits on the head of the doll under the claw, or on the floor.
    let under = null, d = 1;
    for (const t of toys) { const k = Math.hypot(t.position.x - pos.x, t.position.z - pos.z); if (k < d) { d = k; under = t; } }
    const hit = under && d < .07;
    ring.position.set(pos.x, hit ? FLOOR + DOLL_H + .02 : FLOOR + .004, pos.z);
    ringMat.color.set(hit ? 0xf2b33d : P.trim);
    ring.scale.setScalar(hit ? 1.15 : 1);
  }
  placeClaw();

  // ---- framing, night ----
  let camera = null, scene = null, camLift = 0, camTarget = 0;
  // While playing, the camera comes in close and looks down through the front glass, under the header.
  function placeCamera() {
    if (!camera) return;
    const fit = 1.75, focus = .6, aspect = camera.aspect || 1;
    const dist = Math.max(fit * 2.0, fit * 2.0 / Math.min(1, aspect * 1.3)) + .2;
    const p0 = new THREE.Vector3(0, focus + dist * .17, dist), t0 = new THREE.Vector3(0, focus, 0);
    const p1 = new THREE.Vector3(0, 1.5, 1.8 / Math.min(1, aspect * 1.45)), t1 = new THREE.Vector3(0, .6, 0);
    const k = camLift * camLift * (3 - 2 * camLift);
    camera.position.lerpVectors(p0, p1, k);
    camera.lookAt(t0.lerp(t1, k));
  }
  let isNight = night;
  function setNight(on) {
    isNight = !!on;
    if (scene) scene.background = new THREE.Color(isNight ? P.bgNight : P.bg);
    groundMat.opacity = isNight ? .4 : .14;
    hemi.intensity = (isNight ? .2 : .6) * LIGHT; sun.intensity = (isNight ? .14 : .8) * LIGHT; fill.intensity = (isNight ? .06 : .3) * LIGHT;
    innerLight.intensity = isNight ? .9 * POINT : 0;
  }

  // ---- the moment ----
  const anims = [];
  let clock = 0;
  const animate = (dur, fn, done) => anims.push({t0: clock, dur, fn, done});
  const ease = u => 1 - Math.pow(1 - u, 3), smooth = u => u * u * (3 - 2 * u);
  let state = 'idle', held = null, won = null, move = {x: 0, z: 0}, alive = true;
  const setState = (s, hint) => {
    state = s; ring.visible = s === 'play';
    // Look down into the cabinet while playing, so it's easy to tell how far back a doll sits.
    if (s === 'play') camTarget = 1; else if (s === 'idle') camTarget = 0;
    onState(s, hint);
  };
  function faceFront(then) {
    const from = rig.rotation.y, to = Math.round(from / (Math.PI * 2)) * Math.PI * 2, fx = rig.rotation.x;
    animate(.35, u => { const e = ease(u); rig.rotation.y = from + (to - from) * e; rig.rotation.x = fx * (1 - e); }, then);
  }
  // A ticket slides into the slot (the caller has seen there is one).
  function insert() {
    if (state !== 'idle') return false;
    setState('busy');
    faceFront(() => {
      const tk = tile(.075, .042, draws.mini(P.ink), vinyl(P.cream, .5));
      tk.position.set(.2, .44, .46); tk.rotation.x = -.2; machine.add(tk);
      play('boxRibbon', {volume: .8});
      const a = tk.position.clone(), b = new THREE.Vector3(.2, .335, .27);
      animate(.5, u => { const e = ease(u); tk.position.lerpVectors(a, b, e); tk.rotation.x = -.2 - 1.25 * e; tk.scale.y = u < .6 ? 1 : 1 - (u - .6) / .4 * .95; },
        () => { machine.remove(tk); setState('play'); });
    });
    return true;
  }
  // Steering: the claw glides while an arrow is held; the joystick leans the same way.
  const steer = (x, z) => { move = {x: Math.sign(x) || 0, z: Math.sign(z) || 0}; };
  function steering(dt) {
    if (state !== 'play') { stick.rotation.set(0, 0, 0); return; }
    const sp = .24 * dt;
    pos.x = Math.max(-BOUND.x, Math.min(BOUND.x, pos.x + move.x * sp));
    pos.z = Math.max(-BOUND.z, Math.min(BOUND.z, pos.z + move.z * sp));
    stick.rotation.set(move.z * .35, 0, -move.x * .35);
    if (move.x || move.z) placeClaw();
  }
  function grab() {
    if (state !== 'play') return false;
    move = {x: 0, z: 0};
    if (!onGrab()) { setState('idle'); return false; }
    setState('busy');
    // Whatever doll is under the claw, and how squarely.
    let best = null, bestD = 1;
    for (const t of toys) { const d = Math.hypot(t.position.x - pos.x, t.position.z - pos.z); if (d < bestD) { bestD = d; best = t; } }
    const chance = best ? grabChance(bestD) : 0, win = Math.random() < chance;
    if (win) onWin(best.userData.id);
    const lowY = FLOOR + (best && bestD < .09 ? DOLL_H * .65 : .085);
    animate(.25, u => setOpen(hook, .35 + .65 * u), () => {
      animate(.8, u => { pos.y = CLAW_UP + (lowY - CLAW_UP) * smooth(u); placeClaw(); }, () => {
        play('click');
        animate(.28, u => setOpen(hook, 1 - u), () => {
          if (best && chance > 0) { held = best; hook.attach(held); }
          animate(.85, u => { pos.y = lowY + (CLAW_UP - lowY) * smooth(u); placeClaw(); if (held && !win && u > .45) slip(); }, () => {
            if (held && win) carry(); else goHome(() => { setOpen(hook, .35); setState('idle', MISSES[Math.floor(Math.random() * MISSES.length)]); });
          });
        });
      });
    });
    return true;
  }
  // A near miss: the doll slides out and drops back down where it can be reached.
  function slip() {
    const t = held; held = null; dolls.attach(t);
    const from = t.position.clone(), r0 = t.rotation.z, tilt = (Math.random() - .5) * .3;
    let x = Math.max(-.2, Math.min(.2, from.x + (Math.random() - .5) * .04)), z = Math.max(-.14, Math.min(.14, from.z + (Math.random() - .5) * .04));
    if (x < -.08 && z > .03) x = -.07;
    play('cloth');
    animate(.38, u => { t.position.set(from.x + (x - from.x) * u, from.y + (FLOOR - from.y) * u * u, from.z + (z - from.z) * u); t.rotation.z = r0 + (tilt - r0) * u; t.rotation.x *= 1 - u; },
      () => { t.position.set(x, FLOOR, z); t.rotation.x = 0; t.rotation.z = tilt; placeClaw(); });
  }
  function goHome(then) {
    const from = pos.clone();
    animate(.7, u => { const e = smooth(u); pos.x = from.x + (HOME.x - from.x) * e; pos.z = from.z + (HOME.z - from.z) * e; placeClaw(); }, then);
  }
  // Carried to the chute, let go, out of the door and up to your face.
  function carry() {
    goHome(() => {
      animate(.2, u => setOpen(hook, u * .9), () => {
        const t = held; held = null; dolls.attach(t);
        toys.splice(toys.indexOf(t), 1);
        const y0 = t.position.y;
        animate(.3, u => { t.position.y = y0 + (FLOOR - .1 - y0) * u * u; }, () => {
          t.visible = false;
          play('cloth');
          animate(.25, u => { flap.rotation.x = -1.2 * Math.sin(u * Math.PI); });
          t.visible = true; t.position.copy(DOOR); t.rotation.set(0, 0, 0); t.scale.setScalar(.6);
          setTimeout(() => fly(t), 160);
        });
      });
    });
  }
  function fly(t) {
    if (!alive || !camera) return;
    won = t; root.attach(t);
    // Up close its shadow would fall across half the floor.
    t.traverse(x => { x.castShadow = false; });
    const from = t.position.clone(), q0 = t.quaternion.clone(), s0 = t.scale.x;
    // How big it will be in front of you, from what it measures now.
    const size = new THREE.Box3().setFromObject(t).getSize(new THREE.Vector3()).multiplyScalar(1.7 / s0);
    const dir = new THREE.Vector3(0, .75, 0).sub(camera.position).normalize(), tan = Math.tan(camera.fov * Math.PI / 360);
    // Close enough to hold, but within about 70% of the width and 60% of the height.
    const near = Math.max(.95, Math.max(size.x, size.z) / (.7 * 2 * tan * camera.aspect), size.y / (.6 * 2 * tan));
    // A doll stands on its feet: lower it by half its height so it floats in the middle of the view.
    const to = camera.position.clone().addScaledVector(dir, near).add(new THREE.Vector3(0, -size.y / 2 - .02, 0));
    const look = new THREE.Object3D(); look.position.copy(to); look.lookAt(camera.position);
    play('turn');
    animate(.55, u => {
      const e = ease(u);
      t.position.lerpVectors(from, to, e); t.position.y += Math.sin(u * Math.PI) * .16;
      t.scale.setScalar(s0 + (1.7 - s0) * e);
      t.quaternion.copy(q0).slerp(look.quaternion, e);
    }, () => {
      if (won !== t) return;
      t.quaternion.copy(look.quaternion); t.userData.rest = to.clone();
      play('found'); setOpen(hook, .35);
      setState('won');
    });
  }
  // Taken: the doll drops away into the backpack.
  function collect() {
    if (state !== 'won' || !won) return false;
    const t = won, from = t.position.clone(), s0 = t.scale.x;
    setState('busy');
    animate(.45, u => { const e = ease(u); t.position.set(from.x, from.y - .35 * e, from.z - .2 * e); t.scale.setScalar(s0 * (1 - e)); }, () => {
      t.parent?.remove(t); if (won === t) won = null;
      setState('idle', '再投一张');
      onGone(t.userData.id);
    });
    return true;
  }

  // ---- pointer: drag to turn it round; tap the slot, or the doll in front of you ----
  let canvas = null, drag = null, idleSince = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
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
  let onTap = () => {};
  const up = e => {
    if (!drag) return;
    const tap = drag.moved < 8 && performance.now() - drag.t < 450;
    drag = null; idleSince = performance.now();
    if (!tap || !camera) return;
    const box = canvas.getBoundingClientRect();
    ndc.set((e.clientX - box.left) / box.width * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (state === 'won') return onTap('doll');
    if (state === 'idle' && ray.intersectObject(ticketTile, true).length) return onTap('ticket');
  };
  const cancel = () => { drag = null; };
  // Into a scene, with its camera and canvas; `tap(part)` hears taps on the slot or the doll.
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
  function unlisten() {
    if (!canvas) return;
    canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', moved);
    canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel);
    canvas = null;
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
    steering(Math.min(.05, dt));
    if (Math.abs(camTarget - camLift) > .0005) camLift += (camTarget - camLift) * Math.min(1, dt * 5);
    placeCamera();
    if (won && won.userData.rest && state === 'won') won.position.y = won.userData.rest.y + Math.sin(t * 2.4) * .006;
  }

  setNight(night);
  return {
    get state() { return state; },
    dolls, place, mount, update, setNight, insert, steer, grab, collect,
    dispose() {
      alive = false; unlisten(); scene?.remove(root);
      // The dolls belong to the doll table's drawing, which lets go of its own.
      const free = x => {
        if (x === dolls || x.userData.id) return;
        x.geometry?.dispose();
        for (const m of [].concat(x.material || [])) { m.map?.dispose(); m.dispose(); }
        x.children.forEach(free);
      };
      free(root);
    }
  };
}
