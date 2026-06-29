# PO/BA Decision Resolution — US-074

## Source User Story File
management/user-stories/US-074-admin-approve-reject-vendor-extended.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-074-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-074 |
| Backlog Item | PB-P1-041 |
| Decisiones tomadas | 8 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Endpoint nuevo `GET /api/v1/admin/vendors`
```
Listado admin global de VendorProfiles con filtros + cursor pagination. Distinto al de US-040 (público filtrado).
```

### D2 — Filtros disponibles
```
Query params:
- `status` (multi-valor): `pending|approved|rejected`. Default: todos.
- `is_hidden` (boolean): filter approved+hidden.
- `created_at_from/to` (ISO date): rango fechas.
- `business_name` (string, substring): ILIKE case-insensitive.
- `pageSize` (default 25, max 50).
- `cursor` (base64).
```

### D3 — Cursor pagination paridad US-077
```
Cursor base64 `{created_at, id}`. Order `created_at DESC, id DESC`.
```

### D4 — Response shape admin con last_admin_action
```
{
  items: [
    {
      id, business_name, slug, status, is_hidden, created_at,
      owner: { user_id, email },
      last_admin_action?: { action, reason, admin_id, created_at }
    }
  ],
  pagination: { next_cursor, page_size }
}

Admin ve PII completa (owner email) para contacto.
```

### D5 — Sort fijo + filtro default `status=pending`
```
Sort fijo `created_at DESC, id DESC` (paridad US-077). El frontend pre-aplica filtro `?status=pending` en la primera carga del panel (admin necesita ver pending primero). Admin puede cambiar el filtro libremente.
```

### D6 — Componentes UI nuevos
```
- `VendorModerationTable` (nuevo): tabla con columnas {business_name, status, is_hidden, owner.email, created_at, last_admin_action_action, actions}.
- `VendorModerationDialog` (nuevo): modal con action selector (approve/reject/hide/unhide) + reason textarea (required dinámico). Patrón análogo a `ModerationDialog` de US-067.
- `VendorFiltersPanel` (nuevo): controlled inputs con debounce 300ms.
- Hook `useModerateVendor`: TanStack mutation a endpoint de US-047 con invalidation `['admin.vendors']`.
```

### D7 — Business name search ILIKE
```
`WHERE business_name ILIKE '%' || :search || '%'`. Sin búsqueda full-text MVP. Performance aceptable hasta ~10k vendors; reconsiderar post-MVP.
```

### D8 — Sin bulk actions MVP
```
Cada moderación individual via US-047. Bulk select+apply out of scope.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoint | Nuevo GET admin/vendors |
| 2 | Filtros | status multi + is_hidden + fechas + business_name + cursor |
| 3 | Pagination | Cursor paridad US-077 |
| 4 | Shape | Admin con owner email + last_admin_action |
| 5 | Sort | created_at DESC + filtro default pending en FE |
| 6 | Componentes | 3 nuevos + hook reuso US-047 endpoint |
| 7 | Search | ILIKE substring |
| 8 | Bulk | Out of MVP |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-074-admin-approve-reject-vendor-extended.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
