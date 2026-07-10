# Execution Record — PB-P0-012 / US-103: Inicializar la aplicación Next.js (App Router) + TypeScript con el stack frontend MVP

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-103 |
| User Story Title | Inicializar la aplicación Next.js (App Router) + TypeScript con el stack frontend MVP |
| Phase | P0 |
| Backlog Position | PB-P0-012 |
| User Story Path | management/user-stories/US-103-bootstrap-nextjs-app-router.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-012/US-103-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-012/US-103-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-PO-012_PB-P0-013 |
| Initial Commit Hash | 75543736a6bcfd52627ee6c81a5d9e8cfdfaad80 |
| Started At | 2026-07-09T22:17:03Z |
| Last Updated At | 2026-07-09T22:29:34Z |
| Completed At | 2026-07-09T22:29:34Z |
| Claude Session ID | b6f01256-49aa-46ca-a9c2-90b96c289f27 |
| Executor Type | Claude Code |

> Git Safety: working tree limpio al inicio (sin cambios preexistentes). Rama feature
> `foundation/PB-PO-012_PB-P0-013` (cubre PB-P0-012 y PB-P0-013). No se commitea/push/PR sin
> solicitud explícita. Backend previo (`backend/`) no se toca.

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide en las 3 rutas (nombre + contenido) — US-103
- [x] Phase coincide entre Tech Spec y Tasks — P0
- [x] Backlog Position coincide entre Tech Spec y Tasks — PB-P0-012
- [x] Documentos legibles
- [x] IDs de tarea extraídos (19 tareas: TASK-PB-P0-012-US-103-FE-001 … TASK-PB-P0-012-US-103-DOC-002)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks:
  - US status `Approved` / `Approved with Minor Notes`, `Ready for Development Tasks: Yes`. PASS
  - AC-01..AC-08 testeables y atómicos. PASS
  - Tech Spec `Ready for Task Breakdown`. PASS
  - Tasks File con 19 IDs `TASK-...`. PASS
  - `DEVELOPMENT_CONVENTIONS.md` legible. PASS
  - PB-P0-012 es foundation, sin dependencias con otros items P0. PASS
  - Node 20+ disponible en local (v22.22.2, cumple `engines.node >=20`). PASS
  - Repo sin proyecto frontend previo (`web/`/`frontend/`/`apps/web/` no existían). PASS
  - Backlog priorizado incluye PB-P0-012 (§ "PB-P0-012 — Frontend Next.js Bootstrap & i18n"). PASS
  - No execution record previo para US-103. PASS
- Warnings:
  - W1: Documentation Alignment Required (no bloqueante): Doc 15 §7 "pnpm preferido o npm" vs Doc 21 §9.2 `npm ci` canónico. US-103 adopta **npm** (alineado a Doc 21). Housekeeping post-merge (DOC-002).
  - W2: `<h1>EventFlow</h1>` como string literal es una excepción documentada (el lint anti-hardcoded llega en US-104). Coordinación con US-104 para allow-list o `t()`.
  - W3: OPS-002 (workflow GitHub Actions) es opcional/diferible según Tasks File §13.
- Blockers: Ninguno
- Decision files: `decision-resolutions/US-103-decision-resolution.md` → No existe (N/A; decisiones en `PO/BA Decisions Applied`)
- Refinement files: `refinement-reviews/US-103-refinement-review.md` → No existe (US declara `Ready for Development Tasks: Yes`)

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: Las 19 tareas derivan de la spec (§6, §8, §13, §18, §19). Orden respeta el grafo (§12). Cubren scaffold, stack, config, estructura, scripts, layout/page, configs de test, env, smoke unit/E2E, pipeline, seguridad y docs. PASS
- Tech Spec vs Conventions: Frontend Next.js App Router + TypeScript estricto, `web/` raíz, npm canónico, Vitest/Testing Library/Playwright, sin Server Actions/API Routes BFF. PASS
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 → FE-001, (FE-006, OPS-001)
  - AC-02 → FE-002
  - AC-03 → FE-003, QA-001(config), FE-007
  - AC-04 → FE-004, QA-004
  - AC-05 → FE-005, QA-003
  - AC-06 → FE-006, FE-007, QA-002
  - AC-07 → FE-008, SEC-001
  - AC-08 → SEC-002, QA-005, DOC-002
  - Ningún AC huérfano. PASS
- Hallazgos de arquitectura: Ninguno bloqueante. Sin BFF/Server Actions, sin guards de rol en cliente (ADR-FE-003), sin persistencia, sin API client. Respeta ADR-FE-001/002/003, ADR-API-001.
- Ajustes requeridos: Notas menores (D1/D2, ver §9). Ninguna bloqueante.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P0-012-US-103-FE-001 | Bootstrap del proyecto Next.js + TypeScript + App Router en `web/` | 1 | — | Done | 2026-07-09 | 2026-07-09 | AC-01 | `create-next-app@14.2.15` (D2); `web/` con App Router + TS; `private`+`type:module` |
| TASK-PB-P0-012-US-103-OPS-001 | Fijar Node 20 vía `engines.node` y `.nvmrc` | 2 | FE-001 | Done | 2026-07-09 | 2026-07-09 | AC-01,03 | `engines.node >=20.0.0` + `.nvmrc`=20; README `nvm use` |
| TASK-PB-P0-012-US-103-FE-008 | Versionar `.env.local.example`, `.gitignore`, `.nvmrc` | 3 | FE-001 | Done | 2026-07-09 | 2026-07-09 | AC-07 | `.env.local.example` (3 NEXT_PUBLIC_); `.gitignore` `.env*`+`!.env.local.example`; `.nvmrc` |
| TASK-PB-P0-012-US-103-FE-002 | Instalar el stack frontend MVP Doc 15 §7 | 4 | FE-001 | Done | 2026-07-09 | 2026-07-09 | AC-02 | stack instalado; `next@14.2.35` (parcheado); `npm ci` limpio |
| TASK-PB-P0-012-US-103-FE-003 | Configuración base: TS estricto, Next, Tailwind, ESLint, Prettier | 5 | FE-002 | Done | 2026-07-09 | 2026-07-09 | AC-03 | tsconfig estricto; next.config ESM; tailwind/postcss; `.eslintrc.cjs`; `.prettierrc` |
| TASK-PB-P0-012-US-103-FE-004 | Crear estructura de carpetas Doc 15 §15 con placeholders | 6 | FE-001 | Done | 2026-07-09 | 2026-07-09 | AC-04 | 21 dirs; 9 `.gitkeep` + 6 README con historia owner |
| TASK-PB-P0-012-US-103-FE-005 | Declarar scripts npm operativos en `package.json` | 7 | FE-003 | Done | 2026-07-09 | 2026-07-09 | AC-05 | 11 scripts (`dev`..`test:e2e:install`) |
| TASK-PB-P0-012-US-103-FE-006 | Crear root layout y página raíz mínima como smoke target | 8 | FE-003 | Done | 2026-07-09 | 2026-07-09 | AC-01,06 | `layout.tsx` (`lang="es-419"` D1) + `page.tsx` (`<main><h1>EventFlow`) |
| TASK-PB-P0-012-US-103-FE-007 | Configurar Vitest + Testing Library + Playwright | 9 | FE-002, FE-003 | Done | 2026-07-09 | 2026-07-09 | AC-03,06 | `vitest.config.ts`+`vitest.setup.ts`+`playwright.config.ts` |
| TASK-PB-P0-012-US-103-QA-001 | Tests unit smoke y configuración Vitest funcional | 10 | FE-007 | Done | 2026-07-09 | 2026-07-09 | AC-03,05 | `smoke.test.ts` (1 passed) |
| TASK-PB-P0-012-US-103-QA-002 | Smoke E2E Playwright sobre `/` | 11 | FE-006, FE-007 | Done | 2026-07-09 | 2026-07-09 | AC-06 | `smoke.spec.ts` (1 passed, 200+main+h1) |
| TASK-PB-P0-012-US-103-QA-003 | Validar pipeline canónico Doc 21 §9.2 verde en local | 12 | QA-001, QA-002 | Done | 2026-07-09 | 2026-07-09 | AC-05 | `npm ci/lint/typecheck/test/build` = exit 0 |
| TASK-PB-P0-012-US-103-QA-004 | Verificar estructura Doc 15 §15 completa | 13 | FE-004 | Done | 2026-07-09 | 2026-07-09 | AC-04 | 21 dirs + 15 placeholders verificados |
| TASK-PB-P0-012-US-103-SEC-001 | Garantizar manejo seguro de variables de entorno | 14 | FE-008 | Done | 2026-07-09 | 2026-07-09 | AC-07 | `git check-ignore .env.local`=ignored; example sin valores; sin secrets |
| TASK-PB-P0-012-US-103-SEC-002 | Política `npm audit` y secret scanner en CI | 15 | FE-002 | Done | 2026-07-09 | 2026-07-09 | AC-08 | política en README; audit prod: 1 High (upstream tracked) + 2 Moderate |
| TASK-PB-P0-012-US-103-QA-005 | PR hygiene: confirmar no hay artefactos fuera de scope | 16 | QA-003 | Done | 2026-07-09 | 2026-07-09 | AC-08 | 0 artefactos out-of-scope (solo menciones doc) |
| TASK-PB-P0-012-US-103-DOC-001 | Escribir `web/README.md` con setup, scripts y env vars | 17 | QA-003 | Done | 2026-07-09 | 2026-07-09 | AC-01,03,05,07 | `web/README.md` con 8 secciones |
| TASK-PB-P0-012-US-103-DOC-002 | Housekeeping de Documentation Alignment | 18 | DOC-001 | Done | 2026-07-09 | 2026-07-09 | AC-08 | 3 ítems registrados en README § Documentation Alignment |
| TASK-PB-P0-012-US-103-OPS-002 | Workflow GitHub Actions para `web/` (opcional) | 19 | QA-003 | Done | 2026-07-09 | 2026-07-09 | AC-05 | `.github/workflows/web-ci.yml` (path-filtered `web/**`) |

> Los IDs y títulos originales se copian **verbatim**; nunca se renumeran.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| — | Ninguna | — | — | — | — | — | — | — |

## 7. Evidence by Task

> Comandos globales (desde `web/`, pipeline canónico Doc 21 §9.2 desde `npm ci` en limpio):
> `npm ci` → exit 0; `npm run lint` (`next lint --max-warnings=0`) → exit 0 ("No ESLint warnings or errors");
> `npm run typecheck` (`tsc --noEmit`) → exit 0; `npm run test` (`vitest run`) → exit 0 (1 passed);
> `npm run build` (`next build`) → exit 0 (sin warnings; rutas `/` y `/_not-found` estáticas);
> `npm run test:e2e` (Playwright chromium) → exit 0 (1 passed, 200+`<main>`+`<h1>`).

### FE-001 / OPS-001 (Done) — bootstrap + Node 20
- `create-next-app@14.2.15 web --typescript --app --tailwind --eslint --src-dir --import-alias '@/*' --use-npm`.
  Nota (D2): `create-next-app@latest` había generado Next 16/React 19/Tailwind 4 (viola pins AC-02); se descartó y re-scaffoldeó con 14.
- `web/package.json`: `"private": true`, `"type": "module"`, `"engines": { "node": ">=20.0.0" }`; `web/.nvmrc`=`20`.
- Files: `web/package.json`, `web/.nvmrc`.

### FE-002 / SEC-002 (Done) — stack Doc 15 §7 + audit
- Runtime: `@tanstack/react-query@5`, `react-hook-form@7`, `zod@3`, `@hookform/resolvers@5`, `next-intl@3`, `@headlessui/react@2`, `@radix-ui/react-slot@1`, `lucide-react`, `date-fns@4`. Dev: `vitest@4`, `@vitejs/plugin-react`, `@vitest/coverage-v8`, `@testing-library/{react,dom,jest-dom,user-event}`, `jsdom`, `@playwright/test`, `msw@2`, `eslint-config-prettier`, `eslint-plugin-jsx-a11y`, `prettier`, `autoprefixer`, `postcss@^8.5.16`.
- `next` actualizado a `14.2.35` (última 14.2.x parcheada por CVE individual) + `eslint-config-next@14.2.35`.
- `package-lock.json` versionado; `npm ci` limpio.
- Security checks: `npm audit --omit=dev` → **1 High + 2 Moderate** (ver §10 / README). El High es la advisory agregada de `next` (rango `9.3.4 – 16.3.0-canary.5`) sin fix estable fuera del rango sin romper el pin Next 14 (ADR-FE-001) → **tracked, no bloqueante** (SEC-02/SEC-06 permiten High/Critical con seguimiento). Moderates (`next-intl@3` pin, `postcss` nested en next) por debajo del umbral bloqueante.

### FE-003 (Done) — configuración base
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `forceConsistentCasingInFileNames`, `paths @/*`, `moduleResolution: "bundler"`, `jsx: "preserve"`.
- `next.config.mjs`: ESM, `reactStrictMode: true`, sin `experimental.serverActions`, sin rewrites.
- `tailwind.config.ts`: `content: ['./src/**/*.{ts,tsx}']`. `postcss.config.mjs`: tailwind + autoprefixer.
- `.eslintrc.cjs`: `next/core-web-vitals` + `plugin:jsx-a11y/recommended` + `prettier` (prettier al final). `.eslintrc.json` de create-next-app eliminado.
- `.prettierrc`: `singleQuote`, `semi`, `trailingComma: all`, `printWidth: 100`.

### FE-004 / QA-004 (Done) — estructura Doc 15 §15
- 21 dirs bajo `web/src/` (`app`, `features`, `shared/{api-client,design-system,design-tokens,hooks,i18n,lib,observability,providers,auth-session,authorization,error-handling}`, `tests/{e2e,unit,integration,msw}`, `messages`).
- Placeholders: 9 `.gitkeep` + 6 `README.md` (features, shared/i18n, shared/providers, shared/authorization, tests/msw, messages) nombrando la historia owner (US-104/105/106/107).

### FE-005 (Done) — scripts npm
- 11 scripts: `dev`, `build`, `start`, `lint` (`--max-warnings=0`), `lint:fix`, `format`, `typecheck`, `test`, `test:watch`, `test:e2e`, `test:e2e:install`.

### FE-006 (Done) — layout + page (smoke target)
- `src/app/layout.tsx`: Server Component, `<html lang="es-419">` (D1) `<body>{children}</body>`; `metadata` propia (sin fuentes remotas — se removió `localFont`/`src/app/fonts`).
- `src/app/page.tsx`: `<main><h1>EventFlow</h1></main>` (string literal como excepción documentada; clases Tailwind mínimas para wiring). `globals.css`: solo directivas `@tailwind`.

### FE-007 / QA-001 / QA-002 (Done) — configs de test + smokes
- `vitest.config.ts` (jsdom, globals, setupFiles, alias `@/*`, include unit/integration `*.test.ts(x)`), `vitest.setup.ts` (`@testing-library/jest-dom/vitest`).
- `playwright.config.ts` (`testDir src/tests/e2e`, `testMatch *.spec.ts`, chromium, `baseURL localhost:3000`, `webServer: npm run build && npm run start`, `reuseExistingServer !CI`).
- `src/tests/unit/smoke.test.ts` (`1+1===2`, 1 passed). `src/tests/e2e/smoke.spec.ts` (200 + `<main>` + `<h1>` visibles, 1 passed).

### QA-003 (Done) — pipeline canónico
- `npm ci` → 0 · `npm run lint` → 0 · `npm run typecheck` → 0 · `npm run test` → 0 · `npm run build` → 0. Lint sin warnings con `--max-warnings=0`.

### FE-008 / SEC-001 (Done) — env + hygiene
- `.env.local.example` con exactamente `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY` (sin valores reales/secrets). `.gitignore`: `.env*` + `!.env.local.example`.
- `git check-ignore .env.local` → `ignored`; `.env.local.example` trackeado; `web/.env.local` no existe. `next.config.mjs` sin `publicRuntimeConfig`/`serverRuntimeConfig`.

### QA-005 (Done) — PR hygiene (AC-08)
- 0 `'use server'`, 0 `src/app/api/*`, 0 `QueryClient/QueryProvider` en código, 0 handlers MSW (`setupServer/Worker`), 0 route groups `(*)`, 0 `middleware.ts`, sin `experimental.serverActions` real, sin rewrites/OpenAI/`/api/v1` real. Las únicas coincidencias son menciones en README/comentarios (documentación de boundaries).

### DOC-001 / DOC-002 (Done) — documentación
- `web/README.md`: Setup, Scripts, Env vars, Stack (versiones efectivas), Security (+ vulnerabilidades tracked), Out of Scope, Documentation Alignment (3 ítems), Estructura.

### OPS-002 (Done) — CI workflow
- `.github/workflows/web-ci.yml`: job `build-and-test` (Node desde `.nvmrc`, cache npm) corre `npm ci → lint → typecheck → test → build → test:e2e:install → test:e2e` + `npm audit --omit=dev` informativo. Path-filtered a `web/**` (no colisiona con `ci.yml` backend). No ejecutado en local (se validará en el PR — la memoria "Always verify CI green" aplica al abrir PR).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | `<html lang="es-LATAM">` (literal en spec §8 y tasks FE-006) | `<html lang="es-419">` | `es-LATAM` no es un tag BCP-47 válido → `jsx-a11y/lang` (recommended, error) rompería `next lint --max-warnings=0` (AC-05). `es-419` es el tag BCP-47 correcto para Español LATAM. | Bajo (mejora WCAG/a11y) | Ninguna | §8 Frontend (lang) | No | Documentado en layout + README; US-104 hará `lang` dinámico |
| D2 | `create-next-app@latest` (spec §18 paso 1) | `create-next-app@14.2.15` + upgrade a `next@14.2.35` | `@latest` genera Next 16/React 19/Tailwind 4, violando los pins duros AC-02 (`next@^14`, tailwind `^3`) y el modelo de config de AC-03 (Tailwind 4 no usa `tailwind.config.ts`+autoprefixer). | Ninguno (alinea a spec) | Ninguna | §6 AC-02, §18 | No | Re-scaffold con 14; versiones efectivas en README |
| D3 | `@hookform/resolvers` sin pin | Resuelto a `@hookform/resolvers@5` | La historia solo fija `zod@^3` y `react-hook-form@^7`; resolvers no está pineado. v5 es compatible con RHF 7 + Zod 3. | Bajo | Ninguna | §6 AC-02 (dep del stack §7) | No | Nota; sin impacto funcional |

## 10. Final Validation

- Task completion: 19/19 Done (0 In Progress, 0 Blocked, 0 Rework, 0 Skipped)
- Acceptance Criteria coverage: 8/8 (AC-01..AC-08) con evidencia (§5 mapeo + §7)
- Lint: `npm run lint` (`next lint --max-warnings=0`) → **Passed** (exit 0, sin warnings). ESLint `next/core-web-vitals` + `jsx-a11y` + `eslint-config-prettier` activos.
- Typecheck: `npm run typecheck` (`tsc --noEmit`, strict + noUncheckedIndexedAccess) → **Passed** (exit 0)
- Tests: `npm run test` (`vitest run`) → **Passed** (1 passed) — smoke unit
- Build: `npm run build` (`next build`) → **Passed** (exit 0, sin warnings)
- E2E: `npm run test:e2e` (Playwright chromium) → **Passed** (1 passed, 200 + `<main>` + `<h1>`)
- Migrations / Seed: **Not Applicable** — historia frontend sin persistencia
- Authorization: **Not Applicable** — frontend UX-only (ADR-FE-003); sin guards de rol en US-103
- Security: **Passed** — sin secrets; solo `NEXT_PUBLIC_*`; `.env.local` ignorado; sin Server Actions/API Routes BFF; sin rewrites externos. `npm audit --omit=dev`: 1 High (advisory agregada de `next`, **tracked** upstream sin fix estable — SEC-06 permite High con seguimiento) + 2 Moderate (bajo umbral bloqueante). Documentado en README.
- Accessibility: **Passed (base)** — `eslint-plugin-jsx-a11y` activo; `<html lang>` válido (`es-419`)
- i18n: **Not Applicable funcional** — `next-intl` instalado; config/catálogos → US-104
- Documentation: **Passed** — `web/README.md` (8 secciones) + 3 Documentation Alignment registrados
- Out of scope (AC-08): **Passed** — 0 artefactos fuera de scope (hygiene verificado)
- Cambios no relacionados en working tree: Ninguno (solo `web/`, `.github/workflows/web-ci.yml`, `management/workflows/`)
- Unresolved debt: (a) advisory agregada de `next` a revisar al aparecer release estable fuera del rango (Next 14 pin no se reabre); (b) `next-intl@3` moderate — migración v4 evaluable en US-104/housekeeping; (c) 3 Documentation Alignment (npm vs pnpm, Doc 15 §17, ADR-FE-007) coordinados con US-104.
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-09T22:17:03Z | Initialized | Execution record creado |
| 2026-07-09T22:17:03Z | Readiness | READY_WITH_WARNINGS (W1, W2, W3) |
| 2026-07-09T22:17:03Z | Alignment | ALIGNED_WITH_NOTES |
| 2026-07-09T22:29:34Z | Implementación | 19 tareas Not Started → Done; scaffolding Next 14 en `web/` + stack Doc 15 §7 + configs + estructura §15 + smokes + README + web-ci.yml |
| 2026-07-09T22:29:34Z | Validación | ci/lint/typecheck/test/build/e2e = Passed (exit 0); audit prod 1 High tracked + 2 Moderate; hygiene AC-08 limpio |
| 2026-07-09T22:29:34Z | Done | User Story US-103 completada (Execution Record Status → Done) |
