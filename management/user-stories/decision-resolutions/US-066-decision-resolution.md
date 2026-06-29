# PO/BA Decision Resolution — US-066

## Source User Story File
management/user-stories/US-066-view-reviews-on-vendor-profile.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-066-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-066 |
| Backlog Item | PB-P1-039 |
| Decisiones tomadas | 7 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Cursor pagination
```
Paridad con US-045: cursor base64 `{created_at: ISO8601, id: uuid}`. Default `pageSize=20`, max `50`. Query params:
- `pageSize` (opcional, default 20, range 1-50).
- `cursor` (opcional, base64 encoded).
```

### D2 — Reviewer display anonimizado por privacy
```
Cada item incluye:
- `id, rating, comment, created_at, status`.
- `event_title`: título del evento asociado (informativo).
- NO incluir `author_user_id`, `organizer_business_name`, `event_id` (privacy MVP).

Esto cubre BR-REVIEW-004 (visibilidad pública) sin exponer PII del organizer.
```

### D3 — Vendor status filter
```
- Anónimo / organizer / vendor (no admin): solo reviews de vendor con `vendor_profiles.status='approved'`. Otros vendor states ⇒ `404 VENDOR_NOT_FOUND`.
- Admin: ve reviews de cualquier vendor independientemente del status (para moderación).

Status de reviews mostrados: SOLO `status='published'`. Excluye `hidden` y `deleted`.
```

### D4 — Endpoint shape
```
GET /api/v1/vendors/:id/reviews?cursor=<b64>&pageSize=20

Response 200:
{
  vendor: {
    id, business_name, slug, status, rating_avg, reviews_count
  },
  items: [
    { id, rating, comment, event_title, created_at, status }
  ],
  pagination: { next_cursor: string|null, page_size }
}

Order: `created_at DESC, id DESC`.
```

### D5 — 404 uniforme
```
Vendor inexistente, suspendido, rejected, draft ⇒ `404 VENDOR_NOT_FOUND` uniforme (excepto admin que ve todo). Sin information leakage sobre el status real.
```

### D6 — Sin filtros adicionales en MVP
```
Out of scope MVP: filtro por rating, with_comment_only, fecha range. Sólo ordering por `created_at DESC`. Filtros se evaluarán post-MVP según métricas de uso.
```

### D7 — Index óptimo
```
DB-001 valida o crea:
`CREATE INDEX idx_reviews_vendor_published_created
   ON reviews (vendor_profile_id, created_at DESC)
   WHERE status = 'published';`

Cursor pagination eficiente sobre `(created_at, id)` con status filtrado.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Pagination | Cursor base64 paridad US-045 |
| 2 | Reviewer display | event_title + anonimato del organizer |
| 3 | Vendor filter | Solo approved (anónimo/org/vendor); admin ve todo |
| 4 | Response shape | `{vendor, items, pagination}` |
| 5 | 404 uniforme | Vendor inexistente o no-approved |
| 6 | Filtros | Out of MVP |
| 7 | Index | Parcial por (vendor_profile_id, created_at DESC) WHERE published |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-066-view-reviews-on-vendor-profile.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
