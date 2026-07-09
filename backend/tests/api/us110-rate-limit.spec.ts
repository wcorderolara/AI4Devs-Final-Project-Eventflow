// US-110 / QA-002..006 — Comportamiento de rate limiting (AC-01..04, AC-06, AC-07).
// Estrategia (N1/N3): instancias frescas de limiter (store aislado), `RATE_LIMIT_ENABLED=true`,
// maxes pequeños vía config, y un handler-spy downstream que representa credential check / creación
// de usuario / llamada a `LLMProvider`. Si el spy NO se llama tras 429 ⇒ no side effects (VR-05).
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { config } from '../../src/config/env.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import {
  createLoginRateLimit,
  createRegisterRateLimit,
  createPasswordResetRequestRateLimit,
} from '../../src/shared/interface/http/auth-rate-limits.js';
import { createAiGenerationRateLimit } from '../../src/shared/interface/http/ai-rate-limit.js';

const originalEnabled = config.RATE_LIMIT_ENABLED;
beforeAll(() => {
  config.RATE_LIMIT_ENABLED = true;
});
afterAll(() => {
  config.RATE_LIMIT_ENABLED = originalEnabled;
});

/** App mínima: correlationId + (opcional user) + limiter + handler-spy (downstream). */
function buildApp(limiter: RequestHandler, opts: { user?: { id: string; role: string }; routes?: string[] } = {}): {
  app: Express;
  spy: ReturnType<typeof vi.fn>;
} {
  const spy = vi.fn();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { correlationId: string }).correlationId = 'cid-test';
    if (opts.user) (req as unknown as { user: unknown }).user = opts.user;
    next();
  });
  const handler: RequestHandler = (_req, res) => {
    spy();
    res.status(200).json({ ok: true });
  };
  for (const route of opts.routes ?? ['/x']) app.post(route, limiter, handler);
  return { app, spy };
}

describe('US-110 QA-003: login 429 + headers + envelope + no side effects (AC-01, AC-06)', () => {
  it('rechaza el intento tras superar el máximo por IP, sin ejecutar el handler', async () => {
    config.AUTH_LOGIN_RATE_LIMIT_MAX = 2;
    const { app, spy } = buildApp(createLoginRateLimit());
    const agent = request.agent(app);

    expect((await agent.post('/x')).status).toBe(200);
    expect((await agent.post('/x')).status).toBe(200);
    const blocked = await agent.post('/x');

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.body.error.correlationId).toBe('cid-test');
    expect(blocked.headers['x-ratelimit-limit']).toBe('2');
    expect(blocked.headers['x-ratelimit-remaining']).toBe('0');
    expect(blocked.headers['retry-after']).toBeDefined();
    // No side effects: el handler downstream sólo corrió para los 2 permitidos.
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('US-110 QA-002: register por IP y reset por email normalizado (AC-02, AC-03)', () => {
  it('register: 5.º intento (max=1) bloquea por IP', async () => {
    config.AUTH_REGISTER_RATE_LIMIT_MAX = 1;
    const { app, spy } = buildApp(createRegisterRateLimit());
    const agent = request.agent(app);
    expect((await agent.post('/x')).status).toBe(200);
    expect((await agent.post('/x')).status).toBe(429);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('reset: key por email normalizado; mayúsculas/espacios comparten cuota; otro email es independiente', async () => {
    config.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX = 2;
    const { app } = buildApp(createPasswordResetRequestRateLimit());
    // Mismo email con distinto casing/espacios → misma key.
    expect((await request(app).post('/x').send({ email: 'User@Example.com' })).status).toBe(200);
    expect((await request(app).post('/x').send({ email: '  user@example.com ' })).status).toBe(200);
    expect((await request(app).post('/x').send({ email: 'USER@EXAMPLE.COM' })).status).toBe(429);
    // Email distinto → cuota independiente.
    expect((await request(app).post('/x').send({ email: 'other@example.com' })).status).toBe(200);
  });
});

describe('US-110 QA-004: AI cuota agregada por usuario, sin llamar al provider (AC-04)', () => {
  it('la cuota se agrega entre endpoints IA por userId y el handler no corre tras 429', async () => {
    config.AI_RATE_LIMIT_MAX = 2;
    const { app, spy } = buildApp(createAiGenerationRateLimit(), {
      user: { id: 'u-42', role: 'organizer' },
      routes: ['/events/e1/ai/event-plan', '/events/e1/ai/checklist'],
    });
    const agent = request.agent(app);
    // Dos endpoints distintos comparten la cuota del mismo usuario.
    expect((await agent.post('/events/e1/ai/event-plan')).status).toBe(200);
    expect((await agent.post('/events/e1/ai/checklist')).status).toBe(200);
    const blocked = await agent.post('/events/e1/ai/event-plan');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    // "no LLMProvider call, no AIRecommendation": el handler (que representa el provider) no corrió.
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('US-110 QA-005: reset de contador (EC-03) vía store reseteable', () => {
  it('tras resetKey el mismo cliente puede volver a pasar', async () => {
    config.AUTH_LOGIN_RATE_LIMIT_MAX = 1;
    const limiter = createLoginRateLimit();
    const { app } = buildApp(limiter as unknown as RequestHandler);
    const agent = request.agent(app);
    expect((await agent.post('/x')).status).toBe(200);
    expect((await agent.post('/x')).status).toBe(429);
    // Simula expiración de ventana reseteando el counter de la key (IPv4/IPv6 loopback).
    (limiter as unknown as { resetKey: (k: string) => void }).resetKey('::ffff:127.0.0.1');
    (limiter as unknown as { resetKey: (k: string) => void }).resetKey('127.0.0.1');
    (limiter as unknown as { resetKey: (k: string) => void }).resetKey('::1');
    expect((await agent.post('/x')).status).toBe(200);
  });
});

describe('US-110 QA-006: log seguro `security.rate_limit.exceeded` (AC-07, SEC-06)', () => {
  it('registra metadata segura con key hasheada y NO el email crudo', async () => {
    config.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX = 1;
    const warn = vi.spyOn(logger, 'warn');
    const { app } = buildApp(createPasswordResetRequestRateLimit());
    const email = 'leaky-secret-address@example.com';
    await request(app).post('/x').send({ email });
    await request(app).post('/x').send({ email }); // 429 → log

    const serialized = JSON.stringify(warn.mock.calls);
    expect(serialized).toContain('security.rate_limit.exceeded');
    expect(serialized).toContain('auth_password_reset');
    expect(serialized).toContain('"keyType":"email"');
    // El email crudo NUNCA aparece; sólo su hash (keyId).
    expect(serialized).not.toContain(email);
    const payload = warn.mock.calls.map((c) => c[0] as Record<string, unknown>).find((p) => p?.event === 'security.rate_limit.exceeded');
    expect(payload?.keyId).toMatch(/^[a-f0-9]{12}$/);
    warn.mockRestore();
  });
});
