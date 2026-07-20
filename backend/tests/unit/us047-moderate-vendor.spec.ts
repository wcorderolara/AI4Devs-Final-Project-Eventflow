// US-047 (PB-P1-041 / QA-001) — Unit tests de `ModerateVendorUseCase` + DTO branches.
//
// Cobertura:
//   DTO (`ModerateVendorBodySchema`):
//     - VR-02 rechaza `action` fuera de {approve, reject, hide, unhide}.
//     - VR-03 reason [10..500] cuando presente.
//     - Cross-field refine (D4): `reject`/`hide` sin reason ⇒ `REASON_REQUIRED`.
//     - `approve`/`unhide` aceptan reason ausente (D3).
//     - VR-05 `.strict()` — campos ajenos ⇒ parse fail.
//     - Params: `:id` UUID válido.
//
//   UseCase branches (Decisión PO D5 / AC-01..AC-04 / EC-01..EC-07):
//     - AC-01 pending + approve: status=approved, is_hidden=false, AdminAction + chain + notif + log.
//     - AC-02 pending + reject : status=rejected, is_hidden unchanged.
//     - AC-03 approved + hide  : is_hidden=true, status unchanged.
//     - AC-04 approved+hidden + unhide : is_hidden=false, status unchanged.
//     - EC-01 approved + approve ⇒ InvalidVendorTransitionError sin AdminAction.
//     - EC-02 pending + hide     ⇒ InvalidVendorTransitionError.
//     - EC-03 rejected + approve ⇒ InvalidVendorTransitionError (re-approve OUT of MVP).
//     - Vendor inexistente / soft-deleted ⇒ VendorNotFoundForModerationError.
//     - Log `vendor.moderated` no expone `reason` (SEC-05/09).
import { describe, expect, it, vi } from 'vitest';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { ModerateVendorUseCase } from '../../src/modules/admin-governance/application/moderate-vendor.use-case.js';
import {
  ModerateVendorBodySchema,
  ModerateVendorParamsSchema,
} from '../../src/modules/admin-governance/interface/moderate-vendor.dto.js';
import {
  InvalidVendorTransitionError,
  VendorNotFoundForModerationError,
} from '../../src/modules/admin-governance/domain/us047.errors.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const NOW = new Date('2026-07-20T12:00:00Z');
const VENDOR_ID = '11111111-1111-4111-8111-111111111111';
const VENDOR_USER_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_USER_ID = '99999999-9999-4999-8999-999999999999';
const ADMIN_ACTION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

type LockedRow = {
  id: string;
  status: string;
  is_hidden: boolean;
  user_id: string;
  deleted_at: Date | null;
};

interface BuildOpts {
  vendorExists?: boolean;
  softDeleted?: boolean;
  currentStatus?: 'pending' | 'approved' | 'rejected';
  currentIsHidden?: boolean;
}

function build(opts: BuildOpts = {}) {
  const vendorExists = opts.vendorExists ?? true;
  const currentStatus = opts.currentStatus ?? 'pending';
  const currentIsHidden = opts.currentIsHidden ?? false;
  const deletedAt = opts.softDeleted ? new Date('2026-07-01T00:00:00Z') : null;

  type NotifyArgs = {
    recipientUserId: string;
    eventName: string;
    payload: Record<string, unknown>;
    correlationId?: string;
    tx?: unknown;
    quoteId?: string;
  };
  const logSpy = vi.fn();
  const notifySpy = vi.fn<(input: NotifyArgs) => Promise<void>>(async () => undefined);
  const clock: ClockPort = { now: () => NOW };
  const logger: DomainEventLogger = { emit: logSpy };

  type SpyArgs = { data: Record<string, unknown>; where?: Record<string, unknown>; select?: unknown };
  const vendorUpdateSpy = vi.fn<(args: SpyArgs) => unknown>();
  const adminActionCreateSpy = vi.fn<(args: SpyArgs) => Promise<{ id: string }>>(async () => ({ id: ADMIN_ACTION_ID }));

  const tx = {
    vendorProfile: {
      update: async (args: {
        where: { id: string };
        data: Record<string, unknown>;
        select?: Record<string, boolean>;
      }): Promise<unknown> => {
        vendorUpdateSpy(args);
        if (args.select) {
          // Segundo UPDATE devuelve la vista final; asumimos que los cambios del 1er UPDATE ya
          // se aplicaron — reflejamos el estado esperado sin recomputarlo (los asserts miran
          // los args del 1er UPDATE para status/is_hidden).
          return {
            id: VENDOR_ID,
            status: args.data.status ?? currentStatus,
            isHidden: args.data.isHidden ?? currentIsHidden,
            moderatedBy: ADMIN_USER_ID,
            moderatedAt: NOW,
            moderationReason: 'reason placeholder — asserts miran 1er UPDATE',
            adminActionId: ADMIN_ACTION_ID,
          };
        }
        return { id: VENDOR_ID };
      },
    },
    adminAction: { create: adminActionCreateSpy },
    async $queryRaw(): Promise<unknown> {
      return vendorExists
        ? ([
            {
              id: VENDOR_ID,
              status: currentStatus,
              is_hidden: currentIsHidden,
              user_id: VENDOR_USER_ID,
              deleted_at: deletedAt,
            },
          ] satisfies LockedRow[])
        : [];
    },
  };

  const prismaMock = {
    async $transaction<T>(fn: (tx: PrismaTypes.TransactionClient) => Promise<T>): Promise<T> {
      return fn(tx as unknown as PrismaTypes.TransactionClient);
    },
  };

  const vendorEvents = { emit: notifySpy };
  const uc = new ModerateVendorUseCase(vendorEvents, clock, logger, prismaMock as never);
  return { uc, logSpy, notifySpy, vendorUpdateSpy, adminActionCreateSpy };
}

describe('US-047 · ModerateVendorParamsSchema + ModerateVendorBodySchema', () => {
  const okReason = 'Documentación incompleta verificada por el equipo.';

  it('acepta approve sin reason (D3)', () => {
    expect(ModerateVendorBodySchema.safeParse({ action: 'approve' }).success).toBe(true);
    expect(ModerateVendorBodySchema.safeParse({ action: 'unhide' }).success).toBe(true);
  });
  it('acepta reject/hide con reason en rango', () => {
    expect(ModerateVendorBodySchema.safeParse({ action: 'reject', reason: okReason }).success).toBe(true);
    expect(ModerateVendorBodySchema.safeParse({ action: 'hide', reason: okReason }).success).toBe(true);
  });
  it('VR-02 rechaza action inválido', () => {
    expect(ModerateVendorBodySchema.safeParse({ action: 'delete' }).success).toBe(false);
  });
  it('D4 rechaza reject sin reason (REASON_REQUIRED)', () => {
    const parsed = ModerateVendorBodySchema.safeParse({ action: 'reject' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe('REASON_REQUIRED');
      expect(parsed.error.issues[0]?.path).toEqual(['reason']);
    }
  });
  it('D4 rechaza hide sin reason', () => {
    expect(ModerateVendorBodySchema.safeParse({ action: 'hide' }).success).toBe(false);
  });
  it('VR-04 rechaza reason < 10', () => {
    expect(ModerateVendorBodySchema.safeParse({ action: 'reject', reason: 'short' }).success).toBe(false);
  });
  it('VR-04 rechaza reason > 500', () => {
    expect(
      ModerateVendorBodySchema.safeParse({ action: 'reject', reason: 'x'.repeat(501) }).success,
    ).toBe(false);
  });
  it('VR-05 rechaza campos ajenos (.strict())', () => {
    expect(
      ModerateVendorBodySchema.safeParse({ action: 'approve', extra: 'x' }).success,
    ).toBe(false);
  });
  it('Params: :id UUID válido', () => {
    expect(ModerateVendorParamsSchema.safeParse({ id: 'not-uuid' }).success).toBe(false);
    expect(ModerateVendorParamsSchema.safeParse({ id: VENDOR_ID }).success).toBe(true);
  });
});

describe('US-047 · ModerateVendorUseCase.execute', () => {
  const rejectBody = {
    action: 'reject' as const,
    reason: 'Documentación insuficiente verificada por el equipo de moderación.',
  };
  const hideBody = {
    action: 'hide' as const,
    reason: 'Perfil oculto temporalmente por reporte de contenido inapropiado.',
  };

  it('AC-01 pending + approve: status=approved, notif vendor.approved, log', async () => {
    const { uc, logSpy, notifySpy, vendorUpdateSpy, adminActionCreateSpy } = build();
    const view = await uc.execute(ADMIN_USER_ID, VENDOR_ID, { action: 'approve' }, { correlationId: 'cid-47' });

    expect(view.id).toBe(VENDOR_ID);
    expect(view.adminActionId).toBe(ADMIN_ACTION_ID);
    expect(view.moderatedBy).toBe(ADMIN_USER_ID);

    // 2 UPDATE en vendorProfile: audit + status + is_hidden → chain admin_action_id.
    expect(vendorUpdateSpy).toHaveBeenCalledTimes(2);
    const firstUpdate = vendorUpdateSpy.mock.calls[0]![0];
    expect(firstUpdate.data).toMatchObject({
      status: 'approved',
      isHidden: false,
      moderatedBy: ADMIN_USER_ID,
      moderationReason: null,
    });
    expect(vendorUpdateSpy.mock.calls[1]![0].data).toEqual({ adminActionId: ADMIN_ACTION_ID });

    // AdminAction append-only (Decisión PO D8).
    expect(adminActionCreateSpy).toHaveBeenCalledTimes(1);
    const metadata = adminActionCreateSpy.mock.calls[0]![0].data.metadata as Record<string, unknown>;
    expect(metadata).toMatchObject({
      correlationId: 'cid-47',
      reason: null,
      from_status: 'pending',
      to_status: 'approved',
      from_is_hidden: false,
      to_is_hidden: false,
    });

    // Fan-out via service común.
    expect(notifySpy).toHaveBeenCalledTimes(1);
    const notify = notifySpy.mock.calls[0]![0];
    expect(notify.recipientUserId).toBe(VENDOR_USER_ID);
    expect(notify.eventName).toBe('vendor.approved');
    expect(notify.correlationId).toBe('cid-47');

    // Log: SEC-05/09 — NO se emite `reason`.
    expect(logSpy).toHaveBeenCalledWith(
      'vendor.moderated',
      expect.objectContaining({
        correlationId: 'cid-47',
        actorId: ADMIN_USER_ID,
        adminUserId: ADMIN_USER_ID,
        vendorProfileId: VENDOR_ID,
        action: 'approve',
        fromStatus: 'pending',
        toStatus: 'approved',
        fromIsHidden: false,
        toIsHidden: false,
        adminActionId: ADMIN_ACTION_ID,
      }),
    );
    const logged = logSpy.mock.calls[0]?.[1] ?? {};
    expect(logged).not.toHaveProperty('reason');
    expect(logged).not.toHaveProperty('moderationReason');
  });

  it('AC-02 pending + reject: status=rejected + reason persisted', async () => {
    const { uc, vendorUpdateSpy, adminActionCreateSpy, notifySpy } = build();
    await uc.execute(ADMIN_USER_ID, VENDOR_ID, rejectBody);
    expect(vendorUpdateSpy.mock.calls[0]![0].data).toMatchObject({
      status: 'rejected',
      isHidden: false,
      moderationReason: rejectBody.reason,
    });
    expect(adminActionCreateSpy.mock.calls[0]![0].data.action).toBe('reject');
    expect(notifySpy.mock.calls[0]![0]!.eventName).toBe('vendor.rejected');
  });

  it('AC-03 approved + hide: is_hidden=true, status unchanged', async () => {
    const { uc, vendorUpdateSpy, adminActionCreateSpy, notifySpy } = build({
      currentStatus: 'approved',
      currentIsHidden: false,
    });
    await uc.execute(ADMIN_USER_ID, VENDOR_ID, hideBody);
    const data = vendorUpdateSpy.mock.calls[0]![0].data;
    expect(data.status).toBe('approved');
    expect(data.isHidden).toBe(true);
    const meta = adminActionCreateSpy.mock.calls[0]![0].data.metadata as Record<string, unknown>;
    expect(meta.from_is_hidden).toBe(false);
    expect(meta.to_is_hidden).toBe(true);
    expect(notifySpy.mock.calls[0]![0]!.eventName).toBe('vendor.hidden');
  });

  it('AC-04 approved+hidden + unhide: is_hidden=false, sin reason permitido', async () => {
    const { uc, vendorUpdateSpy, notifySpy } = build({
      currentStatus: 'approved',
      currentIsHidden: true,
    });
    await uc.execute(ADMIN_USER_ID, VENDOR_ID, { action: 'unhide' });
    const data = vendorUpdateSpy.mock.calls[0]![0].data;
    expect(data.isHidden).toBe(false);
    expect(data.status).toBe('approved');
    expect(data.moderationReason).toBeNull();
    expect(notifySpy.mock.calls[0]![0]!.eventName).toBe('vendor.unhidden');
  });

  it('EC-01 approved + approve ⇒ InvalidVendorTransitionError sin AdminAction', async () => {
    const { uc, adminActionCreateSpy, vendorUpdateSpy, notifySpy } = build({
      currentStatus: 'approved',
      currentIsHidden: false,
    });
    await expect(uc.execute(ADMIN_USER_ID, VENDOR_ID, { action: 'approve' })).rejects.toBeInstanceOf(
      InvalidVendorTransitionError,
    );
    expect(adminActionCreateSpy).not.toHaveBeenCalled();
    expect(vendorUpdateSpy).not.toHaveBeenCalled();
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('EC-02 pending + hide ⇒ InvalidVendorTransitionError; allowed=["approve","reject"]', async () => {
    const { uc } = build({ currentStatus: 'pending' });
    try {
      await uc.execute(ADMIN_USER_ID, VENDOR_ID, hideBody);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidVendorTransitionError);
      const err = e as InvalidVendorTransitionError;
      expect(err.fromStatus).toBe('pending');
      expect(err.allowed).toEqual(['approve', 'reject']);
    }
  });

  it('EC-03 rejected + approve ⇒ InvalidVendorTransitionError (re-approve OUT MVP)', async () => {
    const { uc } = build({ currentStatus: 'rejected' });
    await expect(uc.execute(ADMIN_USER_ID, VENDOR_ID, { action: 'approve' })).rejects.toBeInstanceOf(
      InvalidVendorTransitionError,
    );
  });

  it('Vendor inexistente ⇒ VendorNotFoundForModerationError (404 uniforme, D7)', async () => {
    const { uc, adminActionCreateSpy } = build({ vendorExists: false });
    await expect(uc.execute(ADMIN_USER_ID, VENDOR_ID, { action: 'approve' })).rejects.toBeInstanceOf(
      VendorNotFoundForModerationError,
    );
    expect(adminActionCreateSpy).not.toHaveBeenCalled();
  });

  it('Vendor soft-deleted ⇒ VendorNotFoundForModerationError (SEC-03 uniforme)', async () => {
    const { uc } = build({ softDeleted: true, currentStatus: 'approved' });
    await expect(uc.execute(ADMIN_USER_ID, VENDOR_ID, { action: 'approve' })).rejects.toBeInstanceOf(
      VendorNotFoundForModerationError,
    );
  });
});
