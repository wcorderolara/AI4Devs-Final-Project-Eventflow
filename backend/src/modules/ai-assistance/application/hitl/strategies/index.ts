// US-025 (PB-P1-016 / BE-004) — 8 `ApplyStrategy` MVP para cada `type` de `AIRecommendation`.
// Todas reciben el `Prisma.TransactionClient` inyectado por `ApplyAIRecommendationUseCase` — NUNCA
// abren transacciones propias. Los tipos cuyos repositorios destino aún no existen materializan
// side effect no-op con `applied_entity_type=null` (US-022 quote_comparison, US-024 vendor_bio,
// US-031 task_prioritization, US-023 quote_brief handoff) y dejan TODO explícito.
import type {
  ApplyStrategy,
  ApplyStrategyArgs,
  ApplyStrategyOutcome,
} from '../../../domain/hitl/apply-strategy.contract.js';
import { SideEffectFailedError } from '../../../domain/errors/hitl.errors.js';

// ── event_plan → persiste `Event.ai_plan` (US-017; entidad única) ────────────
interface EventPlanOutput {
  summary: string;
  phases: Array<{ name: string; tasks: string[] }>;
}
export class EventPlanApplyStrategy implements ApplyStrategy<EventPlanOutput> {
  readonly type = 'event_plan' as const;
  async applyInTransaction(args: ApplyStrategyArgs<EventPlanOutput>): Promise<ApplyStrategyOutcome> {
    const { tx, recommendation } = args;
    if (!recommendation.eventId) throw new SideEffectFailedError(this.type, new Error('event_plan requires eventId'));
    // US-017 no expone `Event.ai_plan` como columna estructurada; el output ya vive en
    // `AIRecommendation.output_payload`. La aplicación se materializa marcando trazabilidad
    // (`applied_entity_type='Event'`, `applied_entity_id=event.id`). La proyección estructurada
    // de fases al evento queda como enhancement de US-017 (handoff).
    await tx.event.findFirst({ where: { id: recommendation.eventId } });
    return { appliedEntityType: 'Event', appliedEntityId: recommendation.eventId };
  }
}

// ── checklist → crea `EventTask[]` con `origin='ai'` (US-018) ────────────────
// US-031 (PB-P1-017): persiste también `aiGenerated=true` y `aiRecommendationId` para preservar
// la trazabilidad IA por fila requerida por el bulk confirm (AC-04) y por Doc 18 §14.3.
interface ChecklistOutput {
  tasks: Array<{
    title: string;
    description: string;
    category: string;
    due_relative_days: number;
    phase: 'T-180' | 'T-90' | 'T-30' | 'T-7' | 'T-1';
    priority: 'low' | 'medium' | 'high';
  }>;
}
export class ChecklistApplyStrategy implements ApplyStrategy<ChecklistOutput> {
  readonly type = 'checklist' as const;
  async applyInTransaction(args: ApplyStrategyArgs<ChecklistOutput>): Promise<ApplyStrategyOutcome> {
    const { tx, recommendation, finalOutput } = args;
    if (!recommendation.eventId) throw new SideEffectFailedError(this.type, new Error('checklist requires eventId'));
    if (!finalOutput.tasks?.length) throw new SideEffectFailedError(this.type, new Error('checklist requires tasks'));
    const rows = finalOutput.tasks.map((t) => ({
      eventId: recommendation.eventId!,
      title: t.title,
      origin: 'ai' as const,
      status: 'pending' as const,
      aiGenerated: true,
      aiRecommendationId: recommendation.id,
    }));
    await tx.eventTask.createMany({ data: rows });
    // Múltiples entidades: no se materializa `applied_entity_*` individual.
    return { appliedEntityType: null, appliedEntityId: null };
  }
}

// ── budget_suggestion → crea BudgetItem[] (US-019) ───────────────────────────
interface BudgetSuggestionOutput {
  categories: Array<{
    name: string;
    service_category_code: string;
    percentage: number;
    notes?: string;
    amount?: number;
  }>;
}
export class BudgetSuggestionApplyStrategy implements ApplyStrategy<BudgetSuggestionOutput> {
  readonly type = 'budget_suggestion' as const;
  async applyInTransaction(args: ApplyStrategyArgs<BudgetSuggestionOutput>): Promise<ApplyStrategyOutcome> {
    const { tx, recommendation, finalOutput } = args;
    if (!recommendation.eventId) {
      throw new SideEffectFailedError(this.type, new Error('budget_suggestion requires eventId'));
    }
    // `Budget` es 1-1 con `Event`; asegurar existencia (upsert idempotente).
    const budget = await tx.budget.upsert({
      where: { eventId: recommendation.eventId },
      update: {},
      create: { eventId: recommendation.eventId },
      select: { id: true },
    });
    const rows = finalOutput.categories.map((c) => ({
      budgetId: budget.id,
      label: c.name,
      categoryCode: c.service_category_code,
      amountPlanned: c.amount ?? 0,
    }));
    if (rows.length > 0) {
      await tx.budgetItem.createMany({ data: rows });
    }
    return { appliedEntityType: null, appliedEntityId: null };
  }
}

// ── vendor_categories → no materializa entidad; adopción/click-through (US-020) ─
export class VendorCategoriesApplyStrategy implements ApplyStrategy {
  readonly type = 'vendor_categories' as const;
  async applyInTransaction(_args: ApplyStrategyArgs): Promise<ApplyStrategyOutcome> {
    // No hay entidad materializada por diseño (US-020 / Doc 16 §35.8). La adopción se registra
    // vía el log estructurado emitido por el use case.
    return { appliedEntityType: null, appliedEntityId: null };
  }
}

// ── quote_brief → marca brief como listo (handoff a US-023 / PB-P1-030) ──────
export class QuoteBriefApplyStrategy implements ApplyStrategy {
  readonly type = 'quote_brief' as const;
  async applyInTransaction(args: ApplyStrategyArgs): Promise<ApplyStrategyOutcome> {
    // TODO(US-023 / PB-P1-030): crear `QuoteRequest` con `ai_generated_brief=true` +
    // `ai_recommendation_id`. Por ahora sólo trazabilidad — el `apply` marca la recomendación
    // como `accepted` y la creación real del `QuoteRequest` la ejecuta US-023.
    void args;
    return { appliedEntityType: null, appliedEntityId: null };
  }
}

// ── quote_comparison → adopción (US-097; scope quote_request) ────────────────
export class QuoteComparisonApplyStrategy implements ApplyStrategy {
  readonly type = 'quote_comparison' as const;
  async applyInTransaction(_args: ApplyStrategyArgs): Promise<ApplyStrategyOutcome> {
    // Feature histórica (US-097) sin repositorio destino. Trazabilidad marcada por el use case.
    return { appliedEntityType: null, appliedEntityId: null };
  }
}

// ── quote_compare_summary → HITL informativo (US-022; no materializa entidad) ─
// El resumen NO decide: el organizador marca la Quote preferida vía US-058 (`PATCH
// /quotes/:id/preferred`). Registrar `apply` deja únicamente audit trail; el AIRecommendation
// pasa a `accepted` sin side effect (mismo diseño que `quote_comparison`).
export class QuoteCompareSummaryApplyStrategy implements ApplyStrategy {
  readonly type = 'quote_compare_summary' as const;
  async applyInTransaction(_args: ApplyStrategyArgs): Promise<ApplyStrategyOutcome> {
    return { appliedEntityType: null, appliedEntityId: null };
  }
}

// ── vendor_bio → persiste VendorProfile.bio (US-024) ─────────────────────────
interface VendorBioOutput {
  bio: string;
  highlights: string[];
}
export class VendorBioApplyStrategy implements ApplyStrategy<VendorBioOutput> {
  readonly type = 'vendor_bio' as const;
  async applyInTransaction(args: ApplyStrategyArgs<VendorBioOutput>): Promise<ApplyStrategyOutcome> {
    const { tx, recommendation, finalOutput } = args;
    if (!recommendation.vendorProfileId) {
      throw new SideEffectFailedError(this.type, new Error('vendor_bio requires vendorProfileId'));
    }
    await tx.vendorProfile.update({
      where: { id: recommendation.vendorProfileId },
      data: { bio: finalOutput.bio },
    });
    return { appliedEntityType: 'VendorProfile', appliedEntityId: recommendation.vendorProfileId };
  }
}

// ── task_prioritization → actualiza EventTask.priority (US-031) ──────────────
export class TaskPrioritizationApplyStrategy implements ApplyStrategy {
  readonly type = 'task_prioritization' as const;
  async applyInTransaction(_args: ApplyStrategyArgs): Promise<ApplyStrategyOutcome> {
    // TODO(US-031 / PB-P1-017): actualizar `EventTask.priority` en bloque. El schema actual no
    // expone `priority`; la evolución vive en US-031. Trazabilidad marcada por el use case.
    return { appliedEntityType: null, appliedEntityId: null };
  }
}

// ── task_priority → HITL informativo (US-024; no materializa entidad) ─────────
// La priorización top 3 NO altera el checklist oficial (HITL strict, D6/AC-01). El organizador
// decide qué hacer con cada sugerencia (marcar hecho, reprogramar, delegar) vía US-030. `apply`
// solo deja audit trail; el AIRecommendation pasa a `accepted` sin side effect (mismo diseño
// que `quote_compare_summary` en US-022).
export class TaskPriorityApplyStrategy implements ApplyStrategy {
  readonly type = 'task_priority' as const;
  async applyInTransaction(_args: ApplyStrategyArgs): Promise<ApplyStrategyOutcome> {
    return { appliedEntityType: null, appliedEntityId: null };
  }
}

export const MVP_APPLY_STRATEGIES = [
  new EventPlanApplyStrategy(),
  new ChecklistApplyStrategy(),
  new BudgetSuggestionApplyStrategy(),
  new VendorCategoriesApplyStrategy(),
  new QuoteBriefApplyStrategy(),
  new QuoteComparisonApplyStrategy(),
  new QuoteCompareSummaryApplyStrategy(),
  new VendorBioApplyStrategy(),
  new TaskPrioritizationApplyStrategy(),
  new TaskPriorityApplyStrategy(),
] as const;
