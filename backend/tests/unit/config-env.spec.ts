// Tests unitarios de config/env.ts (US-089 / QA-001).
// Cubren AC-03, EC-01, EC-02. `parseConfig` se prueba de forma aislada pasando objetos
// directamente (sin depender de process.env real).
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { parseConfig } from '../../src/config/env.js';

/** Conjunto mínimo de variables requeridas válidas. */
const validEnv = {
  PORT: '3000',
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/eventflow_test?schema=public',
  JWT_SECRET: 'test_jwt_secret_min_32_characters_long_xx',
  LLM_PROVIDER: 'mock',
  CORS_ORIGINS: 'http://localhost:3000',
  CAPTCHA_PROVIDER: 'mock',
} satisfies NodeJS.ProcessEnv;

describe('parseConfig (US-089 config validation)', () => {
  it('TS-03: retorna un objeto tipado sin error con env completo válido', () => {
    const config = parseConfig(validEnv);
    expect(config.PORT).toBe(3000);
    expect(config.LLM_PROVIDER).toBe('mock');
    // Defaults aplicados.
    expect(config.HELMET_ENABLED).toBe(true);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.JWT_EXPIRES_IN).toBe('7d');
    expect(config.SEED_ENABLED).toBe(false);
  });

  it('NT-01: lanza ZodError mencionando DATABASE_URL cuando falta (fail-fast, EC-01)', () => {
    expect(() => parseConfig({})).toThrow(ZodError);
    try {
      parseConfig({});
      expect.unreachable('parseConfig({}) debió lanzar');
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError);
      const fields = (err as ZodError).issues.map((i) => i.path.join('.'));
      expect(fields).toContain('DATABASE_URL');
    }
  });

  it('NT-02: lanza ZodError mencionando valores admitidos con LLM_PROVIDER inválido (EC-02)', () => {
    const bad = { ...validEnv, LLM_PROVIDER: 'gpt4' };
    try {
      parseConfig(bad);
      expect.unreachable('parseConfig con LLM_PROVIDER inválido debió lanzar');
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError);
      const zerr = err as ZodError;
      const providerIssue = zerr.issues.find((i) => i.path.join('.') === 'LLM_PROVIDER');
      expect(providerIssue).toBeDefined();
      const serialized = JSON.stringify(zerr.issues);
      expect(serialized).toContain('openai');
      expect(serialized).toContain('mock');
      expect(serialized).toContain('anthropic');
    }
  });

  it('NT-03: lanza ZodError con PORT no numérico', () => {
    const bad = { ...validEnv, PORT: 'abc' };
    expect(() => parseConfig(bad)).toThrow(ZodError);
  });
});
