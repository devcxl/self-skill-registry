import type { User, UserToken } from './types/db';
import { sha256Hex, generateToken } from './utils/crypto';

/** User and token repository operations */
export class UserRepository {
  constructor(private db: D1Database) {}

  // ── Users ─────────────────────────────────────────────────────────

  /** Find or create user from OIDC login */
  async findOrCreateUser(params: {
    provider: string;
    sub: string;
    displayName?: string;
    email?: string;
  }): Promise<User> {
    // Try to find existing user
    const existing = await this.db
      .prepare('SELECT * FROM users WHERE oidc_provider = ? AND oidc_sub = ?')
      .bind(params.provider, params.sub)
      .first<User>();

    if (existing) {
      // Update display name if changed
      await this.db
        .prepare('UPDATE users SET display_name = ?, email = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind(params.displayName || null, params.email || null, existing.id)
        .run();
      return { ...existing, display_name: params.displayName || existing.display_name, email: params.email || existing.email };
    }

    // Create new user
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        'INSERT INTO users (id, oidc_provider, oidc_sub, display_name, email, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
      )
      .bind(id, params.provider, params.sub, params.displayName || null, params.email || null, now, now)
      .run();

    return {
      id,
      oidc_provider: params.provider,
      oidc_sub: params.sub,
      display_name: params.displayName || null,
      email: params.email || null,
      is_admin: 0,
      created_at: now,
      updated_at: now,
    };
  }

  /** Get user by ID */
  async getUser(id: string): Promise<User | null> {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  }

  /** Get user by token hash */
  async getUserByTokenHash(tokenHash: string): Promise<User | null> {
    const token = await this.db
      .prepare(
        'SELECT u.* FROM users u JOIN user_tokens t ON u.id = t.user_id WHERE t.token_hash = ?',
      )
      .bind(tokenHash)
      .first<User>();
    return token || null;
  }

  /** Set admin status */
  async setAdmin(userId: string, isAdmin: boolean): Promise<void> {
    await this.db
      .prepare('UPDATE users SET is_admin = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(isAdmin ? 1 : 0, userId)
      .run();
  }

  /** List all users */
  async listUsers(): Promise<User[]> {
    const result = await this.db
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all<User>();
    return result.results;
  }

  // ── Tokens ────────────────────────────────────────────────────────

  /** Create a token for a user. Returns the plaintext token (show once only). */
  async createToken(userId: string, label = 'default'): Promise<{
    token: string;
    record: UserToken;
  }> {
    const rawToken = generateToken();
    const tokenHash = await sha256Hex(rawToken);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'INSERT INTO user_tokens (id, user_id, token_hash, label, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(id, userId, tokenHash, label, now)
      .run();

    return {
      token: rawToken,
      record: { id, user_id: userId, token_hash: tokenHash, label, created_at: now },
    };
  }

  /** List tokens for a user (only shows metadata, not the raw token) */
  async listTokens(userId: string): Promise<UserToken[]> {
    const result = await this.db
      .prepare('SELECT id, user_id, label, created_at FROM user_tokens WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<UserToken>();
    return result.results;
  }

  /** Delete a token */
  async deleteToken(tokenId: string, userId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM user_tokens WHERE id = ? AND user_id = ?')
      .bind(tokenId, userId)
      .run();
  }

  /** Verify a bearer token and return the user */
  async verifyToken(rawToken: string): Promise<User | null> {
    const hash = await sha256Hex(rawToken);
    return this.getUserByTokenHash(hash);
  }
}
