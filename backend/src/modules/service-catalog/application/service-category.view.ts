// Vista de `ServiceCategory` expuesta por el API (US-075). Snake_case en las claves
// del wire — paridad con el resto de responses del proyecto (ADR-API-002). El shape
// es idéntico entre admin y público — el filtro `is_active` lo aplica el UseCase.
import type { ServiceCategory } from '@prisma/client';

export interface ServiceCategoryView {
  id: string;
  code: string;
  label: string;
  description: string | null;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string> | null;
  parent_id: string | null;
  sort_order: number;
  depth_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function toServiceCategoryView(row: ServiceCategory): ServiceCategoryView {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description ?? null,
    name_i18n: (row.nameI18n as Record<string, string>) ?? {},
    description_i18n: (row.descriptionI18n as Record<string, string> | null) ?? null,
    parent_id: row.parentId ?? null,
    sort_order: row.sortOrder,
    depth_level: row.depthLevel,
    is_active: row.isActive,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
