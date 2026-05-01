export interface LayoutProps {
  title: string;
  children?: unknown;
}

/** Base layout with Tailwind CDN, navigation, and footer */
export function Layout({ title, children }: LayoutProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — Skill Registry</title>
        <script src="https://cdn.tailwindcss.com" />
      </head>
      <body class="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
        <nav class="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" class="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition">
              Skill Registry
            </a>
            <button id="theme-toggle" class="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition" aria-label="Toggle dark mode">
              <svg class="hidden dark:block h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg class="dark:hidden h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>
          </div>
        </nav>

        <main class="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
          {children}
        </main>

        <footer class="bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
          Skill Registry — Internal Use
        </footer>
        <script dangerouslySetInnerHTML={{ __html: `
          if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
          }
          document.getElementById('theme-toggle')?.addEventListener('click', function() {
            document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
          });
        ` }} />
      </body>
    </html>
  );
}
