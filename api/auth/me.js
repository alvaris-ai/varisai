import { getGlobalRepositories } from '../../src/repositories.mjs';
import { hashSessionToken, publicUser } from '../../src/security.mjs';
import { loadConfig } from '../../src/config.mjs';
import { createPool } from '../../src/db.mjs';

function getRepos() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}

export default async function handler(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/varis_session=([^;]+)/);
  const rawToken = match ? match[1] : null;

  if (!rawToken) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: 'Authentication is required' } }));
  }

  const tokenHash = hashSessionToken(rawToken);
  const repository = getRepos();
  const session = await repository.findSessionByTokenHash(tokenHash);

  if (!session) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { code: 'SESSION_INVALID', message: 'Session is invalid or expired' } }));
  }

  const user = await repository.findUserById(session.user_id);
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } }));
  }

  const subscription = await repository.getUserSubscription(user.id);
  const credits = await repository.getUserCredits(user.id);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    user: publicUser(user),
    subscription: {
      plan_id: subscription?.plan_id || 'free',
      credits_balance: credits?.balance ?? 100,
    }
  }));
}
