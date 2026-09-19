import pg from 'pg';
import { loadConfig } from './config.mjs';

const { Pool } = pg;

export function createPool(config = loadConfig()) {
  if (!config.databaseUrl) return null;
  if (process.env.VERCEL && (config.databaseUrl.includes('localhost') || config.databaseUrl.includes('127.0.0.1'))) {
    return null;
  }
  return new Pool({ connectionString: config.databaseUrl, max: 10, ssl: config.databaseSsl ? { rejectUnauthorized: false } : false });
}

export async function closePool(pool) { if (pool) await pool.end(); }

