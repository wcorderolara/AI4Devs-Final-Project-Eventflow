// US-025 (PB-P1-016 / SEC-001) — `AIRecommendationOwnershipPolicy`. Ownership backend-only:
//   * actor.role === 'admin'                         → 403 FORBIDDEN (FR-ADMIN-010)
//   * actor.id !== requestedByUserId (o !recomm.)    → 404 RESOURCE_NOT_FOUND (SEC-08 no-revelación)
//   * actor.id === requestedByUserId                 → OK
// El envelope de 404 es idéntico al de recurso inexistente (verificado en QA-004).
import type { AiRecommendationView } from '../../domain/ai-recommendation.js';
import { OwnershipDeniedError } from '../../domain/errors/hitl.errors.js';

export interface ActorContext {
  id: string;
  role: 'organizer' | 'vendor' | 'admin';
}

export class AIRecommendationOwnershipPolicy {
  /**
   * Verifica ownership. Admin excluido con 403 explícito; not-owner con 404 no-revelación.
   * `recommendation === null` (no encontrada) también resulta en 404 no-revelación con la MISMA
   * signature (`OwnershipDeniedError('not_owner')`) — se homologa con el envelope de la ausencia.
   */
  assertOwnership(input: { recommendation: AiRecommendationView | null; actor: ActorContext }): void {
    if (input.actor.role === 'admin') {
      throw new OwnershipDeniedError('admin_excluded');
    }
    if (!input.recommendation) {
      throw new OwnershipDeniedError('not_owner');
    }
    if (input.recommendation.requestedByUserId !== input.actor.id) {
      throw new OwnershipDeniedError('not_owner');
    }
  }
}
