# Development Tasks — PB-P0-012 / US-105: Route groups del App Router por rol `(public)`/`(auth)`/`(app)`/`(admin)` + middleware UX role guard + layouts esqueleto + artefactos SEO base

## 1. Metadata

| Field                                  | Value                                                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| User Story ID                          | US-105                                                                                                               |
| Source User Story                      | `management/user-stories/US-105-route-groups-by-role.md`                                                              |
| Source Technical Specification         | `management/technical-specs/P0/PB-P0-012/US-105-technical-spec.md`                                                    |
| Decision Resolution Artifact           | No existe — decisiones formalizadas en `PO/BA Decisions Applied` de la historia                                       |
| Priority                               | P0                                                                                                                   |
| Backlog ID                             | PB-P0-012                                                                                                            |
| Backlog Title                          | Frontend Next.js Bootstrap & i18n                                                                                    |
| Backlog Execution Order                | 12 (de 18 items P0 priorizados)                                                                                      |
| User Story Position in Backlog Item    | 3 de 3                                                                                                               |
| Related User Stories in Backlog Item   | US-103 (bootstrap), US-104 (i18n + `localeMiddleware`), US-105 (route groups + `roleGuardMiddleware`)                |
| Epic                                   | EPIC-FE-001 — Frontend Next.js Application Foundation                                                                |
| Backlog Item Dependencies              | — (foundation; PB-P0-012 no depende de otros items P0)                                                                |
| Feature                                | Route groups por rol — `(public)`/`(auth)`/`(app)`/`(admin)` + middleware UX role guard + SEO baseline                |
| Module / Domain                        | Platform / FE / Routing                                                                                              |
| Backlog Alignment Status               | Found                                                                                                                |
| Task Breakdown Status                  | Ready for Sprint Planning                                                                                            |
| Created Date                           | 2026-06-19                                                                                                           |
| Last Updated                           | 2026-06-19                                                                                                           |

---

## 2. Source Validation

| Source                       | Found | Used | Notes                                                                                          |
| ---------------------------- | ----- | ---- | ---------------------------------------------------------------------------------------------- |
| User Story                   | Yes   | Yes  | `Ready for Approval`; 10 AC + 5 EC + 11 VR + 7 SEC                                              |
| Technical Specification      | Yes   | Yes  | Fuente primaria — `Ready for Task Breakdown`                                                  |
| Decision Resolution Artifact | No    | N/A  | No existe; decisiones en `PO/BA Decisions Applied`                                              |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P0-012, posición 12 de 18 P0, sin dependencias                                                |
| ADRs                         | Yes   | Yes  | ADR-ARCH-001, ADR-FE-001, ADR-FE-003 (FE UX-only), ADR-FE-015 (middleware UX-only), ADR-FE-004   |

---

## 3. Backlog Execution Context

### Parent Backlog Item

**PB-P0-012 — Frontend Next.js Bootstrap & i18n**. Item P0 foundation que entrega la app Next.js con App Router + TypeScript + Tailwind + next-intl con 4 locales y route groups por rol. Sin dependencias técnicas con otros items P0. Trazabilidad: Doc 15, NFR-A11Y-*, NFR-I18N-*, ADR-FE-001/003/015.

### Execution Order Rationale

PB-P0-012 ocupa la **posición 12 de 18** entre los items P0. US-105 es la **tercera y última historia** del item; cierra la foundation frontend. Depende estructuralmente de US-103 (bootstrap; `src/app/` y stack) y técnicamente de US-104 (`src/middleware.ts` con `localeMiddleware` ya creado; US-105 lo extiende con `roleGuardMiddleware`). La secuencia obligatoria es US-103 → US-104 → US-105. Sin US-105, todas las historias siguientes del MVP (US-106 TanStack Query + MSW, US-107 layouts completos, US-AUTH-* login/register, historias por feature de rol) no tienen route group bajo el cual colgar su scope. US-105 desbloquea simultáneamente: PB-P0-013 (US-106/US-107), todas las historias de `(auth)`, `(app)/organizer/*`, `(app)/vendor/*`, `(admin)/*`, y la indexación SEO baseline de Doc 15 §14.2.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                                                          | Suggested Order |
| ---------- | ------------------------------------------------------------------------------------------------------------- | --------------- |
| US-103     | Bootstrap del proyecto + stack instalado + estructura Doc 15 §15 + `next-intl` como dep + smoke layout         | 1               |
| US-104     | `next-intl` 4 locales + `src/middleware.ts` con `localeMiddleware` + switcher + catálogos transversales + `attachLocaleHeader` | 2               |
| US-105     | 4 route groups con layouts esqueleto + extensión `middleware.ts` con `roleGuardMiddleware` componible + `not-found.tsx`/`loading.tsx`/`error.tsx` + `robots.ts` + `sitemap.ts` placeholder + `/403` | 3 |

---

## 4. Task Breakdown Summary

| Area                       | Number of Tasks | Notes                                                                                                  |
| -------------------------- | --------------: | ------------------------------------------------------------------------------------------------------ |
| Frontend (FE)              | 13              | Authorization module + 4 route groups + error pages + SEO artefactos + middleware composition + layout + i18n keys |
| QA / Testing               | 6               | Unit middleware + component + 6 E2E + A11Y + pipeline canónico                                          |
| Security / Authorization   | 2               | Audit middleware UX-only + checklist SEC-01..SEC-07                                                     |
| DevOps / Environment       | 1               | `NEXT_PUBLIC_SITE_URL` decisión y `.env.local.example`                                                   |
| Documentation              | 2               | `web/README.md` § "Routing" + housekeeping Doc 19 / Doc 15 §15 / decisión admin                         |
| **Total**                  | **24**          |                                                                                                         |

---

## 5. Traceability Matrix

| Acceptance Criterion                                                                                                              | Technical Spec Section                                                | Task IDs                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| AC-01 4 route groups creados con páginas placeholder y layouts esqueleto                                                          | §6 (AC-01), §8 Routes/Pages, §18 paso 4, §19 Group C                  | TASK-PB-P0-012-US-105-FE-004, FE-005, FE-006, FE-007, FE-008                                            |
| AC-02 `middleware.ts` extendido con `roleGuardMiddleware` componible                                                              | §6 (AC-02), §8 Middleware, §12, §18 paso 2-3, §19 Group A+B           | TASK-PB-P0-012-US-105-FE-001, TASK-PB-P0-012-US-105-FE-002, TASK-PB-P0-012-US-105-FE-003                |
| AC-03 `not-found.tsx` global + `loading.tsx`/`error.tsx` por área                                                                  | §6 (AC-03), §8 Loading/Error, §19 Group D                              | TASK-PB-P0-012-US-105-FE-009, TASK-PB-P0-012-US-105-FE-010                                              |
| AC-04 `robots.ts` y `sitemap.ts` operativos                                                                                       | §6 (AC-04), §8 SEO, §18 paso 7, §19 Group E                            | TASK-PB-P0-012-US-105-FE-011, TASK-PB-P0-012-US-105-OPS-001                                              |
| AC-05 Anonymous puede acceder a `(public)` y `(auth)`                                                                             | §6 (AC-05), §8 Middleware                                              | TASK-PB-P0-012-US-105-QA-003 (E2E `routing.public`)                                                     |
| AC-06 Anonymous es redirigido de `(app)` y `(admin)` a `/login?from=...`                                                          | §6 (AC-06), §8 Middleware                                              | TASK-PB-P0-012-US-105-FE-002, TASK-PB-P0-012-US-105-QA-003                                              |
| AC-07 Usuario con sesión y rol incorrecto es redirigido de `(admin)` a `/403`                                                     | §6 (AC-07), §8 Middleware                                              | TASK-PB-P0-012-US-105-FE-002, TASK-PB-P0-012-US-105-QA-003                                              |
| AC-08 Usuario con sesión correcta accede a su workspace + `/login` con sesión redirige al dashboard                              | §6 (AC-08), §8 Middleware                                              | TASK-PB-P0-012-US-105-FE-002, TASK-PB-P0-012-US-105-QA-003                                              |
| AC-09 Pipeline canónico verde y sin artefactos fuera de scope                                                                     | §6 (AC-09), §13 CI Checks, §4 Scope                                    | TASK-PB-P0-012-US-105-QA-005, TASK-PB-P0-012-US-105-SEC-001                                              |
| AC-10 Tests E2E Playwright cubren redirecciones y SEO                                                                              | §6 (AC-10), §13 E2E Tests                                              | TASK-PB-P0-012-US-105-QA-003                                                                            |

Cada AC mapea a ≥ 1 tarea. Todas las tareas mapean a ≥ 1 sección del Technical Spec.

---

## 6. Development Tasks

### TASK-PB-P0-012-US-105-FE-001 — Crear módulo `shared/authorization/` con tipos y `SessionProvider` esqueleto

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | S                                                                                                   |
| Depends On                | — (US-104 mergeada)                                                                                 |
| Source AC(s)              | AC-02, AC-08                                                                                        |
| Technical Spec Section(s) | §4 In Scope, §8 State Management, §18 paso 1, §19 Group A                                            |
| Backlog ID                | PB-P0-012                                                                                            |
| User Story ID             | US-105                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Crear el módulo `shared/authorization/` con tipos `Role`, constantes whitelist, `<SessionProvider>` esqueleto y `useSession()` hook.

#### Scope

##### Include

* `web/src/shared/authorization/types.ts`:
  * `export type Role = 'organizer' | 'vendor' | 'admin'`.
  * `export const ROLE_WHITELIST: readonly Role[] = ['organizer', 'vendor', 'admin'] as const`.
  * `export const COOKIE_SESSION = 'eventflow_session'`.
  * `export const COOKIE_ROLE = 'eventflow_role'`.
  * `export type SessionClaims = { isAuthenticated: boolean; role: Role | null }`.
* `web/src/shared/authorization/SessionProvider.tsx`:
  * `'use client'`.
  * `createContext<SessionClaims>({ isAuthenticated: false, role: null })`.
  * `<SessionProvider>` Client Component que solo expone el valor por defecto (sin hidratación real — US-106).
  * Hook `useSession(): SessionClaims` que consume el contexto; si no hay provider devuelve el default (no throw).
  * JSDoc explícito: "Esqueleto US-105. Hidratación real en US-106".
* `web/src/shared/authorization/index.ts` (barrel) re-exporta `types`, `SessionProvider`, `useSession`, `roleGuardMiddleware` (cuando exista TASK-FE-002).

##### Exclude

* No introducir hidratación real con `GET /me` (US-106).
* No introducir TanStack Query (US-106).
* No introducir `httpClient` (US-106).

#### Implementation Notes

* `SessionProvider` puede coexistir como Client Component dentro de un Server Component layout (envoltura permitida en App Router).
* El graceful default sin provider evita errores cuando se renderiza fuera del root layout.

#### Acceptance Criteria Covered

AC-02, AC-08.

#### Definition of Done

- [ ] Archivos versionados.
- [ ] Importación `import { useSession, SessionProvider, type Role } from '@/shared/authorization'` funciona.
- [ ] `npm run typecheck` pasa.

---

### TASK-PB-P0-012-US-105-FE-002 — Implementar `roleGuardMiddleware` puro con las 13 reglas de AC-02

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | M                                                                                                   |
| Depends On                | TASK-PB-P0-012-US-105-FE-001                                                                         |
| Source AC(s)              | AC-02, AC-06, AC-07, AC-08                                                                          |
| Technical Spec Section(s) | §6 (AC-02), §8 i18n Middleware, §12 Negative scenarios, §18 paso 2, §19 Group A                       |
| Backlog ID                | PB-P0-012                                                                                            |
| User Story ID             | US-105                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Implementar `roleGuardMiddleware` como función pura componible, Edge Runtime compatible, que aplica las 13 reglas de redirección.

#### Scope

##### Include

* `web/src/shared/authorization/roleGuardMiddleware.ts` con:
  * `export function roleGuardMiddleware(req: NextRequest): NextResponse | null`.
  * Lee cookies `eventflow_session` (solo presencia) y `eventflow_role` (whitelist contra `ROLE_WHITELIST`).
  * Aplica las 13 reglas tabuladas en AC-02:
    1. `/`, `/vendors`, `/vendors/*`, `/403`, `/anything-public/*` → pass-through (`return null`).
    2. `/login`, `/register`, `/forgot-password` sin sesión → pass-through.
    3. `/login`, `/register`, `/forgot-password` con sesión `organizer` → `redirect('/organizer')`.
    4. Idem con `vendor` → `/vendor`; con `admin` → `/admin`.
    5. `/organizer*` sin sesión → `redirect('/login?from=<encoded-path>')`.
    6. `/organizer*` con sesión (cualquier rol válido) → pass-through.
    7. `/vendor*` sin sesión → `redirect('/login?from=...')`.
    8. `/vendor*` con sesión → pass-through.
    9. `/admin*` sin sesión → `redirect('/login?from=...')`.
    10. `/admin*` con sesión, rol ≠ admin → `redirect('/403')`.
    11. `/admin*` con sesión, rol admin → pass-through.
    12. Cookie `eventflow_role` fuera de whitelist → tratada como sin rol.
    13. Cookie `eventflow_session` presente sin `eventflow_role` → `/admin*` → `/403`; `/organizer*` y `/vendor*` → pass-through.
  * `null` indica pass-through (composición con otros middlewares).
  * `encodeURIComponent` aplicado a `pathname + search`.
  * Log solo en dev: `console.debug('routing.redirect', { from, to, reason })` sin valores de cookies completas (SEC-07).

##### Exclude

* No decodificar JWT (SEC-02).
* No validar firma criptográfica.
* No imprimir el valor completo de cookies en logs.
* No introducir reglas no listadas en AC-02.

#### Implementation Notes

* Mantener la función Edge-Runtime-pure: solo Web APIs (`URL`, `NextRequest`, `NextResponse`). Sin imports de Node.js.
* Coordinar el orden de chequeo: primero detectar área (`(app)`/`(admin)`/`(auth)`/`(public)`), luego presencia de sesión, luego rol.
* Exportada para tests unit aislados.

#### Acceptance Criteria Covered

AC-02, AC-06, AC-07, AC-08.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] Función pura sin side effects.
- [ ] Exportada en `shared/authorization/index.ts`.
- [ ] `npm run typecheck` pasa.

---

### TASK-PB-P0-012-US-105-FE-003 — Componer `localeMiddleware` + `roleGuardMiddleware` en `src/middleware.ts` y ampliar matcher

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | S                                                                                                   |
| Depends On                | TASK-PB-P0-012-US-105-FE-002                                                                         |
| Source AC(s)              | AC-02                                                                                               |
| Technical Spec Section(s) | §6 (AC-02), §8 Middleware, §18 paso 3, §19 Group B                                                   |
| Backlog ID                | PB-P0-012                                                                                            |
| User Story ID             | US-105                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Extender el `src/middleware.ts` creado en US-104 para componer `localeMiddleware → roleGuardMiddleware → NextResponse.next()`, preservando cookies/headers seteados por el locale middleware.

#### Scope

##### Include

* Modificar `web/src/middleware.ts`:
  * Importar `localeMiddleware` (de US-104) y `roleGuardMiddleware` (TASK-FE-002).
  * Pipeline secuencial: ejecutar `localeMiddleware` → si retorna `NextResponse` con redirect, retornar inmediatamente; si no, ejecutar `roleGuardMiddleware`; si retorna redirect, retornarlo preservando cookies/headers del paso anterior; si ambos pass-through, `NextResponse.next()`.
  * Ampliar `export const config = { matcher: ['/((?!_next|static|api|favicon.ico|robots.txt|sitemap.xml).*)'] }` para excluir los nuevos assets SEO (`robots.txt`, `sitemap.xml`) además de los excluidos por US-104.

##### Exclude

* No introducir lógica de autorización propia en este archivo (vive en `roleGuardMiddleware`).
* No modificar el comportamiento del `localeMiddleware`.

#### Implementation Notes

* Cuando `localeMiddleware` setea cookies/headers (`x-locale`, cookie `eventflow_locale`), el `roleGuardMiddleware` debe respetarlos en el response final. Esto se logra propagando el `NextResponse` resultado al siguiente paso.
* Mantener la función `middleware` como default export.

#### Acceptance Criteria Covered

AC-02.

#### Definition of Done

- [ ] `src/middleware.ts` modificado.
- [ ] Tests integration (TASK-QA-001) cubren composición y matcher.
- [ ] `npm run build` pasa.

---

### TASK-PB-P0-012-US-105-FE-004 — Crear estructura `(public)` con `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `vendors/page.tsx`

| Field                     | Value                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                                     |
| Type                      | Implementation                                                                                               |
| Priority                  | Must                                                                                                         |
| Estimate                  | S                                                                                                            |
| Depends On                | TASK-PB-P0-012-US-105-FE-013 (i18n keys)                                                                      |
| Source AC(s)              | AC-01, AC-05                                                                                                 |
| Technical Spec Section(s) | §6 (AC-01), §8 Routes/Pages, §19 Group C                                                                     |
| Backlog ID                | PB-P0-012                                                                                                    |
| User Story ID             | US-105                                                                                                       |
| Owner Role                | Frontend                                                                                                     |
| Status                    | To Do                                                                                                        |

#### Objective

Crear el route group `(public)` con landing mínima, directorio placeholder, página `/403` y artefactos por área.

#### Scope

##### Include

* `web/src/app/(public)/layout.tsx`: Server Component con `<main className="...">{children}</main>` semántico.
* `web/src/app/(public)/page.tsx`: Server Component con `<h1>{t('navigation.placeholder.landing.title')}</h1>` + `<p>{t('navigation.placeholder.landing.body')}</p>`.
* `web/src/app/(public)/loading.tsx`: skeleton mínimo (`<div className="animate-pulse" aria-busy="true">...</div>`).
* `web/src/app/(public)/error.tsx`: `'use client'` con retry button (`onClick={reset}`) + `t('errors.envelope.UNEXPECTED')` + `t('common.retry')`.
* `web/src/app/(public)/403/page.tsx`: Server Component con `<h1>{t('errors.forbidden.title')}</h1>` + `<Link href="/">{t('errors.forbidden.cta')}</Link>`.
* `web/src/app/(public)/vendors/page.tsx`: Server Component placeholder con `<h1>{t('navigation.placeholder.vendors.title')}</h1>` + `<p>{t('navigation.placeholder.vendors.body')}</p>`.

##### Exclude

* No introducir componentes de listado de vendors reales (historia owner).
* No introducir `generateMetadata` por página (Future).
* No introducir JSON-LD ni Open Graph (Future).
* No introducir `<LocaleSwitcher>` directamente — el layout lo recibe si los layouts globales lo proveen.

#### Implementation Notes

* `/403` vive en `(public)` para ser accesible sin sesión (evita loops del middleware).
* `error.tsx` requiere `'use client'` (App Router); test E2E lo cubre.

#### Acceptance Criteria Covered

AC-01, AC-05.

#### Definition of Done

- [ ] Archivos versionados.
- [ ] `npm run build` pasa.
- [ ] `npm run lint --max-warnings=0` pasa (no hardcoded strings).

---

### TASK-PB-P0-012-US-105-FE-005 — Crear estructura `(auth)` con `layout.tsx`, `loading.tsx`, `error.tsx`, `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`

| Field                     | Value                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                                     |
| Type                      | Implementation                                                                                               |
| Priority                  | Must                                                                                                         |
| Estimate                  | S                                                                                                            |
| Depends On                | TASK-PB-P0-012-US-105-FE-013                                                                                  |
| Source AC(s)              | AC-01, AC-05                                                                                                 |
| Technical Spec Section(s) | §6 (AC-01), §8 Routes/Pages, §19 Group C                                                                     |
| Backlog ID                | PB-P0-012                                                                                                    |
| User Story ID             | US-105                                                                                                       |
| Owner Role                | Frontend                                                                                                     |
| Status                    | To Do                                                                                                        |

#### Objective

Crear el route group `(auth)` con layout esqueleto y placeholders de login/register/forgot-password.

#### Scope

##### Include

* `web/src/app/(auth)/layout.tsx`: Server Component con `<div className="auth-card">{children}</div>`.
* `web/src/app/(auth)/loading.tsx`: skeleton mínimo.
* `web/src/app/(auth)/error.tsx`: `'use client'` con retry.
* `web/src/app/(auth)/login/page.tsx`: placeholder con `<h1>{t('navigation.placeholder.login.title')}</h1>` + `<p>{t('navigation.placeholder.login.body')}</p>`.
* `web/src/app/(auth)/register/page.tsx`: idem con clave `register`.
* `web/src/app/(auth)/forgot-password/page.tsx`: idem con clave `forgotPassword`.

##### Exclude

* **No introducir formularios funcionales** (RHF + Zod + submit) — eso es **US-AUTH-*** (VR-05).
* **No invocar `POST /auth/login`/`/register`/`/forgot-password`**.
* No introducir `<QueryClientProvider>` (VR-06).

#### Implementation Notes

* Las páginas son intencionalmente mínimas — solo validan la estructura del routing y las redirecciones del middleware.

#### Acceptance Criteria Covered

AC-01, AC-05.

#### Definition of Done

- [ ] Archivos versionados.
- [ ] `npm run build` pasa.

---

### TASK-PB-P0-012-US-105-FE-006 — Crear estructura `(app)` con `layout.tsx`, `loading.tsx`, `error.tsx` + subgrupos `organizer/` y `vendor/`

| Field                     | Value                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                                     |
| Type                      | Implementation                                                                                               |
| Priority                  | Must                                                                                                         |
| Estimate                  | S                                                                                                            |
| Depends On                | TASK-PB-P0-012-US-105-FE-013                                                                                  |
| Source AC(s)              | AC-01, AC-06, AC-08                                                                                          |
| Technical Spec Section(s) | §6 (AC-01), §8 Routes/Pages, §19 Group C                                                                     |
| Backlog ID                | PB-P0-012                                                                                                    |
| User Story ID             | US-105                                                                                                       |
| Owner Role                | Frontend                                                                                                     |
| Status                    | To Do                                                                                                        |

#### Objective

Crear el route group `(app)` con sub-layouts y placeholders para organizer y vendor.

#### Scope

##### Include

* `web/src/app/(app)/layout.tsx`: Server Component con `<main>{children}</main>`.
* `web/src/app/(app)/loading.tsx` + `error.tsx` (`'use client'` con retry).
* `web/src/app/(app)/organizer/layout.tsx`: Server Component con `<section>{children}</section>`.
* `web/src/app/(app)/organizer/page.tsx`: placeholder con `t('navigation.placeholder.organizer.title')` + `body`.
* `web/src/app/(app)/vendor/layout.tsx`: idem.
* `web/src/app/(app)/vendor/page.tsx`: placeholder con clave `vendor`.

##### Exclude

* **No introducir sidebars, navegación por rol, headers, breadcrumbs** — es **US-107** (VR-07).
* No introducir features de dominio (event wizard, vendor profile real).
* No introducir `<QueryClientProvider>` ni MSW.

#### Implementation Notes

* Los segmentos URL `/organizer` y `/vendor` son estables en inglés (no se traducen por locale).

#### Acceptance Criteria Covered

AC-01, AC-06, AC-08.

#### Definition of Done

- [ ] Archivos versionados.
- [ ] `npm run build` pasa.

---

### TASK-PB-P0-012-US-105-FE-007 — Crear estructura `(admin)` con `layout.tsx`, `loading.tsx`, `error.tsx`, `page.tsx`

| Field                     | Value                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                                     |
| Type                      | Implementation                                                                                               |
| Priority                  | Must                                                                                                         |
| Estimate                  | XS                                                                                                          |
| Depends On                | TASK-PB-P0-012-US-105-FE-013                                                                                  |
| Source AC(s)              | AC-01, AC-07                                                                                                 |
| Technical Spec Section(s) | §6 (AC-01), §8 Routes/Pages, §19 Group C                                                                     |
| Backlog ID                | PB-P0-012                                                                                                    |
| User Story ID             | US-105                                                                                                       |
| Owner Role                | Frontend                                                                                                     |
| Status                    | To Do                                                                                                        |

#### Objective

Crear el route group `(admin)` con layout esqueleto y placeholder.

#### Scope

##### Include

* `web/src/app/(admin)/layout.tsx`: Server Component con `<section>{children}</section>`.
* `web/src/app/(admin)/loading.tsx` + `error.tsx`.
* `web/src/app/(admin)/page.tsx`: placeholder con `t('navigation.placeholder.admin.title')` + `body`.

##### Exclude

* No introducir panel admin real (historias por feature).
* No introducir sidebars/navegación.

#### Implementation Notes

* La ruta efectiva es `/admin` (paréntesis del group no aparecen en URL).

#### Acceptance Criteria Covered

AC-01, AC-07.

#### Definition of Done

- [ ] Archivos versionados.
- [ ] `npm run build` pasa.

---

### TASK-PB-P0-012-US-105-FE-008 — Modificar `src/app/layout.tsx` para envolver con `<SessionProvider>`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-012-US-105-FE-001                                                                         |
| Source AC(s)              | AC-01                                                                                               |
| Technical Spec Section(s) | §4 In Scope, §18 paso 9, §19 Group F                                                                |
| Backlog ID                | PB-P0-012                                                                                            |
| User Story ID             | US-105                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Envolver `<NextIntlClientProvider>` con `<SessionProvider>` en el root layout.

#### Scope

##### Include

* Modificar `web/src/app/layout.tsx` (de US-104):
  * Importar `<SessionProvider>` desde `@/shared/authorization`.
  * Estructura final: `<html lang={locale}><body><SessionProvider><NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider></SessionProvider></body></html>`.

##### Exclude

* No introducir hidratación real del session (US-106).
* No introducir `<QueryClientProvider>` (US-106).

#### Implementation Notes

* `<SessionProvider>` es Client Component pero puede vivir dentro de un Server Component layout sin problema.

#### Acceptance Criteria Covered

AC-01.

#### Definition of Done

- [ ] Layout modificado.
- [ ] `npm run dev` sin errores de hidratación.
- [ ] `useSession()` accesible desde cualquier descendiente.

---

### TASK-PB-P0-012-US-105-FE-009 — Crear `src/app/not-found.tsx` global con i18n

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-012-US-105-FE-013                                                                         |
| Source AC(s)              | AC-03                                                                                               |
| Technical Spec Section(s) | §6 (AC-03), §8 Loading/Empty/Error                                                                  |
| Backlog ID                | PB-P0-012                                                                                            |
| User Story ID             | US-105                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Crear la página 404 global con copy i18n y CTA a `/`.

#### Scope

##### Include

* `web/src/app/not-found.tsx`: Server Component con:
  * `<h1>{t('errors.notFound.title')}</h1>`.
  * `<p>{t('errors.notFound.body')}</p>`.
  * `<Link href="/">{t('errors.notFound.cta')}</Link>`.
  * `<main>` semántico.

##### Exclude

* No introducir ilustración custom ni assets pesados.
* No introducir tracking de 404 (Future).

#### Acceptance Criteria Covered

AC-03.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] E2E `routing.not-found.spec.ts` (TASK-QA-003) lo cubre.

---

### TASK-PB-P0-012-US-105-FE-010 — (Cubierto por FE-004..FE-007)

> Esta tarea queda absorbida dentro de los route groups respectivos. Cada uno entrega su propio `loading.tsx` y `error.tsx` esqueleto.

*(Esta entrada se mantiene para consistencia de numeración; ver criterios de DoD en FE-004..FE-007).*

---

### TASK-PB-P0-012-US-105-FE-011 — Implementar `src/app/robots.ts` con `Disallow` baseline

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-012-US-105-OPS-001                                                                        |
| Source AC(s)              | AC-04                                                                                               |
| Technical Spec Section(s) | §6 (AC-04), §8 SEO, §18 paso 7, §19 Group E                                                          |
| Backlog ID                | PB-P0-012                                                                                            |
| User Story ID             | US-105                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Exponer `robots.txt` con `Allow: /` y `Disallow` para áreas privadas + sitemap reference.

#### Scope

##### Include

* `web/src/app/robots.ts` con `export default function robots(): MetadataRoute.Robots`:
  * `rules: [{ userAgent: '*', allow: '/', disallow: ['/login', '/register', '/forgot-password', '/organizer', '/vendor', '/admin', '/403'] }]`.
  * `sitemap: '<baseUrl>/sitemap.xml'`.
* `<baseUrl>` desde `process.env.NEXT_PUBLIC_SITE_URL` con fallback a `'http://localhost:3000'`.

##### Exclude

* No introducir reglas por user-agent específico (Future).

#### Implementation Notes

* Cubierto por `Disallow` para `/403` para evitar indexar páginas de error.

#### Acceptance Criteria Covered

AC-04.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] `npm run build` produce `/robots.txt` válido (servido por Next.js).
- [ ] Tests unit (TASK-QA-002) cubren el output.

---

### TASK-PB-P0-012-US-105-FE-012 — Implementar `src/app/sitemap.ts` placeholder

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-012-US-105-OPS-001                                                                        |
| Source AC(s)              | AC-04                                                                                               |
| Technical Spec Section(s) | §6 (AC-04), §8 SEO, §19 Group E                                                                      |
| Backlog ID                | PB-P0-012                                                                                            |
| User Story ID             | US-105                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Exponer `sitemap.xml` placeholder con las URLs públicas mínimas.

#### Scope

##### Include

* `web/src/app/sitemap.ts` con `export default function sitemap(): MetadataRoute.Sitemap`:
  * `[{ url: '<baseUrl>/', lastModified: new Date('2026-06-19'), changeFrequency: 'weekly', priority: 1 }, { url: '<baseUrl>/vendors', lastModified: ..., changeFrequency: 'daily', priority: 0.8 }]`.
* `<baseUrl>` desde `process.env.NEXT_PUBLIC_SITE_URL`.

##### Exclude

* No introducir URLs de vendors reales (historia owner).
* No introducir entries para `/login`, `/register`, etc. (están en `Disallow`).

#### Implementation Notes

* Para evitar el bloqueo de `Date.now()`/`new Date()` (si aplica), pasar fecha fija o constante.

#### Acceptance Criteria Covered

AC-04.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] `/sitemap.xml` accesible en local.
- [ ] Tests unit (TASK-QA-002) cubren el output.

---

### TASK-PB-P0-012-US-105-FE-013 — Agregar claves i18n nuevas a `errors.json` y `navigation.json` en los 4 locales

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | S                                                                                                   |
| Depends On                | — (US-104 mergeada con catálogos creados)                                                            |
| Source AC(s)              | AC-01, AC-03                                                                                        |
| Technical Spec Section(s) | §4 In Scope (catalogs), §8 i18n, §18 paso 8, §19 Group G                                             |
| Backlog ID                | PB-P0-012                                                                                            |
| User Story ID             | US-105                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Agregar las claves i18n requeridas por placeholders, `not-found.tsx`, `/403`, `error.tsx` en los 4 locales.

#### Scope

##### Include

* Agregar a `web/src/messages/<locale>/errors.json` (4 locales):
  * `errors.notFound.title`, `errors.notFound.body`, `errors.notFound.cta`.
  * `errors.forbidden.title`, `errors.forbidden.cta`.
  * `errors.envelope.UNEXPECTED` (si US-104 no la creó ya).
  * `common.retry` (si US-104 no la creó ya — verificar y reusar).
* Agregar a `web/src/messages/<locale>/navigation.json` (crear si no existe):
  * `navigation.placeholder.landing.title`/`body`.
  * `navigation.placeholder.vendors.title`/`body`.
  * `navigation.placeholder.login.title`/`body`.
  * `navigation.placeholder.register.title`/`body`.
  * `navigation.placeholder.forgotPassword.title`/`body`.
  * `navigation.placeholder.organizer.title`/`body`.
  * `navigation.placeholder.vendor.title`/`body`.
  * `navigation.placeholder.admin.title`/`body`.
* `es-LATAM` 100 % completo. `es-ES`/`pt`/`en` con placeholders `[<locale>] ...` detectables.

##### Exclude

* No traducir claves de features futuras (auth, event, vendor real).
* No introducir claves que no estén consumidas por US-105.

#### Implementation Notes

* Si `navigation.json` no existe en US-104, crearlo en los 4 locales con la sección `placeholder.*`.
* Mantener orden alfabético dentro de cada área para revisión de diffs.

#### Acceptance Criteria Covered

AC-01, AC-03.

#### Definition of Done

- [ ] Claves nuevas presentes en los 4 locales.
- [ ] `es-LATAM` sin prefijo `[<locale>]`.
- [ ] `npm run lint --max-warnings=0` pasa (no hardcoded strings en placeholders).

---

### TASK-PB-P0-012-US-105-QA-001 — Tests unit de `roleGuardMiddleware` (13 reglas + EC-01..EC-03)

| Field                     | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Area                      | QA / Testing                                                                                            |
| Type                      | Test                                                                                                    |
| Priority                  | Must                                                                                                    |
| Estimate                  | M                                                                                                       |
| Depends On                | TASK-PB-P0-012-US-105-FE-002, TASK-PB-P0-012-US-105-FE-003                                                |
| Source AC(s)              | AC-02, AC-06, AC-07, AC-08                                                                              |
| Technical Spec Section(s) | §13 Unit Tests, §12 Negative scenarios                                                                  |
| Backlog ID                | PB-P0-012                                                                                                |
| User Story ID             | US-105                                                                                                  |
| Owner Role                | QA / Frontend                                                                                            |
| Status                    | To Do                                                                                                    |

#### Objective

Cubrir las 13 reglas de redirección, la whitelist y los escenarios de cookie adulterada/ausente.

#### Scope

##### Include

* `web/src/tests/unit/authorization/roleGuardMiddleware.test.ts`:
  * TS-02: 13 reglas tabuladas — un test por regla.
  * TS-03: `eventflow_role=superadmin` (no whitelist) → tratado como sin rol; `/admin` → `/403`.
  * NT-01: `eventflow_role` random / vacío → mismo comportamiento que sin rol.
  * NT-02: `eventflow_session` ausente accediendo a `/organizer/events/123` → `redirect('/login?from=%2Forganizer%2Fevents%2F123')` con encoding correcto.
  * NT-03: con sesión válida → `/login` redirige a dashboard sin loop.
* Test de composición: `localeMiddleware` (mock) + `roleGuardMiddleware` preservan cookies/headers seteados (TS-01).
* Test del matcher: paths positivos (`/`, `/organizer`) y negativos (`/_next/asset`, `/favicon.ico`).

##### Exclude

* No probar UI (Component/E2E lo cubren).

#### Implementation Notes

* Construir `NextRequest` con `new NextRequest(new URL(path, 'http://localhost:3000'), { headers, cookies })`.

#### Acceptance Criteria Covered

AC-02, AC-06, AC-07, AC-08.

#### Definition of Done

- [ ] Tests pasan.
- [ ] Cobertura de `roleGuardMiddleware` ≥ 95 % de ramas.

---

### TASK-PB-P0-012-US-105-QA-002 — Tests unit de `robots.ts`, `sitemap.ts` + tests component de placeholders/layouts

| Field                     | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Area                      | QA / Testing                                                                                            |
| Type                      | Test                                                                                                    |
| Priority                  | Must                                                                                                    |
| Estimate                  | S                                                                                                       |
| Depends On                | TASK-PB-P0-012-US-105-FE-004, FE-005, FE-006, FE-007, FE-009, FE-011, FE-012                              |
| Source AC(s)              | AC-01, AC-03, AC-04                                                                                     |
| Technical Spec Section(s) | §13 Unit Tests, §13 Component Tests                                                                     |
| Backlog ID                | PB-P0-012                                                                                                |
| User Story ID             | US-105                                                                                                  |
| Owner Role                | QA / Frontend                                                                                            |
| Status                    | To Do                                                                                                    |

#### Objective

Cubrir con Vitest + Testing Library los módulos puros de SEO y los layouts/placeholders.

#### Scope

##### Include

* `tests/unit/app/robots.test.ts` (TS-06): `robots()` produce `Allow: /` y `Disallow` esperados.
* `tests/unit/app/sitemap.test.ts` (TS-07): `sitemap()` produce array con `/` y `/vendors`.
* `tests/unit/app/not-found.test.tsx` (TS-04): renderiza con copy i18n + Link a `/`.
* `tests/unit/app/layouts.test.tsx` (TS-05): cada layout esqueleto renderiza `{children}` con landmark `<main>`/`<section>` correcto.
* A11Y assertions (A11Y-TS-01): `<h1>` único en cada placeholder + landmark presente.

##### Exclude

* No probar middleware aquí (TASK-QA-001).

#### Implementation Notes

* Wrappear con `<NextIntlClientProvider>` de testing con `messages` mínimos.

#### Acceptance Criteria Covered

AC-01, AC-03, AC-04.

#### Definition of Done

- [ ] Tests pasan.

---

### TASK-PB-P0-012-US-105-QA-003 — 6 specs E2E Playwright (public, app-guard, role-guard, auth-redirect, not-found, seo)

| Field                     | Value                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Area                      | QA / Testing                                                                                                 |
| Type                      | Test                                                                                                         |
| Priority                  | Must                                                                                                         |
| Estimate                  | L                                                                                                            |
| Depends On                | TASK-PB-P0-012-US-105-FE-003 .. FE-013                                                                         |
| Source AC(s)              | AC-05, AC-06, AC-07, AC-08, AC-10                                                                            |
| Technical Spec Section(s) | §13 E2E Tests, §6 (AC-10)                                                                                    |
| Backlog ID                | PB-P0-012                                                                                                    |
| User Story ID             | US-105                                                                                                       |
| Owner Role                | QA                                                                                                           |
| Status                    | To Do                                                                                                        |

#### Objective

Cubrir end-to-end las 6 secciones de AC-10. **Nota**: tarea L; considerar split en sub-tareas (una por spec) durante sprint planning si el equipo lo prefiere.

#### Scope

##### Include

* `web/src/tests/e2e/routing.public.spec.ts` (TS-08): anonymous accede a `/`, `/vendors`, `/login`, `/register`, `/forgot-password`, `/403`.
* `web/src/tests/e2e/routing.app-guard.spec.ts` (TS-09): anonymous redirigido de `/organizer`, `/organizer/events`, `/vendor`, `/vendor/profile`, `/admin`, `/admin/vendors` a `/login?from=<encoded>`.
* `web/src/tests/e2e/routing.role-guard.spec.ts` (TS-10, AUTH-TS-03/04): con `eventflow_session=test` + `eventflow_role=organizer`, `/admin` → `/403`; con `eventflow_role=admin`, `/admin` accesible.
* `web/src/tests/e2e/routing.auth-redirect.spec.ts` (TS-11, AUTH-TS-06): con sesión válida, `/login` redirige al dashboard del rol.
* `web/src/tests/e2e/routing.not-found.spec.ts` (TS-12): `/inexistente` muestra `not-found.tsx`.
* `web/src/tests/e2e/seo.robots-sitemap.spec.ts` (TS-13): `robots.txt` contiene `Disallow` esperados; `sitemap.xml` válido con `/` y `/vendors`.

##### Exclude

* No probar formularios de login reales (US-AUTH-*).
* No asertar contenido completo del placeholder (basta con verificar copy i18n esperado).

#### Implementation Notes

* Cookies de prueba: `await context.addCookies([{ name: 'eventflow_session', value: 'test', domain: 'localhost', path: '/' }, { name: 'eventflow_role', value: 'organizer', domain: 'localhost', path: '/' }])`.
* `routing.auth-redirect.spec.ts` debe cubrir los 3 roles (organizer, vendor, admin).

#### Acceptance Criteria Covered

AC-05, AC-06, AC-07, AC-08, AC-10.

#### Definition of Done

- [ ] `npm run test:e2e` pasa los 6 specs.

---

### TASK-PB-P0-012-US-105-QA-004 — Tests de accesibilidad (A11Y-TS-01..03)

| Field                     | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Area                      | QA / Testing                                                                                            |
| Type                      | Test                                                                                                    |
| Priority                  | Should                                                                                                  |
| Estimate                  | S                                                                                                       |
| Depends On                | TASK-PB-P0-012-US-105-QA-002, TASK-PB-P0-012-US-105-QA-003                                                |
| Source AC(s)              | AC-01, AC-03                                                                                            |
| Technical Spec Section(s) | §13 Accessibility Tests, §8 Accessibility                                                               |
| Backlog ID                | PB-P0-012                                                                                                |
| User Story ID             | US-105                                                                                                  |
| Owner Role                | QA                                                                                                       |
| Status                    | To Do                                                                                                    |

#### Objective

Asegurar mínimos WCAG 2.1 AA en placeholders, `not-found.tsx`, `error.tsx`, `/403`.

#### Scope

##### Include

* A11Y-TS-01: cada placeholder tiene `<h1>` único + landmark `<main>` o `<section>` (cubierto vía Testing Library en TASK-QA-002).
* A11Y-TS-02: `<html lang>` dinámico heredado de US-104 funciona en cada page — assertion en E2E (`expect(await page.locator('html').getAttribute('lang')).toBe('es-LATAM')` por ejemplo).
* A11Y-TS-03: `not-found.tsx`, `error.tsx`, `/403` cumplen contraste mínimo + focus visible — opcional axe-core si la dep está disponible.

##### Exclude

* No introducir auditorías Lighthouse automatizadas (Future).

#### Implementation Notes

* `jest-axe` (vía Testing Library) o `@axe-core/playwright` si el equipo lo prefiere.

#### Acceptance Criteria Covered

AC-01, AC-03.

#### Definition of Done

- [ ] Assertions A11Y verdes.

---

### TASK-PB-P0-012-US-105-QA-005 — Pipeline canónico Doc 21 §9.2 + PR hygiene checklist (VR-05/VR-06/VR-07)

| Field                     | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Area                      | QA / Testing                                                                                            |
| Type                      | Review                                                                                                  |
| Priority                  | Must                                                                                                    |
| Estimate                  | S                                                                                                       |
| Depends On                | TASK-PB-P0-012-US-105-QA-001, QA-002, QA-003, QA-004                                                      |
| Source AC(s)              | AC-09                                                                                                   |
| Technical Spec Section(s) | §13 CI Checks, §4 Scope Boundary                                                                         |
| Backlog ID                | PB-P0-012                                                                                                |
| User Story ID             | US-105                                                                                                  |
| Owner Role                | QA / Tech Lead                                                                                            |
| Status                    | To Do                                                                                                    |

#### Objective

Validar pipeline canónico verde en local + auditar PR contra lista negativa.

#### Scope

##### Include

* Ejecutar desde `web/`: `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e` exit 0.
* PR review checklist:
  * **VR-05**: NO formularios funcionales en `(auth)/*`, NO llamadas a `/auth/*` o `/me`.
  * **VR-06**: NO `<QueryClientProvider>`, NO MSW handlers, NO hidratación `SessionContext` con `GET /me`.
  * **VR-07**: NO sidebars / navegación completa por rol.
  * **VR-08**: `robots.ts` declara `Disallow` para las 7 rutas.
  * **VR-09**: `sitemap.ts` con XML válido.
  * **VR-11**: `/403` accesible sin sesión.
* Verificar absence: Server Actions (`'use server'`), API Routes BFF (`src/app/api/*`), `next.config.i18n`, Sentry config.

##### Exclude

* No reemplaza CI remoto.

#### Acceptance Criteria Covered

AC-09.

#### Definition of Done

- [ ] Pipeline exit 0.
- [ ] Checklist completado en el PR.

---

### TASK-PB-P0-012-US-105-QA-006 — Tests negativos NT-05..NT-09 (regla PR hygiene scripted)

| Field                     | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Area                      | QA / Testing                                                                                            |
| Type                      | Test                                                                                                    |
| Priority                  | Should                                                                                                  |
| Estimate                  | XS                                                                                                      |
| Depends On                | TASK-PB-P0-012-US-105-QA-005                                                                             |
| Source AC(s)              | AC-09                                                                                                   |
| Technical Spec Section(s) | §13 Negative Tests (heredado del User Story NT-05..NT-09)                                                |
| Backlog ID                | PB-P0-012                                                                                                |
| User Story ID             | US-105                                                                                                  |
| Owner Role                | QA / Tech Lead                                                                                            |
| Status                    | To Do                                                                                                    |

#### Objective

Adicionar scripts simples de revisión que automatizan los tests negativos del User Story (NT-05..NT-09).

#### Scope

##### Include

* Script opcional `scripts/check-out-of-scope.sh` o regla CI:
  * `grep -r "'use server'" web/src/` → debe devolver 0 líneas.
  * `grep -r "QueryClient" web/src/app/ web/src/shared/` → debe devolver 0 líneas (excepto JSDoc).
  * `grep -r "msw" web/src/app/` → debe devolver 0 líneas.
  * `grep -r "/auth/login\|/auth/logout\|/me" web/src/app/(auth)/` → debe devolver 0 líneas.
* Documentar el script en `web/README.md` § "PR hygiene" para uso opcional.

##### Exclude

* No bloquear merge automáticamente si el equipo prefiere mantenerlo manual.

#### Implementation Notes

* Útil para revisión rápida en PRs futuros que toquen route groups.

#### Acceptance Criteria Covered

AC-09.

#### Definition of Done

- [ ] Script versionado o documentado.

---

### TASK-PB-P0-012-US-105-SEC-001 — Audit SEC-01..SEC-07 + revisión PR de invariantes UX-only

| Field                     | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Area                      | Security / Authorization                                                                                |
| Type                      | Review                                                                                                  |
| Priority                  | Must                                                                                                    |
| Estimate                  | S                                                                                                       |
| Depends On                | TASK-PB-P0-012-US-105-FE-002, TASK-PB-P0-012-US-105-FE-003                                                |
| Source AC(s)              | AC-09                                                                                                   |
| Technical Spec Section(s) | §12 Security & Authorization, §17 Risks                                                                  |
| Backlog ID                | PB-P0-012                                                                                                |
| User Story ID             | US-105                                                                                                  |
| Owner Role                | Security / Tech Lead                                                                                     |
| Status                    | To Do                                                                                                    |

#### Objective

Auditar invariantes de seguridad SEC-01..SEC-07 antes del merge.

#### Scope

##### Include

* **SEC-01**: confirmar que middleware es UX-only, no security boundary.
* **SEC-02**: confirmar que `roleGuardMiddleware` no decodifica JWT ni valida firma.
* **SEC-03**: confirmar que `eventflow_role` es leído como claim no firmado y validado vs whitelist; cookie HTTP-only de sesión solo se lee por presencia.
* **SEC-04**: documentar (en `web/README.md` y/o en `(auth)/login/page.tsx` TODO) que `from=` debe ser validado en US-AUTH-* como ruta interna (EC-04).
* **SEC-05**: confirmar `robots.ts` con `Disallow` correcto.
* **SEC-06**: confirmar ausencia de Server Actions / API Routes BFF.
* **SEC-07**: confirmar logs middleware sin valor completo de cookies (solo rol resuelto + acción).
* Confirmar que no se introducen tokens en localStorage.

##### Exclude

* No auditar políticas de backend (US-094..097, US-112).

#### Acceptance Criteria Covered

AC-09.

#### Definition of Done

- [ ] Auditoría documentada en el PR.
- [ ] Sin hallazgos.

---

### TASK-PB-P0-012-US-105-SEC-002 — Documentar SEC requirement de validación `from=` para US-AUTH-* (EC-04)

| Field                     | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Area                      | Security / Authorization                                                                                |
| Type                      | Documentation                                                                                           |
| Priority                  | Must                                                                                                    |
| Estimate                  | XS                                                                                                      |
| Depends On                | TASK-PB-P0-012-US-105-FE-002                                                                             |
| Source AC(s)              | AC-09                                                                                                   |
| Technical Spec Section(s) | §12 Negative scenarios EC-04, §17 Risks                                                                  |
| Backlog ID                | PB-P0-012                                                                                                |
| User Story ID             | US-105                                                                                                  |
| Owner Role                | Security / Tech Lead                                                                                     |
| Status                    | To Do                                                                                                    |

#### Objective

Dejar el SEC requirement traceable: el handler de login (US-AUTH-*) debe validar `from=` como ruta interna antes de `router.push`.

#### Scope

##### Include

* Comentario JSDoc en `(auth)/login/page.tsx` con TODO referenciando EC-04 + el regex sugerido `^/[a-zA-Z0-9_/\-?=&]*$`.
* Nota en `web/README.md` § "Routing" → "Open redirect prevention".
* Abrir issue de seguimiento (o entrada en backlog) para US-AUTH-* con la dependencia.

##### Exclude

* No implementar el formulario de login (US-AUTH-*).

#### Acceptance Criteria Covered

AC-09.

#### Definition of Done

- [ ] TODO documentado en el código.
- [ ] Nota en README.
- [ ] Issue/entrada de backlog creada.

---

### TASK-PB-P0-012-US-105-OPS-001 — Decidir y configurar `NEXT_PUBLIC_SITE_URL` en `.env.local.example`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | DevOps / Environment                                                                                |
| Type                      | Setup                                                                                               |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | —                                                                                                   |
| Source AC(s)              | AC-04                                                                                               |
| Technical Spec Section(s) | §6 (AC-04 baseUrl), §16 Documentation Alignment                                                     |
| Backlog ID                | PB-P0-012                                                                                            |
| User Story ID             | US-105                                                                                              |
| Owner Role                | DevOps / Frontend                                                                                   |
| Status                    | To Do                                                                                               |

#### Objective

Definir la fuente de `<baseUrl>` para `robots.ts` y `sitemap.ts`.

#### Scope

##### Include

* Decidir en PR si:
  * Introducir nueva env `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, o
  * Reutilizar `NEXT_PUBLIC_API_BASE_URL` derivando el origin.
* Si se introduce env nueva: agregar a `web/.env.local.example`.
* Documentar la decisión en `web/README.md` § "Routing" → "Sitemap baseUrl".

##### Exclude

* No agregar env privadas.

#### Implementation Notes

* La opción recomendada es `NEXT_PUBLIC_SITE_URL` por separación de concerns.

#### Acceptance Criteria Covered

AC-04.

#### Definition of Done

- [ ] `.env.local.example` actualizado (si aplica).
- [ ] Decisión documentada en README.

---

### TASK-PB-P0-012-US-105-DOC-001 — `web/README.md` § "Routing" con tabla de las 13 reglas + matrices

| Field                     | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Area                      | Documentation / Traceability                                                                            |
| Type                      | Documentation                                                                                           |
| Priority                  | Must                                                                                                    |
| Estimate                  | S                                                                                                       |
| Depends On                | TASK-PB-P0-012-US-105-QA-005                                                                             |
| Source AC(s)              | AC-02, AC-09                                                                                            |
| Technical Spec Section(s) | §18 Recommended order paso 11, §19 Group I                                                              |
| Backlog ID                | PB-P0-012                                                                                                |
| User Story ID             | US-105                                                                                                  |
| Owner Role                | Frontend / Tech Lead                                                                                     |
| Status                    | To Do                                                                                                    |

#### Objective

Documentar la arquitectura de routing en `web/README.md` para que el equipo siga el mismo patrón.

#### Scope

##### Include

* Sección "Routing":
  * Tabla de las 13 reglas del middleware (AC-02).
  * Diagrama o lista de los 4 route groups y su propósito.
  * Lista de redirects esperados.
  * Convención: segmentos URL en inglés (no se traducen por locale).
  * Cookies consumidas (`eventflow_session`, `eventflow_role`) con flags esperados.
  * SEO baseline: `robots.ts` y `sitemap.ts`.
  * Open redirect prevention (TODO para US-AUTH-*).
  * `<baseUrl>` resolution para sitemap.

##### Exclude

* No documentar lógica de US-AUTH-* ni US-107.

#### Acceptance Criteria Covered

AC-02, AC-09.

#### Definition of Done

- [ ] Sección documentada y revisada por Tech Lead.

---

### TASK-PB-P0-012-US-105-DOC-002 — Housekeeping Documentation Alignment (Doc 19 / Doc 15 §15 / decisión admin / `from=` SEC)

| Field                     | Value                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Area                      | Documentation / Traceability                                                                                                      |
| Type                      | Documentation                                                                                                                     |
| Priority                  | Should                                                                                                                            |
| Estimate                  | S                                                                                                                                 |
| Depends On                | TASK-PB-P0-012-US-105-DOC-001                                                                                                      |
| Source AC(s)              | AC-09                                                                                                                             |
| Technical Spec Section(s) | §16 Documentation Alignment Required                                                                                              |
| Backlog ID                | PB-P0-012                                                                                                                          |
| User Story ID             | US-105                                                                                                                            |
| Owner Role                | Tech Lead                                                                                                                          |
| Status                    | To Do                                                                                                                              |

#### Objective

Cerrar el housekeeping documental no bloqueante derivado del Technical Spec.

#### Scope

##### Include

* Amender **Doc 19** post-merge listando la cookie auxiliar `eventflow_role` (no HTTP-only, `SameSite=Lax`, `Secure` en prod, sin firma, valor whitelist) como cookie UX y justificando que no es source of truth.
* Amender **Doc 15 §15** para reflejar `src/middleware.ts` (project-root) en lugar de `app/middleware.ts`.
* Registrar formalmente la decisión "admin puede entrar a `(app)`" en notas de US-105 (ya hecho) y revisar en US-107 si se requiere ajuste UX.
* Crear/actualizar issue de seguimiento para US-108 con el contrato: emitir `eventflow_session` (HTTP-only) + `eventflow_role` (no HTTP-only) en `POST /auth/login`; limpiar ambas en `POST /auth/logout` con `Max-Age=0`.
* Crear/actualizar issue de seguimiento para US-AUTH-* con el SEC requirement de `from=` validation (EC-04).

##### Exclude

* No bloquear el merge de US-105 por este housekeeping.

#### Acceptance Criteria Covered

AC-09.

#### Definition of Done

- [ ] Doc 19 amended (o issue abierto).
- [ ] Doc 15 §15 amended (o issue abierto).
- [ ] Issues de seguimiento creados para US-108 y US-AUTH-*.

---

## 7. Required QA Tasks

| Task ID                          | Test Type             | Purpose                                                                                  |
| -------------------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| TASK-PB-P0-012-US-105-QA-001     | Unit                  | `roleGuardMiddleware` 13 reglas + composición + matcher + EC/NT (AC-02/06/07/08)         |
| TASK-PB-P0-012-US-105-QA-002     | Unit + Component      | `robots.ts`/`sitemap.ts` outputs; layouts y placeholders + A11Y estructural (AC-01/03/04) |
| TASK-PB-P0-012-US-105-QA-003     | E2E (Playwright)      | 6 specs: public, app-guard, role-guard, auth-redirect, not-found, seo (AC-05..AC-10)     |
| TASK-PB-P0-012-US-105-QA-004     | A11Y                  | A11Y-TS-01..03 — `<h1>` único, `<html lang>` dinámico, contraste/focus mínimos          |
| TASK-PB-P0-012-US-105-QA-005     | Pipeline + PR review  | Pipeline canónico verde + checklist VR-05/06/07 (AC-09)                                  |
| TASK-PB-P0-012-US-105-QA-006     | Negative / scripted   | Scripts `grep` para NT-05..NT-09 (AC-09)                                                  |

---

## 8. Required Security Tasks

| Task ID                           | Security Concern                                  | Purpose                                                                                            |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| TASK-PB-P0-012-US-105-SEC-001     | SEC-01..SEC-07 audit                              | Confirmar middleware UX-only, sin JWT decode, whitelist, sin tokens en localStorage, logs limpios   |
| TASK-PB-P0-012-US-105-SEC-002     | Open redirect prevention via `from=`              | Documentar SEC requirement traceable para US-AUTH-* (EC-04)                                         |

---

## 9. Required Seed / Demo Tasks

`No aplica`. US-105 no toca seed/demo. Las pruebas E2E "con sesión" simulan cookies con Playwright (no requieren seed real).

---

## 10. Observability / Audit Tasks

`No aplica`. US-105 no introduce `AdminAction` ni métricas. El middleware loguea solo en dev (`routing.redirect { from, to, reason }`) sin valores completos de cookies — cubierto por SEC-001.

---

## 11. Documentation / Traceability Tasks

| Task ID                          | Document / Artifact                                                | Purpose                                                                          |
| -------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| TASK-PB-P0-012-US-105-DOC-001    | `web/README.md` § "Routing"                                         | Tabla de 13 reglas + 4 route groups + cookies + SEO + open redirect TODO         |
| TASK-PB-P0-012-US-105-DOC-002    | Doc 19, Doc 15 §15, issues US-108 / US-AUTH-*                       | Housekeeping post-merge no bloqueante                                            |

---

## 12. Dependency Graph

```mermaid
flowchart TD
  FE001[FE-001 authorization module + SessionProvider] --> FE002[FE-002 roleGuardMiddleware]
  FE002 --> FE003[FE-003 middleware composition]
  FE001 --> FE008[FE-008 layout.tsx SessionProvider wrap]

  FE013[FE-013 i18n keys] --> FE004[FE-004 (public) group]
  FE013 --> FE005[FE-005 (auth) group]
  FE013 --> FE006[FE-006 (app) group + organizer + vendor]
  FE013 --> FE007[FE-007 (admin) group]
  FE013 --> FE009[FE-009 not-found.tsx]

  OPS001[OPS-001 NEXT_PUBLIC_SITE_URL] --> FE011[FE-011 robots.ts]
  OPS001 --> FE012[FE-012 sitemap.ts]

  FE002 --> QA001[QA-001 Unit middleware]
  FE003 --> QA001
  FE004 --> QA002[QA-002 Unit + Component]
  FE005 --> QA002
  FE006 --> QA002
  FE007 --> QA002
  FE009 --> QA002
  FE011 --> QA002
  FE012 --> QA002

  FE003 --> QA003[QA-003 E2E 6 specs]
  FE004 --> QA003
  FE005 --> QA003
  FE006 --> QA003
  FE007 --> QA003
  FE008 --> QA003
  FE009 --> QA003
  FE011 --> QA003
  FE012 --> QA003

  QA002 --> QA004[QA-004 A11Y]
  QA003 --> QA004

  FE002 --> SEC001[SEC-001 SEC-01..07 audit]
  FE002 --> SEC002[SEC-002 from= SEC docs]

  QA001 --> QA005[QA-005 Pipeline + PR hygiene]
  QA002 --> QA005
  QA003 --> QA005
  QA004 --> QA005
  SEC001 --> QA005
  QA005 --> QA006[QA-006 Negative scripts NT-05..09]

  QA005 --> DOC001[DOC-001 README Routing]
  DOC001 --> DOC002[DOC-002 Doc 19 / Doc 15 §15 / issues seguimiento]
```

---

## 13. Suggested Implementation Order

### Phase 1 — Foundation

1. TASK-PB-P0-012-US-105-OPS-001 (`NEXT_PUBLIC_SITE_URL`).
2. TASK-PB-P0-012-US-105-FE-013 (i18n keys nuevas).
3. TASK-PB-P0-012-US-105-FE-001 (authorization module + SessionProvider).
4. TASK-PB-P0-012-US-105-FE-002 (`roleGuardMiddleware`).

### Phase 2 — Core Implementation

5. TASK-PB-P0-012-US-105-FE-003 (composición middleware).
6. TASK-PB-P0-012-US-105-FE-008 (root layout `<SessionProvider>`).
7. TASK-PB-P0-012-US-105-FE-009 (`not-found.tsx`).
8. TASK-PB-P0-012-US-105-FE-004 ((public) group + `/403` + vendors placeholder).
9. TASK-PB-P0-012-US-105-FE-005 ((auth) group + login/register/forgot placeholders).
10. TASK-PB-P0-012-US-105-FE-006 ((app) group + organizer/vendor).
11. TASK-PB-P0-012-US-105-FE-007 ((admin) group).
12. TASK-PB-P0-012-US-105-FE-011 (`robots.ts`).
13. TASK-PB-P0-012-US-105-FE-012 (`sitemap.ts`).

### Phase 3 — Validation / Security / QA

14. TASK-PB-P0-012-US-105-QA-001 (unit middleware).
15. TASK-PB-P0-012-US-105-QA-002 (unit SEO + component).
16. TASK-PB-P0-012-US-105-QA-003 (6 E2E specs).
17. TASK-PB-P0-012-US-105-QA-004 (A11Y).
18. TASK-PB-P0-012-US-105-SEC-001 (SEC audit).
19. TASK-PB-P0-012-US-105-SEC-002 (`from=` SEC documentation).
20. TASK-PB-P0-012-US-105-QA-005 (pipeline + PR hygiene).
21. TASK-PB-P0-012-US-105-QA-006 (NT-05..NT-09 scripts).

### Phase 4 — Documentation / Review

22. TASK-PB-P0-012-US-105-DOC-001 (README § Routing).
23. TASK-PB-P0-012-US-105-DOC-002 (Doc 19 / Doc 15 §15 / issues US-108 + US-AUTH-*).

---

## 14. Risks & Mitigations

| Risk                                                                                                                                          | Impact                                                                                | Mitigation                                                                                                                                              | Related Task                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Composición incorrecta `localeMiddleware` + `roleGuardMiddleware` rompe `Set-Cookie` o detección de header                                    | Locale switcher de US-104 deja de funcionar o role guard evalúa con locale incorrecto | Pipeline secuencial preservando `NextResponse`; tests integration cubren composición                                                                    | TASK-FE-003, TASK-QA-001                       |
| Confusión entre route group `(app)` y subgrupos `(app)/organizer`/`(app)/vendor`                                                                | Equipo crea archivos en ubicaciones incorrectas                                       | README § Routing documenta paréntesis como group markers (no URL); code review estricto                                                                | TASK-DOC-001, TASK-QA-005                      |
| `matcher` ejecuta sobre `/_next/*` o `/api/*` y rompe assets/build                                                                            | App no carga                                                                          | `matcher` explícito que excluye assets + tests unit del matcher                                                                                          | TASK-FE-003, TASK-QA-001                       |
| Cookie `eventflow_role` adulterada para escalar a admin                                                                                       | Usuario ve placeholder de `/admin` (sin datos reales)                                 | SEC-01..07 + whitelist estricta + backend valida cada request                                                                                            | TASK-FE-002, TASK-SEC-001                      |
| Open redirect vía `?from=https://evil.example.com` al implementar login (US-AUTH-*)                                                          | Phishing posible si US-AUTH-* no valida `from=`                                       | Documentar SEC requirement con regex en código + README + issue US-AUTH-*                                                                                | TASK-SEC-002                                   |
| `<SessionProvider>` esqueleto se confunde con sesión real                                                                                     | Lógica UI condicional se renderiza incorrectamente                                    | JSDoc explícito + valor por defecto explícito + `useSession()` documentado como "siempre default hasta US-106"                                            | TASK-FE-001                                    |
| Loop infinito de redirects (`/login` → `/login`)                                                                                              | App inservible                                                                        | Middleware excluye `/login`/`/register`/`/forgot-password` del guard sin sesión; test NT-03                                                              | TASK-FE-002, TASK-QA-001                       |
| `error.tsx` Client Component sin `'use client'` rompe el build                                                                                | Build falla                                                                            | Cada `error.tsx` con directiva `'use client'`; E2E forzando error                                                                                        | TASK-FE-004 .. FE-007                          |
| Edge Runtime incompatibilidad: imports de Node.js en `roleGuardMiddleware`                                                                    | Middleware no compila                                                                  | Mantener función pura solo con Web APIs (`URL`, `NextRequest`, `NextResponse`)                                                                          | TASK-FE-002, TASK-QA-001                       |
| TASK-QA-003 estimada como L                                                                                                                    | Tarea muy grande, difícil de tracking                                                  | Considerar split en 6 sub-tareas (una por spec) durante sprint planning                                                                                  | TASK-QA-003                                    |
| US-108 no listo al mergear US-105                                                                                                              | Las cookies reales no existen                                                          | Playwright simula cookies (`context.addCookies`); E2E "con sesión" funciona sin US-108. Issue de seguimiento creado para US-108                          | TASK-DOC-002                                   |

---

## 15. Out of Scope Confirmation

Las siguientes capacidades NO deben implementarse como parte de US-105 (referencia: §4 Out of Scope del Technical Spec):

* **Login/Register/Forgot-password funcionales** (formularios + RHF + Zod + submit a `/auth/*`) → **US-AUTH-***. US-105 entrega solo placeholders.
* **Logout funcional** + limpieza de cookies → **US-AUTH-***.
* **Cookie HTTP-only de sesión + cookie auxiliar `eventflow_role` emitidas por backend** → **US-108**. US-105 solo las **lee** en middleware; Playwright las simula.
* **`<QueryClientProvider>` + `QueryClient` global** → **US-106**.
* **MSW handlers + `mockServer`** → **US-106**.
* **Hidratación de `SessionContext` vía `GET /me`** → **US-106**.
* **`httpClient` + propagación de `Authorization`/`Accept-Language`** → **US-106**.
* **Layouts completos con sidebars y navegación por rol** → **US-107**.
* **Dashboards reales** de organizer/vendor/admin → historias por feature.
* **Perfiles públicos `/vendors/[vendorSlug]`** con ISR + `generateMetadata` → historia vendor public profile (no se crea ni placeholder estructural en US-105).
* **`sitemap.ts` lleno con vendors reales** → historia vendor public sitemap.
* **JSON-LD, Open Graph completos, `generateMetadata` por página** → historias de SEO específicas.
* **Server Actions, API Routes BFF** → prohibidos en arquitectura (Doc 15 §6, ADR-FE-002/003).
* **Impersonación admin, multi-rol simultáneo, roles colaborativos** → Future (Doc 5 §6).
* **Validación de `from=`** en `/login?from=...` → **US-AUTH-*** (US-105 deja el SEC requirement documentado).
* **i18n de URLs** (`/es/organizer`, `/en/organizer`) → Future (Doc 15 §31.5).
* **Modificación de Doc 19 / Doc 15 §15** → housekeeping post-merge.

---

## 16. Readiness for Sprint Planning

| Check                                      | Status      |
| ------------------------------------------ | ----------- |
| Product Backlog mapping found              | Pass        |
| Every AC maps to tasks                     | Pass (AC-01..AC-10 cubiertos en §5) |
| Technical Spec used when available         | Pass        |
| QA tasks included                          | Pass (6 tareas QA: unit, component, E2E, A11Y, pipeline, negative) |
| Security tasks included if applicable      | Pass (2 tareas SEC) |
| Seed/demo tasks included if applicable     | N/A (cookies simuladas con Playwright) |
| Observability tasks included if applicable | N/A (logs dev cubiertos por SEC-001) |
| Documentation tasks included if applicable | Pass (2 tareas DOC) |
| Task dependencies clear                    | Pass (Mermaid §12) |
| Tasks small enough                         | Pass (todas XS/S/M excepto QA-003 marcada como L con propuesta de split) |
| Ready for Sprint Planning                  | Yes         |

---

## 17. Final Recommendation

**Ready for Sprint Planning**.

El breakdown entrega 24 tareas atómicas (13 FE + 6 QA + 2 SEC + 1 OPS + 2 DOC) trazables a los 10 Acceptance Criteria, todas mapeadas a secciones específicas del Technical Spec y ordenadas por dependencia de implementación. El alcance es quirúrgico (4 route groups con placeholders + `roleGuardMiddleware` componible + `not-found.tsx`/`loading.tsx`/`error.tsx` + `robots.ts` + `sitemap.ts` placeholder + `/403` + tests E2E + `<SessionProvider>` esqueleto) con decisiones cerradas (ADR-FE-003/015 invariantes, cookie auxiliar `eventflow_role`, 13 reglas de redirección, SEO baseline). Los cuatro `Documentation Alignment Required` heredados (cookie `eventflow_role` en Doc 19, ubicación `src/middleware.ts` en Doc 15 §15, decisión "admin puede entrar a `(app)`", `NEXT_PUBLIC_SITE_URL`) son housekeeping post-merge encapsulados en TASK-DOC-002 (no bloqueantes). El contrato con US-108 (emisión de ambas cookies) y el SEC requirement de `from=` para US-AUTH-* quedan documentados con issues de seguimiento. La única tarea estimada `L` (TASK-QA-003 con 6 specs E2E) puede dividirse en sub-tareas (una por spec) durante sprint planning si el equipo lo prefiere. Al cerrar US-105, el backlog item PB-P0-012 queda completo y desbloquea PB-P0-013 (US-106/US-107), US-AUTH-*, y todas las historias frontend de feature por rol.
