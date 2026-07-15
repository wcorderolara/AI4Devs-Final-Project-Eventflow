// US-038 (PB-P1-022 / BE-002) — Adapter estático de `CurrencyReadPort`.
//
// Contexto: el schema Prisma expone `CurrencyCode` como enum (GTQ, EUR, MXN, COP, USD) — no
// existe tabla `Currency` con `decimal_places`. Todas las monedas del enum MVP usan 2
// decimales, así que el adapter estático es la fuente autoritativa mientras no se materialice
// la tabla. Preserva la hexagonalidad: swap por `PrismaCurrencyReadAdapter` cuando la tabla
// exista es un único cambio de wiring.
//
// El mapa se mantiene deliberadamente MVP-only. Códigos fuera del mapa retornan `null` para
// disparar el fallback defensivo D3 en el use case (EC-05, VR-02).
import type { CurrencyDecimalPlaces, CurrencyReadPort } from '../ports/currency-read.port.js';

// Referencia D3: USD/EUR/MXN/COP/GTQ ⇒ 2. CLP/JPY ⇒ 0 (mantenido para forward-compat cuando
// el enum se amplíe; no participan hoy porque el enum MVP no los incluye).
const DECIMAL_PLACES_BY_CODE: Readonly<Record<string, number>> = Object.freeze({
  GTQ: 2,
  EUR: 2,
  MXN: 2,
  COP: 2,
  USD: 2,
  CLP: 0,
  JPY: 0,
});

export class StaticCurrencyReadAdapter implements CurrencyReadPort {
  async findByCode(code: string): Promise<CurrencyDecimalPlaces | null> {
    const normalized = code.toUpperCase();
    const decimalPlaces = DECIMAL_PLACES_BY_CODE[normalized];
    if (decimalPlaces === undefined) return null;
    return { code: normalized, decimal_places: decimalPlaces };
  }
}
