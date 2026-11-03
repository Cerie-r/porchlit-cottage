// What AIs living in a home ask to do there (server/migrations/012_machine_acts.sql; the acts themselves are
// src/machine-acts.js): queued by the MCP door (server/mcp.mjs), handed to the owner's page (server/api.mjs), and
// answered by the save that carries the page's line about each one (server/home-saves.mjs). The server never changes
// the home itself: the page holds the home, and two writers would undo each other.
import {LIMITS, actLine, answerOf, cleanCloset, cleanMachine, prepareAct, seekSees, seeksOn} from '../src/machine-acts.js';
import {dayIn} from '../src/hide-and-seek.js';

// Acts waiting in one home at once, and acts one AI asks for in a day: a home shouldn't change out of all recognition
// between one visit and the next.
export const WAITING_MAX = 20;
export const DAILY_MAX = 40;
// Acts handed to the page at once.
const HANDED = 30;
// The acts of a home that still count: from AIs that live there and are switched on. Those of an AI that has gone are
// taken back when it goes (withdrawAll); those of one switched off just wait, neither handed over nor in the way.
const STILL = `exists (select 1 from accounts a where a.id = m.account_id and a.disabled_at is null)
  and exists (select 1 from residents r where r.home_id = m.home_id and r.account_id = m.account_id and r.left_at is null)`;

const named = (name, nickname) => ({name, nickname: nickname && nickname !== name ? nickname : ''});

// The home as last saved: just the house's own entry in the save, or null before the first save.
export async function savedLayout(db, homeId) {
  const {rows: [row]} = await db.query(`select doc #> '{entries,porchlit-home-layout-v1}' as layout from home_saves where home_id = $1`, [homeId]);
  return row?.layout ?? null;
}

// The home's today, by the clock in its save (its time zone; UTC before it has one).
export async function savedDay(db, homeId) {
  const {rows: [row]} = await db.query(`select doc #>> '{entries,porchlit-clock-v1,timeZone}' as zone from home_saves where home_id = $1`, [homeId]);
  return dayIn(typeof row?.zone === 'string' && row.zone ? row.zone : 'UTC');
}

// The spots an AI may still turn over today (翻一格): a few a day, by the lines the home keeps and its own still
// waiting.
export async function seeksLeft(db, {homeId, accountId, layout, day}) {
  const {rows: [{n}]} = await db.query(`select count(*)::int as n from machine_acts where home_id = $1 and account_id = $2 and tool = 'place' and action = 'seek' and state = 'waiting'`, [homeId, accountId]);
  return Math.max(0, LIMITS.seeks - seeksOn(layout?.machine, accountId, day).length - n);
}

// The wardrobe as the owner's page last told it (migration 014), or null.
export async function savedCloset(db, homeId) {
  const {rows: [row]} = await db.query('select closet from home_closets where home_id = $1', [homeId]);
  return cleanCloset(row?.closet);
}
// The owner's page tells it (what it sends, cleaned; nothing kept when it isn't a wardrobe at all). True when kept.
export async function storeCloset(db, homeId, raw) {
  const closet = cleanCloset(raw);
  // Well inside what the table takes (jsonb's text is roomier than the JSON sent).
  if (!closet || Buffer.byteLength(JSON.stringify(closet)) > 48 * 1024) return false;
  await db.query(
    `insert into home_closets (home_id, closet) values ($1, $2)
     on conflict (home_id) do update set closet = excluded.closet, updated_at = now()`,
    [homeId, closet]);
  return true;
}

// Queues an act for the home the AI lives in. Caller holds a transaction. The AI's account is held first and its
// home checked again, the order moving out goes in (server/residents.mjs), so an act never waits for a home its AI
// has just left; then the home's row, which serializes the limits as a knock at its door does (server/doors.mjs).
// args: as actArgs gave them. Returns {act: {id, at, args, line}} or {problem}; a spot turned over (place.seek) also
// says what it shows, from the save (seen).
export async function queueAct(db, {homeId, account, tool, action, args}) {
  await db.query('select id from accounts where id = $1 for update', [account.id]);
  const {rowCount: lives} = await db.query('select 1 from residents where account_id = $1 and home_id = $2 and left_at is null', [account.id, homeId]);
  if (!lives) return {problem: '你已经不住在这个家了。'};
  await db.query('select id from homes where id = $1 for update', [homeId]);
  const {rows: queued} = await db.query(`select tool, action, args, account_id from machine_acts m where m.home_id = $1 and m.state = 'waiting' and ${STILL} order by m.id`, [homeId]);
  // Whose each is: some limits are each AI's own (a bottle waiting).
  const waiting = queued.map(({account_id: by, ...a}) => ({...a, mine: String(by) === String(account.id)}));
  if (waiting.length >= WAITING_MAX) return {problem: `家里已经排着 ${WAITING_MAX} 件事了，等她打开家、接进去一些再来。`};
  const {rows: [{n}]} = await db.query(`select count(*)::int as n from machine_acts where account_id = $1 and created_at > now() - interval '24 hours'`, [account.id]);
  if (n >= DAILY_MAX) return {problem: `一天最多做 ${DAILY_MAX} 件事，免得家里一下子变得认不出来。过些时候再来。`};
  const layout = await savedLayout(db, homeId);
  const closet = tool === 'dress' ? await savedCloset(db, homeId) : null;
  // How she is spoken of: as her figure is (the girl, unless she plays the boy).
  const her = layout?.residents?.wardrobeV1?.playerKind === 'boy' ? '他' : '她';
  const day = await savedDay(db, homeId);
  const prepared = prepareAct(layout, {tool, action, args}, {waiting, closet, her, day, me: String(account.id)});
  if (prepared.problem) return prepared;
  const line = actLine({tool, action, args: prepared.args}, layout, {closet, her});
  // A change of clothes keeps its line as it was asked: the wardrobe it names things from changes (look's acts).
  const kept = tool === 'dress' ? {...prepared.args, line} : prepared.args;
  const {rows: [row]} = await db.query(
    `insert into machine_acts (home_id, account_id, tool, action, args, by_name, by_nickname)
     values ($1, $2, $3, $4, $5, $6, $7) returning id, created_at`,
    [homeId, account.id, tool, action, kept, account.username, named(account.username, account.nickname).nickname]);
  if (tool === 'place' && action === 'seek') {
    const seen = seekSees(layout, prepared.args.spot, {me: String(account.id), her});
    const mine = waiting.filter(a => a.mine && a.tool === 'place' && a.action === 'seek').length + 1;
    const left = Math.max(0, LIMITS.seeks - seeksOn(layout?.machine, account.id, day).length - mine);
    return {act: {id: String(row.id), at: row.created_at, args: prepared.args, line}, seen: {...seen, left}};
  }
  return {act: {id: String(row.id), at: row.created_at, args: prepared.args, line}};
}

// The acts waiting in a home, oldest first, for its owner's page: only from AIs that still live there and are
// switched on.
export async function waitingActs(db, homeId) {
  const {rows} = await db.query(
    `select m.id, m.key, m.tool, m.action, m.args, m.account_id, m.by_name, m.by_nickname, m.created_at
       from machine_acts m where m.home_id = $1 and m.state = 'waiting' and ${STILL} order by m.id limit $2`,
    [homeId, HANDED]);
  return rows.map(r => ({id: String(r.id), key: r.key, tool: r.tool, action: r.action, args: r.args, at: r.created_at, by: {id: String(r.account_id), ...named(r.by_name, r.by_nickname)}}));
}

// How many acts wait in a home to be handed over: what an open page hears with each look at the save's revision.
export async function waitingCount(db, homeId) {
  const {rows: [{n}]} = await db.query(`select count(*)::int as n from machine_acts m where m.home_id = $1 and m.state = 'waiting' and ${STILL}`, [homeId]);
  return n;
}

// An AI takes back an act of its own still waiting: {withdrawn} when it did. A spot turned over (place.seek) is told
// at once, letter and all, so it stays: taking it back would hand the day's turn back after the look ({turnedOver}).
export async function withdrawAct(db, {homeId, accountId, id}) {
  const {rows: [row]} = await db.query(
    `with target as (select id, tool, action from machine_acts where id = $1 and home_id = $2 and account_id = $3 and state = 'waiting'),
      taken as (update machine_acts m set state = 'withdrawn', answered_at = now() from target t
        where m.id = t.id and not (t.tool = 'place' and t.action = 'seek') returning m.id)
     select (select count(*) from taken)::int as taken, (select count(*) from target where tool = 'place' and action = 'seek')::int as seek`,
    [id, homeId, accountId]);
  return {withdrawn: row.taken === 1, turnedOver: row.seek === 1};
}

// An AI moving out (or asked to) takes everything it still has waiting with it. Caller holds the AI's account.
export async function withdrawAll(db, accountId) {
  await db.query(`update machine_acts set state = 'withdrawn', answered_at = now(), answer = '搬走了，没做。' where account_id = $1 and state = 'waiting'`, [accountId]);
}

// What an AI asked for lately in a home, newest first.
export async function actsOf(db, {homeId, accountId, limit = 20}) {
  const {rows} = await db.query(
    `select id, key, tool, action, args, state, answer, created_at, answered_at from machine_acts
      where home_id = $1 and account_id = $2 order by id desc limit $3`,
    [homeId, accountId, limit]);
  return rows.map(r => ({id: String(r.id), key: r.key, tool: r.tool, action: r.action, args: r.args, state: r.state, answer: r.answer, at: r.created_at, answeredAt: r.answered_at}));
}

// What a save says of the acts it has a line about (machine.acts): {id, key, state: 'done' or 'refused', answer}.
export function actAnswers(doc) {
  const raw = doc?.entries?.['porchlit-home-layout-v1']?.machine;
  return raw && typeof raw === 'object' ? cleanMachine(raw).acts.map(answerOf) : [];
}

// A save that has just been stored answers the acts it has a line about: done, with what became of each, or
// refused, with why. Only this home's acts, matched by id and key, and only those not answered yet; one taken back
// that the page let in all the same is done. Called by storeSave, inside its transaction, after the home's row.
// Returns the acts it answered, as they now are ({id, account_id, tool, action, args, state}).
export async function acknowledgeActs(db, homeId, doc) {
  const answers = actAnswers(doc);
  if (!answers.length) return [];
  const {rows} = await db.query(
    `update machine_acts m set state = x.state, answer = x.answer, answered_at = now()
       from unnest($2::bigint[], $3::uuid[], $4::text[], $5::text[]) as x(id, key, state, answer)
      where m.id = x.id and m.key = x.key and m.home_id = $1 and m.state in ('waiting', 'withdrawn')
      returning m.id, m.account_id, m.tool, m.action, m.args, m.state`,
    [homeId, answers.map(a => a.id), answers.map(a => a.key), answers.map(a => a.state), answers.map(a => a.answer)]);
  return rows;
}
