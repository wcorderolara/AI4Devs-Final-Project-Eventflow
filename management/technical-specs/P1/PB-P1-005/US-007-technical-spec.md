# Technical Specification — US-007: Cambiar mi idioma preferido entre los 4 soportados

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-007 |
| Source User Story | `management/user-stories/US-007-change-preferred-language.md` |
| Decision Resolution Artifact | No requerido (refinement cerró sin blockers; decisiones formalizadas en `PO/BA Decisions Applied` y en PB-P1-005) |
| Priority | P1 |
| Backlog ID | PB-P1-005 |
| Backlog Title | Perfil propio + cambio de idioma |
| Backlog Execution Order | 23 (18 P0 items + PB-P1-001..004 = 22, esta es la 5ª de P1) |
| User Story Position in Backlog Item | 2 de 2 |
| Related User Stories in Backlog Item | US-006 (perfil completo + password + cambio idioma desde perfil), US-007 (selector global + UX i18n específica) |
| Epic | EPIC-I18N-001 — Internationalization & Currency (cross-cuts EPIC-AUTH-001) |
| Backlog Item Dependencies | PB-P1-003 (sesión activa); transitivamente PB-P0-004 (REST API foundation), PB-P0-006 (cookies HTTP-only), PB-P0-007 (middleware chain), PB-P0-008 (RBAC + ownership), PB-P0-012 (Next.js + i18n bootstrap), PB-P0-013 (TanStack Query) |
| Feature | Selección de idioma preferido (selector global + persistencia por usuario) |
| Module / Domain | Auth / I18N (Users) |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-005 — Perfil propio + cambio de idioma` agrupa la pantalla `/[locale]/profile` (US-006) y el detalle UX del selector de idioma con nombres nativos (US-007). El backlog item establece como criterios: selector con `Español LATAM`, `Español`, `Português`, `English`; aplicación inmediata del cambio; persistencia en `User.preferred_language`. US-007 aporta la capa transversal del selector global accesible desde el header de cualquier ruta autenticada (y comportamiento degradado para sesiones anónimas).

### Execution Order Rationale

Las 18 historias P0 establecen la fundación (esquema DB con `users.preferred_language`, REST API, cookies HTTP-only, RBAC, frontend bootstrap, `next-intl` con 4 locales, TanStack Query, seed, QA tooling, CI). En P1, el orden lógico es registro (PB-P1-001/002), login + logout (PB-P1-003), reset password (PB-P1-004) y, sobre esa base autenticada, la gestión de perfil (PB-P1-005). US-007 se ejecuta en paralelo o inmediatamente después de US-006 porque depende de los mismos artefactos backend (endpoint `PATCH /users/me/preferred-language` ya provisto por la entrega operativa de US-094 / PB-P0-007) y reutiliza los hooks TanStack Query introducidos por US-006.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-006 — Ver y editar mi perfil propio | Núcleo de PB-P1-005: lectura/edición de perfil, cambio de idioma desde perfil y cambio de contraseña con invalidación de otras sesiones. | 1 |
| US-007 — Cambiar idioma preferido (selector global, nombres nativos, sesión anónima) | Refina la UX del selector accesible desde el header global y cubre el comportamiento del usuario anónimo. | 2 (paralelizable después de los componentes base de US-006) |

---

## 3. Executive Technical Summary

Implementar un componente `LanguageSelector` (Client Component) montado en el `Header` global (compartido por rutas autenticadas y públicas) y reutilizado dentro de `/[locale]/profile`. El componente expone los cuatro locales con etiquetas en su propio idioma. Para usuarios autenticados invoca `PATCH /api/v1/users/me/preferred-language` (endpoint dedicado, payload mínimo) usando un hook TanStack Query `useUpdatePreferredLanguage`; tras éxito invalida la query `me`, navega al nuevo `locale` mediante el router de `next-intl` y muestra un toast. Para usuarios anónimos no invoca la API: cambia el segmento `[locale]` de la URL y persiste la preferencia en una cookie `NEXT_LOCALE` legible por `next-intl` en SSR. El backend reutiliza el `authMiddleware`, valida el body con Zod (`UpdatePreferredLanguageRequestDto` = `{ preferredLanguage: LanguageCode }`) y actualiza `users.preferred_language` mediante el `UpdateOwnProfileUseCase` (variante dedicada `UpdatePreferredLanguageUseCase`). No hay impacto en migraciones (el campo ya existe en `users`) ni en IA. La estrategia de fallback de diccionarios (EC-02) y la cobertura de los 4 locales se enmarcan en NFR-I18N-001/002.

---

## 4. Scope Boundary

### In Scope

- Componente `LanguageSelector` reutilizable (dropdown accesible) montado en el `Header` global y dentro de `/[locale]/profile`.
- Etiquetas nativas: `Español LATAM`, `Español`, `Português`, `English` mapeadas a `es-LATAM`, `es-ES`, `pt`, `en`.
- Flujo autenticado: `PATCH /api/v1/users/me/preferred-language` con payload `{ preferredLanguage }`, invalidación de `useMe()` y navegación con `next-intl` router.
- Aplicación inmediata del cambio en la UI (FR-I18N-002) sin recarga dura.
- Flujo anónimo: cambio de segmento `[locale]` de la URL + cookie `NEXT_LOCALE`; sin llamada a API.
- Persistencia entre sesiones: al iniciar sesión, el `locale` del usuario sobrescribe la preferencia anónima de la cookie.
- Backend: `UpdatePreferredLanguageUseCase` + controlador delgado + Zod DTO + ownership policy `/users/me`.
- Validación enum `LanguageCode` ∈ {`es-LATAM`, `es-ES`, `pt`, `en`}.
- Fallback a `en` cuando un dictionary entry falta en el locale activo, registrando key faltante (EC-02).
- Eventos estructurados: `user.preferred-language.updated`, `i18n.dictionary.missing-key`, `auth.ownership.violation` (negativos).
- Tests TS-01..05, NT-01..03, AUTH-TS-01..02, accesibilidad.

### Out of Scope

- Cambio del `Event.language_code` (US-082 / PB-P1-047).
- Cambio del `Vendor.languages_supported`.
- Traducción dinámica con IA, soporte RTL, locales adicionales (FR, IT, etc.).
- Detección automática agresiva (no se autodetecta vía `Accept-Language` para autenticados; sí se respeta como sugerencia inicial de `next-intl` antes de loguearse).
- Cambio de moneda preferida del usuario (BR-I18N-008, fuera de MVP).
- Migraciones de base de datos.
- Implementación inicial de los endpoints `/api/v1/users/me*` (la entrega base pertenece a US-094 / PB-P0-007).
- MFA o re-login forzado tras cambio de idioma.

### Explicit Non-Goals

- No se introducen flujos de moderación ni notificaciones por cambio de idioma.
- No se invoca IA.
- No se modifica el `language_code` de eventos ya creados ni el de `AIRecommendation` previos.

---

## 5. Architecture Alignment

### Backend Architecture

Node.js + Express + TypeScript + Prisma + PostgreSQL bajo el monolito modular. Controlador delgado en `apps/api/src/modules/users/controllers/UsersController.ts` (extiende US-094) que delega en `UpdatePreferredLanguageUseCase`. Validación con Zod (`UpdatePreferredLanguageRequestDto`). Repositorio Prisma reutilizando `UserRepository.updatePreferredLanguage(userId, code)`. Sin transacciones explícitas (operación atómica de un solo `UPDATE`).

### Frontend Architecture

Next.js (App Router) + TypeScript + `next-intl` + TanStack Query + React Hook Form + Tailwind. `LanguageSelector` es un Client Component (requiere router de `next-intl` y mutaciones). Se monta en `apps/web/src/components/layout/Header.tsx` y se reutiliza dentro de `apps/web/src/app/[locale]/profile/page.tsx`. Hook `useUpdatePreferredLanguage` en `apps/web/src/features/users/hooks/useUpdatePreferredLanguage.ts`. Invalida `["me"]` tras éxito.

### Database Architecture

Sin cambios estructurales. El campo `users.preferred_language` ya existe (Doc 6 §User, Doc 18). Mantener el `CHECK` enum existente.

### API Architecture

Reutilizar el endpoint dedicado de Doc 16:

```
PATCH /api/v1/users/me/preferred-language
```

Aceptar también el flujo combinado de `PATCH /api/v1/users/me` (perfil completo) cuando se invoca desde `/profile`. Ambos comparten policy de ownership y validación enum.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

`authMiddleware` requerido en ambos endpoints. Ownership implícita: el `userId` del request se obtiene del JWT/cookie de sesión, no del path. Sin parámetros de path mutables. Anónimo: 401 si invoca el endpoint; cambio puramente cliente con cookie `NEXT_LOCALE` (no sensible). Sin secretos en repositorio.

### Testing Architecture

Vitest (unit + integration), Supertest (API), Playwright (E2E), MSW (mocks en frontend), axe-core (a11y).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Cambio de idioma desde `/profile` | El form de perfil incluye el `LanguageSelector`; el submit dispara `PATCH /users/me` (compartido con US-006) o `PATCH /users/me/preferred-language`. Tras 200, invalida `me` y `next-intl` re-renderiza. | FE form, FE hook, BE controller/use case, BD `UPDATE` |
| AC-02 — Cambio desde selector global del header | `LanguageSelector` montado en `Header`; al elegir un locale, dispara `useUpdatePreferredLanguage` y navega con `useRouter` de `next-intl` al mismo path bajo el nuevo `locale`. | FE component, FE hook, BE controller/use case |
| AC-03 — Persistencia entre sesiones | Al login, `GET /users/me` retorna `preferred_language`; el shell del layout `[locale]` redirige (o sustituye `locale`) si difiere del de la URL; la cookie `NEXT_LOCALE` se sincroniza para SSR. | FE layout, FE hook |
| EC-01 — Locale no soportado | Zod `enum LanguageCode` en el DTO; 400 `VALIDATION_ERROR`. | BE DTO |
| EC-02 — Falta de diccionarios | `next-intl` configurado con `defaultLocale` fallback `en`; handler `onError` registra key faltante y emite `i18n.dictionary.missing-key`. | FE config |
| EC-03 — Sesión anónima | `LanguageSelector` detecta `useSession()` ausente y omite la mutación; solo navega + setea cookie. | FE component |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `apps/api/src/modules/users/`

### Use Cases / Application Services

- `UpdatePreferredLanguageUseCase` (nuevo, derivado de `UpdateOwnProfileUseCase`): recibe `{ userId, preferredLanguage }`, ejecuta `userRepository.updatePreferredLanguage(...)`, emite evento estructurado y retorna `{ id, preferredLanguage, updatedAt }`.
- Reutilización: `UpdateOwnProfileUseCase` (US-006) puede seguir actualizando el campo cuando se invoca desde el perfil completo.

### Controllers / Routes

- `UsersController.updatePreferredLanguage(req, res)` → `PATCH /api/v1/users/me/preferred-language`.
- El handler de `PATCH /api/v1/users/me` (US-006) continúa aceptando `preferredLanguage` como subconjunto del whitelist.

### DTOs / Schemas

```ts
const LanguageCodeSchema = z.enum(['es-LATAM', 'es-ES', 'pt', 'en']);

const UpdatePreferredLanguageRequestDto = z.object({
  preferredLanguage: LanguageCodeSchema,
});

const UpdatePreferredLanguageResponseDto = z.object({
  id: z.string().uuid(),
  preferredLanguage: LanguageCodeSchema,
  updatedAt: z.string().datetime(),
});
```

### Repository / Persistence

- `UserRepository.updatePreferredLanguage(userId: string, code: LanguageCode): Promise<User>` — `UPDATE users SET preferred_language = $1, updated_at = NOW() WHERE id = $2`.

### Validation Rules

- VR-01 — Enum `LanguageCode`.
- VR-02 — Campo `preferredLanguage` obligatorio (Zod `required`).

### Error Handling

- 400 `VALIDATION_ERROR` si el body no satisface el DTO.
- 401 `UNAUTHENTICATED` si falta sesión.
- 422 si el body está vacío o el campo está ausente.
- 500 `INTERNAL_ERROR` en fallo de repositorio (sin filtrar detalle).

### Transactions

No requeridas.

### Observability

- Log estructurado `user.preferred-language.updated` con `{ userId, fromLocale, toLocale, correlationId }`.
- Log `auth.ownership.violation` (negativo, redundante en este caso por ownership implícita).

---

## 8. Frontend Technical Design

### Routes / Pages

- `apps/web/src/app/[locale]/layout.tsx` — provider de `next-intl` y carga de diccionarios.
- `apps/web/src/app/[locale]/profile/page.tsx` — embebe `LanguageSelector` en sección Datos básicos (US-006).
- Todas las rutas autenticadas (organizer/vendor/admin) — el `Header` global incluye `LanguageSelector`.

### Components

- `LanguageSelector` (Client Component) — dropdown accesible con `aria-label="Cambiar idioma"`; ítems con etiqueta en idioma nativo + código.
- `Header` — slot existente; recibe `LanguageSelector` como child.

### Forms

- En `/profile` (US-006), el `LanguageSelector` es parte del form React Hook Form general. En el `Header`, no es un form: es una acción directa que dispara la mutación.

### State Management

- TanStack Query: `useMe()`, `useUpdatePreferredLanguage()` (nuevo).
- `next-intl`: `useLocale()`, `useRouter()`, `usePathname()` para navegación entre locales.

### Data Fetching

- `useUpdatePreferredLanguage` invoca `usersApi.updatePreferredLanguage({ preferredLanguage })` (cliente HTTP central). En `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['me'] })` + `router.replace(pathname, { locale: nextLocale })` + toast éxito.

### Loading / Empty / Error / Success States

- Loading: ítem activo con spinner inline; selector queda deshabilitado.
- Error: toast con `errorCode` mapeado a copy localizado.
- Success: toast breve + re-render automático del subtree por `next-intl`.

### Accessibility

- `role="listbox"` + `aria-activedescendant` en el dropdown.
- Navegación por teclado (↑/↓/Enter/Esc).
- Etiquetas anunciadas por screen reader en su idioma nativo.

### i18n

- Diccionarios `apps/web/messages/<locale>.json` cubren los 4 locales en las claves del selector y rutas demo principales.
- `next-intl` configurado con `defaultLocale: 'es-LATAM'`, `fallbackLocale: 'en'`.
- Handler `onError` reporta keys faltantes a `console.warn` y dispara `i18n.dictionary.missing-key`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| PATCH | `/api/v1/users/me/preferred-language` | Actualizar `preferred_language` del usuario autenticado (selector global, payload mínimo). | Sí (cookie HTTP-only) | `{ preferredLanguage: 'es-LATAM' \| 'es-ES' \| 'pt' \| 'en' }` | `200 { id, preferredLanguage, updatedAt }` | 400 `VALIDATION_ERROR`, 401 `UNAUTHENTICATED`, 422 missing field |
| PATCH | `/api/v1/users/me` | Actualizar perfil completo (incluye `preferredLanguage`); usado desde `/profile`. Reutilizado de US-006. | Sí | `{ name?, phone?, preferredLanguage? }` | `200` perfil actualizado | 400, 401, 422 |

---

## 10. Database / Prisma Design

### Models Impacted

- `User`.

### Fields / Columns

- `users.preferred_language` (`enum LanguageCode`, NOT NULL, default `es-LATAM`).

### Relations

Sin cambios.

### Indexes

Sin cambios.

### Constraints

Reutilizar `CHECK` enum existente; verificar que el enum Prisma `LanguageCode` esté sincronizado.

### Migrations Impact

Ninguna. El campo ya existe (Doc 6, Doc 18).

### Seed Impact

Los usuarios seed se crean con `preferred_language` definido (Doc 11). Verificar que la matriz seed cubre al menos un usuario por locale para el demo.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

Cookie de sesión HTTP-only verificada por `authMiddleware`.

### Authorization

Ownership implícita: el `userId` proviene del JWT/sesión. El path no admite ID externo.

### Ownership Rules

`PATCH /users/me/preferred-language` y `PATCH /users/me` operan exclusivamente sobre el usuario autenticado.

### Role Rules

Cualquier rol autenticado (organizer/vendor/admin) puede ejecutar la operación.

### Negative Authorization Scenarios

- Sin sesión → 401 `UNAUTHENTICATED`.
- Token inválido/expirado → 401.
- Intento de inyectar `userId` en body → ignorado por whitelist (Doc 16 §23).

### Audit Requirements

No requiere `AdminAction` (operación auto-servicio, no admin).

### Sensitive Data Handling

`preferred_language` no es PII sensible; logs pueden incluirlo. No persistir en localStorage.

---

## 13. Testing Strategy

### Unit Tests

- `UpdatePreferredLanguageUseCase`: aceptación de los 4 locales, rechazo de no soportados, evento emitido.
- `UpdatePreferredLanguageRequestDto`: validación Zod (campos requeridos, enum).
- `LanguageSelector`: render con `locale` activo, opciones nativas, callback de cambio.

### Integration Tests

- TS-01 — `PATCH /users/me/preferred-language` con sesión válida actualiza BD.
- TS-04 — Fallback `en` cuando falta key (mocking de diccionario).

### API Tests

- Supertest con cookie de sesión: happy paths para los 4 locales.
- NT-01 — `fr-FR` → 400.
- NT-02 — Anónimo → 401.
- NT-03 — Body vacío → 422.

### E2E Tests

- TS-02 — Cambio desde selector global re-renderiza UI inmediatamente y persiste vía API.
- TS-03 — Cambio se mantiene tras logout/login.
- TS-05 — Selector anónimo cambia URL/cookie sin llamar API (interceptor MSW verifica ausencia de request).

### Security Tests

- AUTH-TS-01 — Sesión activa: 200.
- AUTH-TS-02 — Anónimo: 401.
- Tentativa de modificar `userId` desde body: ignorado.

### Accessibility Tests

- `axe-core` sobre `LanguageSelector` en estados open/closed.
- Navegación por teclado (Tab/Enter/Esc).
- Anuncio del idioma activo por screen reader.

### AI Tests

No aplica.

### Seed / Demo Tests

- Validar que los usuarios seed renderizan correctamente en su `preferred_language` tras login.

### CI Checks

- Lint, typecheck, tests unitarios, integration y E2E críticos del flujo i18n incluidos en el pipeline base de `PB-P0-017`.

---

## 14. Observability & Audit

### Logs

- `user.preferred-language.updated` `{ userId, fromLocale, toLocale, correlationId }`.
- `i18n.dictionary.missing-key` `{ locale, key, route }` (warn).

### Correlation ID

Requerido (propagado por middleware estándar).

### AdminAction

No aplica.

### Error Tracking

Errores 5xx capturados por el error tracker global; 4xx no se reportan como incidentes.

### Metrics

Conteo del evento `user.preferred-language.updated` por locale (útil para KPI "Adopción multi-idioma"). No requiere dashboard nuevo en MVP.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Cubrir al menos un usuario seed por locale para demo (`es-LATAM`, `es-ES`, `pt`, `en`).

### Demo Scenario Supported

Login → cambio de idioma desde el header → la UI re-renderiza → logout/login mantiene el locale.

### Reset / Isolation Notes

El seed reset (`PB-P0-016`) debe respetar los `preferred_language` definidos en la matriz seed.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 8 §UC-AUTH-007 | El UC referenciado originalmente no existe | Reemplazado por UC-AUTH-006 + UC-I18N-001 en la User Story refinada | Documentar en la próxima revisión de Doc 8 si surge otra historia que lo referencie | No |
| Doc 16 §Users | Coexisten `PATCH /me` y `PATCH /me/preferred-language` | Ambos endpoints siguen vigentes; el dedicado se usa para selector global, el general para `/profile` | Mantener ambos endpoints; documentar el patrón en runbook | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Diccionarios incompletos en alguno de los 4 locales | UI inconsistente en demo | QA cobertura por locale + fallback `en` (NFR-I18N-001/002) |
| Cache de TanStack Query no invalidada tras cambio | Datos en idioma anterior persisten en pantalla | `queryClient.invalidateQueries({ queryKey: ['me'] })` en `onSuccess` |
| Desincronización entre cookie anónima y `User.preferred_language` tras login | Locale "salta" al loguearse | Layout `[locale]` lee `GET /me` post-login y sustituye `locale` de URL/cookie si difieren |
| SSR renderiza con locale anterior tras `router.replace` | Flash de contenido en idioma anterior | Usar `router.replace(pathname, { locale })` de `next-intl` (no `window.location`) y revalidar segment cache |

---

## 18. Implementation Guidance for Coding Agents

- Archivos/folders impactados:
  - `apps/api/src/modules/users/controllers/UsersController.ts` (nuevo handler).
  - `apps/api/src/modules/users/use-cases/UpdatePreferredLanguageUseCase.ts` (nuevo).
  - `apps/api/src/modules/users/dto/UpdatePreferredLanguageRequestDto.ts` (nuevo).
  - `apps/api/src/modules/users/repositories/UserRepository.ts` (nuevo método `updatePreferredLanguage`).
  - `apps/api/src/modules/users/routes.ts` (registrar ruta `PATCH /me/preferred-language`).
  - `apps/web/src/components/i18n/LanguageSelector.tsx` (nuevo).
  - `apps/web/src/components/layout/Header.tsx` (incorporar `LanguageSelector`).
  - `apps/web/src/features/users/hooks/useUpdatePreferredLanguage.ts` (nuevo).
  - `apps/web/src/lib/api/usersApi.ts` (método `updatePreferredLanguage`).
  - `apps/web/src/app/[locale]/layout.tsx` (sincronización cookie/preferencia post-login).
  - `apps/web/messages/<locale>.json` (claves del selector).
- Orden recomendado: backend (DTO → use case → repo → controller → ruta) → frontend (hook → componente → integración Header → integración `/profile`).
- Decisiones que no se reabren: enum `LanguageCode`, ownership implícita en `/users/me`, default `es-LATAM`, idioma del evento independiente (US-082).
- Lo que no se implementa: traducción IA, RTL, FR/IT, cambio de `Event.language`, MFA, moneda preferida.
- Asunciones a preservar: el endpoint `PATCH /me/preferred-language` ya existe (US-094) y respeta el contrato de Doc 16; los diccionarios base de los 4 locales existen tras `PB-P0-012`.

---

## 19. Task Generation Notes

- Grupos sugeridos:
  - Backend (DTO + use case + repo + controller + ruta + tests unit + integration).
  - Frontend (hook + `LanguageSelector` + integración Header + integración `/profile` + tests unit + E2E).
  - QA (cobertura por locale + a11y + flujo anónimo).
  - Observabilidad (eventos estructurados + verificación de `correlationId`).
  - Documentación (runbook del patrón `/me/preferred-language` vs `/me`).
- QA obligatorio: TS-01..05, NT-01..03, AUTH-TS-01..02, a11y.
- Seguridad: tests negativos 401 y verificación de whitelist.
- Seed/demo: garantizar usuarios seed por locale.
- Dependencias entre tareas: backend debe estar disponible antes de los tests E2E del frontend; el hook depende del cliente HTTP central.
- El backlog item PB-P1-005 deberá agregar más adelante un `tasks.md` consolidado con US-006 + US-007.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La especificación reutiliza la fundación existente (endpoint dedicado de Doc 16, enum `LanguageCode` ya en BD, `next-intl` bootstrap en PB-P0-012, TanStack Query en PB-P0-013, ownership `/users/me` en US-094) y delimita estrictamente el alcance al cambio del `preferred_language` del usuario y su UX i18n asociada. No quedan decisiones técnicas abiertas ni conflictos arquitectónicos. La generación de Development Tasks puede ejecutarse de inmediato.
