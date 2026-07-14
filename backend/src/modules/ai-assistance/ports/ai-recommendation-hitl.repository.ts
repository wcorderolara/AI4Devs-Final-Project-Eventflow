// US-025 (PB-P1-016 / BE-001) — Puerto `AIRecommendationHITLRepository`. Cierra el ciclo HITL con
// `UPDATE ... WHERE status='pending'` para idempotencia natural (Doc 16 §35.3). El caller pasa
// el `Prisma.TransactionClient` para composición atómica con las strategies (BE-005).
import type { Prisma } from '@prisma/client';
import type { AiRecommendationView } from '../domain/ai-recommendation.js';

export interface HitlUpdateResult {
  /** Filas afectadas: 0 señaliza estado no `pending` (409 `RECOMMENDATION_NOT_PENDING`). */
  updatedCount: number;
}

export interface MarkAcceptedInput {
  id: string;
  actorId: string;
  finalOutput: unknown;
  edited: boolean;
  appliedEntityType: string | null;
  appliedEntityId: string | null;
  correlationId?: string;
  /** Sobre-escribir el `output_payload` con el `editedPayload` (canónico del `apply`). */
  overwriteOutputPayload?: boolean;
}

export interface MarkDiscardedInput {
  id: string;
  actorId: string;
  correlationId?: string;
}

export interface AIRecommendationHITLRepository {
  /** Carga por id sin filtrar por owner (el filtrado ocurre en la ownership policy). */
  findById(id: string): Promise<AiRecommendationView | null>;
  /** UPDATE ... WHERE status='pending'; retorna updatedCount. */
  markAccepted(tx: Prisma.TransactionClient, input: MarkAcceptedInput): Promise<HitlUpdateResult>;
  /** UPDATE ... WHERE status='pending'; retorna updatedCount. */
  markDiscarded(tx: Prisma.TransactionClient, input: MarkDiscardedInput): Promise<HitlUpdateResult>;
}
