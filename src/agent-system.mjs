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

      const toolDefs = registry.definitions ? registry.definitions() : [];
      const executedToolCalls = [];

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
          return {
            text: response.text.trim(),
            model: response.model || model,
            modelUsed: response.modelUsed || response.model || model,
            fallbackUsed: response.fallbackUsed || null,
            usage: response.usage ?? null,
            toolCalls: executedToolCalls,
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
          context,
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


