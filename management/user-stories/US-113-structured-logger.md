# 🧾 User Story: Implementar logger estructurado JSON con Pino

## 🆔 Metadata

| Field              | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | US-113                                                                        |
| Epic               | EPIC-OBS-001 — Observability & Audit                                          |
| Backlog Item       | PB-P2-010 — Logger estructurado JSON (P2, Should Have, posición 1 de 1)      |
| Feature            | Logger estructurado JSON con Pino, redacción de secrets/PII y correlationId end-to-end |
| Module / Domain    | Platform / Observability                                                       |
| User Role          | System (biblioteca compartida consumida por todos los módulos backend)         |
| Priority           | Should Have                                                                   |
| Status             | Approved                                                                       |
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
**I want** un logger estructurado JSON basado en Pino, con redacción centralizada de secrets/PII y propagación de `correlationId` via AsyncLocalStorage
**So that** todos los módulos escriban logs uniformes, seguros y correlacionables a stdout, habilitando NFR-OBS-004 (email log), NFR-OBS-005 (cambios críticos), ADR-API-004 (correlation) y NFR-PRIV-004 (privacidad en logs)

---

## 🧠 Business Context

### Context Summary

US-113 implementa el logger estructurado JSON base para todo el backend EventFlow. Es la biblioteca compartida que consumen todos los módulos (identity-access, event-planning, quote-flow, booking-intent, notifications, admin-governance, etc.) para emitir logs uniformes.

Consumidores directos ya identificados:

* **US-034** (`EmitT7NotificationsJob`): log `[EMAIL]` + `job.t7Notifications.affected=N` (NFR-OBS-004/005).
* **US-068/US-069/US-070/US-072**: log `[EMAIL]` sin PII per SEC-02 de cada US.
* **US-114** (Correlation IDs end-to-end): OWNER del middleware `X-Correlation-Id`; US-113 CONSUME el valor via `AsyncLocalStorage`.
* **US-115** (Métricas IA JSON): usa el logger con `context.metric` estructurado.
* **US-116** (Healthcheck): usa el logger para reportar estado al boot.

Cierra el gap operativo de que hoy no existe un logger centralizado; se estaba usando `console.log` ad-hoc.

### Related Domain Concepts

* Pino (`docs/14 §1659`).
* AsyncLocalStorage (`docs/22 §2478 ADR-API-004`).
* Redacción centralizada `redactSecrets()` + `redactPII()` (`docs/22 §1851`).
* Emisión stdout (`NFR-OBS-006`).

### Assumptions

* Backend bootstrap (**PB-P0-002**) ya provee el orden de middlewares (`correlation, logging, auth, role, ownership, validation, ...`).
* `NODE_ENV` está definida (`development | test | production`).
* `SERVICE_VERSION` disponible en env var o en `package.json`.
* MVP single-service (`service='backend-api'` constante).

### Dependencies

* **PB-P0-002** (upstream — backend bootstrap con orden de middlewares).
* **US-114** (Correlation IDs) — coexistencia: US-113 asume que US-114 provee el header + genera el UUID. Si US-114 no está mergeada, US-113 emite con `correlationId=null` sin fallar.
* Downstream: US-034, US-068, US-069, US-070, US-072 (consumidores del logger), US-115 (métricas IA), US-116 (healthcheck).

### PO/BA Decisions Applied

Todas las decisiones son **Tech Recommendations** con respaldo documental directo. Formalizadas en `management/user-stories/decision-resolutions/US-113-decision-resolution.md`:

| ID | Decisión                                                                                                                                                                                                                                            |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | Librería: **Pino** (docs/14 §1659). Sin Winston. Centralizado en `src/infrastructure/logger/pino-logger.ts` y expuesto como singleton desde `src/shared/logger.ts`.                                                                                     |
| D2 | Formato JSON base con campos `{timestamp, level, service, env, version, correlationId, msg, context}`. Serialización estable. `service='backend-api'`, `env=NODE_ENV`, `version=SERVICE_VERSION`.                                                    |
| D3 | Redacción centralizada: `redactSecrets()` (12 campos, siempre) + `redactPII()` (7 campos, sólo en prod, o dev sin `LOG_INCLUDE_PII=true`). Headers HTTP `Authorization/Cookie/Set-Cookie/X-Api-Key/X-Session-Token` siempre redactados. `body` sólo si el caller lo pasa explícitamente. |
| D4 | Integración correlationId via `AsyncLocalStorage` (`node:async_hooks`) en `src/shared/context/correlation-id.ts`. US-113 CONSUME; US-114 PROVEE.                                                                                                       |
| D5 | Sink: **stdout único** (NFR-OBS-006). Sin file transport, sin APM, sin ELK, sin fanout.                                                                                                                                                              |
| D6 | Env vars: `LOG_LEVEL` (enum Pino), `LOG_PRETTY` (dev only), `LOG_INCLUDE_PII` (dev only), `SERVICE_VERSION`. Zod validation al boot con fail-fast si inválidos o si `LOG_PRETTY=true` / `LOG_INCLUDE_PII=true` en prod.                              |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P2-010                                                                                                                          |
| FRD Requirement(s)     | — (historia técnica de foundation; sin FR funcional directo)                                                                       |
| Use Case(s)            | — (transversal a todos los UC)                                                                                                     |
| Business Rule(s)       | BR-PRIVACY-008 (contraseñas nunca en logs), BR-PRIVACY-011 (retención)                                                              |
| Permission Rule(s)     | Sistema (biblioteca interna)                                                                                                        |
| Data Entity / Entities | — (no toca DB)                                                                                                                     |
| API Endpoint(s)        | — (biblioteca compartida; sin endpoint)                                                                                             |
| NFR Reference(s)       | NFR-OBS-004 (email log), NFR-OBS-005 (cambios críticos), NFR-OBS-006 (stdout, sin APM), NFR-PRIV-004 (excluir PII/secrets de logs)  |
| Related ADR(s)         | ADR-SEC-001 (Prevent Injection and Token Exposure), ADR-API-004 (Correlation ID Across Requests/Logs/Errors), ADR-DEVOPS-001 (AWS) |
| Related Document(s)    | /docs/10 §NFR-OBS-004..006 §NFR-PRIV-004, /docs/12, /docs/13, /docs/14 §logger §1427 §1538 §1544 §1659 §1886, /docs/17, /docs/19 §670 §1297, /docs/20, /docs/21, /docs/22 §ADR-SEC-001 §ADR-API-004 §ADR-DEVOPS-001 §1851 §1887 §2478 §3256 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have (foundation para EPIC-OBS-001)

### Explicitly Out of Scope

* APM enterprise (Datadog, New Relic, Dynatrace) — NFR-OBS-006.
* Distributed tracing (OpenTelemetry, Zipkin, Jaeger) — NFR-OBS-006.
* ELK stack (Elasticsearch, Logstash, Kibana), Loki, Splunk — NFR-OBS-006.
* File transport (`pino-roll`, `fs.createWriteStream`) — D5 stdout único.
* Fanout multi-sink — D5.
* Log rotation / retention interna — responsabilidad del runtime (Docker/AWS ECS).
* Métricas cuantitativas (Prometheus, StatsD) — futuro Future US.
* Cambios al `NotificationLinkResolver`, use cases o schema Prisma.
* Redacción configurable en runtime — Future (sets fijos en MVP per D3).

### Scope Notes

* Biblioteca backend-only; sin frontend.
* Singleton exportado desde `src/shared/logger.ts` consumido por todos los módulos.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Emisión JSON con campos base (D2)

**Given** el backend inicializado (PB-P0-002) con `NODE_ENV=production`, `LOG_LEVEL=info`, `SERVICE_VERSION=1.0.0`
**When** un módulo invoca `logger.info({ userId: 'u1' }, 'user logged in')`
**Then** stdout recibe una línea JSON con el shape exacto:
```json
{"timestamp":"2026-07-07T02:15:00.123Z","level":"info","service":"backend-api","env":"production","version":"1.0.0","correlationId":"<uuid|null>","msg":"user logged in","context":{"userId":"u1"}}
```
Los campos aparecen en el orden declarado.

### AC-02: `LOG_LEVEL` respetado (D6)

**Given** `LOG_LEVEL=warn`
**When** un módulo invoca `logger.debug('detalle')` y luego `logger.warn('atención')`
**Then** stdout recibe SÓLO la línea del `warn`; el `debug` se descarta silenciosamente.

### AC-03: Redacción de secrets (D3)

**Given** un caller invoca `logger.info({ password: 'abc123', token: 'xyz', apiKey: 'k1', authorization: 'Bearer xxx' }, 'auth event')`
**When** el logger serializa
**Then** los 4 campos aparecen como `"[REDACTED]"` en stdout. El resto del contexto queda intacto.

### AC-04: Redacción de PII en producción (D3)

**Given** `NODE_ENV=production` y `LOG_INCLUDE_PII` no seteado (o `false`)
**When** un caller invoca `logger.info({ email: 'a@b.c', phone: '555-1234', userId: 'u1' }, 'contact')`
**Then** `email` y `phone` aparecen como `"[REDACTED]"`; `userId` queda intacto.

**Given** `NODE_ENV=development` y `LOG_INCLUDE_PII=true`
**When** mismo caller
**Then** `email` y `phone` aparecen sin redacción (para debug local).

### AC-05: Integración correlationId via AsyncLocalStorage (D4)

**Given** un request HTTP entrante con header `X-Correlation-Id: 123e4567-e89b-12d3-a456-426614174000`, procesado por el middleware de US-114 que setea `correlationContext.run({ correlationId: '123e...' }, next)`
**When** dentro del handler, un módulo invoca `logger.info('processing')`
**Then** la línea JSON emitida tiene `"correlationId":"123e4567-e89b-12d3-a456-426614174000"`.

### AC-06: Fuera de request context → `correlationId=null` (D4)

**Given** un job programado (`EmitT7NotificationsJob`) invocado FUERA del contexto HTTP
**When** ejecuta `logger.info('job started')`
**Then** la línea JSON emitida tiene `"correlationId":null` (explícito).

### AC-07: Headers HTTP sensibles siempre redactados (D3)

**Given** el middleware `request-logger` emite un log con `context.req.headers` conteniendo `Authorization: 'Bearer xxx'`, `Cookie: 'session=abc'`, `X-Api-Key: 'k1'`
**When** el logger serializa
**Then** los 3 headers aparecen como `"[REDACTED]"` INDEPENDIENTEMENTE del `NODE_ENV`.

### AC-08: Emisión únicamente a stdout (D5)

**Given** el backend en cualquier `NODE_ENV`
**When** se emite un log
**Then** aparece exclusivamente en el descriptor `stdout` del proceso Node.js. No se escribe a ningún archivo, socket, endpoint HTTP o transport de red.

---

## ⚠️ Edge Cases

### EC-01: Configuración inválida

**Given** `LOG_LEVEL=verbose` (no en enum Pino)
**When** el proceso arranca
**Then** falla al boot con mensaje "Invalid LOG_LEVEL: expected one of trace|debug|info|warn|error|fatal|silent, got verbose".

#### Handling

* Validación Zod en `src/config/env.ts`.

### EC-02: `LOG_PRETTY=true` en producción (D6)

**Given** `NODE_ENV=production` y `LOG_PRETTY=true`
**When** el proceso arranca
**Then** falla al boot con mensaje "LOG_PRETTY is not allowed in production".

#### Handling

* Guard explícito en config.

### EC-03: `LOG_INCLUDE_PII=true` fuera de development

**Given** `NODE_ENV=test` o `production` y `LOG_INCLUDE_PII=true`
**When** el proceso arranca
**Then** falla al boot con mensaje similar.

#### Handling

* Guard explícito.

### EC-04: Payload circular o muy grande

**Given** un caller invoca `logger.info({ a: b, b: a }, 'circular')` con referencia circular
**When** el logger serializa
**Then** el logger no crashea; loguea un warning interno y emite `context.serializationError=true` en lugar del contexto.

#### Handling

* Uso del serializer de Pino que maneja circular refs.

### EC-05: Fuera de request context, sin AsyncLocalStorage store

**Given** invocación desde `src/server.ts` durante boot (antes de que arranquen los middlewares)
**When** `logger.info('starting')` se ejecuta
**Then** `correlationId=null` sin crash.

#### Handling

* `correlationContext.getStore()?.correlationId ?? null` con `?.` optional chaining.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                                              | Message / Behavior                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| VR-01 | `LOG_LEVEL ∈ {trace, debug, info, warn, error, fatal, silent}` (default `info` en prod, `debug` en dev, `warn` en test)                            | Fail-fast al boot si inválido           |
| VR-02 | `LOG_PRETTY ∈ {true, false}` (default `false`); `NODE_ENV=production` FORZA `false`                                                                | Fail-fast si `true` en prod             |
| VR-03 | `LOG_INCLUDE_PII ∈ {true, false}` (default `false`); permitido `true` SÓLO en `NODE_ENV=development`                                                | Fail-fast si `true` en test/prod        |
| VR-04 | `SERVICE_VERSION` presente (env var o `package.json`)                                                                                              | Fail-fast si ausente                    |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | `redactSecrets()` reemplaza (case-insensitive) valores de los siguientes campos por `"[REDACTED]"`: `password, pwd, token, apiKey, api_key, secret, authorization, cookie, session, refresh_token, access_token, jwt, bearer`. Aplica siempre, independientemente de `NODE_ENV`. |
| SEC-02 | `redactPII()` reemplaza (case-insensitive) valores de los siguientes campos por `"[REDACTED]"`: `email, phone, phoneNumber, taxId, address, ip, ipAddress`. Aplica en `NODE_ENV=production` siempre; en `development` sólo si `LOG_INCLUDE_PII !== true`.                            |
| SEC-03 | Headers HTTP: al loguear req/res, `Authorization, Cookie, Set-Cookie, X-Api-Key, X-Session-Token` se redactan SIEMPRE (independiente de env).                                 |
| SEC-04 | Redacción recursiva acotada a profundidad 5 para evitar loops.                                                                                                              |

### Negative Authorization Scenarios

* Config insegura al boot → no deploy (fail-fast).
* Intento de bypass de redacción → sin API pública para desactivar; sólo env vars con guards.

---

## 🤖 AI Behavior

**No aplica — historia técnica de foundation; sin invocación IA.**

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

Nota: si Future US-115 (métricas IA) invoca el logger, el logger no valida contenido IA — sólo emite lo que el caller pasa (con redacción D3 aplicada).

---

## 🎨 UX / UI Notes

**No aplica — biblioteca backend sin componentes frontend.**

| Area                | Notes         |
| ------------------- | ------------- |
| Screen / Route      | No aplica     |
| Main UI Pattern     | No aplica     |
| Primary Action      | No aplica     |
| Secondary Actions   | No aplica     |
| Empty State         | No aplica     |
| Loading State       | No aplica     |
| Error State         | No aplica     |
| Success State       | No aplica     |
| Accessibility Notes | No aplica     |
| Responsive Notes    | No aplica     |
| i18n Notes          | No aplica     |
| Currency Notes      | No aplica     |

---

## 🛠 Technical Notes

### Frontend

* No aplica — historia técnica backend-only.

### Backend

* Paths canónicos (per `docs/14 §1427/§1538/§1544`):
  * `src/infrastructure/logger/pino-logger.ts` (D1 — instancia Pino con config).
  * `src/infrastructure/logger/redactors.ts` (D3 — `redactSecrets`, `redactPII`, `redactHeaders`).
  * `src/infrastructure/middleware/request-logger.middleware.ts` (D4 — corre `correlationContext.run()` en cada request).
  * `src/shared/logger.ts` (singleton export para consumidores).
  * `src/shared/context/correlation-id.ts` (D4 — `AsyncLocalStorage<{correlationId}>`).
  * `src/config/env.ts` (D6 — Zod validation de `LOG_LEVEL`, `LOG_PRETTY`, `LOG_INCLUDE_PII`, `SERVICE_VERSION`).
* Dependencias:
  * `pino` (última stable compatible Node LTS).
  * `pino-pretty` (dev only, dependency opcional).
  * `zod` (ya presente en PB-P0-002).
* Orden de middlewares en `app.ts` (per PB-P0-002 + US-114):
  1. `correlation-id.middleware.ts` (US-114 — genera/lee `X-Correlation-Id`).
  2. `request-logger.middleware.ts` (US-113 — corre `correlationContext.run(...)` y emite request/response log).
  3. auth, role, ownership, validation, rate limit, captcha, upload, error handler (existentes de PB-P0-002).

### Database

* No aplica.

### API

* No aplica (biblioteca).

### Observability / Audit

* Correlation ID Required: Yes (consumido, no generado — US-114 lo genera).
* Log Event Required: Yes (esta historia habilita el logging estructurado para todo el sistema).
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                                        | Type        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | `logger.info` emite JSON con campos base en orden estable (D2, AC-01).                                                           | Unit        |
| TS-02 | `LOG_LEVEL=warn` filtra `debug` y `info`; deja pasar `warn`, `error`, `fatal` (D6, AC-02).                                        | Unit        |
| TS-03 | `redactSecrets` cubre los 12 campos (password/token/etc.) case-insensitive; retorna `"[REDACTED]"` (D3, AC-03).                    | Unit        |
| TS-04 | `redactPII` en `NODE_ENV=production` cubre los 7 campos; en `development` con `LOG_INCLUDE_PII=true` no redacta (D3, AC-04).      | Unit        |
| TS-05 | AsyncLocalStorage: dentro de `correlationContext.run({correlationId: 'x'}, () => logger.info(...))` emite `correlationId: 'x'`.   | Unit        |
| TS-06 | Fuera de context: `logger.info` emite `correlationId: null` sin crash (D4, AC-06).                                                | Unit        |
| TS-07 | Payload circular → no crashea; emite `context.serializationError=true` (EC-04).                                                   | Unit        |
| TS-08 | Headers `Authorization, Cookie, Set-Cookie, X-Api-Key, X-Session-Token` redactados SIEMPRE (D3, AC-07).                            | Unit        |

### Integration Tests

* IT-01: request HTTP a un endpoint `/healthz` → log emitido con `correlationId` del header o generado por US-114; ambos matchean.
* IT-02: `EmitT7NotificationsJob` corre fuera de HTTP context → logs con `correlationId=null` (o `job-emit-t7-<ts>` si el use case lo setea explícitamente).

### Regression Tests (críticos por seguridad)

* REG-01: captura de logs con payloads reales de US-034, US-068, US-069, US-070, US-072 → verificar ausencia de `email`, `token`, `password`, `authorization`, `quote total` (SEC-02 de cada US consumidora).
* REG-02: captura de logs de request middleware con `Authorization: Bearer xxx` → `[REDACTED]`.

### Negative Tests

| ID    | Scenario                                                | Expected Result                                   |
| ----- | ------------------------------------------------------- | ------------------------------------------------- |
| NT-01 | `LOG_LEVEL=verbose` (fuera de enum)                      | Fail-fast al boot (EC-01).                        |
| NT-02 | `LOG_PRETTY=true` con `NODE_ENV=production`              | Fail-fast al boot (EC-02).                        |
| NT-03 | `LOG_INCLUDE_PII=true` con `NODE_ENV=test` o `production` | Fail-fast al boot (EC-03).                        |
| NT-04 | Sin `SERVICE_VERSION` ni `package.json`                  | Fail-fast al boot (VR-04).                        |

### AI Tests

`No aplica.`

### Authorization Tests

`No aplica (biblioteca interna sin authorization directa).`

### Accessibility Tests

`No aplica.`

### Smoke Tests

* Smoke-01: contenedor Docker arranca con `LOG_LEVEL=info`, `NODE_ENV=production`, `SERVICE_VERSION=1.0.0`; el primer log emitido es JSON válido con todos los campos base.
* Smoke-02: contenedor arranca con `NODE_ENV=development` y `LOG_PRETTY=true`; los logs son legibles con `pino-pretty`.

---

## 📊 Business Impact

| Field               | Value                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| KPI Affected        | Salud técnica; tiempo de debug; auditoría; compliance de privacidad (BR-PRIVACY-008/011).       |
| Expected Impact     | Habilita observabilidad estructurada para todo el backend; auditoría rápida via `grep`/`jq`.    |
| Success Criteria    | Todos los módulos consumidores (US-034, US-068..072, US-114, US-115, US-116) usan el singleton logger; smoke test verde; regresión de PII/secrets verde. |
| Academic Demo Value | Foundation técnica para observabilidad; demostrable via `docker logs` en el demo.                |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No aplica.

### Potential Backend Tasks

* Instalar dependencias `pino` (+ `pino-pretty` opcional).
* Crear `src/config/env.ts` extension con Zod para `LOG_LEVEL`, `LOG_PRETTY`, `LOG_INCLUDE_PII`, `SERVICE_VERSION`.
* Implementar `src/infrastructure/logger/redactors.ts` con `redactSecrets`, `redactPII`, `redactHeaders`.
* Implementar `src/infrastructure/logger/pino-logger.ts` (instancia + config).
* Implementar `src/shared/context/correlation-id.ts` (`AsyncLocalStorage`).
* Implementar `src/infrastructure/middleware/request-logger.middleware.ts` (corre `correlationContext.run()` + emite req/res log).
* Exponer singleton en `src/shared/logger.ts`.
* Registrar middleware en `app.ts` después del correlation middleware.

### Potential Database Tasks

* No aplica.

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* UT-01..UT-08 (redactores, formato, LOG_LEVEL, AsyncLocalStorage).
* IT-01..IT-02 (middleware + jobs).
* REG-01..REG-02 (captura de logs de consumidores; regresión seguridad).
* NT-01..NT-04 (fail-fast).
* Smoke-01..Smoke-02 (Docker).

### Potential DevOps / Config Tasks

* Documentar env vars en `.env.example`.
* Verificar que Docker/AWS ECS captura stdout del contenedor sin cambios adicionales.

---

## ✅ Definition of Ready

* [x] Rol claro (System).
* [x] Goal técnico claro.
* [x] Referencias a docs (`docs/14 §logger`, `docs/22 §ADR-*`, `docs/10 §NFR-OBS-*/§NFR-PRIV-004`, `docs/19 §670`).
* [x] Permisos / Seguridad (SEC-01..SEC-04).
* [x] Entidades listadas (no aplica — biblioteca).
* [x] AC en GWT (AC-01..AC-08).
* [x] Edge cases documentados (EC-01..EC-05).
* [x] Validación clara (VR-01..VR-04).
* [x] Out of Scope explícito (APM, ELK, file, distributed tracing, fanout).
* [x] Dependencias conocidas (PB-P0-002 upstream; US-114 coexistencia; US-034/068..072/115/116 downstream).
* [x] UX states identificados (No aplica).
* [x] API definida (No aplica; biblioteca).
* [x] Tests definidos (UT + IT + REG + NT + Smoke).
* [x] Tech Lead validó (Q1–Q6 formalizadas en decision resolution).

---

## 🏁 Definition of Done

* [ ] Pino instalado; `pino-logger.ts` implementado con instancia singleton.
* [ ] `redactors.ts` con `redactSecrets`, `redactPII`, `redactHeaders` implementados y verificados.
* [ ] `correlationContext` (`AsyncLocalStorage`) creado en `src/shared/context/correlation-id.ts`.
* [ ] `request-logger.middleware.ts` corre `correlationContext.run(...)` y emite log de req/res.
* [ ] `src/shared/logger.ts` expone el singleton.
* [ ] `env.ts` valida `LOG_LEVEL, LOG_PRETTY, LOG_INCLUDE_PII, SERVICE_VERSION` con fail-fast.
* [ ] Middleware registrado en `app.ts` en el orden correcto (después de correlation-id middleware de US-114).
* [ ] Tests UT-01..UT-08 verdes.
* [ ] Tests IT-01..IT-02 verdes.
* [ ] Regresión REG-01, REG-02 verdes (payloads de US-034/068..072 sin PII/secrets).
* [ ] Tests NT-01..NT-04 verdes (fail-fast).
* [ ] Smoke tests Docker verdes.
* [ ] `.env.example` documenta las nuevas env vars.
* [ ] Tech Lead valida en review.

---

## 📝 Notes

* Todas las decisiones son `Tech Recommendation — Documented in docs/14 §1659, docs/22 §1851/§2478/§3256, docs/10 §NFR-OBS-006/§NFR-PRIV-004, docs/19 §670`. No requieren decisión PO adicional.
* **Coexistencia con US-114**: US-113 asume que US-114 provee el header + genera el UUID. Si US-114 aún no está mergeada al momento de implementar US-113, US-113 emite con `correlationId=null` sin fallar — evita bloqueo mutuo. Cuando US-114 merge, ambas coexisten sin cambios adicionales.
* **Handoff con consumidores**: US-034 D5, US-068 SEC-02, US-069 SEC-02, US-070 SEC-02, US-072 SEC-02 declaran sus propios "campos permitidos en log". US-113 provee la infraestructura; los consumidores usan `logger.info({ ...camposPermitidos }, 'evento')`. La regresión REG-01 verifica que ningún consumidor filtra PII/secrets.
* **Future**: si en Future MVP se promueve APM/ELK/tracing, se agrega transport adicional al Pino sin cambiar la API del singleton logger (backward compatible).
* Sin Documentation Alignment Required significativo — US-113 sólo materializa lo que `docs/14, docs/22, docs/10, docs/19` ya declaran. Sólo se recomienda ampliar Traceability de PB-P2-010 con IDs canónicos.
* Priority "Should Have" alineada con PB-P2-010 MoSCoW.
