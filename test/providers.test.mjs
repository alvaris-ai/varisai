import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMultiProviderOrchestrator,
  createSmartLocalProvider,
  createAIProviderFromConfig,
  VARIS_SYSTEM_PROMPT,
} from '../src/ai-providers.mjs';

test('MultiProviderOrchestrator: primary provider succeeds directly', async () => {
  let primaryCalled = 0;
  let secondaryCalled = 0;

  const primary = {
    name: 'mock-primary',
    respond: async ({ userMessage }) => {
      primaryCalled++;
      return { text: `Answer to ${userMessage}`, toolCalls: [], model: 'mock-p1' };
    },
  };

  const secondary = {
    name: 'mock-secondary',
    respond: async () => {
      secondaryCalled++;
      return { text: 'Secondary answer', toolCalls: [], model: 'mock-p2' };
    },
  };

  const orchestrator = createMultiProviderOrchestrator({ providers: [primary, secondary] });
  const result = await orchestrator.respond({ userMessage: 'Halo' });

  assert.equal(primaryCalled, 1);
  assert.equal(secondaryCalled, 0);
  assert.equal(result.text, 'Answer to Halo');
  assert.equal(result.activeProvider, 'mock-primary');
});

test('MultiProviderOrchestrator: falls back to secondary when primary hits 429 quota error', async () => {
  let primaryCalled = 0;
  let secondaryCalled = 0;

  const quotaError = new Error('You exceeded your current quota');
  quotaError.status = 429;

  const primary = {
    name: 'mock-openai',
    respond: async () => {
      primaryCalled++;
      throw quotaError;
    },
  };

  const secondary = {
    name: 'mock-gemini',
    respond: async ({ userMessage }) => {
      secondaryCalled++;
      return { text: `Gemini response for: ${userMessage}`, toolCalls: [], model: 'gemini-2.0-flash' };
    },
  };

  const orchestrator = createMultiProviderOrchestrator({ providers: [primary, secondary] });
  const result = await orchestrator.respond({ userMessage: 'Siapa presiden Indonesia?' });

  assert.equal(primaryCalled, 1);
  assert.equal(secondaryCalled, 1);
  assert.equal(result.activeProvider, 'mock-gemini');
  assert.ok(result.text.includes('Gemini response'));
});

test('MultiProviderOrchestrator: falls through to smart local when all API providers fail', async () => {
  const primary = {
    name: 'mock-openai',
    respond: async () => {
      const err = new Error('Quota exceeded');
      err.status = 429;
      throw err;
    },
  };

  const secondary = {
    name: 'mock-gemini',
    respond: async () => {
      const err = new Error('Service Unavailable');
      err.status = 503;
      throw err;
    },
  };

  const smartLocal = createSmartLocalProvider();

  const orchestrator = createMultiProviderOrchestrator({ providers: [primary, secondary, smartLocal] });
  const result = await orchestrator.respond({ userMessage: 'Siapa kamu?' });

  assert.equal(result.activeProvider, 'smart_local');
  assert.ok(result.text.toLowerCase().includes('varis'));
});

test('createAIProviderFromConfig: initializes providers based on environment config', () => {
  // Free mode
  const freeOrchestrator = createAIProviderFromConfig({ aiProvider: 'free' });
  assert.equal(freeOrchestrator.providers.length, 1);
  assert.equal(freeOrchestrator.providers[0].name, 'smart_local');

  // Multi-provider config with OpenAI, Gemini, Groq, DeepSeek, OpenRouter + SmartLocal safety net
  const multiOrchestrator = createAIProviderFromConfig({
    openaiApiKey: 'test-openai-key',
    geminiApiKey: 'test-gemini-key',
    groqApiKey: 'test-groq-key',
    deepseekApiKey: 'test-deepseek-key',
    openrouterApiKey: 'test-openrouter-key',
  });

  const providerNames = multiOrchestrator.providers.map(p => p.name);
  assert.ok(providerNames.includes('openai'));
  assert.ok(providerNames.includes('gemini'));
  assert.ok(providerNames.includes('groq'));
  assert.ok(providerNames.includes('deepseek'));
  assert.ok(providerNames.includes('openrouter'));
  assert.ok(providerNames.includes('smart_local'));
});

test('MultiProviderOrchestrator: routes deepseek model queries properly', async () => {
  let deepseekCalled = 0;
  const deepseek = {
    name: 'deepseek',
    isConfigured: () => true,
    respond: async ({ model, userMessage }) => {
      deepseekCalled++;
      return { text: `DeepSeek response for ${userMessage} using ${model}`, toolCalls: [], model };
    },
  };

  const orchestrator = createMultiProviderOrchestrator({ providers: [deepseek] });
  const result = await orchestrator.respond({ model: 'deepseek-r1', userMessage: 'Bantu coding algoritma' });

  assert.equal(deepseekCalled, 1);
  assert.equal(result.activeProvider, 'deepseek');
  assert.ok(result.text.includes('DeepSeek response'));
});

test('VARIS_SYSTEM_PROMPT includes essential guidelines', () => {
  assert.ok(VARIS_SYSTEM_PROMPT.includes('VARIS'));
  assert.ok(VARIS_SYSTEM_PROMPT.includes('calculator'));
  assert.ok(VARIS_SYSTEM_PROMPT.includes('web_search'));
  assert.ok(VARIS_SYSTEM_PROMPT.includes('weather'));
  assert.ok(VARIS_SYSTEM_PROMPT.includes('Kontrol Halusinasi'));
});

