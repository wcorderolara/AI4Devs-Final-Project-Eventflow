# CI Quality Gates — US-132 · PB-P2-020

> **Fuente autoritativa** — Doc 20 §22 (Quality gates), Doc 21 §16 (Deployment & DevOps),
> ADR-DEVOPS-001 (GitHub Actions), ADR-TEST-001 (Vitest + Supertest + Playwright).
>
> Este documento consolida las **compuertas de calidad** activas en CI para PRs a `main`, la
> política de E2E selectivo vs completo, la política de `MockAIProvider` y la lista exacta de
> **required status checks** que Tech Lead debe marcar en la **branch protection** de `main`.

## TL;DR

- **Cada PR a `main` corre las 17 compuertas** listadas abajo (matriz Doc 20 §22 × job × US).
- **Merge bloqueado** si cualquier compuerta `required` está roja o ausente (branch protection).
- **E2E**: `smoke` en PR (subset marcado con `@smoke`), `full` en push a `main`.
- **IA**: siempre `MockAIProvider` (`LLM_PROVIDER=mock`), **prohibido** `OPENAI_API_KEY` en CI.
- **Guards estructurales** (`us132-ci-gates.spec.ts`, `us132-no-openai-key.spec.ts`) hacen que
  la ausencia/renombrado de un gate falle el propio job `test-backend`. Falso-verde por
  compuerta ausente es imposible (VR-03 · NT-02).

## Matriz — Doc 20 §22 gate × workflow/job × source US × required

| # | Gate (Doc 20 §22) | Workflow · job | Source US | Required en branch protection |
|---|---|---|---|---|
| 1 | **lint** (ESLint FE+BE) | `pr.yml` · `lint` | PB-P0-017 · US-134 | ✅ Sí |
| 2 | **typecheck** (TS strict) | `pr.yml` · `typecheck` | PB-P0-017 · US-134 | ✅ Sí |
| 3 | **unit + integration** (backend) | `pr.yml` · `test-backend` (npm test cubre `tests/unit`, `tests/integration`, `tests/api`) | PB-P2-014 · US-126 | ✅ Sí |
| 4 | **contract (MSW · frontend)** | `pr.yml` · `test-frontend` (glob `src/tests/contract`) | PB-P2-015 · US-127 | ✅ Sí |
| 5 | **E2E smoke (PR)** | `web-ci.yml` · step `Smoke E2E (PR)` con `test:e2e:smoke` (tag `@smoke`) | PB-P2-016 · US-128 | ✅ Sí |
| 6 | **E2E full (release/push a main)** | `web-ci.yml` · step `Full E2E (push to main)` con `npm run test:e2e` | PB-P2-016 · US-128 | ⚠️ Solo push a `main` (post-merge) |
| 7 | **IA con MockAIProvider** (backend) | `pr.yml` · `test-backend-coverage` con env `LLM_PROVIDER: mock` | PB-P2-017 · US-129 | ✅ Sí |
| 8 | **RBAC negativa** (backend) | `pr.yml` · `test-backend` (glob `us130` en `tests/api`) + coverage-gate estático | PB-P2-018 · US-130 | ✅ Sí |
| 9 | **A11Y** (axe · frontend) | `pr.yml` · `test-frontend` (glob `src/tests/a11y`; `impact === 'critical'` bloquea) | PB-P2-019 · US-131 | ✅ Sí |
| 10 | **coverage ≥ threshold crítica** | `pr.yml` · `test-backend-coverage` con thresholds bloqueantes 55/75/55/55 (`vitest.config.ts`) | PB-P2-014 · US-126 | ✅ Sí |
| 11 | **migrations validate (drift + smoke)** | `pr.yml` · `migrations-validate` (drift `migrate diff --exit-code` + smoke post-migración) | PB-P0-018 · US-139 | ✅ Sí |
| 12 | **schema validate (prisma)** | `ci.yml` · `prisma-validate` | PB-P0-001 · US-099 | ✅ Sí |
| 13 | **seed idempotency** | `ci.yml` · `seed-idempotency` (2ª ejecución `created=0`) | PB-P0-014 · US-085 | ✅ Sí |
| 14 | **build backend (docker)** | `pr.yml` · `build-backend` (`docker build` sin push) | PB-P0-016 · US-133 | ✅ Sí |
| 15 | **build frontend (next)** | `pr.yml` · `build-frontend` (`npm run build`) | PB-P0-017 · US-134 | ✅ Sí |
| 16 | **secret scan (schema · gitleaks)** | `ci.yml` · `secret-scan-schema` + `migration-secret-scan` | PB-P0-001 · US-099 / US-100 | ✅ Sí |
| 17 | **openapi drift** | `ci.yml` · `openapi-check` (regenera desde código y compara con snapshot) | PB-P0-005 · US-098 | ✅ Sí |

**Guard meta (US-132 propio)** — `pr.yml` · `test-backend` incluye
`backend/tests/schema/us132-ci-gates.spec.ts` y `us132-no-openai-key.spec.ts`: si alguien retira o
renombra un gate del catálogo, el propio job `test-backend` falla — cierra EC-01 · NT-02 · VR-03
("gate ausente = falso-verde") en código verificable.

## Branch protection — lista copiable para Tech Lead (OPS-005 · AC-02)

Aplicar en **GitHub → Settings → Branches → main → Branch protection rule**, sección
**"Require status checks to pass before merging"**. Marcar como `required` **exactamente** estos
nombres de check (aparecen tal cual en la UI del PR una vez que corran al menos una vez):

- `lint (backend)`
- `lint (web)`
- `typecheck (backend)`
- `typecheck (web)`
- `test-backend`
- `test-backend-coverage`
- `test-frontend`
- `build-backend`
- `build-frontend`
- `migrations-validate`
- `build-and-test` *(job de `web-ci.yml` que incluye Smoke E2E en PR + Playwright report artifact)*
- `prisma-validate`
- `prisma-generate`
- `schema-structural-tests`
- `secret-scan-schema`
- `prisma-migrate-diff`
- `prisma-migrate-smoke`
- `seed-idempotency`
- `migration-structural-tests`
- `migration-secret-scan`
- `migrate-reset-block-test`
- `openapi-check`

Adicionalmente activar en la misma pantalla:

- ✅ **Require branches to be up to date before merging** (evita merges over stale main).
- ✅ **Require conversation resolution before merging**.
- ✅ **Require linear history** (política del repo — sin merge commits desordenados).
- ✅ **Do not allow bypassing the above settings** (aplicar también a administradores).

## Política E2E (AC-04 · OPS-006)

| Trigger | Suite | Comando | Bloqueante |
|---|---|---|---|
| PR a `main` / `qa` | Subset `@smoke` (`smoke.spec.ts`, `demo-organizer-smoke.spec.ts`) | `npm run test:e2e:smoke` | Sí (`build-and-test`) |
| Push a `main` (post-merge) | Suite completa Playwright | `npm run test:e2e` | Sí (bloquea futuros deploys si rompe) |

**Rationale** — smoke acota tiempos de PR (~25s local) sin sacrificar la red de seguridad E2E
completa post-merge. Los reports fallidos suben a artifact `playwright-report-<run_id>` con
retención 7 días (`if: failure()`). Retries acotados a 1 en CI (`playwright.config.ts`), 0 local.

## Política MockAIProvider (AC-05 · SEC-02 · VR-04)

- `LLM_PROVIDER=mock` en TODOS los jobs con LLM (verificado en `test-backend-coverage`).
- `OPENAI_API_KEY` **prohibido** en cualquier workflow (guard `us132-no-openai-key.spec.ts`).
- El `MockAIProvider` (US-119) es determinista, sin red — cubre US-129 (IA suite) sin costo ni
  flakiness. Ver `backend/tests/unit/us129-ai-mock-suite.spec.ts` para el catálogo canónico de 7
  features.
- Guard runtime adicional: `backend/tests/unit/us119-mock-no-network.guard.spec.ts` (estático,
  falla si el mock importa SDKs de IA o HTTP).

## Política `.skip` / `xfail` crítico (Doc 20 §22)

`describe.skipIf(!dbUp)` está permitido y es el patrón canónico del repo para tests de integración
que requieren Postgres (auto-omisión en CI sin BD; en local con Docker corren). **No cuenta** como
`.skip` crítico porque:

1. El comportamiento bajo BD está cubierto por `migrations-validate` (Postgres efímera) y
   `prisma-migrate-smoke` (migrations + estructura tablas + enums).
2. El sweep DB-free complementario existe en cada dominio (ver US-112/094/095/096/097/130).

`.skip` explícito literal (`describe.skip`, `it.skip`) está prohibido en cualquier test crítico.
El linter no lo enforcea (política de honor); el code review lo detecta.

## Estado de integración de las suites (US-126..131)

| US | Suite | Integrada en CI | Estado |
|---|---|---|---|
| US-126 | unit + integration + coverage | `test-backend` + `test-backend-coverage` | ✅ Done (PB-P2-014) |
| US-127 | contract (MSW) | `test-frontend` (glob `src/tests/contract`) | ✅ Done (PB-P2-015) |
| US-128 | E2E smoke + full | `web-ci.yml` split condicional | ✅ Done (PB-P2-016) |
| US-129 | IA con MockAIProvider | `test-backend-coverage` (`LLM_PROVIDER=mock`) | ✅ Done (PB-P2-017) |
| US-130 | RBAC negativa | `test-backend` + coverage-gate estático + guard `us130-coverage-gate` | ✅ Done (PB-P2-018) |
| US-131 | A11Y (axe) | `test-frontend` (glob `src/tests/a11y`) | ✅ Done (PB-P2-019) |
| US-132 | consolidator + guards | `test-backend` (`us132-ci-gates.spec.ts` + `us132-no-openai-key.spec.ts`) | ✅ Done (PB-P2-020, este PR) |

## Cómo mantener este documento

- **Agregar un gate nuevo**: 1) implementar el job en `pr.yml`/`web-ci.yml`/`ci.yml`; 2) agregarlo
  al catálogo `CANONICAL_GATES` de `backend/tests/schema/us132-ci-gates.spec.ts`; 3) actualizar
  la matriz de arriba con el número consecutivo, workflow · job, source US y required Y/N;
  4) actualizar la lista copiable de required checks si aplica.
- **Renombrar un job**: actualizar los `markers` del catálogo o la sección de required checks —
  el suite `us132-ci-gates.spec.ts` fallará hasta que ambos estén sincronizados.
- **Retirar un gate**: requiere PR con justificación (link a ADR o Doc 20/21). El code review
  bloquea retirar gates sin razón documentada.

## Notas de alineación (no bloqueantes)

- **N-A1** — Los required checks de branch protection son configuración de **repo settings**, no
  versionable en workflows. La lista canónica vive aquí y en `us132-ci-gates.spec.ts`.
- **N-A2** — El guard estructural sustituye la "verificación negativa con PR de prueba" (QA-001)
  de forma más robusta y trazable: en vez de romper un PR para probar el gate, el guard falla
  el propio job `test-backend` si el catálogo se desincroniza — mismo efecto observable,
  sin churn en historia.
- **N-A3** — Esta historia **no** despliega a AWS (fuera de scope PB-P2-021..026). Los required
  checks post-deploy (health/smoke prod) se agregarán cuando esa fase esté activa.
