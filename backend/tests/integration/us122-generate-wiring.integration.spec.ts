// PR-5 / US-122 + US-123 + US-124 — Integración del pipeline IA de producción (Supertest + Postgres +
// MockAIProvider). Verifica que generar persiste SIEMPRE `pending` con el `AIPromptVersion` real del
// registry (no el placeholder de US-097), sin escribir dominio (HITL), que el apply sigue pasando por
// HITL, que un fallo del provider deja un failure record `failed` y que US-059 lo ignora.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getTestPrisma, dbUp } from '../helpers/test-db.js';
import { promptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/index.js';
import { US097_PLACEHOLDER_PROMPT_VERSION } from '../../src/modules/ai-assistance/infrastructure/prompt-version-id.resolver.js';

const prisma = getTestPrisma();
const app = createApp();
const CAPTCHA = '__test__';
const rnd = (): string => `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
type Agent = ReturnType<typeof request.agent>;

async function registerOrganizer(): Promise<Agent> {
  const email = `pr5_ai_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({ acceptedTerms: true, email, password: 'Secret1234', name: 'organizer', role: 'organizer', captchaToken: CAPTCHA });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

async function activePromptVersionId(promptKey: string, version: string): Promise<string> {
  const row = await prisma.aIPromptVersion.findUnique({ where: { promptKey_version: { promptKey, version } } });
  return row!.id;
}

describe.skipIf(!dbUp)('PR-5 — generación IA cableada a US-122/123/124 (con BD)', () => {
  const eventTypeCode = 'wedding';
  let locationId = '';
  let agent: Agent;
  let eventId = '';

  beforeAll(async () => {
    await prisma.eventType.upsert({ where: { code: eventTypeCode }, update: { isActive: true }, create: { code: eventTypeCode, label: 'Wedding', isActive: true } });
    locationId = (await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } })).id;
    agent = await registerOrganizer();
    const created = await agent.post('/api/v1/events').send({
      eventTypeCode, eventDate: '2027-06-30', guestsCount: 80, locationId,
      estimatedBudget: '5000.00', currencyCode: 'GTQ', languageCode: 'es-LATAM',
    });
    eventId = created.body.data.id as string;
    await agent.post(`/api/v1/events/${eventId}/activate`);
  });

  afterAll(async () => {
    await prisma.aIRecommendation.deleteMany({ where: { eventId } });
    await prisma.$disconnect();
  });

  it('generar → pending con promptVersionId real, sin escribir dominio; apply sólo vía HITL', async () => {
    const [tasksBefore, budgetBefore, eventsBefore] = await Promise.all([
      prisma.eventTask.count({ where: { eventId } }),
      prisma.budgetItem.count({ where: { budget: { eventId } } }),
      prisma.event.count(),
    ]);

    const res = await agent.post(`/api/v1/events/${eventId}/ai/event-plan`).send({ input: { guests: 80, email: 'x@y.com' } });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending');
    // Contrato HTTP intacto: aiMeta con exactamente los 5 campos de `AiMeta`.
    expect(Object.keys(res.body.data.aiMeta).sort()).toEqual(['fallbackUsed', 'languageCode', 'latencyMs', 'promptVersion', 'provider']);
    expect(res.body.data.aiMeta).toMatchObject({ provider: 'mock', fallbackUsed: false, languageCode: 'es-LATAM', promptVersion: 'mock:event_plan:v1' });

    const rec = await prisma.aIRecommendation.findUnique({ where: { id: res.body.data.recommendationId as string } });
    expect(rec!.status).toBe('pending');
    const active = promptRegistry.resolveActive('event_plan', 'es-LATAM');
    const expectedId = await activePromptVersionId(active.promptKey, active.version);
    const placeholderId = await activePromptVersionId(US097_PLACEHOLDER_PROMPT_VERSION.promptKey, US097_PLACEHOLDER_PROMPT_VERSION.version).catch(() => null);
    expect(rec!.aiPromptVersionId).toBe(expectedId);
    expect(rec!.aiPromptVersionId).not.toBe(placeholderId);
    // PII fuera del input persistido (sanitize pre-provider + sanitizer US-122).
    expect(rec!.inputPayload).toEqual({ guests: 80 });

    // HITL: generar no materializa tareas, budget ni eventos.
    expect(await prisma.eventTask.count({ where: { eventId } })).toBe(tasksBefore);
    expect(await prisma.budgetItem.count({ where: { budget: { eventId } } })).toBe(budgetBefore);
    expect(await prisma.event.count()).toBe(eventsBefore);

    const applied = await agent.post(`/api/v1/ai-recommendations/${rec!.id}/apply`).send({});
    expect(applied.status).toBe(200);
    expect(applied.body.data.status).toBe('accepted');
  });

  it('idioma sin prompt activo en el registry → placeholder de US-097 (sin fallback silencioso de idioma)', async () => {
    const res = await agent.post('/api/v1/events').send({
      eventTypeCode, eventDate: '2027-07-30', guestsCount: 20, locationId,
      estimatedBudget: '1000.00', currencyCode: 'GTQ', languageCode: 'pt',
    });
    const ptEventId = res.body.data.id as string;
    await agent.post(`/api/v1/events/${ptEventId}/activate`);
    const gen = await agent.post(`/api/v1/events/${ptEventId}/ai/checklist`).send({ input: { guests: 20 } });
    expect(gen.status).toBe(200);
    const rec = await prisma.aIRecommendation.findUnique({ where: { id: gen.body.data.recommendationId as string } });
    const placeholderId = await activePromptVersionId(US097_PLACEHOLDER_PROMPT_VERSION.promptKey, US097_PLACEHOLDER_PROMPT_VERSION.version);
    expect(rec!.aiPromptVersionId).toBe(placeholderId);
    expect(rec!.locale).toBe('pt');
    await prisma.aIRecommendation.deleteMany({ where: { eventId: ptEventId } });
  });

  it('fallo del provider → 503 + failure record `failed` (sin payload) con prompt version real', async () => {
    const res = await agent.post(`/api/v1/events/${eventId}/ai/checklist`).send({ input: { __simulate: 'timeout' } });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_PROVIDER_TIMEOUT');
    const failed = await prisma.aIRecommendation.findMany({ where: { eventId, kind: 'checklist' } });
    expect(failed).toHaveLength(1);
    expect(failed[0]!.status).toBe('failed');
    expect(failed[0]!.inputPayload).toEqual({});
    expect(failed[0]!.outputPayload).toEqual({ errorCode: 'AI_PROVIDER_TIMEOUT' });
    const active = promptRegistry.resolveActive('checklist', 'es-LATAM');
    expect(failed[0]!.aiPromptVersionId).toBe(await activePromptVersionId(active.promptKey, active.version));
  });

  it('US-059: el último resumen ignora records `failed` aunque sean más recientes', async () => {
    const active = promptRegistry.resolveActive('quote_compare_summary', 'es-LATAM');
    const aiPromptVersionId = await activePromptVersionId(active.promptKey, active.version);
    const owner = await prisma.event.findUnique({ where: { id: eventId }, select: { userId: true } });
    const categoryCode = `pr5_cat_${rnd()}`;
    const base = { requestedByUserId: owner!.userId, aiPromptVersionId, eventId, kind: 'quote_compare_summary' };
    const pending = await prisma.aIRecommendation.create({
      data: {
        ...base,
        status: 'pending',
        createdAt: new Date(Date.now() - 60_000),
        inputPayload: { category_code: categoryCode, quote_ids_snapshot: [] },
        outputPayload: { summaries: [] },
      },
    });
    await prisma.aIRecommendation.create({
      data: { ...base, status: 'failed', inputPayload: { category_code: categoryCode }, outputPayload: { errorCode: 'AI_PROVIDER_TIMEOUT' } },
    });

    const latest = await agent.get(`/api/v1/events/${eventId}/ai/quote-summary`).query({ category_code: categoryCode });
    expect(latest.status).toBe(200);
    expect(latest.body.data.ai_recommendation_id).toBe(pending.id);

    // Sólo un `failed` para la categoría → 404 (empty state), nunca el record fallido.
    const onlyFailed = `pr5_cat_${rnd()}`;
    await prisma.aIRecommendation.create({
      data: { ...base, status: 'failed', inputPayload: { category_code: onlyFailed }, outputPayload: { errorCode: 'AI_INVALID_OUTPUT' } },
    });
    expect((await agent.get(`/api/v1/events/${eventId}/ai/quote-summary`).query({ category_code: onlyFailed })).status).toBe(404);
  });
});
