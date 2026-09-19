import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const conversationId = '22222222-2222-4222-8222-222222222222';
const voiceId = '33333333-3333-4333-8333-333333333333';
const now = new Date().toISOString();

function makeRepos() {
  const user = { id, name: 'Test User', email: 'test@example.com', password_hash: null, created_at: now, updated_at: now };
  const conversation = { id: conversationId, user_id: id, title: 'Test chat', created_at: now, updated_at: now };
  const state = { user, conversation, sessionHash: null, revoked: false, registered: false, messages: [] };
  return {
    state,
    async findUserByEmail(email) { return state.registered && email === user.email ? user : null; },
    async findUserById() { return user; },
    async createUser(input) { Object.assign(user, input); user.password_hash = input.passwordHash; state.registered = true; return user; },
    async createSession(input) { state.sessionHash = input.tokenHash; },
    async findSession(hash) { return hash === state.sessionHash && !state.revoked ? { id: '44444444-4444-4444-8444-444444444444', user_id: id, name: user.name, email: user.email, user_created_at: now, user_updated_at: now } : null; },
    async touchSession() {},
    async revokeSession() { state.revoked = true; },
    async listConversations() { return [conversation]; },
    async createConversation(userId, title) { return { ...conversation, user_id: userId, title }; },
    async getConversation() { return conversation; },
    async deleteConversation() { return true; },
    async listMessages() { return [{ id: voiceId, conversation_id: conversationId, role: 'user', content: 'Hi', created_at: now }]; },
    async listRecentMessages() { return state.messages.slice(-20); },
    async createMessage(userId, conversationIdArg, role, content) { const message = { id: role === 'user' ? voiceId : '55555555-5555-4555-8555-555555555555', user_id: userId, conversation_id: conversationIdArg, role, content, created_at: now }; state.messages.push(message); return message; },
    async getPreferences() { return null; },
    async upsertPreferences(userId, data) { return { id: voiceId, user_id: userId, ...data, created_at: now, updated_at: now }; },
    async listVoiceProfiles() { return [{ id: voiceId, user_id: id, provider: 'test', provider_voice_id: 'voice-1', name: 'Test', status: 'active', created_at: now, updated_at: now }]; },
  };
}

test('all protected endpoints reject anonymous requests', async t => {
  const repos = makeRepos(); const app = buildApp({ config: { nodeEnv: 'test', appOrigin: 'http://localhost:3000', cookieSecure: false, sessionTtlSeconds: 3600 }, repos });
  t.after(() => app.close());
  for (const url of ['/api/auth/me', '/api/conversations', '/api/preferences', '/api/voice/profiles']) {
    const response = await app.inject({ method: 'GET', url }); assert.equal(response.statusCode, 401, url);
  }
});

test('register creates a hashed-password session and returns safe user', async t => {
  const repos = makeRepos(); const app = buildApp({ config: { nodeEnv: 'test', appOrigin: 'http://localhost:3000', cookieSecure: false, sessionTtlSeconds: 3600 }, repos });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Test User', email: 'TEST@example.com', password: 'long-password-123' } });
  assert.equal(response.statusCode, 201); assert.ok(response.cookies.some(c => c.name === 'varis_session')); assert.equal(response.json().user.email, 'test@example.com'); assert.match(repos.state.user.password_hash, /^\$scrypt\$/); assert.equal(response.json().user.password_hash, undefined);
});

test('authenticated conversation, message, preference and voice endpoints work', async t => {
  const repos = makeRepos(); const app = buildApp({ config: { nodeEnv: 'test', appOrigin: 'http://localhost:3000', cookieSecure: false, sessionTtlSeconds: 3600 }, repos });
  t.after(() => app.close());
  const registered = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Test User', email: 'test@example.com', password: 'long-password-123' } });
  const cookieHeader = registered.cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const requests = [
    ['GET', '/api/auth/me', 200], ['GET', '/api/conversations', 200], ['POST', '/api/conversations', 201], ['GET', `/api/conversations/${conversationId}`, 200], ['GET', `/api/conversations/${conversationId}/messages`, 200], ['GET', '/api/preferences', 200], ['PUT', '/api/preferences', 200], ['GET', '/api/voice/profiles', 200], ['DELETE', `/api/conversations/${conversationId}`, 204], ['POST', '/api/auth/logout', 204],
  ];
  for (const [method, url, expected] of requests) {
    const payload = method === 'POST' && url === '/api/conversations' ? { title: 'A new chat' } : method === 'PUT' ? { speaking_speed: 1, voice_style: {}, language: 'id-ID', voice_profile_id: null } : undefined;
    const response = await app.inject({ method, url, headers: { cookie: cookieHeader }, payload });
    assert.equal(response.statusCode, expected, `${method} ${url}: ${response.body}`);
  }
});

test('login validates credentials and issues a fresh session', async t => {
  const repos = makeRepos(); const app = buildApp({ config: { nodeEnv: 'test', appOrigin: 'http://localhost:3000', cookieSecure: false, sessionTtlSeconds: 3600 }, repos });
  t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Test User', email: 'test@example.com', password: 'long-password-123' } });
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'TEST@example.com', password: 'long-password-123' } });
  assert.equal(login.statusCode, 200); assert.ok(login.cookies.some(c => c.name === 'varis_session'));
  const denied = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'test@example.com', password: 'wrong-password' } });
  assert.equal(denied.statusCode, 401); assert.equal(denied.json().error.code, 'INVALID_CREDENTIALS');
});

test('validation and origin protection return structured errors', async t => {
  const repos = makeRepos(); const app = buildApp({ config: { nodeEnv: 'test', appOrigin: 'http://localhost:3000', cookieSecure: false, sessionTtlSeconds: 3600 }, repos });
  t.after(() => app.close());
  const bad = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: '', email: 'bad', password: 'short' } }); assert.equal(bad.statusCode, 400); assert.equal(bad.json().error.code, 'VALIDATION_FAILED');
  const csrf = await app.inject({ method: 'POST', url: '/api/auth/register', headers: { origin: 'https://evil.example' }, payload: { name: 'X', email: 'x@example.com', password: 'long-password-123' } }); assert.equal(csrf.statusCode, 403); assert.equal(csrf.json().error.code, 'CSRF_ORIGIN_DENIED');
});

test('chat normal, continuation, new/old conversations and provider failure', async t => {
  const repos = makeRepos(); const calls = [];
  const aiEngine = { async respond(input) { calls.push(input); if (input.userMessage === 'fail') { const error = new Error('provider down'); error.code = 'ETIMEDOUT'; throw error; } return { text: `VARIS: ${input.userMessage}`, model: 'test-model' }; } };
  const app = buildApp({ config: { nodeEnv: 'test', appOrigin: 'http://localhost:3000', cookieSecure: false, sessionTtlSeconds: 3600 }, repos, aiEngine });
  t.after(() => app.close());
  const registered = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Test User', email: 'test@example.com', password: 'long-password-123' } });
  const cookieHeader = registered.cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const first = await app.inject({ method: 'POST', url: '/api/chat', headers: { cookie: cookieHeader }, payload: { message: 'Hello VARIS' } });
  assert.equal(first.statusCode, 200); assert.equal(first.json().response, 'VARIS: Hello VARIS'); assert.equal(first.json().conversation_id, conversationId); assert.ok(first.json().message_id);
  const second = await app.inject({ method: 'POST', url: '/api/chat', headers: { cookie: cookieHeader }, payload: { message: 'Continue this', conversation_id: conversationId } });
  assert.equal(second.statusCode, 200); assert.equal(calls[1].context.length, 2); assert.equal(calls[1].context[0].content, 'Hello VARIS');
  const old = await app.inject({ method: 'POST', url: '/api/chat', headers: { cookie: cookieHeader }, payload: { message: 'Old conversation', conversation_id: conversationId } }); assert.equal(old.statusCode, 200);
  const failure = await app.inject({ method: 'POST', url: '/api/chat', headers: { cookie: cookieHeader }, payload: { message: 'fail', conversation_id: conversationId } }); assert.equal(failure.statusCode, 502); assert.equal(failure.json().error.code, 'ETIMEDOUT');
});

test('chat rejects malformed input and malformed provider output', async t => {
  const repos = makeRepos(); const app = buildApp({ config: { nodeEnv: 'test', appOrigin: 'http://localhost:3000', cookieSecure: false, sessionTtlSeconds: 3600 }, repos, aiEngine: { respond: async () => ({ text: '' }) } });
  t.after(() => app.close());
  const registered = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Test User', email: 'test@example.com', password: 'long-password-123' } });
  const cookieHeader = registered.cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const malformed = await app.inject({ method: 'POST', url: '/api/chat', headers: { cookie: cookieHeader }, payload: { message: '' } }); assert.equal(malformed.statusCode, 400);
  const provider = await app.inject({ method: 'POST', url: '/api/chat', headers: { cookie: cookieHeader }, payload: { message: 'hello', conversation_id: conversationId } }); assert.equal(provider.statusCode, 502); assert.equal(provider.json().error.code, 'AI_MALFORMED_RESPONSE');
});
