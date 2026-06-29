# PO/BA Decision Resolution — US-076

## Source User Story File
management/user-stories/US-076-admin-manage-event-types.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-076-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-076 |
| Backlog Item | PB-P1-043 |
| Decisiones tomadas | 10 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — 5 endpoints REST estándar (paridad US-075)
```
- GET /api/v1/admin/event-types
- POST /api/v1/admin/event-types
- PATCH /api/v1/admin/event-types/:id
- DELETE /api/v1/admin/event-types/:id (soft delete con guard)
- GET /api/v1/event-types (público autenticado, solo activas)
```

### D2 — Listado shape
```
Admin: array completo con `is_active=false`.
Público: solo `is_active=true`.

Ordenado por `sort_order ASC, name_i18n.es-LATAM ASC`.
```

### D3 — i18n
```
`name_i18n jsonb NOT NULL` requiere `es-LATAM`. Otros opcionales fallback.
`description_i18n jsonb NULL` opcional.
```

### D4 — Soft delete con guard EXISTS events
```
DELETE:
1. `usageCount = COUNT(events WHERE event_type_id=:id)`.
2. Si > 0 ⇒ `409 EVENT_TYPE_IN_USE` con `details.usage_count`.
3. Sino: UPDATE `is_active=false`. NO hard delete (FR-ADMIN-007 + BR-EVENTTYPE-007).
```

### D5 — Reactivar
```
PATCH `is_active=true` permitido siempre. AdminAction action='reactivate'.
```

### D6 — AdminAction obligatorio
```
INSERT admin_actions por cada operación:
{ admin_id, target_type='event_type', target_id, action: create|update|soft_delete|reactivate, reason?, payload: snapshot }

Reason required en soft_delete [10..500]; opcional en otros.
```

### D7 — `404 EVENT_TYPE_NOT_FOUND` uniforme
```
EventType inexistente ⇒ `404 EVENT_TYPE_NOT_FOUND`.
```

### D8 — Endpoint público incluido
```
`GET /api/v1/event-types` autenticado (cualquier rol). Solo activas. Reusable en Event creation wizard (US-009), AI plan generation, etc.
```

### D9 — Code único + seed obligatorio
```
`code text UNIQUE NOT NULL`, slug-style.

Seed obligatorio (BR-EVENT-001 / FR-EVENT-013): 6 EventTypes con codes fijos:
- `wedding` (Boda)
- `xv` (XV años)
- `baptism` (Bautizo)
- `baby_shower` (Baby shower)
- `birthday` (Cumpleaños)
- `corporate` (Evento corporativo)

Cada uno con i18n 4 locales.
```

### D10 — Reorder via sort_order
```
PATCH `sort_order: integer >= 0`. Bulk reorder out of MVP.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoints | 5 REST estándar paridad US-075 |
| 2 | Listado | admin incluye inactivas; público solo activas |
| 3 | i18n | name_i18n + description_i18n jsonb |
| 4 | Soft delete | guard EXISTS events |
| 5 | Reactivar | PATCH is_active=true |
| 6 | AdminAction | obligatorio |
| 7 | 404 | uniforme |
| 8 | Endpoint público | incluido |
| 9 | Seed | 6 EventTypes obligatorios |
| 10 | Reorder | sort_order via PATCH |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-076-admin-manage-event-types.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
