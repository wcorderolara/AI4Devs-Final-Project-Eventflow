// US-016 / BE-002 — Puerto append-only para registrar `AdminAction`.
// `AdminAction.metadata` (Json) transporta `correlation_id` mientras `admin_actions.correlation_id`
// no exista como columna dedicada (deviation D-01; escalado a US-099). Nunca UPDATE/DELETE.
import type { Prisma, PrismaClient } from '@prisma/client';

/** Cliente Prisma o transacción compatible para invocaciones dentro de `$transaction`. */
export type PrismaTx = PrismaClient | Prisma.TransactionClient;

export interface AdminActionCreateInput {
  adminUserId: string;
  action: 'view_event' | (string & Record<never, never>);
  targetEntity: 'event' | (string & Record<never, never>);
  targetId: string;
  correlationId: string | null;
  extraMetadata?: Record<string, unknown>;
}

export interface AdminActionRepository {
  /** Inserta un AdminAction en la transacción activa. Debe usarse dentro de `prisma.$transaction`. */
  create(tx: PrismaTx, input: AdminActionCreateInput): Promise<{ id: string; createdAt: Date }>;
}
