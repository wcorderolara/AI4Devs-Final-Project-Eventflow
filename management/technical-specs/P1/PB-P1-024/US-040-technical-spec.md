# Technical Specification — US-040: Crear VendorProfile (status=pending)

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-040                                                                                                         |
| Source User Story                    | `management/user-stories/US-040-create-vendor-profile.md`                                                      |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-040-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-024                                                                                                      |
| Backlog Title                        | VendorProfile: crear y editar                                                                                  |
| Backlog Execution Order              | 42 (P0: 18 + P1: 24 items)                                                                                     |
| User Story Position in Backlog Item  | 1 de 2 (US-040 → US-041)                                                                                       |
| Related User Stories in Backlog Item | US-040 (crear), US-041 (editar + submit-approval)                                                              |
| Epic                                 | EPIC-VND-001 — Vendor Directory & Profile                                                                       |
| Backlog Item Dependencies            | PB-P1-002 (US-002 registro), PB-P0-001 (schema vendor_profile)                                                  |
| Feature                              | Creación de perfil de proveedor                                                                                 |
| Module / Domain                      | Vendors                                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

PB-P1-024 inicia el módulo Vendors entregando creación (US-040) y edición + submit-approval (US-041). US-040 establece schema, repositorio, validaciones Zod, slug helper, log estructurado y wizard frontend; US-041 reusará el módulo. Execution order 42, posterior al cierre Budget × Booking (PB-P1-023).

---

## 3. Executive Technical Summary

US-040 introduce el módulo `modules/vendors` con `CreateVendorProfileUseCase`, `VendorProfileRepository`, controller `POST /api/v1/vendors/me` (ya catalogado en `docs/16 §M07`), DTOs Zod estrictos espejo del backend en frontend, y un wizard `VendorProfileWizard` multi-step. La creación es transaccional: insert en `vendor_profile` + insert en `vendor_profile_categories` (M:N) dentro de `prisma.$transaction`. Slug se genera con helper `slugify` + sufijo numérico (D5) verificando uniqueness con `SELECT FOR UPDATE` sobre rango. El handler verifica idempotency simple (`UNIQUE vendor_user_id` lanza 409 `PROFILE_EXISTS`). Reuso de policies/guards del patrón EventFlow: `VendorRoleGuard` + `adminExclusionGuard` + `organizerExclusionGuard` (heredados o nuevos por simetría con guards similares). Logger `vendor.profile.created` (D3) emite la información para el admin queue (US-016 futura). Sin migraciones si PB-P0-001 entregó schema completo; si falta `slug UNIQUE` o `category_change_count`, migración menor.

---

## 4. Scope Boundary

### In Scope
* `modules/vendors` con use case, repository, controller, DTOs.
* Slug generation helper con desambiguación (D5).
* Validaciones Zod estrictas (`.strict()`).
* Frontend `VendorProfileWizard` multi-step + i18n + A11Y.
* Logger `vendor.profile.created`.
* Tests unit/integration/E2E/perf/a11y/contract.
* Documentación.

### Out of Scope
* `PATCH /vendors/me` (US-041).
* `POST /vendors/me/submit-approval` (US-041).
* Aprobación admin (US futura módulo Admin).
* `Notification` entity (US futura Notifications).
* AI bio (US-023).
* Soft delete del perfil (Future).
* Slug rename (Future).
* Directorio público (US futura).

### Explicit Non-Goals
* No introducir endpoints adicionales.
* No autosave del wizard.
* No reusar usuarios existentes con perfil previo (UNIQUE vendor_user_id).

---

## 5. Architecture Alignment

### Backend
Node.js + Express + TypeScript + Prisma + PostgreSQL. Clean/Hexagonal. Reuso de patrones de US-035/036/037/039 (DTO Zod, repository, use case, controller, port hexagonal cuando aplica).

### Frontend
Next.js + RHF + Zod (espejo) + Tailwind + next-intl. Sin TanStack mutations complejas (form submit + redirect).

### Database
Reuso de `vendor_profile`, `vendor_profile_categories`, `service_categories`, `locations` (todos de PB-P0-001). Migración menor si falta `slug UNIQUE` o `category_change_count`.

### API
Endpoint catalogado `POST /api/v1/vendors/me`.

### AI / PromptOps
N/A.

### Security
HTTP-only cookies; `VendorRoleGuard`; ownership por sesión.

### Testing
Vitest + Supertest + Playwright + jest-axe + contract.

---

## 6. Functional Interpretation

| AC | Technical | Layer |
|---|---|---|
| AC-01 | Use case + Zod + repo create + slug helper + log | BE |
| AC-02 | Frontend lee `GET /vendors/me` (existente) y renderiza banner | FE |
| AC-03 | Helper slugify + loop de desambiguación con UNIQUE constraint | BE |
| AC-04 | Response shape vía DTO Zod | BE/API |
| AC-05 | Wizard accesible (labels, aria-*, foco) | FE |
| AC-06 | next-intl con 4 locales | FE |
| AC-07 | PERF-01 | QA |

---

## 7. Backend Technical Design

### Modules
* `modules/vendors` (nuevo).

### Use Case
* `CreateVendorProfileUseCase`:
  1. Recibe `{ currentUser, body }`.
  2. Verifica `currentUser.role === 'vendor'` (heredado del guard).
  3. Validación Zod (`.strict()`).
  4. Verifica `location_id` existe y `is_active=true` (lookup port).
  5. Verifica cada `category_id` existe y `is_active=true`.
  6. Verifica `vendor_user_id` no tiene perfil (UNIQUE constraint).
  7. Genera slug.
  8. `prisma.$transaction`:
     - insert `vendor_profile` con `status='pending'`, `category_change_count=0`, slug.
     - insert M:N en `vendor_profile_categories`.
  9. Emite log `vendor.profile.created`.
  10. Retorna `VendorProfileDto`.

### Slug Helper
```ts
function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);
}

async function generateUniqueSlug(repo, base: string, tx): Promise<string> {
  const candidates = await repo.findSlugsStartingWith(base, tx);
  if (!candidates.includes(base)) return base;
  let i = 2;
  while (candidates.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
```

### DTOs
```ts
export const createVendorProfileBody = z.object({
  business_name: z.string().min(2).max(150),
  bio: z.string().min(50).max(1000),
  location_id: z.string().uuid(),
  languages_supported: z.array(z.enum(LANGUAGE_CODES)).min(1),
  categories: z.array(z.string().uuid()).min(1).max(3),
}).strict();
```

### Repository
* `findByVendorUserId({ vendorUserId, tx })`.
* `findSlugsStartingWith({ base, tx })`.
* `create({ ..., tx })` (incluyendo insert M:N).
* `findByIdWithCategories({ id, tx })` (para serializar response).

### Validation Rules
Implementadas en Zod + use case (lookup activos).

### Error Handling
* `400 INVALID_FIELD` (Zod `.strict()`).
* `400 INVALID_VALUE` (categoría/ciudad inactiva).
* `400 INVALID_PARAMS` (UUIDs).
* `401 UNAUTHORIZED`.
* `403 FORBIDDEN` (organizer/admin).
* `409 PROFILE_EXISTS` (UNIQUE vendor_user_id).
* `500 INTERNAL_ERROR`.

### Transactions
Sí — single `prisma.$transaction`.

### Observability
Log `vendor.profile.created` con campos canónicos.

---

## 8. Frontend Technical Design

### Routes
`/[locale]/vendor/profile/new` (wizard).

### Components
* `VendorProfileWizard` (orquestador multi-step).
* `BasicInfoStep` (business_name, bio).
* `LocationCategoriesStep` (Location + ServiceCategory cap 1-3).
* `LanguagesStep` (multi-select).
* `ReviewStep` (confirmación).

### State Management
RHF + Zod espejo del schema backend.

### API Client
`vendorsApi.create(body)`.

### A11Y
WCAG AA: labels, `aria-required`, `aria-live` para pasos, foco visible.

### i18n
4 locales: `es-LATAM`, `es-ES`, `pt`, `en`.

---

## 9. API Contract

| Method | Endpoint | Auth | Request | Response | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/vendors/me` | Sí (vendor) | Body Zod | `201 VendorProfileDto` | 400/401/403/409/500 |

---

## 10. Database

### Models
* `VendorProfile`: id, vendor_user_id (UNIQUE), business_name, bio, location_id (FK), languages_supported (string[]), slug (UNIQUE), status (enum), category_change_count (int default 0), deleted_at, timestamps.
* `vendor_profile_categories` (M:N): vendor_profile_id, service_category_id.

### Migration
Si PB-P0-001 no entregó `slug UNIQUE` o `category_change_count`, agregar migración menor (validar antes de implementar).

### Seed
`BR-SEED-002`: 10-20 vendors con status mixto.

---

## 11. AI / PromptOps

N/A.

---

## 12. Security & Authorization

* HTTP-only cookies.
* `VendorRoleGuard` + `adminExclusionGuard` + `organizerExclusionGuard`.
* Ownership por sesión (`vendor_user_id` derivado).
* Logging sin PII.

---

## 13. Testing Strategy

### Unit Tests
* `slugify` boundaries.
* `generateUniqueSlug` desambiguación.
* DTO Zod rechaza extras y campos faltantes.
* UseCase happy path + branches de error.

### Integration Tests
* POST happy path.
* Slug colisión.
* Vendor con perfil → 409.
* Categoría inactiva → 400.
* Languages vacíos → 400.
* Auth 401/403.

### Contract Test
Snapshot OpenAPI.

### A11Y
jest-axe sobre wizard.

### E2E
Onboarding completo: registro vendor → wizard → banner "En revisión".

### PERF
P95 < 1.5 s.

---

## 14. Observability

Log `vendor.profile.created` con: `vendorProfileId`, `vendor_user_id`, `business_name`, `slug`, `status`, `categories_count`, `location_id`, `languages_supported`, `correlationId`, `duration_ms`.

---

## 15. Seed / Demo

Verificar 10-20 vendors. Recomendado: ratio aprox 50/50 pending/approved para demoar admin queue.

---

## 16. Documentation Alignment Required

| Documento | Conflicto | Acción | Bloquea |
|---|---|---|---|
| `docs/16 §M07` | Body shape extendido. | Actualizar. | No |
| `docs/4 §BR-VENDOR-002` | Cap inicial 1-3. | Nota D2. | No |
| `docs/6 §VendorProfile` + PB-P0-001 | Verificar `slug UNIQUE` y `category_change_count`. | Verificar. | No |
| `docs/10` | `NFR-PERF-API-001`. | Housekeeping. | No |

---

## 17. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Slug helper genera colisión bajo concurrencia. | Insert falla. | UNIQUE constraint + retry con sufijo siguiente. |
| `category_change_count` no existe en schema. | Use case falla. | DOC-task verifica; migración menor si necesaria. |
| Wizard complejo en mobile. | UX confuso. | Tests E2E + responsive notes. |

---

## 18. Implementation Guidance

### Archivos clave

**Backend**:
* `src/modules/vendors/dto/create-vendor-profile.body.ts`
* `src/modules/vendors/dto/vendor-profile.dto.ts`
* `src/modules/vendors/repositories/vendor-profile.repository.ts`
* `src/modules/vendors/use-cases/create-vendor-profile.use-case.ts`
* `src/modules/vendors/controllers/vendor-profile.controller.ts`
* `src/modules/vendors/helpers/slugify.ts`
* `src/shared/logging/vendor-events.ts`

**Frontend**:
* `app/[locale]/vendor/profile/new/page.tsx`
* `components/vendor/profile/VendorProfileWizard.tsx`
* `components/vendor/profile/steps/BasicInfoStep.tsx`
* `components/vendor/profile/steps/LocationCategoriesStep.tsx`
* `components/vendor/profile/steps/LanguagesStep.tsx`
* `components/vendor/profile/steps/ReviewStep.tsx`
* `lib/api/vendorsApi.ts`
* `messages/{es-LATAM,es-ES,pt,en}.json`

### Decisiones que no deben reabrirse
D1: pending directo. D2: 1-3 categorías. D3: log estructurado MVP. D4: bio 50-1000. D5: slug auto.

### Qué NO implementar
* Hard delete del perfil.
* `submit-approval` (US-041).
* AI bio (US-023).
* Notification entity.

---

## 19. Task Generation Notes

| Grupo | Cantidad |
|---|---:|
| DB | 1 (verificación + posible migración menor) |
| BE | 6 (helper, DTOs, repo, use case, controller, logger) |
| API | 0 |
| SEC | 0 |
| OBS | 0 (BE-cubierto) |
| FE | 6 (wizard + 4 steps + API client + i18n) |
| SEED | 1 |
| QA | 7 (UT, IT, AUTH, PERF, A11Y, CONTRACT, E2E) |
| AI | 0 |
| OPS | 0 |
| DOC | 3 |

**Total ~24 tareas**.

---

## 20. Readiness

| Check | Status |
|---|---|
| User Story approved | Pass |
| Backlog mapping | Pass |
| Decisions reviewed | Pass |
| Scope clear | Pass |
| Architecture clear | Pass |
| API clear | Pass |
| DB clear | Pass |
| Security clear | Pass |
| Testing clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`. US-040 entrega el módulo vendors con scope mínimo: 1 endpoint, 1 use case, 1 wizard frontend, 1 helper de slug, 1 logger. Sin migraciones nuevas (con verificación previa). Cierra la base para US-041, US-042 y posterior aprobación admin.
