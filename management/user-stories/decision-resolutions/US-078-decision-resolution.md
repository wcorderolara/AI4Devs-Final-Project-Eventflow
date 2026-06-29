# PO/BA Decision Resolution — US-078

## Source User Story File
management/user-stories/US-078-admin-list-events-readonly.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-078-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-078 |
| Backlog Item | PB-P1-044 |
| Decisiones tomadas | 8 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — 2 endpoints
```
- GET /api/v1/admin/events (listado paginado con filtros)
- GET /api/v1/admin/events/:id (detalle completo)
```

### D2 — AdminAction(view_event) solo en GET detalle
```
GET listado: NO crea AdminAction (solo log estándar). Bajo ruido.
GET detalle: por cada acceso ⇒ INSERT admin_actions con:
{ admin_id, target_type='event', target_id, action='view_event', reason: null, payload: { accessed_at, ip?, user_agent? } }
```

### D3 — Filtros listado
```
Query params:
- `status` (multi): `draft|planning|in_progress|completed|cancelled`.
- `event_type_id` (uuid).
- `event_date_from/to` (ISO date).
- `organizer_search` (string ILIKE en email + business_name).
- `pageSize` (default 25, max 50).
- `cursor` (base64).
```

### D4 — Cursor pagination
```
Paridad US-077. Cursor `{event_date, id}`. Order `event_date DESC, id DESC`.
```

### D5 — Detail shape completo agregado
```
{
  event: { id, title, event_type_id, event_type_name, event_date, status, currency_code, location?, expected_attendees?, created_at, updated_at, completed_at? },
  organizer: { user_id, email, business_name?, phone? },
  counts: {
    tasks_total, tasks_completed,
    quote_requests_total, quote_requests_active,
    quotes_total, quotes_accepted,
    booking_intents_total, booking_intents_confirmed,
    reviews_total,
    ai_recommendations_total
  },
  budget_summary?: { total_planned, total_committed, over_committed }
}

NO incluye campos internos sensibles, ni listas completas de sub-entidades (counts solo). Sin endpoints de edición.
```

### D6 — Solo lectura enforcement
```
No existen endpoints admin de mutación sobre Event:
- NO POST /admin/events
- NO PATCH /admin/events/:id
- NO DELETE /admin/events/:id

Cualquier intento ⇒ `404` (endpoint inexistente, no expuesto en el router).

Validación arquitectónica: el módulo admin/events SOLO expone GETs.
```

### D7 — `404 EVENT_NOT_FOUND` uniforme
```
Evento inexistente ⇒ `404 EVENT_NOT_FOUND`. Admin tiene visibilidad universal; sin filtro ownership.
```

### D8 — AdminAction performance
```
1 INSERT por GET detalle. Aceptable para volumen MVP (~10 admins × ~100 views/día = 1000 inserts/día). 

Si rate crece significativamente post-MVP: considerar deduplication window (1 view per admin+event per hora) o batch inserts. Out of scope MVP.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoints | 2 (list + detail) |
| 2 | AdminAction | Solo en detail; action=view_event |
| 3 | Filtros | status multi + event_type_id + fechas + organizer search |
| 4 | Pagination | Cursor paridad US-077 |
| 5 | Detail | Event + organizer + counts agregados + budget summary |
| 6 | Solo lectura | No exponer endpoints de mutación |
| 7 | 404 | uniforme |
| 8 | Performance | 1 INSERT por detail; aceptable MVP |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-078-admin-list-events-readonly.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
