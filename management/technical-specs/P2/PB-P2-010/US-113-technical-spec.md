# Technical Specification — US-113: Logger estructurado JSON con Pino

## 1. Metadata

| Field                                | Value                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-113                                                                                              |
| Source User Story                    | `management/user-stories/US-113-structured-logger.md`                                               |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-113-decision-resolution.md`                        |
| Priority                             | P2 (Should Have)                                                                                    |
| Backlog ID                           | PB-P2-010                                                                                           |
| Backlog Title                        | Logger estructurado JSON — Pino + redacción + correlationId                                          |
| Backlog Execution Order              | 10 (décimo ítem de P2)                                                                              |
| User Story Position in Backlog Item  | 1 de 1                                                                                              |
| Related User Stories in Backlog Item | US-113                                                                                              |
| Epic                                 | EPIC-OBS-001                                                                                        |
| Backlog Item Dependencies            | PB-P0-002 (backend bootstrap con orden de middlewares)                                              |
| Feature                              | Logger estructurado JSON con Pino, redacción de secrets/PII y correlationId end-to-end               |
| Module / Domain                      | Platform / Observability                                                                             |
| User Story Status                    | Approved                                                                                             |
| Backlog Alignment Status             | Found                                                                                               |
| Technical Spec Status                | Ready for Task Breakdown                                                                            |
| Created Date                         | 2026-07-07                                                                                          |
| Last Updated                         | 2026-07-07                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-010 — Logger estructurado JSON** (P2, Should Have). Depende de PB-P0-002 (backend bootstrap ya entregada por US-089/090/091). Materializa `docs/14 §logger` + `docs/22 §ADR-SEC-001/§ADR-API-004` + `docs/10 §NFR-OBS-006/§NFR-PRIV-004` + `docs/19 §670`.

### Execution Order Rationale

Se implementa después de PB-P0-002 (bootstrap). Coexistencia con US-114 (Correlation IDs): si US-114 no está mergeada, US-113 emite `correlationId=null`. Downstream: US-034, US-068..072, US-115, US-116 consumen el singleton logger.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                       | Suggested Order |
| ---------- | ------------------------------------------ | --------------- |
| US-113     | Foundation logger + redacción + AsyncLocalStorage | 1               |

---

## 3. Executive Technical Summary

Implementar el logger estructurado JSON base para todo el backend EventFlow:

1. **Dependencies**: instalar `pino` (última stable Node LTS) + `pino-pretty` (dev only).
2. **Config env** (`src/config/env.ts`): extender Zod schema con `LOG_LEVEL`, `LOG_PRETTY`, `LOG_INCLUDE_PII`, `SERVICE_VERSION`. Fail-fast al boot con guards (LOG_PRETTY/LOG_INCLUDE_PII prohibidos en prod).
3. **Correlation context** (`src/shared/context/correlation-id.ts`): singleton `AsyncLocalStorage<{correlationId}>` (D4).
4. **Redactors** (`src/infrastructure/logger/redactors.ts`): `redactSecrets` (12 campos, siempre), `redactPII` (7 campos, condicionado a env), `redactHeaders` (5 headers, siempre). Recursivos con profundidad 5 (D3).
5. **Pino logger** (`src/infrastructure/logger/pino-logger.ts`): instancia con `serializers`, `formatters.log` que aplica redactores, `mixin` que inyecta `service/env/version/correlationId`, `messageKey='msg'`, `timestamp: pino.stdTimeFunctions.isoTime`.
6. **Middleware** (`src/infrastructure/middleware/request-logger.middleware.ts`): corre `correlationContext.run({ correlationId }, next)` y emite request/response log con `context.req.headers` (redactados) y `context.res.status`.
7. **Singleton export** (`src/shared/logger.ts`): re-exporta la instancia para consumidores.
8. **Bootstrap**: registrar middleware en `app.ts` después del correlation middleware (US-114) y antes de auth.
9. **Docs**: `.env.example` documenta nuevas env vars.

Testing multi-capa con foco en fail-fast y regresión de seguridad (REG-01 captura logs de US-034/068..072 y verifica ausencia de PII/secrets).

---

## 4. Scope Boundary

### In Scope

* Instalación de `pino` + `pino-pretty`.
* Módulos backend: config env, correlation context, redactors, pino instance, request-logger middleware, singleton export.
* Registro del middleware en `app.ts`.
* Documentación en `.env.example`.
* Testing UT + IT + REG + NT + Smoke.
* Documentation Alignment: 1 ítem (Traceability de PB-P2-010).

### Out of Scope

* APM/ELK/distributed tracing (NFR-OBS-006).
* File transport / log rotation interna.
* Fanout multi-sink.
* Redacción configurable en runtime (sets fijos MVP).
* Cambios al `NotificationLinkResolver`, use cases o schema Prisma.
* Métricas cuantitativas (Prometheus, StatsD) — Future.
* Cambios frontend.
* Generación del `X-Correlation-Id` header — alcance de US-114.

### Explicit Non-Goals

* Modificar `docs/14`, `docs/22`, `docs/10`, `docs/19` (US-113 sólo materializa).
* Alterar el orden de middlewares definido por PB-P0-002 (sólo agregar los nuevos en la posición correcta).
* Cambiar la API del logger a algo distinto de la interfaz idiomática de Pino (`logger.info(context, msg)`).
* Introducir dependencias transitivas grandes (evitar `winston-*`).

---

## 5. Architecture Alignment

### Backend Architecture

* Node.js LTS + Express + TypeScript + Prisma + PostgreSQL (`docs/14 §estructura`).
* Módulo `platform/observability` implícito; instancias en `src/infrastructure/logger/*` y helpers en `src/shared/`.
* Reuso de `src/config/env.ts` (creado por PB-P0-002).
* Reuso del session middleware y del error handler existentes.

### Frontend Architecture

`No aplica`.

### Database Architecture

`No aplica`.

### API Architecture

`No aplica` (biblioteca; sin endpoints propios). El middleware `request-logger` intercepta requests HTTP existentes.

### AI / PromptOps Architecture

`No aplica` en la implementación. Interacción documentada: US-115 (métricas IA JSON) consumirá el singleton logger con `context.metric` estructurado.

### Security Architecture

* Alineado con `ADR-SEC-001` (Prevent Injection and Token Exposure).
* Alineado con `SEC-POL-AI-008` (`docs/19 §670`): sin full payload IA en logs prod.
* Redacción centralizada obligatoria (`docs/22 §1851 §1887`).
* Fail-fast al boot como línea de defensa configuracional.

### Testing Architecture

* Vitest + Supertest (backend).
* Sin Playwright/Axe (sin UI).
* Testing especializado: captura de logs vía `pino-test` (o inyección de destination custom) para verificar shape/redacción.
* Docker smoke test como último gate.

---

## 6. Functional Interpretation

| Acceptance Criterion              | Technical Interpretation                                                                                          | Impacted Layer(s)          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------- |
| AC-01 — Formato JSON base         | Pino `formatters.log` inyecta `service, env, version`; `mixin` inyecta `correlationId`; `messageKey='msg'`.        | Backend / Config           |
| AC-02 — `LOG_LEVEL` respetado     | Pino `level` config leído de env; niveles filtrados nativamente.                                                    | Backend / Config           |
| AC-03 — Redacción secrets         | `redactSecrets(context)` invocado en `formatters.log`.                                                             | Backend / Security         |
| AC-04 — Redacción PII             | `redactPII(context)` invocado en `formatters.log`; guard por env.                                                   | Backend / Security         |
| AC-05 — correlationId propagado   | `AsyncLocalStorage.getStore()?.correlationId ?? null` en `mixin`.                                                   | Backend / Observability    |
| AC-06 — Fuera de context → null   | Mismo mixin retorna `null` explícito.                                                                              | Backend                    |
| AC-07 — Headers redactados        | `redactHeaders(req.headers)` invocado en `request-logger.middleware.ts`.                                            | Backend / Security         |
| AC-08 — stdout único              | Pino sin transports adicionales (`destination: 1`).                                                                | Backend                    |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo transversal `platform/observability`. Alberga:
  * `src/infrastructure/logger/pino-logger.ts` (instancia).
  * `src/infrastructure/logger/redactors.ts` (helpers de redacción).
  * `src/infrastructure/middleware/request-logger.middleware.ts` (middleware).
  * `src/shared/context/correlation-id.ts` (AsyncLocalStorage).
  * `src/shared/logger.ts` (singleton export).
  * `src/config/env.ts` (extensión Zod).

### Use Cases / Application Services

* No aplica (foundation library, no use case).

### Controllers / Routes

* No aplica (biblioteca).

### DTOs / Schemas

* Zod schema para env vars:
  ```ts
  export const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).optional(),
    LOG_PRETTY: z.coerce.boolean().optional(),
    LOG_INCLUDE_PII: z.coerce.boolean().optional(),
    SERVICE_VERSION: z.string().min(1).optional(),
  }).transform((raw, ctx) => {
    const resolvedLevel = raw.LOG_LEVEL ?? (raw.NODE_ENV === 'production' ? 'info' : raw.NODE_ENV === 'test' ? 'warn' : 'debug');
    const resolvedPretty = raw.LOG_PRETTY ?? false;
    const resolvedIncludePII = raw.LOG_INCLUDE_PII ?? false;
    if (raw.NODE_ENV === 'production' && resolvedPretty) {
      ctx.addIssue({ code: 'custom', message: 'LOG_PRETTY is not allowed in production' });
      return z.NEVER;
    }
    if (raw.NODE_ENV !== 'development' && resolvedIncludePII) {
      ctx.addIssue({ code: 'custom', message: 'LOG_INCLUDE_PII is only allowed in development' });
      return z.NEVER;
    }
    const resolvedVersion = raw.SERVICE_VERSION ?? readPackageJsonVersion(); // helper
    if (!resolvedVersion) {
      ctx.addIssue({ code: 'custom', message: 'SERVICE_VERSION must be set via env or package.json' });
      return z.NEVER;
    }
    return { ...raw, LOG_LEVEL: resolvedLevel, LOG_PRETTY: resolvedPretty, LOG_INCLUDE_PII: resolvedIncludePII, SERVICE_VERSION: resolvedVersion };
  });
  ```

### Repository / Persistence

`No aplica`.

### Validation Rules

* VR-01..VR-04 aplicadas en el Zod schema al boot.

### Error Handling

* Fail-fast al boot vía Zod parse (`envSchema.parse(process.env)`); si falla, mensaje claro + `process.exit(1)`.
* Errores runtime del logger (payload circular): capturados por Pino y emitidos como `context.serializationError=true`.

### Transactions

`No aplica`.

### Observability

* El logger ES la observabilidad; test unit + smoke Docker validan operación.

### Detalle de `redactors.ts`

```ts
const SECRET_KEYS = new Set([
  'password', 'pwd', 'token', 'apikey', 'api_key', 'secret',
  'authorization', 'cookie', 'session', 'refresh_token', 'access_token', 'jwt', 'bearer'
]);
const PII_KEYS = new Set(['email', 'phone', 'phonenumber', 'taxid', 'address', 'ip', 'ipaddress']);
const HEADER_KEYS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-session-token']);

const MAX_DEPTH = 5;
const REDACTED = '[REDACTED]';

export function redactSecrets(obj: unknown, depth = 0): unknown {
  return redactRecursive(obj, depth, SECRET_KEYS);
}

export function redactPII(obj: unknown, env: 'development' | 'test' | 'production', includePII: boolean, depth = 0): unknown {
  if (env === 'development' && includePII) return obj;
  return redactRecursive(obj, depth, PII_KEYS);
}

export function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = HEADER_KEYS.has(k.toLowerCase()) ? REDACTED : v;
  }
  return out;
}

function redactRecursive(obj: unknown, depth: number, keys: Set<string>): unknown {
  if (depth > MAX_DEPTH) return obj;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => redactRecursive(v, depth + 1, keys));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = keys.has(k.toLowerCase()) ? REDACTED : redactRecursive(v, depth + 1, keys);
  }
  return out;
}
```

### Detalle de `pino-logger.ts`

```ts
import pino from 'pino';
import { env } from '../../config/env';
import { correlationContext } from '../../shared/context/correlation-id';
import { redactSecrets, redactPII } from './redactors';

const logger = pino({
  level: env.LOG_LEVEL,
  messageKey: 'msg',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
    log: (obj) => {
      const withSecrets = redactSecrets(obj);
      const withPII = redactPII(withSecrets, env.NODE_ENV, env.LOG_INCLUDE_PII);
      return withPII;
    },
  },
  mixin: () => {
    const store = correlationContext.getStore();
    return {
      service: 'backend-api',
      env: env.NODE_ENV,
      version: env.SERVICE_VERSION,
      correlationId: store?.correlationId ?? null,
    };
  },
  transport: env.LOG_PRETTY ? { target: 'pino-pretty' } : undefined,
});

export default logger;
```

### Detalle de `request-logger.middleware.ts`

```ts
import { RequestHandler } from 'express';
import logger from '../logger/pino-logger';
import { correlationContext } from '../../shared/context/correlation-id';
import { redactHeaders } from '../logger/redactors';

export const requestLogger: RequestHandler = (req, res, next) => {
  const correlationId = (req as any).correlationId ?? null; // provisto por US-114 upstream
  correlationContext.run({ correlationId }, () => {
    const start = Date.now();
    logger.info({ req: { method: req.method, url: req.url, headers: redactHeaders(req.headers as any) } }, 'request received');
    res.on('finish', () => {
      logger.info({ res: { status: res.statusCode, ms: Date.now() - start } }, 'request completed');
    });
    next();
  });
};
```

---

## 8. Frontend Technical Design

`No aplica`.

---

## 9. API Contract Design

`No aplica` — biblioteca.

---

## 10. Database / Prisma Design

`No aplica`.

---

## 11. AI / PromptOps Design

`No aplica`.

---

## 12. Security & Authorization Design

### Authentication

`No aplica` (biblioteca interna).

### Authorization

`No aplica`.

### Ownership Rules

`No aplica`.

### Role Rules

`No aplica`.

### Negative Authorization Scenarios

* Config insegura (`LOG_PRETTY=true` en prod, `LOG_INCLUDE_PII=true` fuera de dev) → fail-fast al boot.
* No hay API pública para bypassar redacción; sets fijos en MVP.

### Audit Requirements

* Regresión REG-01/REG-02 captura logs de consumidores existentes y verifica ausencia de PII/secrets, alineado con `docs/22 §1887`.

### Sensitive Data Handling

* `redactSecrets` cubre 12 campos (case-insensitive).
* `redactPII` cubre 7 campos en prod.
* `redactHeaders` cubre 5 headers siempre.
* Redacción recursiva acotada a profundidad 5.

---

## 13. Testing Strategy

### Unit Tests

* UT-01: `logger.info` emite JSON con orden estable de campos base.
* UT-02: `LOG_LEVEL=warn` filtra debug/info; deja pasar warn/error/fatal.
* UT-03: `redactSecrets` cubre los 12 campos case-insensitive.
* UT-04: `redactPII` con `NODE_ENV=production` redacta; con `NODE_ENV=development` + `LOG_INCLUDE_PII=true` no.
* UT-05: `correlationContext.run({correlationId:'x'}, () => logger.info(...))` inyecta `correlationId='x'`.
* UT-06: fuera de context → `correlationId=null` sin crash.
* UT-07: payload circular → `context.serializationError=true`.
* UT-08: `redactHeaders` cubre los 5 headers case-insensitive.

### Integration Tests

* IT-01: request HTTP a `/healthz` (endpoint de US-116) → log con `correlationId` del header (o generado por US-114) matcheando en request received + request completed.
* IT-02: `EmitT7NotificationsJob` mock corre fuera de HTTP context → logs con `correlationId=null`.

### Regression Tests (críticos por seguridad)

* REG-01: mock de emisión de US-034 (`[EMAIL] to=<userId>`) y verificar que `email`, `token`, `password` NUNCA aparecen en el JSON emitido.
* REG-02: request con `Authorization: Bearer xxx` y `Cookie: session=abc` → verificar `[REDACTED]` en el log emitido.

### Negative Tests

| ID    | Scenario                                                      | Expected Result                   |
| ----- | ------------------------------------------------------------- | --------------------------------- |
| NT-01 | `LOG_LEVEL=verbose`                                            | Fail-fast al boot con mensaje.    |
| NT-02 | `LOG_PRETTY=true` con `NODE_ENV=production`                    | Fail-fast al boot con mensaje.    |
| NT-03 | `LOG_INCLUDE_PII=true` con `NODE_ENV=test` o `production`      | Fail-fast al boot con mensaje.    |
| NT-04 | Sin `SERVICE_VERSION` ni `package.json.version`                | Fail-fast al boot.                 |

### Smoke Tests

* Smoke-01: contenedor Docker con `NODE_ENV=production LOG_LEVEL=info SERVICE_VERSION=1.0.0`; verifica que el primer log al arranque es JSON válido con los campos base.
* Smoke-02: contenedor con `NODE_ENV=development LOG_PRETTY=true`; verifica salida pretty-print legible.

### CI Checks

* Lint, type-check, tests.
* Cobertura ≥ 80% en `src/infrastructure/logger/*` y `src/shared/context/*` por criticidad de seguridad.

---

## 14. Observability & Audit

### Logs

* El logger ES la observabilidad. Smoke tests validan.

### Correlation ID

* Propagado via AsyncLocalStorage (D4).

### AdminAction

`No aplica`.

### Error Tracking

* Errores fatales del logger propagan al middleware estándar de Express.

### Metrics

* Sin métricas dedicadas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

`No aplica`.

### Demo Scenario Supported

* `docker logs <container> | jq` muestra JSON estructurado para demo académico.

### Reset / Isolation Notes

`No aplica`.

---

## 16. Documentation Alignment Required

| Document / Source     | Conflict                    | Current Decision                                       | Recommended Action                                                    | Blocks Implementation? |
| --------------------- | --------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------- |
| PB-P2-010 Traceability | Sin IDs canónicos explícitos. | US-113 refinada declara IDs.                            | Ampliar Traceability con NFR-OBS-004/005/006, NFR-PRIV-004, ADRs.    | No                     |

Nota: no hay conflictos con `docs/14, docs/22, docs/10, docs/19`. US-113 sólo materializa lo declarado.

---

## 17. Technical Risks & Mitigations

| Risk                                                                          | Impact                                     | Mitigation                                                                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Redacción falla ante payload profundo                                          | PII/secrets filtrados en logs               | MAX_DEPTH=5; UT-07 con payload circular; REG-01 captura logs reales.                                                            |
| Regresión de consumidores existentes por cambio de shape                       | Rompimiento de contract con downstream      | AC-01 declara shape estable; contract test opcional.                                                                            |
| AsyncLocalStorage no propaga en callbacks async raros                          | correlationId perdido en logs              | UT-05, UT-06 explícitos; IT-01 con Supertest verifica end-to-end.                                                                |
| pino-pretty aumenta bundle en prod                                             | Bundle grande                               | `pino-pretty` como devDependency; `transport` guard en config con NODE_ENV.                                                     |
| Docker/AWS ECS no captura stdout correctamente                                | Logs perdidos en deploy                     | Smoke-01 en pipeline valida; NFR-OBS-006 asegura que stdout es enough.                                                          |
| Fail-fast excesivo al boot rompe deploys                                      | Downtime                                    | Mensajes de error claros; tests NT-01..NT-04 verifican; `.env.example` guía al operador.                                        |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / carpetas impactados

```
backend/
  src/
    config/
      env.ts                                              # extender con LOG_* schemas
    infrastructure/
      logger/
        pino-logger.ts                                    # nuevo
        pino-logger.spec.ts                               # nuevo
        redactors.ts                                       # nuevo
        redactors.spec.ts                                  # nuevo
      middleware/
        request-logger.middleware.ts                       # nuevo
        request-logger.middleware.spec.ts                  # nuevo
    shared/
      context/
        correlation-id.ts                                  # nuevo
      logger.ts                                            # nuevo (singleton export)
    app.ts                                                 # extender registro de middleware
  package.json                                              # dependencia pino + pino-pretty
  .env.example                                              # documentar LOG_LEVEL, LOG_PRETTY, LOG_INCLUDE_PII, SERVICE_VERSION
tests/
  integration/
    logger-request.spec.ts                                  # IT-01
    logger-job.spec.ts                                      # IT-02
  regression/
    logger-consumers.spec.ts                                # REG-01
    logger-headers.spec.ts                                  # REG-02
  smoke/
    docker-log-output.spec.sh                               # Smoke-01, Smoke-02 (bash o similar)
```

### Orden de implementación recomendado

1. `src/config/env.ts` extendido con Zod + fail-fast + UT.
2. `src/shared/context/correlation-id.ts` AsyncLocalStorage + UT.
3. `src/infrastructure/logger/redactors.ts` + UT-03, UT-04, UT-08.
4. `src/infrastructure/logger/pino-logger.ts` + UT-01, UT-02, UT-05, UT-06, UT-07.
5. `src/shared/logger.ts` singleton export.
6. `src/infrastructure/middleware/request-logger.middleware.ts` + UT.
7. Registrar middleware en `app.ts` (después del correlation-id middleware si US-114 ya está mergeado; sino se salta).
8. IT-01, IT-02.
9. REG-01, REG-02.
10. NT-01..NT-04.
11. Smoke-01, Smoke-02 (pipeline CI).
12. `.env.example` documentación.
13. Documentation Alignment PB-P2-010 Traceability.

### Decisiones que no deben reabrirse

* Pino (D1).
* Shape JSON estable (D2).
* Sets fijos de redacción (D3).
* AsyncLocalStorage (D4).
* Stdout único (D5).
* Env vars con fail-fast (D6).

### Lo que no se debe implementar

* File transport / log rotation.
* APM/ELK/tracing.
* Redacción configurable en runtime.
* Cambios a middlewares upstream (correlation → US-114) o downstream (auth, etc.).
* Cambios frontend.

### Asunciones a preservar

* PB-P0-002 provee `app.ts` y orden de middlewares.
* `env.ts` existe y se extiende (no se reescribe).
* US-114 puede o no estar mergeada — el logger coexiste con ambos escenarios.

---

## 19. Task Generation Notes

### Suggested task groups

1. Config env + Zod + fail-fast.
2. Correlation context (AsyncLocalStorage).
3. Redactors (secrets + PII + headers).
4. Pino logger instance + singleton export.
5. Request logger middleware.
6. Bootstrap wiring en `app.ts`.
7. Testing UT + IT + REG + NT + Smoke.
8. Documentación (`.env.example` + Traceability).

### Required QA tasks

* UT × 8, IT × 2, REG × 2, NT × 4, Smoke × 2.

### Required security tasks

* REG-01, REG-02 son los tests de seguridad críticos; sin necesidad de tarea SEC dedicada (regresión cubre).

### Required seed/demo tasks

`No aplica`.

### Required documentation tasks

* 1 ítem (Traceability PB-P2-010).
* Documentar env vars en `.env.example`.

### Dependencies between tasks

```
env.ts → correlation-id → redactors → pino-logger → shared/logger → middleware → app.ts wire
                              ↓                          ↓                            ↓
                             UT                          UT                          IT + REG + Smoke
```

### Consolidated tasks.md guidance

Opcional: PB-P2-010 tiene una sola US.

---

## 20. Technical Spec Readiness

| Check                                                    | Status |
| -------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec | Pass   |
| Product Backlog mapping found                            | Pass   |
| Decision Resolution reviewed if present                  | Pass   |
| Scope clear                                              | Pass   |
| Architecture alignment clear                             | Pass   |
| API impact clear                                         | N/A    |
| DB impact clear                                          | N/A    |
| AI impact clear                                          | N/A    |
| Security impact clear                                    | Pass   |
| Testing strategy clear                                   | Pass   |
| Ready for Development Task Breakdown                     | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

D1–D6 materializadas con paths canónicos (`src/infrastructure/logger/*`, `src/shared/context/*`, `src/shared/logger.ts`, `src/config/env.ts`, `src/infrastructure/middleware/request-logger.middleware.ts`). Coexistencia explícita con US-114. Foco de testing en fail-fast y regresión de seguridad (REG-01/REG-02 con captura de logs de US-034/068..072). 1 alineación documental menor (Traceability PB-P2-010) no bloqueante.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-010/US-113-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-010
Execution Order: 10 (décimo ítem de P2)
Next step: Run `eventflow-user-story-to-development-tasks`.

Product Backlog mapping: Found (PB-P2-010, P2, posición 1 de 1).
Decision Resolution artifact used: Yes.
Documentation alignment warnings: 1 ítem no bloqueante (§16).
