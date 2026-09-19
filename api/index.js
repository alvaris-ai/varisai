import { buildApp } from '../src/app.mjs';
import { loadConfig } from '../src/config.mjs';

const config = loadConfig();
const app = buildApp({ config });
let isReady = false;

export default async function handler(req, res) {
  if (!isReady) {
    await app.ready();
    isReady = true;
  }
  app.server.emit('request', req, res);
}
