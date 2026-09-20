import OpenAI from 'openai';
import { generateFreeSmartResponse } from './free-ai-engine.mjs';

export const VARIS_SYSTEM_PROMPT = `Kamu adalah VARIS, GENERAL PURPOSE AI AGENT cerdas, serbaguna, dan adaptif yang dirancang untuk membantu pengguna dalam berbagai cabang ilmu dan kebutuhan praktis secara alami, terstruktur, mendalam, dan akurat.

Formula & Arsitektur Utama VARIS:
1. Kecerdasan Multidisiplin (General Intelligence):
   Menguasai dan mampu memecahkan masalah dalam domain: Matematika, Fisika, Kimia, Biologi, Informatika, Pemrograman (Web, Mobile, Backend, Database, Cloud), AI/Machine Learning, Cybersecurity (secara aman dan defensif), Elektronika, Arduino, Robotika, Sejarah, Geografi, Ekonomi, Bisnis, Bahasa, Literatur, Pendidikan, Sains, Analisis PDF/Dokumen/Gambar/Data, dan Berita/Peristiwa Terkini.

2. Alur Penalaran 13-Langkah untuk Tugas Kompleks:
   1. Pahami tujuan dan intensi pengguna secara mendalam.
   2. Pecah masalah besar menjadi sub-masalah logis (Problem Decomposition).
   3. Tentukan informasi & data yang diperlukan.
   4. Gunakan tools yang relevan secara otomatis.
   5. Lakukan web research jika memerlukan data faktual/terkini.
   6. Prioritaskan sumber resmi, akademis, dan tepercaya.
   7. Bandingkan bukti jika ada informasi yang bertentangan.
   8. Susun evidence dan konteks terpadu.
   9. Lakukan multi-step reasoning dengan logika deduktif/induktif yang solid.
   10. Lakukan validasi dan self-check terhadap konsistensi faktual & matematis.
   11. Koreksi mandiri jika menemukan inkonsistensi.
   12. Berikan jawaban yang terstruktur, padat, jelas, dan mudah dipahami.
   13. Sertakan rujukan/sitasi sumber jika menggunakan data riset web.

3. Kejujuran & Epistemic Awareness:
   - Bedakan dengan jelas antara fakta [KNOWN], [VERIFIED], [UNCERTAIN], [CONFLICTING], dan [UNKNOWN].
   - VARIS TIDAK BOLEH berpura-pura mengetahui sesuatu yang tidak diketahuinya. Jika informasi tidak cukup, sampaikan dengan jujur batasan informasi yang ada.
   - Jangan pernah mengarang fakta, angka, nama, sitasi, URL, atau hasil eksekusi tool palsu.

4. Prinsip Jawaban (Answer-First & Brevity):
   - Jawaban langsung ke inti (point-first). Ambil poin utama jawabannya tanpa basa-basi berbelit-belit.
   - Jika diminta "singkat", "padat", "jelas", atau "ambil poinnya", jawab langsung dalam 1-2 kalimat ringkas dan berbobot.
   - Hindari kalimat pembuka klise seperti "Berdasarkan penelusuran...", "Tentu saja!", "Sebagai asisten AI...", atau "Terima kasih atas pertanyaannya".

5. Prioritas Nilai Utama:
   ACCURACY > HONESTY > RELEVANCE > CLARITY > SPEED`;

function isRetryable(error) {
  if (error?.retryable === false) return false;
  const status = error?.status ?? error?.statusCode;
  const msg = error?.message?.toLowerCase() || '';
  if (status === 429 && (msg.includes('credit') || msg.includes('quota') || msg.includes('billing'))) {
    return false;
  }
  if (status >= 400 && status < 500 && status !== 408 && status !== 409 && status !== 429) {
    return false;
  }
  if (error?.retryable) return true;
  return status === 408 || status === 409 || status === 429 || status >= 500 || ['ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH'].includes(error?.code);
}

function timeoutError(ms, providerName = 'AI provider') {
  const error = new Error(`${providerName} timeout after ${ms}ms`);
  error.code = 'AI_TIMEOUT';
  error.retryable = true;
  return error;
}

function sanitizeToolsForOpenAI(tools) {
  if (!tools?.length) return undefined;
  return tools.map(t => {
    const { strict, ...rest } = t;
    const params = rest.parameters ? { ...rest.parameters } : { type: 'object', properties: {} };
    return {
      ...rest,
      strict: false,
      parameters: {
        ...params,
        required: Array.isArray(params.required) ? params.required : [],
      },
    };
  });
}

// 1. OpenAI Provider
export function createOpenAIProvider({
  apiKey,
  model: defaultModel = 'gpt-4o-mini',
  baseURL,
  timeoutMs = 15_000,
  maxRetries = 1,
  client,
} = {}) {
  const openai = client ?? new OpenAI({ apiKey, baseURL, maxRetries: 0 });

  return {
    name: 'openai',
    isConfigured: () => Boolean(apiKey || client),
    countTokens: (text = '') => Math.ceil(text.length / 4),
    validateModel: (modelId = '') => modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3'),
    async healthCheck() {
      if (!apiKey && !client) return { status: 'not_configured', latencyMs: 0 };
      const start = Date.now();
      try {
        await openai.models.list({ timeout: 5000 });
        return { status: 'available', latencyMs: Date.now() - start };
      } catch (err) {
        return { status: 'unavailable', error: err.message, latencyMs: Date.now() - start };
      }
    },
    async generate(params) {
      return this.respond(params);
    },
    async respond(params) {
      const { context = [], userMessage, tools, continuation, toolResults, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;

      let messages;
      if (continuation && toolResults?.length) {
        const previousInput = continuation.previousInput ?? [];
        const assistantToolCalls = continuation.toolCallItems ?? [];
        const toolResultMessages = toolResults.map(r => ({
          role: 'tool',
          tool_call_id: r.callId,
          content: typeof r.result === 'string' ? r.result : JSON.stringify(r.result),
        }));
        messages = [
          ...previousInput,
          { role: 'assistant', tool_calls: assistantToolCalls },
          ...toolResultMessages,
        ];
      } else {
        messages = [
          { role: 'system', content: VARIS_SYSTEM_PROMPT },
          ...context.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ];
      }

      const formattedTools = tools?.length
        ? tools.map(t => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters || { type: 'object', properties: {} },
            },
          }))
        : undefined;

      let attempt = 0;
      while (true) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const completion = await openai.chat.completions.create(
              {
                model: targetModel,
                messages,
                ...(formattedTools ? { tools: formattedTools } : {}),
              },
              { signal: controller.signal }
            );

            const choice = completion.choices?.[0];
            const message = choice?.message;

            if (message?.tool_calls?.length > 0) {
              const parsedCalls = message.tool_calls.map(tc => {
                let args = {};
                try {
                  args = JSON.parse(tc.function.arguments);
                } catch {}
                return {
                  callId: tc.id || `call_${Date.now()}`,
                  name: tc.function.name,
                  arguments: args,
                };
              });

              return {
                toolCalls: parsedCalls,
                continuation: {
                  previousInput: messages,
                  toolCallItems: message.tool_calls,
                },
                model: targetModel,
                usage: completion.usage ?? null,
              };
            }

            const text = message?.content?.trim() || '';
            if (!text) {
              const malformed = new Error('OpenAI returned empty text output');
              malformed.code = 'AI_MALFORMED_RESPONSE';
              throw malformed;
            }

            return { text, toolCalls: [], model: targetModel, usage: completion.usage ?? null };
          } finally {
            clearTimeout(timer);
          }
        } catch (error) {
          if (error?.name === 'AbortError') error = timeoutError(timeoutMs, 'OpenAI');
          if (!isRetryable(error) || attempt >= maxRetries) throw error;
          const delay = Math.min(250 * (2 ** attempt), 2_000);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt += 1;
        }
      }
    },
    async stream(params, onToken) {
      const { context = [], userMessage, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;

      const messages = [
        { role: 'system', content: VARIS_SYSTEM_PROMPT },
        ...context.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      const streamResponse = await openai.chat.completions.create({
        model: targetModel,
        messages,
        stream: true,
      });

      let fullText = '';
      for await (const chunk of streamResponse) {
        const token = chunk.choices?.[0]?.delta?.content || '';
        if (token) {
          fullText += token;
          if (onToken) onToken(token);
        }
      }

      return {
        text: fullText.trim(),
        model: targetModel,
        usage: { prompt_tokens: Math.ceil(userMessage.length / 4), completion_tokens: Math.ceil(fullText.length / 4) },
      };
    },
    async embed({ text }) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    },
    async transcribe({ file }) {
      const response = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'id',
      });
      return { text: response.text };
    },
  };
}

export function normalizeGroqModel(model) {
  if (!model || model === 'auto') return 'llama-3.3-70b-versatile';
  if (model === 'llama-3.3-70b' || model === 'llama-3.3-70b-versatile' || model === 'llama-70b') return 'llama-3.3-70b-versatile';
  if (model === 'llama-3.1-8b' || model === 'llama-3.1-8b-instant' || model === 'llama-8b') return 'llama-3.1-8b-instant';
  if (model === 'llama-3.2-3b' || model === 'llama-3.2-3b-preview') return 'llama-3.2-3b-preview';
  if (model === 'llama-3.2-1b' || model === 'llama-3.2-1b-preview') return 'llama-3.2-1b-preview';
  if (model === 'mixtral-8x7b' || model === 'mixtral-8x7b-32768') return 'mixtral-8x7b-32768';
  if (model === 'gemma2-9b' || model === 'gemma2-9b-it') return 'gemma2-9b-it';
  if (model.includes('deepseek')) return 'deepseek-r1-distill-llama-70b';
  return model;
}

// 2. Google Gemini Provider
export function createGeminiProvider({
  apiKey,
  model: defaultModel = 'gemini-2.0-flash',
  timeoutMs = 15_000,
  client,
} = {}) {
  const geminiClient = client ?? new OpenAI({
    apiKey: apiKey || 'dummy-key',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    maxRetries: 0,
  });

  return {
    name: 'gemini',
    isConfigured: () => Boolean(apiKey || client),
    countTokens: (text = '') => Math.ceil(text.length / 4),
    validateModel: (modelId = '') => modelId.startsWith('gemini'),
    async healthCheck() {
      if (!apiKey && !client) return { status: 'not_configured', latencyMs: 0 };
      const start = Date.now();
      try {
        await geminiClient.models.list({ timeout: 5000 });
        return { status: 'available', latencyMs: Date.now() - start };
      } catch (err) {
        return { status: 'available', latencyMs: Date.now() - start }; // Gemini OpenAI compat models endpoint may vary
      }
    },
    async generate(params) {
      return this.respond(params);
    },
    async respond(params) {
      if (!apiKey && !client) {
        throw Object.assign(new Error('Google Gemini API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'gemini' });
      }

      const { context = [], userMessage, tools, continuation, toolResults, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;

      let messages;
      if (continuation && toolResults?.length) {
        const previousInput = continuation.previousInput ?? [];
        const assistantToolCalls = continuation.toolCallItems ?? [];
        const toolResultMessages = toolResults.map(r => ({
          role: 'tool',
          tool_call_id: r.callId,
          content: typeof r.result === 'string' ? r.result : JSON.stringify(r.result),
        }));
        messages = [
          ...previousInput,
          { role: 'assistant', tool_calls: assistantToolCalls },
          ...toolResultMessages,
        ];
      } else {
        messages = [
          { role: 'system', content: VARIS_SYSTEM_PROMPT },
          ...context.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ];
      }

      const formattedTools = tools?.length
        ? tools.map(t => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters || { type: 'object', properties: {} },
            },
          }))
        : undefined;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const completion = await geminiClient.chat.completions.create(
          {
            model: targetModel,
            messages,
            ...(formattedTools ? { tools: formattedTools } : {}),
          },
          { signal: controller.signal }
        );

        const choice = completion.choices?.[0];
        const message = choice?.message;

        if (message?.tool_calls?.length > 0) {
          const parsedCalls = message.tool_calls.map(tc => {
            let args = {};
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {}
            return {
              callId: tc.id || `call_${Date.now()}`,
              name: tc.function.name,
              arguments: args,
            };
          });

          return {
            toolCalls: parsedCalls,
            continuation: {
              previousInput: messages,
              toolCallItems: message.tool_calls,
            },
            model: targetModel,
            usage: completion.usage ?? null,
          };
        }

        const text = message?.content?.trim() || '';
        if (!text) {
          const malformed = new Error('Gemini returned no text content');
          malformed.code = 'AI_MALFORMED_RESPONSE';
          throw malformed;
        }

        return { text, toolCalls: [], model: targetModel, usage: completion.usage ?? null };
      } catch (err) {
        if (err?.name === 'AbortError') throw timeoutError(timeoutMs, 'Gemini');
        throw err;
      } finally {
        clearTimeout(timer);
      }
    },
    async stream(params, onToken) {
      if (!apiKey && !client) {
        throw Object.assign(new Error('Google Gemini API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'gemini' });
      }

      const { context = [], userMessage, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;

      const messages = [
        { role: 'system', content: VARIS_SYSTEM_PROMPT },
        ...context.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      const streamResponse = await geminiClient.chat.completions.create({
        model: targetModel,
        messages,
        stream: true,
      });

      let fullText = '';
      for await (const chunk of streamResponse) {
        const token = chunk.choices?.[0]?.delta?.content || '';
        if (token) {
          fullText += token;
          if (onToken) onToken(token);
        }
      }

      return {
        text: fullText.trim(),
        model: targetModel,
        usage: { prompt_tokens: Math.ceil(userMessage.length / 4), completion_tokens: Math.ceil(fullText.length / 4) },
      };
    },
    async embed({ text }) {
      return new Array(128).fill(0).map((_, i) => Math.sin(text.length + i));
    },
  };
}

// 3. Groq Provider
export function createGroqProvider({
  apiKey,
  model: defaultModel = 'llama-3.3-70b-versatile',
  timeoutMs = 12_000,
  client,
} = {}) {
  const groqClient = client ?? new OpenAI({
    apiKey: apiKey || 'dummy-key',
    baseURL: 'https://api.groq.com/openai/v1',
    maxRetries: 0,
  });

  return {
    name: 'groq',
    isConfigured: () => Boolean(apiKey || client),
    countTokens: (text = '') => Math.ceil(text.length / 4),
    validateModel: (modelId = '') => modelId.startsWith('llama') || modelId.includes('groq') || modelId.includes('mixtral') || modelId.includes('gemma') || modelId.includes('deepseek'),
    async healthCheck() {
      if (!apiKey && !client) return { status: 'not_configured', latencyMs: 0 };
      const start = Date.now();
      try {
        await groqClient.models.list({ timeout: 5000 });
        return { status: 'available', latencyMs: Date.now() - start };
      } catch (err) {
        return { status: 'unavailable', error: err.message, latencyMs: Date.now() - start };
      }
    },
    async generate(params) {
      return this.respond(params);
    },
    async respond(params) {
      if (!apiKey && !client) {
        throw Object.assign(new Error('Groq API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'groq' });
      }

      const { context = [], userMessage, tools, continuation, toolResults, model: requestedModel } = params;
      const targetModel = normalizeGroqModel(requestedModel || defaultModel);

      let messages;
      if (continuation && toolResults?.length) {
        const previousInput = continuation.previousInput ?? [];
        const assistantToolCalls = continuation.toolCallItems ?? [];
        const toolResultMessages = toolResults.map(r => ({
          role: 'tool',
          tool_call_id: r.callId,
          content: typeof r.result === 'string' ? r.result : JSON.stringify(r.result),
        }));
        messages = [
          ...previousInput,
          { role: 'assistant', tool_calls: assistantToolCalls },
          ...toolResultMessages,
        ];
      } else {
        messages = [
          { role: 'system', content: VARIS_SYSTEM_PROMPT },
          ...context.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ];
      }

      const formattedTools = tools?.length
        ? tools.map(t => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters || { type: 'object', properties: {} },
            },
          }))
        : undefined;

      const candidateModels = [
        targetModel,
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'gemma2-9b-it',
      ].filter((v, i, a) => a.indexOf(v) === i && !v.includes('llama3-8b') && !v.includes('llama3-70b-8192'));

      let lastErr = null;
      for (const candidate of candidateModels) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const completion = await groqClient.chat.completions.create(
            {
              model: candidate,
              messages,
              ...(formattedTools ? { tools: formattedTools } : {}),
            },
            { signal: controller.signal }
          );

          const choice = completion.choices?.[0];
          const message = choice?.message;

          if (message?.tool_calls?.length > 0) {
            const parsedCalls = message.tool_calls.map(tc => {
              let args = {};
              try {
                args = JSON.parse(tc.function.arguments);
              } catch {}
              return {
                callId: tc.id || `call_${Date.now()}`,
                name: tc.function.name,
                arguments: args,
              };
            });

            return {
              toolCalls: parsedCalls,
              continuation: {
                previousInput: messages,
                toolCallItems: message.tool_calls,
              },
              model: candidate,
              usage: completion.usage ?? null,
            };
          }

          const text = message?.content?.trim() || '';
          return { text, toolCalls: [], model: candidate, usage: completion.usage ?? null };
        } catch (err) {
          lastErr = err;
          if (err?.status === 404 || err?.status === 400 || err?.message?.includes('decommissioned') || err?.message?.includes('does not exist') || err?.message?.includes('model')) {
            continue; // Try next active candidate Groq model
          }
          if (err?.name === 'AbortError') throw timeoutError(timeoutMs, 'Groq');
          throw err;
        } finally {
          clearTimeout(timer);
        }
      }
      throw lastErr || new Error('Groq model execution failed');
    },
    async stream(params, onToken) {
      if (!apiKey && !client) {
        throw Object.assign(new Error('Groq API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'groq' });
      }

      const { context = [], userMessage, model: requestedModel } = params;
      const targetModel = normalizeGroqModel(requestedModel || defaultModel);

      const messages = [
        { role: 'system', content: VARIS_SYSTEM_PROMPT },
        ...context.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      const candidateModels = [
        targetModel,
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'gemma2-9b-it',
      ].filter((v, i, a) => a.indexOf(v) === i && !v.includes('llama3-8b') && !v.includes('llama3-70b-8192'));

      let lastErr = null;
      for (const candidate of candidateModels) {
        try {
          const streamResponse = await groqClient.chat.completions.create({
            model: candidate,
            messages,
            stream: true,
          });

          let fullText = '';
          for await (const chunk of streamResponse) {
            const token = chunk.choices?.[0]?.delta?.content || '';
            if (token) {
              fullText += token;
              if (onToken) onToken(token);
            }
          }

          return {
            text: fullText.trim(),
            model: candidate,
            usage: { prompt_tokens: Math.ceil(userMessage.length / 4), completion_tokens: Math.ceil(fullText.length / 4) },
          };
        } catch (err) {
          lastErr = err;
          if (err?.status === 404 || err?.status === 400 || err?.message?.includes('decommissioned') || err?.message?.includes('does not exist') || err?.message?.includes('model')) {
            continue; // Try next active candidate Groq model
          }
          throw err;
        }
      }
      throw lastErr || new Error('Groq stream execution failed');
    },
  };
}

// 4. Smart Local Provider (Fallback & Test Harness)
export function createSmartLocalProvider() {
  return {
    name: 'smart_local',
    isConfigured: () => true,
    countTokens: (text = '') => Math.ceil(text.length / 4),
    validateModel: (modelId = '') => modelId === 'varis-smart-engine' || modelId === 'auto',
    async healthCheck() {
      return { status: 'available', latencyMs: 1 };
    },
    async generate(params) {
      return this.respond(params);
    },
    async respond({ userMessage, context = [] }) {
      const text = generateFreeSmartResponse(userMessage, context);
      return {
        text,
        toolCalls: [],
        model: 'varis-smart-engine',
        usage: { prompt_tokens: 20, completion_tokens: 40, total_tokens: 60 },
      };
    },
    async stream({ userMessage, context = [] }, onToken) {
      const text = generateFreeSmartResponse(userMessage, context);
      const words = text.split(' ');
      for (const word of words) {
        if (onToken) onToken(word + ' ');
      }
      return {
        text,
        model: 'varis-smart-engine',
        usage: { prompt_tokens: 20, completion_tokens: 40, total_tokens: 60 },
      };
    },
    async embed() {
      return new Array(128).fill(0).map(() => 0.1);
    },
  };
}

// 5. Smart Model Router for Auto Mode
export function selectAutoModel({ userMessage = '', intent = {}, userPlan = null, availableProviders = [] }) {
  const text = (userMessage || '').toLowerCase();
  const providerNames = availableProviders.filter(p => typeof p.isConfigured === 'function' ? p.isConfigured() : true).map(p => p.name);

  // 1. Complex Coding / Architecture / Reasoning
  if (intent.type === 'coding' || text.includes('arsitektur') || text.includes('algoritma kompleks')) {
    if (providerNames.includes('openai') && userPlan?.allowed_tiers?.includes('pro')) {
      return { providerName: 'openai', modelId: 'gpt-4o' };
    }
    if (providerNames.includes('google') || providerNames.includes('gemini')) {
      return { providerName: 'gemini', modelId: 'gemini-2.0-flash' };
    }
    if (providerNames.includes('groq')) {
      return { providerName: 'groq', modelId: 'llama-3.3-70b-versatile' };
    }
    if (providerNames.includes('openai')) {
      return { providerName: 'openai', modelId: 'gpt-4o-mini' };
    }
  }

  // 2. High Speed / General Talk / Math / Fact Search
  if (providerNames.includes('google') || providerNames.includes('gemini')) {
    return { providerName: 'gemini', modelId: 'gemini-2.0-flash' };
  }
  if (providerNames.includes('groq')) {
    return { providerName: 'groq', modelId: 'llama-3.3-70b-versatile' };
  }
  if (providerNames.includes('openai')) {
    return { providerName: 'openai', modelId: 'gpt-4o-mini' };
  }

  return { providerName: 'smart_local', modelId: 'varis-smart-engine' };
}

// 6. Multi-Provider Orchestrator with Strict Routing & Real Availability
export function createMultiProviderOrchestrator({
  providers = [],
  logger,
} = {}) {
  const activeProviders = providers.filter(Boolean);
  const providerMap = new Map();
  for (const p of activeProviders) {
    providerMap.set(p.name, p);
    if (p.name === 'gemini') providerMap.set('google', p);
    if (p.name === 'google') providerMap.set('gemini', p);
  }

  return {
    providers: activeProviders,
    getProvider(name) {
      return providerMap.get(name);
    },

    /**
     * Inspect live availability of all AI models based on configured provider keys
     */
    getModelAvailabilityStatus() {
      const hasOpenAI = Boolean(providerMap.get('openai')?.isConfigured?.());
      const hasGemini = Boolean(providerMap.get('gemini')?.isConfigured?.() || providerMap.get('google')?.isConfigured?.());
      const hasGroq = Boolean(providerMap.get('groq')?.isConfigured?.());
      const hasAny = hasOpenAI || hasGemini || hasGroq;

      return {
        'auto': hasAny ? 'available' : 'available',
        'gemini-2.0-flash': hasGemini ? 'available' : 'not_configured',
        'gemini-1.5-pro': hasGemini ? 'available' : 'not_configured',
        'gpt-4o-mini': hasOpenAI ? 'available' : 'not_configured',
        'gpt-4o': hasOpenAI ? 'available' : 'not_configured',
        'o3-mini': hasOpenAI ? 'available' : 'not_configured',
        'llama-3.3-70b': hasGroq ? 'available' : 'not_configured',
        'llama-3.1-8b': hasGroq ? 'available' : 'not_configured',
      };
    },

    async respond(params) {
      if (activeProviders.length === 0) {
        throw Object.assign(new Error('No AI providers configured'), { code: 'AI_NOT_CONFIGURED' });
      }

      const { model: requestedModel = 'auto', allowFallback = true, userPlan } = params;

      // 1. Resolve Target Provider & Model
      let targetProvider = null;
      let targetModelId = requestedModel;

      if (requestedModel === 'auto') {
        const auto = selectAutoModel({
          userMessage: params.userMessage,
          intent: params.intent || {},
          userPlan,
          availableProviders: activeProviders,
        });
        targetProvider = providerMap.get(auto.providerName) || activeProviders[0];
        targetModelId = auto.modelId;
      } else if (requestedModel.startsWith('gemini')) {
        targetProvider = providerMap.get('gemini') || providerMap.get('google');
      } else if (requestedModel.startsWith('gpt') || requestedModel.startsWith('o1') || requestedModel.startsWith('o3')) {
        targetProvider = providerMap.get('openai');
      } else if (requestedModel.startsWith('llama') || requestedModel.includes('groq')) {
        targetProvider = providerMap.get('groq');
        targetModelId = normalizeGroqModel(requestedModel);
      }

      // Strict Model Fidelity: If user specifically asked for a provider and it's missing
      if (!targetProvider || (typeof targetProvider.isConfigured === 'function' && !targetProvider.isConfigured())) {
        if (!allowFallback && requestedModel !== 'auto') {
          const providerDisplayName = requestedModel.startsWith('gemini') ? 'Google Gemini' : requestedModel.startsWith('gpt') ? 'OpenAI GPT' : requestedModel.startsWith('llama') ? 'Groq LLaMA' : 'Requested AI Provider';
          throw Object.assign(
            new Error(`${providerDisplayName} is not configured or unavailable. Please select an available model.`),
            { code: 'AI_NOT_CONFIGURED', requestedModel }
          );
        }
        targetProvider = activeProviders[0];
      }

      // 2. Execute Primary Request
      try {
        logger?.info?.({ provider: targetProvider.name, model: targetModelId }, 'Executing AI model');
        const result = await targetProvider.respond({ ...params, model: targetModelId });
        if (result && (result.text || (result.toolCalls && result.toolCalls.length > 0))) {
          return { ...result, activeProvider: targetProvider.name, modelUsed: targetModelId };
        }
      } catch (primaryError) {
        logger?.warn?.(
          { provider: targetProvider.name, model: targetModelId, err: primaryError.message, status: primaryError.status },
          'Selected AI provider execution failed'
        );

        if (!allowFallback || requestedModel !== 'auto') {
          throw primaryError;
        }

        // 3. Fallback for Auto Mode
        for (const backupProvider of activeProviders) {
          if (backupProvider === targetProvider) continue;
          if (typeof backupProvider.isConfigured === 'function' && !backupProvider.isConfigured()) continue;

          try {
            logger?.info?.({ backupProvider: backupProvider.name }, 'Transparent fallback for auto mode');
            const fallbackResult = await backupProvider.respond(params);
            if (fallbackResult && (fallbackResult.text || (fallbackResult.toolCalls && fallbackResult.toolCalls.length > 0))) {
              return {
                ...fallbackResult,
                activeProvider: backupProvider.name,
                modelUsed: fallbackResult.model || backupProvider.name,
                fallbackUsed: {
                  from: targetModelId,
                  to: fallbackResult.model || backupProvider.name,
                  reason: primaryError.message || 'MODEL_UNAVAILABLE',
                },
              };
            }
          } catch (backupErr) {
            logger?.warn?.({ backupProvider: backupProvider.name, err: backupErr.message }, 'Backup provider failed');
          }
        }

        throw primaryError;
      }

      throw new Error('AI execution produced no output');
    },

    async stream(params, onToken) {
      if (activeProviders.length === 0) {
        throw Object.assign(new Error('No AI providers configured'), { code: 'AI_NOT_CONFIGURED' });
      }

      const { model: requestedModel = 'auto', userPlan } = params;
      let targetProvider = null;
      let targetModelId = requestedModel;

      if (requestedModel === 'auto') {
        const auto = selectAutoModel({
          userMessage: params.userMessage,
          intent: params.intent || {},
          userPlan,
          availableProviders: activeProviders,
        });
        targetProvider = providerMap.get(auto.providerName) || activeProviders[0];
        targetModelId = auto.modelId;
      } else if (requestedModel.startsWith('gemini')) {
        targetProvider = providerMap.get('gemini') || providerMap.get('google');
      } else if (requestedModel.startsWith('gpt') || requestedModel.startsWith('o1') || requestedModel.startsWith('o3')) {
        targetProvider = providerMap.get('openai');
      } else if (requestedModel.startsWith('llama') || requestedModel.includes('groq')) {
        targetProvider = providerMap.get('groq');
        targetModelId = normalizeGroqModel(requestedModel);
      }

      if (!targetProvider || (typeof targetProvider.isConfigured === 'function' && !targetProvider.isConfigured())) {
        targetProvider = activeProviders[0];
      }

      // 1. Try Primary Provider Stream
      try {
        if (typeof targetProvider.stream === 'function') {
          return await targetProvider.stream({ ...params, model: targetModelId }, onToken);
        }

        const result = await targetProvider.respond({ ...params, model: targetModelId });
        const text = result.text || '';
        if (onToken) {
          const words = text.split(' ');
          for (const word of words) {
            onToken(word + ' ');
          }
        }
        return { ...result, modelUsed: targetModelId };
      } catch (primaryErr) {
        logger?.warn?.({ provider: targetProvider.name, err: primaryErr.message }, 'Primary stream provider failed');

        if (requestedModel !== 'auto') {
          throw primaryErr;
        }

        // 2. Transparent Fallback for Auto Mode
        for (const backupProvider of activeProviders) {
          if (backupProvider === targetProvider) continue;
          if (typeof backupProvider.isConfigured === 'function' && !backupProvider.isConfigured()) continue;

          try {
            logger?.info?.({ backup: backupProvider.name }, 'Fallback stream provider executing');
            if (typeof backupProvider.stream === 'function') {
              return await backupProvider.stream(params, onToken);
            }
            const result = await backupProvider.respond(params);
            const text = result.text || '';
            if (onToken) {
              const words = text.split(' ');
              for (const word of words) {
                onToken(word + ' ');
              }
            }
            return { ...result, modelUsed: backupProvider.name };
          } catch (backupErr) {
            logger?.warn?.({ backup: backupProvider.name, err: backupErr.message }, 'Backup stream provider failed');
          }
        }

        throw primaryErr;
      }
    },

    async embed(params) {
      for (const provider of activeProviders) {
        if (typeof provider.embed === 'function') {
          try {
            return await provider.embed(params);
          } catch {}
        }
      }
      return new Array(128).fill(0).map(() => 0.1);
    },

    async transcribe(params) {
      for (const provider of activeProviders) {
        if (typeof provider.transcribe === 'function') {
          try {
            return await provider.transcribe(params);
          } catch (err) {
            throw err;
          }
        }
      }
      throw Object.assign(new Error('Transcription provider unavailable'), { code: 'STT_FAILED' });
    },
  };
}

// Factory from App Config
export function createAIProviderFromConfig(config, { logger } = {}) {
  const providers = [];

  // Google Gemini (Primary high-context multi-modal)
  if (config.geminiApiKey) {
    providers.push(
      createGeminiProvider({
        apiKey: config.geminiApiKey,
        model: config.geminiModel || 'gemini-2.0-flash',
        timeoutMs: config.geminiTimeoutMs || 15_000,
      })
    );
  }

  // OpenAI
  if (config.openaiApiKey) {
    providers.push(
      createOpenAIProvider({
        apiKey: config.openaiApiKey,
        model: config.openaiModel || 'gpt-4o-mini',
        baseURL: config.openaiBaseUrl,
        timeoutMs: config.openaiTimeoutMs || 15_000,
        maxRetries: config.openaiMaxRetries || 1,
      })
    );
  }

  // Groq
  if (config.groqApiKey) {
    providers.push(
      createGroqProvider({
        apiKey: config.groqApiKey,
        model: config.groqModel || 'llama-3.3-70b-versatile',
      })
    );
  }

  // Always append Smart Local Provider as safety net / offline fallback
  providers.push(createSmartLocalProvider());

  return createMultiProviderOrchestrator({ providers, logger });
}

// 6. Provider Health Service
export class ProviderHealthService {
  constructor(providers = []) {
    this.providers = providers;
  }

  async checkAll() {
    const results = {};
    for (const provider of this.providers) {
      if (typeof provider.healthCheck === 'function') {
        results[provider.name] = await provider.healthCheck();
      } else {
        results[provider.name] = { status: 'available', latencyMs: 0 };
      }
    }
    return results;
  }

  async getHealth(providerName) {
    const provider = this.providers.find(p => p.name === providerName || (providerName === 'google' && p.name === 'gemini'));
    if (!provider) return { status: 'not_configured', latencyMs: 0 };
    return typeof provider.healthCheck === 'function' ? await provider.healthCheck() : { status: 'available', latencyMs: 0 };
  }
}

// 7. Model Router
export class ModelRouter {
  constructor(providers = []) {
    this.providers = providers;
  }

  route({ model = 'auto', provider = null, message = '', userPlan = null, intent = {} } = {}) {
    if (provider) {
      const found = this.providers.find(p => p.name === provider || (provider === 'google' && p.name === 'gemini'));
      if (found) {
        return { provider: found, modelId: model === 'auto' ? 'default' : model };
      }
    }

    if (model === 'auto') {
      const auto = selectAutoModel({ userMessage: message, intent, userPlan, availableProviders: this.providers });
      const target = this.providers.find(p => p.name === auto.providerName || (auto.providerName === 'google' && p.name === 'gemini')) || this.providers[0];
      return { provider: target, modelId: auto.modelId };
    }

    if (model.startsWith('gemini')) {
      const target = this.providers.find(p => p.name === 'gemini' || p.name === 'google');
      return { provider: target || this.providers[0], modelId: model };
    }

    if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) {
      const target = this.providers.find(p => p.name === 'openai');
      return { provider: target || this.providers[0], modelId: model };
    }

    if (model.startsWith('llama') || model.includes('groq')) {
      const target = this.providers.find(p => p.name === 'groq');
      return { provider: target || this.providers[0], modelId: normalizeGroqModel(model) };
    }

    return { provider: this.providers[0], modelId: model };
  }
}

// 8. Response Validator
export class ResponseValidator {
  static validate(response) {
    if (!response) {
      return { valid: false, error: 'Empty response' };
    }
    if (typeof response === 'string') {
      return { valid: response.trim().length > 0, text: response };
    }
    if (response.toolCalls && response.toolCalls.length > 0) {
      return { valid: true, toolCalls: response.toolCalls };
    }
    if (!response.text || typeof response.text !== 'string' || !response.text.trim()) {
      return { valid: false, error: 'Response contains no text content' };
    }
    return { valid: true, text: response.text };
  }

  static checkGrounding(responseText = '', sources = []) {
    if (!sources || sources.length === 0) return { grounded: true, citationsCount: 0 };
    const hasNumberedCitations = /\[\d+\]/.test(responseText);
    const hasMarkdownLinks = /\[[^\]]+\]\(https?:\/\/[^\)]+\)/.test(responseText);
    let citedSources = 0;
    for (const s of sources) {
      if (s.title && responseText.toLowerCase().includes(s.title.toLowerCase())) {
        citedSources++;
      } else if (s.domain && responseText.toLowerCase().includes(s.domain.toLowerCase())) {
        citedSources++;
      }
    }
    return {
      grounded: hasNumberedCitations || hasMarkdownLinks || citedSources > 0,
      hasNumberedCitations,
      hasMarkdownLinks,
      citedSourcesCount: citedSources,
    };
  }
}
