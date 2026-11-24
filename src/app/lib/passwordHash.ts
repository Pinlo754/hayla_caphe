/**
 * Lightweight client-side password hashing (SHA-256 + per-account salt) via
 * the Web Crypto API. No extra dependency needed. This is not bank-grade
 * security, but it keeps plaintext passwords out of Firestore — matching
 * the app's existing lightweight auth model (see /admin login).
 */

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}
