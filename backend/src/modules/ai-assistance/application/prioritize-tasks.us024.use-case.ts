// PrioritizeTasksUseCase — US-024 (PB-P2-002 / BE-005; AC-01..AC-07, EC-01..EC-04).
//
// Flujo canónico:
//   1. Ownership del evento (D3 / SEC-01) → `404 EVENT_NOT_FOUND` uniforme.
//   2. Cargar tareas elegibles (`EligibleTasksReader`, filtro D3 alineado al schema real).
//   3. Empty-state (AC-02): 0 tareas ⇒ respuesta `top:[]` sin invocar al provider ni cachear.
//   4. Signature (`computeChecklistSignature` — BE-001) del snapshot elegible.
//   5. Cache lookup (`TaskPriorityCacheService` — BE-004): hit ⇒ respuesta con `cache_hit=true`
//      reutilizando el `ai_recommendation_id` original (D4/D8/AC-04); NO se re-invoca al provider.
//   6. Cache miss: delega al motor genérico (`GenerateAiRecommendationUseCase` — US-097/US-084)
//      que aplica sanitización, locale binding (`event.languageCode`), validación Zod contra el
//      output schema (US-097) y persistencia HITL como `AIRecommendation` `pending` con el
//      snapshot en `inputPayload` (D8).
//   7. Safety valve (EC-04): filtra `top[]` a `task_ids` presentes en el set elegible; si todo el
//      output es inválido ⇒ fallback (AC-07) — respuesta sin `ai_recommendation_id` con
//      `locale_fallback=true` y NO se cachea (evita persistir garbage y forzar re-generar).
//   8. Cache populate con el payload final (post-filter) para próximas requests con la misma
//      signature.
//
// El resto de invariantes de auditoría/telemetría (`ai.locale.applied/fallback`, HITL persistence,
// prompt version, provider metadata) las emite el motor genérico — este use case NO duplica esa
// responsabilidad.
import type { EventAccessReader } from '../../../shared/access/readers.js';
import { requireEventOwner } from '../../../shared/access/authz.js';
import type { AiRecommendationView } from '../domain/ai-recommendation.js';
import type { EligibleTasksReader, EligibleTaskRow } from '../ports/eligible-tasks.reader.js';
import {
  computeChecklistSignature,
  type ChecklistSignatureTask,
} from '../../../shared/hash/checklist-signature.js';
import type {
  TaskPriorityCacheService,
  TaskPriorityCachedPayload,
} from '../infrastructure/task-priority-cache.service.js';
import type { GenerateAiRecommendationUseCase } from './generate-ai-recommendation.use-case.js';

const TASK_PRIORITY_PROMPT_VERSION = 'v1';
const MAX_TOP_ITEMS = 3;
const DEFAULT_LOCALE = 'es-LATAM';

export interface PrioritizeTasksInput {
  userId: string;
  eventId: string;
  preferMock?: boolean;
  correlationId?: string;
}

export interface TaskPriorityItemView {
  task_id: string;
  reason: string;
  urgency_score: number;
}

export interface PrioritizeTasksView {
  aiRecommendationId: string | null;
  top: TaskPriorityItemView[];
  rationaleSummary: string | null;
  locale: string;
  localeFallback: boolean;
  cacheHit: boolean;
  generatedAt: Date;
}

interface TaskPriorityOutput {
  top: TaskPriorityItemView[];
  rationale_summary?: string;
}

export class PrioritizeTasksUseCase {
  constructor(
    private readonly events: EventAccessReader,
    private readonly eligibleTasks: EligibleTasksReader,
    private readonly cache: TaskPriorityCacheService,
    private readonly generate: GenerateAiRecommendationUseCase,
  ) {}

  async execute(cmd: PrioritizeTasksInput): Promise<PrioritizeTasksView> {
    // 1. Ownership — masked 404 (SEC-04).
    await requireEventOwner(this.events, cmd.eventId, cmd.userId);

    // 2. Tareas elegibles.
    const tasks = await this.eligibleTasks.findEligibleByEventId(cmd.eventId);

    // 3. Empty-state (AC-02): 0 tareas ⇒ no invoca al provider ni cachea; el FE muestra la
    // sugerencia "Generar checklist IA" (deep-link US-018).
    if (tasks.length === 0) {
      return {
        aiRecommendationId: null,
        top: [],
        rationaleSummary: null,
        locale: DEFAULT_LOCALE,
        localeFallback: false,
        cacheHit: false,
        generatedAt: new Date(),
      };
    }

    // 4. Signature del snapshot elegible (BE-001).
    const signatureInput: ChecklistSignatureTask[] = tasks.map((t) => ({
      id: t.id,
      status: t.status,
      updatedAt: t.updatedAt,
    }));
    const signature = computeChecklistSignature(signatureInput);

    // 5. Cache lookup — hit ⇒ reutiliza el ai_recommendation_id original (AC-04).
    const cached = this.cache.get(cmd.eventId, signature);
    if (cached) {
      return {
        aiRecommendationId: cached.aiRecommendationId,
        top: cached.output.top,
        rationaleSummary: cached.output.rationale_summary ?? null,
        locale: cached.locale,
        localeFallback: cached.localeFallback,
        cacheHit: true,
        generatedAt: cached.generatedAt,
      };
    }

    // 6. Cache miss ⇒ genera via motor genérico (US-097/US-084). El snapshot se persiste en
    // `inputPayload` (D8/AC-04) junto con `signature` y `prompt_version` para auditoría.
    const eligibleIds = tasks.map((t) => t.id);
    const context: Record<string, unknown> = {
      event_id: cmd.eventId,
      tasks: tasks.map((t) => this.toPromptTask(t)),
      task_ids_snapshot: eligibleIds,
      signature,
      prompt_version: TASK_PRIORITY_PROMPT_VERSION,
      // Hint para `MockAIProvider` — usa task_ids reales del snapshot en su fixture.
      __task_ids: eligibleIds,
    };

    let view: AiRecommendationView;
    try {
      view = await this.generate.execute({
        userId: cmd.userId,
        feature: 'task_priority',
        contextId: cmd.eventId,
        input: context,
        preferMock: cmd.preferMock,
        correlationId: cmd.correlationId,
      });
    } catch {
      // AC-07 — fallback: cualquier error controlado del pipeline (output malformado, timeout del
      // provider, unsupported language) ⇒ respuesta template estática con `locale_fallback=true`.
      // No se persiste AIRecommendation garbage ni se cachea (la próxima request reintenta).
      return this.buildFallback(eligibleIds, DEFAULT_LOCALE);
    }

    // 7. Safety valve — filtra task_ids inválidos (EC-04). Si todo el output es inválido, fallback.
    const validatedTop = this.filterInvalidTaskIds(view.output as TaskPriorityOutput, eligibleIds);
    if (validatedTop.length === 0) {
      return this.buildFallback(eligibleIds, view.locale);
    }
    const rawOutput = view.output as TaskPriorityOutput;
    const finalOutput: TaskPriorityOutput = {
      top: validatedTop,
      ...(rawOutput.rationale_summary !== undefined
        ? { rationale_summary: rawOutput.rationale_summary }
        : {}),
    };

    // 8. Cache populate — reutiliza `ai_recommendation_id` en próximas hits dentro del TTL.
    const generatedAt = new Date(view.createdAt);
    const payload: TaskPriorityCachedPayload = {
      aiRecommendationId: view.id,
      output: finalOutput,
      locale: view.locale,
      localeFallback: view.localeFallback,
      generatedAt,
    };
    this.cache.set(cmd.eventId, signature, payload);

    return {
      aiRecommendationId: view.id,
      top: finalOutput.top,
      rationaleSummary: finalOutput.rationale_summary ?? null,
      locale: view.locale,
      localeFallback: view.localeFallback,
      cacheHit: false,
      generatedAt,
    };
  }

  private toPromptTask(t: EligibleTaskRow): Record<string, unknown> {
    return {
      task_id: t.id,
      title: t.title,
      due_date: t.dueDate ? t.dueDate.toISOString() : null,
      status: t.status,
    };
  }

  private filterInvalidTaskIds(
    output: TaskPriorityOutput,
    eligibleIds: readonly string[],
  ): TaskPriorityItemView[] {
    const allowed = new Set(eligibleIds);
    return output.top.filter((item) => allowed.has(item.task_id)).slice(0, MAX_TOP_ITEMS);
  }

  private buildFallback(eligibleIds: readonly string[], locale: string): PrioritizeTasksView {
    // Template estático mínimo: prioriza las primeras N tareas del orden canónico
    // (`due_date ASC NULLS LAST, updated_at DESC`) con reason genérica y urgency descendente.
    const fallbackTop: TaskPriorityItemView[] = eligibleIds
      .slice(0, MAX_TOP_ITEMS)
      .map((task_id, i) => ({
        task_id,
        reason: 'Priorizada por fecha próxima. Sugerencia por defecto — el organizador decide.',
        urgency_score: MAX_TOP_ITEMS + 5 - i, // 8, 7, 6
      }));
    return {
      aiRecommendationId: null,
      top: fallbackTop,
      rationaleSummary: null,
      locale,
      localeFallback: true,
      cacheHit: false,
      generatedAt: new Date(),
    };
  }
}
