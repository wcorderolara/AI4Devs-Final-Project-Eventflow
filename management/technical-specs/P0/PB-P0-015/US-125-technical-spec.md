# Technical Specification — US-125: Configurar Vitest + Supertest + Playwright + MSW

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-125 |
| Source User Story | `management/user-stories/US-125-configure-vitest-supertest-playwright-msw.md` |
| Decision Resolution Artifact | No existe — decisiones formalizadas en ADR-TEST-001, ADR-TEST-002 y Doc 20 |
| Priority | P0 |
| Backlog ID | PB-P0-015 |
| Backlog Title | QA Tooling Setup |
| Backlog Execution Order | 15 (P0) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-125 |
| Epic | EPIC-QA-001 — Testing & Quality Gates |
| Backlog Item Dependencies | PB-P0-002 (Backend Modular Monolith Bootstrap), PB-P0-012 (Frontend Next.js Bootstrap & i18n) |
| Feature | Tooling de testing (foundation) |
| Module / Domain | QA / DevOps |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-22 |
| Last Updated | 2026-06-22 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P0-015 — QA Tooling Setup` instala el tooling base de testing del MVP: Vitest para unit/integration en backend y frontend, Supertest para tests de API sobre Express, Playwright para E2E y MSW para mocking de red en frontend. Configuración compartida y scripts npm reutilizables. Las suites concretas se construyen progresivamente en P2 (PB-P2-014/015/016).

Dependencias del backlog item:

* `PB-P0-002` — Backend Modular Monolith Bootstrap (Express + TypeScript + `app` exportable, `GET /healthz`).
* `PB-P0-012` — Frontend Next.js Bootstrap & i18n (Next.js + TypeScript + estructura `src/`).

### Execution Order Rationale

US-125 es la posición 15 de P0 según `4-Product-Backlog-Prioritized.md`. Debe ejecutarse después del bootstrap de backend (PB-P0-002) y frontend (PB-P0-012), pero antes de `PB-P0-017` (GitHub Actions CI Pipeline), porque el pipeline CI invocará los scripts npm que esta historia expone. La historia no depende de PB-P0-013 (TanStack Query + MSW + Layouts) para correr, pero el equipo debe coordinar para no duplicar handlers MSW si PB-P0-013 ya inicializó parte del wiring.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-125 | Setup completo del tooling (backend, frontend, E2E) | 1 |

---

## 3. Executive Technical Summary

Instalar y configurar el stack de testing transversal de EventFlow. Backend: Vitest como runner con cobertura `v8`, Supertest contra la `app` Express (sin levantar puertos), setup global preparado para esquema Postgres efímero en suite de integración. Frontend: Vitest + Testing Library + MSW con `onUnhandledRequest: 'error'` y handlers de humo. E2E: Playwright con `playwright.config.ts` parametrizado por `baseURL`. Scripts npm estandarizados (`test`, `test:watch`, `test:coverage`, `test:e2e`, `test:ci`) en backend y frontend. Documentación mínima en `README` que describe cómo correr cada nivel y dónde extender handlers/tests. La historia entrega únicamente el wiring + un test de humo por nivel; las suites funcionales se entregan en PB-P2-014/015/016 y el wiring CI en PB-P0-017.

---

## 4. Scope Boundary

### In Scope

* Instalación de dependencias: `vitest`, `@vitest/coverage-v8`, `supertest`, `@types/supertest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `msw`, `@playwright/test`, `jsdom` (o `happy-dom`) para frontend.
* `vitest.config.ts` en backend y frontend con coverage `v8` y entorno adecuado (`node` para backend, `jsdom`/`happy-dom` para frontend).
* `playwright.config.ts` con `baseURL` parametrizado por variable de entorno.
* Setup files: `src/test/setup.ts` (frontend, inicia MSW server), `tests/setup.ts` (backend, hooks globales para DB efímera opcional).
* Mocks MSW: `src/mocks/{handlers.ts,server.ts,browser.ts}` siguiendo Doc 15.
* Un test de humo por nivel: backend unit, backend API (Supertest contra `GET /healthz`), frontend componente, E2E Playwright.
* Scripts npm: `test`, `test:watch`, `test:coverage`, `test:e2e`, `test:ci`.
* `README` actualizado con comandos y convenciones.

### Out of Scope

* Suites funcionales completas por dominio (cubierto por PB-P2-014).
* Suite de contract testing exhaustiva con drift detection (PB-P2-015).
* Suite E2E del flujo demo (PB-P2-016).
* Configuración del workflow GitHub Actions (PB-P0-017).
* Umbrales de cobertura bloqueantes (reporting-only en P0).
* Visual regression, mutation testing, carga.
* Tests AI funcionales (cubiertos por historias del epic AI).
* Definición/migración de DB efímera para integración (sólo se referencia variable `DATABASE_URL`).

### Explicit Non-Goals

* No introducir un endpoint productivo nuevo (el `GET /healthz` ya existe por scaffold).
* No reemplazar configuraciones existentes del scaffold sino extenderlas.
* No definir reglas de seguridad runtime nuevas; solo aplicar las existentes en tests.

---

## 5. Architecture Alignment

### Backend Architecture

* Mantiene el modular monolith (Doc 13/14) y la separación dominio/aplicación/infraestructura. Vitest se ubica a nivel raíz del paquete backend con conftest global; Supertest opera contra `app` exportada desde `src/http/app.ts` (o equivalente provisto por PB-P0-002). No introduce nuevas capas.

### Frontend Architecture

* Mantiene la estructura definida en Doc 15 (App Router, Server/Client Components). MSW se inicia en Node para tests vía `src/mocks/server.ts` y se expone `src/mocks/browser.ts` para uso opcional en dev. Testing Library se usa para componentes; no se modifica el data layer (PB-P0-013).

### Database Architecture

* No modifica esquema. La suite de integración backend espera `DATABASE_URL` apuntando a un esquema temporal Postgres (Doc 20 §3). Si la variable no está presente, el setup omite la suite de integración con un warning explícito (no falla la suite unit).

### API Architecture

* No introduce endpoints. Reutiliza `GET /healthz` del scaffold para el test de humo Supertest.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* Aplica Doc 19 a configs de tests: secretos vía variables de entorno (`.env.test` no commiteado o variables CI); `baseURL` Playwright no apunta a producción por defecto. Tests no usan tokens reales ni datos personales.

### Testing Architecture

* Pirámide Doc 20 §7: 60% unit / 30% integration + API / 10% E2E. Esta historia habilita los tres niveles. Reporters por defecto + `--reporter=verbose` en `test:ci`. Coverage `v8` provider, output `coverage/`.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: `npm test` ejecuta Vitest backend con coverage v8 | Crear `vitest.config.ts` con `coverage.provider: 'v8'`, `environment: 'node'`; script `"test": "vitest run"` en `package.json` backend; test de humo en `tests/smoke/domain.smoke.test.ts`. | Backend, DevOps |
| AC-02: Supertest contra `app` Express, sin puerto | Importar `app` desde `src/http/app.ts`; `request(app).get('/healthz').expect(200)`; sin `app.listen`. | Backend, API |
| AC-03: Vitest + Testing Library + MSW frontend | `vitest.config.ts` con `environment: 'jsdom'`; `setupFiles: ['./src/test/setup.ts']`; `setup.ts` arranca `server.listen({ onUnhandledRequest: 'error' })`, `server.resetHandlers()` y `server.close()`. | Frontend |
| AC-04: Playwright E2E | `playwright.config.ts` con `projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }]`; `baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000'`; test de humo carga página pública. | Frontend, DevOps |
| AC-05: Scripts npm estandarizados | Agregar/extender `package.json`: `test`, `test:watch`, `test:coverage`, `test:e2e`, `test:ci`. | Backend, Frontend, DevOps |
| AC-06: MSW listo para dev y tests | `handlers.ts`, `server.ts` (Node), `browser.ts` (browser worker); documentar uso en dev. | Frontend |
| AC-07: Documentación mínima | `README` con comandos por nivel, ubicación de tests, cómo agregar handlers MSW, variable `DATABASE_URL`. | DevOps / Docs |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Tooling transversal. No introduce módulos de dominio nuevos. Toca:

* Raíz del paquete backend (`apps/backend` o equivalente del scaffold).
* Directorio `tests/` (o convención del scaffold).

### Use Cases / Application Services

No aplica.

### Controllers / Routes

No aplica — usa `GET /healthz` existente.

### DTOs / Schemas

No aplica.

### Repository / Persistence

* La suite de integración prepara/limpia esquema temporal vía Prisma cuando `DATABASE_URL` apunta a una base de tests. Hooks en `tests/setup.ts` (`beforeAll`/`afterAll`) usan `prisma.$executeRaw` para `TRUNCATE` o `DROP/CREATE SCHEMA` según convención del scaffold. Esta historia provee la estructura; la lógica concreta de seed para integración se entrega en otras historias.

### Validation Rules

No aplica runtime.

### Error Handling

* Setup global aplica `fail-fast` si configuración inválida. Mensajes deben señalar la variable faltante (ej. `DATABASE_URL no definida — skip integration suite`).

### Transactions

No aplica.

### Observability

* Reporter Vitest por defecto en local, `verbose` en `test:ci`. Output legible para CI.

---

## 8. Frontend Technical Design

### Routes / Pages

No aplica.

### Components

* Un componente de humo (puede ser un `<HealthBadge />` ya existente o un mock minimal `<SmokeOk />`) usado únicamente por el test de humo de frontend.

### Forms

No aplica.

### State Management

* No modifica la configuración de TanStack Query establecida en PB-P0-013. Si PB-P0-013 ya creó `src/mocks/*`, US-125 reutiliza y completa; si no existe, US-125 lo crea.

### Data Fetching

* MSW intercepta cualquier `fetch`/`axios` durante tests. Para dev, la activación del worker `browser.ts` queda opcional y documentada.

### Loading / Empty / Error / Success States

No aplica funcionalmente.

### Accessibility

* Habilitar `@testing-library/jest-dom` para queries accesibles; no se requieren tests a11y en esta historia.

### i18n

No aplica.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/healthz` | Único endpoint consumido por Supertest de humo (provisto por scaffold). | No | — | `200 { status: 'ok' }` (según contrato del scaffold) | N/A en esta historia |

No se introducen endpoints nuevos.

---

## 10. Database / Prisma Design

No aplica para creación de modelos.

* `Models Impacted`: ninguno.
* `Migrations Impact`: ninguno.
* `Seed Impact`: ninguno.
* Nota: la suite de integración consume un esquema temporal Postgres definido por `DATABASE_URL`; documentación en `README`.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

No aplica runtime.

### Authorization

No aplica runtime.

### Ownership Rules

No aplica.

### Role Rules

No aplica.

### Negative Authorization Scenarios

* Test de seguridad estática (lint o regla custom) que falle si se detecta secreto hardcodeado o `baseURL` de Playwright apuntando a producción — implementación concreta queda fuera del scope mínimo, pero se documenta como recomendación a reforzar en PB-P0-017.

### Audit Requirements

No aplica.

### Sensitive Data Handling

* Reportes de cobertura no deben subir a destinos públicos con datos sensibles. `.gitignore` debe excluir `coverage/`, `playwright-report/`, `test-results/`.

---

## 13. Testing Strategy

### Unit Tests

* Backend: `tests/smoke/domain.smoke.test.ts` con assert trivial (`expect(1 + 1).toBe(2)` o un helper puro).
* Frontend: `src/components/__tests__/smoke.test.tsx` que renderiza `<SmokeOk />` y verifica DOM con Testing Library.

### Integration Tests

* Backend: `tests/integration/healthz.integration.test.ts` (Supertest) — opcional aquí, puede vivir como API test (siguiente bullet).

### API Tests

* Backend: `tests/api/healthz.api.test.ts` — `request(app).get('/healthz').expect(200)`.

### E2E Tests

* `e2e/smoke.spec.ts` Playwright — `page.goto('/'); await expect(page).toHaveTitle(/EventFlow/i)` (o equivalente acorde al scaffold).

### Security Tests

No aplica en esta historia; documentar recomendación para futuros (lint anti-secret).

### Accessibility Tests

No aplica funcionalmente; tooling habilitado para historias UI futuras.

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica.

### CI Checks

* `test:ci` debe encadenar: `npm test` (backend) + `npm test` (frontend) + `npm run test:e2e`. La invocación desde GitHub Actions pertenece a PB-P0-017.

---

## 14. Observability & Audit

* Logs: reporters de Vitest/Playwright; sin logs runtime de producción.
* Correlation ID: N/A en tests.
* AdminAction: No.
* Error Tracking: artefactos Playwright (`trace`, `screenshot`, `video`) configurados como `retain-on-failure`.
* Metrics: N/A.

---

## 15. Seed / Demo Data Impact

No aplica. La suite E2E sobre seed se entrega en PB-P2-016.

---

## 16. Documentation Alignment Required

`No documentation alignment issues detected.`

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| El scaffold PB-P0-002 no exporta `app` Express de forma testable | Bloquea AC-02 | Verificar en implementación; si no existe, refactor mínimo para exportar `app` separada de `server.listen`. Tarea explícita en el breakdown. |
| PB-P0-013 ya creó parte del wiring MSW | Duplicación o conflicto de handlers | Coordinar: si existen `src/mocks/*`, extender en lugar de sobreescribir; documentar en `README`. |
| Browsers Playwright pesados en CI | Tiempos de instalación largos | Usar cache de browsers en GitHub Actions (PB-P0-017); imagen oficial `mcr.microsoft.com/playwright`. |
| `DATABASE_URL` no disponible localmente | Falsos negativos en integration | Setup global degrada a `skip` con warning explícito; documentar en `README`. |
| `onUnhandledRequest: 'error'` rompe historias futuras | Tests rotos al agregar features | Documentar política y cómo agregar handlers; cubierto por AC-07. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

Backend:

* `apps/backend/package.json` (o equivalente)
* `apps/backend/vitest.config.ts` (nuevo)
* `apps/backend/tests/setup.ts` (nuevo)
* `apps/backend/tests/smoke/domain.smoke.test.ts` (nuevo)
* `apps/backend/tests/api/healthz.api.test.ts` (nuevo)
* `apps/backend/.gitignore` (agregar `coverage/`)

Frontend:

* `apps/frontend/package.json` (o equivalente)
* `apps/frontend/vitest.config.ts` (nuevo o ampliado)
* `apps/frontend/src/test/setup.ts` (nuevo)
* `apps/frontend/src/mocks/handlers.ts` (nuevo o ampliado)
* `apps/frontend/src/mocks/server.ts` (nuevo)
* `apps/frontend/src/mocks/browser.ts` (nuevo)
* `apps/frontend/src/components/__tests__/smoke.test.tsx` (nuevo)
* `apps/frontend/playwright.config.ts` (nuevo)
* `apps/frontend/e2e/smoke.spec.ts` (nuevo)
* `apps/frontend/.gitignore` (agregar `coverage/`, `playwright-report/`, `test-results/`)

Raíz / Docs:

* `README.md` raíz y/o `apps/*/README.md` con sección "Testing".

### Recommended order of implementation

1. Backend Vitest + Supertest + script `test` + test unit + test API.
2. Frontend Vitest + Testing Library + MSW + script `test` + test componente de humo.
3. Playwright + `playwright.config.ts` + `test:e2e` + test E2E de humo.
4. Script `test:ci` en backend y frontend.
5. Documentación `README`.

### Decisions that must not be reopened

* Vitest como runner (ADR-TEST-001).
* Supertest sobre `app` Express, sin puerto (ADR-TEST-001, Doc 20 §4).
* MSW para frontend, Playwright para E2E (ADR-TEST-002).
* `onUnhandledRequest: 'error'` para MSW en tests.
* Pirámide 60/30/10 (Doc 20 §7).

### What must not be implemented

* Suites funcionales completas de dominio.
* Handlers MSW para todos los endpoints.
* Suite E2E del flujo demo.
* GitHub Actions workflow.
* Umbrales bloqueantes de cobertura.

### Assumptions to preserve

* PB-P0-002 expone `app` Express de manera importable.
* PB-P0-012 expone estructura `src/` Next.js.
* Node.js LTS y npm/pnpm definidos por scaffold.

---

## 19. Task Generation Notes

### Suggested task groups

* DevOps / Dependencias: instalar paquetes (Vitest, Supertest, Playwright, MSW, Testing Library, `@vitest/coverage-v8`, `jsdom`/`happy-dom`, `@types/supertest`).
* Backend: `vitest.config.ts`, `tests/setup.ts`, test unit de humo, test Supertest, scripts npm.
* Frontend: `vitest.config.ts`, `src/test/setup.ts`, `src/mocks/{handlers,server,browser}.ts`, test componente de humo, scripts npm.
* E2E: `playwright.config.ts`, `e2e/smoke.spec.ts`, script `test:e2e`, instrucción `npx playwright install`.
* CI script: `test:ci` en backend y frontend.
* Documentación: `README` con comandos, ubicación de tests, política MSW, variable `DATABASE_URL`.

### Required QA tasks

* Verificación local de los tres niveles verde.
* Verificación de `test:coverage` genera reporte.
* Verificación de `onUnhandledRequest: 'error'` (test negativo manual).

### Required security tasks

* Confirmar que `.env.test` no se commitea.
* Confirmar `baseURL` Playwright no apunta a producción.

### Required seed/demo tasks

Ninguna.

### Required documentation tasks

* Sección "Testing" en `README` raíz y/o por paquete.

### Dependencies between tasks

* Backend Vitest debe estar antes que Supertest (mismo runner).
* MSW (frontend) debe estar antes que el test de componente que lo usa.
* Playwright debe instalarse y configurarse antes del test E2E.
* Scripts `test:ci` requieren los `test` y `test:e2e` ya operativos.

### Whether the parent backlog item should later generate a consolidated `tasks.md`

Sí. PB-P0-015 contiene una sola User Story (US-125), por lo que las tareas pueden vivir directamente en `management/development-tasks/P0/PB-P0-015/US-125-development-tasks.md` y un `tasks.md` consolidado a nivel de backlog item es opcional.

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
| DB impact clear | N/A |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

La especificación traduce los siete AC en pasos técnicos concretos por capa, mantiene el alcance "foundation only" definido por la User Story, no introduce decisiones nuevas y se apoya enteramente en ADR-TEST-001, ADR-TEST-002 y Doc 20. La siguiente etapa es invocar `eventflow-user-story-to-development-tasks` sobre este archivo.
