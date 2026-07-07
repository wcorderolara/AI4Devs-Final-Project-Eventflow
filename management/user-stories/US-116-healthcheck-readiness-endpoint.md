# 🧾 User Story: Endpoint healthcheck y readiness

## 🆔 Metadata

| Field                    | Value                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| ID                       | US-116                                                                                     |
| Epic                     | EPIC-OBS-001                                                                               |
| Feature                  | Health + readiness endpoints                                                               |
| Module / Domain          | Platform / Observability (`platform/health`)                                              |
| User Role                | System (App Runner / monitoreo / probes externos)                                          |
| Priority                 | Should Have                                                                                |
| Status                   | Approved with Minor Notes                                                                  |
| Owner                    | Product Owner / Business Analyst                                                           |
| Sprint / Milestone       | MVP                                                                                        |
| Backlog ID               | PB-P2-013                                                                                  |
| Created Date             | 2026-06-09                                                                                 |
| Last Updated             | 2026-07-07                                                                                 |
| Approval Date            | 2026-07-07                                                                                 |
| Approver                 | PO / BA                                                                                    |
| Refinement Review Path   | `management/user-stories/refinement-reviews/US-116-refinement-review.md`                    |
| Decision Resolution Path | `management/user-stories/decision-resolutions/US-116-decision-resolution.md`                |

---

## 🎯 User Story

**As the** sistema EventFlow (App Runner + monitoreo externo)
**I want** disponer de dos endpoints públicos `GET /health` y `GET /health/ready` que reporten estado del proceso y de dependencias críticas
**So that** el orquestador AWS App Runner pueda decidir si dirige tráfico al contenedor y el equipo pueda detectar rápidamente degradaciones sin exponer configuración interna.

---

## 🧠 Business Context

### Context Summary

Habilitar operaciones de despliegue confiables en AWS App Runner (ADR-DEVOPS-003) y facilitar diagnóstico en incidentes. Los endpoints son parte del contrato operativo definido en `docs/16 §21` y son referenciados por el checklist de readiness (`docs/21 §32.2`).

### Related Domain Concepts

- Proceso Node.js vivo (`process.uptime()`).
- Conexión a PostgreSQL (Prisma).
- Configuración de LLMProvider (openai vs mock).
- Versión de aplicación (build metadata).

### Assumptions

- El backend corre en un contenedor Node.js single-process (App Runner).
- Prisma ya está inicializado al momento de las probes (deployment gate).
- App Runner probe cada ~10 s configurado sobre `/health`.

### Dependencies

- **PB-P0-002** — Backend skeleton (Express + módulos + configuración base).
- **PB-P0-004** — Prisma configurado (para `SELECT 1`).
- Ninguna dependencia de US posteriores.

---

## 🔗 Traceability

| Source                 | Reference                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | —                                                                                             |
| Use Case(s)            | —                                                                                             |
| Business Rule(s)       | BR-PRIVACY-008 (no secretos en response)                                                      |
| Permission Rule(s)     | Rol System / anonymous público                                                                |
| Data Entity / Entities | —                                                                                             |
| API Endpoint(s)        | `GET /health`, `GET /health/ready`                                                            |
| NFR Reference(s)       | NFR-PERF-001, NFR-OBS-006, NFR-DEPLOY-001..005, NFR-PRIV-004                                  |
| Related ADR(s)         | ADR-DEVOPS-003 (App Runner), ADR-DEVOPS-007 (CloudWatch), ADR-API-004 (excepción `/health*`)  |
| Related Document(s)    | `/docs/13`, `/docs/14`, `/docs/16 §21`, `/docs/19`, `/docs/21 §10.4 & §32.2`, `/docs/22`      |

---

## 🧭 Scope Guardrails

### MVP Scope

- Scope Classification: In Scope
- MVP Relevance: Should Have

### Explicitly Out of Scope

- APM / OpenTelemetry / distributed tracing (NFR-OBS-006).
- Métricas Prometheus / /metrics endpoint.
- Alarmas CloudWatch específicas (fuera del scope de esta US; se abordan en `US-141` post-MVP).
- Autenticación en los endpoints.
- Probe activo al proveedor LLM externo.
- Endpoint `/live` o similar adicional.

### Scope Notes

- Contrato canonical proviene de `docs/16 §21` + decisiones D1..D9.

---

## ✅ Acceptance Criteria

### 🎯 Happy Path

#### AC-01: Healthcheck retorna 200 con DTO plano

**Given** el backend está corriendo
**When** un cliente realiza `GET /health`
**Then** la respuesta HTTP es `200` con body JSON exacto:

```json
{
  "status": "ok",
  "version": "<APP_VERSION o package.json version o \"unknown\">",
  "uptimeMs": <number>,
  "timestamp": "<ISO-8601>"
}
```

#### AC-02: Readiness retorna 200 con DTO extendido cuando DB está OK

**Given** el backend está corriendo y la DB está accesible
**When** un cliente realiza `GET /health/ready`
**Then** la respuesta HTTP es `200` con body JSON:

```json
{
  "status": "ok" | "degraded",
  "version": "<...>",
  "uptimeMs": <number>,
  "timestamp": "<ISO-8601>",
  "dependencies": {
    "postgres": "ok",
    "aiProvider": "ok" | "mock" | "down"
  }
}
```

`status = "ok"` si `aiProvider ∈ {"ok", "mock"}`; `status = "degraded"` si `aiProvider = "down"`. HTTP status en ambos casos = `200`.

#### AC-03: Readiness retorna 503 cuando DB está down

**Given** la DB no responde o `SELECT 1` supera 500 ms
**When** un cliente realiza `GET /health/ready`
**Then** la respuesta HTTP es `503` con body JSON:

```json
{
  "status": "error",
  "version": "<...>",
  "uptimeMs": <number>,
  "timestamp": "<ISO-8601>",
  "dependencies": {
    "postgres": "down",
    "aiProvider": "ok" | "mock" | "down"
  }
}
```

Y se registra log estructurado nivel `warn` con detalle: `event: "health.ready.dependency_down"`, `postgres: "down"`, `latencyMs: <ms>`.

#### AC-04: Endpoints son públicos (anonymous)

**Given** un cliente sin sesión y sin cookie
**When** realiza `GET /health` o `GET /health/ready`
**Then** obtiene respuesta correspondiente sin desafío 401/403 y sin necesidad de cookie ni CSRF token.

#### AC-05: Endpoints exentos de rate limiting

**Given** que el rate limiter global está configurado
**When** un cliente (probe / monitor) hace requests frecuentes a `/health*`
**Then** ninguna respuesta es `429`; el whitelist en rate limiter excluye `/health` y `/health/ready`.

#### AC-06: Endpoints exentos de correlation ID

**Given** el middleware `correlationId` (US-114) está activo
**When** un cliente realiza `GET /health` o `GET /health/ready` sin `X-Correlation-Id`
**Then** la response NO incluye header `X-Correlation-Id` y el body NO incluye `meta.correlationId`.

#### AC-07: Logging condicional

**Given** el logger backend está activo (US-113)
**When** un `GET /health` o `/health/ready` retorna 200
**Then** NO se emite log de acceso (bypass).
**When** un `/health/ready` retorna 503 o cualquier `/health*` lanza 5xx inesperado
**Then** SE emite log estructurado nivel `warn`/`error` con detalle mínimo (path, latencyMs, dependency down si aplica).

#### AC-08: `version` resuelto por precedencia

**Given** `process.env.APP_VERSION` está definido
**When** un cliente hace `GET /health`
**Then** `version` = valor de `APP_VERSION`.
**Given** `APP_VERSION` no definido y `package.json` legible
**Then** `version` = `package.json.version`.
**Given** ambos indisponibles
**Then** `version` = `"unknown"`.

#### AC-09: Performance NFR-PERF-001

**Given** condiciones normales de demo (single instance App Runner)
**When** un cliente hace `GET /health`
**Then** P95 < 100 ms (proceso vivo, sin I/O).
**When** un cliente hace `GET /health/ready`
**Then** P95 < 500 ms (DB probe local con timeout 500 ms).

---

### ⚠️ Edge Cases

#### EC-01: Timeout de DB check

**Given** la DB no responde en 500 ms
**When** se ejecuta `/health/ready`
**Then** el check retorna `postgres: "down"` sin colgar el request (racing con timeout Promise) y HTTP 503.

#### EC-02: LLM provider configurado como openai sin API key

**Given** `LLM_PROVIDER=openai` y `OPENAI_API_KEY` ausente/vacío
**When** se ejecuta `/health/ready`
**Then** `aiProvider: "down"`, `status: "degraded"`, HTTP 200 (LLM no bloquea rotación).

#### EC-03: LLM provider configurado como mock

**Given** `LLM_PROVIDER=mock`
**When** se ejecuta `/health/ready`
**Then** `aiProvider: "mock"`, `status: "ok"`, HTTP 200.

#### EC-04: Package.json no legible

**Given** el filesystem no expone `package.json` y `APP_VERSION` no está definido
**When** se ejecuta `/health`
**Then** `version: "unknown"` — NO se lanza excepción.

#### EC-05: Uptime en segundos vs milisegundos

**Given** `process.uptime()` retorna segundos (JS estándar)
**When** se serializa el DTO
**Then** `uptimeMs` = `Math.floor(process.uptime() * 1000)` — nunca segundos crudos.

#### EC-06: Timestamp reproducibilidad

**Given** la respuesta debe ser JSON serializable
**When** se genera `timestamp`
**Then** = `new Date().toISOString()` en tiempo del request.

#### EC-07: Method distinto a GET

**Given** un cliente realiza `POST /health` o `PUT /health/ready`
**When** llega la request
**Then** respuesta `405 Method Not Allowed` con body vacío (sin exponer stack ni config).

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                          | Message / Behavior                        |
| ----- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| VR-01 | Respuesta jamás incluye secretos, env vars completas, ni PII.                                                  | BR-PRIVACY-008, NFR-PRIV-004.              |
| VR-02 | Respuesta jamás expone stack traces ni errores internos de Prisma.                                             | Mensaje genérico + código HTTP.            |
| VR-03 | Los métodos aceptados son sólo `GET`. Otros retornan `405 Method Not Allowed`.                                 | Sin body específico.                       |
| VR-04 | Los headers de response NO incluyen `X-Correlation-Id`.                                                        | Excepción explícita al middleware.         |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Endpoints públicos (anonymous). Ningún guard de autenticación se aplica.                                                       |
| SEC-02 | No exponer nombres/valores de env vars, secrets, connection strings, ni configuración interna.                                 |
| SEC-03 | No exponer datos personales, IDs internos de usuario, ni PII en la respuesta.                                                   |
| SEC-04 | Rate limiter global NO se aplica; probes externos podrían ser bloqueados de otra manera (App Runner probes tienen quota alta). |
| SEC-05 | Logging NO incluye información sensible ni de configuración; sólo path, latencia, dependencia down.                             |

### Negative Authorization Scenarios

- Cliente sin sesión → 200 (comportamiento correcto, anonymous).
- Cliente autenticado como admin → 200 (mismo comportamiento; el guard no se aplica).
- Cliente con `X-Correlation-Id` presente en request → 200; correlationId NO se propaga a response ni al logger para estos handlers.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

- AI Feature: None
- Provider Layer: N/A (sólo se consulta configuración `LLM_PROVIDER` + presencia de `OPENAI_API_KEY`, sin invocar SDK).
- Human Validation Required: No
- Persist AIRecommendation: No
- Fallback Required: No

---

## 🎨 UX / UI Notes

| Area                | Notes                                       |
| ------------------- | ------------------------------------------- |
| Screen / Route      | N/A (endpoint técnico).                     |
| Main UI Pattern     | N/A                                         |
| Primary Action      | N/A                                         |
| Secondary Actions   | N/A                                         |
| Empty State         | N/A                                         |
| Loading State       | N/A                                         |
| Error State         | N/A (contrato JSON documentado).            |
| Success State       | N/A                                         |
| Accessibility Notes | No aplica.                                  |
| Responsive Notes    | No aplica.                                  |
| i18n Notes          | No aplica (JSON máquina; sin traducciones). |
| Currency Notes      | No aplica.                                  |

---

## 🛠 Technical Notes

### Frontend

- No aplica.

### Backend

- **Módulo canónico**: `src/modules/platform-health/`.
- **Estructura**:
  - `src/modules/platform-health/application/use-cases/get-health.use-case.ts`.
  - `src/modules/platform-health/application/use-cases/get-readiness.use-case.ts`.
  - `src/modules/platform-health/infrastructure/http/health.controller.ts`.
  - `src/modules/platform-health/infrastructure/probes/postgres.probe.ts`.
  - `src/modules/platform-health/infrastructure/probes/ai-provider.probe.ts` (config-only, sin llamada externa).
  - `src/shared/config/app-version.ts` (utility).
- **Route registration**: `platform-health.router.ts` mounted BEFORE `sessionGuard`, `csrfProtection`, `correlationId`, y `rateLimiter` — o incluidos en whitelist path-based.
- **Validation**: no requiere Zod (sin body/query).
- **Transaction Required**: No.

### Database

- **No** cambios de schema.
- **No** migraciones.
- Consulta: `prisma.$queryRaw`SELECT 1`` con timeout 500 ms (via `Promise.race`).

### API

| Method | Endpoint            | Purpose                                              |
| ------ | ------------------- | ---------------------------------------------------- |
| GET    | `/health`           | Healthcheck. Proceso vivo.                            |
| GET    | `/health/ready`     | Readiness. DB up + reporte de aiProvider.             |

Response DTOs (canonical desde `docs/16 §21.3`):

```ts
type HealthResponseDto = {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptimeMs: number;
  timestamp: string; // ISO
};

type ReadyResponseDto = HealthResponseDto & {
  dependencies: {
    postgres: 'ok' | 'down';
    aiProvider: 'ok' | 'mock' | 'down';
  };
};
```

### Observability / Audit

- Correlation ID Required: **No** (excepción explícita per `docs/16 §21.4`).
- Log Event Required: **Condicional** — success no; fallos y 5xx sí.
- AdminAction Required: No.
- AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                       | Type              |
| ----- | ------------------------------------------------------------------------------ | ----------------- |
| TS-01 | `GET /health` sin sesión → 200 + DTO plano válido.                              | Unit + Integration |
| TS-02 | `GET /health/ready` con DB OK y `LLM_PROVIDER=openai` con key → 200 status=ok.  | Integration        |
| TS-03 | `GET /health/ready` con DB OK y `LLM_PROVIDER=mock` → 200 status=ok, ai=mock.    | Integration        |
| TS-04 | `GET /health/ready` con `LLM_PROVIDER=openai` sin key → 200 status=degraded.    | Integration        |
| TS-05 | `GET /health/ready` con DB down/timeout → 503 status=error postgres=down.      | Integration        |
| TS-06 | `getAppVersion()` resuelve APP_VERSION → package.json → "unknown".              | Unit               |
| TS-07 | `uptimeMs` = `process.uptime() * 1000` redondeado.                              | Unit               |
| TS-08 | Endpoints exentos del rate limiter (probe rápido no bloquea).                    | Integration        |
| TS-09 | Endpoints no propagan `X-Correlation-Id` a response.                             | Integration        |
| TS-10 | Logger success bypass verificado; fallo emite log estructurado.                  | Integration        |

### Negative Tests

| ID    | Scenario                                          | Expected Result                     |
| ----- | ------------------------------------------------- | ----------------------------------- |
| NT-01 | `POST /health` → 405.                              | 405 Method Not Allowed              |
| NT-02 | Response body no contiene "DATABASE_URL", "SECRET", "PASSWORD", "TOKEN". | Assertion sobre keywords.  |
| NT-03 | Response no incluye stack trace ante fallo.        | Sanitized error path.               |
| NT-04 | Prisma exception NO se propaga como body raw.      | Handler encapsula error.            |

### AI Tests

| ID       | Scenario | Expected Result |
| -------- | -------- | --------------- |
| AI-TS-01 | N/A       | —               |

### Authorization Tests

| ID         | Scenario                                          | Expected Result |
| ---------- | ------------------------------------------------- | --------------- |
| AUTH-TS-01 | Cliente anonymous → 200.                            | Success         |
| AUTH-TS-02 | Cliente organizer → 200 (guard no aplica).           | Success         |
| AUTH-TS-03 | Cliente admin → 200 (guard no aplica).               | Success         |

### Accessibility Tests

- No aplica (endpoint técnico sin UI).

---

## 📊 Business Impact

| Field               | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| KPI Affected        | Disponibilidad backend, éxito de despliegue App Runner, MTTD (mean time to detect).          |
| Expected Impact     | Base para deploy confiable y demo académica sin caídas silenciosas.                          |
| Success Criteria    | App Runner deploy pasa `/health`; smoke E2E post-deploy consulta `/health/ready` y verde.     |
| Academic Demo Value | Demuestra observabilidad mínima + deployment maduro.                                          |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

- No aplica.

### Potential Backend Tasks

- `getAppVersion()` util.
- `PostgresProbe` con timeout `Promise.race`.
- `AiProviderProbe` config-based.
- `GetHealthUseCase` y `GetReadinessUseCase`.
- `HealthController` (2 handlers) + registro de router antes de guards.
- Whitelist en rate limiter y en correlationId middleware.
- Bypass en logger success de US-113.

### Potential Database Tasks

- No migraciones.
- No cambios de schema.

### Potential AI / PromptOps Tasks

- No aplica (sin llamada al proveedor).

### Potential QA Tasks

- Unit tests (util version, uptime).
- Integration tests (10 escenarios TS-01..TS-10 + NT-01..NT-04 + AUTH-TS-01..03).
- Smoke curl en CI post-deploy (`/health` 200, `/health/ready` 200).

### Potential DevOps / Config Tasks

- Inyectar `APP_VERSION` desde CI (tag/SHA) en variable de entorno del contenedor.
- Actualizar App Runner configuration para probe `/health`.
- Documentar `/health/ready` para monitoreo externo.

---

## ✅ Definition of Ready

- [x] Rol claro (System).
- [x] Goal técnico claro.
- [x] Referencias a Docs.
- [x] Permisos / Seguridad definidos.
- [x] Entidades listadas.
- [x] AC en formato Given/When/Then.
- [x] Edge cases documentados.
- [x] Validación clara.
- [x] Out of Scope explícito.
- [x] Dependencias conocidas.
- [x] UX states identificados (N/A).
- [x] API definida (paths + DTOs).
- [x] Tests definidos.
- [x] Tech Lead validó (decisión resolver).

---

## 🏁 Definition of Done

- [ ] Endpoints operativos en runtime.
- [ ] AC-01..AC-09 verdes.
- [ ] EC-01..EC-07 verdes.
- [ ] Tests unit + integration + smoke curl verdes.
- [ ] Sin exposición de secretos o PII.
- [ ] Documentation Alignments A1..A3 abordados en PR aparte (no bloqueantes).

---

## 📝 Notes

- Paths canónicos vienen de `docs/16 §21.2`. NO usar `/healthz`, `/readyz`.
- Correlation ID excepción explícita per `docs/16 §21.4` y ADR-API-004 (nota A3).
- `aiProvider` es reporte diagnóstico, NO decide HTTP status; único disparador de 503 = `postgres: "down"`.
