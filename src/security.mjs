import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password, { cost } = {}) {
  const isTest = process.env.NODE_ENV === 'test' || process.argv.some(a => a.includes('test'));
  const N = cost ?? (isTest ? 1024 : 16_384);
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  return `$scrypt$${N}$8$1$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  try {
    const [, scheme, n, r, p, saltText, digestText] = encoded.split('$');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(digestText, 'base64url');
    const actual = Buffer.from(await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * 1024 * 1024 }));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

export function createSessionToken() { return randomBytes(32).toString('base64url'); }
export function hashSessionToken(token) { return createHash('sha256').update(token).digest('hex'); }

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar_url: row.avatar_url || null,
    auth_provider: row.auth_provider || 'local',
    has_google: Boolean(row.google_id),
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_login_at || null,
  };
}

export function generateOAuthState() {
  return randomBytes(24).toString('base64url');
}

export function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

