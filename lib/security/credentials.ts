/**
 * Sealed credential box for third-party secrets (e.g. a user's own Livepeer
 * key). Supabase rows are readable with the public anon key, so secrets must
 * never land there in plaintext. AES-256-GCM with a server-only derived key;
 * fails closed when the server secret is absent.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const CONTEXT = 'nue-credential-box-v1:';

function boxKey(): Buffer {
  // Server-only secret. Never NEXT_PUBLIC, never sent to clients.
  const serverSecret = process.env.MEMWAL_PRIVATE_KEY;
  if (!serverSecret) {
    throw new Error('Credential box unavailable: MEMWAL_PRIVATE_KEY is not configured.');
  }
  return createHash('sha256').update(CONTEXT + serverSecret).digest();
}

/** Returns `v1.<base64 iv>.<base64 ciphertext+tag>` for storage. */
export function sealCredential(plaintext: string): string {
  if (!plaintext) throw new Error('Cannot seal an empty credential.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', boxKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${Buffer.concat([enc, tag]).toString('base64')}`;
}

/** Reverses sealCredential. Throws on tampering or wrong server secret. */
export function unsealCredential(sealed: string): string {
  const parts = sealed.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new Error('Unrecognized credential envelope.');
  }
  const iv = Buffer.from(parts[1], 'base64');
  const payload = Buffer.from(parts[2], 'base64');
  if (iv.length !== 12 || payload.length < 17) {
    throw new Error('Malformed credential envelope.');
  }
  const decipher = createDecipheriv('aes-256-gcm', boxKey(), iv);
  decipher.setAuthTag(payload.subarray(payload.length - 16));
  const plain = Buffer.concat([
    decipher.update(payload.subarray(0, payload.length - 16)),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}

/** Last-4 mask for display. Never returns the secret itself. */
export function maskCredentialTail(plaintext: string): string {
  const tail = plaintext.slice(-4);
  return `…${tail}`;
}
