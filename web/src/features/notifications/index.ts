// US-071 (PB-P2-004). Barrel del feature `notifications` (surface organizer).
export { NotificationsBell } from './components/NotificationsBell';
export { NotificationItem } from './components/NotificationItem';
export { NotificationsFilterToggle } from './components/NotificationsFilterToggle';
export {
  NotificationsEmptyState,
  NotificationsErrorBanner,
  NotificationsLoadingState,
} from './components/NotificationsStates';
export { UnreadBadge, formatUnreadCount } from './components/UnreadBadge';
export { useNotifications, notificationsKeys } from './hooks/useNotifications';
export { notificationsApi } from './api/notificationsApi';
export type {
  ListNotificationsParams,
  ListNotificationsResult,
  NotificationChannelFilter,
  NotificationDto,
  NotificationStatus,
  NotificationStatusFilter,
} from './api/notificationsApi';
