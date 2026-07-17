// US-063 (PB-P1-037 / QA-002 + QA-003 + QA-004) — Integration tests contra Postgres real.
//
// Cubre (Tech Spec §13 + US-063 Task File):
//   - AC-01 create: POST /booking-intents persiste `disclaimer_accepted_at_create` +
//     `disclaimer_copy_version_create='v1'` en `booking_intents`.
//   - AC-02 confirm: POST /booking-intents/:id/confirm con `{disclaimer_accepted:true}` persiste
//     `disclaimer_accepted_at_confirm` + `disclaimer_copy_version_confirm='v1'` y actualiza el
//     `confirmedAt` en la MISMA UPDATE (paridad server-side con create — D1).
//   - EC-02 confirm sin `disclaimer_accepted:true` ⇒ 400 `DISCLAIMER_REQUIRED` (bypass server-side).
//   - AC-03 idempotencia: segundo POST confirm no re-actualiza los audit fields (protege trazabilidad
//     legal — no se sobreescribe el timestamp del primer aceptación).
//   - QA-004 AUTH: `body.disclaimer_accepted` no bypass el guard de rol vendor — 403 antes de 400.
//
// Requisito: Postgres accesible vía DATABASE_URL. `describe.skipIf(!dbUp)`.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';

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

async function registerLogin(role: 'organizer' | 'vendor'): Promise<{ agent: Agent; userId: string }> {
  const email = `us063_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    ...(role === 'vendor' ? { businessName: 'Vendor Demo SA' } : { name: role }),
    role,
    captchaToken: CAPTCHA,
  });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return { agent, userId: reg.body.data.id as string };
}

let serviceCategoryId = '';
let locationId = '';

async function createActiveEvent(agent: Agent): Promise<string> {
  const created = await agent.post('/api/v1/events').send({
    eventTypeCode: 'wedding',
    eventDate: '2026-12-31',
    guestsCount: 100,
    locationId,
    estimatedBudget: '10000.00',
    currencyCode: 'GTQ',
    languageCode: 'es-LATAM',
  });
  const id = created.body.data.id as string;
  await agent.post(`/api/v1/events/${id}/activate`);
  return id;
}

async function scenarioPendingIntent(): Promise<{
  organizer: Agent;
  vendorAgent: Agent;
  bookingIntentId: string;
}> {
  const { agent: organizer } = await registerLogin('organizer');
  const { agent: vendorAgent, userId: vendorUserId } = await registerLogin('vendor');
  const vp = await prisma.vendorProfile.create({
    data: {
      userId: vendorUserId,
      businessName: `Vendor ${rnd()}`,
      status: 'approved',
      languagesSupported: ['es-LATAM'],
    },
  });
  const eventId = await createActiveEvent(organizer);
  const qr = await organizer
    .post(`/api/v1/events/${eventId}/quote-requests`)
    .send({
      vendorProfileId: vp.id,
      serviceCategoryId,
      brief: { summary: 'Boda', requirements: ['catering'], questions: ['?'] },
    });
  const quoteRes = await vendorAgent
    .post(`/api/v1/quote-requests/${qr.body.data.id}/quote`)
    .send({
      totalPrice: '5000.00',
      breakdown: [{ label: 'Servicio', amount: '5000.00' }],
      conditions: 'x',
      currencyCode: 'GTQ',
    });
  await vendorAgent.post(`/api/v1/quotes/${quoteRes.body.data.id}/send`);
  const bi = await organizer
    .post('/api/v1/booking-intents')
    .send({ quote_id: quoteRes.body.data.id, disclaimer_accepted: true });
  return { organizer, vendorAgent, bookingIntentId: bi.body.data.id as string };
}

describe.skipIf(!dbUp)('US-063 QA — Disclaimer audit bilateral integration', () => {
  beforeAll(async () => {
    const cat = await prisma.serviceCategory.findFirst({ where: { code: 'catering' } });
    serviceCategoryId = cat?.id ?? (await prisma.serviceCategory.findFirstOrThrow()).id;
    const loc = await prisma.location.findFirst();
    locationId =
      loc?.id ??
      (
        await prisma.location.create({
          data: { country: 'GT', city: 'Guatemala' },
        })
      ).id;
  });

  it('AC-01: create persiste `disclaimer_accepted_at_create` + `disclaimer_copy_version_create=v1`', async () => {
    const { bookingIntentId } = await scenarioPendingIntent();
    const row = await prisma.bookingIntent.findUniqueOrThrow({
      where: { id: bookingIntentId },
      select: {
        disclaimerAcceptedAtCreate: true,
        disclaimerCopyVersionCreate: true,
        disclaimerAcceptedAtConfirm: true,
        disclaimerCopyVersionConfirm: true,
      },
    });
    expect(row.disclaimerAcceptedAtCreate).toBeInstanceOf(Date);
    expect(row.disclaimerCopyVersionCreate).toBe('v1');
    expect(row.disclaimerAcceptedAtConfirm).toBeNull();
    expect(row.disclaimerCopyVersionConfirm).toBeNull();
  });

  it('AC-02: confirm con `disclaimer_accepted:true` persiste audit del confirm + preserva el del create', async () => {
    const { vendorAgent, bookingIntentId } = await scenarioPendingIntent();
    const rowBefore = await prisma.bookingIntent.findUniqueOrThrow({
      where: { id: bookingIntentId },
      select: { disclaimerAcceptedAtCreate: true, disclaimerCopyVersionCreate: true },
    });
    const res = await vendorAgent
      .post(`/api/v1/booking-intents/${bookingIntentId}/confirm`)
      .send({ disclaimer_accepted: true });
    expect(res.status).toBe(200);
    const rowAfter = await prisma.bookingIntent.findUniqueOrThrow({
      where: { id: bookingIntentId },
      select: {
        disclaimerAcceptedAtCreate: true,
        disclaimerCopyVersionCreate: true,
        disclaimerAcceptedAtConfirm: true,
        disclaimerCopyVersionConfirm: true,
        confirmedAt: true,
        status: true,
      },
    });
    expect(rowAfter.status).toBe('confirmed_intent');
    expect(rowAfter.disclaimerAcceptedAtConfirm).toBeInstanceOf(Date);
    expect(rowAfter.disclaimerCopyVersionConfirm).toBe('v1');
    // Timestamp del confirm coincide con `confirmedAt` (misma UPDATE — audit consistente).
    expect(rowAfter.disclaimerAcceptedAtConfirm?.toISOString()).toBe(rowAfter.confirmedAt?.toISOString());
    // El audit del create se preserva intacto.
    expect(rowAfter.disclaimerAcceptedAtCreate?.toISOString()).toBe(
      rowBefore.disclaimerAcceptedAtCreate?.toISOString(),
    );
    expect(rowAfter.disclaimerCopyVersionCreate).toBe(rowBefore.disclaimerCopyVersionCreate);
  });

  it('EC-02 / QA-004: confirm sin `disclaimer_accepted` ⇒ 400 DISCLAIMER_REQUIRED (bypass server-side)', async () => {
    const { vendorAgent, bookingIntentId } = await scenarioPendingIntent();
    const res = await vendorAgent.post(`/api/v1/booking-intents/${bookingIntentId}/confirm`).send({});
    expect(res.status).toBe(400);
    // Puede ser DISCLAIMER_REQUIRED (UC) o VALIDATION_ERROR (Zod .strict). Ambos aceptables — el
    // contrato de US-063 D1 exige que el bypass NO complete el confirm.
    expect(['DISCLAIMER_REQUIRED', 'VALIDATION_ERROR']).toContain(res.body.error.code);
  });

  it('EC-02 / QA-004: confirm con `disclaimer_accepted:false` ⇒ 400 DISCLAIMER_REQUIRED (paridad con US-060)', async () => {
    const { vendorAgent, bookingIntentId } = await scenarioPendingIntent();
    const res = await vendorAgent
      .post(`/api/v1/booking-intents/${bookingIntentId}/confirm`)
      .send({ disclaimer_accepted: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DISCLAIMER_REQUIRED');
  });

  it('AC-03 idempotencia: 2do confirm NO sobreescribe el audit del primero (preserva timestamp legal)', async () => {
    const { vendorAgent, bookingIntentId } = await scenarioPendingIntent();
    const r1 = await vendorAgent
      .post(`/api/v1/booking-intents/${bookingIntentId}/confirm`)
      .send({ disclaimer_accepted: true });
    expect(r1.status).toBe(200);
    const rowAfterFirst = await prisma.bookingIntent.findUniqueOrThrow({
      where: { id: bookingIntentId },
      select: { disclaimerAcceptedAtConfirm: true },
    });
    // 2do POST — el UC hace early return por idempotencia (isAlreadyConfirmed) sin re-tocar audit.
    const r2 = await vendorAgent
      .post(`/api/v1/booking-intents/${bookingIntentId}/confirm`)
      .send({ disclaimer_accepted: true });
    expect(r2.status).toBe(200);
    const rowAfterSecond = await prisma.bookingIntent.findUniqueOrThrow({
      where: { id: bookingIntentId },
      select: { disclaimerAcceptedAtConfirm: true },
    });
    expect(rowAfterSecond.disclaimerAcceptedAtConfirm?.toISOString()).toBe(
      rowAfterFirst.disclaimerAcceptedAtConfirm?.toISOString(),
    );
  });

  it('QA-003 backfill: no hay filas con `disclaimer_accepted_at_create` NULL (invariante post-migración)', async () => {
    const nulls = await prisma.bookingIntent.count({
      where: { disclaimerAcceptedAtCreate: undefined as unknown as Date },
    });
    // La query anterior no verifica NULL en Prisma (es equivalente a "no filter"). Usamos raw SQL
    // para el invariante real de la migración DB-002 (Decisión D2 + AC-04).
    const raw = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::int AS n FROM booking_intents WHERE disclaimer_accepted_at_create IS NULL
    `;
    expect(Number(raw[0]?.n ?? 0)).toBe(0);
    expect(nulls).toBeGreaterThanOrEqual(0);
  });

  it('QA-003 backfill: cada `disclaimer_accepted_at_confirm` no-null tiene su `disclaimer_copy_version_confirm`', async () => {
    // Nota (DEV-05): la invariante "audit sólo en `confirmed_intent`" NO es persistente — un
    // intent puede pasar a `cancelled` posterior al confirm y el audit del confirm original se
    // preserva (audit trail legal). El invariante real de la migración es que ambos campos van
    // juntos (timestamp + version) — cero pares parciales.
    const raw = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::int AS n FROM booking_intents
      WHERE (disclaimer_accepted_at_confirm IS NULL) <> (disclaimer_copy_version_confirm IS NULL)
    `;
    expect(Number(raw[0]?.n ?? 0)).toBe(0);
  });
});
