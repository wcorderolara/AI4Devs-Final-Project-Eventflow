# Technical Specification — US-114: Correlation ID propagation (X-Correlation-Id)

## 1. Metadata

| Field                                | Value                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-114                                                                                              |
| Source User Story                    | `management/user-stories/US-114-correlation-id-propagation.md`                                      |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-114-decision-resolution.md`                        |
| Priority                             | P2 (Should Have)                                                                                    |
| Backlog ID                           | PB-P2-011                                                                                           |
| Backlog Title                        | Correlation IDs end-to-end                                                                           |
| Backlog Execution Order              | 11 (undécimo ítem de P2)                                                                            |
| User Story Position in Backlog Item  | 1 de 1                                                                                              |
| Related User Stories in Backlog Item | US-114                                                                                              |
| Epic                                 | EPIC-OBS-001                                                                                        |
| Backlog Item Dependencies            | PB-P2-010 (US-113 Approved)                                                                         |
| Feature                              | Correlation ID por request (X-Correlation-Id, UUID v4) end-to-end                                    |
| Module / Domain                      | Platform / Observability                                                                             |
| User Story Status                    | Approved with Minor Notes                                                                           |
| Backlog Alignment Status             | Found                                                                                               |
| Technical Spec Status                | Ready for Task Breakdown                                                                            |
| Created Date                         | 2026-07-07                                                                                          |
| Last Updated                         | 2026-07-07                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-011 — Correlation IDs end-to-end** (P2, Should Have). Depende de PB-P2-010 (US-113 Approved). Materializa `docs/22 §ADR-API-004` con propagación cross-capa: request → context → log → response header + body envelope → error → `ai_recommendations`.

### Execution Order Rationale

Se implementa **simultáneamente o antes** de US-113 (Approved) para evitar la ventana donde el logger emite `correlationId=null` en todas las requests. Coexistencia con US-113 explícitamente diseñada (US-114 D5). Downstream: US-034 (patrón job con `generateCorrelationId`), US-115 (métricas IA escribe `correlation_id`), US-116 (healthcheck via logger).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                        | Suggested Order |
| ---------- | ------------------------------------------- | --------------- |
| US-114     | OWNER del middleware + envelope + fetch client | 1               |

---

## 3. Executive Technical Summary

Implementar la infraestructura de correlation ID cross-capa:

**Backend**:

1. `src/shared/validation/correlation-id.schema.ts` — Zod schema UUID v4 strict.
2. Extender `src/shared/context/correlation-id.ts` (creado por US-113) con `generateCorrelationId(prefix?)` helper (D7).
3. `src/infrastructure/middleware/correlation-id.middleware.ts` — OWNER del middleware: read-or-generate + validar + response header echo + `correlationContext.run(...)` (D1, D2, D3, D5).
4. `src/shared/http/response.ts` — extender o crear helpers `respond.success` / `respond.error` para inyectar `meta.correlationId` / `error.correlationId` desde `correlationContext.getStore()` (D4).
5. Extender `error.handler.middleware.ts` (existente en PB-P0-002) para leer `correlationContext` e inyectar `error.correlationId`.
6. Wire en `app.ts`: US-114 middleware ANTES que US-113 `requestLogger`.

**Frontend**:

7. `apps/web/lib/api/client.ts` — fetch interceptor global adjunta `X-Correlation-Id: crypto.randomUUID()` por outbound request (D6). Ratificar path y librería base (`fetch` nativo vs `ky`) durante implementación consultando `docs/15 §Frontend Architecture`.

Sin migración. Sin cambios al schema `ai_recommendations` (columna `correlation_id` YA existe). Sin nuevas dependencias.

---

## 4. Scope Boundary

### In Scope

* Backend: middleware, Zod schema, helper `generateCorrelationId`, extensión de envelope helpers, integración con error handler, wire en `app.ts`.
* Frontend: fetch interceptor global.
* Testing: UT + IT (invariante header==body==log) + E2E + Contract MSW + Smoke Docker + NT.
* Documentation Alignment: 2 ítems.

### Out of Scope

* OpenTelemetry / distributed tracing (rechazado ADR-API-004).
* Session-scoped ID persistence en frontend (Future).
* WebSocket / SSE correlation.
* Cambios al schema `ai_recommendations`.
* Cambios al schema Prisma.
* Cambios al `NotificationLinkResolver` u otros use cases.
* Cambios frontend UI visibles.
* Nuevas dependencias externas.

### Explicit Non-Goals

* Modificar `docs/22 §ADR-API-004`, `docs/16 §envelope`, `docs/18 §ai_rec` (US-114 sólo materializa).
* Alterar el orden de middlewares definido por PB-P0-002 (sólo agregar US-114 en la posición correcta).
* Cambiar la firma existente de `correlationContext` de US-113 (retrocompatible).
* Introducir persistencia en localStorage/sessionStorage.

---

## 5. Architecture Alignment

### Backend Architecture

* Node.js + Express + TypeScript (`docs/14 §estructura`).
* Reuso 1:1 del singleton `correlationContext` de US-113.
* Reuso del error handler existente de PB-P0-002.
* Módulo transversal `platform/observability`.

### Frontend Architecture

* Next.js + TanStack Query (`docs/15`).
* Cliente API existente en `apps/web/lib/api/` (verificar convención durante implementación).
* Sin cambios a componentes; solo capa de red.

### Database Architecture

* Sin cambios. `ai_recommendations.correlation_id` YA existente (`docs/18 §110/§869/§1110`).

### API Architecture

* Middleware afecta transversalmente a TODOS los endpoints (`docs/16 §envelope`).
* Alineado con `ADR-API-004`.

### AI / PromptOps Architecture

`No aplica`.

### Security Architecture

* Alineado con `ADR-SEC-001` (Prevent Injection): validación UUID v4 strict.
* Header no es secret; sin redacción por logger de US-113.
* No cross-user leak: cada request contexto aislado (garantía AsyncLocalStorage).

### Testing Architecture

* Vitest + Supertest (backend).
* Vitest + Testing Library + MSW (frontend).
* Playwright (E2E).
* Contract test MSW alineado con PB-P2-015 / US-121.

---

## 6. Functional Interpretation

| Acceptance Criterion              | Technical Interpretation                                                                                          | Impacted Layer(s)               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| AC-01 — Sin header → generar      | Middleware: `crypto.randomUUID()` si header ausente.                                                                | Backend                         |
| AC-02 — Header válido → reuso     | Middleware: regex UUID v4 → reuso.                                                                                 | Backend                         |
| AC-03 — Header inválido → 400     | Zod schema → 400 con envelope de error + `error.correlationId` server-generated.                                    | Backend, Security               |
| AC-04 — Header echo en response   | Middleware: `res.setHeader('X-Correlation-Id', correlationId)` antes de `next()`.                                    | Backend                         |
| AC-05 — Success envelope meta      | `respond.success(...)` lee `correlationContext.getStore()`.                                                          | Backend                         |
| AC-06 — Error envelope error      | Error handler lee `correlationContext.getStore()` para `error.correlationId`.                                         | Backend                         |
| AC-07 — `getStore()` en handlers  | Middleware corre `correlationContext.run(...)`.                                                                     | Backend                         |
| AC-08 — Fetch interceptor         | Interceptor global genera y adjunta header por outbound request.                                                    | Frontend                        |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo transversal `platform/observability`.
* Comparte `src/shared/context/correlation-id.ts` con US-113 (Approved) — extensión, no duplicación.

### Use Cases / Application Services

* No aplica.

### Controllers / Routes

* No aplica (middleware transversal).

### DTOs / Schemas

* `correlation-id.schema.ts` (Zod strict UUID v4):
  ```ts
  import { z } from 'zod';
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  export const correlationIdSchema = z.string().regex(UUID_V4_REGEX, {
    message: 'X-Correlation-Id must be a valid UUID v4',
  });
  ```

### Repository / Persistence

* No aplica.

### Validation Rules

* VR-01..VR-05 aplicadas en middleware + envelope helpers.

### Error Handling

* Zod parse fail → throw `InvalidCorrelationIdError` capturado por el middleware que responde 400.
* Error handler downstream inyecta `error.correlationId` desde el contexto.

### Transactions

* No aplica.

### Observability

* Todo request loggeado por US-113 con el `correlationId` inyectado automáticamente (mixin).

### Detalle del middleware

```ts
// src/infrastructure/middleware/correlation-id.middleware.ts
import { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { correlationContext } from '../../shared/context/correlation-id';
import { correlationIdSchema } from '../../shared/validation/correlation-id.schema';

export const correlationIdMiddleware: RequestHandler = (req, res, next) => {
  const raw = req.header('X-Correlation-Id')?.trim();
  let correlationId: string;

  if (!raw) {
    correlationId = randomUUID();
  } else {
    const parsed = correlationIdSchema.safeParse(raw);
    if (!parsed.success) {
      // 400 fail-fast (D3)
      const serverGeneratedId = randomUUID();
      res.setHeader('X-Correlation-Id', serverGeneratedId);
      return res.status(400).json({
        error: {
          code: 'INVALID_CORRELATION_ID',
          message: 'X-Correlation-Id must be a valid UUID v4',
          correlationId: serverGeneratedId,
        },
      });
    }
    correlationId = parsed.data;
  }

  res.setHeader('X-Correlation-Id', correlationId);
  (req as any).correlationId = correlationId;
  correlationContext.run({ correlationId }, () => next());
};
```

### Detalle del helper `generateCorrelationId` (D7)

```ts
// src/shared/context/correlation-id.ts (extensión al singleton de US-113)
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export const correlationContext = new AsyncLocalStorage<{ correlationId: string }>();

export function getCorrelationId(): string | null {
  return correlationContext.getStore()?.correlationId ?? null;
}

// Nuevo en US-114 (D7)
export function generateCorrelationId(prefix?: string): string {
  const uuid = randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}
```

Uso en jobs (US-034 patrón):
```ts
const correlationId = generateCorrelationId('job-emit-t7');
correlationContext.run({ correlationId }, () => runJob());
```

### Detalle del envelope helper (D4)

```ts
// src/shared/http/response.ts (extender o crear)
import { Response } from 'express';
import { getCorrelationId } from '../context/correlation-id';

export const respond = {
  success: <T>(res: Response, data: T, status = 200) => {
    res.status(status).json({
      data,
      meta: {
        correlationId: getCorrelationId(),
        timestamp: new Date().toISOString(),
      },
    });
  },
  error: (res: Response, code: string, message: string, status: number) => {
    res.status(status).json({
      error: {
        code,
        message,
        correlationId: getCorrelationId(),
      },
    });
  },
};
```

### Detalle de la integración con el error handler existente

```ts
// src/infrastructure/middleware/error.handler.middleware.ts (extender existente PB-P0-002)
import { ErrorRequestHandler } from 'express';
import { getCorrelationId } from '../../shared/context/correlation-id';
import logger from '../../shared/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const correlationId = getCorrelationId();
  logger.error({ err, correlationId }, 'unhandled error');
  res.status(err.status ?? 500).json({
    error: {
      code: err.code ?? 'INTERNAL_SERVER_ERROR',
      message: err.message ?? 'Internal server error',
      correlationId,
    },
  });
};
```

### Wire en `app.ts`

```ts
// src/app.ts (extender existente PB-P0-002)
import express from 'express';
import { correlationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware';
import { requestLogger } from './infrastructure/middleware/request-logger.middleware'; // US-113
// ... otros middlewares

const app = express();
app.use(correlationIdMiddleware);  // US-114 OWNER — primero
app.use(requestLogger);             // US-113 CONSUME — segundo
// ... auth, role, ownership, validation, rate limit, captcha, upload
// ... rutas
app.use(errorHandler);              // último
```

---

## 8. Frontend Technical Design

### Routes / Pages

* No aplica (transversal a todos los cliente API).

### Components

* No aplica.

### Forms

* No aplica.

### State Management

* No aplica (network layer).

### Data Fetching

* Fetch interceptor global en `apps/web/lib/api/client.ts` (verificar path exacto durante implementación consultando `docs/15 §Frontend Architecture` y convención existente en `apps/web/lib/api/`).

### Ejemplo con fetch nativo

```ts
// apps/web/lib/api/client.ts
export async function apiFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const headers = new Headers(init.headers);
  headers.set('X-Correlation-Id', correlationId);
  return fetch(input, { ...init, headers });
}
```

### Ejemplo con `ky` (si el proyecto lo usa)

```ts
// apps/web/lib/api/client.ts
import ky from 'ky';

export const apiClient = ky.create({
  hooks: {
    beforeRequest: [
      (req) => {
        req.headers.set('X-Correlation-Id', crypto.randomUUID());
      },
    ],
  },
});
```

**Nota**: durante la implementación, el Tech Lead ratifica la librería base (D6 Tech Recommendation) y el path exacto.

### Loading / Empty / Error / Success States

* No aplica (transparente al usuario).

### Accessibility

* No aplica.

### i18n

* No aplica.

---

## 9. API Contract Design

Sin cambios al catálogo de endpoints. El middleware afecta transversalmente:

* Request: header opcional `X-Correlation-Id: <uuid v4>`.
* Response (todas): header `X-Correlation-Id: <uuid v4>`.
* Response body success (2xx): `meta.correlationId: <uuid v4>` (per `docs/16 §426`).
* Response body error (4xx/5xx): `error.correlationId: <uuid v4>` (per `docs/16 §652/§653`).
* Response body 400 `INVALID_CORRELATION_ID` (nuevo): envelope de error con code + message + server-generated correlationId.

Documentation Alignment: agregar entrada en `docs/16` sección de "errores comunes" para `INVALID_CORRELATION_ID`.

---

## 10. Database / Prisma Design

### Models Impacted

`No aplica`.

`ai_recommendations.correlation_id` YA existe en el schema (`docs/18 §110`); no requiere cambio en US-114. US-115 lo escribe.

### Fields / Columns

Sin cambios.

### Relations

Sin cambios.

### Indexes

`idx_ai_rec_correlation_id` YA existe (`docs/18 §869/§1110`).

### Constraints

Sin cambios.

### Migrations Impact

**Cero migraciones.**

### Seed Impact

* No aplica.

---

## 11. AI / PromptOps Design

`No aplica`. US-115 consume `correlation_id` desde el contexto.

---

## 12. Security & Authorization Design

### Authentication

`No aplica` (middleware antes de auth).

### Authorization

`No aplica`.

### Ownership Rules

`No aplica`.

### Role Rules

`No aplica`.

### Negative Authorization Scenarios

* Header inválido → 400 (defensa injection, alineado ADR-SEC-001).
* Falta header en response → contract test rojo en CI.

### Audit Requirements

* Correlation ID es la piedra angular de la auditoría (docs/22 §ADR-API-004).

### Sensitive Data Handling

* Header `X-Correlation-Id` no es secret; no requiere redacción por logger de US-113.
* El ID inválido del cliente NUNCA se propaga (SEC-04).
* Sin persistencia cross-user (SEC-03 garantizado por AsyncLocalStorage).

---

## 13. Testing Strategy

### Unit Tests

* UT-01: sin header → middleware genera UUID v4, setea response header, ejecuta `correlationContext.run(...)`.
* UT-02: header UUID v4 válido → middleware reusa, setea response header.
* UT-03: header inválido → 400 con envelope de error y `error.correlationId` server-generated (distinto del cliente).
* UT-04: header vacío (`X-Correlation-Id:` o `X-Correlation-Id:   `) → trata como ausente → genera nuevo.
* UT-05: header con UUID v1 → rechaza (regex v4-strict).
* UT-06: `generateCorrelationId()` retorna UUID v4; `generateCorrelationId('job-emit-t7')` retorna prefijado.
* UT-07 (frontend): fetch interceptor adjunta `X-Correlation-Id: <uuid v4>` en outbound request.
* UT-08 (frontend): cliente puede acceder al `X-Correlation-Id` del response.

### Integration Tests (críticos por invariante)

* IT-01: request a endpoint real → response header `X-Correlation-Id` == body `meta.correlationId` == log emitido (via US-113). Invariante header==body==log.
* IT-02: header inválido → response 400 con `error.correlationId` server-generated (no el inválido del cliente).
* IT-03: concurrencia — 10 requests paralelos → cada uno tiene su propio ID en su log; sin cross-contamination.

### API Tests

Cubiertos por IT-01, IT-02.

### E2E Tests

* E2E-01 (Playwright): usuario ejecuta acción → fetch outbound genera UUID v4 → backend recibe → response echoed → verificar en network tab.

### Security Tests

* SEC-T-01: header inválido con payload de injection (`<script>...`, `'; DROP TABLE ...`) → 400 antes de que llegue a los handlers (defensa ADR-SEC-001).

### Accessibility Tests

`No aplica`.

### AI Tests

`No aplica`.

### Seed / Demo Tests

* SEED-T-01 (opcional): correr smoke Docker; verificar que headers están presentes.

### Contract Tests

* Contract MSW: fixtures de respuestas exitosas y de error deben incluir `meta.correlationId` / `error.correlationId`. Alineado con US-121 / PB-P2-015.

### Smoke Tests

* Smoke-01: `curl -H "X-Correlation-Id: <valid-uuid>" http://localhost:3000/healthz` → verifica response header con mismo ID + body con `meta.correlationId` con mismo ID.
* Smoke-02: `curl http://localhost:3000/healthz` (sin header) → verifica response header con UUID v4 nuevo generado.
* Smoke-03: `curl -H "X-Correlation-Id: garbage" http://localhost:3000/healthz` → 400 con `error.correlationId` server-generated.

### CI Checks

* Lint, type-check, tests.
* Cobertura ≥ 80% en `src/infrastructure/middleware/correlation-id.middleware.ts` y `src/shared/http/response.ts` por criticidad.

---

## 14. Observability & Audit

### Logs

* El logger de US-113 auto-inyecta el `correlationId` en TODAS las líneas (via `mixin`). US-114 sólo asegura que el ID esté en el contexto.

### Correlation ID

* US-114 ES la fuente.

### AdminAction

`No aplica`.

### Error Tracking

* Errores 5xx propagan al error handler que inyecta `error.correlationId`.

### Metrics

* Sin métricas dedicadas.

---

## 15. Seed / Demo Data Impact

`No aplica`.

Demo Scenario: `curl` cross-capa demostrable en el smoke test.

---

## 16. Documentation Alignment Required

| Document / Source     | Conflict                                                | Current Decision                                        | Recommended Action                                                                | Blocks Implementation? |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------- |
| PB-P2-011 Traceability | Sin IDs canónicos.                                       | US-114 refinada declara.                                | Ampliar Traceability con ADR-API-004 primario + NFR-OBS-006 + ADR-SEC-001/DEVOPS-001. | No                     |
| `docs/15 §Frontend`   | Verificar si menciona fetch interceptor explícitamente.  | D6 requiere el interceptor.                              | Si `docs/15` no lo declara, agregar sección "Correlation ID Propagation".         | No                     |
| `docs/16` errores      | `INVALID_CORRELATION_ID` código nuevo.                    | US-114 lo introduce.                                    | Agregar entrada en `docs/16 §errores comunes` con code + status 400.               | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                             | Impact                                       | Mitigation                                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Middleware US-114 registrado después de US-113 → logger sin ID  | Todos los logs con `correlationId=null`      | Test IT-01 verifica invariante header==body==log; documentado en both stories el orden correcto.               |
| Zod validación falla para casos edge (whitespace, casing)         | Falsos positivos → 400 legítimos rechazados  | UT-04 (whitespace), UT-05 (v1); trim + case-insensitive regex.                                                  |
| Envelope helper NO existe en PB-P0-002 base                       | Task adicional para crearlo                  | Tech Lead verifica durante implementación; si no existe, US-114 lo crea con requisitos mínimos.                 |
| Cliente `fetch` vs `ky` no ratificado                             | Task frontend requiere refactor              | D6 Tech Recommendation con validation Tech Lead; consultar `docs/15` + convención existente.                     |
| Session-scoped tracking demandado post-launch                     | Refactor mayor                               | MVP request-scoped; Future US puede agregar session sin romper contrato (backward compatible).                  |
| `crypto.randomUUID()` no disponible (browser antiguo)             | Fetch sin `X-Correlation-Id`                 | MVP scope soporta browsers modernos (Chrome/Firefox/Safari); documentado en `docs/3 §MVP Scope Definition`.     |
| Error handler existente no lee del contexto                       | `error.correlationId` null en 5xx            | Task explícito de integrar error handler con `getCorrelationId()`.                                             |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / carpetas impactados

```
backend/
  src/
    shared/
      context/
        correlation-id.ts                                  # extender (helper generateCorrelationId)
      validation/
        correlation-id.schema.ts                           # nuevo (Zod UUID v4)
      http/
        response.ts                                        # extender/crear (respond.success/error)
    infrastructure/
      middleware/
        correlation-id.middleware.ts                       # nuevo
        correlation-id.middleware.spec.ts                  # nuevo
        error.handler.middleware.ts                        # extender (leer contexto)
    app.ts                                                 # extender wire

apps/web/
  lib/
    api/
      client.ts                                            # extender/crear con interceptor

tests/
  integration/
    correlation-id-invariant.spec.ts                       # IT-01
    correlation-id-400.spec.ts                             # IT-02
    correlation-id-concurrency.spec.ts                     # IT-03
  e2e/
    correlation-id-e2e.spec.ts                             # E2E-01
  contract/
    correlation-id-envelope.contract.spec.ts               # Contract MSW
  smoke/
    correlation-id-curl.spec.sh                            # Smoke-01..Smoke-03
```

### Orden de implementación recomendado

1. Backend: `correlation-id.schema.ts` + UT.
2. Backend: extender `src/shared/context/correlation-id.ts` con `generateCorrelationId` + UT.
3. Backend: extender/crear `src/shared/http/response.ts` con `respond.success/error` + UT.
4. Backend: implementar `correlation-id.middleware.ts` + UT-01..UT-05.
5. Backend: extender `error.handler.middleware.ts` para leer `getCorrelationId()`.
6. Backend: wire en `app.ts` en el orden correcto (ANTES de US-113 requestLogger).
7. Backend: IT-01 (invariante crítico), IT-02, IT-03.
8. Backend: Contract test MSW.
9. Backend: Smoke tests curl.
10. Frontend: interceptor en `apps/web/lib/api/client.ts` + UT-07, UT-08.
11. Frontend: E2E-01.
12. Documentation Alignment (Traceability + docs/15 opcional + docs/16 error code).

### Decisiones que no deben reabrirse

* UUID v4 nativo (D1).
* Header `X-Correlation-Id` canonical (D2).
* Read-or-generate + 400 fail-fast (D3).
* Envelope canonical con invariante header==body (D4).
* Reuso 1:1 del singleton de US-113 (D5).
* Fetch interceptor con `crypto.randomUUID()` (D6).
* Helper `generateCorrelationId(prefix?)` (D7).

### Lo que no se debe implementar

* OpenTelemetry / distributed tracing.
* Session-scoped ID persistence.
* WebSocket correlation.
* Cambios al schema `ai_recommendations`.
* Cambios a otros middlewares upstream/downstream (auth, role, etc.).
* Cambios a UI visible.

### Asunciones a preservar

* US-113 mergeada o coexistente; `correlationContext` singleton disponible.
* Node.js 20+.
* Web Crypto API en browsers modernos.
* PB-P0-002 provee `app.ts` y orden de middlewares (extender, no reescribir).

---

## 19. Task Generation Notes

### Suggested task groups

1. Zod schema + `generateCorrelationId` helper.
2. `respond.success/error` envelope helpers.
3. `correlation-id.middleware.ts`.
4. Extensión `error.handler.middleware.ts`.
5. Wire en `app.ts`.
6. Frontend fetch interceptor.
7. Testing UT + IT + E2E + Contract + Smoke.
8. Documentation Alignment.

### Required QA tasks

* UT × 8 (backend + frontend).
* IT × 3 (invariante crítico + concurrencia).
* E2E × 1.
* Contract × 1.
* Smoke × 3.
* NT × 4.
* SEC-T-01 (injection defense).

### Required security tasks

* SEC-T-01 dedicado (injection); resto cubierto por UT.

### Required seed/demo tasks

* No aplica (Smoke tests demuestran el flujo).

### Required documentation tasks

* 3 ítems.

### Dependencies between tasks

```
schema + helper → middleware → wire → IT + Smoke
envelope helper → middleware + error handler → IT
frontend interceptor → E2E
```

### Consolidated tasks.md guidance

Opcional: PB-P2-011 tiene una sola US.

---

## 20. Technical Spec Readiness

| Check                                                    | Status |
| -------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec | Pass   |
| Product Backlog mapping found                            | Pass   |
| Decision Resolution reviewed if present                  | Pass   |
| Scope clear                                              | Pass   |
| Architecture alignment clear                             | Pass   |
| API impact clear                                         | Pass   |
| DB impact clear                                          | N/A (sin migración; columna existente) |
| AI impact clear                                          | N/A    |
| Security impact clear                                    | Pass   |
| Testing strategy clear                                   | Pass   |
| Ready for Development Task Breakdown                     | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

D1–D7 materializadas con paths canónicos y coordinación explícita con US-113 (Approved). Testing multi-capa con foco en la invariante header==body==log (IT-01 crítico) y defensa de injection (SEC-T-01 con Zod strict). Sin migración; `ai_recommendations.correlation_id` YA existente. 3 alineaciones documentales menores no bloqueantes.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-011/US-114-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-011
Execution Order: 11 (undécimo ítem de P2)
Next step: Run `eventflow-user-story-to-development-tasks`.

Product Backlog mapping: Found (PB-P2-011, P2, posición 1 de 1).
Decision Resolution artifact used: Yes.
Documentation alignment warnings: 3 ítems no bloqueantes (§16).
