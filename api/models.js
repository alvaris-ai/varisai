import { DEFAULT_AI_MODELS } from '../src/repositories.mjs';

export default function handler(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    models: DEFAULT_AI_MODELS,
    count: DEFAULT_AI_MODELS.length
  }));
}
