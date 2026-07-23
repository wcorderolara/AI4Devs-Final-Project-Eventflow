# Backend Testing Guide

> US-126 (PB-P2-014) canonicaliza la ejecución de la suite de tests backend y el umbral
> de cobertura bloqueante en CI. Este documento es la fuente autoritativa para el equipo.
> Cambios al pipeline o al umbral deben reflejarse aquí antes de mergearse.

## TL;DR

```bash
# Correr toda la suite
npm test

# Sólo unit
npm run test:unit

# Sólo integration + api
npm run test:integration

# Con coverage + gate bloqueante (mismo comando que ejecuta el CI)
npm run test:coverage
```

## Stack

- **Runner**: [Vitest](https://vitest.dev) 2.x (ADR-TEST-001).
- **HTTP tests**: [Supertest](https://github.com/ladjs/supertest) sobre el `app` Express real.
- **Cobertura**: v8 provider (`vitest.config.ts:coverage`). Reporters: `text`, `html`, `lcov`,
  `json-summary`. Salida en `backend/coverage/`.
- **Base de datos**: PostgreSQL efímero (Docker/CI o local). Los integration tests usan el patrón
  `describe.skipIf(!dbUp)` centralizado en `tests/helpers/test-db.ts` (US-126 BE-001).
- **IA**: `MockAIProvider` obligatorio (US-119) — envuelto por `tests/helpers/mock-ai.ts` (US-126
  BE-002). Prohibido `OPENAI_API_KEY` real en CI (VR-02 · SEC-02).

## Estructura de directorios

```
backend/tests/
├── setup/env.setup.ts        # Env vars seguros pre-import (US-089)
├── helpers/                  # Helpers reutilizables entre specs
│   ├── test-db.ts            # US-126 BE-001: getTestPrisma + dbUp + truncateAll
│   ├── mock-ai.ts            # US-126 BE-002: MockAIProvider wrapper + fixtures
│   ├── negative-auth.ts      # 401/403 matrix para middleware policy
│   ├── protected-endpoints.ts
│   ├── express-mocks.ts
│   └── ...
├── unit/                     # Unit tests: dominio, application, schemas Zod, utils
├── integration/              # Integration tests: repositorios + constraints + middleware
├── api/                      # API tests: Supertest sobre createApp() completo
├── structure/                # Tests estructurales del layout (Doc 14 §9)
├── migrations/               # Tests de migraciones Prisma
├── openapi/                  # Contract tests del snapshot OpenAPI
└── schema/                   # Tests del schema Prisma
```

## Scripts npm

| Script | Descripción |
| ------ | ----------- |
| `npm test` | Suite completa (`vitest run`). |
| `npm run test:watch` | Modo watch para desarrollo. |
| `npm run test:unit` | Sólo `tests/unit` + `tests/structure`. |
| `npm run test:integration` | Sólo `tests/integration` + `tests/api`. |
| `npm run test:coverage` | Suite completa + coverage con umbrales bloqueantes (US-126). |
| `npm run test:ci` | Suite con reporter verbose (para CI). |
| `npm run test:integration:smoke` | Smoke rápido de conectividad Prisma. |

## Umbral de cobertura (US-126 · AC-03 · AC-05)

Configurado en `vitest.config.ts:coverage.thresholds`:

| Métrica | Umbral bloqueante | Baseline (al momento de setear) |
| ------- | ----------------- | ------------------------------- |
| Statements | 55% | 67.87% |
| Branches | 75% | 86.34% |
| Functions | 55% | 68.94% |
| Lines | 55% | 67.87% |

### Rationale del umbral

La User Story US-126 exige **≥50% sobre lógica crítica**. `docs/20-Testing-Strategy.md §22` fija
como meta aspiracional **60% global y 80% para use cases críticos + policy**. La suite actual
ya supera el 60/80 aspiracional. Los umbrales bloqueantes se fijan **conservadoramente ~10pp
por debajo del baseline** para:

- Cumplir el ≥50% mínimo obligatorio con buffer amplio.
- Atrapar regresiones material (>10pp de caída sostenida).
- No bloquear PRs por fluctuaciones de ±1-3pp inherentes a cambios normales.

Cuando la suite crezca sustancialmente por encima de estos umbrales, actualizar los thresholds
en el mismo PR que agregue la cobertura — para dejar el gate ajustado al nuevo baseline.

## Determinismo (US-126 · AC-04)

- **Sin red externa**: `LLM_PROVIDER=mock` obligatorio; el `MockAIProvider` es determinístico.
- **Sin secretos reales**: `OPENAI_API_KEY` NUNCA en CI (protección VR-02). El helper
  `tests/helpers/mock-ai.ts:assertNoOpenAIRealKey()` es un guard opcional.
- **BD efímera**: Postgres se aprovisiona fresh por job de CI (`services.postgres` en `.github/
  workflows/pr.yml` / `ci.yml`). Localmente, cada spec de integration usa `truncateAll()` para
  aislar mutaciones (patrón consolidado en `us080-admin-actions-list.integration.spec.ts`).
- **`fileParallelism: false`**: los integration tests corren en serie para evitar carreras sobre
  datos compartidos (configurado en `vitest.config.ts`).
- **Sin `.skip`/`xfail` en tests críticos** (VR-03): los skips permitidos son sólo para tests
  DB-dependent cuando el runner no tiene Postgres (`describe.skipIf(!dbUp)`) — patrón explícito
  y auto-declarado, no un silenciador.

## Gate de CI bloqueante (US-126 · AC-05 · OPS-002)

`.github/workflows/pr.yml` incluye estos jobs para cada PR:

- `test-backend` — corre `npm test` (suite completa; integration DB-dependent auto-skip).
- `test-backend-coverage` — corre `npm run test:coverage`. **Sale con exit ≠ 0 si la cobertura
  cae por debajo del umbral**. El merge queda bloqueado hasta que se restaure la cobertura o
  se ajuste el threshold con justificación en el PR.
- Además: `lint`, `typecheck`, `build-backend`, `build-frontend`, `test-frontend`,
  `migrations-validate`.

`.github/workflows/ci.yml` corre gates especializados sobre `main`/push (schema Prisma,
migrations, secret scan, OpenAPI drift).

## Cómo agregar un nuevo integration test

Patrón recomendado (US-126 BE-001):

```ts
import { describe, beforeAll, afterAll, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getTestPrisma, dbUp, truncateAll } from '../helpers/test-db.js';

const app = createApp();
const prisma = getTestPrisma();

describe.skipIf(!dbUp)('mi feature integration', () => {
  beforeAll(async () => {
    await truncateAll(prisma); // aislamiento
    // ... seed fixtures específicos del test
  }, 30_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('feature funciona end-to-end', async () => {
    const res = await request(app).get('/api/v1/foo');
    expect(res.status).toBe(200);
  });
});
```

## Cómo probar un flujo IA sin salir a red

Patrón (US-126 BE-002):

```ts
import { describe, expect, it } from 'vitest';
import { getMockAIProvider, assertNoOpenAIRealKey } from '../helpers/mock-ai.ts';

describe('mi feature IA con MockAIProvider', () => {
  assertNoOpenAIRealKey();
  const provider = getMockAIProvider();

  it('genera output que cumple el schema Zod del feature', async () => {
    const output = await provider.generate({ feature: 'event_plan', input: {...} });
    // Aserción SOBRE SCHEMA, no sobre texto literal (VR-02 · EC-02).
    expect(output).toMatchObject({ summary: expect.any(String), phases: expect.any(Array) });
  });
});
```

## Suite dedicada IA (US-129 · PB-P2-017)

`backend/tests/unit/us129-ai-mock-suite.spec.ts` es el **suite consolidado**
que ejercita el `MockAIProvider` real contra las features del MVP y los
comportamientos transversales de IA. Complementa (no duplica) las suites
preexistentes citadas abajo.

**Set canónico de features cubierto (Doc 7 · AI-001..AI-006 + AI-008):**

| Doc 7 | Feature key en `AI_FEATURE_TYPES` | Cubierto por US-129 |
| ----- | --------------------------------- | ------------------- |
| AI-001 plan del evento | `event_plan` | Sí |
| AI-002 checklist | `checklist` | Sí |
| AI-003 presupuesto sugerido | `budget_suggestion` | Sí |
| AI-004 categorías recomendadas | `vendor_categories` | Sí |
| AI-005 brief de cotización | `quote_brief` | Sí |
| AI-006 resumen comparativo | `quote_comparison` | Sí |
| AI-008 priorización de tareas | `task_prioritization` | Sí |

**Extensiones adicionales cubiertas (superset por diseño · D-02):**

| Origen | Feature key | Razón |
| ------ | ----------- | ----- |
| US-022 (extensión de AI-006) | `quote_compare_summary` | HITL informativo event-scope |
| Doc 7 AI-007 (Could Have) | `vendor_bio` | Cobertura defensiva |
| US-024 (extensión de AI-008) | `task_priority` | Top-3 event-scope |

**Cobertura de AC (US-129):**

- **AC-01** (Mock por env en CI) — sanity: `assertNoOpenAIRealKey`; env
  `LLM_PROVIDER=mock` en `pr.yml:test-backend-coverage:env`.
- **AC-02** (7 features + Zod strict) — `it.each(CANONICAL_MVP_FEATURES)` +
  loop sobre `AI_FEATURE_TYPES` completo; parse con `OUTPUT_SCHEMAS[feature]`.
- **AC-03** (timeout/JSON/reintentos) — hooks `__simulate: 'timeout' |
  'unavailable' | 'invalid'` del provider; feature/idioma no soportado.
  Complemento en `us123-ai-timeout.service.spec.ts` +
  `us123-fallback.service.spec.ts` (composición `AIExecutionService`).
- **AC-04** (persistencia AIRecommendation) — **reconocido**: cubierto por
  `us122-persist-ai-recommendation.service.spec.ts` (127 líneas · BR-AI-007/010).
- **AC-05** (determinismo + <60s) — 3 corridas por feature deep-equal +
  benchmark `performance.now()` con umbral defensivo 3s (holgura vs objetivo
  60s de la spec).

**Activación por env (AI-001) — ya existente:**

`backend/src/config/env.ts:57` valida `LLM_PROVIDER: z.enum(['openai', 'mock',
'anthropic'])`. `llm-provider.factory.ts` selecciona el provider en tiempo de
composition root. En CI, `pr.yml:test-backend-coverage:env` fija
`LLM_PROVIDER: mock` (US-126 · VR-02) — el mismo job cubre la suite US-129.

**Sin PII ni secretos (SEC-001):**

El bloque `SEC-001 · fixtures del mock — sin PII` corre patrones defensivos
(email, `sk-XXX`, keywords sensibles) contra el `output` serializado de cada
feature — UUIDs se strippean antes porque son parte del contrato. El guard
estático de código (`us119-mock-no-network.guard.spec.ts`) verifica adicional
que el mock no importa SDKs de IA, HTTP ni secrets.

**Correrlo aislado:**

```bash
npm test -- us129
```

## Suite RBAC negativa extendida (US-130 · PB-P2-018)

`backend/tests/api/us130-*.spec.ts` extiende la suite base RBAC + ownership de US-112
(PB-P0-008) con casos negativos **por dominio**: organizer / vendor / admin. Alineada con
`docs/19 §Auth` (RBAC + ownership + assignment), Doc 20 §25.5. El **backend es la única
fuente de verdad** — todos los tests golpean la API con Supertest (no UI).

**Archivos:**

| Archivo | Cobertura |
|---|---|
| `tests/helpers/us130-multi-role.ts` | Fixtures multi-cuenta (organizer A/B, vendor asignado/no asignado, admin) + `activeEvent` / `assignedQuoteRequest` / `seedCommonCatalog`. Admin agent creado directamente vía Prisma + `cookie-signature` (registro público bloquea `role=admin` por SEC-08 US-094). |
| `tests/api/us130-organizer-negative.spec.ts` | SEC-001 — organizer B → recursos ajenos (events/cancel, quote-requests, quotes/accept\|reject\|prefer, booking-intents, ai-recommendations/discard). Aislamiento entre cuentas (BR-AUTH-009). |
| `tests/api/us130-vendor-negative.spec.ts` | SEC-002 — vendor no asignado → PATCH/send/quote/viewed sobre QR/Quote ajena (BR-AUTH-007). Vendor asignado → GET /events/:id crudo → 403 (no accede al evento fuera del brief). |
| `tests/api/us130-admin-negative.spec.ts` | SEC-003 — sweep matricial 401 anónimo + 403 no-admin sobre TODOS los routers `/admin/*` reales. Escalamiento: admin → operaciones organizer/vendor → 403. |
| `tests/api/us130-envelope-no-leak.spec.ts` | QA-002 — envelope canónico `{error:{code,message,correlationId,details?}}` sin campos extra top-level + no-leak (stack/SQL/secretos + UUID del recurso ajeno). |
| `tests/api/us130-coverage-gate.spec.ts` | OPS-001 — gate estático: cada endpoint de `PROTECTED_ENDPOINTS` (US-112) tiene ≥1 caso negativo cableado en `tests/api/`. Falla el merge si falta cobertura. |

**Convención 403 vs 404** (Doc 19 §Auth):

| Situación | Status | Justificación |
|---|---|---|
| Sin sesión válida | **401** `AUTHENTICATION_REQUIRED` | No se conoce la identidad — precede a todo otro check. |
| Rol incorrecto sobre endpoint público (existente o no ligado a recurso ajeno) | **403** `FORBIDDEN` | La existencia del endpoint es pública; revelar el rol requerido no filtra info. Aplica a `/admin/*` (rol admin), `/events` POST (rol organizer), `/vendors/me/*` (rol vendor). |
| Recurso ajeno cuya sola existencia sería información sensible | **404** `RESOURCE_NOT_FOUND` masked | Revelar 403 filtraría que el recurso existe. Aplica a `/events/:id`, `/quote-requests/:id`, `/quotes/:id/accept\|reject\|prefer`, `/booking-intents/:id`, `/ai-recommendations/:id`. |
| Vendor con rol correcto pero sin assignment sobre QR/Quote específico | **404** masked | Mismo criterio anterior — el QR pertenece a otro flujo bilateral. |

**Matriz endpoint × rol (esperado por control):**

| Control | Ejemplo | Anónimo | organizer | vendor | admin |
|---|---|---|---|---|---|
| `auth` | `GET /users/me` | 401 | 200 | 200 | 200 |
| `role:organizer` | `POST /events` | 401 | 200 | 403 | 403 |
| `role:vendor` | `POST /vendors/me/ai/bio` | 401 | 403 | 200 | 403 |
| `role:admin` | `GET /admin/metrics` | 401 | 403 | 403 | 200 |
| `ownership` | `GET /events/:id` | 401 | 200 (owner) / 404 (otro) | 403 | 403 |
| `assignment` | `POST /quotes/:id/send` | 401 | 403 | 200 (asignado) / 404 (no asignado) | 403 |

**Correrla aislada:**

```bash
npm test -- us130
```

## Ver el reporte HTML de cobertura

```bash
npm run test:coverage
open coverage/index.html   # o xdg-open en Linux
```

## Referencias

- `docs/20-Testing-Strategy.md` — pirámide de pruebas EventFlow.
- `docs/22-Architecture-Decision-Records.md` §ADR-TEST-001 (Vitest + Supertest).
- `management/user-stories/US-126-unit-integration-backend-suite.md`.
- `management/technical-specs/P2/PB-P2-014/US-126-technical-spec.md`.
- `management/workflows/development-execution/P2/PB-P2-014/US-126-execution.md`.

## Documentation Alignment (no bloqueante)

US-126 fija ≥50% como piso; `docs/20 §22` sugiere 60/80% como meta aspiracional. Los umbrales
actuales (55/75/55/55) están alineados con el piso de US-126 y con espacio para converger hacia
la meta aspiracional a medida que crezca la suite. Cuando el equipo decida elevar el piso a 60%
o más, actualizar `vitest.config.ts:coverage.thresholds` + este documento + Doc 20 en el mismo PR.
