// Barrel — feature admin/events (US-016).
export { adminEventsApi } from './api/adminEventsApi';
export type { AdminEventModel, AdminEventOwnerModel } from './api/adminEventsApi.types';
export { useAdminEvent, adminEventsKeys } from './hooks/useAdminEvent';
export { AdminEventViewer } from './components/AdminEventViewer';
export { ReadOnlyBadge } from './components/ReadOnlyBadge';
export { DeletedEventBanner } from './components/DeletedEventBanner';
export { AdminEventDetailPage } from './pages/AdminEventDetailPage';
