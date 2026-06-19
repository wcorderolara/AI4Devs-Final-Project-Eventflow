# 🧾 User Story: Inicializar la aplicación Next.js (App Router) + TypeScript con el stack frontend MVP (TanStack Query, RHF, Zod, Tailwind, next-intl, MSW, Vitest, Playwright, ESLint, Prettier)

## 🆔 Metadata

| Field                       | Value                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------- |
| ID                          | US-103                                                                                 |
| Epic                        | EPIC-FE-001 — Frontend Next.js Application Foundation                                  |
| Backlog Item                | PB-P0-012 — Frontend Next.js Bootstrap & i18n                                          |
| Feature                     | Bootstrap Next.js — scaffolding del proyecto frontend MVP                              |
| Module / Domain             | Platform / FE                                                                          |
| User Role                   | System                                                                                 |
| Priority                    | Must Have (P0)                                                                         |
| Status                      | Approved                                                                               |
| Owner                       | Tech Lead / Frontend Lead                                                              |
| Approved By                 | PO/BA Review (Approved with Minor Notes)                                               |
| Approval Date               | 2026-06-19                                                                             |
| Ready for Development Tasks | Yes                                                                                    |
| Sprint / Milestone          | MVP                                                                                    |
| Created Date                | 2026-06-09                                                                             |
| Last Updated                | 2026-06-19 (PO/BA approval gate)                                                       |

---

## 🎯 User Story

**As the** sistema EventFlow
**I want** inicializar la aplicación frontend `web/` como proyecto Next.js 14+ con App Router + TypeScript 5.x, instalar y declarar el stack MVP (TanStack Query 5.x, React Hook Form 7.x, Zod 3.x, Tailwind 3.x, next-intl 3.x, MSW 2.x, Vitest, Testing Library, Playwright, ESLint, Prettier, date-fns, lucide-react), montar la configuración base (`tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, ESLint, Prettier, scripts npm) y dejar la estructura de carpetas Doc 15 §15 lista
**So that** las historias subsiguientes (US-104 i18n, US-105 route groups, US-106 TanStack Query + MSW, US-107 layouts y navegación) construyan sobre un proyecto Next.js arrancable, type-safe, lint-limpio y con CI verde desde el día 1.

---

## 🧠 Business Context

### Context Summary

EventFlow se construye con un **modular monolith** backend (Node.js + Express) y un **frontend Next.js + App Router** desacoplado, según Doc 15 §6/§7 y ADR-FE-001. Esta historia es el **primer ladrillo** de EPIC-FE-001: crea el proyecto frontend en el repo, instala el stack MVP cerrado por Doc 15 §7 y formaliza la configuración base (TypeScript estricto, ESLint + Prettier, scripts npm, `.env.local.example`).

US-103 entrega exclusivamente el **scaffolding y la configuración base**. La integración funcional de cada herramienta se reparte en las historias siguientes del epic para mantener atómica la entrega:

* **US-104** — configuración real de `next-intl` con los 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`) y catálogos de mensajes.
* **US-105** — route groups por rol (`(public)`, `(auth)`, `(app)`, `(admin)`).
* **US-106** — `QueryClient` global de TanStack Query y handlers de MSW para dev/tests.
* **US-107** — layouts y navegación por rol.

Sin US-103, ninguna de las historias frontend posteriores puede ejecutarse: no hay proyecto Next.js, no hay scripts, no hay pipeline frontend, no hay path alias TypeScript, no hay convenciones de carpetas.

### Related Domain Concepts

* **Stack frontend Doc 15 §7** (versiones objetivo MVP).
* **App Router** (Doc 15 §11): Server Components por defecto, Client Components marcadas con `'use client'`.
* **Feature-first architecture** (Doc 15 §15/§16): `app/`, `features/`, `shared/`, `tests/`, `messages/`, `public/`.
* **Frontend autorizado solo a UX** (ADR-FE-003): el backend sigue siendo la única fuente de verdad para RBAC, ownership y assignment.

### PO/BA Decisions Applied

| Decision                                                | Resolution                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope de US-103                                          | US-103 entrega exclusivamente: (a) creación del proyecto Next.js + TypeScript con App Router; (b) instalación y declaración del stack MVP Doc 15 §7; (c) configuración base (`tsconfig.json` estricto, `next.config.mjs`, `tailwind.config.ts`, ESLint, Prettier, scripts npm, `.env.local.example`); (d) estructura de carpetas Doc 15 §15. NO configura i18n funcional, route groups, QueryClient, MSW handlers, layouts, ni features. |
| Boundary con US-104..US-107                              | i18n funcional → **US-104**. Route groups por rol → **US-105**. `QueryClient`/MSW handlers → **US-106**. Layouts/navegación → **US-107**. US-103 deja **instaladas** las dependencias y **listas las carpetas** (`shared/i18n/`, `shared/providers/`, `tests/msw/`, `messages/`) para que las stories siguientes solo agreguen contenido sin instalar nada nuevo. |
| Framework y router                                       | Next.js 14.x+ con App Router (ADR-FE-001). No Pages Router. No Server Actions. No API Routes salvo utilitarias mínimas (no aplican en MVP).                                                                                                                                                            |
| Lenguaje                                                 | TypeScript 5.x con `strict: true`, `noUncheckedIndexedAccess: true`, path alias `@/*` → `./src/*` (alineado a Doc 15 §15).                                                                                                                                                                              |
| Stack y versiones                                        | Estricto a Doc 15 §7: TanStack Query 5.x, RHF 7.x, Zod 3.x, next-intl 3.x, Tailwind 3.x, MSW 2.x, Vitest + Testing Library (últimas estables), Playwright (última estable), ESLint + Prettier, date-fns, lucide-react, Headless UI + Radix UI primitives. **TanStack Table 8.x diferido** (Doc 15 §7 "selectivo"; solo cuando una historia lo justifique). |
| Gestión de paquetes                                      | **npm** para MVP académico (alineado a Doc 21 §9.2 `npm ci`/`npm run …`). El "pnpm preferido" de Doc 15 §7 queda como `Documentation Alignment Required` no bloqueante: Doc 21 ya estableció `npm` como pipeline canónico para Amplify.                                                                  |
| Ubicación del proyecto                                   | Carpeta `web/` en la raíz del repositorio (frontend desacoplado del backend, alineado a Doc 21 §9 Amplify Hosting). El backend vive en carpeta separada según EPIC-BE-001.                                                                                                                              |
| Variables de entorno                                     | Solo `NEXT_PUBLIC_*` declaradas en `.env.local.example`: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY` (Doc 21 §9.3). Sin secrets en el repo. Sin `.env.local` versionado.                                                                                          |
| Locale strategy                                          | Detección por cookie/header sin prefijo en URL (Doc 15 §17). US-103 solo instala `next-intl`; el middleware y los catálogos los entrega US-104.                                                                                                                                                         |
| Scripts npm                                              | `dev`, `build`, `start`, `lint`, `lint:fix`, `format`, `typecheck`, `test`, `test:watch`, `test:e2e`, `test:e2e:install` (alineado a Doc 21 §9.2: `npm ci && npm run lint && npm run typecheck && npm run test && npm run build`).                                                                       |
| Áreas funcionales no incluidas                           | Sin autenticación, sin features de dominio, sin componentes de design system, sin diccionarios i18n, sin layouts, sin `QueryClient`, sin MSW handlers, sin observability/Sentry (Future). Solo bootstrap.                                                                                                |
| Backend authorization invariant                          | Esta historia respeta ADR-FE-003: el frontend es UX only; la autorización vive en el backend. US-103 no agrega ninguna lógica de auth/role/ownership (ni siquiera UX guards — se montan en US-105/US-107).                                                                                              |
| Sin Server Actions ni API Routes BFF                     | Confirmado (Doc 15 §6 / ADR-FE-001 / ADR-API-001). El consumo del backend se hará vía REST + TanStack Query desde Client Components (US-106).                                                                                                                                                          |
| Smoke E2E                                                | Mínimo: un test Playwright que abre `/` y verifica 200 OK + título por defecto. Tests de route groups y layouts se cubren en US-105/US-107.                                                                                                                                                            |

### Assumptions

* Node.js 20.x LTS disponible en local y CI (alineado a Doc 21 §9 build pipeline Amplify).
* El repositorio no contiene aún ningún proyecto frontend (`web/`/`frontend/`/`apps/web/` no existen). Si existe placeholder vacío, US-103 lo sobreescribe; si existe un Next.js parcial previo, US-103 normaliza estructura y versiones a Doc 15 §7.
* GitHub Actions (o pipeline equivalente) puede ejecutar Node 20 + npm.
* No hay aún componentes ni features que dependan de un design system, por lo que el `tailwind.config.ts` puede arrancar con preset por defecto + extensión mínima de tokens (sin pretender ser el design system completo, entregado en historias posteriores).

### Dependencies

* `Doc 15 — Frontend Architecture Design` §6/§7/§11/§15/§16/§17.
* `Doc 21 — Deployment and DevOps Design` §9 (pipeline Amplify, env vars, build command).
* `Doc 22 — ADRs` ADR-FE-001 (Next.js + TypeScript + App Router), ADR-FE-002 (TanStack Query), ADR-FE-003 (frontend UX-only), ADR-API-001 (REST contract).
* No depende de stories backend para arrancar (frontend desacoplado), pero el contrato real lo entregan PB-P0-004 / PB-P0-005 (OpenAPI snapshot).

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — habilita el frontend que servirá FR-AUTH-*, FR-EVENT-*, FR-VENDOR-*, FR-QUOTE-*, FR-BOOKING-*, FR-REVIEW-*, FR-AI-*, FR-ADMIN-*, FR-I18N-*; no implementa directamente ninguno          |
| Use Case(s)            | Transversal — no implementa directamente un UC; habilita capacidades futuras                                                                                                                         |
| Business Rule(s)       | No aplica directamente — capacidad técnica habilitadora                                                                                                                                              |
| Permission Rule(s)     | No aplica runtime — esta historia no agrega lógica de RBAC/ownership. Toda autorización efectiva sigue siendo responsabilidad backend (ADR-FE-003)                                                   |
| Data Entity / Entities | No aplica — esta historia no toca persistencia                                                                                                                                                       |
| API Endpoint(s)        | No aplica — esta historia no agrega clientes API (solo declara `NEXT_PUBLIC_API_BASE_URL` como placeholder de configuración)                                                                          |
| NFR Reference(s)       | NFR-A11Y-* (estructura preparada para accesibilidad: ESLint plugin a11y), NFR-I18N-* (next-intl instalado), NFR-PERF-FE-001 (build de producción optimizado por Next.js), NFR-OBS-001 (logs estructurados disponibles, observabilidad full es Future) |
| Related ADR(s)         | ADR-ARCH-001, ADR-FE-001, ADR-FE-002, ADR-FE-003, ADR-API-001                                                                                                                                        |
| Related Document(s)    | `/docs/12-Architecture-Vision-and-Principles.md`, `/docs/13-System-Architecture-Document.md`, `/docs/15-Frontend-Architecture-Design.md` §6/§7/§11/§15/§16/§17, `/docs/16-API-Design-Specification.md`, `/docs/19-Security-and-Authorization-Design.md`, `/docs/20-Testing-Strategy.md`, `/docs/21-Deployment-and-DevOps-Design.md` §9, `/docs/22-Architecture-Decision-Records.md` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: **In Scope**
* MVP Relevance: **Must Have (P0)**
* Delivery Type: **Technical foundation**
* Scope Boundary: **Scaffolding del proyecto Next.js + TypeScript en `web/` + instalación del stack Doc 15 §7 + configuración base + estructura de carpetas Doc 15 §15 + smoke E2E mínimo**

### Explicitly Out of Scope

* **i18n funcional** (middleware `next-intl`, catálogos `messages/*.json`, detección de locale) → **US-104**.
* **Route groups por rol** (`(public)`, `(auth)`, `(app)`, `(admin)`) y `middleware.ts` de routing → **US-105**.
* **`QueryClient` global**, `<QueryProvider>`, `<MSWProvider>`, handlers MSW y mocks de API → **US-106**.
* **Layouts y navegación** por rol (sidebar organizer, sidebar vendor, sidebar admin) → **US-107**.
* **Design system** completo (componentes base, tokens definitivos, paleta semántica) → historias de UI/Design System posteriores; US-103 deja solo `tailwind.config.ts` con extensión mínima.
* **Componentes de dominio**, hooks de features, schemas Zod específicos, mappers DTO ↔ Modelo → historias por feature.
* **TanStack Table 8.x** → diferido (Doc 15 §7 "selectivo"); se instalará cuando una historia lo justifique (admin / vendor directory).
* **Sentry / observability cliente** → Future (Doc 15 §7).
* **Server Actions, API Routes BFF, proxy a OpenAI** → prohibidos en MVP (Doc 15 §6, ADR-FE-001, ADR-API-001).
* **Autenticación, captcha, rate limiting frontend** → historias SEC / Auth posteriores; el frontend no manipula tokens (Doc 21 §9.5).
* **Pipeline Amplify** (creación de la app en AWS Amplify) → tarea DevOps separada; US-103 entrega un proyecto Next.js cuyo build local cumple `npm ci && npm run lint && npm run typecheck && npm run test && npm run build`, dejándolo "Amplify-ready" sin desplegar.
* **Microservicios, Kubernetes, brokers, RAG, vector DB, multi-tenant enterprise**.
* **Pagos reales, contratos firmados, e-signature, WhatsApp, push, chat en tiempo real, app nativa, moderación IA**.

### Scope Notes

* El proyecto frontend vive en `web/` (raíz del repo). No se introduce monorepo (`apps/web/`) en MVP.
* Todas las dependencias instaladas se justifican por Doc 15 §7. Cualquier dependencia adicional fuera de ese listado requiere ADR.
* `tsconfig.json` debe ser **estricto**: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `forceConsistentCasingInFileNames`.
* ESLint debe incluir el plugin oficial Next.js (`next/core-web-vitals`) + reglas TS estrictas + a11y (`eslint-plugin-jsx-a11y`).
* Prettier alineado a EditorConfig del repo; sin conflicto de reglas con ESLint (`eslint-config-prettier`).
* `next.config.mjs` debe ser ESM, sin Server Actions habilitadas, sin `experimental.serverActions`, sin rewrites a OpenAI ni a `/api/v1/*` (el backend vive en otro origen — Doc 21 §9).
* Tailwind con `content: ['./src/**/*.{ts,tsx}']`. Sin paleta custom completa en esta historia (eso vive en design system futuro).
* Smoke E2E Playwright: un único test que abre `/` y assert HTTP 200 + título visible.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Proyecto Next.js + TypeScript creado en `web/`

**Given** el repositorio sin proyecto frontend previo (o con placeholder vacío)
**When** se aplica la historia y se inspecciona el árbol del repo
**Then** existe la carpeta `web/` con un proyecto Next.js 14.x+ funcional (App Router habilitado, TypeScript 5.x)
**And** `web/package.json` declara `"private": true`, `"type": "module"`, los scripts del DR (`dev`, `build`, `start`, `lint`, `lint:fix`, `format`, `typecheck`, `test`, `test:watch`, `test:e2e`, `test:e2e:install`) y las dependencias del stack Doc 15 §7 en las versiones acordadas
**And** ejecutar `npm install && npm run dev` levanta el servidor en `http://localhost:3000` con la página por defecto sirviendo HTTP 200.

---

### AC-02: Stack MVP Doc 15 §7 instalado con versiones acordadas

**Given** `web/package.json` y `web/package-lock.json` versionados
**When** se inspeccionan las dependencias instaladas
**Then** están presentes y en rango/versión aprobada:

| Categoría        | Paquete                              | Versión objetivo                             |
| ---------------- | ------------------------------------ | --------------------------------------------- |
| Framework        | `next`                               | `^14.0.0` (App Router estable)                |
| Lenguaje         | `typescript`                         | `^5.0.0`                                      |
| React            | `react`, `react-dom`                 | versión emparejada con Next 14                |
| Server state     | `@tanstack/react-query`              | `^5.0.0`                                      |
| Forms            | `react-hook-form`                    | `^7.0.0`                                      |
| Validation       | `zod`, `@hookform/resolvers`         | Zod `^3.0.0`                                  |
| i18n             | `next-intl`                          | `^3.0.0`                                      |
| Styling          | `tailwindcss`, `postcss`, `autoprefixer` | Tailwind `^3.0.0`                          |
| Componentes base | `@headlessui/react`, primitivos Radix UI selectivos | últimas estables                |
| Iconos           | `lucide-react`                       | última estable                                |
| Fechas           | `date-fns`                           | última estable                                |
| Unit/Component   | `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` | últimas estables |
| E2E              | `@playwright/test`                   | última estable                                |
| Mocking          | `msw`                                | `^2.0.0`                                      |
| Lint/Format      | `eslint`, `eslint-config-next`, `eslint-config-prettier`, `eslint-plugin-jsx-a11y`, `prettier` | últimas estables |
| Tipos            | `@types/node`, `@types/react`, `@types/react-dom` | emparejados                       |

**And** no se instalan dependencias fuera del listado Doc 15 §7 sin ADR previo
**And** `npm audit --omit=dev` no reporta vulnerabilidades High/Critical sin issue de seguimiento.

---

### AC-03: Configuración base aplicada

**Given** el proyecto `web/`
**When** se inspeccionan los archivos de configuración
**Then** existen y cumplen:

| Archivo                | Requisito                                                                                                                          |
| ---------------------- | -----------------------------------------------------------------------------------------------------------------------------------|
| `tsconfig.json`        | `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"forceConsistentCasingInFileNames": true`, `paths: { "@/*": ["./src/*"] }`, `moduleResolution: "Bundler"` o `"NodeNext"`, `jsx: "preserve"` |
| `next.config.mjs`      | ESM, sin `experimental.serverActions`, sin rewrites/redirects a APIs externas, `reactStrictMode: true`                              |
| `tailwind.config.ts`   | `content: ['./src/**/*.{ts,tsx}']`, theme extension mínima, sin tokens custom completos (eso es design system futuro)                |
| `postcss.config.mjs`   | tailwind + autoprefixer                                                                                                              |
| `.eslintrc.cjs` o `eslint.config.mjs` | extends `next/core-web-vitals` + `eslint-config-prettier`, plugin `jsx-a11y`, sin overrides que desactiven reglas críticas |
| `.prettierrc`          | reglas EventFlow (singleQuote, semi, trailingComma all, printWidth 100)                                                              |
| `.gitignore`           | incluye `node_modules`, `.next`, `out`, `.env*` (excepto `.env.local.example`), `playwright-report`, `coverage`, `.DS_Store`         |
| `.env.local.example`   | declara solo `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY` (sin valores reales)                  |
| `vitest.config.ts`     | `environment: 'jsdom'`, `setupFiles` para `@testing-library/jest-dom`, alias `@/*`                                                   |
| `playwright.config.ts` | un proyecto `chromium`, `webServer` que ejecuta `npm run build && npm run start` (o `npm run dev`), `baseURL: 'http://localhost:3000'`|

---

### AC-04: Estructura de carpetas Doc 15 §15 lista

**Given** el proyecto `web/`
**When** se inspecciona el árbol bajo `web/src/`
**Then** existen las carpetas (vacías o con README placeholder, según corresponda) que ancla Doc 15 §15:

```text
web/src/
├── app/                          # raíz App Router (mínima en US-103; route groups vienen en US-105)
├── features/                     # vacía con README "feature-first; ver Doc 15 §16"
├── shared/
│   ├── api-client/               # vacía; httpClient se entrega cuando aparezca el primer consumo REST
│   ├── design-system/
│   ├── design-tokens/
│   ├── hooks/
│   ├── i18n/                     # config de next-intl viene en US-104
│   ├── lib/
│   ├── observability/
│   ├── providers/                # QueryProvider/IntlProvider/ThemeProvider vienen en US-106/US-107
│   ├── auth-session/
│   ├── authorization/            # UX-only (ADR-FE-003)
│   └── error-handling/
├── tests/
│   ├── e2e/                      # Playwright; smoke en AC-06
│   ├── unit/
│   ├── integration/
│   └── msw/                      # vacía; handlers vienen en US-106
└── messages/                     # vacía; catálogos vienen en US-104
```

**And** cada carpeta vacía contiene `.gitkeep` o un `README.md` de 1 línea explicando su propósito y la historia owner que la llenará.

---

### AC-05: Scripts npm operativos y CI verde local

**Given** el proyecto recién instalado (`npm install`)
**When** se ejecutan en orden los scripts del pipeline canónico de Doc 21 §9.2

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

**Then** los 5 comandos terminan con exit code 0
**And** `npm run lint` no reporta errores ni warnings con `--max-warnings=0`
**And** `npm run typecheck` (`tsc --noEmit`) termina sin errores
**And** `npm run test` ejecuta Vitest (cero tests es válido en US-103: solo el smoke E2E vive aquí; el smoke unit puede ser placeholder verificando `1 + 1 === 2`)
**And** `npm run build` genera `.next/` sin errores ni warnings de App Router.

---

### AC-06: Smoke E2E Playwright pasa

**Given** la app construida con `npm run build`
**When** se ejecuta `npm run test:e2e` con el `webServer` configurado en `playwright.config.ts`
**Then** el test `tests/e2e/smoke.spec.ts` abre `http://localhost:3000/`, recibe HTTP 200 y verifica que la página renderiza un elemento visible (p. ej. `<h1>` o `<main>`)
**And** Playwright genera el `playwright-report/` sin fallos.

---

### AC-07: `.env.local.example` y secretos

**Given** el proyecto `web/`
**When** se inspecciona el repo
**Then** existe `web/.env.local.example` con las 3 variables declaradas (sin valores reales)
**And** NO existe `web/.env.local` versionado
**And** `.gitignore` ignora `.env*` excepto `.env.local.example`
**And** ninguna URL de backend, captcha key, ni secret aparece hardcoded en el código o configs.

---

### AC-08: La historia NO incluye artefactos fuera de scope

**Given** el PR de US-103
**When** se inspecciona su contenido
**Then** NO contiene: middleware funcional de `next-intl`, catálogos `messages/*.json` poblados, archivos en `app/(public|auth|app|admin)/*`, `QueryProvider`, `<MSWProvider>`, handlers MSW, layouts por rol, componentes de design system, features de dominio, clientes API, Server Actions, API Routes proxy, configuración de Sentry, `next.config` con rewrites/redirects a OpenAI/`/api/v1/*`.

---

## ⚠️ Edge Cases

### EC-01: Node.js de versión incorrecta en la máquina del dev

**Given** un dev con Node < 20 LTS
**When** ejecuta `npm install` o `npm run dev`
**Then** Next 14 + dependencias pueden fallar con errores poco claros.

#### Handling

* Declarar `"engines": { "node": ">=20.0.0" }` en `web/package.json`.
* Agregar `.nvmrc` con `20` en `web/`.
* README backend/frontend documenta `nvm use` antes de cualquier script.

---

### EC-02: `npm install` rompe el `package-lock.json`

**Given** un dev local con cache de npm corrupta
**When** ejecuta `npm install` sin `--frozen-lockfile`
**Then** podría regenerar `package-lock.json` con versiones distintas.

#### Handling

* CI usa `npm ci` (no `npm install`) — Doc 21 §9.2.
* README documenta `npm ci` como comando canónico para reproducibilidad.

---

### EC-03: Conflicto Tailwind ↔ ESLint ↔ Prettier

**Given** las 3 herramientas declaran reglas de formato superpuestas
**When** un dev ejecuta `npm run lint` y luego `npm run format`
**Then** podrían reescribir uno al otro.

#### Handling

* `eslint-config-prettier` activado al final de `extends` para desactivar reglas conflictivas en ESLint.
* CI ejecuta lint + typecheck primero, sin `--fix`; el formato es responsabilidad del dev local.

---

### EC-04: Playwright sin browsers descargados

**Given** un dev sin `npx playwright install` previo
**When** ejecuta `npm run test:e2e`
**Then** Playwright falla con "browser not installed".

#### Handling

* Script `test:e2e:install` ejecuta `npx playwright install --with-deps chromium`.
* CI lo invoca antes de `test:e2e`.
* README documenta el paso para devs nuevos.

---

### EC-05: `NEXT_PUBLIC_API_BASE_URL` ausente en build

**Given** un build sin la variable definida
**When** Next.js construye el proyecto
**Then** la variable es `undefined` en el cliente.

#### Handling

* US-103 no agrega validación runtime de env vars (eso vive en la historia del `apiClient` cuando aparezca el primer consumo REST en US-106+).
* `.env.local.example` documenta la variable como required en runtime.
* README marca que en deploy debe configurarse en Amplify (Doc 21 §9.3).

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                                              | Message / Behavior                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| VR-01 | `web/package.json` declara `"engines.node": ">=20.0.0"` y `.nvmrc` está presente                                                                  | Lint estructural / revisión PR falla                     |
| VR-02 | Todas las dependencias instaladas pertenecen al listado Doc 15 §7; cualquier dep fuera del listado requiere referencia a ADR                       | Revisión PR falla                                        |
| VR-03 | `tsconfig.json` tiene `strict: true` y `noUncheckedIndexedAccess: true`                                                                            | `typecheck` falla / revisión PR falla                    |
| VR-04 | ESLint configurado con `next/core-web-vitals` + `jsx-a11y` + `eslint-config-prettier`                                                              | Lint falla → bloquea merge                               |
| VR-05 | El PR NO contiene catálogos i18n poblados, route groups, layouts, `QueryProvider`, MSW handlers, ni features de dominio (sigue siendo bootstrap)   | Revisión PR falla (out of scope)                          |
| VR-06 | El PR NO introduce `experimental.serverActions`, rewrites a OpenAI, ni API Routes BFF                                                              | Revisión PR falla                                         |
| VR-07 | `.env.local.example` no contiene valores reales; `.env.local` no está versionado                                                                  | Secret scanner CI falla → bloquea merge                   |
| VR-08 | `npm ci && npm run lint && npm run typecheck && npm run test && npm run build` terminan con exit 0 en CI                                          | Job CI falla → bloquea merge                              |
| VR-09 | Smoke E2E (`npm run test:e2e`) termina verde                                                                                                       | Job CI falla → bloquea merge                              |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | El frontend es UX-only (ADR-FE-003): US-103 no introduce ningún check de role/ownership/permission en cliente.                                  |
| SEC-02 | Sin secrets en repo. Solo `NEXT_PUBLIC_*` en `.env.local.example`, sin valores reales.                                                          |
| SEC-03 | Logs cliente (console / observability futuro) no deben imprimir tokens, cookies ni PII (regla heredada de Doc 19; US-103 no agrega logging hoy). |
| SEC-04 | El proyecto no expone API Routes BFF ni Server Actions que proxieen a OpenAI o al backend (Doc 15 §6, ADR-API-001).                              |
| SEC-05 | `next.config.mjs` no habilita `experimental` flags que comprometan el sandbox de Next (sin `taint`, sin overrides de seguridad).                  |
| SEC-06 | `npm audit` High/Critical sin issue de seguimiento bloquea el merge.                                                                            |

### Negative Authorization Scenarios

No aplica directamente — esta historia no introduce endpoints, runtime authorization ni UX guards de rol (todos llegan con US-105/US-107 y las historias por feature). Los negative tests RBAC/ownership viven en US-112 y en las historias backend (US-094..097).

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

No aplica — esta historia no invoca IA. El frontend que consumirá las features IA (asistente de planificación, comparación de cotizaciones, etc.) se construirá sobre el bootstrap de US-103, respetando el patrón human-in-the-loop definido en Doc 17 y `AIRecommendation` (Doc 18 §21) cuando aparezcan las historias correspondientes.

---

## 🎨 UX / UI Notes

| UX Area              | Applicability                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Screens              | No aplica — solo la página por defecto de Next.js sirve como "smoke target"; layouts reales viven en US-107            |
| Forms                | No aplica — RHF/Zod instalados como dependencias; integración con forms reales por feature                            |
| Loading states       | No aplica                                                                                                              |
| Error states         | No aplica — `not-found.tsx` y `error.tsx` globales son responsabilidad de US-105/US-107                                 |
| Empty states         | No aplica                                                                                                              |
| Success states       | No aplica                                                                                                              |
| Accessibility        | Solo se habilita la base: `eslint-plugin-jsx-a11y` instalado y activo; auditorías Lighthouse/axe-core viven en historias UI |
| Responsive           | No aplica — Tailwind configurado pero sin componentes responsive aún                                                    |
| i18n UI Copy         | No aplica — next-intl instalado pero sin catálogos (US-104)                                                              |
| Currency             | No aplica                                                                                                              |

---

## 🛠 Technical Notes

### Frontend

| Topic                | Guidance                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Route / Page         | Solo página raíz `web/src/app/page.tsx` por defecto (servida como smoke target); sin layouts ni route groups (US-105/US-107)                      |
| Components           | Ninguno propio — solo lo necesario para que `app/page.tsx` renderice un `<main>` con `<h1>` placeholder                                          |
| State Management     | TanStack Query 5.x instalado, **sin** `QueryClient` ni `QueryProvider` aún (US-106)                                                             |
| Forms                | RHF 7.x + Zod 3.x + `@hookform/resolvers` instalados; sin schemas ni componentes de form                                                         |
| API Client           | `apiClient` Axios/fetch wrapper diferido a la primera historia que consuma backend (típicamente US-106 o auth)                                   |
| Theming              | Tailwind con `content: ['./src/**/*.{ts,tsx}']`; sin tokens custom completos                                                                    |
| Path alias           | `@/*` → `./src/*` (declarado en `tsconfig.json` y reconocido por Vitest/Playwright)                                                              |

---

### Backend

No aplica — esta historia no toca backend. El frontend depende de PB-P0-004 / PB-P0-005 (OpenAPI snapshot) para construir clientes reales, pero no se instala ningún client API en US-103.

---

### Database

No aplica.

---

### API

| Method | Endpoint | Purpose   |
| ------ | -------- | --------- |
| —      | —        | No aplica |

---

### Observability / Audit

| Topic                             | Required                                                                                                                                       |
| --------------------------------- | -----------------------------------------------------------------------------------------------------------------------------------------------|
| Correlation ID                    | No aplica (sin cliente API en US-103; cuando aparezca, propagará `X-Correlation-Id` desde el backend — Doc 14)                                   |
| Runtime logs                      | No aplica (solo logs por defecto de Next.js dev/build)                                                                                          |
| AdminAction                       | No aplica                                                                                                                                       |
| AIRecommendation runtime creation | No aplica                                                                                                                                       |
| CI logs                           | Sí: lint, typecheck, test, build y test:e2e generan logs CI                                                                                     |

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                            | Type        |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | `npm ci && npm run lint && npm run typecheck && npm run test && npm run build` exit 0                               | CI          |
| TS-02 | `npm run dev` levanta `http://localhost:3000` con HTTP 200 (smoke manual / desarrollador)                            | Manual      |
| TS-03 | `tsc --noEmit` con `strict: true` y `noUncheckedIndexedAccess: true` activos                                          | Unit/CI     |
| TS-04 | ESLint configurado con `next/core-web-vitals` + `jsx-a11y` + `eslint-config-prettier` sin reglas críticas desactivadas | Unit/CI     |
| TS-05 | Estructura `web/src/{app,features,shared,tests,messages}` presente con `.gitkeep`/README placeholders                | Lint estructural |
| TS-06 | `.env.local.example` con exactamente las 3 variables `NEXT_PUBLIC_*` sin valores reales                              | Unit/CI     |
| TS-07 | Playwright smoke `tests/e2e/smoke.spec.ts` abre `/` y verifica HTTP 200 + `<main>` visible                            | E2E         |
| TS-08 | `web/package.json` declara `engines.node >= 20.0.0` y `.nvmrc` presente                                              | Unit/CI     |

---

### Negative Tests

| ID    | Scenario                                                                                                | Expected Result                                |
| ----- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| NT-01 | El PR introduce una dependencia fuera del stack Doc 15 §7 sin ADR                                        | Revisión PR falla (VR-02)                       |
| NT-02 | El PR contiene catálogos i18n poblados o route groups por rol                                            | Revisión PR falla (VR-05) → pertenece a US-104/US-105 |
| NT-03 | El PR contiene `QueryProvider`, MSW handlers o layouts                                                    | Revisión PR falla (VR-05) → pertenece a US-106/US-107 |
| NT-04 | El PR habilita `experimental.serverActions` o agrega API Routes BFF                                      | Revisión PR falla (VR-06)                       |
| NT-05 | `.env.local` versionado o secret hardcoded en código                                                     | Secret scanner CI falla (VR-07) → bloquea merge |
| NT-06 | `tsconfig.json` no tiene `strict: true`                                                                  | `typecheck` y revisión PR fallan (VR-03)        |
| NT-07 | ESLint con regla `react/jsx-no-bind` u otra crítica desactivada arbitrariamente                          | Revisión PR falla (VR-04)                       |
| NT-08 | `npm audit --omit=dev` reporta High/Critical sin issue de seguimiento abierto                            | CI falla (SEC-06)                               |

---

### AI Tests

No aplica para esta historia.

### Authorization Tests

No aplica para esta historia. El frontend UX-only no introduce checks de auth; los negative tests RBAC/ownership viven en US-112 y en historias backend.

### Accessibility Tests

No aplica funcionalmente en US-103 (sin componentes propios). Solo se valida que `eslint-plugin-jsx-a11y` esté activo (TS-04). Auditorías Lighthouse/axe-core viven en historias UI/Design System posteriores.

---

## 📊 Business Impact

| Field               | Value                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| KPI Affected        | Salud técnica frontend, time-to-first-feature, evidencia de cierre de EPIC-FE-001 (foundation)                                                          |
| Expected Impact     | Habilita el desarrollo paralelo de US-104..US-107 y de todas las features frontend de EPIC-AUTH-001, EPIC-EVENTS-001, EPIC-VENDORS-001, etc.            |
| Success Criteria    | PR mergeado + pipeline CI verde (lint + typecheck + test + build + smoke E2E) + estructura Doc 15 §15 lista + 0 dependencias fuera de Doc 15 §7         |
| Academic Demo Value | Foundation visible y trazable: scaffolding del frontend Next.js como evidencia de ADR-FE-001 / Doc 15 / Doc 21                                          |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Crear proyecto Next.js 14+ en `web/` con `npx create-next-app@latest --typescript --app --tailwind --eslint --src-dir --import-alias '@/*'`.
* Ajustar `tsconfig.json` para incluir `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`.
* Instalar el resto del stack Doc 15 §7 (TanStack Query, RHF, Zod, next-intl, MSW, Vitest, Testing Library, Playwright, jsx-a11y, date-fns, lucide-react, Headless UI).
* Configurar `vitest.config.ts` y `playwright.config.ts`.
* Crear estructura `src/{app,features,shared/{api-client,design-system,design-tokens,hooks,i18n,lib,observability,providers,auth-session,authorization,error-handling},tests/{e2e,unit,integration,msw},messages}` con `.gitkeep`/README.
* Escribir `tests/e2e/smoke.spec.ts`.
* Escribir `tests/unit/smoke.test.ts` placeholder mínimo (`expect(1 + 1).toBe(2)`).

### Potential Backend Tasks

No aplica.

### Potential Database Tasks

No aplica.

### Potential AI / PromptOps Tasks

No aplica.

### Potential QA Tasks

* Validar que pipeline canónico Doc 21 §9.2 termina verde en local y CI.
* Validar smoke E2E Playwright.
* Validar audit / lint con `--max-warnings=0`.

### Potential DevOps / Config Tasks

* Workflow GitHub Actions para `web/`: `npm ci → lint → typecheck → test → build → test:e2e` (la creación efectiva del workflow puede vivir en una sub-tarea de DevOps separada si el repo aún no tiene workflows frontend).
* `.nvmrc` y `engines.node >= 20`.
* Documentar pipeline Amplify-ready (sin desplegar todavía).
* README `web/README.md` con scripts, env vars y procedimiento de setup local.

### Potential Documentation Tasks

* Sección "Frontend setup" en el README raíz apuntando a `web/README.md`.
* Housekeeping post-merge: documentar el `Documentation Alignment Required` de gestor de paquetes (pnpm vs npm).

---

## ✅ Definition of Ready

* [x] Rol claro: System.
* [x] Goal técnico claro: scaffolding del proyecto Next.js + TypeScript con stack Doc 15 §7 + configuración base + estructura Doc 15 §15.
* [x] Boundary formalizado con US-104 (i18n), US-105 (route groups), US-106 (TanStack Query + MSW), US-107 (layouts).
* [x] Decisiones cerradas: framework (ADR-FE-001), gestión de paquetes (npm), versiones (Doc 15 §7), locale strategy MVP (Doc 15 §17), env vars (Doc 21 §9.3).
* [x] Acceptance Criteria testables y atómicos (AC-01..AC-08).
* [x] Edge cases documentados (Node version, npm cache, Tailwind ↔ ESLint, Playwright browsers, env vars en build).
* [x] Out of Scope explícito (i18n funcional, route groups, QueryClient/MSW, layouts, design system, auth, observability cliente, Server Actions, API Routes BFF).
* [x] Validation rules y SEC rules claros.
* [x] Tests definidos (TS-01..TS-08, NT-01..NT-08).
* [x] Trazabilidad a Doc 12/13/15/16/19/20/21/22 y ADRs FE-001/002/003 + API-001.
* [ ] Tech Lead frontend validó.

---

## 🏁 Definition of Done

* [ ] `web/` con proyecto Next.js 14+ + TypeScript 5.x + App Router operativo.
* [ ] Stack Doc 15 §7 instalado con versiones acordadas (AC-02).
* [ ] Configuración base (`tsconfig.json` estricto, `next.config.mjs`, `tailwind.config.ts`, ESLint, Prettier, `vitest.config.ts`, `playwright.config.ts`, `.env.local.example`, `.gitignore`, `.nvmrc`) aplicada (AC-03).
* [ ] Estructura `src/{app,features,shared,tests,messages}` Doc 15 §15 versionada con `.gitkeep`/README placeholders (AC-04).
* [ ] Scripts npm operativos: `dev`, `build`, `start`, `lint`, `lint:fix`, `format`, `typecheck`, `test`, `test:watch`, `test:e2e`, `test:e2e:install` (AC-05).
* [ ] Pipeline canónico Doc 21 §9.2 verde en local y CI (AC-05).
* [ ] Smoke E2E Playwright verde (AC-06).
* [ ] `.env.local.example` versionado; sin secrets en repo (AC-07).
* [ ] Sin artefactos fuera de scope (AC-08).
* [ ] `web/README.md` con setup local + scripts + env vars documentado.
* [ ] PR revisado por Tech Lead frontend.

---

## 📝 Notes

* US-103 es el **primer ladrillo** de EPIC-FE-001. Las historias US-104..US-107 dependen directamente de su merge.
* El proyecto vive en `web/` (frontend desacoplado, alineado a Doc 21 §9 Amplify Hosting).
* Stack y versiones son **estrictos a Doc 15 §7**; cualquier dependencia fuera del listado requiere ADR previo.
* `TanStack Table 8.x` se difiere hasta que una historia (admin / vendor directory) lo justifique (Doc 15 §7 "selectivo").
* Sentry / observability cliente full es Future (Doc 15 §7).
* No se introducen Server Actions ni API Routes BFF (Doc 15 §6, ADR-FE-001, ADR-API-001).
* La creación efectiva de la app en AWS Amplify y el workflow de despliegue son tareas DevOps separadas; US-103 deja el proyecto Amplify-ready (build local canónico verde).

### Documentation Alignment Required (no bloqueante)

* **Doc 15 §7 — gestor de paquetes**: el texto menciona "pnpm preferido o npm". Doc 21 §9.2 establece `npm ci` como pipeline canónico de Amplify. Esta historia adopta **npm** para MVP académico (alineado a Doc 21). El registro queda aquí como recordatorio para amender Doc 15 §7 en housekeeping post-merge; no bloquea aprobación porque el pipeline canónico ya está en Doc 21 y no contradice ningún ADR.
* **Doc 15 §17 — locale en URL**: el texto marca "decisión a confirmar en ADR" para detección por cookie/header sin prefijo. US-104 formalizará la decisión final con ADR si fuera necesario. US-103 no toca routing locale; solo instala `next-intl` como dependencia.
