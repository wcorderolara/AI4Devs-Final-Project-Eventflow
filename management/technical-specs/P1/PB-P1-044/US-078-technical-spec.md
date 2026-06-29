# Technical Specification — US-078: Admin Events Read-Only

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-078 |
| Source User Story | `management/user-stories/US-078-admin-list-events-readonly.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-078-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-044 |
| Backlog Title | Admin: listado de eventos en solo lectura |
| Backlog Execution Order | 78 |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-078 |
| Epic | EPIC-ADM-001 |
| Backlog Item Dependencies | PB-P0-001, US-067, US-066/US-077 (cursor pattern) |
| Feature | 2 endpoints admin read-only + AdminAction(view_event) en detail |
| Module / Domain | Admin / Events |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-044 single-story. Execution order 78.

---

## 3. Executive Technical Summary

**Backend**:
- `ListEventsForAdminUseCase`: lectura paginada con cursor + filtros (status multi, event_type_id, fechas, organizer search ILIKE).
- `GetEventDetailForAdminUseCase`: lectura completa + counts agregados + INSERT AdminAction `action='view_event'` atómico.
- 2 Controllers admin (list + detail).
- AdminRoleGuard reuso US-067.
- **Arquitectura solo lectura**: módulo `admin/events` SOLO expone 2 GETs.

**Frontend**:
- `/admin/events` lista + `/admin/events/:id` detalle con counts cards.
- `adminApi.event.list/get`.

---

## 4. Scope Boundary

### In Scope
- 2 endpoints + 2 use cases + UI list + detail.
- AdminAction obligatorio en detail.

### Out of Scope
- Edición admin de eventos (FR-EVENT-010).
- Export.
- Drill-down completo de sub-entidades.
- Dedup window de view_event.

---

## 5. Architecture Alignment

Reuso de AdminGuard US-067 + cursor utility US-066. Nuevo módulo `admin/events`.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 list | UseCase paginado | BE, FE |
| AC-02 detail + AdminAction | UseCase con INSERT atómico | BE, DB |
| AC-03 solo lectura | Sin endpoints mutación expuestos | BE |
| AC-04 múltiples AdminActions | 1 INSERT por detail GET | BE |
| EC-01..05 | Validaciones | BE |

---

## 7. Backend Technical Design

### Use Case (List)

```ts
class ListEventsForAdminUseCase {
  async execute({ filters }) {
    const cursor = filters.cursor ? decodeCursor(filters.cursor) : null;
    const pageSize = filters.pageSize ?? 25;

    const where: any = {};
    if (filters.status?.length) where.status = { in: filters.status };
    if (filters.event_type_id) where.event_type_id = filters.event_type_id;
    if (filters.event_date_from || filters.event_date_to) {
      where.event_date = {};
      if (filters.event_date_from) where.event_date.gte = filters.event_date_from;
      if (filters.event_date_to) where.event_date.lte = filters.event_date_to;
    }
    if (filters.organizer_search?.trim()) {
      where.organizer = {
        OR: [
          { email: { contains: filters.organizer_search.trim(), mode: 'insensitive' } },
          { business_name: { contains: filters.organizer_search.trim(), mode: 'insensitive' } },
        ],
      };
    }
    if (cursor) {
      where.OR = [
        { event_date: { lt: cursor.event_date } },
        { event_date: cursor.event_date, id: { lt: cursor.id } },
      ];
    }

    const events = await prisma.events.findMany({
      where,
      orderBy: [{ event_date: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      include: {
        organizer: { select: { id: true, email: true, business_name: true } },
        event_type: { select: { id: true, name_i18n: true } },
      },
    });

    const hasMore = events.length > pageSize;
    const items = events.slice(0, pageSize).map(mapToAdminEventListItem);
    const nextCursor = hasMore
      ? encodeCursor({ event_date: items.at(-1).event_date, id: items.at(-1).id })
      : null;

    return { items, pagination: { next_cursor: nextCursor, page_size: pageSize } };
  }
}
```

### Use Case (Detail) — atómico con AdminAction

```ts
class GetEventDetailForAdminUseCase {
  async execute({ currentUser, eventId }) {
    return prisma.$transaction(async (tx) => {
      const event = await tx.events.findUnique({
        where: { id: eventId },
        include: {
          organizer: { select: { id: true, email: true, business_name: true, phone: true } },
          event_type: { select: { id: true, name_i18n: true } },
          budget: { select: { total_planned: true, total_committed: true } },
          _count: {
            select: {
              tasks: true,
              quote_requests: true,
              quotes: true,
              booking_intents: true,
              reviews: true,
              ai_recommendations: true,
            },
          },
        },
      });
      if (!event) throw new EventNotFoundError();

      // Counts adicionales con WHERE específicos
      const tasksCompleted = await tx.tasks.count({ where: { event_id: eventId, status: 'completed' } });
      const quoteRequestsActive = await tx.quote_requests.count({ where: { event_id: eventId, status: { in: ['sent', 'viewed', 'responded', 'preferred'] } } });
      const quotesAccepted = await tx.quotes.count({ where: { quote_request: { event_id: eventId }, status: 'accepted' } });
      const bookingIntentsConfirmed = await tx.booking_intents.count({ where: { quote: { quote_request: { event_id: eventId } }, status: 'confirmed_intent' } });

      // INSERT AdminAction
      await tx.admin_actions.create({
        data: {
          admin_id: currentUser.id,
          target_type: 'event',
          target_id: eventId,
          action: 'view_event',
          payload: { accessed_at: new Date().toISOString() },
        },
      });

      logger.info('admin.event.detail.viewed', { eventId, adminUserId: currentUser.id });

      return mapToAdminEventDetail({
        event, tasksCompleted, quoteRequestsActive, quotesAccepted, bookingIntentsConfirmed,
      });
    });
  }
}
```

### Routes
```ts
// SOLO 2 GETs en el módulo admin/events
router.get('/admin/events', adminRoleGuard, asyncHandler(controller.list));
router.get('/admin/events/:id', adminRoleGuard, asyncHandler(controller.detail));

// NO router.post/patch/delete — arquitectónicamente prohibido
```

### DTOs

```ts
const STATUS = z.enum(['draft', 'planning', 'in_progress', 'completed', 'cancelled']);

export const adminEventsQuery = z.object({
  status: z.union([STATUS, z.array(STATUS)]).optional().transform(toArray),
  event_type_id: z.string().uuid().optional(),
  event_date_from: z.coerce.date().optional(),
  event_date_to: z.coerce.date().optional(),
  organizer_search: z.string().min(1).max(100).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(25),
  cursor: z.string().optional(),
}).strict()
.refine(d => !d.event_date_from || !d.event_date_to || d.event_date_from <= d.event_date_to, { message: 'event_date_from must be <= event_date_to' });
```

### Error Handling
`400 INVALID_*`, `401`, `403`, `404 EVENT_NOT_FOUND`.

---

## 8. Frontend Technical Design

### Componentes

- Page `/admin/events`: `AdminEventTable` + `AdminEventFiltersPanel`.
- Page `/admin/events/:id`: `AdminEventDetailPage` con `EventCountsCards` + `BudgetSummaryReadOnly`.

### State Management
- List: `useInfiniteQuery` con queryKey `['admin.events', filters]`.
- Detail: `useQuery` con queryKey `['admin.event', id]`.

### i18n
`admin.event.list.*`, `admin.event.filters.*`, `admin.event.detail.*` en 4 locales.

---

## 9. API Contract

| Method | Endpoint | Response | Errors |
|---|---|---|---|
| GET | `/api/v1/admin/events` | `{items, pagination}` | 400, 401, 403 |
| GET | `/api/v1/admin/events/:id` | `{event, organizer, counts, budget_summary?}` | 400, 401, 403, 404 |

---

## 10. Database / Prisma Design

### Models Impacted
`Event` (read), `User` (read), `EventType` (read), `Budget` (read), `Task/QuoteRequest/Quote/BookingIntent/Review/AIRecommendation` (read for counts), `AdminAction` (insert en detail).

### Indexes
Verificar `(status, event_date DESC)`, `(event_type_id)`. Si no existen, considerar agregarlos.

### Migration
Sin migraciones obligatorias.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Admin only. AdminGuard. Sin endpoints de mutación expuestos.

## 13. Testing Strategy

### Unit
- DTOs + UseCases.

### Integration
- TS-01..TS-05 + verificación arquitectónica de ausencia de endpoints PATCH/DELETE.

### API
Supertest.

### Security
- Admin only.
- Verificar que NO existen endpoints admin de mutación.

### Performance
- List `< 500ms p95`.
- Detail `< 700ms p95` (counts multiplied).

---

## 14. Observability & Audit

Logs `admin.event.list.viewed` (estándar) + `admin.event.detail.viewed` + AdminAction(view_event) en detail.

---

## 15. Seed / Demo
Reuso. Verificar ~10 eventos en distintos estados para demo.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar 2 endpoints admin read-only | Documentar. | Actualizar. | No |
| `docs/14` | Documentar module admin/events con restricción arquitectónica | Documentar. | Actualizar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AdminAction volume alto | Audit table grow | Aceptable MVP; considerar dedup window post-MVP |
| Counts N+1 queries | Performance | Prisma `_count` + queries optimizadas con WHERE |
| Endpoint de mutación accidental añadido | Violación FR-EVENT-010 | Arquitectura solo expone GETs; verification test |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/admin/events/dto/admin-events.query.ts`
- `src/modules/admin/events/use-cases/list-events-for-admin.use-case.ts`
- `src/modules/admin/events/use-cases/get-event-detail-for-admin.use-case.ts`
- `src/modules/admin/events/mappers/admin-event.mapper.ts`
- `src/modules/admin/events/controllers/admin-event.controller.ts`
- `src/modules/admin/events/routes/admin-event.routes.ts` (SOLO 2 GETs)

**Frontend**:
- `app/[locale]/admin/events/page.tsx`
- `app/[locale]/admin/events/[id]/page.tsx`
- `components/admin/events/AdminEventTable.tsx`
- `components/admin/events/AdminEventFiltersPanel.tsx`
- `components/admin/events/AdminEventDetailPage.tsx`
- `components/admin/events/EventCountsCards.tsx`
- `lib/api/adminApi.ts` (extender)
- `messages/{4 locales}.json`

### Orden sugerido
1. DB-001.
2. DTOs + Mapper + UT.
3. 2 UseCases + UT.
4. Controller + 2 rutas.
5. Frontend API + MSW.
6. Páginas y componentes.
7. i18n.
8. Tests IT + AUTH + Security (no mutation) + Performance.
9. Documentación.

### Decisiones que no deben reabrirse
D1–D8.

### Qué no implementar
- Endpoints de mutación admin.
- Export.
- Drill-down completo.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 1 |
| BE | 4 |
| FE | 5 |
| QA | 5 |
| DOC | 1 |
| **Total** | 16 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Security clear (solo lectura) | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-078 entrega 2 endpoints admin solo lectura con AdminAction(view_event) en detail + audit trail completo. Arquitectura prohibe endpoints de mutación. PB-P1-044 cierra.
