// Setup de Vitest (US-089 / EMERGENT-001).
// El singleton `config` de `src/config/env.ts` se parsea al importar el módulo (patrón exigido
// por la Tech Spec §7). Para que Supertest pueda importar `app` y los tests unitarios importar
// `parseConfig` sin que el parse eager falle, se poblan defaults seguros de test.
// Se usa `??=`: un valor real ya presente en el entorno (p. ej. `DATABASE_URL` de una BD de
// test/CI) SIEMPRE gana. Estos valores son dummy y no contienen secretos reales.
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/eventflow_test?schema=public';
process.env.JWT_SECRET ??= 'test_jwt_secret_min_32_characters_long_xx';
process.env.SESSION_SECRET ??= 'test_session_secret_min_32_characters_long_xx';
process.env.LLM_PROVIDER ??= 'mock';
process.env.CORS_ORIGINS ??= 'http://localhost:3000';
process.env.CAPTCHA_PROVIDER ??= 'mock';
