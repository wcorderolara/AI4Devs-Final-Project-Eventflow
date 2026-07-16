// CreateQuoteRequestUseCase (US-049 / BE-004). Tech Spec §7 UseCase; AC-01..AC-04; EC-01..EC-06.
// Orquesta la creación de una `QuoteRequest` en `prisma.$transaction` con las siguientes fases:
//   1. `SELECT ... FOR UPDATE` sobre `events` (verifica ownership + `status='active'`).
//   2. `SELECT ... FOR UPDATE` sobre `vendor_profiles` (verifica `approved` + `deleted_at IS NULL`).
//   3. Verifica `service_categories.is_active=true`.
//   4. Cuenta QRs activas por (event, vendor) → `409 QR_ALREADY_ACTIVE`.
//   5. Cuenta QRs activas por (event, category) → `409 QR_CATEGORY_LIMIT_REACHED` si `>= 5`.
//   6. `INSERT quote_requests` con `status='sent'`, snapshot del evento en `brief` (DEV-01).
//   7. `INSERT` 2 `notifications` (in_app delivered + email_simulated simulated) vía adapter.
//   8. Log estructurado `quote_request.created`.
// Un error en cualquier paso revierte la transacción (D9).
import { Prisma, type PrismaClient, QuoteRequestStatus, EventStatus, VendorProfileStatus } from '@prisma/client';
import type { QuoteNotificationSenderPort } from '../../../shared/application/quote-notification-sender.port.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  EventNotFoundError,
  EventNotActiveError,
  VendorNotAvailableError,
  InvalidBriefError,
  QuoteRequestAlreadyActiveError,
  QuoteRequestCategoryLimitReachedError,
  ServiceCategoryUnavailableError,
} from '../domain/us049.errors.js';
import type { CreateQuoteRequestUs049Body } from '../dto/create-quote-request.us049.request.js';
import type { CreateQuoteRequestUs049Response } from '../dto/create-quote-request.us049.response.js';

/** Estados considerados "activos" para BR-QUOTE-004 / BR-QUOTE-009 (D2 del decision resolution). */
const ACTIVE_STATUSES: QuoteRequestStatus[] = [
  QuoteRequestStatus.sent,
  QuoteRequestStatus.viewed,
  QuoteRequestStatus.responded,
];

/** Límite de QRs activas por (event, service_category) — BR-QUOTE-009. */
const MAX_ACTIVE_PER_CATEGORY = 5;

interface EventLockRow {
  id: string;
  user_id: string;
  status: EventStatus;
  currency: string;
  event_type_id: string;
  event_date: Date | null;
  location_id: string | null;
  guests_count: number | null;
}

interface VendorLockRow {
  id: string;
  user_id: string;
  status: VendorProfileStatus;
  deleted_at: Date | null;
}

export interface CreateQuoteRequestUs049Ctx {
  correlationId?: string;
}

export class CreateQuoteRequestUs049UseCase {
  constructor(
    private readonly prisma: PrismaClient = defaultPrisma,
    private readonly notifications: QuoteNotificationSenderPort,
    private readonly logger: DomainEventLogger,
  ) {}

  async execute(
    currentUserId: string,
    body: CreateQuoteRequestUs049Body,
    ctx: CreateQuoteRequestUs049Ctx = {},
  ): Promise<CreateQuoteRequestUs049Response> {
    const budgetNumber = Number.parseFloat(body.brief.budget);
    if (Number.isNaN(budgetNumber) || budgetNumber < 0) {
      throw new InvalidBriefError('budget');
    }

    return this.prisma.$transaction(async (tx) => {
      const event = await this.lockEvent(tx, body.event_id, currentUserId);
      const vendor = await this.lockVendor(tx, body.vendor_profile_id);
      await this.assertCategoryActive(tx, body.service_category_id);
      await this.assertNoActiveDuplicate(tx, body.event_id, body.vendor_profile_id);
      await this.assertBelowCategoryLimit(tx, body.event_id, body.service_category_id, ctx, currentUserId);

      const aiGenerated = body.source === 'ai_generated';
      const briefEnvelope = {
        // Campos US-049 (DEV-01 — envelope canónico en `QuoteRequest.brief`).
        budget: body.brief.budget,
        currency_code: event.currency,
        message: body.brief.message,
        source: body.source,
        aiGenerated,
        event_snapshot: {
          event_type_id: event.event_type_id,
          event_date: event.event_date ? event.event_date.toISOString() : null,
          location_id: event.location_id,
          guests_count: event.guests_count,
        },
      };

      const qr = await tx.quoteRequest.create({
        data: {
          eventId: body.event_id,
          serviceCategoryId: body.service_category_id,
          vendorProfileId: body.vendor_profile_id,
          status: QuoteRequestStatus.sent,
          brief: briefEnvelope as unknown as Prisma.InputJsonValue,
        },
      });

      await this.notifications.notify({
        channel: 'in_app',
        recipientUserId: vendor.user_id,
        event: 'quote_request.created',
        deliveryStatus: 'delivered',
        payload: {
          quote_request_id: qr.id,
          event_id: event.id,
          service_category_id: body.service_category_id,
        },
        tx,
      });
      await this.notifications.notify({
        channel: 'email_simulated',
        recipientUserId: vendor.user_id,
        event: 'quote_request.created',
        deliveryStatus: 'simulated',
        payload: {
          quote_request_id: qr.id,
          event_id: event.id,
          service_category_id: body.service_category_id,
        },
        tx,
      });

      this.logger.emit('quote_request.created', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        quoteRequestId: qr.id,
      });

      return {
        id: qr.id,
        status: QuoteRequestStatus.sent,
        sent_at: qr.createdAt.toISOString(),
        event_id: qr.eventId,
        vendor_profile_id: qr.vendorProfileId!,
        service_category_id: qr.serviceCategoryId,
        ai_generated_brief: aiGenerated,
        brief: {
          budget: body.brief.budget,
          currency_code: event.currency,
          message: body.brief.message,
        },
        event_snapshot: {
          event_type_id: event.event_type_id,
          event_date: event.event_date ? event.event_date.toISOString() : null,
          location_id: event.location_id,
          guests_count: event.guests_count,
        },
      };
    });
  }

  private async lockEvent(tx: Prisma.TransactionClient, eventId: string, ownerId: string): Promise<EventLockRow> {
    // `SELECT ... FOR UPDATE` sobre la row del evento (Tech Spec §7 / §17): previene la carrera con
    // otra inserción concurrente que pudiera empujar el conteo de QRs activas al límite.
    const rows = await tx.$queryRaw<EventLockRow[]>(
      Prisma.sql`SELECT id, user_id, status, currency, event_type_id, event_date, location_id, guests_count
                 FROM events
                 WHERE id = ${eventId}::uuid AND deleted_at IS NULL
                 FOR UPDATE`,
    );
    const row = rows[0];
    // Uniformidad SEC-05: evento ajeno o inexistente ⇒ `404 EVENT_NOT_FOUND` (no revela ownership).
    if (!row || row.user_id !== ownerId) throw new EventNotFoundError();
    if (row.status !== EventStatus.active) throw new EventNotActiveError(row.status);
    return row;
  }

  private async lockVendor(tx: Prisma.TransactionClient, vendorProfileId: string): Promise<VendorLockRow> {
    const rows = await tx.$queryRaw<VendorLockRow[]>(
      Prisma.sql`SELECT id, user_id, status, deleted_at
                 FROM vendor_profiles
                 WHERE id = ${vendorProfileId}::uuid
                 FOR UPDATE`,
    );
    const row = rows[0];
    // Uniformidad SEC-06: vendor no `approved`, soft-deleted o inexistente ⇒ `400 VENDOR_NOT_AVAILABLE`.
    if (!row || row.status !== VendorProfileStatus.approved || row.deleted_at !== null) {
      throw new VendorNotAvailableError();
    }
    return row;
  }

  private async assertCategoryActive(tx: Prisma.TransactionClient, serviceCategoryId: string): Promise<void> {
    const category = await tx.serviceCategory.findFirst({
      where: { id: serviceCategoryId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    // Categoría inexistente o inactiva ⇒ `400 INVALID_CATEGORY` (VR-04, EC-04).
    if (!category) throw new ServiceCategoryUnavailableError();
  }

  private async assertNoActiveDuplicate(
    tx: Prisma.TransactionClient,
    eventId: string,
    vendorProfileId: string,
  ): Promise<void> {
    const existing = await tx.quoteRequest.findFirst({
      where: {
        eventId,
        vendorProfileId,
        status: { in: ACTIVE_STATUSES },
      },
      select: { id: true },
    });
    if (existing) throw new QuoteRequestAlreadyActiveError(existing.id);
  }

  private async assertBelowCategoryLimit(
    tx: Prisma.TransactionClient,
    eventId: string,
    serviceCategoryId: string,
    ctx: CreateQuoteRequestUs049Ctx,
    actorId: string,
  ): Promise<void> {
    const activeCount = await tx.quoteRequest.count({
      where: {
        eventId,
        serviceCategoryId,
        status: { in: ACTIVE_STATUSES },
      },
    });
    if (activeCount >= MAX_ACTIVE_PER_CATEGORY) {
      // US-050 (BE-005): emitir warning ANTES del throw para que sobreviva al rollback de la
      // transacción y quede trazable el intento bloqueado (BR-QUOTE-009).
      this.logger.emit('quote_request.limit_reached', {
        correlationId: ctx.correlationId,
        actorId,
        eventId,
        serviceCategoryId,
        activeCount,
        limit: MAX_ACTIVE_PER_CATEGORY,
      });
      throw new QuoteRequestCategoryLimitReachedError(activeCount);
    }
  }
}
