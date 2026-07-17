// Use case — Comparador de Quotes por categoría (US-057 / BE-004).
// AC-01..AC-03 + EC-01..EC-04 + AUTH-TS-01..05. Sólo lectura (sin side-effects).
//
// Reglas invariantes:
//   - `categoryCode` es requerido (D1 / EC-01) → `400 INVALID_FILTERS` con `details`.
//   - Categoría debe existir con `is_active=true` (EC-02) → `400 INVALID_CATEGORY`.
//   - Ownership del evento uniforme (EC-03 / SEC-03) → `404 EVENT_NOT_FOUND` para inexistente o ajeno.
//   - Excluye `draft` en el filtro de status (D2 + DEV-01).
//   - Orden estable: `is_preferred DESC, status (activos primero), total_price ASC` (D5, AC-01).
import type { QuoteRepository } from '../ports/quote-flow.repositories.js';
import type {
  EventAccessReader,
  ServiceCategoryReader,
} from '../../../shared/access/readers.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { CompareQuotesQuery } from '../dto/compare-quotes.us057.query.js';
import type { CompareQuotesResponse } from '../dto/compare-quotes.us057.response.js';
import type { QuoteUseCaseContext } from './context.js';
import { EventNotFoundError } from '../domain/us049.errors.js';
import {
  CompareQuotesCategoryRequiredError,
  CompareQuotesInvalidCategoryError,
} from '../domain/us057.errors.js';
import { toComparableQuoteItem } from './compare-quotes.us057.mapper.js';

export class CompareQuotesUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly events: EventAccessReader,
    private readonly categories: ServiceCategoryReader,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(
    userId: string,
    eventId: string,
    query: CompareQuotesQuery,
    ctx: QuoteUseCaseContext = {},
  ): Promise<CompareQuotesResponse> {
    // EC-01 / D1: `categoryCode` requerido antes de cualquier lookup para evitar leak de
    // información de existencia del evento por diferencias de latencia.
    const categoryCode = query.categoryCode;
    if (categoryCode === undefined || categoryCode === '') {
      throw new CompareQuotesCategoryRequiredError();
    }

    // EC-03 / SEC-03: 404 uniforme (event ajeno o inexistente indistinguible).
    const event = await this.events.findOwnedEvent(eventId, userId);
    if (!event) throw new EventNotFoundError();

    // EC-02: categoría inexistente/inactiva → 400 INVALID_CATEGORY.
    const category = await this.categories.findActiveByCode(categoryCode);
    if (!category) throw new CompareQuotesInvalidCategoryError(categoryCode);

    // AC-01..AC-03: repositorio devuelve items ya ordenados (§7 Repository).
    const rows = await this.quotes.findComparableByEventAndCategory({
      eventId: event.id,
      serviceCategoryId: category.id,
    });

    this.logger.emit('quote_compare.requested', {
      correlationId: ctx.correlationId,
      actorId: userId,
      eventId: event.id,
      serviceCategoryId: category.id,
      count: rows.length,
    });

    return {
      category: { code: category.code, name: category.label },
      currency_code: event.currency,
      items: rows.map(toComparableQuoteItem),
    };
  }
}
