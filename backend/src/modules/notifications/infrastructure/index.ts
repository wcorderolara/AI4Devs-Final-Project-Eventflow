// US-034 (PB-P2-004). Adapters del módulo `notifications`.
export { PrismaNotificationT7Repository } from './prisma-notification-t7.repository.js';
export {
  LoggingSimulatedT7EmailAdapter,
  T7_EMAIL_LOG_ALLOWED_KEYS,
  type T7EmailLogger,
} from './logging-simulated-t7-email.adapter.js';
