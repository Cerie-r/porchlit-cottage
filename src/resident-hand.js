// Walking hand in hand. He comes up beside her and takes her hand, leads her a little way round the room,
// and then they stay hand in hand wherever she walks, until either of them does something else. Pure steps
// on the two figures' motion states (resident-motion-state.js), as the touches are (resident-touches.js);
// resident-motion.jsx runs them and resident-touch-burst.jsx draws what floats up.
import {angleDelta, beginStand} from './resident-motion-state.js';

// Side by side this far apart, centre to centre: their heads are big, so no closer, and their arms are
// short, so the arm towards the other goes out nearly level (avatar-rig.js: forward, out) for the hands to
// meet between them. Together they walk a little slower than alone, and turn slowly, so the one on the
// outside walks round instead of being swung. How long the hands take to meet; how red they go; the little
// walk he leads her on: how many stretches, and how long each is (m).
export const HAND = {gap: .9, arm: [-.12, .62], reach: .3, speed: 1.05, turn: 2.2, join: .9, blush: .45, legs: 2, leg: [1.3, 2.3]};

// The arm towards the other, for someone whose partner is along their own +x (`toward` > 0) or -x: out towards
// them, and a little longer than it is (their arms are short), so the two hands meet.
export const handArms = toward => (toward > 0 ? [0, 0, HAND.arm[0], HAND.arm[1]] : [HAND.arm[0], -HAND.arm[1], 0, 0]);
export const handReach = toward => (toward > 0 ? [0, HAND.reach] : [HAND.reach, 0]);

const across = yaw => [Math.cos(yaw), -Math.sin(yaw)];
const outward = (m, view) => (view ? Math.atan2(-view[0], -view[1]) : m.yaw);
// Where a walk starts: where he stands, or in front of the seat he's getting up from.
const startOf = m => ((m.sit > .001 || m.transition) && m.seat ? m.seat.approach : [m.x, m.z]);

// Where each of them stands, from the point between them, the way they face and his side (+1: along
// their +x).
export function handSlots(c, yaw, side) {
  const a = across(yaw), h = HAND.gap / 2 * side;
  return {her: [c[0] - a[0] * h, c[1] - a[1] * h], him: [c[0] + a[0] * h, c[1] + a[1] * h]};
}

// Room for the two of them walking as one point between them: the furniture grown and the walls brought in
// by `grow` (half the gap: room to turn round on the spot; resident-navigation.js keeps a body's width clear on
// top of that).
export function pairRoom(obstacles, bounds, grow = HAND.gap / 2) {
  return {obstacles: obstacles.map(o => ({...o, w: o.w + 2 * grow, d: o.d + 2 * grow})), bounds: [bounds[0] + grow, bounds[1] - grow, bounds[2] + grow, bounds[3] - grow]};
}

// Planning for the two of them side by side in a room (`obstacles`, `bounds` and `nav`: findPath, freePoint,
// nearestFree and clearSegment, as resident-navigation.js has them). They walk as the point between them; a
// way only counts if, walked the way they walk (turning slowly and all), each of them keeps clear of the
// furniture, so in a tight room they can still go where there's room for two, just not turn round anywhere.
export function pairPlanner(obstacles, bounds, nav) {
  const one = p => nav.freePoint(p, obstacles, bounds);
  const fits = (c, yaw, side) => {
    const {her, him} = handSlots(c, yaw, side);
    return one(her) && one(him);
  };
  // Roomiest first, then less: a way kept wide of everything looks easier, when there is one.
  const rooms = [HAND.gap / 2, .3, .18].map(g => pairRoom(obstacles, bounds, g)), tight = rooms[rooms.length - 1];
  const free = p => nav.freePoint(p, tight.obstacles, tight.bounds), roomy = p => nav.freePoint(p, rooms[0].obstacles, rooms[0].bounds);
  function walkable(c, yaw, side, way) {
    const h = {c: [...c], yaw, path: way.map(p => [...p])};
    let still = 0;
    for (let i = 0; i < 4000 && h.path.length; i++) {
      const moved = walkPair(h, .05, fits);
      if (!fits(h.c, h.yaw, side)) return false;
      // Stuck (no way to turn or go on): not a way.
      still = moved > 1e-4 ? 0 : still + 1;
      if (still > 20) return false;
    }
    return !h.path.length;
  }
  return {
    one, fits, free, roomy,
    // From `from`, facing `yaw`, he on `side`, to `to`: straight there only (`line`, quick to work out), or round
    // the furniture. Null when the two of them can't get there side by side.
    route(from, to, yaw, side, {line = false} = {}) {
      for (const room of rooms) {
        if (!nav.freePoint(to, room.obstacles, room.bounds)) continue;
        const start = nav.freePoint(from, room.obstacles, room.bounds) ? from : null;
        const way = line ? (start && nav.clearSegment(start, to, room.obstacles, room.bounds) ? [to] : null) : nav.findPath(start || nav.nearestFree(from, room.obstacles, room.bounds) || from, to, room.obstacles, room.bounds);
        if (way && walkable(from, yaw, side, way)) return way;
      }
      return null;
    },
    // The nearest point to `p`, a little way at most, where the two of them fit side by side facing `yaw`;
    // with `room`, also one they can set off from ('go') or even turn round on the spot at ('turn').
    near(p, yaw, side, reach = .6, {room = null} = {}) {
      const ok = q => fits(q, yaw, side) && (!room || (room === 'turn' ? roomy(q) : free(q)));
      if (ok(p)) return p;
      for (let r = .1; r <= reach + 1e-9; r += .1) {
        for (let k = 0; k < 12; k++) {
          const a = k / 12 * Math.PI * 2, q = [p[0] + Math.sin(a) * r, p[1] + Math.cos(a) * r];
          if (ok(q)) return q;
        }
      }
      return null;
    }
  };
}

// Where he could stand to take her hand, best first: beside her (or beside the front of the seat she's on)
// as the camera sees it, so they end up side by side across the picture; the side nearer him first.
export function handSpots(giver, taker, view = null) {
  const at = taker.sit > .5 && taker.seat ? taker.seat.approach : [taker.x, taker.z];
  const a = view ? [-view[1], view[0]] : across(taker.yaw), far = p => Math.hypot(p[0] - giver.x, p[1] - giver.z);
  return [1, -1].map(s => [at[0] + a[0] * s * HAND.gap, at[1] + a[1] * s * HAND.gap]).sort((p, q) => far(p) - far(q));
}

// `lead`: once their hands meet he leads her a little way; otherwise they just stand hand in hand.
export function newHand({lead = true} = {}) {
  return {phase: 'go', t: 0, all: 0, tries: 0, lead, c: null, yaw: 0, side: 1, path: [], walked: 0, moving: false, cramped: false, burst: null};
}

// Their hands are together (meeting, walking, or standing so).
export const handHeld = h => !!h && (h.phase === 'join' || h.phase === 'together' || h.phase === 'hold');

// However it ends, both let go: arms down, the blush left to fade, no more walking in step.
export function endHand(h, giver, taker) {
  if (!h || h.phase === 'done') return false;
  for (const m of [giver, taker]) Object.assign(m, {armsTo: null, reachTo: null, blushTo: 0, inStep: false});
  Object.assign(h, {phase: 'done', path: [], moving: false});
  return false;
}

// She walks somewhere while they hold hands: the two of them go there together. False when they can't get
// there side by side (then she lets go and goes by herself).
export function handTo(h, to, pair) {
  if (!handHeld(h) || h.cramped) return false;
  // There, or a little way off where the two of them have room to stand.
  let way = pair.free(to) ? pair.route(h.c, to, h.yaw, h.side) : null;
  if (!way) {
    const end = pair.near(to, h.yaw, h.side, .5);
    way = end && pair.route(h.c, end, h.yaw, h.side);
  }
  if (!way) return false;
  h.path = way;
  if (h.phase !== 'join') Object.assign(h, {phase: 'together', t: 0});
  return true;
}

// Standing hand in hand a while, he leads her a little way again. False when there's nowhere to go.
export function strollAgain(h, pair, random = Math.random) {
  if (h?.phase !== 'hold' || h.cramped) return false;
  h.path = strollPath(h, pair, random);
  return h.path.length > 0;
}

// The little walk he leads her on: a stretch out into the room, then one round towards where they started,
// so it's a little round rather than there and back.
// Each stretch goes straight (quick to work out): every way round from a random start, then shorter ones, as
// a tight room needs.
function strollPath(h, pair, random) {
  const start = h.c, path = [];
  let at = start, yaw = h.yaw;
  for (let leg = 0; leg < HAND.legs; leg++) {
    const first = random() * Math.PI * 2;
    let way = null;
    for (const scale of [1, .7, .45]) {
      for (let i = 0; i < 12 && !way; i++) {
        const a = first + i / 12 * Math.PI * 2, d = (HAND.leg[0] + random() * (HAND.leg[1] - HAND.leg[0])) * (leg ? .45 : 1) * scale;
        const from = leg ? start : at, to = [from[0] + Math.sin(a) * d, from[1] + Math.cos(a) * d];
        if (leg && Math.hypot(to[0] - at[0], to[1] - at[1]) < HAND.leg[0] * .8 * scale) continue;
        if (!pair.free(to)) continue;
        way = pair.route(at, to, yaw, h.side, {line: true});
      }
      if (way) break;
    }
    if (!way) break;
    path.push(...way);
    const end = way[way.length - 1];
    yaw = Math.atan2(end[0] - at[0], end[1] - at[1]);
    at = end;
  }
  return path;
}

// Turning `dyaw` about the point between them (k = 0), about her (-1) or about him (1): where the point between
// them ends up.
function pivot(c, yaw, side, k, dyaw) {
  if (!k) return c;
  const r = HAND.gap / 2 * side * k, a = across(yaw), b = across(yaw + dyaw), at = [c[0] + a[0] * r, c[1] + a[1] * r];
  return [at[0] - b[0] * r, at[1] - b[1] * r];
}

// Moves the point between them along h.path, turning slowly; returns about how far each of them moved. With
// `fits` (where the two of them have room), a turn that would sweep one of them into something turns about the
// other instead (one turns on the spot, the other walks round), and failing that waits.
function walkPair(h, dt, fits = null) {
  let goal = h.path[0], dx = goal[0] - h.c[0], dz = goal[1] - h.c[1], dist = Math.hypot(dx, dz);
  const turn = dist > 1e-4 ? angleDelta(h.yaw, Math.atan2(dx, dz)) : 0;
  let dyaw = Math.sign(turn) * Math.min(Math.abs(turn), dt * HAND.turn), swing = 0;
  if (dyaw) {
    const k = [0, -1, 1].find(k => !fits || fits(pivot(h.c, h.yaw, h.side, k, dyaw), h.yaw + dyaw, h.side));
    if (k === undefined) {
      // No room to turn here: a little sideways step towards where they're going first, as people do.
      const step = Math.min(dist, .35 * dt), c = [h.c[0] + dx / dist * step, h.c[1] + dz / dist * step];
      if (fits(c, h.yaw, h.side)) {
        h.c = c;
        if (dist <= step + .006) h.path.shift();
        return step;
      }
      return 0;
    } else {
      const c = pivot(h.c, h.yaw, h.side, k, dyaw);
      swing = Math.hypot(c[0] - h.c[0], c[1] - h.c[1]);
      h.c = c;
      dx = goal[0] - h.c[0];
      dz = goal[1] - h.c[1];
      dist = Math.hypot(dx, dz);
    }
  }
  h.yaw += dyaw;
  let remaining = dist;
  for (let i = 1; i < h.path.length; i++) remaining += Math.hypot(h.path[i][0] - h.path[i - 1][0], h.path[i][1] - h.path[i - 1][1]);
  const speed = Math.min(HAND.speed, Math.max(.2, remaining * 3)) * Math.max(0, Math.cos(turn - dyaw));
  let step = Math.min(dist, speed * dt);
  if (dist > 1e-5) {
    const c = [h.c[0] + dx / dist * step, h.c[1] + dz / dist * step];
    if (!fits || fits(c, h.yaw, h.side)) h.c = c;
    else step = 0;
  }
  if (dist <= step + .006) {
    h.c = [goal[0], goal[1]];
    h.path.shift();
  }
  return step + Math.max(swing, Math.abs(dyaw) * HAND.gap / 2);
}

// Puts each of them in their place beside the other, both facing the way they go, stepping in time: their
// legs opposite, so the two joined arms swing together.
function placePair(h, giver, taker, moved) {
  const {her, him} = handSlots(h.c, h.yaw, h.side);
  Object.assign(taker, {x: her[0], z: her[1], yaw: h.yaw});
  Object.assign(giver, {x: him[0], z: him[1], yaw: h.yaw});
  h.walked += moved;
  taker.phase = h.walked * 16;
  giver.phase = taker.phase + Math.PI;
  h.moving = moved > 1e-5;
  taker.inStep = giver.inStep = h.moving;
}

// Face to face no more: both looking out, side by side. He's on the side he came to; their hands meet.
// Where the point between them has no room for the two of them, the nearest that does (a little way at
// most); failing that they hold hands where they stand and stay put (cramped).
function join(h, giver, taker, out, pair) {
  const a = across(out), side = (giver.x - taker.x) * a[0] + (giver.z - taker.z) * a[1] >= 0 ? 1 : -1;
  let c = [(giver.x + taker.x) / 2, (giver.z + taker.z) / 2];
  // Where they've room to turn round if there's such a place near, else somewhere they can set off from, else
  // just somewhere they fit.
  const near = pair.near(c, out, side, .7, {room: 'turn'}) || pair.near(c, out, side, .6, {room: 'go'}) || pair.near(c, out, side);
  if (near) c = near;
  else h.cramped = true;
  Object.assign(h, {phase: 'join', t: 0, c, yaw: out, side, from: {her: [taker.x, taker.z], him: [giver.x, giver.z]}});
  taker.armsTo = handArms(side);
  giver.armsTo = handArms(-side);
  taker.reachTo = handReach(side);
  giver.reachTo = handReach(-side);
  taker.blushTo = giver.blushTo = HAND.blush;
  h.burst = {kind: 'hand', x: c[0], z: c[1]};
}

// One frame. `route(from, to)` plans his walk to her (null when there's no way); `place(to)` moves a spot
// clear of furniture for one; `pair` plans for the two of them side by side (pairPlanner); `view` is the
// camera's way along the floor, when known.
// Returns false once it's over.
export function stepHand(h, dt, {giver, taker, route, place = to => to, pair, view = null, random = Math.random}) {
  h.t += dt;
  h.all += dt;
  const held = handHeld(h);
  // Getting to her took far too long (a figure never loaded): give up quietly.
  if (!held && h.all > 25 && h.phase !== 'done') return endHand(h, giver, taker);
  // Either of them sent off on their own (somewhere to walk, to sit) once they were together: they let go.
  if ((held || h.phase === 'face') && [giver, taker].some(m => m.route.length || m.transition || m.pending)) return endHand(h, giver, taker);
  switch (h.phase) {
    case 'go': {
      // The first spot beside her with room once moved clear of furniture and that can be walked to;
      // failing that, the roomiest one.
      const seated = taker.sit > .5 && !!taker.seat, from = startOf(giver), at = seated ? taker.seat.approach : [taker.x, taker.z];
      let best = null;
      for (const spot of handSpots(giver, taker, view)) {
        const to = place(spot), room = Math.hypot(to[0] - at[0], to[1] - at[1]);
        const path = Math.hypot(from[0] - to[0], from[1] - to[1]) < .05 ? [] : route(from, to);
        if (!path) continue;
        if (room >= HAND.gap - .15) {
          best = {path, room};
          break;
        }
        if (!best || room > best.room) best = {path, room};
      }
      // No way to her, or no room beside her: let it be.
      if (!best || best.room < .6) return endHand(h, giver, taker);
      if (giver.sit > .001 || giver.transition) {
        giver.pending = best.path;
        giver.pendingSeat = null;
        beginStand(giver);
      } else Object.assign(giver, {route: best.path, seat: null, pending: null, pendingSeat: null});
      Object.assign(h, {phase: 'walk', t: 0});
      return true;
    }
    case 'walk':
      if (giver.route.length || giver.transition || giver.pending) return true;
      // She moved meanwhile: go after her, but not forever.
      if (!(taker.sit > .5) && Math.hypot(giver.x - taker.x, giver.z - taker.z) > HAND.gap + .4 && h.tries < 2) {
        h.tries++;
        h.phase = 'go';
        return true;
      }
      // Sitting, she gets up to take his hand.
      if (taker.sit > .5 && taker.seat) {
        beginStand(taker);
        Object.assign(h, {phase: 'up', t: 0});
        return true;
      }
      Object.assign(h, {phase: 'face', t: 0});
      return true;
    case 'up':
      if (taker.transition || taker.sit > .01) return true;
      Object.assign(h, {phase: 'face', t: 0});
      return true;
    case 'face': {
      // Both turn to look out the same way (at the camera), then their hands meet.
      const out = outward(giver, view);
      let ready = true;
      for (const [m, rate] of [[giver, 8], [taker, 6]]) {
        const d = angleDelta(m.yaw, out);
        m.yaw += d * Math.min(1, dt * rate);
        ready = ready && Math.abs(d) < .08;
      }
      if (ready || h.t > 1.6) join(h, giver, taker, out, pair);
      return true;
    }
    case 'join': {
      // Stepping into place side by side as their hands meet.
      const u = Math.min(1, h.t / HAND.join), s = u * u * (3 - 2 * u);
      if (!h.cramped) {
        const to = handSlots(h.c, h.yaw, h.side), mix = (p, q) => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s];
        const her = mix(h.from.her, to.her), him = mix(h.from.him, to.him);
        Object.assign(taker, {x: her[0], z: her[1]});
        Object.assign(giver, {x: him[0], z: him[1]});
      }
      for (const m of [giver, taker]) m.yaw += angleDelta(m.yaw, h.yaw) * Math.min(1, dt * 8);
      h.moving = true;
      if (u < 1) return true;
      // In their places exactly, then off they go: where she asked meanwhile, or the little walk he leads her on.
      if (!h.cramped) placePair(h, giver, taker, 0);
      else giver.yaw = taker.yaw = h.yaw;
      if (!h.path.length && h.lead && !h.cramped) h.path = strollPath(h, pair, random);
      Object.assign(h, {phase: h.path.length && !h.cramped ? 'together' : 'hold', t: 0, moving: false});
      return true;
    }
    case 'together': {
      const moved = walkPair(h, dt, pair.fits);
      placePair(h, giver, taker, moved);
      // Stuck a while (something moved into the way): they stop where they are.
      h.still = moved > 1e-4 ? 0 : (h.still || 0) + dt;
      if (h.still > 1) h.path = [];
      if (!h.path.length) Object.assign(h, {phase: 'hold', t: 0, still: 0});
      return true;
    }
    case 'hold': {
      if (h.path.length && !h.cramped) {
        Object.assign(h, {phase: 'together', t: 0});
        return true;
      }
      if (h.cramped) {
        h.moving = taker.inStep = giver.inStep = false;
        return true;
      }
      // Standing hand in hand, they turn (slowly) to look out at the camera.
      let moved = 0;
      if (view) {
        const d = angleDelta(h.yaw, outward(giver, view));
        const dy = Math.sign(d) * Math.min(Math.abs(d), dt * HAND.turn * .5);
        if (Math.abs(d) > .02 && pair.fits(h.c, h.yaw + dy, h.side)) {
          h.yaw += dy;
          moved = Math.abs(dy) * HAND.gap / 2;
        }
      }
      placePair(h, giver, taker, moved);
      return true;
    }
    default:
      return false;
  }
}
