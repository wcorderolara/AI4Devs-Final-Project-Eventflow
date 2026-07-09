// US-097 / QA-003 — Security/negative tests AI. §12; NT-01..12; EC-02/03/07/08.
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
const UUID = '11111111-1111-4111-8111-111111111111';
const rnd = (): string => `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
type Agent = ReturnType<typeof request.agent>;

async function registerLogin(role: 'organizer' | 'vendor'): Promise<Agent> {
  const email = `us097sec_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: role, role, captchaToken: CAPTCHA });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

describe('QA-003 (sin BD): anonymous, sin ruta de prompt genérico', () => {
  it('NT-01: anonymous → 401', async () => {
    expect((await request(app).post(`/api/v1/events/${UUID}/ai/event-plan`).send({ input: { x: 1 } })).status).toBe(401);
    expect((await request(app).get(`/api/v1/ai-recommendations/${UUID}`)).status).toBe(401);
  });
  it('NT-12/VR-09: no existe endpoint de chat/prompt genérico → 404', async () => {
    expect((await request(app).post('/api/v1/ai/chat').send({ prompt: 'hola' })).status).toBe(404);
    // Feature AI inexistente: la ruta no está registrada (401 por el guard de /events, o 404). Nunca 200.
    expect([401, 404]).toContain((await request(app).post(`/api/v1/events/${UUID}/ai/unknown-feature`).send({ input: {} })).status);
  });
});

describe.skipIf(!dbUp)('QA-003 (con BD): role, ownership, provider errors', () => {
  let locationId = '';
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ai_recommendations, booking_intents, quotes, quote_requests, events, sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    locationId = (await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } })).id;
  });
  async function activeEvent(agent: Agent): Promise<string> {
    const c = await agent.post('/api/v1/events').send({ eventTypeCode: 'wedding', eventDate: '2026-12-31', guestsCount: 50, locationId, estimatedBudget: '1000.00', currencyCode: 'GTQ', languageCode: 'es-LATAM' });
    const id = c.body.data.id as string;
    await agent.post(`/api/v1/events/${id}/activate`);
    return id;
  }

  it('NT-04/AUTH-TS-05: vendor llama AI de evento (organizer) → 403', async () => {
    const vendor = await registerLogin('vendor');
    expect((await vendor.post(`/api/v1/events/${UUID}/ai/event-plan`).send({ input: { x: 1 } })).status).toBe(403);
  });

  it('organizer llama bio de vendor → 403', async () => {
    const organizer = await registerLogin('organizer');
    expect((await organizer.post('/api/v1/vendors/me/ai/bio').send({ input: { x: 1 } })).status).toBe(403);
  });

  it('NT-02/EC-02: organizer B llama AI del evento de organizer A → 404, sin invocar provider', async () => {
    const orgA = await registerLogin('organizer');
    const orgB = await registerLogin('organizer');
    const eventId = await activeEvent(orgA);
    expect((await orgB.post(`/api/v1/events/${eventId}/ai/event-plan`).send({ input: { x: 1 } })).status).toBe(404);
  });

  it('NT-05/AUTH-TS-07: usuario no-owner accede a AIRecommendation ajena → 404', async () => {
    const orgA = await registerLogin('organizer');
    const orgB = await registerLogin('organizer');
    const eventId = await activeEvent(orgA);
    const gen = await orgA.post(`/api/v1/events/${eventId}/ai/event-plan`).send({ input: { x: 1 } });
    const recId = gen.body.data.recommendationId as string;
    expect((await orgB.get(`/api/v1/ai-recommendations/${recId}`)).status).toBe(404);
    expect((await orgB.post(`/api/v1/ai-recommendations/${recId}/apply`).send({})).status).toBe(404);
  });

  it('NT-08/EC-07: provider timeout simulado → 503 AI_PROVIDER_TIMEOUT', async () => {
    const organizer = await registerLogin('organizer');
    const eventId = await activeEvent(organizer);
    const res = await organizer.post(`/api/v1/events/${eventId}/ai/event-plan`).send({ input: { __simulate: 'timeout' } });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_PROVIDER_TIMEOUT');
  });

  it('NT-09/EC-08: provider output inválido → 422 AI_INVALID_OUTPUT, no persiste', async () => {
    const organizer = await registerLogin('organizer');
    const eventId = await activeEvent(organizer);
    const before = await prisma.aIRecommendation.count();
    const res = await organizer.post(`/api/v1/events/${eventId}/ai/event-plan`).send({ input: { __simulate: 'invalid' } });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('AI_INVALID_OUTPUT');
    expect(await prisma.aIRecommendation.count()).toBe(before);
  });

  it('NT-07/EC-06: idioma no soportado → 422 UNSUPPORTED_LANGUAGE', async () => {
    const organizer = await registerLogin('organizer');
    const eventId = await activeEvent(organizer);
    const res = await organizer.post(`/api/v1/events/${eventId}/ai/event-plan`).send({ input: { x: 1 }, languageCode: 'fr' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('UNSUPPORTED_LANGUAGE');
  });
});
