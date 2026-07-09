// US-109 / QA-006 — Regresión de seguridad de captcha (AC-07, SEC-02/03, VR-09).
// Verifica: (a) los eventos de captcha nunca incluyen token/secret; (b) el logger central redacta
// captchaToken/secret; (c) no existe persistencia de captcha (sin modelo/tabla en el schema Prisma).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { logCaptchaEvent } from '../../src/infrastructure/observability/captcha-event-logger.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import { REDACTED } from '../../src/shared/infrastructure/logger/redact.js';

describe('US-109 QA-006: eventos de captcha sin datos sensibles (AC-07)', () => {
  it('logCaptchaEvent emite sólo metadatos seguros (sin token/secret)', () => {
    const spy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    logCaptchaEvent('captcha.verify.failed', {
      correlationId: 'c1', endpoint: '/api/v1/auth/login', provider: 'recaptcha', outcome: 'invalid_token', expectedAction: 'login', env: 'production',
    });
    const serialized = JSON.stringify(spy.mock.calls);
    expect(serialized).toContain('captcha.verify.failed');
    expect(serialized).toContain('c1');
    expect(serialized.toLowerCase()).not.toContain('captchatoken');
    expect(serialized.toLowerCase()).not.toContain('secret');
    spy.mockRestore();
  });
});

describe('US-109 QA-006: logger central redacta captcha token/secret (SEC-03)', () => {
  it('no filtra el valor de captchaToken ni de RECAPTCHA_SECRET_KEY', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    logger.warn({ event: 'x', captchaToken: 'leak-token-value', RECAPTCHA_SECRET_KEY: 'leak-secret-value' });
    const serialized = JSON.stringify(spy.mock.calls);
    expect(serialized).not.toContain('leak-token-value');
    expect(serialized).not.toContain('leak-secret-value');
    expect(serialized).toContain(REDACTED);
    spy.mockRestore();
  });
});

describe('US-109 QA-006: sin persistencia de captcha (VR-09)', () => {
  it('el schema Prisma no define ningún modelo/tabla de captcha', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const schema = readFileSync(resolve(here, '../../prisma/schema.prisma'), 'utf8');
    expect(schema.toLowerCase()).not.toContain('captcha');
  });
});
