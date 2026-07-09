// US-110 / QA-001 — Config fail-fast de rate limiting (AC-05, VR-01).
// Los 8 max/window deben ser enteros positivos; cero/negativo/no numérico falla el boot.
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { parseConfig } from '../../src/config/env.js';

const base = {
  PORT: '3000',
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/eventflow_test?schema=public',
  JWT_SECRET: 'test_jwt_secret_min_32_characters_long_xx',
  SESSION_SECRET: 'test_session_secret_min_32_characters_long_xx',
  LLM_PROVIDER: 'mock',
  CORS_ORIGINS: 'http://localhost:3000',
  CAPTCHA_PROVIDER: 'mock',
} satisfies NodeJS.ProcessEnv;

const RATE_VARS = [
  'AUTH_LOGIN_RATE_LIMIT_MAX',
  'AUTH_LOGIN_RATE_LIMIT_WINDOW_MS',
  'AUTH_REGISTER_RATE_LIMIT_MAX',
  'AUTH_REGISTER_RATE_LIMIT_WINDOW_MS',
  'AUTH_PASSWORD_RESET_RATE_LIMIT_MAX',
  'AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS',
  'AI_RATE_LIMIT_MAX',
  'AI_RATE_LIMIT_WINDOW_MS',
] as const;

describe('US-110 QA-001: defaults de rate limiting (AC-05)', () => {
  it('aplica defaults MVP aprobados', () => {
    const cfg = parseConfig(base);
    expect(cfg.AUTH_LOGIN_RATE_LIMIT_MAX).toBe(10);
    expect(cfg.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS).toBe(600_000);
    expect(cfg.AUTH_REGISTER_RATE_LIMIT_MAX).toBe(5);
    expect(cfg.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX).toBe(3);
    expect(cfg.AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
    expect(cfg.AI_RATE_LIMIT_MAX).toBe(10);
    expect(cfg.AI_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
    expect(cfg.RATE_LIMIT_ENABLED).toBe(true);
  });
});

describe('US-110 QA-001: fail-fast ante valores inválidos (AC-05, VR-01)', () => {
  it.each(RATE_VARS)('%s = 0 → ZodError', (key) => {
    expect(() => parseConfig({ ...base, [key]: '0' })).toThrow(ZodError);
  });

  it.each(RATE_VARS)('%s negativo → ZodError', (key) => {
    expect(() => parseConfig({ ...base, [key]: '-5' })).toThrow(ZodError);
  });

  it.each(RATE_VARS)('%s no numérico → ZodError', (key) => {
    expect(() => parseConfig({ ...base, [key]: 'abc' })).toThrow(ZodError);
  });

  it.each(RATE_VARS)('%s decimal → ZodError (debe ser entero)', (key) => {
    expect(() => parseConfig({ ...base, [key]: '2.5' })).toThrow(ZodError);
  });
});
