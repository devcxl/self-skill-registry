// ─── Types ─────────────────────────────────────────────────────────────

export type FileMap = Map<string, string | Uint8Array>;

// ─── SHA-256 ───────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hash using Web Crypto API (cross-platform).
 * Accepts Uint8Array — use TextEncoder for strings, or Uint8Array for buffers.
 */
export async function sha256(data: Uint8Array): Promise<string> {
  // Cast to any avoids type conflicts between @types/node's ArrayBufferLike
  // and the Web Crypto API's BufferSource (ArrayBuffer) expectations.
  const hash = await (crypto.subtle as SubtleCrypto).digest('SHA-256', data as BufferSource);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Path Validation ───────────────────────────────────────────────────

/** Reject path traversal attempts when unpacking archives. Pure function. */
export function validateTarPath(filePath: string): boolean {
  if (filePath.includes('..')) return false;
  if (filePath.startsWith('/')) return false;
  if (filePath.includes('\0')) return false;
  if (filePath.trim().length === 0) return false;
  return true;
}
