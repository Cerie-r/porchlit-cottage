// The two residents together. The first of these: one sitting on the other's
// lap. Kept pure here (where she sits, and how they hold each other);
// resident-motion.jsx walks them there.

// On the lap: this far ahead of the seat, along the way he faces, to the side
// across his thighs, this much higher than his seat (his thighs), and she
// backs in from a little in front.
export const LAP = {forward: .3, side: .15, rise: .105, backIn: .32};

// A seat (as resident-motion-state.js takes one) on the lap of someone sitting
// in `seat`, facing the way they do. `side` is along (cos yaw, -sin yaw).
export function lapSeat(seat, side = 0) {
  const yaw = seat.yaw || 0, f = [Math.sin(yaw), Math.cos(yaw)], r = [Math.cos(yaw), -Math.sin(yaw)];
  const at = (ahead, across) => [seat.seat[0] + f[0] * ahead + r[0] * across, seat.seat[1] + f[1] * ahead + r[1] * across];
  return {id: 'lap', lap: true, side, seat: at(LAP.forward, side), approach: at(LAP.forward + LAP.backIn, side), height: seat.height + LAP.rise, yaw};
}

// Which way across the lap she sits so that his face shows beside hers: along
// the way the camera looks (`view`, flat [x, z] in the same frame), so her head
// is further from the eye than his.
export function lapSide(yaw = 0, view = null) {
  if (!view) return -LAP.side;
  return view[0] * Math.cos(yaw) - view[1] * Math.sin(yaw) >= 0 ? LAP.side : -LAP.side;
}

// Where the camera goes to see them, by the seat he's on (room-camera.jsx's places): the sofa is
// seen from behind on the whole floor, so the camera walks round to its front.
export const SEAT_VIEWS = {sofa: 'view:sofa', bedroomChair: 'view:bedroomChair', studyReading: 'view:studyReading', diningChair1: 'view:diningTable', diningChair2: 'view:diningTable', diningChair3: 'view:diningTable'};

// Left alone this long (ms), he may sit down and ask her over; the bubble stays this long, and he
// doesn't ask again for a good while after.
export const INVITE = {idle: 90000, showFor: 30000, gap: 300000};

// A sofa seats two, one at each end, this far either side of its middle (along its width, which is
// (cos yaw, -sin yaw) on the floor). Any other seat takes one. Their heads are big: closer than an end
// apart, they run into each other.
export const WIDE = {sofa: .75};

// The same seat, or the same sofa: close by and facing the same way.
export function sameSeat(a, b) {
  if (!a || !b || (a.id && b.id && a.id !== b.id)) return false;
  const reach = WIDE[a.id] || WIDE[b.id] ? 1.6 : .3, turn = Math.abs(Math.atan2(Math.sin((a.yaw || 0) - (b.yaw || 0)), Math.cos((a.yaw || 0) - (b.yaw || 0))));
  return Math.hypot(a.seat[0] - b.seat[0], a.seat[1] - b.seat[1]) < reach && turn < .5;
}

// One end of a sofa (side -1 or 1), from the seat in its middle. Anything else as it is.
export function seatEnd(seat, side) {
  const w = WIDE[seat?.id];
  if (!w || !side) return seat;
  const r = [Math.cos(seat.yaw || 0), -Math.sin(seat.yaw || 0)], at = p => [p[0] + r[0] * side * w, p[1] + r[1] * side * w];
  return {...seat, seat: at(seat.seat), approach: at(seat.approach), end: side};
}

// Where she sits when she asks for `seat` and he sits (or is on his way to sit) at `his`: the seat
// itself when it's another one; on the sofa he's on, the other end from him; on a seat for one that
// he's in, nowhere (null).
export function seatBeside(seat, his) {
  if (!sameSeat(seat, his)) return seat;
  const w = WIDE[seat.id];
  if (!w) return null;
  // From the middle of the sofa (`seat` may already be one of its ends): the end away from him.
  const r = [Math.cos(seat.yaw || 0), -Math.sin(seat.yaw || 0)], back = (seat.end || 0) * w, shift = p => [p[0] - r[0] * back, p[1] - r[1] * back];
  const middle = {...seat, seat: shift(seat.seat), approach: shift(seat.approach), end: 0};
  const where = (his.seat[0] - middle.seat[0]) * r[0] + (his.seat[1] - middle.seat[1]) * r[1];
  return seatEnd(middle, where > 0 ? -1 : 1);
}

// Leaning on him on the sofa: she sits this far from him (their heads just clear of each other) towards
// the middle, then tilts her head onto his, and he tilts a little towards her.
export const NESTLE = {apart: 1.1, her: .35, him: .12};

// Her seat next to him, from his seat at one end of a sofa (towards the middle). Null when he isn't on one.
export function seatNestled(his) {
  if (!his || !WIDE[his.id]) return null;
  const end = his.end || 1, r = [Math.cos(his.yaw || 0), -Math.sin(his.yaw || 0)], at = p => [p[0] - r[0] * end * NESTLE.apart, p[1] - r[1] * end * NESTLE.apart];
  return {...his, seat: at(his.seat), approach: at(his.approach), end: undefined, nestle: end};
}

// How they hold each other there: arms (avatar-rig.js: left forward, left out,
// right forward, right out), leaning and tilting. He sits back a little with his arms
// round her; she leans forward a little, hands on her lap. Their heads are big: he tilts
// out the other way from the side she sits on, and she the way she sits, so his face
// peeks out beside hers. Tilts are for her on the +x side (`side` > 0); the other side
// turns them round.
export const LAP_HOLD = {under: {arms: [-.75, .5, -.75, -.5], lean: -.2, tilt: .4}, over: {arms: [-.25, .2, -.25, -.2], lean: .1, tilt: -.25}};

// Reading together on his lap: her hands come up in front of her, a little longer than they are (avatar-rig.js
// reach), to hold a little book out beyond her chin (reading-book.jsx: BOOK_AT), where it shows.
export const READ_ARMS = [-1.25, .42, -1.25, -.42], READ_REACH = [.28, .28];
