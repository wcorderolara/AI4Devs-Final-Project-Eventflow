// Vista de `EventType` expuesta por el API (US-076). Snake_case en las claves del
// wire — paridad con el resto de responses (ADR-API-002). El shape es idéntico
// entre admin y público — el filtro `is_active` lo aplica el UseCase.
//
// La vista es un SUPERSET del contrato previo `{code, label}` de US-009. Los callers
// legacy (`EventTypeOption` en `web/src/features/events/api/eventsApi.types.ts`) siguen
// deserializando correctamente porque solo proyectan `code` y `label` — los campos
// adicionales se ignoran.
import type { EventType } from '@prisma/client';

export interface EventTypeView {
  id: string;
  code: string;
  label: string;
  description: string | null;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string> | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function toEventTypeView(row: EventType): EventTypeView {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description ?? null,
    name_i18n: (row.nameI18n as Record<string, string>) ?? {},
    description_i18n: (row.descriptionI18n as Record<string, string> | null) ?? null,
    sort_order: row.sortOrder,
    is_active: row.isActive,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
