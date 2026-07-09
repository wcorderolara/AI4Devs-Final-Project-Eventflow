// Query DTO — Listado de eventos propios (US-095 / BE-001). AC-02; VR-10; EC-06.
// Los query params llegan como string → `z.coerce` para numéricos. Paginación acotada
// (pageSize máx 100). `sort` default `eventDate:asc`. Filtros por status/tipo/rango de fecha.
import { z } from 'zod';
import { EVENT_TYPE_CODES } from '../domain/event-type-codes.js';
import { EVENT_STATUSES } from '../domain/event-lifecycle.js';
import { eventDateSchema } from './create-event.request.js';

export const EVENT_SORT_OPTIONS = ['eventDate:asc', 'eventDate:desc', 'createdAt:asc', 'createdAt:desc'] as const;
export type EventSortOption = (typeof EVENT_SORT_OPTIONS)[number];

export const ListEventsQuerySchema = z
  .object({
    status: z.enum(EVENT_STATUSES).optional(),
    eventTypeCode: z.enum(EVENT_TYPE_CODES).optional(),
    eventDateFrom: eventDateSchema.optional(),
    eventDateTo: eventDateSchema.optional(),
    page: z.coerce.number().int().positive().max(10000).optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
    sort: z.enum(EVENT_SORT_OPTIONS).optional().default('eventDate:asc'),
  })
  .strict();

export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;
