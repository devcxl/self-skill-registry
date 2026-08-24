import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { createT, detectLocale, translateStatus } from './index';

function localeApp() {
  const app = new Hono<HonoEnv>();
  app.get('/', (c) => c.json({ locale: detectLocale(c) }));
  return app;
}

describe('i18n', () => {
  it('resolves query, cookie, Accept-Language, then English fallback', async () => {
    const app = localeApp();

    const query = await app.request('http://localhost/?lang=zh');
    expect(((await query.json()) as { locale: string }).locale).toBe('zh');
    expect(query.headers.get('set-cookie')).toContain('skill_registry_lang=zh');

    const cookie = await app.request('http://localhost/', {
      headers: { Cookie: 'skill_registry_lang=zh' },
    });
    expect(((await cookie.json()) as { locale: string }).locale).toBe('zh');

    const header = await app.request('http://localhost/', {
      headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' },
    });
    expect(((await header.json()) as { locale: string }).locale).toBe('zh');

    const fallback = await app.request('http://localhost/');
    expect(((await fallback.json()) as { locale: string }).locale).toBe('en');
  });

  it('gives query parameters priority over the cookie', async () => {
    const app = localeApp();
    const response = await app.request('http://localhost/?lang=en', {
      headers: { Cookie: 'skill_registry_lang=zh' },
    });
    expect(((await response.json()) as { locale: string }).locale).toBe('en');
  });

  it('interpolates messages and preserves the current route/query when switching', () => {
    const t = createT('zh', 'https://registry.test/skills?q=foo&page=2');

    expect(t('home.skillsAvailable', { n: 3 })).toBe('共 3 个技能');
    expect(t.switchHref).toBe('/skills?q=foo&page=2&lang=en');
    expect(translateStatus(t, 'approved')).toBe('已通过');
  });
});
