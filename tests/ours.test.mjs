import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApi} from '../server/api.mjs';
import {createServer} from '../server/index.mjs';
import {loadMigrations, migrate} from '../server/migrate.mjs';
import {isOurs, oursAccounts, oursAis, oursToken} from '../server/ours.mjs';
import {newSessionToken, sha256} from '../server/tokens.mjs';
import {freshDatabase, needsDatabase} from './support/postgres.mjs';

test('whose home it is: the names in OURS_ACCOUNTS, written however they were', () => {
  const ours = oursAccounts(' Wren, ＭＯＳＳ ,,');
  assert.deepEqual([...ours].sort(), ['moss', 'wren']);
  assert.ok(isOurs('wren', ours) && isOurs('WREN', ours) && isOurs('Moss', ours));
  assert.ok(!isOurs('Fern', ours) && !isOurs(null, ours) && !isOurs(undefined, ours));
  assert.equal(oursAccounts('').size, 0);
  assert.equal(oursAccounts(undefined).size, 0);
});

test('the AIs helping run the place are a list of their own, never the keepers in their stead', () => {
  const saved = {OURS_ACCOUNTS: process.env.OURS_ACCOUNTS, OURS_AIS: process.env.OURS_AIS};
  try {
    process.env.OURS_ACCOUNTS = 'Wren';
    delete process.env.OURS_AIS;
    assert.equal(oursAis().size, 0);
    process.env.OURS_AIS = ' Fern, ＭＯＴＨ ,,';
    assert.deepEqual([...oursAis()].sort(), ['fern', 'moth']);
    assert.deepEqual([...oursAccounts()], ['wren']);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('the session comes only in its own cookie, and only when it looks like one', () => {
  const token = newSessionToken();
  assert.equal(oursToken(`a=1; porchlit-ours=${encodeURIComponent(token)}; b=2`), token);
  assert.equal(oursToken(`porchlit-ours=${token}`), token);
  assert.equal(oursToken('porchlit-ours=nope'), null);
  assert.equal(oursToken('porchlit-ours=%E0%A4%A'), null);
  assert.equal(oursToken(`not-porchlit-ours=${token}`), null);
  assert.equal(oursToken(''), null);
  assert.equal(oursToken(undefined), null);
});

// A built site with a file of the home's own and a public one; two people, one of them the home's.
async function site(t, {names = 'Wren'} = {}) {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const files = mkdtempSync(join(tmpdir(), 'porchlit-ours-'));
  t.after(() => rmSync(files, {recursive: true, force: true}));
  mkdirSync(join(files, 'ours'));
  mkdirSync(join(files, 'assets'));
  writeFileSync(join(files, 'ours', 'abc.js'), 'export default "ours";');
  writeFileSync(join(files, 'assets', 'pub.js'), 'export default "everyone";');
  writeFileSync(join(files, 'index.html'), '<!doctype html>');
  const people = {};
  for (const name of ['Wren', 'Moss']) {
    const {rows: [{id}]} = await pool.query(`insert into accounts (kind, username, username_key, nickname, password_hash) values ('human', $1, lower($1), '', 'x') returning id`, [name]);
    await pool.query('insert into homes (owner_id) values ($1)', [id]);
    const token = newSessionToken();
    await pool.query(`insert into sessions (account_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')`, [id, sha256(token)]);
    people[name] = {id, token};
  }
  const ours = oursAccounts(names);
  const server = createServer({db: {pool, migrations: await loadMigrations()}, api: createApi({pool, ours}), ours, files});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path, {cookie, as} = {}) => fetch(base + path, {headers: {...(cookie ? {Cookie: cookie} : {}), ...(as ? {Authorization: 'Bearer ' + people[as].token} : {})}});
  return {pool, people, get};
}

test('the home\'s own things go to that home\'s account alone, signed in; to anyone else they are not there', needsDatabase, async t => {
  const {pool, people, get} = await site(t);
  const cookie = name => `porchlit-ours=${encodeURIComponent(people[name].token)}`;
  const ours = await get('/ours/abc.js', {cookie: cookie('Wren')});
  assert.equal(ours.status, 200);
  assert.equal(await ours.text(), 'export default "ours";');
  assert.match(ours.headers.get('cache-control'), /^private/);
  assert.equal((await get('/ours/abc.js', {method: 'HEAD', cookie: cookie('Wren')})).status, 200);
  // Someone else's session, none, a made-up one, the session in the wrong place: nothing there.
  for (const asked of [{cookie: cookie('Moss')}, {}, {cookie: 'porchlit-ours=' + newSessionToken()}, {as: 'Wren'}, {cookie: `session=${people.Wren.token}`}]) {
    const res = await get('/ours/abc.js', asked);
    assert.equal(res.status, 404, JSON.stringify(Object.keys(asked)));
    assert.equal(res.headers.get('cache-control'), 'no-store');
  }
  // However the path is written, it is where the file is that counts.
  for (const path of ['//ours/abc.js', '/ours//abc.js', '/assets/../ours/abc.js', '/%6Furs/abc.js', '/ours%2Fabc.js', '/ours/']) assert.equal((await get(path, {cookie: cookie('Moss')})).status, 404, path);
  for (const path of ['/%6Furs/abc.js', '/ours%2Fabc.js', '/ours//abc.js']) assert.equal((await get(path, {cookie: cookie('Wren')})).status, 200, path);
  // The public files are everyone's.
  assert.equal((await get('/assets/pub.js')).status, 200);
  assert.equal((await get('/')).status, 200);
  // A session that ended, or an account switched off: nothing either.
  await pool.query('update sessions set revoked_at = now() where account_id = $1', [people.Wren.id]);
  assert.equal((await get('/ours/abc.js', {cookie: cookie('Wren')})).status, 404);
});

test('nobody is the home when nobody is named; /api/me says whose home it is', needsDatabase, async t => {
  const named = await site(t);
  assert.equal((await (await named.get('/api/me', {as: 'Wren'})).json()).ours, true);
  assert.equal((await (await named.get('/api/me', {as: 'Moss'})).json()).ours, false);
  const nobody = await site(t, {names: ''});
  assert.equal((await nobody.get('/ours/abc.js', {cookie: `porchlit-ours=${nobody.people.Wren.token}`})).status, 404);
  assert.equal((await (await nobody.get('/api/me', {as: 'Wren'})).json()).ours, false);
});
