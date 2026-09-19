import { processGoogleCredential } from '../../../src/google-auth.mjs';
import { createRepositories } from '../../../src/repositories.mjs';
import { createSessionToken, hashSessionToken, publicUser } from '../../../src/security.mjs';
import { loadConfig } from '../../../src/config.mjs';
import { createPool } from '../../../src/db.mjs';

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
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  try {
    const body = await parseBody(req);
    const { credential } = body;

    if (!credential) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Google credential token is required' }));
    }

    const config = loadConfig();
    const repository = getRepos();

    const { user, isNew, linked } = await processGoogleCredential({
      config,
      repository,
      credential,
    });

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    await repository.createSession({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'varisai.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const isSecure = proto === 'https';

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `varis_session=${token}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`,
    });

    res.end(JSON.stringify({
      success: true,
      user: publicUser(user),
      is_new: isNew,
      linked,
    }));
  } catch (err) {
    console.error('Google GIS credential error:', err);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: err.message || 'Google authentication verification failed' }));
  }
}
