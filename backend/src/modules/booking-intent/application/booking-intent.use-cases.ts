// Use cases de BookingIntent — get/confirm/cancel (US-096 / BE-007). Flujo simulado.
// US-039 (PB-P1-023): Confirm/Cancel envuelven la escritura + el sync `BudgetItem.committed` en
// una `prisma.$transaction` compartida cuando se inyecta `budgetSync` y `transactionRunner`.
// US-060 (PB-P1-036 / BE-003): la creación del BookingIntent se movió a
// `CreateBookingIntentUs060UseCase` — endpoint atómico que fusiona aceptación de Quote +
// creación del intent + fan-out de notificaciones dentro de una única `prisma.$transaction`
// (D1..D5). El use case original (US-096) queda retirado del wiring — DEV-03 del execution record.
// US-061 (PB-P1-036 / BE-002): `ConfirmBookingIntentUseCase` extendido con (a) idempotencia
// explícita cuando `status='confirmed_intent'` (AC-03), (b) errores tipados de dominio
// (`BookingIntentNotFoundError`/`BookingIntentNotConfirmableError` — DEV-03 US-061), (c) fan-out
// atómico de 2 notifs al organizer via `BookingEventNotifierPort` (7º evento del type común), y
// (d) warn `budget.committed_exceeds_planned` cuando la suma resultante supera `Budget.totalPlanned`.
import { Prisma } from '@prisma/client';
import type { BookingIntentRepository } from '../ports/booking-intent.repository.js';
import type {
  BudgetCommittedSyncPort,
} from '../ports/budget-committed-sync.port.js';
import type { BookingEventNotifierPort } from '../ports/quote-event-notifier.port.js';
import { NoopBudgetCommittedSync } from '../ports/budget-committed-sync.port.js';
import type { EventAccessReader, VendorProfileReader } from '../../../shared/access/readers.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { BookingIntentView } from '../domain/booking-intent.js';
import { canCancelBooking, canConfirmBooking, isAlreadyConfirmed } from '../domain/booking-policies.js';
import { requireEventOwner, requireVendorProfileId } from '../../../shared/access/authz.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import {
  BookingIntentNotFoundError,
  BookingIntentNotConfirmableError,
} from '../domain/us061.errors.js';
import { BookingIntentNotCancellableError } from '../domain/us062.errors.js';

export interface BookingUseCaseContext {
  correlationId?: string;
}

/** Autoriza acceso a un BookingIntent: organizer owner O vendor asignado; si no, 404. */
async function authorizeBookingAccess(
  bi: BookingIntentView,
  userId: string,
  role: string,
  events: EventAccessReader,
  vendors: VendorProfileReader,
): Promise<void> {
  if (role === 'organizer') {
    await requireEventOwner(events, bi.eventId, userId);
    return;
  }
  if (role === 'vendor') {
    const vpId = await requireVendorProfileId(vendors, userId);
    if (bi.vendorProfileId !== vpId) throw new NotFoundError('Not found');
    return;
  }
  throw new NotFoundError('Not found');
}

export class GetBookingIntentUseCase {
  constructor(
    private readonly bookingIntents: BookingIntentRepository,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
  ) {}

  async execute(userId: string, role: string, bookingIntentId: string): Promise<BookingIntentView> {
    const bi = await this.bookingIntents.findById(bookingIntentId);
    if (!bi) throw new NotFoundError('Booking intent not found');
    await authorizeBookingAccess(bi, userId, role, this.events, this.vendors);
    return bi;
  }
}

/** US-039: runner mínimo para envolver el confirm/cancel + sync en una sola transacción. */
export interface TransactionRunner {
  run<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

export class ConfirmBookingIntentUseCase {
  private readonly budgetSync: BudgetCommittedSyncPort;
  private readonly tx: TransactionRunner | null;
  private readonly bookingEvents: BookingEventNotifierPort | null;

  constructor(
    private readonly bookingIntents: BookingIntentRepository,
    private readonly vendors: VendorProfileReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    options: {
      budgetSync?: BudgetCommittedSyncPort;
      transactionRunner?: TransactionRunner;
      /**
       * US-061 (PB-P1-036 / BE-001+BE-002): fan-out atómico al organizer del evento con
       * `event='booking_intent.confirmed'`. Cuando se inyecta, emite 2 Notifications (in_app +
       * email_simulated) dentro de la MISMA transacción del `applyOnConfirm` (un fallo revierte
       * intent, committed y notifs juntas). Sin adapter ⇒ el UC preserva su comportamiento
       * legacy US-096 (sin notifs) — usado en tests unitarios que no requieren fan-out.
       */
      bookingEvents?: BookingEventNotifierPort;
    } = {},
  ) {
    this.budgetSync = options.budgetSync ?? NoopBudgetCommittedSync;
    this.tx = options.transactionRunner ?? null;
    this.bookingEvents = options.bookingEvents ?? null;
  }

  async execute(userId: string, bookingIntentId: string, ctx: BookingUseCaseContext = {}): Promise<BookingIntentView> {
    const bi = await this.bookingIntents.findById(bookingIntentId);
    if (!bi) throw new BookingIntentNotFoundError();
    const vpId = await requireVendorProfileId(this.vendors, userId);
    if (bi.vendorProfileId !== vpId) throw new BookingIntentNotFoundError();

    // US-061 AC-03: idempotencia — si ya está `confirmed_intent` devolvemos el estado actual sin
    // ejecutar side-effects (no re-actualiza committed, no re-emite notifs). El sync de US-039
    // también es idempotente (via `committed_synced_at`), pero cortar aquí evita abrir la tx.
    if (isAlreadyConfirmed(bi.status)) {
      return bi;
    }
    if (!canConfirmBooking(bi.status)) {
      throw new BookingIntentNotConfirmableError(bi.status);
    }

    const view = this.tx
      ? await this.tx.run(async (tx) => {
          // US-061 QA-005 concurrencia: `SELECT ... FOR UPDATE` sobre la fila del intent al inicio
          // de la tx serializa 2 requests simultáneas. La segunda ve el `confirmed_at` ya escrito
          // por la primera y hace early return SIN re-ejecutar apply ni fan-out — evita doble
          // notif organizer (idempotencia real end-to-end, no sólo del sync US-039).
          const lockedRows = await tx.$queryRaw<Array<{ confirmed_at: Date | null; status: string }>>(
            Prisma.sql`SELECT confirmed_at, status
                         FROM booking_intents
                        WHERE id = ${bookingIntentId}::uuid
                        FOR UPDATE`,
          );
          const locked = lockedRows[0];
          if (locked && (locked.confirmed_at !== null || locked.status === 'confirmed_intent')) {
            // Otro POST concurrente ya confirmó el intent — devolvemos snapshot actualizado sin
            // side-effects. `findById` lee fuera del lock (consistente porque estamos dentro de
            // la misma tx y la fila ya está confirmada).
            const already = await this.bookingIntents.findById(bookingIntentId);
            return already ?? bi;
          }

          const v = await this.bookingIntents.confirm(bookingIntentId, this.clock.now(), tx);
          await this.budgetSync.applyOnConfirm({ bookingIntentId, tx, correlationId: ctx.correlationId });

          // US-061 BE-002: fan-out atómico de 2 notifs al organizer + warn `budget.committed_exceeds_planned`
          // — se ejecutan en la MISMA tx del sync para que un fallo revierta intent + committed +
          // notifs. Ambos side-effects delegan a helpers (`applyOrganizerNotification` /
          // `emitBudgetExceedsPlannedWarnIfApplicable`) que hacen su propio lookup Prisma sobre
          // el `tx` — evitan reabrir queries innecesarias en el path legacy US-096 sin adapter.
          if (this.bookingEvents) {
            await applyOrganizerNotification({
              tx,
              bookingIntent: v,
              bookingEvents: this.bookingEvents,
              correlationId: ctx.correlationId,
            });
          }
          await emitBudgetExceedsPlannedWarnIfApplicable({
            tx,
            bookingIntent: v,
            logger: this.logger,
            correlationId: ctx.correlationId,
          });
          return v;
        })
      : await this.bookingIntents.confirm(bookingIntentId, this.clock.now());
    this.logger.emit('booking_intent.confirmed', { correlationId: ctx.correlationId, actorId: userId, bookingIntentId });
    return view;
  }
}

/**
 * US-061 BE-002/BE-004: emite `event='booking_intent.confirmed'` al organizer dueño del evento
 * dentro de la transacción upstream. Payload contiene identificadores + monto/moneda del quote
 * para que el organizer pueda pintar el resumen sin re-consultar. Look-ups usan el `tx` de la
 * transacción (SELECT paralelos consistentes con el snapshot del intent).
 */
async function applyOrganizerNotification(args: {
  tx: Prisma.TransactionClient;
  bookingIntent: BookingIntentView;
  bookingEvents: BookingEventNotifierPort;
  correlationId?: string;
}): Promise<void> {
  const { tx, bookingIntent, bookingEvents, correlationId } = args;
  // Lookup mínimo: organizer del evento + total_price/currency del quote + quote_request_id.
  const [event, quote] = await Promise.all([
    tx.event.findUnique({
      where: { id: bookingIntent.eventId },
      select: { userId: true, currency: true },
    }),
    tx.quote.findUnique({
      where: { id: bookingIntent.quoteId },
      select: { amount: true, currency: true, quoteRequestId: true },
    }),
  ]);
  if (!event || !quote) {
    // Defensa profunda: si el evento o el quote se borraron entre la lectura del intent y este
    // paso, el rollback de la tx dejará todo en su estado previo. Un miss aquí es un estado
    // corrupto — el error handler mapea a 500/404 según el caller upstream.
    throw new BookingIntentNotFoundError();
  }
  await bookingEvents.emit({
    recipientUserId: event.userId,
    eventName: 'booking_intent.confirmed',
    payload: {
      booking_intent_id: bookingIntent.id,
      quote_id: bookingIntent.quoteId,
      quote_request_id: quote.quoteRequestId,
      event_id: bookingIntent.eventId,
      vendor_profile_id: bookingIntent.vendorProfileId,
      total_price: quote.amount.toString(),
      currency_code: event.currency,
    },
    tx,
    quoteId: bookingIntent.quoteId,
    correlationId,
  });
}

/**
 * US-061 BE-004 (EC-04): tras aplicar el sync (US-039), verifica si la suma de
 * `sum(BudgetItem.committed)` para el `Budget` del evento supera `Budget.totalPlanned` y emite
 * un `warn` estructurado sin bloquear el flujo (BR-BUDGET-004). El dashboard del organizer
 * consume ese log/estado para pintar el aviso. Log tolerante: si el Budget no existe (caso raro
 * porque US-039 lo auto-crea), no emite nada.
 */
async function emitBudgetExceedsPlannedWarnIfApplicable(args: {
  tx: Prisma.TransactionClient;
  bookingIntent: BookingIntentView;
  logger: DomainEventLogger;
  correlationId?: string;
}): Promise<void> {
  const { tx, bookingIntent, logger, correlationId } = args;
  const budget = await tx.budget.findFirst({
    where: { eventId: bookingIntent.eventId },
    select: { id: true, totalPlanned: true, items: { select: { amountCommitted: true } } },
  });
  if (!budget) return;
  const totalCommitted = budget.items.reduce<Prisma.Decimal>(
    (acc, item) => acc.plus(item.amountCommitted),
    new Prisma.Decimal(0),
  );
  if (totalCommitted.greaterThan(budget.totalPlanned)) {
    logger.emit('budget.committed_exceeds_planned', {
      correlationId,
      budgetId: budget.id,
      bookingIntentId: bookingIntent.id,
      eventId: bookingIntent.eventId,
      totalCommitted: totalCommitted.toString(),
      totalPlanned: budget.totalPlanned.toString(),
    });
  }
}

export class CancelBookingIntentUseCase {
  private readonly budgetSync: BudgetCommittedSyncPort;
  private readonly tx: TransactionRunner | null;
  private readonly bookingEvents: BookingEventNotifierPort | null;

  constructor(
    private readonly bookingIntents: BookingIntentRepository,
    private readonly events: EventAccessReader,
    private readonly vendors: VendorProfileReader,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    options: {
      budgetSync?: BudgetCommittedSyncPort;
      transactionRunner?: TransactionRunner;
      /**
       * US-062 (PB-P1-036 / BE-002+BE-003): fan-out atómico a la contraparte del actor
       * (organizer ⇄ vendor) con `event='booking_intent.cancelled'`. Cuando se inyecta, emite
       * 2 Notifications (in_app + email_simulated) dentro de la MISMA transacción del
       * `revertOnCancel` — un fallo revierte intent, committed y notifs juntas. Sin adapter ⇒
       * path legacy US-096 sin notifs.
       */
      bookingEvents?: BookingEventNotifierPort;
    } = {},
  ) {
    this.budgetSync = options.budgetSync ?? NoopBudgetCommittedSync;
    this.tx = options.transactionRunner ?? null;
    this.bookingEvents = options.bookingEvents ?? null;
  }

  async execute(
    userId: string,
    role: string,
    bookingIntentId: string,
    reason: string | null,
    ctx: BookingUseCaseContext = {},
  ): Promise<BookingIntentView> {
    const bi = await this.bookingIntents.findById(bookingIntentId);
    if (!bi) throw new BookingIntentNotFoundError();
    await authorizeBookingAccessOr404(bi, userId, role, this.events, this.vendors);
    if (!canCancelBooking(bi.status)) throw new BookingIntentNotCancellableError(bi.status);

    // US-062 D3 / AC-03: `reason` opcional. La cadena vacía tras trim se persiste como `null`.
    const trimmedReason = reason?.trim() ?? '';
    const persistedReason: string | null = trimmedReason.length > 0 ? trimmedReason : null;
    const wasConfirmed = bi.status === 'confirmed_intent';

    const now = this.clock.now();
    const view = this.tx
      ? await this.tx.run(async (tx) => {
          // US-062 QA-005 concurrencia: `SELECT ... FOR UPDATE` sobre la fila del intent al inicio
          // de la tx serializa 2 requests simultáneas. La segunda ve el `cancelled_at` ya escrito
          // por la primera y lanza `BookingIntentNotCancellableError` con `current_status='cancelled'`
          // (DEV-05 US-062 — cancel NO es idempotente en el contrato §7, a diferencia del confirm).
          const lockedRows = await tx.$queryRaw<Array<{ cancelled_at: Date | null; status: string }>>(
            Prisma.sql`SELECT cancelled_at, status
                         FROM booking_intents
                        WHERE id = ${bookingIntentId}::uuid
                        FOR UPDATE`,
          );
          const locked = lockedRows[0];
          if (locked && (locked.cancelled_at !== null || locked.status === 'cancelled')) {
            throw new BookingIntentNotCancellableError(locked.status);
          }

          const v = await this.bookingIntents.cancel(
            { id: bookingIntentId, now, cancelledBy: userId, reason: persistedReason},
            tx,
          );
          if (wasConfirmed) {
            // US-039 revert handler es idempotente (`committed_synced_at` no-null ⇒ revert; null
            // ⇒ skip). El underflow guard vive dentro del handler decrementCommittedBy — el UC
            // US-062 añade el log warn defensivo si observa `committed_before < synced_amount`.
            await emitUnderflowWarnIfApplicable({
              tx,
              bookingIntent: v,
              logger: this.logger,
              correlationId: ctx.correlationId,
            });
            await this.budgetSync.revertOnCancel({
              bookingIntentId,
              tx,
              cancellation: { at: now, by: userId, reason: persistedReason},
              correlationId: ctx.correlationId,
            });
          }

          if (this.bookingEvents) {
            await applyCounterpartCancelledNotification({
              tx,
              bookingIntent: v,
              actorUserId: userId,
              actorRole: role,
              cancelledByRole: normalizeRole(role),
              wasConfirmed,
              cancellationReason: persistedReason,
              bookingEvents: this.bookingEvents,
              correlationId: ctx.correlationId,
            });
          }
          return v;
        })
      : await this.bookingIntents.cancel({ id: bookingIntentId, now, cancelledBy: userId, reason: persistedReason});
    this.logger.emit('booking_intent.cancelled', {
      correlationId: ctx.correlationId,
      actorId: userId,
      bookingIntentId,
    });
    return view;
  }
}

/**
 * US-062 BE-003: variante de `authorizeBookingAccess` que en caso de ownership/assignment mismatch
 * lanza `BookingIntentNotFoundError` (contrato §7 SEC-03) en lugar del `NotFoundError` genérico
 * del path legacy US-096. Preserva la 404 uniforme bilateral.
 */
async function authorizeBookingAccessOr404(
  bi: BookingIntentView,
  userId: string,
  role: string,
  events: EventAccessReader,
  vendors: VendorProfileReader,
): Promise<void> {
  try {
    if (role === 'organizer') {
      await requireEventOwner(events, bi.eventId, userId);
      return;
    }
    if (role === 'vendor') {
      const vpId = await requireVendorProfileId(vendors, userId);
      if (bi.vendorProfileId !== vpId) throw new BookingIntentNotFoundError();
      return;
    }
    throw new BookingIntentNotFoundError();
  } catch (err) {
    if (err instanceof BookingIntentNotFoundError) throw err;
    // `requireEventOwner` puede lanzar `NotFoundError` genérico cuando el organizer no es dueño;
    // se re-tipa a 404 uniforme US-062.
    if (err instanceof NotFoundError) throw new BookingIntentNotFoundError();
    throw err;
  }
}

function normalizeRole(role: string): 'organizer' | 'vendor' {
  return role === 'vendor' ? 'vendor' : 'organizer';
}

/**
 * US-062 BE-003/BE-006 (EC-06): tras `wasConfirmed=true`, se lee el `BudgetItem.amountCommitted`
 * actual y el `snapshot.committedSyncedAmount` guardado por US-039 apply. Si `committed_before <
 * synced_amount`, se emite `budget.committed_underflow_corrected` warn ANTES del revert — el
 * revert clampa a 0 y evita underflow físico. El log tolera Budget/Item ausentes (caso raro
 * porque US-039 auto-crea el BudgetItem al confirmar).
 */
async function emitUnderflowWarnIfApplicable(args: {
  tx: Prisma.TransactionClient;
  bookingIntent: BookingIntentView;
  logger: DomainEventLogger;
  correlationId?: string;
}): Promise<void> {
  const { tx, bookingIntent, logger, correlationId } = args;
  const intent = await tx.bookingIntent.findUnique({
    where: { id: bookingIntent.id },
    select: {
      committedSyncedAmount: true,
      eventId: true,
      serviceCategoryId: true,
      quote: { select: { amount: true } },
      event: { select: { budget: { select: { id: true, items: { select: { id: true, categoryCode: true, amountCommitted: true } } } } } },
      serviceCategory: { select: { code: true } },
    },
  });
  if (!intent) return;
  const budget = intent.event.budget;
  if (!budget) return;
  const item = budget.items.find((i: { categoryCode: string | null }) => i.categoryCode === intent.serviceCategory.code);
  if (!item) return;
  const syncedAmount = intent.committedSyncedAmount ?? intent.quote.amount;
  if (item.amountCommitted.lessThan(syncedAmount)) {
    logger.emit('budget.committed_underflow_corrected', {
      correlationId,
      budgetId: budget.id,
      budgetItemId: item.id,
      bookingIntentId: bookingIntent.id,
      previousCommitted: item.amountCommitted.toString(),
      attemptedSubtraction: syncedAmount.toString(),
    });
  }
}

/**
 * US-062 BE-003: fan-out atómico de 2 notifs a la contraparte del actor. El destinatario
 * (`recipientUserId`) es el organizer cuando cancela el vendor y viceversa. El payload incluye
 * `cancelled_by_role`, `cancellation_reason` (nullable) y `committed_reverted` para que la vista
 * pinte el resumen sin re-consultar.
 */
async function applyCounterpartCancelledNotification(args: {
  tx: Prisma.TransactionClient;
  bookingIntent: BookingIntentView;
  actorUserId: string;
  actorRole: string;
  cancelledByRole: 'organizer' | 'vendor';
  wasConfirmed: boolean;
  cancellationReason: string | null;
  bookingEvents: BookingEventNotifierPort;
  correlationId?: string;
}): Promise<void> {
  const { tx, bookingIntent, cancelledByRole, wasConfirmed, cancellationReason, bookingEvents, correlationId } = args;
  const [event, quote] = await Promise.all([
    tx.event.findUnique({
      where: { id: bookingIntent.eventId },
      select: { userId: true },
    }),
    tx.quote.findUnique({
      where: { id: bookingIntent.quoteId },
      select: { quoteRequestId: true, vendorProfileId: true, vendorProfile: { select: { userId: true } } },
    }),
  ]);
  if (!event || !quote) {
    throw new BookingIntentNotFoundError();
  }
  const recipientUserId = cancelledByRole === 'organizer' ? quote.vendorProfile.userId : event.userId;
  await bookingEvents.emit({
    recipientUserId,
    eventName: 'booking_intent.cancelled',
    payload: {
      booking_intent_id: bookingIntent.id,
      quote_id: bookingIntent.quoteId,
      quote_request_id: quote.quoteRequestId,
      event_id: bookingIntent.eventId,
      vendor_profile_id: bookingIntent.vendorProfileId,
      cancelled_by_role: cancelledByRole,
      cancellation_reason: cancellationReason,
      committed_reverted: wasConfirmed,
    },
    tx,
    quoteId: bookingIntent.quoteId,
    correlationId,
  });
}
