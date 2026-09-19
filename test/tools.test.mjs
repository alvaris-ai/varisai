import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ToolRegistry,
  validateSchema,
  calculator,
  createDefaultToolRegistry,
} from '../src/tool-system.mjs';

test('Calculator tool: arithmetic evaluations and precedence', async () => {
  assert.equal(calculator({ expression: '2 + 3' }).value, 5);
  assert.equal(calculator({ expression: '10 - 4' }).value, 6);
  assert.equal(calculator({ expression: '3 * 7' }).value, 21);
  assert.equal(calculator({ expression: '20 / 4' }).value, 5);
  assert.equal(calculator({ expression: '17 % 5' }).value, 2);
  assert.equal(calculator({ expression: '2 ** 3' }).value, 8);
  assert.equal(calculator({ expression: '2 + 3 * 4' }).value, 14);
  assert.equal(calculator({ expression: '(2 + 3) * 4' }).value, 20);
  assert.equal(calculator({ expression: '2 ** 3 ** 2' }).value, 512);
  assert.equal(calculator({ expression: '-5 + 10' }).value, 5);
  assert.equal(calculator({ expression: '-(3 * 4)' }).value, -12);
  assert.equal(calculator({ expression: '3.5 * 2.0' }).value, 7);
  assert.equal(calculator({ expression: '   100   /   ( 2 + 3 )   ' }).value, 20);
});

test('Calculator tool: handles errors safely without crashing', async () => {
  const registry = createDefaultToolRegistry();
  const context = { permissions: new Set(['calculator:use']) };

  // Division by zero
  const divZero = await registry.execute('calculator', { expression: '10 / 0' }, context);
  assert.equal(divZero.ok, false);
  assert.equal(divZero.error.code, 'DIVISION_BY_ZERO');
  assert.equal(divZero.error.message, 'Division by zero is not allowed.');

  // Modulo by zero
  const modZero = await registry.execute('calculator', { expression: '10 % 0' }, context);
  assert.equal(modZero.ok, false);
  assert.equal(modZero.error.code, 'DIVISION_BY_ZERO');

  // Invalid characters / code injection attempt
  const injection = await registry.execute('calculator', { expression: 'process.exit(1)' }, context);
  assert.equal(injection.ok, false);
  assert.equal(injection.error.code, 'INVALID_EXPRESSION');

  // Syntax error: mismatched parentheses
  const mismatch = await registry.execute('calculator', { expression: '(2 + 3' }, context);
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.error.code, 'INVALID_EXPRESSION');

  // Empty expression
  const empty = await registry.execute('calculator', { expression: '   ' }, context);
  assert.equal(empty.ok, false);
  assert.equal(empty.error.code, 'INVALID_EXPRESSION');

  // Schema validation failure: invalid type
  const badType = await registry.execute('calculator', { expression: 123 }, context);
  assert.equal(badType.ok, false);
  assert.equal(badType.error.code, 'INVALID_INPUT');

  // Schema validation failure: extra properties
  const extra = await registry.execute('calculator', { expression: '1+1', malicious: true }, context);
  assert.equal(extra.ok, false);
  assert.equal(extra.error.code, 'INVALID_INPUT');
});

test('Date/Time tool: retrieves formatted time with timezone and handles errors', async () => {
  const fixedDate = new Date('2026-09-18T12:00:00.000Z');
  const registry = createDefaultToolRegistry({ now: () => fixedDate });
  const context = { permissions: new Set(['datetime:read']) };

  // Valid timezone UTC
  const utcResult = await registry.execute('date_time', { timezone: 'UTC' }, context);
  assert.equal(utcResult.ok, true);
  assert.equal(utcResult.result.timezone, 'UTC');
  assert.equal(utcResult.result.iso, '2026-09-18T12:00:00.000Z');
  assert.equal(utcResult.result.timestamp, fixedDate.getTime());
  assert.ok(utcResult.result.formatted.includes('2026'));

  // Valid timezone Asia/Jakarta (+7)
  const jktResult = await registry.execute('date_time', { timezone: 'Asia/Jakarta' }, context);
  assert.equal(jktResult.ok, true);
  assert.equal(jktResult.result.timezone, 'Asia/Jakarta');
  assert.ok(jktResult.result.formatted.includes('7:00:00'));

  // Invalid timezone returns structured error
  const invalidResult = await registry.execute('date_time', { timezone: 'Mars/Olympus' }, context);
  assert.equal(invalidResult.ok, false);
  assert.equal(invalidResult.error.code, 'INVALID_TIMEZONE');
  assert.match(invalidResult.error.message, /Invalid IANA timezone/i);

  // Missing timezone argument
  const missingArg = await registry.execute('date_time', {}, context);
  assert.equal(missingArg.ok, false);
  assert.equal(missingArg.error.code, 'INVALID_INPUT');
});

test('User Profile tool: safe profile access and sanitization', async () => {
  const registry = createDefaultToolRegistry();
  const context = {
    permissions: new Set(['profile:read']),
    getUserProfile: async () => ({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Alice Developer',
      email: 'alice@example.com',
      password_hash: '$scrypt$secret_hash_value',
      internal_role: 'admin',
    }),
  };

  const result = await registry.execute('user_profile', {}, context);
  assert.equal(result.ok, true);
  assert.deepEqual(result.result, {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Alice Developer',
    email: 'alice@example.com',
  });
  // Verify password hash and internal fields are never exposed
  assert.equal(result.result.password_hash, undefined);
  assert.equal(result.result.internal_role, undefined);

  // Profile not found
  const notFoundContext = {
    permissions: new Set(['profile:read']),
    getUserProfile: async () => null,
  };
  const notFound = await registry.execute('user_profile', {}, notFoundContext);
  assert.equal(notFound.ok, false);
  assert.equal(notFound.error.code, 'PROFILE_NOT_FOUND');

  // Service unavailable
  const noServiceContext = {
    permissions: new Set(['profile:read']),
  };
  const noService = await registry.execute('user_profile', {}, noServiceContext);
  assert.equal(noService.ok, false);
  assert.equal(noService.error.code, 'SERVICE_UNAVAILABLE');
});

test('Conversation Memory tool: reading recent messages with bounded limits', async () => {
  const registry = createDefaultToolRegistry();
  const sampleMessages = [
    { id: 'm1', role: 'user', content: 'Hello', created_at: '2026-09-18T10:00:00Z', internal_seq: 1 },
    { id: 'm2', role: 'assistant', content: 'Hi there!', created_at: '2026-09-18T10:00:05Z', internal_seq: 2 },
    { id: 'm3', role: 'user', content: 'How are you?', created_at: '2026-09-18T10:01:00Z', internal_seq: 3 },
  ];

  let requestedLimit = null;
  const context = {
    permissions: new Set(['memory:read']),
    getConversationMemory: async (limit) => {
      requestedLimit = limit;
      return sampleMessages.slice(-limit);
    },
  };

  // Default limit
  const defaultResult = await registry.execute('conversation_memory', {}, context);
  assert.equal(defaultResult.ok, true);
  assert.equal(requestedLimit, 5);
  assert.equal(defaultResult.result.messages.length, 3);
  assert.deepEqual(defaultResult.result.messages[0], {
    role: 'user',
    content: 'Hello',
    created_at: '2026-09-18T10:00:00Z',
  });
  // Verify internal sequence IDs are omitted
  assert.equal(defaultResult.result.messages[0].internal_seq, undefined);

  // Explicit limit 2
  const limit2Result = await registry.execute('conversation_memory', { limit: 2 }, context);
  assert.equal(limit2Result.ok, true);
  assert.equal(requestedLimit, 2);
  assert.equal(limit2Result.result.messages.length, 2);

  // Invalid limit (> 10)
  const tooLarge = await registry.execute('conversation_memory', { limit: 50 }, context);
  assert.equal(tooLarge.ok, false);
  assert.equal(tooLarge.error.code, 'INVALID_INPUT');

  // Invalid limit (< 1)
  const tooSmall = await registry.execute('conversation_memory', { limit: 0 }, context);
  assert.equal(tooSmall.ok, false);
  assert.equal(tooSmall.error.code, 'INVALID_INPUT');
});

test('Permission system: blocks unpermitted tools and permits granted tools', async () => {
  const registry = createDefaultToolRegistry();

  // No permissions granted
  const noPermContext = { permissions: new Set() };
  for (const toolName of ['calculator', 'date_time', 'user_profile', 'conversation_memory']) {
    const denied = await registry.execute(toolName, toolName === 'calculator' ? { expression: '1+1' } : toolName === 'date_time' ? { timezone: 'UTC' } : {}, noPermContext);
    assert.equal(denied.ok, false);
    assert.equal(denied.error.code, 'PERMISSION_DENIED');
    assert.match(denied.error.message, /Permission required:/);
  }

  // Grant only calculator:use
  const calcOnlyContext = { permissions: new Set(['calculator:use']) };
  const calcAllowed = await registry.execute('calculator', { expression: '7 * 6' }, calcOnlyContext);
  assert.equal(calcAllowed.ok, true);
  assert.equal(calcAllowed.result.value, 42);

  // Still denied for datetime
  const dateDenied = await registry.execute('date_time', { timezone: 'UTC' }, calcOnlyContext);
  assert.equal(dateDenied.ok, false);
  assert.equal(dateDenied.error.code, 'PERMISSION_DENIED');
});

test('Tool Registry: registration validation and definitions format', async () => {
  const registry = new ToolRegistry();

  // Rejects invalid tool registration
  assert.throws(() => registry.register(null), /must be an object/);
  assert.throws(() => registry.register({ name: '' }), /non-empty string/);
  assert.throws(() => registry.register({ name: 'test' }), /description is required/);
  assert.throws(() => registry.register({ name: 'test', description: 'desc' }), /inputSchema is required/);
  assert.throws(() => registry.register({ name: 'test', description: 'desc', inputSchema: {} }), /execute function is required/);

  registry.register({
    name: 'custom_echo',
    description: 'Echoes input back',
    permission: 'echo:use',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
    },
    execute: async ({ text }) => ({ echo: text }),
  });

  // Rejects duplicate tool name
  assert.throws(() => registry.register({
    name: 'custom_echo',
    description: 'Duplicate',
    inputSchema: {},
    execute: () => {},
  }), /already registered/);

  // Validates definitions format for OpenAI function calling
  const defs = registry.definitions();
  assert.equal(defs.length, 1);
  assert.deepEqual(defs[0], {
    type: 'function',
    name: 'custom_echo',
    description: 'Echoes input back',
    parameters: {
      type: 'object',
      properties: { text: { type: 'string' } },
    },
    strict: true,
  });

  // Calling unknown tool returns TOOL_NOT_FOUND
  const unknownResult = await registry.execute('non_existent', {}, {});
  assert.equal(unknownResult.ok, false);
  assert.equal(unknownResult.error.code, 'TOOL_NOT_FOUND');
});

test('Long-Term Memory tools: save, update, and delete with security checks', async () => {
  const registry = createDefaultToolRegistry();
  
  const memories = new Map();
  let nextId = 1;
  const context = {
    permissions: new Set(['memory:write', 'memory:delete']),
    embed: async (text) => [0.1, 0.2, 0.3], // Mock embedding
    createMemory: async (text, embedding) => {
      const id = String(nextId++);
      const mem = { id, text, kind: 'fact', embedding };
      memories.set(id, mem);
      return mem;
    },
    updateMemory: async (id, text, embedding) => {
      if (!memories.has(id)) return null;
      const mem = memories.get(id);
      mem.text = text;
      mem.embedding = embedding;
      return mem;
    },
    deleteMemory: async (id) => {
      return memories.delete(id);
    },
  };

  // Test safe save
  const saveSafe = await registry.execute('save_memory', { text: 'My favorite color is green' }, context);
  assert.equal(saveSafe.ok, true);
  assert.equal(saveSafe.result.text, 'My favorite color is green');
  const savedId = saveSafe.result.id;

  // Test save with sensitive data
  const savePassword = await registry.execute('save_memory', { text: 'My password is Password123!' }, context);
  assert.equal(savePassword.ok, false);
  assert.equal(savePassword.error.code, 'SENSITIVE_DATA');

  const saveApiKey = await registry.execute('save_memory', { text: 'API key: sk-abcdef' }, context);
  assert.equal(saveApiKey.ok, false);
  assert.equal(saveApiKey.error.code, 'SENSITIVE_DATA');

  // Test safe update
  const updateSafe = await registry.execute('update_memory', { id: savedId, text: 'My favorite color is teal' }, context);
  assert.equal(updateSafe.ok, true);
  assert.equal(updateSafe.result.text, 'My favorite color is teal');

  // Test update with sensitive data
  const updateSecret = await registry.execute('update_memory', { id: savedId, text: 'The secret is xyz' }, context);
  assert.equal(updateSecret.ok, false);
  assert.equal(updateSecret.error.code, 'SENSITIVE_DATA');

  // Test delete
  const del = await registry.execute('delete_memory', { id: savedId }, context);
  assert.equal(del.ok, true);
  assert.equal(del.result.success, true);

  // Test delete non-existent
  const delAgain = await registry.execute('delete_memory', { id: savedId }, context);
  assert.equal(delAgain.ok, false);
  assert.equal(delAgain.error.code, 'NOT_FOUND');
});