// PrismaQuoteNotificationSenderAdapter (US-049 / BE-003). Doc 14 §7.1.
// Implementación Prisma del `QuoteNotificationSenderPort`. Persiste una row en `notifications`
// por cada envío. Cuando la use case corre en `prisma.$transaction`, se recibe `tx` y todas
// las inserciones (QR + N notificaciones) son atómicas: un fallo revierte todo (D9).
//
// `Notification.type` guarda el nombre del evento (`quote_request.created`) y
// `Notification.payload` envuelve `{ channel, deliveryStatus, event, ...payload }`
// (DEV-02 del execution record).
//
// Vive en `src/infrastructure/notifications/` (capa `app-infra`) para ser accesible desde
// cualquier módulo sin violar `boundaries/element-types` (ADR-ARCH-001).
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  NotifyInput,
  QuoteNotificationSenderPort,
} from '../../shared/application/quote-notification-sender.port.js';
import { prisma as defaultPrisma } from '../prisma/client.js';

export class PrismaQuoteNotificationSenderAdapter implements QuoteNotificationSenderPort {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async notify(input: NotifyInput): Promise<void> {
    const client: PrismaClient | Prisma.TransactionClient = input.tx ?? this.prisma;
    await client.notification.create({
      data: {
        userId: input.recipientUserId,
        type: input.event,
        payload: {
          channel: input.channel,
          deliveryStatus: input.deliveryStatus,
          event: input.event,
          ...input.payload,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
