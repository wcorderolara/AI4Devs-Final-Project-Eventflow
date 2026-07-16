// MarkVendorQrViewedUseCase (US-051 / BE-003). Tech Spec §7 UseCase. AC-01/03/04, EC-01..EC-04.
//
// Transiciona `sent → viewed` para el vendor autenticado con las siguientes garantías:
//   1. Ejecuta dentro de `prisma.$transaction`.
//   2. `SELECT ... FOR UPDATE` sobre `quote_requests` para bloquear la row contra 2 POST
//      simultáneos (§17 riesgo #1).
//   3. Guarda `WHERE status='sent'`: si el QR ya está `viewed`/`responded`/`expired`/`cancelled`
//      devuelve el estado actual (idempotencia AC-03/AC-04) sin insertar Notification ni log.
//   4. Filtro lazy de expiración: si `expires_at IS NOT NULL AND expires_at <= NOW()` no
//      transiciona (EC-01) — devuelve el QR actual.
//   5. UPDATE atómico persistiendo `status='viewed' + viewed_at + viewed_by` (D3).
//   6. INSERT `Notification` in-app `delivered` al organizador (D5) vía
//      `QuoteNotificationSenderPort` reutilizado de US-049 con `tx`.
//   7. Emite log `quote_request.viewed` sólo en transición real (§14 / BE-006).
//
// Uniformidad SEC (D4): QR inexistente, ajena, vendor con `status='hidden'` o soft-deleted ⇒
// `404 QR_NOT_FOUND`.
import { Prisma, type PrismaClient } from '@prisma/client';
import type { QuoteNotificationSenderPort } from '../../../shared/application/quote-notification-sender.port.js';
import type { VendorProfileReader } from '../../../shared/access/readers.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import type { QuoteRequestView, QuoteRequestStatusValue } from '../domain/quote-request.js';

interface QuoteRequestLockRow {
  id: string;
  event_id: string;
  service_category_id: string;
  vendor_profile_id: string | null;
  status: QuoteRequestStatusValue;
  brief: Prisma.JsonValue | null;
  ai_recommendation_id: string | null;
  viewed_at: Date | null;
  viewed_by: string | null;
  cancelled_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToView(row: QuoteRequestLockRow): QuoteRequestView {
  return {
    id: row.id,
    eventId: row.event_id,
    serviceCategoryId: row.service_category_id,
    vendorProfileId: row.vendor_profile_id,
    status: row.status,
    // El brief conserva la shape con la que fue persistido (US-049 canónico o US-096 legado).
    brief: (row.brief as QuoteRequestView['brief']) ?? null,
    aiRecommendationId: row.ai_recommendation_id,
    viewedAt: row.viewed_at ? row.viewed_at.toISOString() : null,
    viewedBy: row.viewed_by ?? null,
    cancelledAt: row.cancelled_at ? row.cancelled_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface MarkVendorQrViewedCtx {
  correlationId?: string;
}

export class MarkVendorQrViewedUs051UseCase {
  constructor(
    private readonly vendors: VendorProfileReader,
    private readonly notifications: QuoteNotificationSenderPort,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    qrId: string,
    ctx: MarkVendorQrViewedCtx = {},
  ): Promise<QuoteRequestView> {
    // 1) Resuelve VendorProfile del actor FUERA de la transacción: cache-friendly y evita
    //    tomar locks innecesarios cuando la autorización fallará.
    const vendorProfile = await this.vendors.findActiveByUserId(currentUserId);
    if (!vendorProfile || vendorProfile.status === 'hidden') {
      throw new NotFoundError('Quote request not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 2) SELECT ... FOR UPDATE sobre el QR, filtrado por assignment. Devuelve `[]` si el QR
      //    no existe o no pertenece al vendor (uniformidad SEC).
      const rows = await tx.$queryRaw<QuoteRequestLockRow[]>(
        Prisma.sql`SELECT id, event_id, service_category_id, vendor_profile_id, status,
                          brief, ai_recommendation_id, viewed_at, viewed_by, cancelled_at,
                          expires_at, created_at, updated_at
                     FROM quote_requests
                    WHERE id = ${qrId}::uuid
                      AND vendor_profile_id = ${vendorProfile.id}::uuid
                    FOR UPDATE`,
      );
      const row = rows[0];
      if (!row) throw new NotFoundError('Quote request not found');

      const now = this.clock.now();

      // 3) No-op idempotente (AC-03/AC-04) para cualquier estado != 'sent'.
      if (row.status !== 'sent') return rowToView(row);

      // 4) Filtro lazy de expiración (EC-01): si expiró, no transiciona ni notifica.
      if (row.expires_at && row.expires_at.getTime() <= now.getTime()) {
        return rowToView(row);
      }

      // 5) UPDATE atómico con guard adicional `status='sent'` para blindaje ante race extrema.
      const updateResult = await tx.$executeRaw(
        Prisma.sql`UPDATE quote_requests
                      SET status = 'viewed',
                          viewed_at = ${now},
                          viewed_by = ${currentUserId}::uuid,
                          updated_at = ${now}
                    WHERE id = ${qrId}::uuid AND status = 'sent'`,
      );
      // Si otro tx ganó la carrera, releer y devolver estado actual (idempotencia).
      if (updateResult === 0) {
        const currentRows = await tx.$queryRaw<QuoteRequestLockRow[]>(
          Prisma.sql`SELECT id, event_id, service_category_id, vendor_profile_id, status,
                            brief, ai_recommendation_id, viewed_at, viewed_by, cancelled_at,
                            expires_at, created_at, updated_at
                       FROM quote_requests
                      WHERE id = ${qrId}::uuid`,
        );
        const current = currentRows[0];
        if (!current) throw new NotFoundError('Quote request not found');
        return rowToView(current);
      }

      // 6) Resuelve organizer_user_id del evento (mismo tx). Sin snapshots stale.
      const eventRows = await tx.$queryRaw<{ user_id: string }[]>(
        Prisma.sql`SELECT user_id FROM events WHERE id = ${row.event_id}::uuid`,
      );
      const organizerUserId = eventRows[0]?.user_id;
      if (!organizerUserId) {
        // FK garantiza que el evento existe; si por integridad no lo encuentra, mantenemos
        // el comportamiento uniforme 404 en lugar de exponer una inconsistencia.
        throw new NotFoundError('Quote request not found');
      }

      // 7) Notificación in_app al organizer (D5) DENTRO de la misma transacción.
      await this.notifications.notify({
        channel: 'in_app',
        recipientUserId: organizerUserId,
        event: 'quote_request.viewed',
        deliveryStatus: 'delivered',
        payload: {
          quote_request_id: qrId,
          vendor_profile_id: vendorProfile.id,
          viewed_at: now.toISOString(),
        },
        tx,
      });

      this.logger.emit('quote_request.viewed', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        quoteRequestId: qrId,
      });

      return rowToView({
        ...row,
        status: 'viewed',
        viewed_at: now,
        viewed_by: currentUserId,
        updated_at: now,
      });
    });
  }
}
