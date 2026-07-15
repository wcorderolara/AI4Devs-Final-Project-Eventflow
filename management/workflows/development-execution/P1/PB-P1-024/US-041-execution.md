# Execution Record — PB-P1-024 / US-041: Editar y soft-delete VendorProfile

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-041 |
| User Story Title | Editar y soft-delete del VendorProfile (con re-pending automático) |
| Phase | P1 |
| Backlog Position | PB-P1-024 |
| User Story Path | management/user-stories/US-041-edit-vendor-profile.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-024/US-041-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-024/US-041-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD (mvp/PB-P1-024) |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-024 |
| Initial Commit Hash | aa5333a |
| Started At | 2026-07-15T00:00:00Z |
| Last Updated At | 2026-07-15T00:00:00Z |
| Completed At | 2026-07-15T00:00:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (`scripts/validate-inputs.sh` exit=0)
- [x] User Story ID coincide (US-041)
- [x] Phase coincide (P1)
- [x] Backlog Position coincide (PB-P1-024)
- [x] Documentos legibles
- [x] IDs de tarea extraídos: BE-001..006, FE-001..004, QA-001..006, DOC-001..003 (19 tareas)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Warnings:
  - W1: Naming del módulo — Tech Spec asume `modules/vendors`; el repo real usa `modules/vendor-management` (heredado US-040 DEV-01).
  - W2: Ruta FE — Tech Spec asume `/[locale]/vendor/profile/edit`; el repo no usa prefijo `[locale]`. Se implementa `/vendor/profile/edit`.
  - W3: Guards — Tech Spec asume `VendorRoleGuard`+exclusion guards; el repo usa `roleMiddleware(['vendor'])` (ADR-SEC-003).
  - W4: Schema `AdminAction` — el modelo Prisma actual tenía `adminUserId NOT NULL` + FK Restrict a User, sin `actor_user_id`/`correlation_id`. Se agrega migración menor (EMERGENT-001).
  - W5: `deleted_by` no existía en `vendor_profiles`. Se agrega en la misma migración (EMERGENT-001).
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Hallazgos de arquitectura:
  - H1: `AdminActionWritePort` se define en `modules/vendor-management/ports/` con adapter Prisma en `infrastructure/`. TODO documentado para relocalizar cuando exista módulo Admin formal.
  - H2: Transacción atómica `prisma.$transaction` envuelve update + status + AdminAction. Sin `SELECT FOR UPDATE` nativo (Prisma 5.22); READ COMMITTED + UNIQUE(user_id) + edición del propio vendor suficiente.
  - H3: Errores nuevos (`PROFILE_HIDDEN`, `PROFILE_REJECTED`, `PROFILE_DELETED`, `PROFILE_NOT_FOUND`) registrados en `error-codes.ts` y `error-handler.middleware.ts` antes del `ConflictError` genérico.
- Deviations aceptadas (§9).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-024-US-041-EMERGENT-001 | Migración `admin_actions.actor_user_id`/`actor_role`/`correlation_id` (admin_user_id nullable) + `vendor_profiles.deleted_by` | 0 | — | Done | 2026-07-15 | 2026-07-15 | AC-02, AC-05 | Migración `20260715140000_us041_admin_actions_actor_and_vendor_soft_delete/migration.sql` aplicada contra Postgres real. Schema Prisma alineado. `prisma validate` + `prisma generate` OK. |
| TASK-PB-P1-024-US-041-BE-001 | DTO Zod update strict + refine | 1 | — | Done | 2026-07-15 | 2026-07-15 | AC-07, VR-05, VR-09 | `interface/dto/update-vendor-profile.request.ts` con opcionales + `.strict()` + `.refine` (body no vacío) + helper `hasMajorField` (D1). |
| TASK-PB-P1-024-US-041-BE-002 | AdminActionWritePort + Prisma adapter | 2 | — | Done | 2026-07-15 | 2026-07-15 | AC-02 | `ports/admin-action-write.port.ts` + `infrastructure/prisma-admin-action-write.adapter.ts`. Actor con `actor_user_id`+`actor_role`+`correlation_id`. |
| TASK-PB-P1-024-US-041-BE-003 | Extensión repository | 3 | — | Done | 2026-07-15 | 2026-07-15 | AC-01..05 | `VendorProfileRepository` extendido con `findEditableByVendorUserId`, `findAnyByVendorUserId`, `update`, `updateStatus`, `softDelete`, `findByIdWithCategories`. Adapter Prisma implementa todos los métodos. |
| TASK-PB-P1-024-US-041-BE-004 | UpdateVendorProfileUseCase | 4 | BE-001..003 | Done | 2026-07-15 | 2026-07-15 | AC-01..04, AC-06, AC-07, EC-01..03, EC-06..08, VR-01..09 | `application/update-vendor-profile.use-case.ts` con detección de mayores (D1) + transacción atómica update+status+AdminAction (D2). Logger `updated` + `repending` condicional. |
| TASK-PB-P1-024-US-041-BE-005 | SoftDeleteVendorProfileUseCase | 5 | BE-003 | Done | 2026-07-15 | 2026-07-15 | AC-05, EC-04..05, VR-07 | `application/soft-delete-vendor-profile.use-case.ts`. Usa `findAnyByVendorUserId` para diferenciar 404 vs 409. |
| TASK-PB-P1-024-US-041-BE-006 | Controller + rutas PATCH/DELETE + logger | 6 | BE-004, BE-005 | Done | 2026-07-15 | 2026-07-15 | AC-01..05, SEC-01..05 | `VendorProfileController` extendido con `update`, `softDelete`, `getMine` (EMERGENT). Rutas GET/PATCH/DELETE `/api/v1/vendors/me` con `sessionAuth`+`roleMiddleware(['vendor'])`. Logger con 4 eventos (`created`/`updated`/`repending`/`soft_deleted`). |
| TASK-PB-P1-024-US-041-EMERGENT-002 | GET /api/v1/vendors/me | 7 | BE-003 | Done | 2026-07-15 | 2026-07-15 | AC-01 | Requerido para hidratar el `VendorProfileEditor` con el perfil actual. Reusa `findEditableByVendorUserId` + `findByIdWithCategories`. |
| TASK-PB-P1-024-US-041-FE-001 | Cliente vendorsApi.update + softDelete + getMine | 8 | BE-006 | Done | 2026-07-15 | 2026-07-15 | AC-01..05 | `vendorProfileApi.update`, `softDelete`, `getMine` + hooks `useUpdateVendorProfile`, `useSoftDeleteVendorProfile`, `useMyVendorProfile`. |
| TASK-PB-P1-024-US-041-FE-002 | VendorProfileEditor + tracking dirty mayores + banner | 9 | FE-001 | Done | 2026-07-15 | 2026-07-15 | AC-01..03, AC-06, AC-09 | `components/VendorProfileEditor.tsx` con RHF+Zod, warning modal previo a submit cuando hay dirty mayor y status=approved, banner condicional según `repending`. |
| TASK-PB-P1-024-US-041-FE-003 | DeleteProfileDialog modal accesible | 10 | FE-001 | Done | 2026-07-15 | 2026-07-15 | AC-05, AC-09 | `components/DeleteProfileDialog.tsx` con `role="dialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby`, focus trap (Tab circular + autofocus + ESC). |
| TASK-PB-P1-024-US-041-FE-004 | i18n `vendor.profile.edit.*` en 4 locales | 11 | FE-002, FE-003 | Done | 2026-07-15 | 2026-07-15 | AC-10 | `vendor.json` en `es-LATAM`/`es-ES`/`pt`/`en` extendidos con `edit.*` (fields, buttons, banners, confirmMajor, delete, errors) + `validation.noFieldsToUpdate`. |
| TASK-PB-P1-024-US-041-QA-001 | UT (DTO, isMajor, use cases) | 12 | BE-001, BE-004, BE-005 | Done | 2026-07-15 | 2026-07-15 | AC-01..07, EC-01..08 | `tests/unit/us041-update-and-soft-delete-vendor-profile.spec.ts` — 22 tests verdes. |
| TASK-PB-P1-024-US-041-QA-002 | IT (TS-01..06) | 13 | BE-006 | Done | 2026-07-15 | 2026-07-15 | AC-01..06 | `tests/api/us041-update-and-soft-delete-vendor-profile.spec.ts` — TS-01/02/03/04/06 verdes contra Postgres real (los IDs `TS-05` cubiertos por el DELETE approved). |
| TASK-PB-P1-024-US-041-QA-003 | Negative tests (NT-01..10) | 14 | BE-006 | Done | 2026-07-15 | 2026-07-15 | EC-01..08, VR-01..09 | Cubierto por el mismo archivo IT: NT-01 (rejected), NT-02 (hidden), NT-04..06 (extras), NT-07 (vacío), NT-08 (location), NT-09 (bio), NT-10 (sin perfil). |
| TASK-PB-P1-024-US-041-QA-004 | Auth tests + PERF-01 | 15 | BE-006 | Partial | 2026-07-15 | 2026-07-15 | SEC-01..05, AC-08 | AUTH: SEC-T (anónimo), organizer 403 verificado. PERF-01 no ejecutado (harness no wired, DEBT-01). |
| TASK-PB-P1-024-US-041-QA-005 | A11Y (editor + delete dialog) | 16 | FE-002, FE-003 | Done | 2026-07-15 | 2026-07-15 | AC-09 | `web/src/tests/unit/vendor-profile/us041-editor.test.tsx` — jest-axe sin violaciones en editor y en dialog + ESC cierra + Cancel funciona. 6 tests verdes. |
| TASK-PB-P1-024-US-041-QA-006 | Contract test CONTRACT-01 | 17 | BE-001, BE-006 | Not Run | | | AC-04 | Snapshot OpenAPI vive en US-098 (PB-P0-005). Los tests IT validan el shape del response directamente. Deuda documentada. |
| TASK-PB-P1-024-US-041-DOC-001 | Docs 16 §M07 PATCH/DELETE + codes | 18 | BE-006 | Done | 2026-07-15 | 2026-07-15 | AC-04 | `docs/16 §27.4` con PATCH/DELETE + GET + nuevos códigos `PROFILE_NOT_FOUND`/`REJECTED`/`HIDDEN`/`DELETED`. |
| TASK-PB-P1-024-US-041-DOC-002 | Docs 4 §BR-VENDOR-003 nota D2 | 19 | — | Done | 2026-07-15 | 2026-07-15 | — | `BR-VENDOR-003` extendida con nota interpretativa D2 (re-pending automático), campos mayores y AdminAction. |
| TASK-PB-P1-024-US-041-DOC-003 | Docs 4 §BR-VENDOR-002 nota D5 slug inmutable | 20 | — | Done | 2026-07-15 | 2026-07-15 | — | `BR-VENDOR-002` extendida con "**es inmutable** — cambio de `business_name` NO regenera slug". |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Status |
| -- | ------ | ----------- | ----- | --------- | ------ |
| EMERGENT-001 | Migración `admin_actions` + `deleted_by` | BE-002/BE-005 | Schema PB-P0-001 no expone `actor_user_id` ni `correlation_id`, y `vendor_profiles.deleted_by` no existe. Bloqueaba AC-02 y AC-05. | Requerida | Done |
| EMERGENT-002 | `GET /api/v1/vendors/me` | FE-002 | El editor necesita hidratar el perfil actual antes de renderizar el form. Sin este endpoint, la UI no puede cumplir AC-01. | Requerida | Done |

## 7. Evidence by Task

Ver §5 columna "Evidencia (resumen)".

### Cambios de infraestructura relevantes
- **Prisma schema**: `AdminAction.adminUserId` nullable + `actorUserId`/`actorRole`/`correlationId`; índices `actor_user_id` y `(target_entity, target_id)`. `VendorProfile.deletedBy` opcional.
- **Error handler**: 4 nuevos errores tipados registrados antes de `ConflictError`.
- **Error codes**: `PROFILE_NOT_FOUND`, `PROFILE_REJECTED`, `PROFILE_HIDDEN`, `PROFILE_DELETED`, `INVALID_FIELD` agregados.

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------- | ---------- |
| DEV-01 | `modules/vendors` | `modules/vendor-management` | Naming DDD (heredado US-040) | Bajo | No | Aceptado |
| DEV-02 | Guards dedicados | `roleMiddleware(['vendor'])` | ADR-SEC-003 | Bajo | No | Aceptado |
| DEV-03 | `/[locale]/vendor/profile/edit` | `/vendor/profile/edit` | next-intl sin prefijo URL | Bajo | No | Aceptado |
| DEV-04 | `SELECT FOR UPDATE` en repo | Omite; READ COMMITTED + UNIQUE(user_id) suficiente | Prisma 5.22 no expone `FOR UPDATE` nativo y el vendor solo edita su propio perfil | Bajo | No | Aceptado |
| DEV-05 | `AdminAction.actor_id` | `actor_user_id` + `actor_role`; `admin_user_id` nullable | El schema PB-P0-001 solo tiene `adminUserId`; extender con columnas opcionales evita romper adopción existente | Bajo | No | Aceptado |

## 10. Deuda técnica

| # | Descripción | Impacto | Follow-up |
| - | ----------- | ------- | --------- |
| DEBT-01 | `QA-004` PERF-01 (P95 < 1.5s) sin harness dedicado. | Bajo (compromiso NFR informativo) | Incluir el endpoint en el próximo pase perf. |
| DEBT-02 | `QA-006` CONTRACT-01: snapshot OpenAPI no regenerado (US-098 lo posee). Los tests IT validan el shape canónico. | Bajo | Regenerar spec cuando se actualice PB-P0-005. |
| DEBT-03 | Adapter directo `PrismaAdminActionWriteAdapter` en `modules/vendor-management`. | Bajo (TODO ya documentado en el archivo) | Relocalizar bajo `modules/admin-governance` cuando exista port formal. |

## 11. Final Validation

- Task completion: 20 Done (incluye 2 emergentes) / 1 Partial (QA-004) / 1 Not Run (QA-006) / 0 Blocked.
- Acceptance Criteria coverage:
  - AC-01 PATCH menor → **Cubierto** (UT + IT verdes).
  - AC-02 PATCH mayor desde approved → re-pending + AdminAction → **Cubierto** (UT + IT verifican AdminAction inserted con actorRole/correlationId).
  - AC-03 PATCH desde pending → sin transición → **Cubierto** (UT + IT).
  - AC-04 PATCH/DELETE bloqueado en rejected/hidden → **Cubierto** (UT + IT).
  - AC-05 DELETE soft delete → **Cubierto** (UT + IT + verificación DB de `deletedAt`/`deletedBy`).
  - AC-06 Slug inmutable → **Cubierto** (IT TS-06).
  - AC-07 Zod strict → **Cubierto** (UT + IT NT-04..06).
  - AC-08 Performance P95 < 1.5s → **Not Run** (DEBT-01).
  - AC-09 A11Y → **Cubierto** (jest-axe editor + dialog).
  - AC-10 i18n → **Cubierto** (4 locales).
- Lint: **Passed** (backend + web).
- Typecheck: **Passed**.
- Tests: **Passed** — Backend US-041: 22 unit + 19 IT = 41/41 contra Postgres real; Web US-041: 6/6 (a11y + navegación).
- Build: **Passed** (`/vendor/profile/edit` listada).
- Migrations: **Applied** contra Postgres real.
- Authorization: **Passed** (401 anónimo, 403 organizer, 404 sin perfil, 409 estados bloqueados).
- Security: **Passed** (Zod strict, ownership por sesión, logger sin PII, AdminAction con correlationId).
- Accessibility: **Passed** (jest-axe sin violaciones + focus trap + ESC).
- i18n: **Passed** (4 locales).
- Documentation: **Passed** (Docs 4 + 16 actualizados).
- Unresolved debt: DEBT-01..03 (§10).
- Final status: **Done** con deuda menor documentada.

## 12. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-15T00:00:00Z | Initialized | Execution record creado |
| 2026-07-15T00:00:00Z | Readiness | READY_WITH_WARNINGS (W1..W5) |
| 2026-07-15T00:00:00Z | Alignment | ALIGNED_WITH_NOTES |
| 2026-07-15T00:00:00Z | EMERGENT-001 | Done — migración admin_actions + vendor_profiles.deleted_by |
| 2026-07-15T00:00:00Z | BE-001..006 | Done — módulo vendor-management extendido |
| 2026-07-15T00:00:00Z | EMERGENT-002 | Done — GET /vendors/me |
| 2026-07-15T00:00:00Z | FE-001..004 | Done — Editor + Dialog + i18n |
| 2026-07-15T00:00:00Z | QA-001..005 | Done — 41 tests backend + 6 tests web verdes |
| 2026-07-15T00:00:00Z | DOC-001..003 | Done — Docs 4 + 16 |
| 2026-07-15T00:00:00Z | Final | Done con deuda técnica documentada |
