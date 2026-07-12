// Puertos de persistencia de event-planning (US-095 / BE-003). Module-local: solo este módulo
// los consume. Las queries son owner-scoped (control de seguridad, no solo persistencia — SEC-002).
import type { CreateEventData, EventView, UpdateEventData } from '../domain/event.js';
import type { EventStatusValue } from '../domain/event-lifecycle.js';
import type { EventTypeCode } from '../domain/event-type-codes.js';
import type { EventSortOption } from '../dto/list-events.query.js';

export interface EventListFilters {
  status?: EventStatusValue;
  eventTypeCode?: EventTypeCode;
  eventDateFrom?: string; // YYYY-MM-DD
  eventDateTo?: string; // YYYY-MM-DD
}

export interface EventListOptions {
  page: number;
  pageSize: number;
  sort: EventSortOption;
}

export interface EventRepository {
  create(data: CreateEventData): Promise<EventView>;
  /** Devuelve el evento SOLO si pertenece al owner y NO está soft-deleted; null si no (masked 404). */
  findByIdForOwner(eventId: string, ownerId: string): Promise<EventView | null>;
  listByOwner(
    ownerId: string,
    filters: EventListFilters,
    options: EventListOptions,
  ): Promise<{ items: EventView[]; total: number }>;
  update(eventId: string, patch: UpdateEventData): Promise<EventView>;
  transitionStatus(eventId: string, nextStatus: EventStatusValue): Promise<EventView>;
  /** US-012: soft delete (setea `deleted_at`/`deleted_by`). Nunca hard delete (BR-EVENT-010). */
  softDelete(eventId: string, deletedBy: string): Promise<void>;
}

export interface EventTypeOptionView {
  code: string;
  label: string;
}

export interface LocationOptionView {
  id: string;
  country: string;
  region: string | null;
  city: string | null;
}

export interface EventTypeRepository {
  /** Devuelve el id del EventType activo por su código, o null si no existe/está inactivo. */
  findActiveIdByCode(code: string): Promise<string | null>;
  /** US-009: catálogo de tipos de evento activos (para el asistente de creación). */
  findActive(): Promise<EventTypeOptionView[]>;
}

export interface LocationRepository {
  /** ¿Existe una Location activa (no soft-deleted) con ese id? */
  existsActive(id: string): Promise<boolean>;
  /** US-009: catálogo de ubicaciones disponibles (no soft-deleted). */
  listActive(): Promise<LocationOptionView[]>;
}
