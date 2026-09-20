import fs from 'fs';
import path from 'path';
import { buildSync } from 'esbuild';

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

// Copy public/assets to .vercel/output/static/assets
const publicAssetsDir = path.resolve('public', 'assets');
const staticAssetsDir = path.resolve(staticDir, 'assets');
if (fs.existsSync(publicAssetsDir)) {
  fs.mkdirSync(staticAssetsDir, { recursive: true });
  for (const file of fs.readdirSync(publicAssetsDir)) {
    fs.copyFileSync(path.join(publicAssetsDir, file), path.join(staticAssetsDir, file));
  }
}

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

// Bundle all backend dependencies into single standalone bundle for lambda
buildSync({
  entryPoints: [path.resolve('api', 'router.js')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  banner: {
    js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);"
  },
  outfile: path.join(funcDir, 'index.js'),
  external: ['pg-native']
});

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
console.log('Build Output API with static and bundled /api functions generated successfully.');
