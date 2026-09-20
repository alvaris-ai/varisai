import { getGlobalRepositories } from '../../src/repositories.mjs';
import { createSessionToken, hashPassword, hashSessionToken, isValidEmail, publicUser, verifyPassword } from '../../src/security.mjs';
import { loadConfig } from '../../src/config.mjs';
import { createPool } from '../../src/db.mjs';

function getRepos() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
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
    const { email, password } = body;

    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Email and password are required' } }));
    }

    const repository = getRepos();
    const user = await repository.findUserByEmail(email.trim().toLowerCase());
    if (!user || !user.password_hash) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } }));
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } }));
    }

    await repository.updateUserLastLogin(user.id);
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    await repository.createSession({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 86400000) });

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'varisai.vercel.app';
    const isSecure = !host.includes('localhost');

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `varis_session=${token}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`,
    });
    res.end(JSON.stringify({ success: true, user: publicUser(user) }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: err.message } }));
  }
}
