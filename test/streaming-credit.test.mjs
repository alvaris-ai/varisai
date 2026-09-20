import test from 'node:test';
import assert from 'node:assert/strict';
import { createMultiProviderOrchestrator, createOpenAIProvider, createGeminiProvider, createGroqProvider, createSmartLocalProvider } from '../src/ai-providers.mjs';
import { createCreditManager } from '../src/credit-system.mjs';
import { createEntitlementSystem, ENTITLEMENT_STATUS } from '../src/entitlement-system.mjs';
import { processUploadedFile, formatFileForPrompt } from '../src/file-processor.mjs';

test('Strict Model Fidelity: Routes strictly to requested provider without silent fake switching', async () => {
  const dummyOpenAIClient = {
    chat: {
      completions: {
        create: async ({ model }) => ({
          choices: [{ message: { content: `OpenAI response for ${model}` } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        }),
      },
      models: { list: async () => ({ data: [] }) },
    },
    responses: {
      create: async ({ model }) => ({
        output_text: `OpenAI response for ${model}`,
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }),
    },
  };

  const dummyGeminiClient = {
    chat: {
      completions: {
        create: async ({ model }) => ({
          choices: [{ message: { content: `Gemini response for ${model}` } }],
          usage: { prompt_tokens: 15, completion_tokens: 25 },
        }),
      },
      models: { list: async () => ({ data: [] }) },
    },
  };

  const openAIProv = createOpenAIProvider({ client: dummyOpenAIClient, apiKey: 'sk-test' });
  const geminiProv = createGeminiProvider({ client: dummyGeminiClient, apiKey: 'gemini-test' });
  const orchestrator = createMultiProviderOrchestrator({ providers: [openAIProv, geminiProv] });

  // 1. Explicit Gemini Selection hits Gemini
  const resGemini = await orchestrator.respond({ userMessage: 'Hello', model: 'gemini-2.0-flash', allowFallback: false });
  assert.equal(resGemini.activeProvider, 'gemini');
  assert.equal(resGemini.modelUsed, 'gemini-2.0-flash');
  assert.ok(resGemini.text.includes('Gemini response for gemini-2.0-flash'));

  // 2. Explicit GPT Selection hits OpenAI
  const resGPT = await orchestrator.respond({ userMessage: 'Hello', model: 'gpt-4o-mini', allowFallback: false });
  assert.equal(resGPT.activeProvider, 'openai');
  assert.equal(resGPT.modelUsed, 'gpt-4o-mini');
  assert.ok(resGPT.text.includes('OpenAI response for gpt-4o-mini'));

  // 3. Unconfigured provider throws explicit error when allowFallback: false (Strict Zero Fake AI rule)
  const orchestratorWithoutGroq = createMultiProviderOrchestrator({ providers: [openAIProv] });
  await assert.rejects(
    async () => {
      await orchestratorWithoutGroq.respond({ userMessage: 'Hello', model: 'llama-3.3-70b', allowFallback: false });
    },
    { code: 'AI_NOT_CONFIGURED' }
  );
});

test('Streaming Engine: Token-by-token streaming delivery', async () => {
  const localProvider = createSmartLocalProvider();
  const orchestrator = createMultiProviderOrchestrator({ providers: [localProvider] });

  const tokens = [];
  const result = await orchestrator.stream(
    { userMessage: 'Hitung 25 ditambah 75', model: 'auto' },
    (token) => tokens.push(token)
  );

  assert.ok(tokens.length > 0);
  assert.ok(result.text.length > 0);
  assert.ok(tokens.join('').includes('100'));
});

test('Entitlement System: Google GIS OAuth returns NOT_VERIFIED by default', async () => {
  const entitlement = createEntitlementSystem();
  const googleUser = {
    id: 'usr-123',
    email: 'user@gmail.com',
    google_id: 'goog-99999',
  };

  const result = await entitlement.verifyGoogleEntitlement(googleUser);
  assert.equal(result.status, ENTITLEMENT_STATUS.NOT_VERIFIED);
  assert.equal(result.verified, false);
  assert.ok(result.message.includes('VARIS workspace plan'));
});

test('File Processor: Text, Code, and Multimodal Image Extraction', async () => {
  // 1. Text / Code extraction
  const codeFile = await processUploadedFile({
    filename: 'index.ts',
    buffer: Buffer.from('const x: number = 42;'),
    mimeType: 'text/typescript',
  });
  assert.equal(codeFile.type, 'text');
  assert.equal(codeFile.isMultimodal, false);

  const formatted = formatFileForPrompt(codeFile);
  assert.ok(formatted.includes('```typescript'));
  assert.ok(formatted.includes('const x: number = 42;'));

  // 2. Multimodal Image extraction
  const imgFile = await processUploadedFile({
    filename: 'diagram.png',
    buffer: Buffer.from('fake-image-bytes'),
    mimeType: 'image/png',
  });
  assert.equal(imgFile.type, 'image');
  assert.equal(imgFile.isMultimodal, true);
  assert.ok(imgFile.dataUrl.startsWith('data:image/png;base64,'));
});

test('Credit System: 2-Phase Atomic Reservation & Settlement with 100% Failure Refund', async () => {
  let userBalance = 100;
  let userReserved = 0;

  const mockRepo = {
    async reserveCredits(userId, amount) {
      if (userBalance - userReserved < amount) return { ok: false };
      userReserved += amount;
      return { ok: true, reservationId: 'res-1', reservedAmount: amount };
    },
    async settleCredits({ reservedAmount, actualAmount }) {
      userReserved -= reservedAmount;
      userBalance -= actualAmount;
      return { ok: true, balance: userBalance, deducted: actualAmount };
    },
    async refundCredits({ reservedAmount }) {
      userReserved -= reservedAmount;
      return { ok: true, balance: userBalance, refunded: reservedAmount };
    },
  };

  const cm = createCreditManager(mockRepo);

  // 1. Phase 1: Pre-Reserve
  const reserveRes = await cm.reserveCredit('user-1', 5);
  assert.equal(reserveRes.ok, true);
  assert.equal(userReserved, 5);

  // 2. Phase 2: Settle on success
  const settleRes = await cm.settleCredit({
    userId: 'user-1',
    reservedAmount: 5,
    actualAmount: 4,
  });
  assert.equal(settleRes.ok, true);
  assert.equal(userBalance, 96);
  assert.equal(userReserved, 0);

  // 3. Failure Refund: If request throws, 100% of reserved is refunded
  await cm.reserveCredit('user-1', 10);
  assert.equal(userReserved, 10);

  const refundRes = await cm.refundCredit({
    userId: 'user-1',
    reservedAmount: 10,
    reason: 'Provider timeout',
  });
  assert.equal(refundRes.ok, true);
  assert.equal(userBalance, 96); // Balance not deducted
  assert.equal(userReserved, 0);  // Reserved cleared
});
