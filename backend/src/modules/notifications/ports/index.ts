// US-034 (PB-P2-004). Puertos del módulo `notifications`. Los adapters concretos viven
// en `infrastructure/`.
export {
  type NotificationRepository,
  type NotificationRepositoryOptions,
  type SimulatedEmailInput,
  type SimulatedEmailPort,
  type NotificationT7Repository,
  type CreateT7NotificationInput,
  type SimulatedT7EmailPort,
  type SimulatedT7EmailInput,
} from './notification-channels.port.js';
