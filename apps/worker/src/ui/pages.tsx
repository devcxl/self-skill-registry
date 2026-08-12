import { Layout } from './layout';
import type { SkillResponse, User } from '../types/db';
import type { TFunction } from '../i18n';

/** Home page with hero band and featured skills */
export function HomePage({
  skills,
  user,
  t,
}: {
  skills: SkillResponse[];
  user?: User | null;
  t: TFunction;
}) {
  return (
    <Layout title={t('nav.home')} user={user} t={t}>
      {/* ── Hero Band ──────────────────────────────── */}
      <section class="text-center max-w-2xl mx-auto mb-16">
        <h1 class="font-display text-display-xl text-ink mb-6">
          Skill Registry
        </h1>
        <p class="text-lg text-muted mb-10 leading-relaxed max-w-xl mx-auto">
          {t('home.hero')}
        </p>
        <div class="flex justify-center items-center gap-5">
          <a
            href="/skills"
            class="inline-flex items-center px-5 py-3 bg-primary text-on-primary rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
          >
            {t('home.browseCta')}
          </a>
          <span class="text-muted text-sm">{t('home.skillsAvailable', { n: skills.length })}</span>
        </div>
      </section>

      {/* ── Recent Skills Grid ─────────────────────── */}
      {skills.length > 0 && (
        <section>
          <h2 class="font-display text-display-sm text-ink mb-8">
            {t('home.recentSkills')}
          </h2>
          <SkillGrid skills={skills} t={t} />
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
  t,
}: {
  skills: SkillResponse[];
  total: number;
  query?: { q?: string; category?: string; page?: number; perPage?: number };
  user?: User | null;
  t: TFunction;
}) {
  return (
    <Layout title={t('skills.title')} user={user} t={t}>
      <div class="mb-10">
        <h1 class="font-display text-display-md text-ink mb-2">{t('skills.title')}</h1>
        <p class="text-muted">{t('skills.count', { n: total })}</p>
      </div>

      {/* ── Search Form ────────────────────────────── */}
      <form action="/skills" method="get" class="mb-10 flex gap-3">
        <input
          type="text"
          name="q"
          value={query?.q || ''}
          placeholder={t('skills.searchPlaceholder')}
          class="flex-grow px-3.5 py-2.5 bg-canvas text-ink text-sm border border-hairline rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
        />
        <button
          type="submit"
          class="inline-flex items-center px-5 py-2.5 bg-primary text-on-primary rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
        >
          {t('skills.search')}
        </button>
      </form>

      <SkillGrid skills={skills} t={t} />
    </Layout>
  );
}

/** Skill detail page */
export function SkillDetailPage({
  skill,
  user,
  t,
}: {
  skill: SkillResponse;
  user?: User | null;
  t: TFunction;
}) {
  return (
    <Layout title={skill.name} user={user} t={t}>
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
          <h2 class="font-sans text-lg font-medium text-ink mb-6">{t('detail.details')}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <dl class="space-y-4">
              <DetailRow label={t('detail.version')} value={skill.latestVersion} mono />
              <DetailRow label={t('detail.score')} value={`${skill.latestScore}/100`} />
              <DetailRow label={t('detail.status')} value={skill.reviewStatus} badge />
              <DetailRow label={t('detail.compatibility')} value={skill.compatibility.join(', ')} />
              {skill.category && <DetailRow label={t('detail.category')} value={skill.category} />}
            </dl>
            {skill.categoryScores && (
              <div>
                <h3 class="font-sans text-sm font-medium text-ink mb-2">{t('detail.scoresByCategory')}</h3>
                <ScoreRadar scores={skill.categoryScores} />
              </div>
            )}
          </div>
        </div>

        {/* ── Install Card (code-window-card) ──────── */}
        <div class="bg-surface-dark rounded-lg p-6">
          <h2 class="font-sans text-lg font-medium text-on-dark mb-6">{t('detail.install')}</h2>
          <p class="text-on-dark-soft text-xs mb-1.5">{t('detail.cliCommand')}</p>
          <pre class="bg-surface-dark-soft text-on-dark p-4 rounded-md text-sm font-mono overflow-x-auto mb-5 leading-relaxed">
            npx skills add devcxl/self-skill-registry --skill {skill.name}
          </pre>
          <p class="text-on-dark-soft text-xs mb-1.5">{t('detail.directDownload')}</p>
          <a
            href={`/v1/skills/${skill.name}/download?version=${skill.latestVersion}`}
            class="text-primary text-sm font-medium hover:underline"
          >
            {t('detail.downloadTarball')}
          </a>
        </div>
      </div>

      {/* ── README Section ─────────────────────────── */}
      {skill.readme && (
        <div class="mt-10">
          <h2 class="font-display text-display-sm text-ink mb-6">{t('detail.readme')}</h2>
          <div class="bg-surface-card rounded-lg p-8">
            <script
              id="skill-readme"
              type="application/json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(skill.readme) }}
            ></script>
            <div id="readme-container" class="readme-content"></div>
            <script
              dangerouslySetInnerHTML={{
                __html: `
(function() {
  var data = JSON.parse(document.getElementById('skill-readme').textContent);
  document.getElementById('readme-container').innerHTML = marked.parse(data);
})();
                `.trim(),
              }}
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

/** Error page */
export function ErrorPage({
  title,
  message,
  user,
  t,
}: {
  title: string;
  message: string;
  user?: User | null;
  t: TFunction;
}) {
  return (
    <Layout title={title} user={user} t={t}>
      <div class="text-center py-16 max-w-md mx-auto">
        <h1 class="font-display text-display-sm text-ink mb-4">{title}</h1>
        <p class="text-muted mb-8">{message}</p>
        <a
          href="/"
          class="inline-flex items-center px-5 py-3 bg-canvas text-ink border border-hairline rounded-md text-sm font-medium hover:bg-surface-soft transition-colors"
        >
          {t('error.backHome')}
        </a>
      </div>
    </Layout>
  );
}

// ─── Shared Components ────────────────────────────────────────────────

/**
 * Category metadata for the radar chart — must match the evaluator rubric
 * (review-categories.ts in registry-core: criteria count × 4 per category).
 */
const REVIEW_CATEGORIES = [
  { id: 'functional-suitability', label: 'Functional', max: 12 },
  { id: 'reliability', label: 'Reliability', max: 12 },
  { id: 'performance', label: 'Performance', max: 8 },
  { id: 'usability-ai', label: 'AI Usability', max: 16 },
  { id: 'usability-human', label: 'Human UX', max: 8 },
  { id: 'security', label: 'Security', max: 12 },
  { id: 'maintainability', label: 'Maintainability', max: 12 },
  { id: 'agent-specific', label: 'Agent-Spec.', max: 20 },
] as const;

const RADAR_SIZE = 260;
const RADAR_CX = 130;
const RADAR_CY = 130;
const RADAR_R = 88;

/** Point on the radar at `ratio` (0–1) of the max radius, starting at top */
function radarPoint(index: number, ratio: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / REVIEW_CATEGORIES.length;
  return {
    x: RADAR_CX + RADAR_R * ratio * Math.cos(angle),
    y: RADAR_CY + RADAR_R * ratio * Math.sin(angle),
  };
}

/** Radar (spider) chart of the 8 evaluation dimensions, pure SVG, no deps */
function ScoreRadar({ scores }: { scores: Record<string, number> }) {
  const toPoints = (ratio: number) =>
    REVIEW_CATEGORIES.map((_, i) => {
      const p = radarPoint(i, ratio);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ');

  const dataPoints = REVIEW_CATEGORIES.map((cat, i) =>
    radarPoint(i, Math.min((scores[cat.id] ?? 0) / cat.max, 1)),
  );
  const dataPolygon = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
      class="w-full max-w-[280px] mx-auto"
      role="img"
      aria-label="Category scores radar chart"
    >
      {/* grid rings: 25% / 50% / 75% / 100% */}
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          points={toPoints(ring)}
          fill="none"
          class="text-hairline"
          stroke="currentColor"
          stroke-width="1"
        />
      ))}
      {/* axes */}
      {REVIEW_CATEGORIES.map((_, i) => {
        const p = radarPoint(i, 1);
        return (
          <line
            x1={RADAR_CX}
            y1={RADAR_CY}
            x2={p.x}
            y2={p.y}
            class="text-hairline"
            stroke="currentColor"
            stroke-width="1"
          />
        );
      })}
      {/* data polygon */}
      <polygon
        points={dataPolygon}
        class="text-primary"
        fill="currentColor"
        fill-opacity="0.18"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      />
      {/* vertex dots + labels */}
      {REVIEW_CATEGORIES.map((cat, i) => {
        const p = dataPoints[i];
        const labelP = radarPoint(i, 1.34);
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / REVIEW_CATEGORIES.length;
        const anchor =
          Math.cos(angle) > 0.25 ? 'start' : Math.cos(angle) < -0.25 ? 'end' : 'middle';
        const score = scores[cat.id] ?? 0;
        return (
          <g key={cat.id}>
            <circle cx={p.x} cy={p.y} r="3" class="text-primary" fill="currentColor" />
            <text
              x={labelP.x}
              y={labelP.y}
              text-anchor={anchor}
              class="text-muted"
              fill="currentColor"
              font-size="10"
              font-family="Inter, sans-serif"
            >
              {cat.label}
              <tspan
                x={labelP.x}
                dy="10"
                class="text-muted-soft"
                fill="currentColor"
                font-size="9"
              >
                {' '}
                {score}/{cat.max}
              </tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

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

function SkillGrid({ skills, t }: { skills: SkillResponse[]; t: TFunction }) {
  if (skills.length === 0) {
    return (
      <div class="text-center py-12 text-muted bg-surface-soft rounded-lg">
        {t('skills.empty')}
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
