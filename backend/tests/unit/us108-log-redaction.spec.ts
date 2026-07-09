// US-108 / QA-004 — Tests de redacción de cookies, session IDs y secrets en logs (AC-07, SEC-07).
// Verifica el helper `redact()` y que el `logger` central scrubbea antes de emitir a consola.
import { describe, it, expect, vi } from 'vitest';
import { redact, isSensitiveKey, REDACTED } from '../../src/shared/infrastructure/logger/redact.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';

describe('US-108 QA-004: isSensitiveKey', () => {
  it('marca cookie/set-cookie/authorization/sid/jti como sensibles', () => {
    for (const k of ['cookie', 'Cookie', 'set-cookie', 'Set-Cookie', 'authorization', 'sid', 'jti']) {
      expect(isSensitiveKey(k)).toBe(true);
    }
  });

  it('marca *secret / *token / *password como sensibles', () => {
    for (const k of ['SESSION_SECRET', 'COOKIE_SECRET', 'CAPTCHA_SECRET', 'accessToken', 'captchaToken', 'newPassword', 'passwordHash']) {
      expect(isSensitiveKey(k)).toBe(true);
    }
  });

  it('no marca claves seguras', () => {
    for (const k of ['correlationId', 'userId', 'event', 'method', 'path', 'statusCode']) {
      expect(isSensitiveKey(k)).toBe(false);
    }
  });
});

describe('US-108 QA-004: redact()', () => {
  it('redacta valores de claves sensibles y preserva las seguras', () => {
    const input = {
      correlationId: 'cid-1',
      userId: 'u-1',
      cookie: 'eventflow_session=s%3Aabc.def',
      'set-cookie': ['eventflow_session=xyz; HttpOnly'],
      authorization: 'Bearer abc.def.ghi',
      SESSION_SECRET: 'super-secret-32-chars-value-aaaaaaaa',
      sid: 'opaque-sid',
      jti: 'jti-123',
      token: 'raw-reset-token',
    };
    const out = redact(input) as Record<string, unknown>;
    expect(out.correlationId).toBe('cid-1');
    expect(out.userId).toBe('u-1');
    expect(out.cookie).toBe(REDACTED);
    expect(out['set-cookie']).toBe(REDACTED);
    expect(out.authorization).toBe(REDACTED);
    expect(out.SESSION_SECRET).toBe(REDACTED);
    expect(out.sid).toBe(REDACTED);
    expect(out.jti).toBe(REDACTED);
    expect(out.token).toBe(REDACTED);
    // No muta el original.
    expect(input.cookie).toContain('eventflow_session');
  });

  it('redacta en profundidad (objetos anidados y arrays)', () => {
    const out = redact({
      req: { headers: { cookie: 'a=b', 'x-request-id': 'r1' } },
      list: [{ password: 'p1' }, { name: 'ok' }],
    }) as { req: { headers: Record<string, unknown> }; list: Record<string, unknown>[] };
    expect(out.req.headers.cookie).toBe(REDACTED);
    expect(out.req.headers['x-request-id']).toBe('r1');
    expect(out.list[0]?.password).toBe(REDACTED);
    expect(out.list[1]?.name).toBe('ok');
  });

  it('serializa Errors sin filtrar props sensibles', () => {
    const out = redact(new Error('boom')) as { name: string; message: string };
    expect(out.message).toBe('boom');
    expect(out.name).toBe('Error');
  });
});

describe('US-108 QA-004: logger central scrubbea antes de emitir', () => {
  it('logger.info no emite el valor de una cookie/secret a consola', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    logger.info({ event: 'x', correlationId: 'c1', cookie: 'eventflow_session=leak', SESSION_SECRET: 'leak-secret' });
    const serialized = JSON.stringify(spy.mock.calls);
    expect(serialized).not.toContain('eventflow_session=leak');
    expect(serialized).not.toContain('leak-secret');
    expect(serialized).toContain(REDACTED);
    expect(serialized).toContain('c1'); // metadatos seguros preservados
    spy.mockRestore();
  });
});
