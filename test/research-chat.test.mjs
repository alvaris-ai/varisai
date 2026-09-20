import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import handler from '../api/chat.js';

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

test('Chat API: SSE Streaming with Real Web Research Mode (always search)', async () => {
  const { req, res } = createMockReqRes({
    body: {
      message: 'Siapa presiden Indonesia saat ini?',
      stream: true,
      search_mode: 'always',
      model: 'auto',
    },
    headers: {
      accept: 'text/event-stream',
    },
  });

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/event-stream; charset=utf-8');
  assert.ok(res.writtenData.includes('event: search_status'));
  assert.ok(res.writtenData.includes('event: sources'));
  assert.ok(res.writtenData.includes('event: token'));
  assert.ok(res.writtenData.includes('event: done'));

  // Verify sources payload in stream
  const sourcesMatch = res.writtenData.match(/event: sources\ndata: (\{.*\})\n\n/);
  assert.ok(sourcesMatch, 'Should contain event: sources');
  const sourcesPayload = JSON.parse(sourcesMatch[1]);
  assert.ok(Array.isArray(sourcesPayload.sources));
  assert.equal(sourcesPayload.search_mode, 'always');
});

test('Chat API: SSE Streaming with Offline Mode skips search', async () => {
  const { req, res } = createMockReqRes({
    body: {
      message: 'Hitung 50 dikali 4',
      stream: true,
      search_mode: 'offline',
      model: 'auto',
    },
    headers: {
      accept: 'text/event-stream',
    },
  });

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(!res.writtenData.includes('event: search_status'), 'Should not emit search_status in offline mode');
  assert.ok(!res.writtenData.includes('event: sources'), 'Should not emit sources in offline mode');
  assert.ok(res.writtenData.includes('event: token'));
  assert.ok(res.writtenData.includes('event: done'));
});

test('Chat API: Non-streaming JSON response contains verified sources', async () => {
  const { req, res } = createMockReqRes({
    body: {
      message: 'Ibukota Indonesia',
      stream: false,
      search_mode: 'always',
      model: 'auto',
    },
  });

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.writtenData);
  assert.equal(data.status, 'success');
  assert.ok(data.reply || data.response);
  assert.ok(Array.isArray(data.sources));
  assert.equal(data.search_mode, 'always');
});
