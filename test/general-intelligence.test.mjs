import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentSystem } from '../src/agent-system.mjs';
import { createDefaultToolRegistry, calculator } from '../src/tool-system.mjs';
import { createDefaultContextManager } from '../src/context-manager.mjs';
import { createMultiProviderOrchestrator, createSmartLocalProvider, VARIS_SYSTEM_PROMPT } from '../src/ai-providers.mjs';
import { generateFreeSmartResponse } from '../src/free-ai-engine.mjs';

test('Section 24: "Halo." & "Siapa kamu?" (Identity & Natural Conversation)', () => {
  const greeting = generateFreeSmartResponse('Halo.');
  assert.ok(greeting.length > 5);

  const identity = generateFreeSmartResponse('Siapa kamu?');
  assert.ok(identity.toLowerCase().includes('varis'));
});

test('Section 24: "Jelaskan black hole." (Astronomy & Science Knowledge)', () => {
  const response = generateFreeSmartResponse('Jelaskan black hole.');
  assert.ok(response.length > 30);
  assert.ok(response.toLowerCase().includes('black hole') || response.toLowerCase().includes('lubang hitam') || response.toLowerCase().includes('gravitasi'));
});

test('Section 24: "Kenapa langit berwarna biru?" (Science & Rayleigh Scattering)', () => {
  const response = generateFreeSmartResponse('Kenapa langit berwarna biru?');
  assert.ok(response.toLowerCase().includes('rayleigh') || response.toLowerCase().includes('atmosfer') || response.toLowerCase().includes('cahaya'));
});

test('Section 24: "Berapa 987654 × 12345?" (Math Precision: 12192588630)', async () => {
  // Test via Calculator tool
  const registry = createDefaultToolRegistry();
  const toolResult = await registry.execute(
    'calculator',
    { expression: '987654 × 12345' },
    { permissions: new Set(['calculator:use']) }
  );
  assert.equal(toolResult.ok, true);
  assert.equal(toolResult.result.value, 12192588630);

  // Test via Free Smart Engine
  const engineResult = generateFreeSmartResponse('Berapa 987654 × 12345?');
  assert.ok(engineResult.includes('12192588630'));
});

test('Section 24: "Apa perbedaan PHP dan Python?" (Programming & Tech Comparison)', () => {
  const cm = createDefaultContextManager();
  const intent = cm.classifyIntent('Apa perbedaan PHP dan Python?');
  assert.equal(intent.type, 'coding');

  const response = generateFreeSmartResponse('Apa perbedaan PHP dan Python?');
  assert.ok(response.length > 20);
});

test('Section 24: "Buatkan algoritma sederhana." (Algorithm / Logic Reasoning)', () => {
  const cm = createDefaultContextManager();
  const intent = cm.classifyIntent('Buatkan algoritma sederhana.');
  assert.equal(intent.type, 'coding');
});

test('Section 24: "Jelaskan sejarah internet." (History & Technology)', () => {
  const response = generateFreeSmartResponse('Jelaskan sejarah internet.');
  assert.ok(response.length > 20);
});

test('Section 24: Multi-Turn Context ("Yang tadi maksudnya apa?" & "Lanjutkan.")', () => {
  const cm = createDefaultContextManager();
  const history = [
    { role: 'user', content: 'Jelaskan konsep event loop di Node.js' },
    { role: 'assistant', content: 'Event loop di Node.js menangani operasi I/O asinkron dengan single-threaded execution model.' },
  ];

  const resolvedTadi = cm.resolveReferences('Yang tadi maksudnya apa?', history);
  assert.ok(resolvedTadi.contextHint);
  assert.ok(resolvedTadi.contextHint.includes('event loop di Node.js'));

  const resolvedLanjut = cm.resolveReferences('Lanjutkan.', history);
  assert.ok(resolvedLanjut.contextHint);
  assert.ok(resolvedLanjut.contextHint.includes('event loop di Node.js'));
});

test('Section 24: "Kalau menggunakan cara lain bagaimana?" (Alternative Approaches)', () => {
  const cm = createDefaultContextManager();
  const intent = cm.classifyIntent('Kalau menggunakan cara lain bagaimana?');
  assert.equal(intent.type, 'correction');
});

test('Section 24: "Informasi terbaru hari ini." (Web Search Routing)', () => {
  const cm = createDefaultContextManager();
  const intent = cm.classifyIntent('Informasi terbaru hari ini.');
  assert.equal(intent.type, 'web_search');
});

test('Section 24: "Kenapa kode saya error?" (Troubleshooting & Debugging Reasoner)', () => {
  const cm = createDefaultContextManager();
  const intent = cm.classifyIntent('Kenapa kode saya error?');
  assert.equal(intent.type, 'coding');
});

test('Section 24: "Analisis file project saya." (File Search & Read Tool Intelligence)', async () => {
  const registry = createDefaultToolRegistry();
  const permissions = new Set(['file:read', 'file:search']);

  // 1. Search files
  const searchRes = await registry.execute('file_search', { query: 'package.json' }, { permissions });
  assert.equal(searchRes.ok, true);
  assert.ok(Array.isArray(searchRes.result.files));

  // 2. Read project file
  const readRes = await registry.execute('read_project_file', { filePath: 'package.json' }, { permissions });
  assert.equal(readRes.ok, true);
  assert.ok(readRes.result.content.includes('varisai') || readRes.result.content.includes('name'));
});

test('Section 18 & 24: Multilingual Natural Handling', async () => {
  const mockEngine = {
    respond: async ({ userMessage }) => {
      if (/what is|explain|hello/i.test(userMessage)) {
        return { text: 'Artificial Intelligence simulates human reasoning and learning processes.', model: 'gpt-4o-mini' };
      }
      return { text: 'Kecerdasan buatan meniru proses penalaran manusia.', model: 'gpt-4o-mini' };
    },
  };

  const agent = createAgentSystem({
    engine: mockEngine,
    registry: createDefaultToolRegistry(),
  });

  const engResult = await agent.run({ userMessage: 'What is AI in simple terms?' });
  assert.ok(engResult.text.includes('Artificial Intelligence'));

  const idResult = await agent.run({ userMessage: 'Jelaskan AI dengan sederhana.' });
  assert.ok(idResult.text.includes('Kecerdasan buatan'));
});
