#!/usr/bin/env node
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: node scripts/hash-password.mjs <password> (minimum 12 characters)');
  process.exit(1);
}

const salt = randomBytes(16);
const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
console.log(`$scrypt$16384$8$1$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`);
