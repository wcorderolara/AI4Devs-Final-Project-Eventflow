# 🧾 User Story: Suite A11Y mínima

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-131                               |
| Epic               | EPIC-QA-001                          |
| Feature            | Accesibilidad mínima                 |
| Backlog Item       | PB-P2-019                            |
| Module / Domain    | QA / FE                             |
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
**I want** una suite de accesibilidad mínima (auditorías automatizadas con axe-core más verificación manual mínima) sobre las rutas demo principales, cubriendo navegación por teclado, gestión de foco, roles ARIA y contraste
**So that** se cumplan los estándares básicos de accesibilidad (NFR-A11Y) y sean verificables en CI.

---

## 🧠 Business Context

### Context Summary
EventFlow no busca conformidad formal WCAG 2.1 AA completa en el MVP, pero garantiza una **accesibilidad mínima usable y testeable** (Doc 20 §a11y). Esta suite ejecuta auditorías automatizadas con **axe-core** sobre las rutas demo principales (sin violaciones críticas), verifica **navegación por teclado** en los flujos críticos (login, creación de evento, comparación de cotizaciones), **foco visible**, **roles ARIA correctos**, **labels de formulario y mensajes de error accesibles** y **contraste mínimo (≥4.5:1)**. Incluye un checklist manual mínimo para lo que no cubre axe-core. Corre como compuerta de CI.

### Related Domain Concepts
* Rutas demo principales del organizador (login, creación de evento, comparación de cotizaciones).
* Gestión de foco en apertura/cierre de modales (focus trap + restauración).
* ARIA usado solo donde no hay equivalente nativo.

### Assumptions
* La política de accesibilidad mínima está definida en `/docs/20-Testing-Strategy.md` y `/docs/10-Non-Functional-Requirements.md` (NFR-A11Y-001..005).
* El stack de pruebas frontend usa Vitest + Testing Library + Playwright + axe-core (Doc 20 §11, §a11y).
* La base del frontend existe (bootstrap + i18n + data layer + layouts).

### Dependencies
* PB-P0-012 — Frontend Next.js Bootstrap & i18n.
* PB-P0-013 — Frontend Data Layer: TanStack Query + MSW + Layouts.
* Diseño de sistema (paleta) para verificación de contraste.

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | FR-AUTH-001, FR-EVENT-001/004, FR-QUOTE-006 (flujos con A11Y aplicable, vía NFR-A11Y). |
| Use Case(s)            | Transversal — accesibilidad de los UC del camino demo del organizador. |
| Business Rule(s)       | Transversal — no implementa BR; verifica NFR de accesibilidad.  |
| Permission Rule(s)     | No aplica — suite de accesibilidad de UI.                       |
| Data Entity / Entities | No aplica.                                                      |
| API Endpoint(s)        | No aplica — pruebas de accesibilidad de rutas frontend.        |
| NFR Reference(s)       | NFR-A11Y-001 (HTML semántico), NFR-A11Y-002 (teclado), NFR-A11Y-003 (foco visible), NFR-A11Y-004 (labels/errores), NFR-A11Y-005 (contraste ≥4.5:1), NFR-TEST-* |
| Related ADR(s)         | ADR-TEST-001 (Vitest + Testing Library + Playwright), ADR-DEVOPS-001 |
| Related Document(s)    | /docs/20-Testing-Strategy.md (§11, §a11y), /docs/10-Non-Functional-Requirements.md (§14), /docs/15-Frontend-Architecture-Design.md |
| Backlog Item           | PB-P2-019                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have

### In Scope
* Auditorías **axe-core** automatizadas sobre las **rutas demo principales** (sin violaciones críticas).
* Verificación de **navegación por teclado** en flujos críticos (Tab/Shift+Tab/Enter).
* Verificación de **foco visible** en elementos interactivos.
* Verificación de **roles ARIA correctos** (solo donde no hay equivalente nativo).
* Verificación de **labels de formulario** y **mensajes de error accesibles**.
* Verificación de **contraste mínimo (≥4.5:1)** (axe-core o checklist manual sobre la paleta).
* **Gestión de foco en modales** (focus trap + restauración al cerrar).
* **Checklist manual mínimo** para lo no cubierto por axe-core.
* Integración como **compuerta de CI**.

### Explicitly Out of Scope
* Certificación formal WCAG 2.1 AA completa (NFR-FUT-002).
* Auditoría exhaustiva de accesibilidad en todas las páginas (solo rutas demo principales).
* Auditoría completa con lector de pantalla más allá del mínimo testeable.
* Suite unit+integration backend (US-126), contract (US-127), E2E (US-128), IA (US-129), RBAC negativa (US-130).
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* Respetar la meta MVP: accesibilidad mínima usable y testeable, no conformidad formal completa.
* ARIA solo donde no exista equivalente nativo (Doc 20 §a11y).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: axe-core sin violaciones críticas
**Given** las rutas demo principales
**When** se ejecutan las auditorías automatizadas con axe-core
**Then** no existen violaciones críticas de accesibilidad.

### AC-02: Navegación por teclado
**Given** los flujos críticos (login, creación de evento, comparación de cotizaciones)
**When** se navega con Tab/Shift+Tab/Enter
**Then** todos los elementos interactivos son alcanzables y operables por teclado, con orden de foco coherente.

### AC-03: Roles ARIA, foco visible y formularios accesibles
**Given** los componentes de las rutas demo
**When** se auditan
**Then** los roles ARIA son correctos (solo donde no hay equivalente nativo), el foco es visible en elementos interactivos, y los formularios tienen labels asociadas y mensajes de error accesibles (NFR-A11Y-003/004).

### AC-04: Contraste y gestión de foco en modales
**Given** la paleta principal y los modales de la UI
**When** se verifica
**Then** el texto cumple contraste mínimo (≥4.5:1) y los modales aplican focus trap y restauran el foco al cerrar (NFR-A11Y-005, Doc 20 §a11y).

### AC-05: Compuerta de CI
**Given** un Pull Request
**When** se ejecuta la compuerta de calidad
**Then** la suite de accesibilidad corre en CI y las violaciones críticas de axe-core bloquean el merge.

---

## ⚠️ Edge Cases

### EC-01: axe-core no disponible o mal configurado
**Given** que la herramienta de auditoría no puede ejecutarse
**When** corre la suite
**Then** la ejecución falla de forma controlada (fail-fast) con un mensaje claro, sin marcar la accesibilidad como aprobada.

#### Handling
* Fail-fast en el setup de axe-core.

### EC-02: Nueva ruta demo sin cobertura A11Y
**Given** una ruta demo principal sin auditoría
**When** se ejecuta el gate
**Then** la compuerta señala la ruta sin cubrir (según el inventario acordado).

#### Handling
* Inventario de rutas demo principales verificado en el gate.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | axe-core disponible y configurado                          | Fail-fast si no ejecuta                     |
| VR-02 | Sin violaciones críticas de axe-core                       | Compuerta de CI falla                       |
| VR-03 | Flujos críticos navegables por teclado                     | Test falla si no son operables              |
| VR-04 | Contraste de texto ≥4.5:1                                   | Test/checklist falla si no cumple           |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19 en los datos de prueba.   |
| SEC-02 | Secrets vía Secrets Manager.                                          |
| SEC-03 | Sin secretos en logs ni en reportes de accesibilidad.               |

### Negative Authorization Scenarios
* No aplica autorización — suite de accesibilidad de UI.
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
* Not applicable for this story. (La UI de revisión de sugerencias IA, si está en una ruta demo, debe ser navegable por teclado — Doc 20 §a11y.)

### AI Error / Fallback Behavior
* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | Rutas demo principales (login, creación de evento, comparación de cotizaciones). |
| Main UI Pattern     | N/A (no se crea UI nueva; se audita). |
| Primary Action      | N/A   |
| Secondary Actions   | N/A   |
| Empty State         | N/A   |
| Loading State       | N/A   |
| Error State         | Mensajes de error de formulario accesibles (NFR-A11Y-004). |
| Success State       | N/A   |
| Accessibility Notes | Núcleo de la historia: teclado, foco, ARIA, contraste, labels. |
| Responsive Notes    | N/A   |
| i18n Notes          | Las auditorías deben funcionar con el catálogo i18n activo. |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: Rutas demo principales (auditadas, no modificadas salvo ajustes A11Y menores).
* Components: Posibles ajustes menores de labels/roles/foco donde la auditoría lo exija.
* State Management: N/A
* Forms: Verificación de labels y errores accesibles.
* API Client: N/A (MSW para renderizar estados si aplica).
* Herramientas: Vitest, Testing Library, Playwright, axe-core.

### Backend
* Use Case / Service: No aplica.
* Controller / Route: No aplica.
* Authorization Policy: No aplica.
* Validation: N/A
* Transaction Required: N/A

### Database
* Main Tables: N/A
* Constraints: N/A
* Index Considerations: N/A

### API

| Method | Endpoint | Purpose                                   |
| ------ | -------- | ----------------------------------------- |
| —      | —        | No aplica — auditoría A11Y de rutas frontend. |

### Observability / Audit
* Correlation ID Required: N/A a nivel de test.
* Log Event Required: Sin secretos en reportes.
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                    | Type |
| ----- | ---------------------------------------------------------- | ---- |
| TS-01 | axe-core sin violaciones críticas en rutas demo             | A11Y |
| TS-02 | Navegación por teclado en flujos críticos                   | A11Y |
| TS-03 | Roles ARIA correctos + foco visible                        | A11Y |
| TS-04 | Labels de formulario + errores accesibles                  | A11Y |
| TS-05 | Contraste ≥4.5:1 + focus trap/restauración en modales      | A11Y |

### Negative Tests

| ID    | Scenario                                   | Expected Result                     |
| ----- | ------------------------------------------ | ----------------------------------- |
| NT-01 | axe-core no disponible                     | Fail-fast con mensaje claro         |
| NT-02 | Violación crítica de accesibilidad          | Compuerta de CI falla               |
| NT-03 | Elemento interactivo no alcanzable por teclado | Test falla                       |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Setup de la suite A11Y completado | Success         |

### Accessibility Tests
* Núcleo de la historia — ver Functional Tests (TS-01..TS-05).

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Inclusión, calidad UX, cumplimiento de estándares básicos |
| Expected Impact     | Accesibilidad mínima verificable en CI                |
| Success Criteria    | axe-core sin violaciones críticas; teclado y ARIA correctos en rutas demo |
| Academic Demo Value | Foundation — evidencia de accesibilidad mínima         |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* Ajustes menores de A11Y (labels/roles/foco/contraste) donde la auditoría lo exija.

### Potential Backend Tasks
* No aplica.

### Potential Database Tasks
* No aplica.

### Potential AI / PromptOps Tasks
* No aplica.

### Potential QA Tasks
* Configurar axe-core + integración de auditorías.
* Tests de teclado/foco/ARIA/contraste.
* Checklist manual mínimo.

### Potential DevOps / Config Tasks
* Integrar la suite A11Y como compuerta de CI.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo QA-FE).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 20 §a11y, Doc 10 §14 NFR-A11Y, ADR-TEST-001).
* [x] Permisos / Seguridad (N/A autorización; sin secretos).
* [x] Entidades listadas (N/A).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P0-012, PB-P0-013).
* [x] UX states identificados (rutas demo).
* [x] API definida (N/A — A11Y de UI).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] axe-core sin violaciones críticas en rutas demo principales.
* [ ] Navegación por teclado posible en flujos críticos.
* [ ] Roles ARIA correctos, foco visible, labels/errores accesibles.
* [ ] Contraste ≥4.5:1 y gestión de foco en modales.
* [ ] Checklist manual mínimo ejecutado.
* [ ] Compuerta de CI bloqueante ante violaciones críticas.
* [ ] Tech Lead valida.

---

## 📝 Notes
* Los NFR-A11Y son "Should Have" a nivel de requisito, pero la **suite de verificación** (PB-P2-019) es "Must Have": se prioriza tener la red de seguridad de accesibilidad mínima verificable en CI (ver Documentation Alignment en el Technical Spec).
* Confirmar con Tech Lead el inventario final de "rutas demo principales" a auditar.
