// Puerto AIRecommendationRepository (US-097 / BE-002; extendido en US-122 / BE-001). Module-local.
// US-097 entregó `findById`/`markStatus`. US-122 agrega persistencia con metadata
// completa (`create`), failure records seguros (`createFailed`), validación de prompt version
// (`existsPromptVersion`) y sync idempotente del export de US-121 (`upsertPromptVersion`), todos con
// soporte opcional de transaction client. Application depende de este port, no de Prisma.
import type { Prisma } from '@prisma/client';
import type {
  AiRecommendationView,
  CreateAiRecommendationData,
  PersistAiRecommendationInput,
  PersistAiRecommendationFailureInput,
  AIPromptVersionSyncRow,
} from '../domain/ai-recommendation.js';

/** Opciones de persistencia: transaction client opcional para composición atómica futura. */
export interface RepositoryWriteOptions {
  tx?: Prisma.TransactionClient;
}

export interface AIRecommendationRepository {
  findById(id: string): Promise<AiRecommendationView | null>;
  markStatus(id: string, status: 'accepted' | 'discarded'): Promise<AiRecommendationView>;

  /** US-122: persiste un record `pending` con metadata completa y prompt version real. */
  create(input: PersistAiRecommendationInput, options?: RepositoryWriteOptions): Promise<AiRecommendationView>;
  /** US-122: persiste un record `failed` con sólo metadata segura (AC-08). */
  createFailed(input: PersistAiRecommendationFailureInput, options?: RepositoryWriteOptions): Promise<AiRecommendationView>;
  /** US-122: valida existencia de la versión de prompt (AC-03) sin acoplar a FK del caller. */
  existsPromptVersion(promptVersionId: string, options?: RepositoryWriteOptions): Promise<boolean>;
  /**
   * US-122 (EMERGENT-122-001): upsert idempotente del export `AIPromptVersion` de US-121. Devuelve
   * el id REAL en BD (puede diferir de `row.id` si la fila ya existía por `promptKey`+`version`).
   */
  upsertPromptVersion(row: AIPromptVersionSyncRow, options?: RepositoryWriteOptions): Promise<string>;

  /**
   * US-059 (PB-P2-001 / BE-002): último `AIRecommendation` por (`eventId`, `kind`,
   * `inputPayload.category_code`), ordenado por `createdAt DESC`. Ignora records `failed` (US-122
   * failure records, sin output útil). Retorna `null` si no existe —
   * el use case lo mapea a `404` uniforme. Reusa el índice existente
   * `(event_id, recommendation_type, created_at DESC)`.
   */
  findLatestByEventTypeAndCategory(input: {
    eventId: string;
    kind: string;
    categoryCode: string;
  }): Promise<AiRecommendationView | null>;

  /**
   * US-026 (PB-P2-003 / BE-006): cuenta hijos del linaje (excluyendo la raíz). Usa el índice
   * `ai_recommendations_root_recommendation_id_idx` (DB-001). Se llama con la row raíz o con
   * cualquier descendiente — el caller resuelve `rootId` como `parent.rootRecommendationId ??
   * parent.id`. `< max` habilita generar; `>= max` bloquea con `Us026RegenerationLimitError`.
   */
  countLineageChildren(input: {
    rootRecommendationId: string;
    options?: RepositoryWriteOptions;
  }): Promise<number>;

  /**
   * US-026 (PB-P2-003 / BE-006): persiste un `AIRecommendation` hijo del linaje (`pending`) con el
   * `promptVersionId` resuelto por `PromptVersionIdResolver` y las columnas dedicadas
   * `parent_recommendation_id`, `root_recommendation_id`, `regeneration_feedback` (DB-001).
   */
  createRegeneration(
    input: CreateAiRecommendationData & {
      promptVersionId: string;
      parentRecommendationId: string;
      rootRecommendationId: string;
      regenerationFeedback: string | null;
    },
    options?: RepositoryWriteOptions,
  ): Promise<AiRecommendationView>;

  /**
   * US-026 (PB-P2-003 / BE-006): vista extendida del `AIRecommendation` con las columnas de
   * linaje (parent/root/feedback). El use case necesita `rootRecommendationId` del parent para
   * calcular el linaje objetivo; `findById` sólo expone la vista sanitizada.
   */
  findByIdWithLineage(id: string): Promise<{
    view: AiRecommendationView;
    parentRecommendationId: string | null;
    rootRecommendationId: string | null;
    regenerationFeedback: string | null;
  } | null>;
}
