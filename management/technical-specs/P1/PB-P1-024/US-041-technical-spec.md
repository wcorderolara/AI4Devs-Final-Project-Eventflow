# Technical Specification — US-041: Editar y soft-delete VendorProfile

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-041                                                                                                         |
| Source User Story                    | `management/user-stories/US-041-edit-vendor-profile.md`                                                       |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-041-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-024                                                                                                      |
| Backlog Title                        | VendorProfile: crear y editar                                                                                  |
| Backlog Execution Order              | 43                                                                                                              |
| User Story Position in Backlog Item  | 2 de 2 (US-040 → US-041)                                                                                       |
| Epic                                 | EPIC-VND-001                                                                                                    |
| Backlog Item Dependencies            | PB-P1-024 / US-040 (creación + repository + schema)                                                            |
| Feature                              | Edición + Soft delete del VendorProfile                                                                          |
| Module / Domain                      | Vendors                                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

PB-P1-024 cierra creación (US-040) + edición/eliminación (US-041). US-041 reusa íntegramente el módulo `modules/vendors` entregado por US-040 (repository, guards, schema, DTOs) y extiende con dos use cases write: `UpdateVendorProfileUseCase` y `SoftDeleteVendorProfileUseCase`. Execution order 43.

---

## 3. Executive Technical Summary

US-041 extiende el controller de US-040 con dos handlers:
* `PATCH /api/v1/vendors/me`: actualiza campos permitidos; detecta automáticamente "campos mayores" (`business_name`, `location_id`) y transiciona `status: approved → pending` cuando aplica (D2). Toda la operación vive en `prisma.$transaction` (update perfil + update status + insert AdminAction).
* `DELETE /api/v1/vendors/me`: soft delete (`deleted_at`, `deleted_by`).

Slug es inmutable (D5). Edits/DELETE bloqueados en `rejected` y `hidden` (D3). Body Zod `.strict()`. Logger estructurado con tres eventos: `vendor.profile.updated`, `vendor.profile.repending`, `vendor.profile.soft_deleted`. Sin migraciones nuevas si PB-P0-001 entregó `deleted_at`/`deleted_by` y `AdminAction` está disponible. Frontend extiende el componente del módulo vendors con `VendorProfileEditor` + `DeleteProfileDialog` modal accesible.

---

## 4. Scope Boundary

### In Scope
* `UpdateVendorProfileUseCase` (PATCH).
* `SoftDeleteVendorProfileUseCase` (DELETE).
* Detección de campos mayores y transición `approved → pending` con AdminAction.
* DTOs Zod estrictos para PATCH.
* Frontend editor + delete dialog.
* Logger estructurado.
* Tests.

### Out of Scope
* Reverso de soft delete (Future).
* Rotación de slug.
* Cambios de categorías (US-042).
* CRUD `VendorService` (US-043+).
* `POST /vendors/me/submit-approval` (queda como endpoint catalogado para futura US si se requiere).
* Notificación push/email al admin (US futura módulo Notifications).
* AI bio (US-023).

---

## 5. Architecture Alignment

Reuso íntegro del stack de US-040 (Node.js + Express + Prisma + TypeScript; Next.js + RHF + Zod + next-intl). Hexagonal: `AdminActionWritePort` se define en `modules/vendors` con adapter en `modules/admin` (o equivalente módulo Admin futuro). Si el módulo Admin no entrega el port aún, US-041 implementa un adapter mínimo directo a `prisma.adminAction.create` con TODO documentado para refactor cuando exista módulo Admin formal.

---

## 6. Functional Interpretation

| AC | Technical | Layer |
|---|---|---|
| AC-01 menor | UseCase verifica si body tiene campos mayores; no transiciona | BE |
| AC-02 mayor desde approved | Detecta major fields; `prisma.$transaction` con update + status + AdminAction | BE, DB |
| AC-03 desde pending | UseCase aplica cambios sin transición | BE |
| AC-04 bloqueo rejected/hidden | Verificación de status pre-update; 409 tipado | BE |
| AC-05 DELETE | `softDelete` use case con verificación de status | BE |
| AC-06 slug inmutable | Zod `.strict()` rechaza `slug` en body | BE |
| AC-07 Zod estricto | DTOs `.strict()` rechazan todos los campos no permitidos | BE |
| AC-08 P95 | PERF-01 | QA |
| AC-09 A11Y | Modal `role="dialog"`, focus trap, ESC | FE |
| AC-10 i18n | next-intl en 4 locales | FE |

---

## 7. Backend Technical Design

### Use Cases

**`UpdateVendorProfileUseCase`**:
1. Recibe `{ currentUser, body }`.
2. `profile = repository.findActiveByVendorUserId(currentUser.id)`. Si null → 404.
3. Verifica `status ∉ {rejected, hidden}` → 409 según estado.
4. Validación Zod `.strict()`.
5. Si `body.location_id` presente, verifica activa.
6. Detecta `majorFieldsInBody = ['business_name', 'location_id'].some(k => k in body)`.
7. `prisma.$transaction`:
   - Update `vendor_profile` con campos del body.
   - Si `majorFieldsInBody && profile.status === 'approved'`:
     - Update `status = 'pending'`.
     - Insert `AdminAction(action='vendor_pending_after_major_edit', target_type='VendorProfile', target_id=profile.id, actor_id=currentUser.id)`.
     - `repending = true`.
   - Else: `repending = false`.
8. Emite log `vendor.profile.updated` (siempre) + `vendor.profile.repending` (si aplica).
9. Retorna `{ profile, repending }`.

**`SoftDeleteVendorProfileUseCase`**:
1. `profile = repository.findActiveByVendorUserId(currentUser.id)`. Si null → 404 `PROFILE_NOT_FOUND`.
2. Si `profile.deleted_at IS NOT NULL` → 409 `PROFILE_DELETED`.
3. Si `profile.status === 'hidden'` → 409 `PROFILE_HIDDEN`.
4. Update `deleted_at = NOW()`, `deleted_by = currentUser.id`.
5. Emite log `vendor.profile.soft_deleted`.
6. Retorna 204.

### DTOs

```ts
export const updateVendorProfileBody = z.object({
  business_name: z.string().min(2).max(150).optional(),
  bio: z.string().min(50).max(1000).optional(),
  location_id: z.string().uuid().optional(),
  languages_supported: z.array(z.enum(LANGUAGE_CODES)).min(1).optional(),
}).strict().refine(
  obj => Object.keys(obj).length > 0,
  { message: 'no fields to update' }
);
```

### Repository

Reuso de `VendorProfileRepository` de US-040 + nuevos métodos:
* `findActiveByVendorUserId({ vendorUserId, tx })`: solo perfiles con `deleted_at IS NULL`.
* `update({ id, partial, tx })`.
* `softDelete({ id, deletedBy, tx })`.

### Controller / Routes

* Reuso del `VendorProfileController` de US-040.
* Nuevos handlers: `update(req, res)` y `softDelete(req, res)`.
* Mismo middleware chain.

### AdminAction Port

```ts
export interface AdminActionWritePort {
  create(input: { action: string; targetType: string; targetId: string; actorId: string; tx: PrismaTx }): Promise<void>;
}
```

Adapter en `modules/vendors/adapters/admin-action-write.adapter.ts` (directo a Prisma como fallback hasta que exista módulo Admin formal).

### Observability

* `vendor.profile.updated` con `vendorProfileId`, `vendor_user_id`, `fields_updated[]`, `repending`, `correlationId`.
* `vendor.profile.repending` con `vendorProfileId`, `previous_status`, `correlationId`.
* `vendor.profile.soft_deleted` con `vendorProfileId`, `deleted_by`, `correlationId`.

---

## 8. Frontend Technical Design

### Components
* `VendorProfileEditor` (form).
* `DeleteProfileDialog` (modal con confirmación).
* Banner condicional "Tu perfil pasó a revisión" cuando response `repending=true`.

### State
RHF + Zod espejo. Tracking de `isDirtyMajor = ['business_name','location_id'].some(k => formState.dirtyFields[k])` para mostrar warning previo a submit cuando `status='approved'`.

### A11Y
`role="dialog"`, focus trap, ESC, contraste AA.

### i18n
Claves `vendor.profile.edit.*` en 4 locales.

---

## 9. API Contract

| Method | Endpoint | Auth | Request | Response | Errors |
|---|---|---|---|---|---|
| PATCH | `/api/v1/vendors/me` | Sí (vendor) | Body Zod opt-fields | `200 { profile, repending }` | 400/401/403/404/409 |
| DELETE | `/api/v1/vendors/me` | Sí (vendor) | sin body | `204` | 401/403/404/409 |

---

## 10. Database
Reuso del schema de US-040. Sin migraciones si `deleted_at`/`deleted_by` ya existen (verificación en DB-001 de US-040 cubre).

---

## 11. AI / PromptOps
N/A.

---

## 12. Security & Authorization
Reuso íntegro de US-040 (`VendorRoleGuard` + exclusion guards + ownership por sesión).

---

## 13. Testing Strategy

### Unit Tests
* DTOs Zod rechazan campos no permitidos.
* Detección de `majorFieldsInBody`.
* UseCase branches (approved→pending, pending sin transición, rejected→409, hidden→409).
* Refine `.refine` (body vacío).

### Integration Tests
* TS-01..06 + NT-01..10 de la US.

### Authorization Tests
AUTH-TS-01..05.

### Performance
PERF-01.

### A11Y
A11Y-01..02.

### Contract
CONTRACT-01.

---

## 14. Observability
3 eventos de log (definidos en §7).

---

## 15. Seed / Demo
Reuso del seed de US-040 con perfiles en estados mixtos.

---

## 16. Documentation Alignment Required

| Documento | Conflicto | Acción | Bloquea |
|---|---|---|---|
| `docs/16 §M07` | PATCH/DELETE shape y nuevos codes. | Actualizar. | No |
| `docs/4 §BR-VENDOR-003` | Transición auto desde approved. | Nota D2. | No |
| `docs/4 §BR-VENDOR-002` | Slug inmutable. | Nota D5. | No |
| `docs/10` | `NFR-PERF-API-001`. | Housekeeping. | No |

---

## 17. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Detección de mayores incorrecta. | Tests exhaustivos UT en isolation del helper. |
| Race condition entre PATCH y aprobación admin paralela. | `SELECT FOR UPDATE` sobre `vendor_profile` durante la transacción. |
| `AdminAction` no existe en schema. | Adapter port-based; si falta, abrir migración menor o stub. |

---

## 18. Implementation Guidance

### Archivos

**Backend**:
* `src/modules/vendors/dto/update-vendor-profile.body.ts`
* `src/modules/vendors/use-cases/update-vendor-profile.use-case.ts`
* `src/modules/vendors/use-cases/soft-delete-vendor-profile.use-case.ts`
* `src/modules/vendors/ports/admin-action-write.port.ts`
* `src/modules/vendors/adapters/admin-action-write.adapter.ts`
* `src/modules/vendors/controllers/vendor-profile.controller.ts` (extender)
* `src/modules/vendors/repositories/vendor-profile.repository.ts` (extender)
* `src/shared/logging/vendor-events.ts` (extender)

**Frontend**:
* `app/[locale]/vendor/profile/edit/page.tsx`
* `components/vendor/profile/VendorProfileEditor.tsx`
* `components/vendor/profile/DeleteProfileDialog.tsx`
* `lib/api/vendorsApi.ts` (extender con `update`, `softDelete`)
* `messages/{es-LATAM,es-ES,pt,en}.json` (extender)

### Decisiones que no deben reabrirse
D1 (campos mayores), D2 (trigger auto), D3 (hidden bloqueado), D4 (soft delete in scope), D5 (slug inmutable).

### Qué NO implementar
Reverso soft delete, rotación slug, categorías (US-042), servicios (US-043), notificación push.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 0 (reuso) |
| BE | 6 (DTO, port + adapter, repo ext., 2 use cases, controller ext., logger ext.) |
| FE | 4 (page, Editor, DeleteDialog, API client ext. + i18n) |
| SEED | 0 |
| QA | 6 (UT, IT, AUTH, PERF, A11Y, CONTRACT) |
| DOC | 3 |

**Total ~19 tareas.**

---

## 20. Readiness

`Ready for Task Breakdown`.

---

## 21. Final Recommendation

`Ready for Task Breakdown`. US-041 cierra PB-P1-024 reusando US-040 con dos use cases write y dos endpoints adicionales.
