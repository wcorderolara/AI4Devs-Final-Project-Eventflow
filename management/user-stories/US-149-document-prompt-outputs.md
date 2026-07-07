# 🧾 User Story: Documentar prompts y outputs ejemplares

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-149                               |
| Epic               | EPIC-ACAD-001 — Academic Traceability |
| Feature            | Prompts ejemplares                   |
| Backlog Item       | PB-P2-026                            |
| Module / Domain    | Demo / Académica / AI               |
| User Role          | AI Engineer / PO                     |
| Priority           | Should Have (P2)                     |
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

**As the** equipo IA / Product Owner
**I want** un catálogo sanitizado de prompts y outputs IA reales por feature del MVP, versionados y trazables a `AIPromptVersion` y `AIRecommendation`
**So that** demostremos PromptOps responsable como evidencia clave para la rúbrica AI4Devs.

---

## 🧠 Business Context

### Context Summary
Se mantiene `management/artifacts/AI-Prompt-Evidence-Catalog.md` con, al menos, **un ejemplo por feature de IA del MVP** (7 features): prompt versionado, ejemplo de input/output **sanitizado** (sin PII ni secretos) y **trazabilidad** a `AIPromptVersion` (versión del prompt) y a los IDs de `AIRecommendation` de ejecuciones reales. El catálogo evidencia prácticas de **PromptOps responsable** (versionado de prompts, human-in-the-loop, abstracción de proveedor) y se anexa al reporte académico final.

### Related Domain Concepts
* `AIPromptVersion` (versión del prompt, PromptOps).
* `AIRecommendation` (type, provider, promptVersion, latencyMs, fallback_used).
* Las 7 features de IA del MVP: AI-001 plan, AI-002 checklist, AI-003 presupuesto, AI-004 categorías, AI-005 brief, AI-006 resumen comparativo, AI-008 priorización.

### Assumptions
* La estrategia de PromptOps está definida en `/docs/17-AI-Architecture-and-PromptOps-Design.md`.
* Existen el Prompt Registry y la persistencia de `AIRecommendation` (PB-P0-010).
* Los datos se sanitizan antes de incluirse (sin PII/secretos).

### Dependencies
* PB-P0-010 — Prompt Registry & AIRecommendation Persistence (fuente de versiones e IDs).

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | FR-AI-016 (selección de proveedor por `LLM_PROVIDER`).          |
| Use Case(s)            | UC-AI-* (casos de IA asistida del MVP).                         |
| Business Rule(s)       | BR-AI-009 (timeout/fallback), BR-AI-007/010 (trazabilidad de `AIRecommendation`). |
| Permission Rule(s)     | Según rol AI Engineer / PO (mantenimiento del catálogo).         |
| Data Entity / Entities | `AIPromptVersion`, `AIRecommendation`                          |
| API Endpoint(s)        | No aplica.                                                      |
| NFR Reference(s)       | NFR-OBS-001, NFR-TEST-*                                         |
| Related ADR(s)         | ADR-AI-006 (versionado de prompts), ADR-AI-005 (human-in-the-loop), ADR-AI-001 (LLMProvider) |
| Related Document(s)    | /docs/17-AI-Architecture-and-PromptOps-Design.md, /docs/7-AI-Features-Specification.md, /docs/6-Domain-Data-Model.md |
| Backlog Item           | PB-P2-026                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Should Have

### In Scope
* Crear/mantener `management/artifacts/AI-Prompt-Evidence-Catalog.md`.
* **≥1 ejemplo por feature de IA del MVP** (7 features): prompt + input/output sanitizado.
* **Prompt versionado** por feature (referencia a `AIPromptVersion`/`promptVersion`).
* **Trazabilidad** a IDs de `AIRecommendation` de ejecuciones reales.
* **Sanitización** obligatoria (sin PII, sin secretos, sin `OPENAI_API_KEY`).
* Catálogo **vivo** (sincronizado ante cambios de prompts/features).

### Explicitly Out of Scope
* Completar el catálogo con **todos** los ejemplos representativos por feature (PB-P3-010, historia separada).
* Autoría de nuevos prompts o cambios de PromptOps.
* Invocación de IA en runtime.
* Índice de ADRs (US-147) y matriz de trazabilidad (US-148).
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* US-149 cubre la **creación/mantenimiento** del catálogo con ≥1 ejemplo por feature; PB-P3-010 lo **completa** con ejemplos representativos.
* Todo dato incluido debe estar sanitizado (sin PII/secretos).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Catálogo con un ejemplo por feature IA
**Given** las 7 features de IA del MVP
**When** se crea/actualiza el catálogo
**Then** `AI-Prompt-Evidence-Catalog.md` contiene al menos un ejemplo (prompt + input/output sanitizado) por feature.

### AC-02: Trazabilidad a AIPromptVersion y AIRecommendation
**Given** cada ejemplo del catálogo
**When** se documenta
**Then** referencia la versión del prompt (`AIPromptVersion`/`promptVersion`) y los IDs de `AIRecommendation` de ejecuciones reales.

### AC-03: Datos sanitizados
**Given** los ejemplos de input/output
**When** se incluyen en el catálogo
**Then** están sanitizados: sin PII, sin secretos, sin `OPENAI_API_KEY` ni datos sensibles.

### AC-04: Catálogo vivo
**Given** un cambio en un prompt o feature
**When** se actualiza
**Then** el catálogo se mantiene sincronizado (proceso documentado), sin quedar desactualizado.

### AC-05: Evidencia de PromptOps responsable
**Given** el catálogo
**When** se revisa para la rúbrica AI4Devs
**Then** evidencia prácticas de PromptOps responsable: versionado de prompts, human-in-the-loop y abstracción de proveedor (referenciadas).

---

## ⚠️ Edge Cases

### EC-01: Output real con PII
**Given** un output real que contiene datos personales
**When** se prepara para el catálogo
**Then** se sanitiza (enmascara/reemplaza) antes de incluirlo; no se incluye sin sanitizar.

#### Handling
* Sanitización obligatoria; revisión previa a la inclusión.

### EC-02: Feature sin ejemplo
**Given** una feature IA sin ejemplo en el catálogo
**When** se revisa la cobertura
**Then** se señala como incompleta (falta ≥1 ejemplo por feature).

#### Handling
* Verificación de cobertura por feature.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | ≥1 ejemplo por feature de IA del MVP                       | Inválido si falta una feature               |
| VR-02 | Cada ejemplo referencia `promptVersion` y `AIRecommendation` | Inválido si falta la trazabilidad           |
| VR-03 | Datos sanitizados (sin PII/secretos)                       | Bloquear inclusión sin sanitizar            |
| VR-04 | Catálogo sincronizado                                      | Desactualizado → señalar                    |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19.                           |
| SEC-02 | Sin secretos (`OPENAI_API_KEY`, etc.) en el catálogo.                |
| SEC-03 | Sin PII real ni secretos en logs ni en el catálogo (sanitización obligatoria). |

### Negative Authorization Scenarios
* Inclusión de PII/secretos sin sanitizar → bloqueo.
* Configuración insegura → bloqueo.

---

## 🤖 AI Behavior

This story documents AI evidence; it does not invoke AI in runtime.

### AI Involvement
* AI Feature: None en runtime (documenta prompts/outputs de las 7 features IA del MVP).
* Provider Layer: Referencia `AIPromptVersion`/`AIRecommendation`; no ejecuta IA.
* Human Validation Required: Sí para sanitización antes de incluir.
* Persist AIRecommendation: No (referencia IDs existentes).
* Fallback Required: Not applicable.

### AI Input
* Ejemplos de input sanitizados por feature.

### AI Output
* Ejemplos de output sanitizados por feature (conformes al schema esperado).

### Human-in-the-loop Rules
* La sanitización y curación del catálogo requiere validación humana (AI Engineer / PO).

### AI Error / Fallback Behavior
* No aplica en runtime; se puede documentar un ejemplo de `fallback_used=true` como evidencia (BR-AI-009).

---

## 🎨 UX / UI Notes

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | N/A (artefacto Markdown). |
| Main UI Pattern     | N/A   |
| Primary Action      | N/A   |
| Secondary Actions   | N/A   |
| Empty State         | N/A   |
| Loading State       | N/A   |
| Error State         | N/A   |
| Success State       | N/A   |
| Accessibility Notes | N/A — documento Markdown. |
| Responsive Notes    | N/A   |
| i18n Notes          | Catálogo en español LATAM neutral; identificadores/prompts técnicos en su forma canónica. |
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
* Use Case / Service: N/A (artefacto documental; referencia datos existentes).
* Controller / Route: N/A
* Authorization Policy: N/A
* Validation: Cobertura por feature; sanitización.
* Transaction Required: N/A

### Database
* Main Tables: `AIPromptVersion`, `AIRecommendation` (fuente de versiones e IDs; solo lectura/referencia).
* Constraints: N/A
* Index Considerations: N/A

### Documentación / Artefacto
* `management/artifacts/AI-Prompt-Evidence-Catalog.md`: por feature → prompt versionado, input/output sanitizado, `promptVersion`, `AIRecommendation` IDs, notas.
* Fuente: Prompt Registry + `AIRecommendation` (PB-P0-010).
* Generación/actualización: manual con curación/sanitización humana.

### Observability / Audit
* Correlation ID Required: N/A a nivel de catálogo.
* Log Event Required: Sin secretos/PII en logs.
* AdminAction Required: No
* AIRecommendation Required: Referencia IDs existentes (no persiste nuevos).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                    | Type   |
| ----- | ---------------------------------------------------------- | ------ |
| TS-01 | El catálogo tiene ≥1 ejemplo por feature IA (7)             | Docs   |
| TS-02 | Cada ejemplo referencia `promptVersion` y `AIRecommendation`| Docs   |
| TS-03 | Ejemplos sanitizados (sin PII/secretos)                     | Security/Docs |

### Negative Tests

| ID    | Scenario                                   | Expected Result                     |
| ----- | ------------------------------------------ | ----------------------------------- |
| NT-01 | Feature IA sin ejemplo                     | Señalada como incompleta            |
| NT-02 | Output con PII/secreto sin sanitizar       | Bloqueado                           |

### AI Tests
Not applicable for this story (no ejecuta IA en runtime).

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Catálogo generado/actualizado     | Success         |

### Accessibility Tests
* No aplica — documento Markdown.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Evidencia académica (rúbrica AI4Devs), calidad de PromptOps |
| Expected Impact     | Demostración de PromptOps responsable con evidencia real sanitizada |
| Success Criteria    | ≥1 ejemplo sanitizado por feature IA, con trazabilidad a AIPromptVersion/AIRecommendation |
| Academic Demo Value | Alto — evidencia clave para la rúbrica AI4Devs        |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* No aplica.

### Potential Database Tasks
* No aplica (referencia `AIPromptVersion`/`AIRecommendation`).

### Potential AI / PromptOps Tasks
* Recopilar prompts versionados por feature; seleccionar `AIRecommendation` reales; sanitizar input/output.

### Potential QA Tasks
* Verificar cobertura por feature y sanitización.

### Potential DevOps / Config Tasks
* No aplica (opcional: validación de cobertura en CI).

### Potential Documentation Tasks
* Crear el catálogo; documentar el proceso de sanitización/sincronización.

---

## ✅ Definition of Ready

* [x] Rol claro (AI Engineer / PO).
* [x] Goal claro.
* [x] Referencias a Docs (Doc 17, Doc 7; FR-AI-016; BR-AI-009).
* [x] Permisos / Seguridad (sanitización obligatoria; sin secretos).
* [x] Entidades listadas (`AIPromptVersion`, `AIRecommendation`).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito (completar catálogo = PB-P3-010).
* [x] Dependencias conocidas (PB-P0-010).
* [x] UX states identificados (N/A — documento).
* [x] API definida (N/A).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Catálogo `AI-Prompt-Evidence-Catalog.md` con ≥1 ejemplo por feature IA (7).
* [ ] Trazabilidad a `AIPromptVersion` y `AIRecommendation` por ejemplo.
* [ ] Datos sanitizados (sin PII/secretos).
* [ ] Proceso de sanitización/sincronización documentado.
* [ ] Evidencia de PromptOps responsable.
* [ ] Tech Lead valida.

---

## 📝 Notes
* US-149 aparece referenciada en dos ítems del backlog (PB-P2-026 y PB-P3-010). Por decisión del Product Owner, el ítem canónico de entrega es **PB-P2-026 (P2)** — crear/mantener el catálogo con ≥1 ejemplo por feature; **PB-P3-010 (P3)** lo completa con ejemplos representativos (historia separada).
* Las "7 features de IA del MVP" son AI-001..AI-006 y AI-008.
* Confirmar con Tech Lead el proceso de sanitización y si se activa una validación de cobertura en CI.
