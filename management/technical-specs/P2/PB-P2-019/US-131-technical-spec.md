# Technical Specification — PB-P2-019 / US-131: Suite A11Y mínima

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-131                                                                             |
| Source User Story                    | `management/user-stories/US-131-a11y-minimum-suite.md`                             |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-131-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-019                                                                          |
| Backlog Title                        | Suite A11Y mínima (teclado, foco, ARIA, contraste)                                 |
| Backlog Execution Order              | 19 (decimonoveno ítem de P2)                                                       |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-131                                                                             |
| Epic                                 | EPIC-QA-001                                                                        |
| Backlog Item Dependencies            | PB-P0-012 (Frontend Bootstrap & i18n), PB-P0-013 (Data Layer + Layouts)            |
| Feature                              | Accesibilidad mínima — axe-core + verificación manual                              |
| Module / Domain                      | QA / FE                                                                            |
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
| Decision Resolution Artifact | No    | No   | No existe para US-131.                    |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-019.                                |
| ADRs                         | Yes   | Yes  | ADR-TEST-001 (Vitest + Testing Library + Playwright). |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-019 — Suite A11Y mínima** (EPIC-QA-001, P2, Must Have). Tests automatizados (axe-core) y manuales mínimos en las rutas demo principales; cumple criterios WCAG AA básicos. Acceptance: axe-core sin violaciones críticas; navegación por teclado posible; roles ARIA correctos. Dependencias: PB-P0-012, PB-P0-013. Trazabilidad: Doc 20 · NFR-A11Y-*.

### Execution Order Rationale

Decimonoveno ítem de P2. Depende de la base del frontend (PB-P0-012 bootstrap+i18n, PB-P0-013 data layer+layouts). Parte de la base de calidad; complementa a la suite frontend general y a E2E (US-128), enfocándose en accesibilidad mínima verificable.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-131     | Única historia del ítem (A11Y mínima)         | 1               |

---

## 3.1 Executive Technical Summary

Se debe construir una suite de **accesibilidad mínima** que combine **auditorías automatizadas con axe-core** (integradas en Testing Library y/o Playwright) y **verificación manual mínima** sobre las **rutas demo principales** (login, creación de evento, comparación de cotizaciones). Cubre **navegación por teclado**, **foco visible**, **roles ARIA** (solo donde no hay equivalente nativo), **labels de formulario y errores accesibles**, **contraste ≥4.5:1** y **gestión de foco en modales** (focus trap + restauración), conforme a NFR-A11Y-001..005 y Doc 20 §a11y. La suite corre como **compuerta de CI** que bloquea el merge ante violaciones críticas de axe-core.

Puede requerir **ajustes menores de A11Y** en componentes existentes (labels/roles/foco/contraste) donde la auditoría lo exija, sin cambios funcionales.

---

## 4. Scope Boundary

### In Scope

* Configuración de **axe-core** integrado en la suite frontend (Testing Library) y/o Playwright.
* Auditorías sobre **rutas demo principales** (sin violaciones críticas).
* Tests de **navegación por teclado** en flujos críticos.
* Tests de **foco visible**, **roles ARIA** y **labels/errores de formulario**.
* Verificación de **contraste ≥4.5:1** (axe-core o checklist manual sobre la paleta).
* Tests de **focus trap/restauración** en modales.
* **Checklist manual mínimo** para lo no cubierto por axe-core.
* Ajustes menores de A11Y en componentes donde la auditoría lo exija.
* Integración como **compuerta de CI**.

### Out of Scope

* Certificación formal WCAG 2.1 AA completa (NFR-FUT-002).
* Auditoría exhaustiva de todas las páginas.
* Auditoría completa con lector de pantalla más allá del mínimo.
* Suites de US-126/127/128/129/130.
* Cambios funcionales de UI o de backend.

### Explicit Non-Goals

* No perseguir conformidad WCAG completa; solo mínimo usable y testeable.
* No añadir ARIA donde existe equivalente nativo (anti-patrón).
* No rediseñar la UI.

---

## 5. Architecture Alignment

### Backend Architecture

No aplica.

### Frontend Architecture

Next.js + Testing Library + Playwright + **axe-core** (Doc 20 §11, §a11y). Se apoya en la base de PB-P0-012/013 (bootstrap, i18n, layouts). MSW para renderizar estados cuando el test lo requiera.

### Database Architecture

No aplica.

### API Architecture

No aplica — auditoría de rutas frontend.

### AI / PromptOps Architecture

No aplica. (Si la UI de revisión de sugerencias IA está en una ruta demo, debe ser navegable por teclado — Doc 20 §a11y.)

### Security Architecture

Sin autorización; sin secretos en reportes de accesibilidad (SEC-03).

### Testing Architecture

Component/page tests con Testing Library + axe-core; recorridos de teclado con Playwright donde aplique; checklist manual mínimo; gate de CI. Objetivo: NFR-A11Y-001..005.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (axe sin críticas) | Ejecutar axe-core en rutas demo; fallar ante violaciones críticas. | Frontend testing, CI |
| AC-02 (teclado) | Tests de recorrido Tab/Shift+Tab/Enter en flujos críticos. | Frontend testing |
| AC-03 (ARIA/foco/labels) | Aserciones de roles ARIA, foco visible, labels/errores accesibles. | Frontend testing |
| AC-04 (contraste/modales) | Verificar contraste ≥4.5:1 y focus trap/restauración en modales. | Frontend testing, Design tokens |
| AC-05 (gate CI) | Suite A11Y bloquea merge ante violaciones críticas. | CI/DevOps |

---

## 7. Backend Technical Design

No aplica — historia de accesibilidad de frontend.

---

## 8. Frontend Technical Design

### Routes / Pages
Rutas demo principales: login, creación de evento, comparación de cotizaciones (inventario a confirmar con Tech Lead — nota no bloqueante).

### Components
Posibles ajustes menores de labels/roles/foco/contraste donde axe-core o el checklist lo exijan.

### Forms
Verificar labels asociadas y mensajes de error accesibles (NFR-A11Y-004).

### State Management
No aplica directamente; MSW para renderizar estados si el test lo requiere.

### Data Fetching
No aplica (MSW para estados).

### Loading / Empty / Error / Success States
Los estados renderizados deben ser accesibles (foco/anuncio) cuando estén en la ruta auditada.

### Accessibility (núcleo)
Teclado, foco visible, ARIA (solo sin equivalente nativo), contraste ≥4.5:1, focus trap/restauración en modales (Doc 20 §a11y).

### i18n
Las auditorías deben funcionar con el catálogo i18n activo (PB-P0-012).

---

## 9. API Contract Design

No aplica — auditoría A11Y de rutas frontend.

---

## 10. Database / Prisma Design

No aplica — sin cambios de esquema/seed.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

No aplica autorización. Sin secretos en reportes de accesibilidad (SEC-03).

---

## 13. Testing Strategy

### Unit Tests
Component tests con Testing Library + axe-core sobre componentes clave de las rutas demo.

### Integration Tests
Page flow tests de navegación por teclado (Testing Library y/o Playwright).

### API Tests
No aplica.

### E2E Tests
Recorridos de teclado con Playwright sobre rutas demo donde aplique (complementa US-128).

### Security Tests
No aplica.

### Accessibility Tests (principal)
* axe-core sin violaciones críticas en rutas demo.
* Teclado, foco visible, ARIA, labels/errores.
* Contraste ≥4.5:1; focus trap/restauración en modales.
* Checklist manual mínimo.

### AI / Seed Tests
No aplica.

### CI Checks
Gate: axe-core sin violaciones críticas; suite A11Y bloqueante.

---

## 14. Observability & Audit

### Logs / Reports
Reportes de axe-core como artefactos de CI; sin secretos.

### Correlation ID / AdminAction / Error Tracking / Metrics
N/A a nivel de test, salvo el conteo de violaciones de accesibilidad.

---

## 15. Seed / Demo Data Impact

### Seed Data Required
No requiere cambios de seed; MSW/fixtures para renderizar estados.

### Demo Scenario Supported
Indirecto: mejora la calidad/inclusión de las rutas demo.

### Reset / Isolation Notes
No aplica (tests de frontend en memoria).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| NFR-A11Y-001..005 (Should Have) vs PB-P2-019 (Must Have) | Los NFR de accesibilidad son Should Have; la suite de verificación es Must Have | Priorizar la suite de verificación (Must Have) sobre la meta mínima de accesibilidad | Documentar que la suite es la red de seguridad mínima; no exige conformidad WCAG completa | No |
| Inventario de rutas demo principales | La US no enumera las rutas exactas | Confirmar con Tech Lead (login, creación de evento, comparación de cotizaciones + otras) | Documentar el inventario auditado | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Falsos positivos/negativos de axe-core | Ruido o falsa confianza | Limitar a violaciones críticas; complementar con checklist manual |
| Cobertura incompleta de rutas | Accesibilidad aparente | Inventario de rutas demo verificado en el gate |
| Contraste dependiente de la paleta | Fallos difusos | Verificar contra la paleta principal (design tokens) |
| ARIA mal usado | Regresiones de accesibilidad | ARIA solo sin equivalente nativo (Doc 20 §a11y) |
| Flakiness en tests de teclado/foco | CI inestable | Selectores estables y esperas de foco |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** `frontend/tests/a11y/**` (o dentro de `tests/unit/components` y `tests/integration/pages`), config de axe-core, config de Playwright para recorridos de teclado, ajustes menores en componentes de las rutas demo, config de CI.
* **Orden recomendado:** (1) integrar axe-core en Testing Library/Playwright; (2) auditorías por ruta demo (violaciones críticas); (3) tests de teclado/foco/ARIA/labels; (4) contraste + focus trap/restauración en modales; (5) checklist manual mínimo; (6) ajustes menores de A11Y donde falle; (7) gate de CI.
* **Decisiones que no deben reabrirse:** accesibilidad mínima (no WCAG completa); axe-core como herramienta; ARIA solo sin equivalente nativo; violaciones críticas bloquean.
* **Qué no implementar:** conformidad WCAG completa, auditoría de todas las páginas, cambios funcionales/rediseño.
* **Suposiciones a preservar:** PB-P0-012/013 existen; hay una paleta/design tokens para contraste.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (OPS/QA) integración axe-core + config; (QA) auditorías por ruta demo; (QA) tests de teclado/foco/ARIA/labels; (QA) contraste + focus trap; (FE) ajustes menores de A11Y; (QA) checklist manual mínimo; (OPS) gate de CI; (DOC) inventario de rutas + nota de alineación.
* **Tareas QA requeridas:** auditorías axe, teclado/foco/ARIA, contraste/modales, checklist manual.
* **Tareas de seguridad requeridas:** ninguna dedicada (sin secretos en reportes).
* **Tareas de seed/demo requeridas:** ninguna.
* **Tareas de documentación requeridas:** inventario de rutas demo + nota de alineación NFR/suite.
* **Dependencias entre tareas:** config axe antes de auditorías; auditorías/tests antes del gate; ajustes FE según hallazgos.
* **Consolidación:** PB-P2-019 puede consolidar sus tareas en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-019) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | N/A |
| AI impact clear | N/A |
| Security impact clear | Pass (sin autorización; sin secretos) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-019, con alcance claro (suite A11Y mínima con axe-core + manual sobre rutas demo; teclado/foco/ARIA/contraste/modales), sin cambios de backend/DB. Las dos alertas de Documentation Alignment (NFR Should Have vs suite Must Have; inventario de rutas demo) son **no bloqueantes**. Testing de accesibilidad y CI están suficientemente definidos para generar Development Tasks.
