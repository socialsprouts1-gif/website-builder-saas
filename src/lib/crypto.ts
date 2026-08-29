import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * AES-256-GCM envelope for third-party credentials (OpenAI keys, connector
 * tokens). Ciphertext is stored as `v1.<iv>.<tag>.<payload>`, all base64url.
 *
 * LUMEN_ENCRYPTION_KEY must be 32 bytes, base64 or hex encoded. Rotate by
 * re-encrypting rows; the version prefix leaves room for a v2 scheme.
 */

const VERSION = 'v1';

function keyBytes(): Buffer {
  const raw = env.encryptionKey;
  if (!raw) throw new Error('LUMEN_ENCRYPTION_KEY is not set');

  const decoded = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (decoded.length !== 32) {
    throw new Error('LUMEN_ENCRYPTION_KEY must decode to exactly 32 bytes');
  }
  return decoded;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
  const payload = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), payload.toString('base64url')].join('.');
}

export function decryptSecret(envelope: string): string {
  const [version, iv, tag, payload] = envelope.split('.');
  if (version !== VERSION || !iv || !tag || !payload) {
    throw new Error('Unrecognised secret envelope');
  }
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(payload, 'base64url')), decipher.final()]).toString('utf8');
}

/** Never render more than this of a stored key. */
export function maskKey(last4: string): string {
  return `sk-••••••••••••${last4}`;
}

export function last4Of(secret: string): string {
  return secret.slice(-4);
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = createHash('sha256').update(a).digest();
  const bufB = createHash('sha256').update(b).digest();
  return timingSafeEqual(bufA, bufB);
}
