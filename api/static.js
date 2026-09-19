import { HTML_CONTENT, CSS_CONTENT, JS_CONTENT } from '../src/assets.mjs';

export default function handler(req, res) {
  try {
    const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname || '/';

    if (pathname === '/style.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      });
      return res.end(CSS_CONTENT);
    }

    if (pathname === '/app.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      });
      return res.end(JS_CONTENT);
    }

    // All other frontend routes serve the SPA HTML
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate'
    });
    return res.end(HTML_CONTENT);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('VARIS AI Error: ' + err.message);
  }
}
