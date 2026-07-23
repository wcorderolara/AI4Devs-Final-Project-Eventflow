// US-072 (PB-P2-008 / BE-004). `MarkAllNotificationsAsReadUseCase` — mark-all bulk
// global con filtro `channel` (D4, default `in_app`).
//
// Contrato:
//   * SIEMPRE aisla por `WHERE user_id = $sessionUserId` (BR-NOTIF-005 / SEC-02).
//   * 0 filas afectadas → retorna `{ affected: 0 }` sin error (EC-02).
//   * Log `info` estructurado opcional `notif.markAllAsRead` con `{ userId, channel,
//     affected, correlationId }` sin PII, para métrica auditable.
import type { MarkNotificationsRepository } from '../ports/mark-notifications.repository.js';
import type { ListNotificationsChannel } from '../interface/http/list-notifications.query.schema.js';

/** Contrato mínimo del logger — mismo shape que los handlers de US-068..US-070. */
export interface MarkAllAsReadLogger {
  info(payload: Record<string, unknown>): void;
}

export interface MarkAllNotificationsAsReadInput {
  actorUserId: string;
  channel: ListNotificationsChannel;
  correlationId?: string;
}

export interface MarkAllNotificationsAsReadResult {
  affected: number;
}

export interface MarkAllNotificationsAsReadDeps {
  repo: MarkNotificationsRepository;
  logger?: MarkAllAsReadLogger;
}

export class MarkAllNotificationsAsReadUseCase {
  constructor(private readonly deps: MarkAllNotificationsAsReadDeps) {}

  async execute(
    input: MarkAllNotificationsAsReadInput,
  ): Promise<MarkAllNotificationsAsReadResult> {
    const { repo, logger } = this.deps;
    const result = await repo.markAllAsReadForUser(input.actorUserId, input.channel);
    logger?.info({
      event: 'notif.markAllAsRead',
      correlationId: input.correlationId,
      userId: input.actorUserId,
      channel: input.channel,
      affected: result.affected,
    });
    return result;
  }
}
