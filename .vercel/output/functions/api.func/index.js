import meHandler from '../../../../api/auth/me.js';
import loginHandler from '../../../../api/auth/login.js';
import registerHandler from '../../../../api/auth/register.js';
import logoutHandler from '../../../../api/auth/logout.js';
import googleHandler from '../../../../api/auth/google.js';
import googleCallbackHandler from '../../../../api/auth/google/callback.js';
import googleCredentialHandler from '../../../../api/auth/google/credential.js';
import modelsHandler from '../../../../api/models.js';
import chatHandler from '../../../../api/chat.js';
import projectsHandler from '../../../../api/projects.js';
import filesHandler from '../../../../api/files.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname.replace(/\/$/, '');

  if (p === '/api/models') return modelsHandler(req, res);
  if (p === '/api/chat') return chatHandler(req, res);
  if (p === '/api/auth/me') return meHandler(req, res);
  if (p === '/api/auth/login') return loginHandler(req, res);
  if (p === '/api/auth/register') return registerHandler(req, res);
  if (p === '/api/auth/logout') return logoutHandler(req, res);
  if (p === '/api/auth/google') return googleHandler(req, res);
  if (p === '/api/auth/google/callback') return googleCallbackHandler(req, res);
  if (p === '/api/auth/google/credential') return googleCredentialHandler(req, res);
  if (p === '/api/projects') return projectsHandler(req, res);
  if (p === '/api/files') return filesHandler(req, res);

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'API Route not found' } }));
}