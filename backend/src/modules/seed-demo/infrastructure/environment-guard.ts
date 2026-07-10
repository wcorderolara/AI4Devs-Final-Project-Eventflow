// EnvironmentGuard (US-085 SEC-01/SEC-02, EC-03). Gate de seguridad: el seed SOLO corre con
// `SEED_DEMO_ENABLED=true` y `NODE_ENV !== production`. Falla → exit code 2, sin escrituras.

export interface EnvSafetyResult {
  safe: boolean;
  reason?: string;
}

export function assertEnvSafety(input: {
  NODE_ENV: string;
  SEED_DEMO_ENABLED?: string;
}): EnvSafetyResult {
  if (input.NODE_ENV === 'production') {
    return { safe: false, reason: 'Seed disabled for current environment' };
  }
  if (input.SEED_DEMO_ENABLED !== 'true') {
    return { safe: false, reason: 'Seed disabled (SEED_DEMO_ENABLED!=true)' };
  }
  return { safe: true };
}
