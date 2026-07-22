// US-034 (PB-P2-004 / BE-002). Puerto `NotificationT7Repository`. Provee el chequeo de
// idempotencia por `payload.taskId` y la creación atómica de `Notification` (canal
// `in_app` + canal `email_simulated`) dentro de la transacción del use case.
//
// El schema físico no expone `channel` / `language_code`; ambos se persisten en `payload`
// (D-01 execution record). El adapter Prisma es responsable del mapeo.
import type { NotificationChannel } from '../domain/index.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export interface CreateT7NotificationInput {
  userId: string;
  channel: NotificationChannel;
  languageCode: SupportedLanguage;
  taskId: string;
  eventId: string;
  /** ISO date `YYYY-MM-DD` (calendario, sin hora). */
  dueDate: string;
}

export interface NotificationT7Repository {
  /**
   * Retorna `true` si ya existe una `Notification` con `user_id=userId`,
   * `type='task_due_soon'` y `payload.taskId=taskId`. Filtro estrecho sobre
   * `user_id + type` (cubierto por `idx_notifications_user_status_sent`), evaluación
   * final por payload en memoria/DB (aceptado en MVP — ver tech spec §17).
   */
  existsTaskDueSoonForTask(userId: string, taskId: string): Promise<boolean>;

  /**
   * Inserta una fila `notifications` para el par (user, task, channel). No hace check
   * de idempotencia — el caller (`EmitT7NotificationsUseCase`) es responsable de
   * invocar `existsTaskDueSoonForTask` antes.
   */
  create(input: CreateT7NotificationInput): Promise<void>;
}
