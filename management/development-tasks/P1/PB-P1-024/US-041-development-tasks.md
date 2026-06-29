# Development Tasks — PB-P1-024 / US-041: Editar y soft-delete VendorProfile

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-041 |
| Source User Story | `management/user-stories/US-041-edit-vendor-profile.md` |
| Source Technical Specification | `management/technical-specs/P1/PB-P1-024/US-041-technical-spec.md` |
| Decision Resolution | `management/user-stories/decision-resolutions/US-041-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-024 |
| Execution Order | 43 |
| Position in Backlog Item | 2 de 2 (US-040 → US-041) |
| Epic | EPIC-VND-001 |
| Dependencies | PB-P1-024 / US-040 |
| Status | Ready for Sprint Planning |

---

## 2. Task Breakdown Summary

| Area | Tasks |
|---|---:|
| BE | 6 |
| FE | 4 |
| QA | 6 |
| DOC | 3 |

**Total: 19 tareas.**

---

## 3. Development Tasks

### TASK-PB-P1-024-US-041-BE-001 — DTO Zod `updateVendorProfileBody` con `.strict()` + `.refine`

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | XS |
| Source AC(s) | AC-07, VR-05, VR-09 | Tech Spec | §7 |

DTO con todos los campos opcionales (`business_name`, `bio`, `location_id`, `languages_supported`); `.refine` rechaza body vacío; rechaza extras (slug, status, vendor_user_id, categories, category_change_count).

---

### TASK-PB-P1-024-US-041-BE-002 — `AdminActionWritePort` + adapter (stub directo a Prisma)

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | S |
| Source AC(s) | AC-02 | Tech Spec | §7 (AdminAction Port) |

Port en `modules/vendors/ports/`. Adapter directo a `prisma.adminAction.create` con TODO para refactor cuando exista módulo Admin formal.

---

### TASK-PB-P1-024-US-041-BE-003 — Extensión de `VendorProfileRepository` (findActiveByVendorUserId, update, softDelete)

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | S |
| Source AC(s) | AC-01..05 | Tech Spec | §7 (Repository) |

Métodos con `SELECT FOR UPDATE` para concurrencia.

---

### TASK-PB-P1-024-US-041-BE-004 — `UpdateVendorProfileUseCase` con detección de campos mayores + transición auto

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | M |
| Depends On | BE-001, BE-002, BE-003 | Source AC(s) | AC-01..04, AC-06, AC-07, EC-01..03, EC-06..08, VR-01..09 | Tech Spec | §7 |

Helper `isMajorFieldUpdate(body)` + `prisma.$transaction` con update + status + AdminAction.

---

### TASK-PB-P1-024-US-041-BE-005 — `SoftDeleteVendorProfileUseCase`

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | S |
| Depends On | BE-003 | Source AC(s) | AC-05, EC-04, EC-05, VR-07 | Tech Spec | §7 |

---

### TASK-PB-P1-024-US-041-BE-006 — Controller extension + rutas PATCH/DELETE + logger eventos

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | S |
| Depends On | BE-004, BE-005 | Source AC(s) | AC-01..05, SEC-01..05 | Tech Spec | §7, §14 |

Extender `VendorProfileController` con handlers `update` y `softDelete`. Logger con 3 eventos (`updated`, `repending`, `soft_deleted`).

---

### TASK-PB-P1-024-US-041-FE-001 — Cliente `vendorsApi.update` + `vendorsApi.softDelete`

| Field | Value |
|---|---|
| Area | FE | Type | Implementation | Priority | Must | Estimate | XS |
| Depends On | BE-006 | Source AC(s) | AC-01..05 |

---

### TASK-PB-P1-024-US-041-FE-002 — `VendorProfileEditor` form con tracking de campos mayores dirty + banner re-pending

| Field | Value |
|---|---|
| Area | FE | Type | Implementation | Priority | Must | Estimate | M |
| Depends On | FE-001 | Source AC(s) | AC-01..03, AC-06, AC-09 |

RHF + Zod espejo; warning previo a submit cuando hay dirty major y status=approved; banner condicional según response.

---

### TASK-PB-P1-024-US-041-FE-003 — `DeleteProfileDialog` modal accesible

| Field | Value |
|---|---|
| Area | FE | Type | Implementation | Priority | Must | Estimate | S |
| Depends On | FE-001 | Source AC(s) | AC-05, AC-09 |

`role="dialog"`, focus trap, ESC.

---

### TASK-PB-P1-024-US-041-FE-004 — i18n claves `vendor.profile.edit.*` en 4 locales

| Field | Value |
|---|---|
| Area | FE | Type | Implementation | Priority | Must | Estimate | S |
| Depends On | FE-002, FE-003 | Source AC(s) | AC-10 |

Banner re-pending, mensajes de error 4xx mapeados (`PROFILE_REJECTED`, `PROFILE_HIDDEN`, `PROFILE_DELETED`), confirmación delete.

---

### TASK-PB-P1-024-US-041-QA-001 — UT (DTO, helper isMajor, use cases)

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | M |
| Depends On | BE-001, BE-004, BE-005 | Source AC(s) | AC-01..07, EC-01..08 |

---

### TASK-PB-P1-024-US-041-QA-002 — IT (TS-01..06)

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | M |
| Depends On | BE-006 | Source AC(s) | AC-01..06 |

---

### TASK-PB-P1-024-US-041-QA-003 — Negative tests (NT-01..10)

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | M |
| Depends On | BE-006 | Source AC(s) | EC-01..08, VR-01..09 |

---

### TASK-PB-P1-024-US-041-QA-004 — Authorization tests + PERF-01

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | S |
| Depends On | BE-006 | Source AC(s) | SEC-01..05, AC-08 |

---

### TASK-PB-P1-024-US-041-QA-005 — A11Y (editor + delete dialog)

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | S |
| Depends On | FE-002, FE-003 | Source AC(s) | AC-09 |

---

### TASK-PB-P1-024-US-041-QA-006 — Contract test CONTRACT-01

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Should | Estimate | S |
| Depends On | BE-001, BE-006 | Source AC(s) | AC-04 |

---

### TASK-PB-P1-024-US-041-DOC-001 — Actualizar `docs/16 §M07` con PATCH/DELETE + nuevos error codes

| Field | Value |
|---|---|
| Area | DOC | Priority | Should | Estimate | XS |

---

### TASK-PB-P1-024-US-041-DOC-002 — Nota interpretativa en `docs/4 §BR-VENDOR-003` (re-pending automático D2)

| Field | Value |
|---|---|
| Area | DOC | Priority | Should | Estimate | XS |

---

### TASK-PB-P1-024-US-041-DOC-003 — Nota interpretativa en `docs/4 §BR-VENDOR-002` (slug inmutable D5)

| Field | Value |
|---|---|
| Area | DOC | Priority | Should | Estimate | XS |

---

## 4. Risks

| Risk | Mitigation | Related |
|---|---|---|
| AdminAction schema falta | BE-002 con stub directo + DOC | BE-002 |
| Race condition PATCH vs admin paralelo | SELECT FOR UPDATE en BE-003 | BE-003, QA-002 |
| Detección de mayores incorrecta | UT exhaustivos | BE-004, QA-001 |

---

## 5. Out of Scope
Reverso soft delete, rotación slug, categorías (US-042), servicios (US-043).

---

## 6. Readiness
`Ready for Sprint Planning`. 19 tareas.
