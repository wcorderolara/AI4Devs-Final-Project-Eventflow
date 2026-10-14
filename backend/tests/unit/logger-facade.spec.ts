// Fachada única del logger sobre Pino: normalización de las formas de llamada, campos base
// (service/env/version/correlationId) y redacción unificada (unión US-108 + US-113).
import { describe, expect, it } from 'vitest';
import { correlationContext } from '../../src/shared/context/correlation-id.js';
import { getAppVersion } from '../../src/shared/config/app-version.js';
import { isSensitiveKey, REDACTED, redactSecrets } from '../../src/shared/infrastructure/logger/redactors.js';
import { captureLogger } from '../helpers/log-capture.js';

describe('logger — formas de llamada', () => {
  it("logger.info('event', campos) → { event, ...campos } sin perder campos", () => {
    const { logger, lines } = captureLogger();
    logger.info('ai.request.success', { provider: 'mock', latencyMs: 12 });
    const [line] = lines();
    expect(line).toMatchObject({ level: 'info', event: 'ai.request.success', provider: 'mock', latencyMs: 12 });
  });

  it('logger.warn({ event, ...campos }) se emite tal cual', () => {
    const { logger, lines } = captureLogger();
    logger.warn({ event: 'validation_failed', path: '/x' });
    expect(lines()[0]).toMatchObject({ level: 'warn', event: 'validation_failed', path: '/x' });
  });

  it("forma Pino nativa ({...}, 'msg') conserva el msg", () => {
    const { logger, lines } = captureLogger();
    logger.error({ event: 'health.ready.exception' }, 'unexpected readiness failure');
    expect(lines()[0]).toMatchObject({ level: 'error', event: 'health.ready.exception', msg: 'unexpected readiness failure' });
  });

  it('campos base service/env/version/correlationId en cada línea', () => {
    const { logger, lines } = captureLogger();
    correlationContext.run({ correlationId: 'cid-als' }, () => logger.info({ event: 'x', correlationId: undefined }));
    logger.info({ event: 'y', correlationId: 'cid-explicit' });
    const [a, b] = lines();
    expect(a).toMatchObject({ service: 'backend-api', env: 'test', version: getAppVersion(), correlationId: 'cid-als' });
    expect(b?.correlationId).toBe('cid-explicit');
  });

  it('serializa Error y Date anidados sin perderlos', () => {
    const { logger, lines } = captureLogger();
    logger.error({ event: 'x', error: new Error('boom'), at: new Date('2026-01-01T00:00:00.000Z') });
    const [line] = lines();
    expect(line?.error).toMatchObject({ name: 'Error', message: 'boom' });
    expect(line?.at).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('redactor único — unión de claves', () => {
  it('cubre las claves exactas y por fragmento de ambos redactores previos', () => {
    for (const k of [
      'password', 'pwd', 'token', 'apikey', 'api_key', 'secret', 'authorization', 'cookie', 'set-cookie',
      'session', 'sid', 'jti', 'refresh_token', 'access_token', 'jwt', 'bearer', 'passwordHash',
      'SESSION_SECRET', 'RECAPTCHA_SECRET_KEY', 'captchaToken', 'newPassword', 'token_hash',
    ]) {
      expect(isSensitiveKey(k), k).toBe(true);
    }
    for (const k of ['sessionId', 'userId', 'event', 'correlationId', 'statusCode']) {
      expect(isSensitiveKey(k), k).toBe(false);
    }
  });

  it('una misma referencia en ramas hermanas no se marca como circular', () => {
    const shared = { a: 1 };
    const out = redactSecrets({ x: shared, y: shared }) as Record<string, unknown>;
    expect(out.y).toEqual({ a: 1 });
  });

  it('más allá de la profundidad máxima trunca (nunca emite sin redactar)', () => {
    let deep: Record<string, unknown> = { password: 'leak' };
    for (let i = 0; i < 10; i++) deep = { n: deep };
    expect(JSON.stringify(redactSecrets(deep))).not.toContain('leak');
    expect(REDACTED).toBe('[REDACTED]');
  });
});
