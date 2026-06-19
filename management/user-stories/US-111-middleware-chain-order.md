# 🧾 User Story: Validar orden seguro de middlewares

## 🆔 Metadata

| Field              | Value |
| ------------------ | ----- |
| ID                 | US-111 |
| Epic               | EPIC-SEC-001 |
| Feature            | Middleware chain order |
| Module / Domain    | Security / Backend Platform |
| User Role          | System |
| Priority           | Must Have (P0) |
| Status             | Approved |
| Owner              | Product Owner / Business Analyst |
| Approved By        | Product Owner / Business Analyst Review |
| Approval Date      | 2026-06-16 |
| Ready for Development Tasks | Yes |
| Sprint / Milestone | MVP |
| Created Date       | 2026-06-09 |
| Last Updated       | 2026-06-16 |

---

## 🎯 User Story

**As a** sistema EventFlow  
**I want** definir, aplicar y probar el orden seguro de los middlewares globales y por ruta en Express  
**So that** autenticación, autorización, ownership, validación, rate limiting, captcha, headers de seguridad y manejo de errores no puedan omitirse por una composición incorrecta del pipeline.

---

## 🧠 Business Context

### Context Summary

EventFlow depende del backend como source of truth para autenticación, autorización, ownership y seguridad transversal. Un orden incorrecto de middlewares puede permitir bypasses, filtrar existencia de recursos, perder `correlationId`, registrar logs incompletos, exponer errores inseguros o ejecutar handlers antes de validar identidad, rol, ownership y payload.

US-111 endurece la composición del pipeline Express definido en PB-P0-007. Complementa US-091, que establece la base de middlewares, y US-110, que define límites estrictos de rate limiting por endpoint sensible.

### Related Domain Concepts

* Express middleware pipeline.
* `correlationIdMiddleware`.
* `requestLoggerMiddleware`.
* `corsMiddleware`.
* `helmet`.
* `authMiddleware`.
* `roleMiddleware`.
* `ownershipMiddleware`.
* `policyMiddleware` / route policy.
* `validateRequestMiddleware`.
* `rateLimitMiddleware`.
* `captchaVerificationMiddleware`.
* `notFoundMiddleware`.
* `errorHandlerMiddleware`.

### Assumptions

* US-091 provee la base técnica del pipeline de middlewares.
* US-108 y US-109 cubren cookies HTTP-only y captcha.
* US-110 cubre políticas específicas de rate limiting en auth y AI.
* Las rutas protegidas se registran mediante composición declarativa o helpers de ruta que reducen el riesgo de omitir `auth`, `role`, `ownership`, `policy` o `validation`.
* `helmet` y CORS se aplican globalmente antes de exponer rutas bajo `/api/v1`.

### Dependencies

* PB-P0-002 — Backend Modular Monolith Bootstrap.
* PB-P0-004 — REST API Endpoints.
* PB-P0-006 — Security Cookies HTTP-Only + Captcha.
* PB-P0-007 — Rate limiting en login/recovery/AI y cadena de middlewares en orden.
* US-091 — Middleware pipeline.
* US-110 — Rate limiting auth and AI.

### PO/BA Decisions Applied

| Decision | Applied Resolution |
| -------- | ------------------ |
| Scope de US-111 | US-111 cubre orden de middlewares, aplicación global de `helmet`/CORS/error handler y tests que verifican la composición. No define umbrales de rate limit; eso corresponde a US-110. |
| Orden canónico por ruta protegida | La secuencia obligatoria para rutas protegidas es `correlation → logging → security headers/CORS → rate limit applicable → auth → role → ownership/assignment → policy → validation → handler → notFound/errorHandler`. |
| Backend como source of truth | El frontend no decide autorización. `authMiddleware`, `roleMiddleware`, `ownershipMiddleware` y policies se ejecutan en backend antes del handler. |
| Error handling seguro | Todo error generado por un middleware debe fluir a `errorHandlerMiddleware`, devolver envelope estándar y preservar `correlationId` sin exponer stack traces ni secretos. |
| Separation from US-110 | US-111 puede verificar que `rateLimitMiddleware` esté posicionado correctamente, pero no define thresholds ni keying de rate limit. |

---

## 🔗 Traceability

| Source                 | Reference |
| ---------------------- | --------- |
| Backlog Item           | PB-P0-007 — Rate limiting en login/recovery/AI y cadena de middlewares en orden |
| FRD Requirement(s)     | Transversal — no implementa directamente un FR funcional; habilita seguridad y consistencia del API |
| Use Case(s)            | Transversal — no implementa directamente un UC; protege rutas de auth, eventos, quotes, AI, admin y seed |
| Business Rule(s)       | BR-AUTH-001, BR-AUTH-011, BR-PRIVACY-* |
| Permission Rule(s)     | Backend-enforced RBAC + ownership + assignment según Doc 5 y ADR-SEC-003 |
| Data Entity / Entities | No aplica — no introduce nuevas entidades ni persistencia |
| API Endpoint(s)        | Transversal a `/api/v1/*`; especialmente rutas protegidas por auth/role/ownership y rutas públicas sensibles |
| NFR Reference(s)       | NFR-SEC-001, NFR-SEC-002, NFR-SEC-003, NFR-SEC-004, NFR-SEC-007, NFR-OBS-003, NFR-OBS-006 |
| Related ADR(s)         | ADR-BE-001, ADR-SEC-001, ADR-SEC-003, ADR-SEC-004, ADR-SEC-006, ADR-API-002, ADR-API-003, ADR-API-004 |
| Related Document(s)    | `/docs/14-Backend-Technical-Design.md`, `/docs/16-API-Design-Specification.md`, `/docs/19-Security-and-Authorization-Design.md`, `/docs/20-Testing-Strategy.md`, `/docs/21-Deployment-and-DevOps-Design.md`, `/docs/22-Architecture-Decision-Records.md`, `management/artifacts/4-Product-Backlog-Prioritized.md` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have (P0)

### Explicitly Out of Scope

* Definir thresholds, ventanas o keying de rate limit de US-110.
* Implementar captcha provider o token plumbing de US-109.
* Modificar cookies HTTP-only de US-108.
* Crear nuevos endpoints funcionales.
* Crear nuevas tablas o persistencia.
* Reescribir reglas de negocio de dominio.
* Implementar WAF, API Gateway policies, Redis distribuido o hardening enterprise fuera del MVP.
* Introducir autenticación OAuth, MFA, SSO o autorización en frontend como fuente de verdad.

### Scope Notes

* Esta historia valida composición y orden del pipeline; no cambia el contrato funcional de los endpoints.
* `helmet` y CORS se consideran parte del pipeline global de seguridad de esta historia.
* Las rutas públicas sensibles pueden usar `rateLimitMiddleware`, `captchaVerificationMiddleware` y `validateRequestMiddleware` sin `authMiddleware`.
* Las rutas protegidas deben ejecutar `authMiddleware` antes de `roleMiddleware`, y `roleMiddleware` antes de `ownershipMiddleware` o assignment checks.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Global middleware order is deterministic

**Given** la aplicación Express inicia en cualquier entorno MVP  
**When** se registra el pipeline global  
**Then** `correlationIdMiddleware` corre antes de `requestLoggerMiddleware`, y `corsMiddleware`, `helmet`, body parser limitado, global rate limit laxo, rutas `/api/v1`, `notFoundMiddleware` y `errorHandlerMiddleware` quedan registrados en un orden determinístico y testeable.

### AC-02: Protected route middleware order prevents authorization bypass

**Given** una ruta protegida bajo `/api/v1/*` requiere identidad, rol y ownership  
**When** se compone la ruta  
**Then** la secuencia por ruta es `authMiddleware → roleMiddleware → ownershipMiddleware/assignmentMiddleware → policyMiddleware → validateRequestMiddleware → handler`, sin ejecutar el handler si una capa previa falla.

### AC-03: Public sensitive routes preserve anti-abuse before handler

**Given** una ruta pública sensible como `POST /api/v1/auth/login`, `POST /api/v1/auth/register` o `POST /api/v1/auth/password/reset-request`  
**When** se compone la ruta  
**Then** los middlewares de rate limit/captcha/validation aplicables se ejecutan antes del handler, y el handler no corre si rate limit, captcha o validation fallan.

### AC-04: Helmet and CORS are applied globally

**Given** una request entra a cualquier endpoint HTTP de EventFlow  
**When** el backend responde  
**Then** CORS usa allowlist por entorno y `helmet` agrega security headers mínimos conforme a ADR-SEC-006, sin comodines inseguros en entornos productivos o demo.

### AC-05: Error handler is always last

**Given** cualquier middleware o handler genera un error  
**When** el error se propaga con `next(err)`  
**Then** `errorHandlerMiddleware` lo procesa como último middleware, devuelve el error envelope estándar con `correlationId`, no expone stack traces ni secretos y registra el error de forma estructurada.

### AC-06: Not found handler does not shadow valid routes

**Given** una request apunta a una ruta inexistente bajo `/api/v1`  
**When** ninguna ruta registrada coincide  
**Then** `notFoundMiddleware` devuelve 404 estructurado antes de `errorHandlerMiddleware`; rutas válidas no son interceptadas por `notFoundMiddleware`.

### AC-07: Middleware order has regression tests

**Given** la suite de backend se ejecuta en CI  
**When** corren los tests de composición del pipeline  
**Then** cualquier cambio que reordene `auth`, `role`, `ownership`, `policy`, `validation`, `handler`, `notFound` o `errorHandler` de forma insegura falla la suite.

### AC-08: Observability preserves correlation across the full chain

**Given** una request válida, rechazada por auth/role/ownership/validation/rate limit/captcha o fallida por excepción  
**When** atraviesa el pipeline  
**Then** la respuesta y los logs incluyen `correlationId`, status y route pattern cuando aplique, sin registrar password, cookies, JWT, reset tokens, captcha tokens, secrets, prompts completos ni PII innecesaria.

---

## ⚠️ Edge Cases

### EC-01: `roleMiddleware` registered without `authMiddleware`

**Given** una ruta declara `roleMiddleware` pero no `authMiddleware` antes  
**When** se ejecuta la validación de composición o test de pipeline  
**Then** la suite falla o el helper de ruta rechaza la composición.

#### Handling

* Usar helper declarativo para rutas protegidas o test introspectivo de composición.
* Fallar en CI antes de merge.

### EC-02: `ownershipMiddleware` before identity resolution

**Given** una ruta intenta ejecutar `ownershipMiddleware` sin `req.user`  
**When** se valida la ruta  
**Then** se considera configuración insegura y la suite falla.

#### Handling

* `ownershipMiddleware` sólo puede ejecutarse después de `authMiddleware` y `roleMiddleware`.
* El error se registra como configuración de seguridad, no como autorización del usuario final.

### EC-03: `validateRequestMiddleware` before authorization

**Given** una ruta protegida valida payload antes de autenticar y autorizar  
**When** un usuario anónimo envía payload inválido  
**Then** la ruta no debe filtrar detalles de validación antes de resolver auth; la composición debe corregirse a `auth → role/ownership → policy → validation`.

#### Handling

* Tests negativos deben verificar que rutas protegidas con token ausente devuelven 401 antes de validación de payload.

### EC-04: Error thrown before `correlationId`

**Given** un error ocurre temprano en la cadena  
**When** la respuesta se genera  
**Then** debe existir `correlationId` en logs y response envelope porque `correlationIdMiddleware` es el primer middleware global.

#### Handling

* `correlationIdMiddleware` no debe depender de body parser, auth ni configuración externa.

---

## 🚫 Validation Rules

| ID | Rule | Message / Behavior |
| -- | ---- | ------------------ |
| VR-01 | `correlationIdMiddleware` debe registrarse antes de logging y rutas | CI falla si el orden cambia |
| VR-02 | `errorHandlerMiddleware` debe ser el último middleware global | CI falla si otro middleware queda después |
| VR-03 | `notFoundMiddleware` debe quedar después de rutas y antes de `errorHandlerMiddleware` | 404 estructurado para rutas no encontradas |
| VR-04 | Rutas protegidas deben usar `auth → role → ownership/assignment → policy → validation → handler` | CI falla si falta o se invierte una capa obligatoria |
| VR-05 | Rutas públicas sensibles deben ejecutar anti-abuse y validation antes del handler | Handler no corre si rate limit/captcha/validation falla |
| VR-06 | `helmet` y CORS deben estar habilitados globalmente por entorno | Startup/config validation o tests fallan ante configuración insegura |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
| -- | ---- |
| SEC-01 | Backend es la única fuente de verdad para auth, role, ownership, assignment y policy checks. |
| SEC-02 | `authMiddleware` retorna 401 para token ausente, inválido o expirado antes de evaluar role/ownership. |
| SEC-03 | `roleMiddleware` retorna 403 cuando el usuario autenticado no tiene rol permitido. |
| SEC-04 | `ownershipMiddleware` o assignment checks retornan 404 enmascarado o 403 según regla documentada, sin filtrar existencia del recurso. |
| SEC-05 | `validateRequestMiddleware` no debe ejecutarse antes de auth/role/ownership en rutas protegidas. |
| SEC-06 | CORS y `helmet` se aplican globalmente conforme a ADR-SEC-006. |
| SEC-07 | `errorHandlerMiddleware` no expone stack traces, SQL, secrets, tokens, cookies, prompts completos ni PII innecesaria. |

### Negative Authorization Scenarios

* Usuario anónimo accede a ruta protegida → 401 antes de validation.
* Usuario autenticado con rol incorrecto → 403 antes de ownership y handler.
* Usuario con rol correcto intenta recurso ajeno → 404 enmascarado o 403 según policy, sin ejecutar handler.
* Payload inválido en ruta protegida sin auth → 401, no 400.
* Middleware lanza excepción → error envelope seguro con `correlationId`.
* Ruta inexistente → 404 estructurado sin stack trace.
* Ruta pública sensible excede rate limit o falla captcha → handler no ejecuta side effects.

---

## 🤖 AI Behavior

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: No

### AI Input

* Not applicable.

### AI Output

* Not applicable.

### Human-in-the-loop Rules

* No aplica — esta historia no invoca IA directamente.

### AI Error / Fallback Behavior

* No aplica. Los endpoints IA quedan protegidos por el pipeline, pero esta historia no llama a `LLMProvider`, no crea `AIRecommendation` y no modifica fallback IA.

---

## 🎨 UX / UI Notes

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | N/A — historia técnica backend |
| Main UI Pattern     | N/A |
| Primary Action      | N/A |
| Secondary Actions   | N/A |
| Empty State         | N/A |
| Loading State       | N/A |
| Error State         | El frontend recibirá envelopes existentes 401/403/404/429/500 con `correlationId`; no hay UI nueva |
| Success State       | N/A |
| Accessibility Notes | No aplica — no introduce UI |
| Responsive Notes    | No aplica |
| i18n Notes          | Mensajes de error públicos deben seguir el contrato existente de i18n si aplica |
| Currency Notes      | No aplica |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: N/A.
* Components: N/A.
* State Management: N/A.
* Forms: N/A.
* API Client: Debe seguir consumiendo error envelope estándar; no decide autorización.

### Backend

* Use Case / Service: Express app composition / route middleware composition.
* Controller / Route: Transversal a `/api/v1/*`.
* Authorization Policy: `authMiddleware`, `roleMiddleware`, `ownershipMiddleware`, assignment/policy checks.
* Validation: `validateRequestMiddleware(schema)` después de auth/role/ownership/policy en rutas protegidas.
* Transaction Required: No.
* Canonical protected route order: `auth → role → ownership/assignment → policy → validation → handler`.
* Canonical global order: `correlation → logging → body/parser limits → CORS → helmet → global rate limit → routes → notFound → errorHandler`.
* Public sensitive route order: `rateLimit/captcha/validation → handler`, según endpoint.

### Database

* Main Tables: N/A.
* Constraints: N/A.
* Index Considerations: N/A.
* No migrations required.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| ALL | `/api/v1/*` | Aplicar composición segura de middlewares |
| ALL | rutas protegidas | Enforce `auth → role → ownership/assignment → policy → validation → handler` |
| POST | `/api/v1/auth/register` | Validar anti-abuse antes del handler |
| POST | `/api/v1/auth/login` | Validar anti-abuse antes del handler |
| POST | `/api/v1/auth/password/reset-request` | Validar anti-abuse antes del handler |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes, vía `requestLoggerMiddleware` y security/error logs.
* AdminAction Required: No — esta historia no representa acción administrativa de dominio.
* AIRecommendation Required: No.
* Logs no deben incluir secretos, tokens, cookies, password, captcha token, reset token, prompts completos ni PII innecesaria.

---

## 🧪 Test Scenarios

### Functional Tests

| ID | Scenario | Type |
| -- | -------- | ---- |
| TS-01 | App registra `correlationIdMiddleware` antes de logger y rutas | Unit/Integration |
| TS-02 | `helmet` y CORS se aplican globalmente | Integration/API |
| TS-03 | Ruta protegida válida ejecuta middlewares en orden y luego handler | Integration |
| TS-04 | Ruta pública sensible ejecuta anti-abuse/validation antes del handler | Integration/API |
| TS-05 | Ruta inexistente devuelve 404 estructurado antes del error handler | API |

### Negative Tests

| ID | Scenario | Expected Result |
| -- | -------- | --------------- |
| NT-01 | Anónimo llama ruta protegida con payload inválido | 401 antes de validation |
| NT-02 | Usuario con rol incorrecto llama ruta protegida | 403 antes de ownership/handler |
| NT-03 | Usuario intenta recurso ajeno | 404 enmascarado o 403 según policy, handler no corre |
| NT-04 | Middleware arroja error | Error envelope seguro con `correlationId` |
| NT-05 | Composición registra `errorHandlerMiddleware` antes de rutas | Test falla |
| NT-06 | Composición omite `roleMiddleware` en ruta que exige rol | Test falla |
| NT-07 | `validateRequestMiddleware` corre antes de auth en ruta protegida | Test falla |

### AI Tests

No aplica — esta historia no invoca IA directamente.

### Authorization Tests

| ID | Scenario | Expected Result |
| -- | -------- | --------------- |
| AUTH-TS-01 | Ruta protegida sin sesión | 401 |
| AUTH-TS-02 | Ruta protegida con rol incorrecto | 403 |
| AUTH-TS-03 | Ruta protegida con ownership incorrecto | 404 enmascarado o 403 |
| AUTH-TS-04 | Ruta protegida válida | Handler ejecuta después de auth/role/ownership/policy/validation |

### Accessibility Tests

No aplica — no introduce UI.

### Security Tests

| ID | Scenario | Expected Result |
| -- | -------- | --------------- |
| SEC-TS-01 | Headers de seguridad presentes | `helmet` aplicado |
| SEC-TS-02 | CORS con origin no permitido | Rechazo según configuración |
| SEC-TS-03 | Error 500 simulado | Sin stack trace ni secretos |
| SEC-TS-04 | Logs de errores y seguridad | Contienen `correlationId`, no contienen tokens/PII sensible |

### Seed / Demo Tests

| ID | Scenario | Expected Result |
| -- | -------- | --------------- |
| DEMO-TS-01 | Demo smoke ejecuta login y ruta protegida | Pipeline mantiene correlation, headers, auth y error envelope |
| DEMO-TS-02 | Ruta inexistente en Demo | 404 estructurado con `correlationId` |

---

## 📊 Business Impact

| Field               | Value |
| ------------------- | ----- |
| KPI Affected        | Seguridad operativa, estabilidad API, defect leakage, demo readiness |
| Expected Impact     | Reduce bypasses de autorización y errores por composición inconsistente |
| Success Criteria    | Tests de pipeline y seguridad verdes en CI; headers/error envelope verificables |
| Academic Demo Value | Evidencia técnica de backend seguro, trazable y alineado a ADRs |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No se esperan tareas frontend salvo ajuste de manejo genérico de error envelope si ya no estuviera implementado.

### Potential Backend Tasks

* Definir helper o composición declarativa para rutas protegidas.
* Aplicar orden global de middlewares en `app.ts`.
* Asegurar `helmet`, CORS, `notFoundMiddleware` y `errorHandlerMiddleware`.
* Agregar pruebas de orden y bypass prevention.

### Potential Database Tasks

* No aplica.

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* Tests unitarios/integración de composición.
* Tests API con Supertest para 401/403/404/429/500.
* Tests de seguridad para headers y redacción de errores/logs.
* Smoke demo de pipeline.

### Potential DevOps / Config Tasks

* Validar variables CORS/Helmet por entorno.
* Asegurar que CI ejecute suite de middleware/security como quality gate.

---

## ✅ Definition of Ready

| Item | Status |
| ---- | ------ |
| Business value clear | Ready |
| Backlog item identified | Ready |
| Acceptance Criteria testable | Ready |
| Dependencies identified | Ready |
| Security expectations clear | Ready |
| AI expectations clear | Ready |
| QA expectations clear | Ready |
| Seed/demo impact clear | Ready |
| Out of scope explicit | Ready |
| No blocking PO/BA decisions | Ready |

---

## ✅ Definition of Done

* Orden global de middlewares implementado y documentado en código/configuración.
* Orden por ruta protegida garantizado por helper, composición declarativa o pruebas.
* `helmet` y CORS aplicados globalmente conforme a ADR-SEC-006.
* `notFoundMiddleware` y `errorHandlerMiddleware` ubicados al final en orden correcto.
* Tests verifican que auth ocurre antes de role, role antes de ownership, ownership/policy antes de validation y validation antes del handler.
* Tests verifican que rutas públicas sensibles no ejecutan handler si rate limit/captcha/validation falla.
* Error envelope mantiene `correlationId` y no expone stack traces ni secretos.
* Logs estructurados preservan `correlationId` y redacción de datos sensibles.
* CI ejecuta la suite de middleware/security como quality gate.

---

## 📝 Notes

* US-111 no define límites de rate limit. Esa decisión pertenece a US-110.
* US-111 no implementa captcha provider. Esa responsabilidad pertenece a US-109.
* US-111 no cambia cookies HTTP-only. Esa responsabilidad pertenece a US-108.
* La historia es técnica/transversal; su valor es prevenir bypasses y regresiones de seguridad en todos los endpoints.
