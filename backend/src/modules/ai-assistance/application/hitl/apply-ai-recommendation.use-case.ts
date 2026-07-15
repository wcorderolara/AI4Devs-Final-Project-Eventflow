// US-025 (PB-P1-016 / BE-005) — `ApplyAIRecommendationUseCase`. Orquesta el HITL apply:
//   1. Carga la `AIRecommendation` (repo.findById).
//   2. Verifica ownership (admin excluido / no-revelación).
//   3. Resuelve la strategy por `type` (422 si no aplica).
//   4. Valida `editedPayload` con `OutputDtoResolver.schemaFor(type)` cuando se provee (400).
//   5. `prisma.$transaction(async tx => { strategy.applyInTransaction; repo.markAccepted })`.
//   6. Si `updatedCount=0` → 409 `RecommendationNotPendingError`.
//   7. Emite `ai.recommendation.applied` con metadata segura (PII redactada).
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../../infrastructure/prisma/client.js';
import type { AIRecommendationHITLRepository } from '../../ports/ai-recommendation-hitl.repository.js';
import type { AIRecommendationApplyStrategyRegistry } from './apply-strategy.registry.js';
import type { OutputDtoResolver } from './output-dto.resolver.js';
import type { AIRecommendationOwnershipPolicy, ActorContext } from './ownership.policy.js';
import { HitlLogger } from './hitl-logger.js';
import {
  RecommendationNotPendingError,
  EditedPayloadInvalidError,
  SideEffectFailedError,
} from '../../domain/errors/hitl.errors.js';
import type { AiRecommendationView } from '../../domain/ai-recommendation.js';

export interface ApplyAIRecommendationInput {
  actor: ActorContext;
  recommendationId: string;
  editedPayload?: unknown;
  correlationId?: string;
}

export interface ApplyAIRecommendationResult {
  recommendation: AiRecommendationView;
  edited: boolean;
  appliedEntityType: string | null;
  appliedEntityId: string | null;
}

export class ApplyAIRecommendationUseCase {
  private readonly logger = new HitlLogger();
  constructor(
    private readonly repo: AIRecommendationHITLRepository,
    private readonly registry: AIRecommendationApplyStrategyRegistry,
    private readonly resolver: OutputDtoResolver,
    private readonly ownership: AIRecommendationOwnershipPolicy,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(input: ApplyAIRecommendationInput): Promise<ApplyAIRecommendationResult> {
    const startedAt = Date.now();
    const rec = await this.repo.findById(input.recommendationId);
    this.ownership.assertOwnership({ recommendation: rec, actor: input.actor });
    const recommendation = rec!;
    const languageCode = (recommendation.aiMeta as { languageCode?: string } | null)?.languageCode;

    // (3) Resolve strategy — 422 if type not applicable.
    let strategy;
    try {
      strategy = this.registry.resolve(recommendation.type);
    } catch (err) {
      this.logger.emit('ai.recommendation.type_unsupported', {
        correlationId: input.correlationId,
        actorId: input.actor.id,
        type: recommendation.type,
        languageCode,
        recommendationId: recommendation.id,
        errorCode: 'RECOMMENDATION_TYPE_NOT_APPLICABLE',
      });
      throw err;
    }

    // (4) Validate `editedPayload` when provided.
    let finalOutput: unknown = recommendation.output;
    const edited = input.editedPayload !== undefined;
    if (edited) {
      const schema = this.resolver.schemaFor(recommendation.type);
      if (!schema) {
        // No schema registered — treat as invalid.
        this.logger.emit('ai.recommendation.payload_invalid', {
          correlationId: input.correlationId,
          actorId: input.actor.id,
          type: recommendation.type,
          languageCode,
          recommendationId: recommendation.id,
          errorCode: 'EDITED_PAYLOAD_INVALID',
          editedPayload: input.editedPayload,
        });
        throw new EditedPayloadInvalidError('no schema for type');
      }
      const parsed = schema.safeParse(input.editedPayload);
      if (!parsed.success) {
        const summary = parsed.error.issues
          .slice(0, 8)
          .map((i) => `${i.path.join('.')}:${i.code}`)
          .join(';');
        this.logger.emit('ai.recommendation.payload_invalid', {
          correlationId: input.correlationId,
          actorId: input.actor.id,
          type: recommendation.type,
          languageCode,
          recommendationId: recommendation.id,
          errorCode: 'EDITED_PAYLOAD_INVALID',
          editedPayload: input.editedPayload,
          zodIssuesSummary: summary,
        });
        throw new EditedPayloadInvalidError(summary);
      }
      finalOutput = parsed.data;
    }

    // (5) Atomic transaction: strategy side effect + markAccepted `WHERE status='pending'`.
    let outcome: { appliedEntityType: string | null; appliedEntityId: string | null };
    let updatedCount = 0;
    try {
      await this.prisma.$transaction(async (tx) => {
        outcome = await strategy.applyInTransaction({
          tx,
          recommendation,
          finalOutput,
          actorId: input.actor.id,
        });
        const res = await this.repo.markAccepted(tx, {
          id: recommendation.id,
          actorId: input.actor.id,
          finalOutput,
          edited,
          appliedEntityType: outcome.appliedEntityType,
          appliedEntityId: outcome.appliedEntityId,
          correlationId: input.correlationId,
          overwriteOutputPayload: edited,
        });
        updatedCount = res.updatedCount;
        if (updatedCount === 0) {
          // Aborta la transacción — el side effect se revierte automáticamente.
          throw new RecommendationNotPendingError();
        }
      });
    } catch (err) {
      if (err instanceof RecommendationNotPendingError) {
        this.logger.emit('ai.recommendation.conflict', {
          correlationId: input.correlationId,
          actorId: input.actor.id,
          type: recommendation.type,
          languageCode,
          recommendationId: recommendation.id,
          errorCode: 'RECOMMENDATION_NOT_PENDING',
          latencyMs: Date.now() - startedAt,
        });
        throw err;
      }
      // US-037: errores de dominio tipados (AppError con `code`) lanzados por las strategies
      // — p.ej. `CategoryInactiveError`, `EventNotEditableError`, `CurrencyMismatchError`,
      // `InvalidValueError`, `PayloadInvalidError` de `budget-management` — deben propagarse
      // sin envolver para que el error-handler central los mapee al HTTP status correcto.
      // Rollback ya ocurrió (throw dentro de `$transaction`).
      const isDomainError =
        err !== null &&
        typeof err === 'object' &&
        'code' in err &&
        typeof (err as { code?: unknown }).code === 'string';
      if (isDomainError && !(err instanceof SideEffectFailedError)) {
        this.logger.emit('ai.recommendation.apply_failed', {
          correlationId: input.correlationId,
          actorId: input.actor.id,
          type: recommendation.type,
          languageCode,
          recommendationId: recommendation.id,
          errorCode: (err as { code: string }).code,
          latencyMs: Date.now() - startedAt,
        });
        throw err;
      }
      // Cualquier otra falla no tipada → SideEffectFailedError (rollback ya ocurrió).
      const wrapped =
        err instanceof SideEffectFailedError ? err : new SideEffectFailedError(recommendation.type, err);
      this.logger.emit('ai.recommendation.apply_failed', {
        correlationId: input.correlationId,
        actorId: input.actor.id,
        type: recommendation.type,
        languageCode,
        recommendationId: recommendation.id,
        errorCode: 'SIDE_EFFECT_FAILED',
        latencyMs: Date.now() - startedAt,
      });
      throw wrapped;
    }

    // (6) Recuperar view actualizada.
    const updated = (await this.repo.findById(recommendation.id))!;

    this.logger.emit('ai.recommendation.applied', {
      correlationId: input.correlationId,
      actorId: input.actor.id,
      type: recommendation.type,
      languageCode,
      recommendationId: recommendation.id,
      edited,
      latencyMs: Date.now() - startedAt,
      appliedEntityType: outcome!.appliedEntityType,
      appliedEntityId: outcome!.appliedEntityId,
    });

    return {
      recommendation: updated,
      edited,
      appliedEntityType: outcome!.appliedEntityType,
      appliedEntityId: outcome!.appliedEntityId,
    };
  }
}
