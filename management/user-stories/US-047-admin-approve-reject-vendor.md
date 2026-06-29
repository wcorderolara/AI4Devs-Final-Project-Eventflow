# 🧾 User Story: Admin modera VendorProfile (approve/reject/hide/unhide con AdminAction + notif)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-047 |
| Backlog Item | PB-P1-041 — Admin: aprobar / rechazar / ocultar vendor |
| Epic | EPIC-VND-001 / EPIC-ADM-001 |
| Feature | Endpoint admin único `POST /admin/vendors/:id/moderate` con AdminAction + 2 notifs vendor |
| Module / Domain | Vendors / Admin |
| User Role | Admin |
| Priority | Must Have |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Sprint / Milestone | MVP |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-29 |
| Approved By | PO/BA Review |
| Approval Date | 2026-06-29 |
| Ready for Development Tasks | Yes |

---

## 🎯 User Story

**As an** administrador
**I want** un endpoint único de moderación de VendorProfile con 4 acciones (approve, reject, hide, unhide) que registre AdminAction obligatorio y notifique al vendor
**So that** mantenga la calidad del catálogo con audit trail completo y feedback al vendor (FR-ADMIN-003 + FR-VENDOR-010/011 + Decisión PO 8.1 #16)

---

## 🧠 Business Context

### Context Summary

US-047 es 1 de 2 en PB-P1-041 (US-047 endpoint + US-074 panel UI admin). Implementa moderación del lifecycle `VendorProfile`: `pending → approved | rejected` (status) + `is_hidden` boolean separado para approved. AdminAction obligatorio (BR-ADMIN-011). 2 Notifications atómicas al vendor via service común extendido a 13 eventos. Migración menor con audit columns paridad US-067 D3.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | 1 endpoint `POST /admin/vendors/:id/moderate` con body `{action, reason?}` (paridad US-067). |
| D2 | `is_hidden` flag separado del status. Status sigue siendo `approved`; el flag controla visibilidad. |
| D3 | `unhide` action permitida sin reason. |
| D4 | Reason required `[10..500]` en `reject`/`hide`; opcional en `approve`/`unhide`. |
| D5 | Transiciones whitelist: 4 transiciones únicas. Otros ⇒ `409 INVALID_TRANSITION`. |
| D6 | 4 eventos nuevos via service común (`vendor.approved/rejected/hidden/unhidden`). |
| D7 | Admin only; `404 VENDOR_NOT_FOUND` uniforme. |
| D8 | `prisma.$transaction` con UPDATE + AdminAction + notifs + log. |
| D9 | Migración menor: 4 columnas audit en `vendor_profiles`. |

### Related Domain Concepts

* `vendor_profiles.status ∈ {pending, approved, rejected}`.
* `vendor_profiles.is_hidden boolean DEFAULT false`.
* AdminAction record obligatorio.
* `QuoteEventNotificationService` extendido a 13 eventos.

### Assumptions

* US-040 lookup público respeta `status='approved' AND is_hidden=false`.
* PB-P0-001 schema base.

### Dependencies

* US-040 (vendor lookup público), US-054/056/058/060/061/062/065 (service común a extender), PB-P0-001, PB-P1-024 (admin role).

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-VENDOR-010, FR-VENDOR-011, FR-ADMIN-003, FR-NOTIF-001, FR-NOTIF-004 |
| Use Case(s) | UC-ADMIN-004, UC-ADMIN-005 |
| Business Rule(s) | BR-VENDOR-003, BR-ADMIN-001, BR-ADMIN-003, BR-ADMIN-011, BR-NOTIF-001, BR-NOTIF-002 |
| Permission Rule(s) | Admin only |
| Data Entity / Entities | VendorProfile, AdminAction, User, Notification |
| API Endpoint(s) | POST /api/v1/admin/vendors/:id/moderate |
| NFR Reference(s) | NFR-OBS-005 |
| Related ADR(s) | ADR-SEC-002 |
| Related Document(s) | /docs/9 §FR-VENDOR-010/011/FR-ADMIN-003, /docs/8 §UC-ADMIN-004/005, /docs/8.1 #16 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* AI moderation.
* Bulk moderation.
* Re-aprobar vendor `rejected`.
* Notif al organizer cuando se modera un vendor.
* Auto-reject por timeout.

### Scope Notes
* Manual + auditado.

---

## ✅ Acceptance Criteria

### AC-01: Approve vendor pending
**Given** vendor `pending`, body `{action: 'approve', reason?: 'OK'}`
**When** se ejecuta
**Then** UPDATE vendor status='approved' + audit fields, INSERT AdminAction, 2 notifs `vendor.approved`, log.

### AC-02: Reject vendor pending
**Given** vendor `pending`, body `{action: 'reject', reason: 'Documentación incompleta verificada.'}`
**When** se ejecuta
**Then** UPDATE status='rejected' + audit, INSERT AdminAction, 2 notifs `vendor.rejected` con reason, log.

### AC-03: Hide approved vendor
**Given** vendor `approved + is_hidden=false`, body `{action: 'hide', reason: '...'}`
**When** se ejecuta
**Then** UPDATE is_hidden=true + audit (status sigue `approved`), INSERT AdminAction, 2 notifs `vendor.hidden`, log. Directorio público (US-040) lo excluye.

### AC-04: Unhide approved+hidden vendor
**Given** vendor `approved + is_hidden=true`, body `{action: 'unhide'}`
**When** se ejecuta
**Then** UPDATE is_hidden=false + audit (reason puede ser null), INSERT AdminAction, 2 notifs `vendor.unhidden`, log.

---

## ⚠️ Edge Cases

### EC-01: Doble approve
**Given** vendor `approved`, action='approve'
**When** se valida
**Then** `409 INVALID_TRANSITION` con `details.from_status='approved', action='approve'`.

### EC-02: Hide en pending o rejected
**Given** vendor `pending` o `rejected`, action='hide'
**When** se valida
**Then** `409 INVALID_TRANSITION`.

### EC-03: Re-aprobar rejected
**Given** vendor `rejected`, action='approve'
**When** se valida
**Then** `409 INVALID_TRANSITION`. (Re-aprobación está OUT OF MVP.)

### EC-04: Reason ausente en reject
**Given** action='reject', body sin reason
**When** se valida
**Then** `400 REASON_REQUIRED`.

### EC-05: Reason fuera de rango
**Given** reason length < 10 o > 500
**When** se valida (cuando required)
**Then** `400 INVALID_REASON_LENGTH`.

### EC-06: Vendor inexistente
**Given** UUID inválido o vendor que no existe
**When** se valida
**Then** `400 INVALID_UUID` o `404 VENDOR_NOT_FOUND`.

### EC-07: Action inválido
**Given** action='delete' o cualquier no-enum
**When** se valida
**Then** `400 INVALID_ACTION`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID válido | `400 INVALID_UUID` |
| VR-02 | `action ∈ {approve, reject, hide, unhide}` | `400 INVALID_ACTION` |
| VR-03 | Reason required en reject/hide | `400 REASON_REQUIRED` |
| VR-04 | Reason [10..500] si required | `400 INVALID_REASON_LENGTH` |
| VR-05 | DTO `.strict()` | `400 INVALID_BODY` |
| VR-06 | Vendor existe | `404 VENDOR_NOT_FOUND` |
| VR-07 | Transición permitida (D5) | `409 INVALID_TRANSITION` |
| VR-08 | Admin role | `403` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `admin` |
| SEC-02 | AdminAction obligatoria (BR-ADMIN-011) |
| SEC-03 | `404 VENDOR_NOT_FOUND` uniforme |
| SEC-04 | Reason informativa cuando required ([10..500]) |
| SEC-05 | Sin AI moderation |

### Negative Authorization Scenarios
* Sin sesión → 401; organizer/vendor → 403.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

* AI Feature: None
* Provider Layer: Not applicable
* AI Input/Output/HITL/Fallback: Not applicable

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | `/[locale]/admin/vendors` (US-074 entrega la UI completa; US-047 solo el endpoint) |
| Main UI Pattern | (UI de US-074) Tabla + `VendorModerationDialog` con action selector + reason |
| Primary Action | "Aplicar acción" según contexto |
| Secondary Actions | "Cancelar" |
| Empty State | (UI de US-074) |
| Loading State | Spinner |
| Error State | Banner i18n por código |
| Success State | Toast + actualización tabla |
| Accessibility | Modal accesible (US-074) |
| Responsive | Mobile-first |
| i18n | 4 locales (`admin.vendor.moderate.*`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: integración en `VendorModerationTable` y `VendorModerationDialog` (US-074).
* State: TanStack mutation + invalidación.
* Forms: RHF + Zod alineado.
* API: `adminApi.vendor.moderate(id, {action, reason?})`.

### Backend
* Use Case: `ModerateVendorUseCase` con `prisma.$transaction`.
* Controller / Route: `POST /api/v1/admin/vendors/:id/moderate`.
* Authorization: AdminRoleGuard (reuso US-067).
* Validation: Zod `.strict()` + cross-field refinement.
* Transaction: Sí.
* Service: extender `QuoteEventNotificationService` con 4 eventos nuevos.

### Database
* Tablas: `vendor_profiles` (update), `admin_actions` (insert), `notifications` (write).
* Migración menor: 4 columnas audit en `vendor_profiles`.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/admin/vendors/:id/moderate` | Approve/reject/hide/unhide con AdminAction + 2 notifs |

#### Request body
```json
{ "action": "reject", "reason": "Documentación incompleta verificada." }
```

#### Response 200
```json
{
  "id": "<uuid>",
  "status": "rejected",
  "is_hidden": false,
  "moderated_by": "<uuid>",
  "moderated_at": "2026-...",
  "moderation_reason": "Documentación incompleta verificada.",
  "admin_action_id": "<uuid>"
}
```

### Observability
* Correlation ID: Yes
* Log: `vendor.moderated` con `vendorId, adminId, action, fromStatus, toStatus, fromIsHidden, toIsHidden`.
* AdminAction: Yes (obligatoria).

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Approve pending ⇒ approved + AdminAction + 2 notifs | Integration |
| TS-02 | Reject pending con reason ⇒ rejected + audit | Integration |
| TS-03 | Hide approved ⇒ is_hidden=true (status unchanged) + audit | Integration |
| TS-04 | Unhide approved+hidden ⇒ is_hidden=false + audit | Integration |
| TS-05 | Regresión service común: 9 eventos previos siguen funcionando | Integration |
| TS-06 | Effect en US-040: vendor rejected/hidden no aparece en directorio público | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Doble approve | `409 INVALID_TRANSITION` |
| NT-02 | Hide en pending | `409 INVALID_TRANSITION` |
| NT-03 | Re-aprobar rejected | `409 INVALID_TRANSITION` |
| NT-04 | Reject sin reason | `400 REASON_REQUIRED` |
| NT-05 | Reason < 10 chars | `400 INVALID_REASON_LENGTH` |
| NT-06 | Action inválido | `400 INVALID_ACTION` |
| NT-07 | UUID malformado | `400 INVALID_UUID` |
| NT-08 | Vendor inexistente | `404 VENDOR_NOT_FOUND` |
| NT-09 | Body con campos extra | `400 INVALID_BODY` |
| NT-10 | Sin sesión | `401` |
| NT-11 | Organizer/Vendor | `403` |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Admin | 200 |
| AUTH-TS-02 | Organizer | 403 |
| AUTH-TS-03 | Vendor | 403 |
| AUTH-TS-04 | Sin sesión | 401 |

### Accessibility
* UI tested en US-074.

### Performance
* `< 500ms` p95.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Tiempo a aprobación + calidad del catálogo |
| Expected Impact | Curaduría con audit |
| Success Criteria | 100% acciones auditadas + notifs entregadas |
| Academic Demo Value | Gobernanza admin |

---

## 🧩 Task Breakdown Readiness

* BE: DTO + UseCase atómico + Controller + AdminGuard reuso + Logger + extensión service común.
* DB: Verificar/migrar 4 columnas audit + verificar `is_hidden` column existe.
* QA: UT, IT (todas las transiciones + AdminAction + denormalize en US-040), AUTH, Concurrencia, Security.

(FE es responsabilidad de US-074.)

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional con 4 acciones.
* [ ] AdminAction registrada en cada acción.
* [ ] 2 Notifications atómicas via service común extendido a 13 eventos.
* [ ] Audit columns persistidos.
* [ ] Tests verdes + regresión US-040 + service común.

---

## 📝 Notes

* US-074 entregará el panel UI admin (paridad pattern con US-077).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-047-decision-resolution.md`.
