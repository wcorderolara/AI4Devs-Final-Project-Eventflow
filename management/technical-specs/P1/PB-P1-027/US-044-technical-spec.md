# Technical Specification — US-044: CRUD VendorService

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-044                                                                                                         |
| Source User Story                    | `management/user-stories/US-044-manage-vendor-services.md`                                                     |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-044-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-027                                                                                                      |
| Backlog Title                        | VendorService (paquetes)                                                                                       |
| Backlog Execution Order              | 46                                                                                                              |
| User Story Position in Backlog Item  | 1 de 1                                                                                                          |
| Related User Stories in Backlog Item | US-044                                                                                                         |
| Epic                                 | EPIC-VND-001                                                                                                   |
| Backlog Item Dependencies            | PB-P1-024 (US-040/041), PB-P0-001 (schema), PB-P0-003 (error envelope)                                          |
| Feature                              | CRUD `VendorService` con soft delete via `is_active`                                                            |
| Module / Domain                      | Vendors                                                                                                        |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-027` cubre el CRUD de `VendorService`. Single-story backlog (sólo US-044). Depende de PB-P1-024 (`VendorProfile`).

### Execution Order Rationale

Se ejecuta después de PB-P1-026 (US-043/US-048). Execution order 46.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-044     | CRUD VendorService.                            | 1               |

---

## 3. Executive Technical Summary

US-044 extiende `modules/vendors` con `VendorServiceController` y cuatro use cases (`Create`, `Update`, `Deactivate`, `List`). El controller expone `GET/POST/PATCH/DELETE /api/v1/vendors/me/services[/:id]`. Cada use case:

1. Valida el body con Zod (`.strict()` en POST/PATCH).
2. Resuelve `vendor_profile` por sesión + política por status (D1): `hidden` ⇒ `409 PROFILE_HIDDEN`; soft-deleted ⇒ `404`.
3. POST: valida cardinalidad (`< 50` activos, D5), longitudes (D6), currency (D4), categoría activa.
4. PATCH: valida cambios y, si reactiva, verifica tope.
5. DELETE: setea `is_active=false` (D2) con guard `WHERE is_active=true` (TOCTOU) — idempotente para `204` si ya inactivo.
6. GET: lista todos los servicios del vendor (`ORDER BY created_at DESC`).
7. Emite logs estructurados.
8. Sin migraciones; reuso de schema PB-P0-001.

---

## 4. Scope Boundary

### In Scope

- 4 use cases + controller + ruta.
- DTOs Zod (POST estricto, PATCH parcial).
- Repository extensions (5 métodos).
- Logger extension (3 eventos).
- Frontend: page + tabla + create dialog + deactivate dialog + i18n.
- Tests (UT, IT, AUTH, Contract, A11Y).
- Documentación.

### Out of Scope

- AI description (US-023).
- Reordenamiento, bulk operations, reactivación masiva.
- Hard delete.
- Visibilidad pública (US-045/US-047).
- CRUD de `ServiceCategory` (admin).

### Explicit Non-Goals

- No introducir migraciones nuevas.
- No exponer hard delete.

---

## 5. Architecture Alignment

### Backend Architecture

Reuso del stack: Node + Express + TypeScript + Prisma + PostgreSQL. Hexagonal: use cases en aplicación, repository por Prisma, port `ServiceCategoryReadPort` reusado de US-042.

### Frontend Architecture

Next.js + App Router. Server Component carga la lista; Client Components para `CreateServiceDialog` y `DeactivateServiceDialog`. RHF + Zod.

### Database Architecture

Reuso de `vendor_services`. Sin migraciones.

### API Architecture

REST JSON bajo `/api/v1`. 4 endpoints. Error envelope estándar.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

Ownership por sesión. `404 SERVICE_NOT_FOUND` uniforme para ajeno/inexistente. Política por status del perfil heredada de US-041/042/043/048.

### Testing Architecture

Vitest + Supertest + RTL + axe.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01a POST                 | `CreateVendorServiceUseCase` con validación completa + cardinalidad.                              | BE, DB            |
| AC-01b PATCH                | `UpdateVendorServiceUseCase` con verificación parcial + tope al reactivar.                        | BE                |
| AC-01c DELETE soft          | `DeactivateVendorServiceUseCase` con UPDATE guard TOCTOU.                                          | BE                |
| AC-01d GET                  | `ListVendorServicesUseCase` con orden y todos los estados.                                        | BE                |
| EC-01..EC-09                | Validaciones Zod + repository + use case branches.                                                 | BE                |
| AUTH-TS-01..08              | Guards + middleware + matriz × estado.                                                            | BE                |
| A11Y                       | Tabla semántica + modales accesibles.                                                              | FE                |
| i18n 4 locales              | `vendor.services.*`.                                                                              | FE                |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

`modules/vendors` (extensión).

### Use Cases / Application Services

**`CreateVendorServiceUseCase`**
1. Validate body.
2. Resolve `vendorProfile` + check status (D1).
3. `countActive = repository.countActiveByVendorProfileId(vp.id)`. Si `>= 50` ⇒ `409 SERVICE_LIMIT_REACHED`.
4. `category = serviceCategoryReadPort.findById(body.service_category_id)`. Si `null` o `!active` ⇒ `400 INVALID_CATEGORY`.
5. INSERT `vendor_services` con `is_active=true`, `ai_generated_description=false`.
6. Log `vendor.service.created`.
7. Return resource → `201`.

**`UpdateVendorServiceUseCase`**
1. Validate body.
2. Resolve `vendorProfile` + check status.
3. `service = repository.findOwnedById(id, vp.id)`. Si null ⇒ `404 SERVICE_NOT_FOUND`.
4. Si body cambia `service_category_id` ⇒ validar.
5. Si body incluye `is_active=true` Y `service.is_active=false`: recheck tope.
6. UPDATE campos provistos.
7. Log `vendor.service.updated`.
8. Return resource → `200`.

**`DeactivateVendorServiceUseCase`**
1. Resolve `vendorProfile` + check status.
2. `affected = repository.softDeleteByIdOwned(id, vp.id)`. WHERE `is_active=true` (TOCTOU) o idempotente: hacer UPDATE sin guard y retornar `204` para ambos casos (mantiene idempotencia D-EC-09).
3. Verificar que el servicio existe (`findAnyOwnedById`) antes; si no, `404`.
4. Log `vendor.service.deactivated` sólo si `affected=true` (transición).
5. Return → `204`.

**`ListVendorServicesUseCase`**
1. Resolve `vendorProfile` + check status.
2. `items = repository.findAllByVendorProfileId(vp.id, { order: 'createdAt desc' })`.
3. Return `{ items }` → `200`.

### Controllers / Routes

```ts
router.get('/vendors/me/services', vendorRoleGuard, ..., list);
router.post('/vendors/me/services', vendorRoleGuard, ..., create);
router.patch('/vendors/me/services/:id', vendorRoleGuard, ..., update);
router.delete('/vendors/me/services/:id', vendorRoleGuard, ..., deactivate);
```

### DTOs / Schemas

```ts
export const createVendorServiceBody = z.object({
  package_name: z.string().trim().min(2).max(150),
  description: z.string().min(10).max(2000),
  base_price: z.string().regex(/^\d+(\.\d{1,2})?$/), // numeric(14,2)
  currency_code: z.enum(CURRENCY_CODES),
  service_category_id: z.string().uuid(),
}).strict();

export const updateVendorServiceBody = z.object({
  package_name: z.string().trim().min(2).max(150).optional(),
  description: z.string().min(10).max(2000).optional(),
  base_price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency_code: z.enum(CURRENCY_CODES).optional(),
  service_category_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
}).strict().refine(o => Object.keys(o).length > 0);
```

### Repository / Persistence

```ts
class VendorServiceRepository {
  countActiveByVendorProfileId(vpId: string): Promise<number>
  findAllByVendorProfileId(vpId: string, opts): Promise<VendorService[]>
  findOwnedById(id: string, vpId: string): Promise<VendorService | null>  // any state
  findActiveOwnedById(id: string, vpId: string): Promise<VendorService | null>
  create(input): Promise<VendorService>
  update(id: string, vpId: string, patch): Promise<VendorService>
  softDeleteByIdOwned(id: string, vpId: string): Promise<{ affected: boolean }>
}
```

### Validation Rules

Ver §VR-01..VR-08 de la US.

### Error Handling

Códigos: `400 INVALID_PACKAGE_NAME`, `400 INVALID_PRICE`, `400 INVALID_CURRENCY`, `400 INVALID_CATEGORY`, `400 INVALID_DESCRIPTION`, `401`, `403`, `404 SERVICE_NOT_FOUND`, `404` (perfil), `409 PROFILE_HIDDEN`, `409 SERVICE_LIMIT_REACHED`.

### Transactions

No requeridas (single-row operations).

### Observability

- `vendor.service.created` (info).
- `vendor.service.updated` (info, con `fields_updated[]`).
- `vendor.service.deactivated` (info, sólo en transición real).

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/[locale]/vendor/services/page.tsx` (Server Component con prefetch).

### Components

- `VendorServiceTable` (tabla con inline edit o link a edit modal).
- `CreateServiceDialog` (modal con form).
- `DeactivateServiceDialog` (confirmación).
- Contador "N/50" accesible.

### Forms

RHF + Zod espejo.

### State Management

TanStack Query: query de lista + 3 mutations + invalidación.

### Data Fetching

`vendorsApi.services.list/create/update/deactivate`.

### Loading / Empty / Error / Success States

- Loading: skeleton.
- Empty: CTA + texto explicativo.
- Error: banner i18n por código.
- Success: toast + tabla actualizada.

### Accessibility

Tabla semántica, modales `role="dialog"` + focus trap + ESC.

### i18n

`vendor.services.*` en 4 locales.

---

## 9. API Contract Design

| Method | Endpoint                                              | Purpose                              | Auth Required | Request                                                                | Response                                          | Error Cases                                                                                                                                                                                            |
| ------ | ----------------------------------------------------- | ------------------------------------ | ------------- | ---------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/v1/vendors/me/services`                         | Listar servicios del vendor.         | Sí (vendor)   | -                                                                      | `200 { items: VendorService[] }`.                | `401`, `403`, `404` (perfil soft-deleted), `409 PROFILE_HIDDEN`.                                                                                                                                       |
| POST   | `/api/v1/vendors/me/services`                         | Crear servicio.                      | Sí (vendor)   | `{ package_name, description, base_price, currency_code, service_category_id }`. | `201 VendorService`.                              | `400 INVALID_PACKAGE_NAME/PRICE/CURRENCY/CATEGORY/DESCRIPTION`, `401`, `403`, `404`, `409 PROFILE_HIDDEN`, `409 SERVICE_LIMIT_REACHED`.                                                                |
| PATCH  | `/api/v1/vendors/me/services/:id`                     | Editar (incluye reactivar).          | Sí (vendor)   | Subset opcional de los campos + `is_active?`.                          | `200 VendorService`.                              | `400 *`, `401`, `403`, `404 SERVICE_NOT_FOUND` o `404` (perfil), `409 PROFILE_HIDDEN`, `409 SERVICE_LIMIT_REACHED` (al reactivar).                                                                    |
| DELETE | `/api/v1/vendors/me/services/:id`                     | Soft delete.                         | Sí (vendor)   | -                                                                      | `204 No Content`.                                  | `401`, `403`, `404 SERVICE_NOT_FOUND`, `404` (perfil), `409 PROFILE_HIDDEN`.                                                                                                                            |

---

## 10. Database / Prisma Design

### Models Impacted

`VendorService` (read/write), `VendorProfile` (read), `ServiceCategory` (read).

### Fields / Columns

Sin nuevos. Reuso de PB-P0-001.

### Relations

Reuso.

### Indexes

Reuso de `idx_vendor_services_vendor_profile_id`, `idx_vendor_services_active`, `idx_vendor_services_service_category_id`.

### Constraints

`base_price >= 0` (existente).

### Migrations Impact

Ninguna.

### Seed Impact

Reuso del seed de US-040. Opcional: añadir 1 vendor con 3 servicios (mezcla `is_active=true/false`) para demo.

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

`vendor_services.vendor_profile_id == vendor_profile.id`.

### Role Rules

Sólo `vendor`. Admin/Organizer rechazados.

### Negative Authorization Scenarios

Ver §SEC y AUTH-TS.

### Audit Requirements

Sin `AdminAction`. Logs estructurados.

### Sensitive Data Handling

N/A (precio es referencial).

---

## 13. Testing Strategy

### Unit Tests

- DTOs Zod (POST estricto, PATCH parcial).
- Branches de los 4 use cases.

### Integration Tests

- TS-01..TS-06 + NT-01..NT-09.
- Idempotencia del DELETE.
- Visibilidad pública (mock del query del directorio).

### API Tests

Supertest cubriendo todos los códigos.

### E2E Tests

Opcional Playwright.

### Security Tests

- Confirmar `404 SERVICE_NOT_FOUND` uniforme.

### Accessibility Tests

- Tabla semántica.
- Modal create + deactivate.
- Contador `aria-live`.

### AI Tests

No aplica.

### Seed / Demo Tests

Reuso.

### CI Checks

Lint + Vitest + Supertest.

---

## 14. Observability & Audit

### Logs

- `vendor.service.created` (info).
- `vendor.service.updated` (info, `fields_updated[]`).
- `vendor.service.deactivated` (info, sólo en transición real).

### Correlation ID

Heredado.

### AdminAction

No requerido.

---

## 15. Seed / Demo Data Impact

Reuso del seed de US-040. Opcional añadir vendor demo con 3 servicios mixtos.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar 4 endpoints.                                          | Documentar tras D1–D6.                         | Actualizar `docs/16`.                                       | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Race entre count y create (51º simultáneo).                      | Tope rebasado.        | `SELECT FOR UPDATE` o reintento con verificación post.  |
| PATCH reactiva con tope rebasado.                                | Inconsistencia.       | Recheck `countActive` antes de update si body include `is_active=true`. |
| Categoría desactivada entre validación y commit.                 | FK fallida.            | RESTRICT en FK + verificación previa.                   |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/vendors/dto/create-vendor-service.body.ts`
- `src/modules/vendors/dto/update-vendor-service.body.ts`
- `src/modules/vendors/use-cases/create-vendor-service.use-case.ts`
- `src/modules/vendors/use-cases/update-vendor-service.use-case.ts`
- `src/modules/vendors/use-cases/deactivate-vendor-service.use-case.ts`
- `src/modules/vendors/use-cases/list-vendor-services.use-case.ts`
- `src/modules/vendors/repositories/vendor-service.repository.ts`
- `src/modules/vendors/controllers/vendor-service.controller.ts`
- `src/modules/vendors/routes/vendor-service.routes.ts`
- `src/shared/logging/vendor-events.ts` (extender)

**Frontend**:
- `app/[locale]/vendor/services/page.tsx`
- `components/vendor/services/VendorServiceTable.tsx`
- `components/vendor/services/CreateServiceDialog.tsx`
- `components/vendor/services/DeactivateServiceDialog.tsx`
- `lib/api/vendorsApi.ts` (añadir namespace `services`)
- `messages/{es-LATAM,es-ES,pt,en}.json`

### Orden sugerido

1. DTOs Zod + UT.
2. Repository extensions + UT.
3. 4 use cases + UT por branch.
4. Controller + 4 rutas.
5. Logger extension.
6. `vendorsApi.services.*` + MSW.
7. Page + tabla + dialogs + i18n.
8. Tests integración + auth + a11y.
9. Documentación.

### Decisiones que no deben reabrirse

D1 (política por status), D2 (soft delete via `is_active`), D3 (GET sin paginación), D4 (currency enum), D5 (tope 50), D6 (longitudes).

### Qué no implementar

- AI description.
- Hard delete.
- Reordenamiento / bulk.
- CRUD de categorías.
- Visibilidad pública (otra US).

### Assumptions to preserve

- Schema entregado por PB-P0-001.
- Reuso de `ServiceCategoryReadPort` de US-042.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 (verificación) |
| BE    | 8 (2 DTOs, repository, 4 use cases, controller, logger) |
| FE    | 4 (page + tabla, create dialog, deactivate dialog + vendorsApi, i18n) |
| QA    | 5 (UT, IT, AUTH, Contract, A11Y) |
| DOC   | 1 (docs/16 §M07) |

**Total estimado ~19 tareas.**

### Required QA tasks

- UT + IT + AUTH + Contract + A11Y.

### Required security tasks

- AUTH matrix con `404 SERVICE_NOT_FOUND` uniforme.

### Required seed/demo tasks

- No bloqueante (reuso US-040).

### Required documentation tasks

- `docs/16 §M07`.

### Dependencies between tasks

- DB → BE → FE → QA.
- DOC en paralelo a FE/QA.

### Backlog consolidated `tasks.md`

Single-story backlog. `US-044-development-tasks.md` cubre todo el backlog item.

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

US-044 cierra `PB-P1-027` con 4 use cases reusando schema y guards. Sin migraciones. Política `404 SERVICE_NOT_FOUND` uniforme. 1 acción documental no bloqueante.
