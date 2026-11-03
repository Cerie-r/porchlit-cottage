// What happens once he's found: he comes out (stands up from behind the
// furniture, or pops out of the wardrobe or from under the quilt), walks up
// to her, they turn to each other, and he kisses her: on the cheek after a
// quick find, longer after a long one. Pure steps on the two figures' motion
// states (resident-motion-state.js); the scene calls stepReunion each frame.
import {angleDelta} from './resident-motion-state.js';

// How far apart their feet are for the kiss. Their heads are big, so the
// heads just touch: his face at her cheek, or both leaning in for the long one.
export const KISS_GAPS = {cheek: .72, long: .8};
const holds = {cheek: .9, long: 2.4};

export function newReunion({crouched, kiss}) {
  return {phase: crouched ? 'rise' : 'appear', t: 0, all: 0, kiss: kiss === 'long' ? 'long' : 'cheek', tries: 0, burst: null};
}

// However it ends, nobody is left crouching, leaning or half popped in.
function settle(r, partner, player) {
  partner.leanTo = 0;
  player.leanTo = 0;
  partner.crouchTo = 0;
  partner.pop = 1;
  r.phase = 'done';
  return false;
}

const standing = m => !m.route.length && !m.transition && m.sit < .01;
const busy = m => m.route.length > 0 || !!m.transition;

// Where he could stand to kiss her, best first: in front of her seat when
// she sits. Otherwise beside her as the camera sees it (`view` is the way it
// looks, along the floor), so the kiss shows in profile instead of one head
// hiding the other: the side nearer him, then the other side, then just on
// his side of her.
export function kissSpots(partner, player, kiss = 'cheek', view = null) {
  if (player.sit > .5 && player.seat) return [player.seat.approach];
  const gap = KISS_GAPS[kiss] || KISS_GAPS.cheek, at = ([x, z]) => [player.x + x * gap, player.z + z * gap];
  let dx = partner.x - player.x, dz = partner.z - player.z, d = Math.hypot(dx, dz);
  if (d < 1e-3) {
    dx = Math.sin(player.yaw);
    dz = Math.cos(player.yaw);
    d = 1;
  }
  const his = at([dx / d, dz / d]);
  if (!view) return [his];
  const far = ([x, z]) => Math.hypot(x - partner.x, z - partner.z);
  const sides = [at([-view[1], view[0]]), at([view[1], -view[0]])].sort((a, b) => far(a) - far(b));
  return [...sides, his];
}
export const kissSpot = (...args) => kissSpots(...args)[0];

// One frame. `route(from, to)` plans a walk (null when there's no way);
// `place(to)` moves a spot clear of furniture; `view` is the camera's way
// along the floor, when known. Returns false once it's over.
export function stepReunion(r, dt, {partner, player, route, place = to => to, view = null}) {
  r.t += dt;
  r.all = (r.all || 0) + dt;
  // Something kept him from moving (his figure never loaded): give up quietly.
  if (r.all > 25 && r.phase !== 'done') return settle(r, partner, player);
  // She walked off: no kiss, let them be.
  if ((r.phase === 'face' || r.phase === 'kiss') && busy(player)) {
    partner.leanTo = 0;
    player.leanTo = 0;
    r.phase = 'done';
  }
  switch (r.phase) {
    case 'appear': {
      const u = Math.min(1, r.t / .4);
      // A little pop, overshooting a touch.
      partner.pop = 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2;
      if (u === 1) {
        partner.pop = 1;
        r.phase = 'go';
      }
      return true;
    }
    case 'rise':
      partner.crouchTo = 0;
      if (r.t > 2.5) partner.crouch = 0;
      if (partner.crouch < .05) r.phase = 'go';
      return true;
    case 'go': {
      // The first spot that's still far enough from her once moved clear of
      // furniture (too close and their big heads would run into each other)
      // and that he can walk to. Failing that, the roomiest one he can reach.
      const seated = player.sit > .5, gap = seated ? 0 : KISS_GAPS[r.kiss] - .12, from = [partner.x, partner.z];
      let best = null;
      for (const spot of kissSpots(partner, player, r.kiss, view)) {
        const to = place(spot), room = Math.hypot(to[0] - player.x, to[1] - player.z);
        const here = Math.hypot(from[0] - to[0], from[1] - to[1]) < .05;
        const path = here ? [] : route(from, to);
        if (!path) continue;
        if (room >= gap) {
          best = {path, room};
          break;
        }
        if (!best || room > best.room) best = {path, room};
      }
      // No way to her, or no room to kiss: he stays where he is.
      if (!best || (!seated && best.room < .55)) return settle(r, partner, player);
      r.close = !seated && best.room < KISS_GAPS[r.kiss] - .12;
      partner.route = best.path;
      r.phase = 'walk';
      r.t = 0;
      return true;
    }
    case 'walk':
      if (partner.route.length) return true;
      // She moved while he walked: follow her, but not forever.
      if (Math.hypot(partner.x - player.x, partner.z - player.z) > KISS_GAPS[r.kiss] + .4 && player.sit < .5 && r.tries < 2) {
        r.tries++;
        r.phase = 'go';
        return true;
      }
      r.phase = 'face';
      r.t = 0;
      return true;
    case 'face': {
      const toHer = angleDelta(partner.yaw, Math.atan2(player.x - partner.x, player.z - partner.z));
      partner.yaw += toHer * Math.min(1, dt * 8);
      let hersDone = true;
      if (standing(player)) {
        // For a kiss on the cheek she turns most of the way, not all, and
        // the rest of the way towards the camera.
        const toward = Math.atan2(partner.x - player.x, partner.z - player.z);
        let turn = 0;
        if (r.kiss === 'cheek') {
          const facing = a => (view ? -(Math.sin(a) * view[0] + Math.cos(a) * view[1]) : 0);
          turn = facing(toward - .55) > facing(toward + .55) ? -.55 : .55;
        }
        const want = toward + turn;
        const toHim = angleDelta(player.yaw, want);
        player.yaw += toHim * Math.min(1, dt * 6);
        hersDone = Math.abs(toHim) < .08;
      }
      if ((Math.abs(toHer) < .06 && hersDone) || r.t > 1.6) {
        r.phase = 'kiss';
        r.t = 0;
        // Closer than planned (a tight corner): a smaller lean, just a peck.
        partner.leanTo = player.sit > .5 ? .3 : r.close ? .12 : r.kiss === 'long' ? .28 : .24;
        if (r.kiss === 'long' && !r.close && standing(player)) player.leanTo = .14;
        r.burst = {x: (partner.x + player.x) / 2, z: (partner.z + player.z) / 2, long: r.kiss === 'long'};
      }
      return true;
    }
    case 'kiss':
      if (r.t > holds[r.kiss]) {
        partner.leanTo = 0;
        player.leanTo = 0;
        r.phase = 'part';
        r.t = 0;
      }
      return true;
    case 'part':
      if (r.t > .5) return settle(r, partner, player);
      return true;
    default:
      return false;
  }
}
