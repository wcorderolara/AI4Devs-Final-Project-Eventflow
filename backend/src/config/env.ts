// Carga y validación de configuración de entorno con Zod (US-089 / BE-002).
// Fail-fast: si una variable requerida falta o es inválida, `parseConfig` lanza `ZodError`
// con mensaje descriptivo (EC-01, EC-02). La validación se ejecuta antes de montar rutas o
// conectar Prisma (ver `server.ts`). Categorías per Doc 14 §27.
import { z } from 'zod';

// Boolean robusto desde string de entorno (US-094). `z.coerce.boolean()` es un footgun: convierte
// CUALQUIER string no vacío a `true` (Boolean('false') === true). Este parser interpreta el texto.
const booleanFromEnv = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.trim().toLowerCase());
  return v;
}, z.boolean());

// `SameSite` case-insensitive desde entorno (US-108 / BE-001). Normaliza a minúsculas para el
// enum. `Lax`/`LAX`/`lax` → 'lax'. ADR-SEC-002 / ADR-SEC-006.
const sameSiteFromEnv = z.preprocess((v) => {
  if (typeof v === 'string') return v.trim().toLowerCase();
  return v;
}, z.enum(['lax', 'none', 'strict']));

export const configSchema = z.object({
  // APP
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // DATABASE
  DATABASE_URL: z.string().url(),

  // AUTH
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // SESSION (US-094 / PB-P0-004; US-108 / PB-P0-006 — ADR-SEC-002 cookie HTTP-only firmada)
  // VR-01: secreto de firma requerido, mínimo 32 bytes (fail-fast en boot).
  SESSION_SECRET: z.string().min(32),
  // Nombre de la cookie. Default `eventflow_session` (override técnico documentado permitido por
  // US-108; el default nominal `eventflow.sid` de la spec se sustituye por este valor ya en uso
  // en US-094 y en el snapshot OpenAPI congelado). Sigue siendo configurable.
  SESSION_COOKIE_NAME: z.string().min(1).default('eventflow_session'),
  // VR-05 (US-108): vigencia de sesión/cookie en días. Default 30 (decisión formalizada
  // PB-P0-006; reemplaza el `SESSION_TTL_HOURS=168`/7 días de US-094). Fuente única para el
  // `Max-Age` de la cookie y el `expiresAt` de la sesión server-side.
  SESSION_COOKIE_MAX_AGE_DAYS: z.coerce.number().int().positive().default(30),
  // `Secure` fuera de desarrollo local (§9 API Contract; VR-02). Default derivado de NODE_ENV en
  // el cookie helper cuando esta var no se define explícitamente. Usa `booleanFromEnv` (no
  // `z.coerce.boolean`) para que 'false' se interprete como `false` y no como `true`.
  SESSION_COOKIE_SECURE: booleanFromEnv.optional(),
  // SameSite por entorno (US-108 / VR-03). Default `lax` (MVP same-site). `none` exige `Secure`
  // y CORS con credentials + allowlist explícita (validado en `superRefine`). `strict` disponible.
  SESSION_COOKIE_SAMESITE: sameSiteFromEnv.default('lax'),
  // TTL 30 min (US-004 / Decisión PO #4 — override formal sobre los 15 min de Doc 19 §11).
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12), // SEC-05

  // AI
  LLM_PROVIDER: z.enum(['openai', 'mock', 'anthropic']),
  OPENAI_API_KEY: z.string().optional(),
  // US-118 (PB-P0-009): config backend-only de OpenAIProvider. Opcionales a nivel env para no
  // romper el boot en modo mock/demo; su presencia se valida en `resolveOpenAIConfig` cuando
  // `LLM_PROVIDER=openai` (AC-02/VR-01/VR-02 → AIProviderNotConfiguredError). Nunca frontend/públicas.
  OPENAI_MODEL: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  // US-097 (PB-P0-004): timeout del provider; modo demo (habilita fallback a mock); rate limit AI.
  // US-123 (PB-P0-011 / VR-01, AC-01): default de timeout de la política oficial = 60000 ms
  // (PO Decision 8.1 #9, BR-AI-009). Reemplaza el placeholder 8000 de US-097.
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  AI_DEMO_MODE: booleanFromEnv.default(false),
  // US-123 (PB-P0-011): habilita fallback a MockAIProvider fuera de demo-mode (VR-03). Sólo `mock`.
  AI_USE_MOCK_FALLBACK: booleanFromEnv.default(false),
  // US-123 (PB-P0-011 / SEC-04): logging de payloads AI. Prohibido en demo/producción (fail-fast).
  AI_LOG_PAYLOADS: booleanFromEnv.default(false),
  // Rate limit IA (US-097; US-110 / PB-P0-007). US-110 fija el default MVP en 10 generaciones por
  // usuario autenticado agregadas por ventana de 1 h (key `ai:user:{userId}`). VR-01: entero positivo.
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(3_600_000),

  // SECURITY
  CORS_ORIGINS: z.string(), // allowlist explícita separada por comas (US-091; VR-04)
  // CORS con credenciales (US-108 / VR-04). Requerido `true` cuando `SameSite=None` (cross-site).
  // Prohibido combinar `true` con wildcard `*` (EC-04). Default `true` (comportamiento US-091).
  CORS_CREDENTIALS: booleanFromEnv.default(true),
  // CAPTCHA (US-091; US-109 / PB-P0-006 — ADR-SEC-004). Provider por entorno + secretos backend.
  CAPTCHA_PROVIDER: z.enum(['mock', 'recaptcha', 'hcaptcha']),
  // Legacy genérico (US-091). Conservado por compatibilidad; los providers reales usan las vars
  // provider-específicas de abajo. No requerido.
  CAPTCHA_SECRET: z.string().optional(),
  // Secretos backend por proveedor real (US-109 / VR-05). Requeridos según `CAPTCHA_PROVIDER`
  // (validado en `superRefine`). NUNCA `NEXT_PUBLIC_*` — sólo backend/Secrets Manager (SEC-02).
  RECAPTCHA_SECRET_KEY: z.string().optional(),
  HCAPTCHA_SECRET_KEY: z.string().optional(),
  // Umbral de score reCAPTCHA v3 (US-109 / VR-08). Rango 0..1; default técnico 0.5.
  CAPTCHA_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),
  // Timeout corto de verificación con el proveedor real (US-109 / EC-05). Default 3000 ms.
  CAPTCHA_VERIFY_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  HELMET_ENABLED: z.coerce.boolean().default(true),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5), // legacy US-091 (authRateLimit genérico)
  // RATE LIMITING estricto por endpoint (US-110 / PB-P0-007 — ADR-SEC-004). VR-01: enteros positivos
  // (fail-fast en boot ante 0/negativos/no numéricos). Defaults MVP = contrato de QA/Demo.
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600_000), // 10 min
  AUTH_REGISTER_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_REGISTER_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600_000), // 10 min
  AUTH_PASSWORD_RESET_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),
  AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(3_600_000), // 1 h
  // Rate limit del confirm de reset `/auth/password/reset` (US-004: 5/IP/10min — Doc 19 §6).
  AUTH_PASSWORD_RESET_CONFIRM_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_PASSWORD_RESET_CONFIRM_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600_000),
  // CAPTCHA CONDICIONAL en /auth/login (US-003 / PB-P1-003 — Decisión PO US-003 #1/#2):
  // se exige captcha a partir de N fallos consecutivos por IP+email dentro de la ventana.
  AUTH_LOGIN_CAPTCHA_THRESHOLD: z.coerce.number().int().positive().default(3),
  AUTH_LOGIN_ATTEMPT_WINDOW_MS: z.coerce.number().int().positive().default(600_000), // 10 min
  // Interruptor de enforcement (US-110 / N3). Default `true` (activo en Local/CI/QA/Demo/prod). El
  // setup global de tests lo pone en `false` para no contaminar la suite; los tests de US-110 lo
  // activan explícitamente. NUNCA debe desactivarse en Demo/producción de forma silenciosa.
  RATE_LIMIT_ENABLED: booleanFromEnv.default(true),
  JSON_BODY_LIMIT: z.string().default('1mb'),
  FILE_SIZE_LIMIT: z.coerce.number().default(5242880),

  // FILE STORAGE (US-043 / PB-P1-026): abstracción `FileStoragePort` con adapter local por MVP.
  // `local` escribe en `FILE_STORAGE_PATH`. Adapters `s3`/`gcs` quedan como futuro (ADR pendiente).
  FILE_STORAGE_DRIVER: z.enum(['local']).default('local'),
  FILE_STORAGE_PATH: z.string().min(1).default('./storage/uploads'),

  // LOGGING
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // SEED
  SEED_ENABLED: z.coerce.boolean().default(false),
  // US-086 (PB-P0-014): flag operativo del reset surgical Demo (Doc 14 §15.2 SEED, THR-012). Por
  // defecto `false`; sólo `true` en dev/qa/demo. Gate de registro de la ruta `/admin/seed/*`
  // (con flag off la ruta NO se monta → 404 natural). Coexiste con `SEED_ENABLED` (gate genérico
  // del arranque del seed) y con el gate del CLI `EnvironmentGuard`. `booleanFromEnv` interpreta
  // 'true'/'1'/'yes'/'on'; nunca convierte 'false' a `true`.
  SEED_DEMO_ENABLED: booleanFromEnv.default(false),
  // US-086 (PB-P0-014): tamaño de lote de los deletes surgicales del reset (`$transaction` chunked).
  SEED_BATCH_SIZE: z.coerce.number().int().positive().default(1000),

  // JOBS — US-015 / PB-P1-009 (ADR-BE-004 Simple Scheduled Jobs).
  // `JOBS_ENABLED` gobierna el registro de schedulers intra-proceso: sólo la réplica con `true`
  // programa jobs (EC-03, SEC-01..04). Default `false` para evitar duplicación silenciosa en
  // multi-instancia y para que los tests no arranquen schedulers reales. `booleanFromEnv`
  // interpreta 'true'/'1'/'yes'/'on'; NUNCA convierte 'false' a `true` (contraste con
  // `z.coerce.boolean`).
  JOBS_ENABLED: booleanFromEnv.default(false),
  // Cadencia del `AutoCompletePastEventsJob` como parámetro operativo. Default `30 0 * * *`
  // (00:30 UTC diario, decisión PO 8.1 #6). `docs/14` ofrece `0 * * * *` como opción; la
  // validación real de la expresión la hace `node-cron` en el adapter (fail-fast en bootstrap).
  JOBS_AUTOCOMPLETE_CRON: z.string().min(1).default('30 0 * * *'),
});

/** `Secure` efectivo: explícito si se define; si no, activo en producción (no-local). */
function resolveSecure(secure: boolean | undefined, nodeEnv: string): boolean {
  return secure ?? nodeEnv === 'production';
}

/** Wildcard de CORS: cualquier origin de la lista es `*`. */
function corsIsWildcard(origins: string): boolean {
  return origins
    .split(',')
    .map((o) => o.trim())
    .some((o) => o === '*');
}

/**
 * Validación cruzada fail-fast de configuración de cookie/sesión/CORS (US-108 / BE-001; AC-06).
 * Cubre VR-02, VR-03, VR-04 y EC-03/EC-04. Cualquier configuración insegura hace fallar el boot
 * con un `ZodError` de mensaje claro (el proceso no levanta un backend con cookies inseguras).
 * Se aplica sobre `configSchema` (que se conserva como `ZodObject` para exponer `.shape` a
 * consumidores como el test de `.env.example`).
 */
const validatedConfigSchema = configSchema.superRefine((cfg, ctx) => {
  const secure = resolveSecure(cfg.SESSION_COOKIE_SECURE, cfg.NODE_ENV);
  const isNonLocal = cfg.NODE_ENV === 'production';
  const wildcardCors = corsIsWildcard(cfg.CORS_ORIGINS);

  // VR-02 (EC-03): en entornos no-locales (producción/QA/Demo) `Secure=true` es obligatorio.
  if (isNonLocal && cfg.SESSION_COOKIE_SECURE === false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SESSION_COOKIE_SECURE'],
      message: 'SESSION_COOKIE_SECURE debe ser true en entornos no-locales (NODE_ENV=production).',
    });
  }

  // VR-03 (EC-03): `SameSite=None` exige `Secure=true` (requisito del navegador).
  if (cfg.SESSION_COOKIE_SAMESITE === 'none' && !secure) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SESSION_COOKIE_SAMESITE'],
      message: 'SESSION_COOKIE_SAMESITE=none requiere SESSION_COOKIE_SECURE=true.',
    });
  }

  // VR-04: `SameSite=None` (cross-site) exige CORS con credentials y allowlist explícita (no wildcard).
  if (cfg.SESSION_COOKIE_SAMESITE === 'none') {
    if (!cfg.CORS_CREDENTIALS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_CREDENTIALS'],
        message: 'SESSION_COOKIE_SAMESITE=none requiere CORS_CREDENTIALS=true (envío cross-site de cookies).',
      });
    }
    if (wildcardCors) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGINS'],
        message: 'SESSION_COOKIE_SAMESITE=none requiere CORS_ORIGINS con allowlist explícita (sin wildcard "*").',
      });
    }
  }

  // EC-04: wildcard CORS con credenciales es una combinación insegura prohibida.
  if (wildcardCors && cfg.CORS_CREDENTIALS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CORS_ORIGINS'],
      message: 'CORS_ORIGINS wildcard "*" no puede combinarse con CORS_CREDENTIALS=true.',
    });
  }

  // ── Captcha (US-109 / BE-001; AC-04, EC-06) ────────────────────────────────
  // VR-04 (EC-06): `mock` sólo se permite en Local/CI; nunca en entornos no-locales.
  if (cfg.CAPTCHA_PROVIDER === 'mock' && isNonLocal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CAPTCHA_PROVIDER'],
      message: 'CAPTCHA_PROVIDER=mock no está permitido en entornos no-locales (NODE_ENV=production).',
    });
  }
  // VR-05: cada proveedor real exige su secret key backend.
  if (cfg.CAPTCHA_PROVIDER === 'recaptcha' && !cfg.RECAPTCHA_SECRET_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['RECAPTCHA_SECRET_KEY'],
      message: 'CAPTCHA_PROVIDER=recaptcha requiere RECAPTCHA_SECRET_KEY.',
    });
  }
  if (cfg.CAPTCHA_PROVIDER === 'hcaptcha' && !cfg.HCAPTCHA_SECRET_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['HCAPTCHA_SECRET_KEY'],
      message: 'CAPTCHA_PROVIDER=hcaptcha requiere HCAPTCHA_SECRET_KEY.',
    });
  }

  // ── AI execution: timeout/fallback (US-123 / PB-P0-011; AC-03, AC-07, SEC-04) ─────────────────
  // El repo usa NODE_ENV; la matriz de la historia se mapea: demo ≈ AI_DEMO_MODE=true;
  // production-academic ≈ NODE_ENV=production. La misma lógica vive en `validateAIExecutionConfig`
  // (path tipado AI_CONFIG_INVALID); aquí se aplica como fail-fast de boot (ZodError).
  // SEC-04: AI_LOG_PAYLOADS=true prohibido en demo-academic y production-academic.
  if (cfg.AI_LOG_PAYLOADS && (isNonLocal || cfg.AI_DEMO_MODE)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['AI_LOG_PAYLOADS'],
      message: 'AI_LOG_PAYLOADS=true no está permitido en demo (AI_DEMO_MODE=true) ni producción (NODE_ENV=production).',
    });
  }
  // AC-03 / VR-04: en producción el fallback no puede ser silencioso — flags de fallback deben estar off.
  if (isNonLocal && cfg.AI_USE_MOCK_FALLBACK) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['AI_USE_MOCK_FALLBACK'],
      message: 'AI_USE_MOCK_FALLBACK=true no está permitido en producción (NODE_ENV=production): el fallback no puede ser silencioso.',
    });
  }
  if (isNonLocal && cfg.AI_DEMO_MODE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['AI_DEMO_MODE'],
      message: 'AI_DEMO_MODE=true no está permitido en producción (NODE_ENV=production).',
    });
  }
});

/** Tipo estático de configuración inferido del schema Zod. */
export type AppConfig = z.infer<typeof configSchema>;

/**
 * Valida y parsea las variables de entorno. Exportada por separado del singleton `config`
 * para permitir tests unitarios aislados (sin side effects). Lanza `ZodError` si la
 * configuración es inválida.
 */
export function parseConfig(env: NodeJS.ProcessEnv): AppConfig {
  return validatedConfigSchema.parse(env);
}

/**
 * Configuración validada del proceso. Se parsea al importar el módulo: cualquier consumidor
 * (`app.ts`, `server.ts`) recibe una config ya validada o el proceso falla al arranque.
 */
export const config: AppConfig = parseConfig(process.env);
