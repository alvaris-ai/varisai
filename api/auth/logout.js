import { createRepositories } from '../../src/repositories.mjs';
import { hashSessionToken } from '../../src/security.mjs';
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

export default async function handler(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/varis_session=([^;]+)/);
  const rawToken = match ? match[1] : null;

  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    const repository = getRepos();
    await repository.revokeSession(tokenHash);
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Set-Cookie': 'varis_session=; Max-Age=0; Path=/',
  });
  res.end(JSON.stringify({ status: 'success' }));
}
