// US-034 (PB-P2-004). Puertos del módulo `notifications` requeridos por
// `EmitT7NotificationsUseCase`. Los adapters concretos viven en `infrastructure/`.
export { type NotificationT7Repository, type CreateT7NotificationInput } from './notification-t7.repository.js';
export { type SimulatedT7EmailPort, type SimulatedT7EmailInput } from './simulated-t7-email.port.js';
