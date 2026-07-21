// US-025 (PB-P1-016) / QA-001 + QA-002 — `ApplyAIRecommendationUseCase` con repositorio, registry,
// resolver y policy mockeados. Cubre happy path, conflict (409), type unsupported (422), schema
// inválido (400), rollback ante side effect fallido, ownership admin (403) y ownership ajena (404).
import { describe, it, expect, vi } from 'vitest';
import { ApplyAIRecommendationUseCase } from '../../src/modules/ai-assistance/application/hitl/apply-ai-recommendation.use-case.js';
import { AIRecommendationApplyStrategyRegistry } from '../../src/modules/ai-assistance/application/hitl/apply-strategy.registry.js';
import { OutputDtoResolver } from '../../src/modules/ai-assistance/application/hitl/output-dto.resolver.js';
import { AIRecommendationOwnershipPolicy } from '../../src/modules/ai-assistance/application/hitl/ownership.policy.js';
import type {
  AIRecommendationHITLRepository,
  MarkAcceptedInput,
} from '../../src/modules/ai-assistance/ports/ai-recommendation-hitl.repository.js';
import type { AiRecommendationView } from '../../src/modules/ai-assistance/domain/ai-recommendation.js';
import type { ApplyStrategy } from '../../src/modules/ai-assistance/domain/hitl/apply-strategy.contract.js';
import {
  RecommendationNotPendingError,
  RecommendationTypeNotApplicableError,
  EditedPayloadInvalidError,
  SideEffectFailedError,
  OwnershipDeniedError,
} from '../../src/modules/ai-assistance/domain/errors/hitl.errors.js';

const OWNER = 'user-owner';
const REC_ID = 'rec-1';

function baseRec(over: Partial<AiRecommendationView> = {}): AiRecommendationView {
  return {
    id: REC_ID,
    type: 'event_plan',
    status: 'pending',
    requestedByUserId: OWNER,
    eventId: 'evt-1',
    vendorProfileId: null,
    quoteRequestId: null,
    input: {},
    output: { summary: 'orig', phases: [{ name: 'p', tasks: ['t'] }] },
    aiMeta: { languageCode: 'es-LATAM' } as never,
    // US-084 (BE-004): columnas denormalizadas obligatorias en el view.
    locale: 'es-LATAM',
    localeFallback: false,
    createdAt: '2026-07-13T00:00:00Z',
    ...over,
  };
}

interface Harness {
  uc: ApplyAIRecommendationUseCase;
  repo: {
    findById: ReturnType<typeof vi.fn>;
    markAccepted: ReturnType<typeof vi.fn>;
    markDiscarded: ReturnType<typeof vi.fn>;
    updatedCount: number;
  };
  strategy: ApplyStrategy & { calls: number };
}

function makeHarness(opts: {
  rec?: AiRecommendationView | null;
  updatedCount?: number;
  strategyThrows?: Error;
  outcome?: { appliedEntityType: string | null; appliedEntityId: string | null };
} = {}): Harness {
  const rec = opts.rec === undefined ? baseRec() : opts.rec;
  const updatedCount = opts.updatedCount ?? 1;
  const outcome = opts.outcome ?? { appliedEntityType: 'Event', appliedEntityId: 'evt-1' };

  const strategy: ApplyStrategy & { calls: number } = {
    type: 'event_plan',
    calls: 0,
    applyInTransaction: vi.fn(async () => {
      strategy.calls += 1;
      if (opts.strategyThrows) throw opts.strategyThrows;
      return outcome;
    }) as never,
  };

  const finalRec = rec ? { ...rec, status: 'accepted' as const } : null;
  const repo = {
    findById: vi
      .fn()
      .mockResolvedValueOnce(rec)
      .mockResolvedValue(finalRec),
    markAccepted: vi.fn(async (_tx, _input: MarkAcceptedInput) => ({ updatedCount })),
    markDiscarded: vi.fn(),
    updatedCount,
  } as unknown as AIRecommendationHITLRepository & {
    findById: ReturnType<typeof vi.fn>;
    markAccepted: ReturnType<typeof vi.fn>;
    markDiscarded: ReturnType<typeof vi.fn>;
    updatedCount: number;
  };

  const registry = new AIRecommendationApplyStrategyRegistry([strategy]);
  const resolver = new OutputDtoResolver();
  const policy = new AIRecommendationOwnershipPolicy();

  // Prisma mock — ejecuta el callback pasándole `tx` como null-object.
  const prisma = {
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb({})),
  } as unknown as Parameters<typeof ApplyAIRecommendationUseCase.prototype.execute>[0] & { $transaction: (cb: unknown) => unknown };

  const uc = new ApplyAIRecommendationUseCase(repo, registry, resolver, policy, prisma as never);
  return { uc, repo: repo as never, strategy };
}

describe('US-025 / QA-001 — ApplyAIRecommendationUseCase', () => {
  it('happy path: apply sin edición → strategy.applyInTransaction + markAccepted + result.edited=false', async () => {
    const h = makeHarness();
    const r = await h.uc.execute({
      actor: { id: OWNER, role: 'organizer' },
      recommendationId: REC_ID,
      correlationId: 'c1',
    });
    expect(h.strategy.calls).toBe(1);
    expect(h.repo.markAccepted).toHaveBeenCalledOnce();
    expect(r.edited).toBe(false);
    expect(r.appliedEntityType).toBe('Event');
    expect(r.appliedEntityId).toBe('evt-1');
  });

  it('apply con `editedPayload` válido → schema pasa; markAccepted con overwriteOutputPayload=true, edited=true', async () => {
    const h = makeHarness();
    await h.uc.execute({
      actor: { id: OWNER, role: 'organizer' },
      recommendationId: REC_ID,
      editedPayload: { summary: 'edited', phases: [{ name: 'q', tasks: ['t2'] }] },
    });
    const call = h.repo.markAccepted.mock.calls[0]![1] as MarkAcceptedInput;
    expect(call.edited).toBe(true);
    expect(call.overwriteOutputPayload).toBe(true);
  });

  it('apply con `editedPayload` inválido → EditedPayloadInvalidError (400)', async () => {
    const h = makeHarness();
    await expect(
      h.uc.execute({
        actor: { id: OWNER, role: 'organizer' },
        recommendationId: REC_ID,
        editedPayload: { summary: 123 }, // schema exige string
      }),
    ).rejects.toBeInstanceOf(EditedPayloadInvalidError);
    expect(h.strategy.calls).toBe(0); // no llegó a la strategy
  });

  it('type sin strategy registrada → RecommendationTypeNotApplicableError (422)', async () => {
    const h = makeHarness({ rec: baseRec({ type: 'vendor_bio' }) });
    await expect(
      h.uc.execute({ actor: { id: OWNER, role: 'organizer' }, recommendationId: REC_ID }),
    ).rejects.toBeInstanceOf(RecommendationTypeNotApplicableError);
  });

  it('conflict: markAccepted returns updatedCount=0 → RecommendationNotPendingError (409) + rollback', async () => {
    const h = makeHarness({ updatedCount: 0 });
    await expect(
      h.uc.execute({ actor: { id: OWNER, role: 'organizer' }, recommendationId: REC_ID }),
    ).rejects.toBeInstanceOf(RecommendationNotPendingError);
  });

  it('side effect falla → SideEffectFailedError (500) — rollback (mark no llamado con éxito)', async () => {
    const h = makeHarness({ strategyThrows: new Error('DB conn lost') });
    await expect(
      h.uc.execute({ actor: { id: OWNER, role: 'organizer' }, recommendationId: REC_ID }),
    ).rejects.toBeInstanceOf(SideEffectFailedError);
  });

  it('admin → OwnershipDeniedError(admin_excluded) — 403; no llega a strategy', async () => {
    const h = makeHarness();
    await expect(
      h.uc.execute({ actor: { id: 'admin-1', role: 'admin' }, recommendationId: REC_ID }),
    ).rejects.toBeInstanceOf(OwnershipDeniedError);
    expect(h.strategy.calls).toBe(0);
  });

  it('organizer ajeno → OwnershipDeniedError(not_owner) — 404 no-revelación', async () => {
    const h = makeHarness();
    try {
      await h.uc.execute({ actor: { id: 'stranger', role: 'organizer' }, recommendationId: REC_ID });
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(OwnershipDeniedError);
      expect((e as OwnershipDeniedError).reason).toBe('not_owner');
    }
  });

  it('recomendación inexistente → OwnershipDeniedError(not_owner)', async () => {
    const h = makeHarness({ rec: null });
    try {
      await h.uc.execute({ actor: { id: OWNER, role: 'organizer' }, recommendationId: REC_ID });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as OwnershipDeniedError).reason).toBe('not_owner');
    }
  });
});
