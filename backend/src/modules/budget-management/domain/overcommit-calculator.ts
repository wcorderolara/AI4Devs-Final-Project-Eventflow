// US-038 (PB-P1-022 / BE-001) — Helper puro para el cálculo de overcommit del presupuesto.
// Extiende el contrato server-side de US-035 D4 con:
//   - `summary.overcommitted_amount = max(0, totalCommitted - totalPlanned)`.
//   - `item.over_committed = (item.committed - item.planned) > tolerance` (D4).
//   - `item.overcommitted_amount = max(0, item.committed - item.planned)`.
// Tolerancia adaptativa (D3): `tolerance = 10^(-decimalPlaces)` para monedas con decimales;
// `tolerance = 1` para monedas sin decimales (CLP, JPY). Delegada al llamador vía `tolerance`.
// El helper NO consulta BD, NO formatea, NO conoce catálogos: pura aritmética.
export interface OvercommitInputItem {
  committed: number;
  planned: number;
}

export interface OvercommitInput {
  totalPlanned: number;
  totalCommitted: number;
  items: readonly OvercommitInputItem[];
  tolerance: number;
}

export interface OvercommitItemResult {
  over_committed: boolean;
  overcommitted_amount: number;
}

export interface OvercommitResult {
  summaryOvercommittedAmount: number;
  itemsOvercommit: OvercommitItemResult[];
}

export function calculateOvercommitFields(input: OvercommitInput): OvercommitResult {
  const summaryDelta = input.totalCommitted - input.totalPlanned;
  return {
    summaryOvercommittedAmount: Math.max(0, summaryDelta),
    itemsOvercommit: input.items.map((item) => {
      const itemDelta = item.committed - item.planned;
      return {
        over_committed: itemDelta > input.tolerance,
        overcommitted_amount: Math.max(0, itemDelta),
      };
    }),
  };
}

// Tolerance derivada de `decimalPlaces` con manejo explícito del caso sin decimales.
// Evita inexactitud float de `Math.pow(10, -n)` (§17 Tech Spec risk 3).
export function toleranceFromDecimalPlaces(decimalPlaces: number): number {
  if (decimalPlaces <= 0) return 1;
  // Lookup preciso para los tamaños relevantes de la moneda (0..8 decimales).
  const table = [1, 0.1, 0.01, 0.001, 0.0001, 0.00001, 0.000001, 0.0000001, 0.00000001] as const;
  if (decimalPlaces < table.length) return table[decimalPlaces]!;
  return Number((10 ** -decimalPlaces).toFixed(decimalPlaces));
}
