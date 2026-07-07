# 🧾 User Story: Suite contract con MSW alineado a API

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-127                               |
| Epic               | EPIC-QA-001                          |
| Feature            | Contract tests                       |
| Backlog Item       | PB-P2-015                            |
| Module / Domain    | QA                                   |
| User Role          | System                               |
| Priority           | Must Have                            |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-07-07                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP                                  |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-07-07                           |

---

## 🎯 User Story

**As the** equipo QA / Frontend
**I want** mantener los handlers de MSW del frontend alineados al contrato real de la API del backend, validando la forma de las respuestas contra esquemas Zod compartidos (y derivando handlers desde el snapshot OpenAPI cuando esté disponible)
**So that** los tests del frontend no mientan respecto a producción y detecten drift cuando el backend cambia un DTO sin sincronizar el frontend.

---

## 🧠 Business Context

### Context Summary
Los tests de contrato garantizan la consistencia entre el contrato API expuesto por el backend y el contrato consumido por el frontend (Doc 20 §6.4). Los handlers de MSW deben reflejar las respuestas reales del backend; los tests validan la forma de la respuesta mediante esquemas Zod compartidos y fallan cuando un DTO cambia sin sincronizarse. Cuando existe el snapshot OpenAPI (PB-P0-005), los handlers y/o la validación se derivan de él para reducir el mantenimiento manual.

### Related Domain Concepts
* Esquemas Zod compartidos entre frontend y backend (contrato de request/response).
* Handlers MSW alineados al contrato real.
* Snapshot OpenAPI generado desde Zod (`zod-to-openapi`), cuando está disponible.
* Detección de drift entre capas (DTO backend vs consumo frontend).

### Assumptions
* La estrategia de pruebas de contrato está definida en `/docs/20-Testing-Strategy.md` §6.4.
* El stack de pruebas frontend usa Vitest + Testing Library + MSW (Doc 20 §21, ADR-TEST-001).
* El snapshot OpenAPI (PB-P0-005) puede o no existir al momento de implementar; su uso es best-effort ("generado desde OpenAPI cuando posible").

### Dependencies
* PB-P0-005 — OpenAPI snapshot desde Zod (dependencia best-effort para generar handlers/validación).
* PB-P0-015 — Base de CI/pipeline que ejecuta las compuertas de calidad.
* Contratos de API definidos en `/docs/16-API-Design-Specification.md` y esquemas Zod existentes.

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa directamente un UC; habilita capacidades de calidad. |
| Use Case(s)            | Transversal — protege el contrato consumido por múltiples UC.   |
| Business Rule(s)       | Transversal — no valida BR-* directamente; valida forma de contrato. |
| Permission Rule(s)     | No aplica runtime authorization — los handlers MSW no son fuente de autorización; el backend sigue siendo source of truth. |
| Data Entity / Entities | Transversal — DTOs de request/response de endpoints clave.      |
| API Endpoint(s)        | Endpoints clave del contrato (Doc 16); handlers MSW alineados por endpoint. |
| NFR Reference(s)       | NFR-TEST-*, NFR-PERF-API-001, NFR-OBS-001                       |
| Related ADR(s)         | ADR-TEST-001 (Vitest + Supertest), ADR-DEVOPS-001               |
| Related Document(s)    | /docs/20-Testing-Strategy.md (§6.4), /docs/16-API-Design-Specification.md, /docs/15-Frontend-Architecture-Design.md, /docs/21-Deployment-and-DevOps-Design.md |
| Backlog Item           | PB-P2-015                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have

### In Scope
* Handlers de MSW para los endpoints clave del contrato, alineados a las respuestas reales del backend.
* Esquemas Zod compartidos para validar la forma de las respuestas en el frontend.
* Tests de contrato que fallan cuando un DTO del backend cambia sin sincronizar el handler/schema del frontend (drift detection).
* Derivación de handlers y/o validación desde el snapshot OpenAPI cuando esté disponible (best-effort).
* Ejecución como compuerta de CI determinística.

### Explicitly Out of Scope
* Suite unit + integration del backend (US-126 / PB-P2-014).
* Suite E2E Playwright sobre seed (PB-P2-016).
* Suite completa de componentes/páginas del frontend como ítem propio (Doc 20 §6.5).
* Generación del snapshot OpenAPI en sí (PB-P0-005 / US-098).
* Llamadas de red reales al backend durante los tests de contrato.
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* Respetar los guardrails MVP y la pirámide de pruebas de Doc 20.
* Los handlers MSW no deben ocultar los contratos de error (401/403/4xx) que el frontend debe manejar.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Handlers MSW alineados al contrato real
**Given** los endpoints clave del contrato de la API (Doc 16)
**When** se configuran los handlers de MSW del frontend
**Then** existen handlers para los endpoints clave cuyas respuestas reflejan la forma del contrato real del backend (envelope `{ data | error }`, campos y tipos).

### AC-02: Validación de forma vía esquemas Zod compartidos
**Given** una respuesta mockeada por MSW
**When** el test de contrato valida la respuesta
**Then** la forma de la respuesta se valida contra el esquema Zod compartido y el test pasa solo si la respuesta cumple el contrato.

### AC-03: Detección de drift
**Given** un cambio en un DTO del backend que no se sincroniza en el frontend
**When** se ejecuta la suite de contrato
**Then** al menos un test falla de forma explícita, señalando la incompatibilidad de contrato entre capas.

### AC-04: Derivación desde OpenAPI cuando esté disponible
**Given** que existe el snapshot OpenAPI (PB-P0-005)
**When** se generan/validan los handlers y esquemas de contrato
**Then** los handlers y/o la validación se derivan del snapshot OpenAPI; si el snapshot no existe, se usan esquemas Zod compartidos como fuente y se documenta el modo best-effort.

### AC-05: Determinismo y compuerta de CI
**Given** la suite de contrato ejecutándose en CI
**When** se ejecuta varias veces
**Then** el resultado es determinístico (sin red externa, MSW en memoria) y la suite corre como compuerta de CI que bloquea el merge ante fallos de contrato.

---

## ⚠️ Edge Cases

### EC-01: Snapshot OpenAPI no disponible
**Given** que el snapshot OpenAPI (PB-P0-005) aún no existe
**When** se implementa la suite de contrato
**Then** se usan los esquemas Zod compartidos como fuente de verdad del contrato y se documenta el modo best-effort, sin bloquear la suite.

#### Handling
* Fallback a esquemas Zod compartidos; documentar cuando OpenAPI no está disponible.

### EC-02: Endpoint del backend cambió su DTO
**Given** un cambio de contrato en el backend
**When** se ejecuta la suite de contrato
**Then** el test correspondiente falla con un mensaje claro que identifica el endpoint/DTO afectado (drift).

#### Handling
* Falla explícita; el desarrollador sincroniza handler/schema del frontend.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | Configuración de MSW y esquemas de contrato válida         | Fail-fast con mensaje explícito             |
| VR-02 | Respuesta mockeada no conforme al esquema Zod              | Test de contrato falla                      |
| VR-03 | Handler faltante para un endpoint clave declarado          | Test/compuerta falla                        |
| VR-04 | Sin llamadas de red reales durante los tests de contrato   | Bloqueo/fallo si se detecta red externa     |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19 en los datos de prueba.   |
| SEC-02 | Secrets vía Secrets Manager; sin secretos reales en handlers/fixtures. |
| SEC-03 | Sin secretos en logs ni en payloads de MSW.                         |
| SEC-04 | Los handlers MSW no deben ocultar contratos de error de autorización (401/403); el backend sigue siendo source of truth. |

### Negative Authorization Scenarios
* Contratos de error (401/403/4xx) deben poder representarse en MSW para que el frontend los maneje.
* Configuración insegura del entorno de pruebas → bloqueo (fail-fast).

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input
* Not applicable for this story.

### AI Output
* Not applicable for this story.

### Human-in-the-loop Rules
* Not applicable for this story.

### AI Error / Fallback Behavior
* Not applicable for this story. Si algún endpoint de IA está en el contrato, su handler MSW valida forma/schema, no contenido literal.

---

## 🎨 UX / UI Notes

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | N/A   |
| Main UI Pattern     | N/A   |
| Primary Action      | N/A   |
| Secondary Actions   | N/A   |
| Empty State         | N/A   |
| Loading State       | N/A   |
| Error State         | N/A   |
| Success State       | N/A   |
| Accessibility Notes | N/A — historia de testing de contrato, sin UI nueva. |
| Responsive Notes    | N/A   |
| i18n Notes          | N/A   |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A (se prueban contratos, no componentes específicos).
* State Management: N/A
* Forms: N/A
* API Client: Cubierto indirectamente — el contrato consumido por el API client se valida vía MSW + Zod.
* Herramientas: Vitest, Testing Library, MSW, esquemas Zod compartidos.

### Backend
* Use Case / Service: N/A (no modifica backend; consume su contrato).
* Controller / Route: N/A
* Authorization Policy: N/A runtime; se representan contratos de error 401/403 en MSW.
* Validation: Esquemas Zod compartidos como fuente de contrato.
* Transaction Required: N/A

### Database
* Main Tables: N/A
* Constraints: N/A
* Index Considerations: N/A

### API

| Method | Endpoint | Purpose                                        |
| ------ | -------- | ---------------------------------------------- |
| —      | Endpoints clave | Handlers MSW alineados al contrato (Doc 16). |

### Observability / Audit
* Correlation ID Required: No (tests en memoria).
* Log Event Required: No secretos en payloads/logs de prueba.
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                        | Type     |
| ----- | -------------------------------------------------------------- | -------- |
| TS-01 | Handler MSW existe y responde forma correcta por endpoint clave | Contract |
| TS-02 | Validación de respuesta contra esquema Zod compartido          | Contract |
| TS-03 | Derivación/validación desde snapshot OpenAPI cuando disponible | Contract |

### Negative Tests

| ID    | Scenario                                        | Expected Result                     |
| ----- | ----------------------------------------------- | ----------------------------------- |
| NT-01 | DTO backend cambia sin sincronizar frontend     | Test de contrato falla (drift)      |
| NT-02 | Respuesta mock no conforme al esquema Zod        | Test falla con mensaje claro        |
| NT-03 | Handler faltante para endpoint clave            | Test/compuerta falla                |
| NT-04 | Llamada de red real detectada                   | Fail-fast                           |

### AI Tests
* Si el contrato incluye endpoints de IA, se valida forma/schema del payload, no contenido literal.

### Authorization Tests

| ID         | Scenario                                          | Expected Result |
| ---------- | ------------------------------------------------- | --------------- |
| AUTH-TS-01 | Contrato de error 401/403 representable en MSW     | Handler devuelve envelope de error correcto |

### Accessibility Tests
* No aplica — sin UI nueva.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Calidad, prevención de incompatibilidades entre capas |
| Expected Impact     | Detecta drift de contrato antes de integración/demo   |
| Success Criteria    | Handlers MSW por endpoints clave + tests que fallan ante cambio de DTO |
| Academic Demo Value | Foundation — evidencia de disciplina de contrato entre capas |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* Configurar MSW y estructura de tests de contrato.
* Definir esquemas Zod compartidos de contrato.
* Escribir handlers para endpoints clave.

### Potential Backend Tasks
* No aplica (solo consume el contrato; ninguna modificación).

### Potential Database Tasks
* No aplica.

### Potential AI / PromptOps Tasks
* Handlers de contrato para endpoints de IA (forma/schema) si aplica.

### Potential QA Tasks
* Tests de contrato (positivos y de drift).
* Verificación de determinismo.

### Potential DevOps / Config Tasks
* Integrar la suite de contrato como compuerta de CI.
* Derivación desde snapshot OpenAPI cuando esté disponible.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo QA-Frontend).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 20 §6.4, Doc 16, ADR-TEST-001).
* [x] Permisos / Seguridad (contratos de error 401/403; sin secretos).
* [x] Entidades listadas (DTOs de contrato).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P0-005 best-effort, PB-P0-015).
* [x] UX states identificados (N/A — sin UI).
* [x] API definida (endpoints clave del contrato).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Handlers MSW para endpoints clave alineados al contrato real.
* [ ] Tests de contrato validan forma vía esquemas Zod compartidos.
* [ ] Tests fallan ante cambio de DTO no sincronizado (drift).
* [ ] Derivación desde OpenAPI cuando disponible; fallback documentado.
* [ ] Suite determinística integrada como compuerta de CI.
* [ ] Tech Lead valida.

---

## 📝 Notes
* La dependencia de OpenAPI (PB-P0-005) es best-effort: la descripción del backlog indica "generado desde OpenAPI cuando posible". Si el snapshot no existe al implementar, se usan esquemas Zod compartidos como fuente de contrato y se documenta el modo.
* Confirmar con Tech Lead la lista de "endpoints clave" a cubrir con handlers de contrato.
