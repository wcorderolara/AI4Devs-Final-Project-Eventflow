import type { AbstractIntlMessages } from 'next-intl';
import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isSupportedLocale, type Locale } from './config';

// Catálogos transversales (Doc 15 §31.3). Import estático (catálogos pequeños): robusto y
// testeable en Vitest y Next sin depender del context dinámico de webpack (Deviation D2).
import enAdmin from '../../messages/en/admin.json';
import enAi from '../../messages/en/ai.json';
import enAuth from '../../messages/en/auth.json';
import enBudget from '../../messages/en/budget.json';
import enCommon from '../../messages/en/common.json';
import enErrors from '../../messages/en/errors.json';
import enEvents from '../../messages/en/events.json';
import enNavigation from '../../messages/en/navigation.json';
import enProfile from '../../messages/en/profile.json';
import enTasks from '../../messages/en/tasks.json';
import enValidation from '../../messages/en/validation.json';
import enVendor from '../../messages/en/vendor.json';
import esEsAdmin from '../../messages/es-ES/admin.json';
import esEsAi from '../../messages/es-ES/ai.json';
import esEsAuth from '../../messages/es-ES/auth.json';
import esEsBudget from '../../messages/es-ES/budget.json';
import esEsCommon from '../../messages/es-ES/common.json';
import esEsErrors from '../../messages/es-ES/errors.json';
import esEsEvents from '../../messages/es-ES/events.json';
import esEsNavigation from '../../messages/es-ES/navigation.json';
import esEsProfile from '../../messages/es-ES/profile.json';
import esEsTasks from '../../messages/es-ES/tasks.json';
import esEsValidation from '../../messages/es-ES/validation.json';
import esEsVendor from '../../messages/es-ES/vendor.json';
import esLatamAdmin from '../../messages/es-LATAM/admin.json';
import esLatamAi from '../../messages/es-LATAM/ai.json';
import esLatamAuth from '../../messages/es-LATAM/auth.json';
import esLatamBudget from '../../messages/es-LATAM/budget.json';
import esLatamCommon from '../../messages/es-LATAM/common.json';
import esLatamErrors from '../../messages/es-LATAM/errors.json';
import esLatamEvents from '../../messages/es-LATAM/events.json';
import esLatamNavigation from '../../messages/es-LATAM/navigation.json';
import esLatamProfile from '../../messages/es-LATAM/profile.json';
import esLatamTasks from '../../messages/es-LATAM/tasks.json';
import esLatamValidation from '../../messages/es-LATAM/validation.json';
import esLatamVendor from '../../messages/es-LATAM/vendor.json';
import ptAdmin from '../../messages/pt/admin.json';
import ptAi from '../../messages/pt/ai.json';
import ptAuth from '../../messages/pt/auth.json';
import ptBudget from '../../messages/pt/budget.json';
import ptCommon from '../../messages/pt/common.json';
import ptErrors from '../../messages/pt/errors.json';
import ptEvents from '../../messages/pt/events.json';
import ptNavigation from '../../messages/pt/navigation.json';
import ptProfile from '../../messages/pt/profile.json';
import ptTasks from '../../messages/pt/tasks.json';
import ptValidation from '../../messages/pt/validation.json';
import ptVendor from '../../messages/pt/vendor.json';

export type Messages = Record<string, unknown>;

const REGISTRY: Record<Locale, Messages> = {
  'es-LATAM': {
    common: esLatamCommon,
    navigation: esLatamNavigation,
    errors: esLatamErrors,
    validation: esLatamValidation,
    auth: esLatamAuth,
    profile: esLatamProfile,
    events: esLatamEvents,
    admin: esLatamAdmin,
    ai: esLatamAi,
    tasks: esLatamTasks,
    budget: esLatamBudget,
    vendor: esLatamVendor,
  },
  'es-ES': {
    common: esEsCommon,
    navigation: esEsNavigation,
    errors: esEsErrors,
    validation: esEsValidation,
    auth: esEsAuth,
    profile: esEsProfile,
    events: esEsEvents,
    admin: esEsAdmin,
    ai: esEsAi,
    tasks: esEsTasks,
    budget: esEsBudget,
    vendor: esEsVendor,
  },
  pt: {
    common: ptCommon,
    navigation: ptNavigation,
    errors: ptErrors,
    validation: ptValidation,
    auth: ptAuth,
    profile: ptProfile,
    events: ptEvents,
    admin: ptAdmin,
    ai: ptAi,
    tasks: ptTasks,
    budget: ptBudget,
    vendor: ptVendor,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    errors: enErrors,
    validation: enValidation,
    auth: enAuth,
    profile: enProfile,
    events: enEvents,
    admin: enAdmin,
    ai: enAi,
    tasks: enTasks,
    budget: enBudget,
    vendor: enVendor,
  },
};

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
export function loadMessages(locale: Locale): Messages {
  if (locale === defaultLocale) return REGISTRY[defaultLocale];
  return deepMerge(REGISTRY[defaultLocale], REGISTRY[locale]);
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
    messages: loadMessages(locale) as unknown as AbstractIntlMessages,
    getMessageFallback: createMessageFallback(locale, process.env.NODE_ENV !== 'production'),
  };
});
