# Execution Record — PB-P0-013 / US-106: TanStack Query global + httpClient + MSW + SessionProvider hidratado + ErrorBoundary

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-106 |
| User Story Title | TanStack Query global + `httpClient` + interceptores + `ApiError` + MSW dev/tests + hidratación `<SessionProvider>` vía `GET /me` + `<ErrorBoundary>` raíz |
| Phase | P0 |
| Backlog Position | PB-P0-013 |
| User Story Path | management/user-stories/US-106-tanstack-query-and-msw.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-013/US-106-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-013/US-106-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-PO-012_PB-P0-013 |
| Initial Commit Hash | 75543736a6bcfd52627ee6c81a5d9e8cfdfaad80 |
| Started At | 2026-07-10T14:45:01Z |
| Last Updated At | 2026-07-10T15:06:00Z |
| Completed At | 2026-07-10T15:06:00Z |
| Claude Session ID | b6f01256-49aa-46ca-a9c2-90b96c289f27 |
| Executor Type | Claude Code |

> Git Safety: working tree contiene los cambios NO commiteados de US-103/104/105 (misma sesión y
> branch). US-106 construye sobre ellos y los preserva; sin commit/push/PR ni descartes sin solicitud.

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide en las 3 rutas — US-106
- [x] Phase coincide — P0
- [x] Backlog Position coincide — PB-P0-013
- [x] Documentos legibles
- [x] IDs de tarea extraídos (27 tareas: FE-001..FE-015, OPS-001..003, QA-001..006, SEC-001, DOC-001..002)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks:
  - US status `Approved with Minor Notes`, `Approved By: PO/BA Review` (2026-06-22), `Ready for Development Tasks: Yes`. PASS
  - AC-01..AC-11 testeables. PASS
  - Tech Spec `Ready for Task Breakdown`. PASS
  - Tasks File con 27 IDs `TASK-...`. PASS
  - `DEVELOPMENT_CONVENTIONS.md` legible. PASS
  - Dependencias PB-P0-012 (US-103/104/105): presentes en working tree (`attachLocaleHeader`, `<SessionProvider>` esqueleto, route groups). PASS
  - Node 20+ (v22.22.2); `crypto.randomUUID` disponible. PASS
  - Backlog priorizado incluye PB-P0-013. PASS
  - No execution record previo para US-106. PASS
- Warnings:
  - W1: US-103/104/105 en working tree (no mergeadas); US-106 se construye sobre ellas y las preserva.
  - W2: `react-error-boundary` es dep nueva fuera del stack Doc 15 §7 — **excepción aprobada en el approval gate** (AC-05/OPS-002). Documentada en README § Stack.
  - W3: contrato `GET /api/v1/auth/me` lo formaliza US-108; US-106 lo consume con handler MSW stub (401 anónimo). Sin bloqueo.
  - W4: 4 Documentation Alignment Required no bloqueantes (Doc 15 §21.2 permissions/locale; §23.1 cookie vs Bearer; Doc 19 cookies; contrato /me) → housekeeping DOC-002.
- Blockers: Ninguno
- Decision files: `decision-resolutions/US-106-*` → No existe (22 decisiones en historia)
- Refinement files: `refinement-reviews/US-106-*` → No existe

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 27 tareas derivan de la spec (§4, §6, §8, §13, §18). Orden respeta dependencias. Cubren tipos, ApiError, parseErrorEnvelope, attachCorrelationId, httpClient, MSW infra, providers (Query/MSW/Error), authApi/mappers, onError401, SessionProvider hidratado, RootLayout, env, build check, tests, docs. PASS
- Tech Spec vs Conventions: TanStack Query (ADR-FE-005), MSW (ADR-FE-009), fetch wrapper, cookie HTTP-only (ADR-FE-003), sin Server Actions/BFF, i18n `t()`. `react-error-boundary` excepción aprobada. PASS
- Tasks vs Acceptance Criteria: AC-01→FE-009,015; AC-02→FE-002..006; AC-03→FE-007,008,010; AC-04→FE-012,014; AC-05→FE-011; AC-06→FE-013; AC-07→OPS-001; AC-08→DOC-001; AC-09→QA-001..004; AC-10→QA-005; AC-11→QA-006,SEC-001. Ningún AC huérfano. PASS
- Hallazgos de arquitectura: Ninguno bloqueante. Frontend UX-only; sin JWT decode; MSW fuera de prod; sin BFF. Respeta ADR-FE-001/002/003/005/009/015.
- Ajustes requeridos: Notas menores (D1..). Ninguna bloqueante.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC | Evidencia |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | -- | --------- |
| TASK-PB-P0-013-US-106-FE-001 | Tipos y constantes (api-client + auth-session) | 1 | —| Done | 2026-07-10 | 2026-07-10 | AC-02,04 | |
| TASK-PB-P0-013-US-106-FE-002 | `ApiError` | 2 | FE-001| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-106-FE-003 | `parseErrorEnvelope` (Zod) | 3 | FE-002| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-106-FE-004 | `attachCorrelationId` + fallback | 4 | —| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-106-FE-005 | `httpClient` (fetch wrapper) | 5 | FE-002,003,004| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-106-FE-006 | `api-client/index.ts` barrel | 6 | FE-005| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-106-FE-007 | Handlers MSW + worker/server | 7 | FE-001| Done | 2026-07-10 | 2026-07-10 | AC-03 | |
| TASK-PB-P0-013-US-106-FE-008 | `mockServiceWorker.js` + `vitest.setup.ts` | 8 | FE-007| Done | 2026-07-10 | 2026-07-10 | AC-03 | |
| TASK-PB-P0-013-US-106-FE-009 | `<QueryProvider>` + `QueryCache.onError` | 9 | FE-002,013| Done | 2026-07-10 | 2026-07-10 | AC-01,06 | |
| TASK-PB-P0-013-US-106-FE-010 | `<MSWProvider>` dynamic import | 10 | FE-007| Done | 2026-07-10 | 2026-07-10 | AC-03 | |
| TASK-PB-P0-013-US-106-FE-011 | `<ErrorBoundary>` react-error-boundary + i18n | 11 | OPS-002| Done | 2026-07-10 | 2026-07-10 | AC-05 | |
| TASK-PB-P0-013-US-106-FE-012 | `authMappers` + `authApi.me()` | 12 | FE-005| Done | 2026-07-10 | 2026-07-10 | AC-04 | |
| TASK-PB-P0-013-US-106-FE-013 | `onError401` handler global | 13 | FE-002| Done | 2026-07-10 | 2026-07-10 | AC-06 | |
| TASK-PB-P0-013-US-106-FE-014 | `<SessionProvider>` hidratado (reemplaza esqueleto US-105) | 14 | FE-012| Done | 2026-07-10 | 2026-07-10 | AC-04 | |
| TASK-PB-P0-013-US-106-FE-015 | `RootLayout` orden de providers | 15 | FE-009,010,011,014| Done | 2026-07-10 | 2026-07-10 | AC-01 | |
| TASK-PB-P0-013-US-106-OPS-001 | `NEXT_PUBLIC_API_MOCKING` en `.env.local.example` | 16 | —| Done | 2026-07-10 | 2026-07-10 | AC-07 | |
| TASK-PB-P0-013-US-106-OPS-002 | Instalar `react-error-boundary` + package.json | 17 | —| Done | 2026-07-10 | 2026-07-10 | AC-05 | |
| TASK-PB-P0-013-US-106-OPS-003 | Build check `check-no-msw-in-prod.mjs` | 18 | FE-010| Done | 2026-07-10 | 2026-07-10 | AC-11 | |
| TASK-PB-P0-013-US-106-QA-001 | Unit API client | 19 | FE-005| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-013-US-106-QA-002 | Unit auth session | 20 | FE-012| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-013-US-106-QA-003 | Component `<SessionProvider>` + `<ErrorBoundary>` | 21 | FE-011,014| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-013-US-106-QA-004 | Integration `onError401` + MSW catch-all | 22 | FE-013| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-013-US-106-QA-005 | 3 E2E data layer | 23 | FE-015| Done | 2026-07-10 | 2026-07-10 | AC-10 | |
| TASK-PB-P0-013-US-106-QA-006 | Pipeline + PR hygiene + A11Y | 24 | QA-001..005| Done | 2026-07-10 | 2026-07-10 | AC-11 | |
| TASK-PB-P0-013-US-106-SEC-001 | Audit SEC-01..10 + build check MSW | 25 | FE-015| Done | 2026-07-10 | 2026-07-10 | AC-11 | |
| TASK-PB-P0-013-US-106-DOC-001 | README § Data Layer + Cookies + Stack | 26 | QA-006| Done | 2026-07-10 | 2026-07-10 | AC-08 | |
| TASK-PB-P0-013-US-106-DOC-002 | Housekeeping Documentation Alignment | 27 | DOC-001| Done | 2026-07-10 | 2026-07-10 | AC-11 | |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Impacto scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----- | --------- | ------------- | ----------------- | ------ | --------- |
| — | Ninguna | — | — | — | — | — | — | — |

## 7. Evidence by Task

> Comandos globales (desde `web/`, pipeline canónico Doc 21 §9.2 desde `npm ci` limpio):
> `npm ci` → 0; `npm run lint` (`--max-warnings=0`) → 0; `npm run typecheck` → 0;
> `npm run test` (Vitest) → 0 (**86 passed / 22 files**); `npm run build` → 0;
> `npm run check-no-msw-in-prod` → 0 (MSW ausente de chunks prod); `npm run test:e2e` → 0 (**27 passed**:
> 3 data-layer US-106 + 6 routing/SEO US-105 + 3 i18n US-104 + smoke). Deps nuevas:
> `react-error-boundary@^6` (excepción aprobada), `@tanstack/react-query-devtools@^5` (dev, dynamic).

### FE-001..006 (Done) — api-client
- `api-client/`: `types.ts` (`HttpClientOptions`), `ApiError.ts` (`isRetryable` derivado por status), `parseErrorEnvelope.ts` (Zod), `attachCorrelationId.ts` (UUID v4 + fallback EC-05), `httpClient.ts` (`httpGet/Post/Patch/Put/Delete`; credentials include, Accept-Language, X-Correlation-Id, Content-Type, AbortController timeout 10s/30s IA, TIMEOUT/NETWORK/UNEXPECTED, correlationId de response header), `index.ts` barrel.

### FE-007/008/010 (Done) — MSW
- `tests/msw/`: `handlers/{auth,health,index}.ts` (auth/me 401, health 200, catch-all 501+warn), `browser.ts` (setupWorker), `server.ts` (setupServer). `public/mockServiceWorker.js` generado (`npx msw init`). `vitest.setup.ts`: `server.listen({onUnhandledRequest:'error'})/resetHandlers/close`. `vitest.config.ts`: env `NEXT_PUBLIC_API_BASE_URL`. `<MSWProvider>`: `import()` dentro de bloque `NODE_ENV!=='production'` → MSW fuera del bundle prod (D2).

### FE-009/013 (Done) — QueryProvider + onError401
- `<QueryProvider>`: `useState(() => new QueryClient(...))` (instancia por request), defaults (staleTime 30s, gcTime 5min, refetch focus/reconnect, retry lambda excluye no-retryables, mutations.retry 0), Devtools dev-only (dynamic). `QueryCache.onError` → `handleQueryError` (refs para pathname/router). `onError401.ts`: 401 no-`['me']` → invalidate+clear+redirect si `(app)`/`(admin)`; `['me']` 401 → sin redirect; 403 → log dev.

### FE-011 (Done) — ErrorBoundary
- `<ErrorBoundary>` (`react-error-boundary`): captura errores de render; fallback `<main role="alert">` + `t('errors.envelope.UNEXPECTED')` + botón `t('common.retry')`. Recibe `locale`/`messages` para traducir aunque el árbol falle (D1).

### FE-012/014 (Done) — auth-session
- `authMappers.ts` (mapper puro), `authApi.ts` (`me()` → httpGet + mapper), `SessionProvider.tsx` hidratado (`useQuery(['me'])`, 401=anónimo), `useSession.ts`, `types.ts` (`User`/`AuthSession`/`DTO`/`SessionState`), `index.ts`. **Movido** de `shared/authorization/` (US-105) a `shared/auth-session/` (D3); `authorization/` conserva rol+middleware.

### FE-015 (Done) — RootLayout
- Orden AC-01: `<ErrorBoundary locale messages><QueryProvider><MSWProvider><SessionProvider><NextIntlClientProvider>{children}`. `SessionStateProbe` (sr-only) + `ThrowOnParam` (Suspense) en landing para E2E.

### OPS-001/002/003 (Done)
- `.env.local.example`: `NEXT_PUBLIC_API_MOCKING=disabled`. `react-error-boundary` + devtools instaladas. `scripts/check-no-msw-in-prod.mjs` + script npm `check-no-msw-in-prod`.

### QA-001..006 (Done) — tests (86 total)
- Unit api-client: `ApiError`, `parseErrorEnvelope`, `attachCorrelationId`, `httpClient` (headers/credentials, OK, 401 envelope, 500 no-JSON EC-02, NETWORK, TIMEOUT, correlationId). Unit auth-session: `authMappers`, `authApi` (MSW). Component: `SessionProvider` (401 anónimo / 200 autenticado, MSW), `ErrorBoundary` (fallback+A11Y). Integration: `onError-401` (NT-05/06, loop guard), `msw-catch-all` (501). E2E: `data-layer.{anonymous,authenticated,error-boundary}` (Playwright `page.route` para /auth/me — D4).

### SEC-001 (Done)
- 0 `localStorage`/`sessionStorage`, 0 JWT decode, 0 Server Actions, 0 API Routes BFF; `credentials: 'include'`. MSW ausente de prod (build check). `npm audit --omit=dev`: 1 High (advisory `next` agregada, tracked/heredado) + 2 Moderate.

### DOC-001/002 (Done)
- README § "Data Layer" (providers, orden, httpClient, patrón featureApi, MSW, sesión) + § Stack (react-error-boundary) + § Documentation Alignment (ítems 10-12: Doc 15 §21.2/§23.1, contrato /me). DOC-002 edición docs base diferida post-merge (D5).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | `<ErrorBoundary>` fallback usa `useTranslations` estando fuera del intl provider | El `<ErrorBoundary>` recibe `locale`/`messages` y su fallback monta su propio `<NextIntlClientProvider>` | Al ser el provider más externo (AC-01), cuando el árbol falla el `NextIntlClientProvider` interno se desmonta; el fallback necesita su propio contexto i18n para traducir. | Bajo | Ninguna | §8 i18n | No | Documentado en `ErrorBoundary.tsx` |
| D2 | "dynamic import evita inclusión estática de MSW" | `import()` de MSW colocado DENTRO de `if (NODE_ENV !== 'production')` | Un `import()` tras un `return` temprano NO es código muerto para Terser (aparecía en un chunk prod). Anidarlo en el bloque `NODE_ENV` sí lo elimina. | Bajo | Ninguna | §8, §13 (build check) | No | Verificado por `check-no-msw-in-prod` |
| D3 | `<SessionProvider>` en `shared/auth-session/` (spec §18) | Movido desde `shared/authorization/` (donde US-105 lo puso) a `shared/auth-session/`; layout actualizado | La spec de US-106 ubica la sesión en `auth-session/`; US-105 la había puesto en `authorization/`. Se consolida en `auth-session/` (hidratación real); `authorization/` conserva rol + middleware. | Bajo | Ninguna | §18 | No | `authorization/index.ts` documenta el traslado |
| D4 | E2E con MSW en dev server (spec §13) | E2E con `page.route()` de Playwright para interceptar `/auth/me` | El `webServer` de Playwright corre en **producción** (build+start) donde MSW no existe (SEC-07). `page.route` mocka la red a nivel browser, independiente de MSW. Mismo objetivo (sesión anónima/autenticada deterministas). | Bajo | Ninguna | §13 E2E | No | 3 E2E verdes |
| D5 | DOC-002: editar Doc 15 §21.2/§23.1, Doc 19, contrato /me | Registrado/trackeado en README § Documentation Alignment; edición diferida | Guardrail de la skill: no editar docs base ni crear ADRs sin autorización explícita. Housekeeping post-merge no bloqueante. | Bajo | §13 inmutabilidad | §16 | Sí (post-merge, con autorización) | 3 ítems (10-12) registrados |

## 10. Final Validation

- Task completion: 27/27 Done (0 In Progress, 0 Blocked, 0 Rework, 0 Skipped)
- Acceptance Criteria coverage: 11/11 (AC-01..AC-11) con evidencia (§5 mapeo + §7)
- Lint: `npm run lint` (`--max-warnings=0`) → **Passed** (exit 0)
- Typecheck: `npm run typecheck` (strict + noUncheckedIndexedAccess) → **Passed** (exit 0)
- Tests: `npm run test` → **Passed** — 86 passed / 22 files (unit + component + integration)
- Build: `npm run build` → **Passed** (exit 0). Build check MSW: `check-no-msw-in-prod` → **Passed** (MSW ausente de chunks prod).
- E2E: `npm run test:e2e` → **Passed** — 27 passed (3 data-layer + 6 routing/SEO + 3 i18n + smoke)
- Migrations / Seed: **Not Applicable** — sin backend/DB (habilita demo con MSW)
- Authorization: **UX-only Passed** — `useSession()` refleja solo `GET /me`; listener global 401 limpia cache + redirige (excepto `['me']`); 403 sin redirect. Sin JWT decode. Backend autoritativo.
- Security: **Passed** — SEC-01..10: cookie HTTP-only vía `credentials:'include'` (sin leerla), sin tokens en localStorage, X-Correlation-Id con `crypto.randomUUID`, logs sin body/cookies, MSW fuera de prod, sin Server Actions/BFF. `npm audit --omit=dev`: 1 High tracked + 2 Moderate.
- Accessibility: **Passed** — `<ErrorBoundary>` fallback `<main role="alert">` + `<h1>` + botón `type=button` focusable.
- i18n: **Passed** — copy del fallback vía `t()` (claves US-104/105); sin claves nuevas.
- Documentation: **Passed** — README § Data Layer + § Stack + § Documentation Alignment.
- Out of scope (AC-11): **Passed** — 0 forms login/register, 0 `authApi.login/logout/register`, 0 feature apis, 0 Toast/Theme provider, 0 Server Actions/BFF, MSW fuera de prod.
- Cambios no relacionados en working tree: Ninguno (solo `web/` y `management/`; US-103/104/105 preservadas).
- Unresolved debt: (a) advisory `next` (heredada, tracked); (b) DOC-002 housekeeping (Doc 15 §21.2/§23.1, Doc 19, contrato /me) diferido post-merge; (c) endpoint real `GET /auth/me` + cookies → US-108; (d) `authApi.login/logout` → US-AUTH-*; (e) feature apis → historias de feature.
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T14:45:01Z | Initialized | Execution record creado |
| 2026-07-10T14:45:01Z | Readiness | READY_WITH_WARNINGS (W1..W4) |
| 2026-07-10T14:45:01Z | Alignment | ALIGNED_WITH_NOTES |
| 2026-07-10T15:06:00Z | Implementación | 27 tareas Not Started → Done; api-client + MSW infra + providers (Query/MSW/Error) + auth-session hidratado + onError401 + RootLayout + build check |
| 2026-07-10T15:06:00Z | Validación | ci/lint/typecheck/test(86)/build/check-msw/e2e(27) = Passed; audit 1 High tracked + 2 Moderate; SEC UX-only limpio; MSW fuera de prod |
| 2026-07-10T15:06:00Z | Done | User Story US-106 completada (Execution Record Status → Done). Desbloquea US-107 |
