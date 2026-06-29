# Development Tasks — PB-P1-024 / US-040: Crear VendorProfile

## 1. Metadata

| Field                                | Value                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| User Story ID                        | US-040                                                                                                             |
| Source User Story                    | `management/user-stories/US-040-create-vendor-profile.md`                                                          |
| Source Technical Specification       | `management/technical-specs/P1/PB-P1-024/US-040-technical-spec.md`                                                  |
| Decision Resolution                  | `management/user-stories/decision-resolutions/US-040-decision-resolution.md`                                       |
| Priority                             | P1                                                                                                                 |
| Backlog ID                           | PB-P1-024                                                                                                          |
| Execution Order                      | 42                                                                                                                |
| Position in Backlog Item             | 1 de 2 (US-040 → US-041)                                                                                          |
| Epic                                 | EPIC-VND-001                                                                                                        |
| Dependencies                          | PB-P1-002 (US-002), PB-P0-001                                                                                       |
| Status                                | Ready for Sprint Planning                                                                                            |

---

## 2. Task Breakdown Summary

| Area | Tasks |
|---|---:|
| DB | 1 |
| BE | 6 |
| FE | 6 |
| SEED | 1 |
| QA | 7 |
| DOC | 3 |

**Total: 24 tareas.**

---

## 3. Development Tasks

### TASK-PB-P1-024-US-040-DB-001 — Verificar schema `vendor_profile` (slug UNIQUE + category_change_count); migración menor si falta

| Field | Value |
|---|---|
| Area | DB | Type | Setup | Priority | Must | Estimate | S |
| Source AC(s) | AC-03 | Tech Spec Section(s) | §10, §16 |

Verificar que `vendor_profile.slug` (UNIQUE) y `category_change_count` (int default 0) están en el schema entregado por PB-P0-001. Si faltan, crear migración menor.

---

### TASK-PB-P1-024-US-040-BE-001 — Slug helper (`slugify` + `generateUniqueSlug`)

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | S |
| Source AC(s) | AC-03 | Tech Spec Section(s) | §7 (Slug Helper) |

`apps/api/src/modules/vendors/helpers/slugify.ts` con normalización NFD, lowercase, regex de caracteres permitidos, sufijo numérico para desambiguación.

---

### TASK-PB-P1-024-US-040-BE-002 — DTO Zod `createVendorProfileBody` y `VendorProfileDto`

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | XS |
| Source AC(s) | AC-01, AC-04, VR-01..09 | Tech Spec Section(s) | §7 |

Schemas estrictos (`.strict()`) con todos los campos requeridos por BR-VENDOR-002 (D2/D4).

---

### TASK-PB-P1-024-US-040-BE-003 — `VendorProfileRepository`

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | M |
| Depends On | DB-001 | Source AC(s) | AC-01, AC-03, EC-01 |

Métodos: `findByVendorUserId`, `findSlugsStartingWith`, `create` (con tx incluyendo insert M:N), `findByIdWithCategories`.

---

### TASK-PB-P1-024-US-040-BE-004 — `CreateVendorProfileUseCase`

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | M |
| Depends On | BE-001, BE-002, BE-003 | Source AC(s) | AC-01, AC-03, AC-04, EC-01..07, VR-01..09 |

Lógica del use case con validaciones, lookup de Location/Categorías, slug, transacción y log.

---

### TASK-PB-P1-024-US-040-BE-005 — Controller + guards + ruta `POST /api/v1/vendors/me`

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | S |
| Depends On | BE-004 | Source AC(s) | AC-01, SEC-01..05 |

Middleware chain: `authRequired` + `VendorRoleGuard` + `adminExclusionGuard` + `organizerExclusionGuard`. Registro en router.

---

### TASK-PB-P1-024-US-040-BE-006 — Logger `vendor.profile.created`

| Field | Value |
|---|---|
| Area | BE | Type | Implementation | Priority | Must | Estimate | XS |
| Depends On | BE-004 | Source AC(s) | AC-01, SEC-04 |

Schema del log + emisión desde el use case.

---

### TASK-PB-P1-024-US-040-FE-001 — `vendorsApi.create` client HTTP

| Field | Value |
|---|---|
| Area | FE | Type | Implementation | Priority | Must | Estimate | XS |
| Depends On | BE-005 | Source AC(s) | AC-01, AC-04 |

`apps/web/lib/api/vendorsApi.ts` con `create(body): Promise<VendorProfileDto>`.

---

### TASK-PB-P1-024-US-040-FE-002 — `VendorProfileWizard` orquestador

| Field | Value |
|---|---|
| Area | FE | Type | Implementation | Priority | Must | Estimate | M |
| Depends On | FE-001 | Source AC(s) | AC-01, AC-05 |

Multi-step con navegación + `aria-live` para anuncios de progreso.

---

### TASK-PB-P1-024-US-040-FE-003 — `BasicInfoStep` (business_name, bio) + Zod cliente

| Field | Value |
|---|---|
| Area | FE | Type | Implementation | Priority | Must | Estimate | S |
| Depends On | FE-002 | Source AC(s) | AC-01, AC-05 |

RHF + Zod espejo (50-1000 chars en bio).

---

### TASK-PB-P1-024-US-040-FE-004 — `LocationCategoriesStep` (Location + ServiceCategory cap 1-3)

| Field | Value |
|---|---|
| Area | FE | Type | Implementation | Priority | Must | Estimate | M |
| Depends On | FE-002 | Source AC(s) | AC-01, AC-05 |

Selectores con catálogo backend; validación cap 1-3.

---

### TASK-PB-P1-024-US-040-FE-005 — `LanguagesStep` (multi-select languages_supported)

| Field | Value |
|---|---|
| Area | FE | Type | Implementation | Priority | Must | Estimate | S |
| Depends On | FE-002 | Source AC(s) | AC-01, AC-05 |

Multi-select con catálogo de `LanguageCode`.

---

### TASK-PB-P1-024-US-040-FE-006 — `ReviewStep` + i18n 4 locales

| Field | Value |
|---|---|
| Area | FE | Type | Implementation | Priority | Must | Estimate | S |
| Depends On | FE-003, FE-004, FE-005 | Source AC(s) | AC-01, AC-06 |

Confirmación + submit + claves `vendor.profile.*` en `es-LATAM/es-ES/pt/en`.

---

### TASK-PB-P1-024-US-040-SEED-001 — Seed con 10-20 vendors mixtos pending/approved

| Field | Value |
|---|---|
| Area | SEED | Type | Setup | Priority | Should | Estimate | M |
| Source AC(s) | — (BR-SEED-002) |

Reuso del seed entregado por PB-P0-001 / módulo Demo; verificar ratio y completitud.

---

### TASK-PB-P1-024-US-040-QA-001 — UT (slug, DTOs, use case)

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | M |
| Depends On | BE-001, BE-002, BE-003, BE-004 | Source AC(s) | AC-01..04, EC-01..07 |

---

### TASK-PB-P1-024-US-040-QA-002 — IT (happy path, uniqueness, categorías/ciudad inválidas, languages vacíos)

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | M |
| Depends On | BE-004, BE-005 | Source AC(s) | AC-01, AC-03, EC-01..07 |

---

### TASK-PB-P1-024-US-040-QA-003 — Authorization tests (Vendor 201, Organizer 403, Admin 403, Sin sesión 401)

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | S |
| Depends On | BE-005 | Source AC(s) | SEC-01..05 |

---

### TASK-PB-P1-024-US-040-QA-004 — PERF-01 (P95 < 1.5 s)

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | S |
| Depends On | BE-005 | Source AC(s) | AC-07 |

---

### TASK-PB-P1-024-US-040-QA-005 — A11Y wizard con jest-axe

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | S |
| Depends On | FE-002..006 | Source AC(s) | AC-05 |

---

### TASK-PB-P1-024-US-040-QA-006 — Contract test CONTRACT-01

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Should | Estimate | S |
| Depends On | BE-002, BE-005 | Source AC(s) | AC-04 |

---

### TASK-PB-P1-024-US-040-QA-007 — E2E Playwright (onboarding completo)

| Field | Value |
|---|---|
| Area | QA | Type | Test | Priority | Must | Estimate | M |
| Depends On | FE-006, SEED-001 | Source AC(s) | AC-01, AC-02 |

Registro vendor → wizard → banner "En revisión".

---

### TASK-PB-P1-024-US-040-DOC-001 — Actualizar `docs/16 §M07` con shape del body extendido

| Field | Value |
|---|---|
| Area | DOC | Type | Documentation | Priority | Should | Estimate | XS |
| Depends On | BE-002 | Source AC(s) | AC-04 |

---

### TASK-PB-P1-024-US-040-DOC-002 — Nota interpretativa en `docs/4 §BR-VENDOR-002` (cap inicial 1-3)

| Field | Value |
|---|---|
| Area | DOC | Type | Documentation | Priority | Should | Estimate | XS |

---

### TASK-PB-P1-024-US-040-DOC-003 — Verificar/documentar `vendor_profile.slug` UNIQUE en PB-P0-001

| Field | Value |
|---|---|
| Area | DOC | Type | Documentation | Priority | Should | Estimate | XS |
| Depends On | DB-001 |

---

## 4. Required QA Tasks

| Task ID | Test Type |
|---|---|
| QA-001 | Unit |
| QA-002 | Integration |
| QA-003 | Authorization |
| QA-004 | Performance |
| QA-005 | Accessibility |
| QA-006 | Contract |
| QA-007 | E2E |

---

## 5. Risks & Mitigations

| Risk | Mitigation | Related |
|---|---|---|
| `category_change_count` faltante | DB-001 verifica; migración si necesaria | DB-001, DOC-003 |
| Slug colisión concurrente | UNIQUE constraint + retry | BE-001, BE-004 |
| Wizard mobile complicado | Tests E2E + responsive | FE-002..006, QA-007 |

---

## 6. Out of Scope

* PATCH /vendors/me (US-041).
* submit-approval (US-041).
* Aprobación admin (US futura).
* Notification entity (US futura).
* AI bio (US-023).

---

## 7. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Every AC maps | Pass |
| Tech Spec used | Pass |
| QA included | Pass |
| Sec included | Pass (QA-003) |
| Seed | Pass |
| Obs | Pass (BE-006) |
| Docs | Pass |
| Deps clear | Pass |
| Small enough | Pass |
| Ready | Yes |

---

## 8. Final Recommendation

`Ready for Sprint Planning`. 24 tareas. Scope mínimo: 1 endpoint + 1 use case + wizard frontend + helper de slug + logger. Cierra base del módulo Vendors.
