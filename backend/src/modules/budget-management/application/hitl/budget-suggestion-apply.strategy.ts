// US-037 (PB-P1-021 / BE-005) — `BudgetSuggestionApplyStrategyV2`. Implementa el contrato
// `ApplyStrategy<BudgetSuggestionOutput>` del dispatcher HITL de US-025, con la lógica D1..D6:
//   D1: consume el endpoint genérico `/ai-recommendations/:id/apply` (sin ruta nueva).
//   D2: reemplazo → hard delete de items con `aiRecommendationId != null AND != current`.
//       Respeta ADR-DB-004 (hard delete conservado; audit vía log estructurado + WAL).
//   D3: `editedPayload` reflexivo del canónico (`{ currencyCode, items: [{ category, estimatedAmount, label? }] }`).
//       Subset implícito = descarte; entradas fuera del payload original → 400 INVALID_VALUE.
//   D4: `edited=true` cuando subset < original o algún `estimatedAmount` difiere. `markAccepted`
//       lo hace centralmente `ApplyAIRecommendationUseCase` (US-025).
//   D5: evento en `cancelled`/`completed` → 409 EVENT_NOT_EDITABLE.
//   D6: alguna categoría con `is_active=false` → 409 CATEGORY_INACTIVE con lista.
// Emite `budget.ai_suggestion.applied` con conteos (sin PII).
import { performance } from 'node:perf_hooks';
import type { Prisma } from '@prisma/client';
import type {
  ApplyStrategy,
  ApplyStrategyArgs,
  ApplyStrategyOutcome,
} from '../../../ai-assistance/domain/hitl/apply-strategy.contract.js';
import { SideEffectFailedError } from '../../../ai-assistance/domain/errors/hitl.errors.js';
import type { BudgetItemWriteRepository } from '../../ports/budget-item-write.repository.js';
import type { ServiceCategoryReadPort } from '../../ports/service-category-read.port.js';
import {
  CategoryInactiveError,
  CurrencyMismatchError,
  EventNotEditableError,
  InvalidValueError,
  PayloadInvalidError,
  type InactiveCategoryDetail,
} from '../../domain/errors/budget-item.errors.js';
import { editedBudgetPayloadSchema, type EditedBudgetPayload } from '../../dto/edited-payload.body.js';
import { emitBudgetAiSuggestionApplied } from '../../../../shared/logging/budget-ai-events.js';

/** Shape canónico del output `budget_suggestion` (OUTPUT_SCHEMAS de US-097). */
export interface BudgetSuggestionOutputV2 {
  currencyCode: string;
  items: Array<{ category: string; estimatedAmount: string; label?: string }>;
}

export interface BudgetSuggestionApplyStrategyDeps {
  budgetItemWriteRepo: BudgetItemWriteRepository;
  serviceCategoryReadPort: ServiceCategoryReadPort;
}

const EDITABLE_EVENT_STATUSES = new Set(['draft', 'active']);

export class BudgetSuggestionApplyStrategyV2 implements ApplyStrategy<unknown> {
  readonly type = 'budget_suggestion' as const;

  constructor(private readonly deps: BudgetSuggestionApplyStrategyDeps) {}

  async applyInTransaction(args: ApplyStrategyArgs<unknown>): Promise<ApplyStrategyOutcome> {
    const startedAt = performance.now();
    const { tx, recommendation, actorId } = args;
    const txClient = tx as Prisma.TransactionClient;

    if (!recommendation.eventId) {
      throw new SideEffectFailedError(this.type, new Error('budget_suggestion requires eventId'));
    }

    // ── (1) Cargar evento y verificar D5 (event.status editable) ─────────────
    const event = await txClient.event.findUnique({
      where: { id: recommendation.eventId },
      select: { id: true, status: true, currency: true, userId: true },
    });
    if (!event) {
      // No-revelación defensiva; el use case central ya verificó ownership.
      throw new SideEffectFailedError(this.type, new Error('event not found'));
    }
    if (!EDITABLE_EVENT_STATUSES.has(event.status)) {
      throw new EventNotEditableError(event.status);
    }

    // ── (2) Interpretar `finalOutput`. Puede ser el output original o el `editedPayload` ya
    // validado contra `OUTPUT_SCHEMAS.budget_suggestion` por el use case central. Revalidamos
    // aquí para defensa profunda + para tener errores tipados de dominio budget. ─────────────
    const parsed = editedBudgetPayloadSchema.safeParse(args.finalOutput);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 8)
        .map((i) => `${i.path.join('.')}:${i.code}`)
        .join(';');
      // Si viene del use case central es porque `editedPayload` pasó `OUTPUT_SCHEMAS`; si esto
      // falla es que el AIRecommendation guardado está corrupto (PAYLOAD_INVALID 422).
      throw new PayloadInvalidError(issues);
    }
    const finalOutput: EditedBudgetPayload = parsed.data;

    if (finalOutput.items.length === 0) {
      throw new InvalidValueError('no items selected; use /discard to cancel');
    }

    // ── (3) Verificar D8/AC-08: currency consistency ─────────────────────────
    if (finalOutput.currencyCode !== event.currency) {
      throw new CurrencyMismatchError(finalOutput.currencyCode, event.currency);
    }

    // ── (4) Verificar VR-03: cada `category` del editedPayload debe estar en el original ─
    const original = extractOriginalItems(recommendation.output);
    const originalCategories = new Set(original.items.map((it) => it.category));
    for (const it of finalOutput.items) {
      if (!originalCategories.has(it.category)) {
        throw new InvalidValueError(`category '${it.category}' not in original payload`);
      }
    }

    // ── (5) Verificar D6: todas las categorías activas ───────────────────────
    const codes = Array.from(new Set(finalOutput.items.map((it) => it.category)));
    const catRows = await this.deps.serviceCategoryReadPort.findManyByCodes(codes);
    const foundCodes = new Set(catRows.map((r) => r.code));
    const missing = codes.filter((c) => !foundCodes.has(c));
    if (missing.length > 0) {
      throw new PayloadInvalidError(`unknown categories: ${missing.join(',')}`);
    }
    const inactive: InactiveCategoryDetail[] = catRows
      .filter((r) => !r.isActive)
      .map((r) => ({ code: r.code, name: r.name }));
    if (inactive.length > 0) {
      throw new CategoryInactiveError(inactive);
    }

    // ── (6) Asegurar Budget para el evento (1:1) ─────────────────────────────
    const budget = await txClient.budget.upsert({
      where: { eventId: event.id },
      update: {},
      create: { eventId: event.id },
      select: { id: true },
    });

    // ── (7) D2: reemplazo → hard delete de items previos AI ──────────────────
    const replaceable = await this.deps.budgetItemWriteRepo.findReplaceableAiItems(txClient, {
      budgetId: budget.id,
      currentAiRecommendationId: recommendation.id,
    });
    if (replaceable.length > 0) {
      await this.deps.budgetItemWriteRepo.hardDeleteMany(
        txClient,
        replaceable.map((r) => r.id),
      );
    }

    // ── (8) Crear items con aiRecommendationId ───────────────────────────────
    const created = await this.deps.budgetItemWriteRepo.createManyForRecommendation(txClient, {
      budgetId: budget.id,
      aiRecommendationId: recommendation.id,
      items: finalOutput.items.map((it) => ({
        label: it.label ?? deriveLabelFromCategory(it.category),
        categoryCode: it.category,
        amountPlanned: Number.parseFloat(it.estimatedAmount),
      })),
    });

    // ── (9) Recompute totales denormalizados (BLK-E US-035) ──────────────────
    await this.deps.budgetItemWriteRepo.recomputeBudgetTotals(txClient, budget.id);

    // ── (10) Determinar edited flag (D4) ─────────────────────────────────────
    const edited = computeEditedFlag(original, finalOutput);

    // ── (11) Log estructurado (OBS-001) ──────────────────────────────────────
    emitBudgetAiSuggestionApplied({
      aiRecommendationId: recommendation.id,
      eventId: event.id,
      budgetId: budget.id,
      userId: actorId,
      acceptedEntriesCount: finalOutput.items.length,
      replacedItemsCount: replaceable.length,
      createdItemsCount: created.length,
      edited,
      durationMs: Math.round(performance.now() - startedAt),
    });

    // La strategy no retorna `applied_entity_*` porque crea múltiples entidades (patrón checklist).
    return { appliedEntityType: null, appliedEntityId: null };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

interface OriginalPayload {
  currencyCode: string;
  items: Array<{ category: string; estimatedAmount: string }>;
}

function extractOriginalItems(output: unknown): OriginalPayload {
  // El `AIRecommendation.output` fue validado por `OUTPUT_SCHEMAS.budget_suggestion` cuando
  // se persistió (US-019 / US-124). Aquí solo extraemos de forma defensiva.
  const parsed = editedBudgetPayloadSchema.safeParse(output);
  if (!parsed.success) {
    throw new PayloadInvalidError('AIRecommendation.output not compatible with budget_suggestion schema');
  }
  return parsed.data;
}

function computeEditedFlag(original: OriginalPayload, final: EditedBudgetPayload): boolean {
  if (final.items.length !== original.items.length) return true;
  const originalMap = new Map(original.items.map((it) => [it.category, it.estimatedAmount]));
  for (const it of final.items) {
    const origAmount = originalMap.get(it.category);
    if (origAmount === undefined) return true;
    if (origAmount !== it.estimatedAmount) return true;
    if (it.label !== undefined) return true;
  }
  return false;
}

function deriveLabelFromCategory(category: string): string {
  // Placeholder legible: capitaliza el `code` (p. ej. `venue` → `Venue`).
  return category.slice(0, 1).toUpperCase() + category.slice(1);
}
