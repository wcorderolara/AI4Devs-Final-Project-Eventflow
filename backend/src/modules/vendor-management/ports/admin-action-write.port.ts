// Port — persistencia mínima de `AdminAction` (US-041 / BE-002, AC-02).
// El módulo Admin formal aún no expone un port propio; este archivo define el contrato local para
// que el use case no dependa de Prisma. TODO: relocalizar cuando exista `modules/admin-governance`.
import type { Prisma } from '@prisma/client';

export interface AdminActionInput {
  action: string;
  targetEntity: string;
  targetId: string;
  /**
   * Actor efectivo — para acciones auto-disparadas por vendors/organizers, este es su userId.
   * Cuando la acción viene de un admin real, coincide con `adminUserId`.
   */
  actorUserId: string;
  actorRole: string;
  /** Solo si el actor es admin. Nullable para acciones auto-disparadas por otros roles. */
  adminUserId?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AdminActionWritePort {
  create(input: AdminActionInput, tx?: Prisma.TransactionClient): Promise<void>;
}
