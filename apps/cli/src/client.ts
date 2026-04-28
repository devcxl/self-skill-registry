import { getConfig } from './config';

// ─── Types ─────────────────────────────────────────────────────────────

export interface SkillInfo {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  compatibility: string[];
  latestVersion: string;
  latestScore: number;
}

export interface SearchResult {
  data: SkillInfo[];
  total: number;
  page: number;
  perPage: number;
}

export interface VersionInfo {
  version: string;
  sha256: string;
  size: number;
  publishedAt: string;
}

// ─── Client ────────────────────────────────────────────────────────────

export class RegistryClient {
  private baseUrl: string;
  private token: string | undefined;

  constructor() {
    const config = getConfig();
    this.baseUrl = (config.registry || 'http://localhost:8787').replace(/\/+$/, '');
    this.token = config.token;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { Accept: 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}/v1${path}`;
    const res = await fetch(url, { headers: this.headers() });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `HTTP ${res.status}: ${(err as { error?: string })?.error || res.statusText}`,
      );
    }

    return res.json() as Promise<T>;
  }

  /** Search skills */
  async search(query?: string): Promise<SearchResult> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    const qs = params.toString();
    return this.request<SearchResult>(`/search${qs ? '?' + qs : ''}`);
  }

  /** Get skill info */
  async info(name: string): Promise<SkillInfo> {
    return this.request<SkillInfo>(`/skills/${name}`);
  }

  /** Get skill versions */
  async versions(name: string): Promise<VersionInfo[]> {
    return this.request<VersionInfo[]>(`/skills/${name}/versions`);
  }

  /** Download a skill tarball and verify SHA */
  async download(name: string, version: string): Promise<{ buffer: ArrayBuffer; sha256: string }> {
    const url = `${this.baseUrl}/v1/skills/${name}/download?version=${version}`;
    const res = await fetch(url, { headers: this.headers() });

    if (!res.ok) {
      throw new Error(`Download failed: HTTP ${res.status}`);
    }

    const sha256 = res.headers.get('X-Skill-Sha256');
    const buffer = await res.arrayBuffer();

    return { buffer, sha256: sha256 || '' };
  }
}
