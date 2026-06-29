# 🧾 User Story: Admin hide/remove reseña con AdminAction + denormalize atómico (soft delete)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-067 |
| Backlog Item | PB-P1-040 — Moderación admin de reseñas (soft delete) |
| Epic | EPIC-REV-001 — Reviews & Moderation |
| Feature | Endpoint admin `POST /admin/reviews/:id/moderate` con AdminAction + recálculo denormalize |
| Module / Domain | Reviews / Admin |
| User Role | Admin |
| Priority | Must Have |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Sprint / Milestone | MVP |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-28 |
| Approved By | PO/BA Review |
| Approval Date | 2026-06-28 |
| Ready for Development Tasks | Yes |

---

## 🎯 User Story

**As an** administrador
**I want** ocultar (`hidden`) o eliminar suavemente (`removed`) una reseña con motivo, registrando AdminAction y recalculando atómicamente el rating del VendorProfile
**So that** modere contenido inadecuado con auditoría completa y trazabilidad (Decisión PO 8.1 #11 + FR-REVIEW-004)

---

## 🧠 Business Context

### Context Summary

US-067 cierra EPIC-REV-001 con moderación manual de admin (FR-REVIEW-009 prohibe IA). Aplica soft delete (FR-REVIEW-005 prohibe hard delete). El cambio de status dispara recálculo total de `vendor_profiles.rating_avg/reviews_count` (BR-REVIEW-009 + FR-VENDOR-013) excluyendo `hidden`/`removed`. AdminAction obligatorio (BR-ADMIN-011). Sin Notifications al organizer/vendor en MVP.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | `hidden`: oculto al público, visible al admin (reversible). `removed`: soft delete final visible solo al admin. Ambos excluidos del denormalize. |
| D2 | Transiciones permitidas: `published→hidden`, `published→removed`, `hidden→removed`. Otros ⇒ `409 INVALID_TRANSITION`. |
| D3 | Migración menor: añadir `moderated_by`, `moderated_at`, `moderation_reason`, `admin_action_id` en `reviews`. |
| D4 | `prisma.$transaction`: UPDATE review + INSERT AdminAction + UPDATE review.admin_action_id + recálculo denormalize VendorProfile + log. |
| D5 | Reason `[10..500]` chars. |
| D6 | `404 REVIEW_NOT_FOUND` uniforme. |
| D7 | Sin notif organizer/vendor en MVP. |
| D8 | AdminAction shape: `{admin_id, target_type='review', target_id, action: 'hide'|'remove', reason, payload?}`. |
| D9 | Body: `{action, reason}` con DTO `.strict()`. |

### Related Domain Concepts

* `reviews.status ∈ {published, hidden, removed, deleted}` (last cuatro estados).
* Audit fields en `reviews`.
* AdminAction record obligatorio.
* Recálculo cross-domain de VendorProfile.

### Assumptions

* US-065 entregó review schema + denormalize.
* `admin_actions` table existe (PB-P0-001).
* `users.role='admin'` enforcement.

### Dependencies

* US-065 (creación review + denormalize), PB-P0-001 (schemas).

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-REVIEW-004, FR-REVIEW-005, FR-REVIEW-009, FR-ADMIN-005, FR-VENDOR-013 |
| Use Case(s) | UC-REVIEW-003, UC-ADMIN-008 |
| Business Rule(s) | BR-REVIEW-005, BR-REVIEW-006, BR-REVIEW-009, BR-ADMIN-003, BR-ADMIN-011 |
| Permission Rule(s) | Admin only |
| Data Entity / Entities | Review, AdminAction, VendorProfile, User |
| API Endpoint(s) | POST /api/v1/admin/reviews/:id/moderate |
| NFR Reference(s) | NFR-OBS-005 |
| Related ADR(s) | ADR-SEC-002 |
| Related Document(s) | /docs/4 §BR-REVIEW-005/BR-ADMIN-003/011, /docs/8 §UC-REVIEW-003, /docs/9 §FR-REVIEW-004/005/009/FR-ADMIN-005, /docs/8.1 #11 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Moderación automática IA (FR-REVIEW-009).
* Hard delete (FR-REVIEW-005).
* Notif al organizer/vendor MVP.
* Rollback de moderación (US-077 si aplica).
* Bulk moderation.
* Moderation queue automática.

### Scope Notes
* Manual + auditado.

---

## ✅ Acceptance Criteria

### AC-01: Hide con AdminAction + denormalize
**Given** admin autenticado, review `published`, body `{action: 'hide', reason: 'Contenido inapropiado verificado.'}`
**When** `POST /api/v1/admin/reviews/:id/moderate`
**Then** en `prisma.$transaction`:
- UPDATE review SET `status='hidden', moderated_by, moderated_at, moderation_reason`,
- INSERT AdminAction con action='hide',
- UPDATE review.admin_action_id,
- recálculo `vendor_profiles.rating_avg/reviews_count` (solo published),
- log `review.moderated`,
- responde `200 OK` con `{id, status, moderated_at, moderated_by, admin_action_id}`.

### AC-02: Remove con AdminAction + denormalize
**Given** review `published`, body `{action: 'remove', reason: '...'}`
**When** se ejecuta
**Then** status=`removed` + idem AC-01.

### AC-03: Hidden → Removed (transición permitida)
**Given** review `hidden`, body `{action: 'remove', ...}`
**When** se ejecuta
**Then** status pasa a `removed` + AdminAction nueva.

### AC-04: Denormalize correcto excluye hidden/removed
**Given** vendor con 5 reviews `published` (avg=4.0) y se modera una con rating=5
**When** UPDATE
**Then** `vendor_profiles.rating_avg` recalculado sobre 4 reviews restantes.

---

## ⚠️ Edge Cases

### EC-01: Review ya `removed`
**Given** status `removed`, intenta nueva acción
**When** se valida transición
**Then** `409 INVALID_TRANSITION` con `details.from='removed'`. AdminAction NO se crea.

### EC-02: Transición inválida (removed→hidden, removed→published, etc.)
**Given** transiciones fuera de D2
**When** se valida
**Then** `409 INVALID_TRANSITION` con `details.from` + `details.to`.

### EC-03: Reason demasiado corto/largo
**Given** `reason.length < 10` o `> 500`
**When** se valida
**Then** `400 INVALID_REASON_LENGTH`.

### EC-04: Review inexistente o UUID malformado
* `400 INVALID_UUID`.
* `404 REVIEW_NOT_FOUND`.

### EC-05: Body con action inválido
**Given** `action='delete'` o cualquier otro
**When** se valida
**Then** `400 INVALID_ACTION`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID válido | `400 INVALID_UUID` |
| VR-02 | `action ∈ {hide, remove}` | `400 INVALID_ACTION` |
| VR-03 | `reason` length [10..500] | `400 INVALID_REASON_LENGTH` |
| VR-04 | DTO `.strict()` | `400 INVALID_BODY` |
| VR-05 | Review existe | `404 REVIEW_NOT_FOUND` |
| VR-06 | Transición permitida (D2) | `409 INVALID_TRANSITION` |
| VR-07 | Admin role | `403` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `admin` |
| SEC-02 | AdminAction obligatoria (BR-ADMIN-011) |
| SEC-03 | Soft delete; sin hard delete (FR-REVIEW-005) |
| SEC-04 | Sin AI moderation (FR-REVIEW-009) |
| SEC-05 | `404 REVIEW_NOT_FOUND` uniforme |
| SEC-06 | Reason debe ser informativa ([10..500]) |

### Negative Authorization Scenarios
* Sin sesión → 401; organizer/vendor → 403.

---

## 🤖 AI Behavior

This story does not invoke AI directly. FR-REVIEW-009 prohibe explícitamente moderación automática IA.

* AI Feature: None
* Provider Layer: Not applicable
* AI Input/Output/HITL/Fallback: Not applicable

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | `/[locale]/admin/reviews` (lista) + modal por acción |
| Main UI Pattern | `ReviewModerationTable` (lista paginada con filter por status) + `ModerationDialog` (acción + reason) |
| Primary Action | "Ocultar" / "Eliminar" según contexto |
| Secondary Actions | "Cancelar" |
| Empty State | "No hay reseñas en este estado" |
| Loading State | Skeleton |
| Error State | Banner i18n por código |
| Success State | Toast + actualización de la tabla |
| Accessibility | Modal `role="dialog"` con focus trap; textarea con label |
| Responsive | Mobile-first |
| i18n | 4 locales (`admin.review.moderate.*`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `ReviewModerationTable`, `ModerationDialog`.
* State: TanStack mutation + invalidación de queries de reviews list.
* Forms: RHF + Zod alineado.
* API: `adminApi.review.moderate(id, {action, reason})`.

### Backend
* Use Case: `ModerateReviewUseCase` con `prisma.$transaction`.
* Controller / Route: `POST /api/v1/admin/reviews/:id/moderate`.
* Authorization: admin guard.
* Validation: Zod `.strict()`.
* Transaction: Sí.

### Database
* Tablas: `reviews` (update), `admin_actions` (insert), `vendor_profiles` (update denormalize).
* Migración menor: 4 columnas audit en `reviews`.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/admin/reviews/:id/moderate` | Hide o remove review con audit + denormalize |

#### Request body
```json
{ "action": "hide", "reason": "Contenido inapropiado verificado." }
```

#### Response 200
```json
{
  "id": "<uuid>",
  "status": "hidden",
  "moderated_at": "2026-...",
  "moderated_by": "<uuid>",
  "moderation_reason": "Contenido inapropiado verificado.",
  "admin_action_id": "<uuid>"
}
```

### Observability
* Correlation ID: Yes
* Log Event: Yes (`review.moderated` con `action, reviewId, adminUserId, fromStatus, toStatus`).
* AdminAction: Yes (obligatoria).

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Hide published ⇒ status hidden + AdminAction + denormalize | Integration |
| TS-02 | Remove published ⇒ status removed + AdminAction + denormalize | Integration |
| TS-03 | Hidden → Removed permitido | Integration |
| TS-04 | Denormalize excluye hidden/removed correctamente | Integration |
| TS-05 | Regresión US-065/066: creación + listado siguen funcionando | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Review removed → cualquier acción | `409 INVALID_TRANSITION` |
| NT-02 | Reason < 10 chars | `400 INVALID_REASON_LENGTH` |
| NT-03 | Reason > 500 chars | `400 INVALID_REASON_LENGTH` |
| NT-04 | Action inválido | `400 INVALID_ACTION` |
| NT-05 | UUID malformado | `400 INVALID_UUID` |
| NT-06 | Review inexistente | `404 REVIEW_NOT_FOUND` |
| NT-07 | Sin sesión | `401` |
| NT-08 | Organizer/Vendor | `403` |
| NT-09 | Body con campos extra | `400 INVALID_BODY` |

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
* Dialog accesible con focus trap.

### Performance
* `< 500ms` p95.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Calidad del catálogo + gobernanza |
| Expected Impact | Contenido inadecuado moderado con audit completa |
| Success Criteria | 100% acciones registradas en AdminAction + denormalize coherente |
| Academic Demo Value | Cierre del epic con governance admin |

---

## 🧩 Task Breakdown Readiness

* FE: `ReviewModerationTable` + `ModerationDialog` + i18n.
* BE: DTO + UseCase atómico + Controller + Logger + AdminGuard.
* DB: Verificar/migrar audit columns.
* QA: UT, IT (denormalize + regresión + AdminAction), AUTH, A11Y, Security (FR-REVIEW-005/009).

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional con AdminAction + denormalize.
* [ ] Audit columns persistidos.
* [ ] Transiciones validadas.
* [ ] Tests verdes + regresión US-065/066.
* [ ] i18n 4 locales.

---

## 📝 Notes

* Sin notif al organizer/vendor (Decisión PO no lo obliga; podrá agregarse post-MVP).
* US-077 podrá manejar rollback de moderación si aplica.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-067-decision-resolution.md`.
