import { processGoogleAuth } from '../../../src/google-auth.mjs';
import { getGlobalRepositories } from '../../../src/repositories.mjs';
import { createSessionToken, hashSessionToken } from '../../../src/security.mjs';
import { loadConfig } from '../../../src/config.mjs';
import { createPool } from '../../../src/db.mjs';

function getRepos() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers['x-forwarded-host'] || req.headers.host || 'varisai.vercel.app'}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    res.writeHead(302, {
      Location: `/?error=${oauthError === 'access_denied' ? 'cancelled' : 'auth_failed'}`,
      'Set-Cookie': 'varis_oauth_state=; Max-Age=0; Path=/',
    });
    return res.end();
  }

  const cookieHeader = req.headers.cookie || '';
  const expectedStateMatch = cookieHeader.match(/varis_oauth_state=([^;]+)/);
  const expectedState = expectedStateMatch ? expectedStateMatch[1] : null;

  const config = loadConfig();
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'varisai.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = config.googleCallbackUrl || `${proto}://${host}/api/auth/google/callback`;

  try {
    const repository = getRepos();
    const { user, isNew, linked } = await processGoogleAuth({
      config,
      repository,
      code,
      state,
      expectedState,
      redirectUri,
    });

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    await repository.createSession({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 86400000) });

    const isSecure = proto === 'https';
    const params = new URLSearchParams({ auth: 'success' });
    if (linked) params.set('linked', 'true');
    if (isNew) params.set('is_new', 'true');

    res.writeHead(302, {
      Location: `/?${params.toString()}`,
      'Set-Cookie': [
        `varis_session=${token}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`,
        'varis_oauth_state=; Max-Age=0; Path=/',
      ],
    });
    res.end();
  } catch (err) {
    console.error('Google callback error:', err);
    res.writeHead(302, {
      Location: '/?error=auth_failed',
      'Set-Cookie': 'varis_oauth_state=; Max-Age=0; Path=/',
    });
    res.end();
  }
}
