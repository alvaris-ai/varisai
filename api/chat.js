import aiChatHandler from './ai/chat.js';

export default async function handler(req, res) {
  return aiChatHandler(req, res);
}
