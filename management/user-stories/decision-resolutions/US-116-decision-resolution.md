# Decision Resolution — US-116

## Metadata

| Campo               | Valor                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| User Story ID       | US-116                                                                   |
| Título              | Endpoint healthcheck y readiness                                         |
| Fecha resolución    | 2026-07-07                                                               |
| Resolutor           | PO / BA (Decision Resolver)                                              |
| Source Review       | `management/user-stories/refinement-reviews/US-116-refinement-review.md`  |
| Estado              | Resolved                                                                 |

---

## 1. Decisiones preexistentes de Product Owner

### D0 — Endpoints públicos anónimos con contrato definido en `docs/16 §21`

- **Fuente**: `docs/16-API-Design-Specification.md §21` (Health API) + `docs/21 §10.4 & §32.2` + `ADR-DEVOPS-003`.
- **Contenido**:
  - Endpoints anonymous (sin auth, sin sesión, sin CSRF).
  - Paths, DTOs, roles y semántica ya publicados.
  - `X-Correlation-Id` NO requerido en request ni response.
- **Estatus**: Vigente, aplicable a esta historia sin cambios.

---

## 2. Resolución de blockers

Cada resolución identifica: **Tipo** (Documentation Match / Documentation Derived / Tech Recommendation), **Decisión aplicada**, **Fuente autoritativa**, e **Impacto en la User Story**.

### D1 — Paths canónicos (Q1)

- **Tipo**: Documentation Match.
- **Decisión**: Los paths canónicos son:
  - `GET /health` — healthcheck (proceso vivo).
  - `GET /health/ready` — readiness (dependencias).
- **Fuente**: `docs/16 §21.2` (contract oficial), `docs/21 §10.4/§32.2`, `ADR-DEVOPS-003`.
- **Impacto**: Descarta `/healthz` y `/readyz` del texto original de US-116. Rewrite mandatorio.
- **Nota**: Se ofrece alias opcional `GET /healthz` → 301 hacia `/health` sólo si operaciones AWS lo pide en futuro. NO se implementa en MVP.

### D2 — Dependencias verificadas en readiness (Q2)

- **Tipo**: Tech Recommendation.
- **Decisión**: `/health/ready` verifica ÚNICAMENTE `postgres` (via `SELECT 1`). El campo `aiProvider` del DTO en `docs/16 §21.3` se reporta desde configuración (`process.env.LLM_PROVIDER`) SIN llamar al proveedor externo. Valores posibles: `"ok"` (openai configurado con API key presente), `"mock"` (MockAIProvider activo), `"down"` (openai configurado sin API key).
- **Fuente**: `docs/16 §21.3` (DTO), NFR-PERF-001 (P95 <1.5s), NFR-DEPLOY-003 (mock sin llaves).
- **Justificación**: Probes externos al LLM en cada readiness introducirían latencia, costo y rate-limit; NO existe requisito de rechazar tráfico cuando LLM está down (features IA tienen fallback via BR-AI-007).
- **Impacto**: readiness lightweight; check DB determina 200/503; check AI es reporte diagnóstico sin afectar HTTP status.

### D3 — Envelope de respuesta (Q3)

- **Tipo**: Documentation Match.
- **Decisión**: La respuesta de `/health` y `/health/ready` se emite PLANA (según DTO en `docs/16 §21.3`), SIN envelope `{ data, meta.correlationId }` de US-114.
- **Fuente**: `docs/16 §21.3` (DTO explícito) + `docs/16 §21.4` ("No requiere `X-Correlation-Id` ni sesión.").
- **Impacto**: Endpoints usan handler dedicado que retorna directamente el DTO. Middleware de correlación se registra DESPUÉS de las rutas `/health*` o con exclusión explícita.

### D4 — Fuente del campo `version` (Q4)

- **Tipo**: Tech Recommendation.
- **Decisión**: `version` se resuelve por precedencia:
  1. `process.env.APP_VERSION` (inyectada por CI/CD desde tag/SHA).
  2. Fallback: valor `"version"` de `package.json` leído una sola vez al arrancar.
  3. Fallback final: `"unknown"` si ambas fuentes fallan.
- **Fuente**: NFR-DEPLOY-* (readiness de despliegue) + práctica estándar en despliegues Docker.
- **Justificación**: `APP_VERSION` permite trazar rollbacks precisos; `package.json` sirve para dev local.
- **Impacto**: Definir `getAppVersion()` util en `src/shared/config/app-version.ts`.

### D5 — Timeout de DB check (Q5)

- **Tipo**: Tech Recommendation.
- **Decisión**: Timeout de `SELECT 1` en readiness = **500 ms** (hard cap). Superado → dependencia `postgres: "down"` y HTTP 503.
- **Fuente**: NFR-PERF-001 (P95 <1.5s), best practice para healthchecks (< 1s total).
- **Impacto**: Implementar con `Promise.race([prisma.$queryRaw`SELECT 1`, timeout(500)])`.

### D6 — Semántica HTTP status en readiness (Q6)

- **Tipo**: Tech Recommendation.
- **Decisión**:
  - **`status: "ok"` + HTTP 200** → DB OK y `aiProvider ∈ {"ok", "mock"}`.
  - **`status: "degraded"` + HTTP 200** → DB OK pero `aiProvider: "down"` (openai configurado sin key). NO se saca de rotación.
  - **`status: "error"` + HTTP 503** → DB down (`postgres: "down"`).
- **Fuente**: `docs/16 §21.3` (`"ok" | "degraded" | "error"`), balanceadores estándar (503 = out-of-rotation).
- **Justificación**: LLM down NO impide operación core (features IA usan fallback per BR-AI-007/010). DB down SÍ impide operación core.
- **Impacto**: Único disparador de 503 es `postgres: "down"`.

### D7 — Logging de probes (Q7)

- **Tipo**: Tech Recommendation.
- **Decisión**: Los endpoints de health se registran con logging condicional:
  - **Success** (`GET /health` o `/health/ready` 200): NO se loggea (evita ruido en CloudWatch).
  - **Fallo/503** (`/health/ready` con dependencia down): SÍ se loggea a nivel `warn` con detalle de dependencia + latencia del check.
  - **Excepciones** (5xx inesperados): SÍ se loggea a nivel `error`.
- **Fuente**: NFR-OBS-006 (stdout suficiente) + costo CloudWatch + señal:ruido.
- **Impacto**: Handlers implementan bypass del logger success de US-113 (pino) mediante flag `skipAccessLog: true` en el router o via matcher en el logger middleware.

### D8 — Rate limiting (Q8)

- **Tipo**: Tech Recommendation.
- **Decisión**: Endpoints `/health` y `/health/ready` quedan **exentos del rate limiter global**. App Runner probes cada ~10s + monitoreo externo no deben ser bloqueados. La exención se documenta en el módulo `rate-limit.middleware.ts`.
- **Fuente**: Práctica estándar para healthchecks + `docs/16 §21.4`.
- **Impacto**: Whitelist explícita en middleware de rate limiting.

### D9 — Exención de middlewares (Q9)

- **Tipo**: Documentation Match + Tech Recommendation.
- **Decisión**: Los endpoints `/health` y `/health/ready` se exceptúan explícitamente de:
  - `sessionGuard` / auth middleware.
  - `csrfProtection` middleware.
  - `correlationId` middleware (opcional; puede aplicarse sin propagar a response).
  - `rateLimiter` global (D8).
- **Fuente**: `docs/16 §21.4` + práctica estándar.
- **Impacto**: Se registran los health handlers ANTES del stack de middlewares protegidos, o con exclusión path-based explícita.

---

## 3. Documentation Alignments requeridos

| # | Documento                                    | Acción                                                                                                                    | Prioridad |
| - | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------- |
| A1 | `management/artifacts/1-EventFlow-Epic-Map.md` §17.7 | Actualizar entrada `EPIC-OBS-001` para reflejar paths `/health` y `/health/ready` (no `/healthz`, `/readyz`).            | Should    |
| A2 | `management/artifacts/2-User-Stories-Coverage-Matrix.md` | Actualizar fila US-116: cambiar `/healthz /readyz` a `/health /health/ready`.                                     | Should    |
| A3 | `docs/22-Architecture-Decision-Records.md` (ADR-API-004) | Agregar nota: exención de `X-Correlation-Id` para `/health*` per `docs/16 §21.4`.                                | Should    |

Ninguno bloquea la aprobación de US-116.

---

## 4. Registro de Recomendaciones Técnicas

| # | Decisión                                              | Tipo                    | Confirmación PO requerida |
| - | ----------------------------------------------------- | ----------------------- | ------------------------- |
| D0 | Endpoints públicos anónimos con contrato en docs/16 §21 | Preexistente             | No                        |
| D1 | Paths `/health`, `/health/ready`                       | Documentation Match      | No                        |
| D2 | Deps readiness: sólo DB (aiProvider por config)        | Tech Recommendation      | No                        |
| D3 | Response plana (sin envelope US-114)                    | Documentation Match      | No                        |
| D4 | `version` por precedencia APP_VERSION → package.json    | Tech Recommendation      | No                        |
| D5 | Timeout DB check 500ms                                  | Tech Recommendation      | No                        |
| D6 | 503 sólo si DB down; degraded=200 si LLM down          | Tech Recommendation      | No                        |
| D7 | Log condicional: success no, fallos sí                  | Tech Recommendation      | No                        |
| D8 | Exención rate limiter                                   | Tech Recommendation      | No                        |
| D9 | Exención session/CSRF                                   | Documentation Match      | No                        |

---

## 5. Estado post-resolución

- **Blocking questions resueltas**: 9 de 9.
- **Blocking questions pendientes**: 0.
- **Documentation alignments**: 3 (no bloqueantes).
- **Próximo paso**: revalidar refinement review → aprobar US-116 → generar Technical Specification.
