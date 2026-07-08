# 🧾 User Story: Reporte final de evidencia académica AI4Devs

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-150                               |
| Epic               | EPIC-ACAD-001 — Academic Evidence    |
| Feature            | Reporte académico final (consolidación de evidencia) |
| Module / Domain    | Demo / Académica                     |
| User Role          | Product Owner                        |
| Priority           | Should Have (P3)                    |
| Status             | Approved with Minor Notes           |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                        |
| Approval Date      | 2026-07-08                          |
| Ready for Development Tasks | Yes                        |
| Sprint / Milestone | MVP                                 |
| Created Date       | 2026-06-09                          |
| Last Updated       | 2026-07-08                          |

---

## 🎯 User Story

**As the** Product Owner  
**I want** un reporte ejecutivo final que consolide y mapee épicas → User Stories → métricas/criterios académicos (Doc 3 §14.2/§15) y enlace la evidencia ya producida (ADRs, matriz de trazabilidad, catálogo de prompts/outputs, evidencia HITL, Demo URL y screenshots)  
**So that** la rúbrica académica AI4Devs quede cubierta con evidencia trazable y el proyecto tenga un entregable de cierre listo para la evaluación del Trabajo Final de Máster

---

## 🧠 Business Context

### Context Summary
Historia de **documentación / entregable académico**, no software ejecutable. El entregable es un **documento markdown consolidado** (propuesto: `/management/artifacts/Academic-Evidence-Report.md`) que actúa como índice ejecutivo de cierre: mapea las épicas y User Stories del MVP a los **criterios académicos** (Doc 3 §14.2) y a las **métricas académicas recomendadas** (Doc 3 §15), y **enlaza** (no duplica) la evidencia ya producida por las historias hermanas del épico académico: índice de ADRs (US-147 / PB-P3-008), matriz de trazabilidad US → FRD/UC/BR (US-148 / PB-P3-009) y catálogo sanitizado de prompts y outputs (US-149 / PB-P3-010). Además referencia la Demo URL pública, screenshots representativos, la evidencia de Human-in-the-loop en `AIRecommendation` y el mapeo final a la rúbrica AI4Devs. Es el **cierre del proyecto académico** (PB-P3-011).

### Related Domain Concepts
* Criterios académicos y métricas recomendadas (Doc 3 §14.2 y §15).
* Índice de ADRs ≥5 aceptados (US-147 / PB-P3-008; `docs/22-Architecture-Decision-Records.md`).
* Matriz de trazabilidad US → FRD/UC/BR (US-148 / PB-P3-009).
* Catálogo sanitizado de prompts/outputs por feature IA (US-149 / PB-P3-010; `AI-Prompt-Evidence-Catalog.md`).
* Evidencia HITL en `AIRecommendation` (docs/17; §16.5 Academic readiness del backlog).
* Demo URL pública y usuarios sembrados (docs/21 §25.1/§25.2).

### Assumptions
* Los criterios y métricas académicas están definidos en Doc 3 §14.2 y §15; el reporte los referencia sin redefinirlos.
* Las historias hermanas del épico académico (US-147, US-148, US-149) producen sus artefactos de evidencia; este reporte los **consolida por enlace**, no los regenera.
* La Demo URL, los usuarios sembrados y los screenshots representativos están disponibles/documentados (docs/21 §25).
* El reporte es un documento versionado en el repositorio, sin datos sensibles ni secretos.

### Dependencies
* **PB-P3-008 (US-147)** — Índice de ADRs ≥5 aceptados. El reporte enlaza el índice de ADRs como evidencia de criterio humano.
* **PB-P3-009 (US-148)** — Validación de trazabilidad US → FRD/UC/BR. El reporte incorpora/enlaza el resultado de la validación de trazabilidad.
* **PB-P3-010 (US-149)** — Catálogo de prompts y outputs. El reporte enlaza el catálogo sanitizado como evidencia clave de rúbrica AI4Devs.

---

## 🔗 Traceability

| Source                 | Reference                          |
| ---------------------- | ---------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa un FR; consolida evidencia de todo el MVP. |
| Use Case(s)            | Transversal — no implementa un UC; referencia el flujo E2E como métrica académica (Doc 3 §15). |
| Business Rule(s)       | Transversal — no aplica regla de negocio funcional. |
| Permission Rule(s)     | No aplica — no introduce autorización runtime; documento versionado, propiedad del Product Owner. |
| Data Entity / Entities | No aplica — no introduce entidades; referencia `AIRecommendation` solo como evidencia HITL. |
| API Endpoint(s)        | No aplica — no implementa ni consume endpoints. |
| NFR Reference(s)       | Referencia criterios técnicos/académicos (Doc 3 §14.2/§14.3) y cobertura de pruebas ≥50% como métrica; sin introducir NFRs nuevos. |
| Related ADR(s)         | ADR index completo (US-147); el reporte enlaza `docs/22` sin reabrir ADRs. |
| Related Document(s)    | docs/3 (§14.2/§15), docs/22, docs/17 (HITL/prompts), docs/21 (§25 Demo readiness), `AI-Prompt-Evidence-Catalog.md` |
| Backlog Item           | PB-P3-011 — Reporte académico final de evidencia |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Should Have (P3)

### Explicitly Out of Scope
* **Regenerar** los artefactos de evidencia hermanos — el índice de ADRs (US-147), la matriz de trazabilidad (US-148) y el catálogo de prompts/outputs (US-149) se **enlazan**, no se reproducen ni se duplican.
* Cualquier cambio de producto, endpoint, base de datos o UI — es un documento consolidado.
* Generación de screenshots o de la Demo URL — se **referencian** (propiedad de docs/21 §25 y de la operación de demo).
* Métricas o dashboards en tiempo real — el reporte es estático y versionado.
* Datos sensibles, PII o secretos — el reporte usa solo evidencia sanitizada.

### Scope Notes
* Alcance limitado al Acceptance Summary de PB-P3-011: reporte consolidado en el repo, mapeo a la rúbrica y listo para entrega.
* Respetar guardrails MVP: consolidación por enlace, sin duplicar evidencia ni introducir alcance nuevo.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Reporte consolidado versionado en el repositorio
**Given** la evidencia académica producida por el MVP y sus historias hermanas (US-147, US-148, US-149)  
**When** se genera el reporte final de evidencia académica  
**Then** existe un documento markdown consolidado y versionado en el repositorio (p. ej. `/management/artifacts/Academic-Evidence-Report.md`) que sirve como índice ejecutivo de cierre.

### AC-02: Mapeo épicas → User Stories → criterios/métricas académicas
**Given** las épicas y User Stories del MVP y los criterios/métricas académicas (Doc 3 §14.2/§15)  
**When** se revisa el reporte  
**Then** contiene un mapeo trazable de épicas → User Stories → criterios académicos (Doc 3 §14.2) y métricas recomendadas (Doc 3 §15), evidenciando la cobertura de cada uno.

### AC-03: Enlace a la evidencia consolidada (ADRs, trazabilidad, prompts, HITL, Demo)
**Given** los artefactos de evidencia existentes  
**When** se revisa el reporte  
**Then** enlaza (sin duplicar) el índice de ADRs (US-147), la matriz de trazabilidad US → FRD/UC/BR (US-148), el catálogo de prompts/outputs (US-149), la evidencia HITL en `AIRecommendation`, la Demo URL pública y los screenshots representativos.

### AC-04: Mapeo explícito a la rúbrica AI4Devs
**Given** la rúbrica académica AI4Devs y las métricas priorizadas (Doc 3 §15)  
**When** se revisa el reporte  
**Then** incluye una sección que mapea la evidencia del proyecto a cada criterio de la rúbrica AI4Devs, dejando claro dónde se encuentra la evidencia de cada punto.

### AC-05: Listo para entrega (autocontenido y navegable)
**Given** el reporte consolidado  
**When** un evaluador lo abre  
**Then** el documento es navegable, con enlaces relativos válidos a la evidencia del repositorio y a la Demo URL, y está marcado como entregable final listo para la evaluación.

---

## ⚠️ Edge Cases

### EC-01: Evidencia hermana incompleta o faltante
**Given** que una historia hermana (US-147/US-148/US-149) aún no ha producido su artefacto  
**When** se genera el reporte  
**Then** el reporte identifica explícitamente el gap (evidencia pendiente) en lugar de inventar o duplicar contenido, y marca ese punto de la rúbrica como pendiente.

#### Handling
* Listar los gaps de evidencia como pendientes accionables; no fabricar evidencia ausente.

### EC-02: Enlace roto a evidencia
**Given** un enlace a un artefacto de evidencia que no resuelve  
**When** se valida el reporte  
**Then** la validación de enlaces detecta el enlace roto y se corrige antes de marcar el reporte como listo para entrega.

#### Handling
* Verificación de enlaces relativos como paso previo a la entrega (fail-fast si hay enlaces rotos críticos).

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                       |
| ----- | ---------------------------------------------------------- | ---------------------------------------- |
| VR-01 | Cada criterio de la rúbrica AI4Devs debe tener evidencia enlazada o marcarse como gap. | Sin evidencia ni gap explícito → incompleto |
| VR-02 | Los enlaces a evidencia deben resolver (enlaces relativos válidos). | Enlace roto crítico → fail-fast antes de entrega |
| VR-03 | El reporte no debe contener secretos, PII ni evidencia sin sanitizar. | Contenido sensible → bloqueo y corrección |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar las políticas de seguridad de docs/19; el reporte solo referencia evidencia sanitizada. |
| SEC-02 | Sin secretos en el documento; cualquier valor sensible permanece en Secrets Manager, nunca en el reporte. |
| SEC-03 | Sin PII ni datos de usuarios reales; usar solo datos demo/sembrados sanitizados. |

### Negative Authorization Scenarios
* Inclusión de secretos, PII o evidencia sin sanitizar en el reporte → bloqueo y corrección obligatoria.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None (documenta/consolida evidencia de IA; no invoca IA)
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No (solo referencia `AIRecommendation` como evidencia HITL existente)
* Fallback Required: Not applicable

### AI Input
* Not applicable for this story.

### AI Output
* Not applicable for this story.

### Human-in-the-loop Rules
* Not applicable for this story (el reporte documenta la evidencia HITL existente, no ejecuta HITL).

### AI Error / Fallback Behavior
* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                  |
| ------------------- | -------------------------------------- |
| Screen / Route      | N/A — entregable es un documento markdown, no UI |
| Main UI Pattern     | N/A                                    |
| Primary Action      | N/A                                    |
| Secondary Actions   | N/A                                    |
| Empty State         | N/A                                    |
| Loading State       | N/A                                    |
| Error State         | N/A                                    |
| Success State       | N/A                                    |
| Accessibility Notes | No aplica — documento markdown (usar encabezados y enlaces descriptivos para legibilidad) |
| Responsive Notes    | No aplica                             |
| i18n Notes          | El reporte se redacta en el idioma de la entrega académica; no requiere i18n de app |
| Currency Notes      | No aplica                             |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A

### Backend
* Use Case / Service: N/A — no implementa servicios
* Controller / Route: —
* Authorization Policy: N/A
* Validation: Validación de enlaces del documento (VR-02), no de request
* Transaction Required: No

### Database
* Main Tables: — (solo referencia `AIRecommendation` como evidencia, sin consultarla en runtime)
* Constraints: N/A
* Index Considerations: N/A

### API

| Method | Endpoint                          | Purpose                          |
| ------ | --------------------------------- | -------------------------------- |
| —      | —                                 | No aplica — documento consolidado |

### Observability / Audit
* Correlation ID Required: No (documento estático; no hay runtime)
* Log Event Required: No
* AdminAction Required: No
* AIRecommendation Required: No (solo se referencia como evidencia existente)

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                              | Type          |
| ----- | ---------------------------------------------------- | ------------- |
| TS-01 | El reporte existe, está versionado y es navegable    | Doc review    |
| TS-02 | Mapeo épicas → US → criterios/métricas presente y trazable | Doc review |
| TS-03 | Enlaces a evidencia (ADRs, trazabilidad, prompts, HITL, Demo) resuelven | Doc review / link check |
| TS-04 | Sección de mapeo a rúbrica AI4Devs completa          | Doc review    |

### Negative Tests

| ID    | Scenario                                      | Expected Result                          |
| ----- | --------------------------------------------- | ---------------------------------------- |
| NT-01 | Evidencia hermana faltante (US-147/148/149)   | Gap marcado explícitamente, sin fabricar (EC-01) |
| NT-02 | Enlace roto a evidencia                       | Detectado y corregido antes de entrega (EC-02/VR-02) |
| NT-03 | Contenido con secretos/PII sin sanitizar      | Bloqueo y corrección (VR-03/SEC-02/03)   |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                  | Expected Result |
| ---------- | ----------------------------------------- | --------------- |
| AUTH-TS-01 | El reporte no expone datos sensibles ni secretos | Success (sin PII/secretos) |

### Accessibility Tests
* No aplica — documento markdown (legibilidad vía estructura de encabezados y enlaces descriptivos).

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Cobertura de rúbrica académica, trazabilidad de evidencia |
| Expected Impact     | Entregable de cierre que evidencia el cumplimiento de la rúbrica AI4Devs |
| Success Criteria    | Reporte consolidado, mapeado a rúbrica y listo para entrega |
| Academic Demo Value | Final — entregable académico de cierre               |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* No aplica.

### Potential Database Tasks
* No aplica.

### Potential AI / PromptOps Tasks
* Enlazar (no duplicar) el catálogo de prompts/outputs (US-149) y la evidencia HITL en `AIRecommendation`.

### Potential QA Tasks
* Revisión documental (existencia, mapeo, rúbrica) y verificación de enlaces.

### Potential DevOps / Config Tasks
* No aplica (documento versionado en el repo).

### Potential Documentation Tasks
* Redactar el reporte consolidado; construir el mapeo épicas → US → criterios/métricas; construir el mapeo a la rúbrica AI4Devs; verificar enlaces.

---

## ✅ Definition of Ready

* [x] Rol claro (Product Owner).
* [x] Goal claro (reporte de evidencia académica consolidado).
* [x] Referencias a Docs (Doc 3 §14.2/§15, Doc 22, Doc 17, Doc 21).
* [x] Permisos / Seguridad (sin secretos/PII; evidencia sanitizada).
* [x] Entidades listadas (N/A; solo referencia `AIRecommendation`).
* [x] AC en GWT (AC-01..AC-05).
* [x] Edge cases documentados (EC-01, EC-02).
* [x] Validación clara (VR-01..VR-03).
* [x] Out of Scope explícito (no regenerar evidencia hermana; sin cambios de producto).
* [x] Dependencias conocidas (PB-P3-008/009/010 → US-147/148/149).
* [x] UX states identificados (N/A — documento).
* [x] API definida (N/A).
* [x] Tests definidos (TS-01..TS-04, NT-01..NT-03).
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Reporte consolidado versionado en el repositorio.
* [ ] Mapeo épicas → US → criterios/métricas académicas completo.
* [ ] Enlaces a evidencia (ADRs, trazabilidad, prompts, HITL, Demo) resueltos.
* [ ] Mapeo explícito a la rúbrica AI4Devs.
* [ ] Sin secretos ni PII; evidencia sanitizada.
* [ ] Tech Lead / PO valida y marca como listo para entrega.

---

## 📝 Notes
* Confirmar con el Product Owner / Tech Lead la ruta canónica del reporte (propuesta: `/management/artifacts/Academic-Evidence-Report.md`) y el momento de congelación de la evidencia (cierre del proyecto académico).
* Depende de que US-147, US-148 y US-149 hayan producido su evidencia; los gaps se listan como pendientes (EC-01) sin fabricar contenido.
