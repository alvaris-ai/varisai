import { buildApp } from '../src/app.mjs';

let appInstance = null;

async function getApp() {
  if (!appInstance) {
    appInstance = buildApp();
    await appInstance.ready();
  }
  return appInstance;
}

export default async function handler(req, res) {
  const app = await getApp();
  app.server.emit('request', req, res);
}
