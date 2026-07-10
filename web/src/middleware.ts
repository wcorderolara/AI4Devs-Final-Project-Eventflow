import { match } from '@formatjs/intl-localematcher';
import { NextResponse, type NextRequest } from 'next/server';
import { roleGuardMiddleware } from '@/shared/authorization';
import { cookieName, defaultLocale, isSupportedLocale, locales, type Locale } from '@/shared/i18n/config';
import { mapToBcp47 } from '@/shared/i18n/format';

// BCP-47 efectivo ↔ locale interno. El matcher trabaja con tags válidos (`es-419`), no con la
// etiqueta lógica `es-LATAM`.
const BCP47_TO_LOCALE: Record<string, Locale> = {
  'es-419': 'es-LATAM',
  'es-ES': 'es-ES',
  pt: 'pt',
  en: 'en',
};

/** Parsea `Accept-Language` a una lista de tags ordenada por peso `q` (desc). */
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const segments = part.trim().split(';');
      const tag = (segments[0] ?? '').trim();
      const qParam = segments.slice(1).find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag, q: Number.isNaN(q) ? 0 : q };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag);
}

/**
 * Resuelve el locale (función pura, exportada para tests y composición en US-105):
 * cookie `eventflow_locale` (whitelist) → `Accept-Language` (best match BCP-47) → `defaultLocale`.
 */
export function resolveLocale(req: NextRequest): Locale {
  const cookieValue = req.cookies.get(cookieName)?.value;
  if (isSupportedLocale(cookieValue)) return cookieValue;

  const header = req.headers.get('accept-language');
  if (header) {
    try {
      const requested = parseAcceptLanguage(header);
      if (requested.length > 0) {
        const available = locales.map(mapToBcp47);
        const matched = match(requested, available, mapToBcp47(defaultLocale));
        return BCP47_TO_LOCALE[matched] ?? defaultLocale;
      }
    } catch {
      // Accept-Language malformado (EC-03 / NT-02) → fallback silencioso al default.
    }
  }
  return defaultLocale;
}

/**
 * Middleware de locale (US-104). Detecta el locale y lo propaga al request vía header `x-locale`
 * (consumido por `getRequestConfig`). NO redirige por prefijo URL; NO setea cookie automáticamente
 * (solo el switcher escribe); NO maneja autorización por rol (US-105 compondrá `roleGuardMiddleware`).
 */
export function localeMiddleware(req: NextRequest): NextResponse {
  const locale = resolveLocale(req);

  if (process.env.NODE_ENV !== 'production') {
    const source = isSupportedLocale(req.cookies.get(cookieName)?.value)
      ? 'cookie'
      : req.headers.get('accept-language')
        ? 'header'
        : 'default';
    // Solo el locale resuelto y la fuente; nunca el `Accept-Language` completo (SEC-05).
    // eslint-disable-next-line no-console
    console.info(`i18n.locale.resolved ${JSON.stringify({ locale, source })}`);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-locale', locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Composición del middleware (US-104 + US-105): `localeMiddleware → roleGuardMiddleware`.
 * El role guard (redirect UX) tiene prioridad; en pass-through se devuelve la response del locale
 * middleware (que preserva el header `x-locale` para el render server-side).
 */
export default function middleware(req: NextRequest): NextResponse {
  const localeResponse = localeMiddleware(req);
  const guardResponse = roleGuardMiddleware(req);
  return guardResponse ?? localeResponse;
}

export const config = {
  matcher: ['/((?!_next|static|api|favicon.ico|robots.txt|sitemap.xml).*)'],
};
