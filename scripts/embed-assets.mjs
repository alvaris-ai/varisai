import fs from 'fs';
import path from 'path';

// 1. Read static files
const html = fs.readFileSync(path.join('public', 'index.html'), 'utf-8');
const css = fs.readFileSync(path.join('public', 'style.css'), 'utf-8');
const js = fs.readFileSync(path.join('public', 'app.js'), 'utf-8');

// 2. Generate src/assets.mjs
const output = `// Auto-generated static assets embedded for zero-latency serverless delivery
export const HTML_CONTENT = ${JSON.stringify(html)};
export const CSS_CONTENT = ${JSON.stringify(css)};
export const JS_CONTENT = ${JSON.stringify(js)};
`;
fs.writeFileSync(path.join('src', 'assets.mjs'), output, 'utf-8');

// 3. Assemble .vercel/output/static
const outDir = path.resolve('.vercel', 'output');
const staticDir = path.resolve(outDir, 'static');
fs.mkdirSync(staticDir, { recursive: true });

fs.writeFileSync(path.join(staticDir, 'index.html'), html, 'utf-8');
fs.writeFileSync(path.join(staticDir, 'style.css'), css, 'utf-8');
fs.writeFileSync(path.join(staticDir, 'app.js'), js, 'utf-8');

// 4. Assemble .vercel/output/functions/api.func
const funcDir = path.resolve(outDir, 'functions', 'api.func');
fs.mkdirSync(funcDir, { recursive: true });

const vcConfig = {
  runtime: 'nodejs20.x',
  handler: 'index.js',
  launcherType: 'Nodejs',
  shouldAddHelpers: true
};
fs.writeFileSync(path.join(funcDir, '.vc-config.json'), JSON.stringify(vcConfig, null, 2), 'utf-8');

const apiHandlerCode = `
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
  const p = url.pathname.replace(/\\/$/, '');

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
`;
fs.writeFileSync(path.join(funcDir, 'index.js'), apiHandlerCode.trim(), 'utf-8');

// 5. Assemble .vercel/output/config.json
const config = {
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '/api/(.*)', dest: '/api' },
    { src: '/api', dest: '/api' },
    { src: '/(.*)', dest: '/index.html' }
  ]
};
fs.writeFileSync(path.join(outDir, 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
console.log('Vercel Build Output API with static and /api functions generated successfully.');
