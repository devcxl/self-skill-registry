import { Layout } from './layout';
import type { SkillResponse } from '../types/db';

/** Home page showing featured skills */
export function HomePage({ skills }: { skills: SkillResponse[] }) {
  return (
    <Layout title="Home">
      <div class="text-center py-12">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">Skill Registry</h1>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Internal skill marketplace for AI coding agents. Browse, evaluate, and install
          skills for OpenCode, Claude Code, and Codex.
        </p>
        <div class="flex justify-center gap-4">
          <a href="/skills" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Browse Skills
          </a>
          <span class="text-gray-600 dark:text-gray-400 text-sm self-center">
            {skills.length} skills available
          </span>
        </div>
      </div>
      {skills.length > 0 && (
        <div class="mt-8">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Recent Skills</h2>
          <SkillGrid skills={skills.slice(0, 6)} />
        </div>
      )}
    </Layout>
  );
}

/** Skills list page with search */
export function SkillsPage({ skills, total, query }: {
  skills: SkillResponse[];
  total: number;
  query?: { q?: string; category?: string; page?: number; perPage?: number };
}) {
  return (
    <Layout title="Skills">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Skills</h1>
        <p class="text-gray-600 dark:text-gray-400">{total} skill(s) available</p>
      </div>

      <form action="/skills" method="get" class="mb-6 flex gap-2">
        <input type="text" name="q" value={query?.q || ''}
          placeholder="Search skills..."
          class="flex-grow px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Search
        </button>
      </form>

      <SkillGrid skills={skills} />
    </Layout>
  );
}

/** Skill detail page */
export function SkillDetailPage({ skill }: { skill: SkillResponse }) {
  return (
    <Layout title={skill.name}>
      <div class="mb-8">
        <a href="/skills" class="text-blue-600 dark:text-blue-400 hover:underline text-sm">← Back to Skills</a>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mt-2">{skill.name}</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">{skill.description}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Details</h2>
          <dl class="space-y-3">
            <DetailRow label="Version" value={skill.latestVersion} mono />
            <DetailRow label="Score" value={`${skill.latestScore}/100`} />
            <DetailRow label="Status" value={skill.reviewStatus} badge />
            <DetailRow label="Compatibility" value={skill.compatibility.join(', ')} />
            {skill.category && <DetailRow label="Category" value={skill.category} />}
          </dl>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Install</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">npx skills</p>
          <pre class="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto mb-4">
            npx skills add devcxl/self-skill-registry --skill {skill.name}
          </pre>
          <p class="text-sm text-gray-500 mb-1">Direct download</p>
          <a href={`/v1/skills/${skill.name}/download?version=${skill.latestVersion}`}
            class="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            Download tarball
          </a>
        </div>
      </div>
    </Layout>
  );
}

/** Error page */
export function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <Layout title={title}>
      <div class="text-center py-12">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h1>
        <p class="text-gray-600 dark:text-gray-400">{message}</p>
        <a href="/" class="mt-6 inline-block text-blue-600 dark:text-blue-400 hover:underline">← Back to Home</a>
      </div>
    </Layout>
  );
}

// ─── Shared Components ─────────────────────────────────────────────────

function DetailRow({ label, value, mono, badge }: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: boolean;
}) {
  return (
    <div>
      <dt class="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd class={`text-gray-900 dark:text-gray-100 ${mono ? 'font-mono' : ''}`}>
        {badge
          ? <span class="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{value}</span>
          : value}
      </dd>
    </div>
  );
}

function SkillGrid({ skills }: { skills: SkillResponse[] }) {
  if (skills.length === 0) {
      return <div class="text-center py-8 text-gray-500 dark:text-gray-400">No skills found.</div>;
  }

  return (
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {skills.map((skill) => (
        <a href={`/skills/${skill.name}`}
          class="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition">
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate">{skill.name}</h3>
            <span class={`text-xs px-2 py-0.5 rounded-full ${
              skill.latestScore >= 80 ? 'bg-green-100 text-green-700' :
              skill.latestScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>{skill.latestScore}</span>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{skill.description}</p>
          <div class="mt-3 flex gap-1 flex-wrap">
            {(skill.tags || []).slice(0, 3).map((tag) => (
              <span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{tag}</span>
            ))}
          </div>
          <div class="mt-3 text-xs text-gray-400 dark:text-gray-500">
            v{skill.latestVersion} · {skill.compatibility.join(', ')}
          </div>
        </a>
      ))}
    </div>
  );
}
