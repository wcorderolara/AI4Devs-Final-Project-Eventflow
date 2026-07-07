# 🧾 User Story: Suite IA con MockAIProvider

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-129                               |
| Epic               | EPIC-QA-001                          |
| Feature            | AI tests deterministic               |
| Backlog Item       | PB-P2-017                            |
| Module / Domain    | QA / AI                             |
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

**As the** equipo QA / AI
**I want** ejecutar tests deterministas por cada feature de IA del MVP usando `MockAIProvider` (activado por variable de entorno en CI), con validación estricta de esquema Zod, timeout de 60s, reintentos y fallback
**So that** no haya flakiness por el LLM y se logren 0 falsos positivos de IA en CI.

---

## 🧠 Business Context

### Context Summary
Las pruebas automáticas de IA nunca dependen del proveedor real (Doc 20 §7, AI-T-01, PT-04). Esta suite cubre las **7 features de IA del MVP** con outputs deterministas del `MockAIProvider`, fixtures versionados y asserts estrictos sobre el esquema Zod de salida (no sobre texto literal). Valida además el comportamiento transversal de IA: timeout a 60s con degradación controlada (`fallbackUsed=true`), JSON inválido del provider tratado como error semántico sin crash, y la persistencia de `AIRecommendation` (provider, promptVersion, latencyMs, fallbackUsed). El Mock se activa por variable de entorno en CI y la suite completa corre en <60s.

### Related Domain Concepts
* `AIRecommendation` (type, llm_provider, prompt_version_id, language_code, input_payload, output_payload, accepted, edited, fallback_used).
* `LLMProvider` / `MockAIProvider` (BR-AI-005).
* Las 7 features de IA del MVP: AI-001 plan, AI-002 checklist, AI-003 presupuesto, AI-004 recomendación de categorías, AI-005 brief de cotización, AI-006 resumen comparativo, AI-008 priorización de tareas.

### Assumptions
* La estrategia de pruebas de IA está definida en `/docs/20-Testing-Strategy.md` §7 y §25.4.
* El stack de pruebas es Vitest (ADR-TEST-001); `MockAIProvider` obligatorio en CI.
* Las capacidades de IA base existen: `LLMProvider`/`MockAIProvider` (PB-P0-009), Prompt Registry + persistencia `AIRecommendation` (PB-P0-010), timeout/fallback/validación JSON (PB-P0-011).

### Dependencies
* PB-P0-009 — LLMProvider Port + Adapters (OpenAI + Mock + Anthropic Stub).
* PB-P0-010 — Prompt Registry & AIRecommendation Persistence.
* PB-P0-011 — AI Timeout, Fallback & JSON Validation.
* PB-P0-015 — Base de CI/pipeline que ejecuta las compuertas de calidad.

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | FR-AI-* (features de IA del MVP)                                 |
| Use Case(s)            | UC-AI-* (casos de IA asistida del organizador)                  |
| Business Rule(s)       | BR-AI-001..BR-AI-014 (human-in-the-loop, trazabilidad, fallback, provider abstraction), BR-AI-015 (sin generación de imágenes — out of scope) |
| Permission Rule(s)     | No aplica runtime authorization — suite de pruebas de la capa IA. |
| Data Entity / Entities | `AIRecommendation`                                              |
| API Endpoint(s)        | Transversal — se prueba la capa de servicio/módulo IA, no endpoints HTTP. |
| NFR Reference(s)       | NFR-TEST-*, NFR-PERF-API-001, NFR-OBS-001                       |
| Related ADR(s)         | ADR-TEST-001 (Vitest + Supertest), ADR-DEVOPS-001               |
| Related Document(s)    | /docs/20-Testing-Strategy.md (§7, §25.4), /docs/7-AI-Features-Specification.md, /docs/17-AI-Architecture-and-PromptOps-Design.md, /docs/11-Data-Seed-Strategy.md |
| Backlog Item           | PB-P2-017                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have

### In Scope
* Activación de `MockAIProvider` por variable de entorno en CI (sin `OPENAI_API_KEY`).
* Tests deterministas por cada una de las **7 features de IA del MVP** (AI-001..AI-006, AI-008) con fixtures versionados.
* Validación estricta del **esquema Zod** de la salida de IA (no texto literal).
* Comportamiento de **timeout a 60s** → error controlado + `fallbackUsed=true`.
* Comportamiento de **JSON inválido** del provider → error semántico, sin crash.
* **Reintentos** según la política definida en PB-P0-011.
* Validación de **persistencia** de `AIRecommendation` (provider, prompt_version_id, latencyMs, fallback_used).
* Suite total ejecuta en **<60s** y corre como compuerta de CI.

### Explicitly Out of Scope
* Pruebas con `OpenAIProvider` real (verificación cualitativa manual, `@manual`/`@real-provider`, fuera de CI).
* Human-in-the-loop de IA en UI (aceptar/editar/rechazar) — cubierto por suite frontend / E2E (US-128).
* Feature AI-007 (bio/paquetes del proveedor) — Could Have; fuera del set de 7 features MVP de esta suite.
* Generación de imágenes IA (BR-AI-015, out of scope del MVP).
* Suite unit + integration general del backend (US-126), contract (US-127) y E2E (US-128).
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* CI nunca ejecuta llamadas reales a proveedores de IA externos (Doc 20 §21, regla crítica).
* Asserts sobre estructura/schema, no sobre contenido literal, para evitar falsos positivos.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: MockAIProvider activado por entorno en CI
**Given** el entorno de CI
**When** se ejecuta la suite de IA
**Then** `MockAIProvider` se activa por variable de entorno y no se realiza ninguna llamada a un proveedor de IA real (sin `OPENAI_API_KEY`).

### AC-02: Cobertura determinista de las 7 features de IA
**Given** fixtures deterministas por feature
**When** se ejecuta la suite
**Then** cada una de las 7 features de IA del MVP (AI-001..AI-006, AI-008) tiene tests que validan la salida contra su esquema Zod con asserts estrictos, y todos pasan en verde.

### AC-03: Timeout y JSON inválido
**Given** un timeout simulado a 60s o un payload JSON inválido del provider
**When** se ejecuta el test correspondiente
**Then** el timeout produce un error controlado con `fallbackUsed=true`, y el JSON inválido produce un error semántico sin crash del proceso.

### AC-04: Persistencia de AIRecommendation
**Given** una llamada de IA de prueba
**When** se completa
**Then** se valida que `AIRecommendation` persiste con `llm_provider`, `prompt_version_id`, `latencyMs`/`latency_ms` y `fallback_used` conforme al contrato (BR-AI-007, BR-AI-010).

### AC-05: Determinismo, tiempo y compuerta de CI
**Given** la suite ejecutándose varias veces en CI
**When** se corre
**Then** el resultado es consistente (0 falsos positivos), la suite total corre en <60s, y actúa como compuerta de CI que bloquea el merge ante fallos.

---

## ⚠️ Edge Cases

### EC-01: Provider excede el timeout de 60s
**Given** una respuesta del provider que supera 60s
**When** se ejecuta el test
**Then** el sistema degrada de forma controlada, marca `fallbackUsed=true` y no bloquea el flujo (BR-AI-009).

#### Handling
* Timeout simulado; verificación de degradación a fallback.

### EC-02: Provider devuelve JSON inválido
**Given** una salida no conforme al schema
**When** se valida
**Then** se produce un error semántico manejado, sin crash, y el test lo verifica.

#### Handling
* Validación Zod estricta; manejo de error semántico.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | `MockAIProvider` activo por entorno en CI                  | Bloquear/fallar si se intenta IA real       |
| VR-02 | Salida de IA no conforme al esquema Zod                    | Error semántico; test falla                 |
| VR-03 | Timeout 60s sin fallback                                   | Test falla (se exige `fallbackUsed=true`)   |
| VR-04 | Suite total excede 60s                                     | Alerta/fallo del objetivo de tiempo         |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19 en los datos de prueba.   |
| SEC-02 | `OPENAI_API_KEY` ausente en CI; secrets vía Secrets Manager.        |
| SEC-03 | Sin secretos ni PII real en fixtures, payloads ni logs.             |

### Negative Authorization Scenarios
* Configuración que intente usar IA real en CI → bloqueo.
* Configuración insegura del entorno de pruebas → fail-fast.

---

## 🤖 AI Behavior

Esta historia prueba la capa de IA usando `MockAIProvider`; no ejecuta IA productiva ni real.

### AI Involvement
* AI Feature: Cobertura de las 7 features de IA del MVP (AI-001..AI-006, AI-008) en modo prueba.
* Provider Layer: `MockAIProvider` (obligatorio en CI), vía interfaz `LLMProvider`.
* Human Validation Required: No en esta suite (el HITL de UI se cubre en frontend/E2E).
* Persist AIRecommendation: Sí — se valida el contrato de persistencia.
* Fallback Required: Sí — se valida el comportamiento de fallback ante timeout/JSON inválido.

### AI Input
* Fixtures deterministas por feature (input_payload) con idioma parametrizado.

### AI Output
* Salida mock conforme al esquema Zod de cada feature; asserts sobre estructura/schema.

### Human-in-the-loop Rules
* Fuera de alcance de esta suite (UI). Se valida la trazabilidad (`accepted`/`edited`) a nivel de contrato de persistencia si aplica.

### AI Error / Fallback Behavior
* Timeout 60s → error controlado + `fallbackUsed=true`. JSON inválido → error semántico sin crash (BR-AI-009).

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
| Accessibility Notes | N/A — historia sin UI. |
| Responsive Notes    | N/A   |
| i18n Notes          | Los tests validan la propagación de idioma en el input del prompt (BR-AI-011). |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A

### Backend
* Use Case / Service: Servicios/módulo de IA (las 7 features) ejercidos con `MockAIProvider`.
* Controller / Route: N/A (se prueba la capa de servicio/módulo IA).
* Authorization Policy: N/A
* Validation: Esquemas Zod de salida por feature.
* Transaction Required: N/A
* Herramientas: Vitest, `MockAIProvider`, fixtures versionados, validación Zod.

### Database
* Main Tables: `AIRecommendation`
* Constraints: N/A (se valida contrato de persistencia).
* Index Considerations: N/A

### API

| Method | Endpoint | Purpose                                   |
| ------ | -------- | ----------------------------------------- |
| —      | —        | No aplica — cobertura de la capa IA.      |

### Observability / Audit
* Correlation ID Required: Verificar propagación donde el servicio IA lo requiera.
* Log Event Required: Sin secretos en logs.
* AdminAction Required: No
* AIRecommendation Required: Sí — se valida su persistencia.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                             | Type |
| ----- | ---------------------------------------------------- | ---- |
| TS-01 | AI-001 plan: salida mock conforme a schema           | Unit/AI |
| TS-02 | AI-002 checklist: salida mock conforme a schema      | Unit/AI |
| TS-03 | AI-003 presupuesto: salida mock conforme a schema    | Unit/AI |
| TS-04 | AI-004 categorías: salida mock conforme a schema     | Unit/AI |
| TS-05 | AI-005 brief: salida mock conforme a schema          | Unit/AI |
| TS-06 | AI-006 resumen comparativo: salida mock conforme     | Unit/AI |
| TS-07 | AI-008 priorización: salida mock conforme a schema   | Unit/AI |
| TS-08 | Persistencia de `AIRecommendation` (campos clave)    | Integration/AI |

### Negative Tests

| ID    | Scenario                                   | Expected Result                     |
| ----- | ------------------------------------------ | ----------------------------------- |
| NT-01 | Timeout 60s del provider                   | Error controlado + `fallbackUsed=true` |
| NT-02 | JSON inválido del provider                 | Error semántico, sin crash          |
| NT-03 | Intento de usar IA real en CI              | Bloqueado (sin `OPENAI_API_KEY`)     |
| NT-04 | Salida no conforme al schema Zod           | Test falla                          |

### AI Tests
* Todas las pruebas usan `MockAIProvider`; asserts sobre schema, no contenido literal.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Entorno de prueba configurado     | Success (Mock activo) |

### Accessibility Tests
* No aplica — sin UI.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Calidad de IA, estabilidad de CI, time-to-deploy     |
| Expected Impact     | 0 falsos positivos de IA en CI; sin flakiness por LLM |
| Success Criteria    | 7 features IA verdes con Mock, timeout/fallback/JSON validados, suite <60s |
| Academic Demo Value | Foundation — evidencia de IA determinística y trazable |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* Configurar activación de `MockAIProvider` por entorno para pruebas.

### Potential Database Tasks
* No aplica (valida contrato de persistencia existente).

### Potential AI / PromptOps Tasks
* Fixtures deterministas por feature conformes a schema.
* Tests de timeout/fallback/JSON inválido.
* Tests de persistencia de `AIRecommendation`.

### Potential QA Tasks
* Suite por feature IA + negativos.
* Verificación de determinismo y tiempo <60s.

### Potential DevOps / Config Tasks
* Variable de entorno de activación del Mock en CI.
* Integrar la suite IA como compuerta de CI.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo QA-AI).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 20 §7/§25.4, Doc 7, Doc 17, ADR-TEST-001).
* [x] Permisos / Seguridad (sin IA real en CI; sin secretos).
* [x] Entidades listadas (`AIRecommendation`).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P0-009..011, PB-P0-015).
* [x] UX states identificados (N/A — sin UI).
* [x] API definida (N/A — capa IA).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] `MockAIProvider` activado por entorno en CI (sin IA real).
* [ ] 7 features de IA cubiertas con asserts de schema y fixtures deterministas.
* [ ] Timeout 60s → fallback; JSON inválido → error semántico sin crash.
* [ ] Persistencia de `AIRecommendation` validada.
* [ ] Suite <60s; compuerta de CI bloqueante; 0 falsos positivos.
* [ ] Tech Lead valida.

---

## 📝 Notas
* Las "7 features de IA del MVP" se interpretan como AI-001..AI-006 y AI-008 (AI-007 bio/paquetes es Could Have y queda fuera). Confirmar con Tech Lead si AI-007 debe incluirse.
* Los asserts se hacen sobre estructura/schema, nunca sobre texto literal del Mock, para garantizar 0 falsos positivos.
