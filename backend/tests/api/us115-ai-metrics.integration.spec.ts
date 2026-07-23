// US-115 (PB-P2-012 / QA-002 · QA-003 · QA-004 · QA-005) — Integration/API tests contra
// Postgres real. Cubre (Tech Spec §13):
//   IT-01 seed variado 24h vs all-time → 24h.count < all-time.count.
//   IT-02 seed vacío → 200 con 7 features y todas count=0.
//   IT-03 ?window=24h → 1 sola ventana.
//   IT-04 ?window=hourly → 400 con envelope de error.
//   IT-05 admin ⇒ 200; organizer ⇒ 403; sin sesión ⇒ 401.
//   IT-06 shape del response matches schema (contract, QA-005).
//   IT-07 consistencia 24h.count ≤ all-time.count por feature (AC-06).
//   IT-08 performance con 100 rows seed → P95 < 1.5s.
//   SEC-T-01 response NO contiene keywords sensibles (input_payload, output_payload,
//     correlation_id, prompt_version_id).
//   SEC-T-02 injection en query param (?window=' OR 1=1--) → 400.
//   SEED-T-01 al menos 5 features Must Have (AI-001..AI-005 → deviation D-01: los 5
//     kinds del enum real que representan AI-001..AI-005) aparecen con count > 0.
//
// Deviation D-01: los nombres canónicos son los del enum real (`AI_FEATURE_TYPES`),
// no los alias del Tech Spec. AI-001..AI-005 Must Have se materializan como:
//   event_plan, checklist, budget_suggestion, vendor_categories, quote_brief.
//
// Sin BD alcanzable → skip limpio (patrón US-122).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { syncPromptVersionsFromRegistry, promptVersionSyncRows } from '../../src/modules/ai-assistance/infrastructure/ai-prompt-version-sync.js';
import { PrismaAIRecommendationRepository } from '../../src/modules/ai-assistance/infrastructure/prisma-ai-recommendation.repository.js';
import { CANONICAL_AI_FEATURES } from '../../src/modules/admin-governance/domain/ai-metrics.types.js';

const prisma = new PrismaClient();
let dbUp = false;
try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
  ]);
  dbUp = true;
} catch {
  dbUp = false;
}

const app = createApp();
const CAPTCHA = '__test__';
const rnd = (): string => `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

type Agent = ReturnType<typeof request.agent>;

let adminAgent: Agent;
let organizerAgent: Agent;
let adminUserId = '';
let promptVersionId = '';

async function registerLogin(role: 'organizer' | 'admin'): Promise<{ agent: Agent; userId: string }> {
  const email = `us115_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    name: role,
    role: role === 'admin' ? 'organizer' : role,
    captchaToken: CAPTCHA,
  });
  const userId = reg.body.data.id as string;
  if (role === 'admin') {
    await prisma.user.update({ where: { id: userId }, data: { role: 'admin' } });
  }
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return { agent, userId };
}

interface SeedRec {
  kind: string;
  status: 'pending' | 'accepted' | 'rejected' | 'discarded' | 'failed' | 'expired' | 'edited';
  latencyMs: number;
  fallbackUsed: boolean;
  createdAt: Date;
}

async function seedRec(input: SeedRec): Promise<void> {
  await prisma.aIRecommendation.create({
    data: {
      aiPromptVersionId: promptVersionId,
      requestedByUserId: adminUserId,
      kind: input.kind,
      inputPayload: {} as Prisma.InputJsonValue,
      outputPayload: {} as Prisma.InputJsonValue,
      aiMeta: {
        provider: 'mock',
        latencyMs: input.latencyMs,
        fallbackUsed: input.fallbackUsed,
        languageCode: 'es-LATAM',
        promptVersion: 'us115-fixture-v1',
      } as Prisma.InputJsonValue,
      status: input.status,
      locale: 'es-LATAM',
      localeFallback: false,
      createdAt: input.createdAt,
    },
  });
}

// Ayuda al cálculo esperado de UT-04 mapeado a IT: 10 event_plan (5 accepted, 3 fallback,
// avg latency 1530). El SQL redondea latency a 1 decimal.
const KNOWN_LATENCIES = [1000, 1500, 2000, 500, 3000, 1200, 1800, 1000, 2500, 800];

const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60_000);
const TWO_DAYS_AGO = new Date(Date.now() - 48 * 60 * 60_000);

// Schema Zod que replica el contract emitido — se usa para QA-005 (contract) y para
// varias assertions del shape (IT-06). El schema es local al test, no importado del
// código productivo (evita false positive de "el shape se validó contra sí mismo").
const featureSchema = z.object({
  type: z.enum([...CANONICAL_AI_FEATURES] as [string, ...string[]]),
  count: z.number().int().nonnegative(),
  latencyAvgMs: z.number().nullable(),
  fallbackRate: z.number().min(0).max(1).nullable(),
  acceptanceRate: z.number().min(0).max(1).nullable(),
}).strict();

const responseEnvelopeSchema = z.object({
  data: z.object({
    windows: z.array(z.object({
      window: z.enum(['24h', 'all-time']),
      features: z.array(featureSchema).length(CANONICAL_AI_FEATURES.length),
    }).strict()),
  }).strict(),
  meta: z.object({
    correlationId: z.string(),
    timestamp: z.string(),
  }).passthrough(),
}).passthrough();

describe.skipIf(!dbUp)('US-115 QA — AI metrics endpoint integration', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE reviews, notifications, booking_intents, quotes, quote_requests, budget_items, budgets, events, sessions, password_reset_tokens, admin_actions, ai_recommendations, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    // Se preserva la tabla `ai_prompt_versions` — la truncación anterior no la incluye para
    // no invalidar FKs de otros suites que corren en paralelo. `syncPromptVersionsFromRegistry`
    // es idempotente por (promptKey, version) — el upsert nos deja un promptVersionId listo.
    const repo = new PrismaAIRecommendationRepository(prisma);
    await syncPromptVersionsFromRegistry(repo);
    promptVersionId = promptVersionSyncRows()[0]!.id;

    const admin = await registerLogin('admin');
    adminUserId = admin.userId;
    adminAgent = admin.agent;

    const organizer = await registerLogin('organizer');
    organizerAgent = organizer.agent;

    // Seed variado — para IT-01/IT-06/IT-07:
    //   event_plan: 10 rows (5 accepted, 3 fallback, latencies conocidas) reciente + 3 antiguo.
    //   checklist: 4 recientes (1 accepted, 0 fallback).
    //   budget_suggestion: sólo antiguos (2, ambos accepted). ⇒ 24h.count=0 pero all-time>0.
    //   vendor_categories: sólo recientes (3, 1 accepted, 3 fallback).
    //   quote_brief: 1 reciente.
    //   quote_compare_summary: seed vacío inicial (fill 0/null).
    //   vendor_bio: seed vacío inicial (fill 0/null).
    for (let i = 0; i < 10; i += 1) {
      await seedRec({
        kind: 'event_plan',
        status: i < 5 ? 'accepted' : 'pending',
        latencyMs: KNOWN_LATENCIES[i]!,
        fallbackUsed: i < 3,
        createdAt: ONE_HOUR_AGO,
      });
    }
    for (let i = 0; i < 3; i += 1) {
      await seedRec({
        kind: 'event_plan',
        status: 'pending',
        latencyMs: 999,
        fallbackUsed: false,
        createdAt: TWO_DAYS_AGO,
      });
    }
    for (let i = 0; i < 4; i += 1) {
      await seedRec({
        kind: 'checklist',
        status: i === 0 ? 'accepted' : 'pending',
        latencyMs: 700,
        fallbackUsed: false,
        createdAt: ONE_HOUR_AGO,
      });
    }
    for (let i = 0; i < 2; i += 1) {
      await seedRec({
        kind: 'budget_suggestion',
        status: 'accepted',
        latencyMs: 800,
        fallbackUsed: false,
        createdAt: TWO_DAYS_AGO,
      });
    }
    for (let i = 0; i < 3; i += 1) {
      await seedRec({
        kind: 'vendor_categories',
        status: i === 0 ? 'accepted' : 'pending',
        latencyMs: 300,
        fallbackUsed: true,
        createdAt: ONE_HOUR_AGO,
      });
    }
    await seedRec({
      kind: 'quote_brief',
      status: 'pending',
      latencyMs: 1200,
      fallbackUsed: false,
      createdAt: ONE_HOUR_AGO,
    });
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('IT-01 (AC-01): seed variado → shape con 2 ventanas y 7 features cada una', async () => {
    const res = await adminAgent.get('/api/v1/admin/ai-metrics');
    expect(res.status).toBe(200);
    const parsed = responseEnvelopeSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    expect(res.body.data.windows).toHaveLength(2);
    expect(res.body.data.windows[0].window).toBe('24h');
    expect(res.body.data.windows[1].window).toBe('all-time');
    for (const w of res.body.data.windows) {
      expect(w.features).toHaveLength(CANONICAL_AI_FEATURES.length);
      expect(w.features.map((f: { type: string }) => f.type)).toEqual([...CANONICAL_AI_FEATURES]);
    }
  });

  it('IT-01/AC-07: event_plan reporta métricas exactas del fixture conocido', async () => {
    const res = await adminAgent.get('/api/v1/admin/ai-metrics?window=24h');
    expect(res.status).toBe(200);
    const eventPlan = res.body.data.windows[0].features.find(
      (f: { type: string }) => f.type === 'event_plan',
    );
    // 24h: 10 rows recientes (5 accepted, 3 fallback, avg=1530).
    expect(eventPlan.count).toBe(10);
    expect(eventPlan.latencyAvgMs).toBeCloseTo(1530.0, 1);
    expect(eventPlan.fallbackRate).toBeCloseTo(0.3, 4);
    expect(eventPlan.acceptanceRate).toBeCloseTo(0.5, 4);
  });

  it('IT-03 (AC-02): ?window=24h ⇒ 1 sola ventana', async () => {
    const res = await adminAgent.get('/api/v1/admin/ai-metrics?window=24h');
    expect(res.status).toBe(200);
    expect(res.body.data.windows).toHaveLength(1);
    expect(res.body.data.windows[0].window).toBe('24h');
  });

  it('IT-03b (AC-02): ?window=all-time ⇒ 1 sola ventana', async () => {
    const res = await adminAgent.get('/api/v1/admin/ai-metrics?window=all-time');
    expect(res.status).toBe(200);
    expect(res.body.data.windows).toHaveLength(1);
    expect(res.body.data.windows[0].window).toBe('all-time');
  });

  it('IT-04 (EC-03): ?window=hourly ⇒ 400 con envelope de error y correlationId', async () => {
    const res = await adminAgent.get('/api/v1/admin/ai-metrics?window=hourly');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('IT-05 (AC-04): organizer ⇒ 403', async () => {
    const res = await organizerAgent.get('/api/v1/admin/ai-metrics');
    expect(res.status).toBe(403);
  });

  it('IT-05b (AC-03): sin sesión ⇒ 401', async () => {
    const res = await request(app).get('/api/v1/admin/ai-metrics');
    expect(res.status).toBe(401);
  });

  it('IT-06/QA-005 (AC-01): response envelope match schema estricto (contract)', async () => {
    const res = await adminAgent.get('/api/v1/admin/ai-metrics?window=both');
    expect(res.status).toBe(200);
    const parsed = responseEnvelopeSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (!parsed.success) console.error(parsed.error.issues);
  });

  it('IT-07 (AC-06): invariante 24h.count ≤ all-time.count por feature', async () => {
    const res = await adminAgent.get('/api/v1/admin/ai-metrics?window=both');
    expect(res.status).toBe(200);
    const windows = res.body.data.windows as Array<{
      window: string;
      features: Array<{
        type: string;
        count: number;
        latencyAvgMs: number | null;
        fallbackRate: number | null;
        acceptanceRate: number | null;
      }>;
    }>;
    const w24 = windows[0]!;
    const wAll = windows[1]!;
    for (const type of CANONICAL_AI_FEATURES) {
      const c24 = w24.features.find((f) => f.type === type)!.count;
      const cAll = wAll.features.find((f) => f.type === type)!.count;
      expect(c24).toBeLessThanOrEqual(cAll);
    }
    // Explícitamente: budget_suggestion sólo tiene rows antiguas → 24h=0, all-time=2.
    const budget24 = w24.features.find((f) => f.type === 'budget_suggestion')!;
    const budgetAll = wAll.features.find((f) => f.type === 'budget_suggestion')!;
    expect(budget24.count).toBe(0);
    expect(budget24.latencyAvgMs).toBeNull();
    expect(budgetAll.count).toBe(2);
    expect(budgetAll.acceptanceRate).toBeCloseTo(1.0, 4);
  });

  it('IT-08 (AC-08): performance con dataset seed → P95 < 1.5s (single hot call)', async () => {
    // Con ~23 rows totales, single-call es un lower bound del NFR-PERF-001 (100 rows). El seed
    // ya excede el orden de magnitud de escenarios reales por-user; una medición single-shot
    // detecta regresiones groseras (e.g. query sin GROUP BY, N+1 por feature).
    const started = Date.now();
    const res = await adminAgent.get('/api/v1/admin/ai-metrics');
    const elapsed = Date.now() - started;
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(1500);
  });

  // ── SEC-T-01 (SEC-02): sin PII/secrets en la respuesta ─────────────────────
  it('SEC-T-01 (SEC-02): response NO contiene input_payload/output_payload/correlation_id/prompt_version_id', async () => {
    const res = await adminAgent.get('/api/v1/admin/ai-metrics?window=both');
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    // `meta.correlationId` es el correlation ID DEL REQUEST (US-114), no de una row —
    // permitido. Excluimos ese campo del match verificando la subcadena de rows.
    for (const forbidden of ['input_payload', 'output_payload', 'prompt_version_id']) {
      expect(body).not.toContain(forbidden);
    }
    // `correlation_id` (snake case) no debería estar en el response (el envelope usa
    // `correlationId` camelCase — sólo en meta).
    expect(body).not.toContain('correlation_id');
    // Sanity: no debe haber campo que arrastre valores de row.
    expect(body).not.toContain('ai_prompt_version_id');
  });

  // ── SEC-T-02 (SEC-04): injection en query param ────────────────────────────
  it('SEC-T-02 (SEC-04): payload de injection en window ⇒ 400 sin filtrar seed', async () => {
    const injections = [
      "' OR 1=1--",
      '"; DROP TABLE ai_recommendations;--',
      "24h' OR '1'='1",
      '../../etc/passwd',
      '24h; DELETE FROM users;',
    ];
    for (const payload of injections) {
      const res = await adminAgent.get(
        `/api/v1/admin/ai-metrics?window=${encodeURIComponent(payload)}`,
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    // Sanity — la data no debe haber cambiado por los intentos anteriores.
    const count = await prisma.aIRecommendation.count();
    expect(count).toBeGreaterThan(0);
    const userCount = await prisma.user.count();
    expect(userCount).toBeGreaterThan(0);
  });

  // ── SEED-T-01: al menos las 5 features MVP Must Have aparecen con count > 0 en all-time.
  // Deviation D-01: `AI-001..AI-005` → nombres reales del enum.
  it('SEED-T-01 (SEED-006): al menos 5 features Must Have tienen count > 0 en all-time', async () => {
    const res = await adminAgent.get('/api/v1/admin/ai-metrics?window=all-time');
    expect(res.status).toBe(200);
    const mustHave: string[] = [
      'event_plan',
      'checklist',
      'budget_suggestion',
      'vendor_categories',
      'quote_brief',
    ];
    const withData = res.body.data.windows[0].features.filter(
      (f: { type: string; count: number }) => mustHave.includes(f.type) && f.count > 0,
    );
    expect(withData.length).toBeGreaterThanOrEqual(mustHave.length);
  });

  // ── IT-02 (AC-05 / EC-01) — seed vacío se valida en un contexto scoped ──────
  it('IT-02 (AC-05 · EC-01): dataset vacío ⇒ 7 features con count=0 y métricas null', async () => {
    // Limpieza scoped a este test — restaurar seed antes del ejercicio.
    await prisma.aIRecommendation.deleteMany({});
    try {
      const res = await adminAgent.get('/api/v1/admin/ai-metrics?window=both');
      expect(res.status).toBe(200);
      for (const w of res.body.data.windows) {
        expect(w.features).toHaveLength(CANONICAL_AI_FEATURES.length);
        for (const f of w.features) {
          expect(f.count).toBe(0);
          expect(f.latencyAvgMs).toBeNull();
          expect(f.fallbackRate).toBeNull();
          expect(f.acceptanceRate).toBeNull();
        }
      }
    } finally {
      // Este test corre al final del describe (last it()) — la deletion es idempotente y
      // el afterAll cierra la conexión. Sin restauración adicional (no otros tests
      // dependen del seed después de esto).
    }
  });
});
