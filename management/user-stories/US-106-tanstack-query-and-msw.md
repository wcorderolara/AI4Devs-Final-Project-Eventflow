# 🧾 User Story: Configurar TanStack Query global + `httpClient` con interceptores (Authorization cookie, `Accept-Language`, `X-Correlation-Id`, `ApiError`) + MSW para dev y tests + hidratación real de `<SessionProvider>` vía `GET /me` + `<ErrorBoundary>` raíz

## 🆔 Metadata

| Field              | Value                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| ID                 | US-106                                                                                               |
| Epic               | EPIC-FE-001 — Frontend Next.js Application Foundation                                                |
| Backlog Item       | PB-P0-013 — Frontend Data Layer: TanStack Query + MSW + Layouts                                       |
| Feature            | Data layer foundation — `QueryClient` global + `httpClient` + MSW + hidratación `SessionContext`      |
| Module / Domain    | Platform / FE / Data Layer                                                                            |
| User Role          | System                                                                                                |
| Priority           | Must Have (P0)                                                                                        |
| Status             | Approved with Minor Notes                                                                             |
| Owner              | Tech Lead / Frontend Lead                                                                             |
| Approved By        | PO/BA Review                                                                                          |
| Approval Date      | 2026-06-22                                                                                            |
| Ready for Development Tasks | Yes                                                                                          |
| Sprint / Milestone | MVP                                                                                                   |
| Created Date       | 2026-06-09                                                                                            |
| Last Updated       | 2026-06-22 (PO/BA approval gate)                                                                      |

---

## 🎯 User Story

**As the** sistema EventFlow
**I want** instalar la capa de datos global del frontend — montar `<QueryClientProvider>` con defaults seguros, crear `shared/api-client/httpClient.ts` (wrapper sobre `fetch` con `credentials: 'include'`, `Accept-Language` propagado vía `attachLocaleHeader` de US-104, `X-Correlation-Id` UUID v4 por request, mapeo de errores a `ApiError` tipado, timeout 10 s por defecto y 30 s para endpoints IA), configurar MSW 2.x activable en dev y obligatorio en suite de tests (worker en browser, server en Node), hidratar el `<SessionProvider>` esqueleto de US-105 con una query real a `GET /me` (con cookie HTTP-only `eventflow_session` cuando exista, sin token en cliente), montar un `<ErrorBoundary>` raíz, y entregar el patrón `feature/api/<feature>Api.ts → mapper → frontend model` documentado y testeable
**So that** las historias siguientes (US-107 layouts completos por rol, US-AUTH-* login/register, todas las historias de feature por dominio) tengan un data layer estable, observable, testeable, alineado a Doc 15 §22-26 / §43 y a ADR-FE-005 (TanStack Query como única solución de server state) / ADR-FE-009 (MSW como mocking compartido), sin introducir Server Actions ni API Routes BFF (Doc 15 §6, ADR-FE-002/003), preservando backend como única fuente de autorización y permitiendo desarrollo frontend desacoplado del backend para la demo académica.

---

## 🧠 Business Context

### Context Summary

US-103 dejó el proyecto Next.js + stack instalado. US-104 entregó `next-intl` funcional con `attachLocaleHeader`. US-105 entregó los 4 route groups, el `roleGuardMiddleware` UX y el `<SessionProvider>` esqueleto sin hidratación real. **US-106 entrega la capa de datos global** que cierra PB-P0-013 a nivel foundation y desbloquea:

* US-AUTH-* (login/register/forgot-password/logout) — consumen `httpClient` para `/auth/*`.
* US-107 (layouts completos por rol con sidebars y nav) — consume `useSession()` hidratado.
* Todas las historias de feature por dominio — consumen el patrón `feature/api/<feature>Api.ts → mapper → frontend model` con TanStack Query.
* El smoke E2E con MSW para demos académicas sin backend desplegado.

US-106 entrega 7 piezas integradas:

1. **`<QueryClientProvider>`** global montado en `RootLayout` con defaults seguros (Doc 15 §26).
2. **`shared/api-client/httpClient.ts`** wrapper sobre `fetch` con interceptores y `ApiError` tipado (Doc 15 §23).
3. **`shared/api-client/ApiError.ts`** + helpers de parseo del envelope backend (Doc 16 §ProblemDetails).
4. **MSW 2.x** configurado: worker (browser) + server (Node), set inicial mínimo de handlers que cubre `GET /auth/me`, contrato y carpeta `src/tests/msw/` lista para que cada feature aporte sus handlers.
5. **`<SessionProvider>` con hidratación real** vía `useQuery(['me'], () => authApi.me())` (reemplaza el esqueleto US-105). El `useSession()` retorna `{ isAuthenticated, role, user, isLoading, isError }`.
6. **`<ErrorBoundary>` raíz** en `RootLayout` con copy i18n y CTA "Reintentar".
7. **Patrón `feature/api/<feature>Api.ts → mapper → frontend model`** documentado con `authApi` como primer caso real (Doc 15 §24).

La autorización efectiva sigue siendo backend (ADR-FE-003). El `httpClient` no decodifica JWT; depende de la cookie HTTP-only `eventflow_session` (emitida por US-108) propagada automáticamente por el navegador via `credentials: 'include'`. Mientras US-108 no esté mergeada, MSW responde `GET /auth/me` con 401 y la sesión queda anónima.

### Related Domain Concepts

* **TanStack Query 5.x** (Doc 15 §26): server state, cache, invalidación, optimistic updates, reintentos, devtools.
* **MSW 2.x** (Doc 15 §43.3, ADR-FE-009): worker + server, mismos handlers en tests y dev. Alineado al contrato OpenAPI (PB-P0-005, Doc 16).
* **`httpClient`** (Doc 15 §23.1): fetch wrapper con interceptores `Authorization`/cookie, `Accept-Language`, `X-Correlation-Id`, parseo `ApiError`.
* **`ApiError` tipado** (Doc 15 §23.3): `{ code, message, details, correlationId, status }`.
* **`<SessionProvider>`** (Doc 15 §21.2): hidratado con `GET /me`.
* **Backend autoritativo** (ADR-FE-003): cualquier 401/403 del backend revoca UX.
* **Sin Server Actions / API Routes BFF** (Doc 15 §6, ADR-FE-002/003, ADR-API-001).
* **Correlation ID** (Doc 14, Doc 15 §40): generado en cliente con UUID v4; si el backend devuelve `X-Correlation-Id` en response, el cliente lo prefiere y lo expone en mensajes de error.

### PO/BA Decisions Applied

| Decision                                              | Resolution                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope de US-106                                       | US-106 entrega exclusivamente: (a) `<QueryClientProvider>` con defaults; (b) `httpClient` + interceptores + `ApiError`; (c) MSW 2.x (worker dev + server tests) con set inicial de handlers (`GET /auth/me` 401 anónimo + handler placeholder para health); (d) hidratación real de `<SessionProvider>` vía `useQuery(['me'])`; (e) `<ErrorBoundary>` raíz; (f) `authApi.me()` + mapper + tipo `AuthSession` (frontend model); (g) tests unit + integration + E2E; (h) `web/README.md` § "Data Layer". |
| Boundary con US-103/104/105/107/108/AUTH-*           | US-103 (bootstrap), US-104 (i18n + `attachLocaleHeader`), US-105 (route groups + `<SessionProvider>` esqueleto + `roleGuardMiddleware`) **ya mergeadas**. **Login/Register/Forgot-password/Logout funcionales** → **US-AUTH-***. **Emisión de cookies de sesión por backend** (`eventflow_session` HTTP-only + `eventflow_role` no HTTP-only) → **US-108**. **Layouts completos por rol** (sidebars, headers, breadcrumbs, navegación visual) → **US-107**. **Feature-specific API clients** (`eventsApi`, `quotesApi`, `vendorsApi`, etc.) → cada historia de feature. |
| `<QueryClientProvider>` defaults                      | Defaults seguros para MVP: `staleTime: 30_000` (30 s), `gcTime: 5 * 60_000` (5 min), `refetchOnWindowFocus: true`, `refetchOnReconnect: true`, `retry: (failureCount, error) => failureCount < 1 && !isNonRetryable(error)` donde `isNonRetryable` cubre 401, 403, 404, 422 (Doc 15 §23.3). `retryDelay: 1_000`. `mutations.retry: 0`. Estos defaults pueden ajustarse por feature; US-106 los deja como base.                                                                                                  |
| `<QueryClient>` única instancia por request          | En App Router + Server Components, el `QueryClient` se construye en un `<QueryClientProvider>` Client Component (`'use client'`) memoizado con `useState(() => new QueryClient(...))` para evitar shared state entre requests. Patrón oficial TanStack para Next.js App Router.                                                                |
| `<ReactQueryDevtools>`                                | Habilitado solo cuando `process.env.NODE_ENV !== 'production'`. Carga vía dynamic import para no inflar bundle de prod.                                                                                                                                                                                                                          |
| `httpClient` API                                       | Exportar funciones `httpGet<T>`, `httpPost<T, B>`, `httpPatch<T, B>`, `httpPut<T, B>`, `httpDelete<T>` con firma `(path: string, opts?: { body?, query?, signal?, headers?, timeoutMs?, isAI?: boolean }): Promise<T>`. `path` se concatena con `process.env.NEXT_PUBLIC_API_BASE_URL`. Cookies via `credentials: 'include'`. `Accept-Language` automático vía `attachLocaleHeader`. `X-Correlation-Id` UUID v4 si el cliente no lo provee. Lanza `ApiError` en !ok.                       |
| `ApiError` shape                                       | `class ApiError extends Error` con propiedades `code: string`, `message: string`, `details?: unknown`, `correlationId?: string`, `status: number`, `isRetryable: boolean`. Constructor recibe `{ code, message, details?, correlationId?, status }`. Mapeo desde response: si backend responde `{ error: { code, message, details } }` (envelope Doc 16), parsear; si responde texto plano o non-JSON, usar `code: 'UNEXPECTED'` + `message` genérico. |
| Timeouts                                               | 10 s por defecto. 30 s cuando `opts.isAI === true`. Implementados con `AbortController` y `setTimeout`. Si el timeout dispara, lanzar `ApiError({ code: 'TIMEOUT', status: 0, isRetryable: true })`.                                                                                                                                              |
| `X-Correlation-Id` strategy                            | Generar UUID v4 client-side por request via `crypto.randomUUID()` (disponible en Edge + browsers modernos + Node 20). Enviar en request header. Si el backend devuelve `X-Correlation-Id` en response header, el cliente lo prefiere para el `ApiError.correlationId` y lo expone en logs/UI. Sin dependencia externa (`uuid` package no instalado).                                                                                                                              |
| Retry policy                                          | Configurada en TanStack Query (Doc 15 §23.3). `httpClient` NO reintenta. `retry` lambda usa `error.isRetryable` (network errors, 5xx, 408, 429 retryable; 4xx restantes no). `retryDelay: 1_000` con backoff lineal en MVP.                                                                                                                       |
| MSW activation strategy                                | **Dev**: opt-in via `NEXT_PUBLIC_API_MOCKING=enabled` (valor `'enabled'` activa worker; cualquier otro valor o ausencia → real backend). El worker se inicializa en un Client Component `<MSWProvider>` vía dynamic import (no bloquea SSR). **Tests Vitest**: `setupFiles` arranca `setupServer()` antes de cada test. **Tests Playwright**: MSW server-side opcional; los E2E pueden usar el dev server con `NEXT_PUBLIC_API_MOCKING=enabled` para mocking determinista o el backend real. **Producción**: MSW NUNCA se carga (verificación: ESLint/build script que falle si `msw` aparece en chunks de prod). |
| MSW handler set inicial US-106                         | Solo handlers necesarios para que la app renderice end-to-end sin backend: (1) `GET /api/v1/auth/me` → 401 `{ error: { code: 'UNAUTHENTICATED' } }` por defecto (sesión anónima); con override por test puede retornar `{ user, role }`. (2) `GET /api/v1/health` → 200 `{ status: 'ok' }`. Cualquier otro endpoint sin handler → MSW responde 501 + warn en consola para fallar visible. Los handlers de feature (auth login, events, vendors, etc.) los aportan sus historias dueñas. |
| Cookies de sesión                                      | `httpClient` usa `credentials: 'include'`. La cookie `eventflow_session` (HTTP-only `Secure` `SameSite=Lax`, emitida por US-108) y `eventflow_role` (no HTTP-only, leída por middleware US-105) se propagan automáticamente. US-106 **no lee ni decodifica** la cookie de sesión.                                                                |
| `<SessionProvider>` hidratado                          | US-106 reemplaza el `<SessionProvider>` esqueleto de US-105: ahora envuelve internamente un `useQuery(['me'], () => authApi.me(), { staleTime: 60_000, retry: false })`. `useSession()` retorna `{ user: User \| null, role: Role \| null, isAuthenticated: boolean, isLoading: boolean, isError: boolean, refetch }`. Mientras `isLoading=true`, los consumidores muestran skeleton/loader. El error 401 no se trata como error (se interpreta como anónimo).                       |
| `authApi.me()`                                         | Primer cliente real bajo el patrón `feature/<feature>/api/<feature>Api.ts`. **Por excepción foundation**, se ubica en `src/shared/auth-session/authApi.ts` (no en `features/auth/`) porque es transversal y consumido por `<SessionProvider>`. Devuelve `AuthSession` (frontend model) o lanza `ApiError`. Login/register/logout funcionales viven en US-AUTH-* y agregan `authApi.login`, `authApi.logout`, etc. cuando llegan. |
| `<ErrorBoundary>` raíz                                 | Client Component que envuelve `<NextIntlClientProvider>` dentro del `RootLayout`. Captura errores de render React (no errores de query — esos los maneja TanStack Query + `error.tsx`). Renderiza una página de error genérica con copy i18n `errors.envelope.UNEXPECTED` + `common.retry` (ya creadas en US-104/105). Usa `react-error-boundary` (instalar como dep). |
| Patrón mappers + frontend models                       | Documentado en `web/README.md` § "Data Layer" con `authApi` como ejemplo: `AuthSessionResponseDTO` (espejo backend) → `mapAuthSessionResponseToAuthSession()` → `AuthSession` (frontend model con `Date`, `Role` enum, etc.). Una historia de feature **no** puede saltarse el mapper (validado en code review).                                  |
| Validación Zod del envelope                            | El parseo del response usa `Zod` en el `httpClient` solo para validar la **estructura del envelope de error** (`{ error: { code, message } }`). Los DTOs de éxito **se validan en cada `featureApi.ts`** porque cada feature define su schema. US-106 entrega el helper `parseErrorEnvelope(unknown): ApiError` con Zod.                       |
| Errores 401 globales                                   | Cuando cualquier query/mutation retorna 401, un listener global (`onError` del `QueryClient`) limpia el cache (`queryClient.clear()`), invalida `['me']` y, si el path actual es `(app)` o `(admin)`, redirige a `/login?from=<path>`. **Excepción**: la propia `['me']` no dispara redirect (queda como sesión anónima). Implementado con `QueryCache({ onError })`. |
| Errores 403 globales                                   | 403 NO redirige (la UX guarda en middleware ya lo hace). Solo se logean en dev y se exponen al componente vía `error.tsx` o toast de feature.                                                                                                                                                                                                      |
| Logs runtime cliente                                   | `httpClient` loguea en dev: `httpClient.request { method, path, correlationId }` y `httpClient.error { method, path, status, code, correlationId }` sin body completo. En prod, silencio (Sentry es Future, Doc 15 §44).                                                                                                                          |
| Endpoint `GET /me` contract                            | URL: `GET /api/v1/auth/me`. Response 200: `{ user: { id: string, email: string, displayName: string }, role: 'organizer' \| 'vendor' \| 'admin', locale: string }`. Response 401: `{ error: { code: 'UNAUTHENTICATED', message: string } }` (sesión anónima). Owner: **US-108** lo implementa en backend. US-106 lo **consume** con MSW handler stub hasta que US-108 esté listo. |
| Tests E2E con MSW                                      | Playwright suite hereda de US-103 + US-105. US-106 agrega 3 E2E: (1) `data-layer.anonymous.spec.ts` — `<SessionProvider>` renderiza estado `{ isAuthenticated: false }` cuando MSW responde 401; (2) `data-layer.authenticated.spec.ts` — con MSW retornando 200 para `/auth/me`, `useSession()` expone `user` y `role`; (3) `data-layer.error-boundary.spec.ts` — un componente que lanza renderiza `<ErrorBoundary>` con copy i18n. |
| Documentation Alignment Required                       | (a) Doc 15 §23.1 menciona `Authorization (cookie automática) o Bearer si el Security Design lo decide` — US-106 adopta **cookie HTTP-only** (Doc 19 + decisión US-105). (b) Doc 15 §21.2 menciona `SessionContext provee user, role, permissions, isAuthenticated, locale` — US-106 NO entrega `permissions` (será derivado en backend; el frontend solo guarda `role`); `locale` ya vive en `useLocale()` (US-104), no se duplica en `useSession()`. (c) Coordinar con US-108 el contrato exacto de `GET /api/v1/auth/me`. |

### Assumptions

* US-103, US-104, US-105 **mergeadas** y operativas.
* `attachLocaleHeader` (US-104) está exportado y testeado.
* `<SessionProvider>` esqueleto (US-105) puede reemplazarse sin romper consumidores (US-105 documentó valor por defecto `{ isAuthenticated: false, role: null }`).
* `crypto.randomUUID()` disponible en runtime objetivo (Node 20 + browsers modernos + Edge runtime).
* Backend en US-108 emitirá la cookie `eventflow_session` HTTP-only + cookie `eventflow_role` no HTTP-only.
* `NEXT_PUBLIC_API_BASE_URL` ya existe en `.env.local.example` (US-103).
* Sin Sentry en MVP (Doc 15 §44 — Future).

### Dependencies

* `US-103` (bootstrap + stack TanStack Query 5.x, MSW 2.x, fetch instalados). Mergeada.
* `US-104` (`attachLocaleHeader` exportado). Mergeada.
* `US-105` (`<SessionProvider>` esqueleto + `useSession()` consumido por features). Mergeada.
* `Doc 15 — Frontend Architecture Design` §21, §22, §23, §24, §26, §40, §43.
* `Doc 16 — API Design Specification` (envelope de error `ProblemDetails`-like, headers).
* `Doc 19 — Security & Authorization Design` (cookie HTTP-only de sesión).
* `Doc 20 — Testing Strategy` (MSW para integration/E2E).
* `Doc 22 — ADRs` ADR-FE-001, ADR-FE-002, ADR-FE-003, ADR-FE-005 (TanStack Query), ADR-FE-009 (MSW), ADR-FE-015.
* **Sin dependencia técnica bloqueante con US-108**: cuando llegue, el endpoint real reemplaza al handler MSW; el código del frontend no cambia.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — habilita el consumo del contrato REST `/api/v1/*` por todas las historias siguientes (FR-AUTH-*, FR-USER-*, FR-EVENT-*, FR-VENDOR-*, FR-ADMIN-*, FR-AI-*). No implementa directamente ningún FR funcional.                                          |
| Use Case(s)            | UC-AUTH-001 (login — `authApi.me()` se invoca tras el redirect post-login, su contrato lo define US-106), UC-AUTH-002 (logout — cookie limpiada por US-108 → `<SessionProvider>` reacciona). Transversal al resto de UC.                                          |
| Business Rule(s)       | BR-AUTH-011 (frontend es UX-only — cualquier 401/403 del backend revoca UX; US-106 implementa el handler global), BR-OBS-001 (correlation ID en cada request).                                                                                                    |
| Permission Rule(s)     | Doc 5 §5 (3 roles MVP); ADR-FE-003 (frontend authorization es UX, no fuente de verdad — `useSession()` solo refleja lo que el backend afirmó en `GET /me`).                                                                                                       |
| Data Entity / Entities | No aplica DB. Consume: response de `GET /auth/me` (backend en US-108) y respuestas de cualquier endpoint REST `/api/v1/*` que las historias futuras invoquen.                                                                                                    |
| API Endpoint(s)        | Documenta y consume `GET /api/v1/auth/me`. **No introduce** endpoints nuevos en backend. El contrato detallado lo formaliza US-108. US-106 entrega el cliente y el handler MSW stub.                                                                              |
| NFR Reference(s)       | NFR-PERF-API-001 (timeout 10 s default, 30 s IA), NFR-OBS-001 (correlation ID propagado), NFR-A11Y-* (loader/error boundary accesibles), NFR-SEC-001..* (frontend UX-only, sin tokens en localStorage), NFR-TEST-001 (MSW determinista en CI).                  |
| Related ADR(s)         | ADR-ARCH-001, ADR-FE-001 (Next.js + App Router), ADR-FE-002 (REST + TanStack Query, sin Server Actions), ADR-FE-003 (frontend UX-only), ADR-FE-005 (TanStack Query única solución de server state), ADR-FE-009 (MSW como mocking compartido), ADR-FE-015 (middleware UX). |
| Related Document(s)    | `/docs/15-Frontend-Architecture-Design.md` §21-26, §40, §43; `/docs/16-API-Design-Specification.md` (envelope, headers); `/docs/19-Security-and-Authorization-Design.md` (cookie HTTP-only); `/docs/20-Testing-Strategy.md`; `/docs/22-Architecture-Decision-Records.md`. |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: **In Scope**
* MVP Relevance: **Must Have (P0)**
* Delivery Type: **Technical foundation — data layer global**
* Scope Boundary: **`<QueryClientProvider>` + `httpClient` + `ApiError` + MSW dev/test + `<SessionProvider>` hidratado + `<ErrorBoundary>` raíz + `authApi.me()` + patrón documentado + tests unit/integration/E2E.**

### Explicitly Out of Scope

* **Formularios reales de login/register/forgot-password** (RHF + Zod + submit con `httpClient`) → **US-AUTH-***. US-106 entrega solo el cliente y la query `useMe()` consumida por `<SessionProvider>`.
* **Emisión de cookies de sesión** (`eventflow_session` + `eventflow_role`) por backend → **US-108**.
* **Layouts completos por rol** (`OrganizerLayout`, `VendorLayout`, `AdminLayout` con sidebars y navegación visual) → **US-107**.
* **Feature-specific API clients** (`eventsApi`, `quotesApi`, `vendorsApi`, `aiApi`, `adminApi`, etc.) → cada historia de feature. US-106 solo entrega `authApi.me()`.
* **Optimistic updates patterns por feature** → historias de feature.
* **Mutaciones globales** (login, logout, etc.) → US-AUTH-* (login/logout) y features.
* **`<ToastProvider>`** y notificaciones globales → US-107 o historia de UI.
* **`<ThemeProvider>`** → diferida (Doc 15 §32, Future si el equipo lo prioriza).
* **TanStack Table 8.x** → diferida (Doc 15 §7 "selectivo").
* **Sentry / observability cliente full** → Future.
* **Server Actions, API Routes BFF, proxy a OpenAI** → prohibidos (Doc 15 §6, ADR-FE-002/003, ADR-API-001).
* **OpenAPI codegen / contract tests automatizados** → diferido (los mappers + Zod por feature son suficientes en MVP).
* **`useSession()` con `permissions`** → diferido. US-106 solo expone `role`; las permission rules las decide el backend per-request.
* **Refresh token rotation** → no aplica (cookie de sesión backend; el backend renueva por su cuenta).

### Scope Notes

* El `<QueryClientProvider>`, `<SessionProvider>` hidratado, `<MSWProvider>` y `<ErrorBoundary>` se montan en el `RootLayout` (`src/app/layout.tsx`). El orden de envolturas queda formalizado en AC-03.
* El `httpClient` es **agnóstico** del feature; las historias siguientes lo consumen via funciones por-feature (`featureApi`).
* MSW handlers de feature viven en cada historia dueña; US-106 solo crea la infraestructura y los 2 handlers iniciales mínimos (`/auth/me`, `/health`).
* La cookie `eventflow_session` es transparente para el `httpClient` — el navegador la envía automáticamente vía `credentials: 'include'`. **Nunca** se lee desde JavaScript.
* Sin `localStorage` para datos sensibles (NFR-SEC, ADR-FE-015).
* `NEXT_PUBLIC_API_MOCKING` puede valer `'enabled'` (activa MSW) o cualquier otro valor / ausente (real backend). Se documenta en `.env.local.example` (US-106 lo agrega).
* Los segmentos URL del API siguen `/api/v1/...` (Doc 16); `NEXT_PUBLIC_API_BASE_URL` ya define `http://localhost:3001/api/v1` en local.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: `<QueryClientProvider>` montado en `RootLayout` con defaults seguros

**Given** US-105 mergeada con `RootLayout` envolviendo `<SessionProvider>` esqueleto + `<NextIntlClientProvider>`
**When** se inspecciona `web/src/app/layout.tsx` y `web/src/shared/providers/QueryProvider.tsx`
**Then** existe `<QueryProvider>` Client Component (`'use client'`) que:

* Inicializa `QueryClient` con `useState(() => new QueryClient({ defaultOptions }))` (instancia única por request, patrón oficial App Router).
* `defaultOptions.queries`: `staleTime: 30_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: true`, `refetchOnReconnect: true`, `retry: customRetryFn`, `retryDelay: 1_000`.
* `defaultOptions.mutations.retry: 0`.
* `customRetryFn(failureCount, error)` retorna `false` si `error instanceof ApiError && !error.isRetryable` o `failureCount >= 1`.
* `<ReactQueryDevtools initialIsOpen={false} />` cargado vía `dynamic(() => import('@tanstack/react-query-devtools').then(m => m.ReactQueryDevtools), { ssr: false })` solo en dev.

**And** `RootLayout` envuelve los providers en el orden: `<html lang={locale}><body><ErrorBoundary><QueryProvider><MSWProvider><SessionProvider><NextIntlClientProvider>{children}</NextIntlClientProvider></SessionProvider></MSWProvider></QueryProvider></ErrorBoundary></body></html>`.

---

### AC-02: `httpClient` con interceptores y `ApiError` tipado

**Given** la app construida
**When** se inspecciona `web/src/shared/api-client/httpClient.ts`
**Then** existe:

* `class ApiError extends Error` con campos `code: string`, `message: string`, `details?: unknown`, `correlationId?: string`, `status: number`, `isRetryable: boolean`.
* Funciones exportadas: `httpGet`, `httpPost`, `httpPatch`, `httpPut`, `httpDelete` con firma `<T, B = unknown>(path: string, opts?: HttpClientOptions<B>): Promise<T>`.
* Cada request:

  1. Concatena `process.env.NEXT_PUBLIC_API_BASE_URL` + `path`.
  2. Aplica `credentials: 'include'`.
  3. Añade `Accept-Language` vía `attachLocaleHeader()` (US-104).
  4. Añade `X-Correlation-Id` con `crypto.randomUUID()` si el caller no lo provee.
  5. Añade `Content-Type: application/json` si hay body.
  6. Serializa `body` con `JSON.stringify` si existe.
  7. Aplica `AbortController` con `setTimeout(timeoutMs ?? (opts.isAI ? 30_000 : 10_000))`; cancela si vence.
  8. Si response no OK, parsea envelope `{ error: { code, message, details } }` con Zod (helper `parseErrorEnvelope`) y lanza `ApiError`.
  9. Si timeout, lanza `ApiError({ code: 'TIMEOUT', status: 0, isRetryable: true })`.
  10. Si network error, lanza `ApiError({ code: 'NETWORK', status: 0, isRetryable: true })`.
  11. Si response OK, retorna `response.json() as T` (sin validación adicional — la valida `featureApi`).
* `ApiError.isRetryable` derivado: `true` para `status === 0` (network/timeout), `status >= 500 && status < 600`, `status === 408`, `status === 429`. `false` para los demás.

---

### AC-03: MSW 2.x configurado para dev y tests con handlers iniciales mínimos

**Given** `npm ci` ejecutado
**When** se inspecciona la app y los tests
**Then**:

* `web/src/tests/msw/handlers/index.ts` exporta `handlers: HttpHandler[]` con:
  * `http.get('*/api/v1/auth/me', () => HttpResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'No session' } }, { status: 401 }))`.
  * `http.get('*/api/v1/health', () => HttpResponse.json({ status: 'ok' }))`.
  * Catch-all `http.all('*/api/v1/*', () => HttpResponse.json({ error: { code: 'NOT_MOCKED', message: 'No MSW handler for this request' } }, { status: 501 }))` (con `console.warn` en dev).
* `web/src/tests/msw/browser.ts` exporta `worker = setupWorker(...handlers)`.
* `web/src/tests/msw/server.ts` exporta `server = setupServer(...handlers)`.
* `web/src/shared/providers/MSWProvider.tsx` (`'use client'`): si `process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'`, importa dinámicamente `./tests/msw/browser` y llama `worker.start({ onUnhandledRequest: 'warn' })` en `useEffect`. En prod build, el bundler hace tree-shaking y `msw` no aparece en chunks.
* `web/vitest.setup.ts` invoca `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(() => server.resetHandlers())`, `afterAll(() => server.close())`.
* `public/mockServiceWorker.js` versionado (generado por `npx msw init public/`).

---

### AC-04: Hidratación real de `<SessionProvider>` vía `useQuery(['me'])`

**Given** US-105 mergeada con `<SessionProvider>` esqueleto
**When** se inspecciona `web/src/shared/auth-session/SessionProvider.tsx`
**Then**:

* `<SessionProvider>` (Client Component) usa internamente:
  ```ts
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(),
    staleTime: 60_000,
    retry: false,
  })
  ```
* `useSession()` retorna `{ user: User | null, role: Role | null, isAuthenticated: boolean, isLoading: boolean, isError: boolean, refetch }`.
* Cuando `data` es `null` o `useQuery` lanza `ApiError({ code: 'UNAUTHENTICATED' })`, se interpreta como **sesión anónima** (`isAuthenticated: false`), **no** como error.
* Cualquier otro error (`NETWORK`, `TIMEOUT`, 5xx) deja `isError: true` y los layouts pueden mostrar estado de error.

**And** existe `web/src/shared/auth-session/authApi.ts`:

* `authApi.me(): Promise<AuthSession>` que invoca `httpGet<AuthSessionResponseDTO>('/auth/me')` y aplica `mapAuthSessionResponseToAuthSession(dto)`.
* `AuthSessionResponseDTO` (espejo backend) y `AuthSession` (frontend model) tipados explícitamente.
* `mapAuthSessionResponseToAuthSession(dto)` función pura testeada.

---

### AC-05: `<ErrorBoundary>` raíz con copy i18n

**Given** la app construida
**When** un componente descendiente lanza un error de render
**Then** se renderiza el `<ErrorBoundary>` raíz con:

* `<h1>{t('errors.envelope.UNEXPECTED')}</h1>` (clave creada en US-104).
* `<button onClick={resetErrorBoundary}>{t('common.retry')}</button>`.
* Log en consola: `console.error('ErrorBoundary caught', error, info)` (sin telemetry remota — Future).

**And** `<ErrorBoundary>` se implementa con `react-error-boundary` (dep nueva instalada en US-106).
**And** no captura errores de `useQuery` ni de `httpClient` — esos los maneja TanStack Query (`isError`) y el `error.tsx` por route group (US-105).

---

### AC-06: Handler global de 401 invalida sesión y redirige

**Given** un usuario navega a `/organizer/events` y cualquier `useQuery` retorna `ApiError({ status: 401 })`
**When** el `QueryCache.onError` global se dispara
**Then**:

* `queryClient.invalidateQueries({ queryKey: ['me'] })` se ejecuta (revalida sesión).
* Si la query que falló **no** es `['me']`, además `queryClient.clear()` limpia el cache para evitar mostrar datos stale.
* Si el path actual es `(app)/*` o `(admin)/*`, `router.replace('/login?from=' + encodeURIComponent(pathname + search))`.
* Si el path es `(public)/*` o `(auth)/*`, no se redirige (la UX puede seguir).

**And** 403 NO redirige (la UX guarda en `roleGuardMiddleware` US-105 ya lo cubre); solo se logea en dev.

---

### AC-07: Variables de entorno declaradas

**Given** el repo
**When** se inspecciona `web/.env.local.example`
**Then** contiene:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_CAPTCHA_SITE_KEY=
NEXT_PUBLIC_DEFAULT_LOCALE=es-LATAM
NEXT_PUBLIC_SUPPORTED_LOCALES=es-LATAM,es-ES,pt,en
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_MOCKING=disabled
```

**And** `NEXT_PUBLIC_API_MOCKING` documentado en `web/README.md`: `'enabled'` activa MSW worker; cualquier otro valor → backend real.

---

### AC-08: Patrón `feature/api/<feature>Api.ts → mapper → frontend model` documentado

**Given** el equipo
**When** consulta `web/README.md` § "Data Layer"
**Then** la sección documenta:

* El patrón canónico: `feature/<feature>/api/<feature>Api.ts` (DTOs + funciones REST) → `feature/<feature>/api/<feature>Mappers.ts` (puras) → `feature/<feature>/types/` (frontend models).
* Ejemplo concreto: `authApi.me()` con `AuthSessionResponseDTO` → `AuthSession`.
* Reglas: NO se devuelven DTOs crudos al UI; el mapper aísla cambios de contrato; errores siempre tipados como `ApiError`.
* Cómo agregar un nuevo `featureApi`: paso a paso (crear archivo, definir DTO, definir Frontend Model, escribir mapper, escribir hook TanStack Query, agregar MSW handler).

---

### AC-09: Tests unit + integration cubren `httpClient`, `ApiError`, `authApi`, `<SessionProvider>`

**Given** Vitest + Testing Library + MSW configurados
**When** se ejecuta `npm run test`
**Then** pasan al menos:

* `tests/unit/api-client/httpClient.test.ts`:
  * Construye request con `Accept-Language`, `X-Correlation-Id`, `credentials: 'include'`, `Content-Type` cuando aplica.
  * Timeout dispara `AbortError` → `ApiError({ code: 'TIMEOUT', isRetryable: true })`.
  * Network error → `ApiError({ code: 'NETWORK', isRetryable: true })`.
  * Response 401 con envelope válido → `ApiError({ code: 'UNAUTHENTICATED', status: 401, isRetryable: false })`.
  * Response 500 sin envelope → `ApiError({ code: 'UNEXPECTED', status: 500, isRetryable: true })`.
  * Preserva `correlationId` del response header si está presente.
* `tests/unit/api-client/ApiError.test.ts`: `isRetryable` derivado correctamente para status 0, 408, 429, 500, 502, 503, vs 400, 401, 403, 404, 422.
* `tests/unit/api-client/parseErrorEnvelope.test.ts`: Zod schema valida estructuras válidas e inválidas (cae a `UNEXPECTED`).
* `tests/unit/auth-session/authApi.test.ts`: `authApi.me()` invoca `httpGet('/auth/me')` y aplica mapper.
* `tests/unit/auth-session/SessionProvider.test.tsx`: con MSW retornando 401, `useSession()` retorna `{ isAuthenticated: false }`; con MSW retornando 200, retorna `{ isAuthenticated: true, role: 'organizer' }`.
* `tests/integration/data-layer/onError-401.test.tsx`: simulación de query que retorna 401 dispara `queryClient.clear()` y redirect mockeado.

---

### AC-10: Tests E2E Playwright cubren flujos sesión anónima, autenticada y error boundary

**Given** Playwright configurado (heredado de US-103/US-105)
**When** se ejecuta `npm run test:e2e`
**Then** pasan al menos:

* `tests/e2e/data-layer.anonymous.spec.ts`: con MSW retornando 401 para `/auth/me`, navegar a `/` → DOM expone `[data-testid="session-state"]="anonymous"` (un placeholder mínimo en la landing para test).
* `tests/e2e/data-layer.authenticated.spec.ts`: con MSW override retornando 200 `{ user, role: 'organizer' }` para `/auth/me`, navegar a `/` → DOM expone `[data-testid="session-state"]="authenticated"` y `[data-testid="session-role"]="organizer"`.
* `tests/e2e/data-layer.error-boundary.spec.ts`: forzar render error (vía page con query param `?throw=1` y un componente test-only) → `<ErrorBoundary>` renderiza copy i18n.

---

### AC-11: Pipeline canónico verde y sin artefactos fuera de scope

**Given** el PR de US-106
**When** corren `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`
**Then** todos los comandos terminan con exit 0
**And** el PR NO contiene:

* Formularios reales de login/register/forgot-password.
* `authApi.login`/`authApi.logout`/`authApi.register` (eso es US-AUTH-*).
* Layouts completos con sidebars/headers/breadcrumbs (US-107).
* Feature-specific API clients (`eventsApi`, `quotesApi`, `vendorsApi`, etc.).
* `useEvents`, `useVendors`, etc. (historias por feature).
* Server Actions (`'use server'`).
* API Routes BFF (`src/app/api/*`).
* `ToastProvider`, `ThemeProvider`, TanStack Table.
* Tokens en `localStorage` o `sessionStorage`.
* Sentry, observability cliente full.
* MSW en chunks de producción (verificable con `grep "msw" .next/static/chunks/*.js` después de `npm run build`).

---

## ⚠️ Edge Cases

### EC-01: Backend caído cuando MSW está deshabilitado

**Given** `NEXT_PUBLIC_API_MOCKING=disabled` y el backend (US-094..097) no responde
**When** el usuario navega a `/`
**Then** `authApi.me()` lanza `ApiError({ code: 'NETWORK', status: 0, isRetryable: true })`
**And** `useSession()` expone `{ isError: true, isAuthenticated: false }`
**And** los layouts pueden renderizar estado degradado (UX baseline; la implementación visual rica vive en US-107).

#### Handling

* TanStack Query reintenta una vez (`retry: 1`).
* Si persiste, el componente muestra `error.tsx` (heredado de US-105) o un toast (US-107).
* `<ErrorBoundary>` raíz NO se dispara (es error de query, no de render).

---

### EC-02: Response no-JSON (HTML proxy / 502 Bad Gateway)

**Given** un proxy intermedio retorna HTML en lugar de JSON
**When** el `httpClient` intenta `response.json()` y falla con `SyntaxError`
**Then** se captura y se lanza `ApiError({ code: 'UNEXPECTED', message: 'Invalid response body', status: response.status, isRetryable: true })`.

#### Handling

* No revelar el HTML completo en el mensaje (puede contener info sensible del proxy).
* Logar en dev: `httpClient.error { status, path, body: '<non-JSON>' }`.

---

### EC-03: Cookie de sesión inválida o expirada (response 401 a `/auth/me`)

**Given** la cookie `eventflow_session` está presente pero el backend la rechaza (expiró, fue revocada, JWT inválido)
**When** `authApi.me()` retorna 401 con envelope `{ error: { code: 'UNAUTHENTICATED' } }`
**Then** `<SessionProvider>` lo interpreta como sesión anónima sin disparar `onError` global de 401 (excepción `queryKey === ['me']`)
**And** no se redirige al login automáticamente (el usuario puede estar en página pública).

#### Handling

* La cookie HTTP-only la limpia el backend en US-AUTH-* logout o el navegador al expirar.
* Si el usuario intenta acceder a `(app)`/`(admin)`, el `roleGuardMiddleware` (US-105) lo redirige porque la cookie sigue formalmente presente pero el rol cookie puede estar desincronizado. Documentado como aceptable en MVP; coordinar limpieza coherente con US-108.

---

### EC-04: MSW worker no inicializa en dev (error de carga)

**Given** `NEXT_PUBLIC_API_MOCKING=enabled` y `public/mockServiceWorker.js` falta
**When** la app arranca
**Then** `<MSWProvider>` falla silenciosamente con `console.error('MSW init failed', err)` y la app cae a backend real.

#### Handling

* No crashear la app por una falta de mock setup.
* Documentar en README: `npx msw init public/` es parte del setup.

---

### EC-05: `crypto.randomUUID()` no disponible (runtimes antiguos)

**Given** un runtime (test runner antiguo) sin `crypto.randomUUID`
**When** `httpClient` genera correlationId
**Then** fallback a un generador interno simple (`Math.random().toString(36)` concatenado dos veces) **solo en tests**.

#### Handling

* Detectar `typeof crypto !== 'undefined' && 'randomUUID' in crypto` antes de usar.
* El fallback NO se usa en runtime de prod (Node 20 + browsers modernos lo soportan).

---

### EC-06: 401 disparado por endpoint distinto a `/auth/me` durante navegación

**Given** un usuario autenticado navega a `/organizer/events` y `useEvents()` (historia futura) retorna 401
**When** `QueryCache.onError` lo detecta
**Then**:

* Invalida `['me']` (el siguiente render mostrará anónimo).
* `queryClient.clear()` para purgar datos stale.
* `router.replace('/login?from=%2Forganizer%2Fevents')`.

#### Handling

* El bucle infinito está prevenido porque la query `['me']` no dispara redirect (excepción explícita).
* Si el usuario estaba en `(public)/*`, no se redirige.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                                                          | Message / Behavior                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| VR-01 | `<QueryClientProvider>`, `<MSWProvider>`, `<SessionProvider>`, `<ErrorBoundary>` montados en `RootLayout` en el orden formalizado por AC-01                  | Test unit / revisión PR falla                       |
| VR-02 | `QueryClient` instanciado con `useState(() => new QueryClient(...))` (no como singleton de módulo)                                                            | Test unit falla                                     |
| VR-03 | `httpClient` propaga `Accept-Language` (vía `attachLocaleHeader`), `X-Correlation-Id` (UUID v4), `credentials: 'include'` y `Content-Type: application/json`  | Test unit falla → bloquea merge                     |
| VR-04 | `ApiError.isRetryable` correctamente derivado por status                                                                                                       | Test unit falla → bloquea merge                     |
| VR-05 | MSW worker NUNCA se incluye en chunks de producción                                                                                                            | Build check fail → bloquea merge                    |
| VR-06 | `<SessionProvider>` hidrata vía `useQuery(['me'])` con `retry: false`; 401 = anónimo, no error                                                                | Test component falla → bloquea merge                |
| VR-07 | `useSession()` expone `{ user, role, isAuthenticated, isLoading, isError, refetch }` — **no** expone `permissions` ni `locale` (ese vive en `useLocale()`)    | TypeScript falla → bloquea merge                    |
| VR-08 | El PR NO contiene formularios reales de login/register, ni `authApi.login`/`logout`/`register` (out of scope; US-AUTH-*)                                       | Revisión PR falla                                   |
| VR-09 | El PR NO contiene feature-specific API clients (`eventsApi`, `quotesApi`, etc.) ni hooks por feature                                                           | Revisión PR falla                                   |
| VR-10 | El PR NO contiene layouts con sidebars/navegación completa (US-107)                                                                                            | Revisión PR falla                                   |
| VR-11 | Lint anti-hardcoded (US-104) sigue activo; cualquier copy nueva vive en `t('clave')`                                                                          | ESLint falla → bloquea merge                        |
| VR-12 | Pipeline canónico Doc 21 §9.2 verde + tests nuevos verdes                                                                                                      | CI falla → bloquea merge                            |
| VR-13 | `NEXT_PUBLIC_API_MOCKING` documentado en `.env.local.example` y `web/README.md`                                                                               | Revisión PR falla                                   |
| VR-14 | `<ErrorBoundary>` usa `react-error-boundary` (no implementación custom)                                                                                       | Revisión PR / test falla                            |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | El frontend es **UX-only** (ADR-FE-003). `useSession()` solo refleja lo que el backend afirmó en `GET /me`. Cualquier 401/403 del backend es la palabra final.    |
| SEC-02 | El `httpClient` **no decodifica JWT** ni valida firma. Solo envía cookies vía `credentials: 'include'`.                                                            |
| SEC-03 | **No tokens en localStorage / sessionStorage** (ADR-FE-015). La cookie HTTP-only es invisible para JavaScript.                                                     |
| SEC-04 | `X-Correlation-Id` generado client-side via `crypto.randomUUID()` — sin libraries que generen identificadores predecibles.                                          |
| SEC-05 | Logs del `httpClient` en dev **no imprimen body completo** ni cookies — solo `{ method, path, correlationId, status, code }`.                                      |
| SEC-06 | `ApiError.message` se muestra al usuario solo si proviene del envelope backend; los `message` derivados internamente usan claves i18n genéricas (`errors.envelope.UNEXPECTED`). |
| SEC-07 | MSW **prohibido en chunks de producción**. Verificado en build check.                                                                                              |
| SEC-08 | Sin Server Actions, sin API Routes BFF, sin proxy a OpenAI (Doc 15 §6, ADR-FE-002/003, ADR-API-001).                                                              |
| SEC-09 | `NEXT_PUBLIC_API_BASE_URL` solo apunta a backend EventFlow oficial (`/api/v1`); cualquier override en `.env.local` es responsabilidad del dev local.               |
| SEC-10 | El listener global de 401 limpia `queryClient` con `queryClient.clear()` antes de redirect para evitar leak de datos en cache tras revocación.                     |

### Negative Authorization Scenarios

* Cookie de sesión ausente → `authApi.me()` recibe 401 → `<SessionProvider>` expone `{ isAuthenticated: false }`. Sin redirect (la UX guard del middleware ya lo cubre).
* Cookie de sesión adulterada → backend rechaza con 401 → mismo comportamiento que ausente.
* Cualquier endpoint `(app)/*` o `(admin)/*` que el usuario invoque sin sesión válida → 401 → handler global redirige a `/login?from=<path>`.
* Cualquier endpoint que el usuario invoque con sesión válida pero rol insuficiente → 403 → NO redirige (middleware lo hace); el feature muestra mensaje de error con `errors.forbidden.*` (claves de US-105).

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

No aplica — esta historia no toca features IA. Sin embargo, `httpClient` entrega el flag `opts.isAI` que las historias IA usarán para extender timeout a 30 s (NFR-PERF-AI-001). El header `Accept-Language` propagado automáticamente cumple FR-I18N-005 (locale al LLM).

---

## 🎨 UX / UI Notes

| UX Area              | Notes                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Screens              | Sin pantallas nuevas propias. US-106 modifica `RootLayout` y entrega providers globales transparentes para el usuario final.                                                                      |
| Componentes          | `<QueryProvider>`, `<MSWProvider>`, `<SessionProvider>` (hidratado), `<ErrorBoundary>`. Ninguno es UI visual salvo `<ErrorBoundary>` en su fallback (página de error con copy i18n).               |
| Primary Action       | N/A                                                                                                                                                                                              |
| Secondary Actions    | N/A                                                                                                                                                                                              |
| Loading State        | `<SessionProvider>` expone `isLoading: true` durante el primer fetch de `/me`; los layouts (US-107) pueden mostrar skeleton.                                                                      |
| Error State          | `<ErrorBoundary>` fallback con `errors.envelope.UNEXPECTED` + `common.retry`. `useSession()` `isError: true` lo manejan los layouts.                                                              |
| Empty State          | `useSession()` `{ isAuthenticated: false }` es estado normal anónimo, no empty.                                                                                                                  |
| Success State        | N/A                                                                                                                                                                                              |
| Accessibility Notes  | `<ErrorBoundary>` fallback: `<main>` con `role="alert"`, `<h1>` único, botón con `type="button"` y focus visible. Devtools de TanStack solo en dev (no compromete A11Y prod).                    |
| Responsive Notes     | N/A en US-106 (sin UI compleja). El responsive del fallback es trivial (centrado, mobile-first).                                                                                                  |
| i18n Notes           | Copy del `<ErrorBoundary>` usa claves existentes de US-104/US-105. **No** se introducen claves nuevas (toda la copy vive en `errors.envelope.UNEXPECTED` y `common.retry`).                       |
| Currency Notes       | No aplica                                                                                                                                                                                        |

---

## 🛠 Technical Notes

### Frontend

| Topic            | Guidance                                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route / Page     | Sin rutas nuevas. Modifica `src/app/layout.tsx` para envolver providers.                                                                                                                                                                                                                                  |
| Components       | `<QueryProvider>`, `<MSWProvider>`, `<SessionProvider>` (reemplaza esqueleto US-105), `<ErrorBoundary>`. Todos en `src/shared/providers/` salvo `<SessionProvider>` que vive en `src/shared/auth-session/`.                                                                                                |
| State Management | `QueryClient` con `useState` lazy init; defaults seguros (AC-01). Sin Redux/Zustand (Doc 15 §13, ADR-FE-005).                                                                                                                                                                                              |
| Forms            | No aplica (sin formularios reales en US-106; RHF + Zod ya están instalados US-103).                                                                                                                                                                                                                       |
| API Client       | `src/shared/api-client/httpClient.ts` (wrapper fetch), `ApiError.ts`, `parseErrorEnvelope.ts`, `attachCorrelationId.ts` (helper). Patrón documentado para `featureApi`.                                                                                                                                  |
| Middleware       | Sin cambios en `src/middleware.ts` (heredado de US-104 + US-105).                                                                                                                                                                                                                                       |
| Path aliases     | `@/shared/api-client/...`, `@/shared/providers/...`, `@/shared/auth-session/...` heredados de US-103.                                                                                                                                                                                                   |
| MSW              | `src/tests/msw/handlers/index.ts`, `browser.ts`, `server.ts`. Worker init en `<MSWProvider>` Client Component con dynamic import. Server init en `vitest.setup.ts`.                                                                                                                                       |

---

### Backend

No aplica directamente. **Dependencia esperada con US-108**: el backend debe entregar `GET /api/v1/auth/me` con la response shape documentada en `PO/BA Decisions Applied → Endpoint GET /me contract`. Hasta entonces, MSW handler stub responde 401 anónimo.

---

### Database

No aplica.

---

### API

| Method | Endpoint              | Purpose                                                                                                |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------ |
| GET    | `/api/v1/auth/me`     | Consumido por `authApi.me()`. Owner: **US-108** (backend). MSW handler stub en US-106.                  |
| GET    | `/api/v1/health`      | Consumido opcionalmente por smoke. Owner: backend. MSW handler stub en US-106.                          |
| —      | (no introduce nuevos) | US-106 no introduce endpoints nuevos; entrega el cliente para consumirlos.                              |

---

### Observability / Audit

| Topic                             | Required                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correlation ID                    | **Yes** — `X-Correlation-Id` generado por request en `httpClient` (Doc 15 §40). Si backend devuelve uno en response header, se prefiere para `ApiError`. |
| Runtime logs                      | Dev: `httpClient.request`, `httpClient.error` con `{ method, path, correlationId, status, code }` sin body. Prod: silencio.                              |
| AdminAction                       | No aplica                                                                                                                                                |
| AIRecommendation runtime creation | No aplica                                                                                                                                                |
| CI logs                           | Lint + typecheck + test + build + test:e2e (heredado + nuevos tests del data layer)                                                                       |

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                  | Type           |
| ----- | --------------------------------------------------------------------------------------------------------- | -------------- |
| TS-01 | `<QueryClient>` defaults aplicados correctamente (staleTime, gcTime, retry, refetchOnFocus)                | Unit           |
| TS-02 | `httpClient` construye request con `Accept-Language`, `X-Correlation-Id`, `credentials: 'include'`         | Unit           |
| TS-03 | `httpClient` aplica timeout 10 s default y 30 s para `opts.isAI=true`                                      | Unit           |
| TS-04 | `httpClient` parsea response OK como `T`; envelope error → `ApiError`                                     | Unit           |
| TS-05 | `ApiError.isRetryable` correcto para status 0, 408, 429, 500-599 vs 400-499 restantes                     | Unit           |
| TS-06 | `parseErrorEnvelope` Zod valida estructura `{ error: { code, message, details? } }`                       | Unit           |
| TS-07 | `authApi.me()` invoca `httpGet('/auth/me')` y aplica mapper                                                | Unit           |
| TS-08 | `mapAuthSessionResponseToAuthSession` función pura preserva campos esperados                              | Unit           |
| TS-09 | `<SessionProvider>` con MSW 401 → `useSession()` retorna `{ isAuthenticated: false }`                     | Component+MSW  |
| TS-10 | `<SessionProvider>` con MSW 200 → `useSession()` retorna `{ isAuthenticated: true, role: 'organizer' }`  | Component+MSW  |
| TS-11 | `<ErrorBoundary>` renderiza fallback i18n cuando un hijo lanza                                              | Component      |
| TS-12 | Listener global 401 (no `['me']`) limpia cache y redirige                                                  | Integration    |
| TS-13 | Listener global 401 sobre `['me']` NO redirige                                                              | Integration    |
| TS-14 | MSW catch-all responde 501 + warn para endpoints no mockeados                                              | Integration    |
| TS-15 | E2E `data-layer.anonymous.spec.ts`: MSW 401 → DOM expone anónimo                                            | E2E            |
| TS-16 | E2E `data-layer.authenticated.spec.ts`: MSW 200 → DOM expone autenticado + rol                              | E2E            |
| TS-17 | E2E `data-layer.error-boundary.spec.ts`: render error → fallback con copy i18n                              | E2E            |
| TS-18 | Build check: `msw` no aparece en `.next/static/chunks/*.js`                                                | Build / CI     |
| TS-19 | Pipeline canónico Doc 21 §9.2 verde con tests nuevos                                                       | CI             |

---

### Negative Tests

| ID    | Scenario                                                                                                              | Expected Result                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| NT-01 | Backend caído → `httpClient` lanza `ApiError({ code: 'NETWORK', isRetryable: true })`                                  | TanStack Query reintenta 1 vez; `useSession()` `isError=true`   |
| NT-02 | Response HTML (no JSON) → `ApiError({ code: 'UNEXPECTED' })`                                                          | No revela HTML completo en `message`                            |
| NT-03 | Timeout 10 s vencido → `ApiError({ code: 'TIMEOUT', isRetryable: true })`                                              | `AbortController` cancela; retry una vez                        |
| NT-04 | `crypto.randomUUID` ausente en runtime test → fallback interno usado                                                   | UUID-like string generado                                       |
| NT-05 | 401 sobre query distinta de `['me']` → `queryClient.clear()` + redirect                                                | Cache vacío; navegación a `/login?from=...`                     |
| NT-06 | 403 → no redirige; feature ve `ApiError({ status: 403 })`                                                              | Componente muestra mensaje de error genérico                    |
| NT-07 | El PR introduce un `authApi.login` funcional con `POST /auth/login`                                                    | Revisión PR falla (VR-08; out of scope; US-AUTH-*)              |
| NT-08 | El PR introduce `eventsApi` o `vendorsApi`                                                                              | Revisión PR falla (VR-09)                                       |
| NT-09 | El PR introduce sidebars/navegación por rol                                                                             | Revisión PR falla (VR-10)                                       |
| NT-10 | El PR introduce token en `localStorage`                                                                                 | Revisión PR falla (SEC-03)                                      |
| NT-11 | El PR introduce Server Action (`'use server'`) o API Route (`src/app/api/*`)                                            | Revisión PR falla (SEC-08)                                      |
| NT-12 | Build incluye `msw` en chunks de prod                                                                                   | Build check / TS-18 falla → bloquea merge                       |

---

### AI Tests

No aplica para esta historia.

### Authorization Tests

| ID         | Scenario                                                                                          | Expected Result                                       |
| ---------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| AUTH-TS-01 | MSW `/auth/me` retorna 401 anónimo                                                                 | `useSession()` `{ isAuthenticated: false }`           |
| AUTH-TS-02 | MSW `/auth/me` retorna 200 con `role: 'organizer'`                                                 | `useSession()` `{ isAuthenticated: true, role: 'organizer' }` |
| AUTH-TS-03 | Sesión revocada mid-session (query externa retorna 401)                                            | Cache limpiado + redirect a `/login?from=...`         |
| AUTH-TS-04 | `useSession()` durante navegación pública → no redirige aunque 401                                  | Pass-through; estado anónimo                          |
| AUTH-TS-05 | Backend rechaza con 403 → no redirige; el feature recibe `ApiError({ status: 403 })`              | UX-only respeta middleware                            |

---

### Accessibility Tests

| ID         | Scenario                                                                  | Expected Result                                  |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| A11Y-TS-01 | `<ErrorBoundary>` fallback usa `<main>` + `role="alert"` + `<h1>` único   | Testing Library audit pasa                       |
| A11Y-TS-02 | Botón "Reintentar" del fallback es focusable y tiene `type="button"`     | Test component                                   |
| A11Y-TS-03 | Devtools de TanStack solo carga en dev (no compromete bundle prod ni A11Y) | Build check                                      |

---

## 📊 Business Impact

| Field               | Value                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| KPI Affected        | Salud técnica frontend; observabilidad (correlation ID en cada request); developer experience (MSW para desarrollo desacoplado); demo readiness académica (app funciona sin backend) |
| Expected Impact     | Desbloquea US-107, US-AUTH-*, y todas las historias frontend de feature. Habilita demo académica con MSW sin backend desplegado. Reduce coupling backend-frontend en desarrollo paralelo |
| Success Criteria    | PR mergeado + pipeline canónico verde + 19 tests nuevos verdes + MSW handlers operativos en dev y CI + `useSession()` hidratado con MSW                                              |
| Academic Demo Value | Demo completa con MSW: la app renderiza estados autenticado/anónimo sin requerir backend desplegado; evidencia clara de arquitectura UX-only (ADR-FE-003) y observabilidad básica   |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Crear `src/shared/api-client/{httpClient.ts, ApiError.ts, parseErrorEnvelope.ts, attachCorrelationId.ts, index.ts}`.
* Crear `src/shared/providers/QueryProvider.tsx` (Client Component con `<QueryClientProvider>` + Devtools).
* Crear `src/shared/providers/MSWProvider.tsx` (Client Component con dynamic import + worker.start).
* Crear `src/shared/providers/ErrorBoundary.tsx` (Client Component basado en `react-error-boundary`).
* Crear `src/shared/auth-session/{authApi.ts, authMappers.ts, types.ts, SessionProvider.tsx, useSession.ts, index.ts}` (reemplaza `<SessionProvider>` esqueleto de US-105).
* Modificar `src/app/layout.tsx`: envolver providers en el orden de AC-01.
* Crear `src/tests/msw/{handlers/index.ts, browser.ts, server.ts}`.
* Generar `public/mockServiceWorker.js` via `npx msw init public/`.
* Agregar `<div data-testid="session-state" data-testid-role>` placeholder en landing para E2E (revisar si es aceptable o se elimina post-merge).
* Instalar `react-error-boundary` (devDep o runtime según convención del repo).

### Potential Backend Tasks

* **No bloqueante para US-106** (MSW handlers stub son suficientes). **Acción coordinada con US-108**: implementar `GET /api/v1/auth/me` con la shape documentada en `PO/BA Decisions Applied`. Registrar como dependencia esperada.

### Potential Database Tasks

Ninguna.

### Potential AI / PromptOps Tasks

Ninguna.

### Potential QA Tasks

* Tests unit de `httpClient` (TS-01..TS-06).
* Tests unit de `authApi` + `mapAuthSessionResponseToAuthSession` (TS-07, TS-08).
* Tests component de `<SessionProvider>` con MSW (TS-09, TS-10).
* Tests component de `<ErrorBoundary>` (TS-11).
* Tests integration del listener 401 (TS-12, TS-13).
* Tests E2E Playwright (TS-15..TS-17).
* Build check: MSW no en chunks prod (TS-18).
* A11Y tests del `<ErrorBoundary>` fallback (A11Y-TS-01..03).

### Potential DevOps / Config Tasks

* Agregar `NEXT_PUBLIC_API_MOCKING=disabled` a `.env.local.example`.
* Documentar en `web/README.md` la activación de MSW dev (`NEXT_PUBLIC_API_MOCKING=enabled`).
* Confirmar que `public/mockServiceWorker.js` se versiona (no se gitignora).
* (Opcional) Agregar build check script (`scripts/check-no-msw-in-prod.sh`) que falla si `grep -l "msw" .next/static/chunks/*.js` devuelve resultados.

### Potential Documentation Tasks

* `web/README.md` § "Data Layer": `<QueryClientProvider>` defaults, `httpClient` API, `ApiError`, patrón `featureApi → mapper → frontend model`, MSW activation, troubleshooting.
* `web/README.md` § "Cookies": agregar `eventflow_session` (HTTP-only) y referenciar `eventflow_locale` (US-104) + `eventflow_role` (US-105).
* Housekeeping post-merge: amender Doc 15 §21.2 retirando `permissions` y `locale` de `SessionContext` (alineación con decisión PO/BA).

---

## ✅ Definition of Ready

* [x] Rol claro: System.
* [x] Goal técnico claro: data layer global con TanStack Query + httpClient + MSW + SessionProvider hidratado + ErrorBoundary.
* [x] Boundary formalizado con US-103/104/105/107/108/AUTH-*.
* [x] Decisiones cerradas (Doc 15 §22-26, §40, §43; ADR-FE-001/002/003/005/009/015; Doc 16; Doc 19): QueryClient defaults, httpClient API, ApiError shape, MSW activation strategy, retry policy, 401/403 handling, endpoint `/me` contract esperado.
* [x] Acceptance Criteria testables y atómicos (AC-01..AC-11).
* [x] Edge cases documentados (EC-01..EC-06: backend caído, non-JSON, sesión expirada, MSW init fail, `randomUUID` ausente, 401 mid-navegación).
* [x] Out of Scope explícito (login real, cookies backend, layouts, feature APIs, RHF forms, Server Actions).
* [x] Validation rules y SEC rules claros (VR-01..VR-14, SEC-01..SEC-10).
* [x] Tests definidos (TS-01..TS-19, NT-01..NT-12, AUTH-TS-01..05, A11Y-TS-01..03).
* [x] Trazabilidad a Doc 15/16/19/20/22 y ADRs FE-001/002/003/005/009/015.
* [ ] Tech Lead frontend validó.

---

## 🏁 Definition of Done

* [ ] `<QueryClientProvider>`, `<MSWProvider>`, `<SessionProvider>` hidratado, `<ErrorBoundary>` versionados y montados en `RootLayout` en el orden de AC-01.
* [ ] `shared/api-client/{httpClient, ApiError, parseErrorEnvelope}` versionados con tests unit.
* [ ] `shared/auth-session/{authApi, authMappers, SessionProvider, useSession}` versionados; `useSession()` reemplaza al esqueleto de US-105 sin romper consumidores.
* [ ] MSW configurado: worker en `public/mockServiceWorker.js`, handlers iniciales (`/auth/me`, `/health`, catch-all), `vitest.setup.ts` con server.
* [ ] `.env.local.example` actualizado con `NEXT_PUBLIC_API_MOCKING=disabled`.
* [ ] Tests unit/component/integration/E2E verdes (TS-01..TS-19, NT-01..NT-12, AUTH-TS-01..05).
* [ ] Build check: MSW no aparece en chunks de prod (TS-18 / VR-05).
* [ ] Pipeline canónico Doc 21 §9.2 verde.
* [ ] `web/README.md` § "Data Layer" + § "Cookies" actualizados.
* [ ] PR revisado por Tech Lead frontend.

---

## 📝 Notes

* US-106 cierra la foundation técnica del data layer. A partir de aquí, **cada historia de feature aporta su propio `featureApi`, mappers, frontend models, hooks TanStack Query y MSW handlers** siguiendo el patrón documentado.
* El `<SessionProvider>` esqueleto de US-105 se reemplaza completo. **Importación inalterada** para consumidores (`import { useSession } from '@/shared/auth-session'`) — solo cambia la implementación interna.
* Las claves i18n se reusan de US-104/US-105 (`errors.envelope.UNEXPECTED`, `common.retry`); US-106 NO introduce claves nuevas.
* `react-error-boundary` se elige por madurez y simplicidad sobre implementación custom (VR-14).
* MSW handler set inicial es **minimal**: solo lo necesario para que la app renderice sin backend. Cada historia de feature lo expande.

### Documentation Alignment Required (no bloqueante)

* **Doc 15 §21.2 `SessionContext`**: el documento original menciona `provee user, role, permissions, isAuthenticated, locale`. US-106 entrega solo `{ user, role, isAuthenticated, isLoading, isError, refetch }`. Razón: `permissions` es derivable del backend per-request (ADR-FE-003); `locale` ya vive en `useLocale()` (US-104) — duplicar generaría inconsistencias. Acción: amender Doc 15 §21.2 post-merge para reflejar la shape efectiva.
* **Doc 15 §23.1 `Authorization`**: el documento menciona `cookie automática o Bearer si el Security Design lo decide`. US-106 adopta **cookie HTTP-only** (Doc 19 + decisión US-105 / US-108). Acción: amender Doc 15 §23.1 retirando la rama "Bearer" como opción MVP (queda Future).
* **Contrato `GET /api/v1/auth/me`**: la shape exacta de la response está documentada en `PO/BA Decisions Applied`. Coordinar con US-108 owner para que el backend respete la shape. Si surge divergencia, abrir DR explícito antes de cerrar US-108.
* **Cookie naming `eventflow_session`**: US-105 declaró el nombre; US-106 lo lee transparentemente vía `credentials: 'include'`. Doc 19 debe ser amended (housekeeping de US-105 + US-106 + US-108) para listar `eventflow_session` (HTTP-only) y `eventflow_role` (no HTTP-only).

### Coordinación con historias siguientes

* **US-107** consume `useSession()` para mostrar/ocultar nav por rol; el contrato ya está fijo.
* **US-AUTH-*** agrega `authApi.login`, `authApi.logout`, `authApi.register`, `authApi.forgotPassword` en el mismo archivo `src/shared/auth-session/authApi.ts` o lo migra a `features/auth/api/` según prefiera el equipo. Recomendado mantener `authApi.me` accesible desde `<SessionProvider>` sin importar el split.
* **US-108** implementa el endpoint `GET /api/v1/auth/me` real y la emisión de cookies en login/logout.
* **Historias por feature** agregan sus `featureApi`, mappers, hooks y MSW handlers siguiendo el patrón documentado.
