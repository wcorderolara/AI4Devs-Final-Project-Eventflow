// US-026 (PB-P2-003 / QA-001) — Unit tests para regeneración cross-cutting de AIRecommendation.
// Cubre:
//   - DTO `RegenerateAiRecommendationBodySchema` (EC-01).
//   - Helper `injectFeedbackForRegeneration` (AC-03).
//   - `AIRecommendationOwnerResolver` matrix polimórfica (AC-05).
//   - `PromptTemplateResolver` + `OutputSchemaResolver` (AC-01).
//   - `resolveAIRegenerateConfig` (D10).
//   - `RegenerateAIRecommendationUseCase` branches (AC-01..08, EC-01..04).
//   - `Us026RegenerationLimitError` mapping (AC-02).
//   - Response mapper `toRegenerateResponse` (contrato §7).
import { describe, it, expect, vi } from 'vitest';
import { RegenerateAiRecommendationBodySchema } from '../../src/modules/ai-assistance/dto/regenerate.request.js';
import {
  injectFeedbackForRegeneration,
  FEEDBACK_BLOCK_START,
  FEEDBACK_BLOCK_END,
  FEEDBACK_EMPTY_PLACEHOLDER,
} from '../../src/modules/ai-assistance/application/regenerate/inject-feedback.helper.js';
import { AIRecommendationOwnerResolver } from '../../src/modules/ai-assistance/application/regenerate/owner-resolver.js';
import {
  PromptTemplateResolver,
  OutputSchemaResolver,
} from '../../src/modules/ai-assistance/application/regenerate/type-resolvers.js';
import {
  resolveAIRegenerateConfig,
  DEFAULT_MAX_REGENERATIONS_PER_LINEAGE,
} from '../../src/modules/ai-assistance/application/regenerate/regenerate-config.js';
import {
  RegenerateAIRecommendationUseCase,
} from '../../src/modules/ai-assistance/application/regenerate/regenerate-ai-recommendation.use-case.js';
import { Us026RegenerationLimitError } from '../../src/modules/ai-assistance/domain/us026.errors.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import { toRegenerateResponse } from '../../src/modules/ai-assistance/dto/regenerate.response.js';
import { OUTPUT_SCHEMAS } from '../../src/modules/ai-assistance/domain/ai-features.js';
import type { AiRecommendationView } from '../../src/modules/ai-assistance/domain/ai-recommendation.js';

// ─── DTO ──────────────────────────────────────────────────────────────────────

describe('US-026 QA-001 — RegenerateAiRecommendationBodySchema (EC-01)', () => {
  it('acepta body vacío (AC-03 feedback opcional)', () => {
    expect(RegenerateAiRecommendationBodySchema.parse({})).toEqual({});
  });

  it('acepta feedback string dentro del límite', () => {
    const parsed = RegenerateAiRecommendationBodySchema.parse({ feedback: 'Menos formal' });
    expect(parsed.feedback).toBe('Menos formal');
  });

  it('rechaza feedback > 500 chars (EC-01)', () => {
    expect(() =>
      RegenerateAiRecommendationBodySchema.parse({ feedback: 'x'.repeat(501) }),
    ).toThrow();
  });

  it('acepta feedback exactamente 500 chars', () => {
    const parsed = RegenerateAiRecommendationBodySchema.parse({ feedback: 'x'.repeat(500) });
    expect(parsed.feedback?.length).toBe(500);
  });

  it('rechaza campos desconocidos (strict)', () => {
    expect(() =>
      RegenerateAiRecommendationBodySchema.parse({ feedback: 'x', extra: 'y' }),
    ).toThrow();
  });

  it('acepta preferMock=true', () => {
    expect(
      RegenerateAiRecommendationBodySchema.parse({ preferMock: true }).preferMock,
    ).toBe(true);
  });
});

// ─── Helper ───────────────────────────────────────────────────────────────────

describe('US-026 QA-001 — injectFeedbackForRegeneration (AC-03)', () => {
  it('apenda el bloque delimitado con feedback', () => {
    const out = injectFeedbackForRegeneration('BASE', 'Menos formal');
    expect(out).toContain('BASE');
    expect(out).toContain(FEEDBACK_BLOCK_START);
    expect(out).toContain('Menos formal');
    expect(out).toContain(FEEDBACK_BLOCK_END);
    expect(out.endsWith(FEEDBACK_BLOCK_END)).toBe(true);
  });

  it('con feedback vacío usa el placeholder (AC-03)', () => {
    const out = injectFeedbackForRegeneration('BASE', '');
    expect(out).toContain(FEEDBACK_EMPTY_PLACEHOLDER);
    expect(out).not.toContain('  \n\n');
  });

  it('preserva el template original íntegro', () => {
    const out = injectFeedbackForRegeneration('SYSTEM_PROMPT\nRules', 'x');
    expect(out.startsWith('SYSTEM_PROMPT\nRules')).toBe(true);
  });
});

// ─── Config ──────────────────────────────────────────────────────────────────

describe('US-026 QA-001 — resolveAIRegenerateConfig (D10)', () => {
  it('default 5 si la env var no está definida', () => {
    expect(resolveAIRegenerateConfig({}).maxRegenerationsPerLineage).toBe(
      DEFAULT_MAX_REGENERATIONS_PER_LINEAGE,
    );
  });

  it('parsea env var entera positiva', () => {
    expect(
      resolveAIRegenerateConfig({ AI_MAX_REGENERATIONS_PER_LINEAGE: '3' })
        .maxRegenerationsPerLineage,
    ).toBe(3);
  });

  it('degrada al default con valor <= 0', () => {
    expect(
      resolveAIRegenerateConfig({ AI_MAX_REGENERATIONS_PER_LINEAGE: '0' })
        .maxRegenerationsPerLineage,
    ).toBe(DEFAULT_MAX_REGENERATIONS_PER_LINEAGE);
  });

  it('degrada al default con valor no numérico', () => {
    expect(
      resolveAIRegenerateConfig({ AI_MAX_REGENERATIONS_PER_LINEAGE: 'abc' })
        .maxRegenerationsPerLineage,
    ).toBe(DEFAULT_MAX_REGENERATIONS_PER_LINEAGE);
  });

  it('degrada al default con string vacío', () => {
    expect(
      resolveAIRegenerateConfig({ AI_MAX_REGENERATIONS_PER_LINEAGE: '' })
        .maxRegenerationsPerLineage,
    ).toBe(DEFAULT_MAX_REGENERATIONS_PER_LINEAGE);
  });
});

// ─── Owner resolver ──────────────────────────────────────────────────────────

const buildResolver = (opts: {
  eventOwnerId?: string | null;
  vendorProfileIdForUser?: string | null;
  quoteRequestEventId?: string | null;
}) =>
  new AIRecommendationOwnerResolver(
    { getOwnerId: async () => opts.eventOwnerId ?? null } as never,
    { getVendorProfileIdForUser: async () => opts.vendorProfileIdForUser ?? null } as never,
    { getEventId: async () => opts.quoteRequestEventId ?? null } as never,
  );

const buildParent = (
  overrides: Partial<AiRecommendationView>,
): AiRecommendationView => ({
  id: 'parent-1',
  type: 'event_plan',
  status: 'pending',
  requestedByUserId: 'user-1',
  eventId: 'ev-1',
  vendorProfileId: null,
  quoteRequestId: null,
  input: {},
  output: {},
  aiMeta: null,
  locale: 'es-LATAM',
  localeFallback: false,
  createdAt: '2026-07-22T00:00:00.000Z',
  ...overrides,
});

describe('US-026 QA-001 — AIRecommendationOwnerResolver (AC-05 matrix polimórfica)', () => {
  it('event-scope: match cuando currentUserId == organizer del eventId', async () => {
    const resolver = buildResolver({ eventOwnerId: 'user-1' });
    const parent = buildParent({ type: 'event_plan', eventId: 'ev-1' });
    expect(await resolver.matches({ currentUserId: 'user-1', parent })).toBe(true);
  });

  it('event-scope: mismatch cuando currentUserId != organizer', async () => {
    const resolver = buildResolver({ eventOwnerId: 'other-user' });
    const parent = buildParent({ type: 'event_plan' });
    expect(await resolver.matches({ currentUserId: 'user-1', parent })).toBe(false);
  });

  it('vendor-scope: match cuando currentUser tiene el vendorProfileId del parent', async () => {
    const resolver = buildResolver({ vendorProfileIdForUser: 'vp-1' });
    const parent = buildParent({ type: 'vendor_bio', eventId: null, vendorProfileId: 'vp-1' });
    expect(await resolver.matches({ currentUserId: 'vendor-user', parent })).toBe(true);
  });

  it('vendor-scope: mismatch cuando currentUser tiene otro vendorProfileId', async () => {
    const resolver = buildResolver({ vendorProfileIdForUser: 'vp-2' });
    const parent = buildParent({ type: 'vendor_bio', eventId: null, vendorProfileId: 'vp-1' });
    expect(await resolver.matches({ currentUserId: 'vendor-user', parent })).toBe(false);
  });

  it('quote_request-scope: match cuando organizer del evento del quoteRequest', async () => {
    const resolver = buildResolver({
      quoteRequestEventId: 'ev-1',
      eventOwnerId: 'user-1',
    });
    const parent = buildParent({
      type: 'quote_comparison',
      eventId: null,
      quoteRequestId: 'qr-1',
    });
    expect(await resolver.matches({ currentUserId: 'user-1', parent })).toBe(true);
  });

  it('quote_request-scope: mismatch cuando organizer del evento no coincide', async () => {
    const resolver = buildResolver({
      quoteRequestEventId: 'ev-1',
      eventOwnerId: 'other',
    });
    const parent = buildParent({
      type: 'quote_comparison',
      eventId: null,
      quoteRequestId: 'qr-1',
    });
    expect(await resolver.matches({ currentUserId: 'user-1', parent })).toBe(false);
  });

  it('type desconocido ⇒ NotFoundError (defensivo SEC-02, degrada 500→404)', () => {
    const resolver = buildResolver({});
    expect(() => resolver.resolve('nonexistent_type')).toThrow(NotFoundError);
  });

  it('cubre 10 features registrados con owner válido', () => {
    const resolver = buildResolver({});
    const featureTypes = [
      'event_plan',
      'checklist',
      'budget_suggestion',
      'vendor_categories',
      'quote_brief',
      'quote_comparison',
      'quote_compare_summary',
      'vendor_bio',
      'task_prioritization',
      'task_priority',
    ] as const;
    for (const f of featureTypes) {
      expect(['event', 'vendor', 'quote_request']).toContain(resolver.resolve(f));
    }
  });
});

// ─── Type resolvers ──────────────────────────────────────────────────────────

describe('US-026 QA-001 — Type resolvers (AC-01)', () => {
  it('OutputSchemaResolver retorna el schema del feature', () => {
    const resolver = new OutputSchemaResolver();
    expect(resolver.resolve('event_plan')).toBe(OUTPUT_SCHEMAS.event_plan);
    expect(resolver.resolve('task_priority')).toBe(OUTPUT_SCHEMAS.task_priority);
    expect(resolver.resolve('quote_compare_summary')).toBe(OUTPUT_SCHEMAS.quote_compare_summary);
  });

  it('PromptTemplateResolver retorna template active con hash sha256 válido', () => {
    const resolver = new PromptTemplateResolver();
    const tmpl = resolver.resolve('event_plan', 'es-LATAM');
    expect(tmpl.status).toBe('active');
    expect(tmpl.featureType).toBe('event_plan');
    expect(tmpl.templateHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

// ─── UseCase branches ────────────────────────────────────────────────────────

function makeUseCase(opts: {
  ownerMatches?: boolean;
  parent?: AiRecommendationView | null;
  lineageCount?: number;
  generateThrows?: boolean;
  maxRegenerations?: number;
  parentRootId?: string | null;
}) {
  const parentView = opts.parent === null ? null : opts.parent ?? buildParent({});
  const findByIdWithLineage = vi.fn(async () =>
    parentView == null
      ? null
      : {
          view: parentView,
          parentRecommendationId: null,
          rootRecommendationId: opts.parentRootId ?? parentView.id,
          regenerationFeedback: null,
        },
  );
  const countLineageChildren = vi.fn(async () => opts.lineageCount ?? 0);
  const createRegeneration = vi.fn(async (input) => ({
    id: 'child-1',
    type: input.type,
    status: 'pending' as const,
    requestedByUserId: input.requestedByUserId,
    eventId: input.eventId ?? null,
    vendorProfileId: input.vendorProfileId ?? null,
    quoteRequestId: input.quoteRequestId ?? null,
    input: input.input,
    output: input.output,
    aiMeta: input.aiMeta,
    locale: input.aiMeta.languageCode,
    localeFallback: input.aiMeta.fallbackUsed,
    createdAt: '2026-07-22T20:00:00.000Z',
  }));
  const repo = {
    findByIdWithLineage,
    countLineageChildren,
    createRegeneration,
  } as unknown as ConstructorParameters<typeof RegenerateAIRecommendationUseCase>[0];
  const generation = {
    generate: vi.fn(async (feature: string) => {
      if (opts.generateThrows) throw new Error('AI provider timeout');
      const outputByFeature: Record<string, unknown> = {
        event_plan: {
          summary: 'Regenerated',
          phases: [{ name: 'Preparación', tasks: ['Reservar'] }],
        },
        task_priority: { top: [] },
      };
      return {
        output: outputByFeature[feature] ?? { summary: 'x', phases: [{ name: 'p', tasks: ['t'] }] },
        aiMeta: {
          provider: 'mock' as const,
          promptVersion: 'v1',
          latencyMs: 10,
          fallbackUsed: false,
          languageCode: 'es-LATAM',
        },
        sanitizedInput: { sanitized: true },
      };
    }),
  } as unknown as ConstructorParameters<typeof RegenerateAIRecommendationUseCase>[1];
  const ownerResolver = {
    matches: vi.fn(async () => opts.ownerMatches ?? true),
    resolve: vi.fn(() => 'event' as const),
  } as unknown as ConstructorParameters<typeof RegenerateAIRecommendationUseCase>[2];
  const outputSchemas = new OutputSchemaResolver();
  const logger = { emit: vi.fn() } as unknown as ConstructorParameters<
    typeof RegenerateAIRecommendationUseCase
  >[5];
  const useCase = new RegenerateAIRecommendationUseCase(
    repo,
    generation,
    ownerResolver,
    outputSchemas,
    { maxRegenerationsPerLineage: opts.maxRegenerations ?? 5 },
    logger,
  );
  return { useCase, findByIdWithLineage, countLineageChildren, createRegeneration, generation, ownerResolver, logger };
}

const INPUT = { currentUserId: 'user-1', recommendationId: 'parent-1' };

describe('US-026 QA-001 — RegenerateAIRecommendationUseCase branches', () => {
  it('AC-04/VR-03: parent inexistente ⇒ NotFoundError', async () => {
    const { useCase } = makeUseCase({ parent: null });
    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('AC-05/SEC-02: auth mismatch ⇒ NotFoundError uniforme', async () => {
    const { useCase } = makeUseCase({ ownerMatches: false });
    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('AC-02: linaje >= max ⇒ Us026RegenerationLimitError con current/max', async () => {
    const { useCase } = makeUseCase({ lineageCount: 5, maxRegenerations: 5 });
    await expect(useCase.execute(INPUT)).rejects.toMatchObject({
      code: 'REGENERATION_LIMIT',
      currentCount: 5,
      max: 5,
    });
  });

  it('AC-02: linaje > max (más hijos que el cap) también bloquea', async () => {
    const { useCase } = makeUseCase({ lineageCount: 6, maxRegenerations: 5 });
    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(Us026RegenerationLimitError);
  });

  it('AC-01 happy: linaje 0 ⇒ genera + persiste con parent/root explícitos', async () => {
    const { useCase, createRegeneration } = makeUseCase({ lineageCount: 0 });
    const res = await useCase.execute({ ...INPUT, feedback: 'Menos formal' });
    expect(res.view.id).toBe('child-1');
    expect(res.parentRecommendationId).toBe('parent-1');
    expect(res.rootRecommendationId).toBe('parent-1');
    expect(res.regenerationFeedback).toBe('Menos formal');
    expect(createRegeneration).toHaveBeenCalledOnce();
    expect(createRegeneration.mock.calls[0]?.[0]).toMatchObject({
      parentRecommendationId: 'parent-1',
      rootRecommendationId: 'parent-1',
      regenerationFeedback: 'Menos formal',
    });
  });

  it('AC-03/EC-04: feedback whitespace-only ⇒ trata como null (no lo persiste)', async () => {
    const { useCase, createRegeneration } = makeUseCase({ lineageCount: 0 });
    const res = await useCase.execute({ ...INPUT, feedback: '   ' });
    expect(res.regenerationFeedback).toBeNull();
    expect(createRegeneration.mock.calls[0]?.[0].regenerationFeedback).toBeNull();
  });

  it('AC-06: locale hereda del parent (pt) aunque event.language haya cambiado', async () => {
    const parent = buildParent({ locale: 'pt' });
    const { useCase, generation } = makeUseCase({
      parent,
      lineageCount: 0,
    });
    await useCase.execute(INPUT);
    // El use case delega la generación con el locale del parent
    expect(generation.generate).toHaveBeenCalledWith(
      'event_plan',
      expect.any(Object),
      'pt',
      undefined,
    );
  });

  it('AC-06 D3: rootId cae al parent.id cuando parent es raíz', async () => {
    const { useCase, countLineageChildren } = makeUseCase({
      lineageCount: 0,
      parentRootId: null,
    });
    await useCase.execute(INPUT);
    expect(countLineageChildren).toHaveBeenCalledWith({ rootRecommendationId: 'parent-1' });
  });

  it('AC-06 D3: rootId usa parent.rootRecommendationId cuando parent es child', async () => {
    const parent = buildParent({});
    const { useCase, countLineageChildren } = makeUseCase({
      parent,
      lineageCount: 0,
      parentRootId: 'root-original',
    });
    await useCase.execute(INPUT);
    expect(countLineageChildren).toHaveBeenCalledWith({ rootRecommendationId: 'root-original' });
  });

  it('AC-08 fallback: provider error ⇒ persiste child con locale_fallback=true (cuenta para límite)', async () => {
    const { useCase, createRegeneration } = makeUseCase({
      lineageCount: 0,
      generateThrows: true,
    });
    const res = await useCase.execute(INPUT);
    expect(res.view.localeFallback).toBe(true);
    expect(createRegeneration).toHaveBeenCalledOnce();
    expect(createRegeneration.mock.calls[0]?.[0].aiMeta.fallbackUsed).toBe(true);
  });

  it('el input regenerado contiene la clave auditable __regeneration_feedback', async () => {
    const { useCase, generation } = makeUseCase({ lineageCount: 0 });
    await useCase.execute({ ...INPUT, feedback: 'x' });
    const mockGenerate = generation.generate as unknown as ReturnType<typeof vi.fn>;
    const [, input] = mockGenerate.mock.calls[0] ?? [];
    expect((input as Record<string, unknown>).__regeneration_feedback).toBe('x');
  });

  it('type del parent no registrado ⇒ NotFoundError (defensivo, no 500)', async () => {
    const parent = buildParent({ type: 'unknown_type' as never });
    const { useCase } = makeUseCase({ parent, lineageCount: 0 });
    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ─── Response mapper ─────────────────────────────────────────────────────────

describe('US-026 QA-001 — toRegenerateResponse (contrato §7)', () => {
  it('mapea todos los campos del contrato', () => {
    const dto = toRegenerateResponse({
      view: buildParent({
        id: 'child-1',
        type: 'event_plan',
        locale: 'pt',
        localeFallback: true,
        output: { summary: 'x', phases: [] },
        createdAt: '2026-07-22T20:00:00Z',
      }),
      parentRecommendationId: 'p-1',
      rootRecommendationId: 'r-1',
      regenerationFeedback: 'menos formal',
    });
    expect(dto).toMatchObject({
      id: 'child-1',
      parent_recommendation_id: 'p-1',
      root_recommendation_id: 'r-1',
      recommendation_type: 'event_plan',
      regeneration_feedback: 'menos formal',
      locale: 'pt',
      locale_fallback: true,
    });
    expect(dto.payload).toEqual({ summary: 'x', phases: [] });
  });
});
