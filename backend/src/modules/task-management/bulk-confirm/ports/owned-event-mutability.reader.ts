// US-031 (PB-P1-017 / BE-003) — Puerto de lectura para validar ownership + mutabilidad del evento
// (SEC-01 + EC-09). Retorna `null` si el evento no existe o pertenece a otro actor (no-revelación
// → 404 global). Retorna la mutabilidad efectiva (status + soft-delete) para que el use case
// decida entre `EventNotMutableError` (409 EVENT_NOT_MUTABLE) y proceder con el batch.

export interface OwnedEventMutability {
  id: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  mutable: boolean;
  /** Motivo devuelto por el reader cuando `mutable=false`, para el log estructurado. */
  immutableReason?: 'cancelled' | 'completed' | 'deleted';
}

export interface OwnedEventMutabilityReader {
  find(eventId: string, ownerUserId: string): Promise<OwnedEventMutability | null>;
}
