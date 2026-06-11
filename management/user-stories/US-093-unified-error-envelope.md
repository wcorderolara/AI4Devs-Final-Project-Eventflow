# 🧾 User Story: Error envelope unificado

## 🆔 Metadata

| Field              | Value                                    |
| ------------------ | ---------------------------------------- |
| ID                          | US-093                                   |
| Epic                        | EPIC-BE-001 — Backend Modular Monolith   |
| Feature                     | Error envelope                           |
| Backlog Item                | PB-P0-003                                |
| Module / Domain             | Platform/BE                              |
| User Role                   | System                                   |
| Priority                    | Must Have (P0)                           |
| Status                      | Approved                                 |
| Owner                       | Product Owner / Business Analyst         |
| Approved By                 | PO/BA Review                             |
| Approval Date               | 2026-06-11                               |
| Ready for Development Tasks | Yes                                      |
| Sprint / Milestone          | MVP                                      |
| Created Date                | 2026-06-09                               |
| Last Updated                | 2026-06-11                               |

---

## 🎯 User Story

**As the** sistema backend  
**I want** implementar el `errorHandlerMiddleware` con el error envelope estándar `{ error: { code, message, details?, correlationId } }`, los helpers de respuesta `success()` y `failure()`, la jerarquía de errores de dominio, el catálogo de códigos estándar, y el `correlationIdMiddleware` para propagar `X-Correlation-Id` en requests, logs y respuestas  
**So that** todos los errores sean predecibles, trazables y consumibles de forma uniforme por el frontend, los tests MSW y los agentes IA

---

## 🧠 Business Context

### Context Summary

Sin envelopes consistentes, cada endpoint emite formatos de error distintos y los clientes deben tratar errores caso por caso. ADR-API-002 formaliza el error envelope estándar y ADR-API-004 formaliza la propagación de Correlation ID. El `correlationIdMiddleware` es el primer middleware del pipeline de Express; el `errorHandlerMiddleware` es el último. Los helpers `success(data, meta?)` y `failure(code, message, details?)` garantizan que todos los controladores retornen el envelope correcto sin repetición de lógica. El catálogo de códigos de error (VALIDATION_ERROR, AUTHENTICATION_REQUIRED, FORBIDDEN, etc.) es el contrato estable que consume el frontend, MSW de tests y el cliente HTTP del sistema IA.

### Related Domain Concepts

* `errorHandlerMiddleware` — último middleware del pipeline Express; captura todos los errores, los mapea a HTTP + error envelope, y loguea el stack internamente
* `correlationIdMiddleware` — primer middleware del pipeline; lee `X-Correlation-Id` del header o genera UUID v4; propaga a `req.correlationId`, response header y error envelope
* Error envelope — `{ error: { code, message, details?, correlationId } }` (ADR-API-002)
* Success envelope — `{ data: {...}, pagination?: {...}, meta: { correlationId, timestamp } }` (ADR-API-002)
* Helpers `success()` / `failure()` — constructores de envelopes para controladores
* Jerarquía de errores de dominio — `DomainError` → ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, BusinessRuleViolationError, RateLimitError
* Catálogo de códigos — constantes estables (e.g., `VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `INTERNAL_ERROR`) consumidos por clientes
* Shared Kernel — módulo compartido donde residen los tipos de error, correlationId helpers y envelopes

### Assumptions

* El backend está bootstrapped con US-089 (pipeline de Express, `src/app.ts` y `src/shared/` disponibles).
* US-092 (Zod validation) usa este error envelope para retornar `400 VALIDATION_ERROR`; se puede desarrollar en paralelo definiendo el contrato de tipo.
* El catálogo de códigos de error es contrato estable con el frontend y con MSW de tests.
* `details[]` es obligatorio en `VALIDATION_ERROR` y `BUSINESS_RULE_VIOLATION`; opcional en otros errores.
* El `message` del envelope es siempre seguro para el usuario (sin stack traces, sin SQL, sin PII).

### Dependencies

* US-089 — Bootstrap Node + Express + TypeScript (pipeline Express y `src/shared/` disponibles)

---

## 🔗 Traceability

| Source                 | Reference                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no FRD directa; habilita manejo de errores consistente en todos los endpoints REST     |
| Use Case(s)            | Transversal — aplica a todos los UC que retornan errores HTTP                                         |
| Business Rule(s)       | BR-USER-002 (validación y mensajes de error seguros); BR-AUTH-001 (respuestas auth consistentes)     |
| Permission Rule(s)     | No aplica directamente (infraestructura de errores, no lógica de autorización)                       |
| Data Entity / Entities | N/A — capa Interface/Shared Kernel, sin persistencia directa                                          |
| API Endpoint(s)        | Todos los endpoints REST del backend (`/api/v1/*`) — contrato de error universal                     |
| NFR Reference(s)       | NFR-OBS-003, NFR-OBS-006, NFR-TEST-001                                                                |
| Related ADR(s)         | ADR-API-002 (Use Standard Response and Error Envelopes), ADR-API-004 (Use Correlation ID), ADR-BE-001 |
| Related Document(s)    | /docs/14 §18 (Error handling strategy), /docs/16 §14 (Modelo estándar de errores), /docs/22 §ADR-API-002, /docs/22 §ADR-API-004 |

---

## 🧩 PO/BA Decisions Applied

| Decisión                                           | Fuente                         | Aplicado                                                                                             |
| -------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Error envelope estándar `{error: {code, message, details?, correlationId}}` | ADR-API-002 (Accepted)         | Implementado en `errorHandlerMiddleware`; helpers `success()` y `failure()` lo producen             |
| Codes estables como contrato (no HTTP codes sueltos) | ADR-API-002, Doc 16 §14.2     | Catálogo de códigos como constantes TypeScript; cliente lee `error.code` para lógica programática    |
| `X-Correlation-Id` generado o propagado por request | ADR-API-004 (Accepted)         | `correlationIdMiddleware` es el primer middleware del pipeline                                       |
| Stack traces solo en logs internos, nunca al cliente | ADR-API-002, Doc 14 §18.2     | `errorHandlerMiddleware` loguea el stack; retorna al cliente solo `code`, `message`, `correlationId` |
| `details[]` obligatorio en `VALIDATION_ERROR` y `BUSINESS_RULE_VIOLATION` | Doc 16 §14.3    | Tipado en el helper `failure()` fuerza `details[]` para esos códigos                               |
| Inspiración RFC 7807 sin adherencia literal         | ADR-API-002                    | Envelope propio más simple; no se usa `type`, `status`, `title` de RFC 7807                         |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have (P0)

### Explicitly Out of Scope

* Logger estructurado (pino/winston) — el logger se configura en US-089 o historia de observabilidad dedicada; este envelope solo requiere que el logger exista
* `validateRequestMiddleware` con Zod — cubierto por US-092; US-093 define el contrato de error que US-092 consume
* Códigos de error de negocio específicos (e.g., `QUOTE_LIMIT_REACHED`, `CURRENCY_IMMUTABLE`) — se implementan en las historias de features; esta historia establece el mecanismo y el catálogo base
* Observabilidad enterprise (OpenTelemetry, APM, ELK, distributed tracing) — fuera del MVP (NFR-OBS-006)
* Microservicios, Kubernetes, brokers en MVP

### Scope Notes

* Esta historia define la **infraestructura** del error envelope (middlewares, helpers, jerarquía de clases, catálogo de códigos base). Los errores de negocio específicos (`CURRENCY_IMMUTABLE`, etc.) los declaran las historias de features.
* Respetar guardrails MVP (sin pagos reales, sin chat, sin push, sin moderación IA, sin RAG).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Error envelope estándar en todas las respuestas de error
**Given** cualquier endpoint del backend que produzca un error (4xx o 5xx)  
**When** el `errorHandlerMiddleware` procesa el error  
**Then** la respuesta tiene el formato `{ error: { code, message, correlationId } }`  
**And** el `code` pertenece al catálogo de códigos estándar  
**And** `message` es legible para humanos y no expone stack traces, SQL ni datos internos

### AC-02: Correlation ID generado o propagado por request
**Given** cualquier request HTTP al backend  
**When** llega al `correlationIdMiddleware` (primer middleware del pipeline)  
**Then** si el request incluye `X-Correlation-Id` en el header, ese valor se reutiliza  
**And** si no hay header, se genera un UUID v4 nuevo  
**And** el ID se almacena en `req.correlationId`  
**And** el ID se retorna en el response header `X-Correlation-Id`  
**And** el ID se incluye en `meta.correlationId` (éxito) y `error.correlationId` (error)

### AC-03: Mapeo correcto de errores de dominio a HTTP y código de catálogo
**Given** que el backend usa la jerarquía de errores de dominio (ValidationError, AuthenticationError, NotFoundError, etc.)  
**When** un use case o middleware lanza uno de estos errores  
**Then** el `errorHandlerMiddleware` lo mapea al código HTTP correcto y al código del catálogo:  
- `ValidationError` → 400 `VALIDATION_ERROR`  
- `AuthenticationError` → 401 `AUTHENTICATION_REQUIRED`  
- `AuthorizationError` → 403 `FORBIDDEN`  
- `NotFoundError` → 404 `RESOURCE_NOT_FOUND`  
- `ConflictError` → 409 `CONFLICT`  
- `BusinessRuleViolationError` → 422 `BUSINESS_RULE_VIOLATION`  
- `RateLimitError` → 429 `RATE_LIMIT_EXCEEDED`  
- Errores de infraestructura / inesperados → 500 `INTERNAL_ERROR`

### AC-04: Helpers de respuesta disponibles y tipados
**Given** que un controlador necesita retornar una respuesta  
**When** usa el helper `success(data, meta?)` o `failure(code, message, details?)`  
**Then** la respuesta incluye el envelope correcto con `meta.correlationId` y `meta.timestamp`  
**And** los tipos TypeScript garantizan la forma correcta del envelope

### AC-05: Stack trace interno nunca expuesto al cliente
**Given** que ocurre un `UnexpectedError` o una excepción no mapeada (500)  
**When** el `errorHandlerMiddleware` la captura  
**Then** el cliente recibe `{ error: { code: "INTERNAL_ERROR", message: "...", correlationId } }`  
**And** el stack trace y el contexto interno se loguean con el `correlationId`  
**And** ningún dato interno (stack, SQL, paths, tokens) se incluye en la respuesta

### AC-06: Tests del error envelope cubren 4xx y 5xx
**Given** la suite de tests de integración  
**When** se ejecutan los tests del error envelope  
**Then** se verifican al menos los siguientes casos: 400 (`VALIDATION_ERROR`), 401 (`AUTHENTICATION_REQUIRED`), 403 (`FORBIDDEN`), 404 (`RESOURCE_NOT_FOUND`), 409 (`CONFLICT`), 422 (`BUSINESS_RULE_VIOLATION`), 500 (`INTERNAL_ERROR`)  
**And** todos verifican la presencia de `error.correlationId`  
**And** todos verifican que no se expone stack trace

---

## ⚠️ Edge Cases

### EC-01: Request sin `X-Correlation-Id` header
**Given** un request HTTP sin el header `X-Correlation-Id`  
**When** el `correlationIdMiddleware` lo procesa  
**Then** genera un UUID v4 nuevo  
**And** lo propaga a `req.correlationId` y al response header

#### Handling
* `correlationIdMiddleware` siempre garantiza `req.correlationId`; nunca es undefined.

### EC-02: Excepción no mapeada en la jerarquía de errores
**Given** que se lanza un error genérico de JavaScript (no subclase de `DomainError`)  
**When** el `errorHandlerMiddleware` lo captura  
**Then** responde 500 con `{ error: { code: "INTERNAL_ERROR", message: "Error inesperado.", correlationId } }`  
**And** el error original se loguea completo internamente

#### Handling
* `errorHandlerMiddleware` tiene un catch-all para `UnexpectedError`.

### EC-03: `VALIDATION_ERROR` con `details[]` requerido
**Given** que el `validateRequestMiddleware` (US-092) lanza un `ValidationError`  
**When** el `errorHandlerMiddleware` lo procesa  
**Then** la respuesta incluye `details: [{ field, message }]` por cada campo inválido  
**And** retorna 400

#### Handling
* El helper `failure("VALIDATION_ERROR", msg, details)` fuerza el campo `details[]`.

### EC-04: `AuthorizationError` con masking (ownership privado)
**Given** que el error es de `AuthorizationError` marcado para masking (recurso privado)  
**When** el `errorHandlerMiddleware` lo procesa  
**Then** responde 404 `RESOURCE_NOT_FOUND` en lugar de 403  
**And** el log interno registra que fue en realidad un 403 con el correlationId

#### Handling
* La clase `AuthorizationError` acepta un flag `maskedAs404` para este caso.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                | Message / Behavior                                                    |
| ----- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| VR-01 | `error.message` nunca expone stack traces, SQL, nombres de archivo ni datos internos | Error envelope seguro; stack se loguea internamente                  |
| VR-02 | `error.correlationId` siempre presente en respuestas de error (4xx y 5xx)           | Trazabilidad obligatoria por ADR-API-004                              |
| VR-03 | `details[]` obligatorio en `VALIDATION_ERROR` y `BUSINESS_RULE_VIOLATION`            | Tipado en helper `failure()`; falla compilación si se omite           |
| VR-04 | Ningún controlador construye el envelope manualmente — usa `success()` / `failure()` | Lint rule; envelopes inconsistentes detectados en code review         |
| VR-05 | El catálogo de códigos es un enum/constante TypeScript estable (no strings literales) | Evita typos; contrato con cliente                                     |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | El `errorHandlerMiddleware` nunca expone stack traces, rutas internas, claves de API ni datos de BD en la respuesta del cliente.           |
| SEC-02 | Los errores 500 incluyen únicamente `code: "INTERNAL_ERROR"`, `message` genérico y `correlationId` — sin detalles técnicos.               |
| SEC-03 | El masking de 403 → 404 para recursos privados evita enumeración de IDs ajenos (ADR-SEC implícito, Doc 14 §17.3).                        |
| SEC-04 | Secrets vía Secrets Manager / env vars (no en repo).                                                                                      |
| SEC-05 | Logs sin PII / secretos en los mensajes de error envelope.                                                                                |

### Negative Authorization Scenarios
* No aplica directamente — esta historia implementa la infraestructura de respuesta de errores, no la lógica de autorización. El masking 403→404 (EC-04) es el único escenario de seguridad específico de esta historia.

---

## 🤖 AI Behavior

### AI Involvement
* AI Feature: None en esta historia
* Provider Layer: No aplica
* Human Validation Required: No aplica
* Persist AIRecommendation: No
* Fallback Required: No aplica

### AI Input
* No aplica — esta historia no invoca IA.

### AI Output
* No aplica.

### Human-in-the-loop Rules
* No aplica en esta historia.

### AI Error / Fallback Behavior
* Los códigos `AI_PROVIDER_TIMEOUT (504)` y `AI_PROVIDER_UNAVAILABLE (503)` son parte del catálogo de errores definido en esta historia. Su lanzamiento es responsabilidad de las historias de features IA.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| Screen / Route      | No aplica (capacidad técnica — sin UI propia)                                  |
| Main UI Pattern     | N/A                                                                            |
| Primary Action      | N/A                                                                            |
| Secondary Actions   | N/A                                                                            |
| Empty State         | N/A                                                                            |
| Loading State       | N/A                                                                            |
| Error State         | El frontend consume `error.code` para lógica programática y `error.message` para mostrar mensajes al usuario |
| Success State       | N/A                                                                            |
| Accessibility Notes | No aplica                                                                      |
| Responsive Notes    | No aplica                                                                      |
| i18n Notes          | `error.message` debe ser localizable (Accept-Language) en futuras iteraciones; MVP: español por defecto |
| Currency Notes      | No aplica                                                                      |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A — el frontend lee `error.code` para lógica y `error.message` para UI; no se construye un componente en esta historia
* State Management: N/A
* Forms: N/A
* API Client: El cliente HTTP del frontend normaliza errores extrayendo `error.code` y `error.message` del envelope (Doc 16 §14)

### Backend
* Use Case / Service: Capacidad técnica transversal habilitadora — no es un use case de negocio
* Controller / Route: Ninguno — el middleware es global y se registra en `src/app.ts`
* Authorization Policy: No aplica
* Validation: N/A en este middleware (la validación es US-092)
* Middleware pipeline:
  1. `correlationIdMiddleware` — **primer middleware** (lee o genera `X-Correlation-Id`)
  2. ... (auth, validation, controllers) ...
  3. `errorHandlerMiddleware` — **último middleware** (`app.use(errorHandlerMiddleware)`)
* Helpers en: `src/shared/response/success.ts`, `src/shared/response/failure.ts`
* Jerarquía de errores en: `src/shared/errors/` (DomainError, ValidationError, etc.)
* Catálogo de códigos en: `src/shared/errors/ErrorCodes.ts` (enum o constantes TypeScript)
* Transaction Required: No aplica

### Database
* Main Tables: N/A — infraestructura de respuesta, sin acceso a BD
* Constraints: N/A
* Index Considerations: N/A

### API

| Method | Endpoint     | Purpose                                                             |
| ------ | ------------ | ------------------------------------------------------------------- |
| ALL    | `/api/v1/*`  | El error envelope aplica a todas las rutas como handler global      |

### Observability / Audit
* Correlation ID Required: Yes — es el objeto central de esta historia
* Log Event Required: Yes — `errorHandlerMiddleware` loguea stack + contexto con correlationId a nivel `error` o `warn`; nunca al cliente
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                       | Type             |
| ----- | -------------------------------------------------------------- | ---------------- |
| TS-01 | Helper `success()` produce envelope correcto con correlationId | Unit             |
| TS-02 | Helper `failure()` produce error envelope correcto             | Unit             |
| TS-03 | `correlationIdMiddleware` propaga ID existente del header      | Unit/Integration |
| TS-04 | `correlationIdMiddleware` genera UUID v4 cuando no hay header  | Unit/Integration |
| TS-05 | `correlationIdMiddleware` retorna ID en response header        | Integration      |

### Negative Tests

| ID    | Scenario                                                           | Expected Result                                            |
| ----- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| NT-01 | `ValidationError` → 400 `VALIDATION_ERROR` con `details[]`        | Envelope correcto; `details` presente                      |
| NT-02 | `AuthenticationError` → 401 `AUTHENTICATION_REQUIRED`             | Envelope correcto; sin stack                               |
| NT-03 | `AuthorizationError` → 403 `FORBIDDEN`                            | Envelope correcto; sin stack                               |
| NT-04 | `AuthorizationError` con masking → 404 `RESOURCE_NOT_FOUND`       | Envelope 404; log interno registra 403                     |
| NT-05 | `NotFoundError` → 404 `RESOURCE_NOT_FOUND`                        | Envelope correcto; sin stack                               |
| NT-06 | `ConflictError` → 409 `CONFLICT`                                   | Envelope correcto; sin stack                               |
| NT-07 | `BusinessRuleViolationError` → 422 `BUSINESS_RULE_VIOLATION`       | Envelope correcto con `details[]`                          |
| NT-08 | Excepción no mapeada (UnexpectedError) → 500 `INTERNAL_ERROR`      | Envelope genérico; stack solo en logs                      |
| NT-09 | Error 500 no expone stack trace en la respuesta                    | `error.message` es genérico; sin paths, SQL ni traces      |
| NT-10 | `error.correlationId` presente en todos los errores 4xx y 5xx     | Siempre presente; coincide con `X-Correlation-Id` del request |

### AI Tests
* No aplica en esta historia. Los códigos `AI_PROVIDER_TIMEOUT` y `AI_PROVIDER_UNAVAILABLE` se testean en las historias de features IA.

### Authorization Tests

| ID         | Scenario                                                                        | Expected Result                               |
| ---------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| AUTH-TS-01 | `AuthorizationError` con masking retorna 404 y no 403 al cliente                | 404 en response; 403 real solo en logs internos |
| AUTH-TS-02 | Error 500 no expone información técnica que permita exploración del sistema      | `INTERNAL_ERROR` genérico; sin datos sensibles  |

### Accessibility Tests
* No aplica — capacidad técnica sin UI.

---

## 📊 Business Impact

| Field               | Value                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| KPI Affected        | Salud técnica, predictibilidad de errores, tiempo de debugging, experiencia de integración frontend |
| Expected Impact     | Contratos de error consistentes reducen bugs de integración; trazabilidad acelera debugging         |
| Success Criteria    | Todos los endpoints retornan errores en el formato estándar; correlationId presente en logs y response |
| Academic Demo Value | Demostración de Clean Architecture con manejo de errores enterprise-grade y observabilidad básica   |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica directamente — el cliente HTTP normalizará errores usando `error.code` y `error.message`.

### Potential Backend Tasks
* Implementar jerarquía de errores de dominio en `src/shared/errors/`.
* Implementar catálogo de códigos en `src/shared/errors/ErrorCodes.ts`.
* Implementar helpers `success()` y `failure()` en `src/shared/response/`.
* Implementar `correlationIdMiddleware` y registrarlo primero en el pipeline.
* Implementar `errorHandlerMiddleware` y registrarlo último en el pipeline.

### Potential Database Tasks
* No aplica.

### Potential AI / PromptOps Tasks
* No aplica en esta historia. Los códigos `AI_PROVIDER_TIMEOUT` y `AI_PROVIDER_UNAVAILABLE` se declaran en el catálogo pero se usan en historias de features IA.

### Potential QA Tasks
* Tests unitarios de helpers (TS-01, TS-02).
* Tests de integración de correlationId (TS-03, TS-04, TS-05).
* Tests negativos de mapeo de errores (NT-01 a NT-10).

### Potential DevOps / Config Tasks
* No aplica específicamente — los middlewares son código de aplicación.

---

## ✅ Definition of Ready

* [x] Rol claro (System).
* [x] Goal técnico claro y específico.
* [x] Referencias a ADR-API-002, ADR-API-004 y Doc 14 §18.
* [x] Backlog Item PB-P0-003 referenciado.
* [x] Seguridad — stack trace no expuesto, masking 403→404 documentado.
* [x] Jerarquía de errores y catálogo de códigos definidos.
* [x] AC en GWT específicos y testeables.
* [x] Edge cases documentados.
* [x] Validation rules claras.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (US-089).
* [x] UX states identificados (consumo de error.code por frontend).
* [x] Ubicación de artefactos técnicos definida (`src/shared/`).
* [x] Tests definidos (TS-01 a TS-05, NT-01 a NT-10).
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] `correlationIdMiddleware` implementado, primer middleware del pipeline, propagando ID a request, response header y logs.
* [ ] `errorHandlerMiddleware` implementado, último middleware del pipeline, mapeando jerarquía de errores a HTTP + error envelope.
* [ ] Jerarquía de errores de dominio implementada en `src/shared/errors/`.
* [ ] Catálogo de códigos de error en `src/shared/errors/ErrorCodes.ts` (sin strings literales en código).
* [ ] Helpers `success()` y `failure()` implementados y usados por todos los controladores (lint rule activa).
* [ ] NT-01 a NT-10 pasan en CI.
* [ ] Ningún test expone stack trace en la respuesta.
* [ ] Tech Lead valida la implementación.

---

## 📝 Notes

* **Documentation Alignment**: Doc 14 §18.3 usa `VALIDATION_FAILED` como code ejemplo, mientras ADR-API-002 y Doc 16 §14.2 usan `VALIDATION_ERROR`. La decisión vigente y formalizada (ADR-API-002, Accepted) establece `VALIDATION_ERROR` como código canónico. Se recomienda alinear Doc 14 §18.3 en el próximo ciclo de documentación; no bloquea esta historia.
* El error envelope está inspirado en RFC 7807 pero no lo sigue literalmente (sin `type`, `status`, `title`). Ver ADR-API-002 consecuencias.
* Los códigos de error de negocio específicos (`CURRENCY_IMMUTABLE`, `MAX_QUOTE_REQUESTS_EXCEEDED`, etc.) se declaran en las historias de features que los necesitan, no aquí. Esta historia establece el mecanismo y los códigos base del catálogo.
