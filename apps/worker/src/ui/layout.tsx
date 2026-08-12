import type { User } from '../types/db';
import type { TFunction } from '../i18n';

export interface LayoutProps {
  title: string;
  children?: unknown;
  user?: User | null;
  t: TFunction;
}

export function Layout({ title, children, user, t }: LayoutProps) {
  const locale = t.locale;
  return (
    <html lang={locale === 'zh' ? 'zh-CN' : 'en'}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — Skill Registry</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600&family=Inter:ital,opsz,wght@0,14..32,400..600&family=JetBrains+Mono:ital,wght@0,400;0,500&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
tailwind.config = {
  theme: {
    extend: {
      colors: {
        canvas: '#faf9f5',
        primary: { DEFAULT: '#cc785c', active: '#a9583e', disabled: '#e6dfd8' },
        ink: '#141413',
        bodycopy: '#3d3d3a',
        'body-strong': '#252523',
        muted: '#6c6a64',
        'muted-soft': '#8e8b82',
        hairline: '#e6dfd8',
        'hairline-soft': '#ebe6df',
        'surface-soft': '#f5f0e8',
        'surface-card': '#efe9de',
        'surface-cream-strong': '#e8e0d2',
        'surface-dark': '#181715',
        'surface-dark-elevated': '#252320',
        'surface-dark-soft': '#1f1e1b',
        'on-primary': '#ffffff',
        'on-dark': '#faf9f5',
        'on-dark-soft': '#a09d96',
        'accent-teal': '#5db8a6',
        'accent-amber': '#e8a55a',
        success: '#5db872',
        error: '#c64545',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"EB Garamond"', 'Garamond', '"Times New Roman"', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '400' }],
        'display-lg': ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '400' }],
        'display-md': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '400' }],
        'display-sm': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '400' }],
      },
    },
  },
}
          `.trim(),
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
.readme-content { color: #3d3d3a; line-height: 1.8; font-size: 15px; }
.readme-content h1 { font-size: 1.8em; font-weight: 600; margin: 1.5em 0 0.6em; color: #141413; }
.readme-content h2 { font-size: 1.4em; font-weight: 600; margin: 1.3em 0 0.5em; color: #141413; padding-bottom: 0.3em; border-bottom: 1px solid #e6dfd8; }
.readme-content h3 { font-size: 1.15em; font-weight: 600; margin: 1.2em 0 0.4em; color: #252523; }
.readme-content p { margin-bottom: 0.8em; }
.readme-content ul, .readme-content ol { margin: 0.5em 0 0.8em 1.5em; }
.readme-content li { margin-bottom: 0.3em; }
.readme-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; background: #f5f0e8; padding: 0.15em 0.4em; border-radius: 4px; }
.readme-content pre { background: #181715; color: #faf9f5; padding: 1em 1.2em; border-radius: 8px; overflow-x: auto; margin: 1em 0; font-size: 13px; line-height: 1.6; }
.readme-content pre code { background: none; padding: 0; color: inherit; }
.readme-content table { width: 100%; border-collapse: collapse; margin: 1em 0; }
.readme-content th { text-align: left; font-weight: 600; padding: 0.6em 0.8em; border-bottom: 2px solid #e6dfd8; background: #f5f0e8; }
.readme-content td { padding: 0.5em 0.8em; border-bottom: 1px solid #ebe6df; }
.readme-content blockquote { margin: 1em 0; padding: 0.5em 1em; border-left: 3px solid #cc785c; background: #faf9f5; color: #6c6a64; }
.readme-content a { color: #cc785c; text-decoration: underline; }
.readme-content hr { border: none; border-top: 1px solid #e6dfd8; margin: 1.5em 0; }
.readme-content img { max-width: 100%; border-radius: 8px; }
            `.trim(),
          }}
        />
      </head>
      <body class="bg-canvas text-bodycopy min-h-screen flex flex-col font-sans antialiased">
        {/* ── Top Navigation ──────────────────────────────── */}
        <nav class="bg-canvas border-b border-hairline h-16">
          <div class="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
            <a href="/" class="flex items-center gap-2.5 text-ink group select-none">
              <svg
                class="h-4 w-4 text-ink shrink-0"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle cx="8" cy="8" r="2.5" fill="currentColor" />
                <path
                  d="M8 0.5V5.5M8 10.5V15.5M0.5 8H5.5M10.5 8H15.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              <span class="font-display text-xl tracking-tight text-ink">Skill Registry</span>
            </a>
            <div class="flex items-center gap-6">
              <a
                href="/skills"
                class="text-sm font-medium text-ink hover:text-primary transition-colors"
              >
                {t('nav.browse')}
              </a>
              {user && (
                <a
                  href="/settings"
                  class="text-sm font-medium text-ink hover:text-primary transition-colors"
                >
                  {t('nav.settings')}
                </a>
              )}
              {user && user.is_admin === 1 && (
                <a
                  href="/admin"
                  class="text-sm font-medium text-ink hover:text-primary transition-colors"
                >
                  {t('nav.admin')}
                </a>
              )}
              {/* Language switcher */}
              <a
                href={`?lang=${locale === 'zh' ? 'en' : 'zh'}`}
                class="text-sm font-medium text-muted hover:text-primary transition-colors"
                title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
              >
                {locale === 'zh' ? 'EN' : '中文'}
              </a>
            </div>
          </div>
        </nav>

        {/* ── Content ─────────────────────────────────────── */}
        <main class="flex-grow max-w-6xl mx-auto px-4 py-12 lg:py-24 w-full">
          {children}
        </main>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer class="bg-surface-dark text-on-dark-soft">
          <div class="max-w-6xl mx-auto px-4 py-16 text-center">
            <div class="flex items-center justify-center gap-2.5 mb-3">
              <svg
                class="h-4 w-4 text-on-dark-soft shrink-0"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle cx="8" cy="8" r="2.5" fill="currentColor" />
                <path
                  d="M8 0.5V5.5M8 10.5V15.5M0.5 8H5.5M10.5 8H15.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              <span class="font-display text-lg tracking-tight text-on-dark">Skill Registry</span>
            </div>
            <p class="text-sm">{t('footer.tagline')}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
