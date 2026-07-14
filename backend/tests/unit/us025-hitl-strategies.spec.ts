// US-025 (PB-P1-016) / QA-001 — Unit tests: 8 `ApplyStrategy` MVP con `tx` mock.
// Verifica que cada strategy invoca la mutación esperada y retorna la trazabilidad correcta.
import { describe, it, expect, vi } from 'vitest';
import {
  EventPlanApplyStrategy,
  ChecklistApplyStrategy,
  BudgetSuggestionApplyStrategy,
  VendorCategoriesApplyStrategy,
  QuoteBriefApplyStrategy,
  QuoteComparisonApplyStrategy,
  VendorBioApplyStrategy,
  TaskPrioritizationApplyStrategy,
} from '../../src/modules/ai-assistance/application/hitl/strategies/index.js';
import type { AiRecommendationView } from '../../src/modules/ai-assistance/domain/ai-recommendation.js';
import { SideEffectFailedError } from '../../src/modules/ai-assistance/domain/errors/hitl.errors.js';

function buildRec(over: Partial<AiRecommendationView> = {}): AiRecommendationView {
  return {
    id: 'rec-1',
    type: 'event_plan',
    status: 'pending',
    requestedByUserId: 'u-1',
    eventId: 'evt-1',
    vendorProfileId: null,
    quoteRequestId: null,
    input: {},
    output: {},
    aiMeta: null,
    createdAt: '2026-07-13T00:00:00Z',
    ...over,
  };
}

function txMock(
  overrides: Record<string, unknown> = {},
): {
  event: { findFirst: ReturnType<typeof vi.fn> };
  eventTask: { createMany: ReturnType<typeof vi.fn> };
  budget: { upsert: ReturnType<typeof vi.fn> };
  budgetItem: { createMany: ReturnType<typeof vi.fn> };
  vendorProfile: { update: ReturnType<typeof vi.fn> };
} {
  return {
    event: { findFirst: vi.fn().mockResolvedValue({ id: 'evt-1' }) },
    eventTask: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    budget: { upsert: vi.fn().mockResolvedValue({ id: 'bud-1' }) },
    budgetItem: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    vendorProfile: { update: vi.fn().mockResolvedValue({}) },
    ...overrides,
  } as ReturnType<typeof txMock>;
}

describe('US-025 / QA-001 — 8 ApplyStrategy', () => {
  it('EventPlanApplyStrategy retorna trazabilidad `Event` + `eventId`', async () => {
    const tx = txMock();
    const s = new EventPlanApplyStrategy();
    const out = await s.applyInTransaction({
      tx: tx as never,
      recommendation: buildRec(),
      finalOutput: { summary: 's', phases: [{ name: 'p', tasks: ['t'] }] },
      actorId: 'u-1',
    });
    expect(out).toEqual({ appliedEntityType: 'Event', appliedEntityId: 'evt-1' });
    expect(tx.event.findFirst).toHaveBeenCalled();
  });

  it('EventPlanApplyStrategy sin eventId → SideEffectFailedError', async () => {
    const tx = txMock();
    const s = new EventPlanApplyStrategy();
    await expect(
      s.applyInTransaction({
        tx: tx as never,
        recommendation: buildRec({ eventId: null }),
        finalOutput: { summary: 's', phases: [] },
        actorId: 'u-1',
      }),
    ).rejects.toThrow(SideEffectFailedError);
  });

  it('ChecklistApplyStrategy crea N EventTask con `origin=ai`', async () => {
    const tx = txMock();
    const s = new ChecklistApplyStrategy();
    const out = await s.applyInTransaction({
      tx: tx as never,
      recommendation: buildRec({ type: 'checklist' }),
      finalOutput: {
        tasks: [
          {
            title: 'Reservar',
            description: 'x',
            category: 'venue',
            due_relative_days: 30,
            phase: 'T-30' as const,
            priority: 'high' as const,
          },
          {
            title: 'Enviar invitaciones',
            description: 'y',
            category: 'guests',
            due_relative_days: 60,
            phase: 'T-90' as const,
            priority: 'medium' as const,
          },
        ],
      },
      actorId: 'u-1',
    });
    expect(out).toEqual({ appliedEntityType: null, appliedEntityId: null });
    expect(tx.eventTask.createMany).toHaveBeenCalledTimes(1);
    const args = tx.eventTask.createMany.mock.calls[0]![0];
    expect(args.data).toHaveLength(2);
    expect(args.data[0]).toMatchObject({ eventId: 'evt-1', origin: 'ai', status: 'pending' });
  });

  it('BudgetSuggestionApplyStrategy hace upsert de Budget y createMany de BudgetItem', async () => {
    const tx = txMock();
    const s = new BudgetSuggestionApplyStrategy();
    const out = await s.applyInTransaction({
      tx: tx as never,
      recommendation: buildRec({ type: 'budget_suggestion' }),
      finalOutput: {
        categories: [
          { name: 'Venue', service_category_code: 'venue', percentage: 50, amount: 5000 },
          { name: 'Catering', service_category_code: 'catering', percentage: 50, amount: 5000 },
        ],
      },
      actorId: 'u-1',
    });
    expect(out).toEqual({ appliedEntityType: null, appliedEntityId: null });
    expect(tx.budget.upsert).toHaveBeenCalled();
    expect(tx.budgetItem.createMany).toHaveBeenCalledTimes(1);
    expect(tx.budgetItem.createMany.mock.calls[0]![0].data).toHaveLength(2);
  });

  it('VendorBioApplyStrategy actualiza VendorProfile.bio', async () => {
    const tx = txMock();
    const s = new VendorBioApplyStrategy();
    const out = await s.applyInTransaction({
      tx: tx as never,
      recommendation: buildRec({ type: 'vendor_bio', vendorProfileId: 'vp-1' }),
      finalOutput: { bio: 'Nuevo texto', highlights: ['a'] },
      actorId: 'u-1',
    });
    expect(out).toEqual({ appliedEntityType: 'VendorProfile', appliedEntityId: 'vp-1' });
    expect(tx.vendorProfile.update).toHaveBeenCalledWith({
      where: { id: 'vp-1' },
      data: { bio: 'Nuevo texto' },
    });
  });

  it('VendorBioApplyStrategy sin vendorProfileId → SideEffectFailedError', async () => {
    const tx = txMock();
    const s = new VendorBioApplyStrategy();
    await expect(
      s.applyInTransaction({
        tx: tx as never,
        recommendation: buildRec({ type: 'vendor_bio', vendorProfileId: null }),
        finalOutput: { bio: 'x', highlights: [] },
        actorId: 'u-1',
      }),
    ).rejects.toThrow(SideEffectFailedError);
  });

  it.each([
    ['vendor_categories', VendorCategoriesApplyStrategy],
    ['quote_brief', QuoteBriefApplyStrategy],
    ['quote_comparison', QuoteComparisonApplyStrategy],
    ['task_prioritization', TaskPrioritizationApplyStrategy],
  ] as const)('%s strategy (no-op, applied_entity=null) — placeholder handoff', async (_type, Ctor) => {
    const tx = txMock();
    const s = new Ctor();
    const out = await s.applyInTransaction({
      tx: tx as never,
      recommendation: buildRec({ type: s.type }),
      finalOutput: {},
      actorId: 'u-1',
    });
    expect(out).toEqual({ appliedEntityType: null, appliedEntityId: null });
  });
});
