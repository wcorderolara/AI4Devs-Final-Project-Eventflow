import { cookieName, defaultLocale, isSupportedLocale, type Locale } from './config';
import { mapToBcp47 } from './format';

/**
 * Utilidad outbound: devuelve el header `Accept-Language` para propagar el locale activo al
 * backend (Doc 15 §31.4 / FR-I18N-005 / BR-AI-011). Lista para inyectarse como interceptor del
 * `httpClient` (US-106). El valor se serializa al tag BCP-47 efectivo (`es-LATAM → es-419`).
 *
 * - Server: pasar el `locale` explícito (p. ej. `await getLocale()` de `next-intl/server`).
 * - Cliente: llamar sin argumento → lee la cookie `eventflow_locale`.
 * - Sin locale resoluble → `defaultLocale`.
 */
export function attachLocaleHeader(locale?: Locale): { 'Accept-Language': string } {
  const resolved = locale ?? readClientLocale();
  return { 'Accept-Language': mapToBcp47(resolved) };
}

function readClientLocale(): Locale {
  if (typeof document === 'undefined') return defaultLocale;
  const match = document.cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]+)`));
  const value = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  return isSupportedLocale(value) ? value : defaultLocale;
}
