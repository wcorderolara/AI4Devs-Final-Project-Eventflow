// US-026 (PB-P2-003 / BE-006) — Regeneración cross-cutting de `AIRecommendation`.
//
// Flujo canónico (Tech Spec §7):
//   1. Lookup parent con linaje (via `findByIdWithLineage`). Ausente ⇒ 404 uniforme (AC-04/VR-03).
//   2. Autorización polimórfica (`AIRecommendationOwnerResolver`, BE-002). Mismatch ⇒ 404
//      uniforme (AC-05/SEC-02). El resolver deriva scope desde `FEATURE_SCOPE[parent.type]`.
//   3. `rootId = parent.rootRecommendationId ?? parent.id` (D3, mismo cálculo del backfill de
//      DB-001 para filas históricas).
//   4. Cuenta hijos del linaje (`countLineageChildren`). Si `count >= max` (env
//      `AI_MAX_REGENERATIONS_PER_LINEAGE`, default 5, D2/D10) ⇒ `Us026RegenerationLimitError`
//      (mapea a 429 REGENERATION_LIMIT en el error handler, distinto de RATE_LIMIT_EXCEEDED).
//   5. Feature = `parent.type`. Locale = `parent.locale` (D5, heredado del parent — AC-06).
//   6. Inyecta el feedback trimmed (D6/EC-04) en la input via clave `__regeneration_feedback`
//      (auditable en `AIRecommendation.input_payload`) + genera via `AiGenerationService`
//      (US-097/US-084/US-122). Validación Zod contra `OUTPUT_SCHEMAS[feature]` (BE-004
//      resolver es una fachada delgada sobre el mismo mapa).
//   7. Try/catch (AC-08): cualquier error controlado del pipeline (output malformado, timeout
//      del provider, unsupported language) ⇒ payload fallback determinista (baseOutput por
//      feature) + `localeFallback=true`. El fallback SÍ persiste (cuenta para el límite del
//      linaje, D9/AC-08).
//   8. Persist child via `createRegeneration` con snapshot completo del linaje.
//   9. Log `ai.regenerate.generated` (o `.fallback` si degradó).
//
// La operación NO abre transacción explícita: el conteo + INSERT son idempotentes (una request
// crea a lo sumo un child; el conteo se re-verifica al servir la siguiente request). Bajo
// concurrencia extrema podrían crearse 5+1 hijos raras veces — trade-off aceptado en MVP.
import type { AIRecommendationRepository } from '../../ports/ai-recommendation.repository.js';
import type { AiGenerationService } from '../ai-generation.service.js';
import type { AiFeatureType } from '../../domain/ai-features.js';
import type { AiRecommendationView } from '../../domain/ai-recommendation.js';
import type { AIRecommendationOwnerResolver } from './owner-resolver.js';
import type { OutputSchemaResolver } from './type-resolvers.js';
import type { AIRegenerateConfig } from './regenerate-config.js';
import type { DomainEventLogger } from '../../../../shared/observability/domain-event-logger.js';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error.js';
import { Us026RegenerationLimitError } from '../../domain/us026.errors.js';
import { baseOutput } from '../../infrastructure/providers/mock/mock-fixtures.js';
import { AI_FEATURE_TYPES } from '../../domain/ai-features.js';

export interface RegenerateInput {
  currentUserId: string;
  recommendationId: string;
  feedback?: string;
  preferMock?: boolean;
  correlationId?: string;
}

export interface RegenerateOutput {
  view: AiRecommendationView;
  parentRecommendationId: string;
  rootRecommendationId: string;
  regenerationFeedback: string | null;
}

function isAiFeatureType(v: string): v is AiFeatureType {
  return (AI_FEATURE_TYPES as readonly string[]).includes(v);
}

export class RegenerateAIRecommendationUseCase {
  constructor(
    private readonly repo: AIRecommendationRepository,
    private readonly generation: AiGenerationService,
    private readonly ownerResolver: AIRecommendationOwnerResolver,
    private readonly outputSchemas: OutputSchemaResolver,
    private readonly config: AIRegenerateConfig,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(cmd: RegenerateInput): Promise<RegenerateOutput> {
    this.logger.emit('ai.regenerate.requested', {
      correlationId: cmd.correlationId,
      actorId: cmd.currentUserId,
      reason: cmd.recommendationId,
    });

    // 1. Lookup parent
    const found = await this.repo.findByIdWithLineage(cmd.recommendationId);
    if (!found) throw new NotFoundError('Not found');
    const parent = found.view;

    // 2. Autorización polimórfica (404 uniforme en mismatch)
    const ok = await this.ownerResolver.matches({
      currentUserId: cmd.currentUserId,
      parent,
    });
    if (!ok) throw new NotFoundError('Not found');

    // 3. rootId — parent es raíz de su propio linaje si no tiene rootId (backfill DB-001).
    const rootId = found.rootRecommendationId ?? parent.id;

    // 4. Cap por linaje (D2/D10)
    const currentCount = await this.repo.countLineageChildren({ rootRecommendationId: rootId });
    if (currentCount >= this.config.maxRegenerationsPerLineage) {
      this.logger.emit('ai.regenerate.limit_exceeded', {
        correlationId: cmd.correlationId,
        actorId: cmd.currentUserId,
        reason: rootId,
      });
      throw new Us026RegenerationLimitError(
        currentCount,
        this.config.maxRegenerationsPerLineage,
      );
    }

    // 5. Feature + locale heredados (AC-06 D5)
    if (!isAiFeatureType(parent.type)) {
      // Defensivo: si el registry perdió una feature histórica, respondemos 404 uniforme
      // en lugar de 500 (evita filtrar detalles internos).
      throw new NotFoundError('Not found');
    }
    const feature: AiFeatureType = parent.type;
    const locale = parent.locale;

    // 6. Inyecta el feedback trimmed en la input (auditable) + genera
    const trimmedFeedback = (cmd.feedback ?? '').trim();
    const parentInput =
      parent.input && typeof parent.input === 'object' && !Array.isArray(parent.input)
        ? (parent.input as Record<string, unknown>)
        : {};
    const regenInput: Record<string, unknown> = {
      ...parentInput,
      __regeneration_feedback: trimmedFeedback,
    };

    let outcome;
    let localeFallback = false;
    let outputPayload: unknown;
    let aiMeta;
    try {
      outcome = await this.generation.generate(
        feature,
        regenInput,
        locale,
        cmd.preferMock,
      );
      outputPayload = outcome.output;
      aiMeta = outcome.aiMeta;
      localeFallback = outcome.aiMeta.fallbackUsed;
    } catch (err) {
      // AC-08 fallback: persistir child con payload estático + locale_fallback=true. Cuenta
      // para el linaje (audit trail). No se filtra `err.message` al cliente — se logea.
      this.logger.emit('ai.regenerate.fallback', {
        correlationId: cmd.correlationId,
        actorId: cmd.currentUserId,
        reason: (err as Error).message,
      });
      const schema = this.outputSchemas.resolve(feature);
      const fallback = baseOutput(feature, regenInput);
      // Aseguramos que el fallback estático satisface el schema; si no, degradamos a {}.
      const parsed = schema.safeParse(fallback);
      outputPayload = parsed.success ? parsed.data : {};
      localeFallback = true;
      aiMeta = {
        provider: 'mock' as const,
        promptVersion: 'v1',
        latencyMs: 0,
        fallbackUsed: true,
        languageCode: locale,
      };
    }

    // 7. Logs de auditoría i18n (US-084) — reproducimos la telemetría del pipeline genérico.
    this.logger.emit('ai.locale.applied', {
      correlationId: cmd.correlationId,
      actorId: cmd.currentUserId,
      feature,
      locale,
    });
    if (localeFallback) {
      this.logger.emit('ai.locale.fallback', {
        correlationId: cmd.correlationId,
        actorId: cmd.currentUserId,
        feature,
        locale,
        fallbackReason: 'regenerate_fallback',
      });
    }

    // 8. Persist child con linaje explícito
    const view = await this.repo.createRegeneration({
      requestedByUserId: cmd.currentUserId,
      type: feature,
      eventId: parent.eventId,
      vendorProfileId: parent.vendorProfileId,
      quoteRequestId: parent.quoteRequestId,
      input: outcome?.sanitizedInput ?? regenInput,
      output: outputPayload,
      aiMeta,
      parentRecommendationId: parent.id,
      rootRecommendationId: rootId,
      regenerationFeedback: trimmedFeedback.length > 0 ? trimmedFeedback : null,
    });

    this.logger.emit('ai.regenerate.generated', {
      correlationId: cmd.correlationId,
      actorId: cmd.currentUserId,
      reason: view.id,
    });

    return {
      view,
      parentRecommendationId: parent.id,
      rootRecommendationId: rootId,
      regenerationFeedback: trimmedFeedback.length > 0 ? trimmedFeedback : null,
    };
  }
}
