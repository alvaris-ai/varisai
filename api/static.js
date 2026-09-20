import fs from 'fs';
import path from 'path';
import { HTML_CONTENT, CSS_CONTENT, JS_CONTENT } from '../src/assets.mjs';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export default function handler(req, res) {
  try {
    const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname || '/';

    // 1. Serve /assets/* files
    if (pathname.startsWith('/assets/')) {
      const relPath = pathname.replace(/^\/assets\//, '');
      const filePath = path.join(process.cwd(), 'public', 'assets', relPath);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const buffer = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600, must-revalidate',
        });
        return res.end(buffer);
      }
    }

    if (pathname === '/style.css') {
      let content = CSS_CONTENT;
      const diskPath = path.join(process.cwd(), 'public', 'style.css');
      if (fs.existsSync(diskPath)) content = fs.readFileSync(diskPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache, must-revalidate'
      });
      return res.end(content);
    }

    if (pathname === '/app.js') {
      let content = JS_CONTENT;
      const diskPath = path.join(process.cwd(), 'public', 'app.js');
      if (fs.existsSync(diskPath)) content = fs.readFileSync(diskPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, must-revalidate'
      });
      return res.end(content);
    }

    // All other frontend routes serve the SPA HTML
    let html = HTML_CONTENT;
    const diskHtml = path.join(process.cwd(), 'public', 'index.html');
    if (fs.existsSync(diskHtml)) html = fs.readFileSync(diskHtml, 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    return res.end(html);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('VARIS AI Error: ' + err.message);
  }
}
