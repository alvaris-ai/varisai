import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function resolveFile(cleanPath) {
  const searchDirs = [
    path.join(process.cwd(), 'public'),
    path.join(__dirname, '..', 'public'),
    path.join(process.cwd()),
    __dirname
  ];

  if (cleanPath) {
    for (const dir of searchDirs) {
      const target = path.join(dir, cleanPath);
      try {
        if (fs.existsSync(target) && fs.statSync(target).isFile()) {
          return target;
        }
      } catch {}
    }
  }

  // Fallback to index.html
  for (const dir of searchDirs) {
    const target = path.join(dir, 'index.html');
    try {
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        return target;
      }
    } catch {}
  }

  return null;
}

export default function handler(req, res) {
  try {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = parsedUrl.pathname || '/';
    const clean = pathname.replace(/^\//, '');

    const resolved = resolveFile(clean);
    if (!resolved) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('VARIS AI Static asset not found.');
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(resolved);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=0, must-revalidate'
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server Error: ' + err.message);
  }
}
