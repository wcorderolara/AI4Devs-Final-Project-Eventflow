// US-109 / QA-001 — Config fail-fast, factory selection y MockCaptchaProvider (AC-04, AC-05).
// Cubre VR-03 (provider inválido), VR-04/EC-06 (mock fuera de Local/CI), VR-05 (secret faltante).
import { describe, it, expect, afterEach } from 'vitest';
import { ZodError } from 'zod';
import { parseConfig, config } from '../../src/config/env.js';
import { CaptchaProviderFactory } from '../../src/infrastructure/captcha/captcha-provider.factory.js';
import { MockCaptchaProvider } from '../../src/infrastructure/captcha/mock-captcha-provider.js';

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

describe('US-109 QA-001: captcha config fail-fast (AC-04)', () => {
  it('VR-03: CAPTCHA_PROVIDER inválido → ZodError', () => {
    expect(() => parseConfig({ ...base, CAPTCHA_PROVIDER: 'turnstile' })).toThrow(ZodError);
  });

  it('VR-04/EC-06: mock en NODE_ENV=production → ZodError', () => {
    expect(() =>
      parseConfig({
        ...base,
        NODE_ENV: 'production',
        CAPTCHA_PROVIDER: 'mock',
        SESSION_COOKIE_SECURE: 'true',
      }),
    ).toThrow(ZodError);
  });

  it('VR-05: recaptcha sin RECAPTCHA_SECRET_KEY → ZodError', () => {
    expect(() =>
      parseConfig({ ...base, NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'true', CAPTCHA_PROVIDER: 'recaptcha' }),
    ).toThrow(ZodError);
  });

  it('VR-05: hcaptcha sin HCAPTCHA_SECRET_KEY → ZodError', () => {
    expect(() =>
      parseConfig({ ...base, NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'true', CAPTCHA_PROVIDER: 'hcaptcha' }),
    ).toThrow(ZodError);
  });

  it('recaptcha con secret + defaults (threshold 0.5, timeout 3000) → OK', () => {
    const cfg = parseConfig({
      ...base,
      NODE_ENV: 'production',
      SESSION_COOKIE_SECURE: 'true',
      CAPTCHA_PROVIDER: 'recaptcha',
      RECAPTCHA_SECRET_KEY: 'real-recaptcha-secret',
    });
    expect(cfg.CAPTCHA_PROVIDER).toBe('recaptcha');
    expect(cfg.CAPTCHA_SCORE_THRESHOLD).toBe(0.5);
    expect(cfg.CAPTCHA_VERIFY_TIMEOUT_MS).toBe(3000);
  });
});

describe('US-109 QA-001: CaptchaProviderFactory (AC-04)', () => {
  const original = config.CAPTCHA_PROVIDER;
  afterEach(() => {
    config.CAPTCHA_PROVIDER = original;
  });

  it('resuelve el provider según config.CAPTCHA_PROVIDER en runtime', () => {
    const factory = new CaptchaProviderFactory();
    config.CAPTCHA_PROVIDER = 'mock';
    expect(factory.resolve().provider).toBe('mock');
    config.CAPTCHA_PROVIDER = 'recaptcha';
    expect(factory.resolve().provider).toBe('recaptcha');
    config.CAPTCHA_PROVIDER = 'hcaptcha';
    expect(factory.resolve().provider).toBe('hcaptcha');
  });
});

describe('US-109 QA-001: MockCaptchaProvider determinista (AC-05)', () => {
  const mock = new MockCaptchaProvider();

  it('acepta únicamente "__test__"', async () => {
    await expect(mock.verify({ token: '__test__' })).resolves.toMatchObject({ success: true, outcome: 'success' });
  });

  it('rechaza token vacío o distinto sin llamadas de red', async () => {
    await expect(mock.verify({ token: '' })).resolves.toMatchObject({ success: false, outcome: 'invalid_token' });
    await expect(mock.verify({ token: 'nope' })).resolves.toMatchObject({ success: false, outcome: 'invalid_token' });
  });
});
