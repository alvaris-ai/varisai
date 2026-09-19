import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.mjs';
import { createRepositories } from '../src/repositories.mjs';
import { createCreditManager } from '../src/credit-system.mjs';
import { selectAutoModel } from '../src/ai-providers.mjs';

test('CreditManager: estimates and calculates credit cost correctly', () => {
  const cm = createCreditManager();
  const modelFlash = { id: 'gemini-2.0-flash', credit_cost_per_request: 3 };
  const modelPro = { id: 'gemini-1.5-pro', credit_cost_per_request: 12 };

  // Short text
  assert.equal(cm.estimateCredits(modelFlash, 'Halo apa kabar?'), 3);
  assert.equal(cm.estimateCredits(modelPro, 'Halo apa kabar?'), 12);

  // Actual credit calculation with tokens and tools
  const actual = cm.calculateActualCredits({
    model: modelPro,
    inputTokens: 1500,
    outputTokens: 1500,
    toolCalls: [{ name: 'calculator' }, { name: 'web_search' }],
  });
  // base (12) + tokenAdjustment (2) + toolAdjustment (2) = 16
  assert.equal(actual, 16);
});

test('CreditManager: tier access gating and rate limiting', () => {
  const cm = createCreditManager();
  const freePlan = { plan_id: 'free', allowed_tiers: ['free'], rate_limit_rpm: 2 };
  const proPlan = { plan_id: 'pro', allowed_tiers: ['free', 'pro'], rate_limit_rpm: 30 };

  // Tier access
  assert.equal(cm.checkTierAccess(freePlan, 'free'), true);
  assert.equal(cm.checkTierAccess(freePlan, 'pro'), false);
  assert.equal(cm.checkTierAccess(freePlan, 'ultra'), false);
  assert.equal(cm.checkTierAccess(proPlan, 'pro'), true);

  // Rate Limiting
  assert.equal(cm.checkRateLimit('user-1', 2).allowed, true);
  assert.equal(cm.checkRateLimit('user-1', 2).allowed, true);
  const rateBlocked = cm.checkRateLimit('user-1', 2);
  assert.equal(rateBlocked.allowed, false);
  assert.ok(rateBlocked.retryAfterSeconds > 0);
});

test('SmartModelRouter (selectAutoModel): chooses model according to task complexity', () => {
  const providers = [{ name: 'google' }, { name: 'openai' }, { name: 'groq' }];

  // Simple question
  const simple = selectAutoModel({
    userMessage: 'Halo apa kabar?',
    intent: { type: 'small_talk' },
    userPlan: { plan_id: 'free', allowed_tiers: ['free'] },
    availableProviders: providers,
  });
  assert.equal(simple.modelId, 'gemini-2.0-flash');

  // Complex coding with Pro Plan
  const codingPro = selectAutoModel({
    userMessage: 'Buatkan arsitektur sistem backend microservices dengan Node.js',
    intent: { type: 'coding' },
    userPlan: { plan_id: 'pro', allowed_tiers: ['free', 'pro'] },
    availableProviders: providers,
  });
  assert.equal(codingPro.modelId, 'gpt-4o');
});

test('Multi-Model Platform: End-to-End API Workflows', async t => {
  const repos = createRepositories(null); // In-Memory repository with full multi-model support
  const mockEngine = {
    respond: async ({ userMessage, model }) => {
      return {
        text: `Response from ${model || 'auto'}: ${userMessage}`,
        model: model || 'gemini-2.0-flash',
        usage: { prompt_tokens: 25, completion_tokens: 35 },
      };
    },
    embed: async () => new Array(128).fill(0.1),
  };

  const app = buildApp({
    config: { nodeEnv: 'test', appOrigin: 'http://localhost:3000', cookieSecure: false, sessionTtlSeconds: 3600 },
    repos,
    aiEngine: mockEngine,
  });
  t.after(() => app.close());

  // 1. Register User
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Developer User', email: 'dev@example.com', password: 'securepassword123' },
  });
  assert.equal(regRes.statusCode, 201);
  const cookieHeader = regRes.cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const userId = regRes.json().user.id;

  // 2. GET /api/models - Check models list & tier locking
  const modelsRes = await app.inject({
    method: 'GET',
    url: '/api/models',
    headers: { cookie: cookieHeader },
  });
  assert.equal(modelsRes.statusCode, 200);
  const models = modelsRes.json().data;
  assert.ok(models.length >= 6);

  const flashModel = models.find(m => m.id === 'gemini-2.0-flash');
  const proModel = models.find(m => m.id === 'gpt-4o');
  assert.equal(flashModel.is_locked, false); // Free plan has access to free tier models
  assert.equal(proModel.is_locked, true); // Free plan cannot access pro models

  // 3. GET /api/user/credits - Initial credit check (100 credits)
  const creditsRes1 = await app.inject({
    method: 'GET',
    url: '/api/user/credits',
    headers: { cookie: cookieHeader },
  });
  assert.equal(creditsRes1.statusCode, 200);
  assert.equal(creditsRes1.json().data.balance, 100);

  // 4. POST /api/chat - Successful chat with free model deducts credit
  const chatRes1 = await app.inject({
    method: 'POST',
    url: '/api/chat',
    headers: { cookie: cookieHeader },
    payload: { message: 'Halo VARIS', model_id: 'gemini-2.0-flash' },
  });
  assert.equal(chatRes1.statusCode, 200);
  assert.ok(chatRes1.json().response.includes('gemini-2.0-flash'));
  assert.ok(chatRes1.json().credits_used > 0);
  assert.equal(chatRes1.json().credits_remaining, 100 - chatRes1.json().credits_used);

  // 5. POST /api/chat - Reject locked model for Free tier user (403 TIER_LOCKED)
  const lockedRes = await app.inject({
    method: 'POST',
    url: '/api/chat',
    headers: { cookie: cookieHeader },
    payload: { message: 'Bantu coding kompleks', model_id: 'gpt-4o' },
  });
  assert.equal(lockedRes.statusCode, 403);
  assert.equal(lockedRes.json().error.code, 'TIER_LOCKED');

  // 6. Upgrade User to PRO Plan
  await repos.setUserSubscription(userId, 'pro');

  // Verify Pro plan model access unlocked
  const modelsRes2 = await app.inject({
    method: 'GET',
    url: '/api/models',
    headers: { cookie: cookieHeader },
  });
  const proModelAfterUpgrade = modelsRes2.json().data.find(m => m.id === 'gpt-4o');
  assert.equal(proModelAfterUpgrade.is_locked, false);

  // 7. POST /api/chat - Execute chat with GPT-4o on Pro plan
  const chatRes2 = await app.inject({
    method: 'POST',
    url: '/api/chat',
    headers: { cookie: cookieHeader },
    payload: { message: 'Analisis arsitektur ini', model_id: 'gpt-4o' },
  });
  assert.equal(chatRes2.statusCode, 200);
  assert.ok(chatRes2.json().response.includes('gpt-4o'));

  // 8. POST /api/chat/compare - Model Comparison Feature
  const compareRes = await app.inject({
    method: 'POST',
    url: '/api/chat/compare',
    headers: { cookie: cookieHeader },
    payload: {
      message: 'Jelaskan konsep MVC',
      models: ['gemini-2.0-flash', 'gpt-4o'],
    },
  });
  assert.equal(compareRes.statusCode, 200);
  assert.equal(compareRes.json().comparisons.length, 2);
  assert.equal(compareRes.json().comparisons[0].status, 'success');
  assert.equal(compareRes.json().comparisons[1].status, 'success');
  assert.ok(compareRes.json().total_credits_used > 0);

  // 9. GET /api/user/usage - Usage Dashboard Analytics
  const usageRes = await app.inject({
    method: 'GET',
    url: '/api/user/usage',
    headers: { cookie: cookieHeader },
  });
  assert.equal(usageRes.statusCode, 200);
  const usageData = usageRes.json().data;
  assert.ok(usageData.requests_today >= 3);
  assert.ok(usageData.credits_used > 0);
  assert.ok(Array.isArray(usageData.model_breakdown));
  assert.ok(Array.isArray(usageData.recent_transactions));

  // 10. Admin Endpoints: Update model pricing & status
  const adminUpdateRes = await app.inject({
    method: 'PUT',
    url: '/api/admin/models/gemini-2.0-flash',
    headers: { cookie: cookieHeader },
    payload: { credit_cost_per_request: 2, status: 'available' },
  });
  assert.equal(adminUpdateRes.statusCode, 200);
  assert.equal(adminUpdateRes.json().data.credit_cost_per_request, 2);

  // 11. Admin Stats
  const adminStatsRes = await app.inject({
    method: 'GET',
    url: '/api/admin/stats',
    headers: { cookie: cookieHeader },
  });
  assert.equal(adminStatsRes.statusCode, 200);
  assert.ok(adminStatsRes.json().data.total_requests >= 3);
});
