// US-028 (PB-P1-018 / BE-002) — Port de lectura del catálogo de ServiceCategory activo.
// Introducido por US-028 y reutilizable por US-019/US-020 (prefill de categorías). El adapter
// vive en `infrastructure/adapters/prisma-service-category-read.adapter.ts`. La firma acepta
// `tx` opcional para participar en la transacción del use case (BE-005).
import type { Prisma } from '@prisma/client';

export interface ServiceCategoryRow {
  code: string;
  label: string;
}

export interface ServiceCategoryReadPort {
  /**
   * Devuelve la fila del catálogo si `code` existe y `is_active=true`, ó `null` en cualquier otro
   * caso (inexistente, inactiva, borrada lógicamente). Nunca lanza excepciones de dominio; la
   * decisión de mapear a `CategoryNotAvailableError` la toma el caller.
   */
  findActiveByCode(
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ServiceCategoryRow | null>;
}
