// US-080 / BE-001 — Mapper: fila Prisma → `AdminActionListItem`. Whitelist explícita.
//
// Deviation DEV-1 (execution record): el spec pide `admin.business_name` pero `User` NO
// declara `businessName` (vive en `VendorProfile`, que los admins no tienen). Se mapea al
// campo más cercano disponible: `fullName ?? null`. Se preserva la clave `businessName` en
// el response shape para no romper el contrato del cliente.
//
// Deviation DEV-2 (execution record): `reason` y `payload` en el spec son claves separadas
// en la response, pero el schema los guarda dentro de `AdminAction.metadata` (Json). Se
// extrae `reason` si viene como string en metadata; el resto de metadata se expone como
// `payload`. Si `metadata` es null, ambos son `null`.
import type { Prisma } from '@prisma/client';

export interface AdminActionListItemAdmin {
  id: string | null;
  businessName: string | null;
  email: string | null;
}

export interface AdminActionListItem {
  id: string;
  admin: AdminActionListItemAdmin;
  target_type: string;
  target_id: string;
  action: string;
  reason: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export type AdminActionListRow = Prisma.AdminActionGetPayload<{
  select: {
    id: true;
    adminUserId: true;
    targetEntity: true;
    targetId: true;
    action: true;
    metadata: true;
    createdAt: true;
    adminUser: {
      select: {
        id: true;
        email: true;
        fullName: true;
      };
    };
  };
}>;

function splitReasonAndPayload(
  metadata: Prisma.JsonValue | null,
): { reason: string | null; payload: Record<string, unknown> | null } {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { reason: null, payload: null };
  }
  const obj = metadata as Record<string, unknown>;
  const rawReason = obj.reason;
  const reason = typeof rawReason === 'string' ? rawReason : null;
  const { reason: _drop, ...rest } = obj;
  return {
    reason,
    payload: Object.keys(rest).length > 0 ? rest : null,
  };
}

export function toAdminActionListItem(row: AdminActionListRow): AdminActionListItem {
  const { reason, payload } = splitReasonAndPayload(row.metadata);
  return {
    id: row.id,
    admin: {
      id: row.adminUser?.id ?? row.adminUserId ?? null,
      businessName: row.adminUser?.fullName ?? null,
      email: row.adminUser?.email ?? null,
    },
    target_type: row.targetEntity,
    target_id: row.targetId,
    action: row.action,
    reason,
    payload,
    created_at: row.createdAt.toISOString(),
  };
}
