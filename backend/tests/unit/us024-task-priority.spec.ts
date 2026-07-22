// US-024 (PB-P2-002 / QA-001) — Unit tests para priorización IA top 3.
// Cubre:
//   - Signature helper `computeChecklistSignature` (AC-04, AC-05).
//   - `TaskPriorityCacheService` (set/get/expiry — AC-04/AC-05).
//   - `OUTPUT_SCHEMAS.task_priority` Zod (AC-01, EC-04).
//   - Prompt registry `task_priority` en 4 locales (AC-06).
//   - Mock fixture determinista con `__task_ids` (AC-01).
//   - `PrioritizeTasksUseCase` branches (AC-01..07, EC-01..04).
//   - Response mapper `toTaskPriorityResponse` (contrato §7).
import { describe, it, expect, vi } from 'vitest';
import {
  computeChecklistSignature,
  type ChecklistSignatureTask,
} from '../../src/shared/hash/checklist-signature.js';
import {
  TaskPriorityCacheService,
  TASK_PRIORITY_CACHE_TTL_MS,
  type TaskPriorityCachedPayload,
} from '../../src/modules/ai-assistance/infrastructure/task-priority-cache.service.js';
import { OUTPUT_SCHEMAS } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { promptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/index.js';
import { baseOutput } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-fixtures.js';
import {
  PrioritizeTasksUseCase,
  type PrioritizeTasksInput,
} from '../../src/modules/ai-assistance/application/prioritize-tasks.us024.use-case.js';
import { toTaskPriorityResponse } from '../../src/modules/ai-assistance/dto/task-priority.response.js';
import type { EligibleTaskRow } from '../../src/modules/ai-assistance/ports/eligible-tasks.reader.js';
import type { AiRecommendationView } from '../../src/modules/ai-assistance/domain/ai-recommendation.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';

// ─── Signature helper ────────────────────────────────────────────────────────

describe('US-024 QA-001 — computeChecklistSignature (AC-04, AC-05)', () => {
  const t = (id: string, status: string, iso: string): ChecklistSignatureTask => ({
    id,
    status,
    updatedAt: new Date(iso),
  });

  it('produce sha256:empty para lista vacía', () => {
    expect(computeChecklistSignature([])).toBe('sha256:empty');
  });

  it('es determinista para la misma entrada (mismo hash)', () => {
    const tasks = [t('a', 'pending', '2026-07-22T00:00:00Z')];
    expect(computeChecklistSignature(tasks)).toBe(computeChecklistSignature(tasks));
  });

  it('es invariante ante reordenamiento del input (ordena antes de hashear)', () => {
    const a = t('a', 'pending', '2026-07-22T00:00:00Z');
    const b = t('b', 'in_progress', '2026-07-22T01:00:00Z');
    expect(computeChecklistSignature([a, b])).toBe(computeChecklistSignature([b, a]));
  });

  it('cambia si el status cambia (AC-05 — task editada)', () => {
    const sig1 = computeChecklistSignature([t('a', 'pending', '2026-07-22T00:00:00Z')]);
    const sig2 = computeChecklistSignature([t('a', 'in_progress', '2026-07-22T00:00:00Z')]);
    expect(sig1).not.toBe(sig2);
  });

  it('cambia si el updatedAt cambia (AC-05 — task editada preserva id/status)', () => {
    const sig1 = computeChecklistSignature([t('a', 'pending', '2026-07-22T00:00:00Z')]);
    const sig2 = computeChecklistSignature([t('a', 'pending', '2026-07-22T00:01:00Z')]);
    expect(sig1).not.toBe(sig2);
  });

  it('cambia si se agrega/quita una task', () => {
    const sig1 = computeChecklistSignature([t('a', 'pending', '2026-07-22T00:00:00Z')]);
    const sig2 = computeChecklistSignature([
      t('a', 'pending', '2026-07-22T00:00:00Z'),
      t('b', 'pending', '2026-07-22T00:00:00Z'),
    ]);
    expect(sig1).not.toBe(sig2);
  });

  it('el output tiene formato sha256:<64hex>', () => {
    const sig = computeChecklistSignature([t('a', 'pending', '2026-07-22T00:00:00Z')]);
    expect(sig).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

// ─── Cache service ────────────────────────────────────────────────────────────

describe('US-024 QA-001 — TaskPriorityCacheService (AC-04, AC-05)', () => {
  const buildPayload = (id: string): TaskPriorityCachedPayload => ({
    aiRecommendationId: id,
    output: {
      top: [{ task_id: '11111111-1111-4111-8111-111111111111', reason: 'x', urgency_score: 9 }],
    },
    locale: 'es-LATAM',
    localeFallback: false,
    generatedAt: new Date('2026-07-22T00:00:00Z'),
  });

  it('devuelve null cuando la key no existe', () => {
    const cache = new TaskPriorityCacheService();
    expect(cache.get('ev-1', 'sha256:x')).toBeNull();
  });

  it('set/get devuelve el mismo valor', () => {
    const cache = new TaskPriorityCacheService();
    const value = buildPayload('rec-1');
    cache.set('ev-1', 'sha256:x', value);
    expect(cache.get('ev-1', 'sha256:x')).toBe(value);
  });

  it('expira tras TTL 5min (lazy expiry en get)', () => {
    let now = 1_000;
    const cache = new TaskPriorityCacheService({ now: () => now });
    cache.set('ev-1', 'sha256:x', buildPayload('rec-1'));
    expect(cache.get('ev-1', 'sha256:x')).not.toBeNull();
    now += TASK_PRIORITY_CACHE_TTL_MS + 1;
    expect(cache.get('ev-1', 'sha256:x')).toBeNull();
  });

  it('miss cuando la signature difiere (mismo eventId)', () => {
    const cache = new TaskPriorityCacheService();
    cache.set('ev-1', 'sha256:a', buildPayload('rec-a'));
    expect(cache.get('ev-1', 'sha256:b')).toBeNull();
  });

  it('miss cuando el eventId difiere (misma signature)', () => {
    const cache = new TaskPriorityCacheService();
    cache.set('ev-1', 'sha256:a', buildPayload('rec-a'));
    expect(cache.get('ev-2', 'sha256:a')).toBeNull();
  });

  it('invalidate remueve la key', () => {
    const cache = new TaskPriorityCacheService();
    cache.set('ev-1', 'sha256:a', buildPayload('rec-a'));
    cache.invalidate('ev-1', 'sha256:a');
    expect(cache.get('ev-1', 'sha256:a')).toBeNull();
  });
});

// ─── Output schema ────────────────────────────────────────────────────────────

describe('US-024 QA-001 — task_priority output schema (AC-01, EC-04)', () => {
  const schema = OUTPUT_SCHEMAS.task_priority;
  const item = (extra: Partial<{ task_id: string; reason: string; urgency_score: number }> = {}) => ({
    task_id: '11111111-1111-4111-8111-111111111111',
    reason: 'urgente',
    urgency_score: 8,
    ...extra,
  });

  it('acepta top vacío (AC-02 empty state)', () => {
    expect(schema.safeParse({ top: [] }).success).toBe(true);
  });

  it('acepta 1..3 items', () => {
    expect(schema.safeParse({ top: [item()] }).success).toBe(true);
    expect(
      schema.safeParse({
        top: [item(), item({ task_id: '22222222-2222-4222-8222-222222222222' })],
      }).success,
    ).toBe(true);
  });

  it('rechaza > 3 items (max 3)', () => {
    const four = [
      item({ task_id: '11111111-1111-4111-8111-111111111111' }),
      item({ task_id: '22222222-2222-4222-8222-222222222222' }),
      item({ task_id: '33333333-3333-4333-8333-333333333333' }),
      item({ task_id: '44444444-4444-4444-8444-444444444444' }),
    ];
    expect(schema.safeParse({ top: four }).success).toBe(false);
  });

  it('rechaza urgency fuera de 1..10', () => {
    expect(schema.safeParse({ top: [item({ urgency_score: 0 })] }).success).toBe(false);
    expect(schema.safeParse({ top: [item({ urgency_score: 11 })] }).success).toBe(false);
    expect(schema.safeParse({ top: [item({ urgency_score: 1.5 })] }).success).toBe(false);
  });

  it('rechaza reason > 200 chars', () => {
    expect(schema.safeParse({ top: [item({ reason: 'x'.repeat(201) })] }).success).toBe(false);
  });

  it('rechaza task_id no UUID (EC-04)', () => {
    expect(schema.safeParse({ top: [item({ task_id: 'not-a-uuid' })] }).success).toBe(false);
  });

  it('rechaza campo desconocido (strict)', () => {
    const bad = schema.safeParse({ top: [{ ...item(), extra: 'x' }] });
    expect(bad.success).toBe(false);
  });
});

// ─── Mock fixture ─────────────────────────────────────────────────────────────

describe('US-024 QA-004 — mock fixture (AC-01)', () => {
  it('usa los task_ids reales del input via __task_ids', () => {
    const ids = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ];
    const out = baseOutput('task_priority', { __task_ids: ids }) as {
      top: Array<{ task_id: string; urgency_score: number }>;
    };
    expect(out.top.map((i) => i.task_id)).toEqual(ids);
    expect(out.top[0]?.urgency_score).toBeGreaterThanOrEqual(out.top[1]?.urgency_score ?? 0);
  });

  it('trunca a max 3 items cuando el input tiene más', () => {
    const ids = Array.from({ length: 5 }, (_, i) =>
      `${(i + 1).toString().repeat(8)}-${(i + 1).toString().repeat(4)}-4111-8111-111111111111`,
    );
    const out = baseOutput('task_priority', { __task_ids: ids }) as { top: unknown[] };
    expect(out.top.length).toBeLessThanOrEqual(3);
  });

  it('valida contra el schema Zod (AC-01)', () => {
    const ids = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
    ];
    const out = baseOutput('task_priority', { __task_ids: ids });
    expect(OUTPUT_SCHEMAS.task_priority.safeParse(out).success).toBe(true);
  });
});

// ─── Prompt registry ─────────────────────────────────────────────────────────

describe('US-024 QA-004 — prompt registry task_priority en 4 locales (AC-06)', () => {
  const LOCALES = ['es-LATAM', 'es-ES', 'pt', 'en'] as const;

  it.each(LOCALES)('resuelve prompt active en %s con hash sha256 válido', (locale) => {
    const template = promptRegistry.resolveActive('task_priority', locale);
    expect(template.status).toBe('active');
    expect(template.featureType).toBe('task_priority');
    expect(template.languageSupport).toEqual([locale]);
    expect(template.templateHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('promptKey es único por locale', () => {
    const keys = LOCALES.map((l) => promptRegistry.resolveActive('task_priority', l).promptKey);
    expect(new Set(keys).size).toBe(4);
  });
});

// ─── Use case branches ───────────────────────────────────────────────────────

function makeTask(overrides: Partial<EligibleTaskRow> & { id: string }): EligibleTaskRow {
  return {
    id: overrides.id,
    title: overrides.title ?? `Task ${overrides.id}`,
    dueDate: overrides.dueDate ?? new Date('2026-07-30T00:00:00Z'),
    status: overrides.status ?? 'pending',
    updatedAt: overrides.updatedAt ?? new Date('2026-07-22T00:00:00Z'),
  };
}

function makeView(overrides: Partial<AiRecommendationView> = {}): AiRecommendationView {
  return {
    id: 'ai-rec-1',
    type: 'task_priority',
    status: 'pending',
    requestedByUserId: 'org-1',
    eventId: 'ev-1',
    vendorProfileId: null,
    quoteRequestId: null,
    input: {},
    output: {
      top: [
        {
          task_id: '11111111-1111-4111-8111-111111111111',
          reason: 'urgente',
          urgency_score: 9,
        },
      ],
      rationale_summary: 'ok',
    },
    aiMeta: null,
    locale: 'es-LATAM',
    localeFallback: false,
    createdAt: '2026-07-22T00:00:00Z',
    ...overrides,
  };
}

function makeUseCase(opts: {
  ownerId?: string | null;
  tasks?: EligibleTaskRow[];
  generateImpl?: (cmd: unknown) => Promise<AiRecommendationView>;
}): {
  useCase: PrioritizeTasksUseCase;
  cache: TaskPriorityCacheService;
  generate: ReturnType<typeof vi.fn>;
} {
  const cache = new TaskPriorityCacheService();
  const generate = vi.fn(async (cmd: unknown) => {
    if (opts.generateImpl) return opts.generateImpl(cmd);
    return makeView();
  });
  const useCase = new PrioritizeTasksUseCase(
    { getOwnerId: async () => opts.ownerId ?? 'org-1' } as never,
    { findEligibleByEventId: async () => opts.tasks ?? [] },
    cache,
    { execute: generate } as never,
  );
  return { useCase, cache, generate };
}

const INPUT: PrioritizeTasksInput = { userId: 'org-1', eventId: 'ev-1' };

describe('US-024 QA-001 — PrioritizeTasksUseCase branches', () => {
  it('SEC-01 / EC-01: throws NotFoundError si el organizer no es owner', async () => {
    const { useCase } = makeUseCase({ ownerId: 'other-user' });
    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('AC-02 empty state: 0 tareas ⇒ top:[] sin invocar al provider ni cachear', async () => {
    const { useCase, generate, cache } = makeUseCase({ tasks: [] });
    const res = await useCase.execute(INPUT);
    expect(res.top).toEqual([]);
    expect(res.aiRecommendationId).toBeNull();
    expect(res.cacheHit).toBe(false);
    expect(generate).not.toHaveBeenCalled();
    expect(cache.get('ev-1', 'sha256:empty')).toBeNull();
  });

  it('AC-01 cache miss ⇒ delega al motor, filtra output y cachea', async () => {
    const tasks = [
      makeTask({ id: '11111111-1111-4111-8111-111111111111' }),
      makeTask({ id: '22222222-2222-4222-8222-222222222222' }),
    ];
    const { useCase, generate, cache } = makeUseCase({ tasks });
    const res = await useCase.execute(INPUT);
    expect(generate).toHaveBeenCalledOnce();
    expect(res.cacheHit).toBe(false);
    expect(res.aiRecommendationId).toBe('ai-rec-1');
    expect(res.top[0]?.task_id).toBe('11111111-1111-4111-8111-111111111111');
    // Cache poblado con la signature real
    const signature = computeChecklistSignature(
      tasks.map((t) => ({ id: t.id, status: t.status, updatedAt: t.updatedAt })),
    );
    expect(cache.get('ev-1', signature)).not.toBeNull();
  });

  it('AC-04 cache hit ⇒ NO invoca al motor y responde con cache_hit=true', async () => {
    const tasks = [makeTask({ id: '11111111-1111-4111-8111-111111111111' })];
    const { useCase, generate } = makeUseCase({ tasks });
    // Primera call — miss
    await useCase.execute(INPUT);
    expect(generate).toHaveBeenCalledTimes(1);
    // Segunda call inmediata — hit
    const res2 = await useCase.execute(INPUT);
    expect(generate).toHaveBeenCalledTimes(1); // sin nueva invocación
    expect(res2.cacheHit).toBe(true);
    expect(res2.aiRecommendationId).toBe('ai-rec-1');
  });

  it('AC-05 task editada (cambia updatedAt) ⇒ cache miss por signature distinta', async () => {
    const task1 = makeTask({
      id: '11111111-1111-4111-8111-111111111111',
      updatedAt: new Date('2026-07-22T00:00:00Z'),
    });
    // Primer flujo: cachea con updatedAt inicial
    const { useCase, generate } = makeUseCase({ tasks: [task1] });
    await useCase.execute(INPUT);
    expect(generate).toHaveBeenCalledTimes(1);
    // Segunda call: la misma instancia del use case, pero el reader devuelve la task con
    // updatedAt actualizado ⇒ nueva signature ⇒ miss ⇒ nueva llamada al generator
    const task1Edited = { ...task1, updatedAt: new Date('2026-07-22T01:00:00Z') };
    const useCase2 = new PrioritizeTasksUseCase(
      { getOwnerId: async () => 'org-1' } as never,
      { findEligibleByEventId: async () => [task1Edited] },
      // Reusa la cache anterior — misma instancia del proceso.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useCase as unknown as { cache: TaskPriorityCacheService }).cache,
      { execute: generate } as never,
    );
    await useCase2.execute(INPUT);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('EC-04 output con task_ids inválidos ⇒ fallback (locale_fallback=true, sin ai_rec_id)', async () => {
    const tasks = [makeTask({ id: '11111111-1111-4111-8111-111111111111' })];
    const badView = makeView({
      output: {
        top: [
          {
            task_id: '99999999-9999-4999-8999-999999999999', // no está en el set elegible
            reason: 'x',
            urgency_score: 9,
          },
        ],
      },
    });
    const { useCase } = makeUseCase({ tasks, generateImpl: async () => badView });
    const res = await useCase.execute(INPUT);
    expect(res.localeFallback).toBe(true);
    expect(res.aiRecommendationId).toBeNull();
    // El template estático prioriza al menos la primera task elegible
    expect(res.top[0]?.task_id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('AC-07 provider error ⇒ fallback sin persist', async () => {
    const tasks = [makeTask({ id: '11111111-1111-4111-8111-111111111111' })];
    const { useCase, cache } = makeUseCase({
      tasks,
      generateImpl: async () => {
        throw new Error('AI provider timeout');
      },
    });
    const res = await useCase.execute(INPUT);
    expect(res.localeFallback).toBe(true);
    expect(res.aiRecommendationId).toBeNull();
    // No se cachea el fallback (próxima call reintenta)
    const signature = computeChecklistSignature(
      tasks.map((t) => ({ id: t.id, status: t.status, updatedAt: t.updatedAt })),
    );
    expect(cache.get('ev-1', signature)).toBeNull();
  });

  it('AC-01 safety valve: si output tiene 3 válidos y 1 inválido, el top final tiene solo los válidos (max 3)', async () => {
    const tasks = [
      makeTask({ id: '11111111-1111-4111-8111-111111111111' }),
      makeTask({ id: '22222222-2222-4222-8222-222222222222' }),
    ];
    const mixedView = makeView({
      output: {
        top: [
          { task_id: '99999999-9999-4999-8999-999999999999', reason: 'x', urgency_score: 5 }, // inválido
          { task_id: '11111111-1111-4111-8111-111111111111', reason: 'a', urgency_score: 10 },
          { task_id: '22222222-2222-4222-8222-222222222222', reason: 'b', urgency_score: 7 },
        ],
      },
    });
    const { useCase } = makeUseCase({ tasks, generateImpl: async () => mixedView });
    const res = await useCase.execute(INPUT);
    expect(res.top.map((i) => i.task_id)).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ]);
    expect(res.localeFallback).toBe(false);
  });
});

// ─── Response mapper ─────────────────────────────────────────────────────────

describe('US-024 QA-001 — toTaskPriorityResponse (contrato §7)', () => {
  it('mapea todos los campos y respeta ai_recommendation_id nullable', () => {
    const view = {
      aiRecommendationId: null,
      top: [
        { task_id: '11111111-1111-4111-8111-111111111111', reason: 'x', urgency_score: 9 },
      ],
      rationaleSummary: null,
      locale: 'pt',
      localeFallback: true,
      cacheHit: false,
      generatedAt: new Date('2026-07-22T00:00:00Z'),
    };
    expect(toTaskPriorityResponse(view)).toEqual({
      ai_recommendation_id: null,
      top: [
        { task_id: '11111111-1111-4111-8111-111111111111', reason: 'x', urgency_score: 9 },
      ],
      rationale_summary: null,
      locale: 'pt',
      locale_fallback: true,
      cache_hit: false,
      generated_at: '2026-07-22T00:00:00.000Z',
    });
  });
});
