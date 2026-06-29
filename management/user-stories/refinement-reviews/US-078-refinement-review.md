# User Story Refinement Review — US-078

## Source User Story File
management/user-stories/US-078-admin-list-events-readonly.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-078-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q8 resueltas. La US-078 declara `Backlog Item: PB-P1-044`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (FR-ADMIN-005/UC-ADMIN-006 inaplicables → FR-EVENT-010+FR-ADMIN-002/006+UC-ADMIN-002/009+BR-EVENT-014+BR-ADMIN-005/011). 2 endpoints (list + detail), AdminAction(view_event) solo en detail, sin endpoints de mutación expuestos. AC-01..AC-04, EC-01..EC-05, VR-01..VR-07, SEC-01..SEC-04, NT-01..NT-07, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-078 |
| Backlog Item | PB-P1-044 — Admin: listado de eventos en solo lectura |
| Epic | EPIC-ADM-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-078-refinement-review.md |

## 2. Diagnóstico

US-078 single-story de PB-P1-044. Admin lista + ve detalle de eventos en solo lectura, con `AdminAction(view_event)` por cada acceso a detalle (Decisión PO 8.1 #16 + FR-EVENT-010).

### Hallazgos

1. **Trazabilidad incorrecta**: cita `FR-ADMIN-005` (admin modera reseñas, no aplica) y `UC-ADMIN-006` (probable login). Correctos:
   - **`FR-EVENT-010`** (admin lista/consulta solo lectura).
   - **`FR-ADMIN-002`** (panel admin con métricas — referencia).
   - **`FR-ADMIN-006`** (AdminAction inmutable).
   - **`UC-ADMIN-002`** (panel admin).
   - **`BR-EVENT-014`** (admin lectura solo).
   - **`BR-ADMIN-005`** (panel + métricas).
   - **`BR-ADMIN-011`** (AdminAction obligatorio en moderación; aquí extendido a view_event).
   - `NFR-PERF-API-001` → `NFR-PERF-001`.
2. **Falta declarar `Backlog Item: PB-P1-044`**.
3. **ACs genéricos** — necesitan reescribirse.
4. **API**: 2 endpoints:
   - `GET /api/v1/admin/events` (listado paginado con filtros).
   - `GET /api/v1/admin/events/:id` (detalle).
5. **AdminAction(view_event)** SOLO en GET detalle, no en list (per backlog description). Cada acceso al detalle ⇒ INSERT AdminAction.
6. **Solo lectura**: cualquier endpoint admin de mutación sobre Event NO existe (FR-EVENT-010 prohibe edición).
7. **Filtros listado**: status (multi), event_type_id, fecha range, organizer search.
8. **Detail shape**: completo (event + organizer + tasks + budget + quotes count + booking_intents count + reviews count + AIRecommendations count).
9. **Cursor pagination** paridad US-077.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | 2 endpoints | `GET /admin/events` (listado) + `GET /admin/events/:id` (detalle). |
| Q2 | PO | AdminAction(view_event) | Sólo en GET detalle (no en list). INSERT AdminAction `{target_type='event', target_id, action='view_event', reason: null}`. List solo genera log estándar. |
| Q3 | PO | Filtros listado | `status` (multi), `event_type_id`, `event_date_from/to`, `organizer_search` (email/name ILIKE), `pageSize`, `cursor`. |
| Q4 | Tech | Cursor pagination | Paridad US-077. Default 25, max 50. |
| Q5 | PO | Detail shape | Completo: event + organizer (user info) + counts agregados (tasks, quotes, booking_intents, reviews, ai_recommendations). NO incluye campos internos sensibles ni edit endpoints. |
| Q6 | Sec | Solo lectura enforcement | No existen endpoints admin de UPDATE/DELETE sobre Event. Si cliente intenta PATCH/DELETE en `/admin/events/:id` ⇒ 404 (endpoint inexistente). |
| Q7 | Sec | 404 uniforme | Evento inexistente ⇒ `404 EVENT_NOT_FOUND`. |
| Q8 | Tech | AdminAction performance | Cada GET detalle = 1 INSERT. Aceptable. Si rate alto, considerar batch (out of MVP). |

## 9. Recomendación

`Needs Refinement` — 8 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
