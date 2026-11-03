// Kisses counted towards the rose castle (src/house-shells.js): every kiss between the two residents counts (a
// stolen one either way, the one when he's found), at most nine a day; at ninety-nine he gives her the rose castle.
// Kept in the home as `roses`: {n, day, today, on}: how many so far, the day the last one was counted, how many
// that day, and the day the ninety-ninth came.
export const ROSES = {goal: 99, perDay: 9};
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const isDay = d => typeof d === 'string' && dayPattern.test(d);

export function cleanRoses(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const n = Number.isInteger(r.n) ? Math.max(0, Math.min(ROSES.goal, r.n)) : 0;
  const day = isDay(r.day) ? r.day : null;
  const today = day && Number.isInteger(r.today) ? Math.max(0, Math.min(ROSES.perDay, r.today)) : 0;
  return {n, day, today, on: n >= ROSES.goal && isDay(r.on) ? r.on : null};
}

// One kiss on `day` (YYYY-MM-DD in the home's time zone): counted unless nine are counted already that day, or
// the ninety-nine are reached. `reached`: this was the ninety-ninth.
export function addKiss(raw, day) {
  const r = cleanRoses(raw);
  if (!isDay(day) || r.n >= ROSES.goal) return {roses: r, counted: false, reached: false};
  const today = r.day === day ? r.today : 0;
  if (today >= ROSES.perDay) return {roses: r, counted: false, reached: false};
  const n = r.n + 1, reached = n >= ROSES.goal;
  return {roses: {n, day, today: today + 1, on: reached ? day : null}, counted: true, reached};
}

// How many are counted still to come today (none once the ninety-nine are there).
export function kissesLeftToday(raw, day) {
  const r = cleanRoses(raw);
  if (r.n >= ROSES.goal) return 0;
  return ROSES.perDay - (r.day === day ? r.today : 0);
}

export const roseCastleOpen = home => cleanRoses(home?.roses).n >= ROSES.goal;
