# User Story Refinement Review — US-077

## Source User Story File
management/user-stories/US-077-admin-moderate-review-panel.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-077-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q8 resueltas. La US-077 declara `Backlog Item: PB-P1-040`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (`FR-ADMIN-004`→`FR-ADMIN-005`+`FR-REVIEW-004`; `UC-ADMIN-005`→`UC-ADMIN-008`+`UC-REVIEW-003`; `NFR-PERF-API-001`→`NFR-PERF-001`; agregados `BR-ADMIN-003`). Endpoint nuevo `GET /admin/reviews` con filtros multi-status + cursor pagination + reuso de componentes US-067. AC-01..AC-05, EC-01..EC-04, VR-01..VR-06, SEC-01..SEC-04, NT-01..NT-06, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-077 |
| Backlog Item | PB-P1-040 — Moderación admin de reseñas (soft delete) |
| Epic | EPIC-ADM-001 (la US lo declara; PB-P1-040 está en EPIC-REV-001 + comparte con EPIC-ADM-001) |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-077-refinement-review.md |

## 2. Diagnóstico

US-077 es la 2ª US de PB-P1-040 (US-067 endpoint moderate + US-077 panel UI admin). La User Story está escrita con plantilla genérica; necesita ACs específicos. Núcleo: endpoint `GET /api/v1/admin/reviews` con filtros + UI `ReviewModerationTable` (componente ya planeado en spec de US-067).

### Hallazgos

1. **Trazabilidad**: cita `FR-ADMIN-004` (no aplica claramente — métricas admin). Correctos: **`FR-ADMIN-005`** (admin modera), **`FR-REVIEW-004`** (soft delete con audit), **`FR-VENDOR-013`** (denormalize ya entregado en US-067). UC: `UC-ADMIN-005` confuso — probable **`UC-ADMIN-008`** (admin moderate review). `BR-ADMIN-011` ✓. `NFR-PERF-API-001` → `NFR-PERF-001`.
2. **Falta declarar `Backlog Item: PB-P1-040`**.
3. **Epic mismatch**: US dice `EPIC-ADM-001` pero PB-P1-040 está bajo `EPIC-REV-001/EPIC-ADM-001` (cross-epic). Aceptable.
4. **ACs genéricos**: necesitan reescribirse con detalles concretos del listado admin.
5. **Endpoint nuevo**: `GET /api/v1/admin/reviews` (global, paginado, con filtros) — distinto al de US-066 (público por vendor).
6. **Filtros**: status, vendor_id, fecha range, rating, has_admin_action.
7. **Cursor pagination** paridad US-066.
8. **Response shape admin**: incluye fields completos (author info, vendor info, AdminAction history breve).
9. **Acción "moderate"**: deep-link al endpoint de US-067 (no se duplica).
10. **Visualización del último AdminAction** por review (badge).

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Endpoint nuevo `GET /admin/reviews` | Sí: global admin con filtros. Distinto al de US-066 (que es por vendor público). |
| Q2 | PO | Filtros disponibles | `status` (multi), `vendor_id` (uuid), `created_at_from/to`, `rating_min/max`, `has_admin_action` (boolean). |
| Q3 | Tech | Cursor pagination | Paridad US-066. `pageSize` default 25, max 50. Cursor base64 `{created_at, id}`. |
| Q4 | PO | Response shape admin | Incluir: `id, rating, comment, status, created_at, author: {user_id, business_name?}, vendor: {id, business_name, slug}, event: {id, title}, last_admin_action?: {action, reason, admin_id, created_at}`. Admin ve PII (no anonimizado). |
| Q5 | PO | Bulk actions | Out of scope MVP. Cada acción es individual via US-067. |
| Q6 | Tech | Default sorting | `created_at DESC, id DESC`. |
| Q7 | PO | Componente UI shared | Reusar `ReviewModerationTable` de US-067 spec (mismo componente). Esta US lo conecta al endpoint nuevo. |
| Q8 | Tech | Filtros multi-status | `status` query param permite array `?status=published&status=hidden`. |

## 9. Recomendación

`Needs Refinement` — 8 decisiones PO/Tech bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
