import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {oursAccounts} from '../server/ours.mjs';
import {doorProblem, questionProblem, shut} from '../server/entry.mjs';
import {newSessionToken, sha256} from '../server/tokens.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

// A stand-in for Argon2, which older Node doesn't have: what is tested here is the way in, not the hashing.
const HASHING = {available: true, hash: async p => 'test$' + p, verify: async (h, p) => h === 'test$' + p, stale: () => false};

test('a choice question has words, two to four different choices and one marked right; a short one only words', () => {
  assert.equal(questionProblem({text: '这里是什么地方？', choices: ['积木小屋', '论坛'], answer: 0}), null);
  assert.equal(questionProblem({kind: 'text', text: '你多大了？'}), null);
  for (const bad of [
    null, {text: '', choices: ['a', 'b'], answer: 0}, {text: '题', choices: ['a'], answer: 0}, {text: '题', choices: ['a', 'b', 'c', 'd', 'e'], answer: 0},
    {text: '题', choices: ['a', 'a'], answer: 0}, {text: '题', choices: ['a', ' '], answer: 0}, {text: '题', choices: ['a', 'b'], answer: 2},
    {text: '题', choices: ['a', 'b'], answer: '0'}, {text: '字'.repeat(101), choices: ['a', 'b'], answer: 0}, {text: '题', choices: ['a', '字'.repeat(41)], answer: 0},
    {kind: 'essay', text: '题'}, {kind: 'text', text: ' '}
  ]) assert.ok(questionProblem(bad), JSON.stringify(bad)?.slice(0, 60));
  assert.equal(doorProblem({open: true, ask: 3, perDay: 10, total: null}), null);
  for (const bad of [{open: 'yes', ask: 3, perDay: 1, total: 1}, {open: true, ask: 0, perDay: 1, total: 1}, {open: true, ask: 3, perDay: -1, total: 1}, {open: true, ask: 3, perDay: 1}]) assert.ok(doorProblem(bad), JSON.stringify(bad));
  const state = {open: true, questions: {choice: 3, text: 0}, perDay: 2, total: 5, joined: {today: 0, total: 0}};
  assert.equal(shut(state), null);
  assert.equal(shut({...state, open: false}).code, 'quiz_closed');
  assert.equal(shut({...state, questions: {choice: 0, text: 0}}).code, 'quiz_closed');
  assert.equal(shut({...state, questions: {choice: 0, text: 1}}), null);
  assert.equal(shut({...state, joined: {today: 2, total: 2}}).code, 'quiz_full');
  assert.equal(shut({...state, joined: {today: 0, total: 5}}).code, 'quiz_full');
  assert.equal(shut({...state, perDay: null, total: null, joined: {today: 99, total: 99}}), null);
});

// A place run by Wren (signed in by a session made in the database), with Moss who doesn't run it.
async function place(t) {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const people = {};
  for (const name of ['Wren', 'Moss']) {
    const {rows: [{id}]} = await pool.query(`insert into accounts (kind, username, username_key, nickname, password_hash) values ('human', $1, lower($1), '', 'x') returning id`, [name]);
    await pool.query('insert into homes (owner_id) values ($1)', [id]);
    const token = newSessionToken();
    await pool.query(`insert into sessions (account_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')`, [id, sha256(token)]);
    people[name] = token;
  }
  const ours = oursAccounts('Wren');
  const server = createServer({db: {pool, migrations: await loadMigrations()}, api: createApi({pool, ours, hashing: HASHING, limits: {signups: {size: 1000, every: 1}, invites: {limit: 1000, window: 60_000}, signins: {limit: 1000, window: 60_000}}}), ours});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, {as, token, body} = {}) => {
    const auth = as ? people[as] : token;
    const res = await fetch(base + path, {method, headers: {...(auth ? {Authorization: 'Bearer ' + auth} : {}), ...(body ? {'Content-Type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined});
    return {status: res.status, body: res.status === 204 ? null : await res.json()};
  };
  const join = (username, extra = {}) => call('POST', '/api/accounts', {body: {username, password: 'secret-' + username, adult: true, ...extra}});
  const signIn = username => call('POST', '/api/sessions', {body: {username, password: 'secret-' + username}});
  return {pool, call, join, signIn};
}

const QUESTIONS = [
  {text: '门廊灯亮着是什么意思？', choices: ['邻居能走到门口', '主人在线', '停电了'], answer: 0},
  {text: '收到不想要的东西怎么办？', choices: ['在街上骂人', '点不收或者拉黑'], answer: 1},
  {text: '这条街上的东西是用什么拼的？', choices: ['照片', '积木', '贴纸', '油画'], answer: 1},
  {text: '能把别人家的东西拿去卖吗？', choices: ['能', '不能'], answer: 1}
];
const rightOf = question => QUESTIONS.find(q => q.text === question.text);
// Answers to drawn questions: the right choice (or, for the first `wrong` choice questions, a wrong one), and words
// for a short one.
const answer = (questions, wrong = 0) => questions.map((q, i) => (q.kind === 'text'
  ? {id: q.id, answer: '二十六岁，想和他有个家'}
  : {id: q.id, answer: i < wrong ? q.choices.find(c => c !== rightOf(q).choices[rightOf(q).answer]) : rightOf(q).choices[rightOf(q).answer]}));
const draw = async call => (await call('GET', '/api/entry-questions')).body.questions;

test('the keeper writes the questions and opens the door; only the keeper', needsDatabase, async t => {
  const {call} = await place(t);
  for (const [method, path, body] of [['GET', '/api/keeper/entry'], ['PUT', '/api/keeper/entry', {open: true, ask: 3, perDay: 10, total: 200}], ['POST', '/api/keeper/entry/questions', QUESTIONS[0]], ['POST', '/api/keeper/entry/answers/1/in']]) {
    assert.equal((await call(method, path, {as: 'Moss', body})).status, 403, path);
    assert.equal((await call(method, path, {body})).status, 401, path);
  }
  const start = (await call('GET', '/api/keeper/entry', {as: 'Wren'})).body;
  assert.deepEqual(start.door, {open: false, rules: '', ask: 3, perDay: 10, total: 200, joined: {today: 0, total: 0}, waiting: 0});
  assert.deepEqual([start.questions, start.waiting], [[], []]);
  const written = await call('POST', '/api/keeper/entry/questions', {as: 'Wren', body: {...QUESTIONS[0], text: '  门廊灯亮着是什么意思？ '}});
  assert.equal(written.status, 201);
  assert.equal(written.body.question.text, '门廊灯亮着是什么意思？');
  assert.equal(written.body.question.kind, 'choice');
  assert.equal((await call('POST', '/api/keeper/entry/questions', {as: 'Wren', body: {...QUESTIONS[0], answer: 5}})).status, 400);
  const changed = await call('PUT', '/api/keeper/entry/questions/' + written.body.question.id, {as: 'Wren', body: {...QUESTIONS[0], choices: ['邻居能走到门口', '主人睡了'], answer: 0}});
  assert.deepEqual(changed.body.question.choices, ['邻居能走到门口', '主人睡了']);
  // A choice question stays one.
  assert.equal((await call('PUT', '/api/keeper/entry/questions/' + written.body.question.id, {as: 'Wren', body: {kind: 'text', text: '你多大了？'}})).status, 404);
  assert.equal((await call('PUT', '/api/keeper/entry/questions/999999', {as: 'Wren', body: QUESTIONS[0]})).status, 404);
  assert.equal((await call('DELETE', '/api/keeper/entry/questions/' + written.body.question.id, {as: 'Wren'})).status, 204);
  assert.equal((await call('DELETE', '/api/keeper/entry/questions/' + written.body.question.id, {as: 'Wren'})).status, 404);
  // At most three short ones: each is read by a person.
  for (let i = 0; i < 3; i++) assert.equal((await call('POST', '/api/keeper/entry/questions', {as: 'Wren', body: {kind: 'text', text: `简答 ${i}`}})).body.question.kind, 'text');
  assert.equal((await call('POST', '/api/keeper/entry/questions', {as: 'Wren', body: {kind: 'text', text: '第四道'}})).body.error.code, 'too_many');
  assert.equal((await call('PUT', '/api/keeper/entry', {as: 'Wren', body: {open: true, ask: 9, perDay: 1, total: 1}})).status, 400);
  const opened = await call('PUT', '/api/keeper/entry', {as: 'Wren', body: {open: true, rules: ' 门廊灯亮着，邻居就能走到你家门口。\n收到不想要的，点不收。 ', ask: 2, perDay: null, total: 50}});
  assert.deepEqual(opened.body.door, {open: true, rules: '门廊灯亮着，邻居就能走到你家门口。\n收到不想要的，点不收。', ask: 2, perDay: null, total: 50, joined: {today: 0, total: 0}, waiting: 0});
  assert.deepEqual((await call('GET', '/api/accounts')).body, {invite: true, quiz: true});
  // The rules come with the questions; left out of a change, they stay.
  assert.equal((await call('GET', '/api/entry-questions')).body.rules, '门廊灯亮着，邻居就能走到你家门口。\n收到不想要的，点不收。');
  assert.equal((await call('PUT', '/api/keeper/entry', {as: 'Wren', body: {open: true, ask: 2, perDay: 5, total: 50}})).body.door.rules, '门廊灯亮着，邻居就能走到你家门口。\n收到不想要的，点不收。');
  assert.equal((await call('PUT', '/api/keeper/entry', {as: 'Wren', body: {open: true, rules: '字'.repeat(2001), ask: 2, perDay: 5, total: 50}})).status, 400);
});

test('choice questions only: a newcomer answers them all right to hang a plate; only so many a day and in all', needsDatabase, async t => {
  const {pool, call, join} = await place(t);
  for (const q of QUESTIONS) assert.equal((await call('POST', '/api/keeper/entry/questions', {as: 'Wren', body: q})).status, 201);
  // Closed: no questions, and answers don't open the door.
  assert.equal((await call('GET', '/api/entry-questions')).body.error.code, 'quiz_closed');
  assert.equal((await join('Fern', {answers: []})).body.error.code, 'quiz_closed');
  await call('PUT', '/api/keeper/entry', {as: 'Wren', body: {open: true, ask: 3, perDay: 2, total: 3}});
  assert.deepEqual((await call('GET', '/api/accounts')).body, {invite: true, quiz: true});
  const drawn = await draw(call);
  assert.equal(drawn.length, 3);
  assert.ok(drawn.every(q => q.kind === 'choice' && !('answer' in q) && QUESTIONS.some(k => k.text === q.text && [...k.choices].sort().join() === [...q.choices].sort().join())));
  // Not an adult, too few, the same one twice, one wrong.
  assert.equal((await join('Fern', {answers: answer(drawn), adult: false})).body.error.code, 'adult_needed');
  assert.equal((await join('Fern', {answers: answer(drawn).slice(0, 2)})).body.error.code, 'quiz_unfinished');
  assert.equal((await join('Fern', {answers: [...answer(drawn).slice(0, 2), answer(drawn)[0]]})).body.error.code, 'quiz_unfinished');
  const wrong = await join('Fern', {answers: answer(drawn, 1)});
  assert.equal(wrong.body.error.code, 'quiz_wrong');
  assert.match(wrong.body.error.message, /1 道/);
  // All right: in at once (no short answers to read), and counted.
  const fern = await join('Fern', {answers: answer(drawn)});
  assert.equal(fern.status, 201);
  assert.ok(fern.body.session.token);
  const {rows: [came]} = await pool.query("select came_by, adult_at, disabled_at from accounts where username = 'Fern'");
  assert.equal(came.came_by, 'quiz');
  assert.ok(came.adult_at && !came.disabled_at);
  assert.equal((await join('Sorrel', {answers: answer(await draw(call))})).status, 201);
  // Two today: full for today, though an invitation still works and doesn't count.
  assert.equal((await call('GET', '/api/entry-questions')).body.error.code, 'quiz_full');
  assert.equal((await join('Tansy', {answers: answer(drawn)})).body.error.code, 'quiz_full');
  assert.deepEqual((await call('GET', '/api/accounts')).body, {invite: true, quiz: false});
  const invite = (await call('POST', '/api/keeper/invites', {as: 'Wren', body: {}})).body.invite;
  assert.equal((await join('Tansy', {invite: invite.code})).status, 201);
  assert.deepEqual((await call('GET', '/api/keeper/entry', {as: 'Wren'})).body.door.joined, {today: 2, total: 2});
  // A day later there is room again, until the total is reached.
  await pool.query("update accounts set created_at = now() - interval '2 days' where came_by = 'quiz'");
  assert.equal((await join('Yarrow', {answers: answer(await draw(call))})).status, 201);
  assert.equal((await call('GET', '/api/entry-questions')).body.error.code, 'quiz_full');
  assert.match((await join('Zinnia', {answers: answer(drawn)})).body.error.message, /名额满了/);
});

test('with short answers the plate waits to be read: let in, it lights; not, it goes and the name is free', needsDatabase, async t => {
  const {pool, call, join, signIn} = await place(t);
  for (const q of QUESTIONS.slice(0, 2)) await call('POST', '/api/keeper/entry/questions', {as: 'Wren', body: q});
  await call('POST', '/api/keeper/entry/questions', {as: 'Wren', body: {kind: 'text', text: '你多大了？为什么想来？'}});
  await call('PUT', '/api/keeper/entry', {as: 'Wren', body: {open: true, ask: 5, perDay: null, total: null}});
  const drawn = await draw(call);
  assert.deepEqual(drawn.map(q => q.kind), ['choice', 'choice', 'text']);
  assert.ok(!('choices' in drawn[2]));
  // The short answer has to be written.
  assert.equal((await join('Fern', {answers: answer(drawn).map(a => (a.id === drawn[2].id ? {...a, answer: '  '} : a))})).body.error.code, 'quiz_unfinished');
  const fern = await join('Fern', {answers: answer(drawn)});
  assert.equal(fern.status, 202);
  assert.equal(fern.body.pending, true);
  assert.equal(fern.body.recoveryCodes.length, 10);
  assert.equal(fern.body.session, undefined);
  // Waiting: can't light the lamp, and isn't on the street.
  assert.equal((await signIn('Fern')).body.error.code, 'waiting');
  const {rows: [home]} = await pool.query("select h.street_id, h.lot from homes h join accounts a on a.id = h.owner_id where a.username = 'Fern'");
  assert.equal((await call('GET', `/api/doors/${home.street_id}/${home.lot}?day=${new Date().toISOString().slice(0, 10)}`, {as: 'Moss'})).status, 404);
  assert.deepEqual((await call('GET', '/api/me', {as: 'Wren'})).body.keeper, {reports: 0, waiting: 1});
  const [waiting] = (await call('GET', '/api/keeper/entry', {as: 'Wren'})).body.waiting;
  assert.deepEqual([waiting.name, waiting.answers], ['Fern', [{question: '你多大了？为什么想来？', answer: '二十六岁，想和他有个家'}]]);
  // Let in: lights, and is on the street.
  const inside = await call('POST', `/api/keeper/entry/answers/${waiting.id}/in`, {as: 'Wren'});
  assert.equal(inside.body.entry.outcome, 'in');
  assert.equal((await signIn('Fern')).status, 201);
  assert.equal((await call('GET', `/api/doors/${home.street_id}/${home.lot}?day=${new Date().toISOString().slice(0, 10)}`, {as: 'Moss'})).status, 200);
  // Deciding again changes nothing.
  assert.equal((await call('POST', `/api/keeper/entry/answers/${waiting.id}/out`, {as: 'Wren'})).body.entry.outcome, 'in');
  // Not let in: the account and its home go, the name is free, and signing in says what happened.
  assert.equal((await join('Sorrel', {answers: answer(await draw(call))})).status, 202);
  const [sorrel] = (await call('GET', '/api/keeper/entry', {as: 'Wren'})).body.waiting;
  assert.equal((await call('POST', `/api/keeper/entry/answers/${sorrel.id}/out`, {as: 'Wren'})).body.entry.outcome, 'out');
  const {rows: gone} = await pool.query("select 1 from accounts where username = 'Sorrel'");
  assert.equal(gone.length, 0);
  assert.equal((await signIn('Sorrel')).body.error.code, 'not_let_in');
  assert.equal((await call('POST', '/api/keeper/entry/answers/999999/in', {as: 'Wren'})).status, 404);
  assert.equal((await join('Sorrel', {answers: answer(await draw(call))})).status, 202);
});

test('two at once by the questions when only one may: one door plate', needsDatabase, async t => {
  const {call, join} = await place(t);
  for (const q of QUESTIONS) await call('POST', '/api/keeper/entry/questions', {as: 'Wren', body: q});
  await call('PUT', '/api/keeper/entry', {as: 'Wren', body: {open: true, ask: 4, perDay: 1, total: null}});
  const drawn = await draw(call);
  const both = await Promise.all(['Fern', 'Sorrel', 'Tansy'].map(name => join(name, {answers: answer(drawn)})));
  assert.deepEqual(both.map(r => r.status).sort(), [201, 403, 403]);
});
