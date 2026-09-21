import { getDefaultResearchAgent } from './web-research.mjs';

export const DEFAULT_AGENT_PERMISSIONS = Object.freeze([
  'calculator:use',
  'datetime:read',
  'profile:read',
  'memory:read',
  'memory:write',
  'memory:delete',
  'voice:control',
  'web:search',
  'weather:read',
  'file:read',
  'file:search',
]);

/**
 * Checks if a user message requires real-time web research grounding
 */
function shouldTriggerWebResearch(userMessage = '', intent = null) {
  if (!userMessage || typeof userMessage !== 'string') return false;
  const lower = userMessage.toLowerCase().replace(/[?!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();

  // Math calculations, small talk, identity, and conversational directives do not need web search
  if (
    intent?.type === 'calculation' ||
    intent?.type === 'small_talk' ||
    intent?.type === 'identity' ||
    intent?.type === 'user_name' ||
    intent?.type === 'correction_repair' ||
    intent?.type === 'referential_choice' ||
    intent?.type === 'explanation_request'
  ) {
    return false;
  }
  if (/^(\d+[\s\d+\-*/÷×%^()]+)$/.test(lower) || /^(\d+\s*[\+\-\*\/\%x×÷\^]\s*\d+|hitung\b|berapa hasil|berapa 25 x 48)/i.test(lower)) return false;
  if (/^(halo|hallo|hai|hey|hei|hello|hi|helo|holla|apa kabar|gimana kabarnya|pagi|siang|sore|malam|terima kasih|makasih|thanks|thank you|selamat pagi|selamat siang|selamat sore|selamat malam)(\b|\s|$)/i.test(lower)) return false;
  if (/^(siapa kamu|kamu siapa|siapa namamu|namamu siapa|kamu ini siapa|apa kemampuanmu|apa yang bisa kamu lakukan|peran mu|peran kamu|apakah kamu robot)(\b|\s|$)/i.test(lower)) return false;
  if (lower.startsWith('namaku ') || lower.startsWith('nama saya ') || lower.startsWith('panggil aku ')) return false;
  if (lower.startsWith('bukan ') || lower.startsWith('salah') || lower === 'jelaskan lagi' || lower === 'pendekin' || lower === 'singkat aja' || lower === 'buat lebih sederhana') return false;
  if (lower.includes('dia pintar') || lower.startsWith('tambahkan gpt') || lower.includes('yang kedua') || lower.includes('balik ke varis') || lower === 'kenapa kodeku error?' || lower === 'kenapa kodeku error') return false;

  // Temporal & Fact Verification Trigger Words
  const temporalKeywords = [
    'sekarang', 'saat ini', 'terbaru', 'terkini', 'hari ini', 'tahun ini', 'bulan ini',
    'presiden', 'menteri', 'gubernur', 'walikota', 'bupati', 'juara', 'skor', 'kurs',
    'harga', 'berita', 'kapan', 'siapa penemu', 'siapa pendiri', 'siapa pencipta',
    'sejarah', 'perang dunia', 'populasi', 'jumlah penduduk', 'ibukota', 'cuaca hari ini'
  ];

  for (const kw of temporalKeywords) {
    if (lower.includes(kw)) return true;
  }

  // Complex knowledge questions with 4+ words often benefit from factual grounding
  const words = lower.split(' ').filter(w => w.length > 2);
  if (words.length >= 5 && (lower.includes('apa itu') || lower.includes('bagaimana cara') || lower.includes('kenapa') || lower.includes('mengapa'))) {
    return true;
  }

  return false;
}

/**
 * Helper to extract and save safe user preferences into long-term memory
 */
async function tryAutoExtractMemory({ userMessage, userId, repository, embedFn, logger }) {
  if (!userMessage || !userId || !repository?.createMemory || typeof embedFn !== 'function') return;

  const lower = userMessage.toLowerCase().trim();

  // Safety Guard: NEVER save passwords, tokens, API keys, or credentials
  if (
    lower.includes('password') ||
    lower.includes('api_key') ||
    lower.includes('apikey') ||
    lower.includes('secret') ||
    lower.includes('token') ||
    lower.includes('pin') ||
    lower.includes('cvv') ||
    lower.includes('rekening')
  ) {
    return;
  }

  // Detect explicit self-introduction or preference statements
  let memoryFact = null;
  if (lower.startsWith('nama saya ') || lower.startsWith('namaku ') || lower.startsWith('panggil aku ')) {
    memoryFact = `Nama pengguna: ${userMessage.trim()}`;
  } else if (lower.startsWith('saya suka ') || lower.startsWith('saya lebih suka ') || lower.startsWith('hobi saya ')) {
    memoryFact = `Preferensi pengguna: ${userMessage.trim()}`;
  } else if (lower.startsWith('ingat bahwa ') || lower.startsWith('tolong ingat ')) {
    memoryFact = userMessage.replace(/^(ingat bahwa|tolong ingat)\s+/i, '').trim();
  }

  if (memoryFact) {
    try {
      const embedding = await embedFn({ text: memoryFact });
      await repository.createMemory({ userId, text: memoryFact, embedding });
      logger?.info?.({ memoryFact }, 'Auto-saved user preference to long-term memory');
    } catch (err) {
      logger?.warn?.({ err }, 'Failed to auto-save user memory');
    }
  }
}

export function createAgentSystem({
  engine,
  registry,
  maxToolRounds = 5,
  defaultPermissions = DEFAULT_AGENT_PERMISSIONS,
} = {}) {
  if (!engine || typeof engine.respond !== 'function') {
    throw new Error('Agent engine with respond() is required');
  }
  if (!registry || typeof registry.execute !== 'function') {
    throw new Error('Tool registry with execute() is required');
  }

  const basePermissions = new Set(defaultPermissions);

  return {
    async run({
      context = [],
      initialContext = [],
      userMessage,
      userId,
      conversationId,
      repository,
      permissions,
      logger,
      now,
      model = 'auto',
      allowFallback = true,
      userPlan = null,
      intent = null,
    }) {
      const activePermissions = permissions
        ? (permissions instanceof Set ? permissions : new Set(permissions))
        : new Set(basePermissions);

      const toolContext = {
        userId,
        conversationId,
        permissions: activePermissions,
        logger,
        now,
        getUserProfile: async () => {
          if (!userId || !repository?.findUserById) return null;
          return repository.findUserById(userId);
        },
        getConversationMemory: async (limit = 5) => {
          if (!userId || !conversationId || !repository?.listRecentMessages) return [];
          return repository.listRecentMessages(userId, conversationId, limit);
        },
        embed: async (text) => {
          if (!engine.embed) throw new Error('Embed method not available');
          return engine.embed({ text });
        },
        createMemory: async (text, embedding) => {
          if (!userId || !repository?.createMemory) return null;
          return repository.createMemory({ userId, text, embedding });
        },
        updateMemory: async (id, text, embedding) => {
          if (!userId || !repository?.updateMemory) return null;
          return repository.updateMemory(userId, id, text, embedding);
        },
        deleteMemory: async (id) => {
          if (!userId || !repository?.deleteMemory) return false;
          return repository.deleteMemory(userId, id);
        },
        updateVoicePreferences: async ({ preset, speed }) => {
          if (!userId || !repository?.upsertPreferences) return null;
          const current = (await repository.getPreferences?.(userId)) || {};
          const currentStyle = typeof current.voice_style === 'string' ? JSON.parse(current.voice_style) : (current.voice_style || {});
          const newStyle = { ...currentStyle, preset: (preset || currentStyle.preset || 'NORMAL').toUpperCase() };
          const newSpeed = speed !== undefined && speed !== null ? Number(speed) : (current.speaking_speed || 0.92);
          return repository.upsertPreferences(userId, {
            voice_profile_id: current.voice_profile_id ?? null,
            speaking_speed: newSpeed,
            voice_style: newStyle,
            language: current.language || 'id',
          });
        },
        searchMemories: async (query) => {
          if (!userId || !repository?.searchMemories) return [];
          try {
            const embedding = engine.embed ? await engine.embed({ text: query }) : [];
            return repository.searchMemories(userId, embedding, 5, 0.5);
          } catch {
            return [];
          }
        },
      };

      let currentContext = [...(initialContext || []), ...(context || [])];

      // 1. Semantic Memory Retrieval (Long-Term Memory Integration)
      if (userMessage && userId && repository?.searchMemories && engine.embed) {
        try {
          const embedding = await engine.embed({ text: userMessage });
          const memories = await repository.searchMemories(userId, embedding, 5, 0.5);
          if (memories && memories.length > 0) {
            const memoryText = memories.map(m => `- [ID: ${m.id}] ${m.text}`).join('\n');
            const memoryPrompt = `Relevant Long-Term Memory:\n${memoryText}\n\nUse this information if it is relevant to the user's request. Do not mention the ID to the user unless they ask to update/delete it.`;
            currentContext = [
              { role: 'system', content: memoryPrompt },
              ...currentContext
            ];
          }
        } catch (err) {
          logger?.warn?.({ err }, 'Failed to retrieve long-term memory for semantic search');
        }
      }

      // 2. Real-Time Web Research & Factual Grounding (NEED WEB?)
      let researchResults = null;
      if (shouldTriggerWebResearch(userMessage, intent)) {
        try {
          const researchAgent = getDefaultResearchAgent();
          researchResults = await researchAgent.research(userMessage);
          if (researchResults && researchResults.formatted_context) {
            currentContext = [
              { role: 'system', content: researchResults.formatted_context },
              ...currentContext
            ];
            logger?.info?.({ plannedQueries: researchResults.planned_queries, sourcesCount: researchResults.sources?.length }, 'Injected real-time web research context into Agent pipeline');
          }
        } catch (err) {
          logger?.warn?.({ err }, 'Web research agent failed; continuing with direct reasoning');
        }
      }

      const toolDefs = registry.definitions ? registry.definitions() : [];
      const executedToolCalls = [];

      // 3. Multi-Step Reasoning & Tool Execution Loop
      let response = await engine.respond({
        context: currentContext,
        userMessage,
        tools: toolDefs,
        model,
        allowFallback,
        userPlan,
        intent,
      });

      for (let round = 0; round < maxToolRounds; round += 1) {
        if (!response.toolCalls || response.toolCalls.length === 0) {
          if (typeof response.text !== 'string' || !response.text.trim()) {
            const error = new Error('Agent returned no final text response');
            error.code = 'AI_MALFORMED_RESPONSE';
            throw error;
          }

          let finalText = response.text.trim();

          // 4. Self-Verification & Citation Grounding Check
          if (researchResults && researchResults.citations && researchResults.citations.length > 0) {
            const hasCitationsInText = /\[\d+\]|https?:\/\//.test(finalText);
            // If the model did not append markdown sources and research was critical, ensure sources are available
            if (!hasCitationsInText && researchResults.sources && researchResults.sources.length > 0) {
              const topSource = researchResults.sources[0];
              if (topSource && topSource.url && topSource.title) {
                finalText += `\n\n*Sumber: [${topSource.title}](${topSource.url})*`;
              }
            }
          }

          // 5. Auto-Memory candidate extraction
          if (userId && repository?.createMemory && engine.embed) {
            tryAutoExtractMemory({
              userMessage,
              userId,
              repository,
              embedFn: (p) => engine.embed(p),
              logger,
            }).catch(() => {});
          }

          return {
            text: finalText,
            model: response.model || model,
            modelUsed: response.modelUsed || response.model || model,
            fallbackUsed: response.fallbackUsed || null,
            usage: response.usage ?? null,
            toolCalls: executedToolCalls,
            research: researchResults ? {
              queries: researchResults.planned_queries,
              sourcesCount: researchResults.sources?.length || 0,
              epistemicState: researchResults.epistemic?.state || 'UNKNOWN',
            } : null,
            rounds: round + 1,
          };
        }

        const toolResults = [];
        for (const call of response.toolCalls) {
          logger?.info?.({ tool: call.name, callId: call.callId }, 'Executing tool call');
          executedToolCalls.push(call);
          const result = await registry.execute(call.name, call.arguments, toolContext);
          toolResults.push({
            callId: call.callId,
            name: call.name,
            result,
          });
        }

        response = await engine.respond({
          context: currentContext,
          userMessage,
          tools: toolDefs,
          model,
          allowFallback,
          userPlan,
          continuation: response.continuation,
          toolResults,
        });
      }

      const error = new Error('Agent exceeded maximum tool execution rounds');
      error.code = 'AGENT_TOOL_LOOP_LIMIT';
      throw error;
    },
  };
}



