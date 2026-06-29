# User Story Refinement Review — US-079

## Source User Story File
management/user-stories/US-079-admin-operational-metrics-dashboard.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-079-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q8 resueltas. La US-079 declara `Backlog Item: PB-P1-045`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (FR-ADMIN-006/UC-ADMIN-007 inaplicables → FR-ADMIN-002+UC-ADMIN-002+BR-ADMIN-005+BR-MVP-003). 7 secciones agregadas + caching 60s + sin AdminAction + sin métricas comerciales. AC-01..AC-05, EC-01..EC-03, VR-01..VR-02, SEC-01..SEC-03, NT-01..NT-02, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-079 |
| Backlog Item | PB-P1-045 — Dashboard de métricas operativas admin |
| Epic | EPIC-ADM-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-079-refinement-review.md |

## 2. Diagnóstico

US-079 single-story de PB-P1-045. Dashboard de métricas operativas (Decisión PO 8.1 #10 + FR-ADMIN-002). Sin métricas comerciales/revenue.

### Hallazgos

1. **Trazabilidad**: cita `FR-ADMIN-006` (AdminAction inmutable, no aplica) y `UC-ADMIN-007` (admin gestiona EventType, no aplica). Correctos:
   - **`FR-ADMIN-002`** (dashboard métricas operativas).
   - **`UC-ADMIN-002`** (panel admin).
   - **`BR-ADMIN-005`** (panel + métricas).
   - `NFR-PERF-API-001` → `NFR-PERF-001`.
2. **Falta declarar `Backlog Item: PB-P1-045`**.
3. **ACs genéricos**.
4. **Métricas obligatorias per FR-ADMIN-002**:
   - Total usuarios + por rol (organizer/vendor/admin).
   - Vendors: pendientes / approved / rejected.
   - Eventos por estado (draft/planning/in_progress/completed/cancelled).
   - QuoteRequests created.
   - Quotes responded.
   - BookingIntents created (+ confirmed).
   - Reviews (published/hidden/removed).
   - AIRecommendations generadas.
5. **Sin AdminAction** (solo lectura agregada; FR-ADMIN-002 no requiere registro per acceso).
6. **Filtros temporales**: opcional para MVP. PO confirma.
7. **Caching**: queries agregadas pueden ser pesadas; considerar caching corto (60s).
8. **Sin métricas comerciales reales** (sin revenue, sin GMV).
9. **AI metrics breakdown**: ¿por feature (event plan, checklist, budget, brief)?
10. **Response shape**: estructura clara con secciones lógicas.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | PO | Métricas obligatorias | Todas las de FR-ADMIN-002 sin agregar comerciales. |
| Q2 | PO | Filtros temporales | MVP: snapshot actual (sin filtro time-range). Post-MVP: filtros 7/30/90 días. |
| Q3 | Tech | Caching | Sí: cache server-side 60s por TTL (key `admin:metrics:v1`). Reduce carga sobre queries agregadas. |
| Q4 | PO | AdminAction | NO requerido. Es solo lectura agregada. |
| Q5 | PO | AI metrics breakdown | Sí: total `ai_recommendations` + breakdown por `recommendation_type` (event_plan, checklist, budget, brief, etc.). |
| Q6 | Tech | Response shape | Secciones lógicas: `users`, `vendors`, `events`, `quotes`, `bookings`, `reviews`, `ai`, `generated_at` timestamp. |
| Q7 | Sec | Métricas comerciales | OUT: revenue, GMV, conversion rates monetarias. |
| Q8 | Tech | Performance | < 1s p95 con cache; < 3s sin cache. EXPLAIN ANALYZE en queries. |

## 9. Recomendación

`Needs Refinement` — 8 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
