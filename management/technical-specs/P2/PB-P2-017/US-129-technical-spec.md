# Technical Specification — PB-P2-017 / US-129: Suite IA con MockAIProvider

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-129                                                                             |
| Source User Story                    | `management/user-stories/US-129-ai-tests-with-mock-provider.md`                    |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-129-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-017                                                                          |
| Backlog Title                        | Suite IA con MockAIProvider (tests deterministas)                                   |
| Backlog Execution Order              | 17 (decimoséptimo ítem de P2)                                                      |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-129                                                                             |
| Epic                                 | EPIC-QA-001                                                                        |
| Backlog Item Dependencies            | PB-P0-009, PB-P0-010, PB-P0-011 (capa IA), PB-P0-015 (base de CI)                  |
| Feature                              | AI tests deterministic — MockAIProvider                                             |
| Module / Domain                      | QA / AI                                                                            |
| User Story Status                    | Approved with Minor Notes                                                          |
| Backlog Alignment Status             | Found                                                                              |
| Technical Spec Status                | Ready for Task Breakdown                                                           |
| Created Date                         | 2026-07-07                                                                         |
| Last Updated                         | 2026-07-07                                                                         |

---

## 2. Source Validation

| Source                       | Found | Used | Notes                                    |
| ---------------------------- | ----- | ---- | ---------------------------------------- |
| User Story                   | Yes   | Yes  | `Approved with Minor Notes`.              |
| Technical Specification      | N/A   | N/A  | Este documento.                          |
| Decision Resolution Artifact | No    | No   | No existe para US-129.                    |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-017.                                |
| ADRs                         | Yes   | Yes  | ADR-TEST-001 (Vitest); MockAIProvider obligatorio (Doc 20 §7/§21). |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-017 — Suite IA con MockAIProvider** (EPIC-QA-001, P2, Must Have). Tests por feature IA con outputs deterministas del Mock, validación Zod, timeout 60s y reintentos. Acceptance: Mock activado por env en CI; cobertura de las 7 features IA del MVP; tests pasan en <60s totales. Dependencias: PB-P0-009..011, PB-P0-015. Trazabilidad: Doc 20.

### Execution Order Rationale

Decimoséptimo ítem de P2. Depende de la capa de IA base (PB-P0-009 LLMProvider+Mock, PB-P0-010 Prompt Registry + persistencia `AIRecommendation`, PB-P0-011 timeout/fallback/validación JSON) y de la CI (PB-P0-015). Es parte de la base de calidad de IA; complementa a US-126 (que solo toca IA mock a nivel de integración mínima) con una suite dedicada por feature.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-129     | Única historia del ítem (suite IA determinista)| 1               |

---

## 3.1 Executive Technical Summary

Se debe construir una suite **determinista de IA** con **Vitest** que ejercite las **7 features de IA del MVP** (AI-001..AI-006, AI-008) usando **`MockAIProvider`** (activado por variable de entorno en CI, sin `OPENAI_API_KEY`). Cada feature se valida con **fixtures versionados** y **asserts estrictos sobre el esquema Zod** de salida (no texto literal), garantizando 0 falsos positivos. La suite valida además el comportamiento transversal de IA definido en PB-P0-011: **timeout 60s → error controlado + `fallbackUsed=true`**, **JSON inválido → error semántico sin crash**, **reintentos**, y la **persistencia de `AIRecommendation`** (provider, prompt_version_id, latencyMs, fallback_used — BR-AI-007/010). La suite total corre en **<60s** y actúa como compuerta de CI.

No modifica la capa de IA productiva; la consume. No incluye pruebas con proveedor real (manuales, fuera de CI) ni el HITL de UI (frontend/E2E).

---

## 4. Scope Boundary

### In Scope

* Activación de `MockAIProvider` por variable de entorno en el entorno de prueba/CI.
* Tests deterministas por cada una de las 7 features de IA del MVP (AI-001..AI-006, AI-008).
* Fixtures versionados por feature (input/output) conformes a esquema.
* Validación **Zod estricta** de la salida (estructura/schema, no contenido literal).
* Tests de **timeout 60s** → error controlado + `fallbackUsed=true` (PB-P0-011).
* Tests de **JSON inválido** → error semántico sin crash.
* Tests de **reintentos** según la política de PB-P0-011.
* Tests de **persistencia** de `AIRecommendation` (campos clave).
* Objetivo de tiempo total **<60s**; integración como compuerta de CI.

### Out of Scope

* Pruebas con `OpenAIProvider` real (manuales, `@manual`/`@real-provider`, fuera de CI).
* HITL de IA en UI (aceptar/editar/rechazar) — frontend/E2E (US-128).
* Feature AI-007 (bio/paquetes proveedor, Could Have) salvo confirmación de Tech Lead.
* Generación de imágenes IA (BR-AI-015, out of scope MVP).
* Suite unit+integration general (US-126), contract (US-127), E2E (US-128).

### Explicit Non-Goals

* No re-implementar la capa de IA (PB-P0-009..011); solo probarla.
* No validar contenido textual del Mock; solo forma/schema y comportamiento.
* No introducir dependencias de red externas en las pruebas.

---

## 5. Architecture Alignment

### Backend Architecture

Consume la capa de IA existente: interfaz `LLMProvider` con `MockAIProvider` (PB-P0-009), Prompt Registry + persistencia `AIRecommendation` (PB-P0-010), timeout/fallback/validación JSON (PB-P0-011). Node.js + TypeScript + Prisma. Sin cambios productivos.

### Frontend Architecture

No aplica — sin UI.

### Database Architecture

Se valida el contrato de persistencia de `AIRecommendation` (posible uso de BD efímera para los tests de persistencia, reutilizando el helper `test-db` de US-126 si existe).

### API Architecture

No aplica — se prueba la capa de servicio/módulo IA, no endpoints HTTP.

### AI / PromptOps Architecture

`MockAIProvider` obligatorio (BR-AI-005, Doc 20 §7 AI-T-01, PT-04). Se ejercitan las 7 features vía sus servicios/mappers de prompt. Se valida `promptVersion`, `provider`, `latencyMs`, `fallbackUsed`, propagación de idioma (BR-AI-011).

### Security Architecture

`OPENAI_API_KEY` ausente en CI; sin secretos ni PII real en fixtures/logs (SEC-02, SEC-03).

### Testing Architecture

Vitest; fixtures versionados por dominio (Doc 20 §26); asserts sobre schema; objetivo <60s; compuerta de CI. `MockAIProvider` activado por env.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (Mock por env en CI) | Configurar activación de `MockAIProvider` por variable de entorno; prohibir IA real. | AI test infra, CI |
| AC-02 (7 features) | Specs por feature (AI-001..006, AI-008) con fixtures + asserts Zod estrictos. | AI tests, Schemas |
| AC-03 (timeout/JSON) | Tests de timeout 60s → fallback; JSON inválido → error semántico sin crash. | AI tests, Fallback |
| AC-04 (persistencia) | Validar `AIRecommendation` (provider, promptVersion, latencyMs, fallbackUsed). | AI tests, DB |
| AC-05 (determinismo/<60s/CI) | Corridas repetibles, tiempo <60s, gate de CI. | AI tests, CI |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts
Módulo de IA (las 7 features) y `AIRecommendation`. Transversal; sin nuevos módulos productivos.

### Use Cases / Application Services
Se prueban los servicios/use cases de IA existentes (uno por feature) con `MockAIProvider`. No se crean productivos.

### Controllers / Routes
No aplica.

### DTOs / Schemas
Se validan los esquemas Zod de salida de cada feature.

### Repository / Persistence
Se valida la persistencia de `AIRecommendation` (PB-P0-010). Posible BD efímera (helper `test-db`).

### Validation Rules
* VR-01: `MockAIProvider` activo por env; bloquear IA real.
* VR-02: salida no conforme a schema → error semántico; test falla.
* VR-03: timeout 60s sin fallback → test falla.
* VR-04: suite total >60s → alerta/fallo del objetivo.

### Error Handling
Timeout → error controlado + `fallbackUsed=true`; JSON inválido → error semántico manejado (BR-AI-009).

### Transactions
No aplica más allá del aislamiento de los tests de persistencia.

### Observability
Verificar propagación de Correlation ID donde el servicio IA lo requiera; sin secretos en logs.

---

## 8. Frontend Technical Design

No aplica — sin UI. El HITL de IA en UI se cubre en frontend/E2E (US-128).

---

## 9. API Contract Design

No aplica — se prueba la capa de servicio/módulo IA, no endpoints HTTP.

---

## 10. Database / Prisma Design

### Models Impacted
`AIRecommendation` (solo lectura/verificación de contrato de persistencia; sin cambios de esquema).

### Fields / Columns
Validar `type`, `llm_provider`, `prompt_version_id`, `language_code`, `latency_ms`, `fallback_used`, `accepted`, `edited`.

### Relations / Indexes / Constraints
Sin cambios.

### Migrations Impact
Ninguna.

### Seed Impact
No requiere cambios de seed; fixtures propios de prueba.

---

## 11. AI / PromptOps Design

### AI Feature
Cobertura de AI-001 (plan), AI-002 (checklist), AI-003 (presupuesto), AI-004 (categorías), AI-005 (brief), AI-006 (resumen comparativo), AI-008 (priorización).

### Provider
`MockAIProvider` (obligatorio en CI), vía `LLMProvider`. Sin `OpenAIProvider` real.

### Prompt Version
Validar que `prompt_version_id` se registra en `AIRecommendation`.

### Input Schema
Fixtures de input por feature con idioma parametrizado (BR-AI-011).

### Output Schema
Esquema Zod por feature; asserts estrictos de estructura.

### Human-in-the-loop
Fuera de alcance (UI). Se valida el contrato de trazabilidad (`accepted`/`edited`) a nivel de persistencia si aplica.

### Fallback
Timeout 60s → `fallbackUsed=true`; JSON inválido → error semántico (BR-AI-009, PB-P0-011).

### Persistence
`AIRecommendation` validada (BR-AI-007/010).

### Safety Rules
Sin `OPENAI_API_KEY`; sin llamadas externas; sin PII real.

---

## 12. Security & Authorization Design

### Authentication / Authorization
No aplica runtime — suite de la capa IA.

### Ownership / Role Rules
No aplica.

### Negative Authorization Scenarios
No aplica (cubierto en PB-P2-018).

### Audit Requirements
Verificación de persistencia de `AIRecommendation` como evidencia de trazabilidad.

### Sensitive Data Handling
Sin secretos ni PII real en fixtures/logs (SEC-02, SEC-03).

---

## 13. Testing Strategy

### Unit Tests
Por feature IA (AI-001..006, AI-008): salida mock conforme a schema (asserts estrictos).

### Integration Tests
Persistencia de `AIRecommendation` (BD efímera); reintentos.

### API Tests
No aplica.

### E2E Tests
No aplica (US-128).

### Security Tests
Prohibición de IA real en CI (sin `OPENAI_API_KEY`).

### Accessibility Tests
No aplica.

### AI Tests (principal)
* 7 features con `MockAIProvider` y validación Zod.
* Timeout 60s → fallback; JSON inválido → error semántico.
* Propagación de idioma; persistencia de `AIRecommendation`.

### Seed / Demo Tests
No aplica.

### CI Checks
Gate: Mock por env, 7 features verdes, timeout/fallback/JSON validados, suite <60s, 0 falsos positivos.

---

## 14. Observability & Audit

### Logs
Sin secretos en logs.

### Correlation ID
Verificar propagación donde el servicio IA lo requiera.

### AdminAction
No aplica.

### Error Tracking
Verificación de errores controlados (timeout/JSON) como parte de los tests.

### Metrics
`latencyMs` validado en persistencia; tiempo total de suite <60s como objetivo.

---

## 15. Seed / Demo Data Impact

### Seed Data Required
No requiere cambios de seed; fixtures propios.

### Demo Scenario Supported
Indirecto: asegura que la IA asistida de la demo es determinística y trazable.

### Reset / Isolation Notes
BD efímera con reset para los tests de persistencia; aislamiento por test.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| "7 features IA del MVP" vs Doc 7 (8 features listadas) | Doc 7 lista AI-001..AI-008; AI-007 (bio proveedor) es Could Have | Set de 7 = AI-001..006 + AI-008 (excluye AI-007) | Confirmar con Tech Lead si AI-007 debe incluirse; documentar el set final | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Asserts sobre texto literal del Mock | Falsos positivos/negativos | Asserts sobre schema/estructura, no contenido |
| Dependencia de IA real en CI | Costos, flakiness | `MockAIProvider` por env; sin `OPENAI_API_KEY` |
| Suite lenta (>60s) | Objetivo incumplido | Fixtures ligeros; timeouts simulados sin espera real de 60s (fake timers) |
| Persistencia acoplada a BD real | Tests frágiles | BD efímera + reset (helper `test-db`) |
| Ambigüedad de las 7 features | Cobertura incorrecta | Documentar el set (AI-001..006 + AI-008); confirmar AI-007 |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** `backend/tests/unit/ai/**`, `backend/tests/integration/ai/**`, `backend/tests/fixtures/ai-responses/**`, helper de activación de `MockAIProvider` por env, config de CI (job de suite IA).
* **Orden recomendado:** (1) activación de `MockAIProvider` por env + helper; (2) fixtures por feature; (3) tests por feature (schema estricto); (4) tests de timeout/fallback/JSON (fake timers para 60s); (5) tests de persistencia de `AIRecommendation`; (6) verificación de tiempo <60s; (7) gate de CI.
* **Decisiones que no deben reabrirse:** `MockAIProvider` obligatorio en CI; asserts por schema; timeout 60s + fallback (PB-P0-011); persistencia `AIRecommendation` (PB-P0-010).
* **Qué no implementar:** capa de IA productiva (ya existe), pruebas con proveedor real en CI, HITL de UI, AI-007 salvo confirmación.
* **Suposiciones a preservar:** PB-P0-009..011 y PB-P0-015 existen.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (AI/OPS) activación Mock por env; (AI) fixtures por feature; (QA) tests por feature (7); (QA) timeout/fallback/JSON; (QA) persistencia `AIRecommendation`; (QA) tiempo <60s/determinismo; (OPS) gate de CI; (DOC) documentar set de features y modo Mock.
* **Tareas QA requeridas:** por feature, timeout/fallback/JSON, persistencia, determinismo.
* **Tareas de seguridad requeridas:** prohibir IA real en CI; sin secretos/PII en fixtures.
* **Tareas de seed/demo requeridas:** ninguna.
* **Tareas de documentación requeridas:** set de 7 features + activación del Mock por env.
* **Dependencias entre tareas:** activación Mock + fixtures antes de los tests; tests antes del gate.
* **Consolidación:** PB-P2-017 puede consolidar sus tareas en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-017) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | Pass (verificación de persistencia; sin cambios) |
| AI impact clear | Pass (MockAIProvider, 7 features) |
| Security impact clear | Pass (sin IA real; sin secretos) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-017, con alcance claro (suite IA determinista con MockAIProvider por env, 7 features, timeout/fallback/JSON, persistencia, <60s), sin cambios de la capa IA productiva. La única alerta de Documentation Alignment (definición del set de 7 features / inclusión de AI-007) es **no bloqueante**. Testing, seguridad de IA y CI están suficientemente definidos para generar Development Tasks.
