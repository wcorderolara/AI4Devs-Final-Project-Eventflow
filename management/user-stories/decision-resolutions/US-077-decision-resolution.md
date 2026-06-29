# PO/BA Decision Resolution — US-077

## Source User Story File
management/user-stories/US-077-admin-moderate-review-panel.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-077-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-077 |
| Backlog Item | PB-P1-040 |
| Decisiones tomadas | 8 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Endpoint nuevo `GET /api/v1/admin/reviews`
```
Listado admin global de reseñas con filtros + cursor pagination. Distinto al de US-066 (público anonimizado por vendor). Admin tiene visibilidad universal sin filtro por vendor approved.
```

### D2 — Filtros disponibles
```
Query params:
- `status` (multi-valor, opcional): array de `published|hidden|removed|deleted`. Default: todos.
- `vendor_id` (uuid, opcional): filtro por vendor.
- `created_at_from` / `created_at_to` (ISO date, opcional): rango fechas.
- `rating_min` / `rating_max` (1..5, opcional): rango rating.
- `has_admin_action` (boolean, opcional): true muestra solo moderadas.
- `pageSize` (default 25, max 50).
- `cursor` (base64).
```

### D3 — Cursor pagination
```
Paridad con US-066. Cursor base64 `{created_at: ISO, id: uuid}`. Order `created_at DESC, id DESC`.
```

### D4 — Response shape admin
```
{
  items: [
    {
      id, rating, comment, status, created_at,
      author: { user_id, business_name? },
      vendor: { id, business_name, slug },
      event: { id, title },
      last_admin_action?: { action, reason, admin_id, admin_business_name?, created_at }
    }
  ],
  pagination: { next_cursor, page_size },
  total_count_estimate?: integer // opcional, según implementación
}

Admin ve PII completa (sin anonimato). last_admin_action solo si existe (review fue moderada).
```

### D5 — Sin bulk actions MVP
```
Cada acción de moderación es individual via US-067. Bulk select + apply out of scope MVP.
```

### D6 — Default sorting
```
`created_at DESC, id DESC`. Sin parámetro de sort en MVP.
```

### D7 — Componente shared
```
Reusar `ReviewModerationTable` y `ModerationDialog` ya definidos en spec de US-067. Esta US conecta el componente al endpoint nuevo (US-067 lo dejó preparado para consumir).
```

### D8 — Filtros multi-status
```
Query param `status` acepta múltiples valores via `status=published&status=hidden`. Validación Zod array. Zero values ⇒ ningún filter (todos).
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoint | Nuevo `GET /admin/reviews` global con filtros |
| 2 | Filtros | status (multi), vendor_id, fechas, rating range, has_admin_action |
| 3 | Pagination | Cursor base64 paridad US-066 |
| 4 | Shape | Admin ve PII completa + last_admin_action |
| 5 | Bulk | Out of MVP |
| 6 | Sort | created_at DESC fijo |
| 7 | Componente | Reusar de US-067 |
| 8 | Multi-status | Query array param |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-077-admin-moderate-review-panel.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
