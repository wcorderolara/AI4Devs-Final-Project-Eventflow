# User Story Refinement Review — US-076

## Source User Story File
management/user-stories/US-076-admin-manage-event-types.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-076-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q10 resueltas. La US-076 declara `Backlog Item: PB-P1-043`, `PO/BA Decisions Applied` D1–D10, trazabilidad corregida (FR-ADMIN-003/UC-ADMIN-004 inaplicables → FR-ADMIN-007+FR-EVENT-013+UC-ADMIN-007; NFR-PERF-API-001→NFR-PERF-001; agregados BR-EVENTTYPE-001+BR-ADMIN-002/011+BR-EVENT-004). 5 endpoints REST estándar paridad US-075, sin jerarquía, soft delete con guard EXISTS events, seed obligatorio 6 EventTypes (FR-EVENT-013). AC-01..AC-05, EC-01..EC-05, VR-01..VR-09, SEC-01..SEC-05, TS-01..TS-06, NT-01..NT-06, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-076 |
| Backlog Item | PB-P1-043 — Gestión de EventType (sin hard delete con eventos) |
| Epic | EPIC-ADM-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-076-refinement-review.md |

## 2. Diagnóstico

US-076 single-story de PB-P1-043. CRUD admin de EventType + bloqueo de hard delete (Decisión PO 8.1 #17 + FR-ADMIN-007 + BR-EVENTTYPE-007). Pattern análogo a US-075 (ServiceCategory) pero **sin jerarquía** y guard sobre `events`.

### Hallazgos

1. **Trazabilidad**: cita `FR-ADMIN-003` (admin approve vendor, no aplica) y `UC-ADMIN-004` (idem). Correctos:
   - **`FR-ADMIN-007`** (admin gestiona EventType controlado).
   - **`FR-EVENT-013`** (associate event a EventType activo).
   - **`UC-ADMIN-007`** (admin gestiona EventType + ServiceCategory).
   - **`BR-EVENTTYPE-007`** (no hard delete con eventos).
   - **`BR-ADMIN-002/011/012`** (admin governance + audit).
   - `BR-EVENT-014` referenciado en US: confirmar (probable referencia auxiliar).
   - `NFR-PERF-API-001` → `NFR-PERF-001`.
2. **Falta declarar `Backlog Item: PB-P1-043`**.
3. **ACs genéricos** — necesitan reescribirse.
4. **API**: 5 endpoints REST estándar paridad US-075 (4 admin + 1 público).
5. **Sin jerarquía** (diferencia con US-075).
6. **Soft delete con guard EXISTS events**: si `events.event_type_id` existe ⇒ `409 EVENT_TYPE_IN_USE`. Sino, `is_active=false`. NO hard delete físico.
7. **AdminAction obligatorio** (BR-ADMIN-011).
8. **i18n**: `name_i18n` requerido es-LATAM + fallback.
9. **Endpoint público**: `GET /event-types` (autenticado) ya existe o se incluye en esta US.
10. **Sort_order** para ordenamiento del select de Event creation.
11. **Lista fija de 6 EventTypes** (wedding, xv, baptism, baby_shower, birthday, corporate) per FR-EVENT-013, pero admin puede CRUD adicionales. Seed cubre los 6 obligatorios.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | 5 endpoints REST estándar | Paridad US-075: GET, POST, PATCH, DELETE admin + GET público. Reorder via PATCH sort_order. |
| Q2 | PO | Listado shape | Admin: incluye `is_active=false`. Público: solo activas. |
| Q3 | PO | i18n | `name_i18n` requerido es-LATAM + `description_i18n` opcional. |
| Q4 | Tech | Soft delete con guard | `EXISTS events WHERE event_type_id=:id` ⇒ `409 EVENT_TYPE_IN_USE` con `details.usage_count`. Sino `is_active=false`. NO hard delete. |
| Q5 | PO | Reactivar | PATCH `is_active=true` permitido. |
| Q6 | Tech | AdminAction obligatorio | `target_type='event_type'`, action `create/update/soft_delete/reactivate`. Reason required en soft_delete [10..500]. |
| Q7 | Sec | 404 uniforme | `404 EVENT_TYPE_NOT_FOUND` uniforme. |
| Q8 | PO | Endpoint público | Incluido en esta US: `GET /api/v1/event-types` (autenticado, solo activas). |
| Q9 | PO | Code único + seed | Code slug único. Seed: 6 EventTypes obligatorios (wedding, xv, baptism, baby_shower, birthday, corporate) per FR-EVENT-013. |
| Q10 | PO | Reorder | Via PATCH sort_order; bulk reorder out of MVP. |

## 9. Recomendación

`Needs Refinement` — 10 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
