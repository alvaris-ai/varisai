import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextManager, createDefaultContextManager } from '../src/context-manager.mjs';

test('ContextManager: intent classification covers all required categories', () => {
  const cm = createDefaultContextManager();

  // Calculation
  assert.equal(cm.classifyIntent('Berapa 12345 × 678?').type, 'calculation');
  assert.equal(cm.classifyIntent('Hitung 50 + 25').type, 'calculation');

  // Weather
  assert.equal(cm.classifyIntent('Cuaca hari ini bagaimana?').type, 'weather');
  assert.equal(cm.classifyIntent('Apakah di Jakarta hujan?').type, 'weather');

  // Web Search
  assert.equal(cm.classifyIntent('Siapa presiden Indonesia saat ini?').type, 'web_search');
  assert.equal(cm.classifyIntent('Berita terbaru hari ini').type, 'web_search');

  // Follow-up
  assert.equal(cm.classifyIntent('Dia lahir tahun berapa?').type, 'follow_up');
  assert.equal(cm.classifyIntent('Yang tadi maksudnya apa?').type, 'follow_up');
  assert.equal(cm.classifyIntent('Lanjutkan penjelasan tadi.').type, 'follow_up');
  assert.equal(cm.classifyIntent('Bedanya apa?').type, 'follow_up');

  // Correction
  assert.equal(cm.classifyIntent('Jangan pakai cara tadi, gunakan cara lain.').type, 'correction');
  assert.equal(cm.classifyIntent('Kenapa jawabanmu sebelumnya salah?').type, 'correction');

  // Coding
  assert.equal(cm.classifyIntent('Buatkan kode login dengan JavaScript.').type, 'coding');
  assert.equal(cm.classifyIntent('Jelaskan perbedaan PHP dan JavaScript.').type, 'coding');

  // Small Talk
  assert.equal(cm.classifyIntent('Halo VARIS, apa kabar?').type, 'small_talk');
});

test('ContextManager: resolves anaphora (dia, yang tadi, bedanya apa)', () => {
  const cm = createDefaultContextManager();
  const history = [
    { role: 'user', content: 'Siapa presiden Indonesia pertama?' },
    { role: 'assistant', content: 'Presiden pertama Indonesia adalah Ir. Soekarno, proklamator kemerdekaan 1945.' },
  ];

  // "Dia lahir tahun berapa?"
  const resolvedDia = cm.resolveReferences('Dia lahir tahun berapa?', history);
  assert.ok(resolvedDia.contextHint);
  assert.ok(resolvedDia.contextHint.includes('Soekarno'));

  // "Yang tadi maksudnya apa?"
  const resolvedTadi = cm.resolveReferences('Yang tadi maksudnya apa?', history);
  assert.ok(resolvedTadi.contextHint);
  assert.ok(resolvedTadi.contextHint.includes('Siapa presiden Indonesia pertama?'));
});

test('ContextManager: builds compact context window and rolling summary for long histories', () => {
  const cm = new ContextManager({ maxRecentMessages: 3 });
  const longHistory = [
    { role: 'user', content: 'buat website sekolah' },
    { role: 'assistant', content: 'Siap, ini struktur awal website sekolah.' },
    { role: 'user', content: 'buat lebih modern' },
    { role: 'assistant', content: 'Tampilan sudah dimodernisasi dengan Tailwind CSS.' },
    { role: 'user', content: 'tambahkan login' },
    { role: 'assistant', content: 'Fitur autentikasi login sudah ditambahkan.' },
  ];

  const result = cm.buildOptimizedContext({
    history: longHistory,
    currentUserMessage: 'yang tadi jangan dihapus',
    projectState: { goal: 'Website Sekolah Modern', decisions: ['Tailwind CSS', 'Auth Login'] },
  });

  // Check rolling summary
  const summaryMsg = result.context.find(c => c.role === 'system' && c.content.includes('Ringkasan percakapan sebelumnya'));
  assert.ok(summaryMsg);
  assert.ok(summaryMsg.content.includes('website sekolah'));

  // Check project context
  const projectMsg = result.context.find(c => c.role === 'system' && c.content.includes('Active Project Context'));
  assert.ok(projectMsg);
  assert.ok(projectMsg.content.includes('Website Sekolah Modern'));

  // Verify recent messages are kept
  const recentUserMsgs = result.context.filter(c => c.role === 'user');
  assert.ok(recentUserMsgs.length >= 1);
});
