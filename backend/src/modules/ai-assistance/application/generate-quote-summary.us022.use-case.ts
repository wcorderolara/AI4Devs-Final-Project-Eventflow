// GenerateQuoteSummaryUseCase — US-022 (PB-P2-001 / BE-004; AC-01..AC-05, EC-01..EC-05).
//
// Preflight específico del comparador de Quotes:
//   1. `category_code` obligatorio (D1 / EC-02) → `INVALID_FILTERS`.
//   2. Ownership del evento (D6 / SEC-01) → `404 EVENT_NOT_FOUND` uniforme.
//   3. Categoría activa por code (US-057 reader) → `400 INVALID_CATEGORY`.
//   4. ≥ 2 quotes activas (`status ∈ {sent, accepted}`) en la categoría (D7 / VR-02 / EC-01).
//   5. Snapshot `quote_ids_snapshot` + `category_code` + `prompt_version='v1'` (D2/D4/D8 / AC-02).
//
// Delegación al motor genérico `GenerateAiRecommendationUseCase` (US-097 / US-084) para:
//   - Autorización cross-cutting (ownership vía `EventAccessReader`).
//   - Binding de locale desde `event.languageCode` (US-082 EMERGENT-001 / US-084 / AC-04).
//   - Sanitización de input + validación de output vs. schema Zod (US-097 / US-121 / US-124).
//   - Emisión de `ai.locale.applied` / `ai.locale.fallback` (US-084 / AC-04 / AC-05).
//   - Persistencia HITL como `AIRecommendation` `pending` con `kind='quote_compare_summary'`
//     (D4 / AC-02).
//
// El input del provider (context) ya incluye el snapshot: al persistirse en `inputPayload` queda
// disponible para el banner UI que detecta cambios (EC-05).
import type {
  EventAccessReader,
  ServiceCategoryReader,
} from '../../../shared/access/readers.js';
import { requireEventOwner } from '../../../shared/access/authz.js';
import type { EventQuoteReader } from '../ports/event-quote-reader.port.js';
import type { AiRecommendationView } from '../domain/ai-recommendation.js';
import {
  Us022InsufficientQuotesError,
  Us022InvalidCategoryError,
} from '../domain/us022.errors.js';
import type { GenerateAiRecommendationUseCase } from './generate-ai-recommendation.use-case.js';

const QUOTE_COMPARE_SUMMARY_PROMPT_VERSION = 'v1';

/** Filtro canónico de "quote activa" para US-022 (equivalente a la vista del comparador US-057). */
const ELIGIBLE_QUOTE_STATUSES: readonly ('sent' | 'accepted')[] = ['sent', 'accepted'] as const;

export interface GenerateQuoteSummaryInput {
  userId: string;
  eventId: string;
  categoryCode: string;
  preferMock?: boolean;
  correlationId?: string;
}

export class GenerateQuoteSummaryUseCase {
  constructor(
    private readonly events: EventAccessReader,
    private readonly categories: ServiceCategoryReader,
    // US-022 (ADR-ARCH-001): reader consumer-owned; el composition root adapta `PrismaQuoteRepository`.
    private readonly quotes: EventQuoteReader,
    private readonly generate: GenerateAiRecommendationUseCase,
  ) {}

  async execute(cmd: GenerateQuoteSummaryInput): Promise<AiRecommendationView> {
    // 1. Ownership uniforme — `404 EVENT_NOT_FOUND` para inexistente o ajeno (SEC-04).
    await requireEventOwner(this.events, cmd.eventId, cmd.userId);

    // 2. Categoría existente/activa por code — `400 INVALID_CATEGORY` (mismo shape US-057).
    const category = await this.categories.findActiveByCode(cmd.categoryCode);
    if (!category) throw new Us022InvalidCategoryError(cmd.categoryCode);

    // 3. Quotes elegibles (activas) en la categoría — ≥ 2.
    const rows = await this.quotes.findComparableByEventAndCategory({
      eventId: cmd.eventId,
      serviceCategoryId: category.id,
    });
    const eligible = rows.filter((r) => (ELIGIBLE_QUOTE_STATUSES as readonly string[]).includes(r.status));
    if (eligible.length < 2) {
      throw new Us022InsufficientQuotesError(eligible.length);
    }

    // 4. Context minimal para el provider — sin campos sensibles (SEC-03 payload minimization).
    // El snapshot se persiste como parte de `inputPayload` (D8/AC-02), disponible para el banner UI.
    const quoteIdsSnapshot = eligible.map((r) => r.quoteId);
    const context: Record<string, unknown> = {
      category_code: category.code,
      category_name: category.label,
      quotes: eligible.map((r) => ({
        quote_id: r.quoteId,
        vendor_business_name: r.vendor.businessName,
        vendor_rating_avg: r.vendor.ratingAvg,
        total_price: r.totalPrice,
        valid_until: r.validUntil,
        breakdown: r.breakdown,
        conditions: r.conditions,
        status: r.status,
        is_preferred: r.isPreferred,
      })),
      quote_ids_snapshot: quoteIdsSnapshot,
      prompt_version: QUOTE_COMPARE_SUMMARY_PROMPT_VERSION,
      // Hint para el `MockAIProvider` para producir summaries alineados a los quote_id reales.
      __quote_ids: quoteIdsSnapshot,
    };

    // 5. Delegación al motor genérico (auth + locale binding + validación + persistencia).
    return this.generate.execute({
      userId: cmd.userId,
      feature: 'quote_compare_summary',
      contextId: cmd.eventId,
      input: context,
      preferMock: cmd.preferMock,
      correlationId: cmd.correlationId,
    });
  }
}
