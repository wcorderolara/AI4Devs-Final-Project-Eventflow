# 🧾 User Story: Runbook del toggle `LLM_PROVIDER` y `AI_DEMO_MODE`

## 🆔 Metadata

| Field              | Value                                     |
| ------------------ | ----------------------------------------- |
| ID                 | US-144                                    |
| Epic               | EPIC-DEMO-001                             |
| Feature            | Runbook de toggle de proveedor IA (documentación) |
| Module / Domain    | Demo / AI (documentación operativa)       |
| User Role          | DevOps / Product Owner (operador demo)    |
| Priority           | Must Have (P3)                            |
| Status             | Approved with Minor Notes                 |
| Owner              | Product Owner / Business Analyst          |
| Approved By        | PO/BA Review                              |
| Approval Date      | 2026-07-08                                |
| Ready for Development Tasks | Yes                              |
| Sprint / Milestone | MVP                                       |
| Created Date       | 2026-06-09                                |
| Last Updated       | 2026-07-08                                |

---

## 🎯 User Story

**As the** operador de demo / DevOps de EventFlow
**I want** un runbook versionado que documente paso a paso cómo alternar `LLM_PROVIDER` entre `openai` y `mock` por variable de entorno, cómo activar el modo demo seguro y cómo verificar y revertir el cambio en el entorno Demo (App Runner)
**So that** la demo sea reproducible y resiliente ante un outage o falta de cuota de OpenAI, sin exponer secretos.

> **Naturaleza de la historia:** entregable de **documentación / runbook operativo** (markdown en el repositorio). No implementa software en runtime. La abstracción `LLMProvider`, `OpenAIProvider`, `MockAIProvider` y el mecanismo de selección por env var ya son propiedad de la fundación IA (PB-P0-009..011). Esta historia **documenta** el procedimiento operativo, no lo construye.

---

## 🧠 Business Context

### Context Summary
El backlog priorizado mapea US-144 → **PB-P3-005 — "Toggle Mock/OpenAI documentado"** (P3, Must Have, EPIC-DEMO-001), cuyo título es "Runbook del toggle `LLM_PROVIDER` y `AI_DEMO_MODE`". El riesgo RISK identificado en el backlog (inestabilidad/outage del provider IA durante la demo) se mitiga con `MockAIProvider` obligatorio + toggle `LLM_PROVIDER` documentado + modo demo. Este runbook es el artefacto de mitigación operativa: describe cómo alternar entre `OpenAIProvider` y `MockAIProvider`, cómo activar el modo demo seguro y cómo verificar el cambio, siguiendo la configuración autoritativa de `docs/21-Deployment-and-DevOps-Design.md` §13 (§511–§531).

### Related Domain Concepts
* `LLMProvider` (puerto de abstracción IA), `OpenAIProvider` (proveedor funcional principal), `MockAIProvider` (obligatorio: demo/tests/offline/fallback).
* `AnthropicProvider`: stub/contrato futuro no funcional en MVP (no se promueve en este runbook).
* Variables de entorno: `LLM_PROVIDER`, `OPENAI_API_KEY` (secreto), `OPENAI_MODEL`, `AI_TIMEOUT_MS`, `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`.
* Determinismo del `MockAIProvider` para demos reproducibles (NFR-AI-008).

### Assumptions
* El mecanismo de selección de proveedor por `LLM_PROVIDER` y el fallback ya existen y son entregados por la fundación IA (PB-P0-009..011). Este runbook los documenta, no los implementa.
* El backend está desplegado en un servicio gestionado AWS (App Runner) según PB-P2-022, donde las variables de entorno se administran a nivel de servicio.
* `OPENAI_API_KEY` se gestiona como secreto vía AWS Secrets Manager; el runbook referencia **nombres** de variables, nunca valores de secretos.
* Ruta de entrega propuesta (convención determinista, alineada con US-142 `/management/artifacts/Demo-Script.md` y US-143 `/management/artifacts/Pre-Demo-Checklist.md`): **`/management/artifacts/AI-Provider-Toggle-Runbook.md`**. Es una propuesta de nomenclatura, no un requisito de producto inventado.

### Dependencies
* **PB-P0-009** — LLMProvider Port + Adapters (OpenAI + Mock + Anthropic Stub).
* **PB-P0-010** — Prompt Registry & AIRecommendation Persistence.
* **PB-P0-011** — AI Timeout, Fallback & JSON Validation.
* **PB-P2-022** — Deploy backend en servicio gestionado AWS (App Runner) — provee el entorno Demo donde se configuran las env vars.
* Referencias cruzadas (no se rediseñan aquí): US-142/PB-P3-003 (Demo Script) y US-143/PB-P3-004 (Pre-Demo Checklist), que referencian este runbook como acción correctiva del toggle IA.

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | FR-AI-014, FR-AI-016, FR-DEMO-002                               |
| Use Case(s)            | UC-DEMO-001                                                     |
| Business Rule(s)       | BR-AI-005, BR-AI-006, BR-AI-009                                 |
| Permission Rule(s)     | No aplica — runbook operativo; no introduce runtime authorization. |
| Data Entity / Entities | No aplica — no crea ni modifica entidades de datos.             |
| API Endpoint(s)        | No aplica — no crea ni modifica endpoints.                      |
| NFR Reference(s)       | NFR-AI-008 (determinismo Mock), NFR-DEMO-006 (recorrido demo reproducible) |
| Related ADR(s)         | ADR-AI-001, ADR-AI-002, ADR-AI-003, ADR-AI-004, ADR-DEVOPS-001  |
| Related Document(s)    | /docs/17 §LLMProvider, /docs/21 §13 (§511–§531), /docs/11, /docs/19, /docs/22 |
| PO Decision            | Decisión PO US-144 → PB-P3-005                                  |

> **Nota de trazabilidad (limpieza aplicada):** se removió `NFR-PERF-API-001` (ID inexistente en `docs/`). Se removieron `NFR-OBS-001` (auditoría `AdminAction`, no aplica a este runbook), `NFR-TEST-*` (comodín) y `NFR-TEST-006` (testabilidad de captcha, no relacionado). Se reemplazó `BR-AI-015` (que trata "No generación de imágenes IA", no aplica) por las reglas correctas de abstracción y fallback de proveedor: BR-AI-005/006/009. ADRs alineados a la abstracción IA y despliegue.

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope (documentación de demo readiness).
* MVP Relevance: Must Have (P3, EPIC-DEMO-001).

### Explicitly Out of Scope
* No implementa el toggle ni los providers (`LLMProvider`, `OpenAIProvider`, `MockAIProvider`): propiedad de la fundación IA PB-P0-009..011.
* No promueve `AnthropicProvider` a funcional; permanece como stub/futuro (ADR-AI-004, FR-AI-015). Se menciona sólo como valor futuro/stub si es relevante.
* No crea UI de selección de proveedor (sin selector dinámico en UI, FR-AI-016).
* No introduce failover automático a Anthropic.
* No expone valores de secretos: sólo nombres de variables.

### Scope Notes
* Respeta los guardrails MVP y los principios demo-reproducible / IA-mockeable (P-05/P-06 de `docs/21`).
* Preferencia de configuración según `docs/21` §522: Demo → `LLM_PROVIDER=openai` + `AI_USE_MOCK_FALLBACK=true`; contingencia offline → `LLM_PROVIDER=mock` + `AI_DEMO_MODE=true`; CI/Tests → `LLM_PROVIDER=mock`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Runbook versionado en el repositorio
**Given** el repositorio EventFlow
**When** se completa esta historia
**Then** existe un runbook en markdown, versionado en el repo (ruta propuesta `/management/artifacts/AI-Provider-Toggle-Runbook.md`), con título "Runbook del toggle `LLM_PROVIDER` y `AI_DEMO_MODE`" y referenciado como acción correctiva desde el Pre-Demo Checklist (US-143).

### AC-02: Procedimiento de toggle documentado paso a paso
**Given** el runbook
**When** un operador necesita alternar el proveedor IA en el entorno Demo (App Runner)
**Then** el documento describe, paso a paso, cómo cambiar `LLM_PROVIDER` entre `openai` y `mock`, incluyendo el rol de `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`, `OPENAI_MODEL`, `AI_TIMEOUT_MS` y `OPENAI_API_KEY` (como secreto en Secrets Manager), usando sólo nombres de variables, nunca valores de secretos.

### AC-03: Activación del modo demo seguro documentada
**Given** el runbook
**When** el operador prepara la demo
**Then** el documento describe la configuración preferida (`LLM_PROVIDER=openai` + `AI_USE_MOCK_FALLBACK=true`) y el modo totalmente offline de contingencia (`LLM_PROVIDER=mock` + `AI_DEMO_MODE=true`), citando `docs/21` §522.

### AC-04: Verificación del cambio documentada
**Given** el runbook
**When** el operador aplica un cambio de proveedor
**Then** el documento describe cómo verificar que el cambio surtió efecto: qué observar en logs (`correlationId`, `provider`, `fallback_used`), el comportamiento IA determinista del `MockAIProvider` (NFR-AI-008), y la verificación vía healthcheck/smoke del servicio.

### AC-05: Procedimiento de reversión documentado
**Given** el runbook
**When** el operador necesita volver al estado previo tras un cambio
**Then** el documento describe cómo revertir la configuración al estado anterior de forma segura y verificable.

### AC-06: Procedimiento testeado en Demo (dry-run registrado)
**Given** el entorno Demo (App Runner)
**When** se ejecuta el runbook como ensayo
**Then** queda registrado un dry-run en el que se realizó el toggle (`openai`→`mock` y regreso) y la reversión, confirmando que el procedimiento documentado funciona end-to-end.

---

## ⚠️ Edge Cases

### EC-01: OpenAI caído o sin cuota durante la demo
**Given** `LLM_PROVIDER=openai` y OpenAI no disponible o sin cuota
**When** se invoca una función IA
**Then** el runbook documenta que, con `AI_USE_MOCK_FALLBACK=true`, el sistema degrada a `MockAIProvider` (BR-AI-009) y describe cómo conmutar manualmente a `LLM_PROVIDER=mock` como contingencia.

#### Handling
* Documentar tanto el fallback automático (si está habilitado) como el toggle manual a `mock`, y cómo confirmarlo en logs (`fallback_used=true`).

### EC-02: Variable de entorno mal configurada
**Given** un valor inválido de `LLM_PROVIDER` (distinto de `openai`/`mock`) u otra env var IA mal formada
**When** el servicio arranca o procesa una solicitud IA
**Then** el runbook documenta el comportamiento esperado de fail-fast/validación y cómo diagnosticarlo y corregirlo antes de la demo.

#### Handling
* Referir la validación de configuración a la fundación IA (PB-P0-009/011); el runbook sólo documenta cómo detectar y corregir la mala configuración.

---

## 🚫 Validation Rules

| ID    | Rule                                                    | Message / Behavior                                                   |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| VR-01 | `LLM_PROVIDER` sólo admite `openai` o `mock` en MVP     | Documentar comportamiento fail-fast ante valor no soportado.        |
| VR-02 | El runbook nunca incluye valores de secretos            | Sólo se referencian **nombres** de variables (p. ej. `OPENAI_API_KEY`). |

---

## 🔐 Authorization & Security Rules

Esta historia no introduce endpoints ni runtime authorization.

| ID     | Rule                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------- |
| SEC-01 | Seguridad documental: el runbook referencia sólo **nombres** de variables, nunca valores de secretos (`docs/19`). |
| SEC-02 | `OPENAI_API_KEY` se gestiona como secreto en AWS Secrets Manager; el runbook lo describe por nombre. |
| SEC-03 | El frontend nunca recibe `OPENAI_API_KEY` (`docs/21` §525); el runbook lo advierte explícitamente. |
| SEC-04 | No se registran prompts/respuestas completas con datos sensibles en logs (`docs/21` §531).       |

### Negative Authorization Scenarios
* **No aplica** — esta historia no introduce endpoints ni runtime authorization. La única superficie de seguridad es documental (no exponer secretos).

---

## 🤖 AI Behavior

**No aplica** — esta historia no invoca IA directamente. Documenta el procedimiento operativo para alternar proveedores IA que ya existen (fundación IA PB-P0-009..011).

### AI Involvement
* AI Feature: None (documentación del toggle de proveedor).
* Provider Layer: se documenta la selección entre `OpenAIProvider` y `MockAIProvider` vía `LLM_PROVIDER`, pero no se implementa ni invoca aquí.
* Human Validation Required: No aplica (el runbook no genera salidas IA). El human-in-the-loop del producto (BR-AI-001, ADR-AI-005) no se ve afectado por el toggle.
* Persist AIRecommendation: No.
* Fallback Required: se documenta el fallback existente (`AI_USE_MOCK_FALLBACK`, BR-AI-009), no se implementa.

### AI Input / AI Output
* No aplica para esta historia (documentación, sin invocación IA).

### Human-in-the-loop Rules
* No aplica directamente; el runbook confirma que alternar proveedor no altera la validación humana obligatoria de salidas IA (BR-AI-001).

### AI Error / Fallback Behavior
* Documenta el comportamiento de degradación a `MockAIProvider` ante fallo/timeout de OpenAI (BR-AI-009), sin implementarlo.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                     |
| ------------------- | --------------------------------------------------------- |
| Screen / Route      | No aplica — entregable de documentación, sin UI.          |
| Main UI Pattern     | No aplica.                                                 |
| Primary Action      | No aplica.                                                 |
| Secondary Actions   | No aplica.                                                 |
| Empty / Loading / Error / Success State | No aplica.                            |
| Accessibility Notes | No aplica — sin UI. El propio markdown debe ser legible y bien estructurado. |
| Responsive Notes    | No aplica.                                                 |
| i18n Notes          | Runbook en español LATAM neutral; identificadores técnicos en inglés. |
| Currency Notes      | No aplica.                                                 |

---

## 🛠 Technical Notes

### Frontend
* **No aplica** — esta historia no toca frontend. Nota documental: el frontend nunca recibe `OPENAI_API_KEY`.

### Backend
* **No aplica (runtime)** — no implementa lógica de backend. El mecanismo de selección de proveedor y fallback pertenece a la fundación IA (PB-P0-009..011). El runbook documenta el comportamiento observable.

### Database
* **No aplica** — no crea ni modifica tablas, constraints ni índices.

### API
* **No aplica** — no define ni modifica endpoints.

### Deployment / Config (aplica)
* Entorno objetivo: backend en App Runner (PB-P2-022). Las env vars IA se administran a nivel de servicio.
* Variables a documentar (autoritativas en `docs/21` §513–§518): `LLM_PROVIDER`, `OPENAI_API_KEY` (secreto), `OPENAI_MODEL`, `AI_TIMEOUT_MS`, `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`.
* Reglas operativas (`docs/21` §520–§525): Demo → `openai` + `AI_USE_MOCK_FALLBACK=true`; contingencia → `mock` + `AI_DEMO_MODE=true`; CI → `mock`; secreto nunca al frontend.

### Observability / Audit
* Correlation ID Required: se documenta que cada interacción LLM y su fallback se loguean con `correlationId` (`docs/21` §530).
* Log Event Required: el runbook indica qué logs observar para verificar el toggle (`provider`, `fallback_used`, razón del fallback).
* AdminAction Required: No.
* AIRecommendation Required: No (esta historia no genera recomendaciones IA).

---

## 🧪 Test Scenarios

> El "testing" de esta historia es la validación del procedimiento documentado mediante un dry-run en el entorno Demo, no pruebas de software automatizadas de producto.

### Functional Tests (validación del runbook)

| ID    | Scenario                                                            | Type              |
| ----- | ------------------------------------------------------------------ | ----------------- |
| TS-01 | Ejecutar el toggle `openai`→`mock` siguiendo el runbook y verificar comportamiento determinista del Mock (NFR-AI-008). | Dry-run / Manual  |
| TS-02 | Ejecutar la reversión `mock`→`openai` siguiendo el runbook y verificar vía healthcheck/smoke.                        | Dry-run / Manual  |
| TS-03 | Verificar que el runbook referencia sólo nombres de variables, sin valores de secretos.                             | Revisión documental |

### Negative Tests

| ID    | Scenario                                       | Expected Result                                            |
| ----- | ---------------------------------------------- | ---------------------------------------------------------- |
| NT-01 | `LLM_PROVIDER` con valor inválido              | El runbook describe el fail-fast/validación y su diagnóstico. |
| NT-02 | OpenAI caído/sin cuota con fallback habilitado | El runbook describe la degradación a `MockAIProvider` (`fallback_used=true`) y el toggle manual a `mock`. |

### AI Tests
* **No aplica** — esta historia no invoca IA directamente.

### Authorization Tests
* **No aplica** — esta historia no introduce runtime authorization.

### Accessibility Tests
* **No aplica** — entregable de documentación sin UI.

---

## 📊 Business Impact

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| KPI Affected        | Robustez y reproducibilidad de la demo; reducción de riesgo de outage IA. |
| Expected Impact     | Demo robusta incluso ante outage/falta de cuota de OpenAI.            |
| Success Criteria    | Runbook en repo, dry-run de toggle y reversión ejecutado en Demo, reversión documentada. |
| Academic Demo Value | Alto — evidencia de demo-readiness y de la abstracción IA (IA-mockeable). |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* No aplica (mecanismo de toggle es propiedad de PB-P0-009..011).

### Potential Database Tasks
* No aplica.

### Potential AI / PromptOps Tasks
* No aplica (no se implementa lógica IA aquí).

### Potential QA Tasks
* Ejecutar y registrar el dry-run del toggle y la reversión en el entorno Demo.
* Revisión documental de higiene de secretos (sólo nombres de variables).

### Potential DevOps / Documentation Tasks
* Redactar el runbook `/management/artifacts/AI-Provider-Toggle-Runbook.md` con pasos de toggle, modo demo seguro, verificación y reversión.
* Enlazar el runbook desde el Pre-Demo Checklist (US-143) como acción correctiva del toggle IA.

---

## ✅ Definition of Ready

* [x] Rol claro (DevOps / Product Owner, operador demo).
* [x] Objetivo del runbook claro y de valor (demo robusta ante outage IA).
* [x] Referencias a docs autoritativas (`docs/17`, `docs/21` §13, `docs/11`, `docs/19`, `docs/22`).
* [x] Seguridad documental definida (sólo nombres de variables).
* [x] Naturaleza del entregable clara (documentación/runbook, no software runtime).
* [x] AC en formato GWT y testables (validación por dry-run).
* [x] Edge cases documentados (OpenAI caído; env var mal configurada).
* [x] Reglas de validación claras.
* [x] Out of Scope explícito (no implementa toggle/providers; no promueve Anthropic; no crea UI).
* [x] Dependencias conocidas (PB-P0-009..011, PB-P2-022).
* [x] Trazabilidad verificada (IDs reales; se removieron IDs falsos/no aplicables).
* [x] Ruta de entrega propuesta (convención determinista).

---

## 🏁 Definition of Done

* [ ] Runbook creado y versionado en el repo (propuesto `/management/artifacts/AI-Provider-Toggle-Runbook.md`).
* [ ] Documenta el toggle `LLM_PROVIDER` `openai`↔`mock` paso a paso, con `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK` y `OPENAI_API_KEY` (por nombre).
* [ ] Documenta la activación del modo demo seguro y el modo offline de contingencia.
* [ ] Documenta cómo verificar el cambio (logs, mock determinista, healthcheck/smoke).
* [ ] Documenta cómo revertir al estado previo.
* [ ] Dry-run del toggle y la reversión ejecutado y registrado en el entorno Demo.
* [ ] Runbook enlazado desde el Pre-Demo Checklist (US-143).

---

## 📝 Notes
* Historia de documentación/runbook alineada a PB-P3-005 (P3, Must Have, EPIC-DEMO-001). Prioridad fijada explícitamente a **Must Have (P3)** según el backlog priorizado.
* Ruta de entrega `/management/artifacts/AI-Provider-Toggle-Runbook.md` es una convención propuesta (coherente con US-142/US-143), no un requisito de producto inventado.
* `AnthropicProvider` se mantiene como stub/futuro (ADR-AI-004); el runbook cubre `openai`↔`mock`.
* Fuente autoritativa de variables y reglas operativas: `docs/21-Deployment-and-DevOps-Design.md` §13 (§511–§531).
