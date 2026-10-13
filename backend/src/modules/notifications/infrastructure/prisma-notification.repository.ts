// Adapter Prisma genérico de `NotificationRepository<TInput>`, configurado por tipo con un
// `NotificationTypeSpec` (ver `notification-channels.ts`).
//
// `channel` y `languageCode` viajan dentro de `payload` (US-034 D-01). La idempotencia usa
// `$queryRaw` con parámetros ligados sobre `payload->>'<clave>'`, tras filtrar por
// `user_id + type`. Sin índice físico sobre el campo JSON en MVP (riesgo aceptado).
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  NotificationRepository,
  NotificationRepositoryOptions,
} from '../ports/notification-channels.port.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;

/** Claves de `T` cuyo valor es string. */
export type StringKeys<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T] & string;

export interface NotificationTypeSpec<TInput> {
  /** Valor de `notifications.type`. */
  type: string;
  /** Campo del input con el destinatario (`notifications.user_id`). */
  recipientKey: StringKeys<TInput>;
  /** Clave de `payload` usada por `exists` para la idempotencia. */
  idempotencyKey: StringKeys<TInput>;
  /** Campos del input copiados a `payload`, en este orden. */
  payloadKeys: readonly StringKeys<TInput>[];
}

export class PrismaNotificationRepository<TInput> implements NotificationRepository<TInput> {
  constructor(
    private readonly spec: NotificationTypeSpec<TInput>,
    private readonly prisma: AnyClient = defaultPrisma,
  ) {}

  async exists(
    userId: string,
    key: string,
    opts?: NotificationRepositoryOptions,
  ): Promise<boolean> {
    const client = opts?.tx ?? this.prisma;
    const rows = await client.$queryRaw<Array<{ exists: boolean }>>`
      SELECT 1 AS exists
      FROM notifications
      WHERE user_id = ${userId}::uuid
        AND type = ${this.spec.type}
        AND payload->>${this.spec.idempotencyKey}::text = ${key}
      LIMIT 1
    `;
    return rows.length > 0;
  }

  async create(input: TInput, opts?: NotificationRepositoryOptions): Promise<void> {
    const client = opts?.tx ?? this.prisma;
    const payload: Prisma.InputJsonObject = Object.fromEntries(
      this.spec.payloadKeys.map((k) => [k, input[k] as string]),
    );
    // El delegate `notification` acepta el mismo shape en `PrismaClient` y en
    // `TransactionClient`; el cast salva la diferencia de tipos internos de Prisma.
    await (client as PrismaClient).notification.create({
      data: {
        userId: input[this.spec.recipientKey] as string,
        type: this.spec.type,
        payload,
      },
    });
  }
}
