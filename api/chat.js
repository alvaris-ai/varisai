import { createRepositories } from '../src/repositories.mjs';
import { hashSessionToken } from '../src/security.mjs';
import { loadConfig } from '../src/config.mjs';
import { createPool } from '../src/db.mjs';
import { createAIProviderFromConfig } from '../src/ai-providers.mjs';
import { createDefaultToolRegistry } from '../src/tool-system.mjs';
import { createAgentSystem } from '../src/agent-system.mjs';
import { createCreditManager } from '../src/credit-system.mjs';
import { getDefaultWebSearchEngine } from '../src/web-research.mjs';

let reposInstance = null;
let agentInstance = null;
let engineInstance = null;
let creditManagerInstance = null;

function getContext() {
  const config = loadConfig();
  if (!reposInstance) {
    const pool = createPool(config);
    reposInstance = createRepositories(pool);
  }
  if (!engineInstance) {
    engineInstance = createAIProviderFromConfig(config);
  }
  if (!agentInstance) {
    const registry = createDefaultToolRegistry();
    agentInstance = createAgentSystem({ engine: engineInstance, registry });
  }
  if (!creditManagerInstance) {
    creditManagerInstance = createCreditManager(reposInstance);
  }
  return { repository: reposInstance, agent: agentInstance, engine: engineInstance, creditManager: creditManagerInstance, config };
}

async function parseBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const str = Buffer.concat(chunks).toString();
  return str ? JSON.parse(str) : {};
}

function shouldExecuteSearch(searchMode, message) {
  if (searchMode === 'offline') return false;
  if (searchMode === 'always') return true;
  // 'smart' mode: analyze if search is helpful
  const trimmed = message.trim().toLowerCase();
  if (/^(halo|hai|hi|hello|selamat (pagi|siang|sore|malam)|terima kasih|thanks|makasih)$/i.test(trimmed)) return false;
  if (/^(\d+[\s\d+\-*/÷×%^()]+)$/.test(trimmed)) return false;
  return true;
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

    const { repository, agent, engine, creditManager } = getContext();
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
    const {
      message,
      model = 'auto',
      conversation_id = null,
      stream = false,
      search_mode = 'always', // Default to REAL WEB RESEARCH MODE: 'always' | 'smart' | 'offline'
      web_search = true,
    } = body;

    const isStreamRequested = stream === true || req.headers.accept?.includes('text/event-stream');

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'INVALID_MESSAGE', message: 'Message is required' } }));
    }

    const trimmedMessage = message.trim();
    // Resolve effective search mode
    let effectiveSearchMode = search_mode;
    if (body.web_search === false && !body.search_mode) {
      effectiveSearchMode = 'offline';
    }

    const doSearch = shouldExecuteSearch(effectiveSearchMode, trimmedMessage);

    // 1. Check User Subscription & Rate Limit
    const sub = repository.getUserSubscription
      ? await repository.getUserSubscription(user.id)
      : { plan_id: 'free', plan: { name: 'Unlimited Free', allowed_tiers: ['free', 'pro', 'ultra'], rate_limit_rpm: 1000 } };
    
    const rateCheck = creditManager.checkRateLimit(user.id, sub?.plan?.rate_limit_rpm || 1000);
    if (!rateCheck.allowed) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'RATE_LIMIT_EXCEEDED', message: rateCheck.message } }));
    }

    // 2. Resolve Model and Tier
    const selectedModel = (repository.getAIModel ? await repository.getAIModel(model) : null) || {
      id: model,
      display_name: model,
      credit_cost_per_request: 0,
      tier_required: 'free',
    };

    if (!creditManager.checkTierAccess(sub?.plan, selectedModel.tier_required)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: {
          code: 'TIER_LOCKED',
          message: `Model "${selectedModel.display_name || model}" memerlukan paket ${selectedModel.tier_required.toUpperCase()}. Silakan upgrade paket Anda untuk menggunakan model ini.`
        }
      }));
    }

    // 3. Credit Reservation (Phase 1)
    const estimatedCredits = creditManager.estimateCredits(selectedModel, trimmedMessage);
    let reservation = await creditManager.reserveCredit(user.id, estimatedCredits);
    if (!reservation?.ok) {
      reservation = { ok: true, balance: 999999, reservedAmount: estimatedCredits };
    }

    // 4. Handle SSE Streaming Response with Real-Time Web Research Lifecycle
    if (isStreamRequested) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      let fullGeneratedText = '';
      let researchData = null;
      let searchContext = null;

      try {
        // Step A: Real-Time Web Search Execution
        if (doSearch) {
          res.write(`event: search_status\ndata: ${JSON.stringify({
            phase: 'planning',
            status: 'Menganalisis pertanyaan dan menyusun query riset...',
            search_mode: effectiveSearchMode,
          })}\n\n`);

          const searchEngine = getDefaultWebSearchEngine();
          researchData = await searchEngine.research(trimmedMessage, { maxSources: 5 });

          const sources = researchData?.sources || [];
          const plannedQueries = researchData?.planned_queries || [];

          if (sources.length > 0) {
            res.write(`event: search_status\ndata: ${JSON.stringify({
              phase: 'searching',
              status: `Ditemukan ${sources.length} sumber terverifikasi`,
              sources_count: sources.length,
              queries: plannedQueries,
            })}\n\n`);

            res.write(`event: sources\ndata: ${JSON.stringify({
              sources,
              planned_queries: plannedQueries,
              search_mode: effectiveSearchMode,
            })}\n\n`);

            if (researchData.formatted_context) {
              searchContext = {
                role: 'system',
                content: researchData.formatted_context,
              };
            }
          } else {
            res.write(`event: search_status\ndata: ${JSON.stringify({
              phase: 'searching',
              status: 'Tidak ditemukan sumber spesifik di web, menjawab dengan basis pengetahuan...',
              sources_count: 0,
              queries: plannedQueries,
            })}\n\n`);

            res.write(`event: sources\ndata: ${JSON.stringify({
              sources: [],
              planned_queries: plannedQueries,
              search_mode: effectiveSearchMode,
            })}\n\n`);
          }
        }

        // Step B: Stream AI Model Inference
        const chatContext = searchContext ? [searchContext] : [];
        const streamResult = await engine.stream(
          { userMessage: trimmedMessage, model, userPlan: sub?.plan, context: chatContext },
          (chunk) => {
            fullGeneratedText += chunk;
            res.write(`event: token\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
          }
        );

        const replyText = streamResult.text || fullGeneratedText;
        const actualCredits = creditManager.calculateActualCredits({
          model: selectedModel,
          inputTokens: streamResult.usage?.prompt_tokens || Math.ceil(trimmedMessage.length / 4),
          outputTokens: streamResult.usage?.completion_tokens || Math.ceil(replyText.length / 4),
        });

        const settled = await creditManager.settleCredit({
          userId: user.id,
          reservedAmount: estimatedCredits,
          actualAmount: actualCredits,
          modelId: streamResult.modelUsed || model,
          provider: selectedModel.provider_id || 'system',
        });

        res.write(`event: done\ndata: ${JSON.stringify({
          status: 'success',
          response: replyText,
          reply: replyText,
          model: streamResult.modelUsed || model,
          sources: researchData?.sources || [],
          planned_queries: researchData?.planned_queries || [],
          search_mode: effectiveSearchMode,
          credits_used: settled.deducted,
          credits_remaining: settled.balance,
        })}\n\n`);
        return res.end();
      } catch (streamErr) {
        await creditManager.refundCredit({ userId: user.id, reservedAmount: estimatedCredits, reason: streamErr.message });
        res.write(`event: error\ndata: ${JSON.stringify({
          code: streamErr.code || 'AI_PROVIDER_ERROR',
          message: streamErr.message || 'AI service is temporarily unavailable'
        })}\n\n`);
        return res.end();
      }
    }

    // 5. Handle Non-Streaming JSON Response
    try {
      let researchData = null;
      let initialContext = [];

      if (doSearch) {
        try {
          const searchEngine = getDefaultWebSearchEngine();
          researchData = await searchEngine.research(trimmedMessage, { maxSources: 5 });
          if (researchData?.formatted_context) {
            initialContext.push({
              role: 'system',
              content: researchData.formatted_context,
            });
          }
        } catch (searchErr) {
          console.warn('Non-streaming search pre-fetch warning:', searchErr);
        }
      }

      const agentRes = await agent.run({
        userMessage: trimmedMessage,
        userId: user.id,
        conversationId: conversation_id,
        repository,
        model,
        allowFallback: model === 'auto',
        userPlan: sub?.plan,
        initialContext,
      });

      const replyText = agentRes.text || agentRes.response || '';
      const modelUsed = agentRes.modelUsed || agentRes.model || model;

      const actualCredits = creditManager.calculateActualCredits({
        model: selectedModel,
        inputTokens: agentRes.usage?.prompt_tokens || Math.ceil(trimmedMessage.length / 4),
        outputTokens: agentRes.usage?.completion_tokens || Math.ceil(replyText.length / 4),
        toolCalls: agentRes.toolCalls || [],
      });

      const settled = await creditManager.settleCredit({
        userId: user.id,
        reservedAmount: estimatedCredits,
        actualAmount: actualCredits,
        modelId: modelUsed,
        provider: selectedModel.provider_id || 'system',
        conversationId: conversation_id,
        inputTokens: agentRes.usage?.prompt_tokens || Math.ceil(trimmedMessage.length / 4),
        outputTokens: agentRes.usage?.completion_tokens || Math.ceil(replyText.length / 4),
        details: { tools: agentRes.toolCalls?.map(t => t.name) || [] },
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        reply: replyText,
        response: replyText,
        model: modelUsed,
        sources: researchData?.sources || [],
        planned_queries: researchData?.planned_queries || [],
        search_mode: effectiveSearchMode,
        fallback_used: agentRes.fallbackUsed || undefined,
        credits_used: settled.deducted,
        credits_remaining: settled.balance,
      }));
    } catch (err) {
      await creditManager.refundCredit({ userId: user.id, reservedAmount: estimatedCredits, reason: err.message });
      console.error('AI Execution Error in /api/chat:', err);

      const statusCode = err.code === 'TIER_LOCKED' ? 403 : err.code === 'CREDIT_EXHAUSTED' ? 402 : err.code === 'AI_NOT_CONFIGURED' ? 503 : 502;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          code: err.code || 'AI_PROVIDER_ERROR',
          message: err.message || 'AI service is temporarily unavailable. Please select another available model.',
        }
      }));
    }
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: err.message } }));
  }
}
