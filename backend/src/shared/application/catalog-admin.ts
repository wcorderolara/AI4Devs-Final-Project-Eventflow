// Reglas comunes del CRUD admin de catálogos (`ServiceCategory` US-075 y `EventType` US-076).
// Cada módulo conserva sus use cases (guards, jerarquía, snapshot de auditoría); aquí sólo
// vive lo idéntico: invariante es-LATAM, denormalización legacy y detección de reactivate.
import type { Prisma } from '@prisma/client';
import { InvalidNameI18nError } from '../domain/errors/catalog-admin.errors.js';

export interface CatalogAdminCtx {
  correlationId?: string;
}

type I18nRecord = Record<string, string>;

/** Invariante D3/VR-03: `name_i18n['es-LATAM']` presente y no vacío. */
export function assertNameI18nHasEsLatam(nameI18n: Record<string, unknown> | undefined): void {
  if (!nameI18n || typeof nameI18n !== 'object') throw new InvalidNameI18nError();
  const val = (nameI18n as Record<string, unknown>)['es-LATAM'];
  if (typeof val !== 'string' || val.trim().length === 0) {
    throw new InvalidNameI18nError();
  }
}

/**
 * Columnas i18n de un INSERT. `label` y `description` se denormalizan desde `es-LATAM` para
 * los callers legacy que proyectan `label` directo (sin resolver locale).
 */
export function catalogI18nColumns(body: { name_i18n: I18nRecord; description_i18n?: I18nRecord }) {
  return {
    label: body.name_i18n['es-LATAM']!,
    description: body.description_i18n?.['es-LATAM'] ?? null,
    nameI18n: body.name_i18n as Prisma.InputJsonObject,
    descriptionI18n: body.description_i18n
      ? (body.description_i18n as Prisma.InputJsonObject)
      : undefined,
  };
}

/** Columnas i18n de un PATCH: sólo las presentes, re-sincronizando `label`/`description`. */
export function catalogI18nPatch(body: { name_i18n?: I18nRecord; description_i18n?: I18nRecord }): {
  nameI18n?: Prisma.InputJsonObject;
  label?: string;
  descriptionI18n?: Prisma.InputJsonObject;
  description?: string | null;
} {
  return {
    ...(body.name_i18n !== undefined && {
      nameI18n: body.name_i18n as Prisma.InputJsonObject,
      label: body.name_i18n['es-LATAM']!,
    }),
    ...(body.description_i18n !== undefined && {
      descriptionI18n: body.description_i18n as Prisma.InputJsonObject,
      description: body.description_i18n['es-LATAM'] ?? null,
    }),
  };
}

/** `is_active: false → true` se audita como `reactivate`; cualquier otro cambio, `update`. */
export function isReactivation(wasActive: boolean, isActive: boolean | undefined): boolean {
  return !wasActive && (isActive ?? wasActive);
}

/** Campos del PATCH para `metadata.patched_fields` (sin `reason`). */
export function patchedFields(body: object): string[] {
  return Object.keys(body).filter((k) => k !== 'reason');
}
