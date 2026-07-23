// US-113 (PB-P2-010 / QA-002) — Unit tests de la validación Zod de env vars de
// logging + guards de seguridad (fail-fast al boot).
//
// Cubre:
//   * NT-01 `LOG_LEVEL=verbose` (fuera del enum) → fail-fast.
//   * NT-02 `LOG_PRETTY=true` en `NODE_ENV=production` → fail-fast (EC-02).
//   * NT-03 `LOG_INCLUDE_PII=true` en `test`/`production` → fail-fast (EC-03).
//   * Backward-compat: los valores previos (`info/warn/debug/error`) siguen
//     siendo válidos.
//   * Nuevos niveles Pino (`trace`, `fatal`, `silent`) son aceptados.
//   * `LOG_PRETTY=true` + `NODE_ENV=development` es válido.
//   * `LOG_INCLUDE_PII=true` + `NODE_ENV=development` es válido.
//
// Nota: la validación de `SERVICE_VERSION` se ejerce indirectamente por
// `resolveServiceVersion` que cae a `package.json.version` — no hay fail-fast
// directo por ausencia (Deviation D-04). Ver `us113-pino-logger.spec.ts`.
import { describe, expect, it } from 'vitest';
import { parseConfig } from '../../src/config/env.js';

const BASE_ENV = {
  DATABASE_URL: 'postgresql://user:pw@localhost:5432/db?schema=public',
  JWT_SECRET: 'x'.repeat(32),
  SESSION_SECRET: 'x'.repeat(32),
  LLM_PROVIDER: 'mock',
  CORS_ORIGINS: 'http://localhost:3000',
  CAPTCHA_PROVIDER: 'mock',
} satisfies Record<string, string>;

describe('US-113 · env config para logging (NT-01..NT-03, backward-compat)', () => {
  it('NT-01: LOG_LEVEL=verbose fuera del enum → fail-fast', () => {
    expect(() =>
      parseConfig({ ...BASE_ENV, NODE_ENV: 'development', LOG_LEVEL: 'verbose' }),
    ).toThrow(/LOG_LEVEL/);
  });

  it('NT-02: LOG_PRETTY=true en production → fail-fast (EC-02)', () => {
    expect(() =>
      parseConfig({
        ...BASE_ENV,
        NODE_ENV: 'production',
        SESSION_COOKIE_SECURE: 'true',
        LOG_PRETTY: 'true',
      }),
    ).toThrow(/LOG_PRETTY.*development/);
  });

  it('NT-03a: LOG_INCLUDE_PII=true en test → fail-fast (EC-03)', () => {
    expect(() =>
      parseConfig({ ...BASE_ENV, NODE_ENV: 'test', LOG_INCLUDE_PII: 'true' }),
    ).toThrow(/LOG_INCLUDE_PII.*development/);
  });

  it('NT-03b: LOG_INCLUDE_PII=true en production → fail-fast', () => {
    expect(() =>
      parseConfig({
        ...BASE_ENV,
        NODE_ENV: 'production',
        SESSION_COOKIE_SECURE: 'true',
        LOG_INCLUDE_PII: 'true',
      }),
    ).toThrow(/LOG_INCLUDE_PII/);
  });

  it('backward-compat: LOG_LEVEL=info válido (default histórico)', () => {
    const cfg = parseConfig({ ...BASE_ENV, NODE_ENV: 'development', LOG_LEVEL: 'info' });
    expect(cfg.LOG_LEVEL).toBe('info');
  });

  it('nuevos niveles Pino aceptados: trace, fatal, silent', () => {
    for (const level of ['trace', 'fatal', 'silent'] as const) {
      const cfg = parseConfig({ ...BASE_ENV, NODE_ENV: 'development', LOG_LEVEL: level });
      expect(cfg.LOG_LEVEL).toBe(level);
    }
  });

  it('LOG_PRETTY=true en NODE_ENV=development es válido', () => {
    const cfg = parseConfig({ ...BASE_ENV, NODE_ENV: 'development', LOG_PRETTY: 'true' });
    expect(cfg.LOG_PRETTY).toBe(true);
  });

  it('LOG_INCLUDE_PII=true en NODE_ENV=development es válido', () => {
    const cfg = parseConfig({
      ...BASE_ENV,
      NODE_ENV: 'development',
      LOG_INCLUDE_PII: 'true',
    });
    expect(cfg.LOG_INCLUDE_PII).toBe(true);
  });

  it('defaults: LOG_LEVEL=info, LOG_PRETTY=false, LOG_INCLUDE_PII=false', () => {
    const cfg = parseConfig({ ...BASE_ENV, NODE_ENV: 'development' });
    expect(cfg.LOG_LEVEL).toBe('info');
    expect(cfg.LOG_PRETTY).toBe(false);
    expect(cfg.LOG_INCLUDE_PII).toBe(false);
  });
});
