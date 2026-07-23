// US-072 (PB-P2-008 / BE-003). `MarkNotificationAsReadUseCase` — mark single con
// ownership + no-revelación 404 + idempotencia.
//
// Contrato:
//   * Notif inexistente → `NotificationNotFoundError` (AC-05).
//   * Notif ajena → `NotificationNotFoundError` (AC-04, política de no-revelación
//     `docs/19`; el controller mapea siempre a 404 sin distinguir el motivo).
//   * Notif propia + `read_at IS NULL` → UPDATE atómico (`affected=1`), retorna void.
//   * Notif propia + ya leída → `affected=0`, retorna void (AC-06 idempotencia).
//
// El use case NO expone al cliente ningún campo distinto de un `204 No Content`; el
// controller mapea el void a `res.status(204).end()`. Se reutiliza el
// `NotFoundError` compartido (shared kernel) — el error-handler global lo mapea a
// `404 RESOURCE_NOT_FOUND` uniforme sin distinguir "no existe" vs "ajena".
import type { MarkNotificationsRepository } from '../ports/mark-notifications.repository.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';

export interface MarkNotificationAsReadInput {
  notificationId: string;
  actorUserId: string;
}

export interface MarkNotificationAsReadResult {
  /** Filas afectadas por el UPDATE — `1` en happy path, `0` en idempotente. Para logs. */
  affected: number;
}

export class MarkNotificationAsReadUseCase {
  constructor(private readonly repo: MarkNotificationsRepository) {}

  async execute(
    input: MarkNotificationAsReadInput,
  ): Promise<MarkNotificationAsReadResult> {
    const snapshot = await this.repo.findOwnedById(input.notificationId);
    // Política de no-revelación (docs/19 / SEC-02): 404 idéntico para inexistente
    // y para ajena — evita enumeración de IDs privados.
    if (!snapshot || snapshot.userId !== input.actorUserId) {
      throw new NotFoundError('Notification not found');
    }
    if (snapshot.alreadyRead) {
      // Idempotencia AC-06: la notif propia ya leída retorna 204 sin update.
      return { affected: 0 };
    }
    return this.repo.markAsRead(input.notificationId, input.actorUserId);
  }
}
