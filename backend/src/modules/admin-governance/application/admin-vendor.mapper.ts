// Mapper — Admin vendor list item (US-074 / BE-001). Tech Spec §7.
//
// Expone PII completa (Decisión PO D4 · SEC-03): el admin ve `owner.email` del vendor. El guard
// (`sessionAuth + roleMiddleware(['admin'])`) es la única frontera de autorización — cualquier
// consumidor no-admin nunca llega a este mapper.
//
// `last_admin_action` se materializa desde el chain `vendor_profiles.admin_action_id →
// admin_actions` establecido por `ModerateVendorUseCase` (US-047). El `reason` proviene de
// `admin_actions.metadata.reason` (mismo shape que US-077 admin review mapper — el metadata
// JsonB persiste el reason para no depender de una columna dedicada).
import type { Prisma } from '@prisma/client';

export type AdminVendorMapperInput = Prisma.VendorProfileGetPayload<{
  select: {
    id: true;
    businessName: true;
    slug: true;
    status: true;
    isHidden: true;
    createdAt: true;
    user: { select: { id: true; email: true } };
    adminAction: {
      select: { action: true; adminUserId: true; createdAt: true; metadata: true };
    };
  };
}>;

export interface AdminVendorListItem {
  id: string;
  businessName: string;
  slug: string | null;
  status: string;
  isHidden: boolean;
  createdAt: string;
  owner: {
    userId: string;
    email: string;
  };
  lastAdminAction: {
    action: string;
    reason: string | null;
    adminId: string | null;
    createdAt: string;
  } | null;
}

export function toAdminVendorListItem(v: AdminVendorMapperInput): AdminVendorListItem {
  const meta = (v.adminAction?.metadata ?? null) as Record<string, unknown> | null;
  const reason = meta && typeof meta.reason === 'string' ? meta.reason : null;

  return {
    id: v.id,
    businessName: v.businessName,
    slug: v.slug ?? null,
    status: v.status,
    isHidden: v.isHidden,
    createdAt: v.createdAt.toISOString(),
    owner: {
      userId: v.user.id,
      email: v.user.email,
    },
    lastAdminAction: v.adminAction
      ? {
          action: v.adminAction.action,
          reason,
          adminId: v.adminAction.adminUserId ?? null,
          createdAt: v.adminAction.createdAt.toISOString(),
        }
      : null,
  };
}
