# Technical Specification — US-042: Cambiar categorías del vendor con tope acumulado (5)

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-042                                                                                                         |
| Source User Story                    | `management/user-stories/US-042-change-vendor-categories.md`                                                   |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-042-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-025                                                                                                      |
| Backlog Title                        | Categorías del vendor con tope acumulado (5)                                                                   |
| Backlog Execution Order              | 44 (P0: 18 + P1 hasta `PB-P1-025`)                                                                              |
| User Story Position in Backlog Item  | 1 de 1 (PB-P1-025 → US-042)                                                                                    |
| Related User Stories in Backlog Item | US-042                                                                                                         |
| Epic                                 | EPIC-VND-001                                                                                                   |
| Backlog Item Dependencies            | PB-P1-024 (US-040 schema + repo + guards; US-041 `AdminActionWritePort` + adapter + banner `RependingNotice`)  |
| Feature                              | Cambio de categorías con tope y revisión admin                                                                  |
| Module / Domain                      | Vendors                                                                                                        |
| User Story Status                    | Approved with Minor Notes                                                                                      |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-26                                                                                                     |
| Last Updated                         | 2026-06-26                                                                                                     |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-025` — *Categorías del vendor con tope acumulado (5)*. Cierra la regla #3 de Decisión PO 8.1: cada cambio de categorías incrementa `category_change_count` (tope acumulado 5) y dispara revisión admin. Depende de `PB-P1-024` (US-040 + US-041).

### Execution Order Rationale

US-042 se ejecuta justo después de cerrar PB-P1-024 (US-040 + US-041) porque reusa:
- El módulo `modules/vendors`, el repository, los guards (`VendorRoleGuard` + exclusion guards) y el slug schema entregados por US-040.
- El `AdminActionWritePort` + adapter introducidos en US-041.
- El banner UI `RependingNotice` (D3 US-041) reutilizado para `repending=true`.

Execution order 44, posición 1 de 1 en PB-P1-025.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                  | Suggested Order |
| ---------- | -------------------------------------------------------------------- | --------------- |
| US-042     | Endpoint dedicado de cambio de categorías con contador + revisión.   | 1               |

---

## 3. Executive Technical Summary

US-042 agrega al módulo `modules/vendors` un caso de uso write y un endpoint dedicado:

- `POST /api/v1/vendors/me/categories` invoca `ChangeVendorCategoriesUseCase`.
- El use case normaliza el payload a `Set<service_category_id>` (D5), valida cardinalidad `1..5` y existencia/`active=true` en el catálogo (D6), verifica el estado del perfil (D4: bloquea `hidden` con `409 PROFILE_HIDDEN` y soft-deleted con `404`), valida el contador (`category_change_count < 5`, si no `409 CATEGORY_CHANGE_LIMIT` — D1) y compara con el set persistido.
- Si los conjuntos son iguales → respuesta `200 noop=true` sin side-effects (D5).
- Si difieren → ejecuta una `prisma.$transaction`:
  1. `DELETE FROM vendor_profile_categories WHERE vendor_profile_id = ...` para las categorías removidas y `INSERT` para las nuevas (diff).
  2. `UPDATE vendor_profiles SET category_change_count += 1, last_category_change_at = NOW(), requires_admin_review = true` (D2).
  3. Si `status='approved'` o `status='rejected'`, `UPDATE status='pending'` (D3).
  4. Insert `AdminAction(action='vendor_category_change', target_type='VendorProfile', target_id=profile.id, actor_id=currentUser.id)` mediante el `AdminActionWritePort` heredado de US-041.
- Emite log `vendor.category.changed` con `correlation_id` y `before`/`after` del set.
- Reusa el banner `RependingNotice` del frontend de US-041 cuando `repending=true`.

Sin migraciones nuevas: PB-P0-001 ya entregó `category_change_count`, `last_category_change_at`, `requires_admin_review` (`docs/18 §15.1`).

---

## 4. Scope Boundary

### In Scope

- `ChangeVendorCategoriesUseCase` (write, transaccional).
- DTO Zod estricto del body.
- Controller handler `changeCategories(req, res)` extendiendo `VendorProfileController`.
- Repository extension: `findActiveWithCategoriesByVendorUserId` y `replaceCategoriesAndAdvanceCounter` (transaccional).
- Reuso del `AdminActionWritePort` + adapter de US-041 con nueva action `vendor_category_change`.
- Frontend page editor de categorías + componente `CategoryChangeForm` + banner `RependingNotice` (reusado).
- Logger estructurado (`vendor.category.changed`).
- Tests (unit, integration, auth, contract, a11y).

### Out of Scope

- Reverso/UNDO de cambios (Future).
- Rotación admin del contador `category_change_count` (Future / panel admin).
- Auto-aprobación tras el cambio (siempre requiere revisión admin).
- Subcategorías ilimitadas.
- `PATCH /vendors/me` de US-041 (las categorías no se editan por ese endpoint).
- Notificación push/email al admin (US futura módulo Notifications).
- Búsqueda de directorio (PB-P1-028).

### Explicit Non-Goals

- No introducir nuevas tablas.
- No agregar nuevas migraciones (schema ya entregado por PB-P0-001).
- No modificar el contrato de `PATCH /vendors/me` ni de `DELETE /vendors/me` (US-041).

---

## 5. Architecture Alignment

### Backend Architecture

Reuso íntegro del stack: Node.js + Express + TypeScript + Prisma + PostgreSQL, Hexagonal. Controller delgado, use case en `modules/vendors/use-cases/`, repository por Prisma, port `AdminActionWritePort` ya existente (US-041) con adapter compartido. Zod `.strict()` en el body.

### Frontend Architecture

Next.js + App Router + TypeScript. Server Component para el `page.tsx`, Client Component para `CategoryChangeForm` (RHF + Zod + TanStack Query mutation). next-intl en 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`). MSW handlers para testing.

### Database Architecture

Reuso de `vendor_profiles` (`category_change_count`, `last_category_change_at`, `requires_admin_review`, `status`, `deleted_at`) y `vendor_profile_categories` (M:N). Sin migraciones nuevas. CHECK `category_change_count <= 5` ya entregado por PB-P0-001.

### API Architecture

REST JSON bajo `/api/v1`. Un único endpoint nuevo: `POST /api/v1/vendors/me/categories`. Error envelope estándar (`{ error: { code, message_key, details? } }`) heredado de PB-P0-003.

### AI / PromptOps Architecture

No aplica — esta historia no invoca IA.

### Security Architecture

HTTP-only cookies; backend como source of truth. Ownership por sesión (`currentUser.id == vendor_user_id`). Reuso de `VendorRoleGuard` + exclusion guards (`adminExclusionGuard`, `organizerExclusionGuard`). Bloqueo en `hidden`/soft-deleted (D4). `AdminAction` requerida en cada cambio aplicado.

### Testing Architecture

Vitest (unit), Supertest (API/integration), MSW + Playwright (E2E/A11Y) opcional, security negative tests obligatorios.

---

## 6. Functional Interpretation

| Acceptance Criterion                          | Technical Interpretation                                                                                                                                                                                                  | Impacted Layer(s) |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 cambio válido desde `approved`           | UseCase ejecuta diff + `prisma.$transaction` (delete/insert categorías + update contador + flag + status `approved→pending` + AdminAction). Response `{ repending: true, status: 'pending' }`.                              | BE, DB            |
| AC-02 límite alcanzado                         | UseCase verifica `category_change_count >= 5` ANTES de aplicar diff y antes de transición; lanza `409 CATEGORY_CHANGE_LIMIT`.                                                                                              | BE                |
| AC-03 cambio desde `pending` sin transición    | UseCase no transiciona status; aplica diff + contador + flag + AdminAction.                                                                                                                                                | BE                |
| AC-04 cambio desde `rejected`                  | UseCase aplica diff + contador + flag + transición `rejected→pending` + AdminAction. Response `repending=true`.                                                                                                            | BE                |
| EC-01 noop por mismo set                       | Comparación de `Set<service_category_id>`; si igual ⇒ `200 noop=true`, sin transacción ni side-effects.                                                                                                                    | BE                |
| EC-02 bloqueo en `hidden`                      | UseCase verifica `status='hidden'` antes de procesar; lanza `409 PROFILE_HIDDEN`.                                                                                                                                          | BE                |
| EC-03 soft-deleted                              | UseCase verifica `deleted_at IS NOT NULL`; lanza `404`.                                                                                                                                                                    | BE                |
| EC-04 cardinalidad inválida                    | Zod `.refine` (`1..5`) + lanza `400 INVALID_CATEGORIES`.                                                                                                                                                                    | BE                |
| EC-05 categoría inexistente o inactiva         | Repository verifica `service_categories.active=true` y existencia; lanza `400 INVALID_CATEGORY` con `details.unknown_or_inactive[]`.                                                                                       | BE                |
| AUTH-TS-01..05                                  | Reuso de guards + middleware sesión. Test plan replica matriz `pending/approved/rejected/hidden/deleted` × auth.                                                                                                            | BE, QA            |
| A11Y contador + CTA deshabilitado              | `aria-live="polite"` en contador; CTA con `aria-describedby` cuando `category_change_count=5`.                                                                                                                              | FE                |
| i18n 4 locales                                  | Claves `vendor.categories.change.*` en `messages/{es-LATAM,es-ES,pt,en}.json`.                                                                                                                                              | FE                |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

`modules/vendors` (extensión).

### Use Cases / Application Services

**`ChangeVendorCategoriesUseCase`**

1. Recibe `{ currentUser, body }`.
2. Valida body con `changeVendorCategoriesBody` (Zod `.strict()` + `.refine` cardinalidad).
3. `profile = repository.findActiveWithCategoriesByVendorUserId(currentUser.id)`.
4. Si `profile == null` o `profile.deletedAt != null` → `404`.
5. Si `profile.status == 'hidden'` → `409 PROFILE_HIDDEN`.
6. `desiredSet = new Set(body.service_category_ids)`.
7. `currentSet = new Set(profile.categories.map(c => c.serviceCategoryId))`.
8. Si `setEquals(desiredSet, currentSet)` → retorna `{ noop: true, profile }` (200).
9. Si `profile.categoryChangeCount >= 5` → `409 CATEGORY_CHANGE_LIMIT`.
10. Verifica catálogo: `categories = await serviceCategoryRepo.findByIds([...desiredSet])`. Si `categories.length !== desiredSet.size` o alguna `active === false` → `400 INVALID_CATEGORY` con `details.unknown_or_inactive`.
11. `prisma.$transaction(async tx => { ... })`:
    - `repository.replaceCategoriesAndAdvanceCounter({ vendorProfileId: profile.id, desiredSet, tx })`:
      - DELETE faltantes; INSERT añadidas.
      - UPDATE `category_change_count = category_change_count + 1`, `last_category_change_at = NOW()`, `requires_admin_review = true`.
    - Si `profile.status` ∈ `{'approved','rejected'}`:
      - UPDATE `status = 'pending'`.
      - `repending = true`.
    - Else (`status === 'pending'`):
      - `repending = false`.
    - `adminActionWritePort.create({ action: 'vendor_category_change', targetType: 'VendorProfile', targetId: profile.id, actorId: currentUser.id, tx })`.
12. Emite log `vendor.category.changed` con `vendor_profile_id`, `vendor_user_id`, `before: [...currentSet]`, `after: [...desiredSet]`, `category_change_count_after`, `repending`, `correlation_id`.
13. Retorna `{ profile: updated, repending, categoryChangeCount, requiresAdminReview: true, noop: false, status }`.

### Controllers / Routes

Extender `VendorProfileController` (de US-040/US-041):

```ts
async changeCategories(req: AuthedRequest, res: Response) {
  const result = await this.changeVendorCategoriesUseCase.execute({
    currentUser: req.user,
    body: req.body,
  });
  return res.status(200).json(result);
}
```

Ruta: `router.post('/vendors/me/categories', vendorRoleGuard, adminExclusionGuard, organizerExclusionGuard, asyncHandler(controller.changeCategories.bind(controller)))`.

### DTOs / Schemas

```ts
export const SERVICE_CATEGORY_ID_REGEX = /^[0-9a-f-]{36}$/i;

export const changeVendorCategoriesBody = z.object({
  service_category_ids: z
    .array(z.string().uuid())
    .min(1)
    .max(5),
}).strict().refine(
  obj => new Set(obj.service_category_ids).size >= 1,
  { message: 'INVALID_CATEGORIES' }
);
```

### Repository / Persistence

Extensiones a `VendorProfileRepository`:

```ts
findActiveWithCategoriesByVendorUserId(vendorUserId: string): Promise<VendorProfileWithCategories | null>

replaceCategoriesAndAdvanceCounter(args: {
  vendorProfileId: string;
  desiredSet: Set<string>;
  tx: PrismaTx;
}): Promise<VendorProfile>

updateStatusToPending(args: { vendorProfileId: string; tx: PrismaTx }): Promise<void>
```

Nuevo repository (o port) ligero: `ServiceCategoryRepository.findByIds(ids: string[]): Promise<ServiceCategory[]>` (puede ser consumido directamente desde el use case si ya existe en `modules/service-categories` o en `modules/vendors` como adapter de catálogo).

### Validation Rules

| ID    | Regla                                                       | Comportamiento                                       |
| ----- | ----------------------------------------------------------- | ---------------------------------------------------- |
| VR-01 | `1 ≤ size(set) ≤ 5`                                          | Zod + `400 INVALID_CATEGORIES`                       |
| VR-02 | `category_change_count < 5`                                  | UseCase + `409 CATEGORY_CHANGE_LIMIT`                |
| VR-03 | `status != 'hidden'`                                          | UseCase + `409 PROFILE_HIDDEN`                       |
| VR-04 | `deleted_at IS NULL`                                          | UseCase + `404`                                       |
| VR-05 | Cada `service_category_id` existe y `active=true`             | UseCase + `400 INVALID_CATEGORY`                     |

### Error Handling

Reusar error envelope de PB-P0-003:

```ts
{ error: { code: 'CATEGORY_CHANGE_LIMIT', message_key: 'vendor.category.limit_reached' } }
```

Códigos: `400 INVALID_CATEGORIES`, `400 INVALID_CATEGORY`, `401`, `403`, `404`, `409 CATEGORY_CHANGE_LIMIT`, `409 PROFILE_HIDDEN`.

### Transactions

Una sola `prisma.$transaction` envuelve diff + update contador/flag + transición de status + insert `AdminAction`. La verificación de catálogo y de estado del perfil ocurre antes de abrir la transacción para evitar locks innecesarios. Se recomienda `SELECT FOR UPDATE` sobre `vendor_profiles.id` dentro de la transacción para evitar race con `PATCH /vendors/me` o `DELETE /vendors/me` paralelos (US-041).

### Observability

- Log `vendor.category.changed` (info) con `vendor_profile_id`, `vendor_user_id`, `before`, `after`, `category_change_count_after`, `repending`, `correlation_id`.
- Log `vendor.category.noop` (debug) cuando se retorna `noop=true`.
- Log `vendor.category.limit_reached` (warn) cuando `409 CATEGORY_CHANGE_LIMIT`.

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/[locale]/vendor/profile/edit/categories/page.tsx` (Server Component que carga el perfil via TanStack Query hydration).

### Components

- `components/vendor/profile/CategoryChangeForm.tsx` (Client Component): multi-select de categorías, contador "Cupo restante: N/5" con `aria-live="polite"`, CTA "Solicitar cambio" (deshabilitado cuando `category_change_count=5` con `aria-describedby`).
- Reuso de `RependingNotice` de US-041 cuando response `repending=true`.

### Forms

RHF + Zod (espejo del backend: `array<uuid>` `1..5`). Comparación cliente para detectar `noop` opcional (no obligatorio: el backend siempre es source of truth).

### State Management

TanStack Query mutation `useChangeVendorCategories` + invalidación de la query `vendor.me`. Optimistic update opcional sólo del contador, descartar en error.

### Data Fetching

`vendorsApi.changeCategories({ service_category_ids })` añadido en `lib/api/vendorsApi.ts` (extensión del cliente de US-040/US-041). MSW handler para tests.

### Loading / Empty / Error / Success States

- Loading: spinner en CTA + disable.
- Empty: N/A (siempre hay set actual ≥1).
- Error: banner accesible con código + mensaje i18n (`CATEGORY_CHANGE_LIMIT`, `PROFILE_HIDDEN`, `INVALID_CATEGORIES`, `INVALID_CATEGORY`).
- Success: toast i18n; si `repending=true`, mostrar `RependingNotice`.

### Accessibility

Contador con `aria-live="polite"`. CTA con `aria-describedby` que apunta a mensaje "Has alcanzado el límite de 5 cambios" cuando aplica. Modal de confirmación previo a submit cuando hay diff y `status='approved'` (warning de re-pending).

### i18n

Claves `vendor.categories.change.*` en `messages/{es-LATAM,es-ES,pt,en}.json` (4 locales).

---

## 9. API Contract Design

| Method | Endpoint                          | Purpose                              | Auth Required | Request                                                          | Response                                                                                                                          | Error Cases                                                                                                                                       |
| ------ | --------------------------------- | ------------------------------------ | ------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/vendors/me/categories`   | Cambiar el set de categorías del vendor. | Sí (vendor)   | `{ "service_category_ids": ["<uuid>", ...] }` con `1..5` distintos. | `200 OK` con `{ category_change_count, requires_admin_review, repending, noop, status }`. Si `noop=true`, contador y flag sin cambios. | `400 INVALID_CATEGORIES`, `400 INVALID_CATEGORY` (con `details.unknown_or_inactive`), `401`, `403`, `404` (perfil ausente o soft-deleted), `409 CATEGORY_CHANGE_LIMIT`, `409 PROFILE_HIDDEN`. |

---

## 10. Database / Prisma Design

### Models Impacted

- `VendorProfile`: `category_change_count`, `last_category_change_at`, `requires_admin_review`, `status`, `deleted_at` (sin cambios; ya entregados por PB-P0-001).
- `vendor_profile_categories` (M:N): sin cambios.
- `AdminAction`: insert con `action='vendor_category_change'`.

### Fields / Columns

Sin nuevos campos. Confirmar en US-040 que `category_change_count` quedó con default `0`, `last_category_change_at` nullable y `requires_admin_review` default `false`. Documentation Alignment indica que `docs/18 §15.1` ya los declara.

### Relations

Reuso de la relación `VendorProfile 1..N vendor_profile_categories N..1 ServiceCategory`.

### Indexes

Reuso de los entregados en PB-P0-001 (`idx_vendor_profile_categories_vendor_profile_id` o equivalente). Sin nuevos índices.

### Constraints

`chk_vendor_profiles_category_change_max (category_change_count <= 5)` ya existente (`docs/18 §15.1`). `UNIQUE (vendor_profile_id, service_category_id)` en `vendor_profile_categories` (verificar; si falta, levantar issue de schema separado).

### Migrations Impact

**Ninguna migración nueva** prevista. Si la verificación (DOC-task) detecta que falta `last_category_change_at`, `requires_admin_review` o el CHECK, abrir migración menor antes de la implementación.

### Seed Impact

Sin cambios. El seed de US-040 ya entrega vendors en estados mixtos; se recomienda añadir uno con `category_change_count=4` (para test demo del bloqueo en el 5to/6to cambio) y uno con `status='hidden'`.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

Sesión via HTTP-only cookie (PB-P0-006).

### Authorization

Ownership por sesión: `currentUser.id == vendor_user_id`. Reuso de `VendorRoleGuard` + `adminExclusionGuard` + `organizerExclusionGuard`.

### Ownership Rules

El vendor sólo puede modificar su propio `VendorProfile` (identificado por `vendor_user_id = currentUser.id`).

### Role Rules

Sólo `vendor`. Admin y organizer son rechazados por los exclusion guards.

### Negative Authorization Scenarios

- Sin sesión → `401`.
- `admin` o `organizer` autenticado → `403`.
- Vendor sobre perfil ajeno → `403` (no aplica por la firma `/vendors/me` que infiere ownership).
- Vendor sobre perfil `hidden` → `409 PROFILE_HIDDEN`.
- Vendor sobre perfil soft-deleted → `404`.

### Audit Requirements

`AdminAction(action='vendor_category_change', target_type='VendorProfile', target_id=profile.id, actor_id=currentUser.id)` en cada cambio aplicado (no en `noop`).

### Sensitive Data Handling

No aplica (no se manejan datos sensibles más allá del `vendor_user_id`).

---

## 13. Testing Strategy

### Unit Tests

- DTO Zod rechaza tamaños fuera de `1..5`, UUIDs inválidos, claves extras (`.strict()`).
- `setEquals` helper.
- Branches del use case: noop, hidden, soft-deleted, límite, approved→pending, rejected→pending, pending sin transición.
- Catálogo: categoría faltante e inactiva.

### Integration Tests

- TS-01..TS-06 + EC-01..EC-05 + NT-01..NT-05.
- Verificación de la transacción (rollback si AdminAction falla).
- Verificación de `last_category_change_at` cambia sólo en mutaciones reales.

### API Tests

Supertest cubriendo todos los códigos: `200`, `200 noop`, `400 INVALID_CATEGORIES`, `400 INVALID_CATEGORY`, `401`, `403`, `404`, `409 CATEGORY_CHANGE_LIMIT`, `409 PROFILE_HIDDEN`.

### E2E Tests

Opcional MVP (Playwright): flujo completo desde la UI del vendor.

### Security Tests

AUTH-TS-01..AUTH-TS-05 (matriz auth × estado).

### Accessibility Tests

- Contador con `aria-live`.
- CTA deshabilitado con `aria-describedby` cuando límite alcanzado.
- Navegación por teclado del multi-select y del banner `RependingNotice`.

### AI Tests

No aplica.

### Seed / Demo Tests

Verificar que el seed actualizado contiene al menos un vendor con `category_change_count=4`, uno `approved`, uno `rejected`, uno `hidden`.

### CI Checks

Lint + Vitest (`vitest run`) + Supertest. Sin nuevos jobs.

---

## 14. Observability & Audit

### Logs

- `vendor.category.changed` (info).
- `vendor.category.noop` (debug).
- `vendor.category.limit_reached` (warn).

### Correlation ID

Heredado del middleware central (PB-P0-003). Propagar a todos los logs y al AdminAction si el campo está disponible.

### AdminAction

`action='vendor_category_change'`.

### Error Tracking

Heredado del middleware central (PB-P0-003).

### Metrics

N/A.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Extender el seed de US-040 con un vendor con `category_change_count=4` para demo del bloqueo en el 5to/6to cambio.

### Demo Scenario Supported

- Demo: vendor `approved` cambia categorías → transición a `pending` + banner UI.
- Demo: vendor con `category_change_count=5` → `409 CATEGORY_CHANGE_LIMIT`.

### Reset / Isolation Notes

Reset compartido del seed de PB-P0-014.

---

## 16. Documentation Alignment Required

| Document / Source              | Conflict                                                                                                  | Current Decision                                          | Recommended Action                                                                                              | Blocks Implementation? |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `docs/9 §FR-VENDOR-004`        | PB-P1-025 dice `HTTP 400` al exceder.                                                                     | `409 CATEGORY_CHANGE_LIMIT` (D1).                         | Housekeeping documental.                                                                                       | No                     |
| `docs/8 §UC-VENDOR-002 E2`     | Indica `422` al exceder.                                                                                  | `409 CATEGORY_CHANGE_LIMIT` (D1).                         | Housekeeping documental.                                                                                       | No                     |
| `docs/4 §BR-VENDOR-004`        | Indica trigger sólo en cambios "sustantivos".                                                             | Toda mutación dispara revisión (D2).                      | Housekeeping documental.                                                                                       | No                     |
| `docs/10 §NFR-PERF-001`        | La US referenciaba `NFR-PERF-API-001` (housekeeping ya aplicado).                                          | `NFR-PERF-001`.                                           | Confirmar en próximas US.                                                                                      | No                     |
| `docs/16 §M07`                  | Falta documentar `POST /api/v1/vendors/me/categories`.                                                    | Ver §9 de este spec.                                       | Actualizar `docs/16` con request/response/errors.                                                              | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                              | Impact                                                          | Mitigation                                                                                                       |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Race entre `POST /categories` y `PATCH /vendors/me` o `DELETE /vendors/me` (US-041).               | Estado inconsistente o cambios perdidos.                        | `SELECT FOR UPDATE` sobre `vendor_profiles.id` dentro de la transacción.                                         |
| AdminAction insert falla (FK, integridad).                                                        | Cambio sin auditoría.                                            | Insert dentro de la misma `prisma.$transaction`; falla revierte el diff.                                          |
| `vendor_profile_categories` sin `UNIQUE (vendor_profile_id, service_category_id)`.                | Duplicados al re-insertar.                                       | Verificación de schema en DOC-task; si falta, migración menor.                                                    |
| Comparación de Sets incorrecta (orden o duplicados causa falsos positivos).                       | Cambios reales ignorados como `noop`.                            | Helper `setEquals` con tests unitarios; normalización a `Set` antes de comparar.                                  |
| Catálogo: categoría desactivada entre validación y commit.                                        | Cambio se aplica con categoría inactiva.                          | `service_categories.active` se verifica dentro de la transacción con `SELECT FOR SHARE`.                          |
| Frontend optimista deja al usuario en estado incoherente si el backend rechaza.                    | UX confusa.                                                      | Optimistic update sólo del contador; invalidación + revert en error.                                              |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/vendors/dto/change-vendor-categories.body.ts`
- `src/modules/vendors/use-cases/change-vendor-categories.use-case.ts`
- `src/modules/vendors/repositories/vendor-profile.repository.ts` (extender)
- `src/modules/vendors/controllers/vendor-profile.controller.ts` (extender con `changeCategories`)
- `src/modules/vendors/routes/vendor-profile.routes.ts` (registrar `POST /me/categories`)
- `src/modules/vendors/adapters/admin-action-write.adapter.ts` (reuso de US-041; sin cambios salvo aceptar nuevo `action`)
- `src/modules/service-categories/ports/service-category-read.port.ts` (si no existe, crear método `findByIds`)
- `src/shared/logging/vendor-events.ts` (extender con `vendor.category.changed`, `vendor.category.noop`, `vendor.category.limit_reached`)

**Frontend**:
- `app/[locale]/vendor/profile/edit/categories/page.tsx`
- `components/vendor/profile/CategoryChangeForm.tsx`
- `lib/api/vendorsApi.ts` (añadir `changeCategories`)
- `messages/{es-LATAM,es-ES,pt,en}.json` (claves `vendor.categories.change.*`)
- Reuso de `components/vendor/profile/RependingNotice.tsx` de US-041.

### Orden sugerido

1. DTO Zod + helper `setEquals` (con UT).
2. Extensiones del repository (UT con mocks).
3. UseCase `ChangeVendorCategoriesUseCase` (UT con branches).
4. Controller + ruta.
5. Logger.
6. Frontend `vendorsApi.changeCategories` + MSW handler.
7. `CategoryChangeForm` + page.
8. i18n.
9. Tests de integración + auth.
10. Documentación API (`docs/16 §M07`).

### Decisiones que no deben reabrirse

D1 (HTTP 409 CATEGORY_CHANGE_LIMIT), D2 (toda mutación marca flag + AdminAction), D3 (transición auto en approved/rejected), D4 (política por status), D5 (Set semantics para noop), D6 (cardinalidad 1..5 + catálogo activo).

### Qué no implementar

- Reverso/UNDO de cambios.
- Notificación al admin (US futura).
- Búsqueda de directorio.
- AI bio del vendor.
- `PATCH /vendors/me` no debe aceptar `service_category_ids` (compatibilidad con US-041).

### Assumptions to preserve

- Schema `vendor_profiles` ya entregado por PB-P0-001 incluye `category_change_count`, `last_category_change_at`, `requires_admin_review` y el CHECK constraint.
- `AdminActionWritePort` + adapter heredados de US-041.
- `RependingNotice` heredado de US-041.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 0 (reuso de PB-P0-001; sólo verificación documental) |
| BE    | 6 (DTO, repo ext., use case, controller ext., logger ext., port read service-categories si aplica) |
| FE    | 4 (page, CategoryChangeForm, vendorsApi ext., i18n) |
| SEED  | 1 (extensión: vendor con `category_change_count=4`) |
| QA    | 5 (UT, IT, AUTH, CONTRACT, A11Y) |
| DOC   | 3 (docs/4, docs/8, docs/9, docs/16 — consolidados en 3 tasks) |

**Total estimado ~19 tareas.**

### Required QA tasks

- Unit tests de DTO, helper `setEquals`, branches del use case.
- Integration tests cubriendo AC-01..AC-04, EC-01..EC-05, NT-01..NT-05, AUTH-TS-01..AUTH-TS-05.
- Contract test del response shape.
- Accessibility test del contador y del CTA bloqueado.

### Required security tasks

- AUTH negative matrix (5 escenarios).
- Verificación de `AdminAction` insert.

### Required seed/demo tasks

- Extender seed con vendor en `category_change_count=4` para demo.

### Required documentation tasks

- Actualizar `docs/16 §M07`.
- Housekeeping en `docs/4 §BR-VENDOR-004`, `docs/8 §UC-VENDOR-002 E2`, `docs/9 §FR-VENDOR-004`.

### Dependencies between tasks

- DB-001 (verificación) bloquea BE-* si el schema no incluye campos esperados.
- BE-* (use case + repo) bloquean FE-* y QA-IT.
- DOC-tasks pueden correr en paralelo con BE/FE.

### Backlog consolidated `tasks.md`

PB-P1-025 contiene únicamente US-042 ⇒ el `tasks.md` consolidado del backlog item coincide con el de US-042.

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

US-042 cierra `PB-P1-025` reusando módulo, repository, guards, port `AdminActionWritePort` y banner `RependingNotice` de PB-P1-024 (US-040 + US-041). Toda la regla de negocio queda en un único `ChangeVendorCategoriesUseCase` transaccional. Sin migraciones nuevas. Las 5 acciones de Documentation Alignment Required son housekeeping documental no bloqueante. La historia tiene AC, EC, validaciones, contrato API, observabilidad y matriz de tests claramente definidos, lo que habilita la generación inmediata de Development Tasks.
