import { getGlobalRepositories } from '../src/repositories.mjs';
import { hashSessionToken } from '../src/security.mjs';
import { loadConfig } from '../src/config.mjs';
import { createPool } from '../src/db.mjs';

function getRepos() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}

export default async function handler(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/varis_session=([^;]+)/);
  const rawToken = match ? match[1] : null;

  const repository = getRepos();
  let user = null;
  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    const session = await repository.findSessionByTokenHash(tokenHash);
    if (session) user = await repository.findUserById(session.user_id);
  }

  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: 'Authentication is required' } }));
  }

  const files = await repository.listFiles(user.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ files, count: files.length }));
}
