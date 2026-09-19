export default function handler(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    service: 'VARIS AI Serverless Engine',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  }));
}
