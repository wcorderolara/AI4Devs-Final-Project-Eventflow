// US-085 QA-001 — Unit: SeedConfigSchema (Zod env validation, VR-01).
import { describe, expect, it } from 'vitest';
import { parseSeedConfig } from '../../src/modules/seed-demo/infrastructure/seed-config.schema.js';

describe('US-085 — SeedConfigSchema', () => {
  const base = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db?schema=public',
    SEED_DEMO_ENABLED: 'true',
    LLM_PROVIDER: 'mock',
    NODE_ENV: 'development',
  };

  it('parsea envs válidas', () => {
    const cfg = parseSeedConfig(base as NodeJS.ProcessEnv);
    expect(cfg.DATABASE_URL).toContain('postgresql://');
    expect(cfg.LLM_PROVIDER).toBe('mock');
  });

  it('default LLM_PROVIDER=mock cuando falta', () => {
    const { LLM_PROVIDER: _llm, ...rest } = base;
    expect(parseSeedConfig(rest as NodeJS.ProcessEnv).LLM_PROVIDER).toBe('mock');
  });

  it('falla con DATABASE_URL inválida', () => {
    expect(() => parseSeedConfig({ ...base, DATABASE_URL: 'not-a-url' } as NodeJS.ProcessEnv)).toThrow();
  });

  it('falla con DATABASE_URL ausente', () => {
    const { DATABASE_URL: _url, ...rest } = base;
    expect(() => parseSeedConfig(rest as NodeJS.ProcessEnv)).toThrow();
  });
});
