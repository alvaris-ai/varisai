import resetPasswordHandler from './reset-password.js';

export default async function handler(req, res) {
  return resetPasswordHandler(req, res);
}
