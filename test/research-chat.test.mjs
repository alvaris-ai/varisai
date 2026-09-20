import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import aiChatHandler from '../api/ai/chat.js';
import chatHandler from '../api/chat.js';
import {
  ProviderHealthService,
  ModelRouter,
  ResponseValidator,
  createSmartLocalProvider,
  createGeminiProvider,
  createOpenAIProvider,
  createGroqProvider,
} from '../src/ai-providers.mjs';
import { createRepositories } from '../src/repositories.mjs';

function createMockReqRes({ body, headers = {} }) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.headers = { 'content-type': 'application/json', ...headers };
  req.body = body;

  const res = {
    statusCode: 200,
    headers: {},
    writtenData: '',
    ended: false,
    writeHead(status, headers) {
      this.statusCode = status;
      Object.assign(this.headers, headers);
    },
    write(chunk) {
      this.writtenData += chunk;
    },
    end(chunk) {
      if (chunk) this.writtenData += chunk;
      this.ended = true;
    },
  };

  return { req, res };
}

test('POST /api/ai/chat: SSE Streaming with requestId, Real Web Research, and Sources', async () => {
  const { req, res } = createMockReqRes({
    body: {
      message: 'Siapa presiden Indonesia saat ini?',
      stream: true,
      mode: 'always',
      model: 'auto',
    },
    headers: {
      accept: 'text/event-stream',
    },
  });

  await aiChatHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/event-stream; charset=utf-8');
  assert.ok(res.writtenData.includes('event: search_status'));
  assert.ok(res.writtenData.includes('event: sources'));
  assert.ok(res.writtenData.includes('event: token'));
  assert.ok(res.writtenData.includes('event: done'));

  // Verify unique requestId format (varis_req_...)
  const doneMatch = res.writtenData.match(/event: done\ndata: (\{.*\})\n\n/);
  assert.ok(doneMatch, 'Should contain event: done');
  const donePayload = JSON.parse(doneMatch[1]);
  assert.ok(donePayload.requestId && donePayload.requestId.startsWith('varis_req_'));
  assert.equal(donePayload.search_mode, 'always');
  assert.ok(Array.isArray(donePayload.sources));
});

test('POST /api/ai/chat: Multi-turn Context Resolution and File Attachments', async () => {
  const repos = createRepositories(null);
  const user = await repos.createUser({ name: 'Dev Tester', email: 'dev@varis.ai' });
  const conv = await repos.createConversation(user.id, 'Context Test');

  // Insert previous message to test anaphora resolution
  await repos.createMessage(user.id, conv.id, 'user', 'Siapa penemu bahasa pemrograman Python?');
  await repos.createMessage(user.id, conv.id, 'assistant', 'Penemu Python adalah Guido van Rossum, programmer asal Belanda.');

  const { req, res } = createMockReqRes({
    body: {
      conversationId: conv.id,
      message: 'Dia lahir di mana?',
      attachments: [
        {
          filename: 'notes.txt',
          content: 'Guido van Rossum lahir di Haarlem, Belanda pada 31 Januari 1956.',
          mimeType: 'text/plain',
        },
      ],
      stream: false,
      mode: 'offline',
    },
  });

  await aiChatHandler(req, res);

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.writtenData);
  assert.equal(data.status, 'success');
  assert.ok(data.requestId && data.requestId.startsWith('varis_req_'));
  assert.ok(data.reply || data.response);
});

test('POST /api/chat: Backwards compatibility alias routes to aiChatHandler', async () => {
  const { req, res } = createMockReqRes({
    body: {
      message: 'Hitung 100 ditambah 250',
      search_mode: 'offline',
      stream: false,
    },
  });

  await chatHandler(req, res);

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.writtenData);
  assert.equal(data.status, 'success');
  assert.ok(data.reply || data.response);
  assert.ok(data.requestId);
});

test('ProviderHealthService & ModelRouter & ResponseValidator', async () => {
  const localProvider = createSmartLocalProvider();
  const healthService = new ProviderHealthService([localProvider]);
  const health = await healthService.checkAll();
  assert.ok(health.smart_local);
  assert.equal(health.smart_local.status, 'available');

  const router = new ModelRouter([localProvider]);
  const routed = router.route({ model: 'auto', message: 'Hello' });
  assert.ok(routed.provider);

  // ResponseValidator
  const validRes = ResponseValidator.validate({ text: 'Jawaban yang tepat' });
  assert.equal(validRes.valid, true);

  const invalidRes = ResponseValidator.validate({ text: '' });
  assert.equal(invalidRes.valid, false);

  const grounding = ResponseValidator.checkGrounding('Menurut [Wikipedia](https://id.wikipedia.org/wiki/Indonesia), Indonesia adalah...', [
    { title: 'Indonesia', domain: 'id.wikipedia.org', url: 'https://id.wikipedia.org/wiki/Indonesia' }
  ]);
  assert.equal(grounding.grounded, true);
  assert.equal(grounding.hasMarkdownLinks, true);
});

test('Repositories: Research Sessions, Search Results, and Model Usage persistence', async () => {
  const repos = createRepositories(null);
  const user = await repos.createUser({ name: 'Researcher', email: 'researcher@varis.ai' });
  const conv = await repos.createConversation(user.id, 'Research Log');

  // 1. Research Session
  const session = await repos.createResearchSession({
    userId: user.id,
    conversationId: conv.id,
    query: 'Perkembangan AI 2026',
    searchMode: 'always',
  });
  assert.ok(session.id.startsWith('rs_'));
  assert.equal(session.status, 'in_progress');

  // 2. Search Results
  const results = await repos.createSearchResults(session.id, [
    {
      title: 'AI Milestones 2026',
      url: 'https://techcrunch.com/2026/ai-milestones',
      domain: 'techcrunch.com',
      snippet: 'Breakthroughs in autonomous agent reasoning in 2026.',
      relevanceScore: 0.96,
    },
  ]);
  assert.equal(results.length, 1);
  const fetchedResults = await repos.getSearchResults(session.id);
  assert.equal(fetchedResults.length, 1);
  assert.equal(fetchedResults[0].title, 'AI Milestones 2026');

  // 3. Complete Research Session
  const completed = await repos.completeResearchSession(session.id, {
    sourcesCount: 1,
    latencyMs: 120,
    status: 'completed',
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.sources_count, 1);

  // 4. Model Usage Record
  const usage = await repos.recordModelUsage({
    userId: user.id,
    conversationId: conv.id,
    requestId: 'varis_req_test123',
    modelId: 'gemini-2.0-flash',
    provider: 'google',
    inputTokens: 120,
    outputTokens: 80,
    latencyMs: 340,
    status: 'success',
  });
  assert.equal(usage.request_id, 'varis_req_test123');
  assert.equal(usage.total_tokens, 200);

  const fetchedUsage = await repos.getModelUsage('varis_req_test123');
  assert.equal(fetchedUsage.model_id, 'gemini-2.0-flash');

  // 5. Create Message with metadata
  const msg = await repos.createMessage(user.id, conv.id, 'assistant', 'Hasil riset AI 2026...', {
    requestId: 'varis_req_test123',
    inputTokens: 120,
    outputTokens: 80,
    latencyMs: 340,
    researchSessionId: session.id,
    sourceIds: [results[0].id],
  });
  assert.equal(msg.request_id, 'varis_req_test123');
  assert.equal(msg.research_session_id, session.id);
  assert.equal(msg.total_tokens, 200);
});
