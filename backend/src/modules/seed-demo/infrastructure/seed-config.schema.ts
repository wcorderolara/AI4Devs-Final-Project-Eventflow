import { z } from 'zod';

// SeedConfigSchema (US-085 VR-01). Valida las envs requeridas por el runner ANTES de tocar la BD.
// El gate de seguridad (`SEED_DEMO_ENABLED`, `NODE_ENV`) lo aplica `EnvironmentGuard` con estos valores.
export const SeedConfigSchema = z.object({
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL debe ser una URL válida' }),
  SEED_DEMO_ENABLED: z.string().optional(),
  LLM_PROVIDER: z.enum(['mock', 'openai', 'anthropic']).default('mock'),
  NODE_ENV: z.enum(['development', 'test', 'demo', 'staging', 'production']).default('development'),
});

export type SeedConfig = z.infer<typeof SeedConfigSchema>;

export function parseSeedConfig(env: NodeJS.ProcessEnv): SeedConfig {
  return SeedConfigSchema.parse({
    DATABASE_URL: env.DATABASE_URL,
    SEED_DEMO_ENABLED: env.SEED_DEMO_ENABLED,
    LLM_PROVIDER: env.LLM_PROVIDER,
    NODE_ENV: env.NODE_ENV,
  });
}
