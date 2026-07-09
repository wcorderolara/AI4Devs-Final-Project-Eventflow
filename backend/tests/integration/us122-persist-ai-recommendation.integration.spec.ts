// US-122 / QA-003 (AC-01, AC-03, AC-10) — integración Prisma real. Verifica inserción con FKs
// (`User`, `AIPromptVersion`), estado `pending`, metadata en `ai_meta`, rechazo de prompt version
// inexistente y soporte de transaction client. Skip limpio si no hay BD alcanzable (patrón del repo).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaAIRecommendationRepository } from '../../src/modules/ai-assistance/infrastructure/prisma-ai-recommendation.repository.js';
import { syncPromptVersionsFromRegistry, promptVersionSyncRows } from '../../src/modules/ai-assistance/infrastructure/ai-prompt-version-sync.js';
import { PersistAIRecommendationService } from '../../src/modules/ai-assistance/application/persist-ai-recommendation.service.js';
import { AIPromptVersionNotFoundError } from '../../src/modules/ai-assistance/domain/errors/ai-recommendation-persistence.errors.js';

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

const USER_ID = '00000000-0000-4000-8000-0000000a1122';
const USER_EMAIL = 'us122.persist.test@example.com';
const repo = new PrismaAIRecommendationRepository(prisma);
const service = new PersistAIRecommendationService(repo);

function validInput(promptVersionId: string) {
  return {
    requestedByUserId: USER_ID,
    type: 'event_plan' as const,
    promptVersionId,
    provider: 'mock' as const,
    languageCode: 'es-LATAM',
    fallbackUsed: false,
    timeoutMs: 60000,
    latencyMs: 55,
    correlationId: 'it-corr-1',
    inputPayload: { eventType: 'wedding', apiKey: 'sk-should-be-removed' },
    outputPayload: { summary: 'Plan', phases: [{ name: 'F1', tasks: ['t1'] }] },
    schemaValid: true,
    eventId: null,
    vendorProfileId: null,
    quoteRequestId: null,
  };
}

describe.skipIf(!dbUp)('US-122 integración — persistencia AIRecommendation con Prisma', () => {
  beforeAll(async () => {
    await syncPromptVersionsFromRegistry(repo);
    await prisma.user.upsert({
      where: { id: USER_ID },
      update: {},
      create: { id: USER_ID, email: USER_EMAIL, passwordHash: 'x'.repeat(20), role: 'organizer' },
    });
  });

  afterAll(async () => {
    await prisma.aIRecommendation.deleteMany({ where: { requestedByUserId: USER_ID } });
    await prisma.user.deleteMany({ where: { id: USER_ID } });
    await prisma.$disconnect();
  });

  it('AC-01/AC-06: persiste pending con FKs, ai_meta y input sanitizado', async () => {
    const promptVersionId = promptVersionSyncRows()[0]!.id;
    const view = await service.persist(validInput(promptVersionId));
    expect(view.status).toBe('pending');

    const row = await prisma.aIRecommendation.findUnique({ where: { id: view.id } });
    expect(row).not.toBeNull();
    expect(row!.aiPromptVersionId).toBe(promptVersionId);
    expect(row!.requestedByUserId).toBe(USER_ID);
    expect(row!.status).toBe('pending');
    // Sanitización: apiKey no debe persistirse.
    expect(JSON.stringify(row!.inputPayload)).not.toContain('sk-should-be-removed');
    // Metadata en ai_meta.
    expect((row!.aiMeta as Record<string, unknown>).provider).toBe('mock');
    expect((row!.aiMeta as Record<string, unknown>).correlationId).toBe('it-corr-1');
  });

  it('AC-03: promptVersionId inexistente => AIPromptVersionNotFoundError', async () => {
    await expect(service.persist(validInput('00000000-0000-4000-8000-0000000fffff'))).rejects.toBeInstanceOf(AIPromptVersionNotFoundError);
  });

  it('AC-10: soporta transaction client (insert dentro de $transaction)', async () => {
    const promptVersionId = promptVersionSyncRows()[0]!.id;
    const id = await prisma.$transaction(async (tx) => {
      const v = await service.persist(validInput(promptVersionId), { tx });
      return v.id;
    });
    const row = await prisma.aIRecommendation.findUnique({ where: { id } });
    expect(row).not.toBeNull();
  });
});
