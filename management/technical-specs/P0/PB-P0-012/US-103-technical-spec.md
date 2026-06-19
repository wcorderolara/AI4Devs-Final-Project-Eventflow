# Technical Specification — US-103: Inicializar la aplicación Next.js (App Router) + TypeScript con el stack frontend MVP

## 1. Metadata

| Field                                  | Value                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                          | US-103                                                                                                                                 |
| Source User Story                      | `management/user-stories/US-103-bootstrap-nextjs-app-router.md`                                                                         |
| Decision Resolution Artifact           | No existe — la historia refinada incorporó las decisiones directamente en `PO/BA Decisions Applied` (sin preguntas bloqueantes)         |
| Priority                               | P0                                                                                                                                     |
| Backlog ID                             | PB-P0-012                                                                                                                              |
| Backlog Title                          | Frontend Next.js Bootstrap & i18n                                                                                                      |
| Backlog Execution Order                | 12 (de 18 items P0 priorizados)                                                                                                        |
| User Story Position in Backlog Item    | 1 de 3                                                                                                                                 |
| Related User Stories in Backlog Item   | US-103 (bootstrap), US-104 (i18n functional), US-105 (route groups por rol)                                                              |
| Epic                                   | EPIC-FE-001 — Frontend Next.js Application Foundation                                                                                  |
| Backlog Item Dependencies              | — (foundation; PB-P0-012 no depende de otros items P0)                                                                                  |
| Feature                                | Bootstrap Next.js — scaffolding del proyecto frontend MVP                                                                              |
| Module / Domain                        | Platform / FE                                                                                                                          |
| User Story Status                      | Approved with Minor Notes                                                                                                              |
| Backlog Alignment Status               | Found                                                                                                                                  |
| Technical Spec Status                  | Ready for Task Breakdown                                                                                                               |
| Created Date                           | 2026-06-19                                                                                                                             |
| Last Updated                           | 2026-06-19                                                                                                                             |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P0-012 — Frontend Next.js Bootstrap & i18n**. Item P0 foundation que entrega la app Next.js con App Router + TypeScript + Tailwind + next-intl con 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`) y route groups por rol. Server Components por defecto en áreas SEO; Client en autenticadas. Sin dependencias técnicas con otros items P0 (`Dependencies | —` en el backlog). Trazabilidad: Doc 15, NFR-A11Y-*, NFR-I18N-*, ADR-FE-001.

### Execution Order Rationale

PB-P0-012 está en la **posición 12 de 18** entre los items P0. No depende de los items previos (puede ejecutarse en paralelo con el bloque backend PB-P0-001..PB-P0-011 y con SEC/QA/DevOps). US-103 es el **primer ladrillo de PB-P0-012** y de EPIC-FE-001: hasta que se mergee, ni US-104 (i18n functional sobre el bootstrap) ni US-105 (route groups por rol sobre el bootstrap) pueden iniciarse. Por eso US-103 se trabaja antes que cualquier otra historia frontend.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                                  | Suggested Order |
| ---------- | ------------------------------------------------------------------------------------- | --------------- |
| US-103     | Bootstrap del proyecto + stack + configuración base + estructura Doc 15 §15           | 1               |
| US-104     | Configuración funcional `next-intl` 4 locales + locale switcher + catálogos transversales | 2           |
| US-105     | 4 route groups (`(public)`, `(auth)`, `(app)`, `(admin)`) + middleware UX role guard + SEO baseline | 3   |

US-104 y US-105 pueden iniciarse en paralelo una vez US-103 está mergeada, pero US-105 reutiliza el `middleware.ts` creado en US-104 (para `localeMiddleware`), por lo que el orden recomendado sigue siendo secuencial.

---

## 3. Executive Technical Summary

US-103 entrega el **scaffolding del proyecto frontend MVP** en `web/` (raíz del repo) como aplicación Next.js 14+ con App Router + TypeScript 5.x estricto, instalando el stack cerrado por **Doc 15 §7** (TanStack Query 5.x, RHF 7.x, Zod 3.x, Tailwind 3.x, next-intl 3.x, MSW 2.x, Vitest + Testing Library, Playwright, ESLint + Prettier, date-fns, lucide-react, Headless UI / Radix UI primitives), configuración base (`tsconfig.json` con `strict` + `noUncheckedIndexedAccess`, `next.config.mjs` ESM sin Server Actions, `tailwind.config.ts` mínimo, `vitest.config.ts`, `playwright.config.ts`, ESLint con `next/core-web-vitals` + `jsx-a11y` + `eslint-config-prettier`, Prettier, `.env.local.example` solo con `NEXT_PUBLIC_*`, `.gitignore`, `.nvmrc`), estructura de carpetas Doc 15 §15 anclada con `.gitkeep`/README, scripts npm alineados al pipeline canónico de Doc 21 §9.2 (`npm ci && npm run lint && npm run typecheck && npm run test && npm run build`) y smoke E2E Playwright sobre `/`.

La historia NO entrega i18n funcional (US-104), route groups (US-105), `QueryClient`/MSW handlers (US-106), ni layouts por rol (US-107). El frontend respeta de manera estricta ADR-FE-001 (Next.js + App Router), ADR-FE-002 (REST + TanStack Query), ADR-FE-003 (frontend authorization es UX, no fuente de verdad), ADR-API-001 (REST puro, sin Server Actions ni API Routes BFF). El proyecto queda **Amplify-ready**: el build local canónico pasa verde, alineado a Doc 21 §9.2.

---

## 4. Scope Boundary

### In Scope

* Creación del proyecto Next.js 14+ + TypeScript 5.x con App Router en `web/`.
* Instalación del stack Doc 15 §7 con versiones objetivo y `package-lock.json` versionado.
* Configuración base: `tsconfig.json` estricto, `next.config.mjs` ESM sin Server Actions, `tailwind.config.ts` mínimo, `postcss.config.mjs`, ESLint (`next/core-web-vitals` + `jsx-a11y` + `eslint-config-prettier`), Prettier, `vitest.config.ts` (jsdom + setup files), `playwright.config.ts` con `webServer`.
* Variables de entorno: `.env.local.example` solo con `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`.
* Estructura de carpetas Doc 15 §15: `src/{app,features,shared/{api-client,design-system,design-tokens,hooks,i18n,lib,observability,providers,auth-session,authorization,error-handling},tests/{e2e,unit,integration,msw},messages}` con `.gitkeep`/README placeholders.
* Página raíz mínima (`app/page.tsx`) como smoke target.
* Scripts npm: `dev`, `build`, `start`, `lint`, `lint:fix`, `format`, `typecheck`, `test`, `test:watch`, `test:e2e`, `test:e2e:install`.
* `engines.node >= 20.0.0` + `.nvmrc` con `20`.
* Smoke E2E Playwright (`tests/e2e/smoke.spec.ts`) sobre `/` (200 + `<main>` visible).
* Smoke unit placeholder (`tests/unit/smoke.test.ts`) que mantiene `npm run test` verde.
* `web/README.md` con setup local, scripts y env vars.

### Out of Scope

* **i18n funcional** (middleware `next-intl`, catálogos `messages/*.json`, locale switcher) → US-104.
* **Route groups por rol** (`(public)`, `(auth)`, `(app)`, `(admin)`) y `middleware.ts` de routing → US-105.
* **`QueryClient` global, `<QueryProvider>`, `<MSWProvider>`, MSW handlers** → US-106 (PB-P0-013).
* **Layouts y navegación por rol** → US-107 (PB-P0-013).
* **Design system completo** (componentes base, tokens, paleta semántica) → historias UI posteriores.
* **`apiClient`** Axios/fetch wrapper → primera historia que consuma backend (típicamente US-106 o US-AUTH-*).
* **Auth, captcha, rate limiting, observabilidad cliente** → historias SEC/Auth/Observability posteriores.
* **Pipeline Amplify** (provisioning AWS + workflow CD) → tarea DevOps separada.
* **Sentry, TanStack Table 8.x, Server Actions, API Routes BFF** → Future / prohibido MVP.

### Explicit Non-Goals

* No se construye ninguna feature de dominio (eventos, vendors, quotes, IA, admin).
* No se introduce lógica de autenticación ni cookies de sesión.
* No se introduce ninguna llamada al backend.
* No se compromete el invariante backend-as-source-of-truth (ADR-FE-003): sin guards de role/ownership en cliente, sin Server Actions, sin API Routes BFF.
* No se modifica el backend ni la base de datos.

---

## 5. Architecture Alignment

### Backend Architecture

No aplica. Esta historia no toca backend.

### Frontend Architecture

Cumple **íntegramente** Doc 15:

* **Doc 15 §6/§11/§17**: Next.js 14+ + App Router + TypeScript, sin Server Actions ni API Routes BFF; routing solo para servir UI.
* **Doc 15 §7**: stack instalado con versiones objetivo MVP exactas.
* **Doc 15 §15**: estructura de carpetas `src/app/`, `src/features/`, `src/shared/{api-client,design-system,design-tokens,hooks,i18n,lib,observability,providers,auth-session,authorization,error-handling}`, `src/tests/{e2e,unit,integration,msw}`, `src/messages/` con placeholders.
* **Doc 15 §16**: arquitectura feature-first preparada (carpetas vacías con README placeholder).
* **ADR-FE-001/002/003 y ADR-API-001**: Next.js + REST + frontend UX-only.

### Database Architecture

No aplica.

### API Architecture

No aplica directamente. Documentación: las historias siguientes consumirán el contrato REST `/api/v1` (Doc 16) vía TanStack Query (Doc 15 §26) cuando se introduzca el `apiClient`.

### AI / PromptOps Architecture

No aplica. Las features IA (Doc 17) consumirán el frontend cuando aparezcan; US-103 solo deja el bootstrap.

### Security Architecture

Cobertura mínima alineada a Doc 19 + ADR-FE-003:

* **Backend como única fuente de autorización** (ADR-FE-003): US-103 no introduce ninguna lógica de role/ownership/permission en cliente.
* **Sin secrets en repo**: `.env.local.example` solo con `NEXT_PUBLIC_*` sin valores; `.env.local` ignorado por git.
* **Sin Server Actions / API Routes BFF**: prohibidos por Doc 15 §6, ADR-FE-002/003, ADR-API-001.
* **`npm audit` High/Critical bloquea merge**: política CI heredada de Doc 21.

### Testing Architecture

Cumple Doc 20:

* **Vitest + Testing Library + jsdom** para unit/component.
* **Playwright** para E2E (un smoke en US-103; el resto se cubre por feature).
* **MSW 2.x** instalada en US-103, configurada con handlers en US-106.
* **Pipeline canónico Doc 21 §9.2**: `npm ci && npm run lint && npm run typecheck && npm run test && npm run build`.

---

## 6. Functional Interpretation

| Acceptance Criterion                                                                                                                             | Technical Interpretation                                                                                                                                                                                                                                                                                       | Impacted Layer(s) |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 Proyecto Next.js + TypeScript creado en `web/`                                                                                              | `npx create-next-app@latest web --typescript --app --tailwind --eslint --src-dir --import-alias '@/*'` + ajuste de versiones del stack Doc 15 §7 + scripts npm completos + `"private": true` + `"type": "module"` + `engines.node >= 20`                                                                       | FE Scaffolding    |
| AC-02 Stack MVP Doc 15 §7 instalado con versiones acordadas                                                                                       | Instalar paquetes en `web/` con versiones exactas (`next@^14`, `typescript@^5`, `@tanstack/react-query@^5`, `react-hook-form@^7`, `zod@^3`, `@hookform/resolvers`, `next-intl@^3`, `tailwindcss@^3`, `@headlessui/react`, Radix primitives, `lucide-react`, `date-fns`, Vitest stack, Playwright, MSW 2, ESLint, Prettier, jsx-a11y) | FE Dependencies   |
| AC-03 Configuración base aplicada                                                                                                                 | Crear/editar `tsconfig.json` (strict + `noUncheckedIndexedAccess` + paths alias `@/*`), `next.config.mjs` (ESM, `reactStrictMode: true`, sin `experimental.serverActions`), `tailwind.config.ts` (`content: ['./src/**/*.{ts,tsx}']`), `postcss.config.mjs`, ESLint config, `.prettierrc`, `.gitignore`, `.env.local.example`, `vitest.config.ts`, `playwright.config.ts` | FE Config         |
| AC-04 Estructura de carpetas Doc 15 §15 lista                                                                                                     | Crear todas las carpetas bajo `web/src/` con `.gitkeep` o `README.md` placeholder describiendo propósito e historia owner que la llenará                                                                                                                                                                          | FE Layout         |
| AC-05 Scripts npm operativos y CI verde local                                                                                                     | Implementar los 11 scripts npm en `package.json`. Validar que `npm ci && npm run lint && npm run typecheck && npm run test && npm run build` pasa con exit 0 y `--max-warnings=0`                                                                                                                              | FE CI             |
| AC-06 Smoke E2E Playwright pasa                                                                                                                   | Crear `tests/e2e/smoke.spec.ts` con un test que abre `/`, valida HTTP 200 y verifica `<main>` o `<h1>` visible. Configurar `webServer` en `playwright.config.ts`                                                                                                                                                | FE E2E            |
| AC-07 `.env.local.example` y secretos                                                                                                             | Versionar `.env.local.example` con `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY` (sin valores reales). Confirmar `.gitignore` ignora `.env*` excepto `.env.local.example`                                                                                                  | FE Config         |
| AC-08 La historia NO incluye artefactos fuera de scope                                                                                            | Revisión PR + scripts/checks que verifican que no aparece middleware `next-intl` funcional, route groups, `QueryClient`, MSW handlers, layouts por rol, design system, features, `apiClient`, Server Actions, API Routes BFF, configs Sentry, rewrites a OpenAI o `/api/v1/*`                                  | FE PR Hygiene     |

---

## 7. Backend Technical Design

No aplica. Esta historia no toca backend, no agrega endpoints ni servicios, no consume APIs y no interactúa con el modular monolith ni la base de datos.

---

## 8. Frontend Technical Design

### Routes / Pages

* Solo `web/src/app/page.tsx` (servida como smoke target). Sin layouts por rol, sin route groups, sin `loading.tsx`/`error.tsx`/`not-found.tsx` específicos (esos viven en US-105).
* `web/src/app/layout.tsx` mínimo (Server Component): declara `<html lang="es-LATAM">` estático (US-104 lo hará dinámico) y `<body>{children}</body>`.

### Components

Ninguno propio en US-103. Solo lo necesario para que la página raíz renderice un `<main>` con un `<h1>` con texto literal placeholder (este es el único caso aceptado de string literal en US-103, dado que el lint anti-hardcoded llega en US-104; documentar la excepción).

### Forms

No aplica. RHF + Zod + `@hookform/resolvers` instalados como dependencias, sin schemas ni componentes.

### State Management

No aplica. TanStack Query 5.x instalada, sin `QueryClient` ni `QueryProvider` (eso es US-106).

### Data Fetching

No aplica. Sin `apiClient`, sin hooks, sin interceptors.

### Loading / Empty / Error / Success States

No aplica en US-103 (sin componentes de dominio). El root layout queda preparado para recibir los providers globales en historias posteriores.

### Accessibility

Base preparada:

* `eslint-plugin-jsx-a11y` instalado y activo en la config ESLint.
* `<html lang>` estático (US-104 lo hará dinámico) cumple WCAG 2.1 AA mínimo.
* Auditorías Lighthouse/axe-core viven en historias UI posteriores.

### i18n

* `next-intl 3.x` instalada como dependencia.
* `src/shared/i18n/` y `src/messages/` creadas como carpetas vacías con README placeholder ("config de next-intl viene en US-104"; "catálogos por locale vienen en US-104").
* Sin `<IntlProvider>` ni middleware: US-104 los entrega.

---

## 9. API Contract Design

No aplica. US-103 no introduce ningún consumo de API. Documentación: las historias siguientes consumirán el contrato REST `/api/v1` (Doc 16) cuando se cree el `apiClient` (US-106 o US-AUTH-*).

---

## 10. Database / Prisma Design

No aplica. US-103 no toca persistencia.

---

## 11. AI / PromptOps Design

No aplica. US-103 no invoca ni renderiza output IA.

---

## 12. Security & Authorization Design

### Authentication

No aplica directamente. La cookie HTTP-only de sesión la emite el backend en US-108 (PB-P0-006); US-103 no la lee ni la procesa.

### Authorization

No aplica. **ADR-FE-003**: el frontend es UX-only; el backend es la única fuente de autorización. US-103 no introduce ningún check de role/ownership/permission en cliente.

### Ownership Rules

No aplica.

### Role Rules

No aplica.

### Negative Authorization Scenarios

No aplica. Negative tests RBAC viven en US-112 (backend) y en US-105 (UX redirects).

### Audit Requirements

No aplica. No hay AdminAction en US-103.

### Sensitive Data Handling

* Sin secrets en repo: `.env.local.example` solo `NEXT_PUBLIC_*` sin valores.
* `.gitignore` ignora `.env*` excepto `.env.local.example`.
* `next.config.mjs` sin rewrites a APIs externas; sin `experimental` flags que comprometan el sandbox de Next.
* `npm audit --omit=dev` High/Critical bloquea merge.

---

## 13. Testing Strategy

### Unit Tests

* `tests/unit/smoke.test.ts` con placeholder mínimo (`expect(1 + 1).toBe(2)`) para mantener `npm run test` verde.
* Vitest config con `environment: 'jsdom'`, `setupFiles` para `@testing-library/jest-dom`, alias `@/*`.

### Integration Tests

No aplica en US-103 (sin lógica de integración entre módulos).

### API Tests

No aplica.

### E2E Tests

* `tests/e2e/smoke.spec.ts` (Playwright): abre `/`, valida HTTP 200 y `<main>` o `<h1>` visible.
* `playwright.config.ts` con un proyecto `chromium`, `webServer` que ejecuta `npm run build && npm run start` o `npm run dev`, `baseURL: 'http://localhost:3000'`.
* `test:e2e:install` ejecuta `npx playwright install --with-deps chromium`.

### Security Tests

* `npm audit --omit=dev` debe correr en CI; vulnerabilidades High/Critical sin issue de seguimiento bloquean merge.
* Lint structural opcional (regex sobre el PR) que verifique que no se introducen Server Actions ni API Routes BFF.

### Accessibility Tests

* `eslint-plugin-jsx-a11y` activo (validado por `npm run lint`).
* Auditorías Lighthouse / axe-core viven en historias UI posteriores.

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica.

### CI Checks

Pipeline canónico Doc 21 §9.2 verde:

```bash
npm ci
npm run lint        # --max-warnings=0
npm run typecheck   # tsc --noEmit con strict + noUncheckedIndexedAccess
npm run test        # Vitest
npm run build       # next build
npm run test:e2e    # Playwright smoke
```

Más `npm audit --omit=dev` y secret scanner.

---

## 14. Observability & Audit

### Logs

* Solo logs por defecto de Next.js dev/build. Sin logger interno introducido en US-103.

### Correlation ID

No aplica. Cuando aparezca el `apiClient` (US-106), se agregará el interceptor para propagar `X-Correlation-Id` desde el backend (Doc 14/16).

### AdminAction

No aplica.

### Error Tracking

* `next.config.mjs` con `reactStrictMode: true` para detectar side effects en dev.
* Sentry / observability cliente full es Future (Doc 15 §7).

### Metrics

No aplica en US-103. El healthcheck del frontend (alineado a Doc 21) se ejerce vía el pipeline canónico y el smoke E2E.

---

## 15. Seed / Demo Data Impact

No aplica. US-103 no afecta el seed ni la demo. La demo multilingüe llega con US-104 (i18n funcional) y las features de dominio.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict                                                                                                  | Current Decision                                                                                          | Recommended Action                                                                                 | Blocks Implementation? |
| ----------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------- |
| Doc 15 §7         | "pnpm preferido o npm" vs Doc 21 §9.2 que adopta `npm ci` canónico.                                       | US-103 adopta **npm** alineado a Doc 21 §9.2 (Amplify build pipeline).                                    | Amender Doc 15 §7 post-merge para reflejar "npm canónico MVP, pnpm Future" o redactar ADR si aplica. | No                     |
| Doc 15 §17        | "Locale URL strategy — decisión a confirmar en ADR".                                                       | US-103 no toca routing locale; US-104 formalizará la decisión y propondrá ADR-FE-007 si aplica.            | Sincronizar amendment post-merge de US-104 con Doc 15 §17.                                          | No                     |
| Doc 15 §49        | ADR-FE-007 referenciada en la tabla resumen pero NO redactada en Doc 22 (que solo contiene ADR-FE-001..004). | US-103 no consume ADR-FE-007 directamente (lo hace US-104). Documentado en US-104 spec.                    | Redactar ADR-FE-007 en Doc 22 como housekeeping del PB-P0-012 (lo cubre US-104 spec).                | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                                                  | Impact                                                                                                          | Mitigation                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versiones de Next.js / TanStack Query / React divergen entre lo instalado por `create-next-app` y los pins de Doc 15 §7.                | Build inestable o features no disponibles.                                                                       | Después de `create-next-app`, ejecutar `npm install` con versiones objetivo explícitas y validar `package-lock.json`. Documentar en `web/README.md` § "Stack" las versiones efectivas. |
| Conflictos entre ESLint (`next/core-web-vitals`) y Prettier que produzcan errores en CI.                                              | Lint falla, bloqueando el merge.                                                                                 | `eslint-config-prettier` al final del `extends` para desactivar reglas conflictivas. CI no aplica `--fix`; el formato es local.                                                         |
| Playwright sin browsers descargados en CI.                                                                                            | `npm run test:e2e` falla.                                                                                        | Script `test:e2e:install` ejecuta `npx playwright install --with-deps chromium`; CI lo invoca antes de `test:e2e`.                                                                     |
| Node de versión incorrecta en local.                                                                                                  | `npm install` o `npm run dev` falla con errores poco claros.                                                     | `engines.node >= 20.0.0` + `.nvmrc` con `20`; README documenta `nvm use`.                                                                                                              |
| Drift entre Doc 15 §15 (estructura con `app/middleware.ts`) y App Router (convención `src/middleware.ts` project-root).                | Inconsistencia documental que confunde a devs nuevos.                                                            | US-103 deja `src/` como source dir; el `middleware.ts` lo crea US-104 en `src/middleware.ts`. Documentation Alignment ya tracked en US-104 spec.                                       |
| Vulnerabilidades High/Critical en dependencias instaladas.                                                                            | Bloqueo de merge por `npm audit`.                                                                                | Política CI documentada; cuando aparezca, abrir issue de seguimiento o subir versiones del paquete afectado.                                                                          |
| Equipo agrega dependencias fuera del stack Doc 15 §7 sin ADR.                                                                          | Scope creep y deuda técnica.                                                                                     | VR-02 obliga a justificar cualquier dep extra con ADR; revisión PR estricta.                                                                                                          |

---

## 18. Implementation Guidance for Coding Agents

### Files / folders likely impacted

* `web/` (nuevo).
* `web/package.json`, `web/package-lock.json`.
* `web/tsconfig.json`, `web/next.config.mjs`, `web/tailwind.config.ts`, `web/postcss.config.mjs`.
* `web/.eslintrc.cjs` (o `web/eslint.config.mjs`), `web/.prettierrc`, `web/.gitignore`, `web/.nvmrc`, `web/.env.local.example`.
* `web/vitest.config.ts`, `web/playwright.config.ts`.
* `web/src/app/layout.tsx`, `web/src/app/page.tsx`.
* `web/src/{features,shared/{api-client,design-system,design-tokens,hooks,i18n,lib,observability,providers,auth-session,authorization,error-handling}}/.gitkeep` + README placeholder.
* `web/src/tests/{e2e,unit,integration,msw}/.gitkeep`.
* `web/src/tests/unit/smoke.test.ts`, `web/src/tests/e2e/smoke.spec.ts`.
* `web/src/messages/.gitkeep`.
* `web/public/` (creado por `create-next-app`).
* `web/README.md`.
* `.github/workflows/web-ci.yml` (opcional en US-103 si el repo aún no tiene workflow frontend; puede vivir en sub-tarea DevOps si el equipo lo prefiere).

### Recommended order of implementation

1. Bootstrap proyecto: `cd <repo-root> && npx create-next-app@latest web --typescript --app --tailwind --eslint --src-dir --import-alias '@/*'` (responder NO a otras integraciones; aceptar Tailwind y ESLint).
2. Ajustar `web/package.json`: agregar `engines.node`, `"type": "module"`, declarar los 11 scripts npm.
3. Instalar el resto del stack Doc 15 §7 con versiones objetivo (`npm install @tanstack/react-query@^5 react-hook-form@^7 zod@^3 @hookform/resolvers next-intl@^3 msw@^2 @headlessui/react lucide-react date-fns` y devDeps: `vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test eslint-config-prettier eslint-plugin-jsx-a11y prettier`).
4. Endurecer `tsconfig.json` con `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride` + `forceConsistentCasingInFileNames` + paths alias `@/*`.
5. Ajustar `next.config.mjs` a ESM con `reactStrictMode: true`, sin `experimental.serverActions`, sin rewrites externos.
6. Ajustar ESLint: extends `next/core-web-vitals` + `eslint-config-prettier` + plugin `jsx-a11y`; `.prettierrc` con reglas EventFlow (singleQuote, semi, trailingComma all, printWidth 100).
7. Crear `vitest.config.ts` (jsdom + setup files + alias `@/*`) y `playwright.config.ts` (`chromium`, `webServer`, `baseURL: 'http://localhost:3000'`).
8. Crear estructura `web/src/{app,features,shared,tests,messages}` con `.gitkeep` y README placeholders.
9. Crear `web/src/app/layout.tsx` mínimo + `web/src/app/page.tsx` con `<main>` + `<h1>` placeholder.
10. Crear `tests/unit/smoke.test.ts` y `tests/e2e/smoke.spec.ts`.
11. Crear `web/.env.local.example`, `.gitignore`, `.nvmrc` (`20`).
12. Validar pipeline canónico Doc 21 §9.2 en local: `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`.
13. Escribir `web/README.md` con setup local, scripts y env vars.
14. (Opcional, coordinado con DevOps) Agregar workflow GitHub Actions para `web/`.

### Decisions that must not be reopened

* **Next.js 14+ con App Router** (ADR-FE-001).
* **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`).
* **Sin Server Actions ni API Routes BFF** (Doc 15 §6, ADR-FE-002/003, ADR-API-001).
* **npm como gestor canónico MVP** (alineado a Doc 21 §9.2).
* **Proyecto en `web/`** (no monorepo `apps/web/`).
* **Variables de entorno solo `NEXT_PUBLIC_*`** (Doc 21 §9.3).
* **Frontend authorization es UX-only** (ADR-FE-003): sin guards de role/ownership en cliente.
* **Stack cerrado a Doc 15 §7**: cualquier dep adicional requiere ADR.

### What must not be implemented

* Configuración de `next-intl` (middleware, catálogos, switcher) — pertenece a US-104.
* Route groups `(public)`, `(auth)`, `(app)`, `(admin)` — pertenecen a US-105.
* `QueryClient`, `<QueryProvider>`, handlers MSW — pertenecen a US-106.
* Layouts y navegación por rol — pertenecen a US-107.
* `apiClient`, hooks de feature, schemas Zod por feature, mappers — historias por feature.
* Sentry, observability cliente full — Future.
* TanStack Table 8.x — diferido (Doc 15 §7 "selectivo").
* Server Actions, API Routes BFF, proxy a OpenAI — prohibidos.

### Assumptions to preserve

* Node 20 LTS en local y CI.
* Repositorio no tiene aún proyecto frontend previo bajo `web/`/`frontend/`/`apps/web/`.
* GitHub Actions (o equivalente) puede correr Node 20 + npm.
* `tailwind.config.ts` parte con preset por defecto + extensión mínima (sin pretender ser el design system completo).

---

## 19. Task Generation Notes

### Suggested Task Groups

1. **FE-103-SCAFFOLD** — Crear proyecto Next.js + TypeScript + App Router en `web/` (`create-next-app`, ajustar `package.json`, `engines.node`, `.nvmrc`).
2. **FE-103-STACK** — Instalar el resto del stack Doc 15 §7 (TanStack Query, RHF, Zod, next-intl, Tailwind, MSW, Vitest stack, Playwright, ESLint plugins, Prettier, date-fns, lucide-react, Headless UI).
3. **FE-103-CONFIG** — Configuración base: `tsconfig.json` estricto, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, ESLint config, `.prettierrc`, `.gitignore`, `.env.local.example`, `vitest.config.ts`, `playwright.config.ts`.
4. **FE-103-STRUCTURE** — Crear estructura `web/src/{app,features,shared,tests,messages}` con `.gitkeep` y README placeholders.
5. **FE-103-SMOKE** — `app/page.tsx` mínimo + `tests/unit/smoke.test.ts` + `tests/e2e/smoke.spec.ts` + validar pipeline canónico Doc 21 §9.2.
6. **FE-103-DOCS** — Escribir `web/README.md` con setup, scripts y env vars.
7. **FE-103-CI** (opcional, coordinado con DevOps) — Workflow GitHub Actions para `web/`.

### Required QA Tasks

* Validar `npm ci && npm run lint && npm run typecheck && npm run test && npm run build` exit 0 en local y CI.
* Validar smoke E2E Playwright (AC-06).
* Validar lint con `--max-warnings=0` (AC-05).
* Validar `npm audit --omit=dev` sin High/Critical sin issue de seguimiento.
* Verificar estructura Doc 15 §15 completa con `.gitkeep`/README.
* Verificar `.env.local.example` sin valores reales y `.env.local` no versionado.

### Required Security Tasks

* Confirmar SEC-01..SEC-06 cumplidos: ADR-FE-003 invariante, sin secrets, sin Server Actions, sin API Routes BFF.
* Política `npm audit` en CI documentada.
* Secret scanner CI activo sobre el PR.

### Required Seed/Demo Tasks

No aplica.

### Required Documentation Tasks

* `web/README.md` con setup local, scripts y env vars.
* Housekeeping post-merge: amender Doc 15 §7 (npm canónico) y coordinar con US-104 la redacción de ADR-FE-007.

### Dependencies between Tasks

* `FE-103-SCAFFOLD` → `FE-103-STACK` → `FE-103-CONFIG` → `FE-103-STRUCTURE` → `FE-103-SMOKE` → `FE-103-DOCS`.
* `FE-103-CI` puede ejecutarse en paralelo a `FE-103-DOCS` una vez `FE-103-SMOKE` esté verde.

### Consolidated `tasks.md` for PB-P0-012?

Sí — recomendado. Al cerrar el ciclo de las 3 historias (US-103/104/105), el backlog item PB-P0-012 debería tener un `tasks.md` consolidado en `management/development-tasks/P0/PB-P0-012/tasks.md` con el orden de ejecución end-to-end del bootstrap frontend. US-103 escribe la primera sección; US-104/US-105 agregan las suyas cuando se generen.

---

## 20. Technical Spec Readiness

| Check                                                  | Status |
| ------------------------------------------------------ | ------ |
| User Story approved or explicitly allowed for draft spec | Pass   |
| Product Backlog mapping found                          | Pass   |
| Decision Resolution reviewed if present                | N/A    |
| Scope clear                                            | Pass   |
| Architecture alignment clear                           | Pass   |
| API impact clear                                       | N/A    |
| DB impact clear                                        | N/A    |
| AI impact clear                                        | N/A    |
| Security impact clear                                  | Pass   |
| Testing strategy clear                                 | Pass   |
| Ready for Development Task Breakdown                   | Yes    |

---

## 21. Final Recommendation

**Ready for Task Breakdown**.

La historia entrega un alcance quirúrgico de scaffolding del proyecto frontend MVP, con decisiones cerradas (ADR-FE-001/002/003, ADR-API-001, Doc 15 §6/§7/§15, Doc 21 §9), 8 Acceptance Criteria atómicos y testables, configuración base concreta, estructura Doc 15 §15 anclada, pipeline canónico Doc 21 §9.2 verde y smoke E2E Playwright. Boundary explícito con US-104..US-107 evita scope creep. Sin gaps bloqueantes; tres Documentation Alignment Required no bloqueantes (npm vs pnpm, Doc 15 §17, ADR-FE-007 — todos heredados/coordinados con US-104). Lista para invocar `eventflow-user-story-to-development-tasks`.
