# 🧾 User Story: Definir route groups del App Router por rol `(public)`/`(auth)`/`(app)`/`(admin)` con middleware UX de sesión + role guard, layouts esqueleto y artefactos SEO base (`robots.ts`, `sitemap.ts`, `not-found.tsx`)

## 🆔 Metadata

| Field                       | Value                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------- |
| ID                          | US-105                                                                                 |
| Epic                        | EPIC-FE-001 — Frontend Next.js Application Foundation                                  |
| Backlog Item                | PB-P0-012 — Frontend Next.js Bootstrap & i18n                                          |
| Feature                     | Route groups por rol — `(public)`/`(auth)`/`(app)`/`(admin)` + middleware UX guard      |
| Module / Domain             | Platform / FE                                                                          |
| User Role                   | System                                                                                 |
| Priority                    | Must Have (P0)                                                                         |
| Status                      | Ready for Approval                                                                     |
| Owner                       | Tech Lead / Frontend Lead                                                              |
| Sprint / Milestone          | MVP                                                                                    |
| Created Date                | 2026-06-09                                                                             |
| Last Updated                | 2026-06-19 (PO/BA refinement)                                                          |

---

## 🎯 User Story

**As the** sistema EventFlow
**I want** crear los 4 route groups del App Router (`(public)`, `(auth)`, `(app)`, `(admin)`) en `web/src/app/`, montar layouts esqueleto por área, extender `middleware.ts` (creado en US-104 para locale) con un `roleGuardMiddleware` UX que redirija las rutas privadas según cookie de sesión y rol, agregar `not-found.tsx` global, `loading.tsx`/`error.tsx` por route group, `robots.ts` (Allow `(public)`, Disallow `(app)`/`(admin)`) y `sitemap.ts` placeholder
**So that** las historias siguientes (US-106 TanStack Query + MSW, US-107 layouts y navegación, US-AUTH-*, todas las historias de feature por rol) tengan un esqueleto de routing por rol estable, con guardas UX (no de seguridad — la autorización real vive en el backend, ADR-FE-003/015), SEO baseline correcto (`Disallow` de áreas privadas, Doc 15 §14.2) y separación de layouts independientes por área (Doc 15 §18).

---

## 🧠 Business Context

### Context Summary

US-103 dejó el proyecto Next.js + TypeScript con `src/app/` mínimo (solo `layout.tsx` y `page.tsx` smoke). US-104 montó el `<IntlProvider>` global y creó `middleware.ts` con `localeMiddleware`. Esta historia entrega el **esqueleto de routing por rol** que enmarca toda la navegación frontend del MVP:

* **`(public)`** — landing, directorio de vendors, perfil público de vendor (SEO, Server Components, indexable).
* **`(auth)`** — login, register, forgot-password (sin sesión requerida; Client Components con RHF + Zod).
* **`(app)`** — workspaces autenticados `organizer/` y `vendor/` (sesión requerida; Client Components con TanStack Query).
* **`(admin)`** — panel admin (sesión + rol `admin` requeridos; Client Components con TanStack Query).

US-105 entrega los grupos con **páginas placeholder mínimas** (suficientes para validar la estructura, redirecciones del middleware, SEO baseline y tests E2E), extiende el `middleware.ts` con un `roleGuardMiddleware` componible con `localeMiddleware`, y agrega los artefactos SEO base (`robots.ts`, `sitemap.ts` placeholder, `not-found.tsx`).

La **autorización efectiva** sigue siendo responsabilidad del backend (ADR-FE-003/015): el middleware UX solo redirige por **presencia** de cookie de sesión y **lectura** de un claim de rol no firmado; el backend valida cada request en su propio middleware y nunca confía en el frontend.

Sin US-105, ni US-107 (layouts por rol) ni US-AUTH-* (login/register) ni las historias de feature por rol pueden ubicar sus rutas: no existe el esqueleto bajo el cual cuelgan.

### Related Domain Concepts

* **App Router route groups** (Doc 15 §11/§18): `(public)`, `(auth)`, `(app)`, `(admin)` con layouts y middleware diferenciados.
* **Roles MVP** (Doc 5 §5): `organizer`, `vendor`, `admin`. Tres roles activos, sin multi-rol simultáneo, sin colaborativos.
* **Backend autoritativo** (ADR-FE-003, ADR-FE-015, Doc 15 §21.4): el middleware frontend es **UX guard** — verifica presencia de cookie de sesión y un claim de rol no firmado; el backend valida en cada request.
* **Cookie de sesión** (Doc 15 §21.1, Doc 19): HTTP-only `Secure` `SameSite=Lax` emitida por el backend en US-108. US-105 solo lee su **presencia** en middleware (no decodifica payload).
* **SEO baseline** (Doc 15 §14.2): `Disallow` para `(app)` y `(admin)`; `sitemap.ts` con vendors públicos (placeholder en US-105, lleno con datos reales en historias de vendor public).

### PO/BA Decisions Applied

| Decision                                                | Resolution                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope de US-105                                          | US-105 entrega exclusivamente: (a) los 4 route groups (`(public)`, `(auth)`, `(app)`, `(admin)`) con páginas placeholder y layouts esqueleto; (b) `middleware.ts` extendido con `roleGuardMiddleware` componible con `localeMiddleware` (US-104); (c) `not-found.tsx` global; (d) `loading.tsx`/`error.tsx` por route group; (e) `robots.ts` + `sitemap.ts` placeholder; (f) tests E2E de redirección por rol y de SEO. |
| Boundary con US-103/US-104/US-106/US-107/US-108/US-AUTH-* | US-103 (bootstrap) y US-104 (i18n + locale middleware) ya mergeadas. **Login real, register, logout, forgot-password** → **US-AUTH-***. **Cookie HTTP-only de sesión emitida por backend** → **US-108**. **`SessionContext` con hidratación vía `GET /me` y `<QueryClientProvider>`/MSW** → **US-106** (US-105 monta el `<SessionProvider>` esqueleto sin hidratación real, con un valor por defecto `{ isAuthenticated: false, role: null }` para que las layouts puedan consumirlo). **Layouts completos con sidebars/navegación por rol** → **US-107**. |
| 4 route groups exactos                                   | `(public)`, `(auth)`, `(app)`, `(admin)` (Doc 15 §15/§18). Los subgrupos `(app)/organizer/` y `(app)/vendor/` quedan **estructuralmente declarados** (carpetas + `layout.tsx` esqueleto + `page.tsx` placeholder), pero no implementan UX completa de dashboard (eso es US-107 + historias de feature).                                                |
| Páginas placeholder mínimas                              | Cada grupo entrega solo lo necesario para validar redirecciones y SEO: `(public)/page.tsx` landing mínimo, `(public)/vendors/page.tsx` placeholder, `(auth)/login/page.tsx` placeholder, `(app)/organizer/page.tsx` y `(app)/vendor/page.tsx` placeholders, `(admin)/page.tsx` placeholder. Todos los textos vía `t('clave')` (US-104).                  |
| Middleware UX, no de seguridad                            | El middleware solo redirige por **presencia** de cookie de sesión y por un **claim de rol no firmado** leído desde una cookie no HTTP-only auxiliar `eventflow_role` (o desde el JWT/session token si el backend lo expone como decodificable sin validar — ver `Decisión cookie de rol`). El backend (US-094..097, US-112) sigue siendo la única fuente de autorización. |
| Decisión cookie de rol                                   | Adoptado: **cookie auxiliar `eventflow_role`** emitida por el backend en login, **no HTTP-only**, `SameSite=Lax`, `Secure` en prod, sin firma criptográfica, valor entre `organizer`/`vendor`/`admin`. Justificación: la cookie de sesión HTTP-only no puede ser leída en cliente ni en middleware sin librería específica; un claim de rol UX no firmado es suficiente porque el backend siempre vuelve a autorizar. **Implicación**: el backend en US-108 debe emitir ambas cookies; queda registrado como dependencia explícita y como `Documentation Alignment Required` con Doc 19 (que hoy no menciona esta cookie auxiliar). |
| Redirecciones esperadas                                   | `(app)/*` sin cookie de sesión → `redirect('/login?from=<path>')`. `(app)/*` con sesión pero rol `admin` accediendo a `(app)/organizer/*` o `(app)/vendor/*` → permitido (admin puede ver workspaces — pero **MVP**: admin tiene workspace dedicado en `(admin)`, no se promueve verlo en `(app)`; documentar como decisión UX). `(admin)/*` sin sesión → `/login?from=<path>`. `(admin)/*` con sesión pero rol ≠ `admin` → `/403` (página esqueleto en `(app)/403` o `(public)/403`). `(public)/*` y `(auth)/*` → sin guard. |
| Decisión "admin entra a (app)"                            | **MVP**: el middleware **no bloquea** a un admin de entrar a `(app)` por simplicidad; pero la navegación visual (US-107) no le ofrece links a `(app)/organizer` ni `(app)/vendor`. Si un admin escribe la URL manualmente y la sesión es válida, ve la página placeholder. La autorización real de datos sigue siendo backend.                                |
| Rutas `(auth)` con sesión activa                          | Login/Register **redirigen al dashboard del rol** si el usuario ya tiene sesión: `organizer` → `/organizer`, `vendor` → `/vendor`, `admin` → `/admin`. Esta UX se implementa con un check en el `(auth)/layout.tsx` o como redirect del middleware; preferido middleware para consistencia. |
| `not-found.tsx` y errores                                | `not-found.tsx` global en `src/app/not-found.tsx` con copy i18n (`errors.notFound.title`, `errors.notFound.cta`). Cada route group entrega `loading.tsx` mínimo (skeleton placeholder) y `error.tsx` mínimo (error boundary con retry button + traducción `errors.envelope.UNEXPECTED`). |
| Página 403                                                 | Página esqueleto `(public)/403/page.tsx` (accesible sin sesión para no crear un loop con el middleware). Traducción `errors.forbidden.title` + CTA "Volver al inicio". |
| `robots.ts`                                                | `Allow: /`; `Disallow: /login, /register, /forgot-password, /organizer, /vendor, /admin, /403`. `Sitemap: <baseUrl>/sitemap.xml`. Alineado a Doc 15 §14.2.                                                                                                                                                                                              |
| `sitemap.ts`                                               | Placeholder MVP: devuelve solo `/` (landing) y `/vendors` (directorio). El llenado con vendors públicos reales vive en la historia de vendor public profile (consume `GET /vendors/public/sitemap`).                                                                                                                                                   |
| Composición del middleware                                | Single `middleware.ts` en `src/middleware.ts` (no hay un `src/app/middleware.ts` en App Router — la convención Next.js es project-root). Función compuesta: `localeMiddleware → roleGuardMiddleware → NextResponse`. `matcher` excluye `/_next/*`, `/static/*`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `/api/*`. |
| Path planning y URLs en español                            | Los segmentos de URL siguen patrones **estables en inglés** (`/organizer`, `/vendor`, `/admin`, `/vendors`, `/login`) — convención de Doc 15 §15. No se traducen las URLs por locale (sin prefijo URL — alineado a Doc 15 §17 y a US-104). i18n solo opera sobre copy mostrado, no sobre paths.                                                            |
| Server vs Client Components por área                       | Layouts y páginas placeholder de `(public)` y `(public)/vendors` son **Server Components** (Doc 15 §11). Layouts y páginas de `(auth)`, `(app)`, `(admin)` quedan listas para Client Components, pero en US-105 las páginas placeholder pueden ser Server por simplicidad (no requieren interactividad). El cambio a Client por defecto vive en US-106/US-107. |
| Tests E2E                                                  | Playwright cubre: (a) anonymous puede ver `/`, `/vendors`, `/login`; (b) anonymous redirigido de `/organizer`, `/vendor`, `/admin` a `/login?from=<path>`; (c) con cookies `eventflow_session=<any>` + `eventflow_role=organizer` accede a `/organizer` y es redirigido de `/admin` a `/403`; (d) `robots.txt` y `sitemap.xml` válidos; (e) `not-found.tsx` se renderiza para ruta inexistente. |
| Backend authorization invariant                            | US-105 NO agrega ninguna lógica de autorización efectiva. Solo redirige UX. Cualquier acceso real a datos (cuando aparezcan los clients API en US-106+) seguirá validándose en backend. SEC-01 explícito.                                                                                                                                              |

### Assumptions

* US-103 (bootstrap) y US-104 (i18n + `localeMiddleware`) están **mergeadas** y operativas.
* US-108 entregará la cookie de sesión HTTP-only y la cookie auxiliar `eventflow_role` por el backend. **Mientras US-108 no esté mergeada**, US-105 funciona perfectamente para anonymous (todas las redirecciones de `(app)`/`(admin)` van a `/login`) y los tests E2E de "con sesión" usan cookies de prueba seteadas por Playwright (`browser.context().addCookies(...)`).
* Backend (US-094..097, US-112) sigue siendo la única fuente de autorización; el frontend nunca toma decisiones de datos basándose en el claim de rol UX.
* No se asume aún que existan endpoints públicos de vendor (eso vive en historias `(public)/vendors/[slug]`); el sitemap es placeholder.

### Dependencies

* `US-103 — Bootstrap Next.js` (mergeada).
* `US-104 — i18n + localeMiddleware` (mergeada). US-105 extiende su `middleware.ts`.
* `Doc 15 — Frontend Architecture Design` §11, §14, §15, §17, §18, §19, §20, §21.
* `Doc 5 — User Roles & Permissions Matrix` §5 (3 roles MVP).
* `Doc 19 — Security & Authorization Design` §respecto a cookie de sesión.
* `Doc 22 — ADRs` ADR-FE-001, ADR-FE-003, ADR-FE-015 (middleware UX-only).
* **Sin** dependencia técnica bloqueante con US-108 (la cookie real llega después; US-105 funciona con cookies de test mientras tanto).

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — habilita el routing por rol que servirá FR-AUTH-001..006 (login/logout/redirect), FR-USER-* (perfil propio), FR-EVENT-* (workspaces organizer), FR-VENDOR-* (workspaces vendor y públicos), FR-ADMIN-* (panel admin); no implementa directamente ninguno |
| Use Case(s)            | UC-AUTH-001 (login redirige al dashboard del rol — cobertura UX del middleware), UC-AUTH-002 (logout), UC-ADMIN-001 (acceso a panel admin)                                                                                       |
| Business Rule(s)       | BR-AUTH-010 (organizers/vendors no acceden al panel admin — cubierto por redirect `(admin)` → `/403` cuando rol ≠ admin), BR-AUTH-011 (frontend es UX-only)                                                                       |
| Permission Rule(s)     | Doc 5 §5 (3 roles MVP); ADR-FE-003 (frontend authorization es UX, no fuente de verdad)                                                                                                                                            |
| Data Entity / Entities | No aplica DB. Lee cookies cliente: `eventflow_session` (presencia), `eventflow_role` (valor UX no firmado) — emitidas por backend en US-108                                                                                       |
| API Endpoint(s)        | No introduce. Documenta que el frontend consumirá `POST /auth/login`, `POST /auth/logout`, `GET /me` cuando US-AUTH-* y US-106 lleguen                                                                                            |
| NFR Reference(s)       | NFR-A11Y-* (placeholder pages cumplen WCAG 2.1 AA mínimos: focus, contraste, lang attr heredado de US-104), NFR-OBS-001 (middleware loguea redirects en dev), NFR-SEC-001..* (frontend UX-only respeta backend authority)         |
| Related ADR(s)         | ADR-ARCH-001, ADR-FE-001, ADR-FE-003 (frontend UX-only), ADR-FE-015 (middleware solo guardas UX; backend valida), ADR-FE-004 (preparación SEO vendor — `robots.ts` cumple baseline)                                              |
| Related Document(s)    | `/docs/5-User-Roles-Permissions-Matrix.md` §5, `/docs/15-Frontend-Architecture-Design.md` §11/§14/§15/§17/§18/§19/§20/§21, `/docs/19-Security-and-Authorization-Design.md`, `/docs/20-Testing-Strategy.md`, `/docs/22-Architecture-Decision-Records.md` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: **In Scope**
* MVP Relevance: **Must Have (P0)**
* Delivery Type: **Technical foundation + UX scaffolding**
* Scope Boundary: **4 route groups con páginas placeholder + `roleGuardMiddleware` UX componible con `localeMiddleware` + `not-found.tsx` global + `loading.tsx`/`error.tsx` por área + `robots.ts` + `sitemap.ts` placeholder + página `/403` + tests E2E de redirección y SEO**

### Explicitly Out of Scope

* **Login/Register/Forgot-password/Logout funcionales** (formularios + submit a backend) → **US-AUTH-***. US-105 entrega solo placeholders en `(auth)/login`, `(auth)/register`, `(auth)/forgot-password`.
* **Cookie HTTP-only de sesión emitida por backend + cookie `eventflow_role`** → **US-108**. US-105 solo las **lee** en middleware; los tests E2E las simulan.
* **`<QueryClientProvider>` y MSW handlers** → **US-106**.
* **Hidratación de `SessionContext` vía `GET /me`** → **US-106** (US-105 monta solo un `<SessionProvider>` esqueleto con valor por defecto).
* **Layouts completos con sidebars y navegación por rol** (`OrganizerLayout`, `VendorLayout`, `AdminLayout`) → **US-107**. US-105 entrega `layout.tsx` esqueleto mínimo (solo `<main>{children}</main>` + `<html lang>`).
* **Features de dominio** (dashboard organizer real, vendor profile real, admin moderation real) → historias por feature.
* **Perfiles públicos de vendor con ISR + `generateMetadata`** → historia vendor public profile. US-105 solo declara la ruta `/vendors/[vendorSlug]/page.tsx` como placeholder estructural si se justifica (preferido: NO crearla en US-105; vive completa en su historia owner).
* **`sitemap.ts` lleno con vendors reales** → historia vendor public sitemap.
* **JSON-LD, Open Graph completos, `generateMetadata` por página** → historias de SEO específicas.
* **Server Actions, API Routes BFF** → prohibidos (Doc 15 §6, ADR-FE-002/003).
* **Impersonación admin, multi-rol simultáneo, roles colaborativos** → Future (Doc 5 §6).

### Scope Notes

* Los segmentos URL son **estables en inglés** (`/organizer`, `/vendor`, `/admin`, `/vendors`, `/login`); copy mostrado se traduce vía i18n.
* `middleware.ts` único: `localeMiddleware` (US-104) + `roleGuardMiddleware` (US-105) en módulos componibles, no en archivos separados.
* El middleware NO decodifica JWT ni valida firma. Solo lee presencia de cookie y valor del claim de rol UX.
* Placeholder pages usan `t('clave')` (US-104); estrictamente prohibido hardcoded.
* Layouts esqueleto NO incluyen sidebars, navegación o `SessionContext` hidratado real — eso es US-107.
* La página `/403` es accesible sin sesión (vive en `(public)/403/page.tsx`) para evitar loops del middleware.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: 4 route groups creados con páginas placeholder y layouts esqueleto

**Given** US-103 y US-104 mergeadas
**When** se inspecciona `web/src/app/`
**Then** existe la estructura:

```text
src/app/
├── layout.tsx                        # RootLayout (de US-104; sin cambios estructurales en US-105)
├── page.tsx                          # Redirect a /  (landing del grupo (public))  o página default
├── not-found.tsx                     # 404 global con copy i18n
├── robots.ts                         # SEO baseline
├── sitemap.ts                        # Placeholder (/, /vendors)
├── (public)/
│   ├── layout.tsx                    # Server Component esqueleto: <main>{children}</main>
│   ├── page.tsx                      # Landing mínima ("EventFlow" + locale switcher heredado)
│   ├── loading.tsx                   # Skeleton mínimo
│   ├── error.tsx                     # Error boundary con retry
│   ├── 403/page.tsx                  # Página de "Acceso denegado" (i18n)
│   └── vendors/page.tsx              # Placeholder "Directorio (próximamente)"
├── (auth)/
│   ├── layout.tsx                    # Esqueleto: <div className="auth-card">{children}</div>
│   ├── loading.tsx
│   ├── error.tsx
│   ├── login/page.tsx                # Placeholder "Login (próximamente)"
│   ├── register/page.tsx             # Placeholder "Register (próximamente)"
│   └── forgot-password/page.tsx      # Placeholder
├── (app)/
│   ├── layout.tsx                    # Esqueleto: <main>{children}</main>
│   ├── loading.tsx
│   ├── error.tsx
│   ├── organizer/
│   │   ├── layout.tsx                # Esqueleto: <section>{children}</section>
│   │   └── page.tsx                  # Placeholder "Organizer Dashboard (próximamente)"
│   └── vendor/
│       ├── layout.tsx                # Esqueleto: <section>{children}</section>
│       └── page.tsx                  # Placeholder "Vendor Dashboard (próximamente)"
└── (admin)/
    ├── layout.tsx                    # Esqueleto: <section>{children}</section>
    ├── loading.tsx
    ├── error.tsx
    └── page.tsx                      # Placeholder "Admin Panel (próximamente)"
```

**And** todos los placeholders renderizan texto vía `t('clave')` (sin hardcoded strings, AC-10 de US-104)
**And** los layouts esqueleto **no** incluyen sidebars ni navegación real (eso es US-107).

---

### AC-02: `middleware.ts` extendido con `roleGuardMiddleware` componible

**Given** `src/middleware.ts` existente de US-104 con `localeMiddleware`
**When** se inspecciona el archivo
**Then** el middleware se compone como `localeMiddleware → roleGuardMiddleware → NextResponse`
**And** `roleGuardMiddleware`:

1. Lee `eventflow_session` (presencia, no decodifica).
2. Lee `eventflow_role` ∈ `{organizer, vendor, admin}` (whitelist; valor inválido se trata como sin rol).
3. Reglas:

| Ruta solicitada                          | Estado del usuario                      | Acción del middleware                                     |
| ---------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| `/`, `/vendors`, `/vendors/*`, `/403`    | cualquiera                              | Pass-through                                              |
| `/login`, `/register`, `/forgot-password` | sin sesión                              | Pass-through                                              |
| `/login`, `/register`, `/forgot-password` | con sesión `organizer`                   | `redirect('/organizer')`                                  |
| `/login`, `/register`, `/forgot-password` | con sesión `vendor`                      | `redirect('/vendor')`                                     |
| `/login`, `/register`, `/forgot-password` | con sesión `admin`                       | `redirect('/admin')`                                      |
| `/organizer`, `/organizer/*`             | sin sesión                              | `redirect('/login?from=<path>')`                          |
| `/organizer`, `/organizer/*`             | con sesión (cualquier rol)               | Pass-through                                              |
| `/vendor`, `/vendor/*`                   | sin sesión                              | `redirect('/login?from=<path>')`                          |
| `/vendor`, `/vendor/*`                   | con sesión (cualquier rol)               | Pass-through                                              |
| `/admin`, `/admin/*`                     | sin sesión                              | `redirect('/login?from=<path>')`                          |
| `/admin`, `/admin/*`                     | con sesión, rol ≠ `admin`                | `redirect('/403')`                                        |
| `/admin`, `/admin/*`                     | con sesión, rol `admin`                  | Pass-through                                              |

**And** `matcher` excluye `/_next/*`, `/static/*`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/api/*` (no hay APIs aún, igual reservado).
**And** las funciones `localeMiddleware` y `roleGuardMiddleware` son **componibles** y **separadas** (no monolito), exportadas para tests unit.

---

### AC-03: `not-found.tsx` global, `loading.tsx`/`error.tsx` por área

**Given** el routing creado
**When** un usuario accede a una ruta inexistente (ej. `/asdfasdf`)
**Then** se renderiza `app/not-found.tsx` con copy i18n (`errors.notFound.title`, `errors.notFound.body`, CTA `errors.notFound.cta` → `/`)
**And** cada route group tiene `loading.tsx` con skeleton mínimo y `error.tsx` con error boundary + retry button (`errors.envelope.UNEXPECTED` + `common.retry`).

---

### AC-04: `robots.ts` y `sitemap.ts` operativos

**Given** la app construida con `npm run build && npm run start`
**When** se accede a `http://localhost:3000/robots.txt`
**Then** el contenido incluye:

```text
User-agent: *
Allow: /
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /organizer
Disallow: /vendor
Disallow: /admin
Disallow: /403
Sitemap: <baseUrl>/sitemap.xml
```

**And** `http://localhost:3000/sitemap.xml` devuelve XML válido con al menos `<url><loc>{baseUrl}/</loc></url>` y `<url><loc>{baseUrl}/vendors</loc></url>` (placeholder MVP)
**And** `<baseUrl>` proviene de `NEXT_PUBLIC_API_BASE_URL` o de una env nueva `NEXT_PUBLIC_SITE_URL` (declarar en `.env.local.example`, decisión final en PR).

---

### AC-05: Anonymous puede acceder a `(public)` y `(auth)`

**Given** un usuario sin cookies de sesión
**When** navega a `/`, `/vendors`, `/login`, `/register`, `/forgot-password`, `/403`, `/anything-not-found`
**Then** todas responden 200 (excepto la inexistente que devuelve 404 con `not-found.tsx`)
**And** ninguna lo redirige a `/login`.

---

### AC-06: Anonymous es redirigido de `(app)` y `(admin)` a `/login?from=...`

**Given** un usuario sin cookies de sesión
**When** navega a `/organizer`, `/organizer/events`, `/vendor`, `/vendor/profile`, `/admin`, `/admin/vendors`
**Then** el middleware redirige a `/login?from=<encoded-path>`
**And** la cookie `eventflow_session` continúa ausente.

---

### AC-07: Usuario con sesión y rol incorrecto es redirigido de `(admin)` a `/403`

**Given** un usuario con cookies `eventflow_session=test` y `eventflow_role=organizer`
**When** navega a `/admin` o `/admin/vendors`
**Then** el middleware redirige a `/403`
**And** la página `/403` renderiza con copy i18n (`errors.forbidden.title`, `errors.forbidden.cta`).

---

### AC-08: Usuario con sesión correcta accede a su workspace

**Given** un usuario con cookies `eventflow_session=test` y `eventflow_role=organizer`
**When** navega a `/organizer` o `/organizer/cualquier-cosa`
**Then** la respuesta es 200 y renderiza la página placeholder
**And** intentar `/login` lo redirige a `/organizer`
**And** la misma lógica aplica para `eventflow_role=vendor` → `/vendor` y `eventflow_role=admin` → `/admin`.

---

### AC-09: Pipeline canónico verde y sin artefactos fuera de scope

**Given** el PR de US-105
**When** corren `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`
**Then** todos los comandos terminan con exit 0
**And** el PR NO contiene: formularios de login/register/forgot-password funcionales, llamada a `POST /auth/login`, `POST /auth/logout`, `GET /me`, hidratación real de `SessionContext`, sidebars/navegación por rol, `<QueryClientProvider>`, MSW handlers, features de dominio (event wizard, vendor profile real, admin moderation real), `sitemap.ts` con vendors reales, `generateMetadata` por página, JSON-LD, Server Actions, API Routes BFF.

---

### AC-10: Tests E2E Playwright cubren redirecciones y SEO

**Given** Playwright configurado (heredado de US-103)
**When** se ejecuta `npm run test:e2e`
**Then** pasan al menos:

* `tests/e2e/routing.public.spec.ts`: anonymous puede ver `/`, `/vendors`, `/login`, `/register`, `/forgot-password`, `/403`.
* `tests/e2e/routing.app-guard.spec.ts`: anonymous redirigido de `/organizer`, `/vendor`, `/admin` a `/login?from=<encoded>`.
* `tests/e2e/routing.role-guard.spec.ts`: con `eventflow_role=organizer`, `/admin` → `/403`; con `eventflow_role=admin`, `/admin` accesible.
* `tests/e2e/routing.auth-redirect.spec.ts`: con sesión, `/login` redirige al dashboard del rol.
* `tests/e2e/routing.not-found.spec.ts`: `/inexistente` muestra `not-found.tsx`.
* `tests/e2e/seo.robots-sitemap.spec.ts`: `robots.txt` contiene `Disallow` esperados; `sitemap.xml` válido.

---

## ⚠️ Edge Cases

### EC-01: Cookie `eventflow_role` con valor adulterado

**Given** un usuario con `eventflow_session=test` y `eventflow_role=superadmin` (no soportado)
**When** navega a `/admin`
**Then** el middleware descarta `eventflow_role` (no está en whitelist `{organizer, vendor, admin}`) y trata al usuario como **sesión sin rol** → redirige a `/403`.

#### Handling

* Whitelist estricta en el middleware.
* `/403` con CTA "Volver al inicio" para recuperar UX.
* Backend ignora completamente este valor: cualquier request a `/api/v1/admin/*` lo rechaza con 403 si el JWT/session real no tiene rol admin.

---

### EC-02: Cookie de sesión presente pero rol ausente

**Given** un usuario con `eventflow_session=test` pero sin `eventflow_role`
**When** navega a `/organizer`, `/vendor`, `/admin`
**Then** el middleware: para `/admin` redirige a `/403`. Para `/organizer` y `/vendor` permite pass-through (el backend valida en cada request; la UX no rompe).

#### Handling

* Documentado en `web/README.md`: si la cookie de rol se pierde por bug, el usuario puede acceder a `/organizer`/`/vendor` pero el backend rechazará cualquier endpoint que no le corresponda.
* Action item para US-108: emitir siempre ambas cookies en login y limpiar ambas en logout.

---

### EC-03: Loop de redirect entre `/login` y dashboard

**Given** un bug que setea `eventflow_session` y `eventflow_role=organizer` pero el backend rechaza con 401 al validar
**When** el frontend (en US-106+) detecta 401 y limpia las cookies
**Then** el middleware del próximo request ve cookies ausentes y deja al usuario en `/login` (no loop).

#### Handling

* US-105 no implementa el manejo 401 (eso es US-106 cuando el `httpClient` exista). Documentado como expectativa.
* `/login?from=...` no es seguido recursivamente (el middleware excluye `/login` del guard).

---

### EC-04: `from` en `/login?from=...` con valor abierto a redirect

**Given** un atacante construye un link `/login?from=https://evil.example.com`
**When** el flujo de login (US-AUTH-*) lo redirige tras éxito
**Then** existe riesgo de open redirect.

#### Handling

* US-105 documenta que el formulario de login (US-AUTH-*) **debe validar** que `from` sea una ruta **interna** (regex `^/[a-zA-Z0-9_/\-?=&]*$`) antes de usarlo en `router.push`. US-105 no implementa el formulario; deja la nota como SEC requirement traceable.

---

### EC-05: SSR sin cookies (bot indexador)

**Given** un bot que crawlea `/` o `/vendors`
**When** el middleware corre sin cookies
**Then** el bot ve la página pública 200 OK (Server Component)
**And** si el bot intenta `/organizer`, recibe redirect 302 a `/login` (válido para crawler).

#### Handling

* `robots.ts` con `Disallow` para `(app)`/`(admin)` reduce este escenario (AC-04).

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                                                                | Message / Behavior                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| VR-01 | Los 4 route groups (`(public)`, `(auth)`, `(app)`, `(admin)`) existen con su `layout.tsx` esqueleto y al menos una `page.tsx` placeholder                            | Lint estructural / revisión PR falla                |
| VR-02 | Cualquier placeholder usa `t('clave')` (sin hardcoded strings, hereda VR-04 de US-104)                                                                              | ESLint falla → bloquea merge                        |
| VR-03 | `middleware.ts` compone `localeMiddleware` + `roleGuardMiddleware` con funciones separadas; ambas exportadas para tests unit                                          | Test unit / revisión PR falla                       |
| VR-04 | `roleGuardMiddleware` valida `eventflow_role` contra whitelist `{organizer, vendor, admin}`                                                                          | Test unit falla → bloquea merge                     |
| VR-05 | El PR NO contiene formularios de login/register/forgot-password funcionales ni llamadas a `/auth/*`, `/me`                                                            | Revisión PR falla (out of scope)                    |
| VR-06 | El PR NO contiene `<QueryClientProvider>`, MSW handlers, ni hidratación real de `SessionContext`                                                                      | Revisión PR falla (out of scope; US-106)            |
| VR-07 | El PR NO contiene sidebars/navegación completa por rol                                                                                                                | Revisión PR falla (out of scope; US-107)            |
| VR-08 | `robots.ts` declara `Disallow` para `/login`, `/register`, `/forgot-password`, `/organizer`, `/vendor`, `/admin`, `/403`                                              | Test E2E SEO falla → bloquea merge                  |
| VR-09 | `sitemap.ts` devuelve XML válido con al menos `/` y `/vendors`                                                                                                       | Test E2E SEO falla → bloquea merge                  |
| VR-10 | Pipeline canónico Doc 21 §9.2 verde + tests E2E de routing verdes                                                                                                    | CI falla → bloquea merge                            |
| VR-11 | Página `/403` accesible sin sesión (vive en `(public)/403/page.tsx`)                                                                                                  | Test E2E falla → bloquea merge                      |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | El middleware es **UX guard**, no security boundary (ADR-FE-003/015). Backend (US-094..097, US-112) es la única fuente de autorización.                            |
| SEC-02 | El middleware **no decodifica** JWT ni valida firma criptográfica. Solo lee presencia de cookie de sesión y valor del claim de rol UX.                              |
| SEC-03 | `eventflow_role` es cookie **no HTTP-only** (la lee el middleware Edge Runtime y el cliente), `SameSite=Lax`, `Secure` en prod, sin firma — es claim UX, no de autoridad. La cookie de sesión real (`eventflow_session` o equivalente) es HTTP-only y la emite US-108. |
| SEC-04 | El parámetro `from` en `/login?from=...` debe ser validado por el handler de login (US-AUTH-*) como ruta **interna** antes de `router.push` (EC-04).                |
| SEC-05 | `robots.ts` declara `Disallow` para todas las áreas privadas (Doc 15 §14.2). El "Disallow" es directiva, no enforcement; el backend sigue siendo autoritativo.       |
| SEC-06 | Sin Server Actions ni API Routes BFF (Doc 15 §6, ADR-FE-002/003).                                                                                                  |
| SEC-07 | Logs del middleware en dev no imprimen el valor completo de cookies (puede ser fingerprint); solo el rol resuelto y la acción tomada.                                |

### Negative Authorization Scenarios

* Anonymous accediendo a `/organizer/*`, `/vendor/*`, `/admin/*` → redirect a `/login?from=...`.
* Usuario con `eventflow_role=organizer` accediendo a `/admin/*` → redirect a `/403`.
* Usuario con `eventflow_role` adulterado (`superadmin`, `''`, valor random) → tratado como sin rol; `/admin` → `/403`.
* Cualquier intento de bypass del middleware (manipulación cliente, header injection) **no aporta acceso real**: el backend valida cada request independientemente (cobertura en US-112).

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

| Field                     | Value          |
| ------------------------- | -------------- |
| AI Feature                | None           |
| Provider Layer            | Not applicable |
| Human Validation Required | Not applicable |
| Persist AIRecommendation  | No             |
| Fallback Required         | Not applicable |

### Human-in-the-loop Rules

No aplica — esta historia no toca features IA. Los workspaces que en el futuro consumirán IA (organizer/event/ai) viven en route groups creados aquí, pero la UX IA específica vive en historias `feature/ai-assistance/*`.

---

## 🎨 UX / UI Notes

| UX Area              | Notes                                                                                                                                                                  |
| -------------------- | -----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Screens              | Placeholder pages en cada route group: landing mínima `(public)`, placeholders en `(auth)/login`, `(auth)/register`, `(auth)/forgot-password`, `(app)/organizer`, `(app)/vendor`, `(admin)`, `(public)/403` |
| Componentes          | Sin componentes nuevos propios (los layouts son esqueletos `<main>{children}</main>`); el `<LocaleSwitcher>` de US-104 sigue visible donde el layout lo monte (heredado) |
| Primary Action       | N/A en US-105 (placeholders)                                                                                                                                            |
| Secondary Actions    | N/A                                                                                                                                                                      |
| Loading State        | `loading.tsx` por route group con skeleton mínimo                                                                                                                        |
| Error State          | `error.tsx` por route group con retry button + traducción `errors.envelope.UNEXPECTED`                                                                                  |
| Empty State          | N/A                                                                                                                                                                      |
| Success State        | N/A                                                                                                                                                                      |
| Accessibility Notes  | Placeholders cumplen mínimos: `<main>` semántico, `<h1>` único por página, focus visible heredado, contraste no roto. Los componentes complejos llegan con US-107        |
| Responsive Notes     | Layouts esqueleto son mobile-first vacíos; el responsive completo vive en US-107                                                                                          |
| i18n Notes           | Todas las copy via `t('clave')` (US-104). Sin URLs traducidas (Doc 15 §17)                                                                                                |
| Currency Notes       | No aplica                                                                                                                                                                |

---

## 🛠 Technical Notes

### Frontend

| Topic                | Guidance                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route / Page         | 4 route groups con páginas placeholder; segmentos URL en inglés (`/organizer`, `/vendor`, `/admin`, `/vendors`, `/login`, etc.)                                  |
| Components           | Layouts esqueleto `<main>` / `<section>`; sin sidebars (eso es US-107); `<LocaleSwitcher>` heredado del `RootLayout` (US-104)                                    |
| State Management     | `<SessionProvider>` montado en `RootLayout` con valor por defecto `{ isAuthenticated: false, role: null }` — placeholder hasta US-106; hook `useSession()` opcional |
| Forms                | No aplica (sin formularios reales en US-105; placeholders no tienen submit)                                                                                       |
| API Client           | No aplica                                                                                                                                                          |
| Middleware           | `src/middleware.ts` único; funciones `localeMiddleware` (US-104) + `roleGuardMiddleware` (US-105) componibles y exportadas para tests unit                          |
| SEO                  | `robots.ts` con `Disallow` para áreas privadas; `sitemap.ts` placeholder; `generateMetadata` se aplica a placeholders solo con `title` mínimo (vendor profile real es Future) |
| Path alias           | `@/shared/i18n/...` y `@/shared/authorization/...` heredados de US-103/US-104                                                                                       |

---

### Backend

No aplica directamente. La autorización real vive en backend (US-094..097, US-112). US-108 entregará la cookie HTTP-only de sesión + cookie `eventflow_role`; US-105 deja la documentación de este contrato como dependencia explícita.

---

### Database

No aplica.

---

### API

| Method | Endpoint | Purpose                                                                                                                 |
| ------ | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| —      | —        | No introduce endpoints. Documentación: las historias siguientes consumirán `POST /auth/login`, `POST /auth/logout`, `GET /me`. |

---

### Observability / Audit

| Topic                             | Required                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correlation ID                    | No aplica directamente (no hay requests)                                                                                                                |
| Runtime logs                      | Middleware en dev loguea `routing.redirect { from, to, reason }` (sin valor de cookies completas) para debug. En prod silencioso                          |
| AdminAction                       | No aplica                                                                                                                                                |
| AIRecommendation runtime creation | No aplica                                                                                                                                                |
| CI logs                           | Lint + typecheck + test + build + test:e2e (heredado + nuevos tests routing)                                                                              |

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                                | Type        |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | `localeMiddleware` y `roleGuardMiddleware` exportados como funciones puras componibles                                  | Unit        |
| TS-02 | `roleGuardMiddleware` cubre las 13 reglas de la tabla AC-02                                                              | Unit        |
| TS-03 | `roleGuardMiddleware` con `eventflow_role` inválido lo descarta (whitelist)                                              | Unit        |
| TS-04 | `not-found.tsx` se renderiza para ruta inexistente con copy i18n                                                          | Component   |
| TS-05 | Layouts esqueleto de cada route group renderizan `{children}` correctamente                                              | Component   |
| TS-06 | `robots.ts` produce contenido con `Disallow` esperados (test unit sobre el módulo)                                       | Unit        |
| TS-07 | `sitemap.ts` produce XML válido con `/` y `/vendors`                                                                     | Unit        |
| TS-08 | E2E `routing.public.spec.ts`: anonymous accede a `(public)` y `(auth)`                                                  | E2E         |
| TS-09 | E2E `routing.app-guard.spec.ts`: anonymous redirigido de `(app)` y `(admin)` a `/login?from=...`                         | E2E         |
| TS-10 | E2E `routing.role-guard.spec.ts`: `eventflow_role=organizer` → `/admin` redirige a `/403`                                | E2E         |
| TS-11 | E2E `routing.auth-redirect.spec.ts`: con sesión, `/login` redirige al dashboard del rol                                  | E2E         |
| TS-12 | E2E `routing.not-found.spec.ts`: `/inexistente` muestra `not-found.tsx`                                                  | E2E         |
| TS-13 | E2E `seo.robots-sitemap.spec.ts`: `robots.txt` y `sitemap.xml` válidos                                                   | E2E         |
| TS-14 | Pipeline canónico Doc 21 §9.2 verde con tests nuevos                                                                    | CI          |

---

### Negative Tests

| ID    | Scenario                                                                                                                  | Expected Result                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| NT-01 | `eventflow_role=superadmin` (no whitelist)                                                                                 | Tratado como sin rol; `/admin` → `/403`                        |
| NT-02 | `eventflow_session` ausente accediendo a `/organizer/events/123`                                                          | Redirect a `/login?from=%2Forganizer%2Fevents%2F123`           |
| NT-03 | Loop intentado: con `eventflow_session=test` y `eventflow_role=admin`, navegar `/login`                                    | Redirect a `/admin` sin loop                                    |
| NT-04 | Open redirect: `/login?from=https://evil.example.com` (US-105 solo deja documentada la mitigación en EC-04; sin assertion E2E aquí) | Documentado para US-AUTH-*                                     |
| NT-05 | El PR introduce un formulario funcional de login con `POST /auth/login`                                                    | Revisión PR falla (VR-05)                                       |
| NT-06 | El PR introduce `<QueryClientProvider>` o handlers MSW                                                                     | Revisión PR falla (VR-06)                                       |
| NT-07 | El PR introduce sidebars y navegación completa por rol                                                                     | Revisión PR falla (VR-07)                                       |
| NT-08 | El PR omite `Disallow` en `robots.ts` para alguna ruta privada                                                              | Test E2E SEO falla (VR-08)                                      |
| NT-09 | Placeholder con string hardcoded en JSX                                                                                    | ESLint falla (VR-02, hereda VR de US-104)                       |

---

### AI Tests

No aplica para esta historia.

### Authorization Tests

| ID         | Scenario                                                                                  | Expected Result                                       |
| ---------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| AUTH-TS-01 | Anonymous → `/organizer`                                                                  | `redirect('/login?from=%2Forganizer')`                |
| AUTH-TS-02 | `eventflow_role=vendor` → `/organizer`                                                    | Pass-through (UX permissive; backend valida datos)    |
| AUTH-TS-03 | `eventflow_role=vendor` → `/admin`                                                        | `redirect('/403')`                                    |
| AUTH-TS-04 | `eventflow_role=admin` → `/admin`                                                         | Pass-through                                          |
| AUTH-TS-05 | `eventflow_session` presente sin `eventflow_role` → `/admin`                              | `redirect('/403')` (EC-02 cubierto)                   |
| AUTH-TS-06 | Cualquier sesión → `/login`                                                               | `redirect` al dashboard del rol                       |

---

### Accessibility Tests

| ID         | Scenario                                                          | Expected Result                                  |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| A11Y-TS-01 | Cada placeholder tiene `<h1>` único + landmarks `<main>`/`<section>` | Audit estructural (Testing Library) pasa       |
| A11Y-TS-02 | `<html lang>` dinámico heredado de US-104 funciona en cada page    | Test E2E + DOM assertion                         |
| A11Y-TS-03 | `not-found.tsx`, `error.tsx`, `/403` cumplen WCAG 2.1 AA mínimos (focus, contraste, lang) | Manual + axe-core opcional       |

---

## 📊 Business Impact

| Field               | Value                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Salud técnica frontend; tiempo a primera UX por rol; cumplimiento de ADR-FE-003/015 (frontend UX-only); SEO baseline para vendor public (Doc 15 §14.2)                  |
| Expected Impact     | Habilita US-107 (layouts completos), US-AUTH-* (login real), todas las historias frontend de feature por rol y la indexación SEO baseline; bloquea el resto del epic   |
| Success Criteria    | PR mergeado + pipeline CI verde + 6 tests E2E de routing + redirecciones correctas en las 13 reglas de AC-02 + `robots.txt`/`sitemap.xml` válidos                       |
| Academic Demo Value | Foundation visible: 4 áreas de la app demostrables sin features completas; evidencia de cumplimiento de ADR-FE-015 (middleware UX-only); SEO baseline auditable        |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Crear estructura de carpetas `src/app/(public|auth|app|admin)/` con `layout.tsx` esqueleto y `page.tsx` placeholders.
* Crear `src/app/not-found.tsx` global.
* Crear `(public)/403/page.tsx`, `(public)/loading.tsx`, `(public)/error.tsx`, y equivalentes por route group.
* Crear `src/app/robots.ts` y `src/app/sitemap.ts` placeholder.
* Extender `src/middleware.ts` con `roleGuardMiddleware` componible con `localeMiddleware` (US-104).
* Montar `<SessionProvider>` esqueleto en `RootLayout` con valor por defecto.
* Agregar claves i18n nuevas a catálogos transversales: `errors.notFound.*`, `errors.forbidden.*`, `errors.envelope.UNEXPECTED` (si no existen aún de US-104), `common.retry`, `navigation.placeholder.*`.

### Potential Backend Tasks

* **No bloqueante para US-105** (mocks de cookie en Playwright son suficientes). **Acción coordinada con US-108**: emitir cookie `eventflow_role` no HTTP-only en `POST /auth/login` y limpiarla en `POST /auth/logout`. Registrar este contrato como `Documentation Alignment Required` con Doc 19.

### Potential Database Tasks

Ninguna.

### Potential AI / PromptOps Tasks

Ninguna.

### Potential QA Tasks

* Tests unit de middleware (TS-01..TS-03, NT-01..NT-03).
* Tests component de placeholders y layouts (TS-04..TS-05).
* Tests E2E Playwright de las 6 secciones (TS-08..TS-13, AUTH-TS-01..06).
* Validar `robots.txt` y `sitemap.xml` (TS-06, TS-07, TS-13).

### Potential DevOps / Config Tasks

* Decidir `NEXT_PUBLIC_SITE_URL` vs usar `NEXT_PUBLIC_API_BASE_URL` para `<baseUrl>` del sitemap; agregar a `.env.local.example` si se introduce.
* Confirmar que `robots.txt` y `sitemap.xml` son alcanzables en local y en Amplify (no bloqueado por Amplify rewrites).

### Potential Documentation Tasks

* `web/README.md` § "Routing" con la tabla de las 13 reglas del middleware.
* Housekeeping post-merge: documentar la cookie `eventflow_role` en Doc 19 (alineación con backend).

---

## ✅ Definition of Ready

* [x] Rol claro: System.
* [x] Goal técnico claro: 4 route groups + middleware UX guard + SEO baseline + page placeholders.
* [x] Boundary formalizado con US-103/US-104/US-106/US-107/US-108/US-AUTH-*.
* [x] Decisiones cerradas (Doc 15 §11/§15/§18/§21, Doc 5 §5, Doc 19, ADR-FE-001/003/015): grupos, middleware UX, cookie de rol auxiliar, redirecciones, SEO baseline.
* [x] Acceptance Criteria testables y atómicos (AC-01..AC-10).
* [x] 13 reglas de redirección del middleware tabuladas explícitamente (AC-02).
* [x] Edge cases documentados (cookie adulterada, rol ausente, loop, open redirect, bot indexador).
* [x] Out of Scope explícito (login real, cookies backend, QueryClient/MSW, layouts completos).
* [x] Validation rules y SEC rules claros.
* [x] Tests definidos (TS-01..TS-14, NT-01..NT-09, AUTH-TS-01..06, A11Y-TS-01..03).
* [x] Trazabilidad a Doc 5/15/19/22 y ADRs FE-001/003/015.
* [ ] Tech Lead frontend validó.

---

## 🏁 Definition of Done

* [ ] Los 4 route groups (`(public)`, `(auth)`, `(app)`, `(admin)`) con layouts esqueleto y páginas placeholder versionados.
* [ ] `not-found.tsx` global + `loading.tsx`/`error.tsx` por route group + `/403` placeholder.
* [ ] `src/middleware.ts` con `localeMiddleware` (US-104) + `roleGuardMiddleware` (US-105) componibles, cubriendo las 13 reglas de AC-02.
* [ ] `<SessionProvider>` esqueleto montado en `RootLayout`.
* [ ] `robots.ts` con `Disallow` para áreas privadas; `sitemap.ts` placeholder (`/`, `/vendors`).
* [ ] Catálogos i18n actualizados con claves nuevas (`errors.notFound.*`, `errors.forbidden.*`, `common.retry`, etc.).
* [ ] Tests unit/component/E2E verdes (TS-01..TS-14, NT-01..NT-09, AUTH-TS-01..06).
* [ ] Pipeline canónico Doc 21 §9.2 verde.
* [ ] `web/README.md` § "Routing" actualizado con la tabla de las 13 reglas.
* [ ] PR revisado por Tech Lead frontend.

---

## 📝 Notes

* US-105 es el **esqueleto de routing**. Páginas placeholder son intencionalmente mínimas — los layouts completos son US-107 y las features reales viven en sus historias por dominio.
* La autorización real **no vive aquí**: backend (US-094..097, US-112) es la única fuente. El middleware es UX-only (ADR-FE-003/015).
* Los segmentos URL son **estables en inglés** (Doc 15 §17); i18n solo opera sobre copy mostrado.
* `eventflow_role` es una cookie **no HTTP-only** auxiliar emitida por backend; la cookie de sesión real es HTTP-only y la emite US-108.
* Open redirect del `from=` queda como SEC requirement traceable para US-AUTH-* (EC-04).

### Documentation Alignment Required (no bloqueante)

* **Doc 19 — cookie `eventflow_role`**: la cookie auxiliar no HTTP-only para el claim de rol UX no está documentada en Doc 19 (que define solo las cookies HTTP-only de sesión). La decisión está formalizada en este PO/BA Decisions Applied y es la única forma de implementar el middleware UX sin decodificar JWT. Acción: amender Doc 19 post-merge para listar `eventflow_role` como cookie auxiliar UX no firmada. No bloquea aprobación porque la decisión es coherente con ADR-FE-003/015 (frontend UX-only).
* **Doc 15 §15 estructura**: la propuesta de Doc 15 §15 incluye `app/middleware.ts`; en App Router la convención correcta es `src/middleware.ts` o `middleware.ts` en root de `src/`. US-105 mantiene el archivo en `src/middleware.ts` (ubicación creada por US-104). Amender Doc 15 §15 post-merge para reflejar la ubicación efectiva.
* **Decisión "admin puede entrar a `(app)`"**: el middleware permite a un admin escribir manualmente `/organizer` o `/vendor` y ver el placeholder. Esto se decidió por simplicidad UX en MVP (la navegación de US-107 no le ofrecerá links). Si el negocio prefiere bloquear, abrir DR explícito; por ahora no bloquea.
