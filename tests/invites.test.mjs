import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {oursAccounts} from '../server/ours.mjs';
import {OPEN_INVITES_MAX, inviteNeeded, labelProblem, newInviteCode, normalizeInvite, showInvite} from '../server/invites.mjs';
import {newSessionToken, sha256} from '../server/tokens.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

// A stand-in for Argon2, which older Node doesn't have: what is tested here is the door plate, not the hashing.
const HASHING = {available: true, hash: async p => 'test$' + p, verify: async (h, p) => h === 'test$' + p, stale: () => false};

test('an invitation code: eight letters from Crockford base 32, read however it was typed', () => {
  const codes = new Set(Array.from({length: 200}, newInviteCode));
  assert.equal(codes.size, 200);
  for (const code of codes) assert.match(code, /^[0-9A-HJKMNP-TV-Z]{8}$/);
  assert.equal(showInvite('ABCD2345'), 'ABCD-2345');
  assert.equal(normalizeInvite('abcd-2345'), 'ABCD2345');
  assert.equal(normalizeInvite(' ab cd 23 45 '), 'ABCD2345');
  assert.equal(normalizeInvite('OIL0-ABCD'), '0110ABCD');
  assert.equal(normalizeInvite('ＡＢＣＤ２３４５'), 'ABCD2345');
  for (const bad of ['ABCD-234', 'ABCD-23456', 'ABCU2345', '', null, 12345678, 'A'.repeat(65)]) assert.equal(normalizeInvite(bad), null, String(bad));
});

test('an invitation is needed once someone runs the place', () => {
  assert.equal(inviteNeeded(oursAccounts('Wren, Fern')), true);
  assert.equal(inviteNeeded(oursAccounts('')), false);
  assert.equal(labelProblem(undefined), null);
  assert.equal(labelProblem('给隔壁的小雀'), null);
  assert.ok(labelProblem('字'.repeat(33)));
  assert.ok(labelProblem(5));
});

// A place run by `keepers`, with Wren (and Moss, who doesn't run it) signed in by sessions made in the database.
async function place(t, {keepers = 'Wren'} = {}) {
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
  const ours = oursAccounts(keepers);
  const api = createApi({pool, ours, hashing: HASHING, limits: {signups: {size: 1000, every: 1}, invites: {limit: 1000, window: 60_000}}});
  const server = createServer({db: {pool, migrations: await loadMigrations()}, api, ours});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, {as, body} = {}) => {
    const res = await fetch(base + path, {method, headers: {...(as ? {Authorization: 'Bearer ' + people[as]} : {}), ...(body ? {'Content-Type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined});
    return {status: res.status, body: res.status === 204 ? null : await res.json()};
  };
  const join = (username, invite) => call('POST', '/api/accounts', {body: {username, password: 'secret-' + username, adult: true, ...(invite === undefined ? {} : {invite})}});
  return {pool, call, join};
}

test('a door plate takes an invitation the running home wrote, once', needsDatabase, async t => {
  const {pool, call, join} = await place(t);
  assert.deepEqual((await call('GET', '/api/accounts')).body, {invite: true, quiz: false});
  // Without one, with one that can't be, with one nobody wrote.
  assert.equal((await join('Fern')).body.error.code, 'invite_needed');
  assert.equal((await join('Fern', 'nope')).body.error.code, 'invite_needed');
  assert.equal((await join('Fern', 'ABCD-2345')).body.error.code, 'invite_wrong');
  // Only the running home writes them, or sees them.
  for (const [method, path] of [['GET', '/api/keeper/invites'], ['POST', '/api/keeper/invites']]) {
    assert.equal((await call(method, path, {as: 'Moss', body: method === 'POST' ? {} : undefined})).status, 403);
    assert.equal((await call(method, path, {body: method === 'POST' ? {} : undefined})).status, 401);
  }
  const written = await call('POST', '/api/keeper/invites', {as: 'Wren', body: {label: ' 给小雀 '}});
  assert.equal(written.status, 201);
  const {invite} = written.body;
  assert.match(invite.code, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(invite.label, '给小雀');
  assert.equal(invite.state, 'open');
  assert.ok(Date.parse(invite.until) - Date.now() > 29 * 86400000);
  // Everyone says they are an adult; saying nothing doesn't spend it.
  const unsaid = await call('POST', '/api/accounts', {body: {username: 'Fern', password: 'secret-Fern', invite: invite.code}});
  assert.equal(unsaid.body.error.code, 'adult_needed');
  assert.equal((await call('POST', '/api/accounts', {body: {username: 'Fern', password: 'secret-Fern', invite: invite.code, adult: 'yes'}})).body.error.code, 'adult_needed');
  // Typed loosely, it works; then it is spent.
  const joined = await join('Fern', invite.code.toLowerCase().replace('-', ' '));
  assert.equal(joined.status, 201);
  assert.equal(joined.body.account.username, 'Fern');
  assert.equal((await join('Sorrel', invite.code)).body.error.code, 'invite_wrong');
  const [listed] = (await call('GET', '/api/keeper/invites', {as: 'Wren'})).body.invites;
  assert.equal(listed.state, 'used');
  assert.deepEqual(listed.usedBy, {name: 'Fern', nickname: ''});
  const {rows: [fern]} = await pool.query("select came_by, adult_at from accounts where username = 'Fern'");
  assert.equal(fern.came_by, 'invite');
  assert.ok(fern.adult_at);
  // A taken name doesn't spend one.
  const spare = (await call('POST', '/api/keeper/invites', {as: 'Wren', body: {}})).body.invite;
  assert.equal((await join('Moss', spare.code)).body.error.code, 'username_taken');
  assert.equal((await call('GET', '/api/keeper/invites', {as: 'Wren'})).body.invites[0].state, 'open');
  // Two at once with the same one: one door plate, not two.
  const both = await Promise.all([join('Sorrel', spare.code), join('Tansy', spare.code)]);
  assert.deepEqual(both.map(r => r.status).sort(), [201, 403]);
  const {rows: [{n}]} = await pool.query("select count(*)::int as n from accounts where username in ('Sorrel', 'Tansy')");
  assert.equal(n, 1);
});

test('an invitation can be torn up before it is used, and runs out', needsDatabase, async t => {
  const {pool, call, join} = await place(t);
  const write = async () => (await call('POST', '/api/keeper/invites', {as: 'Wren', body: {}})).body.invite;
  const torn = await write();
  assert.equal((await call('DELETE', '/api/keeper/invites/' + torn.id, {as: 'Moss'})).status, 403);
  assert.equal((await call('DELETE', '/api/keeper/invites/' + torn.id, {as: 'Wren'})).status, 204);
  assert.equal((await call('DELETE', '/api/keeper/invites/' + torn.id, {as: 'Wren'})).status, 204);
  assert.equal((await join('Fern', torn.code)).body.error.code, 'invite_wrong');
  const old = await write();
  await pool.query("update invites set created_at = now() - interval '40 days', expires_at = now() - interval '10 days' where id = $1", [old.id]);
  assert.equal((await join('Fern', old.code)).body.error.code, 'invite_wrong');
  const used = await write();
  assert.equal((await join('Fern', used.code)).status, 201);
  assert.equal((await call('DELETE', '/api/keeper/invites/' + used.id, {as: 'Wren'})).status, 404);
  const states = Object.fromEntries((await call('GET', '/api/keeper/invites', {as: 'Wren'})).body.invites.map(i => [i.id, i.state]));
  assert.deepEqual(states, {[torn.id]: 'torn', [old.id]: 'expired', [used.id]: 'used'});
  // Only while its writer still runs the place, and isn't switched off.
  const fromMoss = newInviteCode();
  await pool.query(`insert into invites (code, written_by, expires_at) values ($1, (select id from accounts where username = 'Moss'), now() + interval '1 day')`, [fromMoss]);
  assert.equal((await join('Sorrel', fromMoss)).body.error.code, 'invite_wrong');
  const late = await write();
  await pool.query("update accounts set disabled_at = now() where username = 'Wren'");
  assert.equal((await join('Sorrel', late.code)).body.error.code, 'invite_wrong');
  await pool.query("update accounts set disabled_at = null where username = 'Wren'");
  assert.equal((await join('Sorrel', late.code)).status, 201);
  // Only so many open at once.
  await pool.query(`insert into invites (code, written_by, expires_at) select lpad(g::text, 8, '0'), (select id from accounts where username = 'Wren'), now() + interval '1 day' from generate_series(1, ${OPEN_INVITES_MAX}) g`);
  assert.equal((await call('POST', '/api/keeper/invites', {as: 'Wren', body: {}})).body.error.code, 'too_many');
  assert.equal((await call('POST', '/api/keeper/invites', {as: 'Wren', body: {label: '字'.repeat(40)}})).status, 400);
});

test('a name the place is run by is hung before it is named, never through the door; a place nobody runs needs none', needsDatabase, async t => {
  const run = await place(t, {keepers: 'Wren, Fern'});
  const invite = (await run.call('POST', '/api/keeper/invites', {as: 'Wren', body: {}})).body.invite;
  // Fern is named but has no door plate yet: nobody may take the name, invitation or not.
  assert.equal((await run.join('Fern')).body.error.code, 'username_taken');
  assert.equal((await run.join('ＦＥＲＮ', invite.code)).body.error.code, 'username_taken');
  assert.equal((await run.join('Sorrel')).body.error.code, 'invite_needed');
  assert.equal((await run.join('Sorrel', invite.code)).status, 201);
  const open = await place(t, {keepers: ''});
  assert.deepEqual((await open.call('GET', '/api/accounts')).body, {invite: false, quiz: false});
  assert.equal((await open.join('Sorrel')).status, 201);
  assert.equal((await open.call('GET', '/api/keeper/invites', {as: 'Wren'})).status, 403);
});

test('a person holds one invitation for their own AI, which no person can hang a plate with', needsDatabase, async t => {
  const {call, join} = await place(t);
  assert.equal((await call('GET', '/api/home/ai-invite')).status, 401);
  // Moss lives on the street without running it: he may hold one, one at a time.
  assert.deepEqual((await call('GET', '/api/home/ai-invite', {as: 'Moss'})).body, {needed: true, invite: null});
  const made = await call('POST', '/api/home/ai-invite', {as: 'Moss'});
  assert.equal(made.status, 201);
  const {invite} = made.body;
  assert.match(invite.code, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(invite.state, 'open');
  const days = (new Date(invite.until) - Date.now()) / 86400e3;
  assert.ok(days > 6.9 && days <= 7, String(days));
  const again = await call('POST', '/api/home/ai-invite', {as: 'Moss'});
  assert.equal(again.status, 200);
  assert.equal(again.body.invite.code, invite.code);
  assert.equal((await call('GET', '/api/home/ai-invite', {as: 'Moss'})).body.invite.code, invite.code);
  // It opens nothing for a person.
  assert.equal((await join('Fern', invite.code)).body.error.code, 'invite_wrong');
  // The running home's list is its own invitations only, its own one for an AI included.
  await call('POST', '/api/home/ai-invite', {as: 'Wren'});
  assert.deepEqual((await call('GET', '/api/keeper/invites', {as: 'Wren'})).body.invites, []);
  // Torn up, it's gone; a new one is a new code.
  assert.equal((await call('DELETE', '/api/home/ai-invite', {as: 'Moss'})).status, 204);
  assert.equal((await call('GET', '/api/home/ai-invite', {as: 'Moss'})).body.invite, null);
  assert.equal((await call('DELETE', '/api/home/ai-invite', {as: 'Moss'})).status, 404);
  assert.notEqual((await call('POST', '/api/home/ai-invite', {as: 'Moss'})).body.invite.code, invite.code);
  // A place nobody runs asks for none.
  const open = await place(t, {keepers: ''});
  assert.equal((await open.call('GET', '/api/home/ai-invite', {as: 'Moss'})).body.needed, false);
});
