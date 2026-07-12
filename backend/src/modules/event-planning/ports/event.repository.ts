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

/** US-015: proyección mínima de candidatos a auto-completar (id + fecha del evento). */
export interface ExpiredActiveEventRow {
  id: string;
  eventDate: Date;
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
  /**
   * US-015: eventos elegibles para auto-completar. Filtra `status='active'`, `deletedAt IS NULL`
   * y `eventDate <= now - 2 días`. El caller (use case) calcula `now - 2 días` y lo pasa como
   * `expiredBefore`. Proyecta solo `{ id, eventDate }` para eficiencia y para permitir que el
   * planner use el índice parcial `idx_events_auto_complete_candidates` (docs/18).
   */
  findExpiredActive(expiredBefore: Date): Promise<ExpiredActiveEventRow[]>;
  /**
   * US-015: transición atómica `active → completed` con `autoCompleted=true`, `completedAt=...`
   * y filtro defensivo (`status='active'` + `deletedAt IS NULL`) para evitar races. Devuelve el
   * número de filas afectadas (0 si otro proceso ya completó o canceló el evento).
   */
  markCompleted(
    eventId: string,
    fields: { autoCompleted: boolean; completedAt: Date },
  ): Promise<{ affected: number }>;
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
