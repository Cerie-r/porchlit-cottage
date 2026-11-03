import test from 'node:test';
import assert from 'node:assert/strict';
import {createPool, databaseConfig, poolSize} from '../server/db.mjs';
import {loadMigrations, migrate, schemaStatus} from '../server/migrate.mjs';
import {createServer} from '../server/index.mjs';
import {freshDatabase, needsDatabase as needsDb} from './support/postgres.mjs';

async function health(db) {
  const server = createServer({db});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    return await (await fetch(`http://127.0.0.1:${server.address().port}/health`)).json();
  } finally {
    await new Promise(resolve => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
}

const refused = (promise, code, constraint) =>
  assert.rejects(promise, err => err.code === code && (!constraint || err.constraint === constraint));

test('database settings: none without a URL, local unencrypted, remote encrypted, sslmode honoured', () => {
  assert.equal(databaseConfig({}), null);
  assert.equal(databaseConfig({DATABASE_URL: '  '}), null);
  const local = databaseConfig({DATABASE_URL: 'postgres://u:p@localhost:5432/porchlit'});
  assert.equal(local.ssl, false);
  assert.equal(local.max, 5);
  assert.equal(databaseConfig({DATABASE_URL: 'postgres:///porchlit?host=/var/run/postgresql'}).ssl, false);
  assert.deepEqual(databaseConfig({DATABASE_URL: 'postgres://u:p@ec2-1-2-3-4.compute-1.amazonaws.com:5432/d1'}).ssl, {rejectUnauthorized: false});
  const verified = databaseConfig({DATABASE_URL: 'postgres://u:p@db.example.com/d?sslmode=verify-full&application_name=x'});
  assert.equal(verified.ssl, true);
  assert.ok(!verified.connectionString.includes('sslmode'));
  assert.ok(verified.connectionString.includes('application_name=x'));
  assert.equal(databaseConfig({DATABASE_URL: 'postgres://u@db.example.com/d?sslmode=require', DATABASE_SSL: 'disable'}).ssl, false);
  assert.throws(() => databaseConfig({DATABASE_URL: 'postgres://u@db.example.com/d', DATABASE_SSL: 'sometimes'}), /SSL mode/);
  assert.equal(poolSize({PG_POOL_MAX: '8'}), 8);
  assert.equal(poolSize({PG_POOL_MAX: '0'}), 1);
  assert.equal(poolSize({PG_POOL_MAX: '50'}), 18);
  assert.equal(poolSize({PG_POOL_MAX: 'lots'}), 5);
});

test('health says the database is off when there is none', async () => {
  assert.deepEqual(await health(null), {status: 'ok', database: 'off'});
});

test('migrations apply once, all together, and record their checksums', needsDb, async t => {
  const pool = (await freshDatabase(t)).pool();
  const migrations = await loadMigrations();
  assert.ok(migrations.length >= 1);
  assert.equal(await schemaStatus(pool, migrations), 'behind');
  assert.deepEqual(await migrate(pool, {migrations}), migrations.map(m => m.version));
  assert.deepEqual(await migrate(pool, {migrations}), []);
  assert.equal(await schemaStatus(pool, migrations), 'ok');
  const {rows} = await pool.query('select version, checksum from schema_migrations order by version');
  assert.deepEqual(rows, migrations.map(({version, checksum}) => ({version, checksum})));
});

test('runners that start at the same moment still apply each migration once', needsDb, async t => {
  const db = await freshDatabase(t);
  const migrations = await loadMigrations();
  const runs = await Promise.all([1, 2, 3].map(() => migrate(db.pool({max: 1}), {migrations})));
  assert.deepEqual(runs.flat().sort(), migrations.map(m => m.version).sort());
});

test('a failing migration leaves nothing behind; an edited one is refused', needsDb, async t => {
  const pool = (await freshDatabase(t)).pool();
  const good = {version: '001_good', sql: 'create table good (id int)', checksum: 'a'};
  const bad = {version: '002_bad', sql: 'create table bad (id int); select no_such_function()', checksum: 'b'};
  await assert.rejects(migrate(pool, {migrations: [good, bad]}), /no_such_function/);
  assert.equal((await pool.query(`select to_regclass('good') as t, to_regclass('schema_migrations') as m`)).rows[0].t, null);
  assert.deepEqual(await migrate(pool, {migrations: [good]}), ['001_good']);
  const edited = {...good, checksum: 'edited'};
  await assert.rejects(migrate(pool, {migrations: [edited]}), /were edited: 001_good/);
  assert.equal(await schemaStatus(pool, [edited]), 'changed');
  // A version only the database knows (the code was rolled back) is left alone.
  assert.equal(await schemaStatus(pool, []), 'ok');
  assert.deepEqual(await migrate(pool, {migrations: []}), []);
});

test('the database itself keeps the account rules', needsDb, async t => {
  const pool = (await freshDatabase(t)).pool();
  await migrate(pool);
  const account = async (kind, name) => (await pool.query(
    'insert into accounts (kind, username, username_key, password_hash) values ($1, $2, $3, $4) returning id',
    [kind, name, name.normalize('NFKC').toLowerCase(), 'hash'])).rows[0].id;
  const person = await account('human', 'Wren');
  const ai = await account('ai', 'Moth');
  // Usernames are one pool for people and AIs, unique after normalising.
  await refused(account('ai', 'ＷＲＥＮ'), '23505', 'accounts_username_unique');
  await refused(account('robot', 'Lark'), '23514');
  // One home per person, and only people own homes.
  const home = (await pool.query('insert into homes (owner_id) values ($1) returning id', [person])).rows[0].id;
  await refused(pool.query('insert into homes (owner_id) values ($1)', [person]), '23505', 'homes_one_per_owner');
  await refused(pool.query('insert into homes (owner_id) values ($1)', [ai]), '23503', 'homes_owner_is_a_person');
  // The save is one JSON object with a revision that starts at 1.
  await refused(pool.query('insert into home_saves (home_id, doc) values ($1, $2)', [home, '[]']), '23514');
  await refused(pool.query('insert into home_saves (home_id, doc, revision) values ($1, $2, 0)', [home, {format: 'porchlit-home'}]), '23514');
  const save = (await pool.query('insert into home_saves (home_id, doc, updated_by) values ($1, $2, $3) returning revision, doc',
    [home, {format: 'porchlit-home', version: 1, data: {}}, person])).rows[0];
  assert.deepEqual(save, {revision: '1', doc: {format: 'porchlit-home', version: 1, data: {}}});
  // Session tokens and recovery codes are kept only as 32-byte hashes, once each.
  const hash = Buffer.alloc(32, 7);
  await refused(pool.query(`insert into sessions (account_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')`, [person, Buffer.alloc(16)]), '23514');
  await pool.query(`insert into sessions (account_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')`, [person, hash]);
  await refused(pool.query(`insert into sessions (account_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')`, [ai, hash]), '23505', 'sessions_token_unique');
  await pool.query('insert into recovery_codes (account_id, code_hash) values ($1, $2)', [person, hash]);
  await refused(pool.query('insert into recovery_codes (account_id, code_hash) values ($1, $2)', [person, hash]), '23505', 'recovery_codes_unique');
});

test('health reports the database as behind, ok or down', needsDb, async t => {
  const pool = (await freshDatabase(t)).pool();
  const migrations = await loadMigrations();
  assert.equal((await health({pool, migrations})).database, 'behind');
  await migrate(pool, {migrations});
  assert.equal((await health({pool, migrations})).database, 'ok');
  const unreachable = createPool({connectionString: 'postgres://nobody@127.0.0.1:1/none', ssl: false, max: 1}, {connectTimeout: 500});
  t.after(() => unreachable.end());
  assert.equal((await health({pool: unreachable, migrations})).database, 'down');
});
