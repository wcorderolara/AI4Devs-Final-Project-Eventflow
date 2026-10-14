import type { AbstractIntlMessages } from 'next-intl';
import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isSupportedLocale, type Locale } from './config';

export type Messages = Record<string, unknown>;

// Catálogos transversales (Doc 15 §31.3): namespace → archivo `src/messages/<locale>/<archivo>.json`.
// Se cargan con `import()` por locale × namespace; Next y Vitest resuelven el mismo path relativo.
const NAMESPACE_FILES = {
  common: 'common',
  navigation: 'navigation',
  errors: 'errors',
  validation: 'validation',
  auth: 'auth',
  profile: 'profile',
  events: 'events',
  admin: 'admin',
  ai: 'ai',
  tasks: 'tasks',
  budget: 'budget',
  vendor: 'vendor',
  publicVendor: 'public-vendor',
  quotes: 'quotes',
  organizer: 'organizer',
  booking: 'booking',
  // US-071 (PB-P2-004): catálogo del surface organizer de notificaciones.
  notifications: 'notifications',
} as const;

async function loadCatalog(locale: Locale): Promise<Messages> {
  const entries = await Promise.all(
    Object.entries(NAMESPACE_FILES).map(async ([namespace, file]) => {
      const mod = (await import(`../../messages/${locale}/${file}.json`)) as { default: Messages };
      return [namespace, mod.default] as const;
    }),
  );
  const catalog: Messages = Object.fromEntries(entries);
  // La feature `tasks/list` (US-027..US-033) consume el namespace raíz `checklist`, no
  // `tasks.checklist`; sin esta entrada todas sus etiquetas caían al `getMessageFallback` y la
  // pantalla del checklist mostraba rutas de clave crudas (`checklist.title`). Se expone el
  // subárbol bajo ambas rutas en vez de reescribir ~15 `useTranslations` y sus tests.
  catalog.checklist = (catalog.tasks as Messages).checklist;
  return catalog;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Merge profundo: `override` sobre `base`. Las claves ausentes en `override` conservan `base`. */
export function deepMerge(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    result[key] =
      isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return result;
}

/**
 * Mensajes del locale mergeados sobre la base `es-LATAM`: cualquier clave faltante en el locale
 * activo cae automáticamente a la traducción `es-LATAM` (fallback en producción sin `[ES-LATAM]`).
 */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const base = await loadCatalog(defaultLocale);
  if (locale === defaultLocale) return base;
  return deepMerge(base, await loadCatalog(locale));
}

/**
 * `getMessageFallback` para claves ausentes incluso en `es-LATAM`:
 * - dev: clave anotada `[<locale>] <namespace>.<key>` (alerta visual del gap).
 * - prod: la ruta de la clave (silencioso; el merge ya resolvió las traducciones existentes).
 */
export function createMessageFallback(
  locale: Locale,
  isDev: boolean,
): (info: { key: string; namespace?: string }) => string {
  return ({ key, namespace }) => {
    const path = [namespace, key].filter(Boolean).join('.');
    return isDev ? `[${locale}] ${path}` : path;
  };
}

/** Resuelve el locale server-side: header `x-locale` (middleware) → cookie → default. */
function resolveServerLocale(): Locale {
  const fromHeader = headers().get('x-locale');
  if (isSupportedLocale(fromHeader)) return fromHeader;
  const fromCookie = cookies().get('eventflow_locale')?.value;
  if (isSupportedLocale(fromCookie)) return fromCookie;
  return defaultLocale;
}

// App Router sin i18n routing (sin prefijo URL — Doc 15 §17/§31.2): el request config resuelve el
// locale a partir del header propagado por el middleware.
export default getRequestConfig(async () => {
  const locale = resolveServerLocale();
  return {
    locale,
    // `loadMessages` opera sobre `Record<string, unknown>` para el merge; el shape es compatible
    // con `AbstractIntlMessages` (valores string / objetos anidados) — cast en el borde.
    messages: (await loadMessages(locale)) as unknown as AbstractIntlMessages,
    getMessageFallback: createMessageFallback(locale, process.env.NODE_ENV !== 'production'),
  };
});
