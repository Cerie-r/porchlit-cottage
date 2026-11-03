// The nights the two of them went to bed together (resident-bed.js), kept in the home as days ('2026-10-26':
// the night of the 26th). The diary tells of each the morning after (diary-days.js).
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const KEEP = 400;

export function cleanNights(raw) {
  const days = Array.isArray(raw) ? raw.filter(d => typeof d === 'string' && dayPattern.test(d)) : [];
  return [...new Set(days)].sort().slice(-KEEP);
}

// Went to bed together on the night of `night`: noted once.
export function addNight(nights, night) {
  const list = cleanNights(nights);
  return dayPattern.test(night) && !list.includes(night) ? cleanNights([...list, night]) : list;
}

// The day after `day`.
export function dayAfter(day) {
  const t = new Date(day + 'T12:00:00Z');
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

// The night it was: before dawn still counts as the night before (going to bed at one in the morning on the
// 27th is the night of the 26th).
export function nightOf(day, hour) {
  if (hour >= 5) return day;
  const t = new Date(day + 'T12:00:00Z');
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}

// The hour (0 to 23) at home, in its time zone.
export function hourIn(zone, date = new Date()) {
  const hour = z => Number(new Intl.DateTimeFormat('en-GB', {hour: '2-digit', hourCycle: 'h23', timeZone: z}).format(date));
  try {
    return hour(zone);
  } catch {
    return hour('UTC');
  }
}
