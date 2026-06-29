# User Story Refinement Review — US-014

## Source User Story File
management/user-stories/US-014-view-event-dashboard.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-014-decision-resolution.md (no existe — no fue necesario)

## Review Date
2026-06-25

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                  |
| ------------------------------------------ | ------------------------------------------- |
| User Story ID                              | US-014                                      |
| File Path                                  | management/user-stories/US-014-view-event-dashboard.md |
| Backlog Item                               | PB-P1-008 — Listado, filtros y dashboard del evento |
| Epic                                       | EPIC-EVT-001 — Organizer Event Management   |
| Estado actual                              | Ready for Approval (refinado)               |
| Estado recomendado                         | Ready for Approval                          |
| Nivel de riesgo                            | Medio                                       |
| Calidad general                            | Alta                                        |
| Requiere decisión PO                       | No                                          |
| Requiere decisión técnica                  | Sí — diferida a Technical Specification (endpoint agregado vs composición frontend); no bloquea aprobación |
| Requiere decisión QA                       | No                                          |
| Requiere decisión Seguridad                | No                                          |
| Decision Resolution artifact found         | No                                          |
| User Story file updated                    | Yes                                         |
| Refinement review artifact created/updated | Yes (no bloqueante; evidencia)              |
| Refinement review path                     | management/user-stories/refinement-reviews/US-014-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-014 es valiosa y crítica para la demo: es el "cockpit" del organizador y la vista más usada durante la planificación. Alineada con PB-P1-008 y con `UC-EVENT-004 — Ver dashboard del evento` (`docs/8`). Las correcciones aplicadas son íntegramente de alineación documental (traceability) y de cierre de gaps (estados `cancelled`/`completed`, modo read-only, autorización 404 por IDOR, NFR de TTI, formato monetario por locale, accesibilidad concreta).

La única decisión abierta es técnica (endpoint agregado vs composición frontend) y se delega explícitamente a la Technical Specification. Ambas opciones son consistentes con ADR-FE-002 (TanStack Query), con los sub-endpoints ya documentados en `docs/16` y con los NFRs aplicables.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                          | Impacto                                                                       | Recomendación                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alta      | Traceability FR/UC/BR incorrecta (FR-EVENT-013 no es dashboard; FR-DASHBOARD-001 no existe; UC-EVENT-006 es cancelación; BR-EVENT-014 es visibilidad admin). | Quiebre de trazabilidad académica y de QA.                                    | Reemplazado por `FR-EVENT-008`, `FR-BUDGET-004`, `UC-EVENT-004`, `BR-EVENT-009`, `BR-TASK-009`, `BR-BUDGET-004`, `BR-AUTH-009`, `BR-EVENT-002` según `docs/9`, `docs/8`, `docs/4`.                      |
| Alta      | NFR-PERF-API-001 y NFR-PERF-UX-001 no existen.                                                    | Imposible verificar criterios de performance.                                 | Reemplazados por `NFR-PERF-001` (P95 API < 1.5 s) y `NFR-PERF-003` (TTI página < 3 s) según `docs/10`.                                                                                                |
| Alta      | ADR-FE-00n es placeholder.                                                                        | Trazabilidad arquitectónica débil.                                            | Reemplazado por `ADR-FE-001` (Next.js + App Router), `ADR-FE-002` (TanStack Query) y los ADR-API aplicables; no existe ADR específico de dashboards (no se crea uno nuevo en refinement).             |
| Alta      | Política de autorización para evento ajeno declarada como "403/404"; `docs/19` establece 404 por IDOR. | Inconsistencia entre la US y la política dominante; riesgo de IDOR.           | US ajustada para que evento ajeno o inexistente devuelva `404`; vendor `403`; admin `403` (debe usar US-016); anónimo `401`.                                                                          |
| Media     | Endpoint `GET /api/v1/events/:id` no devuelve datos agregados; no existe endpoint dashboard ni sub-endpoints `/tasks/upcoming`, `/budget/summary`, `/quotes/active`. | Asunción técnica presentada como aprobada en la US original.                  | Reformulada como decisión técnica abierta a tomarse en la Technical Specification. Se documentan las dos opciones (agregado nuevo vs composición con sub-endpoints existentes).                       |
| Media     | Backlog Item PB-P1-008 no declarado en metadata.                                                  | Trazabilidad incompleta.                                                      | Añadido a Metadata y a Traceability.                                                                                                                                                                  |
| Media     | Edge case de `completed` (cierre automático PB-P1-009) ausente.                                  | Modo read-only no cubierto cuando el job AutoComplete corra.                  | Añadido EC-02; NT-06 cubre `cancelled` y `completed`.                                                                                                                                                |
| Media     | Admin clarification: docs/5 sugiere admin lee agregado, pero US-014 delega a US-016/PB-P1-010 con audit.| Riesgo de evasión del audit log si admin usa este endpoint.                  | US ajustada: en MVP admin recibe `403` desde este endpoint y debe usar `/admin/events/:id` (US-016) para preservar el audit log.                                                                       |
| Baja      | Accesibilidad descrita sólo como "estructura semántica".                                          | Cobertura insuficiente para QA.                                              | Detalle añadido (`<main>`, `<section aria-labelledby>`, navegación por teclado, axe).                                                                                                                |
| Baja      | i18n no contemplaba formato monetario por evento.                                                 | Riesgo de inconsistencia visual cross-locale.                                 | Añadido en UX/UI y en AC-05; sin conversión automática (guardrail MVP).                                                                                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                |
| ------------------------------------ | --------- | --------------------------------------------------------- |
| No introduce pagos reales            | Pass      | Solo lectura.                                             |
| No introduce contratos firmados      | Pass      | Fuera de scope.                                           |
| No introduce WhatsApp/chat/push      | Pass      | Fuera de scope.                                           |
| Respeta human-in-the-loop IA         | Pass      | Consume tareas confirmadas vía HITL existente (PB-P1-016); no introduce HITL nuevo. |
| Respeta backend como source of truth | Pass      | Ownership y agregación en backend.                        |
| Respeta seed/demo si aplica          | Pass      | Reutiliza seed existente.                                 |
| No introduce RAG/vector DB           | Pass      |                                                           |
| No introduce multi-tenant enterprise | Pass      |                                                           |
| No introduce P4/Future scope         | Pass      | Sin conversión automática de moneda, sin export PDF, sin charting avanzado. |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                            | Acción recomendada                          |
| ----- | ------------ | ------------------------------------------------------------- | ------------------------------------------- |
| AC-01 | Clear        | Original mezclaba conceptos sin definir cálculo de progreso.  | Reescrito con cálculo BR-TASK-009 y ventana 7 días explícita. |
| AC-02 | Clear        | "Generar plan IA" sin trace al UC.                            | Enlazado a UC-AI-001 y a PB-P1-018.         |
| AC-03 | Clear        | Nuevo: warning overcommit (BR-BUDGET-004).                    | Añadido.                                    |
| AC-04 | Clear        | Nuevo: estado vacío parcial por sección.                      | Añadido.                                    |
| AC-05 | Clear        | Nuevo: i18n + formato monetario por evento.                   | Añadido.                                    |
| EC-01 | Clear        | Mantiene `cancelled` read-only.                               | Conservado.                                 |
| EC-02 | Clear        | Nuevo: `completed` por AutoComplete (PB-P1-009).              | Añadido.                                    |
| EC-03 | Clear        | "Datos lentos" generalizado a "Sección lenta o caída".        | Añadido manejo de error por card.           |
| EC-04 | Clear        | Política IDOR clarificada (404).                              | Añadido.                                    |

---

## 6. Gaps Detectados

### Producto / Negocio

Resueltos. Backlog Item declarado y dependencias internas (PB-P1-016/018/019/020/023) alineadas.

### Backend / API

Decisión técnica de endpoint agregado vs composición diferida a la Technical Specification; se listan ambas opciones con base en `docs/16`.

### Frontend / UX

Resueltos: componentes nombrados, manejo independiente de cards, skeletons/error/empty por sección, accesibilidad detallada.

### Base de Datos

Resueltos: sin migración; reuso de índices existentes por `event_id`.

### Seguridad / Autorización

Resueltos: 401/403/404 alineados con `docs/19`; admin separado en US-016 para preservar audit.

### IA / PromptOps

No aplica — esta historia no invoca IA directamente; consume tareas ya confirmadas vía HITL existente.

### QA / Testing

Resueltos: TS-01..TS-06, NT-01..NT-07, AUTH-TS-01..AUTH-TS-05, accesibilidad axe + teclado, medición TTI.

### Seed / Demo

No requiere cambios de seed.

### Documentación / Trazabilidad

Resueltos en la US; housekeeping de PB-P1-008 ya planificado por US-013 (no se duplica).

---

## 7. Preguntas Pendientes

No pending blocking questions.

> Nota: existe una decisión técnica abierta (endpoint agregado nuevo vs composición frontend) que se delega a la Technical Specification. No es pregunta de PO/BA; no bloquea la aprobación.

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P1-008) | Traceability declarada `FR-EVENT-009..011 · UC-EVENT-005..006` no coincide con los IDs reales del listado (`FR-EVENT-007 · UC-EVENT-003`) ni del dashboard (`FR-EVENT-008 · UC-EVENT-004`). | US-013 y US-014 usan los IDs correctos en sus traceabilities. | Housekeeping del backlog (tarea ya planificada en `TASK-PB-P1-008-US-013-DOC-001`). | No |
| `docs/5-User-Roles-Permissions-Matrix.md` (`GET /events/:id` admin = R) vs `docs/19-Security-and-Authorization-Design.md` (admin debe usar endpoint admin auditado). | Posible solapamiento de permisos admin. | US-014 alinea con `docs/19`: admin `403` en este endpoint; admin usa `/admin/events/:id` (US-016). | Aclarar en `docs/5` que admin sólo lee vía endpoint admin auditado. | No |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                   |
| User Story file path                       | `management/user-stories/US-014-view-event-dashboard.md`                              |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-014-decision-resolution.md` (no existe) |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-014-refinement-review.md`              |
| Final recommended status                   | Ready for Approval                                                                    |
| Next recommended skill                     | eventflow-user-story-approval                                                         |
| Reason                                     | Sin decisiones de PO/BA/QA/Security pendientes; la única decisión abierta es técnica y se delega a la Technical Specification. |

---

## 10. Cambios Aplicados

### Metadata

* Añadido `Backlog Item: PB-P1-008`.
* `Status: Ready for Approval`.
* `Last Updated: 2026-06-25`.

### Business Context

* Cálculo de progreso explícito (BR-TASK-009).
* Detalle de presupuesto planeado vs comprometido.
* Dependencias internas (PB-P1-016/018/019/020/023) alineadas.

### Traceability

* FRD: `FR-EVENT-008`, `FR-BUDGET-004` (antes FR-EVENT-013/FR-DASHBOARD-001).
* UC: `UC-EVENT-004` (antes UC-EVENT-006).
* BR: `BR-EVENT-009`, `BR-TASK-009`, `BR-BUDGET-004`, `BR-AUTH-009`, `BR-EVENT-002` (antes BR-EVENT-014).
* NFR: `NFR-PERF-001`, `NFR-PERF-003` (antes inexistentes).
* ADR: `ADR-FE-001`, `ADR-FE-002`, `ADR-API-001`, `ADR-API-004` (antes placeholder).
* API: reformulada como decisión técnica abierta con opciones explícitas.

### Scope Guardrails

* Out of Scope: añadidos vista admin (US-016), mutaciones desde dashboard, personalización por evento.

### Acceptance Criteria

* AC-01 reescrito con cálculos explícitos.
* AC-02 enlazado a UC-AI-001 y CRUD manual.
* AC-03, AC-04, AC-05 añadidos (overcommit, vacío parcial, i18n + moneda).
* EC-02 (completed), EC-03 (sección caída), EC-04 (IDOR 404) añadidos/refinados.

### Technical Notes

* Backend: condicional al modelo elegido en la spec.
* Database: sin migración; reuso de índices `event_id`.
* API: ambas opciones documentadas.

### QA Notes

* TS-04..TS-06 y NT-03..NT-07 añadidos.
* AUTH-TS-03..AUTH-TS-05 añadidos.

### Definition of Ready

* Marcados los puntos que sólo dependían del refinamiento.

### Definition of Done

* Reescrito en términos verificables: TTI < 3 s, P95 < 1.5 s, modo read-only, i18n con formato monetario.

### Notes

* Decisión técnica abierta explícita.
* Documentation Alignment Required no bloqueante registrado.

---

## 11. Recomendación Final

`Ready for Approval`.

US-014 quedó alineada con la documentación autoritativa, con AC testables y cobertura QA completa para datos agregados, autorización, accesibilidad, i18n y performance. La única decisión abierta es técnica (endpoint agregado vs composición frontend) y se trata como decisión de diseño a resolverse en la Technical Specification; no es decisión de PO/BA y no bloquea la aprobación.
