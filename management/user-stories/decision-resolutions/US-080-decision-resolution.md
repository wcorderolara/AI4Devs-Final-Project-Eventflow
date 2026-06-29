# PO/BA Decision Resolution — US-080

## Source User Story File
management/user-stories/US-080-admin-action-log-viewer.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-080-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-080 |
| Backlog Item | PB-P1-046 |
| Decisiones tomadas | 8 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Endpoint único
```
GET /api/v1/admin/admin-actions (listado paginado con filtros).
SIN detail endpoint (payload completo embebido en cada item).
```

### D2 — Filtros completos
```
Query params:
- `admin_id` (uuid).
- `target_type` (enum: 'review', 'vendor_profile', 'service_category', 'event_type', 'event', otros).
- `target_id` (uuid).
- `action` (string).
- `created_at_from/to` (ISO date).
- `pageSize` (default 25, max 50).
- `cursor` (base64).
```

### D3 — Cursor pagination
```
Paridad US-077. `{created_at, id}`. Order `created_at DESC, id DESC`.
```

### D4 — Response shape con admin info
```
{
  items: [
    {
      id: uuid,
      admin: { id: uuid, business_name?: string, email: string },
      target_type: string,
      target_id: uuid,
      action: string,
      reason: string | null,
      payload: object | null,
      created_at: ISO
    }
  ],
  pagination: { next_cursor, page_size }
}

Admin ve admin info completa (es panel de gobernanza).
```

### D5 — Inmutabilidad arquitectónica
```
Módulo `admin/admin-actions` SOLO expone GET. NO existen `POST/PATCH/DELETE`. Cualquier intento ⇒ 404 (endpoint inexistente).

INSERT en `admin_actions` tabla solo ocurre desde otros use cases (US-067 moderate review, US-047 moderate vendor, etc.). FR-ADMIN-006 enforcement.
```

### D6 — Self-log: NO crear AdminAction al consultar
```
Consultar el log NO crea AdminAction (sería loop: cada consulta del log crearía un AdminAction nuevo que aparecería en la siguiente consulta).

Solo log estándar `admin.admin_actions.viewed`.
```

### D7 — Admin role only (sin distinción granular MVP)
```
Solo `role='admin'`. Sin superadmin/auditor en MVP.

Post-MVP: considerar rol `auditor` con acceso read-only sin otros permisos admin.
```

### D8 — Sin search libre
```
MVP: solo filtros estructurados. Sin full-text search en `reason` o `payload` JSON.

Post-MVP: considerar JSONB query operators si necesario.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoints | 1 GET único |
| 2 | Filtros | admin_id + target_type + target_id + action + fechas |
| 3 | Pagination | Cursor paridad US-077 |
| 4 | Shape | items con admin info completa + payload embebido |
| 5 | Inmutabilidad | Solo GET expuesto |
| 6 | Self-log | NO crear AdminAction al consultar |
| 7 | Roles | Solo admin; superadmin out of MVP |
| 8 | Search | Filtros estructurados; full-text out of MVP |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-080-admin-action-log-viewer.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
