import type { Skill, SkillVersion, SkillReview } from './types/db';

// ─── D1 Database Access Layer ──────────────────────────────────────────

export class RegistryRepository {
  constructor(private db: D1Database) {}

  // ── Skills ───────────────────────────────────────────────────────

  /** List visible skills (approved + active by default) */
  async listSkills(options?: {
    status?: string;
    page?: number;
    perPage?: number;
    includeAll?: boolean;
  }): Promise<{ skills: Skill[]; total: number }> {
    const perPage = options?.perPage ?? 20;
    const page = options?.page ?? 1;
    const offset = (page - 1) * perPage;

    let whereClause = '';
    if (!options?.includeAll) {
      whereClause = "WHERE review_status = 'approved' AND lifecycle_status = 'active'";
    }
    if (options?.status) {
      whereClause = `WHERE review_status = ?`;
    }

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM skills ${whereClause}`)
      .bind(...(options?.status ? [options.status] : []))
      .first<{ count: number }>();

    const total = countResult?.count ?? 0;

    const result = await this.db
      .prepare(
        `SELECT * FROM skills ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...(options?.status ? [options.status] : []), perPage, offset)
      .all<Skill>();

    return { skills: result.results, total };
  }

  /** Get a single skill by name */
  async getSkill(name: string): Promise<Skill | null> {
    return this.db
      .prepare('SELECT * FROM skills WHERE name = ?')
      .bind(name)
      .first<Skill>();
  }

  /** List versions for a skill */
  async listVersions(skillName: string): Promise<SkillVersion[]> {
    const result = await this.db
      .prepare(
        'SELECT * FROM skill_versions WHERE skill_name = ? ORDER BY published_at DESC',
      )
      .bind(skillName)
      .all<SkillVersion>();
    return result.results;
  }

  /** Get a specific version */
  async getVersion(skillName: string, version: string): Promise<SkillVersion | null> {
    return this.db
      .prepare(
        'SELECT * FROM skill_versions WHERE skill_name = ? AND version = ?',
      )
      .bind(skillName, version)
      .first<SkillVersion>();
  }

  // ── Reviews ──────────────────────────────────────────────────────

  /** Get a review by ID */
  async getReview(id: string): Promise<SkillReview | null> {
    return this.db
      .prepare('SELECT * FROM skill_reviews WHERE id = ?')
      .bind(id)
      .first<SkillReview>();
  }

  /** List reviews for a skill */
  async listReviews(skillName: string): Promise<SkillReview[]> {
    const result = await this.db
      .prepare(
        'SELECT * FROM skill_reviews WHERE skill_name = ? ORDER BY created_at DESC',
      )
      .bind(skillName)
      .all<SkillReview>();
    return result.results;
  }

  // ── Search ───────────────────────────────────────────────────────

  /** Search skills by name, description, tags, or category */
  async search(query: {
    q?: string;
    category?: string;
    compat?: string;
    sort?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ skills: Skill[]; total: number }> {
    const perPage = query.perPage ?? 20;
    const page = query.page ?? 1;
    const offset = (page - 1) * perPage;

    const conditions: string[] = [
      "review_status = 'approved'",
      "lifecycle_status = 'active'",
    ];
    const params: unknown[] = [];

    if (query.q) {
      conditions.push(
        '(name LIKE ? OR description LIKE ? OR tags LIKE ? OR category LIKE ?)',
      );
      const searchTerm = `%${query.q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (query.category) {
      conditions.push('category = ?');
      params.push(query.category);
    }

    if (query.compat) {
      conditions.push('compatibility LIKE ?');
      params.push(`%${query.compat}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM skills ${whereClause}`)
      .bind(...params)
      .first<{ count: number }>();
    const total = countResult?.count ?? 0;

    // Sort
    let orderClause = 'ORDER BY updated_at DESC';
    switch (query.sort) {
      case 'name':
        orderClause = 'ORDER BY name ASC';
        break;
      case 'score':
        orderClause = 'ORDER BY latest_score DESC';
        break;
      case 'downloads':
        orderClause = 'ORDER BY (SELECT COUNT(*) FROM download_events WHERE download_events.skill_name = skills.name) DESC';
        break;
    }

    const result = await this.db
      .prepare(
        `SELECT * FROM skills ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      )
      .bind(...params, perPage, offset)
      .all<Skill>();

    return { skills: result.results, total };
  }

  // ── Downloads ────────────────────────────────────────────────────

  /** Record a download event (async, via waitUntil) */
  async recordDownload(
    skillName: string,
    version: string,
    metadata?: { ipHash?: string; userAgent?: string },
  ): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO download_events (skill_name, version, ip_hash, user_agent) VALUES (?, ?, ?, ?)',
      )
      .bind(skillName, version, metadata?.ipHash ?? null, metadata?.userAgent ?? null)
      .run();
  }
}
