/**
 * Google OAuth 2.0 & OpenID Connect Authentication Service for VARIS AI.
 */

export function isGoogleAuthConfigured(config) {
  return Boolean(config?.googleClientId && config?.googleClientSecret);
}

export function buildGoogleAuthUrl(config, state, redirectUri = null) {
  if (!isGoogleAuthConfigured(config)) {
    throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.');
  }

  const callbackUrl = redirectUri || config.googleCallbackUrl;
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(config, code, redirectUri = null) {
  const callbackUrl = redirectUri || config.googleCallbackUrl;
  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error_description || errData.error || `Google token exchange failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error_description || `Google UserInfo fetch failed with status ${res.status}`);
  }

  return res.json();
}

export async function verifyGoogleIdToken(config, credential) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error_description || errData.error || 'Invalid Google ID token');
  }

  const payload = await res.json();
  if (config.googleClientId && payload.aud !== config.googleClientId) {
    const audErr = new Error('Google token audience does not match configured Client ID');
    audErr.code = 'INVALID_TOKEN_AUDIENCE';
    throw audErr;
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name || payload.email?.split('@')[0] || 'Google User',
    picture: payload.picture || null,
  };
}

/**
 * Orchestrates Google OAuth callback processing, user lookup, creation, and account linking.
 */
export async function processGoogleAuth({
  config,
  repository,
  code,
  state,
  expectedState,
  redirectUri = null,
  mockUserInfo = null,
}) {
  // 1. CSRF State validation
  if (!state || !expectedState || state !== expectedState) {
    const stateErr = new Error('Invalid OAuth state. CSRF protection verification failed.');
    stateErr.code = 'INVALID_OAUTH_STATE';
    throw stateErr;
  }

  // 2. Obtain Google User Info
  let userInfo = mockUserInfo;
  if (!userInfo) {
    const tokens = await exchangeGoogleCode(config, code, redirectUri);
    userInfo = await fetchGoogleUserInfo(tokens.access_token);
  }

  const googleId = userInfo.sub || userInfo.id;
  const email = (userInfo.email || '').trim().toLowerCase();
  const name = userInfo.name || email.split('@')[0] || 'Google User';
  const avatarUrl = userInfo.picture || userInfo.avatar_url || null;

  if (!googleId || !email) {
    const dataErr = new Error('Incomplete user profile received from Google.');
    dataErr.code = 'INVALID_GOOGLE_PROFILE';
    throw dataErr;
  }

  // 3. Check if user already exists by Google ID
  let user = await repository.findUserByGoogleId(googleId);
  if (user) {
    await repository.updateUserLastLogin(user.id);
    if (!user.avatar_url && avatarUrl) {
      await repository.updateUserAvatar(user.id, avatarUrl);
      user.avatar_url = avatarUrl;
    }
    return { user, isNew: false, linked: false };
  }

  // 4. Account Linking: Check if user exists by Email
  user = await repository.findUserByEmail(email);
  if (user) {
    user = await repository.linkGoogleAccount(user.id, { googleId, avatarUrl });
    return { user, isNew: false, linked: true };
  }

  // 5. Create brand new Google user
  user = await repository.createGoogleUser({
    googleId,
    name,
    email,
    avatarUrl,
  });

  return { user, isNew: true, linked: false };
}

/**
 * Processes Google Identity Services (GIS) credential token.
 */
export async function processGoogleCredential({
  config,
  repository,
  credential,
  mockUserInfo = null,
}) {
  let userInfo = mockUserInfo;
  if (!userInfo) {
    userInfo = await verifyGoogleIdToken(config, credential);
  }

  const googleId = userInfo.sub || userInfo.id;
  const email = (userInfo.email || '').trim().toLowerCase();
  const name = userInfo.name || email.split('@')[0] || 'Google User';
  const avatarUrl = userInfo.picture || userInfo.avatar_url || null;

  if (!googleId || !email) {
    const dataErr = new Error('Incomplete user profile received from Google.');
    dataErr.code = 'INVALID_GOOGLE_PROFILE';
    throw dataErr;
  }

  let user = await repository.findUserByGoogleId(googleId);
  if (user) {
    await repository.updateUserLastLogin(user.id);
    if (!user.avatar_url && avatarUrl) {
      await repository.updateUserAvatar(user.id, avatarUrl);
      user.avatar_url = avatarUrl;
    }
    return { user, isNew: false, linked: false };
  }

  user = await repository.findUserByEmail(email);
  if (user) {
    user = await repository.linkGoogleAccount(user.id, { googleId, avatarUrl });
    return { user, isNew: false, linked: true };
  }

  user = await repository.createGoogleUser({
    googleId,
    name,
    email,
    avatarUrl,
  });

  return { user, isNew: true, linked: false };
}
