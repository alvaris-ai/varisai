import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ConversationContextManager,
  ConversationTopicTracker,
  ResponseRelevanceValidator,
} from '../src/context-manager.mjs';
import { generateFreeSmartResponse, tryEvaluateMath } from '../src/free-ai-engine.mjs';
import { isConversationalOrNonSearch } from '../api/ai/chat.js';

test('Context Intelligence: isConversationalOrNonSearch suppresses unnecessary web queries', () => {
  assert.equal(isConversationalOrNonSearch('hallo'), true);
  assert.equal(isConversationalOrNonSearch('Halo VARIS'), true);
  assert.equal(isConversationalOrNonSearch('Siapa kamu?'), true);
  assert.equal(isConversationalOrNonSearch('Namaku Al.'), true);
  assert.equal(isConversationalOrNonSearch('Berapa 25 x 48?'), true);
  assert.equal(isConversationalOrNonSearch('Bagaimana supaya dia pintar?'), true);
  assert.equal(isConversationalOrNonSearch('Tambahkan GPT.'), true);
  assert.equal(isConversationalOrNonSearch('Bukan itu maksudku.'), true);
  assert.equal(isConversationalOrNonSearch('Kenapa kodeku error?'), true);

  // Real search queries SHOULD trigger search
  assert.equal(isConversationalOrNonSearch('Siapa presiden Indonesia saat ini?'), false);
  assert.equal(isConversationalOrNonSearch('Berapa populasi penduduk Indonesia tahun 2026?'), false);
  assert.equal(isConversationalOrNonSearch('Berita teknologi terkini hari ini'), false);
});

test('Context Intelligence: Entity Extraction from Multi-turn History', () => {
  const manager = new ConversationContextManager();
  const history = [
    { role: 'user', content: 'Halo, namaku Al.' },
    { role: 'assistant', content: 'Halo Al! Senang berkenalan denganmu.' },
    { role: 'user', content: 'Aku sedang membuat website AI.' },
    { role: 'assistant', content: 'Keren! Mau dinamakan apa?' },
    { role: 'user', content: 'Namanya VARIS.' },
    { role: 'assistant', content: 'Nama yang mantap! Dibuat pakai apa?' },
    { role: 'user', content: 'PHP dan Node.js.' }
  ];

  const entities = manager.extractEntitiesFromHistory(history);
  assert.equal(entities.userName, 'Al');
  assert.equal(entities.projectName, 'VARIS');
  assert.equal(entities.aiName, 'VARIS');
  assert.equal(entities.projectType, 'Website AI');
  assert.ok(entities.technologies.includes('PHP'));
});

test('Context Intelligence: Intent Classification for All 18 Intent Types', () => {
  const manager = new ConversationContextManager();

  assert.equal(manager.classifyIntent('Halo VARIS').type, 'small_talk');
  assert.equal(manager.classifyIntent('Siapa kamu?').type, 'identity');
  assert.equal(manager.classifyIntent('Namaku Al').type, 'user_name');
  assert.equal(manager.classifyIntent('Apa yang bisa kamu lakukan?').type, 'capabilities');
  assert.equal(manager.classifyIntent('Aku sedang membuat website AI').type, 'project_context');
  assert.equal(manager.classifyIntent('Namanya VARIS').type, 'entity_naming');
  assert.equal(manager.classifyIntent('Bagaimana supaya dia pintar?').type, 'follow_up_reasoning');
  assert.equal(manager.classifyIntent('Tambahkan GPT').type, 'action_addition');
  assert.equal(manager.classifyIntent('Kalau yang kedua bagaimana?').type, 'referential_choice');
  assert.equal(manager.classifyIntent('Jelaskan lagi').type, 'explanation_request');
  assert.equal(manager.classifyIntent('Bukan itu maksudku').type, 'correction_repair');
  assert.equal(manager.classifyIntent('Ngomong-ngomong, laptop bagus untuk coding apa?').type, 'topic_switch');
  assert.equal(manager.classifyIntent('Balik ke VARIS tadi').type, 'topic_recall');
  assert.equal(manager.classifyIntent('Berapa 25 x 48?').type, 'calculation');
  assert.equal(manager.classifyIntent('Kenapa kodeku error?').type, 'debugging_query');
  assert.equal(manager.classifyIntent('Singkat aja').type, 'shorten_request');
  assert.equal(manager.classifyIntent('Buat lebih sederhana').type, 'simplification_request');
  assert.equal(manager.classifyIntent('Bagaimana cuaca hari ini?').type, 'weather');
});

test('Context Intelligence: Topic Tracker handles Switches and Recalls', () => {
  const tracker = new ConversationTopicTracker();
  assert.equal(tracker.currentTopic, 'General Conversation');

  // Switch to Hardware
  const res1 = tracker.detectTopicSwitch('Ngomong-ngomong, laptop bagus untuk coding apa?');
  assert.equal(res1.isSwitch, true);
  tracker.updateTopic('Hardware & Laptop');
  assert.equal(tracker.currentTopic, 'Hardware & Laptop');
  assert.equal(tracker.previousTopic, 'General Conversation');

  // Recall previous topic
  const res2 = tracker.detectTopicSwitch('Balik ke VARIS tadi');
  assert.equal(res2.isRecall, true);
  const recalled = tracker.recallPreviousTopic();
  assert.equal(recalled, 'General Conversation');
});

test('Context Intelligence: Anaphora and Reference Resolution', () => {
  const manager = new ConversationContextManager();
  const history = [
    { role: 'user', content: 'Aku sedang membuat website AI. Namanya VARIS.' },
    {
      role: 'assistant',
      content: 'Keren! Berikut langkah membuatnya pintar:\n1. Integrasi API\n2. Sistem Context & Memory Management\n3. Tool Calling'
    }
  ];

  // Resolve "dia"
  const ref1 = manager.resolveReferences('Bagaimana supaya dia pintar?', history);
  assert.equal(ref1.entityResolved, 'VARIS');
  assert.ok(ref1.contextHint.includes('VARIS'));

  // Resolve "yang kedua"
  const ref2 = manager.resolveReferences('Yang kedua bagaimana?', history);
  assert.ok(ref2.entityResolved.toLowerCase().includes('context'));

  // Resolve "Tambahkan GPT"
  const ref3 = manager.resolveReferences('Tambahkan GPT', history);
  assert.ok(ref3.contextHint.includes('OpenAI GPT'));
});

test('Context Intelligence: Response Relevance Validator', () => {
  // Math output validation
  const mathValid = ResponseRelevanceValidator.validate({
    userMessage: 'Berapa 25 x 48?',
    intent: { type: 'calculation' },
    responseText: 'Hasil perhitungannya adalah 1200.'
  });
  assert.equal(mathValid.isRelevant, true);

  const mathInvalid = ResponseRelevanceValidator.validate({
    userMessage: 'Berapa 25 x 48?',
    intent: { type: 'calculation' },
    responseText: 'Matematika adalah ilmu yang sangat penting dalam kehidupan.'
  });
  assert.equal(mathInvalid.isRelevant, false);
  assert.equal(mathInvalid.reason, 'MATH_RESULT_MISSING');

  // Identity validation
  const idValid = ResponseRelevanceValidator.validate({
    userMessage: 'Siapa kamu?',
    intent: { type: 'identity' },
    responseText: 'Saya VARIS AI, asisten kecerdasan buatan.'
  });
  assert.equal(idValid.isRelevant, true);
});

test('Context Intelligence: 15 Core Scenarios Sequential Simulation (Section 37)', () => {
  const history = [];

  function chat(userMsg) {
    const reply = generateFreeSmartResponse(userMsg, history);
    history.push({ role: 'user', content: userMsg });
    history.push({ role: 'assistant', content: reply });
    return reply;
  }

  // TEST 1: "Halo" and "hallo"
  const r1 = chat('Halo');
  assert.ok(r1.toLowerCase().includes('halo') || r1.toLowerCase().includes('senang'));
  assert.ok(r1.length < 250);

  const rHallo = chat('hallo');
  assert.ok(rHallo.toLowerCase().includes('halo') || rHallo.toLowerCase().includes('senang'));
  assert.ok(!rHallo.includes('Hallo Bandoeng'));
  assert.ok(!rHallo.includes('topik yang menarik'));

  // TEST 2: "Siapa kamu?"
  const r2 = chat('Siapa kamu?');
  assert.ok(r2.toLowerCase().includes('varis'));

  // TEST 3: "Namaku Al."
  const r3 = chat('Namaku Al.');
  assert.ok(r3.includes('Al'));

  // TEST 4: "Apa yang bisa kamu lakukan?"
  const r4 = chat('Apa yang bisa kamu lakukan?');
  assert.ok(r4.toLowerCase().includes('coding') || r4.toLowerCase().includes('riset') || r4.toLowerCase().includes('bantu'));

  // TEST 5: "Aku sedang membuat website AI."
  const r5 = chat('Aku sedang membuat website AI.');
  assert.ok(r5.toLowerCase().includes('website ai') || r5.toLowerCase().includes('arsitektur'));

  // TEST 6: "Namanya VARIS."
  const r6 = chat('Namanya VARIS.');
  assert.ok(r6.includes('VARIS'));

  // TEST 7: "Bagaimana supaya dia pintar?"
  const r7 = chat('Bagaimana supaya dia pintar?');
  assert.ok(r7.includes('VARIS'));
  assert.ok(r7.toLowerCase().includes('context') || r7.toLowerCase().includes('api') || r7.toLowerCase().includes('model'));

  // TEST 8: "Tambahkan GPT."
  const r8 = chat('Tambahkan GPT.');
  assert.ok(r8.toLowerCase().includes('gpt') || r8.toLowerCase().includes('openai'));
  assert.ok(r8.includes('VARIS'));

  // TEST 9: "Yang kedua bagaimana?"
  const r9 = chat('Yang kedua bagaimana?');
  assert.ok(r9.toLowerCase().includes('context') || r9.toLowerCase().includes('memory') || r9.toLowerCase().includes('kedua'));

  // TEST 10: "Jelaskan lagi."
  const r10 = chat('Jelaskan lagi.');
  assert.ok(r10.toLowerCase().includes('payload') || r10.toLowerCase().includes('context') || r10.toLowerCase().includes('detail'));

  // TEST 11: "Bukan itu maksudku."
  const r11 = chat('Bukan itu maksudku.');
  assert.ok(r11.toLowerCase().includes('maaf') || r11.toLowerCase().includes('luruskan') || r11.toLowerCase().includes('maksud'));

  // TEST 12: "Ngomong-ngomong, laptop bagus untuk coding apa?"
  const r12 = chat('Ngomong-ngomong, laptop bagus untuk coding apa?');
  assert.ok(r12.toLowerCase().includes('macbook') || r12.toLowerCase().includes('thinkpad') || r12.toLowerCase().includes('ram'));

  // TEST 13: "Balik ke VARIS tadi."
  const r13 = chat('Balik ke VARIS tadi.');
  assert.ok(r13.includes('VARIS'));
  assert.ok(r13.toLowerCase().includes('kembali') || r13.toLowerCase().includes('lanjut'));

  // TEST 14: "Berapa 25 x 48?"
  const r14 = chat('Berapa 25 x 48?');
  assert.ok(r14.includes('1200') || r14.includes('1.200'));

  // TEST 15: "Kenapa kodeku error?"
  const r15 = chat('Kenapa kodeku error?');
  assert.ok(r15.toLowerCase().includes('kode') && (r15.toLowerCase().includes('error') || r15.toLowerCase().includes('log')));
});
