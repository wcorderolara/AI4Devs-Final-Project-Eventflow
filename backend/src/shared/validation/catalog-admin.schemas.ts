// Fragmentos Zod comunes de los DTOs admin de catálogos (`ServiceCategory` US-075 y
// `EventType` US-076). Las invariantes con código estable (INVALID_NAME_I18N, REASON_REQUIRED /
// INVALID_REASON_LENGTH) se validan en UseCase/controller, no aquí.
import { z } from 'zod';

/**
 * `name_i18n` como record<locale, string> no vacío. La invariante "es-LATAM
 * requerido" (Decisión PO D3 + VR-03) se valida en el UseCase con
 * `InvalidNameI18nError` para emitir el código estable `INVALID_NAME_I18N`.
 */
export const CATALOG_NAME_I18N_SCHEMA = z.record(z.string().min(1).max(200));

/** `description_i18n` opcional (Decisión PO D3). */
export const CATALOG_DESCRIPTION_I18N_SCHEMA = z.record(z.string().max(2000));

/** `sort_order` >= 0 integer. */
export const CATALOG_SORT_ORDER_SCHEMA = z.number().int().nonnegative();

/** `reason` opcional en create/update; ≤ 500 chars. */
export const CATALOG_REASON_SCHEMA = z.string().max(500).optional();

/**
 * Body del DELETE: `reason` opcional para que el controller distinga `REASON_REQUIRED`
 * (ausente / vacío) de `INVALID_REASON_LENGTH` (fuera de [10..500]) y emita códigos estables.
 */
export const CatalogDeleteBodySchema = z
  .object({
    reason: CATALOG_REASON_SCHEMA,
  })
  .strict();
