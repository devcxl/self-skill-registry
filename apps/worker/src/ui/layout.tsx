export interface LayoutProps {
  title: string;
  children?: unknown;
}

export function Layout({ title, children }: LayoutProps) {
  return (
    <html lang="zh-CN">
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
                Browse
              </a>
              <a
                href="/settings"
                class="text-sm font-medium text-ink hover:text-primary transition-colors"
              >
                Settings
              </a>
              <a
                href="/admin"
                class="text-sm font-medium text-ink hover:text-primary transition-colors"
              >
                Admin
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
            <p class="text-sm">Internal tool for AI coding agent skills</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
