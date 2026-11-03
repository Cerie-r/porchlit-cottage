import {createHash} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPool, databaseConfig} from './db.mjs';
import {checkCanary, keySecret} from './keys.mjs';

// Schema changes are numbered SQL files in server/migrations/, applied in
// order. A file that has been applied is never edited again: the next change
// is a new file. Each file's checksum is recorded, so an edit is caught
// instead of silently drifting from what the database really has.

export const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations/', import.meta.url));

// Every runner takes this lock, so two processes (the release phase and a
// developer, or two dynos) never migrate at the same time.
const LOCK = 0x706f7263;

const LEDGER = `create table if not exists schema_migrations (
  version text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
)`;

export async function loadMigrations(dir = MIGRATIONS_DIR) {
  const names = (await readdir(dir)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  return Promise.all(names.map(async name => {
    const sql = await readFile(path.join(dir, name), 'utf8');
    return {version: name.slice(0, -'.sql'.length), sql, checksum: createHash('sha256').update(sql).digest('hex')};
  }));
}

async function appliedVersions(client) {
  try {
    const {rows} = await client.query('select version, checksum from schema_migrations');
    return new Map(rows.map(row => [row.version, row.checksum]));
  } catch (err) {
    if (err.code === '42P01') return new Map(); // no ledger yet: nothing applied
    throw err;
  }
}

function changedMigrations(applied, migrations) {
  return migrations.filter(m => applied.has(m.version) && applied.get(m.version) !== m.checksum).map(m => m.version);
}

// Applies whatever hasn't been applied yet, all in one transaction: either
// every pending file goes in, or none does. Returns the versions applied.
// Versions the database has but these files don't (after rolling the code
// back) are left alone.
export async function migrate(pool, {migrations, log = () => {}} = {}) {
  migrations ??= await loadMigrations();
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock($1)', [LOCK]);
    await client.query(LEDGER);
    const applied = await appliedVersions(client);
    const changed = changedMigrations(applied, migrations);
    if (changed.length) throw new Error(`already-applied migrations were edited: ${changed.join(', ')}. Put the change in a new migration instead.`);
    const done = [];
    for (const m of migrations) {
      if (applied.has(m.version)) continue;
      await client.query(m.sql);
      await client.query('insert into schema_migrations (version, checksum) values ($1, $2)', [m.version, m.checksum]);
      done.push(m.version);
      log(`applied ${m.version}`);
    }
    await client.query('commit');
    return done;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ok: up to date. behind: some migrations haven't run. changed: an applied
// migration was edited. down: the database can't be reached or read.
export async function schemaStatus(pool, migrations) {
  try {
    const applied = await appliedVersions(pool);
    if (changedMigrations(applied, migrations).length) return 'changed';
    return migrations.every(m => applied.has(m.version)) ? 'ok' : 'behind';
  } catch {
    return 'down';
  }
}

// `node server/migrate.mjs`: Heroku runs this in the release phase, before a
// new version starts serving. Without a database there is nothing to do.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = databaseConfig();
  if (!config) {
    console.log('No DATABASE_URL, so there is nothing to migrate.');
  } else {
    const pool = createPool({...config, max: 1}, {statementTimeout: 0, connectTimeout: 15000});
    try {
      const done = await migrate(pool, {log: line => console.log(line)});
      console.log(done.length ? `Database updated: ${done.length} migration(s) applied.` : 'Database was already up to date.');
      // The key canary (server/keys.mjs), signed the first time and checked every time after: a key secret that has
      // changed fails the release here, before the new version (or the changed setting) starts serving.
      const secret = keySecret();
      if (secret) {
        try {
          console.log(`Key canary: ${await checkCanary(pool, secret)}.`);
        } catch (err) {
          console.error('Key canary:', err.message);
          process.exitCode = 1;
        }
      }
    } catch (err) {
      console.error('Migration failed, nothing was changed:', err.message);
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  }
}
