import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const databaseDir = path.join(backendRoot, '.data', 'postgres');
const DB_NAME = 'hr_workforce';

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
});

async function ensureDatabase() {
  const client = pg.getPgClient();
  await client.connect();
  try {
    const exists = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [DB_NAME],
    );
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Created database ${DB_NAME}`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  await pg.initialise();
  await pg.start();
  await ensureDatabase();

  console.log('');
  console.log('Embedded PostgreSQL is running.');
  console.log(
    `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${DB_NAME}?schema=public`,
  );
  console.log('Press Ctrl+C to stop.\n');

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
