# Technical Specification — PB-P2-013 / US-116: Healthcheck y Readiness

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-116                                                                             |
| Source User Story                    | `management/user-stories/US-116-healthcheck-readiness-endpoint.md`                 |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-116-decision-resolution.md`        |
| Priority                             | P2 (Should Have)                                                                   |
| Backlog ID                           | PB-P2-013                                                                          |
| Backlog Title                        | Healthcheck y readiness (`/health`, `/health/ready`)                                |
| Backlog Execution Order              | 13 (decimotercer ítem de P2)                                                       |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Epic                                 | EPIC-OBS-001                                                                       |
| Backlog Item Dependencies            | PB-P0-002 (Backend skeleton), PB-P0-004 (Prisma configurado)                       |
| Feature                              | Endpoints HTTP públicos para healthcheck y readiness                                |
| Module / Domain                      | Platform / Observability (`platform-health` module)                                 |
| Backlog Alignment Status             | Found                                                                              |
| Tech Spec Status                     | Ready for Task Breakdown                                                           |
| Created Date                         | 2026-07-07                                                                         |
| Last Updated                         | 2026-07-07                                                                         |

---

## 2. Source Validation

| Source                       | Found | Used | Notes                                    |
| ---------------------------- | ----- | ---- | ---------------------------------------- |
| User Story                   | Yes   | Yes  | `Approved with Minor Notes`.              |
| Decision Resolution Artifact | Yes   | Yes  | D0 (docs/16 §21) + D1..D9 Tech/Doc Match. |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-013, posición 1 de 1.               |
| API Design Specification     | Yes   | Yes  | `docs/16 §21` contrato canónico.           |
| Deployment DevOps Design     | Yes   | Yes  | `docs/21 §10.4 & §32.2`.                    |
| ADRs                         | Yes   | Yes  | ADR-DEVOPS-003, ADR-DEVOPS-007, ADR-API-004. |

---

## 3. Alignment con Product Backlog

- **Backlog Item**: PB-P2-013 — Healthcheck y readiness.
- **Rol en el backlog**: única historia del backlog item.
- **Predecesores**: PB-P0-002 (backend skeleton entregado), PB-P0-004 (Prisma configurado).
- **Paralelizable con**: US-115 (métricas AI), US-113 (logger), US-114 (correlation ID).
- **Orden dentro de P2**: 13.

---

## 4. Alcance técnico

### 4.1 In Scope

- Módulo `platform-health` en `src/modules/platform-health/`.
- Endpoints públicos `GET /health` y `GET /health/ready`.
- `PostgresProbe` con timeout 500 ms via `Promise.race`.
- `AiProviderProbe` config-based (sin llamada externa).
- `getAppVersion()` util con precedencia APP_VERSION → package.json → "unknown".
- Registro del router antes de guards + whitelist en rate limiter, correlation ID y logger success.
- Tests unit + integration + smoke curl.

### 4.2 Out of Scope

- APM / OpenTelemetry / distributed tracing.
- Endpoint `/metrics` (Prometheus).
- Alarmas CloudWatch específicas (backlog `US-141` post-MVP).
- Autenticación.
- Probe activo al proveedor LLM externo.
- Migraciones DB.

---

## 5. Arquitectura de la solución

### 5.1 Component diagram

```
[Client / App Runner probe]
        │  GET /health, /health/ready
        ▼
[Express app]
        │  (whitelist antes de guards/rate-limit/correlationId/logger success)
        ▼
[platform-health.router]
        │
        ├── GET /health         ─► [HealthController.getHealth]      ─► [GetHealthUseCase] ─► [getAppVersion()]
        │                                                                            └─► process.uptime()
        │
        └── GET /health/ready   ─► [HealthController.getReadiness]   ─► [GetReadinessUseCase]
                                                                          ├─► [PostgresProbe.check()] (500 ms timeout)
                                                                          └─► [AiProviderProbe.check()] (env-based)
```

### 5.2 Módulos afectados

| Módulo               | Acción       | Notas                                                                            |
| -------------------- | ------------ | -------------------------------------------------------------------------------- |
| `platform-health/`   | Crear         | Nuevo módulo dedicado.                                                            |
| `shared/config/`     | Extender      | Agregar `app-version.ts`.                                                          |
| `app/router.ts`      | Modificar     | Registrar `platform-health.router` ANTES de middlewares protegidos.                |
| `rate-limit.middleware.ts` | Modificar | Agregar whitelist `/health`, `/health/ready`.                                     |
| `correlation-id.middleware.ts` (US-114) | Modificar | Agregar exclusión path-based para no propagar a response.                          |
| `logger.middleware.ts` (US-113) | Modificar | Bypass access log si path ∈ `{/health, /health/ready}` y status 2xx.               |
| `prisma`             | Reutilizar    | Cliente existente para `SELECT 1`.                                                 |

---

## 6. Contratos y DTOs

### 6.1 `HealthResponseDto` (canonical `docs/16 §21.3`)

```ts
export type HealthResponseDto = {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptimeMs: number;
  timestamp: string; // ISO-8601 UTC
};
```

### 6.2 `ReadyResponseDto`

```ts
export type ReadyDependencies = {
  postgres: 'ok' | 'down';
  aiProvider: 'ok' | 'mock' | 'down';
};

export type ReadyResponseDto = HealthResponseDto & {
  dependencies: ReadyDependencies;
};
```

### 6.3 Semántica de `status`

| Escenario                                                     | `status`     | HTTP  |
| ------------------------------------------------------------- | ------------ | ----- |
| Proceso vivo (health)                                          | `"ok"`        | 200   |
| Ready: DB OK y `aiProvider ∈ {"ok", "mock"}`                    | `"ok"`        | 200   |
| Ready: DB OK y `aiProvider = "down"`                            | `"degraded"`  | 200   |
| Ready: DB `"down"`                                              | `"error"`     | 503   |

---

## 7. Backend

### 7.1 Estructura

```
src/
├── shared/config/
│   └── app-version.ts          # getAppVersion()
├── modules/platform-health/
│   ├── application/use-cases/
│   │   ├── get-health.use-case.ts
│   │   └── get-readiness.use-case.ts
│   ├── infrastructure/
│   │   ├── http/
│   │   │   ├── health.controller.ts
│   │   │   └── platform-health.router.ts
│   │   └── probes/
│   │       ├── postgres.probe.ts
│   │       └── ai-provider.probe.ts
│   └── domain/
│       └── types.ts             # HealthResponseDto, ReadyResponseDto, ReadyDependencies
```

### 7.2 `getAppVersion()` (`src/shared/config/app-version.ts`)

```ts
import pkg from '../../../package.json' assert { type: 'json' };

let cached: string | null = null;

export function getAppVersion(): string {
  if (cached !== null) return cached;
  const envVersion = process.env.APP_VERSION?.trim();
  if (envVersion && envVersion.length > 0) {
    cached = envVersion;
    return cached;
  }
  try {
    if (pkg?.version && typeof pkg.version === 'string') {
      cached = pkg.version;
      return cached;
    }
  } catch {
    /* ignore */
  }
  cached = 'unknown';
  return cached;
}
```

### 7.3 `PostgresProbe.check()` (`src/modules/platform-health/infrastructure/probes/postgres.probe.ts`)

```ts
import { PrismaClient } from '@prisma/client';

export type PostgresCheckResult = { status: 'ok' | 'down'; latencyMs: number };

const TIMEOUT_MS = 500;

export class PostgresProbe {
  constructor(private readonly prisma: PrismaClient) {}

  async check(): Promise<PostgresCheckResult> {
    const start = process.hrtime.bigint();
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('postgres_check_timeout')), TIMEOUT_MS),
        ),
      ]);
      const latencyMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
      return { status: 'ok', latencyMs };
    } catch {
      const latencyMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
      return { status: 'down', latencyMs };
    }
  }
}
```

### 7.4 `AiProviderProbe.check()` (`src/modules/platform-health/infrastructure/probes/ai-provider.probe.ts`)

```ts
export type AiProviderStatus = 'ok' | 'mock' | 'down';

export class AiProviderProbe {
  check(): AiProviderStatus {
    const provider = (process.env.LLM_PROVIDER ?? '').toLowerCase();
    if (provider === 'mock') return 'mock';
    if (provider === 'openai') {
      const key = process.env.OPENAI_API_KEY?.trim() ?? '';
      return key.length > 0 ? 'ok' : 'down';
    }
    return 'down';
  }
}
```

### 7.5 `GetHealthUseCase`

```ts
import { getAppVersion } from '../../../../shared/config/app-version';
import type { HealthResponseDto } from '../../domain/types';

export class GetHealthUseCase {
  execute(): HealthResponseDto {
    return {
      status: 'ok',
      version: getAppVersion(),
      uptimeMs: Math.floor(process.uptime() * 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 7.6 `GetReadinessUseCase`

```ts
import { getAppVersion } from '../../../../shared/config/app-version';
import type { ReadyResponseDto } from '../../domain/types';
import { PostgresProbe } from '../../infrastructure/probes/postgres.probe';
import { AiProviderProbe } from '../../infrastructure/probes/ai-provider.probe';

export type ReadinessResult = { httpStatus: 200 | 503; body: ReadyResponseDto; postgresLatencyMs: number };

export class GetReadinessUseCase {
  constructor(private readonly pg: PostgresProbe, private readonly ai: AiProviderProbe) {}

  async execute(): Promise<ReadinessResult> {
    const pgResult = await this.pg.check();
    const aiResult = this.ai.check();

    let status: ReadyResponseDto['status'];
    let httpStatus: 200 | 503;
    if (pgResult.status === 'down') {
      status = 'error';
      httpStatus = 503;
    } else if (aiResult === 'down') {
      status = 'degraded';
      httpStatus = 200;
    } else {
      status = 'ok';
      httpStatus = 200;
    }

    return {
      httpStatus,
      postgresLatencyMs: pgResult.latencyMs,
      body: {
        status,
        version: getAppVersion(),
        uptimeMs: Math.floor(process.uptime() * 1000),
        timestamp: new Date().toISOString(),
        dependencies: { postgres: pgResult.status, aiProvider: aiResult },
      },
    };
  }
}
```

### 7.7 `HealthController`

```ts
import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import { GetHealthUseCase } from '../../application/use-cases/get-health.use-case';
import { GetReadinessUseCase } from '../../application/use-cases/get-readiness.use-case';

export class HealthController {
  constructor(
    private readonly health: GetHealthUseCase,
    private readonly readiness: GetReadinessUseCase,
    private readonly logger: Logger,
  ) {}

  getHealth = (_req: Request, res: Response): void => {
    res.status(200).json(this.health.execute());
  };

  getReadiness = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.readiness.execute();
      if (result.httpStatus === 503) {
        this.logger.warn(
          {
            event: 'health.ready.dependency_down',
            postgres: result.body.dependencies.postgres,
            aiProvider: result.body.dependencies.aiProvider,
            postgresLatencyMs: result.postgresLatencyMs,
          },
          'readiness check failed',
        );
      }
      res.status(result.httpStatus).json(result.body);
    } catch (err) {
      this.logger.error({ event: 'health.ready.exception' }, 'unexpected readiness failure');
      res.status(503).json({
        status: 'error',
        version: 'unknown',
        uptimeMs: Math.floor(process.uptime() * 1000),
        timestamp: new Date().toISOString(),
        dependencies: { postgres: 'down', aiProvider: 'down' },
      });
    }
  };
}
```

### 7.8 Router y registro

```ts
// platform-health.router.ts
import { Router } from 'express';
export function buildPlatformHealthRouter(controller: HealthController): Router {
  const router = Router();
  router.get('/health', controller.getHealth);
  router.get('/health/ready', controller.getReadiness);
  router.all('/health', (_req, res) => res.status(405).end());
  router.all('/health/ready', (_req, res) => res.status(405).end());
  return router;
}
```

`app/router.ts` (registro):

```ts
// registrar ANTES de sessionGuard/csrfProtection/rateLimiter/correlationId middleware
app.use(buildPlatformHealthRouter(healthController));
// ... resto de rutas y middlewares protegidos
```

### 7.9 Whitelisting de middlewares existentes

- **Rate limiter** (`rate-limit.middleware.ts`): agregar `HEALTH_PATHS = ['/health', '/health/ready']` y skip si `req.path` ∈ set.
- **Correlation ID** (`correlation-id.middleware.ts`, US-114): agregar exclusión path-based para no setear `X-Correlation-Id` en response ni propagar a `meta`.
- **Logger success** (`logger.middleware.ts`, US-113): bypass access log si `req.path ∈ HEALTH_PATHS` y `res.statusCode < 500`.

---

## 8. API contract

Ver `docs/16 §21`. Este spec es implementación fiel del contrato ya publicado.

- `GET /health` → 200 + `HealthResponseDto`.
- `GET /health/ready` → 200 + `ReadyResponseDto` (status `ok` o `degraded`) o 503 + `ReadyResponseDto` (status `error`).
- Métodos distintos → 405.

---

## 9. Frontend

No aplica.

---

## 10. Database

- **Sin cambios de schema.**
- **Sin migraciones.**
- Reutiliza `PrismaClient` singleton.

---

## 11. AI / PromptOps

- No invoca LLMProvider.
- `AiProviderProbe` sólo lee env vars.

---

## 12. Security

| ID     | Requerimiento                                                                               | Implementación                              |
| ------ | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| SEC-01 | Endpoints públicos anónimos.                                                                 | Registro antes de `sessionGuard`.            |
| SEC-02 | No exponer secretos ni env vars.                                                             | DTO explícitos + revisión de código.         |
| SEC-03 | No exponer PII.                                                                              | DTO no incluye datos de usuario.             |
| SEC-04 | Sin rate limiter (whitelist).                                                                | Middleware skip por path.                    |
| SEC-05 | Sin correlation ID en response (excepción documentada).                                       | Middleware skip por path.                    |
| SEC-06 | Método no permitido → 405 sin exponer stack ni cuerpo.                                        | Handler catch-all.                           |

---

## 13. Testing

### 13.1 Unit tests

| ID   | Scope                                                          | Herramienta |
| ---- | -------------------------------------------------------------- | ----------- |
| UT-01 | `getAppVersion()` — precedencia APP_VERSION → package.json → "unknown". | Vitest       |
| UT-02 | `AiProviderProbe.check()` — matriz (openai+key, openai sin key, mock, otro). | Vitest       |
| UT-03 | `GetHealthUseCase.execute()` — DTO shape estable.                | Vitest       |
| UT-04 | `GetReadinessUseCase.execute()` — combinaciones pg×ai → status + httpStatus. | Vitest      |

### 13.2 Integration tests (Supertest)

| ID   | Escenario                                                                                    |
| ---- | -------------------------------------------------------------------------------------------- |
| IT-01 | `GET /health` sin sesión → 200 + DTO válido.                                                   |
| IT-02 | `GET /health/ready` DB OK + openai+key → 200 status=ok, deps.postgres=ok, deps.ai=ok.          |
| IT-03 | `GET /health/ready` DB OK + mock → 200 status=ok, deps.ai=mock.                                 |
| IT-04 | `GET /health/ready` DB OK + openai sin key → 200 status=degraded, deps.ai=down.                 |
| IT-05 | `GET /health/ready` con DB down (simulado) → 503 status=error, deps.postgres=down.              |
| IT-06 | `POST /health` → 405.                                                                           |
| IT-07 | Rate limiter no bloquea 20 requests rápidos a `/health`.                                        |
| IT-08 | Response no incluye header `X-Correlation-Id` ni body `meta.correlationId`.                     |
| IT-09 | Logger success bypass (spy) — 200 no emite access log; 503 sí emite warn.                       |
| IT-10 | Cross-auth: cliente organizer y admin también reciben 200 (guard no aplica).                    |

### 13.3 Security tests

| ID       | Escenario                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| SEC-T-01 | Response body no contiene keywords sensibles: `DATABASE_URL`, `PASSWORD`, `TOKEN`, `SECRET`, `PRIVATE_KEY`.     |
| SEC-T-02 | Exception simulada (mockeando Prisma) NO expone stack trace ni mensaje raw en response.                        |

### 13.4 Smoke tests (curl / CI)

- `curl -f -sS http://localhost:3000/health | jq -e '.status == "ok"'` post-deploy.
- `curl -f -sS http://localhost:3000/health/ready | jq -e '.dependencies.postgres == "ok"'` post-deploy.

### 13.5 Performance

- Micro-benchmark: 100 requests seriales a `/health` → P95 < 100 ms.
- 100 requests seriales a `/health/ready` con DB local → P95 < 500 ms.

---

## 14. Observability

- `/health` success: no log.
- `/health/ready` 503: `logger.warn({ event, postgres, aiProvider, postgresLatencyMs })`.
- `/health/ready` exception: `logger.error({ event })`.
- Sin AdminAction, sin AIRecommendation.

---

## 15. Deployment

- App Runner Health Check config: path `/health`, port `3000` (o el mapeado), interval `10s`, timeout `2s`, healthy threshold `1`, unhealthy threshold `3`.
- Variable `APP_VERSION` inyectada en CI/CD (SHA corto o tag).
- Sin cambios en Dockerfile.

---

## 16. Documentation Alignment

| # | Documento                                                       | Acción                                                                              |
| - | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| A1 | `management/artifacts/1-EventFlow-Epic-Map.md` §17.7             | Cambiar refs `/healthz` `/readyz` por `/health` `/health/ready`.                     |
| A2 | `management/artifacts/2-User-Stories-Coverage-Matrix.md`         | Actualizar fila US-116 con paths canónicos.                                          |
| A3 | `docs/22-Architecture-Decision-Records.md` (ADR-API-004)          | Anotar excepción de `X-Correlation-Id` para `/health*`.                              |
| A4 | Backlog Traceability PB-P2-013                                    | Ampliar con `NFR-PERF-001, NFR-OBS-006, NFR-PRIV-004, ADR-DEVOPS-003, docs/16 §21`. |

---

## 17. Riesgos

| Riesgo                                                              | Impacto                        | Mitigación                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `SELECT 1` cuelga por pool exhausted                                 | Readiness devuelve 503 falso    | Timeout 500 ms via `Promise.race` + separate pool no requerido en MVP.                                         |
| `package.json` no accesible en build Docker                           | `version = "unknown"`           | CI inyecta `APP_VERSION`; fallback funciona.                                                                    |
| Logging success bypass rompe métricas de acceso                       | Falta visibilidad               | Documentado; NFR-OBS-006 acepta stdout mínimo; probes tienen fallo loggeado.                                    |
| Middleware order mal registrado                                       | 401/403 en health                | Testing IT-01 y IT-10 validan explícitamente.                                                                  |

---

## 18. Out of Scope Confirmation

- APM / OTel / Prometheus.
- `/metrics`.
- Endpoint `/live` adicional.
- Autenticación.
- Probe activo al LLM externo.
- Migraciones DB.
- Cambios en frontend.

---

## 19. Readiness for Task Breakdown

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| Cada AC cubierta por un componente técnico                   | Pass    |
| Contratos definidos                                          | Pass    |
| Módulo canonical identificado                                | Pass    |
| Estructura de archivos definida                              | Pass    |
| Testing strategy explícita                                   | Pass    |
| Security & Privacy cubierto                                  | Pass    |
| Sin dependencias bloqueantes pendientes                      | Pass    |
| Documentation alignments identificados                       | Pass    |
| Ready for Task Breakdown                                     | Yes     |

---

## 20. Recomendación

`Ready for Task Breakdown` — invocar `eventflow-user-story-to-development-tasks`.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-013/US-116-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-013
Execution Order: 13 (decimotercer ítem de P2)
Next step: Run `eventflow-user-story-to-development-tasks`.
