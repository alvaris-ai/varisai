import { buildApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const config = loadConfig();
const app = buildApp({ config });
await app.listen({ port: config.port, host: '0.0.0.0' });

