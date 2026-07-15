// US-038 (PB-P1-022 / BE-002) — Port hexagonal para lookup de `decimal_places` por currency.
// Habilita el cálculo de la tolerancia adaptativa (D3) sin acoplar el use case a la fuente
// concreta (enum estático, tabla Prisma, o servicio externo). Devuelve `null` cuando el código
// no está catalogado: el use case aplica fallback defensivo (decimal_places=2) y loguea warning
// `currency.decimal_places.missing` (EC-05, VR-02).
export interface CurrencyDecimalPlaces {
  code: string;
  decimal_places: number;
}

export interface CurrencyReadPort {
  findByCode(code: string): Promise<CurrencyDecimalPlaces | null>;
}
