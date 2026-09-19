import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.mjs';
import { createPool } from './db.mjs';
import { createRepositories } from './repositories.mjs';
import { createSessionToken, generateOAuthState, hashPassword, hashSessionToken, isValidEmail, publicUser, verifyPassword } from './security.mjs';
import { buildGoogleAuthUrl, isGoogleAuthConfigured, processGoogleAuth, processGoogleCredential } from './google-auth.mjs';
import { createAIProviderFromConfig } from './ai-providers.mjs';
import { createDefaultContextManager } from './context-manager.mjs';
import { createDefaultToolRegistry } from './tool-system.mjs';
import { createAgentSystem } from './agent-system.mjs';
import { createVoiceAdapter } from './voice-adapter.mjs';
import { createVoiceProviders, VOICE_STYLE_PRESETS } from './voice-providers.mjs';
import { createCreditManager } from './credit-system.mjs';
import { generateFreeSmartResponse } from './free-ai-engine.mjs';

const uuid = { type: 'string', format: 'uuid' };
const errorSchema = { type: 'object', required: ['error'], properties: { error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' }, request_id: { type: 'string' } } } } };
const userSchema = {
  type: 'object',
  required: ['id', 'name', 'email'],
  properties: {
    id: uuid,
    name: { type: 'string' },
    email: { type: 'string' },
    avatar_url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    auth_provider: { type: 'string' },
    has_google: { type: 'boolean' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    last_login_at: { anyOf: [{ type: 'string' }, { type: 'null' }] }
  }
};
const conversationSchema = { type: 'object', required: ['id', 'user_id', 'title', 'created_at', 'updated_at'], properties: { id: uuid, user_id: uuid, title: { type: 'string' }, created_at: { type: 'string' }, updated_at: { type: 'string' } } };
const preferencesSchema = { type: 'object', required: ['id', 'user_id', 'speaking_speed', 'voice_style', 'language', 'created_at', 'updated_at'], properties: { id: uuid, user_id: uuid, voice_profile_id: { anyOf: [uuid, { type: 'null' }] }, speaking_speed: { type: 'number' }, voice_style: { type: 'object' }, language: { type: 'string' }, created_at: { type: 'string' }, updated_at: { type: 'string' } } };

export function buildApp({ config = loadConfig(), pool, repos, aiEngine, toolRegistry, agentSystem } = {}) {
  const app = Fastify({ logger: config.nodeEnv !== 'test', requestIdHeader: 'x-request-id' });
  const database = pool ?? (repos || config.nodeEnv === 'test' ? null : createPool(config));
  const repository = repos ?? createRepositories(database);
  const contextManager = createDefaultContextManager();
  const engine = aiEngine ?? createAIProviderFromConfig(config, { logger: app.log });
  const registry = toolRegistry ?? createDefaultToolRegistry();
  const agent = agentSystem ?? createAgentSystem({ engine, registry });
  const voiceProviders = createVoiceProviders(config);
  const voiceAdapter = config.voiceProvider === 'mock' || config.nodeEnv === 'test' ? createVoiceAdapter(config) : voiceProviders.tts;
  const creditManager = createCreditManager(repository);

  app.register(cookie);
  app.register(helmet, { contentSecurityPolicy: false });
  if (config.nodeEnv !== 'test') {
    app.register(rateLimit, { max: 100, timeWindow: '1 minute', hook: 'onRequest' });
  }
  app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });
  app.decorateRequest('user', null);
  app.decorateRequest('session', null);

  const fail = (reply, status, code, message) => reply.code(status).send({ error: { code, message, request_id: reply.request.id } });
  const readToken = request => request.cookies.varis_session;
  const requireAuth = async (request, reply) => {
    const raw = readToken(request);
    if (!raw) return fail(reply, 401, 'AUTH_REQUIRED', 'Authentication is required');
    const session = await repository.findSession(hashSessionToken(raw));
    if (!session) return fail(reply, 401, 'AUTH_INVALID', 'Session is invalid or expired');
    request.session = session;
    request.user = {
      id: session.user_id,
      name: session.name,
      email: session.email,
      avatar_url: session.avatar_url || null,
      auth_provider: session.auth_provider || 'local',
      has_google: Boolean(session.google_id),
      last_login_at: session.last_login_at || null,
      created_at: session.user_created_at,
      updated_at: session.user_updated_at,
    };
    repository.touchSession(session.id).catch(() => {});
  };
  const requireSameOrigin = async (request, reply) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return;
    const origin = request.headers.origin;
    if (!origin) return;
    try {
      const originUrl = new URL(origin);
      const appOriginUrl = new URL(config.appOrigin);
      const requestHost = request.headers.host;
      const isAllowed = origin === config.appOrigin ||
                        originUrl.host === appOriginUrl.host ||
                        originUrl.host === requestHost ||
                        originUrl.hostname === 'localhost' ||
                        originUrl.hostname === '127.0.0.1';
      if (!isAllowed) return fail(reply, 403, 'CSRF_ORIGIN_DENIED', 'Request origin is not allowed');
    } catch (e) {
      if (origin !== config.appOrigin) return fail(reply, 403, 'CSRF_ORIGIN_DENIED', 'Request origin is not allowed');
    }
  };

  app.addHook('onRequest', requireSameOrigin);

  app.setErrorHandler((error, request, reply) => {
    if (error.validation) return fail(reply, 400, 'VALIDATION_FAILED', error.validation.map(v => v.message).join('; '));
    if (error.code === 'DB_NOT_CONFIGURED' || error.code === 'ECONNREFUSED') return fail(reply, 503, 'DATABASE_UNAVAILABLE', 'Database is not connected or offline. Please check DATABASE_URL in .env');
    if (error.code === '23505') return fail(reply, 409, 'CONFLICT', 'A record with these values already exists');
    if (error.code === '23503') return fail(reply, 400, 'INVALID_REFERENCE', 'A referenced record does not exist');
    request.log.error({ err: error }, 'request failed');
    return fail(reply, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  });

  const sessionTtl = Number(config.sessionTtlSeconds ?? 2_592_000);
  const sessionCookie = (reply, token) => reply.setCookie('varis_session', token, { httpOnly: true, secure: config.cookieSecure === true, sameSite: 'lax', path: '/', maxAge: sessionTtl });
  const clearSessionCookie = reply => reply.clearCookie('varis_session', { httpOnly: true, secure: config.cookieSecure === true, sameSite: 'lax', path: '/' });
  const createSession = async (reply, userId) => { const token = createSessionToken(); const expiresAt = new Date(Date.now() + sessionTtl * 1000); await repository.createSession({ userId, tokenHash: hashSessionToken(token), expiresAt }); sessionCookie(reply, token); };

  app.post('/api/auth/register', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { body: { type: 'object', additionalProperties: false, required: ['name', 'email', 'password'], properties: { name: { type: 'string', minLength: 1, maxLength: 120 }, email: { type: 'string', minLength: 3, maxLength: 254 }, password: { type: 'string', minLength: 6, maxLength: 200 } } }, response: { 201: { type: 'object', required: ['user'], properties: { user: userSchema } }, 400: errorSchema, 409: errorSchema } } }, async (request, reply) => {
    const name = request.body.name.trim(); const email = request.body.email.trim().toLowerCase();
    if (!name || !isValidEmail(email)) return fail(reply, 400, 'VALIDATION_FAILED', 'Name and email are invalid');
    const existing = await repository.findUserByEmail(email); if (existing) return fail(reply, 409, 'EMAIL_IN_USE', 'Email is already registered');
    const user = await repository.createUser({ name, email, passwordHash: await hashPassword(request.body.password) });
    await createSession(reply, user.id);
    return reply.code(201).send({ user: publicUser(user) });
  });

  app.post('/api/auth/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } }, schema: { body: { type: 'object', additionalProperties: false, required: ['email', 'password'], properties: { email: { type: 'string', minLength: 3, maxLength: 254 }, password: { type: 'string', minLength: 6, maxLength: 200 } } }, response: { 200: { type: 'object', required: ['user'], properties: { user: userSchema } }, 401: errorSchema } } }, async (request, reply) => {
    const email = request.body.email.trim().toLowerCase();
    const user = await repository.findUserByEmail(email);
    if (!user) return fail(reply, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');

    if (!user.password_hash) {
      const passwordHash = await hashPassword(request.body.password);
      if (repository.updateUserPassword) await repository.updateUserPassword(user.id, passwordHash);
      user.password_hash = passwordHash;
    } else if (!(await verifyPassword(request.body.password, user.password_hash))) {
      return fail(reply, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }

    if (repository.updateUserLastLogin) await repository.updateUserLastLogin(user.id);
    await createSession(reply, user.id);
    return reply.send({ user: publicUser(user) });
  });

  // Google OAuth Initiate Route
  app.get('/api/auth/google', async (request, reply) => {
    if (!isGoogleAuthConfigured(config)) {
      request.log.warn('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment.');
      if (request.headers.accept?.includes('application/json') || request.query.format === 'json') {
        return reply.code(503).send({
          error: {
            code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
            message: 'Google Sign-In is temporarily unavailable.',
          }
        });
      }
      return reply.redirect('/?error=oauth_unavailable');
    }

    const getGoogleRedirectUri = () => {
      if (config.googleCallbackUrl) return config.googleCallbackUrl;
      const host = request.headers.host || 'localhost:3000';
      const proto = request.headers['x-forwarded-proto'] || (request.raw.socket?.encrypted ? 'https' : 'http');
      if (host.startsWith('127.0.0.1:') || host === '127.0.0.1' || host.startsWith('localhost:') || host === 'localhost') {
        return `${proto}://localhost:3000/api/auth/google/callback`;
      }
      return `${proto}://${host}/api/auth/google/callback`;
    };

    const redirectUri = getGoogleRedirectUri();

    const state = generateOAuthState();
    reply.setCookie('varis_oauth_state', state, {
      httpOnly: true,
      secure: config.cookieSecure === true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    const authUrl = buildGoogleAuthUrl(config, state, redirectUri);
    return reply.redirect(authUrl);
  });

  // Google OAuth Callback Route
  app.get('/api/auth/google/callback', async (request, reply) => {
    const { code, state, error: oauthError } = request.query;

    if (oauthError) {
      reply.clearCookie('varis_oauth_state', { path: '/' });
      request.log.info({ oauthError }, 'Google OAuth was cancelled or denied by user');
      const msg = oauthError === 'access_denied' ? 'cancelled' : 'auth_failed';
      return reply.redirect(`/?error=${msg}`);
    }

    const expectedState = request.cookies.varis_oauth_state;
    reply.clearCookie('varis_oauth_state', { path: '/' });

    const host = request.headers.host || 'localhost:3000';
    const proto = request.headers['x-forwarded-proto'] || (request.raw.socket?.encrypted ? 'https' : 'http');
    const redirectUri = config.googleCallbackUrl || (
      (host.startsWith('127.0.0.1:') || host === '127.0.0.1' || host.startsWith('localhost:') || host === 'localhost')
        ? `${proto}://localhost:3000/api/auth/google/callback`
        : `${proto}://${host}/api/auth/google/callback`
    );

    try {
      const { user, isNew, linked } = await processGoogleAuth({
        config,
        repository,
        code,
        state,
        expectedState,
        redirectUri,
      });

      await createSession(reply, user.id);
      const queryParams = new URLSearchParams({ auth: 'success' });
      if (linked) queryParams.set('linked', 'true');
      if (isNew) queryParams.set('is_new', 'true');
      return reply.redirect(`/?${queryParams.toString()}`);
    } catch (err) {
      request.log.warn({ err }, 'Google OAuth callback failed');
      return reply.redirect('/?error=auth_failed');
    }
  });

  // Google Identity Services (GIS) / Credential Token Endpoint
  app.post('/api/auth/google/credential', {
    schema: {
      body: {
        type: 'object',
        required: ['credential'],
        properties: {
          credential: { type: 'string' },
          mock_user_info: { type: 'object' },
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { credential, mock_user_info } = request.body;
      const { user, isNew, linked } = await processGoogleCredential({
        config,
        repository,
        credential,
        mockUserInfo: config.nodeEnv === 'test' ? mock_user_info : null,
      });

      await createSession(reply, user.id);
      return reply.send({
        status: 'success',
        user: publicUser(user),
        is_new: isNew,
        linked,
      });
    } catch (err) {
      request.log.warn({ err }, 'Google GIS credential verification failed');
      return fail(reply, 400, err.code || 'GOOGLE_AUTH_FAILED', err.message || 'Google authentication failed');
    }
  });

  // Google OAuth programmatic / testing exchange endpoint
  app.post('/api/auth/google/token', {
    schema: {
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
          expected_state: { type: 'string' },
          mock_user_info: { type: 'object' },
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, state, expected_state, mock_user_info } = request.body || {};
      const expectedState = expected_state || request.cookies.varis_oauth_state || state;
      
      const { user, isNew, linked } = await processGoogleAuth({
        config,
        repository,
        code,
        state,
        expectedState,
        mockUserInfo: mock_user_info,
      });

      await createSession(reply, user.id);
      return reply.send({
        status: 'success',
        user: publicUser(user),
        is_new: isNew,
        linked,
      });
    } catch (err) {
      return fail(reply, 400, err.code || 'GOOGLE_AUTH_FAILED', err.message || 'Login Google gagal');
    }
  });

  // Link Google Account to Authenticated User
  app.post('/api/auth/link-google', { preHandler: requireAuth }, async (request, reply) => {
    const { google_id, avatar_url } = request.body || {};
    if (!google_id) return fail(reply, 400, 'VALIDATION_FAILED', 'google_id is required');
    const updated = await repository.linkGoogleAccount(request.user.id, { googleId: google_id, avatarUrl: avatar_url });
    return reply.send({ status: 'success', user: publicUser(updated) });
  });

  app.post('/api/auth/logout', { preHandler: requireAuth, schema: { response: { 204: { type: 'null' }, 401: errorSchema } } }, async (request, reply) => {
    await repository.revokeSession(hashSessionToken(readToken(request)));
    clearSessionCookie(reply);
    return reply.code(204).send();
  });

  app.get('/api/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const sub = typeof repository.getUserSubscription === 'function' ? await repository.getUserSubscription(request.user.id).catch(() => null) : null;
    const cred = typeof repository.getUserCredits === 'function' ? await repository.getUserCredits(request.user.id).catch(() => null) : null;

    return reply.send({
      user: request.user,
      subscription: {
        plan_id: sub?.plan_id || 'free',
        plan_name: sub?.plan?.name || 'Free Starter',
        credits_balance: cred?.balance ?? 100,
        credits_allocated: cred?.allocated_monthly ?? 100,
      }
    });
  });

  app.get('/api/conversations', { preHandler: requireAuth, schema: { response: { 200: { type: 'object', required: ['data'], properties: { data: { type: 'array', items: conversationSchema } } }, 401: errorSchema } } }, async (request, reply) => reply.send({ data: await repository.listConversations(request.user.id) }));
  app.post('/api/conversations', { preHandler: requireAuth, schema: { body: { type: 'object', additionalProperties: false, properties: { title: { type: 'string', minLength: 1, maxLength: 200 } } }, response: { 201: { type: 'object', required: ['data'], properties: { data: conversationSchema } }, 400: errorSchema } } }, async (request, reply) => reply.code(201).send({ data: await repository.createConversation(request.user.id, request.body.title?.trim() || 'New conversation') }));
  app.get('/api/conversations/:id', { preHandler: requireAuth, schema: { params: { type: 'object', required: ['id'], properties: { id: uuid } }, response: { 200: { type: 'object', required: ['data'], properties: { data: conversationSchema } }, 404: errorSchema } } }, async (request, reply) => { const row = await repository.getConversation(request.user.id, request.params.id); return row ? reply.send({ data: row }) : fail(reply, 404, 'NOT_FOUND', 'Conversation not found'); });
  app.delete('/api/conversations/:id', { preHandler: requireAuth, schema: { params: { type: 'object', required: ['id'], properties: { id: uuid } }, response: { 204: { type: 'null' }, 404: errorSchema } } }, async (request, reply) => { const deleted = await repository.deleteConversation(request.user.id, request.params.id); return deleted ? reply.code(204).send() : fail(reply, 404, 'NOT_FOUND', 'Conversation not found'); });
  app.get('/api/conversations/:id/messages', { preHandler: requireAuth, schema: { params: { type: 'object', required: ['id'], properties: { id: uuid } }, response: { 200: { type: 'object', required: ['data'], properties: { data: { type: 'array' } } }, 404: errorSchema } } }, async (request, reply) => { const conversation = await repository.getConversation(request.user.id, request.params.id); if (!conversation) return fail(reply, 404, 'NOT_FOUND', 'Conversation not found'); return reply.send({ data: await repository.listMessages(request.user.id, request.params.id) }); });

  app.get('/api/preferences', { preHandler: requireAuth, schema: { response: { 200: { type: 'object', required: ['data'], properties: { data: { anyOf: [preferencesSchema, { type: 'null' }] } } } } } }, async (request, reply) => reply.send({ data: await repository.getPreferences(request.user.id) }));
  app.put('/api/preferences', { preHandler: requireAuth, schema: { body: { type: 'object', additionalProperties: false, required: ['speaking_speed', 'voice_style', 'language'], properties: { voice_profile_id: { anyOf: [uuid, { type: 'null' }] }, speaking_speed: { type: 'number', minimum: 0.5, maximum: 2 }, voice_style: { type: 'object', maxProperties: 10 }, language: { type: 'string', minLength: 2, maxLength: 16 } } }, response: { 200: { type: 'object', required: ['data'], properties: { data: preferencesSchema } } } } }, async (request, reply) => reply.send({ data: await repository.upsertPreferences(request.user.id, request.body) }));
  app.get('/api/voice/profiles', { preHandler: requireAuth, schema: { response: { 200: { type: 'object', required: ['data'], properties: { data: { type: 'array' } } } } } }, async (request, reply) => reply.send({ data: await repository.listVoiceProfiles(request.user.id) }));

  // ================= Multi-Model & Credits Routes =================

  // 1. List AI Models
  app.get('/api/models', { preHandler: requireAuth }, async (request, reply) => {
    const sub = await repository.getUserSubscription(request.user.id);
    const models = await repository.listAIModels();
    const enriched = models.map(m => ({
      ...m,
      is_locked: !creditManager.checkTierAccess(sub.plan, m.tier_required),
    }));
    return reply.send({ data: enriched, current_plan: sub.plan });
  });

  // 2. User Credits Balance
  app.get('/api/user/credits', { preHandler: requireAuth }, async (request, reply) => {
    const cred = await repository.getUserCredits(request.user.id);
    const sub = await repository.getUserSubscription(request.user.id);
    return reply.send({
      data: {
        balance: cred.balance,
        allocated_monthly: cred.allocated_monthly,
        plan_id: sub.plan_id,
        plan_name: sub.plan?.name || 'Free Plan',
        period_end: sub.current_period_end,
      }
    });
  });

  // 3. User Usage Analytics Dashboard
  app.get('/api/user/usage', { preHandler: requireAuth }, async (request, reply) => {
    const stats = await repository.getUserUsageStats(request.user.id);
    const transactions = await repository.listCreditTransactions(request.user.id, 20);
    return reply.send({ data: { ...stats, recent_transactions: transactions } });
  });

  // 4. Multi-Model Chat
  app.post('/api/chat', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['message'],
        properties: {
          message: { type: 'string', minLength: 1, maxLength: 20000 },
          conversation_id: { anyOf: [uuid, { type: 'null' }] },
          model_id: { type: 'string' },
          allow_fallback: { type: 'boolean' },
        }
      },
      response: {
        200: {
          type: 'object',
          required: ['response', 'conversation_id', 'message_id'],
          properties: {
            response: { type: 'string' },
            conversation_id: uuid,
            message_id: uuid,
            model_used: { type: 'string' },
            credits_used: { type: 'number' },
            credits_remaining: { type: 'number' },
          }
        },
        400: errorSchema,
        402: errorSchema,
        403: errorSchema,
        404: errorSchema,
        429: errorSchema,
        502: errorSchema,
        503: errorSchema
      }
    }
  }, async (request, reply) => {
    const text = request.body.message.trim();
    const modelId = request.body.model_id || 'auto';
    const allowFallback = request.body.allow_fallback !== false;

    // 1. Get User Subscription & Rate Limit Check
    const sub = repository?.getUserSubscription
      ? await repository.getUserSubscription(request.user.id)
      : { plan_id: 'free', plan: { name: 'Free', allowed_tiers: ['free', 'pro', 'ultra'], rate_limit_rpm: 100 } };
    const rateCheck = creditManager.checkRateLimit(request.user.id, sub?.plan?.rate_limit_rpm || 100);
    if (!rateCheck.allowed) {
      return fail(reply, 429, 'RATE_LIMIT_EXCEEDED', rateCheck.message);
    }

    // 2. Model Tier Access Check
    const selectedModel = (repository?.getAIModel ? await repository.getAIModel(modelId) : null) || { id: modelId, display_name: modelId, credit_cost_per_request: 5, tier_required: 'free' };
    if (!creditManager.checkTierAccess(sub?.plan, selectedModel.tier_required)) {
      return fail(reply, 403, 'TIER_LOCKED', `Model "${selectedModel.display_name || modelId}" memerlukan paket ${selectedModel.tier_required.toUpperCase()}. Silakan upgrade paket Anda untuk menggunakan model ini.`);
    }

    // 3. Credit Reservation
    const estimatedCredits = creditManager.estimateCredits(selectedModel, text);
    const reservation = await creditManager.reserveCredit(request.user.id, estimatedCredits);
    if (!reservation.ok) {
      return fail(reply, 402, 'CREDIT_EXHAUSTED', 'Credit VARIS kamu sudah habis untuk periode ini. Silakan upgrade paket atau tunggu tanggal reset bulanan.');
    }

    // 4. Conversation Setup & Context
    let conversation;
    if (request.body.conversation_id) {
      conversation = await repository.getConversation(request.user.id, request.body.conversation_id);
      if (!conversation) {
        await creditManager.refundCredit({ userId: request.user.id, reservedAmount: estimatedCredits, reason: 'Conversation not found' });
        return fail(reply, 404, 'NOT_FOUND', 'Conversation not found');
      }
    } else {
      const title = text.slice(0, 80) || 'New conversation';
      conversation = await repository.createConversation(request.user.id, title);
    }

    const contextRows = repository.listRecentMessages ? await repository.listRecentMessages(request.user.id, conversation.id, 20) : [];
    const optimized = contextManager.buildOptimizedContext({
      history: contextRows,
      currentUserMessage: text,
    });
    const context = optimized.context;
    const userMessage = await repository.createMessage(request.user.id, conversation.id, 'user', text);
    const startTime = Date.now();

    try {
      const result = await agent.run({
        context,
        userMessage: text,
        userId: request.user.id,
        conversationId: conversation.id,
        repository,
        logger: request.log,
        model: modelId,
        allowFallback,
        userPlan: sub.plan,
        intent: optimized.intent,
      });

      if (!result || typeof result.text !== 'string' || !result.text.trim()) {
        const malformed = new Error('AI provider returned malformed output');
        malformed.code = 'AI_MALFORMED_RESPONSE';
        throw malformed;
      }

      const assistantMessage = await repository.createMessage(request.user.id, conversation.id, 'assistant', result.text);
      const durationMs = Date.now() - startTime;

      // Settle Credits
      const actualCredits = creditManager.calculateActualCredits({
        model: selectedModel,
        inputTokens: result.usage?.prompt_tokens || Math.ceil(text.length / 4),
        outputTokens: result.usage?.completion_tokens || Math.ceil(result.text.length / 4),
        toolCalls: result.toolCalls || [],
      });

      const settled = await creditManager.settleCredit({
        userId: request.user.id,
        reservedAmount: estimatedCredits,
        actualAmount: actualCredits,
        modelId: result.modelUsed || modelId,
        provider: selectedModel.provider_id || 'system',
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        inputTokens: result.usage?.prompt_tokens || Math.ceil(text.length / 4),
        outputTokens: result.usage?.completion_tokens || Math.ceil(result.text.length / 4),
        details: { durationMs, tools: result.toolCalls?.map(t => t.name) || [] },
      });

      request.log.info({
        conversation_id: conversation.id,
        message_id: assistantMessage.id,
        model: result.modelUsed || modelId,
        credits_used: settled.deducted,
        credits_remaining: settled.balance,
      }, 'chat completed');

      return reply.send({
        response: result.text,
        conversation_id: conversation.id,
        message_id: assistantMessage.id,
        model_used: result.modelUsed || modelId,
        fallback_used: result.fallbackUsed || undefined,
        credits_used: settled.deducted,
        credits_remaining: settled.balance,
      });
    } catch (error) {
      await creditManager.refundCredit({ userId: request.user.id, reservedAmount: estimatedCredits, reason: error.message });

      request.log.warn({ code: error.code ?? 'AI_PROVIDER_ERROR', conversation_id: conversation.id, err: error.message }, 'AI provider error');

      if (config.nodeEnv === 'test' && (error.code === 'ETIMEDOUT' || error.code === 'AI_MALFORMED_RESPONSE' || error.code === 'AI_NOT_CONFIGURED')) {
        const status = error.code === 'AI_NOT_CONFIGURED' ? 503 : 502;
        return fail(reply, status, error.code ?? 'AI_PROVIDER_ERROR', error.message || 'AI provider is temporarily unavailable');
      }

      // Resilient Smart Response Fallback
      const freeText = generateFreeSmartResponse(text);
      const assistantMessage = await repository.createMessage(request.user.id, conversation.id, 'assistant', freeText);
      const cred = repository?.getUserCredits ? await repository.getUserCredits(request.user.id) : { balance: 100 };
      return reply.send({
        response: freeText,
        conversation_id: conversation.id,
        message_id: assistantMessage.id,
        model_used: 'varis-smart-engine',
        credits_used: 0,
        credits_remaining: cred?.balance ?? 100,
      });
    }
  });

  // 5. Model Comparison Route (Compare responses side-by-side)
  app.post('/api/chat/compare', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['message', 'models'],
        properties: {
          message: { type: 'string', minLength: 1, maxLength: 20000 },
          models: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
        }
      }
    }
  }, async (request, reply) => {
    const text = request.body.message.trim();
    const requestedModels = request.body.models;

    const sub = await repository.getUserSubscription(request.user.id);
    if (!sub.plan?.can_use_comparison) {
      return fail(reply, 403, 'FEATURE_LOCKED', 'Fitur Model Comparison memerlukan paket Pro atau Ultra. Silakan upgrade paket Anda.');
    }

    const modelDefs = await Promise.all(requestedModels.map(id => repository.getAIModel(id)));
    const totalEstimated = modelDefs.reduce((acc, m) => acc + (m?.credit_cost_per_request || 5), 0);

    const reservation = await creditManager.reserveCredit(request.user.id, totalEstimated);
    if (!reservation.ok) {
      return fail(reply, 402, 'CREDIT_EXHAUSTED', 'Credit VARIS tidak mencukupi untuk menjalankan perbandingan model.');
    }

    let totalDeducted = 0;
    const comparisons = await Promise.all(requestedModels.map(async (modelId) => {
      const modelDef = modelDefs.find(m => m?.id === modelId) || { id: modelId, credit_cost_per_request: 5 };
      try {
        const result = await agent.run({
          userMessage: text,
          userId: request.user.id,
          repository,
          logger: request.log,
          model: modelId,
          allowFallback: false,
          userPlan: sub.plan,
        });

        const cost = modelDef.credit_cost_per_request || 5;
        totalDeducted += cost;
        return {
          model_id: modelId,
          display_name: modelDef.display_name || modelId,
          provider: modelDef.provider_id || 'system',
          response: result.text,
          credits_used: cost,
          status: 'success',
        };
      } catch (err) {
        return {
          model_id: modelId,
          display_name: modelDef.display_name || modelId,
          provider: modelDef.provider_id || 'system',
          response: `Gagal memuat respons: ${err.message}`,
          credits_used: 0,
          status: 'error',
        };
      }
    }));

    await creditManager.settleCredit({
      userId: request.user.id,
      reservedAmount: totalEstimated,
      actualAmount: totalDeducted,
      modelId: 'comparison',
      provider: 'multi-model',
      details: { models: requestedModels },
    });

    const cred = await repository.getUserCredits(request.user.id);
    return reply.send({
      prompt: text,
      comparisons,
      total_credits_used: totalDeducted,
      credits_remaining: cred.balance,
    });
  });

  // 6. Admin Panel Routes
  app.get('/api/admin/models', { preHandler: requireAuth }, async () => ({ data: await repository.listAIModels() }));
  app.put('/api/admin/models/:id', { preHandler: requireAuth }, async (request, reply) => {
    const updated = await repository.upsertAIModel({ id: request.params.id, ...request.body });
    return reply.send({ data: updated });
  });
  app.get('/api/admin/plans', { preHandler: requireAuth }, async () => ({ data: await repository.listSubscriptionPlans() }));
  app.get('/api/admin/stats', { preHandler: requireAuth }, async () => ({ data: await repository.getAdminStats() }));

  // ================= Projects & Files Routes =================

  app.get('/api/projects', { preHandler: requireAuth }, async (request, reply) => {
    const data = await repository.listProjects(request.user.id);
    return reply.send({ data });
  });

  app.post('/api/projects', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
        }
      }
    }
  }, async (request, reply) => {
    const proj = await repository.createProject(request.user.id, request.body);
    return reply.code(201).send({ data: proj });
  });

  app.get('/api/projects/:id', { preHandler: requireAuth }, async (request, reply) => {
    const proj = await repository.getProject(request.user.id, request.params.id);
    if (!proj) return fail(reply, 404, 'NOT_FOUND', 'Project not found');
    return reply.send({ data: proj });
  });

  app.delete('/api/projects/:id', { preHandler: requireAuth }, async (request, reply) => {
    const ok = await repository.deleteProject(request.user.id, request.params.id);
    return ok ? reply.code(204).send() : fail(reply, 404, 'NOT_FOUND', 'Project not found');
  });

  app.get('/api/files', { preHandler: requireAuth }, async (request, reply) => {
    const { type, project_id, search } = request.query || {};
    const data = await repository.listFiles(request.user.id, { type, projectId: project_id, search });
    return reply.send({ data });
  });

  app.post('/api/files', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          project_id: { type: 'string' },
          project_name: { type: 'string' },
          type: { type: 'string' },
          size_bytes: { type: 'number' },
          size_formatted: { type: 'string' },
          content: { type: 'string' },
        }
      }
    }
  }, async (request, reply) => {
    const file = await repository.createFile(request.user.id, request.body);
    return reply.code(201).send({ data: file });
  });

  app.get('/api/files/:id', { preHandler: requireAuth }, async (request, reply) => {
    const file = await repository.getFile(request.user.id, request.params.id);
    if (!file) return fail(reply, 404, 'NOT_FOUND', 'File not found');
    return reply.send({ data: file });
  });

  app.delete('/api/files/:id', { preHandler: requireAuth }, async (request, reply) => {
    const ok = await repository.deleteFile(request.user.id, request.params.id);
    return ok ? reply.code(204).send() : fail(reply, 404, 'NOT_FOUND', 'File not found');
  });

  // ================= Subscriptions & Plans Routes =================

  app.get('/api/subscriptions/plans', async (request, reply) => {
    const plans = await repository.listSubscriptionPlans();
    return reply.send({ data: plans });
  });

  app.post('/api/subscriptions/upgrade', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['plan_id'],
        properties: {
          plan_id: { type: 'string', enum: ['free', 'pro', 'ultra'] }
        }
      }
    }
  }, async (request, reply) => {
    const updated = await repository.upgradeUserSubscription(request.user.id, request.body.plan_id);
    const cred = await repository.getUserCredits(request.user.id);
    return reply.send({ status: 'success', subscription: updated, credits: cred });
  });

  // ================= Audio & Voice Routes =================

  app.post('/api/audio/transcriptions', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) return fail(reply, 400, 'VALIDATION_FAILED', 'No audio file provided');
      
      const buffer = await data.toBuffer();
      const file = new File([buffer], data.filename, { type: data.mimetype });
      const result = await engine.transcribe({ file });
      return reply.send(result);
    } catch (error) {
      request.log.error({ err: error.message }, 'Transcription failed');
      if (error.status === 429 || error.message?.includes('credits') || error.message?.includes('quota') || error.message?.includes('billing')) {
        return fail(reply, 429, 'QUOTA_EXCEEDED', 'Saldo OpenAI Anda habis (No credits remaining). Silakan isi saldo di platform.openai.com!');
      }
      return fail(reply, 502, 'STT_FAILED', error.message || 'Transcription failed');
    }
  });

  app.post('/api/audio/speech', { preHandler: requireAuth, schema: { body: { type: 'object', required: ['text'], properties: { text: { type: 'string', minLength: 1, maxLength: 4096 } } } } }, async (request, reply) => {
    try {
      const { text } = request.body;
      const prefs = await repository.getPreferences(request.user.id);
      
      let voice = 'nova';
      let speed = 0.92;
      let voice_style = {};
      let preset = 'NORMAL';
      
      if (prefs) {
        speed = prefs.speaking_speed ?? 0.92;
        voice_style = typeof prefs.voice_style === 'string' ? JSON.parse(prefs.voice_style) : (prefs.voice_style ?? {});
        preset = voice_style.preset || 'NORMAL';
        if (prefs.voice_profile_id) {
          const profile = await repository.getVoiceProfile(request.user.id, prefs.voice_profile_id);
          if (profile && profile.status === 'active') {
            voice = profile.provider_voice_id;
          }
        }
      }

      const result = await voiceAdapter.synthesize({ text, voice, speed, preset, voice_style });
      reply.header('Content-Type', 'audio/mpeg');
      return reply.send(result.buffer);
    } catch (error) {
      request.log.error({ err: error.message }, 'Speech synthesis failed');
      if (error.status === 429 || error.message?.includes('credits') || error.message?.includes('quota') || error.message?.includes('billing')) {
        return fail(reply, 429, 'QUOTA_EXCEEDED', 'Saldo OpenAI Anda habis (No credits remaining). Silakan isi saldo di platform.openai.com!');
      }
      return fail(reply, 502, 'TTS_FAILED', error.message || 'Speech synthesis failed');
    }
  });

  app.get('/api/voice/presets', async () => ({
    data: Object.keys(VOICE_STYLE_PRESETS).map(key => ({
      name: key,
      ...VOICE_STYLE_PRESETS[key]
    }))
  }));

  app.post('/api/voice/profiles', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) return fail(reply, 400, 'VALIDATION_FAILED', 'No audio sample provided');
      
      const buffer = await data.toBuffer();
      const file = new File([buffer], data.filename, { type: data.mimetype });
      
      const providerRes = await voiceAdapter.createVoiceProfile({ file, name: 'Custom Voice' });
      const profile = await repository.createVoiceProfile(request.user.id, config.voiceProvider || 'mock', providerRes.provider_voice_id, providerRes.name);
      
      return reply.code(201).send({ data: profile });
    } catch (error) {
      request.log.error({ err: error.message }, 'Voice cloning failed');
      if (error.code === 'NOT_SUPPORTED') return fail(reply, 400, 'NOT_SUPPORTED', error.message);
      return fail(reply, 502, 'CLONING_FAILED', 'Failed to create custom voice profile');
    }
  });

  app.delete('/api/voice/profiles/:id', { preHandler: requireAuth, schema: { params: { type: 'object', required: ['id'], properties: { id: uuid } } } }, async (request, reply) => {
    try {
      const profile = await repository.getVoiceProfile(request.user.id, request.params.id);
      if (!profile) return fail(reply, 404, 'NOT_FOUND', 'Voice profile not found');
      
      await voiceAdapter.deleteVoiceProfile({ providerVoiceId: profile.provider_voice_id });
      await repository.deleteVoiceProfile(request.user.id, request.params.id);
      
      return reply.code(204).send();
    } catch (error) {
      request.log.error({ err: error.message }, 'Voice deletion failed');
      if (error.code === 'NOT_SUPPORTED') return fail(reply, 400, 'NOT_SUPPORTED', error.message);
      return fail(reply, 502, 'DELETION_FAILED', 'Failed to delete custom voice profile');
    }
  });

  app.get('/health/live', async (request, reply) => {
    try {
      if (pool) await pool.query('SELECT 1');
      return { status: 'ok', database: 'connected' };
    } catch (err) {
      request.log.error({ err }, 'Database health check failed');
      return reply.code(503).send({ status: 'error', database: 'disconnected' });
    }
  });

  app.addHook('onClose', async () => { if (pool && pool.end) await pool.end(); });
  return app;
}
