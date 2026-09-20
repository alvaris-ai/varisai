import { getGlobalRepositories } from '../../src/repositories.mjs';
import { hashPassword, isValidEmail } from '../../src/security.mjs';
import { loadConfig } from '../../src/config.mjs';
import { createPool } from '../../src/db.mjs';

function getRepos() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}

async function parseBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const str = Buffer.concat(chunks).toString();
  return str ? JSON.parse(str) : {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } }));
  }

  try {
    const body = await parseBody(req);
    const email = (body.email || '').trim().toLowerCase();
    const newPassword = body.newPassword || body.new_password || body.password || '';

    if (!email || !isValidEmail(email)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'INVALID_EMAIL', message: 'Alamat email tidak valid.' } }));
    }

    if (!newPassword || newPassword.length < 6) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'INVALID_PASSWORD', message: 'Password baru minimal 6 karakter.' } }));
    }

    const repository = getRepos();
    const user = await repository.findUserByEmail(email);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 'USER_NOT_FOUND', message: 'Akun dengan email tersebut tidak ditemukan. Silakan buat akun baru.' } }));
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await repository.resetPasswordByEmail(email, passwordHash);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Password berhasil diubah. Silakan masuk menggunakan password baru Anda.',
      user: { id: user.id, email: user.email, name: user.name },
    }));
  } catch (err) {
    console.error('Reset password error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: err.message } }));
  }
}
