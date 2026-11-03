import {welcome, takeIn} from './door-gifts.js';
import {earnTicket} from './tickets.js';
import {withKind} from './claw.js';
export const cleanReceipts = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === 'string' && /^[1-9][0-9]{0,17}$/.test(id)))] : [];
// Receipt history is independent of possessions: eaten, placed and re-gifted things stay received.
export function receiveMail(home, visit, day) {
  const receipts = cleanReceipts(home.mailReceipts);
  if (visit.status !== 'taken' || visit.delivered || receipts.includes(visit.id)) return home;
  const thing = welcome(visit, day);
  if (!thing) throw Error('这份礼物读不出来，先留在门口。');
  const already = (home.creations || []).some(i => i.id === thing.id);
  // A doll someone gave you: its kind can be made at the doll table from now on.
  const kinds = thing.kind === 'animal' ? {caught: withKind(home.caught, thing.species)} : {};
  return {...home, mailReceipts: [...receipts, visit.id], creations: takeIn(home.creations, thing), tickets: already ? home.tickets : earnTicket(home.tickets, 'gift', day), ...kinds};
}
// Keep the whole unresolved request before sending. A timeout must retry these exact contents.
export function pendingMail(storage, account, target, payload) {
  const key = 'porchlit-mail-pending:' + account + ':' + target;
  let old;
  try { old = JSON.parse(storage.getItem(key)); } catch { throw Error('上一份投递记录读不出来，先别再寄。'); }
  if (old) return {key, request: old};
  const request = {...payload, requestId: crypto.randomUUID()};
  storage.setItem(key, JSON.stringify(request));
  return {key, request};
}
