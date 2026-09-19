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
console.log('src/assets.mjs successfully created. Bytes:', output.length);

// 3. Assemble .vercel/output for Vercel Build Output API v3
const outDir = path.resolve('.vercel', 'output');
const staticDir = path.resolve(outDir, 'static');
fs.mkdirSync(staticDir, { recursive: true });

fs.writeFileSync(path.join(staticDir, 'index.html'), html, 'utf-8');
fs.writeFileSync(path.join(staticDir, 'style.css'), css, 'utf-8');
fs.writeFileSync(path.join(staticDir, 'app.js'), js, 'utf-8');

const config = {
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '/api/(.*)', dest: '/api/$1' },
    { src: '/(.*)', dest: '/index.html' }
  ]
};

fs.writeFileSync(path.join(outDir, 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
console.log('.vercel/output successfully generated with static assets & edge routing.');
