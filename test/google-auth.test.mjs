import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.mjs';
import { createRepositories } from '../src/repositories.mjs';
import { buildGoogleAuthUrl, isGoogleAuthConfigured, processGoogleAuth } from '../src/google-auth.mjs';
import { hashPassword, verifyPassword } from '../src/security.mjs';

test('Google Auth: configuration and URL builder', () => {
  const emptyConfig = {};
  assert.equal(isGoogleAuthConfigured(emptyConfig), false);
  assert.throws(() => buildGoogleAuthUrl(emptyConfig, 'state-123'), /credentials not configured/i);

  const fullConfig = {
    googleClientId: 'google-client-id-123.apps.googleusercontent.com',
    googleClientSecret: 'google-client-secret-xyz',
    googleCallbackUrl: 'http://localhost:3000/api/auth/google/callback',
  };
  assert.equal(isGoogleAuthConfigured(fullConfig), true);

  const url = buildGoogleAuthUrl(fullConfig, 'random-csrf-state');
  assert.ok(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
  assert.ok(url.includes('client_id=google-client-id-123'));
  assert.ok(url.includes('state=random-csrf-state'));
  assert.ok(url.includes('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fgoogle%2Fcallback'));
});

test('Google Auth: processGoogleAuth CSRF state validation', async () => {
  const repo = createRepositories(null);
  const config = { googleClientId: 'id', googleClientSecret: 'secret' };

  await assert.rejects(
    processGoogleAuth({
      config,
      repository: repo,
      code: 'auth-code',
      state: 'state-bad',
      expectedState: 'state-good',
      mockUserInfo: { sub: 'g-123', email: 'user@example.com' },
    }),
    /CSRF protection verification failed/i
  );
});

test('Google Auth: create new user with free subscription and 100 credits', async () => {
  const repo = createRepositories(null);
  const config = { googleClientId: 'id', googleClientSecret: 'secret' };

  const mockUserInfo = {
    sub: 'google-uid-999',
    name: 'Al Palis',
    email: 'alpalis@gmail.com',
    picture: 'https://lh3.googleusercontent.com/a/avatar999',
  };

  const result = await processGoogleAuth({
    config,
    repository: repo,
    code: 'code-123',
    state: 'state-abc',
    expectedState: 'state-abc',
    mockUserInfo,
  });

  assert.equal(result.isNew, true);
  assert.equal(result.linked, false);
  assert.equal(result.user.name, 'Al Palis');
  assert.equal(result.user.email, 'alpalis@gmail.com');
  assert.equal(result.user.google_id, 'google-uid-999');
  assert.equal(result.user.avatar_url, 'https://lh3.googleusercontent.com/a/avatar999');
  assert.equal(result.user.auth_provider, 'google');
  assert.equal(result.user.password_hash, null);

  // Check initial credit grant
  const creds = await repo.getUserCredits(result.user.id);
  assert.equal(creds.balance, 100);

  // Check initial subscription
  const sub = await repo.getUserSubscription(result.user.id);
  assert.equal(sub.plan_id, 'free');
});

test('Google Auth: returning user login updates last_login_at', async () => {
  const repo = createRepositories(null);
  const config = { googleClientId: 'id', googleClientSecret: 'secret' };

  const mockUserInfo = {
    sub: 'google-uid-returning',
    name: 'Jane Google',
    email: 'jane@gmail.com',
    picture: 'https://lh3.googleusercontent.com/a/jane',
  };

  // First login (create)
  const first = await processGoogleAuth({
    config,
    repository: repo,
    code: 'code-1',
    state: 'state-1',
    expectedState: 'state-1',
    mockUserInfo,
  });
  assert.equal(first.isNew, true);

  // Second login (returning)
  const second = await processGoogleAuth({
    config,
    repository: repo,
    code: 'code-2',
    state: 'state-2',
    expectedState: 'state-2',
    mockUserInfo,
  });
  assert.equal(second.isNew, false);
  assert.equal(second.linked, false);
  assert.equal(second.user.id, first.user.id);
});

test('Google Auth: account linking when email was previously registered via password', async () => {
  const repo = createRepositories(null);
  const config = { googleClientId: 'id', googleClientSecret: 'secret' };

  // 1. User registers with email & password
  const passwordHash = await hashPassword('SecretPassword123!');
  const existingUser = await repo.createUser({
    name: 'Existing User',
    email: 'shared@example.com',
    passwordHash,
  });
  assert.equal(existingUser.auth_provider, 'local');
  assert.equal(existingUser.google_id, null);

  // 2. Same user logs in with Google OAuth using same email
  const mockUserInfo = {
    sub: 'google-uid-linked-888',
    name: 'Existing User Updated',
    email: 'shared@example.com',
    picture: 'https://lh3.googleusercontent.com/a/avatar-shared',
  };

  const result = await processGoogleAuth({
    config,
    repository: repo,
    code: 'code-link',
    state: 'state-link',
    expectedState: 'state-link',
    mockUserInfo,
  });

  assert.equal(result.isNew, false);
  assert.equal(result.linked, true);
  assert.equal(result.user.id, existingUser.id);
  assert.equal(result.user.google_id, 'google-uid-linked-888');
  assert.equal(result.user.avatar_url, 'https://lh3.googleusercontent.com/a/avatar-shared');
  assert.equal(result.user.auth_provider, 'both');

  // Verify password login still works
  const verified = await verifyPassword('SecretPassword123!', result.user.password_hash);
  assert.equal(verified, true);
});

test('Google Auth: End-to-End App API integration', async () => {
  const config = {
    nodeEnv: 'test',
    cookieSecure: false,
    appOrigin: 'http://localhost:3000',
    googleClientId: 'test-google-id',
    googleClientSecret: 'test-google-secret',
    googleCallbackUrl: 'http://localhost:3000/api/auth/google/callback',
  };

  const app = buildApp({ config });

  // 1. GET /api/auth/google returns redirect to Google OAuth
  const redirectRes = await app.inject({
    method: 'GET',
    url: '/api/auth/google',
  });
  assert.equal(redirectRes.statusCode, 302);
  assert.ok(redirectRes.headers.location.startsWith('https://accounts.google.com'));
  const oauthCookie = redirectRes.cookies.find(c => c.name === 'varis_oauth_state');
  assert.ok(oauthCookie?.value);

  // 2. POST /api/auth/google/token exchanges token and creates session
  const tokenRes = await app.inject({
    method: 'POST',
    url: '/api/auth/google/token',
    payload: {
      code: 'valid-code',
      state: 'state-test-123',
      expected_state: 'state-test-123',
      mock_user_info: {
        sub: 'google-sub-777',
        name: 'API Test User',
        email: 'apitest@example.com',
        picture: 'https://lh3.googleusercontent.com/a/apitest',
      }
    }
  });

  assert.equal(tokenRes.statusCode, 200);
  const tokenData = tokenRes.json();
  assert.equal(tokenData.status, 'success');
  assert.equal(tokenData.user.name, 'API Test User');
  assert.equal(tokenData.user.avatar_url, 'https://lh3.googleusercontent.com/a/apitest');

  const sessionCookie = tokenRes.cookies.find(c => c.name === 'varis_session');
  assert.ok(sessionCookie?.value);
  const cookieHeader = `varis_session=${sessionCookie.value}`;

  // 3. GET /api/auth/me with session cookie returns full user & subscription data
  const meRes = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: {
      cookie: cookieHeader,
    }
  });
  assert.equal(meRes.statusCode, 200);
  const meData = meRes.json();
  assert.equal(meData.user.email, 'apitest@example.com');
  assert.equal(meData.user.avatar_url, 'https://lh3.googleusercontent.com/a/apitest');
  assert.equal(meData.subscription.plan_id, 'free');
  assert.equal(meData.subscription.credits_balance, 100);

  // 4. POST /api/auth/logout revokes session and clears cookie
  const logoutRes = await app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    headers: {
      cookie: cookieHeader,
    }
  });
  assert.equal(logoutRes.statusCode, 204);

  // 5. GET /api/auth/me after logout is rejected
  const meAfterLogout = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: {
      cookie: cookieHeader,
    }
  });
  assert.equal(meAfterLogout.statusCode, 401);
});

test('Google Auth: unconfigured OAuth redirects to oauth_unavailable', async () => {
  const emptyApp = buildApp({ config: { nodeEnv: 'test' } });

  const resRedirect = await emptyApp.inject({
    method: 'GET',
    url: '/api/auth/google',
  });
  assert.equal(resRedirect.statusCode, 302);
  assert.ok(resRedirect.headers.location.includes('error=oauth_unavailable'));
});

test('Google Auth: /api/auth/google/credential validates GIS credential and logs in user', async () => {
  const app = buildApp({ config: { nodeEnv: 'test', googleClientId: 'test-client-id' } });

  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/google/credential',
    payload: {
      credential: 'mock-gis-jwt-token',
      mock_user_info: {
        sub: 'google-gis-101',
        name: 'GIS Verified User',
        email: 'gisuser@example.com',
        picture: 'https://lh3.googleusercontent.com/a/gisuser',
      },
    },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.status, 'success');
  assert.equal(data.user.email, 'gisuser@example.com');
  assert.equal(data.user.name, 'GIS Verified User');
  const sessionCookie = res.cookies.find(c => c.name === 'varis_session');
  assert.ok(sessionCookie?.value);

  // Verify authenticated session
  const meRes = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: { cookie: `varis_session=${sessionCookie.value}` },
  });
  assert.equal(meRes.statusCode, 200);
  assert.equal(meRes.json().user.email, 'gisuser@example.com');
});



