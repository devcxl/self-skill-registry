import { PassThrough, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { create as createTar, extract as extractTar } from 'tar';

// ─── Types ─────────────────────────────────────────────────────────────

export type FileMap = Map<string, string | Buffer | Uint8Array>;

// ─── SHA-256 ───────────────────────────────────────────────────────────

/** Compute SHA-256 hash using Web Crypto API (cross-platform). */
export async function sha256(buffer: Buffer | Uint8Array): Promise<string> {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Path Validation ───────────────────────────────────────────────────

/** Reject path traversal attempts. Pure function. */
export function validateTarPath(filePath: string): boolean {
  if (filePath.includes('..')) return false;
  if (filePath.startsWith('/')) return false;
  if (filePath.includes('\0')) return false;
  if (filePath.trim().length === 0) return false;
  return true;
}

// ─── Packing ───────────────────────────────────────────────────────────

/**
 * Create a gzipped tarball from a file map.
 * Returns the buffer and its SHA-256 hash.
 */
export async function packSkill(
  files: FileMap,
  rootDir: string,
): Promise<{ buffer: Buffer; sha256: string }> {
  // Write files to a temp virtual structure via tar's entry API
  const chunks: Buffer[] = [];
  const output = new PassThrough();

  const collectPromise = new Promise<Buffer>((resolve, reject) => {
    output.on('data', (chunk: Buffer) => chunks.push(chunk));
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);
  });

  const pack = createTar({ gzip: true }, []);

  // Add each file to the tar
  for (const [filePath, content] of files.entries()) {
    pack.add({ path: `${rootDir}/${filePath}` }, content);
  }

  pack.finalize();

  // Pipe tar → output
  pack.pipe(output);

  const buffer = await collectPromise;
  const hash = await sha256(buffer);

  return { buffer, sha256: hash };
}

// ─── Unpacking ─────────────────────────────────────────────────────────

/**
 * Unpack a gzipped tarball buffer with path traversal protection.
 * Returns file map and any rejected paths.
 */
export async function unpackSkill(
  buffer: Buffer,
): Promise<{ files: FileMap; errors: string[] }> {
  const files: FileMap = new Map();
  const errors: string[] = [];

  return new Promise((resolve, reject) => {
    const parser = extract({
      onentry: (entry: { path: string }) => {
        if (!validateTarPath(entry.path)) {
          errors.push(`Path traversal rejected: ${entry.path}`);
          return;
        }

        const chunks: Buffer[] = [];
        (entry as unknown as NodeJS.ReadableStream).on('data', (chunk: Buffer) =>
          chunks.push(chunk),
        );
        (entry as unknown as NodeJS.ReadableStream).on('end', () => {
          files.set(entry.path, Buffer.concat(chunks));
        });
      },
    });

    parser.on('finish', () => resolve({ files, errors }));
    parser.on('error', reject);

    const stream = Readable.from(buffer);
    stream.pipe(parser as unknown as NodeJS.WritableStream);
    stream.on('error', reject);

    // Need to add a data listener or the stream won't flow
    stream.resume();
  });
}
