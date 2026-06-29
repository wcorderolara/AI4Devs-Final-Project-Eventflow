# Technical Specification — US-066: GET vendor reviews (cursor pagination + anonimato)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-066 |
| Source User Story | `management/user-stories/US-066-view-reviews-on-vendor-profile.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-066-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-039 |
| Backlog Title | Visualización de reseñas en perfil vendor |
| Backlog Execution Order | 66 |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-066 |
| Epic | EPIC-REV-001 |
| Backlog Item Dependencies | US-065, US-045 (cursor pattern), PB-P0-001 |
| Feature | Endpoint público con cursor pagination + anonimato organizer |
| Module / Domain | Reviews / Vendor |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-28 |
| Last Updated | 2026-06-28 |

---

## 2. Backlog Execution Context

PB-P1-039 single-story. Execution order 66.

---

## 3. Executive Technical Summary

**Backend**:
- `GetVendorReviewsUseCase`: lectura paginada con cursor base64; filtro `status='published'` (excepto admin); valida vendor `approved` (excepto admin).
- Mapper anonimizado (sin PII organizer).
- Controller `GET /api/v1/vendors/:id/reviews`.
- Sin migraciones; verificar index parcial.

**Frontend**:
- `ReviewList` infinite scroll con `AverageRating` arriba.
- `vendorsApi.reviews(id, {cursor, pageSize})` + MSW.

---

## 4. Scope Boundary

### In Scope
- UseCase + Controller + Mapper.
- Frontend list paginada + AverageRating.
- Tests + A11Y.

### Out of Scope
- Filtros avanzados.
- Búsqueda.
- Export.

---

## 5. Architecture Alignment

Reuso de cursor pagination pattern de US-045. Reuso de StarRating de US-065.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 lista + summary | UseCase + mapper | BE, FE |
| AC-02 cursor | Decode + WHERE created_at < cursor.created_at | BE |
| AC-03 anonimato | Mapper whitelist | BE |
| AC-04 exclusion hidden/deleted | WHERE status='published' | BE |
| AC-05 admin all | Conditional WHERE en rol admin | BE |
| EC-01..05 | Validaciones | BE |
| AUTH-TS-01..04 | Endpoint público + admin override | BE |

---

## 7. Backend Technical Design

### Use Case

```ts
class GetVendorReviewsUseCase {
  async execute({ currentUser, vendorId, query }) {
    const isAdmin = currentUser?.role === 'admin';

    const vendor = await prisma.vendor_profiles.findUnique({
      where: { id: vendorId },
      select: { id: true, business_name: true, slug: true, status: true, rating_avg: true, reviews_count: true },
    });
    if (!vendor) throw new VendorNotFoundError();
    if (!isAdmin && vendor.status !== 'approved') throw new VendorNotFoundError();

    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const pageSize = query.pageSize ?? 20;

    const where = {
      vendor_profile_id: vendorId,
      ...(isAdmin ? {} : { status: 'published' }),
      ...(cursor ? {
        OR: [
          { created_at: { lt: cursor.created_at } },
          { created_at: cursor.created_at, id: { lt: cursor.id } },
        ],
      } : {}),
    };

    const reviews = await prisma.reviews.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      include: { event: { select: { title: true } } },
    });

    const hasMore = reviews.length > pageSize;
    const items = reviews.slice(0, pageSize).map(mapToAnonymized);

    const nextCursor = hasMore
      ? encodeCursor({ created_at: items[items.length - 1].created_at, id: items[items.length - 1].id })
      : null;

    return {
      vendor,
      items,
      pagination: { next_cursor: nextCursor, page_size: pageSize },
    };
  }
}
```

### Mapper anonimizado

```ts
function mapToAnonymized(review): AnonReview {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    event_title: review.event.title,
    created_at: review.created_at.toISOString(),
    status: review.status,
  };
}
```

### Routes
```ts
router.get(
  '/vendors/:id/reviews',
  optionalAuthGuard, // permite anónimo + admin extiende
  asyncHandler(controller.getReviews.bind(controller))
);
```

### DTOs

```ts
export const vendorIdParam = z.object({ id: z.string().uuid() });
export const reviewsQuery = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
}).strict();
```

### Error Handling
`400 INVALID_UUID`, `400 INVALID_CURSOR`, `400 INVALID_PAGE_SIZE`, `404 VENDOR_NOT_FOUND`.

---

## 8. Frontend Technical Design

- `ReviewList` (Client Component): TanStack `useInfiniteQuery` con queryKey `['vendor.reviews', vendorId]`.
- `AverageRating`: muestra `rating_avg` + `reviews_count` con `StarRating` (reuso US-065).
- `ReviewListItem`: card con stars + comment + event_title + created_at relativo.
- `LoadMoreButton`: dispara `fetchNextPage()`.
- Empty state: ilustración + texto i18n.

---

## 9. API Contract

| Method | Endpoint | Query | Response | Errors |
|---|---|---|---|---|
| GET | `/api/v1/vendors/:id/reviews` | `cursor?`, `pageSize?` (1-50, default 20) | `200 {vendor, items, pagination}` | 400, 404 VENDOR_NOT_FOUND |

---

## 10. Database / Prisma Design

### Models Impacted
`Review` (read), `VendorProfile` (read), `Event` (read for title).

### Index
```sql
CREATE INDEX IF NOT EXISTS idx_reviews_vendor_published_created
  ON reviews (vendor_profile_id, created_at DESC, id DESC)
  WHERE status = 'published';
```

Para admin (que ve todos status), reuso del index general o full scan aceptable.

### Migration
Migración menor solo si index no existe.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design

- Endpoint público.
- Filter `status='published'` por defecto.
- Admin extiende a todos status.
- Mapper anonimiza PII.

## 13. Testing Strategy

### Unit
- DTOs + Mapper (anonimato) + UseCase branches (admin vs no, vendor states).

### Integration
- TS-01..TS-06 + cursor pagination + admin override.

### API
- Supertest.

### Security
- `404 VENDOR_NOT_FOUND` uniforme.
- Anonimato verificado (no PII en response).

### Accessibility
- StarRating + lista con aria.

### Performance
- `< 500ms` p95 con cursor.

---

## 14. Observability & Audit
Log estándar.

---

## 15. Seed / Demo
Reuso de seeds de US-065. Verificar suficientes reviews para paginación.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint reviews | Documentar. | Actualizar. | No |
| PB-P1-039 Traceability | El backlog cita `FR-REVIEW-003` (unicidad) incorrecto | Trazabilidad real registrada | Housekeeping del backlog. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cursor inválido | UX rota | DTO validation + `400` claro |
| PII leak en mapper | Privacy | Tests de seguridad explícitos |
| N+1 query con event.title | Performance | Include en la query |
| Index ausente | Latencia | DB-001 evalúa |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/reviews/dto/reviews.query.ts` (nuevo)
- `src/modules/reviews/use-cases/get-vendor-reviews.use-case.ts` (nuevo)
- `src/modules/reviews/mappers/anonymized-review.mapper.ts` (nuevo)
- `src/modules/reviews/controllers/vendor-reviews.controller.ts` (nuevo)
- `src/modules/reviews/routes/vendor-reviews.routes.ts` (nuevo)
- `src/shared/cursor.ts` (reuso de US-045)

**Frontend**:
- `app/[locale]/vendors/[slug]/page.tsx` (extender para incluir ReviewList)
- `components/vendor/profile/ReviewList.tsx` (nuevo)
- `components/vendor/profile/AverageRating.tsx` (nuevo)
- `components/vendor/profile/ReviewListItem.tsx` (nuevo)
- `lib/api/vendorsApi.ts` (extender con `reviews(id, query)`)
- `messages/{4 locales}.json` (`vendor.profile.reviews.*`)

### Orden sugerido
1. DB-001 (index).
2. DTOs + Mapper + UT.
3. UseCase + UT.
4. Controller + ruta.
5. Frontend API + MSW.
6. Componentes + i18n.
7. Tests IT + A11Y + Security (anonimato).
8. Documentación.

### Decisiones que no deben reabrirse
D1–D7.

### Qué no implementar
- Filtros avanzados.
- Búsqueda.
- Endpoint admin-only separado (admin usa el mismo endpoint).

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 1 |
| BE | 5 |
| FE | 4 |
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
| Security clear | Pass |
| Privacy clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-066 entrega endpoint público de reviews con cursor pagination + anonimato organizer + admin sees-all. Sin migraciones obligatorias.
