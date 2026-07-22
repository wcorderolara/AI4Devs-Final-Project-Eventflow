// US-026 (PB-P2-003 / BE-002) — Resolver polimórfico de ownership para regeneración cross-cutting.
//
// La regeneración acepta parents de CUALQUIER `AiFeatureType`. La autoridad de matching es el
// `FEATURE_SCOPE` ya declarado en `ai-features.ts` (US-097) — este resolver NO duplica ese mapping,
// lo consume — y los readers cross-cutting (`EventAccessReader`, `VendorProfileReader`,
// `QuoteRequestEventReader`) exactamente como `GenerateAiRecommendationUseCase`.
//
// Scope → cómo se matchea el owner:
//   - `event`         → organizer dueño de `parent.eventId` (via `EventAccessReader.getOwnerId`).
//   - `vendor`        → vendor cuyo `vendorProfile.userId === currentUser.id` **y** cuyo
//                       `vendorProfile.id === parent.vendorProfileId`. Usa
//                       `VendorProfileReader.getVendorProfileIdForUser` como capa autoritativa.
//   - `quote_request` → organizer dueño del evento asociado al `parent.quoteRequestId`
//                       (via `QuoteRequestEventReader` + `EventAccessReader`).
//
// Si el matching falla → `NotFoundError` (SEC-02 uniforme). Nunca 403 (evita enumeration).
//
// Deviation D-03 (execution record): el tech spec §7 mencionaba `payload.vendor_user_id` para
// features vendor. En el schema real la fuente autoritativa es `AIRecommendation.vendorProfileId`
// (FK indexada, US-097). Se usa esa columna, no el blob JSON.
import { FEATURE_SCOPE, type AiFeatureType } from '../../domain/ai-features.js';
import type {
  EventAccessReader,
  VendorProfileReader,
  QuoteRequestEventReader,
} from '../../../../shared/access/readers.js';
import type { AiRecommendationView } from '../../domain/ai-recommendation.js';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error.js';

export interface OwnershipMatchInput {
  currentUserId: string;
  parent: AiRecommendationView;
}

/** Tipo del scope efectivo — reproduce `AiFeatureScope` sin importarlo (evita ciclo). */
export type OwnershipScope = 'event' | 'vendor' | 'quote_request';

export class AIRecommendationOwnerResolver {
  constructor(
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
    private readonly quoteRequestEvents: QuoteRequestEventReader,
  ) {}

  /**
   * Retorna el scope canónico de un `AiFeatureType`. Si el type no está registrado, lanza
   * `NotFoundError` (defensivo: SEC-02 uniforme). Un type sin mapping en el registry indica
   * inconsistencia interna — se prefiere 404 opaco a 500 revelador (EC-03 documenta 500 como
   * "no debería pasar"; la implementación real degrada a 404 para no filtrar información).
   */
  resolve(type: string): OwnershipScope {
    const scope = FEATURE_SCOPE[type as AiFeatureType];
    if (!scope) throw new NotFoundError('Not found');
    return scope;
  }

  /**
   * `true` si `currentUserId` es dueño legítimo del `parent`. Lanza `NotFoundError` en cualquier
   * caso de mismatch (evita filtrar existencia). El caller debe siempre await el `matches`.
   */
  async matches({ currentUserId, parent }: OwnershipMatchInput): Promise<boolean> {
    const scope = this.resolve(parent.type);
    if (scope === 'event') {
      if (!parent.eventId) return false;
      const ownerId = await this.events.getOwnerId(parent.eventId);
      return ownerId === currentUserId;
    }
    if (scope === 'vendor') {
      if (!parent.vendorProfileId) return false;
      const vendorProfileId = await this.vendors.getVendorProfileIdForUser(currentUserId);
      return vendorProfileId === parent.vendorProfileId;
    }
    if (scope === 'quote_request') {
      if (!parent.quoteRequestId) return false;
      const eventId = await this.quoteRequestEvents.getEventId(parent.quoteRequestId);
      if (!eventId) return false;
      const ownerId = await this.events.getOwnerId(eventId);
      return ownerId === currentUserId;
    }
    return false;
  }
}
