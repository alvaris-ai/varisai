import meHandler from './auth/me.js';
import loginHandler from './auth/login.js';
import registerHandler from './auth/register.js';
import logoutHandler from './auth/logout.js';
import googleHandler from './auth/google.js';
import googleCallbackHandler from './auth/google/callback.js';
import googleCredentialHandler from './auth/google/credential.js';
import modelsHandler from './models.js';
import chatHandler from './chat.js';
import projectsHandler from './projects.js';
import filesHandler from './files.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'varisai.vercel.app'}`);
    const pathname = url.pathname.replace(/\/$/, '');

    if (pathname === '/api/models') return await modelsHandler(req, res);
    if (pathname === '/api/chat') return await chatHandler(req, res);
    if (pathname === '/api/auth/me') return await meHandler(req, res);
    if (pathname === '/api/auth/login') return await loginHandler(req, res);
    if (pathname === '/api/auth/register') return await registerHandler(req, res);
    if (pathname === '/api/auth/logout') return await logoutHandler(req, res);
    if (pathname === '/api/auth/google') return googleHandler(req, res);
    if (pathname === '/api/auth/google/callback') return await googleCallbackHandler(req, res);
    if (pathname === '/api/auth/google/credential') return await googleCredentialHandler(req, res);
    if (pathname === '/api/projects') return await projectsHandler(req, res);
    if (pathname === '/api/files') return await filesHandler(req, res);

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'API Route not found' } }));
  } catch (err) {
    console.error('API router error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: err.message } }));
  }
}
