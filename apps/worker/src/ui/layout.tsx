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
      <body class="bg-gray-50 min-h-screen flex flex-col">
        <nav class="bg-white shadow-sm border-b">
          <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" class="text-xl font-bold text-gray-900 hover:text-blue-600 transition">
              Skill Registry
            </a>
            <div class="flex gap-4 text-sm text-gray-600">
              <a href="/skills" class="hover:text-blue-600">Skills</a>
            </div>
          </div>
        </nav>

        <main class="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
          {children}
        </main>

        <footer class="bg-white border-t py-4 text-center text-sm text-gray-400">
          Skill Registry — Internal Use
        </footer>
      </body>
    </html>
  );
}
