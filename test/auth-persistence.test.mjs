import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import registerHandler from '../api/auth/register.js';
import loginHandler from '../api/auth/login.js';
import logoutHandler from '../api/auth/logout.js';
import resetPasswordHandler from '../api/auth/reset-password.js';
import forgotPasswordHandler from '../api/auth/forgot-password.js';
import { createRepositories } from '../src/repositories.mjs';

function createMockReqRes({ body, headers = {} }) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.headers = { 'content-type': 'application/json', ...headers };
  req.body = body;

  const res = {
    statusCode: 200,
    headers: {},
    writtenData: '',
    ended: false,
    writeHead(status, headers = {}) {
      this.statusCode = status;
      Object.assign(this.headers, headers);
    },
    write(chunk) {
      this.writtenData += chunk;
    },
    end(chunk) {
      if (chunk) this.writtenData += chunk;
      this.ended = true;
    },
  };

  return { req, res };
}

test('Auth Lifecycle: Register -> Logout -> Login with correct password succeeds', async () => {
  const testEmail = `user_${Date.now()}@varis.ai`;
  const testPassword = 'Password123!';

  // 1. Register
  const { req: regReq, res: regRes } = createMockReqRes({
    body: {
      name: 'Test Account',
      email: testEmail,
      password: testPassword,
    },
  });
  await registerHandler(regReq, regRes);

  assert.equal(regRes.statusCode, 201);
  const regData = JSON.parse(regRes.writtenData);
  assert.equal(regData.success, true);
  assert.equal(regData.user.email, testEmail);

  // 2. Logout
  const sessionCookie = regRes.headers['Set-Cookie'];
  const { req: logoutReq, res: logoutRes } = createMockReqRes({
    headers: { cookie: sessionCookie },
  });
  await logoutHandler(logoutReq, logoutRes);
  assert.equal(logoutRes.statusCode, 200);

  // 3. Login with the exact same email and password
  const { req: loginReq, res: loginRes } = createMockReqRes({
    body: {
      email: testEmail,
      password: testPassword,
    },
  });
  await loginHandler(loginReq, loginRes);

  assert.equal(loginRes.statusCode, 200);
  const loginData = JSON.parse(loginRes.writtenData);
  assert.equal(loginData.success, true);
  assert.equal(loginData.user.email, testEmail);
  assert.ok(loginRes.headers['Set-Cookie']);
});

test('Auth Lifecycle: Login with wrong password returns 401 INVALID_CREDENTIALS', async () => {
  const testEmail = `user_wrongpass_${Date.now()}@varis.ai`;
  const testPassword = 'CorrectPassword123';

  // Register
  const { req: regReq, res: regRes } = createMockReqRes({
    body: {
      name: 'Wrong Pass Tester',
      email: testEmail,
      password: testPassword,
    },
  });
  await registerHandler(regReq, regRes);
  assert.equal(regRes.statusCode, 201);

  // Login with incorrect password
  const { req: loginReq, res: loginRes } = createMockReqRes({
    body: {
      email: testEmail,
      password: 'WrongPassword999',
    },
  });
  await loginHandler(loginReq, loginRes);

  assert.equal(loginRes.statusCode, 401);
  const data = JSON.parse(loginRes.writtenData);
  assert.equal(data.error.code, 'INVALID_CREDENTIALS');
});

test('Reset / Forgot Password: Changes password and allows login with new password', async () => {
  const testEmail = `reset_user_${Date.now()}@varis.ai`;
  const oldPassword = 'OldPassword123';
  const newPassword = 'NewSecretPassword456';

  // 1. Register with old password
  const { req: regReq, res: regRes } = createMockReqRes({
    body: {
      name: 'Reset Tester',
      email: testEmail,
      password: oldPassword,
    },
  });
  await registerHandler(regReq, regRes);
  assert.equal(regRes.statusCode, 201);

  // 2. Reset Password via /api/auth/reset-password
  const { req: resetReq, res: resetRes } = createMockReqRes({
    body: {
      email: testEmail,
      newPassword: newPassword,
    },
  });
  await resetPasswordHandler(resetReq, resetRes);

  assert.equal(resetRes.statusCode, 200);
  const resetData = JSON.parse(resetRes.writtenData);
  assert.equal(resetData.success, true);

  // 3. Login with old password should fail
  const { req: oldLoginReq, res: oldLoginRes } = createMockReqRes({
    body: {
      email: testEmail,
      password: oldPassword,
    },
  });
  await loginHandler(oldLoginReq, oldLoginRes);
  assert.equal(oldLoginRes.statusCode, 401);

  // 4. Login with NEW password should succeed
  const { req: newLoginReq, res: newLoginRes } = createMockReqRes({
    body: {
      email: testEmail,
      password: newPassword,
    },
  });
  await loginHandler(newLoginReq, newLoginRes);
  assert.equal(newLoginRes.statusCode, 200);
  const newLoginData = JSON.parse(newLoginRes.writtenData);
  assert.equal(newLoginData.success, true);
});

test('Forgot Password: Non-existent email returns 404 USER_NOT_FOUND', async () => {
  const { req, res } = createMockReqRes({
    body: {
      email: 'nonexistent_account_999@varis.ai',
      newPassword: 'SomePassword123',
    },
  });
  await forgotPasswordHandler(req, res);

  assert.equal(res.statusCode, 404);
  const data = JSON.parse(res.writtenData);
  assert.equal(data.error.code, 'USER_NOT_FOUND');
});
