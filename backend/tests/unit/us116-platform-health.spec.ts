// US-116 (PB-P2-013 / QA-001) — Unit tests del módulo `platform-health`.
//
// Cobertura de AC:
//   UT-01 (AC-08 · EC-04): `getAppVersion()` precedencia APP_VERSION → package.json → "unknown".
//   UT-02 (AC-02 · EC-02 · EC-03): `AiProviderProbe.check()` matriz env.
//   UT-03 (AC-01): `GetHealthUseCase.execute()` shape estable.
//   UT-04 (AC-01 · AC-02 · AC-03): `GetReadinessUseCase.execute()` combinaciones pg×ai.
//   UT-05: `HEALTH_PATHS` immutable + `isHealthPath` matcher.
//   UT-06: 405 shape del router (unit-level con Supertest sobre app minimal).
//
// Sin BD ni HTTP externo — tests puros con `vi.stubEnv` para env matrix y stubs
// para los probes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { GetHealthUseCase } from '../../src/modules/platform-health/application/use-cases/get-health.use-case.js';
import { GetReadinessUseCase } from '../../src/modules/platform-health/application/use-cases/get-readiness.use-case.js';
import { AiProviderProbe } from '../../src/modules/platform-health/infrastructure/probes/ai-provider.probe.js';
import { HealthController } from '../../src/modules/platform-health/infrastructure/http/health.controller.js';
import { buildPlatformHealthRouter } from '../../src/modules/platform-health/infrastructure/http/platform-health.router.js';
import {
  HEALTH_PATHS,
  isHealthPath,
} from '../../src/modules/platform-health/domain/types.js';
import type { PostgresProbe } from '../../src/modules/platform-health/infrastructure/probes/postgres.probe.js';

describe('US-116 UT-01 (AC-08 · EC-04) — getAppVersion precedencia', () => {
  beforeEach(async () => {
    // Reimport dinámico para invalidar cache entre casos.
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('APP_VERSION env vence sobre package.json', async () => {
    vi.stubEnv('APP_VERSION', '1.2.3-sha');
    const mod = await import('../../src/shared/config/app-version.js');
    mod.__resetAppVersionCache();
    expect(mod.getAppVersion()).toBe('1.2.3-sha');
  });

  it('APP_VERSION vacío/blank → cae a package.json version', async () => {
    vi.stubEnv('APP_VERSION', '   ');
    const mod = await import('../../src/shared/config/app-version.js');
    mod.__resetAppVersionCache();
    // El repo tiene "0.0.0" en package.json — validamos que retorna string no vacío.
    const v = mod.getAppVersion();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
    expect(v).not.toBe('unknown');
  });

  it('cachea el resultado — el segundo call no re-evalúa env', async () => {
    vi.stubEnv('APP_VERSION', 'cached-value');
    const mod = await import('../../src/shared/config/app-version.js');
    mod.__resetAppVersionCache();
    expect(mod.getAppVersion()).toBe('cached-value');
    vi.stubEnv('APP_VERSION', 'other');
    expect(mod.getAppVersion()).toBe('cached-value'); // sigue cacheado
  });
});

describe('US-116 UT-02 (AC-02 · EC-02 · EC-03) — AiProviderProbe matriz env', () => {
  const probe = new AiProviderProbe();
  afterEach(() => vi.unstubAllEnvs());

  it('LLM_PROVIDER=mock → "mock"', () => {
    vi.stubEnv('LLM_PROVIDER', 'mock');
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(probe.check()).toBe('mock');
  });

  it('LLM_PROVIDER=openai + OPENAI_API_KEY → "ok"', () => {
    vi.stubEnv('LLM_PROVIDER', 'openai');
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    expect(probe.check()).toBe('ok');
  });

  it('LLM_PROVIDER=openai sin key → "down" (EC-02)', () => {
    vi.stubEnv('LLM_PROVIDER', 'openai');
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(probe.check()).toBe('down');
  });

  it('LLM_PROVIDER=openai + OPENAI_API_KEY sólo whitespace → "down"', () => {
    vi.stubEnv('LLM_PROVIDER', 'openai');
    vi.stubEnv('OPENAI_API_KEY', '   ');
    expect(probe.check()).toBe('down');
  });

  it('LLM_PROVIDER vacío o desconocido → "down"', () => {
    vi.stubEnv('LLM_PROVIDER', '');
    expect(probe.check()).toBe('down');
    vi.stubEnv('LLM_PROVIDER', 'anthropic');
    expect(probe.check()).toBe('down');
  });
});

describe('US-116 UT-03 (AC-01) — GetHealthUseCase shape', () => {
  const useCase = new GetHealthUseCase();

  it('DTO plano con status="ok" + version + uptimeMs entero + timestamp ISO', () => {
    const result = useCase.execute();
    expect(result.status).toBe('ok');
    expect(typeof result.version).toBe('string');
    expect(result.version.length).toBeGreaterThan(0);
    expect(Number.isInteger(result.uptimeMs)).toBe(true);
    expect(result.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // AC-01: DTO EXACTO — no expone keys extra.
    expect(Object.keys(result).sort()).toEqual(['status', 'timestamp', 'uptimeMs', 'version']);
  });
});

describe('US-116 UT-04 (AC-01 · AC-02 · AC-03) — GetReadinessUseCase matriz pg×ai', () => {
  function stubPg(status: 'ok' | 'down', latencyMs = 50): PostgresProbe {
    return {
      async check() {
        return { status, latencyMs };
      },
    } as unknown as PostgresProbe;
  }
  function stubAi(status: 'ok' | 'mock' | 'down'): AiProviderProbe {
    return { check: () => status } as unknown as AiProviderProbe;
  }

  it('pg=ok, ai=ok → status="ok", httpStatus=200', async () => {
    const uc = new GetReadinessUseCase(stubPg('ok'), stubAi('ok'));
    const r = await uc.execute();
    expect(r.httpStatus).toBe(200);
    expect(r.body.status).toBe('ok');
    expect(r.body.dependencies).toEqual({ postgres: 'ok', aiProvider: 'ok' });
  });

  it('pg=ok, ai=mock → status="ok" (mock cuenta como ok, EC-03)', async () => {
    const uc = new GetReadinessUseCase(stubPg('ok'), stubAi('mock'));
    const r = await uc.execute();
    expect(r.httpStatus).toBe(200);
    expect(r.body.status).toBe('ok');
    expect(r.body.dependencies.aiProvider).toBe('mock');
  });

  it('pg=ok, ai=down → status="degraded", httpStatus=200 (EC-02: LLM no bloquea rotación)', async () => {
    const uc = new GetReadinessUseCase(stubPg('ok'), stubAi('down'));
    const r = await uc.execute();
    expect(r.httpStatus).toBe(200);
    expect(r.body.status).toBe('degraded');
    expect(r.body.dependencies.aiProvider).toBe('down');
  });

  it('pg=down → status="error", httpStatus=503 (AC-03, sin importar ai)', async () => {
    for (const ai of ['ok', 'mock', 'down'] as const) {
      const uc = new GetReadinessUseCase(stubPg('down'), stubAi(ai));
      const r = await uc.execute();
      expect(r.httpStatus).toBe(503);
      expect(r.body.status).toBe('error');
      expect(r.body.dependencies.postgres).toBe('down');
    }
  });

  it('body incluye version + uptimeMs + timestamp (paridad con /health)', async () => {
    const uc = new GetReadinessUseCase(stubPg('ok'), stubAi('ok'));
    const r = await uc.execute();
    expect(typeof r.body.version).toBe('string');
    expect(Number.isInteger(r.body.uptimeMs)).toBe(true);
    expect(r.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(typeof r.postgresLatencyMs).toBe('number');
  });
});

describe('US-116 UT-05 — HEALTH_PATHS immutable + isHealthPath matcher', () => {
  it('lista canónica de 2 paths + inmutable (Object.freeze)', () => {
    expect(HEALTH_PATHS).toEqual(['/health', '/health/ready']);
    expect(Object.isFrozen(HEALTH_PATHS)).toBe(true);
    expect(() => (HEALTH_PATHS as unknown as string[]).push('/evil')).toThrow();
  });

  it('isHealthPath discrimina paths canónicos vs otros', () => {
    expect(isHealthPath('/health')).toBe(true);
    expect(isHealthPath('/health/ready')).toBe(true);
    expect(isHealthPath('/health/other')).toBe(false);
    expect(isHealthPath('/api/v1/health')).toBe(false);
    expect(isHealthPath('/')).toBe(false);
  });
});

describe('US-116 UT-06 (EC-07 · VR-03) — 405 catch-all del router', () => {
  function makeApp() {
    const app = express();
    const controller = new HealthController({
      health: new GetHealthUseCase(),
      readiness: new GetReadinessUseCase(
        { async check() { return { status: 'ok', latencyMs: 10 }; } } as unknown as PostgresProbe,
        { check: () => 'ok' } as unknown as AiProviderProbe,
      ),
      logger: { warn: vi.fn(), error: vi.fn() },
    });
    app.use(buildPlatformHealthRouter(controller));
    return app;
  }

  it('POST /health → 405 sin body', async () => {
    const app = makeApp();
    const res = await request(app).post('/health');
    expect(res.status).toBe(405);
    expect(res.text).toBe('');
  });

  it('PUT /health/ready → 405', async () => {
    const app = makeApp();
    const res = await request(app).put('/health/ready');
    expect(res.status).toBe(405);
  });

  it('DELETE /health → 405', async () => {
    const app = makeApp();
    const res = await request(app).delete('/health');
    expect(res.status).toBe(405);
  });

  it('GET /health → 200 con DTO plano válido', async () => {
    const app = makeApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.version).toBe('string');
    expect(Number.isInteger(res.body.uptimeMs)).toBe(true);
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('GET /health/ready → 200 con dependencies', async () => {
    const app = makeApp();
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.dependencies).toEqual({ postgres: 'ok', aiProvider: 'ok' });
  });
});
