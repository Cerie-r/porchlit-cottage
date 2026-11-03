// Going out together, as the home keeps it (state.explore) and as the house and the exploring book hand it to each
// other while she's out (the trip). Pure: the house (src/main.jsx, src/door-outing.jsx) starts a trip at the door
// and brings it home; each page of the book (src/explore-book.jsx) adds to it as they walk.
//
// The home keeps: what has been found, how many of each, ever (found: {"place:find": n}); how many trips each day
// (days); one line a trip for the diary (trips, newest last); whether she's waiting at the door for him (door),
// whether he has asked her out (invite), and the trip they're out on now (out, till it comes home). The trip: the day and which trip of the day it is, its seed (each page hides
// things its own way from it), the places walked, the basket (what was found, place by place), and what happened on
// the way (moments: a kiss, a hug at the pier, a fox met on the path).

export const TRIPS_A_DAY = 2;
export const BASKET = 5;
// What the home keeps: days back, trips back, moments a trip, finds a trip; on a trip, pieces looked through a place.
const KEEP = {days: 14, trips: 200, moments: 12, places: 7, searched: 40};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PLACE = /^[a-z][a-z-]{1,23}$/, FIND = /^[a-z][a-z-]{1,31}$/, PIECE = /^[a-z0-9][a-z0-9-]{0,63}$/;
// How long she waits at the door before it's as if she'd gone back in (3 hours); how long a trip set off on is taken
// as still out (a tab closed on the way never comes home).
export const DOOR_WAIT = 3 * 3600e3;
const OUT_FOR = 6 * 3600e3;
const MOMENTS = ['kiss', 'hug', 'view', 'petals', 'deep', 'full', 'meet'];
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const isDay = d => typeof d === 'string' && DAY.test(d);
const count = n => (Number.isSafeInteger(n) && n > 0 ? n : 0);
const text = (s, max) => (typeof s === 'string' && s.trim() && [...s].length <= max ? s.trim() : null);

const cleanFind = f => (plain(f) && PLACE.test(f.place) && FIND.test(f.id) ? {place: f.place, id: f.id} : null);
const cleanMoment = m => (plain(m) && PLACE.test(m.place) && MOMENTS.includes(m.kind) ? {place: m.place, kind: m.kind, ...(text(m.text, 80) ? {text: text(m.text, 80)} : {})} : null);
function cleanTripLine(t) {
  if (!plain(t) || !isDay(t.day) || !count(t.n)) return null;
  const places = (Array.isArray(t.places) ? t.places : []).filter(p => typeof p === 'string' && PLACE.test(p)).slice(0, KEEP.places);
  const finds = (Array.isArray(t.finds) ? t.finds : []).map(cleanFind).filter(Boolean).slice(0, BASKET);
  const moments = (Array.isArray(t.moments) ? t.moments : []).map(cleanMoment).filter(Boolean).slice(0, KEEP.moments);
  return {day: t.day, n: t.n, places, finds, moments};
}

// His asking her out: {by: {id, name}, on: day}, or null.
function cleanInvite(raw) {
  const by = plain(raw?.by) && typeof raw.by.id === 'string' && text(raw.by.name, 40) ? {id: raw.by.id, name: text(raw.by.name, 40)} : null;
  return by && isDay(raw.on) ? {by, on: raw.on} : null;
}

// What the home has of going out, as something safe to use.
export function cleanExplore(raw) {
  const r = plain(raw) ? raw : {};
  const found = {};
  for (const [k, n] of Object.entries(plain(r.found) ? r.found : {})) {
    const [place, id] = k.split(':');
    if (PLACE.test(place || '') && FIND.test(id || '') && count(n)) found[k] = n;
  }
  const days = {};
  for (const d of Object.keys(plain(r.days) ? r.days : {}).filter(isDay).sort().slice(-KEEP.days)) if (count(r.days[d])) days[d] = r.days[d];
  const trips = (Array.isArray(r.trips) ? r.trips : []).map(cleanTripLine).filter(Boolean).slice(-KEEP.trips);
  const door = plain(r.door) && Number.isSafeInteger(r.door.since) && r.door.since > 0 ? {since: r.door.since} : null;
  const invite = cleanInvite(r.invite);
  const out = plain(r.out) && isDay(r.out.day) && count(r.out.n) && Number.isSafeInteger(r.out.since) && r.out.since > 0 ? {day: r.out.day, n: r.out.n, since: r.out.since} : null;
  return {found, days, trips, door, invite, ...(out ? {out} : {})};
}

// How many times they've gone out today, and whether they may again.
export const tripsOn = (explore, day) => cleanExplore(explore).days[day] || 0;
export const canGoOut = (explore, day) => tripsOn(explore, day) < TRIPS_A_DAY;
// An invitation from him only lasts the day it was made.
export const invitedToday = (explore, day) => cleanExplore(explore).invite?.on === day;
// The trip they set off on today and are still out on ({day, n, since}), or null.
export function outNow(explore, day, now = Date.now()) {
  const o = cleanExplore(explore).out;
  return o && o.day === day && now - o.since < OUT_FOR ? o : null;
}
// Whether this trip has come home already (its line is in the diary).
export const isHome = (explore, trip) => !!trip && cleanExplore(explore).trips.some(l => l.day === trip.day && l.n === trip.n);

// Where things stand at the door today: he has said 走 ('go'), she's waiting for him ('door'), they've been out as
// often as they may ('done'), or nothing yet ('').
export function outingNow(explore, today, now = Date.now()) {
  const e = cleanExplore(explore);
  if (tripsOn(e, today) >= TRIPS_A_DAY) return 'done';
  if (invitedToday(e, today)) return 'go';
  return atDoor(e, now) ? 'door' : '';
}
// She's waiting at the door now (not just since some hours ago and gone in since).
export const atDoor = (explore, now = Date.now()) => {
  const d = cleanExplore(explore).door;
  return !!d && now - d.since < DOOR_WAIT;
};

// She's at the door waiting for him to say 走 (at: when); or she's stopped waiting.
export const waitAtDoor = (explore, at) => ({...cleanExplore(explore), door: {since: at}});
export const leaveDoor = explore => ({...cleanExplore(explore), door: null});
// He asks her out (by: {id, name}), today.
export const inviteOut = (explore, by, day) => ({...cleanExplore(explore), invite: {by, on: day}});

// A small hash of a string, for seeds.
function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0;
  return h >>> 0;
}

// Going out, when he has said 走 today: the day's count goes up, the door and the invitation are done with (the trip
// carries his invitation, to be given back if it never gets into the book), and they're out; the trip that goes with
// them. home: something of this home's own (its id) so two homes going out the same day don't find the same things.
// now: when they set off; him: how he's spoken of.
export function startTrip(explore, day, home = '', {now = Date.now(), him = '他'} = {}) {
  const e = cleanExplore(explore);
  if (!isDay(day)) return {problem: '今天是哪天？'};
  if (!canGoOut(e, day)) return {problem: `今天已经出过 ${TRIPS_A_DAY} 趟门了，明天再一起出去。`};
  if (!invitedToday(e, day)) return {problem: `等${him}回一声「走」，再一起出门。`};
  const n = (e.days[day] || 0) + 1;
  return {
    explore: {...e, days: {...e.days, [day]: n}, door: null, invite: null, out: {day, n, since: now}},
    trip: {v: 1, day, n, seed: hash(`${home}:${day}:${n}`) || 1, home: false, places: [], basket: [], moments: [], searched: {}, invite: e.invite}
  };
}

// A trip as handed between the house and the book (out of sessionStorage), safe to use, or null.
export function cleanTrip(raw) {
  if (!plain(raw) || raw.v !== 1 || !isDay(raw.day) || !count(raw.n) || !count(raw.seed)) return null;
  const line = cleanTripLine({...raw, finds: raw.basket});
  // What's been looked through on each page of it: {place: {piece: 'taken' or 'empty'}}.
  const searched = {};
  for (const [place, got] of Object.entries(plain(raw.searched) ? raw.searched : {})) {
    if (!line.places.includes(place) || !plain(got)) continue;
    const kept = Object.entries(got).filter(([id, how]) => PIECE.test(id) && (how === 'taken' || how === 'empty')).slice(0, KEEP.searched);
    if (kept.length) searched[place] = Object.fromEntries(kept);
  }
  const invite = cleanInvite(raw.invite);
  return {v: 1, day: raw.day, n: raw.n, seed: raw.seed, home: raw.home === true, places: line.places, basket: line.finds, moments: line.moments, searched, ...(invite ? {invite} : {})};
}
// The seed one page hides things by on this trip: its own, and the same if they come back to it on the same trip.
export const placeSeed = (trip, place) => hash(`${trip.seed}:${place}`) || 1;
// Walking into a page, putting something in the basket, something happening on the way, and setting off home.
export const visit = (trip, place) => (trip.places.includes(place) ? trip : {...trip, places: [...trip.places, place].slice(0, KEEP.places)});
export const basketFull = trip => trip.basket.length >= BASKET;
export const pick = (trip, place, id) => (basketFull(trip) ? trip : {...trip, basket: [...trip.basket, {place, id}]});
// The same thing happening twice in a place (two kisses on the pier) is kept once.
export const remember = (trip, moment) => {
  const m = cleanMoment(moment);
  if (!m || trip.moments.length >= KEEP.moments) return trip;
  if (trip.moments.some(o => o.place === m.place && o.kind === m.kind && o.text === m.text)) return trip;
  return {...trip, moments: [...trip.moments, m]};
};
export const goHome = trip => ({...trip, home: true});
// A piece looked through on a page of the trip ('taken': what was there is in the basket; 'empty': nothing was),
// so coming back to the page on the same trip it's as it was left.
export const searchedOn = (trip, place) => trip?.searched?.[place] || {};
export function markSearched(trip, place, id, how) {
  const got = searchedOn(trip, place);
  if (!PIECE.test(id) || !['taken', 'empty'].includes(how) || got[id] === how || Object.keys(got).length >= KEEP.searched) return trip;
  return {...trip, searched: {...(trip.searched || {}), [place]: {...got, [id]: how}}};
}

// They're not out on this trip any more.
const ended = (e, t) => (e.out && e.out.day === t.day && e.out.n === t.n ? (({out, ...rest}) => rest)(e) : e);
// A trip that never got into the book (she turned back at the cover): not one of the day's trips after all, and his
// 走 stands again. Only the day's latest: one set off after it stays as it is.
function giveBack(e, t) {
  const after = ended(e, t);
  if ((after.days[t.day] || 0) !== t.n) return after;
  const days = {...after.days};
  if (t.n > 1) days[t.day] = t.n - 1;
  else delete days[t.day];
  return {...after, days, invite: after.invite || t.invite || null};
}

// Home again (src/main.jsx): {explore, back}. back: 'home', kept now (what was in the basket counted, a line in the
// diary); 'again', it had come home already (a copy of the tab carries a copy of it); 'given', it never got into the
// book, and is given back (giveBack); null, not a trip at all.
export function homecoming(explore, trip) {
  const e = cleanExplore(explore), t = cleanTrip(trip);
  if (!t) return {explore: e, back: null};
  if (isHome(e, t)) return {explore: e, back: 'again'};
  if (!t.places.length && !t.basket.length) return {explore: giveBack(e, t), back: 'given'};
  const found = {...e.found};
  for (const f of t.basket) found[`${f.place}:${f.id}`] = (found[`${f.place}:${f.id}`] || 0) + 1;
  const line = {day: t.day, n: t.n, places: t.places, finds: t.basket, moments: t.moments};
  return {explore: {...ended(e, t), found, trips: [...e.trips, line].slice(-KEEP.trips)}, back: 'home'};
}
export const bringHome = (explore, trip) => homecoming(explore, trip).explore;

// The trip in a line of the diary. names: {place: id => its name, find: (place, id) => its name}; him: how he's
// spoken of (他, or 她 where she plays the boy).
export function tripLine(trip, {names, him = '他'}) {
  const where = trip.places.map(p => names.place(p)).filter(Boolean);
  if (!where.length) return '';
  const got = [];
  for (const f of trip.finds || trip.basket || []) {
    const name = names.find(f.place, f.id);
    if (name && !got.includes(name)) got.push(name);
  }
  const happened = [...new Set((trip.moments || []).map(m => m.text).filter(Boolean))];
  return `和${him}一起出门，去了${where.join('、')}${got.length ? `，捡到${got.join('、')}` : '，什么也没捡'}${happened.length ? `；${happened.join('；')}` : ''}。`;
}
