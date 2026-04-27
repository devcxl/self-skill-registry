/**
 * Crypto utilities for auth — SHA-256 hashing, random token generation.
 * Uses Web Crypto API (available in Workers and Node.js 19+).
 */

/** Generate a cryptographically random hex string */
export function generateToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Compute SHA-256 hex digest */
export async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
