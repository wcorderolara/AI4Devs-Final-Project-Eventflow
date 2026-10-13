// GenerateAiRecommendationUseCase (US-097 / BE-003, AI-003, SEC-001; US-082 D5). Motor único
// parametrizado por feature (AI-001..008). Autoriza (ownership/assignment) ANTES de invocar el
// provider (SEC-06), genera, y persiste la AIRecommendation en `pending` vía
// `PersistAIRecommendationService` (US-122, prompt version real) — HITL, sin materializar dominio
// (N6). Un fallo controlado de IA deja un failure record `failed` (best-effort, US-122 AC-08).
//
// US-082 D5 / AC-05: cuando la feature es event-scoped o quote-request-scoped, el `languageCode`
// pasado al provider IA se **deriva del evento** (`event.languageCode`) — no del cliente. Esto
// implementa de forma central la obligación de "cada AI use case usa event.language como locale
// param" (Tech Spec §11). Si el reader no está inyectado (compatibilidad con tests) o devuelve
// null, se conserva el `languageCode` del comando.
import type { AIRecommendationRepository } from '../ports/ai-recommendation.repository.js';
import type { PromptVersionIdResolver } from '../ports/prompt-version-id.resolver.js';
import type { AiGenerationService } from './ai-generation.service.js';
import { PersistAIRecommendationService } from './persist-ai-recommendation.service.js';
import type {
  EventAccessReader,
  EventLanguageReader,
  VendorProfileReader,
  QuoteRequestEventReader,
} from '../../../shared/access/readers.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { FEATURE_SCOPE, type AiFeatureType } from '../domain/ai-features.js';
import type { AiRecommendationView } from '../domain/ai-recommendation.js';
import { requireEventOwner, requireVendorProfileId } from '../../../shared/access/authz.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import {
  AiFallbackFailedError,
  AiInvalidOutputError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from '../../../shared/domain/errors/ai.errors.js';

/** Fallos controlados de IA que dejan failure record (US-122 AC-08). */
function isRecordableAiFailure(err: unknown): err is { code: string } {
  return (
    err instanceof AiInvalidOutputError ||
    err instanceof AiProviderTimeoutError ||
    err instanceof AiProviderUnavailableError ||
    err instanceof AiFallbackFailedError
  );
}

interface RecommendationContext {
  eventId: string | null;
  vendorProfileId: string | null;
  quoteRequestId: string | null;
}

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
  private readonly persistence: PersistAIRecommendationService;

  constructor(
    repo: AIRecommendationRepository,
    private readonly promptVersions: PromptVersionIdResolver,
    private readonly generation: AiGenerationService,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
    private readonly quoteRequestEvents: QuoteRequestEventReader,
    private readonly logger: DomainEventLogger,
    // US-082 D5 (AC-05): reader del `event.languageCode` para derivar el locale del provider IA
    // en features event-scoped y quote-request-scoped. Opcional para no romper composiciones
    // existentes; si se omite o retorna null, se preserva `cmd.languageCode`.
    private readonly eventLanguage?: EventLanguageReader,
  ) {
    this.persistence = new PersistAIRecommendationService(repo);
  }

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

    // US-082 D5 / AC-05: para features asociadas a un evento, el `languageCode` efectivo se
    // deriva de `event.languageCode` (no del body del cliente). El client-provided sirve solo
    // como fallback defensivo si el reader no está disponible (composiciones legacy).
    let effectiveLanguageCode = cmd.languageCode;
    if (eventId && this.eventLanguage) {
      const eventLang = await this.eventLanguage.getLanguage(eventId);
      if (eventLang) effectiveLanguageCode = eventLang;
    }

    const context: RecommendationContext = { eventId, vendorProfileId, quoteRequestId };
    let outcome;
    try {
      outcome = await this.generation.generate(cmd.feature, cmd.input, effectiveLanguageCode, cmd.preferMock, cmd.correlationId);
    } catch (err) {
      this.logger.emit('ai.generation.failed', { correlationId: cmd.correlationId, actorId: cmd.userId, reason: cmd.feature });
      if (isRecordableAiFailure(err)) {
        await this.recordFailure(cmd, context, effectiveLanguageCode ?? 'es-LATAM', err);
      }
      throw err;
    }

    // US-084 (PB-P1-049 / BE-005 · AC-05): auditoría del binding i18n del provider IA.
    // `ai.locale.applied` acompaña TODA generación exitosa con el locale efectivo. Si el
    // adapter degradó a fallback, además se emite `ai.locale.fallback` con la razón segura
    // (no se logea prompt/output crudo — SEC-09).
    this.logger.emit('ai.locale.applied', {
      correlationId: cmd.correlationId,
      actorId: cmd.userId,
      feature: cmd.feature,
      locale: outcome.aiMeta.languageCode,
    });
    if (outcome.aiMeta.fallbackUsed) {
      this.logger.emit('ai.locale.fallback', {
        correlationId: cmd.correlationId,
        actorId: cmd.userId,
        feature: cmd.feature,
        locale: outcome.aiMeta.languageCode,
        fallbackReason: 'provider_fallback',
      });
    }

    // HITL: `persist()` fuerza `pending`; aplicar sólo vía HitlApplyAIRecommendationUseCase.
    // `correlationId` no se pasa: `ai_meta` conserva el shape `AiMeta` del contrato HTTP.
    const { aiMeta, execMeta } = outcome;
    const view = await this.persistence.persist({
      requestedByUserId: cmd.userId,
      type: cmd.feature,
      promptVersionId: await this.promptVersions.resolve(cmd.feature, aiMeta.languageCode),
      provider: execMeta.provider,
      languageCode: aiMeta.languageCode,
      fallbackUsed: aiMeta.fallbackUsed,
      timeoutMs: execMeta.timeoutMs,
      latencyMs: aiMeta.latencyMs,
      promptVersionLabel: aiMeta.promptVersion,
      inputPayload: outcome.sanitizedInput,
      outputPayload: outcome.output,
      schemaValid: outcome.schemaValid,
      ...context,
    });

    this.logger.emit('ai.generation.completed', { correlationId: cmd.correlationId, actorId: cmd.userId, reason: view.id });
    return view;
  }

  /** Failure record best-effort (US-122 AC-08): nunca enmascara el error original de IA. */
  private async recordFailure(
    cmd: GenerateInput,
    context: RecommendationContext,
    languageCode: string,
    err: { code: string },
  ): Promise<void> {
    try {
      await this.persistence.persistFailure({
        requestedByUserId: cmd.userId,
        type: cmd.feature,
        promptVersionId: await this.promptVersions.resolve(cmd.feature, languageCode),
        languageCode,
        correlationId: cmd.correlationId,
        errorCode: err.code,
        ...this.generation.failureMeta(err),
        ...context,
      });
    } catch (persistErr) {
      this.logger.emit('ai.recommendation.failure_record_skipped', {
        correlationId: cmd.correlationId,
        actorId: cmd.userId,
        reason: (persistErr as { code?: string } | null)?.code ?? 'UNKNOWN',
      });
    }
  }
}
