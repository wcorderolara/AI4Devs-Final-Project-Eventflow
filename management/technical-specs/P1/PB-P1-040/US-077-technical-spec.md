# Technical Specification — US-077: Admin Review Panel (list + filters)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-077 |
| Source User Story | `management/user-stories/US-077-admin-moderate-review-panel.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-077-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-040 |
| Backlog Title | Moderación admin de reseñas (soft delete) |
| Backlog Execution Order | 68 |
| User Story Position in Backlog Item | 2 de 2 |
| Related User Stories in Backlog Item | US-067, US-077 |
| Epic | EPIC-REV-001 / EPIC-ADM-001 |
| Backlog Item Dependencies | US-067, US-066 (cursor pattern) |
| Feature | Endpoint admin global + UI panel |
| Module / Domain | Admin / Reviews |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-28 |
| Last Updated | 2026-06-28 |

---

## 2. Backlog Execution Context

PB-P1-040 multi-story. US-077 cierra. Execution order 68.

---

## 3. Executive Technical Summary

**Backend**:
- `ListReviewsForAdminUseCase`: lectura paginada con cursor + filtros combinados (status multi, vendor_id, fechas, rating range, has_admin_action).
- Includes: author (user), vendor_profile, event, last admin_action (subquery).
- Controller `GET /api/v1/admin/reviews`.
- Reuso de AdminRoleGuard (US-067).

**Frontend**:
- Page `/admin/reviews` integra `ReviewModerationTable` + `ReviewFiltersPanel` + `ModerationDialog` (reuso US-067).
- `adminApi.review.list(filters)` + MSW.

---

## 4. Scope Boundary

### In Scope
- UseCase + DTO filtros + Controller.
- Frontend page + filtros + integración.
- Tests + regresión.

### Out of Scope
- Bulk actions, exports, full-text search, AI-assisted filtros.

---

## 5. Architecture Alignment

Reuso máximo de US-066 (cursor) + US-067 (componentes y guard).

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 listado paginado | UseCase + cursor | BE |
| AC-02 filtros combinados | DTO + WHERE compuesto | BE |
| AC-03 admin PII completa | Mapper sin anonimato | BE |
| AC-04 UI panel | Page + integración | FE |
| AC-05 refresh post-moderate | TanStack invalidate desde useModerateReview | FE |
| EC-01..04 | Validaciones | BE |
| AUTH-TS-01..04 | AdminGuard reuso | BE |

---

## 7. Backend Technical Design

### Use Case

```ts
class ListReviewsForAdminUseCase {
  async execute({ filters }) {
    const cursor = filters.cursor ? decodeCursor(filters.cursor) : null;
    const pageSize = filters.pageSize ?? 25;

    const where: any = {};
    if (filters.status?.length) where.status = { in: filters.status };
    if (filters.vendor_id) where.vendor_profile_id = filters.vendor_id;
    if (filters.created_at_from || filters.created_at_to) {
      where.created_at = {};
      if (filters.created_at_from) where.created_at.gte = filters.created_at_from;
      if (filters.created_at_to) where.created_at.lte = filters.created_at_to;
    }
    if (filters.rating_min || filters.rating_max) {
      where.rating = {};
      if (filters.rating_min) where.rating.gte = filters.rating_min;
      if (filters.rating_max) where.rating.lte = filters.rating_max;
    }
    if (filters.has_admin_action === true) where.admin_action_id = { not: null };
    if (filters.has_admin_action === false) where.admin_action_id = null;

    if (cursor) {
      where.OR = [
        { created_at: { lt: cursor.created_at } },
        { created_at: cursor.created_at, id: { lt: cursor.id } },
      ];
    }

    const reviews = await prisma.reviews.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      include: {
        author: { select: { id: true, business_name: true } },
        vendor_profile: { select: { id: true, business_name: true, slug: true } },
        event: { select: { id: true, title: true } },
        admin_action: { select: { action: true, reason: true, admin_id: true, created_at: true } },
      },
    });

    const hasMore = reviews.length > pageSize;
    const items = reviews.slice(0, pageSize).map(mapToAdminReview);

    const nextCursor = hasMore
      ? encodeCursor({ created_at: items[items.length - 1].created_at, id: items[items.length - 1].id })
      : null;

    return { items, pagination: { next_cursor: nextCursor, page_size: pageSize } };
  }
}
```

### Mapper

```ts
function mapToAdminReview(r): AdminReviewListItem {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    status: r.status,
    created_at: r.created_at.toISOString(),
    author: r.author,
    vendor: r.vendor_profile,
    event: r.event,
    last_admin_action: r.admin_action ? {
      action: r.admin_action.action,
      reason: r.admin_action.reason,
      admin_id: r.admin_action.admin_id,
      created_at: r.admin_action.created_at.toISOString(),
    } : null,
  };
}
```

### Routes
```ts
router.get(
  '/admin/reviews',
  adminRoleGuard, // reuso US-067
  asyncHandler(controller.list.bind(controller))
);
```

### DTOs

```ts
const STATUS = z.enum(['published', 'hidden', 'removed', 'deleted']);

export const adminReviewsQuery = z.object({
  status: z.union([STATUS, z.array(STATUS)]).optional().transform(toArray),
  vendor_id: z.string().uuid().optional(),
  created_at_from: z.coerce.date().optional(),
  created_at_to: z.coerce.date().optional(),
  rating_min: z.coerce.number().int().min(1).max(5).optional(),
  rating_max: z.coerce.number().int().min(1).max(5).optional(),
  has_admin_action: z.coerce.boolean().optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(25),
  cursor: z.string().optional(),
}).strict()
.refine(d => !d.rating_min || !d.rating_max || d.rating_min <= d.rating_max, { message: 'rating_min must be <= rating_max' })
.refine(d => !d.created_at_from || !d.created_at_to || d.created_at_from <= d.created_at_to, { message: 'created_at_from must be <= created_at_to' });
```

### Error Handling
`400 INVALID_FILTERS`, `400 INVALID_CURSOR`, `400 INVALID_PAGE_SIZE`, `400 INVALID_UUID`, `401`, `403`.

---

## 8. Frontend Technical Design

### Componentes

- Page `/admin/reviews` (Server Component shell + Client island).
- `ReviewFiltersPanel` (Client): controlled inputs para todos los filtros, dispara invalidate con debounce.
- `ReviewModerationTable` (reuso US-067).
- `ModerationDialog` (reuso US-067).
- `Pagination` con "Cargar más" cursor-based.

### State Management
- `useInfiniteQuery` con queryKey `['admin.reviews', filters]`.
- `useModerateReview` (US-067) con `onSuccess` invalidate `['admin.reviews']`.

### Forms
RHF + Zod alineado con backend.

### i18n
`admin.review.panel.*`, `admin.review.filters.*`, `admin.review.actions.*` (4 locales).

---

## 9. API Contract

| Method | Endpoint | Query | Response | Errors |
|---|---|---|---|---|
| GET | `/api/v1/admin/reviews` | filtros + cursor + pageSize | `200 {items, pagination}` | 400, 401, 403 |

---

## 10. Database / Prisma Design

### Models Impacted
`Review` (read), `User` (read for author), `VendorProfile` (read), `Event` (read), `AdminAction` (read).

### Index
Reuso. Considerar `(status, created_at DESC)` general si no existe.

### Migration
Sin migraciones obligatorias.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Admin only. AdminGuard reuso US-067.

## 13. Testing Strategy

### Unit
- DTO filtros (multi-status, rating range, fechas, has_admin_action).
- Mapper.
- UseCase WHERE compuesto.

### Integration
- TS-01..TS-06 + regresión US-067 (acción moderate continúa funcional).

### API
Supertest.

### Security
- Admin only verificado.

### Accessibility
- Filtros + tabla.

### Performance
- `< 500ms` p95 con filtros combinados.

---

## 14. Observability & Audit
Log estándar.

---

## 15. Seed / Demo
Reuso. Verificar suficientes reviews multi-status para demo del filtrado.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint admin reviews list | Documentar. | Actualizar. | No |
| `docs/14` | Documentar panel admin | Documentar. | Actualizar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Filtros combinados sin index | Latencia | Reuso index existentes; considerar new si necesario |
| WHERE muy complejo | Performance | EXPLAIN ANALYZE en QA-005 |
| Refresh post-moderate ruidoso | UX | Invalidate específico con queryKey filters |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/reviews/dto/admin-reviews.query.ts` (nuevo)
- `src/modules/reviews/use-cases/list-reviews-for-admin.use-case.ts` (nuevo)
- `src/modules/reviews/mappers/admin-review.mapper.ts` (nuevo)
- `src/modules/reviews/controllers/admin-review.controller.ts` (extender con `list`)
- `src/modules/reviews/routes/admin-review.routes.ts` (extender)

**Frontend**:
- `app/[locale]/admin/reviews/page.tsx` (nuevo)
- `components/admin/reviews/ReviewFiltersPanel.tsx` (nuevo)
- `lib/api/adminApi.ts` (extender con `review.list`)
- `messages/{4 locales}.json` (`admin.review.panel.*`, `admin.review.filters.*`)

### Orden sugerido
1. DTO + Mapper + UT.
2. UseCase + UT.
3. Controller + ruta.
4. Frontend API + MSW.
5. Filters panel + Page.
6. i18n.
7. Tests IT + regresión US-067 + AUTH + A11Y.
8. Documentación.

### Decisiones que no deben reabrirse
D1–D8.

### Qué no implementar
- Bulk actions, exports, full-text search.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 1 |
| BE | 4 |
| FE | 4 |
| QA | 5 |
| DOC | 1 |
| **Total** | 15 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Reuso clear | Pass |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-077 cierra PB-P1-040 con panel admin global con filtros combinados y reuso máximo de US-066 (cursor) + US-067 (componentes + guard + endpoint moderate). Sin nuevas migraciones.
