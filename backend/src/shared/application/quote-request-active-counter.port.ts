// QuoteRequestActiveCounterPort (US-050 / BE-002). Puerto de conteo lazy de QRs activas por
// (event, service_category). Vive en `src/shared/application/` para poder ser importado por
// módulos sin violar `boundaries/element-types` (ADR-ARCH-001).
//
// El filtro lazy `notExpired` traduce a `expires_at IS NULL OR expires_at > NOW()` (US-050
// DEV-01). Los `activeStatuses` mantienen alineación con el enum físico `QuoteRequestStatus`
// (`sent, viewed, responded`) — ver DEV-02 del execution record.
export interface CountActiveByEventAndCategoryInput {
  eventId: string;
  serviceCategoryId: string;
  activeStatuses: readonly string[];
  notExpired: boolean;
}

export interface QuoteRequestActiveCounterPort {
  countActiveByEventAndCategory(input: CountActiveByEventAndCategoryInput): Promise<number>;
}
