# Technical Specification — US-105: Route groups del App Router por rol `(public)`/`(auth)`/`(app)`/`(admin)` + middleware UX role guard + layouts esqueleto + artefactos SEO base

## 1. Metadata

| Field                                  | Value                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                          | US-105                                                                                                                                 |
| Source User Story                      | `management/user-stories/US-105-route-groups-by-role.md`                                                                               |
| Decision Resolution Artifact           | No existe — la historia refinada incorporó todas las decisiones directamente en `PO/BA Decisions Applied` (sin preguntas bloqueantes)  |
| Priority                               | P0                                                                                                                                     |
| Backlog ID                             | PB-P0-012                                                                                                                              |
| Backlog Title                          | Frontend Next.js Bootstrap & i18n                                                                                                      |
| Backlog Execution Order                | 12 (de 18 items P0 priorizados)                                                                                                        |
| User Story Position in Backlog Item    | 3 de 3                                                                                                                                 |
| Related User Stories in Backlog Item   | US-103 (bootstrap), US-104 (i18n + `localeMiddleware`), US-105 (route groups + `roleGuardMiddleware`)                                  |
| Epic                                   | EPIC-FE-001 — Frontend Next.js Application Foundation                                                                                  |
| Backlog Item Dependencies              | — (foundation; PB-P0-012 no depende de otros items P0)                                                                                 |
| Feature                                | Route groups por rol — `(public)`/`(auth)`/`(app)`/`(admin)` + middleware UX role guard + SEO baseline                                  |
| Module / Domain                        | Platform / FE / Routing                                                                                                                |
| User Story Status                      | Ready for Approval                                                                                                                     |
| Backlog Alignment Status               | Found                                                                                                                                  |
| Technical Spec Status                  | Ready for Task Breakdown                                                                                                               |
| Created Date                           | 2026-06-19                                                                                                                             |
| Last Updated                           | 2026-06-19                                                                                                                             |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P0-012 — Frontend Next.js Bootstrap & i18n**. Item P0 foundation que entrega la app Next.js con App Router + TypeScript + Tailwind + next-intl con 4 locales y route groups por rol. Sin dependencias con otros items P0. Trazabilidad: Doc 15, NFR-A11Y-*, NFR-I18N-*, ADR-FE-001, ADR-FE-003, ADR-FE-015.

### Execution Order Rationale

PB-P0-012 se ejecuta en la **posición 12 de 18**. US-105 es la **tercera y última historia** del item y cierra la foundation frontend. Depende estructuralmente de US-103 (bootstrap; `src/app/`, `src/middleware.ts` aún no existe) y técnicamente de US-104 (US-104 crea `src/middleware.ts` con `localeMiddleware`; US-105 lo extiende con `roleGuardMiddleware` componible). La secuencia obligatoria es US-103 → US-104 → US-105. Sin US-105, todas las historias siguientes del MVP (US-106 TanStack Query + MSW, US-107 layouts completos, US-AUTH-* login/register, historias por feature de rol) no tienen route group bajo el cual colgar su scope. US-105 desbloquea simultáneamente: PB-P0-013 (US-106/US-107), todas las historias de `(auth)`, `(app)/organizer/*`, `(app)/vendor/*`, `(admin)/*`, y la indexación SEO baseline de Doc 15 §14.2.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                                                                                            | Suggested Order |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| US-103     | Bootstrap del proyecto + stack instalado + estructura Doc 15 §15 + `next-intl` como dep + smoke layout                                          | 1               |
| US-104     | `next-intl` 4 locales + `src/middleware.ts` con `localeMiddleware` + switcher + catálogos transversales + `attachLocaleHeader`                  | 2               |
| US-105     | 4 route groups con layouts esqueleto + extensión `middleware.ts` con `roleGuardMiddleware` componible + `not-found.tsx`/`loading.tsx`/`error.tsx` + `robots.ts` + `sitemap.ts` placeholder + `/403` | 3               |

---

## 3. Executive Technical Summary

US-105 entrega el **esqueleto de routing por rol del App Router** sobre el bootstrap de US-103 y el `localeMiddleware` de US-104, cumpliendo Doc 15 §11/§14.2/§15/§17/§18/§21, Doc 5 §5, ADR-FE-001/003/015. La historia introduce:

* **4 route groups** en `web/src/app/` — `(public)`, `(auth)`, `(app)` (con subgrupos `organizer/` y `vendor/`), `(admin)` — cada uno con `layout.tsx` esqueleto, página(s) placeholder mínima(s) y catálogo i18n vía `t('clave')`.
* **`roleGuardMiddleware`** en `src/shared/authorization/roleGuardMiddleware.ts`, función pura componible con `localeMiddleware` de US-104. La composición en `src/middleware.ts` queda `localeMiddleware → roleGuardMiddleware → NextResponse.next()`. Aplica las **13 reglas de redirección** tabuladas en AC-02 de la historia.
* **`not-found.tsx` global** + `loading.tsx`/`error.tsx` por route group con copy i18n (claves nuevas `errors.notFound.*`, `errors.forbidden.*`, `errors.envelope.UNEXPECTED`, `common.retry`).
* **Página `/403`** accesible sin sesión en `(public)/403/page.tsx` (evita loops del middleware).
* **`robots.ts`** con `Allow: /` y `Disallow` para `/login`, `/register`, `/forgot-password`, `/organizer`, `/vendor`, `/admin`, `/403`; `Sitemap: <baseUrl>/sitemap.xml`.
* **`sitemap.ts`** placeholder con `/` y `/vendors` (Doc 15 §14.2).
* **`<SessionProvider>` esqueleto** montado en `RootLayout` con valor por defecto `{ isAuthenticated: false, role: null }`; la hidratación real vive en US-106.
* **Tests Playwright E2E** que cubren las 6 secciones de AC-10 + tests unit del middleware.

La historia **NO** implementa login/register/forgot-password funcionales (US-AUTH-*), **NO** emite cookies de sesión (US-108), **NO** monta `<QueryClientProvider>` ni MSW (US-106), **NO** hidrata `SessionContext` con `GET /me` (US-106), **NO** introduce sidebars/navegación por rol (US-107), **NO** decodifica JWT, **NO** valida firma criptográfica y **NO** introduce Server Actions ni API Routes BFF. Tres `Documentation Alignment Required` no bloqueantes: cookie auxiliar `eventflow_role` en Doc 19, ubicación efectiva `src/middleware.ts` en Doc 15 §15, decisión "admin puede entrar a `(app)`" registrada en notas de la historia.

---

## 4. Scope Boundary

### In Scope

* Estructura de carpetas `web/src/app/(public|auth|app|admin)/` con la jerarquía exacta de AC-01.
* `src/app/not-found.tsx` global con copy i18n.
* `src/app/(public)/layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `403/page.tsx`, `vendors/page.tsx`.
* `src/app/(auth)/layout.tsx`, `loading.tsx`, `error.tsx`, `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`.
* `src/app/(app)/layout.tsx`, `loading.tsx`, `error.tsx`, `organizer/layout.tsx`, `organizer/page.tsx`, `vendor/layout.tsx`, `vendor/page.tsx`.
* `src/app/(admin)/layout.tsx`, `loading.tsx`, `error.tsx`, `page.tsx`.
* `src/app/robots.ts` (export default → `MetadataRoute.Robots`).
* `src/app/sitemap.ts` (export default → `MetadataRoute.Sitemap` con `/` y `/vendors`).
* `src/shared/authorization/roleGuardMiddleware.ts` (función pura).
* `src/shared/authorization/types.ts` (`Role`, `SessionClaims`, constantes whitelist).
* `src/shared/authorization/SessionProvider.tsx` (Client Component esqueleto con `useSession()` hook; valor default `{ isAuthenticated: false, role: null }`).
* `src/shared/authorization/index.ts` (barrel export).
* Extensión de `src/middleware.ts` (existente de US-104): componer `localeMiddleware` + `roleGuardMiddleware`; ampliar `matcher` para excluir `/_next/*`, `/static/*`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/api/*`.
* Actualización de `src/app/layout.tsx` (de US-104): envolver `<NextIntlClientProvider>` con `<SessionProvider>` (orden: `<html>` → `<body>` → `<SessionProvider>` → `<NextIntlClientProvider>` → `{children}`).
* Catálogos i18n nuevos por área: `errors.notFound.title`, `errors.notFound.body`, `errors.notFound.cta`, `errors.forbidden.title`, `errors.forbidden.cta`, `errors.envelope.UNEXPECTED` (si no existe ya de US-104), `common.retry`, `navigation.placeholder.*` (claves para los placeholders de cada page). 4 locales × claves nuevas, con `es-LATAM` 100% completo y placeholders detectables en `es-ES`/`pt`/`en`.
* `.env.local.example`: agregar `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (decisión final en PR; reutilizar `NEXT_PUBLIC_API_BASE_URL` si el equipo lo prefiere).
* Tests unit del middleware (TS-01..TS-03, NT-01..NT-03), tests component de placeholders/layouts (TS-04..TS-05), tests unit de `robots.ts`/`sitemap.ts` (TS-06..TS-07).
* Tests Playwright E2E: `routing.public.spec.ts`, `routing.app-guard.spec.ts`, `routing.role-guard.spec.ts`, `routing.auth-redirect.spec.ts`, `routing.not-found.spec.ts`, `seo.robots-sitemap.spec.ts` (TS-08..TS-13).
* `web/README.md` § "Routing" con la tabla de las 13 reglas del middleware y la matriz de redirección.

### Out of Scope

* **Login/Register/Forgot-password funcionales** (formularios + RHF + Zod + submit a `/auth/*`) → **US-AUTH-***.
* **Logout funcional** (`POST /auth/logout` + limpieza de cookies) → **US-AUTH-***.
* **Cookie HTTP-only de sesión emitida por backend + cookie auxiliar `eventflow_role`** → **US-108**. US-105 solo las **lee** en middleware; Playwright las simula con `context.addCookies()`.
* **`<QueryClientProvider>` + `QueryClient` global** → **US-106**.
* **MSW handlers + `mockServer` en dev/test** → **US-106**.
* **Hidratación de `SessionContext` vía `GET /me`** → **US-106** (US-105 entrega `<SessionProvider>` esqueleto).
* **`httpClient` + propagación de `Authorization`/`Accept-Language`** → **US-106**.
* **Layouts completos con sidebars y navegación por rol** (`OrganizerLayout`, `VendorLayout`, `AdminLayout` con sidebar, header, menú lateral, breadcrumbs) → **US-107**.
* **Dashboards reales** de organizer/vendor/admin → historias por feature.
* **Perfiles públicos `/vendors/[vendorSlug]`** con ISR + `generateMetadata` → historia vendor public profile (no se crea ni siquiera placeholder estructural en US-105).
* **`sitemap.ts` lleno con vendors reales** → historia vendor public sitemap (consume `GET /vendors/public/sitemap`).
* **JSON-LD, Open Graph completos, `generateMetadata` por página** → historias de SEO específicas.
* **Server Actions, API Routes BFF** → prohibidos en arquitectura (Doc 15 §6, ADR-FE-002/003).
* **Impersonación admin, multi-rol simultáneo, roles colaborativos** → Future (Doc 5 §6).
* **Validación de `from=` en `/login?from=...`** → **US-AUTH-*** (US-105 deja el SEC requirement documentado).
* **i18n de URLs** (`/es/organizer`, `/en/organizer`) → Future (Doc 15 §31.5).
* **Modificación de Doc 19 / Doc 15 §15** → housekeeping post-merge, no bloqueante.

### Explicit Non-Goals

* No introducir lógica de autorización efectiva en frontend (SEC-01).
* No decodificar JWT ni validar firma criptográfica en middleware (SEC-02).
* No bloquear a un admin de entrar a `(app)` por URL manual (decisión PO explícita; navegación visual de US-107 no le ofrecerá los links).
* No consumir endpoints reales del backend (no hay clientes API en US-105).
* No introducir componentes UI de presentación más allá del esqueleto `<main>{children}</main>` / `<section>{children}</section>`.
* No traducir segmentos URL por locale (Doc 15 §17).

---

## 5. Architecture Alignment

### Backend Architecture

No aplica directamente. La autorización efectiva vive en el middleware backend (US-094..097, US-112) y es independiente del middleware Next.js. US-105 documenta como **dependencia explícita** el contrato con US-108: el backend debe emitir la cookie auxiliar `eventflow_role` (no HTTP-only, `SameSite=Lax`, `Secure` en prod, valor whitelist) además de la cookie de sesión HTTP-only. Mientras US-108 no esté mergeada, los tests E2E de "con sesión" simulan ambas cookies con Playwright.

### Frontend Architecture

* **Next.js App Router** con 4 route groups paréntesis-prefixed (Doc 15 §11/§18). Los segmentos URL no incluyen el nombre del group.
* **Server Components por defecto** en `(public)` (landing, vendors directory, 403). **Client Components** en `(auth)`, `(app)`, `(admin)` quedan **declarados** pero las páginas placeholder pueden ser Server por simplicidad en US-105 (no requieren interactividad). El cambio a Client por defecto en áreas autenticadas vive en US-106/US-107.
* **Layouts esqueleto**: solo `<main>{children}</main>` o `<section>{children}</section>` con clase Tailwind mínima. Sin sidebars ni navegación.
* **`<SessionProvider>` esqueleto** montado en `RootLayout` envolviendo a `<NextIntlClientProvider>`. Expone `useSession()` que devuelve `{ isAuthenticated: false, role: null }` hasta US-106.
* **Path aliases**: `@/shared/i18n/...` (US-104) y nuevo `@/shared/authorization/...` (US-105). Configurados en `tsconfig.json` (no requiere cambio si el alias `@/*` ya cubre `src/*`).
* **i18n**: 100 % de las strings vía `t('clave')`; las claves nuevas se agregan al catálogo `errors` (existente) y al nuevo `navigation` (si la historia US-104 no lo creó ya — verificar y reusar).

### Database Architecture

No aplica. US-105 no modifica el schema Prisma ni introduce migraciones. La cookie `eventflow_role` y `eventflow_session` se emiten por el backend en US-108 sin requerir tablas adicionales (claims vienen del JWT/sesión existente).

### API Architecture

No aplica. US-105 no introduce ni consume endpoints. Documenta como contrato consumido por historias siguientes: `POST /auth/login`, `POST /auth/logout`, `GET /me`.

### AI / PromptOps Architecture

No aplica. La historia no toca features IA.

### Security Architecture

* **Frontend UX-only** (ADR-FE-003/015). El middleware Next.js es guarda de UX, no security boundary.
* **Backend autoritativo** (Doc 19, US-094..097, US-112). Cualquier request a `/api/v1/*` se valida en backend.
* **Cookies**:
  * `eventflow_session` — HTTP-only, `Secure`, `SameSite=Lax`, emitida por backend (US-108). US-105 lee solo **presencia**.
  * `eventflow_role` — **no HTTP-only**, `Secure`, `SameSite=Lax`, sin firma, valor ∈ `{organizer, vendor, admin}` (whitelist), emitida por backend (US-108). US-105 lee **valor** con whitelist estricta.
* **No tokens en localStorage** (ADR-FE-015).
* **No secretos en repo**.
* **Logs middleware**: en dev, log de `routing.redirect { from, to, reason }` sin valor completo de cookies. En prod, silencioso.

### Testing Architecture

* **Vitest** para unit de `roleGuardMiddleware`, `robots.ts`, `sitemap.ts`, y composición del middleware.
* **Testing Library** para tests component de placeholders y layouts esqueleto.
* **Playwright** para 6 specs E2E (heredado de US-103). Cookies de prueba se setean con `context.addCookies()` antes del `page.goto()`.
* **No Supertest** (no hay API en US-105).
* **No MockAIProvider** (no aplica).
* **A11Y**: assertions de `<main>`/`<section>`/`<h1>` en tests component; axe-core opcional para `not-found.tsx`, `error.tsx`, `/403`.

---

## 6. Functional Interpretation

| Acceptance Criterion                                                                                                  | Technical Interpretation                                                                                                                                                                                                                                                                                                            | Impacted Layer(s)                              |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| AC-01: 4 route groups creados con páginas placeholder y layouts esqueleto                                              | Crear la estructura de carpetas exacta de la historia bajo `web/src/app/`. Cada `layout.tsx` es Server Component con `<main>{children}</main>` o `<section>{children}</section>`. Cada `page.tsx` placeholder llama a `useTranslations` (Client) o `getTranslations` (Server) según componente y renderiza `<h1>{t('clave')}</h1>` + cuerpo i18n. | App Router / Layouts / i18n                    |
| AC-02: `middleware.ts` extendido con `roleGuardMiddleware` componible                                                  | Implementar `roleGuardMiddleware(req: NextRequest, res: NextResponse): NextResponse` puro en `src/shared/authorization/`. Componer en `src/middleware.ts` como `compose(localeMiddleware, roleGuardMiddleware)`. Aplicar las 13 reglas con un mapeo path-prefix → política. `matcher` expandido a la lista de AC-02.                          | Edge Middleware / Authorization                |
| AC-03: `not-found.tsx` global + `loading.tsx`/`error.tsx` por área                                                     | `src/app/not-found.tsx` Server Component con `getTranslations` + `<Link href="/">`. Cada route group con `loading.tsx` (skeleton `<div className="animate-pulse">`) y `error.tsx` Client Component (`'use client'` + `useEffect(reset)` + retry button).                                                                              | App Router / Error Boundaries / i18n           |
| AC-04: `robots.ts` y `sitemap.ts` operativos                                                                          | Implementar `src/app/robots.ts` que exporta función → `MetadataRoute.Robots` con `rules` y `sitemap`. Implementar `src/app/sitemap.ts` que exporta función → `MetadataRoute.Sitemap` con dos entries (`/` y `/vendors`). `<baseUrl>` desde `process.env.NEXT_PUBLIC_SITE_URL` con fallback a `NEXT_PUBLIC_API_BASE_URL` o `'http://localhost:3000'`. | App Router / SEO                               |
| AC-05: Anonymous puede acceder a `(public)` y `(auth)`                                                                | El middleware identifica path prefix; `/`, `/vendors`, `/vendors/*`, `/403`, `/login`, `/register`, `/forgot-password` con sesión ausente → pass-through (`NextResponse.next()`).                                                                                                                                                  | Edge Middleware                                 |
| AC-06: Anonymous es redirigido de `(app)` y `(admin)` a `/login?from=...`                                              | Para path ∈ {`/organizer*`, `/vendor*`, `/admin*`} con cookie `eventflow_session` ausente → `NextResponse.redirect(new URL('/login?from=' + encodeURIComponent(pathname + search), req.url))`.                                                                                                                                       | Edge Middleware                                 |
| AC-07: Usuario con sesión y rol incorrecto es redirigido de `(admin)` a `/403`                                        | Para path `/admin*` con `eventflow_session` presente y `eventflow_role !== 'admin'` (incluido valor ausente o fuera de whitelist) → `NextResponse.redirect(new URL('/403', req.url))`.                                                                                                                                                | Edge Middleware                                 |
| AC-08: Usuario con sesión correcta accede a su workspace + `/login` con sesión redirige al dashboard                  | Para `/organizer*` o `/vendor*` con sesión presente → pass-through. Para `/login`/`/register`/`/forgot-password` con sesión → `redirect('/' + role)` según whitelist (`organizer` → `/organizer`, `vendor` → `/vendor`, `admin` → `/admin`).                                                                                          | Edge Middleware                                 |
| AC-09: Pipeline canónico verde y sin artefactos fuera de scope                                                        | El PR pasa `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`. Revisión PR verifica VR-05/06/07 (no formularios funcionales, no QueryClient, no sidebars).                                                                                                                            | CI / Code Review                                |
| AC-10: Tests E2E Playwright cubren redirecciones y SEO                                                                | 6 specs en `tests/e2e/`: `routing.public.spec.ts`, `routing.app-guard.spec.ts`, `routing.role-guard.spec.ts`, `routing.auth-redirect.spec.ts`, `routing.not-found.spec.ts`, `seo.robots-sitemap.spec.ts`. Cookies simuladas con `context.addCookies([{ name, value, domain: 'localhost', path: '/' }])`.                                | Playwright / E2E                                |

---

## 7. Backend Technical Design

No aplica directamente. Sin embargo, US-105 deja registrado el contrato consumido a futuro:

* **US-108** debe emitir en `POST /auth/login`:
  * `Set-Cookie: eventflow_session=<jwt-o-token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=<ttl>`
  * `Set-Cookie: eventflow_role=<organizer|vendor|admin>; Secure; SameSite=Lax; Path=/; Max-Age=<ttl>` (no HTTP-only)
* **US-108** debe limpiar ambas cookies en `POST /auth/logout` con `Max-Age=0`.
* **US-094..097, US-112** validan autorización en cada request al backend independientemente del middleware frontend.

Acción coordinada (no bloqueante para US-105): registrar el contrato como `Documentation Alignment Required` con Doc 19.

---

## 8. Frontend Technical Design

### Routes / Pages

Estructura exacta a crear (jerarquía de AC-01):

```
web/src/app/
├── layout.tsx                          # Modificado: envolver con <SessionProvider>
├── not-found.tsx                       # Nuevo (Server Component, i18n)
├── robots.ts                           # Nuevo
├── sitemap.ts                          # Nuevo
├── (public)/
│   ├── layout.tsx                      # Server Component: <main>{children}</main>
│   ├── page.tsx                        # Landing mínima "EventFlow" + locale switcher heredado
│   ├── loading.tsx                     # Skeleton mínimo
│   ├── error.tsx                       # 'use client' + retry
│   ├── 403/page.tsx                    # i18n: errors.forbidden.*
│   └── vendors/page.tsx                # Placeholder "Directorio (próximamente)"
├── (auth)/
│   ├── layout.tsx                      # Server Component: <div className="auth-card">{children}</div>
│   ├── loading.tsx
│   ├── error.tsx                       # 'use client'
│   ├── login/page.tsx                  # Placeholder
│   ├── register/page.tsx               # Placeholder
│   └── forgot-password/page.tsx        # Placeholder
├── (app)/
│   ├── layout.tsx                      # Server Component: <main>{children}</main>
│   ├── loading.tsx
│   ├── error.tsx                       # 'use client'
│   ├── organizer/
│   │   ├── layout.tsx                  # <section>{children}</section>
│   │   └── page.tsx                    # Placeholder "Organizer Dashboard (próximamente)"
│   └── vendor/
│       ├── layout.tsx                  # <section>{children}</section>
│       └── page.tsx                    # Placeholder "Vendor Dashboard (próximamente)"
└── (admin)/
    ├── layout.tsx                      # <section>{children}</section>
    ├── loading.tsx
    ├── error.tsx                       # 'use client'
    └── page.tsx                        # Placeholder "Admin Panel (próximamente)"
```

### Components

* **`<SessionProvider>`** (`src/shared/authorization/SessionProvider.tsx`): Client Component (`'use client'`). Usa `createContext` + `useContext`. Acepta `children`. Expone valor por defecto `{ isAuthenticated: false, role: null }`. Sin hidratación real (US-106 lo reemplaza).
* **`useSession()`** hook que consume el contexto y devuelve `{ isAuthenticated: boolean, role: Role | null }`. Si se llama fuera del provider, devuelve el valor por defecto sin lanzar (graceful).
* **Placeholders**: cada `page.tsx` placeholder es Server Component con `getTranslations` (excepto los de `(auth)`/`(app)`/`(admin)` si requieren `useSession()`, en ese caso `'use client'` + `useTranslations`). Renderizan `<h1>{t('navigation.placeholder.<area>.title')}</h1>` + un `<p>` con `t('navigation.placeholder.<area>.body')`.
* **`<LocaleSwitcher>`** (de US-104): se monta en `(public)/layout.tsx` para que sea visible en landing y vendors. No es responsabilidad de US-105 crearlo.

### Forms

No aplica (placeholders sin formularios; cualquier formulario real vive en US-AUTH-*).

### State Management

* **`<SessionProvider>` esqueleto** con valor estático (sin hidratación). El upgrade a sesión real con `GET /me` es US-106.
* **TanStack Query** no se introduce en US-105 (es US-106).

### Data Fetching

No aplica. Ningún `fetch` ni cliente API en US-105.

### Loading / Empty / Error / Success States

* **Loading**: cada `loading.tsx` con `<div className="animate-pulse" aria-busy="true"><div className="h-8 w-48 bg-neutral-200 rounded" /></div>` o equivalente. Sin spinner complejo.
* **Empty**: no aplica (placeholders no representan listas vacías).
* **Error**: cada `error.tsx` con `'use client'`, `useEffect` para log, botón "Reintentar" con `onClick={reset}`. Copy `t('errors.envelope.UNEXPECTED')` + `t('common.retry')`.
* **Success**: no aplica (sin acciones).
* **404**: `not-found.tsx` global con `<h1>{t('errors.notFound.title')}</h1>`, `<p>{t('errors.notFound.body')}</p>`, `<Link href="/">{t('errors.notFound.cta')}</Link>`.
* **403**: `(public)/403/page.tsx` con `<h1>{t('errors.forbidden.title')}</h1>`, `<Link href="/">{t('errors.forbidden.cta')}</Link>`.

### Accessibility

* `<main>` semántico en cada layout (`(public)`/`(app)`).
* `<section>` en sublayouts (`(app)/organizer`, `(app)/vendor`, `(admin)`).
* `<h1>` único por página.
* `<html lang>` dinámico heredado de US-104 (no se toca).
* Focus visible heredado del CSS base; los placeholders no introducen tabIndex personalizados.
* Tests A11Y básicos en `Testing Library` (queryByRole `main`, `heading`).
* `error.tsx` y `not-found.tsx` con contraste mínimo Tailwind default (text-neutral-900 sobre bg-white).

### i18n

* Todas las strings vía `t('clave')` (hereda VR-04 de US-104; ESLint `react/jsx-no-literals` activo).
* Claves nuevas a agregar a `src/messages/<locale>/errors.json` y `src/messages/<locale>/navigation.json` (crear si no existe):
  * `errors.notFound.title`, `errors.notFound.body`, `errors.notFound.cta`.
  * `errors.forbidden.title`, `errors.forbidden.cta`.
  * `errors.envelope.UNEXPECTED` (si US-104 no lo creó ya).
  * `common.retry` (si US-104 no lo creó ya).
  * `navigation.placeholder.landing.title`/`body`, `navigation.placeholder.vendors.title`/`body`, `navigation.placeholder.login.title`/`body`, `navigation.placeholder.register.title`/`body`, `navigation.placeholder.forgotPassword.title`/`body`, `navigation.placeholder.organizer.title`/`body`, `navigation.placeholder.vendor.title`/`body`, `navigation.placeholder.admin.title`/`body`.
* `es-LATAM` 100 % completo; `es-ES`/`pt`/`en` con placeholders detectables siguiendo el formato de US-104.

---

## 9. API Contract Design

No aplica. US-105 no introduce endpoints.

Contratos consumidos a futuro (documentados, no implementados):

| Method | Endpoint            | Purpose                                   | Owner            |
| ------ | ------------------- | ----------------------------------------- | ---------------- |
| POST   | `/auth/login`       | Emite cookies `eventflow_session` + `eventflow_role` | US-108 / US-AUTH-* |
| POST   | `/auth/logout`      | Limpia ambas cookies                      | US-108 / US-AUTH-* |
| GET    | `/me`               | Hidratación de `SessionContext`           | US-106           |

---

## 10. Database / Prisma Design

No aplica. US-105 no toca el schema Prisma ni introduce migraciones, modelos, índices, constraints ni seed.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

US-105 no autentica usuarios. Solo **lee** la presencia de cookie `eventflow_session` (sin decodificar). La emisión real de la cookie es US-108. La hidratación de la sesión en cliente es US-106.

### Authorization

* **Middleware UX-only** (SEC-01, ADR-FE-003/015).
* **Backend es source of truth** (US-094..097, US-112).
* **Reglas del middleware** (las 13 de AC-02) implementadas como función pura `roleGuardMiddleware(req): NextResponse | null`. `null` indica pass-through.

### Ownership Rules

No aplica directamente en US-105 (no hay datos). Las ownership rules viven en backend.

### Role Rules

* Whitelist `{organizer, vendor, admin}` (Doc 5 §5). Cualquier valor fuera se descarta como "sin rol".
* `/admin*` requiere rol `admin`.
* `/organizer*` y `/vendor*` permiten cualquier rol con sesión (decisión PO explícita; el backend filtra datos).
* `(auth)/*` con sesión → redirect al dashboard del rol.

### Negative Authorization Scenarios

| Escenario                                                       | Resultado esperado                            |
| --------------------------------------------------------------- | --------------------------------------------- |
| Anonymous → `/organizer/events/123`                             | `redirect('/login?from=%2Forganizer%2Fevents%2F123')` |
| `eventflow_role=organizer` → `/admin`                          | `redirect('/403')`                            |
| `eventflow_role=superadmin` (no whitelist) → `/admin`           | Tratado como sin rol; `redirect('/403')`     |
| `eventflow_session` presente sin `eventflow_role` → `/admin`   | `redirect('/403')`                            |
| `eventflow_session` presente sin `eventflow_role` → `/organizer` | Pass-through (backend filtra)                |
| Loop: con sesión válida → `/login`                              | `redirect` al dashboard del rol               |
| Open redirect: `/login?from=https://evil.example.com`           | Documentado como SEC requirement para US-AUTH-* (EC-04); US-105 no asserta E2E |

### Audit Requirements

* En **dev**, el middleware loguea `routing.redirect { from, to, reason }` por consola. **Sin valor completo de cookies**; solo el rol resuelto y la acción.
* En **prod**, el middleware es silencioso (Edge Runtime no debe spammear logs).
* `AdminAction` no aplica (no hay acciones admin en US-105).

### Sensitive Data Handling

* Cookies HTTP-only nunca se leen en cliente.
* La cookie `eventflow_role` es un claim UX no firmado; no contiene PII.
* `from=` en query string no contiene datos sensibles (es path interno).

---

## 13. Testing Strategy

### Unit Tests

| ID    | Target                                                                                         | Tipo  |
| ----- | ---------------------------------------------------------------------------------------------- | ----- |
| TS-01 | `localeMiddleware` y `roleGuardMiddleware` exportados como funciones puras componibles         | Unit  |
| TS-02 | `roleGuardMiddleware` cubre las 13 reglas de la tabla AC-02 (cobertura por path × estado)      | Unit  |
| TS-03 | `roleGuardMiddleware` con `eventflow_role` inválido lo descarta (whitelist `{organizer, vendor, admin}`) | Unit  |
| TS-06 | `robots.ts` produce contenido con `Disallow` esperados                                          | Unit  |
| TS-07 | `sitemap.ts` produce XML válido con `/` y `/vendors`                                            | Unit  |
| NT-01 | `eventflow_role=superadmin` (no whitelist) → tratado como sin rol                              | Unit  |
| NT-02 | `eventflow_session` ausente → redirect a `/login?from=<encoded-path>`                          | Unit  |
| NT-03 | Loop intentado: con sesión admin → `/login` redirige a `/admin` sin loop                       | Unit  |

### Integration Tests

No aplica (sin backend ni DB).

### API Tests

No aplica.

### E2E Tests

| ID    | Spec                                       | Cobertura                                                                                                                |
| ----- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| TS-08 | `tests/e2e/routing.public.spec.ts`         | Anonymous accede a `/`, `/vendors`, `/login`, `/register`, `/forgot-password`, `/403`                                  |
| TS-09 | `tests/e2e/routing.app-guard.spec.ts`      | Anonymous redirigido de `/organizer`, `/vendor`, `/admin` a `/login?from=<encoded>`                                     |
| TS-10 | `tests/e2e/routing.role-guard.spec.ts`     | Con `eventflow_role=organizer`, `/admin` → `/403`; con `eventflow_role=admin`, `/admin` accesible                       |
| TS-11 | `tests/e2e/routing.auth-redirect.spec.ts`  | Con sesión, `/login` redirige al dashboard del rol (organizer → `/organizer`, vendor → `/vendor`, admin → `/admin`)     |
| TS-12 | `tests/e2e/routing.not-found.spec.ts`      | `/inexistente` muestra `not-found.tsx` con copy i18n                                                                     |
| TS-13 | `tests/e2e/seo.robots-sitemap.spec.ts`     | `robots.txt` contiene `Disallow` esperados; `sitemap.xml` válido con `/` y `/vendors`                                   |

Cookies de prueba se setean con `await context.addCookies([{ name: 'eventflow_session', value: 'test', domain: 'localhost', path: '/' }, { name: 'eventflow_role', value: 'organizer', domain: 'localhost', path: '/' }])`.

### Security Tests

* Cobertura SEC-01..SEC-07 vía revisión PR (checklist):
  * No decodificación de JWT en middleware.
  * No `<form action="...">` con submit real en placeholders.
  * No tokens en localStorage.
  * Logs sin valor de cookies.

### Accessibility Tests

| ID         | Scenario                                                                                  | Tipo            |
| ---------- | ----------------------------------------------------------------------------------------- | --------------- |
| A11Y-TS-01 | Cada placeholder tiene `<h1>` único + landmarks `<main>` o `<section>`                   | Component       |
| A11Y-TS-02 | `<html lang>` dinámico heredado de US-104 funciona en cada page                          | E2E + DOM       |
| A11Y-TS-03 | `not-found.tsx`, `error.tsx`, `/403` cumplen WCAG 2.1 AA mínimos (focus, contraste, lang) | Manual + axe-core (opcional) |

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica.

### CI Checks

* `npm run lint` (incluye `react/jsx-no-literals`).
* `npm run typecheck`.
* `npm run test` (unit + component).
* `npm run build`.
* `npm run test:e2e` (los 6 specs nuevos).
* Pipeline canónico Doc 21 §9.2 verde.

---

## 14. Observability & Audit

### Logs

* Dev: `console.debug('routing.redirect', { from, to, reason })` en `roleGuardMiddleware` cuando hay redirect. Sin valor completo de cookies.
* Prod: silencioso.

### Correlation ID

No aplica (no hay requests al backend en US-105).

### AdminAction

No aplica.

### Error Tracking

`error.tsx` por route group con `useEffect(() => console.error(error), [error])`. Integración real con Sentry/etc vive en historia de observability frontend (Future).

### Metrics

No aplica.

---

## 15. Seed / Demo Data Impact

No aplica. US-105 no introduce ni modifica datos.

---

## 16. Documentation Alignment Required

| Document / Source                | Conflict                                                                                                                                                  | Current Decision                                                                                                                                                  | Recommended Action                                                                                                  | Blocks Implementation? |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Doc 19 — Security & Authorization | Doc 19 define solo cookies HTTP-only de sesión; no lista la cookie auxiliar `eventflow_role`                                                              | Adoptar `eventflow_role` no HTTP-only (`SameSite=Lax`, `Secure` en prod, sin firma, valor whitelist) emitida por backend en US-108 — formalizado en historia US-105 | Amender Doc 19 post-merge listando `eventflow_role` como cookie auxiliar UX no firmada y justificando que no es source of truth | No                     |
| Doc 15 §15 — Frontend Structure  | Doc 15 §15 menciona `app/middleware.ts`; en App Router la convención es `src/middleware.ts` (project-root del directorio `src/`)                            | Mantener `src/middleware.ts` (creado por US-104) y extenderlo en US-105                                                                                            | Amender Doc 15 §15 post-merge para reflejar la ubicación efectiva                                                   | No                     |
| Decisión "admin puede entrar a `(app)`" | Sin documento previo                                                                                                                                  | El middleware permite a admin escribir manualmente `/organizer` o `/vendor` y ver placeholder. La navegación visual de US-107 no le ofrece links                  | Registrar la decisión en notas de la historia (ya hecho) y revisar en US-107 si se requiere ajuste UX               | No                     |
| `NEXT_PUBLIC_SITE_URL` env       | `.env.local.example` (de US-103/US-104) no incluye `NEXT_PUBLIC_SITE_URL`                                                                                  | Decidir en PR si introducir nueva env `NEXT_PUBLIC_SITE_URL` o reutilizar `NEXT_PUBLIC_API_BASE_URL` para `<baseUrl>` del sitemap                                  | Documentar la decisión en `web/README.md` § "Routing" y actualizar `.env.local.example`                              | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                                                                  | Impact                                                                                                  | Mitigation                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composición incorrecta de `localeMiddleware` + `roleGuardMiddleware` rompe `Set-Cookie` de locale o detección de header                              | Locale switcher de US-104 deja de funcionar o el role guard se evalúa con locale incorrecto             | Implementar la composición como pipeline secuencial: `localeMiddleware` retorna `NextResponse` con cookies/headers seteados; `roleGuardMiddleware` recibe esa response y la enriquece o reemplaza si requiere redirect. Tests unit cubren composición con assertion de cookies y headers preservados.                       |
| Confusión entre route group `(app)` y subgrupos `(app)/organizer`/`(app)/vendor`                                                                       | Equipo crea archivos en ubicaciones incorrectas; URL `/app/organizer` (incorrecta) en lugar de `/organizer` | Documentar en `web/README.md` que los paréntesis son group markers y **no** aparecen en URL. Tests E2E aciertan paths sin paréntesis. Code review estricto.                                                                                                                                                                |
| `matcher` del middleware ejecuta sobre `/_next/*` o `/api/*` y rompe assets/build                                                                     | App no carga; tests E2E fallan en cascada                                                              | `matcher` explícito que excluye `/_next/*`, `/static/*`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/api/*`. Test unit del matcher con paths positivos y negativos.                                                                                                                                                     |
| Cookie `eventflow_role` adulterada por usuario para escalar a admin                                                                                    | Usuario ve placeholder de `/admin` (impacto UX cero, no hay datos)                                      | SEC-01..SEC-07 + whitelist estricta. Backend valida cada request independientemente. El placeholder no expone datos.                                                                                                                                                                                                          |
| Open redirect vía `?from=https://evil.example.com` al implementar login (US-AUTH-*)                                                                   | Phishing posible si US-AUTH-* no valida `from`                                                          | EC-04 documenta el SEC requirement traceable: el handler de login (US-AUTH-*) debe validar `from` como ruta interna (regex `^/[a-zA-Z0-9_/\-?=&]*$`). US-105 deja documentado y no implementa formulario.                                                                                                                  |
| `<SessionProvider>` esqueleto se confunde con sesión real → equipo lo consume creyendo que está hidratado                                              | Lógica de UI condicional al rol se renderiza incorrectamente                                            | JSDoc claro en `<SessionProvider>`: "Esqueleto US-105. Hidratación real en US-106". Valor por defecto explícito. `useSession()` documentado como "siempre `{ isAuthenticated: false, role: null }` hasta US-106".                                                                                                          |
| Loop infinito de redirects (ej. `/login` → `/login`)                                                                                                  | App inservible                                                                                          | Middleware excluye `/login`/`/register`/`/forgot-password` del role guard cuando NO hay sesión (pass-through). Test unit NT-03 cubre el escenario.                                                                                                                                                                          |
| `error.tsx` Client Component sin `'use client'` rompe el build                                                                                        | Build falla                                                                                            | Cada `error.tsx` con directiva `'use client'` en la primera línea. Test E2E forzando error verifica que renderice.                                                                                                                                                                                                            |
| Edge Runtime incompatibilidad: imports de Node.js en `roleGuardMiddleware`                                                                            | Middleware no compila o falla en runtime                                                              | Mantener `roleGuardMiddleware` puro (solo lógica de string/cookie). No importar nada que no sea Web API (`URL`, `URLSearchParams`, `NextRequest`, `NextResponse`).                                                                                                                                                          |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / carpetas impactados

* **Nuevos**:
  * `web/src/app/not-found.tsx`
  * `web/src/app/robots.ts`
  * `web/src/app/sitemap.ts`
  * `web/src/app/(public)/layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `403/page.tsx`, `vendors/page.tsx`
  * `web/src/app/(auth)/layout.tsx`, `loading.tsx`, `error.tsx`, `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`
  * `web/src/app/(app)/layout.tsx`, `loading.tsx`, `error.tsx`, `organizer/layout.tsx`, `organizer/page.tsx`, `vendor/layout.tsx`, `vendor/page.tsx`
  * `web/src/app/(admin)/layout.tsx`, `loading.tsx`, `error.tsx`, `page.tsx`
  * `web/src/shared/authorization/roleGuardMiddleware.ts`
  * `web/src/shared/authorization/types.ts`
  * `web/src/shared/authorization/SessionProvider.tsx`
  * `web/src/shared/authorization/useSession.ts` (opcional, puede vivir en `SessionProvider.tsx`)
  * `web/src/shared/authorization/index.ts`
  * `web/tests/e2e/routing.public.spec.ts`
  * `web/tests/e2e/routing.app-guard.spec.ts`
  * `web/tests/e2e/routing.role-guard.spec.ts`
  * `web/tests/e2e/routing.auth-redirect.spec.ts`
  * `web/tests/e2e/routing.not-found.spec.ts`
  * `web/tests/e2e/seo.robots-sitemap.spec.ts`
  * Tests unit en `web/src/shared/authorization/__tests__/` y `web/src/app/__tests__/`
* **Modificados**:
  * `web/src/app/layout.tsx` (envolver con `<SessionProvider>`).
  * `web/src/middleware.ts` (componer `localeMiddleware` + `roleGuardMiddleware`; ampliar `matcher`).
  * `web/src/messages/<locale>/errors.json` (claves nuevas).
  * `web/src/messages/<locale>/navigation.json` (crear/extender con `placeholder.*`).
  * `web/.env.local.example` (si se introduce `NEXT_PUBLIC_SITE_URL`).
  * `web/README.md` (§ "Routing" nueva con la tabla de 13 reglas).

### Orden recomendado de implementación

1. **Tipos y constantes**: `src/shared/authorization/types.ts` con `Role`, `ROLE_WHITELIST`, `SessionClaims`, constantes de cookies (`COOKIE_SESSION`, `COOKIE_ROLE`).
2. **`roleGuardMiddleware`**: función pura con las 13 reglas. Tests unit primero (TDD recomendado).
3. **Composición en `src/middleware.ts`**: extender el archivo existente de US-104. Ampliar `matcher`.
4. **Estructura de carpetas**: crear los 4 route groups con `layout.tsx` esqueleto y `page.tsx` placeholder por carpeta.
5. **`not-found.tsx`** + `loading.tsx`/`error.tsx` por área.
6. **`(public)/403/page.tsx`**.
7. **`robots.ts`** + `sitemap.ts`.
8. **Catálogos i18n**: agregar claves nuevas a `errors.json` y `navigation.json` en los 4 locales.
9. **`<SessionProvider>` esqueleto** + montar en `RootLayout`.
10. **Tests Playwright E2E** (6 specs).
11. **`web/README.md`** § "Routing".
12. **`.env.local.example`** si aplica.

### Decisiones que no deben reabrirse

* 4 route groups exactos: `(public)`, `(auth)`, `(app)`, `(admin)`. No agregar `(marketing)`, `(api)`, `(docs)`.
* Segmentos URL en inglés. No traducir por locale.
* Middleware en `src/middleware.ts` único (no `src/app/middleware.ts`).
* `roleGuardMiddleware` no decodifica JWT.
* `eventflow_role` es claim UX no firmado.
* Admin puede entrar a `(app)` por URL manual (UX, no security).
* `/403` accesible sin sesión.
* `<SessionProvider>` esqueleto sin hidratación real en US-105.
* `sitemap.ts` placeholder (`/`, `/vendors`); vendors reales en historia owner.
* Sin `<QueryClientProvider>`, sin MSW, sin sidebars en US-105.
* Sin Server Actions, sin API Routes BFF.

### Lo que NO debe implementarse

* Formularios funcionales en `(auth)/*` (US-AUTH-*).
* Llamadas a `POST /auth/login`, `POST /auth/logout`, `GET /me`.
* `<QueryClientProvider>`, `QueryClient`, `useQuery`/`useMutation`.
* MSW handlers o `mockServer`.
* Hidratación de `SessionContext` con `GET /me`.
* Sidebars, headers de navegación, breadcrumbs, menús laterales.
* `generateMetadata` por página (excepto `title` mínimo si fluye natural; no es requisito).
* JSON-LD, Open Graph completos.
* Validación de `from=` en `/login`.
* Componentes de dominio (event cards, vendor cards, dashboards, etc.).
* Cualquier modificación al backend.

### Asunciones a preservar

* US-103 y US-104 mergeadas y operativas.
* `src/middleware.ts` ya existe con `localeMiddleware` (de US-104).
* `next-intl` está configurado y `t('clave')` funciona en Server y Client Components.
* `<LocaleSwitcher>` está disponible y se monta donde el layout lo elija.
* El backend (US-108) emitirá ambas cookies en su momento; mientras tanto, Playwright las simula.
* Backend siempre valida cada request independientemente.

---

## 19. Task Generation Notes

### Suggested Task Groups

1. **Group A — Authorization Module**:
   * Crear `src/shared/authorization/types.ts`.
   * Crear `src/shared/authorization/roleGuardMiddleware.ts` con tests unit.
   * Crear `src/shared/authorization/SessionProvider.tsx` + `useSession`.
   * Crear `src/shared/authorization/index.ts` (barrel).
2. **Group B — Middleware Composition**:
   * Extender `src/middleware.ts` con composición + matcher ampliado.
   * Tests unit de composición.
3. **Group C — Route Groups Structure**:
   * Crear estructura de carpetas y `layout.tsx` esqueleto de los 4 groups.
   * Crear páginas placeholder con i18n.
   * Crear `loading.tsx` + `error.tsx` por área.
4. **Group D — Error & 403 Pages**:
   * Crear `src/app/not-found.tsx` global.
   * Crear `(public)/403/page.tsx`.
5. **Group E — SEO Artifacts**:
   * Crear `src/app/robots.ts` con tests unit.
   * Crear `src/app/sitemap.ts` con tests unit.
   * Decidir y configurar `<baseUrl>` (env).
6. **Group F — Root Layout Update**:
   * Envolver `<NextIntlClientProvider>` con `<SessionProvider>` en `src/app/layout.tsx`.
7. **Group G — i18n Catalogs**:
   * Agregar claves nuevas a `errors.json` y `navigation.json` en los 4 locales.
8. **Group H — E2E Tests**:
   * `routing.public.spec.ts`.
   * `routing.app-guard.spec.ts`.
   * `routing.role-guard.spec.ts`.
   * `routing.auth-redirect.spec.ts`.
   * `routing.not-found.spec.ts`.
   * `seo.robots-sitemap.spec.ts`.
9. **Group I — Documentation**:
   * `web/README.md` § "Routing".
   * Notas sobre cookie `eventflow_role` (alineación Doc 19).

### Required QA Tasks

* Tests unit de `roleGuardMiddleware` cubriendo las 13 reglas (TS-02).
* Tests unit de whitelist y EC-01..EC-03 (TS-03, NT-01..NT-03).
* Tests unit de `robots.ts` y `sitemap.ts` (TS-06..TS-07).
* Tests component de placeholders y layouts esqueleto (TS-04..TS-05).
* 6 E2E specs Playwright (TS-08..TS-13).
* Tests A11Y estructurales (A11Y-TS-01..03).

### Required Security Tasks

* Code review checklist SEC-01..SEC-07.
* Verificar que no haya tokens en localStorage.
* Verificar que el middleware no decodifique JWT.
* Verificar logs sin valor completo de cookies.
* Documentar SEC requirement de `from=` para US-AUTH-*.

### Required Seed / Demo Tasks

Ninguna.

### Required Documentation Tasks

* `web/README.md` § "Routing" con tabla de 13 reglas.
* Housekeeping post-merge: registrar `Documentation Alignment Required` para Doc 19 (cookie `eventflow_role`), Doc 15 §15 (ubicación middleware), decisión "admin puede entrar a `(app)`".

### Dependencies between tasks

* Group A bloquea Group B (la composición necesita el módulo).
* Group A + Group B bloquean Group H (tests E2E necesitan el middleware).
* Group F depende de Group A (necesita `<SessionProvider>`).
* Group C depende de US-103/US-104 mergeados.
* Group G es ortogonal pero debe estar listo antes de Group H (tests E2E asertan copy i18n).
* Group E es independiente; puede correr en paralelo con A/B/C.

### Consolidated `tasks.md`

PB-P0-012 cierra con US-105. Recomendable consolidar `management/development-tasks/P0/PB-P0-012/tasks.md` cuando las tres historias (US-103, US-104, US-105) hayan generado sus development tasks individuales, para tener una vista unificada del item de backlog.

---

## 20. Technical Spec Readiness

| Check                                                                       | Status |
| --------------------------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec                   | Pass — Status `Ready for Approval` con todas las decisiones cerradas en `PO/BA Decisions Applied` |
| Product Backlog mapping found                                              | Pass — PB-P0-012 encontrado |
| Decision Resolution reviewed if present                                    | N/A — no existe artefacto separado; decisiones formalizadas en la historia |
| Scope clear                                                                | Pass |
| Architecture alignment clear                                               | Pass |
| API impact clear                                                           | N/A — no introduce endpoints |
| DB impact clear                                                            | N/A — sin impacto DB |
| AI impact clear                                                            | N/A |
| Security impact clear                                                      | Pass — SEC-01..SEC-07 documentados |
| Testing strategy clear                                                     | Pass — 14 tests funcionales + 9 negativos + 6 auth + 3 A11Y |
| Ready for Development Task Breakdown                                       | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

US-105 está técnicamente lista para que la skill `eventflow-user-story-to-development-tasks` genere el plan de desarrollo. Las decisiones críticas están cerradas en `PO/BA Decisions Applied` de la historia (4 route groups, middleware UX-only componible, cookie auxiliar `eventflow_role`, 13 reglas de redirección, SEO baseline, página `/403` pública), las dependencias estructurales (US-103 + US-104) ya están especificadas y la historia no tiene preguntas bloqueantes.

Los tres `Documentation Alignment Required` (cookie `eventflow_role` en Doc 19, ubicación `src/middleware.ts` en Doc 15 §15, decisión "admin puede entrar a `(app)`") son **post-merge housekeeping**, no bloqueantes — están en línea con ADR-FE-003/015 y la arquitectura UX-only. El contrato con US-108 (emisión de ambas cookies) está claramente especificado y los tests E2E simulan ambas cookies con Playwright, por lo que US-105 puede mergearse antes de US-108 sin bloqueo.

Riesgo controlado: el alcance es esqueleto + middleware + SEO; las páginas placeholder no introducen complejidad de dominio. La cobertura de tests (14 unit/component + 6 E2E + 9 negativos + 6 auth + 3 A11Y) y la trazabilidad explícita a Doc 5/15/19/22 + ADR-FE-001/003/015 dan confianza para proceder con la generación de development tasks.
