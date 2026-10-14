// Subconjunto de configuración que necesita el logger. Vive aparte de `env.ts` porque ese módulo
// valida TODA la config del servidor al importarse, y los CLIs (seed, jobs manuales) usan el
// logger sin definir `SESSION_SECRET`, `CORS_ORIGINS`, etc. `env.ts` reutiliza estos campos, así
// que el servidor los sigue validando junto con sus reglas de producción (`superRefine`).
import { z } from 'zod';

// Boolean robusto desde string de entorno (US-094). `z.coerce.boolean()` es un footgun: convierte
// CUALQUIER string no vacío a `true` (Boolean('false') === true). Este parser interpreta el texto.
export const booleanFromEnv = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.trim().toLowerCase());
  return v;
}, z.boolean());

export const loggingConfigFields = {
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  LOG_PRETTY: booleanFromEnv.default(false),
  LOG_INCLUDE_PII: booleanFromEnv.default(false),
};

export const loggingConfig = z.object(loggingConfigFields).parse(process.env);
