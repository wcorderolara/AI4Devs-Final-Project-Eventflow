# 🧾 User Story: Crear índice de ADRs

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-147                               |
| Epic               | EPIC-ACAD-001 — Academic Traceability |
| Feature            | Índice ADRs                          |
| Backlog Item       | PB-P2-025                            |
| Module / Domain    | Demo / Académica                    |
| User Role          | Product Owner / Tech Lead            |
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

**As the** Product Owner / Tech Lead
**I want** mantener un índice maestro y navegable de los ADRs aceptados (mínimo 5, con título, estado, categoría y enlace)
**So that** la evaluación académica (AI4Devs) vea las decisiones arquitectónicas canónicas de forma estructurada y trazable.

---

## 🧠 Business Context

### Context Summary
El ADR Log oficial vive en `docs/22-Architecture-Decision-Records.md` y ya consolida las decisiones arquitectónicas del MVP (actualmente **46 ADRs aceptados**). Esta historia crea/mantiene un **índice maestro navegable** de los ADRs aceptados como evidencia académica, con título, estado, categoría y enlace a la sección correspondiente del Doc 22. El índice debe mantenerse **vivo** (sincronizado) cuando se agregan, cambian o quedan `Superseded` los ADRs.

### Related Domain Concepts
* ADR Log canónico (`docs/22-Architecture-Decision-Records.md`).
* Estados de ADR: `Accepted`, `Proposed`, `Superseded`, `Rejected`, `Out of Scope`.
* Trazabilidad académica (EPIC-ACAD-001).

### Assumptions
* El ADR Log (Doc 22) existe y contiene ≥5 ADRs aceptados (actualmente 46).
* La política de ADRs está definida en Doc 22 (formato, estados, gobernanza).

### Dependencies
* `docs/22-Architecture-Decision-Records.md` como fuente de verdad de los ADRs.

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa un UC; provee evidencia académica.  |
| Use Case(s)            | Transversal.                                                    |
| Business Rule(s)       | Transversal.                                                    |
| Permission Rule(s)     | Según rol Product Owner / Tech Lead (mantenimiento del índice).  |
| Data Entity / Entities | No aplica.                                                      |
| API Endpoint(s)        | No aplica.                                                      |
| NFR Reference(s)       | NFR-OBS-001, NFR-TEST-*                                         |
| Related ADR(s)         | Todos los ADRs aceptados del Doc 22 (ADR-ARCH-*, ADR-BE-*, ADR-FE-*, ADR-DB-*, ADR-AI-*, ADR-SEC-*, ADR-API-*, ADR-TEST-*, ADR-DEVOPS-*) |
| Related Document(s)    | /docs/22-Architecture-Decision-Records.md                       |
| Backlog Item           | PB-P2-025                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Should Have

### In Scope
* Crear/mantener un **índice maestro navegable** de ADRs aceptados (título, estado, categoría, enlace a Doc 22).
* Cubrir **≥5 ADRs aceptados** (el Doc 22 ya tiene 46).
* Estados **claros** por ADR (`Accepted`/`Superseded`/etc.).
* Mantener el índice **vivo** (sincronizado con Doc 22 ante altas/cambios/superseded).
* Validación de cobertura del índice en CI **opcional**.

### Explicitly Out of Scope
* La **matriz canónica de trazabilidad US ↔ FRD/UC/BR/NFR/ADR** (US-148, misma PB-P2-025).
* Autoría de **nuevos ADRs** o modificación del contenido de los ADRs existentes.
* Cambios de gobernanza del ADR Log.
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* US-147 cubre la parte de **índice de ADRs** de PB-P2-025; US-148 cubre la **matriz de trazabilidad**.
* El índice referencia el Doc 22 como fuente de verdad; no lo reemplaza.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Índice maestro de ADRs aceptados
**Given** el ADR Log (`docs/22`)
**When** se genera/actualiza el índice
**Then** existe un índice maestro que lista todos los ADRs **aceptados** (≥5) con título, estado, categoría y enlace a su sección en el Doc 22.

### AC-02: Índice navegable
**Given** el índice maestro
**When** un evaluador lo consulta
**Then** cada entrada enlaza (ancla/link) a la sección correspondiente del Doc 22, permitiendo navegación directa.

### AC-03: Estados claros
**Given** los ADRs del Doc 22
**When** se listan en el índice
**Then** el estado de cada ADR es claro (`Accepted`, `Superseded`, `Proposed`, `Rejected`, `Out of Scope`), reflejando el Doc 22.

### AC-04: Índice vivo
**Given** un cambio en los ADRs (alta, cambio de estado, `Superseded`)
**When** se actualiza el Doc 22
**Then** el índice se mantiene sincronizado (proceso o generación documentada), sin quedar desactualizado.

### AC-05: Validación opcional en CI
**Given** el pipeline de CI
**When** se ejecuta (opcional)
**Then** una validación verifica que el índice cubre los ADRs aceptados del Doc 22 (cobertura), sin ser una compuerta bloqueante obligatoria.

---

## ⚠️ Edge Cases

### EC-01: ADR agregado no reflejado
**Given** un nuevo ADR aceptado en el Doc 22
**When** el índice no se actualiza
**Then** la validación (o revisión) señala el índice como desactualizado.

#### Handling
* Proceso de sincronización documentado; validación de cobertura opcional en CI.

### EC-02: ADR `Superseded`
**Given** un ADR que pasa a `Superseded`
**When** se actualiza el índice
**Then** el estado se refleja correctamente y se enlaza el ADR que lo reemplaza si aplica.

#### Handling
* Mantener el estado y el enlace de reemplazo.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | El índice cubre ≥5 ADRs aceptados                          | Inválido si <5                              |
| VR-02 | Cada entrada tiene título, estado y enlace                 | Inválido si falta un campo                  |
| VR-03 | Estados reflejan el Doc 22                                 | Inconsistencia → corregir                   |
| VR-04 | Índice sincronizado con el Doc 22                          | Desactualizado → señalar                    |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19 (no aplica runtime).       |
| SEC-02 | No incluye secretos.                                                 |
| SEC-03 | Sin secretos en el índice ni en logs.                               |

### Negative Authorization Scenarios
* No aplica autorización runtime — artefacto documental.

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
* Not applicable for this story.

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
| Accessibility Notes | N/A — documento Markdown navegable. |
| Responsive Notes    | N/A   |
| i18n Notes          | Índice en español LATAM neutral; identificadores de ADR en inglés. |
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
* Use Case / Service: N/A (artefacto documental).
* Controller / Route: N/A
* Authorization Policy: N/A
* Validation: Cobertura del índice vs Doc 22 (opcional en CI).
* Transaction Required: N/A

### Database
* Main Tables: N/A
* Constraints: N/A
* Index Considerations: N/A

### Documentación / Artefacto
* Índice maestro de ADRs (Markdown) referenciando `docs/22-Architecture-Decision-Records.md`.
* Ubicación sugerida: `management/artifacts/ADR-Index.md` (o índice dentro del Doc 22) — a confirmar con Tech Lead.
* Generación/actualización: manual o script de sincronización desde la tabla de Doc 22.

### Observability / Audit
* Correlation ID Required: N/A.
* Log Event Required: N/A.
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                    | Type   |
| ----- | ---------------------------------------------------------- | ------ |
| TS-01 | El índice lista ≥5 ADRs aceptados con título/estado/enlace  | Docs   |
| TS-02 | Cada entrada enlaza a su sección en Doc 22 (navegable)      | Docs   |
| TS-03 | (Opcional) Validación de cobertura en CI                    | CI     |

### Negative Tests

| ID    | Scenario                                   | Expected Result                     |
| ----- | ------------------------------------------ | ----------------------------------- |
| NT-01 | ADR aceptado ausente del índice            | Señalado como desactualizado        |
| NT-02 | Entrada sin estado o enlace                | Inválido                            |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Índice generado/actualizado       | Success         |

### Accessibility Tests
* No aplica — documento Markdown.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Trazabilidad académica, calidad de documentación      |
| Expected Impact     | Evidencia estructurada de decisiones canónicas para AI4Devs |
| Success Criteria    | Índice vivo, navegable, ≥5 ADRs aceptados con estados claros |
| Academic Demo Value | Alto — soporte directo a la evaluación académica      |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* No aplica.

### Potential Database Tasks
* No aplica.

### Potential AI / PromptOps Tasks
* No aplica.

### Potential QA Tasks
* Verificar cobertura del índice vs Doc 22.

### Potential DevOps / Config Tasks
* (Opcional) Validación de cobertura del índice en CI.

### Potential Documentation Tasks
* Crear el índice maestro de ADRs; documentar el proceso de sincronización.

---

## ✅ Definition of Ready

* [x] Rol claro (Product Owner / Tech Lead).
* [x] Goal claro.
* [x] Referencias a Docs (Doc 22).
* [x] Permisos / Seguridad (N/A runtime; sin secretos).
* [x] Entidades listadas (N/A).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito (matriz = US-148).
* [x] Dependencias conocidas (Doc 22).
* [x] UX states identificados (N/A — documento).
* [x] API definida (N/A).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Índice maestro de ADRs aceptados (≥5) con título/estado/categoría/enlace.
* [ ] Índice navegable hacia el Doc 22.
* [ ] Estados claros y consistentes con el Doc 22.
* [ ] Proceso de sincronización documentado (índice vivo).
* [ ] (Opcional) Validación de cobertura en CI.
* [ ] Tech Lead valida.

---

## 📝 Notes
* US-147 aparece referenciada en dos ítems del backlog (PB-P2-025 y PB-P3-008). Por decisión del Product Owner, el ítem canónico de entrega es **PB-P2-025 (P2)**; US-147 cubre la parte de **índice de ADRs** y US-148 la **matriz de trazabilidad**.
* El Doc 22 ya contiene 46 ADRs aceptados; el umbral de ≥5 está ampliamente cubierto.
* Confirmar con Tech Lead la ubicación del índice (`management/artifacts/ADR-Index.md` vs índice dentro del Doc 22) y si la validación en CI se activa.
