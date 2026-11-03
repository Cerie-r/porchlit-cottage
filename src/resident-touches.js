// The two residents' little touches, any day (not only when he's found): a kiss stolen on the cheek,
// a pat on the head, a pinch of the cheek, a hug from behind. Pure steps on two figures' motion states
// (resident-motion-state.js), as hide-and-seek-reunion.js has the kiss when he's found;
// resident-motion.jsx runs them and resident-touch-burst.jsx draws what floats up.
import {angleDelta, beginStand} from './resident-motion-state.js';

// For each: how far apart their feet are (their heads are big: for the kiss his face is at her cheek;
// for the others their heads stay clear of each other, side by side as the camera sees them),
// how long it lasts (s), how far the one touching leans in (standing; when she sits), how red the one
// touched goes, how long they stay together afterwards (s), and for the pat, how many pats.
// Their arms are too short to reach a head: the pat is a little hand drawn over hers.
export const TOUCHES = {
  kiss: {gap: .72, hold: .9, lean: .24, seated: .3, blush: .9, after: 1},
  pat: {gap: 1, hold: 1.8, lean: .1, seated: .16, blush: .6, after: .4, beats: 3},
  pinch: {gap: .95, hold: 1.2, lean: .14, seated: .2, blush: 1, after: .5, beats: 2},
  // A hug from behind: close behind and a little to one side, near enough as it is.
  hug: {gap: .39, near: .3, hold: 2.4, lean: .08, seated: 0, blush: .8, after: .6}
};

// The hug: the one hugging stands this far behind and this far to one side, both looking out towards the
// camera; their heads are big, so the one behind peeks out past the other's (tilts out), and the one held
// tilts a little the other way. Arms round the waist.
export const HUG = {behind: .25, side: .3, peek: .38, lean: .15, arms: [-.75, .5, -.75, -.5]};

// How the one touching holds their arms (avatar-rig.js: left forward, left out, right forward, right
// out): hands behind the back to steal a kiss; for the pat and the pinch, the arm nearer the camera
// reaches out.
const REACH = {pat: [-1.9, .15], pinch: [-1.3, .2]};
function armsFor(kind, m, view) {
  if (kind === 'kiss') return [.45, .15, .45, -.15];
  const [forward, inward] = REACH[kind];
  // The left shoulder is at -x in the figure's frame: nearer the camera when that side faces it.
  const left = view ? -Math.cos(m.yaw) * view[0] + Math.sin(m.yaw) * view[1] < 0 : true;
  return left ? [forward, inward, 0, 0] : [0, 0, forward, -inward];
}

// `together`: one of them is already on the other's lap, so it happens right there, no walking (and
// no hug: he's holding her already).
export function newTouch(kind, {together = false} = {}) {
  const k = TOUCHES[kind] && !(together && kind === 'hug') ? kind : 'kiss';
  return {kind: k, stolen: k === 'kiss', together, phase: 'go', t: 0, all: 0, tries: 0, beats: 0, burst: null, saved: null};
}

const standing = m => !m.route.length && !m.transition && m.sit < .01;
const busy = m => m.route.length > 0 || !!m.transition;
// Where a walk starts: where they stand, or in front of the seat they're getting up from.
const startOf = m => ((m.sit > .001 || m.transition) && m.seat ? m.seat.approach : [m.x, m.z]);

// Where the one touching could stand, best first. In front of her seat when she sits. Otherwise beside
// her as the camera sees it (`view`: the way it looks, along the floor), so it shows in profile, the side
// nearer him first; with no camera, a kiss is stolen from beside her as she faces. Last, just on his side
// of her.
export function touchSpots(kind, giver, taker, view = null) {
  const far = ([x, z]) => Math.hypot(x - giver.x, z - giver.z);
  // A hug: behind her as she'll face (out towards the camera), to one side, the side nearer him first.
  // Not while she sits.
  if (kind === 'hug') {
    if (taker.sit > .5) return [];
    const out = outward(taker, view), across = [out[1], -out[0]];
    const at = side => [taker.x - out[0] * HUG.behind + across[0] * side * HUG.side, taker.z - out[1] * HUG.behind + across[1] * side * HUG.side];
    return [at(1), at(-1)].sort((a, b) => far(a) - far(b));
  }
  if (taker.sit > .5 && taker.seat) return [taker.seat.approach];
  const gap = (TOUCHES[kind] || TOUCHES.kiss).gap, at = ([x, z]) => [taker.x + x * gap, taker.z + z * gap];
  let dx = giver.x - taker.x, dz = giver.z - taker.z, d = Math.hypot(dx, dz);
  if (d < 1e-3) {
    dx = Math.sin(taker.yaw);
    dz = Math.cos(taker.yaw);
    d = 1;
  }
  const his = at([dx / d, dz / d]);
  const across = view ? [-view[1], view[0]] : kind === 'kiss' ? [Math.cos(taker.yaw), -Math.sin(taker.yaw)] : null;
  if (!across) return [his];
  const sides = [at(across), at([-across[0], -across[1]])].sort((a, b) => far(a) - far(b));
  return [...sides, his];
}

// The way she turns to him: towards him, and `turn` of the way back towards the camera, so her face
// shows (for a pat she mostly looks out; to be pinched she looks at him more).
const TURNS = {kiss: .55, pat: .85, pinch: .7};
function offer(taker, giver, view, turn = .55) {
  const toward = Math.atan2(giver.x - taker.x, giver.z - taker.z);
  const facing = a => (view ? -(Math.sin(a) * view[0] + Math.cos(a) * view[1]) : 0);
  return toward + (facing(toward - turn) > facing(toward + turn) ? -turn : turn);
}

// The way out towards the camera along the floor (or the way she faces, with no camera).
function outward(m, view) {
  return view ? [-view[0], -view[1]] : [Math.sin(m.yaw), Math.cos(m.yaw)];
}

// Waiting for a kiss she doesn't know is coming: she looks out towards the camera, a little away from
// him, so her cheek is his and her face shows.
function unaware(taker, giver, view) {
  const out = Math.atan2(-view[0], -view[1]), toward = Math.atan2(giver.x - taker.x, giver.z - taker.z);
  return out - Math.sign(angleDelta(out, toward) || 1) * .35;
}

// However it ends, nobody is left leaning, reaching or squashed; the blush fades by itself. Also for
// ending one early (she was asked to do something else).
export function endTouch(t, giver, taker) {
  if (t.phase === 'done') return false;
  return settle(t, giver, taker);
}
function settle(t, giver, taker) {
  const s = t.saved;
  giver.leanTo = s ? s.giver.leanTo : 0;
  taker.leanTo = s ? s.taker.leanTo : 0;
  giver.armsTo = s ? s.giver.armsTo : null;
  if (!t.together) giver.tiltTo = taker.tiltTo = 0;
  taker.squash = 0;
  giver.blushTo = 0;
  taker.blushTo = 0;
  t.phase = 'done';
  return false;
}

function begin(t, giver, taker, view) {
  const spec = TOUCHES[t.kind];
  t.phase = 'act';
  t.t = 0;
  if (t.together) {
    // On his lap: he leans forward to her, or she leans back to him; their arms stay as they hold each other.
    t.saved = {giver: {leanTo: giver.leanTo || 0, armsTo: giver.armsTo}, taker: {leanTo: taker.leanTo || 0}};
    giver.leanTo = t.saved.giver.leanTo + (giver.seat?.lap ? -.14 : .16);
  } else if (t.kind === 'hug') {
    // Which side of her he's on, as they both look out: he peeks out that side, she leans the other way.
    const out = [Math.sin(t.out), Math.cos(t.out)], side = (giver.x - taker.x) * out[1] - (giver.z - taker.z) * out[0] >= 0 ? 1 : -1;
    Object.assign(giver, {armsTo: HUG.arms, leanTo: spec.lean, tiltTo: -HUG.peek * side});
    Object.assign(taker, {leanTo: -.05, tiltTo: HUG.lean * side});
  } else {
    giver.leanTo = taker.sit > .5 ? spec.seated : t.close ? spec.lean * .5 : spec.lean;
    giver.armsTo = armsFor(t.kind, giver, view);
  }
  taker.blushTo = spec.blush;
  if (t.kind === 'kiss' || t.kind === 'hug') giver.blushTo = .4;
  // Where it shows: between their faces for the kiss and the hug; on her head for the pat, her cheek for
  // the pinch, a little towards him.
  const dx = giver.x - taker.x, dz = giver.z - taker.z, d = Math.hypot(dx, dz) || 1, toward = {kiss: d / 2, hug: d / 2, pat: .12, pinch: .22}[t.kind];
  t.burst = {kind: t.kind, x: taker.x + dx / d * toward, z: taker.z + dz / d * toward};
}

// One frame. `route(from, to)` plans a walk (null when there's no way); `place(to)` moves a spot clear
// of furniture; `view` is the camera's way along the floor, when known. Returns false once it's over.
export function stepTouch(t, dt, {giver, taker, route, place = to => to, view = null}) {
  t.t += dt;
  t.all += dt;
  const spec = TOUCHES[t.kind];
  // Something kept them from it (a figure never loaded): give up quietly.
  if (t.all > 25 && t.phase !== 'done') return settle(t, giver, taker);
  // Either walked off once they were together: no more of it.
  if ((t.phase === 'face' || t.phase === 'act' || t.phase === 'after') && (busy(taker) || busy(giver))) return settle(t, giver, taker);
  switch (t.phase) {
    case 'go': {
      if (t.together) {
        begin(t, giver, taker, view);
        return true;
      }
      // The first spot that's still far enough from her once moved clear of furniture and that can be
      // walked to; failing that, the roomiest one.
      const seated = taker.sit > .5, from = startOf(giver), near = spec.near ?? spec.gap - .12;
      if (t.kind === 'hug') {
        const out = outward(taker, view);
        t.out = Math.atan2(out[0], out[1]);
      }
      let best = null;
      for (const spot of touchSpots(t.kind, giver, taker, view)) {
        const to = place(spot), room = Math.hypot(to[0] - taker.x, to[1] - taker.z);
        const path = Math.hypot(from[0] - to[0], from[1] - to[1]) < .05 ? [] : route(from, to);
        if (!path) continue;
        if (seated || room >= near) {
          best = {path, room};
          break;
        }
        if (!best || room > best.room) best = {path, room};
      }
      // No way to her, or no room: let it be.
      if (!best || (!seated && best.room < Math.min(.55, near))) return settle(t, giver, taker);
      t.close = !seated && best.room < near;
      if (giver.sit > .001 || giver.transition) {
        giver.pending = best.path;
        giver.pendingSeat = null;
        beginStand(giver);
      } else Object.assign(giver, {route: best.path, seat: null, pending: null, pendingSeat: null});
      t.phase = 'walk';
      t.t = 0;
      return true;
    }
    case 'walk':
      if (giver.route.length || giver.transition || giver.pending) return true;
      // She moved meanwhile: go after her, but not forever.
      if (taker.sit < .5 && Math.hypot(giver.x - taker.x, giver.z - taker.z) > spec.gap + .4 && t.tries < 2) {
        t.tries++;
        t.phase = 'go';
        return true;
      }
      t.phase = 'face';
      t.t = 0;
      return true;
    case 'face': {
      // A hug: both turn to look out.
      if (t.kind === 'hug') {
        const his = angleDelta(giver.yaw, t.out);
        giver.yaw += his * Math.min(1, dt * 8);
        let ready = Math.abs(his) < .06;
        if (standing(taker)) {
          const hers = angleDelta(taker.yaw, t.out);
          taker.yaw += hers * Math.min(1, dt * 6);
          ready = ready && Math.abs(hers) < .08;
        }
        if (ready || t.t > 1.6) begin(t, giver, taker, view);
        return true;
      }
      const toTaker = angleDelta(giver.yaw, Math.atan2(taker.x - giver.x, taker.z - giver.z));
      giver.yaw += toTaker * Math.min(1, dt * 8);
      // A kiss is stolen: she doesn't see it coming, looking away. For the others she turns to him.
      let ready = true;
      if (standing(taker) && (!t.stolen || view)) {
        const turn = angleDelta(taker.yaw, t.stolen ? unaware(taker, giver, view) : offer(taker, giver, view, TURNS[t.kind]));
        taker.yaw += turn * Math.min(1, dt * (t.stolen ? 4 : 6));
        ready = Math.abs(turn) < .08;
      }
      if ((Math.abs(toTaker) < .06 && ready) || t.t > 1.6) begin(t, giver, taker, view);
      return true;
    }
    case 'act': {
      // The pats press her down a little, one after another; the pinch squishes her twice, early on.
      if (spec.beats) {
        const span = t.kind === 'pat' ? spec.hold : spec.hold / 2, u = Math.min(1, t.t / span) * spec.beats, k = Math.floor(u);
        taker.squash = k < spec.beats ? (t.kind === 'pat' ? .05 : .07) * Math.sin((u - k) * Math.PI) : 0;
        t.beats = Math.max(t.beats, Math.min(spec.beats, k + 1));
      }
      if (t.t >= spec.hold) {
        taker.squash = 0;
        giver.leanTo = t.saved ? t.saved.giver.leanTo : 0;
        giver.armsTo = t.saved ? t.saved.giver.armsTo : null;
        if (t.kind === 'hug') {
          Object.assign(taker, {leanTo: 0, tiltTo: 0});
          giver.tiltTo = 0;
        }
        t.phase = 'after';
        t.t = 0;
      }
      return true;
    }
    case 'after':
      // Kissed before she knew it, or let go after a hug: now she turns to him.
      if ((t.stolen || t.kind === 'hug') && !t.together && standing(taker)) {
        const turn = angleDelta(taker.yaw, offer(taker, giver, view));
        taker.yaw += turn * Math.min(1, dt * 7);
      }
      if (t.t >= spec.after) return settle(t, giver, taker);
      return true;
    default:
      return false;
  }
}

// What the one touching may do when she asks for a fuss (撒个娇): any of them, or take her hand and lead her a
// little way (resident-hand.js); not the same twice running, and no hug or hand while she sits.
export function fussFor(last, random = Math.random, {seated = false} = {}) {
  const kinds = ['pat', 'pinch', 'kiss', 'hug', 'hand'].filter(k => k !== last && !(seated && (k === 'hug' || k === 'hand')));
  return kinds[Math.min(kinds.length - 1, Math.floor(random() * kinds.length))];
}
