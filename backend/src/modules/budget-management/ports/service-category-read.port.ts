// US-036 (PB-P1-020 / BE-002, R1) — Port de lectura de ServiceCategory desde budget-management.
// Alineado con el patrón US-019 (`ai-generation.service.ts`) que valida contra whitelist activa.
// R1: `BudgetItem.categoryCode` es string libre; la validación es por whitelist en runtime.
// US-037 (PB-P1-021 / BE-002): extendido con findManyByCodes para verificar D6 (CATEGORY_INACTIVE).
export interface ServiceCategoryRow {
  code: string;
  name: string;
  isActive: boolean;
}

export interface ServiceCategoryReadPort {
  /**
   * Retorna el set de `code` de todas las `ServiceCategory` activas (is_active = true) y no
   * soft-deleted (deleted_at IS NULL). Usado por Create/UpdateBudgetItemUseCase para validar
   * `category_code` sin acoplar a la FK (que no existe en `BudgetItem`).
   */
  getActiveCodes(): Promise<Set<string>>;

  /**
   * Resuelve `code → id` para una ServiceCategory activa. Retorna `null` si no existe o está
   * inactiva/soft-deleted. Usado por DeleteBudgetItemUseCase para el cross-module check con
   * BookingIntent.pending.
   */
  findIdByCode(code: string): Promise<string | null>;

  /**
   * US-037 (PB-P1-021 / D6): resuelve un conjunto de `code` en su fila con `isActive`. Incluye
   * también las inactivas (para que el use case reporte `CATEGORY_INACTIVE` con lista + nombre).
   * Excluye soft-deleted (deleted_at IS NOT NULL). El caller compara `codes` provistos vs
   * `rows.map(code)` para detectar faltantes (⇒ PAYLOAD_INVALID) y `rows.filter(!isActive)`
   * para detectar inactivas (⇒ CATEGORY_INACTIVE).
   */
  findManyByCodes(codes: string[]): Promise<ServiceCategoryRow[]>;
}
