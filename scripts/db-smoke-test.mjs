#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '')));
const migration = await fs.readFile(path.join(root, 'supabase/migrations/202609180001_initial_schema.sql'), 'utf8');
const authMigration = await fs.readFile(path.join(root, 'supabase/migrations/202609180002_auth_sessions.sql'), 'utf8');
const seed = await fs.readFile(path.join(root, 'supabase/seed.sql'), 'utf8');

const requiredTables = ['users', 'conversations', 'messages', 'voice_profiles', 'user_preferences', 'agent_tools', 'agents', 'agent_runs', 'memory_items'];
for (const table of requiredTables) assert.match(migration, new RegExp(`create table public\\.${table}\\s*\\(`, 'i'));
for (const column of ['primary key', 'references public.', 'unique', 'created_at timestamptz', 'updated_at timestamptz', 'enable row level security']) assert.match(migration, new RegExp(column.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i'));
assert.match(migration, /password_hash text/i);
assert.match(migration, /(argon2id|scrypt)/i);
assert.match(migration, /create index/i);
assert.match(migration, /messages_owner_check/i);
assert.match(seed, /system\.echo/);
assert.match(authMigration, /create table public\.auth_sessions/i);

if (!process.env.DATABASE_URL) {
  console.log('Schema smoke test passed (offline structural mode). Set DATABASE_URL to run live migration/CRUD tests.');
  process.exit(0);
}

let pg;
try { pg = await import('pg'); } catch {
  console.error('DATABASE_URL is set but package "pg" is not installed. Run: pnpm install');
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query('begin');
  await client.query(migration);
  await client.query(authMigration);
  const user = await client.query(`insert into public.users (name, email, password_hash) values ('Smoke User', 'smoke-${Date.now()}@example.test', '$argon2id$v=19$m=65536,t=3,p=1$smoke$smoke') returning id`);
  const conversation = await client.query(`insert into public.conversations (user_id, title) values ($1, 'Smoke Conversation') returning id`, [user.rows[0].id]);
  await client.query(`insert into public.messages (conversation_id, user_id, role, content) values ($1, $2, 'user', 'hello')`, [conversation.rows[0].id, user.rows[0].id]);
  const relationship = await client.query(`select count(*)::int as count from public.messages m join public.conversations c on c.id = m.conversation_id where c.user_id = $1`, [user.rows[0].id]);
  assert.equal(relationship.rows[0].count, 1);
  await client.query('rollback');
  console.log('Live migration, insert, select, and relationship smoke test passed.');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
