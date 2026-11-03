// Going to bed together. Each of them walks round to their own side of the bed, climbs in and lies down, heads on
// the two pillows, the quilt up to their chins; they sleep side by side, faces turned a little to each other,
// until she gets them up. Pure steps on the two figures' motion states (resident-motion-state.js), as the
// touches are (resident-touches.js); resident-motion.jsx runs them, hides what the quilt covers and shuts their
// eyes.
import {beginStand} from './resident-motion-state.js';

// In the bed's own frame (bedroom.jsx's BedroomBed, before the room turns it: x across, z from the headboard at
// -z to the foot): the two pillows; where each climbs in from, beside the mattress; how high a head lies (its
// middle, on the pillow); how far a figure's feet are from the middle of its head (lying, its feet are where
// it turns about); how long climbing in or out takes (s); how far they turn their faces to each other.
export const BED = {pillow: [.6, -1.03], side: 1.65, sideZ: -.25, head: 1.29, feet: 1.02, climb: 1.2, turn: .14};

const mix = (a, b, t) => a + (b - a) * t;
const ease = u => u * u * (3 - 2 * u);
const angleTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// The bed in the room: from where the room has it (furniture.bedroomBed's offset from its place), its middle on
// the floor and the way its foot points.
export function bedFrame(furniture = {}) {
  const f = furniture.bedroomBed || {}, p = f.position || [0, 0, 0];
  return {origin: [-3.15 + p[0], -.9 + p[2]], yaw: (f.rotationY || 0) + Math.PI / 2};
}

// A point in the bed's frame, in the room's.
function inRoom(bed, x, z) {
  const c = Math.cos(bed.yaw), s = Math.sin(bed.yaw);
  return [bed.origin[0] + x * c + z * s, bed.origin[1] - x * s + z * c];
}

// Where each of them sleeps: `side` -1 or 1 across the bed (her pillow; he has the other). For each: where they
// climb in from, where their feet go lying down (so the head is on the pillow), how high, which way.
export function bedPlaces(bed, side) {
  const place = s => ({
    from: inRoom(bed, s * BED.side, BED.sideZ),
    lie: inRoom(bed, s * BED.pillow[0], BED.pillow[1] + BED.feet),
    y: BED.head,
    yaw: bed.yaw,
    // Out of bed, facing away from it.
    out: bed.yaw + s * Math.PI / 2,
    // Turned a little towards the other one (about the length of the body): her face to him, his to her.
    roll: -s * BED.turn
  });
  return {her: place(side), him: place(-side)};
}

// Her side: the pillow nearer to where she is (`at`), so she doesn't walk round the bed for it.
export function herSide(bed, at) {
  const [l, r] = [-1, 1].map(s => inRoom(bed, s * BED.side, BED.sideZ)), far = p => Math.hypot(p[0] - at[0], p[1] - at[1]);
  return far(l) <= far(r) ? -1 : 1;
}

export function newSleep() {
  return {phase: 'go', t: 0, all: 0, places: null, climbs: null, asleep: false};
}
export const sleeping = s => !!s && (s.phase === 'in' || s.phase === 'asleep');

// Where a lying figure's head is (its feet are at m.x, m.z, the head towards the headboard).
export const headOf = m => [m.x - Math.sin(m.yaw) * BED.feet, m.z - Math.cos(m.yaw) * BED.feet];

// Getting them up (out of bed, each beside their side of it). Already up: nothing.
export function wakeUp(s) {
  if (!s || s.phase === 'done' || s.phase === 'up') return false;
  if (s.phase === 'go' || s.phase === 'walk') {
    s.phase = 'done';
    return false;
  }
  Object.assign(s, {phase: 'up', t: 0});
  return true;
}

// Each figure's climb in or out of bed, from where it stood (or lay).
function climbFrom(m) {
  return {x: m.x, z: m.z, y: m.y || 0, yaw: m.yaw, lie: m.lie || 0, roll: m.roll || 0};
}
function climbStep(m, from, to, u) {
  const e = ease(u), up = to.lie > from.lie;
  m.x = mix(from.x, to.x, e);
  m.z = mix(from.z, to.z, e);
  // A little hop up onto the mattress (or down off it).
  m.y = mix(from.y, to.y, e) + (u < 1 / 1.4 ? Math.sin(u * 1.4 * Math.PI) * .12 : 0);
  m.inBed = true;
  m.yaw = from.yaw + angleTo(from.yaw, to.yaw) * ease(Math.min(1, u * 2.2));
  // Lying back comes after turning round and getting on; getting up, it comes first.
  m.lie = up ? mix(from.lie, to.lie, ease(Math.max(0, (u - .3) / .7))) : mix(from.lie, to.lie, ease(Math.min(1, u / .7)));
  m.roll = mix(from.roll, to.roll, e);
}

// Where each of them gets into bed from, and the walk there from where they are: {side, places, paths: {her, him}},
// or null when one of them can't get there. Whether they can go at all, before anything else stops for it. `route`
// and `place` as for stepSleep.
export function planBed(bed, {her, him, route, place = (k, to) => to}) {
  const side = herSide(bed, [her.x, her.z]), places = bedPlaces(bed, side), paths = {};
  for (const [m, p, kind] of [[her, places.her, 'her'], [him, places.him, 'him']]) {
    p.from = place(kind, p.from);
    const start = (m.sit > .001 || m.transition) && m.seat ? m.seat.approach : [m.x, m.z];
    const path = Math.hypot(start[0] - p.from[0], start[1] - p.from[1]) < .05 ? [] : route(kind, start, p.from);
    if (!path) return null;
    paths[kind] = path;
  }
  return {side, places, paths};
}

// One frame. `bed` is bedFrame's; `route(kind, from, to)` plans a walk for one of them (null when there's no
// way); `place(kind, to)` moves a spot clear of furniture for them. Returns false once it's over.
export function stepSleep(s, dt, {her, him, bed, route, place = (k, to) => to}) {
  s.t += dt;
  s.all += dt;
  // Getting there took far too long (a figure never loaded): give up quietly.
  if ((s.phase === 'go' || s.phase === 'walk') && s.all > 30) return settle(s, her, him);
  switch (s.phase) {
    case 'go': {
      const plan = planBed(bed, {her, him, route, place});
      if (!plan) return settle(s, her, him);
      const {side, places, paths} = plan;
      for (const [m, path] of [[her, paths.her], [him, paths.him]]) {
        if (m.sit > .001 || m.transition) {
          m.pending = path;
          m.pendingSeat = null;
          beginStand(m);
        } else Object.assign(m, {route: path, seat: null, pending: null, pendingSeat: null});
      }
      Object.assign(s, {phase: 'walk', t: 0, places, side});
      return true;
    }
    case 'walk': {
      // Both at their side of the bed: in they climb, together.
      if ([her, him].some(m => m.route.length || m.transition || m.pending)) return true;
      s.climbs = {her: climbFrom(her), him: climbFrom(him)};
      Object.assign(s, {phase: 'in', t: 0});
      return true;
    }
    case 'in': {
      const u = Math.min(1, s.t / BED.climb);
      for (const [m, p, from] of [[her, s.places.her, s.climbs.her], [him, s.places.him, s.climbs.him]]) {
        climbStep(m, from, {x: p.lie[0], z: p.lie[1], y: p.y, yaw: p.yaw, lie: 1, roll: p.roll}, u);
        // Under the quilt once lying down.
        m.asleep = u > .85;
      }
      if (u >= 1) Object.assign(s, {phase: 'asleep', t: 0, asleep: true});
      return true;
    }
    case 'asleep':
      return true;
    case 'up': {
      if (!s.climbs?.out) {
        s.climbs = {...s.climbs, out: true, herLying: climbFrom(her), himLying: climbFrom(him)};
        her.asleep = him.asleep = false;
        s.asleep = false;
      }
      const u = Math.min(1, s.t / BED.climb);
      for (const [m, p, from] of [[her, s.places.her, s.climbs.herLying], [him, s.places.him, s.climbs.himLying]]) climbStep(m, from, {x: p.from[0], z: p.from[1], y: 0, yaw: p.out, lie: 0, roll: 0}, u);
      if (u >= 1) return settle(s, her, him);
      return true;
    }
    default:
      return false;
  }
}

// However it ends, both are on their feet, out from under the quilt, eyes open.
export function settle(s, her, him) {
  for (const m of [her, him]) {
    if (m.inBed) Object.assign(m, {lie: 0, roll: 0, y: 0, asleep: false, inBed: false});
  }
  Object.assign(s, {phase: 'done', asleep: false});
  return false;
}

// Out of bed at once (she's off to do something else): each stands where they'd climb out.
export function outOfBed(s, her, him) {
  if (!s || s.phase === 'done') return false;
  if (s.places && (s.phase === 'in' || s.phase === 'asleep' || s.phase === 'up')) {
    Object.assign(her, {x: s.places.her.from[0], z: s.places.her.from[1]});
    Object.assign(him, {x: s.places.him.from[0], z: s.places.him.from[1]});
  }
  return settle(s, her, him);
}
