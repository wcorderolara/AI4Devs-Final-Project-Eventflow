// Fuente única de verdad de los locales soportados (VR-01). Cualquier consumo de "locale válido"
// pasa por este archivo. Doc 15 §31.1 / FR-I18N-001 / NFR-I18N-001.

export const locales = ['es-LATAM', 'es-ES', 'pt', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es-LATAM';

// Cookie técnica de preferencia UX (no de sesión): no HTTP-only, SameSite=Lax, Secure en prod,
// sin PII, sin firma, Max-Age 1 año (Doc 15 §31.2 / SEC-02).
export const cookieName = 'eventflow_locale';

// Etiquetas nativas por locale (el switcher muestra cada idioma en su propio nombre).
export const localeLabels: Record<Locale, string> = {
  'es-LATAM': 'Español (LATAM)',
  'es-ES': 'Español (España)',
  pt: 'Português',
  en: 'English',
} as const;

/** Type guard: valida un string arbitrario (cookie/header) contra la whitelist de locales. */
export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}
