// API pública de la feature events (US-009..US-014). Sin imports profundos entre features.
export { EventsListPage } from './pages/EventsListPage';
export { EventDashboardPage } from './pages/EventDashboardPage';
export { CreateEventPage } from './pages/CreateEventPage';
export { EditEventPage } from './pages/EditEventPage';
export { CreateEventWizard } from './components/CreateEventWizard';
export { EditEventForm } from './components/EditEventForm';
export { EventActions } from './components/EventActions';
export { EventFilters } from './components/EventFilters';
export { EventStatusBadge } from './components/EventStatusBadge';
export { ConfirmDialog } from './components/ConfirmDialog';
export { eventsApi } from './api/eventsApi';
export {
  useEventsList,
  useEvent,
  useEventTypes,
  useLocations,
  eventsKeys,
} from './hooks/useEventsQueries';
export {
  useCreateEvent,
  useUpdateEvent,
  useCancelEvent,
  useDeleteEvent,
} from './hooks/useEventsMutations';
export {
  createEventSchema,
  updateEventSchema,
  type CreateEventFormValues,
  type UpdateEventFormValues,
} from './schemas/eventSchemas';
export type {
  EventModel,
  EventStatus,
  EventTypeCode,
  ListEventsParams,
  CreateEventRequestDTO,
  UpdateEventRequestDTO,
} from './api/eventsApi.types';
