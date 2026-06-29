# User Story Refinement Review — US-047

## Source User Story File
management/user-stories/US-047-admin-approve-reject-vendor.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-047-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q9 resueltas. La US-047 declara `Backlog Item: PB-P1-041`, `PO/BA Decisions Applied` D1–D9, trazabilidad corregida (FR-VENDOR-008/FR-ADMIN-004/UC-VENDOR-008 inaplicables → FR-VENDOR-010/011 + FR-ADMIN-003 + UC-ADMIN-004/005 + BR-VENDOR-003 + BR-ADMIN-001/003/011). Endpoint único `POST /admin/vendors/:id/moderate` con 4 acciones (approve/reject/hide/unhide) + AdminAction + 2 notifs via service común extendido a 13 eventos + migración menor 4 columnas audit. AC-01..AC-04, EC-01..EC-07, VR-01..VR-08, SEC-01..SEC-05, TS-01..TS-06, NT-01..NT-11, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-047 |
| Backlog Item | PB-P1-041 — Admin: aprobar / rechazar / ocultar vendor |
| Epic | EPIC-VND-001 / EPIC-ADM-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-047-refinement-review.md |

## 2. Diagnóstico

US-047 es 1 de 2 en PB-P1-041 (US-047 endpoint + US-074 panel UI). Pattern análogo a PB-P1-040 (US-067 + US-077).

### Hallazgos

1. **Trazabilidad incorrecta**: cita `FR-VENDOR-008` (soft delete attachments, NO APLICA), `FR-ADMIN-004` (métricas admin, no aplica), `UC-VENDOR-008` (vendor responde reseñas Future, NO APLICA). Correctos:
   - **`FR-VENDOR-010`** (lifecycle VendorProfile `pending → approved | rejected`).
   - **`FR-VENDOR-011`** (notif al vendor on approve/reject).
   - **`FR-ADMIN-003`** (admin approve/reject/hide con AdminAction).
   - **`UC-ADMIN-004`** ✓.
   - **`BR-VENDOR-003`** (lifecycle), `BR-ADMIN-001/003/011` ✓.
2. **Falta declarar `Backlog Item: PB-P1-041`**.
3. **3 endpoints separados vs 1**: la US plantea 3 endpoints (`approve`, `reject`, `hide`). Paridad con US-067 sugiere 1 endpoint con `action` enum, pero 3 endpoints también son válidos. PO decide.
4. **`is_hidden` semantics**: documentación dice `pending → approved | rejected` (sin `hidden` en lifecycle). Hide es un flag separado `is_hidden=true` sobre approved vendors. Confirmar.
5. **Notif al vendor**: FR-VENDOR-011 exige notif on approve/reject. ¿También on hide? Confirmar y patrón service común.
6. **AdminAction obligatorio** (BR-ADMIN-011): paridad con US-067.
7. **Reason**: aprobar no requiere reason; reject/hide sí.
8. **Unhide acción**: ¿se permite revertir `is_hidden=true → false`?
9. **404 uniforme**: vendor inexistente.
10. **Effect en directorio público (US-040)**: cuando vendor pasa a `rejected` o `is_hidden=true`, debe desaparecer del listado público.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | PO/Tech | 1 endpoint vs 3 | **1 endpoint** `POST /admin/vendors/:id/moderate` con body `{action: 'approve'|'reject'|'hide'|'unhide', reason?: string}` (paridad US-067). |
| Q2 | PO | Hide semantics | `approved` + `is_hidden=true` (flag separado, no estado nuevo). |
| Q3 | PO | Unhide | Permitido: `is_hidden=true → false` reusando mismo endpoint con `action='unhide'`. Sin reason requerido. |
| Q4 | PO | Reason obligatorio | Requerido para `reject`, `hide`. Opcional para `approve`, `unhide`. Length [10..500] cuando requerido. |
| Q5 | PO | Transiciones permitidas | `pending → approved` (action='approve'). `pending → rejected` (action='reject'). `approved + is_hidden=false → is_hidden=true` (action='hide'). `approved + is_hidden=true → is_hidden=false` (action='unhide'). `rejected → ANY` ⇒ OUT OF MVP (US futura). |
| Q6 | PO | Notif al vendor | Sí, 2 Notifications atómicas para approve/reject/hide/unhide via service común extendido a 10+ eventos: `vendor.approved`, `vendor.rejected`, `vendor.hidden`, `vendor.unhidden`. |
| Q7 | Sec | 404 uniforme | Vendor inexistente ⇒ `404 VENDOR_NOT_FOUND`. Admin ve todos. |
| Q8 | Tech | Atomicidad transaccional | `prisma.$transaction`: UPDATE vendor + INSERT AdminAction + UPDATE moderated_by/at fields + 2 notifs + log. |
| Q9 | Tech | Audit fields | Añadir `vendor_profiles.moderated_by`, `moderated_at`, `moderation_reason`, `admin_action_id` (paridad US-067 D3). Migración menor. |

## 9. Recomendación

`Needs Refinement` — 9 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
