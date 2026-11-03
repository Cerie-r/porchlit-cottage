// Tickets (券). Something worth one happens at home and a ticket comes: finding
// him (once a day), opening a puzzle folder, and later a gift taken in at the
// door. They are kept with the home, never bought and never run out of date;
// the machines on the street take them. Besides how many there are, the
// newest lines of where they came from (and later went) are kept.

export const LOG_MAX = 60;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
// Why a ticket came or went. 'before' is the ones a home was given for the
// times he had been found before there were tickets. 'capsule', 'claw' and
// 'blindbox' are ones put into the machines on the plaza; 'again' one that
// came back out of a ball, 'twice' one given back for drawing something drawn
// already.
export const TICKET_REASONS = ['seek', 'puzzle', 'gift', 'before', 'capsule', 'again', 'twice', 'claw', 'blindbox'];
const SPEND_REASONS = ['capsule', 'claw', 'blindbox'];
const validLine = l => plain(l) && TICKET_REASONS.includes(l.why) && Number.isSafeInteger(l.n) && l.n !== 0 && (l.day === undefined || dayPattern.test(l.day));

// Whatever was saved, as something safe to use. A home from before there were
// tickets (nothing saved) gets one for each time he was found already.
export function cleanTickets(raw, {foundBefore = 0, lastFound} = {}) {
  if (!plain(raw)) {
    const n = Number.isSafeInteger(foundBefore) && foundBefore > 0 ? foundBefore : 0;
    return n ? {n, log: [{why: 'before', n, ...(dayPattern.test(lastFound || '') ? {day: lastFound} : {})}]} : {n: 0, log: []};
  }
  return {
    n: Number.isSafeInteger(raw.n) && raw.n >= 0 ? raw.n : 0,
    log: Array.isArray(raw.log) ? raw.log.filter(validLine).map(({why, n, day}) => ({why, n, ...(day ? {day} : {})})).slice(-LOG_MAX) : []
  };
}

export function earnTicket(tickets, why, day) {
  const t = cleanTickets(tickets);
  if (!TICKET_REASONS.includes(why) || SPEND_REASONS.includes(why)) return t;
  return {n: t.n + 1, log: [...t.log, {why, n: 1, ...(dayPattern.test(day || '') ? {day} : {})}].slice(-LOG_MAX)};
}

// A ticket goes into a machine. Null when there is none to give.
export function spendTicket(tickets, why, day) {
  const t = cleanTickets(tickets);
  if (t.n < 1 || !SPEND_REASONS.includes(why)) return null;
  return {n: t.n - 1, log: [...t.log, {why, n: -1, ...(dayPattern.test(day || '') ? {day} : {})}].slice(-LOG_MAX)};
}
