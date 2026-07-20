// ModerateVendorUseCase (US-047 / BE-003). Tech Spec §7 UseCase. AC-01..AC-04 + EC-01..EC-07.
//
// Endpoint atómico `POST /api/v1/admin/vendors/:id/moderate` (Decisiones PO D1/D5/D8) que
// ejecuta dentro de un único `prisma.$transaction`:
//
//   1. Bloqueo pesimista del VendorProfile por `SELECT ... FOR UPDATE` (Tech Spec §17
//      mitigación de la race de 2 moderate simultáneos — Decisión PO D5). Sin lock, dos
//      admins podrían crear 2 AdminActions y emitir 2 fan-outs de notifs contradictorias.
//      Uniforme 404 `VENDOR_NOT_FOUND` si el UUID no matchea o el vendor está soft-deleted
//      (SEC-03 + Decisión PO D7).
//   2. Validación de transición contra el whitelist estricto (Decisión PO D5):
//        - `pending`  → { approve, reject }
//        - `approved` → { hide (si is_hidden=false), unhide (si is_hidden=true) }
//        - `rejected` → {}   ← EC-03: re-aprobar rejected está OUT OF MVP.
//      Cualquier rechazo pre-UPDATE ⇒ NO se crea AdminAction (BR-ADMIN-011 preservado).
//   3. UPDATE VendorProfile — `status` (approve/reject) o `is_hidden` (hide/unhide) según
//      la acción + audit columns (`moderated_by`, `moderated_at`, `moderation_reason`). El
//      `admin_action_id` se llenará en el paso 5 (una vez insertado el AdminAction).
//   4. INSERT AdminAction (append-only, BR-ADMIN-011). Shape (Decisión PO D8):
//        `{admin_user_id, action, target_entity='vendor_profile', target_id, metadata:
//          {reason, from_status, to_status, from_is_hidden, to_is_hidden, correlationId}}`.
//      El snapshot from/to en `metadata` preserva el estado pre-moderación aunque el vendor
//      sea re-moderado por otro admin (paridad con la técnica de US-067). `correlationId`
//      viaja dentro de `metadata` (misma deviation D-01 de US-016 escalada a US-099).
//   5. UPDATE VendorProfile.admin_action_id — enlace de cadena vendor→AdminAction (Decisión
//      PO D8; BR-ADMIN-011). Un segundo UPDATE mínimo dentro de la misma transacción; barato
//      porque la fila ya está lockeada.
//   6. Fan-out de notifications al vendor via `QuoteEventNotificationService.emit(...)`
//      dentro del mismo `tx` (Decisión PO D6/D8; atomicidad). 2 rows por evento (in-app +
//      email_simulated). Eventos: `vendor.approved`/`rejected`/`hidden`/`unhidden`.
//   7. Log estructurado `vendor.moderated` con 7 campos + `adminActionId` (Tech Spec §14).
//      NO se logea el `reason` (SEC-05/09: mismo criterio que review.moderated de US-067).
//
// Errores mapeados por el `errorHandlerMiddleware`:
//   - `VendorNotFoundForModerationError → 404 VENDOR_NOT_FOUND` (Decisión PO D7; SEC-03).
//   - `InvalidVendorTransitionError → 409 INVALID_TRANSITION` con
//     `details = [{from_status},{from_is_hidden},{to_status},{to_is_hidden},{action},{allowed}]`.
//
// NO invoca a ningún AI provider (SEC-05: sin AI moderation). NO ejecuta hard delete
// (soft delete de vendor pertenece a US-041; en US-047 sólo se muta status/is_hidden).
// NO notifica al organizer (Decisión PO / Notes US-047: fuera de MVP).
import { Prisma, VendorProfileStatus, type PrismaClient } from '@prisma/client';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type {
  QuoteEventName,
  QuoteEventNotificationService,
} from '../../quote-flow/services/quote-event-notification.service.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import {
  InvalidVendorTransitionError,
  VendorNotFoundForModerationError,
} from '../domain/us047.errors.js';
import type {
  ModerateVendorAction,
  ModerateVendorBody,
} from '../interface/moderate-vendor.dto.js';

export interface ModerateVendorCtx {
  correlationId?: string;
}

export interface ModeratedVendorView {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  isHidden: boolean;
  moderatedAt: string;
  moderatedBy: string;
  moderationReason: string | null;
  adminActionId: string;
}

/**
 * Whitelist explícita (Decisión PO D5). `rejected` es terminal en el MVP: la re-aprobación
 * está OUT (US-047 Notes). El flag `is_hidden` sólo aplica cuando `status='approved'`.
 */
const ALLOWED_ACTIONS_BY_STATE: Array<{
  fromStatus: 'pending' | 'approved' | 'rejected';
  fromIsHidden: boolean | null;
  action: ModerateVendorAction;
}> = [
  { fromStatus: 'pending', fromIsHidden: null, action: 'approve' },
  { fromStatus: 'pending', fromIsHidden: null, action: 'reject' },
  { fromStatus: 'approved', fromIsHidden: false, action: 'hide' },
  { fromStatus: 'approved', fromIsHidden: true, action: 'unhide' },
];

interface LockedVendorRow {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  is_hidden: boolean;
  user_id: string;
  deleted_at: Date | null;
}

/** Emisor del service común (subset) — permite mock en tests sin acoplarse al constructor. */
export type VendorNotifyEmitter = Pick<QuoteEventNotificationService, 'emit'>;

export class ModerateVendorUseCase {
  constructor(
    private readonly vendorEvents: VendorNotifyEmitter,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    vendorProfileId: string,
    body: ModerateVendorBody,
    ctx: ModerateVendorCtx = {},
  ): Promise<ModeratedVendorView> {
    const now = this.clock.now();

    return this.prisma.$transaction(async (tx) => {
      // 1) Bloqueo pesimista: SELECT ... FOR UPDATE sobre el VendorProfile. Prisma no expone
      // FOR UPDATE tipado — se usa raw SQL scoped al mismo `tx` (misma técnica US-067). La
      // fila con `deleted_at != NULL` se trata como 404 uniforme (SEC-03 + Decisión PO D7).
      const locked = await tx.$queryRaw<LockedVendorRow[]>(
        Prisma.sql`SELECT id, status::text AS status, is_hidden, user_id, deleted_at
                     FROM vendor_profiles
                    WHERE id = ${vendorProfileId}::uuid
                    FOR UPDATE`,
      );
      const vendor = locked[0];
      if (!vendor || vendor.deleted_at !== null) {
        throw new VendorNotFoundForModerationError();
      }

      const fromStatus = vendor.status;
      const fromIsHidden = vendor.is_hidden;

      // 2) Validación de transición contra whitelist (Decisión PO D5).
      const allowedActions = ALLOWED_ACTIONS_BY_STATE.filter(
        (rule) =>
          rule.fromStatus === fromStatus &&
          (rule.fromIsHidden === null || rule.fromIsHidden === fromIsHidden),
      ).map((rule) => rule.action);

      if (!allowedActions.includes(body.action)) {
        // Cálculo del target teórico (sólo para el envelope del error; NO se persiste nada).
        const target = computeTarget(fromStatus, fromIsHidden, body.action);
        throw new InvalidVendorTransitionError(
          fromStatus,
          fromIsHidden,
          target.status,
          target.isHidden,
          body.action,
          allowedActions,
        );
      }

      // 3) UPDATE VendorProfile — status/is_hidden + audit columns (excepto admin_action_id).
      const { status: toStatus, isHidden: toIsHidden } = computeTarget(
        fromStatus,
        fromIsHidden,
        body.action,
      );
      await tx.vendorProfile.update({
        where: { id: vendorProfileId },
        data: {
          status: VendorProfileStatus[toStatus as keyof typeof VendorProfileStatus],
          isHidden: toIsHidden,
          moderatedBy: currentUserId,
          moderatedAt: now,
          moderationReason: body.reason ?? null,
        },
      });

      // 4) INSERT AdminAction (append-only, BR-ADMIN-011). Payload snapshot en `metadata`.
      // `correlationId` va dentro de `metadata` (deviation D-01 US-016 escalada a US-099 —
      // hasta que `admin_actions.correlation_id` exista como columna dedicada).
      const adminAction = await tx.adminAction.create({
        data: {
          adminUserId: currentUserId,
          action: body.action,
          targetEntity: 'vendor_profile',
          targetId: vendorProfileId,
          metadata: {
            correlationId: ctx.correlationId ?? null,
            reason: body.reason ?? null,
            from_status: fromStatus,
            to_status: toStatus,
            from_is_hidden: fromIsHidden,
            to_is_hidden: toIsHidden,
          } as Prisma.InputJsonObject,
        },
        select: { id: true },
      });

      // 5) UPDATE VendorProfile.admin_action_id — chain vendor → último AdminAction
      // (Decisión PO D8; BR-ADMIN-011).
      const updated = await tx.vendorProfile.update({
        where: { id: vendorProfileId },
        data: { adminActionId: adminAction.id },
        select: {
          id: true,
          status: true,
          isHidden: true,
          moderatedBy: true,
          moderatedAt: true,
          moderationReason: true,
          adminActionId: true,
        },
      });

      // 6) Fan-out de notifications al vendor via service común (2 rows: in_app + email_sim).
      // Atomicidad garantizada al pasar el mismo `tx` (Decisión PO D8).
      await this.vendorEvents.emit({
        recipientUserId: vendor.user_id,
        eventName: EVENT_NAME_BY_ACTION[body.action],
        payload: {
          vendor_profile_id: vendorProfileId,
          action: body.action,
          reason: body.reason ?? null,
          moderated_by: currentUserId,
          moderated_at: now.toISOString(),
        },
        tx,
        correlationId: ctx.correlationId,
      });

      // 7) Log estructurado `vendor.moderated` — Tech Spec §14. SEC-05/09: NO se emite `reason`
      // (puede contener PII o referencia a contenido reportado).
      this.logger.emit('vendor.moderated', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        adminUserId: currentUserId,
        vendorProfileId,
        action: body.action,
        fromStatus,
        toStatus,
        fromIsHidden,
        toIsHidden,
        adminActionId: adminAction.id,
      });

      return {
        id: updated.id,
        status: updated.status as ModeratedVendorView['status'],
        isHidden: updated.isHidden,
        moderatedAt: (updated.moderatedAt as Date).toISOString(),
        moderatedBy: updated.moderatedBy as string,
        moderationReason: updated.moderationReason ?? null,
        adminActionId: updated.adminActionId as string,
      };
    });
  }
}

const EVENT_NAME_BY_ACTION: Record<ModerateVendorAction, QuoteEventName> = {
  approve: 'vendor.approved',
  reject: 'vendor.rejected',
  hide: 'vendor.hidden',
  unhide: 'vendor.unhidden',
};

/**
 * Deriva el estado objetivo (status + is_hidden) para una acción, sin validar el whitelist.
 * Se usa tanto para el UPDATE efectivo (paso 3) como para poblar el envelope del error 409
 * (paso 2): en ese caso el target es teórico y NO se persiste.
 */
function computeTarget(
  fromStatus: 'pending' | 'approved' | 'rejected' | 'hidden',
  fromIsHidden: boolean,
  action: ModerateVendorAction,
): { status: 'pending' | 'approved' | 'rejected' | 'hidden'; isHidden: boolean } {
  switch (action) {
    case 'approve':
      return { status: 'approved', isHidden: false };
    case 'reject':
      return { status: 'rejected', isHidden: fromIsHidden };
    case 'hide':
      return { status: fromStatus, isHidden: true };
    case 'unhide':
      return { status: fromStatus, isHidden: false };
  }
}
