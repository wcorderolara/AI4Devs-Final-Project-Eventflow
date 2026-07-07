# 🧾 User Story: Propagar correlation ID por request (X-Correlation-Id, UUID v4)

## 🆔 Metadata

| Field              | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | US-114                                                                        |
| Epic               | EPIC-OBS-001 — Observability & Audit                                          |
| Backlog Item       | PB-P2-011 — Correlation IDs end-to-end (P2, Should Have, posición 1 de 1)     |
| Feature            | Correlation ID por request (`X-Correlation-Id`, UUID v4) end-to-end: middleware, envelope, logger integration y fetch client |
| Module / Domain    | Platform / Observability                                                       |
| User Role          | System                                                                        |
| Priority           | Should Have                                                                   |
| Status             | Approved with Minor Notes                                                     |
| Owner              | Tech Lead / Platform                                                          |
| Approved By        | PO/BA Review                                                                  |
| Approval Date      | 2026-07-07                                                                    |
| Ready for Development Tasks | Yes                                                                  |
| Sprint / Milestone | MVP                                                                           |
| Created Date       | 2026-06-09                                                                    |
| Last Updated       | 2026-07-07                                                                    |

---

## 🎯 User Story

**As the** sistema backend
**I want** un middleware que genere/valide un `X-Correlation-Id` (UUID v4) por request, lo propague via AsyncLocalStorage (US-113), lo eche en el response header + body envelope, y un fetch interceptor frontend que lo adjunte por request outbound
**So that** cualquier request pueda trazarse end-to-end en logs, responses, errores y `ai_recommendations`, conforme a `ADR-API-004`

---

## 🧠 Business Context

### Context Summary

US-114 materializa `ADR-API-004` (`docs/22 §2438+`): "Cada request entrante recibe (o genera) un `X-Correlation-Id` (UUID v4). El ID se propaga a logs, respuestas (`meta.correlationId`, `error.correlationId`) y a `ai_recommendations`". Es el gemelo upstream de US-113 (Approved): US-113 provee el `correlationContext` (AsyncLocalStorage) + logger que consume el ID; US-114 es la OWNER del middleware que lee/genera el UUID y lo puebla en el store.

Consumidores:

* **US-113** (Approved, gemelo): consume el `correlationId` del store para inyectarlo en cada línea de log.
* **US-034 D5** (Approved): usa `generateCorrelationId('job-emit-t7')` (D7) para operar en jobs fuera de HTTP.
* **US-115** (métricas IA): escribe `correlation_id` en `ai_recommendations` desde el contexto.
* **US-116** (healthcheck): usa el logger de US-113 que hereda el ID.
* **Consumidores frontend**: `apps/web` fetch interceptor adjunta el header por outbound request.

### Related Domain Concepts

* `X-Correlation-Id` HTTP header (`docs/22 §ADR-API-004`).
* UUID v4 (`docs/22 §ADR-API-004`).
* AsyncLocalStorage (US-113 D4).
* Envelope canonical `meta.correlationId` / `error.correlationId` (`docs/16 §426/§652/§653`).
* `ai_recommendations.correlation_id` (`docs/18 §110/§869/§1110` — YA existe, sin migración).

### Assumptions

* **US-113 (Approved)** provee el `correlationContext = new AsyncLocalStorage<{correlationId}>()` en `src/shared/context/correlation-id.ts`.
* Node.js 20+ para `crypto.randomUUID()` nativo (backend).
* Web Crypto API disponible en browsers modernos (frontend MVP scope).
* Helper de envelope existente (probable `src/shared/http/response.ts`) puede extenderse; si no existe, US-114 lo crea con requisitos mínimos.
* `ai_recommendations.correlation_id` YA en schema (docs/18 §110); US-114 no toca schema.

### Dependencies

* **PB-P2-010 / US-113** (upstream, Approved) — provee `correlationContext` + logger.
* Handoffs downstream:
  * **US-034** (Ready for Sprint Planning) — usa `generateCorrelationId('job-emit-t7')` (D7).
  * **US-115** (métricas IA) — escribe `ai_recommendations.correlation_id` desde el contexto.
  * **US-116** (healthcheck) — usa logger que hereda el ID.
  * Todos los use cases y controllers backend.
  * Todos los cliente frontend outbound fetch.

### PO/BA Decisions Applied

Todas Tech Recommendations con respaldo documental. Formalizadas en `management/user-stories/decision-resolutions/US-114-decision-resolution.md`:

| ID | Decisión                                                                                                                                                                                                                                            |
| -- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | UUID v4 nativo (`crypto.randomUUID()` en Node.js 20+ backend y Web Crypto API frontend). ADR-API-004 explícito.                                                                                                                                    |
| D2 | Header wire canonical: `X-Correlation-Id` (case-insensitive matching per RFC 7230; emisión SIEMPRE con este casing).                                                                                                                              |
| D3 | Read-or-generate: ausente → generar; válido → reusar; **inválido → 400 `INVALID_CORRELATION_ID`** con envelope de error que incluye `error.correlationId` server-generated para trazabilidad del fallo.                                            |
| D4 | Response envelope: (a) header `X-Correlation-Id` echoed en TODAS responses; (b) success body `meta.correlationId` per docs/16 §426; (c) error body `error.correlationId` per docs/16 §652/§653. Invariante header==body.                        |
| D5 | Integración con US-113 (Approved): US-114 middleware corre `correlationContext.run({ correlationId }, next)`. Reuso 1:1 del singleton. Orden en `app.ts`: US-114 → US-113 (`requestLogger`) → auth → ...                                            |
| D6 | Frontend fetch interceptor global en `apps/web/lib/api/client.ts` (o equivalente) genera `X-Correlation-Id = crypto.randomUUID()` por outbound request. Sin persistencia cross-request en MVP; session-scoped tracking = Future.                    |
| D7 | Helper `generateCorrelationId(prefix?)` en `src/shared/context/correlation-id.ts` (junto al singleton de US-113). Uso en jobs: `generateCorrelationId('job-emit-t7')` (patrón US-034 D5).                                                            |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P2-011                                                                                                                        |
| FRD Requirement(s)     | — (foundation técnica sin FR funcional directo)                                                                                   |
| Use Case(s)            | — (transversal a todos)                                                                                                            |
| Business Rule(s)       | — (foundation)                                                                                                                    |
| Permission Rule(s)     | Sistema (middleware interno)                                                                                                       |
| Data Entity / Entities | Notification (`ai_recommendations.correlation_id` ya existente; US-114 NO lo escribe)                                              |
| API Endpoint(s)        | — (middleware afecta a TODOS los endpoints)                                                                                        |
| NFR Reference(s)       | NFR-OBS-006 (stdout logging, sin APM)                                                                                              |
| Related ADR(s)         | **ADR-API-004 (primario — Use Correlation ID Across Requests, Logs, and Errors)**, ADR-SEC-001 (Prevent Injection), ADR-DEVOPS-001 (AWS) |
| Related Document(s)    | /docs/10 §NFR-OBS-006, /docs/12, /docs/13, /docs/14 §middleware §logger §1544 §23.x, /docs/15 §Frontend §API Client, /docs/16 §426 §652 §653 §envelope, /docs/17, /docs/18 §110 §869 §1110 §ai_recommendations, /docs/19, /docs/20, /docs/21, /docs/22 §ADR-API-004 §2456 §2478 §ADR-SEC-001 §ADR-DEVOPS-001 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have

### Explicitly Out of Scope

* OpenTelemetry / distributed tracing (rechazado explícitamente por ADR-API-004: "Sobreingeniería; futuro").
* Persistencia frontend cross-request del ID (session-scoped) — Future US.
* Header custom distinto de `X-Correlation-Id` (D2 lo fija).
* Mutación retroactiva de logs para inyectar ID (US-113 D4 lo cubre live).
* Correlation en WebSocket / SSE (no aplica MVP; sin realtime — heredado US-072 D3).
* Cambios al schema `ai_recommendations` (columna `correlation_id` YA existe).
* Métricas cuantitativas (Prometheus/StatsD) — Future.
* Frontend UI visible del correlationId (transparente al usuario).

### Scope Notes

* US-114 es infrastructure-only: backend middleware + frontend fetch interceptor.
* Sin cambios a rutas, endpoints, schema, o UI visible.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Sin header entrante → generar UUID v4 (D1, D3)

**Given** un request HTTP entrante SIN header `X-Correlation-Id`
**When** el middleware `correlationIdMiddleware` corre
**Then** genera un nuevo UUID v4 vía `crypto.randomUUID()`, lo setea en `correlationContext` (US-113 D4), lo agrega como response header `X-Correlation-Id: <id>`, y lo incluye en `meta.correlationId` del envelope de éxito (o `error.correlationId` si el handler downstream retorna 4xx/5xx).

### AC-02: Con header entrante válido → reuso (D3)

**Given** un request HTTP con header `X-Correlation-Id: 123e4567-e89b-12d3-a456-426614174000` (UUID v4 válido)
**When** el middleware corre
**Then** REUSA el mismo ID en el `correlationContext`, en el response header, y en `meta.correlationId` / `error.correlationId` según el status.

### AC-03: Con header entrante inválido → 400 (D3)

**Given** un request con header `X-Correlation-Id: not-a-uuid` (o cualquier valor que no matchee UUID v4 regex)
**When** el middleware corre
**Then** responde `400 INVALID_CORRELATION_ID` con envelope de error:
```json
{
  "error": {
    "code": "INVALID_CORRELATION_ID",
    "message": "X-Correlation-Id must be a valid UUID v4",
    "correlationId": "<newly generated UUID v4 for traceability>"
  }
}
```
El response header `X-Correlation-Id` refleja el ID server-generated (no el inválido del cliente).

### AC-04: Response header echo en TODAS responses (D4)

**Given** cualquier response (2xx, 4xx, 5xx)
**When** el response se emite
**Then** incluye header `X-Correlation-Id: <id>` con el ID del contexto (server-generated si el cliente no envió, reusado si el cliente envió válido, o server-generated en caso de 400 por header inválido).

### AC-05: Success envelope tiene `meta.correlationId` (D4)

**Given** un handler retorna 2xx
**When** el helper `respond.success(...)` serializa
**Then** el body incluye `meta.correlationId: <id>` con el ID del contexto y `meta.timestamp: <ISO-8601 UTC>` (per docs/16 §426).

### AC-06: Error envelope tiene `error.correlationId` (D4)

**Given** un handler retorna 4xx/5xx (via `respond.error(...)` o error handler middleware)
**When** el envelope se serializa
**Then** el body incluye `error.correlationId: <id>` con el ID del contexto.

### AC-07: `correlationContext.getStore()` disponible en handlers (D5)

**Given** cualquier handler downstream del middleware
**When** invoca `correlationContext.getStore()?.correlationId`
**Then** retorna el mismo ID que el response header + envelope. Consecuencia: el logger de US-113 (que lee del mismo store) emite líneas JSON con el mismo `correlationId`.

### AC-08: Fetch client frontend adjunta `X-Correlation-Id` (D6)

**Given** el cliente frontend en `apps/web/lib/api/client.ts` invoca un endpoint backend
**When** la request outbound se emite
**Then** incluye header `X-Correlation-Id: <uuid v4>` generado por `crypto.randomUUID()` en el interceptor. Cada request nuevo tiene su propio ID (sin persistencia cross-request en MVP).

---

## ⚠️ Edge Cases

### EC-01: Header entrante con UUID v4 válido → reuso limpio

**Given** el cliente frontend adjunta un UUID v4 válido
**When** el middleware recibe
**Then** reuso sin regeneración (AC-02).

#### Handling

* Regex UUID v4 estricta case-insensitive.

### EC-02: Header entrante inválido → 400 fail-fast

**Given** un cliente malicioso o mal implementado envía garbage
**When** el middleware recibe
**Then** 400 con envelope de error (AC-03).

#### Handling

* Zod schema aplicado al header.

### EC-03: Múltiples requests concurrentes

**Given** N requests concurrentes en el mismo proceso Node.js
**When** cada uno corre por su middleware
**Then** cada uno tiene su propio `correlationContext.run(...)` aislado (garantía de AsyncLocalStorage).

#### Handling

* Comportamiento nativo de AsyncLocalStorage.

### EC-04: Handler async downstream (job dispatch)

**Given** un handler HTTP dispara un job en background
**When** el job corre
**Then** si el job se lanza dentro del mismo async chain, hereda el store (`correlationContext.getStore()` funciona). Si el job es programado (setInterval/cron), debe usar `generateCorrelationId('job-<name>')` explícitamente (patrón US-034 D5, D7).

#### Handling

* Documentado en Notes; helper `generateCorrelationId` disponible para jobs cron.

### EC-05: Header inválido pero con caracteres UUID-like

**Given** header con UUID v1/v7 (formato similar pero no v4)
**When** el middleware valida
**Then** rechaza con 400 porque el regex es v4-strict (verifica el `4` en posición 15 y `[89ab]` en posición 20).

#### Handling

* Regex UUID v4 explícito, no genérico.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                                                | Message / Behavior                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| VR-01 | Header entrante `X-Correlation-Id` (si presente) DEBE matchear regex UUID v4: `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (case-insensitive) | 400 `INVALID_CORRELATION_ID` si no matchea (AC-03)      |
| VR-02 | Response header `X-Correlation-Id` DEBE estar presente en TODAS responses (2xx, 4xx, 5xx)                                                            | Invariante verificado por contract test                 |
| VR-03 | Success envelope DEBE incluir `meta.correlationId` (per docs/16 §426)                                                                                | Invariante verificado por IT                             |
| VR-04 | Error envelope DEBE incluir `error.correlationId` (per docs/16 §652/§653)                                                                            | Invariante verificado por IT                             |
| VR-05 | Response header `X-Correlation-Id` == body `meta.correlationId` / `error.correlationId`                                                              | Invariante header==body (IT-01)                          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | El header `X-Correlation-Id` NO es secret; no requiere redacción por el logger de US-113 (permitido en logs plain).           |
| SEC-02 | Validación UUID v4 estricta previene inyección (ADR-SEC-001) — no acepta strings arbitrarios en el store.                     |
| SEC-03 | El ID NO se persiste cross-user ni cross-session; cada request es independiente (no leak de IDs entre usuarios).             |
| SEC-04 | El `error.correlationId` retornado en 400 (header inválido) es server-generated; el ID inválido del cliente NUNCA se propaga. |

### Negative Authorization Scenarios

* Header inválido → 400 (fail-fast).
* Ausencia de header en response → contract test rojo en CI.
* Divergencia entre header response y body envelope → IT rojo.

---

## 🤖 AI Behavior

**No aplica — historia técnica; sin invocación IA directa.**

Nota: `ai_recommendations.correlation_id` es escrito por US-115 (métricas IA) desde el contexto (US-114 no lo escribe). US-114 provee la infraestructura; US-115 la consume.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

---

## 🎨 UX / UI Notes

**No aplica — cambio transparente al usuario final; sólo afecta network layer (headers HTTP + envelope).**

| Area                | Notes         |
| ------------------- | ------------- |
| Screen / Route      | No aplica     |
| Main UI Pattern     | No aplica     |
| Primary Action      | No aplica     |
| Secondary Actions   | No aplica     |
| Empty State         | No aplica     |
| Loading State       | No aplica     |
| Error State         | No aplica (el `error.correlationId` sirve para support pero no se muestra al usuario final; opcionalmente console.log en dev) |
| Success State       | No aplica     |
| Accessibility Notes | No aplica     |
| Responsive Notes    | No aplica     |
| i18n Notes          | No aplica     |
| Currency Notes      | No aplica     |

---

## 🛠 Technical Notes

### Frontend

* Path canónico: `apps/web/lib/api/client.ts` (fetch interceptor global; ratificar en Technical Spec).
* Cada outbound request adjunta `X-Correlation-Id: crypto.randomUUID()`.
* Opcionalmente, en `LOG_LEVEL=debug`, imprime en console el `correlationId` recibido en response headers.
* Sin persistencia cross-request en MVP.

### Backend

* Paths canónicos (per `docs/14 §1544` + colocación con US-113):
  * `src/infrastructure/middleware/correlation-id.middleware.ts` (D5 — OWNER del middleware).
  * `src/shared/context/correlation-id.ts` (compartido con US-113 D4; agregar `generateCorrelationId(prefix?)` D7).
  * `src/shared/validation/correlation-id.schema.ts` (Zod schema UUID v4 estricto).
  * `src/shared/http/response.ts` (helper de envelope — ratificar existencia en Tech Spec; extender para leer del contexto).
* Dependencias:
  * Sin nuevas dependencias (`crypto.randomUUID()` es nativo Node 20+).
  * `zod` (ya presente).
* Orden de middlewares en `app.ts`:
  1. **`correlationIdMiddleware` (US-114 — OWNER)**.
  2. `requestLogger` (US-113 — CONSUME).
  3. Auth, role, ownership, validation, rate limit, captcha, upload, error handler (existentes PB-P0-002).
* Coordinación con error handler middleware: el error handler DEBE leer `correlationContext.getStore()?.correlationId` para inyectar `error.correlationId` en el envelope (VR-04). Ratificar en Tech Spec.

### Database

* No aplica: `ai_recommendations.correlation_id` YA existe (docs/18 §110/§869); US-114 no toca schema.

### API

* Middleware afecta transversalmente a TODOS los endpoints.
* Envelope `docs/16 §426/§652/§653` ratificado y consumido.

### Observability / Audit

* Correlation ID Required: Yes (US-114 ES la fuente).
* Log Event Required: No específico (US-113 emite logs con el ID).
* AdminAction Required: No.
* AIRecommendation Required: No (US-115 consume).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                              | Type        |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Request sin header → response header + `meta.correlationId` tienen UUID v4 nuevo (AC-01).                             | Unit        |
| TS-02 | Request con header UUID v4 válido → reuso en response header + envelope (AC-02).                                       | Unit        |
| TS-03 | Request con header inválido → 400 `INVALID_CORRELATION_ID` con envelope de error server-generated (AC-03).             | Unit        |
| TS-04 | Error envelope tiene `error.correlationId` que matchea response header (AC-06, VR-05).                                 | Integration |
| TS-05 | Success envelope tiene `meta.correlationId` que matchea response header (AC-05, VR-05).                                | Integration |
| TS-06 | Dentro del handler, `correlationContext.getStore()?.correlationId` retorna el mismo ID que el response header (AC-07). | Integration |
| TS-07 | (Frontend UT con MSW) fetch interceptor adjunta `X-Correlation-Id` UUID v4 en headers (AC-08).                          | UT Frontend |
| TS-08 | (Frontend UT) cliente puede leer `X-Correlation-Id` del response header (opcional).                                     | UT Frontend |

### Integration Tests

* IT-01 (crítico): request HTTP a un endpoint real → verificar (a) response header `X-Correlation-Id`, (b) body `meta.correlationId` o `error.correlationId` según status, (c) log emitido con el mismo ID (via US-113 logger). Invariante header==body==log.
* IT-02: request con header inválido → 400 con `error.correlationId` server-generated (y NO el inválido del cliente).
* IT-03: concurrencia — 10 requests paralelos → cada uno tiene su propio ID en su log stream.

### E2E Tests

* E2E-01 (Playwright): usuario ejecuta acción frontend → fetch outbound genera UUID v4 → backend recibe → response echoed → console (o network tab) muestra el mismo ID en request y response headers.

### Negative Tests

| ID    | Scenario                                                     | Expected Result                             |
| ----- | ------------------------------------------------------------ | ------------------------------------------- |
| NT-01 | Header con string arbitrario `abc123`                         | 400 `INVALID_CORRELATION_ID`.               |
| NT-02 | Header con UUID v1 (formato similar pero versión distinta)   | 400 (regex v4-strict rechaza).              |
| NT-03 | Header vacío (`X-Correlation-Id:`)                           | Trata como ausente → generar nuevo.         |
| NT-04 | Header con espacios extra (`  <uuid>  `)                     | Trim antes de validar; matchea → reuso.     |

### AI Tests

`No aplica.`

### Authorization Tests

`No aplica (middleware transversal sin authorization directa).`

### Accessibility Tests

`No aplica.`

### Contract Tests

* Contract MSW (alineado con US-121 PB-P2-015):
  * Verificar que TODAS las responses de fixtures incluyen `X-Correlation-Id` header + `meta.correlationId` (success) o `error.correlationId` (error).

### Smoke Tests

* Smoke-01: contenedor Docker arranca; request curl a `/healthz` (US-116) → response header presente + valid UUID v4.

---

## 📊 Business Impact

| Field               | Value                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Salud técnica; tiempo de debug; auditoría; trazabilidad cross-capa (frontend → backend → log → error → ai_recommendations).           |
| Expected Impact     | Habilita el troubleshooting operativo; cualquier request rastreable end-to-end en `docker logs \| jq`.                              |
| Success Criteria    | Contract test verde; IT-01 verde (invariante header==body==log); smoke Docker con curl verifica header en response.                  |
| Academic Demo Value | Foundation técnica demostrable: `curl -H "X-Correlation-Id: <uuid>" .../healthz` → response echoes ID + log con mismo ID.            |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Fetch interceptor en `apps/web/lib/api/client.ts` con `crypto.randomUUID()`.
* UT frontend con MSW verificando presencia del header outbound.

### Potential Backend Tasks

* Zod schema UUID v4 en `src/shared/validation/correlation-id.schema.ts`.
* Extender `src/shared/context/correlation-id.ts` con helper `generateCorrelationId(prefix?)` (D7).
* Implementar `correlation-id.middleware.ts` (D3, D5).
* Extender/crear `src/shared/http/response.ts` (helper envelope) para leer del `correlationContext`.
* Integrar en `error.handler.middleware.ts` (`error.correlationId`).
* Wire en `app.ts` (orden: US-114 → US-113 → ...).

### Potential Database Tasks

* No aplica.

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* UT (backend + frontend), IT (invariante header==body==log), E2E, Contract MSW, Smoke Docker, NT.

### Potential DevOps / Config Tasks

* No aplica (sin config env nueva).

---

## ✅ Definition of Ready

* [x] Rol claro (System).
* [x] Goal técnico claro.
* [x] Referencias a docs (`docs/22 §ADR-API-004`, `docs/16 §envelope`, `docs/18 §ai_rec`, US-113 Approved).
* [x] Permisos / Seguridad (SEC-01..SEC-04).
* [x] Entidades listadas (No aplica directamente; `ai_recommendations.correlation_id` ya existente).
* [x] AC en GWT (AC-01..AC-08).
* [x] Edge cases documentados (EC-01..EC-05).
* [x] Validación clara (VR-01..VR-05).
* [x] Out of Scope explícito (OpenTelemetry, session-scoped ID, WebSocket).
* [x] Dependencias conocidas (PB-P2-010/US-113 upstream Approved; US-034/115/116 downstream).
* [x] UX states identificados (No aplica).
* [x] API definida (middleware transversal).
* [x] Tests definidos (UT + IT + E2E + Contract + Smoke).
* [x] Tech Lead validó (Q1–Q7 formalizadas en decision resolution).

---

## 🏁 Definition of Done

* [ ] Zod schema UUID v4 implementado.
* [ ] `correlation-id.middleware.ts` implementado con read-or-generate + 400 fail-fast.
* [ ] Helper `generateCorrelationId(prefix?)` en `src/shared/context/correlation-id.ts`.
* [ ] `src/shared/http/response.ts` (o equivalente) integrado con `correlationContext` para `meta.correlationId` y `error.correlationId`.
* [ ] Error handler middleware inyecta `error.correlationId`.
* [ ] Wire en `app.ts` en el orden correcto (US-114 antes que US-113 `requestLogger`).
* [ ] Frontend fetch interceptor implementado en `apps/web/lib/api/client.ts`.
* [ ] Tests TS-01..TS-08 verdes.
* [ ] Tests IT-01..IT-03 verdes (invariante header==body==log).
* [ ] E2E-01 verde (frontend → backend → log).
* [ ] Contract MSW verde.
* [ ] NT-01..NT-04 verdes.
* [ ] Smoke Docker verde.
* [ ] Tech Lead valida en review.

---

## 📝 Notes

* **Handoff explícito con US-113 (Approved)**: coordinar orden de middlewares en `app.ts` (US-114 → US-113). Ambas historias comparten el módulo `src/shared/context/correlation-id.ts` sin duplicación.
* **Handoff con US-034 D5**: US-034 usa `correlationId=job-emit-t7-<timestamp>`; con D7, se refactoriza a `generateCorrelationId('job-emit-t7')` para consistencia (opcional; no bloqueante).
* **Handoff con US-115** (métricas IA): US-115 lee `correlationContext.getStore()?.correlationId` y lo escribe en `ai_recommendations.correlation_id`. US-114 no toca `ai_recommendations`.
* **Handoff con US-116** (healthcheck): usa el logger de US-113 que hereda el ID via `mixin`.
* **Documentation Alignment**:
  * `docs/15 §Frontend` puede requerir sección "Correlation ID Propagation" si no la tiene explícita (verificar en Tech Spec; no bloquea).
  * Ampliar Traceability de PB-P2-011 con ADR-API-004 explícito.
* Todas las decisiones son `Tech Recommendation` con respaldo documental directo. No requieren decisión PO adicional.
* Priority "Should Have" alineada con PB-P2-011 MoSCoW.
* Reversibilidad: Future ADR puede promover a OpenTelemetry sin cambiar el header (backward compatible).
