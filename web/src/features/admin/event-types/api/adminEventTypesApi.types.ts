// Tipos de API — admin event types (US-076 / FE-004). Paridad EXACTA con el response
// wire snake_case del backend (`toEventTypeView` en
// `backend/src/modules/event-catalog/application/event-type.view.ts`).
//
// Sin jerarquía (diferencia vs US-075 ServiceCategory) — el listado es plano.

export type EventTypeLocale = 'es-LATAM' | 'es-ES' | 'en' | 'pt';

export interface AdminEventTypeNode {
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

export type AdminEventTypesListDTO = AdminEventTypeNode[];

export interface AdminEventTypesListEnvelope {
  data: AdminEventTypesListDTO;
  meta: { correlationId: string; timestamp?: string };
}

// ── Bodies ─────────────────────────────────────────────────────────────────

export interface CreateEventTypeBodyDTO {
  code: string;
  name_i18n: Record<string, string>;
  description_i18n?: Record<string, string>;
  sort_order?: number;
  reason?: string;
}

export interface UpdateEventTypeBodyDTO {
  name_i18n?: Record<string, string>;
  description_i18n?: Record<string, string>;
  sort_order?: number;
  is_active?: boolean;
  reason?: string;
}

export interface DeleteEventTypeBodyDTO {
  reason: string;
}

export interface AdminEventTypeEnvelope {
  data: AdminEventTypeNode;
  meta: { correlationId: string; timestamp?: string };
}
