// Puertos de persistencia de booking-intent (US-096 / BE-006; extendido US-039 / BE-004).
import type { Prisma } from '@prisma/client';
import type { BookingIntentView } from '../domain/booking-intent.js';

export interface CreateBookingIntentData {
  quoteId: string;
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string;
  // US-060 (PB-P1-036 / BE-003): organizer creador del intent — persistido en
  // `booking_intents.created_by` para auditoría directa sin depender del join
  // `quotes → quote_requests → events`.
  createdBy: string;
}

/**
 * US-039 (PB-P1-023): shape que el sync handler necesita del BookingIntent con lock pesimista.
 * Incluye el monto/moneda del Quote (materialización mínima) y la moneda del Event para la
 * verificación de currency mismatch (defensa profunda).
 */
export interface BookingIntentSyncSnapshot {
  id: string;
  eventId: string;
  serviceCategoryId: string;
  status: 'pending' | 'confirmed_intent' | 'cancelled';
  quote: { amount: number; currency: string };
  event: { currency: string; budgetId: string | null };
  serviceCategoryCode: string;
  committedSyncedAt: Date | null;
  committedSyncedAmount: number | null;
}

export interface BookingIntentRepository {
  /**
   * Crea un `BookingIntent` con `status='pending'`. Si se provee `tx`, la escritura participa
   * en esa transacción (US-060: atomicidad accept-quote + insert-booking-intent + fan-out de
   * notificaciones dentro de un único `prisma.$transaction`).
   */
  create(data: CreateBookingIntentData, tx?: Prisma.TransactionClient): Promise<BookingIntentView>;
  findById(id: string): Promise<BookingIntentView | null>;
  /**
   * Cambia el estado a `confirmed_intent`. Si se provee `tx`, la escritura participa en esa
   * transacción (US-039: sync de committed en la misma tx del invocador).
   *
   * US-063 (PB-P1-037 / BE-004): `disclaimer` opcional. Cuando se provee, persiste
   * `disclaimer_accepted_at_confirm` + `disclaimer_copy_version_confirm` en la misma UPDATE
   * (audit bilateral — Decisión D2 + D7). Sin el argumento (path legacy US-096) el UPDATE no
   * toca esas columnas y su valor se preserva NULL — usado por tests unitarios que no ejercen
   * el flujo bilateral completo.
   */
  confirm(
    id: string,
    now: Date,
    tx?: Prisma.TransactionClient,
    disclaimer?: { copyVersion: string },
  ): Promise<BookingIntentView>;
  cancel(
    /**
     * US-062 (BE-001): `reason` es `string | null` para permitir cancelar sin razón (AC-03).
     * El adapter Prisma persiste `null` cuando llega `null`, o el string trimmed cuando llega
     * texto. Legacy US-096 pasaba string requerido — se mantiene compat en el UC US-062 que
     * normaliza el trim y null-coalescing.
     */
    input: { id: string; now: Date; cancelledBy: string; reason: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<BookingIntentView>;

  /**
   * US-039 (PB-P1-023 / BE-004): lee el intent con `SELECT FOR UPDATE` sobre `booking_intents`
   * y devuelve el snapshot necesario para el sync (quote amount/currency, event currency,
   * budget id, código de categoría, estado de idempotencia). Retorna `null` si no existe.
   */
  findByIdForSync(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<BookingIntentSyncSnapshot | null>;

  /**
   * US-039 (PB-P1-023 / BE-004): marca el intent como sincronizado (`committed_synced_at`,
   * `committed_synced_amount`). Idempotencia (D1): un segundo apply lee `committed_synced_at`
   * no-null y hace skip antes de invocar este método.
   */
  markCommittedSynced(
    tx: Prisma.TransactionClient,
    args: { id: string; at: Date; amount: number },
  ): Promise<void>;

  /**
   * US-039 (PB-P1-023 / BE-004): resetea a NULL `committed_synced_at`/`committed_synced_amount`
   * tras el revert.
   */
  clearCommittedSync(
    tx: Prisma.TransactionClient,
    args: { id: string },
  ): Promise<void>;
}

/** Contexto de un Quote leído directamente (sin importar quote-flow): para crear BookingIntent. */
export interface AcceptedQuoteContext {
  quoteId: string;
  quoteRequestId: string;
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil: Date | null;
}

export interface QuoteContextReader {
  findQuoteContext(quoteId: string): Promise<AcceptedQuoteContext | null>;
}
