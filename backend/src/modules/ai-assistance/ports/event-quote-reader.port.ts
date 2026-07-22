// Consumer-owned port — lectura de quotes elegibles para US-022 (PB-P2-001 / BE-004).
// Preserva el boundary ADR-ARCH-001: el use case NO importa el `QuoteRepository` de `quote-flow`.
// El composition root (`ai.routes.ts`) adapta el `PrismaQuoteRepository` a este contrato — es la
// misma excepción de wire cross-module de US-037/US-039.

export interface EventQuoteEligibleItem {
  quoteId: string;
  status: string;
  totalPrice: string;
  breakdown: unknown;
  validUntil: string | null;
  conditions: string | null;
  isPreferred: boolean;
  vendor: {
    businessName: string;
    ratingAvg: number | null;
  };
}

export interface EventQuoteReader {
  /**
   * Devuelve las quotes comparables del evento en la categoría, siguiendo el mismo criterio del
   * comparador de US-057 (excluye `draft`). El use case filtra downstream a los estados activos
   * (`sent`, `accepted`) para el preflight ≥ 2.
   */
  findComparableByEventAndCategory(input: {
    eventId: string;
    serviceCategoryId: string;
  }): Promise<EventQuoteEligibleItem[]>;
}
