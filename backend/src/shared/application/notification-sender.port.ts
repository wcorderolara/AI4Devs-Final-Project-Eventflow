// Shared kernel — NotificationSenderPort (US-090 / BE-003). Doc 14 §7.1.
// Puerto abstracto para el envío de notificaciones. El tipo del payload se refina en la
// feature story de notifications; aquí es `unknown` como placeholder tipado.
export interface NotificationSenderPort {
  send(notification: unknown): Promise<void>;
}
