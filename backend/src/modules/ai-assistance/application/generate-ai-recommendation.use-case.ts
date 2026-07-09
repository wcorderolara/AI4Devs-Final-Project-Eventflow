// GenerateAiRecommendationUseCase (US-097 / BE-003, AI-003, SEC-001). Motor único parametrizado por
// feature (AI-001..008). Autoriza (ownership/assignment) ANTES de invocar el provider (SEC-06),
// genera, y persiste la AIRecommendation en `pending` (HITL — sin materializar dominio, N6).
import type { AIRecommendationRepository } from '../ports/ai-recommendation.repository.js';
import type { AiGenerationService } from './ai-generation.service.js';
import type {
  EventAccessReader,
  VendorProfileReader,
  QuoteRequestEventReader,
} from '../../../shared/access/readers.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { FEATURE_SCOPE, type AiFeatureType } from '../domain/ai-features.js';
import type { AiRecommendationView } from '../domain/ai-recommendation.js';
import { requireEventOwner, requireVendorProfileId } from '../../../shared/access/authz.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';

export interface GenerateInput {
  userId: string;
  feature: AiFeatureType;
  contextId?: string; // eventId o quoteRequestId según scope
  input: Record<string, unknown>;
  languageCode?: string;
  preferMock?: boolean;
  correlationId?: string;
}

export class GenerateAiRecommendationUseCase {
  constructor(
    private readonly repo: AIRecommendationRepository,
    private readonly generation: AiGenerationService,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
    private readonly quoteRequestEvents: QuoteRequestEventReader,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(cmd: GenerateInput): Promise<AiRecommendationView> {
    this.logger.emit('ai.generation.started', { correlationId: cmd.correlationId, actorId: cmd.userId, reason: cmd.feature });

    const scope = FEATURE_SCOPE[cmd.feature];
    let eventId: string | null = null;
    let vendorProfileId: string | null = null;
    let quoteRequestId: string | null = null;

    // Autorización ANTES del provider (SEC-06).
    if (scope === 'event') {
      await requireEventOwner(this.events, cmd.contextId!, cmd.userId);
      eventId = cmd.contextId!;
    } else if (scope === 'quote_request') {
      const eId = await this.quoteRequestEvents.getEventId(cmd.contextId!);
      if (!eId) throw new NotFoundError('Quote request not found');
      await requireEventOwner(this.events, eId, cmd.userId);
      quoteRequestId = cmd.contextId!;
      eventId = eId;
    } else {
      vendorProfileId = await requireVendorProfileId(this.vendors, cmd.userId);
    }

    let outcome;
    try {
      outcome = await this.generation.generate(cmd.feature, cmd.input, cmd.languageCode, cmd.preferMock);
    } catch (err) {
      this.logger.emit('ai.generation.failed', { correlationId: cmd.correlationId, actorId: cmd.userId, reason: cmd.feature });
      throw err;
    }

    const view = await this.repo.createPending({
      requestedByUserId: cmd.userId,
      type: cmd.feature,
      eventId,
      vendorProfileId,
      quoteRequestId,
      input: outcome.sanitizedInput,
      output: outcome.output,
      aiMeta: outcome.aiMeta,
    });

    this.logger.emit('ai.generation.completed', { correlationId: cmd.correlationId, actorId: cmd.userId, reason: view.id });
    return view;
  }
}
