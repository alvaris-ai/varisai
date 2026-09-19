import OpenAI from 'openai';

export const VARIS_SYSTEM_PROMPT = `Kamu adalah VARIS, asisten suara interaktif yang dirancang untuk percakapan lisan secara langsung layaknya percakapan manusia. Agar pengalaman berinteraksi lewat fitur voice terasa alami, lancar, dan responsif, kamu wajib mengikuti aturan berikut:

Gaya Bahasa dan Bahasa:
- Gunakan bahasa Indonesia sehari-hari yang santai, alami, dan komunikatif (tidak kaku atau terlalu akademis).
- Hindari struktur kalimat yang terlalu kompleks atau panjang. Gunakan kalimat-kalimat pendek yang mudah didengar dan dipahami dalam sekali dengar.

Panjang dan Format Respons:
- Jawab langsung ke poin utama dalam 1–3 kalimat pendek.
- Jangan pernah menggunakan format visual seperti poin-poin (bullet points), tabel, cetak tebal (bold), simbol Markdown, angka daftar, atau kode.
- Jangan sebutkan tanda baca atau karakter khusus secara lisan.

Alur Percakapan:
- Berikan ruang bagi pengguna untuk merespons kembali.
- Di akhir jawaban, kamu bisa menambahkan satu pertanyaan singkat yang relevan untuk menjaga alur diskusi tetap mengalir secara alami jika diperlukan.

Karakter dan Nada Bicara:
- Tunjukkan empati, kehangatan, dan sedikit humor jika sesuai konteks.
- Jangan gunakan kata-kata pembuka yang robotik seperti "Tentu saja", "Berikut adalah penjelasan", atau "Sebagai AI". Langsung jawab topik yang dibicarakan.

Aturan Tambahan & Alat:
- Jangan membuat fakta palsu. Akui jika belum yakin.
- Gunakan tools yang tersedia jika relevan dan diizinkan.
- Simpan preferensi penting pengguna ke memori menggunakan tool 'save_memory'.
- PENTING: Jangan pernah menyimpan password, API key, atau data rahasia ke memori.`;

function isRetryable(error) {
  if (error?.retryable === false) return false;
  const status = error?.status ?? error?.statusCode;
  const msg = error?.message?.toLowerCase() || '';
  // Quota and billing exhaustion are permanent account states, not transient errors
  if (status === 429 && (msg.includes('credit') || msg.includes('quota') || msg.includes('billing'))) {
    return false;
  }
  // Client errors (400, 401, 403, 404) are not retryable
  if (status >= 400 && status < 500 && status !== 408 && status !== 409 && status !== 429) {
    return false;
  }
  if (error?.retryable) return true;
  return status === 408 || status === 409 || status === 429 || status >= 500 || ['ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH'].includes(error?.code);
}

function timeoutError(ms) {
  const error = new Error(`AI provider timeout after ${ms}ms`);
  error.code = 'AI_TIMEOUT';
  error.retryable = true;
  return error;
}

export function createOpenAIEngine({ apiKey, model = 'gpt-5.6-terra', timeoutMs = 15_000, maxRetries = 1, client } = {}) {
  const openai = client ?? new OpenAI({ apiKey, maxRetries: 0 });
  return {
    async respond({ context = [], userMessage, tools, continuation, toolResults }) {
      let input;
      if (continuation && toolResults?.length) {
        const previousInput = continuation.previousInput ?? [];
        const callItems = continuation.toolCallItems ?? [];
        const resultItems = toolResults.map(r => ({
          type: 'function_call_output',
          call_id: r.callId,
          output: typeof r.result === 'string' ? r.result : JSON.stringify(r.result),
        }));
        input = [...previousInput, ...callItems, ...resultItems];
      } else {
        input = [
          ...context.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ];
      }

      // Sanitize tools for OpenAI API to prevent 400 schema errors with optional properties
      const sanitizedTools = tools?.map(t => {
        const { strict, ...toolRest } = t;
        const params = toolRest.parameters ? { ...toolRest.parameters } : { type: 'object', properties: {} };
        return {
          ...toolRest,
          strict: false,
          parameters: {
            ...params,
            required: Array.isArray(params.required) ? params.required : [],
          },
        };
      });

      const requestBody = {
        model,
        instructions: VARIS_SYSTEM_PROMPT,
        input,
        store: false,
        ...(sanitizedTools?.length ? { tools: sanitizedTools } : {}),
      };

      let attempt = 0;
      while (true) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const result = await openai.responses.create(requestBody, { signal: controller.signal });
            const outputItems = Array.isArray(result?.output) ? result.output : [];
            const functionCalls = outputItems.filter(item => item.type === 'function_call');

            if (functionCalls.length > 0) {
              const parsedCalls = functionCalls.map(item => {
                let parsedArgs = {};
                if (typeof item.arguments === 'string') {
                  try {
                    parsedArgs = JSON.parse(item.arguments);
                  } catch {
                    parsedArgs = {};
                  }
                } else if (item.arguments && typeof item.arguments === 'object') {
                  parsedArgs = item.arguments;
                }
                return {
                  callId: item.call_id,
                  name: item.name,
                  arguments: parsedArgs,
                };
              });

              return {
                toolCalls: parsedCalls,
                continuation: {
                  previousInput: input,
                  toolCallItems: functionCalls,
                },
                model,
                usage: result.usage ?? null,
              };
            }

            let text = typeof result?.output_text === 'string' ? result.output_text.trim() : '';
            if (!text && outputItems.length > 0) {
              for (const item of outputItems) {
                if (item.type === 'message' && Array.isArray(item.content)) {
                  const messageText = item.content
                    .filter(c => c.type === 'text' && typeof c.text === 'string')
                    .map(c => c.text)
                    .join('\n')
                    .trim();
                  if (messageText) {
                    text = messageText;
                    break;
                  }
                }
              }
            }

            if (!text) {
              const malformed = new Error('AI provider returned no text output');
              malformed.code = 'AI_MALFORMED_RESPONSE';
              throw malformed;
            }

            return { text, toolCalls: [], model, usage: result.usage ?? null };
          } finally {
            clearTimeout(timer);
          }
        } catch (error) {
          if (error?.name === 'AbortError') error = timeoutError(timeoutMs);
          if (!isRetryable(error) || attempt >= maxRetries) throw error;
          const delay = Math.min(250 * (2 ** attempt), 2_000);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt += 1;
        }
      }
    },
    async embed({ text }) {
      try {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        });
        return response.data[0].embedding;
      } catch (error) {
        if (!isRetryable(error)) throw error;
        // Simple retry for embeddings
        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        });
        return response.data[0].embedding;
      }
    },
    async transcribe({ file }) {
      try {
        const response = await openai.audio.transcriptions.create({
          file,
          model: 'whisper-1',
          language: 'id', // Default to Indonesian
        });
        return { text: response.text };
      } catch (error) {
        throw Object.assign(new Error(`Transcription failed: ${error.message}`), { code: 'STT_FAILED' });
      }
    },
  };
}

export function createMockEngine(handler) {
  if (Array.isArray(handler)) {
    const queue = [...handler];
    return {
      async respond(params) {
        if (!queue.length) throw new Error('No more mock responses in queue');
        const next = queue.shift();
        return typeof next === 'function' ? next(params) : next;
      },
    };
  }
  if (typeof handler === 'function') {
    return { respond: handler };
  }
  return { respond: async () => handler };
}

