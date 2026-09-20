import { createRepositories } from '../../src/repositories.mjs';
import { createSessionToken, hashPassword, hashSessionToken, isValidEmail, publicUser } from '../../src/security.mjs';
import { loadConfig } from '../../src/config.mjs';
import { createPool } from '../../src/db.mjs';

let reposInstance = null;
function getRepos() {
  if (!reposInstance) {
    const config = loadConfig();
    const pool = createPool(config);
    reposInstance = createRepositories(pool);
  }
  return reposInstance;
}

async function parseBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const str = Buffer.concat(chunks).toString();
  return str ? JSON.parse(str) : {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } }));
  }

  try {
    const body = await parseBody(req);
    const { name, email, password } = body;

    if (!name || !email || !password || password.length < 6) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Name, valid email, and min 6 char password required' } }));
    }

    const repository = getRepos();
    const existing = await repository.findUserByEmail(email.trim().toLowerCase());
    if (existing) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' } }));
    }

    const passwordHash = await hashPassword(password);
    const user = await repository.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      authProvider: 'local'
    });

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    await repository.createSession({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 86400000) });

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'varisai.vercel.app';
    const isSecure = !host.includes('localhost');

    res.writeHead(201, {
      'Content-Type': 'application/json',
      'Set-Cookie': `varis_session=${token}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`,
    });
    res.end(JSON.stringify({ success: true, user: publicUser(user) }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: err.message } }));
  }
}
