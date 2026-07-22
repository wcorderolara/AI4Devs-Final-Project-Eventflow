// GetLatestQuoteSummaryUseCase — US-059 (PB-P2-001 / BE-002; AC-01, AC-03, EC-01).
// Solo lectura. Cadena:
//   1. Ownership uniforme del evento (`requireEventOwner`) → `404 RESOURCE_NOT_FOUND` (SEC-03).
//   2. Query `AIRecommendation` por (event, kind='quote_compare_summary', payload.category_code)
//      ordenado por `createdAt DESC` → `null` = 404 uniforme.
// La respuesta se serializa con el mismo mapper que el POST de US-022 (`toQuoteSummaryResponse`),
// preservando el contrato para el FE (mismo shape que el mutation.data).
import type { EventAccessReader } from '../../../shared/access/readers.js';
import { requireEventOwner } from '../../../shared/access/authz.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import type { AIRecommendationRepository } from '../ports/ai-recommendation.repository.js';
import type { AiRecommendationView } from '../domain/ai-recommendation.js';

const QUOTE_COMPARE_SUMMARY_KIND = 'quote_compare_summary';

export interface GetLatestQuoteSummaryInput {
  userId: string;
  eventId: string;
  categoryCode: string;
}

export class GetLatestQuoteSummaryUseCase {
  constructor(
    private readonly repo: AIRecommendationRepository,
    private readonly events: EventAccessReader,
  ) {}

  async execute(cmd: GetLatestQuoteSummaryInput): Promise<AiRecommendationView> {
    await requireEventOwner(this.events, cmd.eventId, cmd.userId);
    const view = await this.repo.findLatestByEventTypeAndCategory({
      eventId: cmd.eventId,
      kind: QUOTE_COMPARE_SUMMARY_KIND,
      categoryCode: cmd.categoryCode,
    });
    if (!view) throw new NotFoundError('AI recommendation not found');
    return view;
  }
}
