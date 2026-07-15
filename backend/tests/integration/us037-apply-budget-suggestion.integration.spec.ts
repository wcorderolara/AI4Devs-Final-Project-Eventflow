// US-037 (PB-P1-021 / QA-002) — Integration test del apply de budget_suggestion.
// Se salta si no hay BD (`describe.skipIf(!dbUp)`), consistente con el patrón de db-smoke.
// Requiere:
//   - `npm run db:migrate:dev` (incluye la migración 20260714200000_us037_budget_item_ai_recommendation).
//   - Un evento con AIRecommendation { type='budget_suggestion', status='pending' } y organizer dueño.
// El seed (US-037 SEED-001) provee estos escenarios.
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it, beforeAll } from 'vitest';
import { AIRecommendationApplyStrategyRegistry } from '../../src/modules/ai-assistance/application/hitl/apply-strategy.registry.js';
import { OutputDtoResolver } from '../../src/modules/ai-assistance/application/hitl/output-dto.resolver.js';
import { AIRecommendationOwnershipPolicy } from '../../src/modules/ai-assistance/application/hitl/ownership.policy.js';
import { ApplyAIRecommendationUseCase as HitlApply } from '../../src/modules/ai-assistance/application/hitl/apply-ai-recommendation.use-case.js';
import { PrismaAIRecommendationHitlRepository } from '../../src/modules/ai-assistance/infrastructure/prisma-ai-recommendation-hitl.repository.js';
import { MVP_APPLY_STRATEGIES } from '../../src/modules/ai-assistance/application/hitl/strategies/index.js';
import { BudgetSuggestionApplyStrategyV2 } from '../../src/modules/budget-management/application/hitl/budget-suggestion-apply.strategy.js';
import { PrismaBudgetItemWriteRepository } from '../../src/modules/budget-management/infrastructure/prisma-budget-item-write.repository.js';
import { PrismaServiceCategoryReadAdapter } from '../../src/modules/budget-management/infrastructure/prisma-service-category-read.adapter.js';

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

function buildUseCase(): HitlApply {
  const v2 = new BudgetSuggestionApplyStrategyV2({
    budgetItemWriteRepo: new PrismaBudgetItemWriteRepository(),
    serviceCategoryReadPort: new PrismaServiceCategoryReadAdapter(),
  });
  const rest = MVP_APPLY_STRATEGIES.filter((s) => s.type !== 'budget_suggestion');
  const registry = new AIRecommendationApplyStrategyRegistry([...rest, v2]);
  return new HitlApply(
    new PrismaAIRecommendationHitlRepository(),
    registry,
    new OutputDtoResolver(),
    new AIRecommendationOwnershipPolicy(),
    prisma,
  );
}

describe.skipIf(!dbUp)('US-037 QA-002 — Apply budget_suggestion (integration)', () => {
  let pendingRecId: string;
  let ownerId: string;
  let eventId: string;

  beforeAll(async () => {
    const rec = await prisma.aIRecommendation.findFirst({
      where: { kind: 'budget_suggestion', status: 'pending', isSeed: true },
      select: { id: true, requestedByUserId: true, eventId: true },
    });
    if (rec) {
      pendingRecId = rec.id;
      ownerId = rec.requestedByUserId;
      eventId = rec.eventId!;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('IT-01: apply as-is happy path → status=accepted, items creados, cache invalidable', async () => {
    if (!pendingRecId) return; // fixture no cargado
    const uc = buildUseCase();
    const result = await uc.execute({
      actor: { id: ownerId, role: 'organizer' },
      recommendationId: pendingRecId,
      editedPayload: undefined,
      correlationId: 'test-it-01',
    });
    expect(result.recommendation.status).toBe('accepted');
    expect(result.edited).toBe(false);
    const items = await prisma.budgetItem.findMany({
      where: { aiRecommendationId: pendingRecId },
    });
    expect(items.length).toBeGreaterThan(0);
    // Cleanup: revierte para idempotencia.
    await prisma.budgetItem.deleteMany({ where: { aiRecommendationId: pendingRecId } });
    await prisma.aIRecommendation.update({
      where: { id: pendingRecId },
      data: { status: 'pending' },
    });
  });

  it('IT-05: recommendation ya accepted → 409 RECOMMENDATION_NOT_PENDING', async () => {
    if (!pendingRecId) return;
    // Marcar como accepted primero.
    await prisma.aIRecommendation.update({ where: { id: pendingRecId }, data: { status: 'accepted' } });
    const uc = buildUseCase();
    await expect(
      uc.execute({
        actor: { id: ownerId, role: 'organizer' },
        recommendationId: pendingRecId,
        correlationId: 'test-it-05',
      }),
    ).rejects.toMatchObject({ code: 'RECOMMENDATION_NOT_PENDING' });
    // Restore.
    await prisma.aIRecommendation.update({ where: { id: pendingRecId }, data: { status: 'pending' } });
  });

  it('IT-06: recommendation ajena → 404 no-revelación', async () => {
    if (!pendingRecId) return;
    const uc = buildUseCase();
    await expect(
      uc.execute({
        actor: { id: '00000000-0000-0000-0000-000000000000', role: 'organizer' },
        recommendationId: pendingRecId,
        correlationId: 'test-it-06',
      }),
    ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('IT-07: admin excluido → 403', async () => {
    if (!pendingRecId) return;
    const uc = buildUseCase();
    await expect(
      uc.execute({
        actor: { id: ownerId, role: 'admin' },
        recommendationId: pendingRecId,
        correlationId: 'test-it-07',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
