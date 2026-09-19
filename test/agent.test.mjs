import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentSystem } from '../src/agent-system.mjs';
import { createDefaultToolRegistry } from '../src/tool-system.mjs';
import { createMockEngine } from '../src/ai-engine.mjs';

test('Agent System: direct answer without tool calls', async () => {
  const registry = createDefaultToolRegistry();
  const engine = createMockEngine(async ({ userMessage }) => ({
    text: `VARIS: Hello back to "${userMessage}"`,
    model: 'mock-model',
  }));

  const agent = createAgentSystem({ engine, registry });
  const result = await agent.run({
    userMessage: 'Hello VARIS',
    userId: 'u-1',
    conversationId: 'c-1',
  });

  assert.equal(result.text, 'VARIS: Hello back to "Hello VARIS"');
  assert.equal(result.model, 'mock-model');
  assert.equal(result.rounds, 1);
});

test('Agent System: single tool execution and continuation to final answer', async () => {
  const registry = createDefaultToolRegistry();
  let step = 0;
  const recordedContinuation = [];

  const engine = createMockEngine(async ({ tools, toolResults, continuation }) => {
    step += 1;
    if (step === 1) {
      assert.ok(tools.some(t => t.name === 'calculator'));
      return {
        toolCalls: [
          { callId: 'call_1', name: 'calculator', arguments: { expression: '25 * 4' } },
        ],
        continuation: { step: 1 },
      };
    }
    if (step === 2) {
      recordedContinuation.push({ continuation, toolResults });
      assert.equal(toolResults.length, 1);
      assert.equal(toolResults[0].callId, 'call_1');
      assert.equal(toolResults[0].name, 'calculator');
      assert.equal(toolResults[0].result.ok, true);
      assert.equal(toolResults[0].result.result.value, 100);
      return {
        text: 'The answer is 100.',
        model: 'mock-model',
      };
    }
    throw new Error('Unexpected extra step');
  });

  const agent = createAgentSystem({ engine, registry });
  const result = await agent.run({
    userMessage: 'What is 25 * 4?',
    userId: 'u-1',
    conversationId: 'c-1',
  });

  assert.equal(result.text, 'The answer is 100.');
  assert.equal(result.rounds, 2);
  assert.equal(recordedContinuation.length, 1);
});

test('Agent System: multiple parallel tool calls in one round', async () => {
  const fixedDate = new Date('2026-09-18T10:00:00.000Z');
  const registry = createDefaultToolRegistry({ now: () => fixedDate });
  let step = 0;

  const engine = createMockEngine(async ({ toolResults }) => {
    step += 1;
    if (step === 1) {
      return {
        toolCalls: [
          { callId: 'calc_1', name: 'calculator', arguments: { expression: '50 + 50' } },
          { callId: 'time_1', name: 'date_time', arguments: { timezone: 'UTC' } },
        ],
        continuation: { round: 1 },
      };
    }
    if (step === 2) {
      assert.equal(toolResults.length, 2);
      assert.equal(toolResults[0].result.result.value, 100);
      assert.equal(toolResults[1].result.result.timezone, 'UTC');
      return {
        text: `Calculation is 100, current UTC time is ${toolResults[1].result.result.formatted}`,
        model: 'mock-model',
      };
    }
  });

  const agent = createAgentSystem({ engine, registry });
  const result = await agent.run({
    userMessage: 'Calculate 50+50 and check UTC time',
    userId: 'u-1',
    conversationId: 'c-1',
  });

  assert.ok(result.text.includes('100'));
  assert.ok(result.text.includes('2026'));
  assert.equal(result.rounds, 2);
});

test('Agent System: tool failure handled gracefully and reported back to model', async () => {
  const registry = createDefaultToolRegistry();
  let step = 0;

  const engine = createMockEngine(async ({ toolResults }) => {
    step += 1;
    if (step === 1) {
      return {
        toolCalls: [
          { callId: 'call_div_zero', name: 'calculator', arguments: { expression: '10 / 0' } },
        ],
        continuation: { round: 1 },
      };
    }
    if (step === 2) {
      assert.equal(toolResults.length, 1);
      assert.equal(toolResults[0].result.ok, false);
      assert.equal(toolResults[0].result.error.code, 'DIVISION_BY_ZERO');
      return {
        text: 'I cannot divide by zero: ' + toolResults[0].result.error.message,
        model: 'mock-model',
      };
    }
  });

  const agent = createAgentSystem({ engine, registry });
  const result = await agent.run({
    userMessage: 'Divide 10 by 0',
    userId: 'u-1',
    conversationId: 'c-1',
  });

  assert.equal(result.text, 'I cannot divide by zero: Division by zero is not allowed.');
  assert.equal(result.rounds, 2);
});

test('Agent System: permission denied handled safely in agent run', async () => {
  const registry = createDefaultToolRegistry();
  let step = 0;

  const engine = createMockEngine(async ({ toolResults }) => {
    step += 1;
    if (step === 1) {
      return {
        toolCalls: [
          { callId: 'call_time', name: 'date_time', arguments: { timezone: 'UTC' } },
        ],
        continuation: { round: 1 },
      };
    }
    if (step === 2) {
      assert.equal(toolResults.length, 1);
      assert.equal(toolResults[0].result.ok, false);
      assert.equal(toolResults[0].result.error.code, 'PERMISSION_DENIED');
      return {
        text: 'I do not have permission to check the time.',
        model: 'mock-model',
      };
    }
  });

  // Only permit calculator
  const agent = createAgentSystem({ engine, registry, defaultPermissions: ['calculator:use'] });
  const result = await agent.run({
    userMessage: 'What time is it in UTC?',
    userId: 'u-1',
    conversationId: 'c-1',
  });

  assert.equal(result.text, 'I do not have permission to check the time.');
  assert.equal(result.rounds, 2);
});

test('Agent System: loop limit guard stops runaway tool calling', async () => {
  const registry = createDefaultToolRegistry();

  // Engine that continuously requests tools without returning text
  const infiniteEngine = createMockEngine(async () => ({
    toolCalls: [
      { callId: 'loop_call', name: 'calculator', arguments: { expression: '1 + 1' } },
    ],
    continuation: {},
  }));

  const agent = createAgentSystem({ engine: infiniteEngine, registry, maxToolRounds: 3 });

  await assert.rejects(
    () => agent.run({ userMessage: 'Loop forever', userId: 'u-1', conversationId: 'c-1' }),
    { code: 'AGENT_TOOL_LOOP_LIMIT' }
  );
});

test('Agent System: reads profile and memory via safe context functions', async () => {
  const registry = createDefaultToolRegistry();
  const mockRepo = {
    async findUserById(id) {
      return { id, name: 'Bob Smith', email: 'bob@example.com', password_hash: 'secret' };
    },
    async listRecentMessages(userId, convId, limit) {
      return [
        { role: 'user', content: 'My favorite color is blue', created_at: '2026-09-18T10:00:00Z' },
      ];
    },
  };

  let step = 0;
  const engine = createMockEngine(async ({ toolResults }) => {
    step += 1;
    if (step === 1) {
      return {
        toolCalls: [
          { callId: 'prof_1', name: 'user_profile', arguments: {} },
          { callId: 'mem_1', name: 'conversation_memory', arguments: { limit: 3 } },
        ],
        continuation: { round: 1 },
      };
    }
    if (step === 2) {
      assert.equal(toolResults.length, 2);
      const profile = toolResults[0].result.result;
      const memory = toolResults[1].result.result;
      assert.equal(profile.name, 'Bob Smith');
      assert.equal(profile.password_hash, undefined);
      assert.equal(memory.messages.length, 1);
      return {
        text: `Hello ${profile.name}, I recall: "${memory.messages[0].content}"`,
        model: 'mock-model',
      };
    }
  });

  const agent = createAgentSystem({ engine, registry });
  const result = await agent.run({
    userMessage: 'Who am I and what did I say?',
    userId: 'u-bob',
    conversationId: 'c-bob',
    repository: mockRepo,
  });

  assert.equal(result.text, 'Hello Bob Smith, I recall: "My favorite color is blue"');
  assert.equal(result.rounds, 2);
});

test('Agent System: semantic memory injection on user message', async () => {
  const registry = createDefaultToolRegistry();
  
  const mockRepo = {
    async searchMemories(userId, embedding, limit, threshold) {
      assert.equal(userId, 'u-mem');
      // Return a relevant memory
      return [
        { id: 'm-123', text: 'User has a dog named Rex.' },
      ];
    },
  };

  const engine = createMockEngine(async ({ context }) => {
    // Check if the system prompt was injected with the memory
    const memoryPrompt = context.find(c => c.role === 'system' && c.content.includes('Relevant Long-Term Memory:'));
    assert.ok(memoryPrompt);
    assert.ok(memoryPrompt.content.includes('User has a dog named Rex.'));
    
    return {
      text: 'I know about Rex!',
      model: 'mock-model',
    };
  });
  engine.embed = async ({ text }) => {
    return [0.5, 0.5]; // mock embedding
  };

  const agent = createAgentSystem({ engine, registry });
  const result = await agent.run({
    userMessage: 'Do you know my dog?',
    userId: 'u-mem',
    conversationId: 'c-mem',
    repository: mockRepo,
  });

  assert.equal(result.text, 'I know about Rex!');
  assert.equal(result.rounds, 1);
});

test('Agent System: no memory injection if no user message or no relevant memory', async () => {
  const registry = createDefaultToolRegistry();
  
  const mockRepo = {
    async searchMemories() {
      return []; // No memory found
    },
  };

  const engine = createMockEngine(async ({ context }) => {
    // Should not have a memory system prompt
    const memoryPrompt = context.find(c => c.role === 'system' && c.content.includes('Relevant Long-Term Memory:'));
    assert.equal(memoryPrompt, undefined);
    
    return {
      text: 'No memory used.',
      model: 'mock-model',
    };
  });
  engine.embed = async () => [0, 0];

  const agent = createAgentSystem({ engine, registry });
  const result = await agent.run({
    userMessage: 'Hello',
    userId: 'u-1',
    conversationId: 'c-1',
    repository: mockRepo,
  });

  assert.equal(result.text, 'No memory used.');
});

