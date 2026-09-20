import { createRepositories } from '../src/repositories.mjs';
import { hashSessionToken } from '../src/security.mjs';
import { loadConfig } from '../src/config.mjs';
import { createPool } from '../src/db.mjs';
import { generateFreeSmartResponse } from '../src/free-ai-engine.mjs';
import { createAIProviderFromConfig } from '../src/ai-providers.mjs';
import { createDefaultContextManager } from '../src/context-manager.mjs';
import { createDefaultToolRegistry } from '../src/tool-system.mjs';
import { createAgentSystem } from '../src/agent-system.mjs';

let reposInstance = null;
let agentInstance = null;

function getContext() {
  const config = loadConfig();
  if (!reposInstance) {
    const pool = createPool(config);
    reposInstance = createRepositories(pool);
  }
  if (!agentInstance) {
    const engine = createAIProviderFromConfig(config);
    const registry = createDefaultToolRegistry();
    agentInstance = createAgentSystem({ engine, registry });
  }
  return { repository: reposInstance, agent: agentInstance, config };
}

async function parseBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const str = Buffer.concat(chunks).toString();
  return str ? JSON.parse(str) : {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } }));
  }

  try {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/varis_session=([^;]+)/);
    const rawToken = match ? match[1] : null;

    const { repository, agent, config } = getContext();
    let user = null;

    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken);
      const session = await repository.findSessionByTokenHash(tokenHash);
      if (session) {
        user = await repository.findUserById(session.user_id);
      }
    }

    if (!user) {
      user = { id: 'guest-session', name: 'Guest User', email: 'guest@varis.ai' };
    }

    const body = await parseBody(req);
    const { message, model = 'auto', conversation_id = null } = body;

    if (!message || typeof message !== 'string') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'INVALID_MESSAGE', message: 'Message is required' } }));
    }

    let replyText = '';
    let modelUsed = model;
    try {
      const agentRes = await agent.run({
        userMessage: message,
        userId: user.id,
        model: model,
      });
      replyText = agentRes.text || agentRes.answer || agentRes.response || '';
      modelUsed = agentRes.modelUsed || agentRes.model || model;
    } catch (err) {
      replyText = generateFreeSmartResponse(message);
    }

    if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
      replyText = generateFreeSmartResponse(message);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      reply: replyText.trim(),
      response: replyText.trim(),
      model: modelUsed,
      credits_used: 3,
      credits_remaining: 97,
    }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: err.message } }));
  }
}
