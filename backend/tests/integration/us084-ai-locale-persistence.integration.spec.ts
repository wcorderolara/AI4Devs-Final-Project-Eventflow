// US-084 (PB-P1-049 / QA-002, QA-004) — Integración Postgres real. Verifica:
//   - AC-03/AC-05: `PrismaAIRecommendationRepository.create` denormaliza `locale` y
//     `localeFallback` a columnas dedicadas, además de dejarlas en `ai_meta`.
//   - EC-03 / DB-001: Después del backfill (aplicado por `prisma migrate deploy` en el runner
//     de CI, o por el harness local), la columna `locale` está NOT NULL con default `es-LATAM`
//     y refleja el idioma del evento asociado cuando la row precede al schema con columnas.
//
// Sin BD alcanzable → skip limpio (patrón US-122).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaAIRecommendationRepository } from '../../src/modules/ai-assistance/infrastructure/prisma-ai-recommendation.repository.js';
import { syncPromptVersionsFromRegistry, promptVersionSyncRows } from '../../src/modules/ai-assistance/infrastructure/ai-prompt-version-sync.js';
import { PersistAIRecommendationService } from '../../src/modules/ai-assistance/application/persist-ai-recommendation.service.js';

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

const USER_ID = '00000000-0000-4000-8000-0000000a1184';
const USER_EMAIL = 'us084.locale.test@example.com';
const EVENT_TYPE_ID = '00000000-0000-4000-8000-0000000a1185';
const EVENT_ID_PT = '00000000-0000-4000-8000-0000000a1186';
const EVENT_ID_EN = '00000000-0000-4000-8000-0000000a1187';
const repo = new PrismaAIRecommendationRepository(prisma);
const service = new PersistAIRecommendationService(repo);

function persistInput(opts: {
  promptVersionId: string;
  eventId: string;
  language: 'pt' | 'en';
  fallbackUsed: boolean;
}) {
  return {
    requestedByUserId: USER_ID,
    type: 'event_plan' as const,
    promptVersionId: opts.promptVersionId,
    provider: 'mock' as const,
    languageCode: opts.language,
    fallbackUsed: opts.fallbackUsed,
    timeoutMs: 60000,
    latencyMs: 33,
    correlationId: 'it-us084-corr',
    inputPayload: { eventType: 'wedding' },
    outputPayload: { summary: 'Plan', phases: [{ name: 'F1', tasks: ['t1'] }] },
    schemaValid: true,
    eventId: opts.eventId,
    vendorProfileId: null,
    quoteRequestId: null,
  };
}

describe.skipIf(!dbUp)('US-084 integración — locale + locale_fallback denormalizados', () => {
  beforeAll(async () => {
    await syncPromptVersionsFromRegistry(repo);
    await prisma.user.upsert({
      where: { id: USER_ID },
      update: {},
      create: { id: USER_ID, email: USER_EMAIL, passwordHash: 'x'.repeat(20), role: 'organizer' },
    });
    await prisma.eventType.upsert({
      where: { id: EVENT_TYPE_ID },
      update: {},
      create: { id: EVENT_TYPE_ID, code: 'us084-test-type', label: 'US-084 Test Type' },
    });
    await prisma.event.upsert({
      where: { id: EVENT_ID_PT },
      update: {},
      create: {
        id: EVENT_ID_PT,
        userId: USER_ID,
        eventTypeId: EVENT_TYPE_ID,
        title: 'US-084 PT Event',
        language: 'pt',
      },
    });
    await prisma.event.upsert({
      where: { id: EVENT_ID_EN },
      update: {},
      create: {
        id: EVENT_ID_EN,
        userId: USER_ID,
        eventTypeId: EVENT_TYPE_ID,
        title: 'US-084 EN Event',
        language: 'en',
      },
    });
  });

  afterAll(async () => {
    await prisma.aIRecommendation.deleteMany({ where: { requestedByUserId: USER_ID } });
    await prisma.event.deleteMany({ where: { id: { in: [EVENT_ID_PT, EVENT_ID_EN] } } });
    await prisma.eventType.deleteMany({ where: { id: EVENT_TYPE_ID } });
    await prisma.user.deleteMany({ where: { id: USER_ID } });
    await prisma.$disconnect();
  });

  it('AC-03: persistir con languageCode=pt → row.locale="pt" y ai_meta.languageCode="pt"', async () => {
    const promptVersionId = promptVersionSyncRows()[0]!.id;
    const view = await service.persist(
      persistInput({ promptVersionId, eventId: EVENT_ID_PT, language: 'pt', fallbackUsed: false }),
    );
    const row = await prisma.aIRecommendation.findUnique({ where: { id: view.id } });
    expect(row).not.toBeNull();
    expect(row!.locale).toBe('pt');
    expect(row!.localeFallback).toBe(false);
    expect((row!.aiMeta as Record<string, unknown>).languageCode).toBe('pt');
  });

  it('AC-05: fallbackUsed=true se refleja en row.locale_fallback y en ai_meta.fallbackUsed', async () => {
    const promptVersionId = promptVersionSyncRows()[0]!.id;
    const view = await service.persist(
      persistInput({ promptVersionId, eventId: EVENT_ID_EN, language: 'en', fallbackUsed: true }),
    );
    const row = await prisma.aIRecommendation.findUnique({ where: { id: view.id } });
    expect(row).not.toBeNull();
    expect(row!.locale).toBe('en');
    expect(row!.localeFallback).toBe(true);
    expect((row!.aiMeta as Record<string, unknown>).fallbackUsed).toBe(true);
  });

  it('EC-03 / QA-004: la columna `locale` está NOT NULL con default `es-LATAM` (backfill preservado)', async () => {
    // Introspección del schema: el default se aplica cuando el insert omite `locale`. Verificamos
    // con un raw INSERT que solo aporta las columnas obligatorias sin el nuevo `locale` y
    // aseguramos que Postgres materializa el default.
    const promptVersionId = promptVersionSyncRows()[0]!.id;
    const rawId = '00000000-0000-4000-8000-0000000a1188';
    // `@updatedAt` (Prisma) NO se traduce a DEFAULT en Postgres — hay que suministrarlo
    // explícitamente en raw SQL. `@default(now())` sí se materializa como DEFAULT (created_at).
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ai_recommendations
        (id, event_id, ai_prompt_version_id, requested_by_user_id, kind,
         input_payload, output_payload, updated_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'event_plan',
              '{}'::jsonb, '{}'::jsonb, now())
      `,
      rawId,
      EVENT_ID_PT,
      promptVersionId,
      USER_ID,
    );
    const row = await prisma.aIRecommendation.findUnique({ where: { id: rawId } });
    expect(row).not.toBeNull();
    expect(row!.locale).toBe('es-LATAM');
    expect(row!.localeFallback).toBe(false);
  });
});
