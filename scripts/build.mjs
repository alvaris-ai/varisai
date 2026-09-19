import fs from 'fs';
import path from 'path';

// 1. Ensure .vercel/output and .vercel/output/static exist
const outDir = path.resolve('.vercel', 'output');
const staticDir = path.resolve(outDir, 'static');

fs.mkdirSync(staticDir, { recursive: true });

// 2. Copy all files from public/ into .vercel/output/static
const publicDir = path.resolve('public');
const files = fs.readdirSync(publicDir);
for (const file of files) {
  const src = path.join(publicDir, file);
  const dest = path.join(staticDir, file);
  if (fs.statSync(src).isFile()) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} -> .vercel/output/static/${file}`);
  }
}

// 3. Write .vercel/output/config.json with routing: serve static filesystem first, SPA fallback to /index.html
const config = {
  version: 3,
  routes: [
    {
      handle: 'filesystem'
    },
    {
      src: '/(.*)',
      dest: '/index.html'
    }
  ]
};

fs.writeFileSync(path.join(outDir, 'config.json'), JSON.stringify(config, null, 2));
console.log('Vercel Build Output API configuration generated successfully.');
