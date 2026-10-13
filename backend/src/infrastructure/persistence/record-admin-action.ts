// Escritura append-only de `admin_actions` (BR-ADMIN-011) para las acciones de un admin
// (catálogos, moderación de reviews/vendors, lectura auditada de eventos). Nunca UPDATE/DELETE.
//
// `correlationId` viaja dentro de `metadata` (deviation D-01 de US-016, escalada a US-099),
// antepuesto al snapshot propio de cada acción. Las acciones con actor explícito de US-041
// usan la columna dedicada y su propio adapter (`PrismaAdminActionWriteAdapter`).
import type { Prisma } from '@prisma/client';

/** Cliente Prisma o transacción: basta con el delegate `adminAction`. */
export type AdminActionClient = Pick<Prisma.TransactionClient, 'adminAction'>;

export interface RecordAdminActionInput {
  adminUserId: string;
  action: string;
  targetEntity: string;
  targetId: string;
  /** Se persiste como `metadata.correlationId` (`null` si falta). */
  correlationId?: string | null;
  /** Snapshot de la acción; se fusiona en `metadata` después de `correlationId`. */
  metadata?: Record<string, unknown>;
  /** Sólo se escribe la columna si se indica (default de BD: `false`). */
  isSeed?: boolean;
}

export async function recordAdminAction(
  client: AdminActionClient,
  input: RecordAdminActionInput,
): Promise<{ id: string }> {
  const { correlationId, metadata, isSeed, ...columns } = input;
  return client.adminAction.create({
    data: {
      ...columns,
      metadata: { correlationId: correlationId ?? null, ...metadata } as Prisma.InputJsonObject,
      ...(isSeed === undefined ? {} : { isSeed }),
    },
    select: { id: true },
  });
}
