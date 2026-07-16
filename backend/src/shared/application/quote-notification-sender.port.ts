// NotificationSenderPort (US-049 / BE-002). Doc 14 §4.2 / §7.1.
// Puerto de dominio para persistir notificaciones al recipient (in_app + email_simulated) en el
// flujo de creación de `QuoteRequest`. Vive en `src/shared/application/` para poder ser
// importado por módulos sin violar el boundary `boundaries/element-types` (ADR-ARCH-001).
//
// El adapter Prisma (BE-003) recibe la `Prisma.TransactionClient` cuando el envío ocurre dentro
// de la transacción de la use case (D9 — atomicidad).
//
// El schema físico de `notifications` (US-090/PB-P0-001) almacena `channel`, `event` y
// `deliveryStatus` dentro de `payload` (JSONB); `type` sirve como nombre del evento
// (`quote_request.created`). Ver execution record `US-049-execution.md` §9 DEV-02.
import type { Prisma } from '@prisma/client';

export type NotificationChannel = 'in_app' | 'email_simulated';
export type NotificationDeliveryStatus = 'delivered' | 'simulated' | 'failed';

export interface NotifyInput {
  channel: NotificationChannel;
  recipientUserId: string;
  event: string;
  deliveryStatus: NotificationDeliveryStatus;
  payload: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
}

export interface QuoteNotificationSenderPort {
  notify(input: NotifyInput): Promise<void>;
}
