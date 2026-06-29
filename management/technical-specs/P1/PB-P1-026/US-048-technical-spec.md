# Technical Specification — US-048: Soft-deletear una imagen del portafolio

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-048                                                                                                         |
| Source User Story                    | `management/user-stories/US-048-soft-delete-portfolio-image.md`                                                |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-048-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-026                                                                                                      |
| Backlog Title                        | Portafolio del vendor (10 imágenes / trabajo)                                                                  |
| Backlog Execution Order              | 45 (cierre del backlog item junto con US-043)                                                                  |
| User Story Position in Backlog Item  | 2 de 2 (US-043 → US-048)                                                                                       |
| Related User Stories in Backlog Item | US-043, US-048                                                                                                 |
| Epic                                 | EPIC-VND-001                                                                                                   |
| Backlog Item Dependencies            | PB-P1-024 (perfil), PB-P0-001 (schema), PB-P0-003 (error envelope), US-043 (módulo `modules/attachments`)      |
| Feature                              | Soft delete vendor-driven del portafolio                                                                       |
| Module / Domain                      | Attachments / Vendors                                                                                          |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-26                                                                                                     |
| Last Updated                         | 2026-06-26                                                                                                     |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-026` cierra con US-048 (DELETE soft). Depende de US-043 que entrega tabla `attachments`, módulo `modules/attachments`, repository, port + adapter, controller base y frontend `WorkGrid`.

### Execution Order Rationale

US-048 se ejecuta inmediatamente después de US-043. Posición 2 de 2. Reuso íntegro del módulo introducido por US-043.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-043     | Upload de imágenes por `work_label`.          | 1               |
| US-048     | Soft delete vendor-driven del attachment.     | 2               |

---

## 3. Executive Technical Summary

US-048 extiende `PortfolioController` con un handler `deletePortfolioImage(req, res)` y agrega `SoftDeletePortfolioImageUseCase` al módulo `modules/attachments` introducido en US-043. La pipeline server-side:

1. Validación del path param `:imageId` (UUID) con Zod.
2. Validación opcional del body `{ "deletion_reason": string }` (1..500 chars).
3. Resolución del `vendor_profile` por sesión + política por status (D3): `hidden` ⇒ `409 PROFILE_HIDDEN`; soft-deleted ⇒ `404`.
4. Repository busca el attachment con filtros `owner_type='vendor_work'`, `owner_id=vendor_profile.id`, `status='active'`. Si no encuentra ⇒ `404 ATTACHMENT_NOT_FOUND` (uniforme: cubre ajeno, inexistente y ya soft-deleted; D4).
5. UPDATE único: `status='deleted'`, `deleted_at=NOW()`, `deleted_by=currentUser.id`, `deletion_reason` (o null).
6. Emite log `vendor.portfolio.deleted` con `correlation_id`, `vendor_profile_id`, `attachment_id`, `work_label`, `deletion_reason`.
7. Responde `204 No Content`.

Sin migraciones nuevas: PB-P0-001 entregó `attachments.status`, `deleted_at`, `deleted_by`, `deletion_reason`.

---

## 4. Scope Boundary

### In Scope

- `SoftDeletePortfolioImageUseCase` con todas las branches.
- DTO Zod del path param + body opcional.
- Repository extension `softDeleteByIdOwned` y `findActiveOwnedByIdAndVendor`.
- Controller handler + ruta.
- Frontend `DeleteImageDialog` (modal accesible).
- `vendorsApi.deletePortfolioImage` + MSW.
- i18n 4 locales.
- Tests (UT, IT, AUTH, Contract, A11Y).
- Documentación.

### Out of Scope

- Hard delete físico del registro o binario.
- Lifecycle policies / purge físico.
- Restauración del attachment (undelete).
- Edición de `deletion_reason` post-delete.
- `AdminAction` (acciones admin-driven `hide_attachment`/`remove_attachment` viven en flujos admin futuros).

### Explicit Non-Goals

- No tocar el binario en disco.
- No introducir nuevas tablas ni enums.

---

## 5. Architecture Alignment

### Backend Architecture

Reuso íntegro del módulo `modules/attachments` introducido en US-043. Use case sin transacción (operación de un solo update). Reuso del `VendorRoleGuard` + exclusion guards.

### Frontend Architecture

Reuso de `WorkGrid` extendiendo `ImageThumb` con botón "Eliminar". Nuevo componente `DeleteImageDialog` (modal accesible con textarea opcional para `deletion_reason`). TanStack Query mutation.

### Database Architecture

Sin migraciones. Reuso de columnas existentes en `attachments`.

### API Architecture

REST JSON bajo `/api/v1`. Endpoint con UUID en path; body JSON opcional. Error envelope estándar.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

Ownership por sesión. Idempotencia perceptual: `404 ATTACHMENT_NOT_FOUND` uniforme para no revelar existencia/ownership ajeno. Política por status del perfil heredada de US-041/US-043.

### Testing Architecture

Vitest + Supertest + RTL + axe.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                              | Impacted Layer(s) |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 soft delete válido    | UPDATE único + log + `204`.                                                                            | BE, DB            |
| AC-02 sin body              | DTO opcional; persiste `null`.                                                                         | BE                |
| EC-01 ajeno/inexistente     | Filtro de repository + `404 ATTACHMENT_NOT_FOUND` uniforme.                                            | BE                |
| EC-02 idempotencia          | `status='deleted'` queda fuera del filtro `active`; mismo `404`.                                       | BE                |
| EC-03 `hidden`              | Verificación previa al repository; `409 PROFILE_HIDDEN`.                                              | BE                |
| EC-04 soft-deleted perfil   | Verificación previa; `404`.                                                                            | BE                |
| EC-05 `deletion_reason` > 500 | Zod refine; `400 INVALID_DELETION_REASON`.                                                            | BE                |
| AUTH-TS-01..08              | Guards + middleware sesión + matriz auth × estado.                                                     | BE                |
| A11Y modal                  | `role="dialog"`, focus trap, ESC.                                                                     | FE                |
| i18n 4 locales              | Claves `vendor.portfolio.delete.*`.                                                                   | FE                |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

`modules/attachments` (extensión).

### Use Cases / Application Services

**`SoftDeletePortfolioImageUseCase`**

1. Recibe `{ currentUser, imageId, body }`.
2. Valida `imageId` UUID y body con `softDeletePortfolioImageBody` (Zod `.strict()` opcional).
3. `vendorProfile = vendorProfileRepository.findActiveByVendorUserId(currentUser.id)`. Si null o `deleted_at` → `404`.
4. Si `vendorProfile.status === 'hidden'` → `409 PROFILE_HIDDEN`.
5. `attachment = attachmentRepository.findActiveOwnedByIdAndVendor(imageId, vendorProfile.id)`. Si null → `404 ATTACHMENT_NOT_FOUND`.
6. `attachmentRepository.softDeleteByIdOwned({ id: imageId, ownerId: vendorProfile.id, deletedBy: currentUser.id, deletionReason: body?.deletion_reason ?? null })`. Update único.
7. Emite log `vendor.portfolio.deleted` con `vendor_profile_id`, `attachment_id`, `work_label`, `deletion_reason`, `correlation_id`.
8. Retorna `void` para mapear a `204`.

### Controllers / Routes

```ts
router.delete(
  '/vendors/me/portfolio/images/:imageId',
  vendorRoleGuard,
  adminExclusionGuard,
  organizerExclusionGuard,
  asyncHandler(controller.deletePortfolioImage.bind(controller))
);
```

### DTOs / Schemas

```ts
export const imageIdParam = z.object({ imageId: z.string().uuid() });

export const softDeletePortfolioImageBody = z.object({
  deletion_reason: z.string().min(1).max(500).optional(),
}).strict();
```

### Repository / Persistence

Extensiones a `AttachmentRepository`:

```ts
findActiveOwnedByIdAndVendor(imageId: string, ownerId: string): Promise<Attachment | null>
  // WHERE id = ? AND owner_id = ? AND owner_type='vendor_work' AND status='active'

softDeleteByIdOwned(args: {
  id: string;
  ownerId: string;
  deletedBy: string;
  deletionReason: string | null;
}): Promise<void>
  // UPDATE attachments SET status='deleted', deleted_at=NOW(), deleted_by=?, deletion_reason=?
  // WHERE id = ? AND owner_id = ? AND status='active'
  // El WHERE incluye 'active' como guard de idempotencia (TOCTOU-safe).
```

### Validation Rules

Ver §VR-01..VR-06 de la US.

### Error Handling

Códigos: `400 INVALID_UUID`, `400 INVALID_DELETION_REASON`, `401`, `403`, `404 ATTACHMENT_NOT_FOUND`, `404` (perfil soft-deleted), `409 PROFILE_HIDDEN`.

### Transactions

No requerida. Update atómico de PostgreSQL.

### Observability

Log `vendor.portfolio.deleted` (info) con campos del §7.

---

## 8. Frontend Technical Design

### Routes / Pages

Reuso de `app/[locale]/vendor/portfolio/page.tsx`.

### Components

- Extensión de `ImageThumb` con botón "Eliminar".
- Nuevo `DeleteImageDialog` (modal `role="dialog"`, focus trap, ESC, textarea opcional con label visible).

### Forms

RHF + Zod (espejo del backend para `deletion_reason`).

### State Management

TanStack Query mutation `useDeletePortfolioImage` + invalidación de `vendor.me.portfolio`.

### Data Fetching

`vendorsApi.deletePortfolioImage({ imageId, deletionReason? })`.

### Loading / Empty / Error / Success States

- Loading: spinner en CTA del modal; thumbnail con opacidad reducida.
- Empty: N/A.
- Error: banner i18n por código.
- Success: thumbnail desaparece + contador decrementa + close del modal.

### Accessibility

Modal accesible: foco inicial en botón "Cancelar"; ESC cierra; aria-label del botón "Eliminar" incluye `work_label`.

### i18n

Claves `vendor.portfolio.delete.*` en 4 locales.

---

## 9. API Contract Design

| Method | Endpoint                                              | Purpose                | Auth Required | Request                                                       | Response       | Error Cases                                                                                                                                                       |
| ------ | ----------------------------------------------------- | ---------------------- | ------------- | ------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DELETE | `/api/v1/vendors/me/portfolio/images/:imageId`        | Soft delete attachment. | Sí (vendor)   | Body opcional JSON `{ "deletion_reason": string (1..500) }`. | `204 No Content`. | `400 INVALID_UUID`, `400 INVALID_DELETION_REASON`, `401`, `403`, `404 ATTACHMENT_NOT_FOUND`, `404` (perfil soft-deleted), `409 PROFILE_HIDDEN`. |

---

## 10. Database / Prisma Design

### Models Impacted

- `Attachment` (update único).
- `VendorProfile` (lectura).

### Fields / Columns

Sin nuevos.

### Relations

Sin cambios.

### Indexes

Reuso de `idx_attachments_vendor_work_active` y del índice PK por `id`.

### Constraints

C-037 (soft delete auditoría), C-060 (soft delete con auditoría).

### Migrations Impact

Ninguna.

### Seed Impact

Reuso del seed de US-043. Opcional: añadir un attachment ya soft-deleted para demo de idempotencia.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

HTTP-only cookie.

### Authorization

Ownership por sesión.

### Ownership Rules

`attachment.owner_id == vendor_profile.id` (derivado de la sesión).

### Role Rules

Sólo `vendor`. Admin/Organizer rechazados por exclusion guards.

### Negative Authorization Scenarios

- `401` sin sesión.
- `403` admin/organizer.
- `404 ATTACHMENT_NOT_FOUND` para ajeno/inexistente/ya borrado (no revela existencia/ownership).
- `409 PROFILE_HIDDEN`.
- `404` perfil soft-deleted.

### Audit Requirements

Sin `AdminAction`. Log estructurado `vendor.portfolio.deleted`.

### Sensitive Data Handling

`deletion_reason` se almacena tal cual; no contiene PII especial. Truncamiento si excede 500 → `400`.

---

## 13. Testing Strategy

### Unit Tests

- DTO Zod (path + body).
- Branches del use case: éxito con/sin body, hidden, soft-deleted perfil, ajeno, inexistente, ya borrado.
- Repository: `findActiveOwnedByIdAndVendor` + `softDeleteByIdOwned`.

### Integration Tests

- TS-01..TS-04, NT-01..NT-06.
- Idempotencia (segundo DELETE → 404).
- Verificación del log emitido.

### API Tests

Supertest cubriendo todos los códigos.

### E2E Tests

Opcional Playwright para el flujo modal → DELETE → grid actualizada.

### Security Tests

- Confirmar `404` uniforme para ajeno/inexistente/ya borrado.
- Confirmar que `:imageId` malformado → `400 INVALID_UUID`.

### Accessibility Tests

- `DeleteImageDialog`: focus trap, ESC, foco inicial en "Cancelar", labels visibles, contraste AA.

### AI Tests

No aplica.

### Seed / Demo Tests

Verificar reuso del seed de US-043.

### CI Checks

Lint + Vitest + Supertest.

---

## 14. Observability & Audit

### Logs

- `vendor.portfolio.deleted` (info) con `vendor_profile_id`, `attachment_id`, `work_label`, `deletion_reason`, `correlation_id`.

### Correlation ID

Propagado desde middleware central.

### AdminAction

No requerido.

### Error Tracking

Heredado.

### Metrics

N/A.

---

## 15. Seed / Demo Data Impact

Reuso del seed de US-043. Opcional: añadir un attachment soft-deleted para demo de idempotencia. No bloqueante.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar el endpoint DELETE.                                  | Documentar tras D1.                            | Actualizar `docs/16` con request/response/errors.           | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                        | Impact                | Mitigation                                                                            |
| ------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| Race entre DELETE y otro DELETE concurrente.                                                 | Doble side-effect.    | UPDATE con guard `status='active'` en el WHERE (TOCTOU-safe).                          |
| Filtrado de información ajena vía 404 vs 403.                                                | Information leak.    | Política unificada `404 ATTACHMENT_NOT_FOUND` (no distingue ownership).               |
| Binario huérfano si se purga el registro sin el binario (futuro).                             | Acumulación de basura. | Documentar Out of Scope; el lifecycle policy futuro gestionará la limpieza.          |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/attachments/dto/soft-delete-portfolio-image.body.ts`
- `src/modules/attachments/use-cases/soft-delete-portfolio-image.use-case.ts`
- `src/modules/attachments/repositories/attachment.repository.ts` (extender)
- `src/modules/attachments/controllers/portfolio.controller.ts` (extender)
- `src/modules/attachments/routes/portfolio.routes.ts` (registrar DELETE)
- `src/shared/logging/vendor-events.ts` (extender con `vendor.portfolio.deleted`)

**Frontend**:
- `components/vendor/portfolio/DeleteImageDialog.tsx`
- `components/vendor/portfolio/ImageThumb.tsx` (extender con CTA Eliminar)
- `lib/api/vendorsApi.ts` (añadir `deletePortfolioImage`)
- `messages/{es-LATAM,es-ES,pt,en}.json`

### Orden sugerido

1. Repository extensions + UT.
2. Use case + UT por branch.
3. Controller + ruta.
4. Logger extension.
5. `vendorsApi` + MSW.
6. `DeleteImageDialog` + extensión de `ImageThumb`.
7. i18n.
8. Tests integración + auth + a11y.
9. Documentación.

### Decisiones que no deben reabrirse

D1 (endpoint UUID), D2 (`deletion_reason` opcional), D3 (política por status), D4 (`404 ATTACHMENT_NOT_FOUND` uniforme).

### Qué no implementar

- Hard delete físico.
- Restauración (undelete).
- Lifecycle policies.
- `AdminAction` para vendor-driven.

### Assumptions to preserve

- Reuso íntegro de módulo `modules/attachments` de US-043.
- `attachment.status` enum sólo tiene `active` y `deleted`.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| BE    | 5 (DTO, repo ext., use case, controller ext., logger ext.) |
| FE    | 3 (DeleteImageDialog, ImageThumb ext. + vendorsApi, i18n) |
| QA    | 5 (UT, IT, AUTH, Contract, A11Y) |
| DOC   | 1 (docs/16) |

**Total estimado ~14 tareas.**

### Required QA tasks

- Unit + Integration + Auth + Contract + A11Y.

### Required security tasks

- Política `404` uniforme verificada (parte de QA-002 / QA-003).

### Required seed/demo tasks

- Opcional / no bloqueante (reuso US-043).

### Required documentation tasks

- `docs/16 §M07`.

### Dependencies between tasks

- BE-001..005 secuencial; FE depende de BE-004 (controller).

### Backlog consolidated `tasks.md`

Tras procesar US-043 y US-048, considerar generar `management/development-tasks/P1/PB-P1-026/tasks.md` consolidado.

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec    | Pass   |
| Product Backlog mapping found                                | Pass   |
| Decision Resolution reviewed if present                      | Pass   |
| Scope clear                                                  | Pass   |
| Architecture alignment clear                                 | Pass   |
| API impact clear                                             | Pass   |
| DB impact clear                                              | Pass   |
| AI impact clear                                              | N/A    |
| Security impact clear                                        | Pass   |
| Testing strategy clear                                       | Pass   |
| Ready for Development Task Breakdown                         | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-048 cierra PB-P1-026 reusando íntegramente el módulo `modules/attachments` introducido en US-043. Sin migraciones. Política `404 ATTACHMENT_NOT_FOUND` uniforme protege contra information leakage. 1 acción documental no bloqueante.
