// US-034 (PB-P2-004). Adapters del módulo `notifications`.
export { PrismaNotificationRepository, type NotificationTypeSpec } from './prisma-notification.repository.js';
export {
  LoggingSimulatedEmailAdapter,
  emailLogAllowedKeys,
  type SimulatedEmailLogger,
  type SimulatedEmailSpec,
} from './logging-simulated-email.adapter.js';
export { T7_NOTIFICATION, T7_EMAIL, T7_EMAIL_LOG_ALLOWED_KEYS } from './notification-channels.js';
