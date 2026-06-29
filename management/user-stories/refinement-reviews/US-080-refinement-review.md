# User Story Refinement Review — US-080

## Source User Story File
management/user-stories/US-080-admin-action-log-viewer.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-080-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q8 resueltas. La US-080 declara `Backlog Item: PB-P1-046`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (FR-ADMIN-007/UC-ADMIN-008 inaplicables → FR-ADMIN-009/006+UC-ADMIN-009+BR-ADMIN-004/011; NFR-PERF-API-001→NFR-PERF-001). Endpoint único GET con filtros + cursor + inmutabilidad arquitectónica + self-log evitado. AC-01..AC-04, EC-01..EC-04, VR-01..VR-06, SEC-01..SEC-04, NT-01..NT-07 (incluye NT-01..03 que verifican 404 en mutation endpoints), AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-080 |
| Backlog Item | PB-P1-046 — Visor del log AdminAction |
| Epic | EPIC-ADM-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-080-refinement-review.md |

## 2. Diagnóstico

US-080 single-story de PB-P1-046. Visor del log inmutable AdminAction con filtros. Pattern análogo a US-077 (admin reviews panel) y US-074 (admin vendors panel).

### Hallazgos

1. **Trazabilidad**: cita `FR-ADMIN-007` (admin gestiona EventType — incorrecto) y `UC-ADMIN-008` (admin moderate review — incorrecto). Correctos:
   - **`FR-ADMIN-009`** (consultar log inmutable con filtros — main).
   - **`FR-ADMIN-006`** (registro inmutable — ref).
   - **`UC-ADMIN-009`** (gestión del log AdminAction).
   - **`BR-ADMIN-004`** (audit obligatorio).
   - `NFR-PERF-API-001` → `NFR-PERF-001`.
2. **Falta declarar `Backlog Item: PB-P1-046`**.
3. **ACs genéricos**.
4. **API**: `GET /api/v1/admin/admin-actions` (listado paginado con filtros) + opcionalmente `GET /:id` (detalle).
5. **Inmutable**: NO endpoints PATCH/DELETE (FR-ADMIN-006).
6. **Filtros**: `admin_id` (actor), `target_type`, `target_id`, `action`, `created_at_from/to`.
7. **Cursor pagination** paridad US-077.
8. **NO crea AdminAction al consultar** (evitar loop — la consulta del log no se loguea como AdminAction).
9. **Response shape**: lista cronológica DESC + payload snapshot.
10. **Detail endpoint**: ¿necesario? El payload está en el item del listado. Recomendado: solo listado.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Endpoints | `GET /api/v1/admin/admin-actions` listado paginado. SIN detail endpoint (el payload completo viene en cada item). |
| Q2 | PO | Filtros disponibles | `admin_id` (uuid actor), `target_type` (enum), `target_id` (uuid), `action` (string), `created_at_from/to`, `pageSize`, `cursor`. |
| Q3 | Tech | Cursor pagination | Paridad US-077. Order `created_at DESC, id DESC`. |
| Q4 | PO | Response shape | `{items: [{id, admin: {id, business_name?, email}, target_type, target_id, action, reason, payload, created_at}], pagination: {next_cursor, page_size}}`. Admin ve admin info completa. |
| Q5 | Tech | Inmutabilidad arquitectónica | NO existen endpoints `POST/PATCH/DELETE` en `/admin/admin-actions`. INSERT solo desde otros use cases (US-067/047/075/076 etc.). |
| Q6 | PO | Self-log | NO crear AdminAction al consultar este endpoint (evita loop infinito + ruido). |
| Q7 | Sec | Admin only | Solo admin role. Sin distinción entre superadmin/admin MVP. |
| Q8 | PO | Search libre | Out of scope MVP. Solo filtros estructurados. |

## 9. Recomendación

`Needs Refinement` — 8 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
