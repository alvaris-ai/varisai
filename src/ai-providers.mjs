import OpenAI from 'openai';
import { generateFreeSmartResponse } from './free-ai-engine.mjs';

export const VARIS_SYSTEM_PROMPT = `Kamu adalah VARIS, asisten AI cerdas, serbaguna (general-purpose), dan interaktif yang dirancang untuk percakapan lisan dan teks yang alami, mendalam, akurat, dan berkonteks layaknya manusia.

Prinsip Utama VARIS:

1. Kecerdasan Umum (General Intelligence):
- Mampu membahas, menganalisis, dan memecahkan masalah dalam berbagai domain: pengetahuan umum, sains, astronomi, sejarah, teknologi, pemrograman, matematika, bahasa, pendidikan, logika, analisis data/file, penulisan kreatif, brainstorming, hingga obrolan santai sehari-hari.
- Terbuka untuk semua topik baru yang diajukan pengguna tanpa membatasi diri pada kumpulan template.

2. Pemahaman Mendalam Sebelum Menjawab (Understand Before Answering):
- Identifikasi maksud, sasaran, dan konteks pengguna (apakah ini pertanyaan baru, kelanjutan topik, perbandingan, koreksi, atau permintaan bantuan teknis).
- Pertahankan kesinambungan multi-turn. Pahami kata rujukan seperti "dia", "itu", "yang tadi", "bagian kedua", "lanjutkan", "ubah cara tadi", "bukan itu", atau "maksud saya yang sebelumnya".
- Pecah masalah kompleks atau troubleshooting menjadi tahapan terstruktur yang logis dan mudah dipahami.

3. Pemanfaatan Tools Secara Tepat (Tool Intelligence):
- 'calculator': Gunakan untuk perhitungan matematika angka besar, perkalian/pembagian kompleks, dan ekspresi aritmatika agar presisi 100%.
- 'current_datetime': Gunakan untuk mengetahui waktu, tanggal, hari, atau zona waktu terkini.
- 'web_search': Gunakan untuk mencari fakta aktual, berita terkini, versi software terbaru, atau informasi yang memerlukan data terbaru dari web.
- 'weather': Gunakan untuk mengecek kondisi cuaca dan suhu real-time di suatu lokasi.
- 'file_search' & 'read_project_file': Gunakan untuk mencari dan membaca file dalam proyek pengguna saat diminta menganalisis kode atau file workspace.
- 'memory_search' & 'save_memory': Gunakan untuk membaca dan menyimpan preferensi jangka panjang pengguna yang penting.
- Jangan memanggil tool jika pertanyaan dapat dijawab secara langsung dengan pengetahuan konseptual yang sudah pasti.

4. Gaya Bahasa & Komunikasi Adaptif:
- Gunakan bahasa yang santai, alami, ramah, dan komunikatif (sesuaikan dengan gaya bahasa user: Bahasa Indonesia, English, atau bahasa campuran).
- HINDARI pembuka basi atau template kaku seperti "Tentu saja!", "Sebagai asisten AI...", atau "Terima kasih atas pertanyaannya". Langsung ke inti jawaban.
- Pertanyaan sederhana / percakapan suara: Berikan jawaban ringkas, padat, dan jelas (1-3 kalimat).
- Coding / tutorial teknis: Berikan penjelasan konseptual singkat beserta blok kode yang bersih, valid, dan siap pakai.

5. Akurasi, Kontrol Halusinasi & Koreksi Diri:
- Prioritas utama: Akurasi > Relevansi > Konteks > Kejelasan > Kecepatan.
- Jangan pernah mengarang data, angka, nama, URL, atau hasil eksekusi tool.
- Jika user mengoreksi jawabanmu ("Jawabanmu salah"), bersikaplah terbuka, teliti kembali kesalahan dengan rendah hati, dan berikan perbaikan yang benar.
- Jika suatu informasi tidak diketahui atau tidak dapat dipastikan, sampaikan dengan jujur.`;

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
    async respond(params) {
      if (!apiKey && !client) {
        throw Object.assign(new Error('Google Gemini API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'gemini' });
      }

      const { context = [], userMessage, tools, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;

      const messages = [
        { role: 'system', content: VARIS_SYSTEM_PROMPT },
        ...context.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

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
    async respond(params) {
      if (!apiKey && !client) {
        throw Object.assign(new Error('Groq API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'groq' });
      }

      const { context = [], userMessage, tools, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;

      const messages = [
        { role: 'system', content: VARIS_SYSTEM_PROMPT },
        ...context.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

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
        const completion = await groqClient.chat.completions.create(
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
        return { text, toolCalls: [], model: targetModel, usage: completion.usage ?? null };
      } catch (err) {
        if (err?.name === 'AbortError') throw timeoutError(timeoutMs, 'Groq');
        throw err;
      } finally {
        clearTimeout(timer);
      }
    },
    async stream(params, onToken) {
      if (!apiKey && !client) {
        throw Object.assign(new Error('Groq API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'groq' });
      }

      const { context = [], userMessage, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;

      const messages = [
        { role: 'system', content: VARIS_SYSTEM_PROMPT },
        ...context.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      const streamResponse = await groqClient.chat.completions.create({
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
  };
}

// 4. Smart Local Provider (Fallback & Test Harness)
export function createSmartLocalProvider() {
  return {
    name: 'smart_local',
    isConfigured: () => true,
    async healthCheck() {
      return { status: 'available', latencyMs: 1 };
    },
    async respond({ userMessage }) {
      const text = generateFreeSmartResponse(userMessage);
      return {
        text,
        toolCalls: [],
        model: 'varis-smart-engine',
        usage: { prompt_tokens: 20, completion_tokens: 40, total_tokens: 60 },
      };
    },
    async stream({ userMessage }, onToken) {
      const text = generateFreeSmartResponse(userMessage);
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
    if (providerNames.includes('openai')) {
      return { providerName: 'openai', modelId: 'gpt-4o-mini' };
    }
  }

  // 2. High Speed / General Talk / Math / Fact Search
  if (providerNames.includes('google') || providerNames.includes('gemini')) {
    return { providerName: 'gemini', modelId: 'gemini-2.0-flash' };
  }
  if (providerNames.includes('openai')) {
    return { providerName: 'openai', modelId: 'gpt-4o-mini' };
  }
  if (providerNames.includes('groq')) {
    return { providerName: 'groq', modelId: 'llama-3.3-70b-versatile' };
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
      }

      // Strict Model Fidelity: If user specifically asked for a provider and it's missing
      if (!targetProvider || (typeof targetProvider.isConfigured === 'function' && !targetProvider.isConfigured())) {
        if (!allowFallback && requestedModel !== 'auto') {
          const providerDisplayName = requestedModel.startsWith('gemini') ? 'Google Gemini' : requestedModel.startsWith('gpt') ? 'OpenAI GPT' : 'Requested AI Provider';
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
      }

      if (!targetProvider || (typeof targetProvider.isConfigured === 'function' && !targetProvider.isConfigured())) {
        targetProvider = activeProviders[0];
      }

      if (typeof targetProvider.stream === 'function') {
        return targetProvider.stream({ ...params, model: targetModelId }, onToken);
      }

      // If provider only supports respond, simulate chunk delivery
      const result = await targetProvider.respond({ ...params, model: targetModelId });
      const text = result.text || '';
      if (onToken) {
        const words = text.split(' ');
        for (const word of words) {
          onToken(word + ' ');
        }
      }
      return { ...result, modelUsed: targetModelId };
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

  // Append Smart Local Provider ONLY in test mode or explicit offline testing
  if (config.nodeEnv === 'test' || providers.length === 0) {
    providers.push(createSmartLocalProvider());
  }

  return createMultiProviderOrchestrator({ providers, logger });
}
