// US-028 (PB-P1-018 / BE-005) — Puerto para leer un evento propio DENTRO de una transacción,
// aplicando un lock advisory por `event_id` para evitar carreras con cambios de estado
// (EC-08 / CONC-01). Distinto del reader de US-031 que corre fuera de la transacción.
import type { Prisma } from '@prisma/client';

export type OwnedEventLanguage = 'es_LATAM' | 'es_ES' | 'pt' | 'en';

export interface OwnedEventForCreate {
  id: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  language: OwnedEventLanguage;
  deletedAt: Date | null;
}

export interface OwnedEventForCreateReader {
  /**
   * Obtiene ownership + estado + idioma del evento dentro de la transacción `tx`, adquiriendo
   * un `pg_advisory_xact_lock` por `event_id`. Devuelve `null` si el evento no existe o no
   * pertenece al actor (no-revelación → 404). Si el evento existe pero está soft-deleted,
   * `deletedAt !== null` — el use case lo mapea también a `NotFoundError` (SEC-04).
   */
  findOwnedForUpdate(
    tx: Prisma.TransactionClient,
    eventId: string,
    ownerUserId: string,
  ): Promise<OwnedEventForCreate | null>;
}
