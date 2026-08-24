/**
 * Lightweight i18n for the Worker UI — no external dependencies.
 *
 * Locale resolution order:
 *   1. `?lang=en|zh` query param (also persists via cookie)
 *   2. `skill_registry_lang` cookie
 *   3. `Accept-Language` header (zh* → zh)
 *   4. Default: en
 */

import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { HonoEnv } from '../types/bindings';
import { MESSAGES, type Locale } from './messages';

export const LOCALE_COOKIE = 'skill_registry_lang';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const VALID_LOCALES: Locale[] = ['en', 'zh'];

function isLocale(value: string | undefined): value is Locale {
  return value === 'en' || value === 'zh';
}

/** Resolve the request locale; persists a `?lang=` choice into a cookie */
export function detectLocale(c: Context<HonoEnv>): Locale {
  const query = c.req.query('lang');
  if (isLocale(query)) {
    setCookie(c, LOCALE_COOKIE, query, {
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: 'Lax',
      secure: new URL(c.req.url).protocol === 'https:',
    });
    return query;
  }

  const cookie = getCookie(c, LOCALE_COOKIE);
  if (isLocale(cookie)) return cookie;

  const accept = c.req.header('accept-language') ?? '';
  if (/^\s*zh/i.test(accept)) return 'zh';

  return 'en';
}

export type TFunction = {
  (key: string, vars?: Record<string, string | number>): string;
  /** Locale of the bound messages */
  locale: Locale;
  /** URL for switching locale while preserving the current route/query */
  switchHref: string;
};

/** Build a translate function for the given locale and request URL */
export function createT(locale: Locale, currentUrl?: string): TFunction {
  const fn = ((key: string, vars?: Record<string, string | number>) => {
    let str = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  }) as TFunction;
  fn.locale = locale;
  const nextLocale = locale === 'zh' ? 'en' : 'zh';
  if (currentUrl) {
    const url = new URL(currentUrl);
    url.searchParams.set('lang', nextLocale);
    fn.switchHref = `${url.pathname}?${url.searchParams.toString()}`;
  } else {
    fn.switchHref = `?lang=${nextLocale}`;
  }
  return fn;
}

export function translateStatus(t: TFunction, status: string): string {
  const translated = t(`status.${status}`);
  return translated === `status.${status}` ? status : translated;
}

export { VALID_LOCALES };
