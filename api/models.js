import { DEFAULT_AI_MODELS } from '../src/repositories.mjs';

export default function handler(req, res) {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGroq = Boolean(process.env.GROQ_API_KEY);

  const enrichedModels = DEFAULT_AI_MODELS.map(m => {
    let status = m.status || 'available';
    if (m.provider_id === 'google') {
      status = hasGemini ? 'available' : 'not_configured';
    } else if (m.provider_id === 'openai') {
      status = hasOpenAI ? 'available' : 'not_configured';
    } else if (m.provider_id === 'groq') {
      status = hasGroq ? 'available' : 'not_configured';
    } else if (m.id === 'auto') {
      status = 'available';
    }

    return {
      ...m,
      status,
      is_available: status === 'available',
    };
  });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    models: enrichedModels,
    data: enrichedModels,
    count: enrichedModels.length,
    providers: {
      openai: hasOpenAI ? 'configured' : 'missing_key',
      gemini: hasGemini ? 'configured' : 'missing_key',
      groq: hasGroq ? 'configured' : 'missing_key',
    }
  }));
}
