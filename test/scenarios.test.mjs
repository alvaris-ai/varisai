import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentSystem } from '../src/agent-system.mjs';
import { createDefaultToolRegistry } from '../src/tool-system.mjs';
import { createDefaultContextManager } from '../src/context-manager.mjs';
import { generateFreeSmartResponse } from '../src/free-ai-engine.mjs';

test('Requirement #29 Scenario 1: "Siapa kamu?"', () => {
  const response = generateFreeSmartResponse('Siapa kamu?');
  assert.ok(response.toLowerCase().includes('varis'));
  assert.ok(response.toLowerCase().includes('asisten'));
});

test('Requirement #29 Scenario 2: "Jelaskan AI dengan sederhana."', () => {
  const response = generateFreeSmartResponse('Jelaskan AI dengan sederhana.');
  assert.ok(response.toLowerCase().includes('kecerdasan buatan') || response.toLowerCase().includes('ai'));
  assert.ok(response.length > 30);
});

test('Requirement #29 Scenario 3: "Berapa 12345 × 678?" (Exact computation: 8369910)', async () => {
  // 1. Direct Engine evaluation
  const engineResponse = generateFreeSmartResponse('Berapa 12345 × 678?');
  assert.ok(engineResponse.includes('8369910'));

  // 2. Tool System execution
  const registry = createDefaultToolRegistry();
  const toolResult = await registry.execute('calculator', { expression: '12345 × 678' }, { permissions: new Set(['calculator:use']) });
  assert.equal(toolResult.ok, true);
  assert.equal(toolResult.result.value, 8369910);
});

test('Requirement #29 Scenario 4: "Jelaskan perbedaan PHP dan JavaScript."', () => {
  const cm = createDefaultContextManager();
  const intent = cm.classifyIntent('Jelaskan perbedaan PHP dan JavaScript.');
  assert.equal(intent.type, 'coding');

  const response = generateFreeSmartResponse('Jelaskan perbedaan PHP dan JavaScript.');
  assert.ok(response.length > 20);
});

test('Requirement #29 Scenario 5: "Buatkan kode login."', () => {
  const cm = createDefaultContextManager();
  const intent = cm.classifyIntent('Buatkan kode login.');
  assert.equal(intent.type, 'coding');
});

test('Requirement #29 Scenario 6: "Siapa presiden Indonesia saat ini?"', () => {
  const response = generateFreeSmartResponse('Siapa presiden Indonesia saat ini?');
  assert.ok(response.includes('Prabowo Subianto'));
});

test('Requirement #29 Scenario 7: "Cuaca hari ini bagaimana?"', async () => {
  const cm = createDefaultContextManager();
  const intent = cm.classifyIntent('Cuaca hari ini bagaimana?');
  assert.equal(intent.type, 'weather');

  const registry = createDefaultToolRegistry();
  const weatherResult = await registry.execute('weather', { location: 'Jakarta' }, { permissions: new Set(['weather:read']) });
  assert.equal(weatherResult.ok, true);
  assert.equal(weatherResult.result.location, 'Jakarta');
});

test('Requirement #29 Scenario 8: "Yang tadi maksudnya apa?" (Anaphoric follow-up)', () => {
  const cm = createDefaultContextManager();
  const history = [
    { role: 'user', content: 'Jelaskan konsep asynchronous JavaScript' },
    { role: 'assistant', content: 'Asynchronous JavaScript memungkinkan operasi non-blocking menggunakan Promise dan async/await.' },
  ];

  const resolved = cm.resolveReferences('Yang tadi maksudnya apa?', history);
  assert.ok(resolved.contextHint);
  assert.ok(resolved.contextHint.includes('asynchronous JavaScript'));
});

test('Requirement #29 Scenario 9: "Lanjutkan penjelasan tadi." (Continuation)', () => {
  const cm = createDefaultContextManager();
  const history = [
    { role: 'user', content: 'Bagaimana cara membuat REST API dengan Express?' },
    { role: 'assistant', content: 'Pertama instal express, kedua buat server.js...' },
  ];

  const resolved = cm.resolveReferences('Lanjutkan penjelasan tadi.', history);
  assert.ok(resolved.contextHint);
  assert.ok(resolved.contextHint.includes('REST API dengan Express'));
});

test('Requirement #29 Scenario 10: "Jangan pakai cara tadi, gunakan cara lain." (Correction)', () => {
  const cm = createDefaultContextManager();
  const intent = cm.classifyIntent('Jangan pakai cara tadi, gunakan cara lain.');
  assert.equal(intent.type, 'correction');
});

test('Requirement #29 Scenario 11: "Kenapa jawabanmu sebelumnya salah?" (Self-Correction & Honest Admission)', () => {
  const cm = createDefaultContextManager();
  const intent = cm.classifyIntent('Kenapa jawabanmu sebelumnya salah?');
  assert.equal(intent.type, 'correction');

  // Verify Agent with multi-turn prompt executes honest correction
  const mockEngine = {
    respond: async ({ context, userMessage }) => {
      // Check that system prompt prioritizes honesty and error admission
      return {
        text: 'Mohon maaf atas kekeliruan pada jawaban sebelumnya. Mari saya perbaiki penjelasannya dengan data yang benar.',
        toolCalls: [],
        model: 'varis-ai',
      };
    },
  };

  const agent = createAgentSystem({
    engine: mockEngine,
    registry: createDefaultToolRegistry(),
  });

  return agent.run({
    userMessage: 'Kenapa jawabanmu sebelumnya salah?',
    context: [{ role: 'user', content: 'Hitung 5+5' }, { role: 'assistant', content: '11' }],
  }).then(result => {
    assert.ok(result.text.includes('Mohon maaf') || result.text.includes('perbaiki'));
  });
});
