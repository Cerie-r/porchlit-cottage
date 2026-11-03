// Answering questions to hang a door plate (server/migrations/010_entry_questions.sql), for whoever has no
// invitation, once the home the place is run by opens this way in. A newcomer is asked a few of its choice questions,
// drawn at random with the choices shuffled, and all of its short-answer questions. The choices are judged there and
// then; with them all right, the door plate goes up, unless there were short answers: those wait for the running home
// to read, the account made but switched off until it is let in (or gone again if it isn't). Only so many may come
// in this way in a day (the last 24 hours) and in all, waiting ones included; invitations count against neither. The
// answers are bound to get around: the questions say what kind of place this is, the short answers are read by a
// person, and the numbers keep it in hand.
import crypto from 'node:crypto';
import {validText} from '../src/door-safety.js';

export const QUESTIONS_MAX = 20;
export const TEXT_QUESTIONS_MAX = 3;
export const TEXT_MAX = 100;
export const CHOICE_MAX = 40;
export const ANSWER_MAX = 200;
export const RULES_MAX = 2000;

const count = s => [...s].length;

export function questionProblem(q) {
  if (!q || typeof q !== 'object') return '题目读不懂。';
  if (!['choice', 'text'].includes(q.kind ?? 'choice')) return '是选择题还是简答题？';
  if (typeof q.text !== 'string' || !validText(q.text) || !q.text.trim()) return '要写题目。';
  if (count(q.text.trim()) > TEXT_MAX) return `题目最多 ${TEXT_MAX} 个字。`;
  if (q.kind === 'text') return null;
  if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4) return '要有两到四个选项。';
  const choices = q.choices.map(c => (typeof c === 'string' && validText(c) ? c.trim() : ''));
  if (choices.some(c => !c)) return '每个选项都要写字。';
  if (choices.some(c => count(c) > CHOICE_MAX)) return `选项最多 ${CHOICE_MAX} 个字。`;
  if (new Set(choices).size !== choices.length) return '选项不能重样。';
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= choices.length) return '要标出哪个是对的。';
  return null;
}
export const cleanQuestion = q => (q.kind === 'text'
  ? {kind: 'text', text: q.text.trim(), choices: null, answer: null}
  : {kind: 'choice', text: q.text.trim(), choices: q.choices.map(c => c.trim()), answer: q.answer});

// The door's settings as the keeper sends them: open or not, how many choice questions, and the two limits (null:
// none).
export function doorProblem(d) {
  if (typeof d?.open !== 'boolean') return '开还是关？';
  if (d.rules !== undefined && (typeof d.rules !== 'string' || !validText(d.rules) || count(d.rules.trim()) > RULES_MAX)) return `街规最多 ${RULES_MAX} 个字。`;
  if (!Number.isInteger(d.ask) || d.ask < 1 || d.ask > 5) return '每次答 1 到 5 道选择题。';
  for (const [key, label] of [['perDay', '一天'], ['total', '总共']]) {
    const n = d[key];
    if (n !== null && !(Number.isInteger(n) && n >= 0 && n <= 100000)) return `${label}最多几家要是一个数，不限就留空。`;
  }
  return null;
}

const shuffled = list => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// The door as it is now: its settings, how many came in this way (in the last 24 hours, and in all, those waiting to
// be read included), how many are waiting, and how many questions of each kind there are. With `lock`, the settings
// row is held until the transaction ends, so whoever comes in by it comes in one at a time and the limits hold.
export async function doorState(db, {lock = false} = {}) {
  const {rows: [d]} = await db.query(`select open, rules, ask, per_day, total from entry_door where id${lock ? ' for update' : ''}`);
  const {rows: [n]} = await db.query(`select count(*) filter (where created_at > now() - interval '24 hours')::int as today, count(*)::int as total from accounts where came_by = 'quiz'`);
  const {rows: [q]} = await db.query(`select count(*) filter (where kind = 'choice')::int as choice, count(*) filter (where kind = 'text')::int as text from entry_questions`);
  const {rows: [w]} = await db.query('select count(*)::int as n from entry_answers where decided_at is null');
  return {open: d.open, rules: d.rules, ask: d.ask, perDay: d.per_day, total: d.total, joined: {today: n.today, total: n.total}, waiting: w.n, questions: {choice: q.choice, text: q.text}};
}

// Why nobody may come in this way now ({code, message}), or null when someone may.
export function shut(state) {
  if (!state.open || !(state.questions.choice + state.questions.text)) return {code: 'quiz_closed', message: '现在没有开答题进门，要一张请帖。'};
  if (state.total !== null && state.joined.total >= state.total) return {code: 'quiz_full', message: '答题进门的名额满了，要一张请帖。'};
  if (state.perDay !== null && state.joined.today >= state.perDay) return {code: 'quiz_full', message: '今天答题住进来的人满了，明天再来吧。'};
  return null;
}

// A newcomer's questions: as many choice questions as the door asks (or all there are), drawn at random with the
// choices shuffled, then every short-answer one. No answers in them.
export async function drawQuestions(db, ask) {
  const {rows} = await db.query('select id, kind, text, choices from entry_questions order by id');
  const choice = shuffled(rows.filter(r => r.kind === 'choice')).slice(0, ask).map(r => ({id: String(r.id), kind: 'choice', text: r.text, choices: shuffled(r.choices)}));
  return [...choice, ...rows.filter(r => r.kind === 'text').map(r => ({id: String(r.id), kind: 'text', text: r.text}))];
}

// Reads a newcomer's answers ([{id, answer}]: for a choice question the words of the choice, for a short-answer one
// what they wrote). They have to be for different questions that still exist: as many choice questions as the door
// asks (or all there are), and every short-answer one, written. Returns {wrong, written: [{question, answer}]} (how
// many choices are wrong, and the short answers in the questions' order), or null when the answers don't add up.
export async function readAnswers(db, answers, ask) {
  if (!Array.isArray(answers) || !answers.length || answers.length > 5 + TEXT_QUESTIONS_MAX) return null;
  const ids = answers.map(a => (typeof a?.id === 'string' && /^[1-9][0-9]{0,17}$/.test(a.id) && typeof a.answer === 'string' && validText(a.answer) ? a.id : null));
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) return null;
  const {rows} = await db.query('select id, kind, text, choices, answer from entry_questions order by id');
  const byId = new Map(rows.map(r => [String(r.id), r]));
  if (ids.some(id => !byId.has(id))) return null;
  const given = new Map(answers.map(a => [a.id, a.answer.trim()]));
  const choiceIds = ids.filter(id => byId.get(id).kind === 'choice');
  if (choiceIds.length < Math.min(ask, rows.filter(r => r.kind === 'choice').length)) return null;
  const texts = rows.filter(r => r.kind === 'text');
  if (texts.some(r => !given.get(String(r.id)) || count(given.get(String(r.id))) > ANSWER_MAX)) return null;
  const wrong = choiceIds.filter(id => given.get(id) !== byId.get(id).choices[byId.get(id).answer]).length;
  return {wrong, written: texts.map(r => ({question: r.text, answer: given.get(String(r.id))}))};
}

// The keeper's side: the questions (with their answers), writing, changing and taking one away, the settings, and
// the newcomers waiting to be read.
const entry = r => ({id: String(r.id), kind: r.kind, text: r.text, ...(r.kind === 'choice' ? {choices: r.choices, answer: r.answer} : {}), at: r.updated_at});
export async function listQuestions(db) {
  const {rows} = await db.query('select id, kind, text, choices, answer, updated_at from entry_questions order by id');
  return rows.map(entry);
}
// Caller holds a transaction. Returns the question, or a reason it can't be written ({tooMany}).
export async function addQuestion(db, q, keeperId) {
  await db.query('select id from entry_door where id for update');
  const {rows: [n]} = await db.query(`select count(*)::int as total, count(*) filter (where kind = 'text')::int as text from entry_questions`);
  if (n.total >= QUESTIONS_MAX) return {tooMany: `题目最多 ${QUESTIONS_MAX} 道，先删掉几道。`};
  if (q.kind === 'text' && n.text >= TEXT_QUESTIONS_MAX) return {tooMany: `简答题最多 ${TEXT_QUESTIONS_MAX} 道，都要有人看。`};
  const {rows: [r]} = await db.query(
    'insert into entry_questions (kind, text, choices, answer, written_by) values ($1, $2, $3, $4, $5) returning id, kind, text, choices, answer, updated_at',
    [q.kind, q.text, q.choices ? JSON.stringify(q.choices) : null, q.answer, keeperId]);
  return entry(r);
}
// Changing one keeps its kind. Null when there is no such question (of that kind).
export async function editQuestion(db, id, q) {
  const {rows: [r]} = await db.query(
    'update entry_questions set text = $2, choices = $3, answer = $4, updated_at = now() where id = $1 and kind = $5 returning id, kind, text, choices, answer, updated_at',
    [id, q.text, q.choices ? JSON.stringify(q.choices) : null, q.answer, q.kind]);
  return r ? entry(r) : null;
}
export async function removeQuestion(db, id) {
  const {rowCount} = await db.query('delete from entry_questions where id = $1', [id]);
  return rowCount === 1;
}
// The street's rules stay as they were unless they come along.
export async function setDoor(db, d) {
  await db.query('update entry_door set open = $1, ask = $2, per_day = $3, total = $4, rules = coalesce($5, rules), updated_at = now() where id',
    [d.open, d.ask, d.perDay, d.total, typeof d.rules === 'string' ? d.rules.trim() : null]);
}

// A newcomer's short answers, put to wait with their (switched off) account. Caller holds the transaction that made
// the account.
export async function holdAnswers(db, account, key, written) {
  await db.query('insert into entry_answers (account_id, username, username_key, nickname, answers) values ($1, $2, $3, $4, $5)',
    [account.id, account.username, key, account.nickname || '', JSON.stringify(written)]);
}

const named = (name, nickname) => ({name, nickname: nickname && nickname !== name ? nickname : ''});
// What the AI helping run the place (server/street.mjs) thought of one, when it said: its words, which way it leans,
// and its name.
const aiView = r => (r.ai_at ? {ai: {words: r.ai_words, leaning: r.ai_leaning, at: r.ai_at, ...(r.ai_name ? {by: named(r.ai_name, r.ai_nickname)} : {})}} : {});
const waitingEntry = r => ({id: String(r.id), ...named(r.username, r.nickname), answers: r.answers, at: r.created_at,
  ...(r.decided_at ? {decidedAt: r.decided_at, outcome: r.outcome} : {}), ...aiView(r)});
const WITH_AI = `e.id, e.username, e.nickname, e.answers, e.created_at, e.decided_at, e.outcome, e.ai_words, e.ai_leaning, e.ai_at,
  b.username as ai_name, b.nickname as ai_nickname`;
// Those waiting to be read, the longest waiting first.
export async function listWaiting(db, limit = 50) {
  const {rows} = await db.query(`select ${WITH_AI} from entry_answers e left join accounts b on b.id = e.ai_by where e.decided_at is null order by e.created_at, e.id limit $1`, [limit]);
  return rows.map(waitingEntry);
}

// Those decided lately (in the last `days` days), the latest first: who, in or not, when, and by whom (`by.ai` when
// it was the AI helping run the place, with what it said).
export async function listDecided(db, {days = 7, limit = 30} = {}) {
  const {rows} = await db.query(
    `select ${WITH_AI}, d.username as by_name, d.nickname as by_nickname, d.kind as by_kind
       from entry_answers e left join accounts b on b.id = e.ai_by left join accounts d on d.id = e.decided_by
      where e.decided_at > now() - make_interval(days => $1) order by e.decided_at desc, e.id desc limit $2`,
    [days, limit]);
  return rows.map(r => ({id: String(r.id), ...named(r.username, r.nickname), at: r.created_at, decidedAt: r.decided_at, outcome: r.outcome,
    ...(r.by_name ? {by: {...named(r.by_name, r.by_nickname), ...(r.by_kind === 'ai' ? {ai: true} : {})}} : {}), ...aiView(r)}));
}

// The AI helping run the place says what it thinks of one still waiting: a few words, leaning 'in' or 'out'. The
// person running the place decides. Saying it again replaces what it said. False when no such one is waiting.
export async function leanEntry(db, {id, aiId, words, leaning}) {
  const {rowCount} = await db.query(
    'update entry_answers set ai_words = $2, ai_leaning = $3, ai_by = $4, ai_at = now() where id = $1 and decided_at is null',
    [id, words, leaning, aiId]);
  return rowCount === 1;
}

// Letting one in (the account switched on; its home appears on the street) or not (the account and its home go
// again, and the name is free). Deciding again changes nothing. Caller holds a transaction. Returns the entry, or null
// when there is none.
export async function decideEntry(db, {id, keeperId, letIn}) {
  const {rows: [e]} = await db.query('select id, account_id, username, nickname, answers, created_at, decided_at, outcome from entry_answers where id = $1 for update', [id]);
  if (!e) return null;
  if (!e.decided_at) {
    if (e.account_id && letIn) await db.query('update accounts set disabled_at = null where id = $1', [e.account_id]);
    if (e.account_id && !letIn) {
      await db.query('delete from homes where owner_id = $1', [e.account_id]);
      await db.query('delete from accounts where id = $1', [e.account_id]);
    }
    const {rows: [d]} = await db.query(`update entry_answers set decided_at = now(), decided_by = $2, outcome = $3 where id = $1 returning decided_at, outcome`, [id, keeperId, letIn ? 'in' : 'out']);
    Object.assign(e, d);
  }
  return waitingEntry(e);
}

// What became of the latest answers under this (normalised) name: 'waiting', 'out' (not let in, in the last 30
// days), or null.
export async function entryFate(db, key) {
  const {rows: [e]} = await db.query(`select decided_at, outcome from entry_answers where username_key = $1 and (decided_at is null or decided_at > now() - interval '30 days') order by created_at desc limit 1`, [key]);
  return !e ? null : e.decided_at ? (e.outcome === 'out' ? 'out' : null) : 'waiting';
}
