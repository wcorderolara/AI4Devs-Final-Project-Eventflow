// US-085 QA-001 / QA-003 — Unit: EnvironmentGuard (EC-03, NT-01/NT-02, SEC-02).
import { describe, expect, it } from 'vitest';
import { assertEnvSafety } from '../../src/modules/seed-demo/infrastructure/environment-guard.js';

describe('US-085 — EnvironmentGuard', () => {
  it('permite dev con SEED_DEMO_ENABLED=true', () => {
    expect(assertEnvSafety({ NODE_ENV: 'development', SEED_DEMO_ENABLED: 'true' }).safe).toBe(true);
  });

  it('bloquea production (NT-02)', () => {
    const r = assertEnvSafety({ NODE_ENV: 'production', SEED_DEMO_ENABLED: 'true' });
    expect(r.safe).toBe(false);
    expect(r.reason).toBe('Seed disabled for current environment');
  });

  it('bloquea SEED_DEMO_ENABLED ausente (NT-01)', () => {
    const r = assertEnvSafety({ NODE_ENV: 'development' });
    expect(r.safe).toBe(false);
    expect(r.reason).toContain('SEED_DEMO_ENABLED');
  });

  it('bloquea SEED_DEMO_ENABLED=false', () => {
    expect(assertEnvSafety({ NODE_ENV: 'development', SEED_DEMO_ENABLED: 'false' }).safe).toBe(false);
  });
});
