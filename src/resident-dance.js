// A slow dance while the gramophone plays. He comes up to her; they stand across the picture from each other (as
// the camera sees it), turned to each other and a little out towards the camera, so both faces show (their heads
// are big). They take the hands between them, hold the other arm out, and turn slowly to and fro together,
// swaying in three; now and then he twirls her. When the music stops (or she's had enough) they let go, step back
// and bow. Pure steps on the two figures' motion states (resident-motion-state.js), as the
// touches are (resident-touches.js); resident-motion.jsx runs them and listens to the music (music.js).
import {angleDelta, beginStand} from './resident-motion-state.js';

// This far apart (their hair just clear), each turned `open` (rad) from the other out towards the camera. The arm
// towards the other reaches forward and in (avatar-rig.js: forward, in), a little longer than it is (reach), so the
// two hands meet in front between them; the other arm goes out, a little down and forward. How far they turn to and
// fro together (rad) and how long a turn there and back takes (s); how far they sway, over a bar of three (s); a
// twirl now and then, how long it takes and how long between; the bow at the end: how long, and how far apart they
// step first; how red they go.
export const DANCE = {gap: .96, open: .75, inner: [-1.29, .1], outer: [-.3, .5], reach: .45, swing: .35, round: 7.2, sway: .07, bar: 2.4, twirl: 1.6, every: 9, bow: 1.4, apart: 1.35, blush: .4};

// The arms for someone whose partner is along their own +x (`toward` > 0, the right arm reaches) or -x; and how far
// each arm stretches. Inward is -z for the right arm and +z for the left (avatar-rig.js).
export function danceArms(toward) {
  const [f, i] = DANCE.inner, [of, o] = DANCE.outer;
  return toward > 0 ? {arms: [of, -o, f, -i], reach: [0, DANCE.reach]} : {arms: [f, i, of, o], reach: [DANCE.reach, 0]};
}

const ease = u => u * u * (3 - 2 * u);
// Where a walk starts: where they stand, or in front of the seat they're getting up from.
const startOf = m => ((m.sit > .001 || m.transition) && m.seat ? m.seat.approach : [m.x, m.z]);

export function newDance() {
  return {phase: 'go', t: 0, all: 0, c: null, a: 0, a0: 0, out: 1, twirlAt: DANCE.every * .6, twirl: null, stop: false, burst: null, walked: 0};
}
export const dancing = d => !!d && (d.phase === 'dance' || d.phase === 'face');

// Asked to stop (the music stopped, or she's done): the bow, then it's over. Before they're dancing it just stops.
export function stopDance(d) {
  if (!d || d.phase === 'done' || d.phase === 'bow') return false;
  if (d.phase === 'go' || d.phase === 'walk') {
    d.phase = 'done';
    return false;
  }
  d.stop = true;
  return true;
}

// The way each of them faces, from the way from her to him (a) and which side of that line the camera is on (`out`,
// 1 or -1): turned to each other, and `open` out towards the camera.
export function danceFacing(a, out) {
  const o = DANCE.open * out;
  return {her: a - o, him: a + Math.PI + o};
}

// Where each of them is, from the point between them and the way from her to him (`gap` apart).
export function danceSpots(c, a, gap = DANCE.gap) {
  const u = [Math.sin(a), Math.cos(a)], h = gap / 2;
  return {her: [c[0] - u[0] * h, c[1] - u[1] * h], him: [c[0] + u[0] * h, c[1] + u[1] * h]};
}

// Hands between them taken, the other arms out.
function hold(d, her, him) {
  const facing = danceFacing(d.a, d.out), toward = (yaw, a) => Math.cos(yaw) * Math.sin(a) - Math.sin(yaw) * Math.cos(a);
  const h = danceArms(toward(facing.her, d.a)), m = danceArms(toward(facing.him, d.a + Math.PI));
  Object.assign(her, {armsTo: h.arms, reachTo: h.reach});
  Object.assign(him, {armsTo: m.arms, reachTo: m.reach});
}

function walkTo(m, path) {
  if (m.sit > .001 || m.transition) {
    m.pending = path;
    m.pendingSeat = null;
    beginStand(m);
  } else Object.assign(m, {route: path, seat: null, pending: null, pendingSeat: null});
}

// However it ends: arms down, upright, the blush left to fade, no more stepping in time.
export function endDance(d, her, him) {
  for (const m of [her, him]) Object.assign(m, {armsTo: null, reachTo: null, tiltTo: 0, leanTo: 0, blushTo: 0, inStep: false});
  if (d) d.phase = 'done';
  return false;
}

// One frame. `route(who, from, to)` plans a walk for 'her' or 'him' (null when there's no way); `room(p)` is the
// nearest point to p, a little way at most, with room for the two of them to turn round (null if none); `view`
// the camera's way along the floor. Returns false once it's over.
export function stepDance(d, dt, {her, him, route, room, view = null}) {
  d.t += dt;
  d.all += dt;
  if ((d.phase === 'go' || d.phase === 'walk') && d.all > 25) return endDance(d, her, him);
  // Either sent off on their own once dancing: that's the end of it.
  if ((d.phase === 'face' || d.phase === 'dance' || d.phase === 'bow') && [her, him].some(m => m.route.length || m.transition || m.pending)) return endDance(d, her, him);
  switch (d.phase) {
    case 'go': {
      // Across the picture from her, on the side he's on (or between them, with no camera).
      const at = startOf(her), from = startOf(him), to = [from[0] - at[0], from[1] - at[1]];
      let u = view ? [-view[1], view[0]] : Math.hypot(...to) > .2 ? to.map(v => v / Math.hypot(...to)) : [1, 0];
      if (u[0] * to[0] + u[1] * to[1] < 0) u = [-u[0], -u[1]];
      const a = Math.atan2(u[0], u[1]);
      // Which side of the line between them the camera is on: they open out towards it.
      const camera = view ? [-view[0], -view[1]] : [Math.sin(her.yaw), Math.cos(her.yaw)];
      d.out = Math.cos(a) * camera[0] - Math.sin(a) * camera[1] >= 0 ? -1 : 1;
      const c = room([at[0] + u[0] * DANCE.gap / 2, at[1] + u[1] * DANCE.gap / 2]);
      if (!c) {
        d.cramped = true;
        return endDance(d, her, him);
      }
      // Both ways first: if either can't get there, neither sets off (and she's told there's no room).
      const spots = danceSpots(c, a), ways = [];
      for (const [m, to, who] of [[her, spots.her, 'her'], [him, spots.him, 'him']]) {
        const start = startOf(m), path = Math.hypot(start[0] - to[0], start[1] - to[1]) < .05 ? [] : route(who, start, to);
        if (!path) {
          d.cramped = true;
          return endDance(d, her, him);
        }
        ways.push([m, path]);
      }
      for (const [m, path] of ways) if (path.length || m.sit > .001 || m.transition) walkTo(m, path);
      Object.assign(d, {phase: 'walk', t: 0, c, a, a0: a});
      return true;
    }
    case 'walk':
      if ([her, him].some(m => m.route.length || m.transition || m.pending)) return true;
      Object.assign(d, {phase: 'face', t: 0});
      return true;
    case 'face': {
      // Turn to each other (and a little out), take hands.
      const facing = danceFacing(d.a, d.out);
      let ready = true;
      for (const [m, yaw] of [[her, facing.her], [him, facing.him]]) {
        const k = angleDelta(m.yaw, yaw);
        m.yaw += k * Math.min(1, dt * 7);
        ready = ready && Math.abs(k) < .06;
      }
      if (ready || d.t > 1.5) {
        const spots = danceSpots(d.c, d.a);
        Object.assign(her, {x: spots.her[0], z: spots.her[1], yaw: facing.her});
        Object.assign(him, {x: spots.him[0], z: spots.him[1], yaw: facing.him});
        hold(d, her, him);
        for (const m of [her, him]) Object.assign(m, {blushTo: DANCE.blush, inStep: true});
        d.burst = {kind: 'dance', x: d.c[0], z: d.c[1]};
        Object.assign(d, {phase: 'dance', t: 0});
      }
      return true;
    }
    case 'dance': {
      if (d.stop) {
        for (const m of [her, him]) Object.assign(m, {armsTo: null, reachTo: null, tiltTo: 0, inStep: false});
        Object.assign(d, {phase: 'bow', t: 0, twirl: null});
        her.yaw = danceFacing(d.a, d.out).her;
        return true;
      }
      // To and fro they turn, together, about the point between them.
      const was = d.a;
      d.a = d.a0 + DANCE.swing * Math.sin(d.t / DANCE.round * Math.PI * 2);
      const spots = danceSpots(d.c, d.a), sway = DANCE.sway * Math.sin(d.t / DANCE.bar * Math.PI * 2), facing = danceFacing(d.a, d.out);
      Object.assign(her, {x: spots.her[0], z: spots.her[1], tiltTo: sway});
      Object.assign(him, {x: spots.him[0], z: spots.him[1], tiltTo: -sway, yaw: facing.him});
      d.walked += Math.abs(d.a - was) * DANCE.gap / 2 + dt * .12;
      her.phase = d.walked * 16;
      him.phase = her.phase + Math.PI;
      her.inStep = him.inStep = true;
      // Now and then he twirls her: she lets go and spins round once on the spot.
      if (!d.twirl && d.t >= d.twirlAt) {
        d.twirl = {t: 0};
        Object.assign(her, {armsTo: null, reachTo: null});
      }
      let spin = 0;
      if (d.twirl) {
        d.twirl.t += dt;
        const u = Math.min(1, d.twirl.t / DANCE.twirl);
        spin = ease(u) * Math.PI * 2;
        if (u >= 1) {
          d.twirl = null;
          d.twirlAt = d.t + DANCE.every;
          spin = 0;
          hold(d, her, him);
        }
      }
      her.yaw = facing.her + spin;
      return true;
    }
    case 'bow': {
      // A step back from each other, a little bow, and up again.
      const u = Math.min(1, d.t / DANCE.bow), back = ease(Math.min(1, u / .4)), spots = danceSpots(d.c, d.a, DANCE.gap + (DANCE.apart - DANCE.gap) * back);
      Object.assign(her, {x: spots.her[0], z: spots.her[1]});
      Object.assign(him, {x: spots.him[0], z: spots.him[1]});
      her.phase = him.phase = back * 3;
      her.leanTo = him.leanTo = u > .4 ? Math.sin((u - .4) / .6 * Math.PI) * .3 : 0;
      if (u >= 1) return endDance(d, her, him);
      return true;
    }
    default:
      return false;
  }
}
