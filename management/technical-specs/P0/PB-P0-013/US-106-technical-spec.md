# Technical Specification — US-106: Configurar TanStack Query global + `httpClient` con interceptores (Authorization cookie, `Accept-Language`, `X-Correlation-Id`, `ApiError`) + MSW para dev y tests + hidratación real de `<SessionProvider>` vía `GET /me` + `<ErrorBoundary>` raíz

## 1. Metadata

| Field                                  | Value                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                          | US-106                                                                                                                                 |
| Source User Story                      | `management/user-stories/US-106-tanstack-query-and-msw.md`                                                                              |
| Decision Resolution Artifact           | No existe — la historia refinada incorporó 22 decisiones directamente en `PO/BA Decisions Applied` (sin preguntas bloqueantes)         |
| Priority                               | P0                                                                                                                                     |
| Backlog ID                             | PB-P0-013                                                                                                                              |
| Backlog Title                          | Frontend Data Layer: TanStack Query + MSW + Layouts                                                                                    |
| Backlog Execution Order                | 13 (de 18 items P0 priorizados)                                                                                                        |
| User Story Position in Backlog Item    | 1 de 2                                                                                                                                 |
| Related User Stories in Backlog Item   | US-106 (data layer foundation), US-107 (layouts completos por rol)                                                                      |
| Epic                                   | EPIC-FE-001 — Frontend Next.js Application Foundation                                                                                  |
| Backlog Item Dependencies              | PB-P0-012 (US-103/104/105 mergeadas)                                                                                                    |
| Feature                                | Data layer foundation — `QueryClient` global + `httpClient` + MSW + hidratación `SessionContext`                                       |
| Module / Domain                        | Platform / FE / Data Layer                                                                                                             |
| User Story Status                      | Approved with Minor Notes                                                                                                              |
| Backlog Alignment Status               | Found                                                                                                                                  |
| Technical Spec Status                  | Ready for Task Breakdown                                                                                                               |
| Created Date                           | 2026-06-22                                                                                                                             |
| Last Updated                           | 2026-06-22                                                                                                                             |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P0-013 — Frontend Data Layer: TanStack Query + MSW + Layouts**. Item P0 que entrega la capa de datos del frontend (TanStack Query + MSW) y los layouts/navegación por rol. **Depende de PB-P0-012** (US-103/104/105 mergeadas: bootstrap + i18n + route groups con role guard middleware). Trazabilidad backlog: Doc 15 · ADR-FE-001. Notas backlog: "MSW alineado al contrato OpenAPI de PB-P0-005".

### Execution Order Rationale

PB-P0-013 ocupa la **posición 13 de 18** entre los items P0 y **depende exclusivamente de PB-P0-012**. US-106 es la **primera historia** del item y la dependencia bloqueante de US-107 (layouts completos consumen `useSession()` hidratado por US-106). Una vez mergeada US-106:

* **US-107** puede iniciar inmediatamente (su `<UserMenu>` y `<RoleGuard>` consumen `useSession()`).
* **US-AUTH-*** puede iniciar (consume `httpClient` para `/auth/login`, `/auth/logout`, `/auth/register`, `/auth/forgot-password`).
* **Todas las historias frontend de feature** pueden iniciar adoptando el patrón `feature/api/<feature>Api.ts → mapper → frontend model` documentado.
* La **demo académica** puede correr con MSW sin backend desplegado.

US-106 NO depende técnicamente de US-108 (emisión de cookies): el MSW handler stub para `GET /auth/me` cubre el caso anónimo y el caso autenticado para tests. Cuando US-108 esté lista, el endpoint real reemplaza al handler MSW sin cambios en el código frontend.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                                                                            | Suggested Order |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| US-106     | Data layer foundation — `<QueryClientProvider>` + `httpClient` + MSW + `<SessionProvider>` hidratado + `<ErrorBoundary>` + patrón `featureApi` | 1               |
| US-107     | Layouts completos por rol — consume `useSession()` para mostrar nav, avatar, role guard UX                                       | 2               |

---

## 3. Executive Technical Summary

US-106 entrega la **capa de datos global del frontend** sobre la foundation de PB-P0-012, cumpliendo Doc 15 §21-26 / §40 / §43, Doc 16 (envelope error y headers), Doc 19 (cookie HTTP-only), Doc 20 (testing) y ADR-FE-001/002/003/005/009/015. La historia introduce 7 piezas integradas:

1. **`<QueryProvider>`** Client Component (`src/shared/providers/QueryProvider.tsx`) con `useState(() => new QueryClient({...}))` (instancia única por request — patrón oficial App Router) y defaults: `staleTime: 30_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: true`, `retry` con lambda que excluye errores no retryables (401/403/404/422), `mutations.retry: 0`. `<ReactQueryDevtools>` cargado vía `dynamic(..., { ssr: false })` solo en dev.
2. **`shared/api-client/`** con `httpClient.ts` (wrapper sobre `fetch`), `ApiError.ts`, `parseErrorEnvelope.ts` (Zod), `attachCorrelationId.ts`, `index.ts` barrel. Interceptores: `credentials: 'include'`, `Accept-Language` vía `attachLocaleHeader` (US-104), `X-Correlation-Id` UUID v4 con `crypto.randomUUID()`, `Content-Type: application/json`, `AbortController` con timeout 10 s (30 s para `opts.isAI`). Errores tipados (`ApiError` con `code`, `message`, `details`, `correlationId`, `status`, `isRetryable`).
3. **MSW 2.x** configurado: worker (`src/tests/msw/browser.ts`), server Node (`src/tests/msw/server.ts`), handlers iniciales (`src/tests/msw/handlers/index.ts`): `GET /api/v1/auth/me` → 401 anónimo, `GET /api/v1/health` → 200, catch-all `*/api/v1/*` → 501 + warn. Activación: dev opt-in con `NEXT_PUBLIC_API_MOCKING=enabled` via `<MSWProvider>` con dynamic import; tests Vitest con `setupServer()` en `vitest.setup.ts`; prod nunca incluye MSW (verificable con build check).
4. **`<SessionProvider>` hidratado** (`src/shared/auth-session/SessionProvider.tsx`) que reemplaza el esqueleto de US-105 sin cambiar la API de `useSession()`. Internamente usa `useQuery({ queryKey: ['me'], queryFn: () => authApi.me(), staleTime: 60_000, retry: false })`. `useSession()` retorna `{ user, role, isAuthenticated, isLoading, isError, refetch }`. 401 = anónimo (no error).
5. **`shared/auth-session/authApi.ts`** con `authApi.me(): Promise<AuthSession>` que invoca `httpGet<AuthSessionResponseDTO>('/auth/me')` y aplica `mapAuthSessionResponseToAuthSession`. Primer cliente real bajo el patrón `featureApi → mapper → frontend model`.
6. **`<ErrorBoundary>` raíz** (`src/shared/providers/ErrorBoundary.tsx`) basado en `react-error-boundary` (dep nueva aprobada en el approval gate), envuelve `<NextIntlClientProvider>` con copy i18n `errors.envelope.UNEXPECTED` + `common.retry` (claves heredadas de US-104/105).
7. **Listener global 401/403** vía `QueryCache({ onError })` del `QueryClient`: 401 sobre query distinta de `['me']` → `queryClient.clear()` + `router.replace('/login?from=<path>')`; 401 sobre `['me']` → no redirect; 403 → solo log dev.

El `RootLayout` queda como `<html lang={locale}><body><ErrorBoundary><QueryProvider><MSWProvider><SessionProvider><NextIntlClientProvider>{children}</NextIntlClientProvider></SessionProvider></MSWProvider></QueryProvider></ErrorBoundary></body></html>` (orden formalizado en AC-01).

La historia **NO** introduce formularios de login/register/logout (US-AUTH-*), **NO** emite cookies de sesión (US-108), **NO** monta layouts por rol (US-107), **NO** entrega feature-specific API clients, **NO** introduce `<ToastProvider>`/`<ThemeProvider>`, **NO** usa Server Actions ni API Routes BFF (Doc 15 §6, ADR-FE-002/003, ADR-API-001), **NO** introduce tokens en localStorage. Cuatro `Documentation Alignment Required` no bloqueantes (Doc 15 §21.2 `permissions`/`locale` removidos del context; Doc 15 §23.1 cookie HTTP-only adoptada vs Bearer opcional; Doc 19 cookies por listar; contrato `GET /auth/me` lo formaliza US-108).

---

## 4. Scope Boundary

### In Scope

* `web/src/shared/providers/QueryProvider.tsx` (Client Component con `<QueryClientProvider>` + Devtools dev).
* `web/src/shared/providers/MSWProvider.tsx` (Client Component con dynamic import de MSW worker en dev).
* `web/src/shared/providers/ErrorBoundary.tsx` (Client Component con `react-error-boundary`).
* `web/src/shared/api-client/httpClient.ts` (`httpGet`/`httpPost`/`httpPatch`/`httpPut`/`httpDelete`).
* `web/src/shared/api-client/ApiError.ts` (`class ApiError extends Error`).
* `web/src/shared/api-client/parseErrorEnvelope.ts` (helper Zod).
* `web/src/shared/api-client/attachCorrelationId.ts` (helper con `crypto.randomUUID()` + fallback).
* `web/src/shared/api-client/index.ts` (barrel).
* `web/src/shared/auth-session/types.ts` (`User`, `Role`, `AuthSession`, `AuthSessionResponseDTO`).
* `web/src/shared/auth-session/authApi.ts` (`authApi.me()`).
* `web/src/shared/auth-session/authMappers.ts` (`mapAuthSessionResponseToAuthSession`).
* `web/src/shared/auth-session/SessionProvider.tsx` (reemplaza el esqueleto de US-105).
* `web/src/shared/auth-session/useSession.ts` (hook que consume el contexto).
* `web/src/shared/auth-session/onError401.ts` (handler global del `QueryCache.onError`).
* `web/src/shared/auth-session/index.ts` (barrel; preserva API existente para que `import { useSession } from '@/shared/auth-session'` siga funcionando).
* `web/src/tests/msw/handlers/index.ts` (handlers iniciales: `/auth/me`, `/health`, catch-all).
* `web/src/tests/msw/handlers/auth.ts` (handler `/auth/me` con override testing).
* `web/src/tests/msw/handlers/health.ts` (handler `/health`).
* `web/src/tests/msw/browser.ts` (`setupWorker`).
* `web/src/tests/msw/server.ts` (`setupServer`).
* `web/public/mockServiceWorker.js` (generado por `npx msw init public/`; versionado).
* Modificación de `web/src/app/layout.tsx` (envolver providers en el orden formalizado).
* Modificación de `web/vitest.setup.ts` (MSW `server.listen/resetHandlers/close`).
* Modificación de `web/.env.local.example` (`NEXT_PUBLIC_API_MOCKING=disabled`).
* Instalación de `react-error-boundary` como dep runtime (excepción aprobada al stack Doc 15 §7).
* Build check (`scripts/check-no-msw-in-prod.mjs` o equivalente) que falla si `msw` aparece en chunks de prod.
* `web/src/tests/unit/**` cobertura unit de `httpClient`, `ApiError`, `parseErrorEnvelope`, `authApi`, `authMappers`, `SessionProvider`.
* `web/src/tests/integration/data-layer/onError-401.test.tsx` (handler global 401).
* `web/src/tests/e2e/data-layer.{anonymous,authenticated,error-boundary}.spec.ts` (3 E2E nuevos).
* Actualización de `web/README.md` con secciones "Data Layer" y "Cookies".

### Out of Scope

* **Login/Register/Forgot-password/Logout funcionales** (RHF + Zod + submit) → **US-AUTH-***. US-106 entrega solo el cliente y la query `useMe()` consumida por `<SessionProvider>`.
* **Emisión de cookies** (`eventflow_session` + `eventflow_role`) por backend → **US-108**.
* **Layouts completos por rol** (sidebars, headers, breadcrumbs, navegación visual) → **US-107**.
* **Feature-specific API clients** (`eventsApi`, `quotesApi`, `vendorsApi`, `aiApi`, `adminApi`, etc.) → cada historia de feature. US-106 solo entrega `authApi.me()`.
* **Optimistic updates por feature** → historias de feature.
* **Mutaciones globales** (login, logout, etc.) → US-AUTH-*.
* **`<ToastProvider>`** y notificaciones globales → US-107 o historia UI dedicada.
* **`<ThemeProvider>`** → Future.
* **TanStack Table 8.x** → diferida (Doc 15 §7 "selectivo").
* **Sentry / observability cliente full** → Future.
* **OpenAPI codegen / contract tests automatizados** → diferido (mappers + Zod por feature son suficientes en MVP).
* **`permissions` en `useSession()`** → diferido (derivable en backend per-request).
* **`locale` en `useSession()`** → vive en `useLocale()` (US-104); no duplicar.
* **Refresh token rotation** → no aplica (cookie de sesión backend; el backend renueva por su cuenta).
* **Server Actions, API Routes BFF, proxy a OpenAI** → prohibidos (Doc 15 §6, ADR-FE-002/003, ADR-API-001).

### Explicit Non-Goals

* No introducir lógica de autorización efectiva en cliente (SEC-01, ADR-FE-003).
* No decodificar JWT ni validar firma criptográfica (SEC-02).
* No introducir tokens en localStorage / sessionStorage (SEC-03, ADR-FE-015).
* No incluir MSW en chunks de producción (SEC-07).
* No alterar el comportamiento del `localeMiddleware` ni del `roleGuardMiddleware` (heredados de US-104/US-105).
* No introducir Sentry, telemetría externa, ni APM en cliente (Future).
* No modificar el backend ni la base de datos.
* No agregar dependencias al stack fuera de `react-error-boundary` (excepción aprobada). Cualquier otra dep requiere ADR.

---

## 5. Architecture Alignment

### Backend Architecture

No aplica directamente. La dependencia esperada con US-108 está documentada: el backend debe entregar `GET /api/v1/auth/me` con la response shape `{ user: { id, email, displayName }, role, locale }` (response 200) o `{ error: { code: 'UNAUTHENTICATED', message } }` (401). Hasta entonces, MSW handler stub cubre. Sin cambios al monolito modular ni al schema Prisma.

### Frontend Architecture

Cumple íntegramente Doc 15:

* **Doc 15 §11**: providers globales en `RootLayout` (Server Component que renderiza Client Components providers).
* **Doc 15 §21.1-21.4**: cookie HTTP-only `eventflow_session` HTTP-only `Secure` `SameSite=Lax`; frontend NO lee tokens; `credentials: 'include'` propaga la cookie automáticamente; el middleware (US-105) ya verifica presencia.
* **Doc 15 §22**: frontend autorización es UX (`<RoleGuard>` lo implementa US-107). US-106 garantiza que el listener global 401 limpia cache y redirige.
* **Doc 15 §23.1**: `httpClient` wrapper sobre `fetch` con interceptores `Authorization` (cookie), `Accept-Language` (US-104), `X-Correlation-Id` (UUID v4), envelope error parsing, configurable por `NEXT_PUBLIC_API_BASE_URL`.
* **Doc 15 §23.3**: errores tipados `ApiError`; retry en TanStack Query (no en `httpClient`); 401/403/422 no se reintentan; timeouts 10 s default / 30 s para IA.
* **Doc 15 §24**: patrón `[Backend DTO] → [Mapper] → [Frontend Model] → [UI]` con `authApi` como primer caso real.
* **Doc 15 §26**: TanStack Query con `QueryClient` global, defaults, devtools.
* **Doc 15 §40**: correlation ID generado client-side, preferido el del response header si el backend lo devuelve.
* **Doc 15 §43.3**: MSW para dev + tests, alineado al contrato OpenAPI (PB-P0-005).
* **ADR-FE-001** (Next.js + App Router), **ADR-FE-002** (REST + TanStack Query, sin Server Actions), **ADR-FE-003** (frontend UX-only), **ADR-FE-005** (TanStack Query única solución server state), **ADR-FE-009** (MSW como mocking compartido), **ADR-FE-015** (middleware UX).

### Database Architecture

No aplica. US-106 no toca persistencia ni schema Prisma.

### API Architecture

* **No introduce endpoints**. Documenta y consume `GET /api/v1/auth/me`.
* **Envelope error**: alineado a Doc 16 — `{ error: { code: string, message: string, details?: unknown } }` con `X-Correlation-Id` opcional en response header.
* **Headers**: `Accept-Language` outbound desde locale activo; `X-Correlation-Id` outbound generado en cliente; el backend puede devolverlo en response (preferido en `ApiError`).
* **Timeouts**: 10 s default; 30 s para `opts.isAI=true` (NFR-PERF-AI-001 futuro).

### AI / PromptOps Architecture

No aplica directamente. `httpClient.opts.isAI` queda preparado para historias IA que requieran timeout extendido (FR-I18N-005 / BR-AI-011: `Accept-Language` propagado al LLM via backend cumple la cadena).

### Security Architecture

* **Doc 19**: cookie HTTP-only `eventflow_session` (US-108 la emite). US-106 la propaga vía `credentials: 'include'` sin leerla. Sin tokens en localStorage. Cookie auxiliar `eventflow_role` (no HTTP-only, US-105) la lee solo el middleware UX.
* **ADR-FE-003** invariante: `useSession()` solo refleja `GET /me`; cualquier 401/403 del backend es palabra final.
* **ADR-FE-015**: el middleware UX-only ya vive en US-105; US-106 NO duplica lógica de autorización.
* **No Server Actions, no API Routes BFF**: prohibidos.
* **MSW prohibido en chunks de producción** — build check (TS-18 / VR-05 / SEC-07).
* **Logs sin PII / cookies / body**: el `httpClient` solo loguea `{ method, path, correlationId, status, code }` en dev.

### Testing Architecture

* **Vitest + Testing Library + jsdom**: unit (httpClient interceptores, ApiError, parseErrorEnvelope, authApi, mappers) + component (`<SessionProvider>` con MSW server, `<ErrorBoundary>`).
* **MSW 2.x**: `setupServer()` en `vitest.setup.ts` con `onUnhandledRequest: 'error'` para evitar fugas; `resetHandlers()` después de cada test.
* **Playwright**: 3 E2E nuevos (`data-layer.anonymous`, `data-layer.authenticated`, `data-layer.error-boundary`) usando MSW en dev mode (`NEXT_PUBLIC_API_MOCKING=enabled`) o cookies de prueba.
* **Build check**: script Node que falla si `grep -l "msw" .next/static/chunks/*.js` devuelve resultados (TS-18, VR-05).
* **Pipeline canónico Doc 21 §9.2** verde.

---

## 6. Functional Interpretation

| Acceptance Criterion                                                                                                                              | Technical Interpretation                                                                                                                                                                                                                                                                                                              | Impacted Layer(s)                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| AC-01 `<QueryClientProvider>` con defaults seguros + orden de providers                                                                            | Crear `<QueryProvider>` con `useState(() => new QueryClient({ defaultOptions: { queries: { staleTime, gcTime, refetchOnWindowFocus, refetchOnReconnect, retry, retryDelay }, mutations: { retry: 0 } } }))`. Devtools con dynamic import dev-only. Modificar `RootLayout` para envolver providers en el orden de AC-01.              | FE Providers / Layout              |
| AC-02 `httpClient` con interceptores + `ApiError` tipado                                                                                          | Implementar funciones `httpGet/httpPost/httpPatch/httpPut/httpDelete` con `fetch` + `credentials: 'include'` + `attachLocaleHeader` (US-104) + `crypto.randomUUID()` → header `X-Correlation-Id` + `Content-Type: application/json` + `AbortController` + timeout 10 s / 30 s para IA + `parseErrorEnvelope` Zod + `ApiError.isRetryable` derivado por status. | FE API Client                       |
| AC-03 MSW dev + tests con handlers iniciales                                                                                                      | Crear handlers (`auth/me` 401 default, `health` 200, catch-all 501 + warn), `browser.ts` (worker), `server.ts` (Node server), `<MSWProvider>` Client con dynamic import + `worker.start({ onUnhandledRequest: 'warn' })`. `vitest.setup.ts` con `server.listen/resetHandlers/close`. `public/mockServiceWorker.js` generado con `npx msw init public/`. | FE MSW / Tests                      |
| AC-04 Hidratación real `<SessionProvider>` vía `useQuery(['me'])` + `authApi.me()`                                                                | Reemplazar `<SessionProvider>` esqueleto de US-105 por implementación con `useQuery({ queryKey: ['me'], queryFn: authApi.me, staleTime: 60_000, retry: false })`. `useSession()` retorna `{ user, role, isAuthenticated, isLoading, isError, refetch }`. 401 = anónimo. Crear `authApi.me()` + `mapAuthSessionResponseToAuthSession()` puro testeable. | FE Session / API                    |
| AC-05 `<ErrorBoundary>` raíz con copy i18n                                                                                                        | Crear `<ErrorBoundary>` Client basado en `react-error-boundary` (`FallbackComponent` con `<h1>{t('errors.envelope.UNEXPECTED')}</h1>` + `<button onClick={resetErrorBoundary}>{t('common.retry')}</button>`). `console.error('ErrorBoundary caught', error, info)`. NO captura errores de queries (TanStack los maneja).            | FE Error Handling                   |
| AC-06 Listener global 401 + 403                                                                                                                  | `new QueryClient({ queryCache: new QueryCache({ onError: (error, query) => onError401(error, query, queryClient, router, pathname) }) })`. `onError401`: si `error.status === 401 && queryKey !== ['me']` → `queryClient.invalidateQueries(['me'])` + `queryClient.clear()` + `router.replace('/login?from=' + encodeURIComponent(...))` solo si path en `(app)`/`(admin)`. 403 → log dev. | FE Session / Routing                 |
| AC-07 Variables de entorno                                                                                                                        | Agregar `NEXT_PUBLIC_API_MOCKING=disabled` a `web/.env.local.example`. Las demás keys (US-103, US-104, US-105) ya existen.                                                                                                                                                                                                            | DevOps / Config                      |
| AC-08 Patrón `featureApi → mapper → frontend model` documentado                                                                                   | Documentar en `web/README.md` § "Data Layer" el patrón con `authApi` como ejemplo: DTO espejo backend → mapper puro → frontend model. Reglas: no devolver DTOs crudos, errores tipados como `ApiError`, MSW handler por endpoint, mapper testeado.                                                                                  | Documentation                        |
| AC-09 Tests unit + integration                                                                                                                    | Implementar suites Vitest en `tests/unit/api-client/`, `tests/unit/auth-session/`, `tests/integration/data-layer/` cubriendo httpClient interceptors, ApiError, parseErrorEnvelope, authApi, mappers, SessionProvider con MSW, onError-401.                                                                                            | QA / Testing                         |
| AC-10 Tests E2E Playwright con MSW                                                                                                                | Implementar 3 specs en `tests/e2e/`: `data-layer.anonymous.spec.ts`, `data-layer.authenticated.spec.ts`, `data-layer.error-boundary.spec.ts`. Componente test-only en landing con `data-testid="session-state"` y `data-testid="session-role"` para assertions.                                                                          | QA / E2E                             |
| AC-11 Pipeline verde + sin artefactos fuera de scope                                                                                              | CI: `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e` exit 0. Build check de MSW en chunks. Revisión PR contra lista negativa (VR-08..VR-12).                                                                                                                                       | CI / Code Review                     |

---

## 7. Backend Technical Design

No aplica. US-106 no toca backend, no agrega endpoints, no consume APIs propias, no interactúa con el modular monolith.

**Dependencia esperada con US-108**: el backend debe entregar `GET /api/v1/auth/me` con:

* Response 200: `{ user: { id: string, email: string, displayName: string }, role: 'organizer' | 'vendor' | 'admin', locale: string }`.
* Response 401: `{ error: { code: 'UNAUTHENTICATED', message: string } }`.
* Cookies de sesión emitidas:
  * `Set-Cookie: eventflow_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=<ttl>`
  * `Set-Cookie: eventflow_role=<organizer|vendor|admin>; Secure; SameSite=Lax; Path=/; Max-Age=<ttl>` (no HttpOnly; US-105)
* Endpoint debe responder con `X-Correlation-Id` header eco si el cliente lo provee.

Registrar como `Documentation Alignment Required` con Doc 19 (cookies) y Doc 16 (contrato `/auth/me`).

---

## 8. Frontend Technical Design

### Routes / Pages

Sin rutas nuevas. **Modifica** `web/src/app/layout.tsx` (creado por US-104, modificado por US-105). El orden final de envoltura es:

```
<html lang={locale}>
  <body>
    <ErrorBoundary>
      <QueryProvider>
        <MSWProvider>
          <SessionProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              {children}
            </NextIntlClientProvider>
          </SessionProvider>
        </MSWProvider>
      </QueryProvider>
    </ErrorBoundary>
  </body>
</html>
```

`<NextIntlClientProvider>` queda anidado dentro de `<SessionProvider>` porque algunos componentes (ej. `<ErrorBoundary>` fallback) usan `useTranslations()` que requiere el provider de next-intl.

### Components

| Componente              | Tipo            | Responsabilidad                                                                                                            |
| ----------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `<QueryProvider>`       | Client          | Inicializa `QueryClient` con defaults; monta `<ReactQueryDevtools>` dev-only via dynamic import.                              |
| `<MSWProvider>`         | Client          | Si `NEXT_PUBLIC_API_MOCKING === 'enabled'`, dynamic import `./tests/msw/browser` y arranca worker. Silencioso si deshabilitado. |
| `<ErrorBoundary>`       | Client          | Wrapper sobre `react-error-boundary`. Captura errores de render. Fallback con copy i18n.                                       |
| `<SessionProvider>`     | Client          | Reemplaza esqueleto US-105. Usa `useQuery(['me'])` para hidratar `SessionClaims`. Expone `useSession()`.                       |

### Forms

No aplica.

### State Management

* **`QueryClient`** instancia única por request inicializada con `useState`. Defaults:
  ```ts
  {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false
        if (error instanceof ApiError) return error.isRetryable
        return true
      },
      retryDelay: 1_000,
    },
    mutations: { retry: 0 },
  }
  ```
* **`QueryCache.onError`** global con `onError401`.
* **`useSession()`** consume `useQuery(['me'])` cacheado con `staleTime: 60_000`, `retry: false`. Devuelve `{ user, role, isAuthenticated, isLoading, isError, refetch }`.

### Data Fetching

`httpClient` API (TypeScript):

```ts
type HttpClientOptions<B = unknown> = {
  body?: B
  query?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
  headers?: Record<string, string>
  timeoutMs?: number
  isAI?: boolean
}

httpGet<T>(path: string, opts?: HttpClientOptions): Promise<T>
httpPost<T, B = unknown>(path: string, opts?: HttpClientOptions<B>): Promise<T>
httpPatch<T, B = unknown>(path: string, opts?: HttpClientOptions<B>): Promise<T>
httpPut<T, B = unknown>(path: string, opts?: HttpClientOptions<B>): Promise<T>
httpDelete<T>(path: string, opts?: HttpClientOptions): Promise<T>
```

Flujo por request:

1. Concatenar `process.env.NEXT_PUBLIC_API_BASE_URL` + `path` + `?query`.
2. Aplicar `credentials: 'include'`.
3. Resolver headers:
   * Mezclar `attachLocaleHeader()` (US-104) → `Accept-Language`.
   * Generar `X-Correlation-Id` con `attachCorrelationId()` (UUID v4 via `crypto.randomUUID()`; fallback `Math.random().toString(36).repeat(2)` solo en tests cuando `crypto.randomUUID` no existe).
   * Agregar `Content-Type: application/json` si hay body.
   * Mezclar `opts.headers`.
4. Si hay body, serializar con `JSON.stringify`.
5. Crear `AbortController` + `setTimeout(timeoutMs ?? (isAI ? 30_000 : 10_000))`. Si caller provee `signal`, componer con `AbortSignal.any([abortController.signal, opts.signal])` cuando esté disponible; si no, preferir el del caller.
6. `await fetch(url, { method, headers, body, credentials, signal })`.
7. Si `signal.aborted` y razón es timeout → `throw new ApiError({ code: 'TIMEOUT', status: 0, isRetryable: true })`.
8. Si `fetch` lanza `TypeError` (network) → `throw new ApiError({ code: 'NETWORK', status: 0, isRetryable: true })`.
9. Si `response.ok === false`:
   * Intentar `response.json()` → parsear con `parseErrorEnvelope` (Zod schema `{ error: { code: string, message: string, details?: unknown } }`).
   * Si parse falla → `ApiError({ code: 'UNEXPECTED', message: 'Invalid response body', status: response.status })`.
   * Preservar `correlationId` desde `response.headers.get('X-Correlation-Id')` si existe.
   * `isRetryable` derivado: `true` para 408, 429, 500-599; `false` para 4xx restantes.
10. Si OK → `return await response.json() as T` (sin validación adicional; la valida `featureApi`).

### Loading / Empty / Error / Success States

* **Loading**: `<SessionProvider>` expone `isLoading: true` mientras `useQuery(['me'])` corre. Los layouts (US-107) renderizan skeleton.
* **Empty**: `{ isAuthenticated: false }` con 401 es estado normal anónimo (no error).
* **Error**: `<ErrorBoundary>` solo captura errores de render. Errores de query los manejan los consumidores via `useQuery().isError` + el handler global `onError401`.

### Accessibility

* `<ErrorBoundary>` fallback usa `<main role="alert">` + `<h1>` único + `<button type="button">` con focus visible (clases Tailwind `focus:outline-none focus:ring-2 focus:ring-primary-500`).
* Devtools de TanStack en dev no afectan A11Y prod (dynamic import).

### i18n

* `<ErrorBoundary>` fallback usa `useTranslations()` (cliente) con claves `errors.envelope.UNEXPECTED` y `common.retry` (existentes desde US-104/US-105). **No** se introducen claves nuevas en US-106.
* `<SessionProvider>` no muestra UI; sus consumidores manejan i18n.

---

## 9. API Contract Design

| Method | Endpoint            | Purpose                                  | Auth Required | Request                                                                                            | Response                                                                                                                          | Error Cases                                                                                       |
| ------ | ------------------- | ---------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/auth/me`   | Hidratación de `SessionContext`          | Opcional      | Headers: `Accept-Language`, `X-Correlation-Id`. Cookie: `eventflow_session` (HTTP-only, automática). | 200: `{ user: { id, email, displayName }, role, locale }`. 401: `{ error: { code: 'UNAUTHENTICATED', message } }` (anónimo).        | 401 = anónimo (no error); 5xx = `ApiError` retryable.                                              |
| GET    | `/api/v1/health`    | Health check (opcional)                  | No            | —                                                                                                  | 200: `{ status: 'ok' }`                                                                                                            | 5xx = `ApiError` retryable                                                                        |
| —      | (todos los demás)   | Consumidos por features futuras          | Según feature | `httpClient` se encarga de propagar headers                                                         | Cada feature define su DTO                                                                                                         | Estándar `ApiError` con envelope `{ error: { code, message, details? } }`                          |

**Owner del endpoint `GET /auth/me`**: **US-108** (backend). Mientras tanto, MSW handler stub cubre.

---

## 10. Database / Prisma Design

No aplica. US-106 no toca el schema Prisma, ni introduce migraciones, modelos, índices, constraints o seed.

---

## 11. AI / PromptOps Design

No aplica directamente. **Habilita** la cadena para historias IA futuras:

* `httpClient.opts.isAI === true` → timeout extendido a 30 s (NFR-PERF-AI-001 futuro).
* `Accept-Language` automático (US-104) → el backend lo pasa al `LLMProvider` (FR-I18N-005 / BR-AI-011).

Sin `<MockAIProvider>`, sin `AIRecommendation`, sin prompt versioning en US-106.

---

## 12. Security & Authorization Design

### Authentication

US-106 no autentica usuarios. **Lee la cookie de sesión transparentemente** vía `credentials: 'include'`. El navegador propaga `eventflow_session` (HTTP-only, US-108) automáticamente. US-106 NO lee la cookie desde JavaScript.

### Authorization

* **Frontend UX-only** (ADR-FE-003): `useSession()` solo refleja `GET /me`; cualquier 401/403 del backend es palabra final.
* **Listener global 401** (`onError401`): cualquier query que retorne 401 limpia cache y redirige (excepto `['me']` que se interpreta como anónimo).
* **Listener global 403**: solo loguea en dev; no redirige (la UX guard de middleware US-105 ya lo cubre).

### Ownership Rules

No aplica en US-106. Las ownership rules viven en backend (US-094..097, US-112).

### Role Rules

No aplica en US-106. `useSession()` expone `role: Role | null` pero su uso para mostrar/ocultar UI vive en US-107 (`<RoleGuard>`).

### Negative Authorization Scenarios

| Escenario                                                       | Resultado esperado                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Cookie de sesión ausente                                        | `authApi.me()` → 401 → `useSession()` `{ isAuthenticated: false }`. Sin redirect (middleware US-105 lo cubre).   |
| Cookie de sesión adulterada/expirada                            | Mismo comportamiento que ausente. La cookie HTTP-only no se puede leer ni modificar desde cliente.               |
| Query distinta de `['me']` retorna 401                          | `queryClient.clear()` + `router.replace('/login?from=<path>')` si path en `(app)`/`(admin)`. Caso `(public)`/`(auth)` → no redirect. |
| Cualquier endpoint retorna 403                                  | `ApiError({ status: 403, isRetryable: false })` se propaga al feature. No redirect global. Log dev.              |
| Build incluye MSW en chunks                                     | Build check falla → bloquea merge (VR-05, TS-18).                                                                |
| Tests introducen tokens en localStorage                         | Revisión PR falla (NT-10, SEC-03).                                                                              |

### Audit Requirements

* En **dev**, `httpClient` loguea `httpClient.request { method, path, correlationId }` y `httpClient.error { method, path, status, code, correlationId }` sin body ni cookies.
* En **prod**, silencio (Sentry es Future).
* `AdminAction` no aplica.

### Sensitive Data Handling

* Cookies HTTP-only nunca se leen en cliente.
* `crypto.randomUUID()` genera correlation IDs criptográficamente seguros.
* `ApiError.message` se muestra al usuario solo si proviene del envelope backend; mensajes derivados usan claves i18n genéricas.
* Sin secretos en repo; `NEXT_PUBLIC_*` solo (Doc 21 §9.3 heredado de US-103).

---

## 13. Testing Strategy

### Unit Tests

| ID    | Target / Spec                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| TS-01 | `tests/unit/api-client/queryClient.test.ts` — defaults (staleTime, gcTime, retry lambda, mutations.retry, refetchOnWindowFocus) |
| TS-02 | `tests/unit/api-client/httpClient.test.ts` — request con `Accept-Language`, `X-Correlation-Id`, `credentials: 'include'`        |
| TS-03 | `tests/unit/api-client/httpClient.test.ts` — timeouts (10 s default / 30 s para `isAI=true`)                                    |
| TS-04 | `tests/unit/api-client/httpClient.test.ts` — response OK → `T`; envelope error → `ApiError`                                     |
| TS-05 | `tests/unit/api-client/ApiError.test.ts` — `isRetryable` derivado correcto                                                       |
| TS-06 | `tests/unit/api-client/parseErrorEnvelope.test.ts` — Zod válida estructura; inválida → `UNEXPECTED`                              |
| TS-07 | `tests/unit/auth-session/authApi.test.ts` — `authApi.me()` invoca `httpGet('/auth/me')` y aplica mapper                          |
| TS-08 | `tests/unit/auth-session/authMappers.test.ts` — `mapAuthSessionResponseToAuthSession` función pura                              |
| NT-01 | `tests/unit/api-client/httpClient.test.ts` — network error → `ApiError({ code: 'NETWORK', isRetryable: true })`                  |
| NT-02 | `tests/unit/api-client/httpClient.test.ts` — non-JSON response → `ApiError({ code: 'UNEXPECTED' })` sin exponer HTML             |
| NT-03 | `tests/unit/api-client/httpClient.test.ts` — timeout vencido → `ApiError({ code: 'TIMEOUT', isRetryable: true })`                 |
| NT-04 | `tests/unit/api-client/attachCorrelationId.test.ts` — fallback cuando `crypto.randomUUID` ausente                                |

### Component Tests

| ID    | Target / Spec                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------- |
| TS-09 | `tests/unit/auth-session/SessionProvider.test.tsx` — con MSW 401, `useSession()` retorna `{ isAuthenticated: false }`  |
| TS-10 | `tests/unit/auth-session/SessionProvider.test.tsx` — con MSW 200, retorna `{ isAuthenticated: true, role: 'organizer' }` |
| TS-11 | `tests/unit/providers/ErrorBoundary.test.tsx` — render error → fallback con copy i18n                                |

### Integration Tests

| ID    | Spec                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------- |
| TS-12 | `tests/integration/data-layer/onError-401.test.tsx` — 401 sobre query distinta de `['me']` limpia cache + redirect mockeado |
| TS-13 | Mismo archivo — 401 sobre `['me']` NO redirige                                                    |
| TS-14 | `tests/integration/data-layer/msw-catch-all.test.ts` — endpoint no mockeado → 501 + warn          |
| NT-05 | `tests/integration/data-layer/onError-401.test.tsx` — cache limpiado antes de redirect             |
| NT-06 | Mismo archivo — 403 NO redirige; expone `ApiError({ status: 403 })`                                |

### API Tests

No aplica (no introduce endpoints).

### E2E Tests

| ID    | Spec                                       | Cobertura                                                                                                                |
| ----- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| TS-15 | `tests/e2e/data-layer.anonymous.spec.ts`   | MSW 401 → DOM `[data-testid="session-state"]="anonymous"`                                                                |
| TS-16 | `tests/e2e/data-layer.authenticated.spec.ts` | MSW override 200 con `role: 'organizer'` → DOM `[data-testid="session-state"]="authenticated"` y `[data-testid="session-role"]="organizer"` |
| TS-17 | `tests/e2e/data-layer.error-boundary.spec.ts` | Forzar error de render via `?throw=1` → fallback con copy i18n                                                            |

**Nota sobre `data-testid`**: Componente test-only se monta en `(public)/page.tsx` (landing) cuando `process.env.NODE_ENV === 'development'` o cuando hay un query param de test. Decisión final del approach en PR; alternativa: hook de testing dedicado.

### Security Tests

| ID    | Scenario                                                                          | Tipo            |
| ----- | --------------------------------------------------------------------------------- | --------------- |
| TS-18 | Build check: `msw` no aparece en `.next/static/chunks/*.js`                       | Build / CI      |
| NT-10 | El PR introduce token en `localStorage`                                            | PR review       |
| NT-11 | El PR introduce Server Action / API Route BFF                                      | PR review       |
| NT-12 | Build incluye MSW en chunks de prod                                                | Build / CI      |
| —     | `npm audit --omit=dev` heredado de US-103                                          | CI              |

### Accessibility Tests

| ID         | Scenario                                                                                  | Tipo            |
| ---------- | ----------------------------------------------------------------------------------------- | --------------- |
| A11Y-TS-01 | `<ErrorBoundary>` fallback usa `<main role="alert">` + `<h1>` único                       | Component       |
| A11Y-TS-02 | Botón "Reintentar" del fallback es focusable y tiene `type="button"`                      | Component       |
| A11Y-TS-03 | Devtools de TanStack solo carga en dev (no compromete bundle prod ni A11Y)                | Build check     |

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica directamente. **Habilita** demo académica con MSW (`NEXT_PUBLIC_API_MOCKING=enabled`) sin backend desplegado.

### CI Checks

Pipeline canónico Doc 21 §9.2:

```bash
npm ci
npm run lint          # --max-warnings=0; incluye react/jsx-no-literals
npm run typecheck     # strict + noUncheckedIndexedAccess
npm run test          # Vitest unit + component + integration
npm run build         # next build
npm run test:e2e      # Playwright (smoke US-103 + i18n US-104 + routing US-105 + data-layer US-106)
node scripts/check-no-msw-in-prod.mjs   # TS-18 / VR-05
```

Más `npm audit --omit=dev` y secret scanner heredados.

---

## 14. Observability & Audit

### Logs

* **Dev** (`process.env.NODE_ENV !== 'production'`):
  * `httpClient.request`: `console.debug('httpClient.request', { method, path, correlationId })`.
  * `httpClient.error`: `console.error('httpClient.error', { method, path, status, code, correlationId })` (sin body ni cookies).
  * `onError401`: `console.warn('queryClient.401', { queryKey, pathname })` cuando se dispara redirect.
  * `MSWProvider`: `console.info('MSW worker started')` cuando se activa.
  * `ErrorBoundary`: `console.error('ErrorBoundary caught', error, info)`.
* **Prod**: silencio total. Sentry es Future.

### Correlation ID

* Generado client-side con `crypto.randomUUID()` por cada request (`attachCorrelationId`).
* Si el backend devuelve `X-Correlation-Id` en response header, el cliente lo prefiere para `ApiError.correlationId`.
* Documentado en `ApiError` para troubleshooting (Doc 15 §40).

### AdminAction

No aplica.

### Error Tracking

* `<ErrorBoundary>` raíz captura errores de render (no de query).
* Errores de query los manejan los consumidores via `useQuery().isError`.
* Integración con Sentry/etc. es Future (Doc 15 §44).

### Metrics

No aplica en US-106 (sin telemetría).

---

## 15. Seed / Demo Data Impact

No aplica directamente. US-106 **habilita** demo académica con MSW:

* Con `NEXT_PUBLIC_API_MOCKING=enabled`, la app renderiza estados autenticado/anónimo sin backend desplegado.
* Para demo "autenticada", el equipo puede override el handler `/auth/me` con `worker.use(...)` o agregar un Playwright fixture.
* Coordinación informativa con EPIC-SEED-001: cuando los handlers de feature lleguen, la demo puede mostrar lista de eventos, vendors, etc. sin backend.

---

## 16. Documentation Alignment Required

| Document / Source                | Conflict                                                                                                                                                  | Current Decision                                                                                                                                                  | Recommended Action                                                                                                  | Blocks Implementation? |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Doc 15 §21.2 `SessionContext`    | Doc menciona `user, role, permissions, isAuthenticated, locale`. US-106 entrega `{ user, role, isAuthenticated, isLoading, isError, refetch }`            | `permissions` derivado en backend per-request (ADR-FE-003); `locale` vive en `useLocale()` (US-104). Duplicar generaría inconsistencias.                          | Amender Doc 15 §21.2 post-merge para reflejar shape efectiva                                                        | No                     |
| Doc 15 §23.1 `Authorization`     | Doc menciona "cookie automática o Bearer si Security Design lo decide"                                                                                    | US-106 adopta cookie HTTP-only (Doc 19 + decisión US-105/108)                                                                                                     | Amender Doc 15 §23.1 retirando rama Bearer como opción MVP (queda Future)                                           | No                     |
| Doc 19 cookies                   | Doc 19 no lista `eventflow_session` (HTTP-only), `eventflow_role` (no HTTP-only, US-105), `eventflow_locale` (US-104)                                      | Cookies adoptadas formalmente por US-104/105/106/108                                                                                                              | Amender Doc 19 post-merge listando las 3 cookies con flags y propósito                                              | No                     |
| Contrato `GET /api/v1/auth/me`   | No formalizado en backend aún                                                                                                                              | US-106 documenta shape esperada en `PO/BA Decisions Applied`; US-108 implementa                                                                                    | Coordinar con US-108 owner; si surge divergencia, DR explícito antes de cerrar US-108                               | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                                                                  | Impact                                                                                                          | Mitigation                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QueryClient` instancia compartida entre requests en App Router → leak de datos entre usuarios                                                       | Pérdida de datos / data poisoning entre sesiones                                                                | Usar `useState(() => new QueryClient(...))` (patrón oficial TanStack/Next.js); test unit valida que cada render del provider crea instancia nueva                                                          |
| MSW worker se carga accidentalmente en prod                                                                                                          | Bypass del backend real; bug de seguridad                                                                       | `<MSWProvider>` solo arranca con `NEXT_PUBLIC_API_MOCKING === 'enabled'`; build check falla si `msw` aparece en chunks; dynamic import evita inclusión estática                                              |
| Loop infinito de redirects 401 → `/login` → `/auth/me` → 401                                                                                          | App inservible                                                                                                  | `onError401` excepción: si `queryKey === ['me']`, NO redirige. Middleware US-105 excluye `/login` del guard sin sesión. Test integration cubre.                                                              |
| `crypto.randomUUID()` no disponible en algunos runtimes test                                                                                          | `httpClient` lanza al generar correlation ID                                                                    | `attachCorrelationId()` detecta `typeof crypto?.randomUUID === 'function'` y cae a fallback `Math.random().toString(36).repeat(2)` solo en tests. Producción usa runtime Node 20+ / browsers modernos.       |
| `parseErrorEnvelope` Zod schema rígido rompe con backends que devuelven shape ligeramente distinta                                                    | `ApiError` mal parseado; `code` siempre `UNEXPECTED`                                                            | Schema documenta shape esperada `{ error: { code, message, details? } }`; coordinar con backend (US-094..097); aceptar `details` como `z.unknown()` para flexibilidad.                                       |
| `<SessionProvider>` causa flash de contenido anónimo durante hidratación                                                                              | UX pobre en primera carga; flash visible                                                                        | `useSession()` expone `isLoading: true` desde el primer render; los layouts (US-107) renderizan skeleton; `staleTime: 60_000` evita refetch innecesario.                                                    |
| `react-error-boundary` introduce dep nueva fuera del stack Doc 15 §7                                                                                  | Aprobación de excepción documentada                                                                              | Approval gate aprobó la excepción explícitamente; documentar en `web/README.md` § "Stack"; mantener versión major fija.                                                                                       |
| Listener global 401 limpia cache en escenarios no deseados (ej. background refetch)                                                                   | UX bruscamente vacía sin razón visible al usuario                                                                | El `queryClient.clear()` solo se ejecuta junto con redirect a `/login`. En path público, NO se limpia (solo invalida `['me']`).                                                                              |
| MSW handlers de feature stories chocan con catch-all 501                                                                                              | Tests de feature fallan con "NOT_MOCKED"                                                                        | Catch-all es el último en el array de handlers; cada feature agrega su handler **antes** del catch-all. Documentar en README § "Data Layer → Agregar MSW handler".                                            |
| `<MSWProvider>` falla silenciosamente con `public/mockServiceWorker.js` faltante                                                                      | App cae a backend real sin aviso obvio                                                                          | Documentar `npx msw init public/` en setup README (US-103/US-106). `<MSWProvider>` loguea `console.error('MSW init failed', err)` en dev.                                                                    |
| TanStack Query devtools dynamic import añade chunk inesperado                                                                                          | Bundle prod aumenta levemente                                                                                    | `dynamic(..., { ssr: false })` + condicional `if (process.env.NODE_ENV !== 'production')` asegura tree-shaking; build check de tamaño es Future.                                                              |
| Contrato `GET /auth/me` divergente de US-108                                                                                                          | Producción rompe al desconectar MSW                                                                              | Documentar shape esperada en spec y en `web/README.md`. Si US-108 diverge, abrir DR antes de mergear US-108. Mappers aíslan cambios futuros.                                                                  |

---

## 18. Implementation Guidance for Coding Agents

### Files / folders impacted

* **Nuevos**:
  * `web/src/shared/providers/QueryProvider.tsx`
  * `web/src/shared/providers/MSWProvider.tsx`
  * `web/src/shared/providers/ErrorBoundary.tsx`
  * `web/src/shared/providers/index.ts` (barrel)
  * `web/src/shared/api-client/httpClient.ts`
  * `web/src/shared/api-client/ApiError.ts`
  * `web/src/shared/api-client/parseErrorEnvelope.ts`
  * `web/src/shared/api-client/attachCorrelationId.ts`
  * `web/src/shared/api-client/types.ts` (`HttpClientOptions`)
  * `web/src/shared/api-client/index.ts` (barrel)
  * `web/src/shared/auth-session/authApi.ts`
  * `web/src/shared/auth-session/authMappers.ts`
  * `web/src/shared/auth-session/onError401.ts`
  * `web/src/tests/msw/handlers/auth.ts`
  * `web/src/tests/msw/handlers/health.ts`
  * `web/src/tests/msw/handlers/index.ts`
  * `web/src/tests/msw/browser.ts`
  * `web/src/tests/msw/server.ts`
  * `web/public/mockServiceWorker.js` (generado)
  * `web/scripts/check-no-msw-in-prod.mjs`
  * `web/src/tests/unit/api-client/*.test.ts`
  * `web/src/tests/unit/auth-session/*.test.{ts,tsx}`
  * `web/src/tests/unit/providers/ErrorBoundary.test.tsx`
  * `web/src/tests/integration/data-layer/*.test.tsx`
  * `web/src/tests/e2e/data-layer.{anonymous,authenticated,error-boundary}.spec.ts`
* **Modificados**:
  * `web/src/app/layout.tsx` (envolver providers en el orden de AC-01).
  * `web/src/shared/auth-session/SessionProvider.tsx` (reemplaza el esqueleto US-105 con hidratación real).
  * `web/src/shared/auth-session/types.ts` (extender con `AuthSession`, `AuthSessionResponseDTO`, `User`).
  * `web/src/shared/auth-session/index.ts` (re-export de `authApi`, `SessionProvider`, `useSession`).
  * `web/vitest.setup.ts` (MSW `server.listen/resetHandlers/close`).
  * `web/.env.local.example` (agregar `NEXT_PUBLIC_API_MOCKING=disabled`).
  * `web/package.json` (agregar `react-error-boundary` dep + script `check-no-msw-in-prod`).
  * `web/README.md` (secciones "Data Layer" y "Cookies").

### Recommended order of implementation

1. **Tipos y constantes**: `api-client/types.ts`, `auth-session/types.ts` (definir `Role`, `User`, `AuthSession`, `AuthSessionResponseDTO`).
2. **`ApiError`**: clase con `isRetryable` derivado por status.
3. **`parseErrorEnvelope`**: Zod schema + tests unit.
4. **`attachCorrelationId`**: generador con fallback + tests unit.
5. **`httpClient`**: wrapper sobre `fetch` con interceptores + tests unit (TDD recomendado).
6. **`authMappers` + `authApi`**: `mapAuthSessionResponseToAuthSession` puro; `authApi.me()` invoca `httpGet`.
7. **MSW infrastructure**: handlers iniciales (`auth.ts`, `health.ts`, `index.ts` con catch-all); `browser.ts`, `server.ts`; `vitest.setup.ts` con server. Ejecutar `npx msw init public/`.
8. **`<MSWProvider>`**: Client Component con dynamic import.
9. **`<QueryProvider>`**: Client Component con `useState`, defaults, `QueryCache.onError`, Devtools dev-only.
10. **`onError401`** handler global.
11. **`<ErrorBoundary>`**: Client con `react-error-boundary` + i18n.
12. **`<SessionProvider>`** hidratado: reemplazar esqueleto US-105 con `useQuery(['me'])`.
13. **`RootLayout`** modificado: envolver providers en el orden formalizado.
14. **`.env.local.example`** + `npx msw init public/` + `react-error-boundary` dep.
15. **Build check script** `check-no-msw-in-prod.mjs`.
16. **Tests unit + component + integration**.
17. **Tests E2E Playwright** (3 specs).
18. **`web/README.md`** § "Data Layer" + § "Cookies".

### Decisions that must not be reopened

* `QueryClient` con `useState` lazy init (no singleton).
* Defaults TanStack (`staleTime: 30_000`, `gcTime: 5 min`, retry lambda).
* `httpClient` con `credentials: 'include'` + `Accept-Language` + `X-Correlation-Id`.
* `ApiError` shape exacta + `isRetryable` derivado.
* MSW dev opt-in + tests obligatorio + prod prohibido.
* `<SessionProvider>` con `useQuery(['me'])`, `retry: false`, 401 = anónimo.
* `useSession()` API: `{ user, role, isAuthenticated, isLoading, isError, refetch }` (sin `permissions`, sin `locale`).
* `react-error-boundary` aprobado como excepción al stack §7.
* Sin Server Actions, sin API Routes BFF, sin tokens en localStorage.
* Patrón `featureApi → mapper → frontend model` obligatorio.
* `onError401` solo redirige en path `(app)`/`(admin)` y solo cuando `queryKey !== ['me']`.

### Lo que NO debe implementarse

* Formularios reales de login/register/forgot-password (US-AUTH-*).
* `authApi.login`/`logout`/`register`/`forgotPassword` (US-AUTH-*).
* Llamadas a `POST /auth/login`, `POST /auth/logout`.
* Layouts completos con sidebars/headers/breadcrumbs (US-107).
* Feature-specific API clients (`eventsApi`, `quotesApi`, etc.).
* `useEvents`, `useVendors`, etc.
* `<ToastProvider>`, `<ThemeProvider>`.
* TanStack Table.
* Tokens en `localStorage` o `sessionStorage`.
* Server Actions, API Routes BFF.
* Sentry, telemetría externa.
* MSW handlers de feature más allá de `/auth/me` y `/health`.
* `permissions` en `useSession()`.

### Asunciones a preservar

* US-103, US-104, US-105 mergeadas.
* `attachLocaleHeader` (US-104) está exportado.
* `<SessionProvider>` esqueleto (US-105) se reemplaza sin romper consumidores.
* `crypto.randomUUID()` disponible en runtime objetivo (Node 20 + browsers + Edge).
* `NEXT_PUBLIC_API_BASE_URL` existe en `.env.local.example`.
* Sin Sentry en MVP.
* Backend US-108 emitirá ambas cookies (`eventflow_session`, `eventflow_role`).

---

## 19. Task Generation Notes

### Suggested Task Groups

1. **Group A — Types & Constants**: `api-client/types.ts`, `auth-session/types.ts`.
2. **Group B — API Client Core**: `ApiError`, `parseErrorEnvelope`, `attachCorrelationId`, `httpClient` (+ tests unit).
3. **Group C — Auth Session**: `authMappers`, `authApi`, `onError401`, `<SessionProvider>` hidratado (reemplaza US-105) (+ tests unit/component).
4. **Group D — MSW Infrastructure**: `handlers/auth.ts`, `handlers/health.ts`, `handlers/index.ts` con catch-all, `browser.ts`, `server.ts`, `vitest.setup.ts`, `public/mockServiceWorker.js`.
5. **Group E — Providers**: `<QueryProvider>` (con `QueryCache.onError`), `<MSWProvider>`, `<ErrorBoundary>`.
6. **Group F — Root Layout**: modificar `src/app/layout.tsx` para envolver providers en el orden de AC-01.
7. **Group G — Build Check**: `scripts/check-no-msw-in-prod.mjs` + script npm.
8. **Group H — Env & Dep**: `.env.local.example` + `react-error-boundary` dep.
9. **Group I — Tests**:
   * Unit: `tests/unit/api-client/*.test.ts`, `tests/unit/auth-session/*.test.{ts,tsx}`, `tests/unit/providers/ErrorBoundary.test.tsx`.
   * Integration: `tests/integration/data-layer/onError-401.test.tsx`, `msw-catch-all.test.ts`.
   * E2E: 3 specs `data-layer.{anonymous,authenticated,error-boundary}.spec.ts`.
10. **Group J — Documentation**: `web/README.md` § "Data Layer" + § "Cookies"; housekeeping Doc 15 §21.2 / §23.1 / Doc 19.

### Required QA Tasks

* Tests unit de `httpClient` (TS-02..TS-04, NT-01..NT-03), `ApiError` (TS-05), `parseErrorEnvelope` (TS-06), `attachCorrelationId` (NT-04).
* Tests unit de `authApi` (TS-07) y `authMappers` (TS-08).
* Tests component de `<SessionProvider>` con MSW (TS-09, TS-10) y `<ErrorBoundary>` (TS-11).
* Tests integration del listener global (TS-12, TS-13, NT-05, NT-06).
* Tests integration MSW catch-all (TS-14).
* Tests E2E Playwright (TS-15..TS-17).
* Build check MSW (TS-18).
* Tests A11Y (A11Y-TS-01..03).

### Required Security Tasks

* Audit SEC-01..SEC-10 en code review (no tokens en storage, no Server Actions, no API Routes BFF, no JWT decode, logs limpios).
* Build check script funcionando en CI.
* Confirmar que `react-error-boundary` no introduce vulnerabilidades High/Critical (`npm audit --omit=dev`).

### Required Seed / Demo Tasks

* Coordinar handlers iniciales MSW con futuros handlers de feature. Documentar en README "Cómo agregar MSW handler".
* Sin tareas de seed propias.

### Required Documentation Tasks

* `web/README.md` § "Data Layer": `<QueryClientProvider>` defaults, `httpClient` API, `ApiError`, patrón `featureApi → mapper → frontend model`, MSW activation, troubleshooting `mockServiceWorker.js`.
* `web/README.md` § "Cookies": `eventflow_session` (HTTP-only), `eventflow_role` (no HTTP-only, US-105), `eventflow_locale` (no HTTP-only, US-104).
* Housekeeping post-merge: amender Doc 15 §21.2, Doc 15 §23.1, Doc 19; coordinar contrato `/auth/me` con US-108.

### Dependencies between tasks

* Group A bloquea B, C, D.
* Group B bloquea C (`authApi` consume `httpClient`).
* Group C bloquea Group F (`<SessionProvider>` se envuelve en `RootLayout`).
* Group D bloquea Group E (`<MSWProvider>` importa `tests/msw/browser`).
* Group E bloquea Group F (todos los providers en root).
* Group I (tests) depende de A-F mergeados.
* Group G y H ortogonales; pueden correr en paralelo a B/C.
* Group J al final.

### Consolidated `tasks.md`

PB-P0-013 se cierra con US-107. Recomendable consolidar `management/development-tasks/P0/PB-P0-013/tasks.md` cuando las dos historias (US-106, US-107) hayan generado sus development tasks individuales.

---

## 20. Technical Spec Readiness

| Check                                                  | Status |
| ------------------------------------------------------ | ------ |
| User Story approved or explicitly allowed for draft spec | Pass — `Approved with Minor Notes` con 22 decisiones cerradas |
| Product Backlog mapping found                          | Pass — PB-P0-013 encontrado |
| Decision Resolution reviewed if present                | N/A — no existe artefacto separado; decisiones en historia |
| Scope clear                                            | Pass |
| Architecture alignment clear                           | Pass — Doc 15 §21-26/§40/§43, Doc 16, Doc 19, ADRs |
| API impact clear                                       | Pass — solo header outbound preparado + `GET /auth/me` consumido |
| DB impact clear                                        | N/A — sin impacto DB |
| AI impact clear                                        | Pass — habilitación de cadena `Accept-Language` + `opts.isAI` para timeout |
| Security impact clear                                  | Pass — SEC-01..SEC-10 documentados |
| Testing strategy clear                                 | Pass — 19 functional + 12 negative + 5 auth + 3 A11Y + build check |
| Ready for Development Task Breakdown                   | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

US-106 está técnicamente lista para que la skill `eventflow-user-story-to-development-tasks` genere el plan de desarrollo. Las decisiones críticas están cerradas en `PO/BA Decisions Applied` de la historia (22 ítems), las dependencias estructurales (US-103/104/105 mergeadas) están especificadas, y la historia no tiene preguntas bloqueantes ni decisiones reabiertas. El alcance es quirúrgico (7 piezas integradas de data layer foundation) y el boundary con US-107/108/AUTH-* y con todas las historias de feature está formalizado para evitar scope creep.

Los cuatro `Documentation Alignment Required` (Doc 15 §21.2 sin `permissions`/`locale`, Doc 15 §23.1 cookie HTTP-only, Doc 19 cookies, contrato `GET /auth/me`) son **post-merge housekeeping**, no bloqueantes — están en línea con ADR-FE-003 y con las decisiones formalizadas en US-104/105/108. El contrato esperado con US-108 está claramente documentado y los tests E2E usan MSW para no bloquear US-106 hasta que US-108 esté lista.

Riesgo controlado: el listener global 401, la composición correcta del `<QueryClient>` con `useState`, y el build check MSW están explícitamente abordados en `Technical Risks & Mitigations`. La cobertura de tests (unit + component + integration + E2E + build check + A11Y) y la trazabilidad explícita a Doc 15/16/19/20 + ADR-FE-001/002/003/005/009/015 dan confianza para proceder con la generación de development tasks.

---

## Expected Final Response

Technical Specification created: Yes
Path: `management/technical-specs/P0/PB-P0-013/US-106-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P0-013
Execution Order: 13 (de 18 P0); posición 1 de 2 en el item
Next step: Run `eventflow-user-story-to-development-tasks`.

* Product Backlog mapping: **Found** (PB-P0-013).
* Decision Resolution artifact: **Not used** — decisiones formalizadas en `PO/BA Decisions Applied` (22 ítems).
* Blockers: ninguno.
* Documentation alignment warnings: 4 ítems no bloqueantes (Doc 15 §21.2, Doc 15 §23.1, Doc 19 cookies, contrato `GET /auth/me`).
