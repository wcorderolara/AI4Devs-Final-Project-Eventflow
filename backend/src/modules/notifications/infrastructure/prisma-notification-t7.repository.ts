// US-034 (PB-P2-004 / BE-002). Adapter Prisma del puerto `NotificationT7Repository`.
//
// El schema físico de `notifications` no expone `channel` ni `language_code` como
// columnas: ambos viajan dentro de `payload` JSONB (D-01 execution record). Este
// adapter aisla ese detalle del use case.
//
// Idempotencia: `existsTaskDueSoonForTask` filtra primero por `user_id` + `type`
// (cubierto por `idx_notifications_user_status_sent (user_id, status, sent_at DESC)`)
// y luego evalúa el `payload->>'task_id'` vía `$queryRaw`. Sin índice físico sobre el
// campo JSON en MVP (tech spec §17, riesgo aceptado). Retorna `true` en cuanto
// encuentra una fila.
//
// Aceptación opcional de `tx: Prisma.TransactionClient` mantiene la escritura dentro
// de la misma transacción que abre el `EmitT7NotificationsUseCase` por chunk.
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateT7NotificationInput,
  NotificationT7Repository,
} from '../ports/notification-t7.repository.js';
import { NOTIFICATION_TYPE_TASK_DUE_SOON } from '../domain/index.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;

export class PrismaNotificationT7Repository implements NotificationT7Repository {
  constructor(private readonly prisma: AnyClient = defaultPrisma) {}

  async existsTaskDueSoonForTask(userId: string, taskId: string): Promise<boolean> {
    // `$queryRaw` con parámetros ligados: el `payload->>'task_id'` sigue como texto y
    // Postgres compara con el `taskId` (uuid) casteado a texto. Sin interpolación
    // insegura: los valores se pasan por `$1/$2`.
    const rows = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT 1 AS exists
      FROM notifications
      WHERE user_id = ${userId}::uuid
        AND type = ${NOTIFICATION_TYPE_TASK_DUE_SOON}
        AND payload->>'taskId' = ${taskId}
      LIMIT 1
    `;
    return rows.length > 0;
  }

  async create(input: CreateT7NotificationInput): Promise<void> {
    // `channel` y `languageCode` viajan en `payload` (D-01). `taskId` se preserva como
    // clave literal para que el `existsTaskDueSoonForTask` lo encuentre por
    // `payload->>'taskId'`.
    const payload: Prisma.InputJsonValue = {
      channel: input.channel,
      languageCode: input.languageCode,
      taskId: input.taskId,
      eventId: input.eventId,
      dueDate: input.dueDate,
    };

    // El delegate `notification` acepta el mismo shape en `PrismaClient` y en
    // `TransactionClient` — el cast es necesario porque las interfaces internas de
    // Prisma difieren aunque el shape público sea idéntico.
    await (this.prisma as PrismaClient).notification.create({
      data: {
        userId: input.userId,
        type: NOTIFICATION_TYPE_TASK_DUE_SOON,
        payload,
      },
    });
  }
}
