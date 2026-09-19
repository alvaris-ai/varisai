import { generateOAuthState } from '../../src/security.mjs';
import { buildGoogleAuthUrl } from '../../src/google-auth.mjs';
import { loadConfig } from '../../src/config.mjs';

export default function handler(req, res) {
  const config = loadConfig();
  if (!config.googleClientId || !config.googleClientSecret) {
    res.writeHead(302, { Location: '/?error=oauth_unavailable' });
    return res.end();
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'varisai.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = config.googleCallbackUrl || `${proto}://${host}/api/auth/google/callback`;

  const state = generateOAuthState();
  const isSecure = proto === 'https';
  res.writeHead(302, {
    Location: buildGoogleAuthUrl(config, state, redirectUri),
    'Set-Cookie': `varis_oauth_state=${state}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`,
  });
  res.end();
}
