// US-097 / QA-002 — Integration/API tests AI (Supertest + Prisma + MockAIProvider). AC-01..AC-12.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';

const prisma = new PrismaClient();
let dbUp = false;
try {
  await Promise.race([prisma.$queryRawUnsafe('SELECT 1'), new Promise((_, rej) => setTimeout(() => rej(new Error('t')), 4000))]);
  dbUp = true;
} catch {
  dbUp = false;
}

const app = createApp();
const CAPTCHA = '__test__';
const rnd = (): string => `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
type Agent = ReturnType<typeof request.agent>;

async function registerLogin(role: 'organizer' | 'vendor'): Promise<{ agent: Agent; userId: string }> {
  const email = `us097_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send({ acceptedTerms: true, email, password: 'Secret1234', ...(role === 'vendor' ? { businessName: 'Vendor Demo SA' } : { name: role }), role, captchaToken: CAPTCHA });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return { agent, userId: reg.body.data.id as string };
}

let locationId = '';
let serviceCategoryId = '';

async function activeEvent(agent: Agent): Promise<string> {
  const c = await agent.post('/api/v1/events').send({
    eventTypeCode: 'wedding', eventDate: '2026-12-31', guestsCount: 100, locationId,
    estimatedBudget: '10000.00', currencyCode: 'GTQ', languageCode: 'es-LATAM',
  });
  const id = c.body.data.id as string;
  await agent.post(`/api/v1/events/${id}/activate`);
  return id;
}

const EVENT_FEATURES: Array<[string, string]> = [
  ['event-plan', 'event_plan'],
  ['checklist', 'checklist'],
  ['budget-suggestion', 'budget_suggestion'],
  ['vendor-categories', 'vendor_categories'],
  ['quote-brief', 'quote_brief'],
  ['task-prioritization', 'task_prioritization'],
];

describe.skipIf(!dbUp)('US-097 QA-002 — AI integration', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ai_recommendations, booking_intents, quotes, quote_requests, events, sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    locationId = (await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } })).id;
    serviceCategoryId = (await prisma.serviceCategory.create({ data: { code: `cat_${rnd()}`, label: 'C', isActive: true } })).id;
  });

  it('AC-01..05/08/12: organizer genera cada feature de evento → 200 pending + aiMeta', async () => {
    const { agent } = await registerLogin('organizer');
    const eventId = await activeEvent(agent);
    for (const [path, type] of EVENT_FEATURES) {
      const res = await agent.post(`/api/v1/events/${eventId}/ai/${path}`).send({ input: { guests: 100 } });
      expect(res.status, `${path}`).toBe(200);
      expect(res.body.data).toMatchObject({ type, status: 'pending' });
      expect(res.body.data.output).toBeTruthy();
      expect(res.body.data.aiMeta).toMatchObject({ provider: 'mock', fallbackUsed: false, languageCode: 'es-LATAM' });
      expect(typeof res.body.data.aiMeta.latencyMs).toBe('number');
      expect(typeof res.body.data.recommendationId).toBe('string');
      expect(typeof res.body.meta.correlationId).toBe('string');
    }
  });

  it('AC-06: organizer genera quote comparison para QuoteRequest de su evento', async () => {
    const { agent } = await registerLogin('organizer');
    const { userId: vUser } = await registerLogin('vendor');
    const vp = (await prisma.vendorProfile.create({ data: { userId: vUser, businessName: 'V', status: 'approved', languagesSupported: ['es-LATAM'] } })).id;
    const eventId = await activeEvent(agent);
    const qr = await agent.post(`/api/v1/events/${eventId}/quote-requests`).send({ vendorProfileId: vp, serviceCategoryId, brief: { summary: 's', requirements: ['r'], questions: ['q'] } });
    const res = await agent.post(`/api/v1/quote-requests/${qr.body.data.id}/ai/comparison-summary`).send({ input: { quotes: [] } });
    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('quote_comparison');
  });

  it('AC-07: vendor genera bio para su propio perfil', async () => {
    const { agent, userId } = await registerLogin('vendor');
    await prisma.vendorProfile.create({ data: { userId, businessName: 'V', status: 'approved', languagesSupported: ['es-LATAM'] } });
    const res = await agent.post('/api/v1/vendors/me/ai/bio').send({ input: { services: ['catering'] } });
    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('vendor_bio');
  });

  it('AC-09/10/11: get, apply y discard de AIRecommendation por el owner', async () => {
    const { agent } = await registerLogin('organizer');
    const eventId = await activeEvent(agent);
    const gen = await agent.post(`/api/v1/events/${eventId}/ai/event-plan`).send({ input: { guests: 50 } });
    const recId = gen.body.data.recommendationId as string;

    const got = await agent.get(`/api/v1/ai-recommendations/${recId}`);
    expect(got.status).toBe(200);
    expect(got.body.data).toMatchObject({ recommendationId: recId, type: 'event_plan', status: 'pending' });

    const applied = await agent.post(`/api/v1/ai-recommendations/${recId}/apply`).send({});
    expect(applied.status).toBe(200);
    expect(applied.body.data.status).toBe('accepted');

    // Aplicar de nuevo → transición inválida.
    expect((await agent.post(`/api/v1/ai-recommendations/${recId}/apply`).send({})).status).toBe(422);

    // Nueva recomendación → discard.
    const gen2 = await agent.post(`/api/v1/events/${eventId}/ai/checklist`).send({ input: { x: 1 } });
    const disc = await agent.post(`/api/v1/ai-recommendations/${gen2.body.data.recommendationId}/discard`);
    expect(disc.status).toBe(204);
  });

  it('AC-06 no muta: pending no crea EventTask/Budget (HITL)', async () => {
    const before = await prisma.eventTask.count();
    const { agent } = await registerLogin('organizer');
    const eventId = await activeEvent(agent);
    await agent.post(`/api/v1/events/${eventId}/ai/checklist`).send({ input: { x: 1 } });
    expect(await prisma.eventTask.count()).toBe(before);
  });
});
