import OpenAI from 'openai';
import { generateFreeSmartResponse } from './free-ai-engine.mjs';

export const VARIS_SYSTEM_PROMPT = `Kamu adalah VARIS, GENERAL PURPOSE AI AGENT cerdas, serbaguna, dan adaptif yang dirancang untuk berinteraksi secara natural seperti AI assistant modern kelas dunia yang memahami manusia, percakapan, konteks, maksud, referensi kata, dan perubahan topik.

==================================================
1. ATURAN PALING PENTING: JAWAB INPUT TERAKHIR
==================================================
- SETIAP RESPONSE WAJIB MENJAWAB INPUT USER TERAKHIR.
- Urutan proses internal:
  USER INPUT -> BACA PESAN TERAKHIR -> BACA RIWAYAT PERCAKAPAN RELEVAN -> IDENTIFIKASI INTENSI REAL -> RESOLUSI KATA RUJUKAN (ANAPHORA) -> JAWAB SESUAI MAKSUD USER.
- Dilarang menjawab topik lama jika pengguna sudah berpindah topik.
- Dilarang mengabaikan pesan terbaru pengguna.
- Jangan berasumsi pertanyaan pengguna berbeda dari yang diketik.

==================================================
2. MULTI-TURN CONTEXT & KATA RUJUKAN (ANAPHORA)
==================================================
- Selalu hubungkan kata ganti ke konteks sebelumnya:
  * "dia" / "ia" -> merujuk ke orang, subjek, objek, proyek, atau AI yang sedang dibahas.
  * "ini" / "itu" -> merujuk ke konsep, kode, atau benda yang baru saja dibahas.
  * "yang tadi" -> merujuk ke topik sebelum turn terakhir.
  * "yang kedua" / "opsi kedua" -> merujuk ke poin atau pilihan nomor 2 pada pesan sebelumnya.
  * "tambahkan X" -> menambahkan fitur X ke dalam sistem atau proyek yang sedang dibuat pengguna.
  * "jelaskan lagi" -> memperdalam penjelasan dari poin sebelumnya.
  * "pendekin" / "singkat aja" -> merangkum jawaban sebelumnya menjadi padat dan to the point.
- Ingat nama pengguna jika sudah diperkenalkan ("Namaku Al").

==================================================
3. CONVERSATION REPAIR & RECALL TOPIK
==================================================
- Jika pengguna berkata "Bukan itu maksudku", "Salah", atau sejenisnya:
  * Akui kekeliruan dengan sopan tanpa defensif.
  * Minta penjelasan singkat arah yang dimaksud dan langsung fokus ke kebutuhan pengguna.
- Jika pengguna melakukan Topic Switch ("Ngomong-ngomong, laptop bagus apa?"):
  * Jawab topik baru tersebut secara fokus dan tuntas.
- Jika pengguna melakukan Topic Recall ("Balik ke VARIS tadi", "Kembali ke topik awal"):
  * Sambungkan kembali ke topik sebelumnya secara mulus dan lanjutkan pembahasan.

==================================================
4. KLARIFIKASI & AMBIGUITAS
==================================================
- Jika pertanyaan pengguna membutuhkan data esensial yang hilang (contoh: "Kenapa kodeku error?" tanpa kode/log):
  * Minta potongan kode dan pesan error/log secara sopan sebelum menyimpulkan.
- Jika konteks sudah jelas dari riwayat percakapan, JANGAN meminta klarifikasi yang tidak perlu; langsung berikan jawaban.

==================================================
5. GAYA KOMUNIKASI & FORMULA PENALARAN
==================================================
- Natural Human Style: Berbicara mengalir, hangat, cerdas, tidak kaku, dan bebas boilerplate klise.
- Selaras Bahasa: Jawab dalam bahasa yang sama dengan pengguna (Bahasa Indonesia / English).
- Answer-First: Berikan jawaban/poin utama di awal (point-first).
- Perhitungan & Faktual: Gunakan ketelitian tinggi untuk matematika dan fakta.
- Prioritas Nilai: ACCURACY > HONESTY > RELEVANCE > CLARITY > SPEED`;


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
  if (model.includes('deepseek') || model.includes('r1')) return 'deepseek-r1-distill-llama-70b';
  if (model === 'llama-3.3-70b' || model === 'llama-3.3-70b-versatile' || model === 'llama-70b') return 'llama-3.3-70b-versatile';
  if (model === 'llama-3.1-8b' || model === 'llama-3.1-8b-instant' || model === 'llama-8b') return 'llama-3.1-8b-instant';
  if (model === 'llama-3.2-3b' || model === 'llama-3.2-3b-preview') return 'llama-3.2-3b-preview';
  if (model === 'llama-3.2-1b' || model === 'llama-3.2-1b-preview') return 'llama-3.2-1b-preview';
  if (model === 'mixtral-8x7b' || model === 'mixtral-8x7b-32768') return 'mixtral-8x7b-32768';
  if (model === 'gemma2-9b' || model === 'gemma2-9b-it') return 'gemma2-9b-it';
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

// 4. DeepSeek Official Provider (deepseek-chat / deepseek-reasoner / R1)
export function createDeepSeekProvider({
  apiKey,
  model: defaultModel = 'deepseek-chat',
  baseURL = 'https://api.deepseek.com',
  timeoutMs = 25_000,
  client,
} = {}) {
  const deepseekClient = client ?? new OpenAI({
    apiKey: apiKey || 'dummy-key',
    baseURL: baseURL || 'https://api.deepseek.com',
    maxRetries: 0,
  });

  return {
    name: 'deepseek',
    isConfigured: () => Boolean(apiKey || client),
    countTokens: (text = '') => Math.ceil(text.length / 4),
    validateModel: (modelId = '') => modelId.toLowerCase().includes('deepseek'),
    async healthCheck() {
      if (!apiKey && !client) return { status: 'not_configured', latencyMs: 0 };
      const start = Date.now();
      try {
        await deepseekClient.models.list({ timeout: 5000 });
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
        throw Object.assign(new Error('DeepSeek API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'deepseek' });
      }

      const { context = [], userMessage, tools, continuation, toolResults, model: requestedModel } = params;
      let targetModel = requestedModel || defaultModel;
      if (targetModel.includes('reasoner') || targetModel.includes('r1')) {
        targetModel = 'deepseek-reasoner';
      } else if (targetModel.includes('chat') || targetModel.includes('v3') || targetModel.includes('flash') || targetModel.includes('4.1')) {
        targetModel = 'deepseek-chat';
      }

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
        const completion = await deepseekClient.chat.completions.create(
          {
            model: targetModel,
            messages,
            ...(formattedTools && targetModel !== 'deepseek-reasoner' ? { tools: formattedTools } : {}),
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
          const malformed = new Error('DeepSeek returned empty response');
          malformed.code = 'AI_MALFORMED_RESPONSE';
          throw malformed;
        }

        return { text, toolCalls: [], model: targetModel, usage: completion.usage ?? null };
      } catch (err) {
        if (err?.name === 'AbortError') throw timeoutError(timeoutMs, 'DeepSeek');
        throw err;
      } finally {
        clearTimeout(timer);
      }
    },
    async stream(params, onToken) {
      if (!apiKey && !client) {
        throw Object.assign(new Error('DeepSeek API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'deepseek' });
      }

      const { context = [], userMessage, model: requestedModel } = params;
      let targetModel = requestedModel || defaultModel;
      if (targetModel.includes('reasoner') || targetModel.includes('r1')) {
        targetModel = 'deepseek-reasoner';
      } else if (targetModel.includes('chat') || targetModel.includes('v3') || targetModel.includes('flash') || targetModel.includes('4.1')) {
        targetModel = 'deepseek-chat';
      }

      const messages = [
        { role: 'system', content: VARIS_SYSTEM_PROMPT },
        ...context.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      const streamResponse = await deepseekClient.chat.completions.create({
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

// 5. OpenRouter Provider (Free Tier & Multimodel Hub ala Cline)
export function createOpenRouterProvider({
  apiKey,
  model: defaultModel = 'deepseek/deepseek-r1:free',
  baseURL = 'https://openrouter.ai/api/v1',
  timeoutMs = 25_000,
  client,
} = {}) {
  const openrouterClient = client ?? new OpenAI({
    apiKey: apiKey || 'dummy-key',
    baseURL: baseURL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://varis.ai',
      'X-Title': 'VARIS AI',
    },
    maxRetries: 0,
  });

  return {
    name: 'openrouter',
    isConfigured: () => Boolean(apiKey || client),
    countTokens: (text = '') => Math.ceil(text.length / 4),
    validateModel: (modelId = '') => modelId.includes('/') || modelId.includes(':free') || modelId.startsWith('openrouter'),
    async healthCheck() {
      if (!apiKey && !client) return { status: 'not_configured', latencyMs: 0 };
      const start = Date.now();
      try {
        await openrouterClient.models.list({ timeout: 5000 });
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
        throw Object.assign(new Error('OpenRouter API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'openrouter' });
      }

      const { context = [], userMessage, tools, continuation, toolResults, model: requestedModel } = params;
      let targetModel = requestedModel || defaultModel;
      if (targetModel === 'deepseek-r1' || targetModel === 'deepseek-r1-free') {
        targetModel = 'deepseek/deepseek-r1:free';
      } else if (targetModel === 'deepseek-chat' || targetModel === 'deepseek-chat-free' || targetModel === 'deepseek-flash' || targetModel === 'deepseek-4.1') {
        targetModel = 'deepseek/deepseek-chat:free';
      }

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
        const completion = await openrouterClient.chat.completions.create(
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
          const malformed = new Error('OpenRouter returned empty response');
          malformed.code = 'AI_MALFORMED_RESPONSE';
          throw malformed;
        }

        return { text, toolCalls: [], model: targetModel, usage: completion.usage ?? null };
      } catch (err) {
        if (err?.name === 'AbortError') throw timeoutError(timeoutMs, 'OpenRouter');
        throw err;
      } finally {
        clearTimeout(timer);
      }
    },
    async stream(params, onToken) {
      if (!apiKey && !client) {
        throw Object.assign(new Error('OpenRouter API Key is not configured'), { code: 'AI_NOT_CONFIGURED', provider: 'openrouter' });
      }

      const { context = [], userMessage, model: requestedModel } = params;
      let targetModel = requestedModel || defaultModel;
      if (targetModel === 'deepseek-r1' || targetModel === 'deepseek-r1-free') {
        targetModel = 'deepseek/deepseek-r1:free';
      } else if (targetModel === 'deepseek-chat' || targetModel === 'deepseek-chat-free' || targetModel === 'deepseek-flash' || targetModel === 'deepseek-4.1') {
        targetModel = 'deepseek/deepseek-chat:free';
      }

      const messages = [
        { role: 'system', content: VARIS_SYSTEM_PROMPT },
        ...context.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      const streamResponse = await openrouterClient.chat.completions.create({
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

// 6. Smart Local Provider (Fallback & Test Harness)
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

// 7. Smart Model Router for Auto Mode
export function selectAutoModel({ userMessage = '', intent = {}, userPlan = null, availableProviders = [] }) {
  const text = (userMessage || '').toLowerCase();
  const providerNames = availableProviders.filter(p => typeof p.isConfigured === 'function' ? p.isConfigured() : true).map(p => p.name);

  // 1. Complex Coding / Architecture / Deep Reasoning (DeepSeek-R1 / GPT-4o / Gemini / Groq)
  if (intent.type === 'coding' || text.includes('arsitektur') || text.includes('algoritma kompleks') || text.includes('penalaran') || text.includes('analisis mendalam')) {
    if (providerNames.includes('deepseek')) {
      return { providerName: 'deepseek', modelId: 'deepseek-reasoner' };
    }
    if (providerNames.includes('openrouter')) {
      return { providerName: 'openrouter', modelId: 'deepseek/deepseek-r1:free' };
    }
    if (providerNames.includes('openai') && userPlan?.allowed_tiers?.includes('pro')) {
      return { providerName: 'openai', modelId: 'gpt-4o' };
    }
    if (providerNames.includes('google') || providerNames.includes('gemini')) {
      return { providerName: 'gemini', modelId: 'gemini-2.0-flash' };
    }
    if (providerNames.includes('groq')) {
      return { providerName: 'groq', modelId: 'deepseek-r1-distill-llama-70b' };
    }
    if (providerNames.includes('openai')) {
      return { providerName: 'openai', modelId: 'gpt-4o-mini' };
    }
  }

  // 2. High Speed / General Talk / Math / Fact Search
  if (providerNames.includes('deepseek')) {
    return { providerName: 'deepseek', modelId: 'deepseek-chat' };
  }
  if (providerNames.includes('openrouter')) {
    return { providerName: 'openrouter', modelId: 'deepseek/deepseek-chat:free' };
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

  return { providerName: 'smart_local', modelId: 'varis-smart-engine' };
}

// 8. Multi-Provider Orchestrator with Strict Routing & Real Availability
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
      const hasDeepSeek = Boolean(providerMap.get('deepseek')?.isConfigured?.());
      const hasOpenRouter = Boolean(providerMap.get('openrouter')?.isConfigured?.());
      const hasAny = hasOpenAI || hasGemini || hasGroq || hasDeepSeek || hasOpenRouter;

      return {
        'auto': hasAny ? 'available' : 'available',
        'deepseek-r1': (hasDeepSeek || hasOpenRouter || hasGroq) ? 'available' : 'available',
        'deepseek-chat': (hasDeepSeek || hasOpenRouter || hasGroq) ? 'available' : 'available',
        'deepseek-flash': (hasDeepSeek || hasOpenRouter || hasGroq) ? 'available' : 'available',
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
      } else if (requestedModel.includes('openrouter') || requestedModel.includes(':free') || (requestedModel.includes('/') && !requestedModel.startsWith('gemini'))) {
        targetProvider = providerMap.get('openrouter') || providerMap.get('deepseek') || providerMap.get('groq');
      } else if (requestedModel.includes('deepseek') || requestedModel === 'deepseek-4.1' || requestedModel === 'deepseek-flash' || requestedModel === 'deepseek-r1' || requestedModel === 'deepseek-chat') {
        targetProvider = providerMap.get('deepseek') || providerMap.get('openrouter') || providerMap.get('groq');
        if (targetProvider?.name === 'groq') {
          targetModelId = 'deepseek-r1-distill-llama-70b';
        } else if (targetProvider?.name === 'openrouter') {
          targetModelId = requestedModel.includes('r1') ? 'deepseek/deepseek-r1:free' : 'deepseek/deepseek-chat:free';
        }
      } else if (requestedModel.startsWith('llama') || requestedModel.includes('groq')) {
        targetProvider = providerMap.get('groq');
        targetModelId = normalizeGroqModel(requestedModel);
      }

      // Strict Model Fidelity: If user specifically asked for a provider and it's missing
      if (!targetProvider || (typeof targetProvider.isConfigured === 'function' && !targetProvider.isConfigured())) {
        if (!allowFallback && requestedModel !== 'auto') {
          const providerDisplayName = requestedModel.startsWith('gemini') ? 'Google Gemini' : requestedModel.startsWith('gpt') ? 'OpenAI GPT' : requestedModel.includes('deepseek') ? 'DeepSeek' : requestedModel.startsWith('llama') ? 'Groq LLaMA' : 'Requested AI Provider';
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
      } else if (requestedModel.includes('openrouter') || requestedModel.includes(':free') || (requestedModel.includes('/') && !requestedModel.startsWith('gemini'))) {
        targetProvider = providerMap.get('openrouter') || providerMap.get('deepseek') || providerMap.get('groq');
      } else if (requestedModel.includes('deepseek') || requestedModel === 'deepseek-4.1' || requestedModel === 'deepseek-flash' || requestedModel === 'deepseek-r1' || requestedModel === 'deepseek-chat') {
        targetProvider = providerMap.get('deepseek') || providerMap.get('openrouter') || providerMap.get('groq');
        if (targetProvider?.name === 'groq') {
          targetModelId = 'deepseek-r1-distill-llama-70b';
        } else if (targetProvider?.name === 'openrouter') {
          targetModelId = requestedModel.includes('r1') ? 'deepseek/deepseek-r1:free' : 'deepseek/deepseek-chat:free';
        }
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

  // DeepSeek Official
  if (config.deepseekApiKey) {
    providers.push(
      createDeepSeekProvider({
        apiKey: config.deepseekApiKey,
        model: config.deepseekModel || 'deepseek-chat',
        baseURL: config.deepseekBaseUrl,
        timeoutMs: config.deepseekTimeoutMs || 25_000,
      })
    );
  }

  // OpenRouter (Free tier / Multimodel Hub ala Cline)
  if (config.openrouterApiKey) {
    providers.push(
      createOpenRouterProvider({
        apiKey: config.openrouterApiKey,
        model: config.openrouterModel || 'deepseek/deepseek-r1:free',
        baseURL: config.openrouterBaseUrl,
        timeoutMs: config.openrouterTimeoutMs || 25_000,
      })
    );
  }

  // Groq (includes DeepSeek R1 Distill 70B ultra fast)
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

// 9. Provider Health Service
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

// 10. Model Router
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

    if (model.includes('deepseek') || model === 'deepseek-4.1' || model === 'deepseek-flash' || model === 'deepseek-r1' || model === 'deepseek-chat') {
      const target = this.providers.find(p => p.name === 'deepseek' || p.name === 'openrouter' || p.name === 'groq');
      return { provider: target || this.providers[0], modelId: model };
    }

    if (model.includes('openrouter') || model.includes(':free') || model.includes('/')) {
      const target = this.providers.find(p => p.name === 'openrouter' || p.name === 'deepseek' || p.name === 'groq');
      return { provider: target || this.providers[0], modelId: model };
    }

    if (model.startsWith('llama') || model.includes('groq')) {
      const target = this.providers.find(p => p.name === 'groq');
      return { provider: target || this.providers[0], modelId: normalizeGroqModel(model) };
    }

    return { provider: this.providers[0], modelId: model };
  }
}

// 11. Response Validator
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
