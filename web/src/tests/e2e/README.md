# Suite E2E Playwright — US-128 · PB-P2-016

Suite E2E que ejercita el **camino demo del organizador** end-to-end
(auth → event → plan IA → tasks → budget → vendors → quote request →
compare → booking → review · docs/20 §25.1) sobre la aplicación real,
usando un backbone de mocks alineados al contrato canónico de la API
(docs/16 §13, respaldado por la suite contract US-127 · PB-P2-015).

## TL;DR

```bash
npm run test:e2e:smoke   # subset rápido (@smoke) — corre en cada PR.
npm run test:e2e         # suite completa — corre en push a `main`.
```

Requisitos: navegador Playwright instalado localmente (`npm run
test:e2e:install`). El comando `test:e2e` levanta Next.js con `npm run
build && npm run start` automáticamente vía `webServer` de
`playwright.config.ts`.

## Estructura

```
web/src/tests/e2e/
├── README.md                          (este archivo · DOC-001)
├── fixtures/
│   └── seed-fixtures.ts               (OPS-002/AI-001 · fixtures del "seed" alineados a docs/16 + MockAIProvider)
├── smoke.spec.ts                      (@smoke · home 200 + <main> visible)
├── demo-organizer-smoke.spec.ts       (@smoke · organizer login → /organizer)
├── demo-organizer.spec.ts             (opt-in · camino demo completo TS-01..TS-07)
├── auth-*.spec.ts                     (specs preexistentes de auth)
├── routing.*.spec.ts                  (specs preexistentes de routing)
├── layouts.*.spec.ts                  (specs preexistentes de layouts)
├── i18n.*.spec.ts                     (specs preexistentes de i18n)
├── data-layer.*.spec.ts               (specs preexistentes del data layer)
├── us037-budget-apply.spec.ts         (opt-in · apply de budget suggestion)
├── us081-language-selector-rollback.spec.ts  (spec preexistente)
├── admin-event-detail.spec.ts         (spec preexistente admin)
├── event-status-completed-badge.spec.ts (spec preexistente)
└── seo.robots-sitemap.spec.ts         (spec preexistente SEO)
```

## Estrategia — mocked-backend E2E (Deviation D-01)

El repo levanta únicamente Next.js en el `webServer` de Playwright
(no hay Postgres ni backend Node en el pipeline E2E). Los specs
interceptan las llamadas a `/api/v1/**` con `page.route(...)` y
responden con fixtures TypeScript **alineados al contrato real** de
docs/16 §13. La forma canónica de éxito y error, los enums, códigos
de estado y `meta.correlationId`/`timestamp` están garantizados por
la suite contract US-127 (`web/src/tests/contract/**`) — cualquier
drift entre la forma esperada por el frontend y la forma real del
backend rompería tests de contrato antes de llegar a estos E2E.

La contrapartida de la meta "on seed" real (docs/20 §21) — arrancar
Postgres + backend + `npm run seed` en el `webServer` — queda como
convergencia futura fuera del scope de esta historia (probablemente
PB-P2-020 quality gates o infra de Ops). El objetivo de negocio
("verificar el camino demo sin regresiones") se cumple con la
estrategia mockeada en tanto los mocks respeten el contrato real.

## Tags & subsets

- `@smoke` — subset rápido (`smoke.spec.ts` + `demo-organizer-smoke.spec.ts`).
  Corre en cada PR (`web-ci.yml:Smoke E2E (PR)`) y bloquea el merge
  ante fallo. Objetivo <5 min (docs/20 §21).
- Sin tag — parte de la suite completa. Corre en push a `main`
  (`web-ci.yml:Full E2E (push to main)`) y bloquea el merge protegido.
  Objetivo <20 min (docs/20 §21).

Marcar un test como smoke: incluir el literal `@smoke` en su título:

```ts
test('demo readiness · organizer login redirige a /organizer @smoke', ...)
```

Playwright filtra con `--grep @smoke` en el script `test:e2e:smoke`.

## Fixtures del "seed" (`fixtures/seed-fixtures.ts`)

Constants + factory functions que devuelven envelopes ya listos para
`route.fulfill({ body: JSON.stringify(...) })`. IDs deterministas
(`00000000-0000-4000-8000-<slot>`) permiten aserciones textuales
estables entre corridas. Los pasos de IA usan shapes compatibles con
`MockAIProvider` (`aiMeta.provider='mock'`, `fallbackUsed:false`) —
AC-04 · VR-02 · docs/20 §25.4.

Nuevo mock para un endpoint: agregar el factory + IDs al fixture,
importar en el spec, `page.route('**/api/v1/<endpoint>**', ...)`.

## Variables de entorno

- `E2E_BASE_URL` — override de la URL base de Playwright. Default
  `http://localhost:3000`. Nunca apunta a producción (US-125 · SEC).
- `E2E_DEMO_READY=true` — habilita `demo-organizer.spec.ts` (suite
  completa del camino demo) y `us037-budget-apply.spec.ts`. Sin la
  variable, ambos hacen `test.skip(...)` para no romper la CI base.
- `CI` — activa `retries: 1` en CI (`playwright.config.ts:retries`) y
  `forbidOnly: true`.

## Evidencia (AC-03 · VR-04)

`playwright.config.ts:use` ya expone la política canónica:

```ts
trace: 'retain-on-failure',
screenshot: 'only-on-failure',
video: 'retain-on-failure',
```

Ante un fallo Playwright emite el trace `.zip`, el screenshot final y
el video de la sesión adjuntos al reporte HTML. En CI, el step
"Upload Playwright report on failure" de `web-ci.yml` sube
`web/playwright-report/` como artifact con retención de 7 días. Sin
secretos en los payloads mockeados (SEC-02/03) — los fixtures usan
UUIDs de test y correos `@eventflow.demo`.

Verificación manual del artefacto de fallo:

```bash
npx playwright test --grep @smoke --forbid-only=false --fail-fast || true
ls -la web/test-results/  # trace.zip + screenshot en la corrida que falló
```

## Política de retries

- **Local:** `retries: 0`. No enmascara flakiness durante desarrollo.
- **CI:** `retries: 1`. Absorbe rebote esporádico de timing sin
  ocultar fallos reales. `forbidOnly: true` en CI protege contra
  commits con `test.only(...)` accidental.

Si un spec requiere más retries, es señal de flakiness real — el
patrón del repo es corregir el selector (roles/labels sobre CSS) o el
mock antes de subir retries.

## Referencias

- User Story: `management/user-stories/US-128-e2e-playwright-on-seed.md`
- Tech Spec: `management/technical-specs/P2/PB-P2-016/US-128-technical-spec.md`
- Development Tasks: `management/development-tasks/P2/PB-P2-016/US-128-development-tasks.md`
- Execution Record: `management/workflows/development-execution/P2/PB-P2-016/US-128-execution.md`
- Suite contract US-127: `web/src/tests/contract/README.md`
- Docs 20 §21, §22, §25.1, §25.4. ADR-TEST-001. ADR-DEVOPS-001.
