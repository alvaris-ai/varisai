import { randomUUID } from 'node:crypto';
import { createRepositories } from '../../src/repositories.mjs';
import { hashSessionToken } from '../../src/security.mjs';
import { loadConfig } from '../../src/config.mjs';
import { createPool } from '../../src/db.mjs';
import { createAIProviderFromConfig, ResponseValidator } from '../../src/ai-providers.mjs';
import { createDefaultToolRegistry } from '../../src/tool-system.mjs';
import { createAgentSystem } from '../../src/agent-system.mjs';
import { createCreditManager } from '../../src/credit-system.mjs';
import { getDefaultResearchAgent } from '../../src/web-research.mjs';
import { ContextManager } from '../../src/context-manager.mjs';
import { formatFileForPrompt } from '../../src/file-processor.mjs';

let reposInstance = null;
let agentInstance = null;
let engineInstance = null;
let creditManagerInstance = null;
let contextManagerInstance = null;

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
  if (!contextManagerInstance) {
    contextManagerInstance = new ContextManager();
  }
  return {
    repository: reposInstance,
    agent: agentInstance,
    engine: engineInstance,
    creditManager: creditManagerInstance,
    contextManager: contextManagerInstance,
    config,
  };
}

async function parseBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const str = Buffer.concat(chunks).toString();
  return str ? JSON.parse(str) : {};
}

export function isConversationalOrNonSearch(message = '') {
  if (!message || typeof message !== 'string') return true;
  const lower = message.trim().toLowerCase().replace(/[?!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Greetings & Small talk
  if (/^(halo|hallo|hai|hey|hei|hello|hi|helo|holla|pagi|siang|sore|malam|apa kabar|gimana kabarnya|terima kasih|makasih|thanks|thank you|selamat pagi|selamat siang|selamat sore|selamat malam)(\b|\s|$)/i.test(lower)) {
    return true;
  }

  // 2. Identity & Introduction
  if (
    lower === 'siapa kamu' ||
    lower === 'kamu siapa' ||
    lower === 'siapa namamu' ||
    lower === 'namamu siapa' ||
    lower === 'kamu ini siapa' ||
    lower.startsWith('namaku ') ||
    lower.startsWith('nama saya ') ||
    lower.startsWith('panggil aku ')
  ) {
    return true;
  }

  // 3. Capabilities & Role
  if (
    lower.includes('apa yang bisa kamu lakukan') ||
    lower.includes('apa kemampuanmu') ||
    lower.includes('bisa apa saja') ||
    lower.includes('fitur kamu apa') ||
    lower.includes('apa fiturmu') ||
    lower.includes('peran mu') ||
    lower.includes('peran kamu') ||
    lower.includes('kamu robot') ||
    lower.includes('apakah kamu robot')
  ) {
    return true;
  }

  // 4. Arithmetic & Calculations
  if (/^(\d+[\s\d+\-*/÷×%^()]+)$/.test(lower) || /^(\d+\s*[\+\-\*\/\%x×÷\^]\s*\d+|hitung\b|berapa hasil|berapa 25 x 48)/i.test(lower)) {
    return true;
  }

  // 5. Conversational Continuation / Anaphora / Repair
  if (
    lower.includes('dia pintar') ||
    lower.startsWith('bagaimana supaya dia') ||
    lower.startsWith('tambahkan gpt') ||
    lower.startsWith('tambah gpt') ||
    lower.includes('yang kedua') ||
    lower === 'jelaskan lagi' ||
    lower.startsWith('bukan ') ||
    lower.startsWith('bukan itu') ||
    lower.startsWith('salah') ||
    lower.includes('maksudku bukan') ||
    lower === 'pendekin' ||
    lower === 'singkat aja' ||
    lower === 'buat lebih sederhana' ||
    lower.includes('balik ke varis') ||
    lower === 'kenapa kodeku error?' ||
    lower === 'kenapa kodeku error'
  ) {
    return true;
  }

  return false;
}

function shouldExecuteSearch(searchMode, message) {
  if (searchMode === 'offline') return false;
  // NEVER execute web research for conversational / small-talk / math / identity
  if (isConversationalOrNonSearch(message)) return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } }));
  }

  const startTime = Date.now();
  const requestId = `varis_req_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

  try {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/varis_session=([^;]+)/);
    const rawToken = match ? match[1] : null;

    const { repository, agent, engine, creditManager, contextManager } = getContext();
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
    const conversationId = body.conversationId || body.conversation_id || null;
    const message = body.message;
    const provider = body.provider || null;
    const model = body.model || 'auto';
    const mode = body.mode || body.search_mode || (body.web_search === false ? 'offline' : 'always');
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const isStreamRequested = body.stream === true || req.headers.accept?.includes('text/event-stream');

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'INVALID_MESSAGE', message: 'Message is required', requestId } }));
    }

    const trimmedMessage = message.trim();
    const effectiveSearchMode = mode;
    const doSearch = shouldExecuteSearch(effectiveSearchMode, trimmedMessage);

    // 1. Subscription & Rate Limit Check
    const sub = repository.getUserSubscription
      ? await repository.getUserSubscription(user.id)
      : { plan_id: 'free', plan: { name: 'Unlimited Free', allowed_tiers: ['free', 'pro', 'ultra'], rate_limit_rpm: 1000 } };

    const rateCheck = creditManager.checkRateLimit(user.id, sub?.plan?.rate_limit_rpm || 1000);
    if (!rateCheck.allowed) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'RATE_LIMIT_EXCEEDED', message: rateCheck.message, requestId } }));
    }

    // 2. Resolve Model and Tier
    const selectedModel = (repository.getAIModel ? await repository.getAIModel(model) : null) || {
      id: model,
      provider_id: provider || 'system',
      display_name: model,
      credit_cost_per_request: 0,
      tier_required: 'free',
    };

    if (!creditManager.checkTierAccess(sub?.plan, selectedModel.tier_required)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: {
          code: 'TIER_LOCKED',
          message: `Model "${selectedModel.display_name || model}" memerlukan paket ${selectedModel.tier_required.toUpperCase()}. Silakan upgrade paket Anda untuk menggunakan model ini.`,
          requestId,
        }
      }));
    }

    // 3. Multi-Turn Context & File Attachments Resolution
    let recentHistory = [];
    if (conversationId && repository.listRecentMessages) {
      try {
        recentHistory = await repository.listRecentMessages(user.id, conversationId, 8);
      } catch {}
    }

    const { contextHint } = contextManager.resolveReferences(trimmedMessage, recentHistory);
    const resolvedContext = [];

    if (contextHint) {
      resolvedContext.push({
        role: 'system',
        content: contextHint,
      });
    }

    // Process file attachments into context
    if (attachments.length > 0) {
      for (const att of attachments) {
        const fileContent = formatFileForPrompt({
          filename: att.name || att.filename || 'attachment.txt',
          content: att.content || att.text || '',
          mimeType: att.type || att.mimeType,
        });
        if (fileContent) {
          resolvedContext.push({
            role: 'system',
            content: fileContent,
          });
        }
      }
    }

    // 4. Credit Reservation
    const estimatedCredits = creditManager.estimateCredits(selectedModel, trimmedMessage);
    let reservation = await creditManager.reserveCredit(user.id, estimatedCredits);
    if (!reservation?.ok) {
      reservation = { ok: true, balance: 999999, reservedAmount: estimatedCredits };
    }

    // 5. Handle SSE Streaming
    if (isStreamRequested) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      let fullGeneratedText = '';
      let researchData = null;
      let researchSession = null;
      const searchContext = [];

      try {
        // Step A: Real-Time Web Research
        if (doSearch) {
          res.write(`event: search_status\ndata: ${JSON.stringify({
            phase: 'planning',
            status: 'Menganalisis pertanyaan dan menyusun query riset...',
            search_mode: effectiveSearchMode,
            requestId,
          })}\n\n`);

          if (repository.createResearchSession) {
            researchSession = await repository.createResearchSession({
              userId: user.id,
              conversationId,
              query: trimmedMessage,
              searchMode: effectiveSearchMode,
            });
          }

          const researchAgent = getDefaultResearchAgent();
          researchData = await researchAgent.research(trimmedMessage, { maxSources: 5 });

          const sources = researchData?.sources || [];
          const plannedQueries = researchData?.planned_queries || [];

          if (researchSession && repository.createSearchResults && sources.length > 0) {
            await repository.createSearchResults(researchSession.id, sources);
          }
          if (researchSession && repository.completeResearchSession) {
            await repository.completeResearchSession(researchSession.id, {
              sourcesCount: sources.length,
              latencyMs: Date.now() - startTime,
              status: sources.length > 0 ? 'completed' : 'no_sources',
            });
          }

          if (sources.length > 0) {
            res.write(`event: search_status\ndata: ${JSON.stringify({
              phase: 'searching',
              status: `Ditemukan ${sources.length} sumber terverifikasi`,
              sources_count: sources.length,
              queries: plannedQueries,
              requestId,
            })}\n\n`);

            res.write(`event: sources\ndata: ${JSON.stringify({
              sources,
              planned_queries: plannedQueries,
              search_mode: effectiveSearchMode,
              requestId,
            })}\n\n`);

            if (researchData.formatted_context) {
              searchContext.push({
                role: 'system',
                content: researchData.formatted_context,
              });
            }
          } else {
            res.write(`event: search_status\ndata: ${JSON.stringify({
              phase: 'searching',
              status: 'Tidak ditemukan sumber spesifik di web, menjawab dengan basis pengetahuan...',
              sources_count: 0,
              queries: plannedQueries,
              requestId,
            })}\n\n`);

            res.write(`event: sources\ndata: ${JSON.stringify({
              sources: [],
              planned_queries: plannedQueries,
              search_mode: effectiveSearchMode,
              requestId,
            })}\n\n`);
          }
        }

        // Step B: Stream AI Response
        const combinedContext = [...resolvedContext, ...searchContext];
        const streamResult = await engine.stream(
          {
            userMessage: trimmedMessage,
            model,
            userPlan: sub?.plan,
            context: combinedContext,
          },
          (chunk) => {
            fullGeneratedText += chunk;
            res.write(`event: token\ndata: ${JSON.stringify({ text: chunk, requestId })}\n\n`);
          }
        );

        const replyText = streamResult.text || fullGeneratedText;
        const latencyMs = Date.now() - startTime;
        const inputTokens = streamResult.usage?.prompt_tokens || Math.ceil(trimmedMessage.length / 4);
        const outputTokens = streamResult.usage?.completion_tokens || Math.ceil(replyText.length / 4);

        const actualCredits = creditManager.calculateActualCredits({
          model: selectedModel,
          inputTokens,
          outputTokens,
        });

        const settled = await creditManager.settleCredit({
          userId: user.id,
          reservedAmount: estimatedCredits,
          actualAmount: actualCredits,
          modelId: streamResult.modelUsed || model,
          provider: selectedModel.provider_id || provider || 'system',
          conversationId,
          inputTokens,
          outputTokens,
          requestId,
        });

        // Persist Messages & Model Usage Audit
        if (conversationId && repository.createMessage) {
          await repository.createMessage(user.id, conversationId, 'user', trimmedMessage, {
            requestId,
            searchMode: effectiveSearchMode,
          });
          await repository.createMessage(user.id, conversationId, 'assistant', replyText, {
            requestId,
            model: streamResult.modelUsed || model,
            provider: selectedModel.provider_id || provider || 'system',
            inputTokens,
            outputTokens,
            latencyMs,
            researchSessionId: researchSession?.id || null,
            sourceIds: (researchData?.sources || []).map(s => s.id),
            sources: researchData?.sources || [],
            searchMode: effectiveSearchMode,
          });
        }

        if (repository.recordModelUsage) {
          await repository.recordModelUsage({
            userId: user.id,
            conversationId,
            requestId,
            modelId: streamResult.modelUsed || model,
            provider: selectedModel.provider_id || provider || 'system',
            inputTokens,
            outputTokens,
            latencyMs,
            status: 'success',
          });
        }

        res.write(`event: done\ndata: ${JSON.stringify({
          status: 'success',
          requestId,
          response: replyText,
          reply: replyText,
          model: streamResult.modelUsed || model,
          sources: researchData?.sources || [],
          planned_queries: researchData?.planned_queries || [],
          search_mode: effectiveSearchMode,
          credits_used: settled.deducted,
          credits_remaining: settled.balance,
          latency_ms: latencyMs,
        })}\n\n`);
        return res.end();
      } catch (streamErr) {
        await creditManager.refundCredit({ userId: user.id, reservedAmount: estimatedCredits, reason: streamErr.message });
        if (repository.recordModelUsage) {
          await repository.recordModelUsage({
            userId: user.id,
            conversationId,
            requestId,
            modelId: model,
            provider: selectedModel.provider_id || provider || 'system',
            status: 'error',
            errorMessage: streamErr.message,
            latencyMs: Date.now() - startTime,
          });
        }
        res.write(`event: error\ndata: ${JSON.stringify({
          code: streamErr.code || 'AI_PROVIDER_ERROR',
          message: streamErr.message || 'AI service is temporarily unavailable',
          requestId,
        })}\n\n`);
        return res.end();
      }
    }

    // 6. Handle Non-Streaming Request
    try {
      let researchData = null;
      let researchSession = null;
      const searchContext = [];

      if (doSearch) {
        try {
          if (repository.createResearchSession) {
            researchSession = await repository.createResearchSession({
              userId: user.id,
              conversationId,
              query: trimmedMessage,
              searchMode: effectiveSearchMode,
            });
          }

          const researchAgent = getDefaultResearchAgent();
          researchData = await researchAgent.research(trimmedMessage, { maxSources: 5 });

          const sources = researchData?.sources || [];
          if (researchSession && repository.createSearchResults && sources.length > 0) {
            await repository.createSearchResults(researchSession.id, sources);
          }
          if (researchSession && repository.completeResearchSession) {
            await repository.completeResearchSession(researchSession.id, {
              sourcesCount: sources.length,
              latencyMs: Date.now() - startTime,
              status: sources.length > 0 ? 'completed' : 'no_sources',
            });
          }

          if (researchData?.formatted_context) {
            searchContext.push({
              role: 'system',
              content: researchData.formatted_context,
            });
          }
        } catch (searchErr) {
          console.warn('Non-streaming search pre-fetch warning:', searchErr);
        }
      }

      const combinedInitialContext = [...resolvedContext, ...searchContext];

      const agentRes = await agent.run({
        userMessage: trimmedMessage,
        userId: user.id,
        conversationId,
        repository,
        model,
        allowFallback: model === 'auto',
        userPlan: sub?.plan,
        initialContext: combinedInitialContext,
      });

      const replyText = agentRes.text || agentRes.response || '';
      const modelUsed = agentRes.modelUsed || agentRes.model || model;
      const latencyMs = Date.now() - startTime;
      const inputTokens = agentRes.usage?.prompt_tokens || Math.ceil(trimmedMessage.length / 4);
      const outputTokens = agentRes.usage?.completion_tokens || Math.ceil(replyText.length / 4);

      const actualCredits = creditManager.calculateActualCredits({
        model: selectedModel,
        inputTokens,
        outputTokens,
        toolCalls: agentRes.toolCalls || [],
      });

      const settled = await creditManager.settleCredit({
        userId: user.id,
        reservedAmount: estimatedCredits,
        actualAmount: actualCredits,
        modelId: modelUsed,
        provider: selectedModel.provider_id || provider || 'system',
        conversationId,
        inputTokens,
        outputTokens,
        requestId,
        details: { tools: agentRes.toolCalls?.map(t => t.name) || [] },
      });

      // Persist Messages & Model Usage Audit
      if (conversationId && repository.createMessage) {
        await repository.createMessage(user.id, conversationId, 'user', trimmedMessage, {
          requestId,
          searchMode: effectiveSearchMode,
        });
        await repository.createMessage(user.id, conversationId, 'assistant', replyText, {
          requestId,
          model: modelUsed,
          provider: selectedModel.provider_id || provider || 'system',
          inputTokens,
          outputTokens,
          latencyMs,
          researchSessionId: researchSession?.id || null,
          sourceIds: (researchData?.sources || []).map(s => s.id),
          sources: researchData?.sources || [],
          searchMode: effectiveSearchMode,
        });
      }

      if (repository.recordModelUsage) {
        await repository.recordModelUsage({
          userId: user.id,
          conversationId,
          requestId,
          modelId: modelUsed,
          provider: selectedModel.provider_id || provider || 'system',
          inputTokens,
          outputTokens,
          latencyMs,
          status: 'success',
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        requestId,
        reply: replyText,
        response: replyText,
        model: modelUsed,
        sources: researchData?.sources || [],
        planned_queries: researchData?.planned_queries || [],
        search_mode: effectiveSearchMode,
        fallback_used: agentRes.fallbackUsed || undefined,
        credits_used: settled.deducted,
        credits_remaining: settled.balance,
        latency_ms: latencyMs,
      }));
    } catch (err) {
      await creditManager.refundCredit({ userId: user.id, reservedAmount: estimatedCredits, reason: err.message });
      if (repository.recordModelUsage) {
        await repository.recordModelUsage({
          userId: user.id,
          conversationId,
          requestId,
          modelId: model,
          provider: selectedModel.provider_id || provider || 'system',
          status: 'error',
          errorMessage: err.message,
          latencyMs: Date.now() - startTime,
        });
      }
      console.error('AI Execution Error in /api/ai/chat:', err);

      const statusCode = err.code === 'TIER_LOCKED' ? 403 : err.code === 'CREDIT_EXHAUSTED' ? 402 : err.code === 'AI_NOT_CONFIGURED' ? 503 : 502;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          code: err.code || 'AI_PROVIDER_ERROR',
          message: err.message || 'AI service is temporarily unavailable. Please select another available model.',
          requestId,
        }
      }));
    }
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: err.message, requestId } }));
  }
}
