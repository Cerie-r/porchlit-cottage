import pg from 'pg';
import {createPool, databaseConfig} from '../../server/db.mjs';

// Tests that touch the database need a Postgres they may create and drop
// databases in, for example
//   TEST_DATABASE_URL=postgres://user@127.0.0.1:5432/postgres npm test
// Without one those tests are skipped.
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const needsDatabase = TEST_DATABASE_URL ? {} : {skip: 'TEST_DATABASE_URL is not set'};

// A new, empty database for one test, dropped again when the test ends.
export async function freshDatabase(t) {
  const name = `porchlit_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  const admin = new pg.Client({connectionString: TEST_DATABASE_URL});
  await admin.connect();
  await admin.query(`create database ${name}`);
  const url = new URL(TEST_DATABASE_URL);
  url.pathname = `/${name}`;
  const pools = [];
  t.after(async () => {
    await Promise.all(pools.map(p => p.end()));
    await admin.query(`drop database if exists ${name} with (force)`);
    await admin.end();
  });
  return {
    url: url.toString(),
    pool(options = {}) {
      const p = createPool({...databaseConfig({DATABASE_URL: url.toString()}), ...options});
      pools.push(p);
      return p;
    }
  };
}
