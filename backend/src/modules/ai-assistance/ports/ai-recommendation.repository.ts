// Puerto AIRecommendationRepository (US-097 / BE-002; extendido en US-122 / BE-001). Module-local.
// US-097 entregó `createPending`/`findById`/`markStatus`. US-122 agrega persistencia con metadata
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
  /** US-097: crea un record `pending` usando un AIPromptVersion placeholder (compat). */
  createPending(data: CreateAiRecommendationData): Promise<AiRecommendationView>;
  findById(id: string): Promise<AiRecommendationView | null>;
  markStatus(id: string, status: 'accepted' | 'discarded'): Promise<AiRecommendationView>;

  /** US-122: persiste un record `pending` con metadata completa y prompt version real. */
  create(input: PersistAiRecommendationInput, options?: RepositoryWriteOptions): Promise<AiRecommendationView>;
  /** US-122: persiste un record `failed` con sólo metadata segura (AC-08). */
  createFailed(input: PersistAiRecommendationFailureInput, options?: RepositoryWriteOptions): Promise<AiRecommendationView>;
  /** US-122: valida existencia de la versión de prompt (AC-03) sin acoplar a FK del caller. */
  existsPromptVersion(promptVersionId: string, options?: RepositoryWriteOptions): Promise<boolean>;
  /** US-122 (EMERGENT-122-001): upsert idempotente del export `AIPromptVersion` de US-121. */
  upsertPromptVersion(row: AIPromptVersionSyncRow, options?: RepositoryWriteOptions): Promise<void>;
}
