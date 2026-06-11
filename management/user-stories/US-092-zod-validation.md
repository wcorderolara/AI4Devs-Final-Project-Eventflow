# 🧾 User Story: Validación con Zod en todos los DTOs

## 🆔 Metadata

| Field              | Value                                    |
| ------------------ | ---------------------------------------- |
| ID                          | US-092                                   |
| Epic                        | EPIC-BE-001 — Backend Modular Monolith   |
| Feature                     | Validación DTO con Zod                   |
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
**I want** implementar un middleware `validateRequestMiddleware(schema)` con Zod `.strict()` para body, params y query en cada endpoint HTTP, y validar con Zod el output de IA antes de persistirlo  
**So that** todos los contratos de entrada y salida sean seguros, tipados y consistentes para el frontend, los tests MSW y los agentes IA

---

## 🧠 Business Context

### Context Summary

Zod es la herramienta de validación de DTOs formalizada en ADR-API-003. Provee validación en runtime junto con inferencia de tipos TypeScript desde una sola definición de schema. Cada endpoint del backend declara schemas `.strict()` para body, params y query en la capa Interface. El middleware `validateRequestMiddleware(schema)` intercepta requests inválidos antes de que lleguen a los controladores, devolviendo `400 VALIDATION_ERROR` con `details[]` por campo. Los outputs de IA se validan con Zod antes de persistirse. Esto garantiza contratos estables y predecibles para el frontend, los mocks MSW y los agentes IA que consumen la API.

### Related Domain Concepts

* `validateRequestMiddleware(schema)` — middleware reutilizable que valida body, params y query con un schema Zod
* `VALIDATION_ERROR` — código de error estándar del error envelope ante inputs inválidos (ver US-093)
* Request DTO — tipo derivado del schema Zod con `.strict()` en la capa Interface
* DTO de output IA — schema Zod que valida el JSON retornado por el LLM antes de persistir
* `dto/` — carpeta por módulo donde residen los schemas Zod de entrada y salida

### Assumptions

* El backend está bootstrapped con US-089 (proyecto Node + Express + TypeScript inicializado).
* El error envelope unificado (`{code, message, details}`) está implementado en US-093 y es el mecanismo que usa `validateRequestMiddleware` para retornar errores.
* Los schemas Zod comparten tipos entre backend y frontend cuando aplique.
* `.strict()` es la opción por defecto en todos los schemas de entrada; `.passthrough()` está prohibido.

### Dependencies

* US-089 — Bootstrap Node + Express + TypeScript (prerequisito técnico)
* US-093 — Unified Error Envelope (el middleware de validación retorna el error en el formato de US-093)

---

## 🔗 Traceability

| Source                 | Reference                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no FRD directa; habilita validación de inputs en todos los endpoints REST del MVP   |
| Use Case(s)            | Transversal — aplica a todos los UC que reciben input HTTP                                         |
| Business Rule(s)       | BR-USER-002 (validación de inputs de usuario)                                                      |
| Permission Rule(s)     | No aplica directamente (validación sintáctica, pre-autenticación)                                  |
| Data Entity / Entities | N/A — capa Interface, sin persistencia directa                                                     |
| API Endpoint(s)        | Todos los endpoints REST del backend (`/api/v1/*`)                                                 |
| NFR Reference(s)       | NFR-SEC-007, NFR-TEST-001, NFR-TEST-002                                                            |
| Related ADR(s)         | ADR-API-003 (Use Zod for Request DTO Validation), ADR-BE-001                                       |
| Related Document(s)    | /docs/14 §14 (DTO and validation strategy), /docs/16, /docs/19, /docs/22 §ADR-API-003             |

---

## 🧩 PO/BA Decisions Applied

| Decisión                              | Fuente                          | Aplicado                                                                                           |
| ------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Zod como librería de validación de DTOs | ADR-API-003 (Accepted)          | Todos los schemas usan Zod; `class-validator` rechazado por requerir decoradores y `reflect-metadata` |
| `.strict()` por defecto               | ADR-API-003, Doc 14 §14.3      | Ningún schema usa `.passthrough()`; campos inesperados retornan 400                                |
| Schemas por feature en `dto/`         | Doc 14 §14 + ADR-API-003        | Cada módulo organiza sus schemas en `src/modules/<module>/dto/`                                    |
| Output de IA validado con Zod         | Doc 14 §14.2, Doc 22 §ADR-API-003 | Zod estricto en outputs LLM antes de persistir                                                    |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have (P0)

### Explicitly Out of Scope

* Validación semántica (referencias existen, estado coherente) — corresponde a la capa Application
* Validación de reglas de negocio (BR-*) — corresponde a la capa Domain
* Generación automática de OpenAPI desde schemas Zod — cubierto por PB-P0-005 (US-098)
* Error envelope unificado — cubierto por US-093
* Microservicios, Kubernetes, brokers en MVP

### Scope Notes

* Esta historia cubre exclusivamente la validación sintáctica (forma, tipos, formato, longitudes) en la capa Interface con Zod.
* Respetar guardrails MVP (sin pagos reales, sin chat, sin push, sin moderación IA, sin RAG).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Middleware de validación Zod operativo
**Given** el backend está inicializado (US-089)  
**When** un request HTTP llega a un endpoint que declara un schema Zod para body, params o query  
**Then** el middleware `validateRequestMiddleware(schema)` valida la entrada con `.strict()`  
**And** el request válido pasa al controlador sin modificación  
**And** los tipos TypeScript del request están derivados del schema Zod

### AC-02: Rechazo de input inválido con 400 VALIDATION_ERROR
**Given** un endpoint con schema Zod declarado  
**When** llega un request con datos malformados, campos faltantes o tipo incorrecto  
**Then** el servidor responde HTTP 400  
**And** el body contiene `{ code: "VALIDATION_ERROR", message: "...", details: [{ field, message }] }`  
**And** no se filtran stack traces ni datos internos en la respuesta

### AC-03: Organización de schemas por módulo
**Given** la estructura de carpetas del proyecto  
**When** se crean schemas Zod para un módulo de dominio  
**Then** los schemas residen en `src/modules/<module>/dto/`  
**And** todos los schemas de entrada usan `.strict()` por defecto  
**And** no existe ningún schema con `.passthrough()`

### AC-04: Validación de output de IA con Zod
**Given** que el LLM retorna un JSON de respuesta  
**When** el sistema procesa el output de IA  
**Then** el JSON se valida contra el schema Zod correspondiente antes de persistirse  
**And** si el output no cumple el schema, se rechaza, se registra como error y se notifica al usuario

### AC-05: Compatibilidad multi-environment
**Given** entornos Local, CI, QA y Demo  
**When** se ejecutan los tests de validación  
**Then** el middleware y schemas funcionan consistentemente en todos los entornos  
**And** el runner de CI reporta resultados deterministas

---

## ⚠️ Edge Cases

### EC-01: Campo inesperado en body rechazado por `.strict()`
**Given** un endpoint con schema Zod `.strict()`  
**When** el request incluye un campo no declarado en el schema  
**Then** el servidor responde 400 VALIDATION_ERROR  
**And** el campo inesperado no pasa al controlador

#### Handling
* Schema `.strict()` activo en todos los Request DTOs de la capa Interface.

### EC-02: Tipo incorrecto en parámetro de ruta o query
**Given** que un endpoint espera `event_id` como UUID  
**When** el request envía un valor con formato inválido (e.g., `"not-a-uuid"`)  
**Then** el servidor responde 400 VALIDATION_ERROR  
**And** el `details[]` indica el campo afectado y el error de validación

#### Handling
* Zod `.uuid()` en params; `.enum()` en query strings con valores acotados.

### EC-03: Output de IA con estructura inesperada
**Given** que el LLM retorna un JSON que no cumple el schema de output  
**When** se intenta validar el output  
**Then** la validación Zod falla y el output es rechazado  
**And** el error se registra con correlation ID para trazabilidad  
**And** el usuario recibe un error controlado (sin stack trace)

#### Handling
* Zod estricto en schemas de output IA; manejo de error en capa Application.

---

## 🚫 Validation Rules

| ID    | Rule                                                          | Message / Behavior                                          |
| ----- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| VR-01 | Todos los Request DTOs usan Zod `.strict()` en body/params/query | 400 VALIDATION_ERROR con `details[]` por campo             |
| VR-02 | Ningún schema usa `.passthrough()`                            | Lint rule; falla CI si se detecta `.passthrough()` en uso  |
| VR-03 | Schemas en `src/modules/<module>/dto/`                        | Por convención de arquitectura (Doc 14 §14 + ADR-API-003)  |
| VR-04 | Output de IA validado con Zod antes de persistir              | Rechazo y registro de error si no cumple el schema          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Zod `.strict()` rechaza campos inesperados, previniendo inyección de campos no declarados en el contrato HTTP.    |
| SEC-02 | Los mensajes de error de validación exponen solo el campo y el tipo esperado; nunca stack traces ni datos internos. |
| SEC-03 | Secrets vía Secrets Manager / env vars (no en repo).                                                              |
| SEC-04 | Logs sin PII / secretos en los mensajes de error de validación.                                                   |

### Negative Authorization Scenarios
* No aplica directamente — esta historia no introduce endpoints con autorización; implementa la capa de validación sintáctica previa a la autorización.

---

## 🤖 AI Behavior

### AI Involvement
* AI Feature: Validación de output IA (AC-04)
* Provider Layer: No aplica directamente — esta historia define los schemas Zod usados por el LLMProvider
* Human Validation Required: No aplica en esta historia (HITL implementado en historias de features IA)
* Persist AIRecommendation: No
* Fallback Required: No aplica en esta historia

### AI Input
* No aplica — esta historia define schemas de validación, no invoca IA.

### AI Output
* Los schemas Zod de output IA (e.g., `EventPlanAIOutput`) se declaran en esta historia como parte de la estrategia de validación.

### Human-in-the-loop Rules
* No aplica en esta historia — el HITL es responsabilidad de las historias de features IA.

### AI Error / Fallback Behavior
* Si el output del LLM no cumple el schema Zod, se rechaza y registra como error (EC-03). El fallback a MockAIProvider se implementa en la historia de configuración IA.

---

## 🎨 UX / UI Notes

| Area                | Notes                                        |
| ------------------- | -------------------------------------------- |
| Screen / Route      | No aplica (capacidad técnica — sin UI propia) |
| Main UI Pattern     | N/A                                          |
| Primary Action      | N/A                                          |
| Secondary Actions   | N/A                                          |
| Empty State         | N/A                                          |
| Loading State       | N/A                                          |
| Error State         | Los errores 400 son consumidos por el frontend a través del error envelope (US-093) |
| Success State       | N/A                                          |
| Accessibility Notes | No aplica                                    |
| Responsive Notes    | No aplica                                    |
| i18n Notes          | No aplica                                    |
| Currency Notes      | No aplica                                    |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A — el frontend consume los errores `400 VALIDATION_ERROR` del error envelope (US-093)
* State Management: N/A
* Forms: React Hook Form + Zod puede reutilizar schemas del backend (fuera del scope de esta historia)
* API Client: N/A en esta historia

### Backend
* Use Case / Service: Capacidad técnica transversal habilitadora — no es un use case de negocio
* Controller / Route: El middleware se registra en la pipeline de Express antes de los controladores
* Authorization Policy: No aplica — la validación Zod es pre-autorización (capa Interface)
* Validation: `validateRequestMiddleware(schema)` con Zod `.strict()` en body, params y query
* Middleware pattern: `router.post('/events', validateRequestMiddleware(CreateEventSchema), controller.createEvent)`
* Schemas en: `src/modules/<module>/dto/<action>Request.schema.ts`
* Transaction Required: No aplica

### Database
* Main Tables: N/A — validación en capa Interface, sin acceso a BD
* Constraints: N/A
* Index Considerations: N/A

### API

| Method | Endpoint           | Purpose                                                                        |
| ------ | ------------------ | ------------------------------------------------------------------------------ |
| ALL    | `/api/v1/*`        | Todos los endpoints usan `validateRequestMiddleware` cuando tienen input formal |

### Observability / Audit
* Correlation ID Required: Yes — los errores de validación incluyen correlation ID para trazabilidad
* Log Event Required: Yes — errores de validación logueados a nivel `warn` con campo, valor esperado y correlation ID (sin PII)
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                     | Type             |
| ----- | ------------------------------------------------------------ | ---------------- |
| TS-01 | Request válido pasa el middleware sin modificación           | Unit/Integration |
| TS-02 | Schema `.strict()` derivado como tipo TypeScript correctamente | Unit             |
| TS-03 | Middleware reutilizable en múltiples rutas                   | Integration      |

### Negative Tests

| ID    | Scenario                                               | Expected Result                            |
| ----- | ------------------------------------------------------ | ------------------------------------------ |
| NT-01 | Body con campo faltante requerido                      | 400 VALIDATION_ERROR con details[]         |
| NT-02 | Body con campo extra no declarado en schema `.strict()` | 400 VALIDATION_ERROR                       |
| NT-03 | Param UUID inválido                                    | 400 VALIDATION_ERROR con campo indicado    |
| NT-04 | Query string con valor fuera de enum                   | 400 VALIDATION_ERROR con campo indicado    |
| NT-05 | Output de IA no conforme al schema Zod                 | Rechazo y registro de error; sin persistir |
| NT-06 | Schema con `.passthrough()` detectado en lint          | Falla CI (lint rule activa)                |

### AI Tests
* NT-05 cubre la validación de output de IA con Zod. Los tests de IA completos (MockAIProvider, timeout, reintentos) se implementan en las historias de features IA.

### Authorization Tests

| ID         | Scenario                                                    | Expected Result         |
| ---------- | ----------------------------------------------------------- | ----------------------- |
| AUTH-TS-01 | Ningún campo no declarado en schema `.strict()` llega al controlador | Pass — campo rechazado |

### Accessibility Tests
* No aplica — capacidad técnica sin UI.

---

## 📊 Business Impact

| Field               | Value                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| KPI Affected        | Salud técnica, seguridad de inputs, estabilidad de contratos API                          |
| Expected Impact     | Habilita features de producto con contratos seguros; reduce errores de integración frontend-backend |
| Success Criteria    | Todos los endpoints rechazan inputs malformados con 400 VALIDATION_ERROR; lint pasa en CI |
| Academic Demo Value | Demostración de Clean Architecture con validación de boundary, tipo-seguridad y seguridad de inputs |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica directamente — el frontend consume los errores 400 a través del error envelope.

### Potential Backend Tasks
* Implementar `validateRequestMiddleware(schema)` reutilizable.
* Declarar schemas Zod `.strict()` en `src/modules/<module>/dto/` para cada módulo de la fase P0.
* Registrar middleware en la pipeline Express por ruta.
* Implementar schemas de output IA con Zod.

### Potential Database Tasks
* No aplica.

### Potential AI / PromptOps Tasks
* Definir schemas Zod de output IA (e.g., `EventPlanAIOutput`) para validación previa a persistencia.

### Potential QA Tasks
* Tests unitarios del middleware (NT-01 a NT-04).
* Test de validación de output IA (NT-05).
* Lint rule para prohibir `.passthrough()` (NT-06).

### Potential DevOps / Config Tasks
* Configurar lint rule para detectar `.passthrough()` en CI.

---

## ✅ Definition of Ready

* [x] Rol claro (System).
* [x] Goal técnico claro y específico.
* [x] Referencias a ADR-API-003 y Doc 14 §14.
* [x] Backlog Item PB-P0-003 referenciado.
* [x] Seguridad — `.strict()` como control de validación.
* [x] Entidades/capas identificadas (Interface, dto/).
* [x] AC en GWT específicos y testeables.
* [x] Edge cases documentados.
* [x] Validation rules claras.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (US-089, US-093).
* [x] UX states identificados (N/A).
* [x] API/middleware pattern definido.
* [x] Tests definidos (positivos y negativos).
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] `validateRequestMiddleware(schema)` implementado y reutilizable.
* [ ] Todos los endpoints P0 del MVP declaran schemas Zod `.strict()` en body, params y query.
* [ ] Schemas organizados en `src/modules/<module>/dto/`.
* [ ] Ningún schema usa `.passthrough()` (lint rule activa en CI).
* [ ] NT-01 a NT-06 pasan en CI.
* [ ] Output de IA validado con Zod antes de persistir (AC-04).
* [ ] Tech Lead valida la implementación.

---

## 📝 Notes

* Esta historia cubre exclusivamente la validación **sintáctica** (capa Interface). La validación semántica y de reglas de negocio es responsabilidad de las capas Application y Domain respectivamente (Doc 14 §14.2).
* La generación de OpenAPI desde schemas Zod (`zod-to-openapi`) se cubre en PB-P0-005 / US-098, no en esta historia.
* El error envelope `{code, message, details}` es implementado por US-093; este middleware lo consume.
