import crypto from 'crypto';

/**
 * Encodes/decodes secrets (the user's Resend API key) before they
 * touch the database. This is server-only infrastructure — it is
 * NOT the Resend key itself, which never lives in .env; each user
 * supplies their own key from the browser (see sec. "Bring your
 * own Resend key" in README).
 *
 * Uses AES-256-GCM with a key derived from APP_ENCRYPTION_KEY.
 * Set APP_ENCRYPTION_KEY to any long random string in .env — it is
 * only used to encrypt/decrypt secrets at rest, never sent anywhere.
 */

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('APP_ENCRYPTION_KEY is not configured on the server.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encodeSecret(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // ivHex.authTagHex.cipherTextHex
  return `${iv.toString('hex')}.${authTag.toString('hex')}.${encrypted.toString('hex')}`;
}

export function decodeSecret(encoded: string): string {
  const key = getKey();
  const [ivHex, authTagHex, cipherHex] = encoded.split('.');
  if (!ivHex || !authTagHex || !cipherHex) {
    throw new Error('Stored secret is malformed.');
  }
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

/** Returns a short masked preview like "re_12ab***wxyz" for display in the UI. */
export function maskSecret(plainText: string): string {
  if (plainText.length <= 8) return '***';
  return `${plainText.slice(0, 5)}***${plainText.slice(-4)}`;
}
