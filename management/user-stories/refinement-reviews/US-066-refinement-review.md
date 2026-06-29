# User Story Refinement Review — US-066

## Source User Story File
management/user-stories/US-066-view-reviews-on-vendor-profile.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-066-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q7 resueltas. La US-066 declara `Backlog Item: PB-P1-039`, `PO/BA Decisions Applied` D1–D7, trazabilidad corregida (`FR-REVIEW-002`→`FR-REVIEW-010` + `FR-VENDOR-013`; `NFR-PERF-API-001`→`NFR-PERF-001`; agregados `BR-REVIEW-004/009`). Endpoint `GET /vendors/:id/reviews` con cursor pagination paridad US-045 + anonimato organizer + admin sees-all. AC-01..AC-05, EC-01..EC-05, VR-01..VR-04, SEC-01..SEC-04, NT-01..NT-05, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-066 |
| Backlog Item | PB-P1-039 — Visualización de reseñas en perfil vendor |
| Epic | EPIC-REV-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-066-refinement-review.md |

## 2. Diagnóstico

US-066 single-story de PB-P1-039 (visualización pública/autenticada). Endpoint sólo lectura sobre `reviews` excluyendo `hidden/deleted`. Hallazgos:

1. **Trazabilidad**: cita `FR-REVIEW-002` (escala, no aplica). Correctos: **`FR-REVIEW-010`** (lectura por organizer/vendor), **`UC-REVIEW-002`** ✓, `BR-REVIEW-004` (visibilidad), `BR-REVIEW-009` (denormalize). `NFR-PERF-API-001` → `NFR-PERF-001`. PB-P1-039 cita `FR-REVIEW-003` (unicidad) — incorrecto.
2. **Falta declarar `Backlog Item: PB-P1-039`**.
3. **Cursor pagination** (consistencia con US-045): paridad de diseño.
4. **Reviewer display**: ¿nombre del organizer? ¿slug del evento? ¿anónimo? PO debe decidir.
5. **Vendor status filter**: el endpoint público sólo lista reviews de vendor `approved`. Admin podría ver todos.
6. **Response shape**: incluir summary (rating_avg, reviews_count) + items + next_cursor.
7. **404 uniforme**: vendor inexistente o no-approved (cuando consulta es pública).
8. **Filtros**: por rating (1-5) y `with_comment_only` (booleano) — out of MVP per backlog.
9. **Ordering**: por `created_at DESC` (per backlog).

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Pagination | Cursor base64 `{created_at, id}` paridad US-045. Default 20, max 50. |
| Q2 | PO | Reviewer display | Mostrar `event.title` (slug-style anonimizado) + `created_at`. SIN exponer organizer business name ni user id (privacy MVP). Si vendor reseñado es anónimo, mostrar solo `created_at` + rating + comment. |
| Q3 | PO | Vendor status filter | Público anónimo + organizer/vendor: sólo reviews de `vendor_profiles.status='approved'`. Admin: todos los estados. |
| Q4 | Tech | Response shape | `{ vendor: {id, business_name, slug, status, rating_avg, reviews_count}, items: [{id, rating, comment, event_title, created_at, status}], pagination: {next_cursor, page_size} }`. |
| Q5 | Sec | 404 uniforme | Vendor inexistente o no-approved (visible solo a admin) ⇒ `404 VENDOR_NOT_FOUND` uniforme. |
| Q6 | PO | Filtros (rating, with_comment_only) | Out of scope MVP. Sólo ordering por fecha. |
| Q7 | Tech | Index | `(vendor_profile_id, status, created_at DESC)` parcial `WHERE status='published'` o equivalente. |

## 9. Recomendación

`Needs Refinement` — 7 decisiones PO/Tech bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
