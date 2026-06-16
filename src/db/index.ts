import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pkg;

export const isDatabaseUrlValid = (url: string | undefined): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed === "" || trimmed === "undefined" || trimmed === "null") return false;
  if (trimmed.includes("[YOUR") || trimmed.includes("YOUR-PASSWORD") || trimmed.includes("YOUR_PASSWORD") || trimmed.includes("PLACEHOLDER")) return false;
  return trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://");
};

export const createPool = () => {
  const connectionString = process.env.DATABASE_URL;
  if (isDatabaseUrlValid(connectionString)) {
    return new Pool({
      connectionString,
      ssl: connectionString!.includes('supabase') || connectionString!.includes('neon') || connectionString!.includes('render')
        ? { rejectUnauthorized: false }
        : undefined,
      connectionTimeoutMillis: 15000,
    });
  }
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  });
};

const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
