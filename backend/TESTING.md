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
