# User Story Refinement Review — US-074

## Source User Story File
management/user-stories/US-074-admin-approve-reject-vendor-extended.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-074-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q8 resueltas. La US-074 declara `Backlog Item: PB-P1-041`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (FR-ADMIN-001/UC-ADMIN-001 inaplicables → FR-ADMIN-003 + FR-VENDOR-010/011 + UC-ADMIN-004/005 + BR-VENDOR-003 + BR-ADMIN-001/003/011; NFR-PERF-API-001 → NFR-PERF-001). Endpoint nuevo `GET /admin/vendors` con filtros (status multi + is_hidden + fechas + business_name ILIKE) + cursor pagination + 3 componentes UI + hook reuso US-047. AC-01..AC-05, EC-01..EC-05, VR-01..VR-06, SEC-01..SEC-04, NT-01..NT-06, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-074 |
| Backlog Item | PB-P1-041 — Admin: aprobar / rechazar / ocultar vendor |
| Epic | EPIC-ADM-001 / EPIC-VND-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-074-refinement-review.md |

## 2. Diagnóstico

US-074 es 2 de 2 en PB-P1-041 (cierra). Panel UI admin de vendors + endpoint `GET /admin/vendors`. Pattern análogo a US-077 (que cerró PB-P1-040 después de US-067).

### Hallazgos

1. **Trazabilidad incorrecta**: cita `FR-ADMIN-001` (admin login, no aplica), `UC-ADMIN-001` (login, no aplica). Correctos: **`FR-ADMIN-003`** (admin approve/reject/hide vendor), **`FR-VENDOR-010/011`**, **`UC-ADMIN-004/005`**, **`BR-ADMIN-001/003/011`**, **`BR-VENDOR-003`**. `NFR-PERF-API-001` → `NFR-PERF-001`.
2. **Falta declarar `Backlog Item: PB-P1-041`**.
3. **ACs genéricos** — necesitan reescribirse.
4. **Endpoint nuevo** `GET /api/v1/admin/vendors` con filtros + cursor pagination.
5. **Filtros**: status (multi), is_hidden, fecha range, business_name search.
6. **Cursor pagination** paridad US-077.
7. **Response shape admin**: incluir audit fields + last_admin_action.
8. **Acción "moderate"**: deep-link a endpoint de US-047 (1 endpoint moderate con action enum).
9. **Componentes reuso**: `VendorModerationTable` (nuevo) + `VendorModerationDialog` (nuevo análogo a `ModerationDialog` de US-067).
10. **Default sort**: pending primero (admin necesita revisar pending) + `created_at DESC` dentro de cada bucket.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Endpoint nuevo `GET /admin/vendors` | Sí: global admin con filtros. |
| Q2 | PO | Filtros disponibles | `status` (multi, default `pending`), `is_hidden` (boolean), `created_at_from/to`, `business_name` (substring search case-insensitive), `pageSize`, `cursor`. |
| Q3 | Tech | Cursor pagination | Paridad US-077. `pageSize` default 25, max 50. |
| Q4 | PO | Response shape | `{items: [{id, business_name, slug, status, is_hidden, created_at, last_admin_action?: {...}, owner_email?}], pagination}`. Admin ve owner email para contacto. |
| Q5 | PO | Sort default | Primero `pending` (más prioritario), después `approved`, `rejected`. Dentro de cada bucket: `created_at DESC`. PO puede simplificar a solo `created_at DESC` si UI sort puede manejarlo. Recomendado: simple `created_at DESC` + filtro default `status=pending` (que el frontend pre-aplica). |
| Q6 | PO | Componentes UI | `VendorModerationTable` + `VendorModerationDialog` con action selector (approve/reject/hide/unhide). Reuso de hook `useModerateVendor` (US-047 FE no existe; este story lo entrega). |
| Q7 | PO | Business name search | Substring case-insensitive con `ILIKE %name%`. Sin búsqueda full-text MVP. |
| Q8 | PO | Bulk actions | Out of scope MVP (paridad US-077). |

## 9. Recomendación

`Needs Refinement` — 8 decisiones PO/Tech bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
