import { buildApp } from '../src/app.mjs';

let appInstance = null;

async function getApp() {
  if (!appInstance) {
    appInstance = buildApp();
    await appInstance.ready();
  }
  return appInstance;
}

function resolveUrl(req) {
  if (req.url && req.url.startsWith('/api/') && req.url !== '/api') {
    return req.url;
  }
  if (req.headers['x-matched-path']) {
    return req.headers['x-matched-path'];
  }
  if (req.headers['x-forwarded-uri']) {
    return req.headers['x-forwarded-uri'];
  }
  return req.url || '/api';
}

export default async function handler(req, res) {
  try {
    const app = await getApp();

    let payload = req.body;
    if (!payload && typeof req[Symbol.asyncIterator] === 'function' && req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        if (chunks.length > 0) payload = Buffer.concat(chunks);
      } catch (e) {}
    }

    const url = resolveUrl(req);

    const response = await app.inject({
      method: req.method || 'GET',
      url,
      headers: req.headers,
      payload: payload !== undefined ? payload : undefined,
    });

    for (const [headerName, headerValue] of Object.entries(response.headers)) {
      if (headerValue !== undefined) {
        res.setHeader(headerName, headerValue);
      }
    }

    res.statusCode = response.statusCode;
    res.end(response.rawPayload);
  } catch (err) {
    console.error('Serverless execution error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: {
        code: 'SERVERLESS_FUNCTION_ERROR',
        message: err.message || 'Internal server error'
      }
    }));
  }
}
