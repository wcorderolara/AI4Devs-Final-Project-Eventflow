# 🧾 User Story: Trazabilidad US → FRD/UC/BR

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-148                               |
| Epic               | EPIC-ACAD-001 — Academic Traceability |
| Feature            | Traceability matrix US               |
| Backlog Item       | PB-P2-025                            |
| Module / Domain    | Demo / Académica                    |
| User Role          | Product Owner / BA                   |
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

**As the** Product Owner / Business Analyst
**I want** una matriz canónica de trazabilidad donde cada User Story referencie sus FRD/UC/BR (y NFR/ADR) de origen, cubriendo el 100% de las User Stories
**So that** la trazabilidad del MVP sea verificable para la evaluación académica (AI4Devs).

---

## 🧠 Business Context

### Context Summary
Cada User Story del backlog ya incluye una sección `Traceability`. Esta historia consolida ese mapping en una **matriz canónica** — `management/artifacts/User-Stories-Traceability-Matrix.md` — que relaciona cada US con sus **FRD / UC / BR / NFR / ADR** de origen, cubriendo el 100% de las US (~150). Complementa la matriz de cobertura existente (`2-User-Stories-Coverage-Matrix.md`, que mapea Epic → Feature → US) aportando la trazabilidad detallada hacia requisitos. La matriz se mantiene **viva** (sincronizada cuando las US cambian).

### Related Domain Concepts
* Matriz canónica de trazabilidad US ↔ FRD/UC/BR/NFR/ADR.
* Sección `Traceability` de cada User Story.
* Trazabilidad académica (EPIC-ACAD-001).

### Assumptions
* Cada US contiene una sección `Traceability` como fuente.
* Los documentos fuente existen: FRD (Doc 9), Use Cases (Doc 8/8.1/8.2), Business Rules (Doc 4), NFR (Doc 10), ADR (Doc 22).

### Dependencies
* Backlog priorizado y las User Stories con su sección `Traceability`.

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — consolida las referencias FRD de todas las US.    |
| Use Case(s)            | Transversal — consolida las referencias UC de todas las US.     |
| Business Rule(s)       | Transversal — consolida las referencias BR de todas las US.     |
| Permission Rule(s)     | Según rol Product Owner / BA (mantenimiento de la matriz).       |
| Data Entity / Entities | No aplica.                                                      |
| API Endpoint(s)        | No aplica.                                                      |
| NFR Reference(s)       | Transversal — consolida las referencias NFR de todas las US.    |
| Related ADR(s)         | Transversal — consolida las referencias ADR (Doc 22).           |
| Related Document(s)    | /docs/9-Functional-Requirements-Document.md, /docs/8-Use-Cases-Specification.md, /docs/4-Business-Rules-Document.md, /docs/10-Non-Functional-Requirements.md, /docs/22-Architecture-Decision-Records.md, management/artifacts/2-User-Stories-Coverage-Matrix.md |
| Backlog Item           | PB-P2-025                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Should Have

### In Scope
* Crear/mantener `management/artifacts/User-Stories-Traceability-Matrix.md` con el mapping **US ↔ FRD/UC/BR/NFR/ADR**.
* **Cobertura del 100%** de las User Stories del backlog.
* Para US funcionales: referenciar al menos 1 FRD, 1 UC y 1 BR **cuando aplique**; marcar US transversales/foundation como tal.
* Mantener la matriz **viva** (sincronizada con las secciones `Traceability` de las US).
* Validación de cobertura en CI **opcional**.

### Explicitly Out of Scope
* La **herramienta de validación** que confirma FRD/UC/BR por US y reporta gaps (**PB-P3-009**, historia separada).
* El **índice de ADRs** (US-147, misma PB-P2-025 parte a).
* Autoría de nuevos FRD/UC/BR/NFR/ADR o modificación de su contenido.
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* US-148 cubre la parte **(b) matriz de trazabilidad** de PB-P2-025; US-147 cubre la parte **(a) índice de ADRs**.
* La matriz referencia las US y los documentos fuente; no los reemplaza.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Matriz canónica de trazabilidad
**Given** las User Stories del backlog y sus secciones `Traceability`
**When** se genera/actualiza la matriz
**Then** existe `management/artifacts/User-Stories-Traceability-Matrix.md` que mapea cada US a sus FRD/UC/BR/NFR/ADR de origen.

### AC-02: Cobertura del 100% de las US
**Given** el conjunto de User Stories del backlog
**When** se revisa la matriz
**Then** el 100% de las US están presentes en la matriz (ninguna queda fuera).

### AC-03: Referencias mínimas por US funcional
**Given** una US que implementa comportamiento funcional
**When** se registra en la matriz
**Then** referencia al menos 1 FRD, 1 UC y 1 BR cuando aplica; las US transversales/foundation se marcan explícitamente como `Transversal` (sin inventar IDs).

### AC-04: Matriz viva
**Given** un cambio en una US (alta, cambio de trazabilidad)
**When** se actualiza la US
**Then** la matriz se mantiene sincronizada (proceso o generación documentada), sin quedar desactualizada.

### AC-05: Validación opcional en CI
**Given** el pipeline de CI
**When** se ejecuta (opcional)
**Then** una validación verifica que la matriz cubre el 100% de las US, sin ser una compuerta bloqueante obligatoria.

---

## ⚠️ Edge Cases

### EC-01: US sin FRD/UC/BR aplicable
**Given** una US transversal/foundation (p. ej. DevOps, QA)
**When** se registra en la matriz
**Then** se marca como `Transversal` con una nota, sin inventar IDs de FRD/UC/BR.

#### Handling
* Marcar `Transversal — no implementa directamente un UC`.

### EC-02: US nueva no reflejada
**Given** una US agregada al backlog
**When** la matriz no se actualiza
**Then** la validación (o revisión) señala la matriz como incompleta.

#### Handling
* Proceso de sincronización documentado; validación de cobertura opcional en CI.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | La matriz cubre el 100% de las US                          | Inválida si falta alguna US                 |
| VR-02 | Cada fila referencia FRD/UC/BR (o marca `Transversal`)     | Inválida si falta y no es transversal       |
| VR-03 | Sin IDs de trazabilidad inventados                         | Corregir referencias falsas                 |
| VR-04 | Matriz sincronizada con las US                             | Desactualizada → señalar                    |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19 (no aplica runtime).       |
| SEC-02 | No incluye secretos.                                                 |
| SEC-03 | Sin secretos en la matriz ni en logs.                               |

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
| i18n Notes          | Matriz en español LATAM neutral; identificadores (FRD/UC/BR/NFR/ADR/US) en su forma canónica. |
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
* Validation: Cobertura del 100% de US (opcional en CI).
* Transaction Required: N/A

### Database
* Main Tables: N/A
* Constraints: N/A
* Index Considerations: N/A

### Documentación / Artefacto
* `management/artifacts/User-Stories-Traceability-Matrix.md`: columnas sugeridas US ID · Título · Epic/Feature · FRD · UC · BR · NFR · ADR · Notas.
* Fuente: sección `Traceability` de cada US.
* Generación/actualización: manual o script que consolida las secciones `Traceability`.

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
| TS-01 | La matriz lista el 100% de las US con FRD/UC/BR/NFR/ADR      | Docs   |
| TS-02 | US transversales marcadas correctamente                     | Docs   |
| TS-03 | (Opcional) Validación de cobertura 100% en CI               | CI     |

### Negative Tests

| ID    | Scenario                                   | Expected Result                     |
| ----- | ------------------------------------------ | ----------------------------------- |
| NT-01 | US ausente de la matriz                    | Señalada como incompleta            |
| NT-02 | Referencia FRD/UC/BR inventada             | Corregir                            |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Matriz generada/actualizada       | Success         |

### Accessibility Tests
* No aplica — documento Markdown.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Trazabilidad académica, calidad de documentación      |
| Expected Impact     | Trazabilidad verificable US ↔ FRD/UC/BR para AI4Devs  |
| Success Criteria    | Matriz viva con cobertura 100% de US y estados claros |
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
* Verificar cobertura 100% de US en la matriz.

### Potential DevOps / Config Tasks
* (Opcional) Validación de cobertura de la matriz en CI.

### Potential Documentation Tasks
* Crear la matriz de trazabilidad; documentar el proceso de sincronización.

---

## ✅ Definition of Ready

* [x] Rol claro (Product Owner / BA).
* [x] Goal claro.
* [x] Referencias a Docs (FRD/UC/BR/NFR/ADR).
* [x] Permisos / Seguridad (N/A runtime; sin secretos).
* [x] Entidades listadas (N/A).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito (validación = PB-P3-009; índice ADR = US-147).
* [x] Dependencias conocidas (US con `Traceability`).
* [x] UX states identificados (N/A — documento).
* [x] API definida (N/A).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Matriz `User-Stories-Traceability-Matrix.md` con mapping US ↔ FRD/UC/BR/NFR/ADR.
* [ ] Cobertura del 100% de las US.
* [ ] US transversales marcadas; sin IDs inventados.
* [ ] Proceso de sincronización documentado (matriz viva).
* [ ] (Opcional) Validación de cobertura en CI.
* [ ] Tech Lead valida.

---

## 📝 Notes
* US-148 aparece referenciada en dos ítems del backlog (PB-P2-025 y PB-P3-009). El ítem canónico de entrega es **PB-P2-025 (P2)** — consistente con la decisión del Product Owner para US-147, que enmarcó PB-P2-025 como el bundle que contiene a US-148. US-148 cubre la **matriz de trazabilidad**; **PB-P3-009 (P3)** es la **validación/reporte de gaps**, historia separada.
* Complementa la matriz de cobertura existente (`2-User-Stories-Coverage-Matrix.md`), aportando la trazabilidad hacia requisitos.
* Confirmar con Tech Lead si la validación de cobertura en CI se activa.
