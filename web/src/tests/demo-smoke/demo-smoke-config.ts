// US-146 · PB-P3-007 · QA-001/QA-008/SEC-001
// Resolución + validación (pura, testeable) de la configuración del smoke contra la URL pública
// Demo. Centraliza VR-01 (baseURL pública configurable), VR-02 (credenciales por env/secretos,
// nunca hardcodeadas) y la topología real (frontend Amplify + backend App Runner en hosts
// distintos). Sin dependencias de Playwright: se usa desde la config, el globalSetup y un unit
// test de Vitest (negativos NT-02 deterministas, sin entorno real).

/** Nombres de las variables de entorno del smoke (inyectadas por secretos, nunca hardcodeadas). */
export const DEMO_SMOKE_ENV = {
  /** URL pública del frontend Demo (Amplify) — `baseURL` de Playwright. */
  baseUrl: 'DEMO_SMOKE_BASE_URL',
  /** URL pública base del backend Demo (App Runner) — para el precheck `GET /health`. */
  apiUrl: 'DEMO_SMOKE_API_URL',
  /** Email del usuario sembrado (organizer) usado en el login real. */
  email: 'DEMO_SMOKE_ORGANIZER_EMAIL',
  /** Password del usuario sembrado — solo por secreto/env. */
  password: 'DEMO_SMOKE_ORGANIZER_PASSWORD',
} as const;

/** Configuración resuelta y válida del smoke (todos los campos presentes y bien formados). */
export interface DemoSmokeConfig {
  /** URL pública del frontend Demo (sin `/` final). */
  baseUrl: string;
  /** URL pública base del backend Demo (sin `/` final). */
  apiUrl: string;
  /** Credenciales del usuario sembrado. */
  organizerEmail: string;
  organizerPassword: string;
}

/** Resultado de resolver la configuración desde el entorno. */
export interface DemoSmokeResolution {
  /** `true` si al menos `DEMO_SMOKE_BASE_URL` está presente (hay intención de correr el smoke). */
  configured: boolean;
  /** Config válida y completa (solo cuando `configured` y sin `error`). */
  config?: DemoSmokeConfig;
  /** Variables ausentes (para mensajes de skip/fail-fast). */
  missing: string[];
  /** Razón de fail-fast cuando la config está presente pero es inválida/incompleta (VR-01/VR-02). */
  error?: string;
}

/** URL http(s) pública: descarta protocolos no web y hosts locales (AC-01: nunca localhost). */
export function isPublicHttpUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);
  if (LOCAL_HOSTS.has(host)) return false;
  // `*.local` y hosts sin punto (no FQDN) tampoco son URLs Demo públicas.
  if (host.endsWith('.local')) return false;
  return true;
}

/** Redacta una URL a `protocol//host` (nunca expone credenciales embebidas ni query) — SEC-03. */
export function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '<invalid-url>';
  }
}

/** Normaliza una URL base quitando el `/` final para concatenar rutas de forma predecible. */
function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Resuelve la configuración del smoke desde `env` de forma pura y determinista:
 *  - Sin `DEMO_SMOKE_BASE_URL` → `configured=false` (el smoke se salta limpiamente; dev local/PR).
 *  - Con base URL pero URL inválida/localhost → `error` (VR-01, fail-fast).
 *  - Con base URL pero faltan API URL o credenciales → `error` (VR-02/VR-04, fail-fast).
 *  - Todo presente y válido → `config`.
 */
export function resolveDemoSmokeConfig(env: Record<string, string | undefined>): DemoSmokeResolution {
  const rawBaseUrl = env[DEMO_SMOKE_ENV.baseUrl]?.trim();
  const rawApiUrl = env[DEMO_SMOKE_ENV.apiUrl]?.trim();
  const organizerEmail = env[DEMO_SMOKE_ENV.email]?.trim();
  const organizerPassword = env[DEMO_SMOKE_ENV.password]?.trim();

  // No configurado en absoluto → skip limpio (sin falso rojo). El resto de vars se reporta como
  // ausente para un mensaje informativo, pero no es un error mientras falte la base URL.
  if (!rawBaseUrl) {
    const missing: string[] = [DEMO_SMOKE_ENV.baseUrl];
    if (!rawApiUrl) missing.push(DEMO_SMOKE_ENV.apiUrl);
    if (!organizerEmail) missing.push(DEMO_SMOKE_ENV.email);
    if (!organizerPassword) missing.push(DEMO_SMOKE_ENV.password);
    return { configured: false, missing };
  }

  // VR-01: la base URL debe ser una URL pública http(s), nunca localhost (AC-01).
  if (!isPublicHttpUrl(rawBaseUrl)) {
    return {
      configured: true,
      missing: [],
      error: `${DEMO_SMOKE_ENV.baseUrl} debe ser una URL pública http(s) (no localhost). Recibido: "${redactUrl(rawBaseUrl)}" (VR-01 / AC-01).`,
    };
  }

  // VR-04 precondición: sin API URL no se puede hacer el precheck de `GET /health`.
  if (!rawApiUrl) {
    return {
      configured: true,
      missing: [DEMO_SMOKE_ENV.apiUrl],
      error: `Falta ${DEMO_SMOKE_ENV.apiUrl} (URL pública del backend Demo) requerida para el precheck GET /health (VR-04).`,
    };
  }
  if (!isPublicHttpUrl(rawApiUrl)) {
    return {
      configured: true,
      missing: [],
      error: `${DEMO_SMOKE_ENV.apiUrl} debe ser una URL pública http(s) (no localhost). Recibido: "${redactUrl(rawApiUrl)}" (VR-01).`,
    };
  }

  // VR-02: credenciales requeridas cuando hay base URL → fail-fast si faltan (nunca hardcodeadas).
  const missingCreds: string[] = [];
  if (!organizerEmail) missingCreds.push(DEMO_SMOKE_ENV.email);
  if (!organizerPassword) missingCreds.push(DEMO_SMOKE_ENV.password);
  if (missingCreds.length > 0) {
    return {
      configured: true,
      missing: missingCreds,
      error: `Faltan credenciales demo (VR-02): ${missingCreds.join(', ')}. Inyéctalas por secretos/env, nunca hardcodeadas.`,
    };
  }

  return {
    configured: true,
    missing: [],
    config: {
      baseUrl: stripTrailingSlash(rawBaseUrl),
      apiUrl: stripTrailingSlash(rawApiUrl),
      organizerEmail: organizerEmail!,
      organizerPassword: organizerPassword!,
    },
  };
}
