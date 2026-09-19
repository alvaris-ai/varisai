import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultToolRegistry, calculator } from '../src/tool-system.mjs';

test('Calculator: handles unicode multiplication (×), division (÷), and complex expressions', () => {
  // Requirement #29 scenario: 12345 × 678
  const res1 = calculator({ expression: '12345 × 678' });
  assert.equal(res1.value, 8369910);

  // x symbol
  const res2 = calculator({ expression: '123456 x 789' });
  assert.equal(res2.value, 97406784);

  // ÷ symbol
  const res3 = calculator({ expression: '100 ÷ 4' });
  assert.equal(res3.value, 25);

  // Parentheses and order of operations
  const res4 = calculator({ expression: '(10 + 5) × (20 - 4) ÷ 2' });
  assert.equal(res4.value, 120);

  // Power operation
  const res5 = calculator({ expression: '2 ** 8' });
  assert.equal(res5.value, 256);
});

test('current_datetime tool: returns formatted Indonesian date and time', async () => {
  const fixedDate = new Date('2026-09-18T10:30:00Z');
  const registry = createDefaultToolRegistry({ now: () => fixedDate });

  const result = await registry.execute(
    'current_datetime',
    { timezone: 'Asia/Jakarta' },
    { permissions: new Set(['datetime:read']), now: () => fixedDate }
  );

  assert.equal(result.ok, true);
  assert.equal(result.result.timezone, 'Asia/Jakarta');
  assert.ok(result.result.formatted);
  assert.ok(result.result.iso);
});

test('weather tool: retrieves live or structured fallback weather data without crashing', async () => {
  const registry = createDefaultToolRegistry();

  const result = await registry.execute(
    'weather',
    { location: 'Bandung' },
    { permissions: new Set(['weather:read']) }
  );

  assert.equal(result.ok, true);
  assert.equal(result.result.location, 'Bandung');
  assert.ok(result.result.temperature_c);
  assert.ok(result.result.condition);
});

test('web_search tool: performs Wikipedia search and returns structured items or fallback', async () => {
  const registry = createDefaultToolRegistry();

  const result = await registry.execute(
    'web_search',
    { query: 'Indonesia' },
    { permissions: new Set(['web:search']) }
  );

  assert.equal(result.ok, true);
  assert.equal(result.result.query, 'Indonesia');
  assert.ok(Array.isArray(result.result.results));
});

test('memory_search tool: queries long-term user memories via context', async () => {
  const registry = createDefaultToolRegistry();

  const mockMemories = [
    { id: 'mem-1', text: 'Pengguna menyukai tema gelap (dark mode)', score: 0.9 },
    { id: 'mem-2', text: 'Pengguna adalah seorang web developer', score: 0.8 },
  ];

  const result = await registry.execute(
    'memory_search',
    { query: 'developer' },
    {
      permissions: new Set(['memory:read']),
      searchMemories: async (query) => {
        return mockMemories.filter(m => m.text.toLowerCase().includes(query.toLowerCase()));
      },
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.result.results.length, 1);
  assert.equal(result.result.results[0].id, 'mem-2');
});
