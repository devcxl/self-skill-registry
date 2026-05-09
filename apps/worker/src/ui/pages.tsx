import { Layout } from './layout';
import type { SkillResponse, User } from '../types/db';

/** Home page with hero band and featured skills */
export function HomePage({ skills, user }: { skills: SkillResponse[]; user?: User | null }) {
  return (
    <Layout title="Home" user={user}>
      {/* ── Hero Band ──────────────────────────────── */}
      <section class="text-center max-w-2xl mx-auto mb-16">
        <h1 class="font-display text-display-xl text-ink mb-6">
          Skill Registry
        </h1>
        <p class="text-lg text-muted mb-10 leading-relaxed max-w-xl mx-auto">
          Internal skill marketplace for AI coding agents. Browse, evaluate, and
          install skills for OpenCode, Claude Code, and Codex.
        </p>
        <div class="flex justify-center items-center gap-5">
          <a
            href="/skills"
            class="inline-flex items-center px-5 py-3 bg-primary text-on-primary rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
          >
            Browse Skills
          </a>
          <span class="text-muted text-sm">{skills.length} skills available</span>
        </div>
      </section>

      {/* ── Recent Skills Grid ─────────────────────── */}
      {skills.length > 0 && (
        <section>
          <h2 class="font-display text-display-sm text-ink mb-8">
            Recent Skills
          </h2>
          <SkillGrid skills={skills.slice(0, 6)} />
        </section>
      )}
    </Layout>
  );
}

/** Skills list page with search */
export function SkillsPage({
  skills,
  total,
  query,
  user,
}: {
  skills: SkillResponse[];
  total: number;
  query?: { q?: string; category?: string; page?: number; perPage?: number };
  user?: User | null;
}) {
  return (
    <Layout title="Skills" user={user}>
      <div class="mb-10">
        <h1 class="font-display text-display-md text-ink mb-2">Skills</h1>
        <p class="text-muted">{total} skill(s) available</p>
      </div>

      {/* ── Search Form ────────────────────────────── */}
      <form action="/skills" method="get" class="mb-10 flex gap-3">
        <input
          type="text"
          name="q"
          value={query?.q || ''}
          placeholder="Search skills…"
          class="flex-grow px-3.5 py-2.5 bg-canvas text-ink text-sm border border-hairline rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
        />
        <button
          type="submit"
          class="inline-flex items-center px-5 py-2.5 bg-primary text-on-primary rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
        >
          Search
        </button>
      </form>

      <SkillGrid skills={skills} />
    </Layout>
  );
}

/** Skill detail page */
export function SkillDetailPage({ skill, user }: { skill: SkillResponse; user?: User | null }) {
  return (
    <Layout title={skill.name} user={user}>
      <div class="mb-10">
        <a
          href="/skills"
          class="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1"
        >
          ← Back to Skills
        </a>
        <h1 class="font-display text-display-md text-ink mt-3 mb-2">{skill.name}</h1>
        <p class="text-bodycopy leading-relaxed">{skill.description}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Details Card (feature-card) ──────────── */}
        <div class="bg-surface-card rounded-lg p-8">
          <h2 class="font-sans text-lg font-medium text-ink mb-6">Details</h2>
          <dl class="space-y-4">
            <DetailRow label="Version" value={skill.latestVersion} mono />
            <DetailRow label="Score" value={`${skill.latestScore}/100`} />
            <DetailRow label="Status" value={skill.reviewStatus} badge />
            <DetailRow label="Compatibility" value={skill.compatibility.join(', ')} />
            {skill.category && <DetailRow label="Category" value={skill.category} />}
          </dl>
        </div>

        {/* ── Install Card (code-window-card) ──────── */}
        <div class="bg-surface-dark rounded-lg p-6">
          <h2 class="font-sans text-lg font-medium text-on-dark mb-6">Install</h2>
          <p class="text-on-dark-soft text-xs mb-1.5">CLI command</p>
          <pre class="bg-surface-dark-soft text-on-dark p-4 rounded-md text-sm font-mono overflow-x-auto mb-5 leading-relaxed">
            npx skills add devcxl/self-skill-registry --skill {skill.name}
          </pre>
          <p class="text-on-dark-soft text-xs mb-1.5">Direct download</p>
          <a
            href={`/v1/skills/${skill.name}/download?version=${skill.latestVersion}`}
            class="text-primary text-sm font-medium hover:underline"
          >
            Download tarball
          </a>
        </div>
      </div>
    </Layout>
  );
}

/** Error page */
export function ErrorPage({ title, message, user }: { title: string; message: string; user?: User | null }) {
  return (
    <Layout title={title} user={user}>
      <div class="text-center py-16 max-w-md mx-auto">
        <h1 class="font-display text-display-sm text-ink mb-4">{title}</h1>
        <p class="text-muted mb-8">{message}</p>
        <a
          href="/"
          class="inline-flex items-center px-5 py-3 bg-canvas text-ink border border-hairline rounded-md text-sm font-medium hover:bg-surface-soft transition-colors"
        >
          ← Back to Home
        </a>
      </div>
    </Layout>
  );
}

// ─── Shared Components ────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: boolean;
}) {
  return (
    <div>
      <dt class="text-xs font-medium text-muted uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd class={`text-bodycopy ${mono ? 'font-mono text-sm' : ''}`}>
        {badge ? (
          <span class="inline-flex items-center px-3 py-1 text-xs font-medium rounded-pill bg-surface-cream-strong text-ink">
            {value}
          </span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function SkillGrid({ skills }: { skills: SkillResponse[] }) {
  if (skills.length === 0) {
    return (
      <div class="text-center py-12 text-muted bg-surface-soft rounded-lg">
        No skills found.
      </div>
    );
  }

  return (
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {skills.map((skill) => (
        <a
          href={`/skills/${skill.name}`}
          class="block bg-surface-card rounded-lg p-6 hover:bg-surface-cream-strong transition-colors group"
        >
          <div class="flex items-start justify-between mb-3">
            <h3 class="font-sans font-medium text-ink truncate pr-2 group-hover:text-primary transition-colors">
              {skill.name}
            </h3>
            <span
              class={`shrink-0 inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-pill ${
                skill.latestScore >= 80
                  ? 'bg-success/15 text-success'
                  : skill.latestScore >= 60
                    ? 'bg-accent-amber/15 text-accent-amber'
                    : 'bg-error/15 text-error'
              }`}
            >
              {skill.latestScore}
            </span>
          </div>
          <p class="text-sm text-muted line-clamp-2 mb-4 leading-relaxed">
            {skill.description}
          </p>
          <div class="flex flex-wrap gap-1.5">
            {(skill.tags || []).slice(0, 3).map((tag) => (
              <span class="inline-flex items-center px-2.5 py-0.5 text-xs rounded-pill bg-canvas text-muted">
                {tag}
              </span>
            ))}
          </div>
          <div class="mt-4 text-xs text-muted-soft">
            v{skill.latestVersion} · {skill.compatibility.join(', ')}
          </div>
        </a>
      ))}
    </div>
  );
}
