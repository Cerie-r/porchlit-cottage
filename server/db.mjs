import pg from 'pg';

// The database is optional. Without DATABASE_URL the house is served exactly
// as before and /health reports the database as off.

const LOCAL_HOSTS = new Set(['', 'localhost', '127.0.0.1', '[::1]', '::1']);
const SSL_MODES = {
  disable: false,
  'no-verify': {rejectUnauthorized: false},
  allow: {rejectUnauthorized: false},
  prefer: {rejectUnauthorized: false},
  require: {rejectUnauthorized: false},
  verify: true,
  'verify-ca': true,
  'verify-full': true
};

// Connections per process. Heroku Postgres Essential-0 allows 20 in total, so
// processes × PG_POOL_MAX, plus one for the release phase and a spare for
// maintenance, has to stay under that.
export function poolSize(env = process.env) {
  const n = Number.parseInt(env.PG_POOL_MAX ?? '', 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 18) : 5;
}

// Connection settings from DATABASE_URL, or null when there is none.
// Remote databases are encrypted without checking the certificate (Heroku
// Postgres certificates aren't in the default trust store); local ones aren't
// encrypted. DATABASE_SSL, or sslmode in the URL, overrides that. sslmode is
// taken out of the URL because pg would let it override the ssl option.
export function databaseConfig(env = process.env) {
  const raw = env.DATABASE_URL?.trim();
  if (!raw) return null;
  const url = new URL(raw);
  const asked = env.DATABASE_SSL?.trim() || url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');
  const socket = url.searchParams.get('host');
  const local = LOCAL_HOSTS.has(url.hostname) && (!socket || socket.startsWith('/'));
  const mode = asked || (local ? 'disable' : 'no-verify');
  if (!Object.hasOwn(SSL_MODES, mode)) throw new Error(`unknown database SSL mode "${mode}"`);
  return {connectionString: url.toString(), ssl: SSL_MODES[mode], max: poolSize(env)};
}

export function createPool(config, {statementTimeout = 15000, connectTimeout = 5000} = {}) {
  const pool = new pg.Pool({
    ...config,
    application_name: 'porchlit',
    connectionTimeoutMillis: connectTimeout,
    idleTimeoutMillis: 30000,
    ...(statementTimeout ? {statement_timeout: statementTimeout} : {})
  });
  // An idle connection dropped by the server must not take the process down.
  pool.on('error', err => console.error('database: an idle connection failed:', err.message));
  return pool;
}
