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

export const configSchema = z.object({
  // APP
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // DATABASE
  DATABASE_URL: z.string().url(),

  // AUTH
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // SESSION (US-094 / PB-P0-004 — ADR-SEC-002 cookie HTTP-only firmada)
  SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().min(1).default('eventflow_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168), // 7 días
  // `Secure` fuera de desarrollo local (§9 API Contract). Default derivado de NODE_ENV en el
  // cookie helper cuando esta var no se define explícitamente. Usa `booleanFromEnv` (no
  // `z.coerce.boolean`) para que 'false' se interprete como `false` y no como `true`.
  SESSION_COOKIE_SECURE: booleanFromEnv.optional(),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15), // EC-06 TTL 15 min
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12), // SEC-05

  // AI
  LLM_PROVIDER: z.enum(['openai', 'mock', 'anthropic']),
  OPENAI_API_KEY: z.string().optional(),
  // US-097 (PB-P0-004): timeout del provider; modo demo (habilita fallback a mock); rate limit AI.
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  AI_DEMO_MODE: booleanFromEnv.default(false),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

  // SECURITY
  CORS_ORIGINS: z.string(),
  CAPTCHA_PROVIDER: z.enum(['recaptcha', 'mock']),
  CAPTCHA_SECRET: z.string().optional(),
  HELMET_ENABLED: z.coerce.boolean().default(true),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5),
  JSON_BODY_LIMIT: z.string().default('1mb'),
  FILE_SIZE_LIMIT: z.coerce.number().default(5242880),

  // LOGGING
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // SEED
  SEED_ENABLED: z.coerce.boolean().default(false),
});

/** Tipo estático de configuración inferido del schema Zod. */
export type AppConfig = z.infer<typeof configSchema>;

/**
 * Valida y parsea las variables de entorno. Exportada por separado del singleton `config`
 * para permitir tests unitarios aislados (sin side effects). Lanza `ZodError` si la
 * configuración es inválida.
 */
export function parseConfig(env: NodeJS.ProcessEnv): AppConfig {
  return configSchema.parse(env);
}

/**
 * Configuración validada del proceso. Se parsea al importar el módulo: cualquier consumidor
 * (`app.ts`, `server.ts`) recibe una config ya validada o el proceso falla al arranque.
 */
export const config: AppConfig = parseConfig(process.env);
